/* eslint-disable security/detect-object-injection -- Keys come from fixed authored keyframe and cut tables. */
/**
 * Track 5 state ledger (docs/qa/track5-ledger-2026-10-02/LEDGER.md), built from
 * the round-A Fable/Astra reviews.
 *
 * Track 4 marks the room; Track 5 marks the object. The ratchet is the tar
 * (relic-mutation.js, irreversible from 337). The light is the control, not the
 * variable: before the collapse it offers the sculpture and takes it back; after
 * it, the *same* key and framing return, so the surface is the only thing that
 * changed. Two instruments, both cold: K, a hard shadow-casting key that steps
 * (never eases, never follows the tar), and R, a rear edge light that keeps the
 * black, wet object readable from the collapse to the end. No fill, no wall, and
 * it ends in black. Pure functions of track time (seek-safe).
 *
 * Opt-in, imported by experience.js: `?ledger=1` on the canonical Track 5 film
 * (usesTrack5Ledger(); ignored under `?recut=1` and proof runs). It runs in the
 * Stage room: applyTrack5Ledger() reshapes the Stage light and
 * applyTrack5LedgerCamera() replaces the cut plan.
 */

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (a, b, t) => {
    const x = clamp01((t - a) / Math.max(b - a, 1e-6));
    return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;
const STEP = 0.3; // hard steps, not eases

// Musical events, measured in the master at 0.25 s resolution on 2026-10-02
// (sub-bass, high band and onsets). These correct the 2026-10-01 listening map,
// whose 3 s averages had smeared the 64.34 step into a false 70.02.
export const TRACK5_LEDGER_EVENTS = Object.freeze({
    arrival: 64.34, // first heavy kick: sub +13 dB
    drumsOut: 135.53, // sub -3.3 dB, onset 135.50
    partialReturn: 170.69, // full +2.4 dB
    drop: 198.75, // sub +5.3 dB, onset 198.72
    collapse: 335.5, // the last kick and crash (final onset); after it only decay, no new hits
    frontier: 391.43,
    frontierEnds: 432.91,
    decline: 532.86, // the final decline begins (-4 dB step)
    lastKick: 559.0 // the quiet coda's last kick, onset 558.96; the file ends 563.93
});

// K: a true side key, 54-77 degrees off every lens (round B), so the clean
// sculpture is modelled rather than flat. K_FLOOR: on the floor for the collapse,
// so the tar's arrival is the event, not the clean hand.
const K_SIDE = [-0.2, 6.5, 7.4];
const K_FLOOR = [5.5, -1.2, 3.2];
const K_LOW = [5.5, 0.3, 3.2];

// "Before" light (S3). S6 reuses these exact values: that is the proof.
const BEFORE = Object.freeze({ level: 1, position: K_SIDE, target: [0.96, 1.4, -0.04], angle: 0.62, penumbra: 0.3, range: 18 });

/**
 * @param {number} elapsed Track time in seconds.
 * @return {Object} { state, k: {level, position, target, angle, penumbra, range}, r, strip }
 */
export function sampleTrack5Ledger(elapsed) {
    const t = Math.max(0, elapsed);
    const E = TRACK5_LEDGER_EVENTS;
    let state = 'S0';
    let k = { level: 0, position: K_SIDE, target: [0.96, 3.4, -0.04], angle: 0.45, penumbra: 0.3, range: 11.5 };
    if (t >= E.arrival) {
        state = 'S1'; // the offer: flower, egg and upper hand
        k = { ...k, level: 0.5 * ease(E.arrival, E.arrival + STEP, t) };
    }
    if (t >= E.drumsOut) {
        state = 'S2a'; // taken back in one step
        k = { ...k, level: 0.5 * (1 - ease(E.drumsOut, E.drumsOut + STEP, t)) };
    }
    if (t >= E.partialReturn) {
        state = 'S2b'; // flower and egg come back; the hand does not
        k = { level: 0.5 * ease(E.partialReturn, E.partialReturn + STEP, t), position: K_SIDE, target: [0.96, 4.1, -0.04], angle: 0.28, penumbra: 0.3, range: 11.5 };
    }
    if (t >= E.drop) {
        state = 'S3'; // the "before": the whole sculpture, crown to base, with floor contact
        k = { ...BEFORE, level: lerp(0.5, BEFORE.level, ease(E.drop, E.drop + STEP, t)) };
    }
    if (t >= E.collapse) {
        state = 'S4'; // the key drops onto the floor where the tar arrives
        k = { level: 0.3, position: K_FLOOR, target: [0.96, -1.2, -0.04], angle: 0.27, penumbra: 0.35, range: 8 };
    }
    if (t >= E.frontier) {
        state = 'S5'; // the frontier close-up keeps its v1 aim, dimmer
        k = { level: 0.3, position: K_LOW, target: [0.96, -0.4, -0.04], angle: 0.38, penumbra: 0.35, range: 8.5 };
    }
    if (t >= E.frontierEnds) {
        state = 'S6'; // the same light as S3 returns: the surface is the only variable
        k = { ...BEFORE };
    }
    if (t >= E.decline) {
        state = t >= E.lastKick ? 'S8' : 'S7';
        k = { ...BEFORE, level: BEFORE.level * (1 - ease(E.decline, E.decline + STEP, t)) };
    }
    // R and the wet strip follow the quiet coda to its last kick, then black.
    const tail = t < E.decline ? 1 : 1 - ease(E.decline, E.lastKick, t);
    const r = tail;
    // The strip is constant from the drop on, so S3 and S6 still match exactly.
    const strip = t < E.drop ? 0 : tail * ease(E.drop, E.drop + STEP, t);
    return { state, k, r, strip };
}

// Close-ups restrained symmetrically (round B, Astra): the clean flower close-ups
// before the collapse and the coated one after it get the same trim, so the
// before/after comparison stays a control.
const CLOSEUP_WINDOWS = [[299.53, 335.5], [510.67, 532.86]]; // the clean window ends at the collapse
const CLOSEUP_TRIM = 0.75;
const closeupScale = (t) => (CLOSEUP_WINDOWS.some(([a, b]) => t >= a && t < b) ? CLOSEUP_TRIM : 1);

const K_COLOR = '#cfd8e2';
const K_GAIN = 100;
const R_GAIN = 1.2;
const R_POSITION = [-4, 5, -6];
// A long, narrow source near R: wet tar reads as a long highlight, not glitter.
const STRIP_GAIN = 0.4;
const STRIP_POSE = Object.freeze({ position: [-4, 5, -6], width: 0.25, height: 2, target: [0.96, 2.0, -0.04] });

/**
 * Map the Stage light for Track 5 onto the ledger.
 *
 * @param {Object}  light   Light from the Stage proposal.
 * @param {number}  elapsed Track time in seconds.
 * @param {boolean} started Whether playback has started.
 * @return {Object} Light parameters for updateProposalLighting.
 */
export function applyTrack5Ledger(light, elapsed, started) {
    const { state, k, r, strip } = sampleTrack5Ledger(elapsed);
    const on = started ? 1 : 0;
    return {
        ...light,
        color: K_COLOR,
        keyPosition: k.position,
        keyTarget: k.target,
        key: on * K_GAIN * k.level * closeupScale(elapsed),
        angle: k.angle,
        penumbra: k.penumbra,
        distance: k.range,
        decay: 1,
        rim: on * R_GAIN * r,
        rimPosition: R_POSITION,
        back: 0,
        wall: 0,
        floor: 0.25,
        fill: 0,
        residue: 0,
        softbox: on * STRIP_GAIN * strip,
        softboxPose: STRIP_POSE,
        state
    };
}

// Camera: a full-figure return frame (P2) inside the room, the flower close-up
// re-aimed at the measured bloom edge (P3), and no setup behind the wall or
// beyond ~18 units. Cuts land on the confirmed hits; beat-precise ones use an
// accent from the hit beat into the next bar, then a bar cut to the same setup.
const P2 = 'p2_full_figure';
const P3 = 'p3_flower';
const BLOOM_EDGE = [1.3457, 4.2708, 0.6256];

export const TRACK5_LEDGER_CUTS = Object.freeze({
    1: 'mcu_left_eye', // S0
    25: 'mcu_right_low', // S1: bar 25 downbeat 64.00 (0.34 s ahead of the 64.34 kick)
    77: P2, // S3 "before": the full figure on the drop (accent from beat 302 = 198.67, the 198.75 drop)
    103: 'mcu_fracture', // the climax snare (accent from beat 406 = 268.08, onset 268.24); replaces the unmotivated 246.00 cut
    107: 'mcu_pressure_low', // 280.79
    114: 'ecu_surface', // 299.53
    121: P3, // 318.26
    128: P2, // collapse: back to the full figure (accent from beat 507 = 335.66, on the last crash), not behind the wall
    149: 'mcu_tar_frontier', // 391.43, the liked frontier close-up
    165: P2, // 432.91 the same frame as before, same light
    179: 'mcu_fracture', // 469.20 the 200 s frame again
    195: P3 // 510.67 the flower close-up again, coated; no cut after this
});

export const TRACK5_LEDGER_ACCENTS = Object.freeze([
    { startBeat: 302, endBeat: 305, setupId: P2 },
    { startBeat: 406, endBeat: 409, setupId: 'mcu_fracture' },
    { startBeat: 507, endBeat: 509, setupId: P2 }
]);

/**
 * @param {Object} camera Track 5 director camera config (after the tar-passage injection).
 * @return {Object} New camera config; the input is not modified.
 */
export function applyTrack5LedgerCamera(camera) {
    const setups = { ...camera.setups };
    setups[P2] = { ...setups.ws_right_arch, distance: 17.5, dollyPerBar: 0, orbitPerBar: 0, localMotion: 0 };
    setups[P3] = { ...setups.ecu_vertigo, targetPoint: BLOOM_EDGE };
    // ecu_surface aimed at the empty top of the bounding box too.
    setups.ecu_surface = { ...setups.ecu_surface, targetPoint: BLOOM_EDGE };
    if (!setups.mcu_tar_frontier) {
        throw new Error('applyTrack5LedgerCamera expects the tar-passage camera');
    }
    return {
        ...camera,
        setups,
        cutTimeline: { ...TRACK5_LEDGER_CUTS },
        accentCuts: TRACK5_LEDGER_ACCENTS.map((accent) => ({ ...accent }))
    };
}
