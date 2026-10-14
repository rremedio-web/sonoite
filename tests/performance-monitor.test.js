/**
 * Performance Monitor Test Suite
 * Validates enterprise-level performance tracking and optimization
 */

import { SonoitePerformanceMonitor } from '../src/js/performance-monitor.js';

describe('SonoitePerformanceMonitor', () => {
    let performanceMonitor;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset performance API mocks
        global.performance.now.mockReturnValue(1000);
        global.performance.memory = {
            usedJSHeapSize: 1024 * 1024 * 10,
            totalJSHeapSize: 1024 * 1024 * 50,
            jsHeapSizeLimit: 1024 * 1024 * 100
        };
    });

    afterEach(() => {
        if (performanceMonitor) {
            performanceMonitor.dispose();
            performanceMonitor = null;
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            expect(performanceMonitor.options.memoryLimit).toBe(50 * 1024 * 1024);
            expect(performanceMonitor.options.fpsTarget).toBe(60);
            expect(performanceMonitor.options.fpsThreshold).toBe(30);
            expect(performanceMonitor.options.enableReporting).toBe(true);
            expect(performanceMonitor.options.enableOptimization).toBe(true);
        });

        test('should override default options', () => {
            const customOptions = {
                memoryLimit: 30 * 1024 * 1024,
                fpsTarget: 30,
                enableReporting: false
            };
            
            performanceMonitor = new SonoitePerformanceMonitor(customOptions);
            
            expect(performanceMonitor.options.memoryLimit).toBe(30 * 1024 * 1024);
            expect(performanceMonitor.options.fpsTarget).toBe(30);
            expect(performanceMonitor.options.enableReporting).toBe(false);
        });

        test('should initialize metrics structure', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            expect(performanceMonitor.metrics).toMatchObject({
                memory: expect.objectContaining({
                    current: 0,
                    peak: 0,
                    limit: expect.any(Number)
                }),
                fps: expect.objectContaining({
                    current: 60,
                    average: 60,
                    samples: expect.any(Array)
                }),
                loadTimes: expect.objectContaining({
                    initial: 0,
                    tracks: expect.any(Array),
                    assets: expect.any(Array)
                }),
                errors: expect.objectContaining({
                    count: 0,
                    types: expect.any(Map)
                })
            });
        });
    });

    describe('Performance Observers', () => {
        test('should setup LCP observer when PerformanceObserver is available', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            expect(global.PerformanceObserver).toHaveBeenCalled();
            expect(performanceMonitor.observers.size).toBeGreaterThan(0);
        });

        test('should evaluate Web Vitals correctly', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const triggerOptimizationSpy = jest.spyOn(performanceMonitor, 'triggerOptimization');
            
            // Test good LCP
            performanceMonitor.evaluateWebVital('LCP', 2000, 2500, 4000);
            expect(triggerOptimizationSpy).not.toHaveBeenCalled();
            
            // Test poor LCP
            performanceMonitor.evaluateWebVital('LCP', 5000, 2500, 4000);
            expect(triggerOptimizationSpy).toHaveBeenCalledWith('lcp', 5000);
        });
    });

    describe('Memory Monitoring', () => {
        test('should track current and peak memory usage', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            // Update memory usage
            global.performance.memory.usedJSHeapSize = 1024 * 1024 * 20; // 20MB
            
            // Trigger memory monitoring manually
            performanceMonitor.setupMemoryMonitoring();
            
            expect(performanceMonitor.metrics.memory.current).toBeGreaterThan(0);
        });

        test('should detect memory pressure', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const handleMemoryPressureSpy = jest.spyOn(performanceMonitor, 'handleMemoryPressure');
            
            // Set high memory usage (90% of limit)
            global.performance.memory.usedJSHeapSize = performanceMonitor.options.memoryLimit * 0.9;
            
            performanceMonitor.handleMemoryPressure(0.9);
            
            expect(handleMemoryPressureSpy).toHaveBeenCalledWith(0.9);
        });

        test('should dispatch memory pressure events', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            performanceMonitor.handleMemoryPressure(0.85);
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'memoryPressure',
                    detail: expect.objectContaining({
                        pressure: 0.85,
                        action: 'optimize'
                    })
                })
            );
        });
    });

    describe('Network Monitoring', () => {
        test('should update network metrics when connection changes', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            const mockConnection = {
                effectiveType: '3g',
                downlink: 1.5,
                rtt: 200,
                saveData: true
            };
            
            performanceMonitor.updateNetworkMetrics(mockConnection);
            
            expect(performanceMonitor.metrics.network).toMatchObject({
                type: '3g',
                downlink: 1.5,
                rtt: 200,
                saveData: true
            });
        });

        test('should adapt to slow network conditions', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            const slowConnection = {
                effectiveType: 'slow-2g',
                saveData: true
            };
            
            performanceMonitor.adaptToNetworkConditions(slowConnection);
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'networkQualityChange',
                    detail: expect.objectContaining({
                        quality: 'low'
                    })
                })
            );
        });
    });

    describe('Error Tracking', () => {
        test('should track JavaScript errors', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            performanceMonitor.trackError('javascript', 'Test error', {
                filename: 'test.js',
                lineno: 10
            });
            
            expect(performanceMonitor.metrics.errors.count).toBe(1);
            expect(performanceMonitor.metrics.errors.types.get('javascript')).toBe(1);
        });

        test('should report critical errors immediately', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const reportCriticalErrorSpy = jest.spyOn(performanceMonitor, 'reportCriticalError');
            
            performanceMonitor.trackError('webgl', 'Context lost', { context: 'webgl' });
            
            expect(reportCriticalErrorSpy).toHaveBeenCalledWith(
                'webgl',
                'Context lost',
                { context: 'webgl' }
            );
        });
    });

    describe('FPS Monitoring', () => {
        test('should start FPS monitoring when monitoring begins', () => {
            performanceMonitor = new SonoitePerformanceMonitor({ enableReporting: false });
            
            expect(performanceMonitor.isMonitoring).toBe(true);
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });

        test('should trigger optimization for low FPS', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const triggerOptimizationSpy = jest.spyOn(performanceMonitor, 'triggerOptimization');
            
            performanceMonitor.triggerOptimization('fps', 20);
            
            expect(triggerOptimizationSpy).toHaveBeenCalledWith('fps', 20);
        });
    });

    describe('Battery Monitoring', () => {
        test('should adapt to low battery conditions', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            const lowBattery = {
                level: 0.15,
                charging: false
            };
            
            performanceMonitor.adaptToBatteryLevel(lowBattery);
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'lowBattery',
                    detail: expect.objectContaining({
                        level: 0.15,
                        action: 'optimize'
                    })
                })
            );
        });
    });

    describe('Optimization Triggers', () => {
        test('should debounce optimization triggers', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const optimizeFPSSpy = jest.spyOn(performanceMonitor, 'optimizeFPS');
            
            // First trigger
            performanceMonitor.triggerOptimization('fps', 20);
            expect(optimizeFPSSpy).toHaveBeenCalledTimes(1);
            
            // Second trigger immediately (should be debounced)
            performanceMonitor.triggerOptimization('fps', 15);
            expect(optimizeFPSSpy).toHaveBeenCalledTimes(1);
        });

        test('should generate appropriate FPS optimizations', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            performanceMonitor.optimizeFPS(15);
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'performanceOptimization',
                    detail: expect.objectContaining({
                        type: 'fps',
                        optimizations: expect.arrayContaining([
                            'disable-advanced-shaders',
                            'reduce-particle-count',
                            'disable-post-processing'
                        ])
                    })
                })
            );
        });
    });

    describe('Performance Reporting', () => {
        test('should generate performance reports', () => {
            performanceMonitor = new SonoitePerformanceMonitor({ enableReporting: false });
            
            const report = performanceMonitor.generatePerformanceReport();
            
            expect(report).toMatchObject({
                timestamp: expect.any(Number),
                metrics: expect.any(Object),
                recommendations: expect.any(Array),
                score: expect.any(Number)
            });
        });

        test('should calculate performance score correctly', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            // Set good performance metrics
            performanceMonitor.metrics.fps.average = 55;
            performanceMonitor.metrics.memory.current = performanceMonitor.options.memoryLimit * 0.3;
            performanceMonitor.metrics.errors.count = 0;
            
            const score = performanceMonitor.calculatePerformanceScore();
            
            expect(score).toBeGreaterThan(80);
        });

        test('should send performance reports when enabled', async () => {
            global.sonoiteData = {
                apiUrl: 'http://localhost/wp-json/sonoite/v1/',
                nonce: 'test-nonce'
            };
            
            performanceMonitor = new SonoitePerformanceMonitor({ enableReporting: true });
            
            const mockReport = {
                timestamp: Date.now(),
                metrics: {},
                score: 85
            };
            
            await performanceMonitor.sendPerformanceReport(mockReport);
            
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('performance-report'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
    });

    describe('Cleanup and Disposal', () => {
        test('should properly dispose of resources', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            const observerDisconnectSpy = jest.fn();
            performanceMonitor.observers.set('test', { disconnect: observerDisconnectSpy });
            
            performanceMonitor.dispose();
            
            expect(performanceMonitor.isMonitoring).toBe(false);
            expect(observerDisconnectSpy).toHaveBeenCalled();
        });

        test('should clear intervals on disposal', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            // Set up reporting interval
            performanceMonitor.reportingInterval = setInterval(() => {}, 1000);
            
            performanceMonitor.dispose();
            
            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe('Integration with Consciousness System', () => {
        test('should dispatch events for consciousness system optimization', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            performanceMonitor.optimizeMemory(1024 * 1024 * 40); // 40MB
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'performanceOptimization',
                    detail: expect.objectContaining({
                        type: 'memory',
                        optimizations: expect.arrayContaining([
                            'cleanup-unused-textures',
                            'dispose-inactive-modules'
                        ])
                    })
                })
            );
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle missing performance.memory gracefully', () => {
            delete global.performance.memory;
            
            expect(() => {
                performanceMonitor = new SonoitePerformanceMonitor();
                performanceMonitor.setupMemoryMonitoring();
            }).not.toThrow();
        });

        test('should handle missing PerformanceObserver gracefully', () => {
            delete global.PerformanceObserver;
            
            expect(() => {
                performanceMonitor = new SonoitePerformanceMonitor();
                performanceMonitor.setupPerformanceObservers();
            }).not.toThrow();
        });

        test('should handle network API unavailability', () => {
            delete global.navigator.connection;
            
            expect(() => {
                performanceMonitor = new SonoitePerformanceMonitor();
                performanceMonitor.setupNetworkMonitoring();
            }).not.toThrow();
        });

        test('should handle failed performance report sends', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            
            performanceMonitor = new SonoitePerformanceMonitor();
            
            await expect(
                performanceMonitor.sendPerformanceReport({})
            ).resolves.not.toThrow();
        });
    });

    describe('Performance Thresholds', () => {
        test('should meet target FPS requirements', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            expect(performanceMonitor.options.fpsTarget).toBe(60);
            expect(performanceMonitor.options.fpsThreshold).toBe(30);
            expect(performanceMonitor.metrics.fps.current).toBeGreaterThanOrEqual(30);
        });

        test('should meet memory usage requirements', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            const memoryLimitMB = performanceMonitor.options.memoryLimit / (1024 * 1024);
            expect(memoryLimitMB).toBeLessThanOrEqual(50);
        });

        test('should achieve target performance score', () => {
            performanceMonitor = new SonoitePerformanceMonitor();
            
            // Set optimal conditions
            performanceMonitor.metrics.fps.average = 60;
            performanceMonitor.metrics.memory.current = performanceMonitor.options.memoryLimit * 0.2;
            performanceMonitor.metrics.errors.count = 0;
            
            const score = performanceMonitor.calculatePerformanceScore();
            expect(score).toHavePerformanceScore(90);
        });
    });
});