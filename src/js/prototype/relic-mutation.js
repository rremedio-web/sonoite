import * as THREE from 'three';

const TAR_ROUGHNESS = 0.12;
const TAR_METALNESS = 0.12;
const TAR_CLEARCOAT = 1.0;
const TAR_CLEARCOAT_ROUGHNESS = 0.05;
/** Smallest practical clearcoat to compile USE_CLEARCOAT (Three toggles on value > 0). */
export const CLEARCOAT_SHADER_EPSILON = 1e-6;

export function toGLSLNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return '0.0';
    }
    const text = String(n);
    if (text.includes('.') || /e/i.test(text)) {
        return text;
    }
    return `${text}.0`;
}

export function mutationAmountAt(elapsedSeconds) {
    const t = elapsedSeconds;
    if (t <= 337) {
        return 0;
    }
    if (t >= 510) {
        return 1;
    }
    if (t <= 470) {
        return ((t - 337) / (470 - 337)) * 0.65;
    }
    return 0.65 + ((t - 470) / (510 - 470)) * 0.35;
}

function injectRelicMutationShader(
    material,
    sharedUniforms,
    prevCompile,
    prevCustomProgramCacheKey,
    cinemaSourceMaterial = null
) {
    material.onBeforeCompile = (shader, renderer) => {
        if (prevCompile) {
            prevCompile.call(cinemaSourceMaterial ?? material, shader, renderer);
            if (cinemaSourceMaterial && cinemaSourceMaterial !== material) {
                const cinemaHandle = cinemaSourceMaterial.userData.track5CinemaShader;
                if (cinemaHandle) {
                    material.userData.track5CinemaShader = cinemaHandle;
                }
            }
        }

        shader.uniforms.uRelicMinY = sharedUniforms.uRelicMinY;
        shader.uniforms.uRelicMaxY = sharedUniforms.uRelicMaxY;
        shader.uniforms.uRelicMutate = sharedUniforms.uRelicMutate;
        shader.uniforms.uRelicDripY = sharedUniforms.uRelicDripY;
        shader.uniforms.uRelicNoiseScale = sharedUniforms.uRelicNoiseScale;
        shader.uniforms.uRelicTarDarken = sharedUniforms.uRelicTarDarken;
        shader.uniforms.uRelicTarRoughness = sharedUniforms.uRelicTarRoughness;
        shader.uniforms.uRelicCoatRoughness = sharedUniforms.uRelicCoatRoughness;

        material.userData.relicMutationShader = { uniforms: shader.uniforms };

        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                '#include <common>\nvarying vec3 vRelicWorldPosition;'
            )
            .replace(
                '#include <project_vertex>',
                '#include <project_vertex>\nvRelicWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;'
            );

        const fragmentDecl = [
            '#include <common>',
            'uniform float uRelicMinY;',
            'uniform float uRelicMaxY;',
            'uniform float uRelicMutate;',
            'uniform float uRelicDripY;',
            'uniform float uRelicNoiseScale;',
            'uniform float uRelicTarDarken;',
            'uniform float uRelicTarRoughness;',
            'uniform float uRelicCoatRoughness;',
            'varying vec3 vRelicWorldPosition;',
            'float relicNoise(vec2 p) {',
            `  return fract(sin(dot(p, vec2(${toGLSLNumber(12.9898)}, ${toGLSLNumber(78.233)}))) * ${toGLSLNumber(43758.5453)});`,
            '}'
        ].join('\n');

        const tarMaskBlock = [
            `float relSpan = max(uRelicMaxY - uRelicMinY, ${toGLSLNumber(1e-4)});`,
            'float edge = (vRelicWorldPosition.y - uRelicDripY) / relSpan;',
            `float n = relicNoise(vRelicWorldPosition.xz * uRelicNoiseScale + vRelicWorldPosition.y * ${toGLSLNumber(0.5)});`,
            `float tarMask = uRelicMutate <= ${toGLSLNumber(0)} ? ${toGLSLNumber(0)} : clamp(${toGLSLNumber(1)} - smoothstep(${toGLSLNumber(-0.06)}, ${toGLSLNumber(0.06)}, edge + (n - ${toGLSLNumber(0.5)}) * ${toGLSLNumber(0.12)}), ${toGLSLNumber(0)}, ${toGLSLNumber(1)});`
        ].join('\n');

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', fragmentDecl)
            .replace(
                'void main() {',
                `void main() {\n${tarMaskBlock}`
            )
            .replace(
                '#include <color_fragment>',
                `#include <color_fragment>\ndiffuseColor.rgb *= mix(${toGLSLNumber(1)}, uRelicTarDarken, tarMask);`
            )
            .replace(
                '#include <roughnessmap_fragment>',
                `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uRelicTarRoughness, tarMask);`
            )
            .replace(
                '#include <metalnessmap_fragment>',
                `#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, ${toGLSLNumber(TAR_METALNESS)}, tarMask);`
            )
            .replace(
                '#include <lights_physical_fragment>',
                [
                    '#include <lights_physical_fragment>',
                    '#ifdef USE_CLEARCOAT',
                    `material.clearcoat = mix(material.clearcoat, ${toGLSLNumber(TAR_CLEARCOAT)}, tarMask);`,
                    `material.clearcoatRoughness = mix(material.clearcoatRoughness, uRelicCoatRoughness, tarMask);`,
                    '#endif'
                ].join('\n')
            );
    };

    material.customProgramCacheKey = () => {
        const base = prevCustomProgramCacheKey
            ? prevCustomProgramCacheKey()
            : material.uuid;
        return `${base}-relicmutation-v1`;
    };
    material.needsUpdate = true;
}

