/* eslint-disable security/detect-object-injection -- test indices are bounded loop counters over local arrays */
import fs from 'fs';
import path from 'path';
import {
    createRecutLightScore,
    RECUT_LIGHT_SCORE_CONSTANTS as K
} from '../../src/js/prototype/recut-light-score.js';

function loadRecutCutTimeline() {
    const filmPath = path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js');
    const src = fs.readFileSync(filmPath, 'utf8');
    const startToken = 'const TRACK5_RECUT_DIRECTOR_CAMERA = ';
    const endToken = '\nconst TRACK5_RECUT_FILM_TIMELINE =';
    const start = src.indexOf(startToken);
    const end = src.indexOf(endToken, start + 1);
    let body = src.slice(start + startToken.length, end).trim();
    body = body
        .replace(/target: TRACK5_FILM_TARGET/g, 'target: [0, 0, 0]')
        .replace(/targetPoint: TRACK5_FILM_FLOWER_HEAD/g, 'targetPoint: [0, 5, 0]')
        .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, 'targetPoint: [0, 3, 0]')
        .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, 'targetPoint: [0, 0, 0]')
        .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, 'targetPoint: [0, 3, 0]')
        .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, 'targetPoint: [0, 4, 0]')
        .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, 'targetPoint: [0, 2, 0]');
    body = body.slice(0, body.lastIndexOf('}') + 1);
    // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
    const camera = new Function(`return (${body});`)();
    return camera.cutTimeline;
}

function loadBeatGrid() {
    const beatsPath = path.join(
        process.cwd(),
        'public/assets/journeys/analysis/nao-querer-nada/beats.json'
    );
    return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
}

function downbeatTimeForBar(beatGrid, bar) {
    const match = beatGrid.beats.find(
        (entry) => entry.bar === bar && entry.beatInBar === 1
    );
    return match ? match.time : null;
}

const beatGrid = loadBeatGrid();
const score = createRecutLightScore({ beatGrid });

const CUT_BARS = new Set(K.RECUT_CLIMAX_CUT_BARS);
const PULSE_WINDOW = K.RECUT_CLIMAX_ATTACK_SECONDS + K.RECUT_CLIMAX_DECAY_SECONDS;

describe('recut light score — climax cut bars', () => {
    it('derives RECUT_CLIMAX_CUT_BARS from cutTimeline bars in [75, 125]', () => {
        const cutTimeline = loadRecutCutTimeline();
        const expected = Object.keys(cutTimeline)
            .map((key) => Number.parseInt(key, 10))
            .filter((bar) => bar >= K.RECUT_CLIMAX_START_BAR && bar <= K.RECUT_CLIMAX_END_BAR)
            .sort((a, b) => a - b);
        expect([...K.RECUT_CLIMAX_CUT_BARS]).toEqual(expected);
    });
});

describe('recut light score — climax pulse schedule', () => {
    const pulses = score.getClimaxPulses();

    it('emits one pulse per downbeat, bars 75–125 inclusive (51 pulses)', () => {
        expect(pulses).toHaveLength(51);
        const bars = pulses.map((p) => p.bar);
        const expectedBars = [];
        for (let bar = 75; bar <= 125; bar += 1) {
            expectedBars.push(bar);
        }
        expect(bars).toEqual(expectedBars);
    });

    it('anchors every pulse to the authoritative beat-grid downbeat time', () => {
        pulses.forEach((pulse) => {
            expect(pulse.time).toBe(downbeatTimeForBar(beatGrid, pulse.bar));
        });
        // Spot-check the window edges against known downbeats.
        expect(pulses[0].time).toBe(195.375);
        expect(pulses[pulses.length - 1].bar).toBe(125);
    });

    it('has strictly increasing, non-duplicate pulse times (no malformed pulses)', () => {
        for (let i = 1; i < pulses.length; i += 1) {
            expect(pulses[i].time).toBeGreaterThan(pulses[i - 1].time);
        }
        expect(new Set(pulses.map((p) => p.time)).size).toBe(pulses.length);
        expect(new Set(pulses.map((p) => p.bar)).size).toBe(pulses.length);
    });

    it('gives cut/transition bars the stronger authored amplitude', () => {
        pulses.forEach((pulse) => {
            const expected = CUT_BARS.has(pulse.bar)
                ? K.RECUT_CLIMAX_CUT_PULSE_AMP
                : K.RECUT_CLIMAX_PULSE_AMP;
            expect(pulse.amp).toBe(expected);
        });
    });
});

