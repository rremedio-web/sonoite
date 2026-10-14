/**
 * JourneyState.js - Central event emitter for phase/flag coordination
 *
 * CRITICAL: This is the coordination hub that was MISSING from the architecture.
 * Features like egg.spin(), particles.setMotionMode() EXIST but weren't being
 * called at phase transitions. This emitter bridges that gap.
 *
 * Usage:
 *   import JourneyState from './JourneyState.js';
 *   JourneyState.on('phase:change', (phase) => { ... });
 *   JourneyState.setPhase('FRACTURE');
 *
 * @created December 6, 2025 - External Auditor Recommendation
 */

class JourneyStateEmitter {
    constructor() {
        // Event listeners by event name
        this.listeners = new Map();

        // Current state
        this.state = {
            phase: 'ASCEND',
            frozen: true,
            eggRotating: false,
            particleMode: 'drift',
            vignetteTarget: 0.25,
            bloomTarget: 0.4,
            trackSlug: null,
            currentTime: 0,
            bpm: 140
        };

        // Phase definitions with targets (from Expert Panel Plan)
        this.phaseConfig = {
            ASCEND: {
                timeRange: [0, 125],      // 0:00 - 2:05
                vignette: 0.25,
                bloom: 0.4,
                particleMode: 'freeze',   // Frozen until UNFREEZE
                cameraIntensity: 0.3
            },
            FRACTURE: {
                timeRange: [125, 329],    // 2:05 - 5:29
                vignette: 0.45,
                bloom: 0.5,
                particleMode: 'drift',
                cameraIntensity: 0.6
            },
            ECLIPSE: {
                timeRange: [329, 480],    // 5:29 - 8:00
                vignette: 0.75,           // Breakdown: claustrophobic
                bloom: 0.3,               // Reduced during breakdown
                particleMode: 'pulse',
                cameraIntensity: 0.8
            },
            CLIMAX: {
                timeRange: [384, 453],    // 6:24 - 7:33 (subset of ECLIPSE)
                vignette: 0.5,            // Opens up for eruption
                bloom: 0.6,               // CAPPED at 0.6 per Marcus
                particleMode: 'chaos',
                cameraIntensity: 1.0
            },
            MEMORY: {
                timeRange: [480, 538],    // 8:00 - 8:58
                vignette: 0.95,           // Crush to void
                bloom: 0.4,
                particleMode: 'drift',    // Slow fade
                cameraIntensity: 0.2
            }
        };

        // Flags for one-time events
        this.flags = {
            unfrozen: false,
            firstSoloFired: false,
            breakdownStarted: false,
            climaxFired: false,
            snapBlackFired: false
        };

        // Debug mode
        this.debug = localStorage.getItem('SONOITE_DEBUG') === 'true';
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'phase:change', 'unfreeze', 'climax')
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all listeners
     */
    emit(event, data) {
        if (this.debug) {
            console.log(`[JourneyState] ${event}`, data);
        }

        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[JourneyState] Error in ${event} listener:`, err);
                }
            }
        }
    }

    /**
     * Set the current phase and emit change event
     */
    setPhase(phase) {
        if (this.state.phase === phase) return;

        const previousPhase = this.state.phase;
        this.state.phase = phase;

        const config = this.phaseConfig[phase];
        if (config) {
            this.state.vignetteTarget = config.vignette;
            this.state.bloomTarget = config.bloom;
            this.state.particleMode = config.particleMode;
        }

        this.emit('phase:change', {
            from: previousPhase,
            to: phase,
            config: config
        });

        // Emit specific phase events
        this.emit(`phase:${phase.toLowerCase()}`, config);
    }

    /**
     * Update current time and check for phase transitions
     */
    updateTime(seconds) {
        this.state.currentTime = seconds;

        // Auto-detect phase from time (if not manually set)
        for (const [phaseName, config] of Object.entries(this.phaseConfig)) {
            if (seconds >= config.timeRange[0] && seconds < config.timeRange[1]) {
                if (this.state.phase !== phaseName) {
                    // Special case: CLIMAX is a sub-phase within ECLIPSE
                    if (phaseName === 'ECLIPSE' && seconds >= 384 && seconds < 453) {
                        this.setPhase('CLIMAX');
                    } else if (phaseName !== 'CLIMAX') {
                        this.setPhase(phaseName);
                    }
                }
                break;
            }
        }
    }

    /**
     * THE UNFREEZE - First beat at 35.4 seconds
     */
    unfreeze() {
        if (this.flags.unfrozen) return;

        this.flags.unfrozen = true;
        this.state.frozen = false;

        this.emit('unfreeze', {
            time: this.state.currentTime,
            burstIntensity: 1.2
        });
    }

    /**
     * Trigger egg rotation with gating
     */
    startEggRotation(params = {}) {
        if (this.state.eggRotating) return;

        this.state.eggRotating = true;
        this.emit('egg:rotate:start', {
            speed: params.speed || 0.3,
            axis: params.axis || { x: 0, y: 1, z: 0 },
            easeIn: params.easeIn || 2.0
        });
    }

    stopEggRotation(params = {}) {
        if (!this.state.eggRotating) return;

        this.state.eggRotating = false;
        this.emit('egg:rotate:stop', {
            easeOut: params.easeOut || 2.0
        });
    }

    /**
     * Trigger shimmer/glow impulse on egg
     */
    eggShimmer(intensity = 1.0, duration = 0.5) {
        this.emit('egg:shimmer', { intensity, duration });
    }

    /**
     * Trigger particle burst from origin
     */
    particleBurst(params = {}) {
        this.emit('particles:burst', {
            count: params.count || 200,
            speed: params.speed || 2.0,
            color: params.color || null,  // null = use palette
            duration: params.duration || 1.5
        });
    }

    /**
     * Set particle motion mode
     */
    setParticleMode(mode, intensity = 1.0) {
        this.state.particleMode = mode;
        this.emit('particles:mode', { mode, intensity });
    }

    /**
     * Camera motion control
     */
    cameraDolly(direction, duration = 4.0) {
        this.emit('camera:dolly', { direction, duration });
    }

    cameraShake(intensity = 0.5, duration = 0.3) {
        this.emit('camera:shake', { intensity, duration });
    }

    /**
     * Post-processing impulses
     */
    bloomImpulse(intensity = 0.8, decay = 0.3) {
        this.emit('post:bloom:impulse', { intensity, decay });
    }

    vignetteTarget(value, duration = 2.0) {
        this.state.vignetteTarget = value;
        this.emit('post:vignette:target', { value, duration });
    }

    /**
     * BREAKDOWN - Kill all except egg
     */
    triggerBreakdown() {
        if (this.flags.breakdownStarted) return;

        this.flags.breakdownStarted = true;
        this.emit('breakdown', {
            fadeOutLayers: ['distant_shards', 'star_dust', 'heavy_fog'],
            keepLayers: ['egg_crystal'],
            vignette: 0.75,
            duration: 8.0
        });
    }

    /**
     * CLIMAX - Capped eruption
     */
    triggerClimax() {
        if (this.flags.climaxFired) return;

        this.flags.climaxFired = true;
        this.emit('climax', {
            bloom: 0.6,       // CAPPED
            fog: 0.45,        // CAPPED
            vignette: 0.5,
            burstIntensity: 1.8
        });
    }

    /**
     * SNAP BLACK - Final moment
     */
    triggerSnapBlack() {
        if (this.flags.snapBlackFired) return;

        this.flags.snapBlackFired = true;
        this.emit('snapblack', {
            eggFadeDuration: 0.5,
            vignette: 1.0,
            bloom: 0
        });
    }

    /**
     * Reset state for new journey
     */
    reset(trackSlug = null) {
        this.state = {
            phase: 'ASCEND',
            frozen: true,
            eggRotating: false,
            particleMode: 'drift',
            vignetteTarget: 0.25,
            bloomTarget: 0.4,
            trackSlug: trackSlug,
            currentTime: 0,
            bpm: 140
        };

        this.flags = {
            unfrozen: false,
            firstSoloFired: false,
            breakdownStarted: false,
            climaxFired: false,
            snapBlackFired: false
        };

        this.emit('reset', { trackSlug });
    }

    /**
     * Get current state (for debugging/diagnostics)
     */
    getState() {
        return {
            ...this.state,
            flags: { ...this.flags },
            phaseConfig: this.phaseConfig[this.state.phase]
        };
    }
}

// Singleton instance
const JourneyState = new JourneyStateEmitter();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.JourneyState = JourneyState;
}

export default JourneyState;
