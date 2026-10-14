/**
 * Track5VoidDirector.js - Phase-Based Orchestration for "Não Querer Nada"
 *
 * Extends BaseDirector with Track5-specific:
 * - 5 phases: VOID → AWAKENING → WANTING → RELEASE → ERASURE
 * - Key moments: VOID AWAKENS, DESIRE EMERGES, CLIMAX, SURRENDER, OVERWHELM, DISSOLUTION, FINAL BREATH
 * - Inverse breathing (void stores energy when music drops)
 * - Camera spline choreography (5 acts, one per phase)
 * - Setpiece prototypes (veil, ring, eclipse)
 *
 * Longest track (9:24 / 564s) with the most experimental visual approach.
 * The void sphere pulses with inverse breathing - it wants when the music rests,
 * releases when the music intensifies.
 *
 * @package SonoiteTheme
 * @version 2.0.0 - Now extends BaseDirector
 */

import { BaseDirector, DEFAULT_CAPS } from './BaseDirector.js';
import { dlog } from '../utils/devlog.js';

/**
 * Phase definitions with timestamps and visual targets
 */
const PHASES = {
    VOID: {
        start: 0,
        end: 96,        // 0:00-1:36
        vignette: 0.48,
        bloom: 0.30,
        brightness: 1.00,
        chromatic: 0,
        godRays: 0,
        fogMax: 0.05,
        cameraIntensity: 0.1,
        particleDensity: 'VOID',
        description: 'Far, cold, dormant - emptiness incarnate'
    },
    AWAKENING: {
        start: 96,
        end: 216,       // 1:36-3:36
        vignette: 0.46,
        bloom: 0.36,
        brightness: 1.03,
        chromatic: 0,
        godRays: 0,
        fogMax: 0.08,
        cameraIntensity: 0.3,
        particleDensity: 'AWAKENING',
        description: 'Approaching void, desire stirs, particles emerge'
    },
    WANTING: {
        start: 216,
        end: 281,       // 3:36-4:41
        vignette: 0.42,
        bloom: 0.48,
        brightness: 1.08,
        chromatic: 0,
        godRays: 0,
        fogMax: 0.12,
        cameraIntensity: 0.6,
        particleDensity: 'WANTING',
        description: 'CLIMAX - intimate orbit, peak intensity'
    },
    RELEASE: {
        start: 281,
        end: 432,       // 4:41-7:12
        vignette: 0.48,
        bloom: 0.36,
        brightness: 1.00,
        chromatic: 0,
        godRays: 0,
        fogMax: 0.15,
        cameraIntensity: 0.4,
        particleDensity: 'RELEASE',
        description: 'Pull back, calming, overwhelming particle density'
    },
    ERASURE: {
        start: 432,
        end: 564,       // 7:12-9:24
        vignette: 0.62,
        bloom: 0.26,
        brightness: 0.94,
        chromatic: 0,
        godRays: 0,
        fogMax: 0.02,
        cameraIntensity: 0.15,
        particleDensity: 'ERASURE',
        description: 'Through void, dissolution, return to emptiness'
    }
};

/**
 * Key moment timestamps (9:24 duration)
 */
const BEATS = {
    voidAwakens: 96,           // 1:36 - First movement
    desireEmerges: 180,        // 3:00 - Intensity builds
    climax: 230,               // 3:50 - Peak wanting
    surrender: 281,            // 4:41 - Release begins
    overwhelm: 360,            // 6:00 - Maximum particle density
    dissolution: 480,          // 8:00 - Final fade begins
    finalBreath: 540           // 9:00 - Last gasp before void
};

/**
 * Camera spline waypoints for 5 acts
 */
const CAMERA_SPLINES = {
    ACT1_VOID: {
        waypoints: [
            { pos: [0, 6.2, 16], fov: 60, time: 0 },
            { pos: [0, 5.0, 12.4], fov: 62, time: 40 },
            { pos: [0, 3.8, 9.0], fov: 64, time: 96 }
        ],
        duration: 96,
        easing: 'easeInQuad'
    },
    ACT2_AWAKENING: {
        waypoints: [
            { pos: [0, 3.8, 9.0], fov: 64, time: 0 },
            { pos: [1.8, 2.8, 6.8], fov: 66, time: 60 },
            { pos: [0, 2.5, 4.6], fov: 69, time: 120 }
        ],
        duration: 120,
        easing: 'easeInOutQuad'
    },
    ACT3_WANTING: {
        waypoints: [
            { pos: [0, 2.5, 4.6], fov: 69, time: 0 },
            { pos: [2.8, 1.6, 2.8], fov: 63, time: 15 },
            { pos: [0, 1.2, 1.8], fov: 42, time: 30 },
            { pos: [-2.8, 1.7, 2.8], fov: 54, time: 45 },
            { pos: [0, 2.3, 3.6], fov: 62, time: 65 }
        ],
        duration: 65,
        easing: 'easeInOutCubic'
    },
    ACT4_RELEASE: {
        waypoints: [
            { pos: [0, 2.3, 3.6], fov: 62, time: 0 },
            { pos: [0, 2.9, 6.2], fov: 66, time: 75 },
            { pos: [0, 3.4, 8.2], fov: 69, time: 151 }
        ],
        duration: 151,
        easing: 'easeOutQuad'
    },
    ACT5_ERASURE: {
        waypoints: [
            { pos: [0, 3.4, 8.2], fov: 69, time: 0 },
            { pos: [0, 2.8, 4.8], fov: 60, time: 50 },
            { pos: [0, 2, 0], fov: 40, time: 90 },
            { pos: [0, 2.8, 6.2], fov: 58, time: 132 }
        ],
        duration: 132,
        easing: 'easeInCubic'
    }
};

/**
 * Effect caps for mobile safety
 */
const CAPS = {
    ...DEFAULT_CAPS,
    bloom: 0.6,
    vignette: 0.95,
    chromatic: 0.3,
    godRays: 0.5,
    audioSmoothing: 0.06  // ~200ms decay
};

