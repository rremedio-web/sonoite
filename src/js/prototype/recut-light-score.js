/* eslint-disable security/detect-object-injection -- all indices here are
   bounded loop counters or offsets into the module's own precomputed schedule
   arrays, never external input. */
/**
 * Track 5 audio-led middle recut — Step 6 light score.
 *
 * A pure, seek-safe deep module (build spec §12 Step 6). It precomputes a
 * deterministic, beat-authored schedule ONCE from the loaded beat grid and then
 * answers per-frame queries with no allocations and no broad scans. It owns four
 * distinct recut-only behaviors, all gated by `?recut=1` at the call site:
 *
 *   1. Climax rim pulses — beat-authored rim/back pulses on every downbeat from
 *      bar 75 through bar 125 (ends before bar 126). Cut/transition bars carry a
 *      stronger authored amplitude via a fixed Set from the 25-cut map. This is
 *      NOT live FFT (maintainer decision, spec §Step 6 climax rim).
 *   2. Plateau EMA — maps an already-smoothed mid-band score to an absolute rim
 *      target on `plateau_rim_pulse` phrases (P6). Separate from climax pulses.
 *   3. Blackout — a single 0.4s full-frame blackout ending exactly on the bar 121
 *      downbeat (P9), consumed by the existing `blackoutPass`.
 *   4. False dawn — the only major post-climax exposure rise (bars 151–160, spec
 *      §6.1 phrase 21): a pure envelope that rises, holds, then steps down over
 *      the final two bars before bar 160.
 *
 * Nothing here touches cameras, objects, the post stack, the floor, the title, or
 * the default film: every query returns a neutral value unless the caller opts in
 * on the recut path.
 */

// --- Climax rim pulses (bars 75–125 inclusive; ends before bar 126) ----------
const RECUT_CLIMAX_START_BAR = 75;
const RECUT_CLIMAX_END_BAR = 125;

// Envelope: attack <= 0.05s, decay in the 0.22–0.30s band, restrained peak rim
// multiplier (1.25–1.45). Cut/transition bars get the stronger authored amp.
const RECUT_CLIMAX_ATTACK_SECONDS = 0.04;
const RECUT_CLIMAX_DECAY_SECONDS = 0.26;
const RECUT_CLIMAX_PULSE_AMP = 0.28; // peak rim multiplier 1.28
const RECUT_CLIMAX_CUT_PULSE_AMP = 0.42; // peak rim multiplier 1.42

// Fixed Set of cut/transition bars inside the climax window, taken verbatim from
// the authoritative 25-cut map (build spec §5). No new user-taste decision — the
// stronger amplitude simply follows where a hard cut already lands.
const RECUT_CLIMAX_CUT_BARS = Object.freeze([
    75, 76, 81, 85, 91, 94, 102, 107, 111, 117, 121
]);

// --- Blackout (single 0.4s window ending on the bar 121 downbeat) ------------
const RECUT_BLACKOUT_BAR = 121;
const RECUT_BLACKOUT_DURATION_SECONDS = 0.4;

// --- Plateau EMA rim target (absolute rim range, spec §6.2 plateau_rim_pulse) -
const RECUT_PLATEAU_RIM_MIN = 1.2;
const RECUT_PLATEAU_RIM_MAX = 2.0;

// --- False dawn (bars 151–160; rise over 1 bar, step-down over final 2 bars) --
const RECUT_FALSE_DAWN_START_BAR = 151;
const RECUT_FALSE_DAWN_END_BAR = 160;
const RECUT_FALSE_DAWN_RISE_BARS = 1;
const RECUT_FALSE_DAWN_STEPDOWN_BARS = 2;

// False-dawn key/rim/exposure gains at full envelope. Tuned against the Step 6
// island checkpoint so the island is the clearly-brightest post-climax moment in
// the recut while p99 stays far under 230 (measured ~40, no bloom wash). Exposure
// is the dominant full-frame lever since the recut deletes the room-reveal/god-ray
// vocabulary: pressure_top base 0.74 + 0.34 -> ~1.07 (just under the 1.1 clamp).
const RECUT_FALSE_DAWN_KEY_GAIN = 0.85;
const RECUT_FALSE_DAWN_RIM_GAIN = 0.90;
const RECUT_FALSE_DAWN_EXPOSURE_DELTA = 0.34;

