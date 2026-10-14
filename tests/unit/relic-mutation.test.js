/* eslint-disable security/detect-object-injection -- GLSL fixture parsing uses bounded string indexes only */
import * as THREE from 'three';
import {
    mutationAmountAt,
    createRelicMutation,
    toGLSLNumber,
    CLEARCOAT_SHADER_EPSILON
} from '../../src/js/prototype/relic-mutation.js';
const CINEMA_CACHE_KEY = 'sonoite-track5-cinema-relic-v3';

function makeStubShader() {
    return {
        uniforms: {},
        vertexShader: '#include <common>\n#include <project_vertex>',
        fragmentShader: [
            '#include <common>',
            'void main() {',
            '#include <color_fragment>',
            '#include <roughnessmap_fragment>',
            '#include <metalnessmap_fragment>',
            '#include <lights_physical_fragment>',
            '}'
        ].join('\n')
    };
}

function injectedMutationGlslLines(source) {
    return source.split('\n').filter((line) => (
        line.includes('tarMask')
        || line.includes('relSpan')
        || (line.includes('relicNoise') && !line.includes('vec2 p'))
        || line.includes('material.clearcoat')
        || line.includes('roughnessFactor')
        || line.includes('metalnessFactor')
        || line.includes('diffuseColor.rgb')
    ));
}

function tokenizeNumericLiterals(text) {
    const tokens = [];
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];
        const startsNumber = (char >= '0' && char <= '9')
            || (char === '-' && next >= '0' && next <= '9');
        if (!startsNumber) {
            continue;
        }
        let end = i + (char === '-' ? 1 : 0);
        while (end < text.length) {
            const part = text[end];
            if (part >= '0' && part <= '9') {
                end += 1;
                continue;
            }
            if (part === '.' && end + 1 < text.length && text[end + 1] >= '0' && text[end + 1] <= '9') {
                end += 1;
                while (end < text.length && text[end] >= '0' && text[end] <= '9') {
                    end += 1;
                }
            }
            break;
        }
        if (text[end] === 'e' || text[end] === 'E') {
            end += 1;
            if (text[end] === '+' || text[end] === '-') {
                end += 1;
            }
            while (end < text.length && text[end] >= '0' && text[end] <= '9') {
                end += 1;
            }
        }
        tokens.push(text.slice(i, end));
        i = end - 1;
    }
    return tokens;
}

function assertShaderNumericLiteralsAreFloat(source) {
    const injected = injectedMutationGlslLines(source).join('\n');
    tokenizeNumericLiterals(injected).forEach((literal) => {
        const hasDecimal = literal.includes('.');
        const hasExponent = literal.indexOf('e') !== -1 || literal.indexOf('E') !== -1;
        expect(hasDecimal || hasExponent).toBe(true);
    });
    expect(injected.includes('mix(material.clearcoat, 1,')).toBe(false);
    expect(injected).toContain('mix(material.clearcoat, 1.0, tarMask)');
}

function parseSmoothstepCalls(source) {
    const calls = [];
    const lines = source.split('\n');
    lines.forEach((line) => {
        const open = line.indexOf('smoothstep(');
        if (open === -1) {
            return;
        }
        const args = line.slice(open + 'smoothstep('.length, line.lastIndexOf(')'));
        const parts = args.split(',').map((part) => part.trim());
        if (parts.length >= 2) {
            calls.push({ edge0: Number(parts[0]), edge1: Number(parts[1]) });
        }
    });
    return calls;
}

describe('toGLSLNumber', () => {
    it('serializes integers and whole floats with a decimal point', () => {
        expect(toGLSLNumber(1)).toBe('1.0');
        expect(toGLSLNumber(1.0)).toBe('1.0');
        expect(toGLSLNumber(0)).toBe('0.0');
        expect(toGLSLNumber(0.12)).toBe('0.12');
        expect(toGLSLNumber(1e-4)).toBe('0.0001');
    });
});

describe('mutationAmountAt', () => {
    it('returns exact ramp and hold values', () => {
        expect(mutationAmountAt(337)).toBe(0);
        expect(mutationAmountAt(300)).toBe(0);
        expect(mutationAmountAt(403.5)).toBeCloseTo(0.325, 6);
        expect(mutationAmountAt(470)).toBeCloseTo(0.65, 6);
        expect(mutationAmountAt(490)).toBeCloseTo(0.825, 6);
        expect(mutationAmountAt(510)).toBe(1);
        expect(mutationAmountAt(600)).toBe(1);
    });
});

