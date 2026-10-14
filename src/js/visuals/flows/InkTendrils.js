import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class InkTendrils extends VisualLayer {
  constructor(ctx) {
    super(ctx);
    this.tendrils = [];
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.18;
    this.time = 0;
    this.opacityMultiplier = 1.0;
    this.turbulenceIntensity = 0.35;
    this.eggOrbPosition = new THREE.Vector3(0, 2, 0);
    this._tmpToEggOrb = new THREE.Vector3();
  }

  mount() {
    console.log('[InkTendrils] Starting mount');
    super.mount();

    const count = this.cfg.count || 4; // Balanced count
    // MP12: Convert Phase42 palette object to array for tendril cycling
    const palette = this.cfg.palette
      ? [this.cfg.palette.primary, this.cfg.palette.secondary, this.cfg.palette.accent]
      : ['#4a5568', '#718096'];
    
    // Create flowing tendrils using tube geometry
    for (let i = 0; i < count; i++) {
      const points = [];
      const segments = 24; // More segments for smoother curves
      
      // Create an imperfect, organic curve
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        // Add noise and imperfection to the angle
        const noise = Math.random() * 0.3 - 0.15;
        const angle = t * Math.PI * 2.0 + i * Math.PI / 3 + noise;
        
        // Natural radius variations for smooth curves
        const randomOffset = Math.random() * 1 - 0.5;
        const radius = 8 + 
          Math.sin(t * Math.PI * 1.7) * 3 + 
          Math.sin(t * Math.PI * 3.3) * 2 +
          randomOffset;
        
        // Natural vertical progression
        const yNoise = Math.random() * 1 - 0.5;
        const y = (t - 0.5) * 25 + Math.sin(t * Math.PI * 2.5) * 2 + yNoise;
        
        // Add slight random offsets to make it less perfect
        points.push(new THREE.Vector3(
          Math.sin(angle) * radius + Math.random() * 0.5 - 0.25,
          y,
          Math.cos(angle) * radius - 10 + Math.random() * 0.5 - 0.25
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.7);
      const geometry = new THREE.TubeGeometry(curve, 32, 0.4 + i * 0.15, 6, false); // Better resolution
      
      // Create smoother material with better shading
      const color = new THREE.Color(palette[i % palette.length]);
      // Use better material with subtle lighting
      const material = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        emissive: color,
        emissiveIntensity: 0.05,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        curve: curve,
        points: points,
        originalPoints: points.map(p => p.clone()), // Store original positions
        phase: i * Math.PI * 0.4 + Math.random() * Math.PI,
        flowSpeed: 0.08 + Math.random() * 0.05, // Very slow flow
        waveAmplitude: 3 + Math.random() * 2, // Gentle waves
        baseOpacity: 0.15
      };
      
      this.tendrils.push(mesh);
      this.group.add(mesh);
    }
    console.log('[InkTendrils] Added', this.tendrils.length, 'tendrils');

    // STAB-04: Removed duplicate lights - LightField provides scene lighting
    // Previously created: AmbientLight (0.4) + DirectionalLight (0.3)
    // Now relies on: LightField's AmbientLight (0.25) + DirectionalLight (1.25)

    console.log('[InkTendrils] Mount complete, group children:', this.group.children.length);
  }
  
  _s(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }
  
  update(audio, dt) {
    // Check if dt is valid
    if (!dt || dt === 0) {
      dt = 0.016; // Fallback to 60fps
    }
    
    this.time += dt;
    
    // EggOrb interaction with improved physics
    const eggOrbPosition = this.eggOrbPosition;
    const deadzone = 6.5; // Increased deadzone
    const falloff = 18.0; // Falloff distance
    const maxAccel = 0.015; // Max acceleration to prevent snap
    
    // Onset detection for breath effect
    const onset = audio?.onset || 0;
    const breathEffect = onset > 0.03;
    
    const b = this._s('bass', Math.min(1, audio?.bass ?? 0));
    const m = this._s('mid', Math.min(1, audio?.mid ?? 0));
    const t = this._s('treble', Math.min(1, audio?.treble ?? 0));
    const l = this._s('loud', Math.min(1, audio?.loudness ?? 0));
    const turbulenceAmp = 1.0 + this.turbulenceIntensity * (0.65 + m * 0.35);
    
    // Animate each tendril with simpler motion (no geometry recreation)
    this.tendrils.forEach((tendril, index) => {
      const userData = tendril.userData;
      
      // Natural, smooth undulating motion
      const waveTime = this.time * userData.flowSpeed;
      
      // Base tentacle motion
      let baseX = Math.sin(waveTime + userData.phase) * userData.waveAmplitude * turbulenceAmp;
      let baseY = Math.sin(waveTime * 0.7 + userData.phase * 1.2) * userData.waveAmplitude * 0.6 * turbulenceAmp;
      let baseZ = Math.cos(waveTime * 0.5 + userData.phase * 0.8) * userData.waveAmplitude * 0.4 * turbulenceAmp;
      
      // Improved EggOrb interaction with smoothstep
      const toEggOrb = this._tmpToEggOrb;
      toEggOrb.set(
        eggOrbPosition.x - baseX,
        eggOrbPosition.y - baseY,
        eggOrbPosition.z - baseZ
      );
      const distance = toEggOrb.length();
      
      // Smoothstep force calculation
      let force = 0;
      if (distance < deadzone) {
        // Repulsion zone
        force = -THREE.MathUtils.smoothstep(distance, 0, deadzone) * 0.5;
      } else if (distance < falloff) {
        // Attraction zone with smoothstep
        force = THREE.MathUtils.smoothstep(distance, deadzone, falloff);
      }
      
      // Apply breath effect (brief repulsion on onset)
      if (breathEffect) {
        force = -0.3; // Brief push away
      }
      
      // Apply force with clamped acceleration
      if (Math.abs(force) > 0.01) {
        toEggOrb.normalize();
        const accel = THREE.MathUtils.clamp(force * 0.02, -maxAccel, maxAccel);
        toEggOrb.multiplyScalar(accel);
      } else {
        toEggOrb.set(0, 0, 0);
      }
      
      // Update tendril velocity (stored in userData)
      if (!userData.velocity) {
        userData.velocity = new THREE.Vector3();
      }
      userData.velocity.add(toEggOrb);
      userData.velocity.multiplyScalar(0.95); // Damping
      
      tendril.position.x = baseX + userData.velocity.x;
      tendril.position.y = baseY + userData.velocity.y;
      tendril.position.z = baseZ + userData.velocity.z;
      
      // Subtle rotation for natural smoke-like movement
      tendril.rotation.x = Math.sin(waveTime * 0.3 + userData.phase) * 0.1;
      tendril.rotation.y = Math.sin(waveTime * 0.4 + userData.phase * 1.5) * (0.12 + this.turbulenceIntensity * 0.08);
      tendril.rotation.z = Math.cos(waveTime * 0.2 + userData.phase * 2) * 0.08;
      
      // Gentle scale pulsing
      const scaleBase = 1 + Math.sin(waveTime * 0.5 + userData.phase) * 0.05;
      const scaleAudio = 1 + l * 0.1 + b * 0.05;
      tendril.scale.set(scaleBase * scaleAudio, 1, scaleBase * scaleAudio);
      
      // Audio reactive opacity
      const targetOpacity = (userData.baseOpacity + l * 0.1 + b * 0.05) * this.opacityMultiplier;
      tendril.material.opacity += (targetOpacity - tendril.material.opacity) * 0.18;
    });
    // Lights removed for performance
    
    // Extremely subtle group swaying
    this.group.position.x = Math.sin(this.time * 0.03) * 0.5;
    this.group.position.y = Math.cos(this.time * 0.02) * 0.3;
    this.group.rotation.y = Math.sin(this.time * 0.04) * 0.02;
  }

  setOpacity(opacity = 1.0) {
    this.opacityMultiplier = THREE.MathUtils.clamp(opacity, 0, 1.4);
    if (this.group) {
      this.group.visible = this.opacityMultiplier > 0.01;
    }
  }

  setTurbulence(intensity = 0.35) {
    this.turbulenceIntensity = THREE.MathUtils.clamp(intensity, 0, 1.2);
  }
  
  unmount() {
    this.tendrils.forEach(tendril => {
      if (tendril.geometry) tendril.geometry.dispose();
      if (tendril.material) tendril.material.dispose();
    });
    this.tendrils = [];
    super.unmount();
  }
}
