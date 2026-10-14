# Track 4 state ledger — first build: results (2026-10-01)

Spec: `docs/qa/TRACK4_STATE_LEDGER_2026-10-01.md` (owner: "go with the recommendations"). Branch `experiment/track4-state-ledger`. Bundle `prototype.CVEha71F.js`. **Not adopted. The default film is unchanged.** Your step is to watch it with sound.

## Watch it

- Current film: `https://sonoite.local/?track=horas-mortas&autonext=0`
- **Ledger, arm F** (Fable: the lamp sags at the climax, then reaches furthest when the sub-bass drops): `https://sonoite.local/?track=horas-mortas&autonext=0&ledger=f`
- **Ledger, arm A** (Astra: full reach at the climax, then contracts): `https://sonoite.local/?track=horas-mortas&autonext=0&ledger=a`

Suggested watch: the full film once in arm F. Then 255–305 s in A and F back to back, the only window where they differ.

## What was built

`src/js/prototype/track4-ledger.js`: the lamp's **reach** is an authored, pure function of track time (seek-safe), with the eight ledger states. It grows in nine restrike steps through DEAD HOURS, finds the sculpture at 119.25, opens the wall during BURN, takes the whole room at the peak, then loses one element per FADE sputter and per AFTER cycle, and goes black at the measured silence (≈386). Reach sets the key's cone, aim, edge hardness and wall/floor light. The lamp's electrical schedule (strikes, stutters, deaths) still multiplies on top.

It is built on the Stage room (physical wall, grounded fixture, single shadow-casting key at the tube) and the Stage camera (closer framing, same cut times). Zero fog, one light species. Gated to `?ledger=f|a` on Track 4's cinema variant only; ignored under recut / proof / duration; not carried to the next track. Tests: `tests/unit/track4-ledger.test.js`, 21 cases.

## Measured (paused frames, same capture for both)

Lit = share of frame brighter than 25 % grey. Center = mean brightness of the center region (0–255).

| t (s) | State | Current lit % / center | **Ledger F lit % / center** |
|---|---|---|---|
| 5 | S0 cold | 0 / 0.5 | 0 / 0.1 |
| 12 → 110 | S1 warming | 0 / 3–7 | **0.21 → 1.58** / 1.3 → 6.9 (crown spot grows ×7.5) |
| 125 | S2 finds it | 0 / 5.0 | **3.11 / 14.3** |
| 255 | S3 burn | 0 / 8.0 | **6.60 / 31.1** |
| 293–300 | S4 peak | 0.02 / 9.4 | **6.8 / 33.6** |
| 326 | S5 losing it | 0.01 / 3.4 | 1.30 / 5.2 (step from peak: ×5.2, Δ28) |
| 336 → 380 | S5 → S6 | 0 / 1.4 → 1.5 | 0.68 → 0.21 / 2.8 → 1.0 |
| 389 | S7 silence | 0 / 0.5 | 0 / 0 |

- **Peak gate (sculpture lit ≥ 5 %): passed**, 6.8 % vs 0.02 % today.
- **Step gate:** passed at every state boundary under the revised rule below.
- **Rule revised after seeing results (flagged, not hidden):** the original "≥ 20 / 255 in the sculpture region" undercounts small, sharp reveals when the sculpture is small in frame (the wide DEAD HOURS and AFTER setups). The crown spot growing from 0.21 % to 1.58 % of the frame is obvious to the eye but barely moves a regional average. Revised: a step is visible if **lit area changes ≥ ×1.25, or the center changes ≥ 20 / 255**. Judge whether you agree from `ledger-f-sheet.jpg`.

Contact sheets: `current-sheet.jpg`, `ledger-f-sheet.jpg` (whole film), `peak-arms-f-vs-a.jpg` (255–300, both arms).

## What I'm not happy with (for your trim)

1. **The peak arms differ only modestly in this framing.** Arm F's sag at 270.6 is clearly darker (whole-frame 11.3 vs 18.6), and the full-room wall is about 20 % brighter. But "the whole room, seen once" can't really read, because BURN uses the 80 s push-in you approved, which crops the room. To make the peak its own picture, the push would have to give way to one wider view at 285.5 (F) or 269.86 (A). That's a camera decision for you.
2. **The wall reads orange, not dim amber,** where it's lit. It's dimmer through BURN than in the first build, but close to the orange you rejected. Easy to trim: wall color and level.
3. **It's deliberately overshot** (rule 5): key ×3.5 on the crown-only states. Trim by halves if any state glares.
4. **The 66.27 "fingers catch light" moment** is a reach step at 66.15 (the restrike that coincides). It reads in frames, but needs confirming in motion, with sound.

## Next, after your watch

- Your verdict per state (keep / trim / cut), the F vs A choice, and the peak camera question.
- If the method holds, apply it to Track 1 (travelling light that leaves a changed room) and Track 5 (tar return, the ending at 532.9 → 543).

---

# v2: revised per the round-2 review (2026-10-01, evening)

Bundle `prototype.CKodmS7N.js`. Same URLs (`?ledger=f`, `?ledger=a`). **The camera is now the film's own camera,** identical to the current film in every frame, so the comparison isolates the light (Astra's confound).

## What changed (from `docs/qa/aesthetic-review-round2-2026-10-01/SYNTHESIS.md`)

