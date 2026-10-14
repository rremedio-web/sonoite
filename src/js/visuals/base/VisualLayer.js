/**
 * VisualLayer - Base class for all visual components
 * Provides common lifecycle methods and context management
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

export class VisualLayer {
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx?.scene || null;
        this.camera = ctx?.camera || null;
        this.renderer = ctx?.renderer || null;
        this.audioManager = ctx?.audioManager || null;

        // Layer state
        this.initialized = false;
        this.active = true;
        this.disposed = false;

        // Configuration (for compatibility with layer-api.js)
        this.cfg = {};

        // Unique identifier
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = this.constructor.name;
    }

    /**
     * Initialize the visual layer
     * Override in subclasses to set up geometry, materials, etc.
     */
    init() {
        if (this.initialized) return;

        // Override in subclasses
        this.onInit?.();

        this.initialized = true;
    }

    /**
     * Update the visual layer each frame
     * @param {number} delta - Time delta since last frame
     * @param {object} audioData - Current audio analysis data
     */
    update(delta, audioData) {
        if (!this.active || this.disposed) return;

        // Override in subclasses
        this.onUpdate?.(delta, audioData);
    }

    /**
     * Clean up resources and remove from scene
     */
    dispose() {
        if (this.disposed) return;

        // Override in subclasses for cleanup
        this.onDispose?.();

        this.disposed = true;
        this.active = false;
        this.initialized = false;
    }

    /**
     * Called when layer is added to scene (no-op by default)
     */
    onAddedToScene() {
        // Override in subclasses if needed
    }

    /**
     * Called when layer is removed from scene (no-op by default)
     */
    onRemovedFromScene() {
        // Override in subclasses if needed
    }

    /**
     * Set layer active state
     * @param {boolean} active
     */
    setActive(active) {
        this.active = active;
    }

    /**
     * Get layer active state
     * @returns {boolean}
     */
    isActive() {
        return this.active && !this.disposed;
    }

    /**
     * Get current audio analysis data
     * @returns {object} Audio data with frequency bands and features
     */
    getAudioData() {
        if (this.audioManager && this.audioManager.getAudioAnalysis) {
            return this.audioManager.getAudioAnalysis();
        }
        return this.getFallbackAudioData();
    }

    /**
     * Get fallback audio data when audio manager is unavailable
     * @returns {object} Safe fallback audio data
     */
    getFallbackAudioData() {
        return {
            bass: 0, mid: 0, treble: 0, loudness: 0,
            bassLevel: 0, midLevel: 0, trebleLevel: 0,
            spectralCentroid: 0.5, spectralRolloff: 0.5,
            timestamp: performance.now(),
            normalized: true, hasAdvancedFeatures: false
        };
    }

    /**
     * Check if audio analysis is available
     * @returns {boolean}
     */
    hasAudioAnalysis() {
        return !!(this.audioManager && this.audioManager.getAudioAnalysis);
    }

    /**
     * Set configuration (for compatibility with layer-api.js)
     * @param {object} cfg - Configuration object
     */
    setConfig(cfg = {}) {
        this.cfg = { ...this.cfg, ...cfg };
    }

    /**
     * Get layer info for debugging
     * @returns {object}
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            active: this.active,
            initialized: this.initialized,
            disposed: this.disposed,
            hasAudio: this.hasAudioAnalysis()
        };
    }
}

export default VisualLayer;