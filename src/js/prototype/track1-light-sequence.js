import * as THREE from 'three';

// Track 1 Stage trial, light sequence, imported by experience.js (opt-in: Track 1 with
// `?proposal=stage&light=sequence`, usesTrack1LightSequence()). Moves the proposal key through
// approach / conceal / reveal / rest around the 316.65 s hush (286-384 s) and adds a fixed
// shadow-casting flag near the source. Pure function of track time. Not owner-adopted.
// Trial notes: docs/qa/track1-light-sequence-2026-09-07/README.md.

const ramp = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b);

// A single phrase-scale interruption around the existing 316.65s hush.
// Both holds are stationary; the new position survives into the existing ending.
export function sampleTrack1LightSequence(base, elapsed, reducedMotion = false) {
    if (reducedMotion) {
        return { ...base, keyPosition: elapsed >= 125 ? [4, 5.2, 4.5] : base.keyPosition,
            occluder: false, lightPhase: 'still' };
    }
    const weight = ramp(286, 302, elapsed);
    const x = 2 + 1.15 * ramp(286, 310, elapsed)
        + 0.9 * ramp(310, 316.65, elapsed) + 1.15 * ramp(330, 384, elapsed);
    const keyPosition = [THREE.MathUtils.lerp(base.keyPosition[0], x, weight),
        THREE.MathUtils.lerp(base.keyPosition[1], 5.8, weight),
        THREE.MathUtils.lerp(base.keyPosition[2], 4.5, weight)];
    const wallWeight = ramp(310, 316.65, elapsed) * (1 - ramp(350, 384, elapsed));
    let lightPhase = 'sweep';
    if (elapsed >= 286 && elapsed < 316.65) {
        lightPhase = 'approach';
    } else if (elapsed >= 316.65 && elapsed < 330) {
        lightPhase = 'conceal';
    } else if (elapsed >= 330 && elapsed < 384) {
        lightPhase = 'reveal';
    } else if (elapsed >= 384) {
        lightPhase = 'rest';
    }
    return { ...base, keyPosition,
        // Keep the receiving surface legible while the key is physically interrupted.
        wall: base.wall * (1 - 0.25 * wallWeight),
        occluder: weight > 0 && elapsed < 535, lightPhase };
}

export function createTrack1LightOccluder() {
    // A fixed, opaque lighting flag near the source. It blocks part of the key's
    // path, not the viewer's view of the relic. It neither emits light nor moves.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.42, 0.05),
        new THREE.MeshBasicMaterial({ color: '#030405' }));
    mesh.name = 'track1LightOccluder';
    mesh.position.set(3.62, 5.44, 4);
    mesh.rotation.z = -0.22;
    mesh.castShadow = true;
    mesh.visible = false;
    return mesh;
}
