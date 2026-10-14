/**
 * Default Visual Type Registration
 * Registers all placeholder and implemented visual types
 * Import this once at app startup to populate the registry
 * @module register-defaults
 */

import { registerFlow, registerStructure } from './registry.js';
import { visualLayerRegistry } from './VisualLayerRegistry.js';
import { dlog, dwarn, derr } from '../utils/devlog.js';
import { HeavyFog } from './flows/HeavyFog.js';
import { SimpleFog } from './flows/SimpleFog.js';
import { ColdHaze } from './flows/ColdHaze.js';
import { InkTendrils } from './flows/InkTendrils.js';
import { MistyRain } from './flows/MistyRain.js';
import { FallingAshOptimized } from './flows/FallingAshOptimized.js';
import { StarDustFieldEnhanced } from './flows/StarDustFieldEnhanced.js';
import { AIVideoBackground } from './flows/AIVideoBackground.js';
import { AudioReactiveShader } from './flows/AudioReactiveShader.js';
import { EmberRingAscent } from './flows/EmberRingAscent.js';
import { EggOrb } from './structures/EggOrb.js';
import { Monolith } from './structures/Monolith.js';
import { MonolithGrid } from './structures/MonolithGrid.js';
import { MonolithGridSimple } from './structures/MonolithGridSimple.js';
import { DistantShards } from './structures/DistantShards.js';
import { DistantShardsEnhanced } from './structures/DistantShardsEnhanced.js';
import { GlitchingCage } from './structures/GlitchingCage.js';
import { GlitchingCageEnhanced } from './structures/GlitchingCageEnhanced.js';
import { DriftingWireframes } from './structures/DriftingWireframes.js';
import { StreetlightCone } from './structures/StreetlightCone.js';
import { VoidSphere } from './structures/VoidSphere.js';
import { VoidVeil } from './structures/VoidVeil.js';
import { VoidCompressionRing } from './structures/VoidCompressionRing.js';
import { VoidEclipseDisc } from './structures/VoidEclipseDisc.js';
import { VoidHalo } from './structures/VoidHalo.js';
import { Track5HeroModel } from './structures/Track5HeroModel.js';
// CORE-IMPORT-01: Import core visual layers for Vite bundling
import { AudioReactiveSkybox } from './core/AudioReactiveSkybox.js';
import { LightField } from './core/LightField.js';
import { CameraManager } from './core/CameraManager.js';
// MP9: Import ConsciousnessCore
import { ConsciousnessCore } from './core/ConsciousnessCore.js';
import {
  LegacyFlow,
  LegacyStructure,
  Flow_soft_particles,
  Flow_misty_rain,
  Flow_falling_ash,
  Flow_cold_haze,
  Flow_heavy_fog,
  Flow_ink_tendrils,
  Flow_star_dust_field,
  Struct_glitching_cage,
  Struct_distant_shards,
  Struct_monolith,
  Struct_monolith_grid,
  Struct_deconstructed_vertices,
  Struct_drifting_wireframes
} from './placeholders.js';

// STAB-05: Preload all imported modules into VisualLayerRegistry to avoid 404s on dynamic imports
// This ensures Vite bundles these modules and they're available at runtime
try {
  const reg = visualLayerRegistry;

  // Preload flow modules
  reg.loadedModules.set('soft_particles', { FallingAshOptimized });
  reg.loadedModules.set('misty_rain', { MistyRain });
  reg.loadedModules.set('falling_ash', { FallingAshOptimized });
  reg.loadedModules.set('cold_haze', { ColdHaze });
  reg.loadedModules.set('heavy_fog', { HeavyFog });
  reg.loadedModules.set('ink_tendrils', { InkTendrils });
  reg.loadedModules.set('star_dust_field', { StarDustFieldEnhanced });
  reg.loadedModules.set('star_dust', { StarDustFieldEnhanced }); // Alias
  reg.loadedModules.set('void_dust', { StarDustFieldEnhanced }); // Track 5 sparse halo
  reg.loadedModules.set('ai_video_background', { AIVideoBackground }); // AI test
  reg.loadedModules.set('audio_reactive_shader', { AudioReactiveShader }); // FULL-OVERHAUL
  reg.loadedModules.set('ember_ring_ascent', { EmberRingAscent }); // Track 6 ascending ember orbit

  // Preload structure modules
  reg.loadedModules.set('glitching_cage', { GlitchingCageEnhanced });
  reg.loadedModules.set('distant_shards', { DistantShardsEnhanced });
  reg.loadedModules.set('monolith', { Monolith });
  reg.loadedModules.set('monolith_grid', { MonolithGrid });
  reg.loadedModules.set('deconstructed_vertices', { EggOrb });
  reg.loadedModules.set('drifting_wireframes', { DriftingWireframes });
  reg.loadedModules.set('streetlight_cone', { StreetlightCone });
  reg.loadedModules.set('egg_crystal', { EggOrb });
  reg.loadedModules.set('void_sphere', { VoidSphere });
  reg.loadedModules.set('void_veil', { VoidVeil });
  reg.loadedModules.set('void_compression_ring', { VoidCompressionRing });
  reg.loadedModules.set('void_eclipse_disc', { VoidEclipseDisc });
  reg.loadedModules.set('void_halo', { VoidHalo });
  reg.loadedModules.set('track5_hero_model', { Track5HeroModel });

  // MP-CON-01: Only register consciousness if flag is enabled
  if (window.SONOITE_CONSCIOUSNESS) {
    reg.loadedModules.set('consciousness_core', { ConsciousnessCore });
  }

  dlog('🎨 Preloaded all visual layer modules into registry');
} catch (e) {
  derr('Failed to preload visual layer modules:', e);
}

