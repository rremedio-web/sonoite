import {
    createRecutListen,
    RECUT_LISTEN_WINDOW_START,
    RECUT_LISTEN_WINDOW_END,
    RECUT_LISTEN_RAMP_SECONDS,
    RECUT_LISTEN_CHANNELS,
    RECUT_LISTEN_COMMIT_CONFIG,
    RECUT_LISTEN_MIN_INTERVAL_SECONDS,
    RECUT_LISTEN_DECAY_SECONDS,
    RECUT_LISTEN_RIM_GAIN,
    RECUT_LISTEN_FLOOR_ADD,
    RECUT_LISTEN_BLOOM_ADD,
    RECUT_LISTEN_ECU_BLOOM_WEIGHT
} from '../../src/js/prototype/recut-listen.js';

const START = RECUT_LISTEN_WINDOW_START;
const END = RECUT_LISTEN_WINDOW_END;
const RAMP = RECUT_LISTEN_RAMP_SECONDS;

describe('recut listen — window and rotation', () => {
    it('uses the same 64–504 window as recut atmosphere', () => {
        expect(START).toBe(64);
        expect(END).toBe(504);
        expect(RAMP).toBe(2);
        expect(RECUT_LISTEN_COMMIT_CONFIG.activeWindows).toEqual([{ start: 64, end: 504 }]);
        expect(RECUT_LISTEN_COMMIT_CONFIG.armAfterSeconds).toBe(64);
        expect(RECUT_LISTEN_CHANNELS).toEqual(['rim', 'floor', 'bloom']);
    });

    it('is exactly zero at the protected opening and ending', () => {
        const listen = createRecutListen();
        [0, 32.5, 59.5, 63.9, START, END, 506, 547.5, 564].forEach((t) => {
            expect(listen.envelopeAt(t)).toBe(0);
            const outputs = listen.update(t, 0.016, { accentRise: true, framing: 'WS' });
            expect(outputs.rim).toBe(0);
            expect(outputs.floor).toBe(0);
            expect(outputs.bloom).toBe(0);
            expect(outputs.rimMul).toBe(1);
            expect(outputs.floorAdd).toBe(0);
            expect(outputs.bloomAdd).toBe(0);
            expect(outputs.fireCount).toBe(0);
        });
    });

    it('rotates rim → floor → bloom and never lights two channels at a fire', () => {
        const listen = createRecutListen();
        const first = listen.update(200, 0.016, { accentRise: true, framing: 'WS' });
        expect(first.channel).toBe('rim');
        expect(first.rim).toBeCloseTo(1, 12);
        expect(first.floor).toBe(0);
        expect(first.bloom).toBe(0);
        expect(first.rimMul).toBeCloseTo(1 + RECUT_LISTEN_RIM_GAIN, 12);

        const tooSoon = listen.update(200 + RECUT_LISTEN_MIN_INTERVAL_SECONDS - 0.05, 0.016, {
            accentRise: true,
            framing: 'WS'
        });
        expect(tooSoon.fireCount).toBe(1);
        expect(tooSoon.channel).toBe('rim');

        const secondT = 200 + RECUT_LISTEN_MIN_INTERVAL_SECONDS;
        const second = listen.update(secondT, 0.016, { accentRise: true, framing: 'WS' });
        expect(second.channel).toBe('floor');
        expect(second.floor).toBeCloseTo(1, 12);
        expect(second.rim).toBe(0);
        expect(second.bloom).toBe(0);
        expect(second.floorAdd).toBeCloseTo(RECUT_LISTEN_FLOOR_ADD, 12);

        const thirdT = secondT + RECUT_LISTEN_MIN_INTERVAL_SECONDS;
        const third = listen.update(thirdT, 0.016, { accentRise: true, framing: 'WS' });
        expect(third.channel).toBe('bloom');
        expect(third.bloom).toBeCloseTo(1, 12);
        expect(third.rim).toBe(0);
        expect(third.floor).toBe(0);
        expect(third.bloomAdd).toBeCloseTo(RECUT_LISTEN_BLOOM_ADD, 12);

        const fourthT = thirdT + RECUT_LISTEN_MIN_INTERVAL_SECONDS;
        const fourth = listen.update(fourthT, 0.016, { accentRise: true, framing: 'WS' });
        expect(fourth.channel).toBe('rim');
        expect(fourth.fireCount).toBe(4);
    });

    it('does not fire without a rising-edge accent', () => {
        const listen = createRecutListen();
        const outputs = listen.update(200, 0.016, { accentRise: false, framing: 'WS' });
        expect(outputs.fireCount).toBe(0);
        expect(outputs.rim).toBe(0);
        expect(outputs.floor).toBe(0);
        expect(outputs.bloom).toBe(0);
    });

    it('zeros floor on ECU and reduces bloom', () => {
        const listen = createRecutListen();
        listen.update(200, 0.016, { accentRise: true, framing: 'ECU' });
        expect(listen.outputs.channel).toBe('rim');

        const floorHit = listen.update(200 + RECUT_LISTEN_MIN_INTERVAL_SECONDS, 0.016, {
            accentRise: true,
            framing: 'ECU'
        });
        expect(floorHit.channel).toBe('floor');
        expect(floorHit.floor).toBe(0);
        expect(floorHit.floorAdd).toBe(0);

        const bloomHit = listen.update(
            200 + (RECUT_LISTEN_MIN_INTERVAL_SECONDS * 2),
            0.016,
            { accentRise: true, framing: 'ECU' }
        );
        expect(bloomHit.channel).toBe('bloom');
        expect(bloomHit.bloom).toBeCloseTo(RECUT_LISTEN_ECU_BLOOM_WEIGHT, 12);
        expect(bloomHit.bloomAdd).toBeCloseTo(
            RECUT_LISTEN_BLOOM_ADD * RECUT_LISTEN_ECU_BLOOM_WEIGHT,
            12
        );
    });

    it('decays a pulse to zero by decaySeconds', () => {
        const listen = createRecutListen();
        listen.update(200, 0.016, { accentRise: true, framing: 'WS' });
        const mid = listen.update(200 + (RECUT_LISTEN_DECAY_SECONDS * 0.5), 0.016, {
            accentRise: false,
            framing: 'WS'
        });
        expect(mid.rim).toBeGreaterThan(0);
        expect(mid.rim).toBeLessThan(1);
        const done = listen.update(200 + RECUT_LISTEN_DECAY_SECONDS, 0.016, {
            accentRise: false,
            framing: 'WS'
        });
        expect(done.rim).toBe(0);
        expect(done.rimMul).toBe(1);
    });

    it('resets rotation and envelopes on a backward seek', () => {
        const listen = createRecutListen();
        const gap = RECUT_LISTEN_MIN_INTERVAL_SECONDS + 0.05;
        listen.update(300, 0.016, { accentRise: true, framing: 'WS' });
        listen.update(300 + gap, 0.016, {
            accentRise: true,
            framing: 'WS'
        });
        expect(listen.outputs.channel).toBe('floor');
        expect(listen.outputs.fireCount).toBe(2);

        const afterSeek = listen.update(200, 0.016, { accentRise: true, framing: 'WS' });
        expect(afterSeek.channel).toBe('rim');
        expect(afterSeek.rim).toBeCloseTo(1, 12);
        expect(afterSeek.floor).toBe(0);
        expect(afterSeek.fireCount).toBe(3);
    });
});
