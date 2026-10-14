/**
 * Track 1 — "Sonoite" film module, v2 (Prompt #206).
 *
 * CONSECRATE / Birth, light-led (docs/qa/TRACK1_CHAMBER_PROPOSAL_2026-08-13.md),
 * authored against the mined hit-list (42 enriched moments + timeline/peaks/
 * onsets/chroma/phases analysis + Track1Director beat map; see
 * docs/qa/TRACK1_MUSICAL_MAP_2026-08-13.md). Four pillars over v1:
 *
 *   1. HARD CUTS — `transitionSeconds: 0` cue entries (18 cuts after
 *      dropping 447.05; Grok 4.6 cinematography pass 2026-08-14: 210 wide
 *      re-establish, 277 whole-relic, 367 high-L MCU, 384 room-wide, 438.9
 *      punch-in step, MEMORY reduced to lock + one 24.4s recede, no camera
 *      cut at the snap).
 *      Sparse and processional before the tornado, accelerating after 367s.
 *   2. COMPOSED FRAMING — ECU/MCU/WS setups reuse the Track 5 recut's
 *      scout-measured relic targets (same placeholder relic on the plinth).
 *   3. AUTHORED EVENTS — stage3.eventBeats: ignition reveals, fracture grip,
 *      the pre-roar blink (black_gap ending on the track's true loudest
 *      instant, 375.05s), the 411.5s energy-max crush, retimed heartbeats.
 *   4. VIBE — five phases now, not four: the analysis found the largest
 *      harmonic movement of the whole song (chroma distance 0.382 @336s)
 *      sitting inside the near-silent breakdown, so the hush becomes its own
 *      phase: HUSH 316.6-366.8 — the consecration INTERRUPTED (lights fall
 *      back to candle-dark, room seals, the relic changes almost unseen)
 *      before the tornado completes it. Boundaries follow phases.json truth
 *      (316.65 silence onset, 366.8 peak-phase start, 488.5 energy collapse),
 *      not the Director's drifted constants.
 *
 * Evidence-led corrections vs the old authored canon (kept deliberately):
 *   - 375.05s (78.97dB, track's loudest instant) gets its own cut + room_open;
 *     384.03s stays the authored eruption where the room reaches FULLY LIT.
 *   - 411.5s (energy max 255.97, largest delta +237.9) gets the hardest hit.
 *   - heartbeat_3 retimed 530.0 -> 532.8 (strongest late onset, strength 2.0;
 *     the authored 530 sits in a silent segment with no acoustic anchor).
 *   - Final snap stays authored at 535.0, cutting INTO true silence.
 *
 * Opus runtime verification fixes (2026-08-14): blink reopen, snap hold,
 * room_open swap, phaseCurves, recede direction.
 *
 * v3.3 lookdev pass (2026-08-14): flame rebuild, color-schism kill, bold geometry,
 * room reveal, egg quickening, dark discipline, anticipation breath.
 */

// frozen 2026-08-14 from track5-recut-seams — T1 owns its geometry
const SONOITE_MID_RIDGE = [0.959854, 3.4, 0.4];
const SONOITE_BASE_POOL = [0.959854, 0.2, 0.9];
const SONOITE_RIDGE_JUNCTION = [1.0282, 3.5696, 0.6120];
const SONOITE_BLOOM_EDGE = [1.3457, 4.2708, 0.6256];

// Whole-relic witness target (measured center, scripts/track5-measured-bounds.json).
const SONOITE_WITNESS_TARGET = [0.959854, 1.901261, -0.038787];

