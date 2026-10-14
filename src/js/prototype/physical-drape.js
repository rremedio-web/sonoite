import * as THREE from 'three';

// Two September trial drapes, imported by experience.js and parented to the physical chamber
// (physical-chamber.js). Neither is owner-adopted.
//  - createPhysicalDrape(): Track 5 dim cloth study, a static hanging textile behind the relic
//    (`?scene=physical&room=cloth`, usesClothRoomStudy()). See docs/qa/TRACK5_CLOTH_STUDY_2026-09-06.md.
//  - createShadowDrape() + sampleShadowDrapeSettle(): Track 1 Stage shadow receiver (Track 1 with
//    `?proposal=stage`; `&drape=0` hides it; not built under `&setting=reliquary`, which loads
//    weighted-drape.glb instead). One morph from hanging to settled over 316.65-365 s.
//    See docs/qa/shadow-drape-2026-09-07/README.md.

// One settling gesture in the existing hush-to-reveal passage, then a held state.
// Absolute recording time makes reverse seeking restore both cloth and shadow.
export function sampleShadowDrapeSettle(elapsed, reducedMotion = false) {
    if (reducedMotion) {
        return 0;
    }
    return THREE.MathUtils.smoothstep(elapsed, 316.65, 365);
}

export function createShadowDrape() {
    const columns = 144;
    const rows = 128;
    const indices = [];
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const a = row * (columns + 1) + column;
            const b = a + 1;
            const c = a + columns + 1;
            indices.push(a, b, c, b, c + 1, c);
        }
    }
    const buildShape = (settled) => {
        const positions = [];
        const gaussian = value => Math.exp(-value * value);
        for (let row = 0; row <= rows; row += 1) {
            const height = row / rows * 16;
            const grounded = THREE.MathUtils.smoothstep(height, 0, 1.5);
            const lower = 1 - THREE.MathUtils.smoothstep(height, 7, 13);
            for (let column = 0; column <= columns; column += 1) {
                const x = -13 + column / columns * 19;
                // Weight runs diagonally from a high support into an uneven hem.
                // Broad folds carry the shadow; small wrinkles catch the rake.
                const foldX = x + 6.3 - height * 0.66 + 0.012 * height * height
                    - settled * 0.38 * lower * grounded;
                const shoulder = gaussian((foldX + 2.9) / 3.6)
                    * gaussian((height - 5) / 7);
                const fold = 0.85 * gaussian(foldX / 1.35)
                    - 0.72 * gaussian((foldX + 1.65) / 0.72)
                    + 0.42 * gaussian((foldX - 3.2) / 1.8);
                const tension = 0.11 * gaussian((foldX - 0.9) / 0.18)
                    - 0.09 * gaussian((foldX - 2.25) / 0.24)
                    + 0.08 * gaussian((x + 8.8 - height * 0.31) / 0.2);
                const creases = (0.055 * Math.sin(foldX * 8 + height * 0.7)
                    + 0.025 * Math.sin(foldX * 13 - height * 1.8))
                    * gaussian((foldX + 0.7) / 4) * gaussian((height - 3) / 5);
                const hem = 1.6 + 0.5 * gaussian((x + 6) / 2.1)
                    - 0.2 * gaussian((x + 1) / 1.4);
                const depth = -7.1 + 0.7 * shoulder + (fold + tension + creases) * grounded
                    + hem * (1 - grounded);
                const sag = settled * 0.32 * gaussian(foldX / 2.8) * grounded * lower;
                positions.push(x, height + 0.025 - sag, depth);
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    };
    const geometry = buildShape(0);
    const settled = buildShape(1);
    geometry.morphAttributes.position = [settled.attributes.position.clone()];
    geometry.morphAttributes.normal = [settled.attributes.normal.clone()];
    settled.dispose();
    const colors = [];
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
        const contact = 0.25 + 0.75 * THREE.MathUtils.smoothstep(positions.getY(i), 0.025, 1.2);
        colors.push(contact, contact, contact);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshPhysicalMaterial({
        color: '#414244', roughness: 0.96, metalness: 0,
        specularIntensity: 0.08, envMapIntensity: 0, vertexColors: true,
        sheen: 0.16, sheenColor: '#9e9b95', sheenRoughness: 1
    });
    // Object-space yarn remains attached during the morph. Filter the fine weave
    // by pixel footprint so it fades in distant shots instead of sparkling.
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = `varying vec2 vDrapeCoord;\n${  shader.vertexShader.replace(
            '#include <begin_vertex>', '#include <begin_vertex>\nvDrapeCoord = position.xy;'
        )}`;
        shader.fragmentShader = `varying vec2 vDrapeCoord;
            float drapeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float drapeNoise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(drapeHash(i), drapeHash(i + vec2(1, 0)), f.x),
                    mix(drapeHash(i + vec2(0, 1)), drapeHash(i + vec2(1, 1)), f.x), f.y);
            }
            ${shader.fragmentShader}`.replace('void main() {', `void main() {
                vec2 yarn = vDrapeCoord * vec2(170.0, 210.0);
                vec2 yarnFilter = 1.0 - smoothstep(vec2(0.8), vec2(3.0), fwidth(yarn));
                float weave = dot(sin(yarn), yarnFilter) * 0.5;
                float fibre = drapeNoise(vDrapeCoord * vec2(34.0, 4.0));
                float slub = drapeNoise(vDrapeCoord * 5.0);
                float drapeHeight = 0.012 * fibre + 0.018 * slub + 0.0015 * weave;
            `).replace('#include <color_fragment>', `#include <color_fragment>
                diffuseColor.rgb *= 0.87 + 0.1 * slub + 0.05 * fibre + 0.018 * weave;
            `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                vec3 clothDx = dFdx(-vViewPosition), clothDy = dFdy(-vViewPosition);
                vec3 clothR1 = cross(clothDy, normal), clothR2 = cross(normal, clothDx);
                float clothDet = dot(clothDx, clothR1);
                vec3 clothGradient = (dFdx(drapeHeight) * clothR1 + dFdy(drapeHeight) * clothR2)
                    * sign(clothDet) / max(abs(clothDet), 0.0000001);
                normal = normalize(normal - clothGradient);
                nonPerturbedNormal = normal;
            `);
    };
    material.customProgramCacheKey = () => 'shadow-drape-woven-v1';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'shadowDrape';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    return mesh;
}

// A stationary hanging textile with an authored return onto the floor.
// Parent it to the chamber so its hem shares the relic's measured ground height.
export function createPhysicalDrape() {
    const columns = 96;
    const rows = 88;
    const hemRows = 18;
    const positions = [];
    const indices = [];
    const gaussian = value => Math.exp(-value * value);
    for (let row = 0; row <= rows; row += 1) {
        const hemAngle = Math.min(row / hemRows, 1) * Math.PI / 2;
        const height = row <= hemRows
            ? 0.025 + 0.6 * (1 - Math.cos(hemAngle))
            : 0.625 + (row - hemRows) / (rows - hemRows) * 18;
        const depth = row <= hemRows ? -2.6 - 2.2 * Math.sin(hemAngle) : -4.8;
        const foldWeight = THREE.MathUtils.smoothstep(height, 0.025, 1.8);
        for (let column = 0; column <= columns; column += 1) {
            const x = -7 + column / columns * 14;
            const drift = -0.26 * height + 0.4 * Math.sin(height * 0.48);
            // Unequal broad folds avoid the regular pleats of a theatre curtain.
            const folds = 0.9 * gaussian((x + 3.8 + drift) / (0.38 + height * 0.04))
                - 0.7 * gaussian((x + 0.9 + drift * 0.45) / (0.7 + height * 0.02))
                + 0.6 * gaussian((x - 3.1 - drift * 0.3) / 1.2)
                + 0.16 * Math.sin(height * 1.15 + x * 0.6) * Math.exp(-height / 4);
            const hemWave = (1 - foldWeight) * 0.4 * Math.sin(x * 0.9 + 0.4);
            positions.push(x, height, depth + folds * foldWeight + hemWave);
        }
    }
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const a = row * (columns + 1) + column;
            const b = a + 1;
            const c = a + columns + 1;
            indices.push(a, b, c, b, c + 1, c);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({
        color: '#19191c', roughness: 0.78, metalness: 0,
        specularIntensity: 0.12, envMapIntensity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'physicalDrape';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    return mesh;
}
