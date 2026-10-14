/**
 * Consciousness System - Universal sleep and awareness state visualization
 * Integrates with existing SonoiteExperience without breaking functionality
 */

import * as THREE from 'three';
import { FlowConsciousness } from './modules/flow-consciousness.js';
import { StructureConsciousness } from './modules/structure-consciousness.js';
import { TransitionEngine } from './modules/transition-engine.js';
// DISABLED: import { AudioConsciousness } from './modules/audio-consciousness.js';
import { dlog, dwarn, derr } from './utils/devlog.js';

// Import Visual Layer API components
import './visuals/register-defaults.js'; // Register all visual types
import { ConsciousnessAdapter } from './visuals/consciousness-adapter.js';
// Force import of HeavyFog to ensure it's included in build
import { HeavyFog } from './visuals/flows/HeavyFog.js';
window.HeavyFog = HeavyFog; // Expose for testing

// Singleton instance
let consciousnessSystemInstance = null;

export class ConsciousnessSystem {
    constructor(scene, camera, audioManager, existingExperience = null) {
        // Implement singleton pattern
        if (consciousnessSystemInstance) {
            dwarn('ConsciousnessSystem already exists, returning existing instance');
            // Dispose of old instance's performance monitoring to prevent conflicts
            if (consciousnessSystemInstance.performanceCheck) {
                clearInterval(consciousnessSystemInstance.performanceCheck);
                consciousnessSystemInstance.performanceCheck = null;
            }
            return consciousnessSystemInstance;
        }
        
        this.scene = scene;
        this.camera = camera;
        this.audioManager = audioManager;
        this.existingExperience = existingExperience;

        // Consciousness state (0 = pure flow/dream, 1 = pure structure/awareness)
        this.consciousnessLevel = 0.5;
        this.targetConsciousnessLevel = 0.5;

        // Current track context
        this.currentTrack = 0;
        this.isInitialized = false;
        this.isEnabled = true;
        this.quality = 'high'; // Track current quality level
        
        /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
        // Optional consciousness core feature flag
        // MP9-FIX: Changed to true to align with recovery note and journey JSON approach
        this.enableConsciousnessCore = true; // Default ON (controlled by journey.consciousness.enabled)
        this.consciousnessCore = null;
        /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

        // Performance monitoring
        this.performanceMonitor = {
            frameCount: 0,
            lastTime: performance.now(),
            avgFPS: 60
        };

        // Store instance
        consciousnessSystemInstance = this;
        
        // Expose to window for testing
        if (typeof window !== 'undefined') {
            window.consciousnessSystem = this;
        }

        this.init();
    }

    init() {
        try {
            // Validate existing experience compatibility
            this.validateExistingExperience();

            // Initialize Visual Layer API adapter for journey system
            this.visualAdapter = new ConsciousnessAdapter(this.scene, this.audioManager, this.camera);
            
            // Enable Visual Layer API by default - using journey system for all tracks
            this.useVisualLayerAPI = true; // Using Visual Layer API with journey-specific placeholders
            // Actively enable and purge legacy/abstract groups so journeys are the only visuals
            this.enableVisualLayerAPI(true);
            
            // Only create legacy consciousness if Visual Layer API is disabled
            if (!this.useVisualLayerAPI) {
                // Initialize consciousness components
                this.flowConsciousness = new FlowConsciousness(this.scene, this.audioManager);
                this.structureConsciousness = new StructureConsciousness(this.scene, this.audioManager);
                
                // Position consciousness realms closer to camera
                this.flowConsciousness.setPosition(-3, 0, 0);
                this.structureConsciousness.setPosition(3, 0, 0);
            } else {
                // Create placeholder objects for compatibility but don't add to scene
                this.flowConsciousness = { update: () => {}, selectTrack: () => {} };
                this.structureConsciousness = { update: () => {}, selectTrack: () => {} };
                
                dlog('🎨 Visual Layer API enabled - legacy consciousness disabled');
                
                // Load idle state instead of Track 1
                dlog('🎨 Loading idle state for initial visuals');
                this.visualAdapter.loadIdleState();
            }
            
            this.transitionEngine = new TransitionEngine(this.camera);
            this.audioConsciousness = new AudioConsciousness(this.audioManager);
            
            /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
            // Initialize optional consciousness core if enabled
            if (this.enableConsciousnessCore) {
                this.initializeConsciousnessCore();
            }
            /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

            // Setup universal track consciousness mappings (no cultural references)
            this.setupUniversalTrackMappings();

            // Setup consciousness navigation controls
            this.setupConsciousnessNavigation();

            // Disable local performance monitoring - use global monitor instead
            // this.setupPerformanceMonitoring();

            this.isInitialized = true;
            this.announceSystemReady();

            if (window.SONOITE_DEBUG) {
                dlog('Consciousness System initialized successfully');
            }

        } catch (error) {
            derr('Consciousness System initialization failed:', error);
            this.initializeFallbackMode();
        }
    }

