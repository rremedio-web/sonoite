# Second opinion, round 2 — Fable seat (2026-10-01, evening)

Read-only; nothing was written. Numbers below are my own measurements of the five contact sheets (thumbnail scale, so approximate) unless noted.

## Verdict

The ledger fixes the visibility half of the diagnosis: Track 4 goes from 0.02 % to 6.8 % of the frame lit, and almost every state can be named from a still. It does not yet fix the lasting mark: the descent is the ascent played backwards, the promised wall shadow never appears as a shape, and the look has drifted to a saturated orange pin-spot the owner has already rejected. Trim it before shipping, then spend the next effort on carrying the method to Tracks 5 and 1, not on more Track 4 polish.

## Track 4 ledger

### Q1. Does it fix the diagnosis?

**Nameable: mostly yes.** On the current sheet every frame is the same dim silhouette. On the ledger sheet a viewer can say "a spot on the crown" (12 s), "it reached the fingers" (70 s), "now it has form" (125 s), "a wall" (255 s), "only the crown again" (365 s).

**Lasting mark: no.** Four things RESULTS.md doesn't say:

1. **The film is a palindrome.** Lit area: 12 s 0.22 % ↔ 380 s 0.23 %; 45 s 0.65 ↔ 365 s 0.51; 110 s 1.62 ↔ 326 s 1.32. Hue and saturation match too. Every light parameter is a function of one scalar (`track4-ledger.js:113-129`), so "losing it" looks identical to "not having it yet". The room ends exactly as it began.
2. **S2's promise isn't in S2.** At 125 s and 200 s the right third of the frame is RGB (1,1,1): no wall, no shadow. "The room has a back" only arrives at 255 s.
3. **The peak is the softest light in the film.** At full reach the cone opens to 1.05 rad with penumbra 0.7 (`:123-124`). The wall at 293–300 s is an even gradient, not a shadow shape. "The shadow is the biggest thing in the room" never happens.
4. **The source is dimmer than what it lights.** Tube maximum 87–155 against 184–226 on the sculpture in every wide frame. The tube is 1–2 px at this scale, so confirm at full resolution.

Every ledger change is a pure function of track time, so all of this stays inside the doctrine's authored lane.

### Q2. Per state

| State | Call | Frame evidence |
|---|---|---|
| S0 Cold | Keep | 5 s: black. No tube visible in this still; check in motion that the glass is seen trying. |
| S1 Warming | Trim | 12→110 s: reads as "bigger", not as nine things. Use four named arrivals: crown 9.8, whole flower 41.75, fingers 66.15, egg and hand 103.1. Other restrikes return to the same reach, as failed attempts. |
| S2 Finds it | Trim | 125 s is the best new frame (form, terminator, 3.1 %). But 125→200 s is one 117 s ease (3.08→3.46 %), a curve by rule 1. Land the wall shadow as a step at the 187 cut. |
| S3 Burn | Keep, fix | 255 s: the flower is strong. The wall is an orange wedge, not a shadow. |
| S4 The turn | Not yet a state | 293 vs 255 s: sculpture 6.6→6.8 %, wall luminance about +12 / 255. Same picture. |
| S5 Losing it | Keep, re-time | 326 and 336 s read (hand, then crown). But the wall and shadow are "lost" from a wide that never showed them. |
| S6 Alone | Keep, trim | 350→365→380 s (1.02→0.51→0.23 %) is the clearest ratchet in the film. But 350 s is the hottest frame of all (max 226 vs 209 at the peak). |
| S7 Silence | Keep | 389 s: black. The ember can't be judged from a still. |

### Q3. Open decisions

**(a) F vs A.** Arm F was my own proposal this morning, so weigh this accordingly. As built, neither arm can be chosen: whole-frame means differ by 7 / 255 at 270.6 s (F 11.9, A 19.0) and by 3 at 293 s, well under the spec's own ≥ 20 gate. I still back F on principle, because the matrix's key-light drop exists to avoid "the spotlight gets brighter when the music gets louder", which is arm A. But F's 1.5 s sag will read as one more stutter beside 275.75, 281.6 and 289.45. Make it a loss of reach (the wall and shadow drop out) and longer than a stutter. Note that 269.86 is Gemini-only; measure it before the A/B.

**(b) The push.** Keep it; no new cut. Two changes:
- **At 285.5, land a hard flower shadow on the in-frame wall.** That means a narrower, harder cone at full reach, not a wider, softer one. "The lamp finally throws a shadow" is nameable in a close-up; "more room" is not.
- **Let the existing 319.10 wide show the whole room.** Today the first loss fires at 320.5, 1.4 s after that cut. Move the four losses to later sputters (323 / 330 / 333.5 / 336; the table has six) so the wide holds the full room for about 4 s. Then every S5 loss is of something the viewer has just seen in that frame.

**(c) The wall.** Lit sculpture pixels sit at hue 30°, saturation 0.53. The wall and falloff sit at hue 21–22°, saturation 0.85–0.88, so the shadows go red and the wall reads as a second, painted colour. Make it neutral dark plaster lit only by the key's spill: the sculpture's hue, saturation ≤ 0.35, no more than about a quarter of the flower's lit-side value. Also desaturate the key itself (`#ffad42`) to roughly 0.25–0.30 on the mesh. Tracks 1 and 5 sit at ≤ 0.17, and the owner's "grey mesh" is gone at 0.53. The tube should be the only saturated thing in the frame.

**(d) The overshoot.** Halve it to 1.75× on the ascent and remove it on the descent; a dying lamp must not out-burn the peak. Lit-pixel mean is 159–176 in S1 and 172 at 350 s, against 143 at the peak. The better fix is to drop the 0.05 rad cone: use a wide cone with distance falloff, so nearness to the tube orders crown → fingers → egg and no compensation is needed.

