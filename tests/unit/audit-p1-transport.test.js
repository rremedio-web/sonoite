import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

jest.mock('../../src/js/audio-manager.js', () => ({
    AudioManager: jest.fn().mockImplementation(() => ({
        on: jest.fn(), onFrequencyUpdate: jest.fn()
    }))
}));

function instance() {
    const e = new ReliquaryPrototypeExperience(document.createElement('div'));
    e.shell = { updateTime: jest.fn(), setPlaying: jest.fn(), setReady: jest.fn(), showChrome: jest.fn(), setStatus: jest.fn() };
    e.handleTrackEnd = jest.fn();
    e.getPlaybackEndTime = () => 96;
    return e;
}

afterEach(() => {
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
    jest.restoreAllMocks();
});

it('F2 natural end completes once even with audio already stopped and hidden tab', () => {
    const e = instance();
    e.setupAudio();
    e.audio.isPlaying = false;
    e.isVisible = false;
    e.audio.pause = jest.fn();
    const end = e.audio.on.mock.calls.find(([name]) => name === 'onTrackEnd')?.[1];
    expect(end).toEqual(expect.any(Function));
    end();
    e.completePlayback();
    expect(e.handleTrackEnd).toHaveBeenCalledTimes(1);
    expect(e.state.proofComplete).toBe(true);
});

it('F2 pause and stop do not complete, seek before end resets completion', async () => {
    const e = instance();
    e.setupAudio();
    e.audio.getCurrentTime = () => 48;
    for (const name of ['onPause', 'onStop']) {
        e.audio.on.mock.calls.find(([event]) => event === name)[1]();
    }
    expect(e.handleTrackEnd).not.toHaveBeenCalled();
    e.audio.pause = jest.fn();
    e.completePlayback();
    e.audioLoaded = true;
    e.audio.seekTo = jest.fn().mockResolvedValue(true);
    await e.seek(0.5);
    e.completePlayback();
    expect(e.handleTrackEnd).toHaveBeenCalledTimes(2);
});

it.each([
    ['fresh', 'sonoite', 1000, true],
    ['stale', 'sonoite', 30001, false],
    ['mismatch', 'horas-mortas', 1000, false]
])('F3 %s continuation is consumed and only matching fresh entries play', async (_name, slug, age, expected) => {
    const e = instance();
    e.track = { slug: 'sonoite' };
    sessionStorage.setItem('sonoite-autonext-continue', JSON.stringify({ slug, at: Date.now() - age }));
    e.ensureTrackLoaded = jest.fn().mockResolvedValue();
    e.togglePlayback = jest.fn().mockResolvedValue(true);
    e.shell.hideIntro = jest.fn();
    e.shell.restoreThreshold = jest.fn();
    await e.tryAutoContinue();
    expect(e.togglePlayback).toHaveBeenCalledTimes(expected ? 1 : 0);
    expect(sessionStorage.getItem('sonoite-autonext-continue')).toBeNull();
});

it('F3 rejected autoplay silently restores the threshold', async () => {
    const e = instance();
    e.track = { slug: 'sonoite' };
    sessionStorage.setItem('sonoite-autonext-continue', JSON.stringify({ slug: 'sonoite', at: Date.now() }));
    e.ensureTrackLoaded = jest.fn().mockResolvedValue();
    e.togglePlayback = jest.fn().mockRejectedValue(new Error('autoplay blocked'));
    e.shell.hideIntro = jest.fn();
    e.shell.restoreThreshold = jest.fn();
    await e.tryAutoContinue();
    expect(e.shell.restoreThreshold).toHaveBeenCalledTimes(1);
});

it('F4 freezes visual transport during interruption and reanchors on resume', () => {
    const e = instance();
    const context = { state: 'running', addEventListener: jest.fn() };
    e.setupAudio();
    e.audio.audioContext = context;
    e.bindAudioContextState();
    e.state.playing = true;
    e.audioPlaybackStarted = true;
    e.audio.isPlaying = true;
    e.audio.getCurrentTime = () => 10;
    jest.spyOn(performance, 'now').mockReturnValue(10000);
    e.transportStartSeconds = 0;
    e.updateTransport();
    expect(e.state.currentTime).toBe(10);
    context.state = 'suspended';
    context.addEventListener.mock.calls[0][1]();
    performance.now.mockReturnValue(11600);
    e.updateTransport();
    expect(e.state.currentTime).toBe(10);
    context.state = 'running';
    context.addEventListener.mock.calls[0][1]();
    e.updateTransport();
    expect(Math.abs(e.state.currentTime - e.audio.getCurrentTime())).toBeLessThan(0.05);
});

it.each(['sonoite', 'horas-mortas', 'nao-querer-nada'])('F5 %s initializes reduced motion independently of LivingChamber and retains it on start', async (slug) => {
    window.history.replaceState({}, '', '/?track=' + slug + '&motion=reduce');
    const e = instance();
    expect(e.reducedMotion).toBe(true);
    expect(e.reducedMotionScale).toBe(0);
    e.state.ready = true;
    e.audioLoaded = true;
    e.audio = { ensureAudioContextRunning: async () => true, seekTo: async () => true, play: async () => true };
    Object.assign(e.shell, { setBusy() {}, resetThresholdForReprise() {}, hideIntro() {}, setInteractiveDisabled() {} });
    await e.togglePlayback();
    expect(e.reducedMotion).toBe(true);
});
