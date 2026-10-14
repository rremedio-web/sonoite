/**
 * Track 4 — "Horas Mortas" film module, v2 (THE DARK IS TOO BIG FOR THE LAMP — 2026-08-14).
 *
 * One dying sodium fixture outliving the song. Camera grammar: long static holds
 * + one 80s slow push during BURN + FADE squeeze. Authored against analysis truth.
 */

const HORAS_MORTAS_RELIC_TARGET = [0.96, 2.0, -0.04];

const HORAS_MORTAS_CHAMBER_FILM_TIMELINE = {
    phaseWindows: [
        { name: 'DEAD_HOURS', start: 0, end: 119.25 },
        { name: 'WAKING', start: 119.25, end: 238.15 },
        { name: 'BURN', start: 238.15, end: 318.35 },
        { name: 'FADE', start: 318.35, end: 338.05 },
        { name: 'AFTER', start: 338.05, end: 386 },
        { name: 'TERMINAL', start: 386, end: 391.18 }
    ],
    camera: {
        baseFov: 44,
        basePosition: [5.4, 1.15, 8.8],
        target: HORAS_MORTAS_RELIC_TARGET,
        score: [
            // 1 — wide low-right: fixture + cable dominant, relic dark mass below. HOLD 119s.
            {
                atSeconds: 0,
                position: [5.4, 1.15, 8.8],
                target: [0.96, 3.35, -0.04],
                driftScale: 0,
                fov: 48
            },
            // 2 — WAKING gaze lift: tube returns to frame (NDC y ~0.71–0.76).
            {
                atSeconds: 119.25,
                transitionSeconds: 0,
                position: [-2.6, 2.15, 6.4],
                target: [0.96, 3.05, -0.04],
                driftScale: 0,
                fov: 44
            },
            // 3 — closer medium from left (only left-side setup).
            {
                atSeconds: 187,
                transitionSeconds: 0,
                position: [7.2, 2.45, 5.6],
                target: [0.96, 3.05, -0.04],
                driftScale: 0,
                fov: 44
            },
            // 4 — BURN push start: ¾ stack (tube / shaft / relic). fov 46 locked all 80s.
            {
                atSeconds: 238.15,
                position: [-3.4, 2.7, 8.8],
                target: [0.96, 3.0, -0.04],
                driftScale: 0,
                fov: 46
            },
            // 4b — push end: chest-height (~79.45s eased creep from setup 4; holds ~1.5s before FADE cut).
            {
                atSeconds: 317.60,
                transitionSeconds: 79.45,
                position: [-2.2, 2.52, 6.6],
                target: [0.96, 3.0, -0.04],
                driftScale: 0,
                fov: 46
            },
            // 5 — FADE wide medium + squeeze (fov 44→36 over 12s from phase start).
            {
                atSeconds: 319.10,
                transitionSeconds: 0,
                position: [-3.2, 3.05, 10.8],
                target: [0.96, 2.05, -0.04],
                driftScale: 0,
                fov: 44,
                fovRamp: {
                    startAtSeconds: 322.5,
                    from: 44,
                    to: 36,
                    durationSeconds: 15.5
                }
            },
            // 6 — AFTER wide: fixture + relic + empty room. HOLD until TERMINAL.
            {
                atSeconds: 338.05,
                transitionSeconds: 0,
                position: [0.96, 2.55, 14.2],
                target: [0.96, 2.2, -0.04],
                driftScale: 0,
                fov: 50
            },
            // 7 — TERMINAL: same frame (fixture dies in the held wide; no cut).
            {
                atSeconds: 386,
                transitionSeconds: 0,
                position: [0.96, 2.55, 14.2],
                target: [0.96, 2.2, -0.04],
                driftScale: 0,
                fov: 50
            }
        ]
    },
    lighting: {
        // Sodium is the only species — chamber key/rim stay suppressed; scores are inert.
        score: [
            { atSeconds: 0, keyWeight: 0, rimWeight: 0, fillWeight: 0, backWeight: 0 }
        ]
    },
    stage3: {
        // Own this gain rather than inherit Track 5's taste adjustments.
        accentIntensity: 0.483,
        reactivityRevealStartSeconds: 30,
        reactivityRevealEndSeconds: 90,
        phaseResponse: {
            smoothingSlow: 0.82,
            smoothingFast: 2.8,
            audioDriveMin: 0.138,
            audioDriveMax: 0.483,
            supportDriveMin: 0.207,
            supportDriveMax: 0.633
        },
        phaseCurves: {
            DEAD_HOURS: [
                { at: 0, air: 0.22, pressure: 0.12, warmth: 0.04, finish: 0.14, veil: 0.72, clarity: 0.42 },
                { at: 1, air: 0.22, pressure: 0.22, warmth: 0.12, finish: 0.22, veil: 0.72, clarity: 0.52 }
            ],
            WAKING: [
                { at: 0, air: 0.2, pressure: 0.28, warmth: 0.18, finish: 0.26, veil: 0.62, clarity: 0.62 },
                { at: 1, air: 0.32, pressure: 0.38, warmth: 0.28, finish: 0.34, veil: 0.48, clarity: 0.72 }
            ],
            BURN: [
                { at: 0, air: 0.46, pressure: 0.42, warmth: 0.42, finish: 0.38, veil: 0.18, clarity: 0.82 },
                { at: 1, air: 0.46, pressure: 0.48, warmth: 0.48, finish: 0.42, veil: 0.18, clarity: 0.88 }
            ],
            FADE: [
                { at: 0, air: 0.3, pressure: 0.34, warmth: 0.32, finish: 0.3, veil: 0.38, clarity: 0.68 },
                { at: 1, air: 0.18, pressure: 0.22, warmth: 0.18, finish: 0.22, veil: 0.55, clarity: 0.55 }
            ],
            AFTER: [
                { at: 0, air: 0.12, pressure: 0.14, warmth: 0.1, finish: 0.16, veil: 0.72, clarity: 0.48 },
                { at: 1, air: 0.06, pressure: 0.08, warmth: 0.06, finish: 0.12, veil: 0.82, clarity: 0.42 }
            ],
            TERMINAL: [
                { at: 0, air: 0.04, pressure: 0.05, warmth: 0.04, finish: 0.1, veil: 0.95, clarity: 0.35 },
                { at: 1, air: 0, pressure: 0, warmth: 0, finish: 0.06, veil: 1.0, clarity: 0.2 }
            ]
        },
        roomPressureBeats: [
            { atSeconds: 0, value: 0.32 },
            { atSeconds: 119.25, value: 0.48 },
            { atSeconds: 238.15, value: 0.62 },
            { atSeconds: 318.35, value: 0.38 },
            { atSeconds: 323, value: 0.34 },
            { atSeconds: 330, value: 0.39 },
            { atSeconds: 333.5, value: 0.27 },
            { atSeconds: 334.5, value: 0.31 },
            { atSeconds: 338.05, value: 0.22 },
            { atSeconds: 386, value: 0.08 },
            { atSeconds: 391.18, value: 0.02 }
        ],
        chamberLaw: [
            { atSeconds: 0, gravity: 0.22, contact: 0.08, airDensity: 0.42, damage: 0, forensic: 0.04, afterimage: 0, erasure: 0, uiSuppression: 0 },
            { atSeconds: 119.25, gravity: 0.32, contact: 0.14, airDensity: 0.48, damage: 0, forensic: 0.06, afterimage: 0, erasure: 0, uiSuppression: 0.08 },
            { atSeconds: 238.15, gravity: 0.38, contact: 0.18, airDensity: 0.52, damage: 0, forensic: 0.05, afterimage: 0, erasure: 0, uiSuppression: 0.12 },
            { atSeconds: 318.35, gravity: 0.28, contact: 0.12, airDensity: 0.44, damage: 0, forensic: 0.04, afterimage: 0.02, erasure: 0, uiSuppression: 0.18 },
            { atSeconds: 338.05, gravity: 0.18, contact: 0.06, airDensity: 0.36, damage: 0, forensic: 0.02, afterimage: 0.04, erasure: 0.04, uiSuppression: 0.28 },
            { atSeconds: 386, gravity: 0.08, contact: 0.02, airDensity: 0.18, damage: 0, forensic: 0, afterimage: 0.08, erasure: 0.42, uiSuppression: 0.42 },
            { atSeconds: 391.18, gravity: 0, contact: 0, airDensity: 0.04, damage: 0, forensic: 0, afterimage: 0, erasure: 1.0, uiSuppression: 0.55 }
        ],
        eventBeats: [],
        phaseProfiles: {
            DEAD_HOURS: {
                smoothingScale: 0.45,
                audioDriveScale: 0.23,
                supportDriveScale: 0.345,
                breathScale: 0.15,
                thresholdDelta: -0.18,
                supportDelta: -0.16,
                roomPressureDelta: 0.04,
                floorDelta: -0.12,
                dustDelta: -0.02,
                shellDelta: -0.08,
                hazeDelta: 0,
                fogDelta: 0,
                vignetteDarknessDelta: 0.18,
                vignetteOffsetDelta: -0.12,
                vignetteSoftnessDelta: -0.06,
                cameraDriftScale: 0,
                fovBreathScale: 0
            },
            WAKING: {
                smoothingScale: 0.55,
                audioDriveScale: 0.322,
                supportDriveScale: 0.437,
                breathScale: 0.2,
                thresholdDelta: -0.1,
                supportDelta: -0.08,
                roomPressureDelta: 0.06,
                floorDelta: -0.06,
                dustDelta: 0,
                shellDelta: -0.04,
                hazeDelta: 0,
                fogDelta: 0,
                vignetteDarknessDelta: 0.1,
                vignetteOffsetDelta: -0.08,
                vignetteSoftnessDelta: -0.04,
                cameraDriftScale: 0,
                fovBreathScale: 0
            },
            BURN: {
                smoothingScale: 0.65,
                audioDriveScale: 0.403,
                supportDriveScale: 0.518,
                breathScale: 0.22,
                thresholdDelta: 0,
                supportDelta: 0,
                roomPressureDelta: 0.08,
                floorDelta: 0,
                dustDelta: 0.02,
                shellDelta: 0,
                hazeDelta: 0.02,
                fogDelta: 0,
                vignetteDarknessDelta: -0.06,
                vignetteOffsetDelta: 0.04,
                vignetteSoftnessDelta: 0,
                cameraDriftScale: 0,
                fovBreathScale: 0
            },
            FADE: {
                smoothingScale: 0.5,
                audioDriveScale: 0.253,
                supportDriveScale: 0.368,
                breathScale: 0.16,
                thresholdDelta: -0.08,
                supportDelta: -0.06,
                roomPressureDelta: -0.04,
                floorDelta: -0.06,
                dustDelta: -0.02,
                shellDelta: -0.04,
                hazeDelta: -0.02,
                fogDelta: 0.01,
                vignetteDarknessDelta: 0.12,
                vignetteOffsetDelta: -0.06,
                vignetteSoftnessDelta: -0.03,
                cameraDriftScale: 0,
                fovBreathScale: 0
            },
            AFTER: {
                smoothingScale: 0.35,
                audioDriveScale: 0.092,
                supportDriveScale: 0.138,
                breathScale: 0.08,
                thresholdDelta: -0.14,
                supportDelta: -0.12,
                roomPressureDelta: -0.06,
                floorDelta: -0.1,
                dustDelta: -0.04,
                shellDelta: -0.08,
                hazeDelta: -0.03,
                fogDelta: 0.01,
                vignetteDarknessDelta: 0.04,
                vignetteOffsetDelta: 0.04,
                vignetteSoftnessDelta: -0.05,
                cameraDriftScale: 0,
                fovBreathScale: 0
            },
            TERMINAL: {
                smoothingScale: 0.2,
                audioDriveScale: 0,
                supportDriveScale: 0,
                breathScale: 0,
                thresholdDelta: -0.22,
                supportDelta: -0.18,
                roomPressureDelta: -0.08,
                floorDelta: -0.14,
                dustDelta: -0.06,
                shellDelta: -0.1,
                hazeDelta: -0.05,
                fogDelta: 0.02,
                vignetteDarknessDelta: 0.24,
                vignetteOffsetDelta: -0.14,
                vignetteSoftnessDelta: -0.06,
                cameraDriftScale: 0,
                fovBreathScale: 0
            }
        }
    }
};

