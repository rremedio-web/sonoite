# Full Theme Audit — Sonoite (2026-06-06)

> **Method:** 8 specialist agents auditing in parallel (vision, git, track JSON, architecture, Path B prototype, cinematic look-dev, per-track readiness, theme health). Every finding verified against current code on branch `experiment/path-b-reliquary-proof`; doc claims cross-checked against source. Live-browser capture deliberately out of scope (offered as a separate pass).
> **Supersedes for "where we at":** `CLAUDE.md` (Dec 25 2025, pre-reset — now stale) and `docs/qa/PATH_B_THEME_AUDIT_SYNTHESIS_2026-05-23.md` (still accurate but Track-5-only).

---

## 0. The one-sentence truth

**The creative vision is the clearest it has ever been, and the Path B chamber code is genuinely film-grade — but the album is structurally split across two (really three) runtimes, the March 2026 reset has reached only 1 of 7 tracks, and the experience a normal visitor actually sees for Track 5 is still the *abandoned* void-sphere version.** The work is *architecture ahead of the image, and image ahead of the album.*

### Health scorecard (8 domains)

| Domain | Score | Verdict |
|---|---:|---|
| Creative vision | **8.0** | Clearest it's ever been; Track 5 fully specified. But album-level vision is 1 track deep + buried under 200+ contradictory docs. |
| Cinematic / look-dev ceiling | **7.5** | Path B *can* produce a premium noir frame. Modern pipeline (AgX, HDR, OutputPass, disciplined bloom). Gaps are tuning, not missing systems. |
| Theme health (sec/perf/build/test/docs) | **6.5** | Security materially hardened; memory hygiene good in Path B. Build stale, test gate always-red, docs unmanageable. |
| Track JSON data layer | **5.5** | Track 5 base is a strong 564s score; sits in a polluted, half-migrated, self-contradictory data layer. |
| Path B prototype (closeness to aesthetic) | **5.5** | The 564s machinery is real and well-wired; image-defining channels (grade/plate/backlight) are mistuned → "specimen on black." |
| Git / repo hygiene | **4.5** | History is legible; topology is unhealthy — `main` 418 behind, all work on one branch, ~3 weeks uncommitted. |
| Architecture / tech debt | **4.5** | Three parallel Three.js runtimes, ~15,700 lines of dead "consciousness" code, dead PHP footguns. |
| Per-track album completion | **3.5** | Reset reaches 1/7; default album still pre-reset; 5 tracks at 30–55%; even Track-5-Path-B is ~70%. |

---

## 1. Where we are — the story (from git + docs, verified)

Sonoite is a WordPress theme that is really a **browser-native album listener**: 7 Portuguese tracks, each a 2–9 min Three.js audio-visual experience — *"a dark room with a lit artifact"* the viewer inhabits while the music plays. Explicitly **not** a visualizer, relic viewer, screensaver, or tech demo.

486 commits over 11 months tell a clean, datable arc in seven eras:

| Era | Prompt/commit range | Dates | What happened | Runtime |
|---|---|---|---|---|
| Pre-Phase0 WordPress theme | `c4c8518`..`914d975` | 2025-07-06 → 08-14 | Security/consciousness WP theme | (pre-journey) |
| Visual Layer API + Phase 4.2 | VLA "Prompt #1–#30" | 2025-08 → 09-21 | VisualLayer base, flows/structures, phase42 JSON journeys | **A (journey)** |
| MP micro-prompt stabilization | MP-*/STAB-* | 2025-10 → 11 | Per-track palettes, enriched moments, post-FX, leak fixes | A |
| Track 1 lock-in + CI hardening | — | 2025-12-30/31 | Track1 verify, signalPipeline, strict validator | A |
| Track 5 void-sphere lookdev | Codex `#01`..`#84` | 2026-01-07 → 03-07 | Black hole, accretion disk, VoidSphere/Halo/SingularityLens, 6/20-agent audits | A |
| **THE RESET + Path B build** | `#86`..`#124` | 2026-03-07 → 04-27 | Product reset docs (`#98`), reliquary chamber prototype, two reverts (`#105/#106`) | **B (prototype)** |
| Full-track score + perceptual pass | `#119`..`#124` + **uncommitted** | 2026-04 → 05-23 | 564s audio spine + Meshy relic; grade/backlight/floor pass | B |

