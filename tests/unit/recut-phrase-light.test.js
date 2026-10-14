/* eslint-disable security/detect-object-injection -- test indices are bounded loop counters over local arrays */
import fs from 'fs';
import path from 'path';
import { createRecutPhraseLight, resolveRecutPhraseLightFrame } from '../../src/js/prototype/recut-phrase-light.js';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';
import { createLightRigResolver } from '../../src/js/prototype/light-rigs.js';
import { createTrack5RecutCameraConfig } from '../../src/js/prototype/track5-recut-seams.js';

const RECUT_RIG_IDS = [
    'back_silhouette',
    'wet_specular',
    'fracture',
    'void_side_warm',
    'pressure_top',
    'plateau_rim_pulse',
    'low_key_grazing'
];

function buildSyntheticBeatGrid({ bars = 48, bpm = 120 } = {}) {
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
    return { bpm, totalBeats: beats.length, beats };
}

function downbeatTimeForBar(beatGrid, bar) {
    const match = beatGrid.beats.find((entry) => entry.bar === bar && entry.beatInBar === 1);
    return match ? match.time : null;
}

function makeSharedScratchResolver() {
    const scratch = {
        position: [1, 2, 3],
        target: [4, 5, 6],
        fov: 40
    };
    const calls = [];
    return {
        calls,
        resolveCameraAt(timeSeconds) {
            calls.push(timeSeconds);
            scratch.position[0] = timeSeconds;
            scratch.target[0] = timeSeconds + 10;
            scratch.fov = 30 + timeSeconds;
            return scratch;
        }
    };
}

describe('recut phrase light — synthetic schedule', () => {
    const beatGrid = buildSyntheticBeatGrid({ bars: 80 });
    const { resolveCameraAt, calls } = makeSharedScratchResolver();

    const phraseTable = [
        {
            id: 'pre60',
            startBar: 48,
            endBar: 60,
            lightRig: 'pressure_top',
            cameraCutBars: [48, 54]
        },
        {
            id: 'bar60-rekey',
            startBar: 60,
            endBar: 68,
            lightRig: 'back_silhouette',
            rekeyOnly: true,
            cameraCutBars: []
        },
        {
            id: 'post68',
            startBar: 68,
            endBar: 75,
            lightRig: 'void_side_warm',
            cameraCutBars: [68]
        }
    ];

    const score = createRecutPhraseLight({
        beatGrid,
        phraseTable,
        resolveCameraAt,
        lightRigIds: RECUT_RIG_IDS
    });

    const out = {};

    it('validates a contiguous synthetic table', () => {
        const validation = score.validate();
        expect(validation.ok).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(score.list()).toHaveLength(3);
    });

    it('resolves the bar60 rekeyOnly phrase without listing camera cuts', () => {
        const t60 = downbeatTimeForBar(beatGrid, 60);
        const row = score.list().find((entry) => entry.id === 'bar60-rekey');
        expect(row.rekeyOnly).toBe(true);
        expect(row.cameraCutBars).toEqual([]);
        expect(score.at(t60, out)).toBe(out);
        expect(out.id).toBe('bar60-rekey');
        expect(out.lightRig).toBe('back_silhouette');
        expect(out.rekeyOnly).toBe(true);
        expect(out.cameraCutBars).toEqual([]);
        expect(Object.isFrozen(out.cameraCutBars)).toBe(true);
    });

    it('still resolves a bar with no camera cut inside an earlier phrase', () => {
        const t58 = downbeatTimeForBar(beatGrid, 58);
        expect(score.at(t58, out)).toBe(out);
        expect(out.id).toBe('pre60');
        expect(out.lightRig).toBe('pressure_top');
    });

    it('uses exclusive endBar boundaries', () => {
        const t60 = downbeatTimeForBar(beatGrid, 60);
        const t68 = downbeatTimeForBar(beatGrid, 68);
        expect(score.at(t60 - 0.001, out)?.id).toBe('pre60');
        expect(score.at(t60, out)?.id).toBe('bar60-rekey');
        expect(score.at(t68 - 0.001, out)?.id).toBe('bar60-rekey');
        expect(score.at(t68, out)?.id).toBe('post68');
        expect(score.at(t68 - 0.001, out)?.endTime).toBe(t68);
        expect(score.at(t68, out)?.startTime).toBe(t68);
    });

    it('returns null outside the configured range', () => {
        const firstStart = downbeatTimeForBar(beatGrid, 48);
        const lastEnd = downbeatTimeForBar(beatGrid, 75);
        expect(score.at(firstStart - 0.001, out)).toBeNull();
        expect(score.at(lastEnd, out)).toBeNull();
        expect(score.at(lastEnd + 1, out)).toBeNull();
    });

    it('is seek-safe and order independent', () => {
        const probe = downbeatTimeForBar(beatGrid, 62) + 0.25;
        const forward = { ...out };
        score.at(probe, forward);
        score.at(downbeatTimeForBar(beatGrid, 74), out);
        score.at(downbeatTimeForBar(beatGrid, 49), out);
        const backward = {};
        score.at(probe, backward);
        expect(backward).toEqual(forward);
    });

    it('clones shared-scratch anchor values at construction', () => {
        const listed = score.list();
        const anchorAt60 = listed.find((row) => row.id === 'bar60-rekey');
        const t60 = downbeatTimeForBar(beatGrid, 60);
        expect(anchorAt60.anchorPosition[0]).toBe(t60);
        expect(anchorAt60.anchorTarget[0]).toBe(t60 + 10);
        expect(anchorAt60.anchorFov).toBe(30 + t60);

        resolveCameraAt(999);
        expect(anchorAt60.anchorPosition[0]).toBe(t60);
        expect(anchorAt60.anchorTarget[0]).toBe(t60 + 10);
        expect(anchorAt60.anchorFov).toBe(30 + t60);
        expect(calls.filter((time) => time === t60)).toHaveLength(1);
    });

    it('protects frozen anchors from consumer mutation without corrupting later queries', () => {
        const probe = downbeatTimeForBar(beatGrid, 60);
        const first = {};
        const second = {};
        score.at(probe, first);
        expect(Object.isFrozen(first.anchorPosition)).toBe(true);
        expect(Object.isFrozen(first.anchorTarget)).toBe(true);

        const mutateInStrictMode = () => {
            'use strict';
            first.anchorPosition[0] = 999;
        };
        expect(mutateInStrictMode).toThrow(TypeError);
        expect(first.anchorPosition[0]).toBe(probe);

        score.at(probe, second);
        expect(second.anchorPosition).toEqual(first.anchorPosition);
        expect(second.anchorTarget).toEqual(first.anchorTarget);
    });
});

