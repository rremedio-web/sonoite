/**
 * BaseDirector.js - Unified Phase-Based Director for All Tracks
 *
 * Provides common infrastructure for track-specific directors:
 * - Phase management with timestamps
 * - Audio smoothing (EMA) with phase-specific alpha
 * - Ambient light control
 * - Audio-reactive triggers
 * - Post-processing target management
 * - Camera coordination
 *
 * Each track extends this class and defines:
 * - PHASES constant (timestamps + visual targets)
 * - BEATS constant (key moment timestamps)
 * - Track-specific trigger methods
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog } from '../utils/devlog.js';

/**
 * Default caps for effect values (can be overridden per track)
 */
export const DEFAULT_CAPS = {
    fog: 0.45,
    bloom: 0.6,
    vignette: 0.95,
    godRays: 0.5,
    audioSmoothing: 0.08  // ~250ms decay
};

/**
 * Default EMA alpha values per phase type
 */
export const DEFAULT_PHASE_ALPHA = {
    intro: 0.02,      // Very slow, mysterious
    build: 0.05,      // Building energy
    climax: 0.08,     // More reactive
    outro: 0.02       // Slow fade
};

export class BaseDirector {
    /**
     * @param {Object} options
     * @param {Object} options.experience - Main SonoiteExperience instance
     * @param {Object} options.journeyController - JourneyController instance
     * @param {Object} options.postProcessing - PostProcessingConfig instance
     * @param {Object} options.cameraManager - CameraManager instance
     * @param {Object} options.phases - Track-specific phase definitions
     * @param {Object} options.beats - Track-specific beat timestamps
     * @param {Object} options.caps - Effect caps (optional, uses DEFAULT_CAPS)
     * @param {string} options.trackName - Track name for logging
     */
    constructor(options = {}) {
        this.experience = options.experience || null;
        this.journeyController = options.journeyController || null;
        this.postProcessing = options.postProcessing || null;
        this.cameraManager = options.cameraManager || null;

        // Track-specific config (must be provided by subclass)
        this.phases = options.phases || {};
        this.beats = options.beats || {};
        this.caps = { ...DEFAULT_CAPS, ...(options.caps || {}) };
        this.trackName = options.trackName || 'Unknown';

        // Phase state
        this.currentPhase = null;
        this.previousPhase = null;
        this.phaseNames = Object.keys(this.phases);

        // Set initial phase to first defined phase
        if (this.phaseNames.length > 0) {
            this.currentPhase = this.phaseNames[0];
        }

        // Frozen state (THE UNFREEZE mechanic)
        this.isFrozen = true;
        this.unfreezeTriggered = false;

        // Smoothed audio state
        this.smoothedAudio = {
            bass: 0,
            mid: 0,
            treble: 0,
            loudness: 0
        };

        // EMA alpha values per phase (can be overridden)
        this.phaseAlpha = options.phaseAlpha || {};

        // Triggered moment flags (track subclass can add more)
        this._triggeredMoments = new Set();

        // Debug throttling
        this._lastPhaseLog = 0;
        this._lastDebugLog = 0;

        // Ambient light animation state
        this._ambientAnimationId = null;

        if (window.SONOITE_DEBUG) {
            dlog(`[${this.trackName}Director] Initialized`, {
                phases: this.phaseNames,
                caps: this.caps
            });
        }
    }

    /**
     * Main update - called every frame
     * Subclasses should call super.update() first
     *
     * @param {number} dt - Delta time in seconds
     * @param {number} songTime - Current song time in seconds
     * @param {Object} rawAudio - Raw audio data {bass, mid, treble, loudness}
     * @returns {Object} Smoothed audio data for downstream systems
     */
    update(dt, songTime, rawAudio) {
        // Update phase based on song time
        this._updatePhase(songTime);

        // Apply phase-based audio smoothing
        const smoothed = this._smoothAudio(rawAudio, dt);

        // Store for getter access
        this.smoothedBass = smoothed.bass;
        this.smoothedLoudness = smoothed.loudness;

        return smoothed;
    }

