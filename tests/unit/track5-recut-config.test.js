/* eslint-disable security/detect-object-injection -- setup ids and cut bars come from fs-loaded authored TRACK5 recut config */
import fs from 'fs';
import path from 'path';
import {
    createShotDirector,
    computeEasedMotionProgress,
    computeEasedOrbitDeltaRadians
} from '../../src/js/prototype/shot-director.js';
import { createTrack5RecutCameraConfig } from '../../src/js/prototype/track5-recut-seams.js';
import { createRecutPhraseLight, resolveRecutPhraseLightFrame } from '../../src/js/prototype/recut-phrase-light.js';
import { createLightRigResolver } from '../../src/js/prototype/light-rigs.js';
import { RECUT_LIGHT_SCORE_CONSTANTS } from '../../src/js/prototype/recut-light-score.js';

const EXPERIENCE_PATH = path.join(process.cwd(), 'src/js/prototype/experience.js');
// Film score moved to the films module in Prompt #204 (E3-lite); scrapes see both.
const FILM_PATH = path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js');

const CENTER = [0.959854, 1.901261, -0.038787];
const FLOWER_HEAD = [0.959854, 5.612414, -0.038787];
const MID_RIDGE = [0.959854, 3.4, 0.4];
const BASE_POOL = [0.959854, 0.2, 0.9];
const RIDGE_JUNCTION = [1.0282, 3.5696, 0.6120];
const BLOOM_EDGE = [1.3457, 4.2708, 0.6256];
const LOWER_SHOULDER = [1.0234, 2.7378, 0.3623];

// Stage 1A authoritative 25-cut map: [bar, setupId, cameraFamily].
const EXPECTED_CUTS = [
    [25, 'mcu_void_entry', 'F4'],
    [37, 'mcu_void_continue', 'F5'],
    [48, 'mcu_high_quarter', 'F6'],
    [54, 'mcu_ridge_hold', 'F5'],
    [68, 'mcu_pressure_climb', 'F6'],
    [75, 'ws_dense_prehit', 'F1'],
    [76, 'mcu_fracture_entry', 'F5'],
    [81, 'ecu_mask_core', 'F7'],
    [85, 'ws_monument_low', 'F1'],
    [91, 'mcu_side_slash', 'F4'],
    [94, 'mcu_ridge_context', 'F6'],
    [102, 'ws_orbit_snap', 'F1'],
    [107, 'mcu_climax_peak', 'F5'],
    [111, 'ecu_knuckle_base', 'F8'],
    [117, 'mcu_pre_release_high', 'F6'],
    [121, 'mcu_release_edge', 'F4'],
    [126, 'ws_descent', 'F1'],
    [128, 'ws_plateau_spiral', 'F3'],
    [139, 'mcu_plateau_shoulders', 'F6'],
    [147, 'ecu_tar_rise', 'F8'],
    [151, 'ws_island_bright', 'F2'],
    [160, 'mcu_island_exit', 'F4'],
    [165, 'ws_changed_room', 'F1'],
    [171, 'mcu_blob_pulse', 'F5'],
    [186, 'mcu_residue_right', 'F4']
];

const REJECTED_RECUT_SETUP_IDS = [
    'ws_entry_warm',
    'mcu_eye_right',
    'ws_back_sil_A',
    'ws_high_quarter',
    'mcu_three_quarter_low',
    'ws_false_quiet',
    'ws_pillar_top',
    'ws_pre_release',
    'ws_plateau_orbit'
];

const REJECTED_DEFAULT_ONLY_IDS = [
    'ws_front_low',
    'mcu_left_eye',
    'ws_right_arch',
    'ws_back_silhouette',
    'mcu_right_low',
    'ws_front_high',
    'ws_false_release',
    'mcu_fracture',
    'ws_room_reveal',
    'mcu_pressure_low',
    'ecu_flower',
    'ecu_surface',
    'ecu_vertigo',
    'ecu_tar_reward',
    'ws_erasure',
    'ws_final_trace',
    ...REJECTED_RECUT_SETUP_IDS
];

// Shared with track5-recut-seams.test.js — update the fixture, not a copy.
// eslint-disable-next-line import/order -- grouped with the other local fixtures
import { RECUT_PITCH_LOCK_ALLOWLIST } from './fixtures/track5-recut-expectations.js';

const MEASURED_FORENSIC_TARGETS = {
    RIDGE_JUNCTION,
    BLOOM_EDGE,
    LOWER_SHOULDER
};

const EXPECTED_DOLLY_BARS = {
    25: -0.18,
    37: -0.10,
    48: -0.05,
    54: -0.06,
    68: -0.22,
    76: -0.08,
    94: -0.11,
    111: -0.04,
    128: -0.65,
    160: 0.06,
    171: -0.09
};

// Second-pass Stage 1 movement map: every hold that carries in-shot orbit, with
// the authored per-bar rate. Holds below the perceptual floor were the blocker
// this pass fixes, so the rates are pinned exactly.
const EXPECTED_ORBIT_BARS = {
    25: 0.012,
    37: -0.025,
    48: 0.04,
    54: 0.018,
    68: -0.03,
    76: 0.03,
    94: -0.035,
    111: 0.025,
    117: 0.05,
    128: 0.05,
    151: 0.04,
    165: 0.03,
    171: -0.015
};

// Authored end-of-hold distances after dolly-aware easing (units).
const EXPECTED_HOLD_END_DISTANCE = {
    25: 12.04,
    37: 11.9,
    48: 12.5,
    54: 11.96,
    68: 13.46,
    76: 13.0,
    94: 11.92,
    111: 5.96,
    128: 20.35,
    171: 12.45
};

const EXPECTED_MOTION_EASE = {
    25: 'ease-out',
    37: 'ease-out',
    48: 'ease-out',
    54: 'ease-out',
    68: 'ease-in',
    76: 'ease-out',
    94: 'ease-out',
    111: 'ease-out',
    117: 'ease-out',
    128: 'ease-in-out',
    171: 'ease-in'
};

const PROTECTED_STATIC_BARS = [121, 147, 151, 160, 186];

const RESIDUE_PHYSICAL_KEYS = [
    'framing',
    'height',
    'yaw',
    'pitch',
    'distance',
    'fov',
    'screenX',
    'screenY',
    'roll',
    'localMotion',
    'lightRig'
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
        .replace(/targetPoint: TRACK5_FILM_FLOWER_HEAD/g, `targetPoint: [${FLOWER_HEAD.join(',')}]`)
        .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, `targetPoint: [${MID_RIDGE.join(',')}]`)
        .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, `targetPoint: [${BASE_POOL.join(',')}]`)
        .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, `targetPoint: [${RIDGE_JUNCTION.join(',')}]`)
        .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, `targetPoint: [${BLOOM_EDGE.join(',')}]`)
        .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, `targetPoint: [${LOWER_SHOULDER.join(',')}]`);
    // Trim to the object literal's closing brace, dropping the trailing const
    // semicolon and any following comment lines (object bodies contain no braces
    // after the close, so lastIndexOf is exact and avoids a backtracking regex).
    body = body.slice(0, body.lastIndexOf('}') + 1);
    // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
    return new Function(`return (${body});`)();
}

function loadRecutDirectorCamera(src = readExperienceSource()) {
    return sliceBlock(
        src,
        'const TRACK5_RECUT_DIRECTOR_CAMERA = ',
        '\nconst TRACK5_RECUT_FILM_TIMELINE ='
    );
}

function loadDefaultDirectorCamera(src = readExperienceSource()) {
    return sliceBlock(
        src,
        'const TRACK5_FILM_DIRECTOR_CAMERA = ',
        '\nconst TRACK5_CHAMBER_FILM_TIMELINE ='
    );
}

function loadLightPhrases(src = readExperienceSource()) {
    const token = 'const TRACK5_RECUT_LIGHT_PHRASES = ';
    const start = src.indexOf(token);
    if (start < 0) {
        throw new Error('phrase table not found');
    }
    // Pure array literal of number-arrays + string rigs; first `];` closes it.
    let body = src.slice(start + token.length);
    body = body.slice(0, body.indexOf('];') + 1);
    // eslint-disable-next-line no-new-func -- fs-loaded authored phrase-table mirror
    return new Function(`return (${body});`)();
}

// Fable Option B phrase-light table v2 (Stage 1A metadata only).
const EXPECTED_PHRASES = [
    { id: 'p01', startBar: 25, endBar: 37, lightRig: 'void_side_warm', cameraCutBars: [25] },
    { id: 'p02', startBar: 37, endBar: 43, lightRig: 'back_silhouette', cameraCutBars: [37] },
    { id: 'p03', startBar: 43, endBar: 48, lightRig: 'wet_specular', cameraCutBars: [], rekeyOnly: true },
    { id: 'p04', startBar: 48, endBar: 60, lightRig: 'pressure_top', cameraCutBars: [48, 54] },
    { id: 'p05', startBar: 60, endBar: 68, lightRig: 'back_silhouette', cameraCutBars: [], rekeyOnly: true },
    { id: 'p06', startBar: 68, endBar: 75, lightRig: 'pressure_top', cameraCutBars: [68] },
    { id: 'p07', startBar: 75, endBar: 76, lightRig: 'back_silhouette', cameraCutBars: [75] },
    { id: 'p08', startBar: 76, endBar: 85, lightRig: 'fracture', cameraCutBars: [76, 81] },
    { id: 'p09', startBar: 85, endBar: 94, lightRig: 'void_side_warm', cameraCutBars: [85, 91] },
    { id: 'p10', startBar: 94, endBar: 102, lightRig: 'pressure_top', cameraCutBars: [94] },
    { id: 'p11', startBar: 102, endBar: 107, lightRig: 'pressure_top', cameraCutBars: [102] },
    { id: 'p12', startBar: 107, endBar: 117, lightRig: 'pressure_top', cameraCutBars: [107, 111] },
    { id: 'p13', startBar: 117, endBar: 121, lightRig: 'pressure_top', cameraCutBars: [117] },
    { id: 'p14', startBar: 121, endBar: 126, lightRig: 'fracture', cameraCutBars: [121] },
    { id: 'p15', startBar: 126, endBar: 128, lightRig: 'void_side_warm', cameraCutBars: [126] },
    { id: 'p16', startBar: 128, endBar: 147, lightRig: 'plateau_rim_pulse', cameraCutBars: [128, 139] },
    { id: 'p17', startBar: 147, endBar: 151, lightRig: 'wet_specular', cameraCutBars: [147] },
    { id: 'p18', startBar: 151, endBar: 160, lightRig: 'pressure_top', cameraCutBars: [151] },
    { id: 'p19', startBar: 160, endBar: 165, lightRig: 'low_key_grazing', cameraCutBars: [160] },
    { id: 'p20', startBar: 165, endBar: 171, lightRig: 'void_side_warm', cameraCutBars: [165] },
    { id: 'p21', startBar: 171, endBar: 186, lightRig: 'plateau_rim_pulse', cameraCutBars: [171] },
    { id: 'p22', startBar: 186, endBar: 195, lightRig: 'wet_specular', cameraCutBars: [186] }
];