/** THE INSOMNIAC EYE — dark-adaptation toe-lift keyed to phase windows (v4 §P3-11). */
const HORAS_MORTAS_DARK_ADAPTATION_KEYFRAMES = Object.freeze([
    { at: 0, value: 0.0 },
    { at: 119.25, value: 0.0 },
    { at: 238.15, value: 0.015 },
    { at: 238.16, value: 0.0 },
    { at: 318.35, value: 0.0 },
    { at: 338.05, value: 0.03 },
    { at: 341.80, value: 0.05 },
    { at: 358.50, value: 0.08 },
    { at: 374.05, value: 0.11 },
    { at: 386, value: 0.0 }
]);

function smoothstep01(t) {
    if (!(t > 0)) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

function sampleHorasMortasKeyframeEnvelope(elapsed, keyframes) {
    if (!keyframes.length) {
        return 0;
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
 * Dark-adaptation curve for scotopic hemisphere ambient (v4b §P3-11).
 * Consumed in chamber-sodium as intensity × SODIUM_SCOTOPIC_AMBIENT_SCALE; forced 0 when level < 0.05.
 *
 * @param {number} elapsed Track seconds
 * @return {number} Lift floor 0–0.11
 */
function sampleHorasMortasDarkAdaptation(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return 0;
    }
    return sampleHorasMortasKeyframeEnvelope(elapsed, HORAS_MORTAS_DARK_ADAPTATION_KEYFRAMES);
}

export {
    HORAS_MORTAS_RELIC_TARGET,
    HORAS_MORTAS_CHAMBER_FILM_TIMELINE,
    HORAS_MORTAS_DARK_ADAPTATION_KEYFRAMES,
    sampleHorasMortasDarkAdaptation
};
