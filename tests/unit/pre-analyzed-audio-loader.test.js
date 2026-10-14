import { PreAnalyzedAudioLoader } from '../../src/js/audio/PreAnalyzedAudioLoader.js';

const aggregateAnalysis = {
    track: 'nao-querer-nada',
    durationSeconds: 10,
    framesAnalyzed: 2,
    frameSize: 2048,
    hopSize: 1024,
    sampleRate: 44100,
    analysisTimestamp: '2026-04-25T00:00:00.000Z',
    features: {
        rms: { min: 0, max: 0.5 },
        energy: { min: 0, max: 10 },
        loudness: { total: { min: 0, max: 80 } },
        spectralCentroid: { min: 0, max: 200 }
    },
    peaks: {
        loudness: [{ time: 4, value: 70 }]
    },
    segments: [
        { start: 0, end: 4, rms: 0.1, energy: 2, loudness: 20, spectralCentroid: 50 },
        { start: 4, end: 8, rms: 0.4, energy: 8, loudness: 70, spectralCentroid: 160 }
    ]
};

const splitTimeline = {
    intervalMs: 500,
    totalPoints: 2,
    timeline: [
        { t: 0, rms: 0.1, energy: 2, loudness: 20, centroid: 50, flatness: 0.1 },
        { t: 0.5, rms: 0.4, energy: 8, loudness: 70, centroid: 160, flatness: 0.2 }
    ]
};

describe('PreAnalyzedAudioLoader', () => {
    beforeEach(() => {
        delete window.sonoiteData;
    });

    it('uses split timeline JSON when available', async () => {
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(aggregateAnalysis)
            })
            .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(splitTimeline)
            });

        const loader = new PreAnalyzedAudioLoader();
        const analysis = await loader.loadAnalysis('nao-querer-nada');

        expect(analysis.analysisSource).toBe('split-timeline');
        expect(analysis.frameInterval).toBe(0.5);
        expect(analysis.timeFrames).toHaveLength(2);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('nao-querer-nada.analysis.json'));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('nao-querer-nada/timeline.json'));

        const audioData = loader.getAudioDataAtTime(0.5);

        expect(audioData.isPreAnalyzed).toBe(true);
        expect(audioData.energy).toBeCloseTo(0.8);
        expect(audioData.loudness).toBeCloseTo(0.875);
        expect(audioData.spectralCentroid).toBeCloseTo(0.8);
    });

    it('falls back to aggregate segment frames when split timeline is missing', async () => {
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(aggregateAnalysis)
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 404
            });

        const loader = new PreAnalyzedAudioLoader();
        const analysis = await loader.loadAnalysis('nao-querer-nada');

        expect(analysis.analysisSource).toBe('segments');
        expect(analysis.frameInterval).toBe(4);
        expect(analysis.timeFrames).toHaveLength(2);

        const audioData = loader.getAudioDataAtTime(4.2);

        expect(audioData.isPreAnalyzed).toBe(true);
        expect(audioData.energy).toBeCloseTo(0.8);
        expect(audioData.rms).toBeCloseTo(0.8);
    });
});
