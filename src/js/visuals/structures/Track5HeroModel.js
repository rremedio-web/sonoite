import { VisualLayer } from '../layer-api.js';

const HERO_LAYER = 4;

/**
 * Track5HeroModel
 * Sculpture-first reliquary hero for Track 5.
 *
 * This branch treats the model as the primary subject for the chapter opening,
 * with the void arriving later as a hostile atmospheric force.
 */
export class Track5HeroModel extends VisualLayer {
    mount() {
        super.mount();

        this.params = this.cfg?.params || this.cfg || {};
        this.enabled = this._isEnabled();
        this.currentPhase = 'VOID';
        this._authorOpacity = this.params.opacity ?? 1.0;
        this._currentOpacity = 0.0;
        this._targetOpacity = 0.0;
        this._opacityAlpha = 0.08;
        this._currentScale = 1.0;
        this._targetScale = 1.0;
        this._scaleAlpha = 0.05;
        this._time = 0.0;
        this._disposed = false;
        this._loaded = false;
        this._modelRoot = null;
        this._materials = [];
        this._specimenParts = [];
        this._membraneParts = [];
        this._metalParts = [];
        this._proceduralMode = this.params.mode === 'specimen_assembly';
        this._pressure = 0.0;
        this._twitch = 0.0;

        this.phaseConfig = {
            VOID: { opacity: 1.0, scale: 1.0, drift: 0.004, light: 1.0 },
            AWAKENING: { opacity: 1.0, scale: 0.994, drift: 0.006, light: 1.18 },
            WANTING: { opacity: 0.92, scale: 0.992, drift: 0.004, light: 1.02 },
            RELEASE: { opacity: 0.60, scale: 0.982, drift: 0.002, light: 0.50 },
            ERASURE: { opacity: 0.22, scale: 0.968, drift: 0.0, light: 0.18 }
        };

        this.group.visible = false;

        if (!this.enabled) {
            this.setActive?.(false);
            return;
        }

        this._createLightRig();

        if (this._proceduralMode) {
            this._createSpecimenAssembly();
        } else {
            this._loadModel().catch((error) => {
                console.error('[Track5HeroModel] Failed to load hero model:', error);
                this.group.visible = false;
            });
        }
    }

    _isEnabled() {
        if (this.params.forceDisable === true) return false;
        if (this.params.forceEnable === true) return true;
        if (this.params.mode === 'specimen_assembly') return true;

        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('t5model');
        const stored = typeof localStorage !== 'undefined'
            ? localStorage.getItem('SONOITE_T5_MODEL_POC')
            : null;

        return query === '1' || stored === '1' || window.SONOITE_T5_MODEL_POC === true;
    }

    _createLightRig() {
        const THREE = this.ctx.THREE;

        this.ambientLight = new THREE.AmbientLight(0xf1ece3, 0.34);
        this.ambientLight.layers.set(HERO_LAYER);

        this.fillLight = new THREE.HemisphereLight(0xeae3d8, 0x121722, 0.74);
        this.fillLight.layers.set(HERO_LAYER);

        this.keyLight = new THREE.DirectionalLight(0xf8f0e3, 3.6);
        this.keyLight.position.set(3.2, 5.8, 6.6);
        this.keyLight.layers.set(HERO_LAYER);

        this.rimLight = new THREE.DirectionalLight(0x96a0c2, 1.45);
        this.rimLight.position.set(-4.6, 3.8, -4.8);
        this.rimLight.layers.set(HERO_LAYER);

        this.backLight = new THREE.PointLight(0xcbd3e8, 1.08, 18, 2);
        this.backLight.position.set(0.0, 2.0, -5.4);
        this.backLight.layers.set(HERO_LAYER);

        this.group.add(this.ambientLight, this.fillLight, this.keyLight, this.rimLight, this.backLight);

        if (this.ctx?.camera?.layers) {
            this.ctx.camera.layers.enable(HERO_LAYER);
        }
    }

