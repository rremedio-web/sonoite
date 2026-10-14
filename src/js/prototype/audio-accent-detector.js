/**
 * One-shot audio accent detector for the chamber's 5% punctuation layer (accentPulse in experience.js).
 * Fires on positive spectral flux in 40-1000 Hz, not an absolute bass-level crossing, above an adaptive
 * threshold (running mean + 1.5 mean absolute deviations), with a 0.35 s priming delay, 0.7 s refractory
 * and an energy floor. Fed from AudioManager's frequency callback (receiveAudioAnalysis()), so render FPS
 * never counts the same spectrum twice; seeks and gaps over 0.5 s re-prime it. The continuous analyser
 * channels are unaffected.
 */
export function createAudioAccentDetector() {
    let previous = null;
    let lastTime = null;
    let primedAt = 0;
    let lastFireAt = -Infinity;
    let mean = 0;
    let deviation = 0;
    let previousBinWidth = 0;

    function reset() {
        lastTime = null;
        lastFireAt = -Infinity;
        mean = 0;
        deviation = 0;
    }

    function update(frequency, time, sampleRate, fftSize) {
        if (!frequency?.length || !Number.isFinite(time)
            || !Number.isFinite(sampleRate) || sampleRate <= 0
            || !Number.isFinite(fftSize) || fftSize <= 0) {
            reset();
            return false;
        }
        const binWidth = sampleRate / fftSize;
        const first = Math.max(1, Math.ceil(40 / binWidth));
        const last = Math.min(frequency.length - 1, Math.floor(1000 / binWidth));
        if (last < first) {
            reset();
            return false;
        }
        const dt = lastTime === null ? 0 : time - lastTime;
        const needsPrime = lastTime === null || dt < 0 || dt > 0.5
            || previous?.length !== frequency.length || previousBinWidth !== binWidth;
        if (needsPrime) {
            previous = new Uint8Array(frequency);
            previousBinWidth = binWidth;
            reset();
            lastTime = time;
            primedAt = time;
            return false;
        }
        if (dt === 0) {
            return false;
        }

        let flux = 0;
        let energy = 0;
        for (let bin = first; bin <= last; bin += 1) {
            // eslint-disable-next-line security/detect-object-injection -- bounded numeric indices into Web Audio typed arrays
            flux += Math.max(0, frequency[bin] - previous[bin]);
            // eslint-disable-next-line security/detect-object-injection -- bounded numeric index into Web Audio typed array
            energy += frequency[bin];
        }
        const scale = 1 / ((last - first + 1) * 255);
        flux *= scale;
        energy *= scale;
        const threshold = Math.max(0.004, mean + 1.5 * deviation);
        const fire = time - primedAt >= 0.35 && time - lastFireAt >= 0.7
            && energy >= 0.035 && flux > threshold;

        // Compare with history before incorporating this sample into history.
        const blend = 1 - Math.exp(-dt / 1.5);
        deviation += (Math.abs(flux - mean) - deviation) * blend;
        mean += (flux - mean) * blend;
        previous.set(frequency);
        lastTime = time;
        if (fire) {
            lastFireAt = time;
        }
        return fire;
    }

    return { update, reset };
}
