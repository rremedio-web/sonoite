import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { createAshFlakeMaterial } from '../materials/AshFlakeMaterialImproved.js';

/**
 * Optimized cinematic falling ash using InstancedMesh
 * Performance-optimized version with 400 particles
 */
export class FallingAshOptimized extends VisualLayer {
  mount() {
    super.mount();

    // Optimized particle count for performance
    const count = Math.max(100, Math.min(this.cfg.count ?? 400, 500));
    // MP12: Use Phase42 palette object style (secondary for ash particles)
    const ashColor = this.cfg.palette?.secondary || '#b8b8c0';

    // Medium-sized plane geometry for flakes
    this.geometry = new THREE.PlaneGeometry(0.12, 0.15, 1, 1);

    // Improved shader material for realistic ash flakes
    this.material = createAshFlakeMaterial({
      color: ashColor,  // Use palette or default light ash gray
      opacity: 0.6  // Balanced opacity
    });
    
    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 100;
    
    // Per-instance attributes for variation
    const offsets = new Float32Array(count * 3);
    const sizes = new Float32Array(count * 2);
    const phases = new Float32Array(count);
    const fallSpeeds = new Float32Array(count);
    const rotationSpeeds = new Float32Array(count);
    const shapeSeeds = new Float32Array(count);
    
    // Initialize particles
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    for (let i = 0; i < count; i++) {
      // Random position in volume
      position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 15 - 2,
        (Math.random() - 0.5) * 15
      );
      
      // Random rotation
      rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Medium scale for visibility
      const sizeVar = 0.6 + Math.random() * 0.6;
      scale.set(sizeVar, sizeVar * (0.9 + Math.random() * 0.2), 1);
      
      // Compose transformation matrix
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      this.mesh.setMatrixAt(i, matrix);
      
      // Store per-instance data
      offsets[i * 3] = position.x;
      offsets[i * 3 + 1] = position.y;
      offsets[i * 3 + 2] = position.z;
      
      sizes[i * 2] = sizeVar;
      sizes[i * 2 + 1] = sizeVar * (0.8 + Math.random() * 0.4);
      
      phases[i] = Math.random() * Math.PI * 2;
      fallSpeeds[i] = 0.3 + Math.random() * 0.4;
      rotationSpeeds[i] = (Math.random() - 0.5) * 0.5;
      shapeSeeds[i] = Math.random();
    }
    
    // Store attributes for animation
    this.instanceData = {
      count,
      offsets,
      sizes,
      phases,
      fallSpeeds,
      rotationSpeeds,
      shapeSeeds
    };
    
    // Add custom attributes to geometry
    this.geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    this.geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 2));
    this.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    this.geometry.setAttribute('aFallSpeed', new THREE.InstancedBufferAttribute(fallSpeeds, 1));
    this.geometry.setAttribute('aRotationSpeed', new THREE.InstancedBufferAttribute(rotationSpeeds, 1));
    this.geometry.setAttribute('aShapeSeed', new THREE.InstancedBufferAttribute(shapeSeeds, 1));
    
    this.mesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.mesh);
    
    // Time tracking
    this.time = 0;
    
    // Audio smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.15;
  }
  
  _smooth(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }
  
  update(audio, dt) {
    this.time += dt;
    
    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loud = this._smooth('loud', Math.min(1, audio?.loudness ?? 0));
    
    // Update shader uniforms with audio reactivity
    if (this.material.updateUniforms) {
      this.material.updateUniforms({
        bass,
        mid,
        treble,
        loudness: loud
      }, this.time);
    }
    
    // Update instance positions for falling motion
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Euler();
    
    for (let i = 0; i < this.instanceData.count; i++) {
      // Get current matrix
      this.mesh.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);
      
      // Update Y position for falling with tumbling motion
      const fallSpeed = this.instanceData.fallSpeeds[i];
      const phase = this.instanceData.phases[i];
      
      // Falling with varying speed
      position.y -= fallSpeed * dt * (1 + mid * 0.3);
      
      // Reset at bottom with smooth transition
      if (position.y < -5) {
        position.y = 10 + Math.random() * 5;
        position.x = this.instanceData.offsets[i * 3] + (Math.random() - 0.5) * 2;
        position.z = this.instanceData.offsets[i * 3 + 2] + (Math.random() - 0.5) * 2;
      }
      
      // Add realistic drift - figure-8 pattern for tumbling
      position.x += Math.sin(this.time * 0.7 + phase) * 0.03;
      position.z += Math.sin(this.time * 0.5 + phase * 2) * 0.02;
      
      // Update rotation
      rotation.setFromQuaternion(quaternion);
      rotation.z += this.instanceData.rotationSpeeds[i] * dt;
      quaternion.setFromEuler(rotation);
      
      // Compose new matrix
      matrix.compose(position, quaternion, scale);
      this.mesh.setMatrixAt(i, matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  
  unmount() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    
    super.unmount();
  }
}