// Quantized committed reactions — the third RELEASE-owner candidate, and the
// only one that lets music visibly shape the room without becoming a visualizer.
//
// The doctrine contains a contradiction: "if the viewer can't tell what changed,
// the change didn't happen" (END_GOAL_AND_PRODUCT_RESET) versus "only parameters
// whose changes are felt subconsciously should be audio-reactive"
// (MUSIC_INTERACTION_MATRIX:29). Together those make audio reactivity
// unperceivable BY CONSTRUCTION — while MATRIX:124 assigns RELEASE's entire
// variation to that same capped channel. RELEASE recurs, and its second window
// (BASELINE_2026-06-10:19, 337-534s) is 197 seconds: the largest single window
// in the track, canonically owned by a channel that cannot be seen.
//
// The escape is not louder modulation. Continuous parameter modulation IS the
// iteration-2 screensaver failure that the March reset killed. This module does
// the opposite: audio NEVER modulates anything continuously. Instead, musical
// structure TRIGGERS a discrete step between authored held states — committed,
// hysteretic, minimum-spaced. Between commits, zero audio reaches the room.
//
// What it may touch: the light law (key/rim/back weight, warmth, vignette).
// What it must never touch: camera, relic transform, phase state.
//
// Opt-in; experience.js builds it for `?commit=1` (applyCommitPreset(), with the
// variant's commitReactions windows, default 337-534s) or for the Track 5 recut
// with `?recut=1&listen=1` (RECUT_LISTEN_COMMIT_CONFIG in recut-listen.js).
//
// Corrected 2026-07-20 (external review): an earlier version of this comment
// called the module "the first deliberate crossing of the Layer-0 line". That
// was false. Layer 0 has ALWAYS been crossed in shipped code —
// `dynamicState.breathing` carries an audio term (experience.js
// updateAnalysisState()) and is applied to camera Y and target in
// updateCamera() and to the relic's rotation.z and Y position in updateHero();
// relic iridescence rides midSustain, also in updateHero(). The doctrine file
// contains both the blanket "never" and a gain table authorising exactly those
// couplings, and the implementation followed the permissive half. So this
// module is not the first crossing — it is the first one that is perceivable,
// committed, and honest about being a crossing.

const DEFAULT_STATES = [
    { id: 'sealed', keyMul: 0.82, rimMul: 1.18, backMul: 0.88, tempShift: -0.06, vignetteShift: 0.05 },
    { id: 'admitted', keyMul: 1.14, rimMul: 0.92, backMul: 1.22, tempShift: 0.04, vignetteShift: -0.04 },
    { id: 'pressed', keyMul: 1.05, rimMul: 1.24, backMul: 0.78, tempShift: 0.09, vignetteShift: 0.08 },
    { id: 'opened', keyMul: 0.9, rimMul: 1.0, backMul: 1.3, tempShift: -0.03, vignetteShift: -0.07 }
];

const NEUTRAL = { keyMul: 1, rimMul: 1, backMul: 1, tempShift: 0, vignetteShift: 0 };

export function createCommitReactions({ config = {}, seed = 1 } = {}) {
    const states = config.states || DEFAULT_STATES;
    const minInterval = config.minIntervalSeconds ?? 22;
    const crossfade = config.crossfadeSeconds ?? 1.6;
    const accentThreshold = config.accentThreshold ?? 0.42;
    const activeWindows = config.activeWindows || [{ start: 337, end: 534 }];
    const armAfterSeconds = config.armAfterSeconds ?? 6;

    // Seeded order so ?seed= still replays the session; no immediate repeats.
    let cursor = 0;
    let prngState = (seed % 4294967296) + 0x2545F491;
    const nextRandom = () => {
        prngState = (prngState * 1664525 + 1013904223) % 4294967296;
        return prngState / 4294967296;
    };
    const order = states.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(nextRandom() * (i + 1));
        const held = order.at(i);
        order.splice(i, 1, order.at(j));
        order.splice(j, 1, held);
    }

    let fromState = NEUTRAL;
    let toState = NEUTRAL;
    let blend = 1;
    let lastCommitAt = -Infinity;
    let commitCount = 0;
    let lastCommitId = 'none';

    const outputs = { ...NEUTRAL, stateId: 'none', commitCount: 0, sinceCommit: 0 };

    function inActiveWindow(elapsed) {
        return activeWindows.some((w) => elapsed >= w.start && elapsed < w.end);
    }

    function commit(elapsed) {
        cursor = (cursor + 1) % order.length;
        const next = states.at(order.at(cursor));
        fromState = { ...outputs };
        toState = next;
        blend = 0;
        lastCommitAt = elapsed;
        commitCount += 1;
        lastCommitId = next.id;
        console.info(`[Prototype] commit #${commitCount} -> ${next.id} @ ${elapsed.toFixed(1)}s`);
    }

    function update(elapsed, dt, { accent = 0, phase = '' } = {}) {
        const erasing = phase === 'ERASURE';
        const armed = elapsed - lastCommitAt >= minInterval && elapsed >= armAfterSeconds;

        if (!erasing && armed && inActiveWindow(elapsed) && accent >= accentThreshold) {
            commit(elapsed);
        }

        // ERASURE returns the room to neutral regardless of the last commit —
        // the ending is authored, and nothing musical may hold it open.
        if (erasing && toState !== NEUTRAL) {
            fromState = { ...outputs };
            toState = NEUTRAL;
            blend = 0;
            lastCommitId = 'erasure-neutral';
        }

        if (blend < 1 && crossfade > 0) {
            blend = Math.min(1, blend + dt / crossfade);
        } else {
            blend = 1;
        }

        const ease = blend * blend * (3 - 2 * blend);
        outputs.keyMul = fromState.keyMul + (toState.keyMul - fromState.keyMul) * ease;
        outputs.rimMul = fromState.rimMul + (toState.rimMul - fromState.rimMul) * ease;
        outputs.backMul = fromState.backMul + (toState.backMul - fromState.backMul) * ease;
        outputs.tempShift = fromState.tempShift + (toState.tempShift - fromState.tempShift) * ease;
        outputs.vignetteShift = fromState.vignetteShift + (toState.vignetteShift - fromState.vignetteShift) * ease;
        outputs.stateId = lastCommitId;
        outputs.commitCount = commitCount;
        outputs.sinceCommit = Number.isFinite(lastCommitAt) ? elapsed - lastCommitAt : -1;
        return outputs;
    }

    return { outputs, update };
}
