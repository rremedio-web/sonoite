import {
    SODIUM_DEAD_HOURS_POCKETS,
    SODIUM_PHASE_BURN_END,
    SODIUM_PHASE_FADE_END,
    SODIUM_MUSIC_END,
    SODIUM_TERMINAL_START,
    SODIUM_TRACK_DURATION,
    SODIUM_FADE_LAST_SPUTTER_END,
    SODIUM_AFTER_BRIDGE_LEVEL,
    SODIUM_EMBER_OFF_INTENSITY,
    SODIUM_POCKET_RUN_LEVELS,
    SODIUM_FADE_LEVEL_KEYFRAMES,
    SODIUM_DARK_ADVANCE_FADE_KEYFRAMES,
    SODIUM_DARK_ADVANCE_AFTER,
    SODIUM_AFTER_CYCLES,
    SODIUM_STUTTER_EVENTS,
    SODIUM_CHROMA_DRIFTS,
    SODIUM_V3_DECAY_SECONDS,
    SODIUM_V3_TUBE_LAG_SECONDS,
    SODIUM_V3_WARMUP_READ_SECONDS,
    SODIUM_V3_GRAIN_BLACKOUT_MAX,
    sampleSodiumState,
    sampleSodiumColor,
    sampleSodiumHazeArc,
    sampleSodiumFogScrimOpacities,
    SODIUM_FOG_SCRIM_BASE_OPACITIES,
    SODIUM_FOG_SCRIM_Z,
    SODIUM_FOG_SCRIM_BREATH_ID,
    sampleSodiumEmberIntensity,
    sampleSodiumTubeVisual,
    sampleSodiumTubeIgnitionTravel,
    sampleSodiumWarmupEnvelope,
    sampleSodiumLightLevel,
    sampleConeWedgeWeights,
    sampleDarkAdvance,
    sampleSodiumKelvin,
    sampleRetinalScarOpacity,
    isSodiumAtmosphereBlackout,
    sampleIrisExposureOvershoot,
    SODIUM_TUBE_EMISSIVE_BASE,
    SODIUM_TUBE_EMISSIVE_GAIN,
    SODIUM_PRESENCE_ALBEDO,
    SODIUM_PRESENCE_ROUGHNESS,
    SODIUM_IRIS_OVERSHOOT_SECONDS,
    SODIUM_IRIS_POCKET_PEAK,
    SODIUM_IRIS_AFTER_CYCLE_PEAKS,
    SODIUM_SCOTOPIC_AMBIENT_SCALE,
    sampleScotopicAmbientIntensity,
    POOL_OPACITY_SCALE,
    SPOT_OUTER_INTENSITY_WEIGHT,
    SPOT_OUTER_ANGLE,
    SPOT_TARGET_X_OFFSET,
    SPOT_INTENSITY_SCALE,
    SODIUM_DIFFUSE_WRAP,
    applySodiumDiffuseWrap
} from '../../src/js/prototype/chamber-sodium.js';
import { sampleCandleBreath } from '../../src/js/prototype/chamber-practicals.js';
import { HORAS_MORTAS_CHAMBER_FILM_TIMELINE, sampleHorasMortasDarkAdaptation } from '../../src/js/prototype/films/horas-mortas.js';

