#!/usr/bin/env node
/**
 * Deep Audio Analysis Script for Sonoite Theme v2.1
 *
 * Outputs per-feature files for efficient loading:
 * - meta.json (2KB) - metadata, tempo, summary
 * - beats.json - beat grid from Aubio
 * - onsets.json - transient hits from Aubio
 * - phases.json - energy phases for breathing
 * - peaks.json - loudness peaks for moments
 * - timeline.json - full 50ms features (lazy load)
 * - midrange.json - mid-range for Monolith (Track 6 only)
 *
 * Usage: node scripts/deep-audio-analysis.cjs [track1|track2|...|track7|all]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Audio file paths
// Default assumes the theme sits in a WordPress install (wp-content/themes/<theme>).
const AUDIO_DIR = process.env.SONOITE_UPLOADS_DIR || path.resolve(__dirname, '../../../uploads/2025/08');
const OUTPUT_BASE = path.join(__dirname, '../public/assets/journeys/analysis');

const TRACKS = {
  track1: { file: '01-sonoite.mp3', slug: 'sonoite' },
  track2: { file: '02-Paralisia-do-sono.mp3', slug: 'paralisia-do-sono' },
  track3: { file: '03-O-livro-azul.mp3', slug: 'o-livro-azul' },
  track4: { file: '04-Horas-mortas.mp3', slug: 'horas-mortas' },
  track5: { file: '05-Nao-querer-nada.mp3', slug: 'nao-querer-nada' },
  track6: { file: '06-O-Filho.mp3', slug: 'o-filho' },
  track7: { file: '07-Homem-educado.mp3', slug: 'homem-educado' }
};

// Analysis parameters
const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;
const SAMPLE_RATE = 44100;
const SEGMENT_DURATION_MS = 50;

/**
 * Run Aubio tempo detection
 */
