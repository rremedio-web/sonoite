/**
 * Track 1 sonoite-cinema — visible practical light sources (CONSECRATE v3.4).
 *
 * Seven authored practicals ignite one per phrase from true black; schedule math
 * is pure and exported for unit tests. THREE objects live only in createChamberPracticals.
 * Fire is implied by light only — glow seeds, breath flicker, breathing shadows.
 *
 * Light counts: cinema/high 7, balanced 5, safe 3 (ring uses one consolidated PointLight).
 *
 * Not part of the default Track 1 route: since September the quiet scene (usesQuietScene() in
 * experience.js) is the Track 1 default and setupChamberPracticals() skips this rig. It runs only
 * with `?scene=original`, and never with a `?proposal=` or `?practicals=0`. chamber-sodium.js also
 * reuses the pure Kelvin and candle-breath helpers. See docs/qa/TRACK1_QUIET_SCENE_STUDY_2026-09-05.md.
 */

/** HUSH window — dims fill practicals, cools color (~400K). */
export const PRACTICAL_HUSH_START = 316.65;
export const PRACTICAL_HUSH_END = 366.8;
export const PRACTICAL_HUSH_EDGE_SECONDS = 2.8;

/** Climax room_open mirror — ×1.25 on all lit practicals, no bump at 411.5 crush. */
export const PRACTICAL_CLIMAX_START = 384.03;
export const PRACTICAL_CLIMAX_DURATION = 14;
export const PRACTICAL_CLIMAX_ATTACK = 1.1;
export const PRACTICAL_CLIMAX_RELEASE = 4.2;
export const PRACTICAL_CLIMAX_BUMP = 0.25;

/** 375.05 physical detonation — white-hot flash (distinct from 384.03 room reveal). */
export const PRACTICAL_DETONATION_AT = 375.05;
export const PRACTICAL_DETONATION_FLASH_SECONDS = 0.42;
export const PRACTICAL_DETONATION_BUMP = 2.4;

/** MEMORY slow decay before the final snap. */
export const PRACTICAL_MEMORY_START = 488.5;
export const PRACTICAL_MEMORY_END = 535;
export const PRACTICAL_MEMORY_TARGET = 0.55;

/** Final snap — all die except P1 votive. */
export const PRACTICAL_SNAP_AT = 535;
export const PRACTICAL_SNAP_SECONDS = 0.4;
export const PRACTICAL_P1_SNAP_INTENSITY = 0.16;
export const PRACTICAL_P1_SNAP_KELVIN = 1850;

/** Vigil test — candle Kelvin aging from ignition to snap (−350K linear). */
export const PRACTICAL_AGE_SHIFT_TOTAL_K = 350;
export const PRACTICAL_HUSH_KELVIN_DELTA = 400;

/** Extinction smoke at snap — one thread per lit practical (?vigil=1 only). */
export const EXTINCTION_SMOKE_AT = PRACTICAL_SNAP_AT;
export const EXTINCTION_SMOKE_DURATION = 6;
export const EXTINCTION_SMOKE_RISE = 1.6;
export const EXTINCTION_SMOKE_PEAK_OPACITY = 0.12;
export const EXTINCTION_SMOKE_WIDTH_START = 0.05;
export const EXTINCTION_SMOKE_WIDTH_END = 0.18;
const EXTINCTION_SMOKE_COLOR = '#8a8a92';

export const PRACTICAL_IGNITE_ATTACK_SECONDS = 0.6;
export const PRACTICAL_KISS_PEAK_MUL = 1.6;

/** Authored guttering — one practical each, never overlapping (pure schedule). */
export const PRACTICAL_GUTTER_DIP = 0.6;
export const PRACTICAL_GUTTER_DIP_SECONDS = 0.4;
export const PRACTICAL_GUTTER_WAVER_SECONDS = 1.2;
export const PRACTICAL_GUTTER_RECOVER_SECONDS = 1.8;
export const PRACTICAL_GUTTER_EVENTS = Object.freeze([
    { id: 'p2_votive_right', atSeconds: 171 },
    { id: 'p7_lantern_rear', atSeconds: 262 },
    { id: 'p3_sconce_left', atSeconds: 427 }
]);

const P1_ID = 'p1_votive_first';
const P4_ID = 'p4_sconce_right';
const SHADOW_CAST_IDS = new Set([P1_ID, P4_ID]);
const PRACTICAL_SHADOW_MAP_SIZE = 512;
const PRACTICAL_SHADOW_RADIUS = 3;

const HOLDER_COLOR = 0x0a0806;
const HOLDER_EMISSIVE = 0x1a1208;
const HOLDER_EMISSIVE_INTENSITY = 0.06;
const GLOW_SEED_CORE_HEX = '#FFF8E7';
const GLOW_SEED_HDR_MUL = 4.6;
const GLOW_SEED_AMBER_LERP = 0.4;
const GLOW_SEED_SCALE = Object.freeze({
    votive: 0.10,
    sconce: 0.12,
    lantern: 0.14,
    ring: 0.09
});
const ATMO_HALO_SIZE_MUL_MIN = 4.5;
const ATMO_HALO_SIZE_MUL_MAX = 5.8;
const ATMO_HALO_OPACITY_MIN = 0.07;
const ATMO_HALO_OPACITY_MAX = 0.12;
const ATMO_HALO_BREATH_AMP_RATIO = 0.4;

/** v3.4b consecration haze arc — lit air follows ignition / HUSH / climax / MEMORY. */
export const CONSECRATION_HAZE_HUSH_MUL = 0.34;
export const CONSECRATION_HAZE_CLIMAX_ADD = 0.34;
export const CONSECRATION_HAZE_MEMORY_FLOOR = 0.48;
const WALL_WASH_BASE_OPACITY = 0.05;
const LANTERN_SEED_LIFT_Y = 0.30;
const LANTERN_CAGE_BAR_SIZE = 0.014;
const POOL_RADIUS_MUL = 1.4;
const POOL_OPACITY_MUL = 2.0;

const BREATH_SLOW_FREQ_MIN = 0.9;
const BREATH_SLOW_FREQ_MAX = 1.4;
const BREATH_SLOW_AMP = 0.05;
const BREATH_TREMOR_FREQ_MIN = 6;
const BREATH_TREMOR_FREQ_MAX = 8;
const BREATH_TREMOR_AMP = 0.015;
const GLOW_SEED_OPACITY_AMP_RATIO = 0.6;
const GUTTER_WAVER_AMP = 0.05;

/** Authored amber-gold hexes — Kelvin alone reads too red under AgX at low intensity. */
const PRACTICAL_AMBER_HEX = new Map(Object.entries({
    1500: '#ffc07a',
    1600: '#ffba70',
    1800: '#ffb46a',
    1900: '#ffd4a0',
    2000: '#ffc888',
    2100: '#ffa85a',
    2200: '#ffc078',
    2300: '#ffb868',
    2400: '#ffb058',
    2500: '#ffa850',
    2800: '#ffa048'
}));

