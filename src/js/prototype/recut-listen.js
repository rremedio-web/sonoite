/**
 * Track 5 recut — `?listen=1` audio punctuation.
 *
 * Two discrete systems, both recut-gated and windowed 64–504s:
 *
 * 1. Commit-on — music picks a held light-law (key/rim/back/temp/vignette)
 *    and the room stays there until the next commit. Not a visualizer:
 *    between commits, zero live audio reaches that law.
 * 2. Rotating accents — each bass-threshold rising edge lights ONE of
 *    rim → floor → bloom, then decays. Never all three. Camera, relic
 *    pose, grade/phase, and god ray stay untouched.
 *
 * Flag off (or recut off) leaves this module null, so every consuming
 * expression takes its original branch unchanged.
 */

import {
    RECUT_ATMOSPHERE_WINDOW_START,
    RECUT_ATMOSPHERE_WINDOW_END,
    RECUT_ATMOSPHERE_RAMP_SECONDS
} from './recut-atmosphere.js';
import { lehrWideWeight } from './recut-lehr.js';

export const RECUT_LISTEN_WINDOW_START = RECUT_ATMOSPHERE_WINDOW_START;
export const RECUT_LISTEN_WINDOW_END = RECUT_ATMOSPHERE_WINDOW_END;
export const RECUT_LISTEN_RAMP_SECONDS = RECUT_ATMOSPHERE_RAMP_SECONDS;

export const RECUT_LISTEN_CHANNELS = Object.freeze(['rim', 'floor', 'bloom']);

/** Held light-law density for the listen A/B — recut middle, not just RELEASE. */
export const RECUT_LISTEN_COMMIT_CONFIG = Object.freeze({
    minIntervalSeconds: 12,
    crossfadeSeconds: 1.6,
    accentThreshold: 0.38,
    armAfterSeconds: RECUT_ATMOSPHERE_WINDOW_START,
    activeWindows: Object.freeze([
        { start: RECUT_ATMOSPHERE_WINDOW_START, end: RECUT_ATMOSPHERE_WINDOW_END }
    ])
});

/** Time between rotating hits. Longer than the decay so only one channel reads. */
export const RECUT_LISTEN_MIN_INTERVAL_SECONDS = 1.4;

/** Cosine fall from 1 → 0. Quarter-note-ish at this track's tempo, not a strobe. */
export const RECUT_LISTEN_DECAY_SECONDS = 0.62;

export const RECUT_LISTEN_RIM_GAIN = 0.483;
export const RECUT_LISTEN_FLOOR_ADD = 0.161;
export const RECUT_LISTEN_FLOOR_MAX_ADD = 0.115;
export const RECUT_LISTEN_BLOOM_ADD = 0.104;
export const RECUT_LISTEN_FLOOR_ACCENT_GAIN = 0.633;
export const RECUT_LISTEN_ECU_BLOOM_WEIGHT = 0.403;

const SEEK_RESET_SECONDS = 0.5;

