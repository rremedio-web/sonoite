/* eslint-disable security/detect-non-literal-fs-filename -- build tooling: every path comes from the fixed lists below */
/**
 * The runtime asset set: every file the built site fetches by URL at `${themeUrl}/…` rather than
 * importing it, i.e. what dist/ needs besides the Vite bundle. The dev server serves these straight from
 * the project root; on `vite build` the runtime-assets plugin in vite.config.js copies them into dist/ at
 * the same relative paths, so the Path B runtime's URLs work unchanged in dev, preview and production.
 *
 * The selection is the one the static export (scripts/build-static-prototype.mjs, deleted in Prompt #249)
 * shipped. It is not "everything in public/": legacy journeys, the other four tracks' data, the
 * material-study GLB (?relic=materials) and the textured fallback GLB stay out, as they did there.
 * When the runtime starts fetching a new file, add it here (and run `npm test`).
 *
 * Imported by vite.config.js, scripts/check-audio.mjs and tests/unit/standalone-site.test.js. It takes
 * the project root as an argument instead of using import.meta, so Jest (babel → CommonJS) can import it.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AUDIO_DIR, BUILT_FILM_TRACKS } from '../src/js/site/tracks.js';

const RELIC_DIR = 'public/assets/models/track5-poc/optimized';

/**
 * @param {string} slug A built film's track slug.
 * @return {string[]} The journey data that film loads.
 */
function filmDataFiles(slug) {
    return [
        // journey-loader.js loadJourneyByTrackId(): base journey + enriched moments
        // (the reduced-motion variants under phase42/reduced/ are not shipped; the loader falls back).
        `public/assets/journeys/phase42/${slug}.json`,
        `public/assets/journeys/phase42/${slug}-enriched-moments.json`,
        // experience.js fetchShotDirectorBeatGrid(): the shot director's beat grid; phases.json ships
        // alongside it as the static export did.
        `public/assets/journeys/analysis/${slug}/beats.json`,
        `public/assets/journeys/analysis/${slug}/phases.json`
    ];
}

/** Project-relative files and folders (copied recursively) the site loads at runtime. Audio is separate. */
export const RUNTIME_ASSETS = Object.freeze([
    // shell.js @font-face (and the font preloads in index.html)
    'assets/fonts',
    // experience.js DRACOLoader decoder path
    'public/vendor/draco',
    // hero relic GLBs (hero-model-urls.js / experience.js): the Blender chamber relic (the Track 5
    // journey's modelUrl), the Meshy relic (the code-side default; ?relic=meshy forces it) and the
    // cleaned textured relic (?textured=1)
    `${RELIC_DIR}/track5-relic-blender-chamber-optimized.glb`,
    `${RELIC_DIR}/track5-relic-generated-optimized.glb`,
    `${RELIC_DIR}/track5-relic-textured-clean.glb`,
    // Track 1 Stage trial (?proposal=stage&setting=reliquary): init awaits the drape GLB before audio
    // setup; track1-stage-materials.js loads the PBR textures
    'public/assets/models/track1-stage',
    'public/assets/materials/track1-stage',
    ...BUILT_FILM_TRACKS.flatMap((track) => filmDataFiles(track.slug))
]);

/** The built films' audio, in the gitignored audio/ folder (scripts/import-audio.mjs fills it). */
export const RUNTIME_AUDIO = Object.freeze(BUILT_FILM_TRACKS.map((track) => `${AUDIO_DIR}/${track.audioFile}`));

/**
 * @param {string} absDir
 * @param {string} relDir
 * @return {string[]} Project-relative paths of the files under the folder, dotfiles skipped.
 */
function listFiles(absDir, relDir) {
    return readdirSync(absDir, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const rel = `${relDir}/${entry.name}`;
            return entry.isDirectory() ? listFiles(join(absDir, entry.name), rel) : [rel];
        });
}

/**
 * Expand RUNTIME_ASSETS (folders included) into files.
 *
 * @param {string} root Project root.
 * @return {{files: string[], missing: string[]}} Project-relative files to ship, and listed entries
 *                                                that do not exist.
 */
export function resolveRuntimeAssets(root) {
    const files = [];
    const missing = [];
    for (const rel of RUNTIME_ASSETS) {
        const abs = join(root, rel);
        if (!existsSync(abs)) {
            missing.push(rel);
        } else if (statSync(abs).isDirectory()) {
            files.push(...listFiles(abs, rel));
        } else {
            files.push(rel);
        }
    }
    return { files, missing };
}

/**
 * @param {string} root Project root.
 * @return {{present: string[], missing: string[]}} RUNTIME_AUDIO split by whether the file exists.
 */
export function resolveRuntimeAudio(root) {
    const present = RUNTIME_AUDIO.filter((rel) => existsSync(join(root, rel)));
    const missing = RUNTIME_AUDIO.filter((rel) => !present.includes(rel));
    return { present, missing };
}

/**
 * Copy project-relative files from root into outDir, keeping their relative paths.
 *
 * @param {string}   root
 * @param {string}   outDir
 * @param {string[]} files
 * @return {number} Bytes copied.
 */
export function copyFiles(root, outDir, files) {
    let bytes = 0;
    for (const rel of files) {
        const dest = join(outDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(join(root, rel), dest);
        bytes += statSync(dest).size;
    }
    return bytes;
}
