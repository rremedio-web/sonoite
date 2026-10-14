/* eslint-disable security/detect-object-injection -- Indices come from fixed sample arrays. */
import * as THREE from 'three';
import { sampleTrack4Ledger, applyTrack4Ledger, createTrack4LedgerPanel, TRACK4_LEDGER_PANEL, applyTrack4Edit } from '../../src/js/prototype/track4-ledger.js';
import { HORAS_MORTAS_CHAMBER_FILM_TIMELINE } from '../../src/js/prototype/films/horas-mortas.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

const samples = (from, to, step = 0.1) => {
    const out = [];
    for (let t = from; t <= to + 1e-9; t += step) {
        out.push(t);
    }
    return out;
};

describe('Track 4 state ledger v2: states', () => {
    const at = (t, arm = 'f') => sampleTrack4Ledger(t, arm);

    it('starts black, then four named warming arrivals; other restrikes return to the same reach', () => {
        expect(at(5).range).toBe(0);
        expect(at(20).range).toBeCloseTo(6.2, 5); // crown
        expect(at(35).range).toBeCloseTo(at(20).range, 5); // a restrike, not an arrival
        expect(at(50).range).toBeCloseTo(7.2, 5); // whole flower
        expect(at(70).range).toBeCloseTo(8.2, 5); // fingers, with the 66.27 pulse
        expect(at(110).range).toBeCloseTo(9.0, 5); // egg and hand
    });

    it('lands the form at 119.25 and the wall and shadow as a step at the 187 cut', () => {
        expect(at(125).range).toBeCloseTo(10.5, 5);
        expect(at(186).wall).toBe(0);
        expect(at(190).range).toBeCloseTo(28, 5);
        expect(at(190).wall).toBeCloseTo(1, 5);
    });

    it('arm F loses reach at the climax for longer than a stutter, then throws a hard shadow at 285.5', () => {
        expect(at(271, 'f').range).toBeCloseTo(11, 5);
        expect(at(271, 'f').wall).toBeCloseTo(0, 5);
        expect(at(273, 'f').range).toBeCloseTo(11, 5);
        const peak = at(292, 'f');
        expect(peak.angle).toBeCloseTo(0.45, 5);
        expect(peak.penumbra).toBeCloseTo(0.15, 5);
        expect(peak.range).toBeCloseTo(30, 5);
    });

    it('arm A throws the hard shadow at the climax and softens as the sub-bass drops', () => {
        expect(at(272, 'a').angle).toBeCloseTo(0.45, 5);
        expect(at(292, 'a').angle).toBeCloseTo(1.0, 5);
        expect(at(272, 'a').range).toBeGreaterThan(at(272, 'f').range + 5);
    });

    it.each(['f', 'a'])('keeps the whole room through the 319.10 wide before the first loss (arm %s)', (arm) => {
        expect(at(321, arm).wall).toBeCloseTo(1, 5);
        expect(at(321, arm).range).toBeGreaterThanOrEqual(28);
        expect(at(330.5, arm).wall).toBe(0);
        expect(at(331, arm).range).toBeCloseTo(11, 5);
        expect(at(334.2, arm).range).toBeCloseTo(7.6, 5);
        expect(at(337, arm).range).toBeCloseTo(6.6, 5);
    });

    it('is not a palindrome: the descent keeps a wide soft cone and a dark-adapted grey room', () => {
        for (const down of [380, 365, 326]) {
            expect(at(down).angle).toBeCloseTo(1.0, 5);
            expect(at(down).penumbra).toBeCloseTo(0.9, 5);
        }
        expect(at(12).fill).toBe(0);
        expect(at(365).fill).toBeGreaterThan(2);
        expect(at(380).fill).toBeGreaterThan(2);
    });

    it('loses one more reach per AFTER restrike, then black with the silence', () => {
        expect(at(350).range).toBeCloseTo(6.3, 5);
        expect(at(365).range).toBeCloseTo(5.6, 5);
        expect(at(380).range).toBeCloseTo(4.6, 5);
        expect(at(389).range).toBe(0);
        expect(at(391.1).fill).toBeCloseTo(0, 5);
    });

    it('is a pure function of time, identical in either seek direction', () => {
        const times = samples(0, 391, 3.7);
        const forward = times.map((t) => sampleTrack4Ledger(t, 'f'));
        const backward = [...times].reverse().map((t) => sampleTrack4Ledger(t, 'f')).reverse();
        expect(backward).toEqual(forward);
    });
});

