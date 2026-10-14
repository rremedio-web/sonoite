# Gemini listening pass — results and grading (2026-10-01)

Gemini 3.8 Flash (High) via `agy` headless JSON mode, run from the uploads directory. Every Gemini claim below was graded against measurements of the masters (per-second RMS, band-limited RMS at 0.5 s, aubio onsets and beat tracking). **Status: creative input, not owner-accepted. Nothing here changes code.**

Files: `sonoite-sighted.json` (T1, with cue table), `*-blind.json` (per track, without cue table).

> **Correction 2026-10-02 (Track 5):** several Track 5 times below were wrong. The grading used 3 s averages, which smeared real steps. Re-measured at 0.25 s: first kick **64.34** (not 70.02), drums out **135.53** (not 139.08), drop **198.75** (200.00 is the hats), the collapse is the last crash at **335.50**, and a quiet coda runs to the last kick at **559.00** (the "reverb clears ~543" claim is wrong). See `docs/qa/track5-ledger-2026-10-02/RESULTS.md`. Track 4's key times were checked with 0.5 s band measurements and stand. **Track 1's were graded with the same 3 s method, so re-measure them at 0.25 s before authoring anything from them** (the 411.5 check was at 0.25 s; the T1 grid-phase finding used aubio beats and stands).

## How far to trust it

- **Real hearing, accurate timing where the music changes measurably.** Every large energy event Gemini named was confirmed to within about 1 s: T1 46.97 / 82.11 / 316.60 / 367 / 488.43 / 532.81; T4 sub-bass gone from about 285.5 (Gemini said 284.10) and percussion stop at 338.0; T5 70.02 / 139.08 / 170.69 / 200.00 / 336.83 / 532.86. At 0.25 s resolution, its T1 411.52 "breath then slam" is real (−12.6 → −6.9 dB).
- **Contaminated controls.** The "blind" re-runs, which had no cue table, came back with the visual phase names (FRACTURE, HUSH, ECLIPSE, VOID, WANTING, ERASURE, TERMINAL) and the authored boundaries to the decimal. `agy` keeps context across runs in the same project, so the blind runs are not independent. A fresh-project, neutral-filename control (`audio-a.mp3`, `--new-project`) was still running when this was written. Until it lands, treat Gemini's events in steady passages as unverified, and treat its labels as possibly anchored.
- **At least one wrong claim:** T5 499.12 "sudden downward dynamic drop" measures **+4.6 dB**, louder, not quieter.
- **Tempo claims are not usable.** Gemini, aubio and the authored grids disagree (T5: 94 / 122.6 / 90; T4: 78 / 114 / 93.5), which suggests half- or double-time ambiguity.

### Clean control result (T1, `--new-project`, neutral filename `audio-a.mp3`): `sonoite-clean-blind.json`

- **Reproduced:** the large events (pulse 46.98, drop 82.33, breakdown 315.47, climax 368–370, outro 521). These also match the loudness measurements.
- **Not reproduced: 33 of the 42 salience-4+ events from the sighted run**, including every "x.70 downbeat" and most mid-section fills.
- **The control has its own error:** it places the MEMORY change at about 480, where the measured step is at 488.
- **Its section lengths are exact 8-bar multiples at 140 BPM** (27.45 s, 54.88 s), which suggests computed grid boundaries rather than heard ones.

**Rule:** use Gemini for **large structural events only**, and only where a measurement agrees. Never author timings from its fine-grained events. The findings below that rest on measurement (the T1 grid phase from aubio; the unanswered drops; T4 at 284/338; the T5 events) stand independently.

## Findings worth acting on (owner A/B)

**T1 — the grid may be out of phase with the groove (measured, not only Gemini).** Across ASCEND, FRACTURE and ECLIPSE, aubio beats and onsets fall consistently **180–200 ms after** the #207 140 BPM grid anchored at 35.4 s (FRACTURE concentration R = 0.81). Cuts placed on grid beats therefore lead the strongest audible hits by about 0.2 s. Gemini independently heard the phrase downbeats at x.70 (133.7 / 157.7 / 229.7 / 253.7 / 277.7), while the cues sit at x.00. **Test:** play 150–160 s and 250–260 s, then A/B the cues at their current times, +0.19 s, and +0.70 s.

**T1 — the biggest musical events have no visual answer.**
- 82.11 / 85.38: the half-time drop and full groove (salience 5). The camera waits until 90.26.
- 128.5: the broken-beat drop.
- 364.5 → 367: the riser into ECLIPSE.

The longest boredom risks are the static spans 0–35.4, 35.4–62.83, 62.83–90.26, 177.88–205.5 and 459.5–488.5. Gemini's specific proposals are in `sonoite-sighted.json`. They must still pass the 70/25/5 doctrine; for example, its "strobe pulse" proposal does not.

**T1 — two cues land on nothing.** The cue at 62.83 sits 2.5 s after the harmonic swell at 60.32. The lighting cue at 440.0 lands 1.1 s after the 438.9 cut, mid-roar. The cut at 528.0 lands 0.4 s after the chord burst ends at 527.6.

**T4 — the premise holds musically.** Percussion stops at 338.05, so AFTER starts on a real musical death. The sub-bass is gone by about 350, and sound ends at about 388. Musical events with no visual cue: pulse entry 66.27; crash/drop 188.39 (the camera cue at 187.0 is 1.4 s early); climax 269.86; and the sub-bass dropout plus chord bloom at about 284–285.5.

**T5 — the ending question.** The last musical note cuts off at **532.86**, and the reverb tail clears at about 542.9. The authored final cut (`ws_final_trace`, bar 213) fires at **558.55 s** on the curated grid. An earlier claim that it lands after the file ends was wrong. So the film reopens a final image about 26 s after the last note. The musically motivated alternatives are to withdraw light at **532.9** and reach black around **543**. Also unanswered:
- 139.08: the drums drop out. The cue at 135 is 4 s early.
- 200.00: the massive full-band drop. The WANTING cue is at 198.
- 281.97: the track's climax, which has no cue (the nearest are 246 and 317).

## Next

1. Read the neutral-control result. Then decide whether to re-run all three tracks with `--new-project` and neutral filenames before anyone authors timings from these maps.
2. Owner A/B the T1 grid phase (+0.19 s), because it moves every grid-derived cue.
3. Owner decision on the T5 final image: 532.9 or about 543.
