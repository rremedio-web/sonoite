/**
 * Sonoite Three.js Experience
 * Main Three.js scene with audio-reactive visuals
 *
 * LEGACY (pre-reset) runtime: the front page no longer boots it; the current runtime is Path B in
 * src/js/prototype/. Kept in source, not extended. See CLAUDE.md, Architecture section A.
 */

// Initialize debug mode (default: false)
window.SONOITE_DEBUG = window.SONOITE_DEBUG || false;

// STAB-02: Initialize expensive renderer flags with explicit URL fallbacks.
(() => {
    const qs = new URLSearchParams(window.location.search);
    const postQ = qs.get('post') === '1';
    const shadQ = qs.get('shadows') === '1';
    try {
        const shadLS = localStorage.getItem('SONOITE_SHADOWS') === '1';
        window.SONOITE_POST = (typeof window.SONOITE_POST !== 'undefined') ? window.SONOITE_POST : postQ;
        window.SONOITE_SHADOWS = (typeof window.SONOITE_SHADOWS !== 'undefined') ? window.SONOITE_SHADOWS : (shadQ || shadLS);
    } catch (e) {
        window.SONOITE_POST = (typeof window.SONOITE_POST !== 'undefined') ? window.SONOITE_POST : postQ;
        window.SONOITE_SHADOWS = (typeof window.SONOITE_SHADOWS !== 'undefined') ? window.SONOITE_SHADOWS : shadQ;
    }

    // Heuristic defaults for LOD and reduced motion (can be overridden via flags/URL/LS)
    try {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (typeof window.SONOITE_LOD === 'undefined') {
            // Default ON for mobile tiers; OFF on desktop for maximum parity
            const lodQ = qs.get('lod');
            const lodLS = localStorage.getItem('SONOITE_LOD');
            if (lodQ !== null) window.SONOITE_LOD = lodQ === '1';
            else if (lodLS !== null) window.SONOITE_LOD = lodLS === '1';
            else window.SONOITE_LOD = isMobileUA;
        }
        if (typeof window.SONOITE_REDUCED_MOTION === 'undefined') {
            const prefersReduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.SONOITE_REDUCED_MOTION = !!prefersReduce;
        }
        // MP-CON-01: Initialize consciousness flag (default: OFF)
        if (typeof window.SONOITE_CONSCIOUSNESS === 'undefined') {
            const consQ = qs.get('consciousness');
            const consLS = localStorage.getItem('SONOITE_CONSCIOUSNESS');
            if (consQ !== null) window.SONOITE_CONSCIOUSNESS = consQ === '1';
            else if (consLS !== null) window.SONOITE_CONSCIOUSNESS = consLS === '1';
            else window.SONOITE_CONSCIOUSNESS = false;  // Default: OFF
        }
    } catch (_) { /* noop */ }
})();

// Only log once
if (!window._threeExperienceLoaded) {
    if (window.SONOITE_DEBUG) {
        dlog('three-experience.js file loaded');
    }
    window._threeExperienceLoaded = true;
}

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { dlog, dwarn, derr } from './utils/devlog.js';
import { PostProcessingConfig } from './visuals/PostProcessingConfig.js';
import { AudioManager } from './audio-manager.js';
import { performanceMonitor } from '../core/PerformanceMonitor.js';
import { getRootScene, setRootScene, setRootCamera, setRootRenderer } from './three-root.js';
import { visualLayerErrorBoundary } from './visuals/utils/VisualLayerErrorBoundary.js';
import { performanceOptimizer } from './visuals/utils/PerformanceOptimizer.js';
import { accessibilityManager } from './visuals/utils/AccessibilityManager.js';
import { visualLayerRegistry } from './visuals/VisualLayerRegistry.js';
// MP-AUDIO-EMA-06: Import global EMA + hysteresis router
import { audioEMA } from './visuals/utils/audioEMA.js';
// CINEMATIC-FIX: Import Track1Director for phase-based orchestration
import { Track1Director } from './visuals/Track1Director.js';
// TRACK5-FIX: Import Track5VoidDirector for "Não Querer Nada" orchestration
import { Track5VoidDirector } from './visuals/Track5VoidDirector.js';
// TRACK6-FIX: Import Track6Director for "O Filho" orchestration
import { Track6Director } from './visuals/Track6Director.js';
// MIG-02: Register all visual layer types (flows, structures, core)
import './visuals/register-defaults.js';

// DEBUG: Expose registry and audioEMA globally for DevTools inspection
if (window.SONOITE_DEBUG) {
  window.visualLayerRegistry = visualLayerRegistry;
  window.registry = visualLayerRegistry; // MP-SHAPES-Register-02: Shorter alias for DevTools
  window.audioEMA = audioEMA; // MP-AUDIO-EMA-06: Expose for tuning and debugging
}
// JNY-WIRE-01: Import JourneyController for signature moments
import { JourneyController } from './visuals/journey-controller.js';
// MIG-02: Import journey loader to fetch track configurations
import { loadJourneyByTrackId } from './visuals/journey-loader.js';
// STAB-10: Import JourneyTransitionManager for smooth transitions
import { JourneyTransitionManager } from './visuals/JourneyTransitionManager.js';
// MEMORY-LEAK-FIX: Import dispose3D for proper geometry/material cleanup
import { dispose3D } from './utils/dispose3d.js';
// FULL-OVERHAUL: Import BeatDetector for real-time kick/snare detection
import { BeatDetector } from './audio/BeatDetector.js';

export class SonoiteExperience {
    constructor() {
        this.container = document.getElementById('three-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.errorScreen = document.getElementById('error-screen');
        this.tracks = window.sonoiteData?.tracks || [];
        this.currentTrackIndex = -1; // -1 = no track selected (allows idle journey)
        this._isManualTrackSwitch = false;
        // Launch policy: default OFF (enabled later for full-album transitions)
        const urlParams = new URLSearchParams(window.location.search);
        const autoNextParam = urlParams.get('autonext');
        if (autoNextParam !== null) {
            this.autoAdvanceEnabled = autoNextParam === '1';
        } else if (typeof window.SONOITE_AUTO_ADVANCE === 'boolean') {
            this.autoAdvanceEnabled = window.SONOITE_AUTO_ADVANCE;
        } else {
            this.autoAdvanceEnabled = false;
        }
        // Visualization handled by consciousness system
        
        // Abstract consciousness system
        this.abstractConsciousness = null;
        this.trackMetamorphosis = null;
        this.isAbstractMode = false;

        // Consciousness system - DISABLED
        this.consciousnessSystem = null;
        this.consciousnessEnabled = false;

        // Track loading token to avoid race conditions when switching quickly
        this.trackLoadToken = 0;
        this.isTrackSwitching = false;
        this.queuedTrackIndex = null;

        // STAB-10: Journey transition manager (initialized after camera)
        this.journeyTransitionManager = null;

        // Mouse interaction
        this.mouse = new THREE.Vector2();
        this.mouseTarget = new THREE.Vector2();
        
        // Performance monitoring
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // MP-Perf-PRCAP: Cap renderer pixel ratio to avoid GPU overload on high-DPR displays.
        // Override via ?prcap=0.5–2.0 or localStorage SONOITE_PR_CAP.
        const prCapParam = urlParams.get('prcap');
        const storedPrCap = typeof localStorage !== 'undefined' ? localStorage.getItem('SONOITE_PR_CAP') : null;
        this.renderPixelRatioCap = this._parsePixelRatioCap(prCapParam ?? storedPrCap, 1.0);
        if (prCapParam !== null && typeof localStorage !== 'undefined') {
            localStorage.setItem('SONOITE_PR_CAP', String(this.renderPixelRatioCap));
        }
        this._renderPixelRatioCapOverride = null;
        this._lastRendererPerformanceRating = null;
        this.pixelRatio = this._getEffectivePixelRatio();
        const fpsParam = Number.parseFloat(urlParams.get('fps'));
        const defaultTargetFPS = window.SONOITE_POST ? 60 : 30;
        this.targetFPS = Number.isFinite(fpsParam) && fpsParam > 0
            ? Math.min(Math.max(fpsParam, 15), 60)
            : defaultTargetFPS;
        this.frameIntervalMs = this.targetFPS >= 60 ? 0 : 1000 / this.targetFPS;
        this._lastRenderedFrameMs = 0;
        
        // Quality settings from performance monitor
        this.qualitySettings = null;

        // MP-IDLE-03: Idle timeout and first-gesture nudge
        this.idleTimeout = null;
        this.idleTimeoutDuration = 20000; // 20 seconds
        this.firstGestureHandled = false;
        this.isIdleMode = false;

        // P1-FIX: AbortController for centralized event listener cleanup
        this.eventAbortController = new AbortController();

        // CINEMATIC-FIX: Track1Director for phase-based orchestration (Sonoite-specific)
        this.track1Director = null;
        // TRACK5-FIX: Track5VoidDirector for "Não Querer Nada" orchestration
        this.track5Director = null;
        // TRACK6-FIX: Track6Director for "O Filho" orchestration
        this.track6Director = null;

        // P1-PERF-FIX: Pre-allocated vectors for god rays position calculation
        // Avoids creating new Vector3/Vector2 objects every frame
        this._godRaysWorldPos = new THREE.Vector3();
        this._godRaysScreenUV = new THREE.Vector2();
        this._cachedEggCrystalLayer = null;
        // Avoid per-frame function allocation in RAF loop.
        this._animateBound = this.animate.bind(this);

        // Note: init() is called separately by init-experience.js to avoid double initialization
    }
    
    /**
     * Initialize Three.js experience
     * BUG-007-FIX: Now async with shader warmup to prevent opening glitches
     */
    async init() {
        try {
            // Phase 1: Core setup (synchronous, fast)
            this.setupScene();
            this.setupRenderer();
            this.setupCamera();
            // STAB-10: Initialize transition manager after camera
            this.journeyTransitionManager = new JourneyTransitionManager({
                camera: this.camera,
                scene: this.scene
            });
            this.setupControls();

            // Phase 2: Post-processing setup (triggers shader compilation)
            this.setupPostProcessing();

            // BUG-007-FIX: Warm up shaders before first visible frame
            await this.warmUpShaders();

            // Phase 3: Audio and visualizers
            this.setupAudio();
            this.setupVisualizers();
            this.createAmbientScene();
            this.setupEventListeners();
            this.setupUI();
            this.hideErrorScreen();

            // BUG-007-FIX: Wait a few frames for GPU to stabilize
            await this.waitFrames(3);

            // Phase 4: Start render loop
            this.animate();

            // Phase 5: Hide loading screen with smooth transition
            this.hideLoadingScreen();

            // BUG-03: Load idle journey on landing (always, unless explicitly disabled)
            // Provides a cinematic attract scene before any track starts
            // Changed condition: Load by default unless SONOITE_IDLE is explicitly false
            if (window.SONOITE_IDLE !== false) {
                this.loadIdleJourney().then(() => {
                    // RACE-FIX: Don't enter idle mode if a track was selected while the idle load was in flight
                    if (this.currentTrackIndex >= 0) {
                        return;
                    }
                    this.isIdleMode = true;
                    this.startIdleTimeout();
                    if (window.SONOITE_DEBUG) dlog('🌙 Idle journey loaded successfully');
                }).catch(err => {
                    // BUG-03: Always warn about idle journey errors (not just in debug mode)
                    dwarn('Idle journey failed to load:', err?.message || err);
                    console.error('Idle journey error:', err);
                });
            }

            if (window.SONOITE_DEBUG) {
                dlog('✅ SonoiteExperience initialized successfully');
            }
        } catch (error) {
            derr('❌ SonoiteExperience initialization failed:', error);
            this.showErrorState?.(error);
        }
    }

    /**
     * BUG-007-FIX: Force shader compilation before first visible frame
     * Prevents visual glitches during first 4 seconds
     */
    async warmUpShaders() {
        if (!this.postProcessing?.composer) return;

        // Render one hidden frame to trigger shader compilation
        this.renderer.setRenderTarget(null);
        this.postProcessing.composer.render();

        // Wait for GPU to finish compilation
        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.SONOITE_DEBUG) {
            dlog('✅ Shaders warmed up');
        }
    }

    /**
     * BUG-007-FIX: Wait N frames before proceeding
     */
    waitFrames(count) {
        return new Promise(resolve => {
            let framesPassed = 0;
            const waitFrame = () => {
                framesPassed++;
                if (framesPassed >= count) {
                    resolve();
                } else {
                    requestAnimationFrame(waitFrame);
                }
            };
            requestAnimationFrame(waitFrame);
        });
    }

    /**
     * Load idle journey (attract mode) from JSON file
     */
    async loadIdleJourney() {
        // RACE-FIX: Abort if user already selected a track
        // This prevents the idle journey from overwriting track layers
        // when the async idle load completes after a track click
        if (this.currentTrackIndex >= 0) {
            if (window.SONOITE_DEBUG) dlog('🌙 Idle journey skipped - track already selected');
            return;
        }

        const candidates = [
            'public/assets/journeys/phase42/idle.json',
            '/wp-content/themes/sonoite-theme/public/assets/journeys/phase42/idle.json'
        ];

        let cfg = null;
        for (const url of candidates) {
            try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (res.ok) { cfg = await res.json(); break; }
            } catch (_) { /* try next */ }
        }
        if (!cfg) throw new Error('idle.json not found');

        // Clear any track-specific UI mode before entering idle attract mode.
        this._applyTrackUIMode('');

        // RACE-FIX-2: Second check after fetch completes
        // User may have clicked a track while fetch was in flight
        if (this.currentTrackIndex >= 0) {
            if (window.SONOITE_DEBUG) dlog('🌙 Idle journey aborted after fetch - track already selected');
            return;
        }

