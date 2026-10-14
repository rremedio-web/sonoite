/* eslint-disable security/detect-object-injection -- every index here is a bounded loop counter or a key from the module's own query-name list, never external input */
import {
    createRecutAtmosphere,
    RECUT_ATMOSPHERE_WINDOW_START,
    RECUT_ATMOSPHERE_WINDOW_END,
    RECUT_ATMOSPHERE_RAMP_SECONDS,
    RECUT_ATMOSPHERE_FOG_DENSITY_MAX,
    RECUT_ATMOSPHERE_FOG_DENSITY_ADD,
    RECUT_ATMOSPHERE_DUST_OPACITY_MAX,
    RECUT_ATMOSPHERE_DUST_OPACITY_ADD,
    RECUT_ATMOSPHERE_LIFT_COLOR,
    RECUT_ATMOSPHERE_BACKGROUND_LIFT
} from '../../src/js/prototype/recut-atmosphere.js';

const START = RECUT_ATMOSPHERE_WINDOW_START;
const END = RECUT_ATMOSPHERE_WINDOW_END;
const RAMP = RECUT_ATMOSPHERE_RAMP_SECONDS;

const QUERIES = [
    'envelopeAt',
    'fogDensityAddAt',
    'fogDensityMaxAt',
    'dustOpacityAddAt',
    'dustOpacityMaxAt',
    'backgroundLiftAt'
];

const NON_FINITE = [NaN, Infinity, -Infinity, undefined, null, 'abc', {}];

describe('recut atmosphere — exported constants', () => {
    it('pins the authored window and tuned constants', () => {
        expect(START).toBe(64.0);
        expect(END).toBe(504.0);
        expect(RAMP).toBe(2.0);
        expect(RECUT_ATMOSPHERE_FOG_DENSITY_MAX).toBe(0.04);
        expect(RECUT_ATMOSPHERE_FOG_DENSITY_ADD).toBe(0);
        expect(RECUT_ATMOSPHERE_DUST_OPACITY_MAX).toBe(0.22);
        expect(RECUT_ATMOSPHERE_DUST_OPACITY_ADD).toBe(0.10);
        expect(RECUT_ATMOSPHERE_BACKGROUND_LIFT).toBe(0.40);
        expect(RECUT_ATMOSPHERE_LIFT_COLOR).toBe('#1b1714');
    });

    it('stays inside the Stage 2a authorised tuning ranges', () => {
        expect(RECUT_ATMOSPHERE_FOG_DENSITY_MAX).toBeLessThanOrEqual(0.075);
        expect(RECUT_ATMOSPHERE_FOG_DENSITY_ADD).toBeLessThanOrEqual(0.030);
        expect(RECUT_ATMOSPHERE_DUST_OPACITY_MAX).toBeLessThanOrEqual(0.30);
        expect(RECUT_ATMOSPHERE_DUST_OPACITY_ADD).toBeLessThanOrEqual(0.10);
        expect(RECUT_ATMOSPHERE_BACKGROUND_LIFT).toBeGreaterThanOrEqual(0);
        expect(RECUT_ATMOSPHERE_BACKGROUND_LIFT).toBeLessThanOrEqual(1);
    });

    it('keeps the lift colour warm-neutral, never blue', () => {
        const [, r, g, b] = /^#(\w{2})(\w{2})(\w{2})$/.exec(RECUT_ATMOSPHERE_LIFT_COLOR)
            .map((part, index) => (index === 0 ? part : Number.parseInt(part, 16)));
        expect(r).toBeGreaterThan(b);
        expect(g).toBeGreaterThan(b);
        // Warm but restrained: a dark, not a grade.
        expect(r).toBeLessThanOrEqual(40);
    });
});

