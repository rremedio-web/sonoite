/**
 * Plateau rim COMMIT variant (?rimmode=commit) — owner A/B, audit 2026-08-13.
 *
 * Covers the hysteretic stepper (recut-plateau-commit.js) and the recut-gated
 * flag resolution (film-flags.js rimMode).
 */

import {
    createPlateauRimCommit,
    PLATEAU_COMMIT_CONSTANTS
} from '../../src/js/prototype/recut-plateau-commit.js';
import { resolveFilmFlags, resolveRimMode, readRimModeParam } from '../../src/js/prototype/film-flags.js';

const {
    PLATEAU_COMMIT_LOW,
    PLATEAU_COMMIT_HIGH,
    PLATEAU_COMMIT_ENTER,
    PLATEAU_COMMIT_EXIT,
    PLATEAU_COMMIT_SUSTAIN_SECONDS,
    PLATEAU_COMMIT_MIN_HOLD_SECONDS,
    PLATEAU_COMMIT_CROSSFADE_SECONDS
} = PLATEAU_COMMIT_CONSTANTS;

const FRAME = 1 / 30;

function runSeconds(stepper, startElapsed, seconds, midNorm) {
    let elapsed = startElapsed;
    let value = null;
    const frames = Math.ceil(seconds / FRAME);
    for (let i = 0; i < frames; i += 1) {
        elapsed += FRAME;
        value = stepper.update(elapsed, midNorm);
    }
    return { elapsed, value };
}

function makeParams(entries) {
    const map = new Map(Object.entries(entries));
    return { get: (name) => (map.has(name) ? map.get(name) : null) };
}

const CANONICAL_CONTEXT = { trackSlug: 'nao-querer-nada', variantKey: 'track5-cinema' };

describe('createPlateauRimCommit', () => {
    test('starts at the low committed level and stays there under quiet mids', () => {
        const stepper = createPlateauRimCommit();
        const { value } = runSeconds(stepper, 340, 5, 0.2);
        expect(value).toBeCloseTo(PLATEAU_COMMIT_LOW, 5);
        expect(stepper.getState().level).toBe('low');
        expect(stepper.getState().commitCount).toBe(0);
    });

    test('sustained high mid commits to the high level after sustain + crossfade', () => {
        const stepper = createPlateauRimCommit();
        let state = runSeconds(stepper, 340, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 0.5, 0.2);
        state = runSeconds(
            stepper,
            state.elapsed,
            PLATEAU_COMMIT_SUSTAIN_SECONDS + PLATEAU_COMMIT_CROSSFADE_SECONDS + 0.5,
            PLATEAU_COMMIT_ENTER + 0.1
        );
        expect(state.value).toBeCloseTo(PLATEAU_COMMIT_HIGH, 5);
        expect(stepper.getState().level).toBe('high');
        expect(stepper.getState().commitCount).toBe(1);
    });

    test('a sub-sustain spike never commits', () => {
        const stepper = createPlateauRimCommit();
        let state = runSeconds(stepper, 340, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 0.5, 0.2);
        // Spike shorter than the sustain requirement, then quiet again.
        state = runSeconds(stepper, state.elapsed, PLATEAU_COMMIT_SUSTAIN_SECONDS * 0.5, 0.95);
        state = runSeconds(stepper, state.elapsed, 2, 0.2);
        expect(state.value).toBeCloseTo(PLATEAU_COMMIT_LOW, 5);
        expect(stepper.getState().commitCount).toBe(0);
    });

    test('hysteresis band holds the last commit (mid between exit and enter)', () => {
        const stepper = createPlateauRimCommit();
        let state = runSeconds(stepper, 340, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 0.5, 0.2);
        state = runSeconds(stepper, state.elapsed, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 1, PLATEAU_COMMIT_ENTER + 0.1);
        expect(stepper.getState().level).toBe('high');
        // Mid drops into the dead band — above exit, below enter: no new commit.
        const between = (PLATEAU_COMMIT_ENTER + PLATEAU_COMMIT_EXIT) / 2;
        state = runSeconds(stepper, state.elapsed, 8, between);
        expect(state.value).toBeCloseTo(PLATEAU_COMMIT_HIGH, 5);
        expect(stepper.getState().commitCount).toBe(1);
    });

    test('sustained low mid after the hold window returns to the low level', () => {
        const stepper = createPlateauRimCommit();
        let state = runSeconds(stepper, 340, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 0.5, 0.2);
        state = runSeconds(stepper, state.elapsed, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 1, PLATEAU_COMMIT_ENTER + 0.1);
        state = runSeconds(
            stepper,
            state.elapsed,
            PLATEAU_COMMIT_SUSTAIN_SECONDS + PLATEAU_COMMIT_CROSSFADE_SECONDS + 0.5,
            PLATEAU_COMMIT_EXIT - 0.1
        );
        expect(state.value).toBeCloseTo(PLATEAU_COMMIT_LOW, 5);
        expect(stepper.getState().level).toBe('low');
        expect(stepper.getState().commitCount).toBe(2);
    });

    test('min hold blocks an immediate flip-flop after a commit', () => {
        const stepper = createPlateauRimCommit();
        let state = runSeconds(stepper, 340, PLATEAU_COMMIT_MIN_HOLD_SECONDS + 0.5, 0.2);
        state = runSeconds(stepper, state.elapsed, PLATEAU_COMMIT_SUSTAIN_SECONDS + 0.2, PLATEAU_COMMIT_ENTER + 0.1);
        expect(stepper.getState().level).toBe('high');
        // Immediately hostile low signal — must NOT re-commit inside the hold.
        runSeconds(stepper, state.elapsed, PLATEAU_COMMIT_MIN_HOLD_SECONDS - 1, PLATEAU_COMMIT_EXIT - 0.2);
        expect(stepper.getState().level).toBe('high');
        expect(stepper.getState().commitCount).toBe(1);
    });

    test('a seek jump clamps dt instead of exploding the state machine', () => {
        const stepper = createPlateauRimCommit();
        stepper.update(340, 0.2);
        // Forward seek of 200s in one frame: reads as one clamped step.
        const value = stepper.update(540, 0.95);
        expect(value).toBeGreaterThanOrEqual(PLATEAU_COMMIT_LOW);
        expect(value).toBeLessThanOrEqual(PLATEAU_COMMIT_HIGH);
        expect(stepper.getState().commitCount).toBe(0);
        // Backward seek also survives.
        const back = stepper.update(100, 0.2);
        expect(Number.isFinite(back)).toBe(true);
    });

    test('output never leaves the shared A/B band', () => {
        const stepper = createPlateauRimCommit();
        let elapsed = 340;
        for (let i = 0; i < 1200; i += 1) {
            elapsed += FRAME;
            const mid = (Math.sin(i / 7) + 1) / 2;
            const value = stepper.update(elapsed, mid);
            expect(value).toBeGreaterThanOrEqual(PLATEAU_COMMIT_LOW - 1e-9);
            expect(value).toBeLessThanOrEqual(PLATEAU_COMMIT_HIGH + 1e-9);
        }
    });
});

