/**
 * Flow Realm - Organic Abstract Forms
 * Represents fluid, unconscious, flowing consciousness states
 * Responds to Portuguese themes through abstract organic movements
 */
import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class FlowRealm {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.flowGroup = new THREE.Group();
        this.organicForms = [];
        this.flowParticles = null;
        this.currentState = 'nocturnal_drift';
        this.influence = 1.0;
        this.isWebGL2 = false;
        this.fluidSimulation = null;
        
        this.init();
    }

    init() {
        dlog('Initializing Flow Realm...');
        
        // Check WebGL capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        this.isWebGL2 = gl && gl.constructor.name === 'WebGL2RenderingContext';
        
        try {
            this.createOrganicForms();
            this.createFlowParticles();
            this.createFluidSimulation();
            this.scene.add(this.flowGroup);
            dlog('Flow Realm initialized successfully');
        } catch (error) {
            derr('Failed to initialize Flow Realm:', error);
            this.createFallbackFlow();
        }
    }

    createOrganicForms() {
        // Create various organic forms for different Portuguese themes
        this.createFlowingTendrils();
        this.createLiquidSurfaces();
        this.createOrganicClouds();
    }

    createFlowingTendrils() {
        // Create organic tendril-like forms
        const tendrilCount = 8;
        
        for (let i = 0; i < tendrilCount; i++) {
            const tendril = this.createTendril(i);
            this.flowGroup.add(tendril);
            this.organicForms.push(tendril);
        }
    }

    createTendril(index) {
        // Create curved tendril geometry using spline
        const curve = this.createTendrilCurve(index);
        const geometry = new THREE.TubeGeometry(curve, 32, 0.1, 8, false);
        const material = this.createFlowMaterial('tendril');
        
        const tendril = new THREE.Mesh(geometry, material);
        tendril.userData = {
            type: 'tendril',
            index: index,
            originalCurve: curve,
            flowPhase: Math.random() * Math.PI * 2,
            intensity: Math.random() * 0.5 + 0.5
        };
        
        return tendril;
    }

    createTendrilCurve(index) {
        // Create organic spline curve
        const points = [];
        const segments = 16;
        const radius = 2 + Math.sin(index) * 1;
        const height = 4;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = index * Math.PI / 4 + t * Math.PI * 2;
            
            // Organic spiral with variation
            const x = Math.cos(angle) * radius * (1 - t * 0.3);
            const y = t * height - height / 2;
            const z = Math.sin(angle) * radius * (1 - t * 0.3) + Math.sin(t * Math.PI * 3) * 0.5;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        return new THREE.CatmullRomCurve3(points);
    }

    createLiquidSurfaces() {
        // Create fluid-like surfaces that respond to themes
        const surfaceGeometry = new THREE.PlaneGeometry(4, 4, 32, 32);
        const surfaceMaterial = this.createFlowMaterial('liquid');
        
        this.liquidSurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        this.liquidSurface.rotation.x = -Math.PI / 2;
        this.liquidSurface.position.y = -1;
        
        // Store original positions for fluid animation
        const positions = surfaceGeometry.attributes.position.array;
        this.originalSurfacePositions = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i++) {
            this.originalSurfacePositions[i] = positions[i];
        }
        
        this.liquidSurface.userData = {
            type: 'liquid',
            wavePhase: 0,
            flowDirection: new THREE.Vector2(1, 0)
        };
        
        this.flowGroup.add(this.liquidSurface);
        this.organicForms.push(this.liquidSurface);
    }

    createOrganicClouds() {
        // Create cloud-like organic forms
        const cloudCount = 5;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = this.createCloud(i);
            this.flowGroup.add(cloud);
            this.organicForms.push(cloud);
        }
    }

    createCloud(index) {
        // Create cloud using sphere with displacement
        const cloudGeometry = new THREE.SphereGeometry(1, 16, 16); // Back to normal size
        const cloudMaterial = this.createFlowMaterial('cloud');
        
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        // Position clouds organically
        const angle = (index / 5) * Math.PI * 2;
        cloud.position.set(
            Math.cos(angle) * 3,
            Math.sin(index) * 2,
            Math.sin(angle) * 3
        );
        
        cloud.userData = {
            type: 'cloud',
            index: index,
            originalPosition: cloud.position.clone(),
            driftPhase: Math.random() * Math.PI * 2,
            scale: 0.5 + Math.random() * 0.5 // Back to normal scale
        };
        
        cloud.scale.setScalar(cloud.userData.scale);
        
        return cloud;
    }

    createFlowMaterial(type) {
        const baseColors = {
            tendril: 0x8888ff,
            liquid: 0x6699ff,
            cloud: 0xaabbff
        };
        
        const baseColor = baseColors[type] || 0x888888;
        
        if (!this.isWebGL2) {
            // Fallback material
            return new THREE.MeshPhongMaterial({
                color: baseColor,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
        }

        // Advanced flow shader
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLow: { value: 0 },
                audioMid: { value: 0 },
                flowIntensity: { value: 0.5 },
                baseColor: { value: new THREE.Color(baseColor) },
                opacity: { value: 0.6 },
                flowDirection: { value: new THREE.Vector2(1, 0) },
                organicness: { value: 0.8 },
                themeInfluence: { value: 0.5 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioLow;
                uniform float flowIntensity;
                uniform vec2 flowDirection;
                uniform float organicness;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vFlowEffect;
                
                // Organic noise function
                float organicNoise(vec3 p) {
                    return fract(sin(dot(p, vec3(12.9898, 78.233, 54.53))) * 43758.5453);
                }
                
                // Multi-octave organic noise
                float organicFBM(vec3 p) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    float frequency = 1.0;
                    
                    for (int i = 0; i < 4; i++) {
                        value += amplitude * organicNoise(p * frequency);
                        amplitude *= 0.5;
                        frequency *= 2.0;
                    }
                    
                    return value;
                }
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Audio-reactive organic flow (bass frequencies drive flow)
                    float audioInfluence = clamp(audioLow, 0.0, 1.0);
                    vAudioInfluence = audioInfluence;
                    
                    // Organic flow patterns
                    float flowTime = time * 0.0005;
                    vec3 flowPos = pos + vec3(flowDirection * flowTime, 0.0);
                    
                    // Multi-layered organic displacement
                    float organicWave1 = sin(pos.x * 0.3 + flowTime * 2.0) * organicness;
                    float organicWave2 = cos(pos.y * 0.4 + flowTime * 1.5) * organicness * 0.7;
                    float organicWave3 = sin(pos.z * 0.2 + flowTime * 1.8) * organicness * 0.5;
                    
                    // Fractal organic noise
                    float organicNoise = organicFBM(flowPos * 0.5) * organicness * 0.3;
                    
                    // Audio-reactive organic pulsing
                    float audioPulse = sin(flowTime * 3.0 + length(pos) * 0.5) * audioInfluence * 0.4;
                    
                    // Combine all organic effects
                    float totalFlow = (organicWave1 + organicWave2 + organicWave3 + organicNoise + audioPulse) * flowIntensity;
                    vFlowEffect = totalFlow;
                    
                    // Apply organic displacement along normal
                    pos += normal * totalFlow;
                    
                    // Organic swaying motion
                    pos.x += sin(pos.y * 0.1 + flowTime * 0.8) * organicness * 0.1;
                    pos.y += cos(pos.x * 0.1 + flowTime * 0.6) * organicness * 0.08;
                    pos.z += sin(pos.x * 0.05 + pos.y * 0.05 + flowTime * 0.4) * organicness * 0.06;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioMid;
                uniform vec3 baseColor;
                uniform float opacity;
                uniform float themeInfluence;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vFlowEffect;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    
                    // Organic color flow based on position and audio
                    float audioInfluence = clamp(audioMid, 0.0, 1.0);
                    
                    // Create flowing color patterns
                    float colorFlow = sin(vPosition.x * 0.1 + time * 0.0003) * 
                                     cos(vPosition.y * 0.1 + time * 0.0002) * 0.2;
                    
                    // Theme-influenced color modulation
                    vec3 themeColor = mix(baseColor, baseColor * vec3(1.2, 1.1, 1.0), themeInfluence);
                    
                    // Add organic color variations
                    vec3 organicColor = themeColor + vec3(colorFlow);
                    organicColor += vec3(abs(vFlowEffect) * 0.2);
                    
                    // Audio-reactive glow
                    organicColor += baseColor * audioInfluence * 0.3;
                    
                    // Soft organic lighting
                    float organicLight = 0.6 + abs(dot(normal, vec3(0.5, 0.8, 0.3))) * 0.4;
                    
                    vec3 finalColor = organicColor * organicLight;
                    
                    gl_FragColor = vec4(finalColor, opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    createFlowParticles() {
        // GPU instancing with optimized particle counts
        const particleCounts = window.sonoiteData?.particleCounts?.flow_realm || { mobile: 200, desktop: 500 };
        const instanceCount = window.innerWidth < 768 ? particleCounts.mobile : particleCounts.desktop;
        
        // Base geometry for instances - small sphere
        const baseGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        
        // Material with emissive glow
        const material = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.6,
            emissive: 0x4466ff,
            emissiveIntensity: 0.4
        });

        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, instanceCount);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Store instance data for animation
        const velocities = new Float32Array(instanceCount * 3);
        const lifetimes = new Float32Array(instanceCount);
        const scales = new Float32Array(instanceCount);
        const originalPositions = new Float32Array(instanceCount * 3);
        
        // Initialize instances
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < instanceCount; i++) {
            const i3 = i * 3;
            
            // Organic distribution
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 5 + 1;
            const height = (Math.random() - 0.5) * 8;
            
            const x = Math.cos(angle) * radius;
            const y = height;
            const z = Math.sin(angle) * radius;
            
            originalPositions[i3] = x;
            originalPositions[i3 + 1] = y;
            originalPositions[i3 + 2] = z;
            
            // Organic velocities
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
            
            lifetimes[i] = Math.random() * 100;
            scales[i] = Math.random() * 1.5 + 0.5;
            
            // Set initial transform
            dummy.position.set(x, y, z);
            dummy.scale.setScalar(scales[i]);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Store data for animation
        instancedMesh.userData = {
            velocities,
            lifetimes,
            scales,
            originalPositions
        };
        
        this.flowParticles = instancedMesh;
        this.flowGroup.add(this.flowParticles);
    }

    createFluidSimulation() {
        // Simple fluid simulation representation
        this.fluidSimulation = {
            viscosity: 0.8,
            flow: new THREE.Vector3(),
            turbulence: 0.3,
            pressure: 1.0
        };
    }

    transformTo(state, duration = 2.0) {
        dlog(`Transforming flow realm to state: ${state}`);
        this.currentState = state;
        
        // Define transformation parameters for Portuguese themes
        const stateParams = {
            'nocturnal_drift': {
                flowIntensity: 0.8,
                organicness: 1.0,
                viscosity: 0.8,
                color: { r: 0.8, g: 0.8, b: 1.0 },
                movement: 'gentle_drift'
            },
            'restrictive_tendrils': {
                flowIntensity: 0.2,
                organicness: 0.3,
                viscosity: 0.1,
                color: { r: 0.4, g: 0.4, b: 0.6 },
                movement: 'constrained'
            },
            'textual_rivers': {
                flowIntensity: 0.9,
                organicness: 0.6,
                viscosity: 0.7,
                color: { r: 0.6, g: 0.7, b: 1.0 },
                movement: 'flowing'
            },
            'temporal_weight': {
                flowIntensity: 0.1,
                organicness: 0.4,
                viscosity: 0.2,
                color: { r: 0.6, g: 0.6, b: 0.5 },
                movement: 'weighted'
            },
            'dissolving_essence': {
                flowIntensity: 0.05,
                organicness: 0.2,
                viscosity: 0.1,
                color: { r: 0.2, g: 0.2, b: 0.2 },
                movement: 'dissolving'
            },
            'shadow_memories': {
                flowIntensity: 0.6,
                organicness: 0.7,
                viscosity: 0.5,
                color: { r: 0.5, g: 0.5, b: 0.5 },
                movement: 'shadowy'
            },
            'inherited_patterns': {
                flowIntensity: 0.7,
                organicness: 0.8,
                viscosity: 0.6,
                color: { r: 0.7, g: 0.7, b: 0.6 },
                movement: 'structured_flow'
            }
        };
        
        const params = stateParams[state] || stateParams['nocturnal_drift'];
        this.animateToParams(params, duration);
    }

    animateToParams(targetParams, duration) {
        const startTime = performance.now();
        
        // Get initial values
        let initialParams = {
            flowIntensity: this.fluidSimulation.viscosity,
            organicness: 0.8,
            color: new THREE.Color(0.8, 0.8, 1.0)
        };
        
        // Get values from first organic form if available
        if (this.organicForms.length > 0) {
            const firstForm = this.organicForms[0];
            if (firstForm.material.uniforms) {
                initialParams.flowIntensity = firstForm.material.uniforms.flowIntensity?.value || 0.5;
                initialParams.organicness = firstForm.material.uniforms.organicness?.value || 0.8;
                initialParams.color = firstForm.material.uniforms.baseColor?.value.clone() || new THREE.Color(0.8, 0.8, 1.0);
            }
        }
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Update all organic forms
            this.organicForms.forEach(form => {
                if (form.material.uniforms) {
                    if (form.material.uniforms.flowIntensity) {
                        form.material.uniforms.flowIntensity.value =
                            initialParams.flowIntensity + (targetParams.flowIntensity - initialParams.flowIntensity) * easeProgress;
                    }
                    
                    if (form.material.uniforms.organicness) {
                        form.material.uniforms.organicness.value =
                            initialParams.organicness + (targetParams.organicness - initialParams.organicness) * easeProgress;
                    }
                    
                    if (form.material.uniforms.baseColor) {
                        form.material.uniforms.baseColor.value.setRGB(
                            initialParams.color.r + (targetParams.color.r - initialParams.color.r) * easeProgress,
                            initialParams.color.g + (targetParams.color.g - initialParams.color.g) * easeProgress,
                            initialParams.color.b + (targetParams.color.b - initialParams.color.b) * easeProgress
                        );
                    }
                }
            });
            
            // Update fluid simulation parameters
            this.fluidSimulation.viscosity = 
                initialParams.flowIntensity + (targetParams.viscosity - initialParams.flowIntensity) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    update(time, audioData) {
        if (!this.flowGroup) return;
        
        try {
            // Extract bass frequencies for organic flow
            const bassLevel = audioData.bassLevel || 0;
            const midLevel = audioData.midLevel || 0;
            
            // Update organic forms
            this.updateOrganicForms(time, audioData);
            
            // Update flow particles
            this.updateFlowParticles(time, audioData);
            
            // Update fluid simulation
            this.updateFluidSimulation(time, audioData);
            
        } catch (error) {
            derr('Flow realm update failed:', error);
        }
    }

    updateOrganicForms(time, audioData) {
        const bassLevel = audioData.bassLevel || 0;
        const midLevel = audioData.midLevel || 0;
        
        // Check if we have forms to update
        if (this.organicForms.length === 0) {
            if (window.SONOITE_DEBUG) {
                derr('[FLOW-REALM] No organic forms to update');
            }
            return;
        }
        
        this.organicForms.forEach((form, index) => {
            // Update shader uniforms
            if (form.material.uniforms) {
                form.material.uniforms.time.value = time;
                form.material.uniforms.audioLow.value = bassLevel;
                form.material.uniforms.audioMid.value = midLevel;
                
                // Apply theme influence if available
                if (audioData.theme) {
                    form.material.uniforms.themeInfluence.value = audioData.theme.complexity || 0.5;
                }
            }
            
            // Organic movement patterns
            if (form.userData.type === 'tendril') {
                this.updateTendril(form, time, audioData);
            } else if (form.userData.type === 'liquid') {
                this.updateLiquidSurface(form, time, audioData);
            } else if (form.userData.type === 'cloud') {
                this.updateCloud(form, time, audioData);
            }
        });
    }

    updateTendril(tendril, time, audioData) {
        const bassLevel = audioData.bassLevel || 0;
        const userData = tendril.userData;
        
        // Organic rotation
        tendril.rotation.y += (0.005 + bassLevel * 0.01) * userData.intensity;
        tendril.rotation.x += Math.sin(time * 0.001 + userData.flowPhase) * 0.002;
        
        // Audio-reactive scaling
        const scale = 1.0 + bassLevel * 0.2 * userData.intensity;
        tendril.scale.setScalar(scale);
    }

    updateLiquidSurface(surface, time, audioData) {
        if (!surface.geometry?.attributes?.position || !this.originalSurfacePositions) return;
        
        const positions = surface.geometry.attributes.position.array;
        const bassLevel = audioData.bassLevel || 0;
        const userData = surface.userData;
        
        // Update wave phase
        userData.wavePhase += 0.01 + bassLevel * 0.02;
        
        // Apply organic wave deformation
        for (let i = 0; i < positions.length; i += 3) {
            const x = this.originalSurfacePositions[i];
            const y = this.originalSurfacePositions[i + 1];
            
            // Organic wave patterns
            const wave1 = Math.sin(x * 0.3 + userData.wavePhase) * 0.2;
            const wave2 = Math.cos(y * 0.4 + userData.wavePhase * 0.7) * 0.15;
            const audioWave = Math.sin(x * 0.5 + y * 0.5 + userData.wavePhase * 2) * bassLevel * 0.3;
            
            positions[i + 2] = this.originalSurfacePositions[i + 2] + wave1 + wave2 + audioWave;
        }
        
        surface.geometry.attributes.position.needsUpdate = true;
    }

    updateCloud(cloud, time, audioData) {
        const bassLevel = audioData.bassLevel || 0;
        const userData = cloud.userData;
        
        // Log audio data for debugging (when enabled)
        if (window.SONOITE_DEBUG && Math.random() < 0.01) {
            dlog('[FLOW-REALM] Cloud audio update:', {
                bassLevel,
                originalScale: userData.scale
            });
        }
        
        // Organic drift - FASTER for more movement
        userData.driftPhase += 0.01 + bassLevel * 0.05; // Speed up with bass
        
        // Audio-reactive pulsing - SUPER EXTREME for visibility
        const pulseScale = userData.scale * (1.0 + bassLevel * 5.0); // EXTREME: 5x multiplier!
        cloud.scale.setScalar(pulseScale);
        
        // EXTREME color changes based on bass
        if (cloud.material && cloud.material.color) {
            const bassColor = bassLevel * 2.0; // Double the color intensity
            cloud.material.color.setRGB(
                0.6 + bassColor, // Red channel pulses with bass
                0.4 + bassColor * 0.5, // Green channel pulses less
                1.0 - bassColor * 0.3  // Blue channel inversely pulses
            );
        }
        
        // EXTREME position oscillation
        const extremeOffset = new THREE.Vector3(
            Math.sin(userData.driftPhase) * 2.0 * (1 + bassLevel * 3), // 3x position movement
            Math.cos(userData.driftPhase * 0.7) * 1.5 * (1 + bassLevel * 2),
            Math.sin(userData.driftPhase * 0.5) * 2.0 * (1 + bassLevel * 3)
        );
        cloud.position.copy(userData.originalPosition).add(extremeOffset);
        
        // Log significant scale changes (when debugging)
        if (window.SONOITE_DEBUG && Math.abs(bassLevel) > 0.1) {
            dlog('[FLOW-REALM] Cloud scale change:', {
                bassLevel,
                pulseScale,
                cloudIndex: userData.index
            });
        }
        
        // EXTREME rotation based on audio
        cloud.rotation.x += 0.002 + bassLevel * 0.2; // 100x faster with bass!
        cloud.rotation.y += 0.003 + bassLevel * 0.3;
        cloud.rotation.z += 0.001 + bassLevel * 0.1;
        
        // Make it GLOW with emissive
        if (cloud.material && cloud.material.emissive) {
            cloud.material.emissive.setRGB(bassLevel * 2, bassLevel, bassLevel * 0.5);
            cloud.material.emissiveIntensity = 0.5 + bassLevel * 2.0;
        }
    }

    updateFlowParticles(time, audioData) {
        if (!this.flowParticles?.userData?.velocities) return;
        
        const { velocities, lifetimes, scales, originalPositions } = this.flowParticles.userData;
        const instanceCount = this.flowParticles.count;
        const bassLevel = audioData.bassLevel || 0;
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < instanceCount; i++) {
            const i3 = i * 3;
            
            // Organic flow influence
            const flowInfluence = this.fluidSimulation.viscosity * bassLevel * 0.05;
            
            // Update velocities with organic patterns
            velocities[i3] += Math.sin(time * 0.001 + lifetimes[i] * 0.1) * flowInfluence;
            velocities[i3 + 1] += Math.cos(time * 0.001 + lifetimes[i] * 0.1) * flowInfluence;
            velocities[i3 + 2] += Math.sin(time * 0.001 + lifetimes[i] * 0.05) * flowInfluence * 0.5;
            
            // Get current position
            let x = originalPositions[i3] + velocities[i3] * time * 0.01;
            let y = originalPositions[i3 + 1] + velocities[i3 + 1] * time * 0.01;
            let z = originalPositions[i3 + 2] + velocities[i3 + 2] * time * 0.01;
            
            // Organic damping
            velocities[i3] *= 0.99;
            velocities[i3 + 1] *= 0.99;
            velocities[i3 + 2] *= 0.99;
            
            // Update lifetime
            lifetimes[i] += 0.1;
            
            // Regenerate particles organically
            if (lifetimes[i] > 100) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 5 + 1;
                
                x = Math.cos(angle) * radius;
                y = (Math.random() - 0.5) * 8;
                z = Math.sin(angle) * radius;
                
                originalPositions[i3] = x;
                originalPositions[i3 + 1] = y;
                originalPositions[i3 + 2] = z;
                
                velocities[i3] = (Math.random() - 0.5) * 0.02;
                velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
                velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
                
                lifetimes[i] = 0;
            }
            
            // Update instance matrix
            dummy.position.set(x, y, z);
            
            // Audio-reactive scaling
            const scaleModifier = 1 + bassLevel * 0.5;
            dummy.scale.setScalar(scales[i] * scaleModifier);
            
            dummy.updateMatrix();
            this.flowParticles.setMatrixAt(i, dummy.matrix);
        }
        
        this.flowParticles.instanceMatrix.needsUpdate = true;
        
        // Update particle material with audio reactivity
        this.flowParticles.material.opacity = 0.6 + bassLevel * 0.3;
    }

    updateFluidSimulation(time, audioData) {
        const bassLevel = audioData.bassLevel || 0;
        
        // Update fluid parameters based on audio and theme
        this.fluidSimulation.turbulence = 0.3 + bassLevel * 0.4;
        this.fluidSimulation.pressure = 1.0 + bassLevel * 0.5;
        
        // Update flow direction organically
        this.fluidSimulation.flow.set(
            Math.sin(time * 0.0003) * this.fluidSimulation.viscosity,
            Math.cos(time * 0.0002) * this.fluidSimulation.viscosity,
            Math.sin(time * 0.0001) * this.fluidSimulation.viscosity * 0.5
        );
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));
        
        // Update organic form opacities
        this.organicForms.forEach(form => {
            if (form.material.uniforms?.opacity) {
                form.material.uniforms.opacity.value = this.influence * 0.6;
            } else {
                form.material.opacity = this.influence * 0.6;
            }
        });
        
        // Update particle opacity
        if (this.flowParticles?.material) {
            this.flowParticles.material.opacity = this.influence * 0.6;
        }
        
        // Control visibility
        // Skip visibility update if Visual Layer API is active
        if (!window.SonoiteExperience?.consciousnessSystem?.useVisualLayerAPI) {
            this.flowGroup.visible = this.influence > 0.01;
        }
    }

    applyCrossInfluence(time, audioData) {
        // Apply influences from other realms
        const structureInfluence = audioData.structureInfluence || 0;
        const consciousnessInfluence = audioData.consciousnessInfluence || 0;
        
        // Modify organic behavior based on cross-influences
        if (structureInfluence > 0.5) {
            // Add more structured patterns to organic flow
            this.fluidSimulation.viscosity = Math.min(this.fluidSimulation.viscosity + 0.1, 1.0);
        }
        
        if (consciousnessInfluence > 0.7) {
            // Enhance awareness-driven flow patterns
            this.organicForms.forEach(form => {
                if (form.material.uniforms?.themeInfluence) {
                    form.material.uniforms.themeInfluence.value = consciousnessInfluence;
                }
            });
        }
    }

    createFallbackFlow() {
        dwarn('Creating fallback flow realm');
        
        const fallbackGeometry = new THREE.SphereGeometry(2, 16, 16);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0x8888ff,
            transparent: true,
            opacity: 0.6,
            wireframe: true
        });
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.flowGroup.add(fallbackMesh);
        this.scene.add(this.flowGroup);
        
        this.organicForms.push(fallbackMesh);
    }

    get position() {
        return this.flowGroup.position;
    }

    dispose() {
        dlog('Disposing Flow Realm...');
        
        try {
            // Dispose organic forms
            this.organicForms.forEach(form => {
                if (form.geometry) form.geometry.dispose();
                if (form.material) form.material.dispose();
            });
            
            // Dispose flow particles
            if (this.flowParticles) {
                if (this.flowParticles.geometry) this.flowParticles.geometry.dispose();
                if (this.flowParticles.material) this.flowParticles.material.dispose();
            }
            
            // Remove from scene
            this.scene.remove(this.flowGroup);
            
            // Clear references
            this.organicForms = [];
            this.flowParticles = null;
            this.liquidSurface = null;
            this.originalSurfacePositions = null;
            this.fluidSimulation = null;
            this.flowGroup = null;
            
        } catch (error) {
            derr('Error disposing Flow Realm:', error);
        }
    }
}