# CLAUDE.md

Working brief for coding agents (Claude Code reads this file) and the architecture reference for human readers. Every statement here is meant to be true for this repository; if code and this file disagree, trust the code and fix this file.

## What This Is

A standalone Vite web app that plays the seven-track album *Sonoite* as real-time Three.js chamber films. The product is a **browser-native album listener**, a room that performs the music, not a visualizer or screensaver. It was a WordPress theme (`sonoite-theme`, still the npm package name) until October 2026 (that version is tagged `wordpress-theme` in this repository); the detach turned it into a static site (`index.html` → `src/js/site/boot.js`) that `npm run build` writes to `dist/`, set up for Netlify hosting (`npm run deploy`).

Since the March 2026 product reset, the live direction is **"Path B": a reliquary chamber-film runtime** (`src/js/prototype/`), first piloted on Track 5 (*Não querer nada*). Three films are built: Track 1 `sonoite`, Track 4 `horas-mortas`, Track 5 `nao-querer-nada`. Tracks 2, 3, 6 and 7 have no film and cannot be played. The pre-reset particle runtime is kept as source and tests only, as a reference for building those four films; nothing builds or loads it (see Architecture A). **Always state which runtime a finding or change targets**: most historical confusion in this repo comes from Track 5 having had two competing implementations under one journey filename.

## Read First (in order)

1. `docs/qa/END_GOAL_AND_PRODUCT_RESET.md`: what the product is; the reset decision.
2. `docs/qa/MUSIC_INTERACTION_MATRIX.md`: the reactivity doctrine governing all visual work.
3. `docs/qa/AUDIT_LAST_2_MONTHS_2026-10-01.md`: latest state (October 2026). Its P0 and the P1 fix batch were resolved in Prompt #236; the status note under its title says what remains.
4. `docs/qa/TRACK4_STATE_LEDGER_2026-10-01.md` → `docs/qa/track4-ledger-2026-10-01/RESULTS.md`, and `docs/qa/track5-ledger-2026-10-02/{LEDGER,RESULTS}.md`: the latest work, the opt-in state-ledger trials. **Not owner-adopted**; the default films are unchanged.
5. `docs/qa/perceivability/PASS1B_EVIDENCE_2026-07-04.md` + `IDEAS_PARKED_2026-07-04.md`: the July perceivability pass. Pass 1b values (grain floor 0.4, plate `erasureBoost` 0.72, `gradePhases` strengths) are deliberate overshoots awaiting an owner trim. Do not "fix" them down. Parked ideas are gate-routed; don't re-brainstorm or implement them early.
6. `docs/qa/perceivability/BASELINE_2026-06-10.md`: numerical baseline, real phase windows, the prototype seek/capture protocol.

