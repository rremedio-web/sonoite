import * as THREE from 'three';

/**
 * VolumetricFogMaterial
 * - Layered FBM noise, height falloff, simple anisotropy toward a light dir
 * - Temporal stability (slow scroll + EMA happens in the flow)
 * - Blue-noise-ish dithering to reduce banding
 * - Edge feathering and radial falloff for natural appearance
 */
export function createVolumetricFogMaterial({
  color   = '#6b7280',
  opacity = 0.45,  // Lowered for better additive blending
  darkMode = false // PHASE-0.4-FIX: NormalBlending for Nocturne scenes (fog occludes, not glows)
} = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // PHASE-0.4-FIX: darkMode uses NormalBlending so fog HIDES things (mystery)
    // Default AdditiveBlending makes fog GLOW (wash out to white)
    blending: darkMode ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime:          { value: 0 },
      uColor:         { value: new THREE.Color(color) },
      uOpacity:       { value: opacity },
      uDensity:       { value: 0.45 },
      uTurbAmp:       { value: 0.20 },
      uScrollY:       { value: 0.12 },
      uGrain:         { value: 0.03 },
      uAniso:         { value: 0.45 },
      uHeightFalloff: { value: 0.25 },
      uWind:          { value: new THREE.Vector2(0.025, 0.0) },
      uResolution:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      varying vec3 vPos;
      varying float vDepth;
      varying vec2 vUv;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime, uOpacity, uDensity, uTurbAmp, uScrollY, uGrain, uAniso, uHeightFalloff;
      uniform vec2  uWind;
      uniform vec3  uColor;
      uniform vec2  uResolution;
      varying vec3  vPos;
      varying float vDepth;
      varying vec2  vUv;

      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float noise(vec3 p){
        vec3 i = floor(p), f = fract(p);
        float n = mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
        return n;
      }
      float fbm(vec3 p){
        float a = 0.5;
        float s = 0.0;
        for (int i=0; i<4; i++){
          s += a * noise(p);
          p *= 2.07;
          a *= 0.5;
        }
        return s;
      }

      void main(){
        vec3 p = vPos * 0.12;
        p.xy += uWind * uTime;
        p.y  += uTime * uScrollY;

        float base = fbm(p*0.7 + vec3(0.0, uTime*0.07, 0.0));
        float turb = fbm(p*1.7 + vec3(0.0, uTime*0.20, 0.0)) * uTurbAmp;
        float density = (base + turb) * uDensity;

        density *= exp(-uHeightFalloff * max(vPos.y, 0.0));

        vec3 L = normalize(vec3(0.2, 0.6, -0.3));
        density *= mix(0.85, 1.10, pow(max(dot(normalize(vPos), L), 0.0), uAniso));

        density *= smoothstep(0.0, 12.0, vDepth) * smoothstep(40.0, 20.0, vDepth);

        // Edge feathering: UV-based falloff to hide plane edges
        float edgeFade = smoothstep(0.0, 0.3, min(
          min(vUv.x, 1.0 - vUv.x),
          min(vUv.y, 1.0 - vUv.y)
        ));
        density *= edgeFade;

        // Radial density falloff from screen center for more natural focus
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        float radial = 1.0 - smoothstep(0.0, 1.0, length(screenUv - 0.5) * 1.2);
        density *= radial * 0.8 + 0.2;  // Bias towards center, min 20% density

        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.003;

        vec3 col = mix(uColor, vec3(1.0), uGrain * 0.5);
        float a = clamp(density * uOpacity + dither, 0.0, 0.8);  // Clamp alpha lower for better blending
        if (a <= 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`
  });
}