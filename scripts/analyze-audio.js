#!/usr/bin/env node
/**
 * Offline Meyda feature analysis (RMS, energy, spectral centroid/rolloff, loudness, chroma, ZCR) of
 * album masters, with per-segment roll-ups. Writes <slug>.analysis.json into
 * public/assets/journeys/analysis/ by default; the output is authoring reference, not loaded at runtime.
 *
 * Usage:   node scripts/analyze-audio.js --input <file.mp3> [--slug <slug>] [--out <file.json>]
 *          node scripts/analyze-audio.js --config scripts/audio-analysis.config.json [--outputDir <dir>]
 * Run with --help (or no arguments) for the full option list.
 */

import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import audioDecode from 'audio-decode';
import Meyda from 'meyda';

const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_HOP_SIZE = 1024;
const DEFAULT_SEGMENT_DURATION = 4; // seconds
const FEATURE_LIST = [
  'rms',
  'energy',
  'spectralCentroid',
  'spectralRolloff',
  'loudness',
  'chroma',
  'zcr'
];

class RunningStats {
  constructor() {
    this.min = Infinity;
    this.max = -Infinity;
    this.sum = 0;
    this.count = 0;
  }

  push(value) {
    if (!Number.isFinite(value)) return;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
    this.sum += value;
    this.count += 1;
  }

  toJSON() {
    if (this.count === 0) {
      return { count: 0, min: null, max: null, mean: null };
    }
    return {
      count: this.count,
      min: round(this.min),
      max: round(this.max),
      mean: round(this.sum / this.count)
    };
  }
}

class PeakTracker {
  constructor(limit = 5) {
    this.limit = limit;
    this.values = [];
  }

  push(value, time) {
    if (!Number.isFinite(value)) return;
    this.values.push({ value, time });
    this.values.sort((a, b) => b.value - a.value);
    if (this.values.length > this.limit) {
      this.values.length = this.limit;
    }
  }

  toJSON() {
    return this.values.map(({ value, time }) => ({
      value: round(value),
      time: round(time)
    }));
  }
}

function parseArgs(argv) {
  const options = {
    inputs: [],
    bufferSize: DEFAULT_BUFFER_SIZE,
    hopSize: DEFAULT_HOP_SIZE,
    segmentDuration: DEFAULT_SEGMENT_DURATION
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--input':
      case '-i':
        if (next) {
          options.inputs.push(next);
          i += 1;
        }
        break;
      case '--slug':
      case '--track':
        if (next) {
          options.slug = next;
          i += 1;
        }
        break;
      case '--out':
      case '--output':
        if (next) {
          options.output = next;
          i += 1;
        }
        break;
      case '--outputDir':
        if (next) {
          options.outputDir = next;
          i += 1;
        }
        break;
      case '--config':
        if (next) {
          options.config = next;
          i += 1;
        }
        break;
      case '--buffer':
        if (next && !Number.isNaN(Number(next))) {
          options.bufferSize = Number(next);
          i += 1;
        }
        break;
      case '--hop':
        if (next && !Number.isNaN(Number(next))) {
          options.hopSize = Number(next);
          i += 1;
        }
        break;
      case '--segment':
        if (next && !Number.isNaN(Number(next))) {
          options.segmentDuration = Number(next);
          i += 1;
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        break;
    }
  }

  return options;
}

function printUsage() {
  const usage = `Usage:
  node scripts/analyze-audio.js --input path/to/file.mp3 [--slug track-slug] [--out output.json]
  node scripts/analyze-audio.js --config scripts/audio-analysis.config.json [--outputDir public/assets/journeys/analysis]

Options:
  --input, -i       Path to a single audio file (can be repeated)
  --slug, --track   Track identifier to store in the output JSON
  --out, --output   Output path for the generated JSON
  --config          JSON file describing multiple tracks {\"slug\":..., \"file\":...}
  --outputDir       Directory for outputs when using --config or multiple inputs
  --buffer          FFT buffer size (default ${DEFAULT_BUFFER_SIZE})
  --hop             Hop size between frames (default ${DEFAULT_HOP_SIZE})
  --segment         Segment duration in seconds for roll-up averages (default ${DEFAULT_SEGMENT_DURATION})
`;
  console.log(usage);
}

