import * as THREE from 'three';
import { createTrack1LightOccluder, sampleTrack1LightSequence } from '../../src/js/prototype/track1-light-sequence.js';
import { createProposalCamera, sampleProposalLight } from '../../src/js/prototype/cinematic-proposals.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

const sample = (t, reduced = false) => sampleTrack1LightSequence(
    sampleProposalLight('stage', 'sonoite', t), t, reduced);
const experience = (query) => {
    window.history.replaceState({}, '', `/?${query}`);
    return new ReliquaryPrototypeExperience(document.createElement('div'));
};

describe('Track 1 light interruption', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('holds the source through the hush and after the reveal, restoring on reverse seeks', () => {
        expect(sample(318).keyPosition).toEqual(sample(329).keyPosition);
        const held = sample(384);
        for (const t of [388, 398, 410, 320, 384, 525]) {
            const state = sample(t);
            if (t >= 384) expect(state.keyPosition).toEqual(held.keyPosition);
        }
        expect(sample(320).lightPhase).toBe('conceal');
        expect(sample(350).lightPhase).toBe('reveal');
        expect(held.lightPhase).toBe('rest');
        expect(sample(310).keyPosition[0]).toBeLessThan(sample(350).keyPosition[0]);
    });

    it('preserves the rest of the film and keeps transitions continuous without an exposure flash', () => {
        for (const t of [0, 90, 125, 285]) {
            const base = sampleProposalLight('stage', 'sonoite', t);
            const next = sample(t);
            expect(next.keyPosition).toEqual(base.keyPosition);
            expect(next.key).toBe(base.key);
            expect(next.wall).toBe(base.wall);
            expect(next.occluder).toBe(false);
        }
        for (const boundary of [286, 302, 310, 316.65, 330, 350, 365, 384, 410]) {
            const a = sample(boundary - 0.001), b = sample(boundary + 0.001);
            expect(new THREE.Vector3(...a.keyPosition).distanceTo(new THREE.Vector3(...b.keyPosition))).toBeLessThan(0.002);
            expect(Math.abs(a.wall - b.wall)).toBeLessThan(0.02);
            expect(a.key).toBe(b.key);
        }
        for (const t of [488.5, 525, 535]) {
            const base = sampleProposalLight('stage', 'sonoite', t);
            expect(sample(t).key).toBe(base.key);
            expect(sample(t).wall).toBe(base.wall);
        }
        expect(sample(535).occluder).toBe(false);
    });

    it('keeps reduced-motion lighting stationary and preserves the final extinction', () => {
        for (const t of [125, 286, 320, 350, 384, 438.9, 525]) {
            expect(sample(t, true).keyPosition).toEqual([4, 5.2, 4.5]);
            expect(sample(t, true).occluder).toBe(false);
        }
        expect(sample(535, true).key).toBe(0);
        expect(sample(535, true).wall).toBe(0);
    });

    it('keeps the lighting flag outside the authored close-up rather than blocking the camera', () => {
        const config = createProposalCamera({ score: [{ atSeconds: 310.35 }] }, 'sonoite', 'stage');
        const pose = config.score.find(cue => cue.atSeconds === 310.35);
        const camera = new THREE.PerspectiveCamera(pose.fov, 16 / 9, 0.1, 180);
        camera.position.fromArray(pose.position);
        camera.lookAt(new THREE.Vector3(...pose.target));
        camera.updateMatrixWorld();
        const flag = createTrack1LightOccluder();
        flag.updateMatrixWorld();
        const vertices = flag.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i += 1) {
            const screen = new THREE.Vector3().fromBufferAttribute(vertices, i)
                .applyMatrix4(flag.matrixWorld).project(camera);
            expect(screen.y).toBeGreaterThan(1);
        }
        flag.geometry.dispose(); flag.material.dispose();
    });

    it('isolates the sequence from other proposals, tracks, proof and navigation', () => {
        const e = experience('track=sonoite&proposal=stage&light=sequence');
        expect(e.usesTrack1LightSequence()).toBe(true);
        expect(e.getTrackNavigationUrl('horas-mortas')).not.toContain('light=');
        for (const query of ['track=sonoite&proposal=stage', 'track=sonoite&light=sequence',
            'track=sonoite&proposal=afterimage&light=sequence',
            'track=horas-mortas&proposal=stage&light=sequence',
            'track=nao-querer-nada&proposal=stage&light=sequence',
            'track=sonoite&proposal=stage&light=sequence&proof=120']) {
            expect(experience(query).usesTrack1LightSequence()).toBe(false);
        }
    });

    it('refreshes a cast shadow when only the source position changes, then settles', () => {
        const e = experience('track=sonoite&proposal=stage&light=sequence');
        e.keyLight = new THREE.SpotLight();
        e.markShadowDirtyIfNeeded();
        e.shadowDirty = false;
        e.keyLight.position.x += 0.02;
        e.markShadowDirtyIfNeeded();
        expect(e.shadowDirty).toBe(true);
        e.shadowDirty = false;
        e.markShadowDirtyIfNeeded();
        expect(e.shadowDirty).toBe(false);
        e.keyLight.dispose();
    });
});
