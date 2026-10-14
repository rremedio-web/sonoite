#!/usr/bin/env node
/**
 * Merge audio analysis outputs (Meyda, Librosa, Essentia) into a single JSON per track.
 *
 * Usage:
 *   node scripts/merge-analysis.js --config scripts/audio-analysis.config.json \
 *     --outputDir public/assets/journeys/analysis/master
 *
 *   node scripts/merge-analysis.js --slug sonoite \
 *     --meyda public/assets/journeys/analysis/sonoite.analysis.json \
 *     --librosa public/assets/journeys/analysis/librosa/sonoite.librosa.json \
 *     --essentia public/assets/journeys/analysis/sonoite.essentia.json
 */

import { promises as fs } from 'fs';
import path from 'path';

function parseArgs(argv) {
  const options = {
    config: null,
    outputDir: 'public/assets/journeys/analysis/master',
    entries: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--config':
        options.config = next;
        i += 1;
        break;
      case '--outputDir':
        options.outputDir = next;
        i += 1;
        break;
      case '--slug': {
        const entry = { slug: next }; i += 1;
        while (i + 1 < argv.length) {
          const key = argv[i + 1];
          const value = argv[i + 2];
          if (!value) break;
          if (['--meyda', '--librosa', '--essentia'].includes(key)) {
            const short = key.replace('--', '');
            entry[short] = value;
            i += 2;
          } else {
            break;
          }
        }
        options.entries.push(entry);
        break;
      }
      default:
        break;
    }
  }

  return options;
}

async function readJson(filePath) {
  if (!filePath) return null;
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠︎ Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

function deriveSlug(filePath, fallback) {
  if (fallback) return fallback;
  const base = path.basename(filePath, path.extname(filePath));
  return base.toLowerCase().replace(/\s+/g, '-');
}

async function gatherEntries(options) {
  const entries = [...options.entries];

  if (options.config) {
    const configPath = path.resolve(options.config);
    const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
    for (const entry of configData) {
      const audioFile = entry.file;
      if (!audioFile) continue;
      const slug = entry.slug || deriveSlug(audioFile);
      const baseDir = path.resolve('public/assets/journeys/analysis');
      entries.push({
        slug,
        meyda: path.join(baseDir, `${slug}.analysis.json`),
        librosa: path.join(baseDir, 'librosa', `${slug}.librosa.json`),
        essentia: path.join(baseDir, `${slug}.essentia.json`)
      });
    }
  }

  if (entries.length === 0) {
    throw new Error('No entries provided. Use --config or --slug with explicit paths.');
  }

  return entries;
}

async function mergeEntry(entry) {
  const { slug, meyda, librosa, essentia } = entry;
  const result = { slug, sources: {} };

  const meydaData = await readJson(meyda);
  if (meydaData) {
    result.sources.meyda = {
      path: meyda,
      summary: {
        duration: meydaData.durationSeconds,
        loudness: meydaData.features?.loudness?.total,
        spectralCentroid: meydaData.features?.spectralCentroid,
        chroma: meydaData.features?.chroma
      },
      raw: meydaData
    };
  }

  const librosaData = await readJson(librosa);
  if (librosaData) {
    result.sources.librosa = {
      path: librosa,
      summary: {
        duration: librosaData.durationSeconds,
        tempo: librosaData.tempo,
        tempoWindows: librosaData.tempoWindows,
        beats: librosaData.beats?.slice(0, 32),
        spectralCentroid: librosaData.features?.spectralCentroid,
        spectralContrast: librosaData.features?.spectralContrast,
        chromaCQT: librosaData.features?.chromaCQT,
        tonnetz: librosaData.features?.tonnetz
      },
      raw: librosaData
    };
  }

  const essentiaData = await readJson(essentia);
  if (essentiaData) {
    result.sources.essentia = {
      path: essentia,
      summary: {
        duration: essentiaData.analysis?.metadata?.duration,
        tempo: essentiaData.analysis?.rhythm?.bpm,
        key: essentiaData.analysis?.tonal?.key_key,
        scale: essentiaData.analysis?.tonal?.key_scale,
        keyStrength: essentiaData.analysis?.tonal?.key_strength
      },
      raw: essentiaData
    };
  }

  return result;
}

async function writeOutput(outputDir, slug, data) {
  const outPath = path.resolve(outputDir, `${slug}.master.json`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`✔︎ Merged analysis for ${slug} → ${outPath}`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const entries = await gatherEntries(options);

    for (const entry of entries) {
      const merged = await mergeEntry(entry);
      await writeOutput(options.outputDir, entry.slug, merged);
    }
  } catch (error) {
    console.error('Merge failed:', error.message);
    process.exit(1);
  }
}

main();
