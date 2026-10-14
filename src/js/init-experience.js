/**
 * Initialize Sonoite Experience
 * Simple initialization to get the 3D experience working
 */

import { SonoiteExperience } from './three-experience.js';

// Global initialization tracking
window._sonoiteInitState = window._sonoiteInitState || {
    initialized: false,
    initializing: false
};

// Initialize on DOM ready
if (!window._sonoiteInitState.initialized && !window._sonoiteInitState.initializing) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Double-check initialization state
        if (window._sonoiteInitState.initialized || window._sonoiteInitState.initializing || window.SonoiteExperience) {
            console.warn('SonoiteExperience already initialized or initializing, skipping...');
            return;
        }
        window._sonoiteInitState.initializing = true;
    
    try {
        if (window.SONOITE_DEBUG) {
            console.log('Initializing Sonoite Experience...');
        }
        
        // Create and expose the experience globally
        const experience = new SonoiteExperience();
        window.SonoiteExperience = experience;
        
        // Initialize
        await experience.init();

        // SEC-06: Gate debug globals behind SONOITE_DEBUG flag
        // These helpers are only exposed when debug mode is enabled
        if (window.SONOITE_DEBUG) {
            // MP-DUMP-HELPER: Add debug helper for inspecting layer state
            window.dumpLayers = () => {
                if (!window.SonoiteExperience?.visualLayers) {
                    return { error: 'No visual layers found' };
                }
                return window.SonoiteExperience.visualLayers.map(l => ({
                    id: l.id,
                    name: l.name,
                    active: l.isActive?.(),
                    mounted: l.isMounted?.(),
                    hasGroup: !!l.group,
                    groupChildren: l.group?.children?.length || 0
                }));
            };

            // MP-Perf-04: Add performance breakdown helper
            window.perfBreakdown = async () => {
                // Access performanceOptimizer via import
                const { performanceOptimizer } = await import('./visuals/utils/PerformanceOptimizer.js');

                if (!performanceOptimizer) {
                    return { error: 'Performance optimizer not available' };
                }

                const breakdown = performanceOptimizer.getPerformanceBreakdown();
                if (!breakdown) {
                    return { error: 'No performance data yet' };
                }

                console.table(breakdown.averages);
                console.log(`Bottleneck: ${breakdown.bottleneck.phase} (${breakdown.bottleneck.time}ms, ${breakdown.bottleneck.percentage})`);

                return breakdown;
            };

            // MP-DIAG-03: Tiny diagnostic snapshot
            // Returns: renderer.info.render, post flags, layer names
            window.diag = () => {
                const exp = window.SonoiteExperience;
                if (!exp) return { error: 'SonoiteExperience not available' };

                return {
                    // Renderer stats (full info.render object)
                    renderer: exp.renderer?.info?.render || null,

                    // Post-processing flags
                    post: exp.postProcessing ? {
                        enabled: exp.postProcessing.enabled,
                        bloom: exp.postProcessing.bloomPass?.enabled ?? false,
                        vignette: exp.postProcessing.vignettePass?.enabled ?? false,
                        grain: exp.postProcessing.filmGrainPass?.enabled ?? false,
                        fxaa: exp.postProcessing.fxaaPass?.enabled ?? false
                    } : null,

                    // Layer names only (lightweight)
                    layers: exp.visualLayers?.map(l => l.name || l.constructor.name) || []
                };
            };

            // MP-REVIEW-01: DevTools-friendly snapshot for full-play journey review (no seek reliance).
            // Use in console while pressing Play and letting the journey run.
            window.journeySnapshot = () => {
                const exp = window.SonoiteExperience;
                if (!exp) return { error: 'SonoiteExperience not available' };

                const post = exp.postProcessing;
                const composer = post?.composer;
                const audio = exp.audioManager;
                const perf = window.sonoitePerformanceMonitor?.metrics;

                const passList = composer?.passes?.map((p) => ({
                    name: p?.name || p?.constructor?.name || 'UnknownPass',
                    enabled: !!p?.enabled,
                })) || [];
                const enabledPassCount = passList.reduce((acc, p) => acc + (p.enabled ? 1 : 0), 0);

                return {
                    track: exp.tracks?.[exp.currentTrackIndex] ? {
                        index: exp.currentTrackIndex,
                        title: exp.tracks[exp.currentTrackIndex].title,
                        slug: exp.tracks[exp.currentTrackIndex].slug,
                    } : null,
                    audio: audio ? {
                        isPlaying: !!audio.isPlaying,
                        isPaused: !!audio.isPaused,
                        currentTime: typeof audio.getCurrentTime === 'function' ? audio.getCurrentTime() : audio.currentTime,
                        duration: audio.duration,
                    } : null,
                    camera: exp.camera ? {
                        fov: exp.camera.fov,
                        position: exp.camera.position?.toArray?.() || null,
                        rotation: [exp.camera.rotation?.x, exp.camera.rotation?.y, exp.camera.rotation?.z],
                    } : null,
                    renderer: exp.renderer?.info ? {
                        pixelRatio: exp.renderer.getPixelRatio?.(),
                        pixelRatioCap: exp.renderPixelRatioCap,
                        pixelRatioCapOverride: exp._renderPixelRatioCapOverride,
                        memory: exp.renderer.info.memory,
                        render: exp.renderer.info.render,
                    } : null,
                    post: post ? {
                        enabled: !!post.enabled,
                        composerPixelRatio: composer?._pixelRatio,
                        composerPixelRatioCap: post.postPixelRatioCap,
                        composerPixelRatioCapOverride: post._composerPixelRatioCapOverride,
                        lastPerformanceRating: post.lastPerformanceRating,
                        enabledPassCount,
                        passes: {
                            bloom: post.bloomPass?.enabled ?? false,
                            depthFog: post.depthFogPass?.enabled ?? false,
                            godRays: post.godRaysPass?.enabled ?? false,
                            singularityLens: post.singularityLensPass?.enabled ?? false,
                            heatHaze: post.heatHazePass?.enabled ?? false,
                            chromaticAberration: post.chromaticAberrationPass?.enabled ?? false,
                            brightness: post.brightnessPass?.enabled ?? false,
                            warmth: post.warmthPass?.enabled ?? false,
                            vignette: post.vignettePass?.enabled ?? false,
                            grain: post.filmGrainPass?.enabled ?? false,
                            fxaa: post.fxaaPass?.enabled ?? false,
                        },
                        passList,
                    } : null,
                    performance: perf ? {
                        fps: perf.fps,
                        memory: perf.memory,
                    } : null,
                };
            };

            // MP-REVIEW-02: Lightweight full-play capture (interval snapshots) for DevTools review.
            // Usage:
            //   startJourneyCapture({ intervalMs: 1000 });
            //   // press Play and let it run
            //   stopJourneyCapture(); getJourneyCapture();
            window.startJourneyCapture = ({ intervalMs = 1000, maxSamples = 7200 } = {}) => {
                if (window.__journeyCapture?.timer) {
                    clearInterval(window.__journeyCapture.timer);
                }

                window.__journeyCapture = {
                    startedAt: new Date().toISOString(),
                    intervalMs,
                    maxSamples,
                    samples: [],
                    timer: null,
                };

                window.__journeyCapture.timer = setInterval(() => {
                    try {
                        if (!window.__journeyCapture) return;
                        const samples = window.__journeyCapture.samples;
                        if (samples.length >= window.__journeyCapture.maxSamples) {
                            clearInterval(window.__journeyCapture.timer);
                            window.__journeyCapture.timer = null;
                            return;
                        }
                        samples.push(window.journeySnapshot());
                    } catch (err) {
                        // Fail closed: stop capture on unexpected errors (avoid flooding console).
                        clearInterval(window.__journeyCapture.timer);
                        window.__journeyCapture.timer = null;
                    }
                }, Math.max(250, intervalMs));

                return {
                    ok: true,
                    startedAt: window.__journeyCapture.startedAt,
                    intervalMs: window.__journeyCapture.intervalMs,
                    maxSamples: window.__journeyCapture.maxSamples,
                };
            };

            window.stopJourneyCapture = () => {
                if (!window.__journeyCapture) return { ok: false, reason: 'not started' };
                if (window.__journeyCapture.timer) {
                    clearInterval(window.__journeyCapture.timer);
                    window.__journeyCapture.timer = null;
                }
                window.__journeyCapture.stoppedAt = new Date().toISOString();
                return { ok: true, samples: window.__journeyCapture.samples.length };
            };

            window.getJourneyCapture = () => {
                return window.__journeyCapture || null;
            };
        }

        // ISS-004: Profiling helpers (gated by SONOITE_PROFILE, independent of SONOITE_DEBUG)
        if (window.SONOITE_PROFILE) {
            if (!window.__sonoiteProfile) {
                window.__sonoiteProfile = {
                    meta: {},
                    events: [],
                    buckets: [],
                    active: false,
                    sampleMs: 1000,
                    startedAt: null,
                    stoppedAt: null,
                    _bucket: null,
                    _lastPassSignature: null,
                    _lastComposerPR: null,
                    _lastComposerCap: null,
                    _lastComposerOverride: null,
                    lastAudioAnalysisTick: null
                };
            }

            const buildProfileMeta = () => {
                const exp = window.SonoiteExperience;
                const post = exp?.postProcessing || null;
                return {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    debug: !!window.SONOITE_DEBUG,
                    profile: !!window.SONOITE_PROFILE,
                    track: exp?.tracks?.[exp.currentTrackIndex]?.slug || null,
                    postprcap: post?.postPixelRatioCap ?? null,
                    prcap: exp?.renderPixelRatioCap ?? null
                };
            };

            window.startProfileCapture = ({ sampleMs = 1000 } = {}) => {
                const profile = window.__sonoiteProfile;
                if (!profile) return { ok: false, reason: 'profile not initialized' };

                profile.sampleMs = Math.max(250, Number(sampleMs) || 1000);
                profile.events = [];
                profile.buckets = [];
                profile._bucket = null;
                profile._lastPassSignature = null;
                profile._lastComposerPR = null;
                profile._lastComposerCap = null;
                profile._lastComposerOverride = null;
                profile.startedAt = new Date().toISOString();
                profile.stoppedAt = null;
                profile.meta = buildProfileMeta();
                profile.active = true;

                return {
                    ok: true,
                    startedAt: profile.startedAt,
                    sampleMs: profile.sampleMs
                };
            };

            window.stopProfileCapture = () => {
                const profile = window.__sonoiteProfile;
                if (!profile || !profile.active) return { ok: false, reason: 'not active' };
                profile.active = false;
                profile.stoppedAt = new Date().toISOString();
                return { ok: true, buckets: profile.buckets.length, events: profile.events.length };
            };

            window.getProfileCapture = () => {
                return window.__sonoiteProfile || null;
            };

            window.printProfileSummary = () => {
                const profile = window.__sonoiteProfile;
                if (!profile) return { ok: false, reason: 'profile not initialized' };
                const summary = {
                    active: !!profile.active,
                    buckets: profile.buckets.length,
                    events: profile.events.length,
                    startedAt: profile.startedAt,
                    stoppedAt: profile.stoppedAt
                };
                console.log('[SONOITE_PROFILE] Summary:', summary);
                return summary;
            };
        }

        // MP-TJ-Timing-06: Expose postfx for timing API (always available for runtime control)
        if (experience.postProcessing) {
            window.postfx = experience.postProcessing;
        }

        if (window.SONOITE_DEBUG) {
            console.log('Sonoite Experience initialized successfully');
            console.log('Debug helpers: window.dumpLayers(), window.perfBreakdown(), window.postfx.getTimings(), window.diag()');
        }
        window._sonoiteInitState.initialized = true;
        window._sonoiteInitState.initializing = false;
    } catch (error) {
        console.error('Failed to initialize Sonoite Experience:', error);
        window._sonoiteInitState.initializing = false;
        
        // Show error message to user
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const loadingText = loadingScreen.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = 'Failed to initialize. Please refresh the page.';
            }
        }
    }
});
}

// Export for module usage
export { SonoiteExperience };
