# Track 1 — light and scene study, 5 September 2026

Owner correction: the grey mesh works better in darkness than the separated material candidate. Set that candidate aside and focus on lighting and surrounding elements. This comparison uses the existing generated Meshy asset and original Track 1 material treatment; it does not use `relic=materials` or alter the sculpture's finish.

URL: https://sonoite.local/?track=sonoite&scene=quiet&autonext=0&seed=7

Owner approved this scene ("i dig it"). It is now the Track 1 default: https://sonoite.local/?track=sonoite&autonext=0&seed=7 . The explicit `scene=quiet` URL remains compatible. Previous scene: add `scene=original`; historical practical-pool comparisons also require `scene=original`. Current bundle: `js/prototype.CBT5ST-Y.js`.

Promotion verification: build and 125 tests across 7 focused suites passed. Fresh default and original routes loaded the same generated mesh; the default had no practical controller and used the physical floor, while the original retained its candles and ShadowMaterial. The normal default was sampled visually at 90 s, with no console errors/warnings. Fresh Track 4 and Track 5 pages returned quiet-scene disabled; Track 4 retained its sodium controller. No new full playback or full-suite claim. The captures below were made before promotion on `js/prototype.DUJmngNI.js`; visual parameters are unchanged.

## Changes in the comparison

- Do not create the practical-candle controller. Fixtures, flames, point lights and practical overlays are absent throughout Track 1.
- Remove the candle controller's warm colour coupling and flicker scaling from the main lights.
- Hide the independent dotted dust/gaze/witness/aisle/plume fields, haze sprites, floor glow/mist and bokeh group. The chamber backdrop and existing fog density remain; fog colour is neutralised.
- Use a dark 100 × 100 physical floor with shadow reception, positioned at the loaded relic's lowest bound. It receives no environment-map contribution, avoiding a luminous plane against the void. The original mesh receives shadows in this comparison.
- Opening: neutral side key, emerging smoothly from 36 to 80 s; slight increase/focus tightening from 80 to 125 s. No extra fill/rim/back light in that opening. The camera is unchanged. The spotlight's patterned mask is removed.
- At 125 s, restore the original light positions. Later intensities continue to follow the original film's lighting calculations, with neutral key/rim/back colours and no candle coupling. The original ending remains.

This is a scene comparison, not an isolated single-light A/B: it combines clutter removal, floor/shadow changes and lighting. It does not redesign the later room backdrop or camera holds. The Track 5 material candidate stays available but is not the basis for this work. Tracks 4 and 5 do not enable this scene treatment.

## Verification

- Build passed; 124 tests in 7 focused suites passed with coverage disabled. No full-suite claim. Diff whitespace check passed.
- Fresh browser verified the generated optimized GLB, no authored material-region tags, no practical controller, hidden listed overlays, four lights and a physical floor.
- Paired baseline/comparison captures at approximately 60, 90, 120 and 216 s; additional comparison captures at 384 and 537 s. No full uninterrupted playback.
- Readable contour and interior hand/petal detail in the sampled opening frames; the owner subsequently approved this scene. The camera's existing tight/cropped framing at 60 s remains.
- Seek check: the later key position at 216 s was `[-2.7,6.8,5.4]` both before and after visiting the opening; the opening's `[-3.8,4.2,4]` does not leak into later shots.
- The sampled 537 s frame remains black. No browser errors or warnings observed during final capture.
- URL navigation tests confirm the scene flag does not propagate to another track. The sodium-lamp premise and Track 5 surface behavior remain unchanged.

Evidence and owner comparison:
`~/Documents/Sonoite Scene Study 2026-09-05/comparison.html`

Final evidence names use `quiet-final-*`; earlier `quiet-*` files are intermediate captures before the seek-restoration correction. `frame-means.json` contains descriptive full-frame luminance means, not an acceptance quota. Quiet frames are captured approximately 0.1 s after requested times; grain and transport timing prevent pixel-exact matching.
