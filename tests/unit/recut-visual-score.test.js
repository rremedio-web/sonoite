/* eslint-disable security/detect-object-injection -- every index here is a
   bounded loop counter or a key from this file's own literal CHANNELS table,
   never external input. */
import fs from 'fs';
import path from 'path';
import {
    createRecutVisualScore,
    RECUT_VISUAL_SCORE_CONSTANTS as K
} from '../../src/js/prototype/recut-visual-score.js';

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
const score = createRecutVisualScore({ beatGrid });

const T128 = downbeatTimeForBar(beatGrid, 128);
const T139 = downbeatTimeForBar(beatGrid, 139);
const T147 = downbeatTimeForBar(beatGrid, 147);
const T151 = downbeatTimeForBar(beatGrid, 151);

const CHANNELS = [
    ['traceCoolAt', K.RECUT_TRACE_PEAK, K.RECUT_TRACE_DECLINE],
    ['plateStrengthAddAt', K.RECUT_PLATE_ADD_PEAK, K.RECUT_PLATE_ADD_DECLINE]
];

describe('Track 5 recut Stage 2b visual score — anchors', () => {
    it('reads its four anchors from real downbeats, not nominal BPM maths', () => {
        // 93.5 BPM / 4 would put bar 139 at 354.4s; the real grid says 365.513s.
        expect(T128).toBeCloseTo(337.0, 6);
        expect(T139).toBeCloseTo(365.5131578947368, 9);
        expect(T147).toBeCloseTo(386.25, 6);
        expect(T151).toBeCloseTo(396.6184210526316, 9);

        const window = score.getWindow();
        expect(window.startTime).toBe(T128);
        expect(window.peakTime).toBe(T139);
        expect(window.declineTime).toBe(T147);
        expect(window.endTime).toBe(T151);
        expect([window.startBar, window.peakBar, window.declineBar, window.endBar])
            .toEqual([128, 139, 147, 151]);
    });

    it('is exactly zero at bar 128 and exactly zero at bar 151', () => {
        CHANNELS.forEach(([method]) => {
            expect(score[method](T128)).toBe(0);
            expect(score[method](T151)).toBe(0);
        });
    });

    it('peaks exactly at the bar 139 shoulder insert', () => {
        CHANNELS.forEach(([method, peak]) => {
            expect(score[method](T139)).toBeCloseTo(peak, 12);
            // Strictly the maximum of the whole window.
            for (let t = T128; t < T151; t += 0.05) {
                expect(score[method](t)).toBeLessThanOrEqual(peak + 1e-12);
            }
        });
    });

    it('has declined to its authored bar 147 value when the tar rises', () => {
        expect(score.traceCoolAt(T147)).toBeCloseTo(K.RECUT_TRACE_DECLINE, 12);
        expect(score.traceCoolAt(T147)).toBeLessThanOrEqual(0.08);
        expect(score.plateStrengthAddAt(T147)).toBeCloseTo(K.RECUT_PLATE_ADD_DECLINE, 12);
    });
});

describe('Track 5 recut Stage 2b visual score — tar ECU decline tail', () => {
    it('clears traceCool to 0 by ~390s while plate still declines to bar 151', () => {
        expect(score.traceCoolAt(390)).toBe(0);
        expect(score.traceCoolAt(389.999)).toBeGreaterThan(0);
        expect(score.plateStrengthAddAt(390)).toBeGreaterThan(0);
        expect(score.plateStrengthAddAt(T151)).toBe(0);
    });

    it('keeps the shoulder peak amplitude unchanged', () => {
        expect(score.traceCoolAt(T139)).toBeCloseTo(K.RECUT_TRACE_PEAK, 12);
        expect(score.plateStrengthAddAt(T139)).toBeCloseTo(K.RECUT_PLATE_ADD_PEAK, 12);
        expect(score.traceCoolAt(T128)).toBe(0);
    });

    it('falls monotonically through the shortened trace tail', () => {
        let previous = score.traceCoolAt(T147);
        for (let t = T147; t <= 390; t += 0.05) {
            const value = score.traceCoolAt(t);
            expect(value).toBeLessThanOrEqual(previous + 1e-12);
            previous = value;
        }
        expect(score.traceCoolAt(390)).toBe(0);
        expect(previous).toBeLessThanOrEqual(0.08);
    });
});

