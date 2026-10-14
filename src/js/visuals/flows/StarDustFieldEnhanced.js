import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

/**
 * Enhanced StarDustField with multi-layer depth and galaxy distribution
 * Professional cosmic atmosphere with realistic star rendering
 */
export class StarDustFieldEnhanced extends VisualLayer {
  mount() {
    super.mount();

    this.layers = {};
    this._layerEntries = [];
    this.nebulaMeshes = [];
    this.nebulaGroup = new THREE.Group();

    // Palette support for per-track colors
    this.palette = this.cfg.palette || {
      primary: '#ffffff',
      secondary: '#d7d7e0',
      accent: '#56667a'
    };
    this._accentColor = new THREE.Color(this.palette.accent);
    this._accentKey = this.palette.accent;
    this._performanceRating = 'excellent';

    this.config = {
      galaxyRadius: 20,
      thickness: 4,
      clusterCount: 8,
      clusterRadius: 2,
      voidCount: 5,
      voidRadius: 3,
      spiralWaves: 2,
      spiralAmplitude: 2
    };

    // MP-TJ-StarDust-03: Cap particle count based on performanceOptimizer.qualityLevel
    const qualityLevel = (typeof window !== 'undefined' && window.performanceOptimizer)
      ? window.performanceOptimizer.qualityLevel
      : 1.0;
    this._qualityLevel = qualityLevel;

    const qualityMultiplier = qualityLevel < 0.5 ? 0.45 : (qualityLevel < 0.7 ? 0.68 : 1.0);

    // Create three depth layers - balanced visibility with quality caps
    const farConfig = { count: Math.round(1500 * qualityMultiplier), sizeRange: [0.5, 1.0], opacity: 0.2, driftSpeed: 0.02 };
    const midConfig = { count: Math.round(500 * qualityMultiplier), sizeRange: [1.0, 1.5], opacity: 0.3, driftSpeed: 0.05 };
    const nearConfig = { count: Math.round(200 * qualityMultiplier), sizeRange: [1.5, 2.5], opacity: 0.4, driftSpeed: 0.1 };

    // VOID-DUST MODE: sparsify and slow everything down
    // Check both cfg.mode and cfg.params.mode for compatibility with different config schemas
    const isVoidDust = this.cfg?.mode === 'void_dust' || this.cfg?.params?.mode === 'void_dust';
    this.isVoidDust = isVoidDust;
    const voidParams = this.cfg?.params || this.cfg || {};
    const voidCount = Number.isFinite(voidParams.count) ? voidParams.count : null;
    const voidRadius = Number.isFinite(voidParams.maxRadius) ? voidParams.maxRadius : null;
    this.velocityJitter = Number.isFinite(voidParams.velocityJitter)
      ? voidParams.velocityJitter
      : (isVoidDust ? 0.15 : 0.0);
    this.softBounds = isVoidDust ? 1.0 : 0.0;
    if (voidRadius) {
      this.config.galaxyRadius = voidRadius;
    }
    if (isVoidDust) {
      farConfig.count = Math.max(280, Math.round(farConfig.count * 0.22));
      midConfig.count = Math.max(170, Math.round(midConfig.count * 0.30));
      nearConfig.count = Math.max(95, Math.round(nearConfig.count * 0.34));
      farConfig.driftSpeed *= 0.35;
      midConfig.driftSpeed *= 0.35;
      nearConfig.driftSpeed *= 0.35;
      // Reduce opacity to keep the “ghost dust” subtle
      // Slightly boost caps for silhouette readability (Track 5 void)
      farConfig.opacity = Math.min(farConfig.opacity, 0.16);
      midConfig.opacity = Math.min(midConfig.opacity, 0.22);
      nearConfig.opacity = Math.min(nearConfig.opacity, 0.28);
    }

    // Optional explicit count override for void_dust
    if (isVoidDust && voidCount) {
      // Respect performance tier when authoring explicit counts.
      const tierCap = qualityLevel < 0.5 ? 420 : (qualityLevel < 0.7 ? 560 : 760);
      const cappedCount = Math.min(voidCount, tierCap);
      const total = farConfig.count + midConfig.count + nearConfig.count;
      const scale = total > 0 ? (cappedCount / total) : 1;
      farConfig.count = Math.max(60, Math.round(farConfig.count * scale));
      midConfig.count = Math.max(40, Math.round(midConfig.count * scale));
      nearConfig.count = Math.max(25, Math.round(nearConfig.count * scale));
    }

    this.createLayer('far', farConfig);
    this.createLayer('mid', midConfig);
    this.createLayer('near', nearConfig);

    // Add nebula clouds at clusters (skip for void_dust to keep scene sparse)
    if (!isVoidDust) {
      this.createNebulas();
      this.group.add(this.nebulaGroup);
    } else {
      this.nebulaMeshes = [];
    }

    // EMA smoothing
    this._ema = { bass: 0, mid: 0, treble: 0, loud: 0 };
    this._alpha = 0.15;

    // MP-TJ-StarDust-03: Frame counter for throttling updates on poor/critical performance
    this._frameCounter = 0;

    // P6-TORNADO: Vortex transition state for smooth activation/deactivation
    this.vortexState = {
      targetStrength: 0,
      currentStrength: 0,
      targetSpeed: 0,
      currentSpeed: 0,
      transitionDuration: 0,
      transitionElapsed: 0,
      easing: 'easeInOutCubic',
      targetParams: null
    };
  }
  
  generatePositions(count) {
    const positions = new Float32Array(count * 3);
    const { galaxyRadius, thickness, clusterCount, clusterRadius, voidCount, voidRadius, spiralWaves, spiralAmplitude } = this.config;
    
    // Generate cluster centers
    const clusterCenters = [];
    for (let j = 0; j < clusterCount; j++) {
      const r = Math.sqrt(Math.random()) * galaxyRadius;
      const theta = Math.random() * Math.PI * 2;
      clusterCenters.push(new THREE.Vector3(
        r * Math.cos(theta), 
        (Math.random() - 0.5) * thickness, 
        r * Math.sin(theta)
      ));
    }
    
    // Generate void centers
    const voidCenters = [];
    for (let j = 0; j < voidCount; j++) {
      const r = Math.sqrt(Math.random()) * galaxyRadius;
      const theta = Math.random() * Math.PI * 2;
      voidCenters.push(new THREE.Vector3(
        r * Math.cos(theta), 
        (Math.random() - 0.5) * thickness, 
        r * Math.sin(theta)
      ));
    }
    
    for (let i = 0; i < count; i++) {
      let pos;
      let inVoid;
      let attempts = 0;
      
      do {
        pos = new THREE.Vector3();
        const inCluster = Math.random() < 0.3;
        
        if (inCluster) {
          // Place in cluster
          const cid = Math.floor(Math.random() * clusterCount);
          pos.copy(clusterCenters[cid]);
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2 * clusterRadius,
            (Math.random() - 0.5) * 2 * clusterRadius,
            (Math.random() - 0.5) * 2 * clusterRadius
          );
          pos.add(offset);
        } else {
          // Galaxy disk distribution with spiral arms
          const r = Math.sqrt(Math.random()) * galaxyRadius;
          let theta = Math.random() * Math.PI * 2;
          theta += Math.sin(theta * spiralWaves) * spiralAmplitude / (r + 1);
          pos.x = r * Math.cos(theta);
          pos.z = r * Math.sin(theta);
          pos.y = (Math.random() - 0.5) * thickness;
        }
        
        // Check if in void
        inVoid = false;
        for (let vc of voidCenters) {
          if (pos.distanceTo(vc) < voidRadius) {
            inVoid = true;
            break;
          }
        }
        attempts++;
      } while (inVoid && attempts < 10);
      
      // Don't normalize! Keep galaxy shape
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    
    return positions;
  }
  
