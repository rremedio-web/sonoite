/**
 * Track 4 horas-mortas-cinema — single dying sodium fixture (PERSIST v1 → v2 2026-08-14).
 *
 * Pure exported schedule math + THREE handles in createChamberSodium.
 * Authored from public/assets/journeys/analysis/horas-mortas/phases.json +
 * peaks.json / onsets.json / chroma.json — no runtime fetch, no randomness, no audio coupling.
 */

import { authoredAmberHexForKelvin, sampleCandleBreath } from './chamber-practicals.js';
import { sampleHorasMortasDarkAdaptation } from './films/horas-mortas.js';

export const SODIUM_TRACK_DURATION = 391.18;
export const SODIUM_PHASE_DEAD_HOURS_END = 119.25;
export const SODIUM_PHASE_WAKING_END = 238.15;
export const SODIUM_PHASE_BURN_END = 318.35;
export const SODIUM_PHASE_FADE_END = 338.05;
export const SODIUM_PHASE_AFTER_END = 386;
export const SODIUM_MUSIC_END = 338.05;
export const SODIUM_TERMINAL_START = 386;

/** Last FADE sputter event end — handoff to AFTER bridge begins here (v2 §C2). */
export const SODIUM_FADE_LAST_SPUTTER_END = 336.55;
export const SODIUM_AFTER_BRIDGE_LEVEL = 0.72;

/** Baked from phases.json — nine silence pockets in 0–119.25 (DEAD HOURS). */
export const SODIUM_DEAD_HOURS_POCKETS = Object.freeze([
    { start: 0, end: 9.8 },
    { start: 12.9, end: 17.1 },
    { start: 25.25, end: 29.45 },
    { start: 37.55, end: 41.75 },
    { start: 49.8, end: 54.05 },
    { start: 62.2, end: 66.15 },
    { start: 74.75, end: 78.5 },
    { start: 86.95, end: 90.75 },
    { start: 99.45, end: 103.1 }
]);

/** HPS restrike: dark wait before warmup (early pockets longer). */
export const SODIUM_POCKET_DARK_SECONDS = Object.freeze([
    2.2, 2.1, 2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4
]);

/** Warmup duration per pocket (early pockets slower). */
export const SODIUM_POCKET_WARMUP_SECONDS = Object.freeze([
    4.0, 3.8, 3.6, 3.4, 3.2, 3.0, 2.9, 2.8, 2.6
]);

export const SODIUM_DROP_LEAD_SECONDS = 0.35;
export const SODIUM_RESTRIKE_FLASH_SECONDS = 0.18;
export const SODIUM_RUN_BUZZ_HZ = 9;
export const SODIUM_RUN_BUZZ_AMP = 0.02;

/** Per-pocket run ceiling after recovery (v2 §C3 — exhaustion ledger). */
export const SODIUM_POCKET_RUN_LEVELS = Object.freeze([
    1.00, 0.99, 0.985, 0.975, 0.97, 0.96, 0.955, 0.945, 0.94
]);

/**
 * BURN stutters — three onset clusters baked from onsets.json (238.15–318.35).
 * Clusters: 275.75–276.45, 281.6–282.7, 289.45–290.1.
 */
export const SODIUM_STUTTER_EVENTS = Object.freeze([
    { at: 275.75, pattern: [1.0, 0.55, 0.70, 0.85, 0.60, 1.0], stepSeconds: 0.12 },
    { at: 281.6, pattern: [1.0, 0.58, 0.72, 0.88, 0.65, 1.0], stepSeconds: 0.20 },
    { at: 289.45, pattern: [1.0, 0.52, 0.78, 0.65, 0.55, 1.0], stepSeconds: 0.12 }
]);

/** FADE sputter — Luna two-rally decline (v2 §C2). */
export const SODIUM_FADE_SPUTTER_EVENTS = Object.freeze([
    { at: 320.5, level: 0.76, holdSeconds: 0.30 },
    { at: 323, level: 0.66, holdSeconds: 0.40 },
    { at: 330, level: 0.70, holdSeconds: 0.35 },
    { at: 333.5, level: 0.40, holdSeconds: 0.50 },
    { at: 334.5, level: 0.54, holdSeconds: 0.35 },
    { at: 336, level: 0.30, holdSeconds: 0.55 }
]);

/** FADE fixture-level envelope keyframes (v2 §C2). */
export const SODIUM_FADE_LEVEL_KEYFRAMES = Object.freeze([
    { at: 318.35, value: 0.92 },
    { at: 320.5, value: 0.84 },
    { at: 323, value: 0.76 },
    { at: 327, value: 0.65 },
    { at: 330, value: 0.70 },
    { at: 333.5, value: 0.42 },
    { at: 334.5, value: 0.55 },
    { at: 336, value: 0.32 },
    { at: 337.5, value: 0.26 },
    { at: 338.05, value: 0.72 }
]);

/** Dark-advance FADE envelope — rallies at 330 / 334.5 (v2 §A / §C2). */
export const SODIUM_DARK_ADVANCE_FADE_KEYFRAMES = Object.freeze([
    { at: 318.35, value: 0.92 },
    { at: 320.5, value: 0.84 },
    { at: 323, value: 0.76 },
    { at: 327, value: 0.65 },
    { at: 330, value: 1.02 },
    { at: 333.5, value: 0.42 },
    { at: 334.5, value: 0.99 },
    { at: 336, value: 0.32 },
    { at: 337.5, value: 0.26 },
    { at: 338.05, value: 0.84 }
]);

/** AFTER dark-advance per cycle (v2 §A). */
export const SODIUM_DARK_ADVANCE_AFTER = Object.freeze([0.78, 0.66, 0.55]);

/**
 * Chroma Kelvin micro-drifts — top four shifts in WAKING/BURN from chroma.json (v2 §C5).
 * Subtle ±60–90K over 6–10s; never at phase cuts.
 */
export const SODIUM_CHROMA_DRIFTS = Object.freeze([
    { at: 156, duration: 8, kelvinDelta: 75 },
    { at: 190, duration: 9, kelvinDelta: -80 },
    { at: 257, duration: 7, kelvinDelta: 65 },
    { at: 268, duration: 8, kelvinDelta: -70 }
]);

export const SODIUM_BASE_KELVIN = 2200;

/** AFTER: three irregular stutter-restrike cycles (music gone, fixture persists). */
export const SODIUM_AFTER_CYCLES = Object.freeze([
    { dropAt: 341.80, darkSeconds: 1.8, warmupSeconds: 3.2, runLevel: 0.82, runUntil: 354.5 },
    { dropAt: 358.50, darkSeconds: 2.0, warmupSeconds: 3.6, runLevel: 0.58, runUntil: 371.4 },
    { dropAt: 374.05, darkSeconds: 2.2, warmupSeconds: 3.8, runLevel: 0.42, runUntil: 381.7 }
]);

export const SODIUM_TERMINAL_WARMUP_CAP = 0.4;
export const SODIUM_TERMINAL_DEATH_SECONDS = 0.6;
export const SODIUM_EMBER_FADE_SECONDS = 3;
export const SODIUM_EMBER_COLOR = '#2a0a02';
export const SODIUM_EMBER_OFF_INTENSITY = 0.5;
export const SODIUM_KILL_RUN_LEVEL = 0.35;

export const SODIUM_COLOR_RESTRIKE = '#ff9db0';
export const SODIUM_COLOR_WARMUP = '#ffb27a';
export const SODIUM_COLOR_RUN = '#ff9a2a';
export const SODIUM_COLOR_DYING = '#ff8a3c';
export const SODIUM_COLOR_PILOT = '#ff6a4a';

/** v3 envelope shaping inside authored pocket windows — schedule constants untouched. */
export const SODIUM_V3_DECAY_SECONDS = 0.7;
export const SODIUM_V3_TUBE_LAG_SECONDS = 0.5;
export const SODIUM_V3_WARMUP_READ_SECONDS = 3.2;
export const SODIUM_V3_GRAIN_BLACKOUT_LEVEL = 0.05;
export const SODIUM_V3_GRAIN_BLACKOUT_MAX = 0.015;

/** Scotopic ambient — darkAdaptation curve × scale (v4b §P3-11; geometry, not grade floor).
 * 0.35 measured imperceptible (AFTER cycle-3 → 0.0385 intensity); 0.9 puts the
 * ghost-room just above the eye's floor while the void stays void. */
export const SODIUM_SCOTOPIC_AMBIENT_SCALE = 0.9;
export const SODIUM_SCOTOPIC_SKY_COLOR = 0x3a3f47;
export const SODIUM_SCOTOPIC_GROUND_COLOR = 0x1a1c20;

/** Dilated-iris exposure overshoot on pocket exit (v4 §P3-12). */
export const SODIUM_IRIS_OVERSHOOT_SECONDS = 4;
export const SODIUM_IRIS_POCKET_PEAK = 0.22;
export const SODIUM_IRIS_AFTER_CYCLE_PEAKS = Object.freeze([0.22, 0.14, 0.08]);

export const SODIUM_TUBE_EMISSIVE_BASE = 0.22;
export const SODIUM_TUBE_EMISSIVE_GAIN = 0.50;

export const SODIUM_PRESENCE_ALBEDO = 0x0c0804;
export const SODIUM_PRESENCE_ROUGHNESS = 0.86;

