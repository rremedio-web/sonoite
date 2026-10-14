/* eslint-disable security/detect-object-injection -- Indices come from fixed sample arrays. */
import {
    sampleTrack5Ledger,
    applyTrack5Ledger,
    applyTrack5LedgerCamera,
    TRACK5_LEDGER_EVENTS,
    TRACK5_LEDGER_CUTS,
    TRACK5_LEDGER_ACCENTS
} from '../../src/js/prototype/track5-ledger.js';
import { TRACK5_FILM_DIRECTOR_CAMERA } from '../../src/js/prototype/films/nao-querer-nada.js';
import { createTrack5TarPassageCamera } from '../../src/js/prototype/track5-tar-passage.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

const at = (t) => sampleTrack5Ledger(t);

describe('Track 5 ledger: the light offers and takes back, then proves the damage', () => {
    it('S0 is the rear edge alone; the offer steps on at the measured arrival', () => {
        expect(at(30).k.level).toBe(0);
        expect(at(30).r).toBe(1);
        expect(at(64).k.level).toBe(0);
        expect(TRACK5_LEDGER_EVENTS.arrival).toBeCloseTo(64.34, 2); // measured first kick
        expect(at(TRACK5_LEDGER_EVENTS.arrival + 0.4).k.level).toBeGreaterThan(0.4);
    });

    it('takes the offer back in one step on the drums-out and partly returns at 170.69', () => {
        expect(at(139.5).k.level).toBe(0);
        const partial = at(171.1);
        expect(partial.k.level).toBeGreaterThan(0.4);
        expect(partial.k.angle).toBeLessThan(at(120).k.angle); // narrower: flower and egg, not the hand
    });

    it('steps, never eases: every change completes within 0.3 s', () => {
        for (const t of [TRACK5_LEDGER_EVENTS.arrival, TRACK5_LEDGER_EVENTS.drumsOut, TRACK5_LEDGER_EVENTS.partialReturn, TRACK5_LEDGER_EVENTS.drop]) {
            const settled = at(t + 0.31).k.level;
            expect(at(t + 2).k.level).toBeCloseTo(settled, 6);
        }
    });

    it('keeps the wet strip constant from the drop on, so before and after still match', () => {
        expect(at(150).strip).toBe(0);
        expect(at(260).strip).toBe(at(440).strip);
        expect(at(260).strip).toBe(at(515).strip);
        expect(at(260).strip).toBeGreaterThan(0);
    });

    it('the after-states reuse the exact "before" key, so only the surface changes', () => {
        const before = at(260).k;
        for (const t of [440, 480, 515]) {
            const after = at(t).k;
            expect(after.position).toEqual(before.position);
            expect(after.target).toEqual(before.target);
            expect(after.angle).toBe(before.angle);
            expect(after.penumbra).toBe(before.penumbra);
            expect(after.range).toBe(before.range);
            expect(after.level).toBe(before.level);
        }
    });

    it('the collapse drops the key to the floor, and the rear edge holds to the last note', () => {
        expect(at(338).k.position[1]).toBeLessThan(1);
        for (const t of [338, 400, 500, 532]) {
            expect(at(t).r).toBe(1);
        }
    });

    it('follows the quiet coda: key off at the decline, the edge fades to the last kick, then black', () => {
        expect(at(533.3).k.level).toBe(0);
        expect(at(545).r).toBeGreaterThan(0);
        expect(at(545).r).toBeLessThan(1);
        for (const t of [559, 560, 563.9]) {
            expect(at(t).k.level).toBe(0);
            expect(at(t).r).toBe(0);
        }
    });

    it('is a pure function of time in either seek direction', () => {
        const times = [];
        for (let t = 0; t <= 564; t += 7.3) {
            times.push(t);
        }
        const forward = times.map((t) => at(t));
        const backward = [...times].reverse().map((t) => at(t)).reverse();
        expect(backward).toEqual(forward);
    });

    it('trims the clean and the coated flower close-ups by the same factor', () => {
        const base = { keyPosition: [0, 0, 0], keyTarget: [0, 0, 0] };
        const clean = applyTrack5Ledger(base, 320, true).key / applyTrack5Ledger(base, 260, true).key;
        const coated = applyTrack5Ledger(base, 515, true).key / applyTrack5Ledger(base, 440, true).key;
        expect(clean).toBeCloseTo(coated, 6);
        expect(clean).toBeLessThan(1);
    });

    it('maps to cold light with no fill, wall or floor stain, and stays dark before start', () => {
        const light = applyTrack5Ledger({ keyPosition: [0, 0, 0], keyTarget: [0, 0, 0] }, 260, true);
        expect(light.fill).toBe(0);
        expect(light.wall).toBe(0);
        expect(light.residue).toBe(0);
        expect(light.rimPosition).toBeDefined();
        expect(applyTrack5Ledger({}, 260, false).key).toBe(0);
        expect(applyTrack5Ledger({}, 260, false).rim).toBe(0);
    });
});

