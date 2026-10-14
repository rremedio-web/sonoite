/**
 * SignalPipeline - Advanced audio signal shaping for link_audio
 *
 * Provides optional processing stages:
 * 1. Subsample - Skip frames for stability
 * 2. Curve - Non-linear response shaping
 * 3. Gate - Hard threshold cutoff
 * 4. [Existing EMA/invert/min/max/combine handled by link_audio]
 * 5. Envelope - Attack/release shaping
 * 6. ModulateBy - Cross-feature modulation
 *
 * PERFORMANCE: Zero per-frame allocations. All state pre-allocated.
 *
 * @package SonoiteTheme
 * @version 1.0.0
 * @created 2025-12-31 (Plan 01-05)
 */

/**
 * Pipeline presets for common patterns
 * @type {Object.<string, Object>}
 */
export const PIPELINE_PRESETS = {
  // Quick punch, slow decay - good for drums/kicks
  punch: {
    envelope: { attack: 0.05, release: 0.4 }
  },

  // Smooth breathing - good for ambient/pads
  breath: {
    curve: 's-curve',
    envelope: { attack: 0.3, release: 0.5 }
  },

  // Gated for transients only - sharp peaks
  transient: {
    gate: 0.5,
    envelope: { attack: 0.02, release: 0.1 }
  },

  // Heavily smoothed wave - never jittery
  wave: {
    subsample: 2,
    curve: 'logarithmic',
    envelope: { attack: 0.5, release: 1.0 }
  },

  // Inverse breathing - for void "wanting" effect
  inverse_breath: {
    curve: 'exponential',
    curveExponent: 2.0,
    envelope: { attack: 0.3, release: 1.0 }
  }
};

/**
 * SignalPipeline class
 * Processes raw audio values through configurable stages
 */
export class SignalPipeline {
  /**
   * @param {Object} config - Pipeline configuration
   * @param {number} [config.subsample=1] - Process every Nth frame
   * @param {string} [config.curve='linear'] - Response curve type
   * @param {number} [config.curveExponent=2.0] - Exponent for exponential/s-curve
   * @param {number} [config.gate=0] - Hard threshold (0-1)
   * @param {Object} [config.envelope] - Attack/release envelope
   * @param {number} [config.envelope.attack] - Rise time in seconds
   * @param {number} [config.envelope.release] - Fall time in seconds
   * @param {number} [config.envelope.hold=0] - Hold time at peak
   * @param {Object} [config.modulateBy] - Cross-feature modulation
   * @param {string} [config.modulateBy.feature] - Feature name
   * @param {number} [config.modulateBy.amount] - Modulation amount (0-1)
   */
  constructor(config = {}) {
    // Stage 1: Subsample state
    this.subsampleRate = Math.max(1, Math.floor(config.subsample || 1));
    this.subsampleCounter = 0;

    // Stage 2: Curve config
    this.curve = config.curve || 'linear';
    // Clamp exponent to positive range to prevent Infinity/NaN from Math.pow
    // Use ?? so explicit 0 gets clamped to 0.1 instead of defaulting to 2.0
    const rawExponent = config.curveExponent ?? 2.0;
    this.curveExponent = Math.max(0.1, Math.min(10, rawExponent));

    // Pre-compute log constant for logarithmic curve
    // log(1 + x*9) / log(10) maps [0,1] to [0,1]
    this._logDivisor = Math.log(10);

    // Stage 3: Gate threshold (clamped to [0,1])
    this.gate = Math.max(0, Math.min(1, config.gate || 0));

    // Stage 5: Envelope state (pre-allocated)
    this.envelope = config.envelope || null;
    this.envelopeValue = 0;
    this.envelopeTarget = 0;
    this.holdUntil = 0;

    // Stage 6: ModulateBy config
    this.modulateBy = config.modulateBy || null;

    // Output cache for subsample
    this.currentValue = 0;
    this.lastProcessTime = 0;

    // Pre-smoothed value cache (after stages 1-3, before existing chain)
    this.preSmoothValue = 0;
  }

  /**
   * Process stages 1-3 (before existing EMA/invert/min/max)
   * Called first in processAudioLinks
   *
   * @param {number} rawValue - Raw audio feature value (0-1)
   * @returns {number} - Processed value after subsample/curve/gate
   */
  processPreSmooth(rawValue) {
    // Stage 1: Subsample - skip frames
    // First frame always processes (counter starts at 0, 0 % N === 0)
    if (this.subsampleRate > 1) {
      const shouldSkip = this.subsampleCounter % this.subsampleRate !== 0;
      this.subsampleCounter++;  // Always increment after check
      if (shouldSkip) {
        return this.preSmoothValue; // Return cached value
      }
    }

    let value = rawValue;

    // Stage 2: Curve shaping
    value = this._applyCurve(value);

    // Stage 3: Gate (hard threshold)
    if (value < this.gate) {
      value = 0;
    }

    this.preSmoothValue = value;
    return value;
  }

