import { sampleTrack5SurfaceResponse } from '../../src/js/prototype/track5-surface-response.js';
import peaks from '../../public/assets/journeys/analysis/nao-querer-nada/peaks.json';

describe('restrained Track 5 surface score', () => {
    it('compares the proposed pair with the old score and a genuinely silent control', () => {
        expect(sampleTrack5SurfaceResponse(236.65, 'two')).toBe(0);
        expect(sampleTrack5SurfaceResponse(245.65, 'two')).toBe(1);
        expect(sampleTrack5SurfaceResponse(252.36, 'two')).toBe(1);
        expect(sampleTrack5SurfaceResponse(252.36, 'three')).toBe(0);
        expect(sampleTrack5SurfaceResponse(253.4, 'three')).toBe(1);
        for (let time = 225; time < 255; time += 0.05) {
            expect(sampleTrack5SurfaceResponse(time, 'none')).toBe(0);
        }
    });
    it('peaks at the selected recorded accents and remains quiet between them', () => {
        for (const time of [236.65, 245.65, 253.4]) {
            expect(peaks.peaks.some((peak) => peak.time === time)).toBe(true);
            expect(sampleTrack5SurfaceResponse(time)).toBe(1);
            expect(sampleTrack5SurfaceResponse(time - 0.5)).toBe(0);
            expect(sampleTrack5SurfaceResponse(time + 1.5)).toBe(0);
        }
        expect(sampleTrack5SurfaceResponse(239.05)).toBe(0);
        expect(sampleTrack5SurfaceResponse(225.5)).toBe(0);
    });

    it('gives the same response after a seek and eases into and out of each cue', () => {
        const before = sampleTrack5SurfaceResponse(236.5);
        sampleTrack5SurfaceResponse(254);
        sampleTrack5SurfaceResponse(225);
        expect(sampleTrack5SurfaceResponse(236.5)).toBe(before);
        expect(before).toBeGreaterThan(0);
        expect(before).toBeLessThan(1);
        expect(sampleTrack5SurfaceResponse(237.4)).toBeGreaterThan(0);
        expect(sampleTrack5SurfaceResponse(237.4)).toBeLessThan(1);
    });

    it('stays silent outside the comparison and for invalid transport values', () => {
        for (const time of [NaN, Infinity, -Infinity, 0, 224, 255, 564]) {
            expect(sampleTrack5SurfaceResponse(time)).toBe(0);
        }
    });
});
