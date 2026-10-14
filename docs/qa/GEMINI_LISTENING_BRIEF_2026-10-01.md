# Gemini listening brief — audio-to-visual sync pass (2026-10-01)

**Why Gemini:** it is the only model in the toolchain that can actually hear audio. Its job here is to *listen* and map the music; it does not edit code. Claude/Codex turn its map into specs; the owner judges the result live.

**How to run (interactive — headless `agy -p` launched a background analysis tool and returned without listening, 2026-10-01):**

```bash
cd "<wp-uploads>/2025/08"
agy --model gemini-3.8-flash-high --mode plan \
  --add-dir "<repo>" \
  -i="$(sed -n '/^## PROMPT/,$p' '<repo>/docs/qa/GEMINI_LISTENING_BRIEF_2026-10-01.md')"
```

**Then, before anything else, type one line naming the track:** `Track 1: ./01-sonoite.mp3` (or `Track 4: ./04-Horas-mortas.mp3` / `Track 5: ./05-Nao-querer-nada.mp3`). Check its Step 0 calibration against the ground-truth lengths in the cue tables before trusting the rest.

Run one track per session (context stays clean); save each reply as `docs/qa/gemini-listening-2026-10-01/<slug>.json`. This uploads unreleased masters to Google — owner-requested.

---

## PROMPT (everything below is for Gemini)

You are the audio-perception reviewer for **Sonoite**, a seven-track album presented as audio-reactive Three.js "chamber films": one sculpture (a hand holding a flower, an egg) in a dark room, lit and filmed according to an authored score. You can hear audio; nobody else on the team can. **Listen to the actual audio content.** Never infer from filenames, metadata, waveform-free guesses or the cue tables below — the cue tables are what the *visuals* do, and your job is to check them against what the *music* does. Do not modify any files.

### Step 0 — calibration (answer first; we check these against ground truth)

For the track you are given: (a) total duration in m:ss.mmm; (b) the timestamp where a steady pulse first becomes clear; (c) tempo in BPM if one exists; (d) the timestamp where sound fully ends (last audible tail). If you cannot hear the file, reply exactly `CANNOT_HEAR_AUDIO` and stop.

### Step 1 — musical event map

Listen to the whole track. List every musically significant event with a timestamp (seconds, 2 decimals): section boundaries, entries/exits of instruments or voice, drops, builds and their peaks, rhythmic changes, sudden silences or near-silences, harmonic turns, the climax, the final decay. For each: `type`, `description` (concrete — what instrument/sound does what), `salience` 1–5 (how strongly a first-time listener feels it), `character` (e.g. "tension rising", "release", "intimate", "violent").

### Step 2 — compare with the authored visual score

For each visual cue in the table for your track, classify:
- `hit` — lands on a musical event (≤ 0.25 s off)
- `near` — musically motivated but off by 0.25–2 s (give the corrected time)
- `orphan` — lands on nothing audible
Then list `unanswered`: musical events with salience ≥ 4 that have **no** visual cue within ±1 s.

### Step 3 — proposals (make the visuals more interesting *and* more matched)

