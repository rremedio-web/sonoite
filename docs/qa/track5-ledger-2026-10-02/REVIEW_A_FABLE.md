# Track 5 review, round A — Fable seat (2026-10-02)

Scope: Path B prototype, Track 5 on the physical scene. Read-only, stills only, no sound.

## Verdict

Track 5 already has the album's best ratchet, and the film looks away while it starts: the collapse cut goes behind the wall and the first 54 s of tar pass at 0 % lit. Build the ledger as Track 4's inverse, where the light is the control and the surface is the variable, with three matched before/after pairs and a gate on the pair difference instead of frame brightness. Fix the camera first, because half the running time sits in wides that measure black.

## Diagnosis

**1. The mark arrives off camera.** 320 s is the brightest frame (11.9 %, clean flower). At 337.00 the score cuts to `ws_back_silhouette` (29.7 u, behind the wall) and holds to 391.43. Both sheets show 340 and 360 at 0 %, so the tar climbs from floor to wrist unseen. On the default route the hold runs to 432.91.

**2. Half the film is in black wides.** 11 of 22 cuts go to wide setups at 29.7–48.2 u, holding 293 of 564 s (52 %). Every sampled wide is 0 %: 60, 75, 120, 145, 340, 360, 445, 535–560. From the measured bounds (4.07 × 7.42 u) I estimate the silhouette at about 2 % of the frame at 34 u and about 7 % in the 12–15 u setups. A wide cannot register even fully lit unless the floor carries light.

**3. The confirmed hits land in the dark or late.** 70.02 and 139.08 fall inside black wides; 170.69 and 200.00 arrive 1.6–2 s after their cuts. The visible pre-collapse frames (30, 175, 205, 245, 285) are one picture at 0.6–2.5 %: the same grey mesh and side light from a different angle. "Offer and take back" does not exist as light, because every lighting-score change eases over 3–10 s.

**4. The proof pairs exist but can't be seen.**
- The score already returns `ws_right_arch` (bars 83 → 165) and `ws_back_silhouette` (25 → 128): before/after on one setup, both 0 %.
- The readable "after" at 478 s is not a return. `mcu_residue_right` is yaw +1.1 under `wet_specular`; the 200 s "before" (`mcu_fracture`) is yaw −1.1 under `fracture`. At sheet size, 478 reads as 245 with a darker, speckled hand.
- 320 → 520 is nearly a pair, but mirrored (yaw ±0.9), 5.9 vs 4.5 u, and 11.9 % vs 1.0 %.
- Each setup carries its own light rig, so no return is ever a control.

**5. Three code-level faults** (my reading of the source; confirm in close-up):
- **Close-ups aim at air.** They target `TRACK5_FILM_FLOWER_HEAD`, the top of the bounding box, where there is no mesh. At 320 and 520 the flower is cropped by the bottom edge under an empty upper half.
- **The tar edge is dither.** It is a per-pixel white-noise band ±0.89 u tall (24 % of the sculpture). That is the speckle on the hand at 478.
- **The ratchet never completes.** At amount 1.0 the frontier stops at the box top, so the crown's top 0.9 u stays inside that band. The glitter at 520 is consistent with this.

## The ledger

Two instruments, both cold, no fill. **K** is the hard side key of the 205 s frame, shadow-casting. **R** is a low rear-three-quarter edge light. K steps (≤ 0.3 s) with the cuts and is never derived from the tar amount. The ledger owns both; per-setup rig switching goes.