    /**
     * Determine current phase based on song time
     * @protected
     */
    _updatePhase(songTime) {
        if (this.phaseNames.length === 0) return;

        let newPhase = this.phaseNames[0]; // Default to first phase

        for (const phaseName of this.phaseNames) {
            const phaseData = this.phases[phaseName];
            if (songTime >= phaseData.start && songTime < phaseData.end) {
                newPhase = phaseName;
                break;
            }
        }

        // Check if song time is past all phases (use last phase)
        const lastPhase = this.phaseNames[this.phaseNames.length - 1];
        const lastPhaseData = this.phases[lastPhase];
        if (songTime >= lastPhaseData.end) {
            newPhase = lastPhase;
        }

        if (newPhase !== this.currentPhase) {
            this.previousPhase = this.currentPhase;
            this.currentPhase = newPhase;
            this._onPhaseChange(newPhase);
        }
    }

    /**
     * Handle phase transitions - override in subclass for custom behavior
     * @protected
     */
    _onPhaseChange(newPhase) {
        const phase = this.phases[newPhase];
        if (!phase) return;

        if (window.SONOITE_DEBUG) {
            const now = performance.now();
            if (now - this._lastPhaseLog > 1000) {
                dlog(`[${this.trackName}Director] Phase: ${this.previousPhase} → ${newPhase}`, {
                    description: phase.description,
                    vignette: phase.vignette,
                    bloom: phase.bloom
                });
                this._lastPhaseLog = now;
            }
        }

        // Apply phase post-processing targets (if defined)
        if (this.postProcessing) {
            if (phase.vignette !== undefined) {
                this.postProcessing.setVignetteTarget?.(phase.vignette, 4.0);
            }
            if (phase.fogMax !== undefined) {
                this.postProcessing.setFogTarget?.(phase.fogMax, 6.0);
            }
            if (phase.bloom !== undefined) {
                this.postProcessing.setBloomTarget?.(phase.bloom, 4.0);
            }
        }

        // Adjust camera intensity (if defined)
        if (this.cameraManager && phase.cameraIntensity !== undefined) {
            this.cameraManager.setPhaseMultiplier?.(phase.cameraIntensity);
        }
    }

    /**
     * Apply phase-based audio smoothing (EMA)
     * @protected
     */
    _smoothAudio(rawAudio, dt) {
        if (!rawAudio) return this.smoothedAudio;

        // Get alpha for current phase, or default
        const alpha = this.phaseAlpha[this.currentPhase] || this.caps.audioSmoothing;

        // EMA: smoothed = alpha * raw + (1 - alpha) * smoothed
        this.smoothedAudio.bass = alpha * (rawAudio.bass || 0) + (1 - alpha) * this.smoothedAudio.bass;
        this.smoothedAudio.mid = alpha * (rawAudio.mid || 0) + (1 - alpha) * this.smoothedAudio.mid;
        this.smoothedAudio.treble = alpha * (rawAudio.treble || 0) + (1 - alpha) * this.smoothedAudio.treble;
        this.smoothedAudio.loudness = alpha * (rawAudio.loudness || 0) + (1 - alpha) * this.smoothedAudio.loudness;

        return { ...this.smoothedAudio };
    }

    /**
     * Check if a moment should trigger (one-shot)
     * @param {string} momentId - Unique moment identifier
     * @param {number} songTime - Current song time
     * @param {number} triggerTime - Time when moment should trigger
     * @param {number} window - Time window for trigger (default 0.5s)
     * @returns {boolean} True if moment should trigger now
     */
    shouldTrigger(momentId, songTime, triggerTime, window = 0.5) {
        if (this._triggeredMoments.has(momentId)) return false;

        if (songTime >= triggerTime && songTime < triggerTime + window) {
            this._triggeredMoments.add(momentId);
            return true;
        }
        return false;
    }

