import * as THREE from 'three';
import { dispose3D } from '../../src/js/utils/dispose3d.js';

describe('dispose3D', () => {
    it('does not throw for nullish or empty roots', () => {
        expect(() => dispose3D(null)).not.toThrow();
        expect(() => dispose3D(undefined)).not.toThrow();
        expect(() => dispose3D({})).not.toThrow();
    });

    it('does not traverse or clear children on fsQuad-like objects', () => {
        const fsQuadLike = {
            _fsQuad: true,
            dispose: jest.fn(),
            remove: jest.fn()
        };

        expect(() => dispose3D(fsQuadLike)).not.toThrow();
        expect(fsQuadLike.remove).not.toHaveBeenCalled();
    });

    it('disposes geometries and materials on an Object3D subtree', () => {
        const root = new THREE.Object3D();
        const child = new THREE.Object3D();
        const geometry = { dispose: jest.fn() };
        const material = { dispose: jest.fn() };
        child.geometry = geometry;
        child.material = material;
        root.add(child);

        dispose3D(root);

        expect(geometry.dispose).toHaveBeenCalled();
        expect(material.dispose).toHaveBeenCalled();
        expect(root.children).toHaveLength(0);
    });
});
