/**
 * Analytic Wireframe Material with Bloom
 * Uses barycentric coordinates for crisp, artifact-free wireframes
 * @module WireBloomMaterial
 */

import * as THREE from 'three';

export function createWireBloomMaterial({
  color = '#d7d7e0',
  opacity = 0.75,
  thickness = 1.0,
  fadeNear = 5.0,
  fadeFar = 30.0,
  emissiveColor = null  // MAT-EGG-01: Optional emissive color
} = {}) {
  const vertexShader = `
    attribute vec3 aBary;
    
    varying vec3 vBary;
    varying vec3 vPosition;
    varying float vDepth;
    
    void main() {
      vBary = aBary;
      vPosition = position;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mvPosition.z;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    #ifdef GL_OES_standard_derivatives
      #extension GL_OES_standard_derivatives : enable
    #endif
    
    precision mediump float;

    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uBloom;
    uniform float uTime;
    uniform float uThickness;
    uniform float uPulseRate;
    uniform float uOnsetKick;
    uniform float uFadeNear;
    uniform float uFadeFar;
    // WBM-01: Emissive uniforms for bass-reactive glow
    uniform vec3 uEmissiveColor;
    uniform float uEmissiveIntensity;
    
    varying vec3 vBary;
    varying vec3 vPosition;
    varying float vDepth;
    
    float edgeFactor(vec3 bary, float thickness) {
      // Find minimum barycentric coordinate
      float minBary = min(min(bary.x, bary.y), bary.z);
      
      #ifdef GL_OES_standard_derivatives
        // Use fwidth for stable thickness at any distance
        float width = fwidth(minBary) * thickness;
      #else
        // Fallback for devices without derivatives
        float width = 0.01 * thickness;
      #endif
      
      // Smooth edge with anti-aliasing
      return smoothstep(0.0, width, minBary);
    }
    
    void main() {
      // Calculate wireframe edge
      float edge = 1.0 - edgeFactor(vBary, uThickness);
      
      // Pulse animation (driven by audio mid frequencies)
      float pulse = sin(uTime * uPulseRate) * 0.5 + 0.5;
      pulse = mix(0.7, 1.0, pulse);
      
      // Bloom intensity with onset kick
      float bloom = uBloom * pulse + uOnsetKick;
      bloom = min(bloom, 1.5); // Cap to prevent washout
      
      // Depth-based fade
      float depthFade = smoothstep(uFadeFar, uFadeNear, vDepth);
      
      // Soft-additive glow calculation
      vec3 glowColor = uColor * (1.0 + bloom * 0.5);
      float glowIntensity = edge * depthFade;

      // Premultiplied alpha for proper blending
      float alpha = uOpacity * glowIntensity;
      vec3 finalColor = glowColor * alpha;

      // MAT-EGG-01: Apply emissive contribution (bass-reactive)
      // Adds a subtle self-illumination independent of edge intensity
      finalColor += uEmissiveColor * uEmissiveIntensity;
      
      // Add subtle bloom halo for thick edges
      if (edge > 0.7) {
        finalColor += uColor * bloom * 0.1;
        alpha = min(alpha * 1.2, 1.0);
      }

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uBloom: { value: 0.5 },
      uTime: { value: 0 },
      uThickness: { value: thickness },
      uPulseRate: { value: 2.0 },
      uOnsetKick: { value: 0.0 },
      uFadeNear: { value: fadeNear },
      uFadeFar: { value: fadeFar },
      // MAT-EGG-01: Emissive uniforms for bass reactivity
      uEmissiveColor: { value: new THREE.Color(emissiveColor || color) },
      uEmissiveIntensity: { value: 0.05 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  });

  // Add update method for animation
  material.userData.update = function(audio, dt) {
    material.uniforms.uTime.value += dt;
    
    if (audio) {
      // Mid frequencies control pulse rate
      const mid = audio.mid || 0;
      material.uniforms.uPulseRate.value = 1.5 + mid * 3.0;
      
      // Loudness controls bloom
      const loudness = audio.loudness || 0;
      const targetBloom = 0.3 + loudness * 0.7;
      const currentBloom = material.uniforms.uBloom.value;
      material.uniforms.uBloom.value = currentBloom + (targetBloom - currentBloom) * 0.08;
      
      // Onset detection for kick
      if (audio.onset && audio.onset > 0.03) {
        material.uniforms.uOnsetKick.value = 0.3;
      } else {
        // Decay onset kick
        material.uniforms.uOnsetKick.value *= 0.95;
      }
    }
  };

  return material;
}
