/**
 * Sonoite Theme Service Worker
 * Advanced caching strategy for audio-reactive 3D experience
 *
 * STATUS: DISABLED (Dec 3, 2025)
 * Registration is commented out in functions.php (line 172-176)
 *
 * REASON: Service worker caching can cause stale asset issues during development
 * and requires careful cache invalidation strategy for production.
 *
 * TO ENABLE:
 * 1. Uncomment service worker registration in functions.php
 * 2. Update CDN_URLS below (currently references removed CDN)
 * 3. Implement proper cache versioning strategy
 * 4. Test offline functionality thoroughly
 *
 * @version 1.0.0
 * @status DISABLED
 */

const CACHE_NAME = 'sonoite-cache-v1';
const RUNTIME_CACHE = 'sonoite-runtime-v1';
const AUDIO_CACHE = 'sonoite-audio-v1';
const CDN_CACHE = 'sonoite-cdn-v1';

// Assets to precache on Service Worker installation
const PRECACHE_ASSETS = [
    '/',
    '/wp-content/themes/sonoite-theme/style.css',
    // Dynamic assets will be added from manifest
];

// SEC-01: CDN resources removed (Dec 3, 2025)
// Three.js is now bundled locally via Vite - no external CDN dependencies
const CDN_URLS = [];

// Audio file patterns
const AUDIO_PATTERNS = [
    /\.mp3$/i,
    /\.wav$/i,
    /\.ogg$/i,
    /\.m4a$/i,
    /\.aac$/i
];

// Cache duration configurations
const CACHE_STRATEGIES = {
    assets: {
        cacheName: CACHE_NAME,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxEntries: 100
    },
    audio: {
        cacheName: AUDIO_CACHE,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxEntries: 50
    },
    cdn: {
        cacheName: CDN_CACHE,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxEntries: 20
    },
    runtime: {
        cacheName: RUNTIME_CACHE,
        maxAge: 60 * 60 * 1000, // 1 hour
        maxEntries: 50
    }
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', event => {
    console.log('🔧 Sonoite Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            precacheAssets(),
            precacheCDNResources(),
            self.skipWaiting()
        ])
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', event => {
    console.log('🚀 Sonoite Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            cleanupOldCaches(),
            self.clients.claim()
        ])
    );
});

/**
 * Fetch Event Handler - Main caching logic
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip WordPress admin and login pages
    if (url.pathname.includes('/wp-admin/') || url.pathname.includes('/wp-login.php')) {
        return;
    }
    
    // Apply appropriate caching strategy
    if (isAudioRequest(request)) {
        event.respondWith(handleAudioRequest(request));
    } else if (isCDNRequest(request)) {
        event.respondWith(handleCDNRequest(request));
    } else if (isAssetRequest(request)) {
        event.respondWith(handleAssetRequest(request));
    } else {
        event.respondWith(handleRuntimeRequest(request));
    }
});

/**
 * Background Sync for failed audio downloads
 */
self.addEventListener('sync', event => {
    if (event.tag === 'audio-download-retry') {
        event.waitUntil(retryFailedAudioDownloads());
    }
});

/**
 * Message handling for cache management
 */
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'CACHE_AUDIO':
            event.waitUntil(cacheAudioFile(payload.url));
            break;
        case 'CLEAR_CACHE':
            event.waitUntil(clearSpecificCache(payload.cacheName));
            break;
        case 'UPDATE_MANIFEST':
            event.waitUntil(updateCachedAssets(payload.manifest));
            break;
    }
});

/**
 * Precache essential assets
 */
async function precacheAssets() {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Try to get manifest from the page
        const manifestResponse = await fetch('/wp-content/themes/sonoite-theme/dist/manifest.json');
        if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            const assetUrls = Object.values(manifest)
                .filter(entry => entry.file)
                .map(entry => `/wp-content/themes/sonoite-theme/dist/${entry.file}`);
            
            PRECACHE_ASSETS.push(...assetUrls);
        }
        
        await cache.addAll(PRECACHE_ASSETS);
        console.log('✅ Assets precached successfully');
    } catch (error) {
        console.error('❌ Failed to precache assets:', error);
    }
}

/**
 * Precache CDN resources
 */
async function precacheCDNResources() {
    try {
        const cache = await caches.open(CDN_CACHE);
        await cache.addAll(CDN_URLS);
        console.log('✅ CDN resources precached successfully');
    } catch (error) {
        console.error('❌ Failed to precache CDN resources:', error);
    }
}

/**
 * Clean up old cache versions
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const validCaches = Object.values(CACHE_STRATEGIES).map(strategy => strategy.cacheName);
    
    const deletionPromises = cacheNames
        .filter(cacheName => !validCaches.includes(cacheName))
        .map(cacheName => caches.delete(cacheName));
    
    await Promise.all(deletionPromises);
    console.log('🧹 Old caches cleaned up');
}

/**
 * Handle audio file requests with specialized caching
 */
