// Helper to convert time-keyed points (seconds) into waypoints/FOV keys
function fromTimedPoints(points, totalDuration) {
    const waypoints = points.map((point) => point.pos);
    const lookAt = points.map((point) => point.target);
    const fovKeyframes = points.map((point) => ({
        t: point.time / totalDuration,
        value: point.fov
    }));
    return { waypoints, lookAt, fovKeyframes, duration: totalDuration };
}

// Void sphere center is at Y=2 (src/js/visuals/structures/VoidSphere.js:447)
const VOID_CENTER = [0, 2, 0];

// Act 1: 0–96s – Reliquary hold
// The sculpture owns the opening. Camera only creeps enough to prove the space is alive.
export const ACT1 = {
    duration: 96,
    waypoints: [
        [1.0, 1.92, 9.2],
        [0.6, 1.88, 8.9],
        [0.0, 1.82, 8.5],
        [-0.6, 1.74, 8.0]
    ],
    fovKeyframes: [
        { t: 0.0, value: 50 },
        { t: 0.45, value: 49 },
        { t: 0.75, value: 48 },
        { t: 1.0, value: 48 }
    ]
};

// Act 2: 96–216s – Encroachment
// The void begins to claim the room, but the camera still behaves like a held witness.
export const ACT2 = {
    duration: 120,
    waypoints: [
        [-0.6, 1.74, 8.0],
        [-0.4, 1.62, 7.5],
        [0.0, 1.50, 7.0],
        [0.5, 1.36, 6.6],
        [0.8, 1.24, 6.2]
    ],
    fovKeyframes: [
        { t: 0.0, value: 48 },
        { t: 0.28, value: 47 },
        { t: 0.55, value: 46 },
        { t: 0.82, value: 45 },
        { t: 1.0, value: 45 }
    ]
};

// Act 3: 216–281s – Intimate Orbit (WANTING peak)
// Near-pass corkscrew: less "hero orbit", more "skimming the event horizon".
// Keep a drifting lookAt curve (past the void) for readability while the path becomes violent.
export const ACT3 = {
    duration: 65,
    waypoints: [
        [1.2, 1.7, 4.6],    // Start close (from ACT2 end)
        [5.0, 0.2, 2.2],    // Hard shear inward right
        [0.6, -1.1, 0.8],   // NEAR PASS - deeper plunge (victim)
        [-5.8, 0.5, 1.4],   // Whip left (tidal violence)
        [-2.2, 2.8, 5.2],   // Overshoot recovery
        [1.4, 1.4, 3.4]     // Re-engage pull (avoid clean orbit closure)
    ],
    // No fixed lookAt curve: rely on lookAhead for a more helpless “infall” read.
    fovKeyframes: [
        { t: 0.0, value: 56 },
        { t: 0.2, value: 48 },
        { t: 0.45, value: 38 },
        { t: 0.72, value: 50 },
        { t: 1.0, value: 58 }
    ]
};

// Act 3A: 216–238s (3:36–3:58) - controlled predatory entry
// Readability-first framing before the crush section.
export const ACT3_WANTING_ENTRY = {
    duration: 22,
    waypoints: [
        [1.0, 1.8, 4.6],
        [3.6, 0.9, 4.0],
        [-1.2, 0.3, 3.9],
        [-3.8, 2.0, 5.0]
    ],
    fovKeyframes: [
        { t: 0.0, value: 60 },
        { t: 0.32, value: 55 },
        { t: 0.70, value: 50 },
        { t: 1.0, value: 56 }
    ]
};

// Act 3B: 238–252s (3:58–4:12) - corridor crush
export const ACT3_WANTING_CRUSH = {
    duration: 14,
    waypoints: [
        [-1.8, 2.9, 5.6],
        [1.4, 1.1, 4.5],
        [0.3, -0.25, 3.75],
        [-2.6, 1.3, 4.6]
    ],
    fovKeyframes: [
        { t: 0.0, value: 56 },
        { t: 0.34, value: 50 },
        { t: 0.68, value: 45 },
        { t: 1.0, value: 53 }
    ]
};

// Act 3C: 252–268s (4:12–4:28) - predatory tilt
export const ACT3_WANTING_TILT = {
    duration: 16,
    waypoints: [
        [-2.4, 2.3, 5.0],
        [0.4, 0.1, 4.0],
        [3.8, 1.2, 4.8],
        [-1.8, 3.1, 6.0]
    ],
    fovKeyframes: [
        { t: 0.0, value: 54 },
        { t: 0.34, value: 48 },
        { t: 0.70, value: 44 },
        { t: 1.0, value: 56 }
    ]
};

