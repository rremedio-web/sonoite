/**
 * Track1Director.js - Sonoite Journey Phase Orchestration
 *
 * Extends BaseDirector with Sonoite-specific:
 * - 4 phases: ASCEND → FRACTURE → ECLIPSE → MEMORY
 * - Key moments: THE UNFREEZE, TORNADO, CLIMAX, FINAL SNAP
 * - Egg shudder on bass transients
 * - Vortex speed modulation
 * - Ambient light choreography
 *
 * @package SonoiteTheme
 * @version 2.0.0 - Now extends BaseDirector
 */

import { BaseDirector, DEFAULT_CAPS } from './BaseDirector.js';
import { dlog } from '../utils/devlog.js';

/**
 * Sonoite phase definitions with timestamps and visual targets
 */
const PHASES = {
    ASCEND: {
        start: 0,
        end: 125,      // 2:05
        vignette: 0.25,
        bloom: 0.4,
        fogMax: 0.15,
        cameraIntensity: 0.3,
        description: 'Frozen world, unfreeze at first beat'
    },
    FRACTURE: {
        start: 125,
        end: 329,      // 5:29
        vignette: 0.45,
        bloom: 0.5,
        fogMax: 0.25,
        cameraIntensity: 0.6,
        description: 'Energy builds, syncopated shimmer'
    },
    ECLIPSE: {
        start: 329,
        end: 480,      // 8:00
        vignette: 0.5,
        bloom: 0.6,
        fogMax: 0.35,
        cameraIntensity: 0.8,
        description: 'Claustrophobic breakdown, then eruption'
    },
    MEMORY: {
        start: 480,
        end: 538,      // 8:58
        vignette: 0.95,
        bloom: 0.4,
        fogMax: 0.1,
        cameraIntensity: 0.2,
        description: 'Egg holds bright, snaps to black'
    }
};

/**
 * Sonoite key beat timestamps (BPM 140)
 */
const BEATS = {
    firstBeat: 35.4,           // THE UNFREEZE
    firstSolo: 178.09,         // 2:58.09
    breakdown: 329.18,         // 5:29.18
    climax: 384.03,            // 6:24.03
    tornadoStart: 370.0,       // 6:10.00
    tornadoEnd: 480.0,         // 8:00.00
    thirdWave: 453.03,         // 7:33.03
    outro: 503.59,             // 8:23.59
    finalSnap: 535.0           // 8:55
};

/**
 * Sonoite-specific caps
 */
const CAPS = {
    ...DEFAULT_CAPS,
    audioSmoothing: 0.08
};

export class Track1Director extends BaseDirector {
    constructor(options = {}) {
        // Initialize base with Sonoite-specific config
        super({
            ...options,
            phases: PHASES,
            beats: BEATS,
            caps: CAPS,
            trackName: 'Track1',
            phaseAlpha: {
                ASCEND: 0.02,     // Very slow, mysterious
                FRACTURE: 0.05,   // Building energy
                ECLIPSE: 0.08,    // More reactive for climax
                MEMORY: 0.02      // Slow fade
            }
        });

        // Track1-specific state
        this.climaxTriggered = false;
        this.tornadoTriggered = false;
        this.finalSnapTriggered = false;

        // Egg shudder state (bass transient scale spikes)
        this._lastShudderTime = 0;
        this._shudderCooldown = 0.1;   // 100ms minimum between shudders
        this._shudderThreshold = 0.65; // Bass threshold for trigger
        this._previousBass = 0;        // For onset detection

        // Camera state
        this.orbitAngle = 0;
        this.orbitActive = false;
    }

    /**
     * Main update - extends base with Track1-specific logic
     */
    update(dt, songTime, rawAudio) {
        // Call base update (phase detection, audio smoothing)
        const smoothed = super.update(dt, songTime, rawAudio);

        // Check for Track1-specific key moments
        this._checkKeyMoments(songTime, rawAudio);

        // Update camera behavior
        this._updateCamera(dt, songTime);

        // Update post-processing
        this._updatePostProcessing(songTime, rawAudio);

        // Egg shudder on bass transients (after unfrozen)
        if (!this.isFrozen && rawAudio) {
            this._checkEggShudder(songTime, rawAudio);
        }

        // Vortex speed boost during peak phase (6:06-8:08)
        this._updateVortexSpeed(songTime, rawAudio);

        return smoothed;
    }