const HOLDER_COLOR = 0x0a0908;
const FIXTURE_POSITION = Object.freeze([0.35, 5.6, -1.9]);
const FIXTURE_TARGET = Object.freeze([0.96, 1.9, -0.04]);
const SPOT_SHADOW_MAP_SIZE = 1024;
const SPOT_DISTANCE = 24;
const SPOT_ANGLE = 0.42;
/** Outer tube spots — wider throw; center spot uses the IES cookie instead. */
export const SPOT_OUTER_ANGLE = 0.46;
export const SPOT_OUTER_INTENSITY_WEIGHT = 0.55;
export const SPOT_TARGET_X_OFFSET = 0.55;
const SPOT_PENUMBRA = 0.78;
const SPOT_DECAY = 1.20;
const SCATTER_FILL_INTENSITY_GAIN = 0.35;
const SCATTER_FILL_DISTANCE = 14;
const SCATTER_FILL_DECAY = 1.6;
/** Pool demoted — the thrown light draws the pool (v5 §3). */
export const POOL_OPACITY_SCALE = 0.30;
/** Rebalanced after outer spots drop to 0.55× weight (3 equal → 1 + 0.55 + 0.55). */
export const SPOT_INTENSITY_SCALE = 2.9 * (3 / (1 + SPOT_OUTER_INTENSITY_WEIGHT * 2));
export const SODIUM_DIFFUSE_WRAP = 0.35;
const HAZE_CYLINDER_RADIUS = 1.85;
const HAZE_CYLINDER_LENGTH = 4.2;
const CONTACT_FOOTPRINT_SCALE = 1.2;
const CONTACT_ELLIPSE_RADIUS = 1.0;
const CONE_PLANE_COUNT = 12;
const CONE_LENGTH_BASE = 4.2;
const CONE_OPACITY_SCALE = 0;
const PRESENCE_RADIUS = 14;
const PRESENCE_POSITION = Object.freeze([-5.8, 1.35, -7.2]);

/** Fog scrim stack — volumetric haze along setup-1 / wide sightline (owner 2026-08-15). */
export const SODIUM_FOG_SCRIM_BREATH_ID = 'sodium-fog';
export const SODIUM_FOG_SCRIM_BASE_OPACITIES = Object.freeze([0.033, 0.042, 0.037, 0.029]);
export const SODIUM_FOG_SCRIM_Z = Object.freeze([4.5, 1.5, -2.5, -6.0]);
export const SODIUM_FOG_SCRIM_COLORS = Object.freeze(['#564028', '#624a2e', '#6a4d2c', '#745638']);
const FOG_SCRIM_WIDTH = 26;
const FOG_SCRIM_HEIGHT = 16;
const FOG_SCRIM_CENTER_X = 0.96;
const FOG_SCRIM_CENTER_Y = 2.2;

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

const SODIUM_DOT_NL_DIRECT = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
const SODIUM_DOT_NL_WRAPPED = 'float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + uSodiumWrap ) / ( 1.0 + uSodiumWrap ) );';

/**
 * Diffuse wrap for horas-mortas porcelain — softens the specular-vs-void razor (v5 §1).
 * Chains with any existing onBeforeCompile (relic-mutation idiom).
 *
 * @param {*}      material
 * @param {number} [wrapAmount]
 */
export function applySodiumDiffuseWrap(material, wrapAmount = SODIUM_DIFFUSE_WRAP) {
    if (!material || material.userData?.sodiumDiffuseWrapApplied) {
        return;
    }

    const sharedWrap = { value: wrapAmount };
    const prevCompile = material.onBeforeCompile;
    const prevCustomProgramCacheKey = material.customProgramCacheKey?.bind(material);

    material.onBeforeCompile = (shader, renderer) => {
        if (prevCompile) {
            prevCompile(shader, renderer);
        }
        shader.uniforms.uSodiumWrap = sharedWrap;
        if (!shader.fragmentShader.includes('uniform float uSodiumWrap;')) {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                '#include <common>\nuniform float uSodiumWrap;'
            );
        }
        shader.fragmentShader = shader.fragmentShader.split(SODIUM_DOT_NL_DIRECT).join(SODIUM_DOT_NL_WRAPPED);
        material.userData.sodiumDiffuseWrapShader = { uniforms: shader.uniforms };
    };

    material.customProgramCacheKey = () => {
        const base = prevCustomProgramCacheKey
            ? prevCustomProgramCacheKey()
            : material.uuid;
        return `${base}-sodiumwrap-v1`;
    };
    material.userData.sodiumDiffuseWrapApplied = true;
    material.needsUpdate = true;
}