describe('chamber sodium — pure schedule', () => {
    it('exports nine DEAD HOURS silence pockets baked from phases.json', () => {
        expect(SODIUM_DEAD_HOURS_POCKETS).toHaveLength(9);
        expect(SODIUM_DEAD_HOURS_POCKETS[0]).toEqual({ start: 0, end: 9.8 });
        expect(SODIUM_DEAD_HOURS_POCKETS[8]).toEqual({ start: 99.45, end: 103.1 });
    });

    it('exports per-pocket completion run levels (v2 §C3)', () => {
        expect(SODIUM_POCKET_RUN_LEVELS).toEqual([
            1.00, 0.99, 0.985, 0.975, 0.97, 0.96, 0.955, 0.945, 0.94
        ]);
        const afterPocket8 = sampleSodiumState(110);
        expect(afterPocket8.mode).toBe('run');
        expect(afterPocket8.level).toBeCloseTo(0.94, 2);
    });

    it('drops toward off during a silence pocket (64s inside 62.2–66.15 pocket)', () => {
        const state = sampleSodiumState(64);
        expect(state.level).toBeLessThan(0.2);
        expect(['off', 'pilot']).toContain(state.mode);
    });

    it('restrikes after pocket close with warmup ramp (70s after 66.15 pocket)', () => {
        const duringDark = sampleSodiumState(66.5);
        expect(duringDark.mode).toBe('off');
        expect(duringDark.level).toBe(0);

        const duringWarmup = sampleSodiumState(68.5);
        expect(['restrike', 'warmup']).toContain(duringWarmup.mode);
        expect(duringWarmup.level).toBeGreaterThan(0.2);
    });

    it('reaches stable BURN run near the first peak (280s)', () => {
        const state = sampleSodiumState(280);
        expect(state.mode).toBe('run');
        expect(state.level).toBeGreaterThan(0.8);
        expect(state.colorT).toBeGreaterThan(0.85);
    });

    it('applies onset-cluster stutter during BURN (275.75 cluster)', () => {
        const beforeStutter = sampleSodiumState(275.74);
        const duringStutter = sampleSodiumState(275.86);
        expect(duringStutter.level).toBeLessThan(beforeStutter.level);
        expect(duringStutter.level).toBeGreaterThan(0.4);
        expect(SODIUM_STUTTER_EVENTS).toHaveLength(3);
    });

    it('AFTER keeps the fixture alive when music is gone (365s)', () => {
        expect(365).toBeGreaterThan(SODIUM_MUSIC_END);
        const state = sampleSodiumState(365);
        expect(state.level).toBeGreaterThan(0.15);
        expect(['run', 'warmup', 'sputter', 'restrike']).toContain(state.mode);
    });

    it('TERMINAL dies to black after the song (388s)', () => {
        expect(388).toBeGreaterThan(SODIUM_TERMINAL_START);
        const state = sampleSodiumState(388);
        expect(state.mode).toBe('off');
        expect(state.level).toBe(0);
    });

    it('haze arc is zero when fixture is off', () => {
        expect(sampleSodiumHazeArc(66.5)).toBe(0);
        expect(sampleSodiumHazeArc(388)).toBe(0);
    });

    it('haze arc follows fixture level during BURN', () => {
        const haze = sampleSodiumHazeArc(280);
        expect(haze).toBeGreaterThan(0.6);
    });

    it('fog scrim stack gates to zero on atmosphere blackout', () => {
        expect(isSodiumAtmosphereBlackout(66.5)).toBe(true);
        expect(sampleSodiumFogScrimOpacities(66.5)).toEqual([0, 0, 0, 0]);
        expect(sampleSodiumFogScrimOpacities(66.5, 1.12)).toEqual([0, 0, 0, 0]);
    });

    it('fog scrim opacities scale with haze arc and breath at 34s (DEAD wide)', () => {
        expect(SODIUM_FOG_SCRIM_Z).toEqual([4.5, 1.5, -2.5, -6.0]);
        const breath = sampleCandleBreath(SODIUM_FOG_SCRIM_BREATH_ID, 34).poolOpacityMul;
        const opacities = sampleSodiumFogScrimOpacities(34, breath);
        const hazeArc = sampleSodiumHazeArc(34);
        expect(hazeArc).toBeGreaterThan(0.2);
        opacities.forEach((opacity, index) => {
            /* eslint-disable-next-line security/detect-object-injection -- fixed scrim roster */
            expect(opacity).toBeCloseTo(SODIUM_FOG_SCRIM_BASE_OPACITIES[index] * hazeArc * breath, 4);
            /* eslint-enable security/detect-object-injection */
        });
        expect(opacities[1]).toBeGreaterThan(opacities[0]);
        expect(opacities[0]).toBeGreaterThan(0);
    });

    it('sodium color ramp avoids white-hot core', () => {
        const run = sampleSodiumColor(1, 'run');
        expect(run.toLowerCase()).toBe('#ff9a2a');
        const restrike = sampleSodiumColor(0, 'restrike');
        expect(restrike.toLowerCase()).toBe('#ff9db0');
        const dying = sampleSodiumColor(0, 'run');
        expect(dying.toLowerCase()).toBe('#ff8a3c');
    });

    it('track duration matches analysis truth', () => {
        expect(SODIUM_TRACK_DURATION).toBeCloseTo(391.18, 2);
        expect(SODIUM_PHASE_BURN_END).toBe(318.35);
        expect(SODIUM_PHASE_FADE_END).toBe(338.05);
        expect(SODIUM_TERMINAL_START).toBe(386);
    });
});