For each `unanswered` event and each weak passage, propose one visual response. Constraints you must respect (the project's binding doctrine):
- **70 / 25 / 5:** 70 % authored macro arc, 25 % autonomous breathing, 5 % audio punctuation. Camera, sculpture pose, phase changes and palette **never react to live audio directly** — they are *authored to the music*, which is what your timestamps enable.
- **"If the viewer can't tell what changed, the change didn't happen."** Prefer one legible change over many subtle ones.
- Channels available: key-light position/intensity/angle, wall/shadow, floor, haze/fog, grain/grade per phase, surface (roughness/gloss of petals), a camera cut or slow move at an authored time, onset accents (short light/haze breath on transients).
- Name the channel, the exact time window, the musical reason, and the expected perceptual result. Flag anything that would fight an existing cue.

Also note: long passages where nothing visual changes but the music develops (boredom risk), and places where the visuals change but the music is static (distraction risk).

### Output (JSON only, one object)

```json
{
  "track": "<slug>",
  "calibration": { "duration": "m:ss.mmm", "pulse_start_s": 0, "bpm": 0, "sound_end_s": 0 },
  "events": [ { "t": 0.00, "type": "", "description": "", "salience": 1, "character": "" } ],
  "cue_check": [ { "cue_t": 0.00, "cue": "", "verdict": "hit|near|orphan", "corrected_t": null, "note": "" } ],
  "unanswered": [ { "t": 0.00, "event": "", "salience": 5 } ],
  "proposals": [ { "window_s": [0, 0], "channel": "", "change": "", "musical_reason": "", "expected_result": "", "conflicts": "" } ],
  "boredom_risks": [ { "window_s": [0, 0], "note": "" } ],
  "distraction_risks": [ { "window_s": [0, 0], "note": "" } ],
  "confidence_notes": ""
}
```

### Cue tables (what the visuals currently do — extracted from `src/js/prototype/films/*.js`, 2026-10-01)

**Track 1 — `01-sonoite.mp3` (default visual: quiet scene).** Ground-truth file length 538.12 s.
- Phases: ASCEND 0–125 · FRACTURE 125–316.65 · HUSH 316.65–366.8 · ECLIPSE 366.8–488.5 · MEMORY 488.5–539
- Camera cuts/moves: 0, 35.4, 62.83, 90.26, 125, 157, 177.88, 210, 253, 277, 310.35, 316.65, 336, 359.9, 367, 375.05, 384.03, 392.2, 399.05, 411.5, 425.2, 438.9, 459.5, 488.5, 528
- Lighting score: 0, 35.4, 62.83, 90.26, 103, 109, 119, 125, 157, 177.88, 210, 229, 253, 277, 300, 310.35, 316.65, 336, 359.9, 367, 375.05, 384.03, 440, 488.5, 503.59, 526, 535, 538
- Event beats (punctuation): 35.4, 109, 125, 133, 157, 205.5, 316.65, 336, 367, 374.55, 375.05 (detonation flash), 384.03 (room reveal), 411.5, 520, 526, 532.8, 535 (extinction)
- Known authoring assumption to verify: 140 BPM grid anchored at 35.4 s.

**Track 4 — `04-Horas-mortas.mp3`.** Ground-truth file length 391.18 s. Premise: a failing sodium street-lamp; the light outlives the song.
- Phases: DEAD_HOURS 0–119.25 · WAKING 119.25–238.15 · BURN 238.15–318.35 · FADE 318.35–338.05 · AFTER 338.05–386 · TERMINAL 386–391.18
- Camera: 0, 119.25, 187, 238.15 (80 s push begins), 317.6 (arrival), 319.1, 338.05, 386
- Lamp blackout pockets (lamp dies and restrikes) in DEAD_HOURS start at: 0, 12.9, 25.25, 37.55, 49.8, 62.2 … (9 total) — check whether these sit on musical gaps/accents.
- Room pressure beats: 0, 119.25, 238.15, 318.35, 323, 330, 333.5, 334.5, 338.05, 386, 391.18. Electrical rallies at 330 and 334.5. Music is assumed to die near 338; AFTER is the lamp alone — confirm when the music actually ends.

**Track 5 — `05-Nao-querer-nada.mp3`.** Ground-truth file length 563.93 s. Premise: tar slowly coats the sculpture, irreversibly.
- Phases: VOID 0–64 · AWAKENING 64–135 · RELEASE 135–198 · WANTING 198–246 · WANTING 246–337 · RELEASE 337–534 · ERASURE 534–564 (WANTING and RELEASE each appear twice by design — not a typo)
- Camera: 0, 42, 64, 135, 198, 246, 317, 337, 470, 510, 534, 558
- Event beats: 64, 141, 198, 246, 317, 317.85, 337, 470, 534, 558
- Physical-scene trial only: close tar-frontier shot 391.43–432.91 s (bar 149 → bar 165 on a 90 BPM grid).
- Open question: the film goes dark at 534 and reopens a final image (`ws_final_trace`) at 558.55 s. Tell us where the last *musical* moment that deserves a final image actually is.