function lerpHexColor(hexA, hexB, t) {
    const mixT = clamp(t, 0, 1);
    const parse = (hex) => {
        const clean = String(hex || '#000000').replace('#', '');
        return [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
    };
    const a = parse(hexA);
    const b = parse(hexB);
    const channels = [
        Math.round(a[0] + (b[0] - a[0]) * mixT),
        Math.round(a[1] + (b[1] - a[1]) * mixT),
        Math.round(a[2] + (b[2] - a[2]) * mixT)
    ];
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(channels[0])}${toHex(channels[1])}${toHex(channels[2])}`;
}

/**
 * Authored sodium color ramp — no white-hot core (tube = even line).
 *
 * @param {number}                                            colorT 0–1 along restrike→run ramp
 * @param {'off'|'restrike'|'warmup'|'run'|'sputter'|'pilot'} mode   Fixture mode
 * @return {string} Authored hex color for the mode and ramp position
 */
export function sampleSodiumColor(colorT, mode = 'run') {
    if (mode === 'off') {
        return '#000000';
    }
    if (mode === 'pilot') {
        return SODIUM_COLOR_PILOT;
    }
    if (mode === 'restrike') {
        return SODIUM_COLOR_RESTRIKE;
    }
    if (mode === 'sputter' || mode === 'warmup') {
        const t = clamp(colorT, 0, 1);
        if (t < 0.55) {
            return lerpHexColor(SODIUM_COLOR_RESTRIKE, SODIUM_COLOR_WARMUP, t / 0.55);
        }
        return lerpHexColor(SODIUM_COLOR_WARMUP, SODIUM_COLOR_RUN, (t - 0.55) / 0.45);
    }
    const t = clamp(colorT, 0, 1);
    return lerpHexColor(SODIUM_COLOR_RUN, SODIUM_COLOR_DYING, 1 - t);
}

function sampleSquarePattern(elapsed, event) {
    const local = elapsed - event.at;
    if (local < 0) {
        return 1;
    }
    const { pattern, stepSeconds } = event;
    const totalDuration = pattern.length * stepSeconds;
    if (local >= totalDuration) {
        return 1;
    }
    const stepIndex = Math.floor(local / stepSeconds);
    return pattern[Math.min(stepIndex, pattern.length - 1)];
}

function sampleKeyframeEnvelope(elapsed, keyframes) {
    if (!keyframes.length) {
        return 1;
    }
    if (elapsed <= keyframes[0].at) {
        return keyframes[0].value;
    }
    const last = keyframes[keyframes.length - 1];
    if (elapsed >= last.at) {
        return last.value;
    }
    for (let index = 0; index < keyframes.length - 1; index += 1) {
        /* eslint-disable-next-line security/detect-object-injection -- fixed keyframe roster */
        const current = keyframes[index];
        const next = keyframes[index + 1];
        if (elapsed >= current.at && elapsed < next.at) {
            const mixT = smoothstep01((elapsed - current.at) / Math.max(next.at - current.at, 0.001));
            return current.value + (next.value - current.value) * mixT;
        }
    }
    return last.value;
}

/**
 * Lit-island reach factor — the dark-advance engine (v2 §A).
 *
 * @param {number} elapsed Track seconds
 * @return {number} Reach multiplier for spot distance, pool, cone, haze
 */
export function sampleDarkAdvance(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 0;
    }
    if (elapsed >= SODIUM_TERMINAL_START) {
        return 0;
    }
    if (elapsed >= SODIUM_MUSIC_END) {
        if (elapsed < SODIUM_AFTER_CYCLES[0].dropAt) {
            return SODIUM_DARK_ADVANCE_FADE_KEYFRAMES[SODIUM_DARK_ADVANCE_FADE_KEYFRAMES.length - 1].value;
        }
        for (let cycleIndex = 0; cycleIndex < SODIUM_AFTER_CYCLES.length; cycleIndex += 1) {
            /* eslint-disable-next-line security/detect-object-injection -- fixed cycle roster */
            const cycle = SODIUM_AFTER_CYCLES[cycleIndex];
            if (elapsed >= cycle.dropAt && elapsed < cycle.runUntil) {
                /* eslint-disable-next-line security/detect-object-injection -- fixed cycle roster */
                return SODIUM_DARK_ADVANCE_AFTER[cycleIndex] ?? 0.55;
            }
        }
        return SODIUM_DARK_ADVANCE_AFTER[SODIUM_DARK_ADVANCE_AFTER.length - 1];
    }
    if (elapsed >= SODIUM_PHASE_BURN_END) {
        return sampleKeyframeEnvelope(elapsed, SODIUM_DARK_ADVANCE_FADE_KEYFRAMES);
    }
    if (elapsed >= SODIUM_PHASE_WAKING_END) {
        const burnT = smoothstep01(
            (elapsed - SODIUM_PHASE_WAKING_END)
            / Math.max(SODIUM_PHASE_BURN_END - SODIUM_PHASE_WAKING_END, 0.001)
        );
        return 0.96 + burnT * 0.10;
    }
    if (elapsed < SODIUM_PHASE_DEAD_HOURS_END) {
        const deadT = smoothstep01(elapsed / Math.max(SODIUM_PHASE_DEAD_HOURS_END, 0.001));
        return 1.0 - deadT * 0.04;
    }
    return 0.96;
}

/**
 * Authored Kelvin for sodium chroma micro-drifts (v2 §C5).
 *
 * @param {number} elapsed
 * @return {number} Effective color temperature in Kelvin
 */
export function sampleSodiumKelvin(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return SODIUM_BASE_KELVIN;
    }
    let delta = 0;
    SODIUM_CHROMA_DRIFTS.forEach((drift) => {
        const local = elapsed - drift.at;
        if (local < 0 || local >= drift.duration) {
            return;
        }
        const half = drift.duration / 2;
        const ramp = local < half
            ? smoothstep01(local / Math.max(half, 0.001))
            : 1 - smoothstep01((local - half) / Math.max(half, 0.001));
        delta += drift.kelvinDelta * ramp;
    });
    return SODIUM_BASE_KELVIN + delta;
}

/**
 * Tired-eye sprite strength — pockets 6–9, AFTER cycles 2–3, TERMINAL (v2 §F1).
 *
 * @param {number} elapsed
 * @return {number} 0–1 anamorphic streak strength
 */
export function sampleSodiumTiredEye(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 0;
    }
    if (elapsed >= SODIUM_TERMINAL_START) {
        const local = elapsed - SODIUM_TERMINAL_START;
        if (local < 2.5) {
            return clamp((1 - local / 2.5) * 0.85, 0, 0.85);
        }
        return 0;
    }
    for (let cycleIndex = 1; cycleIndex < SODIUM_AFTER_CYCLES.length; cycleIndex += 1) {
        /* eslint-disable-next-line security/detect-object-injection -- fixed cycle roster */
        const cycle = SODIUM_AFTER_CYCLES[cycleIndex];
        if (elapsed < cycle.dropAt - 0.2 || elapsed >= cycle.runUntil) {
            continue;
        }
        const stressEnd = cycle.dropAt + 0.4 + cycle.darkSeconds + cycle.warmupSeconds;
        if (elapsed < stressEnd + 1.0) {
            const tail = elapsed < stressEnd ? 1 : 1 - (elapsed - stressEnd);
            return clamp(tail, 0, 1) * 0.75;
        }
    }
    for (let pocketIndex = 5; pocketIndex < SODIUM_DEAD_HOURS_POCKETS.length; pocketIndex += 1) {
        /* eslint-disable security/detect-object-injection -- fixed pocket roster */
        const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
        const darkSeconds = SODIUM_POCKET_DARK_SECONDS[pocketIndex] ?? 1.8;
        const warmupSeconds = (SODIUM_POCKET_WARMUP_SECONDS[pocketIndex] ?? 3.0)
            + (pocketIndex >= 4 ? (pocketIndex - 3) * 0.15 : 0);
        /* eslint-enable security/detect-object-injection */
        const dropAt = pocket.start + SODIUM_DROP_LEAD_SECONDS;
        const stressEnd = pocket.end + darkSeconds + warmupSeconds;
        if (elapsed >= dropAt && elapsed < stressEnd + 1.0) {
            const tail = elapsed < stressEnd ? 1 : 1 - (elapsed - stressEnd);
            return clamp(tail, 0, 1) * 0.7;
        }
    }
    return 0;
}

/**
 * Retinal scar afterimage opacity after TERMINAL failure (v2 §F2).
 *
 * @param {number} elapsed
 * @return {number} Scar sprite opacity (≤0.10)
 */
export function sampleRetinalScarOpacity(elapsed) {
    const scarStart = SODIUM_TERMINAL_START + 0.8;
    const scarEnd = scarStart + 1.5;
    if (!Number.isFinite(elapsed) || elapsed < scarStart || elapsed >= scarEnd) {
        return 0;
    }
    const local = elapsed - scarStart;
    const peakAt = 0.4;
    if (local < peakAt) {
        return smoothstep01(local / peakAt) * 0.10;
    }
    return (1 - smoothstep01((local - peakAt) / Math.max(scarEnd - scarStart - peakAt, 0.001))) * 0.10;
}

function sampleFadeSputterLevel(elapsed, baseLevel) {
    let level = baseLevel;
    SODIUM_FADE_SPUTTER_EVENTS.forEach((event) => {
        const local = elapsed - event.at;
        if (local >= 0 && local < event.holdSeconds) {
            level = Math.min(level, event.level);
        }
    });
    return level;
}

/**
 * FADE exit handoff — monotonic ramp into AFTER bridge; no sputter vs cycle fight (item 3).
 *
 * @param {number} elapsed
 * @return {number} Fixture level after FADE sputter or handoff ramp
 */
function sampleFadeRunLevel(elapsed) {
    if (elapsed >= SODIUM_FADE_LAST_SPUTTER_END) {
        const envelopeAtHandoff = sampleKeyframeEnvelope(SODIUM_FADE_LAST_SPUTTER_END, SODIUM_FADE_LEVEL_KEYFRAMES);
        const levelAtHandoff = sampleFadeSputterLevel(SODIUM_FADE_LAST_SPUTTER_END, envelopeAtHandoff);
        const handoffT = smoothstep01(
            (elapsed - SODIUM_FADE_LAST_SPUTTER_END)
            / Math.max(SODIUM_MUSIC_END - SODIUM_FADE_LAST_SPUTTER_END, 0.001)
        );
        return clamp(
            levelAtHandoff * (1 - handoffT) + SODIUM_AFTER_BRIDGE_LEVEL * handoffT,
            0,
            1
        );
    }
    let level = sampleKeyframeEnvelope(elapsed, SODIUM_FADE_LEVEL_KEYFRAMES);
    level = sampleFadeSputterLevel(elapsed, level);
    return clamp(level, 0, 1);
}

/**
 * Reshaped warmup progress — pink read visible ~3.2s inside authored pocket windows (v3 §V3-2).
 *
 * @param {number} localWarmup Seconds since warmup began (after restrike flash)
 * @param {number} warmupSpan  Total warmup span after flash
 * @return {number} 0–1 visible warmup envelope
 */
export function sampleSodiumWarmupEnvelope(localWarmup, warmupSpan) {
    if (!(localWarmup > 0) || !(warmupSpan > 0)) {
        return 0;
    }
    const readDuration = Math.min(SODIUM_V3_WARMUP_READ_SECONDS, warmupSpan);
    if (localWarmup <= readDuration) {
        return smoothstep01(localWarmup / Math.max(readDuration * 0.82, 0.001)) * 0.74;
    }
    const tailSpan = Math.max(warmupSpan - readDuration, 0.001);
    return 0.74 + smoothstep01((localWarmup - readDuration) / tailSpan) * 0.26;
}

/**
 * Tube ignition travel 0–1 along the line during restrike warmup (v3 §V3-2).
 *
 * @param {number} elapsed Track seconds
 * @return {number} 0–1 end-to-end ignition progress (1 when not in warmup travel)
 */
export function sampleSodiumTubeIgnitionTravel(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 1;
    }

    if (elapsed < SODIUM_PHASE_DEAD_HOURS_END) {
        for (let pocketIndex = 0; pocketIndex < SODIUM_DEAD_HOURS_POCKETS.length; pocketIndex += 1) {
            /* eslint-disable security/detect-object-injection -- fixed pocket roster */
            const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
            const darkSeconds = SODIUM_POCKET_DARK_SECONDS[pocketIndex] ?? 1.8;
            const extraWarmup = pocketIndex >= 4 ? (pocketIndex - 3) * 0.15 : 0;
            const warmupSeconds = (SODIUM_POCKET_WARMUP_SECONDS[pocketIndex] ?? 3.0) + extraWarmup;
            const warmupStart = pocket.end + darkSeconds;
            const warmupEnd = warmupStart + warmupSeconds;
            /* eslint-enable security/detect-object-injection */
            if (elapsed < warmupStart || elapsed >= warmupEnd) {
                continue;
            }
            const local = elapsed - warmupStart;
            const travelDuration = Math.min(SODIUM_V3_WARMUP_READ_SECONDS, warmupSeconds);
            if (local < travelDuration) {
                return smoothstep01(local / Math.max(travelDuration, 0.001));
            }
            return 1;
        }
    }

    for (let cycleIndex = 0; cycleIndex < SODIUM_AFTER_CYCLES.length; cycleIndex += 1) {
        /* eslint-disable-next-line security/detect-object-injection -- fixed cycle roster */
        const cycle = SODIUM_AFTER_CYCLES[cycleIndex];
        const restrikeAt = cycle.dropAt + 0.4;
        const darkEnd = restrikeAt + cycle.darkSeconds;
        const warmupEnd = darkEnd + cycle.warmupSeconds;
        if (elapsed < darkEnd || elapsed >= warmupEnd) {
            continue;
        }
        const local = elapsed - darkEnd;
        const travelDuration = Math.min(SODIUM_V3_WARMUP_READ_SECONDS, cycle.warmupSeconds);
        if (local < travelDuration) {
            return smoothstep01(local / Math.max(travelDuration, 0.001));
        }
        return 1;
    }

    if (elapsed >= SODIUM_TERMINAL_START) {
        const local = elapsed - SODIUM_TERMINAL_START;
        const warmupEnd = 1.4;
        if (local < warmupEnd) {
            const travelDuration = Math.min(SODIUM_V3_WARMUP_READ_SECONDS * 0.45, warmupEnd);
            return smoothstep01(local / Math.max(travelDuration, 0.001));
        }
    }

    return 1;
}

/**
 * Lagged tube afterglow during electrical death — amber→deep red, ember last (v3 §V3-2).
 *
 * @param {number} elapsed
 * @return {{ intensity: number, colorHex: string, ignitionTravel: number }} Tube emissive state for rendering
 */
export function sampleSodiumTubeVisual(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return { intensity: 0, colorHex: SODIUM_EMBER_COLOR, ignitionTravel: 1 };
    }

    const state = sampleSodiumState(elapsed);
    const lit = state.level > 0.001 && state.mode !== 'off';
    const ignitionTravel = sampleSodiumTubeIgnitionTravel(elapsed);

    if (lit) {
        const travelMul = ignitionTravel < 1 ? 0.32 + ignitionTravel * 0.68 : 1;
        return {
            intensity: (SODIUM_TUBE_EMISSIVE_BASE + state.level * SODIUM_TUBE_EMISSIVE_GAIN) * travelMul,
            colorHex: sampleSodiumColor(state.colorT, state.mode),
            ignitionTravel
        };
    }

    const laggedState = sampleSodiumState(Math.max(elapsed - SODIUM_V3_TUBE_LAG_SECONDS, 0));
    const laggedLit = laggedState.level > 0.001 && laggedState.mode !== 'off';
    if (laggedLit) {
        const coolT = smoothstep01(laggedState.level);
        return {
            intensity: laggedState.level * 0.58,
            colorHex: lerpHexColor(SODIUM_COLOR_DYING, SODIUM_EMBER_COLOR, 1 - coolT * 0.88),
            ignitionTravel: 1
        };
    }

    const ember = sampleSodiumEmberIntensity(elapsed);
    return {
        intensity: ember,
        colorHex: SODIUM_EMBER_COLOR,
        ignitionTravel: 1
    };
}

/**
 * Pure light level at elapsed — for blackout-purity gating (v3 §V3-1).
 *
 * @param {number} elapsed
 * @return {number} Fixture light level 0–1
 */
export function sampleSodiumLightLevel(elapsed) {
    const state = sampleSodiumState(elapsed);
    return state.mode === 'off' ? 0 : state.level;
}

/**
 * Scotopic hemisphere intensity — darkAdaptation curve gated by sodium level (v4b §P3-11).
 *
 * @param {number} elapsed       Track seconds
 * @param {number} [sodiumLevel] Pre-sampled level; defaults to sampleSodiumLightLevel(elapsed)
 * @return {number} HemisphereLight intensity 0–~0.04
 */
export function sampleScotopicAmbientIntensity(elapsed, sodiumLevel = sampleSodiumLightLevel(elapsed)) {
    if (!Number.isFinite(sodiumLevel) || sodiumLevel < SODIUM_V3_GRAIN_BLACKOUT_LEVEL) {
        return 0;
    }
    return sampleHorasMortasDarkAdaptation(elapsed) * SODIUM_SCOTOPIC_AMBIENT_SCALE;
}

function samplePocketState(elapsed, pocketIndex) {
    /* eslint-disable security/detect-object-injection -- fixed pocket roster */
    const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
    const darkSeconds = SODIUM_POCKET_DARK_SECONDS[pocketIndex] ?? 1.8;
    const extraWarmup = pocketIndex >= 4 ? (pocketIndex - 3) * 0.15 : 0;
    const warmupSeconds = (SODIUM_POCKET_WARMUP_SECONDS[pocketIndex] ?? 3.0) + extraWarmup;
    const runLevel = SODIUM_POCKET_RUN_LEVELS[pocketIndex] ?? 0.94;
    /* eslint-enable security/detect-object-injection */
    const dropAt = pocket.start + SODIUM_DROP_LEAD_SECONDS;
    const restrikeAt = pocket.end;
    const warmupStart = restrikeAt + darkSeconds;
    const warmupEnd = warmupStart + warmupSeconds;
    const nextPocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex + 1];
    const runUntil = nextPocket
        ? nextPocket.start + SODIUM_DROP_LEAD_SECONDS
        : SODIUM_PHASE_DEAD_HOURS_END;

    if (elapsed < dropAt) {
        return null;
    }

    if (elapsed < restrikeAt) {
        const local = elapsed - dropAt;
        const decayDuration = Math.min(SODIUM_V3_DECAY_SECONDS, restrikeAt - dropAt);
        if (local < decayDuration) {
            const preDrop = sampleSodiumState(Math.max(dropAt - 0.001, 0));
            const startLevel = preDrop.mode === 'off' ? runLevel : preDrop.level;
            const decayT = smoothstep01(local / Math.max(decayDuration, 0.001));
            const level = startLevel * (1 - decayT);
            if (level > 0.001) {
                return { mode: 'pilot', level: level * 0.88, colorT: 0.14 * (1 - decayT * 0.55) };
            }
        }
        return { mode: 'off', level: 0, colorT: 0 };
    }

    if (elapsed < warmupStart) {
        return { mode: 'off', level: 0, colorT: 0 };
    }

    if (elapsed < warmupStart + SODIUM_RESTRIKE_FLASH_SECONDS) {
        const flashT = smoothstep01((elapsed - warmupStart) / SODIUM_RESTRIKE_FLASH_SECONDS);
        return { mode: 'restrike', level: 0.35 + flashT * 0.25, colorT: flashT * 0.2 };
    }

    if (elapsed < warmupEnd) {
        const localWarmup = elapsed - warmupStart - SODIUM_RESTRIKE_FLASH_SECONDS;
        const warmupSpan = Math.max(warmupSeconds - SODIUM_RESTRIKE_FLASH_SECONDS, 0.001);
        const visibleT = sampleSodiumWarmupEnvelope(localWarmup, warmupSpan);
        return { mode: 'warmup', level: runLevel * (0.36 + visibleT * 0.64), colorT: visibleT };
    }

    if (elapsed < runUntil) {
        return { mode: 'run', level: runLevel, colorT: 0.82 + pocketIndex * 0.01 };
    }

    return null;
}

function sampleAfterCycleState(elapsed) {
    for (let cycleIndex = SODIUM_AFTER_CYCLES.length - 1; cycleIndex >= 0; cycleIndex -= 1) {
        /* eslint-disable-next-line security/detect-object-injection -- fixed cycle roster */
        const cycle = SODIUM_AFTER_CYCLES[cycleIndex];
        if (elapsed < cycle.dropAt) {
            continue;
        }

        const restrikeAt = cycle.dropAt + 0.4;
        const darkEnd = restrikeAt + cycle.darkSeconds;
        const warmupEnd = darkEnd + cycle.warmupSeconds;

        if (elapsed < restrikeAt) {
            const local = elapsed - cycle.dropAt;
            const decayDuration = Math.min(SODIUM_V3_DECAY_SECONDS, restrikeAt - cycle.dropAt);
            if (local < decayDuration) {
                const preDrop = sampleSodiumState(Math.max(cycle.dropAt - 0.001, 0));
                const startLevel = preDrop.mode === 'off' ? cycle.runLevel : preDrop.level;
                const decayT = smoothstep01(local / Math.max(decayDuration, 0.001));
                const level = startLevel * (1 - decayT);
                if (level > 0.001) {
                    return { mode: 'sputter', level: level * 0.82, colorT: 0.28 * (1 - decayT * 0.5) };
                }
            }
            return { mode: 'off', level: 0, colorT: 0 };
        }

        if (elapsed < darkEnd) {
            return { mode: 'off', level: 0, colorT: 0 };
        }

        if (elapsed < darkEnd + SODIUM_RESTRIKE_FLASH_SECONDS) {
            const flashT = smoothstep01((elapsed - darkEnd) / SODIUM_RESTRIKE_FLASH_SECONDS);
            return { mode: 'restrike', level: 0.28 + flashT * 0.22, colorT: flashT * 0.18 };
        }

        if (elapsed < warmupEnd) {
            const localWarmup = elapsed - darkEnd - SODIUM_RESTRIKE_FLASH_SECONDS;
            const warmupSpan = Math.max(cycle.warmupSeconds - SODIUM_RESTRIKE_FLASH_SECONDS, 0.001);
            const visibleT = sampleSodiumWarmupEnvelope(localWarmup, warmupSpan);
            return {
                mode: 'warmup',
                level: cycle.runLevel * (0.34 + visibleT * 0.66),
                colorT: visibleT * 0.9
            };
        }

        if (elapsed < cycle.runUntil) {
            return { mode: 'run', level: cycle.runLevel, colorT: 0.92 };
        }
    }

    const lastCycle = SODIUM_AFTER_CYCLES[SODIUM_AFTER_CYCLES.length - 1];
    if (elapsed >= lastCycle.runUntil) {
        return { mode: 'sputter', level: lastCycle.runLevel * 0.7, colorT: 0.5 };
    }

    return { mode: 'run', level: SODIUM_AFTER_BRIDGE_LEVEL, colorT: 0.88 };
}

function sampleTerminalState(elapsed) {
    const local = elapsed - SODIUM_TERMINAL_START;
    const flashEnd = 0.22;
    const warmupEnd = 1.4;
    const deathStart = warmupEnd;
    const deathEnd = deathStart + SODIUM_TERMINAL_DEATH_SECONDS;

    if (local < flashEnd) {
        const flashT = smoothstep01(local / flashEnd);
        return { mode: 'restrike', level: 0.2 + flashT * 0.18, colorT: flashT * 0.15 };
    }

    if (local < warmupEnd) {
        const warmupT = smoothstep01((local - flashEnd) / (warmupEnd - flashEnd));
        const capped = Math.min(warmupT, SODIUM_TERMINAL_WARMUP_CAP / 0.4) * 0.4;
        return { mode: 'warmup', level: 0.15 + capped * 0.35, colorT: capped };
    }

    if (local < deathEnd) {
        const deathT = smoothstep01((local - deathStart) / SODIUM_TERMINAL_DEATH_SECONDS);
        const level = (1 - deathT) * 0.12;
        return level > 0.001
            ? { mode: 'pilot', level, colorT: 0.05 * (1 - deathT) }
            : { mode: 'off', level: 0, colorT: 0 };
    }

    return { mode: 'off', level: 0, colorT: 0 };
}

function sampleRunLevel(elapsed, baseLevel) {
    let level = baseLevel;

    if (elapsed >= SODIUM_PHASE_WAKING_END && elapsed < SODIUM_PHASE_BURN_END) {
        SODIUM_STUTTER_EVENTS.forEach((event) => {
            level *= sampleSquarePattern(elapsed, event);
        });
        const buzz = 1 + Math.sin(elapsed * Math.PI * 2 * SODIUM_RUN_BUZZ_HZ) * SODIUM_RUN_BUZZ_AMP;
        level *= buzz;
    }

    if (elapsed >= SODIUM_PHASE_BURN_END && elapsed < SODIUM_PHASE_FADE_END) {
        level = sampleFadeRunLevel(elapsed);
    }

    return clamp(level, 0, 1);
}

function sampleBetweenPocketsRun(elapsed) {
    for (let pocketIndex = 0; pocketIndex < SODIUM_DEAD_HOURS_POCKETS.length; pocketIndex += 1) {
        /* eslint-disable security/detect-object-injection -- fixed pocket roster */
        const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
        if (elapsed >= pocket.start && elapsed <= pocket.end + (SODIUM_POCKET_DARK_SECONDS[pocketIndex] ?? 1.8)
            + (SODIUM_POCKET_WARMUP_SECONDS[pocketIndex] ?? 3.0) + 0.5) {
            const pocketState = samplePocketState(elapsed, pocketIndex);
            /* eslint-enable security/detect-object-injection */
            if (pocketState) {
                return pocketState;
            }
        }
    }

    let phaseBase = 0.78;
    let colorT = 0.82;

    if (elapsed < SODIUM_PHASE_DEAD_HOURS_END) {
        phaseBase = 0.68;
        colorT = 0.72;
    } else if (elapsed < SODIUM_PHASE_WAKING_END) {
        const wakeT = smoothstep01((elapsed - SODIUM_PHASE_DEAD_HOURS_END)
            / (SODIUM_PHASE_WAKING_END - SODIUM_PHASE_DEAD_HOURS_END));
        phaseBase = 0.68 + wakeT * 0.22;
        colorT = 0.72 + wakeT * 0.18;
    } else if (elapsed < SODIUM_PHASE_BURN_END) {
        phaseBase = 0.95;
        colorT = 0.98;
    } else if (elapsed < SODIUM_PHASE_FADE_END) {
        const fadeT = smoothstep01((elapsed - SODIUM_PHASE_BURN_END)
            / (SODIUM_PHASE_FADE_END - SODIUM_PHASE_BURN_END));
        phaseBase = 0.95 - fadeT * 0.35;
        colorT = 0.98 - fadeT * 0.42;
    }

    const level = elapsed >= SODIUM_PHASE_BURN_END && elapsed < SODIUM_PHASE_FADE_END
        ? sampleFadeRunLevel(elapsed)
        : sampleRunLevel(elapsed, phaseBase);
    const mode = elapsed >= SODIUM_PHASE_BURN_END && elapsed < SODIUM_PHASE_FADE_END ? 'sputter' : 'run';

    return { mode, level, colorT };
}

/**
 * Pure authored sodium fixture state (unit-testable).
 *
 * @param {number} elapsed Track seconds
 * @return {{ mode: string, level: number, colorT: number }} Authored fixture state
 */
export function sampleSodiumState(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return { mode: 'off', level: 0, colorT: 0 };
    }

    if (elapsed >= SODIUM_TERMINAL_START) {
        return sampleTerminalState(elapsed);
    }

    if (elapsed >= SODIUM_MUSIC_END) {
        return sampleAfterCycleState(elapsed);
    }

    if (elapsed < SODIUM_PHASE_DEAD_HOURS_END) {
        for (let pocketIndex = 0; pocketIndex < SODIUM_DEAD_HOURS_POCKETS.length; pocketIndex += 1) {
            /* eslint-disable-next-line security/detect-object-injection -- fixed pocket roster */
            const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
            if (elapsed >= pocket.start && elapsed <= pocket.end + 8) {
                const pocketState = samplePocketState(elapsed, pocketIndex);
                if (pocketState) {
                    return pocketState;
                }
            }
        }
    }

    return sampleBetweenPocketsRun(elapsed);
}

/**
 * Whether atmosphere should be forced to true black (item 1). Ember is separate.
 *
 * @param {number} elapsed
 * @return {boolean} True when fog, dust, haze, and pools must be zero
 */
export function isSodiumAtmosphereBlackout(elapsed) {
    const state = sampleSodiumState(elapsed);
    return state.level <= 0.001 || state.mode === 'off';
}

/**
 * Tube electrode ember intensity — presence-in-absence during OFF; fades in TERMINAL (item 13).
 *
 * @param {number} elapsed
 * @return {number} Tube emissive intensity (lit ramp or OFF ember)
 */
export function sampleSodiumEmberIntensity(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 0;
    }

    const state = sampleSodiumState(elapsed);
    const lit = state.level > 0.001 && state.mode !== 'off';

    if (elapsed >= SODIUM_TERMINAL_START) {
        const local = elapsed - SODIUM_TERMINAL_START;
        const deathEnd = 1.4 + SODIUM_TERMINAL_DEATH_SECONDS;
        if (local < deathEnd) {
            return lit
                ? SODIUM_TUBE_EMISSIVE_BASE + state.level * SODIUM_TUBE_EMISSIVE_GAIN
                : SODIUM_EMBER_OFF_INTENSITY;
        }
        const fadeT = smoothstep01((local - deathEnd) / SODIUM_EMBER_FADE_SECONDS);
        return SODIUM_EMBER_OFF_INTENSITY * (1 - fadeT);
    }

    if (lit) {
        return SODIUM_TUBE_EMISSIVE_BASE + state.level * SODIUM_TUBE_EMISSIVE_GAIN;
    }

    return SODIUM_EMBER_OFF_INTENSITY;
}

/**
 * Industrial haze arc — thin air gated to fixture level (fixture off → no grey).
 *
 * @param {number} elapsed
 * @return {number} Haze presence 0–1
 */
export function sampleSodiumHazeArc(elapsed) {
    if (isSodiumAtmosphereBlackout(elapsed)) {
        return 0;
    }
    const state = sampleSodiumState(elapsed);
    const darkAdvance = sampleDarkAdvance(elapsed);
    const phaseMul = elapsed < SODIUM_PHASE_BURN_END ? 1.0 : 0.62 + state.level * 0.3;
    return clamp(state.level * phaseMul * darkAdvance, 0, 1);
}

/**
 * Per-scrim opacity — base × hazeArc × breath; zero under atmosphere blackout.
 *
 * @param {number} elapsed
 * @param {number} [poolOpacityMul=1] Candle-breath pool multiplier
 * @return {number[]} Four scrim opacities (front → back)
 */
export function sampleSodiumFogScrimOpacities(elapsed, poolOpacityMul = 1) {
    if (isSodiumAtmosphereBlackout(elapsed)) {
        return [0, 0, 0, 0];
    }
    const hazeArc = sampleSodiumHazeArc(elapsed);
    const breath = Number.isFinite(poolOpacityMul) ? poolOpacityMul : 1;
    const drive = hazeArc * breath;
    return SODIUM_FOG_SCRIM_BASE_OPACITIES.map((base) => base * drive);
}

/**
 * Dilated-iris exposure overshoot on OFF→warmup pocket exits (v4 §P3-12).
 *
 * @param {number} elapsed Track seconds
 * @return {number} Additive exposure delta easing out over 4s
 */
export function sampleIrisExposureOvershoot(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 0;
    }

    let peak = 0;

    const envelopeAt = (exitAt, maxPeak) => {
        const local = elapsed - exitAt;
        if (local < 0 || local >= SODIUM_IRIS_OVERSHOOT_SECONDS) {
            return 0;
        }
        const decay = 1 - smoothstep01(local / SODIUM_IRIS_OVERSHOOT_SECONDS);
        return maxPeak * decay;
    };

    for (let pocketIndex = 0; pocketIndex < SODIUM_DEAD_HOURS_POCKETS.length; pocketIndex += 1) {
        /* eslint-disable security/detect-object-injection -- fixed pocket roster */
        const pocket = SODIUM_DEAD_HOURS_POCKETS[pocketIndex];
        const darkSeconds = SODIUM_POCKET_DARK_SECONDS[pocketIndex] ?? 1.8;
        const exitAt = pocket.end + darkSeconds;
        /* eslint-enable security/detect-object-injection */
        peak = Math.max(peak, envelopeAt(exitAt, SODIUM_IRIS_POCKET_PEAK));
    }

    for (let cycleIndex = 0; cycleIndex < SODIUM_AFTER_CYCLES.length; cycleIndex += 1) {
        /* eslint-disable security/detect-object-injection -- fixed cycle roster */
        const cycle = SODIUM_AFTER_CYCLES[cycleIndex];
        const cyclePeak = SODIUM_IRIS_AFTER_CYCLE_PEAKS[cycleIndex] ?? SODIUM_IRIS_POCKET_PEAK;
        const exitAt = cycle.dropAt + 0.4 + cycle.darkSeconds;
        /* eslint-enable security/detect-object-injection */
        peak = Math.max(peak, envelopeAt(exitAt, cyclePeak));
    }

    return peak;
}

function createLinearGlowTexture(THREE) {
    const width = 256;
    const height = 64;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, height / 2, width, height / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.82, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Soft elliptical glow for elongated tube/halo sprites — bright core, rounded ends/edges.
 *
 * @param {*}      THREE
 * @param {number} aspect Width:height ratio of the authored sprite scale
 */
function createElongatedGlowTexture(THREE, aspect = 10) {
    const width = 256;
    const height = Math.max(32, Math.round(width / aspect));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(width, height);
    const data = imageData.data;
    const aspectScale = width / height;

    for (let y = 0; y < height; y += 1) {
        const vy = (y / Math.max(height - 1, 1)) * 2 - 1;
        for (let x = 0; x < width; x += 1) {
            const vx = (x / Math.max(width - 1, 1)) * 2 - 1;
            const ex = vx;
            const ey = vy * aspectScale;
            const radial = 1 - smoothstep01(Math.sqrt(ex * ex + ey * ey));
            const endFade = smoothstep01((vx + 1) / 0.22) * smoothstep01((1 - vx) / 0.22);
            const alpha = clamp(Math.pow(radial, 1.35) * endFade * 0.96, 0, 1);
            const index = (y * width + x) * 4;
            /* eslint-disable security/detect-object-injection -- fixed canvas raster */
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            data[index + 3] = Math.round(alpha * 255);
            /* eslint-enable security/detect-object-injection */
        }
    }

    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * UV wedge falloff — peak alpha along beam axis, soft lateral + apex→base length fade.
 *
 * @param {*} THREE
 */
function createConeWedgeTexture(THREE) {
    const width = 64;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y += 1) {
        const v = y / Math.max(height - 1, 1);
        const lengthFactor = 1 - smoothstep01(v) * 0.75;
        for (let x = 0; x < width; x += 1) {
            const u = x / Math.max(width - 1, 1);
            const lateral = 1 - smoothstep01(Math.abs(u - 0.5) * 2);
            const alpha = clamp(lateral * lengthFactor * 0.9, 0, 1);
            const index = (y * width + x) * 4;
            /* eslint-disable security/detect-object-injection -- fixed canvas raster */
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            data[index + 3] = Math.round(alpha * 255);
            /* eslint-enable security/detect-object-injection */
        }
    }

    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Deterministic elongated-cosine IES cookie for the center tube spot (v5 §3).
 *
 * @param {*} THREE
 */
function createSpotCookieTexture(THREE) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y += 1) {
        const vy = (y / Math.max(size - 1, 1)) * 2 - 1;
        for (let x = 0; x < size; x += 1) {
            const vx = (x / Math.max(size - 1, 1)) * 2 - 1;
            const radial = Math.exp(-(vx * vx) / 0.55 - (vy * vy) / 0.18);
            const alpha = clamp(Math.pow(radial, 1.35), 0, 1);
            const index = (y * size + x) * 4;
            /* eslint-disable security/detect-object-injection -- fixed canvas raster */
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            data[index + 3] = Math.round(alpha * 255);
            /* eslint-enable security/detect-object-injection */
        }
    }

    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * Soft rectangular falloff — bright center band, alpha 0 at all edges (no plane borders).
 *
 * @param {*} THREE
 */
function createScrimFalloffTexture(THREE) {
    const width = 256;
    const height = Math.round(width * (FOG_SCRIM_HEIGHT / FOG_SCRIM_WIDTH));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y += 1) {
        const vy = Math.abs((y / Math.max(height - 1, 1)) * 2 - 1);
        const vertical = 1 - smoothstep01((vy - 0.08) / 0.92);
        for (let x = 0; x < width; x += 1) {
            const vx = Math.abs((x / Math.max(width - 1, 1)) * 2 - 1);
            const horizontal = 1 - smoothstep01((vx - 0.06) / 0.94);
            const band = clamp(vertical * Math.pow(horizontal, 0.92), 0, 1);
            const alpha = clamp(Math.pow(band, 1.18), 0, 1);
            const index = (y * width + x) * 4;
            /* eslint-disable security/detect-object-injection -- fixed canvas raster */
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            data[index + 3] = Math.round(alpha * 255);
            /* eslint-enable security/detect-object-injection */
        }
    }

    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createFogScrimStack(THREE, group) {
    const scrimTexture = createScrimFalloffTexture(THREE);
    const scrimGeometry = new THREE.PlaneGeometry(FOG_SCRIM_WIDTH, FOG_SCRIM_HEIGHT);
    const scrims = [];

    for (let index = 0; index < SODIUM_FOG_SCRIM_Z.length; index += 1) {
        /* eslint-disable security/detect-object-injection -- fixed scrim roster */
        const z = SODIUM_FOG_SCRIM_Z[index];
        const colorHex = SODIUM_FOG_SCRIM_COLORS[index];
        /* eslint-enable security/detect-object-injection */
        const material = new THREE.MeshBasicMaterial({
            map: scrimTexture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            color: new THREE.Color(colorHex)
        });
        const mesh = new THREE.Mesh(scrimGeometry, material);
        mesh.position.set(FOG_SCRIM_CENTER_X, FOG_SCRIM_CENTER_Y, z);
        mesh.frustumCulled = false;
        mesh.renderOrder = 8 + index;
        group.add(mesh);
        scrims.push({ mesh, material });
    }

    return { scrimTexture, scrimGeometry, scrims };
}

function createContactEllipseTexture(THREE) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.03)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createHazeCylinderMesh(THREE, group, beamDirection) {
    const geometry = new THREE.CylinderGeometry(
        HAZE_CYLINDER_RADIUS,
        HAZE_CYLINDER_RADIUS,
        HAZE_CYLINDER_LENGTH,
        24,
        8,
        true
    );
    const beamDirUniform = beamDirection.clone();
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uLevel: { value: 0 },
            uRadius: { value: HAZE_CYLINDER_RADIUS },
            uLen: { value: HAZE_CYLINDER_LENGTH },
            uBeamDir: { value: beamDirUniform },
            uCameraPos: { value: new THREE.Vector3() },
            uColor: { value: new THREE.Color(SODIUM_COLOR_RUN) }
        },
        vertexShader: `
            varying vec3 vLocalPos;
            varying vec3 vWorldPos;
            void main() {
                vLocalPos = position;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            uniform float uLevel;
            uniform float uRadius;
            uniform float uLen;
            uniform vec3 uBeamDir;
            uniform vec3 uCameraPos;
            uniform vec3 uColor;
            varying vec3 vLocalPos;
            varying vec3 vWorldPos;

            void main() {
                float lenXZ = length(vLocalPos.xz);
                float radial = exp(-pow(lenXZ / uRadius * 2.2, 2.0));
                float axial = mix(1.0, 0.25, (vLocalPos.y + uLen * 0.5) / max(uLen, 0.001));
                vec3 viewDir = normalize(uCameraPos - vWorldPos);
                vec3 beamDir = normalize(uBeamDir);
                float crossing = pow(1.0 - abs(dot(viewDir, beamDir)), 1.5);
                float alpha = radial * axial * crossing * uLevel * 0.3;
                if (alpha < 0.0005) {
                    discard;
                }
                gl_FragColor = vec4(uColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    const midY = (FIXTURE_POSITION[1] - 0.06 + FIXTURE_TARGET[1]) * 0.5;
    const midX = (FIXTURE_POSITION[0] + FIXTURE_TARGET[0]) * 0.5;
    const midZ = (FIXTURE_POSITION[2] + FIXTURE_TARGET[2]) * 0.5;
    mesh.position.set(midX, midY, midZ);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDirection);
    group.add(mesh);
    return { mesh, geometry, material, beamDirUniform };
}

function createFloorPoolTexture(THREE) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
    gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.14)');
    gradient.addColorStop(0.50, 'rgba(255, 255, 255, 0.06)');
    gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.03)');
    gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.01)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createConeFanMesh(THREE, group) {
    const coneTexture = createConeWedgeTexture(THREE);
    const coneGroup = new THREE.Group();
    coneGroup.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1] - 0.06, FIXTURE_POSITION[2]);
    const beamDirection = new THREE.Vector3(
        FIXTURE_TARGET[0] - FIXTURE_POSITION[0],
        FIXTURE_TARGET[1] - (FIXTURE_POSITION[1] - 0.06),
        FIXTURE_TARGET[2] - FIXTURE_POSITION[2]
    ).normalize();
    coneGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDirection);

    const radiusAtEnd = CONE_LENGTH_BASE * Math.tan(SPOT_ANGLE);
    const coneGeometries = [];
    const conePlanes = [];
    for (let index = 0; index < CONE_PLANE_COUNT; index += 1) {
        const theta = index * ((Math.PI * 2) / CONE_PLANE_COUNT);
        const radialX = Math.sin(theta);
        const radialZ = Math.cos(theta);
        const positions = new Float32Array([
            0, 0, 0,
            radialX * radiusAtEnd, CONE_LENGTH_BASE, radialZ * radiusAtEnd,
            -radialX * radiusAtEnd, CONE_LENGTH_BASE, -radialZ * radiusAtEnd
        ]);
        const uvs = new Float32Array([
            0.5, 0,
            1, 1,
            0, 1
        ]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
        coneGeometries.push(geometry);

        const coneMaterial = new THREE.MeshBasicMaterial({
            map: coneTexture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            color: new THREE.Color(SODIUM_COLOR_RUN)
        });
        const plane = new THREE.Mesh(geometry, coneMaterial);
        plane.renderOrder = 5;
        plane.frustumCulled = false;
        coneGroup.add(plane);
        conePlanes.push({ mesh: plane, theta, material: coneMaterial });
    }
    group.add(coneGroup);
    return { coneGroup, coneTexture, coneGeometries, conePlanes };
}

