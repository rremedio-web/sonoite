/**
 * Page data for the standalone site: the globals the Path B runtime (src/js/prototype/) reads at boot,
 * which WordPress used to print and the static export inlined until Prompt #248.
 * - window.sonoiteData: the static export's payload shape. `themeUrl` is the page's base directory
 *   without a trailing slash (https://host for /, https://host/sub for /sub/), so the runtime's
 *   `${themeUrl}/public/…`, `${themeUrl}/assets/fonts/…` and the audio URLs resolve the same in the dev
 *   server, `vite preview` and a deploy under a sub-path. `relic` is the page default that the static
 *   export baked into `/` (blender) and `/b/` (meshy): `?relic=meshy|blender` picks it here, and
 *   experience.js resolveRelicChoice() still lets `?relic=` (including `materials`) win at runtime.
 * - window.__sonoiteStaticLoader: the bridge shell.js calls to fade out the #sonoite-static-loader
 *   overlay in index.html once the room is ready.
 * boot.js imports this module before ../prototype/main.js, so both globals exist before any Path B
 * module evaluates. Keep this file free of prototype imports.
 */

import { AUDIO_CONFIG, AUDIO_DIR, BUILT_FILM_TRACKS } from './tracks.js';

export const DEFAULT_RELIC = 'blender';
const PAGE_RELICS = ['blender', 'meshy'];
const LOADER_FADE_MS = 480;

/**
 * @param {string} pageHref The page URL (location.href).
 * @return {string} The page's base directory URL, always ending in '/'.
 */
export function resolveSiteBaseUrl(pageHref) {
    return new URL('.', pageHref).href;
}

/**
 * @param {string} search The page query string (location.search).
 * @return {'blender'|'meshy'} The relic default the page payload carries.
 */
export function resolvePageRelic(search) {
    const param = (new URLSearchParams(search).get('relic') || '').trim().toLowerCase();
    return PAGE_RELICS.includes(param) ? param : DEFAULT_RELIC;
}

/**
 * @param {string} pageHref The page URL (location.href).
 * @return {Object} The window.sonoiteData payload for that page.
 */
export function buildSonoiteData(pageHref) {
    const page = new URL(pageHref);
    const baseUrl = resolveSiteBaseUrl(page.href);

    return {
        tracks: BUILT_FILM_TRACKS.map((track) => ({
            id: track.id,
            title: track.title,
            content: '',
            audio_url: new URL(`${AUDIO_DIR}/${track.audioFile}`, baseUrl).href,
            duration: track.duration,
            order: track.order,
            slug: track.slug
        })),
        themeUrl: baseUrl.replace(/\/+$/, ''),
        relic: resolvePageRelic(page.search),
        version: 'standalone',
        isSecure: page.protocol === 'https:',
        isDebug: false,
        audioConfig: {
            ...AUDIO_CONFIG,
            allowedMimeTypes: [...AUDIO_CONFIG.allowedMimeTypes]
        }
    };
}

/**
 * @param {Document} doc
 * @param {Function} [schedule] setTimeout-compatible scheduler.
 * @return {{setStatus: Function, dismiss: Function}} The window.__sonoiteStaticLoader bridge.
 */
export function createStaticLoader(doc, schedule = (callback, ms) => setTimeout(callback, ms)) {
    return {
        setStatus() {},
        dismiss() {
            const root = doc.getElementById('sonoite-static-loader');
            if (!root) {
                return;
            }
            root.classList.add('is-ready');
            schedule(() => root.remove(), LOADER_FADE_MS);
        }
    };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.sonoiteData = buildSonoiteData(window.location.href);
    window.__sonoiteStaticLoader = createStaticLoader(document);
}
