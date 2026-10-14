# Music Interaction Matrix

> **Date:** 2026-03-11
> **Context:** Complete mapping of what can react, how, and when
> **System:** experience.js prototype runtime + journey-controller.js moment system
> **Doctrine:** 70% macro authored arc / 25% meso breathing / 5% micro punctuation

---

## Layer 0: What NEVER Reacts to Audio

These are authored-only. They change on authored keyframes or not at all.

| Parameter | Current Driver | Why It's Protected |
|-----------|---------------|-------------------|
| **Relic position XYZ** | Fixed (heroBasePosition + tiny Y breath) | Relic is the still point. Moving it breaks spatial grounding |
| **Relic rotation** | Authored spin (0.0008 rad/s * spinGate) | Rotation is a slow authored reveal, not reactive |
| **Camera position** | Authored splines, settle/claim/consecrate ramps | Camera IS the viewer. Reactive camera = nausea |
| **Camera target** | Authored shifts + minor macro modulation | Target shifts feel like "looking somewhere" — must be deliberate |
| **Element presence** | `manifest_in` / `manifest_out` at authored times | Things appearing/disappearing must feel intentional, not triggered |
| **Phase transitions** | Authored moments (`phase` action type) | Chapters are composed, not detected |
| **Post-processing preset** | Journey JSON or authored moments | Preset switches are macro events |
| **Darkness mode** | Journey JSON (per-track) | sacristy vs veiled is architectural, not reactive |
| **Palette colors** | Journey JSON (per-track) | Color identity is track-level |
| **Scene background** | Fixed #030306 | The black should never shift |
| **Shadow map** | Dirty-flag cadence (not per-frame) | Shadow updates are expensive, cadence is performance-driven |

### The Rule
If a parameter change would be noticed as "that moved," it must be authored. Only parameters whose changes are felt subconsciously (below the threshold of conscious detection) should be audio-reactive.

---

## Layer 1: What ALWAYS Reacts (Every Frame, Every Track)

These run on every frame regardless of track, phase, or playback state. They are the "alive" signal.

| Parameter | Audio Source | Smoothing | Range | Effect |
|-----------|-------------|-----------|-------|--------|
| **Autonomous breathing** | None (sine oscillator) | Clock-based | 0.07 amplitude @ 0.18 Hz | Camera Y, hero Y, shell uBreath. Runs even when paused |
| **Breathing cascade** | Inherits from autonomous + audio | 6-channel cascade (shell→beam→pool→frame→echo→unfurl) | Varies by channel | Each channel follows breathing with different lag. Creates temporal texture |

### Note on Autonomous Breathing
This is NOT audio-reactive. It runs on `clock.elapsedTime * autonomousRate`. It's the heart of the room — beating whether anyone is listening or not. Its weight diminishes as audio reactivity reveals (autonomousWeight: 1.0 → 0.68).

---

## Layer 2: What Reacts to Audio (Gated by reactivityReveal)

These activate gradually after playback starts, controlled by `reactivityReveal = smoothstep(revealStart, revealEnd, elapsed)`. Default: 15-42s reveal ramp.

### 2A: Always-On Audio Channels (Every Track)

| Visual Target | Audio Feature | Formula | Perception |
|---------------|---------------|---------|------------|
| **Breathing amplitude** | averageLevel | `(smoothedAverage - 0.12) * breathingAmount * reactivityReveal` | Room "swells" with music energy. Drives camera Y, hero Y, shell breath, floor scale, all atmosphere |
| **Accent pulse** | bassLevel threshold | Bass crosses `accentThreshold` (0.19) → pulse = `accentIntensity` (0.42), then exponential decay | Momentary "flash" on bass hits. Drives bloom, vignette tighten, light angle snap, shell accent |
| **Key light drop** | averageLevel | `keyLight.intensity -= average * keyAudioDrop (0.11)` | Light dims slightly on loud passages. Prevents "spotlight gets brighter when music gets louder" trap |

### 2B: Per-Track Audio Links (via `link_audio` moments)

These are authored per-track in enriched-moments JSON. They bind a specific audio feature to a specific shader uniform.

**Track 5 Current Links:**

