/**
 * Chamber-wide shared constants (E2-mini extraction, Prompt #204).
 *
 * Shared by the chamber runtime (experience.js) and per-track film modules
 * (films/*.js). Keep this file dependency-free — it must never import from
 * experience.js or a film module (import cycles break module-eval-time
 * object literals).
 */

export const EVENT_TYPE = Object.freeze({
    CAMERA_PUSH: 'camera_push',
    CAMERA_RESET: 'camera_reset',
    POST_CRUSH: 'post_crush',
    ROOM_OPEN: 'room_open',
    ROOM_TIGHTEN: 'room_tighten',
    MATERIAL_REVEAL: 'material_reveal',
    BLACK_GAP: 'black_gap',
    FIX: 'fix',
    BLEACH: 'bleach',
    FLASH: 'flash'
});
