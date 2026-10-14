# Track 4 v5 — the organic light batch — Grok + Kimi consult synthesis — 2026-08-15

**Owner verdict driving this:** "less PlayStation 1, more natural organic hazy."
**Consultants:** Grok 4.6 (DP-engineer) + Kimi K3 (rendering engineer, verified against
the installed three@0.160 build). Base: uncommitted v4c working tree.
**Kimi correctness catches (bind the design):** (A) PCFSoftShadowMap ignores
shadow.radius — v4c's 6→12 was a no-op; softness must come from source size + cookie.
(B) On near-black porcelain the razor line is the SPECULAR lobe edge against a
void-black env, not the diffuse terminator — fix requires N·L wrap + a lit dark-side
env + grade discipline together. (C) Grade shader applies lift BEFORE contrast; with
T4's pivots any lift < ~0.011 is destroyed — reorder required.
All items deterministic, one light species (everything reads as the tube), no new
heavy deps, ≈0.1ms/frame total added; protect SODIUM_* timing + camera + pockets.

## Ranked implementation

1. **Diffuse wrap (Kimi #1):** onBeforeCompile patch on hero + presence + holder +
   floor materials (relic-mutation.js idiom, customProgramCacheKey bump):
   replace `float dotNL = saturate( dot( geometryNormal, directLight.direction ) );`
   with `float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + uSodiumWrap ) / ( 1.0 + uSodiumWrap ) );`
   uniform uSodiumWrap 0.35 (tunable 0.25–0.45). Shadow mask unaffected (applied to
   directLight.color upstream). horas-mortas materials only.
2. **Amber single-source PMREM (Kimi #2):** for horas-mortas-cinema, bake the PMREM
   from a tiny procedural scene — one 1.5×0.06 emissive strip (SODIUM_COLOR_RUN,
   emissiveIntensity ~3.5) at y≈5.6, rest near-black — instead of RoomEnvironment.
   environmentIntensity 0.02→0.05; hero envMapIntensity 0.04→0.14. Existing blackout
   null-gate and sodiumLevel multiplier keep working. Bake hot, attenuate via
   intensity (quantization stays above the perceptual floor).
3. **Linear-area source + IES cookie (Kimi #3 / Grok #6):** outer spots angle 0.46,
   intensity weight 0.55× (conserve total via SPOT_INTENSITY_SCALE rebalance),
   targets offset ±0.55 along tube x. Center spot gets a 256² deterministic cookie
   (canvas idiom): elongated-cosine `a = exp(-(x*x)/0.55 - (y*y)/0.18); pow(a,1.35)`
   — circular cone becomes a linear fixture throw. Pool decal demoted:
   POOL_OPACITY_SCALE → 0.30 (the light draws the pool now).
4. **Grade order + warm toe (Kimi #4 / Grok grade toe):** reorder ChamberGradeShader
   to contrast-THEN-lift (lift survives); per-phase lift becomes warm dark-amber
   floor [0.0040, 0.0024, 0.0010] for DEAD/WAKING/FADE/AFTER; TERMINAL stays
   [0,0,0] (authored true black). Gated: only variants authoring gradePhases.lift
   change behavior; T1/T5 identical (isolation tests extended).
5. **Haze with a view-crossing term (Kimi #5 / Grok #5):** keep the wedge fan near
   the source but (a) azimuth weights become smooth
   `pow(alignment, 1.6) * 0.78 + 0.22` (kills the top-2 pop), (b) add ONE open
   CylinderGeometry haze volume around the beam (24×8 segs, additive ShaderMaterial):
   `radial = exp(-pow(len(local.xz)/uRadius*2.2, 2.0)); axial = mix(1.0, 0.25, y/uLen);
   crossing = pow(1.0 - abs(dot(V, L)), 1.5); alpha = radial*axial*crossing*uLevel*0.12;`
   — haze brightens looking ACROSS the beam, thins along it (the #1 organic cue).
   depthWrite false, depthTest true. (c) second haze sprite at ~[0.96, 2.2, -0.1]
   scale [3.2, 4.0] so air sits in FRONT of the egg terminator (Grok). No raymarch.
6. **Texture + grounding (Kimi #6 / Grok grain):** (a) deterministic 128² value-noise
   normalMap on the hero, normalScale 0.12 (terminator gets organic tooth);
   (b) shadow softness: keep PCFSoftShadowMap, softness now carried by cookie +
   source spread (remove the inert radius-12 expectation from comments/tests);
   (c) contact grounding: one multiply-blended dark ellipse (1.2× relic footprint,
   alpha 0.35→0) at y=0.021 under the relic — the pool stops floating;
   (d) terminator-band grain boost in ChamberGrainShader:
   `term = smoothstep(0.02, 0.055, luma) * (1.0 - smoothstep(0.10, 0.16, luma));
   grainWeight += term * 1.6;` — dither exactly where banding lives, blacks stay clean.

## Acceptance

Build green; all four suites green (extend isolation for grade-order + lift gating;
update any cookie/weight constants asserted). Blackout probes still <2% + ember.
Before/after at the 0:34 framing: terminator reads as a broad organic band, floor
pool reads as thrown light, dark side of the egg holds a warm directional gradient.
T1/T5 spot-probes unchanged. Commit as Prompt #226.
