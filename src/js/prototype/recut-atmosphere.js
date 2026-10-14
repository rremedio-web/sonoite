/**
 * Track 5 audio-led middle recut — Stage 2a atmosphere.
 *
 * A pure, seek-safe deep module. It answers "how much air is in the chamber at
 * absolute second N" and nothing else. It owns no THREE objects, allocates no
 * state per frame, reads no clock, and adds no system to the scene: every value
 * it returns is folded into an expression that already exists in `experience.js`
 * (fog density, dust opacity, `scene.background`). experience.js builds it only on
 * the canonical Track 5 film with `?recut=1`; otherwise it stays null and every
 * consuming expression keeps its original branch.
 *
 * Why this exists
 * ---------------
 * The Stage 1A+B baseline measured the recut wides past information loss:
 * background luma mean 0.65–2.05, border crush 82–99%, and 28–33 of 40 tile-grid
 * cells carrying no information at all. The ECU/MCU forensic shots are the
 * opposite and must not move. So the lift has to be *distance-selective* and it
 * has to leave the owner-accepted opening and ending untouched.
 *
 * What the measurement actually said (Stage 2a live sweep, paused exact seek,
 * 13s settle, 8x5 tile grid, crush threshold luma <= 2)
 * ---------------------------------------------------------------------------
 * The void in the wides is NOT fogged geometry — it is `scene.background`, the
 * clear colour, which fog cannot reach. Three independent probes agree:
 *
 *   - Fog DENSITY. Raising it removes information instead of adding it. At bar
 *     102 the empty-tile count went 32/40 -> 36/40 between density 0.038 and
 *     0.075, and at bar 85 it went 22/40 -> 30/40, because the only lit
 *     background signal converges on the near-black fog colour `#080a12`. Past
 *     ~0.067 the fog starts eating the subject too (bar 85 occupancy
 *     1.55% -> 0.02%).
 *   - Fog COLOUR. Repainting the fog `#080a12` -> `#262019` with no background
 *     lift moved bar 102 only 33/40 -> 30/40 and left bar 85 at 28/40. There is
 *     almost no fogged geometry in those frames to catch the colour.
 *   - DUST. 128–420 points of size 0.038 render ~2px at wide distances, so they
 *     cover well under 0.2% of a 160x144 tile. Dust cannot move a crush metric
 *     at all: bar 43 occupancy was 56.157% with the additive and 56.284% without.
 *
 * So fog is left at its shipped ceiling with a zero additive — spending void
 * luma on it would work directly against the objective — and the two levers that
 * are actually used are the dust (brought from invisible into visibility, which
 * is what reads as air and costs nothing on any gate) and a restrained blend of
 * `scene.background` toward a warm-neutral dark, which is the only mechanism in
 * scope that reaches the void at all. It is a lift off the crush floor, not a
 * grade change, and outside the window it is exactly zero.
 *
 * Why the background lift is capped at 0.40
 * -----------------------------------------
 * The lift is global — it reaches the void behind the ECUs too, and the ECU runs
 * at exposure ~0.99 versus ~0.72 on the wides, so the same blend is amplified
 * there. Measured `ecu_ridge_dry` (bar 43) subject occupancy against lift:
 *
 *     0.00 -> 50.04%   0.42 -> 54.75%   0.58 -> 56.10%   0.90 -> 57.60%
 *     0.40 -> 54.53%   0.50 -> 55.49%   0.62 -> 56.35%   1.00 -> 58.42%
 *
 * The Stage 1A+B ECU baseline is 49.9%, so the "ECUs untouched" ceiling (+10%)
 * is 54.90% — reached at lift ~0.43. The wides do not clear their own tile gate
 * until the lift is far past that. 0.40 is therefore the largest lift that keeps
 * the owner's protected forensic material inside its tolerance; the remaining
 * gap on the two hardest wides is reported, not forced.
 *
 * Window
 * ------
 * The envelope is 0 before 64.0s and after 504.0s with 2.0s cosine ramps at each
 * edge. That is what protects the owner-accepted opening (0–64s) and ending
 * (504s+): outside the window every query returns the neutral value, so the head
 * and tail render from the same expressions with the same numbers as today.
 *
 * Purity contract
 * ---------------
 * Every query is a pure function of absolute `elapsed` seconds. No accumulated
 * state, no frame counters, no randomness, no clock reads. Seeking to any time
 * gives the same value as playing to it, and evaluating times in any order gives
 * the same results. Non-finite input returns the neutral value.
 */

