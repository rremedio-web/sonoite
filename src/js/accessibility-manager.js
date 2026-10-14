/**
 * Sonoite Accessibility Manager
 * Comprehensive WCAG 2.1 AAA compliance system
 */

export class SonoiteAccessibilityManager {
    constructor(options = {}) {
        this.options = {
            announceInterval: 1000,
            highContrastMode: false,
            reducedMotion: false,
            screenReaderMode: false,
            keyboardNavigation: true,
            voiceControl: false,
            ...options
        };

        this.state = {
            currentTrack: null,
            focusedElement: null,
            announcementQueue: [],
            keyboardShortcuts: new Map(),
            contrastRatio: 7.0 // AAA standard
        };

        this.elements = {
            liveRegion: null,
            skipLinks: null,
            focusTrap: null,
            contrastOverlay: null
        };

        this.init();
    }

    async init() {
        try {
            this.detectAccessibilityPreferences();
            this.setupLiveRegions();
            this.setupKeyboardNavigation();
            this.setupFocusManagement();
            this.setupScreenReaderSupport();
            this.setupHighContrastMode();
            this.setupReducedMotionSupport();
            this.setupVoiceControl();
            this.setupSkipLinks();

            console.info('Sonoite Accessibility Manager initialized');
        } catch (error) {
            console.error('Accessibility Manager initialization failed:', error);
        }
    }

    detectAccessibilityPreferences() {
        // Detect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.options.reducedMotion = true;
            document.body.classList.add('reduced-motion');
        }