describe('chamber sodium — darkAdvance (v2 §A)', () => {
    it('starts at full reach and arrives at 0.96 by WAKING', () => {
        expect(sampleDarkAdvance(20)).toBeGreaterThan(0.98);
        expect(sampleDarkAdvance(119.25)).toBeCloseTo(0.96, 2);
    });

    it('rallies to 1.06 through BURN (false recovery)', () => {
        expect(sampleDarkAdvance(238.15)).toBeCloseTo(0.96, 2);
        expect(sampleDarkAdvance(300)).toBeGreaterThan(1.0);
        expect(sampleDarkAdvance(318.34)).toBeCloseTo(1.06, 2);
    });

    it('FADE envelope includes Luna rallies at 330 and 334.5', () => {
        expect(sampleDarkAdvance(330)).toBeCloseTo(1.02, 2);
        expect(sampleDarkAdvance(334.5)).toBeCloseTo(0.99, 2);
        expect(sampleDarkAdvance(338.05)).toBeCloseTo(0.84, 2);
    });

    it('AFTER cycles map to 0.78 / 0.66 / 0.55', () => {
        expect(SODIUM_DARK_ADVANCE_AFTER).toEqual([0.78, 0.66, 0.55]);
        expect(sampleDarkAdvance(345)).toBeCloseTo(0.78, 2);
        expect(sampleDarkAdvance(365)).toBeCloseTo(0.66, 2);
        expect(sampleDarkAdvance(378)).toBeCloseTo(0.55, 2);
    });

    it('TERMINAL reach is zero', () => {
        expect(sampleDarkAdvance(386)).toBe(0);
        expect(sampleDarkAdvance(390)).toBe(0);
    });
});

describe('chamber sodium — FADE two-rally envelope (v2 §C2)', () => {
    it('FADE level keyframes end at AFTER bridge 0.72', () => {
        expect(SODIUM_FADE_LEVEL_KEYFRAMES.at(-1)).toEqual({ at: 338.05, value: 0.72 });
        expect(SODIUM_DARK_ADVANCE_FADE_KEYFRAMES.at(-1)).toEqual({ at: 338.05, value: 0.84 });
    });

    it('ramps monotonically from last FADE sputter into AFTER bridge', () => {
        let prevLevel = sampleSodiumState(SODIUM_FADE_LAST_SPUTTER_END).level;
        for (let elapsed = SODIUM_FADE_LAST_SPUTTER_END + 0.05; elapsed <= SODIUM_MUSIC_END; elapsed += 0.05) {
            const level = sampleSodiumState(elapsed).level;
            expect(level).toBeGreaterThanOrEqual(prevLevel - 0.001);
            prevLevel = level;
        }
        expect(sampleSodiumState(SODIUM_MUSIC_END).level).toBeCloseTo(SODIUM_AFTER_BRIDGE_LEVEL, 2);
    });

    it('does not flicker run→off→run across the 337–339s boundary except authored sputter', () => {
        const modes = [];
        for (let elapsed = 337; elapsed <= 339; elapsed += 0.05) {
            modes.push(sampleSodiumState(elapsed).mode);
        }
        let offAfterRun = false;
        for (let index = 1; index < modes.length; index += 1) {
            /* eslint-disable security/detect-object-injection -- fixed probe window */
            if (modes[index - 1] === 'run' && modes[index] === 'off') {
                offAfterRun = true;
            }
            if (offAfterRun && modes[index] === 'run') {
                throw new Error(`run→off→run flicker near ${337 + index * 0.05}s`);
            }
            /* eslint-enable security/detect-object-injection */
        }
        expect(modes.every((mode) => ['run', 'sputter', 'warmup'].includes(mode))).toBe(true);
    });

    it('micro-pocket probes at 334.1 and 335.45 stay in FADE ownership (no AFTER cycle)', () => {
        expect(334.1).toBeLessThan(SODIUM_MUSIC_END);
        expect(335.45).toBeLessThan(SODIUM_MUSIC_END);
        expect(sampleSodiumState(334.1).mode).toBe('sputter');
        expect(sampleSodiumState(335.45).mode).toBe('sputter');
        expect(sampleSodiumState(338.05).mode).toBe('run');
    });

    it('FADE last sputter handoff starts at 336.55', () => {
        expect(SODIUM_FADE_LAST_SPUTTER_END).toBe(336.55);
    });
});