describe('recut light score — climax rim envelope', () => {
    const barTime = downbeatTimeForBar(beatGrid, 85); // a cut bar (amp 0.42)
    const nonCutTime = downbeatTimeForBar(beatGrid, 78); // a non-cut bar (amp 0.28)

    it('is neutral (1.0) before, between, and after all pulses', () => {
        expect(score.climaxRimMultiplierAt(100)).toBe(1);
        expect(score.climaxRimMultiplierAt(195.375 - 0.001)).toBe(1);
        // Mid-way between two pulses (well outside any 0.30s window).
        expect(score.climaxRimMultiplierAt(barTime + 1.0)).toBe(1);
        // After the last pulse decays.
        expect(score.climaxRimMultiplierAt(328.97058823529414 + PULSE_WINDOW + 0.001)).toBe(1);
        expect(score.climaxRimMultiplierAt(360)).toBe(1);
    });

    it('rises to the restrained peak within the <=0.05s attack', () => {
        expect(K.RECUT_CLIMAX_ATTACK_SECONDS).toBeLessThanOrEqual(0.05);
        // Peak at attack end = 1 + amp; cut bar amp 0.42 -> 1.42 (in the 1.25–1.45 band).
        const peak = score.climaxRimMultiplierAt(barTime + K.RECUT_CLIMAX_ATTACK_SECONDS);
        expect(peak).toBeCloseTo(1.42, 6);
        expect(peak).toBeGreaterThanOrEqual(1.25);
        expect(peak).toBeLessThanOrEqual(1.45);
        // Non-cut bar peak = 1.28.
        const nonCutPeak = score.climaxRimMultiplierAt(nonCutTime + K.RECUT_CLIMAX_ATTACK_SECONDS);
        expect(nonCutPeak).toBeCloseTo(1.28, 6);
    });

    it('starts at the beat (mult 1) and decays back to 1 by attack+decay', () => {
        expect(score.climaxRimMultiplierAt(barTime)).toBeCloseTo(1, 6);
        expect(score.climaxRimMultiplierAt(barTime + PULSE_WINDOW)).toBeCloseTo(1, 6);
        // Half-way through the decay ~ half amplitude.
        const half = score.climaxRimMultiplierAt(
            barTime + K.RECUT_CLIMAX_ATTACK_SECONDS + K.RECUT_CLIMAX_DECAY_SECONDS / 2
        );
        expect(half).toBeCloseTo(1 + 0.42 * 0.5, 6);
    });

    it('keeps the decay inside the 0.22–0.30s band', () => {
        expect(K.RECUT_CLIMAX_DECAY_SECONDS).toBeGreaterThanOrEqual(0.22);
        expect(K.RECUT_CLIMAX_DECAY_SECONDS).toBeLessThanOrEqual(0.30);
    });

    it('is deterministic and seek-safe (same value forward or backward)', () => {
        const probe = barTime + 0.1;
        const forward = score.climaxRimMultiplierAt(probe);
        // Jump far away then back — pure function, no cursor drift.
        score.climaxRimMultiplierAt(500);
        score.climaxRimMultiplierAt(0);
        expect(score.climaxRimMultiplierAt(probe)).toBe(forward);
    });
});

describe('recut light score — blackout', () => {
    const end = 318.2647058823529; // bar 121 downbeat
    const start = end - 0.4;

    it('opens exactly one 0.4s window ending on the bar 121 downbeat', () => {
        const window = score.getBlackoutWindow();
        expect(window.end).toBe(end);
        expect(window.end - window.start).toBeCloseTo(0.4, 9);
        expect(K.RECUT_BLACKOUT_DURATION_SECONDS).toBe(0.4);
    });

    it('is opaque inside [start, end) and clear at the boundaries', () => {
        expect(score.blackoutOpacityAt(start - 0.001)).toBe(0);
        expect(score.blackoutOpacityAt(start)).toBe(1); // inclusive start
        expect(score.blackoutOpacityAt((start + end) / 2)).toBe(1);
        expect(score.blackoutOpacityAt(end - 0.001)).toBe(1);
        expect(score.blackoutOpacityAt(end)).toBe(0); // hard return at bar 121
        expect(score.blackoutOpacityAt(end + 0.001)).toBe(0);
    });

    it('has no other blackout anywhere else on the timeline', () => {
        for (let t = 0; t <= 560; t += 0.5) {
            if (t >= start && t < end) {
                continue;
            }
            expect(score.blackoutOpacityAt(t)).toBe(0);
        }
    });
});

