/**
 * Pure pixel transforms for draining baked yellow/gold from albedo textures.
 * No I/O — safe to unit test in isolation.
 */

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {{ h: number, s: number, l: number }}
 */
export function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        if (max === rn) {
            h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
        } else if (max === gn) {
            h = ((bn - rn) / delta + 2) / 6;
        } else {
            h = ((rn - gn) / delta + 4) / 6;
        }
    }

    return { h: h * 360, s, l };
}

/**
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @return {[number, number, number]}
 */
export function hslToRgb(h, s, l) {
    const hue = (((h % 360) + 360) % 360) / 360;

    if (s === 0) {
        const grey = Math.round(l * 255);
        return [grey, grey, grey];
    }

    const hue2rgb = (p, q, t) => {
        let tt = t;
        if (tt < 0) {
            tt += 1;
        }
        if (tt > 1) {
            tt -= 1;
        }
        if (tt < 1 / 6) {
            return p + (q - p) * 6 * tt;
        }
        if (tt < 1 / 2) {
            return q;
        }
        if (tt < 2 / 3) {
            return p + (q - p) * (2 / 3 - tt) * 6;
        }
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const rn = hue2rgb(p, q, hue + 1 / 3);
    const gn = hue2rgb(p, q, hue);
    const bn = hue2rgb(p, q, hue - 1 / 3);

    return [Math.round(rn * 255), Math.round(gn * 255), Math.round(bn * 255)];
}

export const DEFAULT_DEGOLD_OPTIONS = {
    hueMin: 35,
    hueMax: 80,
    hueFeather: 12,
    strength: 0.85,
    satThreshold: 0.10,
    despeckle: true,
    speckleLumaDrop: 0.35,
    speckleWindow: 3
};

/**
 * @param {number} hue
 * @return {number}
 */
function normHue(hue) {
    return ((hue % 360) + 360) % 360;
}

/**
 * @param {number} hue
 * @param {number} hueMin
 * @param {number} hueMax
 * @return {boolean}
 */
function hueInCoreBand(hue, hueMin, hueMax) {
    const h = normHue(hue);
    const min = normHue(hueMin);
    const max = normHue(hueMax);

    if (min <= max) {
        return h >= min && h <= max;
    }

    return h >= min || h <= max;
}

/**
 * @param {number} from
 * @param {number} to
 * @return {number}
 */
function hueDistForward(from, to) {
    return (to - from + 360) % 360;
}

/**
 * @param {number} hue
 * @param {number} hueMin
 * @param {number} hueMax
 * @param {number} hueFeather
 * @return {number}
 */
function hueBandWeight(hue, hueMin, hueMax, hueFeather) {
    const h = normHue(hue);
    const min = normHue(hueMin);
    const max = normHue(hueMax);

    if (hueInCoreBand(h, min, max)) {
        return 1;
    }

    const distBeforeMin = hueDistForward(h, min);
    if (distBeforeMin > 0 && distBeforeMin <= hueFeather) {
        return distBeforeMin / hueFeather;
    }

    const distAfterMax = hueDistForward(max, h);
    if (distAfterMax > 0 && distAfterMax <= hueFeather) {
        return 1 - distAfterMax / hueFeather;
    }

    return 0;
}

/**
 * @param {Uint8Array} source
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {number} half
 * @return {{ r: number, g: number, b: number, l: number }[]}
 */
function collectNeighborhood(source, width, height, x, y, half) {
    const neighbors = [];

    for (let dy = -half; dy <= half; dy += 1) {
        for (let dx = -half; dx <= half; dx += 1) {
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (ny * width + nx) * 3;
            const r = source[idx];
            const g = source[idx + 1];
            const b = source[idx + 2];
            const { l } = rgbToHsl(r, g, b);
            neighbors.push({ r, g, b, l });
        }
    }

    neighbors.sort((a, b) => a.l - b.l);
    return neighbors;
}

/**
 * @param {Uint8Array} buffer
 * @param {number} width
 * @param {number} height
 * @param {{ speckleLumaDrop: number, speckleWindow: number }} options
 * @return {number}
 */
function despeckleBuffer(buffer, width, height, options) {
    const half = Math.floor(options.speckleWindow / 2);
    const source = new Uint8Array(buffer);
    let despeckledPixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const idx = (y * width + x) * 3;
            const { l: pixelL } = rgbToHsl(source[idx], source[idx + 1], source[idx + 2]);
            const neighbors = collectNeighborhood(source, width, height, x, y, half);
            const medianPixel = neighbors[Math.floor(neighbors.length / 2)];

            if (pixelL < medianPixel.l - options.speckleLumaDrop) {
                buffer[idx] = medianPixel.r;
                buffer[idx + 1] = medianPixel.g;
                buffer[idx + 2] = medianPixel.b;
                despeckledPixels += 1;
            }
        }
    }

    return despeckledPixels;
}

/**
 * @param {Uint8Array|Buffer} buffer
 * @param {number} width
 * @param {number} height
 * @param {Partial<typeof DEFAULT_DEGOLD_OPTIONS>} [options]
 * @return {{
 *   pixels: number,
 *   desaturatedPixels: number,
 *   despeckledPixels: number,
 *   meanBefore: [number, number, number],
 *   meanAfter: [number, number, number]
 * }}
 */
export function degoldRgbBuffer(buffer, width, height, options = {}) {
    const opts = { ...DEFAULT_DEGOLD_OPTIONS, ...options };
    const pixels = width * height;
    const rgb = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const meanBefore = [0, 0, 0];
    for (let i = 0; i < pixels; i += 1) {
        const idx = i * 3;
        meanBefore[0] += rgb[idx];
        meanBefore[1] += rgb[idx + 1];
        meanBefore[2] += rgb[idx + 2];
    }
    meanBefore[0] /= pixels;
    meanBefore[1] /= pixels;
    meanBefore[2] /= pixels;

    let despeckledPixels = 0;
    if (opts.despeckle) {
        despeckledPixels = despeckleBuffer(rgb, width, height, opts);
    }

    let desaturatedPixels = 0;
    for (let i = 0; i < pixels; i += 1) {
        const idx = i * 3;
        const { h, s, l } = rgbToHsl(rgb[idx], rgb[idx + 1], rgb[idx + 2]);
        let weight = hueBandWeight(h, opts.hueMin, opts.hueMax, opts.hueFeather);

        if (s <= opts.satThreshold) {
            weight = 0;
        }

        if (weight <= 0) {
            continue;
        }

        const newSaturation = s * (1 - opts.strength * weight);
        if (newSaturation < s) {
            desaturatedPixels += 1;
        }

        const [nr, ng, nb] = hslToRgb(h, newSaturation, l);
        rgb[idx] = nr;
        rgb[idx + 1] = ng;
        rgb[idx + 2] = nb;
    }

    const meanAfter = [0, 0, 0];
    for (let i = 0; i < pixels; i += 1) {
        const idx = i * 3;
        meanAfter[0] += rgb[idx];
        meanAfter[1] += rgb[idx + 1];
        meanAfter[2] += rgb[idx + 2];
    }
    meanAfter[0] /= pixels;
    meanAfter[1] /= pixels;
    meanAfter[2] /= pixels;

    return {
        pixels,
        desaturatedPixels,
        despeckledPixels,
        meanBefore,
        meanAfter
    };
}
