/**
 * Hero relic asset selection for the chamber films, imported by experience.js. Holds the theme-relative
 * GLB paths, resolves them against the theme origin (anything outside the theme is rejected), orders the
 * load candidates for `?relic=`, `?artifact=` and `?textured=`, and decides whether a loaded GLB keeps its
 * own materials or receives the procedural Track 5 cinema shader.
 */

export const TEXTURED_HERO_MODEL_PATH = 'public/assets/models/track5-poc/optimized/track5-relic-textured-clean.glb';
export const MATERIAL_STUDY_MODEL_PATH = 'public/assets/models/material-study/material-regions-v1.glb';

export const DEFAULT_HERO_MODEL_PATHS = {
    modelUrl: 'public/assets/models/track5-poc/optimized/track5-relic-generated-optimized.glb',
    fallbackModelUrl: 'public/assets/models/track5-poc/optimized/track5-relic-textured-optimized.glb',
    texturedModelUrl: TEXTURED_HERO_MODEL_PATH,
    // Last-resort raw Meshy exports, requested only if every optimized GLB fails.
    // Not shipped in this public snapshot, so these candidates would 404.
    legacyModelUrl: 'public/assets/models/track5-poc/Meshy_AI_symbol_0307145856_generate.glb',
    legacyFallbackModelUrl: 'public/assets/models/track5-poc/Meshy_AI_symbol_0307145845_texture.glb'
};

/**
 * Resolve a theme-relative asset path to an absolute URL scoped to the theme origin.
 * @param {string} relative
 * @param {string} themeUrl
 * @return {string|null} Absolute URL, or null when the path is empty or resolves outside the theme.
 */
export function resolveThemeAssetUrl(relative, themeUrl) {
    if (!relative || !themeUrl) {
        return null;
    }

    const themeBase = new URL(`${themeUrl.replace(/\/+$/, '')}/`);
    const trimmed = relative.replace(/^\/+/, '');
    const resolved = new URL(trimmed, themeBase);

    if (resolved.origin !== themeBase.origin || !resolved.pathname.startsWith(themeBase.pathname)) {
        return null;
    }

    return resolved.href;
}

// Material slots whose presence means the GLB carries authored textures.
const HERO_IMAGE_MAP_KEYS = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap'
];

/**
 * @param {Object|null|undefined} material
 * @return {boolean} Whether any of the HERO_IMAGE_MAP_KEYS slots holds a texture.
 */
export function materialHasHeroImageMaps(material) {
    if (!material) {
        return false;
    }

    // eslint-disable-next-line security/detect-object-injection -- keys come from the fixed HERO_IMAGE_MAP_KEYS list
    return HERO_IMAGE_MAP_KEYS.some((key) => Boolean(material[key]));
}

/**
 * Skip the procedural Track 5 cinema relic shader when the loaded hero already
 * carries authored GLB textures (?textured=1 path) or standard image maps.
 *
 * @param {Object|null|undefined} material
 * @param {Object}                options
 * @param {'1'|'0'|null}          [options.texturedParam]
 * @param {string|null|undefined} [options.loadedHeroModelUrl]
 * @param {Object}                [options.heroConfig]
 * @param {Object}                [options.defaultConfig]
 * @param {string}                [options.themeUrl]
 * @return {boolean} Whether the cinema shader should leave this material alone.
 */
export function shouldSkipTrack5CinemaMaterialDecoration(material, {
    texturedParam = null,
    loadedHeroModelUrl = null,
    heroConfig = {},
    defaultConfig = DEFAULT_HERO_MODEL_PATHS,
    themeUrl = ''
} = {}) {
    if (!material) {
        return true;
    }

    if (texturedParam === '1' && isLoadedHeroTexturedAsset(loadedHeroModelUrl, heroConfig, defaultConfig, themeUrl)) {
        return true;
    }

    return materialHasHeroImageMaps(material);
}

/**
 * True when the loaded hero GLB is the explicit `?textured=1` asset. Without a resolvable
 * theme URL it falls back to matching the textured file name.
 *
 * @param {string|null|undefined} loadedHeroModelUrl
 * @param {Object}                heroConfig
 * @param {Object}                [defaultConfig]
 * @param {string}                themeUrl
 * @return {boolean} Whether the loaded URL is the textured GLB.
 */
export function isLoadedHeroTexturedAsset(loadedHeroModelUrl, heroConfig, defaultConfig = DEFAULT_HERO_MODEL_PATHS, themeUrl = '') {
    if (!loadedHeroModelUrl) {
        return false;
    }

    const texturedPath = heroConfig.texturedModelUrl || defaultConfig.texturedModelUrl;
    const texturedUrl = resolveThemeAssetUrl(texturedPath, themeUrl);
    if (!texturedUrl) {
        return loadedHeroModelUrl.includes('track5-relic-textured-clean.glb');
    }

    return loadedHeroModelUrl === texturedUrl;
}

