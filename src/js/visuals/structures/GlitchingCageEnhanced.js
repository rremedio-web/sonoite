import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { GlitchingCageMaterial } from '../materials/GlitchingCageMaterial.js';
import { ObsidianGlassMaterial } from '../materials/ObsidianGlassMaterial.js';

export class GlitchingCageEnhanced extends VisualLayer {
  mount() {
    super.mount();
    
    // Configuration
    this.baseRadius = 2.6;
    this.layers = {};
    this.ghostOpacity = 0;
    this.transientDecay = 0;
    
    // ADSR envelope state for ghost layer
    this.adsrState = 'idle'; // idle, attack, decay, sustain, release
    this.adsrTime = 0;
    this.adsrLevel = 0;
    this.adsrParams = {
      attack: 0.01,   // 10ms attack
      decay: 0.1,     // 100ms decay
      sustain: 0.7,   // 70% sustain level
      release: 0.3    // 300ms release
    };
    
    // Rotation stutter state
    this.stutterPhase = 0;
    this.stutterHold = false;
    this.lastStutterTime = 0;
    
    // EMA smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0, transients: 0 };
    this._alpha = 0.18;
    this._time = 0;
    
    // Initialize multi-layer cage
    this.initLayers();
  }
  
  initLayers() {
    // Base geometry: icosahedron for more complex cage structure
    const baseGeo = new THREE.IcosahedronGeometry(this.baseRadius, 2);
    const edgesGeo = new THREE.EdgesGeometry(baseGeo, 20);
    
    // Add UV attribute for line gradient (0 at start, 1 at end of each segment)
    const positions = edgesGeo.attributes.position.array;
    const uvs = new Float32Array(positions.length / 3);
    for (let i = 0; i < uvs.length; i++) {
      uvs[i] = (i % 2); // Alternates 0, 1, 0, 1 for line segments
    }
    edgesGeo.setAttribute('aLineUv', new THREE.BufferAttribute(uvs, 1));
    
    // Layer configurations
    const layerConfigs = {
      inner: { 
        scale: 0.8, 
        rotSpeed: new THREE.Vector3(0.02, 0.03, 0.01), 
        glitchSeed: 0.1, 
        colorShift: 0.0 
      },
      main: { 
        scale: 1.0, 
        rotSpeed: new THREE.Vector3(0.01, 0.02, 0.015), 
        glitchSeed: 0.2, 
        colorShift: 0.5 
      },
      outer: { 
        scale: 1.2, 
        rotSpeed: new THREE.Vector3(-0.015, -0.025, -0.01), 
        glitchSeed: 0.3, 
        colorShift: 1.0 
      },
      ghost: { 
        scale: 1.1, 
        rotSpeed: new THREE.Vector3(0.03, 0.01, 0.02), 
        glitchSeed: 0.4, 
        colorShift: 0.7 
      }
    };
    
    // Determine which material class to use based on config
    const MaterialClass = this.getMaterialClass();

    // Create each layer
    for (let name in layerConfigs) {
      const config = layerConfigs[name];
      const material = new MaterialClass({
        glitchSeed: config.glitchSeed,
        colorShift: config.colorShift,
        opacity: name === 'ghost' ? 0 : 0.6,
        // Obsidian-specific options
        darkness: 0.95,
        reflectivity: 0.15,
        edgeShimmer: 0.2
      });
      
      const lines = new THREE.LineSegments(edgesGeo.clone(), material);
      lines.scale.setScalar(config.scale);
      lines.frustumCulled = true;
      
      // Add to group instead of scene
      this.group.add(lines);
      
      this.layers[name] = { lines, material, config };
    }
    
    // Ghost starts invisible
    this.layers.ghost.material.uniforms.uOpacity.value = 0;
  }

  getMaterialClass() {
    // Check journey config for material preference
    const materialType = this.cfg?.material || 'default';

    switch (materialType) {
      case 'obsidian_glass':
        return ObsidianGlassMaterial;
      case 'default':
      default:
        return GlitchingCageMaterial;
    }
  }

  _smooth(key, value) {
    this._ema[key] = this._ema[key] * (1 - this._alpha) + value * this._alpha;
    return this._ema[key];
  }
  