  /**
   * Process stages 5-6 (after existing EMA/invert/min/max/combine)
   * Called second in processAudioLinks
   *
   * @param {number} smoothedValue - Value after existing chain processing
   * @param {Object} audioData - Full audio data for cross-feature modulation
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {number} - Final processed value
   */
  processPostSmooth(smoothedValue, audioData, deltaTime) {
    let value = smoothedValue;

    // Stage 5: Envelope (attack/release)
    if (this.envelope) {
      value = this._applyEnvelope(value, deltaTime);
    }

    // Stage 6: ModulateBy (cross-feature)
    if (this.modulateBy && audioData) {
      const modFeature = audioData[this.modulateBy.feature];
      // Guard against NaN: require finite numbers for both feature and amount
      const amount = this.modulateBy.amount ?? 0;
      if (Number.isFinite(modFeature) && Number.isFinite(amount)) {
        value = value * (1 + modFeature * amount);
      }
    }

    this.currentValue = value;
    return value;
  }

  /**
   * Combined process for simpler integration
   * Use this if you want pipeline to handle everything in one call
   *
   * @param {number} rawValue - Raw audio feature value (0-1)
   * @param {Object} audioData - Full audio data for cross-feature modulation
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {number} - Fully processed value
   */
  process(rawValue, audioData, deltaTime) {
    // Pre-smooth stages
    const preSmoothValue = this.processPreSmooth(rawValue);

    // Note: This skips existing EMA/invert/min/max - use split methods for full integration
    // Post-smooth stages
    return this.processPostSmooth(preSmoothValue, audioData, deltaTime);
  }

  /**
   * Apply response curve
   * @private
   * @param {number} x - Input value (0-1)
   * @returns {number} - Curved value (0-1)
   */
  _applyCurve(x) {
    // Clamp input to valid range
    x = Math.max(0, Math.min(1, x));

    switch (this.curve) {
      case 'exponential':
        // x^n - emphasizes peaks, quiets lows
        return Math.pow(x, this.curveExponent);

      case 'logarithmic':
        // log(1 + x*9) / log(10) - compresses peaks, emphasizes lows
        return Math.log(1 + x * 9) / this._logDivisor;

      case 's-curve':
        // Attempt at a balanced S-curve: x^n / (x^n + (1-x)^n)
        // Avoids division by zero when x=0 or x=1
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const xn = Math.pow(x, this.curveExponent);
        const omxn = Math.pow(1 - x, this.curveExponent);
        return xn / (xn + omxn);

      case 'linear':
      default:
        return x;
    }
  }

  /**
   * Apply attack/release envelope
   * @private
   * @param {number} target - Target value
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {number} - Enveloped value
   */
  _applyEnvelope(target, deltaTime) {
    const now = performance.now();

    // Handle hold phase
    if (this.envelope.hold && now < this.holdUntil) {
      return this.envelopeValue;
    }

    // Determine direction and rate
    const isRising = target > this.envelopeValue;

    if (isRising) {
      // Attack phase
      const attackRate = this.envelope.attack > 0
        ? deltaTime / this.envelope.attack
        : 1; // Instant if attack is 0

      this.envelopeValue += (target - this.envelopeValue) * Math.min(1, attackRate);

      // Check if we've reached peak (for hold)
      if (this.envelope.hold && Math.abs(target - this.envelopeValue) < 0.01) {
        this.holdUntil = now + this.envelope.hold * 1000;
      }
    } else {
      // Release phase
      const releaseRate = this.envelope.release > 0
        ? deltaTime / this.envelope.release
        : 1; // Instant if release is 0

      this.envelopeValue += (target - this.envelopeValue) * Math.min(1, releaseRate);
    }

    return this.envelopeValue;
  }

  /**
   * Reset pipeline state
   * Call when switching tracks or resetting audio links
   */
  reset() {
    this.subsampleCounter = 0;
    this.envelopeValue = 0;
    this.envelopeTarget = 0;
    this.holdUntil = 0;
    this.currentValue = 0;
    this.preSmoothValue = 0;
  }

  /**
   * Update configuration dynamically
   * @param {Object} config - New configuration (partial update)
   */
  configure(config) {
    if (config.subsample !== undefined) {
      this.subsampleRate = Math.max(1, Math.floor(config.subsample));
    }
    if (config.curve !== undefined) {
      this.curve = config.curve;
    }
    if (config.curveExponent !== undefined) {
      // Clamp to positive range to prevent Infinity/NaN
      this.curveExponent = Math.max(0.1, Math.min(10, config.curveExponent));
    }
    if (config.gate !== undefined) {
      // Clamp to [0,1]
      this.gate = Math.max(0, Math.min(1, config.gate));
    }
    if (config.envelope !== undefined) {
      this.envelope = config.envelope;
    }
    if (config.modulateBy !== undefined) {
      this.modulateBy = config.modulateBy;
    }
  }
}

/**
 * Create a SignalPipeline from config, resolving presets
 *
 * @param {Object|string} configOrPreset - Pipeline config object or preset name
 * @returns {SignalPipeline} - Configured pipeline instance
 */
export function createPipeline(configOrPreset) {
  let config = {};

  // Resolve preset
  if (typeof configOrPreset === 'string') {
    const preset = PIPELINE_PRESETS[configOrPreset];
    if (!preset) {
      console.warn(`[SignalPipeline] Unknown preset: ${configOrPreset}`);
      return new SignalPipeline({});
    }
    config = { ...preset };
  } else if (configOrPreset) {
    // Merge preset with overrides if preset specified
    if (configOrPreset.preset) {
      const preset = PIPELINE_PRESETS[configOrPreset.preset];
      if (preset) {
        config = { ...preset };
      }
    }
    // Override with explicit config
    Object.assign(config, configOrPreset);
  }

  return new SignalPipeline(config);
}

export default SignalPipeline;
