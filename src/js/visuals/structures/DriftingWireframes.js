import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

/**
 * DriftingWireframes - Legacy-inspired geometric wireframes with clamped reactivity
 * Integrates legacy AbstractConsciousness aesthetics as a controlled journey element
 */
export class DriftingWireframes extends VisualLayer {
  mount() {
    super.mount();
    
    // Configuration
    this.count = this.cfg.count || 5; // Number of wireframe objects
    this.baseScale = this.cfg.baseScale || 1.5;
    this.driftSpeed = this.cfg.driftSpeed || 0.02;
    this.rotationSpeed = this.cfg.rotationSpeed || 0.01;
    
    // Color palette
    const primary = this.ctx?.palette?.primary || '#0a0a12';
    const accent = this.ctx?.palette?.accent || '#d7d7e0';
    
    // Store wireframe objects
    this.wireframes = [];
    
    // Create geometries pool for variety
    const geometries = [
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.BoxGeometry(1, 1, 1),
    ];
    
    // Create wireframe objects
    for (let i = 0; i < this.count; i++) {
      // Pick random geometry
      const geo = geometries[Math.floor(Math.random() * geometries.length)].clone();
      
      // Create wireframe material with subtle transparency
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? accent : primary,
        wireframe: true,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      
      // Random initial position in a sphere around origin
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 3 + Math.random() * 5;
      
      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        (Math.random() - 0.5) * 4,
        radius * Math.sin(phi) * Math.sin(theta)
      );
      
      // Random scale
      const scale = this.baseScale * (0.5 + Math.random() * 1.0);
      mesh.scale.setScalar(scale);
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Store original values for animation
      mesh.userData = {
        basePosition: mesh.position.clone(),
        baseScale: scale,
        baseOpacity: mat.opacity,
        rotationSpeed: {
          x: (Math.random() - 0.5) * this.rotationSpeed,
          y: (Math.random() - 0.5) * this.rotationSpeed,
          z: (Math.random() - 0.5) * this.rotationSpeed
        },
        driftOffset: Math.random() * Math.PI * 2,
        pulseOffset: Math.random() * Math.PI * 2,
        shimmerSpeed: 0.5 + Math.random() * 1.5
      };
      
      this.group.add(mesh);
      this.wireframes.push(mesh);
    }
    
    // Animation state with smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loudness: 0 };
    this._alpha = 0.15; // Smoothing factor
    this._time = 0;
    this.opacityMultiplier = 1.0;
  }
  
  setConfig(cfg) {
    super.setConfig(cfg);
    // Update runtime config if needed
    if (cfg.driftSpeed !== undefined) this.driftSpeed = cfg.driftSpeed;
    if (cfg.rotationSpeed !== undefined) this.rotationSpeed = cfg.rotationSpeed;
  }
  
  // Smooth exponential moving average
  _smooth(key, value, alpha = this._alpha) {
    this._ema[key] = this._ema[key] * (1 - alpha) + value * alpha;
    return this._ema[key];
  }
  
  update(audio, dt) {
    // Smooth audio values with clamping
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loudness = this._smooth('loudness', Math.min(1, audio?.loudness ?? 0));
    
    this._time += dt;
    
    // Update each wireframe
    this.wireframes.forEach((mesh, i) => {
      const data = mesh.userData;
      
      // CLAMPED REACTIVITY - all effects are subtle
      
      // 1. Scale pulse with bass (max +20% scale)
      const scalePulse = 1.0 + bass * 0.2 * Math.sin(this._time * 2 + data.pulseOffset);
      mesh.scale.setScalar(data.baseScale * scalePulse);
      
      // 2. Gentle drift movement (max ±1 unit)
      const driftX = Math.sin(this._time * this.driftSpeed + data.driftOffset) * 1.0;
      const driftY = Math.cos(this._time * this.driftSpeed * 0.7 + data.driftOffset) * 0.5;
      const driftZ = Math.sin(this._time * this.driftSpeed * 0.5 + data.driftOffset + Math.PI) * 1.0;
      
      mesh.position.set(
        data.basePosition.x + driftX,
        data.basePosition.y + driftY + mid * 0.3, // Subtle lift with mids
        data.basePosition.z + driftZ
      );
      
      // 3. Rotation with treble influence (clamped speed)
      const rotSpeedMod = 1.0 + treble * 0.5; // Max 50% speed increase
      mesh.rotation.x += data.rotationSpeed.x * rotSpeedMod * dt * 60;
      mesh.rotation.y += data.rotationSpeed.y * rotSpeedMod * dt * 60;
      mesh.rotation.z += data.rotationSpeed.z * rotSpeedMod * dt * 60;
      
      // 4. Opacity shimmer with loudness (20-100% opacity range)
      const shimmer = 0.5 + 0.5 * Math.sin(this._time * data.shimmerSpeed);
      const targetOpacity = Math.max(0.2, Math.min(1.0, 
        (data.baseOpacity + loudness * 0.3 * shimmer) * this.opacityMultiplier
      ));
      
      // Smooth opacity transition
      const currentOpacity = mesh.material.opacity;
      mesh.material.opacity = currentOpacity + (targetOpacity - currentOpacity) * 0.1;
      
      // 5. Subtle color shift with audio (optional)
      if (this.cfg.enableColorShift) {
        const hue = (this._time * 0.05 + i * 0.1 + bass * 0.1) % 1;
        mesh.material.color.setHSL(hue, 0.3, 0.5 + loudness * 0.2);
      }
    });
  }

  setOpacity(opacity = 1.0) {
    this.opacityMultiplier = THREE.MathUtils.clamp(opacity, 0, 1.25);
    if (this.group) {
      this.group.visible = this.opacityMultiplier > 0.01;
    }
  }
  
  unmount() {
    // Clean up geometries and materials
    this.wireframes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.wireframes = [];
    super.unmount();
  }
}
