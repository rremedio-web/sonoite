# Track 1 — darkness, diffusion, materials and climax trial

8 September 2026. Local branch `experiment/physical-ambience`. This supersedes the appearance and audio-to-haze details in the earlier `TRIAL.md`; that report remains historical evidence. Track 5 is still next. Creative acceptance is pending.

## Open and compare

- Preview: http://127.0.0.1:8765/proposals/?direction=stage&light=sequence&setting=reliquary&moment=459.5
- Full camera description: http://127.0.0.1:8765/proposals/camera-notes.html
- Local camera record: [CAMERA_SCORE.md](CAMERA_SCORE.md), with the exact generated score beside it.
- Use **Climax · 6:00–8:09** for the normal-speed passage. With playback paused at 7:39.5, switch **Climax progression** off/on to compare exactly the same camera and time. **Light diffusion** is a separate comparison. The camera hold control is off by default.

## What changed

The sculpture was still too broadly lit in the owner's 3:25 screenshot. Track 1's opt-in setting now uses base exposure 0.65 (previously 0.95), with the key scaled to 0.38 of the Stage light instead of 0.52. Those combined linear factors are approximately one stop lower before tone mapping. This is not a claim that every displayed pixel halves in brightness. Rim/back support is reduced, the cloth stays matte, and the loose floor hem is shaded down.

The requested haze is interpreted here as restrained optical diffusion: a broad, low-threshold bloom around lit surfaces. Existing exponential distance fog stays at a fixed 0.0065 density. The average-energy envelope now affects diffusion and a small amount of wall fill, rather than pumping fog density. No new particle clouds, glow balls or volumetric fog cone were added. This is a bloom approximation, not light scattering through a simulated participating medium.

The cloth now has rest-surface UVs from Blender, retained through the simulation bake. Fabric color, normal and roughness maps provide small surface detail. The source fabric's purple/ochre color is converted to subtle neutral luminance variation in the shader; roughness remains in the matte 0.87–0.99 range. The continuous floor/cove/wall has distance-based UVs and plaster maps, with the old procedural pore grid omitted in this setting. Floor darkening remains separate from the wall. These improve close inspection; they are not a claim of matching the generated photoreal concept.

Six 1024×1024 JPEGs total about 7.8 MB. They are presently the source-resolution trial assets, not a finished delivery compression pass. The cloth GLB is about 836 KiB with 10,057 vertices, UVs, pressure and settle morphs. The base drape is a Blender cloth simulation; its slow new settle morph is an authored deformation, not a second running cloth simulation.

## The climax, explicitly

The previous sequence reached its final light position around 384 seconds, then remained there. Proposal lighting also replaced much of the original phase/event lighting. Faster camera cuts alone were left to carry the late build.

| Recording time | Stage event and purpose |
|---|---|
| 4:46–5:16.65 | Existing key approach toward a fixed lighting obstruction. |
| 5:16.65–5:30 | Existing concealment through the hush. |
| 5:30–6:24 | Existing emergence from the obstruction. |
| 6:06.8–7:39.5 | One upper cloth fold gradually lowers and leans. Its new shape persists through the ending; the base stays grounded. |
| 6:24.03–6:51.5 | First 35% of the new key advance: lower and closer to the sculpture. The beam begins opening so light can reach the receiving surface around the cast shadow. |
| 6:51.5–7:39.5 | Remaining 65% of the advance. The source reaches `[3.2, 3.25, 2.6]`; cone angle grows from 0.59 to 0.95 radians. Source power is partly compensated for the shorter distance. Local wall/cloth fill increases while global exposure stays low. |
| 7:39.5–8:08.5 | Familiar camera holds the changed room. Cloth settlement and source position remain; small live audio response continues. This 29-second hold is still an explicit pacing question for owner playback. |
| 8:08.5–8:48 | The key collapses before the wall fill. The camera holds the lower-hand detail until 8:23.6, then withdraws toward the signature over 24.4 seconds. |
| 8:48–8:55 | Remaining light and diffusion extinguish. The camera stays in the signature frame; no cut is added at the blackout. |

