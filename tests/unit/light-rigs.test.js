/* eslint-disable security/detect-object-injection -- rig ids/channels are authored test constants, not user input */
import fs from 'fs';
import path from 'path';
import {
    TRACK5_LIGHT_RIGS,
    createLightRigResolver,
    godRayIntensityAt,
    bokehArrivalAt
} from '../../src/js/prototype/light-rigs.js';

function loadTrack5DirectorLightRigIds() {
    const experiencePath = path.join(process.cwd(), 'src/js/prototype/experience.js');
    const src = fs.readFileSync(experiencePath, 'utf8');
    const ids = new Set();
    const re = /lightRig:\s*'([^']+)'/g;
    let match = re.exec(src);
    while (match) {
        ids.add(match[1]);
        match = re.exec(src);
    }
    return [...ids];
}

describe('createLightRigResolver', () => {
    const subjectPoint = [0, 0, 0];
    const cameraOnPositiveZ = [0, 2, 12];

    it('lists all authored track rigs', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        expect(resolver.listIds()).toEqual(Object.keys(TRACK5_LIGHT_RIGS));
        expect(resolver.listIds()).toHaveLength(14);
    });

    it('resolves every lightRig id referenced in TRACK5 film director setups', () => {
        const directorIds = loadTrack5DirectorLightRigIds();
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();
        directorIds.forEach((rigId) => {
            expect(resolver.has(rigId)).toBe(true);
            expect(() => {
                resolver.resolve(rigId, cameraOnPositiveZ, 0, out);
            }).not.toThrow();
            expect(out.rigId).toBe(rigId);
            expect(typeof out.key.intensity).toBe('number');
        });
    });

    it('resolves aftershock even when not on the cut timeline', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();
        resolver.resolve('aftershock', cameraOnPositiveZ, 120, out);
        expect(out.rigId).toBe('aftershock');
        expect(out.exposure).toBeCloseTo(0.6, 5);
        expect(out.key.intensity).toBeCloseTo(0.8, 5);
    });

    it('reuses the out object identity across resolve calls', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();
        const keyPos = out.key.position;
        resolver.resolve('hush', cameraOnPositiveZ, 0, out);
        expect(out.key.position).toBe(keyPos);
        resolver.resolve('fracture', cameraOnPositiveZ, 0, out);
        expect(out.key.position).toBe(keyPos);
        expect(out.rigId).toBe('fracture');
    });

    describe('extinction exposure ramp', () => {
        let resolver;

        beforeEach(() => {
            resolver = createLightRigResolver({ subjectPoint });
        });

        it('holds base exposure before the ramp', () => {
            expect(resolver.exposureAt('extinction', 534)).toBeCloseTo(0.45, 5);
        });

        it('ramps mid extinction toward end exposure', () => {
            expect(resolver.exposureAt('extinction', 549)).toBeCloseTo(0.26, 1);
        });

        it('ends at endExposure', () => {
            expect(resolver.exposureAt('extinction', 564)).toBeCloseTo(0.05, 5);
        });
    });

    describe('azimuth relative to camera on +Z', () => {
        it('places az 90 on the subject left (+X) and az 180 behind (-Z)', () => {
            const resolver = createLightRigResolver({ subjectPoint: [0, 0, 0] });
            const out = resolver.createState();

            resolver.resolve('cold_side', cameraOnPositiveZ, 0, out);
            const leftKey = out.key.position;
            expect(leftKey[0]).toBeGreaterThan(0.5);
            expect(Math.abs(leftKey[2])).toBeLessThan(2);

            resolver.resolve('back_silhouette', cameraOnPositiveZ, 0, out);
            const behindKey = out.key.position;
            expect(behindKey[2]).toBeLessThan(-0.5);
        });
    });

    describe('authored rim/back direction (camera-relative rigs)', () => {
        it('back_silhouette, wet_specular, and extinction aim rim/back directionally', () => {
            const resolver = createLightRigResolver({ subjectPoint });
            const out = resolver.createState();
            ['back_silhouette', 'wet_specular', 'extinction'].forEach((rigId) => {
                resolver.resolve(rigId, cameraOnPositiveZ, 0, out);
                expect(out.rim.direction).not.toBeNull();
                expect(out.back.direction).not.toBeNull();
                expect(out.rim.direction).toHaveLength(3);
                expect(out.back.direction).toHaveLength(3);
            });
        });
    });

    it('exposureAt is pure and does not require resolve', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        expect(resolver.exposureAt('room_reveal', 0)).toBeCloseTo(1.1, 5);
        expect(resolver.exposureAt('missing', 0)).toBe(0);
    });
});

