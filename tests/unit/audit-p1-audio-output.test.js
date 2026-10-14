import { AudioManager } from '../../src/js/audio-manager.js';

it('F1 retains exactly one listening output across play and replay', async () => {
    const outputs = new Set();
    const destination = {};
    const listeningGain = { gain: { value: 0 } };
    outputs.add(destination);
    const audio = Object.create(AudioManager.prototype);
    Object.assign(audio, {
        analyser: { connect: (node) => outputs.add(node), disconnect: (node) => outputs.delete(node) },
        audioContext: { state: 'running', currentTime: 0, destination,
            createBufferSource: () => ({ connect() {}, addEventListener() {}, removeEventListener() {}, start() {}, stop() {} }) },
        gainNode: { connect() {} }, audioBuffer: {}, duration: 10, currentTime: 0,
        initializeMeydaAnalyzer() {}, startFrequencyAnalysis() {}, startTimeUpdateLoop() {}, triggerCallbacks() {}
    });
    audio.setOutputNode(listeningGain);
    for (let play = 0; play < 2; play++) {
        await audio.playFromBuffer();
        expect([...outputs]).toEqual([listeningGain]);
        audio.isPlaying = false;
        audio.isPaused = true;
    }
    audio.setOutputNode(null);
    expect([...outputs]).toEqual([destination]);
});
