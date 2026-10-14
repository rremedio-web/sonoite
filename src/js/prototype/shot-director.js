const DEG2RAD = Math.PI / 180;
const FRAMING_VALUES = new Set(['WS', 'MCU', 'ECU']);
const PITCH_MIN = -0.35;
const PITCH_MAX = 0.55;
const FOV_MIN = 20;
const FOV_MAX = 70;
const DOLLY_ZOOM_DISTANCE_RATIO = 0.72;

/**
 * Maximum total in-shot orbit (radians). Long holds stay subtle; tune against 6–10 bar shots (~0.15–0.35 rad).
 */
const MAX_SHOT_ORBIT_RADIANS = 0.55;
const ORBIT_BUDGET_VALIDATION_EPSILON = 1e-6;
const MOTION_EASE_VALUES = new Set(['linear', 'ease-in', 'ease-out', 'ease-in-out']);

const RESOLVE_SCRATCH = {
    barIndex: 0,
    setupId: '',
    setup: null,
    pose: {
        position: [0, 0, 0],
        target: [0, 0, 0],
        fov: 45
    }
};

const MOTION_SCRATCH = {
    dollyPerBar: 0,
    orbitPerBar: 0,
    effect: null,
    effectDurationSeconds: 0
};

const TARGET_POINT_SCRATCH = [0, 0, 0];
const FORWARD_SCRATCH = [0, 0, 0];
const RIGHT_SCRATCH = [0, 0, 0];
const UP_SCRATCH = [0, 0, 0];

function isResolveOptions(value) {
    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
        && value.pose === undefined
        && value.barIndex === undefined
        && value.setupId === undefined
        && value.setup === undefined
        && Object.prototype.hasOwnProperty.call(value, 'reducedMotion');
}

function bindResolveOutput(out) {
    const target = out === undefined || out === null ? RESOLVE_SCRATCH : out;
    if (!target.pose || typeof target.pose !== 'object') {
        target.pose = {
            position: [0, 0, 0],
            target: [0, 0, 0],
            fov: 45
        };
    }
    if (!Array.isArray(target.pose.position) || target.pose.position.length < 3) {
        target.pose.position = [0, 0, 0];
    }
    if (!Array.isArray(target.pose.target) || target.pose.target.length < 3) {
        target.pose.target = [0, 0, 0];
    }
    if (!Number.isFinite(target.pose.fov)) {
        target.pose.fov = 45;
    }
    return target;
}

function normalizeVector3(value, fallback) {
    if (Array.isArray(value) && value.length >= 3) {
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    }
    return [...fallback];
}

function normalizeVector3Into(out, value, fallback) {
    if (Array.isArray(value) && value.length >= 3) {
        out[0] = Number(value[0]);
        out[1] = Number(value[1]);
        out[2] = Number(value[2]);
    } else {
        out[0] = fallback[0];
        out[1] = fallback[1];
        out[2] = fallback[2];
    }
    return out;
}

function length3(x, y, z) {
    return Math.sqrt((x * x) + (y * y) + (z * z));
}

function normalize3(out, x, y, z) {
    const len = length3(x, y, z);
    if (len <= 1e-8) {
        out[0] = 0;
        out[1] = 0;
        out[2] = -1;
        return out;
    }
    out[0] = x / len;
    out[1] = y / len;
    out[2] = z / len;
    return out;
}

