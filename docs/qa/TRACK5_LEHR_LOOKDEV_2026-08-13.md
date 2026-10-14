# Track 5 LEHR lookdev test — 2026-08-13

**Branch:** `experiment/track5-recut-lehr` (cloned from `experiment/track5-audio-led-middle-recut` @ Prompt #195)
**Runtime:** Path B recut only
**Flag:** `?lehr=1` — ignored unless `?recut=1` on canonical Track 5 `track5-cinema`

## Watch

Control (unchanged recut film):

`http://localhost/homem/?prototype=1&seed=42&fps=30&quality=cinema&recut=1`

Test (this bundle):

`http://localhost/homem/?prototype=1&seed=42&fps=30&quality=cinema&recut=1&lehr=1`

Hard-refresh after `npm run build`. Console should log: `[Prototype] LEHR lookdev test on — window 64–504s, recut path only`.

## What the flag does (64–504s only)

Opening (0–60s) and ending (504s+) stay the accepted recut pixels. ECU close-ups get little or none of the room lift.

1. **Floor** — stronger pool on wides so the relic sits in a room
2. **Dust** — same motes, bigger drift (not more particles, not bigger size)
3. **Gobo** — key-light cookie crawls more, so the floor pool is textured
4. **Material** — darker env reflections, a little more sheen, a roughness hint before tar at 5:37
5. **Shell + haze** — lit air behind the silhouette on wides (god ray stays off; recut already deleted it)
6. **Camera** — short pull-back that eases into each cut, then still. Settle is window-gated but **not** scaled by the 2s lookdev ramp, so the first recut cut at 64s actually lands. Floor/dust/gobo still fade in.

No new objects. No `?textured=1`. Flag off is byte-identical to today’s recut.

## Trim after watching

Overshot on purpose. If one lever is too much, kill it in `src/js/prototype/recut-lehr.js` constants — do not fold this into the default recut until you say so.
