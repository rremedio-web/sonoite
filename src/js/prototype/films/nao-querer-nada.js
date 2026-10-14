/**
 * Track 5 — "Não Querer Nada" film module (E3-lite extraction, Prompt #204).
 *
 * Moved VERBATIM from experience.js (audit 2026-08-13 / June audit P1 #10:
 * extract the film score before a second track gets inlined). Contains the
 * complete authored score for both Track 5 pictures:
 *   - the accepted default film (TRACK5_FILM_DIRECTOR_CAMERA +
 *     TRACK5_CHAMBER_FILM_TIMELINE, and the reliquary-observed variant score)
 *   - the audio-led middle recut (TRACK5_RECUT_* camera/timeline/phrases)
 *
 * Editing rule unchanged: this is the authored truth for the canonical
 * track5-cinema route — the JSON camera score stays dead here (deepMerge
 * replaces arrays wholesale). Tests scrape this file's source text via
 * 'const TRACK5_*' tokens — keep declarations as bare `const` with the
 * export block at the bottom.
 *
 * References in the recut comments: "creative layer §N" is
 * docs/superpowers/specs/2026-07-23-track5-recut-creative-layer-design.md.
 * "Build spec §N" (the approved Track 5 recut build spec, 2026-07-23),
 * "audit 2026-08-13" (the August full-theme audit) and "scout §N" (the recut
 * material-target scout run) are working documents not included in this repo.
 */

import { EVENT_TYPE } from '../chamber-constants.js';

