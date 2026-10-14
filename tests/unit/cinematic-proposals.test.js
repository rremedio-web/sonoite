import fs from 'fs';
import { resolveCinematicProposal, createProposalCamera, sampleProposalLight } from '../../src/js/prototype/cinematic-proposals.js';
import { createTrack5TarPassageCamera } from '../../src/js/prototype/track5-tar-passage.js';
import { TRACK5_FILM_DIRECTOR_CAMERA } from '../../src/js/prototype/films/nao-querer-nada.js';
import { createShotDirector } from '../../src/js/prototype/shot-director.js';
import { sampleSodiumLightLevel } from '../../src/js/prototype/chamber-sodium.js';
import { SONOITE_CHAMBER_FILM_TIMELINE } from '../../src/js/prototype/films/sonoite.js';
import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';

const modes = ['intimate', 'chamber', 'afterimage', 'stage'];
const grid = JSON.parse(fs.readFileSync('public/assets/journeys/analysis/nao-querer-nada/beats.json', 'utf8'));
const makeDirector = (camera) => createShotDirector({ enabled: true, setups: camera.setups,
    cutTimeline: camera.cutTimeline, accentCuts: camera.accentCuts, beatGrid: grid,
    defaultTargetPoint: camera.target, heightYByClass: camera.director.heightYByClass });

describe('three full-film cinematic proposals', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('isolates explicit proposals from unrelated tracks, recuts, proofs and navigation', () => {
        for (const mode of modes) {
            const params = new URLSearchParams(`proposal=${mode}`);
            expect(resolveCinematicProposal(params, 'sonoite', 'sonoite-cinema')).toBe(mode);
            expect(resolveCinematicProposal(params, 'o-filho', 'sonoite-cinema')).toBeNull();
            expect(resolveCinematicProposal(params, 'sonoite', 'track5-cinema')).toBeNull();
            params.set('recut', '1');
            expect(resolveCinematicProposal(params, 'sonoite', 'sonoite-cinema')).toBeNull();
            const proofAlias = new URLSearchParams(`proposal=${mode}&duration=120`);
            expect(resolveCinematicProposal(proofAlias, 'sonoite', 'sonoite-cinema')).toBeNull();
            window.history.replaceState({}, '', `/?track=sonoite&proposal=${mode}&seed=7`);
            const e = new ReliquaryPrototypeExperience(document.createElement('div'));
            expect(e.usesPhysicalScene()).toBe(true);
            expect(e.getTrackNavigationUrl('horas-mortas')).not.toContain('proposal=');
            e.urlParams.set('room', 'cloth');
            expect(e.usesClothRoomStudy()).toBe(false);
            e.urlParams.set('room', 'readable');
            expect(e.usesRoomRevealStudy()).toBe(false);
            e.urlParams.set('scene', 'original');
            e.setupChamberPracticals();
            expect(e.chamberPracticals).toBeNull();
        }
    });

    it.each(modes)('%s preserves the accepted frontier and musical cue visibility on repeat seeks', (mode) => {
        const camera = createTrack5TarPassageCamera(TRACK5_FILM_DIRECTOR_CAMERA);
        const original = JSON.stringify(camera);
        const proposal = createProposalCamera(camera, 'nao-querer-nada', mode);
        const a = makeDirector(camera), b = makeDirector(proposal);
        for (const time of [391.44, 410, 432.9, 410]) {
            expect(b.resolve(time).pose).toEqual(a.resolve(time).pose);
        }
        expect(b.resolve(245.65).setupId).toBe('proposal_surface');
        expect(b.resolve(252.36).setupId).toBe('proposal_surface');
        expect(b.resolve(253.61).setupId).toBe('proposal_surface');
        expect(b.resolve(550).setupId).toBe(mode === 'afterimage' || mode === 'stage' ? 'proposal_return' : 'proposal_trace');
        expect(JSON.stringify(camera)).toBe(original);
    });

    it('restores floor residue on backward seeks while light withdraws independently', () => {
        const sequence = [337, 410, 510, 560, 90, 410];
        const states = sequence.map(t => sampleProposalLight('stage', 'nao-querer-nada', t));
        expect(states[0].residue).toBe(0);
        expect(states[2].residue).toBe(1);
        expect(states[3].residue).toBe(1);
        expect(states[4].residue).toBe(0);
        expect(states[1]).toEqual(states[5]);
        expect(states[3].softbox).toBeGreaterThan(0);
        expect(sampleProposalLight('stage', 'nao-querer-nada', 564).softbox).toBe(0);
        expect(sampleProposalLight('stage', 'nao-querer-nada', 510, false).residue).toBe(0);
    });

    it('holds only the requested Track 1 study camera, without mutating other treatments', () => {
        const camera = { score: [0, 125, 253, 384, 488.5].map(atSeconds => ({ atSeconds })) };
        expect(createProposalCamera(camera, 'sonoite', 'stage', true).score).toHaveLength(1);
        expect(createProposalCamera(camera, 'sonoite', 'stage').score.length).toBeGreaterThan(1);
        expect(createProposalCamera(camera, 'sonoite', 'afterimage', true).score.length).toBeGreaterThan(1);
        expect(sampleProposalLight('stage', 'sonoite', 525).wall).toBeGreaterThan(100);
        expect(sampleProposalLight('stage', 'sonoite', 535).wall).toBe(0);
    });

    it('keeps distinct Stage compositions at authored cuts when camera hold is off', () => {
        const source = SONOITE_CHAMBER_FILM_TIMELINE.camera;
        const before = JSON.stringify(source);
        const score = createProposalCamera(source, 'sonoite', 'stage').score;
        const framing = cue => [cue.position, cue.target, cue.fov];
        // These cues previously collapsed into one 58.4-second frame and an
        // unchanged final 79.5 seconds, despite the hold checkbox being off.
        for (const time of [336, 359.9, 367, 392.2, 425.2, 488.5, 528]) {
            const index = score.findIndex(cue => cue.atSeconds === time);
            expect(framing(score[index])).not.toEqual(framing(score[index - 1]));
        }
        const openingViews = new Set(score.filter(cue => cue.atSeconds < 125)
            .map(cue => JSON.stringify(framing(cue))));
        expect(openingViews.size).toBeGreaterThanOrEqual(3);
        expect(score.find(cue => cue.atSeconds === 62.83).transitionSeconds).toBe(10);
        expect(score.find(cue => cue.atSeconds === 528).transitionSeconds).toBe(24.4);
        expect(JSON.stringify(source)).toBe(before);
    });

    it('keeps Track 4 light tied to the lamp, and all ending envelopes finite and reversible', () => {
        for (const mode of modes) {
            for (const t of [0, 24, 120, 245, 280, 350, 390, 120]) {
                const state = sampleProposalLight(mode, 'horas-mortas', t);
                expect(state.fog).toBe(0);
                expect(state.key === 0).toBe(sampleSodiumLightLevel(t) === 0);
            }
            expect(sampleProposalLight(mode, 'sonoite', 535).key).toBe(0);
            expect(sampleProposalLight(mode, 'nao-querer-nada', 550).key).toBeGreaterThan(0);
            expect(sampleProposalLight(mode, 'nao-querer-nada', 564).key).toBe(0);
            expect(sampleProposalLight(mode, 'sonoite', 80, false).key).toBe(0);
        }
    });

});
