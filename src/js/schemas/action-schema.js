/**
 * Action Schema Definitions for Journey Controller
 * Generated: 2025-12-30 (Plan 01-04)
 * Updated: 2025-12-31 (Plan 01.1-02) - Added god_rays, heat_haze stubs
 *
 * This module defines schemas for 74 top-level action types used in journey moments.
 * Note: journey-controller.js has 85 case statements total, but 13 are nested
 * material property operations inside the 'param' action (metalness, roughness, etc.)
 * Those are documented in ACTION_CATALOG.md but not as separate schemas here.
 *
 * Used by the runtime validator to catch contract violations early.
 */

export const ACTION_SCHEMA = {
  // ============================================
  // CAMERA ACTIONS
  // ============================================

  cam_shake: {
    target: 'camera',
    description: 'Legacy alias for camera_shake',
    deprecated: true,
    useInstead: 'camera_shake',
    params: {}
  },

  camera_behavior: {
    target: 'camera',
    description: 'Set camera movement behavior (orbit, follow, witness, architect, stationary)',
    params: {
      behavior: { type: 'string', required: true, enum: ['orbit', 'witness', 'architect', 'follow', 'stationary'] },
      target: { type: 'object', description: 'Required for follow behavior (THREE.Object3D or Vector3)' },
      damping: { type: 'number', default: 0.05, range: [0, 1] }
    },
    example: { type: 'camera_behavior', params: { behavior: 'orbit' } }
  },

  camera_dolly: {
    target: 'camera',
    description: 'Dolly camera toward/away from target',
    params: {
      // 01-04 FIX: Runtime uses params.amount (default -3.0), not params.distance
      amount: { type: 'number', default: -3.0, description: 'Dolly amount (negative = toward, positive = away)' },
      duration: { type: 'number', default: 5.0, unit: 'seconds' },
      easing: { type: 'string', default: 'easeInOutQuad' }
    },
    example: { type: 'camera_dolly', params: { amount: -5, duration: 3 } }
  },

  camera_vertigo: {
    target: 'camera',
    description: 'Spline-safe vertigo (dolly + FOV envelope)',
    params: {
      point: { type: 'array', description: 'World-space target point [x,y,z] (dolly toward this point)' },
      distance: { type: 'number', default: 1.6, description: 'Dolly distance (positive = toward point, negative = away)' },
      fovDelta: { type: 'number', default: 18, description: 'FOV delta at peak (positive widen, negative narrow)' },
      duration: { type: 'number', default: 2.6, unit: 'seconds' },
      easing: { type: 'string', default: 'easeInOutSine' }
    },
    example: { type: 'camera_vertigo', target: 'camera', params: { point: [0, 2, 0], distance: 1.6, fovDelta: 18, duration: 2.6 } }
  },

  camera_fov: {
    target: 'camera',
    description: 'Animate camera field of view',
    params: {
      fov: { type: 'number', required: true, range: [20, 120] },
      duration: { type: 'number', default: 1.0, unit: 'seconds' },
      easing: { type: 'string', default: 'easeInOutCubic' }
    },
    example: { type: 'camera_fov', params: { fov: 85, duration: 2 } }
  },

  camera_mode: {
    target: 'camera',
    description: 'Set camera operational mode',
    params: {
      mode: { type: 'string', required: true, enum: ['orbit', 'cinematic_dolly', 'handheld_panic', 'void_drift', 'stationary'] }
    },
    example: { type: 'camera_mode', params: { mode: 'cinematic_dolly' } }
  },

  camera_orbit: {
    target: 'camera',
    description: 'Configure orbit behavior parameters',
    params: {
      autoRotate: { type: 'boolean', default: true },
      autoRotateSpeed: { type: 'number', default: 0.5 },
      minDistance: { type: 'number' },
      maxDistance: { type: 'number' }
    },
    example: { type: 'camera_orbit', params: { autoRotate: true, autoRotateSpeed: 0.3 } }
  },

  camera_path: {
    target: 'camera',
    description: 'Camera path / behavior control (legacy-compatible)',
    params: {}
  },

  camera_personality: {
    target: 'camera',
    description: 'Apply track-specific camera personality preset',
    params: {
      slug: { type: 'string', required: true, description: 'Track slug (e.g., "sonoite", "nao-querer-nada")' }
    },
    example: { type: 'camera_personality', params: { slug: 'sonoite' } }
  },

  camera_shake: {
    target: 'camera',
    description: 'Trigger camera shake effect',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] },
      duration: { type: 'number', default: 0.3, unit: 'seconds' },
      decay: { type: 'number', default: 0.9, range: [0, 1] }
    },
    example: { type: 'camera_shake', target: 'camera', params: { intensity: 0.7, duration: 0.5 } }
  },

  camera_spline: {
    target: 'camera',
    description: 'Play camera along spline path',
    params: {
      spline: { type: 'string', description: 'Named spline from TRACK5_SPLINES' },
      waypoints: { type: 'array', description: 'Custom waypoints array [{pos, lookAt, fov, t}]' },
      duration: { type: 'number', default: 4.0, unit: 'seconds' },
      easing: { type: 'string', default: 'easeInOutCubic' }
    },
    example: { type: 'camera_spline', params: { spline: 'exploration_start', duration: 5 } }
  },

  fov: {
    target: 'camera',
    description: 'Direct FOV setting (use camera_fov for animation)',
    params: {
      value: { type: 'number', required: true, range: [20, 120] }
    },
    example: { type: 'fov', params: { value: 75 } }
  },

  // ============================================
  // POST-PROCESSING ACTIONS (9)
  // ============================================

  chromatic_aberration: {
    target: 'post',
    description: 'Set chromatic aberration intensity',
    params: {
      intensity: { type: 'number', default: 0.005, range: [0, 0.1] },
      duration: { type: 'number', default: 0 }
    },
    example: { type: 'chromatic_aberration', params: { intensity: 0.01 } }
  },

  climax_burst: {
    target: 'post',
    description: 'Climax visual burst effect',
    params: {
      intensity: { type: 'number', default: 1.0, range: [0, 2] },
      duration: { type: 'number', default: 0.5, unit: 'seconds' }
    },
    example: { type: 'climax_burst', params: { intensity: 1.5 } }
  },

  fade_to_black: {
    target: 'post',
    description: 'Fade screen to black',
    params: {
      duration: { type: 'number', default: 2.0, unit: 'seconds' },
      hold: { type: 'number', default: 0, description: 'Hold time at black' }
    },
    example: { type: 'fade_to_black', params: { duration: 3 } }
  },

  fog_target: {
    target: 'post',
    description: 'Set fog target values',
    params: {
      density: { type: 'number', range: [0, 1] },
      near: { type: 'number' },
      far: { type: 'number' },
      color: { type: 'string', description: 'Hex color' }
    },
    example: { type: 'fog_target', params: { density: 0.5, near: 5, far: 50 } }
  },

  hard_cut_black: {
    target: 'post',
    description: 'Instant cut to black',
    params: {
      duration: { type: 'number', default: 0, description: 'Optional fade out duration' }
    },
    example: { type: 'hard_cut_black', params: {} }
  },

  post: {
    target: 'post',
    description: 'Apply post-processing preset or individual parameters',
    params: {
      // Keep schema in sync with PostProcessingConfig presets.
      preset: { type: 'string', enum: ['balanced', 'cinematic', 'noir', 'streetlight_noir', 'inheritance', 'high', 'low', 'heavy_contrast', 'digital_decay', 'void'] },
      bloom: { type: 'number', range: [0, 2] },
      vignette: { type: 'number', range: [0, 1] },
      grain: { type: 'number', range: [0, 0.5] },
      warmth: { type: 'number', range: [0.5, 2] },
      saturation: { type: 'number', range: [0, 2] },
      duration: { type: 'number', default: 0, unit: 'seconds' }
    },
    example: { type: 'post', params: { preset: 'cinematic' } }
  },

  post_glitch: {
    target: 'post',
    description: 'Digital glitch effect burst',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1], description: 'Scales chromatic + grain' },
      chromatic: { type: 'number', description: 'Direct chromatic aberration value' },
      grain: { type: 'number', description: 'Direct grain value' },
      duration: { type: 'number', default: 0.8, unit: 'seconds' }
    },
    example: { type: 'post_glitch', params: { intensity: 0.7, duration: 0.5 } }
  },

  vortex: {
    target: 'post',
    description: 'Vortex distortion effect',
    params: {
      strength: { type: 'number', default: 0.5, range: [0, 1] },
      radius: { type: 'number', default: 0.5 },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'vortex', params: { strength: 0.8 } }
  },

  vortex_transition: {
    target: 'post',
    description: 'Vortex state transition',
    params: {
      state: { type: 'string', enum: ['in', 'out', 'pulse'] },
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'vortex_transition', params: { state: 'in' } }
  },

  // ============================================
  // LAYER LIFECYCLE ACTIONS (8)
  // ============================================

  animate: {
    target: 'layer',
    description: 'Generic uniform/property animation',
    params: {
      uniform: { type: 'string', description: 'Uniform name to animate' },
      property: { type: 'string', description: 'Property name to animate' },
      value: { type: 'number', required: true },
      duration: { type: 'number', default: 1.0 },
      easing: { type: 'string', default: 'linear' }
    },
    example: { type: 'animate', target: 'egg_crystal', params: { uniform: 'uGlow', value: 0.8, duration: 2 } }
  },

  count: {
    target: 'layer',
    description: 'Multiply particle/element count',
    params: {
      multiplier: { type: 'number', default: 1.0, range: [0.5, 2.0] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'count', target: 'misty_rain', params: { multiplier: 1.5, duration: 2 } }
  },

  dissolveAll: {
    target: 'global',
    description: 'Dissolve all visual layers',
    params: {
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'dissolveAll', params: { duration: 3 } }
  },

  dissolve_layers: {
    target: 'global',
    description: 'Dissolve specific layer categories',
    params: {
      categories: { type: 'array', description: 'Array of category names' },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'dissolve_layers', params: { categories: ['flows', 'structures'], duration: 2 } }
  },

  manifest_in: {
    target: 'layer',
    description: 'Layer entrance animation (fade in + scale)',
    params: {
      duration: { type: 'number', default: 2.5 },
      delay: { type: 'number', default: 0 },
      opacity: { type: 'number', default: 1.0, range: [0, 1] },
      scale: { type: 'number', default: 1.0 },
      easing: { type: 'string', default: 'linear' }
    },
    example: { type: 'manifest_in', target: 'egg_crystal', params: { duration: 3, opacity: 0.8 } }
  },

  manifest_out: {
    target: 'layer',
    description: 'Layer exit animation (fade out + scale)',
    params: {
      duration: { type: 'number', default: 2.0 },
      delay: { type: 'number', default: 0 },
      easing: { type: 'string', default: 'linear' }
    },
    example: { type: 'manifest_out', target: 'distant_shards', params: { duration: 2 } }
  },

  spawn: {
    target: 'layer',
    description: 'Spawn layer (fade in)',
    params: {
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'spawn', target: 'star_dust', params: { duration: 3 } }
  },

  spawn_dissolve: {
    target: 'layer',
    description: 'Spawn then dissolve layer',
    params: {
      spawnDuration: { type: 'number', default: 1.0 },
      holdDuration: { type: 'number', default: 2.0 },
      dissolveDuration: { type: 'number', default: 1.0 }
    },
    example: { type: 'spawn_dissolve', target: 'particle_burst', params: { holdDuration: 3 } }
  },

  // ============================================
  // VISUAL EFFECTS ACTIONS (19)
  // ============================================

  appear_disappear: {
    target: 'layer',
    description: 'Toggle layer visibility',
    params: {
      state: { type: 'string', default: 'appear', enum: ['appear', 'disappear'] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'appear_disappear', target: 'distant_shards', params: { state: 'appear' } }
  },

  breath: {
    target: 'layer',
    description: 'Breathing scale animation',
    params: {
      amplitude: { type: 'number', default: 0.1, range: [0, 0.5] },
      speed: { type: 'number', default: 1.0 },
      duration: { type: 'number', description: 'If set, stops after duration' }
    },
    example: { type: 'breath', target: 'egg_crystal', params: { amplitude: 0.15 } }
  },

  color_shift: {
    target: 'layer',
    description: 'Shift layer colors',
    params: {
      hue: { type: 'number', range: [-180, 180] },
      saturation: { type: 'number', range: [0, 2] },
      lightness: { type: 'number', range: [0, 2] },
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'color_shift', target: 'skybox', params: { hue: 30 } }
  },

  density: {
    target: 'layer',
    description: 'Change particle/element density',
    params: {
      multiplier: { type: 'number', default: 1.0, range: [0, 5] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'density', target: 'star_dust', params: { multiplier: 1.5 } }
  },

  drift: {
    target: 'layer',
    description: '3D position drift animation',
    params: {
      offset: { type: 'object', description: '{x, y, z} offset values' },
      duration: { type: 'number', default: 2.0 },
      easing: { type: 'string', default: 'easeInOutCubic' }
    },
    example: { type: 'drift', target: 'egg_crystal', params: { offset: { x: 0, y: 2, z: 0 }, duration: 3 } }
  },

  edge_shimmer: {
    target: 'layer',
    description: 'Edge shimmer effect',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] },
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'edge_shimmer', target: 'monolith', params: { intensity: 0.7 } }
  },

  faint_visibility: {
    target: 'layer',
    description: 'Subtle visibility change',
    params: {
      state: { type: 'string', default: 'visible', enum: ['visible', 'hidden'] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'faint_visibility', target: 'distant_shards', params: { state: 'visible' } }
  },

  gentle_shudder: {
    target: 'layer',
    description: 'Gentle shaking animation',
    params: {
      intensity: { type: 'number', default: 0.02, range: [0, 0.1] },
      duration: { type: 'number', default: 0.5 }
    },
    example: { type: 'gentle_shudder', target: 'egg_crystal', params: { intensity: 0.03 } }
  },

  glow: {
    target: 'layer',
    description: 'Glow/emissive pulse',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 2] },
      duration: { type: 'number', default: 1.0 },
      color: { type: 'string', description: 'Hex color for glow' }
    },
    example: { type: 'glow', target: 'monolith', params: { intensity: 0.8 } }
  },

  heartbeat: {
    target: 'layer',
    description: 'Heartbeat pulse animation',
    params: {
      bpm: { type: 'number', default: 60 },
      intensity: { type: 'number', default: 0.1 }
    },
    example: { type: 'heartbeat', target: 'egg_crystal', params: { bpm: 72 } }
  },

  morph: {
    target: 'layer',
    description: 'Shape morphing animation',
    params: {
      target: { type: 'string', description: 'Morph target name' },
      weight: { type: 'number', default: 1.0, range: [0, 1] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'morph', target: 'egg_crystal', params: { weight: 0.5 } }
  },

  opacity: {
    target: 'layer',
    description: 'Set layer opacity',
    params: {
      value: { type: 'number', default: 0.5, range: [0, 1] },
      duration: { type: 'number', default: 1.0 },
      easing: { type: 'string', default: 'easeInOutCubic' }
    },
    example: { type: 'opacity', target: 'star_dust', params: { value: 0.7, duration: 2 } }
  },

  scale: {
    target: 'layer',
    description: 'Scale layer',
    params: {
      value: { type: 'number', required: true },
      duration: { type: 'number', default: 1.0 },
      easing: { type: 'string', default: 'easeInOutCubic' }
    },
    example: { type: 'scale', target: 'egg_crystal', params: { value: 1.2, duration: 2 } }
  },

  shimmer: {
    target: 'layer',
    description: 'Material emissive pulse',
    params: {
      amount: { type: 'number', default: 0.5, range: [0, 1] },
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'shimmer', target: 'egg_crystal', params: { amount: 0.3 } }
  },

  sparkle: {
    target: 'layer',
    description: 'Sparkle particle burst',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] },
      count: { type: 'number', default: 50 }
    },
    example: { type: 'sparkle', target: 'egg_crystal', params: { intensity: 0.7 } }
  },

  spin: {
    target: 'layer',
    description: 'Start spinning animation',
    params: {
      speed: { type: 'number', default: 1.0 },
      axis: { type: 'string', default: 'y', enum: ['x', 'y', 'z'] }
    },
    example: { type: 'spin', target: 'monolith', params: { speed: 0.5, axis: 'y' } }
  },

  spin_stop: {
    target: 'layer',
    description: 'Stop spinning animation',
    params: {
      duration: { type: 'number', default: 1.0, description: 'Deceleration time' }
    },
    example: { type: 'spin_stop', target: 'monolith', params: { duration: 2 } }
  },

  subtle_scale: {
    target: 'layer',
    description: 'Subtle scale change',
    params: {
      factor: { type: 'number', default: 1.05, range: [0.9, 1.2] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'subtle_scale', target: 'egg_crystal', params: { factor: 1.1 } }
  },

  turbulence: {
    target: 'layer',
    description: 'Add turbulence to particle/flow',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'turbulence', target: 'star_dust', params: { intensity: 0.6 } }
  },

  veil: {
    target: 'layer',
    description: 'Veil overlay effect',
    params: {
      opacity: { type: 'number', default: 0.3, range: [0, 1] },
      color: { type: 'string', description: 'Hex color' }
    },
    example: { type: 'veil', target: 'scene', params: { opacity: 0.4 } }
  },

  waft: {
    target: 'layer',
    description: 'Waft/drift animation for haze/fog layers',
    params: {
      amount: { type: 'number', default: 0.3, range: [0, 1] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'waft', target: 'cold_haze', params: { amount: 0.4, duration: 3 } }
  },

  pulse: {
    target: 'layer',
    description: 'Pulsing intensity effect',
    params: {
      intensity: { type: 'number', default: 0.3, range: [0, 1] },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'pulse', target: 'monolith', params: { intensity: 0.5 } }
  },

  // ============================================
  // TRACK-SPECIFIC ACTIONS (8)
  // ============================================

  egg_crack: {
    target: 'layer',
    description: 'Egg cracking animation (Track 1)',
    trackSpecific: 'sonoite',
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] }
    },
    example: { type: 'egg_crack', target: 'egg_crystal', params: { intensity: 0.8 } }
  },

  egg_freeze: {
    target: 'layer',
    description: 'Freeze egg animation (Track 1)',
    trackSpecific: 'sonoite',
    params: {
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'egg_freeze', target: 'egg_crystal', params: { duration: 2 } }
  },

  egg_thaw: {
    target: 'layer',
    description: 'Thaw frozen egg (Track 1)',
    trackSpecific: 'sonoite',
    params: {
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'egg_thaw', target: 'egg_crystal', params: { duration: 3 } }
  },

  gravity: {
    target: 'layer',
    description: 'Set gravity field (Track 5)',
    trackSpecific: 'nao-querer-nada',
    params: {
      strength: { type: 'number', default: 0, range: [0, 1] },
      spiralRate: { type: 'number', default: 0.5 },
      center: { type: 'object', default: { x: 0, y: 2, z: 0 } },
      radius: { type: 'number', default: 15 },
      eventHorizon: { type: 'number', default: 2.5 },
      spaghettiStrength: { type: 'number', default: 0, range: [0, 1] },
      spaghettiRadius: { type: 'number', default: 10 }
    },
    example: { type: 'gravity', target: 'star_dust', params: { strength: 0.5, spiralRate: 0.3 } }
  },

  vortex: {
    target: 'layer',
    description: 'Attractor vortex for curved trajectories (Track 5)',
    trackSpecific: 'nao-querer-nada',
    params: {
      strength: { type: 'number', default: 0, range: [0, 3] },
      speed: { type: 'number', default: 0 },
      duration: { type: 'number', default: 0 },
      easing: { type: 'string', default: 'easeInOutCubic' },
      height: { type: 'number', default: 10.0 },
      topRadius: { type: 'number', default: 8.0 },
      bottomRadius: { type: 'number', default: 1.0 },
      riseSpeed: { type: 'number', default: 0.8 },
      spiralTightness: { type: 'number', default: 2.0 }
    },
    example: { type: 'vortex', target: 'void_dust', params: { strength: 1.2, speed: 2.0, duration: 3.0 } }
  },

  void_glow: {
    target: 'layer',
    description: 'Particle void atmosphere cue near event horizon (Track 5)',
    trackSpecific: 'nao-querer-nada',
    params: {
      value: { type: 'number', default: 0, range: [0, 1] },
      intensity: { type: 'number', default: 0, range: [0, 1] },
      duration: { type: 'number', default: 0 }
    },
    example: { type: 'void_glow', target: 'void_dust', params: { value: 0.45, duration: 6.0 } }
  },

  lock_motion: {
    target: 'layer',
    description: 'Lock layer motion',
    params: {},
    example: { type: 'lock_motion', target: 'egg_crystal' }
  },

  unlock_motion: {
    target: 'layer',
    description: 'Unlock layer motion',
    params: {},
    example: { type: 'unlock_motion', target: 'egg_crystal' }
  },

  void_lens: {
    target: 'layer',
    description: 'Void lens distortion (Track 5)',
    trackSpecific: 'nao-querer-nada',
    params: {
      strength: { type: 'number', default: 0.5, range: [0, 1] },
      radius: { type: 'number', default: 0.5 },
      duration: { type: 'number', default: 1.0 }
    },
    example: { type: 'void_lens', target: 'void_sphere', params: { strength: 0.8 } }
  },

  void_lens_pulse: {
    target: 'layer',
    description: 'Void lens pulse (attack + decay)',
    trackSpecific: 'nao-querer-nada',
    params: {
      attack: { type: 'number', default: 0.1 },
      decay: { type: 'number', default: 2.0 },
      peak: { type: 'number', default: 1.0 }
    },
    example: { type: 'void_lens_pulse', target: 'void_sphere', params: { peak: 0.8 } }
  },

  // ============================================
  // AUDIO ACTIONS (3)
  // ============================================

  choreography: {
    target: 'layer',
    description: 'Apply a choreography pattern to a visual layer',
    params: {
      // MP-GRID-03: Support both 'pattern' and 'behavior' naming
      pattern: { type: 'string', description: 'Choreography pattern (row_pulse, orbit, scatter, etc)' },
      behavior: { type: 'string', description: 'Alias for pattern' },

      // Common params
      speed: { type: 'number', default: 1.0 },
      damping: { type: 'number', default: 0.8 },
      amplitude: { type: 'number', default: 1.0 },
      intensity: { type: 'number', default: 0.5 },
      duration: { type: 'number', default: 3.0 },

      // Optional geometry params used by some layers
      center: { type: 'array' },
      radius: { type: 'number' }
    },
    example: { type: 'choreography', target: 'monolith_grid', params: { pattern: 'row_pulse', intensity: 0.7, duration: 5.0 } }
  },

  link_audio: {
    target: 'layer',
    description: 'Link audio feature to uniform with optional signal pipeline',
    params: {
      uniform: { type: 'string', required: true, description: 'Uniform name to modulate' },
      feature: { type: 'string', description: 'Audio feature (bass, mid, treble, loudness, kick, transient, centroid_norm)' },
      band: { type: 'string', description: 'Alias for feature' },
      min: { type: 'number', default: 0 },
      max: { type: 'number', default: 1 },
      smoothing: { type: 'number', default: 0.15, range: [0, 1] },
      invert: { type: 'boolean', default: false },
      combine: { type: 'string', default: 'replace', enum: ['replace', 'add', 'multiply', 'modulate'] },
      baseValue: { type: 'number', description: 'Base value for modulate mode' },
      // 01-05: Signal pipeline for advanced shaping
      preset: { type: 'string', enum: ['punch', 'breath', 'transient', 'wave', 'inverse_breath'], description: 'Named pipeline preset' },
      pipeline: {
        type: 'object',
        description: 'Advanced signal shaping (subsample, curve, gate, envelope, modulateBy)',
        params: {
          subsample: { type: 'number', default: 1, range: [1, 10], description: 'Process every Nth frame' },
          curve: { type: 'string', enum: ['linear', 'exponential', 'logarithmic', 's-curve'], description: 'Response curve' },
          curveExponent: { type: 'number', default: 2.0, range: [1, 5], description: 'Exponent for exponential/s-curve' },
          gate: { type: 'number', default: 0, range: [0, 1], description: 'Hard threshold cutoff' },
          envelope: { type: 'object', description: '{ attack, release, hold } in seconds' },
          modulateBy: { type: 'object', description: '{ feature, amount } cross-feature modulation' }
        }
      }
    },
    example: { type: 'link_audio', target: 'star_dust', params: { uniform: 'uGlow', feature: 'bass', min: 0.2, max: 0.8, preset: 'punch' } }
  },

  unlink_audio: {
    target: 'layer',
    description: 'Remove audio link',
    params: {
      uniform: { type: 'string', description: 'Specific uniform to unlink (or all if omitted)' }
    },
    example: { type: 'unlink_audio', target: 'star_dust', params: { uniform: 'uGlow' } }
  },

  // ============================================
  // SCENE STATE ACTIONS (5)
  // ============================================

  freeze: {
    target: 'global',
    description: 'Freeze scene',
    params: {
      duration: { type: 'number', default: 0, description: 'Freeze for duration then auto-unfreeze' }
    },
    example: { type: 'freeze', params: { duration: 5 } }
  },

  motion_mode: {
    target: 'global',
    description: 'Set global motion mode',
    params: {
      mode: { type: 'string', required: true, enum: ['drift', 'spiral', 'cascade', 'pulse', 'freeze', 'chaos', 'void_eater'] }
    },
    example: { type: 'motion_mode', params: { mode: 'drift' } }
  },

  param: {
    target: 'layer',
    description: 'Set arbitrary layer parameter',
    params: {
      name: { type: 'string', required: true },
      value: { type: 'any', required: true },
      operation: { type: 'string', default: 'replace', enum: ['replace', 'add', 'multiply', 'modulate'] },
      duration: { type: 'number', default: 0 }
    },
    example: { type: 'param', target: 'egg_crystal', params: { name: 'metalness', value: 0.8 } }
  },

  phase: {
    target: 'global',
    description: 'Set journey phase',
    params: {
      // 01-04 FIX: Runtime uses params.phase, not params.name
      phase: { type: 'string', required: true, description: 'Phase name (e.g., ASCEND, FRACTURE, ECLIPSE)' }
    },
    example: { type: 'phase', params: { phase: 'FRACTURE' } }
  },

  unfreeze: {
    target: 'global',
    description: 'Unfreeze scene',
    params: {
      duration: { type: 'number', default: 1.0, description: 'Unfreeze transition duration' }
    },
    example: { type: 'unfreeze', params: { duration: 2 } }
  },

  // ============================================
  // GRID PATTERN ACTIONS (7)
  // These are handled inside grid-specific handlers
  // ============================================

  column_pulse: {
    target: 'layer',
    description: 'Pulse grid columns',
    params: {
      column: { type: 'number', description: 'Specific column or -1 for all' },
      intensity: { type: 'number', default: 0.5 }
    },
    example: { type: 'column_pulse', target: 'monolith_grid', params: { column: 3 } }
  },

  converge: {
    target: 'layer',
    description: 'Converge grid elements to center',
    params: {
      duration: { type: 'number', default: 2.0 },
      center: { type: 'object', default: { x: 0, y: 0, z: 0 } }
    },
    example: { type: 'converge', target: 'monolith_grid', params: { duration: 3 } }
  },

  diagonal: {
    target: 'layer',
    description: 'Diagonal grid pattern',
    params: {
      direction: { type: 'string', enum: ['tl-br', 'tr-bl', 'bl-tr', 'br-tl'] },
      speed: { type: 'number', default: 1.0 }
    },
    example: { type: 'diagonal', target: 'monolith_grid', params: { direction: 'tl-br' } }
  },

  flow: {
    target: 'layer',
    description: 'Flow animation pattern',
    params: {
      direction: { type: 'object', default: { x: 0, y: 1, z: 0 } },
      speed: { type: 'number', default: 1.0 }
    },
    example: { type: 'flow', target: 'monolith_grid', params: { speed: 0.5 } }
  },

  orbit: {
    target: 'layer',
    description: 'Orbit pattern for grid',
    params: {
      radius: { type: 'number', default: 5 },
      speed: { type: 'number', default: 1.0 }
    },
    example: { type: 'orbit', target: 'monolith_grid', params: { radius: 8 } }
  },

  row_pulse: {
    target: 'layer',
    description: 'Pulse grid rows',
    params: {
      row: { type: 'number', description: 'Specific row or -1 for all' },
      intensity: { type: 'number', default: 0.5 }
    },
    example: { type: 'row_pulse', target: 'monolith_grid', params: { row: 2 } }
  },

  scatter: {
    target: 'layer',
    description: 'Scatter grid elements',
    params: {
      intensity: { type: 'number', default: 1.0 },
      duration: { type: 'number', default: 2.0 }
    },
    example: { type: 'scatter', target: 'monolith_grid', params: { intensity: 0.8 } }
  },

  // ============================================
  // NOT YET IMPLEMENTED (stubs for validation)
  // These are referenced in journeys but handlers don't exist yet
  // ============================================

  god_rays: {
    target: 'global',
    description: 'Volumetric light rays effect (not yet implemented)',
    notImplemented: true,
    params: {
      intensity: { type: 'number', default: 0.5, range: [0, 1] },
      decay: { type: 'number', default: 0.95, range: [0, 1] },
      weight: { type: 'number', default: 0.4, range: [0, 1] }
    }
  },

  heat_haze: {
    target: 'global',
    description: 'Heat distortion effect (not yet implemented)',
    notImplemented: true,
    params: {
      intensity: { type: 'number', default: 0.3, range: [0, 1] },
      speed: { type: 'number', default: 1.0 },
      scale: { type: 'number', default: 1.0 }
    }
  }
};

// Material property operations are handled inside actionParam
// They're not top-level action types, so not included here

/**
 * Get schema for an action type
 * @param {string} type - Action type
 * @returns {object|null} Schema or null if unknown
 */
export function getActionSchema(type) {
  return ACTION_SCHEMA[type] || null;
}

/**
 * Get all action types
 * @returns {string[]} Array of action type names
 */
export function getAllActionTypes() {
  return Object.keys(ACTION_SCHEMA);
}

/**
 * Get action types by category
 * @param {string} target - Target type (camera, post, layer, global)
 * @returns {string[]} Array of action type names
 */
export function getActionsByTarget(target) {
  return Object.entries(ACTION_SCHEMA)
    .filter(([, schema]) => schema.target === target)
    .map(([type]) => type);
}
