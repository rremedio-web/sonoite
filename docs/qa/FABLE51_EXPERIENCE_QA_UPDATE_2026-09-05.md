# Fable 5.1 — update for the ongoing experience QA

**Current — dim cloth and haze trial, 6 September.** Read `TRACK5_CLOTH_STUDY_2026-09-06.md`. Owner requested flowing folds, much dimmer cloth and a hazy vibe after seeing the first cloth render. Bundle `prototype.cqxKXgmA.js`; `room=cloth` on physical Track 5 only, within the existing 246.0–280.794 s wide. Static curved geometry, faint depth fog, retained grey hero and accepted closer tar cut. Build, 105 focused tests, new-file lint and a normal 56-second context playback passed. No default adoption. Interactive review prompt saved in the cloth-study evidence directory; Fable remains reviewer and will run in the owner's visible session, not headlessly. Player: http://127.0.0.1:8765/cloth-review/ .

**Current comparison — Track 5 room reveal.** Read `TRACK5_ROOM_REVEAL_STUDY_2026-09-06.md`. B adds `room=readable` to the physical scene; camera/edit remain fixed over 246.0–280.794 s. Existing side light, wall wash, fog and floor reflectance open over eight seconds. No new elements. Accepted tar cut remains in both arms. Bundle `prototype.Chnk4062.js`; build and 102 focused tests pass; both 56-second context passages completed at normal speed. Owner comparison: http://127.0.0.1:8765/room-review/ . Subject and wall read more clearly; floor contact remains faint. Opt-in, awaiting owner feedback. Fable remains read-only reviewer.

**Owner accepted the closer view.** “closer view earns its place.” The physical room now includes the 391.434–432.908 s cut by default; use `passage=hold` for A, with `passage=tar-cut` retained as a compatible B link. The ordinary film remains unchanged. Accepted bundle `prototype.BzlzO1st.js`; rebuild, 100 focused tests and live default-route check pass. See `TRACK5_TAR_PASSAGE_COMPARISON_2026-09-06.md`.

**Latest — hold versus closer tar view, 6 September.** Owner approved trying the bounded comparison following Fable 5.1’s read-only second opinion. Read `TRACK5_TAR_PASSAGE_COMPARISON_2026-09-06.md`. On `experiment/physical-ambience`, add `passage=tar-cut` to the physical Track 5 trial for a low medium shot at 391.434 s through 432.908 s. The loaded beat grid places this at bar 149, not the review’s bar 147. Both arms now share the restored chamber fog update. Build and 100 focused tests pass; both 96-second passages completed at normal speed. Final bundle `prototype.iZzwgdWo.js`; local comparison at http://127.0.0.1:8765/review/ because LocalWP is stopped. No default adoption. Fable remains reviewer; Codex implements. Earlier bundle identities below are historical.

**Current trial — physical Track 5 ambience on `experiment/physical-ambience`.** Owner requested a new branch to try the elements review. Opt-in URL: `https://sonoite.local/?track=nao-querer-nada&scene=physical&autonext=0&seed=7`. Read `PHYSICAL_AMBIENCE_TRIAL_2026-09-05.md`. Bundle `prototype.Wsn-whC0.js`. Continuous physical floor/backdrop, restrained wall wash, grey original hero with self-shadows; decorative sprite/point layers removed at construction. Current defaults are preserved. Build and 51 focused tests passed; paired diagnostic frames and a 20-second transport check recorded. Not full playback or owner acceptance. Tracks 1 and 4 were not redesigned in this trial. Fable remains read-only QA/second opinion.

**Current — owner approved the quiet Track 1 scene; now the default.** Normal URL: `https://sonoite.local/?track=sonoite&autonext=0&seed=7`. Previous candles/pools scene: add `scene=original`. `scene=quiet` still works. Bundle `js/prototype.CBT5ST-Y.js`. Original generated mesh and material treatment retained; separate Blender material candidate remains set aside. Visual parameters match the approved scene study. Build and 125 focused tests passed; fresh browser checks verified default/original selection, original mesh, removed overlays and physical floor, and the normal Track 1 render at 90 s without console errors/warnings. Track 4 sodium controller remains present; quiet mode is disabled on Track 4 and Track 5. No full-playback or full-suite claim. Fable remains read-only QA/second opinion; Codex implements. Earlier updates below describe history and their earlier URLs/builds.

