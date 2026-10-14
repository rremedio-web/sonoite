import * as THREE from 'three';
import { createTrack1StageResponse, sampleTrack1Climax, sampleTrack1ReliquaryLight, prepareWeightedDrape } from '../../src/js/prototype/track1-reliquary-stage.js';
import { sampleProposalLight } from '../../src/js/prototype/cinematic-proposals.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

const loud = { bassLevel: 1, midLevel: 1, averageLevel: 1 };
const silent = { bassLevel: 0, midLevel: 0, averageLevel: 0 };
const advance = (response, seconds, rate, levels = loud) => {
    for (let n = 0; n < seconds * rate; n += 1) response.update(levels, 1 / rate, true);
    return { ...response.values };
};

describe('dim Track 1 setting', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('settles at different physical speeds without depending on frame rate', () => {
        const a = createTrack1StageResponse(), b = createTrack1StageResponse();
        const slow = advance(a, 4, 30), fast = advance(b, 4, 120);
        for (const key of Object.keys(slow)) expect(slow[key]).toBeCloseTo(fast[key], 8);
        expect(slow.surface).toBeGreaterThan(slow.light);
        expect(slow.light).toBeGreaterThan(slow.cloth);
        expect(slow.cloth).toBeGreaterThan(slow.air);
        const decayed = advance(a, 120, 30, silent);
        for (const value of Object.values(decayed)) expect(value).toBeLessThan(0.001);
        expect(b.update(loud, 1, false)).toEqual({ light: 0, cloth: 0, air: 0, surface: 0 });
    });

    it('bounds invalid analyser values and clears the response on the transport reset', () => {
        const response = createTrack1StageResponse();
        advance(response, 10, 30, { bassLevel: 20, midLevel: NaN, averageLevel: -1 });
        expect(response.values.light).toBeLessThanOrEqual(1);
        expect(response.values.surface).toBe(0);
        expect(response.values.air).toBe(0);
        const e = new ReliquaryPrototypeExperience(document.createElement('div'));
        advance(e.track1StageResponse, 2, 30);
        e.resetAudioAccents();
        expect(e.track1StageResponse.values).toEqual({ light: 0, cloth: 0, air: 0, surface: 0 });
    });

    it('keeps the void and ending dark even with loud input', () => {
        const response = { light: 1, cloth: 1, air: 1, surface: 1 };
        for (const time of [0, 30, 535, 538]) {
            const state = sampleTrack1ReliquaryLight(sampleProposalLight('stage', 'sonoite', time), time, response);
            expect(state.key).toBe(0);
            expect(state.wall).toBe(0);
        }
        const base = sampleProposalLight('stage', 'sonoite', 250);
        const bright = sampleTrack1ReliquaryLight(base, 250, response);
        expect(bright.key).toBeLessThan(base.key * 0.6);
        expect(bright.wall).toBeLessThan(base.wall * 0.41);
    });

    it('develops the climax beyond the old 384s stop and retains the changed state on seeks', () => {
        const response = { light: 0, cloth: 0, air: 0, surface: 0 };
        const base = { ...sampleProposalLight('stage', 'sonoite', 400), keyPosition: [5.2, 5.8, 4.5] };
        const first = sampleTrack1ReliquaryLight(base, 384.03, response);
        const middle = sampleTrack1ReliquaryLight(base, 411.5, response);
        const last = sampleTrack1ReliquaryLight(base, 459.5, response);
        expect(first.keyPosition).not.toEqual(middle.keyPosition);
        expect(middle.keyPosition).not.toEqual(last.keyPosition);
        expect(last.keyPosition).toEqual([3.2, 3.25, 2.6]);
        const target = new THREE.Vector3(...base.keyTarget);
        const irradiance = state => state.key / new THREE.Vector3(...state.keyPosition).distanceToSquared(target);
        expect(last.key).toBeLessThan(first.key);
        expect(irradiance(last)).toBeLessThan(irradiance(first) * 2);
        expect(last.angle).toBeGreaterThan(first.angle);
        expect(last.wall).toBeGreaterThan(first.wall);
        for (const time of [500, 459.5, 528]) expect(sampleTrack1Climax(time).settle).toBe(1);
        expect(sampleTrack1Climax(200).settle).toBe(0);
        expect(sampleTrack1Climax(420, true).advance).toBe(0);
        expect(sampleTrack1Climax(420, true).settle).toBe(0);
        expect(sampleTrack1Climax(420, false, false)).toEqual({ advance: 0, settle: 0, diffusion: 0 });
        expect(sampleTrack1ReliquaryLight(base, 535, response).diffusion).toBe(0);
        expect(first.fog).toBe(last.fog);
    });

    it('keeps morph coordinates intact while adopting and grounding a transformed mesh', () => {
        const root = new THREE.Group(); root.rotation.y = 0.4; root.position.y = 3;
        const geometry = new THREE.BoxGeometry(2, 4, 2);
        geometry.morphTargetsRelative = true;
        const delta = new Float32Array(geometry.attributes.position.count * 3).fill(0.01);
        geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(delta, 3)];
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
        mesh.name = 'weightedDrape'; mesh.position.set(-4, 5, -6); root.add(mesh);
        const cloth = prepareWeightedDrape(root);
        expect(root.children).toHaveLength(0);
        expect(Array.from(cloth.geometry.morphAttributes.position[0].array)).toEqual(Array.from(delta));
        expect(new THREE.Box3().setFromObject(cloth).min.y).toBeCloseTo(0.015);
        expect(cloth.castShadow && cloth.receiveShadow).toBe(true);
        cloth.geometry.dispose(); cloth.material.dispose();
    });

    it('isolates the setting from other tracks, proof and navigation', () => {
        const make = query => {
            window.history.replaceState({}, '', `/?${query}`);
            return new ReliquaryPrototypeExperience(document.createElement('div'));
        };
        const e = make('track=sonoite&proposal=stage&setting=reliquary');
        expect(e.usesTrack1Reliquary()).toBe(true);
        expect(e.getTrackNavigationUrl('horas-mortas')).not.toContain('setting=');
        for (const query of ['track=sonoite&setting=reliquary',
            'track=sonoite&proposal=afterimage&setting=reliquary',
            'track=horas-mortas&proposal=stage&setting=reliquary',
            'track=nao-querer-nada&proposal=stage&setting=reliquary',
            'track=sonoite&proposal=stage&setting=reliquary&proof=120']) {
            expect(make(query).usesTrack1Reliquary()).toBe(false);
        }
    });
});
