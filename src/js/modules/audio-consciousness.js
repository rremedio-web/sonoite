/**
 * DEPRECATED: Audio Consciousness - Audio-reactive consciousness mapping
 *
 * ⚠️  This module has been deprecated and consolidated into audio-manager.js
 * ⚠️  Use AudioManager.getAudioAnalysis() instead for Visual Layer API compatibility
 *
 * Maps audio frequencies to consciousness states and visual responses
 */

// DEPRECATED - Use audio-manager.js instead
import { dlog, dwarn, derr } from '../utils/devlog.js';

export class AudioConsciousness {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.frequencyBands = {
            bass: { min: 20, max: 250 },
            lowMid: { min: 250, max: 500 },
            mid: { min: 500, max: 2000 },
            highMid: { min: 2000, max: 4000 },
            treble: { min: 4000, max: 20000 }
        };
        
        // Consciousness mapping parameters
        this.consciousnessMapping = {
            bassToFlow: 0.8,        // Bass drives flow consciousness
            trebleToStructure: 0.7,  // Treble drives structure consciousness
            midToTransition: 0.6     // Mid frequencies control transitions
        };
        
        // Audio processing buffers
        this.audioBuffer = new Array(128).fill(0);
        this.smoothingFactor = 0.85;
        this.analyzerNode = null;
        this.frequencyData = null;
        
        // Track-specific configurations
        this.trackConfig = null;
        
        // Performance optimization
        this.updateRate = 60; // Hz
        this.lastUpdate = 0;
        