function cosineRamp(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function resolve(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function pulseAt(firedAt, elapsed, decaySeconds) {
    if (!Number.isFinite(firedAt) || !Number.isFinite(elapsed) || decaySeconds <= 0) {
        return 0;
    }
    const age = elapsed - firedAt;
    if (age < 0 || age >= decaySeconds) {
        return 0;
    }
    return cosineRamp(1 - (age / decaySeconds));
}

/**
 * @param {Object} [options]
 * @return {Object} stateful per-frame query surface (seek-resets on rewind)
 */
export function createRecutListen(options = {}) {
    const windowStart = resolve(options.windowStart, RECUT_LISTEN_WINDOW_START);
    const windowEnd = resolve(options.windowEnd, RECUT_LISTEN_WINDOW_END);
    const span = windowEnd - windowStart;
    const rampSeconds = Math.min(
        Math.max(resolve(options.rampSeconds, RECUT_LISTEN_RAMP_SECONDS), 0),
        span > 0 ? span / 2 : 0
    );
    const minInterval = Math.max(resolve(options.minIntervalSeconds, RECUT_LISTEN_MIN_INTERVAL_SECONDS), 0);
    const decaySeconds = Math.max(resolve(options.decaySeconds, RECUT_LISTEN_DECAY_SECONDS), 0);
    const rimGain = resolve(options.rimGain, RECUT_LISTEN_RIM_GAIN);
    const floorAdd = resolve(options.floorAdd, RECUT_LISTEN_FLOOR_ADD);
    const floorMaxAdd = resolve(options.floorMaxAdd, RECUT_LISTEN_FLOOR_MAX_ADD);
    const bloomAdd = resolve(options.bloomAdd, RECUT_LISTEN_BLOOM_ADD);
    const floorAccentGain = resolve(options.floorAccentGain, RECUT_LISTEN_FLOOR_ACCENT_GAIN);
    const ecuBloomWeight = resolve(options.ecuBloomWeight, RECUT_LISTEN_ECU_BLOOM_WEIGHT);

    const config = Object.freeze({
        windowStart,
        windowEnd,
        rampSeconds,
        minIntervalSeconds: minInterval,
        decaySeconds,
        rimGain,
        floorAdd,
        floorMaxAdd,
        bloomAdd,
        floorAccentGain,
        ecuBloomWeight
    });

    let cursor = 0;
    let lastFireAt = -Infinity;
    let lastElapsed = null;
    let lastChannel = 'none';
    let fireCount = 0;
    const firedAt = {
        rim: -Infinity,
        floor: -Infinity,
        bloom: -Infinity
    };

    const outputs = {
        rim: 0,
        floor: 0,
        bloom: 0,
        rimMul: 1,
        floorAdd: 0,
        floorMaxAdd: 0,
        floorAccent: 0,
        bloomAdd: 0,
        channel: 'none',
        fireCount: 0
    };

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

    function resetPulses() {
        cursor = 0;
        lastFireAt = -Infinity;
        lastChannel = 'none';
        firedAt.rim = -Infinity;
        firedAt.floor = -Infinity;
        firedAt.bloom = -Infinity;
    }

    function writeOutputs(elapsed, framing) {
        const window = envelopeAt(elapsed);
        const wideWeight = lehrWideWeight(framing);
        const bloomWeight = wideWeight > 0 ? 1 : ecuBloomWeight;
        const rim = pulseAt(firedAt.rim, elapsed, config.decaySeconds) * window;
        const floor = pulseAt(firedAt.floor, elapsed, config.decaySeconds) * window * wideWeight;
        const bloom = pulseAt(firedAt.bloom, elapsed, config.decaySeconds) * window * bloomWeight;

        outputs.rim = rim;
        outputs.floor = floor;
        outputs.bloom = bloom;
        outputs.rimMul = 1 + rim * config.rimGain;
        outputs.floorAdd = floor * config.floorAdd;
        outputs.floorMaxAdd = floor * config.floorMaxAdd;
        outputs.floorAccent = floor * config.floorAccentGain;
        outputs.bloomAdd = bloom * config.bloomAdd;
        outputs.channel = lastChannel;
        outputs.fireCount = fireCount;
        return outputs;
    }

    function update(elapsed, _deltaTime, { accentRise = false, framing = null } = {}) {
        if (Number.isFinite(lastElapsed) && Number.isFinite(elapsed) && elapsed < lastElapsed - SEEK_RESET_SECONDS) {
            resetPulses();
        }
        lastElapsed = Number.isFinite(elapsed) ? elapsed : lastElapsed;

        const window = envelopeAt(elapsed);
        const canFire = window > 0
            && accentRise === true
            && Number.isFinite(elapsed)
            && elapsed - lastFireAt >= config.minIntervalSeconds;

        if (canFire) {
            const channel = RECUT_LISTEN_CHANNELS[cursor % RECUT_LISTEN_CHANNELS.length];
            cursor = (cursor + 1) % RECUT_LISTEN_CHANNELS.length;
            if (channel === 'rim') {
                firedAt.rim = elapsed;
            } else if (channel === 'floor') {
                firedAt.floor = elapsed;
            } else {
                firedAt.bloom = elapsed;
            }
            lastFireAt = elapsed;
            lastChannel = channel;
            fireCount += 1;
        }

        return writeOutputs(elapsed, framing);
    }

    return {
        getConfig: () => config,
        envelopeAt,
        update,
        outputs
    };
}
