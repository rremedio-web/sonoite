/* eslint-disable security/detect-object-injection -- rig ids are authored keys from TRACK5_LIGHT_RIGS */
/**
 * Track 5 named light rigs, imported by experience.js. TRACK5_LIGHT_RIGS sets exposure plus key/rim/back/fill
 * per rig; the film's ShotDirector setups and the recut phrase-light table refer to rigs by id.
 * createLightRigResolver() places each rig relative to the subject and the current camera side, so a rig reads
 * the same from any shot. Also exports the authored god-ray (246-317 s, `godray` flag) and bokeh-arrival
 * (168-186 s) envelopes. Rigs apply when the `lightarc` film flag is on (default on the canonical Track 5 film).
 * "Build spec §N" below is the Track 5 recut build spec, which is not in this repo; its five owner choices
 * are restated in docs/superpowers/specs/2026-07-23-track5-recut-creative-layer-design.md.
 */

const DEG2RAD = Math.PI / 180;

// Warm-neutral rim/back tint for the recut P5 rigs (build spec §3 owner choice
// #5: warm-neutral keys, no cool/blue vocabulary on the recut path). R >= G >= B
// so it never reads cool.
const RECUT_WARM_NEUTRAL = '#f4ede3';

export const TRACK5_LIGHT_RIGS = {
    void_rim: {
        exposure: 0.52,
        key: { intensity: 0.0, azimuthDeg: 0, elevationDeg: 20, distance: 8 },
        rim: { intensity: 1.8 },
        back: { intensity: 0.6 },
        fill: { intensity: 0.0 }
    },
    cold_side: {
        exposure: 0.66,
        key: { intensity: 1.4, azimuthDeg: 90, elevationDeg: 12, distance: 7 },
        rim: { intensity: 0.8 },
        back: { intensity: 0.3 },
        fill: { intensity: 0.0 }
    },
    back_silhouette: {
        exposure: 0.72,
        key: { intensity: 0.0, azimuthDeg: 180, elevationDeg: 25, distance: 9 },
        rim: { intensity: 0.4, azimuthDeg: 168, elevationDeg: 8 },
        back: { intensity: 2.2, azimuthDeg: 180, elevationDeg: 22 },
        fill: { intensity: 0.0 }
    },
    hush: {
        exposure: 0.58,
        key: { intensity: 0.5, azimuthDeg: 30, elevationDeg: 45, distance: 8, penumbra: 0.7 },
        rim: { intensity: 0.3 },
        back: { intensity: 0.2 },
        fill: { intensity: 0.02 }
    },
    fracture: {
        exposure: 0.90,
        key: {
            intensity: 3.2,
            azimuthDeg: -35,
            elevationDeg: 18,
            distance: 6,
            angle: 0.30,
            penumbra: 0.35
        },
        rim: { intensity: 1.0 },
        back: { intensity: 0.5 },
        fill: { intensity: 0.0 }
    },
    room_reveal: {
        exposure: 1.10,
        key: { intensity: 1.8, azimuthDeg: 15, elevationDeg: 35, distance: 8 },
        rim: { intensity: 1.2 },
        back: { intensity: 1.4 },
        fill: { intensity: 0.06 }
    },
    pressure: {
        exposure: 0.70,
        key: { intensity: 2.0, azimuthDeg: -60, elevationDeg: 8, distance: 5.5, angle: 0.32 },
        rim: { intensity: 0.5 },
        back: { intensity: 0.3 },
        fill: { intensity: 0.0 }
    },
    aftershock: {
        exposure: 0.60,
        key: { intensity: 0.8, azimuthDeg: 120, elevationDeg: 20, distance: 8 },
        rim: { intensity: 0.6 },
        back: { intensity: 0.8 },
        fill: { intensity: 0.01 }
    },
    wet_specular: {
        exposure: 1.0,
        key: {
            intensity: 4.2,
            azimuthDeg: -20,
            elevationDeg: 10,
            distance: 3.8,
            angle: 0.22,
            penumbra: 0.25
        },
        rim: { intensity: 1.5, azimuthDeg: -88, elevationDeg: 5 },
        back: { intensity: 0.55, azimuthDeg: 175, elevationDeg: 14 },
        fill: { intensity: 0.0 }
    },
    extinction: {
        exposure: 0.45,
        exposureRamp: { startSeconds: 534, endSeconds: 564, endExposure: 0.05 },
        key: { intensity: 0.6, azimuthDeg: 10, elevationDeg: 30, distance: 9 },
        rim: { intensity: 0.4, azimuthDeg: 178, elevationDeg: 11 },
        back: { intensity: 0.5, azimuthDeg: 182, elevationDeg: 18 },
        fill: { intensity: 0.0 }
    },
    // --- Recut P5 rigs (build spec §6, owner §3 warm-neutral keys) -----------
    // Added for the ?recut=1 phrase-light score. Warm keys; warm-neutral rim/back
    // tint; no cool/blue vocabulary. Schema note: rim/back honor intensity, color,
    // azimuthDeg, elevationDeg only (they are directional — no per-channel
    // distance); fill honors intensity only (no color). None of these rigs author
    // rim/back distance or fill color, so no authored value is dropped.
    void_side_warm: {
        exposure: 0.60,
        key: {
            intensity: 1.15,
            color: '#ffd9b3',
            azimuthDeg: 70,
            elevationDeg: 14,
            distance: 8,
            angle: 0.38,
            penumbra: 0.5
        },
        rim: { intensity: 1.25, color: RECUT_WARM_NEUTRAL, azimuthDeg: -95, elevationDeg: 10 },
        back: { intensity: 0.45, color: RECUT_WARM_NEUTRAL, azimuthDeg: 178, elevationDeg: 16 },
        fill: { intensity: 0.0 }
    },
    pressure_top: {
        exposure: 0.74,
        key: {
            intensity: 2.4,
            color: '#ffe4c8',
            azimuthDeg: -15,
            elevationDeg: 62,
            distance: 7,
            angle: 0.30,
            penumbra: 0.35
        },
        rim: { intensity: 0.6, color: RECUT_WARM_NEUTRAL, azimuthDeg: 165, elevationDeg: 30 },
        back: { intensity: 0.35, color: RECUT_WARM_NEUTRAL, azimuthDeg: 180, elevationDeg: 24 },
        fill: { intensity: 0.0 }
    },
    // plateau_rim_pulse: on the recut path the rim base authored below is
    // SUPERSEDED per frame — by the continuous EMA(midNorm) follow
    // (recut-light-score plateauRimTarget, absolute [1.2, 2.0]) by default, or
    // by the committed/hysteretic stepper under ?rimmode=commit
    // (recut-plateau-commit.js). The 1.55 below only applies off-recut.
    plateau_rim_pulse: {
        exposure: 0.62,
        key: {
            intensity: 0.35,
            color: '#ffe8d5',
            azimuthDeg: 40,
            elevationDeg: 20,
            distance: 8.5
        },
        rim: { intensity: 1.55, color: RECUT_WARM_NEUTRAL, azimuthDeg: -85, elevationDeg: 8 },
        back: { intensity: 0.7, color: RECUT_WARM_NEUTRAL, azimuthDeg: 176, elevationDeg: 18 },
        fill: { intensity: 0.01 }
    },
    low_key_grazing: {
        exposure: 0.68,
        key: {
            intensity: 1.9,
            color: '#ffdcbc',
            azimuthDeg: -78,
            elevationDeg: 6,
            distance: 5.5,
            angle: 0.30,
            penumbra: 0.3
        },
        rim: { intensity: 0.5, color: RECUT_WARM_NEUTRAL, azimuthDeg: 96, elevationDeg: 12 },
        back: { intensity: 0.3, color: RECUT_WARM_NEUTRAL, azimuthDeg: 182, elevationDeg: 14 },
        fill: { intensity: 0.0 }
    }
};

