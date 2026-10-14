/**
 * Transition Engine - Smooth consciousness state transitions
 * Manages camera movement and visual transitions between consciousness states
 */

import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class TransitionEngine {
    constructor(camera) {
        this.camera = camera;
        this.isTransitioning = false;
        this.transitionStyle = 'flowing';
        this.transitionSpeed = 1.0;
        this.currentTransition = null;
        
        // Camera state management
        this.cameraStates = {
            flow: {
                position: new THREE.Vector3(-3, 0, 8),
                target: new THREE.Vector3(-3, 0, 0),
                fov: 75
            },
            structure: {
                position: new THREE.Vector3(3, 0, 8),
                target: new THREE.Vector3(3, 0, 0),
                fov: 60
            },
            balanced: {
                position: new THREE.Vector3(0, 0, 10),
                target: new THREE.Vector3(0, 0, 0),
                fov: 75
            }
        };

        // Transition effects
        this.transitionEffects = {
            flowing: this.createFlowingTransition.bind(this),
            constrained: this.createConstrainedTransition.bind(this),
            crystallizing: this.createCrystallizingTransition.bind(this),
            fading: this.createFadingTransition.bind(this),
            dissolving: this.createDissolvingTransition.bind(this),
            layering: this.createLayeringTransition.bind(this),
            organizing: this.createOrganizingTransition.bind(this)
        };

        // Performance monitoring
        this.performanceMode = this.detectPerformanceMode();
        
        this.init();
    }

    init() {
        // Initialize camera tracking
        this.baseCameraPosition = this.camera.position.clone();
        this.baseCameraTarget = new THREE.Vector3(0, 0, 0);
        
        // Create transition overlay for visual effects
        this.createTransitionOverlay();
        
        dlog(`Transition Engine initialized in ${this.performanceMode} performance mode`);
    }

    detectPerformanceMode() {
        // Detect device performance capabilities
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasHighPerformance = window.innerWidth > 1200 && !isMobile;
        
        if (isMobile) return 'low';
        if (hasHighPerformance) return 'high';
        return 'medium';
    }

    createTransitionOverlay() {
        // Create a subtle overlay for transition effects (if needed)
        // This could be expanded for more complex visual transitions
        this.transitionOverlay = {
            opacity: 0,
            color: new THREE.Color(0x000000),
            active: false
        };
    }

    setTransitionStyle(style) {
        this.transitionStyle = style;
        
        // Adjust transition speed based on style
        const speedMap = {
            flowing: 1.0,
            constrained: 0.6,
            crystallizing: 0.8,
            fading: 1.2,
            dissolving: 1.5,
            layering: 0.7,
            organizing: 0.5
        };
        
        this.transitionSpeed = speedMap[style] || 1.0;
        
        // Adjust for performance
        if (this.performanceMode === 'low') {
            this.transitionSpeed *= 1.5; // Faster transitions on low-end devices
        }
    }

    transitionToConsciousnessState(consciousnessLevel, duration = 3000) {
        if (this.isTransitioning) {
            this.cancelCurrentTransition();
        }

        const targetState = this.getStateFromLevel(consciousnessLevel);
        const transitionEffect = this.transitionEffects[this.transitionStyle] || this.transitionEffects.flowing;
        
        this.currentTransition = transitionEffect(targetState, duration);
        this.isTransitioning = true;
        
        return this.currentTransition;
    }

    getStateFromLevel(level) {
        if (level < 0.3) return 'flow';
        if (level > 0.7) return 'structure';
        return 'balanced';
    }

    createFlowingTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const initialTarget = this.baseCameraTarget.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();
        const targetFov = this.cameraStates[targetState].fov;
        const initialFov = this.camera.fov;

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth flowing easing
                const easeProgress = this.easeInOutSine(progress);
                
                // Camera position with organic movement
                const organicOffset = this.getOrganicOffset(elapsed * 0.001, 0.2);
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.camera.position.add(organicOffset);
                
                // Camera target
                this.baseCameraTarget.lerpVectors(initialTarget, targetTarget, easeProgress);
                this.camera.lookAt(this.baseCameraTarget);
                
                // FOV transition
                this.camera.fov = THREE.MathUtils.lerp(initialFov, targetFov, easeProgress);
                this.camera.updateProjectionMatrix();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createConstrainedTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Constrained, rigid easing
                const easeProgress = this.easeInOutQuart(progress);
                
                // Restricted movement
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.baseCameraTarget.lerp(targetTarget, easeProgress * 0.5); // Slower target movement
                this.camera.lookAt(this.baseCameraTarget);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createCrystallizingTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Crystallizing effect - slow start, sharp finish
                const easeProgress = this.easeInExpo(progress);
                
                // Sharp, precise movement
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.baseCameraTarget.lerp(targetTarget, easeProgress);
                this.camera.lookAt(this.baseCameraTarget);
                
                // Add slight geometric precision to movement
                const geometricOffset = this.getGeometricOffset(elapsed * 0.001, 0.1);
                this.camera.position.add(geometricOffset);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createFadingTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Gentle fading easing
                const easeProgress = this.easeOutQuad(progress);
                
                // Slow, gentle movement
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.baseCameraTarget.lerp(targetTarget, easeProgress);
                this.camera.lookAt(this.baseCameraTarget);
                
                // Fade effect simulation through position dampening
                const dampening = 1 - (progress * 0.3);
                this.camera.position.multiplyScalar(dampening);
                this.camera.position.divideScalar(dampening);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createDissolvingTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Dissolving effect - nonlinear, organic
                const easeProgress = this.easeInOutElastic(progress);
                
                // Dissolving movement with random elements
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.baseCameraTarget.lerp(targetTarget, easeProgress);
                
                // Add dissolution noise
                const dissolutionNoise = this.getDissolutionNoise(elapsed * 0.001, progress);
                this.camera.position.add(dissolutionNoise);
                
                this.camera.lookAt(this.baseCameraTarget);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createLayeringTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Layered movement - multiple phases
                const phase1 = Math.min(progress * 2, 1);
                const phase2 = Math.max(0, Math.min((progress - 0.5) * 2, 1));
                
                const easeProgress1 = this.easeInOutQuad(phase1);
                const easeProgress2 = this.easeInOutQuad(phase2);
                
                // Layer 1: Main movement
                const pos1 = new THREE.Vector3().lerpVectors(initialPosition, targetPosition, easeProgress1 * 0.7);
                
                // Layer 2: Fine adjustment
                const pos2 = new THREE.Vector3().lerpVectors(pos1, targetPosition, easeProgress2);
                
                this.camera.position.copy(pos2);
                this.baseCameraTarget.lerp(targetTarget, easeProgress1);
                this.camera.lookAt(this.baseCameraTarget);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    createOrganizingTransition(targetState, duration) {
        const startTime = performance.now();
        const initialPosition = this.camera.position.clone();
        const targetPosition = this.cameraStates[targetState].position.clone();
        const targetTarget = this.cameraStates[targetState].target.clone();

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Organizing - systematic, precise
                const easeProgress = this.easeInOutCubic(progress);
                
                // Systematic movement with mathematical precision
                this.camera.position.lerpVectors(initialPosition, targetPosition, easeProgress);
                this.baseCameraTarget.lerp(targetTarget, easeProgress);
                
                // Mathematical precision adjustment
                const organizingOffset = this.getOrganizingOffset(elapsed * 0.001, progress);
                this.camera.position.add(organizingOffset);
                
                this.camera.lookAt(this.baseCameraTarget);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isTransitioning = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    // Utility functions for organic and geometric offsets
    getOrganicOffset(time, amplitude) {
        return new THREE.Vector3(
            Math.sin(time * 0.7) * amplitude * 0.5,
            Math.cos(time * 0.5) * amplitude * 0.3,
            Math.sin(time * 0.9) * amplitude * 0.2
        );
    }

    getGeometricOffset(time, amplitude) {
        const goldenRatio = 1.618033988749;
        return new THREE.Vector3(
            Math.sin(time * goldenRatio) * amplitude,
            Math.cos(time * goldenRatio * 2) * amplitude * 0.5,
            Math.sin(time * goldenRatio * 3) * amplitude * 0.3
        );
    }

    getDissolutionNoise(time, progress) {
        const intensity = (1 - progress) * 0.5; // Fade out noise as transition completes
        return new THREE.Vector3(
            (Math.random() - 0.5) * intensity,
            (Math.random() - 0.5) * intensity,
            (Math.random() - 0.5) * intensity
        );
    }

    getOrganizingOffset(time, progress) {
        // Mathematical precision that becomes more organized over time
        const organization = progress * 2; // Increase organization
        const goldenRatio = 1.618033988749;
        
        return new THREE.Vector3(
            Math.sin(time * goldenRatio * organization) * (1 - progress) * 0.1,
            Math.cos(time * goldenRatio * 2 * organization) * (1 - progress) * 0.05,
            0
        );
    }

    // Easing functions
    easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    easeInOutElastic(t) {
        const c5 = (2 * Math.PI) / 4.5;
        
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }

    update(time, consciousnessLevel) {
        // Update camera based on consciousness level if not transitioning
        if (!this.isTransitioning) {
            this.updateCameraForConsciousnessLevel(consciousnessLevel, time);
        }
        
        // Update transition overlay effects
        this.updateTransitionEffects(time);
    }

    updateCameraForConsciousnessLevel(level, time) {
        // Subtle camera adjustments based on consciousness level
        const flowInfluence = Math.max(0, 1 - level * 1.5);
        const structureInfluence = Math.max(0, (level - 0.3) * 1.5);
        
        // Organic camera sway for flow consciousness
        if (flowInfluence > 0.1) {
            const organicSway = this.getOrganicOffset(time, flowInfluence * 0.1);
            this.camera.position.add(organicSway);
        }
        
        // Precise positioning for structure consciousness
        if (structureInfluence > 0.1) {
            const precision = this.getGeometricOffset(time, structureInfluence * 0.05);
            this.camera.position.add(precision);
        }
    }

    updateTransitionEffects(time) {
        // Update any ongoing transition overlay effects
        if (this.transitionOverlay.active) {
            // Could implement visual overlay effects here
            // For now, we focus on camera-based transitions
        }
    }

    cancelCurrentTransition() {
        this.isTransitioning = false;
        if (this.currentTransition && typeof this.currentTransition.cancel === 'function') {
            this.currentTransition.cancel();
        }
        this.currentTransition = null;
    }

    // Camera state management
    setCameraState(state, duration = 2000) {
        if (this.cameraStates[state]) {
            return this.transitionToConsciousnessState(
                state === 'flow' ? 0.2 : state === 'structure' ? 0.8 : 0.5,
                duration
            );
        }
    }

    getCurrentCameraState() {
        // Determine current camera state based on position
        const pos = this.camera.position;
        const flowDistance = pos.distanceTo(this.cameraStates.flow.position);
        const structureDistance = pos.distanceTo(this.cameraStates.structure.position);
        const balancedDistance = pos.distanceTo(this.cameraStates.balanced.position);
        
        if (flowDistance < structureDistance && flowDistance < balancedDistance) {
            return 'flow';
        } else if (structureDistance < balancedDistance) {
            return 'structure';
        } else {
            return 'balanced';
        }
    }

    // Performance optimization
    setPerformanceMode(mode) {
        this.performanceMode = mode;
        
        // Adjust transition complexity based on performance
        if (mode === 'low') {
            this.transitionSpeed *= 1.5;
            // Disable complex transition effects
            Object.keys(this.transitionEffects).forEach(key => {
                if (['dissolving', 'layering'].includes(key)) {
                    this.transitionEffects[key] = this.transitionEffects.flowing;
                }
            });
        }
    }

    dispose() {
        // Cancel any ongoing transitions
        this.cancelCurrentTransition();
        
        // Reset camera to original state
        this.camera.position.copy(this.baseCameraPosition);
        this.camera.lookAt(0, 0, 0);
        
        dlog('Transition Engine disposed');
    }
}