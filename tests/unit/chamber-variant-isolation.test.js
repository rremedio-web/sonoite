import { CHAMBER_VARIANTS } from '../../src/js/prototype/experience.js';

/**
 * Mirrors setupChamberPracticals gate in experience.js — only sonoite-cinema builds candles.
 *
 * @param {string} variantKey Chamber variant key.
 * @return {boolean} Whether practical meshes should be constructed.
 */
function variantConstructsPracticals(variantKey) {
    return variantKey === 'sonoite-cinema';
}

function lightingScoreIsZeroed(score) {
    return Array.isArray(score)
        && score.length > 0
        && score.every((step) =>
            step.keyWeight === 0
            && step.rimWeight === 0
            && step.fillWeight === 0
            && step.backWeight === 0
        );
}

describe('chamber variant isolation — doctrine-critical deepMerge overrides', () => {
    const track5 = CHAMBER_VARIANTS['track5-cinema'];
    const sonoite = CHAMBER_VARIANTS['sonoite-cinema'];
    const horas = CHAMBER_VARIANTS['horas-mortas-cinema'];

    it('track5-cinema baseline enables living bokeh and nao-querer-nada timeline slug', () => {
        expect(track5.timelineTrackSlugs).toEqual(['nao-querer-nada']);
        expect(track5.chamber.living.enabled).toBe(true);
        expect(track5.chamber.living.bokeh.count).toBe(12);
        expect(lightingScoreIsZeroed(track5.timeline?.lighting?.score)).toBe(false);
    });

    it('sonoite-cinema kills bokeh and owns sonoite timeline slug', () => {
        expect(sonoite.timelineTrackSlugs).toEqual(['sonoite']);
        expect(sonoite.chamber.living.bokeh.count).toBe(0);
        expect(sonoite.chamber.living.bokeh.opacityMax).toBe(0);
        expect(sonoite.timelineTrackSlugs).not.toEqual(track5.timelineTrackSlugs);
        expect(sonoite.chamber.living.bokeh.count).not.toBe(track5.chamber.living.bokeh.count);
    });

    it('horas-mortas-cinema disables living, zeroes chamber lighting bases, and sodium-only film score', () => {
        expect(horas.timelineTrackSlugs).toEqual(['horas-mortas']);
        expect(horas.chamber.living.enabled).toBe(false);
        expect(horas.chamber.lighting).toMatchObject({
            keyBase: 0,
            rimBase: 0,
            backBase: 0,
            fillBase: 0
        });
        expect(lightingScoreIsZeroed(horas.timeline.lighting.score)).toBe(true);
        expect(horas.chamber.living.enabled).not.toBe(track5.chamber.living.enabled);
        expect(horas.chamber.lighting.keyBase).not.toBe(track5.chamber.lighting.keyBase);
    });

    it('horas-mortas-cinema does not construct practicals (sonoite-cinema only)', () => {
        expect(variantConstructsPracticals('sonoite-cinema')).toBe(true);
        expect(variantConstructsPracticals('horas-mortas-cinema')).toBe(false);
        expect(variantConstructsPracticals('track5-cinema')).toBe(false);
    });

    it('track5 and sonoite grade phases omit contrastPivot (shader default 0.5 = bit-identical)', () => {
        const assertDefaultPivot = (variant) => {
            const phases = variant.chamber?.post?.gradePhases;
            expect(phases).toBeDefined();
            Object.values(phases).forEach((phase) => {
                expect(phase.contrastPivot).toBeUndefined();
            });
        };
        assertDefaultPivot(track5);
        assertDefaultPivot(sonoite);
    });

    it('horas-mortas-cinema authors per-phase contrastPivot for low-luminance print', () => {
        const phases = horas.chamber.post.gradePhases;
        expect(phases.DEAD_HOURS.contrastPivot).toBe(0.10);
        expect(phases.WAKING.contrastPivot).toBe(0.12);
        expect(phases.BURN.contrastPivot).toBe(0.22);
        expect(phases.FADE.contrastPivot).toBe(0.12);
        expect(phases.AFTER.contrastPivot).toBe(0.10);
        expect(phases.TERMINAL.contrastPivot).toBe(0.06);
    });

    it('horas-mortas-cinema gates contrast-then-lift grade order and warm lift floors (v5)', () => {
        expect(horas.chamber.post.gradeLiftAfterContrast).toBe(true);
        expect(track5.chamber.post.gradeLiftAfterContrast).toBeUndefined();
        expect(sonoite.chamber.post.gradeLiftAfterContrast).toBeUndefined();
        expect(horas.chamber.post.gradePhases.DEAD_HOURS.lift).toEqual([0.0040, 0.0024, 0.0010]);
        expect(horas.chamber.post.gradePhases.WAKING.lift).toEqual([0.0040, 0.0024, 0.0010]);
        expect(horas.chamber.post.gradePhases.FADE.lift).toEqual([0.0040, 0.0024, 0.0010]);
        expect(horas.chamber.post.gradePhases.AFTER.lift).toEqual([0.0040, 0.0024, 0.0010]);
        expect(horas.chamber.post.gradePhases.BURN.lift).toEqual([0, 0, 0]);
        expect(horas.chamber.post.gradePhases.TERMINAL.lift).toEqual([0, 0, 0]);
        expect(horas.hero.envMapIntensity).toBeCloseTo(0.14, 2);
        expect(horas.chamber.environmentIntensity).toBeCloseTo(0.05, 2);
    });

    it('track5 and sonoite keep legacy lift-before-contrast grade path', () => {
        [track5, sonoite].forEach((variant) => {
            expect(variant.chamber.post?.gradeLiftAfterContrast).toBeUndefined();
        });
    });
});