/**
 * Smooth azimuth wedge weights — no top-2 pop (v5 §5a).
 *
 * @param {number} cameraAzimuth Radians — atan2(x, z) from fixture toward camera
 * @return {number[]} Per-wedge weight 0–1
 */
export function sampleConeWedgeWeights(cameraAzimuth = 0) {
    const weights = [];
    for (let index = 0; index < CONE_PLANE_COUNT; index += 1) {
        const theta = index * ((Math.PI * 2) / CONE_PLANE_COUNT);
        const delta = Math.abs(Math.atan2(Math.sin(theta - cameraAzimuth), Math.cos(theta - cameraAzimuth)));
        const alignment = 1 - smoothstep01(delta / (Math.PI / CONE_PLANE_COUNT));
        weights.push(Math.pow(alignment, 1.6) * 0.78 + 0.22);
    }
    return weights;
}

function createPresenceMesh(THREE, group) {
    const geometry = new THREE.SphereGeometry(
        PRESENCE_RADIUS,
        36,
        18,
        Math.PI * 0.62,
        Math.PI * 0.42,
        Math.PI * 0.18,
        Math.PI * 0.58
    );
    const material = new THREE.MeshStandardMaterial({
        color: SODIUM_PRESENCE_ALBEDO,
        roughness: SODIUM_PRESENCE_ROUGHNESS,
        metalness: 0.01,
        emissive: 0x000000,
        emissiveIntensity: 0,
        side: THREE.BackSide
    });
    applySodiumDiffuseWrap(material);
    const presence = new THREE.Mesh(geometry, material);
    presence.name = 'chamberSodiumPresence';
    presence.position.set(PRESENCE_POSITION[0], PRESENCE_POSITION[1], PRESENCE_POSITION[2]);
    presence.rotation.y = Math.PI * 0.18;
    presence.receiveShadow = true;
    presence.castShadow = false;
    presence.renderOrder = 4;
    group.add(presence);
    return { presence, presenceMaterial: material, presenceGeometry: geometry };
}