// Always provide a legacy fallback
registerFlow('legacy', LegacyFlow);
registerStructure('legacy', LegacyStructure);

// Flow types (from journey JSONs and VISUAL_TYPES_TO_IMPLEMENT.md)
registerFlow('soft_particles', FallingAshOptimized);  // Track 01 - OPTIMIZED CINEMATIC FLAKES
registerFlow('misty_rain', MistyRain);                // Track 03 - IMPLEMENTED
registerFlow('falling_ash', FallingAshOptimized);     // Track 06 - OPTIMIZED CINEMATIC FLAKES
registerFlow('cold_haze', ColdHaze);                  // Track 07 - IMPLEMENTED
registerFlow('heavy_fog', HeavyFog);                  // Track 02 - OPTIMIZED FOG WITH 15 PLANES
registerFlow('ink_tendrils', InkTendrils);            // Track 04 - IMPLEMENTED
registerFlow('star_dust_field', StarDustFieldEnhanced); // Track 05 - ENHANCED MULTI-LAYER
registerFlow('star_dust', StarDustFieldEnhanced);     // MP-REG-ALIAS: Alias for star_dust_field
registerFlow('void_dust', StarDustFieldEnhanced);     // Track 05 - sparse void halo
registerFlow('ai_video_background', AIVideoBackground); // AI video background test
registerFlow('audio_reactive_shader', AudioReactiveShader); // FULL-OVERHAUL: Audio-reactive GLSL
registerFlow('ember_ring_ascent', EmberRingAscent);         // Track 6 - ascending ember orbit

// Bridge: also register with VisualLayerRegistry for name-based creation
try {
  const reg = visualLayerRegistry;
  // Flows
  reg.register('soft_particles',   { className: 'FallingAshOptimized', module: './flows/FallingAshOptimized.js', category: 'flow', dependencies: ['audioManager'] });
  reg.register('misty_rain',       { className: 'MistyRain',           module: './flows/MistyRain.js',           category: 'flow', dependencies: ['audioManager'] });
  reg.register('falling_ash',      { className: 'FallingAshOptimized', module: './flows/FallingAshOptimized.js', category: 'flow', dependencies: ['audioManager'] });
  reg.register('cold_haze',        { className: 'ColdHaze',            module: './flows/ColdHaze.js',            category: 'flow', dependencies: ['audioManager'] });
  reg.register('heavy_fog',        { className: 'HeavyFog',            module: './flows/HeavyFog.js',            category: 'flow', dependencies: ['audioManager'] });
  reg.register('ink_tendrils',     { className: 'InkTendrils',         module: './flows/InkTendrils.js',         category: 'flow', dependencies: ['audioManager'] });
  reg.register('star_dust_field',  { className: 'StarDustFieldEnhanced', module: './flows/StarDustFieldEnhanced.js', category: 'flow', dependencies: ['audioManager'] });
  reg.register('star_dust',        { className: 'StarDustFieldEnhanced', module: './flows/StarDustFieldEnhanced.js', category: 'flow', dependencies: ['audioManager'] }); // Alias
  reg.register('void_dust',        { className: 'StarDustFieldEnhanced', module: './flows/StarDustFieldEnhanced.js', category: 'flow', dependencies: ['audioManager'] }); // Track 5 sparse halo
  reg.register('ai_video_background', { className: 'AIVideoBackground', module: './flows/AIVideoBackground.js', category: 'flow', dependencies: ['audioManager'] }); // AI test
  reg.register('audio_reactive_shader', { className: 'AudioReactiveShader', module: './flows/AudioReactiveShader.js', category: 'flow', dependencies: ['audioManager'] }); // FULL-OVERHAUL
  reg.register('ember_ring_ascent', { className: 'EmberRingAscent', module: './flows/EmberRingAscent.js', category: 'flow', dependencies: ['audioManager'] }); // Track 6 ascending embers
  // Structures
  reg.register('glitching_cage',   { className: 'GlitchingCageEnhanced', module: './structures/GlitchingCageEnhanced.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('distant_shards',   { className: 'DistantShardsEnhanced', module: './structures/DistantShardsEnhanced.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('monolith',         { className: 'Monolith',              module: './structures/Monolith.js',        category: 'structure', dependencies: ['webgl'] });
  reg.register('monolith_grid',    { className: 'MonolithGrid',          module: './structures/MonolithGrid.js',    category: 'structure', dependencies: ['webgl'] });
  reg.register('deconstructed_vertices', { className: 'EggOrb',          module: './structures/EggOrb.js',         category: 'structure', dependencies: ['webgl','audioManager'] });
  reg.register('drifting_wireframes', { className: 'DriftingWireframes', module: './structures/DriftingWireframes.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('streetlight_cone', { className: 'StreetlightCone', module: './structures/StreetlightCone.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('void_sphere',      { className: 'VoidSphere',          module: './structures/VoidSphere.js',     category: 'structure', dependencies: ['webgl','audioManager'] });
  reg.register('void_veil',        { className: 'VoidVeil',            module: './structures/VoidVeil.js',       category: 'structure', dependencies: ['webgl'] });
  reg.register('void_compression_ring', { className: 'VoidCompressionRing', module: './structures/VoidCompressionRing.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('void_eclipse_disc', { className: 'VoidEclipseDisc',    module: './structures/VoidEclipseDisc.js', category: 'structure', dependencies: ['webgl'] });
  reg.register('void_halo',        { className: 'VoidHalo',           module: './structures/VoidHalo.js',       category: 'structure', dependencies: ['webgl'] });
  reg.register('track5_hero_model', { className: 'Track5HeroModel',   module: './structures/Track5HeroModel.js', category: 'structure', dependencies: ['webgl'] });
  // Creative aliases
  reg.register('egg_crystal',      { className: 'EggOrb',                module: './structures/EggOrb.js',         category: 'structure', dependencies: ['webgl','audioManager'] });
  // MP-CON-01: Only register consciousness if flag is enabled
  if (window.SONOITE_CONSCIOUSNESS) {
    reg.register('consciousness_core', { className: 'ConsciousnessCore',    module: './core/ConsciousnessCore.js',    category: 'core',      dependencies: ['webgl','audioManager'] });
  }
} catch (e) {
  // Non-fatal: fallback registry still works
}

// Structure types (from journey JSONs and VISUAL_TYPES_TO_IMPLEMENT.md)
registerStructure('glitching_cage', GlitchingCageEnhanced);                   // Track 02 - ENHANCED
registerStructure('distant_shards', DistantShardsEnhanced);                   // Tracks 03, 04 - ENHANCED
registerStructure('monolith', Monolith);                                      // Track 06 - IMPLEMENTED
registerStructure('monolith_grid', MonolithGrid);                             // Track 07 - PARAM-AWARE GRID (6×6)
registerStructure('deconstructed_vertices', EggOrb);                          // Track 05 - IMPLEMENTED
registerStructure('drifting_wireframes', DriftingWireframes);                 // Track 01 - NEW LEGACY INTEGRATION
registerStructure('streetlight_cone', StreetlightCone);                       // Track 04 - authored sodium streetlight hero
registerStructure('void_sphere', VoidSphere);                                 // Subtractive darkness sphere - inverse egg
registerStructure('void_veil', VoidVeil);                                     // Track 05 - Setpiece prototype (veil/membrane)
registerStructure('void_compression_ring', VoidCompressionRing);              // Track 05 - Setpiece prototype (compression ring)
registerStructure('void_eclipse_disc', VoidEclipseDisc);                      // Track 05 - Setpiece prototype (eclipse pass)
registerStructure('void_halo', VoidHalo);                                    // Track 05 - Accretion rings for singularity
registerStructure('track5_hero_model', Track5HeroModel);                     // Track 05 - experimental sculptural hero model POC

// REG-01: Creative aliases
registerStructure('egg_crystal', EggOrb);                                     // Creative alias for EggOrb

// Log registration status in debug mode
if (window.SONOITE_DEBUG) {
  import('./registry.js').then(({ listRegistered }) => {
    const registered = listRegistered();
    dlog('[VisualRegistry] Registered types:', registered);
    dlog(`[VisualRegistry] ${registered.flows.length} flows, ${registered.structures.length} structures`);
  });
}
