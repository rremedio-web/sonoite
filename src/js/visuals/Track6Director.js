/**
 * Track6Director.js - O Filho Journey Phase Orchestration
 *
 * Extends BaseDirector with O Filho-specific:
 * - 4 phases: PRESENCE → CONFRONTATION → LEGACY → DEPARTURE
 * - Key moments: FIRST BASS, FIRST CLIMAX, SECOND CLIMAX, FINAL FADE
 * - Monolith reactivity (bass → emissive, treble → roughness)
 * - Falling ash density/glow modulation
 * - Warm amber palette throughout
 *
 * Track analysis: 94 BPM, 6:02 duration
 * Two peaks: 0:54 (0.3971) and 3:55 (0.4246 - highest)
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { BaseDirector, DEFAULT_CAPS } from './BaseDirector.js';
import { dlog } from '../utils/devlog.js';
import { SuccessionController } from './materials/SuccessionMaterial.js';

/**
 * O Filho phase definitions with timestamps and visual targets
 */
const PHASES = {
    PRESENCE: {
        start: 0,
        end: 54,           // 0:54
        vignette: 0.5,
        bloom: 0.6,
        fogMax: 0.1,
        cameraIntensity: 0.3,
        description: 'Father\'s shadow establishes, immediate power'
    },
    CONFRONTATION: {
        start: 54,
        end: 181,          // 3:01
        vignette: 0.65,
        bloom: 0.7,
        fogMax: 0.15,
        cameraIntensity: 0.6,
        description: 'Building tension, first peak, energy dip, rising'
    },
    LEGACY: {
        start: 181,
        end: 272,          // 4:32
        vignette: 0.75,
        bloom: 0.8,
        fogMax: 0.2,
        cameraIntensity: 0.8,
        description: 'Sustained tension, second peak at 3:55'
    },
    DEPARTURE: {
        start: 272,
        end: 362,          // 6:02
        vignette: 0.6,
        bloom: 0.3,
        fogMax: 0.08,
        cameraIntensity: 0.2,
        description: 'Letting go, monolith recedes, ash settles'
    }
};

/**
 * O Filho key beat timestamps (BPM 94)
 */
const BEATS = {
    firstBass: 14,             // 0:14 - first bass hit
    firstClimax: 54,           // 0:54 - FIRST PEAK (0.3971)
    energyDip: 90,             // 1:30 - energy dip
    confrontation: 126,        // 2:06 - rising again
    sustained: 181,            // 3:01 - sustained
    secondClimax: 235,         // 3:55 - SECOND PEAK (0.4246 highest)
    departureBegin: 272,       // 4:32 - beginning fade
    lettingGo: 308,            // 5:08 - departure
    finalFade: 326             // 5:26 - approaching silence
};

/**
 * O Filho-specific caps
 */
const CAPS = {
    ...DEFAULT_CAPS,
    audioSmoothing: 0.1        // Slightly slower smoothing for 94 BPM
};

/**
 * 4-SEGMENT CAMERA GRAMMAR
 * External auditor concept: "4-segment camera grammar for O Filho narrative arc"
 * Each segment has distinct behavior to match the father-son confrontation story.
 */
const CAMERA_GRAMMAR = {
    PRESENCE: {
        behavior: 'stationary_witness',
        position: [0, 4.3, 11.6],
        lookAt: [0, 5.2, 0],          // Hold the monolith core on-axis from frame one
        fovBase: 60,
        bassShake: { enabled: true, magnitude: 0.01 },
        bassFOV: false,
        description: 'Witnessing the father\'s presence, restrained'
    },
    CONFRONTATION: {
        behavior: 'handheld_panic',
        fovBase: 55,
        fovRange: [55, 75],         // FOV dilates on bass
        bassFOV: true,
        shakeMagnitude: 0.03,
        shakeSpeed: 8.0,
        description: 'Fear and tension, camera struggles'
    },
    LEGACY: {
        behavior: 'orbit_reactive',
        fovBase: 60,
        orbitSpeed: 0.015,
        orbitRadius: 10,
        orbitHeight: 4,
        verticalShake: true,       // Vertical shake on bass
        verticalMagnitude: 0.04,
        description: 'Maximum reactivity, circling for perspective'
    },
    DEPARTURE: {
        behavior: 'dolly_out',
        startPos: [0, 4, 10],
        endPos: [0, 6, 20],
        fovBase: 70,
        duration: 90,              // Full phase duration
        fadeReactivity: true,      // Gradually reduce all effects
        description: 'Letting go, camera retreats slowly'
    }
};

