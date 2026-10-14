/**
 * Placeholder Visual Layers
 * Temporary implementations that mount visible indicators
 * Will be replaced with real implementations progressively
 * @module placeholders
 */

import { VisualLayer } from './layer-api.js';
import { dlog, dwarn, derr } from '../utils/devlog.js';

/**
 * Base placeholder class with minimal visible indicator
 */
class PlaceholderBase extends VisualLayer {
  constructor(ctx) {
    super(ctx);
    // Set visual type during construction - this survives minification
    this.visualType = this.getVisualType();
  }
  
  /**
   * Determine visual type - override in subclasses or use registry lookup
   */
  getVisualType() {
    // Default implementation - subclasses should override this
    return 'unknown';
  }
  
  mount() {
    dlog(`[PlaceholderBase] Mounting ${this.visualType} layer`);
    
    const { THREE } = this.ctx;
    if (!THREE) {
      derr(`[Placeholder] ${this.constructor.name} - THREE not available in context!`);
      return;
    }
    
    // Create our own group for the placeholder (following existing pattern)
    this.group = new THREE.Group();
    this.group.name = `placeholder_${this.visualType}`;
    
    const isFlow = this.visualType === 'flow';
    
    // Create wireframe boxes like the existing modules
    const geometry = isFlow ? 
      new THREE.SphereGeometry(2, 8, 6) :  // Flow uses spheres
      new THREE.BoxGeometry(3, 3, 3);      // Structure uses boxes
      
    // Create simple material that will definitely be visible
    const material = new THREE.MeshBasicMaterial({
      color: isFlow ? 0x00FFFF : 0xFF00FF,  // Cyan for flow, Magenta for structure
      wireframe: true,
      opacity: 1,
      transparent: false
    });
    
    // Create multiple meshes like the existing modules do
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position them around like the existing modules
      const angle = (i / 3) * Math.PI * 2;
      const radius = isFlow ? 4 : 5;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = isFlow ? Math.sin(angle) * 2 : i * 2 - 2;
      mesh.position.z = Math.sin(angle) * radius;
      
      this.group.add(mesh);
      
      // Store first mesh for animation
      if (i === 0) this.placeholderMesh = mesh;
    }
    
    // Make sure it's visible
    this.group.visible = true;
    
    // Call parent mount which adds to scene
    super.mount();
    
    // NOW check if it's actually in the scene (after mount)
    dlog(`[PlaceholderBase] ${this.visualType} placeholder added:`, {
      position: this.group.position.toArray(),
      visible: this.group.visible,
      meshColor: material.color.getHex(),
      sceneChildren: this.ctx.scene.children.length,
      actuallyInScene: this.ctx.scene.children.includes(this.group),
      meshActuallyInGroup: this.group.children.includes(this.placeholderMesh),
      groupParent: this.group.parent?.uuid,
      sceneUUID: this.ctx.scene.uuid
    });
  }
  
  unmount() {
    dlog(`[PlaceholderBase] Unmounting ${this.visualType} layer`);
    
    // Remove from scene
    if (this.group && this.ctx.scene) {
      this.ctx.scene.remove(this.group);
    }
    
    // Cleanup
    if (this.placeholderMesh) {
      this.placeholderMesh.geometry?.dispose();
      this.placeholderMesh.material?.dispose();
      this.placeholderMesh = null;
    }
    
    this.group = null;
    
    super.unmount();
  }
  
  update(audioFrame, dt) {
    // Simple pulsing animation based on audio
    if (this.placeholderMesh) {
      const scale = 1 + audioFrame.loudness * 0.3;
      this.placeholderMesh.scale.setScalar(scale);
      
      // Rotate slowly
      this.placeholderMesh.rotation.y += dt * 0.5;
      
      // Bob up and down
      this.placeholderMesh.position.y = 2 + Math.sin(Date.now() * 0.001) * 0.5;
    }
  }
  
  setConfig(config) {
    dlog(`[PlaceholderBase] Config for ${this.visualType}:`, config);
    this.config = config;
  }
}

// Legacy fallbacks
export class LegacyFlow extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class LegacyStructure extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}

// Flow placeholders (from VISUAL_TYPES_TO_IMPLEMENT.md)
export class Flow_soft_particles extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_misty_rain extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_falling_ash extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_cold_haze extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_heavy_fog extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_ink_tendrils extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}
export class Flow_star_dust_field extends PlaceholderBase {
  getVisualType() { return 'flow'; }
}

// Structure placeholders (from VISUAL_TYPES_TO_IMPLEMENT.md)
export class Struct_glitching_cage extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}
export class Struct_distant_shards extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}
export class Struct_monolith extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}
export class Struct_monolith_grid extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}
export class Struct_deconstructed_vertices extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}
export class Struct_drifting_wireframes extends PlaceholderBase {
  getVisualType() { return 'structure'; }
}