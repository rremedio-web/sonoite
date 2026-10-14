# Track 5 ledger: results

## v1 (2026-10-02), bundle `prototype.7a6a4vWF.js`

Measured inside the sculpture's projected region (Track 5's own gate per round A; frame-wide lit % is biased toward lighting the room, and a good black coating should *lower* it).

| t | State | Region lit % | Region mean | Note |
|---|---|---|---|---|
| 30 / 69.5 | S0 | 4.3 / 5.2 | 8–10 | edge only |
| 71 / 120 | S1 offer | **15.6** / 15.3 | 26 | cut on beat 106 |
| 139.5 / 160 | S2a take back | **1.4** / 1.7 | 7 | one step |
| 172 / 199.5 | S2b partial | 10.9 / 11.8 | 21–24 | |
| 201 / 260 / 320 | S3 before | 8.2 / 29.0 / 38.0 | 13 / 53 / 74 | P1 / P2 / P3 |
| 338 / 360 | S4 collapse | 11.2 / 11.9 | 21–23 | low key |
| 410 | S5 frontier | 8.4 | 17 | wet boundary visible |
| 440 / 480 / 515 | S6 proof | 19.8 / 6.0 / 10.3 | 39 / 10 / 15 | |
| 533.5 / 538 / 545 / 560 | S7–S8 | 0.9 / 0.6 / 0.1 / 0 | 3.6 → 0 | black, no reopen |

**Proof pairs** (same setup, same key):

| Pair | Tar at "after" | Region mean | Highlights (p99) |
|---|---|---|---|
| P2, 260 → 440 | 0.50 | −27 % | held |
| P1, 201 → 480 | 0.74 | −26 % | fell |
| P3, 320 → 515 | 1.0 | **−80 %** | fell |

The ≥ 40 % gate is met only where the coating is complete. The visual difference is clear in all three on the sheet (`v1-ledger-sheet.jpg`).

**Open for round B:**
- The collapse frames (338–360) light the still-clean lower hand brightly.
- The 320 s flower close-up is the brightest frame (owner note on Track 4: "a bit too bright").
- Highlights fall in two pairs: is the tar reading wet enough, or just dark?
- Fable vs Astra on 139.08 / 170.69 (cut vs keep the camera). v1 keeps the camera.

---

## v2 (2026-10-02, afternoon): round B + Gemini, bundle `prototype.BAkyMdgg.js`

### Corrected music times (this changes yesterday's map)

Gemini's first truly independent listen (fresh project, neutral filename) disagreed with 2026-10-01 on Track 5's key times, so each candidate was re-measured in the master at **0.25 s** resolution (sub-band, high band, onsets). **Yesterday's grading used 3 s averages and smeared the real 64.34 step into a false 70.02.**

| Event | 2026-10-01 | Measured now |
|---|---|---|
| First heavy kick | 70.02 ✗ | **64.34** (sub +13 dB) |
| Drums drop out | 139.08 ✗ | **135.53** (onset 135.50) |
| Return | 170.69 | **170.69** ✓ (full +2.4) |
| Full drop | 200.00 (hats) | **198.75** (sub +5.3, onset 198.72) |
| Collapse | 336.83 ✗ | **335.50**: the last kick and crash; after it only decay, no new hits |
| End of music | 532.86 + "reverb clears 543" ✗ | 532.86 is the decline (−4 dB); a **quiet coda** of kicks runs to the **last kick at 559.00**; the file ends 563.93 |

The authored cuts at 64 / 135 / 198 / 337 were nearer the truth than the round-A "cuts lead hits by 1–6 s" (which was based on the wrong map).

### What changed in v2

- **Corrected times.** Light steps on the measured hits (time-based, exact). Camera cuts:
  - 64.00 (downbeat, 0.34 s ahead of the kick);
  - 198.67 (beat 302, 0.08 s ahead of the drop);
  - 335.66 (beat 507, 0.16 s after the last crash).
- **K is a true side key** at `[-0.2, 6.5, 7.4]` (Fable round B), 54–77° off every lens, so the sculpture is modelled, not flat. Gain 140 → 100. "Before" range 13 → 18 (floor contact). Offer level 0.5.
- **Collapse key on the floor** `[5.5, -1.2, 3.2]` at 0.3, so the tar's arrival is the event, not the clean hand (both reviewers). The frontier keeps v1's aim at 0.3.
- **Wet strip:** a long, narrow area light near R (0.25 × 2 u), constant from the drop to the coda so the before and after states still match. Ledger tar roughness 0.20.
- **The tar completes:** frontier overshoot 0.12, so the edge band clears the crown.
- **`ecu_surface` re-aimed** (it pointed at the empty box top).
- **Close-ups trimmed symmetrically** (×0.75 on clean 299.53–335.5 and coated 510.67–532.86).
- **The ending follows the coda:** K off at 532.86; R and the strip fade to the last kick at 559.00; then black. The 558.55 reopen stays removed.
- **139.08 / 170.69:** both reviewers agreed after seeing v1: keep the camera, change only the light.

