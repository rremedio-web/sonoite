# Track 1 practical-source comparison — direction rejected

**Owner feedback:** dislikes the candle and orange pool, explicitly clarified on 5 September. Do not continue intensifying this look or adopt it. Study remains available only as historical opt-in evidence. The supplied album artwork is the reference for the next direction; a listening review is proposed before further visual redesign.

Local, opt-in comparison following the owner's request to move ahead after the Track 5 surface adjustment. This tests the review's study B: stronger early practical sources with the camera untouched.

- Baseline: https://sonoite.local/?track=sonoite&autonext=0&seed=7
- Study: https://sonoite.local/?track=sonoite&autonext=0&seed=7&practicals=pools
- Passage: 0:36–2:05. The lift approaches with the first ignition at 35.4 seconds, reaches full at 36 seconds, and eases away over 121–125 seconds.
- Local point-light intensity and floor/wall wash opacity double; floor-pool radius increases 35%. Flame seeds, atmospheric halos, ignition times, camera, global exposure, fog, material and endings are unchanged. No extra light objects are created.
- Canonical Track 1 only; the existing navigation allowlist drops `practicals`. Normal URLs are unchanged. Existing quality filtering still applies (balanced omits the second votive).

## Verification and limits

Build passed; browser loaded `js/prototype.TxedJO8j.js`. Five focused suites passed, 65 tests. Controller tests cover actual light/pool behavior, unchanged flame opacity and positions, out-of-window restoration, backward seeks, disposal and track isolation. Browser readback confirms the radius returns to 1 at 125 seconds, reaches 1.175 midway through release, and repeats identically after a backward seek. Navigation readback drops the flag. Existing build warnings remain; no full-suite or coverage certification in this pass. The previous full-suite security heap failure is recorded in the Track 5 study note.

Three PNG pairs at 1280×720, balanced, seed 7, captured after transport-synced diagnostic seeks. The baseline in each pair temporarily removes only the study's light/pool changes from the same rendered frame. These are not uninterrupted full-playback captures or musical acceptance.

| Time | Baseline mean /255 | Study mean /255 |
| --- | ---: | ---: |
| 36.88 s | 10.83 | 10.93 |
| 65.33 s | 3.92 | 4.10 |
| 110.34 s | 4.98 | 5.29 |

The votive has a wider warm pool and the wall wash gains some presence. **The proposed 8/255 exposure floor is not met throughout these samples.** Local sources affect a small fraction of the frame; doubling their intensity does not solve overall visibility. First-votive framing remains tight against the bottom edge, and the dotted dust remains visible. Keep this as a comparison, not an accepted visibility fix. A framing/room-surface decision is still needed before expanding the change.

Evidence and viewer: `~/Documents/Sonoite Practical Study 2026-09-05/` (`capture.json`, `pair-*.png`, `metrics.json`, `comparison.html`, build/test logs). `probe.json` and root `baseline.png`/`changed.png` are the earlier live tuning probe, not the final built captures.