function getAubioBPM(inputPath) {
  console.log('  [Aubio] Detecting tempo...');
  try {
    const result = execSync(`aubio tempo "${inputPath}" 2>/dev/null`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    // Aubio outputs beat times, last line often has BPM
    const bpmMatch = result.match(/(\d+\.?\d*)\s*bpm/i);

    // If no explicit BPM, calculate from beat intervals
    const beatTimes = lines.map(l => parseFloat(l)).filter(t => !isNaN(t));

    if (beatTimes.length > 10) {
      const intervals = [];
      for (let i = 1; i < beatTimes.length; i++) {
        intervals.push(beatTimes[i] - beatTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60 / avgInterval);
      console.log(`  [Aubio] BPM: ${bpm} (from ${beatTimes.length} beats)`);
      return { bpm, confidence: 0.9, beatTimes };
    }

    return { bpm: 0, confidence: 0, beatTimes: [] };
  } catch (e) {
    console.log('  [Aubio] Tempo detection failed, using Meyda fallback');
    return null;
  }
}

/**
 * Run Aubio onset detection
 */
function getAubioOnsets(inputPath) {
  console.log('  [Aubio] Detecting onsets...');
  try {
    // Use multiple onset methods for better coverage
    const methods = ['default', 'energy', 'hfc', 'complex'];
    const allOnsets = new Map();

    for (const method of methods) {
      try {
        const result = execSync(`aubio onset -m ${method} "${inputPath}" 2>/dev/null`, { encoding: 'utf8' });
        const times = result.trim().split('\n').map(l => parseFloat(l)).filter(t => !isNaN(t));
        times.forEach(t => {
          const key = Math.round(t * 20) / 20; // 50ms quantization
          allOnsets.set(key, (allOnsets.get(key) || 0) + 1);
        });
      } catch (e) {
        // Method failed, continue
      }
    }

    // Keep onsets detected by 2+ methods (more reliable)
    const reliableOnsets = Array.from(allOnsets.entries())
      .filter(([_, count]) => count >= 2)
      .map(([time, count]) => ({ time, strength: count / methods.length }))
      .sort((a, b) => a.time - b.time);

    console.log(`  [Aubio] Found ${reliableOnsets.length} reliable onsets`);
    return reliableOnsets;
  } catch (e) {
    console.log('  [Aubio] Onset detection failed');
    return null;
  }
}

/**
 * Convert MP3 to WAV using ffmpeg
 */
function convertToWav(inputPath, outputPath) {
  console.log(`  Converting to WAV...`);
  execSync(`ffmpeg -y -i "${inputPath}" -ar ${SAMPLE_RATE} -ac 1 -f wav "${outputPath}" 2>/dev/null`);
  return outputPath;
}

/**
 * Read WAV file
 */
async function readWavFile(wavPath) {
  const wavDecoder = require('wav-decoder');
  const buffer = fs.readFileSync(wavPath);
  const audioData = await wavDecoder.decode(buffer);
  return {
    sampleRate: audioData.sampleRate,
    samples: audioData.channelData[0],
    duration: audioData.channelData[0].length / audioData.sampleRate
  };
}

/**
 * Extract Meyda features at 50ms intervals
 */
function extractMeydaFeatures(samples, sampleRate) {
  const Meyda = require('meyda');

  const features = [];
  const samplesPerSegment = Math.floor((SEGMENT_DURATION_MS / 1000) * sampleRate);
  const totalSegments = Math.floor(samples.length / samplesPerSegment);

  console.log(`  [Meyda] Extracting features: ${totalSegments} segments @ ${SEGMENT_DURATION_MS}ms`);

  for (let i = 0; i < totalSegments; i++) {
    const start = i * samplesPerSegment;
    let segment = samples.slice(start, start + FRAME_SIZE);

    if (segment.length < FRAME_SIZE) {
      const padded = new Float32Array(FRAME_SIZE);
      padded.set(segment);
      segment = padded;
    }

    try {
      const extracted = Meyda.extract([
        'rms', 'energy', 'spectralCentroid', 'spectralFlatness',
        'spectralRolloff', 'loudness', 'chroma', 'zcr', 'mfcc'
      ], Array.from(segment));

      features.push({
        time: (i * SEGMENT_DURATION_MS) / 1000,
        rms: extracted.rms || 0,
        energy: extracted.energy || 0,
        spectralCentroid: extracted.spectralCentroid || 0,
        spectralFlatness: extracted.spectralFlatness || 0,
        spectralRolloff: extracted.spectralRolloff || 0,
        loudness: extracted.loudness?.total || 0,
        zcr: extracted.zcr || 0,
        chroma: extracted.chroma || new Array(12).fill(0),
        mfcc: extracted.mfcc || new Array(13).fill(0)
      });
    } catch (e) {
      // Skip problematic frames
    }

    if (i % 2000 === 0) {
      process.stdout.write(`\r  [Meyda] Progress: ${Math.round(i / totalSegments * 100)}%`);
    }
  }

  console.log('\r  [Meyda] Progress: 100%');
  return features;
}

/**
 * Identify energy phases
 */
function identifyEnergyPhases(features) {
  console.log('  Identifying energy phases...');

  const windowSize = Math.floor(1000 / SEGMENT_DURATION_MS);
  const smoothedEnergy = [];

  for (let i = 0; i < features.length; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(features.length - 1, i + windowSize); j++) {
      sum += features[j].energy;
      count++;
    }
    smoothedEnergy.push(sum / count);
  }

  const sortedEnergy = [...smoothedEnergy].sort((a, b) => a - b);
  const lowThreshold = sortedEnergy[Math.floor(sortedEnergy.length * 0.25)];
  const highThreshold = sortedEnergy[Math.floor(sortedEnergy.length * 0.75)];

  const phases = [];
  let currentPhase = null;

  for (let i = 0; i < features.length; i++) {
    const energy = smoothedEnergy[i];
    let phaseType = energy <= lowThreshold ? 'silent' : energy >= highThreshold ? 'peak' : 'ambient';

    if (!currentPhase || currentPhase.type !== phaseType) {
      if (currentPhase) {
        currentPhase.endTime = features[i].time;
        currentPhase.duration = Math.round((currentPhase.endTime - currentPhase.startTime) * 100) / 100;
        if (currentPhase.duration >= 0.5) phases.push(currentPhase);
      }
      currentPhase = { type: phaseType, startTime: features[i].time, avgEnergy: energy };
    } else {
      currentPhase.avgEnergy = (currentPhase.avgEnergy + energy) / 2;
    }
  }

  if (currentPhase) {
    currentPhase.endTime = features[features.length - 1].time;
    currentPhase.duration = Math.round((currentPhase.endTime - currentPhase.startTime) * 100) / 100;
    if (currentPhase.duration >= 0.5) phases.push(currentPhase);
  }

  console.log(`  Found ${phases.length} energy phases`);
  return phases;
}

/**
 * Find loudness peaks
 */
function findLoudnessPeaks(features, count = 15) {
  const sorted = [...features].filter(f => f.loudness > 0).sort((a, b) => b.loudness - a.loudness);
  const peaks = [];

  for (const f of sorted) {
    if (peaks.length >= count) break;
    const tooClose = peaks.some(p => Math.abs(p.time - f.time) < 2);
    if (!tooClose) {
      peaks.push({
        time: Math.round(f.time * 100) / 100,
        loudness: Math.round(f.loudness * 100) / 100,
        energy: Math.round(f.energy * 100) / 100
      });
    }
  }

  return peaks.sort((a, b) => a.time - b.time);
}

/**
 * Extract mid-range for Monolith
 */
function extractMidRange(features) {
  return features.filter((_, i) => i % 10 === 0).map(f => {
    const mfcc = f.mfcc || new Array(13).fill(0);
    const midEnergy = (Math.abs(mfcc[2] || 0) + Math.abs(mfcc[3] || 0) +
                       Math.abs(mfcc[4] || 0) + Math.abs(mfcc[5] || 0)) / 4;
    return {
      t: Math.round(f.time * 100) / 100,
      mid: Math.round(midEnergy * 100) / 100,
      centroid: Math.round(f.spectralCentroid)
    };
  });
}

/**
 * Generate beat grid from Aubio or fallback
 */
function generateBeatGrid(aubioResult, duration) {
  if (aubioResult && aubioResult.beatTimes.length > 0) {
    return aubioResult.beatTimes.map((time, i) => ({
      beat: i + 1,
      time: Math.round(time * 1000) / 1000,
      bar: Math.ceil((i + 1) / 4),
      beatInBar: ((i) % 4) + 1
    }));
  }
  return [];
}

/**
 * Write JSON helper
 */
function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  const size = fs.statSync(filepath).size;
  const sizeStr = size > 1024 ? `${Math.round(size / 1024)}KB` : `${size}B`;
  console.log(`    ✓ ${path.basename(filepath)} (${sizeStr})`);
}

