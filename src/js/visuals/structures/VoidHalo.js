/**
 * VoidHalo.js - Accretion Disk Rings for Track 5
 *
 * Creates 3 concentric rings that form an accretion disk effect
 * around the VoidSphere. Designed for the "inverse breathing" mechanic:
 * - Opacity increases during silent phases (void WANTS)
 * - Rings contract tightly toward center during WANTING phase
 * - Subtle rotation creates flowing accretion disk illusion
 *
 * @package SonoiteTheme
 * @version 1.0.0
 */

import { VisualLayer } from '../layer-api.js';

export class VoidHalo extends VisualLayer {
    mount() {
        super.mount();

        const THREE = this.ctx?.THREE;
        if (!THREE) {
            console.error('[VoidHalo] THREE not available in context');
            this.setActive?.(false);
            return;
        }

        this._time = 0;
        this._targetOpacity = 0;
        this._currentOpacity = 0;
        this._opacityAlpha = 0.12;
        this._authorOpacity = 0.28;

        // Contraction state (0 = relaxed, 1 = fully contracted)
        this._contraction = 0;
        this._targetContraction = 0;
        this._contractionAlpha = 0.02;

        // Ring configuration — read from cfg.params (registry nests params)
        const p = this.cfg.params || this.cfg;
        const baseY = p.positionY ?? 2.0;
        const baseColor = new THREE.Color(p.color || this.ctx?.palette?.accent || '#1a1a28');
        const baseOpacity = p.opacity ?? 0.30;
        const baseTilt = p.tilt ?? 0.44;
        const baseRoll = p.roll ?? 0.14;

        // Three rings at different radii
        this.rings = [];
        const ringConfigs = [
            { radius: 4.0, tube: 0.048, opacity: baseOpacity * 0.78, speed: 0.008 },
            { radius: 5.5, tube: 0.040, opacity: baseOpacity * 0.66, speed: -0.006 },
            { radius: 7.0, tube: 0.034, opacity: baseOpacity * 0.52, speed: 0.004 }
        ];

        ringConfigs.forEach((cfg, index) => {
            const geometry = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 128);
            const material = new THREE.MeshPhysicalMaterial({
                color: baseColor.clone(),
                emissive: baseColor.clone().multiplyScalar(0.10),
                emissiveIntensity: 0.04,
                roughness: 0.18,
                metalness: 0.55,
                clearcoat: 0.35,
                clearcoatRoughness: 0.28,
                transparent: true,
                opacity: 0, // Start invisible
                depthWrite: false,
                blending: THREE.NormalBlending
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, baseY, 0);
            mesh.rotation.x = Math.PI / 2 - baseTilt; // Inclined accretion plane

            // Slight tilt for depth perception
            mesh.rotation.y = index * 0.05;
            mesh.rotation.z = baseRoll + index * 0.04;

            mesh.renderOrder = 8 + index;

            this.group.add(mesh);
            this.rings.push({
                mesh,
                baseRadius: cfg.radius,
                baseOpacity: cfg.opacity,
                rotationSpeed: cfg.speed
            });
        });

        // Store base color for audio-reactive tinting
        this._baseColor = baseColor;
    }

    update(audio, dt) {
        if (!this.isActive?.() || !this.isMounted?.() || !this.rings?.length) return;

        this._time += dt;

        // Get audio features
        const loudness = audio?.loudness ?? 0;
        const bass = audio?.bass ?? 0;

        // Inverse breathing: silence increases opacity
        const inverseLoudness = 1.0 - loudness;

        // Get phase from director if available
        // PHASE-FIX: Use Track 5 voidPhase cascade (matches VoidCompressionRing)
        const phaseName =
            audio?.voidPhase?.name ||
            audio?.voidPhaseName ||
            audio?.voidPhase ||
            audio?.directorPhase?.name ||
            '';
        const inWanting = phaseName === 'WANTING';
        const inActive = phaseName === 'RELEASE' || inWanting || phaseName === 'AWAKENING';

        // Target opacity based on phase and silence
        if (inActive) {
            // In active phases, show rings during silence (inverse breathing)
            const floor = inWanting ? 0.08 : 0.06;
            const span = inWanting ? 0.10 : 0.08;
            this._targetOpacity = floor + inverseLoudness * span;
        } else {
            // In quiet phases (VOID, ERASURE), subtle presence
            this._targetOpacity = 0.05 + inverseLoudness * 0.06;
        }

        // Target contraction based on phase
        if (inWanting) {
            // Contract rings toward center during WANTING (peak intensity)
            this._targetContraction = 0.3 + inverseLoudness * 0.4;
        } else if (inActive) {
            this._targetContraction = 0.1 + inverseLoudness * 0.2;
        } else {
            this._targetContraction = 0;
        }

        // Smooth transitions
        this._currentOpacity += (this._targetOpacity - this._currentOpacity) * this._opacityAlpha;
        this._contraction += (this._targetContraction - this._contraction) * this._contractionAlpha;

        // Bass-reactive pulse
        const bassPulse = 1.0 + bass * 0.08;

        // Update each ring
        this.rings.forEach((ring, index) => {
            if (!ring.mesh?.material) return;

            // Opacity with subtle per-ring variation
            const ringPhase = this._time * 0.3 + index * 2.1;
            const opacityWave = 1.0 + Math.sin(ringPhase) * 0.08;
            ring.mesh.material.opacity = this._authorOpacity * opacityWave * (0.5 + 0.5 * this._currentOpacity);

            // Rotation
            ring.mesh.rotation.z += ring.rotationSpeed * dt;

            // Contraction: reduce radius
            const contractionFactor = 1.0 - this._contraction * (0.4 - index * 0.1);
            const currentRadius = ring.baseRadius * contractionFactor * bassPulse;

            // Scale the ring (non-uniform to maintain shape)
            ring.mesh.scale.setScalar(currentRadius / ring.baseRadius);

            // Subtle color shift on bass
            if (ring.mesh.material.color) {
                ring.mesh.material.color.copy(this._baseColor);
            }
        });

        // Hide group if completely transparent
        if (this.group) {
            this.group.visible = this._currentOpacity > 0.01;
        }
    }

    /**
     * Set overall opacity (called by actions/moments)
     * @param {number} opacity - Target opacity (0-1)
     */
    setOpacity(opacity) {
        const safe = Number.isFinite(opacity) ? opacity : 0;
        this._authorOpacity = safe <= 0.005 ? 0 : Math.min(0.55, 0.05 + Math.max(0, safe) * 0.50);
    }

    /**
     * Set contraction amount (0 = relaxed, 1 = fully contracted)
     * @param {number} contraction - Contraction amount (0-1)
     */
    setContraction(contraction) {
        const safe = Number.isFinite(contraction) ? contraction : 0;
        this._targetContraction = Math.max(0, Math.min(1, safe));
    }

    /**
     * Trigger a contraction pulse (for beat sync)
     * @param {number} intensity - Pulse intensity (0-1)
     */
    pulse(intensity = 0.5) {
        this._contraction = Math.min(1, this._contraction + intensity * 0.3);
    }

    unmount() {
        if (this.rings) {
            this.rings.forEach(ring => {
                if (ring.mesh) {
                    ring.mesh.geometry?.dispose?.();
                    ring.mesh.material?.dispose?.();
                }
            });
        }
        this.rings = null;
        super.unmount();
    }
}

export default VoidHalo;
