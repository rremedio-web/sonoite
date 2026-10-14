'use strict';

/**
 * Human-authored phrase boundaries for Track 05 (nao-querer-nada).
 * Source of truth: TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows in src/js/prototype/films/nao-querer-nada.js.
 * Composer may refine these times and re-run scripts/build-track5-beats.cjs.
 */
const BPM_NOMINAL = 93.5;

/** @type {{ time: number, label: string, source: string }[]} */
const anchors = [
    { time: 0, label: 'track_start', source: 'authored' },
    { time: 64, label: 'VOID_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows VOID' },
    { time: 135, label: 'AWAKENING_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows AWAKENING' },
    { time: 198, label: 'RELEASE_first_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows RELEASE' },
    { time: 246, label: 'WANTING_first_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows WANTING' },
    { time: 337, label: 'WANTING_second_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows WANTING' },
    { time: 534, label: 'RELEASE_second_end', source: 'TRACK5_CHAMBER_FILM_TIMELINE.phaseWindows RELEASE' },
    { time: 564, label: 'track_end', source: '9:24 playback end (ERASURE phase end)' }
];

module.exports = {
    BPM_NOMINAL,
    anchors
};
