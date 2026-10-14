// Frame-fill measurement. The chamber's Priority-0 target — "frame goes from
// 15% to 40%+ visible" (docs/qa/UNIFIED_CREATIVE_DIRECTION_2026-03-11.md:375-381)
// — has been asserted since March 2026 and never once measured in a running
// frame, which is how it survived four months unbuilt. This reads the actual
// backbuffer and reports the same two thresholds Pass 1b used (lum>8, lum>25,
// docs/qa/perceivability/PASS1B_EVIDENCE_2026-07-04.md:23) so numbers are
// directly comparable across passes.
//
// Sampling reads the default framebuffer, so it MUST run in the same frame as
// the composer's draw, before the browser swaps buffers.
//
// Cost (measured 2026-07-20, 1200x688, balanced tier): readPixels stalls the
// pipeline for ~4.8ms median per sample against a 33ms budget at 30fps — about
// 1% average overhead at a 0.5s cadence, with a ~14% spike on sampling frames.
// Fine for a dev flag; never enable it during a taste judgment of motion.

const SAMPLE_INTERVAL_SECONDS = 0.5;
const PIXEL_STRIDE = 4; // every 4th pixel — ~16x cheaper, well within noise

export function createFillMeter({ renderer, root }) {
    let buffer = null;
    let bufferSize = 0;
    let lastSampleAt = -Infinity;
    let latest = { t: 0, lum8: 0, lum25: 0, mean: 0 };
    let inRenderFrame = false;
    let warnedOutOfBand = false;

    const readout = document.createElement('div');
    readout.className = 'prototype-fillmeter';
    readout.textContent = 'fill —';
    root.querySelector('.prototype-stage')?.appendChild(readout);

    function sample(t = 0) {
        const width = renderer.domElement.width;
        const height = renderer.domElement.height;
        const needed = width * height * 4;
        if (!needed) {
            return latest;
        }
        const context = renderer.getContext();
        if (bufferSize !== needed) {
            buffer = new Uint8Array(needed);
            bufferSize = needed;
        }

        context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, buffer);

        let counted = 0;
        let above8 = 0;
        let above25 = 0;
        let total = 0;
        const step = PIXEL_STRIDE * 4;
        const pixels = buffer;
        for (let i = 0; i < needed; i += step) {
            /* eslint-disable-next-line security/detect-object-injection -- typed-array scan over a fixed stride */
            const luminance = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
            if (luminance > 8) {
                above8 += 1;
            }
            if (luminance > 25) {
                above25 += 1;
            }
            total += luminance;
            counted += 1;
        }

        const measurement = {
            t: Number(t.toFixed(1)),
            lum8: Number(((above8 / counted) * 100).toFixed(1)),
            lum25: Number(((above25 / counted) * 100).toFixed(1)),
            mean: Number((total / counted).toFixed(2))
        };

        // Out-of-band calls (console, a probe script) read an already-swapped
        // backbuffer and measure all zeros. Return the reading so the caller can
        // see what happened, but never let it overwrite a valid in-loop result —
        // an earlier version did, and a probe that called sample() from the
        // console reported the API itself as broken.
        if (!inRenderFrame) {
            if (!warnedOutOfBand) {
                warnedOutOfBand = true;
                console.warn(
                    '[Prototype] fillMeter.sample() called outside the render frame: the backbuffer '
                    + 'has already been swapped, so this reads zeros. Use fillMeter.latest for the '
                    + 'last in-loop measurement (updated every 0.5s while ?fillmeter=1 is active).'
                );
            }
            return measurement;
        }

        latest = measurement;
        return latest;
    }

    function update(elapsed) {
        if (elapsed - lastSampleAt < SAMPLE_INTERVAL_SECONDS) {
            return latest;
        }
        lastSampleAt = elapsed;
        inRenderFrame = true;
        sample(elapsed);
        inRenderFrame = false;
        readout.textContent = `fill ${latest.lum8}% / ${latest.lum25}%  ·  mean ${latest.mean}`;
        return latest;
    }

    function dispose() {
        readout.remove();
        buffer = null;
        bufferSize = 0;
    }

    return {
        sample,
        update,
        dispose,
        get latest() {
            return latest;
        }
    };
}
