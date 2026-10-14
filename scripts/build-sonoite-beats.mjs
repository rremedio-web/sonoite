#!/usr/bin/env node
/**
 * Materialize Track 1 "Sonoite"'s authored 140 BPM beat grid.
 *
 * Aubio returned zero confidence for this track, so the authored grid is the
 * timing authority. The peak report corroborates the known half-beat
 * syncopation without shifting or otherwise deriving the grid from peaks.
 *
 * Usage: node scripts/build-sonoite-beats.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const THEME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANALYSIS_DIR = join(
    THEME_ROOT,
    'public',
    'assets',
    'journeys',
    'analysis',
    'sonoite'
);
const OUTPUT_PATH = join(ANALYSIS_DIR, 'beats.json');
const PEAKS_PATH = join(ANALYSIS_DIR, 'peaks.json');
const META_PATH = join(ANALYSIS_DIR, 'meta.json');

const BPM = 140;
const METER = 4;
const FIRST_BEAT_SECONDS = 35.4;
const TRACK_END_SECONDS = 538.12;
const BEAT_INTERVAL_SECONDS = 60 / BPM;
const SYNCOPATION_TARGET = 0.5;
const SYNCOPATION_TOLERANCE = 0.075;
const EXPECTED_SYNCOPATED_PEAKS = 13;
const SOURCE = 'authored-140bpm-grid';
const PROVENANCE = [
    'Authored 140 BPM, 4/4 grid anchored at 35.4s.',
    'Aubio confidence was 0; the authored grid was validated against peaks.json.'
].join(' ');

/**
 * @param {string} filePath
 * @return {object}
 */
function loadJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * @return {{bpm: number, meter: number, source: string, provenance: string, totalBeats: number, beats: object[]}}
 */
function buildBeatGrid() {
    const beats = [];
    const intervalCount = Math.floor(
        (TRACK_END_SECONDS - FIRST_BEAT_SECONDS) / BEAT_INTERVAL_SECONDS
    );

    for (let index = 0; index <= intervalCount; index += 1) {
        beats.push({
            beat: index + 1,
            time: FIRST_BEAT_SECONDS + index * BEAT_INTERVAL_SECONDS,
            bar: Math.floor(index / METER) + 1,
            beatInBar: (index % METER) + 1
        });
    }

    return {
        bpm: BPM,
        meter: METER,
        source: SOURCE,
        provenance: PROVENANCE,
        totalBeats: beats.length,
        beats
    };
}

/**
 * @param {ReturnType<typeof buildBeatGrid>} grid
 * @param {object} meta
 * @return {string[]}
 */
function validateGrid(grid, meta) {
    const errors = [];
    const expectedBeatKeys = ['beat', 'time', 'bar', 'beatInBar'];

    if (grid.totalBeats !== grid.beats.length || grid.beats.length === 0) {
        errors.push('totalBeats must match a non-empty beats array');
    }
    if (meta.duration !== TRACK_END_SECONDS) {
        errors.push(`meta.json duration ${meta.duration} does not match ${TRACK_END_SECONDS}s`);
    }
    if (meta.tempo?.confidence !== 0) {
        errors.push(`meta.json aubio confidence changed from 0 to ${meta.tempo?.confidence}`);
    }

    grid.beats.forEach((entry, index) => {
        const expectedKeys = expectedBeatKeys.join(',');
        const actualKeys = Object.keys(entry).join(',');
        const expectedTime = FIRST_BEAT_SECONDS + index * BEAT_INTERVAL_SECONDS;

        if (actualKeys !== expectedKeys) {
            errors.push(`beats[${index}] keys are ${actualKeys}; expected ${expectedKeys}`);
        }
        if (entry.beat !== index + 1) {
            errors.push(`beats[${index}].beat must be ${index + 1}`);
        }
        if (entry.time !== expectedTime) {
            errors.push(`beats[${index}].time does not match the authored grid`);
        }
        if (entry.bar !== Math.floor(index / METER) + 1) {
            errors.push(`beats[${index}].bar is invalid`);
        }
        if (entry.beatInBar !== (index % METER) + 1) {
            errors.push(`beats[${index}].beatInBar is invalid`);
        }
        if (entry.time > TRACK_END_SECONDS) {
            errors.push(`beats[${index}].time extends past the track end`);
        }
        if (index > 0 && entry.time <= grid.beats[index - 1].time) {
            errors.push(`beats[${index}].time is not strictly increasing`);
        }
    });

    const nextBeatTime = FIRST_BEAT_SECONDS + grid.beats.length * BEAT_INTERVAL_SECONDS;
    if (nextBeatTime <= TRACK_END_SECONDS) {
        errors.push(`grid ends early; next beat ${nextBeatTime}s is still inside the track`);
    }

    return errors;
}

