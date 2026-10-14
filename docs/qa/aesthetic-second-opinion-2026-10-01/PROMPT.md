# Second opinion: visual aesthetics and listening experience (2026-10-01)

You are an independent creative director and director of photography, reviewing **Sonoite**. It is a seven-track album presented in the browser as "chamber films": one sculpture (a hand holding a flower and an egg) in a dark room, lit, filmed and transformed by an authored score while the track plays. Three films are built: Track 1 *Sonoite*, Track 4 *Horas Mortas* and Track 5 *Não querer nada*. Tracks 2, 3, 6 and 7 have none yet. The product is **a cinematic room that performs the music**, not a visualizer.

This is **read-only**. Do not modify, create or delete any file. You cannot hear the audio. Use the listening map below for the music, and say when a judgment depends on hearing or on motion that stills can't show.

## Read first (theme root = current directory)

1. `docs/qa/END_GOAL_AND_PRODUCT_RESET.md` — what the product is.
2. `docs/qa/MUSIC_INTERACTION_MATRIX.md` — the binding reactivity doctrine: 70 % authored macro arc / 25 % autonomous breathing / 5 % audio punctuation. Camera, sculpture, phases and palette never react to live audio directly. "If the viewer can't tell what changed, the change didn't happen."
3. `docs/qa/aesthetic-deep-dive-2026-09-07/REVIEW.md` — the previous outside review (Sept 7). Judge what has improved since and what hasn't.
4. `docs/qa/FABLE51_DIRECTION_RECOMMENDATION_2026-09-07.md`, `docs/qa/STAGE_HYBRID_TRIAL_2026-09-07.md`, `docs/qa/track1-reference-reset-2026-09-08/README.md` and `CLIMAX_AND_MATERIALS.md` — the latest experiments. None has been adopted by the owner.
5. `docs/qa/gemini-listening-2026-10-01/README.md` — **the music**: an audio-capable model's event map, graded against measurements. Treat the steady-passage detail as provisional; the large events are confirmed. Raw maps: `sonoite-sighted.json`, `*-blind.json`.
6. The `films/*.js` modules under `src/js/prototype/` hold the authored scores, if you need exact cue times.

## Owner taste already on record (respect it; don't re-propose what was rejected)

- Rejected: orange/candle emphasis, "wiggly" flame geometry, the "PS1" look, procedural sine-wave curtains, broad flat frontal light, Track 4's added fog in the latest trial, and flat decal-looking floor stains.
- Liked: the grey mesh in darkness ("works better in darkness" than the separated-material candidate), the Track 1 quiet scene ("i dig it", now the default), Track 5's closer tar-frontier shot ("closer view earns its place"), "less PS1, more natural organic hazy" for Track 4, a darker reliquary focus with subtle, differentiated musical responses.
- References: the Sleep Token videos (*The Summoning*, *Granite*, *Chokehold*, *Take Me Back to Eden*): selective disclosure, light with a location and reach, returns that keep the consequence of a detail shot.

## Evidence (stills; motion is not visible)

In `docs/qa/aesthetic-second-opinion-2026-10-01/`:
- `t1-default-sheet.jpg`, `t4-default-sheet.jpg`, `t5-default-sheet.jpg`: what a visitor sees today, paused at the labeled seconds.
- `t1-default-216.png` vs `t1-stage-216.png`: the same moment, default vs the Stage experiment.
- `final-sonoite-sheet.jpg`, `final-horas-mortas-sheet.jpg`, `final-nao-querer-nada-sheet.jpg`: the Sept 6 proposal comparison (Intimate / Chamber / Afterimage).

## Questions

1. **Per film (T1, T4, T5):** what works and must be protected, what fails, and the **single most important change**. Ground each point in a specific frame (sheet + seconds) or a specific musical event.
2. **Music to image:** using the listening map, which big musical moments currently get no visible answer, and which visual changes land on nothing? Propose authored responses within the doctrine. Name the channel (key light, wall/shadow, floor, haze, surface, a cut or move at an authored time, or onset accents) and the exact window.
3. **Album identity:** do the three films read as one album with three distinct rooms, or as one room three times? What should each film own that the others don't?
4. **The experience around the films:** the threshold entry, moving between tracks, the end of each film, and the end of the built album. What should a first-time listener feel at each point?
5. **Stage vs default:** should the Stage direction (readable wall, travelling shadow, floor residue) be adopted, hybridized or dropped, per film?
6. **What to remove:** elements that read as sprites, primitives or pasted layers, or that compete with the sculpture.

## Output: markdown, at most about 1,800 words

- **Verdict:** three sentences.
- **Top 10 suggestions, ranked by impact on a first-time listener.** For each: track · time window · change · channel · musical/emotional reason · cost (S/M/L) · risk · how to A/B it.
- **Protect:** what must not be lost.
- **Don't:** things that would look like progress but aren't.
- **Confidence:** what you couldn't judge from stills without hearing.
