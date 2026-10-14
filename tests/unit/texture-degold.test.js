import {
    DEFAULT_DEGOLD_OPTIONS,
    degoldRgbBuffer,
    hslToRgb,
    rgbToHsl
} from '../../scripts/lib/texture-degold.mjs';

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} [width]
 * @param {number} [height]
 * @return {Uint8Array}
 */
function makeSolidBuffer(r, g, b, width = 1, height = 1) {
    const buffer = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i += 1) {
        const idx = i * 3;
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
    }
    return buffer;
}

/**
 * @param {Uint8Array} buffer
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @return {[number, number, number]}
 */
function pixelAt(buffer, x, y, width) {
    const idx = (y * width + x) * 3;
    return [buffer[idx], buffer[idx + 1], buffer[idx + 2]];
}

describe('texture-degold pure transforms', () => {
    it('round-trips RGB through HSL with acceptable accuracy', () => {
        const samples = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [128, 128, 128],
            [210, 180, 60],
            [245, 245, 250]
        ];

        samples.forEach(([r, g, b]) => {
            const hsl = rgbToHsl(r, g, b);
            const [rr, gg, bb] = hslToRgb(hsl.h, hsl.s, hsl.l);
            expect(Math.abs(rr - r)).toBeLessThanOrEqual(1);
            expect(Math.abs(gg - g)).toBeLessThanOrEqual(1);
            expect(Math.abs(bb - b)).toBeLessThanOrEqual(1);
        });
    });

    it('desaturates a yellow pixel while preserving lightness', () => {
        const buffer = makeSolidBuffer(220, 190, 40);
        const before = rgbToHsl(220, 190, 40);
        const stats = degoldRgbBuffer(buffer, 1, 1, { ...DEFAULT_DEGOLD_OPTIONS, despeckle: false });
        const after = rgbToHsl(buffer[0], buffer[1], buffer[2]);

        expect(after.s).toBeLessThan(before.s);
        expect(Math.abs(after.l - before.l)).toBeLessThanOrEqual(0.02);
        expect(stats.desaturatedPixels).toBe(1);
    });

    it('leaves neutral grey pixels unchanged', () => {
        const buffer = makeSolidBuffer(180, 180, 180);
        const before = Uint8Array.from(buffer);
        const stats = degoldRgbBuffer(buffer, 1, 1, { ...DEFAULT_DEGOLD_OPTIONS, despeckle: false });

        expect(Array.from(buffer)).toEqual(Array.from(before));
        expect(stats.desaturatedPixels).toBe(0);
    });

    it('leaves blue/cyan pixels outside the yellow band unchanged', () => {
        const buffer = makeSolidBuffer(40, 120, 220);
        const before = Uint8Array.from(buffer);
        const stats = degoldRgbBuffer(buffer, 1, 1, { ...DEFAULT_DEGOLD_OPTIONS, despeckle: false });

        expect(Array.from(buffer)).toEqual(Array.from(before));
        expect(stats.desaturatedPixels).toBe(0);
    });

    it('applies partial desaturation in the feathered band edges', () => {
        const edgeHue = DEFAULT_DEGOLD_OPTIONS.hueMin - DEFAULT_DEGOLD_OPTIONS.hueFeather / 2;
        const [r, g, b] = hslToRgb(edgeHue, 0.8, 0.5);
        const buffer = makeSolidBuffer(r, g, b);
        const before = rgbToHsl(r, g, b);

        degoldRgbBuffer(buffer, 1, 1, { ...DEFAULT_DEGOLD_OPTIONS, despeckle: false });
        const after = rgbToHsl(buffer[0], buffer[1], buffer[2]);

        expect(after.s).toBeLessThan(before.s);
        expect(after.s).toBeGreaterThan(before.s * (1 - DEFAULT_DEGOLD_OPTIONS.strength));
    });

    it('handles hue wraparound without crashing and feathers a wrapped band edge', () => {
        const wrappedOptions = {
            ...DEFAULT_DEGOLD_OPTIONS,
            hueMin: 350,
            hueMax: 20,
            hueFeather: 12,
            despeckle: false,
            strength: 1
        };

        const core = makeSolidBuffer(...hslToRgb(10, 0.75, 0.55));
        expect(() => degoldRgbBuffer(core, 1, 1, wrappedOptions)).not.toThrow();
        expect(rgbToHsl(core[0], core[1], core[2]).s).toBeLessThan(0.75);

        const edge = makeSolidBuffer(...hslToRgb(25, 0.75, 0.55));
        const edgeBefore = rgbToHsl(edge[0], edge[1], edge[2]);
        degoldRgbBuffer(edge, 1, 1, wrappedOptions);
        const edgeAfter = rgbToHsl(edge[0], edge[1], edge[2]);
        expect(edgeAfter.s).toBeLessThan(edgeBefore.s);
        expect(edgeAfter.s).toBeGreaterThan(0);
    });

    it('replaces dark speckle pixels but preserves bright highlight pixels', () => {
        const width = 5;
        const height = 5;
        const buffer = makeSolidBuffer(240, 240, 240, width, height);

        const speckleX = 2;
        const speckleY = 2;
        const highlightX = 1;
        const highlightY = 1;
        const speckleIdx = (speckleY * width + speckleX) * 3;
        const highlightIdx = (highlightY * width + highlightX) * 3;

        buffer[speckleIdx] = 10;
        buffer[speckleIdx + 1] = 10;
        buffer[speckleIdx + 2] = 10;

        buffer[highlightIdx] = 255;
        buffer[highlightIdx + 1] = 255;
        buffer[highlightIdx + 2] = 255;

        const stats = degoldRgbBuffer(buffer, width, height, {
            ...DEFAULT_DEGOLD_OPTIONS,
            despeckle: true,
            speckleWindow: 3,
            speckleLumaDrop: 0.35,
            strength: 0
        });

        const speckleAfter = pixelAt(buffer, speckleX, speckleY, width);
        const highlightAfter = pixelAt(buffer, highlightX, highlightY, width);

        expect(speckleAfter).toEqual([240, 240, 240]);
        expect(highlightAfter).toEqual([255, 255, 255]);
        expect(stats.despeckledPixels).toBeGreaterThan(0);
    });
});
