/**
 * Performance Monitor for Sonoite Three.js Experience
 * Automatic quality tier detection and scaling system
 */

import { WebGLRenderer } from 'three';

export const QUALITY_LEVELS = {
    LOW: { 
        particleCount: 5000, 
        usePostProcessing: false,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasing: false,
        maxLights: 2,
        lodBias: 2
    },
    MEDIUM: { 
        particleCount: 20000, 
        usePostProcessing: true,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasing: true,
        maxLights: 4,
        lodBias: 1
    },
    HIGH: { 
        particleCount: 100000, 
        usePostProcessing: true,
        textureSize: 4096,
        shadowQuality: 'high',
        antialiasing: true,
        maxLights: 8,
        lodBias: 0
    },
};

class PerformanceMonitor {
    constructor() {
        this.level = 'MEDIUM'; // Default fallback
        this.currentFPS = 60;
        this.frameHistory = [];
        this.isMonitoring = false;
        this.optimizationCallbacks = new Set();
        this.performanceThresholds = {
            lowFPS: 25,
            mediumFPS: 45,
            highFPS: 55
        };
    }

    /**
     * Detect GPU capabilities and set quality level
     */
    async detect() {
        try {
            const renderer = new WebGLRenderer({ antialias: false });
            const gl = renderer.getContext();
            
            // Get GPU information
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const gpu = debugInfo ? 
                gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
            
            // Get WebGL capabilities
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
            const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
            
            // Check for important extensions
            const hasFloatTextures = !!gl.getExtension('OES_texture_float');
            const hasInstancedArrays = !!gl.getExtension('ANGLE_instanced_arrays');
            const hasVertexArrayObjects = !!gl.getExtension('OES_vertex_array_object');
            
            renderer.dispose();

            // GPU-based quality detection
            if (this.isHighEndGPU(gpu)) {
                this.level = 'HIGH';
            } else if (this.isMidRangeGPU(gpu)) {
                this.level = 'MEDIUM';
            } else {
                this.level = 'LOW';
            }

            // Additional capability checks
            if (maxTextureSize < 2048 || !hasFloatTextures) {
                this.level = 'LOW';
            } else if (maxTextureSize < 4096 || !hasInstancedArrays) {
                this.level = this.level === 'HIGH' ? 'MEDIUM' : this.level;
            }

            // Memory constraints
            if (navigator.deviceMemory && navigator.deviceMemory < 4) {
                this.level = this.level === 'HIGH' ? 'MEDIUM' : 'LOW';
            }

            // Battery level considerations
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                if (battery.level < 0.2 && !battery.charging) {
                    this.level = 'LOW';
                }
            }

            console.log(`🎮 Performance Monitor: Detected ${this.level} quality level`);
            console.log(`📊 GPU: ${gpu}`);
            console.log(`🔧 Max Texture Size: ${maxTextureSize}`);
            
            return this.getSettings();
        } catch (error) {
            console.warn('⚠️ Performance detection failed, using MEDIUM quality:', error);
            this.level = 'MEDIUM';
            return this.getSettings();
        }
    }

    /**
     * Check if GPU is high-end
     */
    isHighEndGPU(gpu) {
        const highEndPatterns = [
            /NVIDIA.*(RTX\s*40\d0|RTX\s*30\d0|GTX\s*1080|GTX\s*1070)/i,
            /AMD.*(RX\s*7\d00|RX\s*6\d00|RX\s*5700)/i,
            /Apple.*M[2-9]/i,
            /Mali.*G78|Mali.*G710|Mali.*G715/i,
            /Adreno.*7\d0|Adreno.*6\d0/i
        ];
        
        return highEndPatterns.some(pattern => pattern.test(gpu));
    }

    /**
     * Check if GPU is mid-range
     */
    isMidRangeGPU(gpu) {
        const midRangePatterns = [
            /NVIDIA.*(GTX\s*16\d0|GTX\s*10[5-6]0|RTX\s*20\d0)/i,
            /AMD.*(RX\s*5\d00|RX\s*4\d0|RX\s*3\d0)/i,
            /Apple.*M1/i,
            /Intel.*Iris.*Xe|Intel.*UHD.*7\d0/i,
            /Mali.*G76|Mali.*G72|Mali.*G71/i,
            /Adreno.*5\d0|Adreno.*4\d0/i
        ];
        
        return midRangePatterns.some(pattern => pattern.test(gpu));
    }

    /**
     * Get current quality settings
     */
    getSettings() {
        return QUALITY_LEVELS[this.level];
    }

    /**
     * Start real-time performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitorFPS();
        
        console.log('📈 Performance monitoring started');
    }

    /**
     * Monitor FPS and trigger optimizations
     */
    monitorFPS() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFrame = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.frameHistory.push(this.currentFPS);
                
                // Keep only last 10 seconds of data
                if (this.frameHistory.length > 10) {
                    this.frameHistory.shift();
                }
                
                // Check if optimization is needed
                this.evaluatePerformance();
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFrame);
            }
        };
        
        requestAnimationFrame(measureFrame);
    }

    /**
     * Evaluate current performance and trigger optimizations
     */
    evaluatePerformance() {
        const avgFPS = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
        
        // Only act on sustained performance issues
        if (this.frameHistory.length < 3) return;
        
        const thresholds = this.performanceThresholds;
        let targetLevel = this.level;
        
        if (avgFPS < thresholds.lowFPS && this.level !== 'LOW') {
            targetLevel = this.level === 'HIGH' ? 'MEDIUM' : 'LOW';
            console.warn(`⚡ Performance: Downgrading to ${targetLevel} (${avgFPS.toFixed(1)} FPS)`);
        } else if (avgFPS > thresholds.highFPS && this.level !== 'HIGH') {
            targetLevel = this.level === 'LOW' ? 'MEDIUM' : 'HIGH';
            console.info(`🚀 Performance: Upgrading to ${targetLevel} (${avgFPS.toFixed(1)} FPS)`);
        }
        
        if (targetLevel !== this.level) {
            this.setQualityLevel(targetLevel);
        }
    }

    /**
     * Manually set quality level
     */
    setQualityLevel(level) {
        if (!QUALITY_LEVELS[level]) {
            console.warn(`❌ Invalid quality level: ${level}`);
            return;
        }
        
        const oldLevel = this.level;
        this.level = level;
        
        // Clear frame history to prevent immediate re-adjustment
        this.frameHistory = [];
        
        // Notify all registered callbacks
        this.optimizationCallbacks.forEach(callback => {
            try {
                callback(this.getSettings(), oldLevel, level);
            } catch (error) {
                console.error('Optimization callback failed:', error);
            }
        });
        
        console.log(`🎯 Quality level changed: ${oldLevel} → ${level}`);
    }

    /**
     * Register callback for quality level changes
     */
    onQualityChange(callback) {
        this.optimizationCallbacks.add(callback);
        return () => this.optimizationCallbacks.delete(callback);
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            currentLevel: this.level,
            currentFPS: this.currentFPS,
            averageFPS: this.frameHistory.length > 0 ? 
                this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length : 0,
            settings: this.getSettings(),
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * Force optimization for specific scenarios
     */
    optimizeForScenario(scenario) {
        switch (scenario) {
            case 'supernova':
                // Temporarily reduce quality for intensive scenes
                if (this.level === 'HIGH') {
                    this.setQualityLevel('MEDIUM');
                } else if (this.level === 'MEDIUM') {
                    this.setQualityLevel('LOW');
                }
                break;
                
            case 'mobile':
                // Optimize for mobile devices
                this.setQualityLevel('LOW');
                break;
                
            case 'battery_low':
                // Optimize for low battery
                this.setQualityLevel('LOW');
                break;
        }
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('📉 Performance monitoring stopped');
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopMonitoring();
        this.optimizationCallbacks.clear();
        this.frameHistory = [];
    }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-detect quality on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await performanceMonitor.detect();
        performanceMonitor.startMonitoring();
    } catch (error) {
        console.error('Performance monitor initialization failed:', error);
    }
});