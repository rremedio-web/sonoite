import { ReliquaryPrototypeExperience } from '../../src/js/prototype/experience.js';
import * as THREE from 'three';

function experience(slug = 'nao-querer-nada') {
    window.history.replaceState({}, '', `/?track=${slug}`);
    const instance = new ReliquaryPrototypeExperience(document.createElement('div'));
    instance.track = { slug };
    instance.heroConfig = instance.getHeroConfig();
    instance.chamberConfig = instance.buildChamberConfig();
    instance.state.started = true;
    instance.state.playing = true;
    instance.audio = { audioContext: { sampleRate: 48000 }, analyser: { fftSize: 1024 } };
    return instance;
}

function sample(instance, time, level, { render = true } = {}) {
    // Bass remains above the old 0.19 threshold, including between transients.
    instance.audioState.bassLevel = 0.9;
    const frequency = new Uint8Array(512);
    frequency.fill(Math.round(level * 255), 1, 22);
    instance.receiveAudioAnalysis?.({
        frequency, timestamp: time * 1000, bassLevel: 0.9,
        midLevel: level, trebleLevel: 0, averageLevel: level / 4
    });
    if (render) {
        instance.updateAnalysisState(1 / 24, time, { phase: 'WANTING' });
    }
    return instance.analysisState.accentRise;
}

