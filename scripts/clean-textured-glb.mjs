#!/usr/bin/env node
/**
 * Offline GLB baseColor degold pass — decodes baseColor JPEGs, drains baked
 * yellow/gold while preserving luminance detail, optionally despeckles dark noise,
 * and writes a new GLB plus PNG previews. Never modifies the input file.
 *
 * Usage:
 *   node scripts/clean-textured-glb.mjs --in model.glb [--out model-clean.glb]
 */

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { DEFAULT_DEGOLD_OPTIONS, degoldRgbBuffer } from './lib/texture-degold.mjs';

const THEME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

/**
 * @param {string} flag
 * @param {string|null} fallback
 * @return {string|null}
 */
function argValue(flag, fallback = null) {
    const index = args.indexOf(flag);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

/**
 * @param {string} flag
 * @return {boolean}
 */
function argPresent(flag) {
    return args.includes(flag);
}

/**
 * @param {string} message
 * @return {never}
 */
function fail(message) {
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
}

/**
 * @param {string} value
 * @param {string} label
 * @return {number}
 */
function parseNumber(value, label) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        fail(`Invalid ${label}: ${value}`);
    }
    return parsed;
}

/**
 * @param {number} bytes
 * @return {string}
 */
function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KiB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

/**
 * @param {[number, number, number]} rgb
 * @return {string}
 */
function formatRgb(rgb) {
    return `[${rgb.map((channel) => channel.toFixed(1)).join(', ')}]`;
}

/**
 * @param {import('@gltf-transform/core').Texture} texture
 * @return {string}
 */
function textureSlug(texture) {
    const rawName = texture.getName() || 'baseColor';
    return rawName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'baseColor';
}

/**
 * @param {Uint8Array} imageBytes
 * @param {string} outputPath
 * @param {number} maxEdge
 * @return {Promise<void>}
 */
async function writePreviewScaled(imageBytes, outputPath, maxEdge) {
    await sharp(imageBytes)
        .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toFile(outputPath);
}

/**
 * @param {Uint8Array} imageBytes
 * @param {number} width
 * @param {number} height
 * @param {string} outputPath
 * @return {Promise<void>}
 */
async function writePreviewCrop(imageBytes, width, height, outputPath) {
    const cropSize = 512;
    const left = Math.max(0, Math.floor((width - cropSize) / 2));
    const top = Math.max(0, Math.floor((height - cropSize) / 2));
    const extractWidth = Math.min(cropSize, width - left);
    const extractHeight = Math.min(cropSize, height - top);

    await sharp(imageBytes, { raw: { width, height, channels: 3 } })
        .extract({ left, top, width: extractWidth, height: extractHeight })
        .png()
        .toFile(outputPath);
}

const inPath = argValue('--in');
if (!inPath) {
    fail('Missing required flag: --in <path.glb>');
}

const resolvedIn = resolve(THEME_ROOT, inPath);
if (!existsSync(resolvedIn)) {
    fail(`Input GLB not found: ${resolvedIn}`);
}

const defaultOut = resolvedIn.replace(/\.glb$/i, '-clean.glb');
const outArg = argValue('--out');
const resolvedOut = outArg ? resolve(THEME_ROOT, outArg) : defaultOut;
const previewDir = resolve(THEME_ROOT, argValue('--preview-dir', 'docs/qa/textured-degold-2026-07-26/'));

if (resolve(resolvedIn) === resolve(resolvedOut)) {
    fail('Output path must differ from input path — refusing to overwrite the source GLB.');
}