function smoothstep01(t) {
    if (!(t > 0)) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Stable phase offsets per practical id (deterministic hash).
 *
 * @param {string} practicalId
 * @return {number[]} Three phase offsets in radians.
 */
export function hashPracticalPhaseOffsets(practicalId) {
    let hash = 0;
    const id = String(practicalId || '');
    for (let index = 0; index < id.length; index += 1) {
        hash = ((hash * 31) + id.charCodeAt(index)) % 1000003;
    }
    const seed = hash + 1;
    return [0, 1, 2].map((freqIndex) => (
        ((seed * (freqIndex + 1) * 0.6180339887) % 1) * Math.PI * 2
    ));
}

/**
 * Per-practical slow breath frequency (0.9–1.4 Hz) from hash.
 *
 * @param {string} practicalId
 * @return {number} Slow breath frequency in Hz.
 */
export function breathSlowFreqForPractical(practicalId) {
    const phase = hashPracticalPhaseOffsets(practicalId)[0];
    const unit = ((phase / (Math.PI * 2)) + 1) % 1;
    return BREATH_SLOW_FREQ_MIN + unit * (BREATH_SLOW_FREQ_MAX - BREATH_SLOW_FREQ_MIN);
}

/**
 * Per-practical micro-tremor frequency (6–8 Hz) from hash.
 *
 * @param {string} practicalId
 * @return {number} Micro-tremor frequency in Hz.
 */
export function breathTremorFreqForPractical(practicalId) {
    const phase = hashPracticalPhaseOffsets(practicalId)[1];
    const unit = ((phase / (Math.PI * 2)) + 1) % 1;
    return BREATH_TREMOR_FREQ_MIN + unit * (BREATH_TREMOR_FREQ_MAX - BREATH_TREMOR_FREQ_MIN);
}

/**
 * Authored guttering envelope — dip, waver, recover (deterministic).
 *
 * @param {string} practicalId
 * @param {number} elapsed
 * @return {number} Intensity multiplier (0.55–1.0 during event).
 */
export function sampleGutteringMul(practicalId, elapsed) {
    if (!Number.isFinite(elapsed)) {
        return 1;
    }
    const event = PRACTICAL_GUTTER_EVENTS.find((entry) => entry.id === practicalId);
    if (!event) {
        return 1;
    }

    const t = elapsed - event.atSeconds;
    if (t < 0) {
        return 1;
    }

    const dipEnd = PRACTICAL_GUTTER_DIP_SECONDS;
    const waverEnd = dipEnd + PRACTICAL_GUTTER_WAVER_SECONDS;
    const recoverEnd = waverEnd + PRACTICAL_GUTTER_RECOVER_SECONDS;

    if (t >= recoverEnd) {
        return 1;
    }

    if (t <= dipEnd) {
        const dipT = smoothstep01(t / dipEnd);
        return 1 + (PRACTICAL_GUTTER_DIP - 1) * dipT;
    }

    if (t <= waverEnd) {
        const waverT = (t - dipEnd) / PRACTICAL_GUTTER_WAVER_SECONDS;
        const wobble = Math.sin(waverT * Math.PI * 5) * GUTTER_WAVER_AMP;
        return PRACTICAL_GUTTER_DIP + wobble;
    }

    const recoverT = smoothstep01((t - waverEnd) / PRACTICAL_GUTTER_RECOVER_SECONDS);
    return PRACTICAL_GUTTER_DIP + (1 - PRACTICAL_GUTTER_DIP) * recoverT;
}

/**
 * Layered candle breath — slow breath + micro-tremor, phase-offset per practical.
 *
 * @param {string} practicalId
 * @param {number} elapsed
 * @return {{ intensityMul: number, glowOpacityMul: number, poolOpacityMul: number }} Breath multipliers.
 */
export function sampleCandleBreath(practicalId, elapsed) {
    if (!Number.isFinite(elapsed)) {
        return { intensityMul: 1, glowOpacityMul: 1, poolOpacityMul: 1 };
    }

    const phases = hashPracticalPhaseOffsets(practicalId);
    const slowFreq = breathSlowFreqForPractical(practicalId);
    const tremorFreq = breathTremorFreqForPractical(practicalId);
    const slow = Math.sin((Math.PI * 2 * slowFreq * elapsed) + phases[0]) * BREATH_SLOW_AMP;
    const tremor = Math.sin((Math.PI * 2 * tremorFreq * elapsed) + phases[1]) * BREATH_TREMOR_AMP;
    const combined = slow + tremor;
    const gutter = sampleGutteringMul(practicalId, elapsed);
    const breathMul = 1 + combined;

    return {
        intensityMul: breathMul * gutter,
        glowOpacityMul: 1 + combined * GLOW_SEED_OPACITY_AMP_RATIO,
        haloOpacityMul: 1 + combined * ATMO_HALO_BREATH_AMP_RATIO,
        poolOpacityMul: breathMul
    };
}

/**
 * Back-compat alias — returns candle-breath multipliers under legacy field names.
 *
 * @param {string} practicalId
 * @param {number} elapsed
 * @return {{ intensityMul: number, hdrMul: number, haloOpacityMul: number }} Legacy breath multipliers.
 */
export function sampleFlameFlicker(practicalId, elapsed) {
    const breath = sampleCandleBreath(practicalId, elapsed);
    return {
        intensityMul: breath.intensityMul,
        hdrMul: breath.intensityMul,
        haloOpacityMul: breath.poolOpacityMul
    };
}

/**
 * Approximate black-body RGB for authored Kelvin (sRGB 0–1).
 *
 * @param {number} kelvin
 * @return {{ r: number, g: number, b: number }} Normalized sRGB components.
 */
export function kelvinToRgb(kelvin) {
    const temp = Math.max(1000, kelvin) / 100;
    let r = 0;
    let g = 0;
    let b = 0;

    if (temp <= 66) {
        r = 255;
        g = 99.4708025861 * Math.log(temp) - 161.1195681661;
        if (temp <= 19) {
            b = 0;
        } else {
            b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
        }
    } else {
        r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
        g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
        b = 255;
    }

    return {
        r: clamp(r, 0, 255) / 255,
        g: clamp(g, 0, 255) / 255,
        b: clamp(b, 0, 255) / 255
    };
}

const PRACTICAL_AMBER_KELVIN_KEYS = Object.freeze(
    [...PRACTICAL_AMBER_HEX.keys()].sort((a, b) => a - b)
);

function parseHexChannel(hex, start) {
    return parseInt(hex.slice(start, start + 2), 16);
}

function lerpHexColor(hexA, hexB, t) {
    const mixT = clamp(t, 0, 1);
    const a = String(hexA || '#000000').replace('#', '');
    const b = String(hexB || '#000000').replace('#', '');
    const channels = [0, 2, 4].map((start) => (
        Math.round(parseHexChannel(a, start) + (parseHexChannel(b, start) - parseHexChannel(a, start)) * mixT)
    ));
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(channels[0])}${hex(channels[1])}${hex(channels[2])}`;
}

/**
 * Authored amber hex for Kelvin — interpolates between map keys; nearest fallback only.
 *
 * @param {number} kelvin
 * @return {string} Hex color in the amber band (never the computed-red path).
 */
export function authoredAmberHexForKelvin(kelvin) {
    const exact = PRACTICAL_AMBER_HEX.get(kelvin);
    if (exact) {
        return exact;
    }

    const keys = PRACTICAL_AMBER_KELVIN_KEYS;
    if (keys.length === 0) {
        const { r, g, b } = kelvinToRgb(kelvin);
        const toByte = (c) => Math.round(clamp(c, 0, 1) * 255);
        const hex = (n) => n.toString(16).padStart(2, '0');
        return `#${hex(toByte(r))}${hex(toByte(g))}${hex(toByte(b))}`;
    }

    if (kelvin <= keys.at(0)) {
        return PRACTICAL_AMBER_HEX.get(keys.at(0));
    }
    if (kelvin >= keys.at(-1)) {
        return PRACTICAL_AMBER_HEX.get(keys.at(-1));
    }

    /* eslint-disable security/detect-object-injection -- fixed authored Kelvin roster */
    for (let index = 0; index < keys.length - 1; index += 1) {
        const lowKelvin = keys[index];
        const highKelvin = keys[index + 1];
        if (kelvin >= lowKelvin && kelvin <= highKelvin) {
            const t = (kelvin - lowKelvin) / (highKelvin - lowKelvin);
            return lerpHexColor(
                PRACTICAL_AMBER_HEX.get(lowKelvin),
                PRACTICAL_AMBER_HEX.get(highKelvin),
                t
            );
        }
    }

    let nearestKelvin = keys[0];
    let nearestDistance = Math.abs(keys[0] - kelvin);
    for (let index = 1; index < keys.length; index += 1) {
        const distance = Math.abs(keys[index] - kelvin);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestKelvin = keys[index];
        }
    }
    /* eslint-enable security/detect-object-injection */
    return PRACTICAL_AMBER_HEX.get(nearestKelvin);
}

