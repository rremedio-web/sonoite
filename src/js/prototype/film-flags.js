/**
 * URL flag resolution for the Path B films, imported by experience.js. resolveFilmFlags() returns the
 * Track 5 production flags. shots / lightarc / godray / mutation default on only for the canonical
 * Track 5 film (nao-querer-nada on track5-cinema) when `?film` is absent. `?film=0` turns those flags off;
 * `?film=1` turns them on for any track; a per-flag `?<flag>=0|1` still overrides `?film=1` and the default
 * (so `?film=1&godray=0` disables godray). recut / lehr / listen / rimmode apply only on the canonical
 * Track 5 film with `?recut=1`. Separate helpers resolve `?textured=`, `?sodium=` (Track 4) and
 * `?vigil=` (Track 1).
 */

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @param {string}                                           name
 * @return {string|null} Normalized param value, or null when missing or empty.
 */
function readTriStateParam(urlParams, name) {
    const raw = urlParams.get(name);
    if (raw === null || raw === undefined) {
        return null;
    }
    const trimmed = String(raw).trim();
    if (trimmed === '') {
        return null;
    }
    return trimmed;
}

function resolveFeatureFlag(urlParams, paramName, filmParam, aggregateOn) {
    const raw = readTriStateParam(urlParams, paramName);
    if (raw === '0') {
        return false;
    }
    if (raw === '1') {
        return true;
    }
    if (filmParam === '1' || aggregateOn) {
        return true;
    }
    return false;
}

function isCanonicalTrack5FilmDefault(context = {}) {
    const trackSlug = String(context.trackSlug || '').trim().toLowerCase();
    const variantKey = String(context.variantKey || '').trim();
    return trackSlug === 'nao-querer-nada' && variantKey === 'track5-cinema';
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized recut query value, or null when absent or invalid.
 */
function readRecutParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'recut');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized textured query value, or null when absent or invalid.
 */
export function readTexturedParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'textured');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * @param {'1'|'0'|null} texturedParam
 * @return {boolean} Whether the textured optimized GLB is selected.
 */
export function resolveTexturedEnabled(texturedParam) {
    return texturedParam === '1';
}

/**
 * @param {'1'|'0'|null}                                recutParam
 * @param {{ trackSlug?: string, variantKey?: string }} context
 * @param {boolean}                                     filmKill
 * @return {boolean} Whether recut mode is enabled for this resolve.
 */
function resolveRecutEnabled(recutParam, context, filmKill) {
    if (filmKill) {
        return false;
    }
    if (recutParam !== '1') {
        return false;
    }
    return isCanonicalTrack5FilmDefault(context);
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized lehr query value, or null when absent or invalid.
 */
export function readLehrParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'lehr');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * Lehr is recut-only. Without recut the cheap-picture bundle never engages,
 * so `?lehr=1` on the accepted film is a no-op.
 *
 * @param {'1'|'0'|null} lehrParam
 * @param {boolean}      recut
 * @return {boolean} Whether the lehr lookdev bundle is enabled for this resolve.
 */
export function resolveLehrEnabled(lehrParam, recut) {
    return recut === true && lehrParam === '1';
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized listen query value, or null when absent or invalid.
 */
export function readListenParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'listen');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * Listen is recut-only. Without recut, commits and rotating accents never
 * engage, so `?listen=1` on the accepted film is a no-op.
 *
 * @param {'1'|'0'|null} listenParam
 * @param {boolean}      recut
 * @return {boolean} Whether the listen commit/accent bundle is enabled for this resolve.
 */
export function resolveListenEnabled(listenParam, recut) {
    return recut === true && listenParam === '1';
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized sodium query value, or null when absent or invalid.
 */
export function readSodiumParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'sodium');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * Track 4 horas-mortas-cinema only. `?sodium=0` forces a steady dim run with no
 * authored schedule — same tri-state shape as other film kill switches.
 *
 * @param {'1'|'0'|null} sodiumParam
 * @return {boolean} Whether the authored sodium schedule is enabled.
 */
export function resolveSodiumEnabled(sodiumParam) {
    return sodiumParam !== '0';
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'1'|'0'|null} Normalized vigil query value, or null when absent or invalid.
 */
export function readVigilParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'vigil');
    if (raw === '1' || raw === '0') {
        return raw;
    }
    return null;
}

