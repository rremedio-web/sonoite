import fs from 'fs';
import path from 'path';
import {
    createShotDirector,
    shouldTakeCamera,
    computeDollyZoomPose,
    applyMotionEase,
    computeEasedMotionProgress,
    computeEasedOrbitDeltaRadians,
    DOLLY_ZOOM_DISTANCE_RATIO,
    MAX_SHOT_ORBIT_RADIANS,
    MOTION_EASE_VALUES,
    resolveMotionEase
} from '../../src/js/prototype/shot-director.js';

function buildValidSetup(overrides = {}) {
    return {
        framing: 'WS',
        yaw: 0.4,
        pitch: 0.05,
        distance: 10,
        fov: 45,
        screenX: 0,
        screenY: 0,
        dollyPerBar: 0,
        orbitPerBar: 0,
        localMotion: 0,
        targetPoint: [1, 2, 0],
        ...overrides
    };
}

function buildSyntheticBeatGrid({ bars = 32, bpm = 120 } = {}) {
    const beats = [];
    const secondsPerBeat = 60 / bpm;
    const beatsPerBar = 4;
    let beatCounter = 0;
    for (let bar = 1; bar <= bars; bar += 1) {
        for (let beatInBar = 1; beatInBar <= beatsPerBar; beatInBar += 1) {
            beatCounter += 1;
            beats.push({
                beat: beatCounter,
                time: ((bar - 1) * beatsPerBar + (beatInBar - 1)) * secondsPerBeat,
                bar,
                beatInBar
            });
        }
    }
    return {
        bpm,
        totalBeats: beats.length,
        beats
    };
}

function buildVariableTempoBeatGrid() {
    return {
        bpm: 120,
        totalBeats: 12,
        beats: [
            { beat: 1, time: 0, bar: 1, beatInBar: 1 },
            { beat: 2, time: 0.5, bar: 1, beatInBar: 2 },
            { beat: 3, time: 1, bar: 1, beatInBar: 3 },
            { beat: 4, time: 1.5, bar: 1, beatInBar: 4 },
            { beat: 5, time: 2, bar: 2, beatInBar: 1 },
            { beat: 6, time: 2.5, bar: 2, beatInBar: 2 },
            { beat: 7, time: 3, bar: 2, beatInBar: 3 },
            { beat: 8, time: 3.5, bar: 2, beatInBar: 4 },
            { beat: 9, time: 4, bar: 3, beatInBar: 1 },
            { beat: 10, time: 5, bar: 3, beatInBar: 2 },
            { beat: 11, time: 6, bar: 3, beatInBar: 3 },
            { beat: 12, time: 7, bar: 3, beatInBar: 4 }
        ]
    };
}

function cameraDistanceFromTarget(resolved) {
    return Math.hypot(
        resolved.pose.position[0] - resolved.pose.target[0],
        resolved.pose.position[1] - resolved.pose.target[1],
        resolved.pose.position[2] - resolved.pose.target[2]
    );
}

function horizontalYawFromResolved(resolved) {
    const dx = resolved.pose.position[0] - resolved.pose.target[0];
    const dz = resolved.pose.position[2] - resolved.pose.target[2];
    return Math.atan2(dx, dz);
}

describe('shouldTakeCamera', () => {
    it('allows takeover only for shots=1 with director enabled and active director', () => {
        expect(shouldTakeCamera({ mode: '1', configEnabled: true, active: true })).toBe(true);
        expect(shouldTakeCamera({ mode: 'debug', configEnabled: true, active: true })).toBe(false);
        expect(shouldTakeCamera({ mode: '1', configEnabled: false, active: true })).toBe(false);
        expect(shouldTakeCamera({ mode: '1', configEnabled: true, active: false })).toBe(false);
        expect(shouldTakeCamera({ mode: null, configEnabled: true, active: true })).toBe(false);
    });

    it('matches flag-off parity: no query mode means no takeover', () => {
        expect(shouldTakeCamera({ mode: null, configEnabled: false, active: false })).toBe(false);
    });
});

