# Track 5 review, round B — Fable seat (2026-10-02)

Runtime: Path B prototype, Track 5 with `?ledger=1`. Read-only, stills only, no sound; nothing was written or changed. "Region" numbers are from RESULTS.md. "Sheet" numbers are my own readings of `v1-ledger-sheet.jpg` (0–255, small JPEG cells, so indicative).

## Verdict

v1 builds the ledger's structure: hard steps, the take-back, the collapse on camera, matched returns and a black close, and 260 → 440 is the first pair in this film that proves the ratchet. It misses my intent in three places: the key is frontal instead of a side key, the 200.00 drop is the dimmest of the three offers, and the tar's first 23 s still can't be found in the picture.

## Q1. Did v1 build the intent?

**Built:**
- Cuts land only on confirmed hits before the collapse (69.92, 200.00), with none after 510.67.
- No setup is beyond 17.5 u.
- The take-back works (120 → 139.5: region lit 15.3 → 1.4 %).
- P3 is re-aimed, so the flower is centred at 320 and 515.
- S6 reuses S3's key values.
- The 558.55 reopen is gone.

**Differs:**

1. **K is frontal.** `K_SIDE` sits at azimuth 0.93 rad around its target. P2 looks from 0.785, P3 from 0.9 and `mcu_right_low` from 1.2, so in plan the key is 1–16° off the lens. It is 116° round from P1 (`mcu_fracture`, yaw −1.1). So 71, 260 and 320 are flat white with no modelling, and 201 is a self-shadowed figure with rim lines.
2. **The drop goes down.** At 201 s region lit is 8.2 % (mean 13), below S2b (11.8 %, mean 21–24) and S1 (15.6 %, mean 26). The "whole sculpture" arrives at 246, not on the hit.
3. **S1 is not "half level, pale grey".** The flower at 71 is near-white (sheet peak ≈ 238, against ≈ 250 in S3).
4. **No floor contact.** At 260 nothing registers under the base (sheet ≈ 6–9). `range: 13` cuts the key off just past the base, which is 11.2 u from it.
5. **S4's key is not on the floor.** `K_LOW` sits about 2.1 u above the base (y 0.3; base ≈ −1.82) and aims at the lower hand. At 360 (tar 0.11) region lit rose (11.2 → 11.9 %) and the bottom of the lit patch looks unchanged from 338, so the tar's arrival is still not visible.
6. **The frontier's light changed.** 410 now has a clipped white patch above the line (sheet peak 254) and is visibly brighter than the physical sheet's 410. LEDGER.md calls it "the liked frontier close-up" without recording that.
7. **545 is not black.** There are specks up to ≈ 92 in the flower's shape, while every ledger light computes to 0 after 543. 560 is black. Something outside the ledger is still on, which suggests the exposure ramp was not retimed.
8. **Both tar-shader faults remain.** The white-noise edge band is unchanged and the frontier does not overshoot the crown (the speckle at 515 and 533.5).
9. **Smaller items.** The collapse cut is at 337.00, 0.17 s after the hit. 280.79 and 299.53 are not on the sheet, and `ecu_surface` still aims at the box top.

## Per state

| State | Call | Frame and reason |
|---|---|---|
| S0 | Keep | 30, 69.5: round A's edge picture, held. |
| S1 | Trim | 71: level 0.7 → 0.5; the side key gives "pale grey from one side". |
| S2a | Keep | 139.5: one step, ×11 down. Check 1.4 % lit is not too dark on a real display. |
| S2b | Keep | 172 vs 120: flower back, hand not (lower figure ≈ 120 → 30 on the sheet). |
| S3 | Change | 201 underlit, 260 flat, 320 clipped: move K, lower it, extend its reach. |
| S4 | Change | 338, 360: key onto the floor and down in level; prove the tar line. |
| S5 | Trim | 410: reads well, but bring the clipped patch down. |
| S6 | Keep, fix inputs | 440 is the film's best frame. 480 fails only because 201 is dark. 515 reads dim, not coated. |
| S7 | Trim | 533.5, 538: dots, not the lines I asked for; re-judge after the wet fix. |
| S8 | Change | 545: residual specks; must be black from 543. |

## Open items

