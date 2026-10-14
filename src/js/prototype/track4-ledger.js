/* eslint-disable security/detect-object-injection -- Keys come from fixed authored keyframe tables. */
/**
 * Track 4 state ledger, v2 (docs/qa/TRACK4_STATE_LEDGER_2026-10-01.md, revised
 * per docs/qa/aesthetic-review-round2-2026-10-01/SYNTHESIS.md).
 *
 * The lamp's reach is physical: a wide cone whose range cutoff grows, so nearness
 * to the tube orders the reveal (crown -> flower -> fingers -> egg and hand -> wall).
 * Each state is its own keyframe, not one scalar, so the descent is not the ascent
 * reversed: on the way down the cone stays wide and soft while the range shrinks,
 * and a dark-adapted grey room rises and stays (the film starts black and unknown,
 * ends grey and known). Everything is a pure function of track time (seek-safe).
 *
 * Distances from the tube (-3.15, 5.6, 3), measured in the scene: crown ~5.1,
 * lower flower ~5.7, fingers/hand ~6.6, base ~8.4, back wall ~13.3.
 *
 * Opt-in, imported by experience.js: on Track 4 (horas-mortas-cinema) `?ledger=f`
 * or `?ledger=a` picks an arm (getTrack4LedgerArm(); ignored under `?recut=1` and
 * proof runs). The ledger runs in the Stage room and keeps the film's own camera.
 * applyTrack4Edit() at the bottom is the separate `?edit=1` camera edit.
 */
import { SODIUM_AFTER_CYCLES } from './chamber-sodium.js';