The first local test moved the source but failed visually: the narrow cone was mostly blocked by the relic, and the background was too dark to reveal a shadow edge. The final trial opens the cone and gives the receiver enough local light to reveal the change. Same-camera diagnostic pairs at 459.5 seconds show the altered shadow and cloth. Whether that slow progression feels sufficient for the music has not been established by those stills.

The listening follow-up describes a broad saturation climax at 365–485 seconds. Existing film phase boundaries remain 366.8 and 488.5 seconds. New intermediate stage timing is an editorial trial against those landmarks; no new sample-accurate musical claims are made.

## Camera findings

The generated Stage camera has 26 entries: initial framing, 23 hard cuts, and two continuous moves. The camera is stationary for roughly 93.6% of the authored 539-second envelope. Its longest unchanged hold is 43 seconds, at 210–253 seconds. The repeated HEAD view appears four times, replacing originally different subjects. Unchecking the hold control therefore restores cuts, but does not restore the old camera drift or all the older moves. Every interval and its intended purpose is documented in `CAMERA_SCORE.md` and the linked preview page. This pass does not silently retime the camera to mask the stage comparison.

## Technical and visual checks

- Production build passed; focused tests cover response reset/frame-rate independence, dark endpoints, climax progression/reduced motion/omission, geometry adoption, navigation isolation, physical receiver geometry and late texture disposal after a failed download. Final result: 28 tests across five focused suites passed; served bundle `prototype.DK_KHQlN.js`.
- Targeted lint passed for the three new/modified stage helper modules; this is not a whole-repository lint or full-suite claim. `git diff --check` passed.
- On `prototype.BPj9DejS.js`, diagnostic 1280×720 captures covered 205, 384.03, 411.5, 459.5 (progression on/off), 500, 532.8 and 535 seconds. No failed shader programs. These paused captures set the scene's recording time; they are not uninterrupted playback or fresh audio audition.
- Twelve visible-tab normal-playback samples from about 405.97–417.00 seconds confirmed the actual 411.5 camera cut, advancing source, cloth settlement and distinct analyser envelopes. Pausing at 417.064 seconds cleared the live responses. This establishes routing and timing, not perceptual musical relevance. Raw data: `climax-runtime-qa.json`.
- At 459.5 seconds, UI switches changed diffusion and climax state without changing time, camera or paused state; the full-experience link retained both choices. Camera guide returned HTTP 200 and contained all 28 intervals.
- Teardown disposed all six owned textures exactly once, including when destroy was called again. With post disabled, the single render pass retained the new cloth shape and cast shadow; the screenshot's title/UI transition was not settled, so that image is structural evidence only.
- A missing map now falls back to the matte stage rather than blocking track initialization. Partial texture results are disposed; final bundle fallback was checked separately.

## Sources

Material assets: [ambientCG Fabric040](https://ambientcg.com/view?id=Fabric040) and [ambientCG Plaster001](https://ambientcg.com/view?id=Plaster001), under [CC0](https://docs.ambientcg.com/license/). Source JSON is preserved beside the runtime JPEGs. No claim is made that these materials are photogrammetry scans.

Listening/timing context: the owner's supplied Gemini review and `GEMINI_LISTENING_REVIEW_FOLLOWUP.md` / `CODEX_SEVEN_TRACK_SYNTHESIS.md` in the Sonoite Listening Review directory; source landmark comments in `src/js/prototype/films/sonoite.js`. The invalid earlier minute notation and the disputed 195-second “vacuum” are not used to create new events.

Remaining artistic limits: the grey relic's own petal geometry/material was not redesigned; the background still needs judgment at full viewport size; the repeated camera subjects and long holds remain visible weaknesses; the climax is a reviewable trial, not owner-approved. No complete uninterrupted revised-film viewing is claimed.

Final serving check: `DK_KHQlN` differs from captured `BPj9DejS` only by the missing-map fallback. Normal ready state loaded the detail maps, camera hold was off, and there were no failed shader programs. Intercepting one map with a diagnostic 404 still reached ready with the matte cloth and no detail maps. Preview and camera guide returned HTTP 200; Python PID 8175 was listening on 127.0.0.1:8765. Raw final checks: `climax-final-qa.json`. No application-wide test or uninterrupted-film acceptance claim.