  update(audio, dt) {
    this._time += dt;

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loudness = this._smooth('loud', Math.min(1, audio?.loudness ?? 0));

    // Amplified reactivity with dual-rate EMA
    const alphaAttack = 0.6;  // Fast attack for punchy beats
    const alphaDecay = 0.2;   // Slow decay for smooth sustain

    // Calculate transients from treble spikes
    const rawTreble = audio?.treble ?? 0;
    const transients = Math.max(0, rawTreble - this._ema.treble) * 2;
    this._smooth('transients', transients);

    // AMPLIFIED bass expansion/contraction - dramatic breathing
    const targetInnerScale = this.layers.inner.config.scale * (1 - bass * 2.0);
    const currentInnerScale = this.layers.inner.lines.scale.x;
    const innerAlpha = (targetInnerScale > currentInnerScale) ? alphaAttack : alphaDecay;
    const newInnerScale = currentInnerScale + (targetInnerScale - currentInnerScale) * innerAlpha;
    this.layers.inner.lines.scale.setScalar(THREE.MathUtils.clamp(newInnerScale, 0.5, 1.0));

    const targetOuterScale = this.layers.outer.config.scale * (1 + bass * 2.0);
    const currentOuterScale = this.layers.outer.lines.scale.x;
    const outerAlpha = (targetOuterScale > currentOuterScale) ? alphaAttack : alphaDecay;
    const newOuterScale = currentOuterScale + (targetOuterScale - currentOuterScale) * outerAlpha;
    this.layers.outer.lines.scale.setScalar(THREE.MathUtils.clamp(newOuterScale, 0.8, 2.0));

    // AMPLIFIED mid: rotation complexity
    const midFactor = 1 + mid * 2.0;

    // AMPLIFIED treble: glitch intensity
    const glitchAmount = treble * 2.0;
    
    // ADSR envelope for ghost layer on transients
    if (transients > 0.3 && this.adsrState === 'idle') {
      // Trigger attack phase
      this.adsrState = 'attack';
      this.adsrTime = 0;
    }
    
    // Process ADSR envelope
    this.updateADSR(dt);
    this.ghostOpacity = this.adsrLevel * 0.6; // Scale to max 0.6 opacity
    
    // AMPLIFIED loudness: overall opacity swings 0.4-0.8
    const baseOpacity = 0.4 + loudness * 0.4;
    
    // Update each layer
    for (let name in this.layers) {
      const layer = this.layers[name];
      const { lines, material, config } = layer;
      
      // Orbital wobble for organic feel
      lines.position.x = Math.sin(this._time * 0.7) * 0.15;
      lines.position.y = Math.cos(this._time * 0.9) * 0.15;
      
      // Enhanced stutter-step with hold and release
      const stutterThreshold = 0.7;
      const stutterFreq = 13;
      const currentStutter = Math.sin(this._time * stutterFreq);
      
      if (treble > stutterThreshold) {
        // Check for stutter trigger (crossing threshold)
        if (currentStutter > 0.8 && !this.stutterHold) {
          this.stutterHold = true;
          this.stutterPhase = lines.rotation.y; // Hold current rotation
          this.lastStutterTime = this._time;
        } else if (currentStutter < 0.5 && this.stutterHold) {
          // Release stutter with spring-back
          this.stutterHold = false;
        }
      } else {
        this.stutterHold = false;
      }
      
      if (this.stutterHold) {
        // Frozen rotation during stutter
        lines.rotation.y = this.stutterPhase;
        // Add small vibration to show it's intentional
        lines.rotation.x += Math.sin(this._time * 60) * 0.002;
      } else {
        // Normal rotation
        lines.rotation.x += config.rotSpeed.x * dt * midFactor;
        lines.rotation.y += config.rotSpeed.y * dt * midFactor;
        lines.rotation.z += config.rotSpeed.z * dt * midFactor;
      }
      
      // Update material uniforms
      material.uniforms.uTime.value = this._time;
      material.uniforms.uGlitchAmount.value = glitchAmount *
        (1 + Math.sin(this._time * 13 + config.glitchSeed) * 0.5);
      // AMPLIFIED bass distortion
      material.uniforms.uPhaseShift.value = bass * 2.0;
      material.uniforms.uScanTime.value = this._time * 0.5;
      material.uniforms.uEnergyPulse.value = transients;
      material.uniforms.uBass.value = bass;
      material.uniforms.uMid.value = mid;
      material.uniforms.uTreble.value = treble;
      
      // Pass ADSR envelope to shader
      if (name === 'ghost') {
        material.uniforms.uADSREnvelope.value.set(
          this.adsrParams.attack,
          this.adsrParams.decay,
          this.adsrParams.sustain,
          this.adsrParams.release
        );
        material.uniforms.uGhostAmt.value = this.adsrLevel;
      }
      
      // Set opacity
      let opacity = baseOpacity;
      if (name === 'ghost') {
        opacity = this.ghostOpacity;
      }
      material.uniforms.uOpacity.value = opacity;
    }
  }
  
  updateADSR(dt) {
    this.adsrTime += dt;
    
    switch(this.adsrState) {
      case 'attack':
        this.adsrLevel = Math.min(1, this.adsrTime / this.adsrParams.attack);
        if (this.adsrTime >= this.adsrParams.attack) {
          this.adsrState = 'decay';
          this.adsrTime = 0;
        }
        break;
        
      case 'decay':
        const decayProgress = this.adsrTime / this.adsrParams.decay;
        this.adsrLevel = 1 - (1 - this.adsrParams.sustain) * decayProgress;
        if (this.adsrTime >= this.adsrParams.decay) {
          this.adsrState = 'sustain';
          this.adsrTime = 0;
        }
        break;

      case 'sustain':
        // AMPLIFIED sustain level driven by mid
        this.adsrLevel = Math.min(1.0, this.adsrParams.sustain + mid * 2.0);
        // Hold for 50ms then release
        if (this.adsrTime > 0.05) {
          this.adsrState = 'release';
          this.adsrTime = 0;
        }
        break;
        
      case 'release':
        const releaseProgress = this.adsrTime / this.adsrParams.release;
        this.adsrLevel = this.adsrParams.sustain * (1 - releaseProgress);
        if (this.adsrTime >= this.adsrParams.release) {
          this.adsrState = 'idle';
          this.adsrLevel = 0;
        }
        break;
        
      case 'idle':
      default:
        this.adsrLevel = 0;
        break;
    }
  }
  
  unmount() {
    // Clean up all layers
    for (let name in this.layers) {
      const { lines, material } = this.layers[name];
      lines.geometry.dispose();
      material.dispose();
    }
    
    this.layers = {};
    super.unmount();
  }
}