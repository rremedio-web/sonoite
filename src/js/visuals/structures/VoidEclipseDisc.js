import { VisualLayer } from '../layer-api.js';

/**
 * VoidEclipseDisc
 * Track 05 setpiece: a cheap, readable accretion-disk hero surface.
 *
 * - World-space disc around the void center (not a camera billboard).
 * - Authorable via timeline:
 *   - `opacity` action targets `uOpacity`
 *   - `spin` action can rotate `group.rotation.y`
 * - Shader is intentionally simple: polar streaks + mild noise.
 */
export class VoidEclipseDisc extends VisualLayer {
    mount() {
        super.mount();

        const THREE = this.ctx?.THREE;
        if (!THREE) {
            console.error('[VoidEclipseDisc] THREE not available in context');
            this.setActive?.(false);
            return;
        }

        const params = (this.cfg && typeof this.cfg === 'object' && this.cfg.params && typeof this.cfg.params === 'object')
            ? this.cfg.params
            : (this.cfg || {});

        this._time = 0;
        this._timeScale = Number.isFinite(params.timeScale) ? params.timeScale : 1.0;

        const radius = params.radius ?? 6.4;
        const innerRadius = params.innerRadius ?? radius * 0.34;
        const positionY = params.positionY ?? 2.0;
        const tilt = params.tilt ?? 0.24;

        const geometry = new THREE.CircleGeometry(radius, 128);
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            uniforms: {
                uOpacity: { value: params.opacity ?? 0.0 },
                uTime: { value: 0.0 },
                uGain: { value: params.gain ?? 0.65 },
                uInnerRadius: { value: innerRadius },
                uOuterRadius: { value: radius },
                uSoftness: { value: params.softness ?? 0.14 },
                uHotColor: { value: new THREE.Color(params.hotColor || '#ff5a1f') },
                uCoolColor: { value: new THREE.Color(params.coolColor || '#161622') },
                uStreaks: { value: params.streaks ?? 6.0 },
                uSwirl: { value: params.swirl ?? 3.2 },
                uFlicker: { value: params.flicker ?? 0.08 },
            },
            vertexShader: `
                varying vec2 vLocal;
                varying vec3 vNormal;
                varying vec3 vViewPos;

                void main() {
                    vLocal = position.xy;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPos = mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uOpacity;
                uniform float uTime;
                uniform float uGain;
                uniform float uInnerRadius;
                uniform float uOuterRadius;
                uniform float uSoftness;
                uniform vec3 uHotColor;
                uniform vec3 uCoolColor;
                uniform float uStreaks;
                uniform float uSwirl;
                uniform float uFlicker;
                varying vec2 vLocal;
                varying vec3 vNormal;
                varying vec3 vViewPos;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                float noise2(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }

                void main() {
                    if (uOpacity <= 0.001) discard;

                    float r = length(vLocal);

                    // Ring mask in world units, with softness expressed as a fraction of outer radius.
                    float soft = max(1e-4, uSoftness * uOuterRadius * 2.0);
                    float innerEdge = smoothstep(uInnerRadius, uInnerRadius + soft, r);
                    float outerEdge = 1.0 - smoothstep(uOuterRadius - soft, uOuterRadius, r);
                    innerEdge = pow(innerEdge, 0.85);
                    outerEdge = pow(outerEdge, 0.85);
                    float ring = clamp(innerEdge * outerEdge, 0.0, 1.0);
                    if (ring <= 0.0002) discard;

                    // Normalize radius: 0 at inner edge, 1 at outer edge.
                    float rn = clamp((r - uInnerRadius) / max(1e-4, (uOuterRadius - uInnerRadius)), 0.0, 1.0);
                    float heat = pow(1.0 - rn, 1.8); // hottest near the inner edge

                    float ang = atan(vLocal.y, vLocal.x);
                    float t = uTime;

                    // Polar streaks (reads as fast/hot matter shearing).
                    // Break the “video game sine ring” by introducing low-cost irregularity.
                    float warpN = noise2(vec2(ang * 1.7, rn * 12.0) + vec2(t * 0.18, -t * 0.07));
                    float swirl = sin(ang * uStreaks + rn * uSwirl * 12.0 - t * 2.2 + (warpN - 0.5) * 2.4);
                    float streak = pow(clamp(swirl * 0.5 + 0.5, 0.0, 1.0), 2.4);

                    // Asymmetric arc highlight (avoids uniform "gamey" ring)
                    float arc = 0.5 + 0.5 * cos(ang - t * 0.15);
                    arc = smoothstep(0.15, 1.0, arc);

                    // Fine noise texture (stable, low-cost).
                    float n = noise2(vec2(ang * 3.0, rn * 18.0) + vec2(t * 0.15, -t * 0.05));
                    float grit = mix(0.85, 1.15, n);

                    // Mild flicker (kept small to avoid strobe).
                    float flicker = 1.0 + uFlicker * sin(t * 9.0 + ang * 2.0);

                    // View-dependent rim/sheen so the disc reads as a *material*, not a HUD overlay.
                    vec3 viewDir = normalize(-vViewPos);
                    float ndv = max(dot(normalize(vNormal), viewDir), 0.0);
                    float fresnel = pow(1.0 - ndv, 3.2);

                    vec3 col = mix(uCoolColor, uHotColor, heat);
                    col = mix(col, uHotColor, fresnel * 0.08); // subtle chroma shift at grazing angles

                    float intensity = ring * (0.20 + 0.80 * streak) * (0.22 + 0.78 * heat) * grit * flicker * uGain;
                    intensity *= mix(0.7, 1.18, arc);
                    intensity *= mix(0.92, 1.22, fresnel);

                    // Subtle grain to break banding in near-black gradients (no post pass required).
                    float g = hash(gl_FragCoord.xy + vec2(t * 120.0, 0.0)) - 0.5;
                    intensity *= 1.0 + g * 0.06;

                    // Soft-knee highlight rolloff (keeps bright cores without flat white clipping).
                    vec3 hdr = col * intensity;
                    vec3 knee = hdr / (vec3(1.0) + hdr);
                    vec3 outCol = mix(hdr, knee, 0.35);

                    gl_FragColor = vec4(outCol, uOpacity * ring);
                }
            `,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 30;

        this.mesh = mesh;

        this.group.position.set(0, positionY, 0);
        // Treat tilt as an actual disc inclination relative to horizontal.
        this.group.rotation.x = -Math.PI / 2 + tilt;
        this.group.rotation.z = 0.12;
        this.group.add(mesh);

        this.setOpacity(params.opacity ?? 0.0);
    }