const TRACK5_OWNERSHIP_MAP = Object.freeze({
    director: Object.freeze([
        'phase transitions',
        'singularity lens baseline',
        'setpiece selection routing',
        'runtime guardrail enforcement',
        'seek-safe transient resets'
    ]),
    moments: Object.freeze([
        'camera choreography (spline/vertigo/fov/dolly/shake)',
        'narrative post stack (post/post_glitch)',
        'void lens authored arcs',
        'dust gravity/vortex choreography',
        'timed opacity and reveal pacing'
    ]),
    linkAudio: Object.freeze([
        'micro-modulation only',
        'must stay bounded to guarded uniform ranges',
        'must be unlinked before hard-authored erasure moments'
    ])
});

const TRACK5_RUNTIME_GUARDS = Object.freeze({
    bloomMax: 0.40,
    chromaticMax: 0.10,
    grainMax: 0.20,
    shakeMax: 0.30,
    yankMax: 0.82,
    lensPassStrengthMax: 0.58,
    lensPassRadiusMax: 0.60,
    lensPassGlowMax: 0.22,
    linkMaxCount: 8,
    linkSmoothingMax: 0.35,
    linkRanges: Object.freeze({
        uLensStrength: Object.freeze({ min: 0.10, max: 0.62 }),
        uGravityStrength: Object.freeze({ min: 0.02, max: 0.36 }),
        uEventHorizonGlow: Object.freeze({ min: 0.14, max: 0.62 }),
        uInfiniteDepth: Object.freeze({ min: 0.16, max: 0.58 }),
        emissiveIntensity: Object.freeze({ min: 0.20, max: 0.90 })
    })
});

