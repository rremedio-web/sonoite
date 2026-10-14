# Track 5 Perceivability — Step 0 + Pass 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Park the tabletop experiment safely, baseline the committed `#125` chamber, then make Track 5's authored per-phase arc *visible* (grade, backlight, HDR, grain, plate) — ending in an owner gate.

**Architecture:** All changes live in `src/js/prototype/experience.js` (the Path B chamber runtime, reachable at `?prototype=1`). The per-phase machinery already exists — `getMacroState(elapsed)` resolves the current phase (VOID/AWAKENING/WANTING/RELEASE/ERASURE) and its curves every frame — so Pass 1 is about *wiring image channels to it* (grade) and *retuning channels that exist but don't read* (backlight, HDR clamps, grain, plate). Per-phase parametric grading via the existing `ChamberGradeShader` is the YAGNI realization of the spec's "LUT-style grading"; true LUT textures are deferred.

**Tech Stack:** Three.js (EffectComposer/ShaderPass, AgX via OutputPass), Vite build, the author's local WordPress at `http://localhost/homem/`, chrome-devtools MCP for visual verification.

**Scope:** Step 0 + Pass 1 only. Passes 2–4 get their own plans after the owner calibrates against this pass's results (spec §4). Spec: `docs/superpowers/specs/2026-06-10-track5-chamber-perceivability-rebuild-design.md`.

**Tuning law for this plan:** overshoot perceivability, then pull back to taste. Every starting value below is deliberately bold; the owner gate trims, never squints.

**Verification law:** no visual claim without a screenshot saved via `filePath` (jpeg, quality 35) + an `evaluate_script` state dump. Never read screenshots back into context. Line numbers below are from `git show HEAD:src/js/prototype/experience.js` at commit `ee5b2da` (`#126`) — after Task 2, working-tree line numbers match.

---

### Task 1: Secure at-risk docs + look targets on the working branch

**Files:**
- Modify: `.gitignore` (repo root)
- Commit (existing, untracked): `docs/qa/FULL_THEME_AUDIT_2026-06-06.md`, `docs/qa/PATH_B_THEME_AUDIT_SYNTHESIS_2026-05-23.md`, `.claude/agent-memory/audiovisual-synergy-mapper/track5-audio-audit-2026-05-23.md`, `tools/blender/renders/`
- Commit (modified): `.claude/agent-memory/audiovisual-synergy-mapper/MEMORY.md`

- [ ] **Step 1: Add ignore rules for Blender backups and Playwright artifacts**

Append to `.gitignore`:

```gitignore
# Blender autosave backups
*.blend1
# Playwright MCP session artifacts
.playwright-mcp/
```

- [ ] **Step 2: Stage and commit the at-risk files (NOT experience.js, NOT .blend files)**

```bash
git add .gitignore \
  docs/qa/FULL_THEME_AUDIT_2026-06-06.md \
  docs/qa/PATH_B_THEME_AUDIT_SYNTHESIS_2026-05-23.md \
  .claude/agent-memory/audiovisual-synergy-mapper/MEMORY.md \
  .claude/agent-memory/audiovisual-synergy-mapper/track5-audio-audit-2026-05-23.md \
  tools/blender/renders/
git commit -m "Prompt #127: Secure audit docs and Blender look-target renders.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Verify what remains uncommitted is exactly the tabletop experiment**

Run: `git status --short`
Expected: only `M src/js/prototype/experience.js`, `M tools/blender/reliquary_chamber.blend`, `?? tools/blender/reliquary_tabletop_idea.blend`, `?? public/assets/models/track5-poc/blender-export/` (blend1/.playwright-mcp now ignored).

### Task 2: Park the tabletop experiment on its own branch

**Files:** none modified — pure git topology. The tabletop work (uncommitted `experience.js` diff with `TRACK5_TABLETOP_TIMELINE` / `isTabletopPresentation()`, the modified chamber .blend, the tabletop .blend, the 5.4 MB blender-export GLB) moves to `experiment/track5-tabletop-presentation`.

- [ ] **Step 1: Create the branch and commit the experiment there**

```bash
git checkout -b experiment/track5-tabletop-presentation
git add src/js/prototype/experience.js \
  tools/blender/reliquary_chamber.blend \
  tools/blender/reliquary_tabletop_idea.blend \
  public/assets/models/track5-poc/blender-export/