function kelvinToHex(kelvin) {
    const exact = PRACTICAL_AMBER_HEX.get(kelvin);
    if (exact) {
        return exact;
    }

    let nearestKelvin = null;
    let nearestDistance = Infinity;
    PRACTICAL_AMBER_HEX.forEach((hex, authoredKelvin) => {
        const distance = Math.abs(authoredKelvin - kelvin);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestKelvin = authoredKelvin;
        }
    });

    if (nearestKelvin !== null) {
        return PRACTICAL_AMBER_HEX.get(nearestKelvin);
    }

    const { r, g, b } = kelvinToRgb(kelvin);
    const toByte = (c) => Math.round(clamp(c, 0, 1) * 255);
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(toByte(r))}${hex(toByte(g))}${hex(toByte(b))}`;
}

export { kelvinToHex };

/**
 * 375.05 detonation flash envelope — narrow spike for the loudest instant.
 *
 * @param {number} elapsed
 * @return {number} 0–1 flash envelope
 */
export function sampleDetonationEnvelope(elapsed) {
    if (!Number.isFinite(elapsed)) {
        return 0;
    }
    const start = PRACTICAL_DETONATION_AT;
    const end = start + PRACTICAL_DETONATION_FLASH_SECONDS;
    if (elapsed < start || elapsed > end) {
        return 0;
    }
    const mid = start + PRACTICAL_DETONATION_FLASH_SECONDS * 0.18;
    if (elapsed <= mid) {
        return smoothstep01((elapsed - start) / (mid - start));
    }
    return 1 - smoothstep01((elapsed - mid) / (end - mid));
}

/**
 * Count practicals with non-zero ignition envelope at elapsed.
 *
 * @param {number}           elapsed
 * @param {ReadonlyArray<*>} [roster] Quality-filtered practical roster
 * @return {number} Lit count 0–7
 */
export function countLitPracticals(elapsed, roster = SONOITE_PRACTICALS) {
    if (!Number.isFinite(elapsed)) {
        return 0;
    }
    return roster.reduce((count, practical) => (
        sampleIgnitionEnvelope(elapsed, practical.igniteAt) > 0 ? count + 1 : count
    ), 0);
}

/**
 * Warm aggregate wrap factor tied to ignition count (0–1).
 *
 * @param {number}           elapsed
 * @param {ReadonlyArray<*>} [roster] Quality-filtered practical roster
 * @return {number} Wrap strength for relic-side practical modeling
 */
export function samplePracticalWarmWrap(elapsed, roster = SONOITE_PRACTICALS) {
    const lit = countLitPracticals(elapsed, roster);
    if (lit <= 0) {
        return 0;
    }
    return clamp(lit / SONOITE_PRACTICALS.length, 0, 1);
}

/**
 * HUSH haze multiplier — air stills with held breath (pure schedule).
 *
 * @param {number} elapsed
 * @return {number} Haze scale during HUSH (drops toward CONSECRATION_HAZE_HUSH_MUL).
 */
export function sampleConsecrationHushHazeMul(elapsed) {
    if (!Number.isFinite(elapsed)) {
        return 1;
    }
    const start = PRACTICAL_HUSH_START;
    const end = PRACTICAL_HUSH_END;
    const edge = PRACTICAL_HUSH_EDGE_SECONDS;
    const target = CONSECRATION_HAZE_HUSH_MUL;

    if (elapsed <= start - edge || elapsed >= end + edge) {
        return 1;
    }

    if (elapsed >= start + edge && elapsed < end - edge) {
        return target;
    }

    if (elapsed < start + edge) {
        const enterT = smoothstep01((elapsed - (start - edge)) / (2 * edge));
        return 1 + (target - 1) * enterT;
    }

    const exitT = smoothstep01((elapsed - (end - edge)) / (2 * edge));
    return target + (1 - target) * exitT;
}

/**
 * Consecration haze presence arc — builds with ignitions, drops in HUSH,
 * swells at the 384 reveal, settles in MEMORY.
 *
 * @param {number}           elapsed
 * @param {ReadonlyArray<*>} [roster] Quality-filtered practical roster
 * @return {number} Haze presence 0–1 (light-responsive; 0 before first ignition).
 */
export function sampleConsecrationHazeArc(elapsed, roster = SONOITE_PRACTICALS) {
    if (!Number.isFinite(elapsed)) {
        return 0;
    }

    const ignition = samplePracticalWarmWrap(elapsed, roster);
    if (ignition <= 0) {
        return 0;
    }

    const hushMul = sampleConsecrationHushHazeMul(elapsed);
    const climaxAdd = sampleClimaxEnvelope(elapsed) * CONSECRATION_HAZE_CLIMAX_ADD;

    let memoryMul = 1;
    if (elapsed >= PRACTICAL_MEMORY_START) {
        const decay = sampleMemoryDecayMul(elapsed);
        memoryMul = CONSECRATION_HAZE_MEMORY_FLOOR + (1 - CONSECRATION_HAZE_MEMORY_FLOOR) * decay;
    }

    return clamp(ignition * hushMul * memoryMul + climaxAdd * ignition, 0, 1);
}

function samplePlateauEnvelope(elapsed, start, duration, attackSeconds, releaseSeconds) {
    const safeDuration = Math.max(duration, 0.001);
    const end = start + safeDuration;

    if (elapsed < start || elapsed > end) {
        return 0;
    }

    const attack = Number.isFinite(attackSeconds)
        ? clamp(attackSeconds, 0.04, safeDuration)
        : clamp(
            Math.min(safeDuration * 0.24, 1.4),
            0.04,
            Math.min(1.8, safeDuration)
        );
    if (elapsed <= start + attack) {
        return smoothstep01((elapsed - start) / attack);
    }

    const release = Number.isFinite(releaseSeconds)
        ? clamp(releaseSeconds, 0.04, safeDuration)
        : clamp(
            Math.min(safeDuration * 0.28, 1.8),
            0.04,
            Math.min(2.4, safeDuration)
        );
    const releaseStart = Math.max(start + attack, end - release);

    if (elapsed >= releaseStart) {
        return 1 - smoothstep01((elapsed - releaseStart) / (end - releaseStart));
    }

    return 1;
}

/**
 * 0 before igniteAt; 0.6s smoothstep attack to 1.
 *
 * @param {number} elapsed
 * @param {number} igniteAt
 * @return {number} Ignition envelope 0–1.
 */
export function sampleIgnitionEnvelope(elapsed, igniteAt) {
    if (!Number.isFinite(elapsed) || !Number.isFinite(igniteAt)) {
        return 0;
    }
    if (elapsed < igniteAt) {
        return 0;
    }
    if (elapsed >= igniteAt + PRACTICAL_IGNITE_ATTACK_SECONDS) {
        return 1;
    }
    return smoothstep01((elapsed - igniteAt) / PRACTICAL_IGNITE_ATTACK_SECONDS);
}

/**
 * Holder bracket emissive — gated on each practical's ignition envelope.
 *
 * @param {number} elapsed
 * @param {number} igniteAt
 * @return {number} emissiveIntensity (0 before ignition, ramps with flame)
 */
export function sampleHolderEmissiveIntensity(elapsed, igniteAt) {
    return HOLDER_EMISSIVE_INTENSITY * sampleIgnitionEnvelope(elapsed, igniteAt);
}

/**
 * HDR emissive kiss during the ignition attack only.
 *
 * @param {number} elapsed
 * @param {number} igniteAt
 * @return {number} Emissive multiplier (1.0–1.6 during attack).
 */
export function sampleKissMul(elapsed, igniteAt) {
    if (!Number.isFinite(elapsed) || !Number.isFinite(igniteAt)) {
        return 1;
    }
    if (elapsed < igniteAt || elapsed >= igniteAt + PRACTICAL_IGNITE_ATTACK_SECONDS) {
        return 1;
    }
    const attackT = smoothstep01((elapsed - igniteAt) / PRACTICAL_IGNITE_ATTACK_SECONDS);
    return 1 + (PRACTICAL_KISS_PEAK_MUL - 1) * (1 - attackT);
}

/**
 * HUSH intensity multiplier with 2.8s edge ramps.
 *
 * @param {{ id: string }} practical
 * @param {number}         elapsed
 * @return {number} Intensity multiplier during HUSH.
 */
export function sampleHushIntensityMul(practical, elapsed) {
    if (!Number.isFinite(elapsed)) {
        return 1;
    }
    const start = PRACTICAL_HUSH_START;
    const end = PRACTICAL_HUSH_END;
    const edge = PRACTICAL_HUSH_EDGE_SECONDS;
    const target = practical.id === P1_ID ? 0.35 : 0.18;

    if (elapsed <= start - edge || elapsed >= end + edge) {
        return 1;
    }

    if (elapsed >= start + edge && elapsed < end - edge) {
        return target;
    }

    if (elapsed < start + edge) {
        const enterT = smoothstep01((elapsed - (start - edge)) / (2 * edge));
        return 1 + (target - 1) * enterT;
    }

    const exitT = smoothstep01((elapsed - (end - edge)) / (2 * edge));
    return target + (1 - target) * exitT;
}

/**
 * Color blend factor toward hush-cooled Kelvin (2.8s edge ramps).
 * @param {number} elapsed
 * @return {number} 0 = base color, 1 = hush color
 */
export function sampleHushColorMix(elapsed) {
    if (!Number.isFinite(elapsed)) {
        return 0;
    }
    const start = PRACTICAL_HUSH_START;
    const end = PRACTICAL_HUSH_END;
    const edge = PRACTICAL_HUSH_EDGE_SECONDS;

    if (elapsed <= start - edge || elapsed >= end + edge) {
        return 0;
    }

    if (elapsed >= start + edge && elapsed < end - edge) {
        return 1;
    }

    if (elapsed < start + edge) {
        return smoothstep01((elapsed - (start - edge)) / (2 * edge));
    }

    const exitT = smoothstep01((elapsed - (end - edge)) / (2 * edge));
    return 1 - exitT;
}

/**
 * Climax bump envelope (mirrors room_open at 384.03).
 * @param {number} elapsed
 * @return {number} 0–1 plateau envelope
 */
export function sampleClimaxEnvelope(elapsed) {
    return samplePlateauEnvelope(
        elapsed,
        PRACTICAL_CLIMAX_START,
        PRACTICAL_CLIMAX_DURATION,
        PRACTICAL_CLIMAX_ATTACK,
        PRACTICAL_CLIMAX_RELEASE
    );
}

/**
 * MEMORY decay multiplier (488.5 → 535, persists through snap).
 *
 * @param {number} elapsed
 * @return {number} Decay multiplier 1.0 → 0.55.
 */
export function sampleMemoryDecayMul(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < PRACTICAL_MEMORY_START) {
        return 1;
    }
    if (elapsed >= PRACTICAL_MEMORY_END) {
        return PRACTICAL_MEMORY_TARGET;
    }
    const t = (elapsed - PRACTICAL_MEMORY_START) / (PRACTICAL_MEMORY_END - PRACTICAL_MEMORY_START);
    return 1 + (PRACTICAL_MEMORY_TARGET - 1) * t;
}

/**
 * Snap fade at 535 — returns intensity toward snap target.
 *
 * @param {{ id: string, intensity: number }} practical
 * @param {number}                            elapsed
 * @param {number}                            preSnapIntensity
 * @return {number|null} Snapped intensity, or null when snap inactive.
 */
export function sampleSnapIntensity(practical, elapsed, preSnapIntensity) {
    if (!Number.isFinite(elapsed) || elapsed < PRACTICAL_SNAP_AT) {
        return null;
    }
    const snapEnd = PRACTICAL_SNAP_AT + PRACTICAL_SNAP_SECONDS;
    const snapT = elapsed >= snapEnd
        ? 1
        : smoothstep01((elapsed - PRACTICAL_SNAP_AT) / PRACTICAL_SNAP_SECONDS);

    if (practical.id === P1_ID) {
        const target = PRACTICAL_P1_SNAP_INTENSITY;
        return preSnapIntensity + (target - preSnapIntensity) * snapT;
    }

    return preSnapIntensity * (1 - snapT);
}

/**
 * Vigil candle-aging Kelvin shift — linear from ignition to snap.
 *
 * @param {number} elapsed
 * @param {number} igniteAt
 * @return {number} Kelvin delta (0 at igniteAt, −350 at 535).
 */
export function samplePracticalAgeShiftK(elapsed, igniteAt) {
    if (!Number.isFinite(elapsed) || !Number.isFinite(igniteAt)) {
        return 0;
    }
    if (elapsed <= igniteAt) {
        return 0;
    }
    if (elapsed >= PRACTICAL_SNAP_AT) {
        return -PRACTICAL_AGE_SHIFT_TOTAL_K;
    }
    const t = (elapsed - igniteAt) / (PRACTICAL_SNAP_AT - igniteAt);
    return -PRACTICAL_AGE_SHIFT_TOTAL_K * t;
}

/**
 * Authored base/hush hex pair for a practical at elapsed (vigil aging + hush −400K).
 *
 * @param {{ kelvin: number, igniteAt: number, color: string, hushColor: string }} practical
 * @param {number}                                                                 elapsed
 * @param {boolean}                                                                [vigilEnabled]
 * @return {{ baseHex: string, hushHex: string }} Authored hex pair.
 */
export function resolvePracticalAuthoredHexPair(practical, elapsed, vigilEnabled = false) {
    if (!practical) {
        return { baseHex: '#000000', hushHex: '#000000' };
    }

    if (vigilEnabled !== true) {
        return {
            baseHex: practical.color,
            hushHex: practical.hushColor
        };
    }

    const igniteAt = Number.isFinite(practical.igniteAt) ? practical.igniteAt : Infinity;
    const ageShift = samplePracticalAgeShiftK(elapsed, igniteAt);
    const baseKelvin = practical.kelvin + ageShift;
    const hushKelvin = baseKelvin - PRACTICAL_HUSH_KELVIN_DELTA;

    return {
        baseHex: authoredAmberHexForKelvin(baseKelvin),
        hushHex: authoredAmberHexForKelvin(hushKelvin)
    };
}

/**
 * Pure schedule intensity for one practical (unit-testable).
 *
 * @param {{ id: string, intensity: number, igniteAt: number }} practical
 * @param {number}                                              elapsed
 * @return {number} Scheduled light intensity.
 */
export function samplePracticalIntensity(practical, elapsed) {
    if (!practical || !Number.isFinite(elapsed)) {
        return 0;
    }

    const base = Number.isFinite(practical.intensity) ? practical.intensity : 0;
    const igniteAt = Number.isFinite(practical.igniteAt) ? practical.igniteAt : Infinity;
    const ignition = sampleIgnitionEnvelope(elapsed, igniteAt);

    if (ignition <= 0) {
        return 0;
    }

    let intensity = base * ignition;

    if (elapsed >= PRACTICAL_HUSH_START - PRACTICAL_HUSH_EDGE_SECONDS
        && elapsed < PRACTICAL_HUSH_END + PRACTICAL_HUSH_EDGE_SECONDS) {
        intensity *= sampleHushIntensityMul(practical, elapsed);
    }

    const climaxEnvelope = sampleClimaxEnvelope(elapsed);
    if (climaxEnvelope > 0 && ignition > 0) {
        intensity *= 1 + PRACTICAL_CLIMAX_BUMP * climaxEnvelope;
    }

    const detonationEnvelope = sampleDetonationEnvelope(elapsed);
    if (detonationEnvelope > 0 && ignition > 0) {
        intensity *= 1 + detonationEnvelope * (PRACTICAL_DETONATION_BUMP - 1);
    }

    if (elapsed >= PRACTICAL_MEMORY_START) {
        intensity *= sampleMemoryDecayMul(elapsed);
    }

    if (elapsed >= PRACTICAL_SNAP_AT) {
        const snapped = sampleSnapIntensity(practical, elapsed, intensity);
        if (snapped !== null) {
            intensity = snapped;
        }
    }

    return Math.max(0, intensity);
}

/**
 * Authored practical roster (Track 1 consecrate v3.4 — inverse-square retune).
 * Colors: authored amber hex band; hushColor precomputed −400K.
 */
export const SONOITE_PRACTICALS = Object.freeze([
    {
        id: 'p1_votive_first',
        position: [-1.6, 0.2, 2.2],
        igniteAt: 35.4,
        kelvin: 1900,
        color: kelvinToHex(1900),
        hushColor: kelvinToHex(1500),
        intensity: 0.58,
        lightDistance: 9.6,
        kind: 'votive'
    },
    {
        id: 'p2_votive_right',
        position: [3.0, 0.15, 2.2],
        igniteAt: 62.83,
        kelvin: 2000,
        color: kelvinToHex(2000),
        hushColor: kelvinToHex(1600),
        intensity: 0.64,
        lightDistance: 9.6,
        kind: 'votive'
    },
    {
        id: 'p3_sconce_left',
        position: [-6.2, 2.4, -4.5],
        igniteAt: 90.26,
        kelvin: 2200,
        color: kelvinToHex(2200),
        hushColor: kelvinToHex(1800),
        intensity: 0.76,
        lightDistance: 14.5,
        kind: 'sconce'
    },
    {
        id: 'p4_sconce_right',
        position: [6.0, 2.6, -4.2],
        igniteAt: 125,
        kelvin: 2300,
        color: kelvinToHex(2300),
        hushColor: kelvinToHex(1900),
        intensity: 0.76,
        lightDistance: 14.5,
        kind: 'sconce'
    },
    {
        id: 'p6_lantern_aisle',
        position: [-1.5, 5.8, 1.5],
        igniteAt: 177.876,
        kelvin: 2400,
        color: kelvinToHex(2400),
        hushColor: kelvinToHex(2000),
        intensity: 0.72,
        lightDistance: 16.8,
        kind: 'lantern'
    },
    {
        id: 'p7_lantern_rear',
        position: [1.5, 5.5, -9.0],
        igniteAt: 253,
        kelvin: 2500,
        color: kelvinToHex(2500),
        hushColor: kelvinToHex(2100),
        intensity: 0.78,
        lightDistance: 16.8,
        kind: 'lantern'
    },
    {
        id: 'p5_plinth_ring',
        center: [0.96, 0.35, -0.04],
        radius: 1.2,
        angles: [45, 135, 225, 315],
        igniteAt: 384.03,
        kelvin: 2800,
        color: kelvinToHex(2800),
        hushColor: kelvinToHex(2400),
        intensity: 0.55,
        lightDistance: 6.2,
        kind: 'ring',
        subPointCount: 4
    }
]);

const QUALITY_DROP_BALANCED = Object.freeze(['p2_votive_right', 'p7_lantern_rear']);
const QUALITY_SAFE_IDS = Object.freeze(['p1_votive_first', 'p4_sconce_right', 'p5_plinth_ring']);

/**
 * @param {string} quality
 * @return {ReadonlyArray<*>} Roster filtered for quality tier.
 */
export function filterPracticalsForQuality(quality) {
    const mode = String(quality || 'balanced').toLowerCase();
    if (mode === 'cinema' || mode === 'high') {
        return SONOITE_PRACTICALS;
    }
    if (mode === 'safe') {
        return SONOITE_PRACTICALS.filter((p) => QUALITY_SAFE_IDS.includes(p.id));
    }
    return SONOITE_PRACTICALS.filter((p) => !QUALITY_DROP_BALANCED.includes(p.id));
}

function expandRingOffsets(practical) {
    const center = practical.center || [0, 0, 0];
    const radius = practical.radius ?? 1.2;
    const angles = practical.angles || [45, 135, 225, 315];
    return angles.map((angleDeg) => {
        const rad = (angleDeg * Math.PI) / 180;
        return [
            center[0] + radius * Math.cos(rad),
            center[1],
            center[2] + radius * Math.sin(rad)
        ];
    });
}

function resolvePracticalColor(practical, elapsed, THREE, options = {}) {
    const snapKelvin = practical.id === P1_ID && elapsed >= PRACTICAL_SNAP_AT
        ? PRACTICAL_P1_SNAP_KELVIN
        : null;

    if (snapKelvin !== null) {
        const rgb = kelvinToRgb(snapKelvin);
        return new THREE.Color(rgb.r, rgb.g, rgb.b);
    }

    const { baseHex, hushHex } = resolvePracticalAuthoredHexPair(
        practical,
        elapsed,
        options.vigilEnabled === true
    );
    const mix = sampleHushColorMix(elapsed);
    if (mix <= 0) {
        return new THREE.Color(baseHex);
    }
    const base = new THREE.Color(baseHex);
    const hush = new THREE.Color(hushHex);
    return base.lerp(hush, mix);
}

function colorToRgbaStops(THREE, color, alphaCenter, alphaMid) {
    const rgb = new THREE.Color(color);
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return {
        center: `rgba(${r}, ${g}, ${b}, ${alphaCenter})`,
        mid: `rgba(${r}, ${g}, ${b}, ${alphaMid})`,
        edge: `rgba(${r}, ${g}, ${b}, 0)`
    };
}

function rgbaFromColor(THREE, color, alpha) {
    const rgb = new THREE.Color(color);
    return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${alpha})`;
}

