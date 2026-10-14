import fs from 'fs';
import path from 'path';

const FUNCTIONS_PATH = path.join(process.cwd(), 'functions.php');

describe('WordPress prototype routing', () => {
    let source;

    beforeAll(() => {
        source = fs.readFileSync(FUNCTIONS_PATH, 'utf8');
    });

    it('serves the prototype template on the front page without ?prototype=1', () => {
        const fnBlock = source.match(/function sonoite_is_prototype_request\(\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
        expect(fnBlock).toMatch(/is_front_page\(\)/);
        expect(fnBlock).toMatch(/is_page_template\('page-prototype\.php'\)/);
        expect(fnBlock).toMatch(/sonoite_query_flag_enabled\('prototype'\)/);
    });

    it('keeps prototype bundle gating on sonoite_is_prototype_request()', () => {
        expect(source).toMatch(/\$is_prototype_page = sonoite_is_prototype_request\(\)/);
        expect(source).toMatch(/if \(\$manifest_key === 'src\/js\/prototype\/main\.js' && !\$is_prototype_page\)/);
    });
});
