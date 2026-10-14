# Fix spec — audit P1 engineering batch (2026-10-01)

Source: `docs/qa/AUDIT_LAST_2_MONTHS_2026-10-01.md`. Branch `experiment/physical-ambience` (September work is uncommitted; backed up at `~/Backups/sonoite-*-20261001.*`). Implementer: Codex. Reviewer: Claude.

## Ground rules

- Path B prototype only (`src/js/prototype/`, `src/js/audio-manager.js`, `functions.php`, `page-prototype.php`, tests). Do not touch the old runtime.
- **Do not change any authored visual value**: timings, cue tables, gains, colors, phase windows, camera scores, lighting, fog or post. Visual items in the audit are owner A/B decisions and are **out of scope**: T4 pocket overlap, sodium wrap, T4 opening pulse, BURN transition, #230 magnitude, T5 final cut, the T1 grid phase.
- Do **not** commit, stash, checkout, reset or run `npm run lint` (it is `--fix`). Lint read-only: `npx eslint <file>`.
- Do not reformat untouched code. Match the surrounding style (4-space indent, single quotes, semicolons).
- Every fix gets a focused unit test in `tests/unit/` that **fails before and passes after**. Mock the Web Audio graph and DOM as the existing tests do (see `tests/unit/audio-accent-pipeline.test.js`, `track-navigation.test.js` and the `shell-*.test.js` suites).

## Fixes

**F1 — Audio double path (P1-1).** Add an optional output node to `AudioManager`: `setOutputNode(node)` stores it, and every `analyser.connect(this.audioContext.destination)` call (`audio-manager.js:115`, `:521`, and any other) connects to `this.outputNode || this.audioContext.destination`. `setOutputNode` must disconnect the analyser from its previous output and connect it to the new one. In `prototype/experience.js setupAudio()`, remove the manual `disconnect`/`connect` hack and call `this.audio.setOutputNode(this.listeningGain)`.
*Accept:* after `play()` (`playFromBuffer`) and after pause → play, the analyser has exactly one output, `listeningGain`. At volume 0, nothing reaches the destination directly. Default volume restored from `localStorage` behaves the same as before.

**F2 — Natural end never completes (P1-2).** Subscribe to `this.audio.on('onTrackEnd', …)`. Route it, and the existing render-path completion (`experience.js` around `:8429`), through one idempotent `completePlayback()` that calls `handleTrackEnd()` at most once per playback. It must work when the tab is hidden. It must not fire on a user pause or stop. Reset the guard on seek-before-end and on replay.
*Accept:* a test fires `onTrackEnd` with `isPlaying` already false and sees `handleTrackEnd` called exactly once. Both paths firing together still give one call. Proof-duration completion still works.

**F3 — Auto-advance stops at the threshold (P1-3).** When `handleTrackEnd()` navigates via auto-advance, write `sessionStorage['sonoite-autonext-continue'] = JSON.stringify({ slug: nextSlug, at: Date.now() })` before `location.assign`. On boot, if the entry exists, matches the loaded slug and is under 30 s old, remove it and, once audio is loaded, attempt to start playback, skipping the threshold title card. If `play()` rejects (autoplay policy) or the context will not resume, fall back silently to the normal threshold. Manual track selection does not set the entry. Wrap all storage access in try/catch.
*Accept:* tests cover continue, stale entry (over 30 s, ignored), slug mismatch (ignored) and play rejected (threshold shown).

**F4 — Visuals drift after audio interruption (P1-6).** Listen to the AudioContext `statechange` event (via `this.audio.audioContext`). While `state.playing` is true and the context is not `running`, transport must not advance: hold `state.currentTime`. When it returns to `running`, re-anchor: `this.transportStartSeconds = performance.now()/1000 - this.audio.getCurrentTime()` (use the same seconds base the code uses now). Leave user pause and seek behavior unchanged.
*Accept:* a test simulates suspend for 1.6 s, then resume. Visual time equals audio time ±50 ms after resume, and did not advance during suspension.

