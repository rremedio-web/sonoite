/**
 * Track 5 recut — plateau rim COMMIT variant (`?rimmode=commit`, recut-only).
 *
 * Owner A/B for the P6 `plateau_rim_pulse` rim behavior (audit 2026-08-13 §8):
 *
 *   A (default)        — continuous follow: `recutLightScore.plateauRimTarget()`
 *                        maps EMA(midNorm) to an absolute rim target every frame.
 *   B (`rimmode=commit`) — this module: the committed/hysteretic philosophy of
 *                        `commit-reactions.js`. Audio never modulates the rim
 *                        continuously; sustained mid-band energy TRIGGERS a
 *                        discrete step between two authored held levels, with
 *                        hysteresis, a sustain requirement, and a minimum hold.
 *                        Between commits, zero audio reaches the light.
 *
 * Same output band as variant A ([1.2, 2.0]) so the two reads differ in
 * philosophy, not brightness range. Stateful by design (like commit-reactions);
 * seek-tolerant — elapsed jumps clamp the internal dt instead of exploding.
 * Touches only the rim base the caller already owns; nothing else.
 */

const PLATEAU_COMMIT_LOW = 1.35;
const PLATEAU_COMMIT_HIGH = 1.9;
// Hysteresis gap: enter high on sustained mid >= 0.60, return low only when
// mid <= 0.38 sustained. Values between the two thresholds hold the last commit.
const PLATEAU_COMMIT_ENTER = 0.60;
const PLATEAU_COMMIT_EXIT = 0.38;
// The threshold must hold this long before a commit fires (kills spikes).
const PLATEAU_COMMIT_SUSTAIN_SECONDS = 0.45;
// A commit holds at least this long before the opposite commit may fire.
const PLATEAU_COMMIT_MIN_HOLD_SECONDS = 6;
// Smoothstep crossfade between held levels once a commit fires.
const PLATEAU_COMMIT_CROSSFADE_SECONDS = 1.2;
// dt clamp makes seeks/tab-restores read as one small step, never a giant one.
const PLATEAU_COMMIT_MAX_DT_SECONDS = 0.1;

export function createPlateauRimCommit() {
    let level = 'low';
    let fromValue = PLATEAU_COMMIT_LOW;
    let toValue = PLATEAU_COMMIT_LOW;
    let blend = 1;
    let lastElapsed = null;
    let sustainSeconds = 0;
    let heldSeconds = Infinity;
    let commitCount = 0;
    let currentValue = PLATEAU_COMMIT_LOW;

    function commit(nextLevel) {
        level = nextLevel;
        fromValue = currentValue;
        toValue = nextLevel === 'high' ? PLATEAU_COMMIT_HIGH : PLATEAU_COMMIT_LOW;
        blend = 0;
        sustainSeconds = 0;
        heldSeconds = 0;
        commitCount += 1;
    }

    return {
        /**
         * Advance the state machine and return the committed rim base.
         *
         * @param {number} elapsed absolute track time (seconds)
         * @param {number} midNorm smoothed mid-band score in [0, 1]
         * @return {number} rim base in [PLATEAU_COMMIT_LOW, PLATEAU_COMMIT_HIGH]
         */
        update(elapsed, midNorm) {
            let dt = 0;
            if (lastElapsed !== null && Number.isFinite(elapsed)) {
                dt = elapsed - lastElapsed;
                if (dt < 0 || dt > PLATEAU_COMMIT_MAX_DT_SECONDS) {
                    dt = PLATEAU_COMMIT_MAX_DT_SECONDS;
                }
            }
            lastElapsed = Number.isFinite(elapsed) ? elapsed : lastElapsed;
            heldSeconds += dt;

            const wantsHigh = level === 'low' && midNorm >= PLATEAU_COMMIT_ENTER;
            const wantsLow = level === 'high' && midNorm <= PLATEAU_COMMIT_EXIT;
            if (wantsHigh || wantsLow) {
                sustainSeconds += dt;
                if (
                    sustainSeconds >= PLATEAU_COMMIT_SUSTAIN_SECONDS
                    && heldSeconds >= PLATEAU_COMMIT_MIN_HOLD_SECONDS
                ) {
                    commit(wantsHigh ? 'high' : 'low');
                }
            } else {
                sustainSeconds = 0;
            }

            if (blend < 1) {
                blend = Math.min(1, blend + dt / PLATEAU_COMMIT_CROSSFADE_SECONDS);
            }
            const ease = blend * blend * (3 - 2 * blend);
            currentValue = fromValue + (toValue - fromValue) * ease;
            return currentValue;
        },

        /** @return {{ level: string, commitCount: number, value: number }} probe state */
        getState() {
            return { level, commitCount, value: currentValue };
        }
    };
}

export const PLATEAU_COMMIT_CONSTANTS = Object.freeze({
    PLATEAU_COMMIT_LOW,
    PLATEAU_COMMIT_HIGH,
    PLATEAU_COMMIT_ENTER,
    PLATEAU_COMMIT_EXIT,
    PLATEAU_COMMIT_SUSTAIN_SECONDS,
    PLATEAU_COMMIT_MIN_HOLD_SECONDS,
    PLATEAU_COMMIT_CROSSFADE_SECONDS
});