export const TRACK4_LEDGER_ARMS = Object.freeze(['f', 'a']);

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (a, b, t) => {
    const x = clamp01((t - a) / Math.max(b - a, 1e-6));
    return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Restrikes after AFTER-cycle blackouts.
const AFTER_RESTRIKES = SODIUM_AFTER_CYCLES.map((cycle) => cycle.dropAt + cycle.darkSeconds);

// Each track: [atSeconds, value, easeSeconds]. Values fold in order, so the
// result at any time depends only on that time.
const COMMON = {
    // Range cutoff of the key (scene units).
    range: [
        [0, 0, 0],
        [9.8, 6.2, 0.6], // S1 crown
        [41.75, 7.2, 0.6], // S1 whole flower
        [66.15, 8.2, 0.6], // S1 fingers (the 66.27 pulse)
        [103.1, 9.0, 0.6], // S1 egg and hand
        [119.25, 10.5, 1.2], // S2 the lamp finds it: full form + floor
        [187, 28, 1.0], // S2 the wall (~13 away) and the flower's shadow arrive with the cut
        // S5 losing it, after the 319.10 wide has shown the whole room.
        [323, 16, 0.4], // wall dims (wall wash off below)
        [330, 11, 0.4], // wall and shadow gone
        [333.5, 7.6, 0.5], // hand gone
        [336, 6.6, 0.5], // flower only
        // S6 alone: each AFTER restrike reaches less.
        [AFTER_RESTRIKES[0], 6.3, 0.6], // flower
        [AFTER_RESTRIKES[1], 5.6, 0.6], // crown
        [AFTER_RESTRIKES[2], 4.6, 0.6], // tube only
        [386, 0, 2] // S7 silence
    ],
    // Key strength multiplier (on top of the sodium electrical schedule).
    level: [
        [0, 0.55, 0],
        [119.25, 0.62, 1.2],
        [238.15, 0.72, 3],
        [318.35, 0.65, 2]
    ],
    // Cone: wide and soft by default; narrow and hard only for the peak shadow.
    // Wide enough that the pool's edge falls outside the frame (no stage-spot disc).
    angle: [[0, 1.0, 0]],
    penumbra: [[0, 0.9, 0]],
    // Neutral wall wash, from the 187 cut, gone at the first loss.
    wall: [[0, 0, 0], [187, 1, 1], [323, 0, 0.4]],
    // Dark-adapted grey room: rises as the music decays, stays to the end.
    fill: [[0, 0, 0], [338.05, 4, 20], [386, 0, 5]]
};

const ARMS = {
    // Fable: the lamp can't keep up at the climax (loss of reach, longer than a
    // stutter), then steadies and throws the hard shadow when the sub-bass drops.
    f: {
        range: [[269.86, 11, 0.5], [274, 28, 1.2], [285.5, 30, 1]],
        angle: [[285.5, 0.45, 1]],
        penumbra: [[285.5, 0.15, 1]],
        level: [[285.5, 0.85, 1]],
        // The wall goes with the reach; dims under the hard shadow so it reads.
        wall: [[269.86, 0, 0.5], [274, 1, 1.2], [285.5, 0.4, 1]]
    },
    // Astra: the hard shadow arrives with the climax and softens as the bass drops.
    a: {
        range: [[269.86, 30, 1], [284.1, 28, 1.4]],
        angle: [[269.86, 0.45, 1], [284.1, 1.0, 1.4]],
        penumbra: [[269.86, 0.15, 1], [284.1, 0.9, 1.4]],
        level: [[269.86, 0.85, 1], [284.1, 0.72, 1.4]],
        wall: [[269.86, 0.4, 1], [284.1, 1, 1.4]]
    }
};

// After the peak, every arm returns to the soft wide cone for the descent.
const DESCENT = {
    angle: [[303.74, 1.0, 3]],
    penumbra: [[303.74, 0.9, 3]],
    level: [[303.74, 0.72, 3]],
    wall: [[303.74, 1, 3]]
};

function sampleTrack(keys, t) {
    let value = keys[0][1];
    for (const [at, target, seconds] of keys.slice(1)) {
        value = lerp(value, target, ease(at, at + seconds, t));
    }
    return value;
}

function keysFor(name, arm) {
    const merged = [...COMMON[name], ...((ARMS[arm] || ARMS.f)[name] || []), ...(DESCENT[name] || [])];
    // Stable sort by time so arm and descent keys fold in chronological order.
    return merged.map((key, index) => ({ key, index }))
        .sort((x, y) => x.key[0] - y.key[0] || x.index - y.index)
        .map(({ key }) => key);
}

const TRACKS = ['range', 'level', 'angle', 'penumbra', 'wall', 'fill'];

/**
 * @param {number} elapsed Track time in seconds.
 * @param {string} arm     'f' or 'a'.
 * @return {Object} State values: range, level, angle, penumbra, wall, fill.
 */
export function sampleTrack4Ledger(elapsed, arm = 'f') {
    const t = Math.max(0, elapsed);
    const state = {};
    for (const name of TRACKS) {
        state[name] = sampleTrack(keysFor(name, arm), t);
    }
    return state;
}

const KEY_COLOR = '#ffd9b0'; // desaturated sodium on the mesh (~0.3); the tube stays saturated
const WALL_COLOR = '#bdb7b0'; // neutral plaster
const FILL_COLOR = '#7d838c'; // cool grey: the dark-adapted room
// Owner trim 2026-10-01: "a bit too bright" -> about two-thirds of a stop down overall.
const KEY_GAIN = 100;
const WALL_GAIN = 30;

/**
 * Map the Stage light for Track 4 onto the ledger.
 *
 * @param {Object}  light       Light from the Stage proposal (sodium-scheduled).
 * @param {number}  elapsed     Track time in seconds.
 * @param {string}  arm         Ledger arm.
 * @param {number}  sodiumLevel Current sodium level (strikes, stutters, deaths).
 * @param {boolean} started     Whether playback has started.
 * @return {Object} Light parameters for updateProposalLighting.
 */
export function applyTrack4Ledger(light, elapsed, arm, sodiumLevel, started) {
    const state = sampleTrack4Ledger(elapsed, arm);
    const on = started ? 1 : 0;
    const level = on * sodiumLevel * state.level;
    return {
        ...light,
        color: KEY_COLOR,
        wallColor: WALL_COLOR,
        key: KEY_GAIN * level,
        // A zero range in three.js means "infinite"; keep a tiny positive cutoff.
        distance: Math.max(state.range, 0.01),
        decay: 1,
        keyTarget: [0.96, 3.2, -0.04],
        angle: state.angle,
        penumbra: state.penumbra,
        wall: WALL_GAIN * level * state.wall,
        floor: 0.3,
        fill: on * state.fill,
        fillColor: FILL_COLOR,
        state
    };
}

// The flower's shadow from the tube lands about (5.8, 2.8) on a plane at z = -3.5,
// inside the BURN framing. The room's own back wall (z = -9.3) is too far: the
// shadow there is large, soft and barely lit. This receiver exists only in the
// ledger, so the shared physical room (also used by Track 5) is untouched.
// A true near wall: standing on the floor (y = -1.82) and wide enough that its
// edges stay outside every framing, so it reads as the room, not a card.
export const TRACK4_LEDGER_PANEL = Object.freeze({
    position: [4.5, 10.18, -3.5],
    width: 60,
    height: 24,
    color: '#4a4744' // charcoal plaster: the wall stays well below the flower
});

/**
 * @param {Object} THREE three.js namespace.
 * @return {Object} Receiving plaster panel (receives, never casts, shadows).
 */
export function createTrack4LedgerPanel(THREE) {
    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK4_LEDGER_PANEL.width, TRACK4_LEDGER_PANEL.height),
        new THREE.MeshStandardMaterial({ color: TRACK4_LEDGER_PANEL.color, roughness: 0.95, metalness: 0 })
    );
    panel.name = 'track4LedgerPanel';
    panel.position.set(...TRACK4_LEDGER_PANEL.position);
    panel.receiveShadow = true;
    panel.castShadow = false;
    return panel;
}

