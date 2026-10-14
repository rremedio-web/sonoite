import { VisualLayer } from '../layer-api.js';

/**
 * VoidCompressionRing
 * A thin torus around the void that "tightens" on kicks with long decays.
 * Designed for Track 5 WANTING pressure + controlled hypnosis.
 */
export class VoidCompressionRing extends VisualLayer {
  mount() {
    super.mount();

    const THREE = this.ctx?.THREE;
    if (!THREE) {
      console.error('[VoidCompressionRing] THREE not available in context');
      this.setActive?.(false);
      return;
    }

    this._time = 0;
    this._compression = 0;
    this._pulse = 0;

    const params = this.cfg?.params || this.cfg || {};
    this._tilt = params.tilt ?? 0.46;
    this._roll = params.roll ?? 0.16;

    const radius = params.radius ?? 3.4;
    const tube = params.tube ?? 0.04;
    const radialSegments = params.radialSegments ?? 96;
    const tubularSegments = params.tubularSegments ?? 16;
    const positionY = params.positionY ?? 2.0;

    const geometry = new THREE.TorusGeometry(radius, tube, tubularSegments, radialSegments);

    const baseColor = new THREE.Color(params.color || this.ctx?.palette?.accent || '#252236');
    const rimColor = new THREE.Color(params.rimColor || '#4a4f68');
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      emissive: baseColor.clone().multiplyScalar(0.20),
      emissiveIntensity: params.emissiveIntensity ?? 0.22,
      roughness: params.roughness ?? 0.34,
      metalness: params.metalness ?? 0.46,
      clearcoat: params.clearcoat ?? 0.30,
      clearcoatRoughness: params.clearcoatRoughness ?? 0.48,
      transparent: true,
      opacity: params.opacity ?? 0.34,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    this._baseColor = baseColor.clone();
    this._rimColor = rimColor;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRimStrength = { value: params.rimStrength ?? 0.74 };
      shader.uniforms.uRimPower = { value: params.rimPower ?? 1.85 };
      shader.uniforms.uRimColor = { value: this._rimColor };
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        float ndv = dot(normalize(vViewPosition), normal);
        float fresnel = pow(1.0 - max(ndv, 0.0), uRimPower);
        outgoingLight += uRimColor * fresnel * uRimStrength;
        #include <output_fragment>
        `
      );
      material.userData.shader = shader;
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, positionY, 0);
    mesh.rotation.x = Math.PI / 2 - this._tilt;
    mesh.rotation.z = this._roll;
    mesh.renderOrder = 9;
    mesh.layers.set(2);

    this.mesh = mesh;
    this.group.add(mesh);

    // Dedicated light rig for ring (layer 2 only)
    this.rimLight = new THREE.PointLight(this._rimColor, params.rimLightIntensity ?? 0.18, 8, 2);
    this.rimLight.position.set(1.0, 2.9, 4.2);
    this.rimLight.layers.set(2);
    this.fillLight = new THREE.PointLight(baseColor.clone().multiplyScalar(0.68), params.fillLightIntensity ?? 0.08, 6, 2);
    this.fillLight.position.set(-0.8, 1.2, -3.0);
    this.fillLight.layers.set(2);
    this.group.add(this.rimLight, this.fillLight);

    if (this.ctx?.camera?.layers) {
      this.ctx.camera.layers.enable(2);
    }
  }

  update(audio, dt) {
    if (!this.isActive?.() || !this.isMounted?.() || !this.mesh) return;

    this._time += dt;

    const phaseName =
      audio?.voidPhase?.name ||
      audio?.voidPhaseName ||
      audio?.voidPhase ||
      audio?.directorPhase?.name ||
      '';
    const inWanting = phaseName === 'WANTING';

    // Beat-following compression (hypnotic, slow tail)
    const kick = audio?.beat?.kick ? (audio.beat.kickIntensity ?? 0) : 0;
    const safeKick = Number.isFinite(kick) ? Math.min(1, Math.max(0, kick)) : 0;

    const impulse = safeKick * (inWanting ? 0.12 : 0.06);
    this._compression = Math.max(this._compression, impulse);
    const compressionHalfLife = inWanting ? 0.65 : 0.95;
    const compressionDecay = Math.exp((-Math.log(2) * dt) / compressionHalfLife);
    this._compression *= compressionDecay;
    const pulseHalfLife = inWanting ? 0.42 : 0.62;
    const pulseDecay = Math.exp((-Math.log(2) * dt) / pulseHalfLife);
    this._pulse = Math.max(this._pulse * pulseDecay, safeKick);

    // Subtle pressure oscillation (avoid obvious "bouncy ring" read).
    const breath = 1.0 + Math.sin(this._time * 0.22) * 0.008;

    // Apply compression on the mesh (group scale remains authored/moment-driven)
    const compressedScale = Math.max(0.72, 1.0 - this._compression);
    this.mesh.scale.setScalar(compressedScale * breath);
    this.mesh.rotation.x = (Math.PI / 2 - this._tilt) + Math.sin(this._time * 0.37 + safeKick * 4.0) * 0.012;
    this.mesh.rotation.z = this._roll + Math.sin(this._time * 0.29 + safeKick * 2.0) * 0.010;
    if (this.mesh.material) {
      const params = this.cfg?.params || this.cfg || {};
      const baseEmissive = params.emissiveIntensity ?? 0.22;
      this.mesh.material.emissiveIntensity = baseEmissive;
      if (this.mesh.material.color && this._baseColor) {
        this.mesh.material.color.copy(this._baseColor);
      }
      const shader = this.mesh.material.userData?.shader;
      if (shader?.uniforms?.uRimStrength) {
        const baseRim = params.rimStrength ?? 0.74;
        shader.uniforms.uRimStrength.value = baseRim * (0.82 + 0.18 * this._pulse);
      }
      if (this.rimLight) {
        this.rimLight.intensity = (params.rimLightIntensity ?? 0.18) * (0.86 + 0.14 * this._pulse);
      }
    }
  }

  setOpacity(opacity) {
    if (!this.mesh?.material) return;
    const safe = Number.isFinite(opacity) ? opacity : 0;
    if (this.mesh.material) {
      this.mesh.material.opacity = Math.max(0, Math.min(1, safe));
      this.mesh.material.transparent = true;
    }
    if (this.group) {
      this.group.visible = this.mesh.material.opacity > 0.01;
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