  getRandomColor() {
    if (this.isVoidDust) {
      const tone = 0.80 + Math.random() * 0.16;
      const cool = tone * (0.96 + Math.random() * 0.03);
      const warm = tone * (0.94 + Math.random() * 0.04);
      return new THREE.Color(cool, cool, warm);
    }
    const rnd = Math.random();
    // More subdued, realistic star colors
    if (rnd < 0.4) return new THREE.Color('#e8e8f0');      // Cool white
    else if (rnd < 0.65) return new THREE.Color('#f0f0e0'); // Warm white
    else if (rnd < 0.85) return new THREE.Color('#d0d8e8'); // Blue-white
    else if (rnd < 0.95) return new THREE.Color('#e8d8d0'); // Faint orange
    else return new THREE.Color('#c0d0e0');                 // Pale blue
  }
  
  createLayer(name, config) {
    const geometry = new THREE.BufferGeometry();
    const positions = this.generatePositions(config.count);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, config.count);
    
    // Color variation
    const colors = new Float32Array(config.count * 3);
    for (let i = 0; i < config.count; i++) {
      const col = this.getRandomColor();
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Size variation
    const sizes = new Float32Array(config.count);
    for (let i = 0; i < config.count; i++) {
      sizes[i] = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
    }
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    
    // Phase for scintillation
    const phases = new Float32Array(config.count);
    for (let i = 0; i < config.count; i++) {
      phases[i] = Math.random() * Math.PI * 2;
    }
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    // P0-FIX: Individual particle velocities for independent motion
    // GUIDE-FIX-1: Slowed from 0.05+0.15 to 0.01+0.03 for cinematic feel
    const velocities = new Float32Array(config.count * 3);
    for (let i = 0; i < config.count; i++) {
      // Random direction with small magnitude - each particle drifts its own way
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.01 + Math.random() * 0.03; // Cinematic: 0.01-0.04 range
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed * 0.3; // Less vertical movement
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
    }
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    
    // Pulsar speeds (5% of near stars)
    const pulseSpeeds = new Float32Array(config.count);
    if (name === 'near') {
      for (let i = 0; i < config.count; i++) {
        if (Math.random() < 0.05) {
          const period = 3 + Math.random() * 4;
          pulseSpeeds[i] = 2 * Math.PI / period;
        } else {
          pulseSpeeds[i] = 0;
        }
      }
    }
    geometry.setAttribute('aPulseSpeed', new THREE.BufferAttribute(pulseSpeeds, 1));
    
    // Create material
    const material = this.createStarMaterial(config.opacity);
    
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = true;
    
    const layerGroup = new THREE.Group();
    layerGroup.add(points);
    this.group.add(layerGroup);
    
    const depthFactor = name === 'far' ? 0.05 : name === 'mid' ? 0.1 : 0.15;
    this.layers[name] = {
      group: layerGroup,
      driftSpeed: config.driftSpeed,
      material,
      geometry,
      depthFactor,
      baseCount: config.count,
      activeCount: config.count
    };
    this._layerEntries.push(this.layers[name]);
  }
  