| Moment ID | Audio Feature | Target Uniform | Multiplier | Smoothing α | Phase |
|-----------|---------------|----------------|------------|-------------|-------|
| (via Director) | loudness (inverted) | void_dust.uGravityStrength | TBD | 0.85 | VOID+ |
| (via Director) | loudness (inverted) | void_sphere.uLensStrength | TBD | 0.85 | VOID+ |

**Track 1 Reference Links (43 moments, subset shown):**

| Audio Feature | Target | Effect | Phase |
|---------------|--------|--------|-------|
| bass | egg_crystal.uGlow | Glow pulses on bass | FRACTURE+ |
| treble | star_dust.opacity | Dust brightness on treble | ASCEND+ |
| loudness | distant_shards.opacity | Shards visible on loud | FRACTURE+ |

### 2C: The Audio Feature Vocabulary

| Feature | Frequency Range | Update Rate | Smoothing | Typical Range | Best For |
|---------|----------------|-------------|-----------|---------------|----------|
| `bass` | 0-60 Hz | 24 fps | EMA α=2.4/s | 0.0-0.8 | Accent pulses, gravity, weight |
| `mid` | 60-1000 Hz | 24 fps | EMA α=1.8/s | 0.0-0.6 | Breathing, atmosphere, warmth |
| `treble` | 1000-8000 Hz | 24 fps | EMA α=1.8/s | 0.0-0.5 | Shimmer, clarity, detail |
| `loudness` (average) | Full spectrum | 24 fps | EMA α=1.8/s | 0.0-0.7 | Overall energy, room pressure |

### Noise Gates (Prevent Phantom Flicker)

| Feature | Gate Threshold | Applied |
|---------|---------------|---------|
| bass | 0.08 | Before EMA |
| mid | 0.10 | Before EMA |
| treble | 0.10 | Before EMA |
| loudness | 0.05 | Before EMA |

---

## Layer 3: What Changes Per Phase (Macro Authored Arc)

Each phase has a `phaseCurves` entry with 6 dimensions interpolated via smoothstep.

### The 6 Macro Dimensions

| Dimension | What It Drives | Range | How It Reads |
|-----------|---------------|-------|-------------|
| **air** | Dust opacity gain, haze sprite gain, atmosphere density | 0.02-0.62 | Room air quality: clear ↔ thick |
| **pressure** | Light angle tightness, vignette darkness, roomPressure bias | 0.16-0.92 | Room compression: open ↔ crushing |
| **warmth** | Key/rim/back light hue, floor color blend | 0.0-0.48 | Color temperature: cold blue ↔ warm amber |
| **finish** | Grain intensity, bloom modulation, vignette softness | 0.2-0.58 | Film processing: raw ↔ finished |
| **veil** | Overall atmospheric opacity multiplier | 0.0-1.0 | Transparency: revealed ↔ obscured |
| **clarity** | Camera target shift, envMap intensity, back light, vignette dark | 0.4-0.96 | Visual sharpness: hazy ↔ precise |

### Track 5 Phase Curves (Current)

```
Phase       air   pressure  warmth  finish  veil   clarity   Duration
VOID        0.1→0.62  0.16→0.64  0.06→0.48  0.2→0.58  1.0→0.48  0.52→0.9   96s
AWAKENING   0.46→0.24  0.34→0.58  0.24→0.48  0.34→0.48  0.46→0.08  0.84→0.95  120s
WANTING     0.2→0.32  0.48→0.88  0.16→0.22  0.34→0.52  0.08→0.02  0.9→0.96   65s
RELEASE     0.18→0.16  0.34→0.28  0.1→0.1   0.28→0.26  0.12→0.18  0.82→0.78  151s
ERASURE     0.12→0.02  0.42→0.92  0.06→0.0  0.32→0.48  0.12→0.0  0.68→0.4   132s
```

**Observation:** RELEASE is almost flat. This is the "living state" — macro arc is stable, all variation comes from audio reactivity. WANTING is the most compressed. VOID has the widest range (everything is establishing).

### roomPressureBeats (Authored Keyframes, Track 5)

```
Time    Pressure
0:00    0.66
0:10    0.66
0:30    0.54
0:42    0.76
1:00    0.58
1:15    0.67
1:36    0.52
```

