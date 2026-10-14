/**
 * Accessibility Manager Test Suite
 * Validates WCAG 2.1 AAA compliance and accessibility features
 */

import { SonoiteAccessibilityManager } from '../src/js/accessibility-manager.js';

describe('SonoiteAccessibilityManager', () => {
    let accessibilityManager;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Mock media queries
        global.matchMedia = jest.fn((query) => ({
            matches: query.includes('prefers-reduced-motion') || query.includes('prefers-contrast'),
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        }));
    });

    afterEach(() => {
        if (accessibilityManager) {
            accessibilityManager.dispose();
            accessibilityManager = null;
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.options.announceInterval).toBe(1000);
            expect(accessibilityManager.options.keyboardNavigation).toBe(true);
            expect(accessibilityManager.state.contrastRatio).toBe(7.0);
        });

        test('should override default options', () => {
            const customOptions = {
                announceInterval: 2000,
                highContrastMode: true,
                reducedMotion: true
            };
            
            accessibilityManager = new SonoiteAccessibilityManager(customOptions);
            
            expect(accessibilityManager.options.announceInterval).toBe(2000);
            expect(accessibilityManager.options.highContrastMode).toBe(true);
            expect(accessibilityManager.options.reducedMotion).toBe(true);
        });

        test('should setup live regions', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(document.getElementById('sonoite-announcements')).toBeTruthy();
            expect(document.getElementById('sonoite-status')).toBeTruthy();
            expect(document.getElementById('sonoite-descriptions')).toBeTruthy();
        });
    });

    describe('Accessibility Preference Detection', () => {
        test('should detect reduced motion preference', () => {
            global.matchMedia = jest.fn((query) => ({
                matches: query.includes('prefers-reduced-motion'),
                addListener: jest.fn()
            }));
            
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.options.reducedMotion).toBe(true);
            expect(document.body.classList.contains('reduced-motion')).toBe(true);
        });

        test('should detect high contrast preference', () => {
            global.matchMedia = jest.fn((query) => ({
                matches: query.includes('prefers-contrast'),
                addListener: jest.fn()
            }));
            
            const enableHighContrastModeSpy = jest.fn();
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.enableHighContrastMode = enableHighContrastModeSpy;
            
            accessibilityManager.detectAccessibilityPreferences();
            
            expect(accessibilityManager.options.highContrastMode).toBe(true);
        });

        test('should detect screen reader usage', () => {
            // Mock screen reader detection
            global.navigator.userAgent = 'NVDA';
            
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.options.screenReaderMode).toBe(true);
            expect(document.body.classList.contains('screen-reader-mode')).toBe(true);
        });
    });

    describe('Live Regions', () => {
        test('should create live regions with correct attributes', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            const liveRegion = document.getElementById('sonoite-announcements');
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.getAttribute('aria-relevant')).toBe('additions text');
            expect(liveRegion.className).toBe('sr-only');
        });

        test('should announce messages correctly', async () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            accessibilityManager.announce('Test announcement');
            
            const liveRegion = document.getElementById('sonoite-announcements');
            expect(liveRegion.textContent).toBe('Test announcement');
            
            // Test auto-clear
            await new Promise(resolve => setTimeout(resolve, 1100));
            expect(liveRegion.textContent).toBe('');
        });

        test('should use assertive region for urgent announcements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            accessibilityManager.announce('Urgent message', 'assertive');
            
            const statusRegion = document.getElementById('sonoite-status');
            expect(statusRegion.textContent).toBe('Urgent message');
        });
    });

    describe('Keyboard Navigation', () => {
        test('should setup keyboard shortcuts', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.state.keyboardShortcuts.has('Space')).toBe(true);
            expect(accessibilityManager.state.keyboardShortcuts.has('ArrowRight')).toBe(true);
            expect(accessibilityManager.state.keyboardShortcuts.has('Escape')).toBe(true);
        });

        test('should handle keyboard input correctly', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const executeActionSpy = jest.spyOn(accessibilityManager, 'executeKeyboardAction');
            
            const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
            document.dispatchEvent(spaceEvent);
            
            expect(executeActionSpy).toHaveBeenCalledWith('togglePlayback', spaceEvent);
        });

        test('should dispatch keyboard action events', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            accessibilityManager.executeKeyboardAction('togglePlayback');
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'keyboardAction',
                    detail: { action: 'togglePlayback' }
                })
            );
        });

        test('should require modifiers for modified shortcuts', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const executeActionSpy = jest.spyOn(accessibilityManager, 'executeKeyboardAction');
            
            // H without shift should not trigger help
            const hEvent = new KeyboardEvent('keydown', { code: 'KeyH', shiftKey: false });
            accessibilityManager.handleKeyboardInput(hEvent);
            expect(executeActionSpy).not.toHaveBeenCalled();
            
            // H with shift should trigger help
            const shiftHEvent = new KeyboardEvent('keydown', { code: 'KeyH', shiftKey: true });
            accessibilityManager.handleKeyboardInput(shiftHEvent);
            expect(executeActionSpy).toHaveBeenCalledWith('showHelp', shiftHEvent);
        });
    });

    describe('Focus Management', () => {
        test('should track focused elements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            const button = document.createElement('button');
            button.textContent = 'Test Button';
            document.body.appendChild(button);
            
            const focusEvent = new FocusEvent('focusin', { target: button });
            document.dispatchEvent(focusEvent);
            
            expect(accessibilityManager.state.focusedElement).toBe(button);
        });

        test('should handle tab navigation in modals', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            // Create modal with focusable elements
            const modal = document.createElement('div');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-hidden', 'false');
            
            const firstButton = document.createElement('button');
            const lastButton = document.createElement('button');
            modal.appendChild(firstButton);
            modal.appendChild(lastButton);
            document.body.appendChild(modal);
            
            // Mock active element
            Object.defineProperty(document, 'activeElement', {
                value: lastButton,
                configurable: true
            });
            
            const tabEvent = new KeyboardEvent('keydown', { 
                key: 'Tab', 
                shiftKey: false,
                preventDefault: jest.fn()
            });
            
            accessibilityManager.handleTabNavigation(tabEvent);
            
            expect(tabEvent.preventDefault).toHaveBeenCalled();
        });

        test('should generate appropriate focus announcements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.options.screenReaderMode = true;
            
            const button = document.createElement('button');
            button.setAttribute('aria-label', 'Play button');
            
            const announcement = accessibilityManager.generateFocusAnnouncement(button);
            expect(announcement).toBe('Play button button');
        });
    });

    describe('Screen Reader Support', () => {
        test('should announce track changes', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const announceSpy = jest.spyOn(accessibilityManager, 'announce');
            
            const trackData = {
                title: 'Test Track',
                artist: 'Test Artist',
                duration: 180
            };
            
            accessibilityManager.announceTrackChange(trackData);
            
            expect(announceSpy).toHaveBeenCalledWith(
                expect.stringContaining('Now playing: Test Track. Test Artist.'),
                'assertive'
            );
        });

        test('should announce visualization changes', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.options.screenReaderMode = true;
            const announceSpy = jest.spyOn(accessibilityManager, 'announce');
            
            const visualizationData = {
                type: 'AbstractFlow',
                description: 'Flowing particle visualization'
            };
            
            accessibilityManager.announceVisualizationChange(visualizationData);
            
            expect(announceSpy).toHaveBeenCalledWith(
                'Visualization changed to AbstractFlow. Flowing particle visualization',
                'polite'
            );
        });

        test('should announce playback progress at intervals', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const announceSpy = jest.spyOn(accessibilityManager, 'announce');
            
            // Should announce at 30 second intervals
            accessibilityManager.announcePlaybackProgress({ currentTime: 30 });
            expect(announceSpy).toHaveBeenCalledWith(
                expect.stringContaining('30 seconds elapsed'),
                'polite'
            );
            
            // Should not announce at other times
            announceSpy.mockClear();
            accessibilityManager.announcePlaybackProgress({ currentTime: 15 });
            expect(announceSpy).not.toHaveBeenCalled();
        });

        test('should format duration correctly', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.formatDuration(30)).toBe('30 seconds');
            expect(accessibilityManager.formatDuration(60)).toBe('1 minute and 0 seconds');
            expect(accessibilityManager.formatDuration(90)).toBe('1 minute and 30 seconds');
            expect(accessibilityManager.formatDuration(125)).toBe('2 minutes and 5 seconds');
        });
    });

    describe('High Contrast Mode', () => {
        test('should enable high contrast mode', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            accessibilityManager.enableHighContrastMode();
            
            expect(document.body.classList.contains('high-contrast-mode')).toBe(true);
        });

        test('should create high contrast overlay for canvas', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            // Create mock canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'three-canvas';
            const container = document.createElement('div');
            container.appendChild(canvas);
            document.body.appendChild(container);
            
            accessibilityManager.createHighContrastOverlay();
            
            const overlay = container.querySelector('.high-contrast-overlay');
            expect(overlay).toBeTruthy();
            expect(overlay.getAttribute('aria-hidden')).toBe('true');
        });

        test('should dispatch high contrast events', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            accessibilityManager.enableHighContrastMode();
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highContrastMode',
                    detail: expect.objectContaining({
                        enabled: true,
                        contrastRatio: 7.0
                    })
                })
            );
        });
    });

    describe('Reduced Motion Support', () => {
        test('should disable animations when reduced motion is enabled', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.options.reducedMotion = true;
            
            accessibilityManager.setupReducedMotionSupport();
            
            // Check if style element was added
            const styleElements = document.querySelectorAll('style');
            const reducedMotionStyle = Array.from(styleElements).find(style => 
                style.textContent.includes('reduced-motion')
            );
            
            expect(reducedMotionStyle).toBeTruthy();
        });

        test('should dispatch reduced motion events', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
            
            accessibilityManager.handleReducedMotionChange(true);
            
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'reducedMotion',
                    detail: { enabled: true }
                })
            );
        });
    });

    describe('Voice Control', () => {
        test('should setup voice recognition when available', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            if (accessibilityManager.speechRecognition) {
                expect(accessibilityManager.speechRecognition.continuous).toBe(true);
                expect(accessibilityManager.speechRecognition.lang).toBe('en-US');
                expect(accessibilityManager.voiceCommands.has('play')).toBe(true);
            }
        });

        test('should handle voice commands', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            const executeActionSpy = jest.spyOn(accessibilityManager, 'executeKeyboardAction');
            
            const mockEvent = {
                results: [{
                    isFinal: true,
                    0: { transcript: 'play music' }
                }]
            };
            
            if (accessibilityManager.speechRecognition) {
                accessibilityManager.handleVoiceCommand(mockEvent);
                expect(executeActionSpy).toHaveBeenCalledWith('togglePlayback');
            }
        });
    });

    describe('Skip Links', () => {
        test('should create skip links', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            const skipLinks = document.querySelector('.skip-links');
            expect(skipLinks).toBeTruthy();
            
            const links = skipLinks.querySelectorAll('a');
            expect(links.length).toBeGreaterThan(0);
            
            const mainContentLink = Array.from(links).find(link => 
                link.getAttribute('href') === '#main-content'
            );
            expect(mainContentLink).toBeTruthy();
        });
    });

    describe('Screen Reader Optimization', () => {
        test('should optimize canvas for screen readers', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.options.screenReaderMode = true;
            
            // Create mock canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'three-canvas';
            const container = document.createElement('div');
            container.appendChild(canvas);
            document.body.appendChild(container);
            
            accessibilityManager.optimizeForScreenReader();
            
            expect(canvas.getAttribute('role')).toBe('img');
            expect(canvas.getAttribute('aria-label')).toContain('consciousness visualization');
            expect(canvas.getAttribute('aria-describedby')).toBe('visualization-description');
            
            const description = document.getElementById('visualization-description');
            expect(description).toBeTruthy();
            expect(description.className).toBe('sr-only');
        });
    });

    describe('Keyboard Shortcuts Help', () => {
        test('should create keyboard shortcuts help modal', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            const helpModal = document.getElementById('keyboard-shortcuts-help');
            expect(helpModal).toBeTruthy();
            expect(helpModal.getAttribute('role')).toBe('dialog');
            expect(helpModal.getAttribute('aria-hidden')).toBe('true');
        });

        test('should show and hide help modal', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            accessibilityManager.showKeyboardShortcutsHelp();
            
            const helpModal = document.getElementById('keyboard-shortcuts-help');
            expect(helpModal.getAttribute('aria-hidden')).toBe('false');
            expect(helpModal.style.display).toBe('block');
            
            accessibilityManager.hideKeyboardShortcutsHelp();
            expect(helpModal.getAttribute('aria-hidden')).toBe('true');
            expect(helpModal.style.display).toBe('none');
        });

        test('should format key names correctly', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.formatKeyName('Space')).toBe('Space');
            expect(accessibilityManager.formatKeyName('ArrowRight')).toBe('→');
            expect(accessibilityManager.formatKeyName('KeyH', 'shift')).toBe('Shift+H');
        });
    });

    describe('WCAG 2.1 AAA Compliance', () => {
        test('should meet contrast ratio requirements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.state.contrastRatio).toBeGreaterThanOrEqual(7.0);
        });

        test('should provide keyboard navigation for all interactive elements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            // All major navigation actions should be available via keyboard
            const requiredActions = [
                'togglePlayback', 'nextTrack', 'previousTrack', 
                'volumeUp', 'volumeDown', 'exitVisualization', 'showHelp'
            ];
            
            requiredActions.forEach(action => {
                const shortcut = Array.from(accessibilityManager.state.keyboardShortcuts.values())
                    .find(s => s.action === action);
                expect(shortcut).toBeTruthy();
            });
        });

        test('should support screen reader announcements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(accessibilityManager.elements.liveRegion).toBeTruthy();
            expect(accessibilityManager.elements.statusRegion).toBeTruthy();
            expect(accessibilityManager.elements.descriptionRegion).toBeTruthy();
        });

        test('should provide alternative text for visualizations', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            accessibilityManager.options.screenReaderMode = true;
            
            // Create mock canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'three-canvas';
            const container = document.createElement('div');
            container.appendChild(canvas);
            document.body.appendChild(container);
            
            accessibilityManager.optimizeForScreenReader();
            
            expect(canvas).toBeAccessible();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing speech recognition gracefully', () => {
            delete global.SpeechRecognition;
            delete global.webkitSpeechRecognition;
            
            expect(() => {
                accessibilityManager = new SonoiteAccessibilityManager();
                accessibilityManager.setupVoiceControl();
            }).not.toThrow();
        });

        test('should handle empty or invalid announcements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(() => {
                accessibilityManager.announce('');
                accessibilityManager.announce(null);
                accessibilityManager.announce(undefined);
            }).not.toThrow();
        });

        test('should handle missing canvas elements', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            expect(() => {
                accessibilityManager.createHighContrastOverlay();
                accessibilityManager.optimizeForScreenReader();
            }).not.toThrow();
        });
    });

    describe('Cleanup and Disposal', () => {
        test('should properly dispose of resources', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            // Add some elements to dispose of
            const testElement = document.createElement('div');
            testElement.id = 'test-element';
            document.body.appendChild(testElement);
            accessibilityManager.elements.testElement = testElement;
            
            accessibilityManager.dispose();
            
            expect(document.getElementById('test-element')).toBeFalsy();
        });

        test('should stop speech recognition on disposal', () => {
            accessibilityManager = new SonoiteAccessibilityManager();
            
            if (accessibilityManager.speechRecognition) {
                const stopSpy = jest.spyOn(accessibilityManager.speechRecognition, 'stop');
                
                accessibilityManager.dispose();
                
                expect(stopSpy).toHaveBeenCalled();
            }
        });
    });
});