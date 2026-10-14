# CLAUDE.md

Working brief for coding agents (Claude Code reads this file) and the architecture reference for human readers. Every statement here is meant to be true for this repository; if code and this file disagree, trust the code and fix this file.

## What This Is

A WordPress theme (`sonoite-theme`) that plays the seven-track album *Sonoite* as real-time Three.js chamber films. The product is a **browser-native album listener**, a room that performs the music, not a visualizer or screensaver.

Since the March 2026 product reset, the live direction is **"Path B": a reliquary chamber-film runtime** (`src/js/prototype/`), first piloted on Track 5 (*Não querer nada*). Three films are built: Track 1 `sonoite`, Track 4 `horas-mortas`, Track 5 `nao-querer-nada`. Tracks 2, 3, 6 and 7 have no film and cannot be played on any route. The pre-reset particle runtime is kept in source; its player is not routed (see Architecture A). **Always state which runtime a finding or change targets**: most historical confusion in this repo comes from Track 5 having had two competing implementations under one journey filename.

## Read First (in order)

1. `docs/qa/END_GOAL_AND_PRODUCT_RESET.md`: what the product is; the reset decision.
2. `docs/qa/MUSIC_INTERACTION_MATRIX.md`: the reactivity doctrine governing all visual work.
3. `docs/qa/AUDIT_LAST_2_MONTHS_2026-10-01.md`: latest state (October 2026). Its P0 and the P1 fix batch were resolved in Prompt #236; the status note under its title says what remains.
4. `docs/qa/TRACK4_STATE_LEDGER_2026-10-01.md` → `docs/qa/track4-ledger-2026-10-01/RESULTS.md`, and `docs/qa/track5-ledger-2026-10-02/{LEDGER,RESULTS}.md`: the latest work, the opt-in state-ledger trials. **Not owner-adopted**; the default films are unchanged.
5. `docs/qa/perceivability/PASS1B_EVIDENCE_2026-07-04.md` + `IDEAS_PARKED_2026-07-04.md`: the July perceivability pass. Pass 1b values (grain floor 0.4, plate `erasureBoost` 0.72, `gradePhases` strengths) are deliberate overshoots awaiting an owner trim. Do not "fix" them down. Parked ideas are gate-routed; don't re-brainstorm or implement them early.
6. `docs/qa/perceivability/BASELINE_2026-06-10.md`: numerical baseline, real phase windows, the prototype seek/capture protocol.