describe('createRelicMutation', () => {
    it('upgrades MeshStandardMaterial to physical and preserves map reference', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const originalMap = { isTexture: true, id: 'fake-map' };
        const standard = new THREE.MeshStandardMaterial({ map: originalMap });
        const mesh = new THREE.Mesh(geometry, standard);
        heroRoot.add(mesh);

        const heroMaterialStates = [{
            material: standard,
            baseOpacity: 1,
            baseClearcoat: null,
            baseClearcoatRoughness: null
        }];

        mutation.install(heroRoot, heroMaterialStates);

        expect(mesh.material.isMeshPhysicalMaterial).toBe(true);
        expect(mesh.material.defines.PHYSICAL).toBe('');
        expect(mesh.material.map).toBe(originalMap);
        expect(heroMaterialStates[0].material).toBe(mesh.material);
        expect(mesh.material.clearcoat).toBeGreaterThan(0);
        expect(mesh.material.clearcoat).toBe(CLEARCOAT_SHADER_EPSILON);
        expect(mutation.getState().upgradedCount).toBe(1);
        expect(mutation.getState().installed).toBe(true);
    });

    it('chains an existing onBeforeCompile hook', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const standard = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(geometry, standard);
        heroRoot.add(mesh);

        const prevSpy = jest.fn();
        standard.onBeforeCompile = prevSpy;

        mutation.install(heroRoot, [{ material: standard }]);

        const material = mesh.material;
        const shader = makeStubShader();

        material.onBeforeCompile(shader, {});

        expect(prevSpy).toHaveBeenCalledTimes(1);
        expect(shader.vertexShader).toContain('vRelicWorldPosition');
        expect(shader.fragmentShader).toContain('tarMask');
        expect(material.userData.relicMutationShader.uniforms).toBe(shader.uniforms);
    });

    it('dispose restores upgraded material and original onBeforeCompile', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const standard = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(geometry, standard);
        heroRoot.add(mesh);

        const prevSpy = jest.fn();
        standard.onBeforeCompile = prevSpy;

        mutation.install(heroRoot, [{ material: standard }]);
        const upgraded = mesh.material;
        expect(upgraded.isMeshPhysicalMaterial).toBe(true);

        mutation.dispose();

        expect(mesh.material).toBe(standard);
        expect(mesh.material.isMeshStandardMaterial).toBe(true);
        expect(standard.onBeforeCompile).toBe(prevSpy);
        expect(standard.userData.relicMutationShader).toBeUndefined();
        expect(mutation.getState().installed).toBe(false);
        upgraded.dispose();
    });

    it('update writes shared uniforms without throwing when installed', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshPhysicalMaterial({ clearcoat: 0.2 })
        );
        heroRoot.add(mesh);

        mutation.install(heroRoot, [{ material: mesh.material }]);

        const shader = makeStubShader();
        mesh.material.onBeforeCompile(shader, {});

        mutation.update(470);

        const { uniforms } = mesh.material.userData.relicMutationShader;
        expect(uniforms.uRelicMutate.value).toBeCloseTo(0.65, 6);
        expect(uniforms.uRelicDripY.value).toBeGreaterThan(uniforms.uRelicMinY.value);
    });

    it('seek-back reverts uRelicMutate when timeline moves earlier (time-pure policy)', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial()
        );
        heroRoot.add(mesh);

        mutation.install(heroRoot, [{ material: mesh.material }]);

        const shader = makeStubShader();
        mesh.material.onBeforeCompile(shader, {});

        mutation.update(510);
        expect(mesh.material.userData.relicMutationShader.uniforms.uRelicMutate.value).toBe(1);

        mutation.update(100);
        expect(mesh.material.userData.relicMutationShader.uniforms.uRelicMutate.value).toBe(0);
    });

    it('composes customProgramCacheKey with the original cinema key after standard upgrade', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const standard = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standard);
        heroRoot.add(mesh);

        standard.customProgramCacheKey = () => CINEMA_CACHE_KEY;

        mutation.install(heroRoot, [{ material: standard }]);

        const material = mesh.material;
        expect(material.customProgramCacheKey()).toBe(`${CINEMA_CACHE_KEY}-relicmutation-v1`);
    });

    it('preserves track5CinemaShader on the active material when cinema hook ran on the standard', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const standard = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standard);
        heroRoot.add(mesh);

        const priorHandle = { uniforms: { uSonoiteDamage: { value: 0 } } };
        standard.userData.track5CinemaShader = priorHandle;
        standard.onBeforeCompile = (shader) => {
            standard.userData.track5CinemaShader = shader;
        };
        standard.customProgramCacheKey = () => CINEMA_CACHE_KEY;

        const heroMaterialStates = [{ material: standard }];
        mutation.install(heroRoot, heroMaterialStates);

        const active = mesh.material;
        expect(active.isMeshPhysicalMaterial).toBe(true);
        expect(heroMaterialStates[0].material).toBe(active);

        const shader = makeStubShader();
        active.onBeforeCompile(shader, {});

        expect(active.userData.track5CinemaShader).toBe(shader);
        expect(heroMaterialStates[0].material.userData.track5CinemaShader).toBe(shader);
    });

    it('generated fragment shader uses float literals and valid smoothstep edges', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const standard = new THREE.MeshStandardMaterial();
        heroRoot.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standard));

        mutation.install(heroRoot, [{ material: standard }]);
        const material = heroRoot.children[0].material;
        const shader = makeStubShader();
        material.onBeforeCompile(shader, {});

        assertShaderNumericLiteralsAreFloat(shader.fragmentShader);
        expect(shader.fragmentShader).toContain('mix(material.clearcoat, 1.0, tarMask)');

        parseSmoothstepCalls(shader.fragmentShader).forEach(({ edge0, edge1 }) => {
            expect(edge0).toBeLessThan(edge1);
        });
    });

    it('update advances uniforms without mutating material clearcoat after install epsilon', () => {
        const mutation = createRelicMutation();
        const heroRoot = new THREE.Group();
        const standard = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standard);
        heroRoot.add(mesh);

        mutation.install(heroRoot, [{ material: standard }]);
        const material = mesh.material;
        const shader = makeStubShader();
        material.onBeforeCompile(shader, {});

        const clearcoatAtInstall = material.clearcoat;
        expect(clearcoatAtInstall).toBeGreaterThan(0);
        expect(clearcoatAtInstall).toBe(CLEARCOAT_SHADER_EPSILON);

        mutation.update(350);
        mutation.update(470);

        expect(material.clearcoat).toBe(clearcoatAtInstall);
        expect(material.userData.relicMutationShader.uniforms.uRelicMutate.value).toBeGreaterThan(0);
    });
});
