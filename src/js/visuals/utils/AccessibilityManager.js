/**
 * AccessibilityManager - Accessibility features for Visual Layer API
 * Provides motion reduction, contrast adjustment, and alternative descriptions
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog, dwarn, derr } from '../../utils/devlog.js';

export class AccessibilityManager {
    constructor() {
        // Accessibility settings
        this.settings = {
            reduceMotion: false,
            highContrast: false,
            reducedAnimations: false,
            disableFlashing: false,
            enableDescriptions: false,
            respectSystemPrefs: true
        };

        // Motion reduction factors
        this.motionReduction = {
            animation: 0.3,      // Reduce animation intensity
            rotation: 0.2,       // Reduce rotation speed
            scaling: 0.5,        // Reduce scaling effects
            particles: 0.4,      // Reduce particle movement
            camera: 0.1          // Reduce camera movement
        };

        // Visual adjustments
        this.visualAdjustments = {
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            flashingThreshold: 0.3
        };

        // Description cache
        this.descriptions = new Map();
        this.lastAnnouncedState = '';

        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        // Check system preferences
        if (this.settings.respectSystemPrefs) {
            this.detectSystemPreferences();
        }

        // Set up ARIA live region for announcements
        this.setupLiveRegion();

        // Listen for preference changes
        this.setupPreferenceListeners();

        dlog('♿ Accessibility Manager initialized');
    }

    /**
     * Detect system accessibility preferences
     */
    detectSystemPreferences() {
        // Check for reduced motion preference
        if (window.matchMedia) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.settings.reduceMotion = prefersReducedMotion.matches;

            // Check for high contrast preference
            const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
            this.settings.highContrast = prefersHighContrast.matches;

            dlog(`♿ System preferences: Motion reduction: ${this.settings.reduceMotion}, High contrast: ${this.settings.highContrast}`);
        }
    }

    /**
     * Setup ARIA live region for screen reader announcements
     */
    setupLiveRegion() {
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.style.position = 'absolute';
        this.liveRegion.style.left = '-10000px';
        this.liveRegion.style.width = '1px';
        this.liveRegion.style.height = '1px';
        this.liveRegion.style.overflow = 'hidden';

        document.body.appendChild(this.liveRegion);
    }

    /**
     * Setup listeners for preference changes
     */
    setupPreferenceListeners() {
        if (window.matchMedia) {
            // Listen for motion preference changes
            const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            motionQuery.addEventListener('change', (e) => {
                this.settings.reduceMotion = e.matches;
                this.announcePreferenceChange('Motion reduction', e.matches);
            });

            // Listen for contrast preference changes
            const contrastQuery = window.matchMedia('(prefers-contrast: high)');
            contrastQuery.addEventListener('change', (e) => {
                this.settings.highContrast = e.matches;
                this.announcePreferenceChange('High contrast', e.matches);
            });
        }
    }

    /**
     * Announce preference changes to screen readers
     */
    announcePreferenceChange(preference, enabled) {
        const message = `${preference} ${enabled ? 'enabled' : 'disabled'}`;
        this.announce(message);
        dlog(`♿ ${message}`);
    }

    /**
     * Apply accessibility modifications to visual layer settings
     */
    applyAccessibilityModifications(layerSettings, layerType) {
        const modified = { ...layerSettings };

        // Apply motion reduction
        if (this.settings.reduceMotion || this.settings.reducedAnimations) {
            modified.animationIntensity = (modified.animationIntensity || 1.0) * this.motionReduction.animation;
            modified.rotationSpeed = (modified.rotationSpeed || 1.0) * this.motionReduction.rotation;
            modified.scalingFactor = (modified.scalingFactor || 1.0) * this.motionReduction.scaling;

            // Layer-specific modifications
            switch (layerType) {
                case 'ParticleField':
                    modified.particleSpeed = (modified.particleSpeed || 1.0) * this.motionReduction.particles;
                    modified.turbulence = (modified.turbulence || 1.0) * 0.5;
                    break;

                case 'CameraManager':
                    modified.autoRotate = false; // Disable auto rotation
                    modified.shakeIntensity = (modified.shakeIntensity || 1.0) * this.motionReduction.camera;
                    break;

                case 'OrganicShapes':
                    modified.morphSpeed = (modified.morphSpeed || 1.0) * 0.3;
                    break;

                case 'WaveForm':
                    modified.waveAmplitude = (modified.waveAmplitude || 1.0) * 0.6;
                    break;
            }
        }

        // Apply visual adjustments
        if (this.settings.highContrast) {
            modified.contrast = this.visualAdjustments.contrast * 1.5;
            modified.brightness = this.visualAdjustments.brightness * 1.2;
            modified.saturation = this.visualAdjustments.saturation * 0.8;
        }

        // Disable flashing effects
        if (this.settings.disableFlashing) {
            modified.flashingEffects = false;
            modified.strobeEffects = false;
            modified.rapidColorChanges = false;
        }

        return modified;
    }

    /**
     * Check if audio-reactive effect should be limited
     */
    shouldLimitAudioReactivity(audioData) {
        if (!this.settings.disableFlashing) return false;

        // Check for rapid changes that could cause flashing
        const changeRate = this.calculateChangeRate(audioData);
        return changeRate > this.visualAdjustments.flashingThreshold;
    }

    /**
     * Calculate rate of change in audio data
     */
    calculateChangeRate(audioData) {
        if (!this.lastAudioData) {
            this.lastAudioData = audioData;
            return 0;
        }

        let totalChange = 0;
        const keys = ['bass', 'mid', 'treble', 'loudness'];

        keys.forEach(key => {
            const currentValue = audioData[key] || 0;
            const lastValue = this.lastAudioData[key] || 0;
            totalChange += Math.abs(currentValue - lastValue);
        });

        this.lastAudioData = audioData;
        return totalChange / keys.length;
    }

    /**
     * Get accessible description for a visual state
     */
    getVisualDescription(layerType, audioData, intensity = 'medium') {
        const key = `${layerType}-${intensity}`;

        if (this.descriptions.has(key)) {
            return this.descriptions.get(key);
        }

        let description = '';

        switch (layerType) {
            case 'ParticleField':
                description = `Particle field with ${intensity} movement responding to audio`;
                break;
            case 'OrganicShapes':
                description = `Organic shapes with ${intensity} morphing and color changes`;
                break;
            case 'WaveForm':
                description = `Audio waveform visualization with ${intensity} amplitude`;
                break;
            case 'GeometricGrid':
                description = `Geometric grid with ${intensity} audio-reactive animations`;
                break;
            case 'AudioReactiveSkybox':
                description = `Background environment with ${intensity} color shifts`;
                break;
            default:
                description = `Visual element with ${intensity} audio reactivity`;
        }

        this.descriptions.set(key, description);
        return description;
    }

    /**
     * Announce visual state changes
     */
    announceVisualState(state) {
        if (!this.settings.enableDescriptions) return;

        if (state !== this.lastAnnouncedState) {
            this.announce(state);
            this.lastAnnouncedState = state;
        }
    }

    /**
     * Announce message to screen readers
     */
    announce(message) {
        if (this.liveRegion) {
            this.liveRegion.textContent = message;
            // Clear after announcement to allow for repeated announcements
            setTimeout(() => {
                if (this.liveRegion) {
                    this.liveRegion.textContent = '';
                }
            }, 1000);
        }
    }

    /**
     * Update accessibility settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        dlog('♿ Accessibility settings updated:', this.settings);
    }

    /**
     * Get current accessibility status
     */
    getAccessibilityStatus() {
        return {
            settings: { ...this.settings },
            motionReduction: { ...this.motionReduction },
            visualAdjustments: { ...this.visualAdjustments },
            systemSupport: {
                matchMedia: !!window.matchMedia,
                ariaLive: !!this.liveRegion
            }
        };
    }

    /**
     * Enable reduced motion mode
     */
    enableReducedMotion() {
        this.settings.reduceMotion = true;
        this.settings.reducedAnimations = true;
        this.announce('Reduced motion mode enabled');
        dlog('♿ Reduced motion mode enabled');
    }

    /**
     * Disable reduced motion mode
     */
    disableReducedMotion() {
        this.settings.reduceMotion = false;
        this.settings.reducedAnimations = false;
        this.announce('Reduced motion mode disabled');
        dlog('♿ Reduced motion mode disabled');
    }

    /**
     * Toggle flashing effects
     */
    toggleFlashingEffects(disabled = true) {
        this.settings.disableFlashing = disabled;
        this.announce(`Flashing effects ${disabled ? 'disabled' : 'enabled'}`);
        dlog(`♿ Flashing effects ${disabled ? 'disabled' : 'enabled'}`);
    }

    /**
     * Enable high contrast mode
     */
    enableHighContrast() {
        this.settings.highContrast = true;
        this.visualAdjustments.contrast = 1.5;
        this.visualAdjustments.saturation = 0.7;
        this.announce('High contrast mode enabled');
        dlog('♿ High contrast mode enabled');
    }

    /**
     * Set visual intensity level
     */
    setVisualIntensity(level) {
        // level: 'low', 'medium', 'high'
        switch (level) {
            case 'low':
                this.motionReduction.animation = 0.1;
                this.motionReduction.rotation = 0.05;
                this.motionReduction.particles = 0.2;
                break;
            case 'medium':
                this.motionReduction.animation = 0.5;
                this.motionReduction.rotation = 0.3;
                this.motionReduction.particles = 0.6;
                break;
            case 'high':
                this.motionReduction.animation = 1.0;
                this.motionReduction.rotation = 1.0;
                this.motionReduction.particles = 1.0;
                break;
        }

        this.announce(`Visual intensity set to ${level}`);
        dlog(`♿ Visual intensity set to ${level}`);
    }

    /**
     * Clean up accessibility manager
     */
    dispose() {
        if (this.liveRegion && this.liveRegion.parentNode) {
            this.liveRegion.parentNode.removeChild(this.liveRegion);
        }
        this.descriptions.clear();
        dlog('♿ Accessibility Manager disposed');
    }
}

// Export singleton instance
export const accessibilityManager = new AccessibilityManager();

export default AccessibilityManager;