describe('recut phrase light — same-light multi-cut phrase', () => {
    const beatGrid = buildSyntheticBeatGrid({ bars: 160 });

    const score = createRecutPhraseLight({
        beatGrid,
        phraseTable: [
            {
                id: 'plateau',
                startBar: 128,
                endBar: 147,
                lightRig: 'plateau_rim_pulse',
                cameraCutBars: [128, 139]
            }
        ],
        resolveCameraAt: (timeSeconds) => ({
            position: [timeSeconds, 0, 0],
            target: [0, 1, 0],
            fov: 35
        }),
        lightRigIds: RECUT_RIG_IDS
    });

    const out = {};

    it('keeps bars 128 and 139 in one plateau phrase with the same rig', () => {
        const listed = score.list();
        expect(listed).toHaveLength(1);
        expect(listed[0].cameraCutBars).toEqual([128, 139]);
        expect(listed[0].lightRig).toBe('plateau_rim_pulse');

        const t128 = downbeatTimeForBar(beatGrid, 128);
        const t139 = downbeatTimeForBar(beatGrid, 139);
        expect(score.at(t128, out)?.lightRig).toBe('plateau_rim_pulse');
        expect(score.at(t139 + 0.5, out)?.lightRig).toBe('plateau_rim_pulse');
        expect(out.startBar).toBe(128);
        expect(out.endBar).toBe(147);
    });
});

