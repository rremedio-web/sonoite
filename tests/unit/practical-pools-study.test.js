import * as THREE from 'three';
import { createChamberPracticals } from '../../src/js/prototype/chamber-practicals.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

describe('early practical pools comparison', () => {
    beforeEach(() => {
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            createRadialGradient: () => ({ addColorStop() {} }),
            fillRect() {}
        });
    });
    afterEach(() => jest.restoreAllMocks());

    it('lifts local light and pools, preserves flames, and restores baseline after a seek', () => {
        const scene = new THREE.Scene();
        const baseline = createChamberPracticals({ THREE, scene });
        const study = createChamberPracticals({ THREE, scene, poolsStudy: true });
        for (const time of [65, 110, 125, 535, 20, 65]) {
            baseline.update(time);
            study.update(time);
            const active = time === 65 || time === 110;
            baseline.entries.forEach((entry, index) => {
                const changed = study.entries[index];
                expect(changed.light.intensity).toBeCloseTo(entry.light.intensity * (active ? 2 : 1));
                expect(changed.light.position).toEqual(entry.light.position);
                if (entry.glowSeed) expect(changed.glowSeed.material.opacity).toBe(entry.glowSeed.material.opacity);
                if (entry.pool) {
                    expect(changed.pool.material.opacity).toBeCloseTo(entry.pool.material.opacity * (active ? 2 : 1));
                    expect(changed.pool.mesh.scale.x).toBeCloseTo(active ? 1.35 : 1);
                }
            });
        }
        study.dispose();
        baseline.dispose();
        expect(scene.children).toHaveLength(0);
    });

    it.each(['sonoite', 'horas-mortas', 'nao-querer-nada'])('isolates the controller to canonical Track 1: %s', (slug) => {
        const current = {
            scene: new THREE.Scene(), track: { slug }, urlParams: new URLSearchParams('scene=original&practicals=pools'),
            chamberVariantKey: slug === 'sonoite' ? 'sonoite-cinema' : 'track5-cinema',
            usesQuietScene: () => false,
            getCinematicProposal: () => null,
            qualityMode: 'balanced'
        };
        ReliquaryPrototypeExperience.prototype.setupChamberPracticals.call(current);
        expect(Boolean(current.chamberPracticals)).toBe(slug === 'sonoite');
        current.chamberPracticals?.dispose();
    });
});
