# SPEC — Pass 0.5: Shell corrections (ride-along)

Date: 2026-07-20. Branch context: experiment/path-b-reliquary-proof.
Status: ready for executor; lands WITH or BEFORE Pass P0 (god-ray cone). Items 1 and 3 have gate-time actions for the owner.
Origin: Gate 1 external UX report findings, re-prioritized by cost/impact (minutes of work, visible payoff) instead of theme. Out of scope (filed elsewhere): keyboard controls, scrub-drag, next-track/journey advance, volume — those are journey-UX, not minutes-cost.

## Item 1 — Font preview + pick mechanism (decision at gate)
Problem: --prototype-display-font: 'Cormorant Garamond' and --prototype-ui-font: 'IBM Plex Mono' are declared (src/js/prototype/shell.js:19-20) but enqueued NOWHERE — no @font-face, no font files, no PHP enqueue. Every visitor has always seen Times New Roman / Menlo fallbacks. The March font shortlist verdicts were therefore rendered on the fallback: the face decision was argued on typography nobody was seeing. It must be re-made on rendered truth.
Change: add a ?uifont=<key> preview param. When present, inject the matching font stack (Google Fonts link or self-hosted @font-face) into the page head and set the two CSS vars. Keys: cormorant (Cormorant Garamond + IBM Plex Mono — the declared intent) plus up to 2 alternatives from the March shortlist (owner names the shortlist at the sitting). NO param -> NO fonts loaded: zero payload change for normal visits.
Gate action: owner previews each key live, picks one; the winner is then enqueued permanently (wp_enqueue_style on the prototype template, or self-hosted under assets/fonts/) and the param remains a dev-only override.
Files: src/js/prototype/shell.js (param handling + link injection + CSS var swap). Permanent enqueue (functions.php / template) is a post-gate follow-up, not this pass.
HARD CONSTRAINT: do NOT silently enqueue Cormorant for everyone in this pass — the decision was never made on screen; this pass exists to enable it, not to settle it.

## Item 2 — Blank the "1:36" placeholder
Problem: the shell footer shows a hardcoded default duration "1:36" (src/js/prototype/shell.js:481) until journey resolve replaces it — a wrong number on screen during the exact first-trust seconds.
Change: render empty (or em-dash) until updateTime provides the real duration; reserve width (min-width) so there is no layout shift when the real value lands.
File: src/js/prototype/shell.js.

## Item 3 — Reduced-motion flag (correctness, not polish)
Problem: prefers-reduced-motion is honored nowhere on the prototype route. Prompt #141 added Perlin camera translation (camOffset), drifting bokeh motes, and pink-noise key flicker with no opt-out — vestibular/sensory triggers introduced without a kill switch.
Change: one flag — matchMedia('(prefers-reduced-motion: reduce)') OR ?motion=reduce (param wins both ways: ?motion=full forces full motion for testing). When reduced:
- Living chamber: camOffset x 0, bokeh opacity x 0, flicker depth x 0. The slow light LFOs may stay (not vestibular); camera motion and near-lens drift may not.
- Forward requirement: Pass P0's cone density drift freezes under this flag (static cone at ~50% mean density permitted).
Implementation: resolve once at boot on the experience (this.reducedMotion) + listen for media-query change; the experience passes zeroed values through the living config seam — living-chamber.js stays dumb (no media queries inside it).
Files: src/js/prototype/experience.js (flag + zeroing at the config seam). living-chamber.js untouched if the seam allows it; touch it only if the config path cannot zero all three channels.
Verification: emulate prefers-reduced-motion in Playwright -> camOffset stays {0,0,0} and bokeh opacity 0 across a 60s run; ?motion=reduce forces the same; ?motion=full overrides the emulated media query.

## Item 4 — Footer contrast
Problem: muted footer/status text at rgba(240,236,230,0.48), 11px uppercase 0.22em letter-spacing — below comfortable contrast for small text on black.
Change: 0.48 -> 0.64 (single literal or CSS var). The idle chrome-dim to ~0.08 opacity is deliberate and UNCHANGED.
File: src/js/prototype/shell.js. Owner glances at the gate.

## Verification (whole pass)
1. Gates (corrected 2026-07-20): `npm run build` exit 0 is the hard gate; `npx eslint <changed files>` must add **no new errors versus baseline** (shell.js baseline is 1 pre-existing error; experience.js ~100). **Do NOT gate on `npm test`** — it always fails on hardwired coverage thresholds and is not a regression signal (CLAUDE.md, "Known-broken gates").
2. ?uifont=cormorant renders Cormorant in the title (screenshot vs default); no-param shell is unchanged.
3. No "1:36" string in the DOM before journey resolve.
4. Reduced-motion behaviors per Item 3 verification.
5. Footer contrast literal reads 0.64.
6. No console errors across ?prototype=1 boot, 60s play, pause, seek.
7. git status shows only the intended files modified.

## Conventions
4-space indent, single quotes, semicolons; factory functions not singletons; keep the ?tweak=1 panel untouched; diagnostics behind existing debug conventions.
