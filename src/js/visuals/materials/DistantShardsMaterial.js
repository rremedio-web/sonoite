import * as THREE from 'three';

const noise = `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                 mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                 mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

export class DistantShardsMaterial extends THREE.ShaderMaterial {
  constructor(options = {}) {
    super({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: options.opacity || 0.5 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uTransients: { value: 0 },
        uBreath: { value: 1.0 }
      },
      vertexShader: `
        attribute float aBassSens;
        attribute float aMidSens;
        attribute float aTrebleSens;
        attribute float aTransmission;
        
        uniform float uTime;
        uniform float uBreath;
        
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vTransmission;
        varying float vBassSens;
        varying float vTrebleSens;
        
        void main() {
          vec3 pos = position;

          // Keep silhouette stable and softly breathing.
          float breath = 1.0 + (uBreath - 1.0) * 0.2;
          pos *= breath;

          vTransmission = aTransmission;
          vBassSens = aBassSens;
          vTrebleSens = aTrebleSens;

          vec3 geoN = normalize(normalMatrix * normal);
          vNormal = geoN;

          vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize(cameraPosition - vWorldPos);
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uBass;
        uniform float uTreble;
        uniform float uTransients;
        
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vTransmission;
        varying float vBassSens;
        varying float vTrebleSens;
        
        ${noise}
        
        void main() {
          float cosTheta = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
          float rim = pow(1.0 - cosTheta, 2.2);
          float facing = smoothstep(0.0, 0.9, cosTheta);

          // Silhouette-first ramp: keep faces present, avoid edge-only "wireframe" read.
          vec3 baseColor = mix(vec3(0.062, 0.067, 0.086), vec3(0.104, 0.114, 0.154), facing);
          vec3 bodyFill = vec3(0.076, 0.082, 0.112) * (0.35 + 0.65 * facing);
          baseColor += bodyFill * 0.22;
          vec3 rimTint = vec3(0.148, 0.172, 0.244) * rim * (0.28 + 0.24 * vTransmission);
          baseColor += rimTint;

          // Keep audio accents subtle and moody.
          float bassAccent = uBass * vBassSens * 0.08;
          float trebleAccent = uTreble * vTrebleSens * 0.05;
          float transientAccent = uTransients * vTrebleSens * 0.04;
          baseColor += vec3(bassAccent + trebleAccent + transientAccent);

          // Tiny luminance variation so the silhouettes never read as flat vectors.
          float grain = (noise(vWorldPos * 0.22 + vec3(uTime * 0.04)) - 0.5) * 0.018;
          baseColor += vec3(grain);

          float trans = mix(0.50, 0.66, vTransmission);
          float alpha = uOpacity * trans * (0.94 - 0.14 * rim);

          float fogFactor = smoothstep(28.0, 115.0, length(vWorldPos));
          alpha *= (1.0 - fogFactor * 0.28);

          vec3 finalColor = clamp(baseColor, vec3(0.0), vec3(0.32));
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: options.side || THREE.FrontSide,
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
      dithering: true
    });
  }
}
