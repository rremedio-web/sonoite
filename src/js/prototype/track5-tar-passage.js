// Track 5 physical-room camera cut, imported by experience.js. Opt-in via usesTarPassageCut(): Track 5
// `?scene=physical`, any T5 `?proposal=` or `?ledger=1`, never with `?recut=1`; `&passage=hold` keeps the
// original cut. Adds a low MCU on the tar frontier (mcu_tar_frontier) and cuts to it at bar 149; the tar
// score and all other cuts stay intact (the Track 5 ledger reuses the setup in its own cut plan).
// See docs/qa/TRACK5_TAR_PASSAGE_COMPARISON_2026-09-06.md.
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