describe('recut light score — plateau EMA rim target', () => {
    it('maps clamped midNorm across the absolute 1.2–2.0 rim band', () => {
        expect(score.plateauRimTarget(0)).toBeCloseTo(1.2, 9);
        expect(score.plateauRimTarget(1)).toBeCloseTo(2.0, 9);
        expect(score.plateauRimTarget(0.5)).toBeCloseTo(1.6, 9);
    });

    it('clamps out-of-range midNorm to the band ends', () => {
        expect(score.plateauRimTarget(-3)).toBeCloseTo(1.2, 9);
        expect(score.plateauRimTarget(9)).toBeCloseTo(2.0, 9);
    });
});

describe('recut light score — false dawn envelope', () => {
    const startBar = 396.61842105263156; // bar 151
    const riseEnd = 399.2105263157895; // bar 152
    const stepStart = 414.7631578947369; // bar 158
    const endBar = 419.9473684210526; // bar 160

    it('exposes the authoritative false-dawn window anchors', () => {
        const w = score.getFalseDawnWindow();
        expect(w.start).toBe(startBar);
        expect(w.riseEnd).toBe(riseEnd);
        expect(w.stepStart).toBe(stepStart);
        expect(w.end).toBe(endBar);
    });

    it('is 0 before the island and 0 at/after bar 160 (step down to low_key_grazing)', () => {
        expect(score.falseDawnEnvelopeAt(390)).toBe(0);
        expect(score.falseDawnEnvelopeAt(startBar - 0.001)).toBe(0);
        expect(score.falseDawnEnvelopeAt(startBar)).toBe(0);
        expect(score.falseDawnEnvelopeAt(endBar)).toBe(0);
        expect(score.falseDawnEnvelopeAt(endBar + 5)).toBe(0);
    });

    it('rises over the first bar, holds at 1, then steps down over the final two bars', () => {
        expect(score.falseDawnEnvelopeAt((startBar + riseEnd) / 2)).toBeCloseTo(0.5, 5);
        expect(score.falseDawnEnvelopeAt(riseEnd)).toBeCloseTo(1, 6);
        // Hold across the plateau body.
        expect(score.falseDawnEnvelopeAt(405)).toBeCloseTo(1, 6);
        expect(score.falseDawnEnvelopeAt(stepStart)).toBeCloseTo(1, 6);
        // Two-bar step-down.
        expect(score.falseDawnEnvelopeAt((stepStart + endBar) / 2)).toBeCloseTo(0.5, 5);
    });

    it('drives key/rim multipliers and an exposure delta only inside the window', () => {
        expect(score.falseDawnKeyMultiplierAt(390)).toBe(1);
        expect(score.falseDawnRimMultiplierAt(390)).toBe(1);
        expect(score.falseDawnExposureDeltaAt(390)).toBe(0);

        expect(score.falseDawnKeyMultiplierAt(riseEnd)).toBeCloseTo(1 + K.RECUT_FALSE_DAWN_KEY_GAIN, 6);
        expect(score.falseDawnRimMultiplierAt(riseEnd)).toBeCloseTo(1 + K.RECUT_FALSE_DAWN_RIM_GAIN, 6);
        expect(score.falseDawnExposureDeltaAt(riseEnd)).toBeCloseTo(K.RECUT_FALSE_DAWN_EXPOSURE_DELTA, 6);
    });
});

describe('recut light score — degenerate/empty beat grid', () => {
    it('returns fully neutral queries when the beat grid is missing', () => {
        const empty = createRecutLightScore({});
        expect(empty.getClimaxPulses()).toEqual([]);
        expect(empty.climaxRimMultiplierAt(200)).toBe(1);
        expect(empty.blackoutOpacityAt(318)).toBe(0);
        expect(empty.falseDawnEnvelopeAt(400)).toBe(0);
        expect(empty.getBlackoutWindow()).toEqual({ start: null, end: null });
        // The pure midNorm map does not depend on the grid.
        expect(empty.plateauRimTarget(0.5)).toBeCloseTo(1.6, 9);
    });
});
