/* eslint-disable security/detect-non-literal-fs-filename -- reads fixed repo files under the project root */
import fs from 'fs';
import path from 'path';
import {
    RUNTIME_ASSETS,
    RUNTIME_AUDIO,
    resolveRuntimeAssets
} from '../../scripts/runtime-assets.mjs';
import { ALBUM_TRACKS, AUDIO_CONFIG, BUILT_FILM_TRACKS } from '../../src/js/site/tracks.js';
import {
    DEFAULT_RELIC,
    buildSonoiteData,
    createStaticLoader,
    resolvePageRelic
} from '../../src/js/site/site-data.js';
import { BUILT_TRACK_CYCLE } from '../../src/js/prototype/shell.js';
import {
    DEFAULT_HERO_MODEL_PATHS,
    TEXTURED_HERO_MODEL_PATH,
    resolveThemeAssetUrl
} from '../../src/js/prototype/hero-model-urls.js';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('runtime asset list (scripts/runtime-assets.mjs)', () => {
    const { files, missing } = resolveRuntimeAssets(ROOT);

    it('lists only entries that exist in the repo', () => {
        expect(missing).toEqual([]);
        expect(files.length).toBeGreaterThan(RUNTIME_ASSETS.length);
        files.forEach((rel) => {
            expect(fs.statSync(path.join(ROOT, rel)).isFile()).toBe(true);
            expect(path.basename(rel).startsWith('.')).toBe(false);
        });
    });

    it('ships the fonts, the Draco decoder and the Track 1 Stage drape and textures', () => {
        expect(files).toEqual(expect.arrayContaining([
            'assets/fonts/cormorant-garamond-latin.woff2',
            'assets/fonts/ibm-plex-mono-latin.woff2',
            'public/vendor/draco/draco_decoder.wasm',
            'public/vendor/draco/draco_wasm_wrapper.js',
            'public/assets/models/track1-stage/weighted-drape.glb',
            'public/assets/materials/track1-stage/Fabric040_1K-JPG_Color.jpg',
            'public/assets/materials/track1-stage/Plaster001_1K-JPG_NormalGL.jpg'
        ]));
    });

    it('ships the journey, enriched moments, beat grid and phases of every built film', () => {
        BUILT_TRACK_CYCLE.forEach((slug) => {
            expect(files).toEqual(expect.arrayContaining([
                `public/assets/journeys/phase42/${slug}.json`,
                `public/assets/journeys/phase42/${slug}-enriched-moments.json`,
                `public/assets/journeys/analysis/${slug}/beats.json`,
                `public/assets/journeys/analysis/${slug}/phases.json`
            ]));
        });
    });

    it('ships the relic GLBs the runtime resolves (journey primary, code default, textured)', () => {
        const journey = JSON.parse(read('public/assets/journeys/phase42/nao-querer-nada.json'));
        const hero = (journey.structureElements || journey.structure?.elements || [])
            .find((element) => ['artifact_model', 'reliquary_hero', 'track5_hero_model'].includes(element.type));
        expect(files).toEqual(expect.arrayContaining([
            hero.params.modelUrl,
            hero.params.fallbackModelUrl,
            DEFAULT_HERO_MODEL_PATHS.modelUrl,
            TEXTURED_HERO_MODEL_PATH
        ]));
    });

    it('keeps audio out of the asset list and names the three built films\' MP3s', () => {
        expect(files.some((rel) => rel.startsWith('audio/'))).toBe(false);
        expect(RUNTIME_AUDIO).toEqual([
            'audio/01-sonoite.mp3',
            'audio/04-horas-mortas.mp3',
            'audio/05-nao-querer-nada.mp3'
        ]);
    });
});

describe('track list (src/js/site/tracks.js)', () => {
    it('lists the built films in BUILT_TRACK_CYCLE order', () => {
        expect(BUILT_FILM_TRACKS.map((track) => track.slug)).toEqual([...BUILT_TRACK_CYCLE]);
    });

    it('names all seven album MP3s NN-slug.mp3', () => {
        expect(ALBUM_TRACKS).toHaveLength(7);
        ALBUM_TRACKS.forEach((track) => {
            expect(track.audioFile).toBe(`${String(track.order).padStart(2, '0')}-${track.slug}.mp3`);
        });
    });
});