/**
 * Ordered hero GLB candidates. ?textured=1 prepends the explicit textured asset
 * without swapping journey primary/fallback slots; `?relic=materials` returns only
 * the material-study GLB.
 *
 * @param {Object}                             options
 * @param {Object}                             options.heroConfig
 * @param {Object}                             [options.defaultConfig]
 * @param {'blender'|'meshy'|'materials'|null} [options.relicChoice]
 * @param {'textured'|'untextured'}            [options.artifactMode]
 * @param {boolean}                            [options.texturedModelEnabled]
 * @param {string}                             options.themeUrl
 * @return {string[]} Absolute candidate URLs in load order, de-duplicated.
 */
export function resolveHeroModelCandidates({
    heroConfig = {},
    defaultConfig = DEFAULT_HERO_MODEL_PATHS,
    relicChoice = null,
    artifactMode = 'untextured',
    texturedModelEnabled = false,
    themeUrl
}) {
    if (relicChoice === 'materials') {
        // A comparison must fail visibly if its asset is unavailable, rather
        // than silently showing a different sculpture under the study URL.
        return [resolveThemeAssetUrl(MATERIAL_STUDY_MODEL_PATH, themeUrl)].filter(Boolean);
    }
    const primaryModelUrl = heroConfig.modelUrl || defaultConfig.modelUrl;
    const fallbackModelUrl = heroConfig.fallbackModelUrl || defaultConfig.fallbackModelUrl;
    const texturedModelUrl = heroConfig.texturedModelUrl || defaultConfig.texturedModelUrl;
    const legacyModelUrl = heroConfig.legacyModelUrl || defaultConfig.legacyModelUrl;
    const legacyFallbackModelUrl = heroConfig.legacyFallbackModelUrl || defaultConfig.legacyFallbackModelUrl;

    let preferredModelUrl;
    let secondaryModelUrl;
    if (relicChoice === 'blender' || relicChoice === 'meshy') {
        preferredModelUrl = primaryModelUrl;
        secondaryModelUrl = fallbackModelUrl;
    } else {
        preferredModelUrl = artifactMode === 'textured' ? fallbackModelUrl : primaryModelUrl;
        secondaryModelUrl = artifactMode === 'textured' ? primaryModelUrl : fallbackModelUrl;
    }

    const preferredLegacyUrl = artifactMode === 'textured' ? legacyFallbackModelUrl : legacyModelUrl;
    const secondaryLegacyUrl = artifactMode === 'textured' ? legacyModelUrl : legacyFallbackModelUrl;

    const relativeUrls = texturedModelEnabled
        ? [texturedModelUrl, preferredModelUrl, secondaryModelUrl, preferredLegacyUrl, secondaryLegacyUrl]
        : [preferredModelUrl, secondaryModelUrl, preferredLegacyUrl, secondaryLegacyUrl];

    return [...new Set(
        relativeUrls
            .filter(Boolean)
            .map((relative) => resolveThemeAssetUrl(relative, themeUrl))
            .filter(Boolean)
    )];
}

/**
 * @param {Object}                  options
 * @param {'1'|'0'|null}            options.texturedParam
 * @param {string|null|undefined}   options.loadedHeroModelUrl
 * @param {Object}                  options.heroConfig
 * @param {Object}                  [options.defaultConfig]
 * @param {'textured'|'untextured'} options.artifactMode
 * @param {boolean}                 options.hasArtifactParam
 * @param {boolean}                 options.preserveTexturesParam
 * @param {string}                  options.themeUrl
 * @return {boolean} Whether the loaded GLB keeps its own materials.
 */
export function shouldPreserveHeroModelMaterials({
    texturedParam,
    loadedHeroModelUrl,
    heroConfig,
    defaultConfig = DEFAULT_HERO_MODEL_PATHS,
    artifactMode,
    hasArtifactParam,
    preserveTexturesParam,
    themeUrl
}) {
    if (loadedHeroModelUrl && loadedHeroModelUrl === resolveThemeAssetUrl(MATERIAL_STUDY_MODEL_PATH, themeUrl)) {
        return true;
    }
    if (texturedParam === '0') {
        return false;
    }

    if (texturedParam === '1') {
        return isLoadedHeroTexturedAsset(loadedHeroModelUrl, heroConfig, defaultConfig, themeUrl);
    }

    if (hasArtifactParam) {
        return artifactMode === 'textured';
    }

    if (preserveTexturesParam) {
        return true;
    }

    return artifactMode === 'textured' || heroConfig.preserveTextures === true;
}
