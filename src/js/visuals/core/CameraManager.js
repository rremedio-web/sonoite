/**
 * CameraManager - Audio-reactive camera controls and movement
 * Manages camera positioning, movement, and audio-driven effects
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { VisualLayer } from '../base/VisualLayer.js';

// TRACK5-VOID: Camera spline definitions for Não Querer Nada
export const TRACK5_CAMERA_SPLINES = {
  ACT1_VOID: {
    waypoints: [
      [0, 8, 25], [5, 7, 22], [8, 6, 18], [6, 5, 15], [0, 4, 12]
    ],
    lookAt: [0, 2, 0],
    fovKeyframes: [
      { t: 0.0, value: 55 }, { t: 0.5, value: 58 }, { t: 1.0, value: 62 }
    ],
    duration: 96,
    easing: 'linear',
    lookAhead: false
  },
  ACT2_AWAKENING: {
    waypoints: [
      [0, 4, 12], [-4, 3.5, 10], [-6, 3, 8], [-4, 3, 6], [0, 3, 5]
    ],
    lookAt: [0, 2, 0],
    fovKeyframes: [
      { t: 0.0, value: 62 }, { t: 0.5, value: 65 }, { t: 1.0, value: 70 }
    ],
    duration: 120,
    easing: 'easeOut',
    lookAhead: false
  },
  ACT3_WANTING_CLIMAX: {
    waypoints: [
      [0, 3, 5], [3, 2.5, 4], [4, 2, 2], [3, 2, 0], [0, 2, -2],
      [-3, 2, 0], [-4, 2, 2], [-3, 2.5, 4], [0, 3, 5]
    ],
    lookAt: [0, 2, 0],
    fovKeyframes: [
      { t: 0.0, value: 70 }, { t: 0.3, value: 55 },
      { t: 0.5, value: 45 }, { t: 0.7, value: 55 }, { t: 1.0, value: 65 }
    ],
    duration: 65,
    easing: 'easeInOut',
    lookAhead: false
  },
  ACT4_RELEASE: {
    waypoints: [
      [0, 3, 5], [2, 4, 8], [4, 5, 12], [3, 6, 16], [0, 6, 18], [-2, 5, 15], [0, 4, 12]
    ],
    lookAt: [0, 2, 0],
    fovKeyframes: [
      { t: 0.0, value: 65 }, { t: 0.3, value: 72 },
      { t: 0.6, value: 78 }, { t: 1.0, value: 80 }
    ],
    duration: 151,
    easing: 'easeOut',
    lookAhead: false
  },
  ACT5_ERASURE: {
    waypoints: [
      [0, 4, 12], [0, 3.5, 8], [0, 3, 5], [0, 2.5, 2],
      [0, 2, 0], [0, 2, -3], [0, 2, -8], [0, 3, -15]
    ],
    lookAt: [0, 2, -100],
    fovKeyframes: [
      { t: 0.0, value: 80 }, { t: 0.2, value: 75 }, { t: 0.4, value: 65 },
      { t: 0.6, value: 45 }, { t: 0.8, value: 35 }, { t: 1.0, value: 25 }
    ],
    duration: 132,
    easing: 'easeIn',
    lookAhead: false
  }
};

export class CameraManager extends VisualLayer {
  onInit() {
    // MP11: Dual-rate EMA for audio smoothing (attack/decay)
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
    this._emaAttack = 0.6;  // Fast rise on audio peaks
    this._emaDecay = 0.2;   // Slow fall for smooth trails
    this._alpha = 0.08;     // Legacy single-rate fallback

    // MP11: Shake configuration with JSON override support
    // CHILL-CAM: Reduced shake for steadier camera - compensated by boosting other visuals
    this.shakeConfig = {
      bass: this.cfg?.camera?.shake?.bass || 0.8,      // Was 2.5 - now subtle
      mid: this.cfg?.camera?.shake?.mid || 0.4,        // Was 1.2 - now minimal
      treble: this.cfg?.camera?.shake?.treble || 0.5,  // Was 1.5 - now subtle
      loudness: this.cfg?.camera?.shake?.loudness || 0.6  // Was 2.0 - now gentle
    };

    // FULL-OVERHAUL: Beat detection integration
    this.beatDetector = null;  // Set externally via setBeatDetector()
    this.beatReactive = {
      kickFovPunch: 0,         // FOV punch on kick (decays)
      snarePush: 0,            // Position push on snare (decays)
      kickDecay: 0.12,
      snareDecay: 0.15
    };

    // CLIMAX-SIGNATURE: Reused scratch vectors for vertigo (avoid per-frame allocations)
    this._vertigoTarget = new THREE.Vector3();
    this._vertigoDirection = new THREE.Vector3();
    this._vertigoOffset = new THREE.Vector3();

    // FULL-OVERHAUL: Camera personality presets per track
    // CHILL-CAM: Reduced shake/punch values - steadier camera, visuals compensate
    this.personalities = {
      // Track 1: Sonoite - "Ritual Orbit" - Witnessed, authored orbit (tornado handled by Track1Director)
      sonoite: {
        name: 'ritual_orbit',
        orbitSpeed: 0.012,       // Slow steady orbit (authored, not wandering)
        autoRotate: true,
        orbitRadius: 14,         // Close enough for silhouette, avoids random distance swings
        orbitHeight: 3.5,
        handheldNoise: 0.008,    // CHILL: Was 0.015
        fovBase: 64,             // Slightly tighter for disciplined framing
        fovBreathAmp: 1.6,       // Subtle breathing
        fovKickPunch: 2.0,       // Avoid FOV whiplash
        shakeBass: 0.12,         // Very subtle shake
        lookAtDrift: 0.15,       // Keep attention locked; avoid wander
        mode: 'cinematic_dolly',
        forwardDrift: 0.0
      },

      // Track 2: Paralisia do sono - "The Witness" - Trapped, claustrophobic
      'paralisia-do-sono': {
        name: 'witness',
        orbitSpeed: 0,
        orbitRadius: 6.5,
        orbitHeight: 1.4,
        handheldNoise: 0.02,     // CHILL: Was 0.04
        fovBase: 65,
        fovBreathAmp: 0,
        fovKickPunch: 3,         // CHILL: Was 8
        shakeBass: 0.6,          // CHILL: Was 2.5
        lookAtDrift: 0.05,
        mode: 'stationary'
      },

      // Track 3: O Livro Azul - "The Reader" - Curious, exploratory
      'o-livro-azul': {
        name: 'reader',
        orbitSpeed: 0.05,
        orbitRadius: 10,
        orbitHeight: 4,
        handheldNoise: 0.025,    // CHILL: Was 0.05
        fovBase: 75,
        fovBreathAmp: 3,         // CHILL: Was 7
        fovKickPunch: 3,         // CHILL: Was 10
        shakeBass: 0.25,         // CHILL: Was 0.8
        lookAtDrift: 0.5,
        mode: 'orbit'
      },

      // Track 4: Horas Mortas - "The Insomniac" - Restless, jittery
      'horas-mortas': {
        name: 'insomniac',
        orbitSpeed: 0.006,
        autoRotate: false,
        orbitRadius: 8.2,
        orbitHeight: 2.3,
        handheldNoise: 0.018,
        fovBase: 63,
        fovBreathAmp: 1.2,
        fovKickPunch: 2.5,
        shakeBass: 0.18,
        lookAtDrift: 0.08,
        forwardDrift: 0.00008,
        mode: 'cinematic_dolly'
      },

      // Track 5: Nao Querer Nada - "The Drifter" - Contemplative, void-focused
      'nao-querer-nada': {
        name: 'drifter',
        orbitSpeed: 0.004,
        autoRotate: false,
        orbitRadius: 8.4,
        orbitHeight: 2.6,
        handheldNoise: 0.006,
        fovBase: 68,
        fovBreathAmp: 1.8,
        fovKickPunch: 1,
        shakeBass: 0.06,
        lookAtDrift: 0.12,
        forwardDrift: 0.00008,
        mode: 'void_drift'
      },

      // Track 6: O Filho - "The Inheritor" - Grounded, reverent
      'o-filho': {
        name: 'inheritor',
        orbitSpeed: 0.0,
        autoRotate: false,
        orbitRadius: 10.8,
        orbitHeight: 4.1,
        handheldNoise: 0.002,
        fovBase: 59,
        fovBreathAmp: 0.8,
        fovKickPunch: 1.5,
        shakeBass: 0.12,
        lookAtDrift: 0.03,
        mode: 'cinematic_dolly'
      },

      // Track 7: Homem Educado - "The Analyst" - Precise, methodical
      'homem-educado': {
        name: 'analyst',
        orbitSpeed: 0.035,
        orbitRadius: 11,
        orbitHeight: 5,
        handheldNoise: 0.004,    // CHILL: Was 0.008
        fovBase: 74,
        fovBreathAmp: 1,         // CHILL: Was 2
        fovKickPunch: 2,         // CHILL: Was 5
        shakeBass: 0.25,         // CHILL: Was 0.8
        lookAtDrift: 0.1,
        mode: 'orbit'
      }
    };

    // Current active personality
    this.activePersonality = null;

    // Camera movement state
    this.basePosition = new THREE.Vector3(0, 5, 10);
    this.baseLookAt = new THREE.Vector3(0, 0, 0);
    this.shakeAmount = 0;
    this.time = 0;

    // MP11: Camera behavior mode (orbit/witness/architect/follow/stationary)
    this.behaviorMode = 'orbit';

    // CAM-API-01: Path sequence state
    this.pathSequence = null;
    this.sequenceStartTime = 0;
    this.sequenceActive = false;
    this.orbitControlsState = null;

    // NARRATIVE-SPLINE: CatmullRomCurve3 camera spline system
    // SEEK-SAFE: Use audio song time for deterministic spline progress (perf-time fallback).
    this.splinePath = null;           // THREE.CatmullRomCurve3 instance
    this.splineActive = false;
    this.splineStartTime = 0;         // performance.now() timestamp (seconds)
    this.splineStartPerfTime = 0;     // performance.now() timestamp (seconds)
    this.splineStartSongTime = null;  // song time (seconds) when spline started
    this.splineDuration = 0;
    this.splineEasing = 'linear';
    this.splineLookAhead = 0.02;      // Look ahead on spline for smooth orientation
    this.splineFovKeyframes = null;    // Optional FOV keyframes {t:0-1, value:fov}

    // AMPLIFIED-REACTIVITY: Follow behavior state
    this.followTarget = null;
    this.followDamping = 0.05;
    this.followActive = false;

    // Movement configuration - Per AESTHETIC_CREATIVE_ROADMAP.md §2.1
    // Idle sweep: 0.4 unit dolly + 5° yaw cycle
    this.config = {
      autoRotate: this.getConfigValue('autoRotate', false), // P0-FIX: Default OFF to prevent "spinning" feel
      rotationSpeed: this.getConfigValue('rotationSpeed', 0.05), // Slower for subtle idle motion
      audioShake: this.getConfigValue('audioShake', true),
      shakeIntensity: this.getConfigValue('shakeIntensity', 0.15), // Gentler shake
      orbitRadius: this.getConfigValue('orbitRadius', 12),
      orbitHeight: this.getConfigValue('orbitHeight', 5),
      lookAtCenter: this.getConfigValue('lookAtCenter', true),
      // Idle motion parameters (cinematic): ±1–2 units dolly over ~20–40s and ±5–10° yaw
      idleDolly: 1.2,
      idleYaw: 10 * Math.PI / 180,  // 10 degrees in radians
      idleMotionSpeed: 0.3  // Period ~21s
    };

    // Store initial camera state if camera exists
    if (this.camera) {
      this.basePosition.copy(this.camera.position);
      this.camera.lookAt(this.baseLookAt);
    }

    // Director Mode: Camera personality settings
    this.mode = 'default';
    this.friction = 0.1;
    this.lookAtDamping = 0.1;
    this.noiseIntensity = 0.1;
    this.noiseFreq = 1.0;

    // PHASE-MOTION: Intensity multipliers per narrative phase
    // Expert Panel recommendation: camera intensity should scale with narrative
    this.phaseIntensityMultipliers = {
      ASCEND: 0.3,    // Frozen world, minimal camera movement
      FRACTURE: 0.6,  // Energy building, moderate intensity
      ECLIPSE: 0.8,   // Breakdown, claustrophobic
      CLIMAX: 1.0,    // Maximum intensity during eruption
      MEMORY: 0.2     // Fade to void, nearly static
    };
    this._phaseIntensity = 0.3;  // Current phase intensity (starts at ASCEND)
    this._targetPhaseIntensity = 0.3;
    this._journeyStateUnsubscribers = [];
    this._journeyStateSetupTimer = null;

    // Setup JourneyState listeners for cross-system coordination
    this._setupJourneyStateListeners();
  }

  /**
   * PHASE-MOTION: Subscribe to JourneyState phase changes
   * Expert Panel recommendation: coordinate camera with narrative arc
   */
  _setupJourneyStateListeners() {
    // Guard for SSR/non-browser environments
    if (typeof window === 'undefined') return;

    // Defer setup to allow JourneyState to initialize first
    this._journeyStateSetupTimer = setTimeout(() => {
      this._journeyStateSetupTimer = null;

      if (this.disposed) {
        return;
      }

      if (!window.JourneyState) {
        if (window.SONOITE_DEBUG) {
          console.log('[CameraManager] JourneyState not available yet');
        }
        return;
      }

      const addJourneyListener = (eventName, handler) => {
        const unsubscribe = window.JourneyState.on(eventName, handler);
        if (typeof unsubscribe === 'function') {
          this._journeyStateUnsubscribers.push(unsubscribe);
        }
      };

      // Phase change handler - adjust intensity multiplier
      addJourneyListener('phase:change', (data) => {
        const phase = data.to;
        const intensity = this.phaseIntensityMultipliers[phase];
        if (intensity !== undefined) {
          this._targetPhaseIntensity = intensity;
          if (window.SONOITE_DEBUG) {
            console.log(`[CameraManager] Phase ${phase}: intensity target -> ${intensity}`);
          }
        }
      });

      // Camera shake request from JourneyState
      addJourneyListener('camera:shake', (data) => {
        this.triggerShake(data.intensity || 0.03, data.duration || 0.4);
      });

      // Camera dolly request from JourneyState
      addJourneyListener('camera:dolly', (data) => {
        const direction = data.direction || 'in';
        const amount = direction === 'in' ? -3 : 3;
        this.dolly(amount, data.duration || 4.0);
      });

      // Unfreeze event - ramp up camera from minimal
      addJourneyListener('unfreeze', () => {
        // Quickly ramp intensity when world unfreezes
        this._targetPhaseIntensity = this.phaseIntensityMultipliers.ASCEND;
      });

      // Reset handler
      addJourneyListener('reset', () => {
        this._phaseIntensity = 0.3;
        this._targetPhaseIntensity = 0.3;
      });

      if (window.SONOITE_DEBUG) {
        console.log('[CameraManager] JourneyState listeners registered');
      }
    }, 100);
  }

  _disposeJourneyStateListeners() {
    if (this._journeyStateSetupTimer) {
      clearTimeout(this._journeyStateSetupTimer);
      this._journeyStateSetupTimer = null;
    }

    this._journeyStateUnsubscribers?.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        if (typeof window !== 'undefined' && window.SONOITE_DEBUG) {
          console.warn('[CameraManager] Failed to unsubscribe JourneyState listener', error);
        }
      }
    });
    this._journeyStateUnsubscribers = [];
  }

  /**
   * Set Camera Mode - Changes camera personality based on journey art direction
   * Enables distinct feels: cinematic_dolly (heavy/smooth) vs handheld_panic (shaky/fast)
   * @param {string} modeName - Camera mode from journey JSON config.camera_mode
   */
  setMode(modeName) {
    this.mode = modeName;

    // Reset physics
    this.friction = 0.1;
    this.noiseIntensity = 0.0;

    switch(modeName) {
      case 'cinematic_dolly':
        // Heavy, smooth, expensive camera feel (like Blade Runner 2049)
        this.friction = 0.02; // Very slippery/smooth
        this.lookAtDamping = 0.05; // Slow focus pull
        this.noiseIntensity = 0.0; // No shake - perfectly smooth
        break;

      case 'handheld_panic':
        // Blair Witch / found footage style
        this.friction = 0.3; // Snappy movements
        this.noiseIntensity = 1.5; // Constant shake
        this.noiseFreq = 2.0; // Fast jitter
        break;

      case 'void_drift':
        // Detached, floaty camera for Track 5
        this.friction = 0.05;      // Slow, smooth glide
        this.lookAtDamping = 0.08; // Gentle focus changes
        this.noiseIntensity = 0.0; // Minimal shake (handled via handheldNoise)
        this.noiseFreq = 0.5;
        break;

      case 'architect':
        // Track 6 "inheritor" mode: deliberate, measured camera with low jitter.
        this.friction = 0.08;
        this.lookAtDamping = 0.07;
        this.noiseIntensity = 0.02;
        this.noiseFreq = 0.8;
        break;

      default:
        // Standard orbit
        this.friction = 0.1;
        this.noiseIntensity = 0.1;
        this.noiseFreq = 1.0;
    }

    console.log(`[Camera] Switched to director mode: ${modeName}`);
  }

  getConfigValue(key, defaultValue) {
    // Simple config getter with fallback to defaults
    if (this.config && Object.prototype.hasOwnProperty.call(this.config, key)) {
      return this.config[key];
    }
    return defaultValue;
  }

  /**
   * MP11: Dual-rate EMA smoothing (fast attack, slow decay)
   * @param {string} key - EMA key (bass/mid/treble/loudness)
   * @param {number} value - Current audio value
   * @returns {number} Smoothed value
   */
  _smooth(key, value) {
    // Defensive guard: ensure _ema exists
    if (!this._ema) {
      this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
      this._emaAttack = 0.6;
      this._emaDecay = 0.2;
    }
    const current = this._ema[key];
    // MP11: Use fast alpha on rise, slow alpha on fall
    const alpha = (value > current) ? this._emaAttack : this._emaDecay;
    this._ema[key] = current * (1 - alpha) + value * alpha;
    return this._ema[key];
  }

  onUpdate(dt, audioData) {
    if (!this.camera || !audioData) return;

    this.time += dt;

    // PHASE-MOTION: Smooth lerp toward target phase intensity
    const intensityLerpFactor = 1.0 - Math.pow(0.05, dt);
    this._phaseIntensity += (this._targetPhaseIntensity - this._phaseIntensity) * intensityLerpFactor;

    // PRIORITY FIX (Dec 3, 2025): Splines must be checked FIRST
    // Previously, followActive blocked splines from ever executing

    // NARRATIVE-SPLINE: Highest priority (cinematic journey moments)
    if (this.splineActive) {
      this.updateSplinePath(dt, audioData);
      return; // Spline controls camera position, skip normal movement
    }

    // CAM-API-01: Update path sequence if active
    if (this.sequenceActive) {
      this.updatePathSequence(dt);
      return; // Skip normal camera movement during sequence
    }

    // AMPLIFIED-REACTIVITY: Update follow behavior if active (lowest priority)
    if (this.followActive && this.followTarget) {
      this.updateFollowBehavior(dt);
      return; // Skip normal camera movement during follow
    }

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audioData.bass || 0));
    const mid = this._smooth('mid', Math.min(1, audioData.mid || 0));
    const treble = this._smooth('treble', Math.min(1, audioData.treble || 0));
    const loudness = this._smooth('loudness', Math.min(1, audioData.loudness || 0));

    // Calculate base orbital position with idle motion
    let targetPosition = this.basePosition.clone();

    if (this.config.autoRotate) {
      const angle = this.time * this.config.rotationSpeed + bass * 0.1;
      const radius = this.config.orbitRadius + mid * 2;

      targetPosition.x = Math.cos(angle) * radius;
      targetPosition.z = Math.sin(angle) * radius;
      targetPosition.y = this.config.orbitHeight + Math.sin(angle * 0.5) * 2;
    }

    // Add idle motion (always active, even without audio)
    const idleTime = this.time * this.config.idleMotionSpeed;

    // 0.4 unit dolly motion (breathing in/out)
    const dollyOffset = Math.sin(idleTime) * this.config.idleDolly;
    const dollyVector = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z
    ).normalize().multiplyScalar(dollyOffset);
    targetPosition.add(dollyVector);

    // 5° yaw cycle (gentle side-to-side)
    targetPosition.x += Math.sin(idleTime * 0.7) * this.config.idleYaw;
    targetPosition.y += Math.cos(idleTime * 0.5) * this.config.idleYaw * 0.3;

    // DOLLY-FIX: Apply orbitRadius even when autoRotate is disabled
    // This ensures dolly() animations actually move the camera position
    if (!this.config.autoRotate && this.config.orbitRadius) {
      const baseDistance = this.basePosition.length();
      if (baseDistance > 0.01) {
        const scaleFactor = this.config.orbitRadius / baseDistance;
        targetPosition.multiplyScalar(scaleFactor);
      }
    }

    // MP11: Enhanced audio-reactive shake with EMA multipliers
    // PHASE-MOTION: Scale by current phase intensity
    const phaseIntensity = this._phaseIntensity || 0.5;
    if (this.config.audioShake && !window.SONOITE_REDUCED_MOTION) {
      // MP11: Base shake from loudness, modified by frequency-specific multipliers
      // PHASE-MOTION: Apply phase intensity as global multiplier
      const baseShake = this.config.shakeIntensity * phaseIntensity;

      // MP11: Apply JSON-configurable multipliers per frequency band
      const shakeX = (Math.random() - 0.5) * baseShake * bass * this.shakeConfig.bass;
      const shakeY = (Math.random() - 0.5) * baseShake * mid * this.shakeConfig.mid;
      const shakeZ = (Math.random() - 0.5) * baseShake * treble * this.shakeConfig.treble;

      // MP11: Add overall loudness influence (also scaled by phase)
      const loudnessShake = loudness * this.shakeConfig.loudness * baseShake * 0.3;
      const randomDir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize().multiplyScalar(loudnessShake);

      targetPosition.add(new THREE.Vector3(shakeX, shakeY, shakeZ).add(randomDir));
    } else if (this.config.audioShake && window.SONOITE_REDUCED_MOTION) {
      // MP11: Reduced-motion mode: zero shake (per spec)
      // No shake applied
    }

    // FULL-OVERHAUL: Add handheld noise from personality
    const handheldIntensity = this._handheldNoise || 0;
    if (handheldIntensity > 0) {
      const noiseOffset = this._getHandheldNoise(this.time, handheldIntensity);
      targetPosition.add(noiseOffset);
    }

    // FULL-OVERHAUL: Process beat detection
    let beatState = null;
    if (this.beatDetector) {
      beatState = this.beatDetector.getState();
      this._processBeatReaction(beatState, dt);

      // Add snare push to position
      if (this.beatReactive.snarePush > 0) {
        const pushDir = new THREE.Vector3(0, 0.5, -1).normalize();
        targetPosition.add(pushDir.multiplyScalar(this.beatReactive.snarePush));
      }
    }

    // CINEMATIC-OVERHAUL: Add triggered shake offset
    const shakeOffset = this._updateActiveShake(dt);
    targetPosition.add(shakeOffset);

    // VICTIM-CAM: Add yank offset (Track 5 bass-reactive gravity pull)
    const yankOffset = this._updateActiveYank(dt);
    targetPosition.add(yankOffset);

    // CLIMAX-SIGNATURE: Add vertigo offset (spline-safe, temporary)
    const vertigoOffset = this._updateActiveVertigo(dt, targetPosition);
    targetPosition.add(vertigoOffset);

    // JOURNEY-FIX: Update dolly animation
    this._updateActiveDolly(dt);

    // CLIMAX-FIX: Update FOV animation
    this._updateActiveFOV(dt);

    // FORWARD-TRAVEL: Constant forward drift toward center (for cinematic journeys)
    const forwardDrift = this._forwardDrift || 0;
    if (forwardDrift > 0 && !this.sequenceActive) {
      // Get direction toward look target and move forward
      const forwardDir = this.baseLookAt.clone().sub(this.camera.position).normalize();
      const driftAmount = forwardDrift * dt * 60; // Normalize to ~60fps
      this.camera.position.add(forwardDir.multiplyScalar(driftAmount));
    }

    // Smooth camera movement (lerp to avoid jarring transitions)
    this.camera.position.lerp(targetPosition, dt * 2);

    // Update look-at target with personality-driven drift
    if (this.config.lookAtCenter) {
      const lookTarget = this.baseLookAt.clone();
      const driftAmount = this._lookAtDrift || 0.3;

      // Add subtle look-at movement based on audio
      lookTarget.x += Math.sin(this.time * 0.3) * mid * driftAmount;
      lookTarget.y += Math.cos(this.time * 0.2) * treble * driftAmount * 0.6;
      lookTarget.z += Math.sin(this.time * 0.4) * bass * driftAmount * 0.8;

      this.camera.lookAt(lookTarget);
    }

    // FULL-OVERHAUL: Enhanced FOV with personality + beat detection
    // P2-T5-3: Skip personality FOV when animated FOV or spline FOV keyframes are active
    const fovAnimationActive = (this._activeFOVAnimation !== null && this._activeFOVAnimation !== undefined) ||
      (this._activeVertigo !== null && this._activeVertigo !== undefined);
    const splineFovActive = this.splineActive && this.splineFovKeyframes;

    if (this.camera.isPerspectiveCamera && !fovAnimationActive && !splineFovActive) {
      const baseFov = this._fovBase || 75;
      const breathAmp = this._fovBreathAmp || 3;

      // FOV breathing (slow oscillation)
      const fovBreath = Math.sin(this.time * 0.5) * breathAmp;

      // Loudness modulation
      const fovLoudness = loudness * 3;

      // Beat-reactive punch (from kick detection)
      const fovKickPunch = this.beatReactive.kickFovPunch || 0;

      this.camera.fov = baseFov + fovBreath + fovLoudness + fovKickPunch;
      this.camera.updateProjectionMatrix();
    }
  }

  // Method to set camera position manually
  setCameraPosition(x, y, z) {
    this.basePosition.set(x, y, z);
    if (this.camera) {
      this.camera.position.copy(this.basePosition);
    }
  }

  // Method to set look-at target manually
  setLookAtTarget(x, y, z) {
    this.baseLookAt.set(x, y, z);
    if (this.camera && this.config.lookAtCenter) {
      this.camera.lookAt(this.baseLookAt);
    }
  }

  // Enable/disable auto rotation
  setAutoRotate(enabled) {
    this.config.autoRotate = enabled;
  }

  // Enable/disable audio shake
  setAudioShake(enabled) {
    this.config.audioShake = enabled;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * FULL-OVERHAUL: Set beat detector reference
   * @param {BeatDetector} detector - BeatDetector instance
   */
  setBeatDetector(detector) {
    this.beatDetector = detector;
    if (window.SONOITE_DEBUG) {
      console.log('[CameraManager] Beat detector connected');
    }
  }

  /**
   * FULL-OVERHAUL: Apply track-specific camera personality
   * @param {string} trackSlug - Track slug (e.g., 'paralisia-do-sono')
   */
  setPersonality(trackSlug) {
    const personality = this.personalities[trackSlug];

    if (!personality) {
      console.warn(`[CameraManager] No personality for track: ${trackSlug}, using default`);
      this.activePersonality = null;
      return;
    }

    this.activePersonality = personality;

    // Apply personality settings
    this.config.rotationSpeed = personality.orbitSpeed;
    this.config.orbitRadius = personality.orbitRadius;
    this.config.orbitHeight = personality.orbitHeight;
    this.config.autoRotate = personality.orbitSpeed > 0;
    this.shakeConfig.bass = personality.shakeBass;

    // Set camera mode
    this.setMode(personality.mode);

    // Store FOV settings
    this._fovBase = personality.fovBase;
    this._fovBreathAmp = personality.fovBreathAmp;
    this._fovKickPunch = personality.fovKickPunch;
    this._handheldNoise = personality.handheldNoise;
    this._lookAtDrift = personality.lookAtDrift;

    // FORWARD-TRAVEL: Store forward drift for cinematic journeys
    this._forwardDrift = personality.forwardDrift || 0;

    // Override autoRotate if explicitly set in personality
    if (personality.autoRotate !== undefined) {
      this.config.autoRotate = personality.autoRotate;
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Personality applied: "${personality.name}" for ${trackSlug}, forwardDrift=${this._forwardDrift}`);
    }
  }

  /**
   * FULL-OVERHAUL: Get handheld noise offset (Perlin-like)
   */
  _getHandheldNoise(time, intensity) {
    if (window.SONOITE_REDUCED_MOTION || intensity <= 0) return new THREE.Vector3();

    // Multi-frequency noise for organic handheld feel
    const x = Math.sin(time * 1.7) * 0.6 + Math.sin(time * 4.3) * 0.3 + Math.sin(time * 7.1) * 0.1;
    const y = Math.sin(time * 1.3) * 0.6 + Math.sin(time * 3.7) * 0.3 + Math.sin(time * 6.3) * 0.1;
    const z = Math.sin(time * 1.1) * 0.4 + Math.sin(time * 2.9) * 0.3 + Math.sin(time * 5.7) * 0.1;

    return new THREE.Vector3(x, y, z).multiplyScalar(intensity);
  }

  /**
   * FULL-OVERHAUL: Process beat detection for camera reactions
   */
  _processBeatReaction(beatState, dt) {
    if (!beatState) return;

    // Trigger FOV punch on kick
    if (beatState.kick) {
      const punchAmount = this._fovKickPunch || 5;
      this.beatReactive.kickFovPunch = punchAmount * beatState.kickIntensity;
    }

    // Trigger position push on snare
    if (beatState.snare) {
      this.beatReactive.snarePush = 0.3 * beatState.snareIntensity;
    }

    // Decay
    this.beatReactive.kickFovPunch *= (1 - this.beatReactive.kickDecay);
    this.beatReactive.snarePush *= (1 - this.beatReactive.snareDecay);

    // Clamp small values to zero
    if (this.beatReactive.kickFovPunch < 0.01) this.beatReactive.kickFovPunch = 0;
    if (this.beatReactive.snarePush < 0.001) this.beatReactive.snarePush = 0;
  }

  /**
   * MP11: Set camera behavior mode
   * @param {string} behavior - orbit|witness|architect|follow|stationary
   * @param {Object} params - Behavior-specific parameters
   */
  setBehavior(behavior, params = {}) {
    this.behaviorMode = behavior;

    switch (behavior) {
      case 'witness':
        // MP11: Distant observer - high orbit, minimal movement
        this.config.orbitRadius = params.radius || 20;
        this.config.orbitHeight = params.height || 10;
        this.config.rotationSpeed = params.speed || 0.01; // Very slow
        this.config.audioShake = params.shake !== undefined ? params.shake : false;
        this.config.autoRotate = true;
        break;

      case 'architect':
        // MP11: Close observer - low orbit, methodical movement
        this.config.orbitRadius = params.radius || 8;
        this.config.orbitHeight = params.height || 3;
        this.config.rotationSpeed = params.speed || 0.03; // Moderate
        this.config.audioShake = params.shake !== undefined ? params.shake : false;
        this.config.autoRotate = true;
        break;

      case 'follow':
        // MP11: Follow target (handled by setFollowTarget)
        this.setFollowTarget(params.target, params.damping);
        break;

      case 'stationary':
        // MP11: Fixed position
        this.config.autoRotate = false;
        this.config.audioShake = params.shake !== undefined ? params.shake : true;
        if (params.position) {
          this.setCameraPosition(...params.position);
        }
        break;

      case 'orbit':
      default:
        // MP11: Default orbit behavior
        this.config.orbitRadius = params.radius || 12;
        this.config.orbitHeight = params.height || 5;
        this.config.rotationSpeed = params.speed || 0.05;
        this.config.audioShake = params.shake !== undefined ? params.shake : true;
        this.config.autoRotate = true;
        break;
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[MP11] Camera behavior set to: ${behavior}`, params);
    }
  }

  /**
   * AMPLIFIED-REACTIVITY: Set follow target
   * @param {THREE.Object3D|THREE.Vector3} target - Target to follow
   * @param {number} damping - Follow damping (0.01-0.2, lower = smoother)
   */
  setFollowTarget(target, damping = 0.05) {
    this.followTarget = target;
    this.followDamping = damping;
    this.followActive = !!target;

    // MP-ACCESS-05: Halve damping in reduced-motion mode
    if (window.SONOITE_REDUCED_MOTION) {
      this.followDamping *= 0.5;
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Follow ${this.followActive ? 'enabled' : 'disabled'}, damping: ${this.followDamping}`);
    }
  }

  /**
   * AMPLIFIED-REACTIVITY: Update follow behavior
   */
  updateFollowBehavior(dt) {
    if (!this.followTarget || !this.camera) return;

    // Get target position (handle both Object3D and Vector3)
    const targetPos = this.followTarget.position || this.followTarget;

    // Follow with smooth damping
    const offset = new THREE.Vector3(0, 3, 8); // Offset behind and above target
    const desiredPosition = targetPos.clone().add(offset);

    // Lerp camera position to desired position
    this.camera.position.lerp(desiredPosition, this.followDamping);

    // Look at target
    this.camera.lookAt(targetPos);
  }

  /**
   * AMPLIFIED-REACTIVITY: Disable follow behavior
   */
  disableFollow() {
    this.followActive = false;
    this.followTarget = null;
  }

  /**
   * CINEMATIC-OVERHAUL: Trigger immediate camera shake
   * Called from journey moments for dramatic impact
   * @param {number} intensity - Shake intensity (0.01 = subtle, 0.1 = heavy)
   * @param {number} duration - Shake duration in seconds
   */
  triggerShake(intensity = 0.03, duration = 0.4) {
    // Respect reduced motion setting
    if (window.SONOITE_REDUCED_MOTION) return;

    // Store current position
    const originalPosition = this.camera.position.clone();
    const startTime = this.time;

    // Create shake effect
    this._activeShake = {
      intensity,
      duration,
      startTime,
      originalPosition
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Shake triggered: intensity=${intensity}, duration=${duration}s`);
    }
  }

  /**
   * JOURNEY-FIX: Animated camera dolly (move toward/away from target)
   * @param {number} amount - Dolly amount (negative = closer, positive = farther)
   * @param {number} duration - Animation duration in seconds
   * @param {string} easing - Easing function name
   */
  dolly(amount, duration = 3.0, easing = 'linear') {
    if (!this.camera) return;

    const startRadius = this.config?.orbitRadius || 15;
    const targetRadius = startRadius + amount;
    const startTime = this.time;

    // Store dolly animation state
    this._activeDolly = {
      startRadius,
      targetRadius,
      duration,
      startTime,
      easing
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Dolly: ${startRadius} -> ${targetRadius} over ${duration}s`);
    }
  }

  /**
   * JOURNEY-FIX: Update active dolly animation
   */
  _updateActiveDolly(dt) {
    if (!this._activeDolly || !this.config) return;

    const elapsed = this.time - this._activeDolly.startTime;
    const progress = Math.min(elapsed / this._activeDolly.duration, 1.0);

    // Apply easing
    let easedProgress = progress;
    if (this._activeDolly.easing === 'easeOutExpo') {
      easedProgress = 1 - Math.pow(2, -10 * progress);
    } else if (this._activeDolly.easing === 'easeInOutSine') {
      easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
    }

    // Interpolate radius
    const newRadius = this._activeDolly.startRadius +
      (this._activeDolly.targetRadius - this._activeDolly.startRadius) * easedProgress;

    this.config.orbitRadius = newRadius;

    if (progress >= 1.0) {
      this._activeDolly = null;
    }
  }

  /**
   * VICTIM-CAM: Yank camera toward a point on bass transient
   * External auditor concept: "camera drifts smoothly but gets YANKED violently
   * towards the center on bass transients, then struggles to drift back"
   *
   * @param {THREE.Vector3|Array} target - Point to yank toward (e.g., void center)
   * @param {number} intensity - Yank strength (0-1, default 0.5)
   * @param {number} recovery - Recovery duration in seconds (default 2.0)
   */
  yank(target, intensity = 0.5, recovery = 2.0) {
    if (!this.camera) return;

    // Respect reduced motion
    if (window.SONOITE_REDUCED_MOTION) return;

    // Convert target to Vector3 if array
    const targetPos = Array.isArray(target)
      ? new THREE.Vector3(target[0], target[1], target[2])
      : target;

    // Calculate yank parameters
    const yankDistance = intensity * 2.5;  // Max ~2.5 units at full intensity
    const yankDuration = 0.1;              // 100ms - quick violent pull

    // Get direction from camera to target
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.camera.position)
      .normalize();

    // Store current state for yank animation
    this._activeYank = {
      startPosition: this.camera.position.clone(),
      direction: direction,
      yankDistance: yankDistance,
      yankDuration: yankDuration,
      recovery: recovery,
      startTime: this.time,
      phase: 'yank'  // 'yank' then 'recover'
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Yank toward [${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)}], intensity=${intensity.toFixed(2)}`);
    }
  }

  /**
   * VICTIM-CAM: Update active yank animation
   * Two phases: quick yank in, slow recovery out
   */
  _updateActiveYank(dt) {
    if (!this._activeYank || !this.camera) return new THREE.Vector3();

    const elapsed = this.time - this._activeYank.startTime;
    const yank = this._activeYank;

    if (yank.phase === 'yank') {
      // Phase 1: Quick violent pull (100ms)
      const progress = Math.min(elapsed / yank.yankDuration, 1.0);

      // Ease out for snappy feel - fast at start, slows at end
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Offset toward target
      const offset = yank.direction.clone().multiplyScalar(yank.yankDistance * easedProgress);

      if (progress >= 1.0) {
        // Transition to recovery phase
        yank.phase = 'recover';
        yank.recoveryStartTime = this.time;
        yank.yankOffset = offset.clone();  // Store peak offset
      }

      return offset;
    } else if (yank.phase === 'recover') {
      // Phase 2: Slow struggle back (2s default)
      const recoveryElapsed = this.time - yank.recoveryStartTime;
      const recoveryProgress = Math.min(recoveryElapsed / yank.recovery, 1.0);

      // Ease in-out sine for organic "struggle" feel
      const easedRecovery = -(Math.cos(Math.PI * recoveryProgress) - 1) / 2;

      // Lerp from yank offset back to zero
      const offset = yank.yankOffset.clone().multiplyScalar(1 - easedRecovery);

      if (recoveryProgress >= 1.0) {
        // Yank complete
        this._activeYank = null;
        return new THREE.Vector3();
      }

      return offset;
    }

    return new THREE.Vector3();
  }

  /**
   * CLIMAX-SIGNATURE: Start a short vertigo / dolly-zoom style effect.
   * Safe during spline playback (adds an offset, does not stop spline).
   *
   * @param {THREE.Vector3|Array} target - Point to dolly toward (e.g., void center)
   * @param {number} distance - Dolly distance (positive toward target, negative away)
   * @param {number} fovDelta - FOV delta applied at peak (positive widen, negative narrow)
   * @param {number} duration - Duration in seconds
   * @param {string} easing - Easing name (applied to envelope)
   */
  vertigo(target, distance = 1.6, fovDelta = 18, duration = 2.6, easing = 'easeInOutSine') {
    if (!this.camera) return;

    const safeDuration = Number.isFinite(duration) ? Math.max(0.1, duration) : 2.6;
    const safeDistance = Number.isFinite(distance) ? distance : 1.6;
    const safeFovDelta = Number.isFinite(fovDelta) ? fovDelta : 18;

    if (Array.isArray(target) && target.length >= 3) {
      this._vertigoTarget.set(target[0], target[1], target[2]);
    } else if (target?.isVector3) {
      this._vertigoTarget.copy(target);
    } else {
      this._vertigoTarget.set(0, 0, 0);
    }

    // Avoid fighting other FOV animations during the signature beat.
    this._activeFOVAnimation = null;

    this._activeVertigo = {
      startTime: this.time,
      duration: safeDuration,
      distance: safeDistance,
      fovDelta: safeFovDelta,
      easing,
      baseFov: this.camera.isPerspectiveCamera ? this.camera.fov : null,
      lastFovOffset: 0
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Vertigo: distance=${safeDistance}, fovDelta=${safeFovDelta}, duration=${safeDuration}s`);
    }
  }

  _applyVertigoEase(t, easing) {
    switch (easing) {
      case 'easeIn':
      case 'easeInQuad':
        return t * t;
      case 'easeOut':
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t);
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'easeInOutSine':
        return -(Math.cos(Math.PI * t) - 1) / 2;
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * CLIMAX-SIGNATURE: Update active vertigo.
   * Returns a position offset vector; also applies a temporary FOV offset.
   *
   * @param {number} dt
   * @param {THREE.Vector3|null} positionOverride - Optional base position (for spline playback)
   * @returns {THREE.Vector3}
   */
  _updateActiveVertigo(dt, positionOverride = null) {
    if (!this._activeVertigo || !this.camera) return this._vertigoOffset.set(0, 0, 0);

    const v = this._activeVertigo;
    const elapsed = this.time - v.startTime;
    const progress = Math.min(elapsed / v.duration, 1.0);

    if (progress >= 1.0) {
      // Restore baseline FOV (remove last offset)
      if (this.camera.isPerspectiveCamera && typeof v.lastFovOffset === 'number') {
        this.camera.fov = THREE.MathUtils.clamp(this.camera.fov - v.lastFovOffset, 20, 120);
        this.camera.updateProjectionMatrix();
      }

      this._activeVertigo = null;
      return this._vertigoOffset.set(0, 0, 0);
    }

    // Envelope: 0 -> 1 -> 0
    const phase = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const envelope = this._applyVertigoEase(phase, v.easing);

    // Direction toward target from the provided base position
    const basePos = positionOverride || this.camera.position;
    this._vertigoDirection.copy(this._vertigoTarget).sub(basePos);

    if (this._vertigoDirection.lengthSq() > 0.000001) {
      this._vertigoDirection.normalize();
    } else {
      this._vertigoDirection.set(0, 0, -1);
    }

    this._vertigoOffset.copy(this._vertigoDirection).multiplyScalar(v.distance * envelope);

    // Apply temporary FOV offset without accumulating (handles spline keyframes too)
    if (this.camera.isPerspectiveCamera && typeof v.fovDelta === 'number') {
      // If some other system overwrote FOV (e.g., spline keyframes), re-anchor baseFov.
      if (typeof v.baseFov === 'number') {
        const expected = v.baseFov + (v.lastFovOffset || 0);
        if (Math.abs(this.camera.fov - expected) > 0.5) {
          v.baseFov = this.camera.fov;
          v.lastFovOffset = 0;
        }
      } else {
        v.baseFov = this.camera.fov;
        v.lastFovOffset = 0;
      }

      const newOffset = v.fovDelta * envelope;
      this.camera.fov = THREE.MathUtils.clamp(v.baseFov + newOffset, 20, 120);
      this.camera.updateProjectionMatrix();
      v.lastFovOffset = newOffset;
    }

    return this._vertigoOffset;
  }

  /**
   * CLIMAX-FIX: Animate FOV for dramatic zoom effects
   * Used for climax dive (8:04) and tension building
   * @param {number} targetFOV - Target FOV value (degrees)
   * @param {number} duration - Animation duration in seconds
   * @param {string} easing - Easing function name
   */
  animateFOV(targetFOV, duration = 1.0, easing = 'linear') {
    if (!this.camera?.isPerspectiveCamera) return;

    const startFOV = this.camera.fov;
    const startTime = this.time;

    this._activeFOVAnimation = {
      startFOV,
      targetFOV,
      duration,
      startTime,
      easing
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] FOV animation: ${startFOV.toFixed(1)} -> ${targetFOV} over ${duration}s`);
    }
  }

  /**
   * CLIMAX-FIX: Update active FOV animation
   */
  _updateActiveFOV(dt) {
    if (!this._activeFOVAnimation || !this.camera) return;

    const elapsed = this.time - this._activeFOVAnimation.startTime;
    const progress = Math.min(elapsed / this._activeFOVAnimation.duration, 1.0);

    // Apply easing
    let easedProgress = progress;
    switch (this._activeFOVAnimation.easing) {
      case 'easeIn':
        easedProgress = progress * progress;
        break;
      case 'easeOut':
        easedProgress = 1 - Math.pow(1 - progress, 2);
        break;
      case 'easeInCubic':
        easedProgress = progress * progress * progress;
        break;
      case 'easeOutCubic':
        easedProgress = 1 - Math.pow(1 - progress, 3);
        break;
      case 'easeInExpo':
        easedProgress = progress === 0 ? 0 : Math.pow(2, 10 * progress - 10);
        break;
      case 'easeOutExpo':
        easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        break;
      case 'easeInOutSine':
        easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
        break;
      default:
        easedProgress = progress; // linear
    }

    const newFOV = this._activeFOVAnimation.startFOV +
      (this._activeFOVAnimation.targetFOV - this._activeFOVAnimation.startFOV) * easedProgress;

    this.camera.fov = newFOV;
    this.camera.updateProjectionMatrix();

    if (progress >= 1.0) {
      // FOV-PERSIST: Update _fovBase so personality system uses new FOV as baseline
      this._fovBase = this._activeFOVAnimation.targetFOV;
      this._activeFOVAnimation = null;
    }
  }

  /**
   * CINEMATIC-OVERHAUL: Update active shake effect
   * Called during onUpdate to apply shake offset
   */
  _updateActiveShake(dt) {
    if (!this._activeShake || !this.camera) return new THREE.Vector3();

    const elapsed = this.time - this._activeShake.startTime;
    const progress = elapsed / this._activeShake.duration;

    if (progress >= 1.0) {
      // Shake complete
      this._activeShake = null;
      return new THREE.Vector3();
    }

    // Decay intensity over time (exponential falloff)
    const decayedIntensity = this._activeShake.intensity * (1 - progress) * (1 - progress);

    // Random offset with high frequency for punchy feel
    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 2 * decayedIntensity,
      (Math.random() - 0.5) * 2 * decayedIntensity,
      (Math.random() - 0.5) * 2 * decayedIntensity
    );

    return shakeOffset;
  }

  /**
   * NARRATIVE-SPLINE: Best-effort access to song time (seconds)
   * NOTE: Audio time is the only seek-stable clock in Sonoite.
   */
  _getSongTime() {
    if (typeof window === 'undefined') return null;

    const audioManager = window.SonoiteExperience?.audioManager;
    if (!audioManager || typeof audioManager.getCurrentTime !== 'function') return null;

    const t = audioManager.getCurrentTime();
    return Number.isFinite(t) ? t : null;
  }

  /**
   * NARRATIVE-SPLINE: Start a smooth camera path along a CatmullRomCurve3
   * This is the key to cinematic narrative - camera travels through defined waypoints
   * @param {Object} params - Spline configuration
   * @param {Array} params.waypoints - Array of [x,y,z] positions (minimum 2)
   * @param {number} params.duration - Total duration in seconds
   * @param {string} params.easing - 'linear', 'easeInOut', 'easeOut'
   * @param {boolean} params.lookAhead - Camera looks toward travel direction
   * @param {Array} params.lookAt - Optional fixed look-at point [x,y,z]
   * @param {boolean} params.closed - Whether spline loops back (default false)
   */
  startSplinePath(params = {}) {
    const wasSplineActive = this.splineActive;
    const waypoints = params.waypoints || [];
    if (waypoints.length < 2) {
      console.warn('[CameraManager] Spline needs at least 2 waypoints');
      return;
    }

    // Convert waypoints to THREE.Vector3 (handles arrays, plain objects, or Vector3)
    const points = waypoints.map(wp => {
      if (Array.isArray(wp)) {
        return new THREE.Vector3(wp[0], wp[1], wp[2]);
      } else if (wp && typeof wp.clone === 'function') {
        return wp.clone();
      } else {
        // Plain object {x, y, z} from JSON
        return new THREE.Vector3(wp.x || 0, wp.y || 0, wp.z || 0);
      }
    });

    // Create CatmullRomCurve3 for smooth interpolation
    this.splinePath = new THREE.CatmullRomCurve3(
      points,
      params.closed || false,  // closed loop
      'centripetal',           // curve type (centripetal avoids cusps)
      0.5                      // tension
    );

    this.splineDuration = params.duration || 30;
    this.splineEasing = params.easing || 'linear';
    this.splineLookAhead = params.lookAhead !== false;

    // LOOKAT-FIX: Support both single vector [x,y,z] and per-waypoint array [[x,y,z], ...]
    if (params.lookAt) {
      if (Array.isArray(params.lookAt[0])) {
        // Per-waypoint lookAt array - create interpolatable curve
        this.splineFixedLookAt = null;
        this.splineLookAtCurve = new THREE.CatmullRomCurve3(
          params.lookAt.map(pt => new THREE.Vector3(pt[0], pt[1], pt[2])),
          params.closed || false,
          'centripetal',
          0.5
        );
      } else {
        // Single lookAt vector [x, y, z]
        this.splineFixedLookAt = new THREE.Vector3(params.lookAt[0], params.lookAt[1], params.lookAt[2]);
        this.splineLookAtCurve = null;
      }
    } else {
      this.splineFixedLookAt = null;
      this.splineLookAtCurve = null;
    }
    // Optional FOV keyframes [{t:0..1, value:fovDeg}, ...]
    if (Array.isArray(params.fovKeyframes) && params.fovKeyframes.length > 0) {
      this.splineFovKeyframes = [...params.fovKeyframes].sort((a, b) => a.t - b.t);
      // Deterministic FOV authority: explicit spline keyframes own FOV lane.
      this._activeFOVAnimation = null;
    } else {
      this.splineFovKeyframes = null;
    }

    this.splineStartPerfTime = performance.now() / 1000; // Convert to seconds
    this.splineStartTime = this.splineStartPerfTime;
    const startSongTime = Number.isFinite(params.startSongTime) ? params.startSongTime : this._getSongTime();
    this.splineStartSongTime = Number.isFinite(startSongTime) ? startSongTime : null;

    this.splineActive = true;

    // SPLINE-PRIORITY FIX (Dec 3, 2025): Disable follow mode when starting spline
    // This ensures spline takes control even if follow was previously active
    if (this.followActive) {
      if (window.SONOITE_DEBUG) {
        console.log('[CameraManager] Disabling follow mode to allow spline path');
      }
      this.followActive = false;
      this.followTarget = null;
    }

    // Freeze OrbitControls during spline
    if (window.SonoiteExperience?.controls && this.orbitControlsState === null) {
      this.orbitControlsState = window.SonoiteExperience.controls.enabled;
    }
    if (window.SonoiteExperience?.controls) {
      window.SonoiteExperience.controls.enabled = false;
    }

    // Disable auto-rotate and forward drift during spline
    if (!wasSplineActive) {
      this._preSplineAutoRotate = this.config.autoRotate;
      this._preSplineForwardDrift = this._forwardDrift;
    }
    this.config.autoRotate = false;
    this._forwardDrift = 0;

    if (window.SONOITE_DEBUG) {
      const startInfo = this.splineStartSongTime !== null ? ` start=${this.splineStartSongTime.toFixed(2)}s` : '';
      console.log(`[CameraManager] Spline path started: ${points.length} waypoints over ${this.splineDuration}s.${startInfo}`);
    }
  }

  /**
   * TRACK5: Start act-specific camera spline
   */
  startActSpline(actName, splineData) {
    if (!splineData) {
      console.warn(`[CameraManager] No spline data for act: ${actName}`);
      return;
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[CameraManager] Starting ${actName} spline`);
    }

    this.startSplinePath(splineData);
  }

  /**
   * TRACK5: Sequential act trigger based on audio time
   */
  triggerTrack5Acts(audioTime) {
    const splines = window.TRACK5_CAMERA_SPLINES || TRACK5_CAMERA_SPLINES;

    if (audioTime >= 0 && audioTime < 96 && this._track5CurrentAct !== 'ACT1') {
      this._track5CurrentAct = 'ACT1';
      this.startActSpline('ACT1_VOID', splines.ACT1_VOID);
    }
    else if (audioTime >= 96 && audioTime < 216 && this._track5CurrentAct !== 'ACT2') {
      this._track5CurrentAct = 'ACT2';
      this.startActSpline('ACT2_AWAKENING', splines.ACT2_AWAKENING);
    }
    else if (audioTime >= 216 && audioTime < 281 && this._track5CurrentAct !== 'ACT3') {
      this._track5CurrentAct = 'ACT3';
      this.startActSpline('ACT3_WANTING_CLIMAX', splines.ACT3_WANTING_CLIMAX);
    }
    else if (audioTime >= 281 && audioTime < 432 && this._track5CurrentAct !== 'ACT4') {
      this._track5CurrentAct = 'ACT4';
      this.startActSpline('ACT4_RELEASE', splines.ACT4_RELEASE);
    }
    else if (audioTime >= 432 && this._track5CurrentAct !== 'ACT5') {
      this._track5CurrentAct = 'ACT5';
      this.startActSpline('ACT5_ERASURE', splines.ACT5_ERASURE);
    }
  }

  resetTrack5Acts() {
    this._track5CurrentAct = null;
  }

  /**
   * NARRATIVE-SPLINE: Update camera position along spline
   * Applies 30% audio reactivity as additive layer on top of narrative path
   */
  updateSplinePath(dt, audioData) {
    if (!this.splinePath || !this.camera) return;

    const songTime = this._getSongTime();
    const nowPerf = performance.now() / 1000;
    const elapsed = (songTime !== null && this.splineStartSongTime !== null)
      ? songTime - this.splineStartSongTime
      : nowPerf - this.splineStartPerfTime;

    const rawProgress = this.splineDuration > 0 ? elapsed / this.splineDuration : 1.0;
    const clampedProgress = THREE.MathUtils.clamp(rawProgress, 0, 1);
    const progress = this._applySplineEasing(clampedProgress, this.splineEasing);

    // Get position on spline (0-1)
    const position = this.splinePath.getPointAt(progress);

    // REACTIVE LAYER (30%): Add subtle audio-driven offset
    if (audioData) {
      const bass = this._smooth('bass', audioData.bass || 0);
      const treble = this._smooth('treble', audioData.treble || 0);

      // Subtle vertical bob on bass, lateral sway on treble
      position.y += bass * 0.15;
      position.x += Math.sin(this.time * 2) * treble * 0.08;
    }

    // VICTIM-CAM: Apply yank offset during spline playback (Track 5)
    // This enables bass-transient "gravity pulls" while narrative splines are active.
    const yankOffset = this._updateActiveYank(dt);
    position.add(yankOffset);

    // CLIMAX-SIGNATURE: Apply vertigo offset during spline playback.
    const vertigoOffset = this._updateActiveVertigo(dt, position);
    position.add(vertigoOffset);

    // Set camera position
    this.camera.position.copy(position);

    // Handle look direction
    if (this.splineFixedLookAt) {
      // Fixed look-at point (e.g., always look at egg crystal)
      this.camera.lookAt(this.splineFixedLookAt);
    } else if (this.splineLookAtCurve) {
      // LOOKAT-FIX: Interpolated lookAt along curve (per-waypoint targets)
      const lookTarget = this.splineLookAtCurve.getPointAt(progress);
      this.camera.lookAt(lookTarget);
    } else if (this.splineLookAhead) {
      // Look ahead on spline for natural travel feel
      const lookAheadT = Math.min(progress + 0.02, 1.0);
      const lookTarget = this.splinePath.getPointAt(lookAheadT);
      this.camera.lookAt(lookTarget);
    }

    // FOV keyframes (if provided)
    if (this.splineFovKeyframes && this.splineFovKeyframes.length > 0) {
      const keys = this.splineFovKeyframes;
      let fov = this.camera.fov;

      if (progress <= keys[0].t) {
        fov = keys[0].value;
      } else if (progress >= keys[keys.length - 1].t) {
        fov = keys[keys.length - 1].value;
      } else {
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i];
          const b = keys[i + 1];
          if (progress >= a.t && progress <= b.t) {
            const span = (progress - a.t) / (b.t - a.t);
            fov = THREE.MathUtils.lerp(a.value, b.value, span);
            break;
          }
        }
      }

      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // Add triggered shake even during spline
    const shakeOffset = this._updateActiveShake(dt);
    this.camera.position.add(shakeOffset);

    // Add handheld noise for organic feel
    const handheldIntensity = this._handheldNoise || 0;
    if (handheldIntensity > 0) {
      const noiseOffset = this._getHandheldNoise(this.time, handheldIntensity * 0.5);
      this.camera.position.add(noiseOffset);
    }

    // P2-T5-3: Allow FOV animations to run during spline playback
    // Only apply if no spline FOV keyframes are controlling FOV
    if (!this.splineFovKeyframes || this.splineFovKeyframes.length === 0) {
      this._updateActiveFOV(dt);
    }

    // P2-T5-3: Allow dolly animations to update orbitRadius during spline
    // (Dolly affects orbitRadius for post-spline positioning, not spline position itself)
    this._updateActiveDolly(dt);

    // Finalize spline after applying the correct final pose.
    if (rawProgress >= 1.0) {
      this.endSplinePath();
    }
  }

  /**
   * NARRATIVE-SPLINE: Apply easing to spline progress
   */
  _applySplineEasing(t, type) {
    switch (type) {
      case 'easeInOut':
      case 'easeInOutQuad': // HOTFIX-3: Support journey JSON easing strings
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'easeInOutSine': // HOTFIX-3: Support journey JSON easing strings
        return -(Math.cos(Math.PI * t) - 1) / 2;
      case 'easeOut':
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t);
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeIn':
      case 'easeInQuad':
        return t * t;
      case 'easeInCubic':
        return t * t * t;
      default:
        return t; // linear
    }
  }

  /**
   * NARRATIVE-SPLINE: End spline path and restore normal controls
   */
  endSplinePath() {
    this.splineActive = false;
    this.splinePath = null;
    this.splineFovKeyframes = null;
    this.splineStartTime = 0;
    this.splineStartPerfTime = 0;
    this.splineStartSongTime = null;
    // LOOKAT-FIX: Clean up lookAt state
    this.splineFixedLookAt = null;
    this.splineLookAtCurve = null;

    // Restore controls
    if (window.SonoiteExperience?.controls && this.orbitControlsState !== null) {
      window.SonoiteExperience.controls.enabled = this.orbitControlsState;
      this.orbitControlsState = null;
    }

    // Restore auto-rotate and forward drift
    if (this._preSplineAutoRotate !== undefined) {
      this.config.autoRotate = this._preSplineAutoRotate;
      this._preSplineAutoRotate = undefined;
    }
    if (this._preSplineForwardDrift !== undefined) {
      this._forwardDrift = this._preSplineForwardDrift;
      this._preSplineForwardDrift = undefined;
    }

    if (window.SONOITE_DEBUG) {
      console.log('[CameraManager] Spline path completed');
    }
  }

  /**
   * NARRATIVE-SPLINE: Add a waypoint during runtime (for dynamic paths)
   */
  addSplineWaypoint(position) {
    if (!this.splinePath) return;

    const point = Array.isArray(position)
      ? new THREE.Vector3(position[0], position[1], position[2])
      : position.clone();

    // Get current points and add new one
    const points = this.splinePath.points.slice();
    points.push(point);

    // Recreate curve with new points
    this.splinePath = new THREE.CatmullRomCurve3(
      points,
      this.splinePath.closed,
      'centripetal',
      0.5
    );
  }

  onDispose() {
    this._disposeJourneyStateListeners();

    // Reset camera to a neutral position if needed
    if (this.camera) {
      this.camera.position.set(0, 5, 10);
      this.camera.lookAt(0, 0, 0);
      if (this.camera.isPerspectiveCamera) {
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
      }
    }

    // Clear follow state
    this.disableFollow();

    // Clear any active shake
    this._activeShake = null;
    this._activeVertigo = null;

    // Clear spline state
    this.splineActive = false;
    this.splinePath = null;
  }

  /**
   * CAM-API-01: Add scripted path sequence
   * @param {Array} sequence - Array of {type:'dolly'|'yaw', value:number, duration:number, ease?:'linear'|'smooth'}
   */
  addPathSequence(sequence) {
    this.pathSequence = sequence.map((step, index) => ({
      ...step,
      startTime: sequence.slice(0, index).reduce((sum, s) => sum + s.duration, 0),
      ease: step.ease || 'smooth'
    }));

    // Freeze OrbitControls if available
    if (window.SonoiteExperience?.controls) {
      this.orbitControlsState = window.SonoiteExperience.controls.enabled;
      window.SonoiteExperience.controls.enabled = false;
    }

    this.sequenceActive = true;
    this.sequenceStartTime = this.time;
    this.sequenceStartPosition = this.camera.position.clone();

    if (window.SONOITE_DEBUG) {
      console.log('[CameraManager] Path sequence started, OrbitControls frozen');
    }
  }

  /**
   * CAM-API-01: Update path sequence animation
   */
  updatePathSequence(dt) {
    if (!this.pathSequence || !this.camera) return;

    const elapsed = this.time - this.sequenceStartTime;
    const totalDuration = this.pathSequence[this.pathSequence.length - 1].startTime +
                          this.pathSequence[this.pathSequence.length - 1].duration;

    // Check if sequence is complete
    if (elapsed >= totalDuration) {
      this.endPathSequence();
      return;
    }

    // Find current step
    let currentStep = null;
    for (const step of this.pathSequence) {
      if (elapsed >= step.startTime && elapsed < step.startTime + step.duration) {
        currentStep = step;
        break;
      }
    }

    if (!currentStep) return;

    // Calculate progress within current step
    const stepElapsed = elapsed - currentStep.startTime;
    const progress = stepElapsed / currentStep.duration;
    const easedProgress = this.easeProgress(progress, currentStep.ease);

    // Apply step based on type
    switch (currentStep.type) {
      case 'dolly':
        this.applyDolly(currentStep.value, easedProgress);
        break;
      case 'yaw':
        this.applyYaw(currentStep.value, easedProgress);
        break;
      case 'pitch':
        this.applyPitch(currentStep.value, easedProgress);
        break;
    }
  }

  /**
   * CAM-API-01: Apply dolly movement
   */
  applyDolly(value, progress) {
    // Move along camera forward vector (world space)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    // Forward points -Z; value is signed (+ forward, - backward)
    const offset = forward.multiplyScalar(value * progress);
    this.camera.position.copy(this.sequenceStartPosition).add(offset);
  }

  /**
   * CAM-API-01: Apply yaw rotation
   */
  applyYaw(value, progress) {
    const angle = value * progress;
    const basePos = this.sequenceStartPosition;
    const radius = Math.sqrt(basePos.x * basePos.x + basePos.z * basePos.z);
    const baseAngle = Math.atan2(basePos.z, basePos.x);

    this.camera.position.x = Math.cos(baseAngle + angle) * radius;
    this.camera.position.z = Math.sin(baseAngle + angle) * radius;
    this.camera.lookAt(this.baseLookAt);
  }

  /**
   * CAM-LIB-03: Apply pitch rotation (vertical angle)
   */
  applyPitch(value, progress) {
    const angle = value * progress;
    const basePos = this.sequenceStartPosition;
    const radius = Math.sqrt(
      basePos.x * basePos.x +
      basePos.y * basePos.y +
      basePos.z * basePos.z
    );

    // Calculate new Y position based on pitch angle
    const currentPitch = Math.asin(basePos.y / radius);
    const newPitch = currentPitch + angle;

    // Calculate new position maintaining radius
    const horizontalRadius = radius * Math.cos(newPitch);
    const baseHorizontalAngle = Math.atan2(basePos.z, basePos.x);

    this.camera.position.x = Math.cos(baseHorizontalAngle) * horizontalRadius;
    this.camera.position.y = radius * Math.sin(newPitch);
    this.camera.position.z = Math.sin(baseHorizontalAngle) * horizontalRadius;
    this.camera.lookAt(this.baseLookAt);
  }

  /**
   * CAM-API-01: Ease progress curve
   */
  easeProgress(t, type) {
    if (type === 'linear') return t;
    // Smooth ease in-out (cubic)
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * CAM-LIB-03: Add micro-path helper for journey moments
   * Simplified high-level API with reduced-motion and EMA smoothing
   * @param {Object} params - {dolly?, yaw?, pitch?, duration, easing?}
   */
  addMicroPath(params = {}) {
    // CAM-LIB-03: Block if reduced motion enabled
    if (window.SONOITE_REDUCED_MOTION) {
      if (window.SONOITE_DEBUG) {
        console.log('[CameraManager] Micro-path blocked by reduced motion setting');
      }
      return;
    }

    const duration = params.duration || 4.0;
    const easing = params.easing || 'easeOutQuad';

    // CAM-LIB-03: EMA-smooth the intensity (safe amplitude limits)
    const emaSmoothedDolly = params.dolly ? this._smoothMicroPath(params.dolly, 0.2) : null;
    const emaSmoothedYaw = params.yaw ? this._smoothMicroPath(params.yaw, 0.2) : null;
    const emaSmoothedPitch = params.pitch ? this._smoothMicroPath(params.pitch, 0.2) : null;

    // Build sequence from provided params
    const sequence = [];

    if (emaSmoothedDolly !== null) {
      // Clamp dolly to safe range (±3 units)
      const safeDolly = Math.max(-3, Math.min(3, emaSmoothedDolly));
      sequence.push({
        type: 'dolly',
        value: safeDolly,
        duration,
        ease: easing
      });
    }

    if (emaSmoothedYaw !== null) {
      // Clamp yaw to safe range (±30°)
      const maxYaw = 30 * Math.PI / 180;
      const safeYaw = Math.max(-maxYaw, Math.min(maxYaw, emaSmoothedYaw));
      sequence.push({
        type: 'yaw',
        value: safeYaw,
        duration,
        ease: easing
      });
    }

    if (emaSmoothedPitch !== null) {
      // Clamp pitch to safe range (±20°)
      const maxPitch = 20 * Math.PI / 180;
      const safePitch = Math.max(-maxPitch, Math.min(maxPitch, emaSmoothedPitch));
      sequence.push({
        type: 'pitch',
        value: safePitch,
        duration,
        ease: easing
      });
    }

    // If no movements specified, skip
    if (sequence.length === 0) return;

    // Use existing addPathSequence with generated sequence
    this.addPathSequence(sequence);

    if (window.SONOITE_DEBUG) {
      console.log('[CameraManager] Micro-path started:', {
        dolly: emaSmoothedDolly,
        yaw: emaSmoothedYaw && (emaSmoothedYaw * 180 / Math.PI).toFixed(1) + '°',
        pitch: emaSmoothedPitch && (emaSmoothedPitch * 180 / Math.PI).toFixed(1) + '°',
        duration
      });
    }
  }

  /**
   * CAM-LIB-03: EMA smoothing helper for micro-path intensity
   * @param {number} value - Raw intensity value
   * @param {number} alpha - Smoothing factor (0-1)
   * @returns {number} Smoothed value
   */
  _smoothMicroPath(value, alpha = 0.2) {
    // Initialize smoothing state if not exists
    if (!this._microPathEMA) {
      this._microPathEMA = {};
    }

    const key = 'intensity';
    if (this._microPathEMA[key] === undefined) {
      this._microPathEMA[key] = value;
    }

    // Apply EMA
    this._microPathEMA[key] = this._microPathEMA[key] * (1 - alpha) + value * alpha;
    return this._microPathEMA[key];
  }

  /**
   * CAM-API-01: End path sequence and restore OrbitControls
   */
  endPathSequence() {
    this.sequenceActive = false;
    this.pathSequence = null;

    // Re-enable OrbitControls
    if (window.SonoiteExperience?.controls && this.orbitControlsState !== null) {
      window.SonoiteExperience.controls.enabled = this.orbitControlsState;
      this.orbitControlsState = null;
    }

    if (window.SONOITE_DEBUG) {
      console.log('[CameraManager] Path sequence ended, OrbitControls restored');
    }
  }
}

export default CameraManager;
