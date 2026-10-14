# Track 1 — approach, conceal, reveal

Implemented 7 September 2026 on `experiment/physical-ambience`. This is an opt-in Track 1 stage comparison. Final preview bundle: **prototype.DoCwlTb4.js**.

## Try it

[Open the comparison](http://127.0.0.1:8765/proposals/?direction=stage&light=sequence).

The link selects Track 1, the stage trial, the new light movement and a held camera. Press **Light passage · 4:46–6:50**. Pause at any point and change **Light movement** between **Continuous sweep** and **Approach, conceal, reveal**; this preserves the same experience instance and playback position. The drape can also be switched off for the existing bare-wall comparison.

Uncheck the held-camera option to try the existing authored cuts, then restart the passage or play the full track. Changing the camera option reloads the film; changing the light option does not. The full-experience link carries the selected comparison settings.

The new sequence is only enabled by `proposal=stage&track=sonoite&light=sequence`. Other proposal directions, tracks, proof runs and navigation do not inherit it. The earlier stage sweep remains the default when the light parameter is absent.

## What changed

The existing travelling key now has an optional recording-time score. A small fixed opaque lighting flag near the source blocks part of the beam as the source passes it. It casts a real partial shadow across the sculpture and receiving surface. The flag sits above the authored close-up's frame and does not act as another visible stage prop.

| Recording time | Action |
| --- | --- |
| Before 286 s / 4:46 | Existing stage lighting; flag hidden |
| 286–316.65 s / 4:46–5:16.65 | Approach: ease out of the continuous sweep toward the obstruction |
| 316.65–330 s / 5:16.65–5:30 | Conceal: hold the source still through the existing hush; flower and egg remain readable |
| 330–384 s / 5:30–6:24 | Reveal: clear the obstruction gradually as the wall silhouette shifts across the cloth |
| From 384 s / 6:24 | Rest: retain the new light position; the existing full-film camera score remains available |
| Existing ending | Key and wall follow their existing withdrawal envelopes; both are zero by 535 s |

The cloth retains its existing single settlement across 316.65–365 seconds. Its geometry and material were not retuned here. The new light sequence lets that settlement happen during concealment and release.

The key remains at intensity 48 throughout the comparison passage. The wall wash eases down by 25 percent during the hush and recovers by 384 seconds. No new onset detector or global exposure response was added. The light's final position stays changed rather than retracing the blocker and causing an unwanted second interruption.

Reduced motion fixes the key position from the existing 125-second stage entrance and hides the blocker. The existing cloth reduced-motion rule retains the initial pose. Opening and ending intensity envelopes remain intact.

The shared shadow refresh probe now includes light position. Previously, position-only movement could wait for the periodic shadow update; now movement exceeding 0.005 scene units requests a refresh. This is support for the travelling-light effect, not a new visual score for another track.

## Verification

- **20 focused tests passed** across the light sequence, physical drape and cinematic proposal suites. They cover holds, continuous boundaries, reverse seeks, reduced motion, query/navigation isolation, the blocker staying outside the authored close-up, position-only shadow updates, the accepted Track 5 frontier and Track 4's sodium constraints. No full-suite coverage claim.
- Production build passed. Existing mixed-import and large-bundle warnings remain.
- The new light module passes ESLint; the preview's inline script passes Node syntax checking; `git diff --check` passes. Full `experience.js` lint remains non-green: 110 errors and one warning in its existing backlog. A full-file lint pass is not claimed.
- **One visible normal-speed passage from approximately 286 to 410 seconds completed**, entered with the documented passage seek. There were 237 state samples and nine canvas captures. All sampled visibility flags were false for `hidden`, and the camera position was identical throughout. This is a passage check, not an uninterrupted full-film review or an audio audition.
- The normal passage reached all four phases without retracing the obstruction. Frame-mean luminance was approximately 13.8/255 on approach, 8.8–9.2 during concealment, and 15.5 after release. These describe captured exposure; they do not prove musical quality or subject readability by themselves.
- Four paused UI switches at exactly 320 seconds preserved the same experience, ten scene children and paused time. Flag visibility and the full-experience link followed the selected light mode.
- Diagnostic seeks covered 90, 315, 320, 384, 525 and 535 seconds, including a 320 → 384 → 320 reverse check. The authored close-up at 315 seconds contains no visible flag geometry. Opening flag visibility is false; ending key and wall are both zero at 535 seconds.
- Reduced-motion runtime checks at 320/384 seconds returned the same fixed key position, hidden flag and zero cloth morph weight.
- With `window.SONOITE_POST = false`, the 315-second close-up still renders the physical shadow with one render pass. All inspected WebGL programs link successfully. The regular graded version used nine enabled passes.
- `destroy()` disposed the flag's geometry and material, removed it from the scene, cleared its reference and stopped playback.
- The final preview served the audio and application assets successfully. The normal page's only failed request was the unrelated missing `favicon.ico`; a preload warning also remains.

## Evidence

The `evidence/` folder stayed in the author's working copy and is not published here.

All evidence here uses `prototype.DoCwlTb4.js`.

- Normal playback state series and capture times (`evidence/normal-playback.json`)
- Approach at 310 s (`evidence/normal-310.jpg`)
- Concealment near 316.8 s (`evidence/normal-316-8.jpg`)
- Hush near 330.1 s (`evidence/normal-330-1.jpg`)
- Release at 350 s (`evidence/normal-350.jpg`)
- Arrival at 384 s (`evidence/normal-384.jpg`)
- Rest at 402 s (`evidence/normal-402.jpg`)
- Authored close-up at 315 s (`evidence/unheld315.jpg`)
- Ending at 525 s (`evidence/diagnostic525.jpg`)
- Post-processing disabled at 315 s (`evidence/postOff315.jpg`)
- Paused UI comparison checks (`evidence/toggle-check.json`)
- Build log (`evidence/build.log`), focused tests (`evidence/tests.log`), shared-file lint diagnostics (`evidence/experience-lint.json`)

The normal-passage frames come from the embedded comparison viewport. Separate full-experience diagnostic frames use a different viewport, so they are not pixel-matched exposure comparisons.

## Creative judgment still needed

Judge whether the partial concealment feels intentional, whether the release remains restrained, and whether the 6:24 pause holds attention. The timing follows the existing hush/reveal landmarks; this implementation pass did not independently listen to the recording. The full Track 1 cut and all-track cinematic acceptance remain separate from this bounded comparison.