    /**
     * Execute an action via journey controller
     * @param {Object} action - Action object {type, target, params}
     */
    executeAction(action) {
        if (this.journeyController?.executeAction) {
            this.journeyController.executeAction(action);
        }
    }

    /**
     * Get a layer from journey controller
     * @param {string} layerName - Layer name
     * @returns {Object|null} Layer instance
     */
    getLayer(layerName) {
        return this.journeyController?.getLayer?.(layerName) || null;
    }

    /**
     * Animate ambient light intensity smoothly
     * @param {number} targetIntensity - Target intensity value
     * @param {number} duration - Duration in seconds
     */
    animateAmbientLight(targetIntensity, duration) {
        const lightField = this.getLayer('light_field');
        if (!lightField?.ambientLight) return;

        // Cancel any existing animation
        if (this._ambientAnimationId) {
            cancelAnimationFrame(this._ambientAnimationId);
        }

        const startIntensity = lightField.ambientLight.intensity;
        const startTime = performance.now();

        if (window.SONOITE_DEBUG) {
            dlog(`[${this.trackName}Director] Ambient light: ${startIntensity.toFixed(2)} → ${targetIntensity}`);
        }

        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1.0);
            const eased = progress * progress * (3 - 2 * progress); // smoothstep

            lightField.ambientLight.intensity = startIntensity + (targetIntensity - startIntensity) * eased;

            if (progress < 1.0) {
                this._ambientAnimationId = requestAnimationFrame(animate);
            } else {
                this._ambientAnimationId = null;
            }
        };

        this._ambientAnimationId = requestAnimationFrame(animate);
    }

    /**
     * Get inverse audio value (for "stores energy when bass drops")
     * @param {string} feature - Audio feature name (bass, mid, treble, loudness)
     * @returns {number} Inverted value (1 - original)
     */
    getInverseAudio(feature) {
        const value = this.smoothedAudio[feature] || 0;
        return 1.0 - value;
    }

    /**
     * Get current phase info
     * @returns {Object} Phase info object
     */
    getCurrentPhase() {
        return {
            name: this.currentPhase,
            ...this.phases[this.currentPhase],
            isFrozen: this.isFrozen
        };
    }

    /**
     * Get smoothed audio data
     * @returns {Object} Smoothed audio values
     */
    getSmoothedAudio() {
        return { ...this.smoothedAudio };
    }

    /**
     * Trigger THE UNFREEZE - common pattern for frozen world awakening
     * @param {Object} options - Unfreeze options
     */
    triggerUnfreeze(options = {}) {
        const { duration = 2.0, burstIntensity = 1.2 } = options;

        this.isFrozen = false;
        this.unfreezeTriggered = true;

        if (window.SONOITE_DEBUG) {
            dlog(`[${this.trackName}Director] THE UNFREEZE triggered`);
        }

        // Unfreeze all layers
        this.executeAction({
            type: 'unfreeze',
            target: 'all',
            params: { duration, burstIntensity }
        });

        // Camera begins subtle movement
        if (this.cameraManager) {
            this.cameraManager.setIdleIntensity?.(0.3);
        }

        // Post-processing awakens
        if (this.postProcessing) {
            this.postProcessing.addBloomImpulse?.(0.3, 2.0);
        }
    }

    /**
     * Reset state (for track restart)
     */
    reset() {
        this.currentPhase = this.phaseNames.length > 0 ? this.phaseNames[0] : null;
        this.previousPhase = null;
        this.isFrozen = true;
        this.unfreezeTriggered = false;
        this._triggeredMoments.clear();
        this.smoothedAudio = { bass: 0, mid: 0, treble: 0, loudness: 0 };

        // Cancel ambient animation
        if (this._ambientAnimationId) {
            cancelAnimationFrame(this._ambientAnimationId);
            this._ambientAnimationId = null;
        }

        if (window.SONOITE_DEBUG) {
            dlog(`[${this.trackName}Director] Reset`);
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.reset();
        this.experience = null;
        this.journeyController = null;
        this.postProcessing = null;
        this.cameraManager = null;
    }
}

export default BaseDirector;
