import * as THREE from 'three';

/**
 * Obsidian Glass Material
 * Dark, reflective material for "Paralisia do Sono" (Sleep Paralysis)
 * Aesthetic: Near-black glass with subtle reflections and shimmer
 * Palette: #0a0a0a (near black) with hints of deep grey
 */

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

// Sample-and-hold phase for glitch
float heldPhase(vec3 p, float t, float rate) {
  float id = floor(t * rate) + floor(dot(p, vec3(17.0, 29.0, 13.0)));
  return hash11(id);
}

// Spring damping for smooth return
vec3 springReturn(vec3 displaced, vec3 base, float k, float z) {
  vec3 x = displaced - base;
  return displaced - x * k / (1.0 + z);
}
`;

export class ObsidianGlassMaterial extends THREE.ShaderMaterial {
  constructor(options = {}) {
    super({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uOpacity: { value: options.opacity || 0.4 },
        uGlitchAmount: { value: 0.18 },
        uScanTime: { value: 0 },
        uGhostAmt: { value: 0 },
        uGlitchSeed: { value: options.glitchSeed || 0 },
        uColorShift: { value: options.colorShift || 0 },
        uPhaseShift: { value: 0 },
        uEnergyPulse: { value: 0 },
        uADSREnvelope: { value: new THREE.Vector4(0.01, 0.1, 0.7, 0.3) },
        // Obsidian-specific uniforms
        uDarkness: { value: options.darkness || 0.95 }, // 0.95 = very dark
        uReflectivity: { value: options.reflectivity || 0.15 }, // Subtle reflections
        uEdgeShimmer: { value: options.edgeShimmer || 0.2 } // Edge highlights
      },
      vertexShader: `
        attribute float aLineUv;

        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec3 vNormal;
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

          // Subtle glitch with spring return (less aggressive than standard cage)
          float hold = heldPhase(position, uTime, 15.0); // Slower glitch rate
          float tre = clamp(uTreble * 1.2, 0.0, 1.0);
          float phase = tri(hold + uGlitchSeed);
          float burst = smoothstep(0.65, 1.0, phase) * tre; // Higher threshold

          // Very subtle displacement for glass-like fragility
          vec3 dispDir = normalize(position);
          vec3 disp = dispDir * (uGlitchAmount * 0.25 * burst); // 25% of standard

          pos += disp;
          pos = springReturn(pos, basePos, 0.15, 0.4); // Stronger spring-back

          // Calculate view direction for Fresnel
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          vNormal = normalize(normalMatrix * normalize(pos)); // Use displaced pos as normal

          vLineUv = aLineUv;
          vGlitch = burst * uGlitchAmount * 0.5; // Tamer glitch effect

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uOpacity;
        uniform float uScanTime;
        uniform float uGhostAmt;
        uniform float uColorShift;
        uniform float uGlitchSeed;
        uniform float uDarkness;
        uniform float uReflectivity;
        uniform float uEdgeShimmer;

        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec3 vNormal;
        varying float vLineUv;
        varying float vGlitch;

        ${shaderHelpers}

        void main() {
          // Soft edge fades with anti-aliasing
          float endFade = smoothstep(0.0, 0.15, vLineUv) * smoothstep(1.0, 0.85, vLineUv);
          float w = fwidth(vLineUv) * 1.5;
          float alpha = uOpacity * smoothstep(0.0, w, endFade);

          // Fresnel effect for glass-like reflectivity
          float fresnel = pow(1.0 - abs(dot(vViewDir, vNormal)), 3.0);
          fresnel *= uReflectivity;

          // OBSIDIAN DARK PALETTE
          // Base: Near black (#0a0a0a = rgb(10, 10, 10))
          vec3 obsidianBase = vec3(0.039, 0.039, 0.039); // #0a0a0a normalized
          vec3 obsidianHighlight = vec3(0.102, 0.102, 0.118); // #1a1a1e (dark grey)
          vec3 obsidianEdge = vec3(0.133, 0.133, 0.157); // #222228 (subtle edge)

          // Start with near-black base
          vec3 color = obsidianBase;

          // Add very subtle grey highlights based on Fresnel
          color = mix(color, obsidianHighlight, fresnel * 0.5);

          // Edge shimmer (audio-reactive on treble)
          float edgeGlow = pow(fresnel, 2.0) * uEdgeShimmer;
          edgeGlow *= (0.8 + uTreble * 0.4); // React to high frequencies
          color = mix(color, obsidianEdge, edgeGlow);

          // Subtle scan line (very faint, for texture)
          float scan = 0.98 + 0.02 * sin(vWorldPos.y * 15.0 + uScanTime * 0.5);
          color *= scan;

          // Holographic shimmer (extremely subtle for dark aesthetic)
          float shimmer = 0.05 * sin(vWorldPos.x * 25.0 + vWorldPos.z * 25.0 + uTime * 1.5);
          color *= (1.0 + shimmer);

          // Blue-noise glitch breaks (very rare and subtle)
          float glitchMask = step(0.88, bnoise(gl_FragCoord.xy + uTime * 51.0 + uGlitchSeed * 100.0));
          alpha *= mix(1.0, 0.8, glitchMask * vGlitch);

          // Rare hard breaks only at extreme glitch
          if (glitchMask > 0.98 && vGlitch > 0.7) {
            discard;
          }

          // Bass reactivity: Very subtle pulsing darkness
          float bassPulse = uBass * 0.1;
          color = mix(color, obsidianBase, bassPulse);

          // Ghost layer: Dark spectral afterimage
          vec3 ghostTint = vec3(0.05, 0.05, 0.08); // Very dark blue-grey
          color += ghostTint * uGhostAmt * 0.3;
          alpha *= 0.95 + 0.05 * uGhostAmt;

          // Distance fade for depth
          float dist = length(vWorldPos - cameraPosition);
          alpha *= smoothstep(50.0, 8.0, dist);

          // Apply overall darkness factor
          color *= (1.0 - uDarkness * 0.7); // Scale darkness

          // Premultiplied alpha output
          color *= alpha;

          // MP-MATS-Polish-03: Clamp final color to prevent artifacts
          color = clamp(color, vec3(0.0), vec3(1.0));
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
      linewidth: 1
    });
  }
}