/**
 * @param {number} value
 * @return {number}
 */
function positiveFraction(value) {
    return ((value % 1) + 1) % 1;
}

/**
 * @param {object[]} peaks
 * @return {{rows: object[], clusteredCount: number, status: string}}
 */
function validatePeaks(peaks) {
    const rows = peaks.map((peak, index) => {
        const gridPosition = (peak.time - FIRST_BEAT_SECONDS) / BEAT_INTERVAL_SECONDS;
        const phaseOffset = positiveFraction(gridPosition);
        const nearestBeatIndex = Math.round(gridPosition);
        const nearestBeatTime = FIRST_BEAT_SECONDS
            + nearestBeatIndex * BEAT_INTERVAL_SECONDS;
        const nearestOffset = (peak.time - nearestBeatTime) / BEAT_INTERVAL_SECONDS;
        const clustered = Math.abs(phaseOffset - SYNCOPATION_TARGET)
            <= SYNCOPATION_TOLERANCE;

        return {
            peak: index + 1,
            timeSeconds: peak.time.toFixed(2),
            phaseOffsetBeats: `+${phaseOffset.toFixed(3)}`,
            nearestBeat: nearestBeatIndex + 1,
            nearestOffsetBeats: `${nearestOffset >= 0 ? '+' : ''}${nearestOffset.toFixed(3)}`,
            halfBeatCluster: clustered ? 'yes' : 'no'
        };
    });
    const clusteredCount = rows.filter((row) => row.halfBeatCluster === 'yes').length;

    return {
        rows,
        clusteredCount,
        status: clusteredCount >= EXPECTED_SYNCOPATED_PEAKS ? 'PASS' : 'WARN'
    };
}

function main() {
    const meta = loadJson(META_PATH);
    const peakData = loadJson(PEAKS_PATH);
    const peaks = Array.isArray(peakData.peaks) ? peakData.peaks : [];
    const grid = buildBeatGrid();
    const gridErrors = validateGrid(grid, meta);

    if (peakData.totalPeaks !== peaks.length || peaks.length === 0) {
        gridErrors.push('peaks.json totalPeaks must match a non-empty peaks array');
    }

    if (gridErrors.length > 0) {
        console.error('Sonoite beat-grid validation: FAILED');
        gridErrors.forEach((error) => console.error(`  - ${error}`));
        process.exitCode = 1;
        return;
    }

    const peakValidation = validatePeaks(peaks);
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(grid, null, 2)}\n`, 'utf8');

    console.log('Sonoite authored beat grid');
    console.log(`  source: ${grid.source}`);
    console.log(`  bpm/meter: ${grid.bpm} BPM, ${grid.meter}/4`);
    console.log(`  total beats: ${grid.totalBeats}`);
    console.log(`  first beat: ${grid.beats[0].time.toFixed(6)}s`);
    console.log(`  last beat: ${grid.beats.at(-1).time.toFixed(6)}s`);
    console.log(`  track end: ${TRACK_END_SECONDS.toFixed(2)}s`);
    console.log('');
    console.log('Peak fractional-beat validation');
    console.table(peakValidation.rows);
    console.log(
        `Validation summary: ${peakValidation.status} — `
        + `${peakValidation.clusteredCount}/${peaks.length} peaks are within `
        + `±${SYNCOPATION_TOLERANCE.toFixed(3)} beats of the +0.500 phase offset.`
    );
    console.log(`Wrote ${relative(THEME_ROOT, OUTPUT_PATH)}`);
}

main();