function loadBeatGrid() {
    const beatsPath = path.join(
        process.cwd(),
        'public/assets/journeys/analysis/nao-querer-nada/beats.json'
    );
    return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
}

function loadMeasuredBounds() {
    const boundsPath = path.join(process.cwd(), 'scripts/track5-measured-bounds.json');
    return JSON.parse(fs.readFileSync(boundsPath, 'utf8'));
}

function downbeatTimeForBar(beatGrid, bar) {
    const match = beatGrid.beats.find((entry) => entry.bar === bar && entry.beatInBar === 1);
    return match ? match.time : null;
}

function yawQuadrant(yaw) {
    const sign = yaw >= 0 ? 'pos' : 'neg';
    const abs = Math.abs(yaw);
    let cardinal = 'side';
    if (abs < Math.PI / 4) {
        cardinal = 'front';
    } else if (abs > (3 * Math.PI) / 4) {
        cardinal = 'back';
    }
    return `${sign}_${cardinal}`;
}

function shotSignature(setup) {
    return {
        framing: setup.framing,
        height: setup.height,
        quadrant: yawQuadrant(setup.yaw)
    };
}

function diffCount(left, right) {
    let count = 0;
    if (left.framing !== right.framing) {
        count += 1;
    }
    if (left.height !== right.height) {
        count += 1;
    }
    if (left.quadrant !== right.quadrant) {
        count += 1;
    }
    return count;
}

function sortedCutBars(camera) {
    return Object.keys(camera.cutTimeline)
        .map((key) => Number.parseInt(key, 10))
        .sort((a, b) => a - b);
}

function holdBarsFor(camera, bar) {
    const bars = sortedCutBars(camera);
    const index = bars.indexOf(bar);
    const next = bars[index + 1];
    return next === undefined ? 1 : next - bar;
}

function endOfHoldTime(beatGrid, camera, bar) {
    const bars = sortedCutBars(camera);
    const index = bars.indexOf(bar);
    const nextBar = bars[index + 1];
    if (nextBar === undefined) {
        return downbeatTimeForBar(beatGrid, bar) + 1;
    }
    const nextDownbeat = downbeatTimeForBar(beatGrid, nextBar);
    return nextDownbeat - 0.001;
}

function cameraDistance(resolved) {
    const { position, target } = resolved.pose;
    return Math.hypot(
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2]
    );
}

function buildRecutDirector(camera, beatGrid) {
    return createShotDirector({
        enabled: true,
        beatGrid,
        setups: camera.setups,
        cutTimeline: camera.cutTimeline,
        accentCuts: camera.accentCuts,
        defaultTargetPoint: camera.target,
        heightYByClass: camera.director.heightYByClass,
        enforceOrbitBudget: camera.director.enforceOrbitBudget === true
    });
}

function copyResolvedPose(director, timeSeconds, scratch) {
    const resolved = director.resolve(timeSeconds, scratch);
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

// Bar 128 is the single authored framing-band transition (see ws_plateau_spiral):
// it starts as a WS and ends in the 20–21u zone between the WS floor (25.98u) and
// the MCU ceiling (17.81u). It is asserted by bar number here — NOT via a generic
// `orbitBudgetExempt`-style escape hatch — so no other shot can drift out of band.
const BAND_TRANSITION_BAR = 128;
const BAND_TRANSITION_END_MIN = 20;
const BAND_TRANSITION_END_MAX = 21;

function assertHoldEndDistanceBand(framing, ratio) {
    if (framing === 'WS') {
        expect(ratio).toBeGreaterThanOrEqual(3.5);
        expect(ratio).toBeLessThanOrEqual(5.5 + 1e-6);
        return;
    }
    if (framing === 'MCU') {
        expect(ratio).toBeGreaterThanOrEqual(1.6);
        expect(ratio).toBeLessThanOrEqual(2.4);
        return;
    }
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.9);
}