describe('chamber sodium — AFTER retimes (v2 §C1)', () => {
    it('uses Luna AFTER cycle drops at 341.80 / 358.50 / 374.05', () => {
        expect(SODIUM_AFTER_CYCLES.map((cycle) => cycle.dropAt)).toEqual([341.80, 358.50, 374.05]);
        expect(SODIUM_AFTER_CYCLES[0].runLevel).toBeCloseTo(0.82, 2);
        expect(SODIUM_AFTER_CYCLES[1].runLevel).toBeCloseTo(0.58, 2);
        expect(SODIUM_AFTER_CYCLES[2].runLevel).toBeCloseTo(0.42, 2);
    });

    it('run-until times match spec', () => {
        expect(SODIUM_AFTER_CYCLES.map((cycle) => cycle.runUntil)).toEqual([354.5, 371.4, 381.7]);
    });
});

describe('chamber sodium — chroma drifts (v2 §C5)', () => {
    it('bakes four WAKING/BURN shifts from chroma.json', () => {
        expect(SODIUM_CHROMA_DRIFTS).toHaveLength(4);
        expect(SODIUM_CHROMA_DRIFTS.map((drift) => drift.at)).toEqual([156, 190, 257, 268]);
    });

    it('kelvin drifts subtly during authored windows', () => {
        const base = sampleSodiumKelvin(150);
        const warmed = sampleSodiumKelvin(160);
        expect(warmed).toBeGreaterThan(base);
        expect(warmed - base).toBeLessThan(90);
    });
});

describe('chamber sodium — experiential layer (v2 §F)', () => {
    it('retinal scar holds after TERMINAL failure then extinguishes', () => {
        expect(sampleRetinalScarOpacity(386.7)).toBe(0);
        expect(sampleRetinalScarOpacity(387)).toBeGreaterThan(0.04);
        expect(sampleRetinalScarOpacity(388.4)).toBe(0);
    });
});

describe('chamber sodium — ember (item 13)', () => {
    it('keeps electrode ember during OFF pockets while atmosphere blackouts', () => {
        expect(sampleSodiumState(66.5).mode).toBe('off');
        expect(sampleSodiumState(66.5).level).toBe(0);
        expect(isSodiumAtmosphereBlackout(66.5)).toBe(true);
        expect(sampleSodiumEmberIntensity(66.5)).toBeCloseTo(SODIUM_EMBER_OFF_INTENSITY, 2);
    });

    it('scales tube emissive with level when lit', () => {
        const ember = sampleSodiumEmberIntensity(280);
        const state = sampleSodiumState(280);
        expect(ember).toBeCloseTo(SODIUM_TUBE_EMISSIVE_BASE + state.level * SODIUM_TUBE_EMISSIVE_GAIN, 2);
    });

    it('fades ember to true black over ~3s after TERMINAL restrike failure', () => {
        const deathEnd = SODIUM_TERMINAL_START + 1.4 + 0.6;
        expect(sampleSodiumEmberIntensity(deathEnd + 0.1)).toBeGreaterThan(0.2);
        expect(sampleSodiumEmberIntensity(deathEnd + 3.0)).toBe(0);
        expect(sampleSodiumEmberIntensity(SODIUM_TRACK_DURATION)).toBe(0);
    });
});