describe('audio accents through the real experience pipeline', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));
    it.each(['three', 'two', 'none'])('holds camera and rig selection across cuts in the %s arm only', (arm) => {
        const current = experience();
        current.urlParams.set('reaction', `surface-${arm}`);
        current.camera = new THREE.PerspectiveCamera();
        current.shotDirector = {
            resolve: jest.fn((time, out) => Object.assign(out, {
                pose: { position: [time, 2, 12], target: [1, 2, 0], fov: 40 },
                setup: { framing: 'MCU', localMotion: 1 }
            }))
        };
        current.livingChamber = { outputs: { camOffset: { x: 1, y: 1, z: 1 } } };
        for (const time of [225, 236.2, 240, 246.8, 252.36, 254.9, 225]) {
            current.applyShotDirectorCamera(time);
            expect(current.camera.position.toArray()).toEqual([240, 2, 12]);
            current.resolveShotDirectorForLighting(time);
            expect(current.shotDirector.resolve).toHaveBeenLastCalledWith(240, current.shotDirectorResolved, { reducedMotion: true });
        }
        expect(current.isSurfaceShotLocked(224)).toBe(false);
        expect(current.isSurfaceShotLocked(255)).toBe(false);
        current.urlParams.set('reaction', 'surface');
        expect(current.getSurfaceStudyShotTime(246.8)).toBe(246.8);
        current.urlParams.set('reaction', `surface-${arm}`);
        current.track.slug = 'sonoite';
        expect(current.isSurfaceShotLocked(240)).toBe(false);
    });

    it.each([['surface-two', 236.65, 0], ['surface-two', 252.36, 1], ['surface-three', 253.4, 1], ['surface-none', 245.65, 0]])('routes %s cues through the actual analysis pipeline at %s', (reaction, time, expected) => {
        const current = experience();
        current.urlParams.set('reaction', reaction);
        expect(current.updateAnalysisState(0.1, time, { phase: 'WANTING' }).surfaceResponse).toBe(expected);
    });
    it('changes the actual hero surface while preserving the existing dynamic channels', () => {
        const normal = experience();
        const study = experience();
        study.urlParams.set('reaction', 'surface');
        for (const current of [normal, study]) {
            current.hero = new THREE.Group();
            current.heroBasePosition = new THREE.Vector3();
            current.heroMaterialStates = [{ material: new THREE.MeshStandardMaterial({ roughness: 0.76 }), baseRoughness: 0.76, baseOpacity: 1 }];
            current.pendingAudioAccent = true;
            current.updateAnalysisState(1 / 30, 225, { phase: 'WANTING' });
        }
        const base = normal.updateAnalysisState(0.3, 236.65, { phase: 'WANTING' });
        const variant = study.updateAnalysisState(0.3, 236.65, { phase: 'WANTING' });
        expect(variant.surfaceResponse).toBeGreaterThan(0.9);
        expect({ ...variant, surfaceResponse: 0 }).toEqual(base);
        const room = { reactivityReveal: 1, roomPressure: 0, materialEffects: { roughnessDelta: 0 } };
        normal.updateHero(225.3, 0.3, 225.3, {}, base, room);
        study.updateHero(225.3, 0.3, 225.3, {}, variant, room);
        const roughnessChange = normal.heroMaterialStates[0].material.roughness - study.heroMaterialStates[0].material.roughness;
        expect(roughnessChange).toBeGreaterThan(0.34);
        expect(roughnessChange).toBeLessThanOrEqual(0.37);
        expect(study.heroMaterialStates[0].material.color).toEqual(normal.heroMaterialStates[0].material.color);
        expect(study.heroMaterialStates[0].material.emissive).toEqual(normal.heroMaterialStates[0].material.emissive);
        expect(study.hero.position).toEqual(normal.hero.position);
        expect(study.hero.rotation.toArray()).toEqual(normal.hero.rotation.toArray());
        study.resetAudioAccents();
        expect(study.analysisState.surfaceResponse).toBe(0);
        for (const mode of ['paused', 'hidden', 'reduced']) {
            study.state.playing = mode !== 'paused';
            study.isVisible = mode !== 'hidden';
            study.reducedMotion = mode === 'reduced';
            expect(study.updateAnalysisState(0.1, 236.65, { phase: 'WANTING' }).surfaceResponse).toBe(0);
        }
    });

    it('isolates the surface study from other tracks, variants and amplified previews', () => {
        const current = experience();
        current.urlParams.set('reaction', 'surface');
        current.urlParams.set('reactivity', '5');
        expect(current.isSurfaceReactionStudy?.()).toBe(true);
        expect(current.getAudioReactionPreviewGain()).toBe(1);
        expect(current.getTrackNavigationUrl('sonoite')).not.toContain('reaction');
        current.texturedParam = '1';
        expect(current.isSurfaceReactionStudy()).toBe(false);
        current.texturedParam = null;
        current.recutEnabled = true;
        expect(current.isSurfaceReactionStudy()).toBe(false);
        current.recutEnabled = false;
        current.chamberVariantKey = 'track5-cinema-fill';
        expect(current.isSurfaceReactionStudy?.()).toBe(false);
        for (const slug of ['sonoite', 'horas-mortas']) {
            const other = experience(slug);
            other.urlParams.set('reaction', 'surface');
            expect(other.isSurfaceReactionStudy?.()).toBe(false);
        }
    });

    it.each([
        ['nao-querer-nada', '2', false, 2],
        ['nao-querer-nada', '5', false, 5],
        ['nao-querer-nada', '5', true, 1],
        ['sonoite', '5', false, 1],
        ['horas-mortas', '5', false, 1],
        ['nao-querer-nada', '200', false, 1],
        ['nao-querer-nada', '2', true, 1],
        ['sonoite', '2', false, 1],
        ['horas-mortas', '2', false, 1]
    ])('keeps reactivity previews bounded and opt-in: %s / %s / reduced=%s', (slug, value, reduced, gain) => {
        const normal = experience(slug);
        const preview = experience(slug);
        preview.urlParams.set('reactivity', value);
        normal.reducedMotion = reduced;
        preview.reducedMotion = reduced;
        for (let i = 0; i < 48; i += 1) {
            sample(normal, i / 24, 0.83);
            sample(preview, i / 24, 0.83);
        }
        sample(normal, 2, 0.98, { render: false });
        sample(preview, 2, 0.98, { render: false });
        const base = normal.updateAnalysisState(1 / 24, 120, { phase: 'WANTING' });
        const amplified = preview.updateAnalysisState(1 / 24, 120, { phase: 'WANTING' });
        expect(amplified.accent).toBeCloseTo(base.accent * gain, 8);
        expect(amplified.audioBreathing).toBeCloseTo(base.audioBreathing * gain, 8);
        expect(amplified.midSustain).toBeCloseTo(base.midSustain * gain, 8);
        expect(amplified.audioAverage ?? preview.analysisState.smoothedAverage)
            .toBeCloseTo(normal.analysisState.smoothedAverage * gain, 8);
        expect(amplified.autonomousBreathing).toBe(base.autonomousBreathing);
        expect(amplified.supportDrive).toBe(base.supportDrive);
        expect(preview.analysisState.accentRise).toBe(normal.analysisState.accentRise);
        expect(preview.getTrackNavigationUrl('sonoite')).not.toContain('reactivity');
    });

    it.each(['sonoite', 'horas-mortas', 'nao-querer-nada'])('boosts only track 5 accents, not the idle response of %s', (slug) => {
        const current = experience(slug);
        const baseline = experience(slug);
        baseline.chamberConfig.stage3.accentIntensity = 0.483;
        for (let i = 0; i < 48; i += 1) {
            sample(current, i / 24, 0.83);
            sample(baseline, i / 24, 0.83);
        }
        expect(current.analysisState.accentPulse).toBe(0);
        sample(current, 2, 0.98);
        sample(baseline, 2, 0.98);
        const ratio = current.analysisState.accentPulse / baseline.analysisState.accentPulse;
        if (slug === 'nao-querer-nada') {
            expect(ratio).toBeGreaterThan(1.2);
            expect(ratio).toBeLessThan(1.3);
        } else {
            expect(ratio).toBeCloseTo(1, 8);
        }
    });

    it('detects repeated spectral rises over an already loud bass bed', () => {
        const instance = experience();
        const hits = [];
        for (let i = 0; i < 144; i += 1) {
            const level = i === 60 || i === 96 || i === 132 ? 0.98 : 0.83;
            if (sample(instance, i / 24, level) && i > 24) hits.push(i);
        }
        expect(hits).toEqual([60, 96, 132]);
        expect(instance.analysisState.accentPulse).toBeGreaterThan(0);
    });

    it('does not trigger on startup, steady energy, silence, or near-silent noise', () => {
        for (const level of [0, 0.003, 0.9]) {
            const instance = experience();
            const hits = [];
            for (let i = 0; i < 120; i += 1) {
                if (sample(instance, i / 24, level)) hits.push(i);
            }
            expect(hits).toEqual([]);
        }
    });

    it('does not retrigger on every peak of rapid oscillation', () => {
        const instance = experience();
        for (let i = 0; i < 48; i += 1) sample(instance, i / 24, 0.83);
        const hits = [];
        for (let i = 48; i < 96; i += 1) {
            if (sample(instance, i / 24, i % 2 ? 0.98 : 0.83)) hits.push(i / 24);
        }
        expect(hits.length).toBeGreaterThan(0);
        expect(hits.length).toBeLessThanOrEqual(4);
        for (let i = 1; i < hits.length; i += 1) {
            expect(hits[i] - hits[i - 1]).toBeGreaterThanOrEqual(0.7);
        }
    });

    it('latches an audio hit until a render consumes it, then consumes it once', () => {
        const instance = experience();
        for (let i = 0; i < 48; i += 1) sample(instance, i / 24, 0.83);
        sample(instance, 2, 0.98, { render: false });
        sample(instance, 2.05, 0.83, { render: false });
        instance.updateAnalysisState(1 / 24, 2.05, { phase: 'WANTING' });
        expect(instance.analysisState.accentRise).toBe(true);
        instance.updateAnalysisState(1 / 24, 2.08, { phase: 'WANTING' });
        expect(instance.analysisState.accentRise).toBe(false);
    });

    it('does not emit accents while paused or under reduced motion', () => {
        for (const mode of ['paused', 'reduced']) {
            const instance = experience();
            for (let i = 0; i < 48; i += 1) sample(instance, i / 24, 0.83);
            instance.state.playing = mode !== 'paused';
            instance.reducedMotion = mode === 'reduced';
            expect(sample(instance, 2, 0.98)).toBe(false);
            expect(instance.analysisState.accentPulse).toBe(0);
        }
    });

    it('re-primes after a gap or reset without treating the new level as an onset', () => {
        const instance = experience();
        for (let i = 0; i < 48; i += 1) sample(instance, i / 24, 0.83);
        expect(sample(instance, 20, 0.98)).toBe(false);
        instance.resetAudioAccents?.();
        expect(sample(instance, 20.05, 0.9)).toBe(false);
        expect(instance.analysisState.accentPulse).toBe(0);
    });

    it('clears a queued hit when seeking and does not fire at the new position', async () => {
        const instance = experience();
        instance.audioLoaded = true;
        instance.audio.seekTo = async () => true;
        instance.shell = { updateTime: () => {} };
        for (let i = 0; i < 48; i += 1) sample(instance, i / 24, 0.83);
        sample(instance, 2, 0.98, { render: false });
        expect(instance.pendingAudioAccent).toBe(true);
        await instance.seek(0.5);
        expect(instance.pendingAudioAccent).toBe(false);
        expect(instance.analysisState.accentPulse).toBe(0);
        expect(sample(instance, 2.05, 0.98)).toBe(false);
    });

    it('does not lose ownership of a reused Web Audio sample buffer', () => {
        const instance = experience();
        const frequency = new Uint8Array(512);
        const analysis = { frequency, timestamp: 0, bassLevel: 0.9, midLevel: 0.83, trebleLevel: 0, averageLevel: 0.2 };
        for (let i = 0; i < 48; i += 1) {
            frequency.fill(212, 1, 22);
            analysis.timestamp = i * 1000 / 24;
            instance.receiveAudioAnalysis(analysis);
        }
        frequency.fill(250, 1, 22);
        analysis.timestamp = 2000;
        instance.receiveAudioAnalysis(analysis);
        instance.updateAnalysisState(1 / 24, 2, { phase: 'WANTING' });
        expect(instance.analysisState.accentRise).toBe(true);
    });
});
