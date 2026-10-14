import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class SimpleFog extends VisualLayer {
  mount() {
    if (!this.group) {
      this.group = new THREE.Group();
    }
    super.mount();

    // MP12: Use Phase42 palette object style
    const fogColor = this.cfg.palette?.primary || '#4a5568';
    
    // Create fog using semi-transparent spheres
    this.createFogClouds(fogColor);
    
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.2;
  }

  createFogClouds(fogColor) {
    this.fogClouds = [];
    const cloudCount = 25;  // Balanced for atmosphere
    
    // Create shader material for soft fog appearance
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fogColor),
      transparent: true,
      opacity: 0.015,  // Subtle fog effect
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending  // Additive for smooth blending
    });
    
    // Create fog clouds using smooth spheres for better blending
    for (let i = 0; i < cloudCount; i++) {
      // Use sphere for smoother blending
      const geometry = new THREE.SphereGeometry(1, 12, 10); // Smoother spheres
      const mesh = new THREE.Mesh(geometry, fogMaterial.clone());
      
      // More random, overlapping distribution for smooth blending
      mesh.position.set(
        (Math.random() - 0.5) * 50,  // Wide spread
        (Math.random() - 0.5) * 25,
        -Math.random() * 45 - 3      // Varied depth
      );
      
      // Larger, overlapping scales for smoother appearance
      const scale = 20 + Math.random() * 25;  // Much larger for smooth coverage
      const scaleX = scale * (0.8 + Math.random() * 0.4);
      const scaleY = scale * (0.6 + Math.random() * 0.4);
      const scaleZ = scale * (0.7 + Math.random() * 0.3);
      mesh.scale.set(scaleX, scaleY, scaleZ);
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // Store initial values
      mesh.userData = {
        initialPosition: mesh.position.clone(),
        initialRotation: mesh.rotation.clone(),
        floatSpeed: 0.2 + Math.random() * 0.3,
        floatOffset: Math.random() * Math.PI * 2,
        material: mesh.material
      };
      
      this.fogClouds.push(mesh);
      this.group.add(mesh);
    }
    
    
    // Add subtle depth fog using additional spheres for smooth blending
    for (let i = 0; i < 15; i++) {  // Very few depth layers
      const geometry = new THREE.SphereGeometry(1, 12, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(fogColor),
        transparent: true,
        opacity: 0.012,  // Subtle
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position for depth layering
      mesh.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        -Math.random() * 60  // Throughout the depth
      );
      
      // Even larger scale for ultra-smooth appearance
      const scale = 30 + Math.random() * 30;
      mesh.scale.set(scale, scale * 0.7, scale * 0.8);
      
      mesh.userData = {
        initialPosition: mesh.position.clone(),
        material: material
      };
      
      this.fogClouds.push(mesh);
      this.group.add(mesh);
    }
  }

  _smooth(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  update(audio, dt) {
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loud = this._smooth('loud', Math.min(1, audio?.loudness ?? 0));
    
    const time = performance.now() * 0.001;
    
    // Animate fog clouds
    this.fogClouds.forEach((cloud, i) => {
      const userData = cloud.userData;
      
      if (userData.floatSpeed) {
        // Floating motion for spheres
        cloud.position.x = userData.initialPosition.x + 
          Math.sin(time * userData.floatSpeed + userData.floatOffset) * 3;
        cloud.position.y = userData.initialPosition.y + 
          Math.cos(time * userData.floatSpeed * 0.7 + userData.floatOffset) * 2;
        
        // Slow rotation
        cloud.rotation.x = userData.initialRotation.x + time * 0.05;
        cloud.rotation.y = userData.initialRotation.y + time * 0.03;
      }
      
      // Update opacity based on audio - keep it subtle and smooth
      userData.material.opacity = 0.005 + loud * 0.003 + bass * 0.002;
    });
  }

  unmount() {
    this.fogClouds?.forEach(cloud => {
      cloud.geometry.dispose();
      cloud.material.dispose();
    });
    super.unmount();
  }
}