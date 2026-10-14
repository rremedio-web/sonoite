import fs from 'fs';
import path from 'path';

const EXPERIENCE_PATH = path.join(process.cwd(), 'src/js/prototype/experience.js');

function extractTogglePlaybackBlock(source) {
    const start = source.indexOf('async togglePlayback(');
    if (start < 0) {
        throw new Error('togglePlayback() not found');
    }
    const end = source.indexOf('async seek(ratio)', start);
    if (end < 0) {
        throw new Error('seek(ratio) not found after togglePlayback()');
    }
    return source.slice(start, end);
}

describe('prototype transport resume anchoring', () => {
    it('sets transportStartSeconds only after audio.play() resolves in togglePlayback', () => {
        const source = fs.readFileSync(EXPERIENCE_PATH, 'utf8');
        const block = extractTogglePlaybackBlock(source);
        const playAwaitIndex = block.indexOf('await this.audio.play()');
        const transportIndex = block.indexOf('this.transportStartSeconds = performance.now() / 1000 - desiredStartElapsed');

        expect(playAwaitIndex).toBeGreaterThan(-1);
        expect(transportIndex).toBeGreaterThan(playAwaitIndex);
    });
});
