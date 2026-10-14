/**
 * EmberRingAscent - Ascending ember particles orbiting monolith
 *
 * External auditor concept: "Upward particles orbiting monolith
 * (counterpoint to falling ash), warm amber palette"
 *
 * Contrasts with Track 1's cold descending stars/ash:
 * - Ascends instead of falls
 * - Orbits around central point (monolith)
 * - Warm amber/orange colors vs cold cyan
 * - Bass = glow intensity, Treble = orbit speed
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

/**
 * Create ember particle material with emissive glow
 */
function createEmberMaterial({ color = '#c8843a', glowColor = '#ff6030' } = {}) {
  const vertexShader = `
    attribute float aSize;
    attribute float aPhase;
    attribute float aOrbitSpeed;

    varying float vPhase;
    varying float vOrbitSpeed;
    varying vec2 vUv;

    uniform float uTime;
    uniform float uBassBrightness;

    void main() {
      vPhase = aPhase;
      vOrbitSpeed = aOrbitSpeed;
      vUv = uv;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      // Size varies with bass and distance
      float bassSizeBoost = 1.0 + uBassBrightness * 0.5;
      float distanceFade = 1.0 / (1.0 + length(mvPosition.xyz) * 0.05);
      float size = aSize * bassSizeBoost * distanceFade * 80.0;

      gl_PointSize = max(2.0, min(size, 40.0));
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    precision mediump float;

    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uOpacity;
    uniform float uTime;
    uniform float uBassBrightness;
    uniform float uTrebleShimmer;

    varying float vPhase;
    varying float vOrbitSpeed;
    varying vec2 vUv;

    void main() {
      // Circular point with soft edge
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);

      if (dist > 0.5) discard;

      // Soft glow falloff
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha = pow(alpha, 1.5); // Sharper falloff

      // Core vs outer glow
      float core = 1.0 - smoothstep(0.0, 0.2, dist);

      // Time-based flicker
      float flicker = sin(uTime * 8.0 + vPhase * 6.28) * 0.15 + 0.85;
      flicker *= 0.5 + uTrebleShimmer * 0.5;

      // Mix core (bright) with outer (colored)
      vec3 coreColor = vec3(1.0, 0.9, 0.7); // Hot white-yellow core
      vec3 outerColor = mix(uColor, uGlowColor, uBassBrightness);
      vec3 finalColor = mix(outerColor, coreColor, core * 0.8);

      // Bass boosts overall brightness
      finalColor *= (1.0 + uBassBrightness * 0.8) * flicker;

      // Clamp to prevent blowout
      finalColor = clamp(finalColor, vec3(0.0), vec3(2.0));

      gl_FragColor = vec4(finalColor, alpha * uOpacity);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGlowColor: { value: new THREE.Color(glowColor) },
      uOpacity: { value: 0.85 },
      uTime: { value: 0 },
      uBassBrightness: { value: 0 },
      uTrebleShimmer: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export class EmberRingAscent extends VisualLayer {
  mount() {
    super.mount();

    // Particle count (mobile-aware)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const count = isMobile
      ? Math.min(this.cfg.count ?? 150, 150)
      : Math.min(this.cfg.count ?? 300, 400);

    // Ember colors from config or defaults
    const emberColor = this.cfg.palette?.accent || this.cfg.color || '#c8843a';
    const glowColor = this.cfg.glowColor || '#ff6030';

    // Orbit parameters
    this.orbitRadius = this.cfg.orbitRadius ?? 2.5;
    this.orbitCenter = new THREE.Vector3(
      this.cfg.center?.x ?? 0,
      this.cfg.center?.y ?? 3,  // Monolith center Y
      this.cfg.center?.z ?? 0
    );
    this.ascentSpeed = this.cfg.ascentSpeed ?? 0.8;
    this.baseOrbitSpeed = this.cfg.orbitSpeed ?? 0.3;

    // Create geometry
    this.geometry = new THREE.BufferGeometry();

    // Initialize particle attributes
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const orbitSpeeds = new Float32Array(count);
    const orbitRadii = new Float32Array(count);
    const heights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random starting angle
      const angle = Math.random() * Math.PI * 2;
      // Varying radius (inner to outer ring)
      const radius = this.orbitRadius * (0.6 + Math.random() * 0.8);
      // Random starting height
      const height = Math.random() * 8 - 2;

      positions[i * 3] = this.orbitCenter.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = this.orbitCenter.y + height;
      positions[i * 3 + 2] = this.orbitCenter.z + Math.sin(angle) * radius;

      sizes[i] = 0.03 + Math.random() * 0.05;
      phases[i] = Math.random() * Math.PI * 2;
      orbitSpeeds[i] = this.baseOrbitSpeed * (0.7 + Math.random() * 0.6);
      orbitRadii[i] = radius;
      heights[i] = height;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbitSpeeds, 1));

    // Store for animation
    this.instanceData = {
      count,
      orbitRadii,
      heights,
      phases,
      orbitSpeeds
    };

    // Create material
    this.material = createEmberMaterial({ color: emberColor, glowColor });

    // Create points
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 90; // Before falling ash
    this.group.add(this.points);

    // Time tracking
    this.time = 0;

    // Audio smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
    this._alpha = 0.12;

    // Opacity target for fade in/out
    this._targetOpacity = this.cfg.opacity ?? 0.85;
    this._currentOpacity = 0;
  }

  _smooth(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  update(audio, dt) {
    if (!this.points || !this.geometry) return;

    this.time += dt;

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loudness = this._smooth('loudness', Math.min(1, audio?.loudness ?? 0));

    // Update material uniforms
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uBassBrightness.value = bass;
    this.material.uniforms.uTrebleShimmer.value = treble;

    // Fade in opacity
    this._currentOpacity += (this._targetOpacity - this._currentOpacity) * 0.05;
    this.material.uniforms.uOpacity.value = this._currentOpacity;

    // Update particle positions
    const positions = this.geometry.attributes.position.array;
    const data = this.instanceData;

    // Treble speeds up orbit
    const orbitMultiplier = 1.0 + treble * 0.5;

    for (let i = 0; i < data.count; i++) {
      const phase = data.phases[i];
      const orbitSpeed = data.orbitSpeeds[i] * orbitMultiplier;
      const radius = data.orbitRadii[i];

      // Calculate current angle (time-based orbit)
      const currentAngle = phase + this.time * orbitSpeed;

      // Ascending motion (faster with loudness)
      let height = positions[i * 3 + 1];
      height += this.ascentSpeed * dt * (0.8 + loudness * 0.4);

      // Reset at top
      if (height > this.orbitCenter.y + 6) {
        height = this.orbitCenter.y - 2;
        // Randomize radius slightly on reset
        data.orbitRadii[i] = this.orbitRadius * (0.6 + Math.random() * 0.8);
      }

      // Apply orbital position
      const wobble = Math.sin(this.time * 2 + phase) * 0.2;
      const currentRadius = radius + wobble;

      positions[i * 3] = this.orbitCenter.x + Math.cos(currentAngle) * currentRadius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = this.orbitCenter.z + Math.sin(currentAngle) * currentRadius;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Set opacity (for phase transitions)
   */
  setOpacity(value, duration = 1.0) {
    this._targetOpacity = Math.max(0, Math.min(1, value));
  }

  /**
   * Set orbit center (e.g., follow monolith)
   */
  setOrbitCenter(x, y, z) {
    this.orbitCenter.set(x, y, z);
  }

  /**
   * Set audio dampening for fade-out phases
   */
  setAudioDampening(value) {
    this._alpha = 0.12 * value;
  }

  unmount() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    super.unmount();
  }
}

export default EmberRingAscent;