**Gap:** These only cover the first 96s (VOID phase proof duration). They need extending to full 564s for the authored arc to work across all phases. Each phase should have its own pressure keyframe set.

---

## Layer 4: What Changes Per Track

| Parameter | Sonoite (T1) | Nao Querer Nada (T5) | O Filho (T6) |
|-----------|-------------|---------------------|-------------|
| **Palette primary** | #1a0e08 | #0c0f16 | #0a0d14 |
| **Palette accent** | #d4a574 | #32395e | #4a5680 |
| **Darkness mode** | sacristy | sacristy | sacristy |
| **Hero** | EggOrb | Track5HeroModel (GLB) | Monolith |
| **Flow type** | star_dust | void_dust | falling_ash |
| **Flow count** | 5000 | 460 | 800 |
| **Structure elements** | egg_crystal, distant_shards | void_sphere, void_veil, void_ring, void_halo, void_eclipse, distant_shards | monolith, monolith_grid |
| **Phase count** | 4 (ASCEND→FRACTURE→ECLIPSE→MEMORY) | 5 (VOID→AWAKENING→WANTING→RELEASE→ERASURE) | TBD |
| **Camera mode** | cinematic_dolly + splines | void_drift + splines (4 ACTs) | static (needs Director) |
| **Director** | Track1Director (534 lines) | Track5VoidDirector (partial) | None (needs creation) |
| **Enriched moments** | 43 | 30+ | 24 |
| **Bloom baseline** | 0.4 | 0.14 | 0.3 |
| **Grain baseline** | 0.06 | 0.026 | 0.06 |
| **Vignette baseline** | 0.35 | 0.74 (darker) | 0.4 |

### Per-Track Room Laws

| Track | Governing Verb | What the Room Does | What It Never Does |
|-------|---------------|-------------------|--------------------|
| **Sonoite** | CONSECRATE | Admits light gradually, reveals a sacred object | Rush, flash, expose fully |
| **Paralisia** | CONFINE | Closes in, restricts, pressurizes | Open, release, comfort |
| **O Livro Azul** | DISSOLVE | Softens edges, blurs memories, lets things go | Sharpen, solidify, ground |
| **Horas Mortas** | PERSIST | Holds vigil, endures, refuses to change | Accelerate, transform, resolve |
| **Nao Querer Nada** | WITHHOLD | Refuses to give the viewer what they expect | Deliver, crescendo, satisfy |
| **O Filho** | TRANSFER | Shifts weight, authority, presence from one to another | Hold steady, resist change |
| **Homem Educado** | EXAMINE | Studies, measures, breaks down, analyzes | Emote, exaggerate, romanticize |

---

## The Gain Architecture

### The 70/25/5 Doctrine

```
┌─────────────────────────────────────────────────────────────────────┐
│ 70% — MACRO (authored arc)                                         │
│ phaseCurves, roomPressureBeats, authored moment keyframes          │
│ Timescale: 30-120s changes                                         │
│ The viewer should feel the 9-minute arc with audio muted           │
├─────────────────────────────────────────────────────────────────────┤
│ 25% — MESO (breathing + slow reactivity)                           │
│ Autonomous breathing, breathing cascade, slow audio averaging      │
│ Timescale: 4-15s waves                                             │
│ The room feels alive but not "reactive"                            │
├─────────────────────────────────────────────────────────────────────┤
│ 5% — MICRO (accent punctuation)                                    │
│ Bass accent pulse, post_glitch, camera_shake                       │
│ Timescale: 0.1-2s events                                           │
│ Rare. Max 8-12 across 9 minutes. Never on consecutive beats       │
└─────────────────────────────────────────────────────────────────────┘
```

### Current Gain Reality

