# Track 5 fixed-shot surface comparison — revisions 5–6

**Current revision 6 — owner could barely see revision 5:** the study roughness dip is now **0.36**, up from 0.132. The two proposed cues remain 245.65 and 252.36 seconds, with the same 0.35-second approach and 1.25-second recovery. All active surface-study arms use the new amplitude; normal URLs still have no added surface score. Camera, light, colors, emission and geometry were not changed by revision 6. Current built/loaded bundle: `js/prototype.5B_WZmDy.js`; build and 38 focused tests passed. The prior 174-test result below belongs to revision 5. No full-suite rerun for this scalar adjustment.

A same-frame live probe compared 0.132, 0.36 and 0.50. In the same 220×215 head-region crop, mean absolute luminance differences from omission were 0.539, 1.853 and 2.367/255. At 0.36 the whole-frame difference was 0.150/255 and 13.83% of the head crop changed by more than 2/255. Chose 0.36 to make the existing highlights more legible without the glossier 0.50 result. This is roughly 3.4 times the measured crop change of 0.132 in this probe, not a universal perceptual multiplier. Owner acceptance is pending.

Rebuilt normal-speed capture confirmed peaks at 245.6590 and 252.3601 seconds, with roughness reductions 0.35994 and 0.36000. Actual same-frame head-crop differences were 1.974 and 2.041/255; whole-frame mean absolute differences were 0.146 and 0.145/255. The new clip and paired PNGs are in `revision-6/capture.json`, `two.mp4`, `two-*-*.png` and `metrics.json`. Browser verification confirmed all three viewer selections load the intended videos; the stronger version is selected initially.

The updated `comparison-locked.html` compares omission, the previous two-cue clip and the stronger two-cue clip. The original three-arm revision-5 viewer is retained as `comparison-revision-5.html`. Evidence for this pass is in `revision-6/`. The remainder below is revision-5 history.

Implemented by Codex following Fable's second-opinion identification of shot cuts and changing light rigs as comparison confounds. Fable remains reviewer, not implementer.

## Three arms

Canonical Track 5, seed 7, 225–255 seconds (03:45–04:15):

- Omission: `https://sonoite.local/?track=nao-querer-nada&autonext=0&seed=7&reaction=surface-none`
- Current three: same URL with `reaction=surface-three` (236.65, 245.65, 253.40 seconds).
- Proposed two: same URL with `reaction=surface-two` (245.65, 252.36 seconds).

All three reuse the canonical director's medium shot at score time 240, with local motion disabled, and retain its cold-side light setup throughout the passage. Camera selection and authored lighting time are held at that anchor. Existing continuous audio/material channels and atmospheric behavior continue equally across arms. This is a controlled shot comparison, not a frozen render or a new normal film edit.

Strength stays 0.132 roughness reduction, approach 0.35 seconds, recovery 1.25 seconds. No new emission, albedo lift or light-response channel. Omission removes only the added surface score. Paused, hidden and reduced-motion states suppress surface gestures; the comparison camera remains available while paused. The original `reaction=surface` route retains the three-cue study in the authored moving film. Normal URLs, other tracks, alternate material/recut variants and the shared detector are unchanged. Navigation drops reaction flags. Shot/rig behavior returns to the authored film outside 225–255 seconds.

## Verified

- Built and loaded bundle: `js/prototype.lIYZNX1A.js`.
- Build passed with existing warnings. Eight relevant suites passed, **174 tests** (38 surface/audio/navigation and 136 director/rig/film/recut checks). No full-suite, repository-wide lint or coverage certification in this pass; previous security heap-test failure remains documented.
- Normal-speed playback of the two-cue passage produced 232 samples with one camera position, one quaternion, FOV 40 and `cold_side` throughout the comparison. Captured cue peaks at 245.6425 and 252.3591 seconds, with actual roughness reductions 0.13182 and 0.13200.
- Separate full-passage video captures for all three arms retain one camera position and one rig before 255 seconds. Omission telemetry remains zero. Existing cue-placement and routing tests cover the distinct schedules, backward seeks, transport suppression, original-route preservation and track isolation.
- The loaded canonical director reports the relevant cuts at 235.3333 and 246.0 seconds, versus Fable's 236.2 and 246.8. Both put the later gesture in the wide. This study addresses that shared confound without retiming the normal film.

## Legibility result

At 1280×720, measured a fixed 220×215 head-region crop starting at x=530, y=95. The crop contains the flower head and a small adjacent portion of the hand/background; it is not a segmented head mask. Paired baseline PNGs undo only the added roughness change on the same frame, with identical camera, light and time.

| Proposed cue | Baseline crop mean /255 | Mean absolute crop luminance difference /255 | Crop pixels changing by more than 2/255 |
| --- | ---: | ---: | ---: |
| 245.65 s | 26.26 | 0.548 | 5.98% |
| 252.36 s | 23.18 | 0.546 | 6.07% |

The head is readable in the fixed shot. Both gestures produce small highlight changes; neither clearly stands out in still comparison. **No perceptual or musical acceptance is claimed.** Use the clips to judge whether either is perceptible and preferable to omission. Do not increase amplitude or adopt the cue pair merely because telemetry is nonzero.

## Evidence and viewer

`~/Documents/Sonoite Surface Study 2026-09-05/comparison-locked.html`

Evidence under `revision-5/`: `two-capture.json`, paired PNGs, `verification.json`, each arm's `*-video.json`, WebM and MP4, `clip-verification.json`, test/build logs. Videos are real-time canvas recordings; original site MP3 audio is muxed at each captured transport start (approximately 225 seconds). Encoding/render-frame timing limits make them listening aids rather than sub-frame sync certification. The same-frame PNG pairs are the stronger isolated visual evidence.

Track 1's next acceptance criterion is a readable contour plus at least one interior fold at locked samples of 60, 90 and 120 seconds. No black quota. The neutral-light/material comparison is still pending. The album-flow preference question is pending; no transport change is part of this study.
