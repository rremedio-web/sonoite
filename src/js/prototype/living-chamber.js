import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

// The chamber's autonomous life: incommensurate slow cycles, pink-noise key
// flicker, Perlin camera breathing, a seeded gobo on the key light, and a
// near-lens bokeh dust layer. Everything runs off the macro clock and a
// seeded PRNG — never audio — so it stays inside the 25% breathing budget.
// Outputs are multipliers/additives composed at the existing final-assignment
// sites; a per-phase master amplitude lets ERASURE collapse the layer to zero.

const PINK_STEP_SECONDS = 1 / 30;
const MAX_PINK_STEPS_PER_FRAME = 8;

/* eslint-disable no-bitwise -- mulberry32 is integer hash math */
function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/* eslint-enable no-bitwise */

export class LivingChamber {
    constructor({ seed = 1, config = {} } = {}) {
        this.config = config || {};
        this.random = mulberry32(seed);
        this.noise = new ImprovedNoise();
        this.phaseAmplitudes = new Map(Object.entries(this.config.phaseAmplitude || {}));

        const twoPi = Math.PI * 2;
        this.lfoPhases = {
            key: this.random() * twoPi,
            haze: this.random() * twoPi,
            rimHue: this.random() * twoPi,
            dust: this.random() * twoPi
        };
        this.noiseOffsets = {
            x: this.random() * 128,
            y: 64 + this.random() * 128,
            z: 192 + this.random() * 128
        };
        this.pink = { b0: 0, b1: 0, b2: 0, value: 0, accumulator: 0, lastElapsed: null };
        this.amplitude = 0;

        this.outputs = {
            keyMul: 1,
            hazeMul: 1,
            dustMul: 1,
            rimHueShift: 0,
            tempShift: 0,
            camOffset: { x: 0, y: 0, z: 0 }
        };

        this.camera = null;
        this.keyLight = null;
        this.goboTexture = null;
        this.bokehGroup = null;
        this.bokehTexture = null;
        this.bokehSprites = [];
    }

    attach(scene, camera, keyLight) {
        this.camera = camera;
        this.keyLight = keyLight;

        const goboConfig = this.config.gobo || {};
        if (goboConfig.enabled !== false && keyLight) {
            this.goboTexture = this.createGoboTexture(goboConfig.size ?? 256);
            keyLight.map = this.goboTexture;
        }

        const bokehConfig = this.config.bokeh || {};
        const count = bokehConfig.count ?? 12;
        if (count > 0 && camera) {
            this.bokehTexture = this.createBokehTexture();
            this.bokehGroup = new THREE.Group();
            const sizeRange = bokehConfig.sizeRange || [0.06, 0.16];
            const depthRange = bokehConfig.depthRange || [0.5, 1.4];
            for (let i = 0; i < count; i += 1) {
                const material = new THREE.SpriteMaterial({
                    map: this.bokehTexture,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    depthTest: false,
                    blending: THREE.AdditiveBlending
                });
                const sprite = new THREE.Sprite(material);
                const depth = depthRange[0] + this.random() * (depthRange[1] - depthRange[0]);
                const spread = 0.28 * depth;
                sprite.position.set(
                    (this.random() * 2 - 1) * spread,
                    (this.random() * 2 - 1) * spread * 0.7,
                    -depth
                );
                const size = sizeRange[0] + this.random() * (sizeRange[1] - sizeRange[0]);
                sprite.scale.set(size, size, 1);
                sprite.renderOrder = 24;
                sprite.userData.basePosition = sprite.position.clone();
                sprite.userData.driftPhase = this.random() * Math.PI * 2;
                sprite.userData.driftRate = 0.05 + this.random() * 0.08;
                sprite.userData.opacityPhase = this.random() * Math.PI * 2;
                this.bokehSprites.push(sprite);
                this.bokehGroup.add(sprite);
            }
            this.bokehGroup.renderOrder = 24;
            scene.add(this.bokehGroup);
        }

        this.enoPhaseA = this.random() * Math.PI * 2;
        this.enoPhaseB = this.random() * Math.PI * 2;
    }

    createGoboTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.fillStyle = 'rgb(255, 255, 255)';
        context.fillRect(0, 0, size, size);
        const blotches = 10;
        for (let i = 0; i < blotches; i += 1) {
            const x = this.random() * size;
            const y = this.random() * size;
            const radius = size * (0.12 + this.random() * 0.22);
            const darkness = 217 + Math.floor(this.random() * 22);
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${darkness}, ${darkness}, ${darkness}, 0.9)`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, size, size);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.center.set(0.5, 0.5);
        return texture;
    }

    createBokehTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(236, 230, 223, 0.85)');
        gradient.addColorStop(0.55, 'rgba(236, 230, 223, 0.28)');
        gradient.addColorStop(1, 'rgba(236, 230, 223, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    // Stepped off transport elapsed (not wall-clock dt) so a given ?seed= yields
    // the same flicker sequence at the same timestamps on every run.
    stepPinkNoise(elapsed) {
        const pink = this.pink;
        const target = Math.max(0, elapsed);
        const advance = Math.max(0, target - (pink.lastElapsed ?? target));
        pink.lastElapsed = target;
        pink.accumulator = Math.min(pink.accumulator + advance, PINK_STEP_SECONDS * MAX_PINK_STEPS_PER_FRAME);
        while (pink.accumulator >= PINK_STEP_SECONDS) {
            pink.accumulator -= PINK_STEP_SECONDS;
            const white = this.random() * 2 - 1;
            pink.b0 = 0.99765 * pink.b0 + white * 0.099046;
            pink.b1 = 0.963 * pink.b1 + white * 0.2965164;
            pink.b2 = 0.57 * pink.b2 + white * 1.0526913;
            pink.value = (pink.b0 + pink.b1 + pink.b2 + white * 0.1848) * 0.18;
        }
        return pink.value;
    }

    update(elapsed, dt, { phase = '', bokehMul = 1, goboOffsetMul = 1 } = {}) {
        const config = this.config;
        let targetAmplitude = 1;
        if (config.enabled === false) {
            targetAmplitude = 0;
        } else if (this.phaseAmplitudes.has(phase)) {
            targetAmplitude = Number(this.phaseAmplitudes.get(phase));
        }
        this.amplitude += (targetAmplitude - this.amplitude) * Math.min(1, dt / 3);
        const amplitude = this.amplitude;

        const twoPi = Math.PI * 2;
        const cycles = config.cycles || {};
        const keyCycle = Math.sin((elapsed * twoPi) / (cycles.key?.period ?? 103) + this.lfoPhases.key)
            * (cycles.key?.amp ?? 0.05);
        const hazeCycle = Math.sin((elapsed * twoPi) / (cycles.haze?.period ?? 67) + this.lfoPhases.haze)
            * (cycles.haze?.amp ?? 0.12);
        const rimHueCycle = Math.sin((elapsed * twoPi) / (cycles.rimHue?.period ?? 149) + this.lfoPhases.rimHue)
            * (cycles.rimHue?.amp ?? 0.008);
        const dustCycle = Math.sin((elapsed * twoPi) / (cycles.dust?.period ?? 41) + this.lfoPhases.dust)
            * (cycles.dust?.amp ?? 0.15);

        const flickerDepth = config.flicker?.depth ?? 0.03;
        const flicker = this.stepPinkNoise(elapsed) * flickerDepth;

        this.outputs.keyMul = 1 + (keyCycle + flicker) * amplitude;
        this.outputs.hazeMul = 1 + hazeCycle * amplitude;
        this.outputs.dustMul = 1 + dustCycle * amplitude;
        this.outputs.rimHueShift = rimHueCycle * amplitude;

        const breathConfig = config.cameraBreath || {};
        const breathPeriod = breathConfig.period ?? 26;
        const breathAmp = breathConfig.amp || [0.05, 0.03, 0.04];
        const noiseTime = elapsed / breathPeriod;
        this.outputs.camOffset.x = this.noise.noise(noiseTime + this.noiseOffsets.x, this.noiseOffsets.x, 0) * breathAmp[0] * amplitude;
        this.outputs.camOffset.y = this.noise.noise(noiseTime + this.noiseOffsets.y, this.noiseOffsets.y, 0) * breathAmp[1] * amplitude;
        this.outputs.camOffset.z = this.noise.noise(noiseTime + this.noiseOffsets.z, this.noiseOffsets.z, 0) * breathAmp[2] * amplitude;

        // E5 Eno arcs: autonomous warmth drift, breathing budget (docs/qa/AESTHETIC_UX_SYNTHESIS_2026-07-20.md, E5). Depth 0 unless ?enoarcs=1.
        const enoDepth = config.enoTempDepth ?? 0;
        this.outputs.tempShift = enoDepth * (
            0.6 * Math.sin((twoPi * elapsed) / 37 + this.enoPhaseA)
            + 0.4 * Math.sin((twoPi * elapsed) / 59 + this.enoPhaseB)
        ) * amplitude;

        const goboScale = Number.isFinite(goboOffsetMul) && goboOffsetMul > 0 ? goboOffsetMul : 1;
        if (this.goboTexture) {
            const goboConfig = this.config.gobo || {};
            this.goboTexture.rotation = (elapsed * twoPi) / (goboConfig.rotationPeriod ?? 240);
            const driftPeriod = goboConfig.driftPeriod ?? 180;
            this.goboTexture.offset.set(
                Math.sin((elapsed * twoPi) / driftPeriod + this.lfoPhases.key) * 0.05 * goboScale,
                Math.cos((elapsed * twoPi) / (driftPeriod * 1.31) + this.lfoPhases.haze) * 0.04 * goboScale
            );
        }

        if (this.bokehGroup && this.camera) {
            const opacityMax = this.config.bokeh?.opacityMax ?? 0.05;
            const bokehGain = Math.min(1.5, Math.max(0, bokehMul));
            this.bokehSprites.forEach((sprite) => {
                const data = sprite.userData;
                sprite.position.x = data.basePosition.x + Math.sin(elapsed * data.driftRate + data.driftPhase) * 0.03;
                sprite.position.y = data.basePosition.y + Math.cos(elapsed * data.driftRate * 0.8 + data.driftPhase) * 0.02;
                sprite.material.opacity = opacityMax * amplitude * bokehGain
                    * (0.55 + 0.45 * Math.sin(elapsed * 0.35 + data.opacityPhase));
            });
        }
    }

    syncAttachedCamera() {
        if (!this.bokehGroup || !this.camera) {
            return;
        }
        this.camera.updateMatrixWorld();
        this.bokehGroup.position.copy(this.camera.position);
        this.bokehGroup.quaternion.copy(this.camera.quaternion);
    }

    dispose() {
        if (this.keyLight && this.keyLight.map === this.goboTexture) {
            this.keyLight.map = null;
        }
        this.goboTexture?.dispose();
        this.goboTexture = null;
        if (this.bokehGroup) {
            this.bokehGroup.parent?.remove(this.bokehGroup);
            this.bokehSprites.forEach((sprite) => sprite.material?.dispose());
            this.bokehSprites = [];
            this.bokehGroup = null;
        }
        this.bokehTexture?.dispose();
        this.bokehTexture = null;
        this.camera = null;
        this.keyLight = null;
    }
}
