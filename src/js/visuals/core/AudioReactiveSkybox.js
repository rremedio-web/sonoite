/**
 * AudioReactiveSkybox - Dynamic background environment
 * Creates an audio-reactive skybox with gradient and particle effects
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { VisualLayer } from '../base/VisualLayer.js';

export class AudioReactiveSkybox extends VisualLayer {
  getConfigValue(key, defaultValue) {
    // Simple config getter - fallback to default if not in cfg
    return this.cfg?.[key] ?? defaultValue;
  }

  onInit() {
    // MP-MEM-01: Create group for proper disposal
    this.group = new THREE.Group();

    // Audio smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
    this._alpha = 0.05; // Very smooth for background

    // Palette support for per-track colors
    this.palette = this.cfg.palette || {
      primary: '#040408',
      secondary: '#0a0a12',
      accent: '#111425'
    };

    // SKY-01: Use palette colors (fallback to nocturnal baseline)
    // CINEMATIC-FIX: Use fog color instead of accent to keep background dark
    // Accent colors (orange/teal) should only appear on foreground elements
    const colors = [
      this.palette.primary || '#040408',
      this.palette.secondary || '#0a0a12',
      this.palette.fog || this.palette.secondary || '#0a0a12'
    ];
    // P5-VOID: Check ambientParticles config - Track 5 sets this to 0 for void aesthetic
    const particleCount = this.getConfigValue('ambientParticles', 200);

    // Create skybox sphere
    this.createSkyboxSphere(colors);

    // Create floating particles (skip if count is 0)
    if (particleCount > 0) {
      this.createAmbientParticles(particleCount);
      if (this.ambientParticles) {
        this.group.add(this.ambientParticles);
      }
    } else {
      // P5-VOID: Create empty placeholder for disposal compatibility
      this.ambientParticles = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({ visible: false })
      );
      this.group.add(this.ambientParticles);
    }

    // MP-MEM-01: Add meshes to group instead of directly to scene
    this.group.add(this.skyboxSphere);
    this.scene.add(this.group);

    // DEC6-FIX: Hide skybox sphere gradient - it creates an unwanted dark circle/tunnel effect
    // The gradient sphere clips the scene visually, making stars only appear "inside" the circle
    // Keep ambient particles visible for atmosphere, but disable the sphere itself
    this.skyboxSphere.visible = false;

    // PERF: Avoid per-frame allocations in particle update loop.
    this._tmpParticleColor = new THREE.Color();

    this.time = 0;
  }

  createSkyboxSphere(colors) {
    // Large sphere that encompasses the entire scene
    const geometry = new THREE.SphereGeometry(100, 32, 16);

    // A.4: Opacity transition state
    this._opacityTransition = null;

    // Create shader material for dynamic gradient
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColor1: { value: new THREE.Color(colors[0]) },
        uColor2: { value: new THREE.Color(colors[1]) },
        uColor3: { value: new THREE.Color(colors[2]) },
        uAudioBass: { value: 0.0 },
        uAudioMid: { value: 0.0 },
        uAudioTreble: { value: 0.0 },
        uLoudness: { value: 0.0 },
        uBrightness: { value: 1.0 },
        uOpacity: { value: 1.0 }  // A.4: Universal skybox opacity for fade-to-black
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vUv = uv;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uAudioBass;
        uniform float uAudioMid;
        uniform float uAudioTreble;
        uniform float uLoudness;
        uniform float uBrightness;
        uniform float uOpacity;

        varying vec3 vWorldPosition;
        varying vec2 vUv;

        void main() {
          // A.4: Early exit if fully transparent
          if (uOpacity < 0.001) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          // Normalize world position for gradient calculation
          vec3 direction = normalize(vWorldPosition);

          // Create vertical gradient
          float gradientY = (direction.y + 1.0) * 0.5;

          // Add some horizontal variation
          float gradientX = (direction.x + 1.0) * 0.5;

          // Audio-reactive color mixing - AMPLIFIED
          float bassEffect = uAudioBass * 0.6;
          float midEffect = uAudioMid * 0.4;
          float trebleEffect = uAudioTreble * 0.8;

          // Base gradient between colors - palette-based
          vec3 color = mix(uColor1, uColor2, gradientY);
          color = mix(color, uColor3, gradientX * 0.3 + bassEffect);

          // CIN-SKY: Subtle aurora motion without banding
          // Keep amplitude ~0.1–0.2 and very slow time scale (0.001–0.003)
          float aurora = sin(direction.x * 3.0 + uTime * 0.003) *
                        cos(direction.y * 2.0 - uTime * 0.002) * 0.12;
          if (abs(direction.y - 0.3) < 0.2) {
            color += vec3(0.02, 0.03, 0.06) * aurora * (1.0 + midEffect);
          }

          // AMPLIFIED brightness - driven by uBrightness uniform
          color *= uBrightness;

          // Add subtle noise pattern
          float noise = sin(direction.x * 10.0 + uTime) *
                       cos(direction.y * 8.0 + uTime * 0.7) *
                       sin(direction.z * 12.0 + uTime * 0.3) * 0.05;
          color += noise * (midEffect + trebleEffect);

          // A.4: Apply opacity for fade-to-black
          color *= uOpacity;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide // Render on the inside of the sphere
    });

    this.skyboxSphere = new THREE.Mesh(geometry, this.skyboxMaterial);
  }

  createAmbientParticles(count) {
    // Create floating particles for atmosphere
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Initialize particles randomly in sphere
    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const radius = 30 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random colors
      const color = new THREE.Color().setHSL(Math.random(), 0.3, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Particle material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 2.0 },
        uAudioLoudness: { value: 0.0 },
        uOpacity: { value: 1.0 }  // A.4: Particle opacity for fade-to-black
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uAudioLoudness;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          gl_Position = projectionMatrix * mvPosition;

          // Audio-reactive size with gentle pulsing
          float audioEffect = 1.0 + uAudioLoudness * 0.3;
          float pulse = 1.0 + sin(uTime * 2.0 + position.x * 0.01) * 0.1;

          gl_PointSize = size * uSize * uPixelRatio * audioEffect * pulse;
          gl_PointSize *= (50.0 / -mvPosition.z); // Size attenuation
        }
      `,
      fragmentShader: `
        uniform float uOpacity;

        void main() {
          // A.4: Early exit if fully transparent
          if (uOpacity < 0.001) {
            discard;
          }

          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float strength = 0.05 / distanceToCenter - 0.1;

          // A.4: Apply opacity for fade-to-black
          gl_FragColor = vec4(1.0, 1.0, 1.0, strength * 0.3 * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.particlePositions = positions;
    this.particleColors = colors;
    this.particleCount = count;
  }

  _smooth(key, value, alpha = this._alpha) {
    // GUARD-FIX-v2: Defensive guard to ensure _ema exists before use
    if (!this._ema) {
      this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
      this._alpha = 0.05;
    }
    this._ema[key] = this._ema[key] * (1 - alpha) + value * alpha;
    return this._ema[key];
  }

  onUpdate(dt, audioData) {
    // Defensive guard: ensure layer is properly initialized
    if (!audioData || !this.skyboxMaterial || !this.ambientParticles) return;

    this.time += dt;

    // A.4: Update opacity transition for fade-to-black
    this._updateOpacityTransition();

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audioData.bass || 0));
    const mid = this._smooth('mid', Math.min(1, audioData.mid || 0));
    const treble = this._smooth('treble', Math.min(1, audioData.treble || 0));
    const loudness = this._smooth('loudness', Math.min(1, audioData.loudness || 0));

    // Update skybox shader uniforms
    this.skyboxMaterial.uniforms.uTime.value = this.time;
    this.skyboxMaterial.uniforms.uAudioBass.value = bass;
    this.skyboxMaterial.uniforms.uAudioMid.value = mid;
    this.skyboxMaterial.uniforms.uAudioTreble.value = treble;
    this.skyboxMaterial.uniforms.uLoudness.value = loudness;

    // INTENSITY-BOOST: More reactive brightness while keeping cinematic
    const alphaAttack = 0.45;  // Faster attack
    const alphaDecay = 0.15;   // Faster decay for more dynamic feel
    const targetBrightness = 0.55 + loudness * 0.6 + bass * 0.25;  // More reactive
    const currentBrightness = this.skyboxMaterial.uniforms.uBrightness.value;
    const brightnessAlpha = (targetBrightness > currentBrightness) ? alphaAttack : alphaDecay;
    this.skyboxMaterial.uniforms.uBrightness.value = currentBrightness + (targetBrightness - currentBrightness) * brightnessAlpha;
    this.skyboxMaterial.uniforms.uBrightness.value = THREE.MathUtils.clamp(this.skyboxMaterial.uniforms.uBrightness.value, 0.45, 1.2);  // Allow slight boost

    // Update ambient particles
    if (this.ambientParticles) {
      this.ambientParticles.material.uniforms.uTime.value = this.time;
      this.ambientParticles.material.uniforms.uAudioLoudness.value = loudness;

      // INTENSITY-BOOST: More reactive particle rotation
      const rotationBoost = 1.0 + bass * 2.0;  // Spin faster with bass
      this.ambientParticles.rotation.y += dt * 0.008 * rotationBoost;
      this.ambientParticles.rotation.x += dt * 0.004 * rotationBoost;

      // INTENSITY-BOOST: More reactive particle colors
      if (this.particleCount && this.particleColors) {
        const baseHue = (this.time * 0.03 + loudness * 0.2) % 1; // Faster hue shift
        const saturation = 0.4 + bass * 0.3;  // More saturated with bass
        const lightness = 0.5 + treble * 0.35;  // Brighter with treble

        // Reuse a single Color instance to avoid allocating ~particleCount objects per frame.
        const color = this._tmpParticleColor || (this._tmpParticleColor = new THREE.Color());

        for (let i = 0; i < this.particleCount; i++) {
          color.setHSL((baseHue + i * 0.001) % 1, saturation, lightness);

          const o = i * 3;
          this.particleColors[o] = color.r;
          this.particleColors[o + 1] = color.g;
          this.particleColors[o + 2] = color.b;
        }

        if (this.ambientParticles.geometry.attributes.color) {
          this.ambientParticles.geometry.attributes.color.needsUpdate = true;
        }
      }
    }
  }

  /**
   * P5-VOID: Set ambient particles visibility
   * Called when switching tracks to show/hide particles based on journey config
   * @param {boolean} visible - Whether particles should be visible
   */
  setAmbientParticlesVisible(visible) {
    if (this.ambientParticles) {
      this.ambientParticles.visible = visible;
      if (window.SONOITE_DEBUG) {
        console.log(`[AudioReactiveSkybox] Ambient particles ${visible ? 'shown' : 'hidden'}`);
      }
    }
  }

  /**
   * P5-VOID: Apply journey-specific skybox config
   * @param {Object} config - Skybox config from journey JSON
   */
  applyJourneyConfig(config) {
    if (!config) return;

    // Handle ambientParticles visibility
    if (config.ambientParticles !== undefined) {
      this.setAmbientParticlesVisible(config.ambientParticles > 0);
    }
  }

  /**
   * MP3-PALETTE: Update skybox palette at runtime (core layers persist across tracks).
   * @param {Object} palette - {primary, secondary, accent, fog}
   */
  applyPalette(palette) {
    if (!palette) return;

    this.palette = { ...(this.palette || {}), ...palette };

    // Keep the background dark; use fog/secondary for the third stop.
    const colors = [
      this.palette.primary || '#040408',
      this.palette.secondary || '#0a0a12',
      this.palette.fog || this.palette.secondary || '#0a0a12'
    ];

    if (this.skyboxMaterial?.uniforms) {
      this.skyboxMaterial.uniforms.uColor1.value.set(colors[0]);
      this.skyboxMaterial.uniforms.uColor2.value.set(colors[1]);
      this.skyboxMaterial.uniforms.uColor3.value.set(colors[2]);
    }
  }

  /**
   * A.4: Set skybox opacity with smooth transition for fade-to-black
   * @param {number} value - Target opacity (0-1)
   * @param {number} duration - Transition duration in seconds (default 2.0)
   */
  setOpacity(value, duration = 2.0) {
    const targetValue = Math.max(0, Math.min(1, value));

    if (duration <= 0) {
      // Immediate set
      if (this.skyboxMaterial?.uniforms?.uOpacity) {
        this.skyboxMaterial.uniforms.uOpacity.value = targetValue;
      }
      if (this.ambientParticles?.material?.uniforms?.uOpacity) {
        this.ambientParticles.material.uniforms.uOpacity.value = targetValue;
      }
      this._opacityTransition = null;
      return;
    }

    // Store current value as start
    const currentOpacity = this.skyboxMaterial?.uniforms?.uOpacity?.value ?? 1.0;

    this._opacityTransition = {
      startValue: currentOpacity,
      targetValue: targetValue,
      duration: duration,
      startTime: performance.now()
    };

    if (window.SONOITE_DEBUG) {
      console.log(`[AudioReactiveSkybox] Fading opacity from ${currentOpacity.toFixed(2)} to ${targetValue.toFixed(2)} over ${duration}s`);
    }
  }

  /**
   * A.4: Update opacity transition (called from onUpdate)
   * @private
   */
  _updateOpacityTransition() {
    if (!this._opacityTransition) return;

    const { startValue, targetValue, duration, startTime } = this._opacityTransition;
    const elapsed = (performance.now() - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic for cinematic feel
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * eased;

    // Apply to both skybox and particles
    if (this.skyboxMaterial?.uniforms?.uOpacity) {
      this.skyboxMaterial.uniforms.uOpacity.value = currentValue;
    }
    if (this.ambientParticles?.material?.uniforms?.uOpacity) {
      this.ambientParticles.material.uniforms.uOpacity.value = currentValue;
    }

    // Clear transition when complete
    if (progress >= 1) {
      this._opacityTransition = null;
      if (window.SONOITE_DEBUG) {
        console.log(`[AudioReactiveSkybox] Opacity transition complete: ${targetValue.toFixed(2)}`);
      }
    }
  }

  onDispose() {
    // P1-FIX: Add null checks to prevent errors during disposal
    try {
      // MP-MEM-01: Remove group from scene (dispose3D will handle recursive disposal)
      if (this.group && this.scene) {
        this.scene.remove(this.group);
      }

      // Manual disposal for safety (dispose3D will handle this, but belt-and-suspenders)
      if (this.skyboxSphere) {
        if (this.skyboxSphere.geometry) this.skyboxSphere.geometry.dispose();
        if (this.skyboxMaterial) this.skyboxMaterial.dispose();
        this.skyboxSphere = null;
        this.skyboxMaterial = null;
      }

      if (this.ambientParticles) {
        if (this.ambientParticles.geometry) this.ambientParticles.geometry.dispose();
        if (this.ambientParticles.material) this.ambientParticles.material.dispose();
        this.ambientParticles = null;
        this.particlePositions = null;
        this.particleColors = null;
      }

      // MP-MEM-01: Clear group reference
      this.group = null;

      this._tmpParticleColor = null;
    } catch (error) {
      // P1-FIX: Log but don't throw during disposal
      if (window.SONOITE_DEBUG) {
        console.warn('[AudioReactiveSkybox] Disposal warning:', error.message);
      }
    }
  }
}

export default AudioReactiveSkybox;