describe('Track 4 state ledger v2: light mapping', () => {
    const base = { keyPosition: [-3.15, 5.515, 3], keyTarget: [0.96, 2.5, -0.04], key: 0, wall: 0, floor: 0.4, angle: 1.05, penumbra: 0.7, color: '#ffad42' };

    it('uses a desaturated key and a neutral wall so the tube is the only saturated thing', () => {
        const light = applyTrack4Ledger(base, 250, 'f', 1, true);
        expect(light.color).not.toBe('#ffad42');
        expect(light.wallColor).toBeDefined();
        expect(light.distance).toBeGreaterThan(0);
    });

    it('keeps the electrical schedule and stays dark before start', () => {
        expect(applyTrack4Ledger(base, 250, 'f', 0, true).key).toBe(0);
        expect(applyTrack4Ledger(base, 250, 'f', 0, true).wall).toBe(0);
        expect(applyTrack4Ledger(base, 365, 'f', 1, false).fill).toBe(0);
        expect(applyTrack4Ledger(base, 5, 'f', 1, true).distance).toBeGreaterThan(0);
    });
});

describe('Track 4 state ledger: gating', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    const current = (query, slug = 'horas-mortas', variant = 'horas-mortas-cinema') => ({
        urlParams: new URLSearchParams(query),
        track: { slug },
        chamberVariantKey: variant,
        getTrack4LedgerArm: ReliquaryPrototypeExperience.prototype.getTrack4LedgerArm,
        usesTrack5Ledger: ReliquaryPrototypeExperience.prototype.usesTrack5Ledger
    });

    it.each([
        ['ledger=f', 'horas-mortas', 'horas-mortas-cinema', 'f'],
        ['ledger=A', 'horas-mortas', 'horas-mortas-cinema', 'a'],
        ['ledger=x', 'horas-mortas', 'horas-mortas-cinema', null],
        ['ledger=f', 'sonoite', 'sonoite-cinema', null],
        ['ledger=f', 'horas-mortas', 'track5-cinema', null],
        ['ledger=f&recut=1', 'horas-mortas', 'horas-mortas-cinema', null],
        ['ledger=f&proof=120', 'horas-mortas', 'horas-mortas-cinema', null],
        ['ledger=f&duration=120', 'horas-mortas', 'horas-mortas-cinema', null],
        ['', 'horas-mortas', 'horas-mortas-cinema', null]
    ])('%s on %s / %s -> %s', (query, slug, variant, expected) => {
        const e = current(query, slug, variant);
        expect(e.getTrack4LedgerArm()).toBe(expected);
    });

    it('routes the ledger through the Stage room, and leaves the default film untouched', () => {
        const e = current('ledger=a');
        expect(ReliquaryPrototypeExperience.prototype.getCinematicProposal.call(e)).toBe('stage');
        const plain = current('');
        expect(ReliquaryPrototypeExperience.prototype.getCinematicProposal.call(plain)).toBeNull();
    });

    it('does not carry the ledger to the next track', () => {
        window.history.replaceState({}, '', '/?track=horas-mortas&ledger=f&seed=7');
        const destination = ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl('nao-querer-nada');
        expect(destination).not.toContain('ledger');
    });
});

