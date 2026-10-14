# Track 5 Recut — Creative Layer (design of record, 2026-07-23)

**Branch:** `experiment/track5-audio-led-middle-recut`
**Amends:** `docs/qa/fable-track5-recut-execution-plan-2026-07-23.md` (the 28-cut execution architecture). Does **not** touch its cut map, camera families, seam contracts, or Opus F1/F2/F3 acceptance gates except where explicitly stated (one P5 lint amendment, phrase-light + soft occupancy guidance, end-state transport test).
**Feeds:** the Opus 4.8 final review (`docs/qa/OPUS48_TRACK5_RECUT_FINAL_REVIEW_PROMPT_2026-07-22.md`) — attach this spec alongside the Fable plan and `docs/qa/TRACK5_AUDIO_LED_RECUT_APPROVED_BUILD_SPEC_2026-07-23.md` so the signed plan rules on both at once.
**Provenance:** Prompt #186 (this creative layer) was reviewed by Opus 4.8 and **selectively amended** by maintainer judgment before implementation; it is not a second owner sign-off bundle.
**Implementation:** none before owner go on the approved build spec, same as the rest of the recut.

**Project logline (not external evidence):** *A dark sculpture is covered by increasingly urgent cameras; then the camera releases its desire while the sculpture transforms.*

## Why this layer exists

The execution plan is edit grammar: where to cut, which family, which rig. It has no thesis — nothing says what movement, light, or effects *mean*. The track is *Não querer nada* ("to not want anything"); the album is *The Deconstruction of the Self*. This layer gives the film a narrative spine that enacts the title, fixes the one structural reason cuts read as scene-changes instead of camera-switches, and protects end-of-film behavior.

**Owner-locked scope (canonical):** only the **five** choices in `TRACK5_AUDIO_LED_RECUT_APPROVED_BUILD_SPEC_2026-07-23.md` §3 (hard cut @ 64s, 12 climax cuts, single blackout @ 318.265, F8 base tar @ 386.25, warm-neutral keys), plus explicit **owner rejects** in that spec §2 / §10. **Phrase-light (§2), camera want→release as soft occupancy arc (§1), and end-state protection (§4)** are adopted here by maintainer judgment after Opus review — they are **not** a fourth/fifth/sixth owner ballot.

---

## 1. Camera-desire spine — "the camera wants; then it learns not to"

The edit enacts the title. This is a **section-level narrative guideline** for authoring and human review — **not** hard per-shot config lints (no L-A1/L-A2 dolly-sign or raw distance monotonicity).

**Engine dolly sign (authoring reference):** **negative** `dollyPerBar` = approach (camera closes distance); **positive** = retreat. Narrative "want" favors approach or hold in 64–329s; "release" favors retreat or hold from ~331.6s onward, with cut-map and audio exceptions.

| Zone | Time / bars | Narrative | Authoring hint |
|---|---|---|---|
| **Want** | **64–329s** (post-preserve rebuild through climax / pre-cliff) | Craving escalates; coverage feels like closing in on the relic. | Favor tighter framings and/or approach motion where the 28-cut map already cites climb/peaks. |
| **Release** | **331.6–487s** (bar 126+ through bridge landing) | Letting go; cameras stop reaching. | Favor wider or receding reads into `mcu_residue_right`; bar **128** plateau = **pure orbit, zero dolly** (circumambulation). |

Fixed narrative beats (unchanged from Fable / build spec):

- **Peak of wanting = bar 107 @ 280.794s** (`mcu_climax_peak`, rmsN = 1.000): tightest MCU band moment in the rebuild — F5 minimum distance in its class; ECUs governed by D14 FOV / F1 height rules separately.
- **Exemption:** bar **186** `mcu_residue_right` is preserved-zone contract (Fable D11) — the one last close look before the 504+ tail; it may read "closer" than the preceding bridge trend **by design**.

