/**
 * LightField - Dynamic lighting system with audio reactivity
 * Provides ambient and directional lighting that responds to audio
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import * as THREE from 'three';
import { VisualLayer } from '../base/VisualLayer.js';

export class LightField extends VisualLayer {
  onInit() {
    // GUARD-FIX: Always initialize _ema even if singleton guard triggers
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
    this._alpha = 0.1;

    // STAB-04: Singleton guard - prevent duplicate lights on re-initialization
    if (this.scene.userData.lightFieldInitialized) {
      console.warn('[LightField] Already initialized, skipping light creation');
      return;
    }

    this.lights = new THREE.Group();
    this.group = this.lights; // MP-MEM-01: Alias for dispose3D compatibility
    this.lightObjects = [];

    // Palette support for per-track colors
    this.palette = this.cfg.palette || {
      primary: '#d7d7e0',
      secondary: '#56667a',
      accent: '#718096'
    };

    // PERF: Reuse Color objects in onUpdate (avoid per-frame allocations).
    this._primaryColor = new THREE.Color(this.palette.primary);
    this._accentColor = new THREE.Color(this.palette.accent);

    // LGT-01: Configuration with minimal defaults
    const intensity = this.getConfigValue('intensity', 0.8);
    const color = this.getConfigValue('color', this.palette.primary || '#ffffff');
    const audioReactive = this.getConfigValue('audioReactive', true);
    const accentCount = this.getConfigValue('accentCount', 0); // LGT-01: Default 0 accents

    // LGT-01: Ambient light - minimal base illumination (≈0.1)
    // CIN-LIGHT: Ambient 0.2–0.4 for base fill
    const ambientIntensity = this.getConfigValue('ambientIntensity', 0.25);
    this.ambientLight = new THREE.AmbientLight(color, ambientIntensity);
    this.ambientLight.userData.owner = 'LightField'; // STAB-04: Tag ownership
    this.lights.add(this.ambientLight);

    // LGT-01: Main directional light (≈0.5)
    // CIN-LIGHT: Directional 1.0–1.5 for contrast
    const directionalIntensity = this.getConfigValue('directionalIntensity', 1.25);
    this.directionalLight = new THREE.DirectionalLight(color, directionalIntensity);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    // CIN-LIGHT: PCFSoft-like soft shadows via map size and bias
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.bias = -0.0001;
    this.directionalLight.userData.owner = 'LightField'; // STAB-04: Tag ownership
    this.lights.add(this.directionalLight);

    // LGT-01: Point lights for accent lighting (optional, default 0)
    if (accentCount > 0) {
      this.createAccentLights(intensity, accentCount);
    }

    // Store original intensities for audio reactivity
    this.originalIntensities = {
      ambient: this.ambientLight.intensity,
      directional: this.directionalLight.intensity,
      accents: this.lightObjects.map(light => light.intensity)
    };

    this.scene.add(this.lights);

    // STAB-04: Mark scene as having LightField initialized
    this.scene.userData.lightFieldInitialized = true;
  }

  createAccentLights(baseIntensity, count = 3) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

    for (let i = 0; i < count; i++) {
      const light = new THREE.PointLight(colors[i % colors.length], baseIntensity * 0.3, 20);
      light.userData.owner = 'LightField'; // STAB-04: Tag ownership

      // Position lights in a circle around the scene
      const angle = (i / count) * Math.PI * 2;
      const radius = 8;
      light.position.set(
        Math.cos(angle) * radius,
        3 + Math.sin(angle * 2) * 2,
        Math.sin(angle) * radius
      );

      this.lightObjects.push(light);
      this.lights.add(light);
    }
  }

  /**
   * MP3-PALETTE: Update palette at runtime (core layers persist across tracks).
   * @param {Object} palette - {primary, secondary, accent}
   */
  applyPalette(palette) {
    if (!palette) return;

    this.palette = { ...(this.palette || {}), ...palette };

    if (this._primaryColor) this._primaryColor.set(this.palette.primary || '#ffffff');
    if (this._accentColor) this._accentColor.set(this.palette.accent || this.palette.primary || '#ffffff');

    // Reset base light colors to the new primary; onUpdate will tint toward accent as needed.
    if (this.ambientLight?.color) this.ambientLight.color.set(this.palette.primary || '#ffffff');
    if (this.directionalLight?.color) this.directionalLight.color.set(this.palette.primary || '#ffffff');
  }

  getConfigValue(key, defaultValue) {
    // Simple config getter - replace with proper implementation if needed
    return defaultValue;
  }

  _smooth(key, value, alpha = this._alpha) {
    // GUARD-FIX: Defensive guard in case onInit didn't run
    if (!this._ema) {
      this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
      this._alpha = 0.1;
    }
    this._ema[key] = this._ema[key] * (1 - alpha) + value * alpha;
    return this._ema[key];
  }

  onUpdate(dt, audioData) {
    // GUARD-FIX: Early return if not properly initialized
    if (!audioData || !this.ambientLight || !this.directionalLight) return;

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audioData.bass || 0));
    const mid = this._smooth('mid', Math.min(1, audioData.mid || 0));
    const treble = this._smooth('treble', Math.min(1, audioData.treble || 0));
    const loudness = this._smooth('loudness', Math.min(1, audioData.loudness || 0));

    // Amplified reactivity with dual-rate EMA
    const alphaAttack = 0.6;
    const alphaDecay = 0.2;

    // Update ambient light - AMPLIFIED response
    const targetAmbient = this.originalIntensities.ambient * (0.5 + loudness * 2.0);
    const currentAmbient = this.ambientLight.intensity;
    const ambientAlpha = (targetAmbient > currentAmbient) ? alphaAttack : alphaDecay;
    this.ambientLight.intensity = currentAmbient + (targetAmbient - currentAmbient) * ambientAlpha;
    this.ambientLight.intensity = THREE.MathUtils.clamp(this.ambientLight.intensity, 0.1, 3.0);

    // Update directional light - AMPLIFIED response
    const targetDirectional = this.originalIntensities.directional * (0.5 + mid * 2.0);
    const currentDirectional = this.directionalLight.intensity;
    const directionalAlpha = (targetDirectional > currentDirectional) ? alphaAttack : alphaDecay;
    this.directionalLight.intensity = currentDirectional + (targetDirectional - currentDirectional) * directionalAlpha;
    this.directionalLight.intensity = THREE.MathUtils.clamp(this.directionalLight.intensity, 0.3, 3.0);

    // Palette color tinting - accent color on mids
    const accentColor = this._accentColor || (this._accentColor = new THREE.Color(this.palette.accent));
    this.directionalLight.color.lerp(accentColor, mid * 0.5);

    // Subtle directional light movement
    const time = Date.now() * 0.001;
    this.directionalLight.position.x = 5 + Math.sin(time * 0.3) * 2;
    this.directionalLight.position.z = 5 + Math.cos(time * 0.2) * 2;

    // Update accent lights - AMPLIFIED response
    this.lightObjects.forEach((light, index) => {
      const originalIntensity = this.originalIntensities.accents[index];

      // Amplified frequency response
      let targetIntensity = originalIntensity;
      switch (index % 3) {
        case 0: targetIntensity = originalIntensity * (0.5 + bass * 2.0); break;
        case 1: targetIntensity = originalIntensity * (0.5 + mid * 2.0); break;
        case 2: targetIntensity = originalIntensity * (0.5 + treble * 2.0); break;
      }

      // Dual-rate EMA
      const currentIntensity = light.intensity;
      const intensityAlpha = (targetIntensity > currentIntensity) ? alphaAttack : alphaDecay;
      light.intensity = currentIntensity + (targetIntensity - currentIntensity) * intensityAlpha;
      light.intensity = THREE.MathUtils.clamp(light.intensity, 0.1, 3.0);

      // Subtle position animation
      const angle = (index / this.lightObjects.length) * Math.PI * 2 + time * 0.1;
      const radius = 8 + Math.sin(time * 0.5 + index) * 1;
      light.position.x = Math.cos(angle) * radius;
      light.position.z = Math.sin(angle) * radius;
      light.position.y = 3 + Math.sin(time * 0.3 + index) * 1.5;

      // Palette-based color - lerp to accent on audio
      const primaryColor = this._primaryColor || (this._primaryColor = new THREE.Color(this.palette.primary));
      light.color.copy(primaryColor).lerp(accentColor, loudness * 0.6);
    });
  }

  onDispose() {
    if (this.lights) {
      this.scene.remove(this.lights);

      // STAB-04: Clear singleton flag on dispose
      if (this.scene.userData.lightFieldInitialized) {
        this.scene.userData.lightFieldInitialized = false;
      }

      // No need to dispose lights specifically, but clean up references
      this.ambientLight = null;
      this.directionalLight = null;
      this.lightObjects = [];
      this.lights = null;
    }

    this._primaryColor = null;
    this._accentColor = null;
  }
}

export default LightField;
