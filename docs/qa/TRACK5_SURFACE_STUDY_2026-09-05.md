# Track 5 surface study — revision history

**Latest revision 6:** owner found the fixed-shot study barely perceptible. Roughness amplitude is now 0.36; cue times and envelope unchanged. Bundle `js/prototype.5B_WZmDy.js`; build and 38 focused tests passed. See `TRACK5_LOCKED_SURFACE_STUDY_2026-09-05.md` for the latest comparison. Earlier revisions below are retained history.

**Current follow-up — revision 5:** the three-arm fixed-shot comparison is in `TRACK5_LOCKED_SURFACE_STUDY_2026-09-05.md`. Built bundle `js/prototype.lIYZNX1A.js`; 174 focused tests passed. The original `reaction=surface` behavior described below remains available. New comparison viewer: `~/Documents/Sonoite Surface Study 2026-09-05/comparison-locked.html`.

**Revision 4 owner adjustment:** another 10% roughness strength, **0.12 → 0.132**, retaining the same cues, approach and recovery. Built bundle: `js/prototype.TxedJO8j.js`. Build and 65 focused tests across the surface, audio, navigation and practical-light suites passed. Three browser seek captures measured 0.13187–0.13199 roughness reduction. Evidence: `revision-4/capture.json` and paired PNGs; root viewer updated. These are parameter amplitudes, not pixel-brightness percentages. Previous full-suite result remains recorded below; it was not rerun for this adjustment.

Status: owner rejected revision 1 as too strong, revealing too much of the shape, with timing that felt random. The behavior may be worth keeping only if subtler and appropriate to the track. Revision 4 is the latest owner-directed tuning; the normal URL remains the baseline.

## Compare

- Baseline: https://sonoite.local/?track=nao-querer-nada&autonext=0&seed=7
- Revised study: https://sonoite.local/?track=nao-querer-nada&autonext=0&seed=7&reaction=surface
- Listen from **3:45–4:15**. New cues peak at **3:56.65, 4:05.65 and 4:13.40**.
- Updated local viewer: `~/Documents/Sonoite Surface Study 2026-09-05/comparison.html`.

## Changes in response to owner feedback

Removed the study's entire emission and gray-albedo shader additions. The hand is no longer given a new glow or a broad shape reveal. The remaining effect reduces roughness by at most **0.132**, versus **0.3** in revision 1, allowing only a small change in the existing highlights. Its appearance still depends on the scene lighting; this is intentional.

Replaced the stateful “first onset after two bars” gate with a small authored surface score. The three peak times are selected from this recording's `public/assets/journeys/analysis/nao-querer-nada/peaks.json`. The weaker neighboring 239.05-second peak is skipped to leave room between gestures. Each envelope eases in for 0.35 seconds, peaks at the recorded accent, and settles over 1.25 seconds.

This is now **recording-timed animation**, like the authored film score, not live-onset response. It evaluates identically after a seek and does not depend on playback start time, detector callback cadence or a refractory timer. The cues are supported by recorded analysis; their musical appropriateness still needs owner listening.

The shared onset detector and other audio-driven channels remain unchanged. Camera, lights, geometry, existing shader/material colors, film events and endings retain their prior behavior. The opt-in route remains canonical Track 5 only, with recut/textured-model alternatives excluded. The 2x/5x gain flags are ignored on the active study page. Paused, hidden and reduced-motion states suppress its output. Navigation removes the study flag.

## Revision 2 verification (retained history)

- Browser-loaded bundle: `js/prototype.BtJHCDg5.js`.
- Focused surface/audio/navigation tests: **30 passed, 3 suites**. Tests verify exact cue provenance, rest intervals, smooth envelopes, seek-independent evaluation, transport suppression, unchanged color/emissive properties and other dynamic channels, and the reduced roughness range. New behavior was observed failing against revision 1.
- Full Jest run: **658 passed / 1 failed, 34 passing suites / 1 failing suite**. The previously observed security audit-log heap test measured **17,141,984 bytes** against a **10,485,760-byte** limit. Its test and security-manager source have no diff. No retry was used to erase this result, and the heap issue was not fixed here. Coverage was disabled.
- Build passed with existing import/chunk-size warnings. The surface module passes ESLint; the controller has 103 lint errors before and after, with no added diagnostic messages. Repository-wide lint is not certified.
- Real playback 225–255 seconds: 668 render samples and three captured peaks at 236.6296, 245.6296 and 253.3964 seconds, within 21 ms of the selected score peaks.
- Matched PNGs captured from actual playback, temporarily undoing only the roughness reduction for each baseline. Frames were visually inspected; the large hand reveal is gone. These are same-frame visual comparisons, not blind listening trials.
- Browser pause during an active cue returned surface output to zero and restored base roughness. The removed glow uniform is absent from the actual compiled shader. Navigation URL readback removes `reaction`.

Evidence is under `~/Documents/Sonoite Surface Study 2026-09-05/revision-2/`: `capture.json`, `pair-*-baseline.png`, `pair-*-changed.png`, build/test/lint logs, and pre-revision source copies. The root `comparison.html` now presents revision 2. `comparison-v1-rejected.html` and `revision-1-notes.md` preserve the rejected experiment; root `final-*` captures and metrics belong to revision 1, not the current result.

Changes are local and uncommitted. Normal URLs remain the baseline. The Track 1 practical-light comparison is now documented in `TRACK1_PRACTICAL_STUDY_2026-09-05.md`; the Blender asset study is still pending.