**Latest owner steering — grey mesh retained; work moved to lights and surroundings:** the owner says the grey mesh works better in darkness and asks to focus on the rest. Do not treat the material candidate as the selected film asset. Read `TRACK1_QUIET_SCENE_STUDY_2026-09-05.md`. New Track 1 comparison: `https://sonoite.local/?track=sonoite&scene=quiet&autonext=0&seed=7`, bundle `js/prototype.DUJmngNI.js`. Existing generated mesh/material treatment, candles and orange pools removed, dotted fields/haze sprites/bokeh hidden, physical dark floor and shadow reception, neutral side-light opening from 36–125 s, later original light calculations in neutral colours. Build and 124 focused tests passed; final captures at 60/90/120/216/384/537 s. Compare the opening and owner screenshot time 3:36; assess whether the grey form reads without excessive disclosure and whether the remaining backdrop distracts. No artistic acceptance or full-playback claim. Fable stays read-only QA/second opinion. Older updates below are historical.

**Latest — owner-liked Blender material direction, now in an opt-in Track 5 film comparison:** read `BLENDER_MATERIAL_CANDIDATE_2026-09-05.md`. URL: `https://sonoite.local/?track=nao-querer-nada&relic=materials&reaction=surface-two&autonext=0&seed=7`. Bundle `js/prototype.KpVJgFsT.js`. The 64,987-triangle Blender candidate has smooth normals, UVs and separate glove/petals/egg/metal slots. The film shader now preserves these finishes; existing tar/erasure behavior remains. Accepted surface strength 0.36 and two-cue timing remain, with the authored candidate's gesture restricted to petals. Default URLs retain the old asset. Owner approved the standalone material direction, not a completed film or final boundary cleanup. Build and 52 focused tests passed; sampled browser shots at 100/203/245.65/252.36/478 s verified, no full playback. Check finger/petal joins, material readability under the existing lights and whether the surface gesture remains restrained. Fable remains read-only QA/second opinion; Codex owns implementation. Previous updates below are historical.

**Latest owner feedback and revision 6:** the owner could barely see the fixed-shot gestures. Codex increased the surface-study roughness dip from 0.132 to 0.36; two-cue placement, envelopes, camera, lighting, colors and emission are unchanged. Current bundle `js/prototype.5B_WZmDy.js`; build and 38 focused tests passed. Same-frame probe gives approximately 3.4× the head-region luminance change at the selected strength; this is not perceptual acceptance. `comparison-locked.html` now compares omission, previous subtle two cues, and stronger two cues. See the current top of `TRACK5_LOCKED_SURFACE_STUDY_2026-09-05.md`. Previous updates below are historical.

**Current implementation — fixed-shot Track 5 comparison (revision 5):** Codex implemented `reaction=surface-none`, `surface-three` and `surface-two` for canonical Track 5 over 225–255 seconds. Each uses the same medium camera and cold-side rig anchored at score time 240; amplitude stays 0.132. Read `TRACK5_LOCKED_SURFACE_STUDY_2026-09-05.md`. Built/loaded bundle: `js/prototype.lIYZNX1A.js`; build and 174 relevant tests passed. Three normal-speed clips are available in `comparison-locked.html` in the Surface Study directory. Two-cue frame measurements show about 0.55/255 mean absolute difference in a head-region crop; neither clearly stands out in stills, and owner perceptual/musical acceptance is pending. Normal defaults and the legacy `reaction=surface` route are preserved. Track 1's criterion is readable contour plus an interior fold at 60/90/120 seconds; its neutral-light comparison is not built yet. Keep the sodium premise and authored HUSH. Transport preference remains pending. Fable's role remains second opinion and QA only.

