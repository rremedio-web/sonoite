/**
 * BeatDetector - Real-time onset/transient detection for visual triggers
 *
 * Detects:
 * - Kick drums (low frequency onsets)
 * - Snare/claps (mid-high frequency onsets)
 * - General transients (any sharp attack)
 *
 * Based on: http://joesul.li/van/beat-detection-using-web-audio/
 */

export class BeatDetector {
  constructor(audioManager) {
    this.audioManager = audioManager;

    // Detection state
    this.kickThreshold = 0.6;      // Sensitivity for kick detection
    this.snareThreshold = 0.5;     // Sensitivity for snare detection
    this.transientThreshold = 0.4; // General onset sensitivity

    // Energy history for onset detection (ring buffers)
    this.historySize = 43;  // ~1 second at 43fps
    this.kickHistory = new Float32Array(this.historySize);
    this.snareHistory = new Float32Array(this.historySize);
    this.energyHistory = new Float32Array(this.historySize);
    this.historyIndex = 0;

    // Cooldowns to prevent rapid re-triggers (ms)
    this.kickCooldown = 150;
    this.snareCooldown = 100;
    this.transientCooldown = 80;

    this.lastKickTime = 0;
    this.lastSnareTime = 0;
    this.lastTransientTime = 0;

    // Current state (read by visual layers)
    this.kick = false;
    this.snare = false;
    this.transient = false;

    // Intensity values (0-1, decays after trigger)
    this.kickIntensity = 0;
    this.snareIntensity = 0;
    this.transientIntensity = 0;

    // Decay rate per frame
    this.decayRate = 0.15;

    // Callbacks for external listeners
    this.onKick = null;
    this.onSnare = null;
    this.onTransient = null;
    this.onBeat = null;  // Any beat (kick OR snare)

    // EMA smoothing for frequency bands
    this._ema = { kick: 0, snare: 0, energy: 0 };
    this._emaAlpha = 0.3;

    // Debug mode
    this.debug = false;
  }

  /**
   * Configure detection sensitivity
   */
  configure(options = {}) {
    if (options.kickThreshold !== undefined) this.kickThreshold = options.kickThreshold;
    if (options.snareThreshold !== undefined) this.snareThreshold = options.snareThreshold;
    if (options.transientThreshold !== undefined) this.transientThreshold = options.transientThreshold;
    if (options.kickCooldown !== undefined) this.kickCooldown = options.kickCooldown;
    if (options.snareCooldown !== undefined) this.snareCooldown = options.snareCooldown;
    if (options.debug !== undefined) this.debug = options.debug;

    return this;
  }