function createGlowSeedTexture(THREE, practicalColor) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Monotonic stops — energy in the inner 25% (D1).
    gradient.addColorStop(0, 'rgba(255, 248, 231, 0.95)');
    gradient.addColorStop(0.10, 'rgba(255, 248, 231, 0.62)');
    gradient.addColorStop(0.24, rgbaFromColor(THREE, practicalColor, 0.38));
    gradient.addColorStop(0.48, rgbaFromColor(THREE, practicalColor, 0.12));
    gradient.addColorStop(0.72, rgbaFromColor(THREE, practicalColor, 0.035));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createPoolRadialTexture(THREE, color) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const stops = colorToRgbaStops(THREE, color, 0.44, 0.12);
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Inverse-square style falloff — soft edge, no stamped-disc read.
    gradient.addColorStop(0, stops.center);
    gradient.addColorStop(0.12, stops.mid);
    gradient.addColorStop(0.38, `rgba(${Math.round(new THREE.Color(color).r * 255)}, ${Math.round(new THREE.Color(color).g * 255)}, ${Math.round(new THREE.Color(color).b * 255)}, 0.04)`);
    gradient.addColorStop(0.72, `rgba(${Math.round(new THREE.Color(color).r * 255)}, ${Math.round(new THREE.Color(color).g * 255)}, ${Math.round(new THREE.Color(color).b * 255)}, 0.008)`);
    gradient.addColorStop(1, stops.edge);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function glowSeedScaleForKind(kind) {
    if (kind === 'sconce') {
        return GLOW_SEED_SCALE.sconce;
    }
    if (kind === 'lantern') {
        return GLOW_SEED_SCALE.lantern;
    }
    if (kind === 'ring') {
        return GLOW_SEED_SCALE.ring;
    }
    return GLOW_SEED_SCALE.votive;
}

