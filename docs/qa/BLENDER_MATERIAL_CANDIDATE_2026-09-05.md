# Blender material candidate — 5 September 2026

## Subsequent owner acceptance and film comparison

The owner said “looks good” to the standalone material study. Codex retained that direction and added an opt-in film integration:

https://sonoite.local/?track=nao-querer-nada&relic=materials&reaction=surface-two&autonext=0&seed=7

Bundle: `js/prototype.KpVJgFsT.js`. Default URLs still load their previous assets; fresh canonical Track 5 was checked. `relic=materials` selects only the candidate GLB and preserves its slots. The cinema shader preserves its authored base colours/finishes and uses explicit material identities for egg/petal masks. Existing tar and erasure hooks remain. Candidate meshes receive shadows. The accepted 0.36 surface dip is restricted to petals; the newly metallic caliper and smoother egg do not receive that gesture. Existing continuous material behavior remains. The `reaction=surface-two` arm retains the fixed camera/rig during 225–255 s and its existing cue timing.

Fresh build passed. Five targeted suites / 52 tests passed with coverage collection disabled for this focused run. The initial focused run passed its 51 assertions but exited on repository-wide coverage thresholds, which do not represent coverage of a selected subset. No full-suite claim is made. Diff whitespace check passed.

Browser captures: approximately 100, 203, 245.65, 252.36 and 478 s. All four roles, colours and metalness values survived the film's physical-material upgrade. At 478 s, every region shared mutation amount approximately 0.722 and the same world-space tar height. The two sampled cues reduced petal roughness to approximately 0.42 without applying that cue to other regions. Candidate flags were dropped by the navigation URL builder. No browser shader errors/warnings were observed. This is seek-based passage verification, not a full uninterrupted playback or new musical acceptance.

Evidence: `film-materials-*.json/png` in the asset audit directory. Finger/petal boundary refinement remains outstanding. Film integration is ready for comparison, not adopted as the canonical asset. The original standalone-study record below describes the preceding pass.

Owner requested a first attempt following the sculpture/material audit. This is a separate, reviewable material study; no canonical model selection, album code, lighting score, audio response or served production bundle was changed in this pass.

Open: https://sonoite.local/wp-content/themes/sonoite-theme/public/assets/models/material-study/index.html

## Candidate

- Source preserved: `tools/blender/reliquary_chamber.blend`.
- Editable copy: `tools/blender/reliquary_material_candidate.blend`.
- Reproducible authoring script: `tools/blender/build_material_candidate.py` (run using Blender's background mode against the original source).
- Candidate GLB: `public/assets/models/material-study/material-regions-v1.glb`, approximately 2.86 MB uncompressed.
- Four material slots with exported role metadata: glove, petals, egg, metal. Dielectric glove/petals/egg; metalness 0.92 on the caliper selection.
- Smooth faces with a 48-degree sharp-edge threshold; smart-projected UVs. Constant exported PBR values, no image textures or Blender-only procedural nodes in this version.
- Same sculpture positions and triangle count as the original. No retopology, petal reshaping, wrist closure or geometry cleanup was attempted.

The front-view contours are baked into editable face assignments. The egg uses a local-space ellipsoid fit constrained by surface normals, after a front-only oval selection visibly spilled onto the palm. Material boundaries at the finger/petal joins, underside of the flower and caliper sides remain provisional, particularly in side/back views. This is a direction study, not an approved final asset.

## Comparison

The left defaults to the same smoothed geometry with the original pale material. The checkbox restores original flat normals on the left. Both views use synchronized camera controls, matching neutral/cold/sodium test rigs, the same environment reflection strength and a physical floor with shadow reception. These rigs are not the authored film lights. The original pale material retains its own sheen, deliberately included in the material comparison.

The page is standalone and locally imports the repository's installed Three.js modules. It is intended for LocalWP review, not as a deployable production page. It does not load album audio or the experience runtime.

## Verification

- GLB inspection: all three exports have identical unique vertex positions and 64,987 triangles. Candidate contains four primitives, four named materials, four role tags and UV attributes on all primitives.
- Browser inspection: all four roles and PBR values survived GLTFLoader. Each region casts and receives shadows in the study.
- Checked front, three-quarter, side and back under neutral light; three-quarter under cold and sodium light. Exported six paired captures.
- Synchronized camera changes verified. After warming the optional flat model, 20 switches kept scene child counts and renderer geometry counts stable.
- Viewer JavaScript syntax check passed. No browser console errors or warnings during the checks.
- No production build or album regression tests run: this pass adds only the isolated candidate, study viewer, authoring script and documentation.

Evidence: `~/Documents/Sonoite Asset Audit 2026-09-05/material-candidate-browser-check.json` and `material-{source,candidate}-{light}-{angle}.jpg`.

## Before adoption (original standalone-study handoff)

Refine the visible region boundaries and decide whether the material direction is right. Then wire explicit asset selection and preserve the authored regions through the album's material decorator. The canonical decorator currently replaces material appearance, so copying this GLB into its place alone is not a complete integration. Keep the accepted Track 5 cue times and surface strength when doing that work. Fable remains QA/second opinion only.
