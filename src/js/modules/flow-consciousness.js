/**
 * Flow Consciousness - Organic, dream-like consciousness states
 * Represents unconscious, flowing, dream awareness through abstract forms
 */

import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class FlowConsciousness {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.flowGroup = new THREE.Group();
        this.flowElements = [];
        this.particleSystems = [];
        this.currentState = 'gentle_waves';
        this.influence = 1.0;
        this.quality = 'high'; // high, medium, low
        this.isWebGL2 = false;
        
        // EMA smoothing for audio values (alpha = 0.2)
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

    /* === V3 ADD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
    // Helper to safely set uniforms without throwing errors
    setUniformSafe(material, name, value) {
        if (material && material.uniforms && material.uniforms[name]) {
            material.uniforms[name].value = value;
            return true;
        }
        return false;
    }
    /* === V3 ADD end: PROMPT_3_1_PIPELINE_INTEGRITY === */

    init() {
        // Check WebGL capabilities
        this.checkWebGLCapabilities();

        try {
            this.createFlowingForms();
            this.createDreamParticles();
            this.createOrganicLighting();
            this.scene.add(this.flowGroup);
        } catch (error) {
            derr('Flow Consciousness initialization failed:', error);
            this.createFallbackFlow();
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
            dlog(`Flow Consciousness: Using ${this.isWebGL2 ? 'WebGL2' : 'WebGL1'}`);
        }
    }

    createFlowingForms() {
        // Create abstract flowing forms representing dream consciousness
        const formCount = this.getOptimalFormCount();

        for (let i = 0; i < formCount; i++) {
            const flowForm = this.createSingleFlowForm(i);
            this.flowElements.push(flowForm);
            this.flowGroup.add(flowForm);
        }
    }

    getOptimalFormCount() {
        // Adjust form count based on device performance
        const baseCount = 6;

        if (window.innerWidth < 768) {
            return Math.max(3, Math.floor(baseCount * 0.5)); // Mobile
        } else if (this.quality === 'low') {
            return Math.max(3, Math.floor(baseCount * 0.7));
        } else if (this.quality === 'high') {
            return baseCount;
        }

        return Math.floor(baseCount * 0.85); // Medium quality
    }

    createSingleFlowForm(index) {
        // Create organic flowing geometry
        const segments = this.quality === 'low' ? 8 : (this.quality === 'medium' ? 16 : 32);
        const geometry = new THREE.CylinderGeometry(0.1, 1.2, 5, segments, segments);

        // Store original positions for organic animation
        const positions = geometry.attributes.position.array;
        const originalPositions = new Float32Array(positions.length);
        const phases = new Float32Array(positions.length / 3);

        for (let i = 0; i < positions.length; i++) {
            originalPositions[i] = positions[i];
        }

        for (let i = 0; i < phases.length; i++) {
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.userData = { originalPositions, phases };

        const material = this.createFlowMaterial();
        const flowForm = new THREE.Mesh(geometry, material);

        // Position in organic distribution
        const angle = (index / this.getOptimalFormCount()) * Math.PI * 2;
        const radius = 2 + Math.random() * 2;

        flowForm.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 6,
            Math.sin(angle) * radius
        );

        // Organic rotation
        flowForm.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        flowForm.userData = {
            index,
            basePosition: flowForm.position.clone(),
            baseRotation: flowForm.rotation.clone(),
            flowSpeed: 0.5 + Math.random() * 0.5,
            flowAmplitude: 0.3 + Math.random() * 0.7
        };

        return flowForm;
    }

    createGPUParticleMaterial() {
        // GPU-based particle shader material
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLow: { value: 0 },
                audioMid: { value: 0 },
                audioHigh: { value: 0 },
                flowIntensity: { value: 1.0 },
                consciousnessLevel: { value: 0.5 },
                particleColor: { value: new THREE.Color(0x4a90e2) },
                opacity: { value: 0.6 },
                dreaminess: { value: 1.0 },
                awarenessDepth: { value: 1.0 }
            },
            vertexShader: `
                // Instance attributes
                attribute float aPhase;
                attribute vec3 aVelocity;
                attribute vec3 aOriginalPosition;
                attribute float aScale;
                
                // Uniforms
                uniform float time;
                uniform float audioLow;
                uniform float audioMid;
                uniform float flowIntensity;
                uniform float consciousnessLevel;
                
                // Varyings
                varying vec3 vColor;
                varying float vOpacity;
                
                // Simplex noise function for organic movement
                vec3 mod289(vec3 x) {
                    return x - floor(x * (1.0 / 289.0)) * 289.0;
                }
                
                vec4 mod289(vec4 x) {
                    return x - floor(x * (1.0 / 289.0)) * 289.0;
                }
                
                vec4 permute(vec4 x) {
                    return mod289(((x*34.0)+1.0)*x);
                }
                
                float snoise(vec3 v) {
                    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                    
                    vec3 i = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    
                    i = mod289(i);
                    vec4 p = permute(permute(permute(
                             i.z + vec4(0.0, i1.z, i2.z, 1.0))
                           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                           
                    vec3 ns = 0.142857142857 * D.wyz - D.xzx;
                    
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    
                    vec4 x = x_ * ns.x + ns.yyyy;
                    vec4 y = y_ * ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                    
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    
                    vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
                    p0 *= norm.x;
                    p1 *= norm.y;
                    p2 *= norm.z;
                    p3 *= norm.w;
                    
                    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                }
                
                void main() {
                    // Get instance transform matrix
                    mat4 instanceMat = instanceMatrix;
                    
                    // Extract position from instance matrix
                    vec3 instancePos = vec3(instanceMat[3][0], instanceMat[3][1], instanceMat[3][2]);
                    
                    // GPU-based particle animation
                    float timeScale = time * 0.001;
                    float particleTime = timeScale + aPhase;
                    
                    // Organic flow movement
                    vec3 flowOffset = vec3(
                        sin(particleTime * 1.3 + aPhase) * aVelocity.x * 50.0,
                        cos(particleTime * 0.9 + aPhase * 1.5) * aVelocity.y * 50.0,
                        sin(particleTime * 1.1 + aPhase * 0.7) * aVelocity.z * 50.0
                    );
                    
                    // Add noise-based organic movement
                    vec3 noiseInput = aOriginalPosition * 0.3 + vec3(timeScale);
                    float noise = snoise(noiseInput);
                    vec3 noiseOffset = vec3(noise) * flowIntensity * 2.0;
                    
                    // Audio-reactive movement
                    float audioInfluence = audioLow * 2.0 + audioMid;
                    vec3 audioOffset = normalize(aVelocity) * audioInfluence * sin(particleTime * 3.0) * 1.5;
                    
                    // Consciousness-based damping
                    float consciousnessDamping = 1.0 - consciousnessLevel * 0.7;
                    
                    // Combine all movements
                    vec3 totalOffset = (flowOffset + noiseOffset + audioOffset) * consciousnessDamping;
                    
                    // Apply boundary constraints (sphere)
                    vec3 particlePos = aOriginalPosition + totalOffset;
                    float maxRadius = 8.0;
                    float currentRadius = length(particlePos);
                    if (currentRadius > maxRadius) {
                        particlePos = normalize(particlePos) * maxRadius;
                    }
                    
                    // Update instance position
                    instanceMat[3][0] = particlePos.x;
                    instanceMat[3][1] = particlePos.y;
                    instanceMat[3][2] = particlePos.z;
                    
                    // Audio-reactive scaling
                    float scaleModifier = 1.0 + audioInfluence * 0.5;
                    mat4 scaleMat = mat4(1.0);
                    scaleMat[0][0] = aScale * scaleModifier;
                    scaleMat[1][1] = aScale * scaleModifier;
                    scaleMat[2][2] = aScale * scaleModifier;
                    
                    // Apply transforms
                    vec4 mvPosition = modelViewMatrix * instanceMat * scaleMat * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Pass color and opacity to fragment shader
                    float brightness = 0.7 + noise * 0.3 + audioInfluence * 0.3;
                    vColor = vec3(brightness);
                    vOpacity = 0.6 + audioInfluence * 0.2;
                }
            `,
            fragmentShader: `
                uniform vec3 particleColor;
                uniform float opacity;
                
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    // Soft circular particle shape
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    float alpha = smoothstep(0.5, 0.0, dist) * vOpacity * opacity;
                    
                    // Apply color variations
                    vec3 finalColor = particleColor * vColor;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    createFlowMaterial() {
        if (!this.isWebGL2 || this.quality === 'low') {
            // Fallback material for WebGL1 or low quality
            return new THREE.MeshPhongMaterial({
                color: 0x4a90e2,
                transparent: true,
                opacity: 0.6,
                shininess: 30,
                side: THREE.DoubleSide
            });
        }

        // Advanced shader material for WebGL2
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLow: { value: 0 },
                audioMid: { value: 0 },
                flowIntensity: { value: 1.0 },
                consciousnessLevel: { value: 0.5 },
                flowColor: { value: new THREE.Color(0x4a90e2) },
                opacity: { value: 0.6 },
                dreaminess: { value: 1.0 },
                meshScale: { value: 1.0 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioLow;
                uniform float flowIntensity;
                uniform float consciousnessLevel;
                uniform float dreaminess;
                uniform float meshScale;
                uniform float awarenessDepth;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vDisplacement;
                
                // Organic noise function
                vec3 mod289(vec3 x) {
                    return x - floor(x * (1.0 / 289.0)) * 289.0;
                }
                
                vec4 mod289(vec4 x) {
                    return x - floor(x * (1.0 / 289.0)) * 289.0;
                }
                
                vec4 permute(vec4 x) {
                    return mod289(((x*34.0)+1.0)*x);
                }
                
                vec4 taylorInvSqrt(vec4 r) {
                    return 1.79284291400159 - 0.85373472095314 * r;
                }
                
                float snoise(vec3 v) {
                    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
                    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                    
                    vec3 i  = floor(v + dot(v, C.yyy) );
                    vec3 x0 =   v - i + dot(i, C.xxx) ;
                    
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min( g.xyz, l.zxy );
                    vec3 i2 = max( g.xyz, l.zxy );
                    
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    
                    i = mod289(i);
                    vec4 p = permute( permute( permute(
                             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                           
                    float n_ = 0.142857142857;
                    vec3  ns = n_ * D.wyz - D.xzx;
                    
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_ );
                    
                    vec4 x = x_ *ns.x + ns.yyyy;
                    vec4 y = y_ *ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    
                    vec4 b0 = vec4( x.xy, y.xy );
                    vec4 b1 = vec4( x.zw, y.zw );
                    
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
                    
                    vec3 p0 = vec3(a0.xy,h.x);
                    vec3 p1 = vec3(a0.zw,h.y);
                    vec3 p2 = vec3(a1.xy,h.z);
                    vec3 p3 = vec3(a1.zw,h.w);
                    
                    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                    p0 *= norm.x;
                    p1 *= norm.y;
                    p2 *= norm.z;
                    p3 *= norm.w;
                    
                    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                                  dot(p2,x2), dot(p3,x3) ) );
                }
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Organic flowing movement based on consciousness
                    float dreaminessInfluence = mix(0.3, 1.0, dreaminess);
                    float consciousnessInfluence = 1.0 - consciousnessLevel; // More flow when less conscious
                    
                    // Multi-layered noise for organic movement
                    float noise1 = snoise(pos * 0.3 + time * 0.0008) * dreaminessInfluence;
                    float noise2 = snoise(pos * 0.6 + time * 0.0012) * 0.5;
                    float noise3 = snoise(pos * 1.2 + time * 0.0004) * 0.25;
                    
                    float totalNoise = noise1 + noise2 + noise3;
                    
                    // Audio-reactive flow (bass frequencies drive organic movement)
                    float audioInfluence = clamp(audioLow, 0.0, 1.0) * flowIntensity;
                    
                    // Apply organic displacement
                    vec3 displacement = normal * totalNoise * consciousnessInfluence * 0.8;
                    displacement += normal * audioInfluence * 0.6;
                    
                    // Breathing-like expansion for dream states
                    float breathingPhase = sin(time * 0.0006) * dreaminessInfluence;
                    pos *= (1.0 + breathingPhase * 0.1);
                    
                    pos += displacement;
                    vDisplacement = length(displacement);
                    
                    // Apply the transformations properly
                    // First apply local vertex transformations, then model transform
                    vec4 transformedPosition = vec4(pos, 1.0);
                    gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioMid;
                uniform float consciousnessLevel;
                uniform vec3 flowColor;
                uniform float opacity;
                uniform float dreaminess;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vDisplacement;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    
                    // Color variation based on consciousness level
                    float consciousnessInfluence = 1.0 - consciousnessLevel;
                    vec3 dreamColor = flowColor * (0.7 + consciousnessInfluence * 0.5);
                    
                    // Audio-reactive brightness
                    float audioInfluence = clamp(audioMid, 0.0, 1.0);
                    dreamColor += audioInfluence * 0.4 * dreaminess;
                    
                    // Displacement-based color variation
                    float displacementColor = vDisplacement * 2.0;
                    dreamColor = mix(dreamColor, dreamColor * 1.5, displacementColor);
                    
                    // Soft gradient based on normal for organic feel
                    float normalGradient = abs(dot(normal, vec3(0.0, 1.0, 0.0)));
                    dreamColor *= normalGradient * 0.6 + 0.4;
                    
                    // Time-based color shift for dreamlike quality
                    float timeShift = sin(time * 0.001 + vPosition.y * 0.1) * 0.1;
                    dreamColor += timeShift * dreaminess;
                    
                    // Final opacity based on consciousness and dreaminess
                    float finalOpacity = opacity * dreaminess * (0.5 + consciousnessInfluence * 0.5);
                    
                    gl_FragColor = vec4(dreamColor, finalOpacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    createDreamParticles() {
        // Create dream-like particle systems
        const systemCount = this.quality === 'low' ? 1 : (this.quality === 'medium' ? 2 : 3);

        for (let i = 0; i < systemCount; i++) {
            const particleSystem = this.createSingleParticleSystem(i);
            this.particleSystems.push(particleSystem);
            this.flowGroup.add(particleSystem);
        }
    }

    createSingleParticleSystem(index) {
        // GPU instancing configuration based on quality
        const particleCounts = window.sonoiteData?.particleCounts?.flow_consciousness || { low: 100, medium: 200, high: 400 };
        const instanceCount = this.quality === 'low' ? particleCounts.low : (this.quality === 'medium' ? particleCounts.medium : particleCounts.high);
        
        // Base geometry for instances - simple sphere for particles
        const baseGeometry = new THREE.SphereGeometry(0.04, 4, 4);
        
        // Create GPU-based shader material for true GPU animation
        const material = this.createGPUParticleMaterial();

        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, instanceCount);
        
        // Create instance attributes for GPU animation
        const phases = new Float32Array(instanceCount);
        const velocities = new Float32Array(instanceCount * 3);
        const originalPositions = new Float32Array(instanceCount * 3);
        const scales = new Float32Array(instanceCount);
        
        // Initialize instance data
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < instanceCount; i++) {
            const i3 = i * 3;
            
            // Organic cloud distribution
            const radius = 2 + Math.random() * 4;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            originalPositions[i3] = x;
            originalPositions[i3 + 1] = y;
            originalPositions[i3 + 2] = z;
            
            // Organic movement velocities
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
            
            phases[i] = Math.random() * Math.PI * 2;
            scales[i] = 0.5 + Math.random() * 1.5;
            
            // Set initial transform
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(scales[i]);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        
        // Add custom instance attributes to geometry
        baseGeometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
        baseGeometry.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocities, 3));
        baseGeometry.setAttribute('aOriginalPosition', new THREE.InstancedBufferAttribute(originalPositions, 3));
        baseGeometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Store minimal data for updates
        instancedMesh.userData = {
            systemIndex: index,
            material: material
        };
        
        // Position particle systems
        const angle = (index / 3) * Math.PI * 2; // Assuming max 3 systems
        instancedMesh.position.set(
            Math.cos(angle) * 1.5,
            0,
            Math.sin(angle) * 1.5
        );

        return instancedMesh;
    }

    createOrganicLighting() {
        // Soft, organic lighting for dream-like atmosphere
        const dreamLight1 = new THREE.DirectionalLight(0x4a90e2, 0.3);
        dreamLight1.position.set(-3, 2, 2);
        this.flowGroup.add(dreamLight1);

        const dreamLight2 = new THREE.DirectionalLight(0x7bb3f2, 0.2);
        dreamLight2.position.set(3, -1, -2);
        this.flowGroup.add(dreamLight2);

        // Ambient dream light
        const ambientDream = new THREE.AmbientLight(0x3a7bd5, 0.15);
        this.flowGroup.add(ambientDream);
    }

    transitionTo(state, duration = 3.0) {
        this.currentState = state;

        // Define universal flow consciousness states
        const stateParams = {
            gentle_waves: {
                flowIntensity: 1.0,
                dreaminess: 1.0,
                color: { r: 0.29, g: 0.56, b: 0.89 },
                opacity: 0.6,
                particleOpacity: 0.6
            },
            restricted_flow: {
                flowIntensity: 0.1,  // Very slow, stuck movement
                dreaminess: 0.9,     // Highly dreamlike/nightmarish
                color: { r: 0.2, g: 0.1, b: 0.3 }, // Dark purple/black
                opacity: 0.9,        // Heavy, oppressive
                particleOpacity: 0.8 // More visible particles for disorientation
            },
            absorbing_patterns: {
                flowIntensity: 0.7,
                dreaminess: 0.8,
                color: { r: 0.2, g: 0.4, b: 0.9 },
                opacity: 0.7,
                particleOpacity: 0.8
            },
            minimal_activity: {
                flowIntensity: 0.2,
                dreaminess: 0.9,
                color: { r: 0.3, g: 0.3, b: 0.5 },
                opacity: 0.4,
                particleOpacity: 0.2
            },
            formless_void: {
                flowIntensity: 0.1,
                dreaminess: 0.1,
                color: { r: 0.1, g: 0.1, b: 0.2 },
                opacity: 0.2,
                particleOpacity: 0.1
            },
            echoing_forms: {
                flowIntensity: 0.8,
                dreaminess: 0.7,
                color: { r: 0.5, g: 0.4, b: 0.6 },
                opacity: 0.6,
                particleOpacity: 0.7
            },
            channeled_flow: {
                flowIntensity: 0.6,
                dreaminess: 0.5,
                color: { r: 0.3, g: 0.6, b: 0.4 },
                opacity: 0.7,
                particleOpacity: 0.5
            }
        };

        const params = stateParams[state] || stateParams.gentle_waves;
        this.animateToParams(params, duration);
    }

    animateToParams(targetParams, duration) {
        const startTime = performance.now();

        // Animate flow elements
        this.flowElements.forEach(element => {
            if (element.material.uniforms) {
                this.animateShaderUniforms(element.material.uniforms, targetParams, duration, startTime);
            } else {
                this.animateBasicMaterial(element.material, targetParams, duration, startTime);
            }
        });

        // Animate particle systems
        this.particleSystems.forEach(system => {
            this.animateParticleSystem(system.material, targetParams, duration, startTime);
        });
    }

    animateShaderUniforms(uniforms, targetParams, duration, startTime) {
        const initialValues = {
            flowIntensity: uniforms.flowIntensity.value,
            dreaminess: uniforms.dreaminess.value,
            opacity: uniforms.opacity.value,
            color: uniforms.flowColor.value.clone()
        };

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            uniforms.flowIntensity.value =
                initialValues.flowIntensity + (targetParams.flowIntensity - initialValues.flowIntensity) * easeProgress;

            uniforms.dreaminess.value =
                initialValues.dreaminess + (targetParams.dreaminess - initialValues.dreaminess) * easeProgress;

            uniforms.opacity.value =
                initialValues.opacity + (targetParams.opacity - initialValues.opacity) * easeProgress;

            uniforms.flowColor.value.setRGB(
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

    animateParticleSystem(material, targetParams, duration, startTime) {
        // Safety checks for material properties
        if (!material) {
            dwarn('animateParticleSystem: material is undefined');
            return;
        }

        const initialOpacity = material.opacity || 0.6;
        
        // Check if material has color property (shader materials might use uniforms instead)
        let initialColor = null;
        let hasDirectColor = false;
        
        if (material.color && typeof material.color.clone === 'function') {
            initialColor = material.color.clone();
            hasDirectColor = true;
        } else if (material.uniforms && material.uniforms.particleColor && material.uniforms.particleColor.value) {
            initialColor = material.uniforms.particleColor.value.clone();
            hasDirectColor = false;
        } else {
            // Fallback color
            initialColor = new THREE.Color(0x4a90e2);
            hasDirectColor = false;
        }

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Animate opacity
            if (material.hasOwnProperty('opacity')) {
                material.opacity = initialOpacity + (targetParams.particleOpacity - initialOpacity) * easeProgress;
            } else if (material.uniforms && material.uniforms.opacity) {
                material.uniforms.opacity.value = initialOpacity + (targetParams.particleOpacity - initialOpacity) * easeProgress;
            }

            // Animate color
            const newR = initialColor.r + (targetParams.color.r - initialColor.r) * easeProgress;
            const newG = initialColor.g + (targetParams.color.g - initialColor.g) * easeProgress;
            const newB = initialColor.b + (targetParams.color.b - initialColor.b) * easeProgress;

            if (hasDirectColor && material.color) {
                material.color.setRGB(newR, newG, newB);
            } else if (material.uniforms && material.uniforms.particleColor) {
                material.uniforms.particleColor.value.setRGB(newR, newG, newB);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    update(time, audioData, consciousnessLevel) {
        try {
            // VISUAL TEST - Force first element to pulse for debugging
            if (this.flowElements.length > 0 && Math.random() < 0.05) {
                const testScale = 1.5 + Math.sin(time * 0.002) * 0.5;
                this.flowElements[0].scale.setScalar(testScale);
                this.flowElements[0].material.color?.setHSL(
                    (time * 0.0001) % 1, 
                    0.8, 
                    0.5
                );
                dlog(`🧪 VISUAL TEST - Element 0 scale: ${testScale.toFixed(2)}`);
            }
            
            // Update flow elements
            this.updateFlowElements(time, audioData, consciousnessLevel);

            // Update particle systems
            this.updateParticleSystems(time, audioData, consciousnessLevel);

            // Update group rotation for organic movement
            this.flowGroup.rotation.y = Math.sin(time * 0.0001) * 0.1;
            this.flowGroup.rotation.x = Math.cos(time * 0.00008) * 0.05;

        } catch (error) {
            derr('Flow consciousness update failed:', error);
        }
    }

    updateFlowElements(time, audioData, consciousnessLevel) {
        // Enhanced debugging
        if (Math.random() < 0.02 && this.flowElements.length > 0) {
            dlog('🟡 FLOW ELEMENTS DEBUG:', {
                totalElements: this.flowElements.length,
                firstElementName: this.flowElements[0]?.name,
                firstElementType: this.flowElements[0]?.type,
                firstElementMaterial: this.flowElements[0]?.material?.type,
                hasShaderMaterial: this.flowElements[0]?.material?.isShaderMaterial,
                visibleElements: this.flowElements.filter(el => el.visible).length,
                audioData: {
                    bassLevel: audioData?.bassLevel,
                    loudness: audioData?.meyda?.loudness,
                    centroid: audioData?.meyda?.spectralCentroid
                }
            });
        }
        
        // LESS DEFENSIVE APPROACH - Force some visual movement
        if (!audioData && this.flowElements.length > 0) {
            // No audio data - create synthetic movement
            const syntheticLoudness = 15 + Math.sin(time * 0.001) * 10;
            audioData = {
                bassLevel: 0.5,
                midLevel: 0.5,
                trebleLevel: 0.5,
                meyda: {
                    loudness: syntheticLoudness,
                    spectralCentroid: 2000 + Math.sin(time * 0.0005) * 1000
                }
            };
            dlog('🔧 Using synthetic audio data for visual movement');
        }
        
        // Debug first element only
        if (Math.random() < 0.02 && this.flowElements.length > 0) {
            const firstElement = this.flowElements[0];
            dlog('🌊 Flow Update Debug:', {
                numElements: this.flowElements.length,
                hasAudioData: !!audioData,
                hasMeyda: !!audioData?.meyda,
                loudness: audioData?.meyda?.loudness,
                centroid: audioData?.meyda?.spectralCentroid,
                firstElementScale: firstElement.scale.x,
                firstElementRotationY: firstElement.rotation.y.toFixed(2)
            });
        }
        
        this.flowElements.forEach((element, index) => {
            /* === V3 ADD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
            // Skip non-reactive meshes or those without proper materials
            if (element.userData.reactive === false) {
                dlog(`🚫 Skipping element ${index} - marked as non-reactive`);
                return; // Skip this element
            }
            
            // Check if this element has the expected shader material structure
            if (!element.material || !element.material.uniforms) {
                dlog(`⚠️ Element ${index} has no shader uniforms - using basic transforms`);
                // This element doesn't have shader uniforms, skip uniform updates
                // but still allow basic transforms
                if (audioData && audioData.meyda) {
                    const loudnessData = audioData.meyda.loudness;
                    const loudness = typeof loudnessData === 'object' ? 
                        (loudnessData.total || 0) : 
                        (parseFloat(loudnessData) || 0);
                    
                    // Basic scale animation for non-shader materials
                    const scalePulse = 0.5 + (loudness / 30) * 2.5;
                    dlog(`📊 Element ${index} basic scale: ${scalePulse.toFixed(2)} (loudness: ${loudness.toFixed(1)})`);
                    element.scale.setScalar(scalePulse);
                    element.rotation.y += 0.05 + (loudness / 30) * 0.1;
                }
                return; // Skip the rest of the uniform updates
            }
            /* === V3 ADD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
            
            // Audio-reactive movement with clamped multipliers
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
                this.audioEMA.bassLevel = (1 - this.emaAlpha) * this.audioEMA.bassLevel + this.emaAlpha * (audioData.bassLevel || 0);
                
                // Scale pulsing with clamped multiplier (0.8x to 1.3x)
                const scalePulse = 0.8 + (this.audioEMA.loudness / 30) * 0.5;
                element.scale.setScalar(scalePulse);
                element.updateMatrixWorld(true);
                
                // Debug logging (only when enabled)
                if (window.SONOITE_DEBUG && index === 0 && Math.random() < 0.05) {
                    dlog('🔥 FLOW ELEMENT 0 CHECK:', {
                        scale: element.scale.x.toFixed(2),
                        rotation: element.rotation.y.toFixed(2),
                        smoothedLoudness: this.audioEMA.loudness.toFixed(1),
                        materialType: element.material.type
                    });
                }
                
                // Update shader uniform if it exists
                if (element.material && element.material.uniforms && element.material.uniforms.meshScale) {
                    element.material.uniforms.meshScale.value = scalePulse;
                }
                
                
                // Rotation with clamped multipliers
                const nyquist = 22050;
                const normalizedCentroidRotation = Math.min(this.audioEMA.centroid / nyquist, 1);
                element.rotation.x += normalizedCentroidRotation * 0.02;  // Subtle rotation
                element.rotation.y += 0.01 + (this.audioEMA.loudness / 30) * 0.02;  // Max 0.03 rad/frame
                element.rotation.z = Math.sin(time * 0.001 + index) * 0.3;  // Gentle wobble
                
                // Position oscillation with clamped radius
                const userData = element.userData;
                if (userData && userData.basePosition) {
                    const moveRadius = 1 + (this.audioEMA.loudness / 30) * 0.5; // Move 1-1.5 units
                    element.position.x = userData.basePosition.x + Math.sin(time * 0.002 * userData.flowSpeed + index) * moveRadius;
                    element.position.y = userData.basePosition.y + Math.cos(time * 0.003 * userData.flowSpeed * 0.7) * moveRadius * 0.5;
                    element.position.z = userData.basePosition.z + Math.sin(time * 0.001 + centroid / 10) * 2;
                }
            }
            
            // Update shader uniforms if available
            /* === V3 MOD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
            // Use safe uniform setter to prevent crashes
            if (element.material.uniforms) {
                this.setUniformSafe(element.material, 'time', time);
                // Set audio uniforms with clamped values
                this.setUniformSafe(element.material, 'audioLow', Math.min((audioData.bassLevel || 0) * 1.2, 1.0));
                this.setUniformSafe(element.material, 'audioMid', Math.min((audioData.midLevel || 0) * 1.1, 1.0));
                this.setUniformSafe(element.material, 'audioHigh', Math.min((audioData.trebleLevel || 0) * 1.0, 1.0));
                this.setUniformSafe(element.material, 'consciousnessLevel', consciousnessLevel);
            /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                
                // Add dreaminess and awarenessDepth based on audio (check if uniform exists first)
                /* === V3 MOD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
                this.setUniformSafe(element.material, 'dreaminess', 0.5 + (audioData.midLevel || 0) * 0.5);
                this.setUniformSafe(element.material, 'awarenessDepth', 0.7 + (audioData.bassLevel || 0) * 0.3);
                /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                
                // UPDATE COLORS BASED ON AUDIO! (for shader materials)
                if (element.material.uniforms.flowColor && audioData.meyda) {
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
                    
                    /* === V3 MOD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
                    // Create a color and set it safely
                    const flowColor = new THREE.Color();
                    flowColor.setHSL(hue, saturation, lightness);
                    this.setUniformSafe(element.material, 'flowColor', flowColor);
                    /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                }
                
                // DRAMATIC Meyda effects
                if (audioData.meyda) {
                    // Log to verify code is running
                    if (Math.random() < 0.05) { // Increased frequency
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        dlog('🎨 FLOW CONSCIOUSNESS UPDATE:', {
                            elementName: element.name,
                            loudness: loudnessValue,
                            centroid: audioData.meyda.spectralCentroid,
                            hasChroma: !!audioData.meyda.chroma,
                            currentScale: element.scale.x,
                            materialType: element.material?.type,
                            isShaderMaterial: element.material?.isShaderMaterial
                        });
                    }
                    
                    // Use loudness for opacity pulsing with smoothing
                    if (audioData.meyda.loudness) {
                        const normalizedLoudness = Math.min(this.audioEMA.loudness / 30, 1);
                        this.setUniformSafe(element.material, 'opacity', 0.5 + normalizedLoudness * 0.5); // Range: 0.5 to 1.0
                        /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                    }
                    
                    // Use spectral centroid for color brightness (AMPLIFIED)
                    if (audioData.meyda.spectralCentroid) {
                        const nyquist = 22050; // Half of typical 44.1kHz sample rate
                        const normalizedCentroid = Math.min(audioData.meyda.spectralCentroid / nyquist, 1);
                        const brightness = 0.5 + normalizedCentroid * 2.0; // AMPLIFIED: 0.5 to 2.5
                        /* === V3 MOD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
                        const brightnessColor = new THREE.Color();
                        brightnessColor.setRGB(
                            0.29 * brightness,
                            0.56 * brightness,
                            0.89 * brightness
                        );
                        this.setUniformSafe(element.material, 'flowColor', brightnessColor);
                        /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                    }
                    
                    // Use chroma for flow intensity (AMPLIFIED)
                    if (audioData.meyda.chroma) {
                        const maxChroma = Math.max(...audioData.meyda.chroma);
                        /* === V3 MOD start: PROMPT_3_1_PIPELINE_INTEGRITY === */
                        this.setUniformSafe(element.material, 'flowIntensity', 0.5 + maxChroma * 2.0); // AMPLIFIED
                        /* === V3 MOD end: PROMPT_3_1_PIPELINE_INTEGRITY === */
                    }
                }
            }

            // DRAMATIC rotation and movement
            const userData = element.userData;
            const flowSpeed = userData.flowSpeed * (1 - consciousnessLevel * 0.5);
            
            // AMPLIFIED Meyda-based rotation - DISABLED to not override dramatic rotations
            // Keep the dramatic rotations from above instead
            /* 
            const rotationMultiplier = audioData.meyda?.loudness ? 
                ((typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness) / 20) : 1;
            element.rotation.x = userData.baseRotation.x + Math.sin(time * 0.0001 * flowSpeed) * 0.5 * rotationMultiplier;
            element.rotation.y = userData.baseRotation.y + Math.cos(time * 0.00008 * flowSpeed) * 0.7 * rotationMultiplier;
            element.rotation.z = userData.baseRotation.z + Math.sin(time * 0.00012 * flowSpeed) * 0.3 * rotationMultiplier;
            */

            // DRAMATIC position drift using Meyda
            const meydaDrift = audioData.meyda?.spectralCentroid ? (audioData.meyda.spectralCentroid / 30) : 1;
            const drift = (audioData.bassLevel || 0) * 1.5 * userData.flowAmplitude * meydaDrift; // AMPLIFIED
            element.position.y = userData.basePosition.y + Math.sin(time * 0.0001 + index) * drift;
            
            // Add pulsing scale based on loudness
            if (audioData.meyda?.loudness) {
                const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                const scalePulse = 1 + (loudnessValue / 30) * 0.5; // Scale 1.0 to 1.5
                element.scale.setScalar(scalePulse);
                
                // Update shader uniform if it exists
                if (element.material && element.material.uniforms && element.material.uniforms.meshScale) {
                    element.material.uniforms.meshScale.value = scalePulse;
                }
            }

            // Update geometry for non-shader version
            if (!element.material.uniforms) {
                this.updateFlowGeometry(element, time, audioData, consciousnessLevel);
                
                // DRAMATIC COLOR CHANGES for non-shader materials
                if (audioData.meyda && element.material) {
                    // Debug log to see material type
                    if (Math.random() < 0.01) {
                        dlog('🎨 FLOW Material Type:', {
                            hasUniforms: !!element.material.uniforms,
                            hasColor: !!element.material.color,
                            materialType: element.material.type,
                            opacity: element.material.opacity
                        });
                    }
                    // Use chroma for HUE-SHIFTING RAINBOW COLORS
                    if (audioData.meyda.chroma && audioData.meyda.chroma.length > 0) {
                        // Find dominant note
                        let dominantNote = 0;
                        let maxChromaValue = 0;
                        for (let i = 0; i < audioData.meyda.chroma.length; i++) {
                            if (audioData.meyda.chroma[i] > maxChromaValue) {
                                maxChromaValue = audioData.meyda.chroma[i];
                                dominantNote = i;
                            }
                        }
                        
                        // Map note to full rainbow spectrum
                        const hue = dominantNote / 12; // 0-1 range
                        const saturation = 0.7 + maxChromaValue * 0.3; // High saturation
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        const lightness = 0.4 + (loudnessValue / 30) * 0.4; // Brightness from loudness
                        
                        if (element.material.color) {
                            element.material.color.setHSL(hue, saturation, lightness);
                        }
                        
                        // Also affect emissive for glow
                        if (element.material.emissive) {
                            element.material.emissive.setHSL(hue, saturation, lightness * 0.5);
                            element.material.emissiveIntensity = maxChromaValue * 2;
                        }
                    }
                    
                    // Use loudness for opacity/transparency
                    if (audioData.meyda.loudness && element.material.opacity !== undefined) {
                        const normalizedLoudness = Math.min(audioData.meyda.loudness / 30, 1);
                        element.material.opacity = 0.4 + normalizedLoudness * 0.6;
                    }
                    
                    // Use spectral centroid for metalness/roughness
                    if (audioData.meyda.spectralCentroid) {
                        const nyquist = 22050; // Half of typical 44.1kHz sample rate
                        const normalizedCentroid = Math.min(audioData.meyda.spectralCentroid / nyquist, 1);
                        if (element.material.metalness !== undefined) {
                            element.material.metalness = normalizedCentroid;
                        }
                        if (element.material.roughness !== undefined) {
                            element.material.roughness = 1 - normalizedCentroid;
                        }
                    }
                }
            }
        });
    }

    updateFlowGeometry(element, time, audioData, consciousnessLevel) {
        const geometry = element.geometry;
        const userData = geometry.userData;

        if (!userData || !userData.originalPositions) return;

        const positions = geometry.attributes.position.array;
        const originalPositions = userData.originalPositions;
        const phases = userData.phases;

        const audioInfluence = (audioData.bassLevel || 0) * 0.3;
        const consciousnessInfluence = 1 - consciousnessLevel;

        for (let i = 0; i < positions.length; i += 3) {
            const vertexIndex = i / 3;
            const phase = phases[vertexIndex];

            const x = originalPositions[i];
            const y = originalPositions[i + 1];
            const z = originalPositions[i + 2];

            // Organic displacement
            const displacement = Math.sin(time * 0.002 + phase) * consciousnessInfluence * 0.3;
            const audioDisplacement = audioInfluence * Math.cos(phase);

            positions[i] = x + displacement * 0.5;
            positions[i + 1] = y + displacement;
            positions[i + 2] = z + audioDisplacement;
        }

        geometry.attributes.position.needsUpdate = true;
    }

    updateParticleSystems(time, audioData, consciousnessLevel) {
        this.particleSystems.forEach(instancedMesh => {
            // Update shader uniforms only - all animation happens on GPU
            if (instancedMesh.userData.material && instancedMesh.userData.material.uniforms) {
                const uniforms = instancedMesh.userData.material.uniforms;
                uniforms.time.value = time;
                uniforms.audioLow.value = audioData.bassLevel || 0;
                uniforms.audioMid.value = audioData.midLevel || 0;
                uniforms.audioHigh.value = audioData.highLevel || 0;
                uniforms.consciousnessLevel.value = consciousnessLevel;
                
                // DRAMATIC Meyda effects for particles
                if (audioData.meyda) {
                    // Use loudness for particle opacity (AMPLIFIED)
                    if (audioData.meyda.loudness) {
                        const loudnessValue = typeof audioData.meyda.loudness === 'object' ? audioData.meyda.loudness.total : audioData.meyda.loudness;
                        const normalizedLoudness = Math.min(loudnessValue / 30, 1);
                        uniforms.opacity.value = 0.2 + normalizedLoudness * 0.8; // Range: 0.2 to 1.0
                    }
                    
                    // Use spectral centroid for particle color (AMPLIFIED)
                    if (audioData.meyda.spectralCentroid) {
                        const nyquist = 22050; // Half of typical 44.1kHz sample rate
                        const normalizedCentroid = Math.min(audioData.meyda.spectralCentroid / nyquist, 1);
                        const brightness = 0.5 + normalizedCentroid * 2.0; // AMPLIFIED
                        uniforms.particleColor.value.setRGB(
                            0.29 * brightness,
                            0.56 * brightness,
                            0.89 * brightness
                        );
                    }
                    
                    // Use chroma for flow intensity (AMPLIFIED)
                    if (audioData.meyda.chroma) {
                        const maxChroma = Math.max(...audioData.meyda.chroma);
                        uniforms.flowIntensity.value = 0.5 + maxChroma * 3.0; // VERY AMPLIFIED
                    }
                }
            }
        });
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));

        // Apply influence to visibility and opacity
        // Skip visibility update if Visual Layer API is active
        if (!window.SonoiteExperience?.consciousnessSystem?.useVisualLayerAPI) {
            this.flowGroup.visible = this.influence > 0.01;
        }

        if (this.influence > 0.01) {
            this.flowGroup.scale.setScalar(0.5 + this.influence * 0.5);

            // Update material opacity
            this.flowElements.forEach(element => {
                if (element.material.uniforms && element.material.uniforms.opacity) {
                    element.material.uniforms.opacity.value = this.influence * 0.6;
                } else {
                    element.material.opacity = this.influence * 0.6;
                }
            });

            this.particleSystems.forEach(instancedMesh => {
                instancedMesh.material.opacity = this.influence * 0.6;
            });
        }
    }

    setPosition(x, y, z) {
        this.flowGroup.position.set(x, y, z);
    }

    reduceQuality() {
        if (this.quality === 'high') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'low';
        }

        // Remove some elements for performance
        if (this.quality === 'low' && this.flowElements.length > 3) {
            const elementsToRemove = this.flowElements.splice(3);
            elementsToRemove.forEach(element => {
                element.geometry.dispose();
                element.material.dispose();
                this.flowGroup.remove(element);
            });
        }

        if (window.SONOITE_DEBUG) {
            dlog(`Flow consciousness quality reduced to: ${this.quality}`);
        }
    }

    increaseQuality() {
        if (this.quality === 'low') {
            this.quality = 'medium';
        } else if (this.quality === 'medium') {
            this.quality = 'high';
        }

        if (window.SONOITE_DEBUG) {
            dlog(`Flow consciousness quality increased to: ${this.quality}`);
        }
    }

    createFallbackFlow() {
        // Simple fallback for failed initialization
        const geometry = new THREE.SphereGeometry(2, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4a90e2,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });

        const fallback = new THREE.Mesh(geometry, material);
        this.flowGroup.add(fallback);
        this.scene.add(this.flowGroup);

        dwarn('Flow consciousness running in fallback mode');
    }

    dispose() {
        // Clean up all flow consciousness resources
        this.flowElements.forEach(element => {
            if (element.geometry) element.geometry.dispose();
            if (element.material) element.material.dispose();
        });

        this.particleSystems.forEach(instancedMesh => {
            if (instancedMesh.geometry) instancedMesh.geometry.dispose();
            if (instancedMesh.material) instancedMesh.material.dispose();
            // Dispose of instance-specific resources
            if (instancedMesh.dispose) instancedMesh.dispose();
        });

        this.scene.remove(this.flowGroup);
        this.flowElements = [];
        this.particleSystems = [];

        if (window.SONOITE_DEBUG) {
            dlog('Flow consciousness disposed');
        }
    }
}