import {
    ReliquaryPrototypeExperience,
    resolveDefaultChamberVariant
} from '../../src/js/prototype/experience.js';

describe('album navigation experiment isolation', () => {
    afterEach(() => window.history.replaceState({}, '', '/'));

    it.each([
        ['sonoite', 'sonoite-cinema'],
        ['horas-mortas', 'horas-mortas-cinema'],
        ['nao-querer-nada', 'track5-cinema']
    ])('opens %s with its own authored film', (slug, variant) => {
        window.history.replaceState({}, '', '/?track=nao-querer-nada&variant=track5-cinema-fill&recut=1&film=0&proof=120&textured=1&vigil=1&sodium=0&futureExperiment=1#old-shot');
        const destination = ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl?.(slug);
        expect(destination).toBe(`http://localhost/?track=${slug}`);
        expect(resolveDefaultChamberVariant(new URL(destination).searchParams)).toBe(variant);
    });

    it('carries only explicit playback/display preferences, including zero values', () => {
        window.history.replaceState({}, '', '/?track=sonoite&quality=low&dpr=1&fps=24&motion=0&seed=42&autonext=0&artifact=untextured&commit=1');
        const destination = ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl?.('horas-mortas');
        expect(destination).toBe('http://localhost/?seed=42&quality=low&dpr=1&fps=24&motion=0&autonext=0&track=horas-mortas');
    });

    it('preserves a WordPress subdirectory and leaves the current experiment unchanged', () => {
        window.history.replaceState({}, '', '/album/?track=sonoite&variant=sonoite-cinema&vigil=1');
        const destination = ReliquaryPrototypeExperience.prototype.getTrackNavigationUrl?.('horas-mortas');
        expect(destination).toBe('http://localhost/album/?track=horas-mortas');
        expect(window.location.search).toBe('?track=sonoite&variant=sonoite-cinema&vigil=1');
    });
});

describe('unbuilt or unknown track slugs (F9)', () => {
    afterEach(() => {
        delete window.sonoiteData;
        window.history.replaceState({}, '', '/');
    });

    it.each(['does-not-exist', 'paralisia-do-sono'])('%s resolves Sonoite metadata and film together', async (slug) => {
        window.sonoiteData = { tracks: [
            { slug: 'sonoite', audio_url: '/sonoite.mp3' },
            { slug: 'paralisia-do-sono', audio_url: '/paralisia.mp3' }
        ] };
        const urlParams = new URLSearchParams(`track=${slug}`);
        const current = { urlParams, applyFilmTrackGuard: () => {} };
        await ReliquaryPrototypeExperience.prototype.resolveTrack.call(current);
        expect(current.track.audio_url).toBe('/sonoite.mp3');
        expect(resolveDefaultChamberVariant(urlParams)).toBe('sonoite-cinema');
    });

    it('keeps built slugs unchanged', () => {
        expect(resolveDefaultChamberVariant(new URLSearchParams('track=horas-mortas'))).toBe('horas-mortas-cinema');
        expect(resolveDefaultChamberVariant(new URLSearchParams('track=nao-querer-nada'))).toBe('track5-cinema');
    });
});
