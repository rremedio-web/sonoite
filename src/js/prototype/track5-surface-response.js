// Selected from this recording's analysis/nao-querer-nada/peaks.json.
// Skip the weaker 239.05s peak: the WANTING passage needs space, not another pulse.
const SURFACE_CUES = [236.65, 245.65, 253.4];
// Listening-review candidates, kept separate from the measured energy-peak score.
const TWO_SURFACE_CUES = [245.65, 252.36];

/**
 * A small authored surface inflection, independent of live-onset cooldown/seek history.
 * @param {number} elapsed Track transport time in seconds.
 * @param {string} cueSet  'three', 'two' or the omission control 'none'.
 * @return {number}         Smooth 0–1 envelope, peaked at the selected recording accents.
 */
export function sampleTrack5SurfaceResponse(elapsed, cueSet = 'three') {
    if (cueSet === 'none' || !Number.isFinite(elapsed) || elapsed < 225 || elapsed >= 255) {
        return 0;
    }
    let response = 0;
    for (const peak of cueSet === 'two' ? TWO_SURFACE_CUES : SURFACE_CUES) {
        const distance = elapsed - peak;
        const progress = distance < 0 ? 1 + distance / 0.35 : 1 - distance / 1.25;
        const amount = Math.max(0, Math.min(1, progress));
        response = Math.max(response, amount * amount * (3 - 2 * amount));
    }
    return response;
}
