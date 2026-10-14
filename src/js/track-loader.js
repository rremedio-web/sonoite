/**
 * Sonoite Track Loader
 * Secure track loading system with WordPress REST API integration
 * Handles audio buffer management and consciousness visualization integration
 */

export class SonoiteTrackLoader {
    constructor(audioManager, options = {}) {
        this.audioManager = audioManager;
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            timeoutDuration: 30000,
            maxCacheSize: 5, // Maximum cached tracks
            preloadNext: true,
            enableCrossfade: false,
            ...options
        };

        // Track management
        this.tracks = [];
        this.currentTrackIndex = -1;
        this.currentTrack = null;
        this.trackCache = new Map();
        this.loadingPromises = new Map();

        // WordPress integration
        // Prefer absolute API URL from WP; fallback to inferred base path (handles /homem/)
        const baseApi =
            (window.sonoiteData && window.sonoiteData.apiUrl) ||
            `${window.location.origin}${
                window.location.pathname.startsWith('/homem/')
                    ? '/homem/wp-json/sonoite/v1/'
                    : '/wp-json/sonoite/v1/'
            }`;
        this.restEndpoint = baseApi.replace(/\/?$/, '');
        this.nonce = window.sonoiteData?.restNonce || window.sonoiteData?.nonce || '';

        // State management
        this.isLoading = false;
        this.loadingProgress = 0;

        // Event callbacks
        this.callbacks = {
            onTrackLoaded: [],
            onTrackChanged: [],
            onLoadProgress: [],
            onLoadError: [],
            onPlaylistReady: []
        };

