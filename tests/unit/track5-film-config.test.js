/* eslint-disable security/detect-object-injection -- setup ids and cut bars come from fs-loaded authored TRACK5 config */
import fs from 'fs';
import path from 'path';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';

function loadTrack5FilmDirectorCamera() {
    const experiencePath = path.join(process.cwd(), 'src/js/prototype/films/nao-querer-nada.js');
    const src = fs.readFileSync(experiencePath, 'utf8');
    const startToken = 'const TRACK5_FILM_DIRECTOR_CAMERA = ';
    const endToken = '\nconst TRACK5_CHAMBER_FILM_TIMELINE =';
    const start = src.indexOf(startToken);
    const end = src.indexOf(endToken);
    if (start < 0 || end < 0) {
        throw new Error('TRACK5_FILM_DIRECTOR_CAMERA block not found in experience.js');
    }
    let body = src.slice(start + startToken.length, end).trim();
    body = body.replace(/target: TRACK5_FILM_TARGET/g, 'target: [0.959854, 1.901261, -0.038787]');
    body = body.replace(
        /targetPoint: TRACK5_FILM_FLOWER_HEAD/g,
        'targetPoint: [0.959854, 5.612414, -0.038787]'
    );
    body = body.replace(/;\s*$/, '');
    // eslint-disable-next-line no-new-func -- fs-loaded authored config mirror for validation
    return new Function(`return (${body});`)();
}

function loadMeasuredBounds() {
    const boundsPath = path.join(process.cwd(), 'scripts/track5-measured-bounds.json');
    return JSON.parse(fs.readFileSync(boundsPath, 'utf8'));
}

