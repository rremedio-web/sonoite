/**
 * MP-AUDIO-EMA-06: Global EMA + Hysteresis Router
 * Smooths audio-reactive values and provides spike detection
 * to reduce flicker while preserving punch
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog } from '../../utils/devlog.js';

/**
 * AudioEMA - Exponential Moving Average for audio signals
 * Provides smooth values and spike detection with cooldowns
 */
export class AudioEMA {
    constructor(options = {}) {
        // EMA alpha (0-1): higher = faster response, lower = smoother
        // CINEMATIC-FIX: Reduced from 0.4 to 0.03 for cinematic flow (~300ms response)
        // Auditor recommendation: 0.02-0.05 range for "wave-like" smoothness, not jitter
        this.alpha = options.alpha || 0.03;

        // Spike detection thresholds (multiplier above EMA)
        // PHASE-1.2-FIX: Lowered thresholds for more responsive spike detection
        this.spikeThreshold = {
            bass: options.spikeThresholdBass || 1.3,      // WAS 1.5
            mid: options.spikeThresholdMid || 1.3,        // WAS 1.5
            treble: options.spikeThresholdTreble || 1.5,  // WAS 1.8
            loudness: options.spikeThresholdLoudness || 1.2 // WAS 1.4
        };

        // Spike cooldown (ms) - prevents rapid re-triggers
        // PHASE-1.2-FIX: Reduced cooldowns for more frequent spike detection
        this.spikeCooldown = {
            bass: options.spikeCooldownBass || 100,       // WAS 150
            mid: options.spikeCooldownMid || 100,         // WAS 150
            treble: options.spikeCooldownTreble || 60,    // WAS 100
            loudness: options.spikeCooldownLoudness || 120 // WAS 200
        };

        // Hysteresis ranges to prevent flicker
        this.hysteresis = {
            bass: options.hysteresisBass || 0.05,
            mid: options.hysteresisMid || 0.05,
            treble: options.hysteresisTreble || 0.05,
            loudness: options.hysteresisLoudness || 0.05
        };

        // EMA state
        this.ema = {
            bass: 0,
            mid: 0,
            treble: 0,
            loudness: 0,
            centroid: 0,
            // P2-FIX: Pseudo-features for organic animations
            time_sine_4s: 0,    // 4-second period sine wave for breathing
            time_sine_8s: 0,    // 8-second period sine wave for slow undulation
            time_cosine_4s: 0   // 4-second period cosine wave (phase-shifted)
        };

        // Spike state
        this.lastSpikeTime = {
            bass: 0,
            mid: 0,
            treble: 0,
            loudness: 0
        };

        // Previous raw values for hysteresis
        this.prevRaw = {
            bass: 0,
            mid: 0,
            treble: 0,
            loudness: 0,
            centroid: 0
        };

        // Hysteresis state (high/low)
        this.hysteresisState = {
            bass: 'low',
            mid: 'low',
            treble: 'low',
            loudness: 'low'
        };

        this.initialized = false;

        if (window.SONOITE_DEBUG) {
            dlog('[MP-AUDIO-EMA-06] AudioEMA initialized', {
                alpha: this.alpha,
                spikeThreshold: this.spikeThreshold,
                spikeCooldown: this.spikeCooldown
            });
        }
    }

    /**
     * Update EMA values with new raw audio data
     * @param {Object} rawAudio - Raw audio data {bass, mid, treble, loudness, centroid}
     * @returns {Object} Smoothed EMA values
     */
    update(rawAudio) {
        if (!rawAudio) return this.ema;

        // Initialize on first frame
        if (!this.initialized) {
            this.ema.bass = rawAudio.bass || 0;
            this.ema.mid = rawAudio.mid || 0;
            this.ema.treble = rawAudio.treble || 0;
            this.ema.loudness = rawAudio.loudness || 0;
            this.ema.centroid = rawAudio.centroid || 0;
            this.initialized = true;
            return this.ema;
        }

        // NaN guards
        const bass = Number.isFinite(rawAudio.bass) ? rawAudio.bass : 0;
        const mid = Number.isFinite(rawAudio.mid) ? rawAudio.mid : 0;
        const treble = Number.isFinite(rawAudio.treble) ? rawAudio.treble : 0;
        const loudness = Number.isFinite(rawAudio.loudness) ? rawAudio.loudness : 0;
        const centroid = Number.isFinite(rawAudio.centroid) ? rawAudio.centroid : 0;

        // Compute EMA: ema_new = alpha * raw + (1 - alpha) * ema_old
        this.ema.bass = this.alpha * bass + (1 - this.alpha) * this.ema.bass;
        this.ema.mid = this.alpha * mid + (1 - this.alpha) * this.ema.mid;
        this.ema.treble = this.alpha * treble + (1 - this.alpha) * this.ema.treble;
        this.ema.loudness = this.alpha * loudness + (1 - this.alpha) * this.ema.loudness;
        this.ema.centroid = this.alpha * centroid + (1 - this.alpha) * this.ema.centroid;

        // Apply hysteresis to prevent rapid toggling
        this.ema.bass = this.applyHysteresis('bass', this.ema.bass, bass);
        this.ema.mid = this.applyHysteresis('mid', this.ema.mid, mid);
        this.ema.treble = this.applyHysteresis('treble', this.ema.treble, treble);
        this.ema.loudness = this.applyHysteresis('loudness', this.ema.loudness, loudness);

        // Store raw values for next frame
        this.prevRaw.bass = bass;
        this.prevRaw.mid = mid;
        this.prevRaw.treble = treble;
        this.prevRaw.loudness = loudness;
        this.prevRaw.centroid = centroid;

        // P2-FIX: Update time-based pseudo-features
        const timeSeconds = performance.now() / 1000;
        this.ema.time_sine_4s = Math.sin(timeSeconds * Math.PI * 2 / 4); // 4-second period
        this.ema.time_sine_8s = Math.sin(timeSeconds * Math.PI * 2 / 8); // 8-second period
        this.ema.time_cosine_4s = Math.cos(timeSeconds * Math.PI * 2 / 4); // 4-second period, phase-shifted

        return this.ema;
    }

