/* eslint-disable security/detect-object-injection -- setup ids are validated keys from authored camera configs */
/**
 * Track 5 `?recut=1` camera assembly, imported by experience.js. createTrack5RecutCameraConfig() wraps the
 * authored recut middle (TRACK5_RECUT_DIRECTOR_CAMERA) with six setups imported from the default film camera:
 * head cuts at bars 1/10/17 and tail cuts at bars 195/204/213, pitch-locked and exempt from the orbit budget,
 * so the recut opens and closes on the default film's framing. Only used on the canonical Track 5 film.
 */

const DEFAULT_IMPORTED_SETUP_IDS = [
    'ws_front_low',
    'mcu_left_eye',
    'ws_right_arch',
    'ecu_tar_reward',
    'ws_erasure',
    'ws_final_trace'
];

const DEFAULT_HEAD_CUTS = {
    1: 'ws_front_low',
    10: 'mcu_left_eye',
    17: 'ws_right_arch'
};

const DEFAULT_TAIL_CUTS = {
    195: 'ecu_tar_reward',
    204: 'ws_erasure',
    213: 'ws_final_trace'
};

function cloneTargetPoint(value) {
    return Array.isArray(value) ? [Number(value[0]), Number(value[1]), Number(value[2])] : value;
}

function cloneSetup(setup) {
    if (!setup || typeof setup !== 'object') {
        return setup;
    }
    const cloned = { ...setup };
    if (Array.isArray(setup.targetPoint)) {
        cloned.targetPoint = cloneTargetPoint(setup.targetPoint);
    }
    if (setup.motion && typeof setup.motion === 'object' && !Array.isArray(setup.motion)) {
        cloned.motion = { ...setup.motion };
    }
    return cloned;
}

function cloneDirector(director) {
    if (!director || typeof director !== 'object') {
        return director;
    }
    const cloned = { ...director };
    if (director.heightYByClass && typeof director.heightYByClass === 'object') {
        cloned.heightYByClass = { ...director.heightYByClass };
    }
    return cloned;
}

function requireSetup(setups, setupId, sourceLabel) {
    const setup = setups?.[setupId];
    if (!setup || typeof setup !== 'object') {
        throw new Error(
            `createTrack5RecutCameraConfig: missing setup "${setupId}" on ${sourceLabel}`
        );
    }
    return setup;
}

export function createTrack5RecutCameraConfig({ defaultCamera, recutCamera } = {}) {
    if (!defaultCamera || typeof defaultCamera !== 'object') {
        throw new Error('createTrack5RecutCameraConfig: defaultCamera is required');
    }
    if (!recutCamera || typeof recutCamera !== 'object') {
        throw new Error('createTrack5RecutCameraConfig: recutCamera is required');
    }
    if (!recutCamera.setups || typeof recutCamera.setups !== 'object') {
        throw new Error('createTrack5RecutCameraConfig: recutCamera.setups is required');
    }
    if (!recutCamera.cutTimeline || typeof recutCamera.cutTimeline !== 'object') {
        throw new Error('createTrack5RecutCameraConfig: recutCamera.cutTimeline is required');
    }

    const setups = {};
    Object.entries(recutCamera.setups).forEach(([setupId, setup]) => {
        setups[setupId] = cloneSetup(setup);
    });

    DEFAULT_IMPORTED_SETUP_IDS.forEach((setupId) => {
        const source = requireSetup(defaultCamera.setups, setupId, 'defaultCamera');
        setups[setupId] = {
            ...cloneSetup(source),
            pitchLock: true,
            orbitBudgetExempt: true
        };
    });

    const cutTimeline = {
        ...DEFAULT_HEAD_CUTS,
        ...Object.fromEntries(
            Object.entries(recutCamera.cutTimeline).map(([bar, setupId]) => [bar, setupId])
        ),
        ...DEFAULT_TAIL_CUTS
    };

    const accentCuts = Array.isArray(recutCamera.accentCuts)
        ? recutCamera.accentCuts.map((accent) => ({ ...accent }))
        : [];

    return {
        target: cloneTargetPoint(recutCamera.target),
        director: cloneDirector(recutCamera.director),
        setups,
        cutTimeline,
        accentCuts
    };
}

export {
    DEFAULT_IMPORTED_SETUP_IDS,
    DEFAULT_HEAD_CUTS,
    DEFAULT_TAIL_CUTS
};
