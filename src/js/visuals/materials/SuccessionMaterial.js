/**
 * SuccessionMaterial.js - Obsidian→Plasma Dissolve Material
 *
 * Custom material for Track 6 (O Filho) showing transformation:
 * - Obsidian shell (cold, dark, rough PBR-like)
 * - Plasma core (hot, bright, emissive)
 * - Noise-based dissolve mask revealing the transition
 * - Burn edge (bright line at the frontier)
 *
 * The "succession" represents father→son transformation,
 * where the cold exterior burns away to reveal inner fire.
 *
 * Usage:
 *   import { createSuccessionMaterial } from './materials/SuccessionMaterial.js';
 *   const material = createSuccessionMaterial({ transition: 0.5 });
 *   mesh.material = material;
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { ShaderChunks } from './MaterialRegistry.js';

/**
 * Create a succession material with dissolve effect
 * @param {Object} options - Material options
 * @param {number} options.transition - Dissolve progress (0=obsidian, 1=plasma)
 * @param {string} options.obsidianColor - Cold shell color
 * @param {string} options.plasmaColor - Hot core color
 * @param {string} options.burnColor - Edge glow color
 * @param {number} options.burnWidth - Edge glow width
 * @returns {THREE.ShaderMaterial}
 */
export function createSuccessionMaterial(options = {}) {
  const {
    transition = 0.0,
    obsidianColor = '#0a0a12',
    plasmaColor = '#ff6622',
    burnColor = '#ffaa44',
    burnWidth = 0.08,
    roughnessBase = 0.85,
    emissiveIntensity = 1.5
  } = options;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uTransition: { value: transition },
      uObsidianColor: { value: new THREE.Color(obsidianColor) },
      uPlasmaColor: { value: new THREE.Color(plasmaColor) },
      uBurnColor: { value: new THREE.Color(burnColor) },
      uBurnWidth: { value: burnWidth },
      uRoughnessBase: { value: roughnessBase },
      uEmissiveIntensity: { value: emissiveIntensity },
      uBass: { value: 0.0 },
      uMid: { value: 0.0 },
      uTreble: { value: 0.0 },
      uNoiseScale: { value: 3.5 },
      uNoiseSpeed: { value: 0.15 }
    },

    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    fragmentShader: `
      uniform float uTime;
      uniform float uTransition;
      uniform vec3 uObsidianColor;
      uniform vec3 uPlasmaColor;
      uniform vec3 uBurnColor;
      uniform float uBurnWidth;
      uniform float uRoughnessBase;
      uniform float uEmissiveIntensity;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uNoiseScale;
      uniform float uNoiseSpeed;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;
      varying vec2 vUv;

      ${ShaderChunks.snoise3D}

      // Multi-octave noise for organic dissolve pattern
      float fbmNoise(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;

        for (int i = 0; i < 4; i++) {
          value += amplitude * snoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }

        return value;
      }

      // Fresnel for rim lighting
      float fresnel(float power) {
        return pow(1.0 - max(dot(vNormal, vViewDir), 0.0), power);
      }

      void main() {
        // Animated noise position
        vec3 noisePos = vWorldPosition * uNoiseScale + vec3(uTime * uNoiseSpeed);

        // Multi-scale noise for organic dissolve
        float noise = fbmNoise(noisePos);
        noise = noise * 0.5 + 0.5; // Remap to 0-1

        // Add bass-reactive perturbation
        noise += snoise(noisePos * 2.0 + vec3(uTime * 0.5)) * uBass * 0.15;

        // Dissolve threshold with transition
        float threshold = uTransition;

        // Calculate if we're in obsidian, plasma, or burn edge
        float burnEdge = 0.0;
        float plasmaReveal = 0.0;

        if (noise < threshold - uBurnWidth) {
          // Pure plasma (revealed)
          plasmaReveal = 1.0;
        } else if (noise < threshold + uBurnWidth) {
          // Burn edge (frontier)
          float edgePos = (noise - (threshold - uBurnWidth)) / (uBurnWidth * 2.0);
          burnEdge = sin(edgePos * 3.14159); // Smooth falloff
          plasmaReveal = smoothstep(threshold, threshold - uBurnWidth, noise);
        }
        // Else: pure obsidian

        // === OBSIDIAN (cold shell) ===
        vec3 obsidian = uObsidianColor;
        // Add roughness variation
        float roughnessNoise = snoise(vWorldPosition * 8.0) * 0.1;
        float roughness = uRoughnessBase + roughnessNoise;

        // Subtle treble-reactive glint on obsidian
        float glint = pow(max(dot(reflect(-vViewDir, vNormal), vec3(0.5, 1.0, 0.5)), 0.0), 32.0);
        obsidian += vec3(0.1, 0.1, 0.15) * glint * uTreble * (1.0 - plasmaReveal);

        // === PLASMA (hot core) ===
        vec3 plasma = uPlasmaColor;

        // Pulsing emissive (bass-driven heartbeat)
        float pulse = sin(uTime * 3.0 + noise * 6.28) * 0.5 + 0.5;
        pulse = 0.7 + pulse * 0.3 * (0.5 + uBass * 1.0);
        plasma *= uEmissiveIntensity * pulse;

        // Add internal glow variation
        float internalGlow = snoise(vWorldPosition * 5.0 + vec3(uTime * 0.3));
        plasma += uPlasmaColor * 0.3 * internalGlow * plasmaReveal;

        // Fresnel rim on plasma
        float rim = fresnel(2.5);
        plasma += uPlasmaColor * rim * 0.5 * plasmaReveal;

        // === BURN EDGE ===
        vec3 burn = uBurnColor * (1.5 + uBass * 1.0);
        // Add flicker
        float flicker = snoise(vec3(vUv * 20.0, uTime * 5.0));
        burn *= 1.0 + flicker * 0.3;

        // === COMBINE ===
        vec3 color = mix(obsidian, plasma, plasmaReveal);
        color += burn * burnEdge;

        // Add overall rim light based on transition
        float edgeRim = fresnel(3.0);
        color += uBurnColor * edgeRim * uTransition * 0.3;

        // Keep the shell readable but let the inner reactor earn the frame.
        float alpha = mix(0.52, 0.84, 1.0 - plasmaReveal);
        alpha -= burnEdge * 0.10;
        alpha = clamp(alpha, 0.46, 0.88);

        // Output
        gl_FragColor = vec4(color, alpha);
      }
    `,

    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false
  });

  // Add update method for animation
  material.userData.update = function(audio, dt) {
    this.uniforms.uTime.value += dt;
    if (audio) {
      this.uniforms.uBass.value = audio.bass || 0;
      this.uniforms.uMid.value = audio.mid || 0;
      this.uniforms.uTreble.value = audio.treble || 0;
    }
  }.bind(material);

  // Add transition setter
  material.userData.setTransition = function(value, duration = 0) {
    if (duration <= 0) {
      this.uniforms.uTransition.value = value;
      return;
    }
    // Simple linear tween
    const start = this.uniforms.uTransition.value;
    const delta = value - start;
    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      this.uniforms.uTransition.value = start + delta * t;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }.bind(material);

  return material;
}