const RELIQUARY_OBSERVED_TRACK5_TIMELINE = {
    camera: {
        baseFov: 50,
        score: [
            { atSeconds: 0, position: [-4.88, 2.86, 15.4], target: [0.72, 2.14, -0.68], driftScale: 0.06, fov: 50 },
            { atSeconds: 20, transitionSeconds: 8, position: [-4.72, 2.84, 15.08], target: [0.76, 2.16, -0.62], driftScale: 0.06, fov: 50 },
            { atSeconds: 42, transitionSeconds: 10, position: [-4.16, 2.78, 14.18], target: [0.82, 2.18, -0.54], driftScale: 0.06, fov: 48 },
            { atSeconds: 54, transitionSeconds: 12, position: [-5.86, 2.34, 8.34], target: [0.96, 2.26, -0.06], driftScale: 0.05, fov: 38 },
            { atSeconds: 78, transitionSeconds: 10, position: [-5.72, 2.42, 9.64], target: [1.0, 2.26, -0.1], driftScale: 0.06, fov: 42 },
            { atSeconds: 96.03, transitionSeconds: 12, position: [0.18, 3.14, 14.62], target: [0.82, 2.08, -0.48], driftScale: 0.08, fov: 56 },
            { atSeconds: 120, transitionSeconds: 10, position: [0.52, 3.0, 12.78], target: [0.84, 2.1, -0.5], driftScale: 0.08, fov: 54 },
            { atSeconds: 150, transitionSeconds: 10, position: [2.56, 2.94, 11.84], target: [0.96, 2.12, -0.42], driftScale: 0.08, fov: 48 },
            { atSeconds: 186, transitionSeconds: 10, position: [4.88, 2.82, 12.88], target: [1.06, 2.16, -0.26], driftScale: 0.09, fov: 50 },
            { atSeconds: 216, transitionSeconds: 10, position: [5.82, 2.68, 11.64], target: [1.08, 2.18, -0.2], driftScale: 0.1, fov: 50 },
            { atSeconds: 236, transitionSeconds: 8, position: [5.18, 2.28, 7.18], target: [1.16, 2.24, 0.08], driftScale: 0.04, fov: 34 },
            { atSeconds: 252, transitionSeconds: 8, position: [6.06, 2.54, 8.92], target: [1.12, 2.2, -0.02], driftScale: 0.06, fov: 40 },
            { atSeconds: 281, transitionSeconds: 12, position: [7.88, 3.22, 18.2], target: [0.82, 2.14, -0.56], driftScale: 0.14, fov: 70 },
            { atSeconds: 308, transitionSeconds: 10, position: [6.48, 3.08, 16.12], target: [0.72, 2.22, -0.46], driftScale: 0.14, fov: 64 },
            { atSeconds: 336, transitionSeconds: 10, position: [0.42, 2.92, 13.24], target: [0.84, 2.18, -0.3], driftScale: 0.1, fov: 52 },
            { atSeconds: 372, transitionSeconds: 10, position: [-6.12, 2.86, 13.74], target: [0.62, 2.18, -0.66], driftScale: 0.08, fov: 54 },
            { atSeconds: 408, transitionSeconds: 8, position: [-7.02, 2.74, 11.24], target: [0.96, 2.22, -0.22], driftScale: 0.08, fov: 46 },
            { atSeconds: 432, transitionSeconds: 18, position: [0.94, 3.24, 18.62], target: [0.84, 2.12, -0.46], driftScale: 0.06, fov: 74 },
            { atSeconds: 450, transitionSeconds: 12, position: [1.12, 3.08, 17.92], target: [0.84, 2.12, -0.44], driftScale: 0.04, fov: 70 },
            { atSeconds: 480, transitionSeconds: 10, position: [2.44, 2.88, 15.84], target: [0.94, 2.14, -0.28], driftScale: 0.03, fov: 60 },
            { atSeconds: 510, transitionSeconds: 10, position: [-0.4, 2.74, 14.8], target: [0.88, 2.14, -0.34], driftScale: 0.02, fov: 52 },
            { atSeconds: 558, transitionSeconds: 10, position: [-2.82, 2.86, 20.18], target: [0.7, 2.08, -0.86], driftScale: 0.0, fov: 76 }
        ]
    },
    lighting: {
        score: [
            { atSeconds: 0, keyWeight: 0.82, rimWeight: 0.82, fillWeight: 0.44, backWeight: 1.18 },
            { atSeconds: 96.03, keyWeight: 0.88, rimWeight: 0.76, fillWeight: 0.34, backWeight: 1.02 },
            { atSeconds: 150, keyWeight: 0.94, rimWeight: 0.92, fillWeight: 0.3, backWeight: 0.96 },
            { atSeconds: 216, keyWeight: 1.04, rimWeight: 1.06, fillWeight: 0.26, backWeight: 0.88 },
            { atSeconds: 281, keyWeight: 0.9, rimWeight: 0.98, fillWeight: 0.28, backWeight: 1.12 },
            { atSeconds: 340, keyWeight: 0.84, rimWeight: 1.14, fillWeight: 0.26, backWeight: 1.04 },
            { atSeconds: 372, keyWeight: 0.76, rimWeight: 1.08, fillWeight: 0.22, backWeight: 0.96 },
            { atSeconds: 432, transitionSeconds: 18, keyWeight: 0.66, rimWeight: 0.82, fillWeight: 0.22, backWeight: 0.82 },
            { atSeconds: 510, keyWeight: 0.5, rimWeight: 0.52, fillWeight: 0.16, backWeight: 0.6 },
            { atSeconds: 564, keyWeight: 0.3, rimWeight: 0.22, fillWeight: 0.08, backWeight: 0.34 }
        ]
    },
    stage3: {
        reactivityRevealStartSeconds: 14,
        reactivityRevealEndSeconds: 44,
        phaseResponse: {
            smoothingSlow: 0.9,
            smoothingFast: 4.2,
            audioDriveMin: 0.414,
            audioDriveMax: 1.472,
            supportDriveMin: 0.598,
            supportDriveMax: 1.564
        },
        phaseProfiles: {
            VOID: {
                smoothingScale: 0.72,
                audioDriveScale: 0.966,
                supportDriveScale: 0.989,
                breathScale: 0.76,
                thresholdDelta: -0.14,
                supportDelta: -0.12,
                roomPressureDelta: 0.04,
                floorDelta: -0.1,
                dustDelta: -0.03,
                shellDelta: -0.08,
                wingDelta: -0.14,
                gazeDelta: -0.18,
                aisleDelta: -0.18,
                hazeDelta: -0.02,
                fogDelta: 0.012,
                vignetteDarknessDelta: 0.12,
                vignetteOffsetDelta: -0.12,
                vignetteSoftnessDelta: -0.04,
                cameraDriftScale: 0.72,
                fovBreathScale: 0.7
            },
            AWAKENING: {
                smoothingScale: 0.92,
                audioDriveScale: 1.104,
                supportDriveScale: 1.127,
                breathScale: 0.92,
                thresholdDelta: -0.02,
                supportDelta: 0.0,
                roomPressureDelta: 0.0,
                floorDelta: 0.0,
                dustDelta: 0.0,
                shellDelta: 0.02,
                wingDelta: 0.02,
                gazeDelta: 0.0,
                aisleDelta: 0.0,
                hazeDelta: 0.02,
                fogDelta: 0.004,
                vignetteDarknessDelta: 0.02,
                vignetteOffsetDelta: -0.04,
                vignetteSoftnessDelta: 0.0,
                cameraDriftScale: 0.9,
                fovBreathScale: 0.9
            },
            WANTING: {
                smoothingScale: 1.24,
                audioDriveScale: 1.288,
                supportDriveScale: 1.242,
                breathScale: 1.08,
                thresholdDelta: 0.08,
                supportDelta: 0.08,
                roomPressureDelta: 0.06,
                floorDelta: -0.04,
                dustDelta: 0.01,
                shellDelta: 0.05,
                wingDelta: 0.12,
                gazeDelta: 0.2,
                aisleDelta: 0.12,
                hazeDelta: 0.08,
                fogDelta: 0.006,
                vignetteDarknessDelta: 0.04,
                vignetteOffsetDelta: -0.06,
                vignetteSoftnessDelta: -0.02,
                cameraDriftScale: 1.02,
                fovBreathScale: 0.78
            },
            RELEASE: {
                smoothingScale: 1.38,
                audioDriveScale: 1.403,
                supportDriveScale: 1.334,
                breathScale: 1.12,
                thresholdDelta: 0.04,
                supportDelta: 0.1,
                roomPressureDelta: -0.02,
                floorDelta: 0.1,
                dustDelta: 0.03,
                shellDelta: 0.02,
                wingDelta: 0.04,
                gazeDelta: 0.08,
                aisleDelta: 0.24,
                hazeDelta: 0.18,
                fogDelta: 0.0,
                vignetteDarknessDelta: -0.1,
                vignetteOffsetDelta: 0.14,
                vignetteSoftnessDelta: 0.08,
                cameraDriftScale: 1.18,
                fovBreathScale: 1.16
            },
            ERASURE: {
                smoothingScale: 0.88,
                audioDriveScale: 1.058,
                supportDriveScale: 1.196,
                breathScale: 0.82,
                thresholdDelta: -0.04,
                supportDelta: -0.02,
                roomPressureDelta: -0.04,
                floorDelta: -0.02,
                dustDelta: -0.02,
                shellDelta: -0.06,
                wingDelta: -0.08,
                gazeDelta: -0.16,
                aisleDelta: -0.1,
                hazeDelta: 0.02,
                fogDelta: 0.016,
                vignetteDarknessDelta: 0.02,
                vignetteOffsetDelta: 0.18,
                vignetteSoftnessDelta: 0.1,
                cameraDriftScale: 0.58,
                fovBreathScale: 0.72
            }
        },
        materialResponse: {
            midThreshold: 0.32,
            midAttackSeconds: 1.6,
            midReleaseSeconds: 3.8,
            iridescenceMax: 0.16,
            iridescenceIORMin: 1.14,
            iridescenceIORMax: 1.44
        },
        roomPressureBeats: [
            { atSeconds: 0, value: 0.82 },
            { atSeconds: 20, value: 0.76 },
            { atSeconds: 54, value: 0.52 },
            { atSeconds: 78, value: 0.62 },
            { atSeconds: 96.03, value: 0.44 },
            { atSeconds: 120, value: 0.34 },
            { atSeconds: 150, value: 0.48 },
            { atSeconds: 190, value: 0.58 },
            { atSeconds: 216, value: 0.68 },
            { atSeconds: 236, value: 0.82 },
            { atSeconds: 268, value: 0.9 },
            { atSeconds: 281, value: 0.54 },
            { atSeconds: 308, value: 0.32 },
            { atSeconds: 336, value: 0.38 },
            { atSeconds: 372, value: 0.46 },
            { atSeconds: 408, value: 0.58 },
            { atSeconds: 432, value: 0.48 },
            { atSeconds: 468, value: 0.42 },
            { atSeconds: 510, value: 0.32 },
            { atSeconds: 540, value: 0.18 },
            { atSeconds: 558, value: 0.06 }
        ],
        eventBeats: [
            { id: 't5_observed_first_open', type: EVENT_TYPE.ROOM_OPEN, atSeconds: 44, durationSeconds: 12 },
            {
                id: 't5_observed_first_push',
                type: EVENT_TYPE.CAMERA_PUSH,
                atSeconds: 54,
                durationSeconds: 11,
                camera: {
                    position: [-6.14, 2.22, 7.08],
                    target: [1.04, 2.24, -0.02],
                    driftScale: 0.02,
                    fov: 35
                }
            },
            { id: 't5_observed_first_material', type: EVENT_TYPE.MATERIAL_REVEAL, atSeconds: 55.2, durationSeconds: 11 },
            { id: 't5_observed_first_reset', type: EVENT_TYPE.BLACK_GAP, atSeconds: 95.76, durationSeconds: 0.3, reopenSeconds: 1.18 },
            { id: 't5_observed_fix_arrival', type: EVENT_TYPE.FIX, atSeconds: 110, durationSeconds: 22 },
            { id: 't5_observed_weight_tighten', type: EVENT_TYPE.ROOM_TIGHTEN, atSeconds: 228, durationSeconds: 16 },
            {
                id: 't5_observed_weight_push',
                type: EVENT_TYPE.CAMERA_PUSH,
                atSeconds: 236,
                durationSeconds: 13,
                camera: {
                    position: [5.54, 2.18, 6.82],
                    target: [1.12, 2.22, 0.08],
                    driftScale: 0.015,
                    fov: 34
                }
            },
            { id: 't5_observed_weight_material', type: EVENT_TYPE.MATERIAL_REVEAL, atSeconds: 236.24, durationSeconds: 12 },
            { id: 't5_observed_pre_release_crush', type: EVENT_TYPE.POST_CRUSH, atSeconds: 267, durationSeconds: 0.72 },
            { id: 't5_observed_release_gap', type: EVENT_TYPE.BLACK_GAP, atSeconds: 280.72, durationSeconds: 0.34, reopenSeconds: 1.34 },
            { id: 't5_observed_release_open', type: EVENT_TYPE.ROOM_OPEN, atSeconds: 308, durationSeconds: 20 },
            { id: 't5_observed_release_fix', type: EVENT_TYPE.FIX, atSeconds: 372, durationSeconds: 24 },
            { id: 't5_observed_residue_gap', type: EVENT_TYPE.BLACK_GAP, atSeconds: 431.72, durationSeconds: 0.34, reopenSeconds: 1.44 },
            { id: 't5_observed_residue_bleach', type: EVENT_TYPE.BLEACH, atSeconds: 468, durationSeconds: 24 },
            {
                id: 't5_observed_final_return',
                type: EVENT_TYPE.CAMERA_RESET,
                atSeconds: 510,
                durationSeconds: 16,
                camera: {
                    position: [-2.98, 2.5, 11.76],
                    target: [0.88, 2.14, -0.34],
                    driftScale: 0.02,
                    fov: 50
                }
            },
            {
                id: 't5_observed_final_bleach',
                type: EVENT_TYPE.BLEACH,
                atSeconds: 548,
                durationSeconds: 12,
                room: {
                    shellOpacityDelta: -0.14,
                    floorOpacityDelta: -0.12,
                    thresholdDelta: -0.1,
                    supportDelta: -0.12,
                    roomPressureDelta: -0.12
                },
                post: {
                    bloomDelta: -0.08,
                    grainDelta: 0.01,
                    vignetteDarknessDelta: 0.1,
                    vignetteOffsetDelta: -0.08,
                    vignetteSoftnessDelta: -0.04,
                    exposureDelta: -0.1
                }
            }
        ]
    }
};

