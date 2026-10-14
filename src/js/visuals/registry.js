/**
 * Visual Layer Registry
 * Manages registration and retrieval of visual layer constructors
 * @module registry
 */

import { dlog, dwarn, derr } from '../utils/devlog.js';

// Private storage for registered types
const _flows = Object.create(null);
const _structures = Object.create(null);

/**
 * Register a flow layer constructor
 * @param {string} name - Type name (e.g., 'misty_rain')
 * @param {Function} ctor - Constructor class extending VisualLayer
 */
export function registerFlow(name, ctor) {
  if (_flows[name] && window.SONOITE_DEBUG) {
    dwarn(`[VisualRegistry] Flow '${name}' was already registered, overriding.`);
  }
  _flows[name] = ctor;
}

/**
 * Register a structure layer constructor
 * @param {string} name - Type name (e.g., 'glitching_cage')
 * @param {Function} ctor - Constructor class extending VisualLayer
 */
export function registerStructure(name, ctor) {
  if (_structures[name] && window.SONOITE_DEBUG) {
    dwarn(`[VisualRegistry] Structure '${name}' was already registered, overriding.`);
  }
  _structures[name] = ctor;
}

/**
 * Private helper to warn about missing types
 */
function _warnMissing(kind, type) {
  if (typeof window !== 'undefined') {
    // Default to showing warnings unless explicitly disabled
    const showWarning = window.SONOITE_DEBUG ?? true;
    if (showWarning) {
      dwarn(`[VisualRegistry] Missing ${kind} mapping for '${type}'. Falling back to 'legacy'.`);
    }
  }
}

/**
 * Get flow layer constructor by type
 * @param {string} type - Flow type name
 * @returns {Function} Constructor class or legacy fallback
 */
export function getFlowCtor(type) {
  const ctor = _flows[type] || _flows['legacy'];
  if (!_flows[type]) {
    _warnMissing('flow', type);
  }
  return ctor;
}

/**
 * Get structure layer constructor by type
 * @param {string} type - Structure type name
 * @returns {Function} Constructor class or legacy fallback
 */
export function getStructureCtor(type) {
  const ctor = _structures[type] || _structures['legacy'];
  if (!_structures[type]) {
    _warnMissing('structure', type);
  }
  return ctor;
}

/**
 * List all registered types (helpful for diagnostics during boot)
 * @returns {Object} Object with flows and structures arrays
 */
export function listRegistered() {
  return {
    flows: Object.keys(_flows).sort(),
    structures: Object.keys(_structures).sort(),
  };
}

/**
 * Clear all registrations (useful for testing)
 */
export function clearRegistry() {
  Object.keys(_flows).forEach(key => delete _flows[key]);
  Object.keys(_structures).forEach(key => delete _structures[key]);
}

/**
 * Check if a specific type is registered
 * @param {string} kind - 'flow' or 'structure'
 * @param {string} type - Type name to check
 * @returns {boolean}
 */
export function isRegistered(kind, type) {
  if (kind === 'flow') return type in _flows;
  if (kind === 'structure') return type in _structures;
  return false;
}

// Expose to window for console testing
if (typeof window !== 'undefined') {
  window.visualRegistry = {
    registerFlow,
    registerStructure,
    getFlowCtor,
    getStructureCtor,
    listRegistered,
    clearRegistry,
    isRegistered
  };
}