// Track 4 edit (?edit=1), graded against the master in
// docs/qa/track4-ledger-2026-10-01/EDIT_POINTS.md. No new hard cuts inside the
// approved BURN push: Track 4 keeps holds plus a slow push.
const EDIT_CRASH_CUT = 188.39; // measured onset 188.38 (the cut sat at 187.0)
const EDIT_BURN_START = 238.15;
const EDIT_PUSH_ARRIVES = 285.5; // sub-bass gone; ledger arm F's hard shadow
const EDIT_OPENING_PUSH_START = 53.96;
const EDIT_OPENING_PUSH_ARRIVES = 66.27; // the pulse enters
const EDIT_OPENING_PUSH_AMOUNT = 0.15;

/**
 * @param {Object} camera Track 4 camera config with an authored `score`.
 * @return {Object} New camera config; the input is not modified.
 */
export function applyTrack4Edit(camera) {
    const score = (camera?.score || []).map((cue) => ({ ...cue }));
    const cueAt = (seconds) => score.find((cue) => Math.abs(cue.atSeconds - seconds) < 0.01);
    const crash = cueAt(187);
    if (crash) {
        crash.atSeconds = EDIT_CRASH_CUT;
    }
    // BURN starts on a clean cut. Without a transition the engine drifted for
    // its 6 s default before 238.15 (audit finding, confirmed as a hard cut).
    const burn = cueAt(EDIT_BURN_START);
    if (burn) {
        burn.transitionSeconds = 0;
    }
    const arrival = cueAt(317.6);
    if (arrival) {
        arrival.atSeconds = EDIT_PUSH_ARRIVES;
        arrival.transitionSeconds = EDIT_PUSH_ARRIVES - EDIT_BURN_START;
    }
    const opening = score[0];
    if (opening && Array.isArray(opening.position) && Array.isArray(opening.target)) {
        score.push({
            ...opening,
            atSeconds: EDIT_OPENING_PUSH_ARRIVES,
            transitionSeconds: EDIT_OPENING_PUSH_ARRIVES - EDIT_OPENING_PUSH_START,
            position: opening.position.map((value, axis) => lerp(value, opening.target[axis], EDIT_OPENING_PUSH_AMOUNT)),
            driftScale: 0
        });
    }
    score.sort((x, y) => x.atSeconds - y.atSeconds);
    return { ...camera, score };
}
