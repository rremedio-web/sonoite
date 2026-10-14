/**
 * Track 5 audio-led middle recut — Stage 2b forensic trace score.
 *
 * A pure, seek-safe deep module. It answers one question — "how much forensic
 * trace is on the relic at absolute second N" — and nothing else. It owns no
 * THREE objects, allocates nothing per frame, reads no clock, adds no pass, and
 * every value it returns is folded into an expression that already exists in
 * `experience.js` (the Track 5 plate `strength` uniform, plus one new `traceCool`
 * uniform on the SAME pass).
 *
 * Why this exists
 * ---------------
 * The owner flagged the 5:40–6:20 stretch as "basic TV static": full-frame,
 * frame-random snow that sat *in front of* the image instead of on it. Two things
 * were wrong with it and both are addressed here rather than in the shader alone:
 *
 *   1. It had no spatial owner. Frame-random noise applied uniformly reads as a
 *      broadcast fault, not as forensic material. The fix is a mask (shader side)
 *      — but the mask is worthless if the amount driving it is a constant.
 *   2. It had no authored time. Static that is simply "on" for forty seconds is
 *      texture, not a beat. This module gives the trace a musical shape tied to
 *      the four downbeats that already carry the recut's plateau:
 *
 *        bar 128 (337.000s)  ws_plateau_spiral   — the plateau opens, trace 0
 *        bar 139 (365.513s)  mcu_plateau_shoulders — the shoulder insert, peak
 *        bar 147 (386.250s)  ecu_tar_rise        — the tar rises, trace ≤ 0.08
 *        ~390.000s           trace hard zero     — void ECU must not inherit stipple
 *        bar 151 (396.618s)  ws_island_bright    — false dawn, trace exactly 0
 *
 * So the trace grows across the spiral, peaks exactly where the cut goes to the
 * shoulders (the one moment the film is asking you to read the material), then
 * withdraws as the tar takes over, and is gone before the false dawn — which must
 * stay the brightest, cleanest post-climax moment in the film and therefore may
 * not inherit a single grain of this.
 *
 * Why the envelope stops short of its own ceilings
 * ------------------------------------------------
 * The approved maxima are trace 0.42 / plateAdd 0.10 at the peak. The authored
 * values are 0.38 / 0.08. The headroom is deliberate: the plate additive rides on
 * top of a base plate strength around 0.12 and the trace tint is applied inside
 * the plate grade, so both compound with whatever `forensic`/`damage` the chamber
 * law is already pushing. Sitting at the ceiling leaves no room for that, and the
 * gates that matter here (locality against the background, and a clean false
 * dawn) are both easier to hold from below.
 *
 * Shape
 * -----
 * Three smoothstep segments, joined at the anchors. Smoothstep has zero
 * derivative at both ends, so every joint is C1 — there is no one-frame spike, no
 * visible kink at a cut, and the value is exactly 0 at bar 128 and exactly 0 at
 * bar 151 by construction rather than by clamping.
 *
 * Purity contract
 * ---------------
 * Every query is a pure function of absolute `elapsed` seconds. No accumulated
 * state, no frame counters, no randomness, no clock reads, no nominal-BPM maths —
 * the four anchors are read from the loaded beat grid's downbeats and frozen at
 * construction. Seeking to any time gives the same value as playing to it, and
 * evaluating times in any order gives identical results. Non-finite input, or a
 * grid that failed validation, returns 0.
 */

// --- Anchor bars (the recut's own plateau cuts; not new user-taste choices) ---
const RECUT_TRACE_START_BAR = 128; // ws_plateau_spiral — plateau opens
const RECUT_TRACE_PEAK_BAR = 139; // mcu_plateau_shoulders — shoulder insert
const RECUT_TRACE_DECLINE_BAR = 147; // ecu_tar_rise — tar takes over
const RECUT_TRACE_END_BAR = 151; // ws_island_bright — false dawn, hard zero