**Soft gate (human + optional analytics, not Step 2 lints):** over **64–329s**, **median projected subject occupancy** (from family distance + FOV + P1 height, per build spec §6) should **generally rise** cut-to-cut at section scale; over **331.6–487.3s**, it should **generally fall**. Exceptions are expected where the authoritative 28-cut map or audio anchors require them (e.g. WS breathing room, bar 128 orbit, bar 186 landing). **Do not** enforce strict dolly-sign or per-family distance monotonicity in unit tests.

Cost: zero engine work for the spine itself; occupancy trend is reviewed at step 8 soak / owner sheets.

## 2. Phrase-light — concert-film lighting (amends Fable P5)

**Adopted by maintainer judgment (concert-film continuity).**

In a real concert film, the stage light does not change when the editor switches cameras — light continuity across cuts is what makes multiple angles read as *one live event*. Per-cut rig re-key on every adjacent cut machine-reads as cuts but human-reads as separate scenes.

**Design:**
- Light state changes on **musical phrase boundaries**, sourced from the audio pack's transition-cluster table (`audio-energy.json` `top15TransitionClusters` + section rules) and snapped to downbeats in `beats.json`.
- Within a phrase, consecutive cuts **share the rig** — multi-camera coverage of one moment.
- Phrase lengths follow the audio: escalation 4–8 bars, climax 1–2 bars, plateau/bridge long. In the climax, phrase length ≈ shot length, so re-key density (and ffmpeg cut readability — Grok grounded risk #2) survives untouched.
- The luma-polarity see-saw (adjacent lighting states alternate "relic-lit / room-black" vs "room-edge-lit / relic-silhouette") operates at **phrase** level in the climax.

**Fable plan amendment (the only rig-distinctness lint change):**
> P5 rig-distinctness lint changes from "adjacent **cuts** must differ in lightRig" to "adjacent **phrases** must differ in lightRig; cuts within a phrase share the rig; every cut still differs in >= 2 composition axes."

**Canonical phrase data (maintainer 2026-07-23):** adopt **Option B — cluster-snapped 22-phrase** table from Fable brainstorm `ses_06f5db2fcffe6jP1TgChQUsuUF` — full rows in approved build spec **§6.1**. **Option C world-lock** is **not** in scope unless Step **4/8** visual checkpoint fails after gate #1 composition-first remediation.

**False dawn (396.621–419.950s):** narrative label for bars **151–160** (phrase **21**) — the **only** major post-climax **exposure** rise; **two-bar exposure step-down** into bridge at bar **160** (not a blackout, not a per-cut rig carnival).

**Readability guard:** acceptance gate 1 (>= 70% ffmpeg-readable cuts) remains **authority**. If phrase-shared light weakens within-phrase cut readability, fallback order is fixed: **(1)** strengthen **camera composition axes** (distance, height, yaw, target — per existing adjacency lint); **(2)** only if gate #1 still fails after that, apply **measured** per-cut light adjustment (intensity/rim delta), validated against gate 1 — not a guaranteed ±10–15% micro re-key shortcut.

**Rejected (maintainer):** **one-frame exposure kiss** at cut instants (metric gaming / flash risk). **Parked outside recut:** living-pause behavior.

## 3. Tar payoff — parked for prototype

**Owner / maintainer reject for this prototype:** wet-floor streaks, true mirror floor, and tar-drip beads are **out of active design, acceptance, and engine prerequisites**. Rationale: risquinhos regression risk, perf distraction, and orb/particle vocabulary collision on beads. **No floor gloss ramp** driven across the 504 seam; tail **504+** stays byte-identical per build spec §2.2.

Concise parked summaries live in **Appendix** only. Bridge bar **171 → 186** reads through **composition + existing mutation ramp** — not floor reflection symmetry.

## 4. The room remembers — end state

The runtime already behaves this way (acceptance soak: `stayedEnded: true, loopedOrRestarted: false`). This section **specifies and protects** it:

- After playback natural end (~563.93s) the chamber persists in its post-film state: mutation 1.0, extinction exposure floor, ERASURE-amplitude living breath. No reset, no bright replay chrome; transport **stays ended / paused** (no loop).
- Pressing play again **restarts track time from 0** and restores the pre-film room automatically — `mutationAmountAt` and grade/lighting scores follow absolute track time, but the **contract to test is transport + replay**, not the mutation helper alone.
- **New test (recut acceptance):** simulate **natural end** → assert **`proofComplete`** (or equivalent ended flag), transport **remains paused**, **no** auto-loop; then **replay action** → track time **0**, film can run again. Do **not** satisfy this gate with a test that only calls `mutationAmountAt(t)` in isolation.

## 5. Constraints compliance

| Constraint | Status |
|---|---|
| Owner rejects (orbs, cool wall, centered title, unexplained accents, god ray, funky camera) | Untouched — this layer adds none of them. |
| Reactivity doctrine 70/25/5 | Phrase-light and spine are authored macro. **Plateau:** `plateau_rim_pulse` ↔ **EMA(midNorm)** (P6, sustained). **Climax (Step 6):** **deterministic beat/onset-authored** rim pulses on **selected cited beats only** — **not** live FFT; **phrase rig identity unchanged**. |
| Blacks stay black | No new bright floor/bead speculars in prototype scope. |
| 60fps / leak gates | No mirror re-draw, no bead uniforms, no `scene.children` growth from this layer. |
| Preserve zones (0–60, 504–end) | Spine guidance applies to rebuild authoring only; §4 end-state matches current shipped behavior; **no floor ramp crossing 504**. |
| Default path byte-identical | All adopted items ride the `recut` flag per Fable PROTOTYPE_ARCHITECTURE. |

## 6. Additions to the Fable / build spec (summary)

1. **Amend P5** → phrase-level rig distinctness (§2); gate 8 wording aligned in approved build spec; **§6.1** 22-phrase Option B table.
2. **Soft occupancy arc** → section-level median projected occupancy trend 64–329 ↑ / 331–487 ↓ with cut-map exceptions (§1); **not** Step 2 unit lints.
3. **Add** end-state transport + replay test (§4) to recut acceptance.
4. **§6.2** four new rig intended values in approved build spec (implementation may adapt schema field names).
5. **Do not add** floor streak / mirror / bead engine prerequisites.
6. **Step 8:** lossless **PNG/canvas-vs-WebM** cut-detector calibration before trusting ffmpeg gate #1; **A/V cut-latency measurement** — **do not authorize `cutLeadSeconds`** (subtraction sign unproven).

## Appendix — parked ideas (owner-visible, not in scope)

- **Wet-glass floor streaks:** specular streak term on floor shader tied to mutation time — rejected for prototype (regression + seam risk at 504).
- **True mirror floor:** y-flipped hero under floor — rejected for prototype (perf / distraction); would remain step-4 gated if ever revived.
- **Tar-drip beads:** narrow-band mutation shader highlights — rejected (orb/particle vocabulary risk); would need per-bead audio citation rows if revived.
- **Shadow clock:** cast shadow lands on visible surfaces per re-key; plateau orbit sweeps shadow like a sundial — **parked**, no implementation.
- **Orbit reveal:** one yaw window exposes a decorator-mask feature — **parked**, no implementation.
- **Concert "looks":** 3–4 discrete room states at section boundaries — partially subsumed by §2 phrase-light.
- **Program note:** one shell line for seeded uniqueness.
- **Living pause:** transport/hold behavior beyond end-state §4 — **parked outside recut** prototype.
- **One-frame exposure kiss:** rejected (metric gaming / flash at cut instants).
- **Option C world-lock:** phrase-light fallback — **not adopted** unless checkpoint fails (see §2).
- **Ship the chamber as the single:** Track 5 default routing — owner/product decision, separate track.
