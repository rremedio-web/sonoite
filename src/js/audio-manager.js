/**
 * AudioManager: the Web Audio core shared by the legacy runtime (three-experience.js) and Path B
 * (prototype/experience.js); each creates its own instance.
 * loadTrack() fetches with origin, rate-limit, size and file-signature checks, then decodes to an
 * AudioBuffer; seekTo() recreates the BufferSource. getCurrentTime()/seekTo() are the transport
 * clock, since neither runtime uses an <audio> element. A throttled AnalyserNode loop feeds
 * onFrequencyUpdate() listeners (Meyda features are optional). Audit events go to an in-memory
 * log; security violations are also POSTed when sonoiteSecurityConfig.reportingEndpoint is set.
 */
import Meyda from 'meyda';
import { dlog, dwarn, derr } from './utils/devlog.js';

export class AudioManager {
    constructor(securityConfig = {}) {
        // Security configuration
        this.securityConfig = {
            maxFileSize: securityConfig.maxFileSize || 50 * 1024 * 1024, // 50MB
            allowedOrigins: securityConfig.allowedOrigins || [window.location.origin],
            allowedMimeTypes: securityConfig.allowedMimeTypes || [
                'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'
            ],
            enableContentValidation: securityConfig.enableContentValidation !== false,
            rateLimitRequests: securityConfig.rateLimitRequests || 50,
            rateLimitWindow: securityConfig.rateLimitWindow || 60000, // 1 minute
            enableAuditLog: securityConfig.enableAuditLog !== false,
            maxVolume: securityConfig.maxVolume || 1.0,
            timeoutDuration: securityConfig.timeoutDuration || 30000, // 30 seconds

            // Performance: audio analysis (CPU hot path)
            analysisTargetFps: Number.isFinite(securityConfig.analysisTargetFps) ? securityConfig.analysisTargetFps : 30,
            enableAdvancedAnalysis: securityConfig.enableAdvancedAnalysis !== false,
            analysisIncludeFloatFrequencyData: securityConfig.analysisIncludeFloatFrequencyData === true,
            analysisIncludeTimeDomainData: securityConfig.analysisIncludeTimeDomainData === true
        };

        // Analysis performance settings (do not read securityConfig in hot path)
        const targetFps = Number.isFinite(this.securityConfig.analysisTargetFps) ? this.securityConfig.analysisTargetFps : 30;
        this.analysisTargetFps = Math.max(1, targetFps);
        this.analysisIntervalMs = 1000 / this.analysisTargetFps;
        this.enableAdvancedAnalysis = this.securityConfig.enableAdvancedAnalysis !== false;
        this.analysisIncludeFloatFrequencyData = this.securityConfig.analysisIncludeFloatFrequencyData === true;
        this.analysisIncludeTimeDomainData = this.securityConfig.analysisIncludeTimeDomainData === true;

        // Audio properties
        this.audioContext = null;
        this.audioBuffer = null;
        this.source = null;
        this.analyser = null;
        this.gainNode = null;
        this.frequencyData = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 0.7;
        this.startTime = 0;
        
        // Meyda analyzer
        this.meydaAnalyzer = null;
        this.meydaFeatures = {
            loudness: { specific: [] },
            chroma: [],
            spectralCentroid: 0,
            spectralRolloff: 0
        };

        // Security tracking
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.auditLog = [];
        this.loadAbortController = null;

        // Content integrity
        this.expectedChecksums = new Map();
        this.loadedUrls = new Set();

        // BUG-FIX: Add concurrent operation guards
        this.isTransitioning = false;
        this.debounceTimeout = null;
        this.userInteractionEvents = ['click', 'touchstart', 'touchend', 'keydown'];
        this.resumeOnUserActionHandler = null;
        this.visibilityResumeHandler = null;

        this.callbacks = {
            onPlay: null,
            onPause: null,
            onStop: null,
            onTrackEnd: null,  // BUG-FIX: Add onTrackEnd callback for auto-play next
            onTimeUpdate: null,
            onLoadStart: null,
            onLoadEnd: null,
            onError: null,
            onSecurityViolation: null
        };
        
        this.initializeAudioContext();
        this.setupUserInteractionHandlers();
        this.logAuditEvent('AudioManager initialized', { securityConfig: this.securityConfig });
    }
    
    /**
     * Route the analyser's output through `node` instead of the speakers.
     * Every later (re)connection uses it, so there is never a second direct path.
     *
     * @param {AudioNode|null} node Output node, or null for the context destination.
     */
    setOutputNode(node) {
        const previousOutput = this.outputNode || this.audioContext?.destination;
        if (this.analyser && previousOutput) {
            try {
                this.analyser.disconnect(previousOutput);
            } catch { /* Not connected yet: nothing to undo. */ }
        }
        this.outputNode = node;
        if (this.analyser && this.audioContext) {
            this.analyser.connect(this.outputNode || this.audioContext.destination);
        }
    }