describe('Track 5 recut camera config (?recut=1)', () => {
    const source = readExperienceSource();
    const recut = loadRecutDirectorCamera(source);
    const defaultCamera = loadDefaultDirectorCamera(source);
    const beatGrid = loadBeatGrid();
    const bounds = loadMeasuredBounds();
    const H = bounds.height;

    it('authors exactly the 25 authoritative cut bars in order, each a single downbeat', () => {
        const cutBars = sortedCutBars(recut);
        expect(cutBars).toEqual(EXPECTED_CUTS.map(([bar]) => bar));
        expect(cutBars).toHaveLength(25);
        expect(cutBars[0]).toBe(25);

        cutBars.forEach((bar) => {
            const downbeats = beatGrid.beats.filter(
                (entry) => entry.bar === bar && entry.beatInBar === 1
            );
            expect(downbeats).toHaveLength(1);
        });
    });

    it('maps every cut bar to its authoritative setupId', () => {
        EXPECTED_CUTS.forEach(([bar, setupId]) => {
            expect(recut.cutTimeline[String(bar)]).toBe(setupId);
        });
    });

    it('uses 25 unique setup ids, all referenced by the timeline', () => {
        const setupIds = Object.keys(recut.setups);
        expect(setupIds).toHaveLength(25);
        expect(new Set(setupIds).size).toBe(25);

        const referenced = new Set(Object.values(recut.cutTimeline));
        expect(referenced.size).toBe(25);
        referenced.forEach((id) => {
            expect(recut.setups[id]).toBeDefined();
        });
    });

    it('represents all eight camera families F1–F8', () => {
        const families = new Set(
            Object.values(recut.setups).map((setup) => setup.cameraFamily)
        );
        expect([...families].sort()).toEqual([
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'
        ]);
        EXPECTED_CUTS.forEach(([, setupId, family]) => {
            expect(recut.setups[setupId].cameraFamily).toBe(family);
        });
    });

    it('carries no accent cuts, no rejected setup ids, and no dollyZoom/effect', () => {
        expect(recut.accentCuts).toEqual([]);

        const setupIds = Object.keys(recut.setups);
        REJECTED_DEFAULT_ONLY_IDS.forEach((id) => {
            expect(setupIds).not.toContain(id);
        });

        Object.values(recut.setups).forEach((setup) => {
            expect(setup.motion).toBeUndefined();
            expect(setup.effect).toBeUndefined();
        });

        // The recut block itself must not author any dollyZoom effect (the default
        // config keeps `ecu_vertigo` dollyZoom, so scope this to the recut source).
        const recutStart = source.indexOf('const TRACK5_RECUT_DIRECTOR_CAMERA =');
        const recutEnd = source.indexOf('\nconst TRACK5_RECUT_FILM_TIMELINE =');
        const recutBlock = source.slice(recutStart, recutEnd);
        expect(recutBlock).not.toContain('dollyZoom');
        expect(recutBlock).not.toContain('accentCuts: [\n');
    });

    it('enables the director with the P1 height map and P4 orbit-budget enforcement', () => {
        expect(recut.director.enabled).toBe(true);
        expect(recut.director.heightYByClass).toEqual({ low: 0, eye: 2.2, high: 7 });
        expect(recut.director.enforceOrbitBudget).toBe(true);
    });

    it('activates createShotDirector against the real beat grid', () => {
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: recut.setups,
            cutTimeline: recut.cutTimeline,
            accentCuts: recut.accentCuts,
            defaultTargetPoint: recut.target,
            heightYByClass: recut.director.heightYByClass,
            enforceOrbitBudget: recut.director.enforceOrbitBudget
        });
        const validation = director.validate();
        expect(validation.errors).toEqual([]);
        expect(validation.ok).toBe(true);
        expect(director.isActive()).toBe(true);
    });

    it('keeps all distances inside the measured H-ratio framing bands', () => {
        Object.entries(recut.setups).forEach(([, setup]) => {
            const ratio = setup.distance / H;
            if (setup.framing === 'WS') {
                expect(ratio).toBeGreaterThanOrEqual(3.5);
                expect(ratio).toBeLessThanOrEqual(5.5 + 1e-6);
            } else if (setup.framing === 'MCU') {
                expect(ratio).toBeGreaterThanOrEqual(1.6);
                expect(ratio).toBeLessThanOrEqual(2.4);
            } else {
                expect(ratio).toBeGreaterThanOrEqual(0.45);
                expect(ratio).toBeLessThanOrEqual(0.9);
            }
        });
    });

    it('references no flower-head target on the recut path', () => {
        const recutStart = source.indexOf('const TRACK5_RECUT_DIRECTOR_CAMERA =');
        const recutEnd = source.indexOf('\nconst TRACK5_RECUT_FILM_TIMELINE =');
        const recutBlock = source.slice(recutStart, recutEnd);
        expect(recutBlock).not.toContain('TRACK5_FILM_FLOWER_HEAD');

        Object.values(recut.setups).forEach((setup) => {
            if (!Array.isArray(setup.targetPoint)) {
                return;
            }
            expect(setup.targetPoint).not.toEqual([0.959854, 5.612414, -0.038787]);
        });
    });

    it('authors measured forensic targets inside the relic bounding volume', () => {
        const boxMin = bounds.meta.boxMin;
        const boxMax = bounds.meta.boxMax;
        Object.values(MEASURED_FORENSIC_TARGETS).forEach((target) => {
            target.forEach((value, index) => {
                expect(value).toBeGreaterThanOrEqual(boxMin[index]);
                expect(value).toBeLessThanOrEqual(boxMax[index]);
            });
        });

        const usedTargets = new Set(
            Object.values(recut.setups)
                .filter((setup) => Array.isArray(setup.targetPoint))
                .map((setup) => setup.targetPoint.join(','))
        );
        Object.values(MEASURED_FORENSIC_TARGETS).forEach((target) => {
            expect(usedTargets.has(target.join(','))).toBe(true);
        });
    });

    it('locks bar 147 to the F8 low base-pool tar read (owner §3)', () => {
        const setup = recut.setups[recut.cutTimeline['147']];
        expect(recut.cutTimeline['147']).toBe('ecu_tar_rise');
        expect(setup.cameraFamily).toBe('F8');
        expect(setup.framing).toBe('ECU');
        expect(setup.height).toBe('low');
        expect(setup.targetPoint).toEqual(BASE_POOL);
    });

    it('keeps adjacent cuts differing in at least two composition axes', () => {
        const cutBars = sortedCutBars(recut);
        for (let i = 1; i < cutBars.length; i += 1) {
            const prev = recut.setups[recut.cutTimeline[String(cutBars[i - 1])]];
            const next = recut.setups[recut.cutTimeline[String(cutBars[i])]];
            expect(diffCount(shotSignature(prev), shotSignature(next))).toBeGreaterThanOrEqual(2);
        }
    });

    it('authors bar 94 as an 8-bar moving hand/egg MCU hold through bar 102', () => {
        expect(holdBarsFor(recut, 94)).toBe(8);

        const context = recut.setups.mcu_ridge_context;
        const slash = recut.setups.mcu_side_slash;

        expect(context.framing).toBe('MCU');
        expect(context.height).toBe('high');
        expect(context.pitchLock).toBe(true);
        expect(context.yaw).toBe(1.5);
        expect(context.pitch).toBe(0.20);
        expect(context.distance).toBe(12.8);
        expect(context.fov).toBe(36);
        expect(context.dollyPerBar).toBe(-0.11);
        expect(context.orbitPerBar).toBe(-0.035);
        expect(context.motionEase).toBe('ease-out');
        expect(context.targetPoint).toEqual(LOWER_SHOULDER);
        expect(Math.abs(context.orbitPerBar * holdBarsFor(recut, 94))).toBeCloseTo(0.28, 6);

        // Distinct bearing from rear-left bar 91; shares no quadrant with slash.
        expect(yawQuadrant(context.yaw)).toBe('pos_side');
        expect(yawQuadrant(slash.yaw)).toBe('neg_side');
        expect(recut.setups.ecu_surface_scar).toBeUndefined();
    });

    it('keeps bar 85 as the closer monument payoff', () => {
        const monument = recut.setups.ws_monument_low;
        expect(monument.yaw).toBe(0.35);
        expect(monument.distance).toBe(26.2);
        expect(monument.fov).toBe(28);

        const prehit = recut.setups.ws_dense_prehit;
        expect(prehit.distance).toBeGreaterThan(monument.distance);
    });

    it('resolves bars 75 and 85 to distinct breath vs monument poses on the real director', () => {
        const director = buildRecutDirector(recut, beatGrid);
        const breathScratch = {};
        const monumentScratch = {};
        const breath = director.resolve(downbeatTimeForBar(beatGrid, 75), breathScratch);
        const monument = director.resolve(downbeatTimeForBar(beatGrid, 85), monumentScratch);
        expect(breath.setupId).toBe('ws_dense_prehit');
        expect(monument.setupId).toBe('ws_monument_low');
        expect(cameraDistance(monument)).toBeLessThan(cameraDistance(breath));
        const positionDelta = Math.hypot(
            ...breath.pose.position.map((value, index) => value - monument.pose.position[index])
        );
        expect(positionDelta).toBeGreaterThan(0.5);
        expect(breath.pose.fov).not.toBeCloseTo(monument.pose.fov, 4);
    });

    it('authors motionEase only on the eleven eased moving cuts', () => {
        sortedCutBars(recut).forEach((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            if (Object.prototype.hasOwnProperty.call(EXPECTED_MOTION_EASE, bar)) {
                expect(setup.motionEase).toBe(EXPECTED_MOTION_EASE[bar]);
                return;
            }
            expect(setup.motionEase).toBeUndefined();
        });

        PROTECTED_STATIC_BARS.forEach((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            expect(setup.motionEase).toBeUndefined();
        });
    });

    it('keeps every authored orbit total at or under the 0.55 rad budget', () => {
        Object.entries(recut.setups).forEach(([id, setup]) => {
            const orbit = setup.orbitPerBar ?? 0;
            if (orbit === 0) {
                return;
            }
            const bar = Number.parseInt(
                Object.keys(recut.cutTimeline).find((key) => recut.cutTimeline[key] === id),
                10
            );
            const total = Math.abs(orbit) * holdBarsFor(recut, bar);
            expect(total).toBeLessThanOrEqual(0.55 + 1e-6);
        });
    });

    it('authors finite nonzero dollyPerBar only on the Stage 1A dolly bars', () => {
        const dollyByBar = {};

        sortedCutBars(recut).forEach((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            const dolly = setup.dollyPerBar;
            if (dolly !== undefined && dolly !== 0) {
                dollyByBar[bar] = dolly;
            }
            if (Object.prototype.hasOwnProperty.call(EXPECTED_DOLLY_BARS, bar)) {
                expect(Number.isFinite(dolly)).toBe(true);
                expect(dolly).toBe(EXPECTED_DOLLY_BARS[bar]);
            } else {
                expect(dolly === undefined || dolly === 0).toBe(true);
            }
        });

        expect(dollyByBar).toEqual(EXPECTED_DOLLY_BARS);
    });

    it('keeps every cut hold end inside measured H-ratio bands after dolly-aware motion', () => {
        const director = buildRecutDirector(recut, beatGrid);

        sortedCutBars(recut).forEach((bar) => {
            const setupId = recut.cutTimeline[String(bar)];
            const setup = recut.setups[setupId];
            expect(setup.screenX).toBe(0);
            expect(setup.screenY).toBe(0);

            const endTime = endOfHoldTime(beatGrid, recut, bar);
            const resolved = director.resolve(endTime);
            expect(resolved.setupId).toBe(setupId);

            const endDistance = cameraDistance(resolved);
            if (bar === BAND_TRANSITION_BAR) {
                // The one authored band crossing, pinned by value, not exempted.
                expect(endDistance).toBeGreaterThanOrEqual(BAND_TRANSITION_END_MIN);
                expect(endDistance).toBeLessThanOrEqual(BAND_TRANSITION_END_MAX);
            } else {
                assertHoldEndDistanceBand(setup.framing, endDistance / H);
            }

            if (Object.prototype.hasOwnProperty.call(EXPECTED_HOLD_END_DISTANCE, bar)) {
                expect(endDistance).toBeCloseTo(EXPECTED_HOLD_END_DISTANCE[bar], 2);
            }
        });
    });

    it('lands eased dolly holds at their authored end distances', () => {
        const director = buildRecutDirector(recut, beatGrid);

        Object.entries(EXPECTED_HOLD_END_DISTANCE).forEach(([barKey, endDistance]) => {
            const bar = Number.parseInt(barKey, 10);
            const endTime = endOfHoldTime(beatGrid, recut, bar);
            const resolved = director.resolve(endTime);
            expect(resolved.setupId).toBe(recut.cutTimeline[String(bar)]);
            expect(cameraDistance(resolved)).toBeCloseTo(endDistance, 2);
        });
    });

    it('authors in-shot orbit exactly on the Stage 1 movement map', () => {
        const orbitByBar = {};
        sortedCutBars(recut).forEach((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            const orbit = setup.orbitPerBar;
            if (orbit !== undefined && orbit !== 0) {
                orbitByBar[bar] = orbit;
            }
            if (Object.prototype.hasOwnProperty.call(EXPECTED_ORBIT_BARS, bar)) {
                expect(Number.isFinite(orbit)).toBe(true);
                expect(orbit).toBe(EXPECTED_ORBIT_BARS[bar]);
            } else {
                expect(orbit === undefined || orbit === 0).toBe(true);
            }
        });
        expect(orbitByBar).toEqual(EXPECTED_ORBIT_BARS);
    });

    it('keeps every moving hold above the perceptual movement floor', () => {
        // Gate: a hold that carries motion must change the frame enough to read as
        // movement — >=0.3 deg/s apparent orbit OR >=5% subject-scale change across
        // the hold (scale change is measured as the distance ratio, since fov is
        // constant within a shot). Bars are 4 beats at 93.5 BPM.
        const secondsPerBar = (4 * 60) / beatGrid.bpm;
        // The Stage 1 movement map. Bar 160 keeps its authored, owner-protected
        // +0.06 drift-away and is deliberately outside this gate.
        const movingBars = Object.keys(EXPECTED_ORBIT_BARS)
            .map((key) => Number.parseInt(key, 10))
            .filter((bar) => !PROTECTED_STATIC_BARS.includes(bar) || bar === 151);

        movingBars.forEach((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            const holdBars = holdBarsFor(recut, bar);
            const holdSeconds = holdBars * secondsPerBar;

            const orbitTotal = Math.abs((setup.orbitPerBar ?? 0) * holdBars);
            const orbitDegPerSecond = (orbitTotal * 180) / Math.PI / holdSeconds;

            const endDistance = setup.distance + ((setup.dollyPerBar ?? 0) * holdBars);
            const scaleChange = Math.abs((setup.distance / endDistance) - 1);

            expect(orbitDegPerSecond >= 0.3 || scaleChange >= 0.05).toBe(true);
            // Calm, not swooping: no moving hold may exceed the orbit budget.
            expect(orbitTotal).toBeLessThanOrEqual(0.55 + 1e-6);
        });
    });

    it('zeroes all in-shot motion under reduced motion', () => {
        const director = buildRecutDirector(recut, beatGrid);
        sortedCutBars(recut).forEach((bar) => {
            const startTime = downbeatTimeForBar(beatGrid, bar);
            const endTime = endOfHoldTime(beatGrid, recut, bar);
            const start = director.resolve(startTime, {}, { reducedMotion: true });
            const end = director.resolve(endTime, {}, { reducedMotion: true });
            expect(end.setupId).toBe(start.setupId);
            expect(cameraDistance(end)).toBeCloseTo(cameraDistance(start), 6);
            start.pose.position.forEach((value, index) => {
                expect(end.pose.position[index]).toBeCloseTo(value, 6);
            });
        });
    });

    it('drives bar 128 from the WS band into the transitional zone, monotonically', () => {
        const holdBars = holdBarsFor(recut, 128);
        expect(holdBars).toBe(11);

        const setup = recut.setups.ws_plateau_spiral;
        expect(setup.framing).toBe('WS');
        expect(setup.distance).toBe(27.5);
        expect(setup.fov).toBe(33);
        expect(setup.yaw).toBe(2.8);
        expect(setup.pitch).toBe(0.02);
        expect(setup.orbitPerBar).toBe(0.05);
        expect(setup.dollyPerBar).toBe(-0.65);
        expect(setup.motionEase).toBe('ease-in-out');
        // Explicitly authored band transition — never a blanket budget exemption.
        expect(setup.orbitBudgetExempt).toBeUndefined();

        const easedProgress = computeEasedMotionProgress(holdBars, holdBars, setup.motionEase);
        const orbitDelta = computeEasedOrbitDeltaRadians(
            setup.orbitPerBar,
            easedProgress,
            holdBars
        );
        expect(Math.abs(orbitDelta)).toBeCloseTo(0.55, 6);
        expect(Math.abs(orbitDelta)).toBeLessThanOrEqual(0.55 + 1e-6);

        const director = buildRecutDirector(recut, beatGrid);
        const startTime = downbeatTimeForBar(beatGrid, 128);
        const endTime = endOfHoldTime(beatGrid, recut, 128);

        const startDistance = cameraDistance(director.resolve(startTime));
        expect(startDistance).toBeCloseTo(27.5, 2);
        expect(startDistance / H).toBeGreaterThanOrEqual(3.5);
        expect(startDistance / H).toBeLessThanOrEqual(5.5 + 1e-6);

        const endDistance = cameraDistance(director.resolve(endTime));
        expect(endDistance).toBeCloseTo(20.35, 2);
        expect(endDistance).toBeGreaterThanOrEqual(BAND_TRANSITION_END_MIN);
        expect(endDistance).toBeLessThanOrEqual(BAND_TRANSITION_END_MAX);
        // Below the WS floor and above the MCU ceiling: a real transitional hold.
        expect(endDistance).toBeLessThan(3.5 * H);
        expect(endDistance).toBeGreaterThan(2.4 * H);

        // Monotonic approach across the whole hold — no drift back outward.
        const samples = [];
        for (let i = 0; i <= 10; i += 1) {
            const t = startTime + ((endTime - startTime) * (i / 10));
            samples.push(cameraDistance(director.resolve(t)));
        }
        for (let i = 1; i < samples.length; i += 1) {
            expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1e-9);
        }
        expect(samples[0] - samples[samples.length - 1]).toBeGreaterThan(7);

        // Bar 139 is untouched by this pass and still lands as an MCU insert.
        const shoulders = recut.setups.mcu_plateau_shoulders;
        expect(shoulders.framing).toBe('MCU');
        expect(shoulders.distance).toBe(13.6);
        expect(shoulders.fov).toBe(34);
        expect(shoulders.dollyPerBar).toBeUndefined();
        expect(shoulders.orbitPerBar).toBeUndefined();
    });

    it('is the only shot whose hold end leaves its nominal framing band', () => {
        const director = buildRecutDirector(recut, beatGrid);
        const strays = sortedCutBars(recut).filter((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            const ratio = cameraDistance(director.resolve(endOfHoldTime(beatGrid, recut, bar))) / H;
            if (setup.framing === 'WS') { return ratio < 3.5 || ratio > 5.5 + 1e-6; }
            if (setup.framing === 'MCU') { return ratio < 1.6 || ratio > 2.4; }
            return ratio < 0.45 || ratio > 0.9;
        });
        expect(strays).toEqual([BAND_TRANSITION_BAR]);
    });

    it('resolves the first cut at t=64 and every downbeat to its authoritative setup', () => {
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: recut.setups,
            cutTimeline: recut.cutTimeline,
            accentCuts: recut.accentCuts,
            defaultTargetPoint: recut.target,
            heightYByClass: recut.director.heightYByClass,
            enforceOrbitBudget: recut.director.enforceOrbitBudget
        });

        expect(director.resolve(64).setupId).toBe('mcu_void_entry');

        EXPECTED_CUTS.forEach(([bar, setupId]) => {
            const time = downbeatTimeForBar(beatGrid, bar);
            expect(time).not.toBeNull();
            expect(director.resolve(time).setupId).toBe(setupId);
        });
    });

    it('lands bar 186 with the default mcu_residue_right physical params verbatim (504 seam)', () => {
        const recutResidue = recut.setups.mcu_residue_right;
        const defaultResidue = defaultCamera.setups.mcu_residue_right;
        expect(defaultResidue).toBeDefined();
        expect(recutResidue.pitchLock).toBe(true);
        RESIDUE_PHYSICAL_KEYS.forEach((key) => {
            expect(recutResidue[key]).toEqual(defaultResidue[key]);
        });
    });

    it('matches default residue resolved poses at t=504 and t=506 via composite config', () => {
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera: recut });
        const compositeDirector = buildRecutDirector(composite, beatGrid);
        const defaultDirector = buildRecutDirector(defaultCamera, beatGrid);
        const scratch = {};

        [504, 506].forEach((time) => {
            const compositePose = copyResolvedPose(compositeDirector, time, scratch);
            const defaultPose = copyResolvedPose(defaultDirector, time, scratch);
            expect(compositePose.setupId).toBe('mcu_residue_right');
            expectPoseNear(compositePose, defaultPose);
        });
    });

    it('pitch-locks exactly the Stage 1A forensic and seam setups', () => {
        const locked = Object.entries(recut.setups)
            .filter(([, setup]) => setup.pitchLock === true)
            .map(([setupId]) => setupId)
            .sort();
        expect(locked).toEqual([...RECUT_PITCH_LOCK_ALLOWLIST].sort());

        RECUT_PITCH_LOCK_ALLOWLIST.forEach((setupId) => {
            expect(recut.setups[setupId].pitchLock).toBe(true);
        });

        // bar 151 stays unlocked: the director re-derives its pitch from the
        // `high` eye-line (7), so the authored 0.25 fallback is NOT what renders.
        const island = recut.setups.ws_island_bright;
        expect(island.pitchLock).toBeUndefined();
        expect(island.pitch).toBe(0.25);
        expect(island.yaw).toBe(0.85);
        expect(island.distance).toBe(33.0);
        expect(island.orbitPerBar).toBe(0.04);
    });

    it('bears bar 91 mcu_side_slash off the reserved bar 186 right-side ending', () => {
        const slash = recut.setups.mcu_side_slash;
        expect(slash.yaw).toBe(-2.35);
        // Family / band / rig / framing all unchanged by the re-bearing.
        expect(slash.cameraFamily).toBe('F4');
        expect(slash.framing).toBe('MCU');
        expect(slash.height).toBe('eye');
        expect(slash.pitch).toBe(0.02);
        expect(slash.distance).toBe(13.0);
        expect(slash.fov).toBe(40);
        expect(slash.lightRig).toBe('void_side_warm');
        expect(slash.pitchLock).toBeUndefined();
        expect(slash.targetPoint).toBeUndefined();

        // bar 186 reclaims the reserved right-side ending close-up: it is the last
        // cut on that bearing, and no other F4 MCU/eye setup shares it any more.
        const residueYaw = recut.setups.mcu_residue_right.yaw;
        const sharedBearingBars = sortedCutBars(recut).filter((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            return Math.abs(setup.yaw - residueYaw) < 0.1;
        });
        expect(sharedBearingBars).not.toContain(91);
        expect(sharedBearingBars[sharedBearingBars.length - 1]).toBe(186);

        const closeUpTwinBars = sharedBearingBars.filter((bar) => {
            const setup = recut.setups[recut.cutTimeline[String(bar)]];
            return setup.cameraFamily === 'F4' && setup.framing === 'MCU' && setup.height === 'eye';
        });
        expect(closeUpTwinBars).toEqual([160, 186]);
    });

    it('declares recut config after the default timeline and leaves the default block untouched', () => {
        const chamberIndex = source.indexOf('const TRACK5_CHAMBER_FILM_TIMELINE =');
        const recutDirectorIndex = source.indexOf('const TRACK5_RECUT_DIRECTOR_CAMERA =');
        const recutTimelineIndex = source.indexOf('const TRACK5_RECUT_FILM_TIMELINE =');
        expect(chamberIndex).toBeGreaterThan(0);
        expect(recutDirectorIndex).toBeGreaterThan(chamberIndex);
        expect(recutTimelineIndex).toBeGreaterThan(recutDirectorIndex);

        // Default film-config slice must not contain any recut tokens.
        const defaultStart = source.indexOf('const TRACK5_FILM_DIRECTOR_CAMERA = ');
        const defaultEnd = source.indexOf('\nconst TRACK5_CHAMBER_FILM_TIMELINE =');
        const defaultBlock = source.slice(defaultStart, defaultEnd);
        expect(defaultBlock).not.toContain('TRACK5_RECUT');
    });

    it('wires the recut flag and director swap into the runtime', () => {
        expect(source).toContain('this.recutEnabled = false');
        expect(source).toContain('this.recutEnabled = filmFlags.recut');
        expect(source).toContain('createTrack5RecutCameraConfig');
        expect(source).toContain('heightYByClass: directorConfig.heightYByClass');
    });

    it('wires the recut-only ?lehr=1 lookdev bundle without touching the default film', () => {
        expect(source).toContain('this.lehrEnabled = false');
        expect(source).toContain('this.lehrEnabled = filmFlags.lehr');
        expect(source).toContain('createRecutLehr');
        expect(source).toContain('recutActive && this.lehrEnabled === true ? createRecutLehr()');
        const defaultStart = source.indexOf('const TRACK5_FILM_DIRECTOR_CAMERA = ');
        const defaultEnd = source.indexOf('\nconst TRACK5_CHAMBER_FILM_TIMELINE =');
        const defaultBlock = source.slice(defaultStart, defaultEnd);
        expect(defaultBlock).not.toContain('LEHR');
        expect(defaultBlock).not.toContain('lehr');
    });

    it('wires the recut-only ?listen=1 commit + rotating accents without touching the default film', () => {
        expect(source).toContain('this.listenEnabled = false');
        expect(source).toContain('this.listenEnabled = filmFlags.listen');
        expect(source).toContain('createRecutListen');
        expect(source).toContain('recutActive && this.listenEnabled === true ? createRecutListen()');
        expect(source).toContain('RECUT_LISTEN_COMMIT_CONFIG');
        const defaultStart = source.indexOf('const TRACK5_FILM_DIRECTOR_CAMERA = ');
        const defaultEnd = source.indexOf('\nconst TRACK5_CHAMBER_FILM_TIMELINE =');
        const defaultBlock = source.slice(defaultStart, defaultEnd);
        expect(defaultBlock).not.toContain('LISTEN');
        expect(defaultBlock).not.toContain('listen');
        expect(defaultBlock).not.toContain('recutListen');
    });
});

