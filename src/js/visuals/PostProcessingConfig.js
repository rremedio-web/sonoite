/**
 * PostProcessingConfig - Phase 4.2 Visual Enhancement System
 * Implements bloom, depth-of-field, vignette, and film grain effects
 *
 * @package SonoiteTheme
 * @version 2.0.0
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// TRACK5/6-PASSES: Import custom passes for singularity lens and heat haze
import { SingularityLensShader, SingularityLensController } from './passes/SingularityLensPass.js';
import { HeatHazeShader, HeatHazeController } from './passes/HeatHazePass.js';

export class PostProcessingConfig {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // MP-Perf-02: Check for postfx preference from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const postfxParam = urlParams.get('postfx');
        const storedPref = typeof localStorage !== 'undefined' ? localStorage.getItem('sonoite_postfx') : null;

        if (postfxParam !== null) {
            this.enabled = postfxParam !== '0';
        } else if (storedPref !== null) {
            this.enabled = storedPref !== '0';
        } else {
            this.enabled = true;
        }

        if (window.SONOITE_DEBUG) {
            console.log(`[MP-Perf-02] Post-processing initial state: ${this.enabled}`);
        }

        // MP-Perf-POSTPR: Cap post-processing internal pixel ratio to avoid GPU overload on high-DPR displays.
        // Override via ?postprcap=1.0–2.0 or localStorage SONOITE_POST_PR_CAP.
        // NOTE: This intentionally decouples post FX resolution from renderer DPR.
        const postPrCapParam = urlParams.get('postprcap');
        const storedPostPrCap = typeof localStorage !== 'undefined' ? localStorage.getItem('SONOITE_POST_PR_CAP') : null;
        this.postPixelRatioCap = this._parsePixelRatioCap(postPrCapParam ?? storedPostPrCap, 1.5);
        if (postPrCapParam !== null && typeof localStorage !== 'undefined') {
            localStorage.setItem('SONOITE_POST_PR_CAP', String(this.postPixelRatioCap));
        }
        this._composerPixelRatioCapOverride = null;

        // MP-FOG-01: Initialize Depth Fog Pass toggle (default: OFF)
        // Use term "Depth Fog Pass" (not "Volumetric Fog")
        const volfogParam = urlParams.get('volfog');
        const storedVolfog = typeof localStorage !== 'undefined' ? localStorage.getItem('SONOITE_VOL_FOG') : null;

        if (volfogParam !== null) {
            window.SONOITE_VOL_FOG = volfogParam === '1';
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('SONOITE_VOL_FOG', volfogParam);
            }
        } else if (storedVolfog !== null) {
            window.SONOITE_VOL_FOG = storedVolfog === '1';
        } else {
            window.SONOITE_VOL_FOG = false; // Default OFF: cheaper baseline and less black crush; opt-in via URL/localStorage
        }

        if (window.SONOITE_DEBUG) {
            console.log(`[MP-FOG-01] Depth Fog Pass toggle: ${window.SONOITE_VOL_FOG}`);
        }

        // P6-HYBRID-SPEC: Enable Fresnel rim by default (hybrid shader spec lane)
        // Toggle via ?fresnelrim=0/1 or localStorage SONOITE_FRESNEL_RIM.
        const fresnelParam = urlParams.get('fresnelrim');
        const storedFresnel = typeof localStorage !== 'undefined' ? localStorage.getItem('SONOITE_FRESNEL_RIM') : null;
        if (fresnelParam !== null) {
            window.SONOITE_FRESNEL_RIM = fresnelParam === '1';
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('SONOITE_FRESNEL_RIM', fresnelParam);
            }
        } else if (storedFresnel !== null) {
            window.SONOITE_FRESNEL_RIM = storedFresnel === '1';
        } else if (typeof window.SONOITE_FRESNEL_RIM === 'undefined') {
            window.SONOITE_FRESNEL_RIM = true;
        }

        this.effects = {
            bloom: true,
            vignette: true,
            filmGrain: true,
            fxaa: true,
            scanlines: false,  // MP10-FIX: Add scanlines effect (off by default)
            // MP-FOG-01: Depth Fog Pass toggle (default: ON via SONOITE_VOL_FOG)
            depthFog: !!window.SONOITE_VOL_FOG,
            // God rays: OFF by default (enabled only for explicit, approved moments)
            godRays: false,
            // TRACK5-PASSES: Singularity lens for gravitational lensing (void effect)
            singularityLens: false,
            // TRACK6-PASSES: Heat haze for thermal distortion effect
            heatHaze: false
        };

        // P1-PERF: Half-resolution bloom for performance (0.5 = 50% resolution)
        // UnrealBloomPass internally handles upsampling when compositing
        this.bloomResolutionScale = 0.42;

        // Phase 4.2 aesthetic parameters - dark, nocturnal Portuguese consciousness
        this.passes = {
            // CIN-POST caps: threshold 0.2–0.4, strength 0.5–0.8, radius 0.4–0.6
            bloomStrength: 0.4,  // MP-BLOOM-01: Reduced from 0.7 to fix white glow
            bloomRadius: 0.5,
            bloomThreshold: 0.3,
            // Vignette offset 0.5–0.7, darkness ~0.6–1.0 (darkness in shader)
            // MP-VIG-FIX: Reduced darkness to prevent black screen
            vignetteStrength: 0.6,
            vignetteDarkness: 0.8,
            // Grain 0.1–0.15
            grainIntensity: 0.12,
            // MP10-FIX: Scanlines (retro CRT effect)
            scanlineIntensity: 0.08,
            scanlineCount: 800,
            // MP-FOG-02/03: Depth Fog Pass parameters
            // ATMOSPHERE-FIX: Tripled density for "vast not empty"
            fogDensity: 0.045,  // Base fog density (was 0.015)
            fogColor: new THREE.Color(0x040408),  // Dark nocturnal fog
            fogNear: 5.0,   // Start depth
            fogFar: 50.0,    // End depth
            // CINEMATIC-OVERHAUL: God rays parameters
            // Ultra-subtle, monochrome policy (user direction)
            godRaysIntensity: 0.03,
            godRaysDecay: 0.93,
            godRaysDensity: 0.85,
            godRaysWeight: 0.28,
            godRaysExposure: 0.06,
            godRaysThreshold: 0.85
        };

        // MP-POST-Presets-02: Quality presets with balanced baseline
        // MP-VIG-FIX: Reduced vignetteDarkness across all presets to prevent black screen
        // CINEMATIC-OVERHAUL: Added cinematic preset for Blade Runner/Interstellar look
        this.presets = {
            // CINEMATIC-OVERHAUL: New flagship cinematic preset - Blade Runner 2049 inspired
            cinematic: {
                bloomStrength: 0.45,    // Reduced from 0.65 to prevent white-out
                bloomRadius: 0.45,      // Reduced from 0.55 for tighter glow
                bloomThreshold: 0.35,   // Raised from 0.25 - only bright areas glow
                vignetteStrength: 0.55, // Moderate vignette
                vignetteDarkness: 0.85, // Reduced from 1.1 - preserve star visibility
                grainIntensity: 0.10,   // Subtle film grain
                scanlineIntensity: 0.0, // No scanlines for cinematic look
                godRaysEnabled: true,   // Volumetric god rays
                godRaysIntensity: 0.25, // Reduced from 0.4 for subtlety
                godRaysDecay: 0.93,     // Faster falloff
                fxaa: true
            },
            high: {
                bloomStrength: 0.55,  // Increased from 0.4 for more dramatic effect
                bloomRadius: 0.5,
                bloomThreshold: 0.3,
                vignetteStrength: 0.6,
                vignetteDarkness: 0.9,
                grainIntensity: 0.10,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            balanced: {
                bloomStrength: 0.5,
                bloomRadius: 0.45,
                bloomThreshold: 0.3,
                vignetteStrength: 0.6,
                vignetteDarkness: 0.85,
                grainIntensity: 0.08,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            noir: {
                bloomStrength: 0.4,   // Slightly increased for atmosphere
                bloomRadius: 0.45,
                bloomThreshold: 0.35,
                vignetteStrength: 0.5,
                vignetteDarkness: 1.15, // Deeper blacks for noir
                grainIntensity: 0.12,   // More grain for noir texture
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            streetlight_noir: {
                bloomStrength: 0.34,
                bloomRadius: 0.42,
                bloomThreshold: 0.38,
                vignetteStrength: 0.26,
                vignetteDarkness: 0.74,
                grainIntensity: 0.12,
                brightness: 1.12,
                warmth: 1.08,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            inheritance: {
                bloomStrength: 0.46,
                bloomRadius: 0.44,
                bloomThreshold: 0.34,
                vignetteStrength: 0.28,
                vignetteDarkness: 0.72,
                grainIntensity: 0.10,
                brightness: 1.12,
                warmth: 0.96,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            low: {
                bloomStrength: 0.35,
                bloomRadius: 0.35,
                bloomThreshold: 0.4,
                vignetteStrength: 0.65,
                vignetteDarkness: 0.7,
                grainIntensity: 0.06,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            // P1-FIX: Add missing presets for Phase 4.3 journeys (o-filho, paralisia-do-sono)
            heavy_contrast: {
                bloomStrength: 0.2,
                bloomRadius: 0.3,
                bloomThreshold: 0.5,
                vignetteStrength: 0.5,
                vignetteDarkness: 1.3,
                grainIntensity: 0.15,
                scanlineIntensity: 0.0,
                godRaysEnabled: false,
                fxaa: true
            },
            digital_decay: {
                bloomStrength: 0.3,
                bloomRadius: 0.4,
                bloomThreshold: 0.35,
                vignetteStrength: 0.55,
                vignetteDarkness: 1.0,
                grainIntensity: 0.18,
                scanlineIntensity: 0.12,
                godRaysEnabled: false,
                fxaa: false
            },
            // P5-VOID: "Não Querer Nada" - tuned for readable void silhouette
            // Brightness-lift pass: keep noir mood but recover mid-tone legibility.
            void: {
                bloomStrength: 0.52,
                bloomRadius: 0.46,
                bloomThreshold: 0.30,
                vignetteStrength: 0.08,
                vignetteDarkness: 0.34,
                grainIntensity: 0.025,
                brightness: 2.00,
                warmth: 0.84,
                scanlineIntensity: 0.0,     // No scanlines
                godRaysEnabled: false,      // No god rays (director enables for climax)
                fxaa: true                  // Keep anti-aliasing
            }
        };

        this.currentPreset = 'high';

        this.composer = null;
        this.bloomPass = null;
        this.vignettePass = null;
        this.filmGrainPass = null;
        this.scanlinePass = null;  // MP10-FIX: Scanline pass
        this.depthFogPass = null;  // MP-FOG-01: Depth Fog Pass
        this.godRaysPass = null;   // CINEMATIC-OVERHAUL: God rays pass
        // MP-FOG-DEPTH: Dedicated depth pre-pass target (prevents WebGL feedback loops)
        this.depthPrepassTarget = null;
        this.depthPrepassMaterial = null;
        this.depthPrepassDepthTexture = null;
        this.chromaticAberrationPass = null;  // GIGA-AUDIT: Chromatic aberration for climax
        this.brightnessPass = null;  // ISSUE-3-FIX: Global brightness for THE_QUIET darkness
        this.singularityLensPass = null;  // TRACK5-PASSES: Gravitational lensing
        this.singularityLensController = null;
        this.heatHazePass = null;  // TRACK6-PASSES: Heat shimmer distortion
        this.heatHazeController = null;
        this.fxaaPass = null;

        // MP-TJ-Timing-06: Per-pass timing tracking
        this.timings = {
            bloom: [],
            vignette: [],
            grain: [],
            fxaa: [],
            total: []
        };
        this.maxSamples = 10;

        // MP-TJ-Degrade-05: Track last performance rating to avoid re-applying every frame
        this.lastPerformanceRating = null;

        // MP-TJ-BlueNoise-01: Frame counter for blue noise grain
        this.grainFrameCounter = 0;

        // PHASE-TARGETS: Phase-based vignette targets (Expert Panel recommendation)
        this.phaseTargets = {
            ASCEND: { vignette: 0.25, bloom: 0.4 },
            FRACTURE: { vignette: 0.45, bloom: 0.5 },
            ECLIPSE: { vignette: 0.75, bloom: 0.3 },     // Breakdown: claustrophobic
            CLIMAX: { vignette: 0.5, bloom: 0.6 },       // Eruption (CAPPED at 0.6)
            MEMORY: { vignette: 0.95, bloom: 0.4 }       // Crush to void
        };
        this.currentPhase = 'ASCEND';
        this.vignetteTarget = 0.25;
        this.bloomTarget = 0.4;

        // BLOOM-IMPULSE: Additive bloom spike system for key moments
        this._bloomImpulse = {
            active: false,
            intensity: 0,       // Extra bloom to add
            time: 0,            // Current time in impulse
            duration: 0,        // Total duration
            baseStrength: 0     // Bloom strength before impulse
        };

        // Wire up JourneyState events if available (for real-time phase updates)
        if (typeof window !== 'undefined') {
            this._setupJourneyStateListeners();
        }

        this.init();
    }

    /**
     * PHASE-TARGETS: Listen to JourneyState for automatic phase/bloom updates
     */
    _setupJourneyStateListeners() {
        // Defer setup until JourneyState is available
        const setupListeners = () => {
            if (!window.JourneyState) return;

            // Phase change listener
            window.JourneyState.on('phase:change', (data) => {
                this.setPhase(data.to);
            });

            // Bloom impulse listener (triggered by egg shimmer, climax, etc.)
            window.JourneyState.on('post:bloom:impulse', (data) => {
                this.addBloomImpulse(data.intensity, data.decay);
            });

            // Vignette target listener
            window.JourneyState.on('post:vignette:target', (data) => {
                this.setVignetteTarget(data.value, data.duration);
            });

            if (window.SONOITE_DEBUG) {
                console.log('[PostProcessingConfig] JourneyState listeners connected');
            }
        };

        // Try immediately, or wait for DOMContentLoaded
        if (window.JourneyState) {
            setupListeners();
        } else {
            window.addEventListener('DOMContentLoaded', setupListeners, { once: true });
        }
    }

    /**
     * PHASE-TARGETS: Set current phase and update targets
     */
    setPhase(phase) {
        if (!this.phaseTargets[phase]) {
            console.warn(`[PostProcessingConfig] Unknown phase: ${phase}`);
            return;
        }

        this.currentPhase = phase;
        const targets = this.phaseTargets[phase];
        this.vignetteTarget = targets.vignette;
        this.bloomTarget = targets.bloom;

        if (window.SONOITE_DEBUG) {
            console.log(`[PostProcessingConfig] Phase: ${phase}, vignette=${targets.vignette}, bloom=${targets.bloom}`);
        }
    }

    /**
     * BLOOM-IMPULSE: Add a brief bloom spike
     * @param {number} intensity - Extra bloom to add (0.1-0.5 typical)
     * @param {number} duration - Fade duration in seconds
     */
    addBloomImpulse(intensity, duration = 0.35) {
        this._bloomImpulse.active = true;
        this._bloomImpulse.intensity = intensity;
        this._bloomImpulse.time = 0;
        this._bloomImpulse.duration = duration;
        this._bloomImpulse.baseStrength = this.bloomPass?.strength || this.passes.bloomStrength;

        if (window.SONOITE_DEBUG) {
            console.log(`[PostProcessingConfig] Bloom impulse: +${intensity.toFixed(2)} over ${duration.toFixed(2)}s`);
        }
    }

    /**
     * BLOOM-IMPULSE: Update bloom impulse each frame
     */
    _updateBloomImpulse(dt) {
        if (!this._bloomImpulse.active || !this.bloomPass) return;

        this._bloomImpulse.time += dt;
        const t = Math.min(this._bloomImpulse.time / this._bloomImpulse.duration, 1.0);
        const fade = 1.0 - t; // Linear fade

        // Apply impulse on top of base
        const impulseStrength = this._bloomImpulse.intensity * fade;
        this.bloomPass.strength = this._bloomImpulse.baseStrength + impulseStrength;

        // Deactivate when complete
        if (t >= 1.0) {
            this._bloomImpulse.active = false;
            this.bloomPass.strength = this._bloomImpulse.baseStrength;
        }
    }

    /**
     * PHASE-TARGETS: Set vignette target with smooth transition
     */
    setVignetteTarget(value, duration = 2.0) {
        this.vignetteTarget = value;
        this._vignetteTransition = {
            duration,
            startTime: performance.now()
        };
    }

    /**
     * A.2: Set bloom target with smooth transition
     * @param {number} value - Target bloom strength (0-1)
     * @param {number} duration - Transition duration in seconds
     */
    setBloomTarget(value, duration = 2.0) {
        if (!this.bloomPass) return;

        this._bloomTransition = {
            startValue: this.bloomPass.strength,
            targetValue: Math.max(0, Math.min(0.8, value)), // Cap at 0.8 per Expert Panel
            duration,
            startTime: performance.now()
        };

        if (window.SONOITE_DEBUG) {
            console.log(`[PostFX] Bloom target: ${value.toFixed(2)} over ${duration}s`);
        }
    }

    /**
     * A.2: Set brightness target with smooth transition
     * @param {number} value - Target brightness (0-2, 1.0 = normal)
     * @param {number} duration - Transition duration in seconds
     */
    setBrightnessTarget(value, duration = 2.0) {
        if (!this.brightnessPass) return;

        this._brightnessTransition = {
            startValue: this.brightnessPass.uniforms.brightness.value,
            targetValue: Math.max(0, Math.min(2, value)),
            duration,
            startTime: performance.now()
        };

        // PERF-GATE: Ensure the pass is enabled for the duration of any active transition.
        this._updateBrightnessPerfGate();

        if (window.SONOITE_DEBUG) {
            console.log(`[PostFX] Brightness target: ${value.toFixed(2)} over ${duration}s`);
        }
    }

    /**
     * A.2: Set warmth target with smooth transition
     * @param {number} value - Target warmth (0.5 = cool, 1.0 = neutral, 1.5 = warm)
     * @param {number} duration - Transition duration in seconds
     */
    setWarmthTarget(value, duration = 2.0) {
        if (!this.warmthPass) return;

        this._warmthTransition = {
            startValue: this.warmthPass.uniforms.warmth.value,
            targetValue: Math.max(0.5, Math.min(1.5, value)),
            duration,
            startTime: performance.now()
        };

        // PERF-GATE: Ensure the pass is enabled for the duration of any active transition.
        this._updateWarmthPerfGate();

        if (window.SONOITE_DEBUG) {
            const temp = value < 1.0 ? 'cool' : (value > 1.0 ? 'warm' : 'neutral');
            console.log(`[PostFX] Warmth target: ${value.toFixed(2)} (${temp}) over ${duration}s`);
        }
    }

    /**
     * A.2: Set fog color target with smooth transition
     * @param {THREE.Color|string|number} color - Target fog color
     * @param {number} duration - Transition duration in seconds
     */
    setFogColorTarget(color, duration = 2.0) {
        if (!this.depthFogPass) return;

        const targetColor = color instanceof THREE.Color ? color : new THREE.Color(color);

        this._fogColorTransition = {
            startColor: this.depthFogPass.uniforms.fogColor.value.clone(),
            targetColor: targetColor,
            duration,
            startTime: performance.now()
        };

        if (window.SONOITE_DEBUG) {
            console.log(`[PostFX] Fog color target: #${targetColor.getHexString()} over ${duration}s`);
        }
    }

    /**
     * CINEMATIC-FIX: Set fog density target with smooth transition
     * Allows choreographed fog changes (e.g., LIFT fog at climax for brightness)
     * @param {number} density - Target fog density (0.0 = no fog, 0.045 = base, 0.15 = light, 0.45 = heavy)
     * @param {number} duration - Transition duration in seconds (default 2.0)
     */
    setFogTarget(density, duration = 2.0) {
        if (!this.depthFogPass) {
            if (window.SONOITE_DEBUG) {
                console.warn('[PostProcessingConfig] setFogTarget called but depthFogPass not initialized');
            }
            return;
        }

        // Store target and transition info
        this._fogTarget = {
            density: Math.max(0, Math.min(1, density)),
            duration: duration,
            startDensity: this.depthFogPass.uniforms.fogDensity.value,
            startTime: performance.now()
        };

        if (window.SONOITE_DEBUG) {
            console.log(`[PostProcessingConfig] Fog target: ${density.toFixed(3)} over ${duration}s`);
        }
    }

    /**
     * CINEMATIC-FIX: Update fog transition each frame
     * Called from update() to smoothly transition fog density
     */
    _updateFogTransition(deltaTime) {
        if (!this._fogTarget || !this.depthFogPass) return;

        const elapsed = (performance.now() - this._fogTarget.startTime) / 1000;
        const t = Math.min(1, elapsed / this._fogTarget.duration);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - t, 3);

        const newDensity = this._fogTarget.startDensity +
            (this._fogTarget.density - this._fogTarget.startDensity) * eased;

        this.depthFogPass.uniforms.fogDensity.value = newDensity;

        // Clear target when complete
        if (t >= 1) {
            this._fogTarget = null;
        }
    }

    /**
     * A.2: Update bloom transition each frame
     */
    _updateBloomTransition() {
        if (!this._bloomTransition || !this.bloomPass) return;

        const elapsed = (performance.now() - this._bloomTransition.startTime) / 1000;
        const t = Math.min(1, elapsed / this._bloomTransition.duration);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);

        this.bloomPass.strength = this._bloomTransition.startValue +
            (this._bloomTransition.targetValue - this._bloomTransition.startValue) * eased;

        if (t >= 1) {
            this._bloomTransition = null;
        }
    }

    /**
     * A.2: Update brightness transition each frame
     */
    _updateBrightnessTransition() {
        if (!this._brightnessTransition || !this.brightnessPass) return;

        const elapsed = (performance.now() - this._brightnessTransition.startTime) / 1000;
        const t = Math.min(1, elapsed / this._brightnessTransition.duration);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);

        this.brightnessPass.uniforms.brightness.value = this._brightnessTransition.startValue +
            (this._brightnessTransition.targetValue - this._brightnessTransition.startValue) * eased;

        if (t >= 1) {
            this._brightnessTransition = null;
        }

        // PERF-GATE: Disable the pass when neutral and not transitioning.
        this._updateBrightnessPerfGate();
    }

    /**
     * A.2: Update warmth transition each frame
     */
    _updateWarmthTransition() {
        if (!this._warmthTransition || !this.warmthPass) return;

        const elapsed = (performance.now() - this._warmthTransition.startTime) / 1000;
        const t = Math.min(1, elapsed / this._warmthTransition.duration);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);

        this.warmthPass.uniforms.warmth.value = this._warmthTransition.startValue +
            (this._warmthTransition.targetValue - this._warmthTransition.startValue) * eased;

        if (t >= 1) {
            this._warmthTransition = null;
        }

        // PERF-GATE: Disable the pass when neutral and not transitioning.
        this._updateWarmthPerfGate();
    }

    /**
     * PERF-GATE: Brightness is neutral at 1.0.
     * Disable the pass entirely when neutral and not transitioning to avoid GPU cost.
     */
    _updateBrightnessPerfGate() {
        if (!this.brightnessPass?.uniforms?.brightness) return;

        const enableEps = 0.001;
        const neutral = 1.0;
        const current = Number.isFinite(this.brightnessPass.uniforms.brightness.value)
            ? this.brightnessPass.uniforms.brightness.value
            : neutral;

        const enabled = !!this._brightnessTransition || Math.abs(current - neutral) > enableEps;
        this.brightnessPass.enabled = enabled;

        if (!enabled) {
            this.brightnessPass.uniforms.brightness.value = neutral;
        }
    }

    /**
     * PERF-GATE: Warmth is neutral at 1.0.
     * Disable the pass entirely when neutral and not transitioning to avoid GPU cost.
     */
    _updateWarmthPerfGate() {
        if (!this.warmthPass?.uniforms?.warmth) return;

        const enableEps = 0.001;
        const neutral = 1.0;
        const current = Number.isFinite(this.warmthPass.uniforms.warmth.value)
            ? this.warmthPass.uniforms.warmth.value
            : neutral;

        const enabled = !!this._warmthTransition || Math.abs(current - neutral) > enableEps;
        this.warmthPass.enabled = enabled;

        if (!enabled) {
            this.warmthPass.uniforms.warmth.value = neutral;
        }
    }

    /**
     * A.2: Update fog color transition each frame
     */
    _updateFogColorTransition() {
        if (!this._fogColorTransition || !this.depthFogPass) return;

        const elapsed = (performance.now() - this._fogColorTransition.startTime) / 1000;
        const t = Math.min(1, elapsed / this._fogColorTransition.duration);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);

        // Lerp each color channel
        const start = this._fogColorTransition.startColor;
        const target = this._fogColorTransition.targetColor;

        this.depthFogPass.uniforms.fogColor.value.r = start.r + (target.r - start.r) * eased;
        this.depthFogPass.uniforms.fogColor.value.g = start.g + (target.g - start.g) * eased;
        this.depthFogPass.uniforms.fogColor.value.b = start.b + (target.b - start.b) * eased;

        if (t >= 1) {
            this._fogColorTransition = null;
        }
    }

    init() {
        try {
            this.setupComposer();
            this.setupRenderPass();
            // MP-FOG-03: Insert Depth Fog Pass after RenderPass and before bloom
            if (this.effects.depthFog) this.setupDepthFogPass();
            if (this.effects.bloom) this.setupBloomPass();
            // CINEMATIC-OVERHAUL: God rays after bloom for additive effect
            this.setupGodRaysPass();
            if (this.effects.vignette) this.setupVignettePass();
            this.setupBrightnessPass();  // ISSUE-3-FIX: Always setup for THE_QUIET darkness
            this.setupWarmthPass();  // P1-TEMP-ARC: Color temperature for cool→warm→cool arc
            if (this.effects.filmGrain) this.setupFilmGrainPass();
            if (this.effects.scanlines) this.setupScanlinePass();  // MP10-FIX
            this.setupChromaticAberrationPass();  // GIGA-AUDIT: Always setup but disabled by default
            this.setupSingularityLensPass();  // TRACK5-PASSES: Gravitational lensing for void
            this.setupHeatHazePass();  // TRACK6-PASSES: Heat shimmer for O Filho
            if (this.effects.fxaa) this.setupFXAAPass();

            // TIMING-FIX: Re-apply current preset after all passes created
            // This ensures preset values aren't null if applied before init()
            if (this.currentPreset && this.presets[this.currentPreset]) {
                this.applyPreset(this.currentPreset);
            }

            // STAB-03: Guard debug logging
            if (window.SONOITE_DEBUG) {
                console.log('🎨 PostProcessing: Cinematic pipeline initialized', {
                    bloom: this.effects.bloom,
                    godRays: this.effects.godRays,
                    depthFog: this.effects.depthFog,
                    vignette: this.effects.vignette,
                    filmGrain: this.effects.filmGrain,
                    fxaa: this.effects.fxaa
                });
            }
        } catch (error) {
            console.warn('PostProcessing init failed, using fallback:', error.message);
            this.enabled = false;
        }
    }

    setupComposer() {
        const size = new THREE.Vector2();
        this.renderer.getSize(size);

        const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: true
        });

        this.composer = new EffectComposer(this.renderer, renderTarget);
        // MP-Perf-POSTPR: Cap post-processing pixel ratio (separate from renderer DPR).
        const pixelRatio = this._getComposerPixelRatio();
        this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(size.x, size.y);

        // MP-FOG-DEPTH: Dedicated depth pre-pass target (prevents WebGL feedback loops)
        // Size it to the post-processing resolution, not full renderer DPR.
        this._setupDepthPrepassTarget(
            Math.max(1, Math.floor(size.x * pixelRatio)),
            Math.max(1, Math.floor(size.y * pixelRatio))
        );

        if (window.SONOITE_DEBUG) {
            console.log('[MP-Perf-POSTPR] PostFX pixel ratio', {
                renderer: this.renderer.getPixelRatio(),
                cap: this.postPixelRatioCap,
                effective: pixelRatio
            });
        }
    }

    _parsePixelRatioCap(rawValue, fallback) {
        const parsed = parseFloat(String(rawValue ?? ''));
        if (!Number.isFinite(parsed)) return fallback;
        return THREE.MathUtils.clamp(parsed, 0.5, 2);
    }

    _getComposerPixelRatioCap() {
        const cap = Number.isFinite(this._composerPixelRatioCapOverride)
            ? this._composerPixelRatioCapOverride
            : this.postPixelRatioCap;
        return THREE.MathUtils.clamp(cap, 0.5, 2);
    }

    _getComposerPixelRatio() {
        const rendererPixelRatio = Number.isFinite(this.renderer?.getPixelRatio?.())
            ? this.renderer.getPixelRatio()
            : 1;
        const cap = this._getComposerPixelRatioCap();
        return THREE.MathUtils.clamp(Math.min(rendererPixelRatio, 2, cap), 0.5, 2);
    }

    _syncComposerResolution(width, height) {
        if (!this.composer) return;

        const pixelRatio = this._getComposerPixelRatio();
        this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(width, height);

        // Keep depth pre-pass and FXAA aligned to post-processing resolution.
        this._setupDepthPrepassTarget(
            Math.max(1, Math.floor(width * pixelRatio)),
            Math.max(1, Math.floor(height * pixelRatio))
        );
        if (this.fxaaPass?.material?.uniforms?.['resolution']) {
            this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
            this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
        }
    }

    _setupDepthPrepassTarget(width, height) {
        if (this.depthPrepassTarget) {
            this.depthPrepassTarget.dispose();
        }

        if (!this.depthPrepassMaterial) {
            this.depthPrepassMaterial = new THREE.MeshDepthMaterial({
                depthPacking: THREE.BasicDepthPacking
            });
            this.depthPrepassMaterial.blending = THREE.NoBlending;
        }

        const depthTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: true
        });
        depthTarget.texture.generateMipmaps = false;

        const depthTexture = new THREE.DepthTexture(width, height);
        depthTexture.type = THREE.UnsignedShortType;
        depthTexture.minFilter = THREE.NearestFilter;
        depthTexture.magFilter = THREE.NearestFilter;
        depthTarget.depthTexture = depthTexture;

        this.depthPrepassTarget = depthTarget;
        this.depthPrepassDepthTexture = depthTexture;

        // Keep shader uniform pinned to the latest texture reference (resizes recreate it)
        if (this.depthFogPass?.uniforms?.tDepth) {
            this.depthFogPass.uniforms.tDepth.value = depthTexture;
        }
    }

    _renderDepthPrepass() {
        if (!this.depthPrepassTarget || !this.depthPrepassMaterial) return;

        const previousTarget = this.renderer.getRenderTarget();
        const previousOverride = this.scene.overrideMaterial;

        this.scene.overrideMaterial = this.depthPrepassMaterial;
        this.renderer.setRenderTarget(this.depthPrepassTarget);
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(previousTarget);
        this.scene.overrideMaterial = previousOverride;
    }

    setupRenderPass() {
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
    }

    setupBloomPass() {
        const size = new THREE.Vector2();
        this.renderer.getSize(size);

        // P1-PERF: Use scaled resolution for bloom (default 50% = 4x fewer pixels)
        // UnrealBloomPass handles the upsampling internally during compositing
        const bloomWidth = Math.floor(size.x * this.bloomResolutionScale);
        const bloomHeight = Math.floor(size.y * this.bloomResolutionScale);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(bloomWidth, bloomHeight),
            this.passes.bloomStrength,
            this.passes.bloomRadius,
            this.passes.bloomThreshold
        );

        this.bloomPass.enabled = true;
        this.composer.addPass(this.bloomPass);

        if (window.SONOITE_DEBUG) {
            console.log(`[P1-PERF] Bloom pass at ${this.bloomResolutionScale * 100}% resolution: ${bloomWidth}x${bloomHeight}`);
        }
    }

    /**
     * CINEMATIC-OVERHAUL: Volumetric God Rays Pass
     * Creates radial light shafts emanating from bright areas (like the egg_crystal)
     * Inspired by Blade Runner 2049 / Interstellar cinematography
     */
    setupGodRaysPass() {
        const GodRaysShader = {
            uniforms: {
                tDiffuse: { value: null },
                lightPositionOnScreen: { value: new THREE.Vector2(0.5, 0.5) },
                exposure: { value: this.passes.godRaysExposure },
                decay: { value: this.passes.godRaysDecay },
                density: { value: this.passes.godRaysDensity },
                weight: { value: this.passes.godRaysWeight },
                intensity: { value: this.passes.godRaysIntensity },
                // Ultra-subtle policy: only accumulate from bright highlights
                threshold: { value: this.passes.godRaysThreshold ?? 0.85 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 lightPositionOnScreen;
                uniform float exposure;
                uniform float decay;
                uniform float density;
                uniform float weight;
                uniform float intensity;
                uniform float threshold;
                varying vec2 vUv;

                const int NUM_SAMPLES = 50;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);

                    // Direction from pixel to light source
                    vec2 deltaTextCoord = vUv - lightPositionOnScreen;
                    deltaTextCoord *= 1.0 / float(NUM_SAMPLES) * density;

                    vec2 coord = vUv;
                    float illuminationDecay = 1.0;
                    vec3 godRayColor = vec3(0.0);

                    // Sample along ray toward light source
                    for (int i = 0; i < NUM_SAMPLES; i++) {
                        coord -= deltaTextCoord;
                        vec4 sampleColor = texture2D(tDiffuse, coord);

                        // Monochrome rays: luminance-only (no RGB split / no color bleed)
                        float luminance = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                        float highlight = smoothstep(threshold, 1.0, luminance);

                        // Accumulate only from highlights to preserve blacks
                        godRayColor += vec3(luminance) * highlight * illuminationDecay * weight;

                        illuminationDecay *= decay;
                    }

                    // Apply exposure and intensity
                    godRayColor *= exposure * intensity;

                    // Additive blend (neutral): keep rays rare + ultra-subtle to avoid black lift
                    vec3 finalColor = texel.rgb + godRayColor;

                    gl_FragColor = vec4(finalColor, texel.a);
                }
            `
        };

        this.godRaysPass = new ShaderPass(GodRaysShader);
        this.godRaysPass.enabled = this.effects.godRays;
        this.composer.addPass(this.godRaysPass);

        if (window.SONOITE_DEBUG) {
            console.log('[CINEMATIC] God Rays Pass initialized', {
                intensity: this.passes.godRaysIntensity,
                decay: this.passes.godRaysDecay,
                enabled: this.effects.godRays
            });
        }
    }

    /**
     * CINEMATIC-OVERHAUL: Update god rays light position based on scene
     * Call this when the primary light source (egg_crystal) moves
     */
    updateGodRaysLightPosition(screenPosition) {
        if (this.godRaysPass && this.godRaysPass.uniforms) {
            this.godRaysPass.uniforms.lightPositionOnScreen.value.copy(screenPosition);
        }
    }

    /**
     * CINEMATIC-OVERHAUL: Set god rays intensity (for audio reactivity)
     */
    setGodRaysIntensity(intensity) {
        if (!this.godRaysPass?.uniforms) return;

        const safe = Number.isFinite(intensity) ? intensity : 0;
        const clamped = THREE.MathUtils.clamp(safe, 0, 0.08);

        // Enable/disable pass based on intensity (policy: OFF unless explicitly driven)
        this.effects.godRays = clamped > 0.0001;
        this.godRaysPass.enabled = this.effects.godRays;
        this.godRaysPass.uniforms.intensity.value = clamped;
    }

    /**
     * TRACK6-SHAFTS: Set god rays screen position
     * Used to point light shafts at specific objects (e.g., monolith top)
     * @param {number} x - Screen X position (0-1, left to right)
     * @param {number} y - Screen Y position (0-1, bottom to top)
     */
    setGodRaysPosition(x, y) {
        if (!this.godRaysPass?.uniforms?.lightPositionOnScreen) return;
        this.godRaysPass.uniforms.lightPositionOnScreen.value.set(x, y);
    }

    /**
     * TRACK6-SHAFTS: Project world position to screen for god rays
     * @param {THREE.Vector3} worldPos - World position to project
     * @returns {THREE.Vector2|null} Screen position (0-1) or null if behind camera
     */
    projectToScreen(worldPos) {
        if (!this.camera) return null;

        const screenPos = worldPos.clone().project(this.camera);

        // Check if behind camera
        if (screenPos.z > 1) return null;

        // Convert from NDC (-1 to 1) to screen coords (0 to 1)
        return new THREE.Vector2(
            (screenPos.x + 1) / 2,
            (screenPos.y + 1) / 2
        );
    }

    setupDepthFogPass() {
        // MP-FOG-02/03: Depth Fog Pass shader with linearized depth
        const DepthFogShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'tDepth': { value: null },  // MP-FOG-02: DepthTexture
                'cameraNear': { value: this.camera.near },  // MP-FOG-02: Camera near plane
                'cameraFar': { value: this.camera.far },    // MP-FOG-02: Camera far plane
                'fogDensity': { value: this.passes.fogDensity },
                'fogColor': { value: this.passes.fogColor },
                'fogNear': { value: this.passes.fogNear },
                'fogFar': { value: this.passes.fogFar }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform float fogDensity;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying vec2 vUv;

                // MP-FOG-02: Linearize depth from depth texture
                float linearizeDepth(float depth) {
                    float z = depth * 2.0 - 1.0; // Back to NDC
                    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
                }

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    float depth = texture2D(tDepth, vUv).r;

                    // If there's no geometry in the depth prepass, depth is at the far plane (1.0).
                    // Avoid tinting the empty background, which can read as a colored "viewport border".
                    if (depth >= 0.9999) {
                        gl_FragColor = texel;
                        return;
                    }

                    float linearDepth = linearizeDepth(depth);

                    // Calculate fog factor based on linear depth
                    float fogFactor = smoothstep(fogNear, fogFar, linearDepth) * fogDensity;
                    fogFactor = clamp(fogFactor, 0.0, 1.0);

                    // Mix scene color with fog color
                    vec3 finalColor = mix(texel.rgb, fogColor, fogFactor);

                    gl_FragColor = vec4(finalColor, texel.a);
                }
            `
        };

        this.depthFogPass = new ShaderPass(DepthFogShader);

        // MP-FOG-DEPTH: Pass depth-prepass texture (avoids WebGL feedback loops)
        this.depthFogPass.uniforms.tDepth.value = this.depthPrepassDepthTexture;
        if (!this.depthFogPass.uniforms.tDepth.value) {
            console.warn('[MP-FOG-DEPTH] Depth Fog Pass disabled (missing depth texture)');
            this.depthFogPass.enabled = false;
            this.effects.depthFog = false;
        }

        // MP-FOG-03: Reduced-motion adjustment (halve fog density)
        if (window.SONOITE_REDUCED_MOTION) {
            this.depthFogPass.uniforms.fogDensity.value *= 0.5;
            if (window.SONOITE_DEBUG) {
                console.log('[MP-FOG-03] Reduced-motion: fog density halved');
            }
        }

        this.depthFogPass.enabled = !!this.effects.depthFog;
        this.composer.addPass(this.depthFogPass);

        if (window.SONOITE_DEBUG) {
            console.log('[MP-FOG-02] Depth Fog Pass initialized', {
                density: this.depthFogPass.uniforms.fogDensity.value,
                near: this.passes.fogNear,
                far: this.passes.fogFar,
                color: this.passes.fogColor
            });
        }
    }

    setupVignettePass() {
        // Custom vignette shader for Phase 4.2 nocturnal aesthetic
        const VignetteShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'offset': { value: this.passes.vignetteStrength },
                'darkness': { value: this.passes.vignetteDarkness || 0.8 } // MP-VIG-FIX: Reduced fallback darkness
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    vec2 uv = (vUv - vec2(0.5)) * vec2(offset + 0.0001); // MP-TJ-Shader-01: epsilon guard
                    // MP-TJ-Shader-01: Clamp vignette to [0,1] to prevent black squares
                    float vignette = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0);
                    texel.rgb *= vignette;
                    gl_FragColor = texel;
                }
            `
        };

        this.vignettePass = new ShaderPass(VignetteShader);
        this.vignettePass.enabled = true;
        this.composer.addPass(this.vignettePass);
    }

    /**
     * ISSUE-3-FIX: Global brightness pass for THE_QUIET darkness
     * Multiplies entire scene by brightness factor (0.0 = black, 1.0 = normal)
     * Used for moment-based global dimming/brightening
     */
    setupBrightnessPass() {
        const BrightnessShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'brightness': { value: 1.0 }  // Default: no change
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float brightness;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    // ISSUE-3-FIX: Global brightness multiply (preserves alpha)
                    texel.rgb *= brightness;
                    gl_FragColor = texel;
                }
            `
        };

        this.brightnessPass = new ShaderPass(BrightnessShader);
        // PERF-GATE: Brightness pass does real work; keep it disabled when neutral (1.0).
        this.brightnessPass.enabled = false;
        this.composer.addPass(this.brightnessPass);

        this._updateBrightnessPerfGate();

        if (window.SONOITE_DEBUG) {
            console.log('[ISSUE-3-FIX] Brightness pass initialized (default: 1.0)');
        }
    }

    /**
     * ISSUE-3-FIX: Set global brightness for THE_QUIET and other darkness moments
     * @param {number} value - Brightness factor (0.0 = black, 1.0 = normal, >1.0 = bright)
     */
    setBrightness(value) {
        if (this.brightnessPass && this.brightnessPass.uniforms.brightness) {
            // Clamp to reasonable range [0, 2]
            const clamped = Math.max(0, Math.min(2, value));
            this.brightnessPass.uniforms.brightness.value = clamped;
            this._updateBrightnessPerfGate();

            if (window.SONOITE_DEBUG) {
                console.log(`[ISSUE-3-FIX] Brightness set to ${clamped.toFixed(2)}`);
            }
        }
    }

    /**
     * P1-TEMP-ARC: Color temperature/warmth pass for cool→warm→cool narrative arc
     * Shifts color balance between cool (blue) and warm (amber/orange)
     */
    setupWarmthPass() {
        const WarmthShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'warmth': { value: 1.0 }  // 1.0 = neutral, <1.0 = cool, >1.0 = warm
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float warmth;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);

                    // P1-TEMP-ARC: Color temperature shift
                    // warmth > 1.0: boost red/orange, reduce blue
                    // warmth < 1.0: boost blue, reduce red/orange
                    float shift = warmth - 1.0;  // -1 to +1 range typically

                    // Apply subtle color shift (max ±15% to preserve scene integrity)
                    float redMult = 1.0 + shift * 0.15;
                    float greenMult = 1.0 + shift * 0.05;  // Slight green shift for natural warmth
                    float blueMult = 1.0 - shift * 0.12;

                    texel.r *= redMult;
                    texel.g *= greenMult;
                    texel.b *= blueMult;

                    gl_FragColor = texel;
                }
            `
        };

        this.warmthPass = new ShaderPass(WarmthShader);
        // PERF-GATE: Warmth pass does real work; keep it disabled when neutral (1.0).
        this.warmthPass.enabled = false;
        this.composer.addPass(this.warmthPass);

        this._updateWarmthPerfGate();

        if (window.SONOITE_DEBUG) {
            console.log('[P1-TEMP-ARC] Warmth pass initialized (default: 1.0 neutral)');
        }
    }

    /**
     * P1-TEMP-ARC: Set color temperature/warmth
     * @param {number} value - Warmth factor (0.5 = cool/blue, 1.0 = neutral, 1.5 = warm/amber)
     */
    setWarmth(value) {
        if (this.warmthPass && this.warmthPass.uniforms.warmth) {
            // Clamp to reasonable range [0.5, 1.5]
            const clamped = Math.max(0.5, Math.min(1.5, value));
            this.warmthPass.uniforms.warmth.value = clamped;
            this._updateWarmthPerfGate();

            if (window.SONOITE_DEBUG) {
                const temp = clamped < 1.0 ? 'cool' : (clamped > 1.0 ? 'warm' : 'neutral');
                console.log(`[P1-TEMP-ARC] Warmth set to ${clamped.toFixed(2)} (${temp})`);
            }
        }
    }

    setupFilmGrainPass() {
        // MP-TJ-BlueNoise-01: Blue-noise grain fallback with flag
        const useBlueNoise = !!window.SONOITE_BLUE_NOISE;

        // R2 sequence offsets for blue noise (low-discrepancy quasi-random)
        const blueOffsets = [
            [0.0, 0.0],
            [0.5, 0.0],
            [0.0, 0.5]
        ];

        // Custom film grain shader with blue noise support
        const FilmGrainShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'time': { value: 0.0 },
                'intensity': { value: this.passes.grainIntensity },
                // MP-TJ-BlueNoise-01: Blue noise uniforms
                'uBlueOffsets': { value: blueOffsets.map(o => new THREE.Vector2(o[0], o[1])) },
                'uFrame': { value: 0 },
                'useBlueNoise': { value: useBlueNoise }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float intensity;
                uniform vec2 uBlueOffsets[3];
                uniform int uFrame;
                uniform bool useBlueNoise;
                varying vec2 vUv;

                float random(vec2 co) {
                    // MP-POST-Grain-01: Add epsilon to prevent division issues
                    return fract(sin(dot(co.xy + vec2(0.0001), vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);

                    float noise;
                    if (useBlueNoise) {
                        // MP-TJ-BlueNoise-01: Use R2 blue noise offsets
                        int offsetIndex = int(mod(float(uFrame), 3.0));
                        vec2 blueOffset = uBlueOffsets[offsetIndex];
                        vec2 seed = gl_FragCoord.xy + blueOffset * 100.0 + mod(time, 1000.0);
                        // Keep grain zero-mean so dark scenes are textured, not globally lifted.
                        noise = (random(seed) - 0.5) * (intensity * 1.35);
                    } else {
                        // MP-POST-Grain-01: Use gl_FragCoord for screen-space stable noise
                        // This prevents tiling/banding at different zoom levels
                        vec2 seed = gl_FragCoord.xy + mod(time, 1000.0);
                        noise = (random(seed) - 0.5) * (intensity * 1.35);
                    }

                    texel.rgb += vec3(noise);
                    // MP-POST-Grain-01: Clamp to [0,1] to prevent artifacts
                    gl_FragColor = clamp(texel, 0.0, 1.0);
                }
            `
        };

        this.filmGrainPass = new ShaderPass(FilmGrainShader);
        this.filmGrainPass.enabled = true;
        this.composer.addPass(this.filmGrainPass);

        if (window.SONOITE_DEBUG && useBlueNoise) {
            console.log('[MP-TJ-BlueNoise-01] Blue noise grain enabled');
        }
    }

    /**
     * MP10-FIX: Setup scanline pass for retro CRT effect
     */
    setupScanlinePass() {
        const ScanlineShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'intensity': { value: this.passes.scanlineIntensity },
                'count': { value: this.passes.scanlineCount }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float intensity;
                uniform float count;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    float scanline = sin(vUv.y * count) * intensity;
                    texel.rgb -= vec3(scanline);
                    gl_FragColor = clamp(texel, 0.0, 1.0);
                }
            `
        };

        this.scanlinePass = new ShaderPass(ScanlineShader);
        this.scanlinePass.enabled = false; // Off by default
        this.composer.addPass(this.scanlinePass);

        if (window.SONOITE_DEBUG) {
            console.log('[MP10-FIX] Scanline pass initialized (disabled by default)');
        }
    }

    /**
     * GIGA-AUDIT: Chromatic Aberration Pass
     * RGB channel split for intense climax moments (tornado peak, ego death)
     * Reference: Annihilation shimmer finale
     */
    setupChromaticAberrationPass() {
        const ChromaticAberrationShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'uIntensity': { value: 0.0 },  // 0 = off, 0.01-0.02 = subtle, 0.03+ = intense
                'uDirection': { value: new THREE.Vector2(1.0, 0.0) }  // Radial from center
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uIntensity;
                uniform vec2 uDirection;
                varying vec2 vUv;

                void main() {
                    // Skip if intensity is zero (performance optimization)
                    if (uIntensity < 0.001) {
                        gl_FragColor = texture2D(tDiffuse, vUv);
                        return;
                    }

                    // Radial direction from center for organic feel
                    vec2 fromCenter = vUv - vec2(0.5);
                    float len = length(fromCenter);
                    vec2 direction = len > 1e-4 ? (fromCenter / len) : vec2(0.0);

                    // Fade offset near edges to prevent colored borders from clamp-to-edge sampling.
                    // (Keeps chroma "cinematic" rather than a screen-space frame artifact.)
                    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
                    float edgeFade = smoothstep(0.0, 0.10, edge);
                    vec2 offset = direction * (uIntensity * edgeFade);

                    // Sample RGB channels at different offsets
                    vec2 uvR = clamp(vUv + offset, vec2(0.0), vec2(1.0));
                    vec2 uvB = clamp(vUv - offset, vec2(0.0), vec2(1.0));
                    float r = texture2D(tDiffuse, uvR).r;
                    float g = texture2D(tDiffuse, vUv).g;
                    float b = texture2D(tDiffuse, uvB).b;

                    gl_FragColor = vec4(r, g, b, 1.0);
                }
            `
        };

        this.chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
        this.chromaticAberrationPass.enabled = false;  // Off by default, enabled via moment
        this.composer.addPass(this.chromaticAberrationPass);

        if (window.SONOITE_DEBUG) {
            console.log('[GIGA-AUDIT] Chromatic Aberration Pass initialized (disabled by default)');
        }
    }

    /**
     * GIGA-AUDIT: Set chromatic aberration intensity
     * @param {number} intensity - 0 to 0.05 (0 = off, 0.012 = tornado peak, 0.025 = ego death)
     * @param {number} [duration] - Optional fade duration in seconds (not implemented here, use journey moment)
     */
    setChromaticAberration(intensity) {
        if (!this.chromaticAberrationPass) return;

        // Track 5 headroom: keep low-level spikes subtle but allow climax beats to read clearly.
        const isClimax = intensity > 0.05;
        const maxIntensity = isClimax ? 0.10 : 0.05;
        const clampedIntensity = Math.max(0, Math.min(maxIntensity, intensity));
        this.chromaticAberrationPass.uniforms.uIntensity.value = clampedIntensity;
        this.chromaticAberrationPass.enabled = clampedIntensity > 0.001;

        if (window.SONOITE_DEBUG && clampedIntensity > 0) {
            console.log(`[GIGA-AUDIT] Chromatic aberration: ${clampedIntensity.toFixed(4)}`);
        }
    }

    /**
     * TRACK5-PASSES: Singularity Lens Pass for gravitational lensing
     * Creates black hole-style screen warping toward center point
     * Used in Track 5 (Não Querer Nada) void sequences
     */
    setupSingularityLensPass() {
        this.singularityLensPass = new ShaderPass(SingularityLensShader);
        this.singularityLensPass.enabled = false;  // Disabled by default, enabled via moment
        this.composer.addPass(this.singularityLensPass);

        // Create controller for smooth transitions
        this.singularityLensController = new SingularityLensController(this.singularityLensPass);

        if (window.SONOITE_DEBUG) {
            console.log('[TRACK5-PASSES] Singularity Lens Pass initialized (disabled by default)');
        }
    }

    /**
     * TRACK5-PASSES: Set singularity lens strength
     * @param {number} strength - Lens strength (0-1)
     * @param {number} [duration] - Transition duration in seconds
     */
    setSingularityLens(strength, duration = 1.0) {
        if (!this.singularityLensController) return;

        this.singularityLensController.setStrength(strength, duration);
        this.effects.singularityLens = strength > 0.001;

        if (window.SONOITE_DEBUG && strength > 0) {
            console.log(`[TRACK5-PASSES] Singularity lens: ${strength.toFixed(3)} over ${duration}s`);
        }
    }

    /**
     * TRACK5-PASSES: Set singularity lens center point
     * @param {number} x - X coordinate (0-1, normalized)
     * @param {number} y - Y coordinate (0-1, normalized)
     */
    setSingularityLensCenter(x, y) {
        if (!this.singularityLensController) return;
        this.singularityLensController.setCenter(x, y);
    }

    /**
     * TRACK5-PASSES: Enable inverse mode (silence pulls)
     * @param {boolean} enabled - Whether to invert audio reactivity
     */
    setSingularityLensInvert(enabled) {
        if (!this.singularityLensController) return;
        this.singularityLensController.setInvert(enabled);
    }

    /**
     * TRACK5-PASSES: Get singularity lens controller for direct access
     * @returns {SingularityLensController|null}
     */
    getSingularityLensController() {
        return this.singularityLensController;
    }

    /**
     * TRACK6-PASSES: Heat Haze Pass for thermal distortion
     * Creates wavy screen distortion simulating heat shimmer
     * Used in Track 6 (O Filho) for fire/heat sequences
     */
    setupHeatHazePass() {
        this.heatHazePass = new ShaderPass(HeatHazeShader);
        this.heatHazePass.enabled = false;  // Disabled by default, enabled via moment
        this.composer.addPass(this.heatHazePass);

        // Create controller for smooth transitions
        this.heatHazeController = new HeatHazeController(this.heatHazePass);

        if (window.SONOITE_DEBUG) {
            console.log('[TRACK6-PASSES] Heat Haze Pass initialized (disabled by default)');
        }
    }

    /**
     * TRACK6-PASSES: Set heat haze intensity
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} [duration] - Transition duration in seconds
     */
    setHeatHaze(intensity, duration = 1.0) {
        if (!this.heatHazeController) return;

        this.heatHazeController.setIntensity(intensity, duration);
        this.effects.heatHaze = intensity > 0.001;

        if (window.SONOITE_DEBUG && intensity > 0) {
            console.log(`[TRACK6-PASSES] Heat haze: ${intensity.toFixed(3)} over ${duration}s`);
        }
    }

    /**
     * TRACK6-PASSES: Set heat haze center point
     * @param {number} x - X coordinate (0-1, normalized)
     * @param {number} y - Y coordinate (0-1, normalized)
     */
    setHeatHazeCenter(x, y) {
        if (!this.heatHazeController) return;
        this.heatHazeController.setCenter(x, y);
    }

    /**
     * TRACK6-PASSES: Set heat haze effect radius
     * @param {number} radius - Radius (0-1)
     */
    setHeatHazeRadius(radius) {
        if (!this.heatHazeController) return;
        this.heatHazeController.setRadius(radius);
    }

    /**
     * TRACK6-PASSES: Get heat haze controller for direct access
     * @returns {HeatHazeController|null}
     */
    getHeatHazeController() {
        return this.heatHazeController;
    }

    setupFXAAPass() {
        // Anti-aliasing for smooth edges
        this.fxaaPass = new ShaderPass(FXAAShader);

        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        const pixelRatio = this._getComposerPixelRatio();

        this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (size.x * pixelRatio);
        this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (size.y * pixelRatio);
        this.fxaaPass.enabled = true;
        this.fxaaPass.renderToScreen = true; // Final pass

        this.composer.addPass(this.fxaaPass);
    }

    enableEffect(effectName, enabled = true) {
        if (this.effects.hasOwnProperty(effectName)) {
            this.effects[effectName] = enabled;
            this.updatePipeline();
        }
    }

    setEffectIntensity(effectName, intensity) {
        const passMap = {
            bloom: 'bloomLevel',
            vignette: 'vignetteStrength',
            filmGrain: 'grainIntensity',
            scanlines: 'scanlineIntensity'
        };

        const passName = passMap[effectName];
        if (passName && this.passes.hasOwnProperty(passName)) {
            this.passes[passName] = Math.max(0, Math.min(1, intensity));
            this.updatePipeline();
        }
    }

    /**
     * MP-POST-Presets-02: Apply per-track post-processing preset
     * Falls back to 'balanced' preset for missing fields
     * @param {Object} postConfig - Track post config {bloom, vignette, grain, preset}
     */
    applyTrackPreset(postConfig) {
        if (!postConfig) {
            // No config provided, fallback to balanced
            this.applyPreset('balanced');
            return;
        }

        // STATE/PERF: Reset transient state on track switches so no targets/transitions leak cross-track.
        this._bloomTransition = null;
        this._brightnessTransition = null;
        this._warmthTransition = null;
        this._fogTarget = null;
        this._fogColorTransition = null;
        this._vignetteTransition = null;
        this.vignetteTarget = undefined;
        this.bloomTarget = undefined;

        // BLOOM-IMPULSE: Ensure additive spikes cannot persist across tracks.
        if (this._bloomImpulse) {
            this._bloomImpulse.active = false;
            this._bloomImpulse.intensity = 0;
            this._bloomImpulse.time = 0;
            this._bloomImpulse.duration = 0;
            this._bloomImpulse.baseStrength = 0;
        }

        // PERF-GATE: Reset neutral full-screen passes to baseline.
        if (this.brightnessPass?.uniforms?.brightness) {
            this.brightnessPass.uniforms.brightness.value = 1.0;
        }
        if (this.warmthPass?.uniforms?.warmth) {
            this.warmthPass.uniforms.warmth.value = 1.0;
        }
        this._updateBrightnessPerfGate();
        this._updateWarmthPerfGate();

        // PERF-GATE: Reset moment-only heavy passes so they can't linger after a previous track.
        if (this.chromaticAberrationPass?.uniforms?.uIntensity) {
            this.chromaticAberrationPass.uniforms.uIntensity.value = 0;
            this.chromaticAberrationPass.enabled = false;
        }
        if (this.singularityLensController) {
            this.singularityLensController.reset();
        }
        if (this.heatHazeController) {
            this.heatHazeController.reset();
        }
        if (this.godRaysPass?.uniforms?.intensity) {
            this.godRaysPass.uniforms.intensity.value = 0;
            this.godRaysPass.enabled = false;
        }

        // Check if preset name is specified
        if (postConfig.preset && this.presets[postConfig.preset]) {
            this.applyPreset(postConfig.preset);
            // Override with specific numeric values if provided
        }

        // Track 5 performance profile: skip depth fog prepass in `void` preset.
        // This preserves the noir stack while removing a full extra scene render.
        if (postConfig.preset === 'void') {
            this.effects.depthFog = false;
        } else {
            this.effects.depthFog = !!window.SONOITE_VOL_FOG;
        }

        // Get balanced as fallback
        const balanced = this.presets.balanced;
        const enableEps = 0.001;

        // Apply bloom settings (fallback to balanced)
        if (typeof postConfig.bloom === 'number') {
            this.passes.bloomStrength = postConfig.bloom;
            this.effects.bloom = postConfig.bloom > enableEps;
            if (this.bloomPass) {
                this.bloomPass.enabled = this.effects.bloom;
                this.bloomPass.strength = this.effects.bloom ? postConfig.bloom : 0;
            }
        } else if (!postConfig.preset) {
            // No bloom specified and no preset, use balanced
            this.passes.bloomStrength = balanced.bloomStrength;
            if (this.bloomPass) {
                this.bloomPass.strength = balanced.bloomStrength;
            }
        }

        // Apply vignette settings (fallback to balanced)
        if (typeof postConfig.vignette === 'number') {
            this.passes.vignetteStrength = postConfig.vignette;
            this.effects.vignette = postConfig.vignette > enableEps;
            if (this.vignettePass) {
                this.vignettePass.enabled = this.effects.vignette;
                this.vignettePass.uniforms['offset'].value = this.effects.vignette ? postConfig.vignette : 0;
            }
        } else if (!postConfig.preset) {
            this.passes.vignetteStrength = balanced.vignetteStrength;
            if (this.vignettePass) {
                this.vignettePass.uniforms['offset'].value = balanced.vignetteStrength;
            }
        }

        // Apply grain settings (fallback to balanced)
        if (typeof postConfig.grain === 'number') {
            this.passes.grainIntensity = postConfig.grain;
            this.effects.filmGrain = postConfig.grain > enableEps;
            if (this.filmGrainPass) {
                this.filmGrainPass.enabled = this.effects.filmGrain;
                this.filmGrainPass.uniforms['intensity'].value = this.effects.filmGrain ? postConfig.grain : 0;
            }
        } else if (!postConfig.preset) {
            this.passes.grainIntensity = balanced.grainIntensity;
            if (this.filmGrainPass) {
                this.filmGrainPass.uniforms['intensity'].value = balanced.grainIntensity;
            }
        }

        this.updatePipeline();

        // Keep phase-target smoothing coherent with per-track baselines.
        // Avoid a previous track's targets pushing bloom/vignette away from the new preset.
        this.vignetteTarget = this.effects.vignette ? this.passes.vignetteStrength : undefined;
        this.bloomTarget = this.effects.bloom ? this.passes.bloomStrength : undefined;

        if (window.SONOITE_DEBUG) {
            console.log('🎨 Applied track post preset (with balanced fallback):', postConfig);
        }
    }

    updatePipeline() {
        if (!this.enabled || !this.composer) return;

        const enableEps = 0.001;

        // Ensure depth fog pass exists if enabled
        if (this.effects.depthFog && !this.depthFogPass) {
            this.setupDepthFogPass();
        }

        // Bloom
        if (this.bloomPass) {
            const strength = Number.isFinite(this.passes.bloomStrength) ? this.passes.bloomStrength : 0;
            const bloomEnabled = !!this.effects.bloom && strength > enableEps;
            this.bloomPass.enabled = bloomEnabled;
            if (bloomEnabled) {
                this.bloomPass.strength = strength;
                this.bloomPass.radius = this.passes.bloomRadius;
                this.bloomPass.threshold = this.passes.bloomThreshold;
            } else {
                // PERF-GATE: Ensure disabled bloom does not still render at ~0
                this.bloomPass.strength = 0;
            }
        }

        // Vignette
        if (this.vignettePass) {
            const strength = Number.isFinite(this.passes.vignetteStrength) ? this.passes.vignetteStrength : 0;
            const vignetteEnabled = !!this.effects.vignette && strength > enableEps;
            this.vignettePass.enabled = vignetteEnabled;
            if (vignetteEnabled) {
                this.vignettePass.uniforms['offset'].value = strength;
                if (this.passes.vignetteDarkness !== undefined) {
                    this.vignettePass.uniforms['darkness'].value = this.passes.vignetteDarkness;
                }
            } else if (this.vignettePass.uniforms?.['offset']) {
                this.vignettePass.uniforms['offset'].value = 0;
            }
        }

        // Film grain
        if (this.filmGrainPass) {
            const intensity = Number.isFinite(this.passes.grainIntensity) ? this.passes.grainIntensity : 0;
            const grainEnabled = !!this.effects.filmGrain && intensity > enableEps;
            this.filmGrainPass.enabled = grainEnabled;
            if (grainEnabled) {
                this.filmGrainPass.uniforms['intensity'].value = intensity;
            } else if (this.filmGrainPass.uniforms?.['intensity']) {
                this.filmGrainPass.uniforms['intensity'].value = 0;
            }
        }

        // Depth fog
        if (this.depthFogPass?.uniforms) {
            const fogDensity = Number.isFinite(this.passes.fogDensity) ? this.passes.fogDensity : 0;
            // PERF-GATE: Skip depth fog (and its depth pre-pass) when density is ~0.
            // Keep effects.depthFog as the user/track toggle; pass.enabled reflects real work.
            const depthFogEnabled = !!this.effects.depthFog && fogDensity > enableEps;
            this.depthFogPass.enabled = depthFogEnabled;
            this.depthFogPass.uniforms.cameraNear.value = this.camera.near;
            this.depthFogPass.uniforms.cameraFar.value = this.camera.far;
            this.depthFogPass.uniforms.fogDensity.value = depthFogEnabled ? fogDensity : 0;
            this.depthFogPass.uniforms.fogColor.value = this.passes.fogColor;
            this.depthFogPass.uniforms.fogNear.value = this.passes.fogNear;
            this.depthFogPass.uniforms.fogFar.value = this.passes.fogFar;
            this.depthFogPass.uniforms.tDepth.value = this.depthPrepassDepthTexture;
        }

        // God rays (disabled by default; directors/moments opt-in)
        if (this.godRaysPass?.uniforms) {
            const intensity = Number.isFinite(this.godRaysPass.uniforms.intensity?.value)
                ? this.godRaysPass.uniforms.intensity.value
                : 0;
            this.godRaysPass.enabled = !!this.effects.godRays && intensity > enableEps;
            this.godRaysPass.uniforms.exposure.value = this.passes.godRaysExposure;
            this.godRaysPass.uniforms.decay.value = this.passes.godRaysDecay;
            this.godRaysPass.uniforms.density.value = this.passes.godRaysDensity;
            this.godRaysPass.uniforms.weight.value = this.passes.godRaysWeight;
            this.godRaysPass.uniforms.threshold.value = this.passes.godRaysThreshold ?? 0.85;
            this.godRaysPass.uniforms.intensity.value = THREE.MathUtils.clamp(
                this.godRaysPass.uniforms.intensity.value,
                0,
                0.08
            );

            // PERF-GATE: If pass is disabled, force intensity to 0 so it can't linger on track switches.
            if (!this.godRaysPass.enabled) {
                this.godRaysPass.uniforms.intensity.value = 0;
            }
        }

        // FXAA (final pass)
        if (this.fxaaPass) {
            this.fxaaPass.enabled = !!this.effects.fxaa;
        }
    }

    update(deltaTime) {
        const dt = Number.isFinite(deltaTime) ? Math.min(Math.max(deltaTime, 0), 0.1) : 0;

        // Update animated effects
        if (this.filmGrainPass?.enabled) {
            if (!Number.isFinite(this.filmGrainPass.uniforms['time'].value)) {
                this.filmGrainPass.uniforms['time'].value = 0;
            }
            this.filmGrainPass.uniforms['time'].value += dt * 0.5;

            // MP-TJ-BlueNoise-01: Increment frame counter for blue noise
            if (this.filmGrainPass.uniforms['useBlueNoise']?.value) {
                this.grainFrameCounter = (this.grainFrameCounter + 1) % 3;
                this.filmGrainPass.uniforms['uFrame'].value = this.grainFrameCounter;
            }
        }

        // BLOOM-IMPULSE: Update bloom impulse decay
        this._updateBloomImpulse(dt);

        // CINEMATIC-FIX: Update fog transition
        this._updateFogTransition(dt);

        // A.2: Update bloom transition
        this._updateBloomTransition();

        // A.2: Update brightness transition
        this._updateBrightnessTransition();

        // A.2: Update warmth transition
        this._updateWarmthTransition();

        // A.2: Update fog color transition
        this._updateFogColorTransition();

        // PHASE-TARGETS: Smooth lerp vignette toward target
        if (this.vignettePass && this.vignetteTarget !== undefined) {
            const currentVignette = Number.isFinite(this.vignettePass.uniforms['offset']?.value)
                ? this.vignettePass.uniforms['offset'].value
                : this.passes.vignetteStrength;
            const targetVignette = Number.isFinite(this.vignetteTarget)
                ? this.vignetteTarget
                : this.passes.vignetteStrength;
            const lerpFactor = 1.0 - Math.pow(0.01, dt); // Smooth easing
            const newVignette = currentVignette + (targetVignette - currentVignette) * lerpFactor;
            this.vignettePass.uniforms['offset'].value = newVignette;
        }

        // PHASE-TARGETS: Smooth lerp bloom toward target (only if no impulse active)
        if (this.bloomPass && this.bloomTarget !== undefined && !this._bloomImpulse.active) {
            const currentBloom = Number.isFinite(this.bloomPass.strength)
                ? this.bloomPass.strength
                : this.passes.bloomStrength;
            const targetBloom = Number.isFinite(this.bloomTarget)
                ? this.bloomTarget
                : this.passes.bloomStrength;
            const lerpFactor = 1.0 - Math.pow(0.02, dt); // Slightly faster for bloom
            const newBloom = currentBloom + (targetBloom - currentBloom) * lerpFactor;
            this.bloomPass.strength = Math.min(0.6, newBloom); // CAP at 0.6 per Expert Panel
        }

        // PERF-GATE (dynamic): ensure “off” means no work, even when targets/transitions drive values.
        // This prevents long-session slowdown from passes staying enabled at ~0 intensity.
        const enableEps = 0.001;

        // Bloom
        if (this.bloomPass) {
            const strength = Number.isFinite(this.bloomPass.strength) ? this.bloomPass.strength : 0;
            const isDriven = !!this._bloomTransition || this.bloomTarget !== undefined || !!this._bloomImpulse?.active;
            const bloomEnabled = (!!this.effects.bloom || isDriven) && strength > enableEps;
            this.bloomPass.enabled = bloomEnabled;
            if (!bloomEnabled) {
                this.bloomPass.strength = 0;
            }
        }

        // Vignette
        if (this.vignettePass?.uniforms?.['offset']) {
            const strength = Number.isFinite(this.vignettePass.uniforms['offset'].value)
                ? this.vignettePass.uniforms['offset'].value
                : 0;
            const isDriven = this.vignetteTarget !== undefined;
            const vignetteEnabled = (!!this.effects.vignette || isDriven) && strength > enableEps;
            this.vignettePass.enabled = vignetteEnabled;
            if (!vignetteEnabled) {
                this.vignettePass.uniforms['offset'].value = 0;
            }
        }

        // Film grain
        if (this.filmGrainPass?.uniforms?.['intensity']) {
            const intensity = Number.isFinite(this.filmGrainPass.uniforms['intensity'].value)
                ? this.filmGrainPass.uniforms['intensity'].value
                : 0;
            const grainEnabled = !!this.effects.filmGrain && intensity > enableEps;
            this.filmGrainPass.enabled = grainEnabled;
            if (!grainEnabled) {
                this.filmGrainPass.uniforms['intensity'].value = 0;
            }
        }

        // God rays
        if (this.godRaysPass?.uniforms?.intensity) {
            const intensityRaw = Number.isFinite(this.godRaysPass.uniforms.intensity.value)
                ? this.godRaysPass.uniforms.intensity.value
                : 0;
            const intensity = THREE.MathUtils.clamp(intensityRaw, 0, 0.08);
            const godRaysEnabled = !!this.effects.godRays && intensity > enableEps;
            this.godRaysPass.enabled = godRaysEnabled;
            this.godRaysPass.uniforms.intensity.value = godRaysEnabled ? intensity : 0;
        }

        // TRACK5-PASSES: Update singularity lens controller only while active.
        const lensActive = !!this.singularityLensPass?.enabled || !!this.effects.singularityLens;
        if (this.singularityLensController && lensActive) {
            this.singularityLensController.update(dt, this._lastAudioData || {});
        }

        // TRACK6-PASSES: Update heat haze controller only while active.
        const hazeActive = !!this.heatHazePass?.enabled || !!this.effects.heatHaze;
        if (this.heatHazeController && hazeActive) {
            this.heatHazeController.update(dt, this._lastAudioData || {});
        }
    }

    /**
     * MP-Perf-02: Toggle post-processing on/off
     * @param {boolean} enabled - Enable or disable post-processing
     * @returns {boolean} The new enabled state
     */
    setEnabled(enabled) {
        const wasEnabled = this.enabled;
        this.enabled = !!enabled;

        if (wasEnabled !== this.enabled && window.SONOITE_DEBUG) {
            console.log(`[MP-Perf-02] Post-processing ${this.enabled ? 'enabled' : 'disabled'}`);
        }

        // Save preference
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('sonoite_postfx', this.enabled ? '1' : '0');
        }

        return this.enabled;
    }

    /**
     * MP-POST-Grain-01: Toggle individual effect passes
     * MP10-FIX: Added scanlines support
     * @param {string} effectName - 'grain' | 'bloom' | 'vignette' | 'fxaa' | 'scanlines'
     * @param {boolean} [state] - Optional explicit state; if omitted, toggles current state
     * @returns {boolean} The new state of the effect
     */
    toggle(effectName, state) {
        const passMap = {
            'grain': this.filmGrainPass,
            'bloom': this.bloomPass,
            'vignette': this.vignettePass,
            'scanlines': this.scanlinePass,
            'godRays': this.godRaysPass,  // CINEMATIC-OVERHAUL
            'singularityLens': this.singularityLensPass,  // TRACK5-PASSES
            'heatHaze': this.heatHazePass,  // TRACK6-PASSES
            'fxaa': this.fxaaPass
        };

        const pass = passMap[effectName];
        if (!pass) {
            console.warn(`[PostProcessing] Unknown effect: ${effectName}`);
            return false;
        }

        // Toggle or set explicit state
        const newState = state !== undefined ? !!state : !pass.enabled;
        pass.enabled = newState;

        // Update internal effects tracking
        const effectsMap = {
            'grain': 'filmGrain',
            'bloom': 'bloom',
            'vignette': 'vignette',
            'scanlines': 'scanlines',
            'godRays': 'godRays',  // CINEMATIC-OVERHAUL
            'singularityLens': 'singularityLens',  // TRACK5-PASSES
            'heatHaze': 'heatHaze',  // TRACK6-PASSES
            'fxaa': 'fxaa'
        };

        if (effectsMap[effectName] && this.effects.hasOwnProperty(effectsMap[effectName])) {
            this.effects[effectsMap[effectName]] = newState;
        }

        if (window.SONOITE_DEBUG) {
            console.log(`[MP-POST-Grain-01] ${effectName}: ${newState ? 'ON' : 'OFF'}`);
        }

        return newState;
    }

    /**
     * MP-TJ-Degrade-05: Apply quality preset
     * @param {string} preset - 'high', 'balanced', or 'low'
     */
    applyPreset(preset) {
        if (!this.presets[preset]) {
            console.warn(`Unknown preset: ${preset}`);
            return;
        }

        const settings = this.presets[preset];
        this.currentPreset = preset;

        // Apply to internal state
        Object.assign(this.passes, settings);

        // Keep opt-in effects in sync with preset flags (prevents cross-track leakage).
        // NOTE: `passes.godRaysEnabled` is a preset-level policy gate; the actual pass enable is `effects.godRays`.
        if (typeof settings.godRaysEnabled === 'boolean') {
            this.effects.godRays = settings.godRaysEnabled;
            if (this.godRaysPass?.uniforms) {
                const clampedIntensity = THREE.MathUtils.clamp(
                    Number.isFinite(settings.godRaysIntensity) ? settings.godRaysIntensity : 0,
                    0,
                    0.08
                );
                this.godRaysPass.uniforms.intensity.value = this.effects.godRays ? clampedIntensity : 0;
                this.godRaysPass.enabled = this.effects.godRays;
            }
        }

        // FXAA may be toggled per preset
        if (typeof settings.fxaa === 'boolean') {
            this.effects.fxaa = settings.fxaa;
        }

        // Update live passes
        if (this.bloomPass) {
            this.bloomPass.strength = settings.bloomStrength;
            this.bloomPass.radius = settings.bloomRadius;
            this.bloomPass.threshold = settings.bloomThreshold;
        }

        if (this.vignettePass?.uniforms) {
            this.vignettePass.uniforms.offset.value = settings.vignetteStrength;
            // MP-POST-Presets-02: Update darkness from preset
            if (settings.vignetteDarkness !== undefined) {
                this.vignettePass.uniforms.darkness.value = settings.vignetteDarkness;
            }
        }

        if (this.filmGrainPass?.uniforms) {
            this.filmGrainPass.uniforms.intensity.value = settings.grainIntensity;
        }

        // Keep global brightness deterministic per preset (prevents cross-track leakage).
        // Presets without an explicit brightness target default to neutral 1.0.
        const presetBrightness = Number.isFinite(settings.brightness) ? settings.brightness : 1.0;
        this.setBrightness(presetBrightness);
        if (Number.isFinite(settings.warmth)) {
            this.setWarmth(settings.warmth);
        } else {
            this.setWarmth(1.0);
        }

        this.updatePipeline();

        if (window.SONOITE_DEBUG) {
            console.log(`[MP-POST-Presets-02] Applied preset: ${preset}`, settings);
        }
    }

    /**
     * MP-TJ-Degrade-05: Auto-trim on poor/critical performance
     * Progressive degradation: FXAA off → bloom ×0.7 → shadows off
     * @param {string} performanceRating - 'excellent', 'good', 'poor', 'critical'
     */
    autoTrim(performanceRating) {
        // Only apply changes when rating changes to avoid per-frame operations
        if (performanceRating === this.lastPerformanceRating) {
            return;
        }

        const wasPoor = this.lastPerformanceRating === 'poor' || this.lastPerformanceRating === 'critical';
        const isPoor = performanceRating === 'poor' || performanceRating === 'critical';

        this.lastPerformanceRating = performanceRating;

        if (isPoor && !wasPoor) {
            // Degrading: Apply performance optimizations
            // Step 0: Reduce post FX internal resolution (biggest GPU win).
            this._composerPixelRatioCapOverride = Math.min(this._getComposerPixelRatioCap(), 1.0);
            this._syncComposerResolution(window.innerWidth, window.innerHeight);

            // Step 1: Disable FXAA
            if (this.fxaaPass) {
                this.fxaaPass.enabled = false;
            }

            // Step 1.5: Disable depth fog (saves an extra depth pre-pass render)
            if (this.effects.depthFog) {
                this.effects.depthFog = false;
                if (this.depthFogPass) {
                    this.depthFogPass.enabled = false;
                }
            }

            // Step 2: Reduce bloom strength/radius by 30%
            if (this.bloomPass) {
                this.bloomPass.strength *= 0.7;
                this.bloomPass.radius *= 0.7;
            }

            // Step 3: Signal to disable shadows (handled by three-experience.js)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('postfxAutoTrim', {
                    detail: { action: 'disableShadows', performanceRating }
                }));
            }

            if (window.SONOITE_DEBUG) {
                console.log(`[MP-TJ-Degrade-05] Auto-trim applied for ${performanceRating} performance`);
            }
        } else if (!isPoor && wasPoor) {
            // Improving: Restore settings
            this._composerPixelRatioCapOverride = null;
            this._syncComposerResolution(window.innerWidth, window.innerHeight);

            // Restore user preference for fog
            this.effects.depthFog = !!window.SONOITE_VOL_FOG;
            this.applyPreset(this.currentPreset);

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('postfxAutoTrim', {
                    detail: { action: 'enableShadows', performanceRating }
                }));
            }

            if (window.SONOITE_DEBUG) {
                console.log(`[MP-TJ-Degrade-05] Performance improved, restored to ${this.currentPreset} preset`);
            }
        }
    }

    render() {
        if (!this.enabled || !this.composer) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // MP-TJ-Timing-06: Track timings only in debug/profile modes.
        const shouldTrackTiming = !!window.SONOITE_DEBUG || !!window.SONOITE_PROFILE || !!window.__sonoiteProfile?.active;
        const totalStart = shouldTrackTiming ? performance.now() : 0;

        // MP-FOG-DEPTH: Render depth pre-pass once per frame (only if fog is enabled)
        if (this.effects.depthFog && this.depthFogPass?.enabled) {
            this._renderDepthPrepass();
        }

        // Render with post-processing composer
        this.composer.render();

        if (shouldTrackTiming) {
            const totalTime = performance.now() - totalStart;
            this.trackTiming('total', totalTime);

            // MP10-FIX: Periodic timing validation (every 60 frames)
            if (window.SONOITE_DEBUG && Math.random() < 0.016) { // ~1 in 60 frames
                this.validateTiming();
            }
        }
    }

    /**
     * MP-TJ-Timing-06: Track timing for a pass
     * @param {string} passName - Name of the pass
     * @param {number} time - Time in milliseconds
     */
    trackTiming(passName, time) {
        if (!this.timings[passName]) return;

        this.timings[passName].push(time);
        if (this.timings[passName].length > this.maxSamples) {
            this.timings[passName].shift();
        }
    }

    /**
     * MP-TJ-Timing-06: Get average timings for all passes
     * @returns {Object} Average timings per pass
     */
    getTimings() {
        const averages = {};

        for (const passName in this.timings) {
            const samples = this.timings[passName];
            if (samples.length === 0) {
                averages[passName] = 0;
            } else {
                const sum = samples.reduce((a, b) => a + b, 0);
                averages[passName] = (sum / samples.length).toFixed(3);
            }
        }

        return averages;
    }

    /**
     * MP10-FIX: Runtime timing validation
     * Checks if post-processing exceeds 2ms budget and returns status
     * @returns {Object} { withinBudget: boolean, total: number, threshold: number, utilization: string }
     */
    validateTiming() {
        const timings = this.getTimings();
        const total = parseFloat(timings.total) || 0;
        const threshold = 2.0; // 2ms budget from MP10 spec
        const withinBudget = total <= threshold;

        if (!withinBudget && window.SONOITE_DEBUG) {
            console.warn(`[MP10-Timing] Post-FX exceeds budget: ${total.toFixed(2)}ms / ${threshold}ms`);
        }

        return {
            withinBudget,
            total,
            threshold,
            utilization: (total / threshold * 100).toFixed(1) + '%'
        };
    }

    setSize(width, height) {
        if (this.composer) {
            this._syncComposerResolution(width, height);
        }

        // P1-PERF: Update bloom pass at scaled resolution
        if (this.bloomPass) {
            const bloomWidth = Math.floor(width * this.bloomResolutionScale);
            const bloomHeight = Math.floor(height * this.bloomResolutionScale);
            this.bloomPass.setSize(bloomWidth, bloomHeight);
        }

        this.updatePipeline();
    }

    dispose() {
        this.enabled = false;
        if (this.composer) {
            // Dispose all passes
            if (this.composer.passes) {
                this.composer.passes.forEach(pass => {
                    if (pass.dispose) pass.dispose();
                });
            }
            this.composer.dispose?.();
            this.composer = null;
        }

        if (this.depthPrepassTarget) {
            this.depthPrepassTarget.dispose();
            this.depthPrepassTarget = null;
        }
        if (this.depthPrepassMaterial) {
            this.depthPrepassMaterial.dispose();
            this.depthPrepassMaterial = null;
        }
        this.depthPrepassDepthTexture = null;

        this.bloomPass = null;
        this.vignettePass = null;
        this.filmGrainPass = null;
        this.scanlinePass = null;  // MP10-FIX
        // TRACK5/6-PASSES: Clean up controllers and passes
        if (this.singularityLensController) {
            this.singularityLensController.reset();
            this.singularityLensController = null;
        }
        this.singularityLensPass = null;
        if (this.heatHazeController) {
            this.heatHazeController.reset();
            this.heatHazeController = null;
        }
        this.heatHazePass = null;
        this.fxaaPass = null;
    }

    /**
     * CINEMATIC-OVERHAUL: Audio-reactive bloom with controlled intensity
     * Re-enabled with capped values to prevent white-out while maintaining cinematic impact
     * BUG-006-FIX: Respects brightness pass during dark moments (THE_QUIET)
     */
    setBloomFromAudio(bassLevel, midsLevel, kickIntensity = 0) {
        // TRACK5/6-PASSES: Store audio data for controller updates
        this._lastAudioData = {
            bass: Number.isFinite(bassLevel) ? bassLevel : 0,
            mid: Number.isFinite(midsLevel) ? midsLevel : 0,
            kick: Number.isFinite(kickIntensity) ? kickIntensity : 0
        };

        if (!this.bloomPass || !this.effects.bloom) return;

        const safeBass = THREE.MathUtils.clamp(Number.isFinite(bassLevel) ? bassLevel : 0, 0, 1);
        const safeMids = THREE.MathUtils.clamp(Number.isFinite(midsLevel) ? midsLevel : 0, 0, 1);
        const safeKick = THREE.MathUtils.clamp(Number.isFinite(kickIntensity) ? kickIntensity : 0, 0, 1);

        // BUG-006-FIX: Respect brightness pass during dark moments
        const currentBrightness = this.brightnessPass?.uniforms?.brightness?.value || 1.0;

        if (currentBrightness < 0.3) {
            // Dark moment active - reduce audio reactivity to preserve darkness
            const darknessRatio = currentBrightness / 0.3;
            // Use dampened safe values to avoid NaNs propagating into bloom.
            bassLevel = safeBass * darknessRatio;
            kickIntensity = safeKick * darknessRatio;
            midsLevel = safeMids * darknessRatio;

            if (window.SONOITE_DEBUG && darknessRatio < 0.5) {
                console.log(`[PostFX] Audio bloom dampened (brightness: ${currentBrightness.toFixed(2)})`);
            }
        } else {
            bassLevel = safeBass;
            kickIntensity = safeKick;
            midsLevel = safeMids;
        }

        // Base values from current preset
        const baseStrength = Number.isFinite(this.passes.bloomStrength) ? this.passes.bloomStrength : 0.5;
        const baseRadius = Number.isFinite(this.passes.bloomRadius) ? this.passes.bloomRadius : 0.45;

        // INTENSITY-BOOST: Faster attack for punchier response
        const alphaAttack = 0.4;   // Faster attack for immediate impact
        const alphaDecay = 0.12;   // Slightly faster decay for more dynamic feel

        // Keep Track 5 VOID controlled: preserve black floor and avoid additive wash.
        const isVoidPreset = this.currentPreset === 'void';
        const bassBoost = bassLevel * (isVoidPreset ? 0.16 : 0.25);
        const kickBoost = kickIntensity * (isVoidPreset ? 0.12 : 0.2);
        const targetStrength = baseStrength + bassBoost + kickBoost;

        // Smooth transition
        const currentStrength = Number.isFinite(this.bloomPass.strength) ? this.bloomPass.strength : baseStrength;
        const strengthAlpha = (targetStrength > currentStrength) ? alphaAttack : alphaDecay;
        this.bloomPass.strength = currentStrength + (targetStrength - currentStrength) * strengthAlpha;

        // BLOOM-WASHOUT-FIX: Dynamic ceiling capped at 0.8 max (was 1.8)
        // Expert Panel consensus: bloom > 0.6 causes additive overload, 0.8 is absolute max
        const momentIntensity = Number.isFinite(this.currentMomentIntensity) ? this.currentMomentIntensity : 0;
        const dynamicCeiling = isVoidPreset
            ? THREE.MathUtils.lerp(0.44, 0.58, momentIntensity)
            : THREE.MathUtils.lerp(0.5, 0.8, momentIntensity);
        this.bloomPass.strength = THREE.MathUtils.clamp(this.bloomPass.strength, baseStrength * 0.85, dynamicCeiling);

        // INTENSITY-BOOST: Radius responds more to mids for atmospheric swelling
        const radiusBoost = midsLevel * (isVoidPreset ? 0.11 : 0.15);
        const targetRadius = baseRadius + radiusBoost;
        const currentRadius = Number.isFinite(this.bloomPass.radius) ? this.bloomPass.radius : baseRadius;
        const radiusAlpha = (targetRadius > currentRadius) ? alphaAttack : alphaDecay;
        this.bloomPass.radius = currentRadius + (targetRadius - currentRadius) * radiusAlpha;
        this.bloomPass.radius = THREE.MathUtils.clamp(this.bloomPass.radius, baseRadius * 0.9, 0.65);
    }

    /**
     * CINEMATIC-OVERHAUL: Audio-reactive god rays
     * God rays pulse with the music for cinematic impact
     */
    setGodRaysFromAudio(bassLevel, loudness) {
        if (!this.godRaysPass || !this.effects.godRays) return;

        // Policy: envelope-only by default; audio modulation is opt-in for tuning
        if (!window.SONOITE_GODRAYS_AUDIO) return;

        const safeBass = THREE.MathUtils.clamp(Number.isFinite(bassLevel) ? bassLevel : 0, 0, 1);
        const safeLoud = THREE.MathUtils.clamp(Number.isFinite(loudness) ? loudness : 0, 0, 1);

        const baseIntensity = Number.isFinite(this.passes.godRaysIntensity) ? this.passes.godRaysIntensity : 0.03;
        const audioBoost = (safeLoud * 0.01) + (safeBass * 0.02);
        const targetIntensity = THREE.MathUtils.clamp(baseIntensity + audioBoost, 0, 0.08);

        const currentIntensity = Number.isFinite(this.godRaysPass.uniforms.intensity.value)
            ? this.godRaysPass.uniforms.intensity.value
            : baseIntensity;
        const alpha = (targetIntensity > currentIntensity) ? 0.18 : 0.08;
        const newIntensity = currentIntensity + (targetIntensity - currentIntensity) * alpha;
        this.godRaysPass.uniforms.intensity.value = THREE.MathUtils.clamp(newIntensity, 0, 0.08);
    }

    /**
     * ATMOSPHERE-FIX: Audio-reactive fog density
     * Fog pulses slightly with bass/loudness for organic feel
     */
    setFogFromAudio(bassLevel, midsLevel, loudness) {
        if (!this.depthFogPass || !this.effects.depthFog) return;

        const baseDensity = this.passes.fogDensity || 0.045;
        const bassBoost = bassLevel * 0.015;
        const loudnessBoost = loudness * 0.010;
        const targetDensity = baseDensity + bassBoost + loudnessBoost;

        const currentDensity = this.depthFogPass.uniforms.fogDensity.value;
        const alpha = (targetDensity > currentDensity) ? 0.25 : 0.08;
        this.depthFogPass.uniforms.fogDensity.value = currentDensity + (targetDensity - currentDensity) * alpha;

        this.depthFogPass.uniforms.fogDensity.value = THREE.MathUtils.clamp(
            this.depthFogPass.uniforms.fogDensity.value,
            baseDensity * 0.8,
            baseDensity * 1.5
        );
    }

    getConfig() {
        return {
            enabled: this.enabled,
            effects: { ...this.effects },
            passes: { ...this.passes }
        };
    }
}

export default PostProcessingConfig;