git commit -m "Park tabletop presentation experiment (timeline, window-key lighting, Blender chamber export).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Return to the working branch**

```bash
git checkout experiment/path-b-reliquary-proof
```

- [ ] **Step 3: Verify the working tree is the clean #125 chamber**

```bash
git status --short            # expected: empty
grep -c "isTabletopPresentation" src/js/prototype/experience.js   # expected: 0 (grep exits 1)
```

### Task 3: Fresh build + baseline capture

**Files:**
- Create: `docs/qa/perceivability/BASELINE_2026-06-10.md`
- Generated (not committed): `/tmp/t5-baseline/*.jpg`

- [ ] **Step 1: Build (dist/ is stale from May 23 — mandatory before any judgement)**

Run: `npm run build`
Expected: Vite production build completes, manifest written, no errors. If it fails, STOP and fix the build before anything else.

- [ ] **Step 2: Open the prototype and start Track 5**

Chrome-devtools MCP: navigate to `http://localhost/homem/?prototype=1`, click the start/play control, confirm audio is playing. Check console for errors (`list_console_messages`); zero new errors expected.

- [ ] **Step 3: Capture 5 phase-representative baseline screenshots + state dumps**

Timestamps (one per phase): **30 s** (VOID), **150 s** (AWAKENING), **248 s** (WANTING), **360 s** (RELEASE), **500 s** (ERASURE).
For each: seek with the seeked-event pattern, wait ≥2 s for scene settle, then verify the runtime actually advanced before trusting the frame:

```javascript
// evaluate_script per timestamp — returns the dump to save in the baseline doc
(() => {
  const audio = document.querySelector('audio');
  const exp = window.__reliquaryExperience || window.reliquaryExperience || null;
  return {
    audioTime: audio?.currentTime,
    phase: exp?.getMacroState?.(audio?.currentTime || 0)?.phase,
    key: exp?.keyLight?.intensity, back: exp?.backLight?.intensity, rim: exp?.rimLight?.intensity,
    grade: exp ? { mix: exp.gradePass?.uniforms.mixAmount.value, sat: exp.gradePass?.uniforms.saturation.value } : null,
    plate: exp?.track5PlatePass?.uniforms.strength.value
  };
})();
```

(If no global experience handle exists, find the actual export in `src/js/prototype/` at execution time and adapt — do NOT skip the dump.)
Screenshot per timestamp: `take_screenshot(format: "jpeg", quality: 35, filePath: "/tmp/t5-baseline/b<phase>_<t>.jpg")`.

- [ ] **Step 4: Write and commit the baseline doc**

`docs/qa/perceivability/BASELINE_2026-06-10.md`: table of the 5 dumps (phase, light intensities, grade, plate), screenshot paths, console status, and one-line subjective note per frame.

```bash
git add docs/qa/perceivability/BASELINE_2026-06-10.md
git commit -m "Prompt #128: Capture Track 5 chamber perceivability baseline.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: Per-phase grade — config

**Files:**
- Modify: `src/js/prototype/experience.js` — `track5-cinema` post config (the block containing `gradeMix: 0.32` near line 1540)

- [ ] **Step 1: Add `gradePhases` to the track5-cinema post config**

Directly after the `gradeContrast: 1.16,` line, add (values are bold-by-design starting points; WITHHOLD = cold steel, RELEASE = the one warm admission, ERASURE = ash drain):

```javascript
            gradePhases: {
                VOID:      { mix: 0.5,  tint: [0.82, 0.86, 0.97], lift: [0.004, 0.004, 0.008], saturation: 0.62, contrast: 1.2 },
                AWAKENING: { mix: 0.42, tint: [0.92, 0.92, 0.97], lift: [0.003, 0.003, 0.005], saturation: 0.85, contrast: 1.12 },
                WANTING:   { mix: 0.58, tint: [0.78, 0.85, 1.04], lift: [0.0, 0.002, 0.01],    saturation: 0.7,  contrast: 1.3 },
                RELEASE:   { mix: 0.36, tint: [1.0, 0.96, 0.93],  lift: [0.004, 0.003, 0.002], saturation: 0.95, contrast: 1.05 },
                ERASURE:   { mix: 0.62, tint: [0.86, 0.87, 0.9],  lift: [0.0, 0.0, 0.0],       saturation: 0.45, contrast: 1.18 }
            },