    /**
     * Legacy hook retained for compatibility with older Track 5 Director logic.
     * Interpreted as a short “flare” (opacity bump) rather than a camera occlusion pass.
     */
    triggerPass(opts = {}) {
        const params = (this.cfg && typeof this.cfg === 'object' && this.cfg.params && typeof this.cfg.params === 'object')
            ? this.cfg.params
            : (this.cfg || {});

        const duration = Number.isFinite(opts.duration) ? opts.duration : (params.passDuration ?? 4.0);
        const peak = params.passOpacity ?? 0.35;
        this._flare = {
            active: true,
            t: 0,
            duration: Math.max(0.5, duration),
            peak,
        };
        this.setOpacity(peak);
    }

    update(audio, dt) {
        if (!this.isActive?.() || !this.isMounted?.() || !this.mesh) return;

        this._time += dt * this._timeScale;

        const uniforms = this.mesh.material?.uniforms;
        if (uniforms?.uTime) {
            uniforms.uTime.value = this._time;
        }

        if (this._flare?.active) {
            this._flare.t += dt;
            const p = Math.min(this._flare.t / this._flare.duration, 1.0);
            const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const a = (1.0 - eased) * (this._flare.peak ?? 0.35);
            this.setOpacity(a);
            if (p >= 1.0) {
                this._flare.active = false;
                const params = (this.cfg && typeof this.cfg === 'object' && this.cfg.params && typeof this.cfg.params === 'object')
                    ? this.cfg.params
                    : (this.cfg || {});
                this.setOpacity(params.opacity ?? 0.0);
            }
        }
    }

    setOpacity(opacity) {
        if (!this.mesh?.material?.uniforms?.uOpacity) return;
        const safe = Number.isFinite(opacity) ? opacity : 0;
        this.mesh.material.uniforms.uOpacity.value = Math.max(0, Math.min(1, safe));
        if (this.group) {
            this.group.visible = this.mesh.material.uniforms.uOpacity.value > 0.01;
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
