/**
 * Structure Consciousness - Ordered, geometric consciousness states
 * Represents conscious, analytical, ordered awareness through abstract geometric patterns
 */

import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class StructureConsciousness {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.structureGroup = new THREE.Group();
        this.structureElements = [];
        this.geometricPatterns = [];
        this.currentState = 'soft_geometry';
        this.influence = 1.0;
        this.quality = 'high'; // high, medium, low
        this.isWebGL2 = false;
        
        // EMA smoothing for structure intensity to prevent jitter
        this._structureIntensityEMA = 0.5;
        this._elementScaleEMA = new Map(); // Track scale EMA per element
        
        // Audio EMA smoothing (alpha = 0.2)
        this.audioEMA = {
            bassLevel: 0,
            midLevel: 0,
            trebleLevel: 0,
            loudness: 0,
            centroid: 0
        };
        this.emaAlpha = 0.2;

        this.init();
    }

    init() {
        // Check WebGL capabilities
        this.checkWebGLCapabilities();

        try {
            if (window.SONOITE_DEBUG) {
                dlog('Creating geometric forms...');
            }
            this.createGeometricForms();
            if (window.SONOITE_DEBUG) {
                dlog('Creating structured patterns...');
            }
            this.createStructuredPatterns();
            if (window.SONOITE_DEBUG) {
                dlog('Creating analytical lighting...');
            }
            this.createAnalyticalLighting();
            if (window.SONOITE_DEBUG) {
                dlog('Adding to scene...');
            }
            this.scene.add(this.structureGroup);
            if (window.SONOITE_DEBUG) {
                dlog('Structure consciousness initialized successfully');
            }
        } catch (error) {
            derr('Structure Consciousness initialization failed:', error);
            derr('Error stack:', error.stack);
            derr('Error message:', error.message);
            this.createFallbackStructure();
        }
    }

    checkWebGLCapabilities() {
        // Detect WebGL version for optimal shader selection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (gl) {
            this.isWebGL2 = gl.constructor.name === 'WebGL2RenderingContext';
        }

        if (window.SONOITE_DEBUG) {
            dlog(`Structure Consciousness: Using ${this.isWebGL2 ? 'WebGL2' : 'WebGL1'}`);
        }
    }

    createGeometricForms() {
        // Create abstract geometric forms representing structured consciousness
        const formCount = this.getOptimalFormCount();

        for (let i = 0; i < formCount; i++) {
            const structureForm = this.createSingleStructureForm(i);
            this.structureElements.push(structureForm);
            this.structureGroup.add(structureForm);
        }
    }

    getOptimalFormCount() {
        // Adjust form count based on device performance
        const baseCount = 8;

        if (window.innerWidth < 768) {
            return Math.max(4, Math.floor(baseCount * 0.5)); // Mobile
        } else if (this.quality === 'low') {
            return Math.max(4, Math.floor(baseCount * 0.6));
        } else if (this.quality === 'high') {
            return baseCount;
        }

        return Math.floor(baseCount * 0.75); // Medium quality
    }

    createSingleStructureForm(index) {
        // Create geometric forms based on mathematical patterns
        const geometryType = index % 5;
        let geometry;

        switch (geometryType) {
            case 0: // Cube with subdivisions
                geometry = new THREE.BoxGeometry(2, 2, 2, 4, 4, 4);
                break;
            case 1: // Octahedron
                geometry = new THREE.OctahedronGeometry(1.5, 2);
                break;
            case 2: // Icosahedron
                geometry = new THREE.IcosahedronGeometry(1.3, 1);
                break;
            case 3: // Dodecahedron
                geometry = new THREE.DodecahedronGeometry(1.2, 0);
                break;
            case 4: // Tetrahedron
                geometry = new THREE.TetrahedronGeometry(1.8, 1);
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2, 2, 2, 2);
        }

        // Store original positions for structured animation
        const positions = geometry.attributes.position.array;
        const originalPositions = new Float32Array(positions.length);
        const structuredPhases = new Float32Array(positions.length / 3);

        for (let i = 0; i < positions.length; i++) {
            originalPositions[i] = positions[i];
        }

        // Create structured phase patterns
        for (let i = 0; i < structuredPhases.length; i++) {
            // Mathematical progression instead of random
            structuredPhases[i] = (i / structuredPhases.length) * Math.PI * 2;
        }

        geometry.userData = { originalPositions, structuredPhases, geometryType };

        const material = this.createStructureMaterial();
        const structureForm = new THREE.Mesh(geometry, material);

        // Position in geometric distribution
        const layer = Math.floor(index / 4);
        const positionInLayer = index % 4;
        const radius = 2 + layer * 1.5;
        const angle = (positionInLayer / 4) * Math.PI * 2;

        structureForm.position.set(
            Math.cos(angle) * radius,
            (layer - 1) * 3,
            Math.sin(angle) * radius
        );

        // Precise geometric rotation
        structureForm.rotation.set(
            (index * Math.PI) / 4,
            (index * Math.PI) / 6,
            (index * Math.PI) / 8
        );

        structureForm.userData = {
            index,
            geometryType,
            basePosition: structureForm.position.clone(),
            baseRotation: structureForm.rotation.clone(),
            structureSpeed: 0.3 + (index % 3) * 0.2,
            precisionLevel: 0.8 + (index % 2) * 0.2
        };

        return structureForm;
    }

    createGPUPatternMaterial(patternType) {
        // GPU-based pattern shader material
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLow: { value: 0 },
                audioMid: { value: 0 },
                audioHigh: { value: 0 },
                consciousnessLevel: { value: 0.5 },
                patternType: { value: patternType },
                patternColor: { value: new THREE.Color(0xe24a90) },
                opacity: { value: 0.4 },
                structureIntensity: { value: 1.0 },
                meshScale: { value: 1.0 }
            },
            vertexShader: `
                // Instance attributes
                attribute float aPhase;
                attribute vec3 aOriginalPosition;
                attribute float aScale;
                attribute vec2 aPatternParams; // x: ring/row index, y: custom parameter
                
                // Uniforms
                uniform float time;
                uniform float audioLow;
                uniform float audioMid;
                uniform float audioHigh;
                uniform float consciousnessLevel;
                uniform float patternType;
                uniform float structureIntensity;
                
                // Varyings
                varying vec3 vColor;
                varying float vOpacity;
                varying vec3 vPosition;
                
                // Constants
                const float goldenRatio = 1.618033988749;
                const float PI = 3.14159265359;
                
                void main() {
                    // Get instance transform matrix
                    mat4 instanceMat = instanceMatrix;
                    
                    // GPU-based pattern animation
                    float timeScale = time * 0.001;
                    vec3 animatedPos = aOriginalPosition;
                    float animatedScale = aScale;
                    float rotation = 0.0;
                    
                    // Pattern-specific animations
                    if (patternType < 0.5) {
                        // Grid pattern - wave motion
                        float wavePhase = timeScale + aPhase;
                        float audioInfluence = audioHigh * consciousnessLevel;
                        float waveHeight = sin(wavePhase) * audioInfluence * 0.5;
                        animatedPos.y += waveHeight;
                        
                        // Audio-reactive pulsing
                        animatedScale *= 1.0 + audioLow * 0.3 * sin(wavePhase * 2.0);
                        
                        // Geometric rotation
                        rotation = timeScale * 0.2 * goldenRatio + aPhase;
                        
                    } else if (patternType < 1.5) {
                        // Radial pattern - expanding/contracting rings
                        float ring = aPatternParams.x;
                        float expansionPhase = timeScale * 0.3 + ring * 0.1;
                        float expansion = 1.0 + sin(expansionPhase) * audioHigh * consciousnessLevel * 0.3;
                        
                        float angle = aPhase;
                        float radius = length(aOriginalPosition.xz) * expansion;
                        
                        animatedPos.x = cos(angle + timeScale * 0.1) * radius;
                        animatedPos.z = sin(angle + timeScale * 0.1) * radius;
                        animatedPos.y += sin(timeScale * 2.0 + aPhase) * audioMid * 0.2;
                        
                        // Treble-reactive scaling
                        animatedScale *= 1.0 + audioHigh * 0.5;
                        
                    } else {
                        // Spiral pattern - flowing motion
                        float spiralPhase = timeScale * 0.4 + aPhase;
                        float spiralRadius = length(aOriginalPosition.xz);
                        
                        // Spiral rotation
                        float spiralAngle = atan(aOriginalPosition.z, aOriginalPosition.x) + spiralPhase * 0.5;
                        animatedPos.x = cos(spiralAngle) * spiralRadius;
                        animatedPos.z = sin(spiralAngle) * spiralRadius;
                        
                        // Audio-reactive vertical movement
                        animatedPos.y += sin(spiralPhase * goldenRatio) * audioHigh * consciousnessLevel * 0.8;
                        
                        // Complex scaling based on position and audio
                        float t = aPatternParams.x; // normalized position along spiral
                        animatedScale *= 1.0 + audioHigh * (1.0 - t) * 0.4;
                        
                        rotation = spiralPhase;
                    }
                    
                    // Consciousness-based modulation
                    float consciousnessModulation = 0.5 + consciousnessLevel * 0.5;
                    animatedPos *= consciousnessModulation;
                    
                    // Update instance position in matrix
                    instanceMat[3][0] = animatedPos.x;
                    instanceMat[3][1] = animatedPos.y;
                    instanceMat[3][2] = animatedPos.z;
                    
                    // Create scale and rotation matrix
                    float c = cos(rotation);
                    float s = sin(rotation);
                    mat4 transformMat = mat4(
                        animatedScale * c, animatedScale * s, 0.0, 0.0,
                        -animatedScale * s, animatedScale * c, 0.0, 0.0,
                        0.0, 0.0, animatedScale, 0.0,
                        0.0, 0.0, 0.0, 1.0
                    );
                    
                    // Apply transforms
                    vec4 mvPosition = modelViewMatrix * instanceMat * transformMat * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Pass data to fragment shader
                    vPosition = animatedPos;
                    float brightness = 0.7 + audioHigh * 0.3 + sin(timeScale + aPhase) * 0.1;
                    vColor = vec3(brightness);
                    vOpacity = 0.4 + audioHigh * 0.3 + consciousnessLevel * 0.2;
                }
            `,
            fragmentShader: `
                uniform vec3 patternColor;
                uniform float opacity;
                uniform float structureIntensity;
                
                varying vec3 vColor;
                varying float vOpacity;
                varying vec3 vPosition;
                
                void main() {
                    // Mathematical pattern overlay
                    float pattern = sin(vPosition.x * 10.0) * cos(vPosition.z * 10.0) * 0.1;
                    
                    // Apply color with pattern
                    vec3 finalColor = patternColor * vColor * (1.0 + pattern);
                    
                    // Structure intensity affects final opacity
                    float finalOpacity = vOpacity * opacity * structureIntensity;
                    
                    gl_FragColor = vec4(finalColor, finalOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    createStructureMaterial() {
        if (!this.isWebGL2 || this.quality === 'low') {
            // Fallback material for WebGL1 or low quality
            return new THREE.MeshPhongMaterial({
                color: 0xe24a90,
                transparent: true,
                opacity: 0.7,
                shininess: 100,
                wireframe: false,
                side: THREE.DoubleSide
            });
        }

        // Advanced shader material for WebGL2
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioHigh: { value: 0 },
                audioMid: { value: 0 },
                structureIntensity: { value: 1.0 },
                consciousnessLevel: { value: 0.5 },
                structureColor: { value: new THREE.Color(0xe24a90) },
                opacity: { value: 0.7 },
                structurePrecision: { value: 1.0 },
                analyticalDepth: { value: 1.0 },
                meshScale: { value: 1.0 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioHigh;
                uniform float structureIntensity;
                uniform float consciousnessLevel;
                uniform float structurePrecision;
                uniform float analyticalDepth;
                uniform float meshScale;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vStructureField;
                
                // Mathematical functions for geometric patterns
                float goldenRatio = 1.618033988749;
                
                vec3 analyticalDisplacement(vec3 pos, float intensity) {
                    // Mathematical displacement based on geometric principles
                    float phi = goldenRatio;
                    
                    // Fibonacci spiral displacement
                    float fibonacciPhase = length(pos) * phi + time * 0.001;
                    vec3 fibDisplacement = vec3(
                        sin(fibonacciPhase) * cos(pos.y * phi),
                        cos(fibonacciPhase) * sin(pos.x * phi),
                        sin(fibonacciPhase * phi) * cos(pos.z)
                    ) * intensity * 0.1;
                    
                    // Platonic solid harmonics
                    float platonicField = 
                        sin(pos.x * 4.0) * cos(pos.y * 4.0) * sin(pos.z * 4.0) + // Cube harmonics
                        sin(pos.x * 3.0 + pos.y * 3.0 + pos.z * 3.0) + // Tetrahedron
                        cos(pos.x * 5.0) * sin(pos.y * 5.0); // Pentagon base
                    
                    vec3 platonicDisplacement = normalize(pos) * platonicField * intensity * 0.05;
                    
                    return fibDisplacement + platonicDisplacement;
                }
                
                float structuredField(vec3 p, float consciousness) {
                    // Consciousness drives geometric complexity
                    float baseField = sin(p.x * 2.0) * cos(p.y * 2.0) * sin(p.z * 2.0);
                    
                    // Add higher order harmonics with consciousness
                    baseField += sin(p.x * 4.0 * consciousness) * 0.5;
                    baseField += cos(p.y * 6.0 * consciousness) * 0.3;
                    baseField += sin(p.z * 8.0 * consciousness) * 0.2;
                    
                    // Mathematical progressions
                    float progression = sin(length(p) * goldenRatio + time * 0.0005) * consciousness;
                    baseField += progression * 0.4;
                    
                    return baseField;
                }
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Consciousness-driven geometric transformation
                    float consciousnessInfluence = consciousnessLevel; // More structure when more conscious
                    float precisionInfluence = mix(0.5, 1.0, structurePrecision);
                    
                    // Analytical displacement based on geometric principles
                    vec3 displacement = analyticalDisplacement(pos, consciousnessInfluence * structureIntensity);
                    
                    // Audio-reactive structure (high frequencies drive geometric precision)
                    float audioInfluence = clamp(audioHigh, 0.0, 1.0) * structureIntensity;
                    displacement += normal * audioInfluence * 0.3 * precisionInfluence;
                    
                    // Structured field calculation
                    float structField = structuredField(pos, consciousnessInfluence);
                    vStructureField = structField;
                    
                    // Apply mathematical scaling
                    float analyticalScaling = 1.0 + sin(time * 0.0008) * analyticalDepth * 0.1;
                    pos *= analyticalScaling;
                    
                    // Apply displacement
                    pos += displacement;
                    
                    // Precise geometric positioning
                    float geometricPrecision = sin(time * 0.0003) * consciousnessInfluence * 0.05;
                    pos += normal * geometricPrecision * precisionInfluence;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioHigh;
                uniform float audioMid;
                uniform float consciousnessLevel;
                uniform vec3 structureColor;
                uniform float opacity;
                uniform float structurePrecision;
                uniform float analyticalDepth;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vStructureField;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    
                    // Color variation based on consciousness level
                    float consciousnessInfluence = consciousnessLevel;
                    vec3 analyticalColor = structureColor * (0.6 + consciousnessInfluence * 0.6);
                    
                    // Audio-reactive brightness (high frequencies)
                    float audioInfluence = clamp(audioHigh + audioMid * 0.5, 0.0, 1.0);
                    analyticalColor += audioInfluence * 0.5 * structurePrecision;
                    
                    // Structure field visualization
                    float structureViz = abs(vStructureField) * 0.3;
                    analyticalColor = mix(analyticalColor, analyticalColor * 1.8, structureViz);
                    
                    // Geometric precision enhancement
                    float precisionGradient = dot(normal, vec3(1.0, 1.0, 1.0)) * 0.5 + 0.5;
                    analyticalColor *= precisionGradient * structurePrecision * 0.7 + 0.3;
                    
                    // Mathematical pattern overlay
                    float goldenRatio = 1.618033988749;
                    float mathPattern = sin(vPosition.x * goldenRatio * 4.0 + time * 0.001) * 
                                       cos(vPosition.y * goldenRatio * 3.0 + time * 0.0008);
                    analyticalColor += mathPattern * analyticalDepth * 0.15;
                    
                    // Analytical depth rim lighting
                    float rim = 1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0)));
                    rim = pow(rim, 3.0) * consciousnessInfluence;
                    analyticalColor += rim * structureColor * 0.4;
                    
                    // Final opacity based on consciousness and precision
                    float finalOpacity = opacity * structurePrecision * (0.4 + consciousnessInfluence * 0.6);
                    
                    gl_FragColor = vec4(analyticalColor, finalOpacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    createStructuredPatterns() {
        // Create mathematical pattern overlays
        const patternCount = this.quality === 'low' ? 2 : (this.quality === 'medium' ? 4 : 6);

        for (let i = 0; i < patternCount; i++) {
            const pattern = this.createSinglePattern(i);
            this.geometricPatterns.push(pattern);
            this.structureGroup.add(pattern);
        }
    }

    createSinglePattern(index) {
        // Create geometric pattern based on mathematical principles using GPU instancing
        const patternType = index % 3;
        const patternCount = this.geometricPatterns.length + 1; // Current count plus this one
        
        // Configure instance count based on quality and pattern type
        const particleCounts = window.sonoiteData?.particleCounts?.structure_consciousness || { low: 50, medium: 100, high: 200 };
        const baseCount = this.quality === 'low' ? particleCounts.low : (this.quality === 'medium' ? particleCounts.medium : particleCounts.high);
        const instanceCount = patternType === 0 ? baseCount : Math.floor(baseCount * 0.8); // Grid patterns need more instances
        
        // Base geometry for instances - small box or plane
        const tempGeometry = patternType === 1 
            ? new THREE.BoxGeometry(0.05, 0.05, 0.05) 
            : new THREE.PlaneGeometry(0.1, 0.1);
        
        // Convert to InstancedBufferGeometry for proper instancing support
        const baseGeometry = new THREE.InstancedBufferGeometry();
        baseGeometry.instanceCount = instanceCount;
        baseGeometry.index = tempGeometry.index;
        baseGeometry.attributes = tempGeometry.attributes;
        
        // Create GPU shader material for patterns
        const material = this.createGPUPatternMaterial(patternType);
        
        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, instanceCount);
        
        // Create instance attributes for GPU animation
        const phases = new Float32Array(instanceCount);
        const originalPositions = new Float32Array(instanceCount * 3);
        const scales = new Float32Array(instanceCount);
        const patternParams = new Float32Array(instanceCount * 2); // Additional pattern-specific parameters
        
        // Initialize instances based on pattern type
        const dummy = new THREE.Object3D();
        
        switch (patternType) {
            case 0: // Grid pattern
                this.initializeGridPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy);
                break;
            case 1: // Radial pattern
                this.initializeRadialPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy);
                break;
            case 2: // Spiral pattern
                this.initializeSpiralPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy);
                break;
        }
        
        // Add custom instance attributes to geometry
        baseGeometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
        baseGeometry.setAttribute('aOriginalPosition', new THREE.InstancedBufferAttribute(originalPositions, 3));
        baseGeometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
        baseGeometry.setAttribute('aPatternParams', new THREE.InstancedBufferAttribute(patternParams, 2));
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Position the entire pattern group
        const angle = (index / patternCount) * Math.PI * 2;
        const radius = 4 + index * 0.5;
        
        instancedMesh.position.set(
            Math.cos(angle) * radius,
            Math.sin(index * 0.8) * 2,
            Math.sin(angle) * radius
        );
        
        // Store minimal data needed for shader updates
        instancedMesh.userData = {
            patternType: patternType,
            index: index,
            material: material,
            basePosition: instancedMesh.position.clone()
        };

        return instancedMesh;
    }
    
    initializeGridPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy) {
        const instanceCount = instancedMesh.count;
        const gridSize = Math.ceil(Math.sqrt(instanceCount));
        const spacing = 0.4;
        const offset = (gridSize - 1) * spacing * 0.5;
        
        let instanceIndex = 0;
        for (let x = 0; x < gridSize && instanceIndex < instanceCount; x++) {
            for (let z = 0; z < gridSize && instanceIndex < instanceCount; z++) {
                const i3 = instanceIndex * 3;
                
                // Grid positions
                const xPos = x * spacing - offset;
                const zPos = z * spacing - offset;
                const yPos = 0;
                
                originalPositions[i3] = xPos;
                originalPositions[i3 + 1] = yPos;
                originalPositions[i3 + 2] = zPos;
                
                phases[instanceIndex] = (x + z) * 0.5;
                scales[instanceIndex] = 0.8 + Math.random() * 0.4;
                patternParams[instanceIndex * 2] = x; // row index
                patternParams[instanceIndex * 2 + 1] = z; // column index
                
                dummy.position.set(xPos, yPos, zPos);
                dummy.scale.setScalar(scales[instanceIndex]);
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
                
                instanceIndex++;
            }
        }
    }
    
    initializeRadialPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy) {
        const instanceCount = instancedMesh.count;
        const rings = 12;
        const instancesPerRing = Math.floor(instanceCount / rings);
        
        for (let i = 0; i < instanceCount; i++) {
            const i3 = i * 3;
            const ring = Math.floor(i / instancesPerRing);
            const angleIndex = i % instancesPerRing;
            
            const radius = (ring + 1) * 0.5;
            const angle = (angleIndex / instancesPerRing) * Math.PI * 2;
            
            const xPos = Math.cos(angle) * radius;
            const yPos = 0;
            const zPos = Math.sin(angle) * radius;
            
            originalPositions[i3] = xPos;
            originalPositions[i3 + 1] = yPos;
            originalPositions[i3 + 2] = zPos;
            
            phases[i] = angle + ring * 0.2;
            scales[i] = 0.5 + (ring / rings) * 0.5;
            patternParams[i * 2] = ring; // ring index
            patternParams[i * 2 + 1] = angleIndex / instancesPerRing; // normalized angle
            
            dummy.position.set(xPos, yPos, zPos);
            dummy.scale.setScalar(patternData.scales[i]);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
    }
    
    initializeSpiralPatternGPU(instancedMesh, phases, originalPositions, scales, patternParams, dummy) {
        const instanceCount = instancedMesh.count;
        const goldenRatio = 1.618033988749;
        
        for (let i = 0; i < instanceCount; i++) {
            const i3 = i * 3;
            const t = i / instanceCount;
            const angle = t * Math.PI * 2 * 8; // 8 rotations
            const radius = t * 6; // Expanding radius
            
            const xPos = Math.cos(angle) * radius;
            const yPos = (t - 0.5) * 4; // Vertical spread
            const zPos = Math.sin(angle) * radius;
            
            originalPositions[i3] = xPos;
            originalPositions[i3 + 1] = yPos;
            originalPositions[i3 + 2] = zPos;
            
            phases[i] = t * Math.PI * 2 * goldenRatio;
            scales[i] = 0.3 + t * 0.7;
            patternParams[i * 2] = t; // normalized position along spiral
            patternParams[i * 2 + 1] = angle; // spiral angle
            
            dummy.position.set(xPos, yPos, zPos);
            dummy.scale.setScalar(scales[i]);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
    }

    createSpiralGeometry() {
        const points = [];
        const goldenRatio = 1.618033988749;
        
        for (let i = 0; i < 100; i++) {
            const t = i * 0.1;
            const radius = t * 0.3;
            const angle = t * goldenRatio;
            
            points.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                t * 0.1,
                Math.sin(angle) * radius
            ));
        }
        
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
    }

    createAnalyticalLighting() {
        // Precise, analytical lighting for structured consciousness
        const structureLight1 = new THREE.DirectionalLight(0xe24a90, 0.4);
        structureLight1.position.set(4, 4, 4);
        this.structureGroup.add(structureLight1);

        const structureLight2 = new THREE.DirectionalLight(0xf27bb3, 0.3);
        structureLight2.position.set(-4, 2, -4);
        this.structureGroup.add(structureLight2);

        // Sharp analytical light
        const analyticalLight = new THREE.SpotLight(0xd53a7b, 0.6, 20, Math.PI / 6, 0.3);
        analyticalLight.position.set(0, 8, 0);
        analyticalLight.target.position.set(0, 0, 0);
        this.structureGroup.add(analyticalLight);
        this.structureGroup.add(analyticalLight.target);
    }

    transitionTo(state, duration = 3.0) {
        this.currentState = state;

        // Define universal structure consciousness states
        const stateParams = {
            soft_geometry: {
                structureIntensity: 0.6,
                structurePrecision: 0.7,
                analyticalDepth: 0.6,
                color: { r: 0.89, g: 0.29, b: 0.56 },
                opacity: 0.6,
                patternOpacity: 0.3
            },
            rigid_patterns: {
                structureIntensity: 0.8,    // Strong but fractured
                structurePrecision: 0.3,     // Imprecise, glitchy
                analyticalDepth: 0.1,        // Shallow, confused
                color: { r: 0.1, g: 0.1, b: 0.2 }, // Almost black
                opacity: 0.95,               // Very heavy presence
                patternOpacity: 0.9         // Sharp, oppressive patterns
            },
            information_grid: {
                structureIntensity: 0.8,
                structurePrecision: 0.9,
                analyticalDepth: 0.8,
                color: { r: 0.3, g: 0.6, b: 0.9 },
                opacity: 0.7,
                patternOpacity: 0.9
            },
            dormant_order: {
                structureIntensity: 0.3,
                structurePrecision: 0.5,
                analyticalDepth: 0.4,
                color: { r: 0.5, g: 0.5, b: 0.6 },
                opacity: 0.4,
                patternOpacity: 0.2
            },
            deconstructed_patterns: {
                structureIntensity: 0.2,
                structurePrecision: 0.2,
                analyticalDepth: 0.3,
                color: { r: 0.4, g: 0.3, b: 0.4 },
                opacity: 0.3,
                patternOpacity: 0.1
            },
            nested_structures: {
                structureIntensity: 0.9,
                structurePrecision: 0.8,
                analyticalDepth: 1.0,
                color: { r: 0.6, g: 0.4, b: 0.8 },
                opacity: 0.8,
                patternOpacity: 0.7
            },
            perfect_order: {
                structureIntensity: 1.0,
                structurePrecision: 1.0,
                analyticalDepth: 1.0,
                color: { r: 0.4, g: 0.8, b: 0.6 },
                opacity: 0.9,
                patternOpacity: 1.0
            }
        };

        const params = stateParams[state] || stateParams.soft_geometry;
        this.animateToParams(params, duration);
    }

    animateToParams(targetParams, duration) {
        const startTime = performance.now();

        // Animate structure elements
        this.structureElements.forEach(element => {
            if (element.material.uniforms) {
                this.animateShaderUniforms(element.material.uniforms, targetParams, duration, startTime);
            } else {
                this.animateBasicMaterial(element.material, targetParams, duration, startTime);
            }
        });

        // Animate geometric patterns
        this.geometricPatterns.forEach(pattern => {
            this.animatePatternMaterial(pattern.material, targetParams, duration, startTime);
        });
    }

    animateShaderUniforms(uniforms, targetParams, duration, startTime) {
        const initialValues = {
            structureIntensity: uniforms.structureIntensity.value,
            structurePrecision: uniforms.structurePrecision.value,
            analyticalDepth: uniforms.analyticalDepth.value,
            opacity: uniforms.opacity.value,
            color: uniforms.structureColor.value.clone()
        };

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            uniforms.structureIntensity.value =
                initialValues.structureIntensity + (targetParams.structureIntensity - initialValues.structureIntensity) * easeProgress;

            uniforms.structurePrecision.value =
                initialValues.structurePrecision + (targetParams.structurePrecision - initialValues.structurePrecision) * easeProgress;

            uniforms.analyticalDepth.value =
                initialValues.analyticalDepth + (targetParams.analyticalDepth - initialValues.analyticalDepth) * easeProgress;

            uniforms.opacity.value =
                initialValues.opacity + (targetParams.opacity - initialValues.opacity) * easeProgress;

            uniforms.structureColor.value.setRGB(
                initialValues.color.r + (targetParams.color.r - initialValues.color.r) * easeProgress,
                initialValues.color.g + (targetParams.color.g - initialValues.color.g) * easeProgress,
                initialValues.color.b + (targetParams.color.b - initialValues.color.b) * easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    animateBasicMaterial(material, targetParams, duration, startTime) {
        const initialColor = material.color.clone();
        const initialOpacity = material.opacity;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            material.color.setRGB(
                initialColor.r + (targetParams.color.r - initialColor.r) * easeProgress,
                initialColor.g + (targetParams.color.g - initialColor.g) * easeProgress,
                initialColor.b + (targetParams.color.b - initialColor.b) * easeProgress
            );

            material.opacity = initialOpacity + (targetParams.opacity - initialOpacity) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    animatePatternMaterial(material, targetParams, duration, startTime) {
        const initialOpacity = material.opacity;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            material.opacity = initialOpacity + (targetParams.patternOpacity - initialOpacity) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    applyColorToStructures(targetColor) {
        // Apply color INSTANTLY for dramatic effect
        this.structureElements.forEach(element => {
            if (element.material.uniforms && element.material.uniforms.structureColor) {
                // Shader material - instant color change
                element.material.uniforms.structureColor.value.copy(targetColor);
            } else if (element.material.color) {
                // Basic material - instant color change
                element.material.color.copy(targetColor);
                // BRIGHT emissive glow
                if (element.material.emissive) {
                    element.material.emissive.copy(targetColor).multiplyScalar(0.8); // Brighter glow
                    element.material.emissiveIntensity = 1.5; // Extra bright
                }
            }
        });
        
        // Also apply to geometric patterns
        this.geometricPatterns.forEach(pattern => {
            if (pattern.material.color) {
                pattern.material.color.copy(targetColor);
            }
            if (pattern.material.emissive) {
                pattern.material.emissive.copy(targetColor).multiplyScalar(0.6);
                pattern.material.emissiveIntensity = 1.2;
            }
        });
    }

    update(time, audioData, consciousnessLevel) {
        try {
            // EXAGGERATED Pitch-to-Color: Use chroma feature to map musical notes to colors
            if (audioData.meyda && audioData.meyda.chroma) {
                const chroma = audioData.meyda.chroma;
                // Find the dominant note (highest value in chroma vector)
                let dominantNote = 0;
                let maxChromaValue = 0;
                for (let i = 0; i < chroma.length; i++) {
                    if (chroma[i] > maxChromaValue) {
                        maxChromaValue = chroma[i];
                        dominantNote = i;
                    }
                }
                
                // EXTREME color mapping - full rainbow
                const hue = dominantNote / 12; // 0-1 range
                const saturation = 1.0; // FULL saturation always
                const lightness = 0.3 + maxChromaValue * 0.7; // More dramatic brightness changes
                
                // Create BRIGHT color from HSL
                const targetColor = new THREE.Color();
                targetColor.setHSL(hue, saturation, lightness);
                
                // Apply color to all structure elements
                this.applyColorToStructures(targetColor);
                
                // Log for debugging
                if (Math.random() < 0.01) { // Log occasionally
                    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    if (window.SONOITE_DEBUG) {
                        dlog(`🎹 Dominant Note: ${noteNames[dominantNote]} → Hue: ${(hue * 360).toFixed(0)}°`);
                        dlog(`🎹 Applying color to ${this.structureElements.length} elements and ${this.geometricPatterns.length} patterns`);
                    }
                }
            } else {
                // If no Meyda data, use random colors for testing
                if (Math.random() < 0.01) {
                    if (window.SONOITE_DEBUG) {
                        dlog('⚠️ No Meyda chroma data available!');
                    }
                    const testColor = new THREE.Color();
                    testColor.setHSL(Math.random(), 1.0, 0.5);
                    this.applyColorToStructures(testColor);
                }
            }
            
            // Update structure elements
            this.updateStructureElements(time, audioData, consciousnessLevel);

            // Update geometric patterns
            this.updateGeometricPatterns(time, audioData, consciousnessLevel);

            // Update group rotation for analytical movement
            this.structureGroup.rotation.y = time * 0.0002;
            this.structureGroup.rotation.x = Math.sin(time * 0.0001) * 0.05;

        } catch (error) {
            derr('Structure consciousness update failed:', error);
        }
    }

    updateStructureElements(time, audioData, consciousnessLevel) {
        /* === V3 ADD start: PROMPT_3_2_STRUCTURE_VISIBILITY === */
        // Calculate structure intensity from treble (high frequencies drive analytical/structure)
        const trebleLevel = audioData.trebleLevel || 0;
        const targetIntensity = 0.3 + trebleLevel * 0.7; // Range: 0.3 to 1.0
        
        // Apply EMA smoothing with alpha=0.2 as specified
        this._structureIntensityEMA = 0.8 * this._structureIntensityEMA + 0.2 * targetIntensity;
        /* === V3 ADD end: PROMPT_3_2_STRUCTURE_VISIBILITY === */
        
        this.structureElements.forEach((element, index) => {
            // Audio-reactive movement for structures with smoothing
            if (audioData && audioData.meyda) {
                // Extract loudness value properly
                const loudnessData = audioData.meyda.loudness;
                const loudness = typeof loudnessData === 'object' ? 
                    (loudnessData.total || 0) : 
                    (parseFloat(loudnessData) || 0);
                const centroid = parseFloat(audioData.meyda.spectralCentroid) || 0;
                
                // Apply EMA smoothing
                this.audioEMA.loudness = (1 - this.emaAlpha) * this.audioEMA.loudness + this.emaAlpha * loudness;
                this.audioEMA.centroid = (1 - this.emaAlpha) * this.audioEMA.centroid + this.emaAlpha * centroid;
                this.audioEMA.trebleLevel = (1 - this.emaAlpha) * this.audioEMA.trebleLevel + this.emaAlpha * (audioData.trebleLevel || 0);
                
                /* === V3 MOD start: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                // Initialize element scale EMA if needed
                if (!this._elementScaleEMA.has(element)) {
                    this._elementScaleEMA.set(element, 1.0);
                }
                
                // Scale based on treble (structure) instead of loudness, clamped to ±15%
                const targetScale = 1.0 + (this._structureIntensityEMA - 0.5) * 0.3; // Maps 0.3-1.0 to 0.91-1.15
                const clampedScale = Math.max(0.85, Math.min(1.15, targetScale)); // Ensure ±15% bounds
                
                // Apply per-element EMA smoothing
                const currentEMA = this._elementScaleEMA.get(element);
                const newEMA = 0.8 * currentEMA + 0.2 * clampedScale;
                this._elementScaleEMA.set(element, newEMA);
                
                element.scale.setScalar(newEMA);
                /* === V3 MOD end: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                
                // Update shader uniform if it exists
                if (element.material && element.material.uniforms && element.material.uniforms.meshScale) {
                    /* === V3 MOD start: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                    element.material.uniforms.meshScale.value = newEMA;
                    /* === V3 MOD end: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                }
                
                /* === V3 ADD start: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                // Add emissive glow based on treble for better visibility
                if (element.material.emissive) {
                    // Smoothed treble drives emissive intensity
                    const emissiveIntensity = 0.5 + this._structureIntensityEMA * 1.0; // Range: 0.5 to 1.5
                    element.material.emissiveIntensity = emissiveIntensity;
                }
                
                // Update shader uniforms for emissive if available
                if (element.material.uniforms && element.material.uniforms.emissiveIntensity) {
                    element.material.uniforms.emissiveIntensity.value = 0.5 + this._structureIntensityEMA * 1.0;
                }
                /* === V3 ADD end: PROMPT_3_2_STRUCTURE_VISIBILITY === */
                
                // Rotation based on smoothed audio
                const userData = element.userData;
                if (userData) {
                    // Geometric rotation patterns with clamped values
                    const nyquist = 22050;
                    const normalizedCentroidRotation = Math.min(this.audioEMA.centroid / nyquist, 1);
                    element.rotation.x = userData.baseRotation.x + normalizedCentroidRotation * 0.5; // Max 0.5 rad
                    element.rotation.y = userData.baseRotation.y + time * 0.001 * userData.structureSpeed;  // Gentle rotation
                    element.rotation.z = userData.baseRotation.z + Math.sin(time * 0.002) * (this.audioEMA.loudness / 30) * 0.3;
                    
                    // Position movement with clamped radius
                    if (userData.basePosition) {
                        const baseRadius = Math.sqrt(userData.basePosition.x * userData.basePosition.x + userData.basePosition.z * userData.basePosition.z);
                        const radius = baseRadius * (0.9 + (this.audioEMA.loudness / 30) * 0.2); // Subtle radius change
                        const angle = Math.atan2(userData.basePosition.z, userData.basePosition.x) + time * 0.002 * userData.structureSpeed;
                        element.position.x = Math.cos(angle) * radius;
                        element.position.z = Math.sin(angle) * radius;
                        element.position.y = userData.basePosition.y + Math.sin(time * 0.002 + index * 0.5) * 3 * normalizedCentroidRotation;
                    }
                }
            }
            
            // Update shader uniforms if available
            if (element.material.uniforms) {
                element.material.uniforms.time.value = time;
                // Set audio uniforms with clamped values
                element.material.uniforms.audioHigh.value = Math.min((audioData.trebleLevel || 0) * 1.0, 1.0);
                element.material.uniforms.audioMid.value = Math.min((audioData.midLevel || 0) * 1.1, 1.0);
                if (element.material.uniforms.audioLow) {
                    element.material.uniforms.audioLow.value = Math.min((audioData.bassLevel || 0) * 1.2, 1.0);
                }
                element.material.uniforms.consciousnessLevel.value = consciousnessLevel;
                
                // UPDATE COLORS BASED ON AUDIO! (for shader materials)
                if (element.material.uniforms.structureColor && audioData.meyda) {
                    // Use spectral centroid for hue (like background does)
                    const centroid = audioData.meyda.spectralCentroid || 1000;
                    const normalizedCentroid = Math.min(centroid / 4000, 1);
                    const hue = normalizedCentroid;
                    
                    // Extract loudness
                    const loudnessData = audioData.meyda.loudness;
                    const loudness = typeof loudnessData === 'object' ? 
                        (loudnessData.total || 0) : 
                        (parseFloat(loudnessData) || 0);
                    
                    // Use loudness for brightness
                    const saturation = 0.8;
                    const lightness = 0.4 + (loudness / 50) * 0.6; // 0.4 to 1.0
                    
                    element.material.uniforms.structureColor.value.setHSL(hue, saturation, lightness);
                }
                
                // DRAMATIC Meyda effects for structure elements
                if (audioData.meyda) {
                    // Use loudness for opacity pulsing (AMPLIFIED)
                    if (audioData.meyda.loudness) {
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        const normalizedLoudness = Math.min(loudnessValue / 30, 1);
                        element.material.uniforms.opacity.value = 0.3 + normalizedLoudness * 0.7; // Range: 0.3 to 1.0
                    }
                    
                    // Use spectral centroid for analytical depth (AMPLIFIED)
                    if (audioData.meyda.spectralCentroid) {
                        const nyquist = 22050; // Half of typical 44.1kHz sample rate
                        const normalizedCentroid = Math.min(audioData.meyda.spectralCentroid / nyquist, 1);
                        element.material.uniforms.analyticalDepth.value = 0.5 + normalizedCentroid * 2.0; // AMPLIFIED
                    }
                    
                    // Use chroma for structure intensity with clamping
                    if (audioData.meyda.chroma) {
                        const maxChroma = Math.max(...audioData.meyda.chroma);
                        element.material.uniforms.structureIntensity.value = 0.7 + maxChroma * 0.5; // Max 1.5x
                    }
                }
            }

            // DRAMATIC geometric rotation and movement
            const userData = element.userData;
            const structureSpeed = userData.structureSpeed * consciousnessLevel;
            const precisionLevel = userData.precisionLevel;

            // Mathematical rotation patterns with Meyda influence
            const goldenRatio = 1.618033988749;
            const rotationMultiplier = audioData.meyda?.loudness ? 
                ((typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness) / 20) : 1;
            element.rotation.x = userData.baseRotation.x + time * 0.0001 * structureSpeed * goldenRatio * rotationMultiplier;
            element.rotation.y = userData.baseRotation.y + time * 0.00008 * structureSpeed * rotationMultiplier;
            element.rotation.z = userData.baseRotation.z + time * 0.00012 * structureSpeed / goldenRatio * rotationMultiplier;

            // Audio-reactive positioning with smoothed values
            const meydaInfluence = this.audioEMA.centroid ? (this.audioEMA.centroid / 4000) : 1;
            const audioInfluence = (this.audioEMA.trebleLevel || 0) * precisionLevel * meydaInfluence * 0.5;
            const structuredMovement = Math.sin(time * 0.0005 + index) * audioInfluence * 0.3;
            
            element.position.y = userData.basePosition.y + structuredMovement;
            element.position.x = userData.basePosition.x + Math.cos(time * 0.0003 + index) * audioInfluence * 0.5; // AMPLIFIED
            
            // Add pulsing scale based on loudness
            if (audioData.meyda?.loudness) {
                const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                const scalePulse = 1 + (loudnessValue / 25) * 0.6; // Scale 1.0 to 1.6
                element.scale.setScalar(scalePulse);
                
                // Update shader uniform if it exists
                if (element.material && element.material.uniforms && element.material.uniforms.meshScale) {
                    element.material.uniforms.meshScale.value = scalePulse;
                }
            }
            
            // ULTRA DRAMATIC color changes for non-shader materials
            if (!element.material.uniforms && element.material) {
                if (audioData.meyda) {
                    // RAINBOW COLORS from chroma data
                    if (audioData.meyda.chroma && audioData.meyda.chroma.length > 0) {
                        const chroma = audioData.meyda.chroma;
                        let dominantNote = 0;
                        let maxChromaValue = 0;
                        for (let i = 0; i < chroma.length; i++) {
                            if (chroma[i] > maxChromaValue) {
                                maxChromaValue = chroma[i];
                                dominantNote = i;
                            }
                        }
                        
                        // FULL SPECTRUM RAINBOW
                        const hue = dominantNote / 12;
                        const saturation = 0.8 + maxChromaValue * 0.2; // HIGH saturation
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        const lightness = 0.3 + (loudnessValue / 30) * 0.5; // Dynamic brightness
                        
                        if (element.material.color) {
                            element.material.color.setHSL(hue, saturation, lightness);
                        }
                        
                        // GLOWING emissive colors
                        if (element.material.emissive) {
                            element.material.emissive.setHSL(hue, saturation, lightness * 0.8);
                            element.material.emissiveIntensity = 1.0 + maxChromaValue * 3.0; // AMPLIFIED glow
                        }
                    }
                    
                    // Opacity pulsing with loudness
                    if (audioData.meyda.loudness && element.material.opacity !== undefined) {
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        const normalizedLoudness = Math.min(loudnessValue / 30, 1);
                        element.material.opacity = 0.5 + normalizedLoudness * 0.5;
                    }
                    
                    // Metalness/roughness from spectral centroid
                    if (audioData.meyda.spectralCentroid) {
                        const nyquist = 22050; // Half of typical 44.1kHz sample rate
                        const normalizedCentroid = Math.min(audioData.meyda.spectralCentroid / nyquist, 1);
                        if (element.material.metalness !== undefined) {
                            element.material.metalness = normalizedCentroid * 0.8;
                        }
                        if (element.material.roughness !== undefined) {
                            element.material.roughness = 0.2 + (1 - normalizedCentroid) * 0.6;
                        }
                    }
                }
            }
        });
    }

    updateGeometricPatterns(time, audioData, consciousnessLevel) {
        this.geometricPatterns.forEach((instancedMesh, patternIndex) => {
            // Update shader uniforms only - all animation happens on GPU
            if (instancedMesh.userData.material && instancedMesh.userData.material.uniforms) {
                const uniforms = instancedMesh.userData.material.uniforms;
                uniforms.time.value = time;
                // Set audio values for particles with clamping
                uniforms.audioLow.value = Math.min((audioData.bassLevel || 0) * 1.2, 1.0);
                uniforms.audioMid.value = Math.min((audioData.midLevel || 0) * 1.1, 1.0);
                uniforms.audioHigh.value = Math.min((audioData.trebleLevel || 0) * 1.0, 1.0);
                uniforms.consciousnessLevel.value = consciousnessLevel;
                
                // Update color based on Meyda data (if available)
                if (audioData.meyda && audioData.meyda.chroma) {
                    const chroma = audioData.meyda.chroma;
                    let dominantNote = 0;
                    let maxChromaValue = 0;
                    for (let i = 0; i < chroma.length; i++) {
                        if (chroma[i] > maxChromaValue) {
                            maxChromaValue = chroma[i];
                            dominantNote = i;
                        }
                    }
                    
                    const hue = dominantNote / 12;
                    const saturation = 1.0;
                    const lightness = 0.3 + maxChromaValue * 0.7;
                    
                    uniforms.patternColor.value.setHSL(hue, saturation, lightness);
                }
            }
            
            // Pattern group rotation still happens on CPU for overall movement
            const goldenRatio = 1.618033988749;
            switch (instancedMesh.userData.patternType) {
                case 0: // Grid pattern
                    instancedMesh.rotation.z = time * 0.0001 * goldenRatio;
                    break;
                case 1: // Radial pattern
                    instancedMesh.rotation.y = time * 0.0002;
                    break;
                case 2: // Spiral pattern
                    instancedMesh.rotation.x = time * 0.00005;
                    instancedMesh.rotation.y = time * 0.0002;
                    break;
            }
        });
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));

        // Apply influence to visibility and opacity
        // Skip visibility update if Visual Layer API is active
        if (!window.SonoiteExperience?.consciousnessSystem?.useVisualLayerAPI) {
            this.structureGroup.visible = this.influence > 0.01;
        }

        if (this.influence > 0.01) {
            this.structureGroup.scale.setScalar(0.5 + this.influence * 0.5);

            // Update material opacity
            this.structureElements.forEach(element => {
                if (element.material.uniforms && element.material.uniforms.opacity) {
                    element.material.uniforms.opacity.value = this.influence * 0.7;
                } else {
                    element.material.opacity = this.influence * 0.7;
                }
            });

            this.geometricPatterns.forEach(pattern => {
                pattern.material.opacity = this.influence * 0.4;
            });
        }
    }

    setPosition(x, y, z) {
        this.structureGroup.position.set(x, y, z);
    }

    reduceQuality() {
        if (this.quality === 'high') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'low';
        }

        // Remove some elements for performance
        if (this.quality === 'low' && this.structureElements.length > 4) {
            const elementsToRemove = this.structureElements.splice(4);
            elementsToRemove.forEach(element => {
                element.geometry.dispose();
                element.material.dispose();
                this.structureGroup.remove(element);
            });
        }

        if (window.SONOITE_DEBUG) {
            dlog(`Structure consciousness quality reduced to: ${this.quality}`);
        }
    }

    increaseQuality() {
        if (this.quality === 'low') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'high';
        }

        if (window.SONOITE_DEBUG) {
            dlog(`Structure consciousness quality increased to: ${this.quality}`);
        }
    }

    createFallbackStructure() {
        // Simple fallback for failed initialization
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xe24a90,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });

        const fallback = new THREE.Mesh(geometry, material);
        this.structureGroup.add(fallback);
        this.scene.add(this.structureGroup);

        if (window.SONOITE_DEBUG) {
            dwarn('Structure consciousness running in fallback mode');
        }
    }

    dispose() {
        // Clean up all structure consciousness resources
        this.structureElements.forEach(element => {
            if (element.geometry) element.geometry.dispose();
            if (element.material) element.material.dispose();
        });

        this.geometricPatterns.forEach(pattern => {
            if (pattern.geometry) pattern.geometry.dispose();
            if (pattern.material) pattern.material.dispose();
        });

        this.scene.remove(this.structureGroup);
        this.structureElements = [];
        this.geometricPatterns = [];
        
        /* === V3 ADD start: PROMPT_3_2_STRUCTURE_VISIBILITY === */
        // Clear EMA tracking
        this._elementScaleEMA.clear();
        /* === V3 ADD end: PROMPT_3_2_STRUCTURE_VISIBILITY === */

        if (window.SONOITE_DEBUG) {
            dlog('Structure consciousness disposed');
        }
    }
}