describe('Track 5 recut Stage 2b visual score — approved maxima', () => {
    it('never exceeds the approved peak ceilings anywhere', () => {
        for (let t = 300; t < 420; t += 0.01) {
            expect(score.traceCoolAt(t)).toBeLessThanOrEqual(0.42);
            expect(score.plateStrengthAddAt(t)).toBeLessThanOrEqual(0.10);
        }
    });

    it('is still inside the ~350s ceilings on the way up', () => {
        expect(score.traceCoolAt(350)).toBeLessThanOrEqual(0.24);
        expect(score.plateStrengthAddAt(350)).toBeLessThanOrEqual(0.04);
        // and is genuinely rising there, not parked at zero.
        expect(score.traceCoolAt(350)).toBeGreaterThan(0.05);
        expect(score.plateStrengthAddAt(350)).toBeGreaterThan(0.01);
    });

    it('respects the bar 147 decline ceilings', () => {
        expect(score.traceCoolAt(T147)).toBeLessThanOrEqual(0.18);
        expect(score.plateStrengthAddAt(T147)).toBeLessThanOrEqual(0.05);
    });

    it('keeps the total plate strength under 0.22 against the 0.12 base', () => {
        expect(0.12 + score.plateStrengthAddAt(T139)).toBeLessThanOrEqual(0.22);
    });
});

describe('Track 5 recut Stage 2b visual score — shape', () => {
    it('rises monotonically across the spiral and falls monotonically after', () => {
        CHANNELS.forEach(([method]) => {
            let previous = score[method](T128);
            for (let t = T128; t <= T139; t += 0.05) {
                const value = score[method](t);
                expect(value).toBeGreaterThanOrEqual(previous - 1e-12);
                previous = value;
            }
            previous = score[method](T139);
            for (let t = T139; t <= T151; t += 0.05) {
                const value = score[method](t);
                expect(value).toBeLessThanOrEqual(previous + 1e-12);
                previous = value;
            }
        });
    });

    it('is continuous — no one-frame spike anywhere in or at the edges of the window', () => {
        // Largest step over a 1/60s frame must stay far below the peak value.
        CHANNELS.forEach(([method, peak]) => {
            let maxStep = 0;
            for (let t = T128 - 2; t < T151 + 2; t += 1 / 60) {
                const step = Math.abs(score[method](t + 1 / 60) - score[method](t));
                maxStep = Math.max(maxStep, step);
            }
            expect(maxStep).toBeLessThan(peak * 0.02);
        });
    });

    it('joins its segments smoothly (zero slope at every anchor)', () => {
        const h = 1 / 240;
        [T128, T139, T147, T151].forEach((anchor) => {
            CHANNELS.forEach(([method, peak]) => {
                const slope = Math.abs(score[method](anchor + h) - score[method](anchor - h)) / (2 * h);
                expect(slope).toBeLessThan(peak * 0.02);
            });
        });
    });
});

describe('Track 5 recut Stage 2b visual score — window and protected moments', () => {
    const OUTSIDE = [
        0, 1, 40, 64, 111.333, 200, 267.411, 300, 318.031, 336.999,
        396.62, 400, 419.947, 450, 504, 506, 560, 1e6
    ];

    it('is exactly zero everywhere outside bars 128–151', () => {
        OUTSIDE.forEach((t) => {
            expect(score.traceCoolAt(t)).toBe(0);
            expect(score.plateStrengthAddAt(t)).toBe(0);
        });
    });

    it('is exactly zero through the whole false dawn and tail', () => {
        for (let t = T151; t <= 570; t += 0.25) {
            expect(score.traceCoolAt(t)).toBe(0);
            expect(score.plateStrengthAddAt(t)).toBe(0);
        }
    });

    it('is exactly zero across the entire pre-window track, including the blackout', () => {
        for (let t = 0; t <= T128; t += 0.25) {
            expect(score.traceCoolAt(t)).toBe(0);
            expect(score.plateStrengthAddAt(t)).toBe(0);
        }
    });

    it('freezes the window it reports', () => {
        const window = score.getWindow();
        expect(Object.isFrozen(window)).toBe(true);
        expect(score.getWindow()).toBe(window);
        expect(() => {
            'use strict';
            window.endTime = 0;
        }).toThrow();
    });
});

