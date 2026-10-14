import * as THREE from 'three';
import { createPhysicalDrape, createShadowDrape, sampleShadowDrapeSettle } from '../../src/js/prototype/physical-drape.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

function experience(query) {
    window.history.replaceState({}, '', `/?${query}`);
    return new ReliquaryPrototypeExperience(document.createElement('div'));
}

describe('static cloth study', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('keeps a finite, opaque folded surface behind the relic with a grounded hem', () => {
        const cloth = createPhysicalDrape();
        const positions = cloth.geometry.attributes.position;
        cloth.geometry.computeBoundingBox();
        expect(cloth.geometry.boundingBox.max.z).toBeLessThan(-2);
        expect(cloth.geometry.boundingBox.min.y).toBeCloseTo(0.025);
        expect([...positions.array].every(Number.isFinite)).toBe(true);
        const normals = cloth.geometry.attributes.normal;
        for (let i = 0; i < normals.count; i += 1) {
            expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 4);
        }
        expect(normals.getY(0)).toBeGreaterThan(0.9);
        expect(cloth.material.transparent).toBe(false);
        expect(cloth.castShadow && cloth.receiveShadow).toBe(true);
        expect(cloth.children).toHaveLength(0);
        cloth.geometry.dispose();
        cloth.material.dispose();
    });

    it('isolates the cloth from defaults, other tracks, recut and navigation', () => {
        const e = experience('track=nao-querer-nada&scene=physical&room=cloth');
        expect(e.usesClothRoomStudy()).toBe(true);
        expect(e.usesTarPassageCut()).toBe(true);
        expect(e.getTrackNavigationUrl('sonoite')).not.toContain('room=');
        e.recutEnabled = true;
        expect(e.usesClothRoomStudy()).toBe(false);
        for (const query of ['track=nao-querer-nada&scene=physical',
            'track=nao-querer-nada&room=cloth', 'track=sonoite&scene=physical&room=cloth',
            'track=horas-mortas&scene=physical&room=cloth']) {
            expect(experience(query).usesClothRoomStudy()).toBe(false);
        }
    });

    it('restores visibility and lighting across forward and backward shot changes', () => {
        const e = experience('track=nao-querer-nada&scene=physical&room=cloth');
        e.scene = new THREE.Scene();
        e.scene.fog = new THREE.FogExp2('#080a12', 0.022);
        e.chamberConfig = { fogDensity: 0.022 };
        e.state.started = true;
        e.setupChamberSurfaces();
        e.keyLight = new THREE.SpotLight();
        e.rimLight = new THREE.DirectionalLight();
        e.backLight = new THREE.DirectionalLight();
        e.lightRigState = { key: { position: [4, 6, 5] } };
        const geometryBefore = e.physicalDrape.geometry.attributes.position.array.slice();
        const frame = (time, setupId) => {
            e.shotDirectorResolved = { setupId, cutTimeSeconds: 246, pose: { target: [1, 2, 0] } };
            e.updateAtmosphere(time, time, { air: 0.4 }, {}, { roomPressure: 0.3, reactivityReveal: 0.5 });
            e.keyLight.intensity = 3;
            e.updateRoomRevealStudy(time);
            return { visible: e.physicalDrape.visible, key: e.keyLight.intensity,
                wall: e.physicalWallWash.intensity, fog: e.scene.fog.density };
        };
        const wide = frame(260, 'ws_room_reveal');
        expect(wide.visible).toBe(true);
        expect(wide.wall).toBe(0);
        expect(frame(410, 'mcu_tar_frontier').visible).toBe(false);
        expect(frame(260, 'ws_room_reveal')).toEqual(wide);
        expect(frame(245, 'mcu_frontal')).toMatchObject({ visible: false, key: 3 });
        expect(e.physicalDrape.geometry.attributes.position.array).toEqual(geometryBefore);
        expect(e.physicalDrape.parent).toBe(e.physicalChamber);
        e.physicalDrape.geometry.dispose();
        e.physicalDrape.material.dispose();
        e.physicalChamber.geometry.dispose();
        e.physicalChamber.material.dispose();
        e.physicalWallWash.dispose();
        e.keyLight.dispose();
    });
});

describe('Track 1 draped shadow receiver', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('keeps both morph poses grounded, finite and behind the sculpture', () => {
        const cloth = createShadowDrape();
        for (const shape of [cloth.geometry.attributes.position, cloth.geometry.morphAttributes.position[0]]) {
            expect([...shape.array].every(Number.isFinite)).toBe(true);
            const heights = [], depths = [];
            for (let i = 0; i < shape.count; i += 1) {
                heights.push(shape.getY(i)); depths.push(shape.getZ(i));
            }
            expect(Math.min(...heights)).toBeGreaterThanOrEqual(0);
            expect(Math.max(...depths)).toBeLessThan(-2);
        }
        const opening = cloth.geometry.attributes.position;
        const settled = cloth.geometry.morphAttributes.position[0];
        // The floor-contact vertices stay fixed while the suspended fold sags.
        for (let i = 0; i < opening.count; i += 1) {
            if (opening.getY(i) > 0.03) {
                continue;
            }
            expect(settled.getY(i)).toBe(opening.getY(i));
            expect(settled.getZ(i)).toBe(opening.getZ(i));
        }
        expect(cloth.morphTargetInfluences).toEqual([0]);
        expect(cloth.geometry.morphAttributes.normal[0].count).toBe(opening.count);
        cloth.geometry.dispose(); cloth.material.dispose();
    });

    it('settles once, restores on seeks, and holds for reduced motion', () => {
        expect(sampleShadowDrapeSettle(310)).toBe(0);
        const mid = sampleShadowDrapeSettle(340);
        expect(mid).toBeGreaterThan(0);
        expect(mid).toBeLessThan(1);
        expect(sampleShadowDrapeSettle(380)).toBe(1);
        expect(sampleShadowDrapeSettle(525)).toBe(1);
        expect(sampleShadowDrapeSettle(340)).toBe(mid);
        expect(sampleShadowDrapeSettle(380, true)).toBe(0);
    });

    it('isolates the new receiver from the older cloth study and other films', () => {
        const active = experience('track=sonoite&proposal=stage');
        expect(active.usesShadowDrape()).toBe(true);
        expect(active.getTrackNavigationUrl('horas-mortas')).not.toContain('drape=');
        for (const query of ['track=sonoite&proposal=stage&drape=0',
            'track=sonoite&proposal=afterimage', 'track=sonoite',
            'track=horas-mortas&proposal=stage', 'track=nao-querer-nada&proposal=stage',
            'track=sonoite&proposal=stage&proof=120']) {
            expect(experience(query).usesShadowDrape()).toBe(false);
        }
    });
});
