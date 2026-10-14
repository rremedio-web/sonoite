import { VisualLayer } from '../layer-api.js';

/**
 * VoidVeil
 * A subtle membrane/veil used for Track 5 "reveal as restraint".
 * Monochrome, low-energy, always-perceptible micro-variation with long decays.
 */
export class VoidVeil extends VisualLayer {
  mount() {
    super.mount();

    const THREE = this.ctx?.THREE;
    if (!THREE) {
      console.error('[VoidVeil] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    this._time = 0;
    this._pulse = 0;

    const params = this.cfg?.params || this.cfg || {};

    const width = params.width || 10;
    const height = params.height || 10;
    const positionY = params.positionY ?? 2.0;
    const radius = Math.max(0.01, Math.min(width, height) * 0.5);
    const geometry = new THREE.CircleGeometry(radius, 128);

    const veilColor = new THREE.Color(params.color || this.ctx?.palette?.accent || '#161622');

    const material = new THREE.ShaderMaterial({
      transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
        uOpacity: { value: params.opacity ?? 0.18 },
          uBeat: { value: 0 },
          uColor: { value: veilColor }
        },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uBeat;
        uniform vec3 uColor;
        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vUv;
          vec2 c = uv - vec2(0.5);
          float r = length(c);

          // Circular veil: avoid square edges, keep soft ring
          float centerFade = smoothstep(0.10, 0.22, r);
          // NOTE: Keep the fade radius < 0.5 so the veil never hits the plane edges.
          // Otherwise you can see a hard "square" boundary when the circle is clipped by the quad.
          float outerFade = 1.0 - smoothstep(0.34, 0.43, r);
          float edge = centerFade * outerFade;
          float quadEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
          float edgeMask = smoothstep(0.0, 0.08, quadEdge);

          // Subtle drifting noise (monochrome)
          float n = hash(floor(uv * 64.0) + floor(mod(uTime * 0.6, 1024.0)));
          float shimmer = 0.92 + 0.08 * sin(uTime * 0.35 + n * 6.2831);

          // Beat adds gentle turbulence at the periphery
          float beat = clamp(uBeat, 0.0, 1.0);
          float beatLift = mix(1.0, 1.15, beat);

          float alpha = uOpacity * edge * edgeMask * shimmer * beatLift * 0.85;
          if (alpha < 0.001) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, positionY, 0);
    mesh.renderOrder = 10;

    this.mesh = mesh;
    this.group.add(mesh);
  }

  update(audio, dt) {
    if (!this.isActive?.() || !this.isMounted?.() || !this.mesh?.material?.uniforms) return;

    this._time += dt;

    // Long-decay pulse from beat (hypnotic, not strobing)
    const kick = audio?.beat?.kick ? (audio.beat.kickIntensity ?? 0) : 0;
    const safeKick = Number.isFinite(kick) ? Math.min(1, Math.max(0, kick)) : 0;
    this._pulse = Math.max(this._pulse * 0.92, safeKick); // slow decay

    this.mesh.material.uniforms.uTime.value = this._time;
    this.mesh.material.uniforms.uBeat.value = this._pulse;

    // Billboard the veil to camera (keeps "threshold" read stable)
    if (this.ctx?.camera) {
      this.mesh.quaternion.copy(this.ctx.camera.quaternion);
    }
  }

  setOpacity(opacity) {
    if (this.mesh?.material?.uniforms?.uOpacity) {
      const safe = Number.isFinite(opacity) ? opacity : 0;
      const shaped = safe <= 0.005 ? 0 : Math.min(0.65, 0.05 + Math.max(0, safe) * 0.60);
      this.mesh.material.uniforms.uOpacity.value = shaped;
    }
  }

  unmount() {
    if (this.mesh) {
      this.mesh.geometry?.dispose?.();
      this.mesh.material?.dispose?.();
    }
    this.mesh = null;
    super.unmount();
  }
}