    _createSpecimenAssembly() {
        const THREE = this.ctx.THREE;
        const root = new THREE.Group();
        const centerY = this.params.centerY ?? 1.78;
        const offsetX = this.params.offsetX ?? 0.45;
        const offsetY = this.params.offsetY ?? 0;
        const offsetZ = this.params.offsetZ ?? 0;
        const scale = this.params.specimenScale ?? 1.0;

        root.position.set(offsetX, centerY + offsetY, offsetZ);
        root.rotation.set(
            this.params.rotationX ?? -0.08,
            this.params.rotationY ?? 0.12,
            this.params.rotationZ ?? -0.04
        );
        root.scale.setScalar(scale);

        this._addPaleShard(root, {
            name: 'upper-petal',
            position: [-0.28, 0.68, 0.02],
            rotation: [0.18, -0.18, -0.32],
            scale: [0.18, 1.18, 0.045],
            pull: [-0.16, 0.08, 0.02],
            sensitivity: 0.95,
            phase: 0.2
        });
        this._addPaleShard(root, {
            name: 'lower-bone',
            position: [0.18, -0.16, 0.04],
            rotation: [-0.08, 0.22, 0.18],
            scale: [0.16, 0.92, 0.04],
            pull: [0.18, -0.04, 0.05],
            sensitivity: 0.72,
            phase: 1.4
        });
        this._addPaleShard(root, {
            name: 'side-splinter',
            position: [0.54, 0.2, -0.04],
            rotation: [0.24, -0.06, 0.82],
            scale: [0.10, 0.72, 0.035],
            pull: [0.26, 0.02, -0.02],
            sensitivity: 1.12,
            phase: 2.7
        });
        this._addPaleShard(root, {
            name: 'fallen-petal',
            position: [-0.72, -0.38, 0.0],
            rotation: [-0.16, 0.14, -1.02],
            scale: [0.105, 0.82, 0.032],
            pull: [-0.24, -0.04, 0.02],
            sensitivity: 0.82,
            phase: 3.8
        });
        this._addCoreShard(root);
        this._addMetalArc(root);
        this._addMembrane(root);

        root.traverse((obj) => {
            if (!obj.isMesh) return;
            obj.castShadow = false;
            obj.receiveShadow = false;
            obj.frustumCulled = true;
            obj.renderOrder = 8;
            obj.layers.set(HERO_LAYER);
            if (obj.material) {
                obj.material.transparent = true;
                obj.material.opacity = 0.0;
                this._materials.push(obj.material);
            }
        });

        this._modelRoot = root;
        this.group.add(root);
        this._loaded = true;
        this.group.visible = true;
    }

    _addPaleShard(root, config) {
        const THREE = this.ctx.THREE;
        const geometry = new THREE.SphereGeometry(1, 16, 8);
        this._fractureShardGeometry(geometry, config.phase ?? 0);
        const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(config.color || this.params.specimenColor || '#e7e2d8'),
            roughness: 0.90,
            metalness: 0.0,
            clearcoat: 0.03,
            clearcoatRoughness: 0.86,
            emissive: new THREE.Color('#050505'),
            emissiveIntensity: 0.0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `specimen-${config.name}`;
        mesh.position.set(...config.position);
        mesh.rotation.set(...config.rotation);
        mesh.scale.set(...config.scale);
        root.add(mesh);

        this._specimenParts.push({
            mesh,
            basePosition: mesh.position.clone(),
            baseRotation: mesh.rotation.clone(),
            pull: new THREE.Vector3(...config.pull),
            sensitivity: config.sensitivity,
            phase: config.phase
        });
    }

