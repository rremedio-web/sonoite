# Audit — last two months of work (2026-08-01 → 2026-10-01)

> **Status at snapshot (Prompt #247):** P0-1 is resolved (the September tree was committed in #236). The `FIX_SPEC_AUDIT_P1_2026-10-01.md` batch (F1–F10, covering P1-1..6, P1-9 and P2-1/2/5/6) landed in #236; F1–F8 have tests in `tests/unit/audit-p1-*.test.js`. P1-7, P1-10 and the "Committed claims the code does not do" list were outside that batch and remain as written.

Branch `experiment/physical-ambience` · HEAD `84cc225` · audited 2026-10-01 · read-only (no source, test, asset, dist or git-state changes; `node_modules` was reinstalled via `npm ci` because the checkout had none).

**Scope.** Path B chamber only (old runtime excluded per CLAUDE.md). Tracks 2/3/6/7 have no built film and received no work in the window. Visual taste and musical fit are **owner-gated and not assessed** — no auditor in this pass could hear the audio.

**Seats.** Mechanical gates by Claude (Opus 5.5). Every P1 and every item in the "claims the code does not do" section was re-read in current code by Claude; numeric results (probe values, sample counts) are the reviewers' and attributed inline. P2 items are reviewer findings unless marked confirmed. Reviewers: Codex (`codex exec --sandbox read-only`) ×3 — September conformance, August films, August engine/routing/shell; cursor-agent (ask mode) — September correctness (its August run hit the Cursor usage limit and was replaced by Codex). A parallel independent browser-driven audit (local report, not published) was cross-checked; its unique findings were confirmed in source and are folded in, marked **[B]**.

## What the window contains

| Period | Where | Work |
|---|---|---|
| Aug 1–12 | — | Nothing committed. |
| Aug 13–15 | 37 commits, #196–#233 | T5 recut lookdev (lehr/listen/plateau), #204 film-module seam, **T1 candle film** (#205–#218), **T4 Horas Mortas sodium film** (#219–#229), #230 reactivity +15%, #231 front-page routing + CPT var rename + Netlify export, #232 shell polish, #233 T1 percussive air. ≈ +8.5k src lines. |
| Aug 22 | #234, #235 | Test hygiene, `test:full` gate. |
| Sep 5–8 | **uncommitted** | Accent detector + navigation isolation, T1 quiet scene (now default), T5 physical room / cloth / room-reveal / tar-frontier cut, Blender material candidate, four cinematic proposals + Stage hybrid, T1 shadow drape → light sequence → weighted-cloth reliquary + climax, volume control. +767/−98 tracked, ~25 new src/test files, ~31 MB assets + `.blend` sources. |
| Sep 9 → Oct 1 | — | No repo activity. |

## Verdict

The engineering is careful and the September docs are unusually honest (they claim focused suites only, flag what wasn't watched or heard, and mark acceptance as pending). But there is **one ship-blocking process risk, one default-path audio defect introduced in September, and a cluster of default-path transport/accessibility defects from August's #231/#232** that no gate caught, because no gate exercises natural end-of-track, pause-idle, interruption or reduced motion.

## P0 — process

**P0-1. September work existed only as uncommitted changes.** At audit time all September source, tests and assets were uncommitted on `experiment/physical-ambience`. They were committed in #236.

## P1 — wrong behavior on default routes (all confirmed in current code)

| # | Finding | Introduced | Evidence |
|---|---|---|---|
| 1 | **Audio plays through two parallel paths → ~+6 dB at default volume; volume slider cannot mute.** `setupAudio()` reroutes analyser → `listeningGain` → speakers, but every play runs `AudioManager.playFromBuffer()`, which reconnects analyser → speakers directly. Output = (1 + volume) × signal. All three films. | Sep (uncommitted volume control) | `prototype/experience.js:6211-6228`, `audio-manager.js:519-521`; Codex executable probe of the graph. The parallel audit's claim that volume is "applied after the analyser" took the code comment at face value and missed this. |
| 2 | **Auto-advance fails on natural end.** Completion is checked only inside the render branch that requires `audio.isPlaying`; `AudioManager` clears it (and fires `onStop`) when the buffer ends, and the prototype never subscribes to `onTrackEnd`. Also never fires if the track ends in a hidden tab. | Aug #231/#232 | Codex (engine) + [B] reproduced 3/3 in browser; confirmed: zero `onTrackEnd` subscriptions in `prototype/experience.js`, `handleTrackEnd()` called only from the render path (`:8429`). |
| 3 | **When auto-advance does fire, the next track stops at the threshold.** Full page navigation; next page waits for a new gesture. `autonext` therefore never produces continuous listening. | Aug #231 | Codex (engine) + [B]; confirmed `window.location.assign` at `experience.js:3466`. |
| 4 | **Paused controls vanish and can't be recovered with the mouse.** Pause schedules a hide after 4 s; `handlePointerMove()` returns early for paused playback. Hidden chrome is also keyboard-focusable at opacity 0. | Aug #232 | Codex (engine) + [B] reproduced; confirmed early return in `experience.js:6309-6312` (`!playing && hasUserStarted`). `shell.js:142-146`, `:1197-1210`. |
| 5 | **Track 4 ignores reduced motion.** `this.reducedMotion` is only assigned inside `resolveLivingConfig()`; T4 deliberately skips LivingChamber, so it stays `false`. | Aug #220 | [B] browser; confirmed `experience.js:3236`, `:3276`. |
| 6 | **Audio interruption desyncs visuals permanently.** Transport is wall-clock anchored (`performance.now()`); no AudioContext suspend/resume reconciliation in the prototype. A 1.6 s suspension left visuals 1.6 s ahead. Real-world trigger: phone calls, Bluetooth hand-off, iOS backgrounding. | pre-window design, exposed by mobile use | [B] reproduced; confirmed `experience.js:6419`, `:6454`. |
| 7 | **T4: the second electrical death starts late.** Pocket 0's recovery window (0–17.8 s) overlaps pocket 1 (starts 12.9 s); pockets are scanned oldest-first, so at 14 s the lamp reports `warmup` 0.73 instead of black. Contradicts #220's nine authored dropouts. | Aug #220 | Codex (films) probe; confirmed `chamber-sodium.js:26-29`, `:895-900`. |
| 8 | ~~T5's final authored cut never fires.~~ **WITHDRAWN (corrected 2026-10-01, caught by the Fable review).** The runtime loads the curated variable-tempo grid `analysis/nao-querer-nada/beats.json`, where bar 213 (`ws_final_trace`) is at **558.55 s**, inside the file (563.93 s). The ≈565.3 s figure came from the 2026-08-14 review's flat 90 BPM assumption and was carried forward without re-checking. What remains is an owner taste question, not a bug: the film goes dark at 534 and reopens a final image at 558.55, about 26 s after the last note (532.86). | — | `beats.json` bar 213; `experience.js:3800` loads it. |
| 9 | **Production CSP blocks the shell's styles.** Prod policy is `style-src 'self' 'nonce-…'` (no `unsafe-inline`); `shell.js` injects an un-nonced `<style>` (layout + self-hosted @font-face) and `page-prototype.php` has an un-nonced `<style>`. Invisible locally because `SONOITE_DISABLE_CSP=true`. Applies to a WordPress production deploy with CSP on; the static export's `_headers`/`vercel.json` currently send no CSP, so the Netlify package is unaffected. | Aug #231/#232 | Codex (engine); confirmed `functions.php:519`, `shell.js:23`, `page-prototype.php:56`. |
| 10 | **HTTP page rejects HTTPS audio.** Allowed audio origins default to `window.location.origin`; `http://sonoite.local` loads the room but audio fails validation, silently (see P2-5). | pre-window | [B] reproduced; confirmed `audio-manager.js:13`. Local env issue unless production also serves HTTP. |

## Committed claims the code does not do (the approved look may include these — A/B, don't silently "fix")

You gave live verdicts on T4 v3→v5 and on the fog trims *with these already in place*, so the look you approved is the as-built one.

- **#226 sodium diffuse wrap is inert.** `onBeforeCompile` searches for the `dotNL` line, but at that point the shader still contains the unexpanded `#include <lights_physical_pars_fragment>`; the replacement never matches. The unit test passes because it feeds the expanded text directly. (`chamber-sodium.js:221-251`)
- **#230 is +32%, not +15%, on ASCEND/DEAD_HOURS.** Drive ranges and per-phase scales were both ×1.15 and multiply (×1.3225).
- **T4 receives an unauthored opening pulse at 29–40.5 s.** `eventBeats: []` makes `getRoomState()` synthesize the shared legacy punctuation (`experience.js:6856`), contradicting #220's "inheritance purged".
- **T4 camera drifts for 6 s before BURN.** The 238.15 s cue has no `transitionSeconds`; engine default is 6 s (`experience.js:6350`), breaking the static-hold grammar.
- **`?sodium=0` is a partial kill switch** — fixture goes steady, but scrims/haze/grade/bloom still follow the schedule.
- **#228/#229 fog-density trim has no effect in bright passages** — runtime caps `density × hazeArc` at 0.018 (both old and new values hit the cap at 84 s). Scrim/sprite trims do apply.
- **Stage + shadow-drape wall-wash aim is overwritten every frame** by `updateAtmosphere()` (angle 0.95, target −3,3,−9); the setup's authored aim (1.05, −3.5,2.5,−7) never shows. Only the reliquary path re-aims.

## P2 — robustness, hygiene, gaps

1. **Unknown or unbuilt `?track=` loads the wrong film.** `?track=paralisia-do-sono` shows T2 metadata but resolves `track5-cinema` (T5 phases, T5 relic). Pretty `/track/<slug>/` URLs redirect into this. [B] + Codex.
2. **Experiment-gate leaks (flag-only):** `?duration=` (alias of `proof`) does not exclude proposals; `?variant=sonoite-cinema` on T4/T5 turns on the T1 quiet scene (gate checks the variant, not the track).
3. **Seek/pause determinism gaps (pre-existing design, now visible):** the grade EMA and `_restrikeGradeBlend` aren't reset on seek and keep settling while paused (T4 at 250 s: 0.22 direct vs 0.497 arriving from WAKING); T1 inherits LivingChamber pink-noise state that differs between continuous play, seek and rewind. This matters most for the *paused-capture QA method* the September docs rely on. T5 surface response is forced to 0 when paused/hidden even though its envelope is time-pure (opt-in routes only).
4. **`listen=1` commits survive rewinds** and leak into the protected tail (commit at 500 s still active at 510 s and after rewinding to 20 s).
5. **Playback errors are invisible** to normal visitors (status surface is debug-only). [B]
6. **Index focus management:** opening doesn't move focus in, closing doesn't restore it; closed index buttons stay tabbable under `aria-hidden`.
7. **Deploy-time gaps:** the #231 CPT query-var rename needs a rewrite flush on any existing install (no migration hook); `npm run export:static` succeeds and still advertises a track whose MP3 is missing; `<noscript>` message is covered by the opaque prototype root.
8. **Lifecycle hygiene:** practicals/sodium rigs don't dispose light shadow-map render targets; `destroy()` disposes but doesn't detach `physicalChamber`/`physicalWallWash` nodes; T1/T4 allocate 7–14 `THREE.Color`s per frame. Track switching is a full page load, so none of this leaks in normal use today.
9. **Default changes without a recorded owner decision:** the absolute-bass accent trigger was replaced by the adaptive spectral detector on all three films; the volume control + persisted level (finding P1-1) appears in no doc. (The T1 quiet-scene default *is* owner-approved: "i dig it". The tar-frontier cut default is approved inside the physical scene only.)
10. **Consequence of the quiet-scene default:** August's T1 candle film (#213–#218) and its practicals-dependent behavior are now reachable only via `?scene=original`. The `TRACK1_PRACTICAL_STUDY` URLs no longer activate the study without that flag.

## Gates (run 2026-10-01 on the working tree)

| Gate | Result |
|---|---|
| `npm run test:full` | **711 / 714 pass.** 3 failures: SecurityManager heap test (documented flake — passed in the parallel run, 712/714); `track5-recut-config` source-scrape expects old text (behavior intact: condition widened to `recutEnabled \|\| usesPhysicalScene()`); `practical-pools-study` fixture lacks `getCinematicProposal()` added Sep 8. Both real failures are test drift, not regressions — but they show Sep 8 changes were never re-run against Sep 5 tests. First full-suite run on this tree; every September doc claimed focused subsets only. |
| `npm run build` | Pass. Emits `prototype.85ykh-G9.js` = the bundle `sonoite.local` serves → `dist/` matches the working tree. |
| ESLint, read-only, touched files | August: flat (100 → 104 across touched files). September: **+22 new errors** (`experience.js` 102→119, `chamber-sodium.js` 0→4, `track5-surface-response.js` 0→1), all style rules (`curly`, `brace-style`, nested ternary, object-injection). New September modules are otherwise clean. Repo-wide `lint:check`: 18,985 errors [B], mostly legacy. |
| `git diff --check` | Clean. |
| `npm audit` [B] | 25 entries (1 critical transitive `shell-quote`, dev tooling); production-only: 1 moderate (DOMPurify). |

## Verified clean (Codex executable probes unless noted; Claude confirmed the late-load guards and cloth detach)

#204 extraction is verbatim (1,473 lines) and config-identical. Routing: no reflected XSS or open redirect; slug is escaped and redirected via `wp_safe_redirect`; no request-time rewrite flush. All new September GPU resources have a disposal path, including late-arriving textures/GLB after `destroy()` (`loadStageDrape` guards both awaits; the cloth is detached before its source scene is disposed). Drape settle, light sequence, tar residue and tar-passage camera are pure functions of time and restore on backward seek. Proposals are excluded under `recut=1`/`proof`. Navigation strips experiment flags (allowlist: seed, quality, dpr, fps, motion, autonext). #207 beat grid: 1,174 beats, 140 BPM anchored at 35.4 s. #217 vigil flag-off bit-identical to #216 at 14 timestamps. #222 isolation and timing (BURN arrival 317.60, 1.5 s hold before the 319.10 cut) and #224 squeeze (322.5 → 338, held to 338.05) hold. 372k sampled T1/T4 numeric outputs finite.

## Owner decisions outstanding

- **Gate 1 / Pass 1b trims** (July) — no recorded verdict.
- **#223 owner-watch verdict sheet** — blank. Still live: T5 ending (whether to keep the 558.55 s reopen after the last note at 532.86, or hold black or a glint through the reverb tail to about 543), T4 SQUEEZE release, T4 BURN fill (35 % vs 48–58 % target). Superseded: T1 vigil smoke (candles now off by default).
- **Direction:** Intimate / Chamber / Afterimage / Stage — none adopted; reviewer recommended a hybrid. T1 reliquary/cloth/climax: "creative acceptance pending"; 43 s hold at 210–253 s and the 29 s 7:39–8:08 hold flagged as pacing questions.
- **T5:** floor residue (reads as "grey pool" in small captures), cloth study, room reveal, Blender material candidate (finger/petal joins outstanding), two-cue surface gesture — all opt-in, all pending.
- **T4:** fixture grounding/support under Stage.
- **Scope:** three-film preview vs. seven-track album (Tracks 2/3/6/7 unbuilt, and currently misrouted — P2-1).
- **Asset policy:** ~31 MB of untracked textures/models + 12 MB `.blend` sources — repo, LFS, or off-repo.

## Recommended order

1. **Back up / commit** the September tree (P0-1).
2. **Fix the audio double path** (P1-1) — smallest fix: stop `playFromBuffer()` reconnecting analyser → destination when a listening gain is installed, or insert the gain inside `AudioManager`. Add a graph test.
3. **Transport lifecycle:** one idempotent completion handler on `onTrackEnd` (P1-2); decide whether auto-advance continues playback (P1-3); reconcile on AudioContext `statechange` (P1-6); initialize reduced motion independent of LivingChamber (P1-5). Add lifecycle tests — none of these are covered.
4. **Shell:** keep chrome visible while paused, reveal on focus (P1-4, P2-6); visible error + retry (P2-5); nonce the shell styles before any CSP-on deploy (P1-9).
5. **Owner A/B, not silent fixes:** T4 pocket overlap (P1-7), inert wrap, opening pulse, BURN pre-drift, #230 actual magnitude; the T5 ending choice.
6. **Hygiene:** fix the two drifted tests, the 22 new lint errors, unknown-track routing, the flag leaks.
7. **Listening pass** with audio-capable review (see `GEMINI_LISTENING_BRIEF_2026-10-01.md`), then owner listening — still the gate for every creative item above.
