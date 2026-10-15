#!/usr/bin/env node
/**
 * Deploy gate: exits 1 unless audio/ holds the MP3s of the three built films (RUNTIME_AUDIO in
 * scripts/runtime-assets.mjs). `npm run build` only warns when they are missing, because the public repo
 * ships no audio; `npm run deploy` runs this first so a silent site is never published.
 *
 * Usage:  node scripts/check-audio.mjs
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRuntimeAudio } from './runtime-assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { present, missing } = resolveRuntimeAudio(ROOT);

if (missing.length) {
    console.error(`\n  ✗ Missing audio for the built films: ${missing.join(', ')}`);
    console.error('    Import the album first: npm run audio:import -- <folder with the album MP3s>\n');
    process.exit(1);
}

console.info(`  ✓ audio present for the built films (${present.join(', ')})`);
