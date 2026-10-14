/* eslint-disable security/detect-object-injection -- test stub maps fixed param keys only */
import {
    readLehrParam,
    readListenParam,
    readTexturedParam,
    resolveFilmFlags,
    resolveLehrEnabled,
    resolveListenEnabled,
    resolveTexturedEnabled
} from '../../src/js/prototype/film-flags.js';

function stubParams(map) {
    return {
        get: (name) => (Object.prototype.hasOwnProperty.call(map, name) ? map[name] : null)
    };
}

const CANONICAL_CONTEXT = {
    trackSlug: 'nao-querer-nada',
    variantKey: 'track5-cinema'
};

describe('resolveFilmFlags', () => {
    it('returns all off when every param is absent', () => {
        expect(resolveFilmFlags(stubParams({}))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('turns on all four features when film=1 alone', () => {
        expect(resolveFilmFlags(stubParams({ film: '1' }))).toEqual({
            filmParam: '1',
            shotsMode: '1',
            lightArc: true,
            godRay: true,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('prefers explicit shots=debug over film=1 aggregate shots mode', () => {
        expect(resolveFilmFlags(stubParams({ film: '1', shots: 'debug' }))).toEqual({
            filmParam: '1',
            shotsMode: 'debug',
            lightArc: true,
            godRay: true,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('matches legacy semantics for individual flags alone', () => {
        expect(resolveFilmFlags(stubParams({ shots: '1' }))).toEqual({
            filmParam: null,
            shotsMode: '1',
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ shots: 'debug' }))).toEqual({
            filmParam: null,
            shotsMode: 'debug',
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ lightarc: '1' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: true,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ godray: '1' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: true,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ mutation: '1' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('forces all features off when film=0 alone', () => {
        expect(resolveFilmFlags(stubParams({ film: '0' }))).toEqual({
            filmParam: '0',
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('film=0 escape hatch overrides individual on flags', () => {
        expect(resolveFilmFlags(stubParams({
            film: '0',
            shots: '1',
            lightarc: '1',
            godray: '1',
            mutation: '1'
        }))).toEqual({
            filmParam: '0',
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('treats film=1 alone as equivalent to individual lightarc=1 without film', () => {
        const fromFilm = resolveFilmFlags(stubParams({ film: '1' }));
        const fromLightArc = resolveFilmFlags(stubParams({ lightarc: '1' }));
        expect(fromFilm.lightArc).toBe(true);
        expect(fromLightArc.lightArc).toBe(true);
        expect(fromFilm.godRay).toBe(true);
        expect(fromLightArc.godRay).toBe(false);
    });

    it('falls back to film aggregate shots when explicit shots value is invalid', () => {
        expect(resolveFilmFlags(stubParams({ film: '1', shots: '2' }))).toEqual({
            filmParam: '1',
            shotsMode: '1',
            lightArc: true,
            godRay: true,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ shots: '2' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('trims and lowercases shots before comparing', () => {
        expect(resolveFilmFlags(stubParams({ shots: ' DEBUG ' }))).toEqual({
            filmParam: null,
            shotsMode: 'debug',
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('explicit feature =0 negates under film=1 aggregation', () => {
        expect(resolveFilmFlags(stubParams({ film: '1', shots: '0' }))).toEqual({
            filmParam: '1',
            shotsMode: null,
            lightArc: true,
            godRay: true,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ film: '1', lightarc: '0' }))).toEqual({
            filmParam: '1',
            shotsMode: '1',
            lightArc: false,
            godRay: true,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ film: '1', godray: '0' }))).toEqual({
            filmParam: '1',
            shotsMode: '1',
            lightArc: true,
            godRay: false,
            mutation: true,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ film: '1', mutation: '0' }))).toEqual({
            filmParam: '1',
            shotsMode: '1',
            lightArc: true,
            godRay: true,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('explicit feature =0 without film is a harmless no-op', () => {
        expect(resolveFilmFlags(stubParams({ lightarc: '0' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ godray: '0' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ mutation: '0' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
        expect(resolveFilmFlags(stubParams({ shots: '0' }))).toEqual({
            filmParam: null,
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    it('returns a fresh object on each call', () => {
        const params = stubParams({});
        const a = resolveFilmFlags(params);
        const b = resolveFilmFlags(params);
        expect(a).not.toBe(b);
        expect(a).toEqual(b);
        expect(a).toMatchObject({
            recutParam: null,
            recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
        });
    });

    describe('recut query flag (context-gated)', () => {
        it('enables recut only for canonical context with recut=1', () => {
            expect(resolveFilmFlags(stubParams({ recut: '1' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: '1',
                recut: true,
                lehrParam: null,
                lehr: false,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it.each([
            ['absent recut', {}, CANONICAL_CONTEXT, null, false],
            ['recut=0', { recut: '0' }, CANONICAL_CONTEXT, '0', false],
            ['film=0 with recut=1', { film: '0', recut: '1' }, CANONICAL_CONTEXT, '1', false],
            ['recut=1 on another track', { recut: '1' }, {
                trackSlug: 'o-filho',
                variantKey: 'track5-cinema'
            }, '1', false],
            ['recut=1 on fill variant', { recut: '1' }, {
                trackSlug: 'nao-querer-nada',
                variantKey: 'track5-cinema-fill'
            }, '1', false],
            ['recut=1 on hush variant', { recut: '1' }, {
                trackSlug: 'nao-querer-nada',
                variantKey: 'track5-cinema-hush'
            }, '1', false],
            ['garbage recut=2', { recut: '2' }, CANONICAL_CONTEXT, null, false],
            ['garbage recut=yes', { recut: 'yes' }, CANONICAL_CONTEXT, null, false],
            ['recut=1 without context', { recut: '1' }, {}, '1', false]
        ])('%s', (_label, paramMap, context, recutParam, recut) => {
            const flags = resolveFilmFlags(stubParams(paramMap), context);
            expect(flags.recutParam).toBe(recutParam);
            expect(flags.recut).toBe(recut);
        });
    });

    describe('lehr query flag (recut-gated)', () => {
        it('enables lehr only for canonical recut=1 with lehr=1', () => {
            expect(resolveFilmFlags(stubParams({ recut: '1', lehr: '1' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: '1',
                recut: true,
                lehrParam: '1',
                lehr: true,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it.each([
            ['lehr=1 without recut', { lehr: '1' }, CANONICAL_CONTEXT, '1', false],
            ['lehr=1 with recut=0', { recut: '0', lehr: '1' }, CANONICAL_CONTEXT, '1', false],
            ['lehr=0 with recut=1', { recut: '1', lehr: '0' }, CANONICAL_CONTEXT, '0', false],
            ['lehr=1 on another track', { recut: '1', lehr: '1' }, {
                trackSlug: 'o-filho',
                variantKey: 'track5-cinema'
            }, '1', false],
            ['film=0 kills lehr', { film: '0', recut: '1', lehr: '1' }, CANONICAL_CONTEXT, '1', false],
            ['garbage lehr=2', { recut: '1', lehr: '2' }, CANONICAL_CONTEXT, null, false]
        ])('%s', (_label, paramMap, context, lehrParam, lehr) => {
            const flags = resolveFilmFlags(stubParams(paramMap), context);
            expect(flags.lehrParam).toBe(lehrParam);
            expect(flags.lehr).toBe(lehr);
        });

        it('readLehrParam trims before validating', () => {
            expect(readLehrParam(stubParams({ lehr: ' 1 ' }))).toBe('1');
        });

        it('resolveLehrEnabled is true only when recut and lehr=1', () => {
            expect(resolveLehrEnabled('1', true)).toBe(true);
            expect(resolveLehrEnabled('1', false)).toBe(false);
            expect(resolveLehrEnabled('0', true)).toBe(false);
            expect(resolveLehrEnabled(null, true)).toBe(false);
        });
    });

    describe('listen query flag (recut-gated)', () => {
        it('enables listen only for canonical recut=1 with listen=1', () => {
            expect(resolveFilmFlags(stubParams({ recut: '1', listen: '1' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: '1',
                recut: true,
                lehrParam: null,
                lehr: false,
                listenParam: '1',
                listen: true,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it.each([
            ['listen=1 without recut', { listen: '1' }, CANONICAL_CONTEXT, '1', false],
            ['listen=1 with recut=0', { recut: '0', listen: '1' }, CANONICAL_CONTEXT, '1', false],
            ['listen=0 with recut=1', { recut: '1', listen: '0' }, CANONICAL_CONTEXT, '0', false],
            ['listen=1 on another track', { recut: '1', listen: '1' }, {
                trackSlug: 'o-filho',
                variantKey: 'track5-cinema'
            }, '1', false],
            ['film=0 kills listen', { film: '0', recut: '1', listen: '1' }, CANONICAL_CONTEXT, '1', false],
            ['garbage listen=2', { recut: '1', listen: '2' }, CANONICAL_CONTEXT, null, false]
        ])('%s', (_label, paramMap, context, listenParam, listen) => {
            const flags = resolveFilmFlags(stubParams(paramMap), context);
            expect(flags.listenParam).toBe(listenParam);
            expect(flags.listen).toBe(listen);
        });

        it('readListenParam trims before validating', () => {
            expect(readListenParam(stubParams({ listen: ' 1 ' }))).toBe('1');
        });

        it('resolveListenEnabled is true only when recut and listen=1', () => {
            expect(resolveListenEnabled('1', true)).toBe(true);
            expect(resolveListenEnabled('1', false)).toBe(false);
            expect(resolveListenEnabled('0', true)).toBe(false);
            expect(resolveListenEnabled(null, true)).toBe(false);
        });
    });

    describe('canonical Track 5 implicit default (context)', () => {
        it('turns on aggregate when film absent and context is canonical track5-cinema', () => {
            expect(resolveFilmFlags(stubParams({}), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
        });

        it('forces all off when film=0 even with canonical context', () => {
            expect(resolveFilmFlags(stubParams({ film: '0' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: '0',
                shotsMode: null,
                lightArc: false,
                godRay: false,
                mutation: false,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
        });

        it('disables only the feature set to =0 under implicit aggregate', () => {
            expect(resolveFilmFlags(stubParams({ lightarc: '0' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: false,
                godRay: true,
                mutation: true,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
            expect(resolveFilmFlags(stubParams({ godray: '0' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: false,
                mutation: true,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
            expect(resolveFilmFlags(stubParams({ mutation: '0' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: '1',
                lightArc: true,
                godRay: true,
                mutation: false,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
            expect(resolveFilmFlags(stubParams({ shots: '0' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: null,
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
        });

        it('prefers explicit shots=debug over implicit aggregate', () => {
            expect(resolveFilmFlags(stubParams({ shots: 'debug' }), CANONICAL_CONTEXT)).toEqual({
                filmParam: null,
                shotsMode: 'debug',
                lightArc: true,
                godRay: true,
                mutation: true,
                recutParam: null,
                recut: false,
            lehrParam: null,
            lehr: false,
            listenParam: null,
            listen: false,
            texturedParam: null,
            textured: false,
            rimModeParam: null,
            rimMode: 'follow'
            });
        });
    });

    describe('non-canonical context keeps legacy off when film absent', () => {
        it('track5-cinema-fill on Track 5 slug', () => {
            expect(resolveFilmFlags(stubParams({}), {
                trackSlug: 'nao-querer-nada',
                variantKey: 'track5-cinema-fill'
            })).toEqual({
                filmParam: null,
                shotsMode: null,
                lightArc: false,
                godRay: false,
                mutation: false,
                recutParam: null,
                recut: false,
                lehrParam: null,
                lehr: false,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it('track5-cinema-hush on Track 5 slug', () => {
            expect(resolveFilmFlags(stubParams({}), {
                trackSlug: 'nao-querer-nada',
                variantKey: 'track5-cinema-hush'
            })).toEqual({
                filmParam: null,
                shotsMode: null,
                lightArc: false,
                godRay: false,
                mutation: false,
                recutParam: null,
                recut: false,
                lehrParam: null,
                lehr: false,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it('canonical variant on another track slug', () => {
            expect(resolveFilmFlags(stubParams({}), {
                trackSlug: 'o-filho',
                variantKey: 'track5-cinema'
            })).toEqual({
                filmParam: null,
                shotsMode: null,
                lightArc: false,
                godRay: false,
                mutation: false,
                recutParam: null,
                recut: false,
                lehrParam: null,
                lehr: false,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });

        it('no context (URL-only resolve)', () => {
            expect(resolveFilmFlags(stubParams({}))).toEqual({
                filmParam: null,
                shotsMode: null,
                lightArc: false,
                godRay: false,
                mutation: false,
                recutParam: null,
                recut: false,
                lehrParam: null,
                lehr: false,
                listenParam: null,
                listen: false,
                texturedParam: null,
                textured: false,
                rimModeParam: null,
                rimMode: 'follow'
            });
        });
    });

    describe('textured query flag (hero GLB A/B)', () => {
        it.each([
            ['absent', {}, null, false],
            ['textured=1', { textured: '1' }, '1', true],
            ['textured=0', { textured: '0' }, '0', false],
            ['garbage textured=2', { textured: '2' }, null, false],
            ['garbage textured=yes', { textured: 'yes' }, null, false],
            ['film=0 with textured=1', { film: '0', textured: '1' }, '1', true]
        ])('%s', (_label, paramMap, texturedParam, textured) => {
            const flags = resolveFilmFlags(stubParams(paramMap), CANONICAL_CONTEXT);
            expect(flags.texturedParam).toBe(texturedParam);
            expect(flags.textured).toBe(textured);
        });

        it('readTexturedParam trims before validating', () => {
            expect(readTexturedParam(stubParams({ textured: ' 1 ' }))).toBe('1');
        });

        it('resolveTexturedEnabled is true only for textured=1', () => {
            expect(resolveTexturedEnabled('1')).toBe(true);
            expect(resolveTexturedEnabled('0')).toBe(false);
            expect(resolveTexturedEnabled(null)).toBe(false);
        });
    });
});
