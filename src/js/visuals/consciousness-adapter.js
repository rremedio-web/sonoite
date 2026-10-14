/**
 * Consciousness System Adapter for Visual Layer API
 * Bridges the new Visual Layer API with the existing consciousness system
 * @module consciousness-adapter
 */

import * as THREE from 'three';
import { getFlowCtor, getStructureCtor } from './registry.js';
import { loadJourneyByTrackId } from './journey-loader.js';
import { getRootScene } from '../three-root.js';
import { dlog, dwarn, derr } from '../utils/devlog.js';
import { FallingAshOptimized } from './flows/FallingAshOptimized.js';

export class ConsciousnessAdapter {
  constructor(scene, audioManager, camera) {
    // Always use the root scene to ensure consistency
    this.scene = getRootScene();
    this.audioManager = audioManager;
    this.camera = camera;
    
    dlog('[ConsciousnessAdapter] Initialized with root scene:', this.scene);
    dlog('[ConsciousnessAdapter] Scene ID:', this.scene?.uuid);
    dlog('[ConsciousnessAdapter] Scene children count:', this.scene?.children.length);
    
    // Visual layers
    this.flowLayer = null;
    this.structureLayer = null;
    this.coreLayer = null;
    
    // Current journey data
    this.currentJourney = null;
    this.currentSection = null;
    this.sectionIndex = 0;
    
    // Context for visual layers - always use root scene
    this.ctx = {
      THREE: THREE,
      scene: this.scene,
      camera: this.camera,
      audio: {
        getFrame: () => this.getAudioFrame()
      },
      palette: {
        primary: '#0a0a12',
        secondary: '#2f2f4f',
        accent: '#d7d7e0'
      }
    };
    
    // Track timing
    this.startTime = 0;
    this.currentTime = 0;
  }
  
  /**
   * Load journey from filename (for testing)
   * @param {string} filename - Journey filename like 'gemini_journeys_data_v2.json'
   */
  async loadJourney(filename) {
    try {
      const response = await fetch(`/wp-content/themes/sonoite-theme/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }
      
      const journeyData = await response.json();
      dlog('[ConsciousnessAdapter] Loaded journey data:', journeyData);
      
      // For v1.2 format, use the journey directly
      this.currentJourney = journeyData;
      this.startTime = performance.now();
      
      // Create synthetic section from journey data
      const syntheticSection = {
        name: 'main',
        type: 'full',
        flow: journeyData.flow,
        structure: journeyData.structure,
        core: journeyData.core,
        palette: journeyData.scene?.palette
      };
      
      this.transitionToSection(syntheticSection);
      dlog(`[ConsciousnessAdapter] Journey loaded successfully from ${filename}`);
      
    } catch (error) {
      derr(`Failed to load journey from ${filename}:`, error);
      this.useDefaultVisuals();
    }
  }

  /**
   * Load journey for a specific track
   * @param {string} trackId - Track ID like '02_paralisia_do_sono'
   */
  async loadTrackJourney(trackId) {
    try {
      this.currentJourney = await loadJourneyByTrackId(trackId);
      
      if (!this.currentJourney) {
        dwarn(`No journey found for track ${trackId}, using defaults`);
        this.useDefaultVisuals();
        return;
      }
      
      // Start from first section
      this.sectionIndex = -1; // Start at -1 so first section loads
      this.startTime = performance.now();
      
      // Handle v1.2 journey format (no sections, direct flow/structure)
      if (!this.currentJourney.sections) {
        dlog('[ConsciousnessAdapter] Journey v1.2 format detected - using direct flow/structure');
        // Create a synthetic section from the journey data
        const syntheticSection = {
          name: 'main',
          type: 'full',
          flow: this.currentJourney.flow,
          structure: this.currentJourney.structure,
          structureElements: this.currentJourney.structureElements, // Include additional structures!
          core: this.currentJourney.core,
          palette: this.currentJourney.scene?.palette
        };
        this.transitionToSection(syntheticSection);
      } else if (this.currentJourney.sections.length > 0) {
        // Original section-based format
        dlog('[ConsciousnessAdapter] Loading first section:', this.currentJourney.sections[0]);
        this.transitionToSection(this.currentJourney.sections[0]);
      } else {
        dwarn('[ConsciousnessAdapter] No sections found in journey!');
      }
      
      dlog(`Loaded journey for track ${trackId}:`, this.currentJourney.track?.title || this.currentJourney.title || trackId);
      
    } catch (error) {
      derr(`Failed to load journey for ${trackId}:`, error);
      this.useDefaultVisuals();
    }
  }
  
  /**
   * Update current section based on playback time
   */
  updateSection() {
    if (!this.currentJourney || !this.currentJourney.sections) return;
    
    const sections = this.currentJourney.sections;
    const elapsed = (performance.now() - this.startTime) / 1000; // Convert to seconds
    
    // Find current section based on time
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (elapsed >= section.start_time && elapsed < section.end_time) {
        if (this.sectionIndex !== i) {
          this.sectionIndex = i;
          this.transitionToSection(section);
        }
        break;
      }
    }
  }
  
  /**
   * Transition to a new section
   */
  transitionToSection(section) {
    this.currentSection = section;
    
    dlog(`Transitioning to section: ${section.name} (${section.type})`);
    dlog('Section flow:', section.flow);
    dlog('Section structure:', section.structure);
    
    // Unmount old layers
    this.unmountLayers();
    
    // Create new layers based on section
    if (section.flow) {
      const FlowCtor = getFlowCtor(section.flow.type);
      console.info('[Adapter] Creating flow layer:', section.flow.type, FlowCtor?.name);
      this.flowLayer = new FlowCtor(this.ctx);
      // Ensure palette is passed to flow params
      const flowConfig = {
        ...section.flow.params,
        palette: section.flow.params?.palette || 
                 (section.palette ? [section.palette.secondary, section.palette.accent] : undefined)
      };
      this.flowLayer.setConfig(flowConfig);
      this.flowLayer.mount();
      console.info('[Adapter] Flow layer mounted:', this.flowLayer.isMounted());
      console.info('[Adapter] Flow layer group:', this.flowLayer.group);
      console.info('[Adapter] Flow layer group in scene:', this.flowLayer.group?.parent === this.scene);
      console.info('[Adapter] Scene UUID:', this.scene?.uuid);
      console.info('[Adapter] Flow group UUID:', this.flowLayer.group?.uuid);
    }
    
    if (section.structure) {
      const StructCtor = getStructureCtor(section.structure.type);
      console.info('[Adapter] Creating structure layer:', section.structure.type, StructCtor?.name);
      this.structureLayer = new StructCtor(this.ctx);
      this.structureLayer.setConfig(section.structure.params || {});
      this.structureLayer.mount();
      console.info('[Adapter] Structure layer mounted:', this.structureLayer.isMounted());
      console.info('[Adapter] Structure layer group:', this.structureLayer.group);
      console.info('[Adapter] Structure layer group in scene:', this.structureLayer.group?.parent === this.scene);
      console.info('[Adapter] Structure group UUID:', this.structureLayer.group?.uuid);
    }

    // Multi-structure support (optional): mount any additional structure elements
    if (Array.isArray(section.structureElements) && section.structureElements.length) {
      section.structureElements.forEach((el, idx) => {
        try {
          const Ctor = getStructureCtor(el.type);
          console.info('[Adapter] Creating extra structure element:', el.type, Ctor?.name);
          const layer = new Ctor(this.ctx);
          layer.setConfig(el.params || {});
          layer.mount();
          // Track in array for updates/dispose
          this.extraStructureLayers = this.extraStructureLayers || [];
          this.extraStructureLayers.push(layer);
          
          // Debug visibility and position
          if (layer.group) {
            console.info(`[Adapter] Extra structure ${idx} (${el.type}):`, {
              position: layer.group.position.toArray(),
              scale: layer.group.scale.toArray(),
              visible: layer.group.visible,
              childrenCount: layer.group.children.length,
              parentScene: layer.group.parent === this.scene
            });
            
            // Log each child's bounds
            layer.group.traverse((child) => {
              if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                console.info(`  - Child mesh bounds:`, {
                  center: center.toArray(),
                  size: size.toArray(),
                  visible: child.visible,
                  material: child.material?.type
                });
              }
            });
          }
        } catch (e) {
          console.warn('[Adapter] Failed to mount extra structure', el.type, e);
        }
      });
      
      // Check for overlapping positions
      console.info('[Adapter] Checking for overlapping elements...');
      if (this.flowLayer?.group) {
        const flowBox = new THREE.Box3().setFromObject(this.flowLayer.group);
        console.info('Flow layer bounds:', flowBox.min.toArray(), 'to', flowBox.max.toArray());
      }
      if (this.structureLayer?.group) {
        const structBox = new THREE.Box3().setFromObject(this.structureLayer.group);
        console.info('Main structure bounds:', structBox.min.toArray(), 'to', structBox.max.toArray());
      }
      
      // Camera and scene info
      console.info('[Adapter] Camera info:', {
        position: this.camera.position.toArray(),
        fov: this.camera.fov,
        near: this.camera.near,
        far: this.camera.far,
        aspect: this.camera.aspect
      });
      
      // Check if elements are within camera frustum
      const frustum = new THREE.Frustum();
      const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix, 
        this.camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(cameraMatrix);
      
      let visibleCount = 0;
      let totalCount = 0;
      this.scene.traverse((child) => {
        if (child.isMesh) {
          totalCount++;
          if (frustum.intersectsObject(child)) {
            visibleCount++;
          }
        }
      });
      console.info(`[Adapter] Camera frustum check: ${visibleCount}/${totalCount} meshes in view`);
    }
    
    // Update palette if provided
    if (section.palette) {
      this.ctx.palette = { ...this.ctx.palette, ...section.palette };
    }
  }
  
  /**
   * Use default visuals when no journey is available
   */
  useDefaultVisuals() {
    // Use legacy placeholders as fallback
    const FlowCtor = getFlowCtor('legacy');
    const StructCtor = getStructureCtor('legacy');
    
    this.flowLayer = new FlowCtor(this.ctx);
    this.flowLayer.mount();
    
    this.structureLayer = new StructCtor(this.ctx);
    this.structureLayer.mount();
  }
  
  /**
   * Load idle state visuals (before any track plays)
   * ENHANCED - AbstractConsciousness PLUS new visual layers
   */
  loadIdleState() {
    dlog('[ConsciousnessAdapter] Loading enhanced idle state with AbstractConsciousness + new visuals');
    
    // Unmount any existing journey layers
    this.unmountLayers();
    
    // Store all idle layers in an array
    this.idleLayers = [];
    
    // Configuration for idle effects - ENABLE EVERYTHING
    const idleLayersCfg = (typeof window !== 'undefined' && window.SONOITE_IDLE_LAYERS) 
      ? window.SONOITE_IDLE_LAYERS 
      : {
          particles: true,
          coreOrb: true,
          tendrils: true,  // Enable tendrils
          monolith: true,
          fog: true,
          haze: true,
          eggOrb: true,  // Add egg orb
          distantShards: true,  // Add distant shards
          glitchingCage: true  // Add glitching cage too
        };
    
    // Palette configuration
    const idlePalette = ['#4a5568', '#718096'];
    
    // Cold Haze for background atmosphere
    if (idleLayersCfg.haze) {
      const ColdHazeCtor = getFlowCtor('cold_haze');
      const hazeLayer = new ColdHazeCtor(this.ctx);
      hazeLayer.setConfig({
        palette: ['#56667a', '#7a8899']
      });
      hazeLayer.mount();
      this.idleLayers.push(hazeLayer);
    }
    
    // Light fog for atmosphere (reduced for visibility)
    if (idleLayersCfg.fog) {
      const HeavyFogCtor = getFlowCtor('heavy_fog');
      const fogLayer = new HeavyFogCtor(this.ctx);
      fogLayer.setConfig({
        palette: idlePalette,
        count: 8,  // Fewer planes
        density: 0.3,  // Much lighter
        opacity: 0.1,  // Very transparent
        movement: 0.05
      });
      fogLayer.mount();
      this.idleLayers.push(fogLayer);
    }
    
    // Cinematic falling ash particles (optimized)
    if (idleLayersCfg.particles && FallingAshOptimized) {
      const particles = new FallingAshOptimized(this.ctx);
      particles.setConfig({ 
        count: 400,  // Optimized count
        palette: idlePalette 
      });
      particles.mount();
      if (particles.group) {
        particles.group.scale.setScalar(1.5);  // Balanced scale
        particles.group.position.set(0, 1, -2);
      }
      this.idleLayers.push(particles);
    }
    
    // Enhanced star dust field - cosmic background with depth layers
    if (idleLayersCfg.starDust !== false) {  // Default to true
      const StarDustFieldCtor = getFlowCtor('star_dust_field');
      const starDust = new StarDustFieldCtor(this.ctx);
      starDust.setConfig({ 
        // Enhanced version uses multi-layer system internally
        palette: ['#e5e7eb', '#d1d5db']
      });
      starDust.mount();
      this.idleLayers.push(starDust);
    }
    
    // Ink Tendrils - disabled by default for performance
    if (idleLayersCfg.tendrils) {
      const InkTendrilsCtor = getFlowCtor('ink_tendrils');
      const tendrilsLayer = new InkTendrilsCtor(this.ctx);
      tendrilsLayer.setConfig({
        palette: idlePalette,
        count: 2  // Reduced for performance
      });
      tendrilsLayer.mount();
      this.idleLayers.push(tendrilsLayer);
    }
    
    // Add consciousness spheres BUT SMALLER
    if (idleLayersCfg.coreOrb !== false) {  // Default to true
      const ConsciousnessCtor = getStructureCtor('consciousness_spheres');
      const consciousnessSpheres = new ConsciousnessCtor(this.ctx);
      consciousnessSpheres.mount();
      if (consciousnessSpheres.group) {
        consciousnessSpheres.group.position.set(-1, 0, 0);
        consciousnessSpheres.group.scale.setScalar(0.5); // MUCH smaller
      }
      this.idleLayers.push(consciousnessSpheres);
    }
    
    // Add platonic solids for variety
    if (idleLayersCfg.platonicSolids !== false) {
      const LegacyShapesCtor = getStructureCtor('legacy_shapes');
      const platonicShapes = new LegacyShapesCtor(this.ctx);
      platonicShapes.setConfig({
        count: 5,
        baseScale: 0.6,
        spread: 4,
        wireframe: false
      });
      platonicShapes.mount();
      if (platonicShapes.group) {
        platonicShapes.group.position.set(2, 0, -1);
        platonicShapes.group.scale.setScalar(0.8);
      }
      this.idleLayers.push(platonicShapes);
    }
    
    // Monolith for contrast (moderate scale)
    if (idleLayersCfg.monolith) {
      const MonolithCtor = getStructureCtor('monolith');
      const monolithLayer = new MonolithCtor(this.ctx);
      monolithLayer.mount();
      if (monolithLayer.group) {
        monolithLayer.group.position.set(4.5, 0, -1);
        monolithLayer.group.scale.setScalar(1.5);  // Moderate scale
      }
      this.idleLayers.push(monolithLayer);
    }
    
    // Distant shards - translucent frost shards in the distance
    if (idleLayersCfg.distantShards !== false) {  // Default to true
      const DistantShardsCtor = getStructureCtor('distant_shards');
      const shardsLayer = new DistantShardsCtor(this.ctx);
      shardsLayer.setConfig({
        count: 80  // Moderate count for subtle effect
      });
      shardsLayer.mount();
      this.idleLayers.push(shardsLayer);
    }
    
    // Glitching cage - enhanced multi-layer cage with glitch effects
    if (idleLayersCfg.glitchingCage !== false) {  // Default to true
      const GlitchingCageCtor = getStructureCtor('glitching_cage');
      const cageLayer = new GlitchingCageCtor(this.ctx);
      cageLayer.mount();
      if (cageLayer.group) {
        cageLayer.group.position.set(0, 0, -2); // Centered, slightly back
        cageLayer.group.scale.setScalar(2.5); // Much larger for visibility
      }
      this.idleLayers.push(cageLayer);
    }
    
    // EggOrb - the wireframe egg with spikes
    if (idleLayersCfg.eggOrb) {
      const EggOrbCtor = getStructureCtor('deconstructed_vertices'); // EggOrb is registered as deconstructed_vertices
      const eggOrb = new EggOrbCtor(this.ctx);
      eggOrb.setConfig({
        spikeBase: 0.04,
        spikeAmp: 0.08
      });
      eggOrb.mount();
      if (eggOrb.group) {
        eggOrb.group.position.set(3, 1, -1); // Offset to the right
        eggOrb.group.scale.setScalar(0.8);
      }
      this.idleLayers.push(eggOrb);
    }
    
    // Flow Legacy Shapes - organic flowing forms from flow-consciousness
    if (idleLayersCfg.flowLegacyShapes !== false) {  // Default to true
      const FlowLegacyCtor = getFlowCtor('flow_legacy_shapes');
      const flowLegacy = new FlowLegacyCtor(this.ctx);
      flowLegacy.setConfig({
        formCount: 3,  // Reduced for performance
        particleCount: 100,  // Moderate particle count
        quality: 'medium'
      });
      flowLegacy.mount();
      if (flowLegacy.group) {
        flowLegacy.group.position.set(-3, 1, 1); // Offset to the left-back
        flowLegacy.group.scale.setScalar(0.7);
      }
      this.idleLayers.push(flowLegacy);
    }
    
    // Set as idle state flag
    this.isIdleState = true;
    dlog('[ConsciousnessAdapter] Optimized idle state loaded with cinematic effects');
  }
  
  /**
   * Get current audio frame data
   */
  getAudioFrame() {
    if (!this.audioManager || !this.audioManager.analyzer) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        loudness: 0,
        centroid: 0,
        chroma: []
      };
    }
    
    const data = this.audioManager.getAudioData();
    const meyda = data.meyda || {};
    const loudTotal = (meyda.loudness && typeof meyda.loudness.total === 'number') ? meyda.loudness.total : 0;
    const centroidHz = typeof meyda.spectralCentroid === 'number' ? meyda.spectralCentroid : 0;
    // Normalize with conservative clamps
    const loudnessNorm = Math.min(loudTotal / 30, 1);
    const centroidNorm = Math.min(centroidHz / 11025, 1); // assumes 44.1kHz Nyquist
    const chroma = Array.isArray(meyda.chroma) ? meyda.chroma : [];

    return {
      bass: data.bassLevel || 0,
      mid: data.midLevel || 0,
      treble: data.trebleLevel || 0,
      loudness: loudnessNorm,
      centroid: centroidNorm,
      chroma
    };
  }
  
  /**
   * Update visual layers
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update section based on time
    this.updateSection();
    
    // Get audio frame
    const audioFrame = this.getAudioFrame();
    
    // Update idle layers if in idle state
    if (this.isIdleState && this.idleLayers) {
      this.idleLayers.forEach(layer => {
        if (layer && layer.isMounted()) {
          layer.update(audioFrame, dt);
        }
      });
    } else {
      // Update regular layers
      if (this.flowLayer && this.flowLayer.isMounted()) {
        this.flowLayer.update(audioFrame, dt);
        // Debug: log once per second
        if (Math.random() < 0.01) {
          console.info('[Adapter] Updating flow layer, visible:', this.flowLayer.group?.visible, 'in scene:', this.flowLayer.group?.parent === this.scene);
        }
      }
      
      // Update fog layer if present (for combined effects)
      if (this.fogLayer && this.fogLayer.isMounted()) {
        this.fogLayer.update(audioFrame, dt);
      }
      
      if (this.structureLayer && this.structureLayer.isMounted()) {
        this.structureLayer.update(audioFrame, dt);
        // Debug: log once per second
        if (Math.random() < 0.01) {
          console.info('[Adapter] Updating structure layer, visible:', this.structureLayer.group?.visible, 'in scene:', this.structureLayer.group?.parent === this.scene);
        }
      }
      
      if (this.coreLayer && this.coreLayer.isMounted()) {
        this.coreLayer.update(audioFrame, dt);
      }
      
      // Update extra structure layers
      if (this.extraStructureLayers && this.extraStructureLayers.length) {
        this.extraStructureLayers.forEach(layer => {
          if (layer && layer.isMounted()) {
            layer.update(audioFrame, dt);
          }
        });
      }
    }
  }
  
  /**
   * Unmount all layers
   */
  unmountLayers() {
    // Unmount idle layers if present
    if (this.idleLayers) {
      this.idleLayers.forEach(layer => {
        if (layer) {
          layer.unmount();
        }
      });
      this.idleLayers = [];
    }
    
    if (this.flowLayer) {
      this.flowLayer.unmount();
      this.flowLayer = null;
    }
    
    if (this.fogLayer) {
      this.fogLayer.unmount();
      this.fogLayer = null;
    }
    
    if (this.structureLayer) {
      this.structureLayer.unmount();
      this.structureLayer = null;
    }
    if (this.extraStructureLayers && this.extraStructureLayers.length) {
      this.extraStructureLayers.forEach(l => l && l.unmount && l.unmount());
      this.extraStructureLayers = [];
    }
    
    if (this.coreLayer) {
      this.coreLayer.unmount();
      this.coreLayer = null;
    }
    
    this.isIdleState = false;
  }
  
  /**
   * Cleanup
   */
  dispose() {
    this.unmountLayers();
    this.currentJourney = null;
    this.currentSection = null;
  }
}
