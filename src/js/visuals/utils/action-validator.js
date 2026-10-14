/**
 * Action Validator for Journey Controller
 * Created: 2025-12-30 (Plan 01-04)
 *
 * Validates journey moment actions against their schemas.
 * Only logs warnings in debug mode (SONOITE_DEBUG).
 */

import { ACTION_SCHEMA } from '../../schemas/action-schema.js';

// 01-04 FIX: Safe debug mode check (works in Node.js and browser)
const isDebugMode = () => typeof window !== 'undefined' && window.SONOITE_DEBUG;

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the action passed validation
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Validate a single action against its schema
 * @param {Object} action - The action to validate { type, target, params }
 * @returns {ValidationResult}
 */
export function validateAction(action) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check action structure
  if (!action || typeof action !== 'object') {
    result.valid = false;
    result.errors.push('Action must be an object');
    return result;
  }

  const { type, target } = action;
  // 01-04 FIX: Defensive check - params can be null/undefined/non-object
  const params = (action.params && typeof action.params === 'object') ? action.params : {};

  // Check action type
  if (!type) {
    result.valid = false;
    result.errors.push('Action missing required "type" field');
    return result;
  }

  // Get schema
  const schema = ACTION_SCHEMA[type];
  if (!schema) {
    result.warnings.push(`Unknown action type: "${type}"`);
    // Unknown types are warnings, not errors (might be new/custom)
    return result;
  }

  // Check for deprecated actions
  if (schema.deprecated) {
    result.warnings.push(`Deprecated action "${type}" - use "${schema.useInstead}" instead`);
  }

  // Check for not-implemented actions
  if (schema.notImplemented) {
    result.warnings.push(`Action "${type}" is documented but not yet implemented`);
  }

  // Check target requirement
  if (schema.target === 'layer' && !target) {
    result.warnings.push(`Action "${type}" typically requires a target layer`);
  }

  // Validate params against schema
  if (schema.params) {
    for (const [paramName, paramSchema] of Object.entries(schema.params)) {
      const value = params[paramName];

      // Check required params
      if (paramSchema.required && value === undefined) {
        result.valid = false;
        result.errors.push(`Missing required param: "${paramName}"`);
        continue;
      }

      // Skip validation if param not provided (optional)
      if (value === undefined) continue;

      // Type check
      if (paramSchema.type && paramSchema.type !== 'any') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== paramSchema.type) {
          result.errors.push(`Param "${paramName}" expected ${paramSchema.type}, got ${actualType}`);
          result.valid = false;
        }
      }

      // Range check (for numbers)
      if (paramSchema.range && typeof value === 'number') {
        const [min, max] = paramSchema.range;
        if (value < min || value > max) {
          result.warnings.push(`Param "${paramName}" value ${value} outside range [${min}, ${max}]`);
        }
      }

      // Enum check
      if (paramSchema.enum && !paramSchema.enum.includes(value)) {
        result.errors.push(`Param "${paramName}" value "${value}" not in allowed values: [${paramSchema.enum.join(', ')}]`);
        result.valid = false;
      }
    }
  }

  return result;
}

/**
 * Validate an array of actions (e.g., moment.actions)
 * @param {Object[]} actions - Array of actions
 * @param {string} contextId - Context identifier for logging (e.g., moment ID)
 * @returns {Object} { valid: boolean, results: ValidationResult[] }
 */
export function validateActions(actions, contextId = '') {
  if (!Array.isArray(actions)) {
    return {
      valid: false,
      results: [{ valid: false, errors: ['Actions must be an array'], warnings: [] }]
    };
  }

  const results = actions.map((action, index) => {
    const result = validateAction(action);
    result.index = index;
    result.actionType = action?.type || 'unknown';
    return result;
  });

  const valid = results.every(r => r.valid);

  // Log in debug mode
  if (isDebugMode()) {
    const hasIssues = results.some(r => r.errors.length > 0 || r.warnings.length > 0);
    if (hasIssues) {
      console.group(`[ActionValidator] ${contextId || 'Validation'}`);
      results.forEach(r => {
        if (r.errors.length > 0) {
          console.error(`  Action ${r.index} (${r.actionType}):`, r.errors);
        }
        if (r.warnings.length > 0) {
          console.warn(`  Action ${r.index} (${r.actionType}):`, r.warnings);
        }
      });
      console.groupEnd();
    }
  }

  return { valid, results };
}

/**
 * Validate a complete moment object
 * @param {Object} moment - Moment with id, at, actions, etc.
 * @returns {Object} { valid: boolean, momentId: string, results: ValidationResult[] }
 */
export function validateMoment(moment) {
  if (!moment || typeof moment !== 'object') {
    return {
      valid: false,
      momentId: 'unknown',
      results: [{ valid: false, errors: ['Moment must be an object'], warnings: [] }]
    };
  }

  const momentId = moment.id || `moment_at_${moment.at || 'unknown'}`;
  const actions = moment.actions || [];

  const validation = validateActions(actions, momentId);

  return {
    valid: validation.valid,
    momentId,
    results: validation.results
  };
}

/**
 * Validate all moments in a journey
 * @param {Object} journey - Journey object with moments array
 * @returns {Object} { valid: boolean, journeySlug: string, momentResults: Object[] }
 */
export function validateJourney(journey) {
  if (!journey || typeof journey !== 'object') {
    return {
      valid: false,
      journeySlug: 'unknown',
      momentResults: []
    };
  }

  const journeySlug = journey.meta?.slug || 'unknown';
  const moments = journey.moments || [];

  const momentResults = moments.map(moment => validateMoment(moment));
  const valid = momentResults.every(r => r.valid);

  // Summary log in debug mode
  if (isDebugMode()) {
    const errorCount = momentResults.reduce((sum, r) =>
      sum + r.results.reduce((s, res) => s + res.errors.length, 0), 0);
    const warningCount = momentResults.reduce((sum, r) =>
      sum + r.results.reduce((s, res) => s + res.warnings.length, 0), 0);

    if (errorCount > 0 || warningCount > 0) {
      console.log(`[ActionValidator] Journey "${journeySlug}": ${errorCount} errors, ${warningCount} warnings`);
    }
  }

  return {
    valid,
    journeySlug,
    momentResults
  };
}

/**
 * Quick check if an action type is known
 * @param {string} type - Action type
 * @returns {boolean}
 */
export function isKnownActionType(type) {
  return type in ACTION_SCHEMA;
}

/**
 * Get schema for an action type
 * @param {string} type - Action type
 * @returns {Object|null}
 */
export function getSchema(type) {
  return ACTION_SCHEMA[type] || null;
}