async function analyzeTrack({ filePath, slug, bufferSize, hopSize, segmentDuration }) {
  const absolutePath = path.resolve(filePath);
  if (!fsSync.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const fileBuffer = await fs.readFile(absolutePath);
  const audioBuffer = await audioDecode(fileBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const durationSeconds = audioBuffer.length / sampleRate;

  const monoSignal = mergeToMono(audioBuffer);

  const rmsStats = new RunningStats();
  const energyStats = new RunningStats();
  const centroidStats = new RunningStats();
  const rolloffStats = new RunningStats();
  const zcrStats = new RunningStats();
  const loudnessStats = new RunningStats();

  let loudnessSpecificSums = [];
  let loudnessSpecificMax = [];
  let loudnessSpecificCount = 0;

  const chromaSums = new Array(12).fill(0);
  const chromaMax = new Array(12).fill(0);
  let chromaCount = 0;

  const segments = [];
  const loudnessPeaks = new PeakTracker();
  const centroidPeaks = new PeakTracker();

  let framesAnalyzed = 0;

  for (let position = 0; position + bufferSize <= monoSignal.length; position += hopSize) {
    const frame = monoSignal.subarray(position, position + bufferSize);
    const features = Meyda.extract(FEATURE_LIST, frame, { sampleRate, bufferSize });
    if (!features) continue;

    framesAnalyzed += 1;
    const currentTime = (position / sampleRate);
    const segmentIndex = Math.floor(currentTime / segmentDuration);
    const segment = getSegment(segments, segmentIndex, segmentDuration);

    if (Number.isFinite(features.rms)) {
      rmsStats.push(features.rms);
      segment.rmsSum += features.rms;
    }

    if (Number.isFinite(features.energy)) {
      energyStats.push(features.energy);
      segment.energySum += features.energy;
    }

    if (Number.isFinite(features.spectralCentroid)) {
      centroidStats.push(features.spectralCentroid);
      centroidPeaks.push(features.spectralCentroid, currentTime);
      segment.centroidSum += features.spectralCentroid;
    }

    if (Number.isFinite(features.spectralRolloff)) {
      rolloffStats.push(features.spectralRolloff);
    }

    if (Number.isFinite(features.zcr)) {
      zcrStats.push(features.zcr);
      segment.zcrSum += features.zcr;
    }

    if (features.loudness && Number.isFinite(features.loudness.total)) {
      const total = features.loudness.total;
      loudnessStats.push(total);
      loudnessPeaks.push(total, currentTime);
      segment.loudnessSum += total;

      if (Array.isArray(features.loudness.specific)) {
        if (loudnessSpecificSums.length !== features.loudness.specific.length) {
          loudnessSpecificSums = new Array(features.loudness.specific.length).fill(0);
          loudnessSpecificMax = new Array(features.loudness.specific.length).fill(0);
        }
        features.loudness.specific.forEach((value, index) => {
          if (!Number.isFinite(value)) return;
          loudnessSpecificSums[index] += value;
          loudnessSpecificMax[index] = Math.max(loudnessSpecificMax[index], value);
        });
        loudnessSpecificCount += 1;
      }
    }

    if (Array.isArray(features.chroma)) {
      features.chroma.forEach((value, index) => {
        if (!Number.isFinite(value)) return;
        chromaSums[index] += value;
        chromaMax[index] = Math.max(chromaMax[index], value);
      });
      chromaCount += 1;
    }

    segment.frames += 1;
  }

  const analysis = {
    track: slug,
    file: absolutePath,
    durationSeconds: round(durationSeconds),
    sampleRate,
    frameSize: bufferSize,
    hopSize,
    framesAnalyzed,
    analysisTimestamp: new Date().toISOString(),
    features: {
      rms: rmsStats.toJSON(),
      energy: energyStats.toJSON(),
      spectralCentroid: centroidStats.toJSON(),
      spectralRolloff: rolloffStats.toJSON(),
      zcr: zcrStats.toJSON(),
      loudness: {
        total: loudnessStats.toJSON(),
        specific: summarizeArrayStats(loudnessSpecificSums, loudnessSpecificMax, loudnessSpecificCount)
      },
      chroma: summarizeArrayStats(chromaSums, chromaMax, chromaCount)
    },
    peaks: {
      loudness: loudnessPeaks.toJSON(),
      spectralCentroid: centroidPeaks.toJSON()
    },
    segments: segments
      .filter(Boolean)
      .map(({ index, startTime, endTime, frames, rmsSum, loudnessSum, centroidSum, energySum, zcrSum }) => ({
        index,
        start: round(startTime),
        end: round(endTime),
        frames,
        rms: frames ? round(rmsSum / frames) : null,
        loudness: frames ? round(loudnessSum / frames) : null,
        spectralCentroid: frames ? round(centroidSum / frames) : null,
        energy: frames ? round(energySum / frames) : null,
        zcr: frames ? round(zcrSum / frames) : null
      }))
  };

  return analysis;
}

function summarizeArrayStats(sumArray, maxArray, count) {
  if (!Array.isArray(sumArray) || sumArray.length === 0 || count === 0) {
    return null;
  }
  return {
    mean: sumArray.map((value) => round(value / count)),
    max: maxArray.map((value) => round(value))
  };
}

function getSegment(segments, index, duration) {
  if (!segments[index]) {
    segments[index] = {
      index,
      startTime: index * duration,
      endTime: (index + 1) * duration,
      frames: 0,
      rmsSum: 0,
      loudnessSum: 0,
      centroidSum: 0,
      energySum: 0,
      zcrSum: 0
    };
  }
  return segments[index];
}

function mergeToMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer;
  if (numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  const merged = new Float32Array(length);
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      merged[i] += data[i];
    }
  }
  for (let i = 0; i < length; i += 1) {
    merged[i] /= numberOfChannels;
  }
  return merged;
}