### Q4. New problems

- **Pin-spot: yes.** A tube can't make a 3° hard cone. At 12–45 s there is a black gap between the tube and a hard-edged disc, which reads as a follow-spot from off-screen.
- **The wall is a flat panel at 255–300 s.** Even gradient, straight cone edge, no seam or corner, no shadow shape. At the peak it is 26 % of the frame and the most saturated thing in it, so it competes with the flower.
- **The lamp is out of frame at the peak.** In today's default, the tube sits beside the crown at 255–300 s. In the Stage framing it is gone, so a film about a lamp peaks without the lamp.
- **The liked AFTER look was replaced.** Today's 350–365 s frames are the faint grey mesh in darkness; the ledger swaps them for orange spots.
- **Palindrome fixes to test (checks, not verdicts):** on the descent, hold the cone wide and let the level fall, so far things drop out first and the picture dims instead of rewinding. Let today's grey AFTER survive between restrikes. Or build the spec's optional wall afterimage.

The 336 s frame sits on the 336.0 sputter, so the rise in lit area from 336 to 350 s may be a sampling artefact. The peak pixel values are not.

## Track 1 ledger outline

**Ratchet: the key's position.** It travels one way round the sculpture and never returns. Moves hide in existing cuts, the way Track 4's hide in blackouts. The mark: the opening framing comes back lit from the side that began black. The default darkness stays.

| # | Window | Music | What is lit | Camera |
|---|---|---|---|---|
| S0 | 0–46.97 | quiet, pre-pulse | Crown's near edge only, hard, from far left. | existing holds |
| S1 | 46.97–82.11 | pulse enters ✅ | Same station; light drops to the egg, hand dark. | existing |
| S2 | 82.11–125 | half-time drop ✅ | Hand, plus the first cast shadow on the floor. | light on 82.11; the 90.26 cut shows it |
| S3 | 125–316.60 | FRACTURE (authored boundary; no confirmed inner events) | Key found one station further at each existing cut; the shadow crosses the back wall. | 177.88 / 205.5 / 253 |
| S4 | 316.60–367 | breakdown ✅ | Key out; faint form only. | hold |
| S5 | 367–411.52 | climax ✅ | Key returns hard on the far side; the flower's shadow on the wall behind it. | protected 375.05 / 384.03 cluster |
| S6 | 411.52–488.43 | breath-then-slam ✅ | Key behind: sculpture in silhouette against a lit wall. | 411.5, 438.9 |
| S7 | 488.43–532.81 | step-down ✅ → last event | S0's framing, lit from the opposite side, dying; black after 532.81. | 488.5; 528 stays |

## Track 5 ledger outline

**Ratchet: the tar**, which already exists (irreversible, starts on the collapse). Before 336.83 nothing is permanent: the light offers and takes back. After it, everything is. Remove the haze discs first.

| # | Window | Music | What is lit | Camera |
|---|---|---|---|---|
| S0 | 0–70.02 | intro | Dim crown only. | existing wide |
| S1 | 70.02–139.08 | first arrival ✅ | Light comes down to egg and hand: the clean sculpture, offered. Today 60 s and 120 s are identical (0.28 / 0.29 %). | same hold |
| S2 | 139.08–200.00 | drums out ✅, back at 170.69 ✅ | Withdraws to the crown; at 170.69 gives back flower and egg, not the hand. | cue 135 → 139.08 |
| S3 | 200.00–336.83 | full-band drop ✅ | Hard, narrow key on hand and egg: the "before" picture (the 203 s framing). | cue 198 → 200.00; the 318–337 close-up stays |
| S4 | 336.83–391 | collapse ✅ | Tar starts at the base; the flower drops to grey so the wet edge is brightest. | existing |
| S5 | 391–433 | authored window, no confirmed event | Only the frontier: a wet line crossing a finger. Today 391 s is 0.00 % lit. | the liked close frontier shot |
| S6 | 433–532.86 | long tail (no confirmed inner event) | S3's exact framing and light return; the hand is now black and wet (478 s). | S3 framing, hold |
| S7 | 532.86–≈543 | last note ✅, reverb clears | Direct light off; one wet glint; black at about 543. No 558.55 reopen. | hold |

The Gemini-only events (T5 281.97; T1 85.38 and 128.5) are left out until measured.

## Album

**More uneven, and still better.** Peak exposure is comparable across the three (frame mean 19.2 at T1 384 s, 18.8 at T4 293 s, 14.0 at T5 337 s). The outliers are saturation (0.53 against ≤ 0.17) and legibility: Track 4 becomes the only film with nameable states. Auto-advance then drops the viewer into Track 5's first two minutes at 0.28 % lit with haze discs, and it will look broken by comparison.

Order:
1. **Track 4 trims** (colour, cone, shadow, the 319 wide), then the owner watch with sound. Don't ship it orange.
2. **Track 5 subtractions** in the same pass: haze discs and the 532.86 → 543 ending.
3. **Track 1 S0–S2 only.** It is the front door.
4. **Track 5 full ledger.** The ratchet is already built.
5. **The rest of Track 1.**

## Confidence

- **Stills can't show** whether the nine restrikes read as progress or repetition, whether F's sag differs from a stutter, the tube's real brightness, or the ember.
- **Silence can't settle** F vs A, the 66.15 fingers moment, or whether a 4 s whole-room hold at 319 fits the fade.
- **The Track 1 stations** assume a receiving surface where the 125 s and 216 s frames show a pale panel; I haven't seen that room's geometry.
- **Most solid:** the palindrome, the missing S2 wall, the hue split, and the arms falling under their own gate.