describe('chamber sodium — v3 electrical death + blackout purity', () => {
    it('exports v3 envelope constants without moving schedule timing', () => {
        expect(SODIUM_V3_DECAY_SECONDS).toBe(0.7);
        expect(SODIUM_V3_TUBE_LAG_SECONDS).toBe(0.5);
        expect(SODIUM_V3_WARMUP_READ_SECONDS).toBeCloseTo(3.2, 2);
        expect(SODIUM_V3_GRAIN_BLACKOUT_MAX).toBeLessThanOrEqual(0.015);
    });

    it('blackout purity: mid-pocket light level is zero while ember persists (66.5s)', () => {
        expect(sampleSodiumLightLevel(66.5)).toBe(0);
        expect(sampleSodiumState(66.5).mode).toBe('off');
        expect(sampleSodiumEmberIntensity(66.5)).toBeGreaterThan(0);
        expect(sampleSodiumTubeVisual(66.5).intensity).toBeGreaterThan(0);
    });

    it('decay envelope dims over ~0.7s instead of snapping off (pocket 6)', () => {
        const dropAt = 62.2 + 0.35;
        const earlyDecay = sampleSodiumState(dropAt + 0.15);
        const midDecay = sampleSodiumState(dropAt + 0.35);
        const dark = sampleSodiumState(dropAt + 0.85);
        expect(earlyDecay.level).toBeGreaterThan(midDecay.level);
        expect(midDecay.level).toBeGreaterThan(0.05);
        expect(dark.mode).toBe('off');
        expect(dark.level).toBe(0);
    });

    it('tube afterglow lags the light during dropout (pocket 6)', () => {
        const dropAt = 62.2 + 0.35;
        const duringDecay = sampleSodiumTubeVisual(dropAt + 0.55);
        const afterLightOff = sampleSodiumTubeVisual(dropAt + 0.95);
        expect(duringDecay.intensity).toBeGreaterThan(0.08);
        expect(afterLightOff.intensity).toBeGreaterThan(0);
        expect(afterLightOff.colorHex.toLowerCase()).not.toBe('#000000');
    });

    it('warmup envelope reads pink over ~3.2s inside authored pocket windows', () => {
        const early = sampleSodiumWarmupEnvelope(0.6, 3.4);
        const mid = sampleSodiumWarmupEnvelope(2.0, 3.4);
        const late = sampleSodiumWarmupEnvelope(3.35, 3.4);
        expect(mid).toBeGreaterThan(early);
        expect(late).toBeCloseTo(1, 1);
        const warmupState = sampleSodiumState(68.5);
        expect(['restrike', 'warmup']).toContain(warmupState.mode);
        expect(warmupState.level).toBeGreaterThan(0.2);
    });

    it('tube ignition travel progresses during pocket restrike warmup', () => {
        expect(sampleSodiumTubeIgnitionTravel(68.2)).toBeLessThan(1);
        expect(sampleSodiumTubeIgnitionTravel(68.2)).toBeGreaterThan(0);
        expect(sampleSodiumTubeIgnitionTravel(72)).toBe(1);
    });

    it('cone wedge weights use smooth azimuth falloff without top-2 pop (v5)', () => {
        const weights = sampleConeWedgeWeights(0);
        expect(weights).toHaveLength(12);
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        expect(min).toBeGreaterThanOrEqual(0.22);
        expect(max).toBeLessThanOrEqual(1);
        expect(max - min).toBeLessThanOrEqual(0.78);
    });

    it('exports v5 light constants (pool demotion, outer spot weights, intensity rebalance)', () => {
        expect(POOL_OPACITY_SCALE).toBeCloseTo(0.30, 2);
        expect(SPOT_OUTER_INTENSITY_WEIGHT).toBeCloseTo(0.55, 2);
        expect(SPOT_OUTER_ANGLE).toBeCloseTo(0.46, 2);
        expect(SPOT_TARGET_X_OFFSET).toBeCloseTo(0.55, 2);
        expect(SPOT_INTENSITY_SCALE).toBeCloseTo(2.9 * (3 / 2.1), 2);
        expect(SODIUM_DIFFUSE_WRAP).toBeCloseTo(0.35, 2);
    });

    it('applySodiumDiffuseWrap chains onBeforeCompile and bumps customProgramCacheKey', () => {
        const material = {
            uuid: 'test-material',
            userData: {},
            needsUpdate: false,
            onBeforeCompile: null,
            customProgramCacheKey: () => 'base-key'
        };
        applySodiumDiffuseWrap(material);
        expect(material.userData.sodiumDiffuseWrapApplied).toBe(true);
        expect(material.customProgramCacheKey()).toBe('base-key-sodiumwrap-v1');
        const shader = {
            uniforms: {},
            fragmentShader: 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );'
        };
        material.onBeforeCompile(shader);
        expect(shader.uniforms.uSodiumWrap.value).toBeCloseTo(0.35, 2);
        expect(shader.fragmentShader).toContain('uSodiumWrap');
        expect(shader.fragmentShader).not.toContain('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );');
    });
});

