/**
 * Monolith Grid Structure - Instanced with GPU Wave Animation
 * High-performance grid using InstancedMesh and vertex shader waves
 * @module MonolithGrid
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { createMusicalResponse } from '../utils/audioResponse.js';

export class MonolithGrid extends VisualLayer {
  mount() {
    super.mount();

    // MP-GRID-02: Read configuration from journey params
    this.rows = this.cfg.params?.rows ?? 5;
    this.cols = this.cfg.params?.columns ?? this.cfg.params?.cols ?? 9;
    this.count = this.cols * this.rows;

    // MP-GRID-02: Spacing can be single number or [x, y] array
    const spacingParam = this.cfg.params?.spacing;
    if (typeof spacingParam === 'number') {
      this.spacing = [spacingParam, spacingParam];
    } else if (Array.isArray(spacingParam)) {
      this.spacing = spacingParam;
    } else {
      this.spacing = [0.55, 0.45]; // Default
    }

    // MP-GRID-02: Scale affects box geometry size
    this.scale = this.cfg.params?.scale ?? 1.0;

    this.center = [Math.floor(this.cols / 2), Math.floor(this.rows / 2)]; // Wave origin point (dynamic)
    this._time = 0;
    
    // Get environment map if available
    const env = this.ctx?.envMap || null;
    
    // Create base material matching single monolith
    this.material = new THREE.MeshPhysicalMaterial({
      transmission: 0.9,  // Match single monolith
      ior: 1.05,
      thickness: 0.25,    // Match single monolith
      roughness: 0.15,    // Match single monolith
      metalness: 0.0,
      reflectivity: 0.15, // Match single monolith
      attenuationColor: new THREE.Color('#2a2d36'),
      attenuationDistance: 2.5,
      color: new THREE.Color('#3a3d46'),
      envMap: env,
      envMapIntensity: env ? 0.5 : 0,
      transparent: true,
      opacity: 0.95,      // Match single monolith
      emissive: new THREE.Color('#2a3d56'), // Match single monolith
      emissiveIntensity: 0.15  // Match single monolith
    });
    
    // Store shader modification for later (after material is compiled)
    this.shaderModification = (shader) => {
      // Add uniforms for wave animation
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWaveSpeed = { value: 0.5 };
      shader.uniforms.uWaveAmplitude = { value: 0.1 };
      shader.uniforms.uAudioIntensity = { value: 0 };
      shader.uniforms.uAudioPulse = { value: 0 };
      shader.uniforms.uAudioShimmer = { value: 0 };
      
      // Add attribute for wave delay per instance
      shader.vertexShader = `
        attribute float aWaveDelay;
        attribute vec3 aInstanceColor;
        varying float vWaveIntensity;
        varying vec3 vInstanceColor;
      ` + shader.vertexShader;
      
      // Inject wave animation into vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        
        // Calculate wave based on time and delay
        float wave = sin(uTime * uWaveSpeed - aWaveDelay);
        float waveIntensity = wave * uWaveAmplitude * (1.0 + uAudioIntensity);
        
        // Apply wave to position
        transformed.y += waveIntensity;
        
        // Apply pulse to scale
        float pulse = 1.0 + wave * 0.02 + uAudioPulse * 0.01;
        transformed *= pulse;
        
        // Pass to fragment shader
        vWaveIntensity = wave;
        vInstanceColor = aInstanceColor;
        `
      );
      
      // Modify fragment shader for per-instance effects
      shader.fragmentShader = `
        varying float vWaveIntensity;
        varying vec3 vInstanceColor;
      ` + shader.fragmentShader;
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        
        // Add wave-based emissive glow
        #ifdef USE_EMISSIVE
          totalEmissiveRadiance += emissive * (0.5 + vWaveIntensity * 0.5) * (1.0 + uAudioShimmer);
        #endif
        
        // Subtle color variation per instance
        diffuseColor.rgb = mix(diffuseColor.rgb, vInstanceColor, 0.1);
        `
      );
      
      // Store shader reference for updates
      this.shader = shader;
    };
    
    // MP-GRID-02: Create geometry with configurable scale
    const baseWidth = 0.35 * this.scale;
    const baseHeight = 1.2 * this.scale;
    const baseDepth = 0.25 * this.scale;
    const geometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    
    // Create instanced mesh
    this.instancedMesh = new THREE.InstancedMesh(geometry, this.material, this.count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Setup custom attributes
    const delays = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    
    // Setup initial matrices and attributes
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const color = new THREE.Color();
    
    this.basePositions = [];
    this.baseMatrices = [];
    
    let idx = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        // MP-GRID-02: Calculate position with dynamic centering
        position.set(
          (x - this.center[0]) * this.spacing[0],  // Center horizontally
          (y - this.center[1]) * this.spacing[1] + 1.0,  // Center vertically
          -0.5 - 0.02 * y  // Slight depth variation
        );
        
        this.basePositions.push(position.clone());
        
        // Calculate wave delay based on distance from center
        const dx = x - this.center[0];
        const dy = y - this.center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        delays[idx] = distance * 0.1;
        
        // Slight color variation for visual interest
        color.setHSL(0.6, 0.1, 0.2 + Math.random() * 0.05);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;
        
        // Set initial matrix
        matrix.compose(position, quaternion, scale);
        this.baseMatrices.push(matrix.clone());
        this.instancedMesh.setMatrixAt(idx, matrix);
        
        idx++;
      }
    }
    
    // Add custom attributes to geometry
    this.instancedMesh.geometry.setAttribute('aWaveDelay', new THREE.InstancedBufferAttribute(delays, 1));
    this.instancedMesh.geometry.setAttribute('aInstanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedMesh);

    // MP-GRID-02: Debug log with configuration details
    if (window.SONOITE_DEBUG) {
      console.log('[MonolithGrid] Created InstancedMesh with', this.count, 'instances');
      console.log('[MonolithGrid] Config:', {
        rows: this.rows,
        cols: this.cols,
        spacing: this.spacing,
        scale: this.scale,
        center: this.center
      });
      console.log('[MonolithGrid] InstancedMesh visible:', this.instancedMesh.visible);
      console.log('[MonolithGrid] Group children:', this.group.children.length);
    }
    
    // Animation state
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.2;
  }

  _s(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  update(audio, dt) {
    this._time += dt;
    
    // Get musical response
    const musical = createMusicalResponse(audio);
    
    // Update shader uniforms if available
    if (this.shader) {
      this.shader.uniforms.uTime.value = this._time;
      this.shader.uniforms.uWaveSpeed.value = musical.waveSpeed;
      this.shader.uniforms.uWaveAmplitude.value = 0.1 + musical.intensity * 0.05;
      this.shader.uniforms.uAudioIntensity.value = musical.intensity;
      this.shader.uniforms.uAudioPulse.value = musical.pulse;
      this.shader.uniforms.uAudioShimmer.value = musical.shimmer;
    }
    
    // Update material properties
    this.material.roughness = musical.roughness;
    this.material.transmission = musical.transmission;
    this.material.ior = musical.ior;
    this.material.emissiveIntensity = 0.08 + musical.shimmer * 0.05;
    
    // Group-level animations (CPU side for overall movement)
    const sway = Math.sin(this._time * 0.2) * 0.01 * (1 + musical.resonance);
    this.group.rotation.y = sway;
    
    // Subtle vertical bob for the whole group
    this.group.position.y = Math.sin(this._time * 0.4) * 0.05 * musical.intensity;
    
    // Note: Individual wave animations are handled by the GPU shader
    // No need to update individual matrices anymore!
  }

  unmount() {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      if (this.material) this.material.dispose();
    }
    this.basePositions = [];
    this.baseMatrices = [];
    super.unmount();
  }
}