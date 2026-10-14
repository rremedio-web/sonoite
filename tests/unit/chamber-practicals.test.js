/* eslint-disable security/detect-object-injection -- practical ids are a fixed roster */
import {
    SONOITE_PRACTICALS,
    samplePracticalIntensity,
    sampleIgnitionEnvelope,
    sampleHolderEmissiveIntensity,
    sampleHushIntensityMul,
    sampleMemoryDecayMul,
    sampleClimaxEnvelope,
    sampleFlameFlicker,
    sampleCandleBreath,
    sampleGutteringMul,
    sampleConsecrationHazeArc,
    sampleConsecrationHushHazeMul,
    CONSECRATION_HAZE_HUSH_MUL,
    CONSECRATION_HAZE_MEMORY_FLOOR,
    sampleDetonationEnvelope,
    samplePracticalWarmWrap,
    countLitPracticals,
    hashPracticalPhaseOffsets,
    breathSlowFreqForPractical,
    breathTremorFreqForPractical,
    kelvinToRgb,
    kelvinToHex,
    PRACTICAL_HUSH_START,
    PRACTICAL_HUSH_END,
    PRACTICAL_HUSH_EDGE_SECONDS,
    PRACTICAL_CLIMAX_START,
    PRACTICAL_CLIMAX_ATTACK,
    PRACTICAL_SNAP_AT,
    PRACTICAL_SNAP_SECONDS,
    PRACTICAL_P1_SNAP_INTENSITY,
    PRACTICAL_MEMORY_TARGET,
    PRACTICAL_DETONATION_AT,
    PRACTICAL_DETONATION_FLASH_SECONDS,
    PRACTICAL_GUTTER_EVENTS,
    PRACTICAL_GUTTER_DIP,
    PRACTICAL_GUTTER_DIP_SECONDS,
    PRACTICAL_GUTTER_WAVER_SECONDS,
    PRACTICAL_GUTTER_RECOVER_SECONDS,
    filterPracticalsForQuality,
    samplePracticalAgeShiftK,
    PRACTICAL_AGE_SHIFT_TOTAL_K,
    PRACTICAL_HUSH_KELVIN_DELTA,
    resolvePracticalAuthoredHexPair,
    authoredAmberHexForKelvin,
    sampleHushColorMix
} from '../../src/js/prototype/chamber-practicals.js';
import { SONOITE_CHAMBER_FILM_TIMELINE } from '../../src/js/prototype/films/sonoite.js';

