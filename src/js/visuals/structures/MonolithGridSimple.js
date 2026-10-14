/**
 * Monolith Grid Structure - Simple InstancedMesh version
 * Fallback without shader modifications
 * @module MonolithGridSimple
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import { createMusicalResponse, waveDelay } from '../utils/audioResponse.js';

export class MonolithGridSimple extends VisualLayer {
  mount() {
    super.mount();
    
    // Configuration
    this.cols = 9;
    this.rows = 5;
    this.count = this.cols * this.rows;
    this._time = 0;
    
    // Create material - exactly matching single Monolith
    this.material = new THREE.MeshPhysicalMaterial({
      transmission: 0.9,
      ior: 1.05,
      thickness: 0.25,
      roughness: 0.15,
      metalness: 0.0,
      reflectivity: 0.15,
      attenuationColor: new THREE.Color('#2a2d36'),
      attenuationDistance: 2.5,
      color: new THREE.Color('#3a3d46'),
      transparent: true,
      opacity: 0.95,
      emissive: new THREE.Color('#2a3d56'),
      emissiveIntensity: 0.15
    });
    
    // Create geometry
    const geometry = new THREE.BoxGeometry(0.35, 1.2, 0.25);
    
    // Create InstancedMesh
    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.count);
    
    // Store base transforms
    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3(1, 1, 1);
    
    // Setup instances
    let idx = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.position.set(
          (x - 4) * 0.55,
          (y - 2) * 0.45 + 1.0,
          -0.5 - 0.02 * y
        );
        
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.mesh.setMatrixAt(idx, this.matrix);
        idx++;
      }
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.mesh);
    
    console.log('[MonolithGridSimple] Created', this.count, 'instances');
  }
  
  update(audio, dt) {
    this._time += dt;
    
    const musical = createMusicalResponse(audio);
    
    // Update material
    this.material.roughness = musical.roughness;
    this.material.transmission = musical.transmission;
    this.material.ior = musical.ior;
    
    // Update each instance with wave
    let idx = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const delay = waveDelay(x, y, 4, 2);
        const wave = Math.sin(this._time * musical.waveSpeed - delay);
        
        this.position.set(
          (x - 4) * 0.55,
          (y - 2) * 0.45 + 1.0 + wave * 0.1 * musical.intensity,
          -0.5 - 0.02 * y
        );
        
        this.scale.set(
          1.0 + wave * 0.02,
          1.0 + wave * 0.03,
          1.0
        );
        
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.mesh.setMatrixAt(idx, this.matrix);
        idx++;
      }
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
    
    // Group sway
    this.group.rotation.y = Math.sin(this._time * 0.2) * 0.01 * (1 + musical.resonance);
  }
  
  unmount() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
    super.unmount();
  }
}