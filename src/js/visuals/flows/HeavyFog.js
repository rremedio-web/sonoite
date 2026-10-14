import * as THREE from 'three';
import { VisualLayer } from '../base/VisualLayer.js';
import { createVolumetricFogMaterial } from '../materials/VolumetricFogMaterial.js';
import { dispose3D } from '../../utils/dispose3d.js';

export class HeavyFog extends VisualLayer {
  onInit(){
    // MP-LAYER-GUARDS: Defensive THREE guard
    const THREE = this.ctx?.THREE || window.THREE;
    if (!THREE) {
      console.error('[HeavyFog] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    this.idleBreathAmp = 0.03;      // Baseline breathing scale
    this.idleBreathPeriod = 18;     // seconds

    // MP-MEM-02: Ensure all fog meshes live under layer.group for unified disposal.
    // Previously this layer added `planes` directly to the scene, which bypassed dispose3D(layer.group)
    // in the track-switch cleanup path and leaked ~15 PlaneGeometries per visit.
    this.group = new THREE.Group();
    this.planes = this.group; // Alias for readability in update()
    this.materials = [];

    // MP12: Phase42 Track 2 parameters: density 0.7, opacity 0.3, palette #0a0a0a/#1a1a1a
    const fogColor = this.cfg.palette?.primary || '#0a0a0a';
    const count = Math.max(10, Math.min(this.cfg.count ?? 15, 20));  // Optimized to 15 planes

    for (let i = 0; i < count; i++){
      const t = i / (count - 1);
      
      // Non-linear depth for natural clustering near viewer
      const depth = Math.pow(t, 1.3) * 35 - 5;  // Exponent 1.3 clusters more upfront
      
      // Randomization for variety
      const offsetX = (Math.random() - 0.5) * 6;
      const offsetY = (Math.random() - 0.5) * 3;
      const rotX = (Math.random() - 0.5) * 0.15;
      const rotY = (Math.random() - 0.5) * 0.1;
      
      // Vary scale for irregular shapes
      const scaleX = 0.8 + Math.random() * 0.4;
      const scaleY = 0.8 + Math.random() * 0.4;
      
      // Phase42 Track 2 specifies opacity 0.3
      const baseOpacity = this.cfg.opacity ?? 0.3;  // Phase42 spec
      // PHASE-0.4-FIX: Use darkMode for Nocturne aesthetic (fog occludes instead of glows)
      const darkMode = this.cfg.darkMode ?? true;  // Default to dark for Sonoite aesthetic
      const mat = createVolumetricFogMaterial({
        color: fogColor,
        opacity: baseOpacity * (0.7 + t * 0.3),  // Fade with distance
        darkMode
      });
      this.materials.push(mat);

      const geo = new THREE.PlaneGeometry(40 * scaleX, 24 * scaleY, 1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(offsetX, offsetY - 4, -depth);
      mesh.rotation.set(rotX, rotY, 0);
      mesh.renderOrder = -count + i;  // Back-to-front rendering
      this.planes.add(mesh);
    }
    this.scene.add(this.group);

    // Simple EMA smoothing for audio bands
    this._ema = { bass:0, mid:0, treble:0, loud:0 };
    this._alpha = 0.2; // smoothing factor

    // Track window size for resolution updates
    this._updateResolution();
    this._resizeHandler = () => this._updateResolution();
    window.addEventListener('resize', this._resizeHandler);
  }

  _updateResolution() {
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.materials.forEach(mat => {
      mat.uniforms.uResolution.value.copy(resolution);
    });
  }


  _smooth(k, v, a=this._alpha){ 
    this._ema[k] = this._ema[k]*(1-a) + v*a; 
    return this._ema[k]; 
  }

  onUpdate(dt, audioData){
    // MP-LAYER-GUARDS: Early return if not active or mounted
    if (!this.isActive?.() || !this.isMounted?.()) return;

    const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches || window.SONOITE_REDUCED_MOTION;
    const idleEnabled = window.SONOITE_IDLE_MOTION && !prefersReduced;
    const time = performance.now() * 0.001;

    const audio = audioData;
    const bass   = this._smooth('bass',   Math.min(1, audio?.bass ?? 0));
    const mid    = this._smooth('mid',    Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loud   = this._smooth('loud',   Math.min(1, audio?.loudness ?? 0));

    // Amplified reactivity with dual-rate EMA
    const alphaAttack = 0.6;  // Fast attack for punchy beats
    const alphaDecay = 0.2;   // Slow decay for smooth sustain

    for (const m of this.materials){
      // MP-LAYER-GUARDS: Guard uniform writes
      if (m?.uniforms?.uTime) m.uniforms.uTime.value += dt;

      // PHASE-0.5-FIX: Tamed density - gentler range to prevent bloom blowout
      // Was: 0.5 + loud * 2.0 (0.5-2.5), now: 0.45 + loud * 0.35 (0.45-0.8)
      if (m?.uniforms?.uDensity) {
        const targetDensity = 0.45 + loud * 0.35;
        const currentDensity = m.uniforms.uDensity.value;
        const densityAlpha = (targetDensity > currentDensity) ? alphaAttack : alphaDecay;
        m.uniforms.uDensity.value = currentDensity + (targetDensity - currentDensity) * densityAlpha;
        m.uniforms.uDensity.value = THREE.MathUtils.clamp(m.uniforms.uDensity.value, 0.45, 0.8);
      }

      // PHASE-0.5-FIX: Tamed turbulence - subtle surges on bass, not explosions
      // Was: 0.5 + bass * 2.0 (0.5-2.5), now: 0.15 + bass * 0.2 (0.15-0.35)
      if (m?.uniforms?.uTurbAmp) {
        const targetTurb = 0.15 + bass * 0.2;
        const currentTurb = m.uniforms.uTurbAmp.value;
        const turbAlpha = (targetTurb > currentTurb) ? alphaAttack : alphaDecay;
        m.uniforms.uTurbAmp.value = currentTurb + (targetTurb - currentTurb) * turbAlpha;
        m.uniforms.uTurbAmp.value = THREE.MathUtils.clamp(m.uniforms.uTurbAmp.value, 0.15, 0.35);
      }

      // PHASE-0.5-FIX: Tamed scroll - gentle drift, not racing
      // Was: 0.05 + mid * 1.5 (0.05-1.55), now: 0.08 + mid * 0.12 (0.08-0.2)
      if (m?.uniforms?.uScrollY) {
        const targetScroll = 0.08 + mid * 0.12;
        const currentScroll = m.uniforms.uScrollY.value;
        const scrollAlpha = (targetScroll > currentScroll) ? alphaAttack : alphaDecay;
        m.uniforms.uScrollY.value = currentScroll + (targetScroll - currentScroll) * scrollAlpha;
        m.uniforms.uScrollY.value = THREE.MathUtils.clamp(m.uniforms.uScrollY.value, 0.08, 0.2);
      }

      // Grain remains subtle (no amplification needed)
      if (m?.uniforms?.uGrain) m.uniforms.uGrain.value = 0.02 + treble * 0.03;
    }

    // Idle breathing scale with amplified audio
    if (idleEnabled) {
      const amp = prefersReduced ? this.idleBreathAmp * 0.5 : this.idleBreathAmp;
      this.planes.scale.setScalar(1.0 + Math.sin(time * (2 * Math.PI / this.idleBreathPeriod)) * amp + loud * 0.1);
    } else {
      this.planes.scale.setScalar(1.0 + loud * 0.1);
    }
  }
  
  onDispose() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    // MP-MEM-02: Belt-and-suspenders disposal.
    // Track switching already calls dispose3D(layer.group) before layer.dispose(),
    // but we also dispose here to ensure correctness if the layer is ever disposed directly.
    if (this.group) {
      if (this.scene) {
        this.scene.remove(this.group);
      }
      dispose3D(this.group);
      this.group = null;
    }

    this.planes = null;
    this.materials = [];
  }
}