        // Detect high contrast preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.options.highContrastMode = true;
            this.enableHighContrastMode();
        }

        // Detect screen reader
        this.detectScreenReader();

        // Listen for preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addListener((mq) => {
            this.options.reducedMotion = mq.matches;
            this.handleReducedMotionChange(mq.matches);
        });

        window.matchMedia('(prefers-contrast: high)').addListener((mq) => {
            this.options.highContrastMode = mq.matches;
            this.handleContrastChange(mq.matches);
        });
    }

    detectScreenReader() {
        // Heuristic screen reader detection
        const isScreenReader = (
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            window.speechSynthesis ||
            navigator.userAgent.includes('VoiceOver')
        );

        if (isScreenReader) {
            this.options.screenReaderMode = true;
            document.body.classList.add('screen-reader-mode');
            this.optimizeForScreenReader();
        }
    }

    setupLiveRegions() {
        // Main announcement region
        this.elements.liveRegion = this.createLiveRegion('sonoite-announcements', 'polite');

        // Status region for immediate announcements
        this.elements.statusRegion = this.createLiveRegion('sonoite-status', 'assertive');

        // Description region for detailed information
        this.elements.descriptionRegion = this.createLiveRegion('sonoite-descriptions', 'off');
    }

    createLiveRegion(id, politeness) {
        let region = document.getElementById(id);
        if (!region) {
            region = document.createElement('div');
            region.id = id;
            region.setAttribute('aria-live', politeness);
            region.setAttribute('aria-relevant', 'additions text');
            region.className = 'sr-only';
            document.body.appendChild(region);
        }
        return region;
    }

    setupKeyboardNavigation() {
        // Define keyboard shortcuts
        this.state.keyboardShortcuts.set('Space', {
            action: 'togglePlayback',
            description: 'Play or pause current track'
        });

        this.state.keyboardShortcuts.set('ArrowRight', {
            action: 'nextTrack',
            description: 'Skip to next track'
        });

        this.state.keyboardShortcuts.set('ArrowLeft', {
            action: 'previousTrack',
            description: 'Go to previous track'
        });

        this.state.keyboardShortcuts.set('ArrowUp', {
            action: 'volumeUp',
            description: 'Increase volume'
        });

        this.state.keyboardShortcuts.set('ArrowDown', {
            action: 'volumeDown',
            description: 'Decrease volume'
        });

        this.state.keyboardShortcuts.set('Escape', {
            action: 'exitVisualization',
            description: 'Exit visualization mode'
        });

        this.state.keyboardShortcuts.set('KeyH', {
            action: 'showHelp',
            description: 'Show keyboard shortcuts help',
            modifier: 'shift'
        });

        // Listen for keyboard events
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardInput(event);
        });

        // Create keyboard shortcuts help
        this.createKeyboardShortcutsHelp();
    }

    handleKeyboardInput(event) {
        const key = event.code;
        const hasModifier = event.shiftKey || event.ctrlKey || event.altKey;

        const shortcut = this.state.keyboardShortcuts.get(key);
        if (!shortcut) return;

        // Check modifier requirements
        if (shortcut.modifier === 'shift' && !event.shiftKey) return;
        if (shortcut.modifier === 'ctrl' && !event.ctrlKey) return;

        // Prevent default browser behavior for our shortcuts
        event.preventDefault();

        // Execute action
        this.executeKeyboardAction(shortcut.action, event);

        // Announce action for screen readers
        this.announce(`${shortcut.description} activated`);
    }

    executeKeyboardAction(action, event) {
        switch (action) {
            case 'togglePlayback':
                document.dispatchEvent(new CustomEvent('keyboardAction', {
                    detail: { action: 'togglePlayback' }
                }));
                break;

            case 'nextTrack':
                document.dispatchEvent(new CustomEvent('keyboardAction', {
                    detail: { action: 'nextTrack' }
                }));
                break;

            case 'previousTrack':
                document.dispatchEvent(new CustomEvent('keyboardAction', {
                    detail: { action: 'previousTrack' }
                }));
                break;

            case 'volumeUp':
                document.dispatchEvent(new CustomEvent('keyboardAction', {
                    detail: { action: 'volumeChange', value: 0.1 }
                }));
                break;

            case 'volumeDown':
                document.dispatchEvent(new CustomEvent('keyboardAction', {
                    detail: { action: 'volumeChange', value: -0.1 }
                }));
                break;

            case 'exitVisualization':
                this.exitVisualizationMode();
                break;

            case 'showHelp':
                this.showKeyboardShortcutsHelp();
                break;
        }
    }

    createKeyboardShortcutsHelp() {
        const helpContainer = document.createElement('div');
        helpContainer.id = 'keyboard-shortcuts-help';
        helpContainer.className = 'keyboard-help-modal';
        helpContainer.setAttribute('role', 'dialog');
        helpContainer.setAttribute('aria-labelledby', 'keyboard-help-title');
        helpContainer.setAttribute('aria-hidden', 'true');

        helpContainer.innerHTML = `
            <div class="keyboard-help-content">
                <h2 id="keyboard-help-title">Keyboard Shortcuts</h2>
                <ul class="shortcuts-list">
                    ${Array.from(this.state.keyboardShortcuts.entries()).map(([key, shortcut]) => `
                        <li>
                            <kbd>${this.formatKeyName(key, shortcut.modifier)}</kbd>
                            <span>${shortcut.description}</span>
                        </li>
                    `).join('')}
                </ul>
                <button class="close-help-btn" type="button">Close (Escape)</button>
            </div>
        `;

        document.body.appendChild(helpContainer);

        // Close button handler
        helpContainer.querySelector('.close-help-btn').addEventListener('click', () => {
            this.hideKeyboardShortcutsHelp();
        });
    }

    formatKeyName(key, modifier) {
        const keyNames = {
            'Space': 'Space',
            'ArrowRight': '→',
            'ArrowLeft': '←',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'Escape': 'Esc',
            'KeyH': 'H'
        };

        const formattedKey = keyNames[key] || key;
        return modifier ? `${modifier.charAt(0).toUpperCase() + modifier.slice(1)}+${formattedKey}` : formattedKey;
    }

    setupFocusManagement() {
        // Track focus for accessibility
        document.addEventListener('focusin', (event) => {
            this.state.focusedElement = event.target;
            this.announceFocusChange(event.target);
        });

        // Focus trap for modal dialogs
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                this.handleTabNavigation(event);
            }
        });
    }

    handleTabNavigation(event) {
        const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    announceFocusChange(element) {
        if (!this.options.screenReaderMode) return;

        const announcement = this.generateFocusAnnouncement(element);
        if (announcement) {
            this.announce(announcement, 'polite');
        }
    }

    generateFocusAnnouncement(element) {
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const label = element.getAttribute('aria-label') ||
                     element.getAttribute('title') ||
                     element.textContent?.trim();

        if (!label) return null;

        switch (role) {
            case 'button':
                return `${label} button`;
            case 'slider':
                const value = element.getAttribute('aria-valuenow');
                return `${label} slider, ${value}`;
            default:
                return label;
        }
    }

    setupScreenReaderSupport() {
        // Enhanced track announcements
        document.addEventListener('trackChanged', (event) => {
            this.announceTrackChange(event.detail);
        });

        // Consciousness visualization descriptions
        document.addEventListener('visualizationChanged', (event) => {
            this.announceVisualizationChange(event.detail);
        });

        // Progress announcements
        document.addEventListener('playbackProgress', (event) => {
            this.announcePlaybackProgress(event.detail);
        });
    }

    announceTrackChange(trackData) {
        const announcement = `Now playing: ${trackData.title}. ${trackData.artist || ''}. Duration: ${this.formatDuration(trackData.duration)}`;
        this.announce(announcement, 'assertive');

        // Detailed description
        if (trackData.description) {
            setTimeout(() => {
                this.announce(trackData.description, 'polite');
            }, 2000);
        }
    }

    announceVisualizationChange(visualizationData) {
        if (!this.options.screenReaderMode) return;

        const announcement = `Visualization changed to ${visualizationData.type}. ${visualizationData.description}`;
        this.announce(announcement, 'polite');
    }

    announcePlaybackProgress(progressData) {
        // Only announce progress at intervals to avoid overwhelming screen readers
        const currentTime = Math.floor(progressData.currentTime);
        if (currentTime % 30 === 0 && currentTime > 0) { // Every 30 seconds
            const timeAnnouncement = `${this.formatDuration(currentTime)} elapsed`;
            this.announce(timeAnnouncement, 'polite');
        }
    }

    setupHighContrastMode() {
        if (!this.options.highContrastMode) return;

        this.enableHighContrastMode();
    }

    enableHighContrastMode() {
        document.body.classList.add('high-contrast-mode');

        // Create high contrast overlay for Three.js canvas
        this.createHighContrastOverlay();

        // Dispatch event for consciousness system to adapt
        document.dispatchEvent(new CustomEvent('highContrastMode', {
            detail: { enabled: true, contrastRatio: this.state.contrastRatio }
        }));
    }

    createHighContrastOverlay() {
        const canvas = document.getElementById('three-canvas');
        if (!canvas) return;

        const overlay = document.createElement('div');
        overlay.className = 'high-contrast-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        // Position overlay over canvas
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            mix-blend-mode: difference;
            background: linear-gradient(45deg, 
                rgba(255,255,255,0.1) 0%, 
                rgba(255,255,255,0.05) 50%, 
                rgba(255,255,255,0.1) 100%);
            z-index: 1;
        `;

        canvas.parentNode.appendChild(overlay);
        this.elements.contrastOverlay = overlay;
    }

    setupReducedMotionSupport() {
        if (!this.options.reducedMotion) return;

        // Disable animations and transitions
        this.disableAnimations();

        // Notify consciousness system
        document.dispatchEvent(new CustomEvent('reducedMotion', {
            detail: { enabled: true }
        }));
    }

    disableAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    setupVoiceControl() {
        if (!('speechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();

        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = 'en-US';

        this.speechRecognition.onresult = (event) => {
            this.handleVoiceCommand(event);
        };

        this.speechRecognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
        };

        // Voice command mapping
        this.voiceCommands = new Map([
            ['play', 'togglePlayback'],
            ['pause', 'togglePlayback'],
            ['stop', 'stopPlayback'],
            ['next', 'nextTrack'],
            ['previous', 'previousTrack'],
            ['louder', 'volumeUp'],
            ['quieter', 'volumeDown'],
            ['help', 'showHelp']
        ]);
    }

    handleVoiceCommand(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];

        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.toLowerCase().trim();

            for (const [command, action] of this.voiceCommands) {
                if (transcript.includes(command)) {
                    this.executeKeyboardAction(action);
                    this.announce(`Voice command: ${command} executed`);
                    break;
                }
            }
        }
    }

    setupSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#track-navigation" class="skip-link">Skip to track navigation</a>
            <a href="#audio-controls" class="skip-link">Skip to audio controls</a>
        `;

        document.body.insertBefore(skipLinks, document.body.firstChild);
        this.elements.skipLinks = skipLinks;
    }

    optimizeForScreenReader() {
        // Add comprehensive ARIA labels to consciousness visualization
        const canvas = document.getElementById('three-canvas');
        if (canvas) {
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Interactive consciousness visualization responding to music');
            canvas.setAttribute('aria-describedby', 'visualization-description');
            
            // Create detailed description
            const description = document.createElement('div');
            description.id = 'visualization-description';
            description.className = 'sr-only';
            description.textContent = 'A three-dimensional consciousness visualization that changes colors, shapes, and movements based on the currently playing track. The visualization includes particle systems, geometric forms, and audio-reactive effects that represent different aspects of the music.';
            
            canvas.parentNode.appendChild(description);
        }

        // Enhance track information accessibility
        this.createTrackInfoRegion();
    }

    createTrackInfoRegion() {
        const trackInfo = document.createElement('div');
        trackInfo.id = 'track-info-accessible';
        trackInfo.className = 'sr-only';
        trackInfo.setAttribute('aria-live', 'polite');
        trackInfo.setAttribute('role', 'status');
        
        document.body.appendChild(trackInfo);
        this.elements.trackInfoRegion = trackInfo;
    }

    handleReducedMotionChange(reducedMotion) {
        if (reducedMotion) {
            this.disableAnimations();
            document.dispatchEvent(new CustomEvent('reducedMotion', {
                detail: { enabled: true }
            }));
        } else {
            document.body.classList.remove('reduced-motion');
            document.dispatchEvent(new CustomEvent('reducedMotion', {
                detail: { enabled: false }
            }));
        }
    }

    handleContrastChange(highContrast) {
        if (highContrast) {
            this.enableHighContrastMode();
        } else {
            this.disableHighContrastMode();
        }
    }

    disableHighContrastMode() {
        document.body.classList.remove('high-contrast-mode');
        
        if (this.elements.contrastOverlay) {
            this.elements.contrastOverlay.remove();
            this.elements.contrastOverlay = null;
        }

        document.dispatchEvent(new CustomEvent('highContrastMode', {
            detail: { enabled: false }
        }));
    }

    announce(message, priority = 'polite') {
        if (!message) return;

        const region = priority === 'assertive' ?
            this.elements.statusRegion :
            this.elements.liveRegion;

        if (region) {
            // Clear previous content and add new message
            region.textContent = message;

            // Clear after announcement to avoid repetition
            setTimeout(() => {
                if (region.textContent === message) {
                    region.textContent = '';
                }
            }, this.options.announceInterval);
        }
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0 seconds';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        if (mins === 0) {
            return `${secs} second${secs !== 1 ? 's' : ''}`;
        } else {
            return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
        }
    }

    showKeyboardShortcutsHelp() {
        const helpModal = document.getElementById('keyboard-shortcuts-help');
        if (helpModal) {
            helpModal.setAttribute('aria-hidden', 'false');
            helpModal.style.display = 'block';
            helpModal.querySelector('.close-help-btn').focus();
        }
    }

    hideKeyboardShortcutsHelp() {
        const helpModal = document.getElementById('keyboard-shortcuts-help');
        if (helpModal) {
            helpModal.setAttribute('aria-hidden', 'true');
            helpModal.style.display = 'none';
        }
    }

    exitVisualizationMode() {
        document.dispatchEvent(new CustomEvent('exitVisualization'));
        this.announce('Exited visualization mode');
    }

    enableVoiceControl() {
        if (this.speechRecognition && !this.options.voiceControl) {
            this.options.voiceControl = true;
            this.speechRecognition.start();
            this.announce('Voice control enabled. Say commands like play, pause, next, or previous.');
        }
    }

    disableVoiceControl() {
        if (this.speechRecognition && this.options.voiceControl) {
            this.options.voiceControl = false;
            this.speechRecognition.stop();
            this.announce('Voice control disabled');
        }
    }

    dispose() {
        // Stop speech recognition
        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }

        // Remove created elements
        Object.values(this.elements).forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
}

// Auto-initialize
if (typeof window !== 'undefined' && !window.jest) {
    document.addEventListener('DOMContentLoaded', () => {
        window.sonoiteAccessibilityManager = new SonoiteAccessibilityManager();
    });
}