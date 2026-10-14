# Track 5 Chamber — Perceivability Rebuild (Design)

**Date:** 2026-06-10
**Branch:** `experiment/path-b-reliquary-proof`
**Status:** Approved direction (Approach A of three considered)
**Supersedes for direction:** the uncommitted tabletop-presentation experiment in the working tree

---

## 1. Problem statement

The project has gone through three iterations:

1. **Rich-sync journeys** (Phase 4.2 era) — conceptually rich music↔visual synchronization that never technically worked.
2. **Journey tracks** — one or two tracks (notably Track 1) looked passable but read as a screensaver.
3. **Path B reliquary chamber** (`src/js/prototype/experience.js`, `?prototype=1`) — aesthetically the strongest, but experienced as **lifeless across all four dimensions**: no perceivable music-driven change, no camera life, no events, too few elements.

The current working tree is a fourth thing: a Blender-inspired **tabletop presentation fork** (uncommitted, +392 lines on `experience.js`: `TRACK5_TABLETOP_TIMELINE`, `isTabletopPresentation()`, window-like key light) layered onto the chamber. It is a presentation fork, not a resolution, and the owner judges the combined state as "doesn't look great."

**Key reframe (from `docs/qa/FULL_THEME_AUDIT_2026-06-06.md`):** the chamber's interaction *machinery* exists — 564 s camera score (12–14 beats), 14 room-pressure beats, 12 musical anchors, 8 event beats, per-phase grade infrastructure. The failure is **perceptual, not architectural**: the channels that would make music's influence visible are mistuned, static, or clipped. By the project's own doctrine — *"if the viewer can't tell what changed, the change didn't happen"* — the chamber currently has no perceivable life, regardless of what the code computes.

Two confounders to control for:

- `dist/` is stale (May 23 build) — what was viewed in browser may not reflect current code. Every judgement requires a fresh `npm run build`.
- Same-filename contradictions: the OLD void runtime still renders for default visitors; all work here targets the Path B prototype route only.

## 2. Goal & success criterion

The committed reliquary chamber (`#125`, `6ddd316`), rebuilt so that a first-time viewer can **tell** that:

1. the music is shaping the room (light, color, temperature, atmosphere),
2. the camera is alive,
3. discrete events happen at musical moments,
4. the space has enough elements to feel inhabited, not empty.

**The test for every change:** the owner watches it live and says whether the change is perceivable. Not "the uniform updates" — "I can see it."

## 3. Approach (chosen from three)

- **A (chosen): Revert + four ordered perception passes.** Park the tabletop fork, baseline the committed chamber, then rebuild perceivability lane by lane, owner-gated between lanes.
- B (rejected): fix the hybrid in place — faster to richness but tunes an unconsidered base; change attribution becomes impossible.
- C (rejected as a lane, kept as input): Blender-led look-dev first — defers the interactivity problem; instead the Blender tabletop renders (`tools/blender/renders/`) serve as look targets for Pass 1, and the tabletop lighting idea becomes a Pass 4 candidate.

## 4. Design

### Step 0 — Preserve & baseline (nothing is lost)

- Commit the tabletop experiment (the `experience.js` diff + `tools/blender/*tabletop*` files + renders) to its own branch: `experiment/track5-tabletop-presentation`.
- Working branch (`experiment/path-b-reliquary-proof`) returns to clean `#125` chamber state for `experience.js`. Audit docs and non-fork assets in the working tree are committed to the working branch.
- `npm run build` (dist is stale), then capture a real baseline: live `?prototype=1`, screenshots at key timestamps saved to disk (`filePath`, never inline), plus `evaluate_script` state dumps. Every later pass gets a before/after against this baseline.

### Doctrine governing all passes (from `MUSIC_INTERACTION_MATRIX.md`)

**70% authored macro arc / 25% autonomous breathing / 5% audio punctuation.** No audio signal owns more than 30% of any parameter's range. Camera, relic position/rotation, phase transitions, and palette **never** react to audio directly. Reactivity must operate at multiple temporal scales (continuous mood / beat events / phrase arcs) — single-scale linear reactivity is the screensaver trap that killed iteration 2. Pass 1 is therefore **authorship-first**: the phases perform; audio is visible texture on top.

### Pass 1 — Authored per-phase arc + visible audio texture

