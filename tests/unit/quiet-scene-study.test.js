import * as THREE from 'three';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

function scene(slug = 'sonoite', option = '') {
    window.history.replaceState({}, '', `/?track=${slug}&seed=7${option ? `&scene=${option}` : ''}`);
    const e = new ReliquaryPrototypeExperience(document.createElement('div'));
    e.track = { slug };
    e.scene = new THREE.Scene();
    e.scene.fog = new THREE.FogExp2('#0a0806', 0.002);
    e.keyLight = new THREE.SpotLight('#ffaa22', 1);
    e.rimLight = new THREE.DirectionalLight('#ffaa22', 1);
    e.backLight = new THREE.DirectionalLight('#ffaa22', 1);
    e.fillLight = new THREE.AmbientLight('#ffaa22', 1);
    e.state.started = true;
    return e;
}

describe('approved Track 1 scene default', () => {
    beforeEach(() => {
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            createRadialGradient: () => ({ addColorStop() {} }),
            fillRect() {}
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
        window.history.replaceState({}, '', '/');
    });

    it('does not create candles or carry the study into another film', () => {
        const e = scene();
        expect(e.usesQuietScene()).toBe(true);
        e.setupChamberPracticals();
        expect(e.chamberPracticals).toBeNull();
        expect(e.getTrackNavigationUrl('horas-mortas')).not.toContain('scene=quiet');
        expect(scene('horas-mortas').usesQuietScene()).toBe(false);
        expect(scene('nao-querer-nada').usesQuietScene()).toBe(false);
    });

    it('retains explicit quiet links and the original scene comparison', () => {
        expect(scene('sonoite', 'quiet').usesQuietScene()).toBe(true);
        const original = scene('sonoite', 'original');
        expect(original.usesQuietScene()).toBe(false);
        original.setupChamberPracticals();
        expect(original.chamberPracticals).not.toBeNull();
        expect(original.getTrackNavigationUrl('horas-mortas')).not.toContain('scene=');
        original.chamberPracticals.dispose();
        expect(scene('horas-mortas', 'quiet').usesQuietScene()).toBe(false);
        expect(scene('nao-querer-nada', 'quiet').usesQuietScene()).toBe(false);
    });

    it('stays on Track 1 even when another film forces the Track 1 variant', () => {
        for (const slug of ['horas-mortas', 'nao-querer-nada']) {
            const e = scene(slug);
            e.chamberVariantKey = 'sonoite-cinema';
            expect(e.usesQuietScene()).toBe(false);
        }
    });

    it('is deterministic after seeking, emerges gradually and leaves authored later intensities alone', () => {
        const e = scene();
        e.updateQuietScene(35);
        expect(e.keyLight.intensity).toBe(0);
        e.updateQuietScene(60);
        const at60 = e.keyLight.intensity;
        expect(at60).toBeGreaterThan(0);
        e.updateQuietScene(120);
        expect(e.keyLight.intensity).toBeGreaterThan(at60);
        e.updateQuietScene(60);
        expect(e.keyLight.intensity).toBe(at60);
        e.keyLight.intensity = 0.21;
        e.rimLight.intensity = 0.15;
        e.updateQuietScene(216);
        expect(e.keyLight.intensity).toBe(0.21);
        expect(e.rimLight.intensity).toBe(0.15);
    });

    it('removes the independent overlays without replacing fog density or a physical floor', () => {
        const e = scene();
        e.dust = new THREE.Points();
        e.aisleField = new THREE.Points();
        e.floorGlow = new THREE.Mesh();
        e.floorMist = new THREE.Mesh();
        e.shadowCatcher = new THREE.Mesh();
        e.livingChamber = { bokehGroup: new THREE.Group() };
        e.updateQuietScene(90);
        expect([e.dust, e.aisleField, e.floorGlow, e.floorMist, e.livingChamber.bokehGroup].every(o => !o.visible)).toBe(true);
        expect(e.shadowCatcher.visible).toBe(true);
        expect(e.scene.fog.density).toBe(0.002);
    });
});
