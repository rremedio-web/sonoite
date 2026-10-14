/**
 * Abstract Consciousness System - Main Controller
 * Creates abstract, synesthetic interpretations of Portuguese track themes
 * Builds on existing SonoiteExperience while adding sophisticated abstract forms
 */
import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class AbstractConsciousness {
    constructor(scene, audioManager, camera) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.camera = camera;
        this.abstractGroup = new THREE.Group();
        this.currentTrack = null;
        this.currentTheme = null;
        this.transitionProgress = 0;
        this.isActive = false;
        this.influence = 1.0;
        this.isWebGL2 = false;
        
        // Abstract realms
        this.flowRealm = null;
        this.structureRealm = null;
        this.consciousnessCore = null;
        
        // Portuguese track theme mappings
        this.trackThemes = {
            'lua': {
                name: 'moon_consciousness',
                flow: 'nocturnal_drift',
                structure: 'lunar_geometry',
                consciousness: 'night_awareness',
                colors: { primary: [0.8, 0.8, 1.0], secondary: [0.6, 0.6, 0.8] },
                movement: 'gentle_orbital',
                intensity: 0.7
            },
            'paralisia_do_sono': {
                name: 'paralysis_consciousness',
                flow: 'restrictive_tendrils',
                structure: 'frozen_lattice',
                consciousness: 'trapped_awareness',
                colors: { primary: [0.4, 0.4, 0.6], secondary: [0.2, 0.2, 0.4] },
                movement: 'constrained_struggle',
                intensity: 0.3
            },
            'paginas_azuis': {
                name: 'blue_pages_consciousness',
                flow: 'textual_rivers',
                structure: 'knowledge_crystals',
                consciousness: 'reading_immersion',
                colors: { primary: [0.6, 0.7, 1.0], secondary: [0.4, 0.5, 0.8] },
                movement: 'flowing_script',
                intensity: 0.8
            },
            'horas_mortas': {
                name: 'dead_hours_consciousness',
                flow: 'temporal_weight',
                structure: 'clock_decay',
                consciousness: 'time_distortion',
                colors: { primary: [0.6, 0.6, 0.5], secondary: [0.4, 0.4, 0.3] },
                movement: 'sluggish_drift',
                intensity: 0.2
            },
            'vazio': {
                name: 'void_consciousness',
                flow: 'dissolving_essence',
                structure: 'absent_form',
                consciousness: 'pure_emptiness',
                colors: { primary: [0.2, 0.2, 0.2], secondary: [0.1, 0.1, 0.1] },
                movement: 'dissolution',
                intensity: 0.1
            },
            'silhueta': {
                name: 'silhouette_consciousness',
                flow: 'shadow_memories',
                structure: 'outline_geometry',
                consciousness: 'dual_reflection',
                colors: { primary: [0.5, 0.5, 0.5], secondary: [0.3, 0.3, 0.3] },
                movement: 'mirrored_dance',
                intensity: 0.6
            },
            'geracao': {
                name: 'generation_consciousness',
                flow: 'inherited_patterns',
                structure: 'systematic_order',
                consciousness: 'learned_awareness',
                colors: { primary: [0.7, 0.7, 0.6], secondary: [0.5, 0.5, 0.4] },
                movement: 'structured_evolution',
                intensity: 0.9
            }
        };
        
        this.init();
    }

    init() {
        if (window.SONOITE_DEBUG) {
            dlog('Initializing Abstract Consciousness System...');
        }
        
        // Check WebGL capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        this.isWebGL2 = gl && gl.constructor.name === 'WebGL2RenderingContext';
        
        try {
            this.createAbstractRealms();
            this.setupRealmInteractions();
            this.scene.add(this.abstractGroup);
            if (window.SONOITE_DEBUG) {
                dlog('Abstract Consciousness System initialized successfully');
            }
        } catch (error) {
            derr('Failed to initialize Abstract Consciousness System:', error);
            this.createFallbackSystem();
        }
    }

    async createAbstractRealms() {
        // Import realm modules
        const { FlowRealm } = await import('./flow-realm.js');
        const { StructureRealm } = await import('./structure-realm.js');
        const { ConsciousnessCore } = await import('./consciousness-core.js');
        
        // Create the three main abstract realms
        this.flowRealm = new FlowRealm(this.scene, this.audioManager);
        this.structureRealm = new StructureRealm(this.scene, this.audioManager);
        this.consciousnessCore = new ConsciousnessCore(this.scene, this.audioManager);
        
        // Position realms in abstract space
        this.flowRealm.flowGroup.position.set(-4, 0, 0);  // Left side - organic flow
        this.structureRealm.structureGroup.position.set(4, 0, 0);  // Right side - geometric structure
        this.consciousnessCore.coreGroup.position.set(0, 0, 0);  // Center - focal point
        
        // Add to abstract group
        this.abstractGroup.add(this.flowRealm.flowGroup);
        this.abstractGroup.add(this.structureRealm.structureGroup);
        this.abstractGroup.add(this.consciousnessCore.coreGroup);
    }

    setupRealmInteractions() {
        // Create energy connections between realms
        this.createEnergyConnections();
        
        // Setup cross-realm influence systems
        this.setupCrossInfluence();
        
        // Initialize Portuguese theme processors
        this.setupThemeProcessors();
    }

    createEnergyConnections() {
        // Create particle streams connecting the realms
        const connectionGeometry = new THREE.BufferGeometry();
        const connectionCount = 100;
        const positions = new Float32Array(connectionCount * 3);
        const phases = new Float32Array(connectionCount);
        
        // Create connection paths between realms
        for (let i = 0; i < connectionCount; i++) {
            const t = i / connectionCount;
            const i3 = i * 3;
            
            // Create curved path between flow and structure realms
            const x = Math.cos(t * Math.PI) * 4;
            const y = Math.sin(t * Math.PI * 2) * 0.5;
            const z = Math.sin(t * Math.PI) * 1;
            
            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;
            
            phases[i] = t * Math.PI * 2;
        }
        
        connectionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        connectionGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        const connectionMaterial = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.02,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        this.energyConnections = new THREE.Points(connectionGeometry, connectionMaterial);
        this.abstractGroup.add(this.energyConnections);
    }

    setupCrossInfluence() {
        // Establish influence relationships between realms
        this.realmInfluences = {
            flow_to_structure: 0.3,
            structure_to_flow: 0.3,
            consciousness_to_flow: 0.8,
            consciousness_to_structure: 0.8,
            flow_to_consciousness: 0.5,
            structure_to_consciousness: 0.5
        };
    }

    setupThemeProcessors() {
        // Create processors for Portuguese theme interpretation
        this.themeProcessors = {
            movement: this.processMovementTheme.bind(this),
            color: this.processColorTheme.bind(this),
            structure: this.processStructureTheme.bind(this),
            consciousness: this.processConsciousnessTheme.bind(this)
        };
    }

    processMovementTheme(theme, audioData) {
        const movements = {
            'nocturnal_drift': {
                speed: 0.3,
                amplitude: 0.8,
                pattern: 'orbital'
            },
            'restrictive_tendrils': {
                speed: 0.1,
                amplitude: 0.2,
                pattern: 'constrained'
            },
            'flowing_script': {
                speed: 0.9,
                amplitude: 0.6,
                pattern: 'textual'
            },
            'sluggish_drift': {
                speed: 0.05,
                amplitude: 0.3,
                pattern: 'weighted'
            },
            'dissolution': {
                speed: 0.02,
                amplitude: 0.1,
                pattern: 'fade'
            },
            'mirrored_dance': {
                speed: 0.7,
                amplitude: 0.5,
                pattern: 'symmetrical'
            },
            'structured_evolution': {
                speed: 0.8,
                amplitude: 0.4,
                pattern: 'systematic'
            }
        };
        
        return movements[theme] || movements['nocturnal_drift'];
    }

    processColorTheme(theme, audioData) {
        const trackTheme = this.trackThemes[this.currentTrack];
        if (!trackTheme) return { primary: [0.5, 0.5, 0.5], secondary: [0.3, 0.3, 0.3] };
        
        // Audio-reactive color modulation
        const bassInfluence = (audioData.bassLevel || 0) * 0.3;
        const midInfluence = (audioData.midLevel || 0) * 0.2;
        const trebleInfluence = (audioData.trebleLevel || 0) * 0.1;
        
        const primary = trackTheme.colors.primary.map(c => 
            Math.min(1.0, c + bassInfluence + midInfluence)
        );
        const secondary = trackTheme.colors.secondary.map(c => 
            Math.min(1.0, c + trebleInfluence)
        );
        
        return { primary, secondary };
    }

    processStructureTheme(theme, audioData) {
        const structures = {
            'lunar_geometry': {
                complexity: 0.7,
                organic: 0.8,
                precision: 0.4
            },
            'frozen_lattice': {
                complexity: 0.3,
                organic: 0.1,
                precision: 0.9
            },
            'knowledge_crystals': {
                complexity: 0.9,
                organic: 0.3,
                precision: 0.8
            },
            'clock_decay': {
                complexity: 0.4,
                organic: 0.2,
                precision: 0.6
            },
            'absent_form': {
                complexity: 0.1,
                organic: 0.1,
                precision: 0.1
            },
            'outline_geometry': {
                complexity: 0.5,
                organic: 0.4,
                precision: 0.7
            },
            'systematic_order': {
                complexity: 0.8,
                organic: 0.2,
                precision: 1.0
            }
        };
        
        return structures[theme] || structures['lunar_geometry'];
    }

    processConsciousnessTheme(theme, audioData) {
        const consciousness = {
            'night_awareness': {
                depth: 0.8,
                clarity: 0.6,
                expansion: 0.7
            },
            'trapped_awareness': {
                depth: 0.3,
                clarity: 0.2,
                expansion: 0.1
            },
            'reading_immersion': {
                depth: 0.9,
                clarity: 0.8,
                expansion: 0.6
            },
            'time_distortion': {
                depth: 0.4,
                clarity: 0.3,
                expansion: 0.2
            },
            'pure_emptiness': {
                depth: 0.1,
                clarity: 0.1,
                expansion: 0.0
            },
            'dual_reflection': {
                depth: 0.6,
                clarity: 0.7,
                expansion: 0.5
            },
            'learned_awareness': {
                depth: 0.7,
                clarity: 0.9,
                expansion: 0.8
            }
        };
        
        return consciousness[theme] || consciousness['night_awareness'];
    }

    transformToTrack(trackKey, duration = 3.0) {
        if (window.SONOITE_DEBUG) {
            dlog(`Transforming abstract consciousness to track: ${trackKey}`);
        }
        
        this.currentTrack = trackKey;
        const theme = this.trackThemes[trackKey];
        
        if (!theme) {
            if (window.SONOITE_DEBUG) {
                dwarn(`No theme found for track: ${trackKey}`);
            }
            return;
        }
        
        this.currentTheme = theme;
        
        // Transform each realm to match the Portuguese theme
        this.transformRealmsToTheme(theme, duration);
        
        // Adjust camera and lighting for theme
        this.adjustEnvironmentForTheme(theme, duration);
        
        // Update consciousness core
        this.updateConsciousnessForTheme(theme, duration);
    }

    transformRealmsToTheme(theme, duration) {
        // Transform flow realm to match organic aspects of theme
        if (this.flowRealm && this.flowRealm.transformTo) {
            this.flowRealm.transformTo(theme.flow, duration);
        }
        
        // Transform structure realm to match geometric aspects
        if (this.structureRealm && this.structureRealm.transformTo) {
            this.structureRealm.transformTo(theme.structure, duration);
        }
        
        // Update realm influences based on theme
        this.updateRealmInfluences(theme);
    }

    updateRealmInfluences(theme) {
        // Adjust influence balance based on theme characteristics
        const flowStrength = theme.intensity * 0.7;
        const structureStrength = (1 - theme.intensity) * 0.7 + 0.3;
        
        if (this.flowRealm && this.flowRealm.setInfluence) {
            this.flowRealm.setInfluence(flowStrength);
        }
        
        if (this.structureRealm && this.structureRealm.setInfluence) {
            this.structureRealm.setInfluence(structureStrength);
        }
        
        // Update cross-realm influences
        this.realmInfluences.flow_to_structure = flowStrength * 0.5;
        this.realmInfluences.structure_to_flow = structureStrength * 0.5;
    }

    adjustEnvironmentForTheme(theme, duration) {
        // Adjust abstract group positioning and rotation
        const startTime = performance.now();
        const initialRotation = this.abstractGroup.rotation.clone();
        const targetRotation = new THREE.Euler(
            theme.intensity * 0.1,
            theme.intensity * 0.2,
            0
        );
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.abstractGroup.rotation.x = initialRotation.x + 
                (targetRotation.x - initialRotation.x) * easeProgress;
            this.abstractGroup.rotation.y = initialRotation.y + 
                (targetRotation.y - initialRotation.y) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateConsciousnessForTheme(theme, duration) {
        if (this.consciousnessCore && this.consciousnessCore.transformTo) {
            this.consciousnessCore.transformTo(theme.consciousness, duration);
        }
    }

    update(time, audioData) {
        if (!this.isActive || !this.currentTheme) return;
        
        try {
            // Process current theme with audio data
            const movementData = this.themeProcessors.movement(this.currentTheme.movement, audioData);
            const colorData = this.themeProcessors.color(this.currentTheme.name, audioData);
            const structureData = this.themeProcessors.structure(this.currentTheme.structure, audioData);
            const consciousnessData = this.themeProcessors.consciousness(this.currentTheme.consciousness, audioData);
            
            // Update each realm with processed theme data
            this.updateRealmWithTheme(this.flowRealm, time, audioData, movementData, colorData);
            this.updateRealmWithTheme(this.structureRealm, time, audioData, structureData, colorData);
            this.updateRealmWithTheme(this.consciousnessCore, time, audioData, consciousnessData, colorData);
            
            // Update energy connections
            this.updateEnergyConnections(time, audioData);
            
            // Apply cross-realm influences
            this.applyCrossRealmInfluences(time, audioData);
            
        } catch (error) {
            derr('Abstract consciousness update failed:', error);
        }
    }

    updateRealmWithTheme(realm, time, audioData, themeData, colorData) {
        if (!realm || !realm.update) return;
        
        // Create enhanced audio data with theme information
        const enhancedAudioData = {
            ...audioData,
            theme: themeData,
            colors: colorData,
            influence: this.influence
        };
        
        realm.update(time, enhancedAudioData);
    }

    updateEnergyConnections(time, audioData) {
        if (!this.energyConnections?.geometry?.attributes?.position) return;
        
        const positions = this.energyConnections.geometry.attributes.position.array;
        const phases = this.energyConnections.geometry.attributes.phase.array;
        const audioInfluence = (audioData.midLevel || 0) * 0.5;
        
        for (let i = 0; i < positions.length; i += 3) {
            const particleIndex = i / 3;
            const t = particleIndex / (positions.length / 3);
            const phase = phases[particleIndex];
            
            // Audio-reactive connection flow
            const flowOffset = Math.sin(time * 0.001 + phase) * audioInfluence;
            const x = Math.cos(t * Math.PI + flowOffset) * 4;
            const y = Math.sin(t * Math.PI * 2 + flowOffset) * 0.5;
            const z = Math.sin(t * Math.PI + flowOffset) * 1;
            
            positions[i] = x;
            positions[i + 1] = y;
            positions[i + 2] = z;
        }
        
        this.energyConnections.geometry.attributes.position.needsUpdate = true;
        
        // Update connection material opacity
        this.energyConnections.material.opacity = 0.3 + audioInfluence * 0.2;
    }

    applyCrossRealmInfluences(time, audioData) {
        // Apply influence from consciousness core to other realms
        const consciousnessInfluence = this.realmInfluences.consciousness_to_flow;
        const structureInfluence = this.realmInfluences.consciousness_to_structure;
        
        // Cross-pollinate audio data between realms
        const crossInfluenceData = {
            ...audioData,
            consciousnessInfluence,
            structureInfluence,
            flowInfluence: this.realmInfluences.flow_to_structure
        };
        
        // Apply to each realm if they support cross-influence
        if (this.flowRealm && this.flowRealm.applyCrossInfluence) {
            this.flowRealm.applyCrossInfluence(time, crossInfluenceData);
        }
        
        if (this.structureRealm && this.structureRealm.applyCrossInfluence) {
            this.structureRealm.applyCrossInfluence(time, crossInfluenceData);
        }
    }

    activate() {
        this.isActive = true;
        this.abstractGroup.visible = true;
        if (window.SONOITE_DEBUG) {
            dlog('Abstract consciousness system activated');
        }
    }

    deactivate() {
        this.isActive = false;
        this.abstractGroup.visible = false;
        if (window.SONOITE_DEBUG) {
            dlog('Abstract consciousness system deactivated');
        }
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));
        
        // Update realm influences
        if (this.flowRealm && this.flowRealm.setInfluence) {
            this.flowRealm.setInfluence(this.influence);
        }
        
        if (this.structureRealm && this.structureRealm.setInfluence) {
            this.structureRealm.setInfluence(this.influence);
        }
        
        if (this.consciousnessCore && this.consciousnessCore.setInfluence) {
            this.consciousnessCore.setInfluence(this.influence);
        }
        
        // Update energy connections
        if (this.energyConnections?.material) {
            this.energyConnections.material.opacity = this.influence * 0.3;
        }
        
        // Control overall visibility
        this.abstractGroup.visible = this.influence > 0.01;
    }

    createFallbackSystem() {
        dwarn('Creating fallback abstract consciousness system');
        
        // Simple fallback visualization
        const fallbackGeometry = new THREE.SphereGeometry(2, 16, 16);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.abstractGroup.add(fallbackMesh);
        this.scene.add(this.abstractGroup);
        
        // Simple update function
        this.fallbackUpdate = (time) => {
            fallbackMesh.rotation.y += 0.01;
            fallbackMesh.rotation.x += 0.005;
        };
    }

    get position() {
        return this.abstractGroup.position;
    }

    dispose() {
        dlog('Disposing Abstract Consciousness System...');
        
        try {
            // Dispose of realm systems
            if (this.flowRealm && this.flowRealm.dispose) {
                this.flowRealm.dispose();
            }
            
            if (this.structureRealm && this.structureRealm.dispose) {
                this.structureRealm.dispose();
            }
            
            if (this.consciousnessCore && this.consciousnessCore.dispose) {
                this.consciousnessCore.dispose();
            }
            
            // Dispose of energy connections
            if (this.energyConnections) {
                if (this.energyConnections.geometry) this.energyConnections.geometry.dispose();
                if (this.energyConnections.material) this.energyConnections.material.dispose();
            }
            
            // Remove from scene
            this.scene.remove(this.abstractGroup);
            
            // Clear references
            this.flowRealm = null;
            this.structureRealm = null;
            this.consciousnessCore = null;
            this.energyConnections = null;
            this.abstractGroup = null;
            this.currentTrack = null;
            this.currentTheme = null;
            this.trackThemes = null;
            this.themeProcessors = null;
            this.realmInfluences = null;
            
        } catch (error) {
            derr('Error disposing Abstract Consciousness System:', error);
        }
    }
}