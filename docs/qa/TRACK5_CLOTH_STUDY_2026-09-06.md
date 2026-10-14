# Track 5 dim cloth study — 6 September 2026

Opt-in on `experiment/physical-ambience`: `?track=nao-querer-nada&scene=physical&room=cloth&autonext=0&seed=7`. Bundle `js/prototype.cqxKXgmA.js`. Owner player: http://127.0.0.1:8765/cloth-review/ . LocalWP remains stopped; the static preview lives in Documents.

Following three Luna reviews and Fable 5.1's second opinion, the owner authorized a static cloth study. The first visible cloth looked too rigid and bright. The owner asked for more fluid folds, very dim illumination and a hazy vibe. This revision uses one opaque folded mesh behind the retained grey relic, with unequal curved folds and an uneven hem on the measured chamber floor. Colour #19191c, roughness 0.78, no animation or new textures. One existing key is repositioned to rake it; the wall wash is off during this shot. Existing depth fog is 0.022. This is a faint contrast veil, not volumetric scattering or a blur pass.

The study exists only in canonical physical Track 5, outside recut, and only during `ws_room_reveal` at 246.0–280.794 s. Camera, shot score, tar progression and accepted 391.434–432.908 s closer view are retained. The baseline and `room=readable` experiment remain available. This compares combined set and light changes, not isolated cloth geometry. No default adoption or Track 4 haze change.

Build passed with the existing chunk-size warning. Nine focused suites / 105 tests passed, including static geometry, flag isolation, navigation and backward shot restoration. New geometry and test files passed ESLint; no repository-wide lint or full-suite claim.

The final bundle completed a normal-speed 236–292 s passage: 225 samples, tab visible throughout, cloth visible only in `ws_room_reveal`, ordinary light/fog restored after the cut. Canvas frames at 250, 260 and 280 s were inspected. The folds and hem are dimly legible and the relic retains the strongest detail. The composition still depends on a small centred subject; owner/Fable aesthetic acceptance remains pending. No direct audio listening or full-film review by Codex in this pass.

Evidence and interactive Fable prompt:
`~/Documents/Sonoite Environment Trial/cloth-study-2026-09-06/`

`normal-playback.json` includes frame captures, timestamps, camera positions and light/fog/cloth state. `comparison.html` is copied to the durable preview under `/cloth-review/`. `source-before/experience.js` preserves the pre-study source. Fable is being given a prompt for the user's interactive session, not launched headlessly.