    /**
     * Override phase change for Track1-specific behaviors
     */
    _onPhaseChange(newPhase) {
        // Call base phase change handler
        super._onPhaseChange(newPhase);

        // Track1-specific phase behaviors
        switch (newPhase) {
            case 'FRACTURE':
                this._activateFractureMode();
                break;
            case 'ECLIPSE':
                this._prepareClimaxBuild();
                break;
            case 'MEMORY':
                this._beginFadeToVoid();
                break;
        }
    }

    /**
     * Check for Track1 key moments
     */
    _checkKeyMoments(songTime, rawAudio) {
        // THE UNFREEZE - first beat at 35.4s
        if (this.shouldTrigger('unfreeze', songTime, BEATS.firstBeat)) {
            this._triggerUnfreeze();
        }

        // TORNADO window begins at ~6:10
        if (this.shouldTrigger('tornado', songTime, BEATS.tornadoStart)) {
            this._triggerTornadoStart();
        }

        // CLIMAX at 6:24.03
        if (this.shouldTrigger('climax', songTime, BEATS.climax)) {
            this._triggerClimax();
        }

        // FINAL SNAP at 8:55
        if (this.shouldTrigger('finalSnap', songTime, BEATS.finalSnap)) {
            this._triggerFinalSnap();
        }
    }

    /**
     * THE UNFREEZE - dramatic moment when frozen world comes alive
     */
    _triggerUnfreeze() {
        // Use base unfreeze with Track1 options
        this.triggerUnfreeze({
            duration: 2.0,
            burstIntensity: 1.2
        });

        // Track1 specific: anchor framing on the egg
        if (this.cameraManager) {
            this.cameraManager.setLookAtTarget?.(0, 2, 0);
        }
    }