function atmosphereHaloSizeMulForId(practicalId) {
    const phase = hashPracticalPhaseOffsets(practicalId)[1];
    const unit = ((phase / (Math.PI * 2)) + 1) % 1;
    return ATMO_HALO_SIZE_MUL_MIN + unit * (ATMO_HALO_SIZE_MUL_MAX - ATMO_HALO_SIZE_MUL_MIN);
}

function atmosphereHaloOpacityForId(practicalId) {
    const phase = hashPracticalPhaseOffsets(practicalId)[2];
    const unit = ((phase / (Math.PI * 2)) + 1) % 1;
    return ATMO_HALO_OPACITY_MIN + unit * (ATMO_HALO_OPACITY_MAX - ATMO_HALO_OPACITY_MIN);
}

function createAtmosphereHaloTexture(THREE, practicalColor) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Monotonic warm scatter — no mid/center alpha inversion (D1).
    gradient.addColorStop(0, rgbaFromColor(THREE, practicalColor, 0.42));
    gradient.addColorStop(0.18, rgbaFromColor(THREE, practicalColor, 0.22));
    gradient.addColorStop(0.42, rgbaFromColor(THREE, practicalColor, 0.10));
    gradient.addColorStop(0.70, rgbaFromColor(THREE, practicalColor, 0.032));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createGlowSeed(THREE, practicalColor, kind) {
    const texture = createGlowSeedTexture(THREE, practicalColor);
    const size = glowSeedScaleForKind(kind);
    const seedColor = new THREE.Color(GLOW_SEED_CORE_HEX)
        .lerp(new THREE.Color(practicalColor), GLOW_SEED_AMBER_LERP)
        .multiplyScalar(GLOW_SEED_HDR_MUL);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: seedColor
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.userData.baseScale = size;
    return { sprite, material, texture, baseScale: size };
}

