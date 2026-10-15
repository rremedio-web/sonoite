/**
 * Path B entry point, imported by src/js/site/boot.js after site-data.js has set window.sonoiteData
 * (index.html → boot.js). Boots one ReliquaryPrototypeExperience into #sonoite-prototype-root, tearing down
 * any previous instance first, and exposes it as window.SonoitePrototype for console inspection.
 * If boot fails, the root is replaced with a plain "refresh to try again" card.
 */

import { ReliquaryPrototypeExperience } from './experience.js';

async function bootPrototype() {
    const root = document.getElementById('sonoite-prototype-root');

    if (!root) {
        return;
    }

    if (window.SonoitePrototype?.destroy) {
        try {
            window.SonoitePrototype.destroy();
        } catch (error) {
            console.warn('[Prototype] Previous instance teardown failed', error);
        }
    }
    window.SonoitePrototype = null;

    const experience = new ReliquaryPrototypeExperience(root);

    try {
        await experience.init();
        window.SonoitePrototype = experience;
    } catch (error) {
        console.error('[Prototype] Boot failed', error);
        const albumName = window.sonoiteData?.i18n?.albumName || 'Sonoite';
        root.innerHTML = `
            <div style="position:fixed;inset:0;display:grid;place-items:center;background:#000;color:rgba(240,236,230,.9);padding:24px;text-align:center;">
                <div style="max-width:520px;display:grid;gap:14px;">
                    <p style="margin:0;font:400 clamp(20px,3.2vw,34px)/1.35 'Cormorant Garamond','Times New Roman',serif;letter-spacing:.1em;">${albumName}</p>
                    <p style="margin:0;font:400 12px/1.6 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(240,236,230,.64);">The room did not open — refresh to try again.</p>
                </div>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPrototype, { once: true });
} else {
    bootPrototype();
}