/**
 * Camera splines for structured movement (optional, per-segment)
 */
const CAMERA_SPLINES = {
    PRESENCE_DRIFT: {
        waypoints: [
            { pos: [0, 4, 12], fov: 65, time: 0 },
            { pos: [1, 4.2, 11.5], fov: 66, time: 27 },
            { pos: [0, 4, 12], fov: 65, time: 54 }
        ],
        duration: 54,
        easing: 'easeInOutSine'
    },
    LEGACY_ORBIT: {
        waypoints: [
            { pos: [0, 4, 10], fov: 60, time: 0 },
            { pos: [6, 4.5, 7], fov: 58, time: 23 },
            { pos: [8, 5, 0], fov: 55, time: 45 },
            { pos: [6, 4.5, -7], fov: 58, time: 68 },
            { pos: [0, 4, -10], fov: 62, time: 91 }
        ],
        duration: 91,
        easing: 'linear'
    },
    DEPARTURE_RETREAT: {
        waypoints: [
            { pos: [0, 4, 10], fov: 60, time: 0 },
            { pos: [0, 5, 14], fov: 68, time: 30 },
            { pos: [0, 5.5, 18], fov: 72, time: 60 },
            { pos: [0, 6, 25], fov: 78, time: 90 }
        ],
        duration: 90,
        easing: 'easeOutQuad'
    }
};