function createFixtureMesh(THREE, group) {
    const holderMaterial = new THREE.MeshStandardMaterial({
        color: HOLDER_COLOR,
        roughness: 0.94,
        metalness: 0.18
    });
    applySodiumDiffuseWrap(holderMaterial);

    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.14, 0.22),
        holderMaterial
    );
    const capGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12);
    const leftCap = new THREE.Mesh(capGeometry, holderMaterial);
    leftCap.rotation.z = Math.PI / 2;
    leftCap.position.x = -0.94;
    const rightCap = new THREE.Mesh(capGeometry, holderMaterial);
    rightCap.rotation.z = Math.PI / 2;
    rightCap.position.x = 0.94;

    const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.5, 16),
        new THREE.MeshStandardMaterial({
            color: 0x1a1208,
            emissive: 0x2a0a02,
            emissiveIntensity: SODIUM_EMBER_OFF_INTENSITY,
            roughness: 0.6,
            metalness: 0.1
        })
    );
    applySodiumDiffuseWrap(tube.material);
    tube.rotation.z = Math.PI / 2;

    const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8),
        holderMaterial
    );
    rod.position.y = 0.77;

    const fixture = new THREE.Group();
    fixture.add(housing, leftCap, rightCap, tube, rod);
    fixture.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1], FIXTURE_POSITION[2]);
    group.add(fixture);

    return { fixture, tube, holderMaterial, tubeMaterial: tube.material };
}

