import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';

    // BUILD-01: Dynamic base path - works on any WordPress install
    // Use relative path so assets load correctly regardless of site URL
    const basePath = './';

    const input = {
        main: resolve(__dirname, 'src/js/main.js'),
        prototype: resolve(__dirname, 'src/js/prototype/main.js'),
        'init-experience': resolve(__dirname, 'src/js/init-experience.js'),
        'security-manager': resolve(__dirname, 'src/js/security-manager.js'),
        'performance-monitor': resolve(__dirname, 'src/js/performance-monitor.js'),
        'accessibility-manager': resolve(__dirname, 'src/js/accessibility-manager.js'),
        'preview-experience': resolve(__dirname, 'src/js/preview-experience.js'),
        'preview-styles': resolve(__dirname, 'src/css/preview.css'),
    };

    const output = {
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
                return `css/[name].[hash].${ext}`;
            }
            return `assets/[name].[hash].${ext}`;
        },
        format: 'es',

        // Manual chunks for better caching
        manualChunks: {
            'three-vendor': ['three'],
            'audio-core': [
                resolve(__dirname, 'src/js/audio-manager.js'),
            ],
        },
    };

    return {
        base: basePath,
        plugins: [
            // SEC-01: CDN SRI plugin removed (Dec 3, 2025)
            // Three.js is now bundled locally via Vite - no external CDN dependencies
            // SRI verification happens automatically on local bundles via manifest hashing
        ],

        build: {
            outDir: 'dist',
            emptyOutDir: true,
            manifest: true, // Generate manifest.json for WordPress asset management

            rollupOptions: {
                input,
                output,
                external: [], // Bundle everything except explicitly externalized
                plugins: [],
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
                    pure_funcs: isProduction ? ['console.log', 'console.debug'] : [],
                },
            },
        },

        server: {
            port: 3000,
            host: '127.0.0.1',
            open: false,
            cors: {
                origin: ['http://localhost:3000', 'https://localhost:3000'],
                credentials: true,
            },
        },

        resolve: {
            // P0-FIX: Dedupe Three.js to prevent multiple instances warning
            dedupe: ['three'],
        },

        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
        },

        optimizeDeps: {
            include: ['three'],
            exclude: [],
        },
    };
});