describe('Track 5 recut phrase-light table (Fable Option B v2)', () => {
    const source = readExperienceSource();
    const recut = loadRecutDirectorCamera(source);
    const phrases = loadLightPhrases(source);

    function rigForBar(bar) {
        return recut.setups[recut.cutTimeline[String(bar)]].lightRig;
    }

    it('declares exactly the 22 authoritative v2 phrase rows', () => {
        expect(phrases).toHaveLength(22);
        phrases.forEach((row, index) => {
            const want = EXPECTED_PHRASES[index];
            expect(row.id).toBe(want.id);
            expect(row.startBar).toBe(want.startBar);
            expect(row.endBar).toBe(want.endBar);
            expect(row.lightRig).toBe(want.lightRig);
            expect(row.cameraCutBars).toEqual(want.cameraCutBars);
            if (want.rekeyOnly) {
                expect(row.rekeyOnly).toBe(true);
            } else {
                expect(row.rekeyOnly).toBeUndefined();
            }
        });
    });

    it('covers every one of the 25 recut cut bars in exactly one cameraCutBars entry', () => {
        const cutBars = sortedCutBars(recut);
        const phraseCutBars = phrases.flatMap((row) => row.cameraCutBars);
        expect(new Set(phraseCutBars).size).toBe(phraseCutBars.length);
        expect([...phraseCutBars].sort((a, b) => a - b)).toEqual(cutBars);
        expect(phraseCutBars).toHaveLength(25);
    });

    it('keeps phrase windows contiguous from bar 25 through 195 with p03 and p05 the rekeyOnly rows', () => {
        expect(phrases[0].startBar).toBe(25);
        expect(phrases[phrases.length - 1].endBar).toBe(195);
        for (let i = 1; i < phrases.length; i += 1) {
            expect(phrases[i].startBar).toBe(phrases[i - 1].endBar);
        }
        const rekeyRows = phrases.filter((row) => row.rekeyOnly === true);
        expect(rekeyRows).toHaveLength(2);
        expect(rekeyRows.map((row) => row.id)).toEqual(['p03', 'p05']);
        expect(rekeyRows[0].cameraCutBars).toEqual([]);
        expect(rekeyRows[1].cameraCutBars).toEqual([]);
    });

    it('maps each cut setup lightRig to its phrase rig', () => {
        phrases.forEach((row) => {
            row.cameraCutBars.forEach((bar) => {
                const setupId = recut.cutTimeline[String(bar)];
                const setupRig = recut.setups[setupId].lightRig;
                expect(setupRig).toBe(row.lightRig);
            });
        });
    });

    it('shares one rig across every camera cut in a multi-cut phrase', () => {
        phrases
            .filter((row) => row.cameraCutBars.length > 1)
            .forEach((row) => {
                const rigs = row.cameraCutBars.map(rigForBar);
                expect(new Set(rigs)).toEqual(new Set([row.lightRig]));
            });
    });

    it('keeps adjacent phrases on distinct light rigs', () => {
        for (let i = 1; i < phrases.length; i += 1) {
            const prev = phrases[i - 1];
            const curr = phrases[i];
            // Owner warmth pass: pressure_top runs contiguously p10→p13 (4:08–4:48).
            if (
                curr.lightRig === 'pressure_top'
                && prev.lightRig === 'pressure_top'
                && ['p10', 'p11', 'p12'].includes(prev.id)
                && ['p11', 'p12', 'p13'].includes(curr.id)
            ) {
                continue;
            }
            expect(curr.lightRig).not.toBe(prev.lightRig);
        }
    });

    it('uses only rigs that exist (default set plus the four warm P5 rigs)', () => {
        const allowed = new Set([
            'back_silhouette',
            'wet_specular',
            'fracture',
            'void_side_warm',
            'pressure_top',
            'plateau_rim_pulse',
            'low_key_grazing'
        ]);
        phrases.forEach((row) => {
            expect(allowed.has(row.lightRig)).toBe(true);
        });
        // No cool/legacy placeholder rigs survive on the recut path.
        const usedRigs = new Set(
            Object.values(recut.setups).map((setup) => setup.lightRig)
        );
        expect(usedRigs.has('cold_side')).toBe(false);
        expect(usedRigs.has('void_rim')).toBe(false);
        expect(usedRigs.has('pressure')).toBe(false);
    });

    it('locks the audio-cited anchors: 186/147 wet_specular, 128/139/171 plateau, 151 pressure_top', () => {
        expect(rigForBar(186)).toBe('wet_specular');
        expect(rigForBar(147)).toBe('wet_specular');
        expect(rigForBar(128)).toBe('plateau_rim_pulse');
        expect(rigForBar(139)).toBe('plateau_rim_pulse');
        expect(rigForBar(171)).toBe('plateau_rim_pulse');
        expect(rigForBar(151)).toBe('pressure_top');
    });

    it('carries the phrase table on the recut timeline object by reference assignment', () => {
        expect(source).toContain('TRACK5_RECUT_FILM_TIMELINE.lightPhrases = TRACK5_RECUT_LIGHT_PHRASES');
        expect(source).toContain('phraseTable: TRACK5_RECUT_FILM_TIMELINE.lightPhrases');
        const authored = loadLightPhrases(source);
        const wired = { lightPhrases: authored };
        wired.lightPhrases = authored;
        expect(wired.lightPhrases).toBe(authored);
    });
});