function loadBeatGrid() {
    const beatsPath = path.join(
        process.cwd(),
        'public/assets/journeys/analysis/nao-querer-nada/beats.json'
    );
    return JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
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

describe('Track 5 film director config', () => {
    const bounds = loadMeasuredBounds();
    const beatGrid = loadBeatGrid();
    const filmCamera = loadTrack5FilmDirectorCamera();
    const H = bounds.height;

    it('passes createShotDirector validation against the curated beat grid', () => {
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: filmCamera.setups,
            cutTimeline: filmCamera.cutTimeline,
            accentCuts: filmCamera.accentCuts,
            defaultTargetPoint: filmCamera.target
        });

        const validation = director.validate();
        expect(validation.ok).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(director.isActive()).toBe(true);
    });

    it('maps every cut bar to exactly one downbeat in the beat grid', () => {
        const cutBars = Object.keys(filmCamera.cutTimeline).map((key) => Number.parseInt(key, 10));
        cutBars.forEach((bar) => {
            const matches = beatGrid.beats.filter(
                (entry) => entry.bar === bar && entry.beatInBar === 1
            );
            expect(matches).toHaveLength(1);
        });
        expect(cutBars).toHaveLength(22);
        expect(Object.keys(filmCamera.setups)).toHaveLength(17);
    });

    it('requires adjacent authored cuts to differ in at least two composition axes', () => {
        const cutBars = Object.keys(filmCamera.cutTimeline)
            .map((key) => Number.parseInt(key, 10))
            .sort((a, b) => a - b);
        for (let index = 1; index < cutBars.length; index += 1) {
            const prevBar = cutBars[index - 1];
            const nextBar = cutBars[index];
            const prevId = filmCamera.cutTimeline[String(prevBar)];
            const nextId = filmCamera.cutTimeline[String(nextBar)];
            const prev = filmCamera.setups[prevId];
            const next = filmCamera.setups[nextId];
            expect(diffCount(shotSignature(prev), shotSignature(next))).toBeGreaterThanOrEqual(2);
        }
    });

    it('authors the pre-fracture accent insert ending on the bar-76 downbeat', () => {
        expect(filmCamera.accentCuts).toHaveLength(1);
        const accent = filmCamera.accentCuts[0];
        expect(accent.setupId).toBe('ecu_flower');
        expect(accent.startBeat).toBe(299);
        expect(accent.endBeat).toBe(301);
        const endDownbeat = beatGrid.beats.find((entry) => entry.bar === 76 && entry.beatInBar === 1);
        expect(endDownbeat?.beat).toBe(301);
    });

    it('keeps framing distance bands in measured H units', () => {
        const wsExtra = new Set(['ws_final_trace']);
        Object.entries(filmCamera.setups).forEach(([setupId, setup]) => {
            const ratio = setup.distance / H;
            if (setup.framing === 'WS') {
                if (wsExtra.has(setupId)) {
                    expect(ratio).toBeCloseTo(6.5, 2);
                } else {
                    expect(ratio).toBeGreaterThanOrEqual(3.5);
                    expect(ratio).toBeLessThanOrEqual(5.5 + 1e-6);
                }
            } else if (setup.framing === 'MCU') {
                expect(ratio).toBeGreaterThanOrEqual(1.6);
                expect(ratio).toBeLessThanOrEqual(2.4);
            } else if (setup.framing === 'ECU') {
                expect(ratio).toBeGreaterThanOrEqual(0.45);
                expect(ratio).toBeLessThanOrEqual(0.9);
            }
        });
    });

    it('resolves different setup ids at 60s and 400s on the authored timeline', () => {
        const director = createShotDirector({
            enabled: true,
            beatGrid,
            setups: filmCamera.setups,
            cutTimeline: filmCamera.cutTimeline,
            accentCuts: filmCamera.accentCuts,
            defaultTargetPoint: filmCamera.target
        });
        const at60 = director.resolve(60, {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [0, 0, 0], fov: 45 }
        });
        const at400 = director.resolve(400, {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: { position: [0, 0, 0], target: [0, 0, 0], fov: 45 }
        });
        expect(at60?.setupId).toBeTruthy();
        expect(at400?.setupId).toBeTruthy();
        expect(at60.setupId).not.toBe(at400.setupId);
    });

    it('uses equal quarter-note spacing within every bar of the curated beat grid', () => {
        const nominalQuarter = 60 / beatGrid.bpm;
        const beats = beatGrid.beats;
        const beatsByBar = new Map();

        beats.forEach((entry) => {
            const barBeats = beatsByBar.get(entry.bar) || [];
            barBeats.push(entry);
            beatsByBar.set(entry.bar, barBeats);
        });

        let previousTime = -Infinity;
        beats.forEach((entry) => {
            expect(entry.time).toBeGreaterThan(previousTime);
            previousTime = entry.time;
        });

        beatsByBar.forEach((barBeats) => {
            expect(barBeats).toHaveLength(4);
            barBeats.sort((left, right) => left.beatInBar - right.beatInBar);
            barBeats.forEach((entry, index) => {
                expect(entry.beatInBar).toBe(index + 1);
            });

            const quarterIntervals = [
                barBeats[1].time - barBeats[0].time,
                barBeats[2].time - barBeats[1].time,
                barBeats[3].time - barBeats[2].time
            ];
            expect(quarterIntervals[0]).toBeCloseTo(quarterIntervals[1], 9);
            expect(quarterIntervals[1]).toBeCloseTo(quarterIntervals[2], 9);
            quarterIntervals.forEach((interval) => {
                expect(interval).toBeGreaterThan(0.001);
                expect(interval).toBeLessThan(1.1);
            });
        });

        const lastBarIndex = Math.max(...beats.map((entry) => entry.bar));
        const lastBarBeats = beatsByBar.get(lastBarIndex).slice().sort((left, right) => left.beatInBar - right.beatInBar);
        const tailQuarters = [
            lastBarBeats[1].time - lastBarBeats[0].time,
            lastBarBeats[2].time - lastBarBeats[1].time,
            lastBarBeats[3].time - lastBarBeats[2].time
        ];
        tailQuarters.forEach((interval) => {
            expect(Math.abs(interval - nominalQuarter)).toBeLessThanOrEqual(0.005);
        });
    });
});
