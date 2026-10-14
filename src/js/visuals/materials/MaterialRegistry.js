/**
 * MaterialRegistry.js - Shared Shader Chunks Library
 *
 * Provides reusable GLSL code for consistent effects across materials:
 * - Noise functions (simplex, curl, FBM)
 * - Fresnel calculations
 * - Color utilities
 * - Common uniforms
 *
 * Usage:
 *   import { ShaderChunks } from './MaterialRegistry.js';
 *   const vertexShader = `${ShaderChunks.snoise3D} void main() { ... }`;
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

/**
 * Shared GLSL shader chunks
 */
export const ShaderChunks = {
  /**
   * 3D Simplex Noise (Ashima Arts)
   * Returns value in range [-1, 1]
   */
  snoise3D: `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
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

      i = mod289(i);
      vec4 p = permute(permute(permute(
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

      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
  `,

  /**
   * Fractal Brownian Motion (FBM)
   * Layered noise for organic textures
   * Requires snoise3D chunk
   */
  fbm: `
    float fbm(vec3 p, int octaves, float persistence) {
      float value = 0.0;
      float amplitude = 1.0;
      float frequency = 1.0;
      float maxValue = 0.0;

      for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
      }

      return value / maxValue;
    }
  `,

  /**
   * Curl Noise
   * Divergence-free noise for fluid-like motion
   * Requires snoise3D chunk
   */
  curlNoise: `
    vec3 curlNoise(vec3 p) {
      const float e = 0.1;
      vec3 dx = vec3(e, 0.0, 0.0);
      vec3 dy = vec3(0.0, e, 0.0);
      vec3 dz = vec3(0.0, 0.0, e);

      float n1 = snoise(p + dy) - snoise(p - dy);
      float n2 = snoise(p + dz) - snoise(p - dz);
      float n3 = snoise(p + dx) - snoise(p - dx);
      float n4 = snoise(p + dz) - snoise(p - dz);
      float n5 = snoise(p + dx) - snoise(p - dx);
      float n6 = snoise(p + dy) - snoise(p - dy);

      return normalize(vec3(n1 - n2, n3 - n4, n5 - n6));
    }
  `,

  /**
   * Fresnel Effect
   * Edge glow based on view angle
   */
  fresnel: `
    float fresnel(vec3 normal, vec3 viewDir, float power) {
      return pow(1.0 - max(dot(normal, viewDir), 0.0), power);
    }

    float fresnelSchlick(vec3 normal, vec3 viewDir, float f0) {
      float cosTheta = max(dot(normal, viewDir), 0.0);
      return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
    }
  `,

  /**
   * Gravitational Lensing
   * Warps UV coordinates toward a center point
   */
  gravitationalLens: `
    vec2 gravitationalLens(vec2 uv, vec2 center, float strength) {
      vec2 fromCenter = uv - center;
      float dist = length(fromCenter);

      // Schwarzschild-inspired radial warp
      float warp = strength / max(dist + 0.15, 0.001);
      warp = min(warp, 0.4); // Prevent extreme distortion

      vec2 dir = fromCenter / max(dist, 0.0001);
      return uv - dir * warp * 0.08;
    }
  `,

  /**
   * Heat Haze Distortion
   * Screen-space wavy distortion for heat effects
   */
  heatHaze: `
    vec2 heatHaze(vec2 uv, float time, float intensity, float scale) {
      float noise1 = sin(uv.y * scale + time * 2.0) * 0.5 + 0.5;
      float noise2 = sin(uv.x * scale * 0.7 + time * 1.5 + 1.57) * 0.5 + 0.5;

      vec2 offset = vec2(
        sin(uv.y * scale * 1.3 + time * 1.8) * noise1,
        cos(uv.x * scale * 1.1 + time * 2.2) * noise2
      );

      return uv + offset * intensity * 0.01;
    }
  `,

  /**
   * Color Utilities
   */
  colorUtils: `
    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float luminance(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }
  `,

  /**
   * Dissolve/Burn Effect
   * For succession material transitions
   */
  dissolve: `
    float dissolveEdge(float noise, float threshold, float edgeWidth) {
      float edge = smoothstep(threshold - edgeWidth, threshold, noise)
                 * (1.0 - smoothstep(threshold, threshold + edgeWidth, noise));
      return edge;
    }

    vec3 burnEdgeColor(float edge, vec3 coolColor, vec3 hotColor) {
      return mix(coolColor, hotColor, edge);
    }
  `,

  /**
   * Vortex Spiral
   * For void interior effects
   */
  vortexSpiral: `
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
  `
};

/**
 * Common uniform definitions for consistency
 */
export const CommonUniforms = {
  time: { value: 0.0 },
  resolution: { value: null }, // Set to new THREE.Vector2()

  // Audio
  uBass: { value: 0.0 },
  uMid: { value: 0.0 },
  uTreble: { value: 0.0 },
  uLoudness: { value: 0.0 },

  // Visual
  uIntensity: { value: 1.0 },
  uOpacity: { value: 1.0 }
};

/**
 * Create a copy of common uniforms with fresh objects
 */
export function createCommonUniforms() {
  return {
    uTime: { value: 0.0 },
    uBass: { value: 0.0 },
    uMid: { value: 0.0 },
    uTreble: { value: 0.0 },
    uLoudness: { value: 0.0 },
    uIntensity: { value: 1.0 },
    uOpacity: { value: 1.0 }
  };
}

/**
 * Combine multiple shader chunks
 * @param {...string} chunks - Chunk names from ShaderChunks
 * @returns {string} Combined GLSL code
 */
export function combineChunks(...chunks) {
  return chunks.map(name => ShaderChunks[name] || '').join('\n');
}

export default { ShaderChunks, CommonUniforms, createCommonUniforms, combineChunks };