describe('createShotDirector', () => {
    it('reports no setups authored when the setup map is empty', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 4, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {},
            cutTimeline: { 1: 'a' }
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors).toContain('no setups authored');
        expect(director.isActive()).toBe(false);
    });

    it('rejects bar 0 and malformed accent cuts', () => {
        const director = createShotDirector({
            setups: { a: buildValidSetup(), accent: buildValidSetup({ framing: 'ECU' }) },
            cutTimeline: { 1: 'a' },
            accentCuts: [{ startBeat: 4, endBeat: 4, setupId: 'missing' }],
            beatGrid: {
                bpm: 120,
                totalBeats: 4,
                beats: [
                    { beat: 1, time: 0, bar: 0, beatInBar: 1 },
                    { beat: 2, time: 0.5, bar: 0, beatInBar: 2 },
                    { beat: 3, time: 1, bar: 0, beatInBar: 3 },
                    { beat: 4, time: 1.5, bar: 0, beatInBar: 4 }
                ]
            },
            enabled: true
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.some((error) => error.includes('bar must be an integer >= 1'))).toBe(true);
        expect(validation.errors.some((error) => error.includes('accentCuts[0]'))).toBe(true);
    });

    it('rejects non-monotonic beat times and cut bars without downbeats', () => {
        const director = createShotDirector({
            setups: { a: buildValidSetup() },
            cutTimeline: { 2: 'a' },
            beatGrid: {
                bpm: 120,
                totalBeats: 2,
                beats: [
                    { beat: 1, time: 0, bar: 1, beatInBar: 1 },
                    { beat: 2, time: 0, bar: 1, beatInBar: 2 }
                ]
            },
            enabled: true
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors).toContain('beatGrid.beats times must be strictly increasing');
        expect(validation.errors.some((error) => error.includes('cutTimeline bar 2'))).toBe(true);
    });

    it('rejects unknown setup ids referenced by the cut timeline', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8 });
        const director = createShotDirector({
            setups: { a: buildValidSetup() },
            cutTimeline: { 1: 'missing' },
            beatGrid,
            enabled: true
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.some((error) => error.includes('unknown setupId "missing"'))).toBe(true);
    });

    it('activates with a valid synthetic 1-based grid and three setups', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                wide: buildValidSetup({ framing: 'WS', distance: 12, fov: 50 }),
                medium: buildValidSetup({ framing: 'MCU', distance: 8, fov: 42 }),
                tight: buildValidSetup({ framing: 'ECU', distance: 5, fov: 35 })
            },
            cutTimeline: {
                1: 'wide',
                9: 'medium',
                17: 'tight'
            }
        });

        expect(director.validate().ok).toBe(true);
        expect(director.isActive()).toBe(true);
    });

    it('snaps setupId discontinuously at cut boundaries', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                wide: buildValidSetup({ distance: 12 }),
                medium: buildValidSetup({ distance: 8 })
            },
            cutTimeline: {
                1: 'wide',
                9: 'medium'
            }
        });

        const barNineTime = 16;
        const out = {};
        const beforeCut = director.resolve(barNineTime - 0.001, out);
        const beforeCutSetupId = beforeCut.setupId;
        const beforeCutPosX = beforeCut.pose.position[0];
        director.resolve(barNineTime, out);
        const atCutSetupId = out.setupId;
        director.resolve(barNineTime + 0.001, out);
        const afterCutSetupId = out.setupId;

        expect(beforeCutSetupId).toBe('wide');
        expect(atCutSetupId).toBe('medium');
        expect(afterCutSetupId).toBe('medium');
        expect(beforeCutPosX).not.toBeCloseTo(out.pose.position[0], 4);
    });

    it('returns the same output object identity on every resolve', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: { a: buildValidSetup({ dollyPerBar: 0.2, orbitPerBar: 0.01 }) },
            cutTimeline: { 1: 'a' }
        });

        const reusable = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [0, 0, 0], fov: 45 }
        };
        const first = director.resolve(5.5, reusable);
        const second = director.resolve(5.5, reusable);
        expect(first).toBe(second);
        expect(first).toBe(reusable);
    });

    it('reproduces identical poses after backward seek', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: { a: buildValidSetup({ dollyPerBar: 0.15, orbitPerBar: 0.02 }) },
            cutTimeline: { 1: 'a' }
        });

        const forward = director.resolve(9.25);
        director.resolve(20);
        const backward = director.resolve(9.25);
        expect(backward.pose.position).toEqual(forward.pose.position);
        expect(backward.pose.target).toEqual(forward.pose.target);
    });

    it('handles times before the first downbeat and after the last beat without crashing', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 4, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: { a: buildValidSetup() },
            cutTimeline: { 1: 'a' }
        });

        const before = director.resolve(-4);
        const beforeBarIndex = before.barIndex;
        director.resolve(999);
        expect(before).not.toBeNull();
        expect(director.resolve(999)).not.toBeNull();
        expect(beforeBarIndex).toBe(0);
    });

    it('derives motion from actual downbeat spacing and reaches authored endpoint at shot end', () => {
        const beatGrid = buildVariableTempoBeatGrid();
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                a: buildValidSetup({ distance: 10, dollyPerBar: 1, orbitPerBar: 0 }),
                b: buildValidSetup({ distance: 10, dollyPerBar: 1, orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'a', 3: 'b' }
        });

        const atTwoSecondsDist = cameraDistanceFromTarget(director.resolve(2));
        const midShotDist = cameraDistanceFromTarget(director.resolve(3.5));
        const shotEndDist = cameraDistanceFromTarget(director.resolve(4 - 0.001));

        expect(atTwoSecondsDist).toBeCloseTo(11, 5);
        expect(midShotDist).toBeCloseTo(11.75, 5);
        expect(shotEndDist).toBeCloseTo(12, 3);

        const clampedLate = director.resolve(10);
        expect(clampedLate.setupId).toBe('b');
        expect(cameraDistanceFromTarget(clampedLate)).toBeCloseTo(11, 5);
    });

    it('applies accent cuts over base timeline and reverts after endBeat', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                base: buildValidSetup({ distance: 10 }),
                accent: buildValidSetup({ distance: 4, framing: 'ECU' })
            },
            cutTimeline: { 1: 'base' },
            accentCuts: [{ startBeat: 5, endBeat: 9, setupId: 'accent' }]
        });

        expect(director.resolve(2).setupId).toBe('base');
        expect(director.resolve(2.01).setupId).toBe('accent');
        expect(director.resolve(3.5).setupId).toBe('accent');
        expect(director.resolve(4.01).setupId).toBe('base');
    });

    it('suppresses orbit and dolly under reduced motion while keeping setup snaps', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                a: buildValidSetup({ dollyPerBar: 2, orbitPerBar: 0.2, distance: 10 }),
                b: buildValidSetup({ dollyPerBar: 2, orbitPerBar: 0.2, distance: 6 })
            },
            cutTimeline: { 1: 'a', 5: 'b' }
        });

        const moving = director.resolve(9);
        const movingDistance = Math.hypot(
            moving.pose.position[0] - moving.pose.target[0],
            moving.pose.position[1] - moving.pose.target[1],
            moving.pose.position[2] - moving.pose.target[2]
        );
        const reduced = director.resolve(9, undefined, { reducedMotion: true });
        const settledDistance = Math.hypot(
            reduced.pose.position[0] - reduced.pose.target[0],
            reduced.pose.position[1] - reduced.pose.target[1],
            reduced.pose.position[2] - reduced.pose.target[2]
        );

        expect(reduced.setupId).toBe('b');
        expect(settledDistance).toBeCloseTo(6, 5);
        expect(movingDistance).not.toBeCloseTo(settledDistance, 3);
    });

    it('stays inactive when the caller flag is disabled even with valid data', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
        const director = createShotDirector({
            enabled: false,
            beatGrid,
            setups: { a: buildValidSetup() },
            cutTimeline: { 1: 'a' }
        });

        expect(director.isActive()).toBe(false);
        expect(director.resolve(1)).toBeNull();
    });

    it('validates the curated Track 05 beat grid artifact', () => {
        const beatsPath = path.join(
            process.cwd(),
            'public/assets/journeys/analysis/nao-querer-nada/beats.json'
        );
        const beatGrid = JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: { hold: buildValidSetup() },
            cutTimeline: { 1: 'hold' }
        });

        expect(director.validate().ok).toBe(true);
    });

    it('preserves subject scale through the dolly-zoom settled pose', () => {
        const baseDistance = 8;
        const baseFov = 55;
        const settled = computeDollyZoomPose(baseDistance, baseFov, 1);
        expect(settled.distance).toBeCloseTo(baseDistance * DOLLY_ZOOM_DISTANCE_RATIO, 6);
        const expectedFov = (2 * Math.atan(Math.tan((baseFov * (Math.PI / 180)) / 2) / DOLLY_ZOOM_DISTANCE_RATIO))
            * (180 / Math.PI);
        expect(settled.fov).toBeCloseTo(expectedFov, 6);
    });

    it('keeps dolly-zoom mid-effect continuity and reduced-motion settled output', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                zoom: buildValidSetup({
                    framing: 'ECU',
                    distance: 10,
                    fov: 55,
                    motion: { effect: 'dollyZoom', effectDurationSeconds: 2.2 }
                })
            },
            cutTimeline: { 1: 'zoom' }
        });

        const barOneTime = 0;
        const midTime = barOneTime + 1.1;
        const endTime = barOneTime + 2.2;
        const target = [1, 2, 0];
        const outStart = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [...target], fov: 45 }
        };
        const outMid = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [...target], fov: 45 }
        };
        const outEnd = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [...target], fov: 45 }
        };
        const outReduced = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [...target], fov: 45 }
        };

        const start = director.resolve(barOneTime, outStart);
        const mid = director.resolve(midTime, outMid);
        const end = director.resolve(endTime, outEnd);
        const reduced = director.resolve(endTime, outReduced, { reducedMotion: true });

        const dist = (pose, targetPoint) => Math.hypot(
            pose.position[0] - targetPoint[0],
            pose.position[1] - targetPoint[1],
            pose.position[2] - targetPoint[2]
        );

        const startDistance = dist(start.pose, target);
        const midDistance = dist(mid.pose, target);
        const endDistance = dist(end.pose, target);
        const settledDistance = dist(reduced.pose, target);

        expect(startDistance).toBeCloseTo(10, 4);
        expect(midDistance).toBeGreaterThan(startDistance * 0.72);
        expect(midDistance).toBeLessThan(startDistance - 0.001);
        expect(endDistance).toBeCloseTo(startDistance * DOLLY_ZOOM_DISTANCE_RATIO, 4);
        expect(settledDistance).toBeCloseTo(endDistance, 4);
        expect(end.pose.fov).toBeGreaterThan(start.pose.fov);
        expect(reduced.pose.fov).toBeCloseTo(end.pose.fov, 4);

        const reusable = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [0, 0, 0], fov: 45 }
        };
        const first = director.resolve(1.1, reusable);
        const second = director.resolve(1.1, reusable);
        expect(first).toBe(second);
        expect(first).toBe(reusable);
    });

    it('caps total orbit on long holds at MAX_SHOT_ORBIT_RADIANS', () => {
        const orbitPerBar = 0.148446;
        const shotBars = 37;
        const beatGrid = buildSyntheticBeatGrid({ bars: 45, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({
                    yaw: 0.2,
                    pitch: 0,
                    distance: 12,
                    orbitPerBar,
                    targetPoint: [0, 0, 0]
                }),
                next: buildValidSetup({ yaw: 0.2, pitch: 0, distance: 12, orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + shotBars]: 'next' }
        });

        const shotStartTime = 0;
        const nextCutBar = 1 + shotBars;
        const shotEndTime = ((nextCutBar - 1) * 4) * (60 / 120);
        const startYaw = horizontalYawFromResolved(director.resolve(shotStartTime));
        const endYaw = horizontalYawFromResolved(director.resolve(shotEndTime - 0.001));
        const totalOrbit = Math.abs(endYaw - startYaw);

        expect(totalOrbit).toBeLessThanOrEqual(MAX_SHOT_ORBIT_RADIANS + 1e-6);
        expect(orbitPerBar * shotBars).toBeGreaterThan(MAX_SHOT_ORBIT_RADIANS);
    });

    it('keeps short-shot orbit linear when authored total stays under the cap', () => {
        const orbitPerBar = 0.12;
        const shotBars = 3;
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                a: buildValidSetup({
                    yaw: 0.25,
                    pitch: 0,
                    distance: 10,
                    orbitPerBar,
                    targetPoint: [0, 0, 0]
                }),
                b: buildValidSetup({ yaw: 0.25, pitch: 0, distance: 10, orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'a', [1 + shotBars]: 'b' }
        });

        const midTime = 1.5 * 4 * (60 / 120);
        const startYaw = horizontalYawFromResolved(director.resolve(0));
        const midYaw = horizontalYawFromResolved(director.resolve(midTime));
        const expectedMidOrbit = orbitPerBar * 1.5;

        expect(Math.abs(midYaw - startYaw)).toBeCloseTo(expectedMidOrbit, 5);
        expect(orbitPerBar * shotBars).toBeLessThan(MAX_SHOT_ORBIT_RADIANS);
    });

    const FLOWER_HEAD_TARGET = [0.959854, 5.612414, -0.038787];
    const HEIGHT_Y_BY_CLASS = { low: 0, eye: 2.2, high: 7 };

    function buildHeightMappingDirector(setupOverrides, directorOverrides = {}) {
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        return createShotDirector({
            enabled: true,
            beatGrid,
            heightYByClass: HEIGHT_Y_BY_CLASS,
            setups: { mapped: buildValidSetup(setupOverrides) },
            cutTimeline: { 1: 'mapped' },
            ...directorOverrides
        });
    }

    it('leaves resolve poses unchanged when heightYByClass is not provided', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
        const config = {
            enabled: true,
            beatGrid,
            setups: { a: buildValidSetup({ dollyPerBar: 0.15, orbitPerBar: 0.02 }) },
            cutTimeline: { 1: 'a' }
        };
        const baseline = createShotDirector(config);
        const withExplicitUndefined = createShotDirector({ ...config, heightYByClass: undefined });

        const time = 9.25;
        const baselinePose = {
            position: [...baseline.resolve(time).pose.position],
            target: [...baseline.resolve(time).pose.target],
            fov: baseline.resolve(time).pose.fov
        };
        const explicitPose = withExplicitUndefined.resolve(time).pose;

        expect(explicitPose.position).toEqual(baselinePose.position);
        expect(explicitPose.target).toEqual(baselinePose.target);
        expect(explicitPose.fov).toBe(baselinePose.fov);
    });

    it('maps low, eye, and high height classes to absolute camera Y at center target', () => {
        const distances = [14, 16, 18];
        const classes = [
            { height: 'low', expectedY: HEIGHT_Y_BY_CLASS.low },
            { height: 'eye', expectedY: HEIGHT_Y_BY_CLASS.eye },
            { height: 'high', expectedY: HEIGHT_Y_BY_CLASS.high }
        ];

        classes.forEach(({ height, expectedY }) => {
            distances.forEach((distance) => {
                const director = buildHeightMappingDirector({
                    height,
                    yaw: 0,
                    pitch: 0.05,
                    distance,
                    screenX: 0,
                    screenY: 0,
                    targetPoint: [0, 0, 0]
                });
                const resolved = director.resolve(0);
                expect(resolved.pose.position[1]).toBeCloseTo(expectedY, 4);
            });
        });
    });

    it('clamps flower-head low height mapping while high mapping stays feasible', () => {
        const shared = {
            yaw: 0.4,
            pitch: 0.2,
            distance: 4,
            screenX: 0,
            screenY: 0,
            targetPoint: FLOWER_HEAD_TARGET
        };

        const highDirector = buildHeightMappingDirector({ ...shared, height: 'high' });
        const highResolved = highDirector.resolve(0);
        expect(highResolved.pose.position[1]).toBeCloseTo(HEIGHT_Y_BY_CLASS.high, 3);

        const lowDirector = buildHeightMappingDirector({ ...shared, height: 'low' });
        const lowResolved = lowDirector.resolve(0);
        expect(lowResolved.pose.position[1]).not.toBeCloseTo(HEIGHT_Y_BY_CLASS.low, 1);
        expect(lowResolved.pose.position[1]).toBeGreaterThan(FLOWER_HEAD_TARGET[1] - 2);
    });

    it('rejects non-finite heightYByClass values during validation', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            heightYByClass: { low: Number.NaN, eye: 2.2 },
            setups: { a: buildValidSetup({ height: 'eye' }) },
            cutTimeline: { 1: 'a' }
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.some((error) => error.includes('heightYByClass.low'))).toBe(true);
    });

    it('accepts orbit budgets at the cap and rejects overshoot when enforceOrbitBudget is true', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const holdBars = 10;
        const withinCap = MAX_SHOT_ORBIT_RADIANS / holdBars;
        const overCap = (MAX_SHOT_ORBIT_RADIANS + 0.02) / holdBars;

        const okDirector = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({ orbitPerBar: withinCap }),
                next: buildValidSetup({ orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + holdBars]: 'next' }
        });
        expect(okDirector.validate().ok).toBe(true);

        const badDirector = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({ orbitPerBar: overCap }),
                next: buildValidSetup({ orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + holdBars]: 'next' }
        });
        const badValidation = badDirector.validate();
        expect(badValidation.ok).toBe(false);
        expect(badValidation.errors.some((error) => (
            error.includes('hold')
            && error.includes('cut bar 1')
            && error.includes(String(MAX_SHOT_ORBIT_RADIANS))
        ))).toBe(true);
        expect(badDirector.isActive()).toBe(false);
    });

    it('keeps overshoot configs active when enforceOrbitBudget is not enabled', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 45, bpm: 120 });
        const orbitPerBar = 0.148446;
        const shotBars = 37;
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({
                    yaw: 0.2,
                    pitch: 0,
                    distance: 12,
                    orbitPerBar,
                    targetPoint: [0, 0, 0]
                }),
                next: buildValidSetup({ yaw: 0.2, pitch: 0, distance: 12, orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + shotBars]: 'next' }
        });

        expect(director.validate().ok).toBe(true);
        expect(director.isActive()).toBe(true);

        const shotEndTime = ((1 + shotBars - 1) * 4) * (60 / 120);
        const startYaw = horizontalYawFromResolved(director.resolve(0));
        const endYaw = horizontalYawFromResolved(director.resolve(shotEndTime - 0.001));
        expect(Math.abs(endYaw - startYaw)).toBeLessThanOrEqual(MAX_SHOT_ORBIT_RADIANS + 1e-6);
    });

    it('validates orbit budget per cut segment when the same setup is reused with different hold lengths', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const orbitPerBar = 0.07;
        const director = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: { shared: buildValidSetup({ orbitPerBar }) },
            cutTimeline: { 1: 'shared', 9: 'shared', 13: 'shared' }
        });

        const validation = director.validate();
        expect(validation.ok).toBe(false);
        const barOneError = validation.errors.find((error) => error.includes('cut bar 1'));
        const barNineError = validation.errors.find((error) => error.includes('cut bar 9'));
        expect(barOneError).toBeDefined();
        expect(barNineError).toBeUndefined();
        expect(barOneError).toContain('shared');
    });

    it('preserves authored pitch when pitchLock is true under heightYByClass', () => {
        const unlocked = buildHeightMappingDirector({
            height: 'eye',
            yaw: 0,
            pitch: 0.04,
            distance: 13.36,
            screenX: 0,
            screenY: 0,
            targetPoint: [0, 0, 0]
        });
        const locked = buildHeightMappingDirector({
            height: 'eye',
            yaw: 0,
            pitch: 0.04,
            distance: 13.36,
            screenX: 0,
            screenY: 0,
            targetPoint: [0, 0, 0],
            pitchLock: true
        });

        const unlockedY = unlocked.resolve(0).pose.position[1];
        const lockedY = locked.resolve(0).pose.position[1];
        const authoredY = Math.sin(0.04) * 13.36;
        expect(unlockedY).toBeCloseTo(HEIGHT_Y_BY_CLASS.eye, 4);
        expect(lockedY).not.toBeCloseTo(HEIGHT_Y_BY_CLASS.eye, 2);
        expect(lockedY).toBeCloseTo(authoredY, 3);
    });

    it('still derives pitch from heightYByClass when pitchLock is false or absent', () => {
        const absent = buildHeightMappingDirector({
            height: 'eye',
            yaw: 0,
            pitch: 0.04,
            distance: 14,
            screenX: 0,
            screenY: 0
        });
        const explicitFalse = buildHeightMappingDirector({
            height: 'eye',
            yaw: 0,
            pitch: 0.04,
            distance: 14,
            screenX: 0,
            screenY: 0,
            pitchLock: false
        });

        expect(absent.resolve(0).pose.position[1]).toBeCloseTo(HEIGHT_Y_BY_CLASS.eye, 4);
        expect(explicitFalse.resolve(0).pose.position[1]).toBeCloseTo(HEIGHT_Y_BY_CLASS.eye, 4);
    });

    it('rejects invalid pitchLock types during validation', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            heightYByClass: HEIGHT_Y_BY_CLASS,
            setups: { a: buildValidSetup({ pitchLock: 'yes' }) },
            cutTimeline: { 1: 'a' }
        });
        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.some((error) => error.includes('pitchLock'))).toBe(true);
    });

    it('skips orbit-budget validation only for setups with orbitBudgetExempt true', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 32, bpm: 120 });
        const holdBars = 10;
        const overCap = (MAX_SHOT_ORBIT_RADIANS + 0.02) / holdBars;

        const exemptDirector = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({ orbitPerBar: overCap, orbitBudgetExempt: true }),
                next: buildValidSetup({ orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + holdBars]: 'next' }
        });
        expect(exemptDirector.validate().ok).toBe(true);
        expect(exemptDirector.isActive()).toBe(true);

        const failingDirector = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({ orbitPerBar: overCap, orbitBudgetExempt: false }),
                next: buildValidSetup({ orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + holdBars]: 'next' }
        });
        expect(failingDirector.validate().ok).toBe(false);
    });

    it('rejects invalid orbitBudgetExempt types during validation', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: { a: buildValidSetup({ orbitBudgetExempt: 1 }) },
            cutTimeline: { 1: 'a' }
        });
        const validation = director.validate();
        expect(validation.ok).toBe(false);
        expect(validation.errors.some((error) => error.includes('orbitBudgetExempt'))).toBe(true);
    });

    it('still clamps runtime orbit motion when orbitBudgetExempt suppresses validation', () => {
        const beatGrid = buildSyntheticBeatGrid({ bars: 45, bpm: 120 });
        const orbitPerBar = 0.148446;
        const shotBars = 37;
        const director = createShotDirector({
            enabled: true,
            enforceOrbitBudget: true,
            beatGrid,
            setups: {
                hold: buildValidSetup({
                    yaw: 0.2,
                    pitch: 0,
                    distance: 12,
                    orbitPerBar,
                    orbitBudgetExempt: true,
                    targetPoint: [0, 0, 0]
                }),
                next: buildValidSetup({ yaw: 0.2, pitch: 0, distance: 12, orbitPerBar: 0 })
            },
            cutTimeline: { 1: 'hold', [1 + shotBars]: 'next' }
        });

        expect(director.validate().ok).toBe(true);
        const shotEndTime = ((1 + shotBars - 1) * 4) * (60 / 120);
        const startYaw = horizontalYawFromResolved(director.resolve(0));
        const endYaw = horizontalYawFromResolved(director.resolve(shotEndTime - 0.001));
        expect(Math.abs(endYaw - startYaw)).toBeLessThanOrEqual(MAX_SHOT_ORBIT_RADIANS + 1e-6);
    });

    describe('motionEase opt-in easing seam', () => {
        const MOTION_EASE_CURVES = ['linear', 'ease-in', 'ease-out', 'ease-in-out'];

        function buildMotionEaseDirector(setupOverrides, cutTimeline = { 1: 'a', 9: 'b' }) {
            const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
            return createShotDirector({
                enabled: true,
                beatGrid,
                setups: {
                    a: buildValidSetup(setupOverrides),
                    b: buildValidSetup({ distance: 10 })
                },
                cutTimeline
            });
        }

        it('exposes the motionEase enum and resolver with top-level precedence', () => {
            expect([...MOTION_EASE_VALUES].sort()).toEqual([...MOTION_EASE_CURVES].sort());
            expect(resolveMotionEase({ motionEase: 'ease-in' })).toBe('ease-in');
            expect(resolveMotionEase({
                motionEase: 'ease-out',
                motion: { motionEase: 'ease-in' }
            })).toBe('ease-out');
            expect(resolveMotionEase({ motion: { motionEase: 'ease-in-out' } })).toBe('ease-in-out');
            expect(resolveMotionEase(buildValidSetup())).toBeUndefined();
        });

        it('preserves endpoint easing values for every curve', () => {
            MOTION_EASE_CURVES.forEach((curve) => {
                expect(applyMotionEase(0, curve)).toBe(0);
                expect(applyMotionEase(1, curve)).toBe(1);
            });
        });

        it('applies the expected midpoint easing factors', () => {
            expect(applyMotionEase(0.5, 'linear')).toBeCloseTo(0.5, 8);
            expect(applyMotionEase(0.5, 'ease-in')).toBeCloseTo(0.25, 8);
            expect(applyMotionEase(0.5, 'ease-out')).toBeCloseTo(0.75, 8);
            expect(applyMotionEase(0.5, 'ease-in-out')).toBeCloseTo(0.5, 8);
        });

        it('returns zero eased progress when motionCapBars is non-positive', () => {
            expect(computeEasedMotionProgress(2, 0, 'ease-in')).toBe(0);
            expect(computeEasedMotionProgress(2, -4, 'ease-out')).toBe(0);
        });

        it('eases positive and negative dolly travel to the same authored endpoint', () => {
            const holdBars = 8;
            const dollyPerBar = 0.5;
            const baseDistance = 10;
            const shotEndTime = ((1 + holdBars - 1) * 4) * (60 / 120) - 0.001;
            const midTime = 3 * (60 / 120);

            const positiveDirector = buildMotionEaseDirector({
                distance: baseDistance,
                dollyPerBar,
                motionEase: 'ease-in'
            });
            const negativeDirector = buildMotionEaseDirector({
                distance: baseDistance,
                dollyPerBar: -dollyPerBar,
                motionEase: 'ease-in'
            });

            const positiveEnd = cameraDistanceFromTarget(positiveDirector.resolve(shotEndTime));
            const negativeEnd = cameraDistanceFromTarget(negativeDirector.resolve(shotEndTime));
            const positiveMid = cameraDistanceFromTarget(positiveDirector.resolve(midTime));
            const negativeMid = cameraDistanceFromTarget(negativeDirector.resolve(midTime));
            const endTInBars = 7.9995;
            const endProgress = computeEasedMotionProgress(endTInBars, holdBars, 'ease-in');
            const expectedPositiveEnd = baseDistance + (dollyPerBar * holdBars * endProgress);
            const expectedNegativeEnd = baseDistance - (dollyPerBar * holdBars * endProgress);

            expect(positiveEnd).toBeCloseTo(expectedPositiveEnd, 3);
            expect(negativeEnd).toBeCloseTo(expectedNegativeEnd, 3);
            expect(positiveMid).toBeLessThan(baseDistance + (dollyPerBar * 3));
            expect(negativeMid).toBeGreaterThan(baseDistance - (dollyPerBar * 3));
        });

        it('keeps eased orbit endpoints identical to legacy while changing mid-hold travel', () => {
            const holdBars = 8;
            const orbitPerBar = 0.12;
            const shotEndTime = ((1 + holdBars - 1) * 4) * (60 / 120) - 0.001;
            const midTime = 3 * (60 / 120);

            const legacyDirector = buildMotionEaseDirector({
                yaw: 0.2,
                pitch: 0,
                distance: 10,
                orbitPerBar,
                targetPoint: [0, 0, 0]
            });
            const easedDirector = buildMotionEaseDirector({
                yaw: 0.2,
                pitch: 0,
                distance: 10,
                orbitPerBar,
                motionEase: 'ease-in',
                targetPoint: [0, 0, 0]
            });

            const legacyStartYaw = horizontalYawFromResolved(legacyDirector.resolve(0));
            const legacyEndYaw = horizontalYawFromResolved(legacyDirector.resolve(shotEndTime));
            const legacyMidYaw = horizontalYawFromResolved(legacyDirector.resolve(midTime));
            const easedStartYaw = horizontalYawFromResolved(easedDirector.resolve(0));
            const easedEndYaw = horizontalYawFromResolved(easedDirector.resolve(shotEndTime));
            const easedMidYaw = horizontalYawFromResolved(easedDirector.resolve(midTime));
            const midTInBars = 0.75;
            const endTInBars = 7.9995;
            const expectedMidEasedOrbit = Math.abs(
                computeEasedOrbitDeltaRadians(
                    orbitPerBar,
                    applyMotionEase(midTInBars / holdBars, 'ease-in'),
                    holdBars
                )
            );
            const expectedEndEasedOrbit = Math.abs(
                computeEasedOrbitDeltaRadians(
                    orbitPerBar,
                    applyMotionEase(endTInBars / holdBars, 'ease-in'),
                    holdBars
                )
            );

            expect(Math.abs(easedEndYaw - legacyEndYaw)).toBeLessThan(1e-4);
            expect(Math.abs(easedStartYaw - legacyStartYaw)).toBeLessThan(1e-6);
            expect(Math.abs(easedMidYaw - legacyStartYaw)).toBeLessThan(
                Math.abs(legacyMidYaw - legacyStartYaw)
            );
            expect(Math.abs(easedMidYaw - easedStartYaw)).toBeCloseTo(expectedMidEasedOrbit, 5);
            expect(Math.abs(easedEndYaw - easedStartYaw)).toBeCloseTo(expectedEndEasedOrbit, 5);
        });

        it('matches legacy resolve output byte-for-byte when motionEase is omitted', () => {
            const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
            const config = {
                enabled: true,
                beatGrid,
                setups: {
                    a: buildValidSetup({ dollyPerBar: 0.15, orbitPerBar: 0.02 })
                },
                cutTimeline: { 1: 'a' }
            };
            const baseline = createShotDirector(config);
            const nestedOnly = createShotDirector({
                ...config,
                setups: {
                    a: buildValidSetup({
                        dollyPerBar: 0.15,
                        orbitPerBar: 0.02,
                        motion: { effect: null }
                    })
                }
            });

            const time = 9.25;
            const baselinePose = {
                position: [...baseline.resolve(time).pose.position],
                target: [...baseline.resolve(time).pose.target],
                fov: baseline.resolve(time).pose.fov
            };
            const nestedPose = nestedOnly.resolve(time).pose;

            expect(nestedPose.position).toEqual(baselinePose.position);
            expect(nestedPose.target).toEqual(baselinePose.target);
            expect(nestedPose.fov).toBe(baselinePose.fov);
        });

        it('routes linear motionEase through legacy math with bit-identical poses at non-dyadic times', () => {
            const dollyPerBar = 0.25;
            const orbitPerBar = 0.04;
            const sampleTimes = [1.1, 3.7, 5.5, 9.25, 11.33];

            const legacyDirector = buildMotionEaseDirector({ dollyPerBar, orbitPerBar });
            const linearDirector = buildMotionEaseDirector({
                dollyPerBar,
                orbitPerBar,
                motionEase: 'linear'
            });

            sampleTimes.forEach((time) => {
                const legacyPose = legacyDirector.resolve(time).pose;
                const linearPose = linearDirector.resolve(time).pose;
                expect(linearPose.position).toEqual(legacyPose.position);
                expect(linearPose.target).toEqual(legacyPose.target);
                expect(linearPose.fov).toBe(legacyPose.fov);
            });
        });

        it('rejects unknown motionEase values and non-string types', () => {
            const beatGrid = buildSyntheticBeatGrid({ bars: 8, bpm: 120 });
            const unknownDirector = createShotDirector({
                enabled: true,
                beatGrid,
                setups: { a: buildValidSetup({ motionEase: 'bounce' }) },
                cutTimeline: { 1: 'a' }
            });
            const nonStringDirector = createShotDirector({
                enabled: true,
                beatGrid,
                setups: { a: buildValidSetup({ motionEase: 1 }) },
                cutTimeline: { 1: 'a' }
            });

            const unknownValidation = unknownDirector.validate();
            const nonStringValidation = nonStringDirector.validate();
            expect(unknownValidation.ok).toBe(false);
            expect(nonStringValidation.ok).toBe(false);
            expect(unknownValidation.errors.some((error) => error.includes('motionEase'))).toBe(true);
            expect(nonStringValidation.errors.some((error) => error.includes('motionEase'))).toBe(true);
            expect(unknownDirector.isActive()).toBe(false);
            expect(nonStringDirector.isActive()).toBe(false);
        });

        it('accepts nested setup.motion.motionEase when top-level is omitted', () => {
            const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
            const director = createShotDirector({
                enabled: true,
                beatGrid,
                setups: {
                    a: buildValidSetup({
                        dollyPerBar: 1,
                        motion: { motionEase: 'ease-out' }
                    }),
                    b: buildValidSetup({ distance: 10 })
                },
                cutTimeline: { 1: 'a', 9: 'b' }
            });

            expect(director.validate().ok).toBe(true);
            const holdBars = 8;
            const midTime = 3 * (60 / 120);
            const endTime = ((1 + holdBars - 1) * 4) * (60 / 120) - 0.001;
            const midU = 0.75 / holdBars;
            const midEased = applyMotionEase(midU, 'ease-out');
            const midDistance = cameraDistanceFromTarget(director.resolve(midTime));
            const endDistance = cameraDistanceFromTarget(director.resolve(endTime));
            expect(endDistance).toBeCloseTo(18, 3);
            expect(midDistance).toBeCloseTo(10 + (holdBars * midEased), 3);
        });

        it('remains seek-safe and order-independent with motionEase authored', () => {
            const director = buildMotionEaseDirector({
                dollyPerBar: 0.2,
                orbitPerBar: 0.03,
                motionEase: 'ease-in-out'
            });
            const time = 5.5;
            const forward = director.resolve(time);
            director.resolve(20);
            const backward = director.resolve(time);
            expect(backward.pose.position).toEqual(forward.pose.position);
            expect(backward.pose.target).toEqual(forward.pose.target);
            expect(backward.pose.fov).toBe(forward.pose.fov);
        });

        it('zeros eased travel under reduced motion on the eased setup itself', () => {
            const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
            const director = createShotDirector({
                enabled: true,
                beatGrid,
                setups: {
                    a: buildValidSetup({
                        distance: 10,
                        dollyPerBar: 2,
                        orbitPerBar: 0.2,
                        motionEase: 'ease-out'
                    })
                },
                cutTimeline: { 1: 'a' }
            });
            const targetPoint = [1, 2, 0];
            const movingOut = {
                barIndex: 0,
                setupId: '',
                setup: null,
                pose: { position: [0, 0, 0], target: [...targetPoint], fov: 45 }
            };
            const reducedOut = {
                barIndex: 0,
                setupId: '',
                setup: null,
                pose: { position: [0, 0, 0], target: [...targetPoint], fov: 45 }
            };

            director.resolve(5.5, movingOut);
            const movingDistance = cameraDistanceFromTarget(movingOut);
            director.resolve(5.5, reducedOut, { reducedMotion: true });

            expect(movingOut.setupId).toBe('a');
            expect(reducedOut.setupId).toBe('a');
            expect(cameraDistanceFromTarget(reducedOut)).toBeCloseTo(10, 5);
            expect(movingDistance).not.toBeCloseTo(10, 3);
        });

        it('keeps dollyZoom wall-clock progress while motionEase eases the incoming base distance', () => {
            const beatGrid = buildSyntheticBeatGrid({ bars: 16, bpm: 120 });
            const director = createShotDirector({
                enabled: true,
                beatGrid,
                setups: {
                    zoom: buildValidSetup({
                        distance: 10,
                        fov: 55,
                        dollyPerBar: 0.3,
                        motionEase: 'ease-in',
                        motion: { effect: 'dollyZoom', effectDurationSeconds: 2.2 }
                    })
                },
                cutTimeline: { 1: 'zoom' }
            });
            const baselineDirector = createShotDirector({
                enabled: true,
                beatGrid,
                setups: {
                    zoom: buildValidSetup({
                        distance: 10,
                        fov: 55,
                        dollyPerBar: 0.3,
                        motion: { effect: 'dollyZoom', effectDurationSeconds: 2.2 }
                    })
                },
                cutTimeline: { 1: 'zoom' }
            });
            const targetPoint = [1, 2, 0];
            const easedOut = {
                barIndex: 0,
                setupId: '',
                setup: null,
                pose: { position: [0, 0, 0], target: [...targetPoint], fov: 45 }
            };
            const baselineOut = {
                barIndex: 0,
                setupId: '',
                setup: null,
                pose: { position: [0, 0, 0], target: [...targetPoint], fov: 45 }
            };
            const midTime = 1.1;

            director.resolve(midTime, easedOut);
            baselineDirector.resolve(midTime, baselineOut);

            expect(easedOut.pose.fov).toBeCloseTo(baselineOut.pose.fov, 5);
            expect(cameraDistanceFromTarget(easedOut)).not.toBeCloseTo(
                cameraDistanceFromTarget(baselineOut),
                3
            );
        });
    });
});