### Measured (sculpture region)

| Check | v1 | v2 |
|---|---|---|
| Drop vs partial return | went down (8.2 vs 11.8 % lit) | **×2.83** (15.3 vs 5.4 %) |
| Order S0 < S2b < S1 < S3 (region mean) | no | 8.3 < 11.9 < 12.9 < 26.5 ✓ |
| Collapse reads as an offer? | yes (clean hand 21–24) | **no** (region mean ≈ 10; tar visible at the base by 375–390) |
| P1 pair 199 → 480 | −26 %, highlights fell | **−52 %, highlights 93 % kept** ✓ (round-A proof gate) |
| P2 pair 260 → 440 (tar 0.5) | −27 % | −27 %, highlights 100 % kept; visually the film's proof frame |
| P3 pair 320 → 515 | −80 % | −80 %, highlights 53 % kept |
| Close-up pixels > 230 at 310 / 320 | 1.8 % of frame at 320 | **0 / 0** |
| End | 545 not black | coda glints fade; **560 black** (563 faint specks, see below) |

### Gemini's second listen (sighted, v2 times): `gemini-verify-v2.json`

**16 of 19 picture changes HIT** (≤ 0.15 s): every light step, the drop cut, all authored cuts (246 neutral; 280.79, 299.53, 318.26, 391.43, 432.91, 469.20, 510.67), and the coda ending (532.86 → 559.00). The 64.00 cut is NEAR (0.34 s early; the light is on the kick).

It flagged the collapse at 336.20 / 336.33 as a MISS. Measurement agreed (only decay there; the last hit is 335.50), so the collapse was moved onto 335.50 / 335.66 and live-verified.

**Gemini's suggested additions (not built, owner's call):**
- **408.00:** sub-kick re-enters after the breakdown (measured +4.6 dB), inside the frontier close-up you liked: maybe a light step, not a cut.
- **268.30:** the climax snare.
- **308.11:** the last distortion tier.
- **96.06:** a rim layer enters.

### Still open

- The coated flower (515) sparkles more than it shines wet; the strip light helped the hand (440, 480) more than the petals.
- Faint specks remain at 563 (the last second of the file), probably the authored film-plate ghost return (a Pass 1b value), so that's your decision.
- The drop at 199 is 15 % region lit (Fable's target was ≥ 25 %); the P1 framing shows the hand from the shadow side. Fable's fallback, swapping P1 and P2 at the drop, is ready if you want it.

Gates: 22 Track 5 ledger tests; test:full 790/791 (signal-pipeline timing test under load average 65; 16/16 alone); ledger lint clean; `experience.js` at its HEAD lint count; build passes.

---

## v2.1 (2026-10-02): round C, Fable's cut plan (owner: "fable"), bundle `prototype.BqV0Qsbj.js`

Round C asked both seats about Gemini's four extra moments (`REVIEW_C_*.md`). Both answered no to 96.06 (not confirmed), 308.11 (energy falls) and 408.00 (gradual, inside the liked frontier shot). Both answered **yes to the 268.24 snare as a *moved* cut, not an added one.** Owner chose Fable's version:
- the unmotivated 246.00 cut is removed;
- the snare gets a cut on beat 406 (**268.08**, onset 268.24) to the hand frame (P1);
- the drop (198.67) now cuts to the full figure (P2).

S3's order (P2 → P1 → P3) now mirrors S6's returns (432.91 P2, 469.20 P1, 510.67 P3).

**Live-verified:** the cut at 198.7 to P2; no cut at 245–247; the cut at 268.0→268.2 to P1; 281 is unchanged.

| Check | v2 | v2.1 |
|---|---|---|
| Drop region lit (199.5) | 15.3 % | **24.0 %** (×4.5 over the partial return) |
| P2 pair (199.5 → 440, tar 0.5) | n/a | −34 %, highlights 99 % kept |
| P1 pair (275 → 480) | −52 % (199 → 480) | **−51 %, highlights 93 % kept** |
| P3 pair (320 → 515) | −80 % | −80 % |

Total picture changes stay at 19. Gates: 22 Track 5 tests; lint clean; build passes.