function normalizeHorizontal(x, z, fallbackX, fallbackZ) {
    const len = Math.hypot(x, z);
    if (len < 1e-8) {
        const fl = Math.hypot(fallbackX, fallbackZ) || 1;
        return [fallbackX / fl, fallbackZ / fl];
    }
    return [x / len, z / len];
}

function rotateYDeg(refX, refZ, azimuthDeg) {
    const azRad = azimuthDeg * DEG2RAD;
    const cosA = Math.cos(azRad);
    const sinA = Math.sin(azRad);
    return [
        refX * cosA + refZ * sinA,
        -refX * sinA + refZ * cosA
    ];
}

function sphericalOffset(azimuthDeg, elevationDeg, distance, refHorizX, refHorizZ) {
    const [hx, hz] = rotateYDeg(refHorizX, refHorizZ, azimuthDeg);
    const elRad = elevationDeg * DEG2RAD;
    const horizScale = Math.cos(elRad) * distance;
    const y = Math.sin(elRad) * distance;
    return [hx * horizScale, y, hz * horizScale];
}

function resolveExposure(rig, elapsedSeconds) {
    const ramp = rig.exposureRamp;
    if (!ramp) {
        return rig.exposure;
    }
    const { startSeconds, endSeconds, endExposure } = ramp;
    if (elapsedSeconds <= startSeconds) {
        return rig.exposure;
    }
    if (elapsedSeconds >= endSeconds) {
        return endExposure;
    }
    const span = endSeconds - startSeconds;
    if (span <= 0) {
        return endExposure;
    }
    const t = (elapsedSeconds - startSeconds) / span;
    return rig.exposure + (endExposure - rig.exposure) * t;
}

