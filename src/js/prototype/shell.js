/**
 * Path B UI layer, imported by experience.js. ReliquaryShell builds all DOM inside the prototype root:
 * canvas and frame mask, title card and intro threshold, transport (play/pause, seek rail, volume),
 * auto-hiding chrome, the track index and the `?tweak=1` live-trim panel. injectPrototypeStyles() adds
 * all CSS as one style tag, carrying sonoiteData.cspNonce when present. BUILT_TRACK_CYCLE is the ordered
 * list of tracks with a chamber film (entry routing, index, next track). Status text renders only in debug
 * mode (`?debug=1` or sonoiteData.isDebug); window.__sonoiteStaticLoader is defined only by the static
 * export (scripts/build-static-prototype.mjs).
 */

const STYLE_ID = 'sonoite-prototype-styles';

export const BUILT_TRACK_CYCLE = Object.freeze(['sonoite', 'horas-mortas', 'nao-querer-nada']);

function resolveThemeFontUrl(filename) {
    const base = String(window.sonoiteData?.themeUrl || '').replace(/\/$/, '');
    return base ? `${base}/assets/fonts/${filename}` : `./assets/fonts/${filename}`;
}

function resolveDebugMode() {
    return new URLSearchParams(window.location.search).get('debug') === '1'
        || window.sonoiteData?.isDebug === true;
}