describe('recut phrase light — validation failures', () => {
    const beatGrid = buildSyntheticBeatGrid({ bars: 40 });
    const goodResolve = () => ({
        position: [0, 0, 0],
        target: [0, 1, 0],
        fov: 45
    });

    it('rejects duplicate ids', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: [
                { id: 'dup', startBar: 1, endBar: 5, lightRig: 'pressure_top' },
                { id: 'dup', startBar: 5, endBar: 10, lightRig: 'back_silhouette' }
            ],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().ok).toBe(false);
        expect(score.validate().errors.some((msg) => msg.includes('duplicated'))).toBe(true);
        expect(score.at(0, {})).toBeNull();
    });

    it('rejects unknown rigs', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: [{ id: 'x', startBar: 1, endBar: 5, lightRig: 'cold_side' }],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().errors.some((msg) => msg.includes('unknown'))).toBe(true);
    });

    it('rejects gaps and overlaps', () => {
        const gap = createRecutPhraseLight({
            beatGrid,
            phraseTable: [
                { id: 'a', startBar: 1, endBar: 5, lightRig: 'pressure_top' },
                { id: 'b', startBar: 6, endBar: 10, lightRig: 'back_silhouette' }
            ],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(gap.validate().errors.some((msg) => msg.includes('gap'))).toBe(true);

        const overlap = createRecutPhraseLight({
            beatGrid,
            phraseTable: [
                { id: 'a', startBar: 1, endBar: 6, lightRig: 'pressure_top' },
                { id: 'b', startBar: 5, endBar: 10, lightRig: 'back_silhouette' }
            ],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(overlap.validate().errors.some((msg) => msg.includes('overlap'))).toBe(true);
    });

    it('rejects missing downbeats and out-of-range cameraCutBars', () => {
        const missing = createRecutPhraseLight({
            beatGrid,
            phraseTable: [{ id: 'm', startBar: 1, endBar: 999, lightRig: 'pressure_top' }],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(missing.validate().errors.some((msg) => msg.includes('no downbeat'))).toBe(true);

        const badCut = createRecutPhraseLight({
            beatGrid,
            phraseTable: [{
                id: 'c',
                startBar: 10,
                endBar: 20,
                lightRig: 'pressure_top',
                cameraCutBars: [20]
            }],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(badCut.validate().errors.some((msg) => msg.includes('cameraCutBars'))).toBe(true);
    });

    it('rejects rekeyOnly rows that still declare cameraCutBars', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: [{
                id: 'bad-rekey',
                startBar: 10,
                endBar: 20,
                lightRig: 'pressure_top',
                rekeyOnly: true,
                cameraCutBars: [10]
            }],
            resolveCameraAt: goodResolve,
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().errors.some((msg) => msg.includes('rekeyOnly'))).toBe(true);
    });

    it('rejects malformed resolveCameraAt poses', () => {
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: [{ id: 'p', startBar: 1, endBar: 5, lightRig: 'pressure_top' }],
            resolveCameraAt: () => ({ position: [0, 0], target: [0, 1, 0], fov: NaN }),
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().errors.some((msg) => msg.includes('resolveCameraAt'))).toBe(true);
    });

    it('rejects non-finite position/target components after numeric coercion', () => {
        const cases = [
            () => ({ position: [Number.NaN, 0, 0], target: [0, 1, 0], fov: 45 }),
            () => ({ position: [0, 0, 0], target: ['x', 1, 0], fov: 45 }),
            () => ({ position: [0, undefined, 0], target: [0, 1, 0], fov: 45 })
        ];
        cases.forEach((resolveCameraAt) => {
            const score = createRecutPhraseLight({
                beatGrid,
                phraseTable: [{ id: 'p', startBar: 1, endBar: 5, lightRig: 'pressure_top' }],
                resolveCameraAt,
                lightRigIds: RECUT_RIG_IDS
            });
            expect(score.validate().ok).toBe(false);
            expect(score.validate().errors.some((msg) => msg.includes('resolveCameraAt'))).toBe(true);
        });
    });

    it('accepts string beatGrid bar and beatInBar fields via numeric coercion', () => {
        const stringBeatGrid = {
            beats: [
                { bar: '10', beatInBar: '1', time: 9, beat: 37 },
                { bar: '11', beatInBar: '1', time: 11, beat: 41 },
                { bar: '12', beatInBar: '1', time: 13, beat: 45 }
            ]
        };
        const score = createRecutPhraseLight({
            beatGrid: stringBeatGrid,
            phraseTable: [{ id: 's', startBar: 10, endBar: 12, lightRig: 'pressure_top' }],
            resolveCameraAt: () => ({
                position: [0, 0, 0],
                target: [0, 1, 0],
                fov: 45
            }),
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().ok).toBe(true);
        const out = {};
        expect(score.at(9, out)).toBe(out);
        expect(out.startBar).toBe(10);
        expect(score.at(13, out)).toBeNull();
    });

    it('rejects non-monotonic downbeat times for a phrase window', () => {
        const nonMonotonicGrid = {
            beats: [
                { bar: 1, beatInBar: 1, time: 0, beat: 1 },
                { bar: 2, beatInBar: 1, time: 4, beat: 5 },
                { bar: 3, beatInBar: 1, time: 8, beat: 9 },
                { bar: 4, beatInBar: 1, time: 6, beat: 13 }
            ]
        };
        const score = createRecutPhraseLight({
            beatGrid: nonMonotonicGrid,
            phraseTable: [{ id: 'bad-time', startBar: 3, endBar: 4, lightRig: 'pressure_top' }],
            resolveCameraAt: () => ({
                position: [0, 0, 0],
                target: [0, 1, 0],
                fov: 45
            }),
            lightRigIds: RECUT_RIG_IDS
        });
        expect(score.validate().ok).toBe(false);
        expect(score.validate().errors.some((msg) => msg.includes('strictly after'))).toBe(true);
    });
});

describe('recut phrase light — real-shaped Track 5 excerpt', () => {
    function loadBeatGrid() {
        const beatsPath = path.join(
            process.cwd(),
            'public/assets/journeys/analysis/nao-querer-nada/beats.json'
        );
        return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
    }

    function readRecutCamera() {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js'),
            'utf8'
        );
        const CENTER = [0.959854, 1.901261, -0.038787];
        const MID_RIDGE = [0.959854, 3.4, 0.4];
        const BASE_POOL = [0.959854, 0.2, 0.9];
        const start = src.indexOf('const TRACK5_RECUT_DIRECTOR_CAMERA = ');
        const end = src.indexOf('\nconst TRACK5_RECUT_FILM_TIMELINE =');
        let body = src.slice(start + 'const TRACK5_RECUT_DIRECTOR_CAMERA = '.length, end).trim();
        body = body
            .replace(/target: TRACK5_FILM_TARGET/g, `target: [${CENTER.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, `targetPoint: [${MID_RIDGE.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, `targetPoint: [${BASE_POOL.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, 'targetPoint: [1.0282, 3.5696, 0.6120]')
            .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, 'targetPoint: [1.3457, 4.2708, 0.6256]')
            .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, 'targetPoint: [1.0234, 2.7378, 0.3623]');
        body = body.slice(0, body.lastIndexOf('}') + 1);
        // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
        return new Function(`return (${body});`)();
    }

    const beatGrid = loadBeatGrid();
    const recutCamera = readRecutCamera();
    const director = createShotDirector({
        enabled: true,
        beatGrid,
        setups: recutCamera.setups,
        cutTimeline: recutCamera.cutTimeline,
        accentCuts: recutCamera.accentCuts,
        defaultTargetPoint: recutCamera.target,
        heightYByClass: recutCamera.director.heightYByClass,
        enforceOrbitBudget: recutCamera.director.enforceOrbitBudget
    });

    const resolveScratch = {};
    const resolveCameraAt = (timeSeconds) => director.resolve(timeSeconds, resolveScratch);

    const preClimaxTable = [
        { id: 'p4', startBar: 48, endBar: 54, lightRig: 'pressure_top', cameraCutBars: [48] },
        { id: 'p5a', startBar: 54, endBar: 60, lightRig: 'void_side_warm', cameraCutBars: [54] },
        {
            id: 'p5b',
            startBar: 60,
            endBar: 68,
            lightRig: 'back_silhouette',
            rekeyOnly: true,
            cameraCutBars: []
        },
        { id: 'p6', startBar: 68, endBar: 75, lightRig: 'pressure_top', cameraCutBars: [68] }
    ];

    const plateauTable = [{
        id: 'p16',
        startBar: 128,
        endBar: 147,
        lightRig: 'plateau_rim_pulse',
        cameraCutBars: [128, 139]
    }];

    const preClimaxScore = createRecutPhraseLight({
        beatGrid,
        phraseTable: preClimaxTable,
        resolveCameraAt,
        lightRigIds: RECUT_RIG_IDS
    });

    const plateauScore = createRecutPhraseLight({
        beatGrid,
        phraseTable: plateauTable,
        resolveCameraAt,
        lightRigIds: RECUT_RIG_IDS
    });

    const out = {};

    it('builds a real-shaped contiguous pre-climax excerpt from authoritative downbeats', () => {
        expect(preClimaxScore.validate().ok).toBe(true);
        expect(preClimaxScore.list()).toHaveLength(4);
    });

    it('anchors phrase starts to shot-director poses on the real beat grid', () => {
        const t60 = downbeatTimeForBar(beatGrid, 60);
        expect(preClimaxScore.at(t60, out)).toBe(out);
        expect(out.anchorFov).toBeGreaterThan(0);
        expect(out.anchorPosition).toHaveLength(3);
        expect(out.anchorTarget).toHaveLength(3);
        expect(Number.isFinite(out.anchorPosition[0])).toBe(true);
    });

    it('keeps bar128 and mid-phrase bar139 in the same plateau phrase on the real grid', () => {
        const t128 = downbeatTimeForBar(beatGrid, 128);
        const t139 = downbeatTimeForBar(beatGrid, 139);
        expect(plateauScore.validate().ok).toBe(true);
        expect(plateauScore.at(t128, out)?.id).toBe('p16');
        expect(plateauScore.at(t139 + 0.5, out)?.id).toBe('p16');
        expect(out.lightRig).toBe('plateau_rim_pulse');
        expect(out.endBar).toBe(147);
        expect(plateauScore.list()[0].cameraCutBars).toEqual([128, 139]);
        expect(plateauScore.at(downbeatTimeForBar(beatGrid, 147), out)).toBeNull();
    });

    it('re-keys at bar60 even though the row is light-only metadata', () => {
        const t60 = downbeatTimeForBar(beatGrid, 60);
        expect(preClimaxScore.at(t60, out)?.id).toBe('p5b');
        expect(preClimaxScore.list().find((row) => row.id === 'p5b').rekeyOnly).toBe(true);
    });
});

describe('recut phrase light — Stage 1B composite runtime contract', () => {
    const CENTER = [0.959854, 1.901261, -0.038787];
    const FLOWER_HEAD = [0.959854, 5.612414, -0.038787];
    const MID_RIDGE = [0.959854, 3.4, 0.4];
    const BASE_POOL = [0.959854, 0.2, 0.9];

    function loadBeatGrid() {
        const beatsPath = path.join(
            process.cwd(),
            'public/assets/journeys/analysis/nao-querer-nada/beats.json'
        );
        return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
    }

    function readExperienceCameraBlock(startToken, endToken) {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js'),
            'utf8'
        );
        const start = src.indexOf(startToken);
        const end = src.indexOf(endToken, start + 1);
        let body = src.slice(start + startToken.length, end).trim();
        body = body
            .replace(/target: TRACK5_FILM_TARGET/g, `target: [${CENTER.join(',')}]`)
            .replace(/targetPoint: TRACK5_FILM_FLOWER_HEAD/g, `targetPoint: [${FLOWER_HEAD.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, `targetPoint: [${MID_RIDGE.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, `targetPoint: [${BASE_POOL.join(',')}]`)
            .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, 'targetPoint: [1.0282, 3.5696, 0.6120]')
            .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, 'targetPoint: [1.3457, 4.2708, 0.6256]')
            .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, 'targetPoint: [1.0234, 2.7378, 0.3623]');
        body = body.slice(0, body.lastIndexOf('}') + 1);
        // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
        return new Function(`return (${body});`)();
    }

    function loadLightPhrases() {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js'),
            'utf8'
        );
        const token = 'const TRACK5_RECUT_LIGHT_PHRASES = ';
        const start = src.indexOf(token);
        let body = src.slice(start + token.length);
        body = body.slice(0, body.indexOf('];') + 1);
        // eslint-disable-next-line no-new-func -- fs-loaded authored phrase-table mirror
        return new Function(`return (${body});`)();
    }

    function buildCompositeDirector(beatGrid) {
        const defaultCamera = readExperienceCameraBlock(
            'const TRACK5_FILM_DIRECTOR_CAMERA = ',
            '\nconst TRACK5_CHAMBER_FILM_TIMELINE ='
        );
        const recutCamera = readExperienceCameraBlock(
            'const TRACK5_RECUT_DIRECTOR_CAMERA = ',
            '\nconst TRACK5_RECUT_FILM_TIMELINE ='
        );
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        return createShotDirector({
            enabled: true,
            beatGrid,
            setups: composite.setups,
            cutTimeline: composite.cutTimeline,
            accentCuts: composite.accentCuts,
            defaultTargetPoint: composite.target,
            heightYByClass: composite.director.heightYByClass,
            enforceOrbitBudget: composite.director.enforceOrbitBudget === true
        });
    }

    function resolveRigState(resolver, rigId, anchorPosition, elapsedSeconds) {
        const out = resolver.createState();
        resolver.resolve(rigId, anchorPosition, elapsedSeconds, out);
        return {
            keyPosition: [...out.key.position],
            rimDirection: out.rim.direction ? [...out.rim.direction] : null,
            backDirection: out.back.direction ? [...out.back.direction] : null
        };
    }

    const beatGrid = loadBeatGrid();
    const phraseTable = loadLightPhrases();
    const director = buildCompositeDirector(beatGrid);
    const resolveScratch = {};
    const resolveCameraAt = (timeSeconds) => director.resolve(timeSeconds, resolveScratch);
    const resolver = createLightRigResolver({ subjectPoint: CENTER });
    const score = createRecutPhraseLight({
        beatGrid,
        phraseTable,
        resolveCameraAt,
        lightRigIds: RECUT_RIG_IDS
    });
    const out = {};

    it('validates the authoritative v2 phrase table on the composite director', () => {
        expect(score.validate().ok).toBe(true);
        expect(score.list()).toHaveLength(22);
    });

    it('returns null outside [bar25, bar195) for head/tail fallback', () => {
        const t25 = downbeatTimeForBar(beatGrid, 25);
        const t195 = downbeatTimeForBar(beatGrid, 195);
        expect(score.at(t25 - 0.001, out)).toBeNull();
        expect(score.at(t25, out)?.id).toBe('p01');
        expect(score.at(t195 - 0.001, out)?.id).toBe('p22');
        expect(score.at(t195, out)).toBeNull();
    });

    it('re-keys at bar60 while the camera setup stays on mcu_ridge_hold', () => {
        const t59 = downbeatTimeForBar(beatGrid, 59) + 0.25;
        const t60 = downbeatTimeForBar(beatGrid, 60);
        expect(score.at(t59, out)?.id).toBe('p04');
        expect(score.at(t59, out)?.lightRig).toBe('pressure_top');
        expect(score.at(t60, out)?.id).toBe('p05');
        expect(score.at(t60, out)?.lightRig).toBe('back_silhouette');
        expect(director.resolve(t59, resolveScratch).setupId).toBe('mcu_ridge_hold');
        expect(director.resolve(t60, resolveScratch).setupId).toBe('mcu_ridge_hold');
    });

    it('keeps bar139 on the bar128 phrase anchor and matching rig orientation', () => {
        const t128 = downbeatTimeForBar(beatGrid, 128);
        const t139 = downbeatTimeForBar(beatGrid, 139) + 0.5;
        const phrase128 = {};
        const phrase139 = {};
        score.at(t128, phrase128);
        score.at(t139, phrase139);
        expect(phrase128.id).toBe('p16');
        expect(phrase139.id).toBe('p16');
        expect(phrase139.anchorPosition).toEqual(phrase128.anchorPosition);
        expect(phrase139.anchorTarget).toEqual(phrase128.anchorTarget);
        expect(director.resolve(t128, resolveScratch).setupId).toBe('ws_plateau_spiral');
        expect(director.resolve(t139, resolveScratch).setupId).toBe('mcu_plateau_shoulders');

        const frozen128 = resolveRigState(
            resolver,
            'plateau_rim_pulse',
            phrase128.anchorPosition,
            t128
        );
        const frozen139 = resolveRigState(
            resolver,
            'plateau_rim_pulse',
            phrase139.anchorPosition,
            t139
        );
        expect(frozen139).toEqual(frozen128);

        const live139 = director.resolve(t139, resolveScratch).pose.position;
        const liveResolved = resolveRigState(
            resolver,
            'plateau_rim_pulse',
            live139,
            t139
        );
        expect(liveResolved.keyPosition).not.toEqual(frozen128.keyPosition);
    });

    it.each([
        ['p04', 48, 54],
        ['p08', 76, 81],
        ['p09', 85, 91],
        ['p12', 107, 111]
    ])('keeps phrase %s anchors stable across internal cuts %i/%i', (_phraseId, barA, barB) => {
        const tA = downbeatTimeForBar(beatGrid, barA);
        const tB = downbeatTimeForBar(beatGrid, barB) + 0.5;
        const rowA = {};
        const rowB = {};
        score.at(tA, rowA);
        score.at(tB, rowB);
        expect(rowB.id).toBe(rowA.id);
        expect(rowB.anchorPosition).toEqual(rowA.anchorPosition);
        expect(rowB.anchorTarget).toEqual(rowA.anchorTarget);
        expect(rowB.lightRig).toBe(rowA.lightRig);

        const rigA = resolveRigState(resolver, rowA.lightRig, rowA.anchorPosition, tA);
        const rigB = resolveRigState(resolver, rowB.lightRig, rowB.anchorPosition, tB);
        expect(rigB).toEqual(rigA);
    });

    it('is seek-safe after out-of-order probes', () => {
        const probes = [
            downbeatTimeForBar(beatGrid, 60),
            downbeatTimeForBar(beatGrid, 139) + 0.25,
            downbeatTimeForBar(beatGrid, 48),
            downbeatTimeForBar(beatGrid, 171)
        ];
        const reference = {};
        score.at(probes[1], reference);
        probes.forEach((time) => score.at(time, out));
        const afterSeek = {};
        score.at(probes[1], afterSeek);
        expect(afterSeek).toEqual(reference);
    });
});

describe('resolveRecutPhraseLightFrame', () => {
    const queryOut = {};
    const frameOut = {};

    const fakeScore = {
        at(timeSeconds, out) {
            if (timeSeconds < 10 || timeSeconds >= 20) {
                return null;
            }
            out.id = 'fake';
            out.lightRig = 'pressure_top';
            out.anchorPosition = [1, 2, 3];
            out.anchorTarget = [4, 5, 6];
            out.anchorFov = 40;
            return out;
        }
    };

    it('returns null outside phrase range or for invalid score input', () => {
        expect(resolveRecutPhraseLightFrame(fakeScore, 5, queryOut, '', '', frameOut)).toBeNull();
        expect(resolveRecutPhraseLightFrame(null, 15, queryOut, '', '', frameOut)).toBeNull();
    });

    it('sets rekey true on the first phrase hit', () => {
        const result = resolveRecutPhraseLightFrame(fakeScore, 15, queryOut, '', '', frameOut);
        expect(result).toBe(frameOut);
        expect(frameOut.phraseId).toBe('fake');
        expect(frameOut.rigId).toBe('pressure_top');
        expect(frameOut.anchorPosition).toEqual([1, 2, 3]);
        expect(frameOut.anchorTarget).toEqual([4, 5, 6]);
        expect(frameOut.anchorFov).toBe(40);
        expect(frameOut.rekey).toBe(true);
    });

    it('reuses caller out objects without allocating query containers', () => {
        resolveRecutPhraseLightFrame(fakeScore, 15, queryOut, 'fake', 'pressure_top', frameOut);
        expect(frameOut.rekey).toBe(false);
        expect(queryOut.id).toBe('fake');
    });

    describe('real composite score state machine', () => {
        const CENTER = [0.959854, 1.901261, -0.038787];
        const FLOWER_HEAD = [0.959854, 5.612414, -0.038787];
        const MID_RIDGE = [0.959854, 3.4, 0.4];
        const BASE_POOL = [0.959854, 0.2, 0.9];

        function loadBeatGrid() {
            const beatsPath = path.join(
                process.cwd(),
                'public/assets/journeys/analysis/nao-querer-nada/beats.json'
            );
            return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
        }

        function readExperienceCameraBlock(startToken, endToken) {
            const src = fs.readFileSync(
                path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js'),
                'utf8'
            );
            const start = src.indexOf(startToken);
            const end = src.indexOf(endToken, start + 1);
            let body = src.slice(start + startToken.length, end).trim();
            body = body
                .replace(/target: TRACK5_FILM_TARGET/g, `target: [${CENTER.join(',')}]`)
                .replace(/targetPoint: TRACK5_FILM_FLOWER_HEAD/g, `targetPoint: [${FLOWER_HEAD.join(',')}]`)
                .replace(/targetPoint: TRACK5_RECUT_MID_RIDGE/g, `targetPoint: [${MID_RIDGE.join(',')}]`)
                .replace(/targetPoint: TRACK5_RECUT_BASE_POOL/g, `targetPoint: [${BASE_POOL.join(',')}]`)
                .replace(/targetPoint: TRACK5_RECUT_RIDGE_JUNCTION/g, 'targetPoint: [1.0282, 3.5696, 0.6120]')
                .replace(/targetPoint: TRACK5_RECUT_BLOOM_EDGE/g, 'targetPoint: [1.3457, 4.2708, 0.6256]')
                .replace(/targetPoint: TRACK5_RECUT_LOWER_SHOULDER/g, 'targetPoint: [1.0234, 2.7378, 0.3623]');
            body = body.slice(0, body.lastIndexOf('}') + 1);
            // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
            return new Function(`return (${body});`)();
        }

        function loadLightPhrases() {
            const src = fs.readFileSync(
                path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js'),
                'utf8'
            );
            const token = 'const TRACK5_RECUT_LIGHT_PHRASES = ';
            const start = src.indexOf(token);
            let body = src.slice(start + token.length);
            body = body.slice(0, body.indexOf('];') + 1);
            // eslint-disable-next-line no-new-func -- fs-loaded authored phrase-table mirror
            return new Function(`return (${body});`)();
        }

        const beatGrid = loadBeatGrid();
        const defaultCamera = readExperienceCameraBlock(
            'const TRACK5_FILM_DIRECTOR_CAMERA = ',
            '\nconst TRACK5_CHAMBER_FILM_TIMELINE ='
        );
        const recutCamera = readExperienceCameraBlock(
            'const TRACK5_RECUT_DIRECTOR_CAMERA = ',
            '\nconst TRACK5_RECUT_FILM_TIMELINE ='
        );
        const composite = createTrack5RecutCameraConfig({ defaultCamera, recutCamera });
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: composite.setups,
            cutTimeline: composite.cutTimeline,
            accentCuts: composite.accentCuts,
            defaultTargetPoint: composite.target,
            heightYByClass: composite.director.heightYByClass,
            enforceOrbitBudget: composite.director.enforceOrbitBudget === true
        });
        const resolveScratch = {};
        const score = createRecutPhraseLight({
            beatGrid,
            phraseTable: loadLightPhrases(),
            resolveCameraAt: (timeSeconds) => director.resolve(timeSeconds, resolveScratch),
            lightRigIds: RECUT_RIG_IDS
        });

        it('rekeys at bar60 when phrase id changes under the same camera setup', () => {
            const t60 = downbeatTimeForBar(beatGrid, 60);
            const result = resolveRecutPhraseLightFrame(
                score,
                t60,
                queryOut,
                'p04',
                'pressure_top',
                frameOut
            );
            expect(result.rekey).toBe(true);
            expect(frameOut.phraseId).toBe('p05');
            expect(frameOut.rigId).toBe('back_silhouette');
        });

        it('does not rekey within p04 across bar48 and bar54', () => {
            const t54 = downbeatTimeForBar(beatGrid, 54) + 0.25;
            const result = resolveRecutPhraseLightFrame(
                score,
                t54,
                queryOut,
                'p04',
                'pressure_top',
                frameOut
            );
            expect(result.rekey).toBe(false);
            expect(frameOut.phraseId).toBe('p04');
        });

        it('does not rekey within p16 at bar139 when cache matches plateau rig', () => {
            const t139 = downbeatTimeForBar(beatGrid, 139) + 0.5;
            const result = resolveRecutPhraseLightFrame(
                score,
                t139,
                queryOut,
                'p16',
                'plateau_rim_pulse',
                frameOut
            );
            expect(result.rekey).toBe(false);
            expect(frameOut.phraseId).toBe('p16');
        });

        it('returns null before bar25 and from bar195 for head/tail fallback', () => {
            const t25 = downbeatTimeForBar(beatGrid, 25);
            const t195 = downbeatTimeForBar(beatGrid, 195);
            expect(resolveRecutPhraseLightFrame(score, t25 - 0.001, queryOut, '', '', frameOut)).toBeNull();
            expect(resolveRecutPhraseLightFrame(score, t195, queryOut, '', '', frameOut)).toBeNull();
        });

        it('is seek-safe after out-of-order helper probes', () => {
            const probe = downbeatTimeForBar(beatGrid, 139) + 0.25;
            const reference = {};
            resolveRecutPhraseLightFrame(score, probe, queryOut, 'p16', 'plateau_rim_pulse', reference);
            resolveRecutPhraseLightFrame(score, downbeatTimeForBar(beatGrid, 60), queryOut, '', '', frameOut);
            resolveRecutPhraseLightFrame(score, downbeatTimeForBar(beatGrid, 48), queryOut, '', '', frameOut);
            const afterSeek = {};
            resolveRecutPhraseLightFrame(score, probe, queryOut, 'p16', 'plateau_rim_pulse', afterSeek);
            expect(afterSeek).toEqual(reference);
        });
    });
});
