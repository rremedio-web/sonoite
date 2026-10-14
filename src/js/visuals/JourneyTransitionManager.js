/**
 * STAB-10: Journey Transition Manager
 * Handles smooth idle→journey and journey→journey transitions
 * with 3-second opacity cross-fades and camera interpolation
 */

import * as THREE from 'three';
import { dispose3D } from '../utils/dispose3d.js';

export class JourneyTransitionManager {
    constructor(ctx) {
        this.ctx = ctx;
        this.camera = ctx.camera;
        this.isTransitioning = false;
        this.transitionDuration = 3000; // 3 seconds (STAB-10 requirement)
        this.currentTransition = null;

        // Camera transition state
        this.cameraStartPosition = null;
        this.cameraStartRotation = null;
        this.cameraTargetPosition = null;
        this.cameraTargetRotation = null;
    }

    /**
     * STAB-10: Perform smooth transition from idle/current journey to new journey
     * @param {Array} oldLayers - Current visual layers to fade out
     * @param {Function} loadNewLayersCallback - Async function to load new layers
     * @returns {Promise} Resolves when transition is complete
     */
    async transition(oldLayers, loadNewLayersCallback) {
        if (this.isTransitioning) {
            if (window.SONOITE_DEBUG) {
                console.log('[JourneyTransitionManager] Transition already in progress, aborting previous');
            }
            // Cancel current transition
            if (this.currentTransition) {
                this.currentTransition.abort = true;
            }
        }

        this.isTransitioning = true;
        const transitionState = { abort: false };
        this.currentTransition = transitionState;

        try {
            // STAB-10: Store initial camera state for dolly/yaw bridge
            this.storeCameraState();

            // STAB-10: Phase 1 - Prepare old layers for fade-out (make traversable)
            this.prepareLayersForFade(oldLayers);

            // STAB-10: Phase 2 - Load new layers (hidden, opacity 0)
            const newLayers = await loadNewLayersCallback();

            if (transitionState.abort) {
                if (window.SONOITE_DEBUG) {
                    console.log('[JourneyTransitionManager] Transition aborted after load');
                }
                return;
            }

            // STAB-10: Phase 3 - Prepare new layers for fade-in
            this.prepareLayersForFade(newLayers, 0); // Start at opacity 0

            // STAB-10: Phase 4 - Execute 3-second cross-fade
            await this.executeCrossFade(oldLayers, newLayers, transitionState);

            // STAB-10: Phase 5 - Cleanup old layers
            if (!transitionState.abort) {
                this.cleanupOldLayers(oldLayers);
            }

            if (window.SONOITE_DEBUG) {
                console.log('[JourneyTransitionManager] Transition complete');
            }
        } catch (error) {
            console.error('[JourneyTransitionManager] Transition error:', error);
        } finally {
            this.isTransitioning = false;
            this.currentTransition = null;
        }
    }

    /**
     * Store current camera state for interpolation
     */
    storeCameraState() {
        this.cameraStartPosition = this.camera.position.clone();
        this.cameraStartRotation = new THREE.Euler().copy(this.camera.rotation);
    }

    /**
     * Calculate target camera state for dolly/yaw bridge
     * STAB-10: Small camera dolly forward and slight yaw for cinematic transition
     */
    calculateCameraTarget() {
        // Small dolly forward (0.5 units)
        const forward = new THREE.Vector3(0, 0, -0.5);
        forward.applyQuaternion(this.camera.quaternion);
        this.cameraTargetPosition = this.cameraStartPosition.clone().add(forward);

        // Small yaw rotation (5 degrees)
        const yawOffset = THREE.MathUtils.degToRad(5);
        this.cameraTargetRotation = new THREE.Euler(
            this.cameraStartRotation.x,
            this.cameraStartRotation.y + yawOffset,
            this.cameraStartRotation.z,
            this.cameraStartRotation.order
        );
    }

    /**
     * STAB-10: Prepare layers for opacity transitions
     * Sets up traverse-able opacity on all materials
     * @param {Array} layers - Visual layers to prepare
     * @param {number} initialOpacity - Starting opacity (0 for fade-in, 1 for fade-out)
     */
    prepareLayersForFade(layers, initialOpacity = 1.0) {
        if (!layers || !Array.isArray(layers)) return;

        layers.forEach(layer => {
            if (!layer || !layer.group) return;

            layer.group.traverse(obj => {
                if (obj.material) {
                    // Handle both single material and material arrays
                    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

                    materials.forEach(mat => {
                        const uniformOpacity = mat.uniforms?.uOpacity?.value;
                        const originalOpacity = Number.isFinite(uniformOpacity)
                            ? uniformOpacity
                            : (Number.isFinite(mat.opacity) ? mat.opacity : 1.0);

                        mat.userData.originalOpacity = originalOpacity;

                        // Enable transparency
                        mat.transparent = true;

                        const newOpacity = initialOpacity * originalOpacity;
                        mat.opacity = newOpacity;
                        if (mat.uniforms?.uOpacity) {
                            mat.uniforms.uOpacity.value = newOpacity;
                        }
                    });
                }
            });
        });
    }