// Measured relic bounds: scripts/track5-measured-bounds.json (H=7.422308)
const TRACK5_FILM_TARGET = [0.959854, 1.901261, -0.038787];
const TRACK5_FILM_FLOWER_HEAD = [0.959854, 5.612414, -0.038787];

const TRACK5_FILM_DIRECTOR_CAMERA = {
    target: TRACK5_FILM_TARGET,
    director: {
        enabled: true
    },
    setups: {
        ws_front_low: {
            framing: 'WS',
            height: 'low',
            yaw: 0,
            pitch: -0.12,
            distance: 31.174,
            fov: 32,
            screenX: 0,
            screenY: -0.05,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_rim',
            dollyPerBar: 0.148446
        },
        mcu_left_eye: {
            framing: 'MCU',
            height: 'eye',
            yaw: -0.785,
            pitch: 0.02,
            distance: 14.845,
            fov: 40,
            screenX: 0.08,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'cold_side',
            orbitPerBar: 0.222669
        },
        ws_right_arch: {
            framing: 'WS',
            height: 'eye',
            yaw: 0.785,
            pitch: 0.1,
            distance: 34.143,
            fov: 30,
            screenX: -0.1,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'cold_side',
            dollyPerBar: 0.111335
        },
        ws_back_silhouette: {
            framing: 'WS',
            height: 'low',
            yaw: 3.14,
            pitch: -0.08,
            distance: 29.689,
            fov: 34,
            screenX: 0,
            screenY: -0.08,
            roll: 0,
            localMotion: 0,
            lightRig: 'back_silhouette',
            orbitPerBar: 0.148446
        },
        mcu_right_low: {
            framing: 'MCU',
            height: 'low',
            yaw: 1.2,
            pitch: -0.15,
            distance: 14.102,
            fov: 42,
            screenX: -0.06,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure'
        },
        ws_front_high: {
            framing: 'WS',
            height: 'high',
            yaw: 0.1,
            pitch: 0.35,
            distance: 35.627,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'hush'
        },
        ws_false_release: {
            framing: 'WS',
            height: 'eye',
            yaw: -0.2,
            pitch: 0.03,
            distance: 38.596,
            fov: 28,
            screenX: 0,
            screenY: -0.1,
            roll: 0,
            localMotion: 0,
            lightRig: 'hush'
        },
        mcu_fracture: {
            framing: 'MCU',
            height: 'eye',
            yaw: -1.1,
            pitch: 0.05,
            distance: 12.618,
            fov: 44,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'fracture'
        },
        ws_room_reveal: {
            framing: 'WS',
            height: 'low',
            yaw: 0.3,
            pitch: -0.05,
            distance: 37.112,
            fov: 30,
            screenX: 0,
            screenY: -0.06,
            roll: 0,
            localMotion: 0,
            lightRig: 'room_reveal'
        },
        mcu_pressure_low: {
            framing: 'MCU',
            height: 'low',
            yaw: 1.35,
            pitch: -0.18,
            distance: 13.36,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure'
        },
        mcu_residue_right: {
            framing: 'MCU',
            height: 'eye',
            yaw: 1.1,
            pitch: 0.04,
            distance: 13.36,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular'
        },
        ecu_flower: {
            framing: 'ECU',
            height: 'high',
            yaw: 0.5,
            pitch: 0.2,
            distance: 5.196,
            fov: 58,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular',
            targetPoint: TRACK5_FILM_FLOWER_HEAD
        },
        ecu_surface: {
            framing: 'ECU',
            height: 'eye',
            yaw: -0.6,
            pitch: 0.08,
            distance: 4.082,
            fov: 62,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular',
            targetPoint: TRACK5_FILM_FLOWER_HEAD
        },
        ecu_vertigo: {
            framing: 'ECU',
            height: 'low',
            yaw: 0.9,
            pitch: -0.05,
            distance: 5.938,
            fov: 55,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'fracture',
            targetPoint: TRACK5_FILM_FLOWER_HEAD,
            motion: { effect: 'dollyZoom', effectDurationSeconds: 2.2 }
        },
        ecu_tar_reward: {
            framing: 'ECU',
            height: 'low',
            yaw: -0.9,
            pitch: -0.08,
            distance: 4.453,
            fov: 60,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular',
            targetPoint: TRACK5_FILM_FLOWER_HEAD
        },
        ws_erasure: {
            framing: 'WS',
            height: 'eye',
            yaw: -0.35,
            pitch: 0.05,
            distance: 40.822,
            fov: 28,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'extinction'
        },
        ws_final_trace: {
            framing: 'WS',
            height: 'low',
            yaw: 0.55,
            pitch: -0.12,
            distance: 48.245,
            fov: 26,
            screenX: 0,
            screenY: -0.12,
            roll: 0,
            localMotion: 0,
            lightRig: 'extinction'
        }
    },
    cutTimeline: {
        1: 'ws_front_low',
        10: 'mcu_left_eye',
        17: 'ws_right_arch',
        25: 'ws_back_silhouette',
        31: 'mcu_right_low',
        37: 'mcu_left_eye',
        43: 'ws_front_high',
        52: 'ws_false_release',
        65: 'mcu_right_low',
        76: 'mcu_fracture',
        83: 'ws_right_arch',
        90: 'mcu_left_eye',
        94: 'ws_room_reveal',
        107: 'mcu_pressure_low',
        114: 'ecu_surface',
        121: 'ecu_vertigo',
        128: 'ws_back_silhouette',
        165: 'ws_right_arch',
        179: 'mcu_residue_right',
        195: 'ecu_tar_reward',
        204: 'ws_erasure',
        213: 'ws_final_trace'
    },
    accentCuts: [
        { startBeat: 299, endBeat: 301, setupId: 'ecu_flower' }
    ]
};