function round(value, precision = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

async function writeAnalysis(outputPath, data) {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
}

function deriveSlug(filePath, fallback) {
  if (fallback) return fallback;
  return path.basename(filePath, path.extname(filePath));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const defaultOutputDir = path.resolve(process.cwd(), 'public/assets/journeys/analysis');
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : defaultOutputDir;

  if (options.config) {
    const configPath = path.resolve(options.config);
    const configContent = await fs.readFile(configPath, 'utf8');
    const entries = JSON.parse(configContent);

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Config file must contain an array of {"file","slug"} entries.');
    }

    for (const entry of entries) {
      const filePath = entry.file;
      if (!filePath) {
        console.warn('Skipping entry without "file" key:', entry);
        continue;
      }
      const slug = deriveSlug(filePath, entry.slug);
      const analysis = await analyzeTrack({
        filePath,
        slug,
        bufferSize: options.bufferSize,
        hopSize: options.hopSize,
        segmentDuration: options.segmentDuration
      });
      const outputPath = entry.output
        ? path.resolve(entry.output)
        : path.join(outputDir, `${slug}.analysis.json`);
      await writeAnalysis(outputPath, analysis);
      console.log(`✔︎ Analyzed ${slug} → ${outputPath}`);
    }
    return;
  }

  if (options.inputs.length === 0) {
    printUsage();
    process.exit(1);
  }

  for (const filePath of options.inputs) {
    const slug = deriveSlug(filePath, options.slug);
    const analysis = await analyzeTrack({
      filePath,
      slug,
      bufferSize: options.bufferSize,
      hopSize: options.hopSize,
      segmentDuration: options.segmentDuration
    });
    const outputPath = options.output
      ? path.resolve(options.output)
      : path.join(outputDir, `${slug}.analysis.json`);
    await writeAnalysis(outputPath, analysis);
    console.log(`✔︎ Analyzed ${slug} → ${outputPath}`);
  }
}

main().catch((error) => {
  console.error('Audio analysis failed:', error);
  process.exit(1);
});
