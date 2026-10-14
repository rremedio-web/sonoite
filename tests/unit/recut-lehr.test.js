/* eslint-disable security/detect-object-injection -- query names are a fixed local list */
import {
    createRecutLehr,
    lehrWideWeight,
    RECUT_LEHR_WINDOW_START,
    RECUT_LEHR_WINDOW_END,
    RECUT_LEHR_RAMP_SECONDS,
    RECUT_LEHR_FLOOR_OPACITY_ADD,
    RECUT_LEHR_DUST_DRIFT_ADD,
    RECUT_LEHR_ENV_MAP_ADD,
    RECUT_LEHR_ROUGHNESS_HINT_START,
    RECUT_LEHR_ROUGHNESS_HINT_PEAK,
    RECUT_LEHR_ROUGHNESS_HINT_END,
    RECUT_LEHR_SETTLE_SECONDS,
    RECUT_LEHR_SETTLE_DISTANCE
} from '../../src/js/prototype/recut-lehr.js';

const START = RECUT_LEHR_WINDOW_START;
const END = RECUT_LEHR_WINDOW_END;
const RAMP = RECUT_LEHR_RAMP_SECONDS;

const QUERIES = [
    ['envelopeAt', []],
    ['floorOpacityAddAt', ['WS']],
    ['dustDriftAddAt', []],
    ['goboOffsetMulAt', []],
    ['envMapAddAt', []],
    ['sheenAddAt', []],
    ['roughnessHintAt', []],
    ['shellOpacityAddAt', ['WS']],
    ['hazeAddAt', ['WS']]
];

describe('recut lehr — window and framing', () => {
    const lehr = createRecutLehr();

    it('uses the same 64–504 window as recut atmosphere', () => {
        expect(START).toBe(64);
        expect(END).toBe(504);
        expect(RAMP).toBe(2);
    });

    it('is exactly zero at the protected opening and ending', () => {
        [0, 32.5, 59.5, 63.9, START, END, 506, 547.5, 564].forEach((t) => {
            expect(lehr.envelopeAt(t)).toBe(0);
            expect(lehr.floorOpacityAddAt(t, 'WS')).toBe(0);
            expect(lehr.dustDriftAddAt(t)).toBe(0);
            expect(lehr.goboOffsetMulAt(t)).toBe(1);
            expect(lehr.envMapAddAt(t)).toBe(0);
            expect(lehr.sheenAddAt(t)).toBe(0);
            expect(lehr.roughnessHintAt(t)).toBe(0);
            expect(lehr.shellOpacityAddAt(t, 'WS')).toBe(0);
            expect(lehr.hazeAddAt(t, 'WS')).toBe(0);
        });
        [0, 32.5, 59.5, 63.9, END, 506, 547.5, 564].forEach((t) => {
            expect(lehr.cutSettleAt(t, 0)).toBe(0);
        });
    });

    it('holds full envelope in the middle', () => {
        expect(lehr.envelopeAt(START + RAMP)).toBeCloseTo(1, 12);
        expect(lehr.envelopeAt(200)).toBeCloseTo(1, 12);
        expect(lehr.floorOpacityAddAt(200, 'WS')).toBeCloseTo(RECUT_LEHR_FLOOR_OPACITY_ADD, 12);
        expect(lehr.dustDriftAddAt(200)).toBeCloseTo(RECUT_LEHR_DUST_DRIFT_ADD, 12);
        expect(lehr.envMapAddAt(200)).toBeCloseTo(RECUT_LEHR_ENV_MAP_ADD, 12);
    });

    it('does not lift ECU floors or shells', () => {
        expect(lehrWideWeight('ECU')).toBe(0);
        expect(lehrWideWeight('WS')).toBe(1);
        expect(lehrWideWeight('MCU')).toBeCloseTo(0.35, 12);
        expect(lehr.floorOpacityAddAt(200, 'ECU')).toBe(0);
        expect(lehr.shellOpacityAddAt(200, 'ECU')).toBe(0);
        expect(lehr.hazeAddAt(200, 'ECU')).toBe(0);
        expect(lehr.floorOpacityAddAt(200, 'MCU')).toBeCloseTo(RECUT_LEHR_FLOOR_OPACITY_ADD * 0.35, 12);
    });

    it('returns 0 / identity for non-finite time', () => {
        [NaN, Infinity, -Infinity, undefined, null, 'x'].forEach((t) => {
            QUERIES.forEach(([name, extra]) => {
                const value = lehr[name](t, ...extra);
                if (name === 'goboOffsetMulAt') {
                    expect(value).toBe(1);
                } else {
                    expect(value).toBe(0);
                }
            });
        });
    });
});

describe('recut lehr — roughness hint and cut settle', () => {
    const lehr = createRecutLehr();

    it('keeps roughness hint off before 198s and after mutation takeover at 337s', () => {
        expect(lehr.roughnessHintAt(RECUT_LEHR_ROUGHNESS_HINT_START)).toBe(0);
        expect(lehr.roughnessHintAt(RECUT_LEHR_ROUGHNESS_HINT_END)).toBe(0);
        expect(lehr.roughnessHintAt(337)).toBe(0);
        expect(lehr.roughnessHintAt(400)).toBe(0);
        expect(lehr.roughnessHintAt(RECUT_LEHR_ROUGHNESS_HINT_PEAK)).toBeGreaterThan(0.05);
    });

    it('eases cut settle to zero after the settle window', () => {
        expect(lehr.cutSettleAt(200, 0)).toBeCloseTo(RECUT_LEHR_SETTLE_DISTANCE, 12);
        expect(lehr.cutSettleAt(200, RECUT_LEHR_SETTLE_SECONDS)).toBe(0);
        expect(lehr.cutSettleAt(200, 1)).toBe(0);
        expect(lehr.cutSettleAt(200, -0.01)).toBe(0);
        const early = lehr.cutSettleAt(200, 0.05);
        const late = lehr.cutSettleAt(200, 0.35);
        expect(early).toBeGreaterThan(late);
    });

    it('lands full settle on the first recut cut at 64s, ignoring the 2s lookdev ramp', () => {
        expect(lehr.envelopeAt(START)).toBe(0);
        expect(lehr.envelopeAt(START + 0.23)).toBeLessThan(0.1);
        expect(lehr.cutSettleAt(START, 0)).toBeCloseTo(RECUT_LEHR_SETTLE_DISTANCE, 12);
        expect(lehr.cutSettleAt(START + 0.23, 0.23)).toBeGreaterThan(0.05);
        expect(lehr.cutSettleAt(63.9, 0)).toBe(0);
    });
});
