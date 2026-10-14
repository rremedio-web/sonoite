import fs from 'fs';
import path from 'path';

const FUNCTIONS_PATH = path.join(process.cwd(), 'functions.php');
const THEME_SETUP_PATH = path.join(process.cwd(), 'inc/theme-setup.php');
const SINGLE_TRACK_PATH = path.join(process.cwd(), 'single-track.php');

describe('front-page ?track= routing', () => {
    let functionsSource;
    let themeSetupSource;
    let singleTrackSource;

    beforeAll(() => {
        functionsSource = fs.readFileSync(FUNCTIONS_PATH, 'utf8');
        themeSetupSource = fs.readFileSync(THEME_SETUP_PATH, 'utf8');
        singleTrackSource = fs.readFileSync(SINGLE_TRACK_PATH, 'utf8');
    });

    it('does not register track as the CPT public query_var', () => {
        expect(themeSetupSource).toMatch(/'query_var'\s*=>\s*'sonoite_track'/);
        expect(themeSetupSource).not.toMatch(/'query_var'\s*=>\s*'track'/);
    });

    it('whitelists track for front-page deep links', () => {
        expect(functionsSource).toMatch(/function sonoite_front_page_query_vars\(\)/);
        expect(functionsSource).toMatch(/'track'/);
        expect(functionsSource).toMatch(/add_filter\('query_vars', 'sonoite_register_front_page_query_vars'\)/);
    });

    it('skips canonical redirect when allowlisted query params are present', () => {
        expect(functionsSource).toMatch(/function sonoite_preserve_front_page_queries\(/);
        expect(functionsSource).toMatch(/add_filter\('redirect_canonical', 'sonoite_preserve_front_page_queries'\)/);
        expect(functionsSource).toMatch(/is_front_page\(\)/);
    });

    it('redirects pretty /track/{slug}/ URLs back to /?track={slug}', () => {
        expect(singleTrackSource).toMatch(/http_build_query\(array\('track' => \$slug\)/);
        expect(singleTrackSource).not.toMatch(/wp_redirect\(home_url\('\/'\)\)/);
    });
});
