import fs from 'fs';
import path from 'path';
import {
    DEFAULT_ENTRY_TRACK_SLUG,
    DEFAULT_TRACK_SLUG,
    TRACK_DEFAULT_VARIANT,
    resolveDefaultChamberVariant,
    resolveEntryTrackSlug
} from '../../src/js/prototype/experience.js';

const EXPERIENCE_PATH = path.join(process.cwd(), 'src/js/prototype/experience.js');
const params = (search) => new URLSearchParams(search);

describe('prototype entry routing', () => {
    it('keeps Track5 module identity on DEFAULT_TRACK_SLUG', () => {
        expect(DEFAULT_TRACK_SLUG).toBe('nao-querer-nada');
        expect(DEFAULT_ENTRY_TRACK_SLUG).toBe('sonoite');
    });

    it('maps each chamber track slug to its cinema variant when ?variant is absent', () => {
        expect(TRACK_DEFAULT_VARIANT).toEqual({
            'sonoite': 'sonoite-cinema',
            'horas-mortas': 'horas-mortas-cinema',
            'nao-querer-nada': 'track5-cinema'
        });
        expect(resolveDefaultChamberVariant(params(''))).toBe('sonoite-cinema');
        expect(resolveDefaultChamberVariant(params('track=horas-mortas'))).toBe('horas-mortas-cinema');
        expect(resolveDefaultChamberVariant(params('track=nao-querer-nada'))).toBe('track5-cinema');
    });

    it('resolves entry track slug from ?track= with sonoite as the no-param default', () => {
        expect(resolveEntryTrackSlug(params(''))).toBe('sonoite');
        expect(resolveEntryTrackSlug(params('track=horas-mortas'))).toBe('horas-mortas');
        expect(resolveEntryTrackSlug(params('track=nao-querer-nada'))).toBe('nao-querer-nada');
    });

    it('resolveChamberVariant keeps explicit ?variant= ahead of per-track defaults', () => {
        const source = fs.readFileSync(EXPERIENCE_PATH, 'utf8');
        const block = source.match(/resolveChamberVariant\(\)\s*\{[\s\S]*?\n    \}/)?.[0] ?? '';
        expect(block).toMatch(/const explicitVariant = this\.urlParams\.get\('variant'\)/);
        expect(block).not.toMatch(/resolveDefaultChamberVariant\(this\.urlParams\)[\s\S]*explicitVariant/);
    });
});
