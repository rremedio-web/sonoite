#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- CLI tool: paths come from the argument and the fixed track list */
/**
 * Copies the album MP3s from a folder into the gitignored `audio/` folder under the normalized names in
 * src/js/site/tracks.js (01-sonoite.mp3 … 07-homem-educado.mp3), which is where the dev server, the
 * build (scripts/runtime-assets.mjs) and the deploy check look for them. Never modifies the source folder.
 *
 * Usage:  node scripts/import-audio.mjs <dir>        (or: npm run audio:import -- <dir>)
 *         e.g. the old WordPress uploads folder wp-content/uploads/2025/08, whose files are named
 *         01-sonoite.mp3, 04-Horas-mortas.mp3, 05-Nao-querer-nada.mp3, …
 *
 * A source file matches a track when its name, lower-cased with accents and punctuation folded to
 * dashes, equals the normalized name ("04 - Horas mortas.mp3" → 04-horas-mortas), or starts with the
 * track number and contains the slug. Exits 1 when the folder is missing or no track matched.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALBUM_TRACKS, AUDIO_DIR, BUILT_FILM_TRACKS } from '../src/js/site/tracks.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} name
 * @return {string} Lower-case, accent-free, dash-separated stem without the .mp3 extension.
 */
function normalizeAudioName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // drop combining accents left by NFD
        .toLowerCase()
        .replace(/\.mp3$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * @param {Object}   track      ALBUM_TRACKS entry.
 * @param {string[]} candidates MP3 file names in the source folder.
 * @return {string|null} The best-matching file name.
 */
function matchTrack(track, candidates) {
    const target = normalizeAudioName(track.audioFile);
    const prefix = `${String(track.order).padStart(2, '0')}-`;
    const exact = candidates.find((name) => normalizeAudioName(name) === target);
    if (exact) {
        return exact;
    }
    return candidates.find((name) => {
        const stem = normalizeAudioName(name);
        return stem.startsWith(prefix) && stem.includes(track.slug);
    }) || null;
}

const sourceArg = process.argv[2];
const USAGE = 'Usage: node scripts/import-audio.mjs <dir with the album MP3s>   (npm run audio:import -- <dir>)';
if (sourceArg === '--help' || sourceArg === '-h') {
    console.info(USAGE);
    process.exit(0);
}
if (!sourceArg) {
    console.error(USAGE);
    process.exit(1);
}

const sourceDir = resolve(process.cwd(), sourceArg);
if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    console.error(`\n  ✗ Not a folder: ${sourceDir}\n`);
    process.exit(1);
}

const candidates = readdirSync(sourceDir)
    .filter((name) => /\.mp3$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
const destDir = join(ROOT, AUDIO_DIR);
mkdirSync(destDir, { recursive: true });

console.info(`\nImporting album audio from ${sourceDir}\n`);
const missing = [];
let copied = 0;
for (const track of ALBUM_TRACKS) {
    const match = matchTrack(track, candidates);
    if (!match) {
        missing.push(track);
        console.warn(`  ! no MP3 found for ${String(track.order).padStart(2, '0')} ${track.slug}`);
        continue;
    }
    const src = join(sourceDir, match);
    const dest = join(destDir, track.audioFile);
    copyFileSync(src, dest);
    copied += 1;
    const mb = (statSync(dest).size / 1048576).toFixed(2);
    console.info(`  + ${`${AUDIO_DIR}/${track.audioFile}`.padEnd(34)} ${mb.padStart(6)} MB  (${match})`);
}

if (!copied) {
    console.error(`\n  ✗ No album MP3s matched in ${sourceDir}\n`);
    process.exit(1);
}

const missingFilms = BUILT_FILM_TRACKS.filter((film) => missing.some((track) => track.slug === film.slug));
console.info(`\n  ${copied}/${ALBUM_TRACKS.length} tracks copied to ${AUDIO_DIR}/`);
if (missingFilms.length) {
    console.warn(`  ! missing audio for built film(s): ${missingFilms.map((film) => film.slug).join(', ')} — the deploy check will fail`);
}
console.info('');