| # | Window | Confirmed event | What is lit | Light | Tar by then |
|---|---|---|---|---|---|
| S0 | 0–70.02 | intro | Only the flower's rear edge, a cold line around the crown (today's 30 s frame, held). | R alone | none |
| S1 | 70.02–139.08 | first arrival ✅ | Flower, egg and upper hand, pale grey from one side: the clean sculpture, offered. | K steps on at about half level; cone ends at the knuckles | none |
| S2a | 139.08–170.69 | drums out ✅ | S0's picture again, exactly. | K off in one step | none |
| S2b | 170.69–200.00 | return ✅ | Flower and egg come back; the hand does not. | K narrow, aimed high | none |
| S3 | 200.00–336.83 | full-band drop ✅ (246.00 and 318.26 are authored, unmeasured) | The whole sculpture, crown to base, with its floor contact: the "before". | K full, widened down to the base; no hotter than today's 205 s flower | none |
| S4 | 336.83–391.43 | collapse ✅ | The base and the floor around it; everything above the wrist falls to a dim edge. | K drops to the floor: the low, narrow key the frontier shot already uses (`wet_specular`, 10° elevation); R stays | starts at the floor; +0.5 u by 350; wrist (27 % of height) by 391 |
| S5 | 391.43–432.91 | none (authored) | Only the frontier: the wet line crossing wrist to lower hand. | unchanged; a cut-in on the same light | 27 → 47 %; crosses the shot's aim point (Y 0.65) at about 405 s |
| S6a | 432.91–469.20 | none (authored) | S3's light and full-figure frame return: lower half black and wet, upper half still pale. | K exactly as S3 | 47 → 65 %: hand and egg go |
| S6b | 469.20–510.67 | none (authored) | S3's 200 s frame: hand and egg black; the flower is taken during the hold. | K exactly as S3 | 65 → 100 % |
| S6c | 510.67–532.86 | none (authored) | The 318 s flower close-up in the same light: black, wet, complete. | K exactly as S3 | complete (needs the crown fix) |
| S7 | 532.86–≈543 | last note ✅, reverb clears | Reflections only: thin lines on petal edges, shrinking to one glint. | K off in one step; R alone, fading | complete |
| S8 | ≈543–563.93 | silence | Nothing. | off | n/a |

**How the returns prove it.** Before the collapse, a return restores: S2a is S0 exactly, on purpose. The palindrome that was Track 4's flaw is this film's "before" grammar. After the collapse, a return can't restore. S6a/b/c reuse the S3 setup ids and S3 rig values (assert both in a test), so the surface is the only variable.