// Step 5 recut cleanup (build spec §2.1/§2.10): the audio-led recut deletes the
// glowing bokeh orbs, the cool blue left-back gaze wall (+ its tightly-coupled
// left cool haze plume), the blue dotted floor aisle ('risquinhos' radiating
// lines), the centered bar-0 title card, and the god ray — while keeping the
// permanent left title, and leaving the default film path untouched.
// Runtime removal is exercised by the live visual checkpoint; these assertions
// pin the source seams so a future edit cannot silently reintroduce the vocabulary.
describe('Track 5 recut Step 5 visual cleanup', () => {
    const source = readExperienceSource();
    const recut = loadRecutDirectorCamera(source);

    it('keeps recut accentCuts empty so the ~1.3s flower accent cannot fire (§5)', () => {
        expect(recut.accentCuts).toEqual([]);
    });

    it('forces the god ray off on the recut path regardless of ?godray=1', () => {
        expect(source).toMatch(/if \(this\.recutEnabled\) \{\s*this\.godRayEnabled = false;/);
    });

    it('zeroes living-chamber bokeh at the config seam under recut', () => {
        // The seam also covers the physical scene; assert the recut branch is still part of it.
        expect(source).toMatch(/if \(this\.recutEnabled === true(?: \|\| this\.usesPhysicalScene\(\))?\) \{\s*resolved = \{\s*\.\.\.resolved,\s*bokeh: \{ \.\.\.\(resolved\.bokeh \|\| \{\}\), count: 0, opacityMax: 0 \}/);
    });

    it('suppresses the cool gaze wall, haze plume, and blue floor aisle under recut', () => {
        expect(source).toContain('const suppressRecutCoolFields = this.recutEnabled === true;');
        expect(source).toContain('if (gazeWallConfig && !suppressRecutCoolFields) {');
        expect(source).toContain('if (hazePlumeConfig && !suppressRecutCoolFields) {');
        // The blue dotted aisleField joins the gated cool vocabulary (radiating
        // floor 'risquinhos' the owner rejected), so it cannot build under recut.
        expect(source).toContain('if (aisleFieldConfig && !suppressRecutCoolFields) {');
    });

    it('keeps the default aisle-field build seam intact for the non-recut film path', () => {
        // The creation body is only gated by the recut flag, so the default film
        // (recut off) still builds the floor aisle exactly as before.
        expect(source).toContain('this.aisleField = this.createPointField(aislePositions, {');
        expect(source).toContain('this.aisleField.userData.opacityGain = aisleFieldConfig.opacityGain');
    });

    it('preserves the right-side witnesses as unconditional room structure', () => {
        // Only the rejected cool fields are gated; the right void witnesses stay
        // unconditional, and disposal of a stale aisle field is null-safe/idempotent.
        expect(source).toContain('if (voidWitnessConfig) {');
        expect(source).toContain('this.aisleField?.geometry?.dispose?.();');
        expect(source).toContain('this.aisleField?.material?.dispose?.();');
    });

    it('passes recut title-card suppression into the shell before setTrack', () => {
        expect(source).toContain(
            'this.shell.setTitleCardSuppressed(this.recutEnabled === true && this.isTrack5Film())'
        );
        const suppressIndex = source.indexOf('this.shell.setTitleCardSuppressed(');
        const setTrackIndex = source.indexOf('this.shell.setTrack(');
        expect(suppressIndex).toBeGreaterThan(0);
        expect(setTrackIndex).toBeGreaterThan(suppressIndex);
    });
});

// Step 6 recut light score: the false-dawn key/rim/exposure modifiers must apply
// only while pressure_top is the active rig (build spec §6.1 phrase 21). Bars
// 151–160 already resolve to pressure_top, so this is behaviorally identical to
// the pure envelope window — these assertions pin the source seams so a future
// edit cannot silently apply the false-dawn lift to another rig.
describe('Track 5 recut Step 6 climax cut-bar schedule', () => {
    const recut = loadRecutDirectorCamera(readExperienceSource());
    const { RECUT_CLIMAX_START_BAR, RECUT_CLIMAX_END_BAR, RECUT_CLIMAX_CUT_BARS } = RECUT_LIGHT_SCORE_CONSTANTS;

    it('matches recut cutTimeline bars inside the climax window [75, 125]', () => {
        const expected = sortedCutBars(recut).filter(
            (bar) => bar >= RECUT_CLIMAX_START_BAR && bar <= RECUT_CLIMAX_END_BAR
        );
        expect([...RECUT_CLIMAX_CUT_BARS]).toEqual(expected);
        expect(RECUT_CLIMAX_CUT_BARS).not.toContain(97);
    });
});

describe('Track 5 recut Step 6 false-dawn rig gate', () => {
    const source = readExperienceSource();

    it('gates the false-dawn key/rim multipliers on the pressure_top active rig', () => {
        expect(source).toContain(
            "if (this.activeLightRigId === 'pressure_top') {\n"
            + '                recutKeyMul = this.recutLightScore.falseDawnKeyMultiplierAt(elapsed);\n'
            + '                recutRimMul *= this.recutLightScore.falseDawnRimMultiplierAt(elapsed);'
        );
    });

    it('keeps the climax rim/back pulse independent of the active rig', () => {
        expect(source).toContain('const climaxMul = this.recutLightScore.climaxRimMultiplierAt(elapsed);');
        expect(source).toContain('recutRimMul = climaxMul;');
        expect(source).toContain('recutBackMul = climaxMul;');
    });

    it('gates the false-dawn exposure delta on the same pressure_top active rig', () => {
        expect(source).toContain(
            '&& this.activeLightRigId === \'pressure_top\'\n'
            + '        ) {\n'
            + '            toneMappingExposureBase += this.recutLightScore.falseDawnExposureDeltaAt(elapsed);'
        );
    });
});

describe('Track 5 recut Stage 1B phrase-light runtime integration', () => {
    const source = readExperienceSource();
    const beatGrid = loadBeatGrid();
    const defaultCamera = loadDefaultDirectorCamera(source);
    const recut = loadRecutDirectorCamera(source);
    const phrases = loadLightPhrases(source);
    const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera: recut });
    const compositeDirector = buildRecutDirector(composite, beatGrid);
    const resolveScratch = {};
    const resolveCameraAt = (timeSeconds) => compositeDirector.resolve(timeSeconds, resolveScratch);
    const resolver = createLightRigResolver({ subjectPoint: CENTER });

    it('imports helper/state surfaces and wires runtime table by reference', () => {
        expect(source).toContain("import { createRecutPhraseLight, resolveRecutPhraseLightFrame } from './recut-phrase-light.js';");
        expect(source).toContain('this.recutPhraseLight = null;');
        expect(source).toContain('this.recutPhraseLightResolved = {};');
        expect(source).toContain('this.recutPhraseLightFrame = {};');
        expect(source).toContain('this.phraseCameraScratch = {');
        expect(source).toContain('this.activeLightPhraseId = \'\';');
        expect(source).toContain('this.shotDirectorBeatGrid = null;');
        expect(source).toContain('TRACK5_RECUT_FILM_TIMELINE.lightPhrases = TRACK5_RECUT_LIGHT_PHRASES');
        expect(source).toContain('phraseTable: TRACK5_RECUT_FILM_TIMELINE.lightPhrases');
        const wired = { lightPhrases: phrases };
        wired.lightPhrases = phrases;
        expect(wired.lightPhrases).toBe(phrases);
    });

    it('builds the phrase score only on recut + lightarc with dedicated bootstrap scratch', () => {
        expect(source).toContain('this.shotDirectorBeatGrid = beatGrid;');
        expect(source).toContain('recutActive');
        expect(source).toContain('&& this.lightArcEnabled');
        expect(source).toContain('&& this.shotDirector?.isActive?.()');
        expect(source).toContain('phraseTable: TRACK5_RECUT_FILM_TIMELINE.lightPhrases');
        expect(source).toContain('beatGrid: this.shotDirectorBeatGrid');
        expect(source).toContain('createLightRigResolver().listIds()');
        expect(source).toContain('this.shotDirector.resolve(timeSeconds, this.phraseCameraScratch)');
        expect(source).not.toContain('this.shotDirector.resolve(timeSeconds, this.shotDirectorResolved)');
        expect(source).toContain('no reducedMotion flag');
        expect(source).toContain('this.recutPhraseLight = phraseCandidate;');
        expect(source).toContain('[Prototype] Recut phrase-light score invalid');
        expect(source).toContain('invalid authored phrase table must surface in all builds');
    });

    it('resets phrase-light, light-score, and frame caches during bootstrap and destroy', () => {
        expect(source).toContain('this.recutLightScore = null;');
        expect(source).toContain('this.recutPhraseLightFrame.phraseId = \'\';');
        expect(source).toContain('this.recutPhraseLightResolved.anchorPosition = null;');
        const bootstrapStart = source.indexOf('async bootstrapShotDirector()');
        const bootstrapBody = source.slice(bootstrapStart, bootstrapStart + 2600);
        expect(bootstrapBody.indexOf('this.recutPhraseLight = null;')).toBeGreaterThan(0);
        expect(bootstrapBody.indexOf('this.recutLightScore = null;')).toBeGreaterThan(0);
        expect(bootstrapBody.indexOf('this.recutPhraseLightFrame.rekey = false;')).toBeGreaterThan(0);
        expect(source).toMatch(/destroy\(\)[\s\S]*this\.recutPhraseLightFrame\.anchorPosition = null;/);
    });

    it('does not rebuild phrase schedule on seek', () => {
        const seekIndex = source.indexOf('async seek(ratio)');
        // Whole method body (to the closing brace at method indent), not a fixed window.
        const seekBody = source.slice(seekIndex, source.indexOf('\n    }\n', seekIndex));
        expect(seekBody).toContain('ShotDirector resolve() is stateless');
        expect(seekBody).not.toContain('recutPhraseLight');
        expect(seekBody).not.toContain('bootstrapShotDirector');
    });

    it('routes updateLighting through resolveRecutPhraseLightFrame and phrase-owned cache', () => {
        expect(source).toContain('resolveRecutPhraseLightFrame(');
        expect(source).toContain('this.recutPhraseLightFrame');
        expect(source).toContain('if (rekey) {');
        expect(source).toContain('this.activeLightSetupId = \'\';');
        expect(source).toContain('if (this.activeLightPhraseId !== \'\') {');
        expect(source).toContain('this.camera.position');
        expect(source).not.toContain('this.recutPhraseLight.at(elapsed, this.recutPhraseLightResolved)');
    });

    it('applies authored rig channel colors from lightRigState at runtime', () => {
        expect(source).toContain('this.rigKeyColor = new THREE.Color();');
        expect(source).toContain('this.rigRimColor = new THREE.Color();');
        expect(source).toContain('this.rigBackColor = new THREE.Color();');
        expect(source).toContain('const rigKeyColor = keyBase !== null ? this.lightRigState?.key?.color : null;');
        expect(source).toContain('const rigRimColor = keyBase !== null ? this.lightRigState?.rim?.color : null;');
        expect(source).toContain('const rigBackColor = keyBase !== null ? this.lightRigState?.back?.color : null;');
        expect(source).toContain('this.keyLight.color.copy(this.rigKeyColor.set(rigKeyColor));');
        expect(source).toContain('this.rimLight.color.copy(this.rigRimColor.set(rigRimColor));');
        expect(source).toContain('this.backLight.color.copy(this.rigBackColor.set(rigBackColor));');

        const resolver = createLightRigResolver({ subjectPoint: CENTER });
        const out = resolver.createState();
        resolver.resolve('pressure_top', [0, 2, 12], 0, out);
        expect(out.key.color).toBe('#ffe4c8');
        expect(out.rim.color).toBe('#f4ede3');
        expect(out.back.color).toBe('#f4ede3');
    });

    it('authors mcu_climax_peak with pressure_top to match phrase p12', () => {
        expect(recut.setups.mcu_climax_peak.lightRig).toBe('pressure_top');
        expect(recut.setups[recut.cutTimeline['107']].lightRig).toBe('pressure_top');
    });

    it('documents the p22 wet tail flower-head override exception', () => {
        expect(source).toContain('p22 (bars 186–195) stores a wet_specular phrase-start anchor');
        expect(source).toContain('flower-head key override');
        expect(source).toContain("this.activeLightRigId === 'wet_specular' && elapsed >= 465 && elapsed <= 520");
    });

    it('activates the real v2 phrase table on the composite director beat grid', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: phrases,
            resolveCameraAt,
            lightRigIds: resolver.listIds()
        });
        expect(score.validate().ok).toBe(true);
        expect(score.list()).toHaveLength(EXPECTED_PHRASES.length);
    });

    it('falls back when phrase validation fails instead of throwing', () => {
        const invalid = createRecutPhraseLight({
            beatGrid,
            phraseTable: [
                { id: 'dup', startBar: 25, endBar: 30, lightRig: 'pressure_top' },
                { id: 'dup', startBar: 30, endBar: 35, lightRig: 'back_silhouette' }
            ],
            resolveCameraAt,
            lightRigIds: resolver.listIds()
        });
        expect(invalid.validate().ok).toBe(false);
        expect(invalid.at(downbeatTimeForBar(beatGrid, 25), {})).toBeNull();
    });

    it('leaves partial recut without lightarc on the setup fallback path', () => {
        expect(source).toContain(
            'recutActive\n            && this.lightArcEnabled\n            && this.shotDirector?.isActive?.()'
        );
        expect(source).toContain('this.recutPhraseLight = phraseCandidate;');
    });

    it('executes the runtime frame helper against the real composite score', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: phrases,
            resolveCameraAt,
            lightRigIds: resolver.listIds()
        });
        const queryOut = {};
        const frameOut = {};
        const t60 = downbeatTimeForBar(beatGrid, 60);
        const bar60 = resolveRecutPhraseLightFrame(score, t60, queryOut, 'p04', 'pressure_top', frameOut);
        expect(bar60.rekey).toBe(true);
        expect(bar60.phraseId).toBe('p05');

        const t139 = downbeatTimeForBar(beatGrid, 139) + 0.5;
        const bar139 = resolveRecutPhraseLightFrame(
            score,
            t139,
            queryOut,
            'p16',
            'plateau_rim_pulse',
            frameOut
        );
        expect(bar139.rekey).toBe(false);
    });
});

