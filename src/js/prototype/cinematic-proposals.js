/* eslint-disable security/detect-object-injection -- Keys come from fixed track whitelists and authored camera tables. */
/**
 * September cinematic proposals, imported by experience.js (opt-in `?proposal=intimate|chamber|afterimage|stage`
 * on the three built films; ignored under `?recut=1` and proof runs). resolveCinematicProposal() validates the
 * mode against the track's own cinema variant; createProposalCamera() rewrites the camera (the seconds score on
 * Tracks 1 and 4, ShotDirector setups and cuts on Track 5); sampleProposalLight() returns absolute-time light
 * envelopes. The Track 4/5 ledger arms reuse the Stage room. None is owner-adopted.
 * See docs/qa/THREE_CINEMATIC_PROPOSALS_2026-09-06.md and STAGE_HYBRID_TRIAL_2026-09-07.md.
 */

import { sampleSodiumLightLevel } from './chamber-sodium.js';
import { mutationAmountAt } from './relic-mutation.js';

const VARIANTS = { sonoite: 'sonoite-cinema', 'horas-mortas': 'horas-mortas-cinema', 'nao-querer-nada': 'track5-cinema' };
const MODES = ['intimate', 'chamber', 'afterimage', 'stage'];
const CENTER = [0.96, 2.0, -0.04];
const HEAD = [0.96, 4.7, -0.04];
const PALM = [0.96, 1.5, -0.04];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp = (a, b, t) => {
    const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); 
};

export function resolveCinematicProposal(params, slug, variant) {
    const mode = params.get('proposal');
    return MODES.includes(mode) && VARIANTS[slug] === variant
        && params.get('recut') !== '1' && !params.has('proof') && !params.has('duration') ? mode : null;
}

function pose(atSeconds, position, target, fov = 42) {
    return { atSeconds, position, target, fov, driftScale: 0, transitionSeconds: 0 };
}

function track1StageInsert(t) {
    // Retain the existing recording landmarks, but give the inserts different
    // subjects. Mapping every cue to the signature erased real camera cuts.
    switch (t) {
        case 35.4: return pose(t, [-4.2, 2.2, 8.5], PALM, 42);
        case 62.83: return { ...pose(t, [-5.4, 2.5, 9.2], [0.96, 3.3, 0], 42), transitionSeconds: 10 };
        case 125: return pose(t, [6.8, 2.7, 6.2], [0.96, 2.7, 0], 44);
        case 253: return pose(t, [-5.4, 2.5, 7.6], [0.96, 2.7, 0], 40);
        case 336: return pose(t, [-3.4, 2.1, 7.8], PALM, 42);
        case 367: return pose(t, [-5.2, 3.8, 8.4], [0.96, 3.2, 0], 38);
        case 392.2: return pose(t, [-4.6, 2.8, 8.2], [0.96, 3.1, 0], 40);
        case 425.2: return pose(t, [4.2, 3.7, 7.2], [0.98, 2.7, 0], 40);
        case 438.9: return pose(t, [4.7, 3.1, 6.5], [0.98, 2.6, 0], 38);
        case 488.5: return pose(t, [-4.2, 2.2, 8.5], PALM, 42);
        case 528: return { ...pose(t, [-4.4, 2.6, 11], CENTER, 40), transitionSeconds: 24.4 };
        default: return null;
    }
}