function upgradeStandardToPhysical(standard) {
    const physical = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(physical, standard);
    physical.defines = { ...standard.defines, STANDARD: '', PHYSICAL: '' };
    physical.clearcoat = standard.clearcoat ?? 0;
    physical.clearcoatRoughness = standard.clearcoatRoughness ?? 0;
    if (standard.userData?.track5CinemaShader) {
        physical.userData.track5CinemaShader = standard.userData.track5CinemaShader;
    }
    return physical;
}

function ensureClearcoatShaderEpsilon(material) {
    if (!('clearcoat' in material)) {
        return;
    }
    if (!(material.clearcoat > 0)) {
        material.clearcoat = CLEARCOAT_SHADER_EPSILON;
    }
}

function replaceMaterialOnRoot(heroRoot, oldMaterial, newMaterial) {
    if (!heroRoot) {
        return;
    }
    heroRoot.traverse((child) => {
        if (!child.isMesh) {
            return;
        }
        if (Array.isArray(child.material)) {
            let changed = false;
            const next = child.material.map((entry) => {
                if (entry === oldMaterial) {
                    changed = true;
                    return newMaterial;
                }
                return entry;
            });
            if (changed) {
                child.material = next;
            }
            return;
        }
        if (child.material === oldMaterial) {
            child.material = newMaterial;
        }
    });
}

function syncHeroMaterialStateReference(oldMaterial, newMaterial, heroMaterialStates) {
    heroMaterialStates.forEach((state) => {
        if (state.material === oldMaterial) {
            state.material = newMaterial;
        }
    });
}

function collectMaterials(heroRoot, heroMaterialStates) {
    const seen = new Set();
    const list = [];

    heroMaterialStates.forEach((state) => {
        if (state.material && !seen.has(state.material)) {
            seen.add(state.material);
            list.push({ material: state.material, state });
        }
    });

    heroRoot.traverse((child) => {
        if (!child.isMesh) {
            return;
        }
        const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
        meshMaterials.filter(Boolean).forEach((meshMaterial) => {
            if (!seen.has(meshMaterial)) {
                seen.add(meshMaterial);
                list.push({ material: meshMaterial, state: null });
            }
        });
    });

    return list;
}