**(a) The collapse lights the clean hand.** This is partly my own spec ("K drops to the floor") and partly the build. The cone is centred on the hand, at level 0.5, and frontal, so 338 and 360 show a clean white patch (sheet ≈ 190–215). That reads as an offer, not a collapse. Keep the idea of lighting where the tar will arrive, but put the key on the floor and dim it, so the tar consumes the whole lit patch by about 385.

**(b) 320 is the brightest frame.** It breaks my round-A limit (no hotter than the old 205 flower). 1.8 % of the frame is above 230, and it is the only frame whose background lifts (sheet mean 2.7 against ≈ 1.2 elsewhere). Trim the shared key, never this shot alone, so S6 moves with it.

**(c) Wet, or only dark?** Only dark, and at 515 not even dark: the coated flower is mid-grey (sheet ≈ 100–140), a satin sheen. A frontal key on roughness 0.30 sends a broad reflection straight back to the lens. Highlights "held" at 440 only because the clean upper half carries them. The pinpoint peaks (≈ 250) in every coated frame are glitter.

**(d) 139.08 / 170.69.** Astra was right; keep v1. On one camera, 120 → 139.5 → 172 reads as light removed and partly returned, and "the hand does not come back" is legible because nothing else moved. My cut back to the opening frame would have read as a new shot. I give up "S2a = S0 exactly".

## Q4. Its own film?

Yes in grammar: cold, black background (sheet ≈ 1), no wall, no shadow event, no lamp, hard steps, and an ending in black. Track 4's ledger frames are sepia with a wall and a cast shadow.

The weak point is the first 337 s. It is the same sculpture as Track 4, and a flat white flower in a void (71, 172, 260) is Track 4's flower minus its room. The side key and the take-back are what make the "before" Track 5's own.

## v2, ranked

1. **Move K to a true side key.** `K_SIDE` → about `[-0.2, 6.5, 7.4]` (azimuth −0.15, same height), which is 54–77° off every lens, including P1. Fallback if 201 stays low: 200.00 → P2 and 246 → P1.
   *Verify:* 201 region lit ≥ 25 % and ≥ ×1.5 over 199.5; region mean ordered S0 < S2b < S1 < S3; the 515 flower under ≈ 60 on the sheet outside highlights.
2. **Lower K and extend its reach.** `K_GAIN` 140 → 100, `range` 13 → 18, `BEFORE.target` y 2.0 → 1.4, S1 level 0.5.
   *Verify:* 320 has no pixel above 230; at 260 the base reads at half the mid-figure level or more, with a visible floor ring; background ≤ 1.5 in every S3 and S6 frame. If the wall appears, shorten the range first.
3. **Put S4's key on the floor.** S4 only: position `[5.5, -1.2, 3.2]`, target y −1.7, angle 0.26, level 0.3. S5 keeps v1's aim at level 0.3.
   *Verify:* frames at 345 / 360 / 375 / 390; the clean lit area falls in each one and the tar line can be found at 360 at sheet size; the 410 peak is under 230.
4. **Make it wet with a strip source that is itself a control.** `softbox` 0 → about 0.4 as a starting point, constant from 200.00 to 543 so S3 and S6 still match; `tarRoughness` 0.30 → 0.20.
   *Verify:* 260 region mean moves less than 5 %; in the coated area at 440 and 515, bright spots become fewer and longer; coated p99 ≥ 60 % of the clean frame's.
5. **Black at 543.** Dump light intensities and exposure at 545, and retime the exposure ramp to 532.86 → 543.
   *Verify:* region max under 8 from 543.5.
6. **Close the crown, then the edge.** Overshoot the frontier by 0.12 of the span. Narrowing the noise band (0.12 → 0.04) is an A/B at 410 only, because the owner liked that shot as it is.
7. **Housekeeping.** Put the collapse cut on or before 336.83. Sample 290 and 310. Re-aim `ecu_surface`. Sample the pairs at equal offsets after the cut (320 is mid dolly-zoom, 515 is not).

## Confidence

- **High:** the frontal-key geometry (from code) and its three symptoms; the drop going down; (d); 545 not black.
- **Medium:** every v2 number. They are computed from positions, not rendered. Items 1 and 2 interact, so build them together and re-shoot the sheet.
- **Low:** the tar being invisible at 360 (sheet resolution; it needs a full-size frame); whether the strip light reads wet; step feel, S2a legibility and the last glint, which are motion and display judgments.
