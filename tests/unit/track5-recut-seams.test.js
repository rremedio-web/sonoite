/* eslint-disable security/detect-object-injection -- setup ids and cut bars come from fs-loaded authored configs */
import fs from 'fs';
import path from 'path';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';
import { createLightRigResolver } from '../../src/js/prototype/light-rigs.js';
import {
    createTrack5RecutCameraConfig,
    DEFAULT_IMPORTED_SETUP_IDS,
    DEFAULT_HEAD_CUTS,
    DEFAULT_TAIL_CUTS
} from '../../src/js/prototype/track5-recut-seams.js';
import { RECUT_PITCH_LOCK_ALLOWLIST } from './fixtures/track5-recut-expectations.js';

const EXPERIENCE_PATH = path.join(process.cwd(), 'src/js/prototype/experience.js');
// Film score moved to the films module in Prompt #204 (E3-lite); scrapes see both.
const FILM_PATH = path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js');
const CENTER = [0.959854, 1.901261, -0.038787];

// Bar 43 (`ecu_ridge_dry`) was removed from the shipped cutTimeline — "too
// tight after bar 37; p03 re-keys wet_specular at bar 43 without a camera cut"
// (experience.js:1708-1711). 25 middle cuts is the authored state.
const EXPECTED_MIDDLE_CUTS = [
    [25, 'mcu_void_entry'],
    [37, 'mcu_void_continue'],
    [48, 'mcu_high_quarter'],
    [54, 'mcu_ridge_hold'],
    [68, 'mcu_pressure_climb'],
    [75, 'ws_dense_prehit'],
    [76, 'mcu_fracture_entry'],
    [81, 'ecu_mask_core'],
    [85, 'ws_monument_low'],
    [91, 'mcu_side_slash'],
    [94, 'mcu_ridge_context'],
    [102, 'ws_orbit_snap'],
    [107, 'mcu_climax_peak'],
    [111, 'ecu_knuckle_base'],
    [117, 'mcu_pre_release_high'],
    [121, 'mcu_release_edge'],
    [126, 'ws_descent'],
    [128, 'ws_plateau_spiral'],
    [139, 'mcu_plateau_shoulders'],
    [147, 'ecu_tar_rise'],
    [151, 'ws_island_bright'],
    [160, 'mcu_island_exit'],
    [165, 'ws_changed_room'],
    [171, 'mcu_blob_pulse'],
    [186, 'mcu_residue_right']
];

function readExperienceSource() {
    return `${fs.readFileSync(EXPERIENCE_PATH, 'utf8')}\n${fs.readFileSync(FILM_PATH, 'utf8')}`;
}

function sliceBlock(src, startToken, endToken) {
    const start = src.indexOf(startToken);
    const end = src.indexOf(endToken, start + 1);
    if (start < 0 || end < 0) {
        throw new Error(`block not found for ${startToken}`);
    }
    let body = src.slice(start + startToken.length, end).trim();
    body = body
        .replace(/target: TRACK5_FILM_TARGET/g, `target: [${CENTER.join(',')}]`)
        .replace(/targetPoint: TRACK5_FILM_FLOWER_HEAD/g, 'targetPoint: [0.959854, 5.612414, -0.038787]')
        .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, 'targetPoint: [0.959854, 3.4, 0.4]')
        .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, 'targetPoint: [0.959854, 0.2, 0.9]')
        .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, 'targetPoint: [1.0282, 3.5696, 0.6120]')
        .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, 'targetPoint: [1.3457, 4.2708, 0.6256]')
        .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, 'targetPoint: [1.0234, 2.7378, 0.3623]');
    body = body.slice(0, body.lastIndexOf('}') + 1);
    // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror
    return new Function(`return (${body});`)();
}

function loadDefaultDirectorCamera(src = readExperienceSource()) {
    return sliceBlock(
        src,
        'const TRACK5_FILM_DIRECTOR_CAMERA = ',
        '\nconst TRACK5_CHAMBER_FILM_TIMELINE ='
    );
}