/**
 * Main analysis function
 */
async function analyzeTrack(trackKey) {
  const track = TRACKS[trackKey];
  if (!track) {
    console.error(`Unknown track: ${trackKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Analyzing: ${track.slug}`);
  console.log('═'.repeat(60));

  const inputPath = path.join(AUDIO_DIR, track.file);
  const tempWav = `/tmp/${track.slug}.wav`;
  const outputDir = path.join(OUTPUT_BASE, track.slug);

  if (!fs.existsSync(inputPath)) {
    console.error(`  File not found: ${inputPath}`);
    return null;
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Aubio analysis (on MP3 directly)
    const aubioBPM = getAubioBPM(inputPath);
    const aubioOnsets = getAubioOnsets(inputPath);

    // Convert for Meyda
    convertToWav(inputPath, tempWav);

    console.log('  Reading audio data...');
    const audio = await readWavFile(tempWav);
    console.log(`  Duration: ${Math.round(audio.duration)}s`);

    // Meyda setup
    const Meyda = require('meyda');
    Meyda.sampleRate = audio.sampleRate;
    Meyda.bufferSize = FRAME_SIZE;

    // Extract features
    const features = extractMeydaFeatures(audio.samples, audio.sampleRate);

    // Derived data
    const energyPhases = identifyEnergyPhases(features);
    const loudnessPeaks = findLoudnessPeaks(features);
    const beats = generateBeatGrid(aubioBPM, audio.duration);

    // Calculate summary
    const summary = {
      avgLoudness: Math.round(features.reduce((s, f) => s + f.loudness, 0) / features.length * 100) / 100,
      maxLoudness: Math.round(Math.max(...features.map(f => f.loudness)) * 100) / 100,
      avgEnergy: Math.round(features.reduce((s, f) => s + f.energy, 0) / features.length * 100) / 100,
      maxEnergy: Math.round(Math.max(...features.map(f => f.energy)) * 100) / 100,
      silentPhaseCount: energyPhases.filter(p => p.type === 'silent').length,
      peakPhaseCount: energyPhases.filter(p => p.type === 'peak').length,
      ambientPhaseCount: energyPhases.filter(p => p.type === 'ambient').length
    };

    console.log('\n  Writing per-feature files:');

    // 1. meta.json
    writeJSON(path.join(outputDir, 'meta.json'), {
      track: track.slug,
      file: track.file,
      analysisVersion: '2.1-split',
      analysisTimestamp: new Date().toISOString(),
      duration: Math.round(audio.duration * 100) / 100,
      sampleRate: audio.sampleRate,
      segmentIntervalMs: SEGMENT_DURATION_MS,
      totalSegments: features.length,
      tempo: {
        bpm: aubioBPM?.bpm || 0,
        confidence: aubioBPM?.confidence || 0,
        source: aubioBPM ? 'aubio' : 'none'
      },
      summary
    });

    // 2. beats.json
    writeJSON(path.join(outputDir, 'beats.json'), {
      bpm: aubioBPM?.bpm || 0,
      totalBeats: beats.length,
      beats
    });

    // 3. onsets.json
    const onsets = aubioOnsets || [];
    writeJSON(path.join(outputDir, 'onsets.json'), {
      totalOnsets: onsets.length,
      source: aubioOnsets ? 'aubio-multi' : 'none',
      onsets
    });

    // 4. phases.json
    writeJSON(path.join(outputDir, 'phases.json'), {
      totalPhases: energyPhases.length,
      silent: energyPhases.filter(p => p.type === 'silent'),
      ambient: energyPhases.filter(p => p.type === 'ambient'),
      peak: energyPhases.filter(p => p.type === 'peak')
    });

    // 5. peaks.json
    writeJSON(path.join(outputDir, 'peaks.json'), {
      totalPeaks: loudnessPeaks.length,
      peaks: loudnessPeaks
    });

    // 6. timeline.json (downsampled to 500ms for reasonable size)
    const timeline = features.filter((_, i) => i % 10 === 0).map(f => ({
      t: Math.round(f.time * 100) / 100,
      rms: Math.round(f.rms * 1000) / 1000,
      energy: Math.round(f.energy * 100) / 100,
      loudness: Math.round(f.loudness * 100) / 100,
      centroid: Math.round(f.spectralCentroid),
      flatness: Math.round(f.spectralFlatness * 1000) / 1000
    }));
    writeJSON(path.join(outputDir, 'timeline.json'), {
      intervalMs: 500,
      totalPoints: timeline.length,
      timeline
    });

    // 7. midrange.json (all tracks, useful for various effects)
    const midrange = extractMidRange(features);
    writeJSON(path.join(outputDir, 'midrange.json'), {
      intervalMs: 500,
      totalPoints: midrange.length,
      description: 'Mid-range frequency energy for glow/emission effects',
      midrange
    });

    // 8. chroma.json (for harmonic/pitch-based effects)
    const chroma = features.filter((_, i) => i % 20 === 0).map(f => ({
      t: Math.round(f.time * 100) / 100,
      chroma: f.chroma.map(c => Math.round(c * 100) / 100)
    }));
    writeJSON(path.join(outputDir, 'chroma.json'), {
      intervalMs: 1000,
      totalPoints: chroma.length,
      description: 'Chromagram (pitch class energy) for harmonic-based effects',
      chroma
    });

    // Cleanup
    fs.unlinkSync(tempWav);

    console.log(`\n  ✓ Analysis complete: ${outputDir}`);
    return { slug: track.slug, outputDir };

  } catch (error) {
    console.error(`  Error: ${error.message}`);
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    return null;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const trackArg = args[0] || 'all';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Deep Audio Analysis v2.1 - Per-Feature Output            ║');
  console.log('║  Aubio + Meyda • 50ms resolution • Split files            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check dependencies
  try {
    require('meyda');
    require('wav-decoder');
  } catch (e) {
    console.error('Missing dependencies. Run: npm install meyda wav-decoder');
    process.exit(1);
  }

  // Check tools
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    execSync('which aubio', { stdio: 'ignore' });
    console.log('✓ Tools: ffmpeg, aubio\n');
  } catch (e) {
    console.error('Missing tools. Install: brew install ffmpeg aubio');
    process.exit(1);
  }

  const startTime = Date.now();

  if (trackArg === 'all') {
    for (const key of Object.keys(TRACKS)) {
      await analyzeTrack(key);
    }
  } else if (TRACKS[trackArg]) {
    await analyzeTrack(trackArg);
  } else {
    console.error(`Usage: node ${path.basename(process.argv[1])} [track1|track2|...|track7|all]`);
    process.exit(1);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✓ All analysis complete in ${elapsed}s`);
}

main().catch(console.error);