        this.init();
    }

    /**
     * Initialize track loader
     */
    async init() {
        try {
            // Fetch tracks from WordPress REST API
            await this.fetchTracksFromWordPress();

            // Set up UI event listeners
            this.setupUIEventListeners();

            // Preload first track if available
            if (this.tracks.length > 0) {
                this.preloadTrack(0);
            }

            console.log(`🎵 Track loader initialized with ${this.tracks.length} tracks`);
            this.triggerCallback('onPlaylistReady', this.tracks);

        } catch (error) {
            console.error('Track loader initialization failed:', error);
            this.handleError('initialization_failed', error);
        }
    }

    /**
     * Fetch tracks from WordPress REST API with security
     */
    async fetchTracksFromWordPress() {
        try {
            this.updateLoadingProgress(0.1, __('Connecting to server...', 'sonoite-theme'));

            const response = await fetch(this.restEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.nonce,
                    'Cache-Control': 'no-cache'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`REST API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.tracks || !Array.isArray(data.tracks)) {
                throw new Error('Invalid tracks data received from server');
            }

            // Validate and sanitize track data
            this.tracks = data.tracks.filter(track => this.validateTrackData(track));

            this.updateLoadingProgress(0.3, __('Tracks loaded successfully', 'sonoite-theme'));

        } catch (error) {
            console.error('Failed to fetch tracks from WordPress:', error);
            throw new Error(`Track loading failed: ${error.message}`);
        }
    }

    /**
     * Validate track data security and completeness
     */
    validateTrackData(track) {
        // Required fields validation
        const requiredFields = ['id', 'title', 'audio_url'];
        for (const field of requiredFields) {
            if (!track[field]) {
                console.warn(`Track missing required field: ${field}`, track);
                return false;
            }
        }

        // Audio URL security validation
        if (!this.validateAudioURL(track.audio_url)) {
            console.warn('Invalid audio URL for track:', track.title);
            return false;
        }

        // Sanitize track data
        track.id = parseInt(track.id);
        track.title = this.sanitizeString(track.title);
        track.content = this.sanitizeString(track.content || '');
        track.duration = this.sanitizeString(track.duration || '');

        return true;
    }

    /**
     * Validate audio URL for security compliance
     */
    validateAudioURL(url) {
        try {
            const parsedURL = new URL(url);

            // Check allowed hosts (from security configuration)
            // SEC-01: CDN hosts removed (Dec 3, 2025) - all assets served locally
            const allowedHosts = [
                window.location.hostname,
            ];

            if (!allowedHosts.includes(parsedURL.hostname)) {
                return false;
            }

            // Check file extension
            const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
            const extension = parsedURL.pathname.split('.').pop().toLowerCase();

            return allowedExtensions.includes(extension);

        } catch (error) {
            return false;
        }
    }

    /**
     * Sanitize string input
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/[<>]/g, '');
    }

    /**
     * Load specific track by index
     */
    async loadTrack(trackIndex) {
        if (trackIndex < 0 || trackIndex >= this.tracks.length) {
            throw new Error(`Invalid track index: ${trackIndex}`);
        }

        const track = this.tracks[trackIndex];

        try {
            this.isLoading = true;
            this.currentTrackIndex = trackIndex;

            this.updateLoadingProgress(0.1, __('Loading track...', 'sonoite-theme'));
            this.announceToScreenReader(__('Loading track: {title}', 'sonoite-theme').replace('{title}', track.title));

            // Check cache first
            if (this.trackCache.has(track.id)) {
                const cachedTrack = this.trackCache.get(track.id);
                await this.playTrack(cachedTrack);
                return cachedTrack;
            }

            // Check if already loading
            if (this.loadingPromises.has(track.id)) {
                return await this.loadingPromises.get(track.id);
            }

            // Start loading process
            const loadingPromise = this.loadTrackWithRetry(track);
            this.loadingPromises.set(track.id, loadingPromise);

            const loadedTrack = await loadingPromise;
            this.loadingPromises.delete(track.id);

            // Cache management
            this.addToCache(loadedTrack);

            // Play the track
            await this.playTrack(loadedTrack);

            // Preload next track if enabled
            if (this.options.preloadNext && trackIndex + 1 < this.tracks.length) {
                this.preloadTrack(trackIndex + 1);
            }

            return loadedTrack;

        } catch (error) {
            this.loadingPromises.delete(track.id);
            this.handleError('track_load_failed', error, track);
            throw error;
        } finally {
            this.isLoading = false;
            this.updateLoadingProgress(1.0, __('Ready', 'sonoite-theme'));
        }
    }

    /**
     * Load track with retry mechanism
     */
    async loadTrackWithRetry(track) {
        let lastError;

        for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
            try {
                this.updateLoadingProgress(
                    0.2 + (attempt - 1) * 0.2,
                    __('Loading attempt {attempt}...', 'sonoite-theme').replace('{attempt}', attempt)
                );

                const audioBuffer = await this.fetchAudioBuffer(track.audio_url, attempt);

                const loadedTrack = {
                    ...track,
                    audioBuffer: audioBuffer,
                    loadedAt: Date.now(),
                    loadAttempts: attempt
                };

                this.updateLoadingProgress(0.8, __('Processing audio...', 'sonoite-theme'));

                return loadedTrack;

            } catch (error) {
                lastError = error;
                console.warn(`Track loading attempt ${attempt} failed:`, error.message);

                if (attempt < this.options.maxRetries) {
                    const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    this.updateLoadingProgress(
                        0.2 + (attempt - 1) * 0.2,
                        __('Retrying in {seconds}s...', 'sonoite-theme').replace('{seconds}', Math.ceil(delay / 1000))
                    );
                    await this.delay(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Fetch audio buffer with timeout and progress tracking
     */
    async fetchAudioBuffer(url, attempt) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutDuration);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': attempt === 1 ? 'no-cache' : 'max-age=3600'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;

            // Track download progress
            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                loaded += value.length;

                if (total > 0) {
                    const progress = 0.4 + (loaded / total) * 0.3; // 40% to 70% progress
                    this.updateLoadingProgress(progress, __('Downloading...', 'sonoite-theme'));
                }
            }

            // Combine chunks into ArrayBuffer
            const arrayBuffer = new Uint8Array(loaded);
            let offset = 0;
            for (const chunk of chunks) {
                arrayBuffer.set(chunk, offset);
                offset += chunk.length;
            }

            this.updateLoadingProgress(0.7, __('Decoding audio...', 'sonoite-theme'));

            // Decode audio data
            const audioBuffer = await this.audioManager.audioContext.decodeAudioData(arrayBuffer.buffer);

            return audioBuffer;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Audio loading timed out');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Play loaded track
     */
    async playTrack(loadedTrack) {
        if (!this.audioManager) {
            throw new Error('Audio manager not available');
        }

        try {
            // MP7-AUDIO-OVERLAP: Always stop before loading new source
            this.audioManager.stop();

            // MP7-AUDIO-OVERLAP: Load audio buffer directly (prevents URL-based overlap)
            await this.audioManager.loadAudioBufferDirect(loadedTrack.audioBuffer);

            // Update current track
            this.currentTrack = loadedTrack;

            // Update UI
            this.updateTrackUI(loadedTrack);

            // Start playback
            await this.audioManager.play();

            // Announce to screen reader
            this.announceToScreenReader(__('Now playing: {title}', 'sonoite-theme').replace('{title}', loadedTrack.title));

            // Trigger callbacks
            this.triggerCallback('onTrackChanged', loadedTrack);

            console.log(`🎵 Now playing: ${loadedTrack.title}`);

        } catch (error) {
            this.handleError('playback_failed', error, loadedTrack);
            throw error;
        }
    }

    /**
     * Cache management
     */
    addToCache(track) {
        // Remove oldest tracks if cache is full
        if (this.trackCache.size >= this.options.maxCacheSize) {
            const oldestKey = this.trackCache.keys().next().value;
            this.trackCache.delete(oldestKey);
        }

        this.trackCache.set(track.id, track);
        console.log(`🎵 Cached track: ${track.title} (${this.trackCache.size}/${this.options.maxCacheSize})`);
    }

    /**
     * Preload track for faster playback
     */
    async preloadTrack(trackIndex) {
        if (trackIndex < 0 || trackIndex >= this.tracks.length) {
            return;
        }

        const track = this.tracks[trackIndex];

        if (this.trackCache.has(track.id) || this.loadingPromises.has(track.id)) {
            return; // Already cached or loading
        }

        try {
            console.log(`🎵 Preloading track: ${track.title}`);
            const loadingPromise = this.loadTrackWithRetry(track);
            this.loadingPromises.set(track.id, loadingPromise);

            const loadedTrack = await loadingPromise;
            this.addToCache(loadedTrack);
            this.loadingPromises.delete(track.id);

        } catch (error) {
            this.loadingPromises.delete(track.id);
            console.warn(`Failed to preload track ${track.title}:`, error.message);
        }
    }

    /**
     * Setup UI event listeners
     */
    setupUIEventListeners() {
        // Track selection buttons
        // BUG-FIX-DEC13: Use data-track-index attribute instead of forEach index
        // The forEach index is DOM position, not actual track index. If buttons are
        // reordered or hidden, the index doesn't match the track.
        const trackButtons = document.querySelectorAll('.track-button');
        trackButtons.forEach((button) => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                const trackIndex = parseInt(button.dataset.trackIndex, 10);
                await this.handleTrackSelection(trackIndex, button);
            });

            // Keyboard support
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const trackIndex = parseInt(button.dataset.trackIndex, 10);
                    this.handleTrackSelection(trackIndex, button);
                }
            });
        });

        // Next/Previous controls
        const nextButton = document.getElementById('next-track');
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextTrack());
        }

        const prevButton = document.getElementById('prev-track');
        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousTrack());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return; // Don't interfere with form inputs
            }

            switch (event.key) {
                case 'ArrowRight':
                    event.preventDefault();
                    this.nextTrack();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.previousTrack();
                    break;
                case ' ':
                    event.preventDefault();
                    this.togglePlayback();
                    break;
            }
        });
    }

    /**
     * Handle track selection with UI feedback
     */
    async handleTrackSelection(trackIndex, buttonElement) {
        if (this.isLoading) {
            console.warn('Track loading in progress, ignoring selection');
            return;
        }

        try {
            // Update button state
            buttonElement.disabled = true;
            buttonElement.classList.add('loading');

            const originalText = buttonElement.textContent;
            buttonElement.textContent = __('Loading...', 'sonoite-theme');

            // Load and play track
            await this.loadTrack(trackIndex);

            // Reset button state
            buttonElement.textContent = originalText;
            buttonElement.classList.remove('loading');
            buttonElement.disabled = false;

        } catch (error) {
            console.error(`Failed to load track ${trackIndex}:`, error);

            // Reset button state
            buttonElement.classList.remove('loading');
            buttonElement.disabled = false;
            buttonElement.textContent = buttonElement.dataset.originalText || buttonElement.textContent;

            // Show user-friendly error
            this.showUserError(__('Failed to load track. Please try again.', 'sonoite-theme'));
        }
    }

    /**
     * Navigate to next track
     */
    async nextTrack() {
        if (this.currentTrackIndex < this.tracks.length - 1) {
            await this.loadTrack(this.currentTrackIndex + 1);
        }
    }

    /**
     * Navigate to previous track
     */
    async previousTrack() {
        if (this.currentTrackIndex > 0) {
            await this.loadTrack(this.currentTrackIndex - 1);
        }
    }

    /**
     * Toggle playback
     */
    togglePlayback() {
        if (this.audioManager.isPlaying) {
            this.audioManager.pause();
        } else {
            this.audioManager.play();
        }
    }

    /**
     * Update track UI elements
     */
    updateTrackUI(track) {
        // Update current track info
        const titleElement = document.querySelector('.current-track-title');
        if (titleElement) {
            titleElement.textContent = track.title;
        }

        const descriptionElement = document.querySelector('.current-track-description');
        if (descriptionElement) {
            descriptionElement.textContent = track.content || '';
        }

        // Update global accent color based on track metadata if available
        if (track.consciousness && track.consciousness.color_palette) {
            try {
                document.documentElement.style.setProperty('--accent-color', track.consciousness.color_palette);
            } catch (e) {
                // Silently ignore if setting the property fails
            }
        }

        // Update track navigation active state
        document.querySelectorAll('.track-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.currentTrackIndex);
        });

        // Update progress indicators
        this.updateProgressUI(track);
    }

    /**
     * Update loading progress UI
     */
    updateLoadingProgress(progress, message) {
        this.loadingProgress = Math.max(0, Math.min(1, progress));

        const progressBar = document.querySelector('.loading-progress');
        if (progressBar) {
            progressBar.style.width = `${this.loadingProgress * 100}%`;
        }

        const statusText = document.querySelector('.loading-status');
        if (statusText) {
            statusText.textContent = message;
        }

        this.triggerCallback('onLoadProgress', { progress: this.loadingProgress, message });
    }

    /**
     * Update progress UI
     */
    updateProgressUI(track) {
        // This will be enhanced when progress tracking is implemented
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
    }

    /**
     * Announce to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }

    /**
     * Show user-friendly error message
     */
    showUserError(message) {
        // Create temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'sonoite-error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(220, 38, 38, 0.9);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            z-index: 10000;
            max-width: 300px;
            font-size: 0.9rem;
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Handle errors with comprehensive logging
     */
    handleError(type, error, track = null) {
        const errorData = {
            type: type,
            message: error.message,
            stack: error.stack,
            track: track ? { id: track.id, title: track.title } : null,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log to console
        console.error('Sonoite Track Loader Error:', errorData);

        // Trigger error callback
        this.triggerCallback('onLoadError', errorData);

        // Report to WordPress if security endpoint is available
        if (window.sonoiteData?.reportingEndpoint) {
            this.reportError(errorData);
        }
    }

    /**
     * Report error to WordPress security system
     */
    async reportError(errorData) {
        try {
            let details = '';
            try {
                details = JSON.stringify(errorData);
            } catch (serializationError) {
                details = String(errorData?.message || 'track_loader_error');
            }

            if (details.length > 10000) {
                details = details.slice(0, 10000);
            }

            await fetch(window.sonoiteData.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.nonce
                },
                body: JSON.stringify({
                    violation_type: 'track_loader_error',
                    details,
                    url: window.location.href
                })
            });
        } catch (error) {
            console.warn('Failed to report error to WordPress:', error);
        }
    }

    /**
     * Utility: Create delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Event callback management
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    triggerCallback(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get current playlist state
     */
    getPlaylistState() {
        return {
            tracks: this.tracks,
            currentTrackIndex: this.currentTrackIndex,
            currentTrack: this.currentTrack,
            isLoading: this.isLoading,
            loadingProgress: this.loadingProgress,
            cacheSize: this.trackCache.size
        };
    }

    /**
     * Clear cache and reset state
     */
    clearCache() {
        this.trackCache.clear();
        this.loadingPromises.clear();
        console.log('🎵 Track cache cleared');
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.clearCache();
        this.callbacks = {
            onTrackLoaded: [],
            onTrackChanged: [],
            onLoadProgress: [],
            onLoadError: [],
            onPlaylistReady: []
        };
        console.log('🎵 Track loader disposed');
    }
}

// Helper function to support WordPress internationalization
function __(text, domain) {
    // In a real WordPress environment, this would use wp.i18n.__()
    // For now, return the text as-is
    return text;
}
