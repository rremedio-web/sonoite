/**
 * Track 5 recut — `?lehr=1` lookdev bundle.
 *
 * A pure, seek-safe deep module. It answers "how much of the cheap-picture
 * bundle is on at absolute second N" and nothing else. It owns no THREE
 * objects and adds no system: every value is an additive folded into an
 * expression that already exists in experience.js.
 *
 * Gate
 * ----
 * Only constructed when canonical Track 5 recut is already on AND `?lehr=1`.
 * Flag off (or recut off) leaves this module null, so every consuming
 * expression takes its original branch unchanged.
 *
 * Window
 * ------
 * Same 64–504s envelope as recut-atmosphere, with 2s cosine ramps. That is
 * what protects the owner-accepted opening and ending. God ray stays off —
 * recut already deleted it; this bundle uses shell + front haze for lit air.
 *
 * @see recut-atmosphere.js for the measurement that forbids fog and dust-count.
 */

import {
    RECUT_ATMOSPHERE_WINDOW_START,
    RECUT_ATMOSPHERE_WINDOW_END,
    RECUT_ATMOSPHERE_RAMP_SECONDS
} from './recut-atmosphere.js';

export const RECUT_LEHR_WINDOW_START = RECUT_ATMOSPHERE_WINDOW_START;
export const RECUT_LEHR_WINDOW_END = RECUT_ATMOSPHERE_WINDOW_END;
export const RECUT_LEHR_RAMP_SECONDS = RECUT_ATMOSPHERE_RAMP_SECONDS;

/** Wides: raise the floor pool. ECU stays at the shipped ceiling. */
export const RECUT_LEHR_FLOOR_OPACITY_ADD = 0.12;
export const RECUT_LEHR_FLOOR_OPACITY_MAX_ADD = 0.10;

/** Amplitude-only drift boost. Frequency stays shipped so the envelope cannot jump the phase. */
export const RECUT_LEHR_DUST_DRIFT_ADD = 1.15;

/** Extra gobo UV offset amplitude (living-chamber shipped offset is ~0.05). */
export const RECUT_LEHR_GOBO_OFFSET_ADD = 1.4;

/** Darken studio IBL so the relic stops reading as a product shot. */
export const RECUT_LEHR_ENV_MAP_ADD = -0.14;

/** Tiny sheen breath on the clay. */
export const RECUT_LEHR_SHEEN_ADD = 0.10;

/**
 * Roughness hint before tar mutation owns the object (mutationAmountAt starts
 * at 337s). Peak at 300s, then ramps to 0 by 337 so the two never stack.
 */
export const RECUT_LEHR_ROUGHNESS_HINT = 0.07;
export const RECUT_LEHR_ROUGHNESS_HINT_START = 198;
export const RECUT_LEHR_ROUGHNESS_HINT_PEAK = 300;
export const RECUT_LEHR_ROUGHNESS_HINT_END = 337;

/** Lit air on wides. Recut forbids a new god-ray system. */
export const RECUT_LEHR_SHELL_OPACITY_ADD = 0.10;
export const RECUT_LEHR_SHELL_OPACITY_MAX_ADD = 0.08;
export const RECUT_LEHR_HAZE_ADD = 0.055;

/** Dolly-in settle after a cut, world units, ease-out over this many seconds. */
export const RECUT_LEHR_SETTLE_DISTANCE = 0.11;
export const RECUT_LEHR_SETTLE_SECONDS = 0.45;