function smoothstep01(t) {
    if (!(t > 0)) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function samplePlateauEnvelopeForTest(elapsed, start, duration, attackSeconds, releaseSeconds) {
    const safeDuration = Math.max(duration, 0.001);
    const end = start + safeDuration;

    if (elapsed < start || elapsed > end) {
        return 0;
    }

    const attack = Number.isFinite(attackSeconds)
        ? clamp(attackSeconds, 0.04, safeDuration)
        : clamp(Math.min(safeDuration * 0.24, 1.4), 0.04, Math.min(1.8, safeDuration));
    if (elapsed <= start + attack) {
        return smoothstep01((elapsed - start) / attack);
    }

    const release = Number.isFinite(releaseSeconds)
        ? clamp(releaseSeconds, 0.04, safeDuration)
        : clamp(Math.min(safeDuration * 0.28, 1.8), 0.04, Math.min(2.4, safeDuration));
    const releaseStart = Math.max(start + attack, end - release);

    if (elapsed >= releaseStart) {
        return 1 - smoothstep01((elapsed - releaseStart) / (end - releaseStart));
    }

    return 1;
}

function practicalById(id) {
    return SONOITE_PRACTICALS.find((p) => p.id === id);
}

describe('chamber practicals — pure schedule', () => {
    const p1 = practicalById('p1_votive_first');
    const p2 = practicalById('p2_votive_right');
    const ring = practicalById('p5_plinth_ring');
    const p4 = practicalById('p4_sconce_right');

    it('returns 0 before igniteAt', () => {
        expect(samplePracticalIntensity(p1, p1.igniteAt - 0.01)).toBe(0);
        expect(samplePracticalIntensity(p2, 0)).toBe(0);
        expect(sampleIgnitionEnvelope(p1.igniteAt - 0.01, p1.igniteAt)).toBe(0);
    });

    it('holder emissive is 0 before ignition and ramps with the flame envelope', () => {
        expect(sampleHolderEmissiveIntensity(p1.igniteAt - 0.01, p1.igniteAt)).toBe(0);
        expect(sampleHolderEmissiveIntensity(p4.igniteAt - 0.5, p4.igniteAt)).toBe(0);
        const atFull = p1.igniteAt + 0.6;
        expect(sampleHolderEmissiveIntensity(atFull, p1.igniteAt)).toBeCloseTo(0.06, 12);
        const midAttack = p1.igniteAt + 0.3;
        expect(sampleHolderEmissiveIntensity(midAttack, p1.igniteAt)).toBeGreaterThan(0);
        expect(sampleHolderEmissiveIntensity(midAttack, p1.igniteAt)).toBeLessThan(0.06);
    });

    it('reaches full authored intensity by igniteAt + 0.6s', () => {
        const atFull = p1.igniteAt + 0.6;
        expect(sampleIgnitionEnvelope(atFull, p1.igniteAt)).toBe(1);
        expect(samplePracticalIntensity(p1, atFull)).toBeCloseTo(p1.intensity, 12);
    });

    it('applies HUSH multipliers with P1 exception', () => {
        const hushMid = PRACTICAL_HUSH_START + PRACTICAL_HUSH_EDGE_SECONDS + 1;
        expect(hushMid).toBeLessThan(PRACTICAL_HUSH_END - PRACTICAL_HUSH_EDGE_SECONDS);
        const p1Lit = samplePracticalIntensity(p1, hushMid);
        const p2Lit = samplePracticalIntensity(p2, hushMid);
        expect(sampleHushIntensityMul(p1, hushMid)).toBeCloseTo(0.35, 12);
        expect(sampleHushIntensityMul(p2, hushMid)).toBeCloseTo(0.18, 12);
        expect(p1Lit).toBeCloseTo(p1.intensity * 0.35, 10);
        expect(p2Lit).toBeCloseTo(p2.intensity * 0.18, 10);
    });

    it('applies the 384.03 climax bump envelope', () => {
        const peakAt = PRACTICAL_CLIMAX_START + PRACTICAL_CLIMAX_ATTACK + 2;
        const envelope = sampleClimaxEnvelope(peakAt);
        expect(envelope).toBeGreaterThan(0.9);
        const p1AtPeak = samplePracticalIntensity(p1, peakAt);
        expect(p1AtPeak).toBeGreaterThan(p1.intensity);
        expect(p1AtPeak / p1.intensity).toBeCloseTo(1.25, 2);
    });

    it('spikes at the 375.05 detonation flash', () => {
        const flashMid = PRACTICAL_DETONATION_AT + PRACTICAL_DETONATION_FLASH_SECONDS * 0.18;
        expect(sampleDetonationEnvelope(flashMid)).toBeGreaterThan(0.85);
        const p1AtFlash = samplePracticalIntensity(p1, flashMid);
        expect(p1AtFlash).toBeGreaterThan(p1.intensity * 1.8);
    });

    it('detonation envelope is zero outside [375.05, 375.47]', () => {
        expect(sampleDetonationEnvelope(PRACTICAL_DETONATION_AT - 0.01)).toBe(0);
        expect(sampleDetonationEnvelope(PRACTICAL_DETONATION_AT + PRACTICAL_DETONATION_FLASH_SECONDS + 0.01)).toBe(0);
    });

    it('MEMORY decay at 511.75 is in the ≈0.775 band', () => {
        const t = 511.75;
        expect(sampleMemoryDecayMul(t)).toBeCloseTo(0.775, 2);
        const lit = samplePracticalIntensity(p4, t);
        expect(lit).toBeCloseTo(p4.intensity * 0.775, 2);
    });

    it('MEMORY decay persists through the snap window', () => {
        const preSnap = PRACTICAL_SNAP_AT - 0.01;
        expect(sampleMemoryDecayMul(preSnap)).toBeCloseTo(PRACTICAL_MEMORY_TARGET, 2);
        const p1Decayed = samplePracticalIntensity(p1, preSnap);
        expect(p1Decayed).toBeCloseTo(p1.intensity * PRACTICAL_MEMORY_TARGET, 2);
    });

    it('snap at 535 lifts P1 from decayed band to 0.16 and fades others from ≤0.55×', () => {
        const preSnap = PRACTICAL_SNAP_AT - 0.01;
        const p1Decayed = samplePracticalIntensity(p1, preSnap);
        expect(p1Decayed).toBeCloseTo(p1.intensity * PRACTICAL_MEMORY_TARGET, 2);

        const afterSnap = PRACTICAL_SNAP_AT + PRACTICAL_SNAP_SECONDS + 0.01;
        expect(samplePracticalIntensity(p1, afterSnap)).toBeCloseTo(PRACTICAL_P1_SNAP_INTENSITY, 12);
        expect(samplePracticalIntensity(p2, afterSnap)).toBe(0);
        expect(samplePracticalIntensity(p4, afterSnap)).toBe(0);

        const p2PreSnap = samplePracticalIntensity(p2, preSnap);
        expect(p2PreSnap).toBeLessThanOrEqual(p2.intensity * PRACTICAL_MEMORY_TARGET + 0.001);
    });

    it('ring practical uses one consolidated light at intensity 0.55 with 4 sub-points', () => {
        expect(ring.subPointCount).toBe(4);
        expect(ring.intensity).toBe(0.55);
        expect(ring.lightDistance).toBe(6.2);
        expect(ring.kind).toBe('ring');
        expect(ring.angles.length).toBe(4);
    });

    it('authored amber colors read gold-forward, not red', () => {
        const rgb = kelvinToRgb(1900);
        expect(rgb.r).toBeGreaterThan(rgb.b * 1.35);
        expect(rgb.g).toBeGreaterThan(rgb.b * 1.1);
        expect(p1.color.toLowerCase()).toBe('#ffd4a0');
    });

    it('hush kelvin fallback returns authored hush hexes without base-band collision', () => {
        expect(kelvinToHex(1500)).toBe('#ffc07a');
        expect(kelvinToHex(1600)).toBe('#ffba70');
        expect(kelvinToHex(1800)).toBe('#ffb46a');
        expect(kelvinToHex(2100)).toBe('#ffa85a');
        expect(p1.hushColor).toBe('#ffc07a');
        expect(p2.hushColor).toBe('#ffba70');
    });

    it('warm wrap rises with ignition count', () => {
        expect(samplePracticalWarmWrap(0)).toBe(0);
        expect(countLitPracticals(40)).toBe(1);
        expect(samplePracticalWarmWrap(40)).toBeCloseTo(1 / 7, 3);
        expect(countLitPracticals(130)).toBeGreaterThanOrEqual(4);
        expect(samplePracticalWarmWrap(130)).toBeGreaterThan(0.5);
    });

    it('warm wrap with a 3-light roster never exceeds 3/7', () => {
        const safeRoster = filterPracticalsForQuality('safe');
        expect(safeRoster.length).toBe(3);
        const litAtClimax = countLitPracticals(400, safeRoster);
        expect(litAtClimax).toBeLessThanOrEqual(3);
        expect(samplePracticalWarmWrap(400, safeRoster)).toBeLessThanOrEqual((3 / 7) + 0.001);
    });

    it('quality tiers drop the authored roster as specified', () => {
        const cinema = filterPracticalsForQuality('cinema');
        const balanced = filterPracticalsForQuality('balanced');
        const safe = filterPracticalsForQuality('safe');
        expect(cinema.length).toBe(7);
        expect(balanced.map((p) => p.id)).not.toContain('p2_votive_right');
        expect(balanced.map((p) => p.id)).not.toContain('p7_lantern_rear');
        expect(balanced.length).toBe(5);
        expect(safe.map((p) => p.id)).toEqual([
            'p1_votive_first',
            'p4_sconce_right',
            'p5_plinth_ring'
        ]);
    });

    it('flame flicker is deterministic per id+time and phases differ by id', () => {
        const t = 19.1;
        const a = sampleFlameFlicker('p1_votive_first', t);
        const b = sampleFlameFlicker('p1_votive_first', t);
        const c = sampleFlameFlicker('p2_votive_right', t);
        expect(a).toEqual(b);
        expect(a.intensityMul).not.toBeCloseTo(c.intensityMul, 2);
        expect(hashPracticalPhaseOffsets('p1_votive_first'))
            .not.toEqual(hashPracticalPhaseOffsets('p2_votive_right'));
    });

    it('candle breath uses layered slow + tremor frequencies per practical', () => {
        const slow = breathSlowFreqForPractical('p1_votive_first');
        const tremor = breathTremorFreqForPractical('p1_votive_first');
        expect(slow).toBeGreaterThanOrEqual(0.9);
        expect(slow).toBeLessThanOrEqual(1.4);
        expect(tremor).toBeGreaterThanOrEqual(6);
        expect(tremor).toBeLessThanOrEqual(8);
        const breath = sampleCandleBreath('p1_votive_first', 42);
        expect(breath.intensityMul).toBeGreaterThan(0.94);
        expect(breath.intensityMul).toBeLessThan(1.06);
        expect(breath.glowOpacityMul).toBeGreaterThan(0.96);
        expect(breath.glowOpacityMul).toBeLessThan(1.04);
        expect(breath.haloOpacityMul).toBeGreaterThan(0.97);
        expect(breath.haloOpacityMul).toBeLessThan(1.03);
    });

    it('consecration haze arc stays zero before first ignition and tracks the room', () => {
        expect(sampleConsecrationHazeArc(35.3)).toBe(0);
        expect(sampleConsecrationHazeArc(36)).toBeGreaterThan(0);

        const hushMid = PRACTICAL_HUSH_START + PRACTICAL_HUSH_EDGE_SECONDS + 1;
        const preHush = sampleConsecrationHazeArc(300);
        const atHush = sampleConsecrationHazeArc(hushMid);
        expect(atHush).toBeLessThan(preHush * 0.75);
        expect(sampleConsecrationHushHazeMul(hushMid)).toBeCloseTo(CONSECRATION_HAZE_HUSH_MUL, 2);

        const climaxMid = PRACTICAL_CLIMAX_START + PRACTICAL_CLIMAX_ATTACK + 2;
        const preClimax = sampleConsecrationHazeArc(370);
        const atClimax = sampleConsecrationHazeArc(climaxMid);
        expect(atClimax).toBeGreaterThan(preClimax);

        const memoryMid = 511.75;
        const atMemory = sampleConsecrationHazeArc(memoryMid);
        const atClimaxAgain = sampleConsecrationHazeArc(climaxMid);
        expect(atMemory).toBeLessThan(atClimaxAgain);
        expect(atMemory).toBeGreaterThan(CONSECRATION_HAZE_MEMORY_FLOOR * 0.5);
    });

    it('authored guttering dips one practical at a time on schedule', () => {
        expect(PRACTICAL_GUTTER_EVENTS).toHaveLength(3);
        expect(PRACTICAL_GUTTER_EVENTS.map((event) => event.atSeconds)).toEqual([171, 262, 427]);

        const p2DipEnd = 171 + PRACTICAL_GUTTER_DIP_SECONDS;
        expect(sampleGutteringMul('p2_votive_right', 171)).toBeCloseTo(1, 2);
        expect(sampleGutteringMul('p2_votive_right', p2DipEnd)).toBeCloseTo(PRACTICAL_GUTTER_DIP, 2);
        expect(sampleGutteringMul('p1_votive_first', p2DipEnd)).toBe(1);

        const p7WaverMid = 262 + PRACTICAL_GUTTER_DIP_SECONDS + PRACTICAL_GUTTER_WAVER_SECONDS * 0.5;
        expect(sampleGutteringMul('p7_lantern_rear', p7WaverMid)).toBeGreaterThan(0.52);
        expect(sampleGutteringMul('p7_lantern_rear', p7WaverMid)).toBeLessThan(0.68);

        const p3RecoverEnd = 427 + PRACTICAL_GUTTER_DIP_SECONDS
            + PRACTICAL_GUTTER_WAVER_SECONDS + PRACTICAL_GUTTER_RECOVER_SECONDS;
        expect(sampleGutteringMul('p3_sconce_left', p3RecoverEnd)).toBeCloseTo(1, 2);
        expect(sampleGutteringMul('p3_sconce_left', 427 + PRACTICAL_GUTTER_DIP_SECONDS))
            .toBeCloseTo(PRACTICAL_GUTTER_DIP, 2);
    });

    it('guttering couples into candle breath intensity only for the targeted practical', () => {
        const dipAt = 171 + PRACTICAL_GUTTER_DIP_SECONDS;
        const p2Breath = sampleCandleBreath('p2_votive_right', dipAt);
        const p1Breath = sampleCandleBreath('p1_votive_first', dipAt);
        expect(p2Breath.intensityMul).toBeLessThan(0.65);
        expect(p1Breath.intensityMul).toBeGreaterThan(0.94);
    });

    it('pre-grid lighting stays true black until 35.4', () => {
        const score = SONOITE_CHAMBER_FILM_TIMELINE.lighting.score;
        const preGrid = score.filter((step) => step.atSeconds < 35.4);
        expect(preGrid.length).toBe(1);
        expect(preGrid[0].atSeconds).toBe(0);
        expect(preGrid[0].keyWeight).toBe(0.05);
        expect(score.find((step) => step.atSeconds === 35.4)?.keyWeight).toBe(0.12);
    });

    it('HUSH lighting uses deep key/rim at 316.65', () => {
        const score = SONOITE_CHAMBER_FILM_TIMELINE.lighting.score;
        const hush = score.find((step) => step.atSeconds === 316.65);
        expect(hush?.keyWeight).toBe(0.16);
        expect(hush?.rimWeight).toBe(0.05);
    });

    it('camera score has exactly 18 zero-transition cuts', () => {
        const cuts = SONOITE_CHAMBER_FILM_TIMELINE.camera.score
            .filter((step) => step.atSeconds > 0 && step.transitionSeconds === 0);
        expect(cuts.length).toBe(18);
    });

    it('egg beat envelope reaches ≥0.95 only ~6s after 336 when attack is honored', () => {
        const beat = SONOITE_CHAMBER_FILM_TIMELINE.stage3.eventBeats
            .find((entry) => entry.id === 't1_hush_shift');
        expect(beat).toBeTruthy();
        const beforeAttack = samplePlateauEnvelopeForTest(
            341,
            beat.atSeconds,
            beat.durationSeconds,
            beat.attackSeconds,
            beat.releaseSeconds
        );
        const afterAttack = samplePlateauEnvelopeForTest(
            342,
            beat.atSeconds,
            beat.durationSeconds,
            beat.attackSeconds,
            beat.releaseSeconds
        );
        expect(beforeAttack).toBeLessThan(0.95);
        expect(afterAttack).toBeGreaterThanOrEqual(0.95);
    });

    it('t1_doors_open is typed flash, not room_open', () => {
        const detonation = SONOITE_CHAMBER_FILM_TIMELINE.stage3.eventBeats
            .find((entry) => entry.id === 't1_doors_open');
        expect(detonation?.type).toBe('flash');
    });

    it('vigil age shift is 0 at ignition and −350K at snap', () => {
        expect(samplePracticalAgeShiftK(p1.igniteAt, p1.igniteAt)).toBe(0);
        expect(samplePracticalAgeShiftK(PRACTICAL_SNAP_AT, p1.igniteAt))
            .toBe(-PRACTICAL_AGE_SHIFT_TOTAL_K);
        expect(samplePracticalAgeShiftK(p1.igniteAt - 1, p1.igniteAt)).toBe(0);
    });

    it('vigil age shift ramps linearly from igniteAt to snap', () => {
        const mid = (p1.igniteAt + PRACTICAL_SNAP_AT) / 2;
        expect(samplePracticalAgeShiftK(mid, p1.igniteAt))
            .toBeCloseTo(-PRACTICAL_AGE_SHIFT_TOTAL_K / 2, 6);
        const quarter = p1.igniteAt + (PRACTICAL_SNAP_AT - p1.igniteAt) * 0.25;
        expect(samplePracticalAgeShiftK(quarter, p1.igniteAt))
            .toBeCloseTo(-PRACTICAL_AGE_SHIFT_TOTAL_K * 0.25, 6);
    });

    it('vigil hush composition applies −400K on top of aged kelvin', () => {
        const hushMid = PRACTICAL_HUSH_START + PRACTICAL_HUSH_EDGE_SECONDS + 1;
        const ageShift = samplePracticalAgeShiftK(hushMid, p1.igniteAt);
        const agedKelvin = p1.kelvin + ageShift;
        const pair = resolvePracticalAuthoredHexPair(p1, hushMid, true);
        expect(pair.baseHex).toBe(authoredAmberHexForKelvin(agedKelvin));
        expect(pair.hushHex).toBe(authoredAmberHexForKelvin(agedKelvin - PRACTICAL_HUSH_KELVIN_DELTA));
        expect(sampleHushColorMix(hushMid)).toBe(1);
    });

    it('without vigil flag authored hex pair stays on precomputed roster colors', () => {
        const agedMid = 400;
        const pair = resolvePracticalAuthoredHexPair(p1, agedMid, false);
        expect(pair.baseHex).toBe(p1.color);
        expect(pair.hushHex).toBe(p1.hushColor);
    });

    it('vigil aged kelvin at 400s is warmer than at 60s for the first votive', () => {
        const early = resolvePracticalAuthoredHexPair(p1, 60, true).baseHex;
        const later = resolvePracticalAuthoredHexPair(p1, 400, true).baseHex;
        expect(early).not.toBe(later);
        const earlyShift = samplePracticalAgeShiftK(60, p1.igniteAt);
        const laterShift = samplePracticalAgeShiftK(400, p1.igniteAt);
        expect(laterShift).toBeLessThan(earlyShift);
    });
});