    /**
     * STAB-10: Execute 3-second cross-fade with camera interpolation
     * @param {Array} oldLayers - Layers to fade out
     * @param {Array} newLayers - Layers to fade in
     * @param {Object} transitionState - Transition control state
     */
    async executeCrossFade(oldLayers, newLayers, transitionState) {
        return new Promise((resolve) => {
            const startTime = performance.now();

            // Calculate camera target for dolly/yaw bridge
            this.calculateCameraTarget();

            const animate = () => {
                if (transitionState.abort) {
                    resolve();
                    return;
                }

                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / this.transitionDuration, 1.0);

                // STAB-10: Smooth easing (ease-in-out cubic)
                const easeProgress = this.easeInOutCubic(progress);

                // STAB-10: Fade out old layers
                this.updateLayerOpacity(oldLayers, 1.0 - easeProgress);

                // STAB-10: Fade in new layers
                this.updateLayerOpacity(newLayers, easeProgress);

                // STAB-10: Camera dolly/yaw bridge
                this.updateCamera(easeProgress);

                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Update layer opacity during transition
     * PHASE-0.3-FIX: Now syncs uOpacity uniform for shader materials
     * @param {Array} layers - Layers to update
     * @param {number} targetOpacity - Target opacity (0-1)
     */
    updateLayerOpacity(layers, targetOpacity) {
        if (!layers || !Array.isArray(layers)) return;

        layers.forEach(layer => {
            if (!layer || !layer.group) return;

            let layerOpacity = null;

            layer.group.traverse(obj => {
                if (obj.material) {
                    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

                    materials.forEach(mat => {
                        const originalOpacity = Number.isFinite(mat.userData?.originalOpacity)
                            ? mat.userData.originalOpacity
                            : 1.0;
                        const newOpacity = targetOpacity * originalOpacity;

                        // Standard material opacity
                        mat.opacity = newOpacity;

                        // PHASE-0.3-FIX: Sync shader uniforms for custom materials
                        if (mat.uniforms?.uOpacity) {
                            mat.uniforms.uOpacity.value = newOpacity;
                        }

                        layerOpacity = layerOpacity === null ? newOpacity : Math.max(layerOpacity, newOpacity);
                    });
                }
            });

            // Layer-level setOpacity hook (for layers with custom opacity control)
            if (typeof layer.setOpacity === 'function') {
                layer.setOpacity(layerOpacity === null ? targetOpacity : layerOpacity);
            }
        });
    }

    /**
     * STAB-10: Update camera position/rotation during transition
     * @param {number} progress - Transition progress (0-1)
     */
    updateCamera(progress) {
        if (!this.cameraStartPosition || !this.cameraTargetPosition) return;

        const easeProgress = this.easeInOutCubic(progress);

        // Interpolate position
        this.camera.position.lerpVectors(
            this.cameraStartPosition,
            this.cameraTargetPosition,
            easeProgress
        );

        // Interpolate rotation
        if (this.cameraStartRotation && this.cameraTargetRotation) {
            this.camera.rotation.x = THREE.MathUtils.lerp(
                this.cameraStartRotation.x,
                this.cameraTargetRotation.x,
                easeProgress
            );
            this.camera.rotation.y = THREE.MathUtils.lerp(
                this.cameraStartRotation.y,
                this.cameraTargetRotation.y,
                easeProgress
            );
            this.camera.rotation.z = THREE.MathUtils.lerp(
                this.cameraStartRotation.z,
                this.cameraTargetRotation.z,
                easeProgress
            );
        }
    }

    /**
     * Cleanup old layers after fade-out
     * @param {Array} oldLayers - Layers to dispose
     */
    cleanupOldLayers(oldLayers) {
        if (!oldLayers || !Array.isArray(oldLayers)) return;

        oldLayers.forEach(layer => {
            if (!layer) return;

            // MEMORY-LEAK-FIX: Properly dispose geometries and materials first
            if (layer.group) {
                dispose3D(layer.group);
            }

            // Then dispose layer (calls unmount/dispose in layer-api)
            if (layer.dispose) {
                layer.dispose();
            } else if (layer.unmount) {
                layer.unmount();
            }

            // Double-check group removal from scene
            if (layer.group && this.ctx.scene) {
                if (this.ctx.scene.children.includes(layer.group)) {
                    this.ctx.scene.remove(layer.group);
                }
            }
        });
    }

    /**
     * Smooth cubic easing function
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased value (0-1)
     */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Dispose transition manager
     */
    dispose() {
        if (this.currentTransition) {
            this.currentTransition.abort = true;
        }
        this.isTransitioning = false;
        this.currentTransition = null;
    }
}
