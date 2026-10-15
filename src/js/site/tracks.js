/**
 * The album's track list for the standalone site (Prompt #249 replaced the WordPress `track` CPT with
 * this file). Plain data with no DOM access, so Node scripts import it too:
 * - ALBUM_TRACKS: all seven tracks and the normalized MP3 name each one has in the gitignored `audio/`
 *   folder (scripts/import-audio.mjs writes those names).
 * - BUILT_FILM_TRACKS: the three tracks with a chamber film, in BUILT_TRACK_CYCLE order
 *   (src/js/prototype/shell.js). site-data.js turns them into `sonoiteData.tracks`;
 *   scripts/runtime-assets.mjs ships their audio and journey data. The ids and durations are the ones
 *   the static export (Prompt #248 and earlier) used.
 * - AUDIO_CONFIG: `sonoiteData.audioConfig`, the AudioManager limits the static export passed.
 */

export const AUDIO_DIR = 'audio';

export const ALBUM_TRACKS = Object.freeze([
    { order: 1, slug: 'sonoite', title: 'Sonoite', audioFile: '01-sonoite.mp3' },
    { order: 2, slug: 'paralisia-do-sono', title: 'Paralisia do sono', audioFile: '02-paralisia-do-sono.mp3' },
    { order: 3, slug: 'o-livro-azul', title: 'O livro azul', audioFile: '03-o-livro-azul.mp3' },
    { order: 4, slug: 'horas-mortas', title: 'Horas mortas', audioFile: '04-horas-mortas.mp3' },
    { order: 5, slug: 'nao-querer-nada', title: 'Não querer nada', audioFile: '05-nao-querer-nada.mp3' },
    { order: 6, slug: 'o-filho', title: 'O filho', audioFile: '06-o-filho.mp3' },
    { order: 7, slug: 'homem-educado', title: 'Homem educado', audioFile: '07-homem-educado.mp3' }
].map((track) => Object.freeze(track)));

/**
 * @param {string} slug
 * @return {Object} The ALBUM_TRACKS entry for the slug.
 */
function albumTrack(slug) {
    const track = ALBUM_TRACKS.find((entry) => entry.slug === slug);
    if (!track) {
        throw new Error(`Unknown album track: ${slug}`);
    }
    return track;
}

export const BUILT_FILM_TRACKS = Object.freeze([
    { ...albumTrack('sonoite'), id: 1, duration: '08:59' },
    { ...albumTrack('horas-mortas'), id: 4, duration: '06:31' },
    { ...albumTrack('nao-querer-nada'), id: 5, duration: '09:24' }
].map((track) => Object.freeze(track)));

export const AUDIO_CONFIG = Object.freeze({
    maxFileSize: 52428800,
    allowedMimeTypes: Object.freeze([
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp4',
        'audio/x-m4a',
        'audio/flac',
        'audio/aac'
    ]),
    maxVolume: 1.0,
    timeoutDuration: 30000,
    analysisTargetFps: 24,
    enableAdvancedAnalysis: false
});
