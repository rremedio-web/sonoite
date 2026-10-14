/**
 * HeatHazePass.js - Heat Distortion Post-Processing
 *
 * Post-processing pass for Track 6 (O Filho) creating heat shimmer effect.
 * Simulates the wavy distortion seen above flames or hot surfaces.
 *
 * Features:
 * - Screen-space UV distortion
 * - Masked to appear around a center point (the hot core)
 * - Scrolling noise for organic movement
 * - Audio-reactive intensity (bass = more distortion)
 *
 * Usage:
 *   import { HeatHazeShader, HeatHazeController } from './passes/HeatHazePass.js';
 *   const pass = new ShaderPass(HeatHazeShader);
 *   composer.addPass(pass);
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';

/**
 * Heat Haze Shader
 * Creates wavy screen distortion masked around a center point
 */
export const HeatHazeShader = {
  name: 'HeatHazeShader',

  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uIntensity: { value: 0.0 },       // Overall effect intensity (0-1)
    uCenter: { value: new THREE.Vector2(0.5, 0.5) }, // Effect center
    uRadius: { value: 0.4 },          // Mask radius
    uScale: { value: 15.0 },          // Distortion frequency
    uSpeed: { value: 2.0 },           // Animation speed
    uBass: { value: 0.0 },            // Audio reactivity
    uMid: { value: 0.0 },
    uVerticalBias: { value: 0.7 },    // Rising heat emphasis (0-1)
    uDistortionX: { value: 0.008 },   // Horizontal distortion amount
    uDistortionY: { value: 0.012 }    // Vertical distortion amount (usually more)
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uScale;
    uniform float uSpeed;
    uniform float uBass;
    uniform float uMid;
    uniform float uVerticalBias;
    uniform float uDistortionX;
    uniform float uDistortionY;

    varying vec2 vUv;

    // Simple 2D noise for distortion
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Multi-octave noise
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;

      for (int i = 0; i < 3; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }

      return value;
    }

    void main() {
      vec2 uv = vUv;

      // Calculate distance from center
      vec2 fromCenter = vUv - uCenter;
      float dist = length(fromCenter);

      // Create mask that's stronger near center and fades out
      float mask = 1.0 - smoothstep(0.0, uRadius, dist);
      mask = mask * mask; // Quadratic falloff

      // Vertical bias - effect stronger above center (rising heat)
      float verticalMask = smoothstep(uCenter.y - 0.3, uCenter.y + 0.4, vUv.y);
      mask *= mix(1.0, verticalMask, uVerticalBias);

      // Skip processing if outside effect area
      if (mask < 0.001 || uIntensity < 0.001) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      // Scrolling noise coordinates (rising effect)
      vec2 noiseCoord = vUv * uScale;
      noiseCoord.y -= uTime * uSpeed; // Scroll upward

      // Multi-layer distortion
      float noise1 = fbm(noiseCoord);
      float noise2 = fbm(noiseCoord * 0.5 + vec2(100.0, uTime * uSpeed * 0.7));

      // Audio reactivity
      float audioBoost = 1.0 + uBass * 0.5 + uMid * 0.3;

      // Calculate distortion offset
      vec2 distortion = vec2(
        (noise1 - 0.5) * uDistortionX,
        (noise2 - 0.5) * uDistortionY
      );

      // Apply intensity, mask, and audio
      distortion *= uIntensity * mask * audioBoost;

      // Add some horizontal wobble variation
      distortion.x += sin(vUv.y * uScale * 2.0 + uTime * uSpeed * 1.5) * uDistortionX * 0.3 * mask * uIntensity;

      // Sample with distorted UVs
      vec4 color = texture2D(tDiffuse, uv + distortion);

      // Optional: subtle color shift at distortion peaks
      float distortionMag = length(distortion) * 50.0;
      color.r += distortionMag * 0.02; // Slight warm shift

      gl_FragColor = color;
    }
  `
};

/**
 * Helper class for managing the heat haze pass
 */
export class HeatHazeController {
  constructor(pass) {
    this.pass = pass;
    this._targetIntensity = 0;
    this._currentIntensity = 0;
    this._transitionSpeed = 0.05;
  }

  /**
   * Set intensity with smooth transition
   * @param {number} intensity - Target intensity (0-1)
   * @param {number} duration - Transition duration in seconds
   */
  setIntensity(intensity, duration = 1.0) {
    this._targetIntensity = Math.max(0, Math.min(1, intensity));
    this._transitionSpeed = duration > 0 ? 1 / (duration * 60) : 1;
  }

  /**
   * Set center point (normalized 0-1)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setCenter(x, y) {
    if (this.pass?.uniforms?.uCenter) {
      this.pass.uniforms.uCenter.value.set(x, y);
    }
  }

  /**
   * Set effect radius
   * @param {number} radius - Radius (0-1)
   */
  setRadius(radius) {
    if (this.pass?.uniforms?.uRadius) {
      this.pass.uniforms.uRadius.value = radius;
    }
  }

  /**
   * Set distortion scale (frequency)
   * @param {number} scale - Scale value
   */
  setScale(scale) {
    if (this.pass?.uniforms?.uScale) {
      this.pass.uniforms.uScale.value = scale;
    }
  }

  /**
   * Set animation speed
   * @param {number} speed - Speed multiplier
   */
  setSpeed(speed) {
    if (this.pass?.uniforms?.uSpeed) {
      this.pass.uniforms.uSpeed.value = speed;
    }
  }

  /**
   * Enable/disable the pass
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this.pass) {
      this.pass.enabled = enabled;
    }
  }

  /**
   * Update (call each frame)
   * @param {number} dt - Delta time
   * @param {object} audio - Audio data {bass, mid, treble, loudness}
   */
  update(dt, audio = {}) {
    if (!this.pass?.uniforms) return;

    // Smooth intensity transition
    this._currentIntensity += (this._targetIntensity - this._currentIntensity) * this._transitionSpeed;
    this.pass.uniforms.uIntensity.value = this._currentIntensity;

    // Auto-disable when intensity is near zero
    if (this._currentIntensity < 0.001 && this._targetIntensity < 0.001) {
      this.pass.enabled = false;
    } else {
      this.pass.enabled = true;
    }

    // Update time
    this.pass.uniforms.uTime.value += dt;

    // Update audio
    this.pass.uniforms.uBass.value = audio.bass || 0;
    this.pass.uniforms.uMid.value = audio.mid || 0;
  }

  /**
   * Reset to defaults
   */
  reset() {
    this._targetIntensity = 0;
    this._currentIntensity = 0;
    if (this.pass?.uniforms) {
      this.pass.uniforms.uIntensity.value = 0;
      this.pass.uniforms.uCenter.value.set(0.5, 0.5);
      this.pass.uniforms.uRadius.value = 0.4;
      this.pass.uniforms.uScale.value = 15.0;
      this.pass.uniforms.uSpeed.value = 2.0;
    }
    if (this.pass) {
      this.pass.enabled = false;
    }
  }
}

export default HeatHazeShader;
