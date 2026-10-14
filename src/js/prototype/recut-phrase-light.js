/* eslint-disable security/detect-object-injection -- indices are bounded loop
   counters or offsets into this module's own precomputed schedule arrays. */
/**
 * Track 5 audio-led middle recut — phrase-light score.
 *
 * Pure, seek-safe module that precomputes deterministic phrase windows and
 * phrase-start camera anchors so lighting can re-key on musical phrase
 * boundaries independent of camera cuts.
 *
 * Query windows are half-open `[startTime, endTime)` in absolute seconds.
 * The Track 5 recut phrase range ends at bar 195 (existing authored span); no
 * synthetic tail bars are required beyond that schedule.
 *
 * experience.js builds it from the phrase table in films/nao-querer-nada.js only
 * when `?recut=1`, the `lightarc` film flag and an active ShotDirector all hold;
 * a table that fails validate() is logged and left unused.
 */

function downbeatTimeForBar(beatGrid, bar) {
    const beats = Array.isArray(beatGrid?.beats) ? beatGrid.beats : null;
    if (!beats || !Number.isInteger(bar)) {
        return null;
    }
    for (let i = 0; i < beats.length; i += 1) {
        const entry = beats[i];
        if (!entry) {
            continue;
        }
        const entryBar = Number(entry.bar);
        const beatInBar = Number(entry.beatInBar);
        const time = Number(entry.time);
        if (entryBar === bar && beatInBar === 1 && Number.isFinite(time)) {
            return time;
        }
    }
    return null;
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}