describe('Track 4 state ledger v2: receiving panel', () => {
    it('is a shadow receiver close behind the sculpture, never a caster', () => {
        const panel = createTrack4LedgerPanel(THREE);
        expect(panel.receiveShadow).toBe(true);
        expect(panel.castShadow).toBe(false);
        expect(panel.position.z).toBeCloseTo(TRACK4_LEDGER_PANEL.position[2], 5);
        // Closer than the room's back wall (-9.33) so the flower's shadow stays crisp.
        expect(panel.position.z).toBeGreaterThan(-5);
        panel.geometry.dispose();
        panel.material.dispose();
    });

    it('is out of reach during warming and inside it from the 187 cut, out again in arm F\'s loss', () => {
        const key = new THREE.Vector3(-3.15, 5.6, 3);
        const toPanel = key.distanceTo(new THREE.Vector3(...TRACK4_LEDGER_PANEL.position));
        expect(sampleTrack4Ledger(110).range).toBeLessThan(toPanel);
        expect(sampleTrack4Ledger(190).range).toBeGreaterThan(toPanel * 2);
        expect(sampleTrack4Ledger(271, 'f').range).toBeLessThan(toPanel * 1.1);
    });
});

describe('Track 4 edit (?edit=1)', () => {
    const camera = HORAS_MORTAS_CHAMBER_FILM_TIMELINE.camera;
    const edited = applyTrack4Edit(camera);
    const cue = (t) => edited.score.find((c) => Math.abs(c.atSeconds - t) < 0.01);

    it('moves the crash cut onto the measured onset', () => {
        expect(cue(187)).toBeUndefined();
        expect(cue(188.39).transitionSeconds).toBe(0);
    });

    it('starts BURN on a clean cut and lands the push on the sub-bass drop, then holds to 319.1', () => {
        expect(cue(238.15).transitionSeconds).toBe(0);
        const arrival = cue(285.5);
        expect(arrival.transitionSeconds).toBeCloseTo(285.5 - 238.15, 5);
        expect(cue(317.6)).toBeUndefined();
        expect(cue(319.1)).toBeDefined();
    });

    it('adds one slow opening push arriving on the pulse entry, then holds to 119.25', () => {
        const push = cue(66.27);
        expect(push.transitionSeconds).toBeCloseTo(66.27 - 53.96, 5);
        const open = edited.score[0];
        const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
        expect(dist(push.position, open.target)).toBeLessThan(dist(open.position, open.target));
        expect(cue(119.25).transitionSeconds).toBe(0);
    });

    it('keeps the score chronological and never mutates the authored camera', () => {
        const times = edited.score.map((c) => c.atSeconds);
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        expect(camera.score.find((c) => c.atSeconds === 187)).toBeDefined();
        expect(camera.score.find((c) => Math.abs(c.atSeconds - 317.6) < 0.01)).toBeDefined();
    });

    it.each([
        ['edit=1', 'horas-mortas', 'horas-mortas-cinema', true],
        ['edit=1&ledger=f', 'horas-mortas', 'horas-mortas-cinema', true],
        ['edit=0', 'horas-mortas', 'horas-mortas-cinema', false],
        ['edit=1', 'sonoite', 'sonoite-cinema', false],
        ['edit=1&recut=1', 'horas-mortas', 'horas-mortas-cinema', false],
        ['edit=1&proof=60', 'horas-mortas', 'horas-mortas-cinema', false]
    ])('%s on %s -> %s', (query, slug, variant, expected) => {
        const e = { urlParams: new URLSearchParams(query), track: { slug }, chamberVariantKey: variant };
        expect(ReliquaryPrototypeExperience.prototype.usesTrack4Edit.call(e)).toBe(expected);
    });

    it('does not carry the edit to the next track', () => {
        window.history.replaceState({}, '', '/?track=horas-mortas&edit=1&ledger=f');
        expect(ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl('nao-querer-nada')).not.toContain('edit');
        window.history.replaceState({}, '', '/');
    });
});
