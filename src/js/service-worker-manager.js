/**
 * Service Worker Manager for Sonoite Theme
 * Handles registration, updates, and communication with Service Worker
 * 
 * @version 1.0.0
 */

export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isSupported = 'serviceWorker' in navigator;
        this.isOnline = navigator.onLine;
        this.cacheUpdates = [];

        // P0-MEMORY-FIX: Store interval ID for cleanup
        this.updateCheckInterval = null;

        this.init();
    }

    /**
     * Initialize Service Worker Manager
     */
    async init() {
        if (!this.isSupported) {
            console.warn('🚫 Service Worker not supported in this browser');
            return;
        }

        // Set up online/offline listeners
        this.setupConnectivityListeners();
        
        // Register Service Worker
        await this.register();
        
        // Set up update listeners
        this.setupUpdateListeners();
        
        console.log('🌌 Service Worker Manager initialized');
    }

    /**
     * Register Service Worker
     */
    async register() {
        try {
            this.registration = await navigator.serviceWorker.register(
                `${window.sonoiteData?.themeUrl || ''}/src/service-worker.js`,
                { 
                    scope: '/',
                    updateViaCache: 'none' // Always check for updates
                }
            );

            console.log('✅ Service Worker registered successfully');

            // Handle different registration states
            if (this.registration.installing) {
                console.log('🔧 Service Worker installing...');
                this.trackInstallProgress(this.registration.installing);
            } else if (this.registration.waiting) {
                console.log('⏳ Service Worker waiting...');
                this.showUpdatePrompt();
            } else if (this.registration.active) {
                console.log('🚀 Service Worker active');
                this.onServiceWorkerReady();
            }

        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }

    /**
     * Track Service Worker installation progress
     */
    trackInstallProgress(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    console.log('🔄 New Service Worker installed, update available');
                    this.showUpdatePrompt();
                } else {
                    console.log('✅ Service Worker installed for the first time');
                    this.onServiceWorkerReady();
                }
            }
        });
    }

    /**
     * Set up connectivity listeners
     */
    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online - resuming normal operation');
            this.syncPendingUpdates();
            this.showConnectivityStatus('online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Gone offline - switching to cache-first mode');
            this.showConnectivityStatus('offline');
        });
    }

    /**
     * Set up Service Worker update listeners
     */
    setupUpdateListeners() {
        // Listen for updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service Worker controller changed - reloading');
            window.location.reload();
        });

        // Check for updates periodically (P0-MEMORY-FIX: store interval ID)
        this.updateCheckInterval = setInterval(() => {
            if (this.registration) {
                this.registration.update();
            }
        }, 60000); // Check every minute
    }

    /**
     * P0-MEMORY-FIX: Dispose method to clean up interval
     */
    dispose() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }
        console.log('[ServiceWorkerManager] Disposed');
    }

    /**
     * Handle Service Worker ready state
     */
    onServiceWorkerReady() {
        // Prefetch audio files if we have track data
        if (window.sonoiteData?.tracks) {
            this.prefetchAudioFiles(window.sonoiteData.tracks);
        }

        // Send manifest data to Service Worker
        if (window.sonoiteAssetManifest) {
            this.sendMessage({
                type: 'UPDATE_MANIFEST',
                payload: { manifest: window.sonoiteAssetManifest }
            });
        }

        // Dispatch event for other parts of the app
        document.dispatchEvent(new CustomEvent('serviceWorkerReady', {
            detail: { registration: this.registration }
        }));
    }

    /**
     * Show update prompt to user
     */
    showUpdatePrompt() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'sonoite-update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🌟</span>
                <span class="update-text">A new version of the Sonoite experience is available!</span>
                <button class="update-button">Update Now</button>
                <button class="dismiss-button">Later</button>
            </div>
        `;

        // Add styles
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            z-index: 10000;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;

        // Add methods
        updateBanner.handleUpdate = () => {
            if (this.registration && this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            updateBanner.dismiss();
        };

        updateBanner.dismiss = () => {
            updateBanner.style.transform = 'translateY(-100%)';
            setTimeout(() => updateBanner.remove(), 300);
        };

        document.body.appendChild(updateBanner);

        // Attach CSP-safe handlers instead of inline onclick
        const updateBtn = updateBanner.querySelector('.update-button');
        const dismissBtn = updateBanner.querySelector('.dismiss-button');
        if (updateBtn) updateBtn.addEventListener('click', updateBanner.handleUpdate);
        if (dismissBtn) dismissBtn.addEventListener('click', updateBanner.dismiss);

        // Animate in
        setTimeout(() => {
            updateBanner.style.transform = 'translateY(0)';
        }, 100);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (updateBanner.parentElement) {
                updateBanner.dismiss();
            }
        }, 10000);
    }

    /**
     * Show connectivity status
     */
    showConnectivityStatus(status) {
        const statusElement = document.createElement('div');
        statusElement.className = `sonoite-connectivity-status ${status}`;
        statusElement.textContent = status === 'online' 
            ? '🌐 Connection restored' 
            : '📴 Offline mode - using cached content';

        statusElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            background: ${status === 'online' ? '#10b981' : '#f59e0b'};
        `;

        document.body.appendChild(statusElement);

        // Animate in
        setTimeout(() => {
            statusElement.style.opacity = '1';
            statusElement.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transform = 'translateX(100%)';
            setTimeout(() => statusElement.remove(), 300);
        }, 3000);
    }

    /**
     * Prefetch audio files for offline access
     */
    async prefetchAudioFiles(tracks) {
        if (!this.isOnline || !tracks.length) return;

        console.log('🎵 Prefetching audio files for offline access...');

        for (const track of tracks.slice(0, 3)) { // Prefetch first 3 tracks
            if (track.audio_url) {
                this.sendMessage({
                    type: 'CACHE_AUDIO',
                    payload: { url: track.audio_url }
                });
            }
        }
    }

    /**
     * Send message to Service Worker
     */
    sendMessage(message) {
        if (this.registration && this.registration.active) {
            this.registration.active.postMessage(message);
        }
    }

    /**
     * Clear specific cache
     */
    clearCache(cacheName) {
        this.sendMessage({
            type: 'CLEAR_CACHE',
            payload: { cacheName }
        });
    }

    /**
     * Sync pending updates when coming back online
     */
    async syncPendingUpdates() {
        if (this.cacheUpdates.length > 0) {
            console.log('🔄 Syncing pending cache updates...');
            
            for (const update of this.cacheUpdates) {
                this.sendMessage(update);
            }
            
            this.cacheUpdates = [];
        }
    }

    /**
     * Force update Service Worker
     */
    async forceUpdate() {
        if (this.registration) {
            await this.registration.update();
            if (this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    }

    /**
     * Get cache status
     */
    async getCacheStatus() {
        if (!this.isSupported) return null;

        try {
            const cacheNames = await caches.keys();
            const status = {};

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                status[cacheName] = {
                    entries: keys.length,
                    urls: keys.map(request => request.url)
                };
            }

            return status;
        } catch (error) {
            console.error('❌ Failed to get cache status:', error);
            return null;
        }
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.debugMode = true;
        console.log('🐛 Service Worker debug mode enabled');
        
        // Log cache status
        this.getCacheStatus().then(status => {
            console.table(status);
        });
    }
}

// Auto-initialize if not in module context
if (typeof window !== 'undefined' && !window.sonoiteServiceWorkerManager) {
    window.sonoiteServiceWorkerManager = new ServiceWorkerManager();
}
