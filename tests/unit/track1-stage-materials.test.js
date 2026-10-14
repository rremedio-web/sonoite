import * as THREE from 'three';
import { loadTrack1StageMaterials } from '../../src/js/prototype/track1-stage-materials.js';

describe('Track 1 texture ownership', () => {
    afterEach(() => jest.restoreAllMocks());

    it('releases late successful downloads as well as early ones when one map fails', async () => {
        const textures = Array.from({ length: 5 }, () => new THREE.Texture());
        const disposed = textures.map(texture => jest.spyOn(texture, 'dispose'));
        let completeLate;
        const late = new Promise(resolve => { completeLate = resolve; });
        jest.spyOn(THREE.TextureLoader.prototype, 'loadAsync')
            .mockResolvedValueOnce(textures[0])
            .mockRejectedValueOnce(new Error('missing normal map'))
            .mockResolvedValueOnce(textures[1])
            .mockResolvedValueOnce(textures[2])
            .mockResolvedValueOnce(textures[3])
            .mockReturnValueOnce(late);
        const result = loadTrack1StageMaterials('/theme', { capabilities: { getMaxAnisotropy: () => 4 } });
        const rejected = expect(result).rejects.toThrow('missing normal map');
        completeLate(textures[4]);
        await rejected;
        disposed.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    });
});