export class Track5VoidDirector extends BaseDirector {
    constructor(options = {}) {
        // Initialize base with Track5-specific config
        super({
            ...options,
            phases: PHASES,
            beats: BEATS,
            caps: CAPS,
            trackName: 'Track5Void',
            phaseAlpha: {
                VOID: 0.015,       // Very slow, mysterious
                AWAKENING: 0.03,   // Slow awakening
                WANTING: 0.06,     // More reactive for climax
                RELEASE: 0.04,     // Calming
                ERASURE: 0.02      // Very slow dissolution
            }
        });

        // Track5-specific state
        this.isInitialized = false;
        this.keyMomentsEnabled = options.keyMomentsEnabled === true;
        this.useDirectorCameraSplines = options.useDirectorCameraSplines === true;
        this.useDirectorEclipseTrigger = options.useDirectorEclipseTrigger === true;
        this.useDirectorPostProcessing = options.useDirectorPostProcessing === true;
        this.primaryMomentAuthority = options.primaryMomentAuthority !== false;
        this.timelineOwnsNarrative = false;

        // Camera spline state
        this.activeSpline = null;
        this.splineStartTime = 0;
        this.splineElapsed = 0;
        this._lastSongTime = 0;

        // Chromatic burst state
        this.chromaticBurstCooldown = 0;

        // 6-AGENT-FIX: SingularityLensPass per-phase targets (independent of useDirectorPostProcessing)
        this._lensPassTargets = {
            VOID:       { strength: 0.03, radius: 0.30, accretionGlow: 0.00 },
            AWAKENING:  { strength: 0.12, radius: 0.42, accretionGlow: 0.08 },
            WANTING:    { strength: 0.26, radius: 0.54, accretionGlow: 0.18 },
            RELEASE:    { strength: 0.14, radius: 0.38, accretionGlow: 0.07 },
            ERASURE:    { strength: 0.08, radius: 0.24, accretionGlow: 0.03 }
        };

        // VICTIM-CAM: Bass yank state (external auditor concept)
        // "camera drifts smoothly but gets YANKED violently toward center on bass transients"
        this.yankCooldown = 0;
        this.yankTarget = [0, 2, 0];  // Void sphere center
        this._yankThresholdBase = 0.55;
        this.yankThreshold = this._yankThresholdBase;
        this.yankMinCooldown = 1.2;   // Minimum seconds between yanks

        // Phase 6 setpiece prototypes (veil/ring/eclipse)
        const urlParams = new URLSearchParams(window.location.search);
        const setpieceParam = urlParams.get('t5set');
        const globalSetpiece = (typeof window.SONOITE_T5_SETPIECE === 'string') ? window.SONOITE_T5_SETPIECE : null;
        const selection = (globalSetpiece || setpieceParam || 'all').toLowerCase();
        const allowed = new Set(['veil', 'ring', 'eclipse', 'all', 'none']);
        this.setpieceSelection = allowed.has(selection) ? selection : 'veil';
        this.setpieces = { veil: null, ring: null, eclipse: null };
        this._eclipsePassTriggered = false;
        this._timeoutIds = new Set();
        this.runtimeGuards = TRACK5_RUNTIME_GUARDS;
        this._ownershipMap = TRACK5_OWNERSHIP_MAP;
        this._guardrailWarnings = new Set();
        this._lastTriggersRef = null;
        this._lastTriggersLength = -1;
        this._nextGuardrailAt = 0;
        this._nextRuntimePublishAt = 0;
        this._guardrailInterval = 0.10; // 10Hz is enough for clamp auditing
        this._runtimePublishInterval = 0.25; // 4Hz runtime debug payload

        // Mobile detection
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Initialized (BaseDirector)', {
                phases: Object.keys(PHASES),
                duration: '9:24 (564s)',
                isMobile: this.isMobile
            });
        }
    }

    /**
     * Main update - extends base with Track5-specific logic
     */
    update(dt, songTime, rawAudio) {
        if (songTime < this._lastSongTime - 0.35) {
            this._handleSeek(songTime);
        }
        this._lastSongTime = songTime;
        this._refreshTimelineOwnership();

        // First frame initialization
        if (!this.isInitialized && songTime > 0) {
            this._initialize();
            this.isInitialized = true;
        }

        // Call base update (phase detection, audio smoothing)
        const smoothed = super.update(dt, songTime, rawAudio);

        // Check for Track5-specific key moments
        if (this.keyMomentsEnabled && (!this.primaryMomentAuthority || !this.timelineOwnsNarrative)) {
            this._checkKeyMoments(songTime, rawAudio);
        }

        // Update camera spline
        this._updateCameraSpline(dt, songTime);

        // Update post-processing targets
        if (this.useDirectorPostProcessing) {
            this._updatePostProcessing(dt, songTime, smoothed);
        }

        // Phase 6 setpieces (optional legacy trigger; prefer timeline-authored control)
        this._updateSetpieces(songTime);

        // Update chromatic burst cooldown
        if (this.chromaticBurstCooldown > 0) {
            this.chromaticBurstCooldown -= dt;
        }

        // VICTIM-CAM: Update yank cooldown and check for bass transients
        if (this.yankCooldown > 0) {
            this.yankCooldown -= dt;
        }
        this._checkBassYank(rawAudio, songTime);
        this._enforceRuntimeGuardrails(songTime);
        this._publishRuntimeDebug(songTime);

        return smoothed;
    }

    _refreshTimelineOwnership() {
        if (!this.primaryMomentAuthority) {
            this.timelineOwnsNarrative = false;
            return;
        }

        const triggers = this.journeyController?.triggers;
        if (!Array.isArray(triggers) || triggers.length === 0) return;
        if (this._lastTriggersRef === triggers && this._lastTriggersLength === triggers.length) return;
        this._lastTriggersRef = triggers;
        this._lastTriggersLength = triggers.length;

        const hasTrack5Moments = triggers.some((trigger) =>
            typeof trigger?.id === 'string' && trigger.id.startsWith('t5_')
        );

        if (window.SONOITE_DEBUG && hasTrack5Moments !== this.timelineOwnsNarrative) {
            dlog('[Track5VoidDirector] Ownership handoff', {
                timelineOwnsNarrative: hasTrack5Moments
            });
        }

        this.timelineOwnsNarrative = hasTrack5Moments;
    }

    _handleSeek(songTime) {
        this._clearPendingTimeouts();
        this._triggeredMoments.clear();
        this.chromaticBurstCooldown = 0;
        this.yankCooldown = 0;
        this.yankThreshold = this._yankThresholdBase;
        this._nextGuardrailAt = songTime;
        this._nextRuntimePublishAt = songTime;

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Seek-safe reset', {
                songTime: Number(songTime).toFixed(2)
            });
        }
    }

    _enforceRuntimeGuardrails(songTime) {
        if (songTime < this._nextGuardrailAt) return;
        this._nextGuardrailAt = songTime + this._guardrailInterval;
        const guards = this.runtimeGuards;
        const postfx = this.postProcessing;
        const camera = this.cameraManager;

        if (postfx?.bloomPass && Number.isFinite(postfx.bloomPass.strength)) {
            const clamped = Math.min(postfx.bloomPass.strength, guards.bloomMax);
            if (clamped !== postfx.bloomPass.strength) {
                postfx.bloomPass.strength = clamped;
                if (postfx.passes) {
                    postfx.passes.bloomStrength = clamped;
                }
                this._warnGuardrail('bloom', songTime, { value: clamped });
            }
        }

        const chromaUniform = postfx?.chromaticAberrationPass?.uniforms?.uIntensity;
        if (chromaUniform && Number.isFinite(chromaUniform.value)) {
            const clamped = Math.max(0, Math.min(guards.chromaticMax, chromaUniform.value));
            if (clamped !== chromaUniform.value) {
                chromaUniform.value = clamped;
                this._warnGuardrail('chromatic', songTime, { value: clamped });
            }
            if (postfx.chromaticAberrationPass) {
                postfx.chromaticAberrationPass.enabled = clamped > 0.001;
            }
        }

        const grainUniform = postfx?.filmGrainPass?.uniforms?.intensity;
        if (grainUniform && Number.isFinite(grainUniform.value)) {
            const clamped = Math.max(0, Math.min(guards.grainMax, grainUniform.value));
            if (clamped !== grainUniform.value) {
                grainUniform.value = clamped;
                this._warnGuardrail('grain', songTime, { value: clamped });
            }
            if (postfx.filmGrainPass) {
                postfx.filmGrainPass.enabled = clamped > 0.001;
            }
        }

        if (camera?._activeShake?.intensity > guards.shakeMax) {
            camera._activeShake.intensity = guards.shakeMax;
            this._warnGuardrail('shake', songTime, { value: guards.shakeMax });
        }

        const lensUniforms = postfx?.singularityLensPass?.uniforms;
        if (lensUniforms) {
            if (Number.isFinite(lensUniforms.uStrength?.value)) {
                lensUniforms.uStrength.value = Math.max(
                    0,
                    Math.min(guards.lensPassStrengthMax, lensUniforms.uStrength.value)
                );
            }
            if (Number.isFinite(lensUniforms.uRadius?.value)) {
                lensUniforms.uRadius.value = Math.max(
                    0.05,
                    Math.min(guards.lensPassRadiusMax, lensUniforms.uRadius.value)
                );
            }
            if (Number.isFinite(lensUniforms.uAccretionGlow?.value)) {
                lensUniforms.uAccretionGlow.value = Math.max(
                    0,
                    Math.min(guards.lensPassGlowMax, lensUniforms.uAccretionGlow.value)
                );
            }
        }

        this._enforceAudioLinkGuardrails(songTime);
    }

    _enforceAudioLinkGuardrails(songTime) {
        const links = this.journeyController?.audioLinks;
        if (!Array.isArray(links) || links.length === 0) return;

        const guards = this.runtimeGuards;
        const track5Targets = new Set(['void_sphere', 'void_halo', 'void_compression_ring', 'void_dust']);
        const dedupe = new Set();

        for (let i = links.length - 1; i >= 0; i--) {
            const link = links[i];
            if (!track5Targets.has(link?.target)) continue;

            const key = `${link.target}::${link.uniform}`;
            if (dedupe.has(key)) {
                links.splice(i, 1);
                this._warnGuardrail('link-dedupe', songTime, { key });
                continue;
            }
            dedupe.add(key);

            if (Number.isFinite(link.smoothing)) {
                const clampedSmoothing = Math.max(0, Math.min(guards.linkSmoothingMax, link.smoothing));
                if (clampedSmoothing !== link.smoothing) {
                    link.smoothing = clampedSmoothing;
                    this._warnGuardrail('link-smoothing', songTime, { key, value: clampedSmoothing });
                }
            }

            const range = guards.linkRanges?.[link.uniform];
            if (range) {
                if (Number.isFinite(link.min)) {
                    link.min = Math.max(range.min, Math.min(range.max, link.min));
                }
                if (Number.isFinite(link.max)) {
                    link.max = Math.max(range.min, Math.min(range.max, link.max));
                }
                if (Number.isFinite(link.min) && Number.isFinite(link.max) && link.min > link.max) {
                    const temp = link.min;
                    link.min = link.max;
                    link.max = temp;
                }
            }
        }

        const track5Indices = [];
        for (let i = 0; i < links.length; i++) {
            if (track5Targets.has(links[i]?.target)) {
                track5Indices.push(i);
            }
        }
        if (track5Indices.length > guards.linkMaxCount) {
            const dropIndices = track5Indices.slice(0, track5Indices.length - guards.linkMaxCount);
            for (let i = dropIndices.length - 1; i >= 0; i--) {
                links.splice(dropIndices[i], 1);
            }
            this._warnGuardrail('link-count', songTime, { kept: guards.linkMaxCount });
        }
    }

    _warnGuardrail(channel, songTime, payload = {}) {
        if (!window.SONOITE_DEBUG) return;
        const key = `${channel}:${Math.floor(songTime)}`;
        if (this._guardrailWarnings.has(key)) return;
        this._guardrailWarnings.add(key);
        dlog(`[Track5VoidDirector] Guardrail ${channel}`, payload);
    }

    _publishRuntimeDebug(songTime) {
        if (!window.SONOITE_DEBUG) return;
        if (songTime < this._nextRuntimePublishAt) return;
        this._nextRuntimePublishAt = songTime + this._runtimePublishInterval;
        const postfx = this.postProcessing;
        const chroma = postfx?.chromaticAberrationPass?.uniforms?.uIntensity?.value;
        const bloom = postfx?.bloomPass?.strength;
        const vignette = postfx?.vignettePass?.uniforms?.offset?.value;
        const grain = postfx?.filmGrainPass?.uniforms?.intensity?.value;

        window.__sonoiteTrack5Runtime = {
            time: songTime,
            phase: this.currentPhase,
            timelineOwnsNarrative: this.timelineOwnsNarrative,
            keyMomentsActive: this.keyMomentsEnabled && (!this.primaryMomentAuthority || !this.timelineOwnsNarrative),
            guards: this.runtimeGuards,
            ownership: this._ownershipMap,
            post: {
                bloom: Number.isFinite(bloom) ? bloom : 0,
                chroma: Number.isFinite(chroma) ? chroma : 0,
                vignette: Number.isFinite(vignette) ? vignette : 0,
                grain: Number.isFinite(grain) ? grain : 0
            },
            activeTrack5Links: Array.isArray(this.journeyController?.audioLinks)
                ? this.journeyController.audioLinks
                    .filter((link) => ['void_sphere', 'void_halo', 'void_compression_ring', 'void_dust'].includes(link?.target))
                    .map((link) => ({
                        target: link.target,
                        uniform: link.uniform,
                        combine: link.combine || 'replace',
                        min: link.min,
                        max: link.max
                    }))
                : []
        };
    }

    /**
     * Initialize on first frame
     */
    _initialize() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] First frame initialization');
        }

        // Set initial particle density
        const voidDust = this.getLayer('void_dust');
        if (voidDust && typeof voidDust.setPhaseParticleDensity === 'function') {
            voidDust.setPhaseParticleDensity('VOID', 0);
        }

        // Ensure Track 5 always boots from authored VOID state (not stale ERASURE leftovers).
        const voidSphere = this.getLayer('void_sphere');
        voidSphere?.setOpacity?.(0.58);
        voidSphere?.setLensStrength?.(0.22);
        voidSphere?.setEventHorizonGlow?.(0.56);
        voidSphere?.setInfiniteDepth?.(0.52);
        voidSphere?.setErosion?.(0.04);

        const voidHalo = this.getLayer('void_halo');
        voidHalo?.setOpacity?.(0.24);

        const voidVeil = this.getLayer('void_veil');
        voidVeil?.setOpacity?.(0.05);

        const voidRing = this.getLayer('void_compression_ring');
        voidRing?.setOpacity?.(0.28);

        // T5-IDENTITY: Prevent Track 1 silhouette leakage (even if a previous track left layers mounted).
        for (const id of ['distant_shards', 'glitching_cage']) {
            const layer = this.getLayer(id);
            if (!layer) continue;
            layer.setOpacity?.(0);
            layer.setActive?.(false);
        }

        // Start first camera spline
        // Prefer timeline-authored `camera_spline` actions for Track 5 (authorable + inspectable).
        // Director splines are kept as an opt-in fallback via `useDirectorCameraSplines`.
        if (this.useDirectorCameraSplines) {
            this._startCameraSpline('ACT1_VOID');
        }

        // 6-AGENT-FIX: Initialize SingularityLensPass for VOID phase
        this._updateSingularityLens('VOID');

        // Set initial post-processing
        const phase = PHASES.VOID;
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(phase.vignette, 0);
            this.postProcessing.setBloomTarget?.(phase.bloom, 0);
            this.postProcessing.setBrightnessTarget?.(phase.brightness, 0);
        }

        // Phase 6 setpiece prototypes (loaded via additionalStructureElements)
        this.setpieces.veil = this.getLayer('void_veil');
        this.setpieces.ring = this.getLayer('void_compression_ring');
        this.setpieces.eclipse = this.getLayer('void_eclipse_disc');
        this._applySetpieceSelection();
        this._updateSetpieceTargetsForPhase(this.currentPhase);

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Setpiece selection', {
                selection: this.setpieceSelection,
                available: {
                    veil: !!this.setpieces.veil,
                    ring: !!this.setpieces.ring,
                    eclipse: !!this.setpieces.eclipse
                }
            });
        }
    }

    /**
     * Override phase change for Track5-specific behaviors
     */
    _onPhaseChange(newPhase) {
        const phase = PHASES[newPhase];
        if (!phase) return;

        // When moments/timelines author post, keep director hands off the post stack.
        // (Phase post targets from BaseDirector fight the JSON timeline and can keep passes enabled.)
        if (this.useDirectorPostProcessing) {
            super._onPhaseChange(newPhase);
        } else if (this.cameraManager && phase.cameraIntensity !== undefined) {
            this.cameraManager.setPhaseMultiplier?.(phase.cameraIntensity);
        }

        // Track5-specific: brightness and chromatic targets
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setBrightnessTarget?.(phase.brightness, 5.0);

            if (this.postProcessing.setGodRaysIntensity) {
                this.postProcessing.setGodRaysIntensity(phase.godRays, 3.0);
            }
            if (this.postProcessing.setChromaticAberration) {
                this.postProcessing.setChromaticAberration(phase.chromatic, 2.0);
            }
        }

        // Update particle density
        const voidDust = this.getLayer('void_dust');
        if (voidDust && typeof voidDust.setPhaseParticleDensity === 'function') {
            const durations = {
                VOID: 0,
                AWAKENING: 8.0,
                WANTING: 6.0,
                RELEASE: 10.0,
                ERASURE: 15.0
            };
            voidDust.setPhaseParticleDensity(phase.particleDensity, durations[newPhase] || 5.0);
        }

        // Start camera spline for phase
        const splineMap = {
            VOID: 'ACT1_VOID',
            AWAKENING: 'ACT2_AWAKENING',
            WANTING: 'ACT3_WANTING',
            RELEASE: 'ACT4_RELEASE',
            ERASURE: 'ACT5_ERASURE'
        };
        if (this.useDirectorCameraSplines && splineMap[newPhase]) {
            this._startCameraSpline(splineMap[newPhase]);
        }

        // Phase-specific behaviors
        switch (newPhase) {
            case 'AWAKENING':
                this._activateAwakeningMode();
                break;
            case 'WANTING':
                this._activateWantingMode();
                break;
            case 'RELEASE':
                this._activateReleaseMode();
                break;
            case 'ERASURE':
                this._activateErasureMode();
                break;
        }

        // Phase 6 setpiece targets (veil/ring opacity by phase)
        this._updateSetpieceTargetsForPhase(newPhase);

        // 6-AGENT-FIX: SingularityLensPass phase-based control
        // Independent of useDirectorPostProcessing (lens is NOT authored by enriched moments)
        this._updateSingularityLens(newPhase);
    }

    // ==================== SINGULARITY LENS PASS ====================

    /**
     * 6-AGENT-FIX: Update SingularityLensPass for current phase.
     * Works independently of useDirectorPostProcessing since enriched moments
     * don't author the lens pass.
     */
    _updateSingularityLens(phaseName) {
        const controller = this.postProcessing?.singularityLensController;
        if (!controller) return;

        const target = this._lensPassTargets?.[phaseName];
        if (!target) return;

        // Transition duration depends on phase (faster for WANTING, slower for ERASURE)
        const durations = {
            VOID: 4.0,
            AWAKENING: 6.0,
            WANTING: 3.0,
            RELEASE: 8.0,
            ERASURE: 12.0
        };

        controller.setStrength(target.strength, durations[phaseName] || 5.0);
        controller.setAccretionGlow(target.accretionGlow);

        // Set radius via uniform directly
        if (controller.pass?.uniforms?.uRadius) {
            controller.pass.uniforms.uRadius.value = target.radius;
        }

        // Enable inverse breathing for VOID phase (silence pulls)
        controller.setInvert(phaseName === 'VOID');

        if (window.SONOITE_DEBUG) {
            dlog(`[Track5VoidDirector] SingularityLens → ${phaseName}`, target);
        }
    }

    /**
     * Boost singularity lens for climax moment
     */
    _boostSingularityLens() {
        const controller = this.postProcessing?.singularityLensController;
        if (!controller) return;

        controller.setStrength(0.34, 1.0);
        controller.setAccretionGlow(0.28);

        if (controller.pass?.uniforms?.uRadius) {
            controller.pass.uniforms.uRadius.value = 0.54;
        }

        // Decay back to WANTING target after 4 seconds
        this._queueTimeout(() => {
            const wantingTarget = this._lensPassTargets?.WANTING;
            if (wantingTarget && controller) {
                controller.setStrength(wantingTarget.strength, 3.0);
                controller.setAccretionGlow(wantingTarget.accretionGlow);
            }
        }, 4000);
    }

    // ==================== SETPIECE MANAGEMENT ====================

    _applySetpieceSelection() {
        const wants = {
            veil: this.setpieceSelection === 'veil' || this.setpieceSelection === 'all',
            ring: this.setpieceSelection === 'ring' || this.setpieceSelection === 'all',
            eclipse: this.setpieceSelection === 'eclipse' || this.setpieceSelection === 'all'
        };

        const safeDisable = (layer) => {
            if (!layer) return;
            layer.setOpacity?.(0);
            layer.setActive?.(false);
        };

        const safeEnable = (layer) => {
            if (!layer) return;
            layer.setActive?.(true);
        };

        if (wants.veil) safeEnable(this.setpieces.veil); else safeDisable(this.setpieces.veil);
        if (wants.ring) safeEnable(this.setpieces.ring); else safeDisable(this.setpieces.ring);

        // Eclipse stays invisible until triggered
        if (wants.eclipse) {
            safeEnable(this.setpieces.eclipse);
            this.setpieces.eclipse?.setOpacity?.(0);
        } else {
            safeDisable(this.setpieces.eclipse);
        }
    }

    _updateSetpieceTargetsForPhase(phaseName) {
        if (this.setpieceSelection === 'none') return;

        const veil = this.setpieces.veil;
        const ring = this.setpieces.ring;

        if (veil && (this.setpieceSelection === 'veil' || this.setpieceSelection === 'all')) {
            const veilByPhase = {
                VOID: 0.015,
                AWAKENING: 0.025,
                WANTING: 0.035,
                RELEASE: 0.022,
                ERASURE: 0.008
            };
            veil.setOpacity?.(veilByPhase[phaseName] ?? 0.12);
        }

        if (ring && (this.setpieceSelection === 'ring' || this.setpieceSelection === 'all')) {
            const ringByPhase = {
                VOID: 0.48,
                AWAKENING: 0.56,
                WANTING: 0.64,
                RELEASE: 0.48,
                ERASURE: 0.22
            };
            ring.setOpacity?.(ringByPhase[phaseName] ?? 0.10);
        }
    }

    _updateSetpieces(songTime) {
        if (!this.useDirectorEclipseTrigger) return;

        // Eclipse pass: one crossing in late erasure
        if (this._eclipsePassTriggered) return;
        if (!(this.setpieceSelection === 'eclipse' || this.setpieceSelection === 'all')) return;

        const eclipse = this.setpieces.eclipse;
        if (!eclipse || typeof eclipse.triggerPass !== 'function') return;

        const triggerTime = 507.0;  // 8:27
        if (songTime >= triggerTime) {
            eclipse.triggerPass({ duration: 24.0 });
            this._eclipsePassTriggered = true;
        }
    }

    // ==================== KEY MOMENTS ====================

    _checkKeyMoments(songTime, rawAudio) {
        // Void awakens (1:36)
        if (this.shouldTrigger('voidAwakens', songTime, BEATS.voidAwakens)) {
            this._triggerVoidAwakens();
        }

        // Desire emerges (3:00)
        if (this.shouldTrigger('desireEmerges', songTime, BEATS.desireEmerges)) {
            this._triggerDesireEmerges();
        }

        // Climax (3:50)
        if (this.shouldTrigger('climax', songTime, BEATS.climax)) {
            this._triggerClimax();
        }

        // Surrender (4:41)
        if (this.shouldTrigger('surrender', songTime, BEATS.surrender)) {
            this._triggerSurrender();
        }

        // Overwhelm (6:00)
        if (this.shouldTrigger('overwhelm', songTime, BEATS.overwhelm)) {
            this._triggerOverwhelm();
        }

        // Dissolution (8:00)
        if (this.shouldTrigger('dissolution', songTime, BEATS.dissolution)) {
            this._triggerDissolution();
        }

        // Final breath (9:00)
        if (this.shouldTrigger('finalBreath', songTime, BEATS.finalBreath)) {
            this._triggerFinalBreath();
        }

        // Audio-reactive chromatic bursts during WANTING phase
        if (this.currentPhase === 'WANTING' && rawAudio && rawAudio.bass > 0.7 && this.chromaticBurstCooldown <= 0) {
            this._triggerChromaticBurst();
            this.chromaticBurstCooldown = 2.0;
        }
    }

    // ==================== VICTIM CAMERA (BASS YANK) ====================

    /**
     * VICTIM-CAM: Check for bass transients and trigger camera yank
     * WANTING-only "panic yank": camera jerks away from center on bass hits,
     * then struggles to re-center (panic under pressure).
     *
     * @param {Object} rawAudio - Audio analysis data
     */
    _checkBassYank(rawAudio, songTime = 0) {
        if (!rawAudio || !this.cameraManager) return;

        // Phase 3 only: WANTING (panic yank during climax)
        if (this.currentPhase !== 'WANTING') return;
        if (this.timelineOwnsNarrative && this.cameraManager.splineActive) return;
        if (this.timelineOwnsNarrative && this.cameraManager._activeVertigo) return;

        // Check cooldown
        if (this.yankCooldown > 0) return;

        // Check bass threshold (lower for panic yank)
        const threshold = this.yankThreshold;
        if (rawAudio.bass < threshold) return;

        // Calculate yank intensity based on bass level
        const audioBoost = (rawAudio.bass - threshold) / (1 - threshold);
        const intensity = Math.min(this.runtimeGuards.yankMax, 0.68 + audioBoost * 0.24);

        // Faster recovery for repeated impacts
        const recovery = 1.15;

        // Compute an "away from center" target to blow the camera back
        const center = Array.isArray(this.yankTarget) ? this.yankTarget : [0, 2, 0];
        let panicTarget = this.yankTarget;
        const cam = this.cameraManager?.camera;
        if (cam?.position) {
            const dx = cam.position.x - center[0];
            const dy = cam.position.y - center[1];
            const dz = cam.position.z - center[2];
            const len = Math.hypot(dx, dy, dz) || 1;
            const awayScale = 2.0;
            panicTarget = [
                cam.position.x + (dx / len) * awayScale,
                cam.position.y + (dy / len) * awayScale,
                cam.position.z + (dz / len) * awayScale
            ];
        }

        // Trigger the panic yank
        this.cameraManager.yank(panicTarget, intensity, recovery);

        // Shorter cooldown during WANTING for frequent hits
        const cooldownMultiplier = 0.5;
        this.yankCooldown = this.yankMinCooldown * cooldownMultiplier;

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Panic yank triggered', {
                phase: this.currentPhase,
                bass: rawAudio.bass.toFixed(2),
                time: Number(songTime).toFixed(2),
                intensity: intensity.toFixed(2),
                recovery: recovery.toFixed(1)
            });
        }
    }

    // ==================== CAMERA SPLINE SYSTEM ====================

    _startCameraSpline(splineName) {
        const spline = CAMERA_SPLINES[splineName];
        if (!spline) {
            console.warn(`[Track5VoidDirector] Spline not found: ${splineName}`);
            return;
        }

        this.activeSpline = spline;
        this.splineStartTime = performance.now();
        this.splineElapsed = 0;

        if (window.SONOITE_DEBUG) {
            dlog(`[Track5VoidDirector] Starting spline: ${splineName}`, {
                duration: spline.duration,
                waypoints: spline.waypoints.length
            });
        }

        // Convert Track5 waypoint format to CameraManager format
        if (this.cameraManager && this.cameraManager.startSplinePath) {
            const positions = spline.waypoints.map(wp => wp.pos);
            const fovKeyframes = spline.waypoints.map(wp => ({
                t: wp.time / spline.duration,
                value: wp.fov
            }));

            this.cameraManager.startSplinePath({
                waypoints: positions,
                duration: spline.duration,
                easing: spline.easing,
                fovKeyframes: fovKeyframes,
                lookAt: [0, 2, 0],  // All acts look at void sphere at Y=2
                lookAhead: false
            });
        }
    }

    _updateCameraSpline(dt, songTime) {
        if (!this.activeSpline || !this.cameraManager) return;

        this.splineElapsed += dt;

        if (this.splineElapsed >= this.activeSpline.duration) {
            if (window.SONOITE_DEBUG && this.splineElapsed < this.activeSpline.duration + 1) {
                dlog('[Track5VoidDirector] Spline complete');
            }
        }
    }

    // ==================== PHASE ACTIVATION ====================

    _activateAwakeningMode() {
        // Void sphere begins subtle pulsing
        const voidSphere = this.getLayer('void_sphere');
        if (voidSphere && voidSphere.setBreathingIntensity) {
            voidSphere.setBreathingIntensity(0.15);
        }

        // Cold haze becomes slightly visible
        this.executeAction({
            type: 'opacity',
            target: 'cold_haze',
            params: { value: 0.12, duration: 8.0, easing: 'easeInQuad' }
        });
    }

    _activateWantingMode() {
        // Void sphere breathing intensifies
        const voidSphere = this.getLayer('void_sphere');
        if (voidSphere && voidSphere.setBreathingIntensity) {
            voidSphere.setBreathingIntensity(0.4);
        }
    }

    _activateReleaseMode() {
        // Enable trails on desktop
        const voidDust = this.getLayer('void_dust');
        if (voidDust && voidDust.setTrailsEnabled && !this.isMobile) {
            voidDust.setTrailsEnabled(true);
        }

        // Void sphere calms
        const voidSphere = this.getLayer('void_sphere');
        if (voidSphere && voidSphere.setBreathingIntensity) {
            voidSphere.setBreathingIntensity(0.2);
        }
    }

    _activateErasureMode() {
        // Everything fades except void sphere
        this.executeAction({
            type: 'opacity',
            target: 'cold_haze',
            params: { value: 0, duration: 25.0, easing: 'easeInQuad' }
        });

        // Disable trails
        const voidDust = this.getLayer('void_dust');
        if (voidDust && voidDust.setTrailsEnabled) {
            voidDust.setTrailsEnabled(false);
        }

        // Void sphere holds until final breath
        const voidSphere = this.getLayer('void_sphere');
        if (voidSphere && voidSphere.setBreathingIntensity) {
            voidSphere.setBreathingIntensity(0.1);
        }
    }

    // ==================== KEY MOMENT TRIGGERS ====================

    _triggerVoidAwakens() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Void awakens');
        }

        // Particle burst
        const voidDust = this.getLayer('void_dust');
        if (voidDust && voidDust.spawnBurstFromOrigin) {
            voidDust.spawnBurstFromOrigin(200, {
                speed: 3.0,
                spread: 1.2,
                lifetime: 6.0
            });
        }

        // Bloom pulse
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.addBloomImpulse?.(0.2, 2.0);
        }
    }

    _triggerDesireEmerges() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Desire emerges');
        }

        // Void sphere glow intensifies
        this.executeAction({
            type: 'glow',
            target: 'void_sphere',
            params: { intensity: 1.5, duration: 8.0 }
        });

        // Camera subtle shake
        if (this.cameraManager) {
            this.cameraManager.triggerShake?.(0.3, 2.0);
        }
    }

    _triggerClimax() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] CLIMAX - peak wanting');
        }

        // Massive particle burst
        const voidDust = this.getLayer('void_dust');
        if (voidDust && voidDust.spawnBurstFromOrigin) {
            voidDust.spawnBurstFromOrigin(600, {
                speed: 10.0,
                spread: 2.0,
                lifetime: 5.0
            });
        }

        // Chromatic aberration spike
        if (this.useDirectorPostProcessing && this.postProcessing?.setChromaticAberration) {
            this.postProcessing.setChromaticAberration(0.25, 0.5);
            this._queueTimeout(() => {
                if (this.useDirectorPostProcessing && this.postProcessing?.setChromaticAberration) {
                    this.postProcessing.setChromaticAberration(0.15, 2.0);
                }
            }, 500);
        }

        // Bloom peak
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.addBloomImpulse?.(0.4, 3.0);
        }

        // Camera dramatic push
        if (this.cameraManager) {
            this.cameraManager.dolly?.(-2.0, 4.0, 'easeOutQuad');
        }

        // 6-AGENT-FIX: Boost singularity lens at climax
        this._boostSingularityLens();
    }

    _triggerSurrender() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Surrender - release begins');
        }

        // Void sphere dims
        this.executeAction({
            type: 'opacity',
            target: 'void_sphere',
            params: { value: 0.6, duration: 10.0, easing: 'easeOutQuad' }
        });

        // Bloom decrease
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setBloomTarget?.(0.2, 8.0);
        }
    }

    _triggerOverwhelm() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Overwhelm - maximum particle density');
        }

        // Vignette tightens
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(0.75, 5.0);
        }
    }

    _triggerDissolution() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Dissolution - final fade begins');
        }

        // Prepare for final breath
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(0.92, 15.0);
            this.postProcessing.setBloomTarget?.(0.08, 12.0);
        }
    }

    _triggerFinalBreath() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Final breath - SPAGHETTIFICATION begins');
        }

        // Void sphere final pulse
        const voidSphere = this.getLayer('void_sphere');
        if (voidSphere && voidSphere.setBreathingIntensity) {
            voidSphere.setBreathingIntensity(0.3);
            this._queueTimeout(() => {
                if (voidSphere && voidSphere.setBreathingIntensity) {
                    voidSphere.setBreathingIntensity(0);
                }
            }, 3000);
        }

        // Final particle fade
        const voidDust = this.getLayer('void_dust');
        if (voidDust && voidDust.setPhaseParticleDensity) {
            voidDust.setPhaseParticleDensity('VOID', 18.0);
        }

        // Crush to black
        if (this.useDirectorPostProcessing && this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(1.0, 18.0);
            this.postProcessing.setBrightnessTarget?.(0.3, 18.0);
        }

        // === SPAGHETTIFICATION: Camera accelerates into the void ===
        // External auditor concept: "At 9:00, camera accelerates into void,
        // visuals stretch - like falling past the event horizon"

        // 1. Camera dolly INTO the void (negative = toward center)
        // Over 18 seconds with accelerating ease (easeInCubic)
        if (this.cameraManager?.dolly) {
            this.cameraManager.dolly(-12, 18.0, 'easeInCubic');
        }

        // 2. FOV narrows creating tunnel vision (78 → 25)
        // The world squeezes as you fall in
        if (this.cameraManager?.animateFOV) {
            this.cameraManager.animateFOV(25, 18.0, 'easeInCubic');
        }

        // 3. Chromatic aberration ramps up - light stretching/red/blue shifting
        // Starts subtle, builds to noticeable
        if (this.useDirectorPostProcessing && this.postProcessing?.setChromaticAberration) {
            // Initial subtle ramp
            this.postProcessing.setChromaticAberration(0.08, 6.0);

            // Intensify at 6s mark
            this._queueTimeout(() => {
                if (this.useDirectorPostProcessing && this.postProcessing?.setChromaticAberration) {
                    this.postProcessing.setChromaticAberration(0.18, 6.0);
                }
            }, 6000);

            // Peak at 12s mark
            this._queueTimeout(() => {
                if (this.useDirectorPostProcessing && this.postProcessing?.setChromaticAberration) {
                    this.postProcessing.setChromaticAberration(0.35, 6.0);
                }
            }, 12000);
        }

        // 4. Disable bass yank during spaghettification (camera should flow smoothly into void)
        this.yankThreshold = 10; // Effectively disable
    }

    _triggerChromaticBurst() {
        if (!this.useDirectorPostProcessing || !this.postProcessing?.setChromaticAberration) return;

        // Quick spike and decay
        this.postProcessing.setChromaticAberration(0.22, 0.1);
        this._queueTimeout(() => {
            if (!this.useDirectorPostProcessing || !this.postProcessing?.setChromaticAberration) return;
            this.postProcessing.setChromaticAberration(0.15, 1.0);
        }, 100);

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Chromatic burst on bass peak');
        }
    }

    // ==================== POST-PROCESSING ====================

    _updatePostProcessing(dt, songTime, smoothedAudio) {
        if (!this.postProcessing || !smoothedAudio) return;

        const phase = PHASES[this.currentPhase];

        // Audio-reactive bloom (capped)
        const bloomTarget = Math.min(
            phase.bloom + smoothedAudio.bass * 0.15,
            CAPS.bloom
        );

        if (this.postProcessing.setBloomFromAudio) {
            this.postProcessing.setBloomFromAudio(
                smoothedAudio.bass,
                smoothedAudio.mid
            );
        }

        // Brightness modulation during WANTING phase
        if (this.currentPhase === 'WANTING' && this.postProcessing.setBrightnessTarget) {
            const brightnessMod = phase.brightness + smoothedAudio.treble * 0.1;
            this.postProcessing.setBrightnessTarget(brightnessMod, 0.5);
        }
    }

    // ==================== PUBLIC API ====================

    getOwnershipMap() {
        return this._ownershipMap;
    }

    /**
     * Force phase change from external trigger (e.g., enriched-moments.json)
     * @param {string} phase - One of: 'VOID', 'AWAKENING', 'WANTING', 'RELEASE', 'ERASURE'
     */
    forcePhaseChange(phase) {
        const normalizedPhase = String(phase).trim().toUpperCase();

        if (!PHASES[normalizedPhase]) {
            if (window.SONOITE_DEBUG) {
                console.warn(`[Track5VoidDirector] forcePhaseChange: Invalid phase "${phase}". Valid phases: ${Object.keys(PHASES).join(', ')}`);
            }
            return;
        }

        if (normalizedPhase === this.currentPhase) {
            if (window.SONOITE_DEBUG) {
                dlog(`[Track5VoidDirector] forcePhaseChange: Already in ${normalizedPhase}, skipping`);
            }
            return;
        }

        this.previousPhase = this.currentPhase;
        this.currentPhase = normalizedPhase;
        this._onPhaseChange(normalizedPhase);

        if (window.SONOITE_DEBUG) {
            dlog(`[Track5VoidDirector] forcePhaseChange: ${this.previousPhase} → ${normalizedPhase} (forced)`);
        }
    }

    /**
     * Get current phase info (extended with Track5-specific data)
     */
    getCurrentPhase() {
        return {
            name: this.currentPhase,
            ...PHASES[this.currentPhase],
            isFrozen: this.isFrozen
        };
    }

    // ==================== LIFECYCLE ====================

    _queueTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this._timeoutIds.delete(timeoutId);
            callback();
        }, delay);
        this._timeoutIds.add(timeoutId);
        return timeoutId;
    }

    _clearPendingTimeouts() {
        this._timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
        this._timeoutIds.clear();
    }

    /**
     * Reset Track5-specific state
     */
    reset() {
        this._clearPendingTimeouts();
        super.reset();

        this.isInitialized = false;
        this.activeSpline = null;
        this.splineStartTime = 0;
        this.splineElapsed = 0;
        this._lastSongTime = 0;
        this.chromaticBurstCooldown = 0;
        this.yankCooldown = 0;
        this.yankThreshold = this._yankThresholdBase;
        this._eclipsePassTriggered = false;
        this.setpieces = { veil: null, ring: null, eclipse: null };
        this.timelineOwnsNarrative = false;
        this._guardrailWarnings.clear();

        if (window.SONOITE_DEBUG) {
            dlog('[Track5VoidDirector] Reset');
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.reset();
        super.dispose();
    }
}

export default Track5VoidDirector;