async function handleAudioRequest(request) {
    const cache = await caches.open(AUDIO_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        console.log('🎵 Audio cache HIT:', request.url);
        return cachedResponse;
    }
    
    try {
        console.log('🎵 Audio cache MISS, fetching:', request.url);
        const response = await fetch(request);
        
        if (response.ok && response.headers.get('content-type')?.includes('audio')) {
            // Clone response for caching
            const responseClone = response.clone();
            
            // Cache with size limits
            await cacheWithLimits(cache, request, responseClone, CACHE_STRATEGIES.audio);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Audio fetch failed:', error);
        
        // Register for background sync retry
        await self.registration.sync.register('audio-download-retry');
        
        // Return cached version if available, or offline fallback
        return cachedResponse || createOfflineAudioResponse();
    }
}

/**
 * Handle CDN requests with integrity validation
 */
async function handleCDNRequest(request) {
    const cache = await caches.open(CDN_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Check if cache is still fresh
        const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
        const now = new Date();
        const maxAge = CACHE_STRATEGIES.cdn.maxAge;
        
        if (now - cacheDate < maxAge) {
            console.log('🌐 CDN cache HIT:', request.url);
            return cachedResponse;
        }
    }
    
    try {
        console.log('🌐 CDN cache MISS/STALE, fetching:', request.url);
        const response = await fetch(request);
        
        if (response.ok) {
            await cacheWithLimits(cache, request, response.clone(), CACHE_STRATEGIES.cdn);
        }
        
        return response;
    } catch (error) {
        console.error('❌ CDN fetch failed:', error);
        return cachedResponse || fetch(request);
    }
}

/**
 * Handle theme asset requests
 */
async function handleAssetRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        console.log('📦 Asset cache HIT:', request.url);
        return cachedResponse;
    }
    
    try {
        console.log('📦 Asset cache MISS, fetching:', request.url);
        const response = await fetch(request);
        
        if (response.ok) {
            await cacheWithLimits(cache, request, response.clone(), CACHE_STRATEGIES.assets);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Asset fetch failed:', error);
        return fetch(request);
    }
}

/**
 * Handle runtime requests (HTML, API, etc.)
 */
async function handleRuntimeRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
        const response = await fetch(request);
        
        if (response.ok && isRuntimeCacheable(request)) {
            await cacheWithLimits(cache, request, response.clone(), CACHE_STRATEGIES.runtime);
        }
        
        return response;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log('⚡ Runtime cache fallback:', request.url);
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return createOfflinePageResponse();
        }
        
        throw error;
    }
}

/**
 * Cache with size and age limits
 */
async function cacheWithLimits(cache, request, response, strategy) {
    await cache.put(request, response);
    
    // Cleanup old entries if over limit
    const keys = await cache.keys();
    if (keys.length > strategy.maxEntries) {
        const entriesToDelete = keys.slice(0, keys.length - strategy.maxEntries);
        await Promise.all(entriesToDelete.map(key => cache.delete(key)));
    }
}

/**
 * Request type checkers
 */
function isAudioRequest(request) {
    const url = new URL(request.url);
    return AUDIO_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
           request.headers.get('accept')?.includes('audio');
}

function isCDNRequest(request) {
    // SEC-01: CDN check simplified (Dec 3, 2025) - no CDN dependencies
    return CDN_URLS.some(cdnUrl => request.url.startsWith(cdnUrl));
}

function isAssetRequest(request) {
    const url = new URL(request.url);
    return url.pathname.includes('/wp-content/themes/sonoite-theme/') &&
           (url.pathname.includes('/dist/') || url.pathname.includes('/assets/'));
}

function isRuntimeCacheable(request) {
    const url = new URL(request.url);
    return url.pathname.includes('/wp-json/') && 
           !url.pathname.includes('/wp-json/sonoite/v1/security');
}

/**
 * Offline fallback responses
 */
function createOfflineAudioResponse() {
    return new Response(new ArrayBuffer(0), {
        headers: {
            'content-type': 'audio/wav',
            'content-length': '0'
        }
    });
}

function createOfflinePageResponse() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sonoite - Offline</title>
            <style>
                body { 
                    font-family: system-ui; 
                    text-align: center; 
                    padding: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                }
                .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
                h1 { margin-bottom: 1rem; }
                p { opacity: 0.8; max-width: 500px; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="offline-icon">🌌</div>
            <h1>Lost in the Cosmic Void</h1>
            <p>It seems you've drifted into an area without signal. 
            Check your connection and try navigating back to the audio-reactive experience.</p>
            <button onclick="window.location.reload()">Reconnect to the Experience</button>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        headers: { 'content-type': 'text/html' }
    });
}

/**
 * Retry failed audio downloads
 */
async function retryFailedAudioDownloads() {
    // This would retry audio downloads that failed
    // Implementation depends on specific retry logic needed
    console.log('🔄 Retrying failed audio downloads...');
}

/**
 * Cache specific audio file (called from main thread)
 */
async function cacheAudioFile(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE);
        const response = await fetch(url);
        
        if (response.ok) {
            await cache.put(url, response);
            console.log('✅ Audio file cached:', url);
        }
    } catch (error) {
        console.error('❌ Failed to cache audio file:', error);
    }
}

/**
 * Clear specific cache
 */
async function clearSpecificCache(cacheName) {
    try {
        await caches.delete(cacheName);
        console.log('🧹 Cache cleared:', cacheName);
    } catch (error) {
        console.error('❌ Failed to clear cache:', error);
    }
}

/**
 * Update cached assets from new manifest
 */
async function updateCachedAssets(manifest) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const assetUrls = Object.values(manifest)
            .filter(entry => entry.file)
            .map(entry => `/wp-content/themes/sonoite-theme/dist/${entry.file}`);
        
        await cache.addAll(assetUrls);
        console.log('✅ Asset cache updated with new manifest');
    } catch (error) {
        console.error('❌ Failed to update asset cache:', error);
    }
}

console.log('🌌 Sonoite Service Worker loaded successfully');