// --- Authored amounts (approved maxima in brackets; headroom is deliberate) ---
const RECUT_TRACE_PEAK = 0.38; // [<= 0.42] blue-grey trace at the shoulder insert
const RECUT_TRACE_DECLINE = 0.08; // [<= 0.08] tar ECU must not read void-band stipple
const RECUT_TRACE_ZERO_TIME = 390; // authored ~390s; plate tail still runs to bar 151
const RECUT_PLATE_ADD_PEAK = 0.08; // [<= 0.10] base plate 0.12 -> 0.20 total
const RECUT_PLATE_ADD_DECLINE = 0.042; // [<= 0.05]

function smoothstep01(t) {
    if (!(t > 0)) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

function downbeatTimeForBar(beatGrid, bar) {
    const beats = Array.isArray(beatGrid?.beats) ? beatGrid.beats : null;
    if (!beats) {
        return null;
    }
    for (let i = 0; i < beats.length; i += 1) {
        // eslint-disable-next-line security/detect-object-injection -- bounded loop counter
        const entry = beats[i];
        if (entry && entry.bar === bar && entry.beatInBar === 1
            && Number.isFinite(entry.time)) {
            return entry.time;
        }
    }
    return null;
}

/**
 * Build the Stage 2b forensic trace score from a loaded beat grid.
 *
 * @param {{ beatGrid?: { beats?: Array<{ bar:number, beatInBar:number, time:number }> } }} [options]
 * @return {Object} pure, allocation-free per-frame query surface (see methods).
 */
export function createRecutVisualScore({ beatGrid } = {}) {
    // --- Resolve the four authoritative downbeats once ------------------------
    const startTime = downbeatTimeForBar(beatGrid, RECUT_TRACE_START_BAR);
    const peakTime = downbeatTimeForBar(beatGrid, RECUT_TRACE_PEAK_BAR);
    const declineTime = downbeatTimeForBar(beatGrid, RECUT_TRACE_DECLINE_BAR);
    const endTime = downbeatTimeForBar(beatGrid, RECUT_TRACE_END_BAR);

    const errors = [];
    const missing = [];
    if (startTime === null) {
        missing.push(RECUT_TRACE_START_BAR);
    }
    if (peakTime === null) {
        missing.push(RECUT_TRACE_PEAK_BAR);
    }
    if (declineTime === null) {
        missing.push(RECUT_TRACE_DECLINE_BAR);
    }
    if (endTime === null) {
        missing.push(RECUT_TRACE_END_BAR);
    }
    if (missing.length > 0) {
        errors.push(`missing downbeat for bar(s) ${missing.join(', ')}`);
    } else if (!(startTime < peakTime && peakTime < declineTime && declineTime < endTime)) {
        // A non-monotonic grid would invert a segment and could hand the false
        // dawn a non-zero trace. Refuse it outright rather than render it.
        errors.push(
            'non-monotonic anchor times: '
            + `${RECUT_TRACE_START_BAR}=${startTime}, ${RECUT_TRACE_PEAK_BAR}=${peakTime}, `
            + `${RECUT_TRACE_DECLINE_BAR}=${declineTime}, ${RECUT_TRACE_END_BAR}=${endTime}`
        );
    }
    const ok = errors.length === 0;

    const window = Object.freeze({
        startBar: RECUT_TRACE_START_BAR,
        peakBar: RECUT_TRACE_PEAK_BAR,
        declineBar: RECUT_TRACE_DECLINE_BAR,
        endBar: RECUT_TRACE_END_BAR,
        startTime,
        peakTime,
        declineTime,
        endTime,
        tracePeak: RECUT_TRACE_PEAK,
        traceDecline: RECUT_TRACE_DECLINE,
        traceZeroTime: RECUT_TRACE_ZERO_TIME,
        plateAddPeak: RECUT_PLATE_ADD_PEAK,
        plateAddDecline: RECUT_PLATE_ADD_DECLINE
    });
    const validation = Object.freeze({ ok, errors: Object.freeze(errors.slice()) });

    /**
     * Shared normalized envelope, evaluated per channel so the two curves share
     * one shape and can never disagree about where the peak or the zero is.
     *
     * @param {number} time    absolute track time (seconds)
     * @param {number} peak    value at the bar 139 downbeat
     * @param {number} decline value at the bar 147 downbeat
     * @return {number} authored amount, 0 outside [bar 128, bar 151)
     */
    function amountAt(time, peak, decline) {
        if (!ok || !Number.isFinite(time)) {
            return 0;
        }
        if (time <= startTime || time >= endTime) {
            return 0;
        }
        if (time < peakTime) {
            // Rise across the spiral: 0 at bar 128 -> peak at bar 139.
            return peak * smoothstep01((time - startTime) / (peakTime - startTime));
        }
        if (time < declineTime) {
            // Withdraw as the tar arrives: peak -> decline over bars 139..147.
            const t = smoothstep01((time - peakTime) / (declineTime - peakTime));
            return peak + (decline - peak) * t;
        }
        // Clear the frame before the false dawn: decline -> exactly 0 at bar 151.
        return decline * (1 - smoothstep01((time - declineTime) / (endTime - declineTime)));
    }

    /**
     * Trace-only envelope: same rise and bar 139→147 withdrawal as `amountAt`, but
     * the tail clears to exactly 0 by ~390s so the tar ECU void does not inherit
     * stipple. Plate keeps the shared envelope through bar 151.
     *
     * @param {number} time absolute track time (seconds)
     * @return {number} trace amount, in [0, RECUT_TRACE_PEAK]
     */
    function traceAmountAt(time) {
        if (!ok || !Number.isFinite(time)) {
            return 0;
        }
        if (time <= startTime || time >= endTime) {
            return 0;
        }
        if (time < peakTime) {
            return RECUT_TRACE_PEAK * smoothstep01((time - startTime) / (peakTime - startTime));
        }
        if (time < declineTime) {
            const t = smoothstep01((time - peakTime) / (declineTime - peakTime));
            return RECUT_TRACE_PEAK + (RECUT_TRACE_DECLINE - RECUT_TRACE_PEAK) * t;
        }
        if (time >= RECUT_TRACE_ZERO_TIME) {
            return 0;
        }
        return RECUT_TRACE_DECLINE
            * (1 - smoothstep01((time - declineTime) / (RECUT_TRACE_ZERO_TIME - declineTime)));
    }

    return {
        /**
         * Additive plate strength for this frame; 0 outside the window.
         *
         * Folded into the existing CPU-side plate strength expression before its
         * clamp, so it thickens the plate the trace lives in rather than adding a
         * second grade on top of it.
         *
         * @param {number} timeSeconds absolute track time (seconds)
         * @return {number} strength to add, in [0, RECUT_PLATE_ADD_PEAK]
         */
        plateStrengthAddAt(timeSeconds) {
            return amountAt(timeSeconds, RECUT_PLATE_ADD_PEAK, RECUT_PLATE_ADD_DECLINE);
        },

        /**
         * Forensic trace amount for this frame; 0 outside the window. Drives the
         * `traceCool` uniform on the existing Track 5 plate pass, which both
         * paints the trace onto the lit relic mask and demotes the full-frame
         * salt/ash/scan artifacts toward that same mask.
         *
         * @param {number} timeSeconds absolute track time (seconds)
         * @return {number} trace amount, in [0, RECUT_TRACE_PEAK]
         */
        traceCoolAt(timeSeconds) {
            return traceAmountAt(timeSeconds);
        },

        /** @return {Object} frozen bar/time/amount constants for this window */
        getWindow() {
            return window;
        },

        /** @return {{ ok:boolean, errors:ReadonlyArray<string> }} grid validation */
        validate() {
            return validation;
        }
    };
}

export const RECUT_VISUAL_SCORE_CONSTANTS = Object.freeze({
    RECUT_TRACE_START_BAR,
    RECUT_TRACE_PEAK_BAR,
    RECUT_TRACE_DECLINE_BAR,
    RECUT_TRACE_END_BAR,
    RECUT_TRACE_PEAK,
    RECUT_TRACE_DECLINE,
    RECUT_TRACE_ZERO_TIME,
    RECUT_PLATE_ADD_PEAK,
    RECUT_PLATE_ADD_DECLINE
});