const TRACK5_CHAMBER_FILM_TIMELINE = {
    phaseWindows: [
        { name: 'VOID', start: 0, end: 64 },
        { name: 'AWAKENING', start: 64, end: 135 },
        { name: 'RELEASE', start: 135, end: 198 },
        { name: 'WANTING', start: 198, end: 246 },
        { name: 'WANTING', start: 246, end: 337 },
        { name: 'RELEASE', start: 337, end: 534 },
        { name: 'ERASURE', start: 534, end: 564 }
    ],
    camera: {
        ...TRACK5_FILM_DIRECTOR_CAMERA,
        baseFov: 47,
        score: [
            { atSeconds: 0, position: [-3.65, 2.54, 12.2], target: [0.94, 2.04, -0.34], driftScale: 0.035, fov: 45 },
            { atSeconds: 42, transitionSeconds: 7, position: [-3.68, 2.56, 12.08], target: [0.92, 2.05, -0.36], driftScale: 0.028, fov: 46 },
            { atSeconds: 64, transitionSeconds: 9, position: [-3.0, 2.42, 10.4], target: [1.0, 2.08, -0.18], driftScale: 0.05, fov: 41 },
            { atSeconds: 135, transitionSeconds: 10, position: [-3.72, 2.58, 11.76], target: [0.9, 2.06, -0.38], driftScale: 0.03, fov: 47 },
            { atSeconds: 198, transitionSeconds: 9, position: [-2.62, 2.36, 10.28], target: [1.04, 2.06, -0.08], driftScale: 0.035, fov: 41 },
            { atSeconds: 246, transitionSeconds: 8, position: [-2.26, 2.28, 10.02], target: [1.02, 2.04, 0.02], driftScale: 0.02, fov: 39 },
            { atSeconds: 317, transitionSeconds: 4, position: [-2.04, 2.24, 9.72], target: [1.04, 2.0, 0.04], driftScale: 0.01, fov: 38 },
            { atSeconds: 337, transitionSeconds: 9, position: [-2.88, 2.42, 10.94], target: [0.94, 2.04, -0.22], driftScale: 0.018, fov: 43 },
            { atSeconds: 470, transitionSeconds: 14, position: [2.16, 2.42, 10.64], target: [0.94, 2.1, -0.24], driftScale: 0.018, fov: 42 },
            { atSeconds: 510, transitionSeconds: 12, position: [-3.58, 2.52, 12.0], target: [0.9, 2.04, -0.34], driftScale: 0.022, fov: 45 },
            { atSeconds: 534, transitionSeconds: 10, position: [0.32, 2.62, 12.68], target: [0.78, 2.0, -0.56], driftScale: 0.01, fov: 50 },
            { atSeconds: 558, transitionSeconds: 7, position: [-2.18, 2.78, 16.2], target: [0.6, 1.92, -0.96], driftScale: 0.0, fov: 64 }
        ]
    },
    lighting: {
        score: [
            { atSeconds: 0, keyWeight: 0.62, rimWeight: 0.88, fillWeight: 0.2, backWeight: 0.92 },
            { atSeconds: 42, transitionSeconds: 6, keyWeight: 0.68, rimWeight: 1.04, fillWeight: 0.14, backWeight: 0.98 },
            { atSeconds: 64, transitionSeconds: 6, keyWeight: 0.92, rimWeight: 0.9, fillWeight: 0.16, backWeight: 0.82 },
            { atSeconds: 135, transitionSeconds: 8, keyWeight: 0.58, rimWeight: 0.92, fillWeight: 0.1, backWeight: 0.78 },
            { atSeconds: 198, transitionSeconds: 6, keyWeight: 1.08, rimWeight: 1.18, fillWeight: 0.12, backWeight: 0.9 },
            { atSeconds: 246, transitionSeconds: 6, keyWeight: 1.22, rimWeight: 1.36, fillWeight: 0.08, backWeight: 0.86 },
            { atSeconds: 317, transitionSeconds: 3, keyWeight: 1.38, rimWeight: 1.58, fillWeight: 0.04, backWeight: 1.02 },
            { atSeconds: 337, transitionSeconds: 8, keyWeight: 0.66, rimWeight: 0.96, fillWeight: 0.08, backWeight: 0.76 },
            { atSeconds: 470, transitionSeconds: 10, keyWeight: 0.74, rimWeight: 0.78, fillWeight: 0.06, backWeight: 0.58 },
            { atSeconds: 510, transitionSeconds: 10, keyWeight: 0.58, rimWeight: 0.9, fillWeight: 0.1, backWeight: 0.86 },
            { atSeconds: 534, transitionSeconds: 8, keyWeight: 0.34, rimWeight: 0.36, fillWeight: 0.02, backWeight: 0.34 },
            { atSeconds: 564, transitionSeconds: 4, keyWeight: 0.18, rimWeight: 0.14, fillWeight: 0.0, backWeight: 0.18 }
        ]
    },
    stage3: {
        reactivityRevealStartSeconds: 18,
        reactivityRevealEndSeconds: 70,
        // Owner: make musical accents a little clearer (+25% vs shared 0.483).
        // Film-local: no change to Track 1/4, detector cadence or idle lighting.
        accentIntensity: 0.604,
        phaseResponse: {
            smoothingSlow: 0.76,
            smoothingFast: 3.2,
            audioDriveMin: 0.322,
            audioDriveMax: 1.242,
            supportDriveMin: 0.483,
            supportDriveMax: 1.38
        },
        phaseProfiles: {
            VOID: {
                smoothingScale: 0.64,
                audioDriveScale: 0.667,
                supportDriveScale: 0.805,
                breathScale: 0.54,
                thresholdDelta: -0.18,
                supportDelta: -0.16,
                roomPressureDelta: 0.08,
                floorDelta: -0.12,
                dustDelta: -0.04,
                shellDelta: -0.08,
                hazeDelta: -0.04,
                fogDelta: 0.014,
                vignetteDarknessDelta: 0.16,
                vignetteOffsetDelta: -0.12,
                vignetteSoftnessDelta: -0.05,
                cameraDriftScale: 0.5,
                fovBreathScale: 0.42
            },
            AWAKENING: {
                smoothingScale: 0.9,
                audioDriveScale: 1.058,
                supportDriveScale: 1.127,
                breathScale: 0.86,
                thresholdDelta: 0.02,
                supportDelta: 0.02,
                roomPressureDelta: 0.08,
                floorDelta: -0.04,
                dustDelta: -0.02,
                shellDelta: 0.02,
                hazeDelta: 0.0,
                fogDelta: 0.006,
                vignetteDarknessDelta: 0.05,
                vignetteOffsetDelta: -0.06,
                vignetteSoftnessDelta: -0.02,
                cameraDriftScale: 0.78,
                fovBreathScale: 0.72
            },
            WANTING: {
                smoothingScale: 1.08,
                audioDriveScale: 1.012,
                supportDriveScale: 1.219,
                breathScale: 0.88,
                thresholdDelta: 0.08,
                supportDelta: 0.06,
                roomPressureDelta: 0.16,
                floorDelta: -0.04,
                dustDelta: 0.02,
                shellDelta: 0.06,
                hazeDelta: 0.05,
                fogDelta: 0.006,
                vignetteDarknessDelta: 0.1,
                vignetteOffsetDelta: -0.1,
                vignetteSoftnessDelta: -0.04,
                cameraDriftScale: 0.62,
                fovBreathScale: 0.48
            },
            RELEASE: {
                smoothingScale: 0.78,
                audioDriveScale: 0.851,
                supportDriveScale: 1.035,
                breathScale: 0.72,
                thresholdDelta: -0.1,
                supportDelta: -0.08,
                roomPressureDelta: 0.02,
                floorDelta: -0.04,
                dustDelta: 0.02,
                shellDelta: -0.04,
                hazeDelta: 0.05,
                fogDelta: 0.01,
                vignetteDarknessDelta: 0.08,
                vignetteOffsetDelta: -0.02,
                vignetteSoftnessDelta: 0.02,
                cameraDriftScale: 0.54,
                fovBreathScale: 0.58
            },
            ERASURE: {
                smoothingScale: 0.5,
                audioDriveScale: 0.391,
                supportDriveScale: 0.483,
                breathScale: 0.34,
                thresholdDelta: -0.22,
                supportDelta: -0.18,
                roomPressureDelta: -0.2,
                floorDelta: -0.16,
                dustDelta: -0.05,
                shellDelta: -0.18,
                hazeDelta: -0.02,
                fogDelta: 0.018,
                vignetteDarknessDelta: 0.2,
                vignetteOffsetDelta: -0.16,
                vignetteSoftnessDelta: -0.06,
                cameraDriftScale: 0.18,
                fovBreathScale: 0.22
            }
        },
        materialResponse: {
            midThreshold: 0.34,
            midAttackSeconds: 1.8,
            midReleaseSeconds: 5.2,
            iridescenceMax: 0.06,
            iridescenceIORMin: 1.12,
            iridescenceIORMax: 1.32
        },
        chamberLaw: [
            { atSeconds: 0, gravity: 0.42, contact: 0.18, airDensity: 0.46, damage: 0.0, forensic: 0.16, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.0 },
            { atSeconds: 42, gravity: 0.5, contact: 0.22, airDensity: 0.54, damage: 0.02, forensic: 0.18, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.02 },
            { atSeconds: 64, gravity: 0.76, contact: 0.54, airDensity: 0.62, damage: 0.08, forensic: 0.24, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.08 },
            { atSeconds: 135, gravity: 0.54, contact: 0.36, airDensity: 0.78, damage: 0.1, forensic: 0.12, afterimage: 0.02, erasure: 0.0, uiSuppression: 0.16 },
            { atSeconds: 198, gravity: 0.7, contact: 0.46, airDensity: 0.66, damage: 0.24, forensic: 0.38, afterimage: 0.08, erasure: 0.0, uiSuppression: 0.22 },
            { atSeconds: 246, gravity: 0.92, contact: 0.72, airDensity: 0.82, damage: 0.42, forensic: 0.42, afterimage: 0.14, erasure: 0.0, uiSuppression: 0.32 },
            { atSeconds: 317, gravity: 1.0, contact: 0.9, airDensity: 0.9, damage: 0.66, forensic: 0.72, afterimage: 0.34, erasure: 0.02, uiSuppression: 0.44 },
            { atSeconds: 337, gravity: 0.78, contact: 0.58, airDensity: 0.88, damage: 0.52, forensic: 0.14, afterimage: 0.2, erasure: 0.02, uiSuppression: 0.5 },
            { atSeconds: 470, gravity: 0.84, contact: 0.62, airDensity: 0.72, damage: 0.58, forensic: 0.2, afterimage: 0.18, erasure: 0.04, uiSuppression: 0.62 },
            { atSeconds: 534, gravity: 0.28, contact: 0.2, airDensity: 0.48, damage: 0.42, forensic: 0.08, afterimage: 0.46, erasure: 0.42, uiSuppression: 0.74 },
            { atSeconds: 558, gravity: 0.08, contact: 0.06, airDensity: 0.2, damage: 0.2, forensic: 0.02, afterimage: 0.76, erasure: 0.82, uiSuppression: 0.86 },
            { atSeconds: 564, gravity: 0.02, contact: 0.0, airDensity: 0.08, damage: 0.06, forensic: 0.0, afterimage: 0.3, erasure: 1.0, uiSuppression: 0.96 }
        ],
        roomPressureBeats: [
            { atSeconds: 0, value: 0.56 },
            { atSeconds: 42, value: 0.62 },
            { atSeconds: 64, value: 0.82 },
            { atSeconds: 135, value: 0.58 },
            { atSeconds: 168, value: 0.66 },
            { atSeconds: 198, value: 0.78 },
            { atSeconds: 246, value: 0.96 },
            { atSeconds: 317, value: 1.0 },
            { atSeconds: 337, value: 0.72 },
            { atSeconds: 470, value: 0.8 },
            { atSeconds: 534, value: 0.3 },
            { atSeconds: 558, value: 0.08 },
            { atSeconds: 564, value: 0.02 }
        ],
        eventBeats: [
            {
                id: 'track5_threshold_weight',
                type: EVENT_TYPE.ROOM_TIGHTEN,
                atSeconds: 64,
                durationSeconds: 9,
                attackSeconds: 0.8,
                releaseSeconds: 4.2,
                room: { roomPressureDelta: 0.12, shellOpacityDelta: 0.04, floorOpacityDelta: -0.04 },
                post: { vignetteDarknessDelta: 0.08, vignetteOffsetDelta: -0.06 }
            },
            {
                id: 'track5_false_release_oxygenless',
                type: EVENT_TYPE.ROOM_TIGHTEN,
                atSeconds: 141,
                durationSeconds: 14,
                room: { supportDelta: -0.08, roomPressureDelta: 0.05, shellOpacityDelta: -0.04 },
                post: { bloomDelta: -0.04, exposureDelta: -0.04, vignetteDarknessDelta: 0.07 }
            },
            {
                id: 'track5_bright_fracture',
                type: EVENT_TYPE.MATERIAL_REVEAL,
                atSeconds: 198,
                durationSeconds: 13,
                room: { supportDelta: 0.05, roomPressureDelta: 0.08 },
                material: { roughnessDelta: -0.18, clearcoatDelta: 0.12, clearcoatRoughnessDelta: -0.18 },
                post: { bloomDelta: 0.04, grainDelta: 0.006, vignetteOffsetDelta: -0.04 }
            },
            {
                id: 'track5_max_pressure_plateau',
                type: EVENT_TYPE.ROOM_TIGHTEN,
                atSeconds: 246,
                durationSeconds: 18,
                attackSeconds: 1.2,
                releaseSeconds: 8,
                room: { roomPressureDelta: 0.16, thresholdDelta: 0.08, supportDelta: -0.04 },
                post: { exposureDelta: -0.05, vignetteDarknessDelta: 0.1, vignetteOffsetDelta: -0.08 }
            },
            {
                id: 'track5_pre_vertigo_blackout',
                type: EVENT_TYPE.BLACK_GAP,
                atSeconds: 317.84770588235295,
                durationSeconds: 0.417,
                reopenSeconds: 0.001
            },
            {
                id: 'track5_serrated_peak',
                type: EVENT_TYPE.POST_CRUSH,
                atSeconds: 317,
                durationSeconds: 4.8,
                attackSeconds: 0.12,
                releaseSeconds: 2.8,
                post: { exposureDelta: 0.08, bloomDelta: 0.08, grainDelta: 0.014, vignetteDarknessDelta: 0.16 },
                material: { roughnessDelta: -0.26, clearcoatDelta: 0.22, clearcoatRoughnessDelta: -0.24 }
            },
            {
                id: 'track5_brightness_collapse',
                type: EVENT_TYPE.BLEACH,
                atSeconds: 337,
                durationSeconds: 14,
                room: { supportDelta: -0.1, shellOpacityDelta: -0.08, floorOpacityDelta: -0.08 },
                post: { exposureDelta: -0.12, bloomDelta: -0.08, vignetteDarknessDelta: 0.12 }
            },
            {
                id: 'track5_residue_tightening',
                type: EVENT_TYPE.ROOM_TIGHTEN,
                atSeconds: 470,
                durationSeconds: 18,
                room: { roomPressureDelta: 0.1, thresholdDelta: 0.04, supportDelta: -0.05 },
                post: { vignetteDarknessDelta: 0.08, grainDelta: 0.006 }
            },
            {
                id: 'track5_erasure_begin',
                type: EVENT_TYPE.BLEACH,
                atSeconds: 534,
                durationSeconds: 12,
                room: { shellOpacityDelta: -0.14, floorOpacityDelta: -0.14, thresholdDelta: -0.12, supportDelta: -0.12 },
                post: { exposureDelta: -0.16, bloomDelta: -0.1, vignetteDarknessDelta: 0.16, vignetteOffsetDelta: -0.12 }
            },
            {
                id: 'track5_final_trace',
                type: EVENT_TYPE.BLACK_GAP,
                atSeconds: 558,
                durationSeconds: 3.6,
                reopenSeconds: 2.2,
                post: { exposureDelta: -0.26, grainDelta: 0.018, vignetteDarknessDelta: 0.22 }
            }
        ]
    }
};

