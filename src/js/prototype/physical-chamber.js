import * as THREE from 'three';

// A continuous receiving surface: floor, rounded return, then an uneven wall.
// The seam is curved geometry, so it survives oblique and wide cameras.
export function createPhysicalChamber({ aftermath = false, surfaceDetail = true } = {}) {
    const profile = [];
    for (let i = 0; i <= 12; i += 1) {
        profile.push([0, 55 - i * 60 / 12]);
    }
    for (let i = 1; i <= 28; i += 1) {
        const angle = i / 28 * Math.PI / 2;
        profile.push([4 * (1 - Math.cos(angle)), -5 - 4 * Math.sin(angle)]);
    }
    for (let i = 1; i <= 10; i += 1) {
        profile.push([4 + i * 2.6, -9]);
    }
    const columns = 80;
    const positions = [];
    const uvs = [];
    let profileDistance = 0;
    let previousProfile = profile[0];
    const indices = [];
    for (const [height, depth] of profile) {
        profileDistance += Math.hypot(height - previousProfile[0], depth - previousProfile[1]);
        previousProfile = [height, depth];
        for (let xIndex = 0; xIndex <= columns; xIndex += 1) {
            const x = -50 + xIndex / columns * 100;
            const rise = THREE.MathUtils.smoothstep(height, 0, 5);
            const relief = rise * (0.24 * Math.sin(x * 0.37 + 0.6)
                + 0.09 * Math.sin(x * 0.81 - height * 0.08));
            positions.push(x, height, depth + relief);
            uvs.push(x / 4, profileDistance / 4);
        }
    }
    for (let row = 0; row < profile.length - 1; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const a = row * (columns + 1) + column;
            const b = a + 1;
            const c = a + columns + 1;
            indices.push(a, b, c, b, c + 1, c);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({
        color: '#303133', roughness: 0.94, metalness: 0,
        envMapIntensity: 0, specularIntensity: 0.16
    });
    const floorAlbedo = { value: 0.16 };
    const residue = { value: 0 };
    material.userData.floorAlbedo = floorAlbedo;
    material.userData.residue = residue;
    if (aftermath) {
        material.clearcoat = 0.000001;
        material.clearcoatRoughness = 0.28;
    }
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uChamberFloorAlbedo = floorAlbedo;
        const varying = 'varying vec3 vChamberPosition;\n';
        shader.vertexShader = varying + shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvChamberPosition = position;'
        );
        shader.fragmentShader = `uniform float uChamberFloorAlbedo;\n${varying}${shader.fragmentShader}`.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            diffuseColor.rgb *= mix(uChamberFloorAlbedo, 1.0, smoothstep(0.0, 4.0, vChamberPosition.y));`
        ).replace(
            '#include <roughnessmap_fragment>',
            surfaceDetail ? `#include <roughnessmap_fragment>
            float chamberPore = fract(sin(dot(floor(vChamberPosition * 115.0),
                vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            roughnessFactor = clamp(roughnessFactor + (chamberPore - 0.5) * 0.06, 0.86, 1.0);` : `#include <roughnessmap_fragment>
            roughnessFactor = mix(0.86, 0.99, roughnessFactor);`
        );
        if (aftermath) {
            shader.uniforms.uFloorResidue = residue;
            shader.fragmentShader = `uniform float uFloorResidue;\n${shader.fragmentShader}`;
            shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
            void main() {
                vec2 wetP = vChamberPosition.xz - vec2(0.96, -0.04);
                float wetAngle = atan(wetP.y, wetP.x);
                float wetEdge = 1.0 + 0.09 * sin(wetAngle * 3.0 + 0.7)
                    + 0.045 * sin(wetAngle * 7.0 - 0.8);
                float wetRadius = mix(0.1, 3.6, uFloorResidue);
                float wetDistance = length(wetP * vec2(0.83, 1.12));
                float wetMask = (1.0 - smoothstep(wetRadius * wetEdge - 0.14,
                    wetRadius * wetEdge + 0.1, wetDistance))
                    * smoothstep(0.0, 0.045, uFloorResidue)
                    * (1.0 - smoothstep(0.02, 0.12, vChamberPosition.y));
            `).replace('#include <color_fragment>', `
                #include <color_fragment>
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.006, 0.007, 0.009), wetMask);
            `).replace('roughnessFactor = clamp(roughnessFactor + (chamberPore - 0.5) * 0.06, 0.86, 1.0);', `
                roughnessFactor = clamp(roughnessFactor + (chamberPore - 0.5) * 0.06, 0.86, 1.0);
                roughnessFactor = mix(roughnessFactor, 0.22, wetMask);
            `).replace('#include <normal_fragment_maps>', `
                #include <normal_fragment_maps>
                vec2 wetLobeA = wetP - vec2(0.7, -0.4);
                vec2 wetLobeB = wetP - vec2(-1.3, 0.8);
                float wetHeight = wetMask * 0.08 * (exp(-dot(wetLobeA, wetLobeA) * 0.6)
                    - 0.7 * exp(-dot(wetLobeB, wetLobeB) * 0.9));
                vec3 wetDx = dFdx(-vViewPosition);
                vec3 wetDy = dFdy(-vViewPosition);
                vec3 wetR1 = cross(wetDy, normal);
                vec3 wetR2 = cross(normal, wetDx);
                float wetDet = dot(wetDx, wetR1);
                vec3 wetGradient = (dFdx(wetHeight) * wetR1 + dFdy(wetHeight) * wetR2)
                    * sign(wetDet) / max(abs(wetDet), 0.0000001);
                normal = normalize(normal - wetGradient);
                nonPerturbedNormal = normal;
            `).replace('#include <lights_physical_fragment>', `
                #include <lights_physical_fragment>
                material.clearcoat = wetMask;
                material.clearcoatRoughness = 0.22;
            `);
        }
    };
    const plasterCacheKey = surfaceDetail ? 'physical-chamber-plaster-v3' : 'physical-chamber-mapped-plaster-v1';
    material.customProgramCacheKey = () => aftermath ? 'physical-chamber-aftermath-v1' : plasterCacheKey;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'physicalChamber';
    mesh.receiveShadow = true;
    return mesh;
}