    /**
     * Initialize Web Audio API context
     */
    async initializeAudioContext() {
        try {
            // Create audio context with user interaction
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node for frequency data
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024; // Increased from 256 for better frequency resolution
            this.analyser.smoothingTimeConstant = 0.7; // Slightly faster response
            
            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.volume;
            
            // Connect nodes
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.outputNode || this.audioContext.destination);
            
            // Initialize frequency data arrays for comprehensive analysis
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.frequencyDataFloat = new Float32Array(this.analyser.frequencyBinCount);
            this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
            
            // Real-time analysis properties
            this.isAnalyzing = false;
            this.analysisFrameId = null;
            this.lastAnalysisTime = 0;
            this.lastAnalysisTick = null;
            this.analysisCallbacks = [];

            // Analysis buffers (avoid per-frame allocations)
            this.normalizedFrequencyData = new Float32Array(this.analyser.frequencyBinCount);
            this.averageFrequencyLevel = 0;
            this.reusableFrequencyAnalysisData = {
                frequency: this.frequencyData,
                frequencyFloat: null,
                timeDomain: null,
                normalized: this.normalizedFrequencyData,
                bassLevel: 0,
                midLevel: 0,
                trebleLevel: 0,
                averageLevel: 0,
                timestamp: 0
            };
            
            // Handle audio context state changes
            this.audioContext.addEventListener('statechange', () => {
                if (window.SONOITE_DEBUG) {
                    dlog('Audio context state:', this.audioContext.state);
                }
            });
            
        } catch (error) {
            derr('Failed to initialize audio context:', error);
            this.handleError('Audio initialization failed');
        }
    }
    
    /**
     * Validate URL security
     */
    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Check protocol
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('Invalid protocol. Only HTTP/HTTPS allowed.');
            }
            
            // Check origin if restricted
            if (this.securityConfig.allowedOrigins.length > 0) {
                const origin = urlObj.origin;
                if (!this.securityConfig.allowedOrigins.includes(origin)) {
                    throw new Error(`Origin not allowed: ${origin}`);
                }
            }
            
            // Prevent local file access
            if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                if (!this.securityConfig.allowedOrigins.includes(urlObj.origin)) {
                    throw new Error('Local file access not permitted');
                }
            }
            
            return true;
        } catch (error) {
            this.logSecurityViolation('URL validation failed', { url, error: error.message });
            return false;
        }
    }

    /**
     * Rate limiting check
     */
    checkRateLimit() {
        const now = Date.now();
        
        // Reset count if window expired
        if (now - this.lastRequestTime > this.securityConfig.rateLimitWindow) {
            this.requestCount = 0;
        }
        
        this.requestCount++;
        this.lastRequestTime = now;
        
        if (this.requestCount > this.securityConfig.rateLimitRequests) {
            this.logSecurityViolation('Rate limit exceeded', {
                requestCount: this.requestCount,
                window: this.securityConfig.rateLimitWindow
            });
            return false;
        }
        
        return true;
    }

    /**
     * Validate content type and size
     */
    async validateContent(response) {
        // Check content type
        const contentType = response.headers.get('content-type');
        if (contentType && !this.securityConfig.allowedMimeTypes.some(type => contentType.includes(type))) {
            throw new Error(`Invalid content type: ${contentType}`);
        }
        
        // Check content length
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > this.securityConfig.maxFileSize) {
            throw new Error(`File too large: ${contentLength} bytes (max: ${this.securityConfig.maxFileSize})`);
        }
        
        return true;
    }

    /**
     * Security-hardened audio track loading
     */
    async loadTrack(url, expectedChecksum = null) {
        if (!url) {
            this.logAuditEvent('Load failed', { reason: 'No URL provided' });
            return false;
        }
        
        try {
            // Security validations
            if (!this.validateUrl(url)) {
                throw new Error('URL security validation failed');
            }
            
            if (!this.checkRateLimit()) {
                throw new Error('Rate limit exceeded');
            }
            
            // Check if already loaded
            if (this.loadedUrls.has(url)) {
                this.logAuditEvent('Duplicate load attempt', { url });
            }
            
            this.logAuditEvent('Load started', { url });
            this.trigger('onLoadStart');
            
            // Stop current playback
            this.stop();
            
            // Cancel any existing load
            if (this.loadAbortController) {
                this.loadAbortController.abort();
            }
            
            this.loadAbortController = new AbortController();
            
            // Secure fetch with timeout
            const fetchOptions = {
                signal: this.loadAbortController.signal,
                mode: 'cors',
                credentials: 'same-origin',
                headers: {
                    'Accept': this.securityConfig.allowedMimeTypes.join(', '),
                    'Cache-Control': 'no-cache'
                }
            };
            
            // Set timeout
            const timeoutId = setTimeout(() => {
                if (this.loadAbortController) {
                    this.loadAbortController.abort();
                }
            }, this.securityConfig.timeoutDuration);
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Validate content
            await this.validateContent(response);
            
            // Get array buffer with size validation
            const arrayBuffer = await response.arrayBuffer();
            
            if (arrayBuffer.byteLength > this.securityConfig.maxFileSize) {
                throw new Error(`File size exceeds limit: ${arrayBuffer.byteLength} bytes`);
            }
            
            // Verify checksum if provided
            if (expectedChecksum && this.securityConfig.enableContentValidation) {
                const actualChecksum = await this.calculateChecksum(arrayBuffer);
                if (actualChecksum !== expectedChecksum) {
                    throw new Error('Content integrity verification failed');
                }
            }
            
            // Content validation - check for audio format
            if (this.securityConfig.enableContentValidation) {
                const isValidAudio = await this.validateAudioContent(arrayBuffer);
                if (!isValidAudio) {
                    throw new Error('Invalid audio content detected');
                }
            }
            
            // Decode audio data
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.duration = this.audioBuffer.duration;
            
            // Security check on duration
            if (this.duration > 3600) { // 1 hour max
                this.logSecurityViolation('Suspicious audio duration', { duration: this.duration });
                throw new Error('Audio duration exceeds security limit');
            }
            
            this.loadedUrls.add(url);
            this.logAuditEvent('Load completed', { 
                url, 
                duration: this.duration, 
                size: arrayBuffer.byteLength,
                checksum: expectedChecksum 
            });
            
            this.trigger('onLoadEnd');
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.logAuditEvent('Load aborted', { url });
            } else {
                this.logAuditEvent('Load failed', { url, error: error.message });
                this.handleError(`Failed to load audio track: ${error.message}`);
            }
            return false;
        } finally {
            this.loadAbortController = null;
        }
    }

    /**
     * Calculate SHA-256 checksum for content integrity
     */
    async calculateChecksum(arrayBuffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate audio content format
     */
    async validateAudioContent(arrayBuffer) {
        // Check for common audio file signatures
        const view = new DataView(arrayBuffer);
        
        // MP3 signature
        if (view.getUint16(0) === 0xFFFA || view.getUint16(0) === 0xFFFB || 
            (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33)) {
            return true;
        }
        
        // WAV signature
        if (view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57415645) {
            return true;
        }
        
        // OGG signature
        if (view.getUint32(0) === 0x4F676753) {
            return true;
        }
        
        // M4A/MP4 signature
        if (arrayBuffer.byteLength > 8) {
            const ftyp = new Uint8Array(arrayBuffer.slice(4, 8));
            const ftypStr = String.fromCharCode(...ftyp);
            if (ftypStr === 'ftyp') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Load an already-decoded audio buffer (playFromBuffer() passes one through)
     * Enhances existing audio manager with buffer loading capabilities
     */
    async loadAudioBufferDirect(audioBuffer) {
        try {
            if (!this.audioContext) {
                await this.initializeAudioContext();
            }

            // Stop current audio if playing
            if (this.isPlaying) {
                this.stop();
            }

            // Store the audio buffer
            this.audioBuffer = audioBuffer;
            this.duration = audioBuffer.duration;
            this.currentTime = 0;

            // Create source for frequency analysis
            if (this.source) {
                this.source.disconnect();
            }

            // Trigger loaded callback
            this.triggerCallbacks('onLoadComplete', {
                duration: this.duration,
                sampleRate: audioBuffer.sampleRate,
                numberOfChannels: audioBuffer.numberOfChannels
            });

            if (window.SONOITE_DEBUG) {
                dlog(`🎵 Audio buffer loaded: ${this.duration.toFixed(2)}s`);
            }

        } catch (error) {
            this.handleError('Audio buffer loading failed', error);
            throw error;
        }
    }

    /**
     * Play from loaded audio buffer
     * Enhanced playback method; play() delegates here
     */
    async playFromBuffer(audioBuffer = null) {
        // BUG-FIX: Prevent concurrent play operations
        if (this.isTransitioning) {
            dwarn('Play operation already in progress, ignoring');
            return false;
        }

        this.isTransitioning = true;

        try {
            if (audioBuffer) {
                await this.loadAudioBufferDirect(audioBuffer);
            }

            if (!this.audioBuffer) {
                throw new Error('No audio buffer loaded');
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // BUG-FIX: Safely stop existing source before creating new one
            if (this.source) {
                try {
                    // Prevent ended() handler from firing during source replacement
                    this.source.removeEventListener('ended', this.handleAudioEnd);
                    this.source.stop();
                } catch (e) {
                    // Already stopped, ignore
                }
                this.source = null;
            }

            // Create new buffer source
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = this.audioBuffer;

            // Create gain node for volume control
            if (!this.gainNode) {
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = this.volume;
            }

            // Connect audio graph
            this.source.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.outputNode || this.audioContext.destination);

            // Initialize Meyda analyzer
            this.initializeMeydaAnalyzer();

            // Set up ended event
            this.source.addEventListener('ended', this.handleAudioEnd);

            // Start playback
            const maxOffset = Number.isFinite(this.duration) ? Math.max(this.duration - 0.001, 0) : Number.POSITIVE_INFINITY;
            const safeOffset = Math.max(0, Math.min(Number.isFinite(this.currentTime) ? this.currentTime : 0, maxOffset));
            this.currentTime = safeOffset;
            const now = this.audioContext.currentTime;
            this.source.start(now, safeOffset);
            this.startTime = now - safeOffset;
            this.isPlaying = true;
            this.isPaused = false;

            this.startFrequencyAnalysis();
            this.startTimeUpdateLoop();
            this.triggerCallbacks('onPlay');
            
            // Start Meyda analysis
            if (this.meydaAnalyzer) {
                this.meydaAnalyzer.start();
            }

            if (audioBuffer) {
                document.dispatchEvent(new CustomEvent('trackChanged', {
                    detail: { audioBuffer, timestamp: performance.now() }
                }));
            }

            return true;

        } catch (error) {
            this.handleError('Buffer playback failed', error);
            throw error;
        } finally {
            // BUG-FIX: Always release transition lock
            this.isTransitioning = false;
        }
    }

    /**
     * Enhanced play method that works with both URLs and buffers
     */
    async play() {
        // Ensure audio context is running (Safari mobile fix)
        const contextReady = await this.ensureAudioContextRunning();
        if (!contextReady) {
            dwarn('Audio context not ready, play operation cancelled');
            return false;
        }

        if (this.audioBuffer) {
            return this.playFromBuffer();
        }

        return this.playFromURL();
    }

    /**
     * Play from URL (original method)
     */
    async playFromURL() {
        if (!this.audioBuffer) {
            if (window.SONOITE_DEBUG) {
                dwarn('No audio buffer loaded');
            }
            return false;
        }
        
        try {
            await this.resumeAudioContext();
            
            // Stop any existing source
            if (this.source) {
                this.source.stop();
            }
            
            // Create new source
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = this.audioBuffer;
            
            // Connect source to gain node
            this.source.connect(this.gainNode);
            
            // Set up event listeners
            this.source.addEventListener('ended', this.handleAudioEnd);
            
            // Start playback
            const rawOffset = this.isPaused ? this.currentTime : 0;
            const maxOffset = Number.isFinite(this.duration) ? Math.max(this.duration - 0.001, 0) : Number.POSITIVE_INFINITY;
            const safeOffset = Math.max(0, Math.min(Number.isFinite(rawOffset) ? rawOffset : 0, maxOffset));
            this.currentTime = safeOffset;
            const now = this.audioContext.currentTime;
            this.source.start(now, safeOffset);
            
            this.isPlaying = true;
            this.isPaused = false;
            this.startTime = now - safeOffset;
            
            // Start time update loop
            this.startTimeUpdateLoop();
            
            // Start real-time frequency analysis
            this.startFrequencyAnalysis();
            
            this.trigger('onPlay');
            return true;
            
        } catch (error) {
            derr('Failed to play audio:', error);
            this.handleError('Failed to play audio');
            return false;
        }
    }
    
    /**
     * Pause audio
     */
    pause() {
        if (this.isPlaying && this.source) {
            // Store current time before stopping
            this.currentTime = this.getCurrentTime();

            // BUG-FIX: Safely stop source with try/catch
            try {
                // Prevent ended() handler from firing on intentional pause
                this.source.removeEventListener('ended', this.handleAudioEnd);
                this.source.stop();
            } catch (e) {
                // Already stopped, ignore
            }

            this.source = null;  // BUG-FIX: Clear reference
            this.isPlaying = false;
            this.isPaused = true;

            // Stop frequency analysis
            this.stopFrequencyAnalysis();

            // Stop Meyda analysis
            if (this.meydaAnalyzer) {
                this.meydaAnalyzer.stop();
            }

            this.trigger('onPause');
        }
    }
    
    /**
     * Stop audio
     */
    stop() {
        if (this.source) {
            // Prevent ended() handler from firing on intentional stop
            this.source.removeEventListener('ended', this.handleAudioEnd);
            try {
                this.source.stop();
            } catch (e) {
                // Already stopped, ignore
            }
            this.source = null;
        }
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        
        // Stop frequency analysis
        this.stopFrequencyAnalysis();
        
        // Stop Meyda analysis
        if (this.meydaAnalyzer) {
            this.meydaAnalyzer.stop();
        }
        
        this.trigger('onStop');
    }
    
    /**
     * Toggle play/pause
     */
    async togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }
    
    /**
     * Seek to specific time
     * FIX-5: Complete async rewrite - BufferSourceNode cannot be repositioned, must recreate
     * @param {number} time - Target time in seconds
     * @returns {Promise<boolean>} - Success indicator
     */
    async seekTo(time) {
        if (!this.audioBuffer) {
            dwarn('No audio buffer loaded, cannot seek');
            return false;
        }

        const targetTime = Math.max(0, Math.min(time, this.duration));

        // Guard against concurrent seeks
        if (this.isTransitioning) {
            dwarn('Seek blocked - transition in progress');
            return false;
        }

        // If not playing, just update currentTime - will apply on next play()
        if (!this.isPlaying) {
            this.currentTime = targetTime;
            return true;
        }

        this.isTransitioning = true;

        try {
            this.currentTime = targetTime;

            // Ensure audio context is running (Safari mobile)
            if (this.audioContext.state === 'suspended') {
                await this.resumeAudioContext();
            }

            // Stop current source completely
            if (this.source) {
                // Remove ended listener BEFORE stopping to prevent reset
                this.source.removeEventListener('ended', this.handleAudioEnd);
                try {
                    this.source.stop();
                } catch (e) {
                    // Already stopped, ignore
                }
                this.source = null;
            }

            // Stop analysis during transition
            this.stopFrequencyAnalysis();

            // Create NEW BufferSourceNode at target position
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = this.audioBuffer;
            this.source.connect(this.gainNode);

            // Setup ended event
            this.source.addEventListener('ended', this.handleAudioEnd);

            // Start at target time (offset parameter)
            const now = this.audioContext.currentTime;
            this.source.start(now, targetTime);

            // Recalculate startTime for getCurrentTime() accuracy
            this.startTime = now - targetTime;

            // Resume analysis
            this.startFrequencyAnalysis();

            dlog(`Seeked to ${targetTime.toFixed(2)}s`);

            return true;

        } catch (error) {
            derr('Seek failed:', error);
            this.isPlaying = false;
            return false;

        } finally {
            this.isTransitioning = false;
        }
    }
    
    /**
     * Set volume with smooth transition
     */
    setVolume(volume) {
        const secureVolume = Math.max(0, Math.min(this.securityConfig.maxVolume, volume));

        if (secureVolume !== volume) {
            this.logSecurityViolation('Volume exceeds security limit', {
                requested: volume,
                applied: secureVolume,
                maxAllowed: this.securityConfig.maxVolume
            });
        }

        this.volume = secureVolume;
        this.applyGainVolume(this.volume);
    }

    applyGainVolume(targetVolume) {
        if (!this.gainNode?.gain) {
            return;
        }

        const gain = this.gainNode.gain;
        const currentTime = this.audioContext?.currentTime || 0;

        if (typeof gain.cancelScheduledValues === 'function') {
            gain.cancelScheduledValues(currentTime);
        }

        if (typeof gain.setValueAtTime === 'function') {
            gain.setValueAtTime(gain.value ?? this.volume, currentTime);
        }

        if (typeof gain.linearRampToValueAtTime === 'function') {
            gain.linearRampToValueAtTime(targetVolume, currentTime + 0.1);
        } else {
            gain.value = targetVolume;
        }
    }

    /**
     * Get current playback time
     */
    getCurrentTime() {
        if (this.isTransitioning) {
            return Math.max(0, Number.isFinite(this.currentTime) ? this.currentTime : 0);
        }

        if (this.isPlaying && Number.isFinite(this.startTime) && this.audioContext) {
            const elapsed = this.audioContext.currentTime - this.startTime;
            const capped = Number.isFinite(this.duration) && this.duration > 0
                ? Math.min(elapsed, this.duration)
                : elapsed;
            return Math.max(0, capped);
        }

        return Math.max(0, Number.isFinite(this.currentTime) ? this.currentTime : 0);
    }


    /**
     * Handle audio end event
     */
    handleAudioEnd = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = Number.isFinite(this.duration) ? this.duration : this.currentTime;

        this.stopFrequencyAnalysis();
        if (this.meydaAnalyzer) {
            this.meydaAnalyzer.stop();
        }

        this.trigger('onTimeUpdate', this.currentTime);
        this.trigger('onTrackEnd');
        this.trigger('onStop');
    }

    /**
     * Trigger callbacks with enhanced error handling
     */
    triggerCallbacks(event, data = null) {
        if (this.callbacks[event]) {
            try {
                this.callbacks[event](data);
            } catch (error) {
                derr(`Callback error for ${event}:`, error);
            }
        }
    }

    /**
     * Start real-time frequency analysis (throttled; configurable)
     */
    startFrequencyAnalysis() {
        if (!this.analyser || this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.updateFrequencyData();
    }
    
    /**
     * Stop real-time frequency analysis
     */
    stopFrequencyAnalysis() {
        this.isAnalyzing = false;
        if (this.analysisFrameId) {
            cancelAnimationFrame(this.analysisFrameId);
            this.analysisFrameId = null;
        }
    }

    /**
     * Update normalized buffer and compute average level (0-1)
     */
    updateNormalizedFrequencyData() {
        if (!this.frequencyData) return 0;

        if (!this.normalizedFrequencyData || this.normalizedFrequencyData.length !== this.frequencyData.length) {
            this.normalizedFrequencyData = new Float32Array(this.frequencyData.length);
        }

        const inv255 = 1 / 255;
        let sum = 0;

        for (let i = 0; i < this.frequencyData.length; i++) {
            const v = this.frequencyData[i];
            sum += v;
            this.normalizedFrequencyData[i] = v * inv255;
        }

        return sum / (this.frequencyData.length * 255);
    }
    
    /**
     * Real-time frequency data update loop (throttled)
     */
    updateFrequencyData() {
        if (!this.isAnalyzing || !this.analyser) return;
        
        const currentTime = performance.now();
        
        // Throttle analysis loop (default 30fps) to reduce CPU load/thermals.
        const intervalMs = Number.isFinite(this.analysisIntervalMs) ? this.analysisIntervalMs : 16.67;
        if (currentTime - this.lastAnalysisTime >= intervalMs) {
            // Update all frequency analysis data
            this.analyser.getByteFrequencyData(this.frequencyData);

            if (this.analysisIncludeFloatFrequencyData && this.frequencyDataFloat) {
                this.analyser.getFloatFrequencyData(this.frequencyDataFloat);
            }

            if (this.analysisIncludeTimeDomainData && this.timeDomainData) {
                this.analyser.getByteTimeDomainData(this.timeDomainData);
            }

            const averageLevel = this.updateNormalizedFrequencyData();
            this.averageFrequencyLevel = averageLevel;

            // Create comprehensive analysis data (reused object; treat as ephemeral)
            if (!this.reusableFrequencyAnalysisData) {
                this.reusableFrequencyAnalysisData = {};
            }
            const analysisData = this.reusableFrequencyAnalysisData;
            analysisData.frequency = this.frequencyData;
            analysisData.frequencyFloat = this.analysisIncludeFloatFrequencyData ? this.frequencyDataFloat : null;
            analysisData.timeDomain = this.analysisIncludeTimeDomainData ? this.timeDomainData : null;
            analysisData.normalized = this.normalizedFrequencyData;
            analysisData.bassLevel = this.getFrequencyRange(0, 60); // 0-60 Hz
            analysisData.midLevel = this.getFrequencyRange(60, 1000); // 60Hz-1kHz
            analysisData.trebleLevel = this.getFrequencyRange(1000, 8000); // 1kHz-8kHz
            analysisData.averageLevel = averageLevel;
            analysisData.timestamp = currentTime;

            if (typeof window !== 'undefined' && window.SONOITE_PROFILE && window.__sonoiteProfile?.active) {
                this.lastAnalysisTick = currentTime;
                window.__sonoiteProfile.lastAudioAnalysisTick = currentTime;
            }
            
            // Trigger analysis callbacks
            this.analysisCallbacks.forEach(callback => {
                try {
                    callback(analysisData);
                } catch (error) {
                    derr('Analysis callback error:', error);
                }
            });
            
            this.lastAnalysisTime = currentTime;
        }
        
        // Schedule next frame
        this.analysisFrameId = requestAnimationFrame(() => this.updateFrequencyData());
    }
    
    /**
     * Normalize frequency data to 0-1 range
     */
    normalizeFrequencyData(data, outBuffer = null) {
        const normalized = outBuffer || new Float32Array(data.length);
        const inv255 = 1 / 255;
        for (let i = 0; i < data.length; i++) {
            normalized[i] = data[i] * inv255;
        }
        return normalized;
    }
    
    /**
     * Get frequency data for specific range
     */
    getFrequencyRange(minFreq, maxFreq) {
        if (!this.analyser || !this.frequencyData) return 0;
        
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = this.analyser.fftSize;
        const binSize = sampleRate / fftSize;
        
        const minBin = Math.floor(minFreq / binSize);
        const maxBin = Math.floor(maxFreq / binSize);
        
        let sum = 0;
        let count = 0;
        
        for (let i = minBin; i <= maxBin && i < this.frequencyData.length; i++) {
            sum += this.frequencyData[i];
            count++;
        }
        
        return count > 0 ? (sum / count) / 255 : 0;
    }
    
    /**
     * Get frequency data for visualization (compatibility method)
     */
    getFrequencyData() {
        if (this.analyser && this.frequencyData) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            return this.frequencyData;
        }
        return null;
    }
    
    /**
     * Get time domain data (waveform)
     */
    getTimeDomainData() {
        if (this.analyser && this.timeDomainData) {
            this.analyser.getByteTimeDomainData(this.timeDomainData);
            return this.timeDomainData;
        }
        return null;
    }
    
    /**
     * Add callback for real-time frequency analysis
     */
    onFrequencyUpdate(callback) {
        if (typeof callback === 'function') {
            this.analysisCallbacks.push(callback);
        }
    }
    
    /**
     * Remove frequency analysis callback
     */
    offFrequencyUpdate(callback) {
        const index = this.analysisCallbacks.indexOf(callback);
        if (index > -1) {
            this.analysisCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Get average frequency for simple visualizations
     */
    getAverageFrequency() {
        if (this.isAnalyzing && Number.isFinite(this.averageFrequencyLevel)) {
            return this.averageFrequencyLevel;
        }

        const frequencies = this.getFrequencyData();
        if (!frequencies) return 0;

        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) {
            sum += frequencies[i];
        }

        const averageLevel = sum / frequencies.length / 255; // Normalize to 0-1
        this.averageFrequencyLevel = averageLevel;
        return averageLevel;
    }
    
    /**
     * Start time update loop
     */
    startTimeUpdateLoop() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        
        this.timeUpdateInterval = setInterval(() => {
            if (this.isPlaying && this.audioContext && this.audioContext.state === 'running') {
                const currentTime = this.getCurrentTime();
                this.trigger('onTimeUpdate', currentTime);
            }
        }, 100);
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }
    
    /**
     * Trigger event callback
     */
    trigger(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }
    
    /**
     * Handle errors
     */
    handleError(message) {
        derr('AudioManager Error:', message);
        this.trigger('onError', message);
    }
    
    /**
     * Log security violation
     */
    logSecurityViolation(event, data = {}) {
        const violation = {
            timestamp: new Date().toISOString(),
            event,
            data: this.sanitizeAuditData(data),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.auditLog.push(violation);
        
        // Keep audit log size manageable
        if (this.auditLog.length > 500) {
            this.auditLog = this.auditLog.slice(-500);
        }
        
        // Security violations should always be logged
        dwarn('SECURITY VIOLATION:', violation);
        this.trigger('onSecurityViolation', violation);
        
        // Send to server if configured
        this.reportSecurityViolation(violation);
    }
    
    /**
     * Log audit event
     */
    logAuditEvent(event, data = {}) {
        if (!this.securityConfig.enableAuditLog) return;
        
        const auditEvent = {
            timestamp: new Date().toISOString(),
            event,
            data: this.sanitizeAuditData(data),
            sessionId: this.getSessionId()
        };
        
        this.auditLog.push(auditEvent);
        
        // Keep audit log size manageable
        if (this.auditLog.length > 500) {
            this.auditLog = this.auditLog.slice(-500);
        }
        
        if (window.SONOITE_DEBUG) {
            dlog('AUDIT:', auditEvent);
        }
    }

    isSensitiveAuditKey(key) {
        return /(password|token|api[-_]?key|secret|private[-_]?key)/i.test(String(key || ''));
    }

    sanitizeAuditData(data, keyHint = '') {
        if (this.isSensitiveAuditKey(keyHint)) {
            return '[REDACTED]';
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeAuditData(item));
        }

        if (data && typeof data === 'object') {
            const sanitized = {};
            Object.entries(data).forEach(([key, value]) => {
                sanitized[key] = this.sanitizeAuditData(value, key);
            });
            return sanitized;
        }

        return data;
    }
    
    /**
     * Report security violation to server
     */
    async reportSecurityViolation(violation) {
        try {
            if (window.sonoiteSecurityConfig?.reportingEndpoint) {
                let details = '';
                try {
                    details = JSON.stringify({
                        violation,
                        sessionId: this.getSessionId(),
                        timestamp: new Date().toISOString(),
                        url: window.location.href
                    });
                } catch (serializationError) {
                    details = String(violation?.type || 'audio_security_violation');
                }

                if (details.length > 10000) {
                    details = details.slice(0, 10000);
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'X-Security-Report': 'true'
                };
                const nonce = window.sonoiteData?.restNonce || window.sonoiteData?.nonce || '';
                if (nonce) {
                    headers['X-WP-Nonce'] = nonce;
                }

                await fetch(window.sonoiteSecurityConfig.reportingEndpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        violation_type: 'audio_security_violation',
                        details,
                        url: window.location.href
                    })
                });
            }
        } catch (error) {
            derr('Failed to report security violation:', error);
        }
    }
    
    /**
     * Get session ID for tracking
     */
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = 'aud_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }
        return this.sessionId;
    }
    
    /**
     * Get security status
     */
    getSecurityStatus() {
        return {
            auditLogSize: this.auditLog.length,
            loadedUrls: Array.from(this.loadedUrls),
            requestCount: this.requestCount,
            securityConfig: this.securityConfig,
            violations: this.auditLog.filter(entry => entry.event.includes('violation')).length
        };
    }
    
    /**
     * Clear audit log (admin function)
     */
    clearAuditLog() {
        this.logAuditEvent('Audit log cleared');
        this.auditLog = [];
    }
    
    /**
     * Export audit log for analysis
     */
    exportAuditLog() {
        return {
            exportTimestamp: new Date().toISOString(),
            sessionId: this.getSessionId(),
            totalEvents: this.auditLog.length,
            securityConfig: this.securityConfig,
            events: this.auditLog
        };
    }

    /**
     * Initialize Meyda analyzer for advanced audio feature extraction
     */
    initializeMeydaAnalyzer() {
        if (!this.enableAdvancedAnalysis || !this.source || !this.audioContext) return;

        // P0-MEMORY-FIX: Properly destroy existing analyzer before creating new one
        // Meyda doesn't have a destroy() method, so we manually disconnect internal nodes
        if (this.meydaAnalyzer) {
            try {
                this.meydaAnalyzer.stop();

                // Disconnect internal Web Audio nodes to prevent memory leak
                // Note: _m is internal to Meyda - we feature-detect to avoid breaking on version changes
                const internals = this.meydaAnalyzer._m;
                if (internals) {
                    if (internals.analyser && typeof internals.analyser.disconnect === 'function') {
                        internals.analyser.disconnect();
                    }
                    // Don't disconnect source - it's shared with our audio pipeline
                    if (internals.scriptNode && typeof internals.scriptNode.disconnect === 'function') {
                        internals.scriptNode.disconnect();
                    }
                }
            } catch (e) {
                // Ignore cleanup errors - analyzer may be in invalid state
                if (window.SONOITE_DEBUG) {
                    console.warn('[AudioManager] Meyda cleanup error:', e.message);
                }
            }
            this.meydaAnalyzer = null;
        }

        try {
            // Create Meyda analyzer with selected features
            this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
                audioContext: this.audioContext,
                source: this.source,
                bufferSize: 1024, // Increased from 512 for better stability
                featureExtractors: ['loudness', 'chroma', 'spectralCentroid', 'spectralRolloff'],
                callback: (features) => {
                    // Store extracted features
                    this.meydaFeatures = {
                        loudness: features.loudness,
                        chroma: features.chroma,
                        spectralCentroid: features.spectralCentroid,
                        spectralRolloff: features.spectralRolloff
                    };
                    
                    // Debug logging for Meyda
                    if (Math.random() < 0.02) { // Log 2% of the time
                        if (window.SONOITE_DEBUG) {
                            dlog('🎵 Meyda Features:', {
                                centroid: features.spectralCentroid?.toFixed(0),
                                loudness: features.loudness?.total?.toFixed(2),
                                dominantChroma: features.chroma?.indexOf(Math.max(...features.chroma))
                            });
                        }
                    }
                }
            });
            
            if (window.SONOITE_DEBUG) {
                dlog('🎵 Meyda analyzer initialized');
            }
        } catch (error) {
            derr('Failed to initialize Meyda analyzer:', error);
            this.meydaAnalyzer = null;
        }
    }
    
    /**
     * Get comprehensive audio data including Meyda features
     */
    getAudioData() {
        const frequencyBands = this.getFrequencyBands();
        
        return {
            bassLevel: frequencyBands.bass,
            midLevel: frequencyBands.mid,
            trebleLevel: frequencyBands.treble,
            meyda: this.meydaFeatures,
            timestamp: performance.now()
        };
    }
    
    /**
     * SAFARI MOBILE AUDIO CONTEXT HELPERS
     * Handle aggressive audio context suspension on mobile devices
     */

    async resumeAudioContext() {
        if (!this.audioContext) return false;

        try {
            if (this.audioContext.state === 'suspended') {
                dlog('🔊 Resuming suspended audio context (Safari mobile fix)');
                await this.audioContext.resume();

                // Wait a bit to ensure context is actually resumed
                let attempts = 0;
                while (this.audioContext.state !== 'running' && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    attempts++;
                }

                if (this.audioContext.state === 'running') {
                    dlog('✅ Audio context successfully resumed');
                    return true;
                } else {
                    dwarn('⚠️ Audio context failed to resume after 10 attempts');
                    return false;
                }
            }
            return true;

        } catch (error) {
            derr('Failed to resume audio context:', error);
            return false;
        }
    }

    /**
     * Ensure audio context is running before any audio operation
     */
    async ensureAudioContextRunning() {
        if (!this.audioContext) return false;

        // Always try to resume on user interaction for Safari mobile
        if (this.audioContext.state !== 'running') {
            return await this.resumeAudioContext();
        }

        return true;
    }

    /**
     * Setup user interaction handlers for audio context resumption
     */
    setupUserInteractionHandlers() {
        this.resumeOnUserActionHandler = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.resumeAudioContext();
            }
        };

        // Add listeners for various user interaction events
        this.userInteractionEvents.forEach(event => {
            document.addEventListener(event, this.resumeOnUserActionHandler, { once: true, passive: true });
        });

        // Also listen for visibility change (important for mobile)
        this.visibilityResumeHandler = async () => {
            if (!document.hidden && this.audioContext) {
                await this.resumeAudioContext();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityResumeHandler);

        dlog('🎯 User interaction handlers set up for audio context resumption');
    }

    /**
     * Five-band levels (bass, lowMid, mid, highMid, treble; 0-1) from the analyser's byte data.
     * Feeds getAudioData() and getAudioAnalysis(), which only the legacy runtime calls.
     */
    getFrequencyBands() {
        if (!this.frequencyData) return null;

        // Define frequency bands
        const bands = {
            bass: { start: 0, end: 8 },      // ~20-250Hz
            lowMid: { start: 8, end: 16 },   // ~250-500Hz
            mid: { start: 16, end: 64 },     // ~500-2000Hz
            highMid: { start: 64, end: 128 }, // ~2000-4000Hz
            treble: { start: 128, end: 256 }  // ~4000-8000Hz
        };

        const analysis = {};
        Object.keys(bands).forEach(band => {
            const { start, end } = bands[band];
            let sum = 0;
            let count = 0;

            for (let i = start; i < end && i < this.frequencyData.length; i++) {
                sum += this.frequencyData[i];
                count++;
            }

            analysis[band] = count > 0 ? (sum / count) / 255 : 0;
        });

        return analysis;
    }

    getAudioAnalysis() {
        const bands = this.getFrequencyBands();
        if (!bands) return this.getFallbackAudioData();

        // Calculate derived metrics
        const overall = Object.values(bands).reduce((sum, val) => sum + val, 0) / Object.keys(bands).length;

        // Enhanced analysis for Visual Layer API compatibility
        const analysis = {
            // Core frequency bands (0-1 normalized)
            bass: Math.min(1, bands.bass),
            mid: Math.min(1, (bands.lowMid + bands.mid + bands.highMid) / 3),
            treble: Math.min(1, bands.treble),
            loudness: Math.min(1, overall),

            // Individual band levels for fine-grained control
            bassLevel: Math.min(1, bands.bass),
            midLevel: Math.min(1, bands.mid),
            trebleLevel: Math.min(1, bands.treble),
            lowMidLevel: Math.min(1, bands.lowMid),
            highMidLevel: Math.min(1, bands.highMid),

            // Enhanced Meyda features with fallbacks
            spectralCentroid: this.meydaFeatures?.spectralCentroid || 0.5,
            spectralRolloff: this.meydaFeatures?.spectralRolloff || 0.5,
            chroma: this.meydaFeatures?.chroma || new Array(12).fill(0),

            // Loudness processing for Visual Layer API
            loudnessTotal: this.meydaFeatures?.loudness?.total || overall,
            loudnessSpecific: this.meydaFeatures?.loudness?.specific || [],

            // Timestamp for synchronization
            timestamp: performance.now(),

            // Visual Layer API compatibility flags
            normalized: true,
            hasAdvancedFeatures: !!this.meydaAnalyzer
        };

        return analysis;
    }

    getFallbackAudioData() {
        // Provide safe fallback data when audio analysis fails
        return {
            bass: 0, mid: 0, treble: 0, loudness: 0,
            bassLevel: 0, midLevel: 0, trebleLevel: 0,
            lowMidLevel: 0, highMidLevel: 0,
            spectralCentroid: 0.5, spectralRolloff: 0.5,
            chroma: new Array(12).fill(0),
            loudnessTotal: 0, loudnessSpecific: [],
            timestamp: performance.now(),
            normalized: true, hasAdvancedFeatures: false
        };
    }

    /**
     * Cleanup resources with security logging
     */
    dispose() {
        this.logAuditEvent('AudioManager disposed');
        
        this.stop();
        
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        
        if (this.loadAbortController) {
            this.loadAbortController.abort();
        }
        
        if (this.audioContext && typeof this.audioContext.close === 'function') {
            this.audioContext.close().catch(() => {
                // Ignore teardown errors from already-closed contexts
            });
        }

        if (this.resumeOnUserActionHandler) {
            this.userInteractionEvents.forEach((event) => {
                document.removeEventListener(event, this.resumeOnUserActionHandler);
            });
            this.resumeOnUserActionHandler = null;
        }

        if (this.visibilityResumeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityResumeHandler);
            this.visibilityResumeHandler = null;
        }
        
        // Stop frequency analysis
        this.stopFrequencyAnalysis();
        
        // P0-MEMORY-FIX: Clean up Meyda analyzer with proper node disconnection
        if (this.meydaAnalyzer) {
            try {
                this.meydaAnalyzer.stop();
                const internals = this.meydaAnalyzer._m;
                if (internals) {
                    if (internals.analyser?.disconnect) internals.analyser.disconnect();
                    if (internals.scriptNode?.disconnect) internals.scriptNode.disconnect();
                }
            } catch (e) {
                // Ignore cleanup errors
            }
            this.meydaAnalyzer = null;
        }

        this.analysisCallbacks = [];

        // Clear sensitive data
        this.audioBuffer = null;
        this.source = null;
        this.audioContext = null;
        this.analyser = null;
        this.gainNode = null;
        this.frequencyData = null;
        this.loadedUrls.clear();
        this.expectedChecksums.clear();
        
        // Keep audit log for security analysis
        this.logAuditEvent('Cleanup completed');
    }
}
