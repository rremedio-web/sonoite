import * as THREE from 'three';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';
import { createRelicMutation } from '../../src/js/prototype/relic-mutation.js';
import { MATERIAL_STUDY_MODEL_PATH, resolveHeroModelCandidates, resolveThemeAssetUrl, shouldPreserveHeroModelMaterials } from '../../src/js/prototype/hero-model-urls.js';

const themeUrl = 'https://sonoite.local/wp-content/themes/sonoite-theme';

describe('authored material study in the film pipeline', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('selects only the comparison asset and preserves its material slots', () => {
        const expected = resolveThemeAssetUrl(MATERIAL_STUDY_MODEL_PATH, themeUrl);
        expect(resolveHeroModelCandidates({ relicChoice: 'materials', texturedModelEnabled: true, themeUrl })).toEqual([expected]);
        expect(shouldPreserveHeroModelMaterials({ loadedHeroModelUrl: expected, texturedParam: '0', themeUrl })).toBe(true);
    });

    it('preserves authored finishes and independent role shaders through the physical-material upgrade', () => {
        window.history.replaceState({}, '', '/?track=nao-querer-nada&relic=materials&reaction=surface-two');
        const experience = new ReliquaryPrototypeExperience(document.createElement('div'));
        experience.track = { slug: 'nao-querer-nada' };
        experience.heroConfig = experience.getHeroConfig();
        const hero = new THREE.Group();
        const states = [];
        const keys = [];
        for (const [role, color, roughness, metalness] of [
            ['glove', '#171819', 0.53, 0], ['petals', '#d1cfc7', 0.76, 0],
            ['egg', '#e0ded7', 0.36, 0], ['metal', '#a9b0b5', 0.30, 0.92]
        ]) {
            const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
            material.userData.sonoiteMaterialRole = role;
            const colourBefore = material.color.clone();
            experience.decorateTrack5CinemaMaterial(material);
            expect(material.color.equals(colourBefore)).toBe(true);
            expect(material.roughness).toBe(roughness);
            expect(material.metalness).toBe(metalness);
            hero.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
            states.push({ material, baseRoughness: roughness });
            keys.push(material.customProgramCacheKey());
        }
        expect(new Set(keys).size).toBe(4);
        const mutation = createRelicMutation();
        mutation.install(hero, states);
        states.forEach(({ material }, index) => {
            const shader = {
                uniforms: {},
                vertexShader: THREE.ShaderLib.physical.vertexShader,
                fragmentShader: THREE.ShaderLib.physical.fragmentShader
            };
            material.onBeforeCompile(shader, {});
            expect(material.isMeshPhysicalMaterial).toBe(true);
            expect(material.userData.track5CinemaShader.uniforms).toBe(shader.uniforms);
            expect(shader.uniforms.uRelicMutate).toBeDefined();
            expect(shader.uniforms.uSonoiteErasure).toBeDefined();
            expect(shader.fragmentShader).toContain('sonoiteRelicColor = diffuse;');
            expect(shader.fragmentShader).toContain(`float sonoiteFlower = ${index === 1 ? '1.0' : '0.0'};`);
            expect(shader.fragmentShader).toContain(`float sonoiteEgg = ${index === 2 ? '1.0' : '0.0'};`);
            expect(shader.fragmentShader).toContain('tarMask');
        });
        mutation.dispose();
    });

    it('keeps the accepted roughness gesture on petals while leaving the new metal and egg finishes steady', () => {
        window.history.replaceState({}, '', '/?track=nao-querer-nada&relic=materials&reaction=surface-two');
        const experience = new ReliquaryPrototypeExperience(document.createElement('div'));
        experience.track = { slug: 'nao-querer-nada' };
        experience.heroConfig = experience.getHeroConfig();
        experience.chamberConfig = experience.buildChamberConfig();
        experience.hero = new THREE.Group();
        experience.heroBasePosition = new THREE.Vector3();
        experience.heroMaterialStates = ['glove', 'petals', 'egg', 'metal'].map((role) => {
            const material = new THREE.MeshStandardMaterial({ roughness: 0.76 });
            material.userData.sonoiteMaterialRole = role;
            return { material, baseRoughness: 0.76, baseOpacity: 1 };
        });
        const dynamic = { surfaceResponse: 1, breathing: 0, midSustain: 0 };
        const room = { reactivityReveal: 1, roomPressure: 0, materialEffects: { roughnessDelta: 0 } };
        experience.updateHero(245.65, 0.1, 245.65, {}, dynamic, room);
        expect(experience.heroMaterialStates.map(({ material }) => material.roughness)).toEqual([0.76, 0.4, 0.76, 0.76]);
        expect(experience.getTrackNavigationUrl('sonoite')).not.toContain('relic=materials');
    });
});
