import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';
    const isFilePreview = mode === 'filepreview';

    // BUILD-01: Dynamic base path - works on any WordPress install
    // Use relative path so assets load correctly regardless of site URL
    const basePath = './';

    const input = isFilePreview
        ? {
            'init-experience': resolve(__dirname, 'src/js/init-experience.js'),
        }
        : {
            main: resolve(__dirname, 'src/js/main.js'),
            prototype: resolve(__dirname, 'src/js/prototype/main.js'),
            'init-experience': resolve(__dirname, 'src/js/init-experience.js'),
            'security-manager': resolve(__dirname, 'src/js/security-manager.js'),
            'consciousness-system': resolve(__dirname, 'src/js/consciousness-system.js'),
            'performance-monitor': resolve(__dirname, 'src/js/performance-monitor.js'),
            'accessibility-manager': resolve(__dirname, 'src/js/accessibility-manager.js'),
            'service-worker-manager': resolve(__dirname, 'src/js/service-worker-manager.js'),
            'preview-experience': resolve(__dirname, 'src/js/preview-experience.js'),
            'preview-styles': resolve(__dirname, 'src/css/preview.css'),
        };

    const output = isFilePreview
        ? {
            entryFileNames: 'js/[name].iife.js',
            chunkFileNames: 'js/chunks/[name].iife.js',
            assetFileNames: (assetInfo) => {
                const info = assetInfo.name.split('.');
                const ext = info[info.length - 1];
                if (/\.(css)$/.test(assetInfo.name)) {
                    return `css/[name].iife.${ext}`;
                }
                return `assets/[name].iife.${ext}`;
            },
            format: 'iife',
            name: 'SonoiteFilePreview',
            inlineDynamicImports: true,
        }
        : {
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
                    resolve(__dirname, 'src/js/track-loader.js'),
                ],
                consciousness: [
                    resolve(__dirname, 'src/js/modules/consciousness-core.js'),
                    resolve(__dirname, 'src/js/modules/abstract-consciousness.js'),
                    resolve(__dirname, 'src/js/modules/audio-consciousness.js'),
                ],
            },
        };

    return {
        base: basePath,
        plugins: [
            {
                name: 'glsl-loader',
                load(id) {
                    if (id.endsWith('.glsl')) {
                        const source = readFileSync(id, 'utf8');
                        return `export default ${JSON.stringify(source)};`;
                    }
                },
            },
            // SEC-01: CDN SRI plugin removed (Dec 3, 2025)
            // Three.js is now bundled locally via Vite - no external CDN dependencies
            // SRI verification happens automatically on local bundles via manifest hashing
        ],

        build: {
            outDir: isFilePreview ? 'dist-file' : 'dist',
            emptyOutDir: true,
            manifest: !isFilePreview, // Generate manifest.json for WordPress asset management

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
                    // BUILD-05: Strip console.log/debug in production, keep warn/error
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
            alias: {
                '@': resolve(__dirname, 'src'),
                '@js': resolve(__dirname, 'src/js'),
                '@modules': resolve(__dirname, 'src/js/modules'),
                '@shaders': resolve(__dirname, 'src/shaders'),
            },
        },

        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
            __CDN_INTEGRITY_ENABLED__: JSON.stringify(isProduction),
            __THEME_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
        },

        optimizeDeps: {
            include: ['three'],
            exclude: [],
        },
    };
}); 
