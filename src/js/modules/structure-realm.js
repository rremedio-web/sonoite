/**
 * Structure Realm - Geometric Abstract Forms
 * Represents conscious, ordered, structured awareness states
 * Responds to Portuguese themes through abstract geometric patterns
 */
import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class StructureRealm {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.structureGroup = new THREE.Group();
        this.geometricForms = [];
        this.crystallineStructures = [];
        this.systematicPatterns = null;
        this.currentState = 'lunar_geometry';
        this.influence = 1.0;
        this.isWebGL2 = false;
        this.precisionLevel = 0.8;
        
        this.init();
    }

    init() {
        dlog('Initializing Structure Realm...');
        
        // Check WebGL capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        this.isWebGL2 = gl && gl.constructor.name === 'WebGL2RenderingContext';
        
        try {
            this.createGeometricForms();
            this.createCrystallineStructures();
            this.createSystematicPatterns();
            this.createStructuredLighting();
            this.scene.add(this.structureGroup);
            dlog('Structure Realm initialized successfully');
        } catch (error) {
            derr('Failed to initialize Structure Realm:', error);
            this.createFallbackStructure();
        }
    }

    createGeometricForms() {
        // Create various geometric forms for Portuguese themes
        this.createPlatonicSolids();
        this.createFractalGeometry();
        this.createSacredGeometry();
    }

    createPlatonicSolids() {
        // Create the five Platonic solids representing fundamental structures
        const solids = [
            { name: 'tetrahedron', geometry: new THREE.TetrahedronGeometry(1) },
            { name: 'cube', geometry: new THREE.BoxGeometry(1.5, 1.5, 1.5) },
            { name: 'octahedron', geometry: new THREE.OctahedronGeometry(1.2) },
            { name: 'dodecahedron', geometry: new THREE.DodecahedronGeometry(1) },
            { name: 'icosahedron', geometry: new THREE.IcosahedronGeometry(1.1) }
        ];
        
        solids.forEach((solid, index) => {
            const mesh = this.createStructuralMesh(solid.geometry, 'platonic');
            
            // Position in pentagonal arrangement
            const angle = (index / 5) * Math.PI * 2;
            mesh.position.set(
                Math.cos(angle) * 3,
                Math.sin(angle * 2) * 1,
                Math.sin(angle) * 3
            );
            
            mesh.userData = {
                type: 'platonic',
                name: solid.name,
                index: index,
                originalPosition: mesh.position.clone(),
                rotationSpeed: 0.01 + index * 0.002,
                structuralPhase: Math.random() * Math.PI * 2
            };
            
            this.structureGroup.add(mesh);
            this.geometricForms.push(mesh);
        });
    }

    createFractalGeometry() {
        // Create fractal-like geometric structures
        this.createSierpinskiPyramid();
        this.createKochSnowflake();
        this.createMengerSponge();
    }

    createSierpinskiPyramid() {
        const levels = 3;
        const pyramid = this.createFractalPyramid(levels);
        pyramid.position.set(-4, 2, 0);
        pyramid.userData = {
            type: 'fractal',
            name: 'sierpinski',
            levels: levels,
            complexity: 0.8
        };
        
        this.structureGroup.add(pyramid);
        this.geometricForms.push(pyramid);
    }

    createFractalPyramid(levels, size = 1, position = new THREE.Vector3()) {
        const group = new THREE.Group();
        
        if (levels <= 0) {
            const geometry = new THREE.TetrahedronGeometry(size);
            const material = this.createStructuralMaterial('fractal');
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            return mesh;
        }
        
        // Create 4 smaller pyramids
        const newSize = size * 0.5;
        const offset = size * 0.5;
        
        const positions = [
            new THREE.Vector3(0, offset, 0),
            new THREE.Vector3(offset, -offset, offset),
            new THREE.Vector3(-offset, -offset, offset),
            new THREE.Vector3(0, -offset, -offset)
        ];
        
        positions.forEach(pos => {
            const subPyramid = this.createFractalPyramid(levels - 1, newSize, pos.add(position));
            group.add(subPyramid);
        });
        
        return group;
    }

    createKochSnowflake() {
        // Create 2D Koch snowflake extruded into 3D
        const points = this.generateKochSnowflake(3);
        const shape = new THREE.Shape(points);
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.2,
            bevelEnabled: false
        });
        
        const material = this.createStructuralMaterial('fractal');
        const snowflake = new THREE.Mesh(geometry, material);
        snowflake.position.set(4, -2, 0);
        snowflake.rotation.x = Math.PI / 2;
        
        snowflake.userData = {
            type: 'fractal',
            name: 'koch',
            iterations: 3,
            complexity: 0.9
        };
        
        this.structureGroup.add(snowflake);
        this.geometricForms.push(snowflake);
    }

    generateKochSnowflake(iterations) {
        // Start with equilateral triangle
        let points = [
            new THREE.Vector2(0, 1),
            new THREE.Vector2(-Math.sqrt(3)/2, -0.5),
            new THREE.Vector2(Math.sqrt(3)/2, -0.5),
            new THREE.Vector2(0, 1)
        ];
        
        for (let i = 0; i < iterations; i++) {
            points = this.kochIteration(points);
        }
        
        return points;
    }

    kochIteration(points) {
        const newPoints = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Divide line into thirds
            const oneThird = p1.clone().lerp(p2, 1/3);
            const twoThird = p1.clone().lerp(p2, 2/3);
            
            // Create equilateral triangle peak
            const direction = p2.clone().sub(p1);
            const perpendicular = new THREE.Vector2(-direction.y, direction.x).normalize();
            const peak = oneThird.clone().lerp(twoThird, 0.5).add(
                perpendicular.multiplyScalar(direction.length() * Math.sqrt(3) / 6)
            );
            
            newPoints.push(p1, oneThird, peak, twoThird);
        }
        
        newPoints.push(points[points.length - 1]);
        return newPoints;
    }

    createMengerSponge() {
        // Simplified Menger sponge representation
        const sponge = this.createMengerLevel(2, 1);
        sponge.position.set(0, -3, 2);
        sponge.userData = {
            type: 'fractal',
            name: 'menger',
            levels: 2,
            complexity: 1.0
        };
        
        this.structureGroup.add(sponge);
        this.geometricForms.push(sponge);
    }
    
    createSacredGeometry() {
        // Create sacred geometry patterns
        const goldenRatio = 1.618033988749;
        const geometry = new THREE.TorusGeometry(2, 0.5, 8, 16); // Back to normal size
        const material = this.createStructuralMaterial('platonic');
        const torus = new THREE.Mesh(geometry, material);
        
        torus.scale.x = goldenRatio; // Back to normal scale
        torus.position.set(0, 0, 4);
        
        torus.userData = {
            type: 'sacred',
            name: 'golden_torus',
            ratio: goldenRatio
        };
        
        this.structureGroup.add(torus);
        this.geometricForms.push(torus);
    }

    createMengerLevel(level, size) {
        const group = new THREE.Group();
        
        if (level <= 0) {
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = this.createStructuralMaterial('fractal');
            const cube = new THREE.Mesh(geometry, material);
            return cube;
        }
        
        const newSize = size / 3;
        
        // Create 20 smaller cubes (27 - 7 removed)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    // Skip center cross pattern
                    const crossCount = (x === 0 ? 1 : 0) + (y === 0 ? 1 : 0) + (z === 0 ? 1 : 0);
                    if (crossCount >= 2) continue;
                    
                    const subCube = this.createMengerLevel(level - 1, newSize);
                    subCube.position.set(x * newSize, y * newSize, z * newSize);
                    group.add(subCube);
                }
            }
        }
        
        return group;
    }

    createCrystallineStructures() {
        // Create crystal-like structures representing ordered consciousness
        this.createQuartzCrystal();
        this.createDiamondLattice();
        this.createCrystalCluster();
    }

    createQuartzCrystal() {
        // Create hexagonal prism with pointed ends
        const crystal = new THREE.Group();
        
        // Main hexagonal body
        const bodyGeometry = new THREE.CylinderGeometry(1, 1, 3, 6);
        const bodyMaterial = this.createStructuralMaterial('crystal');
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Pointed ends
        const topGeometry = new THREE.ConeGeometry(1, 1, 6);
        const topMaterial = this.createStructuralMaterial('crystal');
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 2;
        
        const bottom = new THREE.Mesh(topGeometry, topMaterial);
        bottom.position.y = -2;
        bottom.rotation.x = Math.PI;
        
        crystal.add(body, top, bottom);
        crystal.position.set(-2, 0, -3);
        
        crystal.userData = {
            type: 'crystalline',
            name: 'quartz',
            resonance: 432, // Hz
            clarity: 0.9
        };
        
        this.structureGroup.add(crystal);
        this.crystallineStructures.push(crystal);
    }

    createDiamondLattice() {
        // Create diamond cubic lattice structure
        const lattice = new THREE.Group();
        const nodeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bondGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
        const material = this.createStructuralMaterial('crystal');
        
        // Create lattice nodes
        const spacing = 0.8;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const node = new THREE.Mesh(nodeGeometry, material);
                    node.position.set(x * spacing, y * spacing, z * spacing);
                    lattice.add(node);
                }
            }
        }
        
        lattice.position.set(2, 0, -3);
        lattice.userData = {
            type: 'crystalline',
            name: 'diamond',
            hardness: 10,
            clarity: 1.0
        };
        
        this.structureGroup.add(lattice);
        this.crystallineStructures.push(lattice);
    }

    createCrystalCluster() {
        // Create cluster of various crystal formations
        const cluster = new THREE.Group();
        const crystalCount = 8;
        
        for (let i = 0; i < crystalCount; i++) {
            const crystalGeometry = new THREE.ConeGeometry(
                0.2 + Math.random() * 0.3,
                1 + Math.random() * 2,
                6
            );
            const crystalMaterial = this.createStructuralMaterial('crystal');
            const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
            
            // Random positioning in cluster
            const angle = (i / crystalCount) * Math.PI * 2;
            const radius = Math.random() * 1.5;
            crystal.position.set(
                Math.cos(angle) * radius,
                Math.random() * 1 - 0.5,
                Math.sin(angle) * radius
            );
            
            crystal.rotation.z = (Math.random() - 0.5) * Math.PI;
            cluster.add(crystal);
        }
        
        cluster.position.set(0, 2, -2);
        cluster.userData = {
            type: 'crystalline',
            name: 'cluster',
            formation: 'natural',
            energy: 0.7
        };
        
        this.structureGroup.add(cluster);
        this.crystallineStructures.push(cluster);
    }

    createSystematicPatterns() {
        // Create mathematical pattern visualizations
        const particleCount = window.innerWidth < 768 ? 800 : 1600;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const indices = new Float32Array(particleCount);
        const phases = new Float32Array(particleCount);
        
        // Create systematic patterns based on mathematical functions
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const t = i / particleCount;
            
            // Golden spiral pattern
            const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
            const angle = t * Math.PI * 2 * phi;
            const radius = Math.sqrt(t) * 4;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = (t - 0.5) * 6;
            positions[i3 + 2] = Math.sin(angle) * radius;
            
            indices[i] = i;
            phases[i] = t * Math.PI * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('index', new THREE.BufferAttribute(indices, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        const patternMaterial = new THREE.PointsMaterial({
            color: 0xffd700,
            size: 0.02,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.systematicPatterns = new THREE.Points(geometry, patternMaterial);
        this.structureGroup.add(this.systematicPatterns);
    }

    createStructuralMaterial(type) {
        const baseColors = {
            platonic: 0xffd700,    // Gold
            fractal: 0xc0c0c0,     // Silver
            crystal: 0xe0e0ff,     // Light blue
            systematic: 0xff9900   // Orange
        };
        
        const baseColor = baseColors[type] || 0xffffff;
        
        if (!this.isWebGL2) {
            // Fallback material
            return new THREE.MeshPhongMaterial({
                color: baseColor,
                transparent: true,
                opacity: 0.8,
                shininess: 100
            });
        }

        // Advanced structural shader
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioHigh: { value: 0 },
                audioMid: { value: 0 },
                structuralPrecision: { value: 0.8 },
                baseColor: { value: new THREE.Color(baseColor) },
                opacity: { value: 0.8 },
                metallic: { value: 0.9 },
                geometricComplexity: { value: 0.5 },
                systematicOrder: { value: 0.8 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioHigh;
                uniform float structuralPrecision;
                uniform float geometricComplexity;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vStructuralEffect;
                
                // Precise geometric function
                float geometricPrecision(vec3 p) {
                    return abs(sin(p.x * 8.0) * cos(p.y * 8.0) * sin(p.z * 8.0));
                }
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Audio-reactive geometric precision (high frequencies)
                    float audioInfluence = clamp(audioHigh, 0.0, 1.0);
                    vAudioInfluence = audioInfluence;
                    
                    // Precise geometric modulation
                    float geometricEffect = geometricPrecision(pos * geometricComplexity) * structuralPrecision;
                    vStructuralEffect = geometricEffect;
                    
                    // Audio-reactive structural precision
                    float precisionPulse = sin(time * 2.0 + length(pos) * 4.0) * audioInfluence * 0.1;
                    pos *= (1.0 + precisionPulse);
                    
                    // Systematic displacement along normal
                    pos += normal * geometricEffect * 0.05;
                    
                    // High-frequency audio reactive displacement
                    pos += normal * audioInfluence * 0.1;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioMid;
                uniform vec3 baseColor;
                uniform float opacity;
                uniform float metallic;
                uniform float systematicOrder;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vStructuralEffect;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    
                    // Precise geometric lighting
                    float geometricLight = abs(dot(normal, vec3(0.5, 0.8, 0.6)));
                    
                    // Audio-reactive precision enhancement
                    float audioInfluence = clamp(audioMid, 0.0, 1.0);
                    float precisionEnhancement = 1.0 + audioInfluence * 0.5;
                    
                    // Metallic structural appearance
                    vec3 structuralColor = baseColor * precisionEnhancement;
                    structuralColor += vec3(metallic * geometricLight * 0.3);
                    
                    // Add systematic pattern overlay
                    float systematicPattern = sin(vPosition.x * 10.0 + time * 0.001) * 
                                            cos(vPosition.y * 10.0 + time * 0.001) * 
                                            systematicOrder * 0.1;
                    structuralColor += vec3(systematicPattern);
                    
                    // Structural effect enhancement
                    structuralColor += vec3(vStructuralEffect * 0.2);
                    
                    // Audio-reactive glow for structured elements
                    structuralColor += baseColor * vAudioInfluence * 0.3;
                    
                    gl_FragColor = vec4(structuralColor, opacity);
                }
            `,
            transparent: true
        });
    }

    createStructuralMesh(geometry, type) {
        const material = this.createStructuralMaterial(type);
        return new THREE.Mesh(geometry, material);
    }

    createStructuredLighting() {
        // Precise directional lights for geometric definition
        const primaryLight = new THREE.DirectionalLight(0xffffff, 0.8);
        primaryLight.position.set(3, 4, 2);
        this.structureGroup.add(primaryLight);
        
        const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.4);
        secondaryLight.position.set(-2, 2, -3);
        this.structureGroup.add(secondaryLight);
        
        // Ambient light for structural clarity
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.structureGroup.add(ambientLight);
    }

    transformTo(state, duration = 2.0) {
        dlog(`Transforming structure realm to state: ${state}`);
        this.currentState = state;
        
        // Define transformation parameters for Portuguese themes
        const stateParams = {
            'lunar_geometry': {
                precision: 0.8,
                complexity: 0.7,
                metallic: 0.9,
                order: 0.8,
                color: { r: 0.9, g: 0.9, b: 1.0 },
                scale: 1.0
            },
            'frozen_lattice': {
                precision: 1.0,
                complexity: 0.3,
                metallic: 0.5,
                order: 1.0,
                color: { r: 0.6, g: 0.8, b: 1.0 },
                scale: 0.8
            },
            'knowledge_crystals': {
                precision: 0.9,
                complexity: 1.0,
                metallic: 0.8,
                order: 0.9,
                color: { r: 0.6, g: 0.7, b: 1.0 },
                scale: 1.1
            },
            'clock_decay': {
                precision: 0.4,
                complexity: 0.6,
                metallic: 0.3,
                order: 0.6,
                color: { r: 0.8, g: 0.7, b: 0.6 },
                scale: 0.9
            },
            'absent_form': {
                precision: 0.1,
                complexity: 0.1,
                metallic: 0.1,
                order: 0.2,
                color: { r: 0.2, g: 0.2, b: 0.2 },
                scale: 0.5
            },
            'outline_geometry': {
                precision: 0.6,
                complexity: 0.4,
                metallic: 0.4,
                order: 0.7,
                color: { r: 0.5, g: 0.5, b: 0.5 },
                scale: 0.8
            },
            'systematic_order': {
                precision: 1.0,
                complexity: 0.8,
                metallic: 1.0,
                order: 1.0,
                color: { r: 1.0, g: 1.0, b: 1.0 },
                scale: 1.0
            }
        };
        
        const params = stateParams[state] || stateParams['lunar_geometry'];
        this.animateToParams(params, duration);
    }

    animateToParams(targetParams, duration) {
        const startTime = performance.now();
        
        // Get initial values from first geometric form
        let initialParams = {
            precision: this.precisionLevel,
            complexity: 0.5,
            metallic: 0.9,
            order: 0.8,
            color: new THREE.Color(1.0, 1.0, 1.0),
            scale: 1.0
        };
        
        if (this.geometricForms.length > 0) {
            const firstForm = this.geometricForms[0];
            if (firstForm.material.uniforms) {
                initialParams.precision = firstForm.material.uniforms.structuralPrecision?.value || 0.8;
                initialParams.complexity = firstForm.material.uniforms.geometricComplexity?.value || 0.5;
                initialParams.metallic = firstForm.material.uniforms.metallic?.value || 0.9;
                initialParams.order = firstForm.material.uniforms.systematicOrder?.value || 0.8;
                initialParams.color = firstForm.material.uniforms.baseColor?.value.clone() || new THREE.Color(1.0, 1.0, 1.0);
                initialParams.scale = firstForm.scale.x || 1.0;
            }
        }
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Update all geometric forms
            [...this.geometricForms, ...this.crystallineStructures].forEach(form => {
                if (form.material.uniforms) {
                    if (form.material.uniforms.structuralPrecision) {
                        form.material.uniforms.structuralPrecision.value =
                            initialParams.precision + (targetParams.precision - initialParams.precision) * easeProgress;
                    }
                    
                    if (form.material.uniforms.geometricComplexity) {
                        form.material.uniforms.geometricComplexity.value =
                            initialParams.complexity + (targetParams.complexity - initialParams.complexity) * easeProgress;
                    }
                    
                    if (form.material.uniforms.metallic) {
                        form.material.uniforms.metallic.value =
                            initialParams.metallic + (targetParams.metallic - initialParams.metallic) * easeProgress;
                    }
                    
                    if (form.material.uniforms.systematicOrder) {
                        form.material.uniforms.systematicOrder.value =
                            initialParams.order + (targetParams.order - initialParams.order) * easeProgress;
                    }
                    
                    if (form.material.uniforms.baseColor) {
                        form.material.uniforms.baseColor.value.setRGB(
                            initialParams.color.r + (targetParams.color.r - initialParams.color.r) * easeProgress,
                            initialParams.color.g + (targetParams.color.g - initialParams.color.g) * easeProgress,
                            initialParams.color.b + (targetParams.color.b - initialParams.color.b) * easeProgress
                        );
                    }
                }
                
                // Update scale
                const currentScale = initialParams.scale + (targetParams.scale - initialParams.scale) * easeProgress;
                form.scale.setScalar(currentScale);
            });
            
            // Update precision level
            this.precisionLevel = initialParams.precision + (targetParams.precision - initialParams.precision) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    update(time, audioData) {
        if (!this.structureGroup) return;
        
        try {
            // Extract treble frequencies for structural precision
            const trebleLevel = audioData.trebleLevel || 0;
            const midLevel = audioData.midLevel || 0;
            
            // Update geometric forms
            this.updateGeometricForms(time, audioData);
            
            // Update crystalline structures
            this.updateCrystallineStructures(time, audioData);
            
            // Update systematic patterns
            this.updateSystematicPatterns(time, audioData);
            
        } catch (error) {
            derr('Structure realm update failed:', error);
        }
    }

    updateGeometricForms(time, audioData) {
        const trebleLevel = audioData.trebleLevel || 0;
        const midLevel = audioData.midLevel || 0;
        
        // Log audio data for debugging (when enabled)
        if (window.SONOITE_DEBUG && Math.random() < 0.01) {
            dlog('[STRUCTURE-REALM] Torus audio update:', {
                trebleLevel,
                midLevel,
                formsCount: this.geometricForms.length
            });
        }
        
        this.geometricForms.forEach((form, index) => {
            // Update shader uniforms
            if (form.material.uniforms) {
                form.material.uniforms.time.value = time;
                form.material.uniforms.audioHigh.value = trebleLevel;
                form.material.uniforms.audioMid.value = midLevel;
                
                // Apply theme influence if available
                if (audioData.theme) {
                    form.material.uniforms.geometricComplexity.value = audioData.theme.complexity || 0.5;
                    form.material.uniforms.structuralPrecision.value = audioData.theme.precision || 0.8;
                }
            }
            
            // Precise geometric rotation - SUPER EXTREME for visibility
            if (form.userData.rotationSpeed) {
                form.rotation.x += form.userData.rotationSpeed + trebleLevel * 0.5; // 10x faster!
                form.rotation.y += form.userData.rotationSpeed * 0.7 + trebleLevel * 0.7 + midLevel * 0.3;
                form.rotation.z += form.userData.rotationSpeed * 0.5 + trebleLevel * 0.4;
                
                // EXTREME COLOR CHANGES
                if (form.material && form.material.color) {
                    form.material.color.setRGB(
                        1.0 - trebleLevel * 0.5, // Red decreases with treble
                        0.8 + trebleLevel * 0.2, // Green increases slightly
                        0.2 + trebleLevel * 0.8  // Blue pulses strongly with treble
                    );
                }
                
                // Make it GLOW
                if (form.material && form.material.emissive) {
                    form.material.emissive.setRGB(trebleLevel * 2, trebleLevel * 2, 0);
                    form.material.emissiveIntensity = 0.5 + trebleLevel * 3.0;
                }
            }
            
            // Audio-reactive positioning for Platonic solids - SUPER EXTREME for visibility
            if (form.userData.type === 'platonic' && form.userData.originalPosition) {
                const audioInfluence = trebleLevel * 5.0; // EXTREME: 5x multiplier!
                const structuralPhase = form.userData.structuralPhase + time * 0.005 + trebleLevel * 0.1; // Speed up with treble
                
                const offset = new THREE.Vector3(
                    Math.sin(structuralPhase) * audioInfluence * 2.0, // Double the movement range
                    Math.cos(structuralPhase * 1.3) * audioInfluence * 1.5,
                    Math.sin(structuralPhase * 0.7) * audioInfluence * 2.0
                );
                
                form.position.copy(form.userData.originalPosition).add(offset);
                
                // Controlled scale pulsing
                const controlledScale = 1.0 + trebleLevel * 0.3; // Scale up to 1.3x max
                form.scale.setScalar(Math.min(controlledScale, 1.5)); // Cap at 1.5x
                
            }
        });
    }

    updateCrystallineStructures(time, audioData) {
        const trebleLevel = audioData.trebleLevel || 0;
        const midLevel = audioData.midLevel || 0;
        
        this.crystallineStructures.forEach(crystal => {
            // Update crystal materials
            if (crystal.material?.uniforms) {
                crystal.material.uniforms.time.value = time;
                crystal.material.uniforms.audioHigh.value = trebleLevel;
                crystal.material.uniforms.audioMid.value = midLevel;
            }
            
            // Crystal resonance based on userData
            if (crystal.userData.resonance) {
                const resonanceFreq = crystal.userData.resonance / 1000; // Convert to animation frequency
                crystal.rotation.y += Math.sin(time * resonanceFreq) * 0.01;
            }
            
            // Audio-reactive clarity enhancement
            if (crystal.userData.clarity) {
                const clarityScale = 1.0 + trebleLevel * crystal.userData.clarity * 0.1;
                crystal.scale.setScalar(clarityScale);
            }
            
            // Traverse child meshes for complex structures
            crystal.traverse(child => {
                if (child.isMesh && child.material.uniforms) {
                    child.material.uniforms.time.value = time;
                    child.material.uniforms.audioHigh.value = trebleLevel;
                    child.material.uniforms.audioMid.value = midLevel;
                }
            });
        });
    }

    updateSystematicPatterns(time, audioData) {
        if (!this.systematicPatterns?.geometry?.attributes?.position) return;
        
        const positions = this.systematicPatterns.geometry.attributes.position.array;
        const phases = this.systematicPatterns.geometry.attributes.phase.array;
        const trebleLevel = audioData.trebleLevel || 0;
        
        // Update systematic pattern positions
        for (let i = 0; i < positions.length; i += 3) {
            const particleIndex = i / 3;
            const t = particleIndex / (positions.length / 3);
            const phase = phases[particleIndex];
            
            // Golden spiral with audio reactivity
            const phi = (1 + Math.sqrt(5)) / 2;
            const angle = t * Math.PI * 2 * phi + time * 0.0001;
            const radius = Math.sqrt(t) * (4 + trebleLevel * 2);
            
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = (t - 0.5) * 6;
            positions[i + 2] = Math.sin(angle) * radius;
        }
        
        this.systematicPatterns.geometry.attributes.position.needsUpdate = true;
        
        // Update pattern material with audio reactivity
        this.systematicPatterns.material.opacity = 0.8 + trebleLevel * 0.2;
        this.systematicPatterns.material.size = 0.02 + trebleLevel * 0.01;
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));
        
        // Update geometric form opacities
        [...this.geometricForms, ...this.crystallineStructures].forEach(form => {
            if (form.material.uniforms?.opacity) {
                form.material.uniforms.opacity.value = this.influence * 0.8;
            } else {
                form.material.opacity = this.influence * 0.8;
            }
        });
        
        // Update systematic pattern opacity
        if (this.systematicPatterns?.material) {
            this.systematicPatterns.material.opacity = this.influence * 0.8;
        }
        
        // Control visibility
        // Skip visibility update if Visual Layer API is active
        if (!window.SonoiteExperience?.consciousnessSystem?.useVisualLayerAPI) {
            this.structureGroup.visible = this.influence > 0.01;
        }
    }

    applyCrossInfluence(time, audioData) {
        // Apply influences from other realms
        const flowInfluence = audioData.flowInfluence || 0;
        const consciousnessInfluence = audioData.consciousnessInfluence || 0;
        
        // Modify structural behavior based on cross-influences
        if (flowInfluence > 0.5) {
            // Add organic variations to geometric precision
            this.geometricForms.forEach(form => {
                if (form.material.uniforms?.structuralPrecision) {
                    const organicVariation = Math.sin(time * 0.001 + form.userData.structuralPhase) * flowInfluence * 0.2;
                    form.material.uniforms.structuralPrecision.value = 
                        Math.max(0.2, this.precisionLevel - organicVariation);
                }
            });
        }
        
        if (consciousnessInfluence > 0.7) {
            // Enhance systematic ordering with consciousness
            this.crystallineStructures.forEach(crystal => {
                if (crystal.material.uniforms?.systematicOrder) {
                    crystal.material.uniforms.systematicOrder.value = 
                        Math.min(1.0, 0.8 + consciousnessInfluence * 0.2);
                }
            });
        }
    }

    createFallbackStructure() {
        dwarn('Creating fallback structure realm');
        
        const fallbackGeometry = new THREE.BoxGeometry(2, 2, 2);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.8,
            wireframe: true
        });
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.structureGroup.add(fallbackMesh);
        this.scene.add(this.structureGroup);
        
        this.geometricForms.push(fallbackMesh);
    }

    get position() {
        return this.structureGroup.position;
    }

    dispose() {
        dlog('Disposing Structure Realm...');
        
        try {
            // Dispose geometric forms
            this.geometricForms.forEach(form => {
                if (form.geometry) form.geometry.dispose();
                if (form.material) form.material.dispose();
            });
            
            // Dispose crystalline structures
            this.crystallineStructures.forEach(crystal => {
                crystal.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            });
            
            // Dispose systematic patterns
            if (this.systematicPatterns) {
                if (this.systematicPatterns.geometry) this.systematicPatterns.geometry.dispose();
                if (this.systematicPatterns.material) this.systematicPatterns.material.dispose();
            }
            
            // Remove from scene
            this.scene.remove(this.structureGroup);
            
            // Clear references
            this.geometricForms = [];
            this.crystallineStructures = [];
            this.systematicPatterns = null;
            this.structureGroup = null;
            
        } catch (error) {
            derr('Error disposing Structure Realm:', error);
        }
    }
}