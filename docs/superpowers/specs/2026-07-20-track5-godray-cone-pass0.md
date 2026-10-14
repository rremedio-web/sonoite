# SPEC — Pass P0: God-ray cone (volumetric key), "the lit frame"

Date: 2026-07-20. Branch context: experiment/path-b-reliquary-proof.
Status: ready for executor. Depends on: Gate 1 trim values (PASS1_VERDICT.md), the Gate 1 relic + material-authority decision (one decision, not two), and the reduced-motion flag (Pass 0.5, docs/superpowers/specs/2026-07-20-shell-corrections-pass-0-5.md).
Origin: Gate 1 external session review (docs/qa/GATE1_SESSION_REVIEW_PROMPT_2026-07-19.md) + follow-up UX report; bound by the owner's three constraints (Gate-1 values as inputs, shipped frame-fill measurement, two darkness families respected).

## 1. Objective
Give the chamber a visible light medium: a soft volumetric cone falling from the key light that fills the void, carries the gobo's structure into the air, and pools on the floor — raising MEASURED frame fill from the current ~5.6-10% to the doctrine's 30-40% non-black, with no hard edges, no banding, no audio reactivity. Ships with a fillmeter so the four-month-old 40% Priority-0 claim (docs/qa/UNIFIED_CREATIVE_DIRECTION_2026-03-11.md:375-381) is measured in a running frame for the first time.

## 2. Inputs (constraint 1: no constants from today)
- Gate 1's trimmed chamberConfig values (lighting.*, post.*, living amplitudes) are read at execution time from the post-sitting config / PASS1_VERDICT.md. This spec defines zero absolute lighting values. If a needed value is absent, the executor stops and reports — inventing constants is a spec violation.
- Relic winner: cone aims at the hero bounding-volume center; framing verified on the kept relic (Meshy and Blender differ in volume — verify, don't assume).
- Variant darknessMode resolves the family profile (constraint 3).

## 3. Files
- CREATE src/js/prototype/godray-cone.js — factory, cone mesh, ShaderMaterial.
- CREATE src/js/prototype/fill-meter.js — ?fillmeter=1 measurement + readout (factory).
- MODIFY src/js/prototype/experience.js — instantiate/wire/update/dispose; chamberConfig.cone for track5-cinema + family profiles; pool term in the floor shader (`FloorMemoryShader`, defined at **experience.js:2168** — the earlier draft cited ~3646-3672, which is wrong; verify anchors before editing, they drift); kill switch ?cone=0.
- MODIFY src/js/prototype/shell.js — fillmeter readout element; two added tweak sliders (cone intensity, cone density — copy-to-JSON picks them up free).
- DO NOT TOUCH: living-chamber.js, phase curves, camera score, hero material/loader path, post-chain order, audio path.

## 4. Interfaces
```
createGodrayCone({ keyLight, floorY, config, seed }) ->
    { object3d, update(elapsed, dt, { phase }), dispose() }
```
- update signature mirrors LivingChamber.update — transport elapsed, wall dt, authored macro phase. No audio arguments, ever.
- seed = the experience's livingSeed (so ?seed= replays the cone's weather too).

