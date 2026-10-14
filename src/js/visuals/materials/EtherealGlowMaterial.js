/**
 * Ethereal Glow Material with Subsurface Scattering
 * Uses wrap lighting and LUT-based color temperature
 * @module EtherealGlowMaterial
 */

import * as THREE from 'three';
import { kelvinToRGB } from '../color/kelvinToRGB.js';

export function createEtherealGlowMaterial({
  opacity = 0.9,
  accent = '#d7d7e0',
  baseKelvin = 4000,
  transmission = 0.0,  // MAT-EGG-01: Foggy crystal transmission
  thickness = 0.0,     // MAT-EGG-01: Foggy crystal thickness
  ior = 1.4            // CIN-ORB: Index of refraction for fresnel shaping
} = {}) {
  // MP-MATS-Polish-03: Safety clamps
  transmission = Math.min(transmission, 0.9);
  thickness = Math.min(thickness, 0.6);
  ior = Math.max(1.3, Math.min(ior, 1.5));
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    precision mediump float;
    
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uGlow;
    uniform float uShimmer;
    uniform float uTime;
    uniform vec3 uKelvinColor;
    uniform float uEccentricity;
    uniform float uIor; // CIN-ORB: IOR to shape fresnel
    uniform float uFresnel; // MP-TJ-Fresnel-02: Audio-reactive fresnel rim

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    // Blue noise dither pattern for shimmer
    float dither(vec2 position, float brightness) {
      int x = int(position.x);
      int y = int(position.y);
      int index = (x + y * 4) % 16;
      float limit = 0.0;
      
      if (index == 0) limit = 0.0625;
      else if (index == 1) limit = 0.5625;
      else if (index == 2) limit = 0.1875;
      else if (index == 3) limit = 0.6875;
      else if (index == 4) limit = 0.8125;
      else if (index == 5) limit = 0.3125;
      else if (index == 6) limit = 0.9375;
      else if (index == 7) limit = 0.4375;
      else if (index == 8) limit = 0.25;
      else if (index == 9) limit = 0.75;
      else if (index == 10) limit = 0.125;
      else if (index == 11) limit = 0.625;
      else if (index == 12) limit = 1.0;
      else if (index == 13) limit = 0.5;
      else if (index == 14) limit = 0.875;
      else if (index == 15) limit = 0.375;
      
      return brightness < limit ? 0.0 : 1.0;
    }
    
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      
      // Fake subsurface scattering with wrap lighting
      float wrap = 0.5; // Wrap factor for SSS look
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5)); // Fake light direction
      float NdotL = dot(normal, lightDir);
      float wrappedNdotL = (NdotL + wrap) / (1.0 + wrap);
      wrappedNdotL = max(0.0, wrappedNdotL);
      
      // Dual normal trick - blend with slightly perturbed normal for thickness variation
      vec3 normal2 = normalize(normal + vec3(
        sin(vWorldPosition.x * 10.0 + uTime) * 0.05,
        cos(vWorldPosition.y * 10.0 + uTime * 0.7) * 0.05,
        sin(vWorldPosition.z * 10.0 + uTime * 1.3) * 0.05
      ));
      float NdotL2 = dot(normal2, lightDir);
      float wrappedNdotL2 = (NdotL2 + wrap) / (1.0 + wrap);
      wrappedNdotL2 = max(0.0, wrappedNdotL2);
      
      // Mix dual normals for thickness effect
      float subsurface = mix(wrappedNdotL, wrappedNdotL2, 0.3);
      
      // Fresnel for edge glow with IOR-shaped exponent
      float ndv = abs(dot(viewDir, normal));
      float fresnelBase = 1.0 - ndv;
      // Map IOR (1.0-1.5) to exponent ~2.0-3.0 for stronger rim at higher IOR
      float iorNorm = clamp((uIor - 1.0) / 0.5, 0.0, 1.0);
      float fresnelExp = mix(2.0, 3.0, iorNorm);
      float fresnel = pow(fresnelBase, fresnelExp);
      
      // Eccentricity adjustment (stretches the fresnel)
      fresnel = mix(fresnel, pow(fresnel, 0.5), uEccentricity);
      
      // Shimmer effect with treble-driven frequency
      float shimmerFreq = 10.0 + uShimmer * 20.0;
      float shimmer = sin(vWorldPosition.y * shimmerFreq + uTime * 2.0) * 0.5 + 0.5;
      
      // Apply blue noise dither to shimmer for no banding
      shimmer = dither(gl_FragCoord.xy, shimmer);
      shimmer *= uShimmer * 0.3;
      
      // Combine SSS and fresnel
      float glowIntensity = subsurface * 0.7 + fresnel * uGlow;
      glowIntensity = min(glowIntensity + shimmer, 1.5);

      // MP-TJ-Fresnel-02: Add audio-reactive fresnel rim term
      // pow(1.0 - dot(N, V), 3.0) for edge emphasis
      float rimTerm = pow(1.0 - ndv, 3.0) * uFresnel;
      rimTerm = clamp(rimTerm, 0.0, 0.25); // Cap at 0.25 to prevent over-glow

      // Apply Kelvin-based color temperature
      vec3 baseColor = uColor * 0.7 + uKelvinColor * 0.3;

      // Inner glow tint + fresnel rim
      vec3 innerGlow = vec3(0.1, 0.1, 0.15) * fresnel * uGlow;
      vec3 fresnelRim = vec3(0.2, 0.2, 0.25) * rimTerm; // Subtle blue-tinted rim
      vec3 finalColor = baseColor + innerGlow + fresnelRim;
      
      // Premultiplied alpha
      float alpha = uOpacity * glowIntensity;
      finalColor *= alpha;

      // MP-MATS-Polish-03: Clamp final color to prevent artifacts
      finalColor = clamp(finalColor, vec3(0.0), vec3(1.0));
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uGlow: { value: 0.5 },
      uShimmer: { value: 0.2 },
      uColor: { value: new THREE.Color(accent) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uKelvinColor: { value: new THREE.Color() },
      uEccentricity: { value: 0.0 },
      uIor: { value: ior },
      // MAT-EGG-01: Foggy crystal uniforms
      uTransmission: { value: transmission },
      uThickness: { value: thickness },
      // MP-TJ-Fresnel-02: Audio-reactive fresnel rim
      uFresnel: { value: 0.0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    // MP-MATS-Polish-03: Use premultiplied alpha blending
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // Store base values
  material.userData.baseKelvin = baseKelvin;
  material.userData.currentKelvin = baseKelvin;

  // MP-TJ-Fresnel-02: EMA state for fresnel rim
  material.userData.fresnelEMA = 0.0;

  // Add update method for animation
  material.userData.update = function(audio, dt) {
    material.uniforms.uTime.value += dt;

    if (audio) {
      // MP-MATS-Polish-03: NaN guards for audio data
      const bass = Number.isFinite(audio.bass) ? audio.bass : 0;
      const mid = Number.isFinite(audio.mid) ? audio.mid : 0;
      const treble = Number.isFinite(audio.treble) ? audio.treble : 0;
      const loudness = Number.isFinite(audio.loudness) ? audio.loudness : 0;

      // Bass controls color temperature
      const targetKelvin = THREE.MathUtils.lerp(4000, 2600, bass * 0.7);

      // Smooth transition
      const currentK = material.userData.currentKelvin;
      material.userData.currentKelvin = currentK + (targetKelvin - currentK) * 0.1;

      // Apply Kelvin color
      const kelvinRGB = kelvinToRGB(material.userData.currentKelvin);
      material.uniforms.uKelvinColor.value.setRGB(kelvinRGB.r, kelvinRGB.g, kelvinRGB.b);

      // PHASE-2-FIX: Dynamic glow ceiling based on climax mode
      // Allow up to 1.0 during climax (was capped at 0.3)
      const climaxActive = material.userData.climaxMode || false;
      const maxGlow = climaxActive ? 1.0 : 0.5;
      const targetGlow = Math.min(maxGlow, 0.35 + 0.25 * (0.6 * mid + 0.4 * loudness));
      const currentGlow = material.uniforms.uGlow.value;
      material.uniforms.uGlow.value = THREE.MathUtils.clamp(
        currentGlow + (targetGlow - currentGlow) * 0.08,
        0, maxGlow
      );

      // Treble controls shimmer
      material.uniforms.uShimmer.value = THREE.MathUtils.clamp(0.1 + 0.15 * treble, 0, 1);

      // Bass also affects eccentricity
      material.uniforms.uEccentricity.value = THREE.MathUtils.clamp(bass * 0.15, 0, 1);

      // MP-TJ-Fresnel-02: Audio-reactive fresnel rim (flag-controlled)
      if (window.SONOITE_FRESNEL_RIM) {
        // EMA-smoothed mid audio → fresnel rim intensity
        const targetFresnel = mid * 0.25; // Scale to max 0.25
        const alpha = 0.08; // Smoothing factor
        material.userData.fresnelEMA = material.userData.fresnelEMA * (1 - alpha) + targetFresnel * alpha;

        // Cap to ≤0.25 and apply
        material.uniforms.uFresnel.value = Math.min(0.25, material.userData.fresnelEMA);
      } else {
        // Flag OFF: Reset fresnel rim to 0
        material.uniforms.uFresnel.value = 0.0;
        material.userData.fresnelEMA = 0.0;
      }
    }
  };

  // MAT-EGG-01: Helper to adjust foggy crystal appearance
  material.setFoggy = function({ transmission, thickness }) {
    if (transmission !== undefined) {
      // MP-MATS-Polish-03: Clamp transmission ≤ 0.9
      transmission = Math.min(transmission, 0.9);
      material.uniforms.uTransmission.value = transmission;
      // Approximate fog via reduced opacity
      material.uniforms.uOpacity.value = opacity * (1.0 - transmission * 0.3);
    }
    if (thickness !== undefined) {
      // MP-MATS-Polish-03: Clamp thickness ≤ 0.6
      thickness = Math.min(thickness, 0.6);
      material.uniforms.uThickness.value = thickness;
      // Thicker materials have more subsurface glow (clamped to ≤0.3)
      material.uniforms.uGlow.value = Math.min(0.3, 0.5 + thickness * 0.3);
    }
  };

  // Apply initial foggy settings
  if (transmission > 0 || thickness > 0) {
    material.setFoggy({ transmission, thickness });
  }

  return material;
}
