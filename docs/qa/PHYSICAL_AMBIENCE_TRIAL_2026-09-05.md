# Track 5 physical ambience trial

Owner requested trying the environment review on a new branch. Active branch: `experiment/physical-ambience`. Previous uncommitted work was preserved locally as patch and file copies. No commit, merge or push. This branch currently includes that inherited uncommitted work as well as the trial.

Trial: https://sonoite.local/?track=nao-querer-nada&scene=physical&autonext=0&seed=7

Control: same URL without `scene=physical`. Current built/loaded bundle: `prototype.Wsn-whC0.js`.

## Implementation

- Opt-in, canonical Track 5 only. Other variants and other tracks do not activate the physical scene. Navigation drops the scene flag.
- Replaces the shader-painted backdrop, separate floor glow and shadow catcher with a continuous floor, four-unit curved return and gently uneven wall. One indexed mesh, 8,000 triangles, with inward/upward normals. Its base is placed at the loaded original sculpture's lower bound minus 0.01.
- Dark matte physical material, lower floor albedo, subdued dielectric reflection and restrained procedural roughness. No image textures or environment reflection contribution on the chamber surface. The broad pale floor band in the initial trial was mostly grazing reflection; reducing specular intensity to 0.16 controls it.
- One additional neutral wall wash at `[-8,5,-3]`, aimed behind the relic at `[-3,3,-9]`. It rises over 36–100 s, holds, then fades over 488–534 s. Transport-time only, no audio onsets. Existing hero lights remain; the wall light uses ordinary scene lighting, not per-object light linking.
- Original generated Meshy asset and existing grey Track 5 material/shader retained. Self-shadow reception enabled. Existing camera, phase timings, tar, ending and accepted opt-in surface-response study unchanged.
- Bokeh, dust, gaze/counter-gaze, aisle and plume fields, haze sprites, painted shell/floor and patterned spotlight mask are not constructed for this trial. Existing scene fog/post-processing remain. It is a combined environment comparison, not an isolated material A/B.
- Construction and atmosphere update use the physical scene path directly; no per-frame visibility suppression. Mesh/material/light resources disposed on teardown.

## Verification

- Build passed, with existing bundle-size warnings. 51 tests across 6 focused suites passed, coverage disabled. No full-suite claim.
- Tests cover explicit activation, cross-track/variant isolation, dropped navigation flag, absent legacy layers, deterministic wall-light timing, continuous indexed floor/wall join and valid inward normals.
- Fresh browser: final trial at 100, 213, 250, 310, 478 and 548 s. Current default paired captures at 100/213/250/310/478. Diagnostic seeks; small timing/ambient/grain differences remain. Same original GLB loaded; trial has 2 scene materials and 5 lights versus the default's 25 scene materials and 4 lights at 213 s. These counts are not a GPU benchmark.
- 20-second normal transport passage from 203–223 s: playback advanced normally, scene child count stayed at 9, wall wash remained steady. This was not a music audition or full playback.
- Browser teardown probe observed one dispose event each for physical geometry/material and one wall-light shadow disposal; both trial references cleared.
- Sampled console query returned no errors/warnings. Fresh Track 1 still uses the approved quiet scene; Track 4 retains its sodium controller.

## Review boundaries

This is the first Track 5 environment trial, not album-wide completion or default adoption. The room is deliberately subdued; owner judgement is still needed on whether it supplies enough depth. The wide camera remains distant, the 310 s head remains very pale, and the existing near-black tail remains. No additional sculpting, Track 1 wide-floor repair, Track 4 enclosure/fixture rebuild, transport changes or seven-track authoring was included.

Owner comparison: `~/Documents/Sonoite Environment Trial/comparison.html`. Final paired files end `-final.json`/`-final.png`; `physical-*-v1` and `wallwash-*` are development experiments. `trial-only-experience.patch` separates the integration change from the inherited uncommitted baseline; new module/test files are additional.

Fable remains read-only QA/second opinion. Review the trial URL and record the bundle; do not interpret this note as implementation delegation or owner acceptance.
