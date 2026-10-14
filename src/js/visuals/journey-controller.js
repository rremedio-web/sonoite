/**
 * TRG-CTL-01: Journey Controller
 * Compact mm:ss triggers with action adapter for signature moments
 * @module journey-controller
 */

import * as THREE from 'three';
// MP-AUDIO-EMA-06: Import audioEMA for spike detection
import { audioEMA } from './utils/audioEMA.js';
// PHASE-COORDINATION: Import JourneyState for cross-system event coordination
import JourneyState from './JourneyState.js';
import { TRACK5_SPLINES } from './track5/Track5CameraSplines.js';
import { validateMoment } from './utils/action-validator.js';
// 01-05: Signal pipeline for advanced audio shaping
import { createPipeline } from './utils/signalPipeline.js';

// NOISE-GATE: Default noise floor thresholds per audio feature.
// Suppresses phantom flicker during silence (analysis noise floor 0.02-0.08).
// Individual link_audio actions can override via `noiseGate` param.
const NOISE_GATES = {
  bass: 0.08,
  mid: 0.10,
  treble: 0.10,
  loudness: 0.05,
  lowMidLevel: 0.08,
  midLevel: 0.10,
  highMidLevel: 0.10
};

export class JourneyController {
  constructor(visualLayers = {}) {
    this.layers = visualLayers; // {flow, structure, core}
    this.triggers = [];
    this.firedTriggers = new Set();
    this.cooldowns = new Map(); // id -> timestamp
    this.cooldownDuration = 0.75; // seconds
    this.currentTime = 0;
    // P0-7: Track previous time for "crossed trigger" detection
    this.previousTime = 0;
    // TRG-TIME: Expose trigger time to actions (seek-safe camera_spline)
    this._activeTriggerTime = null;

    // OPUS3: Continuous audio-to-shader bindings
    this.audioLinks = [];

    // OPUS4: Real-time cooldown tracking (for when audio time is stuck at 0)
    this.cooldownsReal = new Map();

    // OPUS4: Log throttling for looping triggers (prevents console spam)
    this._lastLogTime = new Map();
    this._voidLensWorldPos = new THREE.Vector3();

    // MP-THROTTLE-07: Debounce tracking for rapid action calls
    this.lastActionTime = new Map(); // action type -> last execution timestamp (ms)

    // BUG-FIX-02: Track active RAF IDs for cleanup on reset/dispose
    this.activeAnimations = new Set();

    /**
     * BUG-003-FIX: Egg State Machine
     * Prevents overlapping animations and unwanted actions.
     */
    this.eggState = {
      mode: 'idle',  // 'idle' | 'cinematic' | 'frozen'
      activeAnimations: new Map(),  // type -> rafId
      allowedInFrozen: ['thaw', 'opacity', 'egg_thaw'],  // Actions that bypass frozen state
      lastActionTime: new Map()  // Cooldown tracking
    };

    /**
     * BUG-005-FIX: Motion Lock System
     * Prevents audio-reactivity from overriding choreographed motion modes.
     */
    this.motionLocks = new Map(); // layerId -> { until: timestamp, mode: string }
  }

  /**
   * MP-THROTTLE-07: Check if action should be debounced
   * @param {string} actionType - Action identifier (e.g., 'post', 'shimmer')
   * @param {number} minInterval - Minimum ms between calls (default 100ms)
   * @returns {boolean} True if should skip (still in debounce window)
   */
  shouldDebounce(actionType, minInterval = 100) {
    const now = performance.now();
    const lastTime = this.lastActionTime.get(actionType);

    if (lastTime && (now - lastTime) < minInterval) {
      if (window.SONOITE_DEBUG) {
        console.log(`[JourneyController] Debounced ${actionType} (${Math.round(now - lastTime)}ms since last)`);
      }
      return true; // Skip - too soon
    }

    // Update timestamp
    this.lastActionTime.set(actionType, now);
    return false; // Execute
  }

  // ========================================
  // BUG-003-FIX: Egg State Machine Methods
  // ========================================

  /**
   * BUG-003-FIX: Cancel egg animation by type
   * Prevents overlapping breath/spin/scale animations.
   */
  cancelEggAnimation(animationType) {
    const rafId = this.eggState.activeAnimations.get(animationType);
    if (rafId) {
      cancelAnimationFrame(rafId);
      this.eggState.activeAnimations.delete(animationType);
      if (window.SONOITE_DEBUG) {
        console.log(`[EggState] Cancelled ${animationType} animation`);
      }
    }
  }

  /**
   * BUG-003-FIX: Cancel ALL egg animations
   */
  cancelAllEggAnimations() {
    for (const [type, rafId] of this.eggState.activeAnimations) {
      cancelAnimationFrame(rafId);
      if (window.SONOITE_DEBUG) {
        console.log(`[EggState] Cancelled ${type}`);
      }
    }
    this.eggState.activeAnimations.clear();
  }

  /**
   * BUG-003-FIX: Check if egg action is allowed
   */
  isEggActionAllowed(actionType) {
    // Frozen state blocks most actions
    if (this.eggState.mode === 'frozen') {
      if (!this.eggState.allowedInFrozen.includes(actionType)) {
        if (window.SONOITE_DEBUG) {
          console.log(`[EggState] Blocked ${actionType} (egg frozen)`);
        }
        return false;
      }
    }

    // Cooldown check (prevent spam)
    const lastTime = this.eggState.lastActionTime.get(actionType) || 0;
    const cooldown = 500; // 500ms minimum between same action type
    if (performance.now() - lastTime < cooldown) {
      return false;
    }

    return true;
  }

  /**
   * BUG-003-FIX: Set egg state mode
   */
  setEggMode(mode) {
    const validModes = ['idle', 'cinematic', 'frozen'];
    if (!validModes.includes(mode)) {
      console.warn(`[EggState] Invalid mode: ${mode}`);
      return;
    }

    const previousMode = this.eggState.mode;
    this.eggState.mode = mode;

    // If freezing, cancel all animations
    if (mode === 'frozen') {
      this.cancelAllEggAnimations();
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[EggState] Mode: ${previousMode} → ${mode}`);
    }
  }

  // ========================================
  // BUG-005-FIX: Motion Lock Methods
  // ========================================

  /**
   * BUG-005-FIX: Check if motion is locked for a layer
   * Returns: false (not locked), or 1.0 (fully locked)
   */
  isMotionLocked(layerId) {
    const lock = this.motionLocks.get(layerId);
    if (!lock) return false;

    const now = performance.now();

    // Lock expired
    if (now >= lock.until) {
      this.motionLocks.delete(layerId);
      return false;
    }

    // Fully locked
    return 1.0;
  }

  /**
   * BUG-005-FIX: Process motion mode with lock awareness
   * Call this instead of directly setting motion mode from audio.
   */
  setMotionModeWithLockCheck(layerId, audioMode, intensity) {
    const lockStrength = this.isMotionLocked(layerId);

    if (lockStrength === 1.0) {
      // Fully locked, ignore audio
      return;
    }

    if (lockStrength === false) {
      // Not locked, apply audio mode
      const layer = this.getLayer(layerId);
      if (layer && typeof layer.setMotionMode === 'function') {
        layer.setMotionMode(audioMode, intensity);
      }
    }
  }

  /**
   * Add triggers from JSON
   * @param {Array} triggersJSON - Array of {id, at, actions}
   * at format: "m:ss" or {percent: 0.5}
   */
  addTriggers(triggersJSON, trackDuration = 0) {
    triggersJSON.forEach(trigger => {
      // 01-04: Validate moment structure in debug mode
      if (window.SONOITE_DEBUG) {
        const validation = validateMoment(trigger);
        if (!validation.valid || validation.results.some(r => r.warnings.length > 0)) {
          console.group(`[JourneyController] Validation: ${trigger.id || 'unknown'}`);
          validation.results.forEach(r => {
            if (r.errors.length) console.error(`Action ${r.index} (${r.actionType}):`, r.errors);
            if (r.warnings.length) console.warn(`Action ${r.index} (${r.actionType}):`, r.warnings);
          });
          console.groupEnd();
        }
      }

      const timeSeconds = this.parseTime(trigger.at, trackDuration);
      // OPUS4+: Per-trigger cooldown (seconds) for looping triggers.
      // Supports either top-level `cooldown` or legacy `condition.interval`.
      const rawCooldown = trigger.cooldown ?? trigger.condition?.interval;
      const parsedCooldown = typeof rawCooldown === 'string' ? parseFloat(rawCooldown) : rawCooldown;
      const cooldown = Number.isFinite(parsedCooldown) ? parsedCooldown : null;

      this.triggers.push({
        id: trigger.id,
        time: timeSeconds,
        actions: trigger.actions || [],
        fired: false,
        // OPUS3: Loop triggers fire repeatedly when conditions are met
        loop: trigger.loop || false,
        // OPUS3: Audio conditions gate trigger firing (e.g., {feature: 'bass', threshold: 0.7})
        condition: trigger.condition || null,
        cooldown
      });
    });

    // Sort by time
    this.triggers.sort((a, b) => a.time - b.time);
  }

  /**
   * Parse "m:ss" or {percent: 0.5} to seconds
   */
  parseTime(at, trackDuration) {
    if (typeof at === 'string') {
      // EXPERT-PLAN: Support decimal seconds for beat-sync (e.g., "0:35.40")
      const parts = at.split(':');
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);  // Changed from parseInt for sub-second precision
      return minutes * 60 + seconds;
    } else if (at.percent !== undefined) {
      // Percent of track duration with 0.1% rounding
      const percent = Math.round(at.percent * 1000) / 1000;
      return trackDuration * percent;
    }
    return 0;
  }

  _rehydrateAudioLinksForTime(currentTime) {
    if (!Array.isArray(this.triggers) || this.triggers.length === 0) return;
    this.audioLinks = [];
    this._lastAudioLinkTime = undefined;

    for (const trigger of this.triggers) {
      if (!trigger || trigger.time > currentTime) break;
      if (!Array.isArray(trigger.actions) || trigger.actions.length === 0) continue;

      for (const action of trigger.actions) {
        if (!action || (action.type !== 'link_audio' && action.type !== 'unlink_audio')) continue;
        const replayAction = {
          ...action,
          params: this.normalizeActionParams(action.type, action.params)
        };
        if (action.type === 'link_audio') {
          this.actionLinkAudio(replayAction);
        } else {
          this.actionUnlinkAudio(replayAction);
        }
      }
    }
  }

  /**
   * OPUS3/OPUS4: Enhanced update with loop triggers, conditions, and real-time cooldowns
   */
  update(currentTime, audioData) {
    // P0-7: Store previous time for crossed trigger detection
    const prevTime = this.previousTime;
    this.previousTime = currentTime;
    this.currentTime = currentTime;

    // P0-7: Handle backward seek - reset fired state for triggers ahead of current time
    // This allows re-triggering moments when user seeks backward
    if (currentTime < prevTime - 0.5) { // 0.5s threshold to avoid false positives from timing jitter
      for (let i = 0; i < this.triggers.length; i += 1) {
        const trigger = this.triggers[i];
        if (trigger.time > currentTime && trigger.fired) {
          trigger.fired = false;
          // 01-03 FIX: Also clear cooldowns so one-shot triggers can re-fire after seek
          this.cooldowns.delete(trigger.id);
          this.cooldownsReal.delete(trigger.id);
          if (window.SONOITE_DEBUG) {
            console.log(`[P0-7] Reset trigger ${trigger.id} (seek backward)`);
          }
        }
      }
      this._rehydrateAudioLinksForTime(currentTime);
    }

    // P0-1 FIX: Gate JourneyState to Sonoite only
    // JourneyState contains Sonoite-specific phase logic (ASCEND/FRACTURE/ECLIPSE/MEMORY)
    // Running it on other tracks causes unintended post/camera drift
    const slug = this.currentJourney?.meta?.slug;
    if (slug === 'sonoite') {
      JourneyState.updateTime(currentTime);
    } else if (slug && window.SONOITE_DEBUG && this._lastNonSonoiteSlugLog !== slug) {
      console.log(`[JourneyController] JourneyState skipped for non-sonoite track: ${slug}`);
      this._lastNonSonoiteSlugLog = slug; // Log once per track to avoid spam
    }

    // OPUS3: Process continuous audio links every frame
    this.processAudioLinks(audioData);

    // Check triggers
    for (let i = 0; i < this.triggers.length; i += 1) {
      const trigger = this.triggers[i];
      // OPUS3: Support looping triggers (fire repeatedly when conditions met)
      const isLoop = trigger.loop === true;

      // Non-looping triggers only fire once
      if (!isLoop && trigger.fired) continue;

      // OPUS3: Check audio condition if specified (e.g., bass > 0.7)
      if (trigger.condition && !this.checkCondition(trigger.condition, audioData)) {
        continue; // Audio condition not met
      }

      // P0-7: "Crossed trigger" logic - fire if trigger time is between prevTime and currentTime
      // This ensures triggers fire even if FPS drops and we skip over the 0.1s window
      // Also handles seek forward (large jump) and seek backward (reset fired triggers)
      // 01-03 FIX: Use <= to handle exact boundary (prevTime === trigger.time after seek/snap)
      const crossedForward = prevTime <= trigger.time && currentTime >= trigger.time;
      const inWindow = currentTime >= trigger.time && currentTime < trigger.time + 0.1;
      const timeMatch = crossedForward || inWindow;
      const shouldFire = isLoop ? (currentTime >= trigger.time) : timeMatch;

      if (shouldFire) {
        // OPUS4: Real-time cooldown for looping triggers
        // Uses performance.now() instead of audio time (which may be stuck at 0 during idle)
        if (isLoop) {
          const now = performance.now();
          const lastFiredReal = this.cooldownsReal.get(trigger.id);
          const cooldownSeconds = Number.isFinite(trigger.cooldown) ? trigger.cooldown : this.cooldownDuration;
          const cooldownMs = cooldownSeconds * 1000;
          if (lastFiredReal && (now - lastFiredReal) < cooldownMs) {
            continue; // Still in real-time cooldown
          }
          this.cooldownsReal.set(trigger.id, now);
        } else {
          // Standard time-based cooldown for one-shot triggers
          const lastFired = this.cooldowns.get(trigger.id);
          if (lastFired && (currentTime - lastFired) < this.cooldownDuration) {
            continue; // Still in cooldown
          }
          this.cooldowns.set(trigger.id, currentTime);
        }

        // OPUS4: Throttle console logs for looping triggers (max 1 log per 5 seconds)
        if (window.SONOITE_DEBUG) {
          if (isLoop) {
            const now = performance.now();
            const lastLog = this._lastLogTime.get(trigger.id) || 0;
            if (now - lastLog > 5000) {
              console.log(`[JourneyController] Loop trigger: ${trigger.id}`);
              this._lastLogTime.set(trigger.id, now);
            }
          } else {
            console.log(`[JourneyController] Firing trigger: ${trigger.id} at ${trigger.time.toFixed(2)}s`);
          }
        }

        // Fire trigger
        this.fireTrigger(trigger, audioData);
        if (!isLoop) {
          trigger.fired = true;
        }
      }
    }
  }

  /**
   * Fire a trigger and execute its actions
   */
  fireTrigger(trigger, audioData) {
    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Firing trigger: ${trigger.id} at ${trigger.time.toFixed(2)}s`);
    }

    // DEVTOOLS-HOOK: Publish the last-fired trigger for deterministic, no-seek reviews.
    // Allows DevTools scripts to wait for specific moment IDs without relying on seek/scrub.
    if (typeof window !== 'undefined') {
      try {
        const detail = {
          id: trigger.id,
          time: trigger.time,
          currentTime: this.currentTime,
          slug: this.currentJourney?.meta?.slug || null
        };
        window.__sonoiteLastTrigger = detail;
        window.dispatchEvent(new CustomEvent('sonoiteTriggerFired', { detail }));
      } catch {
        // Never let tooling hooks break runtime playback.
      }
    }

    const prevTriggerTime = this._activeTriggerTime;
    this._activeTriggerTime = trigger.time;

