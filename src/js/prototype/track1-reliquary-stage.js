import * as THREE from 'three';

// Track 1 Stage trial, dim reliquary setting, imported by experience.js (opt-in: Track 1 with
// `?proposal=stage&setting=reliquary`, usesTrack1Reliquary()). createTrack1StageResponse() turns analyser
// levels into separate slow light/cloth/air/surface followers (`&response=0` disables them);
// sampleTrack1ReliquaryLight() reshapes the Stage light and advances the key through the 384-459.5 s
// climax (`&climax=0` disables it); prepareWeightedDrape() adopts the cloth from weighted-drape.glb.
// Not owner-adopted. Trial notes: docs/qa/track1-reference-reset-2026-09-08/CLIMAX_AND_MATERIALS.md
// (it supersedes the appearance and audio-to-haze details of TRIAL.md in the same folder).

const bounded = value => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;

// Separate physical response times, fed by the existing analyser, not its hits.
export function createTrack1StageResponse() {
    const values = { light: 0, cloth: 0, air: 0, surface: 0 };
    const reset = () => {
        values.light = 0; values.cloth = 0; values.air = 0; values.surface = 0;
    };
    const follow = (current, target, dt, attack, release) =>
        THREE.MathUtils.lerp(current, target, 1 - Math.exp(-dt / (target > current ? attack : release)));
    return {
        values,
        reset,
        update(levels, deltaTime, active) {
            if (!active) {
                reset();
                return values;
            }
            const dt = Number.isFinite(deltaTime) ? THREE.MathUtils.clamp(deltaTime, 0, 1) : 0;
            const bass = bounded(levels.bassLevel), mid = bounded(levels.midLevel);
            const average = bounded(levels.averageLevel);
            values.light = follow(values.light, bass, dt, 1.5, 4);
            values.cloth = follow(values.cloth, bass, dt, 7, 12);
            values.air = follow(values.air, average, dt, 10, 16);
            values.surface = follow(values.surface, mid, dt, 0.45, 1.8);
            return values;
        }
    };
}

const ramp = (start, end, time) => THREE.MathUtils.smoothstep(time, start, end);

export function sampleTrack1Climax(elapsed, reducedMotion = false, enabled = true) {
    if (!enabled) {
        return { advance: 0, settle: 0, diffusion: 0 };
    }
    return {
        advance: reducedMotion ? 0 : 0.35 * ramp(384.03, 411.5, elapsed) + 0.65 * ramp(411.5, 459.5, elapsed),
        settle: reducedMotion ? 0 : ramp(366.8, 459.5, elapsed),
        diffusion: ramp(366.8, 425.2, elapsed) * (1 - ramp(488.5, 528, elapsed))
    };
}

export function sampleTrack1ReliquaryLight(base, elapsed, response, options = {}) {
    const gate = ramp(36, 75, elapsed) * (1 - ramp(488.5, 510, elapsed));
    const climax = sampleTrack1Climax(elapsed, options.reducedMotion, options.climax !== false);
    const destination = [3.2, 3.25, 2.6];
    const keyPosition = new THREE.Vector3(...base.keyPosition)
        .lerp(new THREE.Vector3(...destination), climax.advance).toArray();
    // Compensate most of the source's approach; retain enough power to reach
    // the receiver around the silhouette as the cone opens during the climax.
    const target = new THREE.Vector3(...base.keyTarget);
    const distanceSquared = position => new THREE.Vector3(...position).distanceToSquared(target);
    const reachCompensation = THREE.MathUtils.lerp(1,
        distanceSquared(keyPosition) / Math.max(0.1, distanceSquared(base.keyPosition)), 0.75);
    keyPosition[0] += response.light * gate * 0.08;
    return { ...base,
        key: base.key * 0.38 * reachCompensation * (1 + response.light * gate * 0.12),
        keyPosition,
        rim: base.rim * 0.6,
        back: base.back * 0.4,
        wall: base.wall * THREE.MathUtils.lerp(0.22, 0.47, climax.advance) * (1 + response.air * gate * 0.08),
        floor: 0.12,
        fog: 0.0065,
        angle: THREE.MathUtils.lerp(0.59, 0.95, climax.advance),
        penumbra: THREE.MathUtils.lerp(0.85, 0.65, climax.advance),
        settle: climax.settle,
        diffusion: (0.28 + response.air * 0.12 + climax.diffusion * 0.16)
            * ramp(36, 85, elapsed) * (1 - ramp(528, 535, elapsed)),
        lightPhase: climax.advance > 0 ? 'shadow-expansion' : base.lightPhase
    };
}

// The loader owns its returned scene until the experience adopts the mesh.
export function prepareWeightedDrape(scene) {
    scene.updateMatrixWorld(true);
    let cloth = null;
    scene.traverse(object => {
        if (object.isMesh && object.name === 'weightedDrape') {
            cloth = object;
        }
    });
    if (!cloth) {
        throw new Error('Weighted cloth asset has no weightedDrape mesh');
    }
    // Preserve morph coordinates by carrying the export transform on the mesh.
    const worldMatrix = cloth.matrixWorld.clone();
    const bounds = new THREE.Box3().setFromObject(cloth);
    cloth.removeFromParent();
    worldMatrix.decompose(cloth.position, cloth.quaternion, cloth.scale);
    cloth.position.y -= bounds.min.y - 0.015;
    cloth.position.x += 3.3;
    cloth.material.dispose();
    cloth.material = new THREE.MeshPhysicalMaterial({ color: '#56575b', roughness: 0.94,
        metalness: 0, specularIntensity: 0.08, envMapIntensity: 0,
        side: THREE.DoubleSide, sheen: 0.08, sheenRoughness: 1 });
    cloth.name = 'weightedDrape';
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    cloth.visible = false;
    return cloth;
}