export function createRelicMutation({ noiseScale = 1.7, tarDarken = 0.35,
    tarRoughness = TAR_ROUGHNESS, coatRoughness = TAR_CLEARCOAT_ROUGHNESS, frontierOvershoot = 0 } = {}) {
    const sharedUniforms = {
        uRelicMinY: { value: 0 },
        uRelicMaxY: { value: 1 },
        uRelicMutate: { value: 0 },
        uRelicDripY: { value: 0 },
        uRelicNoiseScale: { value: noiseScale },
        uRelicTarDarken: { value: tarDarken },
        uRelicTarRoughness: { value: tarRoughness },
        uRelicCoatRoughness: { value: coatRoughness }
    };

    let installed = false;
    let minY = 0;
    let maxY = 1;
    let upgradedCount = 0;
    let heroRootRef = null;
    const entries = [];

    return {
        install(heroRoot, heroMaterialStates) {
            if (!heroRoot || installed) {
                return;
            }

            heroRootRef = heroRoot;
            heroRoot.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(heroRoot);
            minY = bounds.min.y;
            maxY = bounds.max.y;
            sharedUniforms.uRelicMinY.value = minY;
            sharedUniforms.uRelicMaxY.value = maxY;
            sharedUniforms.uRelicDripY.value = minY;

            const states = heroMaterialStates || [];
            const materials = collectMaterials(heroRoot, states);

            materials.forEach(({ material }) => {
                const originalOnBeforeCompile = material.onBeforeCompile;
                const originalCustomProgramCacheKey = material.customProgramCacheKey?.bind(material);
                let targetMaterial = material;
                let originalMaterial = null;

                if (material.isMeshPhysicalMaterial) {
                    // already physical
                } else if (material.isMeshStandardMaterial) {
                    originalMaterial = material;
                    targetMaterial = upgradeStandardToPhysical(material);
                    replaceMaterialOnRoot(heroRoot, material, targetMaterial);
                    syncHeroMaterialStateReference(material, targetMaterial, states);
                    material.dispose();
                    upgradedCount += 1;
                } else {
                    return;
                }

                if (originalMaterial?.userData?.track5CinemaShader) {
                    targetMaterial.userData.track5CinemaShader = originalMaterial.userData.track5CinemaShader;
                }

                ensureClearcoatShaderEpsilon(targetMaterial);

                injectRelicMutationShader(
                    targetMaterial,
                    sharedUniforms,
                    originalOnBeforeCompile,
                    originalCustomProgramCacheKey,
                    originalMaterial
                );

                entries.push({
                    material: targetMaterial,
                    originalMaterial,
                    originalOnBeforeCompile,
                    originalCustomProgramCacheKey
                });
            });

            installed = entries.length > 0;
        },

        update(elapsedSeconds) {
            if (!installed) {
                return;
            }

            const amount = mutationAmountAt(elapsedSeconds);
            sharedUniforms.uRelicMutate.value = amount;
            sharedUniforms.uRelicDripY.value = amount <= 0
                ? minY
                // An overshoot lets the edge band clear the crown, so the coating completes.
                : minY + amount * (1 + frontierOvershoot) * (maxY - minY);
        },

        dispose() {
            if (!installed) {
                return;
            }

            entries.forEach((entry) => {
                const {
                    material,
                    originalMaterial,
                    originalOnBeforeCompile,
                    originalCustomProgramCacheKey
                } = entry;

                const restoreTarget = originalMaterial || material;

                if (originalMaterial) {
                    replaceMaterialOnRoot(heroRootRef, material, originalMaterial);
                    if (material !== originalMaterial) {
                        material.dispose();
                    }
                }

                restoreTarget.onBeforeCompile = originalOnBeforeCompile;
                if (originalCustomProgramCacheKey) {
                    restoreTarget.customProgramCacheKey = originalCustomProgramCacheKey;
                } else {
                    delete restoreTarget.customProgramCacheKey;
                }
                delete restoreTarget.userData.relicMutationShader;
                restoreTarget.needsUpdate = true;
            });

            entries.length = 0;
            installed = false;
            upgradedCount = 0;
            heroRootRef = null;
        },

        getState() {
            return { installed, minY, maxY, upgradedCount };
        }
    };
}