describe('recut P5 rigs (void_side_warm, pressure_top, plateau_rim_pulse, low_key_grazing)', () => {
    const subjectPoint = [0, 0, 0];
    const cameraOnPositiveZ = [0, 2, 12];
    const RECUT_RIGS = [
        'void_side_warm',
        'pressure_top',
        'plateau_rim_pulse',
        'low_key_grazing'
    ];

    function hexChannels(hex) {
        const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m) {
            throw new Error(`not a 6-digit hex color: ${hex}`);
        }
        return {
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16)
        };
    }

    function collectColors(rig) {
        const colors = [];
        ['key', 'rim', 'back'].forEach((channel) => {
            const color = rig[channel] && rig[channel].color;
            if (typeof color === 'string') {
                colors.push(color);
            }
        });
        return colors;
    }

    it('adds exactly the four warm-neutral recut rigs on top of the default set', () => {
        RECUT_RIGS.forEach((id) => {
            expect(TRACK5_LIGHT_RIGS[id]).toBeDefined();
        });
        // Existing default rigs untouched (sanity-check a representative subset).
        ['void_rim', 'cold_side', 'back_silhouette', 'wet_specular', 'extinction']
            .forEach((id) => {
                expect(TRACK5_LIGHT_RIGS[id]).toBeDefined();
            });
    });

    it('resolves and validates every recut rig without throwing', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();
        RECUT_RIGS.forEach((id) => {
            expect(resolver.has(id)).toBe(true);
            expect(() => resolver.resolve(id, cameraOnPositiveZ, 300, out)).not.toThrow();
            expect(out.rigId).toBe(id);
            expect(Number.isFinite(out.exposure)).toBe(true);
            expect(Number.isFinite(out.key.intensity)).toBe(true);
            expect(out.key.position).toHaveLength(3);
            out.key.position.forEach((v) => expect(Number.isFinite(v)).toBe(true));
        });
    });

    it('uses only warm-neutral colors — never a cool/blue cast (R >= B on every hex)', () => {
        RECUT_RIGS.forEach((id) => {
            const colors = collectColors(TRACK5_LIGHT_RIGS[id]);
            expect(colors.length).toBeGreaterThan(0);
            colors.forEach((hex) => {
                const { r, g, b } = hexChannels(hex);
                expect(r).toBeGreaterThanOrEqual(g);
                expect(g).toBeGreaterThanOrEqual(b);
                expect(r).toBeGreaterThan(b);
            });
        });
    });

    it('carries the authored warm key colors and exposures', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();

        resolver.resolve('void_side_warm', cameraOnPositiveZ, 0, out);
        expect(out.exposure).toBeCloseTo(0.60, 5);
        expect(out.key.intensity).toBeCloseTo(1.15, 5);
        expect(out.key.color).toBe('#ffd9b3');

        resolver.resolve('pressure_top', cameraOnPositiveZ, 0, out);
        expect(out.exposure).toBeCloseTo(0.74, 5);
        expect(out.key.intensity).toBeCloseTo(2.4, 5);
        expect(out.key.color).toBe('#ffe4c8');

        resolver.resolve('plateau_rim_pulse', cameraOnPositiveZ, 0, out);
        expect(out.exposure).toBeCloseTo(0.62, 5);
        expect(out.key.intensity).toBeCloseTo(0.35, 5);
        expect(out.key.color).toBe('#ffe8d5');

        resolver.resolve('low_key_grazing', cameraOnPositiveZ, 0, out);
        expect(out.exposure).toBeCloseTo(0.68, 5);
        expect(out.key.intensity).toBeCloseTo(1.9, 5);
        expect(out.key.color).toBe('#ffdcbc');
    });

    it('places pressure_top key high overhead and low_key_grazing key near the floor', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();

        resolver.resolve('pressure_top', cameraOnPositiveZ, 0, out);
        const topKeyY = out.key.position[1];

        resolver.resolve('low_key_grazing', cameraOnPositiveZ, 0, out);
        const grazeKeyY = out.key.position[1];

        expect(topKeyY).toBeGreaterThan(5);
        expect(grazeKeyY).toBeLessThan(1.5);
        expect(topKeyY).toBeGreaterThan(grazeKeyY);
    });

    it('makes plateau_rim_pulse rim-dominant and aims rim/back directionally on all four', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();

        resolver.resolve('plateau_rim_pulse', cameraOnPositiveZ, 0, out);
        expect(out.rim.intensity).toBeGreaterThan(out.key.intensity);
        expect(out.rim.intensity).toBeCloseTo(1.55, 5);
        expect(out.back.intensity).toBeCloseTo(0.7, 5);

        RECUT_RIGS.forEach((id) => {
            resolver.resolve(id, cameraOnPositiveZ, 0, out);
            expect(out.rim.direction).not.toBeNull();
            expect(out.back.direction).not.toBeNull();
            expect(out.rim.direction).toHaveLength(3);
            expect(out.back.direction).toHaveLength(3);
        });
    });

    it('keeps fill dark on the key-warm rigs (grazing/side/top fill 0)', () => {
        const resolver = createLightRigResolver({ subjectPoint });
        const out = resolver.createState();
        ['void_side_warm', 'pressure_top', 'low_key_grazing'].forEach((id) => {
            resolver.resolve(id, cameraOnPositiveZ, 0, out);
            expect(out.fill.intensity).toBe(0);
        });
    });
});