    validateExistingExperience() {
        if (this.existingExperience) {
            // Check for required methods
            const requiredMethods = ['selectTrack', 'animate', 'update'];
            for (const method of requiredMethods) {
                if (typeof this.existingExperience[method] !== 'function') {
                    if (window.SONOITE_DEBUG) {
                        dwarn(`Existing experience missing method: ${method}`);
                    }
                }
            }

            // Check for audio manager
            if (!this.audioManager || typeof this.audioManager.getFrequencyData !== 'function') {
                throw new Error('AudioManager with getFrequencyData method required');
            }

            if (window.SONOITE_DEBUG) {
                dlog('Existing experience validation passed');
            }
        }
    }
    
    /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
    async initializeConsciousnessCore() {
        try {
            // Dynamically import ConsciousnessCore
            const { ConsciousnessCore } = await import('./modules/consciousness-core.js');
            
            // Create consciousness core (existing class expects scene, audioManager)
            this.consciousnessCore = new ConsciousnessCore(this.scene, this.audioManager);
            
            // Position at center
            this.consciousnessCore.setPosition(0, 0, 0);
            
            if (window.SONOITE_DEBUG) {
                dlog('Optional Consciousness Core initialized');
            }
        } catch (error) {
            derr('Failed to initialize Consciousness Core:', error);
            // Don't break the main system if core fails
            this.enableConsciousnessCore = false;
            this.consciousnessCore = null;
        }
    }
    /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

    setupUniversalTrackMappings() {
        // Universal consciousness mappings based on sleep/awareness states
        // No cultural references - purely abstract consciousness concepts
        this.trackConsciousness = {
            0: { // Track 1 - Gentle nocturnal drift
                name: 'nocturnal_drift',
                flowState: 'gentle_waves',
                structureState: 'soft_geometry',
                consciousnessLevel: 0.3,
                transitionStyle: 'flowing',
                intensity: 0.6,
                description: 'Gentle transition into sleep consciousness'
            },
            1: { // Track 2 - Paralyzed awareness (sleep paralysis)
                name: 'frozen_awareness',
                flowState: 'restricted_flow',
                structureState: 'rigid_patterns',
                consciousnessLevel: 0.8,
                transitionStyle: 'constrained',
                intensity: 0.9,
                description: 'High awareness with restricted movement'
            },
            2: { // Track 3 - Knowledge absorption
                name: 'learning_state',
                flowState: 'absorbing_patterns',
                structureState: 'information_grid',
                consciousnessLevel: 0.6,
                transitionStyle: 'crystallizing',
                intensity: 0.7,
                description: 'Consciousness absorbing and structuring information'
            },
            3: { // Track 4 - Deep sleep / inactive hours
                name: 'deep_rest',
                flowState: 'minimal_activity',
                structureState: 'dormant_order',
                consciousnessLevel: 0.2,
                transitionStyle: 'fading',
                intensity: 0.3,
                description: 'Minimal consciousness activity, deep rest'
            },
            4: { // Track 5 - Ego dissolution / wanting nothing
                name: 'ego_dissolution',
                flowState: 'formless_void',
                structureState: 'deconstructed_patterns',
                consciousnessLevel: 0.5,
                transitionStyle: 'dissolving',
                intensity: 0.1,
                description: 'Complete dissolution of structured consciousness'
            },
            5: { // Track 6 - Generational patterns / inheritance
                name: 'inherited_patterns',
                flowState: 'echoing_forms',
                structureState: 'nested_structures',
                consciousnessLevel: 0.7,
                transitionStyle: 'layering',
                intensity: 0.8,
                description: 'Layered consciousness with inherited structural patterns'
            },
            6: { // Track 7 - Conditioned/educated mind
                name: 'structured_awareness',
                flowState: 'channeled_flow',
                structureState: 'perfect_order',
                consciousnessLevel: 0.9,
                transitionStyle: 'organizing',
                intensity: 0.8,
                description: 'Highly organized, conditioned consciousness patterns'
            }
        };
    }