function createAtmosphereHalo(THREE, practicalColor, kind, practicalId) {
    const texture = createAtmosphereHaloTexture(THREE, practicalColor);
    const seedSize = glowSeedScaleForKind(kind);
    const size = seedSize * atmosphereHaloSizeMulForId(practicalId);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(practicalColor)
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 0;
    return {
        sprite,
        material,
        texture,
        baseScale: size,
        baseOpacity: atmosphereHaloOpacityForId(practicalId)
    };
}

function createWallWashTexture(THREE, color) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, rgbaFromColor(THREE, color, 0.55));
    gradient.addColorStop(0.28, rgbaFromColor(THREE, color, 0.18));
    gradient.addColorStop(0.58, rgbaFromColor(THREE, color, 0.05));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createWallWash(THREE, color, position) {
    const texture = createWallWashTexture(THREE, color);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(color)
    });
    const sprite = new THREE.Sprite(material);
    const wallOffsetX = position[0] < 0 ? -0.14 : 0.14;
    sprite.position.set(position[0] + wallOffsetX, position[1], position[2]);
    sprite.scale.set(1.4, 2.0, 1);
    sprite.renderOrder = -1;
    return { sprite, material, texture, baseOpacity: WALL_WASH_BASE_OPACITY };
}

function createFloorPool(THREE, color, radius) {
    const texture = createPoolRadialTexture(THREE, color);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff
    });
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return { mesh, material, texture, geometry };
}

function configurePracticalShadow(light, practicalId) {
    if (!SHADOW_CAST_IDS.has(practicalId)) {
        light.castShadow = false;
        return;
    }
    light.castShadow = true;
    light.shadow.mapSize.set(PRACTICAL_SHADOW_MAP_SIZE, PRACTICAL_SHADOW_MAP_SIZE);
    light.shadow.radius = PRACTICAL_SHADOW_RADIUS;
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.02;
}

function createHolder(THREE, kind, position) {
    const holderMaterial = new THREE.MeshStandardMaterial({
        color: HOLDER_COLOR,
        emissive: HOLDER_EMISSIVE,
        emissiveIntensity: 0,
        roughness: 0.92,
        metalness: 0.04
    });
    const holder = new THREE.Group();
    holder.position.set(position[0], position[1], position[2]);

    if (kind === 'votive') {
        const cup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.11, 0.11, 14, 1, true),
            holderMaterial
        );
        cup.position.y = -0.05;
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.18, 0.025, 14),
            holderMaterial
        );
        base.position.y = -0.11;
        holder.add(cup, base);
    } else if (kind === 'sconce') {
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 16), holderMaterial);
        dish.position.y = -0.015;
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.03), holderMaterial);
        stem.position.set(0, 0.32, -0.06);
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.08), holderMaterial);
        bracket.position.set(0, 0.58, -0.08);
        holder.add(dish, stem, bracket);
    } else if (kind === 'lantern') {
        const cageRadius = 0.11;
        for (let barIndex = 0; barIndex < 4; barIndex += 1) {
            const angle = (barIndex / 4) * Math.PI * 2;
            const bar = new THREE.Mesh(new THREE.BoxGeometry(LANTERN_CAGE_BAR_SIZE, 0.32, LANTERN_CAGE_BAR_SIZE), holderMaterial);
            bar.position.set(Math.cos(angle) * cageRadius, 0.04, Math.sin(angle) * cageRadius);
            holder.add(bar);
        }
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16), holderMaterial);
        top.position.y = 0.18;
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), holderMaterial);
        hook.rotation.x = Math.PI / 2;
        hook.position.y = 0.24;
        holder.add(top, hook);
    } else if (kind === 'ring') {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.022, 8, 48),
            holderMaterial
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.33;
        holder.add(ring);
    }

    return { holder, holderMaterial };
}

