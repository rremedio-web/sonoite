import { injectPrototypeStyles } from '../../src/js/prototype/shell.js';

describe('prototype self-hosted fonts', () => {
    beforeEach(() => {
        window.sonoiteData = { themeUrl: 'http://example.test/theme' };
        injectPrototypeStyles();
    });

    afterEach(() => {
        document.getElementById('sonoite-prototype-styles')?.remove();
        delete window.sonoiteData;
    });

    it('injects @font-face rules for Cormorant Garamond and IBM Plex Mono', () => {
        const style = document.getElementById('sonoite-prototype-styles');
        expect(style).not.toBeNull();
        expect(style.textContent).toContain("@font-face");
        expect(style.textContent).toContain('Cormorant Garamond');
        expect(style.textContent).toContain('IBM Plex Mono');
        expect(style.textContent).toContain('font-display: swap');
        expect(style.textContent).toContain('/assets/fonts/cormorant-garamond-latin.woff2');
        expect(style.textContent).toContain('/assets/fonts/ibm-plex-mono-latin.woff2');
    });

    it('does not inject duplicate style blocks', () => {
        injectPrototypeStyles();
        expect(document.querySelectorAll('#sonoite-prototype-styles')).toHaveLength(1);
    });
});
