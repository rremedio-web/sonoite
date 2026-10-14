import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { createEtherealGlowMaterial } from '../materials/EtherealGlowMaterial.js';
import { createWireBloomMaterial } from '../materials/WireBloomMaterial.js';
import { addBarycentric } from '../geom/addBarycentric.js';

export class EggOrb extends VisualLayer {
  mount() {
    // MP-LAYER-GUARDS: Defensive THREE guard
    const THREE = this.ctx?.THREE || window.THREE;
    if (!THREE) {
      console.error('[EggOrb] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    super.mount();
    const accent = this.ctx?.palette?.accent || '#d7d7e0';

    // MAT-EGG-01: Accept materialProps from config
    const matProps = this.cfg.materialProps || {};
    // CIN-ORB defaults tuned for foggy crystal
    const ior = matProps.ior || 1.4;
    const transmission = matProps.transmission || 0.9;
    const thickness = matProps.thickness || 0.5;
    const emissiveColor = matProps.emissiveColor || accent;

    // Deterministic PRNG seed per session for repeatable motion
    this.seed = Math.floor(Math.random() * 1000000);
    this.prng = this.mulberry32(this.seed);

    // Determine LOD based on device tier
    this.lod = this.getDeviceLOD();

    // Inner glow egg with dynamic subdivisions
    const innerSubdivs = this.lod === 1 ? 16 : this.lod === 2 ? 24 : 32;
    const innerGeo = new THREE.SphereGeometry(1.0, innerSubdivs, innerSubdivs);
    innerGeo.scale(1.0, 1.45, 1.0); // Base egg shape
    this.innerMat = createEtherealGlowMaterial({
      opacity: 0.85,
      accent,
      baseKelvin: 4000,
      // MAT-EGG-01: Pass foggy crystal params
      transmission,
      thickness,
      ior
    });
    this.inner = new THREE.Mesh(innerGeo, this.innerMat);
    this.inner.position.y = 2.0;
    this.group.add(this.inner);

    // Outer shell with barycentric wireframe
    const shellDetail = this.lod === 1 ? 1 : this.lod === 2 ? 2 : 3;
    const shellGeo = new THREE.IcosahedronGeometry(1.4, shellDetail);
    addBarycentric(shellGeo); // Add barycentric coordinates for analytic wireframe

    this.shellMat = createWireBloomMaterial({
      color: accent,
      opacity: 0.6,
      thickness: 1.2,
      fadeNear: 5.0,
      fadeFar: 30.0,
      // MAT-EGG-01: Pass emissive color for bass reactivity
      emissiveColor
    });
    this.shell = new THREE.Mesh(shellGeo, this.shellMat);
    this.shell.position.y = 2.0;
    this.group.add(this.shell);

    // Animation state with deterministic values
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0, centroid: 0 };
    this._alpha = 0.2;
    this._spikeBase = this.cfg.spikeBase ?? 0.03;
    this._spikeAmp = this.cfg.spikeAmp ?? 0.08;
    this._time = 0;
    
    // Deterministic rotation speeds using golden ratio for organic feel
    const phi = 1.618033988749;
    this.rotationSpeeds = { 
      x: 0.05 / phi, 
      y: 0.03, 
      z: 0.07 * phi 
    };
    
    // Perlin noise phases for bobbing
    this.bobPhases = {
      x: this.prng() * Math.PI * 2,
      y: this.prng() * Math.PI * 2,
      z: this.prng() * Math.PI * 2
    };
    
    // Store base values
    this.baseColor = new THREE.Color(accent);
    this.baseEccentricity = 1.45;

    // GUIDE-FIX-2: Shell sync options
    this.syncShell = this.cfg.syncShell !== false;  // Default: true (synced)
    this.shellEnabled = this.cfg.shellEnabled !== false;  // Default: true

    // ANIM-EGG-01: Rotation state machine
    this.rotation = {
      active: false,           // Is rotation currently active?
      speed: 0,                // Current rotation speed (radians/sec)
      targetSpeed: 0,          // Target rotation speed
      axis: new THREE.Vector3(0, 1, 0), // Rotation axis (default: Y-up)
      easeSpeed: 0.05,         // How quickly speed changes (0-1)
      elapsed: 0               // Time elapsed in current spin
    };

    // ANIM-EGG-02: Breathing animation (position drift only, NO rotation)
    this.breathing = {
      enabled: this.cfg.breathingEnabled !== false, // Default: true
      rate: this.cfg.breathingRate || 0.08,  // Breathing frequency (Hz)
      amplitude: this.cfg.breathingAmplitude || 0.12, // Vertical drift (meters)
      phase: 0,                // Current breathing phase
      // P2-LUNG: Visual scale breathing (cosmic inhale/exhale)
      scaleEnabled: this.cfg.breathingScaleEnabled !== false, // Default: true
      scaleAmplitude: this.cfg.breathingScaleAmplitude || 0.06 // 6% scale change
    };
  }

  setConfig(cfg) {
    super.setConfig(cfg);
    if (cfg.spikeBase !== undefined) this._spikeBase = cfg.spikeBase;
    if (cfg.spikeAmp !== undefined) this._spikeAmp = cfg.spikeAmp;
    if (cfg.lod !== undefined) this.lod = cfg.lod;
    // GUIDE-FIX-2: Shell control
    if (cfg.syncShell !== undefined) this.syncShell = cfg.syncShell;
    if (cfg.shellEnabled !== undefined) this.shellEnabled = cfg.shellEnabled;
    // ANIM-EGG-03: Breathing control
    if (cfg.breathingEnabled !== undefined) this.breathing.enabled = cfg.breathingEnabled;
    if (cfg.breathingRate !== undefined) this.breathing.rate = cfg.breathingRate;
    if (cfg.breathingAmplitude !== undefined) this.breathing.amplitude = cfg.breathingAmplitude;
    // P2-LUNG: Scale breathing control
    if (cfg.breathingScaleEnabled !== undefined) this.breathing.scaleEnabled = cfg.breathingScaleEnabled;
    if (cfg.breathingScaleAmplitude !== undefined) this.breathing.scaleAmplitude = cfg.breathingScaleAmplitude;
  }

  /**
   * ANIM-EGG-04: Trigger rotation with easing
   * @param {Object} params - {speed, axis, duration, easing}
   */
  spin(params = {}) {
    const speed = params.speed || 0.5; // Default: slow rotation
    const axis = params.axis || 'y';   // x, y, z, or [x,y,z]
    const duration = params.duration || null; // If set, auto-stop after duration

    // Parse axis
    if (typeof axis === 'string') {
      this.rotation.axis.set(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );
    } else if (Array.isArray(axis)) {
      this.rotation.axis.set(axis[0] || 0, axis[1] || 0, axis[2] || 0);
      this.rotation.axis.normalize();
    }

    // Set target speed
    this.rotation.targetSpeed = speed;
    this.rotation.active = true;
    this.rotation.elapsed = 0;
    this.rotation.duration = duration;

    // Easing configuration
    this.rotation.easeSpeed = params.easeSpeed || 0.05; // Ease-in speed

    if (window.SONOITE_DEBUG) {
      console.log(`[EggOrb] Spin triggered: speed=${speed.toFixed(2)}, axis=${axis}, duration=${duration || 'infinite'}`);
    }
  }

  /**
   * ANIM-EGG-05: Stop rotation with ease-out
   * @param {Number} easeOutDuration - Time to decelerate (seconds)
   */
  stopSpin(easeOutDuration = 2.0) {
    this.rotation.targetSpeed = 0;
    this.rotation.easeSpeed = 1.0 / (easeOutDuration * 60); // Convert to per-frame ease
    this.rotation.duration = null; // Clear duration

    if (window.SONOITE_DEBUG) {
      console.log(`[EggOrb] Spin stopping: easeOut=${easeOutDuration.toFixed(1)}s`);
    }
  }

  /**
   * ANIM-EGG-06: Shimmer impulse - brief emissive flash
   * Triggered at key moments (UNFREEZE, SOLO, CLIMAX)
   * @param {Number} intensity - Peak intensity multiplier (1.0 = normal, 2.0 = double)
   * @param {Number} duration - Fade duration in seconds
   */
  shimmer(intensity = 1.0, duration = 0.35) {
    // Initialize shimmer state if not present
    if (!this._shimmer) {
      this._shimmer = {
        active: false,
        time: 0,
        duration: 0,
        baseEmission: 1.0,
        targetEmission: 1.0
      };
    }

    this._shimmer.active = true;
    this._shimmer.time = 0;
    this._shimmer.duration = duration;
    this._shimmer.baseEmission = this.shellMat?.uniforms?.uEmissiveIntensity?.value || 1.0;
    this._shimmer.targetEmission = this._shimmer.baseEmission + (2.0 * intensity);

    // Also trigger bloom impulse via JourneyState if available
    if (typeof window !== 'undefined' && window.JourneyState) {
      window.JourneyState.emit('post:bloom:impulse', {
        intensity: 0.5 * intensity,
        decay: duration
      });
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[EggOrb] Shimmer: intensity=${intensity.toFixed(2)}, duration=${duration.toFixed(2)}s`);
    }
  }

  /**
   * ANIM-EGG-07: Update shimmer state (called from update())
   */
  _updateShimmer(dt) {
    if (!this._shimmer?.active) return;

    this._shimmer.time += dt;
    const t = Math.min(this._shimmer.time / this._shimmer.duration, 1.0);
    const fade = 1.0 - t; // Linear fade out

    // Calculate current emission
    const emission = this._shimmer.baseEmission +
      (this._shimmer.targetEmission - this._shimmer.baseEmission) * fade;

    // Apply to shell material
    if (this.shellMat?.uniforms?.uEmissiveIntensity) {
      this.shellMat.uniforms.uEmissiveIntensity.value = emission;
    }

    // Apply to inner material if it has emissive
    if (this.innerMat?.uniforms?.uEmissiveIntensity) {
      this.innerMat.uniforms.uEmissiveIntensity.value = emission * 0.7; // Slightly dimmer inner
    }

    // Deactivate when complete
    if (t >= 1.0) {
      this._shimmer.active = false;
      // Reset to base
      if (this.shellMat?.uniforms?.uEmissiveIntensity) {
        this.shellMat.uniforms.uEmissiveIntensity.value = this._shimmer.baseEmission;
      }
    }
  }

  // Mulberry32 PRNG for deterministic randomness
  mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  // Simple Perlin-like noise for smooth bobbing
  noise(x, y = 0, z = 0) {
    // Simplified noise using sine waves
    return Math.sin(x * 1.3 + this.bobPhases.x) * 0.5 +
           Math.sin(y * 1.7 + this.bobPhases.y) * 0.3 +
           Math.sin(z * 2.1 + this.bobPhases.z) * 0.2;
  }
  
  // Determine device LOD
  getDeviceLOD() {
    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768;
    
    if (isMobile && !isTablet) return 1; // Mobile
    if (isTablet) return 2; // Tablet
    return 3; // Desktop
  }

  _s(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  update(audio, dt) {
    // MP-LAYER-GUARDS: Early return if not active or mounted
    if (!this.isActive?.() || !this.isMounted?.()) return;

    const b = this._s('bass', Math.min(1, audio?.bass ?? 0));
    const m = this._s('mid', Math.min(1, audio?.mid ?? 0));
    const t = this._s('treble', Math.min(1, audio?.treble ?? 0));
    const l = this._s('loud', Math.min(1, audio?.loudness ?? 0));
    const c = this._s('centroid', Math.min(1, audio?.centroid ?? 0));

    this._time += dt;

    // Update inner material with new audio mapping
    if (this.innerMat.userData.update) {
      this.innerMat.userData.update(audio, dt);
    }
    
    // Bass controls egg eccentricity
    // BOOST-EGG: Increased from 0.15 to 0.22 to compensate for calmer camera
    const baseScaleXZ = 1.0; // Base horizontal scale
    const targetEccentricity = this.baseEccentricity + b * 0.22;

    // Smooth transition for Y scale (eccentricity)
    if (!this._targetScaleY) this._targetScaleY = this.baseEccentricity;
    this._targetScaleY += (targetEccentricity - this._targetScaleY) * 0.08;

    // Reset to base scales before applying modifiers
    this.inner.scale.set(baseScaleXZ, this._targetScaleY, baseScaleXZ);

    // Update shell material with audio
    if (this.shellMat.userData.update) {
      this.shellMat.userData.update(audio, dt);
    }

    // MAT-EGG-01: Bass-reactive emissive intensity
    // BOOST-EGG: Increased cap 0.3→0.45, multiplier 0.25→0.35
    // SHIMMER-FIX: Only apply if shimmer is NOT active (shimmer takes priority)
    if (this.shellMat.uniforms?.uEmissiveIntensity && !this._shimmer?.active) {
      const emissiveIntensity = Math.min(0.45, 0.08 + 0.35 * b);
      this.shellMat.uniforms.uEmissiveIntensity.value = emissiveIntensity;
    }

    // ANIM-EGG-07: Update shimmer impulse
    this._updateShimmer(dt);

    // Outer spike scale with smooth transitions
    // BOOST-EGG: Increased cap 1.14→1.20 for more visible swell on bass
    const targetSwell = Math.min(1.20, 1.0 + (this._spikeBase + this._spikeAmp * (0.6 * b + 0.4 * l)));
    const currentScale = this.shell.scale.x;
    const swell = currentScale + (targetSwell - currentScale) * 0.08;
    this.shell.scale.setScalar(swell);

    // ANIM-EGG-06: Rotation state machine with smooth easing
    if (this.rotation.active) {
      // Ease current speed towards target speed
      this.rotation.speed += (this.rotation.targetSpeed - this.rotation.speed) * this.rotation.easeSpeed;

      // Apply rotation around axis
      if (Math.abs(this.rotation.speed) > 0.001) {
        this.inner.rotateOnAxis(this.rotation.axis, this.rotation.speed * dt);
      }

      // Track duration
      if (this.rotation.duration !== null) {
        this.rotation.elapsed += dt;
        if (this.rotation.elapsed >= this.rotation.duration) {
          this.stopSpin(2.0); // Ease out over 2 seconds
        }
      }

      // Stop when speed reaches zero
      if (this.rotation.targetSpeed === 0 && Math.abs(this.rotation.speed) < 0.001) {
        this.rotation.active = false;
        this.rotation.speed = 0;
        if (window.SONOITE_DEBUG) {
          console.log('[EggOrb] Spin complete - egg at rest');
        }
      }
    }

    // ANIM-EGG-07: Breathing animation (position drift + P2-LUNG: scale breathing)
    let bobX = 0, bobY = 0, bobZ = 0;
    let breathScale = 1.0; // P2-LUNG: Scale factor for visual breathing

    if (this.breathing.enabled) {
      // Use sine wave for smooth, organic breathing
      this.breathing.phase += dt * this.breathing.rate * Math.PI * 2;
      const breathCycle = Math.sin(this.breathing.phase);

      // Vertical breathing (dominant)
      bobY = breathCycle * this.breathing.amplitude;

      // Subtle horizontal drift for organic feel
      bobX = Math.sin(this.breathing.phase * 0.37) * (this.breathing.amplitude * 0.2);
      bobZ = Math.cos(this.breathing.phase * 0.43) * (this.breathing.amplitude * 0.2);

      // P2-LUNG: Visual scale breathing (cosmic inhale/exhale)
      if (this.breathing.scaleEnabled) {
        // Inhale expands, exhale contracts - slight asymmetry for organic feel
        const inhaleStrength = breathCycle > 0 ? breathCycle * 1.1 : breathCycle * 0.9;
        breathScale = 1.0 + inhaleStrength * this.breathing.scaleAmplitude;
      }
    } else {
      // FALLBACK: Perlin-based bobbing (legacy)
      const bobTime = this._time * 0.3;
      bobY = this.noise(bobTime, bobTime * 0.7, bobTime * 1.3) * 0.18;
      bobX = this.noise(bobTime * 0.8, bobTime * 1.1) * 0.05;
      bobZ = this.noise(bobTime * 1.2, bobTime * 0.9) * 0.05;
    }

    this.inner.position.set(bobX, 2.0 + bobY, bobZ);

    // P2-LUNG: Apply visual scale breathing to inner egg
    if (breathScale !== 1.0) {
      // Multiply existing scale by breath factor (preserves bass-reactive eccentricity)
      this.inner.scale.x *= breathScale;
      this.inner.scale.y *= breathScale;
      this.inner.scale.z *= breathScale;
    }

    // GUIDE-FIX-2: Shell follows inner (synced by default) - fixes "two eggs" issue
    if (this.shell) {
      if (this.syncShell) {
        // Sync: shell copies inner rotation, position, AND scale (FIX-3)
        this.shell.rotation.copy(this.inner.rotation);
        this.shell.position.copy(this.inner.position);
        this.shell.scale.copy(this.inner.scale);
      } else {
        // Legacy: counter-rotation for backwards compatibility
        this.shell.rotation.x += dt * this.rotationSpeeds.x * -0.6;
        this.shell.rotation.y -= dt * this.rotationSpeeds.y * 1.2;
        this.shell.rotation.z += dt * this.rotationSpeeds.z * 0.3;
        this.shell.position.set(bobX * 0.7, 2.0 + bobY * 0.9, bobZ * 0.7);
      }
    }

  }

  unmount() {
    // Dispose geometries and materials
    if (this.inner) {
      if (this.inner.geometry) this.inner.geometry.dispose();
      if (this.innerMat) this.innerMat.dispose();
    }
    if (this.shell) {
      if (this.shell.geometry) this.shell.geometry.dispose();
      if (this.shellMat) this.shellMat.dispose();
    }
    super.unmount();
  }
  
  // Dynamic quality adjustment
  setQuality(quality) {
    if (quality === 'low') {
      this.lod = 1;
      // Disable shimmer on low quality
      if (this.innerMat.uniforms) {
        this.innerMat.uniforms.uShimmer.value = 0;
      }
    } else if (quality === 'medium') {
      this.lod = 2;
    } else {
      this.lod = 3;
    }
  }
}