function createSecondsCamera(camera, slug, mode) {
    const isOne = slug === 'sonoite';
    const source = camera.score;
    const score = source.map((cue) => {
        const t = cue.atSeconds;
        const end = t >= (isOne ? 488.5 : 338.05);
        const medium = mode === 'chamber';
        const signature = mode === 'afterimage' || mode === 'stage';
        let next;
        if (signature) {
            // Return to a recognizable composition after the original detail inserts.
            const detail = isOne ? (mode === 'stage'
                ? [125, 177.876, 253, 310.35, 375.05, 399.05, 438.9]
                : [310.35, 375.05, 399.05, 438.9]).includes(t) : [119.25, 238.15].includes(t);
            next = detail ? pose(t, [4.5, 3.8, 6.8], HEAD, 36)
                : pose(t, isOne ? [-4.4, 2.6, 11] : [-5.8, 2.4, 11], CENTER, 40);
            if (isOne && mode === 'stage') {
                next = track1StageInsert(t) || next;
            }
        } else if (medium) {
            const detail = isOne ? [125, 253, 310.35, 375.05, 399.05, 438.9].includes(t) : [119.25, 238.15].includes(t);
            next = detail ? pose(t, [5.2, 3.6, 8.5], [0.96, 3.5, -0.04], 38)
                : pose(t, isOne ? [-6, 2.3, 15] : [-7, 2.1, 14], CENTER, 42);
        } else {
            const detail = isOne ? [125, 177.876, 253, 310.35, 375.05, 399.05].includes(t)
                : [119.25, 187, 238.15, 317.6].includes(t);
            next = detail ? pose(t, [4.7, 3.4, 6.4], HEAD, 44)
                : pose(t, [-3.8, 2.2, 10], end ? PALM : CENTER, 42);
        }
        // Track 4's terminal fixture must remain inside the frame.
        if (!isOne && end) {
            next = pose(t, [-5.8, 2.4, 11], [0.4, 3.0, -0.04], 44);
        }
        if (!isOne && mode === 'stage' && ![119.25, 238.15].includes(t)) {
            next = pose(t, [-5.8, 3, 14], [-0.3, 2, -0.04], 43);
        }
        return next;
    });
    // The older comparisons keep their fixed opening. Stage keeps the authored
    // opening progression; only the explicit hold option freezes the full film.
    if (isOne) {
        const first = score[0];
        for (const cue of score.filter((entry) => mode !== 'stage' && entry.atSeconds < 125)) {
            cue.position = [...first.position]; cue.target = [...first.target]; cue.fov = first.fov;
        }
        // The former 32s top shot becomes a short detail then a readable palm.
        score.push(pose(189.8, [-4.2, 2.2, mode === 'chamber' ? 12 : 8.5], PALM, 42));
    }
    score.sort((a, b) => a.atSeconds - b.atSeconds);
    return { ...camera, score, basePosition: score[0].position, target: score[0].target, baseFov: score[0].fov };
}

export function createProposalCamera(camera, slug, mode, hold = false) {
    if (!mode) {
        return camera;
    }
    if (slug !== 'nao-querer-nada') {
        const result = createSecondsCamera(camera, slug, mode);
        if (mode === 'stage' && slug === 'sonoite' && hold) {
            result.score = [result.score[0]];
        }
        return result;
    }
    const setups = { ...camera.setups };
    const cutTimeline = { ...camera.cutTimeline };
    const wideDistance = mode === 'chamber' ? 23 : 17;
    const surfaceDistance = { intimate: 10.8, chamber: 15.5, afterimage: 17, stage: 12.5 };
    const continuation = { intimate: 'proposal_trace', chamber: 'proposal_room', afterimage: 'proposal_return', stage: 'proposal_return' };
    for (const [id, setup] of Object.entries(setups)) {
        if (id === 'mcu_tar_frontier') {
            continue;
        }
        const wide = id.startsWith('ws_');
        setups[id] = { ...setup, localMotion: 0, orbitPerBar: 0, dollyPerBar: 0,
            targetPoint: wide ? CENTER : setup.targetPoint,
            distance: wide ? wideDistance : Math.max(setup.distance, 6.8),
            fov: wide ? 36 : Math.max(setup.fov, 42),
            pitch: wide ? 0.04 : setup.pitch, pitchLock: true };
        if (wide && Math.abs(setup.yaw) > 2) {
            setups[id].yaw = -0.8;
        }
        if (mode === 'intimate' && !wide) {
            setups[id].distance = 9;
            setups[id].targetPoint = id.startsWith('ecu_') ? HEAD : PALM;
            setups[id].fov = 44;
        }
        if ((mode === 'afterimage' || mode === 'stage') && !id.startsWith('ecu_')) {
            setups[id].distance = 17;
            setups[id].targetPoint = CENTER;
            setups[id].yaw = -0.7;
            setups[id].fov = 36;
        }
    }
    const detail = { ...setups.mcu_residue_right, targetPoint: [0.96, 2.7, -0.04],
        distance: surfaceDistance[mode],
        fov: mode === 'intimate' ? 42 : 36, pitch: 0.04, pitchLock: true,
        yaw: mode === 'chamber' ? 0.65 : -0.6 };
    setups.proposal_surface = detail;
    setups.proposal_trace = { ...detail, targetPoint: PALM, distance: 12, yaw: 1.1 };
    setups.proposal_room = { ...setups.ws_right_arch, targetPoint: CENTER,
        distance: 23, yaw: -0.55, fov: 36, screenX: -0.12 };
    setups.proposal_return = { ...detail, targetPoint: CENTER, distance: 17, yaw: -0.7, fov: 36 };
    if (mode === 'stage') {
        // A lower target admits the floor consequence without stranding the relic.
        setups.proposal_return = { ...detail, targetPoint: [0.96, 1.15, -0.04],
            distance: 17.5, yaw: -0.65, pitch: 0.12, pitchLock: true, fov: 39 };
    }
    // Both listening candidates get a readable uninterrupted shot and recovery.
    cutTimeline[90] = 'proposal_surface';
    delete cutTimeline[94];
    // The accepted 149–164 frontier stays byte-identical in every proposal.
    cutTimeline[165] = continuation[mode];
    cutTimeline[204] = mode === 'afterimage' || mode === 'stage' ? 'proposal_return' : 'proposal_trace';
    cutTimeline[213] = cutTimeline[204];
    if (mode === 'afterimage' || mode === 'stage') {
        for (const bar of [1, 43, 83, 128, 179]) {
            cutTimeline[bar] = 'proposal_return';
        }
    }
    if (mode === 'intimate') {
        for (const bar of [17, 43, 83, 128]) {
            cutTimeline[bar] = 'proposal_surface';
        }
    }
    return { ...camera, setups, cutTimeline };
}

