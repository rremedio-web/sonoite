/**
 * SingularityLensPass.js - Screen-Space Gravitational Lensing
 *
 * Post-processing pass that warps the entire screen toward a center point,
 * simulating gravitational lensing around a black hole.
 *
 * Features:
 * - Schwarzschild-inspired radial warp
 * - Audio-reactive intensity (bass = stronger pull)
 * - Configurable center point and strength
 * - Inverse breathing support ("silence pulls")
 *
 * Usage:
 *   import { SingularityLensPass, SingularityLensShader } from './passes/SingularityLensPass.js';
 *   const pass = new ShaderPass(SingularityLensShader);
 *   composer.addPass(pass);
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { ShaderChunks } from '../materials/MaterialRegistry.js';

/**
 * Singularity Lens Shader
 * Warps UV coordinates toward center, creating black hole effect
 */
export const SingularityLensShader = {
  name: 'SingularityLensShader',

  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uStrength: { value: 0.0 },        // Overall lens strength (0-1)
    uRadius: { value: 0.3 },          // Effect radius from center
    uBass: { value: 0.0 },            // Audio reactivity
    uInvert: { value: 0.0 },          // 1.0 = invert (silence pulls)
    uDistortionScale: { value: 1.0 }, // Warp intensity multiplier
    uEventHorizon: { value: 0.05 },   // Reference radius (for accretion glow)
    // Do NOT paint a perfect screen-space black disk by default.
    // The 3D VoidSphere handles occlusion; a hard post mask reads as a 2D UI cutout.
    uCenterMask: { value: 0.0 },      // 0 = disabled, 1 = fully black inside event horizon
    uAccretionGlow: { value: 0.0 },   // Glow ring around event horizon
    uAccretionColor: { value: new THREE.Vector3(0.1, 0.08, 0.15) } // Dark purple
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
    uniform vec2 uCenter;
    uniform float uStrength;
    uniform float uRadius;
    uniform float uBass;
    uniform float uInvert;
    uniform float uDistortionScale;
    uniform float uEventHorizon;
    uniform float uCenterMask;
    uniform float uAccretionGlow;
    uniform vec3 uAccretionColor;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Fade warping near the viewport edges to avoid clamp-to-edge sampling fringes.
      float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
      float edgeFade = smoothstep(0.0, 0.12, edge);

      vec2 fromCenter = uv - uCenter;
      float dist = length(fromCenter);

      // Calculate effective strength (with inversion for "silence pulls")
      float audioMod = mix(uBass, 1.0 - uBass, uInvert);
      float effectiveStrength = uStrength * (0.7 + audioMod * 0.6) * uDistortionScale;
      effectiveStrength *= edgeFade;

      // Apply gravitational lensing if within radius
      if (dist < uRadius && effectiveStrength > 0.001 && dist > 1e-4) {
        // Schwarzschild-style radial warp
        // Strength increases as we approach center (inverse square-ish)
        float normalizedDist = dist / uRadius;
        float falloff = 1.0 - normalizedDist;
        falloff = falloff * falloff; // Quadratic falloff for sharper center

        // Warp magnitude
        float warpAmount = min(effectiveStrength * falloff, 0.4); // Prevent extreme distortion

        // Pull inward (lensing) + subtle spiral (frame dragging).
        float pull = warpAmount * 0.25; // 0..0.10-ish
        vec2 offset = fromCenter * (1.0 - pull);

        float spiralAngle = warpAmount * (0.65 + audioMod * 0.25);
        float cosA = cos(spiralAngle);
        float sinA = sin(spiralAngle);
        offset = vec2(
          offset.x * cosA - offset.y * sinA,
          offset.x * sinA + offset.y * cosA
        );

        uv = uCenter + offset;
      }

      // Sample warped texture
      vec2 safeUv = clamp(uv, vec2(0.0), vec2(1.0));
      vec4 color = texture2D(tDiffuse, safeUv);

      // Event horizon - pure black at center
      if (uCenterMask > 0.001) {
        float horizon = uEventHorizon * (1.0 + uBass * 0.3);
        float mask = 1.0 - smoothstep(horizon, horizon + max(0.002, horizon * 0.35), dist);
        color.rgb = mix(color.rgb, vec3(0.0), mask * uCenterMask);
      }

      // Accretion disk glow (ring around event horizon)
      if (uAccretionGlow > 0.001) {
        float ringDist = abs(dist - uEventHorizon * 1.5);
        float ring = smoothstep(0.08, 0.0, ringDist);
        ring *= uAccretionGlow * (0.8 + uBass * 0.4);

        // Doppler-shift the ring color based on position
        float angle = atan(fromCenter.y, fromCenter.x);
        float doppler = sin(angle + uTime * 0.5) * 0.5 + 0.5;
        vec3 dopplerColor = mix(uAccretionColor * 0.7, uAccretionColor * 1.3, doppler);

        color.rgb += dopplerColor * ring;
      }

      gl_FragColor = color;
    }
  `
};

/**
 * Helper class for managing the singularity lens pass
 */
export class SingularityLensController {
  constructor(pass) {
    this.pass = pass;
    this._targetStrength = 0;
    this._currentStrength = 0;
    this._transitionSpeed = 0.05;
  }

  /**
   * Set lens strength with smooth transition
   * @param {number} strength - Target strength (0-1)
   * @param {number} duration - Transition duration in seconds
   */
  setStrength(strength, duration = 1.0) {
    this._targetStrength = Math.max(0, Math.min(1, strength));
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
   * Enable inverse mode (silence pulls)
   * @param {boolean} enabled
   */
  setInvert(enabled) {
    if (this.pass?.uniforms?.uInvert) {
      this.pass.uniforms.uInvert.value = enabled ? 1.0 : 0.0;
    }
  }

  /**
   * Set accretion disk glow intensity
   * @param {number} intensity - Glow intensity (0-1)
   */
  setAccretionGlow(intensity) {
    if (this.pass?.uniforms?.uAccretionGlow) {
      this.pass.uniforms.uAccretionGlow.value = intensity;
    }
  }

  /**
   * Update (call each frame)
   * @param {number} dt - Delta time
   * @param {object} audio - Audio data {bass, mid, treble, loudness}
   */
  update(dt, audio = {}) {
    if (!this.pass?.uniforms) return;

    // Smooth strength transition
    this._currentStrength += (this._targetStrength - this._currentStrength) * this._transitionSpeed;
    this.pass.uniforms.uStrength.value = this._currentStrength;

    // Auto-disable when strength is near zero
    if (this._currentStrength < 0.001 && this._targetStrength < 0.001) {
      this.pass.enabled = false;
    } else {
      this.pass.enabled = true;
    }

    // Update time
    this.pass.uniforms.uTime.value += dt;

    // Update audio
    this.pass.uniforms.uBass.value = audio.bass || 0;
  }

  /**
   * Reset to defaults
   */
  reset() {
    this._targetStrength = 0;
    this._currentStrength = 0;
    if (this.pass?.uniforms) {
      this.pass.uniforms.uStrength.value = 0;
      this.pass.uniforms.uCenter.value.set(0.5, 0.5);
      this.pass.uniforms.uInvert.value = 0;
      this.pass.uniforms.uAccretionGlow.value = 0;
      if (this.pass.uniforms.uCenterMask) {
        this.pass.uniforms.uCenterMask.value = 0;
      }
    }
  }
}

export default SingularityLensShader;