```

- [ ] **Step 2: Sanity check**

Run: `node --check src/js/prototype/experience.js` — expected: no syntax errors. (No commit yet — Task 5 completes the feature.)

### Task 5: Per-phase grade — runtime crossfade

**Files:**
- Modify: `src/js/prototype/experience.js` — add `updateGradePass()` method to `ReliquaryPrototypeExperience`; call it from the post-update section

- [ ] **Step 1: Add the method**

Add as a new method on the class (e.g. immediately before the method containing the grain/bloom/vignette post updates — locate the `this.grainPass.uniforms.intensity.value =` block near line 5425 and add the method above its enclosing method):

```javascript
    updateGradePass(macroState, elapsed) {
        if (!this.gradePass) return;
        const phases = this.chamberConfig.post?.gradePhases;
        if (!phases) return;
        const target = phases[macroState.phase] || phases.VOID;
        if (!target) return;
        if (!this._gradeState) {
            this._gradeState = {
                mix: target.mix,
                tint: new THREE.Vector3(...target.tint),
                lift: new THREE.Vector3(...(target.lift || [0, 0, 0])),
                saturation: target.saturation,
                contrast: target.contrast
            };
            this._gradeTargetVec = new THREE.Vector3();
            this._gradeLastElapsed = elapsed;
        }
        // Seek-safe frame delta; ~3.5s settle = cinematic crossfade across phase boundaries
        const dt = clamp(elapsed - this._gradeLastElapsed, 0, 0.25);
        this._gradeLastElapsed = elapsed;
        const k = 1 - Math.exp(-dt / 3.5);
        const s = this._gradeState;
        s.mix += (target.mix - s.mix) * k;
        s.tint.lerp(this._gradeTargetVec.set(...target.tint), k);
        s.lift.lerp(this._gradeTargetVec.set(...(target.lift || [0, 0, 0])), k);
        s.saturation += (target.saturation - s.saturation) * k;
        s.contrast += (target.contrast - s.contrast) * k;
        this.gradePass.uniforms.mixAmount.value = s.mix;
        this.gradePass.uniforms.tint.value.copy(s.tint);
        this.gradePass.uniforms.lift.value.copy(s.lift);
        this.gradePass.uniforms.saturation.value = s.saturation;
        this.gradePass.uniforms.contrast.value = s.contrast;
        this.gradePass.enabled = s.mix > 0.001;
    }