function smoothstep01(t) {
    if (t <= 0) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return t * t * (3 - 2 * t);
}

export function godRayIntensityAt(elapsedSeconds) {
    const t = elapsedSeconds;
    if (t < 246 || t >= 317) {
        return 0;
    }
    if (t >= 268 && t <= 300) {
        return 1;
    }
    if (t < 268) {
        return smoothstep01((t - 246) / (268 - 246));
    }
    return smoothstep01((317 - t) / (317 - 300));
}

export function bokehArrivalAt(elapsedSeconds) {
    const t = elapsedSeconds;
    if (t < 168) {
        return 0.3;
    }
    if (t >= 186) {
        return 1;
    }
    return 0.3 + 0.7 * smoothstep01((t - 168) / (186 - 168));
}

function readCameraPosition(cameraPosition) {
    if (Array.isArray(cameraPosition)) {
        return [cameraPosition[0], cameraPosition[1], cameraPosition[2]];
    }
    return [cameraPosition.x, cameraPosition.y, cameraPosition.z];
}

function computeDirection(azimuthDeg, elevationDeg, refHorizX, refHorizZ) {
    const [ox, oy, oz] = sphericalOffset(azimuthDeg, elevationDeg, 1, refHorizX, refHorizZ);
    const len = Math.hypot(ox, oy, oz) || 1;
    return [ox / len, oy / len, oz / len];
}

export function createLightRigResolver({ rigs = TRACK5_LIGHT_RIGS, subjectPoint = [0, 0, 0] } = {}) {
    const subjectX = subjectPoint[0];
    const subjectY = subjectPoint[1];
    const subjectZ = subjectPoint[2];

    function computeCameraSideRef(cameraPosition) {
        const [camX, , camZ] = readCameraPosition(cameraPosition);
        const toCameraX = camX - subjectX;
        const toCameraZ = camZ - subjectZ;
        return normalizeHorizontal(toCameraX, toCameraZ, 0, 1);
    }

    return {
        has(rigId) {
            return Object.prototype.hasOwnProperty.call(rigs, rigId);
        },

        listIds() {
            return Object.keys(rigs);
        },

        exposureAt(rigId, elapsedSeconds) {
            const rig = rigs[rigId];
            if (!rig) {
                return 0;
            }
            return resolveExposure(rig, elapsedSeconds);
        },

        resolve(rigId, cameraPosition, elapsedSeconds, out) {
            const rig = rigs[rigId];
            if (!rig) {
                throw new Error(`Unknown light rig: ${rigId}`);
            }

            const [refX, refZ] = computeCameraSideRef(cameraPosition);
            const exposure = resolveExposure(rig, elapsedSeconds);

            out.rigId = rigId;
            out.exposure = exposure;

            const keyDef = rig.key;
            const [kx, ky, kz] = sphericalOffset(
                keyDef.azimuthDeg,
                keyDef.elevationDeg,
                keyDef.distance,
                refX,
                refZ
            );
            out.key.intensity = keyDef.intensity;
            out.key.color = keyDef.color ?? null;
            out.key.position[0] = subjectX + kx;
            out.key.position[1] = subjectY + ky;
            out.key.position[2] = subjectZ + kz;
            out.key.angle = keyDef.angle ?? null;
            out.key.penumbra = keyDef.penumbra ?? null;

            out.rim.intensity = rig.rim.intensity;
            out.rim.color = rig.rim.color ?? null;
            if (typeof rig.rim.azimuthDeg === 'number' && typeof rig.rim.elevationDeg === 'number') {
                out.rim.direction = computeDirection(
                    rig.rim.azimuthDeg,
                    rig.rim.elevationDeg,
                    refX,
                    refZ
                );
            } else {
                out.rim.direction = null;
            }

            out.back.intensity = rig.back.intensity;
            out.back.color = rig.back.color ?? null;
            if (typeof rig.back.azimuthDeg === 'number' && typeof rig.back.elevationDeg === 'number') {
                out.back.direction = computeDirection(
                    rig.back.azimuthDeg,
                    rig.back.elevationDeg,
                    refX,
                    refZ
                );
            } else {
                out.back.direction = null;
            }

            out.fill.intensity = rig.fill.intensity;

            return out;
        },

        createState() {
            return {
                rigId: '',
                exposure: 0,
                key: {
                    intensity: 0,
                    color: null,
                    position: [0, 0, 0],
                    angle: null,
                    penumbra: null
                },
                rim: {
                    intensity: 0,
                    color: null,
                    direction: null
                },
                back: {
                    intensity: 0,
                    color: null,
                    direction: null
                },
                fill: { intensity: 0 }
            };
        }
    };
}