function createStandardPractical(THREE, practical, group) {
    const position = practical.position;
    const kind = practical.kind;

    const { holder, holderMaterial } = createHolder(THREE, kind, position);
    const atmosphereHalo = createAtmosphereHalo(THREE, practical.color, kind, practical.id);
    const seedLiftY = kind === 'lantern' ? LANTERN_SEED_LIFT_Y : 0;
    atmosphereHalo.sprite.position.set(position[0], position[1] + seedLiftY, position[2]);
    const glowSeed = createGlowSeed(THREE, practical.color, kind);
    glowSeed.sprite.position.set(position[0], position[1] + seedLiftY, position[2]);
    glowSeed.sprite.renderOrder = 1;

    const light = new THREE.PointLight(practical.color, 0, practical.lightDistance, 2);
    light.position.set(position[0], position[1], position[2]);
    configurePracticalShadow(light, practical.id);
    light.visible = true;

    let pool = null;
    let wallWash = null;
    if (kind === 'votive') {
        pool = createFloorPool(THREE, practical.color, 0.7 * POOL_RADIUS_MUL);
        pool.mesh.position.set(position[0], 0.02, position[2]);
        group.add(pool.mesh);
    } else if (kind === 'sconce') {
        wallWash = createWallWash(THREE, practical.color, position);
        group.add(wallWash.sprite);
    } else if (kind === 'lantern') {
        pool = createFloorPool(THREE, practical.color, 1.8 * POOL_RADIUS_MUL);
        pool.mesh.position.set(position[0], 0.02, position[2]);
        pool.opacityMul = 0.38;
        group.add(pool.mesh);
    }

    group.add(holder, atmosphereHalo.sprite, glowSeed.sprite, light);

    return {
        practical,
        scheduleId: practical.id,
        holder,
        holderMaterial,
        atmosphereHalo,
        glowSeed,
        pool,
        wallWash,
        light,
        baseColor: new THREE.Color(practical.color),
        castsShadow: SHADOW_CAST_IDS.has(practical.id)
    };
}

function createRingPractical(THREE, practical, group) {
    const center = practical.center || [0.96, 0.35, -0.04];
    const offsets = expandRingOffsets(practical);
    const { holder, holderMaterial } = createHolder(THREE, 'ring', center);

    const glowSeeds = offsets.map((offset) => {
        const halo = createAtmosphereHalo(THREE, practical.color, 'ring', practical.id);
        halo.sprite.position.set(offset[0], offset[1], offset[2]);
        const seed = createGlowSeed(THREE, practical.color, 'ring');
        seed.sprite.position.set(offset[0], offset[1], offset[2]);
        seed.sprite.renderOrder = 1;
        group.add(halo.sprite, seed.sprite);
        return { atmosphereHalo: halo, glowSeed: seed, position: offset };
    });

    const light = new THREE.PointLight(practical.color, 0, practical.lightDistance, 2);
    light.position.set(center[0], center[1], center[2]);
    light.castShadow = false;
    light.visible = true;

    const pool = createFloorPool(THREE, practical.color, 1.3 * POOL_RADIUS_MUL);
    pool.mesh.position.set(center[0], 0.02, center[2]);

    group.add(holder, light, pool.mesh);

    return {
        practical,
        scheduleId: practical.id,
        holder,
        holderMaterial,
        glowSeeds,
        pool,
        light,
        baseColor: new THREE.Color(practical.color),
        castsShadow: false
    };
}

function updatePracticalVisuals(entry, elapsed, THREE, vigilEnabled, poolsStudy) {
    const { practical, scheduleId } = entry;
    const intensity = samplePracticalIntensity(practical, elapsed);
    const igniteAt = practical.igniteAt;
    const authoredBase = Number.isFinite(practical.intensity) ? practical.intensity : 1;
    const intensityEnvelope = authoredBase > 0 ? clamp(intensity / authoredBase, 0, 2) : 0;
    const breath = sampleCandleBreath(scheduleId, elapsed);
    const color = resolvePracticalColor(practical, elapsed, THREE, { vigilEnabled });
    const kissMul = sampleKissMul(elapsed, igniteAt);
    const lit = intensity > 0.0001;
    // Early-source comparison: one stop locally, returning to the authored rig at 2:05.
    const poolReveal = poolsStudy
        ? smoothstep01((elapsed - 35.4) / 0.6) * (1 - smoothstep01((elapsed - 121) / 4))
        : 0;
    const sourceGain = 1 + poolReveal;
    const holderEmissive = sampleHolderEmissiveIntensity(elapsed, igniteAt);

    if (entry.holderMaterial) {
        entry.holderMaterial.emissiveIntensity = holderEmissive;
    }

    const applyGlowSeed = (seed) => {
        if (!lit) {
            seed.material.opacity = 0;
            return;
        }
        seed.material.opacity = intensityEnvelope * 0.88 * breath.glowOpacityMul * kissMul;
    };

    const applyAtmosphereHalo = (halo) => {
        if (!lit) {
            halo.material.opacity = 0;
            return;
        }
        halo.material.opacity = intensityEnvelope
            * halo.baseOpacity
            * breath.haloOpacityMul
            * kissMul;
    };

    const applyPool = (pool) => {
        if (!pool) {
            return;
        }
        const radiusGain = 1 + 0.35 * poolReveal;
        pool.mesh.scale.set(radiusGain, radiusGain, 1);
        if (!lit) {
            pool.material.opacity = 0;
            return;
        }
        const poolScale = pool.opacityMul ?? 1;
        pool.material.opacity = POOL_OPACITY_MUL * 0.55 * intensityEnvelope * breath.poolOpacityMul * poolScale * sourceGain;
    };

    const applyWallWash = (wash) => {
        if (!wash) {
            return;
        }
        if (!lit) {
            wash.material.opacity = 0;
            return;
        }
        wash.material.opacity = intensityEnvelope
            * wash.baseOpacity
            * sourceGain
            * breath.poolOpacityMul
            * kissMul;
    };

    if (entry.glowSeeds) {
        entry.light.intensity = lit ? intensity * breath.intensityMul * sourceGain : 0;
        entry.light.color.copy(color);
        entry.glowSeeds.forEach((flame) => {
            applyAtmosphereHalo(flame.atmosphereHalo);
            applyGlowSeed(flame.glowSeed);
        });
        applyPool(entry.pool);
        return;
    }

    entry.light.intensity = lit ? intensity * breath.intensityMul * sourceGain : 0;
    entry.light.color.copy(color);
    applyAtmosphereHalo(entry.atmosphereHalo);
    applyGlowSeed(entry.glowSeed);
    applyPool(entry.pool);
    applyWallWash(entry.wallWash);
}

function qualitySupportsExtinctionSmoke(quality) {
    const mode = String(quality || 'balanced').toLowerCase();
    return mode === 'cinema' || mode === 'high' || mode === 'balanced';
}