History, read when relevant: `docs/qa/FULL_THEME_AUDIT_2026-06-06.md` (June baseline, partly superseded by #231 and later work); the June perceivability spec and plan in `docs/superpowers/`; the September trial chain `FABLE51_EXPERIENCE_QA_UPDATE_2026-09-05.md` → `THREE_CINEMATIC_PROPOSALS_2026-09-06.md` → `FABLE51_DIRECTION_RECOMMENDATION_2026-09-07.md` → `STAGE_HYBRID_TRIAL_2026-09-07.md` (none owner-adopted except the quiet Track 1 scene, now the Track 1 default). `docs/README.md` indexes everything.

**Scope of this repo:** a curated public snapshot of the private working repository (602 commits, July 2025 to October 2026). Session artifacts, superseded audits and pre-reset creative documents (the abandoned black-hole/void direction) were left out. The snapshot was first published as the WordPress theme (tag `wordpress-theme`); the detach that followed ports the private repo's Prompt #249, which deleted the PHP layer (`functions.php`, `inc/`, the templates, `style.css`), the preview page and the static-export script. Do not rebuild what the reset killed.

## Commands

```bash
npm ci                 # install from the lockfile
npm run audio:import -- <dir>   # copy the album MP3s into the gitignored audio/ as 01-sonoite.mp3 … 07-homem-educado.mp3
npm run dev            # Vite dev server, http://127.0.0.1:3000/, hot reload, serves the project root. THE dev loop
npm run build          # vite build → dist/: bundles in dist/js/ + the runtime assets + the built films' audio (warns and continues without audio)
npm run preview        # serves dist/ at http://127.0.0.1:4173/; rebuild first
npm run audio:check    # exits 1 unless audio/ holds the three built films' MP3s
npm run deploy         # audio:check + build + npx netlify-cli deploy --prod --dir dist (one-time `npx netlify-cli login`)

npm test               # full Jest suite: 47 suites, 792 tests, all pass. THE gate for "tests pass" claims
npm run test:full      # alias of npm test, kept for older docs
npm test -- tests/unit/signalPipeline.test.js   # single file
npm run test:coverage  # coverage is opt-in (~21 % of src lines); there is no threshold

npm run lint           # eslint src, check-only (same as lint:check)
npm run lint:fix       # eslint src --fix
npx eslint <file>      # lint just the files you touched

npm run validate:journeys      # journey JSON vs action schema (warn-only; :strict fails on every warning class, :ci only on unknown action types; --only-files= scopes it)
npm run assets:track5:inspect  # gltf-transform inspect of the relic GLBs
npm run assets:track5:degold   # rebuilds track5-relic-textured-clean.glb from the textured GLB
npm run analyze:audio -- --config scripts/audio-analysis.config.json
                       # offline Meyda analysis → public/assets/journeys/analysis/<slug>.analysis.json; bare run prints usage.
                       # The config reads the normalized names audio:import writes (audio/01-sonoite.mp3, …)
```

**Gates.** `npm test` exits 0. Lint is not a gate yet: `npm run lint` reports 2,718 problems in `src/` (2,439 errors, 279 warnings), almost all in the legacy runtime. Path B plus the shared modules it imports have 116 messages (`src/js/site/` has none), mostly the `security/detect-object-injection` heuristic (52) and missing JSDoc `@param` entries (30). So `npm run validate` (`lint:check && test && security:audit`) stops at `lint:check`. Keep new and touched code lint-clean.

How the build, the asset list, the audio folder and the Netlify config fit together: see "Site shell and build" under Architecture.

## Routes and flags

`npm run dev` serves the site at **`http://127.0.0.1:3000/`** with hot reload, straight from the project root; port 3000 is strict, so the server fails instead of moving if the port is taken. `npm run preview` serves the last build (`dist/`) at **`http://127.0.0.1:4173/`**; a Netlify deploy serves the same `dist/`. There is one page:

- `/`: **Path B chamber, Track 1** (`DEFAULT_ENTRY_TRACK_SLUG = 'sonoite'`, `experience.js`). `?track=horas-mortas` / `?track=nao-querer-nada` select the other films. Any slug not in `BUILT_TRACK_CYCLE` (`src/js/prototype/shell.js`) falls back to Track 1 for both metadata and variant.
- `?relic=meshy` replaces the old static export's `/b/` page; old `/b/` links have no redirect.
- Missing files are a 404 in dev and preview (`appType: 'mpa'`, no SPA fallback), as on Netlify. The dev server also serves files the build does not ship (see "Site shell and build"), e.g. the September proposal comparison page at `/public/proposals/`.
- Older docs cite `https://sonoite.local/` (the LocalWP site that served the WordPress theme) and review players on an ad-hoc static server at `http://127.0.0.1:8765/`. Neither is part of this repo now.

Query flags (prototype):
- General: `?variant=<chamber-variant>` (decides whether the code timeline overrides the JSON; see Path B), `?quality=` / `?cinema=1`, `?dpr=`, `?fps=` (clamped 12–60), `?proof=<seconds>` (alias `?duration=`), `?plate=0` / `?compositor=0` (both kill the film plate), `?msaa=0-8`, `?dither=0`, `?seed=<n>` (replays the living-chamber session), `?tweak=1` (live-trim panel), `?debug=1`, `?autonext=0`, `?relic=meshy|blender|materials` (page default `blender`, set by `site-data.js`; only Track 5's journey names a Blender relic, so `meshy`/`blender` change Track 5 only; `materials` loads the material-study GLB, which only the dev server serves), `?commit=1` (quantized committed reactions, `commit-reactions.js`), `?probe=A-D` (blind doctrine probes; the mapping is shuffled per session and unmasked via `__revealProbe()` in the console; one letter is always the doctrine-pure control).
- Track 5 recut lane (canonical `track5-cinema` only): `?recut=1` (audio-led middle recut), `&lehr=1` (lookdev bundle; no-op without `recut=1`, see `docs/qa/TRACK5_LEHR_LOOKDEV_2026-08-13.md`), `&listen=1` (recut-only commits + rotating rim/floor/bloom accents).
- September trials: `?proposal=intimate|chamber|afterimage|stage` (cinema variants only; ignored under `recut=1`, `proof` or `duration`); `?scene=physical` (Track 5 physical chamber; implied by any proposal) with `&room=readable|cloth` and `&passage=hold` (disables the default tar-frontier cut); `&stagehold=1` (freezes the proposal camera on T1/T4 to isolate lighting); Stage + T1 only: `&drape=0`, `&setting=reliquary`, `&light=sequence`; T1 `?scene=original` (restores the pre-September look).
- October ledgers: `?track=nao-querer-nada&ledger=1` (Track 5) and `?track=horas-mortas&ledger=f|a` (Track 4 arms), plus `&edit=1` (Track 4 edit points). They need `?track=` because the bare page is Track 1, and they are ignored under `recut`, `proof` or `duration`.
- Legacy runtime only (nothing loads it, so they do nothing on the site): `?post=1`, `?shadows=1`, `?t1director=1`.

There are about 55 flags. They are parsed in `src/js/prototype/film-flags.js`, `cinematic-proposals.js`, `shell.js` (`debug`) and the `uses*()` / `resolve*()` / `get*()` methods of `experience.js`; read those rather than trusting this list. Flags work on the bare URL (e.g. `/?proposal=stage`); `?track=` only selects the film, which is why the per-track flags such as the ledgers carry it.

## Architecture: Path B, a legacy runtime kept for reference, and the site shell

Shared JS that Path B imports from outside `src/js/prototype/` (the legacy runtime uses it too): `src/js/audio-manager.js` (Web Audio transport and FFT bands), `src/js/visuals/journey-loader.js`, `src/js/utils/dispose3d.js`.

### A. Legacy runtime (source and tests only; nothing builds or loads it)

The pre-reset particle runtime: `src/js/main.js` → `init-experience.js` → `SonoiteExperience` (`src/js/three-experience.js`, ~3.4k lines, exposed as `window.SonoiteExperience`), with `visuals/` (apart from the shared `journey-loader.js`), `modules/`, `security-manager.js`, `accessibility-manager.js` and `performance-monitor.js`. Since the detach it is kept as source plus its Jest suites, as a reference for building Tracks 2, 3, 6 and 7 (owner decision). `vite.config.js` has a single entry (`index.html` → `boot.js` → Path B), so none of it is bundled, loaded or routed, and the four tracks without a chamber film (paralisia-do-sono, o-livro-azul, o-filho, homem-educado) cannot be played. No new work and no audits on this code: it serves none of the chamber films. Still open: whether to retire it or generalize Path B to the four unbuilt tracks (see the June audit §4 before deleting either).

How it works, for reference:
1. `loadJourneyByTrackId(slug)` (`journey-loader.js`) fetches `public/assets/journeys/phase42/{slug}.json` (`phase42/reduced/{slug}.json` first under `prefers-reduced-motion` or `window.SONOITE_REDUCED_MOTION = true`), then merges `{slug}-enriched-moments.json`: `enrichedMoments` appends to `journey.moments`, and `additionalFlowElements`/`additionalStructureElements` append **whole visual layers**. Choreography is split across both files (five base JSONs carry real moments), so editing only the enriched file misses base-authored moments. Track 5 also gets **code-injected** camera work (`applyTrack5CameraInjections()`). A phase42 miss throws (the old "v1.2 fallback" requests a non-existent `phase42/track_*.json`); callers fall back to defaults.
2. Visual layers are created by name through `VisualLayerRegistry` / `register-defaults.js`.
3. `JourneyController` (`src/js/visuals/journey-controller.js`, ~5.5k lines) fires timed moments, dispatches 74 action types (schema: `src/js/schemas/action-schema.js`), and processes per-frame `link_audio` bindings (noise gates bass 0.08 / mid 0.10 / treble 0.10 / loudness 0.05, then EMA `smoothed += (raw − smoothed) * alpha`; alphas below ~0.20 strobe).
4. Per-frame Directors: `Track5VoidDirector` and `Track6Director` are on by default (keyed off `journey.meta.slug`); `Track1Director` only via `?t1director=1`. Effective Director flags live at the call site in `three-experience.js`, not the class defaults. `window.TRACK5_DIRECTOR_ENABLED` / `TRACK6_DIRECTOR_ENABLED` / `SONOITE_T1_DIRECTOR` force Directors on off-slug.

### B. Path B chamber films (the current direction)

`src/js/prototype/` (36 files, ~22k lines): `main.js` (boot), `shell.js` (all DOM/UI, CSS injected via one style tag, carrying `sonoiteData.cspNonce` when present; the standalone payload has none), `experience.js` (~8.9k lines: the `ReliquaryPrototypeExperience` class plus the `CHAMBER_VARIANTS` table, exposed as `window.SonoitePrototype`). Booted by `src/js/site/boot.js`, which imports `site-data.js` first so `window.sonoiteData` exists before any Path B module evaluates. The payload: `tracks` (the three built films from `tracks.js`, with absolute `audio_url`s under `audio/`), `themeUrl` (the page's base directory without a trailing slash; the runtime fetches `${themeUrl}/public/…` and the fonts from it, and `site-data.js` builds the `audio_url`s from the same base, so dev, preview and a sub-path deploy resolve alike), `relic` (`blender`, or `meshy` under `?relic=meshy`), `version: 'standalone'`, `isSecure`, `isDebug: false`, `audioConfig`; no cspNonce, apiUrl, nonces, i18n or particleCounts. The build emits one entry bundle plus a `three-vendor` chunk.

It renders one GLTF hero relic (`public/assets/models/track5-poc/optimized/*.glb`) in a dark chamber (spot key + rim/back/fill lights, shader floor/shell planes, haze/dust) through its own composer (bloom → grain → vignette → grade → film plate → blackout). AgX tone mapping (Pass 1b deliberately removed the pre-AgX clamps; don't re-add "safety" clamps), manual shadow-map updates, quality-dependent frame pacing (30/24/12 fps playing/settled/idle; `cinema` quality 30/20/10). Two Pass 1 behaviors that look like bugs but are authored: on Track 5 the film plate is **late-track residue** (`idleStrength 0`, invisible until it ghost-returns in ERASURE), and grain keeps a 0.4 floor in blacks. Color identity is per phase: the variant's `gradePhases` table drives `updateGradePass()`, which rewrites grade uniforms **every frame** with a ~3.5 s crossfade, so hand-setting grade uniforms in the console, or authoring flat grade values, silently does nothing.

**Module layers:**
- **Per-track films**: `films/{sonoite,horas-mortas,nao-querer-nada}.js` each export that track's authored timeline (phase windows, camera score, lighting score, event beats), imported directly by `experience.js` into the track's `CHAMBER_VARIANTS` entry (`sonoite-cinema`, `horas-mortas-cinema`, `track5-cinema`). Adding a built track = new film module + `CHAMBER_VARIANTS` entry + `TRACK_DEFAULT_VARIANT` (experience.js) + `BUILT_TRACK_CYCLE` (shell.js) + `VARIANTS` (cinematic-proposals.js) + a `BUILT_FILM_TRACKS` entry in `src/js/site/tracks.js` (`{ ...albumTrack(slug), id, duration }`, kept in `BUILT_TRACK_CYCLE` order, which `standalone-site.test.js` checks). `scripts/runtime-assets.mjs` derives the film's shipped files from `BUILT_FILM_TRACKS` (`phase42/{slug}.json`, `{slug}-enriched-moments.json`, `analysis/{slug}/beats.json` and `phases.json`, plus `audio/NN-slug.mp3`), so the four data files must exist or the build stops at `buildStart` (a missing MP3 only warns); add any other file the new film fetches to `RUNTIME_ASSETS`.
- **Track-specific rigs**: `chamber-practicals.js` (T1 candles/votives), `chamber-sodium.js` (T4 sodium fixture state machine), `recut-*.js` + `track5-*.js` (T5 recut lane and tar/surface work), `relic-mutation.js` (T5 irreversible tar progress).
- **Shared chamber systems**: `shot-director.js`, `light-rigs.js`, `living-chamber.js`, `commit-reactions.js`, `audio-accent-detector.js`, `fill-meter.js`, `film-flags.js`, `hero-model-urls.js`.
- **September trials**: `cinematic-proposals.js`, `physical-chamber.js`, `physical-drape.js`, `track1-*.js`. All opt-in via flags, **except** the T1 quiet scene: `usesQuietScene()` is the default for `sonoite-cinema`, and `?scene=original` restores the pre-September look.
- **October ledgers**: `track4-ledger.js` (`?track=horas-mortas&ledger=f|a`, built on the Stage room, `&edit=1` edit points) and `track5-ledger.js` (`?track=nao-querer-nada&ledger=1`). Both are pure functions of track time and are ignored under recut/proof/duration.

**Choreography is declarative, not moment-driven**: Path B ignores `moments`/actions entirely. On the default `track5-cinema` variant the score lives almost entirely **in code**: `TRACK5_CHAMBER_FILM_TIMELINE` (`films/nao-querer-nada.js`) owns the phase windows, 12-cue camera score, lighting score, `roomPressureBeats` and `eventBeats`. `buildChamberConfig()` deep-merges the variant timeline OVER the JSON's `prototype_chamber` params, and its deepMerge **replaces arrays wholesale**, so the JSON's camera score and beat lists are dead on this route: editing them (or enriched moments) has no effect. What survives from `phase42/nao-querer-nada.json`: `musicalAnchors` plus `post`/`ground`/`air`/`darknessMode`. `?variant=<key>` selects other `CHAMBER_VARIANTS`, the only way to see JSON-authored scores run.

**Reactivity doctrine** (binding for all Path B work): 70 % authored macro arc / 25 % autonomous breathing / 5 % audio punctuation (Prompt #230 raised breathing/punctuation drive on all three films; macro arc, cameras, phases, palettes and smoothing untouched). Camera framing, relic, phases and palette are authored, not driven by audio. The documented exceptions are small and clamped: an audio term in `dynamicState.breathing` that moves camera height/target and the relic's sway, and a mid-band term on the relic's iridescence (both explained at the top of `commit-reactions.js`). "If the viewer can't tell what changed, the change didn't happen." Work proceeds in **owner-gated passes**: the owner judges each pass live before the next starts; overshoot perceivability, then pull back to taste.

### Site shell and build

- `index.html` (repo root) is the only page: the `#sonoite-static-loader` overlay, `#sonoite-prototype-root` with a first-paint line (always "Sonoite · Track 01", whatever `?track=` says; it sits under the opaque loader and `shell.js` replaces the root's markup before the loader fades, so visitors never see it), a noscript card, a `noindex` robots meta, font preloads marked `vite-ignore`, and one module script, `./src/js/site/boot.js`.
- `src/js/site/`: `boot.js` only imports `site-data.js`, then `../prototype/main.js`; add nothing to it (a top-level statement would run after both imports). `site-data.js` sets `window.sonoiteData` (see B) and `window.__sonoiteStaticLoader`, which `shell.js` calls to fade the loader out; it must not import prototype modules. `tracks.js` is the single track source, plain data that Node scripts import too: `ALBUM_TRACKS` (all seven, with their normalized MP3 names), `BUILT_FILM_TRACKS` (the three films with ids 1/4/5 and durations) and `AUDIO_CONFIG`.
- `vite.config.js`: `base: './'` (every URL in the built page is relative, so `dist/` works at a domain root or under a sub-path), `publicDir: false`, `appType: 'mpa'`, bundles in `dist/js/`, no manifest. Dev server on 127.0.0.1:3000 (`strictPort`), preview on 127.0.0.1:4173.
- The runtime-assets plugin (in `vite.config.js`, build only). The runtime fetches its data by URL instead of importing it, so `scripts/runtime-assets.mjs` lists those files: `RUNTIME_ASSETS` (fonts, the Draco decoder, three relic GLBs, the Track 1 stage drape and textures, and each built film's journey, enriched moments, beats and phases) and `RUNTIME_AUDIO` (the three films' MP3s). The build fails at `buildStart` if a listed asset is missing; after the bundle is written it copies the assets, plus whichever audio exists, into `dist/` at the same relative paths, and warns about missing audio. Served by the dev server but not shipped: legacy journeys and the other four tracks' data, the reduced-motion journeys, the material-study GLB (`?relic=materials`), the textured-optimized fallback GLB and `public/proposals/`. When the runtime starts fetching a new file, add it to `RUNTIME_ASSETS` (and run `npm test`).
- Audio: the album MP3s live in the gitignored `audio/` folder, filled by `npm run audio:import -- <dir>` (`scripts/import-audio.mjs`: matches by track number and title, never modifies the source folder). The album audio is not distributed in this repository. `scripts/check-audio.mjs` (`npm run audio:check`) is the deploy gate.
- `netlify.toml` publishes `dist/` with no build command: the audio is not in git, so `npm run deploy` builds locally and uploads. Headers: `X-Robots-Tag: noindex, nofollow` on every path (the site is unlisted by the owner's choice: keep it, along with the robots meta in `index.html`, and don't add a `robots.txt` `Disallow`, which would stop crawlers from seeing the noindex); `/js/*` (hashed bundles) one year, immutable; `/public/*` (unhashed data and models) 1 h with a day of stale-while-revalidate, so edited journey data reaches repeat visitors; `/assets/*` (fonts) 1 week; `/audio/*` 7 days with a day of stale-while-revalidate.

### Journey data

`public/assets/journeys/phase42/` is the live format; `v1.2/` and `phase4_3_final/` are older generations. `phase42/reduced/` variants (nested, not a sibling dir) are tried first under reduced motion (Track 5's reduced file is stale old-schema). The dev server serves them, but the build does not ship them: on a built site the reduced fetch 404s and `journey-loader.js` falls back to the normal journey, so dev and production differ for reduced-motion visitors. In `analysis/`, the Meyda `{slug}.analysis.json` files are authoring reference only, but `analysis/{slug}/beats.json` is fetched at runtime by the Track 5 shot director (`resolveShotDirectorBeatGridUrl()`). The runtime-assets plugin ships each built film's `phase42/{slug}.json`, `{slug}-enriched-moments.json`, `analysis/{slug}/beats.json` and `phases.json`.

## Working model (the author's setup, August to October 2026)

How this project was built. These CLIs are the author's local tooling; without them, implement directly against the same spec-and-acceptance-criteria discipline.

The owner was creative director and product owner. Claude in Claude Code orchestrated (Fable 5.1; the October audit's mechanical gates name Opus 5.5): specs, verification, commits, memory. **Implementation went to local CLIs:**
- **Build:** `cursor-agent -p --model composer-2.5 "<spec>"` (write access) or `codex exec --sandbox workspace-write`, always against a written spec file with exact acceptance criteria; review their `git diff` rather than re-reading whole files.
- **Verify/review:** `codex exec --sandbox read-only` (conformance/adversarial), `cursor-agent -p` (code/config review), `agy` (Gemini: data cross-checks and listening passes; `agy -p` print mode exited without listening on 2026-10-01; the graded pass ran in headless JSON mode, see `docs/qa/GEMINI_LISTENING_BRIEF_2026-10-01.md` and `docs/qa/gemini-listening-2026-10-01/README.md`), Grok craft reviews via `cursor-agent -p --model cursor-grok-4.6-high`. Independent creative review rounds sent one read-only brief to Claude Fable 5.1 and GPT-6 Astra separately, then recorded a synthesis (`docs/qa/aesthetic-*-2026-10-01/`, `docs/qa/track5-ledger-2026-10-02/REVIEW_*`).
- **Economy:** one CLI task per chunk of work (capture + process + report); contact sheets (`montage`) over per-frame screenshots; ingest CLI reports as verdict + disk path; a fresh session per workstream with a handoff note when a phase closes.

## Conventions

- ESLint (`.eslintrc.cjs`): WordPress + security + jsx-a11y presets (the WordPress preset is left over from the theme and still applies); 4-space indent (a 2-space override covers the legacy runtime and a few shared modules written that way), single quotes, semicolons, `eqeqeq`, `curly`, no `var`. i18n text domain `sonoite-theme`.
- Commits: in the private repo, `Prompt #N: Short description` (Prompt #249 is the WordPress detach, ported here as one commit). This public snapshot's history starts fresh and its commits are not numbered. Commit early and often.
- History: this snapshot was cut from the private repo's `experiment/track4-state-ledger` branch at Prompt #247 (2026-10-02). Docs that cite other branches (`experiment/physical-ambience`, `experiment/track5-recut-lehr`, …) or "uncommitted" September work refer to that private history; all of it was committed before the snapshot. Code comments also cite working documents left out of this snapshot: `AESTHETIC_UX_SYNTHESIS_2026-07-20`, `TRACK1_CHAMBER_PROPOSAL_2026-08-13`, `TRACK1_MUSICAL_MAP_2026-08-13`, `UNIFIED_CREATIVE_DIRECTION_2026-03-11`, `blender-reliquary-stills/PARITY.md` and the Track 4 v2/v3 specs. "Build spec §N" is `TRACK5_AUDIO_LED_RECUT_APPROVED_BUILD_SPEC_2026-07-23` and "audit 2026-08-13" is `FULL_THEME_AUDIT_2026-08-13`; the public design record for the recut is `docs/superpowers/specs/2026-07-23-track5-recut-creative-layer-design.md`.
- Path B's shaders are inline GLSL strings or `onBeforeCompile` patches in six prototype files (`experience.js`, `chamber-sodium.js`, `physical-chamber.js`, `physical-drape.js`, `relic-mutation.js`, `track1-stage-materials.js`); the legacy runtime has its own inline shaders in about 23 files under `src/js/`. There are no `.glsl` files and no shader loader.
- Shader effects: start subtle (~50 % of what seems right) and desaturate first drafts; additive-blend new effects over the original color, never replace.

## Gotchas

- **Judge visuals on the dev server, or rebuild before `npm run preview`.** `npm run dev` serves the source with hot reload; `vite preview` serves whatever `dist/` holds, and stale builds have repeatedly caused false visual verdicts. The dev server also serves files the build does not ship (reduced-motion journeys, the material-study GLB, `public/proposals/`), so check anything that depends on them in preview too.
- **No HTML `<audio>` element in either runtime.** Use `audioManager.getCurrentTime()` / `seekTo()`; on Path B, `window.SonoitePrototype.audio`. `document.querySelector('audio')` patterns from old docs do not work.
- **Prototype seeks need transport sync**: the room is wall-clock anchored. A valid test seek sets `audio.seekTo(t)` AND `p.state.currentTime = t` AND `p.transportStartSeconds = performance.now()/1000 - t` (protocol in `BASELINE_2026-06-10.md`).
- **Several suites scrape source text** (film configs, transport ordering, light rigs, recut seams, the site entry wiring in `standalone-site.test.js`): renaming a `const TRACK5_*` token or reordering a block can fail them without a behavior change. The behavioral suites include the ledgers, the shot director, chamber-variant isolation and `audit-p1-*`.
- **Legacy runtime, if you must read it:** post-processing is off unless `?post=1` sets `window.SONOITE_POST`; `VisualLayerRegistry.create()` passes the whole element object to `setConfig()`, so authored params are at `this.cfg.params.*` (use `const p = this.cfg.params || this.cfg;`); Directors and enriched moments conflict on ownership of `post` actions and camera splines; `window._sonoiteInitState` is the only double-init guard between `main.js` and `init-experience.js`, so don't remove it.
- **`.claude/agents/` holds pre-reset role prompts**, kept as process history. The seven files date from February 2026 and describe the pre-reset particle runtime (VoidSphere, monoliths, `three-experience.js`), not the chamber films; don't dispatch them for Path B work.
- **`src/js/modules/consciousness-core.js`** is the only file left of the pre-reset consciousness system. The legacy runtime imports it through `visuals/core/ConsciousnessCore.js`; like the rest of that runtime, it is no longer bundled.
- Analysis scripts: `scripts/analyze-audio.js` takes `--input`/`--config` (`scripts/audio-analysis.config.json` uses the `audio/NN-slug.mp3` names that `audio:import` writes); `scripts/deep-audio-analysis.cjs` reads the same normalized names from `audio/` (override the folder with `SONOITE_AUDIO_DIR`) and needs `ffmpeg` and `aubio` on PATH; `scripts/librosa_analyze.py` needs Python with librosa.

## Browser Verification Discipline

Claims about visuals require evidence from a running site: the dev server, or `npm run preview` on a fresh build:

- Prefer state dumps (a browser-automation tool's script evaluation) over screenshots: `window.SonoitePrototype.getMacroState(t)` (Path B phase/room state). The legacy runtime's debug hooks (`window.diag()`, `window.postfx`) exist only where it runs, which is no longer on the site.
- Save screenshots to disk (jpeg, quality ~35) rather than inline, take few, and don't read saved screenshots back into context when a state dump can answer the question.
- In the author's setup, waits of 30 s or more disconnected the browser extension; chain waits of 15 s or less.
- Never claim "verified" from a screenshot you didn't inspect, and never fix a "bug" reported by an old audit doc without confirming it exists in the current code: line numbers and diagnoses in audit files drift.
