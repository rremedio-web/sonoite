import { ReliquaryShell } from '../../src/js/prototype/shell.js';

describe('ReliquaryShell chrome hiding', () => {
    let root;

    beforeEach(() => {
        jest.useFakeTimers();
        window.sonoiteData = { themeUrl: 'http://example.test/theme' };
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => {
        jest.useRealTimers();
        root.remove();
        document.getElementById('sonoite-prototype-styles')?.remove();
        delete window.sonoiteData;
    });

    function mountShell() {
        const shell = new ReliquaryShell(root, {});
        shell.setTrack({ title: 'Sonoite', order: 1 }, { meta: { track: 1 } }, { key: 'sonoite-cinema' });
        return shell;
    }

    it('starts with intro active and does not schedule hide on showChrome', () => {
        const shell = mountShell();

        shell.showChrome();

        expect(shell.shell.classList.contains('is-intro-active')).toBe(true);
        expect(shell.shell.classList.contains('is-hidden')).toBe(false);
        expect(shell.hideTimer).toBeNull();

        jest.advanceTimersByTime(5000);

        expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    });

    it('ignores scheduleHide while intro is active', () => {
        const shell = mountShell();

        shell.scheduleHide(100);
        jest.advanceTimersByTime(150);
        expect(shell.shell.classList.contains('is-hidden')).toBe(false);

        shell.hideChrome();
        expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    });

    it('hides chrome after idle once intro is dismissed', () => {
        const shell = mountShell();

        shell.setPlaying(true);
        shell.hideIntro();
        shell.showChrome();

        expect(shell.hideTimer).not.toBeNull();

        jest.advanceTimersByTime(ReliquaryShell.CHROME_HIDE_DELAY_MS);

        expect(shell.shell.classList.contains('is-hidden')).toBe(true);
    });

    it('clears a pending hide timer when showChrome runs during intro', () => {
        const shell = mountShell();

        shell.setPlaying(true);
        shell.hideIntro();
        shell.showChrome();
        const firstTimer = shell.hideTimer;

        shell.shell.classList.add('is-intro-active');
        shell.showChrome();

        expect(shell.hideTimer).toBeNull();
        expect(firstTimer).not.toBe(shell.hideTimer);

        jest.advanceTimersByTime(5000);
        expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    });
});
