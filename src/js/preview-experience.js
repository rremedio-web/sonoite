/**
 * Sonoite Preview Experience
 * Handles single-track preview with consciousness visualization,
 * email capture, and social sharing functionality
 */

import * as THREE from 'three';
import { getRootScene, setRootScene } from './three-root.js';

class SonoitePreviewExperience {
    constructor() {
        this.initialized = false;
        this.isPlaying = false;
        this.isAudioReady = false;
        this.userHasInteracted = false;
        
        // Audio context and elements
        this.audioContext = null;
        this.audioElement = null;
        this.analyser = null;
        this.dataArray = null;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.consciousness = null;
        this.animationId = null;
        
        // DOM elements
        this.canvas = null;
        this.loadingScreen = null;
        this.playPauseButton = null;
        this.progressBar = null;
        this.progressFill = null;
        this.currentTimeDisplay = null;
        this.totalTimeDisplay = null;
        this.volumeSlider = null;
        this.volumeButton = null;
        this.emailForm = null;
        this.socialButtons = null;
        this.userActivationPrompt = null;
        this.errorContainer = null;
        this.helpToggle = null;
        this.helpContent = null;
        
        // Mouse interaction
        this.mouse = new THREE.Vector2();
        
        // Data from WordPress
        this.data = window.sonoitePreviewData || {};
        this.track = this.data.track || {};
        this.strings = this.data.strings || {};
        
        this.init();
    }
    
    async init() {
        try {
            this.bindDOMElements();
            this.setupEventListeners();
            await this.loadTrack();
            await this.initializeThreeJS();
            this.showUserActivationPrompt();
            this.initialized = true;
        } catch (error) {
            console.error('Preview experience initialization failed:', error);
            this.showError(error.message);
        }
    }
    
    bindDOMElements() {
        this.canvas = document.getElementById('three-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.playPauseButton = document.getElementById('preview-play-pause');
        this.progressBar = document.querySelector('.preview-progress-bar');
        this.progressFill = document.getElementById('preview-progress-fill');
        this.currentTimeDisplay = document.getElementById('preview-current-time');
        this.totalTimeDisplay = document.getElementById('preview-total-time');
        this.volumeSlider = document.getElementById('preview-volume-slider');
        this.volumeButton = document.getElementById('preview-volume-button');
        this.emailForm = document.getElementById('preview-email-form');
        this.socialButtons = document.querySelectorAll('.social-button');
        this.userActivationPrompt = document.getElementById('user-activation-prompt');
        this.errorContainer = document.getElementById('preview-error-container');
        this.helpToggle = document.querySelector('.help-toggle');
        this.helpContent = document.getElementById('help-content');
        
        if (!this.canvas) {
            throw new Error('Three.js canvas not found');
        }
    }
    
    setupEventListeners() {
        // Audio controls
        if (this.playPauseButton) {
            this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.seek(e));
            this.progressBar.addEventListener('keydown', (e) => this.handleProgressKeyboard(e));
        }
        
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        }
        
        if (this.volumeButton) {
            this.volumeButton.addEventListener('click', () => this.toggleMute());
        }
        
        // Email form
        if (this.emailForm) {
            this.emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
        }
        
