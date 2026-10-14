# Parked Ideas — 2026-07-04 (for Gate 3 / Pass 4 parts-shop decision)

Triage of brainstorm ideas against the doctrine (70/25/5; camera/relic/phases/palette never
audio-driven). Accepted items are already slotted in the master plan; these are the parked
candidates + backlog, so they survive until their decision point.

## Accepted (slotted, not parked)

- **Onset-to-eventBeat converter** → Pass 3 plan doc. Script reads `public/assets/journeys/analysis/<slug>/onsets.json` + `beats.json` (currently consumed by nothing) and emits candidate timestamps, so Pass 3's re-authored beats land on actual musical hits.
- **ERASURE subtracts the UI** → WP-4.3: include shell chrome (progress bar → placard → cursor) in the reverse-teardown config list; shell already has `setSuppression()` / opacity control. Last frame: grain on black + lone replay control.
- **Darkness nutrition label** → launch ops, Bandcamp page copy (source numbers from `PASS1B_EVIDENCE_2026-07-04.md`).

## Pass 4 candidates (Gate 3 decides, alongside the tabletop-branch parts)

1. **Delayed room reaction** — ring buffer (~2s) on the accent/band signal; the room responds to what the music *just did* (dust resettle, haze lean) instead of instantaneously. Reads as mass/acoustics, not visualization. Stays within the 5% punctuation budget. Config-flagged experiment.
2. **Air viscosity** — sustained loudness thickens the air: falling dust's drag rises with energy, drops in silence. Felt over ~30s, never "seen". Lives in the 25% breathing budget; dust motion params already exist in variant config.
3. **Shadow flinch** — relic stays bolted; key light gets cm-scale position drift under sustained bass so the relic's shadow breathes on the catcher plane. ⚠ Perf caveat: shadow maps are on manual update cadence (`updateShadowCadence`); moving the key light requires shadow refreshes — measure before adopting.

## Gate 2 discussion item

- **Camera settles with the listener** — drift amplitude eases down as pointer-idle time grows (pointer tracking already exists for chrome dimming). Doctrine-pure (reacts to the listener, not audio) but alters the image → owner call at the camera gate.

## Inspo-doc gap findings (2026-07-04 sweep of REFERENCE_SWEEP / UNIFIED / MATRIX / RESEARCH / RESET / HYBRID / PARITY vs current chamber)

Promises in our own docs that no planned pass currently keeps. Route each to the named gate.

1. **317s "forensic overexposure" look-target is unkept — and inverted.** `blender-reliquary-stills` PARITY specs a BRIGHT beat at 317s; the plan's nearby event is a vignette crush (darkening). Proposal: one single Ikeda-style bleach-to-white strike at 317s (BLEACH event type exists; post-1b un-clamped chain makes it viable). Same logic covers the 198s "bright fracture" target. → **Pass 3 plan doc.**
2. **Silhouette needs LIT FOG to read against.** UNIFIED's Sleep Token recipe: figure = dark shape against lit fog; god rays specced both as standing element and as the 5:00 sweep event; the promised dust event needs a visible beam to cross. One volumetric cone from the back light addresses frame-fill + silhouette + dust-event dependency together. → **top Pass 4 candidate (upgrades the existing frame-fill entry).**
3. **Light-collapse event (parked Direction 2).** Key light dies for ~10s, only rim fragments survive — an event on the lighting rig channel (none of the 9 beats touch lights); operationalizes WITHHOLD; matches MATRIX's named-but-missing `light_snap` / `temperature_flip` channels. → **Pass 3 plan doc.**
4. **The relic must have an after-state.** HYBRID stages 4–5: transformation + "not the same thing by the end." `uSonoiteDamage/uErasure/uAfterimage` uniforms exist but are barely driven; teardown dismantles the room, never the object. Proposal: per-phase damage accumulation + ERASURE endpoint = relic gone, brief pure light-field (Turrell-as-destination), then grain on black. → **Pass 4 plan doc (extends WP-4.3).**
5. **RELEASE reactivity gap.** MATRIX flattened RELEASE's authored curves expecting audio to carry the phase (151s); no perceivable reactive channel exists and no pass adds one. MATRIX's own "Fixes Needed": vignette breathing ±0.04, bloom ±0.02, additive link ownership (Rule 6), roomPressureBeats extended to full 564s. → **raise at Gate 1** (it's a Pass-scoping question: fold into Pass 3 or a Pass 3.5).
6. Smaller unkept promises worth a line each: UI recedes harder on T5 (RESET "gallery chrome" — pairs with Lane B shell work); Turrell dark-adaptation opening (key already at 1.26 by 32s); only 2 of 4 promised crush transitions are planned and their timestamps don't match the doc's state boundaries (1:36/3:36/4:41/7:12) — reconcile in Pass 3 plan; camera "recedes" is in the docs but the score only approaches (fold into Pass 2 accordion authoring).

## Post-ship backlog (not in the 12-week scope)

- **Room remembers visits** — localStorage visit counter drives tiny cumulative variant deltas (plate fade, fingerprints, one light gone by visit 10). Never announced.
- **Vinyl erodes the relic** — `?edition=vinyl` variant whose damage/erasure uniforms scale with total physical copies sold. Blocked on a sales-count data source (Bandcamp API won't provide it cleanly; would need a manually updated count or tiny endpoint).