function createSodiumLights(THREE, group, cookieTexture) {
    const target = new THREE.Vector3(...FIXTURE_TARGET);
    const spots = [];
    const xOffsets = [-SPOT_TARGET_X_OFFSET, 0, SPOT_TARGET_X_OFFSET];

    xOffsets.forEach((xOffset, index) => {
        const isCenter = index === 1;
        const spotAngle = isCenter ? SPOT_ANGLE : SPOT_OUTER_ANGLE;
        const spot = new THREE.SpotLight(
            0xffffff,
            0,
            SPOT_DISTANCE,
            spotAngle,
            SPOT_PENUMBRA,
            SPOT_DECAY
        );
        spot.position.set(
            FIXTURE_POSITION[0] + xOffset,
            FIXTURE_POSITION[1] - 0.06,
            FIXTURE_POSITION[2]
        );
        const spotTarget = target.clone();
        if (!isCenter) {
            spotTarget.x += xOffset;
        }
        spot.target.position.copy(spotTarget);
        spot.castShadow = isCenter;
        if (spot.castShadow) {
            spot.shadow.mapSize.set(SPOT_SHADOW_MAP_SIZE, SPOT_SHADOW_MAP_SIZE);
            // PCFSoftShadowMap ignores shadow.radius — softness from cookie + source spread.
            spot.shadow.bias = -0.002;
            spot.shadow.normalBias = 0.02;
        }
        if (isCenter && cookieTexture) {
            spot.map = cookieTexture;
        }
        group.add(spot);
        group.add(spot.target);
        spots.push({
            light: spot,
            intensityWeight: isCenter ? 1 : SPOT_OUTER_INTENSITY_WEIGHT
        });
    });

    const scotopicAmbient = new THREE.HemisphereLight(
        SODIUM_SCOTOPIC_SKY_COLOR,
        SODIUM_SCOTOPIC_GROUND_COLOR,
        0
    );
    group.add(scotopicAmbient);

    const scatterFill = new THREE.PointLight(
        0xffffff,
        0,
        SCATTER_FILL_DISTANCE,
        SCATTER_FILL_DECAY
    );
    scatterFill.position.set(
        FIXTURE_POSITION[0],
        FIXTURE_POSITION[1] - 0.06,
        FIXTURE_POSITION[2]
    );
    group.add(scatterFill);

    return { spots, target, scotopicAmbient, scatterFill, lightKind: 'spot-tube' };
}

