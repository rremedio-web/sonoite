/**
 * Three.js disposal utilities
 * Properly disposes of Three.js objects to prevent memory leaks
 */

/**
 * Recursively dispose of Three.js objects and their resources
 * @param {THREE.Object3D} root - The root object to dispose
 */
export function dispose3D(root) {
  if (!root) return;
  
  // Traverse the object tree
  root.traverse?.(object => {
    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose?.();
    }
    
    // Dispose materials (can be array or single)
    const materials = Array.isArray(object.material) 
      ? object.material 
      : object.material ? [object.material] : [];
    
    materials.forEach(material => {
      if (!material) return;
      
      // Dispose material
      material.dispose?.();
      
      // Dispose textures
      const textureProperties = [
        'map', 'lightMap', 'bumpMap', 'normalMap',
        'specularMap', 'envMap', 'alphaMap', 'aoMap',
        'displacementMap', 'emissiveMap', 'gradientMap',
        'metalnessMap', 'roughnessMap'
      ];
      
      textureProperties.forEach(prop => {
        if (material[prop]) {
          material[prop].dispose?.();
        }
      });
      
      // Dispose uniforms textures (for ShaderMaterial)
      if (material.uniforms) {
        Object.values(material.uniforms).forEach(uniform => {
          if (uniform?.value?.dispose) {
            uniform.value.dispose();
          }
        });
      }
    });
    
    // Clear references
    object.geometry = undefined;
    object.material = undefined;
  });
  
  // Remove from parent if it has one
  if (root.parent) {
    root.parent.remove(root);
  }
  
  // Clear children array (Object3D only — e.g. FullScreenQuad has no children)
  if (Array.isArray(root.children)) {
    while (root.children.length > 0) {
      root.remove(root.children[0]);
    }
  }
}

/**
 * Dispose of a render target
 * @param {THREE.WebGLRenderTarget} renderTarget 
 */
export function disposeRenderTarget(renderTarget) {
  if (!renderTarget) return;
  
  renderTarget.dispose?.();
  
  // Dispose textures
  if (renderTarget.texture) {
    renderTarget.texture.dispose?.();
  }
  
  if (renderTarget.depthTexture) {
    renderTarget.depthTexture.dispose?.();
  }
}

/**
 * Dispose of an effect composer and its passes
 * @param {EffectComposer} composer 
 */
export function disposeComposer(composer) {
  if (!composer) return;
  
  // Dispose render targets
  if (composer.renderTarget1) {
    disposeRenderTarget(composer.renderTarget1);
  }
  
  if (composer.renderTarget2) {
    disposeRenderTarget(composer.renderTarget2);
  }
  
  // Dispose passes
  if (composer.passes) {
    composer.passes.forEach(pass => {
      if (pass.renderTarget) {
        disposeRenderTarget(pass.renderTarget);
      }
      
      // Call pass dispose if available
      pass.dispose?.();
    });
  }
}