The earlier update below is retained as history; its bundle and unimplemented-comparison statements describe the prior revision.

**Owner correction:** the candle fixture and orange pool are disliked. Set that visual direction aside; this is not a request to brighten them further. Use the supplied album artwork (black field, pale translucent form, dark hand, pale flower/egg) as a reference.

**Seven-track listening review received:** read `~/Documents/Sonoite Listening Review 2026-09-05/GEMINI_LISTENING_REVIEW_FOLLOWUP.md` and `CODEX_SEVEN_TRACK_SYNTHESIS.md` in that directory. Gemini reports direct ingestion of all seven recordings; all seven durations match the site files. Its musical descriptions, RMS claims and proposed visual rules remain external review input. The chamber film registry currently has dedicated scores only for Tracks 1, 4 and 5; the other four need separate authoring in this engine. Proposed next comparisons are two Track 5 surface gestures (245.65 and approximately 252.36 seconds) and a neutral grazing-light Track 1 opening without candles/orange pools. Neither is implemented by this document update. Do not assume universal monochrome, an 85–95% black quota, changed Track 4 identity/endings, inserted album gaps or seamless cross-track camera continuity have been accepted. The actual current implementation remains described below.

**Latest follow-up — surface revision 4 and Track 1 pools:** owner requested another 10% surface strength, now maximum roughness reduction **0.132** (from 0.12). Three authored peaks remain **236.65, 245.65, 253.40 seconds**, with 0.35-second approach and 1.25-second recovery. No added glow/albedo reveal. Browser peak readbacks: 0.13187–0.13199. Compare canonical Track 5 with `&reaction=surface` over 3:45–4:15.

Track 1 now has an opt-in `&practicals=pools` comparison: double point-light intensity and floor/wall pool opacity, 35% wider floor-pool radius, full effect from 0:36 and eased back during 2:01–2:05. Same ignition score, flame sprites, camera, fog, exposure and film. Read `TRACK1_PRACTICAL_STUDY_2026-09-05.md`. Three matched seek frames show clearer local pools but means of 10.93, 4.10 and 5.29/255: **this does not meet the proposed 8/255 floor throughout**. Do not label the early visibility problem fixed or adopt the study as default. The first-votive framing and dotted dust remain.

Current built and browser-loaded bundle: `js/prototype.TxedJO8j.js`. Build and **65 focused tests / 5 suites** passed. Previous full suite had 658 passes / 1 security heap-test failure; not rerun here. Current evidence is under the Surface Study `revision-4/` directory and `~/Documents/Sonoite Practical Study 2026-09-05/`. Normal URLs remain baseline.

Continue your current review of Tracks 1, 4 and 5 with this implementation update. Preserve your observations so far, but record which build and URL they describe. Recheck findings affected by these changes before issuing your final verdict. This is a QA context update, not an implementation request.

## Current checkout and evidence

- Theme: `<repo>`
- Site: `https://sonoite.local/`
- Branch checked on 2026-09-05: `fix/experience-foundations`.
- HEAD: `84cc22553dbbd024d73fb75b2469b3b903cda199`. The changes below are local and uncommitted, including untracked detector and test files. Reviewing HEAD alone misses them.
- Read `docs/qa/EXPERIENCE_FOUNDATIONS_2026-09-05.md` and the working-tree diff. Inspect `src/js/prototype/audio-accent-detector.js`, `tests/unit/audio-accent-pipeline.test.js` and `tests/unit/track-navigation.test.js` explicitly.
- Earlier audit: `~/Documents/Sonoite Audit/2026-09-05/README.md`; experiment inventory: `EXPERIMENTS.md` in that directory.
- Earlier `FABLE-SECOND-OPINION.md` in that directory predates these changes. It covered Tracks 1 and 5 using source and paused frames, without listening; it did not cover Track 4. Treat its claims as hypotheses to reassess, not current verified defects.

