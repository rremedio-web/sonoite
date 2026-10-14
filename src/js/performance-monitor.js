/**
 * Sonoite Performance Monitoring System
 * Enterprise-level performance tracking and optimization
 */

export class SonoitePerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            memoryLimit: 200 * 1024 * 1024, // 200MB - Realistic for 3D visualizer (MP-Perf-01)
            fpsTarget: 60,
            fpsThreshold: 30,
            reportingInterval: 5000, // 5 seconds
            enableReporting: options.enableReporting !== false,
            enableOptimization: options.enableOptimization !== false,
            ...options
        };

        // Device-aware fallback if caller did not explicitly override memoryLimit
        if (!('memoryLimit' in options)) {
            try {
                const dm = navigator.deviceMemory || 4; // in GB
                const computedLimit = Math.min(dm * 50 * 1024 * 1024, 300 * 1024 * 1024); // 50MB/GB, cap 300MB
                // Keep the higher of the baseline 200MB or computed device-aware limit
                this.options.memoryLimit = Math.max(this.options.memoryLimit, computedLimit);
            } catch (e) {
                // Safe fallback: keep default 200MB
            }
        }

        this.metrics = {
            memory: { current: 0, peak: 0, limit: this.options.memoryLimit },
            fps: { current: 60, average: 60, samples: [] },
            loadTimes: { initial: 0, tracks: [], assets: [] },
            errors: { count: 0, types: new Map() },
            network: { bandwidth: 0, latency: 0, quality: 'unknown' },
            battery: { level: 1, charging: false },
            consciousness: { activeModules: 0, quality: 'high' }
        };

        this.observers = new Map();
        this.optimizations = new Map();
        this.isMonitoring = false;

        this.init();
    }

    async init() {
        try {
            this.setupPerformanceObservers();
            this.setupMemoryMonitoring();
            this.setupNetworkMonitoring();
            this.setupBatteryMonitoring();
            this.setupErrorTracking();
            this.startMonitoring();

            console.info('Sonoite Performance Monitor initialized');
        } catch (error) {
            console.error('Performance Monitor initialization failed:', error);
        }
    }

    setupPerformanceObservers() {
        // Core Web Vitals monitoring
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.loadTimes.lcp = lastEntry.startTime;
                this.evaluateWebVital('LCP', lastEntry.startTime, 2500, 4000);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('lcp', lcpObserver);

            // First Input Delay
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.metrics.loadTimes.fid = entry.processingStart - entry.startTime;
                    this.evaluateWebVital('FID', entry.processingStart - entry.startTime, 100, 300);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.set('fid', fidObserver);

            // Cumulative Layout Shift
            const clsObserver = new PerformanceObserver((entryList) => {
                let clsValue = 0;
                entryList.getEntries().forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.metrics.loadTimes.cls = clsValue;
                this.evaluateWebVital('CLS', clsValue, 0.1, 0.25);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('cls', clsObserver);
        }
    }

    evaluateWebVital(metric, value, good, needsImprovement) {
        const status = value <= good ? 'good' :
                      value <= needsImprovement ? 'needs-improvement' : 'poor';

        console.info(`Core Web Vital ${metric}: ${value.toFixed(2)}ms (${status})`);

        if (status === 'poor' && this.options.enableOptimization) {
            this.triggerOptimization(metric.toLowerCase(), value);
        }
    }

    setupMemoryMonitoring() {
        if (!performance.memory) return;

        const monitorMemory = () => {
            const memory = performance.memory;
            this.metrics.memory.current = memory.usedJSHeapSize;
            this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memory.usedJSHeapSize);

            // Check memory pressure
            const memoryPressure = memory.usedJSHeapSize / this.options.memoryLimit;
            if (memoryPressure > 0.8) {
                this.handleMemoryPressure(memoryPressure);
            }

            // Memory leak detection
            if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
                this.detectMemoryLeak();
            }
        };

        this.memoryInterval = setInterval(monitorMemory, 1000);

        // Debug: Log memory every 10s when SONOITE_DEBUG is true
        if (typeof window !== 'undefined' && window.SONOITE_DEBUG === true) {
            this.debugMemoryInterval = setInterval(() => {
                const mb = (this.metrics.memory.current / (1024 * 1024)).toFixed(1);
                const limitMb = (this.options.memoryLimit / (1024 * 1024)).toFixed(0);
                console.log(`[PerfMonitor] Memory usage: ${mb}MB / ${limitMb}MB`);
            }, 10000);
        }
    }

    setupNetworkMonitoring() {
        // Network Information API
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.updateNetworkMetrics(connection);

            connection.addEventListener('change', () => {
                this.updateNetworkMetrics(connection);
                this.adaptToNetworkConditions(connection);
            });
        }

        // RTT measurement via Resource Timing API
        this.measureNetworkLatency();
    }

    updateNetworkMetrics(connection) {
        this.metrics.network = {
            type: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };
    }

    measureNetworkLatency() {
        const startTime = performance.now();
        fetch(window.location.href, { method: 'HEAD', cache: 'no-cache' })
            .then(() => {
                this.metrics.network.latency = performance.now() - startTime;
            })
            .catch(() => {
                // Handle network error
                this.metrics.network.latency = 9999;
            });
    }

    setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.metrics.battery = {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };

                // Adapt performance based on battery
                this.adaptToBatteryLevel(battery);

                battery.addEventListener('levelchange', () => {
                    this.metrics.battery.level = battery.level;
                    this.adaptToBatteryLevel(battery);
                });

                battery.addEventListener('chargingchange', () => {
                    this.metrics.battery.charging = battery.charging;
                    this.adaptToBatteryLevel(battery);
                });
            });
        }
    }

    setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError('javascript', event.error || event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise', event.reason, {
                promise: event.promise
            });
        });

        // Three.js specific error tracking
        document.addEventListener('webglcontextlost', () => {
            this.trackError('webgl', 'Context lost', { context: 'webgl' });
        });
    }

    trackError(type, message, details = {}) {
        this.metrics.errors.count++;

        if (!this.metrics.errors.types.has(type)) {
            this.metrics.errors.types.set(type, 0);
        }
        this.metrics.errors.types.set(type, this.metrics.errors.types.get(type) + 1);

        // Report critical errors immediately
        if (type === 'webgl' || type === 'consciousness') {
            this.reportCriticalError(type, message, details);
        }
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        // FPS monitoring
        let frameCount = 0;
        let lastTime = performance.now();
        const fpsSamples = [];

        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            const delta = currentTime - lastTime;

            if (delta >= 1000) {
                const fps = Math.round((frameCount * 1000) / delta);
                this.metrics.fps.current = fps;
                fpsSamples.push(fps);

                if (fpsSamples.length > 60) fpsSamples.shift();
                this.metrics.fps.average = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;

                frameCount = 0;
                lastTime = currentTime;

                // Trigger optimization if FPS is low
                if (fps < this.options.fpsThreshold && this.options.enableOptimization) {
                    this.triggerOptimization('fps', fps);
                }
            }

            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };

        requestAnimationFrame(measureFPS);

        // Periodic reporting
        if (this.options.enableReporting) {
            this.reportingInterval = setInterval(() => {
                this.generatePerformanceReport();
            }, this.options.reportingInterval);
        }
    }

    handleMemoryPressure(pressure) {
        console.warn(`Memory pressure detected: ${(pressure * 100).toFixed(1)}%`);

        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }

        // Request consciousness system optimization
        document.dispatchEvent(new CustomEvent('memoryPressure', {
            detail: { pressure, action: 'optimize' }
        }));
    }

    detectMemoryLeak() {
        console.error('Potential memory leak detected');

        // Force cleanup of consciousness modules
        document.dispatchEvent(new CustomEvent('memoryLeak', {
            detail: { action: 'cleanup' }
        }));
    }

    adaptToNetworkConditions(connection) {
        let quality = 'high';

        if (connection.saveData || connection.effectiveType === 'slow-2g') {
            quality = 'low';
        } else if (connection.effectiveType === '2g' || connection.effectiveType === '3g') {
            quality = 'medium';
        }

        // Update consciousness system quality
        document.dispatchEvent(new CustomEvent('networkQualityChange', {
            detail: { quality, connection: this.metrics.network }
        }));
    }

    adaptToBatteryLevel(battery) {
        if (battery.level < 0.2 && !battery.charging) {
            // Low battery mode
            document.dispatchEvent(new CustomEvent('lowBattery', {
                detail: { level: battery.level, action: 'optimize' }
            }));
        }
    }

    triggerOptimization(type, value) {
        if (this.optimizations.has(type)) {
            const lastOptimization = this.optimizations.get(type);
            if (Date.now() - lastOptimization < 5000) return; // Debounce
        }

        this.optimizations.set(type, Date.now());

        switch (type) {
            case 'fps':
                this.optimizeFPS(value);
                break;
            case 'lcp':
                this.optimizeLCP(value);
                break;
            case 'memory':
                this.optimizeMemory(value);
                break;
        }
    }

    optimizeFPS(currentFPS) {
        const optimizations = [];

        if (currentFPS < 20) {
            optimizations.push('disable-advanced-shaders');
            optimizations.push('reduce-particle-count');
            optimizations.push('disable-post-processing');
        } else if (currentFPS < 30) {
            optimizations.push('reduce-quality');
            optimizations.push('limit-consciousness-modules');
        }

        document.dispatchEvent(new CustomEvent('performanceOptimization', {
            detail: { type: 'fps', optimizations, currentValue: currentFPS }
        }));
    }

    optimizeLCP(lcpTime) {
        const optimizations = [];

        if (lcpTime > 4000) {
            optimizations.push('preload-critical-assets');
            optimizations.push('defer-consciousness-initialization');
        } else if (lcpTime > 2500) {
            optimizations.push('optimize-shader-loading');
        }

        document.dispatchEvent(new CustomEvent('performanceOptimization', {
            detail: { type: 'lcp', optimizations, currentValue: lcpTime }
        }));
    }

    optimizeMemory(memoryUsage) {
        const optimizations = ['cleanup-unused-textures', 'dispose-inactive-modules'];

        document.dispatchEvent(new CustomEvent('performanceOptimization', {
            detail: { type: 'memory', optimizations, currentValue: memoryUsage }
        }));
    }

    generatePerformanceReport() {
        const report = {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            recommendations: this.generateRecommendations(),
            score: this.calculatePerformanceScore()
        };

        // Send to WordPress backend for logging
        if (this.options.enableReporting && window.sonoiteData) {
            this.sendPerformanceReport(report);
        }

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.metrics.fps.average < 45) {
            recommendations.push('Consider reducing consciousness visualization quality');
        }

        if (this.metrics.memory.current > this.options.memoryLimit * 0.7) {
            recommendations.push('High memory usage detected - enable automatic cleanup');
        }

        if (this.metrics.network.type === 'slow-2g') {
            recommendations.push('Slow network detected - enable data saver mode');
        }

        return recommendations;
    }

    calculatePerformanceScore() {
        let score = 100;

        // FPS penalty
        if (this.metrics.fps.average < 30) score -= 30;
        else if (this.metrics.fps.average < 45) score -= 15;

        // Memory penalty
        const memoryRatio = this.metrics.memory.current / this.options.memoryLimit;
        if (memoryRatio > 0.8) score -= 25;
        else if (memoryRatio > 0.6) score -= 10;

        // Error penalty
        if (this.metrics.errors.count > 5) score -= 20;
        else if (this.metrics.errors.count > 0) score -= 5;

        return Math.max(0, score);
    }

    async sendPerformanceReport(report) {
        // Temporarily disable performance reporting to avoid 403 errors
        return;
        
        try {
            const response = await fetch(`${window.sonoiteData.apiUrl}performance-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.sonoiteData.restNonce || window.sonoiteData.nonce
                },
                body: JSON.stringify(report)
            });

            if (!response.ok) {
                throw new Error(`Performance report failed: ${response.status}`);
            }
        } catch (error) {
            console.warn('Failed to send performance report:', error);
        }
    }

    reportCriticalError(type, message, details) {
        console.error(`Critical ${type} error:`, message, details);
        
        // Immediate reporting for critical errors
        if (this.options.enableReporting && window.sonoiteData) {
            this.sendCriticalErrorReport(type, message, details);
        }
    }

    async sendCriticalErrorReport(type, message, details) {
        try {
            const report = {
                timestamp: Date.now(),
                type,
                message,
                details,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            await fetch(`${window.sonoiteData.apiUrl}performance-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.sonoiteData.restNonce || window.sonoiteData.nonce
                },
                body: JSON.stringify(report)
            });
        } catch (error) {
            console.warn('Failed to send critical error report:', error);
        }
    }

    dispose() {
        this.isMonitoring = false;

        // Clear all intervals
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
        }
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        if (this.debugMemoryInterval) {
            clearInterval(this.debugMemoryInterval);
        }

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Auto-initialize if not in test environment
if (typeof window !== 'undefined' && !window.jest) {
    document.addEventListener('DOMContentLoaded', () => {
        window.sonoitePerformanceMonitor = new SonoitePerformanceMonitor();
    });
}