chamberConfig.cone shape (ratios, not absolutes):
```
enabled, intensityRatioToKeyBase (e.g. 0.35), density, floorPool,
driftPeriod: 97,                 // incommensurate with 41/67/103/149
phaseAmplitude: { ERASURE: 0 },
families: {
  veiled:   { spread: 1.0,  softness: 1.0, density: 1.0, hazeCouple: 1.0 },
  sacristy: { spread: 0.55, softness: 0.6, density: 0.4, hazeCouple: 0.2 }
}
```
ShaderMaterial uniforms (minimum): uTime (transport), uIntensity, uDensity, uSeedOffsets, uGobo (sampler2D — the living chamber's existing gobo CanvasTexture, read-only), uColorA/uColorB (key color -> fog color), uEdgeSoftness, uAxialFade, uPhaseAmp.
Fill meter: window.SonoitePrototype.fillMeter.sample() -> { t, lum8, lum25 }, plus a throttled console table (state dumps beat screenshots) and an on-screen readout when ?fillmeter=1.

### Behavior (executor picks implementation; these terms are binding)
- Open-ended cone/frustum aligned to the key axis (light position -> target), widening past the relic to the floor. depthTest: true (the relic must occlude the cone — it blocks the light), depthWrite: false, **AdditiveBlending**, renderOrder below the bokeh sprites (24). (Corrected 2026-07-20b: an intermediate draft specified alpha blending on the strength of a drei attribution that does not exist — see §7.)
- Edge fade via view-angle fresnel — the silhouette never reads hard, on any camera beat (verify at the 12 score positions, not one). Axial fade bright near source, dissolved at floor. Radial soft core.
- Density drift: low-frequency value noise, <=2 octaves, animated at driftPeriod, offsets from the seeded stream. Breathing budget; authored placement.
- Gobo coupling: sample uGobo across the cone's cross-section so the key cookie reads as ray structure in the air — reuses Prompt #141's texture.
- Color: key color -> scene fog color by axial distance. Intensity = keyBase x intensityRatioToKeyBase x air-phase curve x phaseAmplitude with the living-chamber 3s ease; ERASURE -> 0.
- Floor pool: extend FloorMemoryShader with uConePool (center/radius/intensity) brightening the existing radial stops where the cone lands. The floor shader stays the floor's single authority — no second floor plane.
- Haze agreement: cone density follows the same phase air curve driving frontHaze opacity, scaled by families.*.hazeCouple, so cone and haze never contradict.

## 5. Constraints
- Doctrine: placement/intensity authored (70%); density drift + pool shimmer breathing (25%, incommensurate, seeded); ZERO audio inputs; no writes to camera/relic/phases/palette; composes only at final-assignment sites.
- Darkness families (constraint 3): profile resolved from variant darknessMode; unknown/absent -> veiled at 0.5 presence, never hard-edged. The sacristy profile ships UNVERIFIED-by-eye — hard black must stay hard (tight spread, minimal haze couple) — but its tuning is explicitly deferred to the first sacristy-pilot gate. This pass must not make a sacristy track worse; conservative is the requirement, beauty is not.
- Reduced motion: the Pass 0.5 flag also freezes cone drift (static cone at ~50% mean density permitted; drifting is not).
- Perf: playing cap 30fps holds on balanced tier; safe tier drops to 1 noise octave; the MSAA/bloom/grain/dither chain is untouched (cone is scene geometry, flows through RenderPass). One [Prototype] info line max.
- Conventions: 4-space indent, single quotes, semicolons, kebab-case module, factory not singleton; dispose() removes the mesh and disposes geometry/material but NOT the shared gobo texture (owned by living chamber); ?cone=0 kill switch.

## 6. Verification (the falsifiable gate — constraint 2)
1. Gates (corrected 2026-07-20 — the repo's gates are partly broken by design; see CLAUDE.md "Known-broken gates"): `npm run build` exit 0 is the hard gate. `npx eslint <changed files>` must introduce **no new errors versus the pre-change baseline** — `experience.js` carries ~100 pre-existing errors and can never lint "clean"; new modules must be at zero. **Do NOT gate on `npm test`** — Jest hardwires `collectCoverage: true` against an 80% global threshold (plus per-file 95%/90%) with ~3% real coverage, so it always fails and is not a regression signal.
2. Fill measurement: ?fillmeter=1&seed=42, record lum8/lum25 (same thresholds as Pass 1b methodology, for comparability) at transport t = 30, 60, 120, 200, 300, 400, 470, 540 — ?cone=0 vs default. TARGET: lum8 non-black >= 30% at every sampled transport; ERASURE (534-564) returns to pre-pass blacks. Report as a table + same-transport frames, paste-ready for the verdict doc.
3. ?cone=0 frame at seed 42, t=120 is pixel-identical to pre-pass; ?dither=0 unaffected.
4. scene.children count identical before/after a journey re-boot (dispose check); livingChamber.outputs shape unchanged.
5. ?probe=B uncompressed — hero uniforms untouched, relic probe stays valid.
6. Sacristy dry-run via local config override: screenshots only, confirm no haze bloom; tuning deferred.
7. Perf: engine-side frame timing (not rAF proxy — time the scheduler's own frame behind a debug flag), cone on vs off, balanced tier.

## 7. Implementation notes (external research, 2026-07-20)

The fake-cone approach in this spec is externally validated; the recipe below is the production-standard version (John Chapman, "Good Enough Volumetrics for Spotlights", 2013; drei SpotLightMaterial as an MIT reference implementation with vanilla-portable GLSL: github.com/pmndrs/drei/blob/master/src/materials/SpotLightMaterial.tsx).

> **Sourcing warning (added 2026-07-20b).** One claim in this section was fabricated — a "drei switched deliberately to alpha blending" rationale that does not exist in that repository's history. It was caught only because a verifier fetched the source. The external claims below are **unverified from this repo**: Chapman 2013, the fresnel `abs()` requirement and dark-tip blind spot, three-good-godrays' maintenance status, the threex.volumetricspotlight assessment, and the Codrops "The Sleepers" precedent. Treat each as a lead to check, not as settled fact — and if an executor cannot verify one, that is a reason to stop and report, not to implement on faith.

- Geometry: open cone (no cap), high height-segment count for smooth normal interpolation; draw both faces (no culling).
- Edge fade: fresnel via pow(abs(dot(viewSpaceNormal, viewVector)), n) — abs() is required since back faces contribute. Known blind spot: looking straight up the cone toward the tip, the center goes dark; patch with a small glow sprite at the light position if that camera angle is ever authored.
- Blending: **AdditiveBlending** — corrected 2026-07-20b. The previous draft said "alpha, not additive (drei switched deliberately; additive double-blooms the light origin)". **That attribution is false and was removed:** drei's `SpotLightMaterial` has never set `blending` at all — verified at HEAD and at the introducing commit across every revision of the file; it sets only `transparent: true` and `depthWrite: false`, inheriting three's default. No deliberate switch, and no documented bloom rationale, exists. Additive is the right call here on its own merits: the cone draws in front of the relic across the camera cues, and alpha blending would *lerp toward* the cone colour — dimming the relic's key highlights through the haze — whereas additive can only ever add light, which is what a light shaft physically does. Three's `AdditiveBlending` is `srcAlpha`/`ONE`, so the alpha channel still authors density; nothing is lost by staying additive. It is also consistent with the rest of the transparency stack (bokeh, haze, non-sacristy dust are all additive).
- Bloom guard (corrected): the earlier "keep cone peak alpha below the bloom threshold (0.82)" instruction was dimensionally wrong twice — alpha is a blend weight, not luminance, and the 0.82 threshold is evaluated in **linear, pre-exposure** space (the composer's render target disables tone mapping; exposure 0.8 and AgX are applied later at OutputPass). The correct guard is on **radiance**: keep the cone's linear contribution such that `luma(coneColor × density)` stays under ~0.82 except where a bloom bloom is intended, and confirm with the fillmeter rather than by reasoning about alpha.
- Soft intersection (the relic/floor contact): port the drei depth-fade — intensity *= smoothstep(0, 1, vViewZ - readDepth(depth, uv)). **The composer's depth is NOT available as a texture**: its render target is built with `depthBuffer: true` but no `DepthTexture`, and carries MSAA samples (experience.js render-target options). A depth pre-pass is therefore required, and its cost is currently **unbudgeted in §5** — the executor must measure it before committing, or ship the cone without soft intersection and accept the contact line for this pass.
- Near-plane fade: same depth-fade math against cameraNear so the cone never pops when a camera beat crosses it.
- scene.fog does not apply to raw ShaderMaterial automatically; moot in our void (fog is FogExp2 on standard materials only) — flag if the chain changes.
- Alternatives evaluated and rejected for this pass: postprocessing GodRaysEffect (rays vanish when the source mesh leaves frame — real fragility if the camera loosens from fixed-ish; also inherits the MSAA+depth-texture resolve requirement); threex.volumetricspotlight (abandoned, depth-fade never worked). FALLBACK if the fake cone reads too solid in-engine: three-good-godrays (raymarched shadow-map sampling, works with the light off-screen, actively maintained against current three.js; costs a composer pass + shadow-map dependency; set gammaCorrection/encodeOutput carefully — our grade/dither chain must be the only final encoder).
- Precedent for the philosophy: Codrops "The Sleepers" case study (July 2026) — strongest visual impact with the simplest possible solutions; noise via tileable texture, not per-pixel procedural noise, when cost matters.