**The March 11 2026 reset is visible directly in git** as two same-afternoon reverts (`#105` perf tuning, `#106` two Meshy `.glb` candidates + a texture-effect review prompt) reverted hours later (`9d7746d`, `75aa677`), with the reset docs committed the same day (`b9cb738`, `#98`). That afternoon the team discarded a speculative "full-track texture / extra-artifact" direction and re-committed to the disciplined chamber. Clean restart at `#107`.

**The doctrine that came out of the reset** (the current creative law):
- **Base — "Room as Instrument":** the *room* performs, not the artifact ("a rock in a river; the river does the work"). 8 strings: light cone, temperature, enclosure, film finish, atmosphere, shadow, space, shell.
- **Pacing — "Attention Cycle":** visible chapters every 60–120s, continuous autonomous life, 5–7 *rare, horizontally-varied* events (different target each time, never just louder).
- **Restraint — "Room You Remember":** held states, rare meaningful change. "If the viewer can't tell what changed, the change didn't happen."
- **Two darkness families only:** `sacristy` (hard black, precise light) and `veiled` (softer). Track 5 = sacristy.
- **Track 5 governing verb:** `withhold → admit → tighten → release → residue`.

The album thesis underneath all eras has never changed: **"The Deconstruction of the Self"** — a 7-track psychological cycle (Birth → Constraint/Knowledge/Insomnia → Death/Void → Inheritance → Order/Entropy/loop).

---

## 2. The three gaps (the real "where we at")

### Gap 1 — Vision → Image (Track 5 Path B): ~70% there, fixes are known and cheap

Track 5's vision is fully settled *and encoded in code*. The 564s machinery is real: 12–14-beat camera score, 14 room-pressure beats, 12 musical anchors, 8 committed event beats, AgX tone mapping, HDR composer, OutputPass, disciplined bloom, three-point lighting, a per-phase grade shader. The old "96s problem" is **genuinely fixed**.

But the chamber still reads **"object on black,"** not "object in a room with law" — exactly the May-23 diagnosis. The Path B surgeon verified each May-23 claim against current code:

| # | May-23 claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Grade restrained / per-phase identity missing | **TRUE** | Grade written once at `experience.js:3423-3428`, never updated in loop |
| 2 | Backlight is fill/rim, not leading silhouette | **PARTLY TRUE** | Placed behind hero & dynamic, but `backBase 0.38` ≪ `keyBase 1.64` |
| 3 | Floor/support too low → floating object | **PARTLY FALSE (improved)** | `floorOpacityMax 0.38` + shadow catcher — now the *strongest* channel |
| 4 | Camera lacks signature-return refrain | **PARTLY TRUE** | Near-returns at 0/135/337/510s, none identical; no refrain construct |
| 5 | Material reveal lacks a dedicated close shot | **TRUE** | Deltas fire (`1674-1692`) but 198s beat is fov 41, no tight macro |
| 6 | void zombie grammar still referenced | **PARTLY TRUE** | Gone from base structure; base flow still `void_dust`; enriched file all-void (inert in Path B) |
| 7 | Full 564s score exists | **TRUE** | 12/14 camera, 14 pressure, 12 anchors, 8 events |

