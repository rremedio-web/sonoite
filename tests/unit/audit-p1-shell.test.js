import { ReliquaryShell } from '../../src/js/prototype/shell.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

let root;
beforeEach(() => {
    jest.useFakeTimers();
    root = document.createElement('div');
    document.body.appendChild(root);
});
afterEach(() => {
    jest.useRealTimers();
    root.remove();
    document.getElementById('sonoite-prototype-styles')?.remove();
    delete window.sonoiteData;
});

it('F6 pause keeps chrome visible after 4.5 seconds and pointer movement', () => {
    const shell = new ReliquaryShell(root);
    shell.hideIntro();
    shell.setPlaying(true);
    shell.showChrome();
    shell.setPlaying(false);
    jest.advanceTimersByTime(4500);
    expect(shell.hideTimer).toBeNull();
    expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    shell.shell.classList.add('is-hidden');
    ReliquaryPrototypeExperience.prototype.handlePointerMove.call({
        state: { playing: false, hasUserStarted: true }, lastUiUpdateAt: -Infinity, shell
    });
    expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    shell.destroy();
});

it('F6 focus and keyboard recover hidden chrome and index restores focus', () => {
    const shell = new ReliquaryShell(root);
    shell.hideIntro();
    shell.setPlaying(true);
    shell.shell.classList.add('is-hidden');
    shell.toggle.focus();
    expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    shell.shell.classList.add('is-hidden');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(shell.shell.classList.contains('is-hidden')).toBe(false);
    shell.configureIndex({ tracks: [{ slug: 'sonoite' }, { slug: 'horas-mortas' }], currentSlug: 'horas-mortas' });
    const rows = [...shell.indexPanel.querySelectorAll('button')];
    expect(rows.every((row) => row.tabIndex === -1)).toBe(true);
    shell.indexOpenButton.focus();
    shell.openIndex();
    expect(document.activeElement).toBe(rows[1]);
    shell.closeIndex();
    expect(document.activeElement).toBe(shell.indexOpenButton);
    expect(rows.every((row) => row.tabIndex === -1)).toBe(true);
    expect(shell.indexOverlay.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('sonoite-prototype-styles').textContent).toContain('.prototype-shell.is-hidden:focus-within');
    shell.destroy();
});

it('F7 normal-mode load failure exposes an alert and Retry reruns load and start', async () => {
    const e = new ReliquaryPrototypeExperience(root);
    e.shell = new ReliquaryShell(root, { onRetry: () => e.retryPlayback() });
    e.track = { audio_url: '/music.mp3' };
    e.state.ready = true;
    e.audio = {
        loadTrack: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
        ensureAudioContextRunning: async () => true, seekTo: async () => true, play: jest.fn().mockResolvedValue(true)
    };
    await e.togglePlayback();
    const alert = root.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert.hidden).toBe(false);
    expect(alert.textContent).toContain("The music couldn't load.");
    alert.querySelector('button').click();
    await e.pendingRetry;
    expect(e.audio.loadTrack).toHaveBeenCalledTimes(2);
    expect(e.audio.play).toHaveBeenCalledTimes(1);
    expect(alert.hidden).toBe(true);
    e.shell.destroy();
});

it.each([undefined, 'test-nonce'])('F8 injected shell styles are nonce-safe for %s', (nonce) => {
    window.sonoiteData = nonce ? { cspNonce: nonce } : {};
    const shell = new ReliquaryShell(root);
    expect(document.getElementById('sonoite-prototype-styles').nonce).toBe(nonce || '');
    shell.destroy();
});