        // Social sharing
        this.socialButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleSocialShare(e));
        });
        
        // User activation
        const activateButton = document.getElementById('activate-audio');
        if (activateButton) {
            activateButton.addEventListener('click', () => this.activateAudio());
        }
        
        // Help toggle
        if (this.helpToggle) {
            this.helpToggle.addEventListener('click', () => this.toggleHelp());
        }
        
        // Mouse movement for consciousness interaction
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    }
    
    async loadTrack() {
        if (!this.track.audio_url) {
            throw new Error(this.strings.noAudio || 'No audio track available');
        }
        
        this.updateLoadingText(this.strings.loadingAudio || 'Loading audio...');
        
        // Create audio element
        this.audioElement = document.createElement('audio');
        this.audioElement.crossOrigin = 'anonymous';
        this.audioElement.preload = 'auto';
        
        return new Promise((resolve, reject) => {
            this.audioElement.addEventListener('loadeddata', () => {
                this.isAudioReady = true;
                this.updateLoadingProgress(50);
                resolve();
            });
            
            this.audioElement.addEventListener('error', (e) => {
                reject(new Error(this.strings.audioError || 'Audio failed to load'));
            });
            
            this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
            this.audioElement.addEventListener('ended', () => this.onTrackEnded());
            
            this.audioElement.src = this.track.audio_url;
        });
    }
    
    async initializeThreeJS() {
        this.updateLoadingText('Initializing consciousness...');
        
        // Scene setup - use root scene singleton
        this.scene = getRootScene();
        this.scene.background = new THREE.Color(0x000000);
        setRootScene(this.scene);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Initialize consciousness visualization based on track settings
        await this.initializeConsciousness();
        
        this.updateLoadingProgress(100);
        setTimeout(() => this.hideLoadingScreen(), 500);
    }
    
    async initializeConsciousness() {
        const consciousnessType = this.track.consciousness?.type || 'abstract';
        const colorPalette = this.track.consciousness?.color_palette || '#8B5CF6';
        const intensity = this.track.consciousness?.intensity_level || 1.0;
        
        // Convert hex color to THREE.Color
        const primaryColor = new THREE.Color(colorPalette);
        
        switch (consciousnessType) {
            case 'abstract':
                this.consciousness = this.createAbstractConsciousness(primaryColor, intensity);
                break;
            case 'structural':
                this.consciousness = this.createStructuralConsciousness(primaryColor, intensity);
                break;
            case 'manifold':
                this.consciousness = this.createManifoldConsciousness(primaryColor, intensity);
                break;
            case 'realm':
                this.consciousness = this.createRealmConsciousness(primaryColor, intensity);
                break;
            case 'particle':
                this.consciousness = this.createParticleConsciousness(primaryColor, intensity);
                break;
            case 'geometric':
                this.consciousness = this.createGeometricConsciousness(primaryColor, intensity);
                break;
            default:
                this.consciousness = this.createAbstractConsciousness(primaryColor, intensity);
        }
        
        if (this.consciousness) {
            this.scene.add(this.consciousness);
        }
    }
    
    createAbstractConsciousness(color, intensity) {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: intensity },
                color: { value: color },
                mouse: { value: new THREE.Vector2() },
                audioData: { value: 0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform float time;
                uniform float intensity;
                uniform float audioData;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    
                    vec3 pos = position;
                    float wave = sin(pos.x * 2.0 + time * intensity) * 0.1 * audioData;
                    pos += normal * wave;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                uniform vec3 color;
                uniform vec2 mouse;
                uniform float audioData;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
                    
                    float pulse = sin(time * intensity * 2.0) * 0.5 + 0.5;
                    vec3 finalColor = color * (fresnel + pulse) * (1.0 + audioData);
                    
                    gl_FragColor = vec4(finalColor, 0.8);
                }
            `,
            transparent: true
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createStructuralConsciousness(color, intensity) {
        const group = new THREE.Group();
        
        // Create interconnected geometric shapes
        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.OctahedronGeometry(0.8),
            new THREE.TetrahedronGeometry(0.6)
        ];
        
        geometries.forEach((geometry, i) => {
            const material = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                Math.cos(i * 2.09) * 2,
                Math.sin(i * 2.09) * 2,
                0
            );
            group.add(mesh);
        });
        
        return group;
    }
    
    createManifoldConsciousness(color, intensity) {
        const geometry = new THREE.PlaneGeometry(4, 4, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: intensity },
                color: { value: color },
                audioData: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                uniform float intensity;
                uniform float audioData;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    float wave1 = sin(pos.x * 3.0 + time * intensity) * 0.2;
                    float wave2 = cos(pos.y * 3.0 + time * intensity) * 0.2;
                    pos.z = (wave1 + wave2) * audioData;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                uniform float audioData;
                varying vec2 vUv;
                
                void main() {
                    float pattern = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
                    vec3 finalColor = color * (pattern + audioData);
                    gl_FragColor = vec4(finalColor, 0.8);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createRealmConsciousness(color, intensity) {
        // Portal-like effect
        const geometry = new THREE.RingGeometry(0.5, 2, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: intensity },
                color: { value: color }
            },
            vertexShader: `
                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                uniform vec3 color;
                
                void main() {
                    vec2 center = gl_FragCoord.xy / vec2(512.0, 512.0) - 0.5;
                    float dist = length(center);
                    float ripple = sin(dist * 20.0 - time * intensity * 5.0) * 0.5 + 0.5;
                    
                    gl_FragColor = vec4(color * ripple, ripple);
                }
            `,
            transparent: true
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createParticleConsciousness(color, intensity) {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.02,
            transparent: true,
            opacity: 0.8
        });
        
        return new THREE.Points(geometry, material);
    }
    
    createGeometricConsciousness(color, intensity) {
        const group = new THREE.Group();
        
        // Create nested geometric forms
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.IcosahedronGeometry(1 + i * 0.3);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                transparent: true,
                opacity: 0.3 - i * 0.05
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
        }
        
        return group;
    }
    
    showUserActivationPrompt() {
        if (this.userActivationPrompt) {
            this.userActivationPrompt.style.display = 'flex';
        }
    }
    
    async activateAudio() {
        try {
            if (!this.userHasInteracted) {
                // Initialize audio context on user interaction
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (this.audioElement && this.audioContext) {
                    const source = this.audioContext.createMediaElementSource(this.audioElement);
                    this.analyser = this.audioContext.createAnalyser();
                    this.analyser.fftSize = 256;
                    
                    source.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                    
                    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                }
                
                this.userHasInteracted = true;
            }
            
            if (this.userActivationPrompt) {
                this.userActivationPrompt.style.display = 'none';
            }
            
            this.startAnimation();
            
        } catch (error) {
            console.error('Audio activation failed:', error);
            this.showError(error.message);
        }
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
    
    updateLoadingProgress(percentage) {
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    togglePlayPause() {
        if (!this.userHasInteracted) {
            this.activateAudio();
            return;
        }
        
        if (!this.isAudioReady || !this.audioElement) {
            return;
        }
        
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton(false);
        } else {
            this.audioElement.play().then(() => {
                this.isPlaying = true;
                this.updatePlayPauseButton(true);
            }).catch(error => {
                console.error('Audio play failed:', error);
                this.showError(this.strings.audioError || 'Audio playback failed');
            });
        }
    }
    
    updatePlayPauseButton(playing) {
        if (!this.playPauseButton) return;
        
        const playIcon = this.playPauseButton.querySelector('.play-icon');
        const pauseIcon = this.playPauseButton.querySelector('.pause-icon');
        
        if (playing) {
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'block';
        } else {
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }
    }
    
    seek(event) {
        if (!this.audioElement || !this.progressBar) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        const seekTime = this.audioElement.duration * percentage;
        
        this.audioElement.currentTime = seekTime;
    }
    
    updateProgress() {
        if (!this.audioElement || !this.progressFill) return;
        
        const percentage = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        this.progressFill.style.width = `${percentage}%`;
        
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
        }
        
        if (this.totalTimeDisplay && !isNaN(this.audioElement.duration)) {
            this.totalTimeDisplay.textContent = this.formatTime(this.audioElement.duration);
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    setVolume(volume) {
        if (this.audioElement) {
            this.audioElement.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    toggleMute() {
        if (!this.audioElement) return;
        
        this.audioElement.muted = !this.audioElement.muted;
        // Update volume button icon based on mute state
    }
    
    onTrackEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton(false);
        
        // Reset progress
        if (this.progressFill) {
            this.progressFill.style.width = '0%';
        }
    }
    
    async handleEmailSubmit(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('preview-email');
        const submitButton = document.getElementById('email-submit-button');
        const messageDiv = document.getElementById('email-form-message');
        
        if (!emailInput || !emailInput.value) return;
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.querySelector('.button-text').style.display = 'none';
        submitButton.querySelector('.button-loading').style.display = 'inline';
        
        try {
            const response = await fetch(`${this.data.apiUrl}preview-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.data.previewEmailNonce || this.data.restNonce || this.data.nonce
                },
                body: JSON.stringify({
                    email: emailInput.value
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage(messageDiv, result.message || this.strings.emailSuccess, 'success');
                emailInput.value = '';
            } else {
                throw new Error(result.message || this.strings.emailError);
            }
            
        } catch (error) {
            console.error('Email submission failed:', error);
            this.showMessage(messageDiv, error.message || this.strings.emailError, 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.querySelector('.button-text').style.display = 'inline';
            submitButton.querySelector('.button-loading').style.display = 'none';
        }
    }
    
    handleSocialShare(event) {
        const platform = event.currentTarget.dataset.platform;
        const shareUrl = this.data.shareUrl;
        const shareTitle = this.data.shareTitle;
        const shareDescription = this.data.shareDescription;
        
        switch (platform) {
            case 'twitter':
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(twitterUrl, '_blank', 'width=550,height=420');
                break;
                
            case 'facebook':
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                window.open(facebookUrl, '_blank', 'width=550,height=420');
                break;
                
            case 'copy':
                this.copyToClipboard(shareUrl);
                break;
        }
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            const messageDiv = document.getElementById('social-share-message');
            this.showMessage(messageDiv, this.strings.shareSuccess, 'success');
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            const messageDiv = document.getElementById('social-share-message');
            this.showMessage(messageDiv, this.strings.shareError, 'error');
        }
    }
    
    showMessage(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `${element.className.split(' ')[0]} ${type}`;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
    
    toggleHelp() {
        if (!this.helpToggle || !this.helpContent) return;
        
        const isExpanded = this.helpToggle.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;
        
        this.helpToggle.setAttribute('aria-expanded', newState);
        this.helpContent.style.display = newState ? 'block' : 'none';
    }
    
    onMouseMove(event) {
        if (!this.consciousness) return;
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.onMouseMove({
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            });
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        this.onTouchStart(event);
    }
    
    handleKeyboard(event) {
        if (!this.userHasInteracted) return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                if (this.audioElement) {
                    this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - 10);
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (this.audioElement) {
                    this.audioElement.currentTime = Math.min(this.audioElement.duration, this.audioElement.currentTime + 10);
                }
                break;
        }
    }
    
    handleProgressKeyboard(event) {
        if (!this.audioElement) return;
        
        switch (event.code) {
            case 'ArrowLeft':
                event.preventDefault();
                this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - 5);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.audioElement.currentTime = Math.min(this.audioElement.duration, this.audioElement.currentTime + 5);
                break;
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startAnimation() {
        this.animate();
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (!this.consciousness || !this.renderer || !this.scene || !this.camera) return;
        
        const time = Date.now() * 0.001;
        
        // Get audio data if available
        let audioData = 0;
        if (this.analyser && this.dataArray && this.isPlaying) {
            this.analyser.getByteFrequencyData(this.dataArray);
            audioData = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length / 255;
        }
        
        // Update consciousness based on type
        if (this.consciousness.material && this.consciousness.material.uniforms) {
            const uniforms = this.consciousness.material.uniforms;
            if (uniforms.time) uniforms.time.value = time;
            if (uniforms.mouse) uniforms.mouse.value = this.mouse;
            if (uniforms.audioData) uniforms.audioData.value = audioData;
        }
        
        // Rotate consciousness based on mouse position and audio
        this.consciousness.rotation.x = this.mouse.y * 0.5 + time * 0.1;
        this.consciousness.rotation.y = this.mouse.x * 0.5 + time * 0.1;
        this.consciousness.rotation.z = audioData * 0.5;
        
        // Scale based on audio data
        const scale = 1 + audioData * 0.5;
        this.consciousness.scale.setScalar(scale);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    showError(message) {
        if (!this.errorContainer) return;
        
        const errorText = document.getElementById('preview-error-text');
        if (errorText) {
            errorText.textContent = message;
        }
        
        this.errorContainer.style.display = 'flex';
        
        const retryButton = document.getElementById('preview-error-retry');
        if (retryButton) {
            retryButton.onclick = () => {
                this.errorContainer.style.display = 'none';
                this.init();
            };
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sonoitePreview = new SonoitePreviewExperience();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.sonoitePreview) {
        window.sonoitePreview.destroy();
    }
});
