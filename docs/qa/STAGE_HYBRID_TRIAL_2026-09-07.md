# Stage hybrid trial — 7 September 2026

Owner-authorized implementation on `experiment/physical-ambience`. Local trial only; no commit, merge or deployment. Existing Intimate, Chamber, Afterimage and default routes remain available.

## Open and compare

Preview: http://127.0.0.1:8765/proposals/?direction=stage

Choose **04 · Stage trial**. For Track 1, enable **Hold the Track 1 camera still** and play the middle to isolate the lighting. Disable it to watch the edited film. Track 4's opening shows the fixture and repeated strikes; Track 5's ending shows the accumulated floor trace. The accepted tar passage has its own shortcut.

Served final bundle: `prototype.DkhGrhPF.js`. Preview HTTP response, iframe readiness, selected direction and fixed-camera toggle verified.

## What changed

- **Track 1:** Afterimage foundation with closer inserts. A neutral key travels across the sculpture over 125–384 seconds; the receiving wall gradually emerges and its cast shadow changes scale and position. Object illumination withdraws earlier than the wall during the ending. The optional fixed-camera view runs the same lighting score. No additional cloth in this first comparison: judge light and shadow before adding the next layer.
- **Track 4:** closer room framing with a supported sodium fixture. A bracket, upright and foot reach the same floor as the sculpture. The scene's shadow-casting key sits at the tube, replacing the auxiliary fixture spotlights in this trial. Existing strike, buzz and extinction timings drive both sculpture and room illumination. Fog remains zero.
- **Track 5:** recurring medium compositions retain the accepted 391.434–432.908-second tar-frontier camera and the two restrained surface cues. Existing irreversible tar progress now also grows an irregular wet region across the floor. A broad area source and smooth surface relief give it a reflected highlight; this is a material treatment, not a fluid simulation. The light fades independently of the retained stain.

No new postprocessing pass. Track 5's area light and physical floor material use the existing render pipeline. The extra light is disposed by `destroy()`.

## Visual findings and remaining judgment

The fixed Track 1 comparison shows a substantial shadow on the wall without relying on a cut. The Track 4 wide includes the tube and its thin support, with an extensive sculpture shadow; the mounting foot is physically grounded but remains dark. Its closer detail shots deliberately crop the fixture.

Track 5's late floor trace is visible, and absent when seeking back before contamination. The first sine-shaped relief produced conspicuous bands and was discarded. The final reflection uses two smooth, uneven lobes and lower intensity. It is still the least resolved part of this trial: in a small capture the reflected region can read as a grey pool. Owner playback must determine whether it reads sufficiently as wet residue, and whether the ending composition gives it enough context. Do not call this photoreal fluid or an accepted improvement yet.

These are diagnostic visual observations, not a fresh listening review or a boredom verdict over complete films. The implementation preserves the current authored timing; this turn did not verify musical interpretations by hearing the recordings.

## Verification

- Production build passed. Existing Vite chunk-size and mixed-import warnings remain.
- Six focused suites passed: **89 tests** covering proposal isolation, camera/seek behavior, physical chamber, sodium controller, mutation, navigation and surface cues. The first focused invocation inherited global coverage thresholds and exited nonzero despite passing assertions; the appropriate focused rerun used `--coverage=false`. This is not a full-suite coverage claim.
- After final floor tuning, the two affected suites passed again: **14 tests**.
- Targeted ESLint for the proposal module, physical chamber and proposal tests passed; `git diff --check` passed. No repository-wide lint claim.
- Rendered all three tracks in the browser. Final shader compiled with no failed WebGL programs. Track 5 also rendered with `window.SONOITE_POST=false` (one render pass).
- Track 5: approximately 22 seconds of normal-speed diagnostic playback from 391.44 seconds, visible tab, stable frontier pose and scene child count. The first logged sample precedes the first rendered frame after seeking and still contains the preceding frame's residue value; subsequent samples track the new time consistently.
- Track 4: 15 seconds of visible normal-speed playback through opening lamp cycles; key varied from zero to 83.725, fog stayed zero and scene child count stayed at 10. Diagnostic dark and terminal captures have key/wall intensity zero.
- Backward seek from 540 to 90 seconds restored floor residue from 1 to 0; later 410-second capture restored the intermediate state. Tests cover repeatability of the authored response.
- Fixture floor alignment checked: fixture y=5.6, upright height=7.32, foot bottom=-1.82, matching the room floor.
- `destroy()` verified with the trial area light and physical chamber set to null and playback stopped. An initial diagnostic called nonexistent `dispose()`; corrected to the actual lifecycle method, without an application error.
- Preview console has an unrelated missing `favicon.ico` and unused Track 1 preload warnings on other tracks. Audio/model/script requests succeeded. No full-album playback, device-performance benchmark or general regression-suite pass is claimed.

## Evidence and archive research

Evidence: `~/Documents/Sonoite Environment Trial/stage-trial-2026-09-07/evidence/` — 12 canvas frames with state JSON plus two playback series. Captures are 960×540 copies taken immediately after render, after a diagnostic seek. Filenames contain requested cue time; JSON records actual rendered time. Do not interpret composer last-pass draw counts as scene performance.

Track 5 frames, Track 1 at 125/384 and Track 4 at 24 use final `DkhGrhPF`; other T1/T4 frames use preceding `D3pQeCBR`, whose T1/T4 implementation is identical. The final change between these bundles is the Track 5 floor reflection tuning.

Archive findings and source links: [Aesthetics, mood and experience deep dive](aesthetic-deep-dive-2026-09-07/REVIEW.md). Its inventory covers 1,918 Markdown files (1,596 unique contents); it distinguishes broad indexing from in-depth reading of the central creative source chains. The broader idea reserve is not authorization to implement every archived suggestion.