// ---------------------------------------------------------------------------
// Track 5 audio-led middle recut (Step 3) — a SEPARATE 25-cut camera score,
// selected only under canonical Track5 `?recut=1`. The default film config
// (`TRACK5_FILM_DIRECTOR_CAMERA` / `TRACK5_CHAMBER_FILM_TIMELINE`) is untouched.
//
// Declared AFTER `TRACK5_CHAMBER_FILM_TIMELINE` so the default film-config
// string-slice test (which evals the text between the two default consts) stays
// byte-valid (Opus F4 / build spec §7).
//
// Real-scale families F1–F8 (build spec §6). Distances stay inside the accepted
// H-ratio bands (H=7.422308): WS 25.98–40.82u, MCU 11.88–17.81u, ECU 3.34–6.68u,
// at the cut AND at the end of each shot's hold (dolly-aware band lint). The one
// authored exception is bar 128, which is a deliberate WS→transitional band
// crossing and is asserted by name rather than exempted (see ws_plateau_spiral).
// Height→pose is derived by the director (P1) from `heightYByClass`; authored
// `pitch` is an in-range fallback only, except where `pitchLock: true` pins a
// measured approach angle. Bars are authoritative beats.json downbeats (build
// spec §5). No accents, no dollyZoom, no flower accent here.
//
// Second-pass Stage 1A — "continuous investigating gaze" (owner-approved 25-cut
// middle, replacing the first-pass 28-cut score; bar 97 ECU removed editorially):
//   * Fewer early cuts. The 25→43 opening is two long moving MCUs (12 and 6 bars)
//     instead of four short shots, so the film enters *already looking* rather
//     than surveying. Camera bar 31 and bar 60 are removed.
//   * Progressive moving approach. Every pre-climax shot that holds ≥3 bars now
//     carries an eased dolly-in or orbit; the gaze closes distance across the
//     middle instead of cutting closer.
//   * Forensic, geometry-backed middle. The four ECUs and the two MCUs that feed
//     them aim at MEASURED vertex clusters (scout run
//     `.playwright-mcp/track5-recut-material-target-scout/`), not at box-derived
//     points. `TRACK5_FILM_FLOWER_HEAD` has zero relic vertices within 0.32u, so
//     it is no longer referenced here at all; the base pool is the flattest band
//     in the model, so it survives only as the bar 147 tar payoff where the
//     mutation frontier actually arrives.
//   * One 6:05 insert. Bar 139 (t 365.5132) cuts in on the plateau, revisiting the
//     bar 111 shoulder cluster from the opposite vertical bearing at 2.2x the
//     distance. It is a shoulder revisit, NOT a tar-frontier shot — at bar 139 the
//     frontier sits at Y -0.776, 27s too early (scout §7).
//   * Plateau spiral. Bar 128 orbits AND dollies in across its 11-bar hold
//     (0.55 rad, 27.5→20.35u) so the long plateau closes toward the insert. This
//     is the single authored framing-band transition in the score (WS start,
//     transitional end); every other shot stays inside its family band.
//   * Bridge approach. Bar 171 reverses its push-out to a push-in (-0.09/bar).
//
// Second-pass Stage 1 camera blockers (this pass, camera only — no light, cut
// timing, default-path or doc changes):
//   * Bar 97 `ecu_surface_scar` removed: owner A/B showed the lateral rear-ridge
//     ECU framed the wrong object (centred bloom disc). Bar 94 now holds 8 bars
//     on LOWER_SHOULDER with visible dolly/orbit through bar 102.
//   * Bar 48 drops to 12.8u/fov36 so the shot that feeds the bar 81 ECU is close
//     context rather than a distant re-establisher.
//   * Every hold ≥3 bars now carries dolly AND orbit above the perceptual floor
//     (≥0.3 deg/s apparent orbit or ≥5% subject-scale change across the hold).
//
// Measured targets are chamber/world-space centroids of real vertex clusters,
// each with a nearest measured vertex ≤0.014u and ≥1,500 vertices within 0.32u.
//
// Light rigs (Step 4/P5): each setup's `lightRig` is assigned from the Fable
// Option B phrase-light table (`TRACK5_RECUT_LIGHT_PHRASES` below). Cuts within a
// musical phrase share a rig; adjacent phrases differ (creative layer §2). The
// warm-neutral P5 rigs `void_side_warm`, `pressure_top`, `plateau_rim_pulse`, and
// `low_key_grazing` are authored in `light-rigs.js`; the ECU wet-look reads reuse
// `wet_specular`, back reads `back_silhouette`, and fracture beats `fracture`.
const TRACK5_RECUT_MID_RIDGE = [0.959854, 3.4, 0.4];
const TRACK5_RECUT_BASE_POOL = [0.959854, 0.2, 0.9];
// Measured relic clusters (scout §5). Nearest real vertex, in order below:
// 0.0070u / 0.0134u / 0.0037u / 0.0072u.
const TRACK5_RECUT_RIDGE_JUNCTION = [1.0282, 3.5696, 0.6120];
const TRACK5_RECUT_BLOOM_EDGE = [1.3457, 4.2708, 0.6256];
const TRACK5_RECUT_LOWER_SHOULDER = [1.0234, 2.7378, 0.3623];