    try {
      trigger.actions.forEach(action => {
        try {
          this.executeAction(action, audioData);
        } catch (error) {
          // Never let one bad action poison the entire trigger timeline.
          console.error(`[JourneyController] Action failed in trigger "${trigger.id}"`, {
            actionType: action?.type,
            target: action?.target,
            error: error?.message || error
          });
        }
      });
    } finally {
      this._activeTriggerTime = prevTriggerTime;
    }
  }

  /**
   * TRG-CTL-01: Action adapter
   */
  executeAction(action, audioData) {
    const { type, target } = action;
    // 01-01: Normalize params to fix drift (e.g., turbulence: amount → intensity)
    const params = this.normalizeActionParams(type, action.params);

    // MP-ACCESS-05: Apply reduced-motion dampers to audio-reactive data
    let dampedAudioData = audioData;
    if (window.SONOITE_REDUCED_MOTION && audioData) {
      dampedAudioData = {
        bass: (audioData.bass || 0) * 0.5,
        mid: (audioData.mid || 0) * 0.5,
        treble: (audioData.treble || 0) * 0.5,
        loudness: (audioData.loudness || 0) * 0.5,
        centroid: (audioData.centroid || 0) * 0.5
      };
    }

    switch (type) {
      // BUG-FIX-05: Removed duplicate 'faint_visibility' case (was calling actionOpacity)
      // The correct case is below at line ~305 calling actionFaintVisibility

      case 'sparkle':
        this.actionSparkle(target, params, dampedAudioData);
        break;

      case 'gentle_shudder':
        this.actionShudder(target, params, dampedAudioData);
        break;

      case 'spawn':
        this.actionDensityFade(target, params, 'in');
        break;

      case 'dissolveAll':
        this.actionDensityFade(target, params, 'out');
        break;

      case 'count':
        this.actionCount(target, params);
        break;

      case 'scale':
        this.actionScale(target, params);
        break;

      case 'camera_path':
        // MP-ACCESS-05: Block camera_path when reduced motion is enabled
        if (!window.SONOITE_REDUCED_MOTION) {
          this.actionCameraPath(target, params);
        } else if (window.SONOITE_DEBUG) {
          console.log('[JourneyController] camera_path blocked (reduced motion)');
        }
        break;

      case 'post':
        this.actionPostEffect(target, params);
        break;

      case 'shimmer':
        this.actionShimmer(target, params);
        break;

      case 'veil':
        this.actionVeil(target, params);
        break;

      case 'opacity':
        this.actionOpacity(target, params);
        break;

      // P6-T6-MECH-01: Uniform/property animation helper (Track 6 uses this)
      case 'animate':
        this.actionAnimate(action);
        break;

      // P6-T6-MECH-01: Dissolve (fade out) all flow/structure layers
      case 'dissolve_layers':
        this.actionDissolveLayers(action);
        break;

      case 'manifest_in':
        // MP-IDLE-02: Fade in target group (alias for staged reveal)
        this.actionManifestIn(target, params);
        break;

      case 'manifest_out':
        // MP-IDLE-02: Fade out target group (alias for staged exit)
        this.actionManifestOut(target, params);
        break;

      // ACT-ADAPT-02: New action adapters for all journey moments
      case 'density':
        this.actionDensity(target, params);
        break;

      case 'turbulence':
        this.actionTurbulence(target, params);
        break;

      case 'waft':
        this.actionWaft(target, params);
        break;

      case 'spawn_dissolve':
        this.actionSpawnDissolve(target, params);
        break;

      case 'morph':
        this.actionMorph(target, params);
        break;

      case 'subtle_scale':
        this.actionSubtleScale(target, params);
        break;

      case 'edge_shimmer':
        this.actionEdgeShimmer(target, params);
        break;

      case 'color_shift':
        this.actionColorShift(target, params);
        break;

      case 'glow':
        this.actionGlow(target, params);
        break;

      case 'spin':
        this.actionSpin(target, params);
        break;

      // ISSUE-4-FIX: Stop spin with ease-out
      case 'spin_stop':
        this.actionSpinStop(target, params);
        break;

      case 'breath':
        this.actionBreath(target, params);
        break;

      // BUG-003-FIX: Egg state control
      case 'egg_freeze':
        this.actionEggFreeze(target, params);
        break;

      case 'egg_thaw':
        this.actionEggThaw(target, params);
        break;

      // BUG-005-FIX: Motion lock for tornado protection
      case 'lock_motion':
        this.actionLockMotion(target, params);
        break;

      case 'unlock_motion':
        this.actionUnlockMotion(target, params);
        break;

      case 'heartbeat':
        this.actionHeartbeat(target, params);
        break;

      case 'pulse':
        this.actionPulse(target, params);
        break;

      case 'appear_disappear':
        this.actionAppearDisappear(target, params);
        break;

      case 'faint_visibility':
        this.actionFaintVisibility(target, params);
        break;

      case 'choreography':
        // AMPLIFIED-REACTIVITY: Choreography actions (orbit/scatter/converge/flow/vortex)
        this.actionChoreography(target, params, dampedAudioData);
        break;

      // OPUS3: Continuous audio-to-shader linking
      case 'link_audio':
        this.actionLinkAudio(action);
        break;

      // P2-T5-2c: Remove audio link
      case 'unlink_audio':
        this.actionUnlinkAudio(action);
        break;

      // OPUS3: Digital glitch effect
      case 'post_glitch':
        this.actionPostGlitch(target, params);
        break;

      // TRACK5-VOID: Phase transition
      case 'phase':
        this.actionPhase(target, params);
        break;

      // OPUS6: Camera shake (both naming conventions)
      case 'cam_shake':
      case 'camera_shake':
        this.actionCameraShake(target, params);
        break;

      // OPUS6: 3D position drift
      case 'drift':
        this.actionDrift(target, params);
        break;

      // OPUS6: Narrative camera spline paths
      case 'camera_spline':
        {
          const splineParams = { ...params };
          if (!Number.isFinite(splineParams.startSongTime)) {
            splineParams.startSongTime = this._activeTriggerTime;
          }
          this.actionCameraSpline(target, splineParams);
        }
        break;

      // Camera mode switching (cinematic_dolly, handheld_panic, etc.)
      case 'camera_mode':
        this.actionCameraMode(params);
        break;

      // 01-02: Camera behavior switching (orbit, witness, stationary, etc.)
      case 'camera_behavior':
        this.actionCameraBehavior(params);
        break;

      // 01-02: Camera personality (track-specific presets)
      case 'camera_personality':
        this.actionCameraPersonality(params);
        break;

      // CINEMATIC-FIX: Camera dolly (move toward/away from target)
      case 'camera_dolly':
        this.actionCameraDolly(target, params);
        break;

      // CLIMAX-SIGNATURE: Camera vertigo (spline-safe dolly + FOV envelope)
      case 'camera_vertigo':
        this.actionCameraVertigo(target, params);
        break;

      // CINEMATIC-FIX: Camera FOV animation
      case 'camera_fov':
        this.actionCameraFOV(target, params);
        break;

      // CINEMATIC-FIX: Camera orbit (rotate around target)
      case 'camera_orbit':
        this.actionCameraOrbit(target, params);
        break;

      // CINEMATIC-FIX: Climax particle burst
      case 'climax_burst':
        this.actionClimaxBurst(target, params);
        break;

      // CINEMATIC-FIX: Fog target for choreographed fog changes
      case 'fog_target':
        this.actionFogTarget(target, params);
        break;

      // P1-CLIMAX: FOV animation for dramatic zoom effects
      case 'fov':
        this.actionFOV(params);
        break;

      // P0-FIX: Scene-level parameter animation (fog, skybox, etc.)
      case 'param':
        this.actionParam(target, params);
        break;

      // GUIDE-FIX-5: Particle vortex mode for climax
      case 'vortex':
        this.actionVortex(target, params);
        break;

      // P6-TORNADO: Smooth vortex transition with easing
      case 'vortex_transition':
        this.actionVortexTransition(target, params);
        break;

      // GIGA-AUDIT: Chromatic aberration for intense moments
      case 'chromatic_aberration':
        this.actionChromaticAberration(target, params);
        break;

      // GIGA-AUDIT: Freeze particles for ending stillness
      case 'freeze':
        this.actionFreeze(target, params);
        break;

      // P2-T5-PHASE-1: Duplicate 'case phase' removed - see line ~536 for the single handler

      // ISSUE-5-FIX: Fade to black for ending resolution
      case 'fade_to_black':
        this.actionFadeToBlack(params);
        break;

      // ISSUE-6-FIX: 6-mode particle choreography
      case 'motion_mode':
        this.actionMotionMode(target, params);
        break;

      // SECTION-6-FIX: Scene-wide unfreeze (opposite of freeze)
      case 'unfreeze':
        this.actionUnfreeze(target, params);
        break;

      // SECTION-6-FIX: Hard cut to black for ending
      case 'hard_cut_black':
        this.actionHardCutBlack(params);
        break;

      // P0-CRACK: Egg fracture effect for climax (Dec 3, 2025)
      case 'egg_crack':
        this.actionEggCrack(target, params);
        break;

      // TRACK5-GRAVITY: Particle gravitation toward void (Dec 9, 2025)
      case 'gravity':
        this.actionGravity(target, params);
        break;

      // TRACK5-VOID: Particle atmosphere lift near the event horizon (no extra post passes)
      case 'void_glow':
        this.actionVoidGlow(target, params);
        break;

      // TRACK5-VOID: Void sphere lens/glow controls (Dec 9, 2025)
      case 'void_lens':
        this.actionVoidLens(target, params);
        break;

      // P6-DIAMOND: Void sphere lens pulse (attack + long decay in one action)
      case 'void_lens_pulse':
        this.actionVoidLensPulse(target, params);
        break;

      default:
        if (window.SONOITE_DEBUG) {
          console.warn(`[JourneyController] Unknown action type: ${type}`);
        }
    }
  }

  /**
   * BUG-002-FIX: Opacity Tween with Cancellation
   * PHASE-0.2-FIX: Now handles category targets (flow, structure) by iterating all layers
   * Replaces instant assignment with smooth animation.
   * Auto-cancels previous tween on same layer.
   */
  actionOpacity(target, params) {
    // PHASE-0.2-FIX: Get layers as array to handle both single layers and categories
    const layers = this.getLayersAsArray(target);
    if (layers.length === 0) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[JourneyController] actionOpacity: No layers found for: ${target}`);
      }
      return;
    }

    const targetOpacity = params.value ?? 0.5;
    const durationSec = typeof params.duration === 'string' ? parseFloat(params.duration) : params.duration;
    const duration = (Number.isFinite(durationSec) ? durationSec : 1.0) * 1000; // Convert to ms
    const easing = params.easing || 'easeInOutCubic';

    // PHASE-0.2-FIX: Apply to each layer in the array
    for (const layer of layers) {
      if (!layer) continue;

      // BUG-002-FIX: Cancel previous opacity tween for this layer
      if (layer._opacityTween) {
        cancelAnimationFrame(layer._opacityTween.rafId);
        if (window.SONOITE_DEBUG) {
          console.log(`[Opacity] Cancelled previous tween on ${target}`);
        }
      }

      // Determine starting opacity from various sources
      let startOpacity = 1.0;
      const rootMaterial = layer.group?.children?.[0]?.material;
      const uniformOpacity = rootMaterial?.uniforms?.uOpacity?.value;

      // Prefer uniform-based opacity (shader layers) over material.opacity (often defaults to 1.0).
      if (uniformOpacity !== undefined) {
        startOpacity = uniformOpacity;
      } else if (layer.opacity !== undefined) {
        startOpacity = layer.opacity;
      } else if (layer.params?.opacity !== undefined) {
        startOpacity = layer.params.opacity;
      } else if (rootMaterial?.opacity !== undefined) {
        startOpacity = rootMaterial.opacity;
      }

      if (!Number.isFinite(startOpacity)) {
        startOpacity = 1.0;
      } else {
        startOpacity = Math.max(0.0, Math.min(1.0, startOpacity));
      }

      const startTime = performance.now();
      const opacityDelta = targetOpacity - startOpacity;

      const triggerTime = this._activeTriggerTime;
      const nowTime = this.currentTime;
      const elapsedAudioMs = (Number.isFinite(triggerTime) && Number.isFinite(nowTime))
        ? Math.max(0, (nowTime - triggerTime) * 1000)
        : 0;

      if (window.SONOITE_DEBUG) {
        console.log(`[Opacity] ${target}: ${startOpacity.toFixed(2)} → ${targetOpacity.toFixed(2)} over ${duration}ms`);
      }

      if (!Number.isFinite(duration) || duration <= 0) {
        this._setLayerOpacity(layer, targetOpacity);
        delete layer._opacityTween;
        continue;
      }

      if (elapsedAudioMs >= duration) {
        this._setLayerOpacity(layer, targetOpacity);
        delete layer._opacityTween;
        continue;
      }

      const seekElapsed = elapsedAudioMs > 0 ? elapsedAudioMs : 0;
      const remainingDuration = Math.max(1, duration - seekElapsed);

      let seekStartOpacity = startOpacity;
      let seekDelta = opacityDelta;
      let seekStartTime = startTime;

      if (seekElapsed > 0) {
        const seekProgress = Math.min(seekElapsed / duration, 1.0);
        const seekEased = this._easeProgress(easing, seekProgress);
        const seekOpacity = startOpacity + opacityDelta * seekEased;
        this._setLayerOpacity(layer, seekOpacity);

        seekStartOpacity = seekOpacity;
        seekDelta = targetOpacity - seekStartOpacity;
        seekStartTime = performance.now();
      }

      const animate = () => {
        const elapsed = performance.now() - seekStartTime;
        const progress = Math.min(elapsed / remainingDuration, 1.0);

        // Apply easing
        const easedProgress = this._easeProgress(easing, progress);
        const currentOpacity = seekStartOpacity + seekDelta * easedProgress;

        // Update all possible opacity targets
        this._setLayerOpacity(layer, currentOpacity);

        if (progress < 1.0) {
          const rafId = this.registerRAF(animate);
          layer._opacityTween = { rafId, startTime: seekStartTime, targetOpacity };
        } else {
          // Cleanup on completion
          delete layer._opacityTween;
          if (window.SONOITE_DEBUG) {
            console.log(`[Opacity] ${target}: Complete at ${currentOpacity.toFixed(2)}`);
          }
        }
      };

      animate();
    }
  }

  _getLayerOpacityTargets(layer) {
    if (!layer) return [];
    if (Array.isArray(layer._opacityTargets) && layer._opacityTargets.length > 0) {
      return layer._opacityTargets;
    }

    const targets = [];
    const seen = new Set();
    const addMaterial = (mat) => {
      if (!mat || seen.has(mat.uuid)) return;
      seen.add(mat.uuid);
      targets.push(mat);
    };

    if (layer.group) {
      layer.group.traverse((obj) => {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          addMaterial(mat);
        }
      });
    }

    if (targets.length === 0 && layer.material) {
      addMaterial(layer.material);
    }

    layer._opacityTargets = targets;
    return targets;
  }

  /**
   * BUG-002-FIX: Helper to set opacity on all layer materials
   */
  _setLayerOpacity(layer, opacity) {
    // Update layer.opacity for future reference
    layer.opacity = opacity;

    // Update params if exists
    if (layer.params) {
      layer.params.opacity = opacity;
    }

    // AUDIT-FIX: Handle visibility for preloaded layers (manifest_in with opacity=0)
    // This ensures layers re-show when opacity > 0 after being preloaded invisible
    if (layer.group) {
      layer.group.visible = opacity > 0.01;
    }

    // Update cached group materials (avoids traverse on every tween frame)
    const opacityTargets = this._getLayerOpacityTargets(layer);
    if (opacityTargets.length > 0) {
      for (const mat of opacityTargets) {
        if (!mat) continue;
        if (mat.uniforms?.uOpacity) {
          mat.uniforms.uOpacity.value = opacity;
        }
        if (mat.opacity !== undefined) {
          mat.opacity = opacity;
          mat.transparent = opacity < 1.0;
        }
      }
    }

    // Call layer's setOpacity if it exists
    if (typeof layer.setOpacity === 'function') {
      layer.setOpacity(opacity);
    }
  }

  /**
   * BUG-002-FIX: Easing functions for smooth animations
   */
  _easeProgress(type, t) {
    const easings = {
      linear: t => t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
      easeInCubic: t => t * t * t,
      easeOutCubic: t => 1 - Math.pow(1 - t, 3),
      easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    };
    return (easings[type] || easings.easeInOutCubic)(t);
  }

  /**
   * Action: Sparkle on treble peaks (per-instance emissive modulation)
   * MP-AUDIO-EMA-06: Use spike detection to prevent flicker
   */
  actionSparkle(target, params, audioData) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    // MP-AUDIO-EMA-06: Use spike detection with raw treble value
    const rawTreble = audioData?.raw?.trebleLevel || audioData?.treble || 0;
    if (audioEMA.spike('treble', rawTreble)) {
      const treble = audioData?.treble || 0;
      layer.group.traverse(obj => {
        if (obj.material) {
          // ACT-SPK-01: Check for shader uniforms first
          if (obj.material.uniforms?.uTransients) {
            obj.material.uniforms.uTransients.value = treble * 0.8;
            // Decay sparkle
            setTimeout(() => {
              if (obj.material.uniforms?.uTransients) {
                obj.material.uniforms.uTransients.value *= 0.9;
              }
            }, 100);
          } else if (obj.material.uniforms?.uOnsetKick) {
            obj.material.uniforms.uOnsetKick.value = treble * 0.8;
            // Decay sparkle
            setTimeout(() => {
              if (obj.material.uniforms?.uOnsetKick) {
                obj.material.uniforms.uOnsetKick.value *= 0.9;
              }
            }, 100);
          } else if (obj.material.emissive) {
            // Fallback to MeshStandard emissive
            obj.material.emissive.setScalar(treble * 0.8);
            obj.material.emissiveIntensity = treble * 1.5;
            // Decay sparkle
            setTimeout(() => {
              if (obj.material) {
                obj.material.emissiveIntensity *= 0.9;
              }
            }, 100);
          }
        }
      });
    }
  }

  /**
   * Action: Gentle shudder (small rotation on bass)
   */
  actionShudder(target, params, audioData) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    const bass = audioData?.bass || 0;
    const intensity = params.intensity || 0.05;

    if (bass > 0.5) {
      layer.group.rotation.z += (Math.random() - 0.5) * intensity * bass;
      layer.group.rotation.x += (Math.random() - 0.5) * intensity * bass * 0.5;
    }
  }

  /**
   * Action: Density fade (spawn/dissolveAll)
   */
  actionDensityFade(target, params, direction) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const duration = params.duration || 2.0;
    const startTime = this.currentTime;
    const startOpacity = direction === 'in' ? 0.0 : 1.0;
    const endOpacity = direction === 'in' ? 1.0 : 0.0;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;

      if (layer.group) {
        layer.group.traverse(obj => {
          if (obj.material) {
            // ACT-OP-01: Check for shader material uniforms first
            if (obj.material.uniforms?.uOpacity) {
              obj.material.uniforms.uOpacity.value = opacity;
            } else if (obj.material.opacity !== undefined) {
              obj.material.opacity = opacity;
            }
          }
        });
      }

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * Action: Enable second instanced layer (count increase)
   */
  actionCount(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    // MP-THROTTLE-07: Debounce count actions (90ms minimum spacing)
    if (this.shouldDebounce(`count:${target}`, 90)) return;

    // MP-ACCESS-05: Cap count multiplier at 1.1x when reduced motion is enabled
    let multiplier = params.multiplier || 1.0;
    if (window.SONOITE_REDUCED_MOTION && multiplier > 1.1) {
      multiplier = 1.1;
      if (window.SONOITE_DEBUG) {
        console.log(`[JourneyController] Count multiplier capped at 1.1x (reduced motion)`);
      }
    }

    // Enable preallocated second layer if available
    if (layer.enableSecondLayer) {
      layer.enableSecondLayer(multiplier);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Count action on ${target} (multiplier: ${multiplier})`);
    }
  }

  /**
   * Action: Scale animation
   */
  actionScale(target, params) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    const targetScale = params.value || 1.0;
    const duration = params.duration || 1.0;
    const startScale = layer.group.scale.x;
    const startTime = this.currentTime;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const scale = startScale + (targetScale - startScale) * progress;

      layer.group.scale.setScalar(scale);

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * MOM-01: Action: Camera path sequence
   * MP11-FIX: Now calls setBehavior when params.behavior is specified
   */
  actionCameraPath(target, params = {}) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found');
      }
      return;
    }

    // P0-FIX: Defensive check for params
    if (!params || typeof params !== 'object') {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] camera_path called without valid params');
      }
      return;
    }

    const explicitPosition = Array.isArray(params.position) ? params.position : null;
    const explicitLookAt = Array.isArray(params.lookAt)
      ? params.lookAt
      : (Array.isArray(params.target) ? params.target : null);

    // MP11-FIX: Map behavior string to setBehavior call
    if (params.behavior && cameraLayer.setBehavior) {
      const behaviorParams = {
        radius: params.radius,
        height: params.height,
        speed: params.speed,
        position: explicitPosition,
        target: params.followTarget,
        damping: params.damping,
        shake: params.shake
      };

      cameraLayer.setBehavior(params.behavior, behaviorParams);

      if (window.SONOITE_DEBUG) {
        console.log(`[MP11] Camera behavior set: ${params.behavior}`, behaviorParams);
      }
    }

    if (explicitPosition && typeof cameraLayer.setCameraPosition === 'function') {
      cameraLayer.setCameraPosition(...explicitPosition);
    }

    if (explicitLookAt && typeof cameraLayer.setLookAtTarget === 'function') {
      cameraLayer.setLookAtTarget(...explicitLookAt);
    }

    // OPUS6: Handle direct dolly parameter
    if (params.dolly !== undefined) {
      if (cameraLayer.dolly && typeof cameraLayer.dolly === 'function') {
        cameraLayer.dolly(params.dolly, params.duration || 3.0, params.easing || 'linear');
        if (window.SONOITE_DEBUG) {
          console.log(`[OPUS6] Camera dolly: ${params.dolly} over ${params.duration || 3.0}s`);
        }
      } else if (window.SONOITE_DEBUG) {
        console.warn('[OPUS6] Camera dolly() method not available');
      }
    }

    // Legacy path animation for compatibility
    if (params.sequence && cameraLayer.addPathSequence) {
      const sequence = params.sequence; // e.g., 'intro', 'midpoint'
      const duration = params.duration || 3.0;

      cameraLayer.addPathSequence({
        name: sequence,
        duration: duration,
        easing: params.easing || 'easeInOutQuad'
      });

      if (window.SONOITE_DEBUG) {
        console.log(`[JourneyController] Camera path action: ${sequence}`);
      }
    }
  }

  /**
   * MOM-01/OPUS6/MP10: Post-processing effect adjustment
   * Supports preset switching AND individual parameter tweening
   * OPUS6-FIX: Uses window.SonoiteExperience (this.experience was never set)
   */
  actionPostEffect(target, params) {
    // MP-THROTTLE-07: Debounce post-processing toggles (120ms minimum spacing)
    if (this.shouldDebounce(`post:${target}`, 120)) return;

    // OPUS6-FIX: Use global reference - this.experience was NEVER SET in JourneyController
    const postfx = window.SonoiteExperience?.postProcessing;
    if (!postfx) {
      if (window.SONOITE_DEBUG && window.SONOITE_POST === true) {
        console.warn('[JourneyController] Post-processing not available');
      }
      return;
    }

    const duration = params.duration || 0;
    const enableEps = 0.001;

    // MP10: Apply preset if specified (e.g., 'cinematic', 'noir', 'balanced')
    if (params.preset && typeof postfx.applyPreset === 'function') {
      postfx.applyPreset(params.preset);
      if (window.SONOITE_DEBUG) {
        console.log(`[MP10] Applied post-processing preset: ${params.preset}`);
      }
    }

    // MP10: Collect individual parameters for tweening
    const tweenParams = {};
    if (typeof params.bloom === 'number') tweenParams.bloom = params.bloom;
    if (typeof params.vignette === 'number') tweenParams.vignette = params.vignette;
    if (typeof params.vignetteDarkness === 'number') tweenParams.vignetteDarkness = params.vignetteDarkness;
    if (typeof params.grain === 'number') tweenParams.grain = params.grain;
    if (typeof params.godRays === 'number') tweenParams.godRays = params.godRays;
    if (typeof params.brightness === 'number') tweenParams.brightness = params.brightness;  // ISSUE-3-FIX: Global brightness
    if (typeof params.warmth === 'number') tweenParams.warmth = params.warmth;  // P1-TEMP-ARC: Color temperature
    if (typeof params.value === 'number') tweenParams.value = params.value; // Legacy support

    // Legacy single-effect mode (target is effect name like 'bloom')
    if (tweenParams.value !== undefined && postfx.setEffectIntensity) {
      const value = Math.max(0, Math.min(1, tweenParams.value));
      if (duration > 0) {
        const startValue = postfx.passes?.[`${target}Strength`] || postfx.passes?.[`${target}Intensity`] || 0;
        const startTime = this.currentTime;
        const animate = () => {
          const elapsed = this.currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1.0);
          postfx.setEffectIntensity(target, startValue + (value - startValue) * progress);
          if (progress < 1.0) this.registerRAF(animate);
        };
        animate();
      } else {
        postfx.setEffectIntensity(target, value);
      }
      return;
    }

    // Skip if no parameters to tween
    if (Object.keys(tweenParams).length === 0 && !params.preset) return;

    // Route brightness/warmth through PostProcessingConfig (keeps perf gates coherent)
    if (typeof tweenParams.brightness === 'number' && typeof postfx.setBrightnessTarget === 'function') {
      postfx.setBrightnessTarget(tweenParams.brightness, duration);
      delete tweenParams.brightness;
    }
    if (typeof tweenParams.warmth === 'number' && typeof postfx.setWarmthTarget === 'function') {
      postfx.setWarmthTarget(tweenParams.warmth, duration);
      delete tweenParams.warmth;
    }

    // Animated transition (duration > 0)
    if (duration > 0 && Object.keys(tweenParams).length > 0) {
      const startTime = this.currentTime;
      const startValues = {
        bloom: postfx.bloomPass?.strength || 0,
        vignette: postfx.vignettePass?.uniforms?.['offset']?.value || 0,
        vignetteDarkness: postfx.vignettePass?.uniforms?.['darkness']?.value || 1.0,
        grain: postfx.filmGrainPass?.uniforms?.['intensity']?.value || 0,
        godRays: postfx.godRaysPass?.uniforms?.intensity?.value || 0
      };

      const animate = () => {
        const elapsed = this.currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        let shouldUpdatePipeline = false;

        // Tween bloom
        if (typeof tweenParams.bloom === 'number' && postfx.bloomPass) {
          const targetBloom = Math.max(0, Math.min(0.6, tweenParams.bloom));
          const value = startValues.bloom + (targetBloom - startValues.bloom) * eased;
          postfx.passes.bloomStrength = value;
          postfx.effects.bloom = value > enableEps;
          postfx.bloomTarget = postfx.effects.bloom ? value : undefined;
          postfx.bloomPass.strength = value;
          postfx.bloomPass.enabled = value > enableEps;
          shouldUpdatePipeline = true;
        }

        // Tween vignette offset
        if (typeof tweenParams.vignette === 'number' && postfx.vignettePass?.uniforms?.['offset']) {
          const targetVignette = Math.max(0, Math.min(1, tweenParams.vignette));
          const value = startValues.vignette + (targetVignette - startValues.vignette) * eased;
          postfx.passes.vignetteStrength = value;
          postfx.effects.vignette = value > enableEps;
          postfx.vignetteTarget = postfx.effects.vignette ? value : undefined;
          postfx.vignettePass.uniforms['offset'].value = value;
          postfx.vignettePass.enabled = value > enableEps;
          shouldUpdatePipeline = true;
        }

        // Tween vignette darkness
        if (typeof tweenParams.vignetteDarkness === 'number' && postfx.vignettePass?.uniforms?.['darkness']) {
          const value = startValues.vignetteDarkness + (tweenParams.vignetteDarkness - startValues.vignetteDarkness) * eased;
          postfx.passes.vignetteDarkness = value;
          postfx.vignettePass.uniforms['darkness'].value = value;
          shouldUpdatePipeline = true;
        }

        // Tween grain
        if (typeof tweenParams.grain === 'number' && postfx.filmGrainPass?.uniforms?.['intensity']) {
          const targetGrain = Math.max(0, Math.min(1, tweenParams.grain));
          const value = startValues.grain + (targetGrain - startValues.grain) * eased;
          postfx.passes.grainIntensity = value;
          postfx.effects.filmGrain = value > enableEps;
          postfx.filmGrainPass.uniforms['intensity'].value = value;
          postfx.filmGrainPass.enabled = value > enableEps;
          shouldUpdatePipeline = true;
        }

        // Tween god rays
        if (typeof tweenParams.godRays === 'number') {
          const value = startValues.godRays + (tweenParams.godRays - startValues.godRays) * eased;
          if (typeof postfx.setGodRaysIntensity === 'function') {
            postfx.setGodRaysIntensity(value);
          } else if (postfx.godRaysPass?.uniforms?.intensity) {
            const safe = Math.max(0, Math.min(0.08, value));
            postfx.godRaysPass.uniforms.intensity.value = safe;
            postfx.godRaysPass.enabled = safe > enableEps;
          }
        }

        if (progress < 1.0) {
          this.registerRAF(animate);
        } else if (shouldUpdatePipeline && typeof postfx.updatePipeline === 'function') {
          postfx.updatePipeline();
        }
      };

      animate();
    } else if (Object.keys(tweenParams).length > 0) {
      // Instant change (duration = 0)
      if (typeof tweenParams.bloom === 'number' && postfx.bloomPass) {
        const bloom = Math.max(0, Math.min(0.6, tweenParams.bloom));
        postfx.passes.bloomStrength = bloom;
        postfx.effects.bloom = bloom > enableEps;
        postfx.bloomTarget = postfx.effects.bloom ? bloom : undefined;
        postfx.bloomPass.strength = bloom;
        postfx.bloomPass.enabled = bloom > enableEps;
      }
      if (typeof tweenParams.vignette === 'number' && postfx.vignettePass?.uniforms?.['offset']) {
        const vignette = Math.max(0, Math.min(1, tweenParams.vignette));
        postfx.passes.vignetteStrength = vignette;
        postfx.effects.vignette = vignette > enableEps;
        postfx.vignetteTarget = postfx.effects.vignette ? vignette : undefined;
        postfx.vignettePass.uniforms['offset'].value = vignette;
        postfx.vignettePass.enabled = vignette > enableEps;
      }
      if (typeof tweenParams.vignetteDarkness === 'number' && postfx.vignettePass?.uniforms?.['darkness']) {
        postfx.passes.vignetteDarkness = tweenParams.vignetteDarkness;
        postfx.vignettePass.uniforms['darkness'].value = tweenParams.vignetteDarkness;
      }
      if (typeof tweenParams.grain === 'number' && postfx.filmGrainPass?.uniforms?.['intensity']) {
        const grain = Math.max(0, Math.min(1, tweenParams.grain));
        postfx.passes.grainIntensity = grain;
        postfx.effects.filmGrain = grain > enableEps;
        postfx.filmGrainPass.uniforms['intensity'].value = grain;
        postfx.filmGrainPass.enabled = grain > enableEps;
      }
      if (typeof tweenParams.godRays === 'number') {
        if (typeof postfx.setGodRaysIntensity === 'function') {
          postfx.setGodRaysIntensity(tweenParams.godRays);
        } else if (postfx.godRaysPass?.uniforms?.intensity) {
          const safe = Math.max(0, Math.min(0.08, tweenParams.godRays));
          postfx.godRaysPass.uniforms.intensity.value = safe;
          postfx.godRaysPass.enabled = safe > enableEps;
        }
      }

      if (typeof postfx.updatePipeline === 'function') {
        postfx.updatePipeline();
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MP10] Post-processing action:`, params);
    }
  }

  /**
   * P6-T6-MECH-01: Uniform/property animation helper (used by Track 6 moments)
   * Supports schema variants:
   * - { type:'animate', target:'layer', uniform:'uX', params:{to,duration,easing} }
   * - { type:'animate', target:'layer', params:{uniform:'uX', to,duration,easing} }
   */
  actionAnimate(action) {
    const target = action?.target;
    const params = action?.params || {};
    const uniformName = action?.uniform || params.uniform;

    if (!target || !uniformName) {
      if (window.SONOITE_DEBUG) {
        console.warn('[P6-T6-MECH-01] animate: missing target/uniform', action);
      }
      return;
    }

    const layer = this.getLayer(target);
    if (!layer) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[P6-T6-MECH-01] animate: layer not found: ${target}`);
      }
      return;
    }

    const toValue = params.to;
    if (!Number.isFinite(toValue)) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[P6-T6-MECH-01] animate: invalid 'to' value for ${uniformName}`, params);
      }
      return;
    }

    const duration = Math.max(0, Number(params.duration ?? 1.0));
    const easing = params.easing || 'easeInOutCubic';

    // Collect all matching uniforms (group traverse + layer.material fallback)
    const uniforms = [];
    if (layer.group?.traverse) {
      layer.group.traverse(obj => {
        if (obj.material?.uniforms?.[uniformName]) {
          uniforms.push(obj.material.uniforms[uniformName]);
        }
      });
    }
    if (uniforms.length === 0 && layer.material?.uniforms?.[uniformName]) {
      uniforms.push(layer.material.uniforms[uniformName]);
    }

    if (uniforms.length === 0) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[P6-T6-MECH-01] animate: uniform not found: ${uniformName} on ${target}`);
      }
      return;
    }

    const startValue = uniforms[0]?.value ?? 0;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = durationMs > 0 ? Math.min(elapsed / durationMs, 1.0) : 1.0;
      const eased = this._easeProgress(easing, progress);
      const value = startValue + (toValue - startValue) * eased;

      for (const u of uniforms) {
        if (u) u.value = value;
      }

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * P6-T6-MECH-01: Dissolve (fade out) all flow/structure layers.
   * Defaults to dissolving both categories unless explicit targets are provided.
   */
  actionDissolveLayers(action) {
    const params = action?.params || {};
    const duration = Number.isFinite(params.duration) ? params.duration : 10.0;
    const easing = params.easing || 'easeInOutCubic';
    const value = Number.isFinite(params.value) ? params.value : 0.0;

    const targets = Array.isArray(params.targets) && params.targets.length
      ? params.targets
      : ['flow', 'structure'];

    for (const target of targets) {
      this.actionOpacity(target, { value, duration, easing });
    }
  }

  /**
   * MP-T2-REG-02: Action: Shimmer (material emissive pulse)
   */
  actionShimmer(target, params) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    // MP-THROTTLE-07: Debounce shimmer actions (100ms minimum spacing)
    if (this.shouldDebounce(`shimmer:${target}`, 100)) return;

    // MP-ACCESS-05: Cap shimmer intensity when reduced motion is enabled
    let amount = params.amount || 0.5;
    if (window.SONOITE_REDUCED_MOTION) {
      amount = Math.min(amount, 0.3); // Cap at 30% instead of 50%+
    }

    const duration = params.duration || 1.0;
    const startTime = this.currentTime;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      // Pulse curve: ease in-out
      const pulse = Math.sin(progress * Math.PI);
      const intensity = amount * pulse;

      layer.group.traverse(obj => {
        if (obj.material) {
          if (obj.material.uniforms?.uTransients) {
            obj.material.uniforms.uTransients.value = intensity;
          } else if (obj.material.uniforms?.uOnsetKick) {
            obj.material.uniforms.uOnsetKick.value = intensity;
          } else if (obj.material.emissive) {
            obj.material.emissiveIntensity = intensity * 2.0;
          }
        }
      });

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Shimmer action on ${target}: amount=${amount}`);
    }
  }

  /**
   * MP-T2-REG-02: Action: Veil (fade layer in/out)
   */
  actionVeil(target, params) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    // MP-THROTTLE-07: Debounce veil toggles (110ms minimum spacing)
    if (this.shouldDebounce(`veil:${target}`, 110)) return;

    const state = params.state || 'on'; // 'on' or 'off'
    // MP-ACCESS-05: Increase veil fade duration by 50% when reduced motion is enabled
    let fade = params.fade || 2.0;
    if (window.SONOITE_REDUCED_MOTION) {
      fade *= 1.5; // 50% longer transitions
    }

    const startTime = this.currentTime;
    const startOpacity = state === 'on' ? 0.0 : 1.0;
    const endOpacity = state === 'on' ? 1.0 : 0.0;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / fade, 1.0);
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;

      layer.group.traverse(obj => {
        if (obj.material) {
          if (obj.material.uniforms?.uOpacity) {
            obj.material.uniforms.uOpacity.value = opacity;
          } else if (obj.material.opacity !== undefined) {
            obj.material.opacity = opacity;
            obj.material.transparent = true;
          }
        }
      });

      // Set visibility
      layer.group.visible = opacity > 0.01;

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Veil ${state} on ${target}: fade=${fade}s`);
    }
  }

  /**
   * MP-IDLE-02: Action: Manifest In (staged reveal)
   * CATEGORY-FIX: Now handles category targets (flow, structure) by iterating all layers
   */
  actionManifestIn(target, params) {
    // CATEGORY-FIX: Use getLayersAsArray to handle both single layers and category targets
    const layers = this.getLayersAsArray(target);
    if (layers.length === 0) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[JourneyController] actionManifestIn: No layers found for: ${target}`);
      }
      return;
    }

    const duration = params.duration || 2.5;
    const delay = params.delay || 0;
    const startTime = this.currentTime + delay;
    const targetOpacity = params.opacity ?? 1.0;  // EXPERT-PLAN: Use ?? to allow 0
    const targetScale = params.scale || 1.0;

    // AUDIT-FIX: Get easing from params (was hardcoded linear)
    const easing = params.easing || 'linear';

    const animate = () => {
      if (this.currentTime < startTime) {
        this.registerRAF(animate);
        return;
      }

      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      // AUDIT-FIX: Apply easing from params instead of hardcoded linear
      const eased = this._easeProgress(easing, progress);

      // CATEGORY-FIX: Iterate over all layers
      for (const layer of layers) {
        if (!layer?.group) continue;

        // Fade in opacity
        const opacity = eased * targetOpacity;
        layer.group.traverse(obj => {
          if (obj.material) {
            if (obj.material.uniforms?.uOpacity) {
              obj.material.uniforms.uOpacity.value = opacity;
            } else if (obj.material.opacity !== undefined) {
              obj.material.opacity = opacity;
              obj.material.transparent = true;
            }
          }
        });

        // Scale in
        const scale = eased * targetScale;
        layer.group.scale.setScalar(scale);
        layer.group.visible = opacity > 0.01;
      }

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Manifest in: ${target} (${layers.length} layers, delay: ${delay}s, duration: ${duration}s)`);
    }
  }

  /**
   * MP-IDLE-02: Action: Manifest Out (staged exit)
   * CATEGORY-FIX: Now handles category targets (flow, structure) by iterating all layers
   */
  actionManifestOut(target, params) {
    // CATEGORY-FIX: Use getLayersAsArray to handle both single layers and category targets
    const layers = this.getLayersAsArray(target);
    if (layers.length === 0) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[JourneyController] actionManifestOut: No layers found for: ${target}`);
      }
      return;
    }

    const duration = params.duration || 2.5;
    const delay = params.delay || 0;
    const startTime = this.currentTime + delay;

    // CATEGORY-FIX: Capture initial state for each layer
    const layerStates = layers.map(layer => ({
      layer,
      startOpacity: layer?.group?.children[0]?.material?.opacity || 1.0,
      startScale: layer?.group?.scale?.x || 1.0
    }));

    const animate = () => {
      if (this.currentTime < startTime) {
        this.registerRAF(animate);
        return;
      }

      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = progress; // Linear for now

      // CATEGORY-FIX: Iterate over all layers
      for (const { layer, startOpacity, startScale } of layerStates) {
        if (!layer?.group) continue;

        // Fade out opacity
        const opacity = startOpacity * (1.0 - eased);
        layer.group.traverse(obj => {
          if (obj.material) {
            if (obj.material.uniforms?.uOpacity) {
              obj.material.uniforms.uOpacity.value = opacity;
            } else if (obj.material.opacity !== undefined) {
              obj.material.opacity = opacity;
            }
          }
        });

        // Scale down
        const scale = startScale * (1.0 - eased * 0.2); // Scale to 80%
        layer.group.scale.setScalar(scale);
        layer.group.visible = opacity > 0.01;

        if (progress >= 1.0) {
          layer.group.visible = false;
        }
      }

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Manifest out: ${target} (${layers.length} layers, delay: ${delay}s, duration: ${duration}s)`);
    }
  }

  /**
   * ACT-ADAPT-02: Action adapters for all journey moment types
   */

  /**
   * Action: Density multiplier (particles, fog, flow elements)
   */
  actionDensity(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const multiplier = params.multiplier ?? 1.0;
    const duration = params.duration ?? 2.0;

    // Check for density uniform (common in particle systems)
    if (layer.material?.uniforms?.uDensity) {
      const startDensity = layer.material.uniforms.uDensity.value;
      const targetDensity = startDensity * multiplier;
      this.animateUniform(layer.material.uniforms.uDensity, targetDensity, duration);
    }
    // Check for count/particleCount property
    else if (layer.particleCount !== undefined) {
      const startCount = layer.particleCount;
      const targetCount = Math.floor(startCount * multiplier);
      this.animateProperty(layer, 'particleCount', targetCount, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Density: ${target} x${multiplier}`);
    }
  }

  /**
   * Action: Turbulence intensity (ink_tendrils, flows)
   */
  actionTurbulence(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    // 01-01 FIX: Use ?? so authored 0 values are respected
    const intensity = params.intensity ?? params.amount ?? 0.5;
    const duration = params.duration ?? 2.0;

    // Check for turbulence uniform
    if (layer.material?.uniforms?.uTurbulence) {
      this.animateUniform(layer.material.uniforms.uTurbulence, intensity, duration);
    }
    // Fallback to noise scale
    else if (layer.material?.uniforms?.uNoiseScale) {
      const targetScale = 1.0 + intensity;
      this.animateUniform(layer.material.uniforms.uNoiseScale, targetScale, duration);
    } else if (typeof layer.setTurbulence === 'function') {
      layer.setTurbulence(intensity, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Turbulence: ${target} intensity=${intensity}`);
    }
  }

  /**
   * Action: Waft (legacy alias for turbulence with amount mapping)
   */
  actionWaft(target, params = {}) {
    this.actionTurbulence(target, {
      ...params,
      intensity: params.intensity ?? params.amount ?? 0.3,
      duration: params.duration ?? 2.0
    });
  }

  /**
   * Action: Spawn/Dissolve (deconstructed_vertices, particles)
   */
  actionSpawnDissolve(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const state = params.state || 'spawn'; // 'spawn' or 'dissolve'
    const duration = params.duration || 3.0;
    const targetOpacity = state === 'spawn' ? 1.0 : 0.0;

    // Animate opacity for spawn/dissolve effect
    if (layer.group) {
      layer.group.traverse(child => {
        if (child.material) {
          const startOpacity = child.material.opacity || (state === 'spawn' ? 0.0 : 1.0);
          this.animateProperty(child.material, 'opacity', targetOpacity, duration);
        }
      });
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] SpawnDissolve: ${target} ${state}`);
    }
  }

  /**
   * Action: Morph geometry (egg_crystal, organic shapes)
   */
  actionMorph(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const intensity = params.intensity || 0.5;
    const duration = params.duration || 3.0;

    // Check for morph uniform
    if (layer.material?.uniforms?.uMorphAmount) {
      this.animateUniform(layer.material.uniforms.uMorphAmount, intensity, duration);
    }
    // Fallback to displacement
    else if (layer.material?.uniforms?.uDisplacement) {
      this.animateUniform(layer.material.uniforms.uDisplacement, intensity, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Morph: ${target} intensity=${intensity}`);
    }
  }

  /**
   * Action: Subtle scale (monolith, structures)
   */
  actionSubtleScale(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const multiplier = params.multiplier || 1.05;
    const duration = params.duration || 2.0;

    if (layer.group) {
      const startScale = layer.group.scale.x;
      const targetScale = startScale * multiplier;
      this.animateProperty(layer.group.scale, 'x', targetScale, duration);
      this.animateProperty(layer.group.scale, 'y', targetScale, duration);
      this.animateProperty(layer.group.scale, 'z', targetScale, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] SubtleScale: ${target} x${multiplier}`);
    }
  }

  /**
   * Action: Edge shimmer (monolith, structures)
   */
  actionEdgeShimmer(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const amount = params.amount || 0.3;
    const duration = params.duration || 1.5;

    // Check for edge shimmer uniform (fresnel/rim lighting)
    if (layer.material?.uniforms?.uFresnelPower) {
      const targetPower = 2.0 + amount * 3.0;
      this.animateUniform(layer.material.uniforms.uFresnelPower, targetPower, duration);
    }
    // Fallback to emissive intensity
    else if (layer.material?.emissiveIntensity !== undefined) {
      const targetIntensity = amount;
      this.animateProperty(layer.material, 'emissiveIntensity', targetIntensity, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] EdgeShimmer: ${target} amount=${amount}`);
    }
  }

  /**
   * Action: Color shift (flows, particles)
   */
  actionColorShift(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const intensity = params.intensity || 0.5;
    const duration = params.duration || 2.0;

    // Check for color shift uniform
    if (layer.material?.uniforms?.uColorShift) {
      this.animateUniform(layer.material.uniforms.uColorShift, intensity, duration);
    }
    // Fallback to hue shift
    else if (layer.material?.uniforms?.uHueShift) {
      const hueShift = intensity * Math.PI; // Shift by intensity * 180°
      this.animateUniform(layer.material.uniforms.uHueShift, hueShift, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] ColorShift: ${target} intensity=${intensity}`);
    }
  }

  /**
   * Action: Glow intensity (falling_ash, star_dust)
   */
  actionGlow(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const intensity = params.intensity || 0.5;
    const duration = params.duration || 2.0;

    // Check for glow uniform
    if (layer.material?.uniforms?.uGlowIntensity) {
      this.animateUniform(layer.material.uniforms.uGlowIntensity, intensity, duration);
    }
    // Fallback to emissive intensity
    else if (layer.material?.emissiveIntensity !== undefined) {
      this.animateProperty(layer.material, 'emissiveIntensity', intensity, duration);
    }
    // Fallback to opacity modulation
    else if (layer.material?.opacity !== undefined) {
      const targetOpacity = 0.5 + intensity * 0.5;
      this.animateProperty(layer.material, 'opacity', targetOpacity, duration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Glow: ${target} intensity=${intensity}`);
    }
  }

  /**
   * Action: Heartbeat pulse (coordinated multi-layer effect)
   * Executes synchronized pulse across egg, bloom, camera, and particles
   *
   * @param {string} target - Primary target layer (usually 'egg_crystal')
   * @param {Object} params - Pulse configuration
   * @param {number} params.intensity - Pulse strength (0-1, default 0.8)
   * @param {number} params.duration - Pulse duration in seconds (default 0.5)
   * @param {string} params.decayType - Decay curve: 'exponential' or 'linear' (default 'exponential')
   * @param {boolean} params.cameraShake - Enable camera shake (default true)
   * @param {boolean} params.bloomPulse - Enable bloom increase (default true)
   * @param {boolean} params.particleShiver - Enable particle reaction (default true)
   */
  actionHeartbeat(target, params) {
    const layer = this.getLayer(target);
    if (!layer) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[JourneyController] Heartbeat target not found: ${target}`);
      }
      return;
    }

    // Extract parameters with defaults
    const intensity = params.intensity ?? 0.8;
    const duration = params.duration ?? 0.5;
    const decayType = params.decayType || 'exponential';
    const enableCameraShake = params.cameraShake !== false;
    const enableBloomPulse = params.bloomPulse !== false;
    const enableParticleShiver = params.particleShiver !== false;

    // BUG-008-FIX: Use performance.now() for reliable timing (won't freeze if audio pauses)
    const startTime = performance.now();
    const durationMs = duration * 1000;

    // --- 1. EGG GLOW PULSE ---
    // Spike emissive intensity then decay
    const eggPulse = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);

      // Decay curve: exponential feels more organic, linear feels mechanical
      let decay;
      if (decayType === 'exponential') {
        decay = Math.exp(-progress * 5); // Fast exponential decay
      } else {
        decay = 1.0 - progress; // Linear decay
      }

      const pulseValue = intensity * decay;

      // Apply to emissive intensity (EggOrb uses EtherealGlowMaterial)
      if (layer.innerMat?.emissiveIntensity !== undefined) {
        layer.innerMat.emissiveIntensity = 0.5 + pulseValue * 2.0; // Base 0.5, spike to 2.5
      }
      if (layer.shellMat?.uniforms?.uEmissiveIntensity) {
        layer.shellMat.uniforms.uEmissiveIntensity.value = 0.3 + pulseValue * 1.5;
      }

      if (progress < 1.0) {
        this.registerRAF(eggPulse);
      } else {
        // Reset to baseline
        if (layer.innerMat?.emissiveIntensity !== undefined) {
          layer.innerMat.emissiveIntensity = 0.5;
        }
        if (layer.shellMat?.uniforms?.uEmissiveIntensity) {
          layer.shellMat.uniforms.uEmissiveIntensity.value = 0.3;
        }
      }
    };
    eggPulse();

    // --- 2. BLOOM PULSE ---
    if (enableBloomPulse && window.postfx) {
      const bloomIntensityPulse = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);

        let decay;
        if (decayType === 'exponential') {
          decay = Math.exp(-progress * 4);
        } else {
          decay = 1.0 - progress;
        }

        const bloomBoost = intensity * 0.3 * decay; // Max +0.24 bloom
        const baseBloom = window.postfx.currentPreset === 'noir' ? 0.35 : 0.4;

        if (window.postfx.bloomPass?.strength !== undefined) {
          window.postfx.bloomPass.strength = baseBloom + bloomBoost;
        }

        if (progress < 1.0) {
          this.registerRAF(bloomIntensityPulse);
        } else {
          // Reset to preset default
          if (window.postfx.bloomPass?.strength !== undefined) {
            window.postfx.bloomPass.strength = baseBloom;
          }
        }
      };
      bloomIntensityPulse();
    }

    // --- 3. CAMERA SHAKE ---
    if (enableCameraShake) {
      const shakeIntensity = intensity * 0.1; // Scale to camera shake range (0.08-0.15)
      const shakeDuration = Math.min(duration * 0.6, 0.3); // Shorter than full pulse
      this.actionCameraShake('camera', { intensity: shakeIntensity, duration: shakeDuration });
    }

    // --- 4. PARTICLE SHIVER ---
    if (enableParticleShiver) {
      const particleLayer = this.getLayer('star_dust');
      if (particleLayer) {
        const shiverPulse = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / durationMs, 1.0);

          let decay;
          if (decayType === 'exponential') {
            decay = Math.exp(-progress * 6); // Fast shiver
          } else {
            decay = 1.0 - progress;
          }

          // Speed spike (particles accelerate briefly)
          if (particleLayer.material?.uniforms?.uSpeed) {
            const speedBoost = intensity * 1.5 * decay;
            particleLayer.material.uniforms.uSpeed.value = 1.0 + speedBoost;
          }

          // Opacity flicker (subtle)
          if (particleLayer.material?.opacity !== undefined) {
            const opacityFlicker = intensity * 0.2 * decay;
            particleLayer.material.opacity = 0.8 + opacityFlicker;
          }

          if (progress < 1.0) {
            this.registerRAF(shiverPulse);
          } else {
            // Reset to baseline
            if (particleLayer.material?.uniforms?.uSpeed) {
              particleLayer.material.uniforms.uSpeed.value = 1.0;
            }
            if (particleLayer.material?.opacity !== undefined) {
              particleLayer.material.opacity = 0.8;
            }
          }
        };
        shiverPulse();
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Heartbeat: ${target} | intensity=${intensity.toFixed(2)} duration=${duration}s decay=${decayType}`);
    }
  }

  /**
   * Action: Pulse (generic layer pulse used by older journey assets)
   */
  actionPulse(target, params = {}) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const intensity = params.intensity ?? 0.4;
    const duration = params.duration ?? 2.0;

    // Reuse glow pulse where available.
    this.actionGlow(target, { intensity, duration });

    if (!layer.group) {
      return;
    }

    const startScaleX = layer.group.scale.x;
    const startScaleY = layer.group.scale.y;
    const startScaleZ = layer.group.scale.z;
    const targetScale = 1 + intensity * 0.08;
    const startTime = this.currentTime;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const pulse = Math.sin(progress * Math.PI);
      const scale = 1 + (targetScale - 1) * pulse;

      layer.group.scale.set(
        startScaleX * scale,
        startScaleY * scale,
        startScaleZ * scale
      );

      if (progress < 1.0) {
        this.registerRAF(animate);
      } else {
        layer.group.scale.set(startScaleX, startScaleY, startScaleZ);
      }
    };

    animate();
  }

  /**
   * Action: Spin rotation (egg_crystal, structures)
   * ANIM-EGG-08: Calls layer.spin() for EggOrb, falls back to old behavior
   * BUG-003-FIX: Now uses egg state machine for gating
   */
  actionSpin(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    // BUG-003-FIX: Gate spin on egg state machine for egg targets
    if (target === 'egg_crystal' || target.includes('egg')) {
      if (!this.isEggActionAllowed('spin')) {
        return; // Blocked by state machine (frozen or cooldown)
      }
      // Cancel any existing spin before starting new one
      this.cancelEggAnimation('spin');
      // Update last action time
      this.eggState.lastActionTime.set('spin', performance.now());
    }

    const speed = params.speed || 1.0;
    const duration = params.duration || null;
    const axis = params.axis || 'y';

    // ANIM-EGG-08: EggOrb has native spin() method with easing
    if (typeof layer.spin === 'function') {
      layer.spin({
        speed,
        duration,
        axis,
        easeSpeed: params.easeSpeed || 0.05
      });
      if (window.SONOITE_DEBUG) {
        console.log(`[JourneyController] Spin (native): ${target} speed=${speed} axis=${axis}`);
      }
      return;
    }

    // FALLBACK: Legacy behavior for other structures
    // Check for rotation speed property
    if (layer.rotationSpeed !== undefined) {
      this.animateProperty(layer, 'rotationSpeed', speed, duration || 3.0);
    }
    // Check for rotation speed uniform
    else if (layer.material?.uniforms?.uRotationSpeed) {
      this.animateUniform(layer.material.uniforms.uRotationSpeed, speed, duration || 3.0);
    }
    // Fallback: directly animate group rotation
    else if (layer.group) {
      const startRotation = layer.group.rotation.y;
      const targetRotation = startRotation + (speed * (duration || 3.0) * Math.PI);
      this.animateProperty(layer.group.rotation, 'y', targetRotation, duration || 3.0);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Spin (legacy): ${target} speed=${speed}`);
    }
  }

  /**
   * ISSUE-4-FIX: Stop spin rotation with ease-out
   * @param {string} target - Layer name (e.g., 'egg_crystal')
   * @param {Object} params - {easeOutDuration: seconds}
   */
  actionSpinStop(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const easeOutDuration = params.easeOutDuration || 2.0;

    // Call native stopSpin() if available (EggOrb)
    if (typeof layer.stopSpin === 'function') {
      layer.stopSpin(easeOutDuration);
      if (window.SONOITE_DEBUG) {
        console.log(`[JourneyController] Spin stop: ${target} easeOut=${easeOutDuration}s`);
      }
      return;
    }

    // FALLBACK: Reset rotation speed for other structures
    if (layer.rotationSpeed !== undefined) {
      this.animateProperty(layer, 'rotationSpeed', 0, easeOutDuration);
    } else if (layer.material?.uniforms?.uRotationSpeed) {
      this.animateUniform(layer.material.uniforms.uRotationSpeed, 0, easeOutDuration);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Spin stop (legacy): ${target}`);
    }
  }

  /**
   * Action: Breath pulsation (egg_crystal, organic forms)
   * BUG-003-FIX: Now uses egg state machine for gating and RAF tracking
   */
  actionBreath(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    // BUG-003-FIX: Gate breath on egg state machine for egg targets
    if (target === 'egg_crystal' || target.includes('egg')) {
      if (!this.isEggActionAllowed('breath')) {
        return; // Blocked by state machine (frozen or cooldown)
      }
      // Cancel any existing breath before starting new one
      this.cancelEggAnimation('breath');
      // Update last action time
      this.eggState.lastActionTime.set('breath', performance.now());
    }

    const intensity = params.intensity || 0.3;
    const duration = params.duration || 4.0;

    // P2-LUNG: Configure EggOrb's built-in breathing system if params provided
    if (layer.setConfig) {
      const breathConfig = {};
      if (params.rate !== undefined) breathConfig.breathingRate = params.rate;
      if (params.amplitude !== undefined) breathConfig.breathingAmplitude = params.amplitude;
      // P2-LUNG: Scale breathing params
      if (params.scaleAmplitude !== undefined) breathConfig.breathingScaleAmplitude = params.scaleAmplitude;
      if (params.scaleEnabled !== undefined) breathConfig.breathingScaleEnabled = params.scaleEnabled;
      // Enable/disable breathing
      if (params.rate === 0 || params.amplitude === 0) {
        breathConfig.breathingEnabled = false;
      } else if (params.rate !== undefined || params.amplitude !== undefined) {
        breathConfig.breathingEnabled = true;
      }
      if (Object.keys(breathConfig).length > 0) {
        layer.setConfig(breathConfig);
        if (window.SONOITE_DEBUG) {
          console.log(`[P2-LUNG] EggOrb breathing config:`, breathConfig);
        }
      }
    }

    // Breath is a cyclical scale animation (legacy fallback for non-EggOrb layers)
    if (layer.group) {
      const baseScale = layer.group.scale.x;
      const startTime = performance.now(); // BUG-003-FIX: Use performance.now() for reliable timing
      const durationMs = duration * 1000;
      const self = this; // Reference for closure

      // Create a breathing animation (sinusoidal)
      const breatheAnimation = () => {
        const elapsed = performance.now() - startTime;

        // BUG-003-FIX: Clean exit - remove from activeAnimations when done
        if (elapsed > durationMs) {
          // Reset scale to base
          layer.group.scale.set(baseScale, baseScale, baseScale);
          self.eggState.activeAnimations.delete('breath');
          return;
        }

        const breathCycle = Math.sin((elapsed / 1000) * Math.PI * 2 / duration) * intensity;
        const scale = baseScale * (1.0 + breathCycle);

        layer.group.scale.set(scale, scale, scale);

        // Continue animating and store RAF ID
        const rafId = self.registerRAF(breatheAnimation);
        self.eggState.activeAnimations.set('breath', rafId);
      };

      // Start animation and store initial RAF ID
      const initialRafId = this.registerRAF(breatheAnimation);
      this.eggState.activeAnimations.set('breath', initialRafId);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Breath: ${target} intensity=${intensity}`);
    }
  }

  // ========================================
  // BUG-003-FIX: Egg State Action Handlers
  // ========================================

  /**
   * BUG-003-FIX: Freeze egg action handler
   * Stops all egg animations and locks it in place.
   */
  actionEggFreeze(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    this.setEggMode('frozen');

    // Stop internal breathing if layer supports it
    if (layer.breathing) {
      layer.breathing.enabled = false;
    }

    // Stop rotation
    if (typeof layer.stopSpin === 'function') {
      layer.stopSpin(params.duration || 0.5);
    }

    // Reset scale to baseline
    if (layer.group) {
      const targetScale = params.scale || 1.0;
      layer.group.scale.set(targetScale, targetScale, targetScale);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[EggState] Frozen: ${target}`);
    }
  }

  /**
   * BUG-003-FIX: Thaw egg action handler
   * Resumes egg animation capability.
   */
  actionEggThaw(target, params) {
    this.setEggMode(params.mode || 'idle');

    // Re-enable breathing if it was previously on
    const layer = this.getLayer(target);
    if (layer?.breathing) {
      layer.breathing.enabled = true;
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[EggState] Thawed: ${target} mode=${params.mode || 'idle'}`);
    }
  }

  // ========================================
  // BUG-005-FIX: Motion Lock Action Handlers
  // ========================================

  /**
   * BUG-005-FIX: Lock motion mode action
   * Prevents audio from overriding during critical sequences (tornado, etc.)
   */
  actionLockMotion(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const mode = params.mode || 'spiral';
    const duration = (params.duration || 10) * 1000;
    const until = performance.now() + duration;

    // Set the motion mode
    if (typeof layer.setMotionMode === 'function') {
      layer.setMotionMode(mode, params.intensity || 1.0);
    }

    // Create lock
    this.motionLocks.set(target, { until, mode });

    if (window.SONOITE_DEBUG) {
      console.log(`[MotionLock] ${target} locked to '${mode}' for ${duration}ms`);
    }
  }

  /**
   * BUG-005-FIX: Unlock motion mode action
   */
  actionUnlockMotion(target, params) {
    this.motionLocks.delete(target);

    // Optionally reset to drift mode
    if (params.resetToDrift !== false) {
      const layer = this.getLayer(target);
      if (layer && typeof layer.setMotionMode === 'function') {
        layer.setMotionMode('drift', 0.3);
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MotionLock] ${target} unlocked`);
    }
  }

  /**
   * Action: Appear/Disappear visibility (distant_shards, structures)
   */
  actionAppearDisappear(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const state = params.state || 'appear'; // 'appear' or 'disappear'
    const duration = params.duration || 2.0;
    const targetOpacity = state === 'appear' ? 1.0 : 0.0;

    // Animate opacity for visibility change
    if (layer.group) {
      layer.group.traverse(child => {
        if (child.material) {
          const startOpacity = child.material.opacity || (state === 'appear' ? 0.0 : 1.0);
          this.animateProperty(child.material, 'opacity', targetOpacity, duration);
          // Ensure material is set to transparent
          child.material.transparent = true;
        }
      });
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] AppearDisappear: ${target} ${state}`);
    }
  }

  /**
   * Action: Faint visibility (distant_shards)
   */
  actionFaintVisibility(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const state = params.state || 'visible'; // 'visible' or 'hidden'
    const duration = params.duration || 2.0;
    const targetOpacity = state === 'visible' ? 0.4 : 0.05;

    // Animate to faint opacity
    if (layer.group) {
      layer.group.traverse(child => {
        if (child.material) {
          this.animateProperty(child.material, 'opacity', targetOpacity, duration);
          child.material.transparent = true;
        }
      });
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] FaintVisibility: ${target} ${state}`);
    }
  }

  /**
   * Helper: Animate a uniform value
   */
  animateUniform(uniform, targetValue, duration) {
    if (!uniform) return;

    const startValue = uniform.value;
    const startTime = this.currentTime;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = this.easeInOutQuad(progress);

      uniform.value = startValue + (targetValue - startValue) * eased;

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * Helper: Animate an object property
   */
  animateProperty(object, property, targetValue, duration) {
    if (!object || object[property] === undefined) return;

    const startValue = object[property];
    const startTime = this.currentTime;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = this.easeInOutQuad(progress);

      object[property] = startValue + (targetValue - startValue) * eased;

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * Helper: Ease in-out quadratic
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Helper: Ease out quadratic (decelerating)
   * FIX: Was missing - caused TypeError in actionVortex()
   */
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * BUG-FIX-02: Register RAF for cleanup tracking
   * Returns the RAF ID after storing it
   */
  registerRAF(callback) {
    let rafId = null;
    const wrappedCallback = () => {
      this.activeAnimations.delete(rafId);
      callback();
    };

    rafId = requestAnimationFrame(wrappedCallback);
    this.activeAnimations.add(rafId);
    return rafId;
  }

  /**
   * BUG-FIX-02: Cancel all active animations
   */
  cancelAllAnimations() {
    this.activeAnimations.forEach(id => cancelAnimationFrame(id));
    this.activeAnimations.clear();
  }

  /**
   * AMPLIFIED-REACTIVITY: Choreography actions (orbit/scatter/converge/flow/vortex)
   * MP-GRID-03: Added grid patterns (row_pulse/column_pulse/diagonal)
   * Applies group-level movement behaviors with EMA-smoothed parameters
   */
  actionChoreography(target, params, audioData) {
    const layer = this.getLayer(target);
    if (!layer || !layer.group) return;

    // MP-GRID-03: Support both 'behavior' and 'pattern' params
    const choreographyType = params.pattern || params.behavior; // row_pulse|column_pulse|diagonal|orbit|scatter|...
    const speed = params.speed || 1.0;
    const damping = params.damping || 0.8;
    const amplitude = params.amplitude || 1.0;
    const intensity = params.intensity || 0.5; // MP-GRID-03: For grid patterns
    const duration = params.duration || 3.0; // MP-GRID-03: For grid patterns

    // MP-ACCESS-05: Halve amplitudes in reduced-motion mode
    const reducedMotionFactor = window.SONOITE_REDUCED_MOTION ? 0.5 : 1.0;
    const effectiveAmplitude = amplitude * reducedMotionFactor;
    const effectiveIntensity = intensity * reducedMotionFactor; // MP-GRID-03

    // EMA-smoothed audio parameters
    const bass = audioData?.bass || 0;
    const mid = audioData?.mid || 0;

    // MP-GRID-03: Grid-specific choreography patterns
    switch (choreographyType) {
      case 'row_pulse':
        // Animate each row sequentially with emissive pulse
        this.actionRowPulse(layer, effectiveIntensity, duration, audioData);
        break;

      case 'column_pulse':
        // Animate each column sequentially with emissive pulse
        this.actionColumnPulse(layer, effectiveIntensity, duration, audioData);
        break;

      case 'diagonal':
        // Animate along diagonal lines with emissive pulse
        this.actionDiagonalPulse(layer, effectiveIntensity, duration, audioData);
        break;

      case 'orbit':
        // Circular motion around center
        layer.group.children.forEach((mesh, i) => {
          const angle = this.currentTime * speed + i * 0.5;
          const radius = effectiveAmplitude * 2;
          mesh.position.x += Math.cos(angle) * radius * bass * 0.1;
          mesh.position.z += Math.sin(angle) * radius * bass * 0.1;
        });
        break;

      case 'scatter':
        // Expand outward from center
        layer.group.children.forEach((mesh) => {
          const direction = mesh.position.clone().normalize();
          direction.multiplyScalar(effectiveAmplitude * mid * 0.5);
          mesh.position.add(direction);
        });
        break;

      case 'converge':
        // Pull inward toward center with damping
        layer.group.children.forEach((mesh) => {
          mesh.position.multiplyScalar(damping);
        });
        break;

      case 'flow':
        // Wave-like motion
        layer.group.children.forEach((mesh, i) => {
          const wave = Math.sin(this.currentTime * speed + i * 0.3);
          mesh.position.y += wave * effectiveAmplitude * 0.1;
        });
        break;

      case 'vortex':
        // Spiral motion
        layer.group.children.forEach((mesh, i) => {
          const angle = this.currentTime * speed * 2 + i * 0.5;
          const radius = effectiveAmplitude;
          mesh.rotation.y += bass * 0.05;
          mesh.position.x += Math.cos(angle) * radius * 0.05;
          mesh.position.z += Math.sin(angle) * radius * 0.05;
        });
        break;

      default:
        if (window.SONOITE_DEBUG) {
          console.warn(`[JourneyController] Unknown choreography type: ${choreographyType}`);
        }
    }
  }

  /**
   * MP-GRID-03: Row pulse choreography for grids
   * Animates each row sequentially with emissive pulse
   */
  actionRowPulse(layer, intensity, duration, audioData) {
    if (!layer.rows || !layer.cols) {
      if (window.SONOITE_DEBUG) {
        console.warn('[MP-GRID-03] row_pulse requires grid layer with rows/cols properties');
      }
      return;
    }

    const rows = layer.rows;
    const cols = layer.cols;
    const pulseDelay = duration / rows; // Delay between each row
    const pulseDuration = pulseDelay * 1.5; // Duration of each pulse (overlaps slightly)

    // Animate each row
    for (let row = 0; row < rows; row++) {
      const rowDelay = row * pulseDelay;
      const startTime = this.currentTime + rowDelay;

      const animateRow = () => {
        const elapsed = this.currentTime - startTime;
        if (elapsed < 0) {
          this.registerRAF(animateRow);
          return;
        }
        if (elapsed > pulseDuration) return;

        const progress = elapsed / pulseDuration;
        const pulse = Math.sin(progress * Math.PI); // Sin curve for smooth pulse
        const currentIntensity = intensity * pulse;

        // Apply to all instances in this row
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          if (layer.instancedMesh && idx < layer.count) {
            // For InstancedMesh, we can't easily access individual materials
            // Instead, modulate the shader uniform for all instances
            // This is a simplification - ideally we'd use per-instance attributes
            if (layer.material?.uniforms?.uAudioShimmer) {
              layer.material.uniforms.uAudioShimmer.value = currentIntensity;
            } else if (layer.material?.emissiveIntensity !== undefined) {
              layer.material.emissiveIntensity = 0.15 + currentIntensity * 0.2;
            }
          }
        }

        if (elapsed < pulseDuration) {
          this.registerRAF(animateRow);
        }
      };

      animateRow();
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MP-GRID-03] Row pulse: ${rows} rows, duration ${duration}s, intensity ${intensity}`);
    }
  }

  /**
   * MP-GRID-03: Column pulse choreography for grids
   * Animates each column sequentially with emissive pulse
   */
  actionColumnPulse(layer, intensity, duration, audioData) {
    if (!layer.rows || !layer.cols) {
      if (window.SONOITE_DEBUG) {
        console.warn('[MP-GRID-03] column_pulse requires grid layer with rows/cols properties');
      }
      return;
    }

    const rows = layer.rows;
    const cols = layer.cols;
    const pulseDelay = duration / cols; // Delay between each column
    const pulseDuration = pulseDelay * 1.5; // Duration of each pulse

    // Animate each column
    for (let col = 0; col < cols; col++) {
      const colDelay = col * pulseDelay;
      const startTime = this.currentTime + colDelay;

      const animateCol = () => {
        const elapsed = this.currentTime - startTime;
        if (elapsed < 0) {
          this.registerRAF(animateCol);
          return;
        }
        if (elapsed > pulseDuration) return;

        const progress = elapsed / pulseDuration;
        const pulse = Math.sin(progress * Math.PI);
        const currentIntensity = intensity * pulse;

        // Apply to all instances in this column
        for (let row = 0; row < rows; row++) {
          const idx = row * cols + col;
          if (layer.instancedMesh && idx < layer.count) {
            if (layer.material?.uniforms?.uAudioShimmer) {
              layer.material.uniforms.uAudioShimmer.value = currentIntensity;
            } else if (layer.material?.emissiveIntensity !== undefined) {
              layer.material.emissiveIntensity = 0.15 + currentIntensity * 0.2;
            }
          }
        }

        if (elapsed < pulseDuration) {
          this.registerRAF(animateCol);
        }
      };

      animateCol();
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MP-GRID-03] Column pulse: ${cols} columns, duration ${duration}s, intensity ${intensity}`);
    }
  }

  /**
   * MP-GRID-03: Diagonal pulse choreography for grids
   * Animates along diagonal lines from top-left to bottom-right
   */
  actionDiagonalPulse(layer, intensity, duration, audioData) {
    if (!layer.rows || !layer.cols) {
      if (window.SONOITE_DEBUG) {
        console.warn('[MP-GRID-03] diagonal requires grid layer with rows/cols properties');
      }
      return;
    }

    const rows = layer.rows;
    const cols = layer.cols;
    const maxDiagonal = rows + cols - 1; // Number of diagonals
    const pulseDelay = duration / maxDiagonal;
    const pulseDuration = pulseDelay * 1.5;

    // Animate each diagonal
    for (let diag = 0; diag < maxDiagonal; diag++) {
      const diagDelay = diag * pulseDelay;
      const startTime = this.currentTime + diagDelay;

      const animateDiag = () => {
        const elapsed = this.currentTime - startTime;
        if (elapsed < 0) {
          this.registerRAF(animateDiag);
          return;
        }
        if (elapsed > pulseDuration) return;

        const progress = elapsed / pulseDuration;
        const pulse = Math.sin(progress * Math.PI);
        const currentIntensity = intensity * pulse;

        // Apply to all instances in this diagonal
        for (let row = 0; row < rows; row++) {
          const col = diag - row;
          if (col >= 0 && col < cols) {
            const idx = row * cols + col;
            if (layer.instancedMesh && idx < layer.count) {
              if (layer.material?.uniforms?.uAudioShimmer) {
                layer.material.uniforms.uAudioShimmer.value = currentIntensity;
              } else if (layer.material?.emissiveIntensity !== undefined) {
                layer.material.emissiveIntensity = 0.15 + currentIntensity * 0.2;
              }
            }
          }
        }

        if (elapsed < pulseDuration) {
          this.registerRAF(animateDiag);
        }
      };

      animateDiag();
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MP-GRID-03] Diagonal pulse: ${maxDiagonal} diagonals, duration ${duration}s, intensity ${intensity}`);
    }
  }

  // ============================================
  // OPUS3: HYBRID JOURNEY SYSTEM METHODS
  // ============================================

  /**
   * OPUS3: Link audio feature to shader uniform
   * Creates continuous audio-reactive binding that persists for the track
   * P2-T5-2c: Added combine modes and upsert support
   *
   * @param {Object} action - {target, params: {uniform, feature, min, max, smoothing, combine, baseValue}}
   *        combine: 'replace' (default) | 'add' | 'multiply' | 'modulate'
   *        baseValue: For 'modulate' mode, the authored base value to modulate around
   */
  actionLinkAudio(action) {
    const { target, params } = action;
    const layer = this.getLayer(target);
    const feature = params?.feature || params?.band;

    if (!params?.uniform || typeof params.uniform !== 'string') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[OPUS3] link_audio: Missing uniform for ${target}`);
      }
      return;
    }

    if (!feature || typeof feature !== 'string') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[OPUS3] link_audio: Missing feature/band for ${target}.${params.uniform}`);
      }
      return;
    }

    if (!layer) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[OPUS3] link_audio: Layer not found: ${target}`);
      }
      return;
    }

    // P2-T5-2c: Check if link already exists (upsert support)
    const existingLinkIndex = this.audioLinks.findIndex(l =>
      l.target === target &&
      l.uniform === params.uniform &&
      l.feature === feature
    );

    if (existingLinkIndex !== -1) {
      // P2-T5-2c: Upsert - update existing link params instead of just deduping
      const existingLink = this.audioLinks[existingLinkIndex];
      existingLink.min = params.min ?? existingLink.min;
      existingLink.max = params.max ?? existingLink.max;
      if (params.smoothing !== undefined) {
        // smoothing=0 is valid and means "no smoothing / immediate response".
        existingLink.smoothing = Math.max(0, Math.min(1, params.smoothing));
      }
      existingLink.noiseGate = params.noiseGate ?? existingLink.noiseGate;
      existingLink.invert = params.invert ?? existingLink.invert;
      existingLink.combine = params.combine ?? existingLink.combine ?? 'replace';
      existingLink.baseValue = params.baseValue ?? existingLink.baseValue;
      // 01-05: Update pipeline on upsert if provided (reset state for clean transition)
      if (params.pipeline || params.preset) {
        existingLink.pipeline = createPipeline(
          typeof params.preset === 'string' && params.pipeline
            ? { preset: params.preset, ...params.pipeline }
            : (params.preset || params.pipeline)
        );
        existingLink.pipeline.reset();
      }
      if (window.SONOITE_DEBUG) {
        console.log(`[P2-T5-2c] Audio link updated: ${existingLink.uniform} on ${target}`);
      }
      return;
    }

    // Create audio link binding
    const link = {
      layer: layer,
      target: target,
      uniform: params.uniform,           // e.g., 'uScale', 'uEmissiveIntensity'
      feature, // e.g., 'bass', 'loudness', 'treble' (band is alias)
      min: params.min ?? 0.0,
      max: params.max ?? 1.0,
      // smoothing=0 is valid (instant response); clamp to [0,1].
      smoothing: params.smoothing !== undefined ? Math.max(0, Math.min(1, params.smoothing)) : 0.15,
      noiseGate: params.noiseGate,
      invert: params.invert || false,    // EXPERT-PLAN: Inverse reactivity (low audio = high value)
      combine: params.combine || 'replace', // P2-T5-2c: 'replace' | 'add' | 'multiply' | 'modulate'
      baseValue: params.baseValue,       // P2-T5-2c: For 'modulate' mode
      smoothedValue: undefined,          // Will be initialized on first process
      cachedMaterials: [],               // P1-PERF-FIX: Cache material refs to avoid traverse() every frame
      // 01-05: Optional signal pipeline for advanced shaping
      // Supports: preset only, pipeline only, or preset + pipeline overrides
      pipeline: (params.pipeline || params.preset)
        ? createPipeline(
            typeof params.preset === 'string' && params.pipeline
              ? { preset: params.preset, ...params.pipeline }
              : (params.preset || params.pipeline)
          )
        : null
    };

    // P1-PERF-FIX: Cache material references at link creation time
    // This avoids expensive group.traverse() on every animation frame
    if (layer.group) {
      const seenMaterials = new Set();
      layer.group.traverse(obj => {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          const materialKey = mat?.uuid;
          if (!mat || (materialKey && seenMaterials.has(materialKey))) continue;
          // Check if material has the target uniform or property
          if (mat.uniforms?.[params.uniform] || Object.prototype.hasOwnProperty.call(mat, params.uniform)) {
            if (materialKey) {
              seenMaterials.add(materialKey);
            }
            link.cachedMaterials.push(mat);
          }
        }
      });
    } else if (layer.material) {
      // Direct layer material fallback
      if (layer.material.uniforms?.[params.uniform] || Object.prototype.hasOwnProperty.call(layer.material, params.uniform)) {
        link.cachedMaterials.push(layer.material);
      }
    }

    if (link.combine === 'modulate' && !Number.isFinite(link.baseValue)) {
      const seededBase = this._readLinkedCurrentValue(link);
      if (Number.isFinite(seededBase)) {
        link.baseValue = seededBase;
      }
    }

    this.audioLinks.push(link);

    if (window.SONOITE_DEBUG) {
      console.log(`[OPUS3] Audio link created: ${link.feature} → ${link.uniform} on ${target} (${link.min}-${link.max}, combine=${link.combine})`);
    }
  }

  _readLinkedCurrentValue(link) {
    if (!link?.uniform) return undefined;
    if (Array.isArray(link.cachedMaterials) && link.cachedMaterials.length > 0) {
      for (const mat of link.cachedMaterials) {
        if (!mat) continue;
        const uniformValue = mat.uniforms?.[link.uniform]?.value;
        if (Number.isFinite(uniformValue)) return uniformValue;
        const propValue = mat[link.uniform];
        if (typeof propValue === 'number' && Number.isFinite(propValue)) return propValue;
      }
    }

    const layer = link.layer;
    if (layer?.material?.uniforms?.[link.uniform] && Number.isFinite(layer.material.uniforms[link.uniform].value)) {
      return layer.material.uniforms[link.uniform].value;
    }
    const directValue = layer?.material?.[link.uniform];
    if (typeof directValue === 'number' && Number.isFinite(directValue)) {
      return directValue;
    }
    return undefined;
  }

  /**
   * P2-T5-2c: Remove audio link by target + uniform
   * Allows authored moments to take full control of a uniform
   *
   * @param {Object} action - {target, params: {uniform, feature}}
   *        If only target specified, removes ALL links for that target
   *        If uniform specified, removes only that specific link
   */
  actionUnlinkAudio(action) {
    const { target, params } = action;

    if (!params?.uniform) {
      // Remove ALL links for this target
      const countBefore = this.audioLinks.length;
      this.audioLinks = this.audioLinks.filter(l => l.target !== target);
      const countRemoved = countBefore - this.audioLinks.length;
      if (window.SONOITE_DEBUG && countRemoved > 0) {
        console.log(`[P2-T5-2c] Removed ${countRemoved} audio links for ${target}`);
      }
    } else {
      // Remove specific link
      const index = this.audioLinks.findIndex(l =>
        l.target === target &&
        l.uniform === params.uniform &&
        (!params.feature || l.feature === params.feature)
      );

      if (index !== -1) {
        this.audioLinks.splice(index, 1);
        if (window.SONOITE_DEBUG) {
          console.log(`[P2-T5-2c] Removed audio link: ${params.uniform} on ${target}`);
        }
      } else if (window.SONOITE_DEBUG) {
        console.warn(`[P2-T5-2c] unlink_audio miss: ${params.uniform} on ${target}`);
      }
    }
  }

  /**
   * P1-PERF-FIX: Invalidate material cache for a layer
   * Call this when materials are dynamically added/removed from a layer.
   * Will force re-traverse on next processAudioLinks call.
   *
   * @param {string} target - Layer target name (e.g., 'star_dust', 'void_sphere')
   */
  invalidateMaterialCache(target) {
    if (!target) {
      // Invalidate ALL links
      this.audioLinks.forEach(link => {
        link.cachedMaterials = [];
      });
      Object.values(this.layers || {}).forEach((group) => {
        if (!group || typeof group !== 'object') return;
        Object.values(group).forEach((layer) => {
          if (layer && typeof layer === 'object') {
            layer._opacityTargets = null;
          }
        });
      });
      if (window.SONOITE_DEBUG) {
        console.log('[P1-PERF] Material cache invalidated for ALL audio links');
      }
      return;
    }

    // Invalidate links for specific target
    let invalidatedCount = 0;
    this.audioLinks.forEach(link => {
      if (link.target === target) {
        link.cachedMaterials = [];
        invalidatedCount++;
      }
    });
    const layer = this.getLayer(target);
    if (layer) {
      layer._opacityTargets = null;
    }

    if (window.SONOITE_DEBUG && invalidatedCount > 0) {
      console.log(`[P1-PERF] Material cache invalidated for ${target} (${invalidatedCount} links)`);
    }
  }

  /**
   * Resolve audio feature aliases used by timeline links/conditions.
   * Keeps link_audio schema backward-compatible while supporting practical features.
   *
   * @param {Object} audioData
   * @param {string} feature
   * @returns {number}
   */
  _getAudioFeatureValue(audioData, feature) {
    if (!audioData || !feature) return 0;

    switch (feature) {
      case 'kick':
        return Number.isFinite(audioData?.beat?.kickIntensity) ? audioData.beat.kickIntensity : 0;
      case 'transient':
        return Number.isFinite(audioData?.beat?.transientIntensity) ? audioData.beat.transientIntensity : 0;
      case 'centroid_norm': {
        const centroid = Number.isFinite(audioData.centroid) ? audioData.centroid : 0;
        return THREE.MathUtils.clamp(centroid / 4000, 0, 1);
      }
      default:
        return Number.isFinite(audioData[feature]) ? audioData[feature] : 0;
    }
  }

  /**
   * OPUS3: Process all audio links every frame
   * Maps audio features to shader uniforms with EMA smoothing and range remapping
   * P2-T5-2c: Added combine modes (replace, add, multiply, modulate)
   * Called from update() on every animation frame
   *
   * @param {Object} audioData - {bass, mid, treble, loudness, centroid}
   */
  processAudioLinks(audioData) {
    if (!this.audioLinks || this.audioLinks.length === 0) return;
    if (!audioData) return;

    // 01-05: Calculate deltaTime for envelope processing
    const now = performance.now();
    const deltaTime = this._lastAudioLinkTime ? (now - this._lastAudioLinkTime) / 1000 : 0.016;
    this._lastAudioLinkTime = now;

    this.audioLinks.forEach(link => {
      if (!link.layer) return;
      // P6-DIAMOND: Allow actions to temporarily "own" a parameter without being overwritten
      if (Number.isFinite(link.suspendedUntil) && this.currentTime < link.suspendedUntil) {
        return;
      }

      // Get audio feature value (0-1 normalized)
      let rawValue = this._getAudioFeatureValue(audioData, link.feature);

      // NOISE-GATE: Suppress noise floor before any processing.
      // Prevents phantom flicker during silence (0.02-0.08 floor).
      const noiseGate = link.noiseGate ?? NOISE_GATES[link.feature] ?? 0;
      if (rawValue < noiseGate) {
        rawValue = 0;
      }

      // 01-05: Pipeline stages 1-3 (subsample, curve, gate) BEFORE existing processing
      if (link.pipeline) {
        rawValue = link.pipeline.processPreSmooth(rawValue);
      }

      // Apply EMA smoothing to prevent jitter.
      // smoothing=0 is explicit pass-through (no smoothing).
      if (link.smoothedValue === undefined) {
        link.smoothedValue = rawValue;
      } else if (link.smoothing <= 0) {
        link.smoothedValue = rawValue;
      } else {
        link.smoothedValue += (rawValue - link.smoothedValue) * link.smoothing;
      }

      // EXPERT-PLAN: Apply inversion if requested (low audio = high value)
      let audioValue = link.smoothedValue;
      if (link.invert) {
        audioValue = 1.0 - audioValue;
      }

      // Remap from [0,1] to [min,max]
      let mappedValue = link.min + audioValue * (link.max - link.min);

      // 01-05: Pipeline stages 5-6 (envelope, modulateBy) AFTER existing processing
      if (link.pipeline) {
        mappedValue = link.pipeline.processPostSmooth(mappedValue, audioData, deltaTime);
      }

      // P2-T5-2c: Compute new value based on combine mode.
      // P6-DIAMOND: Supports both shader uniforms and numeric material properties.
      const computeNewValue = (currentValue) => {
        switch (link.combine) {
          case 'add':
            return currentValue + mappedValue;
          case 'multiply':
            return currentValue * mappedValue;
          case 'modulate': {
            // Modulate around a base value: base * (1 + audio_deviation)
            if (!Number.isFinite(link.baseValue) && Number.isFinite(currentValue)) {
              link.baseValue = currentValue;
            }
            const base = Number.isFinite(link.baseValue) ? link.baseValue : currentValue;
            const deviation = (audioValue - 0.5) * 2; // -1 to 1
            const modulated = base * (1 + deviation * 0.3); // ±30% modulation
            if (Number.isFinite(link.min) && Number.isFinite(link.max)) {
              const low = Math.min(link.min, link.max);
              const high = Math.max(link.min, link.max);
              return THREE.MathUtils.clamp(modulated, low, high);
            }
            return modulated;
          }
          case 'replace':
          default:
            return mappedValue;
        }
      };

      const clampMaterialProp = (prop, value) => {
        if (!Number.isFinite(value)) return value;
        switch (prop) {
          case 'opacity':
          case 'roughness':
          case 'metalness':
          case 'transmission':
          case 'clearcoat':
          case 'clearcoatRoughness':
          case 'reflectivity':
            return THREE.MathUtils.clamp(value, 0, 1);
          case 'ior':
            return THREE.MathUtils.clamp(value, 1.0, 2.333);
          case 'thickness':
          case 'envMapIntensity':
          case 'emissiveIntensity':
            return Math.max(0, value);
          default:
            return value;
        }
      };

      const applyToUniform = (uniform) => {
        const currentValue = uniform?.value;
        if (!Number.isFinite(currentValue)) return;
        uniform.value = computeNewValue(currentValue);
      };

      const applyToMaterialProp = (material, prop) => {
        const currentValue = material?.[prop];
        if (typeof currentValue !== 'number') return;
        const nextValue = clampMaterialProp(prop, computeNewValue(currentValue));
        material[prop] = nextValue;
        if (prop === 'opacity') {
          material.transparent = nextValue < 0.999;
        }
      };

      // P1-PERF-FIX: Use cached materials instead of traverse() every frame
      // Falls back to traverse if cache is empty (legacy links or invalidated cache)
      if (link.cachedMaterials && link.cachedMaterials.length > 0) {
        // Fast path: iterate over cached materials
        for (const mat of link.cachedMaterials) {
          if (!mat) continue;
          if (mat.uniforms?.[link.uniform]) {
            applyToUniform(mat.uniforms[link.uniform]);
          } else if (Object.prototype.hasOwnProperty.call(mat, link.uniform)) {
            applyToMaterialProp(mat, link.uniform);
          }
        }
      } else if (link.layer.group) {
        // Fallback: traverse (for legacy links without cache)
        const rebuilt = [];
        const seenMaterials = new Set();
        link.layer.group.traverse(obj => {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) {
            const materialKey = mat?.uuid;
            if (!mat || (materialKey && seenMaterials.has(materialKey))) continue;
            let matched = false;
            if (mat.uniforms?.[link.uniform]) {
              applyToUniform(mat.uniforms[link.uniform]);
              matched = true;
            } else if (Object.prototype.hasOwnProperty.call(mat, link.uniform)) {
              applyToMaterialProp(mat, link.uniform);
              matched = true;
            }

            if (matched) {
              if (materialKey) {
                seenMaterials.add(materialKey);
              }
              rebuilt.push(mat);
            }
          }
        });
        if (rebuilt.length > 0) {
          link.cachedMaterials = rebuilt;
        }
      } else if (link.layer.material?.uniforms?.[link.uniform]) {
        applyToUniform(link.layer.material.uniforms[link.uniform]);
      } else if (link.layer.material && Object.prototype.hasOwnProperty.call(link.layer.material, link.uniform)) {
        applyToMaterialProp(link.layer.material, link.uniform);
      }
    });
  }

  /**
   * OPUS3: Check if trigger's audio condition is met
   * Used to gate time-based triggers on actual audio peaks
   * P2-FIX: Added `below: true` support for silence/quiet detection
   *
   * @param {Object} condition - {feature: 'bass', threshold: 0.7, below: false}
   * @param {Object} audioData - Current audio features
   * @returns {boolean} True if condition is met (or no condition specified)
   */
  checkCondition(condition, audioData) {
    if (!condition || !condition.feature) return true;
    if (!audioData) return false;

    const value = this._getAudioFeatureValue(audioData, condition.feature);
    const threshold = condition.threshold ?? 0.5;

    // P2-FIX: Support `below: true` for silence/quiet moment detection
    if (condition.below === true) {
      return value < threshold;
    }

    return value >= threshold;
  }

  /**
   * OPUS3: Post-processing glitch effect
   * Digital decay with chromatic aberration spike + grain spike
   * P2-T5-BONUS: Now accepts params.chromatic/params.grain OR params.intensity
   * P2-T5-2b: Fixed to use uIntensity (not uOffset) and enable the pass
   */
  actionPostGlitch(target, params) {
    const postfx = window.SonoiteExperience?.postProcessing;
    if (!postfx) return;
    const isTrack5 = window.SonoiteExperience?.currentTrackIndex === 4;
    const track5GrainCap = 0.2;

    // P2-T5-BONUS: Support both JSON formats
    // - Legacy: params.intensity (single value scaled to chroma/grain)
    // - New: params.chromatic + params.grain (direct values)
    const hasDirectParams = params.chromatic !== undefined || params.grain !== undefined;
    const intensity = params.intensity ?? 0.5;
    const chromaTarget = hasDirectParams ? (params.chromatic ?? 0.01) : intensity * 0.01;
    const grainTarget = hasDirectParams ? (params.grain ?? 0.2) : intensity * 0.3;
    const durationSec = typeof params.duration === 'string' ? parseFloat(params.duration) : params.duration;
    const duration = Number.isFinite(durationSec) ? durationSec : 0.8;
    const durationMs = Math.max(1, duration * 1000);

    const triggerTime = Number.isFinite(this._activeTriggerTime) ? this._activeTriggerTime : this.currentTime;
    const nowTime = Number.isFinite(this.currentTime) ? this.currentTime : triggerTime;
    const seekElapsedMs = Number.isFinite(triggerTime) && Number.isFinite(nowTime)
      ? Math.max(0, (nowTime - triggerTime) * 1000)
      : 0;

    // P2-T5-2b: Use uIntensity (correct uniform), not uOffset (doesn't exist)
    const baseChroma = postfx.chromaticAberrationPass?.uniforms?.uIntensity?.value || 0;
    const baseGrain = postfx.filmGrainPass?.uniforms?.intensity?.value || 0;

    if (seekElapsedMs >= durationMs) {
      if (postfx.setChromaticAberration) {
        postfx.setChromaticAberration(baseChroma);
      } else if (postfx.chromaticAberrationPass?.uniforms?.uIntensity) {
        postfx.chromaticAberrationPass.uniforms.uIntensity.value = baseChroma;
        postfx.chromaticAberrationPass.enabled = baseChroma > 0.001;
      }

      if (postfx.filmGrainPass?.uniforms?.intensity) {
        postfx.filmGrainPass.uniforms.intensity.value = baseGrain;
        postfx.filmGrainPass.enabled = baseGrain > 0.001;
      }

      return;
    }

    const startPerf = performance.now() - seekElapsedMs;

    const animate = () => {
      const elapsed = performance.now() - startPerf;
      const progress = Math.min(elapsed / durationMs, 1.0);

      // Sin curve: spike up then decay back to baseline
      const curve = Math.sin(progress * Math.PI);
      const chromaValue = baseChroma + chromaTarget * curve;
      const grainValue = baseGrain + grainTarget * curve;

      // P2-T5-2b: Use uIntensity for chromatic aberration
      if (postfx.setChromaticAberration) {
        postfx.setChromaticAberration(chromaValue);
      } else if (postfx.chromaticAberrationPass?.uniforms?.uIntensity) {
        postfx.chromaticAberrationPass.uniforms.uIntensity.value = chromaValue;
        postfx.chromaticAberrationPass.enabled = chromaValue > 0.001;
      }

      if (postfx.filmGrainPass?.uniforms?.intensity) {
        const safeGrain = isTrack5
          ? Math.min(track5GrainCap, Math.max(0, grainValue))
          : Math.max(0, grainValue);
        postfx.filmGrainPass.uniforms.intensity.value = safeGrain;
        postfx.filmGrainPass.enabled = safeGrain > 0.001;
      }

      if (progress < 1.0) {
        this.registerRAF(animate);
      } else {
        // Restore baseline at end + enforce perf gates.
        if (postfx.setChromaticAberration) {
          postfx.setChromaticAberration(baseChroma);
        } else if (postfx.chromaticAberrationPass?.uniforms?.uIntensity) {
          postfx.chromaticAberrationPass.uniforms.uIntensity.value = baseChroma;
          postfx.chromaticAberrationPass.enabled = baseChroma > 0.001;
        }

        if (postfx.filmGrainPass?.uniforms?.intensity) {
          const restoredGrain = isTrack5 ? Math.min(track5GrainCap, Math.max(0, baseGrain)) : baseGrain;
          postfx.filmGrainPass.uniforms.intensity.value = restoredGrain;
          postfx.filmGrainPass.enabled = restoredGrain > 0.001;
        }
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[P2-T5-2b] Post glitch: chromatic=${chromaTarget.toFixed(3)}, grain=${grainTarget.toFixed(2)}, duration=${duration}s`);
    }
  }

  /**
   * TRACK5-VOID: Phase action handler
   * Sets phase on director or individual layers
   */
  actionPhase(target, params) {
    const phase = params?.phase;
    if (!phase) {
      console.warn('[JourneyController] actionPhase: missing phase parameter');
      return;
    }

    // Get Track5VoidDirector if available
    const director = window.SonoiteExperience?.track5Director;
    if (director?.forcePhaseChange) {
      director.forcePhaseChange(phase);
    }

    // Fallback: set phase on individual layers
    const layers = window.SonoiteExperience?.activeVisualizers;
    if (layers instanceof Map) {
      for (const [, layer] of layers) {
        if (layer?.setPhase) layer.setPhase(phase);
      }
    } else if (layers && typeof layers === 'object') {
      Object.values(layers).forEach((layer) => {
        if (layer?.setPhase) layer.setPhase(phase);
      });
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Phase action: ${phase}`);
    }
  }

  // ============================================
  // OPUS6: CINEMATIC CAMERA & VISUAL METHODS
  // ============================================

  /**
   * OPUS6: Camera shake action
   * FIXED: Calls CameraManager.triggerShake() instead of setting dead shakeAmount property
   */
  actionCameraShake(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for shake');
      }
      return;
    }

    const intensity = params.intensity ?? 0.2;
    const duration = params.duration ?? 0.4;

    // OPUS6-FIX: Use triggerShake if available (new system)
    if (typeof cameraLayer.triggerShake === 'function') {
      cameraLayer.triggerShake(intensity, duration);
    } else if (cameraLayer.shakeAmount !== undefined) {
      // Legacy fallback
      cameraLayer.shakeAmount = intensity;
      // BUG-FIX-03: duration is in seconds, multiply by 1000 for ms
      setTimeout(() => {
        if (cameraLayer.shakeAmount) cameraLayer.shakeAmount *= 0.5;
      }, duration * 1000);
    } else if (window.SONOITE_DEBUG) {
      console.warn('[OPUS6] Neither triggerShake() nor shakeAmount available on camera layer');
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[OPUS6] Camera shake: intensity=${intensity}, duration=${duration}s`);
    }
  }

  /**
   * Camera mode switching action
   * Changes camera behavior mode (cinematic_dolly, handheld_panic, contemplative, etc.)
   */
  actionCameraMode(params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer || typeof cameraLayer.setMode !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] CameraManager.setMode not available');
      }
      return;
    }

    const mode = params.mode || 'default';
    cameraLayer.setMode(mode);

    if (window.SONOITE_DEBUG) {
      console.log(`[JourneyController] Camera mode set: ${mode}`);
    }
  }

  /**
   * 01-02: Camera behavior switching action
   * Changes camera movement pattern (orbit, witness, architect, follow, stationary)
   * @param {Object} params - { behavior: 'witness', radius?: 20, height?: 10, speed?: 0.01 }
   */
  actionCameraBehavior(params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer || typeof cameraLayer.setBehavior !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn('[01-02] CameraManager.setBehavior not available');
      }
      return;
    }

    const behavior = params.behavior || 'orbit';

    // Fix #3: Validate behavior is a known value
    const validBehaviors = ['orbit', 'witness', 'architect', 'follow', 'stationary'];
    if (!validBehaviors.includes(behavior)) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[01-02] Unknown camera behavior: "${behavior}". Valid: ${validBehaviors.join(', ')}`);
      }
      // Fall through anyway - setBehavior may handle unknown values gracefully
    }

    // Fix #1: Validate target for "follow" behavior to prevent crash
    if (behavior === 'follow' && params.target) {
      const target = params.target;
      const isValidTarget = (
        (target && typeof target.isObject3D === 'boolean') || // THREE.Object3D
        (target && typeof target.isVector3 === 'boolean') ||  // THREE.Vector3
        (Array.isArray(target) && target.length === 3)        // [x, y, z] array
      );
      if (!isValidTarget) {
        if (window.SONOITE_DEBUG) {
          console.warn('[01-02] camera_behavior "follow" requires valid target (Object3D, Vector3, or [x,y,z])');
        }
        return; // Abort to prevent crash
      }
    }

    const behaviorParams = {
      radius: params.radius,
      height: params.height,
      speed: params.speed,
      position: params.position,
      target: params.target,
      damping: params.damping
    };

    cameraLayer.setBehavior(behavior, behaviorParams);

    if (window.SONOITE_DEBUG) {
      console.log(`[01-02] Camera behavior set: ${behavior}`, behaviorParams);
    }
  }

  /**
   * 01-02: Camera personality action
   * Applies track-specific camera preset (complete preset including mode, behavior, and params)
   * @param {Object} params - { slug: 'nao-querer-nada' } - uses track slug, NOT personality name
   */
  actionCameraPersonality(params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer || typeof cameraLayer.setPersonality !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn('[01-02] CameraManager.setPersonality not available');
      }
      return;
    }

    const slug = params.slug;
    if (!slug) {
      if (window.SONOITE_DEBUG) {
        console.warn('[01-02] camera_personality requires params.slug (track slug)');
      }
      return;
    }

    cameraLayer.setPersonality(slug);

    if (window.SONOITE_DEBUG) {
      console.log(`[01-02] Camera personality set: ${slug}`);
    }
  }

  /**
   * P1-CLIMAX: FOV animation action
   * Animates camera field of view for dramatic zoom effects
   * @param {Object} params - { to: targetFOV, duration: seconds, easing: 'easeOutCubic' }
   */
  actionFOV(params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer || typeof cameraLayer.animateFOV !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn('[P1-CLIMAX] CameraManager.animateFOV not available');
      }
      return;
    }

    const targetFOV = params.to || params.fov || 75;
    const duration = params.duration || 1.0;
    const easing = params.easing || 'linear';

    cameraLayer.animateFOV(targetFOV, duration, easing);

    if (window.SONOITE_DEBUG) {
      console.log(`[P1-CLIMAX] FOV animation: ${targetFOV}° over ${duration}s (${easing})`);
    }
  }

  /**
   * OPUS6: 3D position drift action
   * Smooth position movement using easing
   * Supports both visual layers and camera
   */
  actionDrift(target, params) {
    // Special handling for camera target
    if (target === 'camera') {
      const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
      const camera = cameraLayer?.camera;
      if (!camera) {
        if (window.SONOITE_DEBUG) {
          console.warn('[OPUS6] Drift: Camera not available');
        }
        return;
      }

      // Deterministic ownership rule: spline controls camera transform until explicitly taken over.
      const takeover = params.takeover === true || params.force === true;
      if (cameraLayer?.splineActive && !takeover) {
        if (window.SONOITE_DEBUG) {
          console.log('[JourneyController] camera drift ignored (active spline owns transform). Use takeover:true to interrupt.');
        }
        return;
      }
      if (cameraLayer?.splineActive && takeover && typeof cameraLayer.endSplinePath === 'function') {
        cameraLayer.endSplinePath();
      }

      this._driftCamera(camera, params);
      return;
    }

    const layer = this.getLayer(target);
    if (!layer || !layer.group) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[OPUS6] Drift: Layer not found: ${target}`);
      }
      return;
    }

    const to = params.to || { x: 0, y: 0, z: 0 };
    const duration = params.duration ?? 3.0;
    const easingName = params.easing || 'easeOut';

    const startPos = {
      x: layer.group.position.x,
      y: layer.group.position.y,
      z: layer.group.position.z
    };

    const startTime = this.currentTime;

    const easingFunctions = {
      linear: t => t,
      easeIn: t => t * t,
      easeOut: t => 1 - Math.pow(1 - t, 3),
      easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    };

    const easeFn = easingFunctions[easingName] || easingFunctions.easeOut;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = easeFn(progress);

      layer.group.position.x = startPos.x + (to.x - startPos.x) * eased;
      layer.group.position.y = startPos.y + (to.y - startPos.y) * eased;
      layer.group.position.z = startPos.z + (to.z - startPos.z) * eased;

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[OPUS6] Drift: ${target} to [${to.x}, ${to.y}, ${to.z}] over ${duration}s`);
    }
  }

  /**
   * Helper: Drift camera position smoothly
   */
  _driftCamera(camera, params) {
    const to = params.to || { x: 0, y: 0, z: 0 };
    const duration = params.duration ?? 3.0;
    const easingName = params.easing || 'easeOut';

    const startPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };

    const startTime = this.currentTime;

    const easingFunctions = {
      linear: t => t,
      easeIn: t => t * t,
      easeOut: t => 1 - Math.pow(1 - t, 3),
      easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    };

    const easeFn = easingFunctions[easingName] || easingFunctions.easeOut;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = easeFn(progress);

      camera.position.x = startPos.x + (to.x - startPos.x) * eased;
      camera.position.y = startPos.y + (to.y - startPos.y) * eased;
      camera.position.z = startPos.z + (to.z - startPos.z) * eased;

      if (progress < 1.0) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[OPUS6] Camera drift to [${to.x}, ${to.y}, ${to.z}] over ${duration}s`);
    }
  }

  /**
   * OPUS6: Narrative camera spline path
   * Smooth cinematic camera movement through waypoints using CatmullRomCurve3
   */
  actionCameraSpline(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for spline');
      }
      return;
    }

    if (typeof cameraLayer.startSplinePath !== 'function') {
      if (window.SONOITE_DEBUG) {
      console.warn('[OPUS6] Camera spline system (startSplinePath) not available');
      }
      return;
    }

    let splineConfig = null;

    // Option A: named Track 5 spline
    if (params.spline && TRACK5_SPLINES?.[params.spline]) {
      splineConfig = TRACK5_SPLINES[params.spline];
    }

    const waypoints = (params.waypoints && params.waypoints.length)
      ? params.waypoints
      : splineConfig?.waypoints || [];

    if (waypoints.length < 2) {
      if (window.SONOITE_DEBUG) {
        console.warn('[OPUS6] Camera spline: no waypoints provided');
      }
      return;
    }

    const duration = params.duration ?? splineConfig?.duration ?? 10.0;
    const loop = params.loop ?? false;
    const easing = params.easing || 'easeInOut';
    const lookAt = params.lookAt || splineConfig?.lookAt || null;
    const lookAhead = lookAt ? false : (params.lookAhead ?? true);
    const fovKeyframes = params.fovKeyframes || splineConfig?.fovKeyframes || null;
    const startSongTime = Number.isFinite(params.startSongTime) ? params.startSongTime : null;

    cameraLayer.startSplinePath({
      waypoints,
      duration,
      closed: loop,
      easing,
      lookAhead,
      lookAt,
      fovKeyframes,
      startSongTime
    });

    if (window.SONOITE_DEBUG) {
      const startInfo = startSongTime !== null ? ` start=${startSongTime.toFixed(2)}s` : '';
      console.log(`[OPUS6] Camera spline: ${waypoints.length} waypoints over ${duration}s, loop=${loop}.${startInfo}`);
    }
  }

  /**
   * CINEMATIC-FIX: Camera dolly (move toward/away from target)
   * Negative amount = move toward egg, Positive = move away
   * P2-T5-3: Now stops active spline to take over camera control
   */
  actionCameraDolly(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for dolly');
      }
      return;
    }

    // P2-T5-3: Stop active spline to prevent overlap
    if (cameraLayer.splineActive && typeof cameraLayer.endSplinePath === 'function') {
      if (window.SONOITE_DEBUG) {
        console.log('[P2-T5-3] Stopping active spline for dolly takeover');
      }
      cameraLayer.endSplinePath();
    }

    const amount = params.amount ?? -3.0;  // Default: move toward
    const duration = params.duration ?? 5.0;
    const easing = params.easing || 'easeInOutQuad';

    if (typeof cameraLayer.dolly === 'function') {
      cameraLayer.dolly(amount, duration, easing);
    } else {
      if (window.SONOITE_DEBUG) {
        console.warn('[CINEMATIC] Camera dolly method not available');
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CINEMATIC] Camera dolly: ${amount} over ${duration}s`);
    }
  }

  /**
   * CLIMAX-SIGNATURE: Camera vertigo (spline-safe dolly-zoom envelope).
   * Does not stop spline playback; applies a temporary offset + FOV delta.
   */
  actionCameraVertigo(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for vertigo');
      }
      return;
    }

    const point = Array.isArray(params.point) ? params.point : [0, 0, 0];
    const distance = params.distance ?? 1.6;
    const fovDelta = params.fovDelta ?? 18;
    const duration = params.duration ?? 2.6;
    const easing = params.easing || 'easeInOutSine';

    if (typeof cameraLayer.vertigo === 'function') {
      cameraLayer.vertigo(point, distance, fovDelta, duration, easing);
    } else if (window.SONOITE_DEBUG) {
      console.warn('[CLIMAX-SIGNATURE] Camera vertigo method not available');
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CLIMAX-SIGNATURE] Camera vertigo: distance=${distance}, fovDelta=${fovDelta}, duration=${duration}s`);
    }
  }

  /**
   * CINEMATIC-FIX: Camera FOV animation
   * For dramatic zoom effects (push-in = lower FOV, pull-back = higher FOV)
   * P2-T5-3: Clears spline FOV keyframes to prevent personality override
   */
  actionCameraFOV(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for FOV');
      }
      return;
    }

    // Deterministic ownership rule:
    // Spline FOV keyframes own FOV while active unless this action is allowed to take over.
    // Backward compatibility: takeover is ON by default; set takeover:false to preserve spline ownership.
    const hasSplineFovOwner = cameraLayer.splineActive &&
      Array.isArray(cameraLayer.splineFovKeyframes) &&
      cameraLayer.splineFovKeyframes.length > 0;
    const takeover = params.takeover !== false && params.takeoverSplineFov !== false;

    if (hasSplineFovOwner && !takeover) {
      if (window.SONOITE_DEBUG) {
        console.log('[JourneyController] camera_fov ignored (takeover disabled while spline owns FOV).');
      }
      return;
    }

    if (hasSplineFovOwner && takeover) {
      if (window.SONOITE_DEBUG) {
        console.log('[P2-T5-3] Clearing spline FOV keyframes for explicit FOV control');
      }
      cameraLayer.splineFovKeyframes = null;
    }

    const fov = params.fov ?? 75;
    const duration = params.duration ?? 3.0;
    const easing = params.easing || 'easeInOutQuad';

    if (typeof cameraLayer.animateFOV === 'function') {
      cameraLayer.animateFOV(fov, duration, easing);
    } else {
      if (window.SONOITE_DEBUG) {
        console.warn('[CINEMATIC] Camera animateFOV method not available');
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CINEMATIC] Camera FOV: ${fov} over ${duration}s`);
    }
  }

  /**
   * CINEMATIC-FIX: Camera orbit (rotate around target)
   * Adds subtle movement during static phases like FRACTURE
   */
  actionCameraOrbit(target, params) {
    const cameraLayer = this.layers.core?.camera || this.getLayer('camera');
    if (!cameraLayer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Camera layer not found for orbit');
      }
      return;
    }

    const angle = params.angle ?? 30;  // Degrees to rotate (legacy input)
    const duration = params.duration ?? 60.0;
    const easing = params.easing || 'linear';
    // addMicroPath expects radians in `yaw`; convert legacy `angle` degrees.
    const yaw = params.yaw ?? THREE.MathUtils.degToRad(angle);
    const pitch = params.pitch;
    const dolly = params.dolly;

    // Use addMicroPath for gentle orbit if available
    if (typeof cameraLayer.addMicroPath === 'function') {
      const microPath = { duration, easing };
      if (Number.isFinite(yaw)) microPath.yaw = yaw;
      if (Number.isFinite(pitch)) microPath.pitch = pitch;
      if (Number.isFinite(dolly)) microPath.dolly = dolly;
      cameraLayer.addMicroPath(microPath);
    } else if (typeof cameraLayer.setBehavior === 'function') {
      // Fallback: Set orbit behavior
      const speed = Number.isFinite(yaw) && duration > 0 ? Math.abs(yaw) / duration : (angle / duration);
      cameraLayer.setBehavior('orbit', { speed });
    } else {
      if (window.SONOITE_DEBUG) {
        console.warn('[CINEMATIC] Camera orbit methods not available');
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CINEMATIC] Camera orbit: ${angle}° over ${duration}s`);
    }
  }

  /**
   * CINEMATIC-FIX: Climax particle burst
   * Triggers dramatic particle explosion from egg center
   */
  actionClimaxBurst(target, params) {
    const layer = this.getLayer(target) || this.getLayer('star_dust');
    if (!layer) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] Star dust layer not found for climax burst');
      }
      return;
    }

    // Call climaxBurst if available (added by our earlier edit)
    if (typeof layer.climaxBurst === 'function') {
      layer.climaxBurst();
    } else if (typeof layer.spawnBurstFromOrigin === 'function') {
      // Fallback to spawnBurstFromOrigin with climax params
      const count = params.count ?? 400;
      const speed = params.speed ?? 8.0;
      layer.spawnBurstFromOrigin(count, { speed, duration: 2.5 });
    } else {
      if (window.SONOITE_DEBUG) {
        console.warn('[CINEMATIC] Climax burst methods not available');
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CINEMATIC] Climax burst triggered on ${target}`);
    }
  }

  /**
   * CINEMATIC-FIX: Fog target for choreographed fog changes
   * Calls setFogTarget on PostProcessingConfig for smooth fog transitions
   */
  actionFogTarget(target, params) {
    const postfx = window.SonoiteExperience?.postProcessing;
    if (!postfx) {
      if (window.SONOITE_DEBUG) {
        console.warn('[JourneyController] PostProcessing not available for fog target');
      }
      return;
    }

    const density = params.density ?? 0.15;
    const duration = params.duration ?? 5.0;

    if (typeof postfx.setFogTarget === 'function') {
      postfx.setFogTarget(density, duration);
    } else {
      if (window.SONOITE_DEBUG) {
        console.warn('[CINEMATIC] setFogTarget method not available');
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CINEMATIC] Fog target: ${density} over ${duration}s`);
    }
  }

  /**
   * P0-FIX: Action: Scene-level parameter animation
   * Handles fog color, skybox, and other scene elements not tied to visual layers
   * Uses gsap-like animation with easing
   */
  actionParam(target, params) {
    const duration = params.duration || 1.0;
    const startTime = this.currentTime;

    // Handle fog parameters
    if (target === 'fog') {
      const scene = window.SonoiteExperience?.scene;
      if (!scene?.fog) {
        if (window.SONOITE_DEBUG) {
          console.warn('[actionParam] Fog not found in scene');
        }
        return;
      }

      const fog = scene.fog;

      // Animate fog color
      if (params.color) {
        // FIX: Use module-imported THREE (not window.THREE which may be undefined)
        const targetColor = new THREE.Color(params.color);
        const startColor = {
          r: fog.color.r,
          g: fog.color.g,
          b: fog.color.b
        };

        const animateColor = () => {
          const elapsed = this.currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1.0);
          const eased = this.easeInOutQuad(progress);

          fog.color.r = startColor.r + (targetColor.r - startColor.r) * eased;
          fog.color.g = startColor.g + (targetColor.g - startColor.g) * eased;
          fog.color.b = startColor.b + (targetColor.b - startColor.b) * eased;

          if (progress < 1.0) {
            this.registerRAF(animateColor);
          }
        };

        animateColor();

        if (window.SONOITE_DEBUG) {
          console.log(`[actionParam] Fog color → ${params.color} over ${duration}s`);
        }
      }

      // Animate fog density (for FogExp2)
      if (params.density !== undefined && fog.density !== undefined) {
        const startDensity = fog.density;
        const targetDensity = params.density;

        const animateDensity = () => {
          const elapsed = this.currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1.0);
          const eased = this.easeInOutQuad(progress);

          fog.density = startDensity + (targetDensity - startDensity) * eased;

          if (progress < 1.0) {
            this.registerRAF(animateDensity);
          }
        };

        animateDensity();

        if (window.SONOITE_DEBUG) {
          console.log(`[actionParam] Fog density → ${targetDensity} over ${duration}s`);
        }
      }

      // Animate fog near/far (for Fog)
      if (params.near !== undefined && fog.near !== undefined) {
        this.animateProperty(fog, 'near', params.near, duration);
      }
      if (params.far !== undefined && fog.far !== undefined) {
        this.animateProperty(fog, 'far', params.far, duration);
      }

      return;
    }

    // Handle skybox parameters
    if (target === 'skybox') {
      const skybox = this.layers.core?.skybox || this.getLayer('skybox');
      if (!skybox) {
        if (window.SONOITE_DEBUG) {
          console.warn('[actionParam] Skybox not found');
        }
        return;
      }

      // Animate skybox uniforms
      if (skybox.material?.uniforms) {
        Object.entries(params).forEach(([key, value]) => {
          if (key === 'duration') return;
          if (skybox.material.uniforms[key]) {
            this.animateUniform(skybox.material.uniforms[key], value, duration);
            if (window.SONOITE_DEBUG) {
              console.log(`[actionParam] Skybox.${key} → ${value} over ${duration}s`);
            }
          }
        });
      }

      return;
    }

    // Handle layer uniforms (generic)
    const layer = this.getLayer(target);
    if (layer) {
      // Animate material uniforms
      if (layer.material?.uniforms) {
        Object.entries(params).forEach(([key, value]) => {
          if (key === 'duration') return;
          if (layer.material.uniforms[key]) {
            this.animateUniform(layer.material.uniforms[key], value, duration);
            if (window.SONOITE_DEBUG) {
              console.log(`[actionParam] ${target}.uniforms.${key} → ${value} over ${duration}s`);
            }
          }
        });
      }

      // Traverse group for nested materials
      if (layer.group) {
        layer.group.traverse(obj => {
          if (obj.material?.uniforms) {
            Object.entries(params).forEach(([key, value]) => {
              if (key === 'duration') return;
              if (obj.material.uniforms[key]) {
                this.animateUniform(obj.material.uniforms[key], value, duration);
              }
            });
          }
        });
      }

      return;
    }

    if (window.SONOITE_DEBUG) {
      console.warn(`[actionParam] Target not found: ${target}`);
    }
  }

  /**
   * P6-TORNADO: Smooth vortex transition using built-in easing system
   * Superior to actionVortex - uses layer's native transitionVortex method
   */
  actionVortexTransition(target, params) {
    const layer = this.getLayer(target);

    if (!layer || typeof layer.transitionVortex !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[JourneyController] Vortex transition not supported on ${target} (missing transitionVortex method)`);
      }
      return;
    }

    const duration = params.duration || 3.0;
    const easing = params.easing || 'easeInOutCubic';

    // FIX (Dec 3, 2025): Support both nested params.params AND flat params structure
    // JSON can use either: { params: { strength: 1.5 }, duration: 3 }
    // OR flat:             { strength: 1.5, duration: 3 }
    const vortexParams = params.params || {
      strength: params.strength,
      speed: params.speed,
      height: params.height,
      topRadius: params.topRadius || params.funnelTop,      // Support both names
      bottomRadius: params.bottomRadius || params.funnelBottom,  // Support both names
      riseSpeed: params.riseSpeed,
      spiralTightness: params.spiralTightness
    };

    // Initiate transition - layer handles all animation internally
    layer.transitionVortex(vortexParams, duration, easing);

    if (window.SONOITE_DEBUG) {
      console.log(`[P6-TORNADO] Vortex transition initiated on ${target}:`, {
        strength: vortexParams.strength,
        speed: vortexParams.speed,
        duration,
        easing
      });
    }
  }

  /**
   * P0-CRACK: Egg crack effect for climax (Dec 3, 2025)
   * Animates the egg's crack progress from current value to target
   * @param {string} target - Layer target (e.g., 'egg_crystal')
   * @param {Object} params - { progress: 0-1, duration: seconds, easing: string }
   */
  actionEggCrack(target, params) {
    const layer = this.getLayer(target);
    if (!layer || typeof layer.setCrackProgress !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[P0-CRACK] Egg crack not supported on ${target} (missing setCrackProgress method)`);
      }
      return;
    }

    const targetProgress = params.progress !== undefined ? params.progress : 1.0;
    const duration = params.duration || 0;

    // Instant change if no duration
    if (duration <= 0) {
      layer.setCrackProgress(targetProgress);
      if (window.SONOITE_DEBUG) {
        console.log(`[P0-CRACK] Instant crack progress: ${(targetProgress * 100).toFixed(0)}%`);
      }
      return;
    }

    // Animated transition
    const startTime = this.currentTime;
    const startProgress = layer.getCrackProgress ? layer.getCrackProgress() : 0;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease in-out cubic for organic feel
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const current = startProgress + (targetProgress - startProgress) * eased;
      layer.setCrackProgress(current);

      if (progress < 1.0) {
        this.registerRAF(animate);
      } else if (window.SONOITE_DEBUG) {
        console.log(`[P0-CRACK] Crack animation complete: ${(targetProgress * 100).toFixed(0)}%`);
      }
    };

    // Start animation using registerRAF to prevent memory leaks
    this.registerRAF(animate);

    if (window.SONOITE_DEBUG) {
      console.log(`[P0-CRACK] Starting crack animation: ${(startProgress * 100).toFixed(0)}% → ${(targetProgress * 100).toFixed(0)}% over ${duration}s`);
    }
  }

  /**
   * GIGA-AUDIT: Chromatic aberration action for intense climax moments
   * Target should be 'post_processing'
   * @param {string} target - 'post_processing'
   * @param {Object} params - { intensity: 0-0.05, duration: seconds }
   */
  actionChromaticAberration(target, params) {
    const postfx = window.SonoiteExperience?.postProcessing;
    if (!postfx || !postfx.setChromaticAberration) {
      if (window.SONOITE_DEBUG) {
        console.warn('[GIGA-AUDIT] Chromatic aberration not available on post processor');
      }
      return;
    }

    const targetIntensity = params.intensity || 0.012;
    const duration = params.duration || 2;
    const startTime = this.currentTime;
    const startIntensity = postfx.chromaticAberrationPass?.uniforms?.uIntensity?.value || 0;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Bell curve: ease in then ease out
      let eased;
      if (progress < 0.5) {
        eased = this.easeOutQuad(progress * 2);
      } else {
        eased = 1 - this.easeOutQuad((progress - 0.5) * 2);
      }

      const currentIntensity = startIntensity + (targetIntensity - startIntensity) * eased;
      postfx.setChromaticAberration(currentIntensity);

      if (progress < 1) {
        this.registerRAF(animate);
      } else {
        // Ensure we end at 0
        postfx.setChromaticAberration(0);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[GIGA-AUDIT] Chromatic aberration: intensity=${targetIntensity}, duration=${duration}s`);
    }
  }

  /**
   * GIGA-AUDIT + SECTION-6-FIX: Freeze particles for ending stillness
   * Supports single layer or scene-wide freeze (target: "all")
   * @param {string} target - Layer name or "all" for scene-wide freeze
   * @param {Object} params - { freeze: 0-1, duration: seconds/ms, keepEgg: bool, keepAmbient: bool }
   */
  actionFreeze(target, params) {
    // SECTION-6-FIX: Scene-wide freeze
    if (target === 'all') {
      this._actionSceneFreeze(params);
      return;
    }

    // Original single-layer freeze
    const layer = this.getLayer(target);
    if (!layer || !layer.setFreeze) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[GIGA-AUDIT] Freeze not supported on ${target}`);
      }
      return;
    }

    // HOTFIX-1: Accept both params.freeze and params.value for freeze target
    const targetFreeze = params.freeze ?? params.value ?? 1.0;
    const duration = params.duration || 5;
    const startTime = this.currentTime;

    // Get current freeze value if possible
    const startFreeze = layer.layers?.far?.material?.uniforms?.uFreeze?.value || 0;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutQuad(progress);

      const currentFreeze = startFreeze + (targetFreeze - startFreeze) * eased;
      layer.setFreeze(currentFreeze);

      if (progress < 1) {
        this.registerRAF(animate);
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[GIGA-AUDIT] Freeze ${target}: ${(targetFreeze * 100).toFixed(0)}% over ${duration}s`);
    }
  }

  // P2-T5-PHASE-1: Duplicate actionPhase() removed - see line ~2756 for the single definition

  /**
   * SECTION-6-FIX: Scene-wide freeze for dramatic pauses
   * Fades all layers to near-invisible except optionally the egg and ambient.
   * @param {Object} params - { duration: seconds, keepEgg: bool, keepAmbient: bool }
   */
  _actionSceneFreeze(params) {
    // P0-2 FIX: JSON uses seconds, convert to ms for performance.now() animation
    // Default 5s if not specified. Use ?? so explicit 0 means instant.
    const durationSec = params.duration ?? 5;
    const duration = durationSec * 1000; // Convert seconds → milliseconds
    const keepEgg = params.keepEgg !== false; // Default true
    const keepAmbient = params.keepAmbient !== false; // Default true
    const startTime = performance.now();

    // Collect all layers to freeze
    const freezeTargets = [];

    // Flow layers (particles, fog, etc.)
    if (this.layers.flow) {
      Object.entries(this.layers.flow).forEach(([key, layer]) => {
        if (layer) {
          // Store pre-freeze opacity for later restore
          layer._preFreezeOpacity = layer.opacity || 1.0;
          freezeTargets.push({ key, layer, category: 'flow' });
        }
      });
    }

    // Structure layers (egg, shards, cage, etc.)
    if (this.layers.structure) {
      Object.entries(this.layers.structure).forEach(([key, layer]) => {
        if (layer) {
          // Skip egg if keepEgg is true
          if (keepEgg && (key === 'egg_crystal' || key.includes('egg'))) {
            return;
          }
          layer._preFreezeOpacity = layer.opacity || 1.0;
          freezeTargets.push({ key, layer, category: 'structure' });
        }
      });
    }

    // P0-2b FIX: Fast-path for instant (duration <= 0) to avoid NaN from 0/0
    if (duration <= 0) {
      freezeTargets.forEach(({ key, layer }) => {
        const targetOpacity = keepAmbient ? 0.02 : 0;
        this._setLayerOpacity(layer, targetOpacity);
        if (layer.setFreeze) {
          layer.setFreeze(1.0);
        }
      });
      if (window.SONOITE_DEBUG) {
        console.log(`[SECTION-6-FIX] Scene freeze instant: ${freezeTargets.length} layers frozen`);
      }
      return;
    }

    // Animate freeze
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease out cubic for smooth fade
      const eased = 1 - Math.pow(1 - progress, 3);

      freezeTargets.forEach(({ key, layer }) => {
        // Fade opacity to near-zero
        const startOpacity = layer._preFreezeOpacity;
        const targetOpacity = keepAmbient ? 0.02 : 0;
        const currentOpacity = startOpacity - (startOpacity - targetOpacity) * eased;
        this._setLayerOpacity(layer, currentOpacity);

        // Freeze motion if supported
        if (layer.setFreeze) {
          layer.setFreeze(eased);
        }
      });

      if (progress < 1.0) {
        this.registerRAF(animate);
      } else {
        if (window.SONOITE_DEBUG) {
          console.log(`[SECTION-6-FIX] Scene freeze complete: ${freezeTargets.length} layers frozen`);
        }
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[SECTION-6-FIX] Scene freeze: duration=${duration}ms, keepEgg=${keepEgg}, keepAmbient=${keepAmbient}`);
    }
  }

  /**
   * ISSUE-5-FIX: Fade to black for ending resolution
   * Uses the global brightness pass to fade the entire scene to black
   * @param {Object} params - { duration: seconds, hold: seconds after black }
   */
  actionFadeToBlack(params) {
    const postfx = window.SonoiteExperience?.postProcessing;
    if (!postfx?.brightnessPass?.uniforms?.['brightness']) {
      if (window.SONOITE_DEBUG) {
        console.warn('[ISSUE-5-FIX] Brightness pass not available for fade_to_black');
      }
      return;
    }

    const duration = params.duration || 5;
    const hold = params.hold || 0; // Time to stay at black
    const startTime = this.currentTime;
    const startBrightness = postfx.brightnessPass.uniforms['brightness'].value;

    const animate = () => {
      const elapsed = this.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth fade
      const eased = 1 - Math.pow(1 - progress, 3);
      const brightness = startBrightness * (1 - eased);

      postfx.brightnessPass.uniforms['brightness'].value = brightness;

      if (progress < 1) {
        this.registerRAF(animate);
      } else if (hold > 0) {
        // Hold at black for specified duration
        setTimeout(() => {
          if (window.SONOITE_DEBUG) {
            console.log(`[ISSUE-5-FIX] Fade to black complete, held for ${hold}s`);
          }
        }, hold * 1000);
      } else {
        if (window.SONOITE_DEBUG) {
          console.log('[ISSUE-5-FIX] Fade to black complete');
        }
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[ISSUE-5-FIX] Fade to black: ${duration}s, hold=${hold}s`);
    }
  }

  /**
   * ISSUE-6-FIX: Set particle motion mode for 6-mode choreography
   * Modes: drift (0), spiral (1), cascade (2), pulse (3), freeze (4), chaos (5)
   * @param {string} target - Layer name (e.g., 'star_dust')
   * @param {Object} params - { mode: 'spiral'|0-5, intensity: 0-1, duration: transition time }
   */
  actionMotionMode(target, params) {
    const layer = this.getLayer(target);
    if (!layer || typeof layer.setMotionMode !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[ISSUE-6-FIX] Motion mode not supported on ${target}`);
      }
      return;
    }

    const mode = params.mode !== undefined ? params.mode : 'drift';
    const intensity = params.intensity !== undefined ? params.intensity : 1.0;
    const duration = params.duration || 0;

    if (duration > 0) {
      // Animated transition
      const startTime = this.currentTime;
      const startIntensity = layer.layers?.far?.material?.uniforms?.uMotionIntensity?.value || 0;

      // First set the mode
      layer.setMotionMode(mode, startIntensity);

      // Then animate intensity
      const animate = () => {
        const elapsed = this.currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeOutQuad(progress);

        const currentIntensity = startIntensity + (intensity - startIntensity) * eased;
        layer.setMotionMode(mode, currentIntensity);

        if (progress < 1) {
          this.registerRAF(animate);
        }
      };

      animate();
    } else {
      // Instant change
      layer.setMotionMode(mode, intensity);
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[ISSUE-6-FIX] Motion mode action: ${target} -> ${mode}, intensity=${intensity}`);
    }
  }

  /**
   * SECTION-6-FIX: Scene-wide unfreeze (opposite of freeze)
   * Restores opacity and motion to all layers after a freeze action.
   * @param {string} target - Usually "all" for scene-wide unfreeze
   * @param {Object} params - { duration: seconds, burstIntensity: optional impulse multiplier }
   */
  actionUnfreeze(target, params) {
    // P0-2 FIX: JSON uses seconds, convert to ms for performance.now() animation
    // Default 2s if not specified. Use ?? so explicit 0 means instant.
    const durationSec = params.duration ?? 2;
    const duration = durationSec * 1000; // Convert seconds → milliseconds
    const burstIntensity = params.burstIntensity || 1.0;
    const startTime = performance.now();

    // PHASE-COORDINATION: Signal THE UNFREEZE to all listeners
    JourneyState.unfreeze();

    // Store pre-freeze states if we have them, otherwise use defaults
    const restoreTargets = [];

    // Collect all freezable layers
    const allLayers = [];
    if (this.layers.flow) {
      Object.entries(this.layers.flow).forEach(([key, layer]) => {
        if (layer) allLayers.push({ key, layer, category: 'flow' });
      });
    }
    if (this.layers.structure) {
      Object.entries(this.layers.structure).forEach(([key, layer]) => {
        if (layer) allLayers.push({ key, layer, category: 'structure' });
      });
    }

    // Prepare restore targets
    allLayers.forEach(({ key, layer, category }) => {
      const startOpacity = layer.opacity || 0;
      const targetOpacity = layer._preFreezeOpacity || 1.0;
      restoreTargets.push({ key, layer, startOpacity, targetOpacity });
    });

    // P0-2b FIX: Fast-path for instant (duration <= 0) to avoid NaN from 0/0
    if (duration <= 0) {
      restoreTargets.forEach(({ layer, targetOpacity }) => {
        this._setLayerOpacity(layer, targetOpacity);
        if (layer.setFreeze) {
          layer.setFreeze(0);
        }
        delete layer._preFreezeOpacity;
      });
      if (window.SONOITE_DEBUG) {
        console.log(`[SECTION-6-FIX] Unfreeze instant: ${restoreTargets.length} layers restored`);
      }
      return;
    }

    // Animate restore
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease out with slight overshoot for burst effect
      let eased = 1 - Math.pow(1 - progress, 3);
      if (burstIntensity > 1.0 && progress < 0.3) {
        eased *= burstIntensity;
      }

      restoreTargets.forEach(({ key, layer, startOpacity, targetOpacity }) => {
        const currentOpacity = startOpacity + (targetOpacity - startOpacity) * eased;
        this._setLayerOpacity(layer, Math.min(currentOpacity, targetOpacity));

        // Restore motion if frozen
        // P0-2 FIX: Clamp freeze value to [0,1] to avoid negative values when burstIntensity > 1
        if (layer.setFreeze) {
          layer.setFreeze(Math.max(0, 1.0 - eased));
        }
      });

      if (progress < 1.0) {
        this.registerRAF(animate);
      } else {
        // Cleanup
        restoreTargets.forEach(({ layer }) => {
          delete layer._preFreezeOpacity;
        });
        if (window.SONOITE_DEBUG) {
          console.log(`[SECTION-6-FIX] Unfreeze complete, restored ${restoreTargets.length} layers`);
        }
      }
    };

    animate();

    if (window.SONOITE_DEBUG) {
      console.log(`[SECTION-6-FIX] Unfreeze started: duration=${duration}ms, burst=${burstIntensity}`);
    }
  }

  /**
   * SECTION-6-FIX: Hard cut to black for ending
   * Instant black screen with optional audio stop.
   * @param {Object} params - { stopAudio: boolean }
   */
  actionHardCutBlack(params) {
    const postfx = window.SonoiteExperience?.postProcessing;
    const stopAudio = params.stopAudio !== false; // Default true

    // Instant black via brightness pass
    if (postfx?.brightnessPass?.uniforms?.['brightness']) {
      postfx.brightnessPass.uniforms['brightness'].value = 0;
    }

    // Also set bloom to 0 to prevent any glow
    if (postfx?.bloomPass?.strength !== undefined) {
      postfx.bloomPass.strength = 0;
    }

    // Stop audio if requested
    if (stopAudio && window.SonoiteExperience?.audioManager) {
      const audioManager = window.SonoiteExperience.audioManager;
      if (typeof audioManager.pause === 'function') {
        audioManager.pause();
      } else if (typeof audioManager.stop === 'function') {
        audioManager.stop();
      }
    }

    // Hide all layers instantly
    ['flow', 'structure'].forEach(category => {
      if (this.layers[category]) {
        Object.values(this.layers[category]).forEach(layer => {
          if (layer) {
            this._setLayerOpacity(layer, 0);
          }
        });
      }
    });

    if (window.SONOITE_DEBUG) {
      console.log(`[SECTION-6-FIX] Hard cut to black, stopAudio=${stopAudio}`);
    }
  }

  /**
   * OPUS3: Clear audio links when switching tracks
   */
  clearAudioLinks() {
    this.audioLinks = [];
    if (window.SONOITE_DEBUG) {
      console.log('[OPUS3] Audio links cleared');
    }
  }

  /**
   * TARGET-RESOLUTION-FIX: Comprehensive target resolver with fuzzy matching and detailed error logging
   *
   * Resolves target paths like:
   * - "camera" -> layers.core.camera
   * - "star_dust" -> layers.flow.star_dust
   * - "egg_crystal" -> layers.structure.egg_crystal
   * - "layers.core.camera" -> layers.core.camera (dot notation)
   * - "skybox" -> layers.core.skybox
   *
   * @param {string} targetPath - Target identifier or path
   * @returns {Object|null} - Resolved layer object or null
   */
  resolveTarget(targetPath) {
    if (!targetPath) return null;

    // Handle dot notation (e.g., "layers.core.camera")
    if (targetPath.includes('.')) {
      const parts = targetPath.split('.');
      let current = this;

      for (const part of parts) {
        current = current?.[part];
        if (!current) {
          this._logTargetError(targetPath, 'Dot path failed at: ' + part);
          return null;
        }
      }
      return current;
    }

    // PHASE-0.2-FIX: Direct category access returns ARRAY of layers, not the map
    // This allows actions to iterate over all layers in a category
    if (targetPath === 'flow') {
      return Object.values(this.layers.flow || {});
    }
    if (targetPath === 'structure') {
      return Object.values(this.layers.structure || {});
    }
    if (targetPath === 'core') {
      return Object.values(this.layers.core || {});
    }

    // Search in flow layers (star_dust, heavy_fog, etc.)
    if (this.layers.flow?.[targetPath]) {
      return this.layers.flow[targetPath];
    }

    // Search in structure layers (egg_crystal, distant_shards, etc.)
    if (this.layers.structure?.[targetPath]) {
      return this.layers.structure[targetPath];
    }

    // Search in core layers (camera, skybox, lighting)
    if (this.layers.core?.[targetPath]) {
      return this.layers.core[targetPath];
    }

    // Legacy fallback: constructor name (unreliable in production)
    for (const category in this.layers) {
      const layer = this.layers[category];
      if (layer?.constructor?.name === targetPath) {
        return layer;
      }
      // Check nested objects
      if (typeof layer === 'object') {
        for (const key in layer) {
          if (layer[key]?.constructor?.name === targetPath) {
            return layer[key];
          }
        }
      }
    }

    // Target not found - log helpful error
    this._logTargetError(targetPath);
    return null;
  }

  /**
   * TARGET-RESOLUTION-FIX: Log detailed error with available targets and fuzzy suggestions
   */
  _logTargetError(targetPath, reason = 'Target not found') {
    if (!window.SONOITE_DEBUG) return;

    // Build list of all available targets
    const available = this._getAvailableTargets();

    // Fuzzy match suggestions (Levenshtein distance <= 2)
    const suggestions = this._fuzzyMatchTargets(targetPath, available);

    console.group(`[JourneyController] ${reason}: "${targetPath}"`);

    if (suggestions.length > 0) {
      console.warn('Did you mean:', suggestions.join(', '));
    }

    console.log('Available targets:', available);
    console.log('Layer structure:', {
      flow: Object.keys(this.layers.flow || {}),
      structure: Object.keys(this.layers.structure || {}),
      core: Object.keys(this.layers.core || {})
    });

    console.groupEnd();
  }

  /**
   * TARGET-RESOLUTION-FIX: Get flat list of all valid target names
   */
  _getAvailableTargets() {
    const targets = ['flow', 'structure', 'core'];

    if (this.layers.flow) {
      targets.push(...Object.keys(this.layers.flow));
    }
    if (this.layers.structure) {
      targets.push(...Object.keys(this.layers.structure));
    }
    if (this.layers.core) {
      targets.push(...Object.keys(this.layers.core));
    }

    return targets;
  }

  /**
   * TARGET-RESOLUTION-FIX: Fuzzy match using Levenshtein distance
   * Returns matches with distance <= 2
   */
  _fuzzyMatchTargets(input, candidates) {
    const maxDistance = 2;
    const matches = [];

    for (const candidate of candidates) {
      const distance = this._levenshteinDistance(input.toLowerCase(), candidate.toLowerCase());
      if (distance > 0 && distance <= maxDistance) {
        matches.push(candidate);
      }
    }

    return matches;
  }

  /**
   * TARGET-RESOLUTION-FIX: Calculate Levenshtein distance between two strings
   */
  _levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * LEGACY: Maintained for backward compatibility
   * Use resolveTarget() for new code
   */
  getLayer(target) {
    return this.resolveTarget(target);
  }

  /**
   * PHASE-0.2-FIX: Get layers as array (handles both single layer and category targets)
   * @param {string} target - Target identifier
   * @returns {Array} - Array of layers (single-element for specific layers, multi for categories)
   */
  getLayersAsArray(target) {
    const result = this.resolveTarget(target);
    if (!result) return [];
    if (Array.isArray(result)) return result.filter(Boolean);
    return [result];
  }

  /**
   * TRACK5-GRAVITY: Set gravitational attraction toward void (Dec 9, 2025)
   * Particles spiral toward center creating accretion disk effect
   * @param {string} target - Layer name (e.g., 'star_dust')
   * @param {Object} params - { strength, spiralRate, center, radius, eventHorizon }
   */
  actionGravity(target, params) {
    const layer = this.getLayer(target);
    if (!layer || typeof layer.setGravity !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[TRACK5-GRAVITY] Gravity not supported on ${target}`);
      }
      return;
    }

    layer.setGravity({
      strength: params.strength ?? 0,
      spiralRate: params.spiralRate ?? 0.5,
      center: params.center || { x: 0, y: 2, z: 0 },
      radius: params.radius ?? 15,
      eventHorizon: params.eventHorizon ?? 2.5,
      spaghettiStrength: params.spaghettiStrength ?? 0,
      spaghettiRadius: params.spaghettiRadius
    });

    if (window.SONOITE_DEBUG) {
      console.log(`[TRACK5-GRAVITY] Gravity set on ${target}: str=${params.strength}, spiral=${params.spiralRate}`);
    }
  }

  /**
   * TRACK5-VORTEX: Attractor vortex for curved trajectories (Track 05 setpieces)
   * Uses StarDustFieldEnhanced's vortex transition when available.
   *
   * @param {string} target - Layer name (e.g. 'void_dust')
   * @param {Object} params - { strength, speed, duration, easing, height, topRadius, bottomRadius, riseSpeed, spiralTightness }
   */
  actionVortex(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const strength = params.strength ?? 0;
    const speed = params.speed ?? 0;
    const duration = params.duration ?? 0;
    const easing = params.easing || 'easeInOutCubic';

    const shape = {
      height: params.height,
      topRadius: params.topRadius,
      bottomRadius: params.bottomRadius,
      riseSpeed: params.riseSpeed,
      spiralTightness: params.spiralTightness
    };

    if (duration > 0 && typeof layer.transitionVortex === 'function') {
      layer.transitionVortex({ strength, speed, ...shape }, duration, easing);
      return;
    }

    if (typeof layer.setVortexMode === 'function') {
      layer.setVortexMode({ strength, speed, ...shape });
      return;
    }

    // Fallback: set uniforms directly if present (best-effort)
    if (layer.layers && typeof layer.layers === 'object') {
      for (const key in layer.layers) {
        const u = layer.layers[key]?.material?.uniforms;
        if (!u) continue;
        if (u.uAttractorStrength) u.uAttractorStrength.value = strength;
        if (u.uVortexSpeed) u.uVortexSpeed.value = speed;
      }
    }
  }

  /**
   * TRACK5-VOID: Particle atmosphere lift near the event horizon (no new post passes)
   *
   * @param {string} target - Layer name (e.g. 'void_dust')
   * @param {Object} params - { value|intensity, duration }
   */
  actionVoidGlow(target, params) {
    const layer = this.getLayer(target);
    if (!layer) return;

    const value = params.value ?? params.intensity ?? 0;
    const duration = params.duration ?? 0;

    const apply = (v) => {
      if (typeof layer.setVoidGlow === 'function') {
        layer.setVoidGlow(v);
        return;
      }
      if (layer.layers && typeof layer.layers === 'object') {
        for (const key in layer.layers) {
          const u = layer.layers[key]?.material?.uniforms;
          if (u?.uVoidGlow) u.uVoidGlow.value = v;
        }
      }
    };

    if (duration > 0) {
      // Best-effort start value: read from the first sublayer if present.
      const first = layer.layers ? Object.values(layer.layers)[0] : null;
      const startVal = first?.material?.uniforms?.uVoidGlow?.value ?? 0;
      this.animateValue(startVal, value, duration, apply);
    } else {
      apply(value);
    }
  }

  /**
   * TRACK5-VOID: Control void sphere lens/glow effects (Dec 9, 2025)
   * P1-T5-4: Added erosion and vertexDisplacement support (Dec 12, 2025)
   * @param {string} target - Layer name (e.g., 'void_sphere')
   * @param {Object} params - { lensStrength, eventHorizonGlow, vortexSpeed, infiniteDepth, erosion, vertexDisplacement, duration }
   */
  actionVoidLens(target, params) {
    const layer = this.getLayer(target);
    if (!layer) {
      if (window.SONOITE_DEBUG) {
        console.warn(`[TRACK5-VOID] Void lens: layer ${target} not found`);
      }
      return;
    }

    const duration = Math.max(0, Number(params.duration || 0));
    const triggerTime = Number.isFinite(this._activeTriggerTime) ? this._activeTriggerTime : this.currentTime;
    const elapsedFromTrigger = Math.max(0, this.currentTime - triggerTime);
    const seekElapsed = duration > 0 ? Math.min(duration, elapsedFromTrigger) : 0;
    const seekProgress = duration > 0 ? Math.min(seekElapsed / duration, 1) : 1;
    const seekEased = this._easeProgress('easeInOutQuad', seekProgress);
    const remainingDuration = duration > 0 ? Math.max(0, duration - seekElapsed) : 0;
    const resumeAt = triggerTime + (duration > 0 ? duration : 0.12);

    // Prevent link_audio from fighting authored void_lens arcs.
    // Mirror the protection used by void_lens_pulse for all authored uniforms.
    const authoredUniforms = [];
    if (params.lensStrength !== undefined) authoredUniforms.push('uLensStrength');
    if (params.eventHorizonGlow !== undefined) authoredUniforms.push('uEventHorizonGlow');
    if (params.infiniteDepth !== undefined) authoredUniforms.push('uInfiniteDepth');
    if (params.vortexSpeed !== undefined) authoredUniforms.push('uVortexSpeed');

    if (authoredUniforms.length > 0) {
      for (const link of this.audioLinks || []) {
        if (link?.target !== target) continue;
        if (!authoredUniforms.includes(link.uniform)) continue;
        link.suspendedUntil = Math.max(link.suspendedUntil || 0, resumeAt);
      }
    }

    // HOTFIX-2: VoidSphere stores uniforms on mesh.material, not layer.material
    const uniforms = layer.mesh?.material?.uniforms || layer.material?.uniforms;

    // TRACK5-PASSES: Drive the screen-space SingularityLensPass alongside the VoidSphere shader.
    // This is the missing piece for “void reads as a flat black circle” and “straight warp streaks”:
    // the post pass warps the *background* and makes gravity visible without new geometry.
    const postfx = window.SonoiteExperience?.postProcessing;
    if (postfx && typeof postfx.setSingularityLens === 'function') {
      // Keep lens centered on the void sphere (camera moves can offset it from dead-center).
      try {
        const camera = window.SonoiteExperience?.cameraManager?.camera || window.SonoiteExperience?.camera;
        if (camera && layer.mesh?.getWorldPosition) {
          const worldPos = this._voidLensWorldPos;
          layer.mesh.getWorldPosition(worldPos);
          const ndc = worldPos.project(camera);
          const x = ndc.x * 0.5 + 0.5;
          const y = ndc.y * 0.5 + 0.5;
          if (Number.isFinite(x) && Number.isFinite(y) && typeof postfx.setSingularityLensCenter === 'function') {
            postfx.setSingularityLensCenter(x, y);
          }
        }
      } catch {
        // Never allow lens centering to break playback.
      }

      // Respect phase ownership: only override invert when explicitly authored.
      if (params.invert !== undefined && typeof postfx.setSingularityLensInvert === 'function') {
        postfx.setSingularityLensInvert(Boolean(params.invert));
      }

      // Map the void shader’s rim cue to the post pass’s accretion ring (subtle, noir-safe).
      if (params.eventHorizonGlow !== undefined && typeof postfx.getSingularityLensController === 'function') {
        const controller = postfx.getSingularityLensController();
        if (controller && typeof controller.setAccretionGlow === 'function') {
          const glow = Math.max(0, Math.min(1, params.eventHorizonGlow * 0.55));
          controller.setAccretionGlow(glow);
        }
      }

      // Enable/animate the lens pass when lensStrength is authored (including 0 to disable).
      if (params.lensStrength !== undefined) {
        const strength = Math.max(0, Math.min(1, params.lensStrength));
        // Slightly scale down vs. the sphere shader so it stays cinematic (not a “fisheye”).
        const passStrength = Math.min(0.85, strength * 0.85);
        postfx.setSingularityLens(passStrength, remainingDuration);
      }
    }

    const tweens = [];
    const queueTween = (hasParam, startVal, targetVal, setter) => {
      if (!hasParam || typeof setter !== 'function') return;
      const safeStart = Number.isFinite(startVal) ? startVal : 0;
      const safeTarget = Number.isFinite(targetVal) ? targetVal : safeStart;
      const seekStart = safeStart + (safeTarget - safeStart) * seekEased;
      setter(seekStart);
      if (remainingDuration > 0) {
        tweens.push({ start: seekStart, end: safeTarget, setter });
      }
    };

    queueTween(
      params.lensStrength !== undefined,
      uniforms?.uLensStrength?.value,
      params.lensStrength,
      (v) => layer.setLensStrength?.(v)
    );

    queueTween(
      params.eventHorizonGlow !== undefined,
      uniforms?.uEventHorizonGlow?.value,
      params.eventHorizonGlow,
      (v) => layer.setEventHorizonGlow?.(v)
    );

    queueTween(
      params.vortexSpeed !== undefined,
      uniforms?.uVortexSpeed?.value,
      params.vortexSpeed,
      (v) => layer.setVortexSpeed?.(v)
    );

    queueTween(
      params.infiniteDepth !== undefined,
      uniforms?.uInfiniteDepth?.value,
      params.infiniteDepth,
      (v) => layer.setInfiniteDepth?.(v)
    );

    queueTween(
      params.erosion !== undefined,
      uniforms?.uErosion?.value,
      params.erosion,
      (v) => layer.setErosion?.(v)
    );

    queueTween(
      params.vertexDisplacement !== undefined,
      uniforms?.uVertexDisplacement?.value,
      params.vertexDisplacement,
      (v) => layer.setVertexDisplacement?.(v)
    );

    if (remainingDuration > 0 && tweens.length > 0) {
      const startTime = performance.now();
      const durationMs = remainingDuration * 1000;
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = this._easeProgress('easeInOutQuad', progress);
        for (const tween of tweens) {
          const current = tween.start + (tween.end - tween.start) * eased;
          tween.setter(current);
        }
        if (progress < 1) {
          this.registerRAF(animate);
        }
      };
      animate();
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[TRACK5-VOID] Void lens applied to ${target}:`, params);
    }
  }

  /**
   * P6-DIAMOND: Lens pulse helper (impact + elastic recovery)
   * This avoids the need for action-level delays by containing both phases in one action.
   *
   * @param {string} target - Layer name (e.g., 'void_sphere')
   * @param {Object} params - { peak, base, delta, attack, decay, attackEasing, decayEasing }
   */
  actionVoidLensPulse(target, params = {}) {
    const layer = this.getLayer(target);
    if (!layer || typeof layer.setLensStrength !== 'function') {
      if (window.SONOITE_DEBUG) {
        console.warn(`[P6-DIAMOND] void_lens_pulse not supported on ${target}`);
      }
      return;
    }

    const uniforms = layer.mesh?.material?.uniforms || layer.material?.uniforms;
    const current = uniforms?.uLensStrength?.value ?? 0;

    const base = Number.isFinite(params.base) ? params.base : current;
    const delta = Number.isFinite(params.delta) ? params.delta : 0.6;
    const peak = Number.isFinite(params.peak) ? params.peak : (base + delta);

    const attack = Math.max(0, Number(params.attack ?? 0.08));
    const decay = Math.max(0, Number(params.decay ?? 1.2));
    const attackEasing = params.attackEasing || 'easeOutCubic';
    const decayEasing = params.decayEasing || 'easeOutExpo';
    const triggerTime = Number.isFinite(this._activeTriggerTime) ? this._activeTriggerTime : this.currentTime;
    const elapsedFromTrigger = Math.max(0, this.currentTime - triggerTime);
    const elapsedOffsetMs = elapsedFromTrigger * 1000;
    const attackMs = attack * 1000;
    const decayMs = decay * 1000;
    const totalMs = attackMs + decayMs;

    // If uLensStrength is audio-linked, it will overwrite the pulse each frame.
    // Suspend the matching link(s) just long enough for the pulse to play out.
    const resumeAt = triggerTime + attack + decay;
    for (const link of this.audioLinks || []) {
      if (link?.target !== target) continue;
      if (link.uniform !== 'uLensStrength') continue;
      link.suspendedUntil = Math.max(link.suspendedUntil || 0, resumeAt);
    }

    if (elapsedOffsetMs >= totalMs) {
      layer.setLensStrength(base);
      return;
    }

    const startTime = performance.now();

    const animate = () => {
      const elapsed = elapsedOffsetMs + (performance.now() - startTime);

      let value = base;
      if (elapsed <= attackMs) {
        const t = attackMs > 0 ? (elapsed / attackMs) : 1;
        const eased = this._easeProgress(attackEasing, Math.min(Math.max(t, 0), 1));
        value = base + (peak - base) * eased;
      } else {
        const t = decayMs > 0 ? ((elapsed - attackMs) / decayMs) : 1;
        const eased = this._easeProgress(decayEasing, Math.min(Math.max(t, 0), 1));
        value = peak + (base - peak) * eased;
      }

      layer.setLensStrength(value);

      if (elapsed < totalMs) {
        this.registerRAF(animate);
      } else {
        layer.setLensStrength(base);
      }
    };

    animate();
  }

  /**
   * Helper: Animate a value over time using RAF
   * @param {number} startVal - Starting value
   * @param {number} endVal - Target value
   * @param {number} duration - Duration in seconds
   * @param {Function} setter - Function to set the value
   */
  animateValue(startVal, endVal, duration, setter) {
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2; // easeInOutQuad

      const current = startVal + (endVal - startVal) * eased;
      setter(current);

      if (progress < 1) {
        // Ensure RAFs are tracked so reset()/clear() can cancel them on track switches.
        this.registerRAF(animate);
      }
    };

    animate();
  }

  /**
   * Reset triggers for new playback
   * OPUS3/OPUS4: Also clears audio links and real-time cooldowns
   * BUG-FIX-02: Now cancels all active RAF animations
   */
  reset() {
    // BUG-FIX-02: Cancel any running animations before reset
    this.cancelAllAnimations();

    this.triggers.forEach(t => t.fired = false);
    this.firedTriggers.clear();
    this.cooldowns.clear();
    this.currentTime = 0;
    // P0-7: Reset previousTime for crossed trigger logic
    this.previousTime = 0;

    // OPUS3: Clear audio links
    this.audioLinks = [];

    // OPUS4: Clear real-time cooldowns and log throttling
    this.cooldownsReal.clear();
    this._lastLogTime.clear();

    // PHASE-COORDINATION: Reset JourneyState for new journey
    JourneyState.reset();
  }

  /**
   * 01-01: Normalize action params to fix drift between handler expectations and JSON usage.
   * Per-action aliasing ONLY - do NOT do global remaps.
   * @param {string} type - Action type
   * @param {object} params - Raw params from JSON
   * @returns {object} - Normalized params
   */
  normalizeActionParams(type, params) {
    if (!params) return {};

    // Clone to avoid mutating original
    const normalized = { ...params };

    // CONFIRMED DRIFT: turbulence handler reads intensity, JSONs use amount
    // See ACTION_PARAMS.md for audit details
    if (type === 'turbulence' && normalized.amount !== undefined && normalized.intensity === undefined) {
      normalized.intensity = normalized.amount;
      delete normalized.amount;
      if (window.SONOITE_DEBUG) {
        console.warn(`[Normalizer] ${type}: amount → intensity (use intensity in future)`);
      }
    }

    // CONFIRMED DRIFT: density handler reads multiplier, some JSONs use value.
    if (type === 'density' && normalized.value !== undefined && normalized.multiplier === undefined) {
      normalized.multiplier = normalized.value;
      if (window.SONOITE_DEBUG) {
        console.warn('[Normalizer] density: value → multiplier (use multiplier in future)');
      }
    }

    // CONFIRMED DRIFT: breath handler uses rate/amplitude; some moments still send frequency.
    if (type === 'breath' && normalized.frequency !== undefined && normalized.rate === undefined) {
      normalized.rate = normalized.frequency;
      delete normalized.frequency;
      if (window.SONOITE_DEBUG) {
        console.warn('[Normalizer] breath: frequency → rate (use rate in future)');
      }
    }

    // Add more per-action aliases here as drift is discovered
    // Pattern: if (type === 'action_name' && normalized.oldName !== undefined) { ... }

    return normalized;
  }

  /**
   * Clear all triggers
   */
  clear() {
    this.triggers = [];
    this.reset();
  }
}

export default JourneyController;
