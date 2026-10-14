/**
 * VisualLayerRegistry - Central registry for Visual Layer types
 * Manages registration, instantiation, and metadata for visual layers
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog, dwarn, derr } from '../utils/devlog.js';
// STAB: Seed core layers via static imports so bundling includes them and no 404s occur
import { AudioReactiveSkybox } from './core/AudioReactiveSkybox.js';
import { LightField } from './core/LightField.js';
import { CameraManager } from './core/CameraManager.js';

export class VisualLayerRegistry {
    constructor() {
        this.layers = new Map();
        this.loadedModules = new Map();
        this.defaultLayers = new Set();
        this.layerCategories = new Map();
        this.layerDependencies = new Map();

        // Preload core modules so create() doesn't rely on dynamic import paths
        // This ensures Vite includes these files in the bundle and avoids 404s in dist
        try {
            this.loadedModules.set('AudioReactiveSkybox', { AudioReactiveSkybox });
            this.loadedModules.set('LightField', { LightField });
            this.loadedModules.set('CameraManager', { CameraManager });
            dlog('🎨 Preloaded core visual layers into registry');
        } catch (e) {
            // Non-fatal; dynamic import will still be attempted as a fallback
            dwarn('Could not preload core layers; dynamic import fallback will be used.');
        }
    }

    /**
     * Register a visual layer type
     * @param {string} name - Layer name
     * @param {Object} config - Layer configuration
     */
    register(name, config) {
        const layerConfig = {
            name,
            className: config.className,
            module: config.module,
            category: config.category || 'flow',
            description: config.description || '',
            dependencies: config.dependencies || [],
            defaultConfig: config.defaultConfig || {},
            metadata: {
                version: config.version || '1.0.0',
                author: config.author || 'SonoiteTheme',
                performance: config.performance || 'medium',
                accessibility: config.accessibility || 'standard',
                experimental: config.experimental || false
            },
            ...config
        };

        this.layers.set(name, layerConfig);

        // Add to category
        if (!this.layerCategories.has(layerConfig.category)) {
            this.layerCategories.set(layerConfig.category, new Set());
        }
        this.layerCategories.get(layerConfig.category).add(name);

        // Track dependencies
        if (layerConfig.dependencies.length > 0) {
            this.layerDependencies.set(name, layerConfig.dependencies);
        }

        dlog(`🎨 Registered visual layer: ${name} (${layerConfig.category})`);
    }

    /**
     * Get layer configuration
     * @param {string} name - Layer name
     * @returns {Object|null} Layer configuration
     */
    get(name) {
        return this.layers.get(name) || null;
    }

    /**
     * Check if a layer is registered
     * @param {string} name - Layer name
     * @returns {boolean}
     */
    has(name) {
        return this.layers.has(name);
    }

    /**
     * Load and instantiate a visual layer
     * @param {string} name - Layer name
     * @param {Object} context - Visual context
     * @param {Object} config - Instance configuration
     * @returns {Promise<VisualLayer|null>} Visual layer instance
     */
    async create(name, context, config = {}) {
        const layerConfig = this.get(name);
        if (!layerConfig) {
            derr(`Visual layer not found: ${name}`);
            return null;
        }

        try {
            // Load module if not already loaded
            if (!this.loadedModules.has(name)) {
                const module = await import(layerConfig.module);
                this.loadedModules.set(name, module);
            }

            const module = this.loadedModules.get(name);
            const LayerClass = module[layerConfig.className] || module.default;

            if (!LayerClass) {
                throw new Error(`Layer class ${layerConfig.className} not found in module`);
            }

            // Check dependencies
            if (!this.checkDependencies(name, context)) {
                throw new Error(`Dependencies not met for layer ${name}`);
            }

            // Merge configurations
            const finalConfig = {
                ...layerConfig.defaultConfig,
                ...config
            };

            // Create instance
            const instance = new LayerClass(context);

            // Set configuration if the method exists
            if (instance.setConfig && typeof instance.setConfig === 'function') {
                instance.setConfig(finalConfig);
            }

            // Add metadata to instance
            instance._registryMetadata = {
                name,
                category: layerConfig.category,
                version: layerConfig.metadata.version,
                performance: layerConfig.metadata.performance
            };

            dlog(`✅ Created visual layer instance: ${name}`);
            return instance;

        } catch (error) {
            // MP-SHAPES-Register-02: Enhanced error reporting for missing modules (404s)
            if (error.message?.includes('Cannot find module') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('404')) {
                derr(`❌ Visual layer module not found (404): ${name}`, {
                    module: layerConfig.module,
                    error: error.message
                });
            } else {
                derr(`Failed to create visual layer ${name}:`, error);
            }
            return null;
        }
    }

    /**
     * Check if dependencies are met
     * @param {string} name - Layer name
     * @param {Object} context - Visual context
     * @returns {boolean}
     */
    checkDependencies(name, context) {
        const dependencies = this.layerDependencies.get(name);
        if (!dependencies || dependencies.length === 0) {
            return true;
        }

        for (const dependency of dependencies) {
            switch (dependency) {
                case 'audioManager':
                    if (!context.audioManager) return false;
                    break;
                case 'performanceOptimizer':
                    if (!context.performanceOptimizer) return false;
                    break;
                case 'accessibilityManager':
                    if (!context.accessibilityManager) return false;
                    break;
                case 'webgl':
                    if (!context.renderer || !context.renderer.capabilities) return false;
                    break;
                default:
                    dwarn(`Unknown dependency: ${dependency}`);
            }
        }

        return true;
    }

    /**
     * Get layers by category
     * @param {string} category - Category name
     * @returns {Array} Layer names in category
     */
    getByCategory(category) {
        const categorySet = this.layerCategories.get(category);
        return categorySet ? Array.from(categorySet) : [];
    }

    /**
     * Get all categories
     * @returns {Array} Category names
     */
    getCategories() {
        return Array.from(this.layerCategories.keys());
    }

    /**
     * Get all registered layer names
     * @returns {Array} Layer names
     */
    getAll() {
        return Array.from(this.layers.keys());
    }

    /**
     * Get layer metadata
     * @param {string} name - Layer name
     * @returns {Object|null} Layer metadata
     */
    getMetadata(name) {
        const config = this.get(name);
        return config ? config.metadata : null;
    }

    /**
     * Search layers by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Array} Matching layer names
     */
    search(criteria) {
        const results = [];

        for (const [name, config] of this.layers) {
            let matches = true;

            if (criteria.category && config.category !== criteria.category) {
                matches = false;
            }

            if (criteria.performance && config.metadata.performance !== criteria.performance) {
                matches = false;
            }

            if (criteria.experimental !== undefined && config.metadata.experimental !== criteria.experimental) {
                matches = false;
            }

            if (criteria.keywords) {
                const searchText = `${name} ${config.description}`.toLowerCase();
                const hasKeyword = criteria.keywords.some(keyword =>
                    searchText.includes(keyword.toLowerCase())
                );
                if (!hasKeyword) {
                    matches = false;
                }
            }

            if (matches) {
                results.push(name);
            }
        }

        return results;
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry statistics
     */
    getStats() {
        const stats = {
            totalLayers: this.layers.size,
            categories: {},
            performance: {},
            experimental: 0,
            loadedModules: this.loadedModules.size
        };

        // Count by category
        for (const [category, layerSet] of this.layerCategories) {
            stats.categories[category] = layerSet.size;
        }

        // Count by performance level
        for (const [name, config] of this.layers) {
            const perf = config.metadata.performance;
            stats.performance[perf] = (stats.performance[perf] || 0) + 1;

            if (config.metadata.experimental) {
                stats.experimental++;
            }
        }

        return stats;
    }

    /**
     * Export registry configuration
     * @returns {Object} Registry data for serialization
     */
    export() {
        const exported = {
            layers: {},
            categories: {},
            metadata: {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                totalLayers: this.layers.size
            }
        };

        // Export layer configs
        for (const [name, config] of this.layers) {
            exported.layers[name] = {
                ...config,
                // Don't export functions or complex objects
                module: config.module,
                className: config.className
            };
        }

        // Export categories
        for (const [category, layerSet] of this.layerCategories) {
            exported.categories[category] = Array.from(layerSet);
        }

        return exported;
    }

    /**
     * Import registry configuration
     * @param {Object} data - Registry data to import
     */
    import(data) {
        if (!data.layers) {
            throw new Error('Invalid registry data: missing layers');
        }

        for (const [name, config] of Object.entries(data.layers)) {
            this.register(name, config);
        }

        dlog(`📥 Imported ${Object.keys(data.layers).length} layer configurations`);
    }

    /**
     * Clear registry
     */
    clear() {
        this.layers.clear();
        this.loadedModules.clear();
        this.layerCategories.clear();
        this.layerDependencies.clear();
        this.defaultLayers.clear();
        dlog('🧹 Visual layer registry cleared');
    }

    /**
     * MP-SHAPES-Register-02: Get all registered type names
     * @returns {Array} Array of registered layer names
     */
    getRegisteredTypes() {
        return Array.from(this.layers.keys()).sort();
    }

    /**
     * MP-SHAPES-Register-02: Validate all registrations
     * Checks that all registered modules are preloaded or accessible
     * @returns {Object} Validation report { valid: Array, missing: Array }
     */
    validateRegistrations() {
        const report = { valid: [], missing: [], preloaded: [] };

        for (const [name, config] of this.layers) {
            if (this.loadedModules.has(name)) {
                report.preloaded.push(name);
                report.valid.push(name);
            } else {
                // Not preloaded, but might be accessible via dynamic import
                report.valid.push(name);
            }
        }

        if (window.SONOITE_DEBUG) {
            dlog(`[MP-SHAPES-Register-02] Registration validation:`, {
                total: this.layers.size,
                preloaded: report.preloaded.length,
                valid: report.valid.length,
                missing: report.missing.length
            });
        }

        return report;
    }

    /**
     * Register default layers
     */
    registerDefaults() {
        // Core layers
        this.register('AudioReactiveSkybox', {
            className: 'AudioReactiveSkybox',
            module: './core/AudioReactiveSkybox.js',
            category: 'core',
            description: 'Dynamic background environment with audio-reactive gradients',
            dependencies: ['audioManager'],
            performance: 'medium',
            defaultConfig: {
                colors: ['#040408', '#0a0a12', '#111425'], // Nocturnal palette per roadmap
                particleCount: 200
            }
        });

        this.register('LightField', {
            className: 'LightField',
            module: './core/LightField.js',
            category: 'core',
            description: 'Dynamic lighting system with audio reactivity',
            dependencies: ['audioManager'],
            performance: 'low'
        });

        this.register('CameraManager', {
            className: 'CameraManager',
            module: './core/CameraManager.js',
            category: 'core',
            description: 'Audio-reactive camera controls and movement',
            dependencies: ['audioManager'],
            performance: 'low'
        });

        // Flow layers
        this.register('HeavyFog', {
            className: 'HeavyFog',
            module: './flows/HeavyFog.js',
            category: 'flow',
            description: 'Volumetric fog with audio reactivity',
            dependencies: ['audioManager'],
            performance: 'high'
        });

        dlog('🎨 Default visual layers registered');
    }
}

// Export singleton instance
export const visualLayerRegistry = new VisualLayerRegistry();

// Auto-register defaults
visualLayerRegistry.registerDefaults();

export default VisualLayerRegistry;
