/**
 * AudioReactiveShader - GLSL shader flow with real-time audio reactivity
 *
 * Ported from Shadertoy community patterns with audio uniform integration.
 * Supports multiple shader presets: void_pulse, fractal_flow, plasma_wave
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

// Shader presets
const SHADER_PRESETS = {
  /**
   * void_pulse - Dark pulsing void with bass-reactive rings
   * Inspired by: https://www.shadertoy.com/view/XsXXDn
   */
  void_pulse: {
    fragmentShader: `
      precision mediump float;

      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uLoudness;
      uniform float uKickIntensity;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= uResolution.x / uResolution.y;

        // Distance from center
        float d = length(uv);

        // Bass-reactive ring expansion
        float ringSpeed = 1.0 + uBass * 2.0;
        float rings = sin(d * 20.0 - uTime * ringSpeed + uKickIntensity * 3.0);

        // Add kick punch
        float kickPulse = uKickIntensity * (1.0 - d * 2.0);
        rings += kickPulse * 0.5;

        // Mid-frequency glow
        float glow = 0.02 / (d + 0.01);
        glow *= (0.5 + uMid * 0.5);

        // Treble sparkle
        float sparkle = fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
        sparkle *= uTreble * 0.3 * step(0.97, sparkle);

        // Combine
        float intensity = rings * 0.3 + glow * 0.5 + sparkle;
        intensity *= (0.3 + uLoudness * 0.7);

        // Color mixing
        vec3 color = mix(uColor1, uColor2, d + uBass * 0.3);
        color *= intensity;

        // Vignette
        float vignette = 1.0 - d * 1.5;
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    defaults: {
      color1: new THREE.Color(0x1a1a2e),
      color2: new THREE.Color(0x4a4a8a)
    }
  },

  /**
   * fractal_flow - Flowing fractal patterns reactive to mid frequencies
   */
  fractal_flow: {
    fragmentShader: `
      precision mediump float;

      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uLoudness;
      uniform float uKickIntensity;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= uResolution.x / uResolution.y;

        // Time with mid-frequency modulation
        float t = uTime * (0.3 + uMid * 0.4);

        // Fractal iteration
        vec2 z = uv * (3.0 + uBass);
        float intensity = 0.0;

        for (int i = 0; i < 8; i++) {
          z = abs(z) / dot(z, z) - vec2(0.7 + sin(t) * 0.1, 0.5 + cos(t * 0.7) * 0.1);
          intensity += 1.0 / (1.0 + dot(z, z));
        }

        intensity *= 0.1;
        intensity *= (0.5 + uLoudness * 0.5);

        // Kick punch - flash
        intensity += uKickIntensity * 0.3;

        // Treble highlights
        intensity += uTreble * 0.2 * fract(intensity * 5.0);

        // Color
        vec3 color = mix(uColor1, uColor2, intensity);

        // Add subtle noise
        float noise = fract(sin(dot(uv * 50.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
        color += noise * 0.02;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    defaults: {
      color1: new THREE.Color(0x0a0a15),
      color2: new THREE.Color(0x3a3a6a)
    }
  },

  /**
   * plasma_wave - Classic plasma effect with treble reactivity
   */
  plasma_wave: {
    fragmentShader: `
      precision mediump float;

      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uLoudness;
      uniform float uKickIntensity;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= uResolution.x / uResolution.y;

        float t = uTime * 0.5;

        // Plasma layers with audio modulation
        float v1 = sin(uv.x * 5.0 + t + uBass * 3.0);
        float v2 = sin(uv.y * 5.0 + t * 1.3 + uMid * 2.0);
        float v3 = sin((uv.x + uv.y) * 5.0 + t * 0.7);
        float v4 = sin(length(uv * 10.0) - t * 2.0 + uTreble * 4.0);

        float plasma = (v1 + v2 + v3 + v4) * 0.25;
        plasma = plasma * 0.5 + 0.5;

        // Audio intensity
        plasma *= (0.4 + uLoudness * 0.6);

        // Kick flash
        plasma += uKickIntensity * 0.2;

        // Colors
        vec3 color = mix(uColor1, uColor2, plasma);

        // Subtle vignette
        float d = length(uv);
        color *= 1.0 - d * 0.5;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    defaults: {
      color1: new THREE.Color(0x0d0d1a),
      color2: new THREE.Color(0x2a4a6a)
    }
  },

  /**
   * noir_fog - Dark atmospheric fog for noir aesthetic
   */
  noir_fog: {
    fragmentShader: `
      precision mediump float;

      uniform float uTime;
      uniform float uBass;
      uniform float uMid;
      uniform float uTreble;
      uniform float uLoudness;
      uniform float uKickIntensity;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      varying vec2 vUv;

      // Simplex-like noise
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

      float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          sum += noise(p) * amp;
          p *= 2.0;
          amp *= 0.5;
        }
        return sum;
      }

      void main() {
        vec2 uv = vUv;
        uv.x *= uResolution.x / uResolution.y;

        // Slow drifting fog
        float t = uTime * 0.1;
        vec2 drift = vec2(t, t * 0.7);

        // Layer fog with audio modulation
        float fog1 = fbm(uv * 2.0 + drift + uBass * 0.5);
        float fog2 = fbm(uv * 3.0 - drift * 0.5 + uMid * 0.3);
        float fog3 = fbm(uv * 5.0 + drift * 0.3 + uTreble * 0.2);

        float fog = (fog1 + fog2 * 0.5 + fog3 * 0.25) / 1.75;

        // Audio intensity
        fog *= (0.3 + uLoudness * 0.7);

        // Kick punch - brief brighten
        fog += uKickIntensity * 0.15;

        // Dark gradient from bottom
        fog *= 0.5 + vUv.y * 0.5;

        // Colors - very dark noir palette
        vec3 color = mix(uColor1, uColor2, fog);

        // Heavy vignette
        float d = length(vUv - 0.5) * 1.4;
        color *= 1.0 - d * d;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    defaults: {
      color1: new THREE.Color(0x050508),
      color2: new THREE.Color(0x1a1a25)
    }
  }
};

// Vertex shader (shared)
const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export class AudioReactiveShader extends VisualLayer {
  mount() {
    if (!this.group) {
      this.group = new THREE.Group();
    }
    super.mount();

    // Get shader preset
    const presetName = this.cfg?.preset || 'void_pulse';
    const preset = SHADER_PRESETS[presetName] || SHADER_PRESETS.void_pulse;

    // Get colors from config or preset defaults
    const color1 = this.cfg?.color1 ?
      new THREE.Color(this.cfg.color1) : preset.defaults.color1;
    const color2 = this.cfg?.color2 ?
      new THREE.Color(this.cfg.color2) : preset.defaults.color2;

    // Override with palette if provided
    if (this.cfg?.palette?.primary) {
      color1.set(this.cfg.palette.primary);
    }
    if (this.cfg?.palette?.secondary) {
      color2.set(this.cfg.palette.secondary);
    }

    // Create uniforms
    this.uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uLoudness: { value: 0 },
      uKickIntensity: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uColor1: { value: color1 },
      uColor2: { value: color2 }
    };

    // Create shader material
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: preset.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    // Create full-screen quad
    const aspect = window.innerWidth / window.innerHeight;
    const geo = new THREE.PlaneGeometry(50 * aspect, 50);

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.z = this.cfg?.zPosition || -20;
    this.mesh.renderOrder = this.cfg?.renderOrder || -50;
    this.group.add(this.mesh);

    // EMA smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0, kick: 0 };
    this._alpha = 0.2;

    // Handle resize
    this._onResize = () => {
      this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      if (this.mesh) {
        const newAspect = window.innerWidth / window.innerHeight;
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(50 * newAspect, 50);
      }
    };
    window.addEventListener('resize', this._onResize);

    console.log(`[AudioReactiveShader] Mounted preset: ${presetName}`);
  }

  _smooth(key, value) {
    this._ema[key] = this._ema[key] * (1 - this._alpha) + value * this._alpha;
    return this._ema[key];
  }

  update(audio, dt) {
    if (!this.uniforms) return;

    // Update time
    this.uniforms.uTime.value += dt;

    // Smooth audio values
    const bass = this._smooth('bass', audio?.bass || 0);
    const mid = this._smooth('mid', audio?.mid || 0);
    const treble = this._smooth('treble', audio?.treble || 0);
    const loudness = this._smooth('loudness', audio?.loudness || 0);

    // Get kick intensity from beat detector (if available)
    const kickIntensity = audio?.beat?.kickIntensity || 0;
    const smoothKick = this._smooth('kick', kickIntensity);

    // Update uniforms
    this.uniforms.uBass.value = bass;
    this.uniforms.uMid.value = mid;
    this.uniforms.uTreble.value = treble;
    this.uniforms.uLoudness.value = loudness;
    this.uniforms.uKickIntensity.value = smoothKick;
  }

  /**
   * Change shader preset at runtime
   */
  setPreset(presetName) {
    const preset = SHADER_PRESETS[presetName];
    if (!preset) {
      console.warn(`[AudioReactiveShader] Unknown preset: ${presetName}`);
      return;
    }

    // Update fragment shader
    this.mat.fragmentShader = preset.fragmentShader;
    this.mat.needsUpdate = true;

    // Update colors
    this.uniforms.uColor1.value.copy(preset.defaults.color1);
    this.uniforms.uColor2.value.copy(preset.defaults.color2);

    console.log(`[AudioReactiveShader] Switched to preset: ${presetName}`);
  }

  /**
   * Set colors at runtime
   */
  setColors(color1, color2) {
    if (color1) this.uniforms.uColor1.value.set(color1);
    if (color2) this.uniforms.uColor2.value.set(color2);
  }

  unmount() {
    window.removeEventListener('resize', this._onResize);

    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }

    super.unmount();
  }
}

// Export preset names for journey configuration
export const AUDIO_SHADER_PRESETS = Object.keys(SHADER_PRESETS);

export default AudioReactiveShader;
