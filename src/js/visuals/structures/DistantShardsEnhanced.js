// NOTE: Don't use module import for THREE - use this.ctx.THREE from context
// This ensures we use the same THREE instance as the rest of the scene
import { VisualLayer } from '../layer-api.js';
import { DistantShardsMaterial } from '../materials/DistantShardsMaterial.js';

export class DistantShardsEnhanced extends VisualLayer {
  mount() {
    super.mount();

    // FIX: Use context THREE, not module import (avoids multiple THREE instances issue)
    const THREE = this.ctx.THREE;

    // DEBUG: Log THREE state at mount time
    if (window.SONOITE_DEBUG) {
      console.log('[DistantShards] mount() THREE check:', {
        hasTHREE: !!THREE,
        hasVector3: !!THREE?.Vector3,
        ctxTHREE: !!this.ctx?.THREE
      });
    }

    if (!THREE) {
      console.error('[DistantShardsEnhanced] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    // Store reference for use in other methods
    this.THREE = THREE;

    // DEBUG: Verify stored reference
    if (window.SONOITE_DEBUG) {
      const testVec = new this.THREE.Vector3(99, 88, 77);
      console.log('[DistantShards] this.THREE test:', {
        x: testVec.x, y: testVec.y, z: testVec.z
      });
    }

    // Configuration
    /**
     * MP-LOD-05: LOD (Level of Detail) System - A/B Testing Documentation
     *
     * DEFAULT: OFF (production setting)
     *
     * ENABLING LOD FOR TESTING:
     * Three methods to enable (any will work):
     *   1. JavaScript flag:  window.SONOITE_LOD = true; location.reload()
     *   2. URL parameter:    ?lod=1
     *   3. localStorage:     localStorage.setItem('SONOITE_LOD', '1')
     *
     * DISABLING:
     *   - window.SONOITE_LOD = false; location.reload()
     *   - ?lod=0
     *   - localStorage.removeItem('SONOITE_LOD')
     *
     * A/B TEST GOALS:
     *   - Renderer calls: ≤15 (with LOD ON)
     *   - Triangles: ≤50k (with LOD ON)
     *   - Visual parity: LOD ON should look nearly identical to LOD OFF
     *   - Performance: LOD ON should improve FPS on low-end devices
     *
     * TEST PROCEDURE:
     *   1. Baseline (LOD OFF):
     *      - Open DevTools console
     *      - Run: window.diag()
     *      - Note: renderer.calls, renderer.triangles
     *      - Take screenshot of visual appearance
     *
     *   2. Enable LOD:
     *      - Run: window.SONOITE_LOD = true; location.reload()
     *      - Wait for scene to stabilize
     *      - Run: window.diag()
     *      - Note: renderer.calls (should be ≤15), renderer.triangles (should be ≤50k)
     *      - Take screenshot and compare to baseline
     *
     *   3. Visual Parity Check:
     *      - Compare screenshots side-by-side
     *      - Verify shard density appears similar
     *      - Check that distant shards (far layer) are still visible as points
     *
     * TUNING IF DENSITY APPEARS LOWER WITH LOD ON:
     *   - Increase far Points size: 0.7–0.8 (currently 0.75)
     *   - Adjust LOD switch distance: 60–80 units (currently 70)
     *   - Ensure per-frame position updates:
     *     * Points positions must sync with instance matrices each frame ✓
     *     * Set pointsGeometry.attributes.position.needsUpdate = true (conditionally) ✓
     *   - Re-test visual parity after adjustments
     *
     * PRODUCTION NOTES:
     *   - LOD remains OFF by default unless explicitly enabled
     *   - No performance impact when disabled (zero overhead)
     *   - Enable only after successful A/B testing with acceptable parity
     *   - Recommended for low-end mobile devices if parity achieved
     */
    // Keep this layer mesh-only to avoid point-sprite glitter artifacts.
    this.enableLod = false;
    // MP-TJ-LOD-02: Desktop counts target 180-220 total; distribute near/mid/far
    const isDesktop = (typeof window !== 'undefined' && window.innerWidth > 1024);
    // Get quality level from performance optimizer
    const qualityLevel = window.performanceOptimizer?.qualityLevel ?? 1.0;
    const tierMultiplier = qualityLevel < 0.5 ? 0.6 : (qualityLevel < 0.7 ? 0.8 : 1.0); // MP-TJ-LOD-02: reduce 20-40% on mid/low tiers

    const baseCount = isDesktop ? 72 : 42;
    this.totalCount = Math.min(Math.round(baseCount * tierMultiplier), 80);

    // P1-FIX: Read opacity from journey config if provided (defaults to 1.0)
    // Journey JSON sets params.opacity which becomes this.cfg.opacity via setConfig()
    const configOpacity = this.cfg?.opacity ?? 1.0;

    // MP-TJ-LOD-02: Distribute near/mid/far (20-30 / 60-80 / 100-120)
    // P1-FIX: Increased base visibility (was 0.9/0.65/0.35 - far was invisible on dark backgrounds)
    // Now uses configOpacity as multiplier so journey JSON can control overall visibility
    // FIX-SCALE: Increased radii from 8/24/80 to 30/80/150 for proper distant placement
    this.layerConfigs = {
      near: { percentage: 0.18, visibility: Math.min(1.0, 0.22 * configOpacity), driftSpeed: 0.008, radius: 38 },
      mid: { percentage: 0.34, visibility: Math.min(1.0, 0.16 * configOpacity), driftSpeed: 0.014, radius: 88 },
      far: { percentage: 0.48, visibility: Math.min(1.0, 0.11 * configOpacity), driftSpeed: 0.0, radius: 165 }
    };
    this.clusterCount = 3;
    this.clusterRadius = 6;
    this.spiralWaves = 2;
    this.spiralAmplitude = 1.5;
    this.verticalThickness = 14;
    
    // Storage for layers and instance data
    this.layers = {};
    this.instancesData = {};
    
    // Base geometry - crystalline shape
    // Smaller base geometry so shards read as tiny, distant flecks
    this.baseGeometry = new THREE.IcosahedronGeometry(0.26, 0);

    // MP-TJ-Alloc-04: Reusable objects to avoid allocations in update()
    // IMPORTANT: Initialize BEFORE initLayers() since updateInstanceMatrices() needs them
    // Use module-imported THREE directly
    this._dummy = new THREE.Object3D();
    this._tempVec = new THREE.Vector3();
    this._tempQuat = new THREE.Quaternion();

    // Initialize layers (calls updateInstanceMatrices which needs _dummy)
    this.initLayers();

    if (window.SONOITE_DEBUG) {
      const totals = Object.keys(this.layerConfigs).map(k => Math.round(this.totalCount * this.layerConfigs[k].percentage)).reduce((a,b)=>a+b,0);
      console.log('[DistantShardsEnhanced] Mounted. LOD:', this.enableLod, 'layers:', Object.keys(this.layerConfigs).length, 'total shards:', totals);
    }

    // EMA smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, transients: 0 };
    this._alpha = 0.22;
    this._time = 0;

    // NARRATIVE-FLOW: Flow field configuration for organic movement
    this.flowField = {
      enabled: false,
      noiseScale: 0.1,
      noiseSpeed: 0.16,
      strength: 0.2,
      bassInfluence: 0.5,
      curl: true
    };

    // NARRATIVE-FLOW: Separation forces (boids-like)
    this.separation = {
      enabled: false,
      radius: 2.4,
      strength: 0.1
    };

    // AUDIO-REACTIVE: Subtle but noticeable per-shard response
    this.audioReactivity = {
      bassExplosion: 0.12,
      trebleShimmer: 0.08,
      midPulse: 0.06,
      kickImpact: 0.18,
      decaySpeed: 0.9
    };

    // TRACK5-VOID: Void gravity system
    this.voidCenter = new THREE.Vector3(0, 2, 0);
    this.voidConfig = {
      phase: 'VOID',
      gravity: 0.1,
      spiral: 0.2,
      spawn: 0.3,
      eventHorizon: 3.0,
      frozen: false
    };
  }

  /**
   * TRACK5-VOID: Set phase for void gravity behavior
   */
  setPhase(phase) {
    const configs = {
      VOID: { gravity: 0.08, spiral: 0.14, spawn: 0.2, eventHorizon: 3.0, frozen: false },
      AWAKENING: { gravity: 0.2, spiral: 0.3, spawn: 0.35, eventHorizon: 3.2, frozen: false },
      WANTING: { gravity: 0.52, spiral: 0.72, spawn: 0.72, eventHorizon: 3.8, frozen: false },
      RELEASE: { gravity: 0.18, spiral: 0.22, spawn: 0.12, eventHorizon: 3.0, frozen: false },
      ERASURE: { gravity: 0.0, spiral: 0.0, spawn: 0.0, eventHorizon: 3.0, frozen: true }
    };
    if (!configs[phase]) {
      console.warn(`[DistantShards] Unknown phase: ${phase}`);
      return;
    }
    this.voidConfig = { phase, ...configs[phase] };
    if (window.SONOITE_DEBUG) {
      console.log('[DistantShards] Phase →', phase, this.voidConfig);
    }
  }

  /**
   * TRACK5-VOID: Calculate void gravity with spiral
   */
  _getVoidGravity(pos) {
    if (this.voidConfig.frozen) return { x: 0, y: 0, z: 0 };
    const toVoid = {
      x: this.voidCenter.x - pos.x,
      y: this.voidCenter.y - pos.y,
      z: this.voidCenter.z - pos.z
    };
    const distSq = toVoid.x * toVoid.x + toVoid.y * toVoid.y + toVoid.z * toVoid.z;
    const dist = Math.sqrt(distSq) || 0.001;
    const gravityStrength = this.voidConfig.gravity / (distSq || 0.001);
    const radialX = (toVoid.x / dist) * gravityStrength;
    const radialY = (toVoid.y / dist) * gravityStrength;
    const radialZ = (toVoid.z / dist) * gravityStrength;
    const tangentialX = -toVoid.z / dist;
    const tangentialZ = toVoid.x / dist;
    const spiralStrength = this.voidConfig.spiral / (dist || 1);
    return {
      x: radialX + tangentialX * spiralStrength,
      y: radialY,
      z: radialZ + tangentialZ * spiralStrength
    };
  }

  /**
   * TRACK5-VOID: Check event horizon and respawn
   */
  _checkEventHorizon(inst, config) {
    if (this.voidConfig.frozen) return;
    const dx = inst.pos.x - this.voidCenter.x;
    const dy = inst.pos.y - this.voidCenter.y;
    const dz = inst.pos.z - this.voidCenter.z;
    const distToVoid = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distToVoid < this.voidConfig.eventHorizon) {
      if (Math.random() < this.voidConfig.spawn * 0.1) {
        const theta = Math.random() * Math.PI * 2;
        const r = config.radius * (0.8 + Math.random() * 0.2);
        inst.pos.x = r * Math.cos(theta);
        inst.pos.y = (Math.random() - 0.5) * this.verticalThickness;
        inst.pos.z = r * Math.sin(theta) - 60;
        inst.homePos.x = inst.pos.x;
        inst.homePos.y = inst.pos.y;
        inst.homePos.z = inst.pos.z;
        inst.velocity.x = inst.pos.x * 0.02;
        inst.velocity.y = inst.pos.y * 0.01;
        inst.velocity.z = inst.pos.z * 0.02;
      }
    }
  }
  
  initLayers() {
    // FIX: Use stored context THREE reference
    const THREE = this.THREE;

    for (let layerName in this.layerConfigs) {
      const config = this.layerConfigs[layerName];
      const count = Math.round(this.totalCount * config.percentage);

      // Create material for this layer
      const material = new DistantShardsMaterial({
        opacity: config.visibility,
        transmission: 0.7 + Math.random() * 0.2,
        side: THREE.FrontSide
      });
      // Generate instance data BEFORE building LOD so Points can use real positions
      const instanceData = this.generateInstanceData(count, config);
      this.instancesData[layerName] = instanceData;

      // Create instanced mesh (near detail)
      const mesh = new THREE.InstancedMesh(this.baseGeometry, material, count);
      mesh.frustumCulled = true;
      mesh.renderOrder = layerName === 'far' ? 1 : layerName === 'mid' ? 2 : 3;

      // Add custom instance attributes
      const bassSensArray = new Float32Array(count);
      const midSensArray = new Float32Array(count);
      const trebleSensArray = new Float32Array(count);
      const transmissionArray = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        bassSensArray[i] = Math.random() * 0.5 + 0.5;
        midSensArray[i] = Math.random();
        trebleSensArray[i] = Math.random();
        transmissionArray[i] = 0.5 + Math.random() * 0.4;
      }

      mesh.geometry.setAttribute('aBassSens', new THREE.InstancedBufferAttribute(bassSensArray, 1));
      mesh.geometry.setAttribute('aMidSens', new THREE.InstancedBufferAttribute(midSensArray, 1));
      mesh.geometry.setAttribute('aTrebleSens', new THREE.InstancedBufferAttribute(trebleSensArray, 1));
      mesh.geometry.setAttribute('aTransmission', new THREE.InstancedBufferAttribute(transmissionArray, 1));

      // Mesh-only path by design for silhouette fidelity and lower artifact risk.
      this.group.add(mesh);
      this.layers[layerName] = { lod: null, mesh, points: null, material, pointsMaterial: null, pointsGeometry: null, pointsPositions: null, config, count };

      // Initialize matrices
      this.updateInstanceMatrices(layerName);
    }
  }
  