**Two *new* concrete render bugs the cinematic agent found** (cheap, high-impact, not in any prior doc):
- **HDR is clipped before tone mapping.** Grade/grain/vignette/plate all `clamp(…,0,1)` while running in *linear HDR* ahead of `OutputPass`, so highlights are hard-clipped before AgX can roll them off — neutering the filmic shoulder on exactly the rim/clearcoat pixels meant to sell the relic. (`experience.js:1801,1895,2013`)
- **Grain is gated to ZERO in the deepest blacks** (`smoothstep(0.045,0.28,luminance)`, `:1798`) — the opposite of the "structured black, not empty black" thesis; risks dead/banded digital black on 8-bit displays.

**Two channels are actively mistuned:**
- **Grade is static** — set once, never driven per-phase, so no chapter gets a distinct color memory (the doctrine's #1 grade ask). `experience.js:3423-3428`.
- **Plate runs always-on at strength 0.88 from ~10s** — it's supposed to be *rare late-track residue*; instead it's a forensic texture filter over 99% of the track, pre-spending the ERASURE payoff. `experience.js:5508-5519`.

**Caveat:** the shipped `dist/` is the **May 23 build and is stale** — it predates the uncommitted perceptual-pass edits *and* recent commits. Any live judgement of the image must `npm run build` first.

### Gap 2 — Image → Album: the reset reaches 1 of 7 tracks, and the flagship is a side door

This is the most important structural finding, and it's worse than "6 tracks to go":

- **A normal visitor playing Track 5 today gets the OLD void-sphere grammar, not the reliquary chamber.** Path B is reachable only via `?prototype=1` (separate `page-prototype.php`). `prototype_chamber` isn't registered in `register-defaults.js`, so the default `SonoiteExperience` reads the same `nao-querer-nada.json`, ignores the chamber config + 564s score, and renders the void scene from the enriched-moments file. **The reset's flagship is invisible to default visitors.**
- **Track 5 is two competing implementations under one filename** — and they have *contradicting same-day audit docs* (the May-23 *audio* audit + agent `MEMORY.md` describe the OLD void director and say "eventBeats/roomPressureBeats are NOT implemented" — true for OLD, false for Path B). Future agents will keep tuning the wrong one.
- **The other 6 tracks have not started the port** — no governing verb, no darkness family, no artifact, no chamber. Doctrine coverage is literally 1/7.

| Doctrine element | Tracks that have it | Coverage |
|---|---|---|
| Path B chamber runtime | Track 5 only (opt-in) | 1/7 |
| Governing verb assigned | Track 5 only | 1/7 |
| Darkness family | Track 5 (sacristy) | 1/7 |
| Distinct artifact identity | Track 5 (Meshy hero) | 1/7 |
| Full-duration camera score | Track 5 (Path B) | 1/7 |
| Reflects the March reset at all | Track 5 only | 1/7 |

**Master 7-track readiness matrix (default runtime, verified):**

| # | Track | Runtime (default) | Director | Moments | Audio links | Camera | Verb | Ready % | Top blocker |
|---|---|---|---|---|---|---|---|---:|---|
| 1 | Sonoite | OLD journey | Track1Director **OFF by default** | 42 | 3 | Rich (13 actions, 3 splines) | — | **85%** | Not on Path B; Director disabled, conflicts w/ moments |
| 2 | Paralisia do Sono | OLD journey | none | 19 | 0 | **stationary, 0 actions** | — | 40% | Static slideshow; no camera/reactivity/chamber |
| 3 | O Livro Azul | OLD journey | none | 16 | 0 | orbit, 2 paths | — | 45% | No audio links; thin camera; no chamber |
| 4 | Horas Mortas | OLD journey | none | 19 | 0 | 5 splines **authored but unused** (mode stationary) | — | **30%** | Weakest (Lambert shader); ground-up rework |
| 5 | Não Querer Nada | OLD default / **Path B via `?prototype=1`** | Track5VoidDirector (OLD) / none (Path B) | OLD 52 / Path B 14-beat score | OLD 12 / Path B 0 | Path B full 564s score | **withhold (sacristy)** | Path B ~70% image | Two impls; side door; image "object on black" |
| 6 | O Filho | OLD journey | Track6Director (ON, ~991 lines) | 24 | 3 | stationary, 2 paths | — | 55% | SuccessionMaterial centerpiece **never renders** |
| 7 | Homem Educado | OLD journey | none | 23 | 0 | **stationary, 0 actions** | — | 45% | Static; no camera/reactivity/chamber |

**Notable verified corrections to received wisdom:**
- `Track1Director` is **gated OFF by default** (`?t1director=1`) because it "conflicts with signature-moment triggers" — so CLAUDE.md's "Director complete / Track 1 95%" overstates. Track 1's quality comes from its 42 enriched moments, not a running Director.
- `Track6Director`'s creative centerpiece (`SuccessionMaterial`, the father→son burn/reveal) **never renders** — `_initSuccessionController` only attaches if the monolith already has a custom material; the standard Monolith falls through. Confirms the long-standing "287 lines written, never applied" note.

**Honest effort to a 7-track Path B album** (with this team's documented 3× creative-underestimate correction): **~280–450h.** Recommended: ship Track 5 as a vertical slice first; gate the full album behind a reusable `TrackChamber` template.

### Gap 3 — Album → Ship: structural & hygiene debt

- **Three parallel Three.js runtimes**, not two: OLD journey (`three-experience.js` 3,564 → `journey-controller.js` 5,495 + Directors), Path B (`prototype/experience.js` 5,630), and a third standalone `preview-experience.js` (857). Each builds its own AudioManager + post stack. The strategic "retire OLD vs generalize Path B" decision is **unmade**, which blocks deleting ~9,000 lines of old core.
- **~15,700 lines of dead "consciousness" code** still in the repo (`consciousness-system.js` + `consciousness-adapter.js` + the 22-file `modules/` tree, ~22% of `src/js`), double-gated off — *and still a Vite entry building an 18.8KB chunk PHP never enqueues.*
- **Dead PHP footguns:** `inc/fix-asset-loading.php` (not loaded) hardcodes *stale* build hashes that would 404 the whole experience if re-enabled; `functions-step3.php` defines a duplicate `sonoite_get_asset_manifest()` (fatal redeclare risk).
- **~3 weeks of the best, on-doctrine work is uncommitted** (dirty tree + 2 stashes); `main` is 418 commits behind and 0 ahead. This repo has prior history of an auditor LLM destroying uncommitted work.
- **`npm run validate` is permanently red:** coverage gate (2.86% vs 80% threshold) fails Jest even though all 94 tests pass; ~71 tests are orphaned (match no `projects` pattern and silently never run); dev-dependency `npm audit` findings also fail.
- **`three-vendor` is 655KB** — tree-shaking defeated by `import * as THREE` in both runtimes.
- **Documentation is unmanageable:** 2,616 `.md` files (386 in root). `CLAUDE.md` is 6 months stale and describes the abandoned pre-reset world — it actively misdirects every new agent.

---

## 3. Domain detail (headlines + the load-bearing tables)

### 3.1 Creative vision — 8.0
*"Unusually clear and self-consistent for Track 5; only 1 of 7 tracks has a finished room-law identity; a decade of older void/cosmology vision still litters the docs."*

The reset is internally coherent and the durable thesis ("Deconstruction of the Self") survives every era. **But 6 of 7 governing verbs (CONSECRATE/CONFINE/DISSOLVE/PERSIST/TRANSFER/EXAMINE) are single table rows, never built.** And pre-reset docs (`CREATIVE_BRAIN_DUMP_DEC25`, `CREATIVE_ALBUM_MASTER_VISION`, `SPECIFICATION_FOR_THE_SOUL`) still describe the killed black-hole direction with full authority and **no deprecation banner** — a new reader would rebuild exactly what March killed.

| # | Track | Governing Verb | Intended arc | Status |
|---|---|---|---|---|
| 1 | Sonoite | CONSECRATE | Birth / awakening; admits light gradually | verb doc-only; OLD ~85% |
| 2 | Paralisia do Sono | CONFINE | Constraint / sleep paralysis; closes in | verb only |
| 3 | O Livro Azul | DISSOLVE | Recursion / cognition overload; softens | verb only |
| 4 | Horas Mortas | PERSIST | Insomnia / temporal dread; endures | verb only |
| 5 | Não Querer Nada | **WITHHOLD** | Void/collapse/erasure; never satisfies | **DONE — encoded in code + JSON** |
| 6 | O Filho | TRANSFER | Inheritance; shifts weight father→son | verb only; OLD partial |
| 7 | Homem Educado | EXAMINE | Order / entropy / loop; measures | verb only |

### 3.2 Cinematic / look-dev — 7.5
*"The code CAN produce a premium noir-sacristy frame; the ceiling is high. The gap is a handful of color-space/grain issues + unverified live black levels, not a missing system."*

| Dimension | /10 | Primary fix |
|---|---:|---|
| Rendering | 8 | Stop linear-space `[0,1]` clamps before OutputPass |
| Materials | 8 | Verify specular roll-off after un-clamping HDR |
| Lighting | 9 | None structural (strongest pillar) |
| Color grade | 8 | Drive grade per-phase; operate in display space |
| Atmosphere | 7 | Grain-in-black fix; verify dust density |
| Audio stability | 8 | Keep audio-link bugs out of the prototype path |

Confirmed: the May-2026 Track 5 *audio bugs* (centroid dead-link, actionGravity-no-suspend, void_halo jump) live **only in the OLD runtime** — Path B reads a separate `AudioManager.onFrequencyUpdate` path and is unaffected.

### 3.3 Theme health — 6.5

**Historical security/leak issues — FIXED vs OPEN:**

| ID | Issue | Status | Evidence |
|---|---|---|---|
| V-01 | SQL injection (dashboard) | **FIXED** | `$wpdb->prepare`+`esc_like` (admin-security-dashboard.php:907-925) |
| V-02 | CSRF client-side only | **OPEN (low risk)** | regex-only token; real protection = WP nonces (security-manager.js:921-927) |
| V-03 | AJAX over-permissive | **FIXED** | per-object `current_user_can('edit_post')` (admin-functions.php:62) |
| V-04 | IDOR in track endpoint | **FIXED** | `post_status==='publish'` (rest-endpoints.php:358) |
| Meyda leak | analyzer not stopped | **FIXED** | manual node disconnect (audio-manager.js:1364-1392) |
| RAF loop | render loop not cancelled | **OPEN (old runtime)** | three-experience.js:2950 RAF, no `cancelAnimationFrame` in dispose |

Path B `destroy()` is exemplary (4/4 listeners, RAF+timer cancelled, all resources disposed). `three-vendor` 655KB; `dist/` stale; test gate broken; docs the worst sub-domain (2.5/10).

### 3.4 Track JSON data — 5.5
Track 5 base is a coherent 564s chamber score. **But:** the 91KB `nao-querer-nada-enriched-moments.json` (pure void grammar — 52 moments, 290 actions) is still **fetched and merged** on every Track 5 load (inert in Path B only by `.find()` luck); `reduced/nao-querer-nada.json` is **stale old-schema and served FIRST under prefers-reduced-motion** (breaks Path B for those users); four parallel timing arrays have **drifted out of sync** at 384s and 510s; ~30+ dead journey files clutter the directory.

### 3.5 Architecture — 4.5 / Git — 4.5
See Gap 3. The Path B prototype is the right bet but is a single 5,630-line / 53-method class with `DEFAULT_TRACK_SLUG` and GLB paths hardcoded and 7 shaders inlined — **extract a `ChamberRuntime` base class now, while only Track 5 is live, before 6 more tracks get inlined.**

### 3.6 Path B prototype — 5.5 / Per-track — 3.5
See Gap 1 and Gap 2.

---

## 4. Consolidated prioritized roadmap

### P0 — decisions & the perceptual close-out (do first)
1. **Make & write down the runtime decision (ADR).** Path B becomes the production chamber for all tracks; OLD journey + Directors become a deprecated reference path with a removal date. *Everything else is gated on this.*
2. **Route the default Track 5 to Path B** (or formally declare `?prototype=1` the album) so a real visitor sees the chamber, not the void. Track 5 is unshippable while two implementations contradict.
3. **Finish Track 5's perceptual pass** (the doctrine's own success bar):
   - Drive `ChamberGradeShader` per-phase (VOID cold → ERASURE dead purple-gray). `experience.js:3423`.
   - Re-schedule the plate to near-zero, rising only on failure events / late ERASURE. `experience.js:5508`.
   - Rebalance lights toward silhouette (raise `backBase`, trim `keyBase`). `experience.js:1553`.
   - One **exact** signature camera return used 3–4× in changed room states.
   - A dedicated **material-reveal close shot** at the reveal beat.
   - **Un-clamp the HDR passes** (remove `clamp(…,0,1)` at `1801/1895/2013`) and **add a grain floor in blacks** (`1798`).
4. **Commit the at-risk work.** ~3 weeks of on-doctrine edits + 2 stashes are uncommitted. Commit as "Prompt #125" before anything else.

### P1 — make the truth legible + unblock CI
5. **Write `TRACK_STATUS.md`** (single source of truth: per-track runtime / director / verb / darkness family / artifact / score completeness / which docs are stale). Mark the OLD Track 5 audio audit + `MEMORY.md` sections as OLD-runtime-only.
6. **Refresh `CLAUDE.md`** to the post-reset Path B reality (or a top banner → `END_GOAL_AND_PRODUCT_RESET.md` + this audit).
7. **Stop merging the void enriched file** into Track 5; **fix `reduced/nao-querer-nada.json`** (breaks reduced-motion users).
8. **Fix the test gate** (move 2 orphaned suites into a `projects` match; set realistic coverage ratchets) so `npm run validate` can pass.
9. **Rebuild `dist/`** and add a "dist older than src" warning.
10. **Extract a `ChamberRuntime` base class** + per-track config/shader modules — prerequisite for the 6-track port.

### P2 — debt paydown
11. **Delete the dead consciousness system** (~15,700 lines + dead Vite chunk) — double-gated, zero runtime behavior.
12. **Delete never-loaded PHP** (`fix-asset-loading.php` stale-hash footgun, `functions-step*.php` redeclare risk).
13. **Named THREE imports** → target `three-vendor` < 500KB.
14. **Unify Track 5 timing** into one ordered beat list + a validator; reconcile the 384/510s orphans and contradictory phase windows.
15. **Add fast-attack/slow-decay** envelope to sustained audio bands.

### P3 — hygiene
16. Archive pre-reset creative docs with deprecation headers; collapse 2,616 `.md` → <15 living docs.
17. Fix admin manifest path (`dist/.vite/manifest.json`); localize `journeyBaseUrl`/`analysisBaseUrl`; strip `/homem/` fallbacks; gate routine `console.error`.
18. Tag era boundaries (reset, Path B baseline); prune 13 dead branches; remove client-side CSRF theater; clear dev-dep advisories.

---

## 5. The decisions only Ricardo can make
1. **Is Path B the album's one true engine?** (All recent docs say yes. If yes → commit to routing + the 6-track port + retiring OLD.)
2. **Ship strategy:** Track 5 vertical slice first, or build the template and port in parallel?
3. **Scope/timeline reality:** ~280–450h to a 7-track Path B album. Is the target a full album, or a strong 1–3 track release?

---

*Generated 2026-06-06 by an 8-agent parallel audit (909k tokens, 231 tool calls). All `file:line` references verified against `experiment/path-b-reliquary-proof` HEAD + working tree.*
