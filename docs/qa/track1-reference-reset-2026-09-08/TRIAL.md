# Track 1 dim reliquary trial — 8 September 2026

**Superseded appearance:** the later darkness, material and climax pass is documented in [CLIMAX_AND_MATERIALS.md](CLIMAX_AND_MATERIALS.md). The bundle and response mapping below describe the earlier trial.

Status: implemented and opened for owner review; creative acceptance pending. Track 5 remains next.

Preview: http://127.0.0.1:8765/proposals/?direction=stage&light=sequence&setting=reliquary&moment=224

Served bundle: `prototype.CZq4RxZ8.js`. Branch: `experiment/physical-ambience`. The earlier Stage setting remains available under “Earlier curtain”; the new setting is opt-in for Track 1 Stage only. No production deployment or merge.

## Changes

- Replaced the rejected procedural curtain in this setting with a Blender cloth simulation over two uneven supports. The longer cloth settles on the floor; only the cloth is exported, with no visible support primitives. 10,057 vertices, approximately 600 KB GLB. Source and repeatable bake script are in `tools/blender/`; runtime model is `public/assets/models/track1-stage/weighted-drape.glb`.
- Reduced the existing key to 52%, narrowed its cone and reduced background fill. Positioned the covered form left of the relic with a confined grazing wash. The earlier two-minute opening hold is superseded by distinct existing cue setups, including a slow reframe from 52.83 to 62.83 seconds; later collapsed setups were also corrected. “Hold camera” defaults off.
- Existing analyser feeds independent envelopes: bass to key (1.5 s attack/4 s recovery) and fold pressure (7/12 s), mids to surface roughness (0.45/1.8 s), average energy to distance haze (10/16 s). Modulation remains bounded; actual cast shadows and floor light follow the physical sources. No additional onset detector or repeated wind loop. Haze is distance fog, not a newly implemented volumetric light shaft.
- Fixed the per-frame room update overriding the cloth light's target: the final proposal pass now owns its aim. Pausing, seeking, hidden state and reduced motion reset the new response. Navigation drops the experiment parameters.
- Preview opens paused at 3:44. “Cloth & light” plays 3:30–4:15. Music response and cloth visibility switch in place; changing the setting reloads the film. Full playback and the corrected opening are available from their buttons.

## Verification

- Build passed (existing large-chunk warning). 26 tests across four focused suites passed. Targeted lint for the response, camera-proposal and light-sequence modules passed; `git diff --check` passed. This is not a full-suite or whole-repository lint claim.
- Visible browser: 42 seconds of normal playback around 0:47–1:29 confirmed the opening reframe and distinct analyser responses. Final bundle: 25 one-second samples from 210.96–234.98 s confirmed key, haze and cloth changes; key ranged 26.09–27.62 and pressure morph 0.103–0.829. These numbers establish routing, not perceptual or musical success.
- Pausing and switching response off reset all four values to zero without changing transport time. Cloth switch hid the actual mesh. Scene child count remained 10 through the sampled seeks and playback. A teardown probe confirmed disposal of cloth geometry and material; no repeated journey-switch soak was performed.
- Checked diagnostic frames at 90, 137, 224, 310.5, 424, 500 and 535 seconds. Post off at 424 seconds retained cloth and cast shadow with one RenderPass. Earlier frame captures used `BIN-TjhW`; the final helper change preserves the same identity-transform asset appearance and corrects adoption of transformed parents. Final owner preview and playback used `CZq4RxZ8`.
- Preview, bundle, GLB and audio served successfully. The only failed request observed was the existing `favicon.ico` 404; also an unused preload warning. No failed shader programs observed.

Evidence is in `trial-evidence/`. The whole revised film has not been watched uninterrupted, and no new audio audition is claimed. The owner should judge whether the dim covered form earns its place, whether the light stays focused, and whether the restrained response is perceptible enough. The cloth hem and shadow edges remain available for refinement after this comparison.