WordPress serves ignored `dist/`. The recovered session reports a successful rebuild after the 5x preview change. Verify the bundle actually loaded in your browser, hard-refresh your QA page, and record its URL/hash. Source inspection in this update does not establish that an already-open tab has the latest code. Do not rebuild, switch branches, or change the shared application during this review; report any mismatch.

## Changes now present in source

### 1. Album navigation isolates experiments

`getTrackNavigationUrl()` creates a fresh query string and drops the old fragment. Only `seed`, `quality`, `dpr`, `fps`, `motion` and `autonext` carry into the destination track. Track-specific variants, proof durations, `reactivity` and unknown flags are removed. Explicit experiment deep links remain available. Album-index navigation and automatic advance both use `navigateToTrack()`.

Recheck the former reproduction: Track 5 with `variant=track5-cinema-fill&proof=120` → in-app navigation to Track 1. Inspect the destination URL, actual film/variant, phase names and practical-light controller. Track 1 should resolve to its own film instead of inheriting the Track 5 experiment. Include Track 4 and automatic advance in your navigation coverage where practical.

### 2. Adaptive audio accents replace the fixed bass crossing

The old absolute bass threshold has been replaced by positive spectral change over 40–1000 Hz with an adaptive threshold. It consumes fresh audio callbacks, primes for 0.35 seconds after reset, re-primes after gaps over 0.5 seconds or frequency-resolution changes, rejects near-silence and enforces a 0.7-second minimum trigger interval. Hits remain pending until one render consumes them. Pause, stop and seek clear accent state; paused, hidden and reduced-motion states suppress accents.

This shared detector affects all three films. The analyser and continuous-channel smoothing were not retuned. These are onset candidates, not a beat grid, phrase detector, or guarantee that the chosen musical events are tasteful. The 0.7-second interval is the implemented value; the earlier critique's proposed 1.4 seconds was not adopted.

The earlier “sustained bass prevents further fixed-threshold crossings” diagnosis describes the old implementation. Reassess the current detector and downstream visibility independently. If the result still feels inert, determine whether it misses salient events or detects them but drives channels too subtly. Do not infer musical causality from a paused screenshot or a nonzero telemetry value.

### 3. Normal Track 5 accents are approximately 25% stronger

Track 5's film-local `stage3.accentIntensity` changed from `0.483` to `0.604`. Derivatives reusing that film, including recut, inherit this gain. Tracks 1 and 4 now explicitly specify `0.483` because their configuration deep-merges the Track 5 timeline. They share the new detector but do not inherit Track 5's amplitude increase.

This normal gain adjustment does not change detector cadence, decay, idle illumination, authored camera scores or material assets. Owner visual/listening acceptance remains pending.

### 4. Temporary 2x and 5x diagnostic previews

Only the explicit query values `reactivity=2` and `reactivity=5` activate extra gain, only on Track 5 while playing and without reduced motion. Other values use normal gain. Pause and reduced motion return the preview gain to 1, and album navigation drops the flag. The setting is URL-only.

The gain amplifies existing accent, sustained-mid material response, audio breathing and average-energy inputs to atmosphere/lighting. It does not add effects, change detection cadence, amplify autonomous breathing, or replace authored macro/support curves. Final renderer clamps still apply: 5x input is not 5x visible brightness or motion.

“Another 300%” was implemented as 500% total, or 5x normal. The previews are diagnostic exaggerations, not the default experience or a proposed final aesthetic.

## Review URLs and comparison method

| Purpose | URL |
| --- | --- |
| Track 1 normal | https://sonoite.local/?track=sonoite&autonext=0 |
| Track 4 normal | https://sonoite.local/?track=horas-mortas&autonext=0 |
| Track 5 normal | https://sonoite.local/?track=nao-querer-nada&autonext=0 |
| Track 5 2x diagnostic | https://sonoite.local/?track=nao-querer-nada&reactivity=2&autonext=0 |
| Track 5 5x diagnostic | https://sonoite.local/?track=nao-querer-nada&reactivity=5&autonext=0 |
| Track 5 reduced-motion diagnostic | https://sonoite.local/?track=nao-querer-nada&reactivity=5&motion=reduce&autonext=0 |

