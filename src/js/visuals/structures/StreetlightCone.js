import * as THREE from 'three';
import { VisualLayer } from '../layer-api.js';

export class StreetlightCone extends VisualLayer {
  mount() {
    super.mount();

    const params = this.cfg?.params || this.cfg || {};
    const height = params.height ?? 8.4;
    const radius = params.radius ?? 3.0;
    const sourceY = params.sourceY ?? height;
    const beamCenterY = params.positionY ?? (height * 0.5);
    const groundRadius = params.groundRadius ?? radius * 0.95;
    const poleHeight = params.poleHeight ?? (height + 1.2);
    const beamColor = new THREE.Color(params.color || '#d5b074');
    const sourceColor = new THREE.Color(params.sourceColor || '#fff1bf');
    const poleColor = new THREE.Color(params.poleColor || '#111318');

    this._time = 0;
    this._authorOpacity = THREE.MathUtils.clamp(params.opacity ?? 0.82, 0, 1);
    this._currentOpacity = 0;
    this._targetOpacity = this._authorOpacity;
    this._ema = { loudness: 0, treble: 0, bass: 0 };
    this._alpha = 0.12;
    this._baseLightIntensity = params.lightIntensity ?? 1.15;

    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.08, poleHeight, 10, 1, false);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: poleColor,
      roughness: 0.92,
      metalness: 0.18
    });
    this.pole = new THREE.Mesh(poleGeometry, poleMaterial);
    this.pole.position.set(0, poleHeight * 0.5, 0);
    this.group.add(this.pole);

    const beamGeometry = new THREE.ConeGeometry(radius, height, 40, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.beam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beam.position.set(0, beamCenterY, 0);
    this.group.add(this.beam);

    const poolGeometry = new THREE.CircleGeometry(groundRadius, 40);
    const poolMaterial = new THREE.MeshBasicMaterial({
      color: beamColor.clone().multiplyScalar(0.9),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.pool = new THREE.Mesh(poolGeometry, poolMaterial);
    this.pool.rotation.x = -Math.PI * 0.5;
    this.pool.position.set(0, 0.04, 0);
    this.group.add(this.pool);

    const sourceGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const sourceMaterial = new THREE.MeshBasicMaterial({
      color: sourceColor,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.source = new THREE.Mesh(sourceGeometry, sourceMaterial);
    this.source.position.set(0, sourceY, 0);
    this.group.add(this.source);

    this.light = new THREE.PointLight(sourceColor, 0, 15, 2.0);
    this.light.position.copy(this.source.position);
    this.group.add(this.light);

    this.material = beamMaterial;
    this.group.visible = true;
  }

  _smooth(key, value) {
    this._ema[key] = this._ema[key] * (1 - this._alpha) + value * this._alpha;
    return this._ema[key];
  }

  update(audio, dt) {
    if (!this.group) return;

    this._time += dt;

    const loudness = this._smooth('loudness', Math.min(1, audio?.loudness ?? 0));
    const treble = this._smooth('treble', Math.min(1, audio?.treble ?? 0));
    const bass = this._smooth('bass', Math.min(1, audio?.bass ?? 0));

    this._currentOpacity += (this._targetOpacity - this._currentOpacity) * 0.08;
    const flicker = 0.94 + Math.sin(this._time * 0.55) * 0.035 + treble * 0.06 + loudness * 0.04;
    const safeOpacity = THREE.MathUtils.clamp(this._currentOpacity * flicker, 0, 1);

    if (this.beam?.material) {
      this.beam.material.opacity = safeOpacity * 0.22;
    }
    if (this.pool?.material) {
      this.pool.material.opacity = safeOpacity * (0.18 + loudness * 0.04);
    }
    if (this.source?.material) {
      this.source.material.opacity = safeOpacity * 0.88;
    }
    if (this.light) {
      this.light.intensity = this._baseLightIntensity * safeOpacity * (0.88 + bass * 0.16);
    }

    if (this.pool) {
      const breath = 1 + Math.sin(this._time * 0.28) * 0.03 + loudness * 0.03;
      this.pool.scale.setScalar(breath);
    }

    this.group.visible = safeOpacity > 0.01;
  }

  setOpacity(opacity = 1.0) {
    this._targetOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
  }
}

export default StreetlightCone;
