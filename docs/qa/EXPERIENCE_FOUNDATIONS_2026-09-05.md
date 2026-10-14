# Experience foundations — first implementation pass

Latest follow-up: see [Track 5 surface-response study](TRACK5_SURFACE_STUDY_2026-09-05.md) for the opt-in `reaction=surface` comparison over 3:45–4:15, its current build and fresh verification. Historical results below remain the record of the foundations pass.

Branch: `fix/experience-foundations`, from `84cc22553dbbd024d73fb75b2469b3b903cda199`.

Scope: album navigation isolation and reliable audio-accent input. Existing films, camera scores, phase timings, materials, fog trims and query experiments remain intact. This is not the creative redesign and does not adopt Fable's proposed endings or experiment removals.

## Implemented

### Navigation

Album navigation constructs a fresh query string. Only `seed`, `quality`, `dpr`, `fps`, `motion`, and `autonext` persist. `track` selects the destination; track-specific experiments, unknown future flags, proof duration and the old fragment do not carry over. Explicit experiment deep links still work. WordPress subdirectory paths are preserved.

Both album-index navigation and automatic track advance use the same existing `navigateToTrack` path, now backed by `getTrackNavigationUrl`.

### Audio

Replaced the absolute bass-level crossing with positive spectral change over 40–1000 Hz, using the existing Web Audio frequency buffer. The comparison threshold adapts to recent change rather than the sustained energy floor. The analyser and continuous breathing/energy channels were not retuned.

- Process fresh audio callbacks, not repeated render-frame copies.
- Prime for 0.35 seconds after startup/reset; re-prime after sample gaps over 0.5 seconds or changed frequency resolution.
- Reject near-silent input and use a 0.7-second minimum interval between triggers.
- Latch a hit until one render consumes it, so differing audio/render rates cannot erase it.
- Clear accents on pause, stop and seek; suppress them when paused, hidden or reduced-motion is active.
- Preserve existing authored accent amplitudes, decay and downstream channels. The obsolete absolute `accentThreshold` and `previousBass` state are removed.

This is onset-candidate detection, not a beat tracker or proof of musical taste. Full listening is still required to judge sensitivity and the visibility of each track's response.

## Verification

- Before changes: 553 unit tests passed across 30 suites.
- After changes: an initial full Jest run passed, 642 tests across 34 suites. A final repeat returned 641 passed / 1 failed: the unchanged security-manager audit-log heap test measured 17,138,488 bytes against its 10 MiB limit. Its isolated rerun also failed (17,140,896 bytes, 36 other tests passed). This test and its imported security-manager source have no diff. The suite is therefore NOT reliably green; the heap test needs separate investigation. Coverage collection was disabled, so coverage thresholds were not evaluated.
- Final focused rerun: all 13 navigation/audio regression tests passed across two suites.
- New navigation regression tests were observed failing before implementation, then passing.
- Audio pipeline tests use the real experience configuration and processing path with controlled spectral data. They cover loud sustained beds with new rises, startup, steady energy, near-silence, rapid oscillations, one-time render consumption, pause/reduced-motion, gaps, reset, seek and reused typed-array input.
- Production Vite build passed. Existing mixed dynamic/static import and chunk-size warnings remain.
- `git diff --check` passed; the new detector passes ESLint. Comparing the modified controller against HEAD found no new lint diagnostics (102 existing errors in both versions).
- Repo-wide lint is NOT green: the run reported 19,366 problems before removing the newly introduced lint violations. Do not treat the full validation gate as passed. Existing duplicate-package-name Jest warnings also remain.
- Locked dependencies restored with `npm ci --ignore-scripts --no-audit --no-fund`; no package/lockfile upgrades or automatic fixes.

### Live browser probes

1. Track-5 fill variant + proof=120 → actual in-app navigation to track 1: clean compatible selection, `sonoite-cinema`, ASCEND/FRACTURE/HUSH/ECLIPSE/MEMORY and practical lights active. Seed and autonext retained; experiment and proof removed.
2. Track 5, real playback 232.8–247.92 seconds: 302 analysis samples. Old fixed detector evaluated in parallel: **0 crossings**. New detector: **15 hits**, maximum sampled visual accent pulse approximately **0.405**. This proves signal delivery, not that all 15 hits are desirable musical accents.
3. Track 1 at approximately 180 seconds: 5 hits over 5 seconds; seek to 340 seconds clears queued/present accents; pause leaves pulse zero.
4. Track 4: correct six-phase sodium film, play/seek around 130 seconds and pause work; existing fixture remains active.
5. Track 5 with `motion=reduce`, same passage: reduced motion true, maximum accent zero.

These are targeted probes, not uninterrupted film acceptance or a mobile/GPU performance certification.

## Blender/material study next

Blender 5.2.1 LTS is installed and opens `tools/blender/reliquary_chamber.blend` successfully with automatic script execution disabled. Read-only inspection found:

- `Relic_Hero`: 32,467 vertices, 64,987 polygons in the source scene.
- One material, `MAT_Relic_Pale`, consisting of a Principled BSDF and output node.
- No UV layers or image-texture nodes.
- Existing chamber geometry, lights, `CAM_Score` camera and camera animation remain available.

The source scene counts are not identical to exported GLB counts; export triangulation, modifiers and vertex splitting must be measured separately. The source file and GLBs were not changed in this pass.

Controlled study:

1. Work on a copy of the Blender source, preserving the original. Compare its silhouette with the current generated model before choosing a production mesh.
2. Lock geometry, placement, seed, camera, time, lighting and exposure for every material A/B. Do not use `textured=1` as a material-only switch: it changes geometry.
3. Prepare UVs and deliberate hand/egg/petal material regions. Evaluate pale mineral, satin porcelain and subtle petal roughness variation primarily in gray. Restrained colour is an alternate, not a replacement mandate.
4. Bake/author normal, roughness and occlusion with a modest texture budget. Compare in actual Three.js lighting, not only Blender renders.
5. Review matched frames around track 1's close-ups, track 4's warm lamp passages and track 5's bright reveal. Accept silhouette/readability and performance before replacing any default asset.

Do not reintroduce the heavier track-4 fog: the August 15 history includes two explicit owner reductions. No changes to endings, camera grammar or experiment archival are authorized by this first pass.

## Handoff and recovery

Changes are local and uncommitted; nothing was pushed. WordPress serves ignored `dist/`, which was rebuilt for this branch. Switching Git branches alone does not switch the served bundle: rebuild the selected branch before judging it.

Pre-change served bundle backup and the full recorded track-5 spectrum probe are in `/private/tmp/sonoite-foundations.QjunYB/`. The saved bundle is `dist-before/`; the probe is `track5-audio-after.json`. Temporary evidence may be cleaned by the OS; retain it elsewhere if needed for long-term archival.

Free disk space after dependency restoration/build was approximately 6.9 GiB. Avoid large texture batches until there is more headroom. No existing source data or experiments were deleted.

## Owner follow-up — slightly stronger track-5 accents

Raised track 5's film-local `accentIntensity` from the previous shared 0.483 to 0.604 (approximately +25%). Trigger detection, cooldown, decay, camera scores, material assets and baseline illumination are unchanged. Track-5 derivatives that reuse this film, including recut, share its accent gain.

The new cross-track response test caught that Track 1/4 variants deep-merge the Track 5 timeline. Each now explicitly owns its original 0.483 accent intensity, preventing Track 5 tuning from leaking through that inheritance. Verified the actual browser-loaded values on all three tracks, not only exported constants.

Verification for this follow-up: 569 unit tests across 32 suites passed, production build passed, all three changed film modules lint clean, and `git diff --check` passed. Full-suite security heap and repository-wide lint caveats above still apply. A five-second live track-5 probe around 232.8 seconds reached a sampled accent peak of 0.546; screenshot captured at `/private/tmp/sonoite-foundations.QjunYB/track5-accent-boost.png`. Owner listening/visual acceptance remains pending.

### Temporary 200% diagnostic preview

Owner requested an exaggerated comparison, not a new default. Open `/?track=nao-querer-nada&reactivity=2&autonext=0` for 2x the current audio-response outputs. It amplifies accent, sustained-mid material response, audio breathing and average-energy inputs to atmosphere/lighting after detection; authored macro/support curves and detector cadence are unchanged. Renderer clamps still apply, so this is not a promise of exactly double pixel brightness. The setting is URL-only, drops on track navigation, is limited to track 5 and respects reduced motion. The normal URL retains the approved modest gain. Verification of the initial 2x option: 574 unit tests passed across 32 suites and the production build passed.

### Temporary 500% diagnostic preview

Owner then requested "another 300%", interpreted as another 300 percentage points above the 200% preview: 500% total, or 5x normal. Open `/?track=nao-querer-nada&reactivity=5&autonext=0`. Only the explicit values `2` and `5` enable gain; other values use normal response. The same track isolation, reduced-motion protection and unchanged detector cadence apply. This is amplification of existing audio-driven channels, not additional effects or trigger events; final renderer clamps still apply.

Verification: the new 5x pipeline case failed before implementation and passed after it. Production build passed. Unit suite: 577 passed / 1 failed across 32 suites; the unchanged SignalPipeline timing benchmark took 325.96 ms against its 50 ms bound, then 72.74 ms on a focused rerun. The focused audio/navigation suites passed again; the full unit gate is not green. Live playback around 232.8 seconds yielded 73 samples, exact 5x accent ratios, a sampled accent peak of 2.859 and finite response values throughout. Pausing restored preview gain to 1; navigation to track 1 removed the reactivity flag. Browser left paused. These targeted checks do not replace owner visual/listening acceptance.