    _addCoreShard(root) {
        const THREE = this.ctx.THREE;
        const geometry = new THREE.IcosahedronGeometry(1, 0);
        this._fractureShardGeometry(geometry, 4.6, 0.24);
        const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(this.params.coreColor || '#ded8cf'),
            roughness: 0.88,
            metalness: 0.0,
            clearcoat: 0.04,
            clearcoatRoughness: 0.84,
            emissive: new THREE.Color('#080808'),
            emissiveIntensity: 0.0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'specimen-core-shard';
        mesh.position.set(-0.04, -0.50, 0.08);
        mesh.rotation.set(0.48, -0.28, 0.42);
        mesh.scale.set(0.15, 0.13, 0.09);
        root.add(mesh);

        this._specimenParts.push({
            mesh,
            basePosition: mesh.position.clone(),
            baseRotation: mesh.rotation.clone(),
            pull: new THREE.Vector3(0.05, -0.10, 0.02),
            sensitivity: 0.42,
            phase: 4.6
        });
    }

    _fractureShardGeometry(geometry, seed, amount = 0.16) {
        const position = geometry.attributes.position;

        for (let i = 0; i < position.count; i += 1) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            const waist = 1.0 - (Math.abs(y) * 0.18);
            const chip = Math.sin((x * 8.3) + (y * 5.7) + seed) * amount;
            const bite = Math.cos((z * 7.1) - (y * 3.4) + seed) * amount * 0.55;

            position.setXYZ(
                i,
                x * waist + chip * 0.12,
                y + bite * 0.05,
                z * (waist - 0.08) + chip * 0.08
            );
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    _addMetalArc(root) {
        const THREE = this.ctx.THREE;
        const metalMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(this.params.metalColor || '#6c6860'),
            roughness: 0.36,
            metalness: 0.86,
            clearcoat: 0.28,
            clearcoatRoughness: 0.24,
            emissive: new THREE.Color('#000000'),
            emissiveIntensity: 0.0
        });