| Dimension | Macro Contribution | Meso Contribution | Micro Contribution | Diagnosis |
|-----------|-------------------|-------------------|--------------------|-----------|
| **Key light intensity** | thresholdPresence (0→1 over 30s) | roomPulse (pressure*0.82 + breath*0.22) | accent*0.4 | Meso dominates — macro ramp is one-directional |
| **Key light angle** | pressure (phaseCurve) | accent*0.004 + breath*0.006 | — | Good: macro dominates, micro is texture |
| **Vignette darkness** | vignetteDarkBase + pressure + clarity | — | — | Missing meso — vignette doesn't breathe |
| **Bloom strength** | finish (phaseCurve) | — | accent*0.05 | Missing meso — bloom doesn't breathe |
| **Grain intensity** | finish (phaseCurve) | accent*0.008 | — | Good range but too narrow (0.026-0.04) |
| **Dust opacity** | air + pressure + dustPresence | average * dustAudioGain | — | Multiplicative collapse — effective range near zero |
| **Floor glow** | ground.opacity * supportPresence | poolBreath + breathEcho | accent*0.02 | Reasonable balance but floor is too faint |
| **Shell opacity** | thresholdPresence + pressure | shellBreath + echo | accent*shellAccentGain | Good 3-layer contribution |
| **Camera Y** | settle + consecrate ramps | breath*0.45 + drift | — | Missing macro phase-based camera arc |
| **Camera Z** | claim * zPush + consecrate | — | — | Only approaches, never retreats |

### Fixes Needed

| Fix | Impact | Hours |
|-----|--------|-------|
| Add meso breathing to vignette (darkness oscillates +-0.04 with breath) | Vignette feels alive | 0.5h |
| Add meso breathing to bloom (strength oscillates +-0.02 with breath) | Bloom feels alive | 0.5h |
| Widen grain range (0.02-0.12 instead of 0.026-0.04) | Film finish reads as authored | 0.5h |
| Fix dust multiplicative collapse (additive-then-clamp) | Dust actually visible | 2h |
| Add camera Z retreat in RELEASE phase | Camera composition has arc | 1h |
| Extend roomPressureBeats to full track duration | Authored pressure across all phases | 2h |
| Add per-phase vignette keyframes (not just pressure-driven) | Enclosure reads as authored | 2h |

---

## Complete Parameter Matrix

### How to Read This Table
- **A** = Always active (every frame, every track)
- **G** = Gated by reactivityReveal ramp
- **P** = Phase-dependent (macro authored arc)
- **T** = Track-specific (different per journey)
- **M** = Moment-authored (discrete events)
- **—** = Never reactive

| Parameter | Autonomous | Bass | Mid | Treble | Loudness | Phase Curves | Moments | Track Config |
|-----------|-----------|------|-----|--------|----------|--------------|---------|-------------|
| camera.position.x | A (drift) | — | — | — | — | P (settle, claim) | M (spline) | T (basePosition) |
| camera.position.y | A (drift+breath) | — | — | — | — | P (settle, consecrate) | M (spline) | T (basePosition) |
| camera.position.z | — | — | — | — | — | P (claim, consecrate) | M (spline, dolly) | T (zPush) |
| camera.target | — | — | — | — | — | P (clarity) | M (spline) | T (target) |
| camera.fov | — | — | — | — | — | — | M (camera_fov, vertigo) | T (40 default) |
| keyLight.intensity | — | — | — | — | G (drop) | P (threshold) | — | T (keyBase) |
| keyLight.angle | — | G (accent) | — | — | — | P (pressure) | — | T (angleOpen/Tight) |
| keyLight.penumbra | — | G (accent) | — | — | — | P (pressure, finish) | — | T (penumbraOpen/Tight) |
| keyLight.color | — | — | — | — | — | P (warmth, pressure) | — | T (palette) |
| rimLight.intensity | — | G (accent) | — | — | — | P (threshold) | — | T (rimBase) |
| fillLight.intensity | — | — | — | — | — | P (establish) | — | T (fillBase) |
| bloom.strength | — | G (accent) | — | — | — | P (finish) | M (post) | T (bloomStrength) |
| grain.intensity | — | G (accent) | — | — | — | P (finish) | M (post) | T (grainIntensity) |
| vignette.darkness | — | — | — | — | — | P (pressure, clarity, finish) | M (post) | T (vignetteDarkBase) |
| vignette.offset | — | G (accent) | — | — | — | P (pressure) | M (post) | T (vignetteOffset) |
| dust.opacity | — | — | — | — | G (audioGain) | P (air, pressure) | M (opacity) | T (dustBase, dustCount) |
| dust.motion | — | — | — | — | — | — | M (motion_mode) | T (dustPattern) |
| haze.opacity | — | — | — | — | — | P (air, pressure) | M (opacity) | T (variant haze config) |
| frontHaze.opacity | — | G (accent) | — | — | — | P (air) | — | T (frontHazeMax) |
| shell.opacity | A (shellBreath) | G (accent) | — | — | — | P (threshold, pressure) | — | T (shellOpacity config) |
| floor.opacity | A (poolBreath, echo) | G (accent) | — | — | — | P (supportPresence) | — | T (ground.opacity) |
| floor.color | — | — | — | — | — | P (warmth) | — | T (palette) |
| shadow.opacity | A (poolBreath) | G (accent) | — | — | — | P (supportPresence, pressure) | — | — |
| hero.opacity | — | — | — | — | — | P (reveal) | M (opacity) | T (heroConfig) |
| hero.rotation.y | — | — | — | — | — | P (spinGate) | — | T (rotationY) |
| hero.position.y | A (breath) | — | — | — | — | P (chamberWake) | — | T (offsetY) |
| hero.rotation.z | A (sine) | — | — | — | — | — | — | — |
| void_sphere.* | — | T5 (contract) | T5 (shiver) | — | T5 (inverseLens) | P (Director phases) | M (void_lens, opacity) | T (T5 only) |
| void_dust.gravity | — | — | — | — | T5 (inverseGravity) | — | M (gravity) | T (T5 only) |