// Act 3D: 268–281s (4:28–4:41) - release handoff bridge
export const ACT3_RELEASE_HANDOFF = {
    duration: 13,
    waypoints: [
        [-2.6, 3.3, 6.2],
        [-3.5, 2.4, 5.2],
        [-2.8, 1.3, 4.5],
        [-0.9, 1.5, 5.1],
        [-1.7, 2.5, 6.5],
        [-2.7, 3.1, 7.6]
    ],
    lookAt: [
        [-0.4, 2.3, 1.0],
        [-0.7, 2.0, 0.4],
        [-0.5, 1.7, -0.1],
        [-0.1, 1.8, 0.3],
        [-0.2, 2.1, 0.8],
        [0.0, 2.4, 1.2]
    ],
    fovKeyframes: [
        { t: 0.0, value: 58 },
        { t: 0.22, value: 54 },
        { t: 0.48, value: 50 },
        { t: 0.74, value: 52 },
        { t: 0.90, value: 58 },
        { t: 1.0, value: 62 }
    ]
};

// Act 4A: 281–332s (4:41–5:32) – False release
export const ACT4_RELEASE_DECAY_A = {
    duration: 51,
    waypoints: [
        [-2.6, 2.9, 6.8],
        [-1.2, 2.6, 6.2],
        [0.8, 2.4, 6.6],
        [2.4, 2.7, 7.4],
        [1.6, 3.0, 8.0]
    ],
    fovKeyframes: [
        { t: 0.0, value: 62 },
        { t: 0.45, value: 58 },
        { t: 1.0, value: 60 }
    ]
};

// Act 4B: 332–368s (5:32–6:08) – Sag and re-approach
export const ACT4_RELEASE_DECAY_B = {
    duration: 36,
    waypoints: [
        [1.6, 3.0, 8.0],
        [2.4, 2.5, 6.8],
        [0.8, 2.1, 5.9],
        [-1.6, 2.6, 6.6],
        [-0.2, 3.1, 7.8]
    ],
    fovKeyframes: [
        { t: 0.0, value: 60 },
        { t: 0.30, value: 54 },
        { t: 0.60, value: 58 },
        { t: 1.0, value: 56 }
    ]
};

// Act 4C: 368–406s (6:08–6:46) – Hollow mercy drift
export const ACT4_RELEASE_DECAY_C = {
    duration: 38,
    waypoints: [
        [-0.2, 3.1, 7.8],
        [1.8, 2.8, 7.2],
        [2.6, 2.5, 8.0],
        [0.9, 3.2, 9.1],
        [-0.8, 3.6, 9.8]
    ],
    fovKeyframes: [
        { t: 0.0, value: 58 },
        { t: 0.35, value: 63 },
        { t: 0.65, value: 57 },
        { t: 1.0, value: 64 }
    ]
};

// Backward-compatible alias used by existing moments.
export const ACT4 = ACT4_RELEASE_DECAY_A;

// Act 5: 432–564s (~132s) – Through the Void (ERASURE)
// Camera approaches, passes through center, emerges into nothing
const throughVoidTimed = [
    { time: 0,   pos: [-1.2, 3.1, 8.2],   target: VOID_CENTER,  fov: 66 },  // Continue from ACT4
    { time: 25,  pos: [0.5, 2.9, 7.0],    target: VOID_CENTER,  fov: 64 },  // Approach center
    { time: 50,  pos: [0.2, 2.6, 5.4],    target: VOID_CENTER,  fov: 60 },  // Draw closer
    { time: 70,  pos: [0.0, 2.3, 3.6],    target: VOID_CENTER,  fov: 56 },  // Event horizon skim
    { time: 85,  pos: [0.0, 2.1, 1.5],    target: [0, 2, -2],   fov: 58 },  // Near-pass without abandoning subject
    { time: 100, pos: [0.4, 2.2, 3.8],    target: VOID_CENTER,  fov: 60 },  // Re-center
    { time: 115, pos: [1.0, 2.4, 5.8],    target: VOID_CENTER,  fov: 63 },  // Controlled retreat
    { time: 132, pos: [1.7, 2.8, 7.1],    target: VOID_CENTER,  fov: 66 }   // End with subject still readable
];

export const ACT5_THROUGH = fromTimedPoints(throughVoidTimed, 132);

// Registry for journey actions
export const TRACK5_SPLINES = {
    ACT1,
    ACT2,
    ACT3,
    ACT3_WANTING_ENTRY,
    ACT3_WANTING_CRUSH,
    ACT3_WANTING_TILT,
    ACT3_RELEASE_HANDOFF,
    ACT4_RELEASE_DECAY_A,
    ACT4_RELEASE_DECAY_B,
    ACT4_RELEASE_DECAY_C,
    ACT4,
    ACT5_THROUGH
};

export default TRACK5_SPLINES;
