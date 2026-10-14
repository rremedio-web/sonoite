# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A WordPress theme (`sonoite-theme`) that renders a 7-track album ("The Deconstruction of the Self") as an audio-reactive Three.js experience. The product is a **browser-native album listener** — a cinematic room that performs the music — not a visualizer or screensaver.

Since the March 2026 product reset, the live direction is **"Path B": a reliquary chamber film-style runtime**, piloted on Track 5 (Não Querer Nada). The pre-reset "void" implementation still exists, but since Prompt #231 (2026-08-15) it is no longer what visitors see: the front page boots the Path B chamber. **Always state which runtime a finding or change targets** — most historical confusion in this repo comes from Track 5 having two competing implementations under one journey filename.

## Read First (current-state truth, in order)

1. `docs/qa/END_GOAL_AND_PRODUCT_RESET.md` — what the product is; the reset decision
2. `docs/qa/FULL_THEME_AUDIT_2026-06-06.md` — current-state source of truth (runtimes map, per-track state, P0 roadmap)
3. `docs/superpowers/specs/2026-06-10-track5-chamber-perceivability-rebuild-design.md` + `docs/superpowers/plans/2026-06-10-track5-perceivability-pass1.md` — the active work (owner-gated perception passes)
4. `docs/qa/FABLE51_EXPERIENCE_QA_UPDATE_2026-09-05.md` — **freshest state (September 2026)**: a newest-first running log of the opt-in trials (physical scene, room reveal, cloth, tar-passage cut), each entry naming its bundle, flags and review player. Then `THREE_CINEMATIC_PROPOSALS_2026-09-06.md` → `FABLE51_DIRECTION_RECOMMENDATION_2026-09-07.md` → `STAGE_HYBRID_TRIAL_2026-09-07.md` (the Intimate/Chamber/Afterimage/Stage comparison and its reviewer recommendation — **none is owner-adopted**).
5. `docs/qa/perceivability/PASS1B_EVIDENCE_2026-07-04.md` + `IDEAS_PARKED_2026-07-04.md` — the July perceivability pass. Pass 1b values (grain floor 0.4, plate `erasureBoost` 0.72, `gradePhases` strengths) are deliberate overshoots awaiting an owner trim — do not "fix" them down. Parked ideas are gate-routed; don't re-brainstorm or implement them early.
6. `docs/qa/perceivability/BASELINE_2026-06-10.md` — numerical baseline, real phase windows, the prototype seek/capture protocol
7. `docs/qa/MUSIC_INTERACTION_MATRIX.md` — the reactivity doctrine governing all visual work

**Scope of this repo:** a curated public snapshot of the private working repository (595 commits, Jul 2025 – Oct 2026). Session artifacts, superseded audits and pre-reset creative docs (the killed black-hole/void direction) were left out; `docs/` keeps only the current-state documents and the latest review rounds. Do not rebuild what the reset killed.

## Commands

```bash
npm install            # check node_modules exists first; some checkouts lack it
npm run build          # vite build → dist/ + dist/.vite/manifest.json — REQUIRED for WordPress to see JS changes
npm run build:watch    # the practical dev loop (PHP has no Vite dev-server integration; WP always serves dist/)
npm run dev            # Vite dev server on 127.0.0.1:3000 — NOT consumed by WordPress

npm run lint           # eslint src --fix (auto-fixes)
npm run lint:check     # read-only lint

npm run test:full      # THE gate for commit claims — full suite, no coverage threshold, default reporter (added #235)
npm test               # full Jest suite (TMPDIR=/tmp baked in via cross-env)
npm test -- tests/unit/signalPipeline.test.js --coverage=false --reporters=default
                       # single test file: --coverage=false avoids the hardwired 80% global
                       # threshold failing single-file runs; --reporters=default bypasses html/junit reporters

npm run validate:journeys          # journey JSON vs action schema (warn-only; :strict fails on all warning classes, :ci only on unknown action types; --only-files= scopes to one journey)
npm run assets:track5:optimize     # gltf-transform pipeline for the Track 5 relic GLBs
npm run analyze:audio -- --config scripts/audio-analysis.config.json
                       # offline Meyda analysis → public/assets/journeys/analysis/ — bare run just prints usage;
                       # the config file carries machine-local Downloads MP3 paths
```