describe('Track 5 recut Stage 2b visual score — purity', () => {
    it('returns 0 for every non-finite input', () => {
        [NaN, Infinity, -Infinity, undefined, null, '365.5', {}].forEach((bad) => {
            expect(score.traceCoolAt(bad)).toBe(0);
            expect(score.plateStrengthAddAt(bad)).toBe(0);
        });
    });

    it('is seek-, reverse- and shuffle-independent', () => {
        const times = [];
        for (let t = 330; t < 405; t += 0.37) {
            times.push(t);
        }
        const forward = times.map((t) => score.traceCoolAt(t));

        const reverse = times.slice().reverse().map((t) => score.traceCoolAt(t));
        expect(reverse.slice().reverse()).toEqual(forward);

        // Deterministic shuffle (no Math.random in a purity test).
        const order = times.map((t, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101));
        order.forEach((i) => {
            expect(score.traceCoolAt(times[i])).toBe(forward[i]);
        });

        // A fresh instance from the same grid agrees exactly.
        const twin = createRecutVisualScore({ beatGrid });
        times.forEach((t, i) => {
            expect(twin.traceCoolAt(t)).toBe(forward[i]);
            expect(twin.plateStrengthAddAt(t)).toBe(score.plateStrengthAddAt(t));
        });
    });

    it('holds a long random-access soak identical to a linear playthrough', () => {
        const linear = new Map();
        for (let i = 0; i < 4000; i += 1) {
            const t = 320 + i * 0.02;
            linear.set(t, score.plateStrengthAddAt(t));
        }
        const keys = [...linear.keys()];
        for (let i = keys.length - 1; i >= 0; i -= 7) {
            expect(score.plateStrengthAddAt(keys[i])).toBe(linear.get(keys[i]));
        }
    });
});

describe('Track 5 recut Stage 2b visual score — validation', () => {
    it('accepts the shipped grid', () => {
        const validation = score.validate();
        expect(validation.ok).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it('rejects a missing grid and stays neutral', () => {
        [undefined, {}, { beatGrid: null }, { beatGrid: {} }, { beatGrid: { beats: null } }]
            .forEach((options) => {
                const empty = createRecutVisualScore(options);
                const validation = empty.validate();
                expect(validation.ok).toBe(false);
                expect(validation.errors.join(' ')).toMatch(/missing downbeat/);
                expect(empty.traceCoolAt(T139)).toBe(0);
                expect(empty.plateStrengthAddAt(T139)).toBe(0);
            });
    });

    it('names the specific bars a partial grid is missing', () => {
        const partial = createRecutVisualScore({
            beatGrid: {
                beats: [
                    { bar: 128, beatInBar: 1, time: 337 },
                    { bar: 139, beatInBar: 1, time: 365.5 }
                ]
            }
        });
        const validation = partial.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.join(' ')).toContain('147, 151');
        expect(partial.traceCoolAt(370)).toBe(0);
    });

    it('rejects a non-monotonic grid rather than invert a segment', () => {
        const scrambled = createRecutVisualScore({
            beatGrid: {
                beats: [
                    { bar: 128, beatInBar: 1, time: 337 },
                    { bar: 139, beatInBar: 1, time: 390 }, // past bar 147
                    { bar: 147, beatInBar: 1, time: 386.25 },
                    { bar: 151, beatInBar: 1, time: 396.618 }
                ]
            }
        });
        const validation = scrambled.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.join(' ')).toMatch(/non-monotonic/);
        expect(scrambled.traceCoolAt(388)).toBe(0);
        expect(scrambled.plateStrengthAddAt(388)).toBe(0);
    });

    it('ignores non-downbeat and non-finite entries when resolving anchors', () => {
        const noisy = createRecutVisualScore({
            beatGrid: {
                beats: [
                    { bar: 128, beatInBar: 3, time: 1 },
                    { bar: 128, beatInBar: 1, time: NaN },
                    { bar: 128, beatInBar: 1, time: 337 },
                    { bar: 139, beatInBar: 1, time: 365.5131578947368 },
                    { bar: 147, beatInBar: 1, time: 386.25 },
                    { bar: 151, beatInBar: 1, time: 396.6184210526316 }
                ]
            }
        });
        expect(noisy.validate().ok).toBe(true);
        expect(noisy.getWindow().startTime).toBe(337);
        expect(noisy.traceCoolAt(T139)).toBeCloseTo(K.RECUT_TRACE_PEAK, 12);
    });
});
