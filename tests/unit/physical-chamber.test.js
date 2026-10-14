import * as THREE from 'three';
import fs from 'fs';
import { createTrack5TarPassageCamera } from '../../src/js/prototype/track5-tar-passage.js';
import { TRACK5_FILM_DIRECTOR_CAMERA } from '../../src/js/prototype/films/nao-querer-nada.js';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';
import { createPhysicalChamber } from '../../src/js/prototype/physical-chamber.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

function experience(query) {
    window.history.replaceState({}, '', `/?${query}`);
    return new ReliquaryPrototypeExperience(document.createElement('div'));
}

describe('physical Track 5 environment trial', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('requires an explicit canonical Track 5 trial and drops it on navigation', () => {
        const e = experience('track=nao-querer-nada&scene=physical&seed=7');
        expect(e.usesPhysicalScene()).toBe(true);
        expect(e.getTrackNavigationUrl('sonoite')).not.toContain('scene=');
        for (const query of [
            'track=nao-querer-nada', 'track=sonoite&scene=physical',
            'track=horas-mortas&scene=physical',
            'track=sonoite&variant=track5-cinema&scene=physical',
            'track=nao-querer-nada&variant=track5-cinema-fill&scene=physical'
        ]) {
            expect(experience(query).usesPhysicalScene()).toBe(false);
        }
    });

    it('constructs only the physical surface and does not revive overlays during an update', () => {
        const e = experience('track=nao-querer-nada&scene=physical');
        e.scene = new THREE.Scene();
        e.setupChamberSurfaces();
        e.createAtmosphere();
        e.updateAtmosphere(213, 213, {}, {}, {});
        expect(e.scene.children).toEqual([e.physicalChamber, e.physicalWallWash, e.physicalWallWash.target]);
        expect(e.physicalWallWash.intensity).toBe(0);
        e.state.started = true;
        for (const [time, expected] of [[213, 300], [548, 0], [213, 300], [20, 0]]) {
            e.updateAtmosphere(time, time, {}, {}, {});
            expect(e.physicalWallWash.intensity).toBe(expected);
        }
        expect(e.physicalChamber.receiveShadow).toBe(true);
        const living = e.resolveLivingConfig({ bokeh: { count: 12 }, gobo: { enabled: true } });
        expect(living.bokeh.count).toBe(0);
        expect(living.gobo.enabled).toBe(false);
        e.physicalChamber.geometry.dispose();
        e.physicalChamber.material.dispose();
        e.physicalWallWash.dispose();
    });

    it('restores the shared fog response without recreating decorative layers', () => {
        const a = experience('track=nao-querer-nada');
        const b = experience('track=nao-querer-nada&scene=physical');
        for (const e of [a, b]) {
            e.scene = new THREE.Scene();
            e.scene.fog = new THREE.FogExp2('#080a12', 0.022);
            e.chamberConfig = { fogDensity: 0.022 };
            e.breathChannels.shell = 0.2;
            e.godRayIntensity = 0.1;
        }
        b.setupChamberSurfaces();
        const room = { phaseProfile: { fogDelta: -0.004 }, roomPressure: 0.3,
            reactivityReveal: 0.5, listeningAccent: 0.1, chamberLaw: { airDensity: 0.2 } };
        const values = [];
        for (const air of [0.1, 0.8, 0.1]) {
            a.updateChamberFog(350, { air }, room);
            b.updateAtmosphere(350, 350, { air }, {}, room);
            expect(b.scene.fog.density).toBe(a.scene.fog.density);
            values.push(b.scene.fog.density);
        }
        expect(values[1]).toBeGreaterThan(values[0]);
        expect(values[2]).toBe(values[0]);
        expect(b.scene.children).toHaveLength(3);
        b.physicalChamber.geometry.dispose();
        b.physicalChamber.material.dispose();
        b.physicalWallWash.dispose();
    });

    it('keeps the accepted shot in the physical trial with an explicit hold comparison', () => {
        expect(experience('track=nao-querer-nada&scene=physical').usesTarPassageCut()).toBe(true);
        expect(experience('track=nao-querer-nada&scene=physical&passage=tar-cut').usesTarPassageCut()).toBe(true);
        expect(experience('track=nao-querer-nada&scene=physical&passage=hold').usesTarPassageCut()).toBe(false);
        for (const query of ['track=nao-querer-nada&passage=tar-cut',
            'track=sonoite&scene=physical&passage=tar-cut',
            'track=horas-mortas&scene=physical&passage=tar-cut']) {
            expect(experience(query).usesTarPassageCut()).toBe(false);
        }
        const recut = experience('track=nao-querer-nada&scene=physical&passage=tar-cut&recut=1');
        recut.recutEnabled = true; // Resolved during init, before director bootstrap.
        expect(recut.usesTarPassageCut()).toBe(false);
        expect(experience('track=nao-querer-nada&scene=physical&passage=tar-cut')
            .getTrackNavigationUrl('sonoite')).not.toContain('passage=');
    });

    it('changes only bar 149 through 164 and restores the same pose after a backward seek', () => {
        const original = JSON.stringify(TRACK5_FILM_DIRECTOR_CAMERA);
        const beatGrid = JSON.parse(fs.readFileSync('public/assets/journeys/analysis/nao-querer-nada/beats.json', 'utf8'));
        const make = camera => createShotDirector({ ...camera, beatGrid, enabled: true,
            defaultTargetPoint: camera.target });
        const a = make(TRACK5_FILM_DIRECTOR_CAMERA);
        const b = make(createTrack5TarPassageCamera(TRACK5_FILM_DIRECTOR_CAMERA));
        expect(b.validate().errors).toEqual([]);
        const start = beatGrid.beats.find(beat => beat.bar === 149 && beat.beatInBar === 1).time;
        const end = beatGrid.beats.find(beat => beat.bar === 165 && beat.beatInBar === 1).time;
        for (const time of [0, 74, 350, start - 0.001, end, 478, 548]) {
            expect(b.resolve(time)).toEqual(a.resolve(time));
        }
        for (const time of [start, 410, end - 0.001]) {
            const shot = b.resolve(time);
            expect(shot.setupId).toBe('mcu_tar_frontier');
            expect(shot.setup.lightRig).toBe('wet_specular');
            expect(shot.pose.position[2]).toBeGreaterThan(-9);
        }
        const saved = JSON.parse(JSON.stringify(b.resolve(410)));
        b.resolve(548);
        expect(b.resolve(410)).toEqual(saved);
        expect(JSON.stringify(TRACK5_FILM_DIRECTOR_CAMERA)).toBe(original);
    });

    it('has a continuous indexed floor and return with inward-facing finite normals', () => {
        const mesh = createPhysicalChamber();
        const position = mesh.geometry.attributes.position;
        const normal = mesh.geometry.attributes.normal;
        const edges = new Map();
        const indices = mesh.geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
            for (const [a, b] of [[indices[i], indices[i + 1]], [indices[i + 1], indices[i + 2]], [indices[i + 2], indices[i]]]) {
                const key = [Math.min(a, b), Math.max(a, b)].join(',');
                edges.set(key, (edges.get(key) || 0) + 1);
            }
        }
        for (const [edge, count] of edges) {
            expect(count).toBeLessThanOrEqual(2);
            if (count === 1) {
                // Open edges belong only to the outer extent, never the floor/wall join.
                const [a, b] = edge.split(',').map(Number);
                expect(Math.abs(position.getX(a)) === 50 && Math.abs(position.getX(b)) === 50
                    || position.getZ(a) === 55 && position.getZ(b) === 55
                    || position.getY(a) === 30 && position.getY(b) === 30).toBe(true);
            }
        }
        for (const value of normal.array) expect(Number.isFinite(value)).toBe(true);
        expect(normal.getY(40)).toBeGreaterThan(0.99);
        expect(normal.getZ(position.count - 41)).toBeGreaterThan(0.9);
        mesh.geometry.dispose();
        mesh.material.dispose();
    });
});