describe('page data (src/js/site/site-data.js)', () => {
    it('builds the static export payload shape for a site at the domain root', () => {
        const data = buildSonoiteData('https://sonoite.example/?track=horas-mortas');

        expect(Object.keys(data).sort()).toEqual(
            ['audioConfig', 'isDebug', 'isSecure', 'relic', 'themeUrl', 'tracks', 'version']
        );
        expect(data.themeUrl).toBe('https://sonoite.example');
        expect(data.relic).toBe(DEFAULT_RELIC);
        expect(DEFAULT_RELIC).toBe('blender');
        expect(data.version).toBe('standalone');
        expect(data.isSecure).toBe(true);
        expect(data.isDebug).toBe(false);
        expect(data.audioConfig).toEqual({ ...AUDIO_CONFIG, allowedMimeTypes: [...AUDIO_CONFIG.allowedMimeTypes] });
        expect(data.tracks).toEqual([
            {
                id: 1,
                title: 'Sonoite',
                content: '',
                audio_url: 'https://sonoite.example/audio/01-sonoite.mp3',
                duration: '08:59',
                order: 1,
                slug: 'sonoite'
            },
            {
                id: 4,
                title: 'Horas mortas',
                content: '',
                audio_url: 'https://sonoite.example/audio/04-horas-mortas.mp3',
                duration: '06:31',
                order: 4,
                slug: 'horas-mortas'
            },
            {
                id: 5,
                title: 'Não querer nada',
                content: '',
                audio_url: 'https://sonoite.example/audio/05-nao-querer-nada.mp3',
                duration: '09:24',
                order: 5,
                slug: 'nao-querer-nada'
            }
        ]);
    });

    it('resolves themeUrl and audio under a sub-path and takes ?relic=meshy as the page relic', () => {
        const data = buildSonoiteData('https://host.example/sonoite/index.html?relic=meshy&track=nao-querer-nada');

        expect(data.themeUrl).toBe('https://host.example/sonoite');
        expect(data.relic).toBe('meshy');
        expect(data.tracks[2].audio_url).toBe('https://host.example/sonoite/audio/05-nao-querer-nada.mp3');
        expect(resolveThemeAssetUrl(DEFAULT_HERO_MODEL_PATHS.modelUrl, data.themeUrl))
            .toBe(`https://host.example/sonoite/${DEFAULT_HERO_MODEL_PATHS.modelUrl}`);
    });

    it('keeps the dev server origin and defaults the relic to blender for anything but meshy', () => {
        const data = buildSonoiteData('http://127.0.0.1:3000/?relic=BLENDER');

        expect(data.themeUrl).toBe('http://127.0.0.1:3000');
        expect(data.isSecure).toBe(false);
        expect(data.relic).toBe('blender');
        expect(resolvePageRelic('?relic=materials')).toBe('blender');
        expect(resolvePageRelic('?relic=Meshy')).toBe('meshy');
        expect(resolvePageRelic('')).toBe('blender');
    });

    it('installs window.sonoiteData and the loader bridge when imported in a page', () => {
        expect(window.sonoiteData).toEqual(buildSonoiteData(window.location.href));
        expect(typeof window.__sonoiteStaticLoader.dismiss).toBe('function');
        expect(typeof window.__sonoiteStaticLoader.setStatus).toBe('function');
    });

    it('fades the static loader out and removes it after the fade', () => {
        document.body.innerHTML = '<div id="sonoite-static-loader"></div>';
        const scheduled = [];
        const loader = createStaticLoader(document, (callback, ms) => scheduled.push({ callback, ms }));

        loader.dismiss();
        const root = document.getElementById('sonoite-static-loader');
        expect(root.classList.contains('is-ready')).toBe(true);
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0].ms).toBe(480);
        scheduled[0].callback();
        expect(document.getElementById('sonoite-static-loader')).toBeNull();

        expect(() => loader.dismiss()).not.toThrow();
        expect(scheduled).toHaveLength(1);
    });
});

describe('entry wiring (index.html, boot.js)', () => {
    it('imports the page data before the Path B runtime and nothing else', () => {
        const statements = read('src/js/site/boot.js')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        expect(statements).toEqual(["import './site-data.js';", "import '../prototype/main.js';"]);
    });

    it('keeps the site-data module free of prototype imports', () => {
        expect(read('src/js/site/site-data.js')).not.toMatch(/from ['"]\.\.\/prototype\//);
    });

    it('loads boot.js and paints the loader, first-paint line and noscript card', () => {
        const html = read('index.html');
        expect(html).toMatch(/<script type="module" src="\.\/src\/js\/site\/boot\.js"><\/script>/);
        expect(html).toMatch(/id="sonoite-static-loader"/);
        expect(html).toMatch(/id="sonoite-prototype-root"/);
        expect(html).toMatch(/class="prototype-first-paint-line"/);
        expect(html).toMatch(/<noscript>/);
        expect(html).toMatch(/<meta name="robots" content="noindex, nofollow">/);
    });

    it('preloads no models or data, and marks font preloads vite-ignore so the build leaves them alone', () => {
        const html = read('index.html');
        const preloads = html.match(/<link rel="preload"[^>]*>/g) || [];
        expect(preloads.some((tag) => /\.(glb|json)"/.test(tag))).toBe(false);
        preloads.forEach((tag) => {
            expect(tag).toMatch(/href="\.\/assets\/fonts\/[\w-]+\.woff2"/);
            expect(tag).toMatch(/\bvite-ignore\b/);
        });
    });
});