/**
 * Vigil is sonoite-cinema only. The caller must also gate on isSonoiteCinemaVariant();
 * without that guard `?vigil=1` on other routes is a no-op.
 *
 * @param {'1'|'0'|null} vigilParam
 * @return {boolean} Whether the vigil candle-aging + extinction-smoke test is enabled.
 */
export function resolveVigilEnabled(vigilParam) {
    return vigilParam === '1';
}

/**
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @return {'commit'|'follow'|null} Normalized rimmode query value, or null when absent or invalid.
 */
export function readRimModeParam(urlParams) {
    const raw = readTriStateParam(urlParams, 'rimmode');
    if (raw === 'commit' || raw === 'follow') {
        return raw;
    }
    return null;
}

/**
 * Rim mode is recut-only (owner A/B on the P6 plateau rim, audit 2026-08-13).
 * 'follow' = continuous EMA follow (shipped default); 'commit' = the
 * committed/hysteretic stepped variant. Without recut the plateau rim path
 * never engages, so `?rimmode=commit` on the accepted film is a no-op.
 *
 * @param {'commit'|'follow'|null} rimModeParam
 * @param {boolean}                recut
 * @return {'commit'|'follow'} Resolved plateau rim mode for this resolve.
 */
export function resolveRimMode(rimModeParam, recut) {
    return recut === true && rimModeParam === 'commit' ? 'commit' : 'follow';
}

/**
 * Resolve Track 5 cinema production flags from URL search params.
 *
 * @param {{ get: (name: string) => string|null|undefined }} urlParams
 * @param {{ trackSlug?: string, variantKey?: string }}      [context]
 * @return {{
 *   filmParam: '1'|'0'|string|null,
 *   shotsMode: '1'|'debug'|null,
 *   lightArc: boolean,
 *   godRay: boolean,
 *   mutation: boolean,
 *   recutParam: '1'|'0'|null,
 *   recut: boolean,
 *   lehrParam: '1'|'0'|null,
 *   lehr: boolean,
 *   listenParam: '1'|'0'|null,
 *   listen: boolean,
 *   texturedParam: '1'|'0'|null,
 *   textured: boolean,
 *   rimModeParam: 'commit'|'follow'|null,
 *   rimMode: 'commit'|'follow'
 * }} Resolved Track 5 cinema production flags.
 */
export function resolveFilmFlags(urlParams, context = {}) {
    const filmRaw = urlParams.get('film');
    const filmParam = (filmRaw === null || filmRaw === undefined || String(filmRaw).trim() === '')
        ? null
        : String(filmRaw);

    const recutParam = readRecutParam(urlParams);
    const lehrParam = readLehrParam(urlParams);
    const listenParam = readListenParam(urlParams);
    const texturedParam = readTexturedParam(urlParams);
    const textured = resolveTexturedEnabled(texturedParam);
    const rimModeParam = readRimModeParam(urlParams);
    const filmKill = filmParam === '0';

    if (filmKill) {
        return {
            filmParam: '0',
            shotsMode: null,
            lightArc: false,
            godRay: false,
            mutation: false,
            recutParam,
            recut: false,
            lehrParam,
            lehr: false,
            listenParam,
            listen: false,
            texturedParam,
            textured,
            rimModeParam,
            rimMode: 'follow'
        };
    }

    const aggregateOn = filmParam === null && isCanonicalTrack5FilmDefault(context);

    const shotsRequested = (urlParams.get('shots') || '').trim().toLowerCase();
    let shotsMode = null;
    if (shotsRequested === 'debug' || shotsRequested === '1') {
        shotsMode = shotsRequested;
    } else if (shotsRequested === '0') {
        shotsMode = null;
    } else if (filmParam === '1' || aggregateOn) {
        shotsMode = '1';
    }

    const lightArc = resolveFeatureFlag(urlParams, 'lightarc', filmParam, aggregateOn);
    const godRay = resolveFeatureFlag(urlParams, 'godray', filmParam, aggregateOn);
    const mutation = resolveFeatureFlag(urlParams, 'mutation', filmParam, aggregateOn);

    const recut = resolveRecutEnabled(recutParam, context, false);
    const lehr = resolveLehrEnabled(lehrParam, recut);
    const listen = resolveListenEnabled(listenParam, recut);
    const rimMode = resolveRimMode(rimModeParam, recut);

    return {
        filmParam,
        shotsMode,
        lightArc,
        godRay,
        mutation,
        recutParam,
        recut,
        lehrParam,
        lehr,
        listenParam,
        listen,
        texturedParam,
        textured,
        rimModeParam,
        rimMode
    };
}