const TRACK5_RECUT_DIRECTOR_CAMERA = {
    target: TRACK5_FILM_TARGET,
    director: {
        enabled: true,
        heightYByClass: { low: 0, eye: 2.2, high: 7 },
        enforceOrbitBudget: true
    },
    setups: {
        // bar 25 — the film enters already looking. 12-bar eased push-in
        // (14.2→12.04u) replaces the first-pass WS establisher + bar 31 cut.
        // Second-pass Stage 1: the push was raised from -0.10 to -0.18/bar and
        // given a 0.144 rad drift, because at -0.10 the 32-second hold changed
        // the frame by less than the eye reads as movement at all.
        mcu_void_entry: {
            framing: 'MCU',
            height: 'eye',
            yaw: -0.9,
            pitch: 0.02,
            distance: 14.2,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_side_warm',
            cameraFamily: 'F4',
            dollyPerBar: -0.18,
            orbitPerBar: 0.012,
            motionEase: 'ease-out'
        },
        // bar 37 — the gaze crosses to the far side and keeps closing through bar 48
        // (13.0→11.9u). Owner feedback: bar 43 ECU removed — too tight after bar 37;
        // p03 re-keys wet_specular at bar 43 without a camera cut. Dolly eased to
        // -0.10/bar so the 11-bar hold stays inside the MCU band.
        mcu_void_continue: {
            framing: 'MCU',
            height: 'low',
            yaw: 0.65,
            pitch: -0.12,
            distance: 13.0,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'back_silhouette',
            cameraFamily: 'F5',
            dollyPerBar: -0.10,
            orbitPerBar: -0.025,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_RIDGE_JUNCTION
        },
        // bar 48 — pulled off the first-pass WS onto an MCU so the approach never
        // retreats to a wide. Unlocked: the derived `high` pose is the intent here.
        // Second-pass Stage 1: 15.2/fov38 still rebounded away from the bar 43
        // ECU hard enough to undo the forensic read, so this is now a genuine
        // close context (12.8/fov36) that keeps closing (-0.05/bar → 12.5u).
        mcu_high_quarter: {
            framing: 'MCU',
            height: 'high',
            yaw: 0.95,
            pitch: 0.26,
            distance: 12.8,
            fov: 36,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F6',
            dollyPerBar: -0.05,
            orbitPerBar: 0.04,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        // bar 54 — the long pre-climax hold (14 bars, absorbing the removed bar 60
        // cut). Slow eased creep 12.8→11.96u lands just inside the MCU floor
        // (11.876u), so the shot arrives at the climax as tight as MCU can be.
        // Second-pass Stage 1: 14 bars of pure dolly at -0.06 was a still frame
        // to the eye, so the hold now also drifts 0.252 rad around the ridge.
        mcu_ridge_hold: {
            framing: 'MCU',
            height: 'low',
            yaw: -1.4,
            pitch: -0.15,
            distance: 12.8,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F5',
            dollyPerBar: -0.06,
            orbitPerBar: 0.018,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        mcu_pressure_climb: {
            framing: 'MCU',
            height: 'high',
            yaw: 1.1,
            pitch: 0.26,
            distance: 15.0,
            fov: 39,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F6',
            // Second-pass Stage 1: -0.12 → -0.22/bar with a counter-drift, so the
            // seven bars before the fracture visibly gain on the relic (15.0→13.46u).
            dollyPerBar: -0.22,
            orbitPerBar: -0.03,
            // ease-in: the push accelerates into the fracture instead of coasting.
            motionEase: 'ease-in',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        // bar 75 — the ONLY wide breath in the pre-climax middle, and only 1 bar
        // long. A distant one-beat glimpse of the whole figure; bar 85 pays it off
        // closer from a different bearing (see ws_monument_low).
        ws_dense_prehit: {
            framing: 'WS',
            height: 'low',
            yaw: -0.2,
            pitch: -0.1,
            distance: 27.5,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'back_silhouette',
            cameraFamily: 'F1'
        },
        // bar 76 — fracture phrase anchor at 3:18. Owner feedback: add in-shot motion
        // so the 3:24 hold reads (orbit 0.03/bar, dolly -0.08/bar, ease-out).
        mcu_fracture_entry: {
            framing: 'MCU',
            height: 'low',
            yaw: -1.5,
            pitch: -0.15,
            distance: 13.4,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'fracture',
            cameraFamily: 'F5',
            dollyPerBar: -0.08,
            orbitPerBar: 0.03,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        // bar 81 — owner feedback: soften the weak ECU to MCU (~11.88u/fov36) on the
        // measured mask front shoulder (BLOOM_EDGE target preserved). Setup id
        // `ecu_mask_core` is legacy naming (framing is MCU); do not rename — timeline
        // keys and phrase tables reference this id.
        ecu_mask_core: {
            framing: 'MCU',
            height: 'high',
            yaw: 0.125,
            pitch: 0.18,
            distance: 11.88,
            fov: 36,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'fracture',
            cameraFamily: 'F7',
            targetPoint: TRACK5_RECUT_BLOOM_EDGE
        },
        ws_monument_low: {
            framing: 'WS',
            height: 'low',
            yaw: 0.35,
            pitch: -0.1,
            distance: 26.2,
            fov: 28,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_side_warm',
            cameraFamily: 'F1'
        },
        mcu_side_slash: {
            framing: 'MCU',
            height: 'eye',
            // Re-bearing (A/B'd live): at the authored +1.15 this MCU sat between
            // bar 160 (+1.2) and bar 186 (+1.1), so the reserved right-side ending
            // close-up read as a reprise instead of an arrival. Swung to the
            // rear-left quadrant, which also lets the name read laterally.
            yaw: -2.35,
            pitch: 0.02,
            distance: 13.0,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_side_warm',
            cameraFamily: 'F4'
        },
        // bar 94 — sustained MCU on the moving hand/egg read through bar 102.
        // Owner bar-97 editorial removal: the lateral rear-ridge ECU cut framed the
        // wrong object (centred bloom disc). This 8-bar hold carries the investigating
        // gaze on LOWER_SHOULDER — closing 12.8→11.92u with eased dolly and a visible
        // -0.28 rad orbit — without a mid-phrase cut to bar 97.
        mcu_ridge_context: {
            framing: 'MCU',
            height: 'high',
            yaw: 1.5,
            pitch: 0.20,
            pitchLock: true,
            distance: 12.8,
            fov: 36,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F6',
            dollyPerBar: -0.11,
            orbitPerBar: -0.035,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_LOWER_SHOULDER
        },
        ws_orbit_snap: {
            framing: 'WS',
            height: 'low',
            yaw: 2.0,
            pitch: -0.1,
            distance: 32.0,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F1'
        },
        mcu_climax_peak: {
            framing: 'MCU',
            height: 'low',
            yaw: -1.6,
            pitch: -0.15,
            distance: 12.0,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F5',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        // bar 111 — owner-selected pulled-back ECU. Looks UP under the knuckles at
        // the measured ridge shadow gap: hand/claw cradling the egg, dark ribbon
        // arcs sweeping down, bloom compressed along the top edge. Occupancy 0.5061,
        // the highest of the scout run. The base pool cannot carry an ECU (6-10
        // verts/voxel, dispersion 0.012) so the `low` height class is preserved by
        // moving the SUBJECT up, not the camera down. pitchLock is load-bearing
        // here: the derived pitch (-0.4574) clamps at PITCH_MIN and would drop
        // cameraY to 0.612, i.e. the height class would stop meaning what it says.
        // Owner feedback: add eased orbit/dolly so the 4:54 hold reads.
        ecu_knuckle_base: {
            framing: 'ECU',
            height: 'low',
            yaw: 0.261,
            pitch: -0.12,
            pitchLock: true,
            distance: 6.2,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F8',
            dollyPerBar: -0.04,
            orbitPerBar: 0.025,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_LOWER_SHOULDER
        },
        // bar 117 — last pre-release pressure beat. Replaces the first-pass F2 WS:
        // the release must arrive from close, so this stays in the MCU band and
        // orbits 0.20 rad across its 4-bar hold rather than pulling out to a wide.
        mcu_pre_release_high: {
            framing: 'MCU',
            height: 'high',
            yaw: 0.9,
            pitch: 0.25,
            pitchLock: true,
            distance: 15.5,
            fov: 38,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F6',
            orbitPerBar: 0.05,
            motionEase: 'ease-out',
            targetPoint: TRACK5_RECUT_LOWER_SHOULDER
        },
        mcu_release_edge: {
            framing: 'MCU',
            height: 'eye',
            yaw: -1.1,
            pitch: 0.02,
            distance: 14.8,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'fracture',
            cameraFamily: 'F4'
        },
        ws_descent: {
            framing: 'WS',
            height: 'low',
            yaw: 0.4,
            pitch: -0.1,
            distance: 28.8,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_side_warm',
            cameraFamily: 'F1'
        },
        // bar 128 — the plateau spiral, and the ONE authored framing-band
        // transition in the whole recut. Across its 11-bar hold it spends the
        // full 0.55 rad orbit budget (0.05 x 11, no exemption) AND dollies
        // 27.5→20.35u: it starts as a wide (3.705 H) and lands, monotonically,
        // in the 20–21u transitional zone between the WS floor (25.98u) and the
        // MCU ceiling (17.81u). That deliberate band exit is the point — at
        // 30.5→28.3u the plateau was a flat, apparently frozen pan across 30
        // seconds of the longest hold in the film. ease-in-out keeps both ends
        // of the hold still, which is what lets the bar 139 insert land as a cut
        // rather than an interruption; bar 139 itself is unchanged, so the
        // spiral now arrives close enough that the insert reads as a step, not
        // a teleport. Every other shot both starts and ends inside its nominal
        // family band; this one is tested by name, not by a blanket exemption.
        ws_plateau_spiral: {
            framing: 'WS',
            height: 'eye',
            yaw: 2.8,
            pitch: 0.02,
            distance: 27.5,
            fov: 33,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'plateau_rim_pulse',
            cameraFamily: 'F3',
            orbitPerBar: 0.05,
            dollyPerBar: -0.65,
            motionEase: 'ease-in-out'
        },
        // bar 139 (t 365.5132) — the 6:05 insert. Same measured shoulder cluster as
        // bar 111, opposite vertical bearing (+0.300 vs -0.120), height low→high,
        // 2.2x the distance: the two frames share a coordinate and nothing else.
        // Whole changed figure in a pool of light against total black — distinct in
        // SCALE from every ECU in the middle, which is what makes it read as arrival.
        // NOT a tar-frontier shot: at t 365.5 the frontier is at Y -0.776, inside the
        // flattest band of the model. The tar payoff stays at bar 147 where the
        // mutation physics actually reaches TRACK5_RECUT_BASE_POOL (t 392.4).
        mcu_plateau_shoulders: {
            framing: 'MCU',
            height: 'high',
            yaw: 0.261,
            pitch: 0.30,
            pitchLock: true,
            distance: 13.6,
            fov: 34,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'plateau_rim_pulse',
            cameraFamily: 'F6',
            targetPoint: TRACK5_RECUT_LOWER_SHOULDER
        },
        ecu_tar_rise: {
            framing: 'ECU',
            height: 'low',
            yaw: -1.0,
            pitch: -0.05,
            distance: 4.0,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular',
            cameraFamily: 'F8',
            targetPoint: TRACK5_RECUT_BASE_POOL
        },
        ws_island_bright: {
            framing: 'WS',
            height: 'high',
            yaw: 0.85,
            pitch: 0.25,
            distance: 33.0,
            fov: 31,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'pressure_top',
            cameraFamily: 'F2',
            orbitPerBar: 0.04
        },
        mcu_island_exit: {
            framing: 'MCU',
            height: 'eye',
            yaw: 1.2,
            pitch: 0.02,
            distance: 13.6,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'low_key_grazing',
            cameraFamily: 'F4',
            dollyPerBar: 0.06
        },
        ws_changed_room: {
            framing: 'WS',
            height: 'low',
            yaw: 0.3,
            pitch: -0.1,
            distance: 33.5,
            fov: 30,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'void_side_warm',
            cameraFamily: 'F1',
            orbitPerBar: 0.03
        },
        mcu_blob_pulse: {
            framing: 'MCU',
            height: 'low',
            yaw: -1.5,
            pitch: -0.15,
            distance: 13.8,
            fov: 42,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'plateau_rim_pulse',
            cameraFamily: 'F5',
            // Bridge approach: reversed from +0.05 (drifting away) to a push-in, so
            // the last 15 bars before the ending close-up move toward the relic
            // instead of retreating from it. Second-pass Stage 1 deepens the push
            // to -0.09/bar (13.8→12.45u) and adds a -0.225 rad counter-drift, so
            // the longest hold of the outro is legibly travelling.
            dollyPerBar: -0.09,
            orbitPerBar: -0.015,
            motionEase: 'ease-in',
            targetPoint: TRACK5_RECUT_MID_RIDGE
        },
        mcu_residue_right: {
            framing: 'MCU',
            height: 'eye',
            yaw: 1.1,
            pitch: 0.04,
            distance: 13.36,
            fov: 40,
            screenX: 0,
            screenY: 0,
            roll: 0,
            localMotion: 0,
            lightRig: 'wet_specular',
            cameraFamily: 'F4',
            pitchLock: true
        }
    },
    cutTimeline: {
        25: 'mcu_void_entry',
        37: 'mcu_void_continue',
        48: 'mcu_high_quarter',
        54: 'mcu_ridge_hold',
        68: 'mcu_pressure_climb',
        75: 'ws_dense_prehit',
        76: 'mcu_fracture_entry',
        81: 'ecu_mask_core',
        85: 'ws_monument_low',
        91: 'mcu_side_slash',
        94: 'mcu_ridge_context',
        102: 'ws_orbit_snap',
        107: 'mcu_climax_peak',
        111: 'ecu_knuckle_base',
        117: 'mcu_pre_release_high',
        121: 'mcu_release_edge',
        126: 'ws_descent',
        128: 'ws_plateau_spiral',
        139: 'mcu_plateau_shoulders',
        147: 'ecu_tar_rise',
        151: 'ws_island_bright',
        160: 'mcu_island_exit',
        165: 'ws_changed_room',
        171: 'mcu_blob_pulse',
        186: 'mcu_residue_right'
    },
    accentCuts: []
};

// Recut runtime timeline: reuse the default chamber phase/lighting/macro-score
// scaffolding but override the director camera (setups / cuts / target / height /
// orbit budget) with the recut score. Lighting/effect deletions are later steps.
const TRACK5_RECUT_FILM_TIMELINE = {
    ...TRACK5_CHAMBER_FILM_TIMELINE,
    camera: {
        ...TRACK5_CHAMBER_FILM_TIMELINE.camera,
        ...TRACK5_RECUT_DIRECTOR_CAMERA
    }
};

// Fable Option B phrase-light table, v2 (creative layer §2, second pass). Each row
// is one musical phrase spanning [startBar, endBar): its `cameraCutBars` share a
// single `lightRig`; adjacent phrases use distinct rigs (P5 phrase-distinctness
// lint). This is the authoritative source for the per-setup `lightRig` assignments
// in TRACK5_RECUT_DIRECTOR_CAMERA above — every one of the 25 recut cut bars
// belongs to exactly one phrase.
//
// v2 upgrades the table from a bare bar list to the contiguous, `startBar`/`endBar`
// shape `recut-phrase-light.js` consumes, covering bars 25–195 with no gaps. Stage
// 1B wires this table at runtime: each phrase freezes rig orientation/aim to its
// phrase-start camera anchor independent of internal camera cuts.
//
// `rekeyOnly: true` marks a phrase whose light changes with no camera cut — p05
// (bars 60–68) is the single such row, absorbed into the bar 54 long hold. At bar
// 60 the active camera setup stays `mcu_ridge_hold` while lighting re-keys to
// `back_silhouette` on the p05 phrase boundary.
//
// p22 (bars 186–195) stores a wet_specular phrase-start anchor for rig orientation,
// but its anchor target is deliberately superseded during elapsed 465–520s by the
// existing protected `wet_specular` flower-head key override (aim only).
//
// Declared after TRACK5_RECUT_FILM_TIMELINE so the director-camera string-slice
// test's end token stays exact.
const TRACK5_RECUT_LIGHT_PHRASES = [
    { id: 'p01', startBar: 25, endBar: 37, lightRig: 'void_side_warm', cameraCutBars: [25] },
    { id: 'p02', startBar: 37, endBar: 43, lightRig: 'back_silhouette', cameraCutBars: [37] },
    { id: 'p03', startBar: 43, endBar: 48, lightRig: 'wet_specular', cameraCutBars: [], rekeyOnly: true },
    { id: 'p04', startBar: 48, endBar: 60, lightRig: 'pressure_top', cameraCutBars: [48, 54] },
    { id: 'p05', startBar: 60, endBar: 68, lightRig: 'back_silhouette', cameraCutBars: [], rekeyOnly: true },
    { id: 'p06', startBar: 68, endBar: 75, lightRig: 'pressure_top', cameraCutBars: [68] },
    { id: 'p07', startBar: 75, endBar: 76, lightRig: 'back_silhouette', cameraCutBars: [75] },
    { id: 'p08', startBar: 76, endBar: 85, lightRig: 'fracture', cameraCutBars: [76, 81] },
    { id: 'p09', startBar: 85, endBar: 94, lightRig: 'void_side_warm', cameraCutBars: [85, 91] },
    { id: 'p10', startBar: 94, endBar: 102, lightRig: 'pressure_top', cameraCutBars: [94] },
    { id: 'p11', startBar: 102, endBar: 107, lightRig: 'pressure_top', cameraCutBars: [102] },
    { id: 'p12', startBar: 107, endBar: 117, lightRig: 'pressure_top', cameraCutBars: [107, 111] },
    { id: 'p13', startBar: 117, endBar: 121, lightRig: 'pressure_top', cameraCutBars: [117] },
    { id: 'p14', startBar: 121, endBar: 126, lightRig: 'fracture', cameraCutBars: [121] },
    { id: 'p15', startBar: 126, endBar: 128, lightRig: 'void_side_warm', cameraCutBars: [126] },
    { id: 'p16', startBar: 128, endBar: 147, lightRig: 'plateau_rim_pulse', cameraCutBars: [128, 139] },
    { id: 'p17', startBar: 147, endBar: 151, lightRig: 'wet_specular', cameraCutBars: [147] },
    { id: 'p18', startBar: 151, endBar: 160, lightRig: 'pressure_top', cameraCutBars: [151] },
    { id: 'p19', startBar: 160, endBar: 165, lightRig: 'low_key_grazing', cameraCutBars: [160] },
    { id: 'p20', startBar: 165, endBar: 171, lightRig: 'void_side_warm', cameraCutBars: [165] },
    { id: 'p21', startBar: 171, endBar: 186, lightRig: 'plateau_rim_pulse', cameraCutBars: [171] },
    { id: 'p22', startBar: 186, endBar: 195, lightRig: 'wet_specular', cameraCutBars: [186] }
];

// Carry the phrase table on the recut timeline so the phrase-light structure
// travels with the recut config and stays referenced from the module.
TRACK5_RECUT_FILM_TIMELINE.lightPhrases = TRACK5_RECUT_LIGHT_PHRASES;

export {
    RELIQUARY_OBSERVED_TRACK5_TIMELINE,
    TRACK5_FILM_TARGET,
    TRACK5_FILM_FLOWER_HEAD,
    TRACK5_FILM_DIRECTOR_CAMERA,
    TRACK5_CHAMBER_FILM_TIMELINE,
    TRACK5_RECUT_MID_RIDGE,
    TRACK5_RECUT_BASE_POOL,
    TRACK5_RECUT_RIDGE_JUNCTION,
    TRACK5_RECUT_BLOOM_EDGE,
    TRACK5_RECUT_LOWER_SHOULDER,
    TRACK5_RECUT_DIRECTOR_CAMERA,
    TRACK5_RECUT_FILM_TIMELINE,
    TRACK5_RECUT_LIGHT_PHRASES
};