---

## Audio Reactivity Safety Rules

### 1. Smoothing Alpha Floor
**Minimum EMA α = 0.20.** Below 0.20, the smoothed value oscillates faster than the eye can follow. This was proven with Track 6 climax strobe (α=0.06 caused visible flicker).

Safe ranges:
- Gentle response: α = 0.85-0.92 (slow follow)
- Medium response: α = 0.75-0.85 (noticeable but smooth)
- Punchy response: α = 0.50-0.75 (visible beat-following)
- Dangerous: α = 0.20-0.50 (may strobe on some material)
- Forbidden: α < 0.20

### 2. Noise Gate Before Smoothing
All audio features pass through noise gates BEFORE EMA smoothing. This prevents phantom flicker during silence or quiet passages.

### 3. reactivityReveal Ramp
Audio reactivity is NEVER instant. It fades in over `reactivityRevealStartSeconds` (15) to `reactivityRevealEndSeconds` (42). This prevents the jarring moment when audio analysis "turns on."

### 4. Accent Cooldown
Bass accent pulses have exponential decay (`accentDecaySeconds` = 0.8-0.9s). A new accent can only trigger if the current pulse has decayed below the new threshold crossing. This prevents machine-gun accent flicker.

### 5. Maximum Reactive Contribution
No single audio-reactive parameter should contribute more than 30% of a visual output's total range. The macro arc must dominate.

**Example:** Bloom strength range is 0.1-0.6. Audio accent adds max 0.05 (10% of range). phaseCurve finish dimension drives 0.065 (13% of range). The other 77% comes from the authored baseline.

### 6. link_audio Ownership
When multiple `link_audio` actions target the same uniform, the last one wins (overwrites). This creates fights between authored arcs and audio links. **Fix needed:** link_audio should ADD to the authored value, not replace it. The authored value is the baseline; audio is texture on top.

---

## Implementation Priority

### Pass 1: Gain Surgery (4-6h)
1. Fix dust multiplicative collapse → additive-then-clamp
2. Widen grain range (0.02 → 0.12)
3. Add breathing to vignette and bloom
4. Extend roomPressureBeats to full track duration

### Pass 2: Macro Arc (6-8h)
1. Define 5 held states for Track 5 (complete room parameter snapshots)
2. Implement vignette-crush transitions between states
3. Add camera Z retreat in RELEASE phase
4. Add per-phase vignette and grain keyframes

### Pass 3: Micro Punctuation (3-4h)
1. Author 5-7 horizontal punctuation events per track
2. Implement camera_step (positional shift, not spline)
3. Implement light_snap (sharp angle change)
4. Implement temperature_flip (warmth inversion)

### Pass 4: Per-Track Identity (8-12h per track)
1. Define governing verb
2. Author phaseCurves (6 dimensions × phases)
3. Author roomPressureBeats (full duration)
4. Author element manifest/opacity timeline
5. Author camera splines or steps
6. Author 5-7 punctuation events
7. Full playthrough verification
