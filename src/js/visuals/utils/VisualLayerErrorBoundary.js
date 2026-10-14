/**
 * VisualLayerErrorBoundary - Error boundary for Visual Layer API
 * Prevents single layer crashes from breaking the entire visual system
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { dlog, dwarn, derr } from '../../utils/devlog.js';

export class VisualLayerErrorBoundary {
    constructor() {
        this.errorCounts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.quarantinedLayers = new Set();
        this.errorHistory = [];
        this.maxErrorHistory = 50;
    }

    /**
     * Wrap a visual layer with error boundary protection
     * STAB-08: Support both base/VisualLayer and layer-api lifecycle methods
     * @param {VisualLayer} layer - The visual layer to protect
     * @returns {VisualLayer} The wrapped layer
     */
    wrapLayer(layer) {
        if (!layer) return layer;

        // STAB-08: Handle both API styles (base/VisualLayer vs layer-api)
        const originalInit = layer.init ? layer.init.bind(layer) : null;
        const originalUpdate = layer.update ? layer.update.bind(layer) : null;
        const originalDispose = (layer.dispose || layer.unmount) ? (layer.dispose || layer.unmount).bind(layer) : null;

        // Wrap init method (if it exists)
        if (originalInit) {
            layer.init = (...args) => {
                return this.safeExecute(
                    () => originalInit(...args),
                    'init',
                    layer,
                    () => {
                        layer.initialized = true;
                        dlog(`✅ Layer ${layer.name || layer.id} initialized successfully`);
                    }
                );
            };
        }

        // Wrap update method (if it exists)
        if (originalUpdate) {
            layer.update = (dt, audio) => {
                if (this.quarantinedLayers.has(layer.id)) {
                    return; // Skip quarantined layers
                }
                // STAB-08: Adapt argument order depending on API style
                const args = layer._expectsAudioFirst ? [audio, dt] : [dt, audio];
                return this.safeExecute(
                    () => originalUpdate(...args),
                    'update',
                    layer,
                    null,
                    true // Silent for update (too frequent)
                );
            };
        }

        // Wrap dispose/unmount method (if it exists)
        if (originalDispose) {
            const disposeMethodName = layer.dispose ? 'dispose' : 'unmount';
            layer[disposeMethodName] = (...args) => {
                return this.safeExecute(
                    () => originalDispose(...args),
                    disposeMethodName,
                    layer,
                    () => {
                        this.cleanupLayerErrors(layer);
                        dlog(`🗑️ Layer ${layer.name || layer.id} disposed successfully`);
                    }
                );
            };
        }

        return layer;
    }

    /**
     * Safely execute a visual layer method with error handling
     */
    safeExecute(fn, methodName, layer, onSuccess = null, silent = false) {
        try {
            const result = fn();

            // Reset error count on successful execution
            const errorKey = `${layer.id}-${methodName}`;
            if (this.errorCounts.has(errorKey)) {
                this.errorCounts.delete(errorKey);
            }

            if (onSuccess) onSuccess();
            return result;

        } catch (error) {
            this.handleLayerError(error, methodName, layer, silent);
            return null;
        }
    }

    /**
     * Handle errors from visual layers
     */
    handleLayerError(error, methodName, layer, silent = false) {
        const errorKey = `${layer.id}-${methodName}`;
        const currentCount = (this.errorCounts.get(errorKey) || 0) + 1;
        this.errorCounts.set(errorKey, currentCount);

        // Log error details
        const errorInfo = {
            timestamp: Date.now(),
            layerId: layer.id,
            layerName: layer.name,
            method: methodName,
            error: error.message,
            stack: error.stack,
            count: currentCount
        };

        this.addToErrorHistory(errorInfo);

        if (!silent) {
            derr(`❌ Visual Layer Error [${layer.name}:${methodName}] (${currentCount}/${this.maxRetries}):`, error);
        }

        // Quarantine layer if too many errors
        if (currentCount >= this.maxRetries) {
            this.quarantineLayer(layer, methodName);
        }

        // Attempt recovery for certain methods
        if (methodName === 'init' && currentCount < this.maxRetries) {
            this.scheduleRetry(layer, methodName);
        }
    }

    /**
     * Quarantine a problematic layer
     */
    quarantineLayer(layer, methodName) {
        this.quarantinedLayers.add(layer.id);

        dwarn(`🚨 Layer quarantined: ${layer.name} (method: ${methodName})`);
        dwarn(`Layer ${layer.name} has been disabled due to repeated errors`);

        // Try to safely disable the layer
        try {
            layer.setActive(false);
        } catch (e) {
            // Layer is too broken to even disable
        }

        // Emit quarantine event for monitoring
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('visualLayerQuarantined', {
                detail: { layerId: layer.id, layerName: layer.name, method: methodName }
            }));
        }
    }

    /**
     * Schedule retry for failed layer operations
     */
    scheduleRetry(layer, methodName) {
        const retryDelay = this.retryDelay * Math.pow(2, this.errorCounts.get(`${layer.id}-${methodName}`) - 1);

        setTimeout(() => {
            if (!this.quarantinedLayers.has(layer.id)) {
                dlog(`🔄 Retrying ${methodName} for layer ${layer.name}`);

                try {
                    if (methodName === 'init') {
                        layer.init();
                    }
                } catch (error) {
                    // Will be caught by the wrapped method
                }
            }
        }, retryDelay);
    }

    /**
     * Add error to history
     */
    addToErrorHistory(errorInfo) {
        this.errorHistory.push(errorInfo);

        // Keep history size manageable
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
        }
    }

    /**
     * Clean up error tracking for a layer
     */
    cleanupLayerErrors(layer) {
        // Remove error counts for this layer
        for (const [key] of this.errorCounts) {
            if (key.startsWith(layer.id + '-')) {
                this.errorCounts.delete(key);
            }
        }

        // Remove from quarantine
        this.quarantinedLayers.delete(layer.id);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorHistory.length,
            quarantinedLayers: this.quarantinedLayers.size,
            recentErrors: this.errorHistory.slice(-10),
            errorsByLayer: {},
            errorsByMethod: {}
        };

        // Aggregate errors by layer and method
        this.errorHistory.forEach(error => {
            stats.errorsByLayer[error.layerName] = (stats.errorsByLayer[error.layerName] || 0) + 1;
            stats.errorsByMethod[error.method] = (stats.errorsByMethod[error.method] || 0) + 1;
        });

        return stats;
    }

    /**
     * Attempt to recover a quarantined layer
     */
    attemptLayerRecovery(layerId) {
        if (!this.quarantinedLayers.has(layerId)) {
            return false;
        }

        dlog(`🔧 Attempting recovery for quarantined layer: ${layerId}`);

        // Clear error history for this layer
        const layerErrors = this.errorHistory.filter(e => e.layerId === layerId);
        this.errorHistory = this.errorHistory.filter(e => e.layerId !== layerId);

        // Reset error counts
        for (const [key] of this.errorCounts) {
            if (key.startsWith(layerId + '-')) {
                this.errorCounts.delete(key);
            }
        }

        // Remove from quarantine
        this.quarantinedLayers.delete(layerId);

        dlog(`✅ Layer ${layerId} removed from quarantine`);
        return true;
    }

    /**
     * Clear all error data (for debugging)
     */
    clearErrorData() {
        this.errorCounts.clear();
        this.quarantinedLayers.clear();
        this.errorHistory = [];
        dlog('🧹 Error boundary data cleared');
    }

    /**
     * Check if a layer is quarantined
     */
    isLayerQuarantined(layerId) {
        return this.quarantinedLayers.has(layerId);
    }

    /**
     * Get health status of the visual layer system
     */
    getSystemHealth() {
        const recentErrorCount = this.errorHistory.filter(
            e => Date.now() - e.timestamp < 60000 // Last minute
        ).length;

        let health = 'good';
        if (recentErrorCount > 5) health = 'degraded';
        if (recentErrorCount > 10 || this.quarantinedLayers.size > 0) health = 'poor';

        return {
            status: health,
            recentErrors: recentErrorCount,
            quarantinedCount: this.quarantinedLayers.size,
            totalErrors: this.errorHistory.length
        };
    }
}

// Export singleton instance
export const visualLayerErrorBoundary = new VisualLayerErrorBoundary();

export default VisualLayerErrorBoundary;