**Gates (Track 5's own).** Frame-share lit % is biased towards Track 4's answer (light the room), and tar lowers it by design. Gate on the sculpture region instead:
- **Legibility:** in S3, at least half the visible silhouette is above 25 % grey (today roughly a third, by my estimate).
- **Step:** each state boundary changes the lit silhouette share by ≥ ×1.5.
- **Proof:** in each pair, the region mean falls ≥ 40 % while its 99th-percentile luminance does not fall.

Report frame share, but don't chase 14–32 %.

## Camera and cut plan

- **Go:** `ws_back_silhouette` (both uses), `ws_front_low`, `ws_front_high`, `ws_false_release`, `ws_room_reveal`, `ws_erasure`, `ws_final_trace`.
- **Move:** `ws_right_arch` becomes the single full-figure setup, **P2**: same yaw, about 17–18 u at fov 30, figure about 75 % of frame height, floor contact in frame.
- **Re-aim:** the flower close-ups at a measured cluster (the recut's `BLOOM_EDGE`), not the box top.
- **Keep:** `mcu_left_eye`, `mcu_right_low`, `mcu_fracture` (**P1**), the 318.26 blackout and flower close-up (**P3**), and `mcu_tar_frontier` untouched.

| Time | Cut to | State |
|---|---|---|
| 0.00 | `mcu_left_eye`, held | S0 |
| 70.02 | `mcu_right_low` | S1 |
| 139.08 | `mcu_left_eye` | S2a |
| 170.69 | `mcu_right_low` | S2b |
| 200.00 | P1 | S3 |
| 246.00 | P2 | S3 |
| 280.79, 299.53 | as authored | S3 |
| 318.26 | P3 | S3 |
| 336.83 | P2 | S4 |
| 391.43 | frontier | S5 |
| 432.91 | P2 | S6a |
| 469.20 | P1 | S6b |
| 510.67 | P3 | S6c |

There is no cut after 510.67. That is 4 cuts before 200 instead of 9, each on a confirmed hit.

**Cuts against hits.** Today's cuts lead by 6.0 / 4.1 / 1.6 / 2.0 s (64.00, 135.00, 169.13, 198.00) and trail the collapse by 0.17 s (337.00). Author the five ledger cuts in seconds, on the measured hit or up to 80 ms ahead, never after, with K's step on the same frame. If they must stay on the grid, the nearest beats are about 69.92, 138.94, 170.44, 200.00 and 337.00. The phase windows and lighting score (64 / 135 / 198 / 337) must move with them or the light stays early.

## The ending

**Today:** 534.00 cuts to `ws_erasure` (40.8 u), 1.14 s after the last note. `extinction` ramps exposure down to 564, and 558.55 cuts to `ws_final_trace` (48.2 u) inside a 3.6 s black gap. 535, 545 and 560 are all 0 %, so the present ending is 30 s of black opened by a late cut. 560 falls inside the gap, so the sheets don't show whether the reopen (562–564) is visible.

**Proposed, on P3, no cut:**
- **532.86:** K off in one step.
- **535:** the coated flower with no body, only thin cold lines along petal edges (R alone).
- **540:** R at about a third; one glint on the highest edge.
- **≈543:** R off.
- **545:** black.
- **560:** black, through 563.93. The grain floor stays, so it reads as film black, not a dead tab.

**Delete:** the cuts at bars 204 and 213, `track5_final_trace` (the reopen), and `track5_erasure_begin`. Retime the `extinction` ramp to 532.86 → 543. The tar must close before 510.67: overshoot the frontier by 0.12 of the span.

**Owner questions:**
1. The film plate is authored to ghost-return in ERASURE (534–564), which conflicts with black at 543. It is a Pass 1b value, so this is a decision for you, not a trim.
2. 21 s of black before auto-advance may be long. That is a shell choice (advance earlier), not a film one.

## Remove / Protect

**Remove:**
- The haze discs and the faint vertical bars on the default sheet (75, 245, 340–478). They are already gone on the physical scene; keep them gone.
- The floor residue pool (`aftermath`, Stage-only today): keep it off.
- Eased light transitions.
- Behind-wall setups and anything beyond 24 u.
- The 558.55 reopen.

**Protect:**
- Tar timing (337 → 470 → 510) and its irreversibility.
- The frontier shot exactly as built: its aim point is crossed mid-shot, which is why it works.
- The grey mesh at 205 / 245 / 285: cold, low saturation, side-lit.
- The 318.26 blackout into the brightest frame.
- The 520 coated flower.
- No lamp in frame.

## Risks

1. **Importing Track 4's room:** a near wall, a shadow event, a grey room afterwards. Track 4 marks the room; Track 5 marks the object. No receiving wall, nothing warm, and it ends in black.
2. **One scalar.** If K follows the tar, the after-film dims as the tar rises and the pairs prove nothing.
3. **Chasing lit %.** This brightens a film whose neighbour was just called a bit too bright. Raise coverage in S3 (widen K down to the base), not peak.
4. **Black on black.** A coated sculpture in a black room disappears. R must stay on from 336.83 to 543; the after-image is line, not mass.
5. **Tar as glitter.** Point sources on clearcoat give sparkle (478, 520), and the dither band adds to it. Wet reads as a long highlight: test a strip source as R (Stage's `stageSoftbox` is one) and a narrower, coherent edge. The owner approved the frontier shot with the present look, so A/B it there first.

Track 5 must own the surface change, the hard cut on the hit, the matched return, the cold, and the black ending.

## Confidence

- **High:** diagnosis 1–4 (frames plus score), the behind-wall and box-top aims, and the ending as it stands.
- **Medium:** the two tar-shader readings and all silhouette-share estimates. They are derived from code and bounds, not measured.
- **Low (stills only):** cut rhythm; whether S0's 70 s hold and S3's 136 s carry; whether the last glint reads in motion; the tar under camera drift.
- **Not on the sheets:** 0–24, 216–235, 246–281 and 300–318.
- **Unmeasured times:** 246.00, 391.43, 432.91, 469.20 and 510.67 have no confirmed musical event. Measure them before locking, as with Track 4's edit points. 281.97 stays out.