function cross3(out, ax, ay, az, bx, by, bz) {
    out[0] = (ay * bz) - (az * by);
    out[1] = (az * bx) - (ax * bz);
    out[2] = (ax * by) - (ay * bx);
    return out;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function authoredOrbitPerBar(setup) {
    const motion = setup?.motion && typeof setup.motion === 'object' ? setup.motion : {};
    const value = setup.orbitPerBar ?? motion.orbitPerBar ?? 0;
    return Number.isFinite(value) ? value : 0;
}

function resolveMotionScalars(setup, reducedMotion, out) {
    const motion = setup?.motion && typeof setup.motion === 'object' ? setup.motion : {};
    out.effect = motion.effect ?? setup.effect ?? null;
    out.effectDurationSeconds = motion.effectDurationSeconds ?? setup.effectDurationSeconds ?? 0;
    if (reducedMotion) {
        out.dollyPerBar = 0;
        out.orbitPerBar = 0;
        return out;
    }
    out.dollyPerBar = setup.dollyPerBar ?? motion.dollyPerBar ?? 0;
    out.orbitPerBar = setup.orbitPerBar ?? motion.orbitPerBar ?? 0;
    return out;
}

function resolveMotionEase(setup) {
    if (setup?.motionEase !== undefined) {
        return setup.motionEase;
    }
    const motion = setup?.motion && typeof setup.motion === 'object' ? setup.motion : {};
    if (motion.motionEase !== undefined) {
        return motion.motionEase;
    }
    return undefined;
}

function applyMotionEase(u, motionEase) {
    const t = clamp(u, 0, 1);
    if (motionEase === 'ease-in') {
        return t * t;
    }
    if (motionEase === 'ease-out') {
        return t * (2 - t);
    }
    if (motionEase === 'ease-in-out') {
        if (t < 0.5) {
            return 2 * t * t;
        }
        return 1 - (((-2 * t) + 2) * ((-2 * t) + 2) / 2);
    }
    return t;
}

function computeEasedMotionProgress(tInBars, motionCapBars, motionEase) {
    if (motionCapBars <= 0) {
        return 0;
    }
    const u = clamp(tInBars / motionCapBars, 0, 1);
    return applyMotionEase(u, motionEase);
}

function computeOrbitDeltaRadians(orbitPerBar, tInBars, motionCapBars) {
    if (!Number.isFinite(orbitPerBar) || orbitPerBar === 0 || motionCapBars <= 0) {
        return 0;
    }
    const authoredTotal = orbitPerBar * motionCapBars;
    const cappedTotal = clamp(
        authoredTotal,
        -MAX_SHOT_ORBIT_RADIANS,
        MAX_SHOT_ORBIT_RADIANS
    );
    const progress = clamp(tInBars / motionCapBars, 0, 1);
    return cappedTotal * progress;
}

function computeEasedOrbitDeltaRadians(orbitPerBar, easedProgress, motionCapBars) {
    if (!Number.isFinite(orbitPerBar) || orbitPerBar === 0 || motionCapBars <= 0) {
        return 0;
    }
    const authoredTotal = orbitPerBar * motionCapBars;
    const cappedTotal = clamp(
        authoredTotal,
        -MAX_SHOT_ORBIT_RADIANS,
        MAX_SHOT_ORBIT_RADIANS
    );
    return cappedTotal * easedProgress;
}

function computeDollyZoomPose(baseDistance, baseFov, progress) {
    const t = clamp(progress, 0, 1);
    const endDistance = baseDistance * DOLLY_ZOOM_DISTANCE_RATIO;
    const endFov = (2 * Math.atan(Math.tan((baseFov * DEG2RAD) / 2) / DOLLY_ZOOM_DISTANCE_RATIO)) / DEG2RAD;
    return {
        distance: baseDistance + ((endDistance - baseDistance) * t),
        fov: baseFov + ((endFov - baseFov) * t),
        settledDistance: endDistance,
        settledFov: endFov
    };
}

function lookupRecord(record, key) {
    if (record === null || record === undefined || typeof record !== 'object') {
        return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
        return undefined;
    }
    /* eslint-disable-next-line security/detect-object-injection -- key validated via hasOwnProperty */
    return record[key];
}

function binarySearchLastIndex(times, timeSeconds) {
    if (!times.length) {
        return -1;
    }
    let low = 0;
    let high = times.length - 1;
    let best = -1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        /* eslint-disable-next-line security/detect-object-injection -- mid is bounded binary-search index */
        if (times[mid] <= timeSeconds) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return best;
}

function parseCutTimelineKeys(cutTimeline) {
    return Object.keys(cutTimeline || {})
        .map((key) => Number.parseInt(key, 10))
        .filter((bar) => Number.isInteger(bar) && bar >= 1)
        .sort((left, right) => left - right);
}

function validateSetup(setupId, setup, errors) {
    if (!setup || typeof setup !== 'object') {
        errors.push(`setup "${setupId}" must be an object`);
        return;
    }
    if (!FRAMING_VALUES.has(setup.framing)) {
        errors.push(`setup "${setupId}" framing must be WS, MCU, or ECU`);
    }
    if (!Number.isFinite(setup.yaw)) {
        errors.push(`setup "${setupId}" yaw must be a finite number`);
    }
    if (!Number.isFinite(setup.pitch) || setup.pitch < PITCH_MIN || setup.pitch > PITCH_MAX) {
        errors.push(`setup "${setupId}" pitch must be within [${PITCH_MIN}, ${PITCH_MAX}]`);
    }
    if (!Number.isFinite(setup.distance) || setup.distance <= 0) {
        errors.push(`setup "${setupId}" distance must be a positive number`);
    }
    if (!Number.isFinite(setup.fov) || setup.fov < FOV_MIN || setup.fov > FOV_MAX) {
        errors.push(`setup "${setupId}" fov must be within [${FOV_MIN}, ${FOV_MAX}]`);
    }
    if (!Number.isFinite(setup.screenX) || !Number.isFinite(setup.screenY)) {
        errors.push(`setup "${setupId}" screenX and screenY must be finite numbers`);
    }
    if (setup.dollyPerBar !== undefined && !Number.isFinite(setup.dollyPerBar)) {
        errors.push(`setup "${setupId}" dollyPerBar must be a finite number when provided`);
    }
    if (setup.orbitPerBar !== undefined && !Number.isFinite(setup.orbitPerBar)) {
        errors.push(`setup "${setupId}" orbitPerBar must be a finite number when provided`);
    }
    const localMotion = setup.localMotion ?? 0;
    if (!Number.isFinite(localMotion) || localMotion < 0 || localMotion > 1) {
        errors.push(`setup "${setupId}" localMotion must be within [0, 1]`);
    }
    if (setup.lightRig !== undefined && typeof setup.lightRig !== 'string') {
        errors.push(`setup "${setupId}" lightRig must be a string when provided`);
    }
    if (setup.height !== undefined && typeof setup.height !== 'string') {
        errors.push(`setup "${setupId}" height must be a string when provided`);
    }
    if (setup.roll !== undefined && !Number.isFinite(setup.roll)) {
        errors.push(`setup "${setupId}" roll must be a finite number when provided`);
    }
    if (setup.pitchLock !== undefined && typeof setup.pitchLock !== 'boolean') {
        errors.push(`setup "${setupId}" pitchLock must be a boolean when provided`);
    }
    if (setup.orbitBudgetExempt !== undefined && typeof setup.orbitBudgetExempt !== 'boolean') {
        errors.push(`setup "${setupId}" orbitBudgetExempt must be a boolean when provided`);
    }
    const motionEase = resolveMotionEase(setup);
    if (motionEase !== undefined) {
        if (typeof motionEase !== 'string' || !MOTION_EASE_VALUES.has(motionEase)) {
            errors.push(
                `setup "${setupId}" motionEase must be linear, ease-in, ease-out, or ease-in-out`
            );
        }
    }
}

export function shouldTakeCamera({ mode, configEnabled, active }) {
    return mode === '1' && configEnabled === true && active === true;
}

export function createShotDirector({
    setups = {},
    cutTimeline = {},
    accentCuts = [],
    beatGrid = {},
    enabled = false,
    defaultTargetPoint = [0, 0, 0],
    heightYByClass = undefined,
    enforceOrbitBudget = false
} = {}) {
    const targetDefault = normalizeVector3(defaultTargetPoint, [0, 0, 0]);
    const downbeats = [];
    const downbeatTimeByBar = new Map();
    const downbeatIndexByBar = new Map();
    const beatEntries = [];
    const beatTimeByNumber = new Map();
    const maxBeatNumber = { value: 0 };

    if (Array.isArray(beatGrid?.beats)) {
        beatGrid.beats.forEach((entry) => {
            if (!entry) {
                return;
            }
            const beatNumber = Number(entry.beat);
            const time = Number(entry.time);
            if (!Number.isInteger(beatNumber) || beatNumber < 1 || !Number.isFinite(time)) {
                return;
            }
            const bar = Number(entry.bar);
            const beatInBar = Number(entry.beatInBar);
            beatEntries.push({ beat: beatNumber, time, bar, beatInBar });
            beatTimeByNumber.set(beatNumber, time);
            if (beatNumber > maxBeatNumber.value) {
                maxBeatNumber.value = beatNumber;
            }
            if (beatInBar === 1 && Number.isInteger(bar) && bar >= 1) {
                downbeats.push({ bar, time });
            }
        });
        beatEntries.sort((left, right) => left.time - right.time);
        downbeats.sort((left, right) => left.time - right.time);
        downbeats.forEach((entry, index) => {
            downbeatTimeByBar.set(entry.bar, entry.time);
            downbeatIndexByBar.set(entry.bar, index);
        });
    }

    const downbeatTimes = downbeats.map((entry) => entry.time);
    const cutBars = parseCutTimelineKeys(cutTimeline);
    const accentCutList = Array.isArray(accentCuts) ? accentCuts : [];
    const heightYMap = heightYByClass !== undefined && heightYByClass !== null
        && typeof heightYByClass === 'object' && !Array.isArray(heightYByClass)
        ? heightYByClass
        : null;
    const orbitBudgetEnforced = enforceOrbitBudget === true;

    function accentHoldBars(startBeat, endBeat) {
        const beats = Array.isArray(beatGrid?.beats) ? beatGrid.beats : [];
        let startBar = null;
        let endBar = null;
        beats.forEach((entry) => {
            const beatNumber = Number(entry?.beat);
            const bar = Number(entry?.bar);
            if (beatNumber === startBeat && Number.isInteger(bar) && bar >= 1) {
                startBar = bar;
            }
            if (beatNumber === endBeat && Number.isInteger(bar) && bar >= 1) {
                endBar = bar;
            }
        });
        if (!Number.isInteger(startBar) || !Number.isInteger(endBar)) {
            return null;
        }
        return Math.max(endBar - startBar, 1e-6);
    }

    function validate() {
        const errors = [];

        if (!Number.isFinite(beatGrid?.bpm) || beatGrid.bpm <= 0) {
            errors.push('beatGrid.bpm must be greater than 0');
        }

        const beats = Array.isArray(beatGrid?.beats) ? beatGrid.beats : [];
        if (!beats.length) {
            errors.push('beatGrid.beats must be a non-empty array');
        } else {
            let previousTime = -Infinity;
            let previousBeat = -Infinity;
            const seenBeatNumbers = new Set();
            beats.forEach((entry, index) => {
                const time = Number(entry?.time);
                if (!Number.isFinite(time)) {
                    errors.push(`beatGrid.beats[${index}].time must be a finite number`);
                    return;
                }
                if (time <= previousTime) {
                    errors.push('beatGrid.beats times must be strictly increasing');
                }
                previousTime = time;

                const bar = Number(entry?.bar);
                if (!Number.isInteger(bar) || bar < 1) {
                    errors.push(`beatGrid.beats[${index}].bar must be an integer >= 1`);
                }

                const beatNumber = Number(entry?.beat);
                if (!Number.isInteger(beatNumber) || beatNumber < 1) {
                    errors.push(`beatGrid.beats[${index}].beat must be an integer >= 1`);
                } else if (seenBeatNumbers.has(beatNumber)) {
                    errors.push(`beatGrid.beats[${index}].beat must be unique`);
                } else {
                    seenBeatNumbers.add(beatNumber);
                }
                if (beatNumber <= previousBeat) {
                    errors.push('beatGrid.beats beat indices must be strictly increasing');
                }
                previousBeat = beatNumber;

                const beatInBar = Number(entry?.beatInBar);
                if (!Number.isInteger(beatInBar) || beatInBar < 1 || beatInBar > 4) {
                    errors.push(`beatGrid.beats[${index}].beatInBar must be 1..4`);
                }
            });
        }

        if (!setups || !Object.keys(setups).length) {
            errors.push('no setups authored');
        }

        if (!cutTimeline || !Object.keys(cutTimeline).length) {
            errors.push('no cut timeline authored');
        }

        cutBars.forEach((bar) => {
            const downbeatMatches = beats.filter(
                (entry) => Number(entry?.bar) === bar && Number(entry?.beatInBar) === 1
            );
            if (downbeatMatches.length !== 1) {
                errors.push(`cutTimeline bar ${bar} requires exactly one beat with beatInBar===1`);
            }
        });

        Object.entries(cutTimeline || {}).forEach(([barKey, setupId]) => {
            const bar = Number.parseInt(barKey, 10);
            if (!Number.isInteger(bar) || bar < 1) {
                errors.push(`cutTimeline key "${barKey}" must be an integer bar index >= 1`);
            }
            if (!lookupRecord(setups, setupId)) {
                errors.push(`cutTimeline bar ${barKey} references unknown setupId "${setupId}"`);
            }
        });

        accentCutList.forEach((accent, index) => {
            if (!accent || typeof accent !== 'object') {
                errors.push(`accentCuts[${index}] must be an object`);
                return;
            }
            const startBeat = Number(accent.startBeat);
            const endBeat = Number(accent.endBeat);
            if (!Number.isInteger(startBeat) || !Number.isInteger(endBeat) || startBeat < 1 || endBeat <= startBeat) {
                errors.push(`accentCuts[${index}] requires integer startBeat < endBeat (1-based)`);
            }
            if (!lookupRecord(setups, accent.setupId)) {
                errors.push(`accentCuts[${index}] references unknown setupId "${accent.setupId}"`);
            }
            if (Number.isInteger(startBeat) && (startBeat < 1 || startBeat > maxBeatNumber.value)) {
                errors.push(`accentCuts[${index}] startBeat outside beat grid`);
            }
            if (Number.isInteger(endBeat) && endBeat > maxBeatNumber.value + 1) {
                errors.push(`accentCuts[${index}] endBeat outside beat grid`);
            }
        });

        Object.entries(setups || {}).forEach(([setupId, setup]) => {
            validateSetup(setupId, setup, errors);
        });

        if (heightYByClass !== undefined) {
            if (heightYByClass === null || typeof heightYByClass !== 'object' || Array.isArray(heightYByClass)) {
                errors.push('heightYByClass must be an object when provided');
            } else {
                Object.entries(heightYByClass).forEach(([classKey, mappedY]) => {
                    if (!Number.isFinite(mappedY)) {
                        errors.push(`heightYByClass.${classKey} must be a finite number`);
                    }
                });
            }
        }

        if (orbitBudgetEnforced) {
            cutBars.forEach((cutBar) => {
                const setupId = lookupRecord(cutTimeline, String(cutBar))
                    ?? lookupRecord(cutTimeline, cutBar);
                const setup = lookupRecord(setups, setupId);
                if (!setup) {
                    return;
                }
                if (setup.orbitBudgetExempt === true) {
                    return;
                }
                const orbitPerBar = authoredOrbitPerBar(setup);
                if (orbitPerBar === 0) {
                    return;
                }
                const holdBars = shotLengthBars(cutBar);
                const orbitTotal = Math.abs(orbitPerBar) * holdBars;
                if (orbitTotal > MAX_SHOT_ORBIT_RADIANS + ORBIT_BUDGET_VALIDATION_EPSILON) {
                    errors.push(
                        `orbit budget exceeded for setup "${setupId}" at cut bar ${cutBar}: `
                        + `|orbitPerBar|*holdBars=${orbitTotal} exceeds max ${MAX_SHOT_ORBIT_RADIANS}`
                    );
                }
            });

            accentCutList.forEach((accent, index) => {
                if (!accent || typeof accent !== 'object') {
                    return;
                }
                const setup = lookupRecord(setups, accent.setupId);
                if (!setup) {
                    return;
                }
                const orbitPerBar = authoredOrbitPerBar(setup);
                if (orbitPerBar === 0) {
                    return;
                }
                const startBeat = Number(accent.startBeat);
                const endBeat = Number(accent.endBeat);
                const holdBars = accentHoldBars(startBeat, endBeat);
                if (holdBars === null) {
                    return;
                }
                const orbitTotal = Math.abs(orbitPerBar) * holdBars;
                if (orbitTotal > MAX_SHOT_ORBIT_RADIANS + ORBIT_BUDGET_VALIDATION_EPSILON) {
                    errors.push(
                        `orbit budget exceeded for accent setup "${accent.setupId}" `
                        + `(accentCuts[${index}]): |orbitPerBar|*holdBars=${orbitTotal} `
                        + `exceeds max ${MAX_SHOT_ORBIT_RADIANS}`
                    );
                }
            });
        }

        return {
            ok: errors.length === 0,
            errors
        };
    }

    const validation = validate();
    const active = Boolean(
        enabled
        && validation.ok
        && Object.keys(setups || {}).length
        && Object.keys(cutTimeline || {}).length
    );

    function resolveCutBar(currentBar) {
        if (!cutBars.length) {
            return null;
        }
        let chosen = cutBars[0];
        cutBars.forEach((bar) => {
            if (bar <= currentBar) {
                chosen = bar;
            }
        });
        return chosen;
    }

    function shotLengthBars(cutBar) {
        const cutIndex = cutBars.indexOf(cutBar);
        if (cutIndex < 0) {
            return 1;
        }
        const nextCutBar = cutBars[cutIndex + 1];
        if (nextCutBar !== undefined) {
            return Math.max(nextCutBar - cutBar, 1e-6);
        }
        if (!downbeats.length) {
            return 1;
        }
        const lastBar = downbeats[downbeats.length - 1].bar;
        return Math.max(lastBar - cutBar + 1, 1e-6);
    }

    function motionCapTInBars(cutBar) {
        return shotLengthBars(cutBar);
    }

    function resolveAccentSetupId(timeSeconds, baseSetupId) {
        for (let index = 0; index < accentCutList.length; index += 1) {
            /* eslint-disable-next-line security/detect-object-injection -- bounded accent list index */
            const accent = accentCutList[index];
            const startBeat = Number(accent.startBeat);
            const endBeat = Number(accent.endBeat);
            const startTime = beatTimeByNumber.get(startBeat);
            const endTime = beatTimeByNumber.get(endBeat);
            if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
                continue;
            }
            if (timeSeconds > startTime && timeSeconds < endTime) {
                return accent.setupId;
            }
        }
        return baseSetupId;
    }


    function computeTInBars(timeSeconds, cutBar, currentBar, effectiveDownbeatIndex, downbeatIndex) {
        if (downbeatIndex < 0) {
            return 0;
        }
        const cap = motionCapTInBars(cutBar);
        if (downbeatTimes.length && timeSeconds >= downbeatTimes[downbeatTimes.length - 1]) {
            return cap;
        }
        let tInBars = 0;
        if (effectiveDownbeatIndex >= 0 && downbeats.length) {
            tInBars = Math.max(0, currentBar - cutBar);
            /* eslint-disable-next-line security/detect-object-injection -- effectiveDownbeatIndex bounded */
            const currentDownbeatTime = downbeats[effectiveDownbeatIndex].time;
            const nextDownbeat = downbeats[effectiveDownbeatIndex + 1];
            if (nextDownbeat) {
                const span = Math.max(nextDownbeat.time - currentDownbeatTime, 1e-9);
                const barPhase = clamp((timeSeconds - currentDownbeatTime) / span, 0, 1);
                tInBars += barPhase;
            }
        }
        return Math.min(tInBars, cap);
    }

    function resolve(timeSeconds, out, options = {}) {
        if (!active || !Number.isFinite(timeSeconds)) {
            return null;
        }

        if (isResolveOptions(out)) {
            options = out;
            out = undefined;
        }

        const reducedMotion = options.reducedMotion === true;

        const downbeatIndex = binarySearchLastIndex(downbeatTimes, timeSeconds);
        const effectiveDownbeatIndex = downbeatIndex < 0 ? 0 : downbeatIndex;
        /* eslint-disable-next-line security/detect-object-injection -- effectiveDownbeatIndex bounded */
        const currentBar = downbeats.length ? downbeats[effectiveDownbeatIndex].bar : 0;

        const cutBar = resolveCutBar(currentBar);
        if (cutBar === null) {
            return null;
        }

        const baseSetupId = lookupRecord(cutTimeline, String(cutBar)) ?? lookupRecord(cutTimeline, cutBar);
        const setupId = resolveAccentSetupId(timeSeconds, baseSetupId);
        const setup = lookupRecord(setups, setupId);
        if (!setup) {
            return null;
        }

        const target = bindResolveOutput(out);

        const tInBars = computeTInBars(
            timeSeconds,
            cutBar,
            currentBar,
            effectiveDownbeatIndex,
            downbeatIndex
        );

        const motionScalars = resolveMotionScalars(setup, reducedMotion, MOTION_SCRATCH);
        const { dollyPerBar, orbitPerBar, effect, effectDurationSeconds } = motionScalars;
        const motionCapBars = motionCapTInBars(cutBar);
        // motionEase shapes in-shot dolly/orbit only; effect/dollyZoom progress stays wall-clock.
        const motionEase = resolveMotionEase(setup);
        let orbitDelta;
        let dist;
        if (motionEase !== undefined && motionEase !== 'linear') {
            const easedProgress = computeEasedMotionProgress(tInBars, motionCapBars, motionEase);
            orbitDelta = computeEasedOrbitDeltaRadians(orbitPerBar, easedProgress, motionCapBars);
            dist = setup.distance + (dollyPerBar * motionCapBars * easedProgress);
        } else {
            orbitDelta = computeOrbitDeltaRadians(orbitPerBar, tInBars, motionCapBars);
            dist = setup.distance + dollyPerBar * tInBars;
        }
        const yawEff = setup.yaw + orbitDelta;
        let effectiveFov = setup.fov;
        const targetPoint = normalizeVector3Into(TARGET_POINT_SCRATCH, setup.targetPoint, targetDefault);

        if (effect === 'dollyZoom') {
            const cutDownbeatTime = downbeatTimeByBar.get(cutBar);
            const effectStart = Number.isFinite(cutDownbeatTime) ? cutDownbeatTime : timeSeconds;
            let effectProgress = 1;
            if (!reducedMotion) {
                effectProgress = effectDurationSeconds > 0
                    ? clamp((timeSeconds - effectStart) / effectDurationSeconds, 0, 1)
                    : 1;
            }
            const zoomPose = computeDollyZoomPose(dist, setup.fov, effectProgress);
            dist = zoomPose.distance;
            effectiveFov = zoomPose.fov;
        }

        let pitch = setup.pitch;
        if (heightYMap && setup.pitchLock !== true && setup.height !== undefined && typeof setup.height === 'string') {
            const desiredCameraY = lookupRecord(heightYMap, setup.height);
            if (Number.isFinite(desiredCameraY)) {
                const pitchRatio = clamp((desiredCameraY - targetPoint[1]) / dist, -1, 1);
                pitch = clamp(Math.asin(pitchRatio), PITCH_MIN, PITCH_MAX);
            }
        }

        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);
        const sinYaw = Math.sin(yawEff);
        const cosYaw = Math.cos(yawEff);

        const offsetX = sinYaw * cosPitch * dist;
        const offsetY = sinPitch * dist;
        const offsetZ = cosYaw * cosPitch * dist;

        let posX = targetPoint[0] + offsetX;
        let posY = targetPoint[1] + offsetY;
        let posZ = targetPoint[2] + offsetZ;

        normalize3(
            FORWARD_SCRATCH,
            targetPoint[0] - posX,
            targetPoint[1] - posY,
            targetPoint[2] - posZ
        );
        cross3(RIGHT_SCRATCH, FORWARD_SCRATCH[0], FORWARD_SCRATCH[1], FORWARD_SCRATCH[2], 0, 1, 0);
        normalize3(RIGHT_SCRATCH, RIGHT_SCRATCH[0], RIGHT_SCRATCH[1], RIGHT_SCRATCH[2]);
        cross3(
            UP_SCRATCH,
            RIGHT_SCRATCH[0],
            RIGHT_SCRATCH[1],
            RIGHT_SCRATCH[2],
            FORWARD_SCRATCH[0],
            FORWARD_SCRATCH[1],
            FORWARD_SCRATCH[2]
        );

        const halfH = dist * Math.tan((effectiveFov * 0.5) * DEG2RAD);
        posX += (RIGHT_SCRATCH[0] * setup.screenX * halfH) + (UP_SCRATCH[0] * setup.screenY * halfH);
        posY += (RIGHT_SCRATCH[1] * setup.screenX * halfH) + (UP_SCRATCH[1] * setup.screenY * halfH);
        posZ += (RIGHT_SCRATCH[2] * setup.screenX * halfH) + (UP_SCRATCH[2] * setup.screenY * halfH);

        target.barIndex = downbeatIndex < 0 ? 0 : downbeatIndex;
        target.setupId = setupId;
        target.setup = setup;
        target.cutBar = cutBar;
        target.cutTimeSeconds = Number.isFinite(downbeatTimeByBar.get(cutBar))
            ? downbeatTimeByBar.get(cutBar)
            : timeSeconds;
        target.pose.position[0] = posX;
        target.pose.position[1] = posY;
        target.pose.position[2] = posZ;
        target.pose.target[0] = targetPoint[0];
        target.pose.target[1] = targetPoint[1];
        target.pose.target[2] = targetPoint[2];
        target.pose.fov = effectiveFov;

        return target;
    }

    function getDebugState(timeSeconds) {
        const resolved = resolve(timeSeconds);
        return {
            active,
            validation,
            timeSeconds,
            resolved: resolved
                ? {
                    barIndex: resolved.barIndex,
                    setupId: resolved.setupId,
                    framing: resolved.setup?.framing,
                    pose: resolved.pose
                }
                : null
        };
    }

    function isActive() {
        return active;
    }

    return {
        validate,
        isActive,
        resolve,
        getDebugState
    };
}

export {
    applyMotionEase,
    computeDollyZoomPose,
    computeEasedMotionProgress,
    computeEasedOrbitDeltaRadians,
    DOLLY_ZOOM_DISTANCE_RATIO,
    MAX_SHOT_ORBIT_RADIANS,
    MOTION_EASE_VALUES,
    resolveMotionEase
};
