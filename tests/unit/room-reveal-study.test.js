import fs from 'fs';
import * as THREE from 'three';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';
import { TRACK5_FILM_DIRECTOR_CAMERA as camera } from '../../src/js/prototype/films/nao-querer-nada.js';

function experience(query) {
    window.history.replaceState({}, '', `/?${query}`);
    return new ReliquaryPrototypeExperience(document.createElement('div'));
}

describe('room reveal comparison', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('requires an explicit physical Track 5 study and drops it during navigation', () => {
        const e = experience('track=nao-querer-nada&scene=physical&room=readable');
        expect(e.usesRoomRevealStudy()).toBe(true);
        expect(e.usesTarPassageCut()).toBe(true);
        expect(e.getTrackNavigationUrl('sonoite')).not.toContain('room=');
        e.recutEnabled = true;
        expect(e.usesRoomRevealStudy()).toBe(false);
        for (const query of ['track=nao-querer-nada&scene=physical',
            'track=nao-querer-nada&room=readable', 'track=sonoite&scene=physical&room=readable',
            'track=horas-mortas&scene=physical&room=readable']) {
            expect(experience(query).usesRoomRevealStudy()).toBe(false);
        }
    });

    it('opens inside the existing shot and restores surfaces and lights across cuts and seeks', () => {
        const e = experience('track=nao-querer-nada&scene=physical&room=readable');
        e.scene = new THREE.Scene();
        e.scene.fog = new THREE.FogExp2('#080a12', 0.022);
        e.chamberConfig = { fogDensity: 0.022 };
        e.state.started = true;
        e.setupChamberSurfaces();
        e.keyLight = new THREE.SpotLight();
        e.rimLight = new THREE.DirectionalLight();
        e.backLight = new THREE.DirectionalLight();
        e.lightRigState = { key: { position: [4, 6, 5] } };
        const grid = JSON.parse(fs.readFileSync('public/assets/journeys/analysis/nao-querer-nada/beats.json', 'utf8'));
        const director = createShotDirector({ ...camera, enabled: true, beatGrid: grid, defaultTargetPoint: camera.target });
        const start = grid.beats.find(beat => beat.bar === 94 && beat.beatInBar === 1).time;
        const end = grid.beats.find(beat => beat.bar === 107 && beat.beatInBar === 1).time;
        const room = { roomPressure: 0.3, reactivityReveal: 0.5, listeningAccent: 0.1 };
        const frame = time => {
            e.shotDirectorResolved = director.resolve(time);
            const pose = JSON.stringify(e.shotDirectorResolved.pose);
            e.updateAtmosphere(time, time, { air: 0.4 }, {}, room);
            // Lighting's ordinary per-frame write precedes the study.
            e.keyLight.position.set(4, 6, 5);
            e.keyLight.target.position.fromArray(e.shotDirectorResolved.pose.target);
            e.keyLight.intensity = 3;
            e.keyLight.angle = 0.17;
            e.keyLight.penumbra = 0.1;
            e.keyLight.color.set('#e6dfd8');
            e.rimLight.intensity = 2;
            e.backLight.intensity = 1;
            e.updateRoomRevealStudy(time);
            expect(JSON.stringify(e.shotDirectorResolved.pose)).toBe(pose);
            return { position: e.keyLight.position.toArray(), target: e.keyLight.target.position.toArray(),
                key: e.keyLight.intensity, fog: e.scene.fog.density,
                floor: e.physicalChamber.material.userData.floorAlbedo.value,
                wallAngle: e.physicalWallWash.angle, wallTarget: e.physicalWallWash.target.position.toArray() };
        };
        const base = frame(start);
        expect(base.key).toBe(3);
        expect(base.floor).toBe(0.16);
        const middle = frame(start + 4);
        const opened = frame(start + 8);
        expect(middle.key).toBeGreaterThan(base.key);
        expect(middle.key).toBeLessThan(opened.key);
        expect(opened.fog).toBeLessThan(base.fog);
        expect(opened.floor).toBeGreaterThan(base.floor);
        expect(frame(end).key).toBe(base.key);
        expect(frame(end).floor).toBe(base.floor);
        expect(frame(end).wallTarget).toEqual(base.wallTarget);
        expect(frame(start + 4)).toEqual(middle);
        expect(frame(start)).toEqual(base);
        expect(frame(410).key).toBe(3);
        expect(e.scene.children).toHaveLength(3);
        e.physicalChamber.geometry.dispose();
        e.physicalChamber.material.dispose();
        e.physicalWallWash.dispose();
        e.keyLight.dispose();
    });
});