History, read when relevant: `docs/qa/FULL_THEME_AUDIT_2026-06-06.md` (June baseline, partly superseded by #231 and later work); the June perceivability spec and plan in `docs/superpowers/`; the September trial chain `FABLE51_EXPERIENCE_QA_UPDATE_2026-09-05.md` → `THREE_CINEMATIC_PROPOSALS_2026-09-06.md` → `FABLE51_DIRECTION_RECOMMENDATION_2026-09-07.md` → `STAGE_HYBRID_TRIAL_2026-09-07.md` (none owner-adopted except the quiet Track 1 scene, now the Track 1 default). `docs/README.md` indexes everything.

**Scope of this repo:** a curated public snapshot of the private working repository (595 commits, July 2025 to October 2026). Session artifacts, superseded audits and pre-reset creative documents (the abandoned black-hole/void direction) were left out. Do not rebuild what the reset killed.

## Commands

```bash
npm ci                 # install from the lockfile
npm run build          # vite build → dist/ + dist/.vite/manifest.json; REQUIRED for WordPress to see JS changes
npm run build:watch    # the practical dev loop (PHP has no Vite dev-server integration; WP always serves dist/)
npm run dev            # Vite dev server on 127.0.0.1:3000; NOT consumed by WordPress

npm test               # full Jest suite: 49 suites, 789 tests, all pass. THE gate for "tests pass" claims
npm run test:full      # alias of npm test, kept for older docs
npm test -- tests/unit/signalPipeline.test.js   # single file
npm run test:coverage  # coverage is opt-in (~21 % of src lines); there is no threshold

npm run lint           # eslint src, check-only (same as lint:check)
npm run lint:fix       # eslint src --fix
npx eslint <file>      # lint just the files you touched

npm run export:static -- --uploads <dir>   # build + standalone album package in dist-static/ (see below)
npm run validate:journeys      # journey JSON vs action schema (warn-only; :strict fails on every warning class, :ci only on unknown action types; --only-files= scopes it)
npm run assets:track5:inspect  # gltf-transform inspect of the relic GLBs
npm run assets:track5:degold   # rebuilds track5-relic-textured-clean.glb from the textured GLB
npm run analyze:audio -- --config scripts/audio-analysis.config.json
                       # offline Meyda analysis → public/assets/journeys/analysis/<slug>.analysis.json; bare run prints usage.
                       # The config expects the masters in a gitignored audio/ folder at the repo root ("audio/01 - sonoite.mp3", …)
```

**Gates.** `npm test` exits 0. Lint is not a gate yet: `npm run lint` reports 2,749 problems in `src/` (2,470 errors, 279 warnings), almost all in the frozen legacy runtime. Path B plus the shared modules it imports have 122 messages, mostly the `security/detect-object-injection` heuristic (52) and missing JSDoc `@param` entries (30). So `npm run validate` (`lint:check && test && security:audit`) stops at `lint:check`. Keep new and touched code lint-clean.

**Static export.** `scripts/build-static-prototype.mjs` copies the prototype bundle and the chunks it imports from the current `dist/`, the Draco decoder and fonts, the three built tracks' journeys, beat grids and phases, the relic GLBs and the Track 1 stage assets into `dist-static/`, with no PHP or database. The album audio is not in the repo: pass `--uploads <dir>` (or set `SONOITE_UPLOADS_DIR`) pointing at MP3s named `01-….mp3`, `04-…horas-mortas….mp3`, `05-…nao-querer-nada….mp3`; if none is found it exits with "No audio files resolved" (a single missing track only prints a warning). `--relic blender|meshy` picks the relic served at `/` (the other goes to `/b/`); `--out` changes the folder. Deploy by dragging the folder onto Netlify Drop or with `npx vercel deploy --prod dist-static`.

## Routes and flags

On a local WordPress site with this theme active (the author's setup: a LocalWP site at `http://sonoite.local/`, album MP3s in the media library under `wp-content/uploads/2025/08/`):

- `/`: **Path B chamber, Track 1**. `sonoite_is_prototype_request()` in `functions.php` is true for `is_front_page()`, so the bare homepage boots the prototype with `DEFAULT_ENTRY_TRACK_SLUG = 'sonoite'` (`experience.js`). `?track=horas-mortas` / `?track=nao-querer-nada` select the other films. Any slug not in `BUILT_TRACK_CYCLE` (`src/js/prototype/shell.js`) falls back to Track 1 for both metadata and variant.
- `/?prototype=1`, or any page using the "Sonoite Prototype" template: the same runtime.
- `public/proposals/` (the September proposal comparison page) is copied into `dist/proposals/` on build. September docs also cite review players on an ad-hoc static server at `http://127.0.0.1:8765/`; that was the author's local setup, not a repo script.

Query flags (prototype):
- General: `?variant=<chamber-variant>` (decides whether the code timeline overrides the JSON; see Path B), `?quality=` / `?cinema=1`, `?dpr=`, `?fps=` (clamped 12–60), `?proof=<seconds>` (alias `?duration=`), `?plate=0` / `?compositor=0` (both kill the film plate), `?msaa=0-8`, `?dither=0`, `?seed=<n>` (replays the living-chamber session), `?tweak=1` (live-trim panel), `?debug=1`, `?autonext=0`, `?relic=meshy|blender|materials`, `?commit=1` (quantized committed reactions, `commit-reactions.js`), `?probe=A-D` (blind doctrine probes; the mapping is shuffled per session and unmasked via `__revealProbe()` in the console; one letter is always the doctrine-pure control).
- Track 5 recut lane (canonical `track5-cinema` only): `?recut=1` (audio-led middle recut), `&lehr=1` (lookdev bundle; no-op without `recut=1`, see `docs/qa/TRACK5_LEHR_LOOKDEV_2026-08-13.md`), `&listen=1` (recut-only commits + rotating rim/floor/bloom accents).
- September trials: `?proposal=intimate|chamber|afterimage|stage` (cinema variants only; ignored under `recut=1`, `proof` or `duration`); `?scene=physical` (Track 5 physical chamber; implied by any proposal) with `&room=readable|cloth` and `&passage=hold` (disables the default tar-frontier cut); `&stagehold=1` (freezes the proposal camera on T1/T4 to isolate lighting); Stage + T1 only: `&drape=0`, `&setting=reliquary`, `&light=sequence`; T1 `?scene=original` (restores the pre-September look).
- October ledgers: `?track=nao-querer-nada&ledger=1` (Track 5) and `?track=horas-mortas&ledger=f|a` (Track 4 arms), plus `&edit=1` (Track 4 edit points). They need `?track=` because the bare front page is Track 1, and they are ignored under `recut`, `proof` or `duration`.
- Legacy runtime only: `?post=1`, `?shadows=1`, `?t1director=1`.

There are about 55 flags. They are parsed in `src/js/prototype/film-flags.js`, `cinematic-proposals.js`, `shell.js` (`debug`) and the `uses*()` / `resolve*()` / `get*()` methods of `experience.js`; read those rather than trusting this list. On the front page, `functions.php` skips WordPress's canonical redirect only when a query var from `sonoite_front_page_query_vars()` is present (per its comment, the redirect strips unknown query vars). The trial flags are not in that list, so combine them with `?track=`.

## Architecture: Path B, a frozen legacy runtime, a preview page, and PHP glue

Shared JS used by both JS runtimes: `src/js/audio-manager.js` (Web Audio transport and FFT bands), `src/js/visuals/journey-loader.js`, `src/js/utils/dispose3d.js`.

### A. Legacy runtime (kept in source, player not routed; no new work, no audits)

The pre-reset particle runtime: `src/js/main.js` → `init-experience.js` → `SonoiteExperience` (`src/js/three-experience.js`, ~3.4k lines, exposed as `window.SonoiteExperience`). Its player (`main.js` + the track list in `template-parts/content-track-list.php`) is not enqueued on any route: every front-page request is a prototype request, and `sonoite_enqueue_scripts()` skips `main.js` on prototype and preview requests. `init-experience.js` is still enqueued on the preview template, where it boots `SonoiteExperience` on DOMContentLoaded alongside `preview-experience.js`. So the four tracks without a chamber film (paralisia-do-sono, o-livro-azul, o-filho, homem-educado) cannot be played. Do not audit or extend this code: it serves none of the chamber films. Still open: whether to retire it or generalize Path B to the four unbuilt tracks (see the June audit §4 before deleting either).

How it works, for reference:
1. `loadJourneyByTrackId(slug)` (`journey-loader.js`) fetches `public/assets/journeys/phase42/{slug}.json` (`phase42/reduced/{slug}.json` first under `prefers-reduced-motion` or `window.SONOITE_REDUCED_MOTION = true`), then merges `{slug}-enriched-moments.json`: `enrichedMoments` appends to `journey.moments`, and `additionalFlowElements`/`additionalStructureElements` append **whole visual layers**. Choreography is split across both files (five base JSONs carry real moments), so editing only the enriched file misses base-authored moments. Track 5 also gets **code-injected** camera work (`applyTrack5CameraInjections()`). A phase42 miss throws (the old "v1.2 fallback" requests a non-existent `phase42/track_*.json`); callers fall back to defaults.
2. Visual layers are created by name through `VisualLayerRegistry` / `register-defaults.js`.
3. `JourneyController` (`src/js/visuals/journey-controller.js`, ~5.5k lines) fires timed moments, dispatches 74 action types (schema: `src/js/schemas/action-schema.js`), and processes per-frame `link_audio` bindings (noise gates bass 0.08 / mid 0.10 / treble 0.10 / loudness 0.05, then EMA `smoothed += (raw − smoothed) * alpha`; alphas below ~0.20 strobe).
4. Per-frame Directors: `Track5VoidDirector` and `Track6Director` are on by default (keyed off `journey.meta.slug`); `Track1Director` only via `?t1director=1`. Effective Director flags live at the call site in `three-experience.js`, not the class defaults. `window.TRACK5_DIRECTOR_ENABLED` / `TRACK6_DIRECTOR_ENABLED` / `SONOITE_T1_DIRECTOR` force Directors on off-slug.

### B. Path B chamber films (the current direction)

`src/js/prototype/` (36 files, ~22k lines): `main.js` (boot), `shell.js` (all DOM/UI, CSS injected via one style tag carrying `sonoiteData.cspNonce`), `experience.js` (~8.9k lines: the `ReliquaryPrototypeExperience` class plus the `CHAMBER_VARIANTS` table, exposed as `window.SonoitePrototype`). Routed by `functions.php` (see Routes): prototype requests swap in `page-prototype.php` and enqueue **only** three-vendor + audio-core + the prototype bundle (no security-manager, no init-experience), with a reduced `sonoiteData` (tracks, themeUrl, cspNonce, version, isSecure, isDebug, audioConfig; no apiUrl, nonces or particleCounts).

It renders one GLTF hero relic (`public/assets/models/track5-poc/optimized/*.glb`) in a dark chamber (spot key + rim/back/fill lights, shader floor/shell planes, haze/dust) through its own composer (bloom → grain → vignette → grade → film plate → blackout). AgX tone mapping (Pass 1b deliberately removed the pre-AgX clamps; don't re-add "safety" clamps), manual shadow-map updates, quality-dependent frame pacing (30/24/12 fps playing/settled/idle; `cinema` quality 30/20/10). Two Pass 1 behaviors that look like bugs but are authored: on Track 5 the film plate is **late-track residue** (`idleStrength 0`, invisible until it ghost-returns in ERASURE), and grain keeps a 0.4 floor in blacks. Color identity is per phase: the variant's `gradePhases` table drives `updateGradePass()`, which rewrites grade uniforms **every frame** with a ~3.5 s crossfade, so hand-setting grade uniforms in the console, or authoring flat grade values, silently does nothing.

**Module layers:**
- **Per-track films**: `films/{sonoite,horas-mortas,nao-querer-nada}.js` each export that track's authored timeline (phase windows, camera score, lighting score, event beats), imported directly by `experience.js` into the track's `CHAMBER_VARIANTS` entry (`sonoite-cinema`, `horas-mortas-cinema`, `track5-cinema`). Adding a built track = new film module + `CHAMBER_VARIANTS` entry + `TRACK_DEFAULT_VARIANT` (experience.js) + `BUILT_TRACK_CYCLE` (shell.js) + `VARIANTS` (cinematic-proposals.js) + `STATIC_TRACKS`/`TRACK_STATIC_ASSETS` (build-static-prototype.mjs) if it should export statically.
- **Track-specific rigs**: `chamber-practicals.js` (T1 candles/votives), `chamber-sodium.js` (T4 sodium fixture state machine), `recut-*.js` + `track5-*.js` (T5 recut lane and tar/surface work), `relic-mutation.js` (T5 irreversible tar progress).
- **Shared chamber systems**: `shot-director.js`, `light-rigs.js`, `living-chamber.js`, `commit-reactions.js`, `audio-accent-detector.js`, `fill-meter.js`, `film-flags.js`, `hero-model-urls.js`.
- **September trials**: `cinematic-proposals.js`, `physical-chamber.js`, `physical-drape.js`, `track1-*.js`. All opt-in via flags, **except** the T1 quiet scene: `usesQuietScene()` is the default for `sonoite-cinema`, and `?scene=original` restores the pre-September look.
- **October ledgers**: `track4-ledger.js` (`?track=horas-mortas&ledger=f|a`, built on the Stage room, `&edit=1` edit points) and `track5-ledger.js` (`?track=nao-querer-nada&ledger=1`). Both are pure functions of track time and are ignored under recut/proof/duration.

**Choreography is declarative, not moment-driven**: Path B ignores `moments`/actions entirely. On the default `track5-cinema` variant the score lives almost entirely **in code**: `TRACK5_CHAMBER_FILM_TIMELINE` (`films/nao-querer-nada.js`) owns the phase windows, 12-cue camera score, lighting score, `roomPressureBeats` and `eventBeats`. `buildChamberConfig()` deep-merges the variant timeline OVER the JSON's `prototype_chamber` params, and its deepMerge **replaces arrays wholesale**, so the JSON's camera score and beat lists are dead on this route: editing them (or enriched moments) has no effect. What survives from `phase42/nao-querer-nada.json`: `musicalAnchors` plus `post`/`ground`/`air`/`darknessMode`. `?variant=<key>` selects other `CHAMBER_VARIANTS`, the only way to see JSON-authored scores run.

**Reactivity doctrine** (binding for all Path B work): 70 % authored macro arc / 25 % autonomous breathing / 5 % audio punctuation (Prompt #230 raised breathing/punctuation drive on all three films; macro arc, cameras, phases, palettes and smoothing untouched). Camera framing, relic, phases and palette are authored, not driven by audio. The documented exceptions are small and clamped: an audio term in `dynamicState.breathing` that moves camera height/target and the relic's sway, and a mid-band term on the relic's iridescence (both explained at the top of `commit-reactions.js`). "If the viewer can't tell what changed, the change didn't happen." Work proceeds in **owner-gated passes**: the owner judges each pass live before the next starts; overshoot perceivability, then pull back to taste.

### C. Preview page

`page-preview.php` + `src/js/preview-experience.js`: a self-contained single-track marketing page (launch-email capture, share buttons) driven by the `sonoite_preview_track` option. It uses none of the journey machinery, but the template also enqueues `security-manager.js` and `init-experience.js` (see A).

### WordPress layer

- `functions.php` loads the six `inc/` modules, which are the only files in `inc/`: enable-block-editor, theme-setup (the `track` CPT), performance (cached tracks builder, manifest loader, cleanup cron), rest-endpoints, admin-functions, security-functions. The root PHP files are standard WordPress templates (`index.php`, `single-track.php`, `archive-track.php`, `page-prototype.php`, `page-preview.php`, `header.php`, `footer.php`, `template-parts/*`).
- Routing: the `template_include` filter serves `page-prototype.php` for every prototype request (front page, the "Sonoite Prototype" template, `?prototype=1`). The URL key is `track`; the CPT's query var is `sonoite_track`, renamed in #231 because the two collided.
- Assets: `sonoite_enqueue_scripts()` resolves hashed bundles from `dist/.vite/manifest.json` (falling back to `dist/manifest.json`); missing manifest keys are silently skipped. Theme JS loads **only** on the front page, the preview template, or prototype requests; other pages get none by design.
- Data to JS: `wp_localize_script(..., 'sonoiteData', ...)`. The full payload (preview template) has tracks, apiUrl, `nonce` (legacy, read only as a fallback by `audio-manager.js`, `performance-monitor.js` and `security-manager.js`), restNonce, audioConfig, particleCounts, i18n. Prototype requests get the reduced payload described in B. Tracks come from the `track` CPT via a cached raw-SQL builder in `inc/performance.php` (12 h transient).
- REST: `sonoite/v1` (`inc/rest-endpoints.php`): `GET /tracks`, `GET /tracks/{id}` (rate-limited, cached), `POST /preview-email`, CSP/security/performance report endpoints, admin-only `/cache` and `/performance`.
- `sonoite_validate_audio_url()` silently drops tracks whose audio URL host isn't `home_url()`'s host or whose extension isn't mp3/wav/ogg/m4a/flac/aac.
- CSP: all CSP logic (per-request nonce, header builder, the disable switch) lives in `functions.php`, not `inc/security-functions.php`. `SONOITE_DISABLE_CSP=true` in `wp-config.php` turns CSP off only when `WP_ENVIRONMENT_TYPE` is `local`/`development` (or unset); `local`/`development` also selects the relaxed dev policy. The author's local site runs with CSP off.

### Journey data

`public/assets/journeys/phase42/` is the live format; `v1.2/` and `phase4_3_final/` are older generations. `phase42/reduced/` variants (nested, not a sibling dir) are served under reduced motion (Track 5's reduced file is stale old-schema). In `analysis/`, the Meyda `{slug}.analysis.json` files are authoring reference only, but `analysis/{slug}/beats.json` is fetched at runtime by the Track 5 shot director (`resolveShotDirectorBeatGridUrl()`) and shipped, with `phases.json`, by the static export.

## Working model (the author's setup, August to October 2026)

How this project was built. These CLIs are the author's local tooling; without them, implement directly against the same spec-and-acceptance-criteria discipline.

The owner was creative director and product owner. Claude in Claude Code orchestrated (Fable 5.1; the October audit's mechanical gates name Opus 5.5): specs, verification, commits, memory. **Implementation went to local CLIs:**
- **Build:** `cursor-agent -p --model composer-2.5 "<spec>"` (write access) or `codex exec --sandbox workspace-write`, always against a written spec file with exact acceptance criteria; review their `git diff` rather than re-reading whole files.
- **Verify/review:** `codex exec --sandbox read-only` (conformance/adversarial), `cursor-agent -p` (code/config review), `agy` (Gemini: data cross-checks and listening passes; `agy -p` print mode exited without listening on 2026-10-01; the graded pass ran in headless JSON mode, see `docs/qa/GEMINI_LISTENING_BRIEF_2026-10-01.md` and `docs/qa/gemini-listening-2026-10-01/README.md`), Grok craft reviews via `cursor-agent -p --model cursor-grok-4.6-high`. Independent creative review rounds sent one read-only brief to Claude Fable 5.1 and GPT-6 Astra separately, then recorded a synthesis (`docs/qa/aesthetic-*-2026-10-01/`, `docs/qa/track5-ledger-2026-10-02/REVIEW_*`).
- **Economy:** one CLI task per chunk of work (capture + process + report); contact sheets (`montage`) over per-frame screenshots; ingest CLI reports as verdict + disk path; a fresh session per workstream with a handoff note when a phase closes.

## Conventions

- ESLint (`.eslintrc.cjs`): WordPress + security + jsx-a11y presets; 4-space indent (a 2-space override covers the legacy runtime and a few shared modules written that way), single quotes, semicolons, `eqeqeq`, `curly`, no `var`. i18n text domain `sonoite-theme`.
- Commits: in the private repo, `Prompt #N: Short description` (that history ended at Prompt #247). This public snapshot's history starts fresh and its commits are not numbered. Commit early and often.
- History: this snapshot was cut from the private repo's `experiment/track4-state-ledger` branch at Prompt #247 (2026-10-02). Docs that cite other branches (`experiment/physical-ambience`, `experiment/track5-recut-lehr`, …) or "uncommitted" September work refer to that private history; all of it was committed before the snapshot. Code comments also cite working documents left out of this snapshot: `AESTHETIC_UX_SYNTHESIS_2026-07-20`, `TRACK1_CHAMBER_PROPOSAL_2026-08-13`, `TRACK1_MUSICAL_MAP_2026-08-13`, `UNIFIED_CREATIVE_DIRECTION_2026-03-11`, `blender-reliquary-stills/PARITY.md` and the Track 4 v2/v3 specs. "Build spec §N" is `TRACK5_AUDIO_LED_RECUT_APPROVED_BUILD_SPEC_2026-07-23` and "audit 2026-08-13" is `FULL_THEME_AUDIT_2026-08-13`; the public design record for the recut is `docs/superpowers/specs/2026-07-23-track5-recut-creative-layer-design.md`.
- Path B's shaders are inline GLSL strings or `onBeforeCompile` patches in six prototype files (`experience.js`, `chamber-sodium.js`, `physical-chamber.js`, `physical-drape.js`, `relic-mutation.js`, `track1-stage-materials.js`); the legacy runtime has its own inline shaders in about 23 files under `src/js/`. There are no `.glsl` files and no shader loader.
- Shader effects: start subtle (~50 % of what seems right) and desaturate first drafts; additive-blend new effects over the original color, never replace.

## Gotchas

- **`dist/` goes stale silently.** Run `npm run build` before judging anything in the browser; stale builds have repeatedly caused false visual verdicts.
- **No HTML `<audio>` element in either runtime.** Use `audioManager.getCurrentTime()` / `seekTo()`; on Path B, `window.SonoitePrototype.audio`. `document.querySelector('audio')` patterns from old docs do not work.
- **Prototype seeks need transport sync**: the room is wall-clock anchored. A valid test seek sets `audio.seekTo(t)` AND `p.state.currentTime = t` AND `p.transportStartSeconds = performance.now()/1000 - t` (protocol in `BASELINE_2026-06-10.md`).
- **Several suites scrape source text** (film configs, transport ordering, light rigs, recut seams, the static exporter): renaming a `const TRACK5_*` token or reordering a block can fail them without a behavior change. The behavioral suites include the ledgers, the shot director, chamber-variant isolation and `audit-p1-*`.
- **Legacy runtime, if you must read it:** post-processing is off unless `?post=1` sets `window.SONOITE_POST`; `VisualLayerRegistry.create()` passes the whole element object to `setConfig()`, so authored params are at `this.cfg.params.*` (use `const p = this.cfg.params || this.cfg;`); Directors and enriched moments conflict on ownership of `post` actions and camera splines; `window._sonoiteInitState` is the only double-init guard between `main.js` and `init-experience.js`, so don't remove it.
- **`.claude/agents/` holds pre-reset role prompts**, kept as process history. The seven files date from February 2026 and describe the pre-reset particle runtime (VoidSphere, monoliths, `three-experience.js`), not the chamber films; don't dispatch them for Path B work.
- **`src/js/modules/consciousness-core.js`** is the only file left of the pre-reset consciousness system. The legacy runtime imports it through `visuals/core/ConsciousnessCore.js`, so it ships inside the init-experience bundle.
- Analysis scripts: `scripts/analyze-audio.js` takes `--input`/`--config` (the config uses repo-relative `audio/` paths); `scripts/deep-audio-analysis.cjs` reads `SONOITE_UPLOADS_DIR` (default: the WordPress `uploads/2025/08` folder) and needs `ffmpeg` and `aubio` on PATH; `scripts/librosa_analyze.py` needs Python with librosa. The analysis config and the static export expect differently named MP3s.

## Browser Verification Discipline

Claims about visuals require evidence from a running site on a fresh build:

- Prefer state dumps (a browser-automation tool's script evaluation) over screenshots: `window.SonoitePrototype.getMacroState(t)` (Path B phase/room state); legacy runtime in debug mode: `window.diag()`, `window.postfx`.
- Save screenshots to disk (jpeg, quality ~35) rather than inline, take few, and don't read saved screenshots back into context when a state dump can answer the question.
- In the author's setup, waits of 30 s or more disconnected the browser extension; chain waits of 15 s or less.
- Never claim "verified" from a screenshot you didn't inspect, and never fix a "bug" reported by an old audit doc without confirming it exists in the current code: line numbers and diagnoses in audit files drift.