// --- Window (protects the accepted head and tail) ---------------------------
export const RECUT_ATMOSPHERE_WINDOW_START = 64.0;
export const RECUT_ATMOSPHERE_WINDOW_END = 504.0;
export const RECUT_ATMOSPHERE_RAMP_SECONDS = 2.0;

// --- Fog --------------------------------------------------------------------
// Deliberately a measured no-op. Both fog levers were probed live and both cost
// the wides information rather than adding it (see the module header), so the
// recut keeps the shipped 0.008–0.04 clamp and adds nothing. The queries stay in
// the interface because the fog is the correct place for a future *warm* fog
// colour to hang off, but until that is authored, spending void luma here would
// work against the whole point of the stage.
export const RECUT_ATMOSPHERE_FOG_DENSITY_MAX = 0.04;
export const RECUT_ATMOSPHERE_FOG_DENSITY_ADD = 0;
const BASE_FOG_DENSITY_MAX = 0.04;

// --- Dust -------------------------------------------------------------------
// The shipped 128 points sit at a measured 0.049 opacity, i.e. invisible even at
// 3x diagnostic gain. This is the cheapest real depth cue in the chamber and it is
// already wired to the living chamber's `dustMul` breath, so opening the opacity
// gives the wides motes and parallax without adding a system. Measured cost on the
// protected ECU: zero (bar 43 occupancy 56.157% with the additive, 56.284%
// without). `dustSize` is deliberately NOT raised — the points must stay motes.
//
// The particle COUNT is deliberately left alone. It is fixed at construction, so
// unlike everything else here it cannot be windowed: raising it to 384 measurably
// changed the owner-accepted opening (0.0217 mean abs luma at 40.0s against a
// 0.0061 same-build noise floor) even though every envelope value is exactly zero
// there. A change that cannot be windowed does not belong in this stage.
//
// The ceiling is headroom, not a target: at the tuned additive the runtime dust
// opacity peaks around 0.13, so this clamp does not bind. It exists so the
// existing chamber-breath modulation cannot be silently clipped.
export const RECUT_ATMOSPHERE_DUST_OPACITY_MAX = 0.22;
export const RECUT_ATMOSPHERE_DUST_OPACITY_ADD = 0.10;
const BASE_DUST_OPACITY_MAX = 0.16;

// --- Background lift --------------------------------------------------------
// Warm-neutral dark, deliberately not blue: the film is warm-neutral and the
// existing background already lerps `#05070c` -> `#17100d`. The lift blends the
// *composed* background toward this colour, so the film's own temperature arc is
// preserved and only the floor moves.
export const RECUT_ATMOSPHERE_LIFT_COLOR = '#1b1714';
export const RECUT_ATMOSPHERE_BACKGROUND_LIFT = 0.40;

