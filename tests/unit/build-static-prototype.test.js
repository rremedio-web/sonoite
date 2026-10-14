import fs from 'fs';
import path from 'path';

const BUILD_SCRIPT = path.join(process.cwd(), 'scripts/build-static-prototype.mjs');
const BEATS_REL = 'public/assets/journeys/analysis/nao-querer-nada/beats.json';

describe('build-static-prototype exporter', () => {
    let script;

    beforeAll(() => {
        script = fs.readFileSync(BUILD_SCRIPT, 'utf8');
    });

    it('copies beats.json for all three static chamber tracks', () => {
        const beatsPaths = [
            'public/assets/journeys/analysis/sonoite/beats.json',
            'public/assets/journeys/analysis/horas-mortas/beats.json',
            BEATS_REL
        ];
        beatsPaths.forEach((rel) => {
            expect(fs.existsSync(path.join(process.cwd(), rel))).toBe(true);
            const escaped = rel.replace(/\//g, '\\/');
            expect(script).toMatch(new RegExp(`['"]${escaped}['"]`));
        });
    });

    it('emits an immediate first-paint loader bridge before modules boot', () => {
        expect(script).toMatch(/id="sonoite-static-loader"/);
        expect(script).toMatch(/window\.__sonoiteStaticLoader/);
        expect(script).toMatch(/prototype-first-paint-line/);
    });

    it('modulepreloads the manifest closure and preloads default entry journey/model data without audio', () => {
        expect(script).toMatch(/rel="modulepreload"/);
        expect(script).toMatch(/preloadModuleFiles/);
        expect(script).toMatch(/as="fetch" crossorigin>/);
        expect(script).toMatch(/sonoite\.json/);
        expect(script).toMatch(/DEFAULT_ENTRY_SLUG = 'sonoite'/);
        expect(script).not.toMatch(/rel="preload"[^>]+audio\//);
    });

    it('ships a three-track sonoiteData payload with globbed upload audio paths', () => {
        expect(script).toMatch(/STATIC_TRACKS/);
        expect(script).toMatch(/slug: 'sonoite'/);
        expect(script).toMatch(/slug: 'horas-mortas'/);
        expect(script).toMatch(/slug: 'nao-querer-nada'/);
        expect(script).toMatch(/resolveUploadMp3/);
        expect(script).toMatch(/audio\/01-sonoite\.mp3/);
        expect(script).toMatch(/audio\/04-horas-mortas\.mp3/);
        expect(script).toMatch(/audio\/05-nao-querer-nada\.mp3/);
    });

    it('sets conservative repeat-visit cache headers for audio', () => {
        expect(script).toMatch(/\/audio\/\*/);
        expect(script).toMatch(/max-age=604800/);
        expect(script).toMatch(/stale-while-revalidate=86400/);
    });

    it('ships Track5 relic GLBs including the cleaned textured variant', () => {
        const shippedModelsBlock = script.match(/const SHIPPED_MODELS = \[([\s\S]*?)\];/)?.[1] ?? '';
        expect(shippedModelsBlock).toMatch(/track5-relic-textured-clean\.glb/);
        expect(shippedModelsBlock).not.toMatch(/track5-relic-textured-optimized\.glb/);
        expect(shippedModelsBlock).toMatch(/\.\.\.Object\.values\(RELIC_FILES\)/);
        expect(script).toMatch(/track5-relic-blender-chamber-optimized\.glb/);
        expect(script).toMatch(/track5-relic-generated-optimized\.glb/);
    });

    it('preloads self-hosted Cormorant Garamond and IBM Plex Mono before modules boot', () => {
        expect(script).toMatch(/assets\/fonts\/cormorant-garamond-latin\.woff2/);
        expect(script).toMatch(/assets\/fonts\/ibm-plex-mono-latin\.woff2/);
        expect(script).toMatch(/copy\('assets\/fonts', 'assets\/fonts'\)/);
    });
});