describe('rimmode flag resolution', () => {
    test('readRimModeParam normalizes commit/follow and rejects junk', () => {
        expect(readRimModeParam(makeParams({ rimmode: 'commit' }))).toBe('commit');
        expect(readRimModeParam(makeParams({ rimmode: 'follow' }))).toBe('follow');
        expect(readRimModeParam(makeParams({ rimmode: 'loud' }))).toBe(null);
        expect(readRimModeParam(makeParams({}))).toBe(null);
    });

    test('resolveRimMode is recut-gated', () => {
        expect(resolveRimMode('commit', true)).toBe('commit');
        expect(resolveRimMode('commit', false)).toBe('follow');
        expect(resolveRimMode(null, true)).toBe('follow');
    });

    test('rimmode=commit engages only on the canonical recut context', () => {
        const flags = resolveFilmFlags(
            makeParams({ recut: '1', rimmode: 'commit' }),
            CANONICAL_CONTEXT
        );
        expect(flags.recut).toBe(true);
        expect(flags.rimMode).toBe('commit');
    });

    test('rimmode=commit without recut is a no-op', () => {
        const flags = resolveFilmFlags(makeParams({ rimmode: 'commit' }), CANONICAL_CONTEXT);
        expect(flags.recut).toBe(false);
        expect(flags.rimMode).toBe('follow');
    });

    test('film=0 kills rimmode along with recut', () => {
        const flags = resolveFilmFlags(
            makeParams({ film: '0', recut: '1', rimmode: 'commit' }),
            CANONICAL_CONTEXT
        );
        expect(flags.recut).toBe(false);
        expect(flags.rimMode).toBe('follow');
        expect(flags.rimModeParam).toBe('commit');
    });

    test('off-canonical context refuses rimmode with recut', () => {
        const flags = resolveFilmFlags(
            makeParams({ recut: '1', rimmode: 'commit' }),
            { trackSlug: 'sonoite', variantKey: 'track5-cinema' }
        );
        expect(flags.recut).toBe(false);
        expect(flags.rimMode).toBe('follow');
    });
});