Judge the normal URLs first. Compare Track 5 at 1x/2x/5x over the same 3:45–4:15 passage, particularly around 3:53. Keep viewport, quality, seed, variant and listening level consistent; record exact URLs and timestamps. Allow priming after seeking. Use your own QA page and avoid changing another agent's playback.

Name what visibly reacts: material, light, atmosphere or breathing, with a timestamp and musical event. Distinguish onset accents, sustained-energy response and authored clock-driven changes. Determine whether normal gain is perceptible, whether 2x improves musical legibility, and whether 5x merely reveals clamps, competing responses or distracting changes. Do not generalize a diagnostic-only artifact into a default defect.

Listening and continuous viewing are needed for judgments about rhythm, pacing and boredom. If your tooling cannot provide those, state the limitation and narrow the claim. Muting a speaker or browser tab does not necessarily zero the analyser; do not present that alone as a controlled audio-response comparison.

## Creative and material scope still pending

The foundations pass did not implement a material study or creative redesign. Its new follow-up is the restricted shader-response study linked above; Blender asset work is still pending. The source diff contains no new meshes, textures, endings, camera scores, phase timings or fog edits. Blender inspection was read-only: the existing source has one pale material and no UV layers or image-texture nodes. Geometry counts and prior inspection details are in the foundations note.

Keep assessing material richness, legibility, pacing, camera motivation and distinction among the three films. The user likes the gray look and also accepts restrained colour. Recommend controlled changes to roughness, normal detail, contact grounding and separation of hand, egg and petals. `textured=1` changes geometry and is not a material-only A/B; hold mesh, camera, lighting, time and seed constant for a material judgment.

Preserve Track 4's failing sodium-lamp premise and account for its controller-owned events. The owner previously requested fog reductions; heavier fog is not an assumed improvement. Earlier proposals to remove Track 5 cuts, replace endings, or archive experiments remain unaccepted suggestions. Separate such creative proposals from defects in the current implementation.

## Historical verification, not fresh QA results

The recovered implementation notes report:

- Track 5 playback at approximately 232.8–247.92 seconds: 302 samples, 0 old-detector crossings versus 15 new-detector hits. This establishes delivered signals, not the musical quality of every hit.
- Browser checks of the actual per-track gains, navigation isolation, seek/pause and reduced motion.
- Latest 5x probe: 73 playback samples, exact 5x accent-output ratios and finite values. Pausing restored gain 1 and navigation removed the flag.
- Successful production build and focused audio/navigation tests. The final unit run reported 577 passed / 1 failed, with an unchanged SignalPipeline timing benchmark exceeding its limit. Earlier full-suite runs also exposed a security-manager heap-test failure. Repository-wide lint was not green and coverage thresholds were not evaluated.

These results were recorded before the crash and were not rerun to prepare this prompt. Do not report a globally passing test gate or full-film acceptance from them. Temporary `/private/tmp/sonoite-foundations.QjunYB/` evidence may no longer exist; check before citing it.

## Requested QA output

Continue your existing report and add:

1. Build/URL identity, playback/listening coverage and limitations; label earlier observations if they used an older bundle.
2. An updated status for navigation isolation, onset detection, per-track gain isolation and preview reset behavior: confirmed fixed, still failing, or unverified, with evidence.
3. Separate judgments for normal Track 1, Track 4 and Track 5, followed by the Track 5 1x/2x/5x comparison. Give a concrete recommendation on response visibility; do not assume the strongest setting wins.
4. Ranked remaining defects with track, exact URL, timestamp, visible symptom and evidence. Keep creative preferences separate.
5. Three highest-value creative/material next steps grounded in the current films. State whether the normal experiences are ready for owner listening/visual acceptance and what still blocks that judgment.

Keep this review read-only with respect to application code, assets, builds and configuration. Use your existing report destination for findings. Do not implement suggestions or restart the review from scratch solely because of this update.
