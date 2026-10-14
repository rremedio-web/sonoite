/**
 * Shared Track 5 recut test expectations.
 *
 * Single source of truth for fixtures asserted by BOTH
 * `track5-recut-seams.test.js` and `track5-recut-config.test.js`. The two
 * suites previously kept divergent private copies of the pitchLock allowlist,
 * which drifted when the bar-43 ECU was removed and `ecu_mask_core` was
 * re-authored as an MCU (owner feedback recorded in experience.js:1708-1711
 * and :1834-1837) — leaving the seams suite red from Prompt #189 onward
 * (audit 2026-08-13 findings #5/#10). Update HERE when the authored camera
 * score changes, never in one suite alone.
 */

// Recut-authored setups permitted to carry `pitchLock: true` — exact set.
export const RECUT_PITCH_LOCK_ALLOWLIST = [
    'mcu_ridge_context',
    'ecu_knuckle_base',
    'mcu_pre_release_high',
    'mcu_plateau_shoulders',
    'mcu_residue_right'
];