function cosineRamp(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function smoothstep01(t) {
    if (!(t > 0)) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

/**
 * Distance-selective weight so forensic close-ups do not inherit the wide-room lift.
 *
 * @param {string|null|undefined} framing ShotDirector setup.framing
 * @return {number} 1 on wides, partial on MCU, 0 on ECU
 */
export function lehrWideWeight(framing) {
    const key = String(framing || '').trim().toUpperCase();
    if (key === 'WS' || key === 'WIDE') {
        return 1;
    }
    if (key === 'MCU') {
        return 0.35;
    }
    if (key === 'ECU') {
        return 0;
    }
    return 0.45;
}

/**
 * @param {Object} [options]
 * @return {Object} pure per-frame query surface
 */
export function createRecutLehr(options = {}) {
    const resolve = (value, fallback) => (Number.isFinite(value) ? value : fallback);

    const windowStart = resolve(options.windowStart, RECUT_LEHR_WINDOW_START);
    const windowEnd = resolve(options.windowEnd, RECUT_LEHR_WINDOW_END);
    const span = windowEnd - windowStart;
    const rampSeconds = Math.min(
        Math.max(resolve(options.rampSeconds, RECUT_LEHR_RAMP_SECONDS), 0),
        span > 0 ? span / 2 : 0
    );

    const config = Object.freeze({
        windowStart,
        windowEnd,
        rampSeconds,
        floorOpacityAdd: resolve(options.floorOpacityAdd, RECUT_LEHR_FLOOR_OPACITY_ADD),
        floorOpacityMaxAdd: resolve(options.floorOpacityMaxAdd, RECUT_LEHR_FLOOR_OPACITY_MAX_ADD),
        dustDriftAdd: resolve(options.dustDriftAdd, RECUT_LEHR_DUST_DRIFT_ADD),
        goboOffsetAdd: resolve(options.goboOffsetAdd, RECUT_LEHR_GOBO_OFFSET_ADD),
        envMapAdd: resolve(options.envMapAdd, RECUT_LEHR_ENV_MAP_ADD),
        sheenAdd: resolve(options.sheenAdd, RECUT_LEHR_SHEEN_ADD),
        roughnessHint: resolve(options.roughnessHint, RECUT_LEHR_ROUGHNESS_HINT),
        roughnessHintStart: resolve(options.roughnessHintStart, RECUT_LEHR_ROUGHNESS_HINT_START),
        roughnessHintPeak: resolve(options.roughnessHintPeak, RECUT_LEHR_ROUGHNESS_HINT_PEAK),
        roughnessHintEnd: resolve(options.roughnessHintEnd, RECUT_LEHR_ROUGHNESS_HINT_END),
        shellOpacityAdd: resolve(options.shellOpacityAdd, RECUT_LEHR_SHELL_OPACITY_ADD),
        shellOpacityMaxAdd: resolve(options.shellOpacityMaxAdd, RECUT_LEHR_SHELL_OPACITY_MAX_ADD),
        hazeAdd: resolve(options.hazeAdd, RECUT_LEHR_HAZE_ADD),
        settleDistance: resolve(options.settleDistance, RECUT_LEHR_SETTLE_DISTANCE),
        settleSeconds: resolve(options.settleSeconds, RECUT_LEHR_SETTLE_SECONDS)
    });

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

    function signedScale(amount, envelope) {
        if (!(envelope > 0) || amount === 0) {
            return 0;
        }
        return amount * envelope;
    }

    function scaled(elapsed, amount, framing = null) {
        return signedScale(amount, envelopeAt(elapsed) * lehrWideWeight(framing));
    }

    function roughnessHintAt(elapsed) {
        const envelope = envelopeAt(elapsed);
        if (envelope <= 0 || !Number.isFinite(elapsed)) {
            return 0;
        }
        if (elapsed <= config.roughnessHintStart || elapsed >= config.roughnessHintEnd) {
            return 0;
        }
        if (elapsed <= config.roughnessHintPeak) {
            const u = (elapsed - config.roughnessHintStart)
                / Math.max(config.roughnessHintPeak - config.roughnessHintStart, 0.001);
            return config.roughnessHint * envelope * smoothstep01(u);
        }
        const u = (config.roughnessHintEnd - elapsed)
            / Math.max(config.roughnessHintEnd - config.roughnessHintPeak, 0.001);
        return config.roughnessHint * envelope * smoothstep01(u);
    }

    /**
     * True inside the recut-middle window, inclusive of the first cut at
     * windowStart. Unlike envelopeAt, this is not cosine-ramped — settle has
     * to land on the 64s cut, and the 2s lookdev fade would eat the 0.45s
     * gesture if we scaled by envelope.
     *
     * @param {number} elapsed
     * @return {boolean} Whether elapsed lies in [windowStart, windowEnd).
     */
    function inSettleWindow(elapsed) {
        return Number.isFinite(elapsed)
            && elapsed >= config.windowStart
            && elapsed < config.windowEnd;
    }

    /**
     * World-unit pull-back that eases to 0 after a cut. 0 outside the window
     * and 0 when the cut is older than settleSeconds. Not scaled by the 2s
     * floor/dust ramp, so the first recut cut at 64s actually reads.
     *
     * @param {number} elapsed
     * @param {number} secondsSinceCut
     * @return {number} Pull-back distance in world units.
     */
    function cutSettleAt(elapsed, secondsSinceCut) {
        if (!inSettleWindow(elapsed) || !Number.isFinite(secondsSinceCut) || secondsSinceCut < 0) {
            return 0;
        }
        if (config.settleSeconds <= 0 || secondsSinceCut >= config.settleSeconds) {
            return 0;
        }
        const u = 1 - (secondsSinceCut / config.settleSeconds);
        return config.settleDistance * cosineRamp(u);
    }

    return {
        envelopeAt,
        roughnessHintAt,
        cutSettleAt,
        lehrWideWeight,

        floorOpacityAddAt(elapsed, framing) {
            return scaled(elapsed, config.floorOpacityAdd, framing);
        },
        floorOpacityMaxAddAt(elapsed, framing) {
            return scaled(elapsed, config.floorOpacityMaxAdd, framing);
        },
        dustDriftAddAt(elapsed) {
            return signedScale(config.dustDriftAdd, envelopeAt(elapsed));
        },
        goboOffsetMulAt(elapsed) {
            return 1 + signedScale(config.goboOffsetAdd, envelopeAt(elapsed));
        },
        envMapAddAt(elapsed) {
            return signedScale(config.envMapAdd, envelopeAt(elapsed));
        },
        sheenAddAt(elapsed) {
            return signedScale(config.sheenAdd, envelopeAt(elapsed));
        },
        shellOpacityAddAt(elapsed, framing) {
            return scaled(elapsed, config.shellOpacityAdd, framing);
        },
        shellOpacityMaxAddAt(elapsed, framing) {
            return scaled(elapsed, config.shellOpacityMaxAdd, framing);
        },
        hazeAddAt(elapsed, framing) {
            return scaled(elapsed, config.hazeAdd, framing);
        },
        getConfig() {
            return config;
        }
    };
}
