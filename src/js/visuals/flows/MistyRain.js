/**
 * Misty Rain Flow - Hazy Rainfall Effect
 * Camera-facing streak billboards creating soft rain atmosphere
 * @module MistyRain
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { createStreakBillboardMaterial } from '../materials/StreakBillboardMaterial.js';

export class MistyRain extends VisualLayer {
  mount() {
    super.mount();

    // MP-STR-02: Reduced-motion halves count and fall speed
    const baseCount = this.cfg.count ?? 1200;
    const N = window.SONOITE_REDUCED_MOTION
      ? Math.floor(baseCount / 2)
      : Math.max(800, Math.min(baseCount, 4000));

    // MP12: Use Phase42 palette object style (accent for rain)
    const color = this.cfg.palette?.accent || this.ctx?.palette?.accent || '#aeb8c7';

    // MP-STR-01: Use InstancedMesh with PlaneGeometry for proper billboarded streaks
    // Create base geometry (small quad for each streak)
    const baseGeo = new THREE.PlaneGeometry(0.15, 0.6); // Elongated vertical streak

    // Create instanced attributes
    const speed = new Float32Array(N);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const offset = new Float32Array(N * 3); // Initial position offset

    // Initialize per-instance attributes
    for (let i = 0; i < N; i++) {
      // Initial position offset (spread across scene)
      offset[i * 3 + 0] = (Math.random() - 0.5) * 20.0; // X spread
      offset[i * 3 + 1] = (Math.random() * 30.0 - 15.0); // Y range
      offset[i * 3 + 2] = -5.0 - Math.random() * 8.0;   // Z depth

      // MP-STR-02: Reduced-motion halves fall speed
      const baseSpeed = 0.7 + Math.random() * 0.8;
      speed[i] = window.SONOITE_REDUCED_MOTION ? baseSpeed * 0.5 : baseSpeed;

      size[i] = 0.9 + Math.random() * 1.5;     // size variance
      seed[i] = Math.random() * 1000.0;        // twinkle variation
    }

    // MP-STR-01: Add instanced attributes to geometry
    baseGeo.setAttribute('aSpeed',  new THREE.InstancedBufferAttribute(speed, 1));
    baseGeo.setAttribute('aSize',   new THREE.InstancedBufferAttribute(size, 1));
    baseGeo.setAttribute('aSeed',   new THREE.InstancedBufferAttribute(seed, 1));
    baseGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offset, 3));

    // Create material and instanced mesh
    this.mat = createStreakBillboardMaterial({ color, opacity: 0.22, instanced: true });
    this.mesh = new THREE.InstancedMesh(baseGeo, this.mat, N);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);

    // Store instance count
    this.instanceCount = N;

    // Animation state with EMA smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    // MP-STR-02: EMA alpha for smooth reactivity
    this._alpha = 0.2;

    if (window.SONOITE_DEBUG) {
      console.log('[MistyRain] Mounted with', N, 'instanced streaks (reduced-motion:', !!window.SONOITE_REDUCED_MOTION, ')');
    }
  }
  
  setConfig(cfg) { 
    super.setConfig(cfg);
    // Could update particle count or color here if needed
  }

  _s(k, v, a = this._alpha) { 
    this._ema[k] = this._ema[k] * (1 - a) + v * a; 
    return this._ema[k]; 
  }

  update(audio, dt) {
    const b = this._s('bass',   Math.min(1, audio?.bass ?? 0));
    const m = this._s('mid',    Math.min(1, audio?.mid ?? 0));
    const t = this._s('treble', Math.min(1, audio?.treble ?? 0));
    const l = this._s('loud',   Math.min(1, audio?.loudness ?? 0));

    const u = this.mat.uniforms;
    
    // Time progression - mids control fall rate
    u.uTime.value += dt * (0.7 + m * 0.6);
    
    // Treble adds subtle sparkle/twinkle
    u.uTwinkle.value = 0.04 + t * 0.05;
    
    // Loudness stretches the rain streaks
    u.uStretch.value = 1.5 + l * 0.5;
    
    // Optional: bass could affect opacity or size
    // u.uOpacity.value = 0.22 + b * 0.08;
  }
  
  unmount() {
    // MP-STR-01: Dispose instanced mesh
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mat.dispose();
    }
    super.unmount();
  }
}