// Stage 2a atmosphere: the void lift must be recut-only and must reuse the
// existing fog / dust / background expressions rather than adding a system.
// These assertions pin the source seams so a future edit cannot leak the lift
// onto the default film path or spawn a second particle stack.
describe('Track 5 recut Stage 2a atmosphere wiring', () => {
    const source = readExperienceSource();
    const compact = (s) => s.replace(/\s+/g, ' ').trim();

    it('imports only the factory — nothing build-time-only leaks in', () => {
        expect(source).toContain(
            "import { createRecutAtmosphere } from './recut-atmosphere.js';"
        );
    });

    it('builds the instance once, recut-gated, beside the other recut scores', () => {
        expect(source).toContain('this.recutAtmosphere = recutActive ? createRecutAtmosphere() : null;');
        expect(source).toContain(
            'this.recutAtmosphereLiftColor = this.recutAtmosphere\n'
            + '            ? new THREE.Color(this.recutAtmosphere.getConfig().backgroundLiftColor)\n'
            + '            : null;'
        );
        const scoreIndex = source.indexOf('this.recutLightScore = recutActive ? createRecutLightScore(');
        const atmosphereIndex = source.indexOf('this.recutAtmosphere = recutActive ?');
        expect(scoreIndex).toBeGreaterThan(0);
        expect(atmosphereIndex).toBeGreaterThan(scoreIndex);
    });

    it('branches the fog clamp entirely, leaving the default 0.008–0.04 path intact', () => {
        expect(compact(source)).toContain(compact('this.scene.fog.density = clamp(fogDrive, 0.008, 0.04);'));
        expect(compact(source)).toContain(compact(
            'this.scene.fog.density = clamp(\n'
            + '                    fogDrive + this.recutAtmosphere.fogDensityAddAt(elapsed),\n'
            + '                    0.008,\n'
            + '                    this.recutAtmosphere.fogDensityMaxAt(elapsed)\n'
            + '                );'
        ));
        expect(source).toContain('if (this.recutAtmosphere && this.isRecutActive()) {');
    });

    it('branches the dust clamp entirely, leaving the default ceiling path intact', () => {
        // Float multiplication is not associative, so the default branch must keep
        // the shipped operand order verbatim, not a re-grouped equivalent.
        expect(compact(source)).toContain(compact(
            'this.dust.material.opacity = clamp(\n'
            + '                dustDrive * dustPresence * introMix * dustIntro'
            + ' * (this.livingChamber?.outputs.dustMul ?? 1)\n'
            + ' * (isSonoiteCinema ? consecrationHazeArc : 1)'
            + ' * (isHorasMortasCinema ? sodiumHazeArc : 1),\n'
            + '                0,\n'
            + '                variantConfig.dustOpacityMax ?? 0.16\n'
            + '            );'
        ));
        expect(compact(source)).toContain(compact(
            '(dustDrive + this.recutAtmosphere.dustOpacityAddAt(elapsed))\n'
            + '                * dustPresence * introMix * dustIntro'
            + ' * (this.livingChamber?.outputs.dustMul ?? 1)'
            + ' * (isSonoiteCinema ? consecrationHazeArc : 1),'
        ));
        expect(source).toContain('this.recutAtmosphere.dustOpacityMaxAt(elapsed)');
        expect(source).not.toContain('const dustEnvelope =');
    });

    it('applies the background lift after the existing cool->warm lerp, recut-only', () => {
        const backgroundIndex = source.indexOf(
            'this.scene.background.copy(this.backgroundCoolColor).lerp('
        );
        const liftIndex = source.indexOf('this.recutAtmosphere.backgroundLiftAt(elapsed)');
        expect(backgroundIndex).toBeGreaterThan(0);
        expect(liftIndex).toBeGreaterThan(backgroundIndex);
        expect(source).toContain(
            'if (this.recutAtmosphere && this.recutAtmosphereLiftColor && this.isRecutActive()) {\n'
            + '                this.scene.background.lerp(\n'
            + '                    this.recutAtmosphereLiftColor,\n'
            + '                    this.recutAtmosphere.backgroundLiftAt(elapsed)\n'
            + '                );'
        );
    });

    it('leaves the dust particle count and size entirely alone', () => {
        // The count is fixed at construction and so cannot be windowed; branching
        // it measurably changed the owner-accepted 0-64s opening. Stage 2a gets its
        // dust visibility from the windowed opacity additive instead.
        expect(source).toContain('const dustCount = this.chamberConfig.air.dustCount;');
        expect(source).not.toContain('RECUT_ATMOSPHERE_DUST_COUNT');
        expect(source).toContain('this.dust.material.size = this.chamberConfig.air.dustSize;');
        expect(source).not.toContain('RECUT_ATMOSPHERE_DUST_SIZE');
    });

    it('adds no new object, system or particle stack for the lift', () => {
        const forbidden = [
            'createRecutAtmosphereMesh',
            'recutAtmosphereSprites',
            'recutHazePlume',
            'recutBokeh',
            'recutGodRay',
            'recutGazeWall',
            'recutAisleField'
        ];
        forbidden.forEach((token) => {
            expect(source).not.toContain(token);
        });
        // The lift only ever touches expressions that already existed.
        expect(source).not.toContain('this.scene.add(this.recutAtmosphere');
    });

    it('never consults the atmosphere without the recut gate', () => {
        const calls = source.match(/this\.recutAtmosphere\.\w+\(/g) || [];
        expect(calls.length).toBeGreaterThan(0);
        // Every call site sits inside a block guarded by isRecutActive().
        const guardedBlocks = source.split('this.isRecutActive()');
        const beforeFirstGuard = guardedBlocks[0];
        expect(beforeFirstGuard).not.toContain('this.recutAtmosphere.fogDensityAddAt');
        expect(beforeFirstGuard).not.toContain('this.recutAtmosphere.dustOpacityAddAt');
        expect(beforeFirstGuard).not.toContain('this.recutAtmosphere.backgroundLiftAt');
    });

    it('clears atmosphere fields on constructor init, bootstrap reset, and teardown', () => {
        expect(source.match(/this\.recutAtmosphere = null;/g).length).toBeGreaterThanOrEqual(3);
        expect(source.match(/this\.recutAtmosphereLiftColor = null;/g).length).toBeGreaterThanOrEqual(3);
        const bootstrapStart = source.indexOf('async bootstrapShotDirector()');
        const bootstrapBody = source.slice(bootstrapStart, bootstrapStart + 2600);
        const track5Guard = bootstrapBody.indexOf('if (!this.isTrack5Film())');
        expect(bootstrapBody.indexOf('this.recutAtmosphere = null;')).toBeGreaterThan(0);
        expect(bootstrapBody.indexOf('this.recutAtmosphere = null;')).toBeLessThan(track5Guard);
        expect(bootstrapBody.indexOf('this.recutAtmosphereLiftColor = null;')).toBeLessThan(track5Guard);
        const disposeIndex = source.lastIndexOf('this.recutAtmosphere = null;');
        const relicIndex = source.indexOf('this.relicMutation = null;');
        expect(disposeIndex).toBeGreaterThan(relicIndex);
    });
});

describe('Track 5 recut Stage 2b forensic trace wiring', () => {
    const source = readExperienceSource();
    const plateShader = source.slice(
        source.indexOf('const Track5PlateShader = {'),
        source.indexOf('const FloorMemoryShader = {')
    );

    it('imports only the factory', () => {
        expect(source).toContain(
            "import { createRecutVisualScore } from './recut-visual-score.js';"
        );
        expect(plateShader.length).toBeGreaterThan(0);
    });

    it('builds the score once, recut-gated, from the same authoritative beat grid', () => {
        const gridIndex = source.indexOf('const beatGrid = await this.fetchShotDirectorBeatGrid(trackSlug);');
        const lightIndex = source.indexOf('this.recutLightScore = recutActive ? createRecutLightScore({ beatGrid });'.slice(0, 60));
        const buildIndex = source.indexOf('const visualCandidate = createRecutVisualScore({ beatGrid });');
        expect(gridIndex).toBeGreaterThan(0);
        expect(lightIndex).toBeGreaterThan(gridIndex);
        // Constructed beside the other recut scores, off the one loaded grid.
        expect(buildIndex).toBeGreaterThan(lightIndex);
        expect(source).toContain('        this.recutVisualScore = null;\n        if (recutActive) {');
        // Exactly one construction site — the score is never rebuilt on seek.
        expect(source.match(/createRecutVisualScore\(/g)).toHaveLength(1);
    });

    it('drops the score entirely when the grid cannot supply its bars', () => {
        expect(source).toContain(
            '            const visualValidation = visualCandidate.validate();\n'
            + '            if (visualValidation.ok) {\n'
            + '                this.recutVisualScore = visualCandidate;\n'
            + '            } else {'
        );
        expect(source).toContain("console.warn('[Prototype] Recut visual score invalid'");
    });

    it('clears the score on reset and teardown', () => {
        expect(source.match(/this\.recutVisualScore = null;/g).length).toBeGreaterThanOrEqual(4);
        const disposeIndex = source.lastIndexOf('this.recutVisualScore = null;');
        const relicIndex = source.indexOf('this.relicMutation = null;');
        expect(disposeIndex).toBeGreaterThan(relicIndex);
    });

    it('declares the traceCool uniform with a neutral 0 default', () => {
        expect(plateShader).toContain('traceCool: { value: 0.0 }');
        expect(plateShader).toContain('uniform float traceCool;');
    });

    it('folds the additive into the existing strength expression before the clamp', () => {
        // The shipped sub-expression must survive verbatim — the additive is a
        // trailing term, so the default path is `x + 0` and stays bit-exact.
        expect(source).toContain(
            '            this.track5PlatePass.uniforms.strength.value = clamp(\n'
            + '                (this.state.started ? lerp(idleStrength, baseStrength, introReveal) : idleStrength)\n'
            + '                + (chamberLaw.erasure || 0) * erasureBoost\n'
            + '                + recutPlateStrengthAdd,\n'
            + '                0,\n'
            + '                1\n'
            + '            );'
        );
    });

    it('drives both values only on the recut path, from absolute elapsed time', () => {
        expect(source).toContain(
            'const recutTraceActive = Boolean(this.recutVisualScore) && this.isRecutActive();'
        );
        expect(source).toContain(
            '            const recutPlateStrengthAdd = recutTraceActive\n'
            + '                ? this.recutVisualScore.plateStrengthAddAt(elapsed)\n'
            + '                : 0;'
        );
        expect(source).toContain(
            '            this.track5PlatePass.uniforms.traceCool.value = recutTraceActive\n'
            + '                ? this.recutVisualScore.traceCoolAt(elapsed)\n'
            + '                : 0;'
        );
        // No phrase or camera dependency — the score is a pure function of time.
        const calls = source.match(/this\.recutVisualScore\.\w+\([^)]*\)/g) || [];
        expect(calls).toHaveLength(2);
        calls.forEach((call) => {
            expect(call).toMatch(/\(elapsed\)$/);
        });
        expect(source).not.toContain('recutVisualScore.plateStrengthAddAt(this.activeLightPhraseId');
    });

    it('masks the trace on BOTH source luma and the existing 4-neighbour edge', () => {
        // The luma gate is a factor, so a high edge in the void cannot let a
        // pixel in on its own — that is the floor/void guard.
        expect(plateShader).toContain('float traceLumaGate = smoothstep(0.035, 0.22, luma);');
        expect(plateShader).toContain('float traceEdgeGate = smoothstep(0.015, 0.12, edge);');
        expect(plateShader).toContain(
            'traceMask = traceLumaGate * (0.34 + 0.66 * traceEdgeGate);'
        );
        // Soft, never binary: no step()/threshold outline for the trace.
        expect(plateShader).not.toContain('step(0.5, traceMask');
        expect(plateShader).not.toContain('float traceMask = step(');
    });

    it('uses one restrained blue-grey, applied luma-preservingly', () => {
        expect(plateShader).toContain('const vec3 TRACE_TINT = vec3(0.929675, 1.007148, 1.136273);');
        // Rec.709 luma of the tint is 1.0, so the tint recolours without lifting.
        const tint = [0.929675, 1.007148, 1.136273];
        const tintLuma = tint[0] * 0.2126 + tint[1] * 0.7152 + tint[2] * 0.0722;
        expect(tintLuma).toBeCloseTo(1.0, 5);
        expect(plateShader).toContain('if (traceAmount > 0.0) {');
        expect(plateShader).toContain('plate *= mix(vec3(1.0), TRACE_TINT, traceMask * traceAmount);');
        // Grain rides the same single axis at the tuned gain (live A/B: 0.38 was
        // under-legible at the peak, 0.55 reads as silver-halide tooth without
        // touching the score's approved trace/plate maxima).
        expect(plateShader).toContain(
            'plate += TRACE_TINT * (traceGrain * traceMask * traceAmount * 0.55);'
        );
        // Exactly one trace hue: no per-channel offsets, no hue cycling.
        expect(plateShader.match(/TRACE_TINT/g)).toHaveLength(3); // decl + 2 uses
        expect(plateShader).not.toContain('traceTintR');
        expect(plateShader).not.toContain('hsv2rgb');
    });

    it('skips trace-mask and grain work when traceCool is zero via neutral defaults', () => {
        expect(plateShader).toContain('float artifactMask = 1.0;');
        expect(plateShader).toContain('float traceMask = 0.0;');
        expect(plateShader).toContain('float traceGrain = 0.0;');
        expect(plateShader).toContain('if (traceAmount > 0.0) {');
        // Mask/grain math lives inside the branch; inactive path keeps shipped values.
        const traceBranchStart = plateShader.indexOf('if (traceAmount > 0.0) {');
        const traceBranchEnd = plateShader.indexOf('float contrast = 1.12 + pressureAmount');
        const traceBranch = plateShader.slice(traceBranchStart, traceBranchEnd);
        expect(traceBranch).toContain('traceLumaGate = smoothstep(0.035, 0.22, luma);');
        expect(traceBranch).toContain('traceMask = traceLumaGate * (0.34 + 0.66 * traceEdgeGate);');
        expect(traceBranch).toContain('traceGrain = mix(');
        expect(traceBranch).toContain('artifactMask = mix(1.0, traceMask, traceAmount);');
        // Tint/grain paint is also gated so the inactive path never touches plate colour.
        const paintIndex = plateShader.indexOf('plate *= mix(vec3(1.0), TRACE_TINT');
        const paintBlock = plateShader.slice(
            plateShader.lastIndexOf('if (traceAmount > 0.0)', paintIndex),
            paintIndex + 200
        );
        expect(paintBlock).toContain('plate += TRACE_TINT * (traceGrain * traceMask * traceAmount * 0.55);');
    });

    it('builds coherent grain by interpolating two time seeds over coarse cells', () => {
        expect(plateShader).toContain(
            'vec2 traceCell = floor(gl_FragCoord.xy / 3.0 + vec2(time * 0.21, time * -0.13));'
        );
        expect(plateShader).toContain('float traceSeed = time * 4.5;');
        expect(plateShader).toContain('float traceSeedFloor = floor(traceSeed);');
        expect(plateShader).toContain(
            'float traceSeedMix = smoothstep(0.0, 1.0, traceSeed - traceSeedFloor);'
        );
        expect(plateShader).toContain('traceGrain = mix(');
        expect(plateShader).toMatch(/traceSeedMix[\s\S]*?\) - 0\.5;/);
        // The trace must NOT reuse the frame-random full-frame snow.
        const grainBlock = plateShader.slice(
            plateShader.indexOf('traceGrain = mix('),
            plateShader.indexOf('artifactMask = mix(1.0, traceMask, traceAmount);')
        );
        expect(grainBlock).not.toContain('highNoise');
        expect(grainBlock).not.toContain('time * 19.0');
    });

    it('demotes the full-frame TV artifacts toward the trace mask', () => {
        expect(plateShader).toContain('float artifactMask = 1.0;');
        expect(plateShader).toContain('artifactMask = mix(1.0, traceMask, traceAmount);');
        expect(plateShader).toContain(
            'plate *= 1.0 - scan * (0.014 + airDensity * 0.018 + erasureAmount * 0.018) * artifactMask;'
        );
        expect(plateShader).toContain(
            'plate += salt * vec3(0.42, 0.45, 0.5) * (0.14 + forensicAmount * 0.18) * artifactMask;'
        );
        expect(plateShader).toContain(
            'plate -= ash * vec3(0.08, 0.075, 0.07) * (0.22 + damageAmount * 0.25) * artifactMask;'
        );
        // At traceCool 0 every one of these multiplies by exactly 1.0.
        expect(plateShader.match(/\* artifactMask/g)).toHaveLength(3);
    });

    it('leaves the rest of the plate grade untouched', () => {
        // The shipped expressions the trace does NOT participate in.
        expect(plateShader).toContain('float objectMask = smoothstep(0.018, 0.16, luma + edge * 0.72);');
        expect(plateShader).toContain('plate += edge * (0.16 + forensicAmount * 0.46) * vec3(0.82, 0.88, 1.0);');
        expect(plateShader).toContain('vec3 finalColor = mix(source, clamp(plate, 0.0, 1.0), plateStrength);');
        // The trace is applied inside the plate, so it inherits the vignette and
        // never becomes a full-frame wash over the source.
        const traceApply = plateShader.indexOf('plate *= mix(vec3(1.0), TRACE_TINT');
        const vignette = plateShader.indexOf('float outerFalloff = smoothstep(0.18, 0.92');
        expect(traceApply).toBeGreaterThan(0);
        expect(vignette).toBeGreaterThan(traceApply);
    });

    it('adds no pass, texture, render target or disposable resource', () => {
        const forbidden = [
            'createRecutVisualMesh',
            'recutTracePass',
            'traceRenderTarget',
            'tTraceNoise',
            'recutVisualScore.dispose',
            'this.scene.add(this.recutVisualScore'
        ];
        forbidden.forEach((token) => {
            expect(source).not.toContain(token);
        });
        // Still exactly one Track 5 plate pass, still query-disableable.
        expect(source.match(/new ShaderPass\(Track5PlateShader\)/g)).toHaveLength(1);
        expect(source).toContain('this.track5PlatePass.enabled = this.track5PlateEnabled;');
        expect(source).toContain('if (this.track5PlatePass?.enabled) {');
        expect(plateShader).not.toContain('sampler2D tTrace');
    });
});
