# Track 5: hold versus tar-frontier shot — 2026-09-06

Branch: `experiment/physical-ambience`. Owner accepted the closer view on 6 September: “closer view earns its place”. It now ships within the opt-in physical room; the ordinary film remains unchanged. No commit, merge or push. Codex implements; Fable 5.1 supplied a read-only second opinion.

## Comparison

A (retained comparison): `?track=nao-querer-nada&scene=physical&passage=hold&autonext=0&seed=7`
B (accepted physical-room default): same without `passage=hold`. The earlier `passage=tar-cut` link remains compatible.

B inserts `mcu_tar_frontier` at bar 149, **391.4342105263158 s**, until the existing bar 165 cut at **432.9078947368421 s**. The review's bar 147 / 392.4 s association was incorrect: bar 147 is 386.25 s in the loaded recording grid. Bar 149 is the nearest downbeat to the proposed time; its musical fitness remains for owner playback.

The new low medium setup targets y=0.65 and uses the existing wet_specular rig. It deliberately crops the upper flower to give the lower body space. This compares a shot and its associated lighting, not camera position in isolation. The tar's existing 337–510 s score, audio, room surface, wall wash, fog response and other shot entries are unchanged between arms. No surface-reaction study is enabled by this flag.

## Shared atmosphere correction

The physical scene's early return bypassed the ordinary chamber fog update. That existing formula now lives in updateChamberFog, called by both physical and ordinary chamber paths. Track 1 consecration and Track 4 sodium fog branches remain separate. No decorative particles or sprites are recreated.

During this busy passage both arms reach the existing 0.04 fog ceiling. Restoring the update does not promise visible fog modulation in this particular window. A later live probe at 548 s measured 0.03993, and the focused test exercises changing input and backward restoration.

Rear-camera inspection at 74 and 350 s confirmed that the camera sits behind the one-sided backdrop (z about -28 to -29 versus wall z=-9). No obvious clipping appeared in the inspected rear view; it remains a sparse view out of the open stage, not a complete enclosure. No geometry change was made for this bounded comparison. This does not certify every camera angle.

## Verification

- Production build passes. Accepted-trial bundle: `js/prototype.BzlzO1st.js`. The rebuilt default physical route resolves mcu_tar_frontier at 410 s; passage=hold disables it. All 100 focused tests were rerun after this routing change.
- 100 tests pass across seven focused suites: physical-chamber, quiet-scene-study, track-navigation, track5-surface-response, light-rigs, hero-textured-flag, shot-director.
- Tests cover canonical configuration immutability, the cut boundaries, backward seeking, explicit Track 5 scope, recut exclusion and navigation dropping the flag.
- Normal-speed 337–433 s playback completed for each arm with 193 half-second log samples, all reporting visible document state. B enters the new shot on the first sample after 391.434 s and restores ws_right_arch after 432.908 s.
- A playback used `prototype.Dhu9pbVk.js`; B used `prototype.iZzwgdWo.js` before owner acceptance. The subsequent accepted build changes flag selection only; the shot and render parameters are identical. The intervening source edit expanded the equivalent config-selection ternary and added braces to the fog guard; no rendered parameters changed.
- Live seek 410 → 548 → 410 restores identical camera position, key position and key target; scene children remain nine.
- No render/script errors observed in these runs. Static preview has a missing favicon request and unused Track 1 preload warnings.
- New camera module lint and git diff whitespace check pass. Lint across the large existing experience module and physical test file is not green; it reports broad existing style/security-rule debt. No full-suite or global-lint pass is claimed.
- Codex inspected frames and runtime timing; no independent listening verdict is claimed.

## Owner review

LocalWP was stopped (connection refused), so the current build was exported to a local static preview using the site's original MP3s and generated Meshy relic.

Open http://127.0.0.1:8765/review/ . It offers A/B selection, a 96-second passage and a 30-second cut check. Keep the tab visible. The server runs from `/tmp/sonoite-tar-preview` on port 8765.

Evidence: `~/Documents/Sonoite Environment Trial/passage-337-433/`:
- comparison.html: owner player; requires the local preview server.
- hold-normal-playback.json / cut-normal-playback.json: normal-speed logs and captured frames.
- paired-frames.jpg: A/B at approximately 392 and 410 s.
- Hold's file named hold-350.jpg was captured at **358.56 s**, because capture was armed late; its JSON records the real time. Do not treat it as a matched 350 s pair.

Owner verdict: the closer view earns its place. Adopted within `scene=physical`; `passage=hold` retains the previous hold for comparison. This does not adopt the full physical-room experiment into the ordinary film.

