/**
 * Base Visual Layer API
 * Foundation class for all visual layers (flow, structure, core)
 * @module layer-api
 */

import { dispose3D } from '../utils/dispose3d.js';

// Don't import THREE here - expect it from context
// This allows flexibility for both bundled and CDN usage

/**
 * Base interface for any visual layer (flow, structure, core).
 * Every concrete layer must implement mount/update/unmount and accept config via setConfig().
 */
export class VisualLayer {
  /**
   * @param {object} ctx - shared context
   * @param {import('three')} ctx.THREE - THREE.js library reference
   * @param {THREE.Scene} ctx.scene - Three.js scene
   * @param {object} ctx.audio - must expose getFrame() → {bass, mid, treble, loudness, centroid, chroma}
   * @param {object} [ctx.palette] - {primary, secondary, accent}
   */
  constructor(ctx) {
    this.ctx = ctx;
    // THREE must be provided via context
    this.ctx.THREE = this.ctx.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    this.group = null;
    this.cfg = {};
    this._mounted = false;
    this._active = true;
    this._expectsAudioFirst = true;
    // Assign stable identifiers for error boundary and logging
    this.id = Math.random().toString(36).slice(2, 10);
    this.name = this.constructor.name || 'VisualLayer';
  }

  /**
   * Merge/replace runtime config (usually produced by the journey adapter)
   * @param {Object} cfg - Configuration object from journey JSON
   */
  setConfig(cfg = {}) {
    this.cfg = { ...this.cfg, ...cfg };
  }

  /**
   * STAB-07: Bridge method for compatibility with base/VisualLayer.js API
   * The registry expects init(), but layer-api uses mount()
   */
  init() {
    if (!this._mounted) {
      this.mount();
    }
  }

  /**
   * Create Three.js objects and add to scene
   */
  mount() {
    if (this._mounted) return;

    // STAB-01: Scene mismatch guard
    if (window.SonoiteExperience?.scene && this.ctx.scene !== window.SonoiteExperience.scene) {
      console.warn('[VisualLayer.mount] Scene mismatch detected. Switching to main scene.');
      this.ctx.scene = window.SonoiteExperience.scene;
    }

    this.group = this.group || new this.ctx.THREE.Group();
    this.ctx.scene.add(this.group);
    this._mounted = true;
  }

  /**
   * Per-frame updates. audio = normalized 0–1 values; dt = seconds since last frame
   * @param {Object} audio - Audio data with normalized values
   * @param {number} dt - Delta time in seconds
   */
  update(audio, dt) {
    /* override in subclasses */
  }

  /**
   * Remove from scene and dispose GPU resources
   */
  unmount() {
    if (!this._mounted) return;
    if (this.group) {
      this.ctx.scene.remove(this.group);
      dispose3D(this.group);
      this.group = null;
    }
    this._mounted = false;
  }

  /**
   * FIX-DISPOSE-01: Alias for unmount() for compatibility with three-experience.js
   * Ensures both dispose() and unmount() call paths work correctly
   */
  dispose() {
    this.unmount();
  }

  /**
   * Check if layer is currently mounted
   * @returns {boolean}
   */
  isMounted() {
    return this._mounted;
  }

  /**
   * Runtime activation toggle used by orchestrator/error-boundary
   */
  setActive(active) {
    this._active = !!active;
  }

  /**
   * Query if layer should update/render
   */
  isActive() {
    return this._active;
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return this.cfg;
  }

  /**
   * Helper to safely get config value with default
   * @param {string} path - Dot-notation path (e.g., 'params.density')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*}
   */
  getConfigValue(path, defaultValue) {
    const keys = path.split('.');
    let value = this.cfg;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
}