        // Clear existing and load idle layers using the same path as track journeys
        try {
            this.clearVisualLayers();
            await this.createCoreLayers();
            // STAB-10: Use abrupt transition for idle (no layers to transition from)
            await this.loadVisualLayers(cfg, false); // false = no transition
            if (window.SONOITE_DEBUG) dlog('🌙 Idle journey loaded');
        } catch (e) {
            dwarn('Failed to load idle journey:', e);
        }
    }

    /**
     * MP-IDLE-03: Start idle timeout (15-30s)
     */
    startIdleTimeout() {
        if (this.idleTimeout) clearTimeout(this.idleTimeout);

        this.idleTimeout = setTimeout(() => {
            if (this.isIdleMode && window.SONOITE_DEBUG) {
                dlog('💤 Idle timeout elapsed, staying in attract mode');
            }
        }, this.idleTimeoutDuration);
    }

    /**
     * MP-IDLE-03: Handle first user gesture with camera nudge
     */
    handleFirstGesture() {
        if (this.firstGestureHandled || !this.isIdleMode) return;

        this.firstGestureHandled = true;
        if (this.idleTimeout) clearTimeout(this.idleTimeout);

        // Subtle camera nudge (0.2 dolly, 2-3° yaw over 1-2s)
        if (this.camera && this.controls) {
            const startPos = this.camera.position.clone();
            const targetDolly = 0.2;
            const targetYaw = (2 + Math.random()) * Math.PI / 180; // 2-3 degrees
            const duration = 1.5; // 1-2 seconds
            const startTime = performance.now();

            const animate = () => {
                const elapsed = (performance.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1.0);
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                // Dolly camera forward slightly
                const dolly = eased * targetDolly;
                this.camera.position.z = startPos.z - dolly;

                // Rotate camera slightly (yaw)
                const yaw = eased * targetYaw;
                this.camera.rotation.y += yaw * 0.01;

                if (progress < 1.0) {
                    requestAnimationFrame(animate);
                } else if (window.SONOITE_DEBUG) {
                    dlog('👋 First gesture camera nudge complete');
                }
            };

            animate();
        }
    }
    
    /**
     * Setup Three.js scene
     */
    setupScene() {
        this.scene = getRootScene();
        // Ensure scene properties are set
        if (!this.scene.background) {
            this.scene.background = new THREE.Color(0x000000);
        }
        if (!this.scene.fog) {
            this.scene.fog = new THREE.Fog(0x000000, 10, 50);
        }
        // Store reference for global access
        setRootScene(this.scene);
    }
    
    /**
     * Setup renderer
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.container,
            antialias: !this.isMobile,
            alpha: false, // WHITE-FLASH-FIX: Disable alpha to prevent transparent canvas showing white HTML
            powerPreference: 'high-performance'
        });

        // WHITE-FLASH-FIX: Enforce black clear color even if scene.background is nulled
        this.renderer.setClearColor(0x000000, 1);

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        // CIN-LIGHT: Enable soft shadows when explicitly toggled and not mobile
        this.renderer.shadowMap.enabled = !this.isMobile && window.SONOITE_SHADOWS;
        if (this.renderer.shadowMap.enabled) {
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Enable color management
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // WebGL context loss handling - prevents blank screen on mobile tab background
        this.contextLost = false;
        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.contextLost = true;
            dwarn('WebGL context lost - pausing render loop');
        });
        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            this.contextLost = false;
            dlog('WebGL context restored - resuming render loop');
        });

        // Store reference for global access
        setRootRenderer(this.renderer);
    }

    _parsePixelRatioCap(rawValue, fallback) {
        const parsed = parseFloat(String(rawValue ?? ''));
        if (!Number.isFinite(parsed)) return fallback;
        return THREE.MathUtils.clamp(parsed, 0.5, 2);
    }

    _getRenderPixelRatioCap() {
        const cap = Number.isFinite(this._renderPixelRatioCapOverride)
            ? this._renderPixelRatioCapOverride
            : this.renderPixelRatioCap;
        return THREE.MathUtils.clamp(cap, 0.5, 2);
    }

    _getEffectivePixelRatio() {
        const cap = this._getRenderPixelRatioCap();
        return Math.min(window.devicePixelRatio || 1, cap);
    }

    _syncRendererResolution() {
        const nextPixelRatio = this._getEffectivePixelRatio();
        if (!Number.isFinite(nextPixelRatio) || Math.abs(nextPixelRatio - this.pixelRatio) < 0.01) {
            return;
        }
        this.pixelRatio = nextPixelRatio;

        if (this.renderer) {
            this.renderer.setPixelRatio(this.pixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        if (this.postProcessing) {
            this.postProcessing.setSize(window.innerWidth, window.innerHeight);
        }

        if (window.SONOITE_DEBUG) {
            dlog('[MP-Perf-PRCAP] Renderer pixel ratio updated', {
                rendererPR: this.renderer?.getPixelRatio?.(),
                cap: this.renderPixelRatioCap,
                override: this._renderPixelRatioCapOverride,
                effective: this.pixelRatio
            });
        }
    }

    _autoTrimRendererResolution(performanceRating) {
        if (performanceRating === this._lastRendererPerformanceRating) {
            return;
        }

        const wasPoor = this._lastRendererPerformanceRating === 'poor' || this._lastRendererPerformanceRating === 'critical';
        const isPoor = performanceRating === 'poor' || performanceRating === 'critical';
        this._lastRendererPerformanceRating = performanceRating;

        if (isPoor && !wasPoor) {
            // Degrading: clamp renderer DPR harder (biggest GPU win).
            this._renderPixelRatioCapOverride = Math.min(this._getRenderPixelRatioCap(), 1.0);
            this._syncRendererResolution();
        } else if (!isPoor && wasPoor) {
            // Improving: restore user-configured cap.
            this._renderPixelRatioCapOverride = null;
            this._syncRendererResolution();
        }
    }
    
    /**
     * Setup camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 10);
        
        // Store reference for global access
        setRootCamera(this.camera);
    }
    
    /**
     * Setup controls
     */
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 30;
        this.controls.minDistance = 3;
        this.controls.maxPolarAngle = Math.PI * 0.8;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Disable controls on mobile for performance
        if (this.isMobile) {
            this.controls.enableZoom = false;
            this.controls.enablePan = false;
        }

        // Accessibility: honor reduced motion preference by disabling idle autorotation
        if (window.SONOITE_REDUCED_MOTION) {
            this.controls.autoRotate = false;
        }
    }
    
    /**
     * Setup post-processing with Phase 4.2 effects
     * STAB-02: Gated by window.SONOITE_POST flag
     */
    setupPostProcessing() {
        // STAB-02: Only instantiate post-processing if flag is enabled
        if (!window.SONOITE_POST) {
            this.postProcessing = null;
            dlog('🎨 Post-processing disabled (SONOITE_POST=false)');
            return;
        }

        this.postProcessing = new PostProcessingConfig(this.renderer, this.scene, this.camera);

        // Accessibility: prefer lower-intensity post when reduced motion is requested
        if (window.SONOITE_REDUCED_MOTION && this.postProcessing?.applyPreset) {
            try { this.postProcessing.applyPreset('low'); } catch (_) {}
        }

        // Reduce effects on mobile for performance
        if (this.isMobile) {
            this.postProcessing.passes.bloomStrength = 0.5;
            this.postProcessing.passes.bloomRadius = 0.3;
            this.postProcessing.passes.vignetteStrength = 0.3;
            this.postProcessing.passes.grainIntensity = 0.1;
            this.postProcessing.updatePipeline();
        }

        dlog('🎨 Post-processing initialized with Phase 4.2 effects');
    }
    
    /**
     * Setup audio manager
     */
    setupAudio() {
        // Make sure we only have one audio manager
        if (this.audioManager) {
            dwarn('AudioManager already exists, stopping previous instance');
            this.audioManager.dispose();
        }
        const audioConfig = window.sonoiteData?.audioConfig || window.sonoiteSecurityConfig || {};
        this.audioManager = new AudioManager(audioConfig);
        
        // Setup audio event listeners
        this.audioManager.on('onPlay', () => {
            this.updatePlayPauseButton(true);
            this.hideErrorScreen();
        });
        
        this.audioManager.on('onPause', () => {
            this.updatePlayPauseButton(false);
        });

        this.audioManager.on('onLoadStart', () => {
            this.hideErrorScreen();
        });
        
        this.audioManager.on('onStop', () => {
            this.updatePlayPauseButton(false);
            this.updateProgressBar(0);
        });
        
        this.audioManager.on('onTimeUpdate', (currentTime) => {
            this.updateProgressBar(currentTime);
        });
        
        this.audioManager.on('onError', (error) => {
            derr('Audio error:', error);
            this.showErrorMessage('Audio playback error');
            if (!this.audioManager?.isPlaying) {
                this.showErrorScreen('We encountered an issue loading the audio experience. Please try refreshing the page.');
            }
        });

        // BUG-FIX: Add onTrackEnd handler for auto-play next
        this.audioManager.on('onTrackEnd', () => {
            this.handleTrackEnd();
        });

        // FULL-OVERHAUL: Initialize BeatDetector for real-time kick/snare detection
        this.beatDetector = new BeatDetector(this.audioManager);

        // Configure sensitivity (can be tuned per track)
        this.beatDetector.configure({
            kickThreshold: 0.55,
            snareThreshold: 0.45,
            debug: window.SONOITE_DEBUG
        });

        // Expose for debugging
        if (window.SONOITE_DEBUG) {
            window.beatDetector = this.beatDetector;
        }

        dlog('BeatDetector initialized');
    }

    /**
     * BUG-FIX: Handle track end - auto-play next track or reset visuals
     */
    handleTrackEnd() {
        // TRACK-SWITCH-FIX: Don't auto-advance if this was triggered by manual track switch
        if (this._isManualTrackSwitch) {
            dlog('[handleTrackEnd] Skipping - manual track switch in progress');
            return;
        }

        // Launch policy: keep single-track playback (auto-advance re-enabled later for full-album release)
        if (!this.autoAdvanceEnabled) {
            dlog('[handleTrackEnd] Auto-advance disabled; resetting visuals');
            this.resetVisualsToIdle();
            return;
        }

        if (!this.tracks || this.tracks.length === 0) {
            console.log('No tracks available for auto-play');
            this.resetVisualsToIdle();
            return;
        }

        // Use currentTrackIndex directly (more reliable than findIndex)
        const currentIndex = this.currentTrackIndex;

        if (currentIndex === -1 || currentIndex === undefined) {
            console.log('Current track index not set, cannot auto-play next');
            this.resetVisualsToIdle();
            return;
        }

        // Auto-play next track (loop back to first after last)
        const nextIndex = (currentIndex + 1) % this.tracks.length;

        dlog(`Auto-playing next track at index: ${nextIndex}`);
        this.selectTrack(nextIndex);
    }

    /**
     * Reset visuals to idle/clean state when track ends without auto-play
     */
    resetVisualsToIdle() {
        dlog('Resetting visuals to idle state');
        this._applyTrackUIMode('');

        // Stop journey controller
        if (this.journeyController) {
            // JourneyController has reset/clear, not stop()
            this.journeyController.reset();
        }

        // Reset all visual layers to default opacity
        if (this.visualLayers) {
            this.visualLayers.forEach(layer => {
                if (layer && typeof layer.setOpacity === 'function') {
                    layer.setOpacity(0.3); // Subtle idle presence
                }
            });
        }

        // WHITE-FLASH-FIX: Don't reset post-processing here - preserve artistic ending
        // Each journey applies its own preset on load via applyTrackPreset()
        // Resetting to 'balanced' here causes a brightness pop after fade-to-black endings
        // if (window.postfx) {
        //     window.postfx.applyPreset('balanced');
        // }

        // Update play/pause button state
        this.updatePlayPauseButton(false);
    }
    
    /**
     * Track visualization is handled by consciousness system
     */
    setupVisualizers() {
        // Initialize Visual Layer API system
        this.visualLayers = [];
        this.activeVisualizers = new Map();

        // STAB-09: Store THREE reference to prevent tree-shaking
        this.THREE = THREE;

        // Create shared context for all visual layers
        this.visualContext = {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            THREE: this.THREE,
            audioManager: this.audioManager,
            performanceOptimizer: performanceOptimizer,
            accessibilityManager: accessibilityManager,
            visualLayerRegistry: visualLayerRegistry,
            // Helper method for consistent audio data access
            getAudioData: () => {
                return this.audioManager.isPlaying ?
                    this.audioManager.getAudioAnalysis() :
                    this.audioManager.getFallbackAudioData();
            }
        };

        dlog('Visual Layer API system initialized');

        // Load default visual layers
        this.loadDefaultVisualLayers();
    }

    /**
     * Load default visual layers for idle state
     */
    async loadDefaultVisualLayers() {
        try {
            await this.createCoreLayers();
            dlog('🎨 Default visual layers loaded');
        } catch (error) {
            derr('Failed to load default visual layers:', error);
        }
    }

    isTrackRequestStale(requestId) {
        return Number.isInteger(requestId) && requestId !== this.trackLoadToken;
    }

    cleanupStaleLayer(layer) {
        if (!layer) return;

        if (layer.group && this.scene?.children?.includes(layer.group)) {
            this.scene.remove(layer.group);
        }

        if (layer.dispose) {
            layer.dispose();
        } else if (layer.unmount) {
            layer.unmount();
        }

        if (layer.group) {
            dispose3D(layer.group);
            layer.group = null;
        }
    }

    pruneOrphanSceneGroups() {
        if (!this.scene) return;

        const expectedGroups = new Set(
            (this.visualLayers || [])
                .map((layer) => layer?.group)
                .filter(Boolean)
        );

        const orphans = this.scene.children.filter((child) => (
            child?.type === 'Group' && !expectedGroups.has(child)
        ));

        if (orphans.length === 0) return;

        orphans.forEach((group) => {
            dispose3D(group);
            this.scene.remove(group);
        });

        if (window.SONOITE_DEBUG) {
            dwarn(`[pruneOrphanSceneGroups] Removed ${orphans.length} orphan groups`);
        }
    }

    /**
     * Load and initialize visual layers for a track
     * STAB-10: Enhanced with smooth transitions using JourneyTransitionManager
     */
    async loadVisualLayers(trackConfig, useTransition = true, requestId = this.trackLoadToken) {
        try {
            if (this.isTrackRequestStale(requestId)) {
                return;
            }

            // STAB-10: Check if we should use smooth transitions
            const shouldTransition = useTransition &&
                                   this.journeyTransitionManager &&
                                   this.visualLayers.length > 0;

            if (shouldTransition) {
                // STAB-10: Use smooth transition
                // PERF/MEM: Keep core layers persistent across track switches.
                // Recreating LightField (DirectionalLight + shadows) each transition can leak shadow-map textures
                // and also fights the LightField singleton guard. Only fade/dispose track layers.
                const coreKeys = ['skybox', 'lighting', 'camera', 'consciousness_core'];
                const coreLayers = coreKeys
                    .map((key) => this.activeVisualizers.get(key))
                    .filter(Boolean);

                const oldLayers = coreLayers.length > 0
                    ? this.visualLayers.filter((layer) => !coreLayers.includes(layer))
                    : [...this.visualLayers]; // Fallback if core layers are missing

                // Clear old flow/structure entries from activeVisualizers before creating new ones
                this.activeVisualizers.forEach((_, key) => {
                    if (key.startsWith('flow-') || key.startsWith('structure-')) {
                        this.activeVisualizers.delete(key);
                    }
                });

                // Define callback to load new layers
                const loadNewLayersCallback = async () => {
                    if (this.isTrackRequestStale(requestId)) {
                        return [];
                    }

                    // Create new track-layer array (don't touch core layers here)
                    const newLayers = [];

                    // MIG-02: Adapt Phase 4.2 journey format to Visual Layer API
                    if (trackConfig) {
                        const visualConfig = {
                            flows: [],
                            structures: []
                        };
                        const seenFlowTypes = new Set();
                        const seenStructureTypes = new Set();

                        // FLOW-STACK-FIX: Support both flow schemas
                        const isTrack5 =
                            trackConfig?.meta?.slug === 'nao-querer-nada' ||
                            trackConfig?.meta?.track === 5;
                        const track5AllowedFlows = new Set(['void_dust', 'cold_haze', 'ink_tendrils']);
                        const track5AllowedStructures = new Set([
                            'track5_hero_model',
                            'void_sphere',
                            // Track 5 setpiece prototypes (Phase 6)
                            'void_veil',
                            'void_compression_ring',
                            'void_eclipse_disc',
                            'void_halo',
                            'drifting_wireframes'
                        ]);
                        const allowFlow = (flow) => {
                            if (!flow) return false;
                            if (!isTrack5) return true;
                            return track5AllowedFlows.has(flow.type);
                        };
                        const allowStructure = (structure) => {
                            if (!structure) return false;
                            if (!isTrack5) return true;
                            return track5AllowedStructures.has(structure.type);
                        };
                        const addFlow = (flow) => {
                            if (!allowFlow(flow)) return;
                            const type = flow.type;
                            if (!type || seenFlowTypes.has(type)) return;
                            seenFlowTypes.add(type);
                            visualConfig.flows.push(flow);
                        };
                        const addStructure = (structure) => {
                            if (!allowStructure(structure)) return;
                            const type = structure.type;
                            if (!type || seenStructureTypes.has(type)) return;
                            seenStructureTypes.add(type);
                            visualConfig.structures.push(structure);
                        };

                        if (trackConfig.flow && allowFlow(trackConfig.flow)) {
                            addFlow(trackConfig.flow);
                            dlog(`[loadVisualLayers] Added flow: ${trackConfig.flow.type}`);
                        } else if (trackConfig.flow && window.SONOITE_DEBUG && isTrack5) {
                            dlog('[loadVisualLayers] Skipped flow for Track 5 (not allowed)');
                        }

                        // FLOW-STACK-FIX: Support flowElements array
                        if (trackConfig.flowElements && Array.isArray(trackConfig.flowElements)) {
                            for (const flow of trackConfig.flowElements) {
                                if (allowFlow(flow) && !seenFlowTypes.has(flow.type)) {
                                    addFlow(flow);
                                } else if (window.SONOITE_DEBUG && isTrack5 && !allowFlow(flow)) {
                                    dlog('[loadVisualLayers] Skipped flowElement for Track 5 (not allowed)');
                                }
                            }
                            if (trackConfig.flowElements.length > 0) {
                                dlog(`[loadVisualLayers] Considered ${trackConfig.flowElements.length} flow elements`);
                            }
                        }

                        // STRUCTURE-SCHEMA-FIX: Handle structure.elements (Phase 4.2 schema)
                        if (trackConfig.structure) {
                            if (
                                trackConfig.structure.elements &&
                                Array.isArray(trackConfig.structure.elements)
                            ) {
                                trackConfig.structure.elements.forEach((s) => {
                                    addStructure(s);
                                });
                            } else if (trackConfig.structure.type && allowStructure(trackConfig.structure)) {
                                addStructure(trackConfig.structure);
                                dlog(
                                    `[loadVisualLayers] Added primary structure: ${trackConfig.structure.type}`
                                );
                            }
                        }

                        // Also support top-level structureElements array (alternative schema)
                        if (trackConfig.structureElements && Array.isArray(trackConfig.structureElements)) {
                            // TRACK5-FIX: Apply same structure filter here
                            trackConfig.structureElements.forEach((s) => {
                                addStructure(s);
                            });
                            dlog(
                                `[loadVisualLayers] Added ${visualConfig.structures.length} filtered structure elements`
                            );
                        }

                        // Create track layers from adapted config
                        if (visualConfig.flows.length > 0 || visualConfig.structures.length > 0) {
                            const trackLayers = await this.createTrackLayers(visualConfig, false, requestId); // false = don't add to this.visualLayers
                            newLayers.push(...trackLayers);
                        }
                    }

                    if (this.isTrackRequestStale(requestId)) {
                        newLayers.forEach((layer) => this.cleanupStaleLayer(layer));
                        return [];
                    }

                    // Replace this.visualLayers with core + new track layers
                    // (old layers are handled by JourneyTransitionManager.cleanupOldLayers).
                    this.visualLayers = coreLayers.length > 0 ? [...coreLayers, ...newLayers] : newLayers;

                    return newLayers;
                };

                // STAB-10: Execute smooth transition
                await this.journeyTransitionManager.transition(oldLayers, loadNewLayersCallback);

                dlog(`🎨 Visual layers transitioned: ${this.visualLayers.length} active`);
            } else {
                // Original abrupt transition (for initial load or when transitions disabled)
                this.clearVisualLayers();

                // Create core layers (always present)
                await this.createCoreLayers(trackConfig, true, requestId);

                if (this.isTrackRequestStale(requestId)) {
                    return;
                }

                // MIG-02: Adapt Phase 4.2 journey format
                if (trackConfig) {
                    const visualConfig = {
                        flows: [],
                        structures: []
                    };
                    const seenFlowTypes = new Set();
                    const seenStructureTypes = new Set();

                    const isTrack5 =
                        trackConfig?.meta?.slug === 'nao-querer-nada' ||
                        trackConfig?.meta?.track === 5;

                    const track5AllowedFlows = new Set(['void_dust', 'cold_haze', 'ink_tendrils']);
                    const track5AllowedStructures = new Set([
                        'track5_hero_model',
                        'void_sphere',
                        // Track 5 setpiece prototypes (Phase 6)
                        'void_veil',
                        'void_compression_ring',
                        'void_eclipse_disc',
                        'void_halo',
                        'drifting_wireframes'
                    ]);

                    const allowFlow = (flow) => {
                        if (!flow) return false;
                        if (!isTrack5) return true;
                        return track5AllowedFlows.has(flow.type);
                    };

                    const allowStructure = (structure) => {
                        if (!structure) return false;
                        if (!isTrack5) return true;
                        return track5AllowedStructures.has(structure.type);
                    };
                    const addFlow = (flow) => {
                        if (!allowFlow(flow)) return;
                        const type = flow.type;
                        if (!type || seenFlowTypes.has(type)) return;
                        seenFlowTypes.add(type);
                        visualConfig.flows.push(flow);
                    };
                    const addStructure = (structure) => {
                        if (!allowStructure(structure)) return;
                        const type = structure.type;
                        if (!type || seenStructureTypes.has(type)) return;
                        seenStructureTypes.add(type);
                        visualConfig.structures.push(structure);
                    };

                    // FLOWS
                    if (trackConfig.flow && allowFlow(trackConfig.flow)) {
                        addFlow(trackConfig.flow);
                        dlog?.(`[loadVisualLayers:fallback] Added flow: ${trackConfig.flow.type}`);
                    }

                    if (trackConfig.flowElements && Array.isArray(trackConfig.flowElements)) {
                        trackConfig.flowElements.forEach((flow) => {
                            addFlow(flow);
                        });
                        dlog?.(
                            `[loadVisualLayers:fallback] Added ${visualConfig.flows.length} filtered flow elements`
                        );
                    }

                    // STRUCTURES
                    if (trackConfig.structure) {
                        if (trackConfig.structure.elements && Array.isArray(trackConfig.structure.elements)) {
                            trackConfig.structure.elements.forEach((s) => {
                                addStructure(s);
                            });
                        } else if (trackConfig.structure.type && allowStructure(trackConfig.structure)) {
                            addStructure(trackConfig.structure);
                        }
                    }

                    // Also support top-level structureElements array (alternative schema)
                    if (trackConfig.structureElements && Array.isArray(trackConfig.structureElements)) {
                        trackConfig.structureElements.forEach((s) => {
                            addStructure(s);
                        });
                        dlog(`[loadVisualLayers] Added ${visualConfig.structures.length} structure elements`);
                    }

                    if (visualConfig.flows.length > 0 || visualConfig.structures.length > 0) {
                        await this.createTrackLayers(visualConfig, true, requestId);
                    } else {
                        dwarn('[loadVisualLayers] No flows or structures to create');
                    }
                }

                dlog(`🎨 Visual layers loaded: ${this.visualLayers.length} active`);
            }

            // CAMERA-TIMING-FIX: Apply camera mode BEFORE initializing JourneyController
            // This ensures early spline moments use correct camera physics
            if (trackConfig && trackConfig.config && trackConfig.config.camera_mode) {
                if (this.isTrackRequestStale(requestId)) {
                    return;
                }
                const cameraLayer = this.activeVisualizers?.get('camera');
                if (cameraLayer && cameraLayer.setMode) {
                    cameraLayer.setMode(trackConfig.config.camera_mode);
                    if (window.SONOITE_DEBUG) {
                        dlog(`[CAMERA-TIMING-FIX] Camera mode set BEFORE controller: ${trackConfig.config.camera_mode}`);
                    }
                }
            }

            // 01-02: Auto-apply track personality if available
            // Each track has a defined camera personality with mode, behavior, and params
            if (trackConfig && trackConfig.slug) {
                if (this.isTrackRequestStale(requestId)) {
                    return;
                }
                const cameraLayer = this.activeVisualizers?.get('camera');
                if (cameraLayer && cameraLayer.setPersonality && cameraLayer.personalities?.[trackConfig.slug]) {
                    cameraLayer.setPersonality(trackConfig.slug);

                    // Fix #4: Respect reduced-motion - dampen shake/noise after personality applied
                    if (window.SONOITE_REDUCED_MOTION && cameraLayer.activePersonality) {
                        const p = cameraLayer.activePersonality;
                        // Reduce motion-inducing properties to minimal values
                        p.handheldNoise = Math.min(p.handheldNoise || 0, 0.002);
                        p.shakeBass = Math.min(p.shakeBass || 0, 0.05);
                        p.fovKickPunch = Math.min(p.fovKickPunch || 0, 0.5);
                        p.fovBreathAmp = Math.min(p.fovBreathAmp || 0, 0.5);
                        if (window.SONOITE_DEBUG) {
                            dlog(`[01-02] Reduced-motion: dampened camera shake/noise for ${trackConfig.slug}`);
                        }
                    }

                    if (window.SONOITE_DEBUG) {
                        dlog(`[01-02] Camera personality auto-applied: ${trackConfig.slug}`);
                    }
                }
            }

            // JNY-WIRE-01: Instantiate JourneyController after layers are mounted
            if (this.isTrackRequestStale(requestId)) {
                return;
            }
            this.initializeJourneyController(trackConfig);

            // Task 4: Apply per-track post-processing preset
            if (this.postProcessing && trackConfig && trackConfig.post) {
                this.postProcessing.applyTrackPreset(trackConfig.post);
            }

            // P5-VOID: Apply skybox config (e.g., ambientParticles: 0 for Track 5)
            if (trackConfig && trackConfig.skybox) {
                const skybox = this.activeVisualizers?.get('skybox');
                if (skybox && typeof skybox.applyJourneyConfig === 'function') {
                    skybox.applyJourneyConfig(trackConfig.skybox);
                    if (window.SONOITE_DEBUG) {
                        dlog(`[P5-VOID] Skybox config applied:`, trackConfig.skybox);
                    }
                }
            } else {
                // No skybox config = show particles (default behavior)
                const skybox = this.activeVisualizers?.get('skybox');
                if (skybox && typeof skybox.setAmbientParticlesVisible === 'function') {
                    skybox.setAmbientParticlesVisible(true);
                }
            }

            // MP3-PALETTE: Update core-layer palette without recreating core layers.
            if (trackConfig && trackConfig.palette) {
                const skybox = this.activeVisualizers?.get('skybox');
                if (skybox && typeof skybox.applyPalette === 'function') {
                    skybox.applyPalette(trackConfig.palette);
                }

                const lighting = this.activeVisualizers?.get('lighting');
                if (lighting && typeof lighting.applyPalette === 'function') {
                    lighting.applyPalette(trackConfig.palette);
                }
            }

            // Remove stale groups that may have been mounted by superseded async loads.
            this.pruneOrphanSceneGroups();

        } catch (error) {
            derr('Failed to load visual layers:', error);
        }
    }

    /**
     * Create core visual layers using registry
     * MP3-PALETTE: Accepts optional palette configuration from journey JSON
     * MP9: Supports consciousness.enabled to add ConsciousnessCore
     * STAB-10: Returns layers array for transition system
     * @param {Object} config - Optional configuration including palette and consciousness
     * @param {boolean} addToArray - If true, adds to this.visualLayers (default: true)
     * @returns {Array} Created layers
     */
    async createCoreLayers(config = {}, addToArray = true, requestId = this.trackLoadToken) {
        const createdLayers = [];

        try {
            const coreLayerNames = ['AudioReactiveSkybox', 'LightField', 'CameraManager'];
            const layerMap = {
                'AudioReactiveSkybox': 'skybox',
                'LightField': 'lighting',
                'CameraManager': 'camera',
                'ConsciousnessCore': 'consciousness_core'
            };

            // MP9: Add ConsciousnessCore if enabled in journey
            if (config.consciousness?.enabled) {
                coreLayerNames.push('ConsciousnessCore');
                if (window.SONOITE_DEBUG) {
                    dlog(`[MP9] ConsciousnessCore enabled for this journey`);
                }
            }

            // MP3-PALETTE: Extract palette from journey config
            const palette = config.palette || null;
            if (palette && window.SONOITE_DEBUG) {
                dlog(`[MP3-PALETTE] Creating core layers with palette:`, palette);
            }

            for (const layerName of coreLayerNames) {
                if (this.isTrackRequestStale(requestId)) {
                    break;
                }

                // MP-02: Registry guard - fail fast on unknown types
                if (!visualLayerRegistry.has(layerName)) {
                    dlog(`[MP-02] Missing type: ${layerName} (core layer)`);
                    continue;
                }

                // MP3-PALETTE + MP9 + MP11: Pass palette, consciousness, and camera config to layer creation
                const layerConfig = { ...( palette ? { palette } : {}) };

                // MP9: Pass consciousness state config to ConsciousnessCore
                if (layerName === 'ConsciousnessCore' && config.consciousness) {
                    layerConfig.state = config.consciousness.state;
                    layerConfig.reactivity = config.consciousness.reactivity;
                }

                // MP11-FIX: Pass camera config to CameraManager (shake overrides, behavior)
                if (layerName === 'CameraManager' && config.camera) {
                    layerConfig.camera = config.camera;
                    if (window.SONOITE_DEBUG) {
                        dlog(`[MP11] CameraManager config:`, config.camera);
                    }
                }

                // P5-VOID: Pass skybox config to AudioReactiveSkybox (ambientParticles, etc.)
                if (layerName === 'AudioReactiveSkybox' && config.skybox) {
                    Object.assign(layerConfig, config.skybox);
                    if (window.SONOITE_DEBUG) {
                        dlog(`[P5-VOID] Skybox config:`, config.skybox);
                    }
                }

                const layer = await visualLayerRegistry.create(layerName, this.visualContext, layerConfig);
                if (layer) {
                    if (this.isTrackRequestStale(requestId)) {
                        this.cleanupStaleLayer(layer);
                        continue;
                    }

                    const wrappedLayer = visualLayerErrorBoundary.wrapLayer(layer);
                    wrappedLayer.init();

                    if (this.isTrackRequestStale(requestId)) {
                        this.cleanupStaleLayer(wrappedLayer);
                        continue;
                    }

                    createdLayers.push(wrappedLayer);

                    // CAMERA-FIX: Always update activeVisualizers for core layers
                    // JourneyController relies on activeVisualizers.get('camera') being current
                    // The addToArray flag only controls the visualLayers array
                    this.activeVisualizers.set(layerMap[layerName], wrappedLayer);

                    if (addToArray) {
                        this.visualLayers.push(wrappedLayer);
                    }
                }
            }

            dlog('🎨 Core visual layers created via registry');

        } catch (error) {
            derr('Failed to create core layers:', error);
        }

        return createdLayers;
    }

    /**
     * Create track-specific visual layers
     * STAB-10: Returns layers array for transition system
     * @param {Object} visualConfig - Configuration with flows and structures
     * @param {boolean} addToArray - If true, adds to this.visualLayers (default: true)
     * @returns {Array} Created layers
     */
    async createTrackLayers(visualConfig, addToArray = true, requestId = this.trackLoadToken) {
        const createdLayers = [];
        const flows = visualConfig.flows || [];
        const structures = visualConfig.structures || [];

        // MP-04: Log creation path start
        dlog(`[MP-04] createTrackLayers START: flows=${flows.length}, structures=${structures.length}`);
        const layersBeforeCount = this.visualLayers.length;

        try {
            // Import flow layers
            dlog(`[createTrackLayers] Processing ${flows.length} flows`);
            for (const flowConfig of flows) {
                if (this.isTrackRequestStale(requestId)) {
                    break;
                }
                dlog(`[createTrackLayers] Loading flow: ${flowConfig.type}`);
                const layer = await this.loadFlowLayer(flowConfig, addToArray, requestId);
                if (layer) createdLayers.push(layer);
            }

            // Import structure layers
            dlog(`[createTrackLayers] Processing ${structures.length} structures`);
            for (const structureConfig of structures) {
                if (this.isTrackRequestStale(requestId)) {
                    break;
                }
                dlog(`[createTrackLayers] Loading structure: ${structureConfig.type}`);
                const layer = await this.loadStructureLayer(structureConfig, addToArray, requestId);
                if (layer) createdLayers.push(layer);
            }

            // MP-04: Log creation path end
            const layersAfterCount = this.visualLayers.length;
            const layersAdded = layersAfterCount - layersBeforeCount;
            dlog(`[MP-04] createTrackLayers END: total visualLayers=${layersAfterCount} (added ${layersAdded})`);

        } catch (error) {
            derr('Failed to create track layers:', error);
        }

        return createdLayers;
    }

    /**
     * Load a flow visual layer using registry
     * STAB-10: Returns layer for transition system
     * @param {Object} config - Flow configuration
     * @param {boolean} addToArray - If true, adds to this.visualLayers (default: true)
     * @returns {Object|null} Created layer or null
     */
    async loadFlowLayer(config, addToArray = true, requestId = this.trackLoadToken) {
        const flowType = config.type;

        try {
            if (this.isTrackRequestStale(requestId)) {
                return null;
            }

            // MP-02: Registry guard - fail fast on unknown types
            if (!visualLayerRegistry.has(flowType)) {
                dlog(`[MP-02] Missing type: ${flowType} (flow layer)`);
                return null;
            }
            dlog(`[TrackLayers] Creating flow: ${flowType}`);
            const flowLayer = await visualLayerRegistry.create(flowType, this.visualContext, config);
            if (flowLayer) {
                if (this.isTrackRequestStale(requestId)) {
                    this.cleanupStaleLayer(flowLayer);
                    return null;
                }

                const wrappedLayer = visualLayerErrorBoundary.wrapLayer(flowLayer);
                dlog(`[TrackLayers] Calling init() on flow: ${flowType}`);
                try {
                    wrappedLayer.init();

                    // MP-05: Log per-layer init evidence
                    const childrenCount = wrappedLayer.group?.children?.length || 0;
                    dlog(`[MP-05] Initialized ${flowType}, children=${childrenCount}`);
                } catch (initError) {
                    derr(`[TrackLayers] Flow init() failed for ${flowType}:`, initError);
                    throw initError;
                }

                if (this.isTrackRequestStale(requestId)) {
                    this.cleanupStaleLayer(wrappedLayer);
                    return null;
                }

                if (addToArray) {
                    this.visualLayers.push(wrappedLayer);
                }
                // Always update activeVisualizers for JourneyController access
                this.activeVisualizers.set(`flow-${flowType}`, wrappedLayer);

                dlog(`[TrackLayers] Flow added to scene: ${flowType}`);
                return wrappedLayer;
            }

        } catch (error) {
            derr(`Failed to load flow layer ${flowType}:`, error);
            derr(`Error details:`, {
                name: error?.name,
                message: error?.message,
                stack: error?.stack
            });
        }

        return null;
    }

    /**
     * Load a structure visual layer using registry
     * STAB-10: Returns layer for transition system
     * @param {Object} config - Structure configuration
     * @param {boolean} addToArray - If true, adds to this.visualLayers (default: true)
     * @returns {Object|null} Created layer or null
     */
    async loadStructureLayer(config, addToArray = true, requestId = this.trackLoadToken) {
        const structureType = config.type;

        try {
            if (this.isTrackRequestStale(requestId)) {
                return null;
            }

            // MP-02: Registry guard - fail fast on unknown types
            if (!visualLayerRegistry.has(structureType)) {
                dlog(`[MP-02] Missing type: ${structureType} (structure layer)`);
                return null;
            }
            dlog(`[TrackLayers] Creating structure: ${structureType}`);
            const structureLayer = await visualLayerRegistry.create(structureType, this.visualContext, config);
            if (structureLayer) {
                if (this.isTrackRequestStale(requestId)) {
                    this.cleanupStaleLayer(structureLayer);
                    return null;
                }

                const wrappedLayer = visualLayerErrorBoundary.wrapLayer(structureLayer);
                dlog(`[TrackLayers] Calling init() on structure: ${structureType}`);
                try {
                    wrappedLayer.init();

                    // MP-05: Log per-layer init evidence
                    const childrenCount = wrappedLayer.group?.children?.length || 0;
                    dlog(`[MP-05] Initialized ${structureType}, children=${childrenCount}`);
                } catch (initError) {
                    derr(`[TrackLayers] Structure init() failed for ${structureType}:`, initError);
                    throw initError;
                }

                if (this.isTrackRequestStale(requestId)) {
                    this.cleanupStaleLayer(wrappedLayer);
                    return null;
                }

                if (addToArray) {
                    this.visualLayers.push(wrappedLayer);
                }
                // Always update activeVisualizers for JourneyController access
                this.activeVisualizers.set(`structure-${structureType}`, wrappedLayer);

                dlog(`[TrackLayers] Structure added to scene: ${structureType}`);
                return wrappedLayer;
            }

        } catch (error) {
            derr(`Failed to load structure layer ${structureType}:`, error);
            derr(`Error details:`, {
                name: error?.name,
                message: error?.message,
                stack: error?.stack
            });
        }

        return null;
    }

    /**
     * FIX-DISPOSE-01: Clear all visual layers with hardened cleanup
     */
    clearVisualLayers() {
        this.disposeTrackDirectors();

        this.visualLayers.forEach(layer => {
            if (!layer) return;

            // MEMORY-LEAK-FIX: Properly dispose geometries and materials first
            if (layer.group) {
                dispose3D(layer.group);
            }

            // Call dispose if available (layer-api.js now provides this)
            if (layer.dispose) {
                layer.dispose();
            } else if (layer.unmount) {
                // Fallback to unmount for older layers
                layer.unmount();
            }

            // FIX-DISPOSE-01: Double-check group removal from scene
            if (layer.group && this.scene) {
                if (this.scene.children.includes(layer.group)) {
                    if (window.SONOITE_DEBUG) {
                        dwarn(`[clearVisualLayers] Removing orphaned group for ${layer.name || layer.constructor?.name}`);
                    }
                    this.scene.remove(layer.group);
                }
            }

            // Clear any lingering references
            if (layer.group) {
                layer.group = null;
            }
        });

        this.visualLayers = [];
        this.activeVisualizers.clear();
        this._cachedEggCrystalLayer = null;

        // JNY-WIRE-01: Clear journey controller when clearing layers
        if (this.journeyController) {
            this.journeyController.clear();
            this.journeyController = null;
        }

        // P0-MEMORY-FIX: Clear GPU render lists to prevent memory accumulation
        // This releases internal Three.js caching that persists between frames/tracks
        if (this.renderer) {
            this.renderer.renderLists.dispose();
        }

        // Final guard in case stale async requests mounted groups outside current visualLayers.
        this.pruneOrphanSceneGroups();

        // FIX-DISPOSE-01: Debug scene children count
        if (window.SONOITE_DEBUG) {
            dlog(`[clearVisualLayers] Scene children count: ${this.scene?.children?.length || 0}`);
        }
    }

    /**
     * Dispose active directors before reconfiguring journeys/layers.
     */
    disposeTrackDirectors() {
        const directorKeys = ['track1Director', 'track5Director', 'track6Director'];

        directorKeys.forEach((key) => {
            const director = this[key];
            if (director?.dispose) {
                director.dispose();
            }
            this[key] = null;
        });
    }

    /**
     * JNY-WIRE-01: Initialize JourneyController with track triggers
     */
    initializeJourneyController(trackConfig) {
        this.disposeTrackDirectors();

        // Clear existing controller
        if (this.journeyController) {
            this.journeyController.clear();
        }

        // Get layer references - collect all flow-* and structure-* layers by type
        const flowLayers = {};
        const structureLayers = {};

        this.activeVisualizers.forEach((layer, key) => {
            if (key.startsWith('flow-')) {
                const type = key.replace('flow-', '');
                flowLayers[type] = layer;
            } else if (key.startsWith('structure-')) {
                const type = key.replace('structure-', '');
                structureLayers[type] = layer;
            }
        });

        const layerRefs = {
            flow: flowLayers,
            structure: structureLayers,
            core: {
                skybox: this.activeVisualizers.get('skybox') || null,
                lighting: this.activeVisualizers.get('lighting') || null,
                camera: this.activeVisualizers.get('camera') || null
            }
        };

        if (window.SONOITE_DEBUG) {
            dlog(`[JourneyController] Layer refs: flows=${Object.keys(flowLayers).join(',')}, structures=${Object.keys(structureLayers).join(',')}`);
        }

        // Create controller with layer references
        this.journeyController = new JourneyController(layerRefs);

        // BUG-001-FIX: Call reusable camera binding method
        this.ensureCameraBinding();

        // CINEMATIC-FIX: Track1Director is experimental and conflicts with signature-moment triggers.
        // Default OFF: use `public/assets/journeys/phase42/sonoite-enriched-moments.json` as the single source of truth.
        // Enable for R&D only via `?t1director=1` or `window.SONOITE_T1_DIRECTOR = true`.
        const trackSlug = trackConfig?.meta?.slug || '';
        const urlParams = new URLSearchParams(window.location.search);
        const enableT1Director = urlParams.get('t1director') === '1' ||
            window.SONOITE_T1_DIRECTOR === true ||
            window.SONOITE_DIRECTOR_ENABLED === true;

        if (trackSlug === 'sonoite' && enableT1Director) {
            this.track1Director = new Track1Director({
                experience: this,
                journeyController: this.journeyController,
                postProcessing: this.postProcessing,
                cameraManager: this.activeVisualizers.get('camera')
            });
            if (window.SONOITE_DEBUG) {
                dlog('[CINEMATIC-FIX] Track1Director initialized for Sonoite journey');
            }
        } else {
            this.track1Director = null;
        }

        // TRACK5-FIX: Initialize Track5VoidDirector for "Não Querer Nada" journey
        if (trackSlug === 'nao-querer-nada' || window.TRACK5_DIRECTOR_ENABLED) {
            this.track5Director = new Track5VoidDirector({
                experience: this,
                journeyController: this.journeyController,
                postProcessing: this.postProcessing, // FIX: was postProcessingConfig (undefined)
                cameraManager: this.activeVisualizers.get('camera'),
                // AUDIT-FIX: Enable dormant Director features (were all false by default)
                keyMomentsEnabled: true,
                useDirectorPostProcessing: false, // enriched moments author 13+ post actions; phase targets would fight them
                useDirectorEclipseTrigger: true
                // useDirectorCameraSplines stays false -- enriched moments author the splines
            });
            if (window.SONOITE_DEBUG) {
                dlog('[TRACK5-FIX] Track5VoidDirector initialized for Não Querer Nada journey');
            }
        } else {
            this.track5Director = null;
        }

        // TRACK6-FIX: Initialize Track6Director for "O Filho" journey
        if (trackSlug === 'o-filho' || window.TRACK6_DIRECTOR_ENABLED) {
            this.track6Director = new Track6Director({
                experience: this,
                journeyController: this.journeyController,
                postProcessing: this.postProcessing,
                cameraManager: this.activeVisualizers.get('camera')
            });
            if (window.SONOITE_DEBUG) {
                dlog('[TRACK6-FIX] Track6Director initialized for O Filho journey');
            }
        } else {
            this.track6Director = null;
        }

        // DIRECTORS-CUT: Store the full journey object
        this.journeyController.currentJourney = trackConfig;

        // Load triggers from track config
        if (trackConfig && trackConfig.moments) {
            const trackDuration = this.audioManager?.duration || 0;
            this.journeyController.addTriggers(trackConfig.moments, trackDuration);

            if (window.SONOITE_DEBUG) {
                dlog(`🎯 Journey triggers loaded: ${trackConfig.moments.length} moments`);
            }
        }
    }

    /**
     * BUG-001-FIX: Ensure camera is bound to JourneyController
     * The activeVisualizers.get('camera') may return null during layerRefs build.
     * This late-binding ensures camera spline moments can execute.
     * Can be called multiple times safely.
     */
    ensureCameraBinding() {
        if (!this.journeyController) {
            if (window.SONOITE_DEBUG) {
                dlog('[BUG-001-FIX] JourneyController not yet created');
            }
            return;
        }

        const cameraRef = this.activeVisualizers.get('camera');
        if (!cameraRef) {
            derr('[BUG-001-FIX] Camera not found in activeVisualizers');
            return;
        }

        // Ensure core object exists
        if (!this.journeyController.layers.core) {
            this.journeyController.layers.core = {};
        }

        // Bind camera if not already bound
        if (!this.journeyController.layers.core.camera) {
            this.journeyController.layers.core.camera = cameraRef;
            if (window.SONOITE_DEBUG) {
                dlog('[BUG-001-FIX] Camera late-bound to JourneyController');
            }
        }

        // Verify binding
        const bound = this.journeyController.layers.core.camera;
        if (!bound || typeof bound.startSplinePath !== 'function') {
            derr('[BUG-001-FIX] Camera binding failed or missing startSplinePath method');
        } else if (window.SONOITE_DEBUG) {
            dlog('[BUG-001-FIX] Camera binding verified: startSplinePath available');
        }
    }

    /**
     * AUDIT-FIX: Layer registry getter for dynamic layer resolution
     * Prevents stale references by always returning current activeVisualizers state.
     * Used by JourneyController.getLayer() for runtime layer lookup.
     */
    get layerRegistry() {
        return {
            get: (name) => {
                // Try exact match first
                if (this.activeVisualizers.has(name)) {
                    return this.activeVisualizers.get(name);
                }
                // Try with common prefixes
                const prefixes = ['structure.', 'flow.', 'core.'];
                for (const prefix of prefixes) {
                    if (this.activeVisualizers.has(prefix + name)) {
                        return this.activeVisualizers.get(prefix + name);
                    }
                }
                // Search by layer type
                for (const [key, layer] of this.activeVisualizers) {
                    if (layer?.type === name || key.endsWith('.' + name)) {
                        return layer;
                    }
                }
                return null;
            },
            has: (name) => this.layerRegistry.get(name) !== null,
            keys: () => Array.from(this.activeVisualizers.keys()),
            values: () => Array.from(this.activeVisualizers.values())
        };
    }

    /**
     * Update all visual layers
     * P0-FIX: Per-layer try/catch to isolate failures and prevent error spam
     */
    updateVisualLayers(dt, audioData, currentTime = null) {
        this.visualLayers.forEach(layer => {
            if (layer && layer.update && layer.isActive && layer.isActive()) {
                try {
                    layer.update(dt, audioData);
                } catch (error) {
                    // P0-FIX: Log once per layer, not every frame
                    const layerName = layer.name || layer.constructor?.name || 'unknown';
                    if (!layer._errorLogged) {
                        derr(`Visual layer "${layerName}" update failed:`, error);
                        layer._errorLogged = true;
                    }
                }
            }
        });

        // JNY-WIRE-01: Update journey controller with current playback time
        if (this.journeyController && this.audioManager) {
            try {
                const playbackTime = Number.isFinite(currentTime) ? currentTime : this.audioManager.getCurrentTime();
                this.journeyController.update(playbackTime, audioData);
            } catch (error) {
                // P0-FIX: Enhanced error logging with full context
                if (!this._journeyControllerErrorLogged) {
                    const errorInfo = {
                        message: error?.message || String(error) || 'Unknown error',
                        stack: error?.stack || 'No stack trace',
                        name: error?.name || 'Unknown',
                        type: typeof error,
                        currentTime: Number.isFinite(currentTime) ? currentTime : (this.audioManager?.getCurrentTime?.() ?? 'N/A'),
                        triggersCount: this.journeyController?.triggers?.length ?? 0,
                        audioDataPresent: !!audioData
                    };
                    derr('[JourneyController] Update failed:', errorInfo);
                    this._journeyControllerErrorLogged = true;
                }
            }
        }

        // P1.1-FIX: Wire god rays and bloom audio reactivity
        if (this.postProcessing && audioData && this.audioManager?.isPlaying) {
            const bass = Number.isFinite(audioData.bassLevel) ? audioData.bassLevel : (Number.isFinite(audioData.bass) ? audioData.bass : 0);
            const mid = Number.isFinite(audioData.midLevel) ? audioData.midLevel : (Number.isFinite(audioData.mid) ? audioData.mid : 0);
            const loudness = Number.isFinite(audioData.loudness) ? audioData.loudness : (Number.isFinite(audioData.volume) ? audioData.volume : 0);

            // God rays pulse with bass and loudness
            if (typeof this.postProcessing.setGodRaysFromAudio === 'function') {
                this.postProcessing.setGodRaysFromAudio(bass, loudness);
            }

            // Bloom reacts to bass/mids; kick adds short, designed accents
            if (typeof this.postProcessing.setBloomFromAudio === 'function') {
                const kickIntensity = audioData.beat?.kick
                    ? (Number.isFinite(audioData.beat.kickIntensity) ? audioData.beat.kickIntensity : 0.25)
                    : 0;
                this.postProcessing.setBloomFromAudio(bass, mid, kickIntensity);
            }

            // Depth fog "breath" (subtle, long-decay)
            if (typeof this.postProcessing.setFogFromAudio === 'function') {
                this.postProcessing.setFogFromAudio(bass, mid, loudness);
            }
        }

        // P1-FIX: Track god rays position to egg_crystal (every frame for smooth tracking)
        // P1-PERF-FIX: Reuse pre-allocated vectors to avoid GC pressure
        const shouldTrackGodRays = !!this.postProcessing?.effects?.godRays || !!this.postProcessing?.godRaysPass?.enabled;
        if (shouldTrackGodRays && this.postProcessing && typeof this.postProcessing.updateGodRaysLightPosition === 'function') {
            if (!this._cachedEggCrystalLayer || !this._cachedEggCrystalLayer.group) {
                this._cachedEggCrystalLayer = this.visualLayers?.find((layer) =>
                    layer?.type === 'egg_crystal' || layer?.name === 'egg_crystal'
                ) || null;
            }
            const eggCrystal = this._cachedEggCrystalLayer;
            if (eggCrystal?.group) {
                // Project egg_crystal world position to screen coordinates (0-1)
                eggCrystal.group.getWorldPosition(this._godRaysWorldPos);

                // Project to normalized device coordinates (-1 to 1)
                this._godRaysWorldPos.project(this.camera);

                // Convert to screen UV (0-1, with 0,0 at bottom-left for shader)
                this._godRaysScreenUV.set(
                    (this._godRaysWorldPos.x + 1) / 2,
                    (this._godRaysWorldPos.y + 1) / 2
                );

                this.postProcessing.updateGodRaysLightPosition(this._godRaysScreenUV);
            }
        }
    }

    /**
     * Smooth audio data for accessibility
     */
    smoothAudioDataForAccessibility(audioData) {
        if (!this.lastSmoothAudioData) {
            this.lastSmoothAudioData = { ...audioData };
            return audioData;
        }

        const smoothingFactor = 0.7; // Heavy smoothing for accessibility
        const smoothed = {};

        Object.keys(audioData).forEach(key => {
            if (typeof audioData[key] === 'number') {
                smoothed[key] = this.lastSmoothAudioData[key] * smoothingFactor +
                              audioData[key] * (1 - smoothingFactor);
            } else {
                smoothed[key] = audioData[key];
            }
        });

        this.lastSmoothAudioData = smoothed;
        return smoothed;
    }

    /**
     * Get visualizer type based on track title
     */
    getVisualizerType(title) {
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes('lua') || titleLower.includes('moon')) return 'moon';
        if (titleLower.includes('paralisia') || titleLower.includes('sono')) return 'shadows';
        if (titleLower.includes('páginas') || titleLower.includes('azuis')) return 'pages';
        if (titleLower.includes('horas') || titleLower.includes('mortas')) return 'clocks';
        if (titleLower.includes('querer') || titleLower.includes('nada')) return 'void';
        if (titleLower.includes('filho')) return 'silhouette';
        if (titleLower.includes('homem') || titleLower.includes('educado')) return 'geometry';
        
        return 'default';
    }
    
    /**
     * Get visualizer parameters based on track
     */
    getVisualizerParams(track) {
        const params = {
            size: 2,
            count: 5,
            opacity: 0.8,
            glow: true,
            drift: true,
            melting: true,
            dissolve: true,
            duality: true,
            order: true,
            complexity: 5,
            particles: 1000
        };
        
        // Customize params based on track title
        const titleLower = track.title.toLowerCase();
        if (titleLower.includes('paralisia')) {
            params.count = 7;
            params.opacity = 0.4;
        }
        
        return params;
    }
    
    /**
     * Setup abstract consciousness system
     */
    setupAbstractConsciousness() {
        // RE-ENABLED for idle state only - will hide when tracks play
        if (window.SONOITE_DEBUG) {
            dlog('[ThreeExperience] Setting up Abstract consciousness for idle state');
        }
        
        try {
            // Initialize abstract consciousness system
            this.abstractConsciousness = new AbstractConsciousness(
                this.scene,
                this.audioManager,
                this.camera
            );
            
            // Initialize track metamorphosis system
            this.trackMetamorphosis = new TrackMetamorphosis(this.abstractConsciousness);
            
            // Keep it ACTIVE for idle state (not deactivated)
            // this.abstractConsciousness.deactivate(); // Don't deactivate!
            
            dlog('Abstract consciousness system initialized and active for idle');
        } catch (error) {
            derr('Failed to initialize abstract consciousness system:', error);
            // Continue without abstract consciousness if it fails
            this.abstractConsciousness = null;
            this.trackMetamorphosis = null;
        }
    }
    
    /**
     * Setup consciousness system
     */
    setupConsciousnessSystem() {
        try {
            // Initialize consciousness system
            this.consciousnessSystem = new ConsciousnessSystem(
                this.scene,
                this.camera,
                this.audioManager,
                this // Pass this experience instance for integration
            );

            // Integrate consciousness system with this experience
            this.consciousnessSystem.integrateWithExistingExperience(this);

            dlog('Consciousness system integrated successfully');
            
            // Force consciousness shapes to be visible and positioned
            setTimeout(() => {
                // Skip forcing visibility if using Visual Layer API
                if (this.consciousnessSystem && this.consciousnessSystem.useVisualLayerAPI) {
                    dlog('⚡ Skipping consciousness visibility forcing - Visual Layer API is active');
                    return;
                }
                
                // Remove test mesh now that we're focusing on consciousness shapes
                if (this.testMesh) {
                    this.scene.remove(this.testMesh);
                    this.testMesh.geometry.dispose();
                    this.testMesh.material.dispose();
                    this.testMesh = null;
                }
                
                if (this.consciousnessSystem.flowConsciousness && this.consciousnessSystem.flowConsciousness.flowGroup) {
                    this.consciousnessSystem.flowConsciousness.flowGroup.visible = true;
                    // Position closer to camera
                    this.consciousnessSystem.flowConsciousness.flowGroup.position.set(-3, 0, 0);
                    this.consciousnessSystem.flowConsciousness.flowGroup.scale.set(1, 1, 1);
                    this.consciousnessSystem.flowConsciousness.setInfluence(1.0);
                    dlog('🌊 Flow consciousness forced visible at:', this.consciousnessSystem.flowConsciousness.flowGroup.position);
                    dlog('🌊 Flow group children:', this.consciousnessSystem.flowConsciousness.flowGroup.children.length);
                    
                    // Make flow shapes more visible
                    this.consciousnessSystem.flowConsciousness.flowGroup.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.opacity = 1.0;
                            child.material.emissive = new THREE.Color(0x2244ff);
                            child.material.emissiveIntensity = 0.5;
                            child.visible = true;
                            dlog('🌊 Updated flow mesh:', child.geometry.type);
                        }
                    });
                }
                
                if (this.consciousnessSystem.structureConsciousness && this.consciousnessSystem.structureConsciousness.structureGroup) {
                    this.consciousnessSystem.structureConsciousness.structureGroup.visible = true;
                    // Position closer to camera
                    this.consciousnessSystem.structureConsciousness.structureGroup.position.set(3, 0, 0);
                    this.consciousnessSystem.structureConsciousness.structureGroup.scale.set(1, 1, 1);
                    this.consciousnessSystem.structureConsciousness.setInfluence(1.0);
                    dlog('📐 Structure consciousness forced visible at:', this.consciousnessSystem.structureConsciousness.structureGroup.position);
                    dlog('📐 Structure group children:', this.consciousnessSystem.structureConsciousness.structureGroup.children.length);
                    
                    // Make structure shapes more visible
                    this.consciousnessSystem.structureConsciousness.structureGroup.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.opacity = 1.0;
                            child.material.emissive = new THREE.Color(0xff2244);
                            child.material.emissiveIntensity = 0.5;
                            child.visible = true;
                            dlog('📐 Updated structure mesh:', child.geometry.type);
                        }
                    });
                }

                // STAB-04: Removed duplicate consciousness light
                // The consciousness-core.js module (wrapped by ConsciousnessCore layer)
                // already creates its own PointLight (0.8, 10) + AmbientLight (0.3)
                // This duplicate PointLight (0.1, 20) was redundant
            }, 1000);
        } catch (error) {
            derr('Consciousness system integration failed:', error);
            dlog('Continuing with basic experience...');
            this.consciousnessEnabled = false;
        }
    }
    
    /**
     * Toggle consciousness system
     */
    toggleConsciousness() {
        this.consciousnessEnabled = !this.consciousnessEnabled;

        if (this.consciousnessSystem) {
            this.consciousnessSystem.isEnabled = this.consciousnessEnabled;
        }

        const state = this.consciousnessEnabled ? 'enabled' : 'disabled';
        dlog(`Consciousness system ${state}`);

        // Announce to screen reader
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.style.position = 'absolute';
        announcement.style.left = '-9999px';
        announcement.textContent = `Consciousness visualization ${state}`;
        document.body.appendChild(announcement);

        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }
    
    /**
     * Toggle between traditional visualizers and abstract consciousness
     */
    toggleAbstractMode() {
        if (!this.abstractConsciousness) return;
        
        this.isAbstractMode = !this.isAbstractMode;
        
        if (this.isAbstractMode) {
            // Switch to abstract consciousness mode
            // Consciousness system handles visualization
            
            this.abstractConsciousness.activate();
            
            // Start metamorphosis for current track
            const currentTrack = this.tracks[this.currentTrackIndex];
            if (currentTrack) {
                const trackKey = this.getTrackKey(currentTrack.title);
                this.trackMetamorphosis.executeMetamorphosis(null, trackKey, 'entry', 3000);
            }
            
            dlog('Switched to abstract consciousness mode');
        } else {
            // Switch back to traditional visualizers
            this.abstractConsciousness.deactivate();
            
            // Consciousness system handles visualization
            
            dlog('Switched to traditional visualizer mode');
        }
        
        // Update UI to reflect mode change
        this.updateModeToggleUI();
    }
    
    /**
     * Get Portuguese track key from title
     */
    getTrackKey(title) {
        const trackMappings = {
            'lua': 'lua',
            'paralisia do sono': 'paralisia_do_sono',
            'páginas azuis': 'paginas_azuis',
            'horas mortas': 'horas_mortas',
            'vazio': 'vazio',
            'silhueta': 'silhueta',
            'geração': 'geracao'
        };
        
        const lowerTitle = title.toLowerCase();
        for (const [key, value] of Object.entries(trackMappings)) {
            if (lowerTitle.includes(key)) {
                return value;
            }
        }
        
        // Default fallback
        return 'lua';
    }
    
    /**
     * Update mode toggle UI
     */
    updateModeToggleUI() {
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.textContent = this.isAbstractMode ? 'Traditional Mode' : 'Abstract Mode';
            modeToggle.classList.toggle('abstract-active', this.isAbstractMode);
        }
    }
    
    /**
     * Create ambient scene elements
     */
    createAmbientScene() {
        // Lighting is now handled by the LightField visual layer
        // This prevents duplicate lights in the scene

        // Store references to lights created by LightField for backward compatibility
        const lightField = this.activeVisualizers?.get('lighting');
        if (lightField) {
            this.ambientLight = lightField.ambientLight;
            this.directionalLight = lightField.directionalLight;
        }

        // Fabric background (inspired by album cover)
        // this.createFabricBackground(); // Disabled - causing dark square artifact

        // Particle system
        // this.createParticleSystem(); // Disabled - too bright
    }
    
    /**
     * Create fabric background
     */
    createFabricBackground() {
        const fabricGeometry = new THREE.PlaneGeometry(30, 30, 32, 32);
        const fabricMaterial = new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        this.fabricMesh = new THREE.Mesh(fabricGeometry, fabricMaterial);
        this.fabricMesh.position.z = -15;
        // this.scene.add(this.fabricMesh); // Disabled - causing dark square artifact
        
        // Store original vertices for animation
        this.fabricVertices = fabricGeometry.attributes.position.array;
    }
    
    /**
     * Create particle system
     */
    createParticleSystem() {
        const particleCount = this.isMobile ? 200 : 500;
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 40;
            positions[i + 1] = (Math.random() - 0.5) * 40;
            positions[i + 2] = (Math.random() - 0.5) * 40;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particles);
    }
    
    /**
     * Setup event listeners
     * P1-FIX: Uses AbortController signal for centralized cleanup
     */
    setupEventListeners() {
        const signal = this.eventAbortController.signal;

        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), { signal });

        // Mouse movement
        window.addEventListener('mousemove', this.onMouseMove.bind(this), { signal });

        // Keyboard controls
        window.addEventListener('keydown', this.onKeyDown.bind(this), { signal });

        // Touch events for mobile
        if (this.isMobile) {
            window.addEventListener('touchstart', this.onTouchStart.bind(this), { signal });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { signal });
        }

        // MP-IDLE-03: Handle first user gesture (one-time)
        const firstGestureHandler = () => {
            this.handleFirstGesture();
            // Remove listeners after first gesture
            window.removeEventListener('click', firstGestureHandler);
            window.removeEventListener('touchstart', firstGestureHandler);
            window.removeEventListener('keydown', firstGestureHandler);
        };
        window.addEventListener('click', firstGestureHandler, { once: false, signal }); // Manual removal for compatibility
        window.addEventListener('touchstart', firstGestureHandler, { once: false, signal });
        window.addEventListener('keydown', firstGestureHandler, { once: false, signal });

        // Visibility API for performance
        document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this), { signal });

        // MP-Perf-03: Quality degradation event handlers
        window.addEventListener('qualityDegrade', (e) => {
            const level = e.detail.level;
            if (window.SONOITE_DEBUG) {
                dlog(`[MP-Perf-03] Applying degradation level ${level}`);
            }

            switch(level) {
                case 1:
                    // Disable FXAA
                    if (this.postProcessing?.fxaaPass) {
                        this.postProcessing.fxaaPass.enabled = false;
                    }
                    break;
                case 2:
                    // Disable bloom
                    if (this.postProcessing?.bloomPass) {
                        this.postProcessing.bloomPass.enabled = false;
                    }
                    break;
                case 3:
                    // Disable all post-processing
                    if (this.postProcessing) {
                        this.postProcessing.setEnabled(false);
                    }
                    break;
                case 4:
                    // Reduce particle counts (notify layers)
                    if (this.visualLayers) {
                        this.visualLayers.forEach(layer => {
                            if (layer.reduceQuality) {
                                layer.reduceQuality(0.5); // 50% reduction
                            }
                        });
                    }
                    break;
            }

            // Show notification to user
            this.showPerformanceNotice(`Graphics quality reduced to maintain ${level === 4 ? '15' : '30'} FPS`);
        }, { signal });

        window.addEventListener('qualityImprove', (e) => {
            const level = e.detail.level;
            if (window.SONOITE_DEBUG) {
                dlog(`[MP-Perf-03] Improving to level ${level}`);
            }

            // Re-enable effects in reverse order
            if (level < 4 && this.visualLayers) {
                this.visualLayers.forEach(layer => {
                    if (layer.reduceQuality) {
                        layer.reduceQuality(1.0); // Full quality
                    }
                });
            }
            if (level < 3 && this.postProcessing) {
                this.postProcessing.setEnabled(true);
            }
            if (level < 2 && this.postProcessing?.bloomPass) {
                this.postProcessing.bloomPass.enabled = true;
            }
            if (level < 1 && this.postProcessing?.fxaaPass) {
                this.postProcessing.fxaaPass.enabled = true;
            }

            this.showPerformanceNotice('Graphics quality improved');
        }, { signal });
    }
    
    /**
     * Setup UI event listeners
     */
    setupUI() {
        // Track selection
        const trackButtons = document.querySelectorAll('.track-button');
        if (window.SONOITE_DEBUG) {
            dlog('[ThreeExperience] Found track buttons:', trackButtons.length);
        }
        // BUG-FIX-DEC13: Use data-track-index attribute instead of forEach index
        trackButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const trackIndex = parseInt(button.dataset.trackIndex, 10);
                if (window.SONOITE_DEBUG) {
                    dlog('[ThreeExperience] Track button clicked, index:', trackIndex);
                }
                this.selectTrack(trackIndex);
            });
        });
        
        // Play/pause button
        const playPauseButton = document.getElementById('play-pause');
        if (playPauseButton) {
            dlog('Play/pause button found, adding listener');
            playPauseButton.addEventListener('click', async () => {
                dlog('Play/pause clicked', {
                    hasAudioManager: !!this.audioManager,
                    isPlaying: this.audioManager?.isPlaying,
                    currentTrackIndex: this.currentTrackIndex
                });
                if (this.audioManager && this.audioManager.togglePlayPause) {
                    await this.audioManager.togglePlayPause();
                } else if (this.currentTrackIndex >= 0) {
                    // If no audio is playing, start the first/current track
                    await this.selectTrack(this.currentTrackIndex);
                } else if (this.tracks.length > 0) {
                    // If no track selected, start the first one
                    await this.selectTrack(0);
                }
            });
        } else {
            derr('Play/pause button not found!');
        }
        
        // Previous track button
        const prevButton = document.getElementById('prev-track');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.playPreviousTrack();
            });
        }
        
        // Next track button
        const nextButton = document.getElementById('next-track');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.playNextTrack();
            });
        }
        
        // Volume control
        const volumeControl = document.getElementById('volume-control');
        if (volumeControl) {
            volumeControl.addEventListener('input', (e) => {
                const volume = parseFloat(e.target.value);
                if (this.audioManager) {
                    this.audioManager.setVolume(volume);
                }
            });
        }
        
        // Progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('input', async (e) => {
                if (this.audioManager && this.audioManager.duration > 0) {
                    const seekTime = (parseFloat(e.target.value) / 100) * this.audioManager.duration;
                    await this.audioManager.seekTo(seekTime);
                }
            });
        }
        
        // Remove the old interval-based time update since we're using events now
        
        // Progress bar
        const progressSlider = document.querySelector('.progress-slider');
        if (progressSlider) {
            progressSlider.addEventListener('input', async (e) => {
                const seekTime = (e.target.value / 100) * this.audioManager.duration;
                await this.audioManager.seekTo(seekTime);
            });
        }
        
        // Volume control
        const volumeSlider = document.querySelector('.volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.audioManager.setVolume(e.target.value / 100);
            });
        }
        
        // Volume mute button
        const volumeButton = document.querySelector('.volume-button');
        if (volumeButton) {
            volumeButton.addEventListener('click', () => {
                this.toggleMute();
            });
        }
        
        // Mode toggle button (Traditional vs Abstract Consciousness)
        const modeToggleButton = document.getElementById('mode-toggle');
        if (modeToggleButton) {
            modeToggleButton.addEventListener('click', () => {
                this.toggleAbstractMode();
            });
        }
    }

    /**
     * Apply track-scoped UI mode switches.
     * Track 5 suppresses chrome to preserve cinematic framing.
     */
    _applyTrackUIMode(trackSlug = '') {
        const normalized = String(trackSlug || '').trim().toLowerCase();
        const isTrack5 = normalized === 'nao-querer-nada';
        const query = new URLSearchParams(window.location.search);
        const keepUi = query.get('uikeep') === '1';
        const enableCinema = isTrack5 && !keepUi;
        const targets = [document.documentElement, document.body, document.getElementById('sonoite-experience')];

        targets.forEach((node) => {
            if (!node?.classList) return;
            node.classList.toggle('t5-cinema-frame', enableCinema);
        });
    }
    
    /**
     * Select and play track
     */
    async selectTrack(index) {
        if (window.SONOITE_DEBUG) {
            dlog('selectTrack called with index:', index);
        }
        if (index < 0 || index >= this.tracks.length) return;

        // Coalesce rapid switch requests to prevent race churn and redundant audio decoding.
        if (this.isTrackSwitching) {
            this.queuedTrackIndex = index;
            if (window.SONOITE_DEBUG) {
                dlog(`[selectTrack] Switch in progress, queued latest index: ${index}`);
            }
            return;
        }

        this.isTrackSwitching = true;
        this.queuedTrackIndex = null;

        try {
            // Increment token to invalidate any previous in-flight requests
            const requestId = ++this.trackLoadToken;

            // Immediately stop any current playback to avoid overlapping audio
            // TRACK-SWITCH-FIX: Set flag to prevent handleTrackEnd from auto-advancing
            if (this.audioManager?.isPlaying) {
                this._isManualTrackSwitch = true;
                this.audioManager.stop();
                this._isManualTrackSwitch = false;
            }

            // Update current track
            this.currentTrackIndex = index;
            const track = this.tracks[index];
            // BUG-FIX: Store track ID for handleTrackEnd auto-play
            this.currentTrackId = track.id;

            // RACE-FIX: Exit idle mode when selecting a track
            // This prevents loadIdleJourney() from overwriting track layers
            this.isIdleMode = false;
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }

            dlog('Selected track:', track);

            // Show loading state
            this.showLoadingState(true);
            this.hideErrorScreen();

            // MIG-02: Load journey configuration for this track
            let journey = null;
            let trackSlug = track.slug || track.title?.toLowerCase().replace(/\s+/g, '-');
            this._applyTrackUIMode(trackSlug);
            try {
                // Use track slug or ID to load journey
                if (window.SONOITE_DEBUG) {
                    console.log(`[DIRECTORS-CUT] Loading journey for track: ${track.title}, slug: ${trackSlug}`);
                }
                if (trackSlug) {
                    journey = await loadJourneyByTrackId(trackSlug);
                    // If a newer selectTrack call started, abort this one
                    if (requestId !== this.trackLoadToken) {
                        if (window.SONOITE_DEBUG) {
                            dlog('[selectTrack] Journey load aborted for stale request');
                        }
                        return;
                    }
                    if (window.SONOITE_DEBUG) {
                        console.log('[DIRECTORS-CUT] Journey loaded:', {
                            meta: journey?.meta,
                            config: journey?.config,
                            structure: journey?.structure,
                            flow: journey?.flow,
                            moments: journey?.moments?.length || 0
                        });
                    }
                }
            } catch (error) {
                console.error('[DIRECTORS-CUT] Journey load failed:', error);
                dwarn('[selectTrack] Journey load failed, using fallback:', error.message);
            }

            // MIG-02: Load visual layers from journey
            if (journey) {
                // Store journey for debugging and verification
                this.currentJourney = journey;

                // MP-FIX-MEM-03: Store BEFORE count for immediate delta calculation
                const beforeCount = this.scene.children.length;

                if (window.SONOITE_DEBUG) {
                    dlog(`[selectTrack] Scene children BEFORE load: ${beforeCount}`);
                }

                try {
                    await this.loadVisualLayers(journey, true, requestId);
                    if (requestId !== this.trackLoadToken) {
                        if (window.SONOITE_DEBUG) {
                            dlog('[selectTrack] Visual layer load aborted for stale request');
                        }
                        return;
                    }

                    // MIG-02: Initialize journey controller with moments
                    this.initializeJourneyController(journey);

                    // POST-01: Apply per-track post-processing preset
                    if (this.postProcessing && journey.post) {
                        this.postProcessing.applyTrackPreset(journey.post);
                    }

                    // FULL-OVERHAUL: Apply camera personality for this track
                    const trackSlugForCamera = journey.meta?.slug || trackSlug;
                    this._applyTrackUIMode(trackSlugForCamera);
                    const cameraLayer = this.activeVisualizers?.get('camera');
                    if (cameraLayer && trackSlugForCamera) {
                        // Access the inner layer if wrapped by error boundary
                        const cameraManager = cameraLayer._layer || cameraLayer;
                        if (typeof cameraManager.setPersonality === 'function') {
                            cameraManager.setPersonality(trackSlugForCamera);

                            // Connect beat detector to camera
                            if (this.beatDetector && typeof cameraManager.setBeatDetector === 'function') {
                                cameraManager.setBeatDetector(this.beatDetector);
                            }

                            if (window.SONOITE_DEBUG) {
                                dlog(`[FULL-OVERHAUL] Camera personality applied for: ${trackSlugForCamera}`);
                            }
                        }
                    }

                    // MP-FIX-MEM-03: Calculate delta against THIS switch's BEFORE count
                    if (window.SONOITE_DEBUG) {
                        const afterCount = this.scene.children.length;
                        const delta = afterCount - beforeCount;

                        dlog(`[selectTrack] Scene children AFTER load: ${afterCount} (delta: ${delta > 0 ? '+' : ''}${delta})`);

                        if (delta > 5) {
                            dwarn(`[MP-FIX-MEM-03] Scene children grew by ${delta} during this switch (potential leak)`);
                        } else if (delta > 0) {
                            console.log(`[MP-FIX-MEM-03] Scene children grew by ${delta} (expected for new layers)`);
                        } else if (delta < 0) {
                            console.log(`[MP-FIX-MEM-03] Scene children reduced by ${Math.abs(delta)} (cleanup working)`);
                        }
                    }
                } catch (error) {
                    derr('[selectTrack] Visual layer loading failed:', error);
                }
            }

            // Load and play audio
            if (track.audio_url) {
                dlog('Loading audio from:', track.audio_url);
                try {
                    const loaded = await this.audioManager.loadTrack(track.audio_url);
                    if (requestId !== this.trackLoadToken) {
                        if (window.SONOITE_DEBUG) {
                            dlog('[selectTrack] Audio load aborted for stale request');
                        }
                        return;
                    }
                    dlog('Audio loaded:', loaded);
                    if (loaded) {
                        const played = await this.audioManager.play();
                        dlog('Audio playing:', played);
                        dlog('Audio duration after load:', this.audioManager.duration);
                    } else {
                        this.showErrorScreen('We encountered an issue loading the audio experience. Please try refreshing the page.');
                    }
                } catch (error) {
                    derr('Error loading/playing audio:', error);
                    this.showErrorScreen('We encountered an issue loading the audio experience. Please try refreshing the page.');
                }
            } else {
                derr('No audio URL for track:', track);
                this.showErrorScreen('We encountered an issue loading the audio experience. Please try refreshing the page.');
            }

            // Update UI
            if (requestId !== this.trackLoadToken) {
                if (window.SONOITE_DEBUG) {
                    dlog('[selectTrack] UI update aborted for stale request');
                }
                return;
            }
            this.updateTrackInfo(track);
            this.updateActiveTrack(index);

            // Hide loading state
            if (requestId !== this.trackLoadToken) {
                if (window.SONOITE_DEBUG) {
                    dlog('[selectTrack] Loading state hide aborted for stale request');
                }
                return;
            }
            this.showLoadingState(false);

            // Update play/pause button state
            this.updatePlayPauseButton(true);
        } finally {
            this.isTrackSwitching = false;

            const queuedIndex = this.queuedTrackIndex;
            this.queuedTrackIndex = null;

            if (
                Number.isInteger(queuedIndex) &&
                queuedIndex >= 0 &&
                queuedIndex < this.tracks.length &&
                queuedIndex !== this.currentTrackIndex
            ) {
                if (window.SONOITE_DEBUG) {
                    dlog(`[selectTrack] Processing queued track index: ${queuedIndex}`);
                }
                void this.selectTrack(queuedIndex);
            }
        }
    }
    
    /**
     * Play previous track
     */
    playPreviousTrack() {
        const newIndex = Math.max(0, this.currentTrackIndex - 1);
        if (newIndex !== this.currentTrackIndex) {
            // Stop current track first
            if (this.audioManager && this.audioManager.isPlaying) {
                this.audioManager.stop();
            }
            this.selectTrack(newIndex);
        }
    }
    
    /**
     * Play next track
     */
    playNextTrack() {
        const newIndex = Math.min(this.tracks.length - 1, this.currentTrackIndex + 1);
        if (newIndex !== this.currentTrackIndex) {
            // Stop current track first
            if (this.audioManager && this.audioManager.isPlaying) {
                this.audioManager.stop();
            }
            this.selectTrack(newIndex);
        }
    }
    
    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Update play/pause button visual state
     */
    updatePlayPauseButton(isPlaying = null) {
        const playPauseButton = document.getElementById('play-pause');
        if (!playPauseButton) return;
        
        const playIcon = playPauseButton.querySelector('.play-icon');
        const pauseIcon = playPauseButton.querySelector('.pause-icon');
        
        // Use passed parameter or check audio manager state
        const playing = isPlaying !== null ? isPlaying : (this.audioManager && this.audioManager.isPlaying);
        
        if (playing) {
            // Show pause icon
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'block';
            playPauseButton.setAttribute('aria-label', 'Pause');
        } else {
            // Show play icon
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
            playPauseButton.setAttribute('aria-label', 'Play');
        }
    }
    
    /**
     * Create pulse effect when track starts
     * STAB-01: Removed test pulseMesh - visual feedback should come from Visual Layer API
     */
    createStartPulseEffect() {
        // Visual feedback now handled by visual layers
        // This method remains as a placeholder for future track-start effects
    }
    
    /**
     * Update track info display
     */
    updateTrackInfo(track) {
        // Update track title and description
        const titleElement = document.querySelector('.current-track-title');
        const descriptionElement = document.querySelector('.current-track-description');
        
        if (titleElement) {
            titleElement.textContent = track.title;
        }
        
        if (descriptionElement) {
            descriptionElement.textContent = track.excerpt || '';
        }

        // Update global accent color when track changes
        if (track.consciousness && track.consciousness.color_palette) {
            try {
                document.documentElement.style.setProperty('--accent-color', track.consciousness.color_palette);
            } catch (e) {
                // Non-fatal if accent color cannot be applied
            }
        }
    }
    
    /**
     * Update active track in UI
     */
    updateActiveTrack(index) {
        document.querySelectorAll('.track-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }
    
    
    /**
     * Update progress bar
     */
    updateProgressBar(currentTime) {
        const progressFill = document.querySelector('.progress-fill');
        const progressSlider = document.querySelector('.progress-slider');
        const currentTimeEl = document.querySelector('.current-time');
        const totalTimeEl = document.querySelector('.total-time');
        
        // Update time displays
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(currentTime);
        }
        
        if (totalTimeEl && this.audioManager.duration > 0) {
            totalTimeEl.textContent = this.formatTime(this.audioManager.duration);
        }
        
        if (this.audioManager.duration > 0) {
            const progress = (currentTime / this.audioManager.duration) * 100;
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            
            if (progressSlider && !progressSlider.dragging) {
                progressSlider.value = progress;
            }
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        const currentVolume = this.audioManager.volume;
        const newVolume = currentVolume > 0 ? 0 : 0.7;
        this.audioManager.setVolume(newVolume);
        
        const volumeSlider = document.querySelector('.volume-slider');
        if (volumeSlider) {
            volumeSlider.value = newVolume * 100;
        }
    }
    
    /**
     * Show loading state
     */
    showLoadingState(show) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show error screen overlay
     */
    showErrorScreen(message) {
        if (!this.errorScreen) return;

        if (message) {
            const errorText = this.errorScreen.querySelector('.error-content p');
            if (errorText) {
                errorText.textContent = message;
            }
        }

        this.errorScreen.classList.add('is-visible');
        this.errorScreen.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide error screen overlay
     */
    hideErrorScreen() {
        if (!this.errorScreen) return;

        this.errorScreen.classList.remove('is-visible');
        this.errorScreen.setAttribute('aria-hidden', 'true');
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        derr(message);
        // Could implement toast notifications here
    }
    
    /**
     * Event handlers
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update post-processing composer size
        if (this.postProcessing) {
            this.postProcessing.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.audioManager.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.selectTrack(Math.max(0, this.currentTrackIndex - 1));
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.selectTrack(Math.min(this.tracks.length - 1, this.currentTrackIndex + 1));
                break;
            case 'KeyA':
                event.preventDefault();
                this.toggleAbstractMode();
                break;
            case 'KeyC':
                event.preventDefault();
                this.toggleConsciousness();
                break;
        }
    }
    
    onTouchStart(event) {
        const touch = event.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onTouchMove(event) {
        const touch = event.touches[0];
        this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    onVisibilityChange() {
        if (document.hidden) {
            // Pause rendering when tab is hidden
            this.isPaused = true;
        } else {
            // Resume rendering when tab is visible
            this.isPaused = false;
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this._animateBound);

        // Skip rendering if WebGL context lost or paused
        if (this.isPaused || this.contextLost) return;

        // MP-Perf-04: Track frame breakdown
        const frameStart = performance.now();
        const shouldSkipFrame = this.frameIntervalMs > 0
            && this._lastRenderedFrameMs > 0
            && frameStart - this._lastRenderedFrameMs < this.frameIntervalMs;
        if (shouldSkipFrame) {
            return;
        }
        this._lastRenderedFrameMs = frameStart;

        const timings = {};
        const time = frameStart * 0.001;
        const rawDeltaTime = this.lastFrameTime ? (frameStart - this.lastFrameTime) / 1000 : 0;
        const deltaTime = Number.isFinite(rawDeltaTime) ? Math.min(Math.max(rawDeltaTime, 0), 0.1) : 0;
        this.lastFrameTime = frameStart;

        // Track controls update
        const controlsStart = performance.now();
        this.controls.update();
        timings.controls = performance.now() - controlsStart;

        // Smooth mouse movement
        this.mouseTarget.lerp(this.mouse, 0.05);

        // Track legacy animations
        const legacyStart = performance.now();
        this.animateFabric(time);
        this.animateParticles(time);
        timings.legacy = performance.now() - legacyStart;

        // Update Visual Layer API system
        let frameRawAudioData = null;
        const songTime = this.audioManager?.getCurrentTime?.() || 0;

        if (this.visualLayers && this.visualLayers.length > 0) {
            try {
                // Check if we should skip this frame for performance
                if (performanceOptimizer.shouldSkipFrame()) {
                    return;
                }

                // MP-AUDIO-EMA-06: Get raw audio data and compute EMA
                frameRawAudioData = this.audioManager.isPlaying ?
                    this.audioManager.getAudioAnalysis() :
                    this.audioManager.getFallbackAudioData();
                const rawAudioData = frameRawAudioData;

                // Compute smoothed EMA values
                const smoothedAudio = audioEMA.update({
                    bass: rawAudioData.bassLevel || 0,
                    mid: rawAudioData.midLevel || 0,
                    treble: rawAudioData.trebleLevel || 0,
                    loudness: rawAudioData.loudness || 0,
                    centroid: rawAudioData.meyda?.spectralCentroid || 0
                });

                // Apply accessibility modifications if needed
                let audioData = smoothedAudio;
                if (accessibilityManager.shouldLimitAudioReactivity(rawAudioData)) {
                    // Use even heavier smoothing for accessibility
                    audioData = this.smoothAudioDataForAccessibility(smoothedAudio);
                }

                // Store both raw and smoothed for journey controller
                audioData.raw = rawAudioData;

                // FULL-OVERHAUL: Update beat detector with audio data
                if (this.beatDetector) {
                    const beatState = this.beatDetector.update(audioData);
                    // Attach beat state to audioData for visual layers
                    audioData.beat = beatState;
                }

                // CINEMATIC-FIX: Update Track1Director for phase-based orchestration
                if (this.track1Director && this.audioManager.isPlaying) {
                    const directorSmoothed = this.track1Director.update(
                        deltaTime,
                        songTime,
                        {
                            bass: rawAudioData.bassLevel || 0,
                            mid: rawAudioData.midLevel || 0,
                            treble: rawAudioData.trebleLevel || 0,
                            loudness: rawAudioData.loudness || 0
                        }
                    );
                    // Optionally merge director's smoothed audio with existing
                    // (director provides its own phase-based smoothing)
                    audioData.directorPhase = this.track1Director.getCurrentPhase();
                }

                // TRACK5-FIX: Update Track5VoidDirector for phase-based orchestration
                if (this.track5Director && this.audioManager.isPlaying) {
                    // BUG-FIX-DEC13: Use audioManager.getCurrentTime() directly
                    // The previous code tried to use HTML audio element which doesn't exist
                    // (project uses Web Audio API / AudioBuffer, not <audio> element)
                    // This caused songTime to always be 0, keeping phase stuck at VOID
                    const directorSmoothed = this.track5Director.update(
                        deltaTime,
                        songTime,
                        {
                            bass: rawAudioData.bassLevel || 0,
                            mid: rawAudioData.midLevel || 0,
                            treble: rawAudioData.trebleLevel || 0,
                            loudness: rawAudioData.loudness || 0
                        }
                    );
                    audioData.voidPhase = this.track5Director.getCurrentPhase?.() || 'VOID';
                    audioData.voidPhaseName = audioData.voidPhase?.name || audioData.voidPhase;
                }

                // TRACK6-FIX: Update Track6Director for phase-based orchestration
                if (this.track6Director && this.audioManager.isPlaying) {
                    this.track6Director.update(
                        deltaTime,
                        songTime,
                        {
                            bass: rawAudioData.bassLevel || 0,
                            mid: rawAudioData.midLevel || 0,
                            treble: rawAudioData.trebleLevel || 0,
                            loudness: rawAudioData.loudness || 0
                        }
                    );
                    audioData.filhoPhase = this.track6Director.getCurrentPhase?.() || 'PRESENCE';
                }

                // Track visual layers update
                const layersStart = performance.now();
                this.updateVisualLayers(deltaTime, audioData, songTime);
                timings.visualLayers = performance.now() - layersStart;

                // Monitor system health and performance periodically
                if (Math.random() < 0.01) { // 1% chance per frame
                    const health = visualLayerErrorBoundary.getSystemHealth();
                    if (health.status === 'poor') {
                        dwarn(`🚨 Visual Layer system health: ${health.status} (${health.quarantinedCount} quarantined, ${health.recentErrors} recent errors)`);
                    }

                    const performance = performanceOptimizer.getPerformanceMetrics();
                    if (performance.performanceRating === 'poor' || performance.performanceRating === 'critical') {
                        dlog(`📊 Performance: ${performance.fps.toFixed(1)}fps (${performance.performanceRating}) - Quality: ${(performance.qualityLevel * 100).toFixed(0)}%`);
                    }
                }

            } catch (error) {
                // P0-FIX: Only log once to prevent console spam
                if (!this._animateErrorLogged) {
                    derr('Visual Layer API update failed:', error);
                    this._animateErrorLogged = true;
                }
            }
        }
        
        // Update visualizations based on current mode
        if (this.audioManager.isPlaying) {
            const rawAudioData = frameRawAudioData || this.audioManager.getAudioData();

            // MP-AUDIO-EMA-06: Use smoothed EMA values from global audioEMA
            const audioData = {
                bassLevel: audioEMA.ema.bass,
                midLevel: audioEMA.ema.mid,
                trebleLevel: audioEMA.ema.treble,
                loudness: audioEMA.ema.loudness,
                centroid: audioEMA.ema.centroid
            };

            // Process Meyda effects with clamped multipliers
            if (rawAudioData.meyda && this.directionalLight) {
                const centroid = audioData.centroid;
                const loudness = audioData.loudness;
                const chroma = rawAudioData.meyda.chroma || [];
                
                // Normalize values (already smoothed)
                const normalizedCentroid = Math.min(centroid / 4000, 1);
                const normalizedLoudness = Math.min(loudness / 30, 1);
                
                // Light intensity with clamped multiplier (max 1.5x)
                const baseIntensity = 0.4 + normalizedCentroid * 0.8;
                const pulseIntensity = baseIntensity + normalizedLoudness * 0.5; // Max 1.5x from base
                
                // Safety check before setting intensity
                if (isFinite(pulseIntensity) && !isNaN(pulseIntensity)) {
                    this.directionalLight.intensity = pulseIntensity;
                } else {
                    this.directionalLight.intensity = 0.2; // Safe fallback
                }
                
                // RAINBOW color changes based on chroma (pitch)
                if (chroma.length > 0) {
                    let dominantNote = 0;
                    let maxChromaValue = 0;
                    for (let i = 0; i < chroma.length; i++) {
                        if (chroma[i] > maxChromaValue) {
                            maxChromaValue = chroma[i];
                            dominantNote = i;
                        }
                    }
                    
                    // Full rainbow based on musical notes
                    const hue = dominantNote / 12;
                    const saturation = 0.8 + maxChromaValue * 0.2;
                    const lightness = 0.5 + normalizedLoudness * 0.3;
                    
                    this.directionalLight.color.setHSL(hue, saturation, lightness);
                    
                    // Ambient light gets complementary color
                    this.ambientLight.color.setHSL((hue + 0.5) % 1, saturation * 0.7, lightness * 0.8);
                }
                
                // Ambient intensity with clamped multiplier (max 0.8x)
                const ambientIntensity = 0.3 + normalizedLoudness * 0.5;
                this.ambientLight.intensity = ambientIntensity;
                
                // Subtle flash on loud beats (max 1.5x brightness)
                if (loudness > 28) {
                    this.directionalLight.intensity = Math.min(pulseIntensity * 1.5, 2.0);
                    this.ambientLight.intensity = Math.min(ambientIntensity * 1.3, 1.0);
                }
                
                // FOG pulsing with music
                if (this.scene.fog) {
                    // Fog density changes with loudness
                    this.scene.fog.near = 1 + (1 - normalizedLoudness) * 5;
                    this.scene.fog.far = 20 + (1 - normalizedLoudness) * 30;
                    
                    // Fog color from centroid
                    const fogHue = normalizedCentroid;
                    this.scene.fog.color.setHSL(fogHue, 0.5, 0.3 + normalizedLoudness * 0.3);
                }
                
                // BACKGROUND pulsing - with safety checks to prevent pink/red flashes
                const bgHue = Math.max(0, Math.min(1, normalizedCentroid)); // Clamp to 0-1
                const bgLightness = Math.max(0.02, Math.min(0.2, 0.05 + normalizedLoudness * 0.15)); // Keep dark
                
                // DISABLE background color changes - keep it black
                // The grey/pink issue is from this trying to change the background
                if (false) { // Disabled to prevent background color changes
                    // Only set background if values are valid
                    if (isFinite(bgHue) && isFinite(bgLightness) && !isNaN(bgHue) && !isNaN(bgLightness)) {
                        // Use very low saturation to avoid color flashes
                        // Keep background very dark, no brown/warm tones
                        const darkLightness = Math.min(0.05, bgLightness * 0.3);
                        this.scene.background = new THREE.Color().setHSL(bgHue, 0.02, darkLightness);
                    } else {
                        // Fallback to safe dark background
                        this.scene.background = new THREE.Color(0x0a0a0a);
                    }
                }
                
                // CAMERA SHAKE on loud sounds - TEMPORARILY DISABLED FOR TESTING
                // Comment out to verify if shapes are actually moving
                /*
                if (this.camera && loudness > 25) {
                    const shakeIntensity = (loudness - 25) / 5;
                    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity * 0.2;
                    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.2;
                    this.camera.rotation.z += (Math.random() - 0.5) * shakeIntensity * 0.01;
                }
                */
                
                // Global scale pulse with subtle effect (max 10%)
                const scalePulse = 1 + normalizedLoudness * 0.1;
                if (this.coreGroup) {
                    this.coreGroup.scale.setScalar(scalePulse);
                }
                
                // Debug logging (only when enabled)
                if (window.SONOITE_DEBUG && Math.random() < 0.02) {
                    dlog(`🎵 Meyda Centroid: ${centroid.toFixed(0)}Hz → Normalized: ${normalizedCentroid.toFixed(2)} → Light: ${pulseIntensity.toFixed(2)}`);
                }
            }
            
            // Log current mode periodically (only when debug enabled)
            if (window.SONOITE_DEBUG && Math.random() < 0.01) {
                dlog('🎬 ANIMATE MODE:', {
                    isAbstractMode: this.isAbstractMode,
                    hasCurrentVisualizer: !!this.currentVisualizer,
                    visualizerType: this.currentVisualizer?.type
                });
            }
            
            if (this.isAbstractMode && this.abstractConsciousness) {
                // Update abstract consciousness system
                this.abstractConsciousness.update(time, audioData);
                
                // Update track metamorphosis
                if (this.trackMetamorphosis) {
                    const metamorphosisData = this.trackMetamorphosis.update(time, audioData);
                    // Apply metamorphosis data to abstract consciousness if available
                    if (metamorphosisData) {
                        // The metamorphosis system already applies changes internally
                    }
                }
            } else {
                // Traditional mode - consciousness system shapes react to audio
                // The consciousness system update below handles all audio reactivity
            }
            
            // Add consciousness system update
            if (this.consciousnessSystem && this.consciousnessEnabled) {
                try {
                    // STAB-01: Removed rogue global override logic for yellowPurpleShapes
                    // Visual layers should handle their own reactivity through the Visual Layer API
                    // Already updated above
                    
                    // Ensure current visualizer remains visible if it should be
                    if (!this.isAbstractMode && this.currentVisualizer && this.currentVisualizer.isVisible) {
                        if (!this.currentVisualizer.group.visible) {
                            dwarn('Visualizer became invisible, restoring visibility');
                            this.currentVisualizer.group.visible = true;
                        }
                    }
                } catch (error) {
                    derr('Consciousness system update failed:', error);
                    // Don't break the main experience - just disable consciousness
                    this.consciousnessEnabled = false;
                }
            }
        }
        
        // Update post-processing time-based effects
        if (this.postProcessing) {
            this.postProcessing.update(deltaTime);
        }

        // MP-Perf-04: Track render time
        const renderStart = performance.now();

        // Render with post-processing
        if (this.postProcessing) {
            // CIN-POST + MP-TJ-Degrade-05: Auto-trim based on performance
            const metrics = performanceOptimizer.getPerformanceMetrics();

            // MP-TJ-Degrade-05: Apply auto-trim (FXAA off → bloom ×0.7 → shadows off)
            this.postProcessing.autoTrim(metrics.performanceRating);
            // MP-Perf-PRCAP: Also clamp renderer DPR on poor/critical performance.
            this._autoTrimRendererResolution(metrics.performanceRating);

            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }

        timings.render = performance.now() - renderStart;

        // MP-Perf-04: Total frame time and breakdown tracking
        timings.total = performance.now() - frameStart;
        // Feed adaptive quality with true end-to-end frame time (CPU + render/post).
        performanceOptimizer.trackFrameTime(timings.total);

        // Log slow frames
        if (timings.total > 33 && window.SONOITE_DEBUG) {
            dlog('[MP-Perf-04] Slow frame:', {
                total: timings.total.toFixed(2) + 'ms',
                controls: timings.controls.toFixed(2) + 'ms',
                layers: (timings.visualLayers || 0).toFixed(2) + 'ms',
                legacy: timings.legacy.toFixed(2) + 'ms',
                render: timings.render.toFixed(2) + 'ms'
            });
        }

        // ISS-004: Profiling telemetry (gated by SONOITE_PROFILE + active capture)
        if (window.SONOITE_PROFILE && window.__sonoiteProfile?.active) {
            this._profileIngestFrame(timings);
        }

        // Track breakdown with optimizer
        performanceOptimizer.trackFrameBreakdown(timings);
    }

    /**
     * ISS-004: Ingest profiling telemetry (low overhead when disabled)
     * @param {Object} timings
     */
    _profileIngestFrame(timings) {
        if (!window.SONOITE_PROFILE) return;

        const profile = window.__sonoiteProfile;
        if (!profile || !profile.active) return;

        const now = performance.now();
        const frameTime = Number.isFinite(timings.total) ? timings.total : null;

        // Update frame-time bucket (1s)
        if (!profile._bucket) {
            profile._bucket = {
                startMs: now,
                min: frameTime,
                max: frameTime,
                sum: frameTime || 0,
                count: frameTime === null ? 0 : 1
            };
        } else if (frameTime !== null) {
            profile._bucket.min = profile._bucket.min === null ? frameTime : Math.min(profile._bucket.min, frameTime);
            profile._bucket.max = profile._bucket.max === null ? frameTime : Math.max(profile._bucket.max, frameTime);
            profile._bucket.sum += frameTime;
            profile._bucket.count += 1;
        }

        const post = this.postProcessing;
        const composer = post?.composer || null;

        // Log-on-change: composer pixel ratio
        if (composer) {
            const pr = composer._pixelRatio;
            const cap = post?.postPixelRatioCap ?? null;
            const override = post?._composerPixelRatioCapOverride ?? null;
            if (pr !== profile._lastComposerPR || cap !== profile._lastComposerCap || override !== profile._lastComposerOverride) {
                profile.events.push({
                    type: 'composer_pr',
                    t: now,
                    pixelRatio: pr,
                    cap: cap,
                    override: override
                });
                profile._lastComposerPR = pr;
                profile._lastComposerCap = cap;
                profile._lastComposerOverride = override;
            }
        }

        // Log-on-change: enabled pass list
        if (composer?.passes) {
            const enabledPasses = composer.passes
                .filter(pass => pass?.enabled)
                .map(pass => pass?.name || pass?.constructor?.name || 'UnknownPass');
            const signature = enabledPasses.join('|');
            if (signature !== profile._lastPassSignature) {
                profile.events.push({
                    type: 'passes',
                    t: now,
                    enabledPassCount: enabledPasses.length,
                    enabledPasses
                });
                profile._lastPassSignature = signature;
            }
        }

        // Flush bucket when interval reached
        const sampleMs = Math.max(250, Number(profile.sampleMs) || 1000);
        if (profile._bucket && (now - profile._bucket.startMs >= sampleMs)) {
            const count = profile._bucket.count;
            const avg = count > 0 ? profile._bucket.sum / count : null;
            const memory = this.renderer?.info?.memory || null;
            const lastTick = profile.lastAudioAnalysisTick;
            const analysisAgeMs = Number.isFinite(lastTick) ? Math.max(0, now - lastTick) : null;

            profile.buckets.push({
                t: now,
                min: profile._bucket.min,
                avg: avg,
                max: profile._bucket.max,
                count,
                memory: memory ? {
                    geometries: memory.geometries,
                    textures: memory.textures
                } : null,
                analysisAgeMs
            });

            profile._bucket = {
                startMs: now,
                min: frameTime,
                max: frameTime,
                sum: frameTime || 0,
                count: frameTime === null ? 0 : 1
            };
        }
    }
    
    /**
     * Animate fabric background
     */
    animateFabric(time) {
        if (!this.fabricMesh) return;
        
        const positions = this.fabricMesh.geometry.attributes.position;
        const avgFreq = this.audioManager.getAverageFrequency();
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const wave = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time * 0.5);
            const audioInfluence = avgFreq * 2;
            positions.setZ(i, wave * (0.3 + audioInfluence));
        }
        
        positions.needsUpdate = true;
    }
    
    /**
     * Animate particles
     */
    animateParticles(time) {
        if (!this.particles) return;
        
        this.particles.rotation.y += 0.0005;
        this.particles.position.x = this.mouseTarget.x * 2;
        this.particles.position.y = this.mouseTarget.y * 2;
        
        // Audio-reactive particle opacity
        const avgFreq = this.audioManager.getAverageFrequency();
        this.particles.material.opacity = 0.6 + avgFreq * 0.4;
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 1000);
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        // P1-FIX: Abort all event listeners via AbortController
        if (this.eventAbortController) {
            this.eventAbortController.abort();
        }

        this.disposeTrackDirectors();

        // Dispose visualizers
        Object.values(this.visualizers).forEach(visualizer => {
            visualizer.dispose();
        });
        
        // Dispose abstract consciousness system
        if (this.abstractConsciousness) {
            this.abstractConsciousness.dispose();
        }
        
        if (this.trackMetamorphosis) {
            this.trackMetamorphosis.dispose();
        }
        
        // Dispose audio manager
        this.audioManager.dispose();
        
        // Dispose Three.js resources
        this.scene.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        this.composer.dispose();
    }

    /**
     * MP-Perf-03: Show performance notice to user
     * @param {string} message - Message to display
     */
    showPerformanceNotice(message) {
        // Simple console notice for now (can be enhanced with UI toast later)
        if (window.SONOITE_DEBUG) {
            console.log(`[Performance] ${message}`);
        }

        // Optional: Create subtle UI notification
        const notice = document.createElement('div');
        notice.className = 'performance-notice';
        notice.textContent = message;
        notice.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(notice);

        // Fade in
        requestAnimationFrame(() => {
            notice.style.opacity = '1';
        });

        // Fade out and remove after 3 seconds
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 300);
        }, 3000);
    }
}