    setupConsciousnessNavigation() {
        // Mouse/touch interaction for consciousness exploration
        let mouseX = 0;
        let mouseY = 0;
        let isDragging = false;

        const handleMouseMove = (event) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

            if (!isDragging) {
                this.updateConsciousnessFromInput(mouseX, mouseY);
            }
        };

        const handleTouchMove = (event) => {
            event.preventDefault();
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
                mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
                this.updateConsciousnessFromInput(mouseX, mouseY);
            }
        };

        const handleMouseDown = () => {
            isDragging = true;
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        // Add event listeners
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('mousedown', handleMouseDown, { passive: true });
        document.addEventListener('mouseup', handleMouseUp, { passive: true });

        // Keyboard navigation for accessibility
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowLeft':
                    this.shiftConsciousness(-0.1);
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    this.shiftConsciousness(0.1);
                    event.preventDefault();
                    break;
                case 'ArrowUp':
                    this.increaseConsciousnessIntensity();
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    this.decreaseConsciousnessIntensity();
                    event.preventDefault();
                    break;
                case ' ':
                    this.resetConsciousness();
                    event.preventDefault();
                    break;
                case 'c':
                    this.toggleConsciousnessSystem();
                    event.preventDefault();
                    break;
            }
        });

        // Store references for cleanup
        this.eventHandlers = {
            handleMouseMove,
            handleTouchMove,
            handleMouseDown,
            handleMouseUp
        };
    }

    updateConsciousnessFromInput(mouseX, mouseY) {
        // Map horizontal mouse position to consciousness level
        // Left side = flow/dream consciousness, Right side = structure/aware consciousness
        const newLevel = Math.max(0, Math.min(1, (mouseX + 1) / 2));
        this.targetConsciousnessLevel = newLevel;

        // Vertical position affects intensity and transition speed
        const intensity = Math.max(0.1, Math.min(1, (mouseY + 1) / 2));
        this.updateConsciousnessIntensity(intensity);
    }

    shiftConsciousness(delta) {
        this.targetConsciousnessLevel = Math.max(0, Math.min(1, this.targetConsciousnessLevel + delta));
        this.announceConsciousnessState();
    }

    increaseConsciousnessIntensity() {
        const currentTrack = this.trackConsciousness[this.currentTrack];
        if (currentTrack) {
            currentTrack.intensity = Math.min(1, currentTrack.intensity + 0.1);
        }
    }

    decreaseConsciousnessIntensity() {
        const currentTrack = this.trackConsciousness[this.currentTrack];
        if (currentTrack) {
            currentTrack.intensity = Math.max(0.1, currentTrack.intensity - 0.1);
        }
    }

    resetConsciousness() {
        this.targetConsciousnessLevel = 0.5;
        this.announceConsciousnessState();
    }

    toggleConsciousnessSystem() {
        this.isEnabled = !this.isEnabled;
        const state = this.isEnabled ? 'enabled' : 'disabled';
        this.announceToScreenReader(`Consciousness system ${state}`);
    }

    announceConsciousnessState() {
        let state = 'balanced awareness';
        if (this.consciousnessLevel < 0.3) {
            state = 'flow consciousness - dream-like state';
        } else if (this.consciousnessLevel > 0.7) {
            state = 'structured consciousness - aware state';
        }

        this.announceToScreenReader(`Consciousness state: ${state}`);
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-9999px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }

    announceSystemReady() {
        this.announceToScreenReader('Consciousness visualization system ready. Use arrow keys or mouse to explore consciousness states.');
    }

    setupPerformanceMonitoring() {
        // Skip if already monitoring
        if (this.performanceCheck) {
            if (window.SONOITE_DEBUG) {
                dwarn('Performance monitoring already active in consciousness system');
            }
            return;
        }
        
        // Monitor performance and adjust quality automatically
        this.performanceCheck = setInterval(() => {
            const now = performance.now();
            const deltaTime = now - this.performanceMonitor.lastTime;

            if (deltaTime >= 1000) {
                this.performanceMonitor.avgFPS = this.performanceMonitor.frameCount;
                this.performanceMonitor.frameCount = 0;
                this.performanceMonitor.lastTime = now;

                // Automatic quality adjustment with hysteresis to prevent oscillation
                if (this.performanceMonitor.avgFPS < 25 && this.quality !== 'low') {
                    this.reduceQuality();
                } else if (this.performanceMonitor.avgFPS > 58 && this.quality !== 'high') {
                    this.increaseQuality();
                }
            }
        }, 1000);
    }

    reduceQuality() {
        if (this.flowConsciousness) {
            this.flowConsciousness.reduceQuality();
        }
        if (this.structureConsciousness) {
            this.structureConsciousness.reduceQuality();
        }
        // Update quality level
        if (this.quality === 'high') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'low';
        }
        if (window.SONOITE_DEBUG) {
            dlog('Consciousness system: Reduced quality for performance');
        }
    }

    increaseQuality() {
        if (this.flowConsciousness && this.performanceMonitor.avgFPS > 58) {
            this.flowConsciousness.increaseQuality();
        }
        if (this.structureConsciousness && this.performanceMonitor.avgFPS > 58) {
            this.structureConsciousness.increaseQuality();
        }
        // Update quality level
        if (this.quality === 'low') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'high';
        }
    }

    updateConsciousnessIntensity(intensity) {
        const currentTrack = this.trackConsciousness[this.currentTrack];
        if (currentTrack) {
            currentTrack.intensity = Math.max(0.1, Math.min(1, intensity));
        }
    }

    transitionToTrack(trackIndex) {
        console.log('[ConsciousnessSystem] transitionToTrack called with index:', trackIndex);
        
        // Prevent duplicate transitions to the same track
        if (this.isTransitioning || this.currentTrack === trackIndex) {
            console.log('[ConsciousnessSystem] Already transitioning or same track, skipping');
            return;
        }
        
        console.log('[ConsciousnessSystem] isInitialized:', this.isInitialized);
        console.log('[ConsciousnessSystem] trackConsciousness exists:', !!this.trackConsciousness[trackIndex]);
        console.log('[ConsciousnessSystem] useVisualLayerAPI:', this.useVisualLayerAPI);
        console.log('[ConsciousnessSystem] visualAdapter exists:', !!this.visualAdapter);
        
        if (!this.isInitialized || !this.trackConsciousness[trackIndex]) {
            console.warn('[ConsciousnessSystem] Cannot transition - not initialized or invalid track');
            return;
        }
        
        this.isTransitioning = true;
        const consciousness = this.trackConsciousness[trackIndex];
        this.currentTrack = trackIndex;
        
        // If using Visual Layer API, load the journey for this track
        if (this.useVisualLayerAPI && this.visualAdapter) {
            console.log('[ConsciousnessSystem] Loading journey for track:', trackIndex);
            // Load the journey for this specific track
            this.loadTrackJourney(trackIndex);
        } else {
            console.log('[ConsciousnessSystem] NOT using Visual Layer API, using legacy system');
        }

        try {
            // Only do legacy transitions if NOT using Visual Layer API
            if (!this.useVisualLayerAPI) {
                // Set target consciousness level for this track
                this.targetConsciousnessLevel = consciousness.consciousnessLevel;

                // Transition consciousness realms to track-specific states
                this.flowConsciousness.transitionTo(consciousness.flowState, 3.0);
                this.structureConsciousness.transitionTo(consciousness.structureState, 3.0);

                // Setup transition engine for this track's style
                this.transitionEngine.setTransitionStyle(consciousness.transitionStyle);

                // Configure audio-consciousness mapping for this track
                this.audioConsciousness.configureForTrack(consciousness);
            }

            if (window.SONOITE_DEBUG) {
                dlog(`Consciousness transition to track ${trackIndex}: ${consciousness.name}`);
            }
            this.announceToScreenReader(`Entering ${consciousness.description}`);

        } catch (error) {
            console.error('Failed to transition consciousness to track:', error);
        } finally {
            // Reset transitioning flag after a delay to allow async operations to complete
            setTimeout(() => {
                this.isTransitioning = false;
                console.log('[ConsciousnessSystem] Transition complete, flag reset');
            }, 500);
        }
    }
    
    applySleepParalysisEffects(audioData) {
        if (!this.flowConsciousness || !this.structureConsciousness) return;
        
        // Extract audio features
        const loudness = audioData?.meyda?.loudness || 0;
        const centroid = audioData?.meyda?.spectralCentroid || 0;
        
        // Normalize values
        const normalizedLoudness = Math.min(loudness / 30, 1);
        // Normalize centroid to Nyquist frequency (sample rate / 2)
        const nyquist = 22050; // Half of typical 44.1kHz sample rate
        const normalizedCentroid = Math.min(centroid / nyquist, 1);
        
        // 1. Breathing/Pulsing effect - like a heavy weight on chest
        const breathingRate = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
        const chestPressure = breathingRate * (1 + normalizedLoudness);
        
        // Apply to flow realm - make it pulse and distort
        if (this.flowRealm && this.flowRealm.mesh) {
            this.flowRealm.mesh.scale.setScalar(0.8 + chestPressure * 0.2);
            this.flowRealm.mesh.rotation.z = Math.sin(performance.now() * 0.0005) * 0.1;
        }
        
        // 2. Shadow figures at periphery - appearing on loud sounds
        if (normalizedLoudness > 0.6 && this.structureRealm) {
            // Make structure realm flicker and glitch
            if (this.structureRealm.mesh && Math.random() > 0.1) {
                this.structureRealm.mesh.visible = Math.random() > 0.05;
                this.structureRealm.mesh.position.x += (Math.random() - 0.5) * 0.5;
                this.structureRealm.mesh.position.y += (Math.random() - 0.5) * 0.5;
                // Reset position slowly
                this.structureRealm.mesh.position.lerp(new THREE.Vector3(0, 0, 0), 0.05);
            }
        }
        
        // 3. Reality distortion - warping based on frequency
        const distortionAmount = normalizedCentroid * 0.3;
        if (this.flowConsciousness.hazeSystem && this.flowConsciousness.hazeSystem.uniforms) {
            this.flowConsciousness.hazeSystem.uniforms.uDistortion = { value: distortionAmount };
        }
        
        // 4. Oppressive darkness - modulate scene brightness
        if (this.scene && this.scene.children) {
            // Make everything darker and more oppressive
            const darkness = 1 - normalizedLoudness * 0.5;
            this.scene.children.forEach(child => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = child.userData.originalOpacity * darkness || darkness;
                }
            });
        }
        
        // 5. Strobe/flash effect on very loud sounds
        if (loudness > 25) {
            // Create a flash by temporarily brightening everything
            this.scene.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.setScalar(0.5);
                    setTimeout(() => {
                        child.material.emissive.setScalar(0);
                    }, 50);
                }
            });
        }
    }

    update(time, audioData) {
        if (!this.isInitialized || !this.isEnabled) {
            return;
        }

        // Debug log to verify update is called with proper data
        if (window.SONOITE_DEBUG && Math.random() < 0.02) {
            console.log('🧠 ConsciousnessSystem.update:', {
                time: time.toFixed(0),
                hasAudioData: !!audioData,
                hasMeyda: !!audioData?.meyda,
                meydaLoudness: audioData?.meyda?.loudness,
                meydaCentroid: audioData?.meyda?.spectralCentroid,
                flowVisible: this.flowConsciousness?.flowGroup?.visible,
                structureVisible: this.structureConsciousness?.structureGroup?.visible
            });
        }

        // Update performance monitoring
        this.performanceMonitor.frameCount++;

        try {
            // Smooth consciousness level transitions
            this.consciousnessLevel = THREE.MathUtils.lerp(
                this.consciousnessLevel,
                this.targetConsciousnessLevel,
                0.02
            );

            // Process audio data for consciousness mapping
            const processedAudioData = this.audioConsciousness.process(audioData);
            
            // Debug audio processing pipeline
            if (window.SONOITE_DEBUG && Math.random() < 0.02) { // Log occasionally
                console.log('🎵 Audio Processing Debug:', {
                    inputAudio: {
                        bass: audioData.bassLevel?.toFixed(3),
                        mid: audioData.midLevel?.toFixed(3),
                        treble: audioData.trebleLevel?.toFixed(3),
                        hasMeyda: !!audioData.meyda
                    },
                    processedAudio: {
                        bass: processedAudioData.bassLevel?.toFixed(3),
                        mid: processedAudioData.midLevel?.toFixed(3),
                        treble: processedAudioData.trebleLevel?.toFixed(3),
                        flowConsciousness: processedAudioData.flowConsciousness?.toFixed(3),
                        structureConsciousness: processedAudioData.structureConsciousness?.toFixed(3)
                    }
                });
            }

            // Merge original audioData with processed data to ensure nothing is lost
            const mergedAudioData = {
                ...audioData,
                ...processedAudioData,
                meyda: audioData.meyda // Ensure meyda data is preserved
            };
            
            // Update based on which system is active
            if (this.useVisualLayerAPI && this.visualAdapter) {
                // Use new Visual Layer API system
                // Calculate actual delta time
                if (!this.lastUpdateTime) {
                    this.lastUpdateTime = time;
                }
                const dt = (time - this.lastUpdateTime) * 0.001; // Delta time in seconds
                this.lastUpdateTime = time;
                
                this.visualAdapter.update(dt);
            } else {
                // Use original consciousness realms
                this.flowConsciousness.update(time, mergedAudioData, this.consciousnessLevel);
                this.structureConsciousness.update(time, mergedAudioData, this.consciousnessLevel);
            }
            
            /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
            // Update optional consciousness core if enabled
            if (this.enableConsciousnessCore && this.consciousnessCore) {
                this.consciousnessCore.update(time, mergedAudioData);
            }
            /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

            // Update transition engine
            this.transitionEngine.update(time, this.consciousnessLevel);

            // Apply consciousness influence to realms (skip if using Visual Layer API)
            if (!this.useVisualLayerAPI) {
                this.applyConsciousnessInfluence(processedAudioData);
            }

        } catch (error) {
            console.error('Consciousness system update failed:', error);
            // Don't break the main experience - continue without consciousness effects
        }
    }

    applyConsciousnessInfluence(audioData) {
        // Calculate influence based on consciousness level
        // 0 = pure flow, 1 = pure structure, 0.5 = balanced

        let flowInfluence = Math.max(0, 1 - this.consciousnessLevel * 1.5);
        let structureInfluence = Math.max(0, (this.consciousnessLevel - 0.3) * 1.5);
        const balanceInfluence = 1 - Math.abs(this.consciousnessLevel - 0.5) * 2;
        
        // Special effects for frozen_awareness (sleep paralysis)
        if (this.currentTrackState && this.currentTrackState.name === 'frozen_awareness') {
            this.applySleepParalysisEffects(audioData);
        }

        // Loudness-to-Influence: Use Meyda loudness to modulate flow/structure
        if (audioData && audioData.meyda && audioData.meyda.loudness) {
            const loudnessData = audioData.meyda.loudness;
            const loudness = typeof loudnessData === 'object' ? loudnessData : { total: loudnessData || 0 };
            
            // If loudness.specific exists (bark scale loudness per band)
            if (loudness.specific && loudness.specific.length > 0) {
                // Calculate bass loudness (lower bark bands 0-5)
                const bassLoudness = loudness.specific.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
                // Calculate treble loudness (higher bark bands 18-23)
                const trebleLoudness = loudness.specific.slice(18).reduce((a, b) => a + b, 0) / 
                                      (loudness.specific.length - 18);
                
                // Normalize to 0-1 range (typical loudness values range from 0-16)
                const normalizedBassLoudness = Math.min(bassLoudness / 8, 1);
                const normalizedTrebleLoudness = Math.min(trebleLoudness / 8, 1);
                
                // EXAGGERATED: Bass drives flow influence (deeper, more emotional)
                flowInfluence *= (0.1 + normalizedBassLoudness * 2.0); // Much more dramatic
                
                // EXAGGERATED: Treble drives structure influence (sharper, more analytical)
                structureInfluence *= (0.1 + normalizedTrebleLoudness * 2.0); // Much more dramatic
                
                // Log for debugging
                if (window.SONOITE_DEBUG && Math.random() < 0.01) {
                    console.log(`🔊 Bass Loudness: ${normalizedBassLoudness.toFixed(2)} → Flow: ${flowInfluence.toFixed(2)}`);
                    console.log(`🔊 Treble Loudness: ${normalizedTrebleLoudness.toFixed(2)} → Structure: ${structureInfluence.toFixed(2)}`);
                }
            } else if (typeof loudness === 'number') {
                // Fallback if only total loudness is available
                const normalizedLoudness = Math.min(loudness / 16, 1);
                flowInfluence *= (0.7 + normalizedLoudness * 0.3);
                structureInfluence *= (0.7 + normalizedLoudness * 0.3);
            }
        }

        // Current track intensity
        const currentTrack = this.trackConsciousness[this.currentTrack];
        const intensity = currentTrack ? currentTrack.intensity : 0.5;

        // Apply influence to consciousness realms
        this.flowConsciousness.setInfluence(flowInfluence * intensity);
        this.structureConsciousness.setInfluence(structureInfluence * intensity);

        // Update visual balance indicator if it exists
        this.updateConsciousnessIndicator(this.consciousnessLevel, intensity);
    }

    updateConsciousnessIndicator(level, intensity) {
        // Update UI indicator for consciousness state (if exists in DOM)
        const indicator = document.getElementById('consciousness-indicator');
        if (indicator) {
            indicator.style.transform = `translateX(${level * 100}px)`;
            indicator.style.opacity = intensity;
        }
    }

    initializeFallbackMode() {
        // Minimal fallback if consciousness system fails
        if (window.SONOITE_DEBUG) {
            console.warn('Consciousness system running in fallback mode');
        }

        // Create simple pulsing visualization
        const fallbackGeometry = new THREE.SphereGeometry(2, 16, 16);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        this.fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.scene.add(this.fallbackMesh);

        this.announceToScreenReader('Consciousness system running in basic mode');
    }

    // Integration methods for existing experience
    integrateWithExistingExperience(experience) {
        if (!experience) return;

        // Enhance existing selectTrack method
        const originalSelectTrack = experience.selectTrack;
        if (originalSelectTrack) {
            experience.selectTrack = (index) => {
                // Call original method
                originalSelectTrack.call(experience, index);
                // Add consciousness transition
                this.transitionToTrack(index);
            };
        }

        // Enhance existing update method
        const originalUpdate = experience.update;
        if (originalUpdate) {
            experience.update = (time, audioData) => {
                // Call original method
                originalUpdate.call(experience, time, audioData);
                // Add consciousness update
                this.update(time, audioData);
            };
        }

        if (window.SONOITE_DEBUG) {
            console.log('Consciousness system integrated with existing experience');
        }
    }

    /**
     * Enable Visual Layer API for testing journey system
     * @param {boolean} enable - Whether to use Visual Layer API
     */
    enableVisualLayerAPI(enable = true) {
        this.useVisualLayerAPI = enable;
        if (enable) {
            console.log('🎨 Visual Layer API enabled - using journey system');
            // Hide AbstractConsciousness when journeys are active
            try {
                // Hide abstract consciousness group (don't deactivate, just hide)
                if (this.existingExperience && this.existingExperience.abstractConsciousness) {
                    const abstractCon = this.existingExperience.abstractConsciousness;
                    // Just hide it, don't deactivate so it can show again later
                    if (abstractCon.abstractGroup) {
                        abstractCon.abstractGroup.visible = false;
                        console.log('👁️ Hiding AbstractConsciousness for journey');
                    }
                }
                if (this.flowConsciousness && this.flowConsciousness.flowGroup) {
                    // Remove the group from scene entirely to prevent interference
                    this.scene.remove(this.flowConsciousness.flowGroup);
                    this.flowConsciousness.flowGroup.visible = false;
                    // Clear all children to prevent them from being re-added
                    while (this.flowConsciousness.flowGroup.children.length > 0) {
                        const child = this.flowConsciousness.flowGroup.children[0];
                        this.flowConsciousness.flowGroup.remove(child);
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                    console.log('🗑️ Cleared and removed flow consciousness from scene');
                }
                if (this.structureConsciousness && this.structureConsciousness.structureGroup) {
                    // Remove the group from scene entirely to prevent interference
                    this.scene.remove(this.structureConsciousness.structureGroup);
                    this.structureConsciousness.structureGroup.visible = false;
                    // Clear all children to prevent them from being re-added
                    while (this.structureConsciousness.structureGroup.children.length > 0) {
                        const child = this.structureConsciousness.structureGroup.children[0];
                        this.structureConsciousness.structureGroup.remove(child);
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                    console.log('🗑️ Cleared and removed structure consciousness from scene');
                }
            } catch (e) {
                console.log('Note: Could not fully clear legacy modules:', e.message);
            }
        } else {
            console.log('🎨 Visual Layer API disabled - showing AbstractConsciousness');
            // Show AbstractConsciousness again
            try {
                if (this.existingExperience && this.existingExperience.abstractConsciousness) {
                    const abstractCon = this.existingExperience.abstractConsciousness;
                    if (abstractCon.abstractGroup) {
                        abstractCon.abstractGroup.visible = true;
                        console.log('👁️ Showing AbstractConsciousness again');
                    }
                }
                if (this.flowConsciousness && this.flowConsciousness.flowGroup) {
                    this.scene.add(this.flowConsciousness.flowGroup);
                    this.flowConsciousness.flowGroup.visible = true;
                }
                if (this.structureConsciousness && this.structureConsciousness.structureGroup) {
                    this.scene.add(this.structureConsciousness.structureGroup);
                    this.structureConsciousness.structureGroup.visible = true;
                }
            } catch (e) {
                // Continue anyway
            }
            // Unmount visual layers
            if (this.visualAdapter) this.visualAdapter.unmountLayers();
        }
    }
    
    /**
     * Load journey for current track (when using Visual Layer API)
     * @param {number} trackIndex - Track index (0-6)
     */
  async loadTrackJourney(trackIndex) {
      console.log('[ConsciousnessSystem] loadTrackJourney called with index:', trackIndex);
      if (!this.visualAdapter) {
          console.error('[ConsciousnessSystem] No visual adapter!');
          return;
      }
      // Hard reset JourneyState and visual layers before loading a new journey to avoid state bleed
      try {
        if (window.JourneyState?.reset) {
          window.JourneyState.reset();
          console.info('[ConsciousnessSystem] JourneyState reset for new track');
        }
      } catch (e) {
        console.warn('[ConsciousnessSystem] JourneyState reset failed:', e?.message || e);
      }
      try {
        if (this.visualAdapter?.unmountLayers) {
          this.visualAdapter.unmountLayers();
          console.info('[ConsciousnessSystem] Visual layers unmounted before load');
        }
      } catch (e) {
        console.warn('[ConsciousnessSystem] Visual layer unmount failed:', e?.message || e);
      }
      // Prefer deriving slug from the actual track title in the experience
      try {
        if (this.existingExperience && Array.isArray(this.existingExperience.tracks)) {
          const track = this.existingExperience.tracks[trackIndex];
          console.log('[ConsciousnessSystem] Found track:', track);
          if (track && track.title) {
            const slug = track.title
              .toLowerCase()
              .normalize('NFD').replace(/\p{Diacritic}/gu, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            console.log('[ConsciousnessSystem] Loading journey with slug:', slug);
            await this.visualAdapter.loadTrackJourney(slug);
            return;
          }
        }
      } catch (e) { 
          console.error('[ConsciousnessSystem] Error loading by slug:', e);
          /* fallback below */ 
      }

      // Fallback: map track index to journey file ID (legacy mapping)
      const trackIds = [
          '01_sonoite',
          '02_paralisia_do_sono',
          '03_o_livro_azul',
          '04_horas_mortas',
          '05_nao_querer_nada',
          '06_o_filho',
          '07_homem_educado'
      ];
      const trackId = trackIds[trackIndex];
      console.log('[ConsciousnessSystem] Fallback loading with trackId:', trackId);
      if (trackId) {
          await this.visualAdapter.loadTrackJourney(trackId);
      }
  }
    
    /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
    // Public method to enable/disable consciousness core
    async setConsciousnessCore(enabled) {
        this.enableConsciousnessCore = enabled;
        
        if (enabled && !this.consciousnessCore) {
            await this.initializeConsciousnessCore();
        } else if (!enabled && this.consciousnessCore) {
            this.consciousnessCore.dispose();
            this.consciousnessCore = null;
        }
    }
    /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

    dispose() {
        // Clean up consciousness system resources
        if (this.performanceCheck) {
            clearInterval(this.performanceCheck);
        }

        // Remove event listeners
        if (this.eventHandlers) {
            document.removeEventListener('mousemove', this.eventHandlers.handleMouseMove);
            document.removeEventListener('touchmove', this.eventHandlers.handleTouchMove);
            document.removeEventListener('mousedown', this.eventHandlers.handleMouseDown);
            document.removeEventListener('mouseup', this.eventHandlers.handleMouseUp);
        }

        // Dispose consciousness components
        if (this.flowConsciousness) {
            this.flowConsciousness.dispose();
        }
        if (this.structureConsciousness) {
            this.structureConsciousness.dispose();
        }
        if (this.transitionEngine) {
            this.transitionEngine.dispose();
        }
        if (this.audioConsciousness) {
            this.audioConsciousness.dispose();
        }
        
        /* === V3 ADD start: PROMPT_3_1B_OPTIONAL_CORE === */
        // Dispose optional consciousness core
        if (this.consciousnessCore) {
            this.consciousnessCore.dispose();
            this.consciousnessCore = null;
        }
        /* === V3 ADD end: PROMPT_3_1B_OPTIONAL_CORE === */

        // Remove fallback mesh if exists
        if (this.fallbackMesh) {
            this.fallbackMesh.geometry.dispose();
            this.fallbackMesh.material.dispose();
            this.scene.remove(this.fallbackMesh);
        }

        if (window.SONOITE_DEBUG) {
            console.log('Consciousness system disposed');
        }
        
        // Clear singleton instance
        consciousnessSystemInstance = null;
    }
    
    // Static method to reset singleton
    static resetInstance() {
        if (consciousnessSystemInstance) {
            consciousnessSystemInstance.dispose();
        }
        consciousnessSystemInstance = null;
    }
}