**F5 — Track 4 ignores reduced motion (P1-5).** Assign `this.reducedMotion = this.resolveReducedMotion()` (and anything else `resolveLivingConfig` initializes that is not LivingChamber-specific, such as `reducedMotionScale`) during init, independent of whether LivingChamber is constructed. `resolveLivingConfig` keeps working.
*Accept:* a test on `horas-mortas` with `motion=reduce` gives `reducedMotion === true` before and after start. T1 and T5 are unchanged.

**F6 — Paused controls vanish; hidden chrome is focusable (P1-4, P2-6).**
- While paused after the first start, chrome stays visible: no auto-hide timer runs while paused. `handlePointerMove()` shows chrome when paused (remove the early return; keep the 120 ms throttle).
- Any `focusin` inside the shell, or a keyboard interaction, reveals chrome. Add `.prototype-shell.is-hidden:focus-within` to the same recovery the existing `is-dimmed:focus-within` rule gets.
- Index: `openIndex()` moves focus to the current track's button (or the first one); `closeIndex()` returns focus to the element that opened it. While closed, index buttons are not tabbable (`inert` on the container, with a `tabindex=-1` fallback).
*Accept:* tests for pause then 4.5 s then pointer move (visible), focus in hidden chrome (visible), and index focus in and restore with closed buttons untabbable.

**F7 — Invisible playback errors (P2-5).** In normal (non-debug) mode, an audio load, decode or start failure shows an accessible message in the shell (`role="alert"`): plain copy ("The music couldn't load.") with a **Retry** button that re-runs the load and start path. Hide it on success. Routine diagnostics stay hidden.
*Accept:* a test for load failure (message and retry visible) and retry success (message hidden).

**F8 — CSP blocks shell styles (P1-9).** Add `'cspNonce' => sonoite_get_csp_nonce()` to the **prototype** `sonoiteData` payload in `functions.php` (the reduced payload near `:351`). In `page-prototype.php` add `nonce="<?php echo esc_attr( sonoite_get_csp_nonce() ); ?>"` to the inline `<style>`. In `shell.js`, set `style.nonce = window.sonoiteData?.cspNonce` when present, before inserting the injected `<style>`. The static export (no CSP) must keep working.
*Accept:* the shell test asserts the nonce is applied when provided and absent-safe otherwise. `php -l` passes on both PHP files.

**F9 — Unknown or unbuilt `?track=` loads the wrong film (P2-1).** Resolve one effective slug at boot: if the requested slug is not in `BUILT_TRACK_CYCLE`, use `DEFAULT_ENTRY_TRACK_SLUG` for **both** the audio/metadata lookup and the variant resolution, so they can never disagree.
*Accept:* tests for `?track=does-not-exist` and `?track=paralisia-do-sono`, which must give sonoite audio and the `sonoite-cinema` variant. Built slugs are unchanged.

**F10 — Experiment-gate leaks (P2-2).** `resolveCinematicProposal` also rejects `params.has('duration')`. `usesQuietScene()` additionally requires the effective track slug to be `sonoite`.
*Accept:* extend `cinematic-proposals.test.js` and `quiet-scene-study.test.js`.

**F11 — Drifted tests.** In `practical-pools-study.test.js`, add `getCinematicProposal: () => null` to the fixture. In `track5-recut-config.test.js:1131`, assert the current seam (bokeh zeroed under recut **or** the physical scene) without depending on exact whitespace.

**F12 — New lint errors.** Fix the 22 September-introduced errors only: `chamber-sodium.js` (4, around `:1690`, `:1695`, `:1920`), `track5-surface-response.js:7` (1), and the 17 new ones in `experience.js` (curly, brace-style, nested ternary, object-injection; compare against `git show HEAD:<file> | npx eslint --stdin`). No behavior change. Do not touch the pre-existing backlog.

## Gates (report each)

1. Every new or changed focused suite: `npx jest <files> --config jest.config.cjs --coverage=false --reporters=default`.
2. `npm run test:full` — expected 714 + new tests, all green except at most the documented SecurityManager heap flake.
3. `npm run build` passes.
4. `npx eslint` on every touched JS file: no **new** errors versus `HEAD` (and versus the pre-edit working tree for untracked files).
5. `php -l functions.php page-prototype.php`.
6. `git diff --check` is clean.

Report: per fix, the files and lines changed, the test names, and the gate output. Note anything you could not do and why.
