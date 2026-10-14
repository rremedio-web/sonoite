#!/usr/bin/env node
/**
 * Journey Validation Script
 * Created: 2025-12-30 (Plan 01-04)
 * Updated: 2025-12-31 (Plan 01.1-01) - Import ESM schema directly
 * Updated: 2025-12-31 (Plan 01.1-02) - Add strict mode flags for CI
 *
 * Validates all journey JSON files against action schemas.
 *
 * Usage:
 *   node scripts/validate-journeys.cjs [options]
 *
 * Options:
 *   --fail-on-unknown        Exit 1 if unknown action types found
 *   --fail-on-deprecated     Exit 1 if deprecated actions found
 *   --fail-on-not-implemented Exit 1 if notImplemented actions found
 *   --fail-on-range          Exit 1 if out-of-range values found
 *   --strict                 Enable all --fail-on-* flags
 *   --ignore-unknown=a,b     Ignore unknown warnings for these types
 *   --only-files=a,b         Only validate files matching these patterns
 *   --ignore-files=a,b       Skip files matching these patterns
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JOURNEY_DIR = path.join(__dirname, '../public/assets/journeys/phase42');

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  failOnUnknown: args.includes('--fail-on-unknown'),
  failOnDeprecated: args.includes('--fail-on-deprecated'),
  failOnNotImplemented: args.includes('--fail-on-not-implemented'),
  failOnRange: args.includes('--fail-on-range')
};

// --strict enables all fail flags
if (args.includes('--strict')) {
  flags.failOnUnknown = true;
  flags.failOnDeprecated = true;
  flags.failOnNotImplemented = true;
  flags.failOnRange = true;
}

// Parse filter flags - sanitize: trim whitespace, filter empty strings
const ignoreUnknownArg = args.find(a => a.startsWith('--ignore-unknown='));
const onlyFilesArg = args.find(a => a.startsWith('--only-files='));
const ignoreFilesArg = args.find(a => a.startsWith('--ignore-files='));

// Helper to parse CSV args safely (trim + filter empty)
const parseCSV = (arg) => arg ? arg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : [];

const filters = {
  ignoreUnknown: parseCSV(ignoreUnknownArg),
  onlyFiles: parseCSV(onlyFilesArg),
  ignoreFiles: parseCSV(ignoreFilesArg)
};

// Warning category counters (global)
const warningCounts = {
  unknown: 0,
  deprecated: 0,
  notImplemented: 0,
  range: 0,
  other: 0
};

// ACTION_SCHEMA loaded dynamically in main() - ESM import
let ACTION_SCHEMA = null;

// Validation functions (duplicated from action-validator.js for CJS compatibility)
function validateAction(action) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!action || typeof action !== 'object') {
    result.valid = false;
    result.errors.push('Action must be an object');
    return result;
  }

  const { type, target } = action;
  // 01-04 FIX: Defensive check - params can be null/undefined/non-object
  const params = (action.params && typeof action.params === 'object' && !Array.isArray(action.params)) ? action.params : {};

  if (!type) {
    result.valid = false;
    result.errors.push('Action missing required "type" field');
    return result;
  }

  const schema = ACTION_SCHEMA[type];
  if (!schema) {
    // Skip if this unknown type is in the ignore list
    if (!filters.ignoreUnknown.includes(type)) {
      result.warnings.push(`Unknown action type: "${type}"`);
      result.warningCategories = result.warningCategories || [];
      result.warningCategories.push('unknown');
      warningCounts.unknown++;
    }
    return result;
  }

  if (schema.deprecated) {
    result.warnings.push(`Deprecated action "${type}" - use "${schema.useInstead}" instead`);
    result.warningCategories = result.warningCategories || [];
    result.warningCategories.push('deprecated');
    warningCounts.deprecated++;
  }

  if (schema.notImplemented) {
    result.warnings.push(`Action "${type}" is documented but not yet implemented`);
    result.warningCategories = result.warningCategories || [];
    result.warningCategories.push('notImplemented');
    warningCounts.notImplemented++;
  }

  const hasGlobalTarget = action.all === true || params.all === true;
  if (schema.target === 'layer' && !target && !hasGlobalTarget) {
    result.warnings.push(`Action "${type}" typically requires a target layer`);
    warningCounts.other++;
  }

  if (schema.params) {
    for (const [paramName, paramSchema] of Object.entries(schema.params)) {
      const value = params[paramName];

      if (paramSchema.required && value === undefined) {
        result.valid = false;
        result.errors.push(`Missing required param: "${paramName}"`);
        continue;
      }

      if (value === undefined) continue;

      if (paramSchema.type && paramSchema.type !== 'any') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== paramSchema.type) {
          result.errors.push(`Param "${paramName}" expected ${paramSchema.type}, got ${actualType}`);
          result.valid = false;
        }
      }

      if (paramSchema.range && typeof value === 'number') {
        const [min, max] = paramSchema.range;
        if (value < min || value > max) {
          result.warnings.push(`Param "${paramName}" value ${value} outside range [${min}, ${max}]`);
          result.warningCategories = result.warningCategories || [];
          result.warningCategories.push('range');
          warningCounts.range++;
        }
      }

      if (paramSchema.enum && !paramSchema.enum.includes(value)) {
        result.errors.push(`Param "${paramName}" value "${value}" not in allowed values: [${paramSchema.enum.join(', ')}]`);
        result.valid = false;
      }
    }
  }

  return result;
}

function validateMoment(moment) {
  if (!moment || typeof moment !== 'object') {
    return {
      valid: false,
      momentId: 'unknown',
      results: [{ valid: false, errors: ['Moment must be an object'], warnings: [] }]
    };
  }

  const momentId = moment.id || `moment_at_${moment.at || 'unknown'}`;
  const actionsRaw = moment.actions;
  const actions = Array.isArray(actionsRaw) ? actionsRaw : [];

  const results = [];

  // If actions is present but not an array, treat as a structural error (don’t crash).
  if (actionsRaw !== undefined && !Array.isArray(actionsRaw)) {
    results.push({
      valid: false,
      errors: ['Moment "actions" must be an array'],
      warnings: [],
      index: -1,
      actionType: '__moment__'
    });
  }

  actions.forEach((action, index) => {
    const result = validateAction(action);
    result.index = index;
    result.actionType = action?.type || 'unknown';
    results.push(result);
  });

  return {
    valid: results.every(r => r.valid),
    momentId,
    results
  };
}

function validateJourneyFile(filePath) {
  const fileName = path.basename(filePath);
  let journey;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    journey = JSON.parse(content);
  } catch (err) {
    return {
      fileName,
      valid: false,
      parseError: err.message,
      momentResults: []
    };
  }

  const journeySlug = journey.meta?.slug || fileName.replace('.json', '');

  // 01-04 FIX: Check both moments (base journeys) and enrichedMoments (enriched files)
  const momentsRaw = journey.moments;
  const enrichedMomentsRaw = journey.enrichedMoments;
  const moments = Array.isArray(momentsRaw) ? momentsRaw : [];
  const enrichedMoments = Array.isArray(enrichedMomentsRaw) ? enrichedMomentsRaw : [];
  const allMoments = [...moments, ...enrichedMoments];

  const momentResults = [];

  // If moments/enrichedMoments are present but not arrays, report as a structural error (don’t crash).
  const structureErrors = [];
  if (momentsRaw !== undefined && !Array.isArray(momentsRaw)) {
    structureErrors.push('Journey "moments" must be an array');
  }
  if (enrichedMomentsRaw !== undefined && !Array.isArray(enrichedMomentsRaw)) {
    structureErrors.push('Journey "enrichedMoments" must be an array');
  }
  if (structureErrors.length > 0) {
    momentResults.push({
      valid: false,
      momentId: '__journey__',
      results: [{
        valid: false,
        errors: structureErrors,
        warnings: [],
        index: -1,
        actionType: '__journey__'
      }]
    });
  }

  allMoments.forEach(moment => {
    momentResults.push(validateMoment(moment));
  });
  const valid = momentResults.every(r => r.valid);

  return {
    fileName,
    journeySlug,
    valid,
    momentCount: allMoments.length,
    momentResults
  };
}

// Main execution - async to support ESM import
async function main() {
  // Import ESM schema directly - single source of truth
  const schemaPath = path.resolve(__dirname, '../src/js/schemas/action-schema.js');
  const schemaModule = await import(pathToFileURL(schemaPath).href);
  if (!schemaModule?.ACTION_SCHEMA || typeof schemaModule.ACTION_SCHEMA !== 'object') {
    throw new Error(`Invalid schema module export at ${schemaPath}: expected ACTION_SCHEMA object`);
  }
  ACTION_SCHEMA = schemaModule.ACTION_SCHEMA;

  console.log('Journey Validation Script');
  console.log('=========================\n');

  // Find all journey JSON files
  let journeyFiles = fs.readdirSync(JOURNEY_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(JOURNEY_DIR, f));

  // Apply file filters
  if (filters.onlyFiles.length > 0) {
    journeyFiles = journeyFiles.filter(f => {
      const basename = path.basename(f);
      return filters.onlyFiles.some(pattern => basename.includes(pattern));
    });
  }
  if (filters.ignoreFiles.length > 0) {
    journeyFiles = journeyFiles.filter(f => {
      const basename = path.basename(f);
      return !filters.ignoreFiles.some(pattern => basename.includes(pattern));
    });
  }

  console.log(`Found ${journeyFiles.length} journey files\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  const results = [];

  for (const file of journeyFiles) {
    const result = validateJourneyFile(file);
    results.push(result);

    if (result.parseError) {
      console.log(`\x1b[31m✗\x1b[0m ${result.fileName}: Parse error - ${result.parseError}`);
      totalErrors++;
      continue;
    }

    let fileErrors = 0;
    let fileWarnings = 0;

    for (const momentResult of result.momentResults) {
      for (const actionResult of momentResult.results) {
        fileErrors += actionResult.errors.length;
        fileWarnings += actionResult.warnings.length;
      }
    }

    totalErrors += fileErrors;
    totalWarnings += fileWarnings;

    const status = fileErrors > 0 ? '\x1b[31m✗\x1b[0m' : fileWarnings > 0 ? '\x1b[33m⚠\x1b[0m' : '\x1b[32m✓\x1b[0m';
    console.log(`${status} ${result.fileName} (${result.momentCount} moments): ${fileErrors} errors, ${fileWarnings} warnings`);

    // Print details for files with issues
    if (fileErrors > 0 || fileWarnings > 0) {
      for (const momentResult of result.momentResults) {
        const hasIssues = momentResult.results.some(r => r.errors.length > 0 || r.warnings.length > 0);
        if (hasIssues) {
          console.log(`    Moment: ${momentResult.momentId}`);
          for (const actionResult of momentResult.results) {
            if (actionResult.errors.length > 0) {
              console.log(`      \x1b[31mErrors (${actionResult.actionType}):\x1b[0m ${actionResult.errors.join(', ')}`);
            }
            if (actionResult.warnings.length > 0) {
              console.log(`      \x1b[33mWarnings (${actionResult.actionType}):\x1b[0m ${actionResult.warnings.join(', ')}`);
            }
          }
        }
      }
    }
  }

  console.log('\n=========================');
  console.log(`Total: ${totalErrors} errors, ${totalWarnings} warnings`);

  // Show warning breakdown by category
  if (totalWarnings > 0) {
    const categories = [];
    if (warningCounts.unknown > 0) categories.push(`unknown: ${warningCounts.unknown}`);
    if (warningCounts.deprecated > 0) categories.push(`deprecated: ${warningCounts.deprecated}`);
    if (warningCounts.notImplemented > 0) categories.push(`notImplemented: ${warningCounts.notImplemented}`);
    if (warningCounts.range > 0) categories.push(`range: ${warningCounts.range}`);
    if (warningCounts.other > 0) categories.push(`other: ${warningCounts.other}`);
    if (categories.length > 0) {
      console.log(`  (${categories.join(', ')})`);
    }
  }

  // Check fail flags against warning counts
  let shouldFail = totalErrors > 0;
  const failReasons = [];

  if (flags.failOnUnknown && warningCounts.unknown > 0) {
    shouldFail = true;
    failReasons.push(`unknown actions (${warningCounts.unknown})`);
  }
  if (flags.failOnDeprecated && warningCounts.deprecated > 0) {
    shouldFail = true;
    failReasons.push(`deprecated actions (${warningCounts.deprecated})`);
  }
  if (flags.failOnNotImplemented && warningCounts.notImplemented > 0) {
    shouldFail = true;
    failReasons.push(`not-implemented actions (${warningCounts.notImplemented})`);
  }
  if (flags.failOnRange && warningCounts.range > 0) {
    shouldFail = true;
    failReasons.push(`out-of-range values (${warningCounts.range})`);
  }

  if (shouldFail) {
    if (failReasons.length > 0) {
      console.log(`\n\x1b[31mValidation FAILED\x1b[0m (--fail-on-* triggered: ${failReasons.join(', ')})`);
    } else {
      console.log('\n\x1b[31mValidation FAILED\x1b[0m');
    }
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n\x1b[33mValidation passed with warnings\x1b[0m');
    process.exit(0);
  } else {
    console.log('\n\x1b[32mValidation PASSED\x1b[0m');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Validation script error:', err);
  process.exit(1);
});
