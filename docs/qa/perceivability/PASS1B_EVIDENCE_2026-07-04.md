# Pass 1b Evidence — 2026-07-04

Pass 1 implementation is now complete (Pass 1a: Prompts #128–129; Pass 1b: Prompts #130–133).
This doc is the evidence package for the **Gate 1 owner session**. The verdict goes in
`PASS1_VERDICT.md` (to be written from Ricardo's live viewing — blocks Pass 2 planning).

All verification on a fresh `npm run build`, live `?prototype=1`, wall-clock seek-sync
recipe from `BASELINE_2026-06-10.md`. Screenshots (jpeg q35) in
`.playwright-mcp/track5-pass1b/` (gitignored, local only). Console clean (0 errors/warnings)
after every change.

## What landed in Pass 1b

| Prompt | Change | Verified |
|---|---|---|
| #130 | ChamberGrainShader pre-AgX clamp removed | 0 blown pixels at 434s (RELEASE) and 334s (peak pressure 0.878); maxLum 95–107/255 |
| #131 | ChamberGradeShader color clamp removed (mixAmount clamp kept) | 0 blown, 0 NaN/negative speckle at 44s (VOID) and 244s (WANTING, contrast 1.3); maxLum rose to 168/255 — more highlight energy now reaches AgX |
| #132 | Grain floor in blacks: weight `mix(0.4, 1.0, smoothstep(...))` | 17.35% of dark pixels (lum<12; 97% of frame) show temporal grain between same-timestamp frames — was structurally 0. **0.4 is overshot for trim** |
| #133 | Plate as residue: strength 0.88→0.12, idle 0.36→0.0, erasureBoost 0.34→0.72 | Plate uniform: 0.12 at 244s (near-invisible), 0.69 at 554s (ERASURE ghost return, matches formula). Baseline was 0.880 in all phases. **Values overshot for trim** |

## Frame-fill measurement (1b.4 — verify-only ⚠ item)

| Timestamp | Phase | Fill (lum>8) | Fill (lum>25) | Mean luminance |
|---|---|---|---|---|
| 150s | RELEASE | 5.6% | 3.1% | 2.81/255 |
| 360s | RELEASE | 10.0% | 5.1% | 4.57/255 |

The March "~15% full / object on black" diagnosis **still holds** (it measures thinner than
15% at these beats). Per the Pass 1 plan: not fixed here — **logged as the top Pass 4
candidate** (fog/atmosphere compositing / element reintroduction).

## Gate 1 questions for Ricardo (watch full playthrough, or minimum: one VOID minute → WANTING→RELEASE boundary → ERASURE ending)

1. Can you name the mood change at each phase boundary without being told?
2. Does the relic silhouette read in VOID?
3. Are the blacks alive (grain) rather than dead video black?
4. Did the plate stop being "a picture on the wall" and become residue that returns at ERASURE?
5. Any blown or harsh highlights after the un-clamps?

Trim candidates on the table: grain floor 0.4, plate erasureBoost 0.72, per-phase grade
mix/saturation, backlight ratio (from Pass 1a).

## Portability note (mechanism vs Track 5 content)

- **Reusable mechanism:** un-clamped grain/grade passes (any track), grain-floor pattern,
  plate strength/idle/erasureBoost schedule driven by the phase-erasure scalar.
- **Track 5 content:** the specific gradePhases table, plate residue values, phase windows.