        const leftCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.48, 0.44, 0.04),
            new THREE.Vector3(-0.32, 0.10, 0.08),
            new THREE.Vector3(-0.18, -0.34, 0.06)
        ]);
        const rightCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.46, 0.48, 0.02),
            new THREE.Vector3(0.30, 0.08, 0.08),
            new THREE.Vector3(0.12, -0.36, 0.05)
        ]);

        [leftCurve, rightCurve].forEach((curve, index) => {
            const geometry = new THREE.TubeGeometry(curve, 32, 0.018, 8, false);
            const mesh = new THREE.Mesh(geometry, metalMaterial.clone());
            mesh.name = `specimen-metal-prong-${index}`;
            root.add(mesh);
            this._metalParts.push({
                mesh,
                baseRotation: mesh.rotation.clone(),
                phase: index * 1.7
            });
        });

        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.05, 1.18, 18),
            metalMaterial.clone()
        );
        stem.name = 'specimen-metal-stem';
        stem.position.set(0.1, 0.2, -0.02);
        stem.rotation.set(0.12, 0.06, -0.18);
        root.add(stem);
        this._metalParts.push({
            mesh: stem,
            baseRotation: stem.rotation.clone(),
            phase: 2.2
        });
    }

    _addMembrane(root) {
        const THREE = this.ctx.THREE;
        const membraneMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(this.params.membraneColor || '#d8d5cd'),
            roughness: 0.94,
            metalness: 0.0,
            clearcoat: 0.0,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const strips = [
            { position: [-0.18, 0.18, 0.16], rotation: [0.24, -0.18, -0.58], scale: [0.10, 0.96, 1.0], pull: [-0.18, -0.06, 0.04] },
            { position: [0.28, 0.08, 0.14], rotation: [-0.10, 0.22, 0.44], scale: [0.08, 0.78, 1.0], pull: [0.22, -0.04, 0.05] },
            { position: [-0.02, -0.20, 0.18], rotation: [0.18, 0.08, 0.05], scale: [0.16, 0.72, 1.0], pull: [0.03, -0.16, 0.04] }
        ];

        strips.forEach((config, index) => {
            const geometry = new THREE.PlaneGeometry(1, 1, 8, 18);
            const mesh = new THREE.Mesh(geometry, membraneMaterial.clone());
            mesh.name = `specimen-membrane-${index}`;
            mesh.material.userData.isSpecimenMembrane = true;
            mesh.position.set(...config.position);
            mesh.rotation.set(...config.rotation);
            mesh.scale.set(...config.scale);
            root.add(mesh);
            this._membraneParts.push({
                mesh,
                basePosition: mesh.position.clone(),
                baseRotation: mesh.rotation.clone(),
                baseScale: mesh.scale.clone(),
                pull: new THREE.Vector3(...config.pull),
                phase: index * 1.3
            });
        });
    }

    async _loadModel() {
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        const modelUrls = [
            this._resolveAssetUrl(this.params.modelUrl),
            this._resolveAssetUrl(this.params.fallbackModelUrl)
        ].filter(Boolean);

        if (!modelUrls.length) {
            throw new Error('No modelUrl configured for Track5HeroModel');
        }

        let gltf = null;
        let loadedUrl = null;

        for (const url of modelUrls) {
            try {
                gltf = await loader.loadAsync(url);
                loadedUrl = url;
                break;
            } catch (error) {
                console.warn('[Track5HeroModel] Failed load attempt:', url, error);
            }
        }

        if (!gltf) {
            throw new Error('All Track 5 hero model URLs failed to load');
        }

        if (this._disposed || !this.isMounted()) {
            return;
        }

        const preserveTextures = this.params.preserveTextures === true && /texture\.glb$/i.test(loadedUrl);
        this._applyLoadedScene(gltf.scene, preserveTextures);
    }

    _resolveAssetUrl(assetPath) {
        if (!assetPath) return null;
        if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith('/')) {
            return assetPath;
        }

        const normalized = assetPath.replace(/^\.?\//, '');
        if (window.sonoiteData?.themeUrl) {
            return `${window.sonoiteData.themeUrl}/${normalized}`;
        }

        return `./${normalized}`;
    }

    _applyLoadedScene(scene, preserveTextures) {
        const THREE = this.ctx.THREE;
        const modelRoot = scene;
        const box = new THREE.Box3().setFromObject(modelRoot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetHeight = this.params.targetHeight ?? 8.6;
        const baseScale = targetHeight / Math.max(size.y, 0.001);

        modelRoot.scale.setScalar(baseScale);
        modelRoot.position.set(
            (-center.x * baseScale) + (this.params.offsetX ?? 0),
            (this.params.centerY ?? 1.5) - (center.y * baseScale) + (this.params.offsetY ?? 0),
            (-center.z * baseScale) + (this.params.offsetZ ?? 0.5)
        );
        modelRoot.rotation.set(
            this.params.rotationX ?? 0,
            this.params.rotationY ?? 0,
            this.params.rotationZ ?? 0
        );

        modelRoot.traverse((obj) => {
            if (!obj.isMesh) return;

            const sourceMaterial = obj.material;
            obj.castShadow = false;
            obj.receiveShadow = false;
            obj.frustumCulled = true;
            obj.renderOrder = 8;
            obj.layers.set(HERO_LAYER);
            obj.material = this._buildMaterial(sourceMaterial, preserveTextures);

            if (Array.isArray(sourceMaterial)) {
                sourceMaterial.forEach((mat) => mat?.dispose?.());
            } else {
                sourceMaterial?.dispose?.();
            }
        });

        this._modelRoot = modelRoot;
        this.group.add(modelRoot);
        this._loaded = true;
        this.group.visible = true;
    }

    _buildMaterial(sourceMaterial, preserveTextures) {
        const THREE = this.ctx.THREE;
        const source = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
        const useSourceTextures = preserveTextures === true;
        const baseColor = useSourceTextures
            ? new THREE.Color(0xffffff)
            : new THREE.Color(this.params.baseColor || '#ece6df');

        return new THREE.MeshPhysicalMaterial({
            map: useSourceTextures ? (source?.map || null) : null,
            normalMap: useSourceTextures ? (source?.normalMap || null) : null,
            aoMap: useSourceTextures ? (source?.aoMap || null) : null,
            roughnessMap: useSourceTextures ? (source?.roughnessMap || null) : null,
            metalnessMap: useSourceTextures ? (source?.metalnessMap || null) : null,
            color: baseColor,
            roughness: useSourceTextures ? 0.78 : (this.params.roughness ?? 0.66),
            metalness: useSourceTextures ? 0.0 : (this.params.metalness ?? 0.0),
            clearcoat: useSourceTextures ? 0.04 : (this.params.clearcoat ?? 0.03),
            clearcoatRoughness: useSourceTextures ? 0.80 : (this.params.clearcoatRoughness ?? 0.78),
            emissive: new THREE.Color(this.params.emissiveColor || '#000000'),
            emissiveIntensity: 0.0,
            transparent: true,
            opacity: 0.0,
            depthWrite: true,
            depthTest: true
        });
    }

    setOpacity(opacity) {
        const safe = Number.isFinite(opacity) ? opacity : 0;
        this._authorOpacity = Math.max(0, Math.min(1, safe));
    }

    setPhase(phase) {
        if (!phase || !this.phaseConfig[phase]) return;
        this.currentPhase = phase;
    }

    setScale(scale) {
        const safe = Number.isFinite(scale) ? scale : 1;
        this._targetScale = Math.max(0.1, Math.min(3.0, safe));
    }

    update(audio, dt) {
        if (!this.enabled || !this._loaded || !this._modelRoot) return;

        this._time += dt;

        const phaseName = audio?.voidPhase?.name
            || audio?.voidPhaseName
            || audio?.voidPhase
            || this.currentPhase
            || 'VOID';

        if (this.phaseConfig[phaseName]) {
            this.currentPhase = phaseName;
        }

        const phase = this.phaseConfig[this.currentPhase] || this.phaseConfig.VOID;
        const loudness = Math.min(1, Math.max(0, audio?.loudness ?? 0));
        const bass = Math.min(1, Math.max(0, audio?.bass ?? 0));
        const drift = phase.drift;

        this._targetOpacity = this._authorOpacity * phase.opacity;
        this._currentOpacity += (this._targetOpacity - this._currentOpacity) * this._opacityAlpha;

        const phaseScale = phase.scale * (1.0 + Math.sin(this._time * 0.12) * drift + loudness * 0.006 + bass * 0.004);
        this._currentScale += (phaseScale - this._currentScale) * this._scaleAlpha;
        this.group.scale.setScalar(this._currentScale);

        if (this._proceduralMode) {
            this._updateSpecimenMotion(audio, phase);
        }

        const baseYaw = this.params.groupRotationY ?? 0.0;
        const yawAmplitude = this.currentPhase === 'AWAKENING'
            ? 0.12
            : this.currentPhase === 'WANTING'
                ? 0.10
                : this.currentPhase === 'RELEASE'
                    ? 0.08
                    : 0.06;
        this.group.rotation.y = baseYaw + Math.sin(this._time * 0.045) * yawAmplitude;
        this.group.rotation.x = (this.params.groupRotationX ?? 0.0) + Math.sin(this._time * 0.08) * 0.006;

        const lightMult = phase.light * Math.max(this._currentOpacity, 0.0);
        const keyBase = this._proceduralMode ? 2.85 : 5.2;
        const rimBase = this._proceduralMode ? 2.55 : 2.1;
        const fillBase = this._proceduralMode ? 0.26 : 0.72;
        const ambientBase = this._proceduralMode ? 0.18 : 0.62;
        const backBase = this._proceduralMode ? 0.62 : 1.6;

        if (this.ambientLight) this.ambientLight.intensity = ambientBase * lightMult;
        if (this.fillLight) this.fillLight.intensity = fillBase * lightMult;
        if (this.keyLight) this.keyLight.intensity = (keyBase + loudness * 0.12) * lightMult;
        if (this.rimLight) this.rimLight.intensity = (rimBase + bass * 0.10) * lightMult;
        if (this.backLight) this.backLight.intensity = (backBase + loudness * 0.04) * lightMult;

        this.group.visible = this._currentOpacity > 0.01;

        if (this._materials.length) {
            this._materials.forEach((material) => {
                if (material.userData?.isSpecimenMembrane) return;
                material.opacity = this._currentOpacity;
            });
        } else {
            this._modelRoot.traverse((obj) => {
                if (!obj.isMesh || !obj.material) return;
                obj.material.opacity = this._currentOpacity;
            });
        }
    }

    _updateSpecimenMotion(audio, phase) {
        const loudness = Math.min(1, Math.max(0, audio?.loudness ?? 0));
        const bass = Math.min(1, Math.max(0, audio?.bass ?? 0));
        const mid = Math.min(1, Math.max(0, audio?.mid ?? 0));
        const kick = audio?.beat?.kick ? (audio.beat.kickIntensity ?? 0.5) : 0;
        const safeKick = Math.min(1, Math.max(0, Number.isFinite(kick) ? kick : 0));
        const phasePressure = this.currentPhase === 'WANTING'
            ? 1.18
            : this.currentPhase === 'RELEASE'
                ? 0.86
                : this.currentPhase === 'ERASURE'
                    ? 0.46
                    : 0.68;

        this._pressure += (((bass * 0.72) + (loudness * 0.22) + (mid * 0.06)) * phasePressure - this._pressure) * 0.055;
        this._twitch = Math.max(this._twitch * 0.82, safeKick);

        this._specimenParts.forEach((part) => {
            const twitch = Math.sin(this._time * 18.0 + part.phase) * this._twitch * 0.018 * part.sensitivity;
            const pressure = this._pressure * part.sensitivity;
            part.mesh.position.copy(part.basePosition)
                .addScaledVector(part.pull, pressure)
                .addScaledVector(part.pull, twitch);
            part.mesh.rotation.copy(part.baseRotation);
            part.mesh.rotation.x += Math.sin(this._time * 0.44 + part.phase) * 0.018 * pressure;
            part.mesh.rotation.y += twitch * 2.0;
            part.mesh.rotation.z += Math.sin(this._time * 0.30 + part.phase) * 0.026 * pressure;
        });

        this._membraneParts.forEach((part) => {
            const pull = this._pressure * 1.35;
            const ripple = Math.sin(this._time * 3.2 + part.phase) * 0.045 * (0.35 + pull);
            const twitch = Math.sin(this._time * 24.0 + part.phase) * this._twitch * 0.035;
            part.mesh.position.copy(part.basePosition)
                .addScaledVector(part.pull, pull)
                .addScaledVector(part.pull, twitch);
            part.mesh.rotation.copy(part.baseRotation);
            part.mesh.rotation.x += ripple;
            part.mesh.rotation.z += twitch * 2.2;
            part.mesh.scale.copy(part.baseScale);
            part.mesh.scale.y *= 1.0 + pull * 0.42 + this._twitch * 0.05;
            part.mesh.scale.x *= 1.0 + pull * 0.10;
            if (part.mesh.material) {
                const phaseMembrane = phase.opacity > 0.5 ? 0.22 : 0.14;
                part.mesh.material.opacity = this._currentOpacity * Math.min(0.38, phaseMembrane + pull * 0.18);
            }
        });

        this._metalParts.forEach((part) => {
            part.mesh.rotation.copy(part.baseRotation);
            part.mesh.rotation.z += Math.sin(this._time * 0.22 + part.phase) * this._pressure * 0.022;
            part.mesh.rotation.x += this._twitch * 0.012;
        });
    }

    unmount() {
        this._disposed = true;
        this._modelRoot = null;
        this._materials = [];
        this._specimenParts = [];
        this._membraneParts = [];
        this._metalParts = [];
        this.ambientLight = null;
        this.fillLight = null;
        this.keyLight = null;
        this.rimLight = null;
        this.backLight = null;
        super.unmount();
    }
}

export default Track5HeroModel;