describe('recut atmosphere — window envelope', () => {
    const atmosphere = createRecutAtmosphere();

    it('is exactly zero at and before the window start', () => {
        [0, 1, 40, 63.9, START].forEach((t) => {
            expect(atmosphere.envelopeAt(t)).toBe(0);
        });
    });

    it('is exactly zero at and after the window end', () => {
        [END, 504.1, 506, 520, 564, 10000].forEach((t) => {
            expect(atmosphere.envelopeAt(t)).toBe(0);
        });
    });

    it('cosine-ramps up over the ramp seconds and reaches 1.0', () => {
        expect(atmosphere.envelopeAt(START + RAMP / 2)).toBeCloseTo(0.5 - 0.5 * Math.cos(Math.PI * 0.5), 12);
        expect(atmosphere.envelopeAt(START + RAMP / 2)).toBeCloseTo(0.5, 12);
        expect(atmosphere.envelopeAt(START + RAMP)).toBeCloseTo(1, 12);
    });

    it('cosine-ramps down and reaches 1.0 at the start of the fall', () => {
        expect(atmosphere.envelopeAt(END - RAMP)).toBeCloseTo(1, 12);
        expect(atmosphere.envelopeAt(END - RAMP / 2)).toBeCloseTo(0.5, 12);
    });

    it('holds 1.0 across the whole middle', () => {
        for (let t = START + RAMP; t <= END - RAMP; t += 7.3) {
            expect(atmosphere.envelopeAt(t)).toBeCloseTo(1, 12);
        }
    });

    it('is monotonic non-decreasing through the rise and non-increasing through the fall', () => {
        let previous = -1;
        for (let t = START; t <= START + RAMP; t += RAMP / 64) {
            const value = atmosphere.envelopeAt(t);
            expect(value).toBeGreaterThanOrEqual(previous - 1e-12);
            previous = value;
        }
        previous = 2;
        for (let t = END - RAMP; t <= END; t += RAMP / 64) {
            const value = atmosphere.envelopeAt(t);
            expect(value).toBeLessThanOrEqual(previous + 1e-12);
            previous = value;
        }
    });

    it('stays inside 0..1 across a dense sweep of the whole film', () => {
        for (let t = -10; t <= 600; t += 0.25) {
            const value = atmosphere.envelopeAt(t);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });
});

describe('recut atmosphere — neutral outside the window', () => {
    const atmosphere = createRecutAtmosphere();
    const config = atmosphere.getConfig();
    const outside = [0, 20, 40, 63.5, START, END, 504.5, 506, 540, 564];

    it('adds exactly zero fog, dust and background lift on the accepted head and tail', () => {
        outside.forEach((t) => {
            expect(atmosphere.fogDensityAddAt(t)).toBe(0);
            expect(atmosphere.dustOpacityAddAt(t)).toBe(0);
            expect(atmosphere.backgroundLiftAt(t)).toBe(0);
        });
    });

    it('returns the shipped clamp ceilings outside the window', () => {
        outside.forEach((t) => {
            expect(atmosphere.fogDensityMaxAt(t)).toBe(config.fogDensityMaxBase);
            expect(atmosphere.dustOpacityMaxAt(t)).toBe(config.dustOpacityMaxBase);
        });
        expect(config.fogDensityMaxBase).toBe(0.04);
        expect(config.dustOpacityMaxBase).toBe(0.16);
    });

    it('keeps the fog lever a measured no-op: identical clamp to the default path', () => {
        // Both fog probes (density sweep to 0.075, colour repaint to #262019)
        // measured as information loss in the wides, so the recut deliberately
        // ships the shipped 0.008-0.04 clamp with a zero additive.
        expect(config.fogDensityAdd).toBe(0);
        expect(config.fogDensityMax).toBe(config.fogDensityMaxBase);
        for (let t = -10; t <= 600; t += 3.3) {
            expect(atmosphere.fogDensityAddAt(t)).toBe(0);
            expect(atmosphere.fogDensityMaxAt(t)).toBe(0.04);
        }
    });

    it('reaches the full recut ceilings in the middle', () => {
        expect(atmosphere.dustOpacityMaxAt(300)).toBeCloseTo(config.dustOpacityMax, 12);
        expect(atmosphere.dustOpacityAddAt(300)).toBeCloseTo(config.dustOpacityAdd, 12);
        expect(atmosphere.backgroundLiftAt(300)).toBeCloseTo(config.backgroundLift, 12);
    });

    it('never lets a ceiling drop below the shipped ceiling anywhere', () => {
        for (let t = -10; t <= 600; t += 0.5) {
            expect(atmosphere.fogDensityMaxAt(t)).toBeGreaterThanOrEqual(config.fogDensityMaxBase - 1e-12);
            expect(atmosphere.dustOpacityMaxAt(t)).toBeGreaterThanOrEqual(config.dustOpacityMaxBase - 1e-12);
        }
    });
});

describe('recut atmosphere — non-finite input', () => {
    const atmosphere = createRecutAtmosphere();
    const config = atmosphere.getConfig();

    it('returns the neutral value for every non-finite input', () => {
        NON_FINITE.forEach((value) => {
            expect(atmosphere.envelopeAt(value)).toBe(0);
            expect(atmosphere.fogDensityAddAt(value)).toBe(0);
            expect(atmosphere.dustOpacityAddAt(value)).toBe(0);
            expect(atmosphere.backgroundLiftAt(value)).toBe(0);
            expect(atmosphere.fogDensityMaxAt(value)).toBe(config.fogDensityMaxBase);
            expect(atmosphere.dustOpacityMaxAt(value)).toBe(config.dustOpacityMaxBase);
        });
    });

    it('returns a finite number for every query at every finite time', () => {
        for (let t = -10; t <= 600; t += 0.5) {
            QUERIES.forEach((name) => {
                expect(Number.isFinite(atmosphere[name](t))).toBe(true);
            });
        }
    });
});

describe('recut atmosphere — purity and determinism', () => {
    it('gives the same answer for the same input, however many times it is asked', () => {
        const atmosphere = createRecutAtmosphere();
        const times = [0, 40, 64, 65, 66, 120, 300, 480, 502, 503, 504, 506];
        const first = times.map((t) => QUERIES.map((name) => atmosphere[name](t)));
        for (let repeat = 0; repeat < 5; repeat += 1) {
            times.forEach((t, index) => {
                QUERIES.forEach((name, q) => {
                    expect(atmosphere[name](t)).toBe(first[index][q]);
                });
            });
        }
    });

    it('is order-independent: forward, reverse and shuffled sweeps agree exactly', () => {
        const atmosphere = createRecutAtmosphere();
        const times = [];
        for (let t = 0; t <= 564; t += 1.7) {
            times.push(t);
        }
        const forward = times.map((t) => atmosphere.envelopeAt(t));

        const reverse = new Array(times.length);
        for (let i = times.length - 1; i >= 0; i -= 1) {
            reverse[i] = atmosphere.envelopeAt(times[i]);
        }
        expect(reverse).toEqual(forward);

        // Deterministic shuffle (no Math.random in the assertion either).
        const order = times.map((unused, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101));
        const shuffled = new Array(times.length);
        order.forEach((i) => {
            shuffled[i] = atmosphere.envelopeAt(times[i]);
        });
        expect(shuffled).toEqual(forward);
    });

    it('two independently built instances agree exactly (no shared or hidden state)', () => {
        const a = createRecutAtmosphere();
        const b = createRecutAtmosphere();
        for (let t = 0; t <= 564; t += 0.9) {
            QUERIES.forEach((name) => {
                expect(a[name](t)).toBe(b[name](t));
            });
        }
    });

    it('seeking backwards mid-sweep does not perturb later answers', () => {
        const atmosphere = createRecutAtmosphere();
        const straight = [];
        for (let t = 60; t <= 510; t += 3) {
            straight.push(atmosphere.envelopeAt(t));
        }
        const jumpy = [];
        for (let t = 60, i = 0; t <= 510; t += 3, i += 1) {
            atmosphere.envelopeAt(0);
            atmosphere.envelopeAt(564);
            atmosphere.envelopeAt(t - 100);
            jumpy.push(atmosphere.envelopeAt(t));
        }
        expect(jumpy).toEqual(straight);
    });

    it('uses no Math.random anywhere in the module source', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const source = fs.readFileSync(
            path.join(process.cwd(), 'src/js/prototype/recut-atmosphere.js'),
            'utf8'
        );
        expect(source).not.toContain('Math.random');
        expect(source).not.toContain('Date.now');
        expect(source).not.toContain('performance.now');
        expect(source).not.toContain("from 'three'");
    });
});

