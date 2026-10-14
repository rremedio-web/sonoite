#!/usr/bin/env node
/**
 * Static export of the Path B prototype — no WordPress, no PHP, no database.
 *
 * Ships a three-track album package (sonoite, horas-mortas, nao-querer-nada) with
 * clean entry at Track 1 and ?track= switching at runtime.
 *
 * Usage:  node scripts/build-static-prototype.mjs [--out dist-static] [--relic blender|meshy]
 *             [--uploads <dir with the 01-/04-/05- album MP3s>]
 *         --uploads falls back to $SONOITE_UPLOADS_DIR, then ../../uploads/2025/08 (theme inside
 *         wp-content/themes/). --relic picks the relic GLB served at /; the other goes to /b/.
 * Then:   npx vercel deploy --prod <out>     (or drag the folder onto netlify.com/drop)
 *
 * Run `npm run build` first — this copies whatever is currently in dist/
 * (`npm run export:static` does both).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, statSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const THEME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Default assumes the theme sits in a WordPress install (wp-content/themes/<theme>).
const DEFAULT_UPLOADS_DIR = process.env.SONOITE_UPLOADS_DIR || resolve(THEME_ROOT, '../../uploads/2025/08');

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT = resolve(THEME_ROOT, argValue('--out', 'dist-static'));
const RELIC = argValue('--relic', 'blender');
const UPLOADS_DIR = argValue('--uploads', DEFAULT_UPLOADS_DIR);

const fail = (msg) => {
    console.error(`\n  ✗ ${msg}\n`);
    process.exit(1);
};

const STATIC_TRACKS = [
    {
        id: 1,
        title: 'Sonoite',
        slug: 'sonoite',
        order: 1,
        duration: '08:59',
        uploadPattern: /^01-.*\.mp3$/i,
        audioDest: 'audio/01-sonoite.mp3'
    },
    {
        id: 4,
        title: 'Horas mortas',
        slug: 'horas-mortas',
        order: 4,
        duration: '06:31',
        uploadPattern: /^04-.*horas-mortas.*\.mp3$/i,
        audioDest: 'audio/04-horas-mortas.mp3'
    },
    {
        id: 5,
        title: 'Não querer nada',
        slug: 'nao-querer-nada',
        order: 5,
        duration: '09:24',
        uploadPattern: /^05-.*nao-querer-nada.*\.mp3$/i,
        audioDest: 'audio/05-nao-querer-nada.mp3'
    }
];

const TRACK_STATIC_ASSETS = {
    'sonoite': {
        journey: 'public/assets/journeys/phase42/sonoite.json',
        enriched: 'public/assets/journeys/phase42/sonoite-enriched-moments.json',
        beats: 'public/assets/journeys/analysis/sonoite/beats.json',
        phases: 'public/assets/journeys/analysis/sonoite/phases.json'
    },
    'horas-mortas': {
        journey: 'public/assets/journeys/phase42/horas-mortas.json',
        enriched: 'public/assets/journeys/phase42/horas-mortas-enriched-moments.json',
        beats: 'public/assets/journeys/analysis/horas-mortas/beats.json',
        phases: 'public/assets/journeys/analysis/horas-mortas/phases.json'
    },
    'nao-querer-nada': {
        journey: 'public/assets/journeys/phase42/nao-querer-nada.json',
        enriched: 'public/assets/journeys/phase42/nao-querer-nada-enriched-moments.json',
        beats: 'public/assets/journeys/analysis/nao-querer-nada/beats.json',
        phases: 'public/assets/journeys/analysis/nao-querer-nada/phases.json'
    }
};

const resolveUploadMp3 = (pattern) => {
    if (!existsSync(UPLOADS_DIR)) {
        return null;
    }
    const match = readdirSync(UPLOADS_DIR)
        .filter((name) => pattern.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))[0];
    return match ? join(UPLOADS_DIR, match) : null;
};

// --- 1. Resolve the hashed bundles from the Vite manifest --------------------
const manifestPath = join(THEME_ROOT, 'dist/.vite/manifest.json');
if (!existsSync(manifestPath)) {
    fail('dist/.vite/manifest.json missing — run `npm run build` first.');
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const entryFor = (needle) => {
    const hit = Object.values(manifest).find((e) => e.file && e.file.includes(needle));
    return hit ? hit.file : null;
};
const chunkFor = (needle) => {
    const hit = Object.values(manifest).find((e) => typeof e.file === 'string' && e.file.includes(needle));
    return hit ? hit.file : null;
};

const threeVendor = chunkFor('three-vendor');
const audioCore = chunkFor('audio-core');
const prototypeBundle = entryFor('prototype');

if (!threeVendor || !audioCore || !prototypeBundle) {
    fail(`Could not resolve bundles (three-vendor=${threeVendor}, audio-core=${audioCore}, prototype=${prototypeBundle}).`);
}

// --- 2. Lay out the output tree ---------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const copy = (from, to) => {
    const src = join(THEME_ROOT, from);
    if (!existsSync(src)) {
        console.warn(`  ! skipped (missing): ${from}`);
        return 0;
    }
    const dest = join(OUT, to);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    const size = statSync(src).isDirectory()
        ? readdirSync(src, { recursive: true }).reduce((n, f) => {
            const p = join(src, String(f));
            return n + (existsSync(p) && statSync(p).isFile() ? statSync(p).size : 0);
        }, 0)
        : statSync(src).size;
    console.log(`  + ${to.padEnd(58)} ${(size / 1048576).toFixed(2)} MB`);
    return size;
};

console.log('\nStatic prototype export (three-track album)\n');
let bytes = 0;

const closure = new Set();
const walk = (key, depth = 0) => {
    if (!key || depth > 24) { return; }
    const node = manifest[key]
        || Object.entries(manifest).find(([, v]) => v.file === key)?.[1];
    if (!node || closure.has(node.file)) { return; }
    closure.add(node.file);
    for (const dep of [...(node.imports || []), ...(node.dynamicImports || [])]) {
        walk(dep, depth + 1);
    }
};
for (const [key, entry] of Object.entries(manifest)) {
    if ([threeVendor, audioCore, prototypeBundle].includes(entry.file)) {
        walk(key);
    }
}
for (const file of closure) {
    bytes += copy(`dist/${file}`, `dist/${file}`);
}

const DEFAULT_ENTRY_SLUG = 'sonoite';
const PRELOAD_DATA = [
    TRACK_STATIC_ASSETS[DEFAULT_ENTRY_SLUG].journey,
    TRACK_STATIC_ASSETS[DEFAULT_ENTRY_SLUG].beats
];
const preloadModuleFiles = [...closure]
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => {
        const rank = (name) => {
            if (name.includes('three-vendor')) { return 0; }
            if (name.includes('audio-core')) { return 1; }
            if (name.includes('prototype')) { return 2; }
            return 3;
        };
        return rank(a) - rank(b) || a.localeCompare(b);
    });

bytes += copy('public/vendor/draco', 'public/vendor/draco');
bytes += copy('assets/fonts', 'assets/fonts');

for (const assets of Object.values(TRACK_STATIC_ASSETS)) {
    for (const rel of Object.values(assets)) {
        bytes += copy(rel, rel);
    }
}

const RELIC_FILES = {
    blender: 'track5-relic-blender-chamber-optimized.glb',
    meshy: 'track5-relic-generated-optimized.glb'
};
const SHIPPED_MODELS = [
    ...Object.values(RELIC_FILES),
    'track5-relic-textured-clean.glb'
];
for (const file of SHIPPED_MODELS) {
    bytes += copy(`public/assets/models/track5-poc/optimized/${file}`, `public/assets/models/track5-poc/optimized/${file}`);
}
// Track 1 Stage trial (?proposal=stage&setting=reliquary): init awaits the drape GLB before audio setup.
bytes += copy('public/assets/models/track1-stage', 'public/assets/models/track1-stage');
bytes += copy('public/assets/materials/track1-stage', 'public/assets/materials/track1-stage');

const resolvedAudio = [];
for (const track of STATIC_TRACKS) {
    const src = resolveUploadMp3(track.uploadPattern);
    if (!src) {
        console.warn(`  ! audio not found for ${track.slug} in ${UPLOADS_DIR} — pass --uploads <dir>`);
        continue;
    }
    const dest = join(OUT, track.audioDest);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    const size = statSync(src).size;
    bytes += size;
    resolvedAudio.push({ ...track, src });
    console.log(`  + ${track.audioDest.padEnd(58)} ${(size / 1048576).toFixed(2)} MB  (${basename(src)})`);
}

if (!resolvedAudio.length) {
    fail(`No audio files resolved from ${UPLOADS_DIR}`);
}

// --- 3. Emit entry pages -----------------------------------------------------
const pageHtml = (relicKey, depth) => {
    const up = '../'.repeat(depth);
    const asset = (rel) => `${up}${rel}`;
    const primaryRelicFile = RELIC_FILES[relicKey] || RELIC_FILES.blender;
    const modulePreloads = preloadModuleFiles
        .map((file) => `<link rel="modulepreload" href="${asset(`dist/${file}`)}">`)
        .join('\n');
    const dataPreloads = PRELOAD_DATA
        .map((rel) => `<link rel="preload" href="${asset(rel)}" as="fetch" crossorigin>`)
        .join('\n');
    const modelPreload = `<link rel="preload" href="${asset(`public/assets/models/track5-poc/optimized/${primaryRelicFile}`)}" as="fetch" crossorigin>`;
    const fontPreloads = [
        `<link rel="preload" href="${asset('assets/fonts/cormorant-garamond-latin.woff2')}" as="font" type="font/woff2" crossorigin>`,
        `<link rel="preload" href="${asset('assets/fonts/ibm-plex-mono-latin.woff2')}" as="font" type="font/woff2" crossorigin>`
    ].join('\n');
    const entryTrack = STATIC_TRACKS[0];
    const entryTitle = entryTrack?.title || 'Sonoite';
    const entryTrackLabel = entryTrack?.order ? `Track ${String(entryTrack.order).padStart(2, '0')}` : '';
    const firstPaintLine = entryTrackLabel ? `${entryTitle} · ${entryTrackLabel}` : entryTitle;
    const tracksPayload = STATIC_TRACKS.map((track) => {
        const audioRel = track.audioDest;
        return `    {
      id: ${track.id},
      title: ${JSON.stringify(track.title)},
      content: "",
      audio_url: new URL("${up}${audioRel}", location.href).href,
      duration: ${JSON.stringify(track.duration)},
      order: ${track.order},
      slug: ${JSON.stringify(track.slug)}
    }`;
    }).join(',\n');

    return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Sonoite | ${entryTitle}</title>
<link rel="icon" href="data:,">
${fontPreloads}
${modulePreloads}
${dataPreloads}
${modelPreload}
<style>
  html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}
  #sonoite-prototype-root{position:fixed;inset:0;overflow:hidden;background:#000;color:rgba(240,236,230,.9)}
  .prototype-first-paint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
  .prototype-first-paint-line{margin:0;max-width:min(92vw,720px);padding:0 24px;font-family:'Cormorant Garamond','Times New Roman',serif;font-size:clamp(20px,3.2vw,34px);letter-spacing:.12em;text-align:center;color:rgba(240,236,230,.9)}
  #sonoite-static-loader{position:fixed;inset:0;display:grid;place-items:center;background:#000;pointer-events:none;z-index:9999;opacity:1;transition:opacity 420ms ease}
  #sonoite-static-loader.is-ready{opacity:0}
</style>
</head>
<body>
<noscript>
  <div style="position:fixed;inset:0;display:grid;place-items:center;background:#000;color:rgba(240,236,230,.9);font:400 clamp(20px,3.2vw,34px)/1.4 'Cormorant Garamond','Times New Roman',serif;letter-spacing:.12em;text-align:center;padding:24px;">
    <div>
      <p style="margin:0 0 12px;">Sonoite</p>
      <p style="margin:0;font-size:14px;letter-spacing:.18em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;color:rgba(240,236,230,.64);">Enable JavaScript to enter the room.</p>
    </div>
  </div>
</noscript>
<div id="sonoite-static-loader" aria-live="polite" aria-busy="true"></div>
<div id="sonoite-prototype-root" aria-label="Sonoite album experience">
  <div class="prototype-first-paint" aria-hidden="true">
    <p class="prototype-first-paint-line">${firstPaintLine}</p>
  </div>
</div>
<script>
window.__sonoiteStaticLoader = {
  setStatus() {},
  dismiss() {
    var root = document.getElementById('sonoite-static-loader');
    if (!root) { return; }
    root.classList.add('is-ready');
    window.setTimeout(function () { root.remove(); }, 480);
  }
};
</script>
<script>
window.sonoiteData = {
  tracks: [
${tracksPayload}
  ],
  themeUrl: new URL("${up || '.'}", location.href).href.replace(/\\/+$/, ""),
  relic: "${relicKey}",
  version: "static",
  isSecure: location.protocol === "https:",
  isDebug: false,
  audioConfig: {
    maxFileSize: 52428800,
    allowedMimeTypes: ["audio/mpeg","audio/wav","audio/ogg","audio/mp4","audio/x-m4a","audio/flac","audio/aac"],
    maxVolume: 1.0,
    timeoutDuration: 30000,
    analysisTargetFps: 24,
    enableAdvancedAnalysis: false
  }
};
</script>
<script type="module" src="${up}dist/${threeVendor}"></script>
<script type="module" src="${up}dist/${audioCore}"></script>
<script type="module" src="${up}dist/${prototypeBundle}"></script>
</body>
</html>
`;
};

const primaryRelic = RELIC === 'meshy' ? 'meshy' : 'blender';
const otherRelic = primaryRelic === 'blender' ? 'meshy' : 'blender';
writeFileSync(join(OUT, 'index.html'), pageHtml(primaryRelic, 0));
mkdirSync(join(OUT, 'b'), { recursive: true });
writeFileSync(join(OUT, 'b/index.html'), pageHtml(otherRelic, 1));
console.log(`  + ${'index.html'.padEnd(58)} /     -> ${primaryRelic} relic, entry track ${DEFAULT_ENTRY_SLUG}`);
console.log(`  + ${'b/index.html'.padEnd(58)} /b/   -> ${otherRelic} relic`);

writeFileSync(join(OUT, 'vercel.json'), JSON.stringify({
    headers: [
        { source: '/dist/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/public/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/audio/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
        { source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }
    ]
}, null, 2));
writeFileSync(join(OUT, '_headers'), [
    '/*',
    '  X-Robots-Tag: noindex, nofollow',
    '/dist/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/public/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/audio/*',
    '  Cache-Control: public, max-age=604800, stale-while-revalidate=86400',
    ''
].join('\n'));

console.log(`\n  total ${(bytes / 1048576).toFixed(1)} MB → ${OUT}`);
console.log(`  default entry: ${DEFAULT_ENTRY_SLUG} (sonoite-cinema) — ?track= switches chamber`);
console.log(`  default relic: ${RELIC}  (?relic=meshy still switches at runtime)`);
console.log(`  two clean URLs after deploy:  /  (${primaryRelic})   and   /b  (${otherRelic})`);
console.log('\n  EASIEST   drag this folder onto  https://app.netlify.com/drop');
console.log('  preview   npx serve ' + OUT);
console.log('  vercel    npx vercel deploy --prod ' + OUT + '\n');