Highest impact; locations from the 2026-06-06 audit (line numbers approximate, re-verify at edit time). March-2026 items marked ⚠ may have been partly fixed since — verify against current code before working them.

| Fix | Current state | Target |
|---|---|---|
| Per-phase grade | Written once at startup (`experience.js:~3423-3428`), never updated | Driven in the update loop from the phase timeline; each chapter earns a distinct color memory. Implementation vehicle: **LUT-style per-phase grading** (research: "biggest visual quality jump for least effort"), interpolated across phase boundaries; T5 phase curves already authored in `MUSIC_INTERACTION_MATRIX.md` |
| Backlight-led silhouette | `backBase 0.38` ≪ `keyBase 1.64` — fill, not lead | Raise back/key ratio so the relic's edge leads; tint backlight to the track accent (#32395e cold blue for T5), not generic white |
| HDR clipped before tone mapping | Grade/grain/vignette/plate `clamp(…,0,1)` in linear HDR ahead of `OutputPass` (`:~1801,1895,2013`) | Remove pre-AgX clamps so the filmic shoulder rolls off rim/clearcoat highlights |
| Grain dead in blacks | `smoothstep(0.045,0.28,luminance)` gates grain to zero (`:~1798`) | Grain floor in deep blacks; widen authored grain range (~0.02–0.12) so the "finish" string reads per phase |
| Plate always-on | Strength 0.88 from ~10 s (`:~5508-5519`) | Gated to late-track residue (ERASURE-era payoff), rare by doctrine |
| ⚠ Frame fill / fog | March diagnosis: frame ~15% full (refs: 60–70%); fog opacity collapses multiplicatively | Verify current state; if still thin, fix fog compositing (additive-then-clamp) toward ~30–40% frame occupancy |

### Pass 2 — Camera life (vocabulary from `UNIFIED_CREATIVE_DIRECTION_2026-03-11.md`)

- **Camera accordion:** push-in / pull-back cycles; never more than ~30 s at the same camera distance.
- **Signature position refrain:** define one "home" shot and return to it *exactly* ~4 times (≈2:30 / 5:30 / 6:30 / 8:30) — each return shows the evolved room state. (Current near-returns at 0/135/337/510 s are never identical, so no refrain reads.)
- **Material close-up:** one authored push to CLOSE during WANTING (~3:40), 10–20 s, revealing artifact surface detail. (The 198 s beat is fov 41 — not a macro.)

### Pass 3 — Events become unmistakable

- 6–8 horizontal punctuation events aligned to phase boundaries — each targets a *different* channel (vignette / particles / camera / light / element / opacity); no two consecutive events of the same type, never just "louder."
- **Vignette-crush state transitions** (Direction C keystone): vignette crushes to black (~2 s) → parameters shift hidden → reopen revealing the changed room. Use at major phase boundaries (e.g. WANTING→RELEASE ~6 s, RELEASE→ERASURE ~15 s slow fade).

### Pass 4 — Element reintroduction + authored ending (only now)

- One element at a time from the parts shop: the tabletop branch, old iteration-2 layers (dust, atmosphere, secondary structures), candidate post upgrades from the WebGL research (selective bloom via layer masks; volumetric god rays with blue-noise dithering).
- Each reintroduction: materials/textures upgraded, doctrine-compliant ("room performs, not the artifact"), verified before the next.
- The tabletop *lighting idea* (window-key pooling light) is a candidate here as an event or phase treatment — not a whole presentation fork.
- **ERASURE reverse-order subtraction:** the 132 s ending fades layers out in reverse order of their appearance (particles → architecture → fog → light → rim → grain-on-black), staggered ~20–30 s curves — the authored ending the doctrine asks for.

### Verification protocol (every pass, no exceptions)

1. `npm run build` → live `?prototype=1`.
2. Screenshots to disk (`format: jpeg, quality: 35, filePath: …`) + `evaluate_script` state dumps. Never claim a visual result from code alone; never read screenshots back into context.
3. **Owner gates every pass boundary**: each pass ends with the owner watching and judging perceivability. No pass starts until the previous one passes their eye.

### Error handling / risk

