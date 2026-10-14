import * as THREE from 'three';

let _scene = null;
let _camera = null;
let _renderer = null;

/**
 * Get the single root scene instance
 * @returns {THREE.Scene}
 */
export function getRootScene() {
  if (!_scene) {
    _scene = new THREE.Scene();
    _scene.fog = new THREE.Fog(0x000000, 50, 200);
    _scene.background = new THREE.Color(0x000000);
  }
  return _scene;
}

/**
 * Set the root scene (only if not already set)
 * @param {THREE.Scene} scene 
 */
export function setRootScene(scene) {
  if (!_scene && scene) {
    _scene = scene;
  }
}

/**
 * Get the root camera
 * @returns {THREE.Camera}
 */
export function getRootCamera() {
  return _camera;
}

/**
 * Set the root camera
 * @param {THREE.Camera} camera 
 */
export function setRootCamera(camera) {
  _camera = camera;
}

/**
 * Get the root renderer
 * @returns {THREE.WebGLRenderer}
 */
export function getRootRenderer() {
  return _renderer;
}

/**
 * Set the root renderer
 * @param {THREE.WebGLRenderer} renderer 
 */
export function setRootRenderer(renderer) {
  _renderer = renderer;
}

/**
 * Clear all root references (for cleanup)
 */
export function clearRootReferences() {
  _scene = null;
  _camera = null;
  _renderer = null;
}