describe('horas mortas film — camera score', () => {
    const score = HORAS_MORTAS_CHAMBER_FILM_TIMELINE.camera.score;

    function sampleHoldCameraPosition(elapsed) {
        if (elapsed <= score[0].atSeconds) {
            return score[0].position;
        }
        const lastBeat = score[score.length - 1];
        let position = lastBeat.position;
        for (let index = 0; index < score.length - 1; index += 1) {
            /* eslint-disable-next-line security/detect-object-injection -- fixed camera score */
            const currentBeat = score[index];
            const nextBeat = score[index + 1];
            const transitionSeconds = nextBeat.transitionSeconds ?? 6;
            const transitionStart = Math.max(currentBeat.atSeconds, nextBeat.atSeconds - transitionSeconds);
            if (elapsed >= currentBeat.atSeconds && elapsed < transitionStart) {
                position = currentBeat.position;
                break;
            }
            if (elapsed >= transitionStart && elapsed < nextBeat.atSeconds) {
                const mixT = (elapsed - transitionStart) / Math.max(nextBeat.atSeconds - transitionStart, 0.001);
                position = currentBeat.position.map((value, axis) =>
                    /* eslint-disable-next-line security/detect-object-injection -- fixed 3-axis lerp */
                    value + (nextBeat.position[axis] - value) * mixT
                );
                break;
            }
        }
        return position;
    }

    it('defines seven authored setups (eight score beats — push end anchor included)', () => {
        expect(score).toHaveLength(8);
        const setupTimes = score.map((beat) => beat.atSeconds);
        expect(setupTimes).toEqual([0, 119.25, 187, 238.15, 317.60, 319.10, 338.05, 386]);
    });

    it('keeps driftScale 0 on every setup', () => {
        score.forEach((beat) => {
            expect(beat.driftScale).toBe(0);
        });
    });

    it('runs one 79.45s slow push during BURN ending at 317.60 with FADE cut at 319.10', () => {
        const pushEnd = score.find((beat) => beat.atSeconds === 317.60 && beat.transitionSeconds === 79.45);
        expect(pushEnd).toBeDefined();
        expect(pushEnd.position).toEqual([-2.2, 2.52, 6.6]);
        const pushStart = score.find((beat) => beat.atSeconds === 238.15);
        expect(pushStart.transitionSeconds ?? 0).toBe(0);
        expect(317.60 - 79.45).toBeCloseTo(238.15, 5);
        const fadeCut = score.find((beat) => beat.atSeconds === 319.10 && beat.transitionSeconds === 0);
        expect(fadeCut).toBeDefined();
        expect(319.10 - 317.60).toBeCloseTo(1.5, 5);
    });

    it('FADE setup squeeze starts at 322.5 and lands fov 36 at 338.0 (v3 §V3-4)', () => {
        const fadeSetup = score.find((beat) => beat.fovRamp);
        expect(fadeSetup.fovRamp.startAtSeconds).toBe(322.5);
        expect(fadeSetup.fovRamp.from).toBe(44);
        expect(fadeSetup.fovRamp.to).toBe(36);
        expect(fadeSetup.fovRamp.durationSeconds).toBe(15.5);
        expect(fadeSetup.fovRamp.startAtSeconds + fadeSetup.fovRamp.durationSeconds).toBeCloseTo(338.0, 5);
    });

    it('holds TERMINAL on the same AFTER wide frame at 386', () => {
        const afterWide = score.find((beat) => beat.atSeconds === 338.05);
        const terminal = score.find((beat) => beat.atSeconds === 386);
        expect(terminal.position).toEqual(afterWide.position);
        expect(terminal.target).toEqual(afterWide.target);
    });

    it('phase windows cover the full track through TERMINAL 386', () => {
        const windows = HORAS_MORTAS_CHAMBER_FILM_TIMELINE.phaseWindows;
        expect(windows[0].name).toBe('DEAD_HOURS');
        expect(windows.at(-1).name).toBe('TERMINAL');
        expect(windows.find((window) => window.name === 'AFTER').end).toBe(386);
        expect(windows.at(-1).end).toBeCloseTo(391.18, 2);
    });

    it('camera position variance is zero over 5s hold windows (item 4)', () => {
        const holdWindows = [
            { start: 20, end: 25 },
            { start: 340, end: 345 },
            { start: 387, end: 390 }
        ];
        holdWindows.forEach(({ start, end }) => {
            const samples = [];
            for (let elapsed = start; elapsed <= end; elapsed += 0.25) {
                samples.push(sampleHoldCameraPosition(elapsed));
            }
            ['x', 'y', 'z'].forEach((axis, axisIndex) => {
                /* eslint-disable-next-line security/detect-object-injection -- fixed axis probe */
                const axisValues = samples.map((position) => position[axisIndex]);
                const spread = Math.max(...axisValues) - Math.min(...axisValues);
                expect(spread).toBeLessThan(0.0001);
            });
        });
    });

    it('BURN push window allows camera motion (excluded from hold stillness)', () => {
        const pushStart = sampleHoldCameraPosition(238.2);
        const pushMid = sampleHoldCameraPosition(278);
        const pushEnd = sampleHoldCameraPosition(318.3);
        const delta = (a, b) => Math.sqrt(
            (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
        );
        expect(delta(pushStart, pushMid)).toBeGreaterThan(0.05);
        expect(delta(pushMid, pushEnd)).toBeGreaterThan(0.05);
    });
});

describe('chamber sodium — THE INSOMNIAC EYE (v4)', () => {
    it('exports presence material constants for photographable rim', () => {
        expect(SODIUM_PRESENCE_ALBEDO).toBe(0x0c0804);
        expect(SODIUM_PRESENCE_ROUGHNESS).toBe(0.86);
    });

    it('darkAdaptation toe-lift peaks in WAKING then clenches at BURN', () => {
        expect(sampleHorasMortasDarkAdaptation(20)).toBe(0);
        expect(sampleHorasMortasDarkAdaptation(238.15)).toBeCloseTo(0.015, 3);
        expect(sampleHorasMortasDarkAdaptation(280)).toBe(0);
        expect(sampleHorasMortasDarkAdaptation(338.05)).toBeCloseTo(0.03, 3);
    });

    it('darkAdaptation AFTER cycles map to 0.05 / 0.08 / 0.11', () => {
        expect(sampleHorasMortasDarkAdaptation(342)).toBeCloseTo(0.05, 2);
        expect(sampleHorasMortasDarkAdaptation(359)).toBeCloseTo(0.08, 2);
        expect(sampleHorasMortasDarkAdaptation(375)).toBeCloseTo(0.11, 2);
        expect(sampleHorasMortasDarkAdaptation(386)).toBe(0);
    });

    it('scotopic ambient scales darkAdaptation and gates on sodium level', () => {
        expect(sampleScotopicAmbientIntensity(20, 0.6)).toBe(0);
        expect(sampleScotopicAmbientIntensity(238.15, 0.6)).toBeCloseTo(
            sampleHorasMortasDarkAdaptation(238.15) * SODIUM_SCOTOPIC_AMBIENT_SCALE,
            4
        );
        expect(sampleScotopicAmbientIntensity(375, 0.04)).toBe(0);
        expect(sampleScotopicAmbientIntensity(375, 0.5)).toBeCloseTo(
            sampleHorasMortasDarkAdaptation(375) * SODIUM_SCOTOPIC_AMBIENT_SCALE,
            3
        );
    });

    it('iris overshoot peaks +0.22 on pocket exit then eases over 4s', () => {
        const pocket6Exit = 66.15 + 1.7;
        expect(sampleIrisExposureOvershoot(pocket6Exit)).toBeCloseTo(SODIUM_IRIS_POCKET_PEAK, 2);
        expect(sampleIrisExposureOvershoot(pocket6Exit + 2)).toBeGreaterThan(0.05);
        expect(sampleIrisExposureOvershoot(pocket6Exit + SODIUM_IRIS_OVERSHOOT_SECONDS)).toBe(0);
    });

    it('iris overshoot weakens across AFTER cycles', () => {
        const cycle1Exit = 341.80 + 0.4 + 1.8;
        const cycle2Exit = 358.50 + 0.4 + 2.0;
        const cycle3Exit = 374.05 + 0.4 + 2.2;
        expect(sampleIrisExposureOvershoot(cycle1Exit)).toBeCloseTo(SODIUM_IRIS_AFTER_CYCLE_PEAKS[0], 2);
        expect(sampleIrisExposureOvershoot(cycle2Exit)).toBeCloseTo(SODIUM_IRIS_AFTER_CYCLE_PEAKS[1], 2);
        expect(sampleIrisExposureOvershoot(cycle3Exit)).toBeCloseTo(SODIUM_IRIS_AFTER_CYCLE_PEAKS[2], 2);
    });
});