// Absolute recording-time envelopes: no frame-history integration or beat flashing.
export function sampleProposalLight(mode, slug, elapsed, started = true) {
    if (mode === 'stage') {
        return sampleStageLight(slug, elapsed, started);
    }
    const room = mode === 'chamber';
    const memory = mode === 'afterimage';
    const isOne = slug === 'sonoite';
    const sodium = slug === 'horas-mortas';
    const t = Math.max(0, elapsed);
    const emergence = isOne ? ramp(36, 85, t) : ramp(0, 16, t);
    const development = isOne ? ramp(125, 384, t) : ramp(96, 337, t);
    const end = isOne ? 1 - ramp(528, 535, t) : 1 - ramp(548, 563.5, t);
    const collapse = isOne ? 1 - 0.65 * ramp(488.5, 500, t) : 1 - 0.4 * ramp(510, 540, t);
    const level = sodium ? sampleSodiumLightLevel(t) : emergence * end * collapse;
    const strength = started ? level : 0;
    // Afterimage opens one side over the track and keeps that state until withdrawal.
    let x = room ? -8 : -4.5;
    if (memory && isOne) {
        x = -7 + development * 11;
    }
    let keyPosition = [x, 5.2, 4.5];
    let key = room ? 44 : 32;
    let color = '#cbd4df';
    let wall = room ? 210 : 18;
    let fog = room ? 0.013 : 0.006;
    if (memory) {
        wall = 75 * development; fog = 0.009 + development * 0.004; 
    }
    if (isOne) {
        color = '#e2e3e4'; key = room ? 65 : 48;
        if (t < 125) {
            key = 20; keyPosition = [-6.5, 4.2, 2]; wall = 0; 
        }
    }
    if (sodium) {
        keyPosition = [-6.5, 5.6, 3]; key = room ? 85 : 110;
        color = '#ffad42'; wall = room ? 65 : 0; fog = 0;
    }
    return {
        keyPosition,
        keyTarget: [0.96, 2.5, -0.04],
        key: strength * key,
        rim: sodium ? 0 : strength * (room ? 0.7 : 0.45),
        back: sodium ? 0 : strength * 0.14,
        color,
        wall: strength * wall,
        floor: room ? 0.34 : 0.2,
        fog,
        angle: room ? 0.9 : 0.72,
        penumbra: room ? 0.8 : 0.62
    };
}

function sampleStageLight(slug, elapsed, started) {
    const t = Math.max(0, elapsed);
    const on = started ? 1 : 0;
    const light = sampleProposalLight('afterimage', slug, t, started);
    if (slug === 'sonoite') {
        const wallArrival = ramp(125, 230, t);
        // The wall survives the key's collapse, then both finish at the authored snap.
        light.wall = on * 170 * wallArrival * (1 - ramp(528, 535, t));
        light.floor = 0.3;
        light.fog = 0.01;
        light.penumbra = 0.68;
        light.key *= 1 - 0.45 * ramp(500, 527, t);
    } else if (slug === 'horas-mortas') {
        const level = on * sampleSodiumLightLevel(t);
        light.keyPosition = [-3.15, 5.515, 3];
        light.key = 85 * level;
        light.wall = 50 * level;
        light.floor = 0.4;
        light.angle = 1.05;
        light.penumbra = 0.7;
    } else {
        const arrival = ramp(0, 16, t);
        const exit = 1 - ramp(548, 563.5, t);
        light.wall = on * 145 * arrival * exit;
        light.key *= 0.8;
        light.floor = 0.4;
        light.fog = 0.01;
        light.residue = on * mutationAmountAt(t);
        // A broad physical emitter returns a wet highlight; no bloom/opacity decal.
        light.softbox = on * arrival * (1 + 6 * mutationAmountAt(t))
            * (1 - ramp(555, 563.5, t));
    }
    return light;
}