Live routes (a local WordPress site — the author uses LocalWP at `http://sonoite.local/` — with this theme active and the album MP3s in `wp-content/uploads/2025/08/`):
- `http://sonoite.local/` — **Path B chamber, Track 1 (since Prompt #231)**: `sonoite_is_prototype_request()` in `functions.php` is true for `is_front_page()`, so the bare homepage boots the prototype with `DEFAULT_ENTRY_TRACK_SLUG = 'sonoite'` (in `experience.js`); `?track=horas-mortas` / `?track=nao-querer-nada` select the other built films (`BUILT_TRACK_CYCLE` in `src/js/prototype/shell.js`). The old runtime is not reachable from the front page.
- `http://sonoite.local/?prototype=1` — same Path B prototype, explicit (defaults to Track 1 too since #231; `?track=<slug>` to point elsewhere)
- When LocalWP is stopped, September review players were served from an ad-hoc static server at `http://127.0.0.1:8765/` (`/proposals/`, `/review/`, `/room-review/`, …) out of a copy outside the repo — not a repo script. `public/proposals/` (the proposal comparison page) ships into `dist/proposals/` on build; `npm run export:static` writes the standalone album package to `dist-static/`.
- Useful query flags: `?post=1` (enable old-runtime post-processing), `?t1director=1`, `?debug=1`; prototype: `?variant=<chamber-variant>` (see below — decides whether the code timeline overrides the JSON), `?quality=` / `?cinema=1`, `?dpr=`, `?fps=` (clamped 12–60), `?proof=<seconds>` (alias `?duration=`), `?plate=0` / `?compositor=0` (both kill the film plate), `?msaa=0-8`, `?dither=0`, `?seed=<n>` (replays the living-chamber session), `?tweak=1` (live-trim panel), `?probe=A-D` (blind doctrine probes — mapping shuffled per session, unmask via `__revealProbe()` in console; one letter is always the doctrine-pure control), `?recut=1` (audio-led middle recut; canonical Track 5 cinema only), `?lehr=1` (lookdev bundle on top of recut; no-op without `recut=1`; see `docs/qa/TRACK5_LEHR_LOOKDEV_2026-08-13.md`), `?listen=1` (recut-only commits + rotating rim/floor/bloom accents; no-op without `recut=1`). The full flag set (~45) is parsed in `src/js/prototype/film-flags.js`, `cinematic-proposals.js`, and the `uses*()` predicates in `experience.js` — read those rather than trusting this list. September trial axes: `?proposal=intimate|chamber|afterimage|stage` (cinema variants only; ignored under `recut=1` or `proof`); `?scene=physical` (T5 physical chamber; implied by any proposal) with `&room=readable|cloth`, `&passage=hold` (disables the default tar-frontier cut); `&stagehold=1` (freezes the proposal camera on T1/T4 to isolate lighting); Stage+T1 only: `&drape=0`, `&setting=reliquary`, `&light=sequence`; T1 `?scene=original` (see Path B).

Known-broken gates (not regression signals): `npm run validate` always fails — Jest hardwires `collectCoverage: true` with an 80% global threshold against ~3% real coverage (plus per-file 95%/90% thresholds on security-manager.js/audio-manager.js). The Jest `projects` config only matches `tests/{unit,security}/` dirs that exist; `tests/*.test.js` at the tests root never run.

## Architecture: Three JS Runtimes + PHP Glue

Each runtime builds its own scene, post chain, and AudioManager instance. Shared code between them: `src/js/audio-manager.js`, `src/js/visuals/journey-loader.js`, `src/js/utils/dispose3d.js`.

### A. Old runtime (LEGACY — not served on the front page since Prompt #231; no new work, no audits)

Since Prompt #231 the front page routes to the Path B prototype (see Live routes). This runtime only matters for the four tracks without a chamber film (paralisia-do-sono, o-livro-azul, o-filho, homem-educado) and visitors never reach it from `/`. Do not audit or extend it — an external audit on 2026-08-21 spent 13 findings on code nobody sees.

Entry chain: `main.js` → `init-experience.js` → `SonoiteExperience` (`src/js/three-experience.js`, ~3.5k lines, exposed as `window.SonoiteExperience`). Boot loads `phase42/idle.json` as an attract state; clicking a `.track-button` (markup in `template-parts/content-track-list.php`) runs `selectTrack()`:

1. `loadJourneyByTrackId(slug)` (`src/js/visuals/journey-loader.js`) fetches `public/assets/journeys/phase42/{slug}.json`, tries `phase42/reduced/{slug}.json` under `prefers-reduced-motion` (or `window.SONOITE_REDUCED_MOTION = true`), then merges `{slug}-enriched-moments.json`: key `enrichedMoments` appends to `journey.moments`, and `additionalFlowElements`/`additionalStructureElements` append **whole visual layers**, not just choreography. Choreography is split across both files — five base JSONs carry real moments (paralisia-do-sono 15, horas-mortas 12, o-filho 12, o-livro-azul 9, homem-educado 12); only `sonoite`/`nao-querer-nada` (and idle) are empty — so editing only the enriched file misses base-authored moments. Track 5 additionally gets **code-injected** camera work: `applyTrack5CameraInjections()` forces `camera_mode='void_drift'` and injects 4 `camera_spline` moments that appear in no JSON (skipped on the reduced path). Fetch failure falls back to the `v1.2/` generation.
2. Visual layers are created by name through `VisualLayerRegistry` / `register-defaults.js` (~12 flow types, ~16 structure types; core layers skybox/lighting/camera built separately).
3. `JourneyController` (`src/js/visuals/journey-controller.js`, ~5.5k lines) fires timed moments with crossed-trigger logic, dispatches ~77 action types (schema: `src/js/schemas/action-schema.js`), and processes per-frame `link_audio` bindings (noise gates bass 0.08 / mid 0.10 / treble 0.10 / loudness 0.05, then EMA `smoothed += (raw − smoothed) * alpha`; links that don't specify smoothing default to 0.15 — empirically, alphas below ~0.20 strobe; safe range 0.75–0.92).
4. Per-frame Directors layer on top: `Track5VoidDirector` and `Track6Director` are ON by default (keyed off `journey.meta.slug`); `Track1Director` is OFF (only via `?t1director=1` — Track 1 plays from its enriched moments alone). Directors publish phase into `audioData.directorPhase` / `voidPhase` / `filhoPhase` for layers to read. Track5VoidDirector's four feature flags default `false` in the class, but the call site in `three-experience.js` turns `keyMomentsEnabled` and `useDirectorEclipseTrigger` ON for real visitors — effective state lives at the call site, not the class. `window.TRACK5_DIRECTOR_ENABLED` / `TRACK6_DIRECTOR_ENABLED` / `SONOITE_T1_DIRECTOR` force Directors on off-slug (debug levers; a stale global explains a Director running on the wrong track).

### B. Path B prototype (the current direction)

`src/js/prototype/` — `main.js` (boot), `shell.js` (all DOM/UI, CSS injected via style tag), `experience.js` (~8.9k-line `ReliquaryPrototypeExperience` class plus the `CHAMBER_VARIANTS` table, exposed as `window.SonoitePrototype`). Routed by `functions.php`: `?prototype=1` (or the "Sonoite Prototype" page template) swaps in `page-prototype.php` and enqueues **only** three-vendor + audio-core + the prototype bundle — no security-manager, no init-experience, and a wholesale-replaced reduced `sonoiteData` (no apiUrl, nonces, or particleCounts).

It renders one GLTF hero relic (`public/assets/models/track5-poc/optimized/*.glb`) in a dark chamber (spot key + rim/back/fill lights, shader floor/shell planes, haze/dust) through its own composer (bloom → grain → vignette → grade → film-plate → blackout; all shaders inline in experience.js). AgX tone mapping (Pass 1b deliberately removed the pre-AgX clamps — don't re-add "safety" clamps), manual shadow cadence, quality-dependent frame pacing (30/24/12 fps; `cinema` quality 30/20/10). Two Pass 1 behaviors that look like bugs but are authored: the film plate is **late-track residue** (`idleStrength 0` — invisible until it ghost-returns in ERASURE), and grain keeps a 0.4 floor in blacks. Color identity is per-phase: the variant's `gradePhases` table drives `updateGradePass()`, which rewrites grade uniforms **every frame** with a ~3.5s crossfade — hand-setting grade uniforms in the console, or authoring flat grade values, silently does nothing.

**Module layers** (the 30-odd prototype files sort into these):
- **Per-track films** — `films/registry.js` maps slug → `films/{sonoite,horas-mortas,nao-querer-nada}.js` (Prompt #204), each holding that track's authored camera/light/event score; each track boots its own cinema variant (`sonoite-cinema`, `horas-mortas-cinema`, `track5-cinema`). Adding a built track = new film module + registry entry + `BUILT_TRACK_CYCLE`.
- **Track-specific rigs** — `chamber-practicals.js` (T1 candles/votives), `chamber-sodium.js` (T4 sodium fixture state machine), `recut-*.js` + `track5-*.js` (T5 recut lane and tar/surface work), `relic-mutation.js` (T5 irreversible tar progress).
- **Shared chamber systems** — `shot-director.js`, `light-rigs.js`, `living-chamber.js`, `commit-reactions.js`, `audio-accent-detector.js`, `fill-meter.js`.
- **September trials** — `cinematic-proposals.js`, `physical-chamber.js`, `physical-drape.js`, `track1-*.js`. All opt-in via the flags above, **except** the T1 quiet scene: `usesQuietScene()` is the default for `sonoite-cinema`, with `?scene=original` restoring the pre-September look.

**Choreography is declarative, not moment-driven**: it ignores `moments`/actions/the registry entirely. On the default `track5-cinema` variant the score lives almost entirely **in code**: `TRACK5_CHAMBER_FILM_TIMELINE` (now in `films/nao-querer-nada.js`) owns the phase windows, 12-cue camera score, lighting score, `roomPressureBeats`, and `eventBeats`. `buildChamberConfig()` deep-merges the variant timeline OVER the JSON's `prototype_chamber` params, and its deepMerge **replaces arrays wholesale** — so the JSON's camera score and beat lists are dead on this route: editing them (or enriched-moments) has zero effect. What survives from `phase42/nao-querer-nada.json`: `musicalAnchors` (the timeline has no such key) plus `post`/`ground`/`air`/`darknessMode`. `?variant=<key>` selects other `CHAMBER_VARIANTS` — the only way to see JSON-authored scores actually run.

Reactivity doctrine (binding for all Path B work): 70% authored macro arc / 25% autonomous breathing / 5% audio punctuation (Prompt #230 amended it: breathing/punctuation drive +15% on all three films; macro arc, cameras, phases, palettes and EMA smoothing untouched). Camera, relic, phases, and palette never react to audio directly. "If the viewer can't tell what changed, the change didn't happen." Work proceeds in **owner-gated passes** — Ricardo judges each pass live before the next starts; overshoot perceivability, then pull back to taste.

### C. Preview runtime

`src/js/preview-experience.js` + `page-preview.php` — a self-contained single-track marketing page (email capture) driven by the `sonoite_preview_track` WP option. Uses none of the journey machinery.

### The routing gap (CLOSED by Prompt #231, 2026-08-15)

Closed at the WordPress layer rather than by registering `prototype_chamber` in `register-defaults.js`: the front page itself is a prototype request, so visitors get the chamber films for the three built tracks (T1 sonoite, T4 horas-mortas, T5 nao-querer-nada) and never the old void grammar. Root cause of the earlier query stripping was the `track` query key colliding with the `track` CPT query var (renamed + rewrite flush in #231). Still open: the retire-OLD-vs-generalize-Path-B decision for the four unbuilt tracks — check the June audit §4 before deleting either runtime.

### WordPress layer

- `functions.php` loads exactly six `inc/` modules: enable-block-editor, theme-setup, performance, rest-endpoints, admin-functions, security-functions. **Everything else in `inc/` and root PHP (`functions-step*.php`, `fix-asset-loading.php`, `admin-security-dashboard.php`, …) is dead code** — fixes there have no runtime effect. One exception: root `admin-fix-audio.php` declares a page template ("Admin Fix Audio"), so it runs if any page gets assigned to it from wp-admin.
- Assets: `sonoite_enqueue_scripts()` resolves hashed bundles from `dist/.vite/manifest.json`, falling back to legacy `dist/manifest.json` if the `.vite` one is missing; missing manifest keys are silently skipped. Theme JS loads **only** on the front page, `page-preview.php`, or prototype requests (the enqueue also checks the `page-album.php` template, but that file doesn't exist — dead branch) — other pages get nothing by design.
- Data to JS: `wp_localize_script(..., 'sonoiteData', ...)` — tracks (from the `track` CPT via a cached raw-SQL builder in `inc/performance.php`, 12h transient), apiUrl, nonces, audioConfig, particleCounts.
- REST: `sonoite/v1` namespace (`inc/rest-endpoints.php`) — `GET /tracks`, `GET /tracks/{id}` (rate-limited, cached), `POST /preview-email`, CSP/security/performance report endpoints, admin-only `/cache`.
- `sonoite_validate_audio_url()` silently drops tracks whose audio URL host isn't `home_url()`'s host or whose extension isn't mp3/wav/ogg/m4a/flac/aac.
- Local env switches live in the site's `wp-config.php`: `WP_ENVIRONMENT_TYPE='local'`, `SONOITE_DISABLE_CSP=true`, `WP_DEBUG` false (CSP currently off locally; re-enabling without `WP_ENVIRONMENT_TYPE=local` yields the strict prod policy). All CSP logic — nonce generation, header builder, the disable check — lives in `functions.php` itself, not `inc/security-functions.php`.

### Journey data generations

`public/assets/journeys/phase42/` is the only live format. `v1.2/`, `phase4_3_final/`, and `backup-*/` are older generations; `phase42/reduced/` variants (nested, not a sibling dir) are served under `prefers-reduced-motion` or `window.SONOITE_REDUCED_MOTION = true` (Track 5's reduced file is stale old-schema). The precomputed analysis JSONs in `analysis/` are **authoring reference only** — their runtime loader (`src/js/audio/PreAnalyzedAudioLoader.js`) is imported by no runtime code (one Jest test imports it, so deleting it breaks the suite).

## Working model (owner directive 2026-08-14 — binding)

Claude (Fable) is the **creative director and orchestrator only** — creative decisions, specs, verification, commits, memory. **Implementation goes to the local CLIs** to save Anthropic tokens:
- **Build:** `cursor-agent -p --model composer-2.5 "<spec>"` (write access) or `codex exec --sandbox workspace-write` — always against a Fable-authored spec file with exact acceptance criteria; review their `git diff`, never re-read whole files.
- **Verify/review (CLIs FIRST, never Claude subagents by default):** `codex exec --sandbox read-only` (conformance/adversarial), `cursor-agent -p` (code/config review), `agy -p='…'` (prompt must be attached to the flag; data cross-checks; Gemini can also **hear audio** — but headless print mode launched a tool and exited without listening on 2026-10-01, so audio tasks run interactively via `agy --model gemini-3.8-flash-high -i='…'`; see `docs/qa/GEMINI_LISTENING_BRIEF_2026-10-01.md`), Grok craft reviews via `cursor-agent -p --model cursor-grok-4.6-high` (normal tier, never `-fast`; standalone `grok` CLI retired). Opus via the Agent tool ONLY when a finding changes shipped behavior and the CLIs disagree.
- **Economy:** chunky delegation (one CLI task doing capture+process+report, not three); contact sheets (`montage` installed) over per-frame screenshots; ingest CLI reports as verdict + disk path; fresh session per workstream with a handoff memory when a phase closes.

## Conventions

- ESLint (`.eslintrc.cjs`): WordPress + security + jsx-a11y presets; 4-space indent, single quotes, semicolons, `eqeqeq`, no `var`. i18n text domain `sonoite-theme`.
- Commits: `Prompt #N: Short description` (sequential; check `git log` for the current N). Commit early and often — this repo has lost uncommitted work to a rogue `git checkout --` before.
- History: this snapshot was cut from the private repo's `experiment/track4-state-ledger` branch at Prompt #247 (2026-10-02). Docs that cite other branches (`experiment/physical-ambience`, `experiment/track5-recut-lehr`, …) or "uncommitted" September work refer to that private history; all of it was committed before the snapshot.
- Shader effects: start subtle (~50% of what seems right) and desaturate first drafts; additive-blend new effects over the original color, never replace.
- `.glsl` imports work via an inline Vite plugin (mirrored in Jest by `tests/transformers/glsl-transformer.js`).

## Gotchas

- **Old-runtime post-processing is OFF by default** — `setupPostProcessing` bails unless `window.SONOITE_POST` is set, which only `?post=1` does. Default visitors also get pixel ratio capped at 1.0.
- **No HTML `<audio>` element in runtimes A or B.** Use `audioManager.getCurrentTime()` / `seekTo()`; on Path B, `window.SonoitePrototype.audio`. `document.querySelector('audio')` patterns from old docs do not work.
- **Prototype seeks need transport sync**: the room is wall-clock anchored. A valid test seek sets `audio.seekTo(t)` AND `p.state.currentTime = t` AND `p.transportStartSeconds = performance.now()/1000 - t` (protocol in `BASELINE_2026-06-10.md`). Phase state also desyncs after naive seeks on the old runtime — for reliable phase testing, play through.
- **`dist/` goes stale silently.** Run `npm run build` before judging anything in the browser; stale builds have repeatedly caused false visual verdicts.
- **`VisualLayerRegistry.create()` passes the whole element object to `setConfig()`**, so authored params are at `this.cfg.params.*`, not `this.cfg.*`. Systemic; use `const p = this.cfg.params || this.cfg;` in layers.
- **Dead code that still builds**: `src/js/track-loader.js` (pinned into the audio-core chunk, imported by nothing), `consciousness-system.js` + the `src/js/modules/` tree (~15k lines, built but never enqueued — the enqueue is commented out in functions.php). Don't extend them. Removing the consciousness code means editing `vite.config.js` in two places (it's both a build entry and a dedicated `consciousness` manualChunk) or the build breaks.
- Both `main.js` and `init-experience.js` are enqueued and main imports init — `window._sonoiteInitState` is the only double-init guard; don't remove it.
- Directors and enriched moments conflict on ownership: `useDirectorPostProcessing` stays `false` when enriched moments author `post` actions; same for camera splines. Check the flags in the Director before enabling anything.
- `scripts/analyze-audio.js` is path-agnostic (`--input`/`--config` CLI args; the machine-local Downloads MP3 paths live in `scripts/audio-analysis.config.json`); `scripts/deep-audio-analysis.cjs` hardcodes a wp-uploads path and needs the `aubio` CLI.

## Browser Verification Discipline

Claims about visuals require evidence from the live site, on a fresh build:

- Screenshots: save to disk via the screenshot tool's `filePath` param (jpeg, quality ~35). Never take more than ~8 inline screenshots, and **never Read saved screenshots back into context** — analyze via state dumps instead.
- Prefer `evaluate_script` state dumps over screenshots for assertions: `window.diag()` (old runtime, debug mode), `window.postfx`, `window.SonoitePrototype.getMacroState(t)` (Path B phase/room state).
- Long waits (≥30s) disconnect the browser extension — chain ≤15s waits.
- Never claim "verified" from a screenshot you didn't inspect, and never fix a "bug" reported by an old audit doc without confirming it exists in the current code — line numbers and diagnoses in audit files drift.