/**
 * @param {Object}  options
 * @param {*}       options.scene
 * @param {*}       options.THREE
 * @param {string}  [options.quality]
 * @param {boolean} [options.sodiumKill] Steady dim run, no schedule (?sodium=0).
 * @return {Object} Stateful sodium fixture with update/dispose.
 */
export function createChamberSodium(options = {}) {
    const scene = options.scene;
    const THREE = options.THREE;
    const quality = String(options.quality || 'balanced').toLowerCase();
    const sodiumKill = options.sodiumKill === true;

    if (!scene || !THREE) {
        throw new Error('createChamberSodium requires scene and THREE');
    }

    const group = new THREE.Group();
    group.name = 'chamberSodium';

    const meshParts = createFixtureMesh(THREE, group);
    const cookieTexture = createSpotCookieTexture(THREE);
    const lights = createSodiumLights(THREE, group, cookieTexture);
    const coneParts = createConeFanMesh(THREE, group);
    const beamDirection = new THREE.Vector3(
        FIXTURE_TARGET[0] - FIXTURE_POSITION[0],
        FIXTURE_TARGET[1] - (FIXTURE_POSITION[1] - 0.06),
        FIXTURE_TARGET[2] - FIXTURE_POSITION[2]
    ).normalize();
    const hazeCylinderParts = createHazeCylinderMesh(THREE, group, beamDirection);
    const fogScrimParts = createFogScrimStack(THREE, group);
    const presenceParts = createPresenceMesh(THREE, group);

    const glowTexture = createElongatedGlowTexture(THREE, 2.9 / 0.28);
    const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(SODIUM_COLOR_RUN)
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(2.9, 0.28, 1);
    glowSprite.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1] - 0.05, FIXTURE_POSITION[2]);
    group.add(glowSprite);

    const haloTexture = createElongatedGlowTexture(THREE, 4.2 / 0.55);
    const haloMaterial = new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(SODIUM_COLOR_WARMUP)
    });
    const haloSprite = new THREE.Sprite(haloMaterial);
    haloSprite.scale.set(4.2, 0.55, 1);
    haloSprite.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1] - 0.12, FIXTURE_POSITION[2]);
    group.add(haloSprite);

    const emberTexture = createLinearGlowTexture(THREE);
    const emberSpriteMaterial = new THREE.SpriteMaterial({
        map: emberTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(SODIUM_EMBER_COLOR)
    });
    const emberSprite = new THREE.Sprite(emberSpriteMaterial);
    emberSprite.scale.set(0.9, 0.10, 1);
    emberSprite.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1] - 0.05, FIXTURE_POSITION[2]);
    group.add(emberSprite);

    const scarTexture = createLinearGlowTexture(THREE);
    const scarMaterial = new THREE.SpriteMaterial({
        map: scarTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: new THREE.Color('#c8b8a8')
    });
    const scarSprite = new THREE.Sprite(scarMaterial);
    scarSprite.scale.set(2.4, 0.18, 1);
    scarSprite.position.set(FIXTURE_POSITION[0], FIXTURE_POSITION[1] - 0.05, FIXTURE_POSITION[2]);
    group.add(scarSprite);

    const poolTexture = createFloorPoolTexture(THREE);
    const poolMaterial = new THREE.MeshBasicMaterial({
        map: poolTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(SODIUM_COLOR_RUN)
    });
    const poolMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 4.4), poolMaterial);
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.set(FIXTURE_TARGET[0], 0.02, FIXTURE_TARGET[2]);
    group.add(poolMesh);

    const contactTexture = createContactEllipseTexture(THREE);
    const contactMaterial = new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
        color: new THREE.Color(0x000000)
    });
    const contactMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CONTACT_ELLIPSE_RADIUS * 2, CONTACT_ELLIPSE_RADIUS * 2),
        contactMaterial
    );
    contactMesh.rotation.x = -Math.PI / 2;
    contactMesh.scale.set(CONTACT_FOOTPRINT_SCALE, CONTACT_FOOTPRINT_SCALE, 1);
    contactMesh.position.set(FIXTURE_TARGET[0], 0.021, FIXTURE_TARGET[2]);
    group.add(contactMesh);

    let stagePost = null;
    let stageFoot = null;
    if (options.physicalRoom === true) {
        meshParts.fixture.name = 'sodiumFixture';
        meshParts.tube.position.y = -0.085;
        meshParts.fixture.position.x -= 3.5;
        lights.spots.forEach(({ light }) => {
            light.position.x -= 3.5;
        });
        // The receiving room and real shadow replace additive proxy architecture.
        // Detach at construction: later opacity/visibility updates cannot revive it.
        group.remove(coneParts.coneGroup, hazeCylinderParts.mesh, presenceParts.presence,
            poolMesh, contactMesh, glowSprite, haloSprite, scarSprite);
        for (const entry of fogScrimParts.scrims) {
            group.remove(entry.mesh);
        }
    }
    if (options.stageRoom === true) {
        meshParts.fixture.position.z = 3;
        // The proposal key is placed at the tube and owns its single cast shadow.
        // Retire the auxiliary spots here rather than stacking unrelated shadows.
        for (const { light } of lights.spots) {
            group.remove(light, light.target);
            light.castShadow = false;
        }
        group.remove(lights.scatterFill, lights.scotopicAmbient, emberSprite);
        const oldRod = meshParts.fixture.children[4];
        meshParts.fixture.remove(oldRod);
        oldRod.geometry.dispose();
        stagePost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 12), meshParts.holderMaterial);
        stagePost.name = 'sodiumStand';
        stagePost.position.x = -0.9;
        stageFoot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), meshParts.holderMaterial);
        stageFoot.name = 'sodiumFoot';
        stageFoot.position.x = -0.9;
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.16), meshParts.holderMaterial);
        bracket.position.set(-0.9, 0, 0);
        for (const mesh of [stagePost, stageFoot, bracket]) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            meshParts.fixture.add(mesh);
        }
    }
    scene.add(group);

    const intensityScale = quality === 'safe' ? 0.72 : 1;

    let lastElapsed = null;
    let disposed = false;
    const fixtureWorld = new THREE.Vector3(...FIXTURE_POSITION);
    const cameraScratch = new THREE.Vector3();
    const scrimLookTarget = new THREE.Vector3();

    function resolveState(elapsed) {
        if (sodiumKill) {
            return { mode: 'run', level: SODIUM_KILL_RUN_LEVEL, colorT: 0.75 };
        }
        return sampleSodiumState(elapsed);
    }

    function applyChromaColor(colorHex, elapsed) {
        let effectiveHex = colorHex;
        if (!sodiumKill) {
            const kelvinHex = authoredAmberHexForKelvin(sampleSodiumKelvin(elapsed));
            effectiveHex = lerpHexColor(colorHex, kelvinHex, 0.35);
        }
        const color = new THREE.Color(effectiveHex);
        lights.spots.forEach((entry) => {
            entry.light.color.copy(color);
        });
        if (lights.scatterFill) {
            lights.scatterFill.color.copy(color);
        }
        glowMaterial.color.copy(color);
        haloMaterial.color.copy(color);
        poolMaterial.color.copy(color);
        coneParts.conePlanes?.forEach((entry) => {
            entry.material.color.copy(color);
        });
    }

    function update(elapsed, updateOptions = {}) {
        if (disposed || !Number.isFinite(elapsed)) {
            return;
        }
        lastElapsed = elapsed;
        const state = resolveState(elapsed);
        const colorHex = sampleSodiumColor(state.colorT, state.mode);
        const lit = state.level > 0.001 && state.mode !== 'off';
        const tubeVisual = sodiumKill
            ? { intensity: SODIUM_TUBE_EMISSIVE_BASE + SODIUM_KILL_RUN_LEVEL * SODIUM_TUBE_EMISSIVE_GAIN, colorHex, ignitionTravel: 1 }
            : sampleSodiumTubeVisual(elapsed);
        const emberIntensity = tubeVisual.intensity;
        const darkAdvance = sodiumKill ? 1 : sampleDarkAdvance(elapsed);
        const tiredEye = sodiumKill ? 0 : sampleSodiumTiredEye(elapsed);
        const scarOpacity = sodiumKill ? 0 : sampleRetinalScarOpacity(elapsed);
        const atmosphereBlackout = !sodiumKill && isSodiumAtmosphereBlackout(elapsed);
        const cameraPosition = updateOptions.cameraPosition;

        applyChromaColor(colorHex, elapsed);

        const keyIntensity = lit ? state.level * SPOT_INTENSITY_SCALE * intensityScale : 0;
        lights.spots.forEach((entry) => {
            entry.light.distance = SPOT_DISTANCE * darkAdvance;
            entry.light.intensity = keyIntensity * entry.intensityWeight;
            entry.light.visible = lit;
        });

        if (lights.scatterFill) {
            lights.scatterFill.intensity = lit
                ? state.level * SCATTER_FILL_INTENSITY_GAIN * intensityScale
                : 0;
            lights.scatterFill.visible = lit;
        }

        const scotopicIntensity = sodiumKill
            ? 0
            : sampleScotopicAmbientIntensity(elapsed, state.mode === 'off' ? 0 : state.level);
        if (lights.scotopicAmbient) {
            lights.scotopicAmbient.intensity = scotopicIntensity;
            lights.scotopicAmbient.visible = scotopicIntensity > 0.0001;
        }

        const glowWidth = 2.9 + tiredEye * 1.4;
        const travel = tubeVisual.ignitionTravel ?? 1;
        glowSprite.scale.set(glowWidth * Math.max(travel, 0.18), 0.28, 1);
        glowMaterial.opacity = lit || emberIntensity > 0.04 ? state.level * 0.95 + emberIntensity * 0.35 : emberIntensity * 0.55;
        glowMaterial.color.set(tubeVisual.colorHex || colorHex);
        glowSprite.position.set(
            FIXTURE_POSITION[0] - (1 - travel) * 0.42,
            FIXTURE_POSITION[1] - 0.05,
            FIXTURE_POSITION[2]
        );

        haloSprite.scale.set(4.2 + tiredEye * 0.8, 0.55, 1);
        haloMaterial.opacity = lit ? state.level * 0.34 : emberIntensity * 0.12;
        haloMaterial.color.set(tubeVisual.colorHex || colorHex);

        const breathMul = sodiumKill
            ? 1
            : sampleCandleBreath(SODIUM_FOG_SCRIM_BREATH_ID, elapsed).poolOpacityMul;
        const scrimOpacities = atmosphereBlackout
            ? [0, 0, 0, 0]
            : sampleSodiumFogScrimOpacities(elapsed, breathMul);
        const hazeLevel = scrimOpacities.some((opacity) => opacity > 0.001)
            ? sampleSodiumHazeArc(elapsed)
            : 0;
        if (hazeCylinderParts.material) {
            hazeCylinderParts.material.uniforms.uLevel.value = hazeLevel;
            hazeCylinderParts.material.uniforms.uColor.value.set(colorHex);
            if (updateOptions.cameraPosition?.x !== undefined) {
                hazeCylinderParts.material.uniforms.uCameraPos.value.copy(updateOptions.cameraPosition);
            }
            hazeCylinderParts.mesh.visible = hazeLevel > 0.001;
        }
        fogScrimParts.scrims.forEach((entry, index) => {
            /* eslint-disable-next-line security/detect-object-injection -- fixed scrim roster */
            const opacity = scrimOpacities[index] ?? 0;
            /* eslint-enable security/detect-object-injection */
            entry.material.opacity = opacity;
            entry.mesh.visible = opacity > 0.001;
            if (cameraPosition?.x !== undefined) {
                scrimLookTarget.copy(cameraPosition);
                entry.mesh.lookAt(scrimLookTarget);
            }
        });

        contactMaterial.opacity = lit ? clamp(state.level * darkAdvance, 0, 1) : 0;
        contactMesh.visible = contactMaterial.opacity > 0.001;

        emberSpriteMaterial.opacity = !lit && emberIntensity > 0.001 ? 0.55 : 0;
        emberSprite.position.set(
            FIXTURE_POSITION[0] - (1 - travel) * 0.18,
            FIXTURE_POSITION[1] - 0.05,
            FIXTURE_POSITION[2]
        );

        poolMesh.scale.set(darkAdvance, darkAdvance, 1);
        poolMaterial.opacity = lit ? state.level * POOL_OPACITY_SCALE * darkAdvance : 0;

        const baseConeOpacity = lit && !atmosphereBlackout
            ? state.level * CONE_OPACITY_SCALE * darkAdvance
            : 0;
        let wedgeWeights = null;
        if (baseConeOpacity > 0.001 && cameraPosition?.x !== undefined) {
            cameraScratch.copy(cameraPosition).sub(fixtureWorld);
            const cameraAzimuth = Math.atan2(cameraScratch.x, cameraScratch.z);
            wedgeWeights = sampleConeWedgeWeights(cameraAzimuth);
        }
        coneParts.conePlanes?.forEach((entry, index) => {
            const wedgeMul = wedgeWeights
                /* eslint-disable-next-line security/detect-object-injection -- fixed wedge roster */
                ? wedgeWeights[index] ?? 1
                : 1;
            entry.material.opacity = baseConeOpacity * wedgeMul;
        });
        coneParts.coneGroup.scale.set(1, darkAdvance, 1);
        coneParts.coneGroup.visible = baseConeOpacity > 0.001;

        const presenceLevel = lit ? state.level : 0;
        presenceParts.presence.visible = presenceLevel > 0.001;
        if (presenceParts.presenceMaterial) {
            presenceParts.presenceMaterial.opacity = clamp(presenceLevel * darkAdvance, 0, 1);
            presenceParts.presenceMaterial.transparent = presenceLevel < 0.98;
        }

        scarMaterial.opacity = scarOpacity;
        scarSprite.visible = scarOpacity > 0.001;

        if (meshParts.tubeMaterial?.emissive?.set) {
            if (lit || emberIntensity > 0.001) {
                meshParts.tubeMaterial.emissive.set(tubeVisual.colorHex || colorHex);
                meshParts.tubeMaterial.emissiveIntensity = emberIntensity;
            } else {
                meshParts.tubeMaterial.emissive.set(0x000000);
                meshParts.tubeMaterial.emissiveIntensity = 0;
            }
        }
    }

    function getState() {
        const elapsed = lastElapsed ?? 0;
        const state = resolveState(elapsed);
        return {
            ...state,
            color: sampleSodiumColor(state.colorT, state.mode),
            emberIntensity: sodiumKill
                ? SODIUM_TUBE_EMISSIVE_BASE + SODIUM_KILL_RUN_LEVEL * SODIUM_TUBE_EMISSIVE_GAIN
                : sampleSodiumTubeVisual(elapsed).intensity,
            darkAdvance: sodiumKill ? 1 : sampleDarkAdvance(elapsed),
            castsShadow: lights.spots.some((entry) => entry.light.castShadow === true),
            sodiumKill
        };
    }

    function hasShadowCasters() {
        return lights.spots.some((entry) => entry.light.castShadow === true);
    }

    function setFloorHeight(floorY) {
        if (!stagePost) {
            return;
        }
        const height = meshParts.fixture.position.y - floorY - 0.1;
        stagePost.scale.y = height;
        stagePost.position.y = -height / 2;
        stageFoot.position.y = -height - 0.05;
    }

    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        scene.remove(group);
        glowTexture?.dispose?.();
        glowMaterial?.dispose?.();
        haloTexture?.dispose?.();
        haloMaterial?.dispose?.();
        fogScrimParts.scrimTexture?.dispose?.();
        fogScrimParts.scrimGeometry?.dispose?.();
        fogScrimParts.scrims?.forEach((entry) => entry.material?.dispose?.());
        cookieTexture?.dispose?.();
        emberTexture?.dispose?.();
        emberSpriteMaterial?.dispose?.();
        scarTexture?.dispose?.();
        scarMaterial?.dispose?.();
        coneParts.coneGeometries?.forEach((geometry) => geometry?.dispose?.());
        coneParts.coneTexture?.dispose?.();
        coneParts.conePlanes?.forEach((entry) => entry.material?.dispose?.());
        presenceParts.presenceGeometry?.dispose?.();
        presenceParts.presenceMaterial?.dispose?.();
        poolTexture?.dispose?.();
        poolMaterial?.dispose?.();
        poolMesh.geometry?.dispose?.();
        contactTexture?.dispose?.();
        contactMaterial?.dispose?.();
        contactMesh.geometry?.dispose?.();
        hazeCylinderParts.geometry?.dispose?.();
        hazeCylinderParts.material?.dispose?.();
        meshParts.holderMaterial?.dispose?.();
        meshParts.tubeMaterial?.dispose?.();
        meshParts.fixture.traverse((child) => {
            if (child.isMesh && child.geometry) {
                child.geometry.dispose();
            }
        });
        group.clear();
    }

    return {
        group,
        setFloorHeight,
        presence: presenceParts.presence,
        update,
        getState,
        dispose,
        hasShadowCasters,
        getConfig: () => ({ quality, lightKind: lights.lightKind, sodiumKill })
    };
}