function loadRecutDirectorCamera(src = readExperienceSource()) {
    return sliceBlock(
        src,
        'const TRACK5_RECUT_DIRECTOR_CAMERA = ',
        '\nconst TRACK5_RECUT_FILM_TIMELINE ='
    );
}

function loadBeatGrid() {
    const beatsPath = path.join(
        process.cwd(),
        'public/assets/journeys/analysis/nao-querer-nada/beats.json'
    );
    return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
}

function downbeatTimeForBar(beatGrid, bar) {
    const match = beatGrid.beats.find((entry) => entry.bar === bar && entry.beatInBar === 1);
    return match ? match.time : null;
}

function holdMidpointTime(beatGrid, cutBar, nextCutBar) {
    const start = downbeatTimeForBar(beatGrid, cutBar);
    const end = downbeatTimeForBar(beatGrid, nextCutBar);
    if (start === null || end === null) {
        return null;
    }
    return start + ((end - start) * 0.5);
}

function copyResolvedPose(director, timeSeconds) {
    const resolved = director.resolve(timeSeconds);
    return {
        setupId: resolved.setupId,
        position: [...resolved.pose.position],
        target: [...resolved.pose.target],
        fov: resolved.pose.fov
    };
}

function expectPoseNear(left, right) {
    expect(left.setupId).toBe(right.setupId);
    left.position.forEach((value, index) => {
        expect(value).toBeCloseTo(right.position[index], 4);
    });
    left.target.forEach((value, index) => {
        expect(value).toBeCloseTo(right.target[index], 4);
    });
    expect(left.fov).toBeCloseTo(right.fov, 4);
}

function buildDirector(camera, beatGrid) {
    return createShotDirector({
        enabled: true,
        beatGrid,
        setups: camera.setups,
        cutTimeline: camera.cutTimeline,
        accentCuts: camera.accentCuts,
        defaultTargetPoint: camera.target,
        heightYByClass: camera.director?.heightYByClass,
        enforceOrbitBudget: camera.director?.enforceOrbitBudget === true
    });
}