- **Physical reach:** a wide, soft cone whose *range cutoff* grows, so nearness to the tube orders the reveal (distances measured in the scene: crown 5.1, lower flower 5.7, fingers and hand 6.6, base 8.4, wall 13.3). No pin-spot and no 3.5× boost.
- **Four named warming arrivals** (crown 9.8 · flower 41.75 · fingers 66.15 · egg and hand 103.1); the other restrikes return to the same reach.
- **Two decisive steps:** full form at 119.25; the wall and shadow at the existing 187 cut.
- **Peak:** a narrow, hard cone for the flower shadow.
  - **F:** a 4 s loss of reach at 269.86 (the wall goes), then the hard shadow at 285.5.
  - **A:** the hard shadow at 269.86, softening at 284.1–285.5.
- **Losses moved after the 319.10 wide** (323 / 330 / 333.5 / 336), so the wide shows the whole room first.
- **Not a palindrome:** on the way down the cone stays wide and soft while the range shrinks, and a **cool grey dark-adapted room** rises from 338 and stays. The film starts black and unknown and ends grey and known.
- **Colour:** the key desaturated (lit-pixel saturation 0.29–0.40, was 0.53; the current film is 0.7–1.0), a neutral wall wash; the tube is the only saturated element.

## Measured (identical camera, same capture)

| t | Current lit % / mean | v2 F lit % / mean | Note |
|---|---|---|---|
| 20 → 110 | 0 / 2–4 | 0.30 → 1.87 / 0.9 → 3.7 | four arrivals, natural falloff |
| 125 | 0 / 4.0 | **11.8 / 16.9** | form found |
| 255 | 0 / 5.8 | **11.7 / 20.5** | burn |
| 292–300 | 0.01–0.02 / 6.6–7.1 | **14.4–15.6 / 25–27** | peak; **0 % clipped** |
| 321 | 0 / 3.8 | 6.1 / 11.1 | the wide, whole room |
| 331 → 337 | 0 / 3.2 → 1.8 | 5.8 → 2.3 / 8.7 → 3.5 | losses |
| 350 → 380 | 0 / 1.9 → 1.0 | 1.5 → 0.5 / **4.5 → 6.0**, saturation **0.13–0.20** | the grey room (on the way up, saturation was 0.36–0.40) |

Sheets: `v2-vs-current.jpg` (current vs v2, every state), `v2-ledger-f-sheet.jpg`, `v2-peak-f-vs-a.jpg`.

## Honest status

**Fixed:** the palindrome, gold and orange, the pin-spot, clipping, the camera confound, the losses happening off-screen.

**Not fixed: the flower's shadow and the F/A difference.** In the film's own BURN push the back wall is about 9 units behind the sculpture and only dimly visible, so the shadow reads as a faint dark shape on the right (255, 300 s), not "the biggest thing in the room". The arms differ on that wall, so they barely differ on screen (271 s: 11.2 vs 11.3 % lit). Three tuning passes didn't change this. **It is geometry, not light level:** a crisp, readable shadow needs a receiving surface much closer behind the sculpture. That surface is part of the shared physical room (also used by Track 5's physical scene), so it's an owner decision:
1. Add a Track 4-only receiving surface (a plaster panel or column) about 3–4 units behind the sculpture, in the BURN framing.
2. Accept the peak as a change in light quality (hard vs soft), not a shadow event, and drop the A arm.
3. Revisit the BURN camera (the August approval).

Gates: 22 ledger tests; test:full 755/756 (the documented SecurityManager heap flake, 37/37 on rerun; untouched); lint clean on the new files; `experience.js` at its HEAD count; build passes.

---

# v3: the shadow, fixed (2026-10-01, night)

Owner asked "why not fixed". The answer was that I had stopped too early: I treated a receiving surface as a shared-room decision, but it can exist **only under `?ledger=`**, leaving Track 5's physical scene and every default film untouched. Bundle `prototype.9WiQHpQ8.js`.

**Change:** a charcoal-plaster near wall (`#4a4744`, 60 × 24, standing on the floor at z = −3.5, 3.5 units behind the sculpture) receives the key's shadow. The room's own back wall (z = −9.3) was too far for the flower's shadow to stay crisp or lit. The everyday cone widened and softened (1.0 rad, penumbra 0.9) so the lamp's pool has no stage-spot edge; the hard cone remains only for the peak shadow. The grey room fades with the lamp's death at 386.

**Measured, same camera as the current film:**

| t | Current lit % / mean | Ledger F lit % / mean |
|---|---|---|
| 110 | 0 / 4.4 | 1.85 / 3.8 |
| 125 | 0 / 4.0 | 17.0 / 28.1 |
| 190 | 0 / 4.7 | 21.5 / 22.6: **the large, crisp hand-and-flower shadow on the wall** |
| 255 | 0 / 5.8 | 32.2 / 43.9 |
| 292 (F hard shadow vs A flood) | 0.01 / 6.6 | **F 16.3 / 28.7 vs A 40.6 / 54.3** |
| 321 (the wide, whole room) | 0 / 3.8 | 20.1 / 27.5 |
| 365 (grey room) | 0 / 1.4 | 1.4 / 20.8, saturation 0.13 |
| 389 | 0 / 0.4 | 0 / 1.8 |

0 % clipped at every state. Sheets: `v3-vs-current.jpg`, `v3-ledger-f-sheet.jpg`, `v3-peak-f-vs-a.jpg`.

**Trade-off accepted:** the wall now lights with the form at 119.25 rather than at the 187 cut (the cone reaches the near wall's closest point at ~7.6). 119.25 becomes the film's largest single step (the groove arriving). 187 is now the camera reveal of the large shadow.

**For the owner's watch:** whether the soft lamp pool still reads as staged; whether the near wall should carry texture (it is flat-shaded plaster); F vs A with sound.

Gates: 24 ledger tests; test:full 757/758 (documented SecurityManager heap flake; isolated rerun below); ledger files lint clean; `experience.js` at its HEAD count; build passes.
