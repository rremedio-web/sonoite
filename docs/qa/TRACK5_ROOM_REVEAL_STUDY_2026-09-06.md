# Track 5 room reveal comparison — 2026-09-06

Branch: `experiment/physical-ambience`. Owner authorized a bounded comparison of the empty wide shot. This study is opt-in and has not been accepted as the default physical room.

## Owner links

Comparison: http://127.0.0.1:8765/room-review/

A: `?track=nao-querer-nada&scene=physical&autonext=0&seed=7`
B: same plus `room=readable`.

The local server serves the durable directory `~/Documents/Sonoite Environment Trial/passage-337-433/site-preview`. The older accepted-cut comparison remains at /review/. No preview depends on /tmp remaining available.

## Scope and cause

The canonical ws_room_reveal occupies bar 94 through bar 106: **246.0–280.79411764705884 s**. Camera pose, lens, cut score, sculpture geometry/material treatment, audio and tar timings remain identical between A and B. The accepted 391.434 s tar-frontier cut remains present in both physical-room arms.

The baseline key inherits a roughly 0.17 rad cone during this shot, leaving most of the body and floor unlit. At the camera's roughly 37-unit distance, exponential fog near 0.038 strongly suppresses the subject and more distant wall. Lower fog alone improved the contour in a runtime probe but did not establish the base. The combined study changes existing light coverage, fog and floor reflectance; it is not an isolated lighting A/B.

## Implementation

Only `scene=physical&room=readable` on canonical Track 5, excluding recut, enables the study. Navigation drops the flag.

From the shot's own start time, an eight-second smoothstep opens the existing lights and receiving surface, then holds until the next authored cut:
- Existing key moves toward [-7, 4, 5], aims at [1, -0.7, 0], reaches intensity 85, cone 0.62 rad, penumbra 1 and neutral wall-wash tint.
- Existing rim/back settle to 0.7 / 0.3, keeping one dominant source direction.
- The existing wall wash broadens from 0.95 to 1.2 rad and aims further left/lower. Its intensity remains on its existing score; no new light or particle layer is introduced.
- Fog blends from its ordinary chamber response toward density 0.021.
- A floor-only shader uniform blends the existing diffuse multiplier from 0.16 to 0.32. Wall material, roughness, specular response and geometry remain unchanged.

Baseline atmosphere values are written before each frame's optional study. Light positions blend from the resolved authored rig, not the prior rendered position. This avoids drift and restores the correct intermediate pose on backward seeking. The next cut resolves the ordinary rig and restores fog, wall aim and floor multiplier.

## Verification

Built/loaded bundle: `js/prototype.Chnk4062.js`.
- Production build passes.
- 102 tests pass in eight focused suites: room-reveal-study, physical-chamber, quiet-scene-study, track-navigation, track5-surface-response, light-rigs, hero-textured-flag, shot-director.
- New test-file lint and git diff whitespace check pass. No global-lint or full-suite claim.
- Both arms completed normal-speed playback from 236 to 292 s, with 225 quarter-second samples each. Logs report visible document state throughout. Frames were captured immediately after composer rendering at 245, 246, 250, 254, 260, 270, 280 and 285 s.
- Camera positions match in the compared wide frames. Runtime seek 285 → 250 → 410 restores the intermediate reveal, then the accepted tar-frontier setup. Scene children remain nine.
- At 285 s, floor multiplier is back to 0.16 and wall target to [-3, 3, -9]. At 410 s, accepted mcu_tar_frontier and its lower key target remain intact.
- No render/script errors observed in the checked pages. The static export requests a missing favicon; this does not affect playback.
- No independent audio listening claim. The eight-second light opening is a visual candidate within the existing shot, for owner playback judgment.

## Measured and visual result

The 1200×688 normal-playback frames use fixed image regions for relative comparison, not measured object segmentation or an exposure acceptance threshold.

At approximately 260 s, current → readable mean luminance (/255):
- Subject region: 4.27 → 18.11.
- Wall region: 1.01 → 6.06.
- Floor-contact region: 0.98 → 1.84.
- Whole frame: 1.15 → 1.83.

The body and adjacent wall are visibly clearer. Floor contact remains faint; this does not claim a fully revealed room. The camera still makes the sculpture small. Preserving that framing is deliberate for this comparison.

Owner question: can the base and wall be read without the room feeling too exposed?

## Evidence

`~/Documents/Sonoite Environment Trial/room-reveal-2026-09-06/`
- comparison.html: source of /room-review/.
- current-normal-playback.json and readable-normal-playback.json: logs and same-task canvas captures.
- current-*.jpg / readable-*.jpg; paired-frames.jpg at 250, 260 and 280 s.
- frame-metrics.json: fixed-region measurements.
- seek-check.json: restoration and accepted-cut checks.
- source-before/: snapshots before this study; room-study-only.patch separates this change from inherited work.
- baseline-260.json: initial diagnostic capture before implementation.

No commit, merge, push or deployment. No adoption of the study has been inferred.