  /**
   * Process audio data and detect beats
   * Call this every frame from the render loop
   */
  update(audioData) {
    if (!audioData) return this.getState();

    const now = performance.now();

    // Get frequency bands from audio data
    const bass = audioData.bass || audioData.bassLevel || 0;
    const mid = audioData.mid || audioData.midLevel || 0;
    const treble = audioData.treble || audioData.trebleLevel || 0;
    const loudness = audioData.loudness || audioData.loudnessTotal || 0;

    // Calculate specific energy bands for detection
    // Kick: mostly sub-bass (20-80Hz) - use bass
    const kickEnergy = bass;

    // Snare: mid-high frequencies with sharp attack (200-2000Hz)
    const snareEnergy = (mid * 0.6 + treble * 0.4);

    // Total energy for general transients
    const totalEnergy = loudness;

    // Apply EMA smoothing
    const smoothKick = this._smooth('kick', kickEnergy);
    const smoothSnare = this._smooth('snare', snareEnergy);
    const smoothEnergy = this._smooth('energy', totalEnergy);

    // Store in history buffers
    this.kickHistory[this.historyIndex] = smoothKick;
    this.snareHistory[this.historyIndex] = smoothSnare;
    this.energyHistory[this.historyIndex] = smoothEnergy;

    // Calculate local averages
    const kickAvg = this._getAverage(this.kickHistory);
    const snareAvg = this._getAverage(this.snareHistory);
    const energyAvg = this._getAverage(this.energyHistory);

    // Calculate variance for adaptive thresholding
    const kickVariance = this._getVariance(this.kickHistory, kickAvg);
    const snareVariance = this._getVariance(this.snareHistory, snareAvg);

    // Adaptive thresholds based on recent history
    const adaptiveKickThreshold = kickAvg + (this.kickThreshold * Math.max(0.1, kickVariance));
    const adaptiveSnareThreshold = snareAvg + (this.snareThreshold * Math.max(0.1, snareVariance));
    const adaptiveTransientThreshold = energyAvg + (this.transientThreshold * 0.2);

    // Reset trigger states
    this.kick = false;
    this.snare = false;
    this.transient = false;

    // Detect kick (low frequency onset)
    if (smoothKick > adaptiveKickThreshold &&
        smoothKick > 0.15 &&  // Minimum energy gate
        (now - this.lastKickTime) > this.kickCooldown) {
      this.kick = true;
      this.kickIntensity = Math.min(1, (smoothKick - kickAvg) / Math.max(0.1, kickAvg));
      this.lastKickTime = now;

      if (this.onKick) this.onKick(this.kickIntensity);
      if (this.onBeat) this.onBeat('kick', this.kickIntensity);

      if (this.debug) console.log(`[BeatDetector] KICK: ${this.kickIntensity.toFixed(2)}`);
    }

    // Detect snare (mid-high frequency onset)
    if (smoothSnare > adaptiveSnareThreshold &&
        smoothSnare > 0.12 &&  // Minimum energy gate
        (now - this.lastSnareTime) > this.snareCooldown) {
      this.snare = true;
      this.snareIntensity = Math.min(1, (smoothSnare - snareAvg) / Math.max(0.1, snareAvg));
      this.lastSnareTime = now;

      if (this.onSnare) this.onSnare(this.snareIntensity);
      if (this.onBeat) this.onBeat('snare', this.snareIntensity);

      if (this.debug) console.log(`[BeatDetector] SNARE: ${this.snareIntensity.toFixed(2)}`);
    }

    // Detect general transient (any sharp onset)
    if (smoothEnergy > adaptiveTransientThreshold &&
        smoothEnergy > 0.1 &&
        (now - this.lastTransientTime) > this.transientCooldown) {
      this.transient = true;
      this.transientIntensity = Math.min(1, (smoothEnergy - energyAvg) / Math.max(0.1, energyAvg));
      this.lastTransientTime = now;

      if (this.onTransient) this.onTransient(this.transientIntensity);

      if (this.debug && !this.kick && !this.snare) {
        console.log(`[BeatDetector] TRANSIENT: ${this.transientIntensity.toFixed(2)}`);
      }
    }

    // Decay intensities
    if (!this.kick) this.kickIntensity = Math.max(0, this.kickIntensity - this.decayRate);
    if (!this.snare) this.snareIntensity = Math.max(0, this.snareIntensity - this.decayRate);
    if (!this.transient) this.transientIntensity = Math.max(0, this.transientIntensity - this.decayRate);

    // Advance history index
    this.historyIndex = (this.historyIndex + 1) % this.historySize;

    return this.getState();
  }

  /**
   * Get current beat detection state
   */
  getState() {
    return {
      // Boolean triggers (true on frame of detection)
      kick: this.kick,
      snare: this.snare,
      transient: this.transient,

      // Intensity values (0-1, decay after trigger)
      kickIntensity: this.kickIntensity,
      snareIntensity: this.snareIntensity,
      transientIntensity: this.transientIntensity,

      // Convenience: any beat this frame
      beat: this.kick || this.snare,
      beatIntensity: Math.max(this.kickIntensity, this.snareIntensity)
    };
  }

  /**
   * EMA smoothing helper
   */
  _smooth(key, value) {
    this._ema[key] = this._ema[key] * (1 - this._emaAlpha) + value * this._emaAlpha;
    return this._ema[key];
  }

  /**
   * Calculate average of ring buffer
   */
  _getAverage(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / buffer.length;
  }

  /**
   * Calculate variance of ring buffer
   */
  _getVariance(buffer, mean) {
    let variance = 0;
    for (let i = 0; i < buffer.length; i++) {
      const diff = buffer[i] - mean;
      variance += diff * diff;
    }
    return Math.sqrt(variance / buffer.length);
  }

  /**
   * Reset detection state
   */
  reset() {
    this.kickHistory.fill(0);
    this.snareHistory.fill(0);
    this.energyHistory.fill(0);
    this.historyIndex = 0;
    this.kickIntensity = 0;
    this.snareIntensity = 0;
    this.transientIntensity = 0;
    this._ema = { kick: 0, snare: 0, energy: 0 };
  }
}

export default BeatDetector;