```

- [ ] **Step 2: Call it in the post-update section**

In the method containing the grain block (`this.grainPass.uniforms.intensity.value = ...`, ~line 5425 — `macroState` and `elapsed` are both in scope there), add immediately before the `if (this.bloomPass) {` line:

```javascript
        this.updateGradePass(macroState, elapsed);
```

The startup block at lines 3422–3429 stays as-is (initial values; the per-frame method takes over when `gradePhases` exists).

- [ ] **Step 3: Verify syntax**

Run: `node --check src/js/prototype/experience.js` — expected: clean.

### Task 6: Backlight-led silhouette

**Files:**
- Modify: `src/js/prototype/experience.js` — three places

- [ ] **Step 1: Retune the track5-cinema lighting config** (block near line 1553)

```javascript
        lighting: {
            keyBase: 1.42,            // was 1.64 — key yields the lead
            keyPressureGain: 0.48,
            keyAudioDrop: 0.08,
            rimBase: 1.18,
            rimPressureGain: 0.34,
            rimAccentGain: 0.22,
            backBase: 1.15,           // was 0.38 — backlight leads the silhouette
            backPressureGain: 0.34,   // was 0.18
            backCoolColor: '#8ea3d4', // T5 accent family (cold blue #32395e, lightened for a light source)
            fillBase: 0.012,
            fillPressureGain: 0.012
        },
```

- [ ] **Step 2: Raise the backlight intensity ceiling** (clamp near line 5288)

In the `this.backLight.intensity = clamp(...)` expression, change the upper bound `1.02` → `2.0` (lower bound `0.08` unchanged).

- [ ] **Step 3: Make the back cool color variant-overridable** (line ~3255)

```javascript
        this.backCoolColor = new THREE.Color(this.chamberConfig.lighting?.backCoolColor ?? '#ced5df');
```

- [ ] **Step 4: Verify syntax**

Run: `node --check src/js/prototype/experience.js` — expected: clean.

### Task 7: Build + FIRST OWNER SHOWING (GATE) — commit Pass 1a

- [ ] **Step 1: Build and reload**

Run: `npm run build` — expected: clean. Reload `http://localhost/homem/?prototype=1`, zero new console errors.

- [ ] **Step 2: Capture the same 5 timestamps to `/tmp/t5-pass1a/`** (same seek + dump + screenshot protocol as Task 3 Step 3)

Numerical verification before any visual claim:
- `gradePass` uniforms differ measurably between WANTING (248 s) and RELEASE (360 s) — e.g. saturation ≈0.7 vs ≈0.95
- `backLight.intensity` > 1.0 in a pressured phase; back/key ratio ≳ 0.7 (was ≈0.23)

- [ ] **Step 3: Commit**

```bash
git add src/js/prototype/experience.js
git commit -m "Prompt #129: Per-phase grade crossfade + backlight-led silhouette (Pass 1a).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: STOP — owner watches**

Owner views live (at minimum: one VOID minute, the WANTING→RELEASE boundary ~281 s, ERASURE ending). Record verdict + calibration notes before starting Task 8. **No task below runs until the owner has reacted.**

### Task 8: HDR un-clamp (grade + grain + vignette shaders)

**Files:**
- Modify: `src/js/prototype/experience.js` — `ChamberGradeShader` (~line 1864), `ChamberGrainShader` (~line 1772), `ChamberVignetteShader` (~line 1896)

These passes run in linear HDR *before* `OutputPass`/AgX; their 0–1 clamps clip highlights before the filmic shoulder can roll them off. Keep only non-negativity.

- [ ] **Step 1: Grade shader** — replace the final mix lines:

```glsl
            texel.rgb = mix(texel.rgb, max(graded, vec3(0.0)), clamp(mixAmount, 0.0, 1.0));
            gl_FragColor = texel;
```

(was `clamp(graded, 0.0, 1.0)` inside the mix)

- [ ] **Step 2: Grain shader** — replace the final line:

```glsl
            gl_FragColor = vec4(max(texel.rgb, vec3(0.0)), texel.a);
```

(was `gl_FragColor = clamp(texel, 0.0, 1.0);`)

- [ ] **Step 3: Vignette shader** — read its final lines at edit time; if it ends in a 0–1 clamp of the texel, apply the same `max(..., vec3(0.0))` pattern. Vignette darkening itself (multiply ≤1) is fine.

- [ ] **Step 4: Check composer pass order before judging**

Read the `composer.addPass(...)` sequence (~lines 3400–3450). If bloom samples *after* these un-clamped passes, unclamped >1 values will feed bloom hotter — acceptable if intentional, but note it in the verdict doc.

- [ ] **Step 5: Build, reload, verify highlights**

`npm run build`; reload; screenshot a key-lit moment (e.g. 248 s) to `/tmp/t5-pass1b/highlights.jpg`. Numerical check: no blown-white rim (sample via canvas readback is overkill — visual check at owner gate suffices; the *regression* check is that the frame did not turn uniformly brighter/blown).

- [ ] **Step 6: Commit**

```bash
git add src/js/prototype/experience.js
git commit -m "Prompt #130: Un-clamp HDR post passes ahead of AgX tone mapping.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Grain floor in the blacks

**Files:**
- Modify: `src/js/prototype/experience.js` — `ChamberGrainShader` fragment (~line 1798)

- [ ] **Step 1: Replace the grain gate**

```glsl
            float grainWeight = mix(0.4, 1.0, smoothstep(0.045, 0.28, luminance));
```

(was `float grainWeight = smoothstep(0.045, 0.28, luminance);` — grain died to zero in deep blacks; now blacks keep 40% grain = structured black. 0.4 is deliberately bold.)

- [ ] **Step 2: Build, verify, commit**

`npm run build`; reload; screenshot a near-black ERASURE frame (520 s) to `/tmp/t5-pass1b/black-grain.jpg`; confirm via owner/screenshot that black has texture, no banding.

```bash
git add src/js/prototype/experience.js
git commit -m "Prompt #131: Grain floor in deep blacks (structured black).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Plate as residue

**Files:**
- Modify: `src/js/prototype/experience.js` — track5-cinema `post.plate` config (~line 1545)

- [ ] **Step 1: Retune the plate config**

```javascript
            plate: {
                strength: 0.12,      // was 0.88 — near-invisible during the body of the track
                idleStrength: 0.0,   // was 0.36
                revealSeconds: 10,
                erasureBoost: 0.72   // was 0.34 — the ERASURE payoff owns the effect
            }
```

The runtime block (~line 5503) already adds `chamberLaw.erasure * erasureBoost` — no code change needed; the erasure term now dominates.

- [ ] **Step 2: Build, verify both ends, commit**

`npm run build`; reload. Dump `track5PlatePass.uniforms.strength.value` at 60 s (expected ≈0.12) and at 500 s (expected ≳0.6). Screenshots to `/tmp/t5-pass1b/plate-early.jpg` / `plate-erasure.jpg`.

```bash
git add src/js/prototype/experience.js
git commit -m "Prompt #132: Gate Track 5 plate to ERASURE residue.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: Pass 1 owner gate + frame-fill check (spec ⚠ item)

- [ ] **Step 1: Frame-fill verification** — dump shell/floor/dust/haze opacities at 150 s and 360 s (`evaluate_script` on the layer objects); compare against the March diagnosis ("frame ~15% full"). If the frame still reads empty, record it as the top Pass 4 candidate (fog compositing fix) — do NOT fix it now.

- [ ] **Step 2: Owner watches a full playthrough (or per-phase samples + the two boundaries).** Record verdict + every calibration request in `docs/qa/perceivability/PASS1_VERDICT.md`.

- [ ] **Step 3: Apply owner's calibration trims** (value changes only — no new mechanisms), rebuild, re-verify, then:

```bash
git add -A docs/qa/perceivability/ src/js/prototype/experience.js
git commit -m "Prompt #133: Pass 1 verdict + owner calibration trims.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Decision point** — write the Pass 2 (camera life) plan only after this verdict exists.

---

## Self-review notes

- **Spec coverage:** Step 0 → Tasks 1–3; Pass 1 grade → 4–5; backlight → 6; HDR clamp → 8; grain floor/range → 9; plate-as-residue → 10; frame-fill ⚠ → 11 (verify-only, by design). Passes 2–4 deliberately out of plan (spec's owner-gate sequencing).
- **Grain range widening** (spec: ~0.02–0.12): the floor change (Task 9) plus existing `grainFinishGain` machinery covers the readable range; if ERASURE grain still reads flat at the Task 11 gate, raise `grainFinishGain` as a calibration trim — not a new mechanism.
- **Type consistency:** `updateGradePass(macroState, elapsed)` matches the call site; `gradePhases` keys match `DEFAULT_PHASE_WINDOWS` names exactly (VOID/AWAKENING/WANTING/RELEASE/ERASURE); `clamp`/`lerp`/`smoothstep` are existing module-level helpers in `experience.js`.
- **Line numbers** are HEAD-relative at `ee5b2da` and become working-tree-accurate after Task 2 restores the clean file. Executors must re-grep anchors, not trust absolute numbers.
