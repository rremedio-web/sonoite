import * as THREE from 'three';

// These textures belong to the experience, not the shared glTF cache.
export async function loadTrack1StageMaterials(themeUrl, renderer) {
    const names = ['Fabric040', 'Plaster001'];
    const kinds = ['Color', 'NormalGL', 'Roughness'];
    const loader = new THREE.TextureLoader();
    const requests = names.flatMap(name => kinds.map(kind =>
        loader.loadAsync(`${themeUrl}/public/assets/materials/track1-stage/${name}_1K-JPG_${kind}.jpg`)));
    const results = await Promise.allSettled(requests);
    const textures = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    const dispose = () => textures.forEach(texture => texture.dispose());
    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
        dispose();
        throw failure.reason;
    }
    textures.forEach((texture, index) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = index % 3 === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        if (index < 3) {
            texture.flipY = false;
            texture.repeat.set(10, 9);
        }
    });
    return {
        dispose,
        apply(cloth, chamber) {
            [cloth.material.map, cloth.material.normalMap, cloth.material.roughnessMap] = textures.slice(0, 3);
            cloth.material.normalScale.set(0.16, 0.16);
            cloth.material.color.set('#56575b');
            cloth.material.sheen = 0.12;
            cloth.material.onBeforeCompile = shader => {
                shader.vertexShader = `varying float vClothHeight;\n${shader.vertexShader.replace(
                    '#include <project_vertex>', 'vClothHeight = transformed.y;\n#include <project_vertex>')}`;
                shader.fragmentShader = `varying float vClothHeight;\n${shader.fragmentShader}`;
                shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
                    #ifdef USE_MAP
                    vec3 clothTexel = texture2D(map, vMapUv).rgb;
                    float clothMottle = dot(clothTexel, vec3(0.2126, 0.7152, 0.0722));
                    diffuseColor.rgb *= 0.88 + 0.24 * clamp(clothMottle * 4.0, 0.0, 1.0);
                    #endif
                    diffuseColor.rgb *= mix(0.3, 1.0, smoothstep(0.03, 0.5, vClothHeight));
                `);
                shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
                    '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.87, 0.99, roughnessFactor);');
            };
            cloth.material.customProgramCacheKey = () => 'track1-matte-fabric-v1';
            cloth.material.needsUpdate = true;
            [chamber.material.map, chamber.material.normalMap, chamber.material.roughnessMap] = textures.slice(3);
            chamber.material.normalScale.set(0.12, 0.12);
            chamber.material.color.set('#696a6d');
            chamber.material.needsUpdate = true;
        }
    };
}
