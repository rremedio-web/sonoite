// Accepted for the opt-in physical room. The tar score and all other cuts stay intact.
export function createTrack5TarPassageCamera(camera) {
    return {
        ...camera,
        setups: {
            ...camera.setups,
            mcu_tar_frontier: {
                ...camera.setups.mcu_residue_right,
                height: 'low',
                targetPoint: [0.959854, 0.65, -0.038787],
                pitch: 0.04,
                pitchLock: true,
                distance: 11.5
            }
        },
        cutTimeline: { ...camera.cutTimeline, 149: 'mcu_tar_frontier' }
    };
}
