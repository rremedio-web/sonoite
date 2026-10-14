export const TEXTURED_HERO_MODEL_PATH = 'public/assets/models/track5-poc/optimized/track5-relic-textured-clean.glb';
export const MATERIAL_STUDY_MODEL_PATH = 'public/assets/models/material-study/material-regions-v1.glb';

export const DEFAULT_HERO_MODEL_PATHS = {
    modelUrl: 'public/assets/models/track5-poc/optimized/track5-relic-generated-optimized.glb',
    fallbackModelUrl: 'public/assets/models/track5-poc/optimized/track5-relic-textured-optimized.glb',
    texturedModelUrl: TEXTURED_HERO_MODEL_PATH,
    legacyModelUrl: 'public/assets/models/track5-poc/Meshy_AI_symbol_0307145856_generate.glb',
    legacyFallbackModelUrl: 'public/assets/models/track5-poc/Meshy_AI_symbol_0307145845_texture.glb'
};

/**
 * Resolve a theme-relative asset path to an absolute URL scoped to the theme origin.
 * @param {string} relative
 * @param {string} themeUrl
 * @return {string|null}
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

/**
 * @param {string|null|undefined} loadedHeroModelUrl
 * @param {object} heroConfig
 * @param {object} [defaultConfig]
 * @param {string} themeUrl
 * @return {boolean}
 */
const HERO_IMAGE_MAP_KEYS = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap'
];

/**
 * @param {object|null|undefined} material
 * @return {boolean}
 */
export function materialHasHeroImageMaps(material) {
    if (!material) {
        return false;
    }

    return HERO_IMAGE_MAP_KEYS.some((key) => Boolean(material[key]));
}

/**
 * Skip the procedural Track 5 cinema relic shader when the loaded hero already
 * carries authored GLB textures (?textured=1 path) or standard image maps.
 *
 * @param {object|null|undefined} material
 * @param {object} options
 * @param {'1'|'0'|null} [options.texturedParam]
 * @param {string|null|undefined} [options.loadedHeroModelUrl]
 * @param {object} [options.heroConfig]
 * @param {object} [options.defaultConfig]
 * @param {string} [options.themeUrl]
 * @return {boolean}
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
 * without swapping journey primary/fallback slots.
 *
 * @param {object} options
 * @param {object} options.heroConfig
 * @param {object} [options.defaultConfig]
 * @param {'blender'|'meshy'|null} [options.relicChoice]
 * @param {'textured'|'untextured'} [options.artifactMode]
 * @param {boolean} [options.texturedModelEnabled]
 * @param {string} options.themeUrl
 * @return {string[]}
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
 * @param {object} options
 * @param {'1'|'0'|null} options.texturedParam
 * @param {string|null|undefined} options.loadedHeroModelUrl
 * @param {object} options.heroConfig
 * @param {object} [options.defaultConfig]
 * @param {'textured'|'untextured'} options.artifactMode
 * @param {boolean} options.hasArtifactParam
 * @param {boolean} options.preserveTexturesParam
 * @param {string} options.themeUrl
 * @return {boolean}
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
