# End Goal and Product Reset

> **Date:** 2026-03-11
> **Status:** Active decision document

---

## What this product is

A browser-native album listener. 7 tracks. Each track is a 2-9 minute audio-visual experience in a dark room with a lit artifact. The viewer inhabits the room while the music plays.

It is NOT:
- A 3D relic viewer
- A music visualizer
- A screensaver
- A portfolio piece
- A tech demo

## What "done" looks like

A person opens the site, picks a track, and listens to it in a room that feels authored. When the track ends, they feel like they experienced something. They pick another track. That room feels different. The artifact is different, the light is different, the pacing is different. But the quality is the same.

## Current state

- **Landing state works.** A still sculpture in a dark room with one spot light reads as authored.
- **Experience state does not.** Once playback starts, nothing changes fast enough to feel composed. The room breathes, but breathing is texture, not structure.
- **Track 5 is the control.** hard-light variant, withhold as the verb.
- **Track 1 is 95% locked.** Director complete, 43 moments, splines.
- **Tracks 2-4, 6-7 are 40-55% each.** Need Directors, moments, identity.

## The two problems we're solving

### Problem 1: Make 9 minutes feel authored (per-track)

The room needs:
- **Visible chapters** — the viewer should feel "the room is different now" every 60-120s
- **Continuous life** — the room breathes autonomously before any audio plays
- **Rare punctuation** — 5-7 discrete events across 9 minutes, horizontally varied (different target each time, not louder each time)
- **A governing verb** — one word that describes what the room does for this track

This is solved by:
- Extending roomPressureBeats to full track duration
- Widening phaseCurve ranges so macro changes are perceivable
- Adding tighten/release as the primary temporal grammar
- Authoring 5-7 micro events per track

### Problem 2: Give each track a distinct room identity (album-level)

Each track needs:
- A different governing verb (withhold, consecrate, confine, dissolve, persist, transfer, examine)
- A different palette (already exists in journey JSON)
- A different artifact (already exists)
- A different room behavior (different phaseCurves, different pressure beats, different event targets)
- Eventually: a different color grade (LUT per track)

This is solved by:
- Per-track Directors (Track 1 has one, Track 5 has a partial one)
- Per-track enriched moments
- Eventually: LUT color grading, render-target transitions

## Build direction

**Base:** Room as Instrument — the room has 8 strings (light cone, temperature, enclosure, film finish, atmosphere, shadow, space, shell). The 9 minutes is a composition played on them.

**Pacing:** Attention Cycle — events fire at predicted attention troughs, not on a clock. Horizontal variation (different target each time).

**Restraint:** Room You Remember — prefer held states with rare transitions over continuous drift. If the viewer can't tell what changed, the change didn't happen.

## What we keep from this research pass

### Keep now
1. hard-light stays the control for Track 5
2. One room verb should dominate per track
3. Tighten/release is the best first temporal grammar
4. The room must be alive before it listens
5. We need visible room events in the first 90s

### Keep later
1. LUT color grading per track (1-2h, massive identity separation)
2. Render-target transitions between tracks (4-6h, cinematic switching)
3. Shader precompilation during loading (1h, polish)
4. Selective bloom if we move away from global UnrealBloom

### Not yet
1. Deferred shading
2. Baked material reconstruction (Dime Trap style)
3. Web Audio synth layers
4. Full selective bloom rewrite
5. Full render-target transition system

## Next implementation sequence

1. **Simplify experience.js** — variant inheritance, remove redundant config, add mode constants
2. **Make the room alive before playback** — raise autonomous breathing, visible floor pool breathing
3. **Implement tighten/release for Track 5** — extend roomPressureBeats to full 564s, widen key light angle range, make vignette respond to pressure more aggressively
4. **Author 5-7 micro events for Track 5** — horizontally varied, aligned to musical accents
5. **Full playthrough verification** — does each phase produce a distinct memory?

## Reference documents

- `docs/qa/THREE_9MIN_EXPERIENCE_DIRECTIONS.md` — 3 directions with recommendation
- `docs/qa/MUSIC_INTERACTION_MATRIX.md` — complete parameter-to-audio mapping
- `docs/qa/AWARD_WINNING_3D_SITES_RESEARCH_2026-03-11.md` — 15 reference sites with techniques
- `docs/qa/10AGENT_SYNTHESIS_2026-03-10.md` — 10-agent research synthesis