export class Track6Director extends BaseDirector {
    constructor(options = {}) {
        // Initialize base with O Filho-specific config
        super({
            ...options,
            phases: PHASES,
            beats: BEATS,
            caps: CAPS,
            trackName: 'Track6',
            phaseAlpha: {
                PRESENCE: 0.03,       // Slow build
                CONFRONTATION: 0.06,  // Building energy
                LEGACY: 0.08,         // Most reactive
                DEPARTURE: 0.02       // Slow fade
            }
        });

        // Track6-specific state
        this.firstClimaxTriggered = false;
        this.secondClimaxTriggered = false;
        this.finalFadeTriggered = false;

        // Monolith shimmer state (bass transient triggers)
        this._lastShimmerTime = 0;
        this._shimmerCooldown = 0.15;     // 150ms minimum between shimmers
        this._shimmerThreshold = 0.55;    // Bass threshold for trigger
        this._previousBass = 0;           // For onset detection

        // 4-SEGMENT CAMERA GRAMMAR state
        this._currentCameraGrammar = null;
        this._bassFOVEnabled = false;
        this._verticalShakeEnabled = false;
        this._fadeReactivityProgress = 0;
        this._activeSpline = null;
        this._splineStartTime = 0;
        this._initialPhaseApplied = false;

        // SUCCESSION MATERIAL: Father → Son transformation
        // Shell burns away to reveal inner fire at key moments
        this._successionController = null;
        this._successionInitialized = false;

        // HEAT-HAZE: Mobile detection (disable heavy effects on mobile)
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    /**
     * Main update - extends base with Track6-specific logic
     */
    update(dt, songTime, rawAudio) {
        // Call base update (phase detection, audio smoothing)
        const smoothed = super.update(dt, songTime, rawAudio);

        if (!this._initialPhaseApplied && this.currentPhase) {
            this._onPhaseChange(this.currentPhase);
            this._initialPhaseApplied = true;
        }

        // Initialize succession controller if not yet done
        this._initSuccessionController();

        // Check for Track6-specific key moments
        this._checkKeyMoments(songTime, rawAudio);

        // Update monolith reactivity
        this._updateMonolithReactivity(songTime, rawAudio);

        // Update falling ash density based on phase
        this._updateAshDensity(songTime, rawAudio);

        // Monolith shimmer on bass transients
        if (rawAudio) {
            this._checkMonolithShimmer(songTime, rawAudio);
        }

        // 4-SEGMENT CAMERA GRAMMAR: Update per-frame camera effects
        this._updateCameraGrammar(dt, songTime, rawAudio);

        // Update succession material (burn/reveal animation)
        if (this._successionController) {
            this._successionController.update(dt, this.smoothedAudio);
        }

        // LIGHT-SHAFTS: Update god rays position and intensity
        this._updateLightShafts(songTime);

        return smoothed;
    }

    /**
     * Initialize succession controller when monolith is available
     * Links SuccessionMaterial to the monolith shell for burn/reveal effect
     */
    _initSuccessionController() {
        if (this._successionInitialized) return;

        const monolith = this.getLayer('monolith');
        if (!monolith?.shellMaterial?.uniforms?.uTransition) {
            // Check if monolith uses succession material
            // Fall back to checking for standard MeshPhysicalMaterial
            if (monolith?.shell?.material?.uniforms) {
                // Has succession material attached
                this._successionController = new SuccessionController(monolith.shell.material);
                this._successionInitialized = true;

                if (window.SONOITE_DEBUG) {
                    dlog('[Track6Director] Succession controller initialized');
                }
            } else if (monolith?.coreMaterial) {
                // Standard Monolith - we'll control emissiveIntensity directly
                // since it doesn't have the custom SuccessionMaterial
                this._successionInitialized = true;
                this._useStandardMonolith = true;

                if (window.SONOITE_DEBUG) {
                    dlog('[Track6Director] Using standard Monolith (no SuccessionMaterial)');
                }
            }
        } else {
            // Direct reference to succession material uniforms
            this._successionController = new SuccessionController(monolith.shellMaterial);
            this._successionInitialized = true;
        }
    }

    /**
     * Override phase change for Track6-specific behaviors
     */
    _onPhaseChange(newPhase) {
        // Call base phase change handler
        super._onPhaseChange(newPhase);

        // Apply 4-SEGMENT CAMERA GRAMMAR for this phase
        this._applyCameraGrammar(newPhase);

        // Track6-specific phase behaviors
        switch (newPhase) {
            case 'PRESENCE':
                this._activatePresenceMode();
                break;
            case 'CONFRONTATION':
                this._activateConfrontationMode();
                break;
            case 'LEGACY':
                this._prepareLegacyClimb();
                break;
            case 'DEPARTURE':
                this._beginDeparture();
                break;
        }
    }

    /**
     * Check for Track6 key moments
     */
    _checkKeyMoments(songTime, rawAudio) {
        // FIRST BASS at 0:14
        if (this.shouldTrigger('firstBass', songTime, BEATS.firstBass)) {
            this._triggerFirstBass();
        }

        // FIRST CLIMAX at 0:54
        if (this.shouldTrigger('firstClimax', songTime, BEATS.firstClimax)) {
            this._triggerFirstClimax();
        }

        // SECOND CLIMAX at 3:55
        if (this.shouldTrigger('secondClimax', songTime, BEATS.secondClimax)) {
            this._triggerSecondClimax();
        }

        // FINAL FADE at 5:26
        if (this.shouldTrigger('finalFade', songTime, BEATS.finalFade)) {
            this._triggerFinalFade();
        }
    }

    /**
     * FIRST BASS - immediate power statement
     */
    _triggerFirstBass() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] FIRST BASS hit at 0:14');
        }

        // Monolith shimmer
        this.executeAction({
            type: 'shimmer',
            target: 'monolith',
            params: { amount: 0.6, duration: 2.0 }
        });

        // Ash glow responds
        this.executeAction({
            type: 'glow',
            target: 'falling_ash',
            params: { intensity: 1.3, duration: 3.0 }
        });
    }

    /**
     * FIRST CLIMAX at 0:54 - camera switches to handheld, chromatic burst
     * SUCCESSION: First crack appears, shell starts to burn (0 → 0.3)
     */
    _triggerFirstClimax() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] FIRST CLIMAX at 0:54 - shell first crack');
        }

        // Camera mode switch for intensity
        if (this.cameraManager) {
            // `handheld_panic` is a camera mode, not a behavior.
            this.cameraManager.setMode?.('handheld_panic');
            this.cameraManager.setBehavior?.('architect', {
                radius: 9,
                height: 3.5,
                speed: 0.03,
                shake: true
            });
        }

        // Bloom surge
        if (this.postProcessing) {
            this.postProcessing.setBloomTarget?.(0.7, 3.0);
            this.postProcessing.addBloomImpulse?.(0.3, 2.0);
        }

        // SUCCESSION MATERIAL: First crack, burn edge appears (0 → 0.3)
        if (this._successionController) {
            this._successionController.setTransition(0.3, 3.0);

            if (window.SONOITE_DEBUG) {
                dlog('[Track6Director] Succession: First crack 0 → 0.3');
            }
        } else if (this._useStandardMonolith) {
            // Fallback: boost emissive for standard Monolith
            const monolith = this.getLayer('monolith');
            if (monolith?.coreMaterial) {
                this._animateEmissive(monolith.coreMaterial, 0.6, 3.0);
            }
        }

        // Monolith intense shimmer
        this.executeAction({
            type: 'shimmer',
            target: 'monolith',
            params: { amount: 0.8, duration: 3.0 }
        });

        // Ash intensifies
        this.executeAction({
            type: 'glow',
            target: 'falling_ash',
            params: { intensity: 1.5, duration: 4.0 }
        });
    }

    /**
     * SECOND CLIMAX at 3:55 - highest energy point
     * SUCCESSION: Shell shatters, core fully revealed (0.3 → 1.0)
     */
    _triggerSecondClimax() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] SECOND CLIMAX at 3:55 - shell shatters');
        }

        // Maximum bloom
        if (this.postProcessing) {
            this.postProcessing.setBloomTarget?.(0.85, 4.0);
            this.postProcessing.addBloomImpulse?.(0.4, 3.0);
            this.postProcessing.setVignetteTarget?.(0.8, 4.0);
        }

        // SUCCESSION MATERIAL: Shell shatters, core reveals (→ 1.0)
        if (this._successionController) {
            this._successionController.setTransition(1.0, 5.0);
            // Bass-reactive heat pulse
            this._successionController.pulse();

            if (window.SONOITE_DEBUG) {
                dlog('[Track6Director] Succession: Shell shatters 0.3 → 1.0');
            }
        } else if (this._useStandardMonolith) {
            // Fallback: maximum emissive for standard Monolith
            const monolith = this.getLayer('monolith');
            if (monolith?.coreMaterial) {
                this._animateEmissive(monolith.coreMaterial, 1.5, 5.0);
            }
        }

        // All-layer shimmer
        this.executeAction({
            type: 'shimmer',
            target: 'monolith',
            params: { amount: 0.9, duration: 4.0 }
        });

        // Ash at maximum intensity
        this.executeAction({
            type: 'glow',
            target: 'falling_ash',
            params: { intensity: 1.8, duration: 5.0 }
        });

        this.executeAction({
            type: 'density',
            target: 'falling_ash',
            params: { multiplier: 1.6, duration: 4.0 }
        });
    }

    /**
     * FINAL FADE at 5:26 - approaching silence
     */
    _triggerFinalFade() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] FINAL FADE - approaching silence');
        }

        // Gradual fade to darkness
        if (this.postProcessing) {
            this.postProcessing.setBloomTarget?.(0.15, 20.0);
            this.postProcessing.setVignetteTarget?.(0.95, 30.0);
        }

        // Ash fades gently
        this.executeAction({
            type: 'opacity',
            target: 'falling_ash',
            params: { value: 0.15, duration: 25.0, easing: 'easeOutQuad' }
        });

        // Monolith dims
        this.executeAction({
            type: 'glow',
            target: 'monolith',
            params: { intensity: 0.2, duration: 20.0 }
        });
    }

    /**
     * CONFRONTATION phase activation
     */
    _activateConfrontationMode() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] Entering CONFRONTATION phase');
        }

        // Increase ash density
        this.executeAction({
            type: 'density',
            target: 'falling_ash',
            params: { multiplier: 1.3, duration: 8.0, easing: 'easeInOutQuad' }
        });

        // Vignette tightens
        if (this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(0.65, 6.0);
        }

        // HEAT-HAZE: Enable during CONFRONTATION (fire awakens)
        // Subtle shimmer around monolith as tension builds
        if (this.postProcessing?.setHeatHaze && !this.isMobile) {
            this.postProcessing.setHeatHaze(0.25, 4.0);
        }
    }

    /**
     * LEGACY phase - build to second climax
     */
    _prepareLegacyClimb() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] Entering LEGACY phase');
        }

        // Sustained ash density
        this.executeAction({
            type: 'density',
            target: 'falling_ash',
            params: { multiplier: 1.4, duration: 10.0 }
        });

        // Monolith presence strengthens
        this.executeAction({
            type: 'glow',
            target: 'monolith',
            params: { intensity: 0.6, duration: 12.0 }
        });

        // Camera returns to steadier behavior
        if (this.cameraManager) {
            // `cinematic_dolly` is a camera mode, not a behavior.
            this.cameraManager.setMode?.('cinematic_dolly');
            this.cameraManager.setBehavior?.('orbit', {
                radius: 10,
                height: 4,
                speed: 0.015,
                shake: false
            });
        }

        // HEAT-HAZE: Peak intensity during LEGACY (maximum heat)
        // The fire burns brightest as legacy is confronted
        if (this.postProcessing?.setHeatHaze && !this.isMobile) {
            this.postProcessing.setHeatHaze(0.45, 6.0);
        }
    }

    /**
     * DEPARTURE phase - letting go
     */
    _beginDeparture() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] Entering DEPARTURE phase - letting go');
        }

        // Ash begins to settle
        this.executeAction({
            type: 'density',
            target: 'falling_ash',
            params: { multiplier: 0.7, duration: 20.0, easing: 'easeOutQuad' }
        });

        this.executeAction({
            type: 'opacity',
            target: 'falling_ash',
            params: { value: 0.4, duration: 15.0 }
        });

        // Monolith glow fades
        this.executeAction({
            type: 'glow',
            target: 'monolith',
            params: { intensity: 0.35, duration: 18.0 }
        });

        // Camera pulls back slowly
        if (this.cameraManager) {
            this.cameraManager.dolly?.(4.0, 30.0, 'easeInOutQuad');
        }

        // Post-processing relaxes
        if (this.postProcessing) {
            this.postProcessing.setBloomTarget?.(0.3, 15.0);
            this.postProcessing.setVignetteTarget?.(0.6, 20.0);
        }

        // HEAT-HAZE: Fade out during DEPARTURE (fire dies)
        // The heat slowly dissipates as we let go
        if (this.postProcessing?.setHeatHaze && !this.isMobile) {
            this.postProcessing.setHeatHaze(0, 12.0);
        }

        // Dampen ambient light
        this.animateAmbientLight(0.3, 25.0);
    }

    /**
     * Check for bass transients and trigger monolith shimmer
     */
    _checkMonolithShimmer(songTime, rawAudio) {
        const bass = rawAudio.bass || 0;
        const now = performance.now() / 1000;

        // Onset detection
        const isOnset = bass > this._shimmerThreshold &&
                        bass > this._previousBass * 1.2 &&
                        (now - this._lastShimmerTime) > this._shimmerCooldown;

        if (isOnset) {
            this._triggerMonolithShimmer(bass);
            this._lastShimmerTime = now;
        }

        this._previousBass = bass;
    }

    /**
     * Trigger monolith shimmer effect
     */
    _triggerMonolithShimmer(bassIntensity) {
        const monolith = this.getLayer('monolith');
        if (!monolith) return;

        const shimmerAmount = 0.3 + (bassIntensity * 0.4);

        if (monolith.shimmer) {
            monolith.shimmer(shimmerAmount, 0.08);
        }
    }

    /**
     * Update monolith reactivity (continuous)
     */
    _updateMonolithReactivity(songTime, rawAudio) {
        if (!rawAudio) return;

        const monolith = this.getLayer('monolith');
        if (!monolith?.material?.uniforms) return;

        // Bass → emissive intensity
        const emissiveTarget = 0.2 + (this.smoothedAudio.bass * 2.8);
        if (!this._isAudioLinked('monolith', 'emissiveIntensity') && monolith.material.uniforms.emissiveIntensity) {
            const current = monolith.material.uniforms.emissiveIntensity.value;
            monolith.material.uniforms.emissiveIntensity.value =
                current + (emissiveTarget - current) * 0.1;
        }

        // Treble → roughness (inverted - more treble = smoother)
        const roughnessTarget = 0.25 - (this.smoothedAudio.treble * 0.22);
        if (!this._isAudioLinked('monolith', 'roughness') && monolith.material.uniforms.roughness) {
            const current = monolith.material.uniforms.roughness.value;
            monolith.material.uniforms.roughness.value =
                current + (roughnessTarget - current) * 0.06;
        }
    }

    /**
     * Check if a target uniform/property is currently owned by link_audio.
     * Prevents Director and JourneyController from fighting over the same channel.
     */
    _isAudioLinked(target, uniform) {
        const links = this.journeyController?.audioLinks;
        if (!Array.isArray(links) || links.length === 0) return false;
        return links.some((link) => link?.target === target && link?.uniform === uniform);
    }

    /**
     * LIGHT-SHAFTS: Update god rays position and intensity
     * Points light shafts at monolith top, varies intensity by phase
     */
    _updateLightShafts(songTime) {
        // Skip on mobile for performance
        if (this.isMobile) return;
        if (!this.postProcessing?.setGodRaysPosition) return;

        // Get monolith world position (top of monolith)
        const monolith = this.getLayer('monolith');
        if (!monolith?.group) return;

        // Pre-allocated vector for performance (avoid GC)
        if (!this._monolithTopPos) {
            this._monolithTopPos = new THREE.Vector3();
        }

        // Monolith top is at local Y=5 (approximate)
        this._monolithTopPos.set(0, 5, 0);
        monolith.group.localToWorld(this._monolithTopPos);

        // Project to screen space
        const screenPos = this.postProcessing.projectToScreen(this._monolithTopPos);
        if (screenPos) {
            this.postProcessing.setGodRaysPosition(screenPos.x, screenPos.y);
        }

        // Phase-based intensity (LEGACY is brightest)
        const phaseIntensity = {
            PRESENCE: 0.015,      // Subtle glow
            CONFRONTATION: 0.025, // Building
            LEGACY: 0.04,         // Peak intensity
            DEPARTURE: 0.01       // Fading
        };

        const targetIntensity = phaseIntensity[this.currentPhase] || 0.02;

        // Audio-reactive boost during high moments
        const bassBoost = (this.smoothedAudio?.bass || 0) * 0.015;
        const finalIntensity = Math.min(targetIntensity + bassBoost, 0.06);

        this.postProcessing.setGodRaysIntensity(finalIntensity);
    }

    /**
     * Update falling ash density based on phase and audio
     */
    _updateAshDensity(songTime, rawAudio) {
        if (!rawAudio) return;

        const ash = this.getLayer('falling_ash');
        if (!ash) return;

        // Phase-based base density
        const phaseDensity = {
            PRESENCE: 0.4,
            CONFRONTATION: 0.6,
            LEGACY: 0.7,
            DEPARTURE: 0.3
        };

        const baseDensity = phaseDensity[this.currentPhase] || 0.4;

        // Audio modulation (loudness adds density)
        const audioMod = this.smoothedAudio.loudness * 0.3;
        const targetDensity = baseDensity + audioMod;

        // Apply smoothly if setDensity exists
        if (ash.setDensity) {
            ash.setDensity(targetDensity);
        }
    }

    // ==================== 4-SEGMENT CAMERA GRAMMAR ====================

    /**
     * Apply camera grammar for a phase
     * External auditor: "4-segment camera grammar for narrative arc"
     */
    _applyCameraGrammar(phaseName) {
        const grammar = CAMERA_GRAMMAR[phaseName];
        if (!grammar) return;

        this._currentCameraGrammar = grammar;

        if (window.SONOITE_DEBUG) {
            dlog(`[Track6Director] Applying camera grammar: ${phaseName} - ${grammar.behavior}`);
        }

        // Apply behavior-specific settings to CameraManager
        if (this.cameraManager) {
            switch (grammar.behavior) {
                case 'stationary_witness':
                    // PRESENCE: Stationary with subtle bass shake
                    this.cameraManager.setBehavior?.('stationary', {
                        position: grammar.position,
                        shake: grammar.bassShake?.enabled
                    });
                    this.cameraManager.setCameraPosition?.(
                        grammar.position[0],
                        grammar.position[1],
                        grammar.position[2]
                    );
                    this.cameraManager.setLookAtTarget?.(
                        grammar.lookAt[0],
                        grammar.lookAt[1],
                        grammar.lookAt[2]
                    );
                    // Start subtle drift spline
                    this._startCameraSpline('PRESENCE_DRIFT');
                    break;

                case 'handheld_panic':
                    // CONFRONTATION: Handheld panic with bass FOV
                    this.cameraManager.setMode?.('handheld_panic');
                    this.cameraManager.setBehavior?.('architect', {
                        radius: 9,
                        height: 3.5,
                        speed: 0.03,
                        shake: true
                    });
                    this._bassFOVEnabled = grammar.bassFOV;
                    break;

                case 'orbit_reactive':
                    // LEGACY: Orbit with vertical shake
                    this.cameraManager.setBehavior?.('orbit', {
                        radius: grammar.orbitRadius,
                        height: grammar.orbitHeight,
                        speed: grammar.orbitSpeed
                    });
                    this._verticalShakeEnabled = grammar.verticalShake;
                    // Start orbit spline
                    this._startCameraSpline('LEGACY_ORBIT');
                    break;

                case 'dolly_out':
                    // DEPARTURE: Slow retreat
                    this._fadeReactivityProgress = 0;
                    // Start retreat spline
                    this._startCameraSpline('DEPARTURE_RETREAT');
                    break;
            }

            // Apply base FOV
            if (grammar.fovBase && this.cameraManager.animateFOV) {
                this.cameraManager.animateFOV(grammar.fovBase, 2.0, 'easeOutQuad');
            }
        }
    }

    /**
     * Start a camera spline for Track6
     */
    _startCameraSpline(splineName) {
        const spline = CAMERA_SPLINES[splineName];
        if (!spline || !this.cameraManager?.startSplinePath) return;

        // Convert Track6 waypoint format to CameraManager format
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
            lookAt: [0, 5.2, 0],  // Keep the reactor core framed, not the empty floor
            lookAhead: false
        });

        this._activeSpline = spline;
        this._splineStartTime = performance.now();

        if (window.SONOITE_DEBUG) {
            dlog(`[Track6Director] Started spline: ${splineName}`, {
                duration: spline.duration,
                waypoints: spline.waypoints.length
            });
        }
    }

    /**
     * Update camera grammar effects per frame
     */
    _updateCameraGrammar(dt, songTime, rawAudio) {
        if (!rawAudio || !this.cameraManager) return;

        const grammar = this._currentCameraGrammar;
        if (!grammar) return;

        // CONFRONTATION: Bass-reactive FOV dilation
        if (this._bassFOVEnabled && grammar.fovRange) {
            const bass = this.smoothedAudio.bass || 0;
            const [minFOV, maxFOV] = grammar.fovRange;
            const targetFOV = minFOV + (bass * (maxFOV - minFOV));

            // Apply smoothly to avoid jarring changes
            if (this.cameraManager.camera?.isPerspectiveCamera) {
                const currentFOV = this.cameraManager.camera.fov;
                const newFOV = currentFOV + (targetFOV - currentFOV) * 0.08;
                this.cameraManager.camera.fov = newFOV;
                this.cameraManager.camera.updateProjectionMatrix();
            }
        }

        // LEGACY: Vertical shake on bass
        if (this._verticalShakeEnabled && grammar.verticalMagnitude) {
            const bass = this.smoothedAudio.bass || 0;
            if (bass > 0.5) {
                const shakeMag = grammar.verticalMagnitude * (bass - 0.5) * 2;
                if (this.cameraManager.camera) {
                    // Apply subtle vertical offset
                    this.cameraManager.camera.position.y +=
                        (Math.random() - 0.5) * shakeMag;
                }
            }
        }

        // DEPARTURE: Fade reactivity
        if (grammar.fadeReactivity && this.currentPhase === 'DEPARTURE') {
            const phaseDuration = PHASES.DEPARTURE.end - PHASES.DEPARTURE.start;
            const phaseProgress = (songTime - PHASES.DEPARTURE.start) / phaseDuration;
            this._fadeReactivityProgress = Math.min(1, phaseProgress);

            // Reduce all audio effects as we approach the end
            const dampening = 1 - this._fadeReactivityProgress * 0.8;

            // Apply dampening to ash density modulation
            const ash = this.getLayer('falling_ash');
            if (ash?.setAudioDampening) {
                ash.setAudioDampening(dampening);
            }
        }
    }

    /**
     * PRESENCE phase - initial witness mode
     */
    _activatePresenceMode() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track6Director] Entering PRESENCE phase - witnessing');
        }

        // Initial monolith presence
        this.executeAction({
            type: 'glow',
            target: 'monolith',
            params: { intensity: 0.4, duration: 5.0 }
        });

        // Ash begins gently
        this.executeAction({
            type: 'opacity',
            target: 'falling_ash',
            params: { value: 0.5, duration: 3.0 }
        });

        // HEAT-HAZE: Ensure disabled during PRESENCE (cold start)
        if (this.postProcessing?.setHeatHaze && !this.isMobile) {
            this.postProcessing.setHeatHaze(0, 1.0);
        }
    }

    /**
     * Animate emissive intensity on standard MeshStandardMaterial
     * Used as fallback when SuccessionMaterial is not available
     */
    _animateEmissive(material, targetIntensity, duration) {
        if (!material) return;

        const start = material.emissiveIntensity || 0.2;
        const delta = targetIntensity - start;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);
            // EaseOutQuad
            const eased = 1 - (1 - t) * (1 - t);

            material.emissiveIntensity = start + delta * eased;

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Reset Track6-specific state
     */
    reset() {
        super.reset();

        this.firstClimaxTriggered = false;
        this.secondClimaxTriggered = false;
        this.finalFadeTriggered = false;
        this._lastShimmerTime = 0;
        this._previousBass = 0;

        // Reset camera grammar state
        this._currentCameraGrammar = null;
        this._bassFOVEnabled = false;
        this._verticalShakeEnabled = false;
        this._fadeReactivityProgress = 0;
        this._activeSpline = null;
        this._splineStartTime = 0;
        this._initialPhaseApplied = false;

        // Reset succession state
        this._successionController = null;
        this._successionInitialized = false;
        this._useStandardMonolith = false;
    }
}

export default Track6Director;