function cosineRamp(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/**
 * Non-finite or wrong-typed option fields fall back to the authored constants,
 * so a bad override can never put NaN on screen.
 *
 * @param {Object} [options] optional overrides of the authored constants
 * @return {Object} pure, allocation-free per-frame query surface (see methods)
 */
export function createRecutAtmosphere(options = {}) {
    const resolve = (value, fallback) => (Number.isFinite(value) ? value : fallback);

    const windowStart = resolve(options.windowStart, RECUT_ATMOSPHERE_WINDOW_START);
    const windowEnd = resolve(options.windowEnd, RECUT_ATMOSPHERE_WINDOW_END);
    const span = windowEnd - windowStart;
    // A ramp can never eat more than half the window from either edge.
    const rampSeconds = Math.min(
        Math.max(resolve(options.rampSeconds, RECUT_ATMOSPHERE_RAMP_SECONDS), 0),
        span > 0 ? span / 2 : 0
    );

    const config = Object.freeze({
        windowStart,
        windowEnd,
        rampSeconds,
        fogDensityAdd: resolve(options.fogDensityAdd, RECUT_ATMOSPHERE_FOG_DENSITY_ADD),
        fogDensityMax: resolve(options.fogDensityMax, RECUT_ATMOSPHERE_FOG_DENSITY_MAX),
        fogDensityMaxBase: BASE_FOG_DENSITY_MAX,
        dustOpacityAdd: resolve(options.dustOpacityAdd, RECUT_ATMOSPHERE_DUST_OPACITY_ADD),
        dustOpacityMax: resolve(options.dustOpacityMax, RECUT_ATMOSPHERE_DUST_OPACITY_MAX),
        dustOpacityMaxBase: BASE_DUST_OPACITY_MAX,
        backgroundLift: resolve(options.backgroundLift, RECUT_ATMOSPHERE_BACKGROUND_LIFT),
        backgroundLiftColor: typeof options.backgroundLiftColor === 'string'
            ? options.backgroundLiftColor
            : RECUT_ATMOSPHERE_LIFT_COLOR
    });

    /**
     * Window envelope: 0 before the start, cosine-ramped up over `rampSeconds`,
     * 1.0 across the middle, cosine-ramped down to 0 exactly at the end.
     *
     * @param {number} elapsed absolute track time (seconds)
     * @return {number} envelope value in [0, 1]
     */
    function envelopeAt(elapsed) {
        if (!Number.isFinite(elapsed)) {
            return 0;
        }
        if (elapsed <= config.windowStart || elapsed >= config.windowEnd) {
            return 0;
        }
        if (config.rampSeconds <= 0) {
            return 1;
        }
        const rise = (elapsed - config.windowStart) / config.rampSeconds;
        const fall = (config.windowEnd - elapsed) / config.rampSeconds;
        const t = Math.min(rise, fall, 1);
        return cosineRamp(t);
    }

    return {
        envelopeAt,

        /**
         * Additive fog density for this frame; 0 outside the window.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @return {number} density to add to the shipped fog expression
         */
        fogDensityAddAt(elapsed) {
            return config.fogDensityAdd * envelopeAt(elapsed);
        },

        /**
         * The fog-density clamp ceiling to use this frame.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @return {number} ceiling, never below the shipped 0.04
         */
        fogDensityMaxAt(elapsed) {
            const envelope = envelopeAt(elapsed);
            return config.fogDensityMaxBase
                + (config.fogDensityMax - config.fogDensityMaxBase) * envelope;
        },

        /**
         * Additive dust opacity for this frame; 0 outside the window.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @return {number} opacity to add to the shipped dust drive sum
         */
        dustOpacityAddAt(elapsed) {
            return config.dustOpacityAdd * envelopeAt(elapsed);
        },

        /**
         * The dust-opacity clamp ceiling to use this frame.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @return {number} ceiling, never below the shipped 0.16
         */
        dustOpacityMaxAt(elapsed) {
            const envelope = envelopeAt(elapsed);
            return config.dustOpacityMaxBase
                + (config.dustOpacityMax - config.dustOpacityMaxBase) * envelope;
        },

        /**
         * Blend amount of the composed background toward the lift colour.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @return {number} blend in [0, backgroundLift]
         */
        backgroundLiftAt(elapsed) {
            return config.backgroundLift * envelopeAt(elapsed);
        },

        /** @return {Object} frozen copy of the resolved constants */
        getConfig() {
            return config;
        }
    };
}