  generateInstanceData(count, config) {
    // FIX: Use stored context THREE reference
    const THREE = this.THREE;

    // DEBUG: Log THREE availability at START of generateInstanceData
    if (window.SONOITE_DEBUG) {
      console.log('[DistantShards] generateInstanceData START:', {
        hasTHREE: !!THREE,
        thisTHREE: !!this.THREE,
        count,
        radius: config?.radius
      });

      if (THREE) {
        const testVec = new THREE.Vector3(1, 2, 3);
        console.log('[DistantShards] generateInstanceData testVec:', {
          x: testVec.x,
          y: testVec.y,
          z: testVec.z
        });
      }
    }

    const data = [];
    const galaxyRadius = config.radius;

    // Generate cluster centers with spiral pattern
    const clusterCenters = [];
    for (let j = 0; j < this.clusterCount; j++) {
      const r = Math.sqrt(Math.random()) * galaxyRadius * 0.7;
      let theta = (j / this.clusterCount) * Math.PI * 2;
      theta += Math.sin(theta * this.spiralWaves) * this.spiralAmplitude / (r + 1);
      const y = (Math.random() - 0.5) * this.verticalThickness;
      clusterCenters.push(new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      ));
    }
    
    for (let i = 0; i < count; i++) {
      let pos = new THREE.Vector3();

      // DEBUG: Log first position creation
      if (i === 0 && window.SONOITE_DEBUG) {
        console.log('[DistantShards] First pos created:', {
          x: pos.x, y: pos.y, z: pos.z,
          constructor: pos.constructor?.name
        });
      }

      const inCluster = Math.random() < 0.4;

      if (inCluster && clusterCenters.length > 0) {
        // Position near a cluster center
        const cid = Math.floor(Math.random() * clusterCenters.length);
        pos.copy(clusterCenters[cid]);
        const offset = new THREE.Vector3()
          .random()
          .subScalar(0.5)
          .multiplyScalar(2 * this.clusterRadius);
        pos.add(offset);
      } else {
        // Spiral arm distribution
        const r = Math.sqrt(Math.random()) * galaxyRadius;
        let theta = Math.random() * Math.PI * 2;
        theta += Math.sin(theta * this.spiralWaves) * this.spiralAmplitude / (r + 1);
        pos.x = r * Math.cos(theta);
        pos.z = r * Math.sin(theta);
        pos.y = (Math.random() - 0.5) * this.verticalThickness;
      }
      
      // Position far back for distant effect
      // FIX-SCALE: Increased from -15 to -60 so shards are behind the egg (at y=2)
      pos.z -= 60;

      // DEBUG: Log first position after all modifications
      if (i === 0 && window.SONOITE_DEBUG) {
        console.log('[DistantShards] First pos AFTER setting:', {
          x: pos.x, y: pos.y, z: pos.z
        });
      }

      // Non-uniform scaling for distant, solid silhouette feel.
      const scale = new THREE.Vector3(
        0.42 + Math.random() * 0.36,
        0.55 + Math.random() * 0.48,
        0.42 + Math.random() * 0.34
      );
      
      // Individual motion properties
      const rotAxis = new THREE.Vector3().random().normalize();
      const rotSpeed = (Math.random() - 0.5) * 0.05;
      const phase = Math.random() * Math.PI * 2;
      const pendulumAmp = Math.random() * 0.1;
      
      // NARRATIVE-FLOW: Individual velocity for organic independent movement
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.008
      );

