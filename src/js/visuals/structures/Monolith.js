/**
 * Monolith Structure - Dual-layer "Obsidian Reactor"
 * Outer shell: high-end MeshPhysicalMaterial (glass/obsidian)
 * Inner core: emissive "magma" volume for reliable bloom source
 * @module Monolith
 */

import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';
import createSuccessionMaterial from '../materials/SuccessionMaterial.js';

export class Monolith extends VisualLayer {
  mount() {
    super.mount();

    // Environment map (reflections) if available
    const env = this.ctx?.envMap || null;

    // Track config may provide a desired monolith height (Track 6 uses height: 12)
    // Default remains the legacy look (~3.8) so idle state stays sane.
    const desiredHeight = Number(this.getConfigValue('params.height', 3.8));
    const shellHeight = Number.isFinite(desiredHeight) && desiredHeight > 0 ? desiredHeight : 3.8;
    const useSuccessionMaterial = !!this.getConfigValue('params.useSuccessionMaterial', false);
    const successionTransition = Number(this.getConfigValue('params.successionTransition', 0.0));
    const obsidianColor = this.getConfigValue('params.obsidianColor', '#0a0a12');
    const plasmaColor = this.getConfigValue('params.plasmaColor', '#ff6622');
    const burnColor = this.getConfigValue('params.burnColor', '#ffaa44');
    const coreEmissive = this.getConfigValue('params.coreEmissive', '#ff3a00');
    const coreEmissiveIntensity = Number(this.getConfigValue('params.coreEmissiveIntensity', 0.20));

    // Preserve the current proportions at ~3.8, then widen slightly as height grows.
    // This keeps the monolith imposing for Track 6 without becoming a fat block.
    const extra = Math.max(0, shellHeight - 3.8);
    const shellWidth = Math.min(1.2 + extra * 0.10, 2.2);
    const shellDepth = Math.min(0.8 + extra * 0.06, 1.4);

    const coreHeight = shellHeight * (3.2 / 3.8);
    const coreWidth = shellWidth * (0.75 / 1.2);
    const coreDepth = shellDepth * (0.38 / 0.8);

    const centerY = shellHeight * 0.5;

    // 1) Inner core: emissive magma (stable bloom source, audio can drive emissiveIntensity)
    const coreGeo = new THREE.BoxGeometry(coreWidth, coreHeight, coreDepth);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#050505'),
      emissive: new THREE.Color(coreEmissive),
      emissiveIntensity: Number.isFinite(coreEmissiveIntensity) ? coreEmissiveIntensity : 0.20,
      roughness: 0.65,
      metalness: 0.0,
      toneMapped: false
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.set(0, centerY, 0);
    this.group.add(this.core);

    // 2) Outer shell: obsidian glass prism (PBR/transmission)
    const shellGeo = new THREE.BoxGeometry(shellWidth, shellHeight, shellDepth);
    const shellMat = useSuccessionMaterial
      ? createSuccessionMaterial({
          transition: Number.isFinite(successionTransition) ? successionTransition : 0.0,
          obsidianColor,
          plasmaColor,
          burnColor,
          emissiveIntensity: 1.45
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#050505'),
          roughness: 0.15,
          metalness: 0.0,
          transmission: 0.85,
          thickness: 1.5,
          ior: 1.45,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          reflectivity: 0.15,
          attenuationColor: new THREE.Color('#0a0a0f'),
          attenuationDistance: 2.0,
          envMap: env,
          envMapIntensity: env ? 0.6 : 0,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide
        });

    if (!useSuccessionMaterial && shellMat.emissive) {
      shellMat.emissive = new THREE.Color('#000000');
      shellMat.emissiveIntensity = 0.0;
    }

    this.shell = new THREE.Mesh(shellGeo, shellMat);
    this.shell.position.set(0, centerY, 0);
    this.group.add(this.shell);

    // Local light so the physical shell reads even if the global scene is shader-lit (0 lights).
    // Tight distance prevents washing other layers and preserves black discipline.
    const lightDistance = Math.max(6.0, shellHeight * 0.8);
    this.innerLight = new THREE.PointLight(new THREE.Color('#ff3a00'), 1.2, lightDistance, 2.0);
    this.innerLight.position.set(0, centerY, 0);
    this.innerLight.castShadow = false;
    this.group.add(this.innerLight);

    // Expose a "primary" material for generic actions (glow/edge_shimmer)
    // Prefer the core so it remains expressive even if the shell is near-black.
    this.material = coreMat;
    // Keep references for direct tuning/debug
    this.coreMaterial = coreMat;
    this.shellMaterial = shellMat;
    this.usesSuccessionMaterial = useSuccessionMaterial;

    // Animation state
    this._time = 0;
  }

  update(audio, dt) {
    this._time += dt;

    // Baseline motion: always perceptible, but disciplined (no random wandering)
    const bass = Math.min(1, audio?.bass ?? 0);
    const mid = Math.min(1, audio?.mid ?? 0);

    // Slow, heavy rotation + subtle breath scale (reactive but not strobey)
    const rotationSpeed = 0.08 + mid * 0.06;
    this.group.rotation.y += dt * rotationSpeed;
    this.group.rotation.x = Math.sin(this._time * 0.35) * 0.02;

    const breath = 0.006 * Math.sin(this._time * 0.7);
    const pulse = bass * 0.012;
    const scale = 1.0 + breath + pulse;
    this.group.scale.set(scale, scale * 1.01, scale);

    if (typeof this.shellMaterial?.userData?.update === 'function') {
      this.shellMaterial.userData.update(audio, dt);
    }
  }

  unmount() {
    if (this.core) {
      if (this.core.geometry) this.core.geometry.dispose();
      if (this.core.material) this.core.material.dispose();
    }
    if (this.shell) {
      if (this.shell.geometry) this.shell.geometry.dispose();
      if (this.shell.material) this.shell.material.dispose();
    }
    if (this.innerLight) {
      this.group.remove(this.innerLight);
      // PointLight has no disposable resources besides being removed.
      this.innerLight = null;
    }
    super.unmount();
  }
}