        this.init();
    }

    init() {
        try {
            this.setupAudioAnalysis();
            this.setupFrequencyBands();
            this.setupConsciousnessMapping();
            
            dlog('Audio Consciousness mapping initialized');
        } catch (error) {
            derr('Audio Consciousness initialization failed:', error);
            this.initializeFallbackMode();
        }
    }

    setupAudioAnalysis() {
        // Initialize audio analysis if not already available from audioManager
        if (this.audioManager && typeof this.audioManager.getFrequencyData === 'function') {
            // Use existing audio manager
            this.useExistingAudioManager = true;
        } else {
            dwarn('AudioManager not fully compatible, using fallback audio analysis');
            this.useExistingAudioManager = false;
        }
    }

    setupFrequencyBands() {
        // Pre-calculate frequency band indices for efficient processing
        this.bandIndices = {};
        const sampleRate = 44100; // Standard sample rate
        const fftSize = 512; // Typical FFT size
        const nyquist = sampleRate / 2;
        
        Object.keys(this.frequencyBands).forEach(band => {
            const bandData = this.frequencyBands[band];
            this.bandIndices[band] = {
                start: Math.floor((bandData.min / nyquist) * (fftSize / 2)),
                end: Math.floor((bandData.max / nyquist) * (fftSize / 2))
            };
        });
    }

    setupConsciousnessMapping() {
        // Initialize consciousness response curves
        this.consciousnessResponseCurves = {
            flow: {
                // Flow consciousness responds more to bass and low frequencies
                bass: this.createResponseCurve('exponential', 1.5),
                mid: this.createResponseCurve('linear', 0.5),
                treble: this.createResponseCurve('inverse', 0.3)
            },
            structure: {
                // Structure consciousness responds more to treble and high frequencies
                bass: this.createResponseCurve('inverse', 0.3),
                mid: this.createResponseCurve('linear', 0.7),
                treble: this.createResponseCurve('exponential', 1.2)
            },
            transition: {
                // Transition responds to mid frequencies and overall dynamics
                bass: this.createResponseCurve('linear', 0.4),
                mid: this.createResponseCurve('exponential', 1.0),
                treble: this.createResponseCurve('linear', 0.4)
            }
        };
    }

    createResponseCurve(type, intensity) {
        return {
            type,
            intensity,
            process: (value) => {
                switch (type) {
                    case 'exponential':
                        return Math.pow(value, 1.5) * intensity;
                    case 'linear':
                        return value * intensity;
                    case 'inverse':
                        return Math.pow(value, 0.7) * intensity;
                    case 'logarithmic':
                        return Math.log(value + 1) * intensity;
                    default:
                        return value * intensity;
                }
            }
        };
    }

    configureForTrack(trackConfig) {
        this.trackConfig = trackConfig;
        
        // Adjust consciousness mapping based on track characteristics
        if (trackConfig) {
            this.adjustMappingForTrack(trackConfig);
        }
    }

    adjustMappingForTrack(config) {
        // Modify consciousness mapping based on track-specific characteristics
        const adjustments = {
            nocturnal_drift: {
                bassToFlow: 0.9,
                trebleToStructure: 0.5,
                midToTransition: 0.7
            },
            frozen_awareness: {
                bassToFlow: 0.3,
                trebleToStructure: 0.9,
                midToTransition: 0.4
            },
            learning_state: {
                bassToFlow: 0.6,
                trebleToStructure: 0.8,
                midToTransition: 0.9
            },
            deep_rest: {
                bassToFlow: 0.9,
                trebleToStructure: 0.2,
                midToTransition: 0.3
            },
            ego_dissolution: {
                bassToFlow: 0.5,
                trebleToStructure: 0.1,
                midToTransition: 0.8
            },
            inherited_patterns: {
                bassToFlow: 0.7,
                trebleToStructure: 0.7,
                midToTransition: 0.8
            },
            structured_awareness: {
                bassToFlow: 0.2,
                trebleToStructure: 1.0,
                midToTransition: 0.6
            }
        };

        const trackAdjustment = adjustments[config.name];
        if (trackAdjustment) {
            Object.assign(this.consciousnessMapping, trackAdjustment);
        }
    }

    process(audioData) {
        const now = performance.now();
        
        // Throttle updates for performance
        if (now - this.lastUpdate < (1000 / this.updateRate)) {
            return this.lastProcessedData;
        }
        
        this.lastUpdate = now;
        
        try {
            // Get frequency data from audio manager or fallback
            const frequencyData = this.getFrequencyData(audioData);
            
            // Analyze frequency bands
            const bandAnalysis = this.analyzeBands(frequencyData);
            
            // Map to consciousness states
            const consciousnessData = this.mapToConsciousness(bandAnalysis);
            
            // Apply track-specific processing
            const processedData = this.applyTrackProcessing(consciousnessData);
            
            // Smooth the data
            const smoothedData = this.smoothAudioData(processedData);
            
            // IMPORTANT: Preserve original Meyda data for audio reactivity
            if (audioData && audioData.meyda) {
                smoothedData.meyda = audioData.meyda;
            }
            
            this.lastProcessedData = smoothedData;
            return smoothedData;
            
        } catch (error) {
            derr('Audio consciousness processing failed:', error);
            return this.getFallbackData();
        }
    }

    getFrequencyData(audioData) {
        if (this.useExistingAudioManager && audioData) {
            // Adapt existing audio data format
            return this.adaptExistingAudioData(audioData);
        } else {
            // Generate fallback frequency data
            return this.generateFallbackFrequencyData();
        }
    }

    adaptExistingAudioData(audioData) {
        // Adapt various possible audio data formats to our standard format
        if (Array.isArray(audioData)) {
            return audioData;
        } else if (audioData && typeof audioData === 'object') {
            // Extract frequency array from object
            if (audioData.frequencyData) return audioData.frequencyData;
            if (audioData.frequencies) return audioData.frequencies;
            if (audioData.spectrum) return audioData.spectrum;
            
            // Convert band data to frequency array
            if (audioData.bassLevel !== undefined) {
                return this.bandsToFrequencyArray(audioData);
            }
        }
        
        return this.generateFallbackFrequencyData();
    }

    bandsToFrequencyArray(bandData) {
        // Convert band-based audio data to frequency array
        const frequencyArray = new Array(128);
        
        // Map bands to frequency array segments
        const bassLevel = bandData.bassLevel || 0;
        const midLevel = bandData.midLevel || 0;
        const trebleLevel = bandData.trebleLevel || 0;
        
        // Bass: indices 0-31
        for (let i = 0; i < 32; i++) {
            frequencyArray[i] = bassLevel * (1 - i / 32) * 255;
        }
        
        // Mid: indices 32-95
        for (let i = 32; i < 96; i++) {
            frequencyArray[i] = midLevel * 255;
        }
        
        // Treble: indices 96-127
        for (let i = 96; i < 128; i++) {
            frequencyArray[i] = trebleLevel * ((i - 96) / 32) * 255;
        }
        
        return frequencyArray;
    }

    generateFallbackFrequencyData() {
        // Generate synthetic frequency data for testing/fallback
        const frequencyArray = new Array(128);
        const time = performance.now() * 0.001;
        
        for (let i = 0; i < 128; i++) {
            const frequency = (i / 128) * 0.5; // Normalized frequency
            const intensity = Math.sin(time + frequency * 10) * 0.5 + 0.5;
            frequencyArray[i] = intensity * 255;
        }
        
        return frequencyArray;
    }

    analyzeBands(frequencyData) {
        const bandAnalysis = {};
        
        Object.keys(this.frequencyBands).forEach(bandName => {
            const indices = this.bandIndices[bandName];
            let sum = 0;
            let count = 0;
            
            for (let i = indices.start; i <= indices.end && i < frequencyData.length; i++) {
                sum += frequencyData[i];
                count++;
            }
            
            const average = count > 0 ? sum / count : 0;
            bandAnalysis[bandName] = Math.min(1, average / 255); // Normalize to 0-1
        });
        
        // Calculate additional metrics
        bandAnalysis.overall = this.calculateOverallEnergy(frequencyData);
        bandAnalysis.spectralCentroid = this.calculateSpectralCentroid(frequencyData);
        bandAnalysis.dynamicRange = this.calculateDynamicRange(frequencyData);
        
        return bandAnalysis;
    }

    calculateOverallEnergy(frequencyData) {
        const sum = frequencyData.reduce((acc, val) => acc + val, 0);
        return Math.min(1, sum / (frequencyData.length * 255));
    }

    calculateSpectralCentroid(frequencyData) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const magnitude = frequencyData[i];
            weightedSum += magnitude * i;
            magnitudeSum += magnitude;
        }
        
        return magnitudeSum > 0 ? (weightedSum / magnitudeSum) / frequencyData.length : 0.5;
    }

    calculateDynamicRange(frequencyData) {
        const max = Math.max(...frequencyData);
        const min = Math.min(...frequencyData);
        return max > 0 ? (max - min) / max : 0;
    }

    mapToConsciousness(bandAnalysis) {
        const consciousnessData = {
            flow: 0,
            structure: 0,
            transition: 0,
            intensity: 0,
            clarity: 0
        };

        // Map frequency bands to consciousness states using response curves
        Object.keys(this.consciousnessResponseCurves).forEach(consciousnessType => {
            const curves = this.consciousnessResponseCurves[consciousnessType];
            let value = 0;
            
            value += curves.bass.process(bandAnalysis.bass || 0);
            value += curves.mid.process(bandAnalysis.mid || 0);
            value += curves.treble.process(bandAnalysis.treble || 0);
            
            consciousnessData[consciousnessType] = Math.min(1, value);
        });

        // Apply consciousness mapping weights
        consciousnessData.flow *= this.consciousnessMapping.bassToFlow;
        consciousnessData.structure *= this.consciousnessMapping.trebleToStructure;
        consciousnessData.transition *= this.consciousnessMapping.midToTransition;

        // Calculate intensity and clarity
        consciousnessData.intensity = bandAnalysis.overall || 0;
        consciousnessData.clarity = 1 - (bandAnalysis.dynamicRange || 0); // Lower dynamic range = higher clarity

        // Add derived metrics
        consciousnessData.spectralBalance = bandAnalysis.spectralCentroid || 0.5;
        consciousnessData.bassLevel = bandAnalysis.bass || 0;
        consciousnessData.midLevel = bandAnalysis.mid || 0;
        consciousnessData.trebleLevel = bandAnalysis.treble || 0;

        return consciousnessData;
    }

    applyTrackProcessing(consciousnessData) {
        if (!this.trackConfig) return consciousnessData;

        const processed = { ...consciousnessData };

        // Apply track-specific consciousness modifications
        switch (this.trackConfig.name) {
            case 'nocturnal_drift':
                processed.flow *= 1.2;
                processed.clarity *= 0.8;
                break;
            case 'frozen_awareness':
                processed.structure *= 1.3;
                processed.transition *= 0.5;
                break;
            case 'learning_state':
                processed.transition *= 1.4;
                processed.clarity *= 1.2;
                break;
            case 'deep_rest':
                processed.flow *= 1.5;
                processed.intensity *= 0.6;
                break;
            case 'ego_dissolution':
                processed.flow *= 0.7;
                processed.structure *= 0.3;
                processed.transition *= 1.6;
                break;
            case 'inherited_patterns':
                processed.structure *= 1.1;
                processed.flow *= 1.1;
                break;
            case 'structured_awareness':
                processed.structure *= 1.4;
                processed.clarity *= 1.3;
                break;
        }

        // Ensure values stay within bounds
        Object.keys(processed).forEach(key => {
            if (typeof processed[key] === 'number') {
                processed[key] = Math.max(0, Math.min(1, processed[key]));
            }
        });

        return processed;
    }

    smoothAudioData(data) {
        // Apply temporal smoothing to reduce jitter
        const smoothed = {};
        
        Object.keys(data).forEach(key => {
            if (typeof data[key] === 'number') {
                if (this.audioBuffer[key] !== undefined) {
                    // Exponential moving average
                    smoothed[key] = this.audioBuffer[key] * this.smoothingFactor + 
                                   data[key] * (1 - this.smoothingFactor);
                } else {
                    smoothed[key] = data[key];
                }
                this.audioBuffer[key] = smoothed[key];
            } else {
                smoothed[key] = data[key];
            }
        });

        return smoothed;
    }

    getFallbackData() {
        // Return safe fallback data when audio processing fails
        return {
            flow: 0.3,
            structure: 0.3,
            transition: 0.2,
            intensity: 0.2,
            clarity: 0.5,
            spectralBalance: 0.5,
            bassLevel: 0.2,
            midLevel: 0.2,
            trebleLevel: 0.2
        };
    }

    initializeFallbackMode() {
        dwarn('Audio Consciousness running in fallback mode');
        this.useExistingAudioManager = false;
        
        // Setup simple synthetic audio data
        setInterval(() => {
            this.lastProcessedData = this.getFallbackData();
        }, 1000 / 30); // 30 FPS fallback update rate
    }

    // Real-time audio analysis utilities
    getInstantaneousData() {
        // Get current audio data without smoothing for immediate response
        if (this.lastProcessedData) {
            const instant = { ...this.lastProcessedData };
            
            // Reduce smoothing for instant response
            Object.keys(instant).forEach(key => {
                if (typeof instant[key] === 'number' && this.audioBuffer[key] !== undefined) {
                    instant[key] = this.audioBuffer[key] * 0.3 + instant[key] * 0.7;
                }
            });
            
            return instant;
        }
        
        return this.getFallbackData();
    }

    getConsciousnessLevel() {
        // Calculate overall consciousness level (0 = flow, 1 = structure)
        const data = this.lastProcessedData || this.getFallbackData();
        const flowWeight = data.flow || 0;
        const structureWeight = data.structure || 0;
        const total = flowWeight + structureWeight;
        
        if (total === 0) return 0.5;
        
        return structureWeight / total;
    }

    setUpdateRate(hz) {
        this.updateRate = Math.max(10, Math.min(120, hz)); // Clamp between 10-120 Hz
    }

    setSmoothingFactor(factor) {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }

    // Performance optimization methods
    enableHighPerformanceMode() {
        this.updateRate = 120;
        this.smoothingFactor = 0.7; // Less smoothing for more responsive
    }

    enableBatteryOptimizedMode() {
        this.updateRate = 30;
        this.smoothingFactor = 0.9; // More smoothing to reduce calculations
    }

    dispose() {
        // Clean up audio consciousness resources
        this.audioBuffer = null;
        this.frequencyData = null;
        this.lastProcessedData = null;
        
        dlog('Audio Consciousness disposed');
    }
}