- If a Pass 1 un-clamp or grade change breaks the image (e.g. blown highlights), each fix is an independent, revertible edit — apply and verify one at a time.
- Seek-based testing is unreliable (known `seekTo`/audioManager desync); judge phase behavior by playing from start or letting audio reach the timestamp naturally.
- Commit at each pass boundary (`Prompt #N` convention) so any regression has a clean rollback point.

## 5. Album consciousness — Track 5 is a pilot, not a one-off

There are 6 more tracks waiting (doctrine coverage is currently 1/7). This rebuild must therefore produce a **portable recipe**, not Track-5-shaped hacks. Concretely:

- **Prefer config over constants.** Every Pass 1–3 mechanism should read from per-track data (phase timeline, grade palette per phase, camera score, event beats, lighting ratios) rather than hardcoding Track 5 values inline. The chamber already leans this way (`CHAMBER_VARIANTS`, timelines); keep that discipline so a new track = a new config + assets, not new engine code.
- **The four passes ARE the per-track recipe.** Once proven on Track 5, each remaining track gets: governing verb + darkness family → artifact → phase grade map → camera score → event beats → element pass. Effort per track drops from "invent a direction" to "author content into known channels."
- **The per-track identities are already authored** (`MUSIC_INTERACTION_MATRIX.md`, `TRACKS_SCULPTURAL_HYBRID_BRAINSTORM_2026-03-07.md`) — the recipe ports into existing creative decisions, not blank pages:

  | Track | Verb | Artifact | Accent |
  |---|---|---|---|
  | T1 Sonoite | CONSECRATE | egg/seed vessel | warm amber #d4a574 |
  | T2 Paralisia | CONFINE | bedframe-mask cage | pale gray #4a5466 |
  | T3 O Livro Azul | DISSOLVE | recursive blue codex | blue #6a8ab4 |
  | T4 Horas Mortas | PERSIST | streetlight shrine | cool gray #5a7a8a |
  | **T5 Não Querer Nada** | **WITHHOLD** | **void relic in ritual frame** | **cold blue #32395e** |
  | T6 O Filho | TRANSFER | monolith inheritance idol | blue→warm shift #4a5680 |
  | T7 Homem Educado | EXAMINE | grid-statue form | refined gray #5a7a9a |
- **Document the recipe as it firms up.** At the end of each pass, note what was track-specific content vs. reusable mechanism, so the Track-N playbook writes itself.
- This does **not** change sequencing: no work starts on tracks 1–4, 6–7 until Track 5 passes the owner's eye end-to-end. But it does change how Track 5 code is written.

## 6. Out of scope (deliberately)

- Building the other 6 tracks (they are the *next* project, served by this one's recipe — see §5).
- Track-to-track transition design (research flags this as a creative moment, not a loading screen — real, but an album-assembly concern for after T5).
- Retiring/consolidating the OLD journey runtime and `preview-experience.js`.
- Routing default visitors to the chamber — `?prototype=1` stays the door until the image deserves the routing.
- Test-coverage gate and docs cleanup.

## 7. Source documents

| Doc | Role here |
|---|---|
| `docs/qa/FULL_THEME_AUDIT_2026-06-06.md` | Current-state truth; Pass 1 fix list + line numbers |
| `docs/qa/MUSIC_INTERACTION_MATRIX.md` | 70/25/5 doctrine; audio→channel mappings; T5 phase curves; per-track verbs |
| `docs/qa/UNIFIED_CREATIVE_DIRECTION_2026-03-11.md` | Camera vocabulary (accordion, signature returns, close-up); frame-fill priority; backlight spec |
| `docs/qa/THREE_9MIN_EXPERIENCE_DIRECTIONS.md` | Direction C (held states + vignette-crush); horizontal event variety |
| `docs/qa/WEBGL_MUSIC_EXPERIENCE_RESEARCH_2026-03-12.md` + `AWARD_WINNING_3D_SITES_RESEARCH_2026-03-11.md` | Technique shelf (LUT grading, selective bloom, god rays, composable post); reference experiences (Dime Trap = archetype, Monolith = technical reference) |
| `docs/qa/TRACKS_SCULPTURAL_HYBRID_BRAINSTORM_2026-03-07.md` | Per-track artifact identities; hybrid ratio (35–45% hero / 55–65% atmosphere) |
| `AESTHETIC_IDEAS_MASTER.md` | Album DNA; unimplemented high-ROI ideas (lens breathing, split toning, void post stack) |
