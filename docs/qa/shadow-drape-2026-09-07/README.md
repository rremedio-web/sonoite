# Track 1: draped shadow receiver

Owner authorized the next Track 1 stage layer and OpenAI-generated ideas. Implemented on `experiment/physical-ambience`; local preview only.

## Try it

http://127.0.0.1:8765/proposals/?direction=stage

Choose Track 1, enable **Hold the Track 1 camera still**, play **Middle**, and toggle **Draped shadow surface**. The drape toggle retains the same experience instance and playback time, including while paused. The full-experience link updates with the comparison state. `?proposal=stage&drape=0` opens the bare-wall comparison directly.

Final bundle: `prototype.bAcRjhju.js`.

## Implementation and scope

A single opaque mesh sits behind the grey sculpture and receives its real cast shadow. Unequal diagonal creases interrupt the silhouette. The hem is grounded at the room floor and darkened at contact to avoid a bright slab-like edge. It enters with the existing 125-second stage change, remaining hidden during the opening.

The mesh has two authored position/normal poses. A smooth recording-time envelope settles the lower fold once between **316.65 and 365 seconds**, then holds the result through the ending. The movement reverses correctly on a backward seek. Reduced motion keeps the initial cloth pose while retaining light and shadow. This is a controlled mesh deformation, not simulated cloth or wind.

This comparison changes the receiving surface under the existing travelling light, camera score and ending envelopes. The current local haze stays as it was. It does not implement a separate new phrase-based light score, additional covered body, or gathered-hem composition. Track 4, Track 5 and the older Track 5 cloth study keep their existing behavior.

The first geometry was too rounded and bright; the final trial uses narrower creases, lower albedo and a darker hem. The live result is simpler than the generated textile concepts and still needs owner judgment for material quality and sustained attention.

## Generated ideas

[OpenAI concept sheet](../../../public/proposals/concepts/openai-stage-concepts.png): hanging fold, covered volume, gathered hem. Generated with the built-in OpenAI image tool using the actual album artwork and a current stage capture. The tool does not expose an exact model version; no specific latest model ID is claimed. [Exact prompt and input roles](IMAGE_PROMPT.md).

The hanging fold is the implemented starting point. The other two remain visual proposals. The generated sheet is not evidence of current browser rendering. A preview copy is served at `/proposals/concepts/openai-stage-concepts.png` and linked beside the drape control.

## Verification and limits

- Build passed; usual Vite mixed-import and bundle-size warnings remain.
- **14 focused tests passed** across physical-drape and cinematic-proposals suites. These cover finite grounded morph poses, seek restoration, reduced motion, track/query isolation, the older cloth study, and preserved proposal/Track 5 camera behavior. Focused execution uses `--coverage=false`; no full-suite coverage claim.
- Targeted ESLint passed after correcting a missing brace; `git diff --check` passed.
- Final browser captures at approximately 90, 310, 384 and 525 seconds: cloth hidden in opening; initial and settled states restored on reverse seeks; darker sculpture with cloth still readable near the ending.
- Postprocessing disabled: one render pass, cloth and shadow render, zero failed WebGL programs. `destroy()` releases the drape and stops playback.
- Four repeated UI toggles preserved the same paused time, same experience instance and one chamber child. No page reload or accumulating scene elements.
- Sixteen seconds of visible normal-speed diagnostic playback during the settling gesture recorded increasing morph weight and no failed shader programs. The first immediate post-pause value can finish updating on the final render; the later paused toggle test records identical times and weights.
- No new audio audition or uninterrupted full-film boredom review was performed. Timings use the existing authored hush/reveal landmarks and remain a listening candidate.

Evidence: `~/Documents/Sonoite Environment Trial/shadow-drape-2026-09-07/evidence/`. Five final canvas captures at 960×540 plus state JSON and two diagnostic logs. The normal-playback log precedes the final contact-darkening/UI-only refinements; the morph timing and geometry are unchanged. Captures and toggle check use the final bundle.
