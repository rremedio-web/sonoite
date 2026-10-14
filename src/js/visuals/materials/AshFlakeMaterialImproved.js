import * as THREE from 'three';

/**
 * Improved ash flake material with more realistic appearance
 * Creates irregular, paper-like ash particles
 */
export function createAshFlakeMaterial({
  color = '#999999',
  opacity = 0.6
} = {}) {
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uWobble: { value: 0 },
      uFallRate: { value: 1 },
      uGroupScale: { value: 1 },
      uMicroFlicker: { value: 0 },
      uSpawnHeight: { value: 10 },
      uMaxY: { value: 5 },
      uWind: { value: new THREE.Vector2(0.01, 0.005) }
    },
    
    vertexShader: `
      attribute vec3 aOffset;
      attribute vec2 aSize;
      attribute float aPhase;
      attribute float aFallSpeed;
      attribute float aRotationSpeed;
      attribute float aShapeSeed;
      
      varying vec2 vUv;
      varying float vShapeSeed;
      varying float vOpacity;
      varying float vDepth;
      
      uniform float uTime;
      uniform float uWobble;
      uniform float uGroupScale;
      
      void main() {
        vUv = uv;
        vShapeSeed = aShapeSeed;
        
        // Apply instance transformation
        vec3 transformed = position;
        
        // Add subtle wobble
        float wobble = sin(uTime * 1.5 + aPhase) * uWobble * 0.5;
        transformed.x += wobble;
        
        // Scale by group scale
        transformed *= uGroupScale;
        
        // Calculate depth-based opacity (fade in distance)
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
        float distanceFromCamera = length(mvPosition.xyz);
        vOpacity = smoothstep(25.0, 3.0, distanceFromCamera);
        vDepth = distanceFromCamera;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    
    fragmentShader: `
      varying vec2 vUv;
      varying float vShapeSeed;
      varying float vOpacity;
      varying float vDepth;
      
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uMicroFlicker;
      uniform float uTime;
      
      // Better noise function
      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      
      void main() {
        vec2 centered = vUv - 0.5;
        
        // Create irregular ash-like shape using polar coordinates
        float angle = atan(centered.y, centered.x);
        float radius = length(centered);
        
        // Create torn paper-like edges
        float shape = 0.35;
        shape += 0.08 * sin(3.0 * angle + vShapeSeed * 6.28);
        shape += 0.05 * sin(5.0 * angle - vShapeSeed * 3.14);
        shape += 0.03 * sin(7.0 * angle + vShapeSeed * 2.0);
        shape += 0.02 * sin(11.0 * angle);
        
        // Sharp cutoff for defined edges
        float alpha = step(radius, shape);
        
        // Add internal texture like burnt paper
        float tex1 = noise(vUv * 12.0 + vShapeSeed);
        float tex2 = noise(vUv * 25.0 - vShapeSeed * 2.0);
        float texture = tex1 * 0.7 + tex2 * 0.3;
        
        // Create darker burnt edges
        float edgeFactor = smoothstep(shape * 0.6, shape, radius);
        vec3 ashColor = mix(uColor, uColor * 0.3, edgeFactor);
        
        // Add slight color variation
        ashColor *= (0.8 + texture * 0.4);
        
        // Very subtle flicker
        float flicker = 1.0 - uMicroFlicker * 0.015 * sin(uTime * 12.0 + vShapeSeed * 10.0);
        
        // Final compositing with depth fade
        float finalAlpha = alpha * uOpacity * vOpacity * flicker * (0.6 + texture * 0.4);
        
        // Soften edges slightly
        finalAlpha *= smoothstep(0.0, 0.02, shape - radius);
        
        gl_FragColor = vec4(ashColor * finalAlpha, finalAlpha);
        
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
    
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending, // Change from additive to normal for more solid look
    side: THREE.DoubleSide
  });
  
  // Add update method for audio reactivity
  material.updateUniforms = function(audioData, time) {
    const { bass = 0, mid = 0, treble = 0, loudness = 0 } = audioData;
    
    this.uniforms.uTime.value = time;
    this.uniforms.uWobble.value = bass * 0.08; // Very subtle wobble
    this.uniforms.uFallRate.value = 1 + mid * 0.15; // Subtle speed variation
    this.uniforms.uGroupScale.value = 1 + Math.min(loudness * 0.02, 0.02); // Minimal breathing
    this.uniforms.uMicroFlicker.value = Math.min(treble * 0.03, 0.03); // Very subtle flicker
  };
  
  return material;
}