function clamp01(value) {
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

function downbeatTimeForBar(beatGrid, bar) {
    const beats = Array.isArray(beatGrid?.beats) ? beatGrid.beats : null;
    if (!beats) {
        return null;
    }
    for (let i = 0; i < beats.length; i += 1) {
        const entry = beats[i];
        if (entry && entry.bar === bar && entry.beatInBar === 1
            && Number.isFinite(entry.time)) {
            return entry.time;
        }
    }
    return null;
}

/**
 * Build the recut Step 6 light score from a loaded beat grid.
 *
 * @param {{ beatGrid?: { beats?: Array<{ bar:number, beatInBar:number, time:number }> } }} [options]
 * @return {Object} pure, allocation-free per-frame query surface (see methods).
 */
export function createRecutLightScore({ beatGrid } = {}) {
    // --- Precompute the climax pulse schedule once (sorted, deduped) ----------
    const cutBarSet = new Set(RECUT_CLIMAX_CUT_BARS);
    const pulseBars = [];
    const pulseTimes = [];
    const pulseAmps = [];
    let lastTime = -Infinity;
    for (let bar = RECUT_CLIMAX_START_BAR; bar <= RECUT_CLIMAX_END_BAR; bar += 1) {
        const time = downbeatTimeForBar(beatGrid, bar);
        if (time === null || time <= lastTime) {
            // Skip a missing or non-increasing downbeat rather than emit a
            // malformed/duplicate pulse.
            continue;
        }
        pulseBars.push(bar);
        pulseTimes.push(time);
        pulseAmps.push(cutBarSet.has(bar) ? RECUT_CLIMAX_CUT_PULSE_AMP : RECUT_CLIMAX_PULSE_AMP);
        lastTime = time;
    }
    const pulseWindow = RECUT_CLIMAX_ATTACK_SECONDS + RECUT_CLIMAX_DECAY_SECONDS;
    const pulseCount = pulseTimes.length;
    const lastPulseEnd = pulseCount > 0 ? pulseTimes[pulseCount - 1] + pulseWindow : -Infinity;

    // --- Precompute the single blackout window --------------------------------
    const blackoutEnd = downbeatTimeForBar(beatGrid, RECUT_BLACKOUT_BAR);
    const blackoutStart = blackoutEnd === null
        ? null
        : blackoutEnd - RECUT_BLACKOUT_DURATION_SECONDS;

    // --- Precompute the false-dawn envelope anchors ---------------------------
    const dawnStart = downbeatTimeForBar(beatGrid, RECUT_FALSE_DAWN_START_BAR);
    const dawnRiseEnd = downbeatTimeForBar(
        beatGrid,
        RECUT_FALSE_DAWN_START_BAR + RECUT_FALSE_DAWN_RISE_BARS
    );
    const dawnEnd = downbeatTimeForBar(beatGrid, RECUT_FALSE_DAWN_END_BAR);
    const dawnStepStart = downbeatTimeForBar(
        beatGrid,
        RECUT_FALSE_DAWN_END_BAR - RECUT_FALSE_DAWN_STEPDOWN_BARS
    );

    function falseDawnEnvelopeAt(time) {
        if (dawnStart === null || dawnEnd === null) {
            return 0;
        }
        // 0 before the island and hard 0 at/after bar 160 (step down to the
        // low_key_grazing rig, spec §5 bar 160).
        if (time < dawnStart || time >= dawnEnd) {
            return 0;
        }
        if (dawnRiseEnd !== null && time < dawnRiseEnd) {
            const span = dawnRiseEnd - dawnStart;
            return span > 0 ? clamp01((time - dawnStart) / span) : 1;
        }
        if (dawnStepStart !== null && time >= dawnStepStart) {
            const span = dawnEnd - dawnStepStart;
            return span > 0 ? clamp01((dawnEnd - time) / span) : 0;
        }
        return 1;
    }

    return {
        /**
         * Read-only copy of the precomputed climax pulse schedule (diagnostics /
         * tests only — never called per frame).
         *
         * @return {Array<{ bar:number, time:number, amp:number }>} schedule copy
         */
        getClimaxPulses() {
            const out = [];
            for (let i = 0; i < pulseCount; i += 1) {
                out.push({ bar: pulseBars[i], time: pulseTimes[i], amp: pulseAmps[i] });
            }
            return out;
        },

        /**
         * Rim/back intensity multiplier from the beat-authored climax envelope.
         * 1.0 everywhere outside an active pulse window. Seek-safe (pure of time),
         * no allocation, O(log n) lookup.
         *
         * @param {number} time absolute track time (seconds)
         * @return {number} multiplier in [1, 1 + cutAmp]
         */
        climaxRimMultiplierAt(time) {
            if (pulseCount === 0 || time < pulseTimes[0] || time >= lastPulseEnd) {
                return 1;
            }
            // Largest pulse index with pulseTimes[idx] <= time.
            let lo = 0;
            let hi = pulseCount - 1;
            let idx = -1;
            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                if (pulseTimes[mid] <= time) {
                    idx = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            if (idx < 0) {
                return 1;
            }
            const dt = time - pulseTimes[idx];
            if (dt < 0 || dt >= pulseWindow) {
                return 1;
            }
            const amp = pulseAmps[idx];
            let env;
            if (dt <= RECUT_CLIMAX_ATTACK_SECONDS) {
                env = amp * (dt / RECUT_CLIMAX_ATTACK_SECONDS);
            } else {
                env = amp * (1 - (dt - RECUT_CLIMAX_ATTACK_SECONDS) / RECUT_CLIMAX_DECAY_SECONDS);
            }
            return 1 + (env > 0 ? env : 0);
        },

        /**
         * Absolute rim target for the plateau (P6). Maps the already-smoothed
         * mid-band score to the [1.2, 2.0] rim band. Pure; caller applies it only
         * while the `plateau_rim_pulse` rig is active on the recut path.
         *
         * @param {number} midNorm smoothed mid-band score (clamped internally)
         * @return {number} absolute rim intensity in [1.2, 2.0]
         */
        plateauRimTarget(midNorm) {
            const n = clamp01(midNorm);
            return RECUT_PLATEAU_RIM_MIN + (RECUT_PLATEAU_RIM_MAX - RECUT_PLATEAU_RIM_MIN) * n;
        },

        /** @return {{ start:number|null, end:number|null }} blackout window bounds */
        getBlackoutWindow() {
            return { start: blackoutStart, end: blackoutEnd };
        },

        /**
         * Full-frame blackout opacity: 1 inside the single 0.4s window
         * [start, end) ending on the bar 121 downbeat, 0 everywhere else.
         *
         * @param {number} time absolute track time (seconds)
         * @return {0|1} full-frame blackout opacity
         */
        blackoutOpacityAt(time) {
            if (blackoutStart === null) {
                return 0;
            }
            return (time >= blackoutStart && time < blackoutEnd) ? 1 : 0;
        },

        /** @return {{ start:number|null, riseEnd:number|null, stepStart:number|null, end:number|null }} false-dawn anchors */
        getFalseDawnWindow() {
            return {
                start: dawnStart,
                riseEnd: dawnRiseEnd,
                stepStart: dawnStepStart,
                end: dawnEnd
            };
        },

        /**
         * False-dawn envelope in [0, 1]: 0 before bar 151, ramps up over the first
         * bar, holds, steps down over the final two bars, and is hard 0 at/after
         * bar 160.
         *
         * @param {number} time absolute track time (seconds)
         * @return {number} envelope value in [0, 1]
         */
        falseDawnEnvelopeAt(time) {
            return falseDawnEnvelopeAt(time);
        },

        /**
         * pressure_top key multiplier during the false dawn (1.0 outside).
         * @param {number} time absolute track time (seconds)
         * @return {number} key intensity multiplier
         */
        falseDawnKeyMultiplierAt(time) {
            return 1 + falseDawnEnvelopeAt(time) * RECUT_FALSE_DAWN_KEY_GAIN;
        },

        /**
         * pressure_top rim multiplier during the false dawn (1.0 outside).
         * @param {number} time absolute track time (seconds)
         * @return {number} rim intensity multiplier
         */
        falseDawnRimMultiplierAt(time) {
            return 1 + falseDawnEnvelopeAt(time) * RECUT_FALSE_DAWN_RIM_GAIN;
        },

        /**
         * Additive tone-mapping exposure delta during the false dawn (0 outside).
         * @param {number} time absolute track time (seconds)
         * @return {number} additive exposure delta
         */
        falseDawnExposureDeltaAt(time) {
            return falseDawnEnvelopeAt(time) * RECUT_FALSE_DAWN_EXPOSURE_DELTA;
        }
    };
}

export const RECUT_LIGHT_SCORE_CONSTANTS = Object.freeze({
    RECUT_CLIMAX_START_BAR,
    RECUT_CLIMAX_END_BAR,
    RECUT_CLIMAX_ATTACK_SECONDS,
    RECUT_CLIMAX_DECAY_SECONDS,
    RECUT_CLIMAX_PULSE_AMP,
    RECUT_CLIMAX_CUT_PULSE_AMP,
    RECUT_CLIMAX_CUT_BARS,
    RECUT_BLACKOUT_BAR,
    RECUT_BLACKOUT_DURATION_SECONDS,
    RECUT_PLATEAU_RIM_MIN,
    RECUT_PLATEAU_RIM_MAX,
    RECUT_FALSE_DAWN_START_BAR,
    RECUT_FALSE_DAWN_END_BAR,
    RECUT_FALSE_DAWN_RISE_BARS,
    RECUT_FALSE_DAWN_STEPDOWN_BARS,
    RECUT_FALSE_DAWN_KEY_GAIN,
    RECUT_FALSE_DAWN_RIM_GAIN,
    RECUT_FALSE_DAWN_EXPOSURE_DELTA
});
