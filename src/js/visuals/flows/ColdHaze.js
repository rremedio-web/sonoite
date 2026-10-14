import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class ColdHaze extends VisualLayer {
  mount() {
    this.idleAmp = 0.05;            // Baseline drift amplitude
    this.idlePeriod = 15;           // Drift cycle (seconds)

    console.log('[ColdHaze] Starting mount'); // Debug: Confirm mount
    if (!this.group) {
      this.group = new THREE.Group();
    }
    super.mount();

    // MP12: Use Phase42 palette object style
    const color = this.cfg.palette?.primary || '#56667a';

    // Create gradient texture with soft edges
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Create vignette effect to hide edges
    const centerX = 128;
    const centerY = 128;
    const maxRadius = 128;
    
    // Radial gradient from center
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, color + '60');  // Center less opaque
    gradient.addColorStop(0.3, color + '40');
    gradient.addColorStop(0.6, color + '20');
    gradient.addColorStop(0.8, color + '10');
    gradient.addColorStop(1, color + '00');  // Edges fully transparent
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);

    // Material with normal blending for MORE VISIBLE effect
    this.mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending, // Back to additive for glow effect
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Create two circular layers for better performance
    this.layers = [];
    for (let i = 0; i < 2; i++) {
      // Use circle geometry to avoid rectangular borders
      const geo = new THREE.CircleGeometry(20 - i * 3, 24); // Less vertices
      const mesh = new THREE.Mesh(geo, this.mat.clone());
      mesh.position.set(0, 0, -6 - i * 2); // Closer z-position, staggered
      mesh.material.opacity = 0.18 - i * 0.04;
      mesh.scale.x = 2.0; // Stretch horizontally for oval shape
      mesh.scale.y = 1.5; // Less stretch vertically
      mesh.renderOrder = -i; // Back-to-front rendering
      this.group.add(mesh);
      this.layers.push(mesh);
    }

    // Initialize smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.18;

    // TRACK5-VOID: Phase system
    this.currentPhase = 'VOID';
    this.voidCenter = new THREE.Vector3(0, 2, 0);
    this.particleVelocities = [];
    this.layers.forEach(() => {
      this.particleVelocities.push(new THREE.Vector3(0, 0, 0));
    });

    this.phaseConfigs = {
      VOID: { opacity: 0.16, gravity: 0.0004, drift: 0.45, scale: 0.88, alphaDrift: 0.05 },
      AWAKENING: { opacity: 0.28, gravity: 0.0008, drift: 0.78, scale: 0.96, alphaDrift: 0.07 },
      WANTING: { opacity: 0.38, gravity: 0.0017, drift: 1.16, scale: 1.04, alphaDrift: 0.10 },
      RELEASE: { opacity: 0.20, gravity: 0.0006, drift: 0.64, scale: 0.92, alphaDrift: 0.06 },
      ERASURE: { opacity: 0.06, gravity: 0.0, drift: 0.25, scale: 0.64, alphaDrift: 0.02 }
    };

    this.phaseTargets = {
      opacity: 0.16, gravity: 0.0004, drift: 0.45, scale: 0.88, alphaDrift: 0.05
    };
    this.phaseTransitionAlpha = 0.02;
    this.densityMultiplier = 1.0;

    console.log('[ColdHaze] Group added to scene:', this.group.parent);
    console.log('[ColdHaze] Created', this.layers.length, 'layers with phase system');
  }

  /**
   * TRACK5-VOID: Set phase for void choreography
   */
  setPhase(phase) {
    if (!this.phaseConfigs[phase]) {
      console.warn(`[ColdHaze] Unknown phase: ${phase}`);
      return;
    }
    console.log(`[ColdHaze] Phase → ${phase}`);
    this.currentPhase = phase;
    const cfg = this.phaseConfigs[phase];
    this.phaseTargets.opacity = cfg.opacity;
    this.phaseTargets.gravity = cfg.gravity;
    this.phaseTargets.drift = cfg.drift;
    this.phaseTargets.scale = cfg.scale;
    this.phaseTargets.alphaDrift = cfg.alphaDrift;
  }

  setConfig(cfg) {
    super.setConfig(cfg);
    this.cfg = cfg;
    this.idleAmp = cfg.idleAmp || this.idleAmp;
  }

  _s(k, v, a = this._alpha) { 
    this._ema[k] = this._ema[k] * (1 - a) + v * a; 
    return this._ema[k]; 
  }

  update(audio, dt) {
    const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches || window.SONOITE_REDUCED_MOTION;
    const idleEnabled = window.SONOITE_IDLE_MOTION && !prefersReduced;

    const time = performance.now() * 0.001;
    const phaseConfig = this.phaseConfigs[this.currentPhase] || this.phaseConfigs.VOID;
    const driftAmp = prefersReduced ? this.idleAmp * 0.5 : this.idleAmp * phaseConfig.drift;

    const b = this._s('bass', Math.min(1, audio?.bass ?? 0));
    const m = this._s('mid', Math.min(1, audio?.mid ?? 0));
    const l = this._s('loud', Math.min(1, audio?.loudness ?? 0));

    const alphaAttack = 0.45;
    const alphaDecay = 0.14;

    // Bass-reactive density
    const targetDensity = 1.0 + b * 0.18;
    this.densityMultiplier += (targetDensity - this.densityMultiplier) * 0.1;

    // Smooth phase target interpolation
    this.phaseTargets.opacity += (phaseConfig.opacity - this.phaseTargets.opacity) * this.phaseTransitionAlpha;
    this.phaseTargets.gravity += (phaseConfig.gravity - this.phaseTargets.gravity) * this.phaseTransitionAlpha;
    this.phaseTargets.drift += (phaseConfig.drift - this.phaseTargets.drift) * this.phaseTransitionAlpha;
    this.phaseTargets.scale += (phaseConfig.scale - this.phaseTargets.scale) * this.phaseTransitionAlpha;

    // Update each layer
    this.layers.forEach((mesh, i) => {
      const velocity = this.particleVelocities[i];

      // TRACK5-VOID: Void gravity pull
      if (this.phaseTargets.gravity > 0.0001) {
        const toVoid = new THREE.Vector3().subVectors(this.voidCenter, mesh.position);
        const distance = toVoid.length();
        const gravityStrength = this.phaseTargets.gravity / Math.max(distance * distance, 0.5);
        toVoid.normalize().multiplyScalar(gravityStrength);
        velocity.add(toVoid);
        velocity.multiplyScalar(0.98);
        mesh.position.add(velocity);
      }

      // Phase-modulated drift
      if (idleEnabled) {
        const driftIntensity = this.phaseTargets.alphaDrift || 0.1;
        mesh.position.x += Math.sin(time * 0.3 + i * 0.5) * (8 * driftAmp) * dt * driftIntensity;
        mesh.position.y += Math.sin(time * 0.25 + i * 0.5) * (5 * driftAmp) * dt * driftIntensity + m * 1.5 * dt;
        mesh.rotation.z = Math.sin(time * 0.2 + i * 0.5) * 0.15 * driftIntensity;
      }

      // Phase-based opacity with bass density
      const baseOpacity = (0.25 - i * 0.05) * this.phaseTargets.opacity;
      const targetOpacity = baseOpacity * (1 + l * 2.0) * this.densityMultiplier;
      const currentOpacity = mesh.material.opacity;
      const opacityAlpha = (targetOpacity > currentOpacity) ? alphaAttack : alphaDecay;
      mesh.material.opacity = currentOpacity + (targetOpacity - currentOpacity) * opacityAlpha;
      mesh.material.opacity = THREE.MathUtils.clamp(mesh.material.opacity, baseOpacity * 0.35, 0.38);
    });

    // Phase-based group scale
    const idleBreath = idleEnabled ? Math.sin(time * 0.8) * 0.08 : 0;
    const targetScale = this.phaseTargets.scale * (1.0 + idleBreath + l * 0.45);
    const currentScale = this.group.scale.x;
    const scaleAlpha = (targetScale > currentScale) ? alphaAttack : alphaDecay;
    const newScale = currentScale + (targetScale - currentScale) * scaleAlpha;
    this.group.scale.setScalar(THREE.MathUtils.clamp(newScale, 0.5, 1.8));
  }

  unmount() {
    if (this.layers) {
      this.layers.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (mesh.material.map) mesh.material.map.dispose();
          mesh.material.dispose();
        }
      });
      this.layers = [];
    }
    super.unmount();
  }
}
