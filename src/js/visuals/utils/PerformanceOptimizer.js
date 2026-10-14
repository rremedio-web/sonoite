/**
 * PerformanceOptimizer - Optimize Visual Layer API performance
 * Manages frame rates, LOD, and adaptive quality for smooth visuals
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog, dwarn, derr } from '../../utils/devlog.js';

export class PerformanceOptimizer {
    constructor() {
        // Performance tracking
        this.frameTimeHistory = [];
        this.maxFrameHistory = 60; // Track last 60 frames
        this.targetFrameTime = 16.67; // 60 FPS target
        this.performanceMode = 'auto'; // auto, high, balanced, low

        // MP-LOOPS-04: Detect device tier
        this.deviceTier = this.detectDeviceTier();

        // Adaptive quality settings
        this.qualityLevel = 1.0; // 0.1 to 1.0
        this.adaptiveQualityEnabled = true;
        this.lastQualityAdjustment = 0;
        this.qualityAdjustmentDelay = 2000; // 2 seconds between adjustments

        // MP-LOOPS-04: Per-tier caps for particle counts
        this.tierCaps = {
            desktop: { maxCount: 5000, lodDistances: { high: 25, medium: 60, low: 120 } },
            mobile: { maxCount: 2000, lodDistances: { high: 15, medium: 40, low: 80 } },
            lowEnd: { maxCount: 800, lodDistances: { high: 10, medium: 25, low: 50 } }
        };

        // LOD (Level of Detail) settings - use tier-specific values
        this.lodEnabled = true;
        this.lodDistances = this.tierCaps[this.deviceTier].lodDistances;

        // Performance thresholds
        this.thresholds = {
            excellent: 14,  // < 14ms = excellent (>70fps)
            good: 20,       // < 20ms = good (>50fps)
            poor: 33,       // < 33ms = poor (>30fps)
            critical: 50    // > 50ms = critical (<20fps)
        };

        // Optimization strategies
        this.optimizations = {
            reduceParticleCount: false,
            simplifyShaders: false,
            reduceRenderResolution: false,
            disableBloom: false,
            skipFrames: false
        };

        this.skipFrameCounter = 0;
        this.skipFrameInterval = 1; // Skip every N frames when needed

        // MP-Perf-03: Degradation state
        this.degradationLevel = 0;
        this.degradationHistory = [];
        this.maxDegradation = 4;
        this.lowFpsFrames = 0;
        this.goodFpsFrames = 0;
        this.degradationDelay = 180; // frames @ 30fps = 6 seconds
        this.improvementDelay = 300; // frames @ 50fps = 6 seconds

        // MP-Perf-04: Frame breakdown tracking
        this.frameBreakdowns = [];
        this.maxBreakdowns = 60;

        if (window.SONOITE_DEBUG) {
            dlog('[MP-Perf-03] Performance optimizer initialized with auto-degradation');
            this.logActiveCaps();
        }
    }

    /**
     * MP-LOOPS-04: Detect device tier based on capabilities
     * @returns {string} 'desktop', 'mobile', or 'lowEnd'
     */
    detectDeviceTier() {
        // Check if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Check memory if available (Chrome/Edge)
        const memory = navigator.deviceMemory; // GB, undefined on Firefox/Safari

        // Check hardware concurrency (CPU cores)
        const cores = navigator.hardwareConcurrency || 4;

        // Tier detection logic
        if (!isMobile && cores >= 6 && (!memory || memory >= 8)) {
            return 'desktop'; // High-end desktop
        } else if (isMobile || cores <= 2 || (memory && memory < 4)) {
            return 'lowEnd'; // Low-end mobile or old desktop
        } else {
            return 'mobile'; // Mid-range mobile or modest desktop
        }
    }

    /**
     * MP-LOOPS-04: Log active caps and performance rating
     */
    logActiveCaps() {
        if (!window.SONOITE_DEBUG) return;

        const metrics = this.getPerformanceMetrics();
        const caps = this.tierCaps[this.deviceTier];

        console.group('🎮 [MP-LOOPS-04] Performance Caps');
        console.log(`Device Tier: ${this.deviceTier}`);
        console.log(`Max Particle Count: ${caps.maxCount}`);
        console.log(`LOD Distances:`, caps.lodDistances);
        console.log(`Performance Rating: ${metrics.performanceRating}`);
        console.log(`Current FPS: ${metrics.fps}`);
        console.log(`Quality Level: ${(this.qualityLevel * 100).toFixed(0)}%`);
        console.log(`Active Optimizations: ${metrics.optimizationsActive}`);
        console.groupEnd();
    }

    /**
     * Track frame performance
     * @param {number} frameTime - Frame time in milliseconds
     */
    trackFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);

        // Keep history size manageable
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }

        // Adaptive quality adjustment
        if (this.adaptiveQualityEnabled) {
            this.adjustQualityIfNeeded();
        }

        // MP-Perf-03: Auto-degradation based on sustained low FPS
        const metrics = this.getPerformanceMetrics();
        const fps = metrics.fps;

        // Degrade if FPS low for sustained period
        if (fps < 30 && this.degradationLevel < this.maxDegradation) {
            this.lowFpsFrames++;

            if (this.lowFpsFrames >= this.degradationDelay) {
                this.degradeQuality();
                this.lowFpsFrames = 0;
            }
        } else {
            this.lowFpsFrames = 0;
        }

        // Improve if FPS good for sustained period
        if (fps > 50 && this.degradationLevel > 0) {
            this.goodFpsFrames++;

            if (this.goodFpsFrames >= this.improvementDelay) {
                this.improveQuality();
                this.goodFpsFrames = 0;
            }
        } else {
            this.goodFpsFrames = 0;
        }
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        if (this.frameTimeHistory.length === 0) {
            return {
                averageFrameTime: 0,
                fps: 0,
                performanceRating: 'unknown',
                qualityLevel: this.qualityLevel
            };
        }

        const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
        const fps = 1000 / averageFrameTime;

        let performanceRating = 'excellent';
        if (averageFrameTime > this.thresholds.critical) performanceRating = 'critical';
        else if (averageFrameTime > this.thresholds.poor) performanceRating = 'poor';
        else if (averageFrameTime > this.thresholds.good) performanceRating = 'good';

        return {
            averageFrameTime: Math.round(averageFrameTime * 100) / 100,
            fps: Math.round(fps * 10) / 10,
            performanceRating,
            qualityLevel: this.qualityLevel,
            optimizationsActive: Object.values(this.optimizations).filter(Boolean).length
        };
    }

    /**
     * Adjust quality based on performance
     */
    adjustQualityIfNeeded() {
        const now = performance.now();
        if (now - this.lastQualityAdjustment < this.qualityAdjustmentDelay) {
            return; // Too soon since last adjustment
        }

        const metrics = this.getPerformanceMetrics();
        let shouldAdjust = false;
        let newQuality = this.qualityLevel;

        // Reduce quality if performance is poor
        if (metrics.performanceRating === 'critical' && this.qualityLevel > 0.3) {
            newQuality = Math.max(0.3, this.qualityLevel - 0.2);
            shouldAdjust = true;
        } else if (metrics.performanceRating === 'poor' && this.qualityLevel > 0.5) {
            newQuality = Math.max(0.5, this.qualityLevel - 0.1);
            shouldAdjust = true;
        }
        // Increase quality if performance is good
        else if (metrics.performanceRating === 'excellent' && this.qualityLevel < 1.0) {
            newQuality = Math.min(1.0, this.qualityLevel + 0.05);
            shouldAdjust = true;
        } else if (metrics.performanceRating === 'good' && this.qualityLevel < 0.9) {
            newQuality = Math.min(0.9, this.qualityLevel + 0.02);
            shouldAdjust = true;
        }

        if (shouldAdjust) {
            this.setQualityLevel(newQuality);
            this.lastQualityAdjustment = now;
            dlog(`🎛️ Quality adjusted: ${(this.qualityLevel * 100).toFixed(0)}% (Performance: ${metrics.performanceRating})`);
        }
    }

    /**
     * Set quality level and update optimizations
     * @param {number} quality - Quality level 0.1 to 1.0
     */
    setQualityLevel(quality) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, quality));

        // Update optimization flags based on quality
        this.optimizations.reduceParticleCount = this.qualityLevel < 0.7;
        this.optimizations.simplifyShaders = this.qualityLevel < 0.5;
        this.optimizations.reduceRenderResolution = this.qualityLevel < 0.4;
        this.optimizations.disableBloom = this.qualityLevel < 0.3;
        this.optimizations.skipFrames = this.qualityLevel < 0.2;

        // Update skip frame interval
        if (this.optimizations.skipFrames) {
            this.skipFrameInterval = this.qualityLevel < 0.15 ? 3 : 2;
        } else {
            this.skipFrameInterval = 1;
        }
    }

    /**
     * Get LOD level based on distance from camera
     * @param {number} distance - Distance from camera
     * @returns {string} LOD level: 'high', 'medium', 'low', 'cull'
     */
    getLODLevel(distance) {
        if (!this.lodEnabled) return 'high';

        if (distance <= this.lodDistances.high) return 'high';
        if (distance <= this.lodDistances.medium) return 'medium';
        if (distance <= this.lodDistances.low) return 'low';
        return 'cull'; // Don't render at all
    }

    /**
     * Get optimized settings for a visual layer
     * @param {string} layerType - Type of visual layer
     * @param {number} distance - Distance from camera (optional)
     * @returns {object} Optimization settings
     */
    getOptimizedSettings(layerType, distance = 0) {
        const lodLevel = this.getLODLevel(distance);
        const baseSettings = {
            qualityLevel: this.qualityLevel,
            lodLevel: lodLevel,
            shouldRender: lodLevel !== 'cull'
        };

        // Layer-specific optimizations
        switch (layerType) {
            case 'ParticleField':
                return {
                    ...baseSettings,
                    particleCount: this.getOptimizedParticleCount(2000),
                    updateFrequency: this.getUpdateFrequency()
                };

            case 'OrganicShapes':
                return {
                    ...baseSettings,
                    shapeCount: Math.max(2, Math.floor(5 * this.qualityLevel)),
                    geometryDetail: this.getGeometryDetail(),
                    enableMorphing: this.qualityLevel > 0.5
                };

            case 'WaveForm':
                return {
                    ...baseSettings,
                    segments: this.getOptimizedSegments(128),
                    surfaceEnabled: this.qualityLevel > 0.3
                };

            case 'GeometricGrid':
                return {
                    ...baseSettings,
                    gridSize: Math.max(4, Math.floor(8 * this.qualityLevel)),
                    animationComplexity: this.getAnimationComplexity()
                };

            case 'AudioReactiveSkybox':
                return {
                    ...baseSettings,
                    particleCount: this.getOptimizedParticleCount(200),
                    shaderComplexity: this.getShaderComplexity()
                };

            default:
                return baseSettings;
        }
    }

    /**
     * Get optimized particle count
     * MP-LOOPS-04: Enforce per-tier caps
     */
    getOptimizedParticleCount(baseCount) {
        const tierMaxCount = this.tierCaps[this.deviceTier].maxCount;
        let count;

        if (this.optimizations.reduceParticleCount) {
            count = Math.max(baseCount * 0.3, Math.floor(baseCount * this.qualityLevel));
        } else {
            count = Math.floor(baseCount * this.qualityLevel);
        }

        // MP-LOOPS-04: Apply tier-specific cap
        return Math.min(count, tierMaxCount);
    }

    /**
     * Get update frequency based on performance
     */
    getUpdateFrequency() {
        if (this.optimizations.skipFrames) {
            return 1 / this.skipFrameInterval;
        }
        return 1.0; // Every frame
    }

    /**
     * Get geometry detail level
     */
    getGeometryDetail() {
        if (this.qualityLevel > 0.8) return 'high';
        if (this.qualityLevel > 0.5) return 'medium';
        return 'low';
    }

    /**
     * Get optimized segment count
     */
    getOptimizedSegments(baseSegments) {
        return Math.max(32, Math.floor(baseSegments * this.qualityLevel));
    }

    /**
     * Get animation complexity level
     */
    getAnimationComplexity() {
        if (this.qualityLevel > 0.7) return 'high';
        if (this.qualityLevel > 0.4) return 'medium';
        return 'low';
    }

    /**
     * Get shader complexity level
     */
    getShaderComplexity() {
        if (this.optimizations.simplifyShaders) return 'low';
        if (this.qualityLevel > 0.6) return 'high';
        return 'medium';
    }

    /**
     * Check if frame should be skipped
     */
    shouldSkipFrame() {
        if (!this.optimizations.skipFrames) return false;

        this.skipFrameCounter++;
        if (this.skipFrameCounter >= this.skipFrameInterval) {
            this.skipFrameCounter = 0;
            return false; // Render this frame
        }
        return true; // Skip this frame
    }

    /**
     * Set performance mode
     * @param {string} mode - 'auto', 'high', 'balanced', 'low'
     */
    setPerformanceMode(mode) {
        this.performanceMode = mode;

        switch (mode) {
            case 'high':
                this.setQualityLevel(1.0);
                this.adaptiveQualityEnabled = false;
                break;
            case 'balanced':
                this.setQualityLevel(0.7);
                this.adaptiveQualityEnabled = false;
                break;
            case 'low':
                this.setQualityLevel(0.3);
                this.adaptiveQualityEnabled = false;
                break;
            case 'auto':
            default:
                this.adaptiveQualityEnabled = true;
                break;
        }

        dlog(`🎛️ Performance mode set to: ${mode}`);
    }

    /**
     * Enable/disable specific optimization
     */
    setOptimization(name, enabled) {
        if (this.optimizations.hasOwnProperty(name)) {
            this.optimizations[name] = enabled;
            dlog(`🔧 Optimization ${name}: ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get performance recommendations
     */
    getPerformanceRecommendations() {
        const metrics = this.getPerformanceMetrics();
        const recommendations = [];

        if (metrics.performanceRating === 'critical') {
            recommendations.push('Reduce visual quality settings');
            recommendations.push('Enable frame skipping');
            recommendations.push('Disable post-processing effects');
        } else if (metrics.performanceRating === 'poor') {
            recommendations.push('Reduce particle counts');
            recommendations.push('Simplify shaders');
            recommendations.push('Enable LOD system');
        } else if (metrics.performanceRating === 'excellent') {
            recommendations.push('Consider increasing visual quality');
            recommendations.push('Enable advanced effects');
        }

        return recommendations;
    }

    /**
     * MP-Perf-03: Degrade quality by one level
     */
    degradeQuality() {
        if (this.degradationLevel >= this.maxDegradation) {
            if (window.SONOITE_DEBUG) {
                dlog('[MP-Perf-03] Already at maximum degradation');
            }
            return;
        }

        this.degradationLevel++;
        this.degradationHistory.push({
            level: this.degradationLevel,
            time: Date.now(),
            fps: this.getPerformanceMetrics().fps
        });

        if (window.SONOITE_DEBUG) {
            dlog(`[MP-Perf-03] Degrading to level ${this.degradationLevel}`);
        }

        // Emit event for experience to handle
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('qualityDegrade', {
                detail: { level: this.degradationLevel }
            }));
        }
    }

    /**
     * MP-Perf-03: Improve quality by one level
     */
    improveQuality() {
        if (this.degradationLevel === 0) return;

        this.degradationLevel--;

        if (window.SONOITE_DEBUG) {
            dlog(`[MP-Perf-03] Improving to level ${this.degradationLevel}`);
        }

        window.dispatchEvent(new CustomEvent('qualityImprove', {
            detail: { level: this.degradationLevel }
        }));
    }

    /**
     * MP-Perf-04: Track frame breakdown by phase
     * @param {Object} timings - Breakdown of frame time by phase
     */
    trackFrameBreakdown(timings) {
        this.frameBreakdowns.push({
            timestamp: Date.now(),
            ...timings
        });

        // Keep size manageable
        if (this.frameBreakdowns.length > this.maxBreakdowns) {
            this.frameBreakdowns.shift();
        }
    }

    /**
     * MP-Perf-04: Get performance breakdown averages
     * @returns {Object|null} Breakdown averages
     */
    getPerformanceBreakdown() {
        if (this.frameBreakdowns.length === 0) {
            return null;
        }

        // Calculate averages
        const avg = {
            controls: 0,
            visualLayers: 0,
            legacy: 0,
            render: 0,
            total: 0
        };

        this.frameBreakdowns.forEach(frame => {
            avg.controls += frame.controls || 0;
            avg.visualLayers += frame.visualLayers || 0;
            avg.legacy += frame.legacy || 0;
            avg.render += frame.render || 0;
            avg.total += frame.total || 0;
        });

        const count = this.frameBreakdowns.length;
        Object.keys(avg).forEach(key => {
            avg[key] = (avg[key] / count).toFixed(2);
        });

        return {
            averages: avg,
            sampleCount: count,
            bottleneck: this.identifyBottleneck(avg)
        };
    }

    /**
     * MP-Perf-04: Identify performance bottleneck
     * @param {Object} avg - Average timings
     * @returns {Object} Bottleneck info
     */
    identifyBottleneck(avg) {
        const times = {
            controls: parseFloat(avg.controls),
            visualLayers: parseFloat(avg.visualLayers),
            legacy: parseFloat(avg.legacy),
            render: parseFloat(avg.render)
        };

        const max = Math.max(...Object.values(times));
        const bottleneck = Object.keys(times).find(k => times[k] === max);

        return {
            phase: bottleneck,
            time: max,
            percentage: ((max / parseFloat(avg.total)) * 100).toFixed(1) + '%'
        };
    }

    /**
     * Reset performance tracking
     */
    reset() {
        this.frameTimeHistory = [];
        this.setQualityLevel(1.0);
        this.skipFrameCounter = 0;
        this.degradationLevel = 0;
        this.degradationHistory = [];
        this.frameBreakdowns = [];
        this.lowFpsFrames = 0;
        this.goodFpsFrames = 0;
        dlog('🔄 Performance optimizer reset');
    }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

export default PerformanceOptimizer;