function getFlamePositionForEntry(entry) {
    const { practical } = entry;
    if (Array.isArray(practical.position)) {
        return [...practical.position];
    }
    if (Array.isArray(practical.center)) {
        return [...practical.center];
    }
    return [0, 0, 0];
}

function createExtinctionSmokeTexture(THREE) {
    const width = 64;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(width / 2, height, width / 2, 0);
    gradient.addColorStop(0, 'rgba(138, 138, 146, 0)');
    gradient.addColorStop(0.32, 'rgba(138, 138, 146, 0.62)');
    gradient.addColorStop(0.58, 'rgba(198, 198, 206, 0.2)');
    gradient.addColorStop(1, 'rgba(235, 235, 240, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createExtinctionSmokeSystem(THREE, group) {
    const extinctionGroup = new THREE.Group();
    extinctionGroup.name = 'extinctionSmoke';
    group.add(extinctionGroup);

    const threads = [];
    let spawned = false;

    function spawnThreads(entries, elapsed) {
        if (spawned) {
            return;
        }
        spawned = true;

        entries.forEach((entry) => {
            const { practical, scheduleId } = entry;
            const igniteAt = practical.igniteAt;
            if (sampleIgnitionEnvelope(elapsed - 0.001, igniteAt) <= 0) {
                return;
            }

            const position = getFlamePositionForEntry(entry);
            const phases = hashPracticalPhaseOffsets(scheduleId);
            const phaseUnit = ((phases[0] / (Math.PI * 2)) + 1) % 1;
            const rateUnit = ((phases[1] / (Math.PI * 2)) + 1) % 1;
            const texture = createExtinctionSmokeTexture(THREE);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                color: new THREE.Color(EXTINCTION_SMOKE_COLOR),
                blending: THREE.NormalBlending
            });
            const sprite = new THREE.Sprite(material);
            sprite.position.set(position[0], position[1], position[2]);
            const aspect = 2.8;
            sprite.scale.set(EXTINCTION_SMOKE_WIDTH_START, EXTINCTION_SMOKE_WIDTH_START * aspect, 1);
            sprite.userData = {
                originY: position[1],
                phaseOffset: phaseUnit * 0.35,
                rateScale: 0.88 + rateUnit * 0.24,
                aspect
            };
            extinctionGroup.add(sprite);
            threads.push({ sprite, material, texture });
        });
    }

    function update(elapsed, entries) {
        if (elapsed >= EXTINCTION_SMOKE_AT && !spawned) {
            spawnThreads(entries, elapsed);
        }

        threads.forEach((thread) => {
            const { sprite, material } = thread;
            const data = sprite.userData;
            const localAge = ((elapsed - EXTINCTION_SMOKE_AT) * data.rateScale) + data.phaseOffset;
            if (localAge < 0) {
                material.opacity = 0;
                return;
            }

            const duration = EXTINCTION_SMOKE_DURATION;
            const t = clamp(localAge / duration, 0, 1);
            const riseT = smoothstep01(t);
            sprite.position.y = data.originY + EXTINCTION_SMOKE_RISE * riseT;

            const width = EXTINCTION_SMOKE_WIDTH_START
                + (EXTINCTION_SMOKE_WIDTH_END - EXTINCTION_SMOKE_WIDTH_START) * t;
            sprite.scale.set(width, width * data.aspect, 1);

            const fadeIn = smoothstep01(Math.min(t * 3, 1));
            const fadeOut = 1 - smoothstep01(Math.max((t - 0.55) / 0.45, 0));
            material.opacity = EXTINCTION_SMOKE_PEAK_OPACITY * fadeIn * fadeOut;
        });
    }

    function dispose() {
        threads.forEach((thread) => {
            extinctionGroup.remove(thread.sprite);
            thread.texture?.dispose?.();
            thread.material?.dispose?.();
        });
        threads.length = 0;
        group.remove(extinctionGroup);
        extinctionGroup.clear();
    }

    return { update, dispose };
}

/**
 * @param {Object} options
 * @param {*}      options.scene
 * @param {*}      options.THREE
 * @param {Object} [options.config]
 * @param {string} [options.quality]
 * @return {Object} Stateful practicals group with update/dispose.
 */
export function createChamberPracticals(options = {}) {
    const scene = options.scene;
    const THREE = options.THREE;
    const quality = options.quality || 'balanced';
    const vigilEnabled = options.vigilEnabled === true;
    const poolsStudy = options.poolsStudy === true;

    if (!scene || !THREE) {
        throw new Error('createChamberPracticals requires scene and THREE');
    }

    const filtered = filterPracticalsForQuality(quality);
    const group = new THREE.Group();
    group.name = 'chamberPracticals';

    const entries = filtered.map((practical) => {
        if (practical.kind === 'ring') {
            return createRingPractical(THREE, practical, group);
        }
        return createStandardPractical(THREE, practical, group);
    });

    const extinctionSmoke = vigilEnabled && qualitySupportsExtinctionSmoke(quality)
        ? createExtinctionSmokeSystem(THREE, group)
        : null;

    scene.add(group);

    let lastElapsed = null;
    let disposed = false;

    function update(elapsed) {
        if (disposed || !Number.isFinite(elapsed)) {
            return;
        }
        lastElapsed = elapsed;
        entries.forEach((entry) => updatePracticalVisuals(entry, elapsed, THREE, vigilEnabled, poolsStudy));
        extinctionSmoke?.update(elapsed, entries);
    }

    function getState() {
        const elapsed = lastElapsed ?? 0;
        return entries.map((entry) => {
            const { practical, light } = entry;
            return {
                id: practical.id,
                intensity: light.intensity,
                ignited: sampleIgnitionEnvelope(elapsed, practical.igniteAt) > 0,
                castsShadow: entry.castsShadow === true
            };
        });
    }

    function hasShadowCasters() {
        return entries.some((entry) => entry.castsShadow === true);
    }

    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        extinctionSmoke?.dispose?.();
        scene.remove(group);
        entries.forEach((entry) => {
            if (entry.atmosphereHalo) {
                entry.atmosphereHalo.texture?.dispose?.();
                entry.atmosphereHalo.material?.dispose?.();
            }
            if (entry.glowSeed) {
                entry.glowSeed.texture?.dispose?.();
                entry.glowSeed.material?.dispose?.();
            }
            if (entry.glowSeeds) {
                entry.glowSeeds.forEach((flame) => {
                    flame.atmosphereHalo?.texture?.dispose?.();
                    flame.atmosphereHalo?.material?.dispose?.();
                    flame.glowSeed.texture?.dispose?.();
                    flame.glowSeed.material?.dispose?.();
                });
            }
            if (entry.wallWash) {
                entry.wallWash.texture?.dispose?.();
                entry.wallWash.material?.dispose?.();
            }
            if (entry.pool) {
                entry.pool.geometry?.dispose?.();
                entry.pool.texture?.dispose?.();
                entry.pool.material?.dispose?.();
            }
            if (entry.holder) {
                entry.holder.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.geometry.dispose();
                    }
                });
            }
            entry.holderMaterial?.dispose?.();
        });
        group.clear();
        entries.length = 0;
    }

    return {
        group,
        entries,
        update,
        getState,
        dispose,
        hasShadowCasters,
        getConfig: () => ({ quality, count: entries.length, vigilEnabled })
    };
}
