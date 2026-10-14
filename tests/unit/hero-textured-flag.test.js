import {
    DEFAULT_HERO_MODEL_PATHS,
    materialHasHeroImageMaps,
    resolveHeroModelCandidates,
    resolveThemeAssetUrl,
    shouldPreserveHeroModelMaterials,
    shouldSkipTrack5CinemaMaterialDecoration
} from '../../src/js/prototype/hero-model-urls.js';

const THEME_URL = 'http://localhost/homem/wp-content/themes/sonoite-theme';

const JOURNEY_HERO_CONFIG = {
    modelUrl: 'public/assets/models/track5-poc/optimized/track5-relic-blender-chamber-optimized.glb',
    fallbackModelUrl: DEFAULT_HERO_MODEL_PATHS.modelUrl,
    legacyModelUrl: DEFAULT_HERO_MODEL_PATHS.legacyModelUrl,
    legacyFallbackModelUrl: DEFAULT_HERO_MODEL_PATHS.legacyFallbackModelUrl,
    preserveTextures: true
};

function urlFor(relative) {
    return resolveThemeAssetUrl(relative, THEME_URL);
}

describe('hero textured flag URL ordering', () => {
    it.each([
        [
            'canonical journey default (generated first)',
            {
                heroConfig: JOURNEY_HERO_CONFIG,
                relicChoice: null,
                artifactMode: 'textured',
                texturedModelEnabled: false
            },
            [
                DEFAULT_HERO_MODEL_PATHS.modelUrl,
                JOURNEY_HERO_CONFIG.modelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyFallbackModelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyModelUrl
            ]
        ],
        [
            '?textured=1 prepends explicit textured asset',
            {
                heroConfig: JOURNEY_HERO_CONFIG,
                relicChoice: null,
                artifactMode: 'textured',
                texturedModelEnabled: true
            },
            [
                DEFAULT_HERO_MODEL_PATHS.texturedModelUrl,
                DEFAULT_HERO_MODEL_PATHS.modelUrl,
                JOURNEY_HERO_CONFIG.modelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyFallbackModelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyModelUrl
            ]
        ],
        [
            '?relic=blender keeps primary first, textured prepended',
            {
                heroConfig: JOURNEY_HERO_CONFIG,
                relicChoice: 'blender',
                artifactMode: 'textured',
                texturedModelEnabled: true
            },
            [
                DEFAULT_HERO_MODEL_PATHS.texturedModelUrl,
                JOURNEY_HERO_CONFIG.modelUrl,
                DEFAULT_HERO_MODEL_PATHS.modelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyFallbackModelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyModelUrl
            ]
        ],
        [
            '?relic=meshy keeps generated primary when textured absent',
            {
                heroConfig: DEFAULT_HERO_MODEL_PATHS,
                relicChoice: 'meshy',
                artifactMode: 'textured',
                texturedModelEnabled: false
            },
            [
                DEFAULT_HERO_MODEL_PATHS.modelUrl,
                DEFAULT_HERO_MODEL_PATHS.fallbackModelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyFallbackModelUrl,
                DEFAULT_HERO_MODEL_PATHS.legacyModelUrl
            ]
        ]
    ])('%s', (_label, input, expectedRelativePaths) => {
        const candidates = resolveHeroModelCandidates({
            ...input,
            themeUrl: THEME_URL
        });
        expect(candidates).toEqual(expectedRelativePaths.map((relative) => urlFor(relative)));
    });
});

describe('track5 cinema material decoration skip', () => {
    const texturedUrl = urlFor(DEFAULT_HERO_MODEL_PATHS.texturedModelUrl);

    it('skips procedural override when textured=1 loaded the explicit textured GLB', () => {
        expect(shouldSkipTrack5CinemaMaterialDecoration({ color: '#ffffff' }, {
            texturedParam: '1',
            loadedHeroModelUrl: texturedUrl,
            heroConfig: JOURNEY_HERO_CONFIG,
            themeUrl: THEME_URL
        })).toBe(true);
    });

    it('still decorates when textured=1 but a fallback mesh loaded', () => {
        expect(shouldSkipTrack5CinemaMaterialDecoration({ color: '#ffffff' }, {
            texturedParam: '1',
            loadedHeroModelUrl: urlFor(DEFAULT_HERO_MODEL_PATHS.modelUrl),
            heroConfig: JOURNEY_HERO_CONFIG,
            themeUrl: THEME_URL
        })).toBe(false);
    });

    it('skips when the material already has image maps', () => {
        expect(materialHasHeroImageMaps({ map: {}, roughness: 0.5 })).toBe(true);
        expect(shouldSkipTrack5CinemaMaterialDecoration({ map: {}, roughness: 0.5 }, {
            texturedParam: null,
            loadedHeroModelUrl: null,
            heroConfig: JOURNEY_HERO_CONFIG,
            themeUrl: THEME_URL
        })).toBe(true);
    });
});

describe('hero textured preserveTextures gating', () => {
    const texturedUrl = urlFor(DEFAULT_HERO_MODEL_PATHS.texturedModelUrl);
    const generatedUrl = urlFor(DEFAULT_HERO_MODEL_PATHS.modelUrl);

    it.each([
        ['textured=1 + textured GLB loaded', '1', texturedUrl, true],
        ['textured=1 + generated fallback loaded', '1', generatedUrl, false],
        ['textured=0 forces authored material', '0', texturedUrl, false],
        ['textured absent uses journey preserveTextures', null, generatedUrl, true]
    ])('%s', (_label, texturedParam, loadedHeroModelUrl, expected) => {
        expect(shouldPreserveHeroModelMaterials({
            texturedParam,
            loadedHeroModelUrl,
            heroConfig: JOURNEY_HERO_CONFIG,
            artifactMode: 'textured',
            hasArtifactParam: false,
            preserveTexturesParam: false,
            themeUrl: THEME_URL
        })).toBe(expected);
    });
});
