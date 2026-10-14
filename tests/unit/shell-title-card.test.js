import { ReliquaryShell } from '../../src/js/prototype/shell.js';

describe('ReliquaryShell threshold title card', () => {
    let root;

    beforeEach(() => {
        window.sonoiteData = { themeUrl: 'http://example.test/theme' };
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => {
        root.remove();
        document.getElementById('sonoite-prototype-styles')?.remove();
        delete window.sonoiteData;
    });

    function mountCinemaShell(variantKey = 'track5-cinema', displayLabel = 'Não querer nada') {
        const shell = new ReliquaryShell(root, {});
        shell.setTrack(
            { title: 'Não querer nada', order: 5 },
            { meta: { track: 5 } },
            { key: variantKey, displayLabel, label: 'cinema version' }
        );
        return shell;
    }

    it('renders the centered threshold card at t=0 for track5-cinema', () => {
        const shell = mountCinemaShell();
        shell.updateTime(0, 564);

        const card = root.querySelector('[data-title-card]');
        const text = root.querySelector('[data-title-card-text]');
        const number = root.querySelector('[data-title-card-number]');
        expect(card).not.toBeNull();
        expect(card.classList.contains('is-threshold')).toBe(true);
        expect(text.textContent).toBe('Não querer nada');
        expect(number.textContent).toBe('Track 05');
        expect(card.style.display).not.toBe('none');
        expect(Number(card.style.opacity)).toBeCloseTo(1, 5);
    });

    it('renders the threshold card for other *-cinema variants', () => {
        const shell = mountCinemaShell('sonoite-cinema', 'Sonoite');
        shell.updateTime(0, 252);

        const text = root.querySelector('[data-title-card-text]');
        expect(text.textContent).toBe('Sonoite');
    });

    it('hides the card after the clear time and restores on seek-back', () => {
        const shell = mountCinemaShell();
        shell.hideIntro();
        const clearAt = ReliquaryShell.TITLE_CARD_CLEAR_SECONDS;
        const card = root.querySelector('[data-title-card]');

        shell.updateTime(clearAt + 0.5, 564);
        expect(card.style.display).toBe('none');

        shell.updateTime(12, 564);
        expect(card.style.display).toBe('flex');
        expect(Number(card.style.opacity)).toBeCloseTo(1, 5);
    });

    it('does not mount a title card for non-cinema variants', () => {
        const shell = new ReliquaryShell(root, {});
        shell.setTrack(
            { title: 'Não querer nada' },
            { meta: { track: 5 } },
            { key: 'hard-light', label: 'hard light' }
        );
        shell.updateTime(0, 564);
        expect(root.querySelector('[data-title-card]')).toBeNull();
    });

    it('suppresses in-film card behavior under recut but keeps the left title at t=0', () => {
        const shell = new ReliquaryShell(root, {});
        shell.setTitleCardSuppressed(true);
        shell.setTrack(
            { title: 'Não querer nada', order: 5 },
            { meta: { track: 5 } },
            { key: 'track5-cinema', displayLabel: 'Não querer nada', label: 'cinema' }
        );
        shell.hideIntro();
        shell.updateTime(0, 564);

        const card = root.querySelector('[data-title-card]');
        expect(card).not.toBeNull();
        expect(card.style.display).toBe('none');

        const leftTitle = root.querySelector('[data-title]');
        expect(leftTitle).not.toBeNull();
        expect(leftTitle.textContent).toBe('Não querer nada');
    });

    it('dismisses the threshold card when intro ends', () => {
        const shell = mountCinemaShell();
        const card = root.querySelector('[data-title-card]');

        shell.hideIntro();

        expect(card.classList.contains('is-threshold')).toBe(false);
        expect(Number(card.style.opacity)).toBeCloseTo(0, 5);
    });

    it('reveals the shell only after setTrack populates identity nodes', () => {
        const shell = new ReliquaryShell(root, {});
        expect(shell.shell.classList.contains('is-shell-ready')).toBe(false);
        expect(shell.title.textContent).toBe('');

        shell.setTrack(
            { title: 'Horas mortas', order: 4 },
            { meta: { track: 4 } },
            { key: 'horas-mortas-cinema', displayLabel: 'Horas mortas' }
        );

        expect(shell.shell.classList.contains('is-shell-ready')).toBe(true);
        expect(shell.title.textContent).toBe('Horas mortas');
    });
});