export function injectPrototypeStyles() {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const displayFontUrl = resolveThemeFontUrl('cormorant-garamond-latin.woff2');
    const uiFontUrl = resolveThemeFontUrl('ibm-plex-mono-latin.woff2');

    const style = document.createElement('style');
    style.id = STYLE_ID;
    if (window.sonoiteData?.cspNonce) {
        style.nonce = window.sonoiteData.cspNonce;
    }
    style.textContent = `
        @font-face {
            font-family: 'Cormorant Garamond';
            font-style: normal;
            font-weight: 400 500;
            font-display: swap;
            src: url('${displayFontUrl}') format('woff2');
        }

        @font-face {
            font-family: 'IBM Plex Mono';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url('${uiFontUrl}') format('woff2');
        }

        :root {
            color-scheme: dark;
            --prototype-black: #000000;
            --prototype-text: rgba(240, 236, 230, 0.9);
            --prototype-muted: rgba(240, 236, 230, 0.64);
            --prototype-line: rgba(240, 236, 230, 0.18);
            --prototype-accent: rgba(236, 230, 223, 0.92);
            --prototype-panel: rgba(0, 0, 0, 0.0);
            --prototype-ui-font: 'IBM Plex Mono', 'SFMono-Regular', 'Menlo', monospace;
            --prototype-display-font: 'Cormorant Garamond', 'Times New Roman', serif;
        }

        html, body {
            margin: 0;
            min-height: 100%;
            background: var(--prototype-black);
        }

        body.sonoite-prototype-page {
            overflow: hidden;
            background: var(--prototype-black);
        }

        #sonoite-prototype-root {
            position: fixed;
            inset: 0;
            overflow: hidden;
            background: var(--prototype-black);
            color: var(--prototype-text);
        }

        .prototype-first-paint {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 0;
        }

        .prototype-first-paint-line {
            margin: 0;
            max-width: min(92vw, 720px);
            padding: 0 24px;
            font-family: var(--prototype-display-font);
            font-size: clamp(20px, 3.2vw, 34px);
            font-weight: 400;
            font-synthesis: none;
            letter-spacing: 0.12em;
            text-align: center;
            color: var(--prototype-text);
        }

        .prototype-stage,
        .prototype-canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
        }

        .prototype-canvas {
            display: block;
        }

        .prototype-frame-mask {
            position: absolute;
            inset: 0;
            background: #000000;
            opacity: 0;
            pointer-events: none;
            z-index: 1;
            transition: opacity 120ms linear;
        }

        .prototype-shell {
            position: absolute;
            inset: 0;
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: auto 1fr auto;
            padding: 42px 50px 38px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 420ms ease;
        }

        .prototype-shell.is-shell-ready {
            opacity: var(--prototype-shell-opacity, 1);
        }

        .prototype-shell.is-dimmed {
            opacity: var(--prototype-shell-dim-opacity, 0.08);
        }

        .prototype-shell.is-intro-active.is-dimmed {
            opacity: 0.42;
        }

        .prototype-playback-error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: auto;
        }
        .prototype-playback-error[hidden] { display: none; }
        .prototype-shell.is-hidden:focus-within,
        .prototype-shell.is-dimmed:focus-within {
            opacity: var(--prototype-shell-opacity, 1);
        }

        .prototype-shell.is-hidden {
            opacity: 0;
            pointer-events: none;
        }

        .prototype-shell.is-intro-active .prototype-title {
            opacity: 0;
            transform: translateY(6px);
        }

        .prototype-placard,
        .prototype-status,
        .prototype-footer,
        .prototype-controls,
        .prototype-intro,
        .prototype-index-button {
            pointer-events: auto;
        }

        .prototype-placard {
            align-self: start;
            max-width: 360px;
        }

        .prototype-eyebrow,
        .prototype-footer-label,
        .prototype-status,
        .prototype-time,
        .prototype-hint {
            font-family: var(--prototype-ui-font);
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--prototype-muted);
        }

        .prototype-title {
            margin: 10px 0 0;
            font-family: var(--prototype-display-font);
            font-size: clamp(22px, 2.9vw, 36px);
            letter-spacing: 0.06em;
            font-weight: 400;
            font-synthesis: none;
            color: var(--prototype-text);
            transition: opacity 320ms ease, transform 320ms ease;
        }

        .prototype-status {
            justify-self: end;
            align-self: start;
            min-width: 88px;
            padding: 8px 10px 8px 12px;
            border: 1px solid var(--prototype-line);
            border-radius: 999px;
            backdrop-filter: blur(12px);
            background: rgba(255, 255, 255, 0.03);
            text-align: center;
        }

        .prototype-intro {
            grid-column: 1 / 2;
            grid-row: 2 / 3;
            align-self: center;
            justify-self: start;
            display: grid;
            gap: 14px;
            justify-items: start;
            text-align: left;
            width: min(360px, calc(100vw - 120px));
            margin-top: 32px;
            transition: opacity 480ms ease, transform 480ms ease;
        }

        .prototype-intro.is-hidden {
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
        }

        .prototype-intro-copy {
            display: grid;
            gap: 6px;
        }

        .prototype-intro-title {
            font-family: var(--prototype-display-font);
            font-size: clamp(24px, 3.6vw, 40px);
            letter-spacing: 0.06em;
            font-weight: 400;
            font-synthesis: none;
            color: var(--prototype-text);
        }

        .prototype-intro-subtitle {
            font-family: var(--prototype-ui-font);
            font-size: 12px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--prototype-muted);
        }

        /* Pre-play the threshold title card is the gesture; the pill only exists
           in-film as the pause control (Kimi finding 5). */
        .prototype-shell.is-intro-active .prototype-play {
            display: none;
        }
        .prototype-play {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 120px;
            padding: 14px 22px;
            border-radius: 999px;
            border: 1px solid rgba(236, 230, 223, 0.24);
            background: rgba(255, 255, 255, 0.02);
            color: var(--prototype-text);
            font-family: var(--prototype-ui-font);
            font-size: 11px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            cursor: pointer;
            transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
        }

        .prototype-play:hover,
        .prototype-play:focus-visible,
        .prototype-icon-button:hover,
        .prototype-icon-button:focus-visible,
        .prototype-index-button:hover,
        .prototype-index-button:focus-visible {
            outline: none;
            border-color: rgba(236, 230, 223, 0.54);
            background: rgba(255, 255, 255, 0.06);
            transform: translateY(-1px);
        }

        .prototype-play:disabled,
        .prototype-icon-button:disabled,
        .prototype-index-button:disabled,
        .prototype-progress[aria-disabled='true'] {
            opacity: 0.38;
            cursor: default;
            transform: none;
            pointer-events: none;
        }

        .prototype-play-icon {
            width: 0;
            height: 0;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            border-left: 13px solid var(--prototype-accent);
            margin-left: 3px;
        }

        .prototype-footer {
            grid-column: 1 / -1;
            align-self: end;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 18px;
            align-items: center;
            min-height: 48px;
        }

        .prototype-footer-left,
        .prototype-footer-right {
            display: inline-flex;
            align-items: center;
            gap: 14px;
        }

        .prototype-controls {
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }

        .prototype-volume {
            display: grid;
            gap: 4px;
            font: 11px var(--prototype-ui-font);
            color: var(--prototype-text);
        }

        .prototype-volume input { width: 110px; margin: 0; cursor: pointer; }

        .prototype-icon-button,
        .prototype-index-button {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 1px solid var(--prototype-line);
            background: rgba(255, 255, 255, 0.02);
            color: var(--prototype-text);
            cursor: pointer;
            transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
        }

        .prototype-index-button {
            font-family: var(--prototype-ui-font);
            font-size: 14px;
            letter-spacing: 0.08em;
        }

        .prototype-icon-button svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .prototype-progress-wrap {
            display: grid;
            gap: 8px;
            align-items: center;
            width: min(38vw, 420px);
            justify-self: center;
        }

        .prototype-progress {
            position: relative;
            width: 100%;
            height: 12px;
            border: 0;
            padding: 0;
            background: transparent;
            cursor: pointer;
        }

        .prototype-progress::before,
        .prototype-progress-fill {
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 1px;
            transform: translateY(-50%);
            content: '';
        }

        .prototype-progress::before {
            background: rgba(255, 255, 255, 0.06);
        }

        .prototype-progress-fill {
            right: auto;
            width: 0%;
            background: rgba(236, 230, 223, 0.32);
            box-shadow: none;
        }

        .prototype-time {
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }

        .prototype-duration {
            min-width: 3.2ch;
            text-align: right;
        }

        .prototype-phase-label {
            margin-left: 10px;
            font-size: 10px;
            letter-spacing: 0.14em;
            text-transform: lowercase;
            color: rgba(236, 230, 223, 0.5);
        }

        .prototype-index-overlay {
            position: absolute;
            inset: 0;
            z-index: 5;
            display: grid;
            place-items: center;
            background: rgba(0, 0, 0, 0.72);
            opacity: 0;
            pointer-events: none;
            transition: opacity 320ms ease;
        }

        .prototype-index-overlay.is-open {
            opacity: 1;
            pointer-events: auto;
        }

        .prototype-index-panel {
            display: grid;
            gap: 18px;
            width: min(420px, calc(100vw - 48px));
            max-height: min(70vh, 520px);
            overflow: auto;
            padding: 8px 4px;
        }

        .prototype-index-row {
            display: grid;
            grid-template-columns: 4.5ch 1fr auto;
            gap: 16px;
            align-items: baseline;
            padding: 10px 0;
            border: 0;
            border-bottom: 1px solid rgba(240, 236, 230, 0.08);
            background: transparent;
            color: var(--prototype-text);
            text-align: left;
            cursor: pointer;
            font-family: var(--prototype-ui-font);
            transition: color 180ms ease;
        }

        .prototype-index-row:hover,
        .prototype-index-row:focus-visible {
            outline: none;
            color: var(--prototype-accent);
        }

        .prototype-index-row.is-current {
            color: var(--prototype-accent);
        }

        .prototype-index-number {
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--prototype-muted);
        }

        .prototype-index-title {
            font-family: var(--prototype-display-font);
            font-size: clamp(18px, 2.4vw, 26px);
            letter-spacing: 0.06em;
            font-weight: 400;
            font-synthesis: none;
        }

        .prototype-index-duration {
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--prototype-muted);
            font-variant-numeric: tabular-nums;
        }

        .prototype-tweak {
            position: absolute;
            top: 18px;
            right: 18px;
            z-index: 6;
            display: grid;
            gap: 6px;
            width: 240px;
            padding: 12px 14px;
            border: 1px solid rgba(236, 230, 223, 0.14);
            border-radius: 6px;
            background: rgba(8, 8, 12, 0.82);
            font-size: 10px;
            letter-spacing: 0.08em;
            color: rgba(236, 230, 223, 0.72);
        }

        .prototype-tweak-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-transform: uppercase;
        }

        .prototype-tweak-head button {
            border: 1px solid rgba(236, 230, 223, 0.24);
            border-radius: 4px;
            padding: 2px 8px;
            background: transparent;
            color: inherit;
            font: inherit;
            cursor: pointer;
        }

        .prototype-tweak-row {
            display: grid;
            grid-template-columns: 58px 1fr 44px;
            gap: 8px;
            align-items: center;
        }

        .prototype-tweak-row input[type='range'] {
            width: 100%;
            accent-color: rgba(236, 230, 223, 0.7);
        }

        .prototype-tweak-value {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        .prototype-fillmeter {
            position: absolute;
            top: 18px;
            left: 18px;
            z-index: 6;
            padding: 6px 10px;
            border: 1px solid rgba(236, 230, 223, 0.14);
            border-radius: 4px;
            background: rgba(8, 8, 12, 0.82);
            font-family: var(--prototype-ui-font);
            font-size: 10px;
            letter-spacing: 0.08em;
            color: rgba(236, 230, 223, 0.72);
            font-variant-numeric: tabular-nums;
            pointer-events: none;
        }

        .prototype-hidden {
            display: none;
        }

        .prototype-title-card {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 2;
            transition: opacity 480ms ease;
        }

        .prototype-title-card.is-threshold {
            pointer-events: auto;
            cursor: pointer;
        }

        .prototype-title-card.is-threshold:hover .prototype-title-card-text,
        .prototype-title-card.is-threshold:focus-visible .prototype-title-card-text {
            color: rgba(248, 244, 238, 0.98);
        }

        .prototype-title-card-inner {
            display: grid;
            gap: 12px;
            justify-items: center;
            max-width: min(92vw, 720px);
            padding: 0 24px;
            text-align: center;
        }

        .prototype-title-card-text {
            margin: 0;
            font-family: var(--prototype-display-font);
            font-size: clamp(24px, 3.6vw, 42px);
            font-weight: 400;
            font-synthesis: none;
            letter-spacing: 0.08em;
            text-align: center;
            color: var(--prototype-text);
            transition: color 220ms ease;
        }

        .prototype-title-card-number {
            margin: 0;
            font-family: var(--prototype-ui-font);
            font-size: 12px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--prototype-muted);
        }

        @media (max-width: 800px) {
            .prototype-shell {
                padding: 24px 24px 26px;
                grid-template-columns: 1fr;
                grid-template-rows: auto auto 1fr auto;
                gap: 16px;
            }

            .prototype-status {
                justify-self: start;
            }

            .prototype-intro {
                grid-column: 1 / -1;
                grid-row: auto;
                align-self: center;
                justify-self: center;
                justify-items: center;
                text-align: center;
                width: min(320px, calc(100vw - 36px));
                margin-top: 0;
            }

            .prototype-footer {
                grid-template-columns: 1fr;
                gap: 12px;
                align-items: stretch;
            }

            .prototype-progress-wrap {
                width: 100%;
                order: 3;
            }

            .prototype-footer-right {
                justify-content: space-between;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .prototype-shell,
            .prototype-title-card,
            .prototype-index-overlay,
            .prototype-frame-mask,
            .prototype-intro {
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);
}

function formatTime(seconds) {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function humanizeStatus(text) {
    const raw = String(text || '').trim();
    if (!raw) {
        return raw;
    }
    const lower = raw.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('unavailable')) {
        return 'the room went quiet — click to try again';
    }
    return raw;
}

function formatTrackLabel(track, journey) {
    const trackNumber = Number(journey?.meta?.track || track?.order || track?.id || 0);
    return Number.isFinite(trackNumber) && trackNumber > 0
        ? `Track ${String(trackNumber).padStart(2, '0')}`
        : 'Track';
}

export class ReliquaryShell {
    static TITLE_CARD_CLEAR_SECONDS = 23.0;

    static TITLE_CARD_FADE_SECONDS = 1.5;

    static CHROME_HIDE_DELAY_MS = 4000;

    constructor(root, callbacks = {}) {
        this.root = root;
        this.callbacks = callbacks;
        this.debugMode = resolveDebugMode();
        this.hideTimer = null;
        this.isPlaying = false;
        this.titleCard = null;
        this.titleCardText = null;
        this.titleCardNumber = null;
        this.titleCardEnabled = false;
        this.titleCardInFilmSuppressed = false;
        this.thresholdDismissed = false;
        this.usesThreshold = false;
        this.indexOpen = false;
        this.indexTracks = [];
        this.currentTrackSlug = '';
        this.primaryActionHandler = null;
        this.seekHandler = null;
        this.progressKeydownHandler = null;
        this.stagePointerHandler = null;
        this.indexKeyHandler = null;
        this.playbackCurrentTime = 0;
        this.playbackDuration = 0;
        this.lastRenderedCurrent = null;
        this.lastRenderedDuration = null;
        this.lastRenderedRatio = null;

        injectPrototypeStyles();
        this.build();
        this.bind();
    }

    build() {
        const statusMarkup = this.debugMode
            ? '<div class="prototype-status" data-status></div>'
            : '';

        this.root.innerHTML = `
            <div class="prototype-stage" data-stage>
                <canvas class="prototype-canvas" aria-hidden="true"></canvas>
                <div class="prototype-frame-mask" data-frame-mask aria-hidden="true"></div>
                <div class="prototype-shell is-intro-active" data-shell>
                    <div class="prototype-placard">
                        <div class="prototype-eyebrow" data-eyebrow></div>
                        <h1 class="prototype-title" data-title></h1>
                    </div>
                    ${statusMarkup}
                    <div class="prototype-intro prototype-hidden" data-intro>
                        <div class="prototype-intro-copy">
                            <div class="prototype-intro-title" data-intro-title></div>
                            <div class="prototype-intro-subtitle" data-intro-subtitle></div>
                        </div>
                        <button class="prototype-play" data-play type="button">
                            <span class="prototype-play-icon" aria-hidden="true"></span>
                            <span data-play-label>play track</span>
                        </button>
                    </div>
                    <div class="prototype-footer">
                        <div class="prototype-footer-left">
                            <span class="prototype-footer-label" data-footer-label></span>
                        </div>
                        <div class="prototype-progress-wrap">
                            <div class="prototype-progress" data-progress role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00 of 0:00" aria-label="Seek through track playback" aria-disabled="false">
                                <span class="prototype-progress-fill" data-progress-fill></span>
                            </div>
                            <div class="prototype-time">
                                <span data-current>0:00</span>
                                <span class="prototype-duration" data-duration></span>
                            </div>
                        </div>
                        <div class="prototype-footer-right">
                            <div class="prototype-controls">
                                <label class="prototype-volume">
                                    <span>Volume <output data-volume-value>100%</output></span>
                                    <input data-volume type="range" min="0" max="100" step="1" value="100" aria-label="Music volume">
                                </label>
                                <button class="prototype-icon-button" data-toggle type="button" aria-label="Play or pause audio">
                                    <svg data-icon-play viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                                    <svg class="prototype-hidden" data-icon-pause viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
                                </button>
                                <button class="prototype-index-button" data-index-open type="button" aria-label="Open track index" title="Track index">☰</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="prototype-index-overlay" data-index-overlay aria-hidden="true">
                    <div class="prototype-index-panel" data-index-panel role="list"></div>
                </div>
            </div>
        `;

        this.stage = this.root.querySelector('[data-stage]');
        this.canvas = this.root.querySelector('.prototype-canvas');
        this.frameMask = this.root.querySelector('[data-frame-mask]');
        this.shell = this.root.querySelector('[data-shell]');
        this.intro = this.root.querySelector('[data-intro]');
        this.status = this.root.querySelector('[data-status]');
        this.eyebrow = this.root.querySelector('[data-eyebrow]');
        this.title = this.root.querySelector('[data-title]');
        this.introTitle = this.root.querySelector('[data-intro-title]');
        this.introSubtitle = this.root.querySelector('[data-intro-subtitle]');
        this.play = this.root.querySelector('[data-play]');
        this.playLabel = this.root.querySelector('[data-play-label]');
        this.toggle = this.root.querySelector('[data-toggle]');
        this.indexOpenButton = this.root.querySelector('[data-index-open]');
        this.indexOverlay = this.root.querySelector('[data-index-overlay]');
        this.indexPanel = this.root.querySelector('[data-index-panel]');
        this.progress = this.root.querySelector('[data-progress]');
        this.progressFill = this.root.querySelector('[data-progress-fill]');
        this.current = this.root.querySelector('[data-current]');
        this.duration = this.root.querySelector('[data-duration]');
        this.footerLabel = this.root.querySelector('[data-footer-label]');
        this.volume = this.root.querySelector('[data-volume]');
        this.volumeValue = this.root.querySelector('[data-volume-value]');
        this.iconPlay = this.root.querySelector('[data-icon-play]');
        this.iconPause = this.root.querySelector('[data-icon-pause]');
    }

    bind() {
        this.volumeHandler = () => {
            const value = Number(this.volume.value) / 100;
            this.setListeningVolume(value);
            this.callbacks.onVolume?.(value);
        };
        this.volume.addEventListener('input', this.volumeHandler);
        this.primaryActionHandler = () => this.callbacks.onPrimaryAction?.();
        this.seekHandler = (event) => {
            const rect = this.progress.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            this.callbacks.onSeek?.(Math.max(0, Math.min(1, ratio)));
        };

        this.progressKeydownHandler = (event) => {
            if (this.progress.getAttribute('aria-disabled') === 'true') {
                return;
            }

            if (event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault();
                return;
            }

            const duration = this.playbackDuration;
            if (!(duration > 0)) {
                return;
            }

            let targetTime = null;
            let delta = 0;

            if (event.key === 'Home') {
                targetTime = 0;
            } else if (event.key === 'End') {
                targetTime = duration;
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                delta = event.shiftKey ? -15 : -5;
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                delta = event.shiftKey ? 15 : 5;
            } else {
                return;
            }

            event.preventDefault();
            const nextTime = targetTime !== null ? targetTime : this.playbackCurrentTime + delta;
            const ratio = Math.max(0, Math.min(1, nextTime / duration));
            this.callbacks.onSeek?.(ratio);
        };

        this.stagePointerHandler = (event) => {
            if (!this.shell.classList.contains('is-intro-active') || !this.usesThreshold) {
                return;
            }
            if (
                this.indexOpen
                || event.target.closest('[data-title-card], [data-index-overlay], [data-shell] .prototype-footer, [data-shell] .prototype-placard')
            ) {
                return;
            }
            this.callbacks.onPrimaryAction?.();
        };

        this.focusChromeHandler = () => this.showChrome();
        this.shell.addEventListener('focusin', this.focusChromeHandler);
        this.indexKeyHandler = (event) => {
            this.showChrome();
            if (event.key === 'Escape' && this.indexOpen) {
                this.closeIndex();
            }
        };

        this.play?.addEventListener('click', this.primaryActionHandler);
        this.toggle.addEventListener('click', this.primaryActionHandler);
        this.progress.addEventListener('click', this.seekHandler);
        this.progress.addEventListener('keydown', this.progressKeydownHandler);
        this.stage?.addEventListener('pointerdown', this.stagePointerHandler);
        this.indexOpenButton?.addEventListener('click', () => this.openIndex());
        this.indexOverlay?.addEventListener('click', (event) => {
            if (event.target === this.indexOverlay) {
                this.closeIndex();
            }
        });
        document.addEventListener('keydown', this.indexKeyHandler);
    }

    configureIndex({ tracks = [], currentSlug = '', onNavigate = null } = {}) {
        this.indexTracks = tracks;
        this.currentTrackSlug = String(currentSlug || '').toLowerCase();
        this.callbacks.onNavigate = onNavigate;
        this.renderIndexPanel();
    }

    renderIndexPanel() {
        if (!this.indexPanel) {
            return;
        }

        this.indexPanel.innerHTML = '';
        this.indexTracks.forEach((track) => {
            const slug = String(track.slug || '').toLowerCase();
            const trackNumber = Number(track.order || track.id || 0);
            const numberLabel = Number.isFinite(trackNumber) && trackNumber > 0
                ? String(trackNumber).padStart(2, '0')
                : '—';
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'prototype-index-row';
            if (slug === this.currentTrackSlug) {
                row.classList.add('is-current');
            }
            row.dataset.trackSlug = slug;
            row.setAttribute('role', 'listitem');
            row.innerHTML = `
                <span class="prototype-index-number">${numberLabel}</span>
                <span class="prototype-index-title">${track.title || slug}</span>
                <span class="prototype-index-duration">${track.duration || ''}</span>
            `;
            row.addEventListener('click', () => {
                this.closeIndex();
                if (slug && slug !== this.currentTrackSlug) {
                    this.callbacks.onNavigate?.(slug);
                }
            });
            row.tabIndex = this.indexOpen ? 0 : -1;
            this.indexPanel.appendChild(row);
        });
        this.indexOverlay.toggleAttribute('inert', !this.indexOpen);
    }

    openIndex() {
        if (!this.indexOverlay || !this.indexTracks.length) {
            return;
        }
        this.indexReturnFocus = this.shell.ownerDocument.activeElement;
        this.indexOpen = true;
        this.indexOverlay.removeAttribute('inert');
        this.indexPanel.querySelectorAll('button').forEach((row) => {
            row.tabIndex = 0;
        });
        this.indexOverlay.classList.add('is-open');
        this.indexOverlay.setAttribute('aria-hidden', 'false');
        this.showChrome();
        (this.indexPanel.querySelector('.is-current') || this.indexPanel.querySelector('button'))?.focus();
    }

    closeIndex() {
        if (!this.indexOverlay) {
            return;
        }
        this.indexOpen = false;
        this.indexOverlay.classList.remove('is-open');
        this.indexOverlay.setAttribute('aria-hidden', 'true');
        this.indexOverlay.setAttribute('inert', '');
        this.indexPanel.querySelectorAll('button').forEach((row) => {
            row.tabIndex = -1;
        });
        this.indexReturnFocus?.focus();
        this.indexReturnFocus = null;
        if (!this.shell.classList.contains('is-intro-active')) {
            this.scheduleHide();
        }
    }

    revealShell() {
        this.shell.classList.add('is-shell-ready');
    }

    setTrack(track, journey, variant = null) {
        const trackLabel = formatTrackLabel(track, journey);
        const displayTitle = variant?.displayLabel || track?.title || '';
        const subtitleName = variant?.displayLabel || track?.title || '';
        const subtitle = subtitleName ? `${trackLabel} · ${subtitleName}` : trackLabel;
        const albumName = window.sonoiteData?.i18n?.albumName || 'Sonoite';

        this.eyebrow.textContent = albumName;
        this.title.textContent = displayTitle;
        this.introTitle.textContent = displayTitle;
        this.introSubtitle.textContent = subtitle;
        this.footerLabel.textContent = trackLabel;

        if (variant?.label) {
            console.info(`[Prototype] chamber variant: ${variant.label}`);
        }

        if (this.progress) {
            this.progress.setAttribute('aria-label', `Seek, ${displayTitle || track?.title || 'track'}`);
        }

        this.configureTitleCard(variant, displayTitle, trackLabel);
        this.revealShell();
    }

    isCinemaVariant(variant) {
        const key = String(variant?.key || variant?.variantKey || '').toLowerCase();
        return key.endsWith('-cinema') || key.startsWith('track5-cinema');
    }

    prefersReducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    }

    setTitleCardSuppressed(suppressed) {
        this.titleCardInFilmSuppressed = suppressed === true;
        if (this.titleCardInFilmSuppressed && !this.shell.classList.contains('is-intro-active')) {
            this.syncTitleCard(this.playbackCurrentTime);
        }
    }

    configureTitleCard(variant, displayTitle, trackLabel) {
        const cinema = this.isCinemaVariant(variant);
        this.usesThreshold = cinema;
        this.titleCardEnabled = cinema;
        this.thresholdDismissed = false;

        if (cinema) {
            this.intro?.classList.add('prototype-hidden');
        } else {
            this.intro?.classList.remove('prototype-hidden');
        }

        if (!cinema) {
            this.titleCard?.remove();
            this.titleCard = null;
            this.titleCardText = null;
            this.titleCardNumber = null;
            return;
        }

        if (!this.titleCard) {
            const card = document.createElement('div');
            card.className = 'prototype-title-card is-threshold';
            card.dataset.titleCard = '';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', 'Start film');

            const inner = document.createElement('div');
            inner.className = 'prototype-title-card-inner';

            const text = document.createElement('p');
            text.className = 'prototype-title-card-text';
            text.dataset.titleCardText = '';

            const number = document.createElement('p');
            number.className = 'prototype-title-card-number';
            number.dataset.titleCardNumber = '';

            inner.appendChild(text);
            inner.appendChild(number);
            card.appendChild(inner);

            card.addEventListener('click', (event) => {
                event.stopPropagation();
                this.callbacks.onPrimaryAction?.();
            });
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.callbacks.onPrimaryAction?.();
                }
            });

            this.stage?.insertBefore(card, this.shell);
            this.titleCard = card;
            this.titleCardText = text;
            this.titleCardNumber = number;
        }

        this.titleCardText.textContent = displayTitle;
        this.titleCardNumber.textContent = trackLabel;
        this.syncTitleCard(this.playbackCurrentTime);
    }

    restoreThreshold() {
        this.shell.classList.add('is-intro-active');
        if (this.titleCard) {
            this.titleCard.classList.add('is-threshold');
            this.titleCard.style.pointerEvents = '';
        }
        this.resetThresholdForReprise();
        this.showChrome();
    }

    resetThresholdForReprise() {
        this.thresholdDismissed = false;
        this.syncTitleCard(this.playbackCurrentTime);
    }

    dismissThreshold() {
        if (!this.titleCard || this.thresholdDismissed) {
            return;
        }
        this.thresholdDismissed = true;
        this.titleCard.classList.remove('is-threshold');
        this.titleCard.style.pointerEvents = 'none';
        if (this.prefersReducedMotion()) {
            this.titleCard.style.opacity = '0';
            return;
        }
        this.titleCard.style.opacity = '0';
    }

    syncTitleCard(currentTime) {
        if (!this.titleCardEnabled || !this.titleCard) {
            return;
        }

        if (this.shell.classList.contains('is-intro-active') && !this.thresholdDismissed) {
            this.titleCard.style.display = 'flex';
            this.titleCard.style.opacity = '1';
            this.titleCard.setAttribute('aria-hidden', 'false');
            return;
        }

        if (this.titleCardInFilmSuppressed) {
            this.titleCard.style.display = 'none';
            this.titleCard.style.opacity = '0';
            this.titleCard.setAttribute('aria-hidden', 'true');
            return;
        }

        const clearAt = ReliquaryShell.TITLE_CARD_CLEAR_SECONDS;
        const fadeSeconds = ReliquaryShell.TITLE_CARD_FADE_SECONDS;
        const t = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0);

        if (t >= clearAt) {
            this.titleCard.style.display = 'none';
            this.titleCard.style.opacity = '0';
            this.titleCard.setAttribute('aria-hidden', 'true');
            return;
        }

        this.titleCard.style.display = 'flex';
        this.titleCard.setAttribute('aria-hidden', 'false');

        if (this.prefersReducedMotion()) {
            this.titleCard.style.opacity = '1';
            return;
        }

        const fadeStart = clearAt - fadeSeconds;
        if (t <= fadeStart) {
            this.titleCard.style.opacity = '1';
            return;
        }

        const progress = (t - fadeStart) / fadeSeconds;
        this.titleCard.style.opacity = String(Math.max(0, 1 - progress));
    }

    setStatus(text) {
        const message = humanizeStatus(text);
        if (this.debugMode && this.status) {
            this.status.textContent = message;
        }
        if (this.debugMode || !this.status) {
            window.__sonoiteStaticLoader?.setStatus?.(message);
        }
    }

    setReady(ready) {
        this.setStatus(ready ? 'ready' : 'loading');
        this.setInteractiveDisabled(!ready);
        if (ready) {
            window.__sonoiteStaticLoader?.dismiss?.();
        }
    }

    setBusy(isBusy, statusText = null) {
        this.setInteractiveDisabled(isBusy);

        if (statusText) {
            this.setStatus(statusText);
        }
    }

    setInteractiveDisabled(disabled) {
        if (this.play) {
            this.play.disabled = disabled;
        }
        this.toggle.disabled = disabled;
        if (this.indexOpenButton) {
            this.indexOpenButton.disabled = disabled;
        }
        this.progress.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        this.progress.tabIndex = disabled ? -1 : 0;
    }

    showPlaybackError() {
        if (!this.playbackError) {
            this.playbackError = document.createElement('div');
            this.playbackError.setAttribute('role', 'alert');
            this.playbackError.className = 'prototype-playback-error';
            const message = document.createElement('p');
            message.textContent = "The music couldn't load.";
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.textContent = 'Retry';
            retry.addEventListener('click', () => this.callbacks.onRetry?.());
            this.playbackError.append(message, retry);
            this.shell.appendChild(this.playbackError);
        }
        this.playbackError.hidden = false;
        this.showChrome();
    }

    hidePlaybackError() {
        if (this.playbackError) {
            this.playbackError.hidden = true;
        }
    }

    setPlaying(isPlaying) {
        this.isPlaying = isPlaying;
        if (!isPlaying) {
            this.showChrome();
        }
        this.iconPlay.classList.toggle('prototype-hidden', isPlaying);
        this.iconPause.classList.toggle('prototype-hidden', !isPlaying);
        if (this.playLabel) {
            this.playLabel.textContent = isPlaying ? 'pause track' : 'play track';
        }
        if (this.debugMode) {
            this.setStatus(isPlaying ? 'playing' : 'ready');
        }
    }

    hideIntro() {
        this.intro?.classList.add('is-hidden');
        this.shell.classList.remove('is-intro-active');
        this.dismissThreshold();
    }

    showChrome() {
        this.shell.classList.remove('is-hidden', 'is-dimmed');
        if (!this.isPlaying || (this.playbackError && !this.playbackError.hidden)
            || this.shell.classList.contains('is-intro-active') || this.indexOpen) {
            window.clearTimeout(this.hideTimer);
            this.hideTimer = null;
            return;
        }
        this.scheduleHide();
    }

    hideChrome() {
        if (!this.isPlaying || (this.playbackError && !this.playbackError.hidden)
            || this.shell.classList.contains('is-intro-active') || this.indexOpen) {
            return;
        }
        this.shell.classList.add('is-hidden');
        this.shell.classList.remove('is-dimmed');
    }

    scheduleHide(delay = ReliquaryShell.CHROME_HIDE_DELAY_MS) {
        window.clearTimeout(this.hideTimer);
        this.hideTimer = null;
        if (!this.isPlaying || (this.playbackError && !this.playbackError.hidden)
            || this.shell.classList.contains('is-intro-active') || this.indexOpen) {
            return;
        }
        window.clearTimeout(this.hideTimer);
        this.hideTimer = window.setTimeout(() => this.hideChrome(), delay);
    }

    updateTime(currentTime, duration) {
        this.playbackCurrentTime = currentTime;
        this.playbackDuration = duration;

        const ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

        this.progress.setAttribute('aria-valuenow', String(Math.max(0, currentTime)));
        this.progress.setAttribute('aria-valuemax', String(Math.max(0, duration)));
        this.progress.setAttribute(
            'aria-valuetext',
            `${formatTime(currentTime)} of ${formatTime(duration)}`
        );

        const roundedCurrent = Math.round(currentTime);
        const roundedDuration = Math.round(duration);
        if (roundedCurrent !== this.lastRenderedCurrent) {
            this.current.textContent = formatTime(currentTime);
            this.lastRenderedCurrent = roundedCurrent;
        }
        if (roundedDuration !== this.lastRenderedDuration) {
            this.duration.textContent = formatTime(duration);
            this.lastRenderedDuration = roundedDuration;
        }
        if (this.lastRenderedRatio === null || Math.abs(ratio - this.lastRenderedRatio) >= 0.004) {
            this.progressFill.style.width = `${ratio * 100}%`;
            this.lastRenderedRatio = ratio;
        }

        this.syncTitleCard(currentTime);
    }

    setPhases() {
        // Phase tick marks removed; seek rail and setPhaseLabel unchanged.
    }

    setPhaseLabel(name) {
        if (!this.debugMode) {
            return;
        }
        if (!this.phaseLabel) {
            this.phaseLabel = document.createElement('span');
            this.phaseLabel.className = 'prototype-phase-label';
            this.footerLabel?.after(this.phaseLabel);
        }
        this.phaseLabel.textContent = String(name || '').toLowerCase();
    }

    buildTweakPanel(defs = []) {
        if (this.tweakPanel || !defs.length) {
            return;
        }
        const panel = document.createElement('div');
        panel.className = 'prototype-tweak';
        const head = document.createElement('div');
        head.className = 'prototype-tweak-head';
        head.innerHTML = '<span>tweak</span><button type="button" data-tweak-copy>copy json</button>';
        panel.appendChild(head);

        const values = new Map();
        defs.forEach((def) => {
            const initial = Number(def.get?.() ?? 0);
            values.set(def.id, initial);

            const row = document.createElement('label');
            row.className = 'prototype-tweak-row';

            const label = document.createElement('span');
            label.className = 'prototype-tweak-label';
            label.textContent = def.label;

            const input = document.createElement('input');
            input.type = 'range';
            input.min = String(def.min);
            input.max = String(def.max);
            input.step = String(def.step);
            input.value = String(initial);

            const readout = document.createElement('span');
            readout.className = 'prototype-tweak-value';
            readout.textContent = initial.toFixed(3);

            input.addEventListener('input', () => {
                const value = Number(input.value);
                values.set(def.id, value);
                readout.textContent = value.toFixed(3);
                def.set?.(value);
            });

            row.appendChild(label);
            row.appendChild(input);
            row.appendChild(readout);
            panel.appendChild(row);
        });

        head.querySelector('[data-tweak-copy]').addEventListener('click', () => {
            navigator.clipboard?.writeText(JSON.stringify(Object.fromEntries(values), null, 2));
        });
        panel.addEventListener('pointerdown', (event) => event.stopPropagation());

        this.root.querySelector('.prototype-stage')?.appendChild(panel);
        this.tweakPanel = panel;
    }

    setFrameMaskOpacity(opacity) {
        if (!this.frameMask) {
            return;
        }

        this.frameMask.style.opacity = `${Math.max(0, Math.min(1, opacity))}`;
    }

    setSuppression(amount) {
        const suppression = Math.max(0, Math.min(1, amount));
        this.shell.style.setProperty('--prototype-shell-opacity', `${Math.max(0.08, 1 - suppression * 0.72)}`);
        this.shell.style.setProperty('--prototype-shell-dim-opacity', `${Math.max(0.018, 0.08 - suppression * 0.05)}`);
    }

    setListeningVolume(value) {
        const percent = Math.round(value * 100);
        this.volume.value = String(percent);
        this.volumeValue.value = `${percent}%`;
    }

    destroy() {
        this.shell.removeEventListener('focusin', this.focusChromeHandler);
        this.volume?.removeEventListener('input', this.volumeHandler);
        window.clearTimeout(this.hideTimer);
        this.titleCard?.remove();
        this.titleCard = null;
        this.titleCardText = null;
        this.titleCardNumber = null;
        this.titleCardEnabled = false;
        if (this.primaryActionHandler && this.play) {
            this.play.removeEventListener('click', this.primaryActionHandler);
        }
        if (this.primaryActionHandler && this.toggle) {
            this.toggle.removeEventListener('click', this.primaryActionHandler);
            this.primaryActionHandler = null;
        }
        if (this.seekHandler) {
            this.progress.removeEventListener('click', this.seekHandler);
            this.seekHandler = null;
        }
        if (this.progressKeydownHandler) {
            this.progress.removeEventListener('keydown', this.progressKeydownHandler);
            this.progressKeydownHandler = null;
        }
        if (this.stagePointerHandler) {
            this.stage?.removeEventListener('pointerdown', this.stagePointerHandler);
            this.stagePointerHandler = null;
        }
        if (this.indexKeyHandler) {
            document.removeEventListener('keydown', this.indexKeyHandler);
            this.indexKeyHandler = null;
        }
    }
}