describe('godRayIntensityAt', () => {
    it('is zero before the window and after it ends', () => {
        expect(godRayIntensityAt(245.9)).toBe(0);
        expect(godRayIntensityAt(317)).toBe(0);
        expect(godRayIntensityAt(318)).toBe(0);
        expect(godRayIntensityAt(400)).toBe(0);
    });

    it('ramps to full hold across the peak plateau', () => {
        expect(godRayIntensityAt(268)).toBeCloseTo(1, 5);
        expect(godRayIntensityAt(285)).toBeCloseTo(1, 5);
        expect(godRayIntensityAt(300)).toBeCloseTo(1, 5);
    });

    it('increases strictly monotonically through the up-ramp', () => {
        const a = godRayIntensityAt(250);
        const b = godRayIntensityAt(257);
        const c = godRayIntensityAt(264);
        expect(a).toBeGreaterThan(0);
        expect(b).toBeGreaterThan(a);
        expect(c).toBeGreaterThan(b);
        expect(c).toBeLessThan(1);
    });

    it('decreases strictly monotonically through the fade-out', () => {
        const a = godRayIntensityAt(304);
        const b = godRayIntensityAt(310);
        const c = godRayIntensityAt(315);
        expect(a).toBeLessThan(1);
        expect(b).toBeLessThan(a);
        expect(c).toBeLessThan(b);
        expect(c).toBeGreaterThan(0);
    });
});

describe('bokehArrivalAt', () => {
    it('holds low visibility before the quiet-pressure arrival window', () => {
        expect(bokehArrivalAt(0)).toBeCloseTo(0.3, 5);
        expect(bokehArrivalAt(100)).toBeCloseTo(0.3, 5);
        expect(bokehArrivalAt(167.9)).toBeCloseTo(0.3, 5);
    });

    it('holds full visibility from the end of the ramp onward', () => {
        expect(bokehArrivalAt(186)).toBeCloseTo(1, 5);
        expect(bokehArrivalAt(300)).toBeCloseTo(1, 5);
        expect(bokehArrivalAt(564)).toBeCloseTo(1, 5);
    });

    it('smoothsteps up monotonically through 168–186', () => {
        expect(bokehArrivalAt(172)).toBeGreaterThan(bokehArrivalAt(168));
        expect(bokehArrivalAt(177)).toBeGreaterThan(bokehArrivalAt(172));
        expect(bokehArrivalAt(182)).toBeGreaterThan(bokehArrivalAt(177));
        expect(bokehArrivalAt(186)).toBeGreaterThan(bokehArrivalAt(182));
        const mid = bokehArrivalAt(177);
        expect(mid).toBeGreaterThan(0.3);
        expect(mid).toBeLessThan(1);
    });
});