const degoldOptions = {
    ...DEFAULT_DEGOLD_OPTIONS,
    hueMin: argPresent('--hue-min') ? parseNumber(argValue('--hue-min'), '--hue-min') : DEFAULT_DEGOLD_OPTIONS.hueMin,
    hueMax: argPresent('--hue-max') ? parseNumber(argValue('--hue-max'), '--hue-max') : DEFAULT_DEGOLD_OPTIONS.hueMax,
    hueFeather: argPresent('--hue-feather') ? parseNumber(argValue('--hue-feather'), '--hue-feather') : DEFAULT_DEGOLD_OPTIONS.hueFeather,
    strength: argPresent('--strength') ? parseNumber(argValue('--strength'), '--strength') : DEFAULT_DEGOLD_OPTIONS.strength,
    satThreshold: argPresent('--sat-threshold') ? parseNumber(argValue('--sat-threshold'), '--sat-threshold') : DEFAULT_DEGOLD_OPTIONS.satThreshold,
    despeckle: !argPresent('--no-despeckle'),
    speckleLumaDrop: argPresent('--speckle-drop') ? parseNumber(argValue('--speckle-drop'), '--speckle-drop') : DEFAULT_DEGOLD_OPTIONS.speckleLumaDrop,
    speckleWindow: argPresent('--speckle-window') ? parseNumber(argValue('--speckle-window'), '--speckle-window') : DEFAULT_DEGOLD_OPTIONS.speckleWindow
};
const jpegQuality = argPresent('--jpeg-quality')
    ? parseNumber(argValue('--jpeg-quality'), '--jpeg-quality')
    : 90;

mkdirSync(dirname(resolvedOut), { recursive: true });
mkdirSync(previewDir, { recursive: true });

const inputSize = statSync(resolvedIn).size;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(resolvedIn);
const root = document.getRoot();
const baseColorTextures = new Map();

for (const material of root.listMaterials()) {
    const texture = material.getBaseColorTexture();
    if (texture) {
        baseColorTextures.set(texture, texture);
    }
}

if (baseColorTextures.size === 0) {
    fail('No baseColorTexture found on any material.');
}

console.log(`Input:  ${resolvedIn} (${formatBytes(inputSize)})`);
console.log(`Output: ${resolvedOut}`);
console.log(`Preview dir: ${previewDir}`);
console.log('');

for (const texture of baseColorTextures.values()) {
    const imageBytes = texture.getImage();
    if (!imageBytes || imageBytes.length === 0) {
        fail(`Texture "${texture.getName() || 'unnamed'}" has no embedded image data.`);
    }

    const decoded = await sharp(imageBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const width = decoded.info.width;
    const height = decoded.info.height;
    const beforeBuffer = new Uint8Array(decoded.data);
    const workingBuffer = new Uint8Array(beforeBuffer);
    const slug = textureSlug(texture);

    const stats = degoldRgbBuffer(workingBuffer, width, height, degoldOptions);

    const afterJpeg = await sharp(workingBuffer, {
        raw: { width, height, channels: 3 }
    })
        .jpeg({ quality: jpegQuality })
        .toBuffer();

    texture.setImage(new Uint8Array(afterJpeg));
    texture.setMimeType('image/jpeg');

    const beforePngPath = join(previewDir, `${slug}-before.png`);
    const afterPngPath = join(previewDir, `${slug}-after.png`);
    const beforeCropPath = join(previewDir, `${slug}-crop-before.png`);
    const afterCropPath = join(previewDir, `${slug}-crop-after.png`);

    await writePreviewScaled(imageBytes, beforePngPath, 1024);
    await writePreviewScaled(afterJpeg, afterPngPath, 1024);
    await writePreviewCrop(beforeBuffer, width, height, beforeCropPath);
    await writePreviewCrop(workingBuffer, width, height, afterCropPath);

    const desaturatedPct = ((stats.desaturatedPixels / stats.pixels) * 100).toFixed(2);
    const despeckledPct = ((stats.despeckledPixels / stats.pixels) * 100).toFixed(2);

    console.log(`Texture: ${texture.getName() || slug}`);
    console.log(`  Dimensions: ${width}x${height} (${stats.pixels.toLocaleString()} px)`);
    console.log(`  Desaturated: ${desaturatedPct}% (${stats.desaturatedPixels.toLocaleString()} px)`);
    console.log(`  Despeckled: ${despeckledPct}% (${stats.despeckledPixels.toLocaleString()} px)`);
    console.log(`  Mean RGB: ${formatRgb(stats.meanBefore)} -> ${formatRgb(stats.meanAfter)}`);
    console.log('  Previews:');
    console.log(`    ${beforePngPath}`);
    console.log(`    ${afterPngPath}`);
    console.log(`    ${beforeCropPath}`);
    console.log(`    ${afterCropPath}`);
    console.log('');
}

await io.write(resolvedOut, document);
const outputSize = statSync(resolvedOut).size;

console.log(`GLB size: ${formatBytes(inputSize)} -> ${formatBytes(outputSize)}`);
console.log(`Wrote ${resolvedOut}`);
