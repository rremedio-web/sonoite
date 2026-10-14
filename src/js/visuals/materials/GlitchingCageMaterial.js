import * as THREE from 'three';

const shaderHelpers = `
float hash11(float x) { 
  return fract(sin(x * 12.9898) * 43758.5453); 
}

float tri(float x) { 
  return abs(fract(x) - 0.5) * 2.0; 
}

float bnoise(vec2 p) { 
  return fract(52.9829 * fract(p.x * 0.0671 + p.y * 0.00584)); 
}

// Discrete held phase for sample-and-hold glitch
float heldPhase(vec3 p, float t, float rate) {
  float id = floor(t * rate) + floor(dot(p, vec3(17.0, 29.0, 13.0)));
  return hash11(id);
}

// Critically-damped spring return
vec3 springReturn(vec3 displaced, vec3 base, float k, float z) {
  vec3 x = displaced - base;
  return displaced - x * k / (1.0 + z);
}
`;

export class GlitchingCageMaterial extends THREE.ShaderMaterial {
  constructor(options = {}) {
    super({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uOpacity: { value: 0.6 },
        uGlitchAmount: { value: 0.18 },
        uScanTime: { value: 0 },
        uGhostAmt: { value: 0 },
        uGlitchSeed: { value: options.glitchSeed || 0 },
        uColorShift: { value: options.colorShift || 0 },
        uPhaseShift: { value: 0 },
        uEnergyPulse: { value: 0 },
        uADSREnvelope: { value: new THREE.Vector4(0.01, 0.1, 0.7, 0.3) }
      },
      vertexShader: `
        attribute float aLineUv;
        
        varying vec3 vWorldPos;
        varying float vLineUv;
        varying float vGlitch;
        
        uniform float uTime;
        uniform float uTreble;
        uniform float uGlitchAmount;
        uniform float uGlitchSeed;
        
        ${shaderHelpers}
        
        void main() {
          vec3 pos = position;
          vec3 basePos = position;
          
          // Sample-and-hold glitch with spring return
          float hold = heldPhase(position, uTime, 18.0); // ~18 steps/s
          float tre = clamp(uTreble * 1.3, 0.0, 1.0);
          float phase = tri(hold + uGlitchSeed);
          float burst = smoothstep(0.55, 1.0, phase) * tre;
          
          // Directional displacement along vertex normal
          vec3 dispDir = normalize(position);
          vec3 disp = dispDir * (uGlitchAmount * (0.35 + 0.65 * burst));
          
          // Apply displacement and spring back
          pos += disp;
          pos = springReturn(pos, basePos, 0.12, 0.35);
          
          // Pass data to fragment
          vLineUv = aLineUv;
          vGlitch = burst * uGlitchAmount;
          
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uOpacity;
        uniform float uScanTime;
        uniform float uGhostAmt;
        uniform float uColorShift;
        uniform float uGlitchSeed;
        
        varying vec3 vWorldPos;
        varying float vLineUv;
        varying float vGlitch;
        
        ${shaderHelpers}
        
        void main() {
          // Softer edge fades with anti-aliasing
          float endFade = smoothstep(0.0, 0.15, vLineUv) * smoothstep(1.0, 0.85, vLineUv);
          float w = fwidth(vLineUv) * 1.5;
          float alpha = uOpacity * smoothstep(0.0, w, endFade);
          
          // Scan line effect (tamed with derivatives)
          float scan = 0.95 + 0.05 * sin(vWorldPos.y * 10.0 + uScanTime);
          alpha *= scan;
          
          // Holographic shimmer
          float shimmer = 0.1 * sin(vWorldPos.x * 20.0 + vWorldPos.z * 20.0 + uTime * 2.0);
          alpha *= (1.0 + shimmer);
          
          // Blue-noise edge breaks (subtle dimming instead of harsh discard)
          float glitchMask = step(0.82, bnoise(gl_FragCoord.xy + uTime * 61.0 + uGlitchSeed * 100.0));
          alpha *= mix(1.0, 0.7, glitchMask * vGlitch);
          
          // Occasional hard breaks at very low rate
          if (glitchMask > 0.96 && vGlitch > 0.5) {
            discard;
          }
          
          // Base color system
          vec3 baseColor = vec3(0.5, 0.6, 0.8);
          vec3 shiftColor = vec3(0.8, 0.9, 1.0);
          vec3 color = mix(baseColor, shiftColor, uColorShift);
          
          // Rim dispersion tint for ice-like appearance
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float cosT = clamp(abs(dot(normalize(vWorldPos), viewDir)), 0.0, 1.0);
          float rim = pow(1.0 - cosT, 3.0);
          vec3 tintCool = vec3(0.85, 0.93, 1.00);
          vec3 tintWarm = vec3(1.00, 0.96, 0.90);
          vec3 disp = mix(tintWarm, tintCool, clamp(cosT * 0.7 + 0.3, 0.0, 1.0));
          color = mix(color, color * disp, 0.25 * rim);
          
          // Phase variation
          color = mix(color, vec3(0.7, 0.8, 1.0), sin(uBass * 3.14 + uColorShift * 6.28) * 0.5 + 0.5);
          
          // Ghost layer spectral afterimage
          color += vec3(0.2, 0.3, 0.5) * uGhostAmt;
          alpha *= 0.9 + 0.1 * uGhostAmt;
          
          // Distance fade for depth
          float dist = length(vWorldPos - cameraPosition);
          alpha *= smoothstep(50.0, 10.0, dist);
          
          // Premultiplied alpha output
          color *= alpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneMinusDstColorFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      linewidth: 1 // Note: linewidth > 1 only works on some platforms
    });
  }
}