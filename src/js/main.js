/**
 * Main entry point for Sonoite Theme
 * Bundles all systems for optimized production delivery
 * 
 * @package SonoiteTheme
 * @version 1.0.0
 */

// Initialize debug configuration from localStorage or URL params
const urlParams = new URLSearchParams(window.location.search);
const debugFromURL = urlParams.get('SONOITE_DEBUG') === '1' || urlParams.get('debug') === '1';
const debugFromStorage = localStorage.getItem('SONOITE_DEBUG') === '1' || localStorage.getItem('SONOITE_DEBUG') === 'true';
window.SONOITE_DEBUG = debugFromURL || debugFromStorage || window.SONOITE_DEBUG || false;

const profileParam = urlParams.get('SONOITE_PROFILE') || urlParams.get('profile');
const profileFromURL = profileParam === '1' || profileParam === 'true';
const profileFromStorage = localStorage.getItem('SONOITE_PROFILE') === '1' || localStorage.getItem('SONOITE_PROFILE') === 'true';
window.SONOITE_PROFILE = profileFromURL || profileFromStorage || window.SONOITE_PROFILE || false;

if (window.SONOITE_DEBUG) {
  console.log('[DEBUG] SONOITE_DEBUG enabled');
}

// Centralized logging utility
window.SonoiteLogger = {
    log: (...args) => {
        if (window.SONOITE_DEBUG) console.log(...args);
    },
    warn: (...args) => {
        if (window.SONOITE_DEBUG) console.warn(...args);
    },
    info: (...args) => {
        if (window.SONOITE_DEBUG) console.info(...args);
    },
    debug: (...args) => {
        if (window.SONOITE_DEBUG) console.debug(...args);
    },
    error: (...args) => {
        // Always log errors
        console.error(...args);
    }
};

// Import the init-experience which sets up everything
import './init-experience.js';
import './performance-monitor.js';
import './accessibility-manager.js';

// Initialize core systems on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.SONOITE_DEBUG) {
    console.log('🎵 Sonoite Theme Loading...');
  }
  
  try {
    // Initialize performance monitoring first
    if (window.SonoitePerformanceMonitor) {
      window.SonoitePerformanceMonitor.startMonitoring();
    }
    
    // Initialize accessibility manager
    if (window.SonoiteAccessibilityManager) {
      await window.SonoiteAccessibilityManager.initialize();
    }
    
    // The experience is initialized in init-experience.js
    // Just check if it's loaded
    if (window.SonoiteExperience) {
      if (window.SONOITE_DEBUG) {
        console.log('✅ SonoiteExperience is available');
      }
    }
    
    if (window.SONOITE_DEBUG) {
      console.log('✅ Sonoite Theme Initialized');
    }

    // CSP-safe: attach retry button handler (no inline onclick)
    const retryBtn = document.querySelector('#error-screen .retry-button, #sonoite-retry-button');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    // CSP-safe: attach debug-audio handlers if present
    const playBtn = document.getElementById('debug-audio-play');
    const pauseBtn = document.getElementById('debug-audio-pause');
    const logBtn = document.getElementById('debug-audio-log');
    const audioEl = document.getElementById('test-audio');
    const statusEl = document.getElementById('status');
    if (audioEl && statusEl) {
      if (playBtn) playBtn.addEventListener('click', async () => {
        try {
          await audioEl.play();
          statusEl.textContent = 'Status: Playing';
        } catch (e) {
          statusEl.textContent = 'Status: Error - ' + e.message;
        }
      });
      if (pauseBtn) pauseBtn.addEventListener('click', () => {
        audioEl.pause();
        statusEl.textContent = 'Status: Paused';
      });
      if (logBtn) logBtn.addEventListener('click', () => {
        console.log('Audio element:', audioEl);
        console.log('Duration:', audioEl.duration);
        console.log('Current time:', audioEl.currentTime);
        console.log('Ready state:', audioEl.readyState);
        console.log('Network state:', audioEl.networkState);
        console.log('Source:', audioEl.currentSrc);
      });
    }
  } catch (error) {
    console.error('❌ Sonoite Theme Initialization Failed:', error);
  }
});

// Export for WordPress integration
export default {
  name: 'SonoiteTheme',
  version: '1.0.0',
  initialized: false
};
