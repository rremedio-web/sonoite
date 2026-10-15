/**
 * Vite config for the standalone site (Prompt #249; until #248 this built bundles for WordPress).
 * - One entry, index.html → src/js/site/boot.js → the Path B runtime. base './' keeps every URL in the
 *   built page relative, so dist/ works at a domain root or under a sub-path.
 * - publicDir is off: the runtime fetches its data by URL (`${themeUrl}/public/…`, `/assets/fonts/…`,
 *   `/audio/…`). The dev server serves those straight from the project root; on build the
 *   runtime-assets plugin below copies exactly the files listed in scripts/runtime-assets.mjs into
 *   dist/ at the same relative paths. Missing audio only warns (the public repo ships none);
 *   `npm run deploy` checks for it first (scripts/check-audio.mjs).
 * - Bundles go to dist/js/ so dist/assets/ holds only the copied fonts. The font preloads in
 *   index.html carry `vite-ignore` so Vite keeps their hrefs as written instead of hashing copies.
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import {
    copyFiles,
    resolveRuntimeAssets,
    resolveRuntimeAudio,
    RUNTIME_ASSETS
} from './scripts/runtime-assets.mjs';

/**
 * Copies the runtime asset set into the build output after Vite has written the bundle (emptyOutDir
 * wipes dist/ at the start of the build, so earlier hooks would lose the copies).
 *
 * @return {import('vite').Plugin} The plugin.
 */
function runtimeAssetsPlugin() {
    let config;
    return {
        name: 'sonoite-runtime-assets',
        apply: 'build',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        buildStart() {
            const { missing } = resolveRuntimeAssets(config.root);
            if (missing.length) {
                this.error(`runtime assets missing (listed in scripts/runtime-assets.mjs): ${missing.join(', ')}`);
            }
        },
        writeBundle() {
            const root = config.root;
            const outDir = resolve(root, config.build.outDir);
            const { files } = resolveRuntimeAssets(root);
            const assetBytes = copyFiles(root, outDir, files);
            const audio = resolveRuntimeAudio(root);
            const audioBytes = copyFiles(root, outDir, audio.present);
            const mb = (bytes) => (bytes / 1048576).toFixed(1);
            config.logger.info(`[runtime-assets] ${files.length} files from ${RUNTIME_ASSETS.length} entries (${mb(assetBytes)} MB) + ${audio.present.length} audio (${mb(audioBytes)} MB) copied into ${config.build.outDir}/`);
            if (audio.missing.length) {
                config.logger.warn(`[runtime-assets] audio missing, not copied: ${audio.missing.join(', ')}. The built site will not play those films; run \`npm run audio:import -- <dir>\` (npm run deploy refuses to publish without them).`);
            }
        }
    };
}

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';

    return {
        base: './',
        publicDir: false,
        // No SPA fallback: a missing file is a 404 in dev and preview, as on Netlify, instead of index.html.
        appType: 'mpa',
        plugins: [runtimeAssetsPlugin()],

        build: {
            outDir: 'dist',
            emptyOutDir: true,

            rollupOptions: {
                input: resolve(__dirname, 'index.html'),
                output: {
                    entryFileNames: 'js/[name].[hash].js',
                    chunkFileNames: 'js/chunks/[name].[hash].js',
                    assetFileNames: 'js/assets/[name].[hash][extname]',
                    format: 'es',
                    // Three.js changes far less often than the films: keep it in its own cacheable chunk.
                    manualChunks: {
                        'three-vendor': ['three']
                    }
                }
            },

            target: 'es2020',
            minify: isProduction ? 'terser' : false,
            sourcemap: !isProduction, // Source maps only in development

            terserOptions: {
                compress: {
                    // BUILD-05: drop_console strips ALL console.* calls in production (warn/error
                    // included), so pure_funcs below is redundant while this is true.
                    drop_console: isProduction,
                    drop_debugger: isProduction,
                    pure_funcs: isProduction ? ['console.log', 'console.debug'] : []
                }
            }
        },

        server: {
            port: 3000,
            host: '127.0.0.1',
            strictPort: true,
            open: false,
            watch: {
                // Large folders the site never loads; watching them only slows the dev server.
                ignored: [
                    '**/archive/**',
                    '**/docs/**',
                    '**/coverage/**',
                    '**/dist-static/**',
                    '**/dist-file/**',
                    '**/audio/**',
                    '**/tools/**',
                    '**/gsdr/**',
                    '**/codex/**',
                    '**/.planning/**',
                    '**/.planning-archive/**',
                    '**/.remember/**'
                ]
            }
        },

        preview: {
            port: 4173,
            host: '127.0.0.1'
        },

        resolve: {
            // P0-FIX: Dedupe Three.js to prevent multiple instances warning
            dedupe: ['three']
        },

        define: {
            'process.env.NODE_ENV': JSON.stringify(mode)
        },

        optimizeDeps: {
            // Crawl only the site entry: the default scans every .html under the root (archive/, docs/, …).
            entries: ['index.html'],
            include: ['three']
        }
    };
});
