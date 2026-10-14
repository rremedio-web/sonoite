'use strict';

/* eslint-disable security/detect-object-injection -- offline build script; keys originate from curated local JSON */
/* eslint-disable no-console -- CLI script output */

/**
 * Materialize Track 5 (nao-querer-nada)'s beat grid from the authored phrase anchors in
 * track5-phrase-anchors.cjs: each anchor span gets a whole number of 4/4 bars (count rounded from
 * the nominal 93.5 BPM), so every anchor lands on a downbeat. Writes
 * public/assets/journeys/analysis/nao-querer-nada/beats.json (read by the Path B shot director)
 * only when validation passes; exits 1 otherwise.
 *
 * Usage: node scripts/build-track5-beats.cjs [--print-summary]   (--print-summary: report only, no write)
 */

const fs = require('fs');
const path = require('path');

const { BPM_NOMINAL, anchors } = require('./track5-phrase-anchors.cjs');

const METER = 4;
const BEATS_PER_BAR = METER;
const OUTPUT_PATH = path.join(
    __dirname,
    '..',
    'public',
    'assets',
    'journeys',
    'analysis',
    'nao-querer-nada',
    'beats.json'
);

function roundSpanBars(spanSeconds) {
    return Math.max(1, Math.round((spanSeconds * BPM_NOMINAL) / 240));
}

function localBpmForSpan(spanSeconds, spanBars) {
    if (spanSeconds <= 0 || spanBars <= 0) {
        return BPM_NOMINAL;
    }
    return (spanBars * 240) / spanSeconds;
}

function collectDownbeatTimes() {
    const downbeats = [];

    for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
        const t0 = anchors[anchorIndex].time;
        const t1 = anchors[anchorIndex + 1].time;
        const spanSeconds = t1 - t0;
        const spanBars = roundSpanBars(spanSeconds);

        if (spanBars === 1) {
            downbeats.push(t0);
        } else {
            for (let barInSpan = 0; barInSpan < spanBars; barInSpan += 1) {
                downbeats.push(t0 + (barInSpan / (spanBars - 1)) * spanSeconds);
            }
        }
    }

    downbeats.push(anchors[anchors.length - 1].time);

    downbeats.sort((left, right) => left - right);

    const merged = [];
    downbeats.forEach((time) => {
        if (!merged.length || Math.abs(time - merged[merged.length - 1]) > 1e-9) {
            merged.push(time);
        }
    });

    return merged;
}

function buildBeatGrid() {
    const downbeatTimes = collectDownbeatTimes();
    const nominalQuarter = 60 / BPM_NOMINAL;
    const beats = [];
    let globalBar = 1;
    let globalBeat = 0;

    for (let downbeatIndex = 0; downbeatIndex < downbeatTimes.length; downbeatIndex += 1) {
        const downbeatTime = downbeatTimes[downbeatIndex];
        const nextDownbeatTime = downbeatIndex < downbeatTimes.length - 1
            ? downbeatTimes[downbeatIndex + 1]
            : downbeatTime + BEATS_PER_BAR * nominalQuarter;
        const barDuration = Math.max(nextDownbeatTime - downbeatTime, 1e-9);
        const quarter = barDuration / BEATS_PER_BAR;

        for (let beatInBar = 1; beatInBar <= BEATS_PER_BAR; beatInBar += 1) {
            globalBeat += 1;
            const time = downbeatTime + (beatInBar - 1) * quarter;
            beats.push({
                beat: globalBeat,
                time,
                bar: globalBar,
                beatInBar
            });
        }
        globalBar += 1;
    }

    return {
        bpm: BPM_NOMINAL,
        meter: METER,
        source: 'curated-phrase-anchors',
        totalBeats: beats.length,
        beats
    };
}

function validateGrid(grid) {
    const errors = [];
    const beats = grid.beats || [];
    let previousTime = -Infinity;
    const downbeatsByBar = new Map();

    beats.forEach((entry, index) => {
        const time = Number(entry.time);
        if (!Number.isFinite(time)) {
            errors.push(`beats[${index}].time invalid`);
            return;
        }
        if (time <= previousTime) {
            errors.push('beat times not strictly monotonic');
        }
        previousTime = time;

        const bar = Number(entry.bar);
        if (!Number.isInteger(bar) || bar < 1) {
            errors.push(`beats[${index}].bar must be >= 1`);
        }
        if (entry.beatInBar === 1) {
            const list = downbeatsByBar.get(bar) || [];
            list.push(time);
            downbeatsByBar.set(bar, list);
        }
    });

    downbeatsByBar.forEach((times, bar) => {
        if (times.length !== 1) {
            errors.push(`bar ${bar} must have exactly one downbeat, found ${times.length}`);
        }
    });

    const lastTime = beats.length ? beats[beats.length - 1].time : 0;
    if (lastTime < 564) {
        errors.push(`coverage ${lastTime}s is below 564s`);
    }

    anchors.forEach((anchor) => {
        const match = beats.find(
            (entry) => entry.beatInBar === 1 && Math.abs(entry.time - anchor.time) <= 0.001
        );
        if (!match) {
            errors.push(`anchor ${anchor.time}s (${anchor.label}) missing downbeat within 1ms`);
        }
    });

    return { ok: errors.length === 0, errors };
}

function printSummary(grid) {
    const beats = grid.beats;
    const downbeats = beats.filter((entry) => entry.beatInBar === 1);
    const barCount = downbeats.length;
    const firstDownbeat = downbeats[0];
    const lastDownbeat = downbeats[downbeats.length - 1];
    const spanSummaries = [];

    for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
        const spanSeconds = anchors[anchorIndex + 1].time - anchors[anchorIndex].time;
        const spanBars = roundSpanBars(spanSeconds);
        spanSummaries.push({
            from: anchors[anchorIndex].time,
            to: anchors[anchorIndex + 1].time,
            spanSeconds,
            spanBars,
            localBpm: localBpmForSpan(spanSeconds, spanBars)
        });
    }

    const validation = validateGrid(grid);

    console.log('Track 05 curated beat grid summary');
    console.log(`  bars (downbeats): ${barCount}`);
    console.log(`  total beats: ${grid.totalBeats}`);
    console.log(`  first downbeat: bar ${firstDownbeat.bar} @ ${firstDownbeat.time.toFixed(6)}s`);
    console.log(`  last downbeat: bar ${lastDownbeat.bar} @ ${lastDownbeat.time.toFixed(6)}s`);
    console.log(`  last beat time: ${beats[beats.length - 1].time.toFixed(6)}s`);
    console.log('  anchor span local BPMs:');
    spanSummaries.forEach((span) => {
        console.log(
            `    ${span.from}s → ${span.to}s (${span.spanBars} bars): ${span.localBpm.toFixed(4)} BPM`
        );
    });
    console.log(`  validation: ${validation.ok ? 'OK' : 'FAILED'}`);
    if (!validation.ok) {
        validation.errors.forEach((error) => console.log(`    - ${error}`));
    }

    return { barCount, spanSummaries, validation, firstDownbeat, lastDownbeat };
}

if (require.main === module) {
    const printOnly = process.argv.includes('--print-summary');
    const grid = buildBeatGrid();
    const summary = printSummary(grid);

    if (!printOnly && summary.validation.ok) {
        fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
        fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(grid, null, 2)}\n`, 'utf8');
        console.log(`  wrote ${OUTPUT_PATH}`);
    } else if (!summary.validation.ok) {
        process.exitCode = 1;
    }
}

module.exports = {
    buildBeatGrid,
    validateGrid,
    printSummary,
    roundSpanBars,
    localBpmForSpan
};