/**
 * Succession material controller for Track6Director
 */
export class SuccessionController {
  constructor(material) {
    this.material = material;
    const initialTransition = material?.uniforms?.uTransition?.value;
    this._targetTransition = Number.isFinite(initialTransition) ? initialTransition : 0;
    this._transitionSpeed = 0.02;
  }

  /**
   * Set transition with smooth interpolation
   * @param {number} value - Target transition (0-1)
   * @param {number} duration - Duration in seconds
   */
  setTransition(value, duration = 2.0) {
    this._targetTransition = Math.max(0, Math.min(1, value));
    this._transitionSpeed = duration > 0 ? 1 / (duration * 60) : 1;
  }

  /**
   * Trigger a heat pulse (bass-driven)
   */
  pulse() {
    if (this.material?.uniforms?.uEmissiveIntensity) {
      const base = this.material.uniforms.uEmissiveIntensity.value;
      this.material.uniforms.uEmissiveIntensity.value = base * 1.5;
      setTimeout(() => {
        if (this.material?.uniforms?.uEmissiveIntensity) {
          this.material.uniforms.uEmissiveIntensity.value = base;
        }
      }, 150);
    }
  }

  /**
   * Update each frame
   * @param {number} dt - Delta time
   * @param {object} audio - Audio data
   */
  update(dt, audio) {
    if (!this.material?.uniforms) return;

    // Smooth transition
    const current = this.material.uniforms.uTransition.value;
    const diff = this._targetTransition - current;
    this.material.uniforms.uTransition.value = current + diff * this._transitionSpeed;

    // Update material
    if (this.material.userData.update) {
      this.material.userData.update(audio, dt);
    }
  }
}

export default createSuccessionMaterial;