    /**
     * Apply hysteresis to prevent rapid toggling
     * @param {string} channel - Channel name (bass, mid, treble, loudness)
     * @param {number} emaValue - Current EMA value
     * @param {number} rawValue - Current raw value
     * @returns {number} Hysteresis-adjusted value
     */
    applyHysteresis(channel, emaValue, rawValue) {
        const threshold = this.hysteresis[channel];
        const state = this.hysteresisState[channel];

        // If we're in 'low' state, need to cross upper threshold to go 'high'
        if (state === 'low' && rawValue > emaValue + threshold) {
            this.hysteresisState[channel] = 'high';
        }
        // If we're in 'high' state, need to cross lower threshold to go 'low'
        else if (state === 'high' && rawValue < emaValue - threshold) {
            this.hysteresisState[channel] = 'low';
        }

        return emaValue;
    }

    /**
     * Check if current raw value represents a spike
     * @param {string} channel - Channel name (bass, mid, treble, loudness)
     * @param {number} rawValue - Current raw value
     * @returns {boolean} True if spike detected
     */
    spike(channel, rawValue) {
        const now = performance.now();
        const cooldown = this.spikeCooldown[channel];
        const threshold = this.spikeThreshold[channel];

        // Check cooldown
        if (now - this.lastSpikeTime[channel] < cooldown) {
            return false;
        }

        // Check if raw value exceeds EMA * threshold
        const emaValue = this.ema[channel];
        if (rawValue > emaValue * threshold) {
            this.lastSpikeTime[channel] = now;
            return true;
        }

        return false;
    }

    /**
     * Get smoothed EMA values
     * @returns {Object} EMA values {bass, mid, treble, loudness, centroid}
     */
    getValues() {
        return { ...this.ema };
    }

    /**
     * Get current hysteresis state
     * @returns {Object} Hysteresis state {bass, mid, treble, loudness}
     */
    getHysteresisState() {
        return { ...this.hysteresisState };
    }

    /**
     * Reset EMA state
     */
    reset() {
        this.ema = {
            bass: 0, mid: 0, treble: 0, loudness: 0, centroid: 0,
            time_sine_4s: 0, time_sine_8s: 0, time_cosine_4s: 0
        };
        this.lastSpikeTime = { bass: 0, mid: 0, treble: 0, loudness: 0 };
        this.prevRaw = { bass: 0, mid: 0, treble: 0, loudness: 0, centroid: 0 };
        this.hysteresisState = { bass: 'low', mid: 'low', treble: 'low', loudness: 'low' };
        this.initialized = false;

        if (window.SONOITE_DEBUG) {
            dlog('[MP-AUDIO-EMA-06] AudioEMA reset');
        }
    }

    /**
     * Update configuration
     * @param {Object} options - New configuration options
     */
    configure(options = {}) {
        if (options.alpha !== undefined) this.alpha = options.alpha;

        if (options.spikeThreshold) {
            Object.assign(this.spikeThreshold, options.spikeThreshold);
        }

        if (options.spikeCooldown) {
            Object.assign(this.spikeCooldown, options.spikeCooldown);
        }

        if (options.hysteresis) {
            Object.assign(this.hysteresis, options.hysteresis);
        }

        if (window.SONOITE_DEBUG) {
            dlog('[MP-AUDIO-EMA-06] AudioEMA reconfigured', {
                alpha: this.alpha,
                spikeThreshold: this.spikeThreshold,
                spikeCooldown: this.spikeCooldown
            });
        }
    }
}

// Export singleton instance
export const audioEMA = new AudioEMA();

export default AudioEMA;
