/**
 * Consciousness Core - Central Abstract Focal Point
 * Represents the unified consciousness that bridges flow and structure
 * Responds to Portuguese themes through abstract consciousness states
 */
import * as THREE from 'three';
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class ConsciousnessCore {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.coreGroup = new THREE.Group();
        this.consciousnessLayers = [];
        this.awarenessField = null;
        this.thoughtStreams = [];
        this.currentState = 'night_awareness';
        this.influence = 1.0;
        this.isWebGL2 = false;
        this.consciousnessDepth = 0.8;
        this.awarenessClarity = 0.7;
        
        this.init();
    }

    init() {
        dlog('Initializing Consciousness Core...');
        
        // Check WebGL capabilities
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        this.isWebGL2 = gl && gl.constructor.name === 'WebGL2RenderingContext';
        
        try {
            this.createConsciousnessLayers();
            this.createAwarenessField();
            this.createThoughtStreams();
            this.createConsciousnessLighting();
            this.scene.add(this.coreGroup);
            dlog('Consciousness Core initialized successfully');
        } catch (error) {
            derr('Failed to initialize Consciousness Core:', error);
            this.createFallbackCore();
        }
    }

    createConsciousnessLayers() {
        // Create multiple consciousness layers representing different levels of awareness
        this.createInnerCore();
        this.createMiddleLayer();
        this.createOuterAura();
    }

    createInnerCore() {
        // Central consciousness - the deepest level of awareness
        const coreGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const coreMaterial = this.createConsciousnessMaterial('inner');
        
        this.innerCore = new THREE.Mesh(coreGeometry, coreMaterial);
        this.innerCore.userData = {
            type: 'inner_core',
            layer: 'deepest',
            resonance: 'unified_consciousness',
            pulsation: 0.01
        };
        
        this.coreGroup.add(this.innerCore);
        this.consciousnessLayers.push(this.innerCore);
    }

    createMiddleLayer() {
        // Subconscious layer - bridge between inner and outer awareness
        const middleGeometry = new THREE.SphereGeometry(1.4, 24, 24);
        const middleMaterial = this.createConsciousnessMaterial('middle');
        
        this.middleLayer = new THREE.Mesh(middleGeometry, middleMaterial);
        this.middleLayer.userData = {
            type: 'middle_layer',
            layer: 'subconscious',
            resonance: 'dream_awareness',
            pulsation: 0.008
        };
        
        this.coreGroup.add(this.middleLayer);
        this.consciousnessLayers.push(this.middleLayer);
    }

    createOuterAura() {
        // Outer awareness field - conscious perception layer
        const auraGeometry = new THREE.SphereGeometry(2.2, 16, 16);
        const auraMaterial = this.createConsciousnessMaterial('outer');
        
        this.outerAura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.outerAura.userData = {
            type: 'outer_aura',
            layer: 'conscious',
            resonance: 'perceptual_awareness',
            pulsation: 0.005
        };
        
        this.coreGroup.add(this.outerAura);
        this.consciousnessLayers.push(this.outerAura);
    }

    createConsciousnessMaterial(layer) {
        const layerProperties = {
            inner: { color: 0xffffff, opacity: 0.9, emissive: 0.3 },
            middle: { color: 0xaaccff, opacity: 0.6, emissive: 0.2 },
            outer: { color: 0x8899ff, opacity: 0.3, emissive: 0.1 }
        };
        
        const props = layerProperties[layer] || layerProperties.inner;
        
        if (!this.isWebGL2) {
            // Fallback material
            return new THREE.MeshPhongMaterial({
                color: props.color,
                transparent: true,
                opacity: props.opacity,
                emissive: props.color,
                emissiveIntensity: props.emissive
            });
        }

        // Advanced consciousness shader
        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioMid: { value: 0 },
                audioLow: { value: 0 },
                audioHigh: { value: 0 },
                consciousnessDepth: { value: 0.8 },
                awarenessClarity: { value: 0.7 },
                baseColor: { value: new THREE.Color(props.color) },
                opacity: { value: props.opacity },
                emissiveIntensity: { value: props.emissive },
                thoughtFrequency: { value: 1.0 },
                awarenessExpansion: { value: 0.5 },
                unifiedField: { value: 0.8 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioMid;
                uniform float consciousnessDepth;
                uniform float awarenessExpansion;
                uniform float thoughtFrequency;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vConsciousnessWave;
                
                // Consciousness wave function
                float consciousnessWave(vec3 p, float frequency) {
                    return sin(p.x * frequency + time * 0.001) *
                           cos(p.y * frequency + time * 0.0008) *
                           sin(p.z * frequency + time * 0.0006);
                }
                
                // Multi-dimensional consciousness field
                float consciousnessField(vec3 p) {
                    float field = 0.0;
                    field += consciousnessWave(p, 2.0) * 0.5;
                    field += consciousnessWave(p, 4.0) * 0.3;
                    field += consciousnessWave(p, 8.0) * 0.2;
                    return field;
                }
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Audio-reactive consciousness (mid frequencies for awareness)
                    float audioInfluence = clamp(audioMid, 0.0, 1.0);
                    vAudioInfluence = audioInfluence;
                    
                    // Consciousness field displacement
                    float consciousField = consciousnessField(pos * consciousnessDepth);
                    vConsciousnessWave = consciousField;
                    
                    // Awareness expansion effect
                    float expansion = sin(time * 0.0005) * awarenessExpansion * 0.1;
                    pos *= (1.0 + expansion + audioInfluence * 0.1);
                    
                    // Thought frequency modulation
                    float thoughtMod = sin(length(pos) * thoughtFrequency + time * 0.002) * 0.05;
                    pos += normal * (consciousField * 0.1 + thoughtMod);
                    
                    // Audio-reactive consciousness breathing
                    pos += normal * audioInfluence * 0.2;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioHigh;
                uniform float awarenessClarity;
                uniform vec3 baseColor;
                uniform float opacity;
                uniform float emissiveIntensity;
                uniform float unifiedField;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                varying float vAudioInfluence;
                varying float vConsciousnessWave;
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    
                    // Consciousness color modulation
                    float audioInfluence = clamp(audioHigh, 0.0, 1.0);
                    
                    // Awareness clarity effect
                    float clarity = awarenessClarity + audioInfluence * 0.3;
                    
                    // Unified field visualization
                    float fieldVisualization = abs(vConsciousnessWave) * unifiedField;
                    
                    // Consciousness color evolution
                    vec3 consciousnessColor = baseColor;
                    consciousnessColor += vec3(fieldVisualization * 0.3);
                    consciousnessColor *= clarity;
                    
                    // Audio-reactive consciousness glow
                    consciousnessColor += baseColor * vAudioInfluence * 0.4;
                    
                    // Emissive consciousness energy
                    consciousnessColor += baseColor * emissiveIntensity;
                    
                    // Thought pattern overlay
                    float thoughtPattern = sin(vPosition.x * 3.0 + time * 0.003) *
                                          cos(vPosition.y * 3.0 + time * 0.002) *
                                          sin(vPosition.z * 3.0 + time * 0.004) * 0.1;
                    consciousnessColor += vec3(abs(thoughtPattern));
                    
                    // Rim lighting for consciousness boundary
                    float rimLight = 1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0)));
                    rimLight = pow(rimLight, 2.0) * clarity;
                    consciousnessColor += vec3(rimLight * 0.3);
                    
                    gl_FragColor = vec4(consciousnessColor, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
    }

    createAwarenessField() {
        // Create particle field representing expanding awareness
        const fieldCount = window.innerWidth < 768 ? 300 : 600;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(fieldCount * 3);
        const consciousness = new Float32Array(fieldCount);
        const awareness = new Float32Array(fieldCount);
        const phases = new Float32Array(fieldCount);
        
        // Initialize awareness particles in consciousness field
        for (let i = 0; i < fieldCount; i++) {
            const i3 = i * 3;
            
            // Spherical distribution with consciousness density
            const radius = Math.pow(Math.random(), 0.7) * 4; // Density higher near center
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            consciousness[i] = Math.pow(Math.random(), 2); // Higher consciousness near center
            awareness[i] = Math.random();
            phases[i] = Math.random() * Math.PI * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('consciousness', new THREE.BufferAttribute(consciousness, 1));
        geometry.setAttribute('awareness', new THREE.BufferAttribute(awareness, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        const fieldMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.03,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        this.awarenessField = new THREE.Points(geometry, fieldMaterial);
        this.coreGroup.add(this.awarenessField);
    }

    createThoughtStreams() {
        // Create flowing thought streams connecting to consciousness layers
        const streamCount = 6;
        
        for (let i = 0; i < streamCount; i++) {
            const stream = this.createThoughtStream(i);
            this.coreGroup.add(stream);
            this.thoughtStreams.push(stream);
        }
    }

    createThoughtStream(index) {
        // Create spiral thought stream
        const curve = this.createThoughtCurve(index);
        const geometry = new THREE.TubeGeometry(curve, 32, 0.05, 8, false);
        const material = this.createThoughtMaterial();
        
        const stream = new THREE.Mesh(geometry, material);
        stream.userData = {
            type: 'thought_stream',
            index: index,
            thoughtSpeed: 0.01 + Math.random() * 0.01,
            consciousnessLayer: index % 3,
            originalCurve: curve
        };
        
        return stream;
    }

    createThoughtCurve(index) {
        const points = [];
        const segments = 32;
        const radius = 1.5 + index * 0.3;
        const height = 4;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = index * Math.PI / 3 + t * Math.PI * 4;
            
            // Spiral thought pattern
            const x = Math.cos(angle) * radius * (1 - t * 0.5);
            const y = t * height - height / 2;
            const z = Math.sin(angle) * radius * (1 - t * 0.5);
            
            // Add consciousness fluctuations
            const consciousFluctuation = Math.sin(t * Math.PI * 6) * 0.2;
            
            points.push(new THREE.Vector3(
                x + consciousFluctuation * Math.cos(angle + Math.PI / 2),
                y,
                z + consciousFluctuation * Math.sin(angle + Math.PI / 2)
            ));
        }
        
        return new THREE.CatmullRomCurve3(points);
    }

    createThoughtMaterial() {
        if (!this.isWebGL2) {
            return new THREE.MeshBasicMaterial({
                color: 0x88aaff,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
            });
        }

        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioMid: { value: 0 },
                thoughtColor: { value: new THREE.Color(0x88aaff) },
                opacity: { value: 0.5 },
                thoughtSpeed: { value: 1.0 },
                consciousness: { value: 0.8 }
            },
            vertexShader: `
                uniform float time;
                uniform float thoughtSpeed;
                varying vec2 vUv;
                varying float vThoughtFlow;
                
                void main() {
                    vUv = uv;
                    
                    // Thought flow along the stream
                    vThoughtFlow = sin(uv.x * 10.0 + time * thoughtSpeed * 0.01);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float audioMid;
                uniform vec3 thoughtColor;
                uniform float opacity;
                uniform float consciousness;
                varying vec2 vUv;
                varying float vThoughtFlow;
                
                void main() {
                    float audioInfluence = clamp(audioMid, 0.0, 1.0);
                    
                    // Thought intensity based on flow and consciousness
                    float thoughtIntensity = abs(vThoughtFlow) * consciousness;
                    thoughtIntensity += audioInfluence * 0.5;
                    
                    vec3 finalColor = thoughtColor * thoughtIntensity;
                    
                    gl_FragColor = vec4(finalColor, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
    }

    createConsciousnessLighting() {
        // Soft omnidirectional light from consciousness core
        const consciousnessLight = new THREE.PointLight(0xffffff, 0.8, 10);
        consciousnessLight.position.set(0, 0, 0);
        this.coreGroup.add(consciousnessLight);
        
        // Ambient consciousness field
        const ambientLight = new THREE.AmbientLight(0xaaccff, 0.3);
        this.coreGroup.add(ambientLight);
    }

    transformTo(state, duration = 2.0) {
        dlog(`Transforming consciousness core to state: ${state}`);
        this.currentState = state;
        
        // Define transformation parameters for Portuguese consciousness themes
        const stateParams = {
            'night_awareness': {
                depth: 0.8,
                clarity: 0.7,
                expansion: 0.6,
                thoughtFrequency: 1.0,
                unifiedField: 0.8,
                color: { r: 0.9, g: 0.9, b: 1.0 },
                size: 1.0
            },
            'trapped_awareness': {
                depth: 0.3,
                clarity: 0.2,
                expansion: 0.1,
                thoughtFrequency: 0.3,
                unifiedField: 0.3,
                color: { r: 0.4, g: 0.4, b: 0.6 },
                size: 0.6
            },
            'reading_immersion': {
                depth: 0.9,
                clarity: 0.9,
                expansion: 0.8,
                thoughtFrequency: 2.0,
                unifiedField: 0.9,
                color: { r: 0.6, g: 0.7, b: 1.0 },
                size: 1.2
            },
            'time_distortion': {
                depth: 0.4,
                clarity: 0.3,
                expansion: 0.2,
                thoughtFrequency: 0.1,
                unifiedField: 0.4,
                color: { r: 0.8, g: 0.8, b: 0.6 },
                size: 1.3
            },
            'pure_emptiness': {
                depth: 0.0,
                clarity: 0.0,
                expansion: 0.0,
                thoughtFrequency: 0.0,
                unifiedField: 0.1,
                color: { r: 0.2, g: 0.2, b: 0.2 },
                size: 0.3
            },
            'dual_reflection': {
                depth: 0.7,
                clarity: 0.8,
                expansion: 0.7,
                thoughtFrequency: 1.5,
                unifiedField: 0.9,
                color: { r: 0.8, g: 0.8, b: 0.8 },
                size: 1.1
            },
            'learned_awareness': {
                depth: 0.8,
                clarity: 1.0,
                expansion: 0.9,
                thoughtFrequency: 1.8,
                unifiedField: 1.0,
                color: { r: 1.0, g: 1.0, b: 1.0 },
                size: 1.0
            }
        };
        
        const params = stateParams[state] || stateParams['night_awareness'];
        this.animateToParams(params, duration);
    }

    animateToParams(targetParams, duration) {
        const startTime = performance.now();
        
        // Get initial values from first consciousness layer
        let initialParams = {
            depth: this.consciousnessDepth,
            clarity: this.awarenessClarity,
            expansion: 0.5,
            thoughtFrequency: 1.0,
            unifiedField: 0.8,
            color: new THREE.Color(0.9, 0.9, 1.0),
            size: 1.0
        };
        
        if (this.consciousnessLayers.length > 0) {
            const firstLayer = this.consciousnessLayers[0];
            if (firstLayer.material.uniforms) {
                initialParams.depth = firstLayer.material.uniforms.consciousnessDepth?.value || 0.8;
                initialParams.clarity = firstLayer.material.uniforms.awarenessClarity?.value || 0.7;
                initialParams.expansion = firstLayer.material.uniforms.awarenessExpansion?.value || 0.5;
                initialParams.thoughtFrequency = firstLayer.material.uniforms.thoughtFrequency?.value || 1.0;
                initialParams.unifiedField = firstLayer.material.uniforms.unifiedField?.value || 0.8;
                initialParams.color = firstLayer.material.uniforms.baseColor?.value.clone() || new THREE.Color(0.9, 0.9, 1.0);
                initialParams.size = firstLayer.scale.x || 1.0;
            }
        }
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Update all consciousness layers
            this.consciousnessLayers.forEach(layer => {
                if (layer.material.uniforms) {
                    if (layer.material.uniforms.consciousnessDepth) {
                        layer.material.uniforms.consciousnessDepth.value =
                            initialParams.depth + (targetParams.depth - initialParams.depth) * easeProgress;
                    }
                    
                    if (layer.material.uniforms.awarenessClarity) {
                        layer.material.uniforms.awarenessClarity.value =
                            initialParams.clarity + (targetParams.clarity - initialParams.clarity) * easeProgress;
                    }
                    
                    if (layer.material.uniforms.awarenessExpansion) {
                        layer.material.uniforms.awarenessExpansion.value =
                            initialParams.expansion + (targetParams.expansion - initialParams.expansion) * easeProgress;
                    }
                    
                    if (layer.material.uniforms.thoughtFrequency) {
                        layer.material.uniforms.thoughtFrequency.value =
                            initialParams.thoughtFrequency + (targetParams.thoughtFrequency - initialParams.thoughtFrequency) * easeProgress;
                    }
                    
                    if (layer.material.uniforms.unifiedField) {
                        layer.material.uniforms.unifiedField.value =
                            initialParams.unifiedField + (targetParams.unifiedField - initialParams.unifiedField) * easeProgress;
                    }
                    
                    if (layer.material.uniforms.baseColor) {
                        layer.material.uniforms.baseColor.value.setRGB(
                            initialParams.color.r + (targetParams.color.r - initialParams.color.r) * easeProgress,
                            initialParams.color.g + (targetParams.color.g - initialParams.color.g) * easeProgress,
                            initialParams.color.b + (targetParams.color.b - initialParams.color.b) * easeProgress
                        );
                    }
                }
                
                // Update scale
                const currentScale = initialParams.size + (targetParams.size - initialParams.size) * easeProgress;
                layer.scale.setScalar(currentScale);
            });
            
            // Update instance variables
            this.consciousnessDepth = initialParams.depth + (targetParams.depth - initialParams.depth) * easeProgress;
            this.awarenessClarity = initialParams.clarity + (targetParams.clarity - initialParams.clarity) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    update(time, audioData) {
        if (!this.coreGroup) return;
        
        try {
            // Extract mid frequencies for consciousness reactivity
            const midLevel = audioData.midLevel || 0;
            const bassLevel = audioData.bassLevel || 0;
            const trebleLevel = audioData.trebleLevel || 0;
            
            // Update consciousness layers
            this.updateConsciousnessLayers(time, audioData);
            
            // Update awareness field
            this.updateAwarenessField(time, audioData);
            
            // Update thought streams
            this.updateThoughtStreams(time, audioData);
            
        } catch (error) {
            derr('Consciousness core update failed:', error);
        }
    }

    updateConsciousnessLayers(time, audioData) {
        const midLevel = audioData.midLevel || 0;
        const bassLevel = audioData.bassLevel || 0;
        const trebleLevel = audioData.trebleLevel || 0;
        
        this.consciousnessLayers.forEach((layer, index) => {
            // Update shader uniforms
            if (layer.material.uniforms) {
                layer.material.uniforms.time.value = time;
                layer.material.uniforms.audioMid.value = midLevel;
                layer.material.uniforms.audioLow.value = bassLevel;
                layer.material.uniforms.audioHigh.value = trebleLevel;
                
                // Apply theme influence if available
                if (audioData.theme) {
                    layer.material.uniforms.consciousnessDepth.value = audioData.theme.depth || this.consciousnessDepth;
                    layer.material.uniforms.awarenessClarity.value = audioData.theme.clarity || this.awarenessClarity;
                }
            }
            
            // Layer-specific consciousness breathing
            const pulsation = layer.userData.pulsation || 0.01;
            layer.rotation.y += pulsation + midLevel * 0.005;
            layer.rotation.x += Math.sin(time * 0.001 + index) * pulsation;
            
            // Audio-reactive consciousness expansion
            const expansionScale = 1.0 + midLevel * 0.1 * (1 - index * 0.2);
            layer.scale.setScalar(expansionScale);
        });
    }

    updateAwarenessField(time, audioData) {
        if (!this.awarenessField?.geometry?.attributes?.position) return;
        
        const positions = this.awarenessField.geometry.attributes.position.array;
        const consciousness = this.awarenessField.geometry.attributes.consciousness.array;
        const awareness = this.awarenessField.geometry.attributes.awareness.array;
        const phases = this.awarenessField.geometry.attributes.phase.array;
        const midLevel = audioData.midLevel || 0;
        
        for (let i = 0; i < positions.length; i += 3) {
            const particleIndex = i / 3;
            
            // Consciousness field influences
            const consciousnessLevel = consciousness[particleIndex];
            const awarenessLevel = awareness[particleIndex];
            const phase = phases[particleIndex];
            
            // Audio-reactive consciousness field
            const audioInfluence = midLevel * 0.02;
            
            // Awareness field oscillation
            const fieldOscillation = Math.sin(time * 0.001 + phase) * consciousnessLevel * 0.1;
            const awarenessFlow = Math.cos(time * 0.0008 + phase) * awarenessLevel * 0.05;
            
            // Update positions with consciousness field effects
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Radial consciousness pulsing
            const distance = Math.sqrt(x*x + y*y + z*z);
            const normalizedDistance = distance / 4;
            
            const consciousnessPulse = Math.sin(time * 0.002 + normalizedDistance * 10) * 
                                      consciousnessLevel * audioInfluence;
            
            // Apply consciousness field movements
            positions[i] += Math.sin(time * 0.001 + x * 0.1) * fieldOscillation;
            positions[i + 1] += Math.cos(time * 0.001 + y * 0.1) * awarenessFlow;
            positions[i + 2] += Math.sin(time * 0.001 + z * 0.1) * fieldOscillation * 0.5;
            
            // Audio-reactive radial expansion
            const radialFactor = 1 + consciousnessPulse;
            positions[i] *= radialFactor;
            positions[i + 1] *= radialFactor;
            positions[i + 2] *= radialFactor;
            
            // Keep particles in consciousness field bounds
            if (distance > 5) {
                positions[i] *= 0.95;
                positions[i + 1] *= 0.95;
                positions[i + 2] *= 0.95;
            }
        }
        
        this.awarenessField.geometry.attributes.position.needsUpdate = true;
        
        // Update awareness field material
        this.awarenessField.material.opacity = 0.7 + midLevel * 0.3;
        this.awarenessField.material.size = 0.03 + midLevel * 0.02;
    }

    updateThoughtStreams(time, audioData) {
        const midLevel = audioData.midLevel || 0;
        
        this.thoughtStreams.forEach(stream => {
            // Update thought stream materials
            if (stream.material.uniforms) {
                stream.material.uniforms.time.value = time;
                stream.material.uniforms.audioMid.value = midLevel;
                stream.material.uniforms.consciousness.value = this.consciousnessDepth;
            }
            
            // Thought stream rotation
            const thoughtSpeed = stream.userData.thoughtSpeed || 0.01;
            stream.rotation.y += thoughtSpeed + midLevel * 0.005;
            
            // Audio-reactive thought intensity
            const intensityScale = 1.0 + midLevel * 0.2;
            stream.scale.setScalar(intensityScale);
        });
    }

    setInfluence(value) {
        this.influence = Math.max(0, Math.min(1, value));
        
        // Update consciousness layer opacities
        this.consciousnessLayers.forEach(layer => {
            if (layer.material.uniforms?.opacity) {
                layer.material.uniforms.opacity.value = this.influence * (layer.userData.layer === 'deepest' ? 0.9 : 
                                                                         layer.userData.layer === 'subconscious' ? 0.6 : 0.3);
            } else {
                layer.material.opacity = this.influence * (layer.userData.layer === 'deepest' ? 0.9 : 
                                                           layer.userData.layer === 'subconscious' ? 0.6 : 0.3);
            }
        });
        
        // Update awareness field opacity
        if (this.awarenessField?.material) {
            this.awarenessField.material.opacity = this.influence * 0.7;
        }
        
        // Update thought stream opacities
        this.thoughtStreams.forEach(stream => {
            if (stream.material.uniforms?.opacity) {
                stream.material.uniforms.opacity.value = this.influence * 0.5;
            } else {
                stream.material.opacity = this.influence * 0.5;
            }
        });
        
        // Control visibility
        this.coreGroup.visible = this.influence > 0.01;
    }

    createFallbackCore() {
        dwarn('Creating fallback consciousness core');
        
        const fallbackGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaccff,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        this.coreGroup.add(fallbackMesh);
        this.scene.add(this.coreGroup);
        
        this.consciousnessLayers.push(fallbackMesh);
    }

    get position() {
        return this.coreGroup.position;
    }

    dispose() {
        dlog('Disposing Consciousness Core...');
        
        try {
            // Dispose consciousness layers
            this.consciousnessLayers.forEach(layer => {
                if (layer.geometry) layer.geometry.dispose();
                if (layer.material) layer.material.dispose();
            });
            
            // Dispose awareness field
            if (this.awarenessField) {
                if (this.awarenessField.geometry) this.awarenessField.geometry.dispose();
                if (this.awarenessField.material) this.awarenessField.material.dispose();
            }
            
            // Dispose thought streams
            this.thoughtStreams.forEach(stream => {
                if (stream.geometry) stream.geometry.dispose();
                if (stream.material) stream.material.dispose();
            });
            
            // Remove from scene
            this.scene.remove(this.coreGroup);
            
            // Clear references
            this.consciousnessLayers = [];
            this.thoughtStreams = [];
            this.awarenessField = null;
            this.innerCore = null;
            this.middleLayer = null;
            this.outerAura = null;
            this.coreGroup = null;
            
        } catch (error) {
            derr('Error disposing Consciousness Core:', error);
        }
    }
}