      // NARRATIVE-FLOW: Target position for attraction/repulsion
      const homePos = pos.clone();

      data.push({
        pos,
        scale,
        rotAxis,
        rotSpeed,
        phase,
        pendulumAmp,
        rot: 0,
        baseY: pos.y,
        // NARRATIVE-FLOW: New per-shard properties
        velocity,
        homePos,
        flowOffset: new THREE.Vector3(),  // Accumulates flow field influence
        separationForce: new THREE.Vector3()  // Boids separation
      });
    }
    
    return data;
  }
  
  updateInstanceMatrices(layerName) {
    const { mesh, count } = this.layers[layerName];
    if (!mesh || !count) return; // MP-LAYER-GUARDS: Defensive check

    // MP-TJ-Alloc-04: Use reusable dummy object from class field
    const dummy = this._dummy;
    if (!dummy) {
      console.error(`[DistantShardsEnhanced] Dummy object not initialized for ${layerName}`);
      return;
    }

    const instances = this.instancesData[layerName];
    if (!instances) {
      console.error(`[DistantShardsEnhanced] No instance data for ${layerName}`);
      return;
    }

    // MP-LAYER-GUARDS: Ensure instance count matches
    const safeCount = Math.min(count, instances.length || 0);

    try {
      for (let i = 0; i < safeCount; i++) {
        const inst = instances[i];
        if (!inst || !inst.pos || !inst.scale || !inst.rotAxis) {
          console.warn(`[DistantShardsEnhanced] Invalid instance data at ${layerName}[${i}]`);
          continue;
        }

        dummy.position.copy(inst.pos);
        dummy.scale.copy(inst.scale);
        dummy.quaternion.setFromAxisAngle(inst.rotAxis, inst.rot);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      // MP-TJ-Alloc-04: Set needsUpdate once per batch
      mesh.instanceMatrix.needsUpdate = true;
    } catch (error) {
      console.error(`[DistantShardsEnhanced] Error updating instance matrices for ${layerName}:`, error);
      console.error(`[DistantShardsEnhanced] Dummy type:`, dummy.constructor.name);
      console.error(`[DistantShardsEnhanced] Instance count:`, safeCount);
    }
  }
  
  _smooth(key, value) {
    this._ema[key] = this._ema[key] * (1 - this._alpha) + value * this._alpha;
    return this._ema[key];
  }

  /**
   * NARRATIVE-FLOW: Simple Perlin-like noise (3D)
   * Fast approximation using sin-based layering
   */
  _noise3D(x, y, z) {
    // Multi-octave sin-based noise (cheaper than true Perlin)
    const n1 = Math.sin(x * 1.0 + y * 0.5) * Math.cos(z * 0.8 + x * 0.3);
    const n2 = Math.sin(x * 2.3 + z * 1.7) * Math.cos(y * 1.9 + z * 0.5) * 0.5;
    const n3 = Math.sin(x * 4.1 + y * 3.7) * Math.cos(z * 3.3 + y * 0.7) * 0.25;
    return (n1 + n2 + n3) / 1.75;
  }

  /**
   * NARRATIVE-FLOW: Get flow field velocity at position
   * Uses curl noise for divergence-free (no sinks/sources) flow
   */
  _getFlowVelocity(x, y, z, time, bass = 0) {
    const scale = this.flowField.noiseScale;
    const speed = this.flowField.noiseSpeed;
    const t = time * speed;

    // Sample noise at offset positions for curl calculation
    const eps = 0.1;

    if (this.flowField.curl) {
      // Curl noise: ∇ × F gives divergence-free field
      // This prevents shards from clumping or dispersing
      const nx = this._noise3D(x * scale + t, y * scale, z * scale);
      const ny = this._noise3D(x * scale, y * scale + t, z * scale);
      const nz = this._noise3D(x * scale, y * scale, z * scale + t);

      // Partial derivatives (approximated)
      const dnz_dy = (this._noise3D(x * scale, (y + eps) * scale, z * scale + t) - nz) / eps;
      const dny_dz = (this._noise3D(x * scale, y * scale, (z + eps) * scale + t) - ny) / eps;
      const dnx_dz = (this._noise3D((x + eps) * scale + t, y * scale, z * scale) - nx) / eps;
      const dnz_dx = (this._noise3D((x + eps) * scale, y * scale, z * scale + t) - nz) / eps;
      const dny_dx = (this._noise3D((x + eps) * scale, y * scale + t, z * scale) - ny) / eps;
      const dnx_dy = (this._noise3D(x * scale + t, (y + eps) * scale, z * scale) - nx) / eps;

      // Curl = (dnz/dy - dny/dz, dnx/dz - dnz/dx, dny/dx - dnx/dy)
      return {
        x: (dnz_dy - dny_dz) * this.flowField.strength * (1 + bass * this.flowField.bassInfluence),
        y: (dnx_dz - dnz_dx) * this.flowField.strength * 0.5, // Reduce vertical
        z: (dny_dx - dnx_dy) * this.flowField.strength * (1 + bass * this.flowField.bassInfluence)
      };
    } else {
      // Simple directional noise
      return {
        x: this._noise3D(x * scale + t, y * scale, z * scale) * this.flowField.strength,
        y: this._noise3D(x * scale, y * scale + t, z * scale) * this.flowField.strength * 0.3,
        z: this._noise3D(x * scale, y * scale, z * scale + t) * this.flowField.strength
      };
    }
  }

  /**
   * NARRATIVE-FLOW: Calculate separation force from nearby shards
   * Simplified O(n) check against layer neighbors only
   */
  _getSeparationForce(inst, layerInstances, index) {
    if (!this.separation.enabled) return { x: 0, y: 0, z: 0 };

    const radius = this.separation.radius;
    const radiusSq = radius * radius;
    let fx = 0, fy = 0, fz = 0;
    let count = 0;

    // Check subset of neighbors (skip some for performance)
    const step = Math.max(1, Math.floor(layerInstances.length / 30)); // Max 30 checks
    for (let i = 0; i < layerInstances.length; i += step) {
      if (i === index) continue;

      const other = layerInstances[i];
      const dx = inst.pos.x - other.pos.x;
      const dy = inst.pos.y - other.pos.y;
      const dz = inst.pos.z - other.pos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq && distSq > 0.001) {
        // Push away, stronger when closer
        const dist = Math.sqrt(distSq);
        const strength = (radius - dist) / radius;
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength * 0.5; // Less vertical push
        fz += (dz / dist) * strength;
        count++;
      }
    }

    if (count > 0) {
      const scale = this.separation.strength / count;
      return { x: fx * scale, y: fy * scale, z: fz * scale };
    }
    return { x: 0, y: 0, z: 0 };
  }
  
  update(audio, dt) {
    // MP-LAYER-GUARDS: Early return if not active or mounted
    if (!this.isActive?.() || !this.isMounted?.()) return;

    // FIX: Use stored context THREE reference
    const THREE = this.THREE;

    this._time += dt;

    // Smooth audio values
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    // Simulate transients from treble spikes (kept restrained for silhouette readability)
    const transients = Math.max(0, (audio?.treble ?? 0) - this._ema.treble) * 1.2;

    // Amplified reactivity with dual-rate EMA
    const alphaAttack = 0.35;
    const alphaDecay = 0.16;

    for (let layerName in this.layers) {
      const { material, config, count } = this.layers[layerName];
      const instances = this.instancesData[layerName];
      
      // Update instance transformations - EACH SHARD IS ALIVE
      for (let i = 0; i < count; i++) {
        const inst = instances[i];

        // Initialize if not present
        if (!inst.baseScale) {
          inst.baseScale = inst.scale.clone();
        }
        if (!inst.velocity) {
          inst.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.008,
            (Math.random() - 0.5) * 0.015
          );
          inst.homePos = inst.pos.clone();
          inst.bassSens = 0.55 + Math.random() * 0.45;
          inst.trebleSens = 0.45 + Math.random() * 0.4;
          inst.midSens = 0.5 + Math.random() * 0.35;
        }

        // ============================================
        // AUDIO-DRIVEN EXPLOSION - shards BURST on bass
        // ============================================
        const ar = this.audioReactivity;

        // Direction from center (for explosion effect)
        const fromCenter = {
          x: inst.pos.x - inst.homePos.x,
          y: inst.pos.y - inst.homePos.y,
          z: inst.pos.z - inst.homePos.z
        };
        const distFromHome = Math.sqrt(fromCenter.x*fromCenter.x + fromCenter.y*fromCenter.y + fromCenter.z*fromCenter.z) || 1;
        const dirX = fromCenter.x / distFromHome;
        const dirY = fromCenter.y / distFromHome;
        const dirZ = fromCenter.z / distFromHome;

        // BASS = EXPLOSION outward (each shard's sensitivity differs)
        const bassForce = bass * ar.bassExplosion * inst.bassSens;
        inst.velocity.x += dirX * bassForce * dt * 0.55;
        inst.velocity.y += dirY * bassForce * dt * 0.4;
        inst.velocity.z += dirZ * bassForce * dt * 0.55;

        // TRANSIENTS = KICK IMPACT (sharp burst on beats)
        if (transients > 0.45) {
          const kickForce = transients * ar.kickImpact * inst.bassSens;
          inst.velocity.x += (Math.random() - 0.5) * kickForce * dt * 0.8;
          inst.velocity.y += Math.random() * kickForce * dt * 0.6;
          inst.velocity.z += (Math.random() - 0.5) * kickForce * dt * 0.8;
        }

        // FLOW FIELD (organic drift, bass-modulated)
        if (this.flowField.enabled && config.driftSpeed > 0) {
          const flow = this._getFlowVelocity(
            inst.pos.x, inst.pos.y, inst.pos.z,
            this._time, bass
          );
          inst.velocity.x += flow.x * dt;
          inst.velocity.y += flow.y * dt * 0.6;
          inst.velocity.z += flow.z * dt;
        }

        // HOME ATTRACTION (rubber band back to origin)
        const homeStrength = 0.05 + (1 - bass) * 0.08;
        const toHome = {
          x: inst.homePos.x - inst.pos.x,
          y: inst.homePos.y - inst.pos.y,
          z: inst.homePos.z - inst.pos.z
        };
        inst.velocity.x += toHome.x * homeStrength * dt;
        inst.velocity.y += toHome.y * homeStrength * dt;
        inst.velocity.z += toHome.z * homeStrength * dt;

        // TRACK5-VOID: Apply void gravity (overrides home attraction during high gravity)
        if (!this.voidConfig.frozen && this.voidConfig.gravity > 0.05) {
          const voidForce = this._getVoidGravity(inst.pos);
          const voidWeight = Math.min(1, this.voidConfig.gravity * 2);
          inst.velocity.x = inst.velocity.x * (1 - voidWeight) + (inst.velocity.x + voidForce.x * dt * 6) * voidWeight;
          inst.velocity.y = inst.velocity.y * (1 - voidWeight) + (inst.velocity.y + voidForce.y * dt * 6) * voidWeight;
          inst.velocity.z = inst.velocity.z * (1 - voidWeight) + (inst.velocity.z + voidForce.z * dt * 6) * voidWeight;
        }

        if (this.separation.enabled) {
          const sepForce = this._getSeparationForce(inst, instances, i);
          inst.velocity.x += sepForce.x * dt;
          inst.velocity.y += sepForce.y * dt;
          inst.velocity.z += sepForce.z * dt;
        }

        // DAMPING (faster decay = tighter feel)
        const damping = ar.decaySpeed;
        inst.velocity.x *= damping;
        inst.velocity.y *= damping;
        inst.velocity.z *= damping;

        // VELOCITY LIMITS (allow bigger movement)
        const velMag = Math.sqrt(
          inst.velocity.x * inst.velocity.x +
          inst.velocity.y * inst.velocity.y +
          inst.velocity.z * inst.velocity.z
        );
        const maxVel = 0.55 + bass * 0.9;
        if (velMag > maxVel) {
          const scale = maxVel / velMag;
          inst.velocity.x *= scale;
          inst.velocity.y *= scale;
          inst.velocity.z *= scale;
        }

        // APPLY POSITION
        inst.pos.x += inst.velocity.x;
        inst.pos.y += inst.velocity.y;
        inst.pos.z += inst.velocity.z;

        // BOUNDARY (soft wrap back)
        const r = Math.sqrt(inst.pos.x * inst.pos.x + inst.pos.z * inst.pos.z);
        const maxRadius = config.radius * 2.0;
        if (r > maxRadius) {
          const wrapScale = config.radius * 0.8 / r;
          inst.pos.x *= wrapScale;
          inst.pos.z *= wrapScale;
          inst.velocity.x *= -0.3;
          inst.velocity.z *= -0.3;
        }

        // TRACK5-VOID: Check event horizon and respawn
        this._checkEventHorizon(inst, config);

        // ============================================
        // TREBLE = SHIMMER (rapid rotation)
        // ============================================
        const trebleRotation = treble * ar.trebleShimmer * inst.trebleSens;
        inst.rot += inst.rotSpeed * (0.42 + mid * 0.55 + trebleRotation * 0.75) * dt;

        // ============================================
        // MID = SCALE PULSE (subtle breathing)
        // ============================================
        const targetScale = 1 + bass * 0.08 * inst.bassSens + mid * ar.midPulse * inst.midSens;
        const currentScaleFactor = inst.scale.x / inst.baseScale.x;
        const scaleAlpha = (targetScale > currentScaleFactor) ? alphaAttack : alphaDecay;
        const newScaleFactor = currentScaleFactor + (targetScale - currentScaleFactor) * scaleAlpha;
        const clampedScale = THREE.MathUtils.clamp(newScaleFactor, 0.94, 1.12);
        inst.scale.copy(inst.baseScale).multiplyScalar(clampedScale);

        // Gentle, non-audio vertical drift to avoid "bouncy" reads in WANTING.
        const verticalDrift = Math.sin(this._time * 0.32 + inst.phase) * 0.0025;
        inst.pos.y += verticalDrift;
      }
      
      this.updateInstanceMatrices(layerName);

      // MP-LAYER-GUARDS: Guard uniform writes
      if (material?.uniforms?.uTime) material.uniforms.uTime.value = this._time;
      if (material?.uniforms?.uBass) material.uniforms.uBass.value = bass;
      if (material?.uniforms?.uMid) material.uniforms.uMid.value = mid;
      if (material?.uniforms?.uTreble) material.uniforms.uTreble.value = treble;
      if (material?.uniforms?.uTransients) material.uniforms.uTransients.value = transients;
      if (material?.uniforms?.uBreath) material.uniforms.uBreath.value = 1 + Math.sin(this._time * 0.1) * 0.04;
    }
  }
  
  unmount() {
    // Dispose of all resources
    for (let layerName in this.layers) {
      const { mesh, material, pointsGeometry, pointsMaterial } = this.layers[layerName];
      mesh?.geometry?.dispose?.();
      material?.dispose?.();
      pointsGeometry?.dispose?.();
      pointsMaterial?.dispose?.();
    }

    if (this.baseGeometry) {
      this.baseGeometry.dispose();
    }

    this.layers = {};
    this.instancesData = {};

    super.unmount();
  }

  /**
   * SHD-2L-01: Enable second layer for count doubling
   * Creates a second instance layer with 50% of base count
   */
  enableSecondLayer() {
    if (this.secondLayerEnabled) return;

    // FIX: Use stored context THREE reference
    const THREE = this.THREE;

    // Create second set of layers with 50% count
    const secondTotalCount = Math.floor(this.totalCount * 0.5);
    this.secondLayers = {};

    for (let layerName in this.layerConfigs) {
      const config = this.layerConfigs[layerName];
      const count = Math.round(secondTotalCount * config.percentage);

      // Reuse base geometry and create new material instance
      const material = new DistantShardsMaterial({
        opacity: config.visibility * 0.8, // Slightly dimmer
        transmission: 0.7 + Math.random() * 0.2,
        side: THREE.FrontSide
      });

      // Create second instanced mesh
      const mesh = new THREE.InstancedMesh(this.baseGeometry, material, count);
      mesh.frustumCulled = true;
      mesh.renderOrder = layerName === 'far' ? 1 : layerName === 'mid' ? 2 : 3;

      // Add custom instance attributes
      const bassSensArray = new Float32Array(count);
      const midSensArray = new Float32Array(count);
      const trebleSensArray = new Float32Array(count);
      const transmissionArray = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        bassSensArray[i] = Math.random() * 0.5 + 0.5;
        midSensArray[i] = Math.random();
        trebleSensArray[i] = Math.random();
        transmissionArray[i] = 0.5 + Math.random() * 0.4;
      }

      mesh.geometry.setAttribute('aBassSens', new THREE.InstancedBufferAttribute(bassSensArray, 1));
      mesh.geometry.setAttribute('aMidSens', new THREE.InstancedBufferAttribute(midSensArray, 1));
      mesh.geometry.setAttribute('aTrebleSens', new THREE.InstancedBufferAttribute(trebleSensArray, 1));
      mesh.geometry.setAttribute('aTransmission', new THREE.InstancedBufferAttribute(transmissionArray, 1));

      // Generate instance data and initialize matrices
      const instanceData = this.generateInstanceData(count, config);

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const data = instanceData[i];
        matrix.compose(data.pos, data.quat, data.scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      // Add to group
      this.group.add(mesh);

      // Store second layer data
      this.secondLayers[layerName] = { mesh, material, config, count, instanceData };
    }

    this.secondLayerEnabled = true;

    if (window.SONOITE_DEBUG) {
      console.log('[DistantShardsEnhanced] Second layer enabled:', secondTotalCount, 'shards');
    }
  }

  /**
   * SHD-2L-01: Set visible fraction for gradual count changes
   */
  setVisibleFraction(fraction) {
    const f = Math.max(0, Math.min(1, fraction));

    for (let layerName in this.layers) {
      const layer = this.layers[layerName];
      const visibleCount = Math.floor(layer.count * f);
      layer.mesh.count = visibleCount;
    }

    if (this.secondLayers) {
      for (let layerName in this.secondLayers) {
        const layer = this.secondLayers[layerName];
        const visibleCount = Math.floor(layer.count * f);
        layer.mesh.count = visibleCount;
      }
    }
  }
}