    /**
     * CLIMAX - the peak moment with particle burst, camera push, fog lift
     */
    _triggerClimax() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track1Director] CLIMAX eruption triggered');
        }

        // Particle burst (400 particles)
        const starDust = this.getLayer('star_dust');
        if (starDust?.climaxBurst) {
            starDust.climaxBurst(400, { speed: 8.0 });
        } else if (starDust?.spawnBurstFromOrigin) {
            starDust.spawnBurstFromOrigin(400, {
                speed: 8.0,
                spread: 1.5,
                lifetime: 4.0
            });
        }

        // Camera push-in + FOV change
        if (this.cameraManager) {
            this.cameraManager.dolly?.(-2.5, 6.0, 'easeOutQuad');
            this.cameraManager.animateFOV?.(58, 6.0, 'easeOutCubic');
        }

        // Fog LIFTS at climax (not suffocates)
        if (this.postProcessing) {
            this.postProcessing.setFogTarget?.(0.15, 5.0);
            this.postProcessing.addBloomImpulse?.(0.4, 3.0);
            this.postProcessing.setVignetteTarget?.(0.5, 4.0);
        }
    }

    /**
     * FINAL SNAP - egg holds bright, then snaps to black
     */
    _triggerFinalSnap() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track1Director] FINAL SNAP - egg snaps to black');
        }

        // Egg snaps to black (0.5s - fast, dramatic)
        this.executeAction({
            type: 'opacity',
            target: 'egg_crystal',
            params: { value: 0, duration: 0.5, easing: 'linear' }
        });

        // Post-processing crushes to black
        if (this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(1.0, 0.5);
            this.postProcessing.setBloomTarget?.(0, 0.5);
        }
    }

    /**
     * FRACTURE phase activation
     */
    _activateFractureMode() {
        this.orbitActive = true;

        const starDust = this.getLayer('star_dust');
        if (starDust?.setMotionMode) {
            starDust.setMotionMode('chaos', 0.3);
        }
        if (starDust?.setFractureIntensity) {
            starDust.setFractureIntensity(0.3, {});
        }
    }

    /**
     * TORNADO start (6:10-8:00)
     */
    _triggerTornadoStart() {
        if (window.SONOITE_DEBUG) {
            dlog('[Track1Director] TORNADO start (6:10)');
        }

        // Camera setup for tornado
        if (this.cameraManager) {
            this.cameraManager.animateFOV?.(60, 12.0, 'easeInOutSine');
            this.cameraManager.setBehavior?.('witness', {
                radius: 14,
                height: 3.5,
                speed: 0.012,
                shake: false
            });
        }

        // Particles: begin vortex buildup
        const starDust = this.getLayer('star_dust');
        if (starDust?.transitionVortex) {
            starDust.transitionVortex(
                {
                    strength: 0.62,
                    speed: 1.35,
                    height: 12.0,
                    topRadius: 7.0,
                    bottomRadius: 0.7,
                    riseSpeed: 0.9,
                    spiralTightness: 2.2
                },
                Math.max(2.0, BEATS.tornadoEnd - BEATS.tornadoStart),
                'easeInCubic'
            );
        }
    }

    /**
     * ECLIPSE phase preparation
     */
    _prepareClimaxBuild() {
        // Fade distant elements
        this.executeAction({
            type: 'opacity',
            target: 'distant_shards',
            params: { value: 0, duration: 8.0, easing: 'easeInQuad' }
        });
        this.executeAction({
            type: 'opacity',
            target: 'star_dust',
            params: { value: 0.1, duration: 8.0, easing: 'easeInQuad' }
        });

        // Claustrophobic vignette
        if (this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(0.75, 10.0);
        }

        // Dampen ambient light for ECLIPSE
        this.animateAmbientLight(0.1, 6.0);
    }

    /**
     * MEMORY phase - fade to void
     */
    _beginFadeToVoid() {
        // Restore ambient light
        this.animateAmbientLight(0.6, 8.0);

        // Fade layers
        this.executeAction({
            type: 'opacity',
            target: 'distant_shards',
            params: { value: 0, duration: 18.0, easing: 'easeInQuad' }
        });
        this.executeAction({
            type: 'opacity',
            target: 'heavy_fog',
            params: { value: 0.06, duration: 30.0, easing: 'easeOutQuad' }
        });
        this.executeAction({
            type: 'opacity',
            target: 'star_dust',
            params: { value: 0.12, duration: 22.0, easing: 'easeOutQuad' }
        });

        // Egg holds bright
        this.executeAction({
            type: 'glow',
            target: 'egg_crystal',
            params: { intensity: 1.8, duration: 30.0 }
        });

        // Relax tornado into afterimage
        const starDust = this.getLayer('star_dust');
        if (starDust?.transitionVortex) {
            starDust.transitionVortex(
                {
                    strength: 0.14,
                    speed: 0.35,
                    height: 12.0,
                    topRadius: 7.0,
                    bottomRadius: 1.4,
                    riseSpeed: 0.4,
                    spiralTightness: 1.2
                },
                55.0,
                'easeOutCubic'
            );
        }

        // Post-processing fade
        if (this.postProcessing) {
            this.postProcessing.setVignetteTarget?.(0.85, 30.0);
            this.postProcessing.setFogTarget?.(0.10, 20.0);
        }

        // Camera release
        if (this.cameraManager) {
            this.cameraManager.setBehavior?.('witness', {
                radius: 10.5,
                height: 3.0,
                speed: 0.006,
                shake: false
            });
            this.cameraManager.animateFOV?.(62, 18.0, 'easeOutCubic');
        }
    }

    /**
     * Update camera during TORNADO phase
     */
    _updateCamera(dt, songTime) {
        if (!this.cameraManager) return;

        // TORNADO spiral ramp (6:10-8:00)
        if (songTime >= BEATS.tornadoStart && songTime < BEATS.tornadoEnd) {
            const span = Math.max(1, BEATS.tornadoEnd - BEATS.tornadoStart);
            const t = Math.max(0, Math.min(1, (songTime - BEATS.tornadoStart) / span));
            const eased = t * t * (3 - 2 * t); // smoothstep

            const radius = 14.0 + (6.5 - 14.0) * eased;
            const speed = 0.012 + (0.070 - 0.012) * eased;
            const height = 3.5 + (2.2 - 3.5) * eased;

            this.cameraManager.updateConfig?.({
                orbitRadius: radius,
                orbitHeight: height,
                rotationSpeed: speed,
                autoRotate: true,
                audioShake: false
            });
        }
    }

    /**
     * Check for bass transients and trigger egg shudder
     */
    _checkEggShudder(songTime, rawAudio) {
        const bass = rawAudio.bass || 0;
        const now = performance.now() / 1000;

        // Onset detection
        const isOnset = bass > this._shudderThreshold &&
                        bass > this._previousBass * 1.15 &&
                        (now - this._lastShudderTime) > this._shudderCooldown;

        if (isOnset) {
            this._triggerEggShudder(bass);
            this._lastShudderTime = now;
        }

        this._previousBass = bass;
    }

    /**
     * Trigger egg scale shudder
     */
    _triggerEggShudder(bassIntensity) {
        const egg = this.getLayer('egg_crystal');
        if (!egg) return;

        const scaleBoost = 1.0 + 0.03 + (bassIntensity * 0.05);

        if (egg.shimmer) {
            egg.shimmer(0.4, 0.05);
        }

        if (egg.group?.scale) {
            const originalScale = egg.group.scale.x;
            egg.group.scale.setScalar(originalScale * scaleBoost);
            setTimeout(() => {
                if (egg.group?.scale) {
                    egg.group.scale.setScalar(originalScale);
                }
            }, 50);
        }
    }

    /**
     * Boost vortex speed during peak phase (6:06-8:08)
     */
    _updateVortexSpeed(songTime, rawAudio) {
        const PEAK_START = 366;
        const PEAK_END = 488;

        if (songTime < PEAK_START || songTime > PEAK_END) return;

        const starDust = this.getLayer('star_dust');
        if (!starDust?.material?.uniforms?.uVortexSpeed) return;

        const baseSpeed = 1.35;
        const maxBoost = 1.15;
        const loudness = rawAudio?.loudness || 0;
        const finalSpeed = Math.min(baseSpeed + (loudness * maxBoost), 2.5);

        starDust.material.uniforms.uVortexSpeed.value = finalSpeed;
    }

    /**
     * Update post-processing based on audio
     */
    _updatePostProcessing(songTime, rawAudio) {
        if (!this.postProcessing || !rawAudio) return;

        const bass = Number.isFinite(this.smoothedAudio?.bass) ? this.smoothedAudio.bass : 0;
        const mid = Number.isFinite(this.smoothedAudio?.mid) ? this.smoothedAudio.mid : 0;

        if (this.postProcessing.setBloomFromAudio) {
            this.postProcessing.setBloomFromAudio(
                bass,
                mid
            );
        }

        // Visibility guard: ASCEND should never collapse into near-black on darker displays.
        if (typeof this.postProcessing.setBrightness === 'function') {
            if (this.currentPhase === 'ASCEND') {
                const target = Math.min(1.12, 1.03 + mid * 0.04 + bass * 0.02);
                this.postProcessing.setBrightness(target);
            } else if (this.currentPhase === 'MEMORY') {
                this.postProcessing.setBrightness(0.98);
            } else {
                this.postProcessing.setBrightness(1.0);
            }
        }
    }

    /**
     * Reset Track1-specific state
     */
    reset() {
        super.reset();

        this.climaxTriggered = false;
        this.tornadoTriggered = false;
        this.finalSnapTriggered = false;
        this._lastShudderTime = 0;
        this._previousBass = 0;
        this.orbitAngle = 0;
        this.orbitActive = false;
    }
}

export default Track1Director;
