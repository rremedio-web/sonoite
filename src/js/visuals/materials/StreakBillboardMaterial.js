/**
 * Streak Billboard Material for Rain Effects
 * Camera-facing point sprites with elongated streak appearance
 * @module StreakBillboardMaterial
 */

import * as THREE from 'three';

export function createStreakBillboardMaterial({
  color   = '#aeb8c7',
  opacity = 0.22,
  instanced = false  // MP-STR-01: Toggle for instanced rendering
} = {}) {
  // MP-STR-01: Different shaders for instanced vs point sprites
  const vertexShader = instanced ? `
    // MP-STR-01/02: Instanced billboard streak shader
    uniform float uTime;
    attribute float aSpeed;
    attribute float aSize;
    attribute float aSeed;
    attribute vec3 aOffset;  // Per-instance position offset

    varying float vSeed;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vSeed = aSeed;

      // MP-STR-02: Calculate animated position (vertical rain fall)
      vec3 offset = aOffset;
      offset.y -= (uTime * aSpeed);
      if (offset.y < -15.0) offset.y += 30.0;  // recycle particles

      // MP-STR-02: View-aligned billboarding (camera-facing quads)
      // Get billboard basis vectors from view matrix
      vec3 viewRight = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
      vec3 viewUp = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);

      // Scale by instance size
      float scale = aSize * 0.3;
      vec3 billboardPos = offset
        + viewRight * position.x * scale
        + viewUp * position.y * scale;

      vec4 mvPosition = modelViewMatrix * vec4(billboardPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  ` : `
    // Legacy point sprite shader
    uniform float uTime;
    attribute float aSpeed;
    attribute float aSize;
    attribute float aSeed;

    varying float vSeed;

    void main() {
      vec3 pos = position;

      // vertical rain: y decreases, wrap around
      pos.y -= (uTime * aSpeed);
      if (pos.y < -15.0) pos.y += 30.0;

      vSeed = aSeed;

      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mv;
      float dist = -mv.z * 0.75;
      gl_PointSize = max(1.0, aSize * dist);
    }
  `;

  const fragmentShader = instanced ? `
    // MP-STR-01: Instanced streak fragment shader
    uniform vec3  uColor;
    uniform float uOpacity;
    uniform float uTwinkle;
    uniform float uStretch;
    uniform float uSoft;
    varying float vSeed;
    varying vec2 vUv;

    void main() {
      // UV coordinates for billboard quad
      vec2 uv = vUv * 2.0 - 1.0;
      uv.y *= uStretch;  // Elongate vertically

      float r = dot(uv, uv);
      float alpha = exp(-r * (3.0/uSoft));

      // Twinkle variation
      float tw = uTwinkle * fract(sin(vSeed*43758.5453) * 12.345);

      vec3 col = uColor * (0.9 + tw);
      gl_FragColor = vec4(col, alpha * uOpacity);

      // MP-STR-01: Optional alphaTest for overdraw control
      if (gl_FragColor.a <= 0.01) discard;
    }
  ` : `
    // Legacy point sprite fragment shader
    uniform vec3  uColor;
    uniform float uOpacity;
    uniform float uTwinkle;
    uniform float uStretch;
    uniform float uSoft;
    varying float vSeed;

    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      uv.y *= uStretch;

      float r = dot(uv, uv);
      float alpha = exp(-r * (3.0/uSoft));

      float tw = uTwinkle * fract(sin(vSeed*43758.5453) * 12.345);

      vec3 col = uColor * (0.9 + tw);
      gl_FragColor = vec4(col, alpha * uOpacity);
      if (gl_FragColor.a <= 0.01) discard;
    }
  `;

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,  // MP-STR-01: Keep depthWrite false
    blending: THREE.AdditiveBlending,  // MP-STR-01: Additive blending
    uniforms: {
      uTime:    { value: 0 },
      uColor:   { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTwinkle: { value: 0.06 },
      uStretch: { value: 1.7 },
      uSoft:    { value: 0.9 },
    },
    vertexShader,
    fragmentShader
  });
}