function cloneFiniteVec3(value) {
    if (!Array.isArray(value) || value.length < 3) {
        return null;
    }
    const x = Number(value[0]);
    const y = Number(value[1]);
    const z = Number(value[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }
    return Object.freeze([x, y, z]);
}

function readPoseFromResolve(result) {
    if (!result || typeof result !== 'object') {
        return null;
    }
    const pose = result.pose && typeof result.pose === 'object' ? result.pose : result;
    const position = cloneFiniteVec3(pose.position);
    const target = cloneFiniteVec3(pose.target);
    const fov = Number(pose.fov);
    if (!position || !target || !Number.isFinite(fov)) {
        return null;
    }
    return {
        position,
        target,
        fov
    };
}

function validatePhraseRows(phraseTable, beatGrid, rigSet, resolveCameraAt, errors) {
    if (!Array.isArray(phraseTable) || phraseTable.length === 0) {
        errors.push('phraseTable must be a non-empty array');
        return [];
    }
    if (typeof resolveCameraAt !== 'function') {
        errors.push('resolveCameraAt must be a function');
        return [];
    }

    const seenIds = new Set();
    const normalized = [];

    phraseTable.forEach((row, index) => {
        const label = `phraseTable[${index}]`;

        if (!row || typeof row !== 'object') {
            errors.push(`${label} must be an object`);
            return;
        }

        if (!isNonEmptyString(row.id)) {
            errors.push(`${label}.id must be a non-empty string`);
            return;
        }
        if (seenIds.has(row.id)) {
            errors.push(`${label}.id "${row.id}" is duplicated`);
            return;
        }
        seenIds.add(row.id);

        const startBar = row.startBar;
        const endBar = row.endBar;
        if (!Number.isInteger(startBar) || !Number.isInteger(endBar)) {
            errors.push(`${label}.startBar and ${label}.endBar must be integers`);
            return;
        }
        if (endBar <= startBar) {
            errors.push(`${label}.endBar must be greater than startBar`);
            return;
        }

        if (!isNonEmptyString(row.lightRig) || !rigSet.has(row.lightRig)) {
            errors.push(`${label}.lightRig "${row.lightRig}" is unknown or missing`);
            return;
        }

        const startTime = downbeatTimeForBar(beatGrid, startBar);
        if (startTime === null) {
            errors.push(`${label}.startBar ${startBar} has no downbeat in beatGrid`);
            return;
        }
        const endTime = downbeatTimeForBar(beatGrid, endBar);
        if (endTime === null) {
            errors.push(`${label}.endBar ${endBar} has no downbeat in beatGrid`);
            return;
        }
        if (endTime <= startTime) {
            errors.push(`${label} end downbeat time must be strictly after start downbeat time`);
            return;
        }

        const cameraCutBars = Array.isArray(row.cameraCutBars) ? row.cameraCutBars : [];
        if (row.rekeyOnly === true && cameraCutBars.length > 0) {
            errors.push(`${label}.rekeyOnly requires empty cameraCutBars`);
            return;
        }
        cameraCutBars.forEach((bar, cutIndex) => {
            if (!Number.isInteger(bar)) {
                errors.push(`${label}.cameraCutBars[${cutIndex}] must be an integer`);
                return;
            }
            if (bar < startBar || bar >= endBar) {
                errors.push(
                    `${label}.cameraCutBars[${cutIndex}] bar ${bar} must lie in [${startBar}, ${endBar})`
                );
            }
        });

        const resolved = resolveCameraAt(startTime);
        const pose = readPoseFromResolve(resolved);
        if (!pose) {
            errors.push(`${label} resolveCameraAt(${startTime}) must return finite position/target/fov`);
            return;
        }

        normalized.push({
            id: row.id,
            startBar,
            endBar,
            lightRig: row.lightRig,
            cameraCutBars: Object.freeze(cameraCutBars.slice()),
            rekeyOnly: row.rekeyOnly === true,
            startTime,
            endTime,
            anchorPosition: pose.position,
            anchorTarget: pose.target,
            anchorFov: pose.fov
        });
    });

    if (normalized.length === 0) {
        return normalized;
    }

    normalized.sort((a, b) => a.startBar - b.startBar);

    for (let i = 1; i < normalized.length; i += 1) {
        const prev = normalized[i - 1];
        const next = normalized[i];
        if (next.startBar < prev.endBar) {
            errors.push(
                `phrase "${next.id}" overlaps "${prev.id}" at bar ${next.startBar}`
            );
        } else if (next.startBar > prev.endBar) {
            errors.push(
                `gap between phrase "${prev.id}" (endBar ${prev.endBar}) and "${next.id}" (startBar ${next.startBar})`
            );
        }
        if (next.startTime <= prev.startTime) {
            errors.push(
                `phrase "${next.id}" startTime must strictly increase with startBar`
            );
        }
        if (next.endTime <= prev.endTime) {
            errors.push(
                `phrase "${next.id}" endTime must strictly increase with endBar`
            );
        }
        if (next.startTime < prev.endTime) {
            errors.push(
                `phrase times must strictly increase with bars between "${prev.id}" and "${next.id}"`
            );
        }
    }

    return normalized;
}

function binarySearchLastStartLE(startTimes, timeSeconds) {
    let lo = 0;
    let hi = startTimes.length - 1;
    let idx = -1;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (startTimes[mid] <= timeSeconds) {
            idx = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return idx;
}

/**
 * Allocation-free runtime frame resolver for the phrase-light state machine.
 * Calls `score.at` into caller-owned `queryOut`; when in range fills caller `out`
 * with phraseId, rigId, anchorPosition, anchorTarget, anchorFov, and `rekey`.
 *
 * @param {{ at?: (timeSeconds:number, out:Object) => Object|null }|null|undefined} score
 * @param {number}                                                                  timeSeconds
 * @param {Object}                                                                  queryOut       caller-owned `score.at` output object
 * @param {string}                                                                  activePhraseId cached active phrase id
 * @param {string}                                                                  activeRigId    cached active rig id
 * @param {Object}                                                                  out            caller-owned frame output object
 * @return {Object|null} filled `out` when inside phrase range, else null
 */
export function resolveRecutPhraseLightFrame(
    score,
    timeSeconds,
    queryOut,
    activePhraseId,
    activeRigId,
    out
) {
    if (!score?.at || !queryOut || !out || typeof out !== 'object') {
        return null;
    }
    const hit = score.at(timeSeconds, queryOut);
    if (!hit) {
        return null;
    }
    out.phraseId = queryOut.id;
    out.rigId = queryOut.lightRig;
    out.anchorPosition = queryOut.anchorPosition;
    out.anchorTarget = queryOut.anchorTarget;
    out.anchorFov = queryOut.anchorFov;
    out.rekey = out.phraseId !== activePhraseId || out.rigId !== activeRigId;
    return out;
}

/**
 * @param {{
 *   beatGrid?: { beats?: Array<{ bar:number, beatInBar:number, time:number }> },
 *   phraseTable?: Array<{ id:string, startBar:number, endBar:number, lightRig:string, cameraCutBars?: number[], rekeyOnly?: boolean }>,
 *   resolveCameraAt?: (timeSeconds:number) => ({ position:number[], target:number[], fov:number }|{ pose:{ position:number[], target:number[], fov:number } }|null),
 *   lightRigIds?: string[]
 * }} [options]
 * @return {{ validate: () => { ok: boolean, errors: string[] }, list: () => ReadonlyArray<Object>, at: (timeSeconds:number, out:Object) => Object|null }} query surface
 */
export function createRecutPhraseLight({
    beatGrid,
    phraseTable,
    resolveCameraAt,
    lightRigIds
} = {}) {
    const rigSet = new Set(Array.isArray(lightRigIds) ? lightRigIds : []);
    const errors = [];
    const rows = validatePhraseRows(
        phraseTable,
        beatGrid,
        rigSet,
        resolveCameraAt,
        errors
    );

    const count = rows.length;
    const startTimes = new Array(count);
    const endTimes = new Array(count);
    for (let i = 0; i < count; i += 1) {
        startTimes[i] = rows[i].startTime;
        endTimes[i] = rows[i].endTime;
    }
    const rangeStart = count > 0 ? startTimes[0] : Infinity;
    const rangeEnd = count > 0 ? endTimes[count - 1] : -Infinity;
    const ok = errors.length === 0 && count > 0;

    return {
        /** @return {{ ok:boolean, errors:string[] }} validation snapshot */
        validate() {
            return { ok, errors: errors.slice() };
        },

        /** @return {ReadonlyArray<Object>} diagnostic frozen copy */
        list() {
            return Object.freeze(rows.map((row, index) => Object.freeze({
                index,
                id: row.id,
                lightRig: row.lightRig,
                startBar: row.startBar,
                endBar: row.endBar,
                startTime: row.startTime,
                endTime: row.endTime,
                cameraCutBars: row.cameraCutBars,
                rekeyOnly: row.rekeyOnly,
                anchorPosition: row.anchorPosition,
                anchorTarget: row.anchorTarget,
                anchorFov: row.anchorFov
            })));
        },

        /**
         * @param {number} timeSeconds absolute track time (seconds)
         * @param {Object} out         caller-provided output object
         * @return {Object|null} filled `out` when inside `[startTime, endTime)`, else null
         */
        at(timeSeconds, out) {
            if (!ok || !Number.isFinite(timeSeconds) || !out || typeof out !== 'object') {
                return null;
            }
            if (timeSeconds < rangeStart || timeSeconds >= rangeEnd) {
                return null;
            }

            const idx = binarySearchLastStartLE(startTimes, timeSeconds);
            if (idx < 0 || timeSeconds >= endTimes[idx]) {
                return null;
            }

            const row = rows[idx];
            out.index = idx;
            out.id = row.id;
            out.lightRig = row.lightRig;
            out.startBar = row.startBar;
            out.endBar = row.endBar;
            out.startTime = row.startTime;
            out.endTime = row.endTime;
            out.rekeyOnly = row.rekeyOnly;
            out.cameraCutBars = row.cameraCutBars;
            out.anchorPosition = row.anchorPosition;
            out.anchorTarget = row.anchorTarget;
            out.anchorFov = row.anchorFov;
            return out;
        }
    };
}