describe('createTrack5RecutCameraConfig', () => {
    const source = readExperienceSource();
    const defaultCamera = loadDefaultDirectorCamera(source);
    const recutCamera = loadRecutDirectorCamera(source);
    const beatGrid = loadBeatGrid();

    it('does not mutate default or recut inputs and leaves source setups without seam flags', () => {
        const defaultBefore = JSON.stringify(defaultCamera);
        const recutBefore = JSON.stringify(recutCamera);
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });

        expect(JSON.stringify(defaultCamera)).toBe(defaultBefore);
        expect(JSON.stringify(recutCamera)).toBe(recutBefore);

        DEFAULT_IMPORTED_SETUP_IDS.forEach((setupId) => {
            expect(defaultCamera.setups[setupId].pitchLock).toBeUndefined();
            expect(defaultCamera.setups[setupId].orbitBudgetExempt).toBeUndefined();
        });

        expect(composite).not.toBe(defaultCamera);
        expect(composite).not.toBe(recutCamera);
        expect(composite.setups).not.toBe(defaultCamera.setups);
        expect(composite.setups).not.toBe(recutCamera.setups);
    });

    it('throws when required camera config or setups are missing', () => {
        expect(() => createTrack5RecutCameraConfig({})).toThrow(/defaultCamera/);
        expect(() => createTrack5RecutCameraConfig({ defaultCamera: {} })).toThrow(/recutCamera/);
        const defaultMissingHead = {
            ...defaultCamera,
            setups: { ...defaultCamera.setups }
        };
        delete defaultMissingHead.setups.ws_front_low;
        expect(() => createTrack5RecutCameraConfig({
            defaultCamera: defaultMissingHead,
            recutCamera
        })).toThrow(/missing setup "ws_front_low"/);
    });

    it('validates and activates with the real beat grid', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        const director = buildDirector(composite, beatGrid);
        const validation = director.validate();
        expect(validation.ok).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(director.isActive()).toBe(true);
    });

    it('preserves recut director target, height map, orbit enforcement, and empty accents', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        expect(composite.target).toEqual(recutCamera.target);
        expect(composite.target).not.toBe(recutCamera.target);
        expect(composite.director).toEqual(recutCamera.director);
        expect(composite.accentCuts).toEqual([]);
    });

    it('merges default head/tail cuts with the unchanged 25-cut recut middle', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        Object.entries(DEFAULT_HEAD_CUTS).forEach(([bar, setupId]) => {
            expect(composite.cutTimeline[bar]).toBe(setupId);
        });
        Object.entries(DEFAULT_TAIL_CUTS).forEach(([bar, setupId]) => {
            expect(composite.cutTimeline[bar]).toBe(setupId);
        });
        EXPECTED_MIDDLE_CUTS.forEach(([bar, setupId]) => {
            expect(composite.cutTimeline[String(bar)]).toBe(setupId);
        });
        expect(Object.keys(recutCamera.setups)).toHaveLength(25);
    });

    it('stamps only imported default setups with pitchLock and orbitBudgetExempt', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });

        DEFAULT_IMPORTED_SETUP_IDS.forEach((setupId) => {
            expect(composite.setups[setupId].pitchLock).toBe(true);
            expect(composite.setups[setupId].orbitBudgetExempt).toBe(true);
        });

        Object.keys(recutCamera.setups).forEach((setupId) => {
            if (DEFAULT_IMPORTED_SETUP_IDS.includes(setupId)) {
                return;
            }
            expect(composite.setups[setupId].orbitBudgetExempt).toBeUndefined();
            if (RECUT_PITCH_LOCK_ALLOWLIST.includes(setupId)) {
                expect(composite.setups[setupId].pitchLock).toBe(true);
            } else {
                expect(composite.setups[setupId].pitchLock).toBeUndefined();
            }
        });

        // The allowlist is exact: no other recut setup may acquire pitchLock.
        const lockedRecutIds = Object.keys(recutCamera.setups)
            .filter((setupId) => !DEFAULT_IMPORTED_SETUP_IDS.includes(setupId))
            .filter((setupId) => composite.setups[setupId].pitchLock === true)
            .sort();
        expect(lockedRecutIds).toEqual([...RECUT_PITCH_LOCK_ALLOWLIST].sort());
    });

    it('registers imported head/tail light rigs with the light-rig resolver', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        const rigIds = new Set(createLightRigResolver().listIds());
        DEFAULT_IMPORTED_SETUP_IDS.forEach((setupId) => {
            expect(rigIds.has(composite.setups[setupId].lightRig)).toBe(true);
        });
    });

    describe('composite shot director seams', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        const compositeDirector = buildDirector(composite, beatGrid);
        const defaultDirector = buildDirector(defaultCamera, beatGrid);

        it('matches default head resolves at t=0, 30, 59.5, and 63.999', () => {
            [0, 30, 59.5, 63.999].forEach((time) => {
                const compositePose = copyResolvedPose(compositeDirector, time);
                const defaultPose = copyResolvedPose(defaultDirector, time);
                expectPoseNear(compositePose, defaultPose);
            });
        });

        it('hard-cuts to recut mcu_void_entry at t=64', () => {
            expect(compositeDirector.resolve(64).setupId).toBe('mcu_void_entry');
            expect(defaultDirector.resolve(64).setupId).toBe('ws_back_silhouette');
        });

        it('matches default residue pose at t=504 and t=506', () => {
            [504, 506].forEach((time) => {
                const compositePose = copyResolvedPose(compositeDirector, time);
                const defaultPose = copyResolvedPose(defaultDirector, time);
                expectPoseNear(compositePose, defaultPose);
            });
        });

        const UNTOUCHED_POSES = [
            { bar: 151, setupId: 'ws_island_bright', position: [25.454393, 7, 21.479122] },
            { bar: 160, setupId: 'mcu_island_exit', position: [13.632527, 2.2, 4.888089] },
            { bar: 186, setupId: 'mcu_residue_right', position: [12.85686, 2.435519, 6.01641] }
        ];

        function effectivePitch(pose) {
            const dx = pose.position[0] - pose.target[0];
            const dy = pose.position[1] - pose.target[1];
            const dz = pose.position[2] - pose.target[2];
            return Math.asin(dy / Math.hypot(dx, dy, dz));
        }

        it('leaves bars 151, 160, and 186 on their director-derived poses', () => {
            UNTOUCHED_POSES.forEach(({ bar, setupId, position }) => {
                const downbeat = downbeatTimeForBar(beatGrid, bar);
                expect(downbeat).not.toBeNull();
                const resolved = compositeDirector.resolve(downbeat);
                expect(resolved.setupId).toBe(setupId);
                position.forEach((value, index) => {
                    expect(resolved.pose.position[index]).toBeCloseTo(value, 4);
                });
            });

            // bar 151 stays unlocked: the director re-derives its pitch from the
            // `high` eye-line (7), so the authored 0.25 fallback is NOT what renders.
            const island = composite.setups.ws_island_bright;
            expect(island.pitchLock).toBeUndefined();
            expect(island.pitch).toBe(0.25);
            const islandPose = compositeDirector.resolve(downbeatTimeForBar(beatGrid, 151)).pose;
            expect(effectivePitch(islandPose)).toBeCloseTo(0.155129, 5);
        });

        it('bears bar 91 away from the reserved right-side ending close-up', () => {
            expect(composite.setups.mcu_side_slash.yaw).toBe(-2.35);
            expect(composite.setups.mcu_side_slash.pitchLock).toBeUndefined();
            // bar 186 keeps sole ownership of the +X ending bearing.
            expect(composite.setups.mcu_residue_right.yaw).toBe(1.1);
            expect(composite.setups.mcu_island_exit.yaw).toBe(1.2);

            const downbeat = downbeatTimeForBar(beatGrid, 91);
            const resolved = compositeDirector.resolve(downbeat);
            expect(resolved.setupId).toBe('mcu_side_slash');
            // Rear-left quadrant: -X, -Z.
            expect(resolved.pose.position[0]).toBeLessThan(resolved.pose.target[0]);
            expect(resolved.pose.position[2]).toBeLessThan(resolved.pose.target[2]);
        });

        it('matches default tail setups and poses at bars 195, 204, and 213 downbeats and mid-hold', () => {
            const tailSegments = [
                { bar: 195, nextBar: 204, setupId: 'ecu_tar_reward' },
                { bar: 204, nextBar: 213, setupId: 'ws_erasure' },
                { bar: 213, nextBar: null, setupId: 'ws_final_trace' }
            ];

            tailSegments.forEach(({ bar, nextBar, setupId }) => {
                const downbeat = downbeatTimeForBar(beatGrid, bar);
                expect(downbeat).not.toBeNull();
                const compositeDownbeat = copyResolvedPose(compositeDirector, downbeat);
                const defaultDownbeat = copyResolvedPose(defaultDirector, downbeat);
                expect(compositeDownbeat.setupId).toBe(setupId);
                expectPoseNear(compositeDownbeat, defaultDownbeat);

                if (nextBar !== null) {
                    const midHold = holdMidpointTime(beatGrid, bar, nextBar);
                    expect(midHold).not.toBeNull();
                    expectPoseNear(
                        copyResolvedPose(compositeDirector, midHold),
                        copyResolvedPose(defaultDirector, midHold)
                    );
                }
            });
        });
    });
});