const SONOITE_CHAMBER_FILM_TIMELINE = {
    phaseWindows: [
        { name: 'ASCEND', start: 0, end: 125 },
        { name: 'FRACTURE', start: 125, end: 316.65 },
        { name: 'HUSH', start: 316.65, end: 366.8 },
        { name: 'ECLIPSE', start: 366.8, end: 488.5 },
        { name: 'MEMORY', start: 488.5, end: 539 }
    ],
    camera: {
        baseFov: 46,
        basePosition: [-4.3, 2.7, 13.6],
        target: [0.96, 2.0, -0.04],
        score: [
            // ASCEND — frozen world; one held wide, then the unfreeze cut.
            { atSeconds: 0, position: [-4.3, 2.7, 13.6], target: [0.96, 2.0, -0.04], driftScale: 0.015, fov: 46 },
            // F3: low-angle hero past the floor votives — first light reads as ritual.
            { atSeconds: 35.4, transitionSeconds: 0, position: [-1.35, 0.7, 6.4], target: [0.96, 2.35, -0.06], driftScale: 0.03, fov: 43 },
            { atSeconds: 62.83, transitionSeconds: 10, position: [-2.2, 1.05, 7.8], target: [0.96, 2.45, -0.04], driftScale: 0.032, fov: 41 },
            { atSeconds: 90.26, transitionSeconds: 12, position: [-3.4, 1.85, 9.6], target: [0.96, 2.65, 0.08], driftScale: 0.035, fov: 42 },
            // F3: raking 45° side — first real lateral read.
            { atSeconds: 125, transitionSeconds: 0, position: [8.4, 2.05, 4.1], target: [0.96, 2.38, -0.04], driftScale: 0.045, fov: 49 },
            { atSeconds: 157, transitionSeconds: 8, position: [7.6, 1.95, 5.2], target: [0.96, 2.4, -0.04], driftScale: 0.045, fov: 48 },
            // F3: crown top-shot — flower reads against stem.
            { atSeconds: 177.876, transitionSeconds: 0, position: [0.94, 7.35, 2.4], target: [0.96, 3.05, -0.02], driftScale: 0.05, fov: 33 },
            { atSeconds: 210, transitionSeconds: 0, position: [-5.8, 1.55, 13.2], target: [0.96, 2.25, -0.04], driftScale: 0.04, fov: 48 },
            { atSeconds: 253, transitionSeconds: 0, position: [-7.2, 2.35, 6.8], target: [0.96, 2.22, -0.04], driftScale: 0.04, fov: 47 },
            { atSeconds: 277, transitionSeconds: 0, position: [-3.4, 2.4, 11.0], target: [0.96, 2.2, -0.04], driftScale: 0.045, fov: 46 },
            { atSeconds: 310.35, transitionSeconds: 0, position: [3.15, 3.45, 5.35], target: SONOITE_MID_RIDGE, driftScale: 0.06, fov: 30 },
            // F3: behind-the-candle-arc ring cam looking inward.
            { atSeconds: 316.65, transitionSeconds: 0, position: [0.96, 0.92, 3.55], target: [0.96, 2.78, -0.04], driftScale: 0.0, fov: 47 },
            { atSeconds: 336, transitionSeconds: 22, position: [-0.15, 2.12, 13.1], target: [0.96, 2.3, -0.04], driftScale: 0.004, fov: 47.5 },
            { atSeconds: 359.9, transitionSeconds: 6, position: [-0.4, 2.2, 12.4], target: [0.96, 2.35, -0.04], driftScale: 0.02, fov: 46 },
            { atSeconds: 367, transitionSeconds: 0, position: [-5.2, 3.8, 8.4], target: [0.96, 2.8, -0.04], driftScale: 0.06, fov: 38 },
            { atSeconds: 375.05, transitionSeconds: 0, position: [2.3, 3.4, 5.4], target: SONOITE_BLOOM_EDGE, driftScale: 0.06, fov: 31 },
            { atSeconds: 384.03, transitionSeconds: 0, position: [0.15, 2.35, 13.8], target: [0.96, 2.35, -0.04], driftScale: 0.035, fov: 50 },
            { atSeconds: 392.2, transitionSeconds: 0, position: [5.0, 2.3, 11.5], target: [0.96, 2.4, -0.04], driftScale: 0.06, fov: 47 },
            { atSeconds: 399.05, transitionSeconds: 0, position: [3.3, 3.9, 6.4], target: SONOITE_RIDGE_JUNCTION, driftScale: 0.06, fov: 32 },
            { atSeconds: 411.5, transitionSeconds: 0, position: [-3.6, 1.1, 10.2], target: SONOITE_BASE_POOL, driftScale: 0.08, fov: 49 },
            { atSeconds: 425.2, transitionSeconds: 0, position: [4.2, 3.7, 7.2], target: [0.98, 2.7, 0.0], driftScale: 0.055, fov: 36 },
            // F3: dutch ECU at the peak — asymmetric lateral crop.
            { atSeconds: 438.9, transitionSeconds: 0, position: [5.05, 2.88, 5.15], target: [0.98, 2.62, 0.02], driftScale: 0.05, fov: 29, rollDeg: 5 },
            { atSeconds: 459.50, transitionSeconds: 0, position: [-3.9, 2.7, 12.3], target: [0.94, 2.3, -0.1], driftScale: 0.045, fov: 46 },
            // Collapse (phases.json true boundary 488.5) into MEMORY.
            { atSeconds: 488.5, transitionSeconds: 0, position: [0.8, 3.4, 14.2], target: [0.94, 2.0, -0.1], driftScale: 0.015, fov: 48 },
            // transitionSeconds runs BACKWARDS from the arriving cue, so the recede
            // must ARRIVE at 528 to span 503.6→528; 488.5 then truly locks for ~15s,
            // recede plays, frame holds to the end. No camera cut at 535 (snap is
            // lights + black_gap only).
            { atSeconds: 528, transitionSeconds: 24.4, position: [-1.2, 2.85, 15.9], target: [0.92, 1.98, -0.2], driftScale: 0.006, fov: 50 }
        ]
    },
    lighting: {
        // Dressed silence until the first votive at 35.4 — no pre-grid candle steps.
        score: [
            { atSeconds: 0, keyWeight: 0.05, rimWeight: 0.0, fillWeight: 0.0, backWeight: 0.0 },
            // F2/F6: cool key whisper — practicals carry the relic from first flame.
            { atSeconds: 35.4, transitionSeconds: 1.2, keyWeight: 0.12, rimWeight: 0.06, fillWeight: 0.0, backWeight: 0.05 },
            { atSeconds: 62.83, transitionSeconds: 1.6, keyWeight: 0.14, rimWeight: 0.08, fillWeight: 0.0, backWeight: 0.06 },
            { atSeconds: 90.26, transitionSeconds: 1.6, keyWeight: 0.16, rimWeight: 0.1, fillWeight: 0.0, backWeight: 0.08 },
            // F7: anticipation breathing window — authored pulsing envelope in runtime.
            { atSeconds: 103, transitionSeconds: 1.2, keyWeight: 0.18, rimWeight: 0.12, fillWeight: 0.0, backWeight: 0.09 },
            { atSeconds: 109, transitionSeconds: 1.4, keyWeight: 0.2, rimWeight: 0.14, fillWeight: 0.0, backWeight: 0.1 },
            { atSeconds: 119, transitionSeconds: 1.2, keyWeight: 0.22, rimWeight: 0.16, fillWeight: 0.0, backWeight: 0.11 },
            { atSeconds: 125, transitionSeconds: 2.0, keyWeight: 0.24, rimWeight: 0.18, fillWeight: 0.0, backWeight: 0.12 },
            { atSeconds: 157, transitionSeconds: 1.6, keyWeight: 0.26, rimWeight: 0.2, fillWeight: 0.0, backWeight: 0.14 },
            { atSeconds: 177.876, transitionSeconds: 1.4, keyWeight: 0.28, rimWeight: 0.22, fillWeight: 0.0, backWeight: 0.15 },
            { atSeconds: 210, transitionSeconds: 1.6, keyWeight: 0.3, rimWeight: 0.24, fillWeight: 0.0, backWeight: 0.16 },
            { atSeconds: 229, transitionSeconds: 1.6, keyWeight: 0.32, rimWeight: 0.26, fillWeight: 0.0, backWeight: 0.17 },
            { atSeconds: 253, transitionSeconds: 1.6, keyWeight: 0.34, rimWeight: 0.28, fillWeight: 0.0, backWeight: 0.18 },
            { atSeconds: 277, transitionSeconds: 1.6, keyWeight: 0.36, rimWeight: 0.3, fillWeight: 0.0, backWeight: 0.19 },
            { atSeconds: 300, transitionSeconds: 1.6, keyWeight: 0.38, rimWeight: 0.32, fillWeight: 0.0, backWeight: 0.2 },
            { atSeconds: 310.35, transitionSeconds: 1.2, keyWeight: 0.4, rimWeight: 0.34, fillWeight: 0.0, backWeight: 0.21 },
            // F6: HUSH deepen — intent, not underexposure.
            { atSeconds: 316.65, transitionSeconds: 2.8, keyWeight: 0.16, rimWeight: 0.05, fillWeight: 0.0, backWeight: 0.04 },
            { atSeconds: 336, transitionSeconds: 14, keyWeight: 0.16, rimWeight: 0.05, fillWeight: 0.0, backWeight: 0.04 },
            { atSeconds: 359.9, transitionSeconds: 5, keyWeight: 0.22, rimWeight: 0.08, fillWeight: 0.0, backWeight: 0.06 },
            { atSeconds: 367, transitionSeconds: 1.2, keyWeight: 0.78, rimWeight: 0.7, fillWeight: 0.06, backWeight: 0.55 },
            { atSeconds: 375.05, transitionSeconds: 0.6, keyWeight: 1.05, rimWeight: 1.05, fillWeight: 0.12, backWeight: 0.8 },
            { atSeconds: 384.03, transitionSeconds: 1.8, keyWeight: 0.5, rimWeight: 0.6, fillWeight: 0.22, backWeight: 1.12 },
            { atSeconds: 440, transitionSeconds: 12, keyWeight: 0.4, rimWeight: 0.484, fillWeight: 0.15, backWeight: 0.95 },
            { atSeconds: 488.5, transitionSeconds: 8, keyWeight: 0.66, rimWeight: 0.72, fillWeight: 0.07, backWeight: 0.5 },
            // F6: die-down blacks pinned — no grey lift.
            { atSeconds: 503.59, transitionSeconds: 10, keyWeight: 0.28, rimWeight: 0.22, fillWeight: 0.02, backWeight: 0.14 },
            { atSeconds: 526, transitionSeconds: 6, keyWeight: 0.18, rimWeight: 0.12, fillWeight: 0.0, backWeight: 0.08 },
            { atSeconds: 535, transitionSeconds: 0.6, keyWeight: 0.1, rimWeight: 0.04, fillWeight: 0.0, backWeight: 0.04 },
            { atSeconds: 538, transitionSeconds: 1.0, keyWeight: 0.03, rimWeight: 0.0, fillWeight: 0.0, backWeight: 0.0 }
        ]
    },
    stage3: {
        // Own this gain rather than inherit Track 5's taste adjustments.
        accentIntensity: 0.483,
        reactivityRevealStartSeconds: 20,
        reactivityRevealEndSeconds: 80,
        phaseResponse: {
            smoothingSlow: 0.76,
            smoothingFast: 3.2,
            audioDriveMin: 0.322,
            audioDriveMax: 1.242,
            supportDriveMin: 0.483,
            supportDriveMax: 1.38
        },
        // Without this key all five phases fell back to the VOID curve
        // (Opus verify 2026-08-14).
        phaseCurves: {
            ASCEND: [
                { at: 0, air: 0.1, pressure: 0.14, warmth: 0.04, finish: 0.18, veil: 1.0, clarity: 0.5 },
                { at: 1, air: 0.46, pressure: 0.48, warmth: 0.34, finish: 0.46, veil: 0.52, clarity: 0.86 }
            ],
            FRACTURE: [
                { at: 0, air: 0.44, pressure: 0.46, warmth: 0.36, finish: 0.44, veil: 0.46, clarity: 0.86 },
                { at: 1, air: 0.3, pressure: 0.72, warmth: 0.3, finish: 0.52, veil: 0.14, clarity: 0.94 }
            ],
            HUSH: [
                { at: 0, air: 0.16, pressure: 0.3, warmth: 0.1, finish: 0.26, veil: 0.72, clarity: 0.6 },
                { at: 1, air: 0.12, pressure: 0.24, warmth: 0.08, finish: 0.24, veil: 0.66, clarity: 0.62 }
            ],
            ECLIPSE: [
                { at: 0, air: 0.5, pressure: 0.62, warmth: 0.52, finish: 0.5, veil: 0.1, clarity: 0.92 },
                { at: 1, air: 0.4, pressure: 0.8, warmth: 0.6, finish: 0.58, veil: 0.04, clarity: 0.96 }
            ],
            MEMORY: [
                { at: 0, air: 0.2, pressure: 0.34, warmth: 0.3, finish: 0.34, veil: 0.3, clarity: 0.74 },
                { at: 1, air: 0.04, pressure: 0.1, warmth: 0.14, finish: 0.22, veil: 0.6, clarity: 0.44 }
            ]
        },
        // Own these two outright — deepMerge would otherwise let Track 5's
        // roomPressureBeats/chamberLaw survive into this timeline (Cursor review
        // 2026-08-14: T5's pressure peak @317 landed on HUSH start and its
        // erasure law fired blackGap under the final snap).
        // CONSECRATE pressure: builds with the ritual, peaks in the sealed HUSH,
        // RELEASES when the room is fully lit, dies with the ember.
        roomPressureBeats: [
            { atSeconds: 0, value: 0.4 },
            { atSeconds: 35.4, value: 0.48 },
            { atSeconds: 90.26, value: 0.56 },
            { atSeconds: 125, value: 0.66 },
            { atSeconds: 177.876, value: 0.72 },
            { atSeconds: 253, value: 0.8 },
            { atSeconds: 310.35, value: 0.88 },
            { atSeconds: 316.65, value: 0.96 },
            { atSeconds: 359.9, value: 0.9 },
            { atSeconds: 367, value: 0.82 },
            { atSeconds: 375.05, value: 0.7 },
            { atSeconds: 384.03, value: 0.5 },
            { atSeconds: 440, value: 0.6 },
            { atSeconds: 488.5, value: 0.42 },
            { atSeconds: 503.59, value: 0.3 },
            { atSeconds: 535, value: 0.12 },
            { atSeconds: 539, value: 0.05 }
        ],
        // Birth arc: near-zero damage/forensic (nothing is broken yet — that is
        // Track 5's vocabulary); heavy watchful air in HUSH; afterimage/erasure
        // only after the collapse, erasure completing at the snap.
        chamberLaw: [
            { atSeconds: 0, gravity: 0.3, contact: 0.1, airDensity: 0.5, damage: 0.0, forensic: 0.08, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.0 },
            { atSeconds: 35.4, gravity: 0.42, contact: 0.2, airDensity: 0.52, damage: 0.0, forensic: 0.1, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.04 },
            { atSeconds: 125, gravity: 0.56, contact: 0.32, airDensity: 0.6, damage: 0.06, forensic: 0.16, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.12 },
            { atSeconds: 177.876, gravity: 0.66, contact: 0.42, airDensity: 0.58, damage: 0.1, forensic: 0.22, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.2 },
            { atSeconds: 277, gravity: 0.78, contact: 0.55, airDensity: 0.64, damage: 0.14, forensic: 0.26, afterimage: 0.0, erasure: 0.0, uiSuppression: 0.28 },
            { atSeconds: 316.65, gravity: 0.5, contact: 0.24, airDensity: 0.86, damage: 0.12, forensic: 0.4, afterimage: 0.06, erasure: 0.0, uiSuppression: 0.4 },
            { atSeconds: 366.8, gravity: 0.8, contact: 0.6, airDensity: 0.7, damage: 0.16, forensic: 0.3, afterimage: 0.08, erasure: 0.0, uiSuppression: 0.5 },
            { atSeconds: 384.03, gravity: 1.0, contact: 0.85, airDensity: 0.75, damage: 0.2, forensic: 0.2, afterimage: 0.12, erasure: 0.0, uiSuppression: 0.55 },
            { atSeconds: 440, gravity: 0.85, contact: 0.65, airDensity: 0.7, damage: 0.2, forensic: 0.16, afterimage: 0.16, erasure: 0.0, uiSuppression: 0.6 },
            { atSeconds: 488.5, gravity: 0.5, contact: 0.3, airDensity: 0.55, damage: 0.16, forensic: 0.08, afterimage: 0.3, erasure: 0.06, uiSuppression: 0.7 },
            { atSeconds: 520, gravity: 0.32, contact: 0.16, airDensity: 0.4, damage: 0.1, forensic: 0.04, afterimage: 0.5, erasure: 0.12, uiSuppression: 0.8 },
            { atSeconds: 535, gravity: 0.1, contact: 0.04, airDensity: 0.2, damage: 0.04, forensic: 0.0, afterimage: 0.8, erasure: 0.7, uiSuppression: 0.92 },
            { atSeconds: 539, gravity: 0.02, contact: 0.0, airDensity: 0.08, damage: 0.0, forensic: 0.0, afterimage: 0.3, erasure: 1.0, uiSuppression: 0.98 }
        ],
        anticipationBreath: {
            startSeconds: 103,
            endSeconds: 119,
            keyAmp: 0.048,
            hazeAmp: 0.07,
            pulseHz: 0.31
        },
        eventBeats: [
            { id: 't1_ign_unfreeze', type: 'material_reveal', atSeconds: 35.4 },
            { id: 't1_ascend_pulse', type: 'room_open', atSeconds: 109, durationSeconds: 6, intensity: 0.6 },
            { id: 't1_fracture_grip', type: 'room_tighten', atSeconds: 125 },
            { id: 't1_fracture_punct', type: 'post_crush', atSeconds: 133, intensity: 0.6 },
            { id: 't1_fracture_punct_2', type: 'post_crush', atSeconds: 157, intensity: 0.7 },
            { id: 't1_solo_punch', type: 'post_crush', atSeconds: 205.5, intensity: 0.8 },
            { id: 't1_hush_seal', type: 'room_tighten', atSeconds: 316.65, durationSeconds: 40, attackSeconds: 2.5, releaseSeconds: 8 },
            // F5: egg quickening at the harmonic peak inside HUSH.
            { id: 't1_hush_shift', type: 'material_reveal', atSeconds: 336, durationSeconds: 14, attackSeconds: 6, releaseSeconds: 8, intensity: 0.85 },
            { id: 't1_tornado_open', type: 'room_open', atSeconds: 367, intensity: 0.9 },
            { id: 't1_blink_before_roar', type: 'black_gap', atSeconds: 374.55, durationSeconds: 0.44, reopenSeconds: 0.06 },
            // F4: 375.05 physical detonation — white-hot flash, NOT room reveal.
            {
                id: 't1_doors_open',
                type: 'flash',
                atSeconds: 375.05,
                durationSeconds: 0.85,
                attackSeconds: 0.04,
                releaseSeconds: 0.55,
                intensity: 1.6,
                post: {
                    exposureDelta: 0.95,
                    bloomDelta: 0.38,
                    vignetteDarknessDelta: -0.22,
                    grainDelta: -0.008
                },
                room: {
                    thresholdDelta: 0.04,
                    supportDelta: 0.06
                }
            },
            // F4: 384.03 thematic release — the chamber becomes a ROOM.
            {
                id: 't1_climax_open',
                type: 'room_open',
                atSeconds: 384.03,
                durationSeconds: 14,
                intensity: 1.35,
                room: {
                    shellOpacityDelta: 0.52,
                    floorOpacityDelta: 0.2,
                    backLightDelta: 0.28,
                    fillDelta: 0.06,
                    thresholdDelta: 0.14,
                    supportDelta: 0.26,
                    roomPressureDelta: -0.08
                },
                post: {
                    bloomDelta: 0.08,
                    vignetteDarknessDelta: -0.14,
                    vignetteOffsetDelta: 0.12,
                    exposureDelta: 0.12
                }
            },
            // The absolute energy max of the track (255.97, delta +237.9).
            { id: 't1_energy_max_crush', type: 'post_crush', atSeconds: 411.5, intensity: 1.2 },
            { id: 't1_heartbeat_1', type: 'room_open', atSeconds: 520, durationSeconds: 2.2, attackSeconds: 0.3, releaseSeconds: 1.2, intensity: 0.35 },
            { id: 't1_heartbeat_2', type: 'room_open', atSeconds: 526, durationSeconds: 2.2, attackSeconds: 0.3, releaseSeconds: 1.2, intensity: 0.4 },
            { id: 't1_heartbeat_3', type: 'post_crush', atSeconds: 532.8, intensity: 0.5 },
            { id: 't1_final_snap', type: 'black_gap', atSeconds: 535.0, durationSeconds: 4.0 }
        ],
        phaseProfiles: {
            ASCEND: {
                smoothingScale: 0.7,
                audioDriveScale: 0.69,
                supportDriveScale: 0.863,
                breathScale: 0.6,
                thresholdDelta: -0.12,
                supportDelta: -0.1,
                roomPressureDelta: 0.06,
                floorDelta: -0.1,
                dustDelta: -0.04,
                shellDelta: -0.06,
                hazeDelta: -0.02,
                fogDelta: 0.01,
                vignetteDarknessDelta: 0.14,
                vignetteOffsetDelta: -0.1,
                vignetteSoftnessDelta: -0.04,
                cameraDriftScale: 0.55,
                fovBreathScale: 0.45
            },
            FRACTURE: {
                smoothingScale: 0.92,
                audioDriveScale: 1.035,
                supportDriveScale: 1.093,
                breathScale: 0.85,
                thresholdDelta: 0.0,
                supportDelta: 0.0,
                roomPressureDelta: 0.08,
                floorDelta: -0.02,
                dustDelta: 0.0,
                shellDelta: 0.02,
                hazeDelta: 0.0,
                fogDelta: 0.006,
                vignetteDarknessDelta: 0.05,
                vignetteOffsetDelta: -0.06,
                vignetteSoftnessDelta: -0.02,
                cameraDriftScale: 0.8,
                fovBreathScale: 0.7
            },
            HUSH: {
                smoothingScale: 0.5,
                audioDriveScale: 0.403,
                supportDriveScale: 0.575,
                breathScale: 0.4,
                thresholdDelta: -0.22,
                supportDelta: -0.2,
                roomPressureDelta: 0.12,
                floorDelta: -0.16,
                dustDelta: -0.08,
                shellDelta: -0.12,
                hazeDelta: -0.04,
                fogDelta: 0.02,
                vignetteDarknessDelta: 0.24,
                vignetteOffsetDelta: -0.16,
                vignetteSoftnessDelta: -0.08,
                cameraDriftScale: 0.15,
                fovBreathScale: 0.2
            },
            ECLIPSE: {
                smoothingScale: 1.0,
                audioDriveScale: 1.208,
                supportDriveScale: 1.265,
                breathScale: 1.0,
                thresholdDelta: 0.06,
                supportDelta: 0.06,
                roomPressureDelta: 0.12,
                floorDelta: 0.04,
                dustDelta: 0.04,
                shellDelta: 0.06,
                hazeDelta: 0.02,
                fogDelta: 0.0,
                vignetteDarknessDelta: -0.04,
                vignetteOffsetDelta: 0.04,
                vignetteSoftnessDelta: 0.02,
                cameraDriftScale: 1.0,
                fovBreathScale: 0.9
            },
            MEMORY: {
                smoothingScale: 0.6,
                audioDriveScale: 0.575,
                supportDriveScale: 0.69,
                breathScale: 0.5,
                thresholdDelta: -0.2,
                supportDelta: -0.18,
                roomPressureDelta: -0.06,
                floorDelta: -0.14,
                dustDelta: -0.06,
                shellDelta: -0.1,
                hazeDelta: -0.05,
                fogDelta: 0.016,
                vignetteDarknessDelta: 0.2,
                vignetteOffsetDelta: -0.14,
                vignetteSoftnessDelta: -0.06,
                cameraDriftScale: 0.4,
                fovBreathScale: 0.3
            }
        }
    }
};

export {
    SONOITE_WITNESS_TARGET,
    SONOITE_CHAMBER_FILM_TIMELINE
};
