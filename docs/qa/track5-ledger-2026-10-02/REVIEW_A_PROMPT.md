# Track 5 review, round A (2026-10-02): before building its ledger

You are an independent creative director and director of photography, reviewing **Sonoite**, a seven-track album shown in the browser as "chamber films": one sculpture (a hand holding a flower and an egg) in a dark room, lit and filmed by an authored score while the track plays. Today the subject is **Track 5, *Não querer nada*:** a tar-like black wet substance irreversibly coats the sculpture from the collapse at 336.83 s onwards.

This is **read-only**. Do not modify, create or delete any file. You cannot hear the audio and are judging stills. Say when that limits a judgment.

## What already happened (Track 4, the method's first test)

Diagnosis (both of you, 2026-10-01): *changes too small to see; nothing leaves a lasting mark.* Fix: a **state ledger**. States not curves; one ratchet (something only moving one way); visible-or-it-didn't-happen, measured. Track 4 went from 0.0–0.3 % of the frame lit to 14–32 %, with a real cast shadow on a near receiving wall, a non-palindromic descent (a dark-adapted grey room after the music) and three measured edit points. See `docs/qa/track4-ledger-2026-10-01/RESULTS.md`, `EDIT_POINTS.md` and `t4-ledger-v3-vs-current.jpg` in the evidence folder.

## Read first (theme root = current directory)

1. `docs/qa/aesthetic-review-round2-2026-10-01/SYNTHESIS.md`: your shared verdict, plus **your own Track 5 ledger outlines** (ratchet = the tar; the light offers and takes back before 336.83; after it every return keeps the contamination; the ending withdraws at 532.86, black at ~543, no 558.55 reopen; remove the haze discs).
2. `docs/qa/gemini-listening-2026-10-01/README.md`: the music map, graded against measurement. Track 5 confirmed events: **70.02** first arrival · **139.08** drums out · **170.69** return · **200.00** full-band drop · **336.83** collapse · **532.86** last note · reverb clears ~543. The authored cuts at 64 / 135 / 198 lead those hits by 1–6 s. 281.97 (the "climax") is Gemini-only.
3. `docs/qa/MUSIC_INTERACTION_MATRIX.md`: the doctrine (70 % authored arc / 25 % breathing / 5 % audio punctuation; camera, sculpture, phases and palette never react to live audio).
4. `src/js/prototype/films/nao-querer-nada.js`: the authored score (phases, camera bar map, event beats), if you need exact times.

## Owner taste on record

- **Rejected:** orange/candle emphasis, the "PS1" look, broad flat frontal light, decorative "blurry balls" / haze discs, flat decal-looking floor stains (the Stage floor-residue "grey pool").
- **Liked:** the grey mesh in darkness; Track 5's **closer tar-frontier shot** (391.43–432.91, "closer view earns its place"); the cold palette; "a bit too bright" was Track 4's latest note, so restraint matters.

## Evidence (in `docs/qa/track5-ledger-2026-10-02/`; paused frames, labeled in seconds)

- `t5-current-sheet.jpg`: Track 5 as visitors see it today (default route).
- `t5-physical-sheet.jpg`: the same times on the **physical scene** (continuous floor/cove/wall, decorative layers and haze discs removed, the liked tar-frontier cut). **The ledger will be built on this.**
- `t4-ledger-v3-vs-current.jpg`: what the method did for Track 4.

**Measured:** default Track 5 is 0–2.5 % lit except the 320 s close-up (11.9 %). **Camera finding:** several authored Track 5 setups sit 25–40 units away or *behind the room's back wall* (z ≈ −27 to −30 at 75 / 340 / 360 / 410 s). In the physical room those frames see the back of the wall (0 % lit). The camera score predates the room.

## Questions

1. **Diagnosis:** what is Track 5's specific version of "too small / no lasting mark"? Ground it in frames.
2. **The ledger:** turn your outline into a buildable state table: S0…Sn · window · confirmed musical event · **what is lit (one sentence)** · light direction/quality · what the tar has done by then. Keep the ratchet honest (the tar), and say how the post-collapse returns *prove* the change (the same light and framing as a "before" state).
3. **Camera:** which current setups must go or move (behind-wall, too far, empty wides)? Which "before" framing should the "after" return to? Where should cuts sit relative to the confirmed hits (Track 5's grammar allows rhythmic hard cuts; Track 4's did not)? Keep the liked frontier close-up.
4. **The ending, exactly:** 532.86 → ~543 → end of file 563.93. What is in frame at 535, 540, 545 and 560?
5. **What to remove** (haze discs, anything reading as a layer) and **what to protect.**
6. **Risks:** what would make this look like Track 4 with tar instead of its own film? Name what Track 5 must own.

## Output: markdown, at most about 1,800 words

Verdict (three sentences) · Diagnosis · Ledger table · Camera and cut plan · Ending · Remove/Protect · Risks · Confidence.