describe('Track 5 ledger: camera plan', () => {
    const camera = applyTrack5LedgerCamera(createTrack5TarPassageCamera(TRACK5_FILM_DIRECTOR_CAMERA));

    it('uses no setup behind the wall or beyond ~18 units', () => {
        for (const id of new Set([...Object.values(camera.cutTimeline), ...camera.accentCuts.map((a) => a.setupId)])) {
            const setup = camera.setups[id];
            expect(setup).toBeDefined();
            expect(Math.abs(Math.cos(setup.yaw))).toBeGreaterThan(0.2); // not from directly behind
            expect(setup.distance).toBeLessThanOrEqual(18);
        }
    });

    it('keeps the frontier close-up, returns to the same frames after the collapse, and never cuts after 510.67', () => {
        expect(camera.cutTimeline[149]).toBe('mcu_tar_frontier');
        expect(camera.cutTimeline[77]).toBe(camera.cutTimeline[165]); // full figure: on the drop, and after
        expect(camera.cutTimeline[103]).toBe(camera.cutTimeline[179]); // the hand frame: on the snare, and after
        expect(camera.cutTimeline[94]).toBeUndefined(); // the unmotivated 246.00 cut is gone
        expect(camera.cutTimeline[121]).toBe(camera.cutTimeline[195]); // the flower close-up returns
        expect(Math.max(...Object.keys(camera.cutTimeline).map(Number))).toBe(195);
        expect(camera.cutTimeline[204]).toBeUndefined();
        expect(camera.cutTimeline[213]).toBeUndefined();
    });

    it('re-aims the flower close-up at the measured bloom edge, not the empty box top', () => {
        expect(camera.setups.p3_flower.targetPoint[1]).toBeLessThan(5);
        expect(camera.setups.ecu_surface.targetPoint[1]).toBeLessThan(5);
    });

    it('lands the kick, the drop and the collapse on their measured hits', () => {
        expect(TRACK5_LEDGER_CUTS[25]).toBe('mcu_right_low'); // 64.00 downbeat for the 64.34 kick
        expect(TRACK5_LEDGER_ACCENTS).toEqual([
            { startBeat: 302, endBeat: 305, setupId: TRACK5_LEDGER_CUTS[77] }, // 198.67 for the 198.75 drop
            { startBeat: 406, endBeat: 409, setupId: TRACK5_LEDGER_CUTS[103] }, // 268.08 for the 268.24 snare
            { startBeat: 507, endBeat: 509, setupId: TRACK5_LEDGER_CUTS[128] } // 335.66, just after the 335.50 last crash
        ]);
    });

    it('does not modify the authored camera', () => {
        expect(TRACK5_FILM_DIRECTOR_CAMERA.cutTimeline[25]).toBe('ws_back_silhouette');
        expect(TRACK5_FILM_DIRECTOR_CAMERA.setups.p2_full_figure).toBeUndefined();
    });
});

describe('Track 5 ledger: gating', () => {
    it.each([
        ['ledger=1', 'nao-querer-nada', 'track5-cinema', true],
        ['ledger=0', 'nao-querer-nada', 'track5-cinema', false],
        ['ledger=1', 'horas-mortas', 'horas-mortas-cinema', false],
        ['ledger=1&recut=1', 'nao-querer-nada', 'track5-cinema', false],
        ['ledger=1&proof=60', 'nao-querer-nada', 'track5-cinema', false],
        ['ledger=1', 'nao-querer-nada', 'track5-probe-bleach', false]
    ])('%s on %s / %s -> %s', (query, slug, variant, expected) => {
        const e = { urlParams: new URLSearchParams(query), track: { slug }, chamberVariantKey: variant };
        expect(ReliquaryPrototypeExperience.prototype.usesTrack5Ledger.call(e)).toBe(expected);
    });

    it('does not carry the ledger to the next track', () => {
        window.history.replaceState({}, '', '/?track=nao-querer-nada&ledger=1');
        expect(ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl('sonoite')).not.toContain('ledger');
        window.history.replaceState({}, '', '/');
    });
});