describe('recut atmosphere — config', () => {
    it('returns a frozen config that cannot be mutated', () => {
        const atmosphere = createRecutAtmosphere();
        const config = atmosphere.getConfig();
        expect(Object.isFrozen(config)).toBe(true);
        expect(() => {
            'use strict';

            config.backgroundLift = 1;
        }).toThrow();
        expect(atmosphere.getConfig().backgroundLift).toBe(RECUT_ATMOSPHERE_BACKGROUND_LIFT);
    });

    it('returns the same frozen object every time', () => {
        const atmosphere = createRecutAtmosphere();
        expect(atmosphere.getConfig()).toBe(atmosphere.getConfig());
    });

    it('defaults every field when constructed with no options', () => {
        expect(createRecutAtmosphere().getConfig()).toEqual({
            windowStart: START,
            windowEnd: END,
            rampSeconds: RAMP,
            fogDensityAdd: RECUT_ATMOSPHERE_FOG_DENSITY_ADD,
            fogDensityMax: RECUT_ATMOSPHERE_FOG_DENSITY_MAX,
            fogDensityMaxBase: 0.04,
            dustOpacityAdd: RECUT_ATMOSPHERE_DUST_OPACITY_ADD,
            dustOpacityMax: RECUT_ATMOSPHERE_DUST_OPACITY_MAX,
            dustOpacityMaxBase: 0.16,
            backgroundLift: RECUT_ATMOSPHERE_BACKGROUND_LIFT,
            backgroundLiftColor: RECUT_ATMOSPHERE_LIFT_COLOR
        });
    });

    it('ignores non-finite and wrong-typed overrides and keeps the defaults', () => {
        const atmosphere = createRecutAtmosphere({
            windowStart: NaN,
            windowEnd: 'later',
            rampSeconds: undefined,
            fogDensityAdd: null,
            backgroundLift: Infinity,
            backgroundLiftColor: 42
        });
        expect(atmosphere.getConfig()).toEqual(createRecutAtmosphere().getConfig());
    });

    it('accepts explicit overrides and answers against them', () => {
        const atmosphere = createRecutAtmosphere({
            windowStart: 100,
            windowEnd: 200,
            rampSeconds: 5,
            backgroundLift: 0.5
        });
        expect(atmosphere.envelopeAt(99)).toBe(0);
        expect(atmosphere.envelopeAt(105)).toBeCloseTo(1, 12);
        expect(atmosphere.envelopeAt(200)).toBe(0);
        expect(atmosphere.backgroundLiftAt(150)).toBeCloseTo(0.5, 12);
    });

    it('never lets a ramp eat more than half the window', () => {
        const atmosphere = createRecutAtmosphere({ windowStart: 10, windowEnd: 14, rampSeconds: 99 });
        expect(atmosphere.getConfig().rampSeconds).toBe(2);
        expect(atmosphere.envelopeAt(12)).toBeCloseTo(1, 12);
        expect(atmosphere.envelopeAt(10)).toBe(0);
        expect(atmosphere.envelopeAt(14)).toBe(0);
    });

    it('treats a zero ramp as a hard gate rather than dividing by zero', () => {
        const atmosphere = createRecutAtmosphere({ rampSeconds: 0 });
        expect(atmosphere.envelopeAt(START)).toBe(0);
        expect(atmosphere.envelopeAt(START + 0.001)).toBe(1);
        expect(atmosphere.envelopeAt(END)).toBe(0);
    });
});
