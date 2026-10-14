import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

const VOID_UNIFORM_GUARDS = Object.freeze({
  uIntensity: Object.freeze({ min: 0, max: 2.0 }),
  uLensStrength: Object.freeze({ min: 0, max: 0.82 }),
  uVortexSpeed: Object.freeze({ min: 0, max: 0.65 }),
  uEventHorizonGlow: Object.freeze({ min: 0, max: 0.55 }),
  uInfiniteDepth: Object.freeze({ min: 0, max: 0.82 }),
  uVertexDisplacement: Object.freeze({ min: 0, max: 0.24 })
});
const VOID_INTENSITY_CAP = 1.40;

/**
 * VoidSphere - Inverse of EggOrb
 * Creates darkness through subtractive blending
 * Bass causes CONTRACTION (opposite of egg expansion)
 * Fresnel creates dark edges (opposite of egg's bright edges)
 * Phase uniform drives 5-phase journey arc
 */
export class VoidSphere extends VisualLayer {
  mount() {
    // MP-LAYER-GUARDS: Defensive THREE guard
    const THREE = this.ctx?.THREE || window.THREE;
    if (!THREE) {
      console.error('[VoidSphere] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    super.mount();
    const params = this.cfg?.params || this.cfg || {};
    // EDGE-COLOR-FIX: Prefer cfg.edgeColor/params.edgeColor over palette accent for initial color
    // Config may come as cfg.edgeColor or cfg.params.edgeColor depending on how layer was created
    const edgeColor = params.edgeColor || '#32415e';
    const darkColor = params.darkColor || '#000000';
    const glowColor = params.glowColor || '#434f76';
    const glowIntensity = params.glowIntensity ?? 0.26;

    // Configuration
    this.baseRadius = params.radius || 1.8;
    this.bassContractionScale = params.bassContraction || 0.08; // Reduced from 0.18 for subtler contraction
    this.phaseBoostScale = params.phaseBoost || 0.6; // How much phase affects intensity
    // Authorable intensity lane (timeline `opacity` actions) must remain independent
    // from phase modulation, otherwise phase transitions overwrite authored visibility.
    this._authoredIntensity = params.intensity || 1.0;

    // Device LOD
    this.lod = this.getDeviceLOD();
    const subdivs = this.lod === 1 ? 24 : this.lod === 2 ? 32 : 40;

    // Geometry - sphere starting at 1.8 radius
    const geometry = new THREE.SphereGeometry(this.baseRadius, subdivs, subdivs);

    // Shader material with inverse fresnel
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uPhase: { value: 0 }, // 0-1 journey progress
        uDarkColor: { value: new THREE.Color(darkColor) }, // Core darkness
        uEdgeColor: { value: new THREE.Color(edgeColor) },  // Edge darkness - now uses cfg
        uGlowColor: { value: new THREE.Color(glowColor) }, // Dark aura tint (authorable)
        uGlowIntensity: { value: glowIntensity }, // 0..1 (very dark; clamped in shader)
        uIntensity: { value: params.intensity || 1.0 },
        uErosion: { value: params.erosion || 0.0 }, // Surface erosion amount (0-1)
        uLensStrength: { value: params.lensStrength || 0.30 }, // Gravitational lensing
        uVortexSpeed: { value: params.vortexSpeed || 0.3 }, // Interior spiral speed
        uEventHorizonGlow: { value: params.eventHorizonGlow || 0.34 }, // Edge rim intensity
        uInfiniteDepth: { value: params.infiniteDepth || 0.68 }, // Depth illusion strength
        uVertexDisplacement: { value: params.vertexDisplacement || 0.12 }, // Shape distortion
        uGrainStrength: { value: params.grainStrength || 0.02 }, // Subtle film grain
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uVertexDisplacement;

        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vFresnel;
        varying vec3 vWorldPosition;
        varying vec2 vScreenUV;
        varying vec2 vCenterUV;
        varying float vDepth;

        // Simplex noise for vertex displacement
        vec3 mod289v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289v(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permutev(vec4 x) { return mod289v(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrtv(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoisev(vec3 v) {
          const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289v(i);
          vec4 p = permutev(permutev(permutev(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrtv(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        void main() {
          // Multi-octave noise for organic displacement
          float time = uTime * 0.15;
          vec3 noisePos = position * 1.5 + vec3(time * 0.3, time * 0.2, time * 0.25);

          float noise1 = snoisev(noisePos) * 0.6;
          float noise2 = snoisev(noisePos * 2.1 + vec3(100.0)) * 0.25;
          float noise3 = snoisev(noisePos * 4.3 + vec3(200.0)) * 0.15;
          float totalNoise = noise1 + noise2 + noise3;

          // Bass adds extra turbulence
          float bassNoise = snoisev(noisePos * 3.0 + vec3(uTime * 2.0)) * uBass * 0.3;
          totalNoise += bassNoise;

          // Displace vertices along normal
          vec3 displacedPosition = position + normal * totalNoise * uVertexDisplacement;

          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
          vViewDir = normalize(-mvPosition.xyz);

          // Inverse fresnel - edges are DARKER (opposite of egg)
          float ndv = max(dot(vNormal, vViewDir), 0.0);
          vFresnel = pow(1.0 - ndv, 2.0);

          // World position for noise sampling
          vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;

          // Screen UV for lensing effects
          vec4 clipPos = projectionMatrix * mvPosition;
          vScreenUV = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
          vec4 centerClip = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0));
          vCenterUV = (centerClip.xy / centerClip.w) * 0.5 + 0.5;
          vDepth = -mvPosition.z;

          gl_Position = clipPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
          uniform float uPhase;
          uniform vec3 uDarkColor;
          uniform vec3 uEdgeColor;
          uniform vec3 uGlowColor;
          uniform float uGlowIntensity;
          uniform float uIntensity;
          uniform float uErosion;
          uniform float uLensStrength;  // Gravitational lensing intensity
          uniform float uVortexSpeed;   // Interior spiral speed
          uniform float uEventHorizonGlow;  // Edge glow intensity
        uniform float uInfiniteDepth;     // Depth illusion strength
        uniform float uGrainStrength;     // Film grain amount

        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vFresnel;
        varying vec3 vWorldPosition;
        varying vec2 vScreenUV;
        varying vec2 vCenterUV;
        varying float vDepth;

        // ===== ASHIMA ARTS 3D SIMPLEX NOISE =====
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
          return mod289(((x * 34.0) + 1.0) * x);
        }

        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          // First corner
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          // Other corners
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          // Permutations
          i = mod289(i);
          vec4 p = permute(permute(permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          // Gradients
          float n_ = 0.142857142857; // 1.0/7.0
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          // Normalize gradients
          vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          // Mix final noise value
          vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        // ===== GRAVITATIONAL LENSING =====
        // Warps space toward the void center - makes it feel like a black hole
        vec2 gravitationalLens(vec2 uv, vec2 center, float strength) {
          vec2 fromCenter = uv - center;
          float dist = length(fromCenter);

          // Schwarzschild-inspired radial warp - stronger near center
          float warp = strength / max(dist + 0.15, 0.001);
          warp = min(warp, 0.4); // Prevent extreme distortion

          vec2 dir = fromCenter / max(dist, 0.0001);
          return uv - dir * warp * 0.08;
        }

        // ===== VORTEX SPIRAL - creates infinite depth illusion =====
        float vortexSpiral(vec3 pos, float time, float speed) {
          float angle = atan(pos.z, pos.x);
          float dist = length(pos.xz);

          // Kepler-style orbital speed (faster near center)
          float orbitalSpeed = speed / max(sqrt(dist), 0.3);
          angle += time * orbitalSpeed;

          // Multiple spiral arms
          float spiral = sin(angle * 4.0 - dist * 3.0 + time * speed);
          spiral = spiral * 0.5 + 0.5;

          // Fade toward center
          float centerFade = smoothstep(0.0, 0.5, dist);

          return spiral * centerFade;
        }

          // ===== EVENT HORIZON RIM =====
          // Visible dark purple glow at the edge - ominous but clear
          vec3 eventHorizonRim(float fresnel, float glowIntensity, float bass) {
            // Photon sphere - light orbiting just outside event horizon
            float photonRim = pow(fresnel, 1.65); // 6-AGENT-FIX: Wider Fresnel (was 2.15) so sphere reads against black BG

          // Odd sci-fi/noir: tungsten-to-ion rim, restrained and filmic.
            vec3 coolTint = vec3(0.165, 0.142, 0.275);
            vec3 warmTint = vec3(0.235, 0.172, 0.118);
            // Allow authored edgeColor to steer hue without blowing out.
            coolTint = mix(coolTint, uEdgeColor, 0.22);
            warmTint = mix(warmTint, uEdgeColor, 0.16);

            // Position-based variation (Doppler effect)
            float dopplerMix = sin(atan(vWorldPosition.z, vWorldPosition.x) * 2.0) * 0.5 + 0.5;
            vec3 dopplerColor = mix(warmTint, coolTint, dopplerMix);

          // Bass pulse - STRONG audio reactivity
          float rimPulse = 1.0 + bass * 0.72;

          return dopplerColor * photonRim * glowIntensity * rimPulse * 1.08;
        }

        // ===== INFINITE DEPTH LAYERS =====
        // Multiple concentric rings create illusion of looking into abyss
        // Visible but dark - creates depth perception
          vec3 infiniteDepthLayers(vec3 pos, float time, float strength) {
            vec3 layerColor = vec3(0.0);

            // 4 depth layers at different radii (reduced from 5 for lower GPU cost)
            for (int i = 0; i < 4; i++) {
            float layerRadius = 0.2 + float(i) * 0.15;
            float dist = length(pos);

            // Ring at this depth
            float ring = smoothstep(layerRadius - 0.05, layerRadius, dist)
                       * (1.0 - smoothstep(layerRadius, layerRadius + 0.05, dist));

            // Each layer rotates at different speed
            float layerAngle = atan(pos.z, pos.x) + time * (0.1 + float(i) * 0.05);
            float spiral = sin(layerAngle * 6.0) * 0.5 + 0.5;

              // DARK PURPLE-GREY: Keep depth cues monochrome/noir, but with subtle purple bias.
              float depthFade = 1.0 - float(i) * 0.15;
              vec3 base = mix(vec3(0.048, 0.042, 0.070), uEdgeColor * 0.18, 0.26);
              vec3 deep = mix(vec3(0.018, 0.016, 0.028), uEdgeColor * 0.10, 0.18);
              vec3 layerTint = mix(base, deep, float(i) / 3.0);

              layerColor += layerTint * ring * spiral * depthFade * strength;
            }

            return layerColor;
        }

        void main() {
          // ===== GRAVITATIONAL LENSING EFFECT =====
          // Apply space-warping at the edges
          float screenEdge = min(
            min(vScreenUV.x, 1.0 - vScreenUV.x),
            min(vScreenUV.y, 1.0 - vScreenUV.y)
          );
          float edgeFade = smoothstep(0.02, 0.14, screenEdge);
          float nearFade = smoothstep(0.18, 1.05, vDepth);
          float artifactGuard = edgeFade * nearFade;
          float edgeGuard = mix(0.25, 1.0, artifactGuard);

          vec2 lensedUV = gravitationalLens(vScreenUV, vCenterUV, uLensStrength * (1.0 + uBass * 0.3));
          float lensDistortion = length(lensedUV - vScreenUV) * 4.0 * edgeGuard;

          // Double-sided support: compute fresnel in fragment so interior doesn't “flip”
          vec3 n = normalize(vNormal);
          if (!gl_FrontFacing) n = -n;
          float ndv = max(dot(n, normalize(vViewDir)), 0.0);
          float fresnel = pow(1.0 - ndv, 2.0);

          // ===== SURFACE EROSION =====
          float erosionScale = 3.5;
          float timeScale = 0.15;
          float noise1 = snoise(vWorldPosition * erosionScale + vec3(uTime * timeScale));
          float noise2 = snoise(vWorldPosition * erosionScale * 2.3 + vec3(uTime * timeScale * 1.4));
          float noise3 = snoise(vWorldPosition * erosionScale * 5.1 + vec3(uTime * timeScale * 0.7));
          float erosionNoise = noise1 * 0.6 + noise2 * 0.25 + noise3 * 0.15;
          erosionNoise = erosionNoise * 0.5 + 0.5;

          float edgeMask = pow(fresnel, 1.5);
          float erosionThreshold = 1.0 - (uErosion * edgeMask);
          float erosionMask = 1.0;
          if (uErosion > 0.001) {
            float softStart = erosionThreshold - 0.22;
            float softEnd = erosionThreshold + 0.06;
            erosionMask = smoothstep(softStart, softEnd, erosionNoise);
          }

          // ===== CORE CALCULATIONS =====
          float coreMask = 1.0 - fresnel;

          // ===== VORTEX INTERIOR - spiraling into infinite depth =====
          float vortex = vortexSpiral(vWorldPosition, uTime, uVortexSpeed);
          vortex *= coreMask; // Stronger in center
          vortex *= (0.6 + uMid * 1.2); // Mid frequencies STRONGLY drive vortex

          // ===== INFINITE DEPTH ILLUSION =====
          vec3 depthLayers = infiniteDepthLayers(vWorldPosition, uTime * 0.3, uInfiniteDepth);
          depthLayers *= coreMask * 1.35;

          // ===== EVENT HORIZON GLOW =====
          vec3 eventHorizon = eventHorizonRim(fresnel, uEventHorizonGlow, uBass);
          eventHorizon *= edgeGuard;

          // ===== INNER PULSE - heartbeat of the void =====
          float pulseRate = 0.4 + uBass * 0.8; // More bass-driven pulse rate
          float innerPulse = sin(uTime * pulseRate * 3.14159) * 0.5 + 0.5;
          innerPulse = pow(innerPulse, 1.5); // Less aggressive power curve
          innerPulse *= (0.7 + uBass * 0.8); // Bass amplifies pulse intensity

          // ===== SURFACE VEINS =====
          float veinNoise = snoise(vWorldPosition * 8.0 + vec3(uTime * 0.1));
          float veinNoise2 = snoise(vWorldPosition * 15.0 - vec3(uTime * 0.05));
          float veins = smoothstep(0.3, 0.35, abs(veinNoise)) * smoothstep(0.25, 0.3, abs(veinNoise2));
          veins *= (0.3 + uBass * 2.5 + uTreble * 1.0); // Bass AND treble drive veins

          // ===== BUILD FINAL COLOR =====
          // The void should read as *absence* (no neon glow), but it must not read as a flat mask.
          // We keep everything extremely dark while adding subtle volumetric cues (depth layers + photon rim).
            float rim = pow(fresnel, 2.8);
            float intensity = clamp(uIntensity, 0.0, 2.0);
            float visualIntensity = intensity * (0.92 + 0.16 * erosionMask);
            float rimStrength = (0.06 + clamp(uEventHorizonGlow, 0.0, 1.0)) * 0.42 * visualIntensity;
            float rimTexture = clamp((0.35 + 0.65 * vortex) + veins * 0.25 + lensDistortion * 0.15, 0.0, 1.0);

            float core = pow(coreMask, 1.25);
            vec3 coreTint = mix(uEdgeColor, vec3(0.104, 0.090, 0.154), 0.36);

            vec3 voidColor = uDarkColor;
            // Subtle interior structure (very dark) so the void reads as 3D volume, not a 2D cut-out.
            voidColor += depthLayers * 0.82 * visualIntensity;
            voidColor += coreTint * core * (vortex * 0.14 + innerPulse * 0.08 + veins * 0.04) * uInfiniteDepth * 0.38 * visualIntensity;

            // Photon rim / event horizon cue (still dark).
            voidColor += eventHorizon * 0.50 * visualIntensity;

            // Silhouette rim (dark edge definition).
            voidColor += uEdgeColor * rim * rimStrength * rimTexture * 0.56 * edgeGuard;

            // Dark aura: black center + subtle purple-grey "light" at the rim + mid-core.
            float auraRim = pow(fresnel, 1.7) * edgeGuard;
            float auraNoise = 0.85 + 0.15 * sin(uTime * 0.25 + dot(vWorldPosition, vec3(0.4, 0.7, 0.2)));
            float auraInner = pow(coreMask, 1.35) * (1.0 - pow(coreMask, 9.0));
            auraInner *= (0.35 + 0.65 * vortex) * (0.4 + 0.6 * innerPulse);
            vec3 auraTint = mix(uGlowColor, vec3(0.090, 0.078, 0.146), 0.60);
            voidColor += auraTint * (auraRim * auraNoise * 0.22 + auraInner * 0.10) * clamp(uGlowIntensity, 0.0, 0.48) * visualIntensity;

            // Keep center black; only allow a restrained inner lift so the sphere reads volumetric, not flat.
            float centerLift = pow(coreMask, 1.8) * (0.04 + 0.10 * uInfiniteDepth);
            voidColor += coreTint * centerLift * 0.60 * visualIntensity;

            // Presence floor: keep readability mostly in the mid-core, not the absolute center.
            float centerSuppression = 1.0 - smoothstep(0.84, 0.985, coreMask);
            float presence = pow(coreMask, 1.16) * (0.06 + 0.10 * uInfiniteDepth) * centerSuppression;
            vec3 presenceTint = mix(vec3(0.036, 0.032, 0.056), coreTint * 0.58, 0.34);
            voidColor += presenceTint * presence * 1.02 * visualIntensity;

            // Mid-core readability lift: still noir, but visible on dark displays.
            float coreDisc = pow(coreMask, 4.8);
            vec3 coreDiscTint = mix(uEdgeColor, vec3(0.080, 0.072, 0.118), 0.58);
            voidColor += coreDiscTint * coreDisc * (0.040 + 0.092 * uInfiniteDepth) * visualIntensity;

            // Keep darkness authored by the layer terms themselves; a global crush
            // was wiping out mid-core detail and making the opening read as a blob.

            // Noir safety: preserve a faint silhouette so the orb never disappears fully.
            float silhouetteFloor = rim * edgeGuard * (0.38 + 0.38 * clamp(uEventHorizonGlow, 0.0, 1.0)) * (0.82 + 0.22 * erosionMask);
            vec3 silhouetteTint = mix(uEdgeColor, vec3(0.112, 0.098, 0.158), 0.54);
            vec3 silhouetteColor = silhouetteTint * silhouetteFloor;
            voidColor = max(voidColor, silhouetteColor);

            // Keep the sphere noir-black, but retain enough headroom for dark-light readability.
            voidColor = clamp(voidColor, vec3(0.0), vec3(0.90));

            // Film grain: break digital banding (subtle)
            float grain = fract(sin(dot(vScreenUV * 210.0 + vec2(uTime * 0.37, uTime * 0.53), vec2(12.9898, 78.233))) * 43758.5453);
            grain = (grain * 0.5) * uGrainStrength;
            voidColor += vec3(grain);
            voidColor = clamp(voidColor, vec3(0.0), vec3(0.90));

            gl_FragColor = vec4(voidColor, 1.0);
          }
        `,
      transparent: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.y = params.positionY || 2.0;
      this.group.add(this.mesh);
      this.material = material;

      // Animation state - Double EMA for smoother transitions
      this._ema = { bass: 0, mid: 0, treble: 0 };
      this._ema2 = { bass: 0, mid: 0, treble: 0 }; // Second EMA stage for ultra-smooth
      this._alpha = 0.15; // Smoothing factor
    this._scaleAlpha = 0.02; // Much slower smoothing for scale (was 0.08)
    this._time = 0;
    this._phase = 0; // Current phase (0-1)
    this._activePhaseName = 'VOID';

    // Breathing animation (similar to egg but inverted)
    this.breathing = {
      enabled: params.breathingEnabled !== false,
      rate: params.breathingRate || 0.06, // Slower than egg
      amplitude: params.breathingAmplitude || 0.15,
      phase: 0,
    };

    // TRACK5-VOID: Phase presets for smooth transitions
    this.phasePresets = {
      VOID: { uIntensity: 1.16, uLensStrength: 0.18, uErosion: 0.01, bassContractionScale: 0.03, emaAlpha: 0.12 },
      AWAKENING: { uIntensity: 1.14, uLensStrength: 0.28, uErosion: 0.05, bassContractionScale: 0.06, emaAlpha: 0.18 },
      WANTING: { uIntensity: 1.10, uLensStrength: 0.48, uErosion: 0.18, bassContractionScale: 0.12, emaAlpha: 0.28 },
      RELEASE: { uIntensity: 1.05, uLensStrength: 0.26, uErosion: 0.10, bassContractionScale: 0.05, emaAlpha: 0.14 },
      ERASURE: { uIntensity: 0.82, uLensStrength: 0.14, uErosion: 0.48, bassContractionScale: 0.0, emaAlpha: 0.07 }
    };
    this.phaseTransition = { active: false, startTime: 0, duration: 2000, toPreset: null, startValues: {} };
    this.currentPhaseParams = {
      uIntensity: 1.16, uLensStrength: 0.18, uErosion: 0.01, bassContractionScale: 0.03
    };

    if (window.SONOITE_DEBUG) {
      console.log('[VoidSphere] Mounted with phase system - subtractive blending, inverse fresnel, bass contraction');
    }
  }

  /**
   * Public API expected by Track5VoidDirector
   * Simple tween-less setters to avoid director errors; extend with tweening if needed.
   */
  setScale(scale = 1.0, duration = 0, easing = 'linear') {
    // Simple immediate or LERP over duration; keep lightweight
    if (!this.mesh) return;
    if (duration <= 0) {
      this.mesh.scale.setScalar(scale);
      this._currentScale = scale;
      return;
    }
    this._scaleTweenToken = (this._scaleTweenToken || 0) + 1;
    const token = this._scaleTweenToken;
    // Basic linear tween over duration using requestAnimationFrame
    const start = this.mesh.scale.x;
    const delta = scale - start;
    const startTime = performance.now();
    const run = () => {
      if (token !== this._scaleTweenToken) return;
      const t = (performance.now() - startTime) / (duration * 1000);
      if (t >= 1) {
        this.mesh.scale.setScalar(scale);
        this._currentScale = scale;
        return;
      }
      const v = start + delta * t;
      this.mesh.scale.setScalar(v);
      requestAnimationFrame(run);
    };
    run();
  }

  setOpacity(opacity = 1.0, duration = 0) {
    const mat = this.mesh?.material;
    if (!mat?.uniforms?.uIntensity) return;
    const safeTarget = Math.max(0, opacity);
    const shapedTarget = safeTarget <= 0.005
      ? 0
      : THREE.MathUtils.clamp(0.12 + safeTarget * 0.95, 0, 1.10);
    this._opacityTweenToken = (this._opacityTweenToken || 0) + 1;
    const token = this._opacityTweenToken;
    if (duration <= 0) {
      this._authoredIntensity = shapedTarget;
      return;
    }
    const params = this.cfg?.params || this.cfg || {};
    const start = Number.isFinite(this._authoredIntensity) ? this._authoredIntensity : (params.intensity || 1.0);
    const delta = shapedTarget - start;
    const startTime = performance.now();
    const run = () => {
      if (token !== this._opacityTweenToken) return;
      const t = (performance.now() - startTime) / (duration * 1000);
      if (t >= 1) {
        this._authoredIntensity = shapedTarget;
        return;
      }
      this._authoredIntensity = start + delta * t;
      requestAnimationFrame(run);
    };
    run();
  }

  setPulseIntensity(intensity = 1.0, duration = 0.5) {
    // Map to base uIntensity bump (reuse pulse logic)
    this.pulse(intensity, duration);
  }

  setPulseFromAudio(intensity = 1.0) {
    // Lightweight mapping: nudge intensity based on audio without scheduling tween
    const mat = this.mesh?.material;
    if (!mat?.uniforms?.uIntensity) return;
    // Keep authored lane stable; use a temporary boost over the authored baseline.
    const params = this.cfg?.params || this.cfg || {};
    const base = Number.isFinite(this._authoredIntensity) ? this._authoredIntensity : (params.intensity || 1.0);
    mat.uniforms.uIntensity.value = Math.max(0.04, base * (0.88 + 0.06 * intensity));
  }

  setConfig(cfg) {
    super.setConfig(cfg);
    const params = cfg?.params || cfg || {};
    if (params.radius !== undefined) this.baseRadius = params.radius;
    if (params.bassContraction !== undefined) this.bassContractionScale = params.bassContraction;
    if (params.phaseBoost !== undefined) this.phaseBoostScale = params.phaseBoost;
    if (params.intensity !== undefined) this._authoredIntensity = Math.max(0, params.intensity);
    if (this.breathing && params.breathingEnabled !== undefined) this.breathing.enabled = params.breathingEnabled;
    if (this.breathing && params.breathingRate !== undefined) this.breathing.rate = params.breathingRate;
    if (this.breathing && params.breathingAmplitude !== undefined) this.breathing.amplitude = params.breathingAmplitude;
    // Phase control
    if (params.phase !== undefined) this.setPhase(params.phase);
    // EDGE-COLOR-FIX: Apply edgeColor from config (check both cfg.X and cfg.params.X)
    const edgeColorVal = params.edgeColor;
    if (edgeColorVal !== undefined && this.mesh?.material?.uniforms?.uEdgeColor) {
      const THREE = this.ctx?.THREE || window.THREE;
      this.mesh.material.uniforms.uEdgeColor.value = new THREE.Color(edgeColorVal);
    }
    // Also allow darkColor from config
    const darkColorVal = params.darkColor;
    if (darkColorVal !== undefined && this.mesh?.material?.uniforms?.uDarkColor) {
      const THREE = this.ctx?.THREE || window.THREE;
      this.mesh.material.uniforms.uDarkColor.value = new THREE.Color(darkColorVal);
    }
  }

  /**
   * Set journey phase - TRACK5-VOID enhanced
   * Accepts either numeric (0-1) or string phase names
   * @param {Number|String} phase - 0-1 numeric or 'VOID'|'AWAKENING'|'WANTING'|'RELEASE'|'ERASURE'
   */
  setPhase(phase) {
    // Handle string phase names (TRACK5-VOID)
    if (typeof phase === 'string' && this.phasePresets?.[phase]) {
      const preset = this.phasePresets[phase];
      console.log(`[VoidSphere] Phase → ${phase}`);
      this._activePhaseName = phase;

      // Start smooth transition
      this.phaseTransition = {
        active: true,
        startTime: performance.now(),
        duration: 2000,
        toPreset: preset,
        startValues: { ...this.currentPhaseParams }
      };
      return;
    }

    // Original numeric phase handling (0-1)
    this._phase = Math.max(0, Math.min(1, phase));
    if (this.mesh?.material?.uniforms?.uPhase) {
      this.mesh.material.uniforms.uPhase.value = this._phase;
    }
  }

  /**
   * Set surface erosion amount (0-1)
   * 0 = solid sphere
   * 1 = heavily eroded, barely holding together
   */
  setErosion(amount) {
    if (this.mesh?.material?.uniforms?.uErosion) {
      this.mesh.material.uniforms.uErosion.value = THREE.MathUtils.clamp(amount, 0, 1);
    }
  }

  /**
   * Set gravitational lensing strength (0-1)
   * Higher = more space warping toward center
   */
  setLensStrength(strength) {
    if (this.mesh?.material?.uniforms?.uLensStrength) {
      this.mesh.material.uniforms.uLensStrength.value = THREE.MathUtils.clamp(
        strength,
        VOID_UNIFORM_GUARDS.uLensStrength.min,
        VOID_UNIFORM_GUARDS.uLensStrength.max
      );
    }
  }

  /**
   * Set vortex spiral speed
   * Higher = faster spiraling interior
   */
  setVortexSpeed(speed) {
    if (this.mesh?.material?.uniforms?.uVortexSpeed) {
      this.mesh.material.uniforms.uVortexSpeed.value = THREE.MathUtils.clamp(
        speed,
        VOID_UNIFORM_GUARDS.uVortexSpeed.min,
        VOID_UNIFORM_GUARDS.uVortexSpeed.max
      );
    }
  }

  /**
   * Set event horizon glow intensity (0-2)
   * The dramatic rim glow at the edge
   */
  setEventHorizonGlow(intensity) {
    if (this.mesh?.material?.uniforms?.uEventHorizonGlow) {
      this.mesh.material.uniforms.uEventHorizonGlow.value = THREE.MathUtils.clamp(
        intensity,
        VOID_UNIFORM_GUARDS.uEventHorizonGlow.min,
        VOID_UNIFORM_GUARDS.uEventHorizonGlow.max
      );
    }
  }

  /**
   * Set infinite depth illusion strength (0-1)
   * Controls visibility of layered depth rings
   */
  setInfiniteDepth(strength) {
    if (this.mesh?.material?.uniforms?.uInfiniteDepth) {
      this.mesh.material.uniforms.uInfiniteDepth.value = THREE.MathUtils.clamp(
        strength,
        VOID_UNIFORM_GUARDS.uInfiniteDepth.min,
        VOID_UNIFORM_GUARDS.uInfiniteDepth.max
      );
    }
  }

  /**
   * Set vertex displacement amount (0-1)
   * Breaks the perfect sphere shape with organic noise
   */
  setVertexDisplacement(amount) {
    if (this.mesh?.material?.uniforms?.uVertexDisplacement) {
      this.mesh.material.uniforms.uVertexDisplacement.value = THREE.MathUtils.clamp(
        amount,
        VOID_UNIFORM_GUARDS.uVertexDisplacement.min,
        VOID_UNIFORM_GUARDS.uVertexDisplacement.max
      );
    }
  }

  _applyUniformGuardrails(uniforms) {
    if (!uniforms) return;
    const clampUniform = (name) => {
      const uniform = uniforms[name];
      const range = VOID_UNIFORM_GUARDS[name];
      if (!uniform || !range || !Number.isFinite(uniform.value)) return;
      uniform.value = THREE.MathUtils.clamp(uniform.value, range.min, range.max);
    };

    clampUniform('uIntensity');
    clampUniform('uLensStrength');
    clampUniform('uVortexSpeed');
    clampUniform('uEventHorizonGlow');
    clampUniform('uInfiniteDepth');
    clampUniform('uVertexDisplacement');
  }

  /**
   * Pulse effect - brief intensity spike
   * @param {Number} intensity - Pulse strength (0-1)
   * @param {Number} duration - Pulse duration in seconds
   */
  pulse(intensity = 1.0, duration = 0.5) {
    if (!this._pulse) {
      this._pulse = {
        active: false,
        time: 0,
        duration: 0,
        baseIntensity: 0.85,
        targetIntensity: 1.0
      };
    }

    this._pulse.active = true;
    this._pulse.time = 0;
    this._pulse.duration = duration;
    this._pulse.baseIntensity = this.mesh?.material?.uniforms?.uIntensity?.value || 0.85;
    this._pulse.targetIntensity = this._pulse.baseIntensity + (0.25 * intensity);

    if (window.SONOITE_DEBUG) {
      console.log(`[VoidSphere] Pulse: intensity=${intensity.toFixed(2)}, duration=${duration.toFixed(2)}s`);
    }
  }

  // EMA smoothing
  _s(k, v, a = this._alpha) {
    this._ema[k] = this._ema[k] * (1 - a) + v * a;
    return this._ema[k];
  }

  // Device LOD detection
  getDeviceLOD() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth > 768;

    if (isMobile && !isTablet) return 1; // Mobile
    if (isTablet) return 2; // Tablet
    return 3; // Desktop
  }

  update(audio, dt) {
    // MP-LAYER-GUARDS: Early return if not active or mounted
    if (!this.isActive?.() || !this.isMounted?.()) return;

    // TRACK5-VOID: Phase transition interpolation
    if (this.phaseTransition?.active) {
      const elapsed = performance.now() - this.phaseTransition.startTime;
      const progress = Math.min(elapsed / this.phaseTransition.duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2; // easeInOutQuad

      const from = this.phaseTransition.startValues;
      const to = this.phaseTransition.toPreset;

      // Interpolate phase parameters
      this.currentPhaseParams.uIntensity = from.uIntensity + (to.uIntensity - from.uIntensity) * eased;
      this.currentPhaseParams.uLensStrength = from.uLensStrength + (to.uLensStrength - from.uLensStrength) * eased;
      this.currentPhaseParams.uErosion = from.uErosion + (to.uErosion - from.uErosion) * eased;
      this.currentPhaseParams.bassContractionScale = from.bassContractionScale + (to.bassContractionScale - from.bassContractionScale) * eased;

      // Apply to uniforms
      const mat = this.mesh?.material;
      if (mat?.uniforms) {
        if (mat.uniforms.uLensStrength) mat.uniforms.uLensStrength.value = this.currentPhaseParams.uLensStrength;
        if (mat.uniforms.uErosion) mat.uniforms.uErosion.value = this.currentPhaseParams.uErosion;
      }
      this.bassContractionScale = this.currentPhaseParams.bassContractionScale;

      // Update EMA alpha from phase
      if (to.emaAlpha) this._alpha = to.emaAlpha;

      if (progress >= 1) {
        this.phaseTransition.active = false;
      }
    }

    // Smooth audio values
    const b = this._s('bass', Math.min(1, audio?.bass ?? 0));
    const m = this._s('mid', Math.min(1, audio?.mid ?? 0));
    const t = this._s('treble', Math.min(1, audio?.treble ?? 0));

    this._time += dt;

    const mat = this.mesh?.material;
    if (!mat?.uniforms) return;

    // Update shader uniforms
    mat.uniforms.uTime.value = this._time;
    mat.uniforms.uBass.value = b;
    mat.uniforms.uMid.value = m;
    mat.uniforms.uTreble.value = t;

    // Combine phase modulation with authored visibility so timeline `opacity`
    // changes survive phase transitions.
    const authored = Number.isFinite(this._authoredIntensity) ? this._authoredIntensity : 1.0;
    const phaseIntensity = Number.isFinite(this.currentPhaseParams?.uIntensity)
      ? this.currentPhaseParams.uIntensity
      : 1.0;
    const combinedIntensity = THREE.MathUtils.clamp(authored * phaseIntensity, 0, VOID_INTENSITY_CAP);
    mat.uniforms.uIntensity.value = combinedIntensity;

    // BASS CONTRACTION - opposite of egg expansion
    // High bass = sphere SHRINKS, creating tighter darkness
    // TRACK5-FIX: Only apply bass contraction if no external base scale is set
    // Director sets _externalBaseScale for phase-based growth
    if (!this._externalBaseScale) {
      const contractionAmount = b * this.bassContractionScale;
      const targetScale = 1.0 - contractionAmount; // 1.0 at rest, shrinks to ~0.92 on heavy bass (subtler)

      // Double EMA for ultra-smooth scale transition (prevents jarring jumps)
      if (!this._currentScale) this._currentScale = 1.0;
      if (!this._scaleEMA1) this._scaleEMA1 = 1.0;

      // First EMA stage
      this._scaleEMA1 += (targetScale - this._scaleEMA1) * this._scaleAlpha;
      // Second EMA stage (smooths the first)
      this._currentScale += (this._scaleEMA1 - this._currentScale) * this._scaleAlpha;

      this.mesh.scale.setScalar(this._currentScale);
    }
    // If _externalBaseScale is set, director handles scaling in _updateVoidSphere()

    const phaseName = this._activePhaseName;
    const params = this.cfg?.params || this.cfg || {};
    const baseY = params.positionY || 2.0;

    // Replace monotonic sinusoidal bob in WANTING with unstable pressure offsets.
    if (this.breathing.enabled) {
      this.breathing.phase += dt * this.breathing.rate * Math.PI * 2;
    }

    if (phaseName === 'WANTING') {
      const pressure = Math.max(0, b - 0.2);
      const turmoilAmp = 0.008 + pressure * 0.03 + m * 0.01;
      const jitterX = (
        Math.sin(this._time * 1.73 + Math.sin(this._time * 0.41) * 2.4) * 0.68 +
        Math.cos(this._time * 3.91 + t * 6.2) * 0.32
      ) * turmoilAmp;
      const jitterY = (
        Math.sin(this._time * 2.47 + Math.sin(this._time * 0.37) * 2.8) * 0.62 +
        Math.cos(this._time * 5.11 + b * 4.9) * 0.38
      ) * turmoilAmp * 0.78;
      const jitterZ = (
        Math.cos(this._time * 1.97 + Math.sin(this._time * 0.23) * 1.7) * 0.64 +
        Math.sin(this._time * 3.49 + m * 5.4) * 0.36
      ) * turmoilAmp;
      this.mesh.position.set(jitterX, baseY + jitterY, jitterZ);
    } else if (this.breathing.enabled) {
      const breathCycle = Math.sin(this.breathing.phase);
      const bobY = breathCycle * this.breathing.amplitude * 0.62;
      const bobX = Math.sin(this.breathing.phase * 0.41) * (this.breathing.amplitude * 0.07);
      const bobZ = Math.cos(this.breathing.phase * 0.47) * (this.breathing.amplitude * 0.07);
      this.mesh.position.set(bobX, baseY + bobY, bobZ);
    }

    // Avoid constant spin; use authored drift with phase-sensitive instability.
    if (phaseName === 'WANTING') {
      const riftX = Math.sin(this._time * 0.84 + Math.sin(this._time * 0.29) * 1.7);
      const riftY = Math.cos(this._time * 0.76 + Math.cos(this._time * 0.33) * 1.5);
      const riftZ = Math.sin(this._time * 0.92 + Math.sin(this._time * 0.21) * 2.0);
      this.mesh.rotation.x = riftX * 0.028 + riftZ * 0.01;
      this.mesh.rotation.y = riftY * 0.022;
      this.mesh.rotation.z = riftZ * 0.018 + riftX * 0.006;
    } else {
      this.mesh.rotation.x = Math.sin(this._time * 0.22) * 0.022;
      this.mesh.rotation.y = Math.sin(this._time * 0.18) * 0.036;
      this.mesh.rotation.z = Math.cos(this._time * 0.20) * 0.014;
    }

    // Update pulse effect
    if (this._pulse?.active) {
      this._pulse.time += dt;
      const t = Math.min(this._pulse.time / this._pulse.duration, 1.0);
      const fade = 1.0 - t;

      const currentIntensity = this._pulse.baseIntensity +
        (this._pulse.targetIntensity - this._pulse.baseIntensity) * fade;
      mat.uniforms.uIntensity.value = currentIntensity;

      if (t >= 1.0) {
        this._pulse.active = false;
        mat.uniforms.uIntensity.value = combinedIntensity;
      }
    }

    this._applyUniformGuardrails(mat.uniforms);
  }

  unmount() {
    // Dispose geometry and material
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }
    super.unmount();
  }
}
