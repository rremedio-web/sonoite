/**
 * Consciousness Core - Visual Layer Adapter
 * MP9: Central morphing anchor for each journey
 * Wraps the original ConsciousnessCore in Visual Layer API
 */

import { VisualLayer } from '../base/VisualLayer.js';
import { ConsciousnessCore as OriginalCore } from '../../modules/consciousness-core.js';
import { dlog } from '../../utils/devlog.js';

export class ConsciousnessCore extends VisualLayer {
    constructor(ctx) {
        super(ctx);

        // Core instance (will be created in init)
        this.core = null;

        // Time tracking for update
        this.time = 0;
    }

    /**
     * Initialize the consciousness core
     * MP9: Respects palette overrides from journey config
     */
    onInit() {
        dlog('[ConsciousnessCore] Initializing MP9 consciousness core...');

        // Create the original consciousness core
        this.core = new OriginalCore(this.scene, this.audioManager);

        // MP9: Apply palette overrides if provided
        if (this.cfg.palette) {
            dlog('[ConsciousnessCore] Applying palette override:', this.cfg.palette);
            this.applyPalette(this.cfg.palette);
        }

        // MP9: Apply reactivity config if provided
        if (this.cfg.reactivity) {
            dlog('[ConsciousnessCore] Reactivity config:', this.cfg.reactivity);
            // Reactivity is handled in update cycle
        }

        // MP9: Transform to state if specified
        if (this.cfg.state) {
            this.core.transformTo(this.cfg.state, 0);
        }

        dlog('[ConsciousnessCore] MP9 consciousness core initialized');
    }

    /**
     * Update consciousness core each frame
     * MP9: Passes audio data to core for reactivity
     */
    onUpdate(delta, audioData) {
        if (!this.core) return;

        // Increment time (core expects milliseconds)
        this.time += delta * 1000;

        // MP9: Update core with audio data
        const coreAudioData = {
            midLevel: audioData?.mid || 0,
            bassLevel: audioData?.bass || 0,
            trebleLevel: audioData?.treble || 0,
            loudness: audioData?.loudness || 0
        };

        this.core.update(this.time, coreAudioData);
    }

    /**
     * Clean up consciousness core resources
     * MP9: Proper disposal to prevent memory leaks
     */
    onDispose() {
        dlog('[ConsciousnessCore] Disposing MP9 consciousness core...');

        if (this.core) {
            this.core.dispose();
            this.core = null;
        }
    }

    /**
     * MP9: Apply palette colors to consciousness core
     * Updates shader uniforms and material colors
     */
    applyPalette(palette) {
        if (!this.core || !this.core.consciousnessLayers) return;

        const primary = this.hexToRgb(palette.primary);
        const secondary = this.hexToRgb(palette.secondary);
        const accent = this.hexToRgb(palette.accent);

        // Update each consciousness layer with palette colors
        this.core.consciousnessLayers.forEach((layer, index) => {
            if (!layer.material.uniforms?.baseColor) return;

            // Inner core: primary, Middle: secondary, Outer: accent
            const colorMap = [primary, secondary, accent];
            const color = colorMap[index] || primary;

            layer.material.uniforms.baseColor.value.setRGB(
                color.r / 255,
                color.g / 255,
                color.b / 255
            );
        });
    }

    /**
     * MP9: Helper to convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    /**
     * MP9: Public method to transform consciousness state
     * Can be called from journey moments
     */
    transformTo(state, duration = 2.0) {
        if (this.core) {
            this.core.transformTo(state, duration);
        }
    }

    /**
     * MP9: Set influence level (0-1)
     * Controls visibility/opacity of consciousness core
     */
    setInfluence(value) {
        if (this.core) {
            this.core.setInfluence(value);
        }
    }
}