  createStarMaterial(opacity) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity }, // Use full opacity
        uScintSpeed: { value: 1.0 },
        uPulseRate: { value: 1.0 },
        uFieldScale: { value: 1.0 },
        uDriftScale: { value: 1.0 },  // P0-FIX: Control individual drift intensity
        uVelocityJitter: { value: this.velocityJitter }, // Track 05: break linear motion
        uBounds: { value: 25.0 },     // P0-FIX: Wrap boundary for particles
        uSoftBounds: { value: this.softBounds },
        // GUIDE-FIX-5: Vortex/attractor uniforms for climax
        uAttractorPos: { value: new THREE.Vector3(0, 2, 0) },  // Egg position
        uAttractorStrength: { value: 0.0 },
        uVortexSpeed: { value: 0.0 },
        // GIGA-AUDIT: Freeze uniform for complete particle stop at 8:00+
        uFreeze: { value: 0.0 },  // 0 = normal, 1 = frozen
        // ISSUE-6-FIX: Motion mode system (0=drift, 1=spiral, 2=cascade, 3=pulse, 4=freeze, 5=chaos, 6=void_eater)
        uMotionMode: { value: 0.0 },
        uMotionIntensity: { value: 1.0 },  // Controls strength of motion effect
        // P6-TORNADO: Cylindrical funnel tornado parameters
        uVortexHeight: { value: 10.0 },
        uFunnelTop: { value: 8.0 },
        uFunnelBottom: { value: 1.0 },
        uRiseSpeed: { value: 0.8 },
        uSpiralTightness: { value: 2.0 },
    // VOID-REPULSION: Void repulsion parameters (particles avoid void center)
    uVoidCenter: { value: new THREE.Vector3(0, 0, 0) },
    uVoidRadius: { value: 2.0 },
    uVoidStrength: { value: 0.0 },
    // VOID-HALO: Subtle emissive tint for readability
    uVoidGlow: { value: 0.0 },
    // TRACK5-GRAVITY: Gravitational attraction toward void (black hole effect)
    uGravityCenter: { value: new THREE.Vector3(0, 2, 0) },
    uGravityStrength: { value: 0.0 },   // 0 = off, 0.5 = subtle, 1.0 = strong pull
    uGravityRadius: { value: 15.0 },     // Influence radius
    uSpiralRate: { value: 0.0 },         // How fast particles spiral (0 = straight fall)
    uEventHorizon: { value: 2.5 },       // Particles disappear inside this radius
    // TRACK5-SPAGHETTI: Strand stretching near center (visual only; motion handled separately)
    uSpaghettiStrength: { value: 0.0 },  // 0 = off, 1 = full
    uSpaghettiRadius: { value: 10.0 }    // Effect fades out by this radius
  },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aPulseSpeed;
        attribute vec3 aVelocity;  // P0-FIX: Individual particle velocity

        varying vec3 vColor;
        varying float vIntensity;
        varying float vSize;
        varying float vPhase;
        varying float vVoidFade;  // VOID-REPULSION: Alpha fade for particles near void
        varying float vGlow;      // VOID-HALO: Emissive tint factor
        varying float vSpaghetti; // TRACK5-SPAGHETTI: strand factor 0-1
        varying vec2 vSpaghettiDir; // TRACK5-SPAGHETTI: direction in view space
        varying vec2 vNdc;

        uniform float uTime;
        uniform float uScintSpeed;
        uniform float uPulseRate;
        uniform float uFieldScale;
        uniform float uDriftScale;  // P0-FIX: Individual drift multiplier
        uniform float uVelocityJitter;
        uniform float uBounds;      // P0-FIX: Wrap boundary
        uniform float uSoftBounds;
        // GUIDE-FIX-5: Vortex uniforms
        uniform vec3 uAttractorPos;
        uniform float uAttractorStrength;
        uniform float uVortexSpeed;
        // GIGA-AUDIT: Freeze uniform
        uniform float uFreeze;
        // ISSUE-6-FIX: Motion mode uniforms
        uniform float uMotionMode;      // 0=drift, 1=spiral, 2=cascade, 3=pulse, 4=freeze, 5=chaos, 6=void_eater
        uniform float uMotionIntensity;
        // P6-TORNADO: Cylindrical funnel parameters
        uniform float uVortexHeight;
        uniform float uFunnelTop;
        uniform float uFunnelBottom;
        uniform float uRiseSpeed;
        uniform float uSpiralTightness;
        // VOID-REPULSION: Void repulsion uniforms
        uniform vec3 uVoidCenter;
        uniform float uVoidRadius;
        uniform float uVoidStrength;
        uniform float uVoidGlow;
        // TRACK5-GRAVITY: Gravitational attraction uniforms
        uniform vec3 uGravityCenter;
        uniform float uGravityStrength;
        uniform float uGravityRadius;
        uniform float uSpiralRate;
        uniform float uEventHorizon;
        // TRACK5-SPAGHETTI: Strand stretching controls
        uniform float uSpaghettiStrength;
        uniform float uSpaghettiRadius;

        // Simple noise for scintillation
        float hash(vec3 p) {
          p = fract(p * vec3(443.8975, 397.2973, 491.1871));
          p += dot(p.zxy, p.yxz + 19.19);
          return fract(p.x * p.y * p.z);
        }

        // P0-FIX: Wrap position within bounds (toroidal)
        vec3 wrapPosition(vec3 pos, float bounds) {
          return mod(pos + bounds, bounds * 2.0) - bounds;
        }

        void main() {
          vColor = color;
          vPhase = aPhase;

          // P0-FIX: Apply individual drift to position
          // GIGA-AUDIT: Scale drift by (1 - uFreeze) so particles stop when frozen
          float freezeMultiplier = 1.0 - uFreeze;
          vec3 driftedPos = position + aVelocity * uTime * uDriftScale * freezeMultiplier;
          vec3 jitter = vec3(
            sin(uTime * 1.5 + position.y * 10.0),
            cos(uTime * 1.2 + position.x * 10.0),
            sin(uTime * 1.8 + position.z * 10.0)
          );
          driftedPos += jitter * aVelocity * uVelocityJitter * freezeMultiplier;

          // ISSUE-6-FIX: Motion mode choreography
          // Mode 0 = drift (default, already applied above)
          float modeIntensity = uMotionIntensity * freezeMultiplier;

          if (uMotionMode > 0.5 && uMotionMode < 1.5) {
            // Mode 1: SPIRAL - particles spiral around center
            vec3 center = uAttractorPos;
            vec3 toCenter = driftedPos - center;
            float dist = length(toCenter.xz);
            float angle = atan(toCenter.z, toCenter.x) + uTime * 0.3 * modeIntensity;
            driftedPos.x = center.x + dist * cos(angle);
            driftedPos.z = center.z + dist * sin(angle);
            // Gentle vertical oscillation
            driftedPos.y += sin(angle * 2.0 + aPhase) * 0.5 * modeIntensity;
          }
          else if (uMotionMode > 1.5 && uMotionMode < 2.5) {
            // Mode 2: CASCADE - particles fall like waterfall
            float fallSpeed = 2.0 * modeIntensity;
            driftedPos.y -= uTime * fallSpeed;
            // Wrap at bottom to respawn at top
            driftedPos.y = mod(driftedPos.y + 15.0, 30.0) - 15.0;
            // Add slight horizontal drift
            driftedPos.x += sin(uTime * 0.5 + aPhase) * 0.3 * modeIntensity;
          }
          else if (uMotionMode > 2.5 && uMotionMode < 3.5) {
            // Mode 3: PULSE - particles expand/contract from center
            vec3 center = uAttractorPos;
            vec3 toCenter = driftedPos - center;
            float dist = length(toCenter);
            float pulseAmount = sin(uTime * 1.5) * 0.3 * modeIntensity;
            driftedPos = center + toCenter * (1.0 + pulseAmount);
          }
          else if (uMotionMode > 3.5 && uMotionMode < 4.5) {
            // Mode 4: FREEZE - handled by uFreeze uniform above
            // Explicitly freeze motion (redundant but clear)
            // Already handled via freezeMultiplier
          }
          else if (uMotionMode > 4.5 && uMotionMode < 5.5) {
            // Mode 5: CHAOS - randomized chaotic motion
            float chaosX = sin(uTime * 2.0 + aPhase * 3.0) * cos(uTime * 1.3 + position.x);
            float chaosY = cos(uTime * 1.7 + aPhase * 2.0) * sin(uTime * 2.1 + position.y);
            float chaosZ = sin(uTime * 1.9 + aPhase * 4.0) * cos(uTime * 1.5 + position.z);
            driftedPos += vec3(chaosX, chaosY, chaosZ) * 0.5 * modeIntensity;
          }
          else if (uMotionMode > 5.5) {
            // Mode 6: VOID_EATER - particles pulled toward void center (for Track 5)
            vec3 center = uVoidCenter;
            vec3 toCenter = center - driftedPos;
            float dist = length(toCenter);

            // Pull strength increases with mode intensity
            float pullSpeed = modeIntensity * 1.5;

            // Normalize direction and pull particles toward center
            if (dist > 0.01) {
              vec3 pullDir = toCenter / dist;
              driftedPos += pullDir * pullSpeed * uTime * 0.02;
            }

            // Add slight spiral motion as particles are consumed
            float angle = atan(toCenter.z, toCenter.x) + uTime * 0.5 * modeIntensity;
            float radius = length(toCenter.xz);
            driftedPos.x = center.x + radius * cos(angle) * 0.95; // Shrink radius over time
            driftedPos.z = center.z + radius * sin(angle) * 0.95;
          }

          // ---- VOID SHELL: carve out negative space around the void sphere ----
          vec3 pos = driftedPos;

          vVoidFade = 1.0; // Default: fully visible
          vGlow = 0.0; // Default: no glow unless enabled
          if (uVoidStrength > 0.0 && uVoidRadius > 0.0) {
            vec3 toVoidCenter = pos - uVoidCenter;
            float distToVoid = length(toVoidCenter);

            float inner = uVoidRadius;
            float outer = uVoidRadius * 1.5;

            // voidRegion ~1.0 deep inside inner radius, ~0.0 outside outer radius
            float voidRegion = 1.0 - smoothstep(inner, outer, distToVoid);

            // Direction away from center
            vec3 awayDir = distToVoid > 0.0001 ? (toVoidCenter / distToVoid) : vec3(0.0);

            // Push particles outward toward shell boundary when strength > 0
            float push = uVoidStrength * voidRegion * (inner - distToVoid);
            // Allow attraction (negative) as well as repulsion (positive)
            push = clamp(push, -inner * 0.5, inner * 0.5);
            pos += awayDir * push;

            // Alpha fade: invisible near center when strength is high
            vVoidFade = 1.0 - clamp(abs(voidRegion * uVoidStrength), 0.0, 1.0);
          }
          // ---- END VOID SHELL ----

          // ---- TRACK5-GRAVITY: Gravitational spiral toward void ----
          if (uGravityStrength > 0.001 && freezeMultiplier > 0.01) {
            vec3 toGravity = uGravityCenter - pos;
            float distToCenter = length(toGravity);

            // Only affect particles within gravity radius
            if (distToCenter < uGravityRadius && distToCenter > 0.1) {
              // Influence falls off with distance squared (realistic gravity)
              float influence = 1.0 - (distToCenter / uGravityRadius);
              influence = influence * influence; // Squared falloff

              // Direction toward gravity center
              vec3 gravDir = toGravity / distToCenter;

              // Inward pull - stronger as particles get closer
              float pullStrength = uGravityStrength * influence * 0.08 * freezeMultiplier;

              // Spiral motion: rotate around gravity center as falling in
              float angle = atan(pos.z - uGravityCenter.z, pos.x - uGravityCenter.x);
              float spiralAngle = angle + uSpiralRate * uTime * influence * 0.5;

              // Calculate new position with spiral
              float newRadius = distToCenter - pullStrength; // Slowly shrink orbit
              newRadius = max(newRadius, uEventHorizon * 0.5); // Don't go inside event horizon

              // Apply spiral rotation
              pos.x = uGravityCenter.x + newRadius * cos(spiralAngle);
              pos.z = uGravityCenter.z + newRadius * sin(spiralAngle);

              // Vertical compression toward disk plane (accretion disk effect)
              float verticalOffset = pos.y - uGravityCenter.y;
              pos.y = uGravityCenter.y + verticalOffset * (1.0 - influence * 0.3);

              // Fade alpha for particles near event horizon
              if (distToCenter < uEventHorizon * 1.5) {
                float horizonFade = smoothstep(uEventHorizon * 0.8, uEventHorizon * 1.5, distToCenter);
                vVoidFade *= horizonFade;
              }
            }
          }
          // ---- END TRACK5-GRAVITY ----

          // P6-TORNADO: Real helical vortex in cylindrical coordinates
          // GIGA-AUDIT: Vortex also affected by freeze
          if (uAttractorStrength > 0.0 && freezeMultiplier > 0.01) {
            // Convert to cylindrical (r, theta, y) relative to attractor
            vec3 rel = pos - uAttractorPos;
            float r = length(rel.xz);
            float theta = atan(rel.z, rel.x);
            float y = rel.y;

            // Height progress (0=bottom, 1=top)
            float heightProgress = (y + uVortexHeight * 0.5) / uVortexHeight;
            heightProgress = clamp(heightProgress, 0.0, 1.0);

            // Funnel shape: narrow at bottom, wide at top
            float targetRadius = mix(uFunnelBottom, uFunnelTop, heightProgress);

            // Inward suction toward funnel wall
            float radiusDiff = r - targetRadius;
            float suctionForce = uAttractorStrength * 0.15 * radiusDiff;
            r -= suctionForce * freezeMultiplier;

            // Angular rotation (faster at bottom for realistic vortex)
            float rotationSpeed = uVortexSpeed * (2.0 - heightProgress);
            theta -= rotationSpeed * 0.1 * freezeMultiplier;

            // Vertical rise
            float riseForce = uRiseSpeed * uAttractorStrength * 0.08;
            y += riseForce * freezeMultiplier;

            // Spiral tightening motion
            float spiralAngle = y * uSpiralTightness * 0.1;
            theta += spiralAngle;

            // Respawn at bottom when reaching top (continuous flow)
            y = mod(y + uVortexHeight * 0.5, uVortexHeight) - uVortexHeight * 0.5;

            // Convert back to Cartesian
            pos = vec3(r * cos(theta), y, r * sin(theta)) + uAttractorPos;
          }

          // P0-FIX: Wrap to keep particles in visible area
          pos = wrapPosition(pos, uBounds);

          // VOID-HALO: Subtle "atmosphere band" around the event horizon.
          // This is a tiny lift for depth/readability, not a neon glow.
          if (uVoidGlow > 0.001) {
            float distToGravity = length(pos - uGravityCenter);
            float inner = max(uEventHorizon * 0.85, 0.1);
            float outer = max(uEventHorizon * 3.6, inner + 0.5);
            float band = 1.0 - smoothstep(inner, outer, distToGravity);
            float coreKill = smoothstep(0.0, inner * 0.7, distToGravity);
            vGlow = uVoidGlow * band * coreKill;
          }

          // TRACK5-SPAGHETTI: Compute strand factor near void center (visual only)
          vSpaghetti = 0.0;
          vSpaghettiDir = vec2(1.0, 0.0);
          if (uSpaghettiStrength > 0.001) {
            vec3 toCenter = uGravityCenter - pos;
            float distToCenter = length(toCenter);
            float outer = max(uSpaghettiRadius, uEventHorizon + 0.001);
            float t = 1.0 - smoothstep(uEventHorizon, outer, distToCenter);
            vSpaghetti = clamp(uSpaghettiStrength * t, 0.0, 1.0);
          }

          // Stellar scintillation
          // GIGA-AUDIT: Reduce scintillation when frozen for stillness effect
          float scintTime = uTime * uScintSpeed * freezeMultiplier;
          float scint = hash(pos + vec3(scintTime)) * 0.5 - 0.25;
          scint *= (0.3 + 0.7 * freezeMultiplier); // Min 30% twinkle even when frozen

          // Pulsar effect
          float pulse = 1.0;
          if (aPulseSpeed > 0.0) {
            pulse = sin(uTime * aPulseSpeed * uPulseRate + aPhase) * 0.3 + 0.7;
          }

          vIntensity = (1.0 + scint) * pulse * uFieldScale;
          vSize = aSize * vIntensity;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vNdc = gl_Position.xy / gl_Position.w;

          // TRACK5-SPAGHETTI: Direction toward void center in view space (for strand orientation)
          if (vSpaghetti > 0.001) {
            vec4 mvCenter = modelViewMatrix * vec4(uGravityCenter, 1.0);
            vec2 dir2 = mvCenter.xy - mvPosition.xy;
            float dirLen = length(dir2);
            if (dirLen > 0.0001) {
              vec2 dirBase = dir2 / dirLen;
              vec2 tangential = vec2(-dirBase.y, dirBase.x);
              float spiralMix = clamp(uSpiralRate * 0.9, 0.0, 1.0);
              vSpaghettiDir = normalize(mix(dirBase, tangential, spiralMix));
            }
          }

          // Size attenuation
          float dist = length(mvPosition.xyz);
          float pointSize = vSize * (200.0 / dist) * (1.0 + vSpaghetti * 0.22); // Keep strands readable without edge smears
          gl_PointSize = clamp(pointSize, 0.70, 9.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vIntensity;
        varying float vSize;
        varying float vPhase;
        varying float vVoidFade;  // VOID-REPULSION: Alpha fade from void
        varying float vGlow;      // VOID-HALO: emissive tint factor
        varying float vSpaghetti; // TRACK5-SPAGHETTI
        varying vec2 vSpaghettiDir; // TRACK5-SPAGHETTI
        varying vec2 vNdc;

        uniform float uOpacity;
        uniform float uTime;
        uniform float uVoidGlow;
        uniform float uSoftBounds;
        
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5, 0.5);
          float dist = length(uv);
          
          // Shape mask: keep stars circular, but allow "spaghetti" strands to elongate.
          float circleMask = 1.0 - smoothstep(0.48, 0.5, dist);
          
          // Balanced star rendering - visible but not overwhelming
          float star = pow(max(0.0, 1.0 - dist * 2.1), 6.0) * 0.4; // Softer core
          float glow = exp(-dist * 4.0) * 0.2; // Softer glow
          float corona = exp(-dist * 2.0) * 0.08; // Faint corona

          float starIntensity = (star + glow + corona) * vIntensity * circleMask;

          // TRACK5-SPAGHETTI: Strand mask (screen-space, oriented toward center)
          vec2 dir = normalize(vSpaghettiDir);
          vec2 n = vec2(-dir.y, dir.x);
          float along = dot(uv, dir);
          float across = dot(uv, n);
          // Filmic: avoid “rectangular bars”.
          // 1) Add a gentle arc bend (per-particle) so streaks read as curved trajectories near the void.
          // 2) Keep a tiny ripple so streaks feel alive (but not “wiggly”).
          float bend = (sin(vPhase * 6.2831) * 0.5 + 0.5) * 2.0 - 1.0; // -1..1
          across += bend * (along * along) * 0.22 * vSpaghetti;
          float ripple = sin((along * 6.0 + vPhase) * 6.2831 + uTime * 0.35) * 0.016 * vSpaghetti;
          across += ripple;

          // Asymmetric taper: gives each streak a “head” and a “tail” so it feels less spritey.
          float dirSign = (sin(vPhase * 91.7) > 0.0) ? 1.0 : -1.0;
          float alongS = along * dirSign;
          float headFade = 1.0 - smoothstep(0.05, 0.5, alongS);
          float tailFade = smoothstep(-0.5, -0.1, alongS);
          float taper = headFade * tailFade;

          float strandCoreMask = exp(-pow(across * 30.0, 2.0)) * exp(-pow(along * 2.8, 2.0));
          float strandGlowMask = exp(-pow(across * 13.0, 2.0)) * exp(-pow(along * 1.9, 2.0));
          strandCoreMask *= taper;
          strandGlowMask *= taper;
          float streakNoise = 0.85 + 0.15 * sin((along * 8.0 + vPhase) * 6.2831 + uTime * 0.9);
          float strandIntensity = (strandCoreMask * 0.48 + strandGlowMask * 0.14) * vIntensity * streakNoise;
          float strandMask = clamp(strandCoreMask + strandGlowMask, 0.0, 1.0);

          float finalIntensity = starIntensity * (1.0 - vSpaghetti * 0.62) + strandIntensity * vSpaghetti * 0.42;
          finalIntensity = min(finalIntensity, 0.95);
          
          // Desaturate colors for more realistic space look
          vec3 desaturated = mix(vec3(0.80), vColor, 0.62); // Mix with neutral gray
          vec3 spaghettiTint = vec3(0.74, 0.74, 0.75); // Neutral gray-violet (avoid electric blue edge artifacts)
          vec3 colorMix = mix(desaturated, spaghettiTint, vSpaghetti * 0.06);
          // VOID-HALO: tiny atmosphere tint (kept monochrome/noir).
            vec3 glowTint = vec3(0.12, 0.10, 0.17); // Dark purple-grey (noir-safe)
            vec3 finalColor = colorMix * finalIntensity + glowTint * (vGlow * 0.08);
            vec3 hdrColor = finalColor * 1.12;
            vec3 knee = hdrColor / (vec3(1.0) + hdrColor);
            finalColor = mix(hdrColor, knee, 0.3);

          // VOID-REPULSION: Apply void fade to alpha
          float maskMix = mix(circleMask, strandMask, vSpaghetti);
          if (maskMix < 0.001) discard;

          float edgeDist = length(vNdc);
          // Fade earlier to avoid hard pop at high velocities (still radial, not square).
          float edgeFade = 1.0 - smoothstep(0.74, 0.93, edgeDist);
          float finalAlpha = finalIntensity * uOpacity * vVoidFade * maskMix;
          finalAlpha *= mix(1.0, edgeFade, uSoftBounds);
          finalColor *= mix(1.0, edgeFade, uSoftBounds);
          finalColor = clamp(finalColor, vec3(0.0), vec3(0.72));
          gl_FragColor = vec4(finalColor, finalAlpha);

          if (gl_FragColor.a < 0.005) discard;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }
  
  createNebulas() {
    const { clusterCount, galaxyRadius, thickness } = this.config;
    
    // Place nebulas at cluster positions
    for (let i = 0; i < clusterCount; i++) {
      const r = Math.sqrt(Math.random()) * galaxyRadius * 0.7;
      const theta = Math.random() * Math.PI * 2;
      const pos = new THREE.Vector3(
        r * Math.cos(theta),
        (Math.random() - 0.5) * thickness,
        r * Math.sin(theta)
      );
      
      const geometry = new THREE.PlaneGeometry(10, 10);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uOpacity: { value: 0.05 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uBass;
          uniform float uOpacity;
          
          float rand(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
          }
          
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u * u * (3.0 - 2.0 * u);
            
            float res = mix(
              mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
              mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
              u.y
            );
            return res * res;
          }
          
          void main() {
            vec2 uv = vUv - 0.5;
            float n = noise(uv * 5.0 + uTime * 0.1) * 0.5 + 
                      noise(uv * 10.0 - uTime * 0.05) * 0.3;
            float dist = length(uv);
            float alpha = n * uOpacity * (1.0 + uBass * 0.3) * smoothstep(0.5, 0.0, dist);
            vec3 color = vec3(0.3, 0.4, 0.6);
            gl_FragColor = vec4(color * alpha, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
      mesh.rotation.z = Math.random() * Math.PI;
      
      this.nebulaGroup.add(mesh);
      this.nebulaMeshes.push({ mesh, material });
    }
  }
  
  _smooth(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }
  
  update(audio, dt) {
    const isVoidDust = this.cfg?.mode === 'void_dust' || this.cfg?.params?.mode === 'void_dust';

    // MP-TJ-StarDust-03: Throttle updates on poor/critical performance
    this._frameCounter++;
    if ((this._frameCounter & 7) === 0) {
      this._performanceRating = (typeof window !== 'undefined' && window.performanceOptimizer)
        ? window.performanceOptimizer.getPerformanceMetrics().performanceRating
        : 'excellent';
    }
    const performanceRating = this._performanceRating;

    const shouldUpdate = performanceRating === 'critical'
      ? (this._frameCounter % 3 === 0)
      : (performanceRating === 'poor' || (isVoidDust && performanceRating !== 'excellent'))
        ? (this._frameCounter % 2 === 0)
        : true;

    if (!shouldUpdate) return;

    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));
    const mid = this._smooth('mid', Math.min(1, audio?.mid ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const loud = this._smooth('loud', Math.min(1, audio?.loudness ?? 0));

    // Amplified reactivity with dual-rate EMA
    const alphaAttack = 0.6;
    const alphaDecay = 0.2;

    // P6-TORNADO: Update vortex transition system
    this._updateVortexTransition(dt);
    this._updateAudioReactiveVortex(audio);

    // BURST-EFFECT: Update particle burst system
    this._updateBurst(dt);

    // Update each layer
    if (this.palette.accent !== this._accentKey) {
      this._accentKey = this.palette.accent;
      this._accentColor.set(this._accentKey);
    }

    for (const layer of this._layerEntries) {
      // P0-FIX: Reduced group rotation since individual particles now drift
      // Keep subtle rotation for ambient motion, but individual drift is the main movement
      const depthFactor = layer.depthFactor || 0.1;
      layer.group.rotation.y += layer.driftSpeed * dt * depthFactor * 0.3;

      // Update material uniforms - AMPLIFIED
      layer.material.uniforms.uTime.value += dt;
      // BOOST-STARS: Increased treble reactivity (was 1.5, now 2.0)
      const trebleScale = isVoidDust ? 0.35 : 1.0;
      const midScale = isVoidDust ? 0.5 : 1.0;
      layer.material.uniforms.uScintSpeed.value = 0.5 + treble * 2.0 * trebleScale;
      layer.material.uniforms.uPulseRate.value = 0.8 + mid * 0.7 * midScale;

      // P0-FIX: Control individual particle drift speed based on audio
      // GUIDE-FIX-1b: Reduced from 0.8+0.4 for cinematic feel
      // BOOST-STARS: Increased bass multiplier (was 0.1, now 0.15)
      const baseDrift = isVoidDust ? (0.04 + bass * 0.06) : (0.15 + bass * 0.15);
      layer.material.uniforms.uDriftScale.value = baseDrift;

      // Amplified field scale with dual-rate EMA
      // BOOST-STARS: Increased loudness reactivity (was 0.5+loud*2.0, now 0.6+loud*2.5)
      const targetScale = isVoidDust ? (0.46 + loud * 0.90) : (0.6 + loud * 2.5);
      const currentScale = layer.material.uniforms.uFieldScale.value;
      const scaleAlpha = (targetScale > currentScale) ? alphaAttack : alphaDecay;
      layer.material.uniforms.uFieldScale.value = currentScale + (targetScale - currentScale) * scaleAlpha;
      const minScale = isVoidDust ? 0.55 : 0.85;
      const maxScale = isVoidDust ? 1.35 : 2.5;
      layer.material.uniforms.uFieldScale.value = THREE.MathUtils.clamp(layer.material.uniforms.uFieldScale.value, minScale, maxScale);

      // Palette color tinting if uniform exists
      if (layer.material.uniforms.uColor) {
        layer.material.uniforms.uColor.value.lerp(this._accentColor, loud * 0.3);
      }
    }

    // Update nebulas
    for (let nebula of this.nebulaMeshes) {
      nebula.material.uniforms.uTime.value += dt;
      nebula.material.uniforms.uBass.value = bass;
    }
  }

  /**
   * GUIDE-FIX-5: Activate vortex mode for climax moments
   * Particles circle around attractor point (egg)
   * @param {Object} params - { strength: 0-1, speed: 0-1 }
   */
  setVortexMode(params) {
    const strength = params.strength || 0;
    const speed = params.speed || 0;
    // P6-TORNADO: New cylindrical funnel parameters
    const height = params.height || 10.0;
    const topRadius = params.topRadius || 8.0;
    const bottomRadius = params.bottomRadius || 1.0;
    const riseSpeed = params.riseSpeed || 0.8;
    const spiralTightness = params.spiralTightness || 2.0;

    for (let name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uAttractorStrength) {
        layer.material.uniforms.uAttractorStrength.value = strength;
        layer.material.uniforms.uVortexSpeed.value = speed;
        // P6-TORNADO: Set new funnel uniforms
        if (layer.material.uniforms.uVortexHeight) {
          layer.material.uniforms.uVortexHeight.value = height;
          layer.material.uniforms.uFunnelTop.value = topRadius;
          layer.material.uniforms.uFunnelBottom.value = bottomRadius;
          layer.material.uniforms.uRiseSpeed.value = riseSpeed;
          layer.material.uniforms.uSpiralTightness.value = spiralTightness;
        }
      }
    }
  }

  /**
   * P6-TORNADO: Initiate smooth vortex transition with easing
   * @param {Object} target - Target vortex parameters
   * @param {number} duration - Transition time in seconds
   * @param {string} easing - Easing function name
   */
  transitionVortex(target, duration = 3.0, easing = 'easeInOutCubic') {
    this.vortexState.targetStrength = target.strength || 0;
    this.vortexState.targetSpeed = target.speed || 0;
    this.vortexState.transitionDuration = duration;
    this.vortexState.transitionElapsed = 0;
    this.vortexState.easing = easing;

    // Store target shape parameters (applied immediately, only strength/speed animate)
    this.vortexState.targetParams = {
      height: target.height || 10.0,
      topRadius: target.topRadius || 8.0,
      bottomRadius: target.bottomRadius || 1.0,
      riseSpeed: target.riseSpeed || 0.8,
      spiralTightness: target.spiralTightness || 2.0
    };

    if (window.SONOITE_DEBUG) {
      console.log('[P6-TORNADO] Transition initiated:', {
        from: { strength: this.vortexState.currentStrength, speed: this.vortexState.currentSpeed },
        to: { strength: target.strength, speed: target.speed },
        duration,
        easing
      });
    }
  }

  /**
   * P6-TORNADO: Easing functions for smooth transitions
   */
  _ease(t, type) {
    switch (type) {
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOutCubic':
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      default: // linear
        return t;
    }
  }

  /**
   * P6-TORNADO: Update vortex transition (called every frame)
   */
  _updateVortexTransition(dt) {
    const state = this.vortexState;

    // No active transition
    if (state.transitionElapsed >= state.transitionDuration) {
      return;
    }

    // Advance transition
    state.transitionElapsed += dt;
    const progress = Math.min(1.0, state.transitionElapsed / state.transitionDuration);
    const easedProgress = this._ease(progress, state.easing);

    // Interpolate strength and speed
    const strengthStart = state.currentStrength;
    const speedStart = state.currentSpeed;
    const strengthEnd = state.targetStrength;
    const speedEnd = state.targetSpeed;

    state.currentStrength = strengthStart + (strengthEnd - strengthStart) * easedProgress;
    state.currentSpeed = speedStart + (speedEnd - speedStart) * easedProgress;

    // Apply to uniforms
    this.setVortexMode({
      strength: state.currentStrength,
      speed: state.currentSpeed,
      ...state.targetParams
    });

    if (window.SONOITE_DEBUG && Math.random() < 0.05) { // Log 5% of frames
      console.log(`[P6-TORNADO] ${(progress * 100).toFixed(0)}% | Str: ${state.currentStrength.toFixed(2)} | Spd: ${state.currentSpeed.toFixed(2)}`);
    }
  }

  /**
   * P6-TORNADO: Modulate vortex intensity with audio peaks
   */
  _updateAudioReactiveVortex(audio) {
    const state = this.vortexState;

    // Only modulate if vortex is active
    if (state.currentStrength < 0.05) return;

    const bass = audio?.bass ?? 0;
    const loudness = audio?.loudness ?? 0;

    // Audio boost: 0-20% increase on bass peaks
    const audioBoost = bass * 0.2;
    // Allow >1.0 when the authored base strength is higher (Track 05 vortex needs headroom).
    const finalStrength = Math.min(3.0, state.currentStrength + audioBoost);

    // Speed fluctuation: ±10% based on loudness
    const speedVariance = (loudness - 0.5) * 0.2; // -0.1 to +0.1
    const finalSpeed = state.currentSpeed + speedVariance;

    // Apply modulated values directly to uniforms (bypass setVortexMode to avoid overwriting base values)
    for (let name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uAttractorStrength) {
        layer.material.uniforms.uAttractorStrength.value = finalStrength;
        layer.material.uniforms.uVortexSpeed.value = finalSpeed;
      }
    }
  }

  /**
   * GIGA-AUDIT: Set freeze level for particle stillness
   * At freeze=1.0, all particle motion stops completely
   * @param {number} freeze - 0 = normal motion, 1 = completely frozen
   */
  setFreeze(freeze) {
    const clampedFreeze = Math.max(0, Math.min(1, freeze));

    for (let name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uFreeze) {
        layer.material.uniforms.uFreeze.value = clampedFreeze;
      }
    }

    if (window.SONOITE_DEBUG && clampedFreeze > 0.5) {
      console.log(`[GIGA-AUDIT] Star dust freeze: ${(clampedFreeze * 100).toFixed(0)}%`);
    }
  }

  /**
   * ISSUE-6-FIX: Set motion mode for 7-mode choreography
   * Modes: 0=drift, 1=spiral, 2=cascade, 3=pulse, 4=freeze, 5=chaos, 6=void_eater
   * @param {number|string} mode - Mode number or name
   * @param {number} intensity - Effect intensity 0-1 (default 1.0)
   */
  setMotionMode(mode, intensity = 1.0) {
    // Map mode names to numbers
    const modeMap = {
      'drift': 0,
      'spiral': 1,
      'cascade': 2,
      'pulse': 3,
      'freeze': 4,
      'chaos': 5,
      'void_eater': 6
    };

    const modeNumber = typeof mode === 'string' ? (modeMap[mode] || 0) : mode;
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    for (let name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uMotionMode) {
        layer.material.uniforms.uMotionMode.value = modeNumber;
      }
      if (layer.material.uniforms.uMotionIntensity) {
        layer.material.uniforms.uMotionIntensity.value = clampedIntensity;
      }
      // BUG-004-FIX: Force uniform upload to GPU
      layer.material.uniformsNeedUpdate = true;
    }

    // If freeze mode (4), also set uFreeze uniform for compatibility
    if (modeNumber === 4) {
      this.setFreeze(clampedIntensity);
    }

    if (window.SONOITE_DEBUG) {
      const modeName = Object.keys(modeMap).find(k => modeMap[k] === modeNumber) || 'unknown';
      console.log(`[ISSUE-6-FIX] Motion mode: ${modeName} (${modeNumber}), intensity=${clampedIntensity.toFixed(2)}`);
    }
  }

  /**
   * BURST-EFFECT: Spawn particles from origin with radial velocity
   * Used for THE UNFREEZE moment - particles explode outward from egg
   * @param {number} count - Number of particles to burst (default 300)
   * @param {Object} params - Optional: { speed, duration, origin }
   */
  spawnBurstFromOrigin(count = 300, params = {}) {
    const speed = params.speed || 5.0;        // Base outward velocity
    const duration = params.duration || 1.5;   // How long burst effect lasts
    const origin = params.origin || { x: 0, y: 2, z: 0 }; // Egg center default

    // Initialize burst state if not present
    if (!this._burst) {
      this._burst = {
        active: false,
        startTime: 0,
        duration: 0,
        particles: []  // Track burst particles for velocity integration
      };
    }

    // Get the first (largest) layer for burst effect
    const layerName = Object.keys(this.layers)[0];
    const layer = this.layers[layerName];
    if (!layer) {
      console.warn('[StarDustFieldEnhanced] No layer available for burst');
      return;
    }

    const positions = layer.geometry.attributes.position;
    const n = positions.count;
    const burstCount = Math.min(count, Math.floor(n * 0.3)); // Max 30% of particles

    // Store original positions and generate burst velocities
    this._burst.particles = [];
    this._burst.active = true;
    this._burst.startTime = performance.now();
    this._burst.duration = duration * 1000; // Convert to ms

    for (let i = 0; i < burstCount; i++) {
      // Random particle index to burst
      const idx = Math.floor(Math.random() * n);

      // Store original position
      const originalX = positions.getX(idx);
      const originalY = positions.getY(idx);
      const originalZ = positions.getZ(idx);

      // Move particle to origin
      positions.setXYZ(idx, origin.x, origin.y, origin.z);

      // Generate random outward velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = speed * (0.5 + Math.random() * 0.5); // 50-100% of base speed

      const vx = r * Math.sin(phi) * Math.cos(theta);
      const vy = r * Math.sin(phi) * Math.sin(theta);
      const vz = r * Math.cos(phi);

      this._burst.particles.push({
        idx,
        vx, vy, vz,
        originalX, originalY, originalZ
      });
    }

    positions.needsUpdate = true;

    // Also trigger motion mode to 'chaos' briefly for extra energy
    this.setMotionMode('chaos', 0.8);

    // Schedule return to drift after burst
    setTimeout(() => {
      this.setMotionMode('drift', 1.0);
    }, duration * 1000);

    if (window.SONOITE_DEBUG) {
      console.log(`[StarDustFieldEnhanced] Burst: ${burstCount} particles from origin, speed=${speed}`);
    }

    // Emit event for JourneyState
    if (typeof window !== 'undefined' && window.JourneyState) {
      window.JourneyState.emit('particles:burst:start', { count: burstCount, duration });
    }
  }

  /**
   * BURST-EFFECT: Update burst particle positions
   * Call from update() to integrate burst velocities
   */
  _updateBurst(dt) {
    if (!this._burst?.active || !this._burst.particles.length) return;

    const elapsed = performance.now() - this._burst.startTime;
    const progress = Math.min(elapsed / this._burst.duration, 1.0);

    // Get the first layer
    const layerName = Object.keys(this.layers)[0];
    const layer = this.layers[layerName];
    if (!layer) return;

    const positions = layer.geometry.attributes.position;

    // Update each burst particle
    for (const p of this._burst.particles) {
      // Get current position
      const x = positions.getX(p.idx);
      const y = positions.getY(p.idx);
      const z = positions.getZ(p.idx);

      // Apply velocity with drag (slows down over time)
      const drag = 1.0 - progress * 0.8; // 80% drag at end
      const newX = x + p.vx * dt * drag;
      const newY = y + p.vy * dt * drag;
      const newZ = z + p.vz * dt * drag;

      positions.setXYZ(p.idx, newX, newY, newZ);
    }

    positions.needsUpdate = true;

    // End burst when complete
    if (progress >= 1.0) {
      this._burst.active = false;
      this._burst.particles = [];
    }
  }

  /**
   * CLIMAX-EVENT: Alias for spawnBurstFromOrigin with climax-specific defaults
   * Used at 6:24 climax moment for dramatic particle explosion
   */
  climaxBurst() {
    this.spawnBurstFromOrigin(400, {
      speed: 8.0,        // Faster than normal burst
      duration: 2.5,     // Longer recovery
      origin: { x: 0, y: 2, z: 0 }  // Egg center
    });

    // Also trigger bloom impulse if postfx available
    if (typeof window !== 'undefined' && window.SonoiteExperience?.postProcessing) {
      const postfx = window.SonoiteExperience.postProcessing;
      if (typeof postfx.addBloomImpulse === 'function') {
        postfx.addBloomImpulse(0.6, 0.8);  // Bright flash, 0.8s decay
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log('[StarDustFieldEnhanced] climaxBurst triggered');
    }
  }

  /**
   * FRACTURE-PHASE: Set chaos intensity for FRACTURE phase (2:05-5:29)
   * Gradually increases particle chaos as phase progresses
   * @param {number} t - Progress 0-1 through FRACTURE phase
   * @param {Object} audio - Current audio data for modulation
   */
  setFractureIntensity(t, audio = {}) {
    const clampedT = Math.max(0, Math.min(1, t));
    const loudness = audio.loudness || 0;

    // Scale chaos with time and audio
    const chaosLevel = clampedT * (0.5 + loudness * 0.5);

    // Switch to chaos motion mode with ramped intensity
    this.setMotionMode('chaos', Math.min(1.0, chaosLevel));

    // Also increase drift scale for more particle movement
    for (const name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uDriftScale) {
        // Ramp drift from 0.15 to 0.35 over FRACTURE phase
        layer.material.uniforms.uDriftScale.value = 0.15 + clampedT * 0.20;
      }
    }

    if (window.SONOITE_DEBUG && t > 0 && t < 0.1) {
      console.log(`[StarDustFieldEnhanced] setFractureIntensity: t=${clampedT.toFixed(2)}, chaos=${chaosLevel.toFixed(2)}`);
    }
  }

  /**
   * TRACK5-GRAVITY: Set gravitational attraction toward void
   * Creates accretion disk effect with spiraling particles
   * @param {Object} params - Gravity parameters
   * @param {number} params.strength - Gravity strength 0-1 (0 = off, 1 = strong pull)
   * @param {number} params.spiralRate - How fast particles spiral (0 = straight fall, 1 = fast spiral)
   * @param {Object} params.center - Gravity center { x, y, z } (default: void position)
   * @param {number} params.radius - Influence radius (default: 15)
   * @param {number} params.eventHorizon - Inner fade-out radius (default: 2.5)
   * @param {number} params.spaghettiStrength - Strand stretching near center (0 = off, 1 = full)
   * @param {number} params.spaghettiRadius - Outer radius where strands fade out (default: 10)
   */
  setGravity(params = {}) {
    const strength = Math.max(0, Math.min(1, params.strength ?? 0));
    const spiralRate = Math.max(0, Math.min(4, params.spiralRate ?? 0.5));
    const center = params.center || { x: 0, y: 2, z: 0 };
    const radius = Math.max(1, params.radius ?? 15);
    const eventHorizon = Math.max(0.5, params.eventHorizon ?? 2.5);
    const spaghettiStrength = Math.max(0, Math.min(1, params.spaghettiStrength ?? 0));
    const spaghettiRadius = Math.max(eventHorizon + 0.5, params.spaghettiRadius ?? 10);

    for (const name in this.layers) {
      const layer = this.layers[name];
      const u = layer.material.uniforms;
      if (u.uGravityStrength) {
        u.uGravityStrength.value = strength;
        u.uSpiralRate.value = spiralRate;
        u.uGravityCenter.value.set(center.x, center.y, center.z);
        u.uGravityRadius.value = radius;
        u.uEventHorizon.value = eventHorizon;
        if (u.uSpaghettiStrength) {
          u.uSpaghettiStrength.value = spaghettiStrength;
        }
        if (u.uSpaghettiRadius) {
          u.uSpaghettiRadius.value = spaghettiRadius;
        }
        layer.material.uniformsNeedUpdate = true;
      }
    }

    if (window.SONOITE_DEBUG && strength > 0.01) {
      console.log(`[TRACK5-GRAVITY] Gravity active: str=${strength.toFixed(2)}, spiral=${spiralRate.toFixed(2)}, radius=${radius}, spaghetti=${spaghettiStrength.toFixed(2)}`);
    }
  }

  /**
   * VOID-REPULSION: Set void repulsion parameters
   * Particles are pushed away from void center and fade out within radius
   * @param {number} strength - Repulsion strength 0-1 (0 = disabled)
   * @param {Object} center - Void center position { x, y, z } (default: egg position)
   * @param {number} radius - Void radius (default: 2.0)
   */
  setVoidRepulsion(strength = 0, center = { x: 0, y: 0, z: 0 }, radius = 2.0) {
    // Allow attraction as well as repulsion (-1..1)
    const clampedStrength = Math.max(-1, Math.min(1, strength));
    const clampedRadius = Math.max(0, radius);
    const cx = typeof center.x === 'number' ? center.x : center?.value?.x || 0;
    const cy = typeof center.y === 'number' ? center.y : center?.value?.y || 0;
    const cz = typeof center.z === 'number' ? center.z : center?.value?.z || 0;

    for (const name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uVoidStrength) {
        layer.material.uniforms.uVoidStrength.value = clampedStrength;
        layer.material.uniforms.uVoidCenter.value.set(cx, cy, cz);
        layer.material.uniforms.uVoidRadius.value = clampedRadius;
        // Optional emissive halo intensity derived from strength for readability
        if (layer.material.uniforms.uVoidGlow) {
          layer.material.uniforms.uVoidGlow.value = Math.max(0, Math.min(0.12, Math.abs(clampedStrength) * 0.12));
        }
      }
    }

    if (window.SONOITE_DEBUG && clampedStrength > 0.01) {
      console.log(`[VOID-REPULSION] Void repulsion active: strength=${clampedStrength.toFixed(2)}, radius=${clampedRadius.toFixed(2)}, center=(${center.x}, ${center.y}, ${center.z})`);
    }
  }

  /**
   * VOID-HALO: Set a subtle atmosphere lift near the event horizon.
   * This does NOT add a post pass; it only biases particle shader color/alpha near the void center.
   *
   * @param {number} intensity - 0..1 (recommend <= 0.6 for noir)
   */
  setVoidGlow(intensity = 0) {
    const safe = Number.isFinite(intensity) ? intensity : 0;
    const clamped = Math.max(0, Math.min(1, safe));

    for (const name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uVoidGlow) {
        layer.material.uniforms.uVoidGlow.value = clamped;
      }
    }
  }

  /**
   * TRACK5-VOID: Phase-based configuration
   * Called by Track5VoidDirector or journey-controller actionPhase
   */
  setPhase(phase) {
    const phaseConfigs = {
      VOID:      { gravity: 0.1,  spiral: 0.2, eventHorizon: 3.0, particleOpacity: 0.6 },
      AWAKENING: { gravity: 0.25, spiral: 0.4, eventHorizon: 3.5, particleOpacity: 0.8 },
      WANTING:   { gravity: 0.5,  spiral: 0.8, eventHorizon: 4.0, particleOpacity: 1.0 },
      RELEASE:   { gravity: 0.2,  spiral: 0.3, eventHorizon: 3.5, particleOpacity: 0.7 },
      ERASURE:   { gravity: 0.0,  spiral: 0.0, eventHorizon: 0.0, particleOpacity: 0.3 }
    };

    const cfg = phaseConfigs[phase];
    if (!cfg) {
      console.warn(`[StarDustFieldEnhanced] Unknown phase: ${phase}`);
      return;
    }

    console.log(`[StarDustFieldEnhanced] Phase → ${phase}`);

    // Apply gravity settings
    this.setGravity({
      strength: cfg.gravity,
      spiralRate: cfg.spiral,
      center: { x: 0, y: 2, z: 0 },
      radius: 18,
      eventHorizon: cfg.eventHorizon
    });

    // Apply opacity to all layers
    for (const name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uOpacity) {
        layer.material.uniforms.uOpacity.value = cfg.particleOpacity;
      }
    }

    // Freeze particles in ERASURE
    if (phase === 'ERASURE') {
      this.setFreeze(1.0);
    } else {
      this.setFreeze(0.0);
    }
  }

  /**
   * TRACK5-VOID: Set particle density by phase name
   * Called by Track5VoidDirector
   */
  setPhaseParticleDensity(phaseName, duration = 5.0) {
    // Map phase names to density multipliers
    const densityMap = {
      VOID: 0.34,
      AWAKENING: 0.56,
      WANTING: 0.74,
      RELEASE: 0.46,
      ERASURE: 0.2
    };

    const targetDensity = densityMap[phaseName] ?? 0.5;

    // Apply to all layers with smooth transition
    for (const name in this.layers) {
      const layer = this.layers[name];
      const baseCount = layer.baseCount || layer.geometry?.attributes?.position?.count || 0;
      const nextCount = Math.max(24, Math.round(baseCount * targetDensity));
      layer.activeCount = nextCount;
      if (layer.geometry?.setDrawRange) {
        layer.geometry.setDrawRange(0, nextCount);
      }
    }

    if (window.SONOITE_DEBUG) {
      console.log(`[StarDustFieldEnhanced] Density → ${targetDensity} (${phaseName})`);
    }
  }

  /**
   * TRACK5-VOID: Enable/disable particle trails
   */
  setTrailsEnabled(enabled) {
    for (const name in this.layers) {
      const layer = this.layers[name];
      if (layer.material.uniforms.uTrailLength) {
        layer.material.uniforms.uTrailLength.value = enabled ? 0.3 : 0.0;
      }
    }
    if (window.SONOITE_DEBUG) {
      console.log(`[StarDustFieldEnhanced] Trails: ${enabled ? 'ON' : 'OFF'}`);
    }
  }

  unmount() {
    // Clean up layers
    for (let name in this.layers) {
      const layer = this.layers[name];
      layer.geometry.dispose();
      layer.material.dispose();
    }
    
    // Clean up nebulas
    for (let nebula of this.nebulaMeshes) {
      nebula.mesh.geometry.dispose();
      nebula.material.dispose();
    }
    
    super.unmount();
  }
}
