import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { AudioManager } from '../audio-manager.js';
import { loadJourneyByTrackId } from '../visuals/journey-loader.js';
import { dispose3D, disposeComposer } from '../utils/dispose3d.js';
import { ReliquaryShell, BUILT_TRACK_CYCLE } from './shell.js';
import { LivingChamber } from './living-chamber.js';
import { createPhysicalChamber } from './physical-chamber.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createPhysicalDrape, createShadowDrape, sampleShadowDrapeSettle } from './physical-drape.js';
import { createTrack5TarPassageCamera } from './track5-tar-passage.js';
import { resolveCinematicProposal, createProposalCamera, sampleProposalLight } from './cinematic-proposals.js';
import { loadTrack1StageMaterials } from './track1-stage-materials.js';
import { TRACK4_LEDGER_ARMS, applyTrack4Ledger, createTrack4LedgerPanel, applyTrack4Edit } from './track4-ledger.js';
import { applyTrack5Ledger, applyTrack5LedgerCamera } from './track5-ledger.js';
import { createTrack1StageResponse, sampleTrack1ReliquaryLight, prepareWeightedDrape } from './track1-reliquary-stage.js';
import { createTrack1LightOccluder, sampleTrack1LightSequence } from './track1-light-sequence.js';
import { createFillMeter } from './fill-meter.js';
import { createCommitReactions } from './commit-reactions.js';
import { createAudioAccentDetector } from './audio-accent-detector.js';
import { sampleTrack5SurfaceResponse } from './track5-surface-response.js';
import { createShotDirector, shouldTakeCamera } from './shot-director.js';
import { createLightRigResolver, godRayIntensityAt, bokehArrivalAt } from './light-rigs.js';
import { createRelicMutation, mutationAmountAt } from './relic-mutation.js';
import { resolveFilmFlags, readVigilParam, resolveVigilEnabled, readSodiumParam, resolveSodiumEnabled } from './film-flags.js';
import {
    DEFAULT_HERO_MODEL_PATHS,
    resolveHeroModelCandidates,
    shouldPreserveHeroModelMaterials,
    shouldSkipTrack5CinemaMaterialDecoration
} from './hero-model-urls.js';
import { createRecutLightScore } from './recut-light-score.js';
import { createPlateauRimCommit } from './recut-plateau-commit.js';
import { EVENT_TYPE } from './chamber-constants.js';
import { SONOITE_CHAMBER_FILM_TIMELINE } from './films/sonoite.js';
import { HORAS_MORTAS_CHAMBER_FILM_TIMELINE } from './films/horas-mortas.js';
import {
    RELIQUARY_OBSERVED_TRACK5_TIMELINE,
    TRACK5_FILM_TARGET,
    TRACK5_FILM_FLOWER_HEAD,
    TRACK5_FILM_DIRECTOR_CAMERA,
    TRACK5_CHAMBER_FILM_TIMELINE,
    TRACK5_RECUT_DIRECTOR_CAMERA,
    TRACK5_RECUT_FILM_TIMELINE
} from './films/nao-querer-nada.js';
import { createRecutAtmosphere } from './recut-atmosphere.js';
import { createRecutLehr } from './recut-lehr.js';
import { createRecutListen, RECUT_LISTEN_COMMIT_CONFIG } from './recut-listen.js';
import { createRecutVisualScore } from './recut-visual-score.js';
import { createRecutPhraseLight, resolveRecutPhraseLightFrame } from './recut-phrase-light.js';
import { createTrack5RecutCameraConfig } from './track5-recut-seams.js';
import { createChamberPracticals, samplePracticalWarmWrap, sampleFlameFlicker, sampleConsecrationHazeArc, filterPracticalsForQuality, countLitPracticals, authoredAmberHexForKelvin } from './chamber-practicals.js';
import { createChamberSodium, sampleSodiumHazeArc, isSodiumAtmosphereBlackout, sampleSodiumLightLevel, sampleSodiumState, sampleIrisExposureOvershoot, SODIUM_V3_GRAIN_BLACKOUT_LEVEL, SODIUM_V3_GRAIN_BLACKOUT_MAX, SODIUM_COLOR_RUN, applySodiumDiffuseWrap } from './chamber-sodium.js';

const DEFAULT_PROOF_DURATION_SECONDS = 96;
const DEFAULT_TRACK_SLUG = 'nao-querer-nada';
const DEFAULT_ENTRY_TRACK_SLUG = 'sonoite';
const TRACK_DEFAULT_VARIANT = Object.freeze({
    'sonoite': 'sonoite-cinema',
    'horas-mortas': 'horas-mortas-cinema',
    'nao-querer-nada': 'track5-cinema'
});

// Unbuilt or unknown slugs fall back to the entry film for both metadata and
// variant, so audio and film can never come from different tracks.
const resolveEntryTrackSlug = (urlParams) => {
    const requested = (urlParams.get('track') || '').trim().toLowerCase();
    return BUILT_TRACK_CYCLE.includes(requested) ? requested : DEFAULT_ENTRY_TRACK_SLUG;
};

const resolveDefaultChamberVariant = (urlParams) => {
    const trackSlug = resolveEntryTrackSlug(urlParams);
    if (Object.prototype.hasOwnProperty.call(TRACK_DEFAULT_VARIANT, trackSlug)) {
        return TRACK_DEFAULT_VARIANT[trackSlug];
    }
    return 'track5-cinema';
};
const DEFAULT_PALETTE = {
    primary: '#000000',
    secondary: '#151927',
    accent: '#32395e',
    fog: '#10131d'
};

const EMPTY_EVENT_PARAMS = Object.freeze({});

const DEFAULT_EVENT_PRESETS = Object.freeze({
    camera_push: {
        attackSeconds: 1.6,
        holdSeconds: 5.8,
        releaseSeconds: 6.8,
        params: EMPTY_EVENT_PARAMS
    },
    camera_reset: {
        attackSeconds: 0.22,
        holdSeconds: 5.4,
        releaseSeconds: 7.6,
        params: EMPTY_EVENT_PARAMS
    },
    post_crush: {
        attackSeconds: 0.12,
        holdSeconds: 0.08,
        releaseSeconds: 0.42,
        params: {
            vignetteDarknessBoost: 0.26,
            vignetteOffsetDrop: 0.16,
            vignetteSoftnessDrop: 0.08,
            bloomDrop: 0.04,
            grainBoost: 0.018
        }
    },
    material_reveal: {
        attackSeconds: 0.6,
        holdSeconds: 5.8,
        releaseSeconds: 8.2,
        params: {
            roughnessDelta: -0.22,
            clearcoatDelta: 0.24,
            clearcoatRoughnessDelta: -0.24,
            sheenDelta: 0.08,
            envMapIntensityDelta: 0.1,
            rimBoost: 0.18
        }
    },
    room_open: {
        attackSeconds: 0.28,
        holdSeconds: 5.6,
        releaseSeconds: 7.8,
        params: {
            thresholdBoost: 0.18,
            supportBoost: 0.22,
            pressureRelief: 0.08,
            shellOpacityBoost: 0.06,
            floorOpacityBoost: 0.055,
            fillBoost: 0.038,
            backBoost: 0.032,
            vignetteDarknessLift: 0.12,
            vignetteOffsetLift: 0.11,
            vignetteSoftnessLift: 0.08
        }
    },
    room_tighten: {
        attackSeconds: 0.3,
        holdSeconds: 6.0,
        releaseSeconds: 7.2,
        params: {
            thresholdBoost: 0.08,
            supportDrop: 0.08,
            pressureBoost: 0.16,
            shellOpacityDrop: 0.02,
            floorOpacityDrop: 0.035,
            fillDrop: 0.012,
            keyAngleTighten: 0.08,
            vignetteDarknessBoost: 0.14,
            vignetteOffsetDrop: 0.12,
            vignetteSoftnessDrop: 0.05
        }
    },
    black_gap: {
        attackSeconds: 0.12,
        holdSeconds: 0.08,
        releaseSeconds: 0.22,
        params: {
            maskOpacity: 1.0
        }
    }
});

const DARKNESS_MODE = Object.freeze({
    SACRISTY: 'sacristy',
    VEILED: 'veiled'
});

const DUST_PATTERN = Object.freeze({
    TIGHT: 'tight',
    CURTAIN: 'curtain',
    RESIDUE: 'residue',
    CONE: 'cone',
    VOLUME: 'volume'
});

const DUST_MOTION = Object.freeze({
    STILL: 'still',
    DRIFT: 'drift',
    FALL: 'fall',
    CONE: 'cone',
    BROWNIAN: 'brownian'
});

/**
 * Deterministic −1…1 jitter for dust lattice placement (hash idiom).
 *
 * @param {number} index Particle index.
 * @param {number} axis  Axis channel (0–3).
 * @return {number} Signed jitter sample.
 */
function hashDustAxis(index, axis) {
    const seed = index * 17.13 + axis * 3.71 + 0.318;
    const n = Math.sin(seed * 12.9898 + axis * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
}

/**
 * Fill dust positions on a 3D lattice with hash-jittered offsets.
 *
 * @param {Float32Array} positions
 * @param {Float32Array} alphas
 * @param {number}       dustCount
 * @param {Object}       lattice
 * @param {number}       heroOffsetX
 */
function fillDustLatticePositions(positions, alphas, dustCount, lattice, heroOffsetX) {
    const spacing = lattice.spacing ?? 0.38;
    const jitterFrac = lattice.jitter ?? 0.15;
    const jitterAmp = spacing * jitterFrac;
    const origin = lattice.origin || [heroOffsetX, 1.4, -1.2];
    const cols = lattice.cols ?? Math.max(2, Math.ceil(Math.cbrt(dustCount * 1.35)));
    const rows = lattice.rows ?? Math.max(2, Math.ceil(Math.sqrt(dustCount / cols)));
    const layers = lattice.layers ?? Math.max(1, Math.ceil(dustCount / (cols * rows)));
    let placed = 0;

    for (let layer = 0; layer < layers && placed < dustCount; layer += 1) {
        for (let row = 0; row < rows && placed < dustCount; row += 1) {
            for (let col = 0; col < cols && placed < dustCount; col += 1) {
                const i3 = placed * 3;
                const cx = (col - (cols - 1) * 0.5) * spacing;
                const cy = (row - (rows - 1) * 0.5) * spacing;
                const cz = (layer - (layers - 1) * 0.5) * spacing;
                /* eslint-disable security/detect-object-injection -- fixed lattice raster */
                positions[i3] = origin[0] + cx + hashDustAxis(placed, 0) * jitterAmp;
                positions[i3 + 1] = origin[1] + cy + hashDustAxis(placed, 1) * jitterAmp;
                positions[i3 + 2] = origin[2] + cz + hashDustAxis(placed, 2) * jitterAmp;
                alphas[placed] = 0.28 + Math.abs(hashDustAxis(placed, 3)) * 0.42;
                /* eslint-enable security/detect-object-injection */
                placed += 1;
            }
        }
    }
}


const QUALITY_MODE = Object.freeze({
    SAFE: 'safe',
    BALANCED: 'balanced',
    CINEMA: 'cinema',
    HIGH: 'high'
});

const DEFAULT_HERO_CONFIG = {
    ...DEFAULT_HERO_MODEL_PATHS,
    preserveTextures: false,
    targetHeight: 5.9,
    centerY: 1.85,
    offsetX: 1.12,
    offsetY: 0.22,
    offsetZ: 0.0,
    rotationY: 0.18,
    baseColor: '#d7ccbf',
    roughness: 0.8,
    metalness: 0.02,
    clearcoat: 0.0,
    clearcoatRoughness: 0.9,
    sheen: 0.0,
    sheenRoughness: 0.55,
    sheenColor: '#1b1f2a',
    envMapIntensity: 0.1,
    iridescence: 0.0,
    iridescenceIOR: 1.16
};

const DEFAULT_CHAMBER_CONFIG = {
    darknessMode: DARKNESS_MODE.SACRISTY,
    environmentIntensity: 0.004,
    proofDurationSeconds: DEFAULT_PROOF_DURATION_SECONDS,
    camera: {
        baseFov: 40,
        xDrift: 0.02,
        yDrift: 0.015,
        zPush: 0.42,
        orbitRadius: 0.0,
        orbitSpeed: 0.0,
        basePosition: [-1.56, 2.44, 10.95],
        target: [1.08, 2.22, -0.12],
        score: []
    },
    post: {
        baseExposure: 0.84,
        bloomStrength: 0.14,
        bloomRadius: 0.42,
        bloomThreshold: 0.9,
        grainIntensity: 0.026,
        gradeMix: 0.0,
        gradeTint: [1, 1, 1],
        gradeLift: [0, 0, 0],
        gradeSaturation: 1.0,
        gradeContrast: 1.0,
        grainFinishGain: 0.02,
        grainTemperatureGain: 0.01,
        grainPunctuationGain: 0.014,
        grainLongArcGain: 0.014,
        grainAccentGain: 0.008,
        bloomFinishGain: 0.075,
        bloomTemperatureGain: 0.028,
        bloomPunctuationGain: 0.042,
        bloomLongArcGain: 0.024,
        bloomAccentGain: 0.04
    },
    ground: {
        width: 7.2,
        height: 5.05,
        opacity: 0.18,
        airGain: 0.06,
        pressureGain: 0.11
    },
    air: {
        hazeBase: 0.0,
        hazeAirGain: 0.0,
        hazePressureGain: 0.0,
        hazeAudioGain: 0.0,
        accentBase: 0.0,
        accentAirGain: 0.0,
        accentPressureGain: 0.0,
        dustBase: 0.018,
        dustAirGain: 0.03,
        dustPressureGain: 0.022,
        dustAudioGain: 0.006,
        dustSize: 0.036,
        dustCount: 56
    },
    lighting: {
        keyBase: 2.5,
        keyPressureGain: 0.56,
        keyAudioDrop: 0.11,
        rimBase: 1.55,
        rimPressureGain: 0.58,
        rimAccentGain: 0.52,
        fillBase: 0.06,
        fillPressureGain: 0.03,
        score: []
    },
    variant: {
        key: 'hard-light',
        label: 'hard light study',
        shellOpacityBase: 0.08,
        shellOpacityGain: 0.2,
        shellBreathGain: 0.02,
        shellAccentGain: 0.08,
        shellOpacityMin: 0.08,
        shellOpacityMax: 0.38,
        shellPosition: [1.04, 1.88, -5.2],
        shellScale: [1, 1],
        shellThreshold: 0.0,
        shellCenterVoid: 0.0,
        shellAsymmetry: 0.0,
        floorOpacityMin: 0.05,
        floorOpacityMax: 0.28,
        floorIdleMix: 0.82,
        floorOpenScale: 1.08,
        floorTightScale: 0.92,
        floorTextureStops: null,
        spinGateStart: 48,
        spinGateEnd: 92,
        dustPattern: DUST_PATTERN.TIGHT,
        dustMotion: DUST_MOTION.STILL,
        dustIdlePresence: 0.06,
        dustStartedPresence: 0.08,
        dustIdleMix: 0.06,
        dustColor: '#e5dfd8',
        frontHazeMax: 0.0,
        frontHazeIdleOpacity: 0.0,
        frontHazeTexture: 'none',
        frontHazePosition: [2.55, 1.95, 3.2],
        frontHazeScale: [5.4, 11.8],
        hazeSpriteBaseOpacity: 0.0,
        hazeSpriteIdleOpacity: 0.0,
        hazeSpriteAirGain: 0.0,
        hazeSpritePressureGain: 0.0,
        hazeSprites: null,
        boundaryWings: null,
        keyAngleOpen: 0.46,
        keyAngleTight: 0.31,
        keyPenumbraOpen: 0.42,
        keyPenumbraTight: 0.18,
        vignetteDarkBase: 0.74,
        vignetteDarkPressureGain: 0.18,
        vignetteDarkClarityGain: 0.1,
        vignetteDarkFinishGain: 0.03,
        vignetteOffsetOpen: 0.92,
        vignetteOffsetTight: 0.82,
        vignetteSoftnessBase: 0.42,
        vignetteSoftnessFinishGain: 0.05,
        vignetteSoftnessPressureGain: 0.03,
        dustPercussiveGain: 0,
        hazePercussiveGain: 0,
        percussivePreIgnitionCap: 0.6,
        dustLatticeSpacing: null,
        dustLatticeJitter: 0.15,
        dustLatticeOrigin: null,
        percussiveHazeSprite: null
    },
    stage3: {
        accentIntensity: 0.483,
        accentDecaySeconds: 0.8,
        breathingAmount: 0.34,
        reactivityRevealStartSeconds: 15,
        reactivityRevealEndSeconds: 42,
        phaseResponse: {
            smoothingSlow: 1.1,
            smoothingFast: 3.4,
            audioDriveMin: 0.42,
            audioDriveMax: 1.18,
            supportDriveMin: 0.46,
            supportDriveMax: 1.24
        },
        materialResponse: {
            midThreshold: 0.4,
            midAttackSeconds: 2.0,
            midReleaseSeconds: 4.0,
            iridescenceMax: 0.0,
            iridescenceIORMin: 1.1,
            iridescenceIORMax: 1.28
        },
        reliquaryBreathing: {
            autonomous: 0.07,
            autonomousRate: 0.18,
            shellLead: 1.0,
            beamFollow: 0.58,
            poolLag: 0.34,
            frameLag: 0.2,
            memoryEcho: 0.18,
            echoDecay: 0.7,
            unfurlDuration: 38
        },
        roomPressureBeats: [
            { atSeconds: 0, value: 0.78 },
            { atSeconds: 10, value: 0.72 },
            { atSeconds: 30, value: 0.44 },
            { atSeconds: 42, value: 0.86 },
            { atSeconds: 60, value: 0.52 },
            { atSeconds: 75, value: 0.74 },
            { atSeconds: 96, value: 0.46 }
        ],
        musicalAnchors: [],
        eventBeats: [],
        phaseCurves: {
            VOID: [
                { at: 0.0, air: 0.1, pressure: 0.16, warmth: 0.06, finish: 0.2, veil: 1.0, clarity: 0.52 },
                { at: 0.14, air: 0.22, pressure: 0.26, warmth: 0.12, finish: 0.28, veil: 0.96, clarity: 0.6 },
                { at: 0.36, air: 0.34, pressure: 0.38, warmth: 0.22, finish: 0.38, veil: 0.86, clarity: 0.7 },
                { at: 0.68, air: 0.5, pressure: 0.52, warmth: 0.34, finish: 0.5, veil: 0.66, clarity: 0.82 },
                { at: 1.0, air: 0.62, pressure: 0.64, warmth: 0.48, finish: 0.58, veil: 0.48, clarity: 0.9 }
            ],
            AWAKENING: [
                { at: 0.0, air: 0.46, pressure: 0.34, warmth: 0.24, finish: 0.34, veil: 0.46, clarity: 0.84 },
                { at: 0.5, air: 0.34, pressure: 0.46, warmth: 0.36, finish: 0.4, veil: 0.24, clarity: 0.9 },
                { at: 1.0, air: 0.24, pressure: 0.58, warmth: 0.48, finish: 0.48, veil: 0.08, clarity: 0.95 }
            ],
            WANTING: [
                { at: 0.0, air: 0.2, pressure: 0.48, warmth: 0.16, finish: 0.34, veil: 0.08, clarity: 0.9 },
                { at: 0.5, air: 0.28, pressure: 0.72, warmth: 0.18, finish: 0.42, veil: 0.04, clarity: 0.94 },
                { at: 1.0, air: 0.32, pressure: 0.88, warmth: 0.22, finish: 0.52, veil: 0.02, clarity: 0.96 }
            ],
            RELEASE: [
                { at: 0.0, air: 0.18, pressure: 0.34, warmth: 0.1, finish: 0.28, veil: 0.12, clarity: 0.82 },
                { at: 0.5, air: 0.12, pressure: 0.22, warmth: 0.08, finish: 0.24, veil: 0.22, clarity: 0.74 },
                { at: 1.0, air: 0.16, pressure: 0.28, warmth: 0.1, finish: 0.26, veil: 0.18, clarity: 0.78 }
            ],
            ERASURE: [
                { at: 0.0, air: 0.12, pressure: 0.42, warmth: 0.06, finish: 0.32, veil: 0.12, clarity: 0.68 },
                { at: 0.5, air: 0.08, pressure: 0.64, warmth: 0.02, finish: 0.38, veil: 0.06, clarity: 0.56 },
                { at: 1.0, air: 0.02, pressure: 0.92, warmth: 0.0, finish: 0.48, veil: 0.0, clarity: 0.4 }
            ]
        }
    }
};

const HARD_LIGHT_VARIANT = {
    label: 'hard light study',
    hero: {
        baseColor: '#b9ab9f',
        roughness: 0.84,
        metalness: 0.0,
        clearcoat: 0.06,
        clearcoatRoughness: 0.38,
        sheen: 0.12,
        sheenRoughness: 0.48,
        sheenColor: '#181d27',
        envMapIntensity: 0.045
    },
        chamber: {
            darknessMode: DARKNESS_MODE.SACRISTY,
            environmentIntensity: 0.018,
            camera: {
                xDrift: 0.012,
                yDrift: 0.008,
                zPush: 0.34,
                basePosition: [-2.22, 2.5, 11.7],
                target: [1.04, 2.16, -0.22],
                score: [
                    {
                        atSeconds: 0,
                        position: [-2.22, 2.5, 11.7],
                        target: [1.04, 2.16, -0.22],
                        driftScale: 0.35
                    },
                    {
                        atSeconds: 30,
                        transitionSeconds: 8,
                        position: [-1.86, 2.46, 11.08],
                        target: [1.02, 2.18, -0.14],
                        driftScale: 0.46
                    },
                    {
                        atSeconds: 58,
                        transitionSeconds: 6,
                        position: [-2.78, 2.62, 11.96],
                        target: [0.72, 2.12, -0.48],
                        driftScale: 0.22
                    },
                    {
                        atSeconds: 76,
                        transitionSeconds: 7,
                        position: [-1.54, 2.38, 10.42],
                        target: [1.14, 2.2, -0.04],
                        driftScale: 0.42
                    },
                    {
                        atSeconds: 90,
                        transitionSeconds: 5,
                        position: [-2.08, 2.48, 11.14],
                        target: [1.02, 2.18, -0.16],
                        driftScale: 0.28
                    }
                ]
            },
        post: {
            bloomStrength: 0.13,
            grainIntensity: 0.022
        },
        ground: {
            width: 6.1,
            height: 4.3,
            opacity: 0.08,
            airGain: 0.02,
            pressureGain: 0.06
        },
        air: {
            hazeBase: 0.0,
            hazeAirGain: 0.0,
            hazePressureGain: 0.0,
            hazeAudioGain: 0.0,
            dustBase: 0.04,
            dustAirGain: 0.09,
            dustPressureGain: 0.05,
            dustAudioGain: 0.01,
            dustSize: 0.048,
            dustCount: 48
        },
        lighting: {
            keyBase: 3.02,
            keyPressureGain: 0.82,
            keyAudioDrop: 0.06,
            rimBase: 0.96,
            rimPressureGain: 0.3,
            rimAccentGain: 0.22,
            fillBase: 0.018,
            fillPressureGain: 0.012
        },
        variant: {
            key: 'hard-light',
            label: 'hard light study',
            shellOpacityBase: 0.03,
            shellOpacityGain: 0.14,
            shellBreathGain: 0.045,
            shellAccentGain: 0.05,
            shellOpacityMin: 0.035,
            shellOpacityMax: 0.2,
            shellPosition: [1.0, 1.88, -7.4],
            shellScale: [0.86, 0.98],
            floorOpacityMin: 0.02,
            floorOpacityMax: 0.08,
            floorIdleMix: 0.62,
            floorOpenScale: 0.88,
            floorTightScale: 0.72,
            spinGateStart: 118,
            spinGateEnd: 230,
            dustPattern: DUST_PATTERN.CONE,
            dustMotion: DUST_MOTION.CONE,
            dustColor: '#d8d1ca',
            dustIdlePresence: 0.42,
            dustStartedPresence: 1.0,
            dustIdleMix: 0.52,
            dustOpacityMax: 0.2,
            keyAngleOpen: 0.34,
            keyAngleTight: 0.12,
            keyPenumbraOpen: 0.32,
            keyPenumbraTight: 0.12,
            vignetteDarkBase: 0.9,
            vignetteDarkPressureGain: 0.3,
            vignetteDarkClarityGain: 0.03,
            vignetteDarkFinishGain: 0.035,
            vignetteOffsetOpen: 0.82,
            vignetteOffsetTight: 0.64,
            vignetteSoftnessBase: 0.18,
            vignetteSoftnessFinishGain: 0.03,
            vignetteSoftnessPressureGain: 0.01
        },
        stage3: {
            breathingAmount: 0.42,
            reactivityRevealStartSeconds: 10,
            reactivityRevealEndSeconds: 36,
            reliquaryBreathing: {
                autonomous: 0.18,
                autonomousRate: 0.14,
                shellLead: 1.0,
                beamFollow: 0.32,
                poolLag: 0.14,
                frameLag: 0.06,
                memoryEcho: 0.24,
                echoDecay: 0.52,
                unfurlDuration: 38
            },
            roomPressureBeats: [
                { atSeconds: 0, value: 0.88 },
                { atSeconds: 10, value: 0.82 },
                { atSeconds: 22, value: 0.42 },
                { atSeconds: 30, value: 1.0 },
                { atSeconds: 38, value: 0.52 },
                { atSeconds: 58, value: 0.8 },
                { atSeconds: 80, value: 0.6 },
                { atSeconds: 96, value: 0.5 }
            ]
        }
    }
};

const CHAMBER_VARIANTS = {
    'hard-light': HARD_LIGHT_VARIANT,
    veiled: {
        label: 'veiled chamber',
        hero: {
            baseColor: '#d9d1c6',
            roughness: 0.7,
            metalness: 0.0,
            clearcoat: 0.0,
            envMapIntensity: 0.22
        },
        chamber: {
            darknessMode: DARKNESS_MODE.VEILED,
            environmentIntensity: 0.065,
            fogDensity: 0.038,
            camera: {
                xDrift: 0.058,
                yDrift: 0.046,
                zPush: 0.72,
                basePosition: [-1.18, 2.34, 11.95],
                target: [0.94, 2.34, 0.08]
            },
            post: {
                bloomStrength: 0.28,
                bloomRadius: 0.56,
                bloomThreshold: 0.84,
                grainIntensity: 0.034
            },
            ground: {
                width: 9.4,
                height: 6.8,
                opacity: 0.23,
                airGain: 0.14,
                pressureGain: 0.14
            },
            air: {
                hazeBase: 0.078,
                hazeAirGain: 0.11,
                hazePressureGain: 0.07,
                hazeAudioGain: 0.012,
                dustBase: 0.09,
                dustAirGain: 0.14,
                dustPressureGain: 0.07,
                dustAudioGain: 0.018,
                dustSize: 0.06,
                dustCount: 180
            },
            lighting: {
                keyBase: 1.98,
                keyPressureGain: 0.28,
                keyAudioDrop: 0.08,
                rimBase: 1.84,
                rimPressureGain: 0.28,
                rimAccentGain: 0.3,
                fillBase: 0.38,
                fillPressureGain: 0.16
            },
            variant: {
                key: 'veiled',
                label: 'veiled chamber',
                shellOpacityBase: 0.08,
                shellOpacityGain: 0.14,
                shellBreathGain: 0.04,
                shellAccentGain: 0.06,
                shellOpacityMin: 0.03,
                shellOpacityMax: 0.32,
                shellPosition: [1.52, 2.14, -8.6],
                shellScale: [1.9, 1.42],
                floorOpacityMin: 0.14,
                floorOpacityMax: 0.34,
                floorIdleMix: 1.0,
                floorOpenScale: 1.28,
                floorTightScale: 1.12,
                spinGateStart: 146,
                spinGateEnd: 240,
                dustPattern: DUST_PATTERN.CURTAIN,
                dustMotion: DUST_MOTION.FALL,
                dustColor: '#edf1f6',
                dustIdlePresence: 1.12,
                dustStartedPresence: 2.2,
                dustIdleMix: 0.76,
                frontHazeMax: 0.32,
                frontHazeIdleOpacity: 0.16,
                frontHazeTexture: 'portal',
                frontHazePosition: [0.36, 2.1, 2.25],
                frontHazeScale: [11.4, 12.8],
                frontHazeColor: '#dfe6ef',
                frontHazeAirGain: 0.06,
                frontHazeAccentGain: 0.024,
                frontHazeDriftX: 0.12,
                frontHazeDriftY: 0.08,
                hazeSpriteBaseOpacity: 0.34,
                hazeSpriteIdleOpacity: 0.38,
                hazeSpriteAirGain: 0.58,
                hazeSpritePressureGain: 0.2,
                hazeSpriteOpacityMax: 0.58,
                curtainLanes: 5,
                curtainSpread: 0.78,
                hazeSprites: [
                    { position: [-2.6, 2.18, -4.8], scale: [17.4, 22.6], color: '#c5d1de', texture: 'haze' },
                    { position: [3.8, 2.02, -5.6], scale: [21.2, 24.8], color: '#9eaec3', texture: 'haze' },
                    { position: [0.92, 1.36, -2.6], scale: [12.4, 18.6], color: '#eef2f7', texture: 'accent' }
                ],
                keyAngleOpen: 0.96,
                keyAngleTight: 0.62,
                keyPenumbraOpen: 0.96,
                keyPenumbraTight: 0.72,
                vignetteDarkBase: 0.38,
                vignetteDarkPressureGain: 0.12,
                vignetteDarkClarityGain: 0.08,
                vignetteDarkFinishGain: 0.04,
                vignetteOffsetOpen: 1.16,
                vignetteOffsetTight: 1.0,
                vignetteSoftnessBase: 0.86,
                vignetteSoftnessFinishGain: 0.1,
                vignetteSoftnessPressureGain: 0.01
            },
            stage3: {
                breathingAmount: 0.52,
                reactivityRevealStartSeconds: 4,
                reactivityRevealEndSeconds: 18,
                reliquaryBreathing: {
                    autonomous: 0.12
                },
                roomPressureBeats: [
                    { atSeconds: 0, value: 0.36 },
                    { atSeconds: 10, value: 0.32 },
                    { atSeconds: 30, value: 0.18 },
                    { atSeconds: 42, value: 0.52 },
                    { atSeconds: 60, value: 0.28 },
                    { atSeconds: 75, value: 0.46 },
                    { atSeconds: 96, value: 0.22 }
                ]
            }
        }
    },
    residue: deepMerge(HARD_LIGHT_VARIANT, {
        label: 'residue chamber',
        hero: {
            baseColor: '#9f8f85',
            roughness: 0.92,
            envMapIntensity: 0.08
        },
        chamber: {
            environmentIntensity: 0.008,
            camera: {
                xDrift: 0.042,
                yDrift: 0.028,
                zPush: 0.62,
                basePosition: [-3.1, 2.48, 9.95],
                target: [0.38, 2.16, -0.64]
            },
            post: {
                bloomRadius: 0.44,
                grainIntensity: 0.03
            },
            ground: {
                width: 7.8,
                height: 5.2,
                opacity: 0.12,
                airGain: 0.04,
                pressureGain: 0.12
            },
            air: {
                dustBase: 0.09,
                dustAirGain: 0.12,
                dustPressureGain: 0.08,
                dustAudioGain: 0.016,
                dustSize: 0.06,
                dustCount: 120
            },
            lighting: {
                keyBase: 2.62,
                keyPressureGain: 0.86,
                keyAudioDrop: 0.1,
                rimBase: 0.74,
                rimPressureGain: 0.46,
                rimAccentGain: 0.42,
                fillBase: 0.02,
                fillPressureGain: 0.008
            },
            variant: {
                key: 'residue',
                label: 'residue chamber',
                shellOpacityBase: 0.12,
                shellOpacityGain: 0.28,
                shellBreathGain: 0.06,
                shellAccentGain: 0.16,
                shellOpacityMin: 0.08,
                shellOpacityMax: 0.5,
                shellPosition: [-1.24, 1.68, -4.5],
                shellScale: [0.72, 1.34],
                floorOpacityMin: 0.03,
                floorOpacityMax: 0.18,
                floorIdleMix: 0.74,
                dustPattern: DUST_PATTERN.RESIDUE,
                dustMotion: DUST_MOTION.DRIFT,
                dustColor: '#cab6a2',
                dustIdlePresence: 1.0,
                dustStartedPresence: 1.9,
                dustIdleMix: 0.72,
                keyAngleOpen: 0.28,
                keyAngleTight: 0.12,
                keyPenumbraOpen: 0.18,
                keyPenumbraTight: 0.04,
                vignetteDarkBase: 0.9,
                vignetteDarkPressureGain: 0.28,
                vignetteDarkClarityGain: 0.08,
                vignetteDarkFinishGain: 0.02,
                vignetteOffsetOpen: 0.8,
                vignetteOffsetTight: 0.6,
                vignetteSoftnessBase: 0.2,
                vignetteSoftnessFinishGain: 0.04,
                vignetteSoftnessPressureGain: 0.03
            },
            stage3: {
                breathingAmount: 0.36,
                reactivityRevealStartSeconds: 10,
                reactivityRevealEndSeconds: 28,
                reliquaryBreathing: {
                    autonomous: 0.09
                },
                roomPressureBeats: [
                    { atSeconds: 0, value: 0.82 },
                    { atSeconds: 10, value: 0.78 },
                    { atSeconds: 30, value: 0.72 },
                    { atSeconds: 42, value: 0.94 },
                    { atSeconds: 60, value: 0.74 },
                    { atSeconds: 75, value: 0.86 },
                    { atSeconds: 96, value: 0.66 }
                ]
            }
        }
    })
};


CHAMBER_VARIANTS['reliquary-observed'] = deepMerge(HARD_LIGHT_VARIANT, {
    label: 'reliquary, observed',
    timelineTrackSlugs: ['nao-querer-nada'],
    hero: {
        baseColor: '#cbc0b3',
        roughness: 0.68,
        clearcoat: 0.2,
        clearcoatRoughness: 0.52,
        sheen: 0.22,
        sheenRoughness: 0.52,
        sheenColor: '#3a3545',
        envMapIntensity: 0.24,
        iridescence: 0.01,
        iridescenceIOR: 1.2
    },
        chamber: {
        environmentIntensity: 0.056,
        fogDensity: 0.022,
        fogColor: '#0a0c14',
        camera: {
            basePosition: [-3.24, 2.76, 13.6],
            target: [0.84, 2.14, -0.48],
            baseFov: 50,
            xDrift: 0.032,
            yDrift: 0.022
        },
        post: {
            baseExposure: 0.92,
            bloomStrength: 0.14,
            bloomRadius: 0.38,
            bloomThreshold: 0.78,
            grainIntensity: 0.028,
            gradeMix: 0.72,
            gradeTint: [0.88, 0.94, 1.08],
            gradeLift: [0.003, 0.004, 0.008],
            gradeSaturation: 0.9,
            gradeContrast: 1.02,
            grainFinishGain: 0.008,
            grainTemperatureGain: 0.003,
            grainPunctuationGain: 0.005,
            grainLongArcGain: 0.002,
            grainAccentGain: 0.002,
            bloomFinishGain: 0.05,
            bloomTemperatureGain: 0.012,
            bloomPunctuationGain: 0.028,
            bloomLongArcGain: 0.008,
            bloomAccentGain: 0.016
        },
        ground: {
            width: 14.4,
            height: 10.8,
            opacity: 0.34,
            airGain: 0.04,
            pressureGain: 0.08
        },
        air: {
            dustBase: 0.052,
            dustAirGain: 0.068,
            dustPressureGain: 0.05,
            dustAudioGain: 0.025,
            dustSize: 0.038,
            dustCount: 128
        },
        lighting: {
            keyBase: 2.76,
            keyPressureGain: 0.64,
            keyAudioDrop: 0.069,
            rimBase: 1.48,
            rimPressureGain: 0.42,
            rimAccentGain: 0.368,
            fillBase: 0.086,
            fillPressureGain: 0.04
        },
        variant: {
            key: 'reliquary-observed',
            label: 'reliquary, observed',
            shellOpacityBase: 0.05,
            shellOpacityGain: 0.16,
            shellBreathGain: 0.04,
            shellAccentGain: 0.069,
            shellOpacityMin: 0.04,
            shellOpacityMax: 0.32,
            shellPosition: [0.92, 2.08, -9.6],
            shellScale: [1.78, 1.3],
            shellThreshold: 1.0,
            shellCenterVoid: 0.74,
            shellAsymmetry: -0.08,
            floorOpacityMin: 0.18,
            floorOpacityMax: 0.4,
            floorIdleMix: 0.82,
            floorOpenScale: 1.16,
            floorTightScale: 0.86,
            floorTextureStops: [
                [0, 'rgba(214, 220, 234, 0.74)'],
                [0.18, 'rgba(132, 142, 164, 0.38)'],
                [0.38, 'rgba(54, 60, 78, 0.18)'],
                [0.72, 'rgba(8, 10, 16, 0.06)'],
                [1, 'rgba(0, 0, 0, 0)']
            ],
            dustPattern: DUST_PATTERN.VOLUME,
            dustMotion: DUST_MOTION.DRIFT,
            dustColor: '#c8d0dd',
            dustIdlePresence: 0.26,
            dustStartedPresence: 0.42,
            dustIdleMix: 0.46,
            dustOpacityMax: 0.1,
            boundaryWings: [],
            gazeWall: {
                filaments: 42,
                samplesPerFilament: 26,
                baseOpacity: 0.062,
                opacityGain: 0.28,
                size: 0.056,
                color: '#8ba0cf',
                xNear: -7.2,
                xFar: -4.0,
                zNear: -1.8,
                zFar: -14.2,
                yMin: -1.9,
                yMax: 5.8
            },
            voidWitnesses: {
                filaments: 5,
                samplesPerFilament: 14,
                baseOpacity: 0.008,
                opacityGain: 0.05,
                size: 0.056,
                color: '#c8d7f7',
                xNear: 6.0,
                xFar: 7.1,
                zNear: -3.8,
                zFar: -13.0,
                yMin: -1.2,
                yMax: 4.8
            },
            aisleField: {
                rows: 64,
                columns: 14,
                baseOpacity: 0.046,
                opacityGain: 0.24,
                size: 0.038,
                color: '#9fb7df',
                zNear: 2.1,
                zFar: -11.4,
                widthNear: 7.8,
                widthFar: 0.9,
                y: -2.12
            },
            hazePlume: {
                count: 760,
                baseOpacity: 0.0,
                opacityGain: 0.2,
                size: 0.052,
                color: '#adc0ea',
                xCenter: -3.0,
                yCenter: 4.6,
                zCenter: -7.0
            },
            allowSacristyHaze: true,
            frontHazeMax: 0.16,
            frontHazeIdleOpacity: 0.03,
            frontHazeTexture: 'aperture',
            frontHazePosition: [-3.4, 2.58, 1.26],
            frontHazeScale: [16.4, 15.8],
            frontHazeColor: '#7f93ba',
            frontHazeAirGain: 0.046,
            frontHazeAccentGain: 0.016,
            frontHazeDriftX: 0.07,
            frontHazeDriftY: 0.05,
            hazeSpriteBaseOpacity: 0.08,
            hazeSpriteIdleOpacity: 0.04,
            hazeSpriteAirGain: 0.08,
            hazeSpritePressureGain: 0.04,
            hazeSpriteOpacityMax: 0.14,
            hazeSprites: [
                { position: [-5.6, 2.5, -7.8], scale: [21.8, 23.8], color: 'hazeSecondary', texture: 'haze' },
                { position: [-3.3, 5.0, -6.8], scale: [12.6, 12.2], color: '#8ea3ce', texture: 'accent' }
            ],
            keyAngleOpen: 0.42,
            keyAngleTight: 0.18,
            keyPenumbraOpen: 0.28,
            keyPenumbraTight: 0.1,
            vignetteDarkBase: 0.68,
            vignetteDarkPressureGain: 0.22,
            vignetteDarkClarityGain: 0.04,
            vignetteDarkFinishGain: 0.025,
            vignetteOffsetOpen: 1.08,
            vignetteOffsetTight: 0.82,
            vignetteSoftnessBase: 0.44,
            vignetteSoftnessFinishGain: 0.02,
            vignetteSoftnessPressureGain: 0.008
        }
    },
    timeline: RELIQUARY_OBSERVED_TRACK5_TIMELINE
});

CHAMBER_VARIANTS['track5-cinema'] = deepMerge(CHAMBER_VARIANTS['reliquary-observed'], {
    label: 'Track 5 cinema chamber',
    displayLabel: 'Não querer nada',
    timelineTrackSlugs: ['nao-querer-nada'],
    hero: {
        roughness: 0.54,
        clearcoat: 0.26,
        clearcoatRoughness: 0.42,
        sheen: 0.18,
        envMapIntensity: 0.36,
        iridescence: 0.0
    },
    chamber: {
        environmentIntensity: 0.028,
        fogDensity: 0.022,
        fogColor: '#080a12',
        living: {
            enabled: true,
            cycles: {
                key: { period: 103, amp: 0.075 },
                haze: { period: 67, amp: 0.18 },
                rimHue: { period: 149, amp: 0.012 },
                dust: { period: 41, amp: 0.22 }
            },
            flicker: { depth: 0.045 },
            cameraBreath: { amp: [0.075, 0.045, 0.06], period: 26 },
            bokeh: {
                count: 12,
                sizeRange: [0.06, 0.16],
                opacityMax: 0.075,
                depthRange: [0.5, 1.4]
            },
            gobo: { enabled: true, size: 256, rotationPeriod: 240, driftPeriod: 180 },
            phaseAmplitude: {
                VOID: 0.8,
                AWAKENING: 1,
                WANTING: 0.7,
                RELEASE: 1,
                ERASURE: 0
            }
        },
        ground: {
            width: 15.2,
            height: 11.4,
            opacity: 0.42,
            airGain: 0.05,
            pressureGain: 0.09
        },
        air: {
            hazeBase: 0.05,
            hazeAirGain: 0.08,
            hazePressureGain: 0.04,
            hazeAudioGain: 0.014
        },
        post: {
            baseExposure: 0.8,
            bloomStrength: 0.08,
            bloomRadius: 0.34,
            bloomThreshold: 0.82,
            grainIntensity: 0.024,
            gradeMix: 0.32,
            gradeTint: [0.86, 0.9, 0.98],
            gradeLift: [0.004, 0.004, 0.006],
            gradeSaturation: 0.82,
            gradeContrast: 1.16,
            // Per-phase color identity: WITHHOLD = cold steel, RELEASE = the one warm
            // admission, ERASURE = ash drain. Recurring windows revisit their grade,
            // giving the track a returning color refrain.
            gradePhases: {
                VOID:      { mix: 0.5,  tint: [0.82, 0.86, 0.97], lift: [0.004, 0.004, 0.008], saturation: 0.62, contrast: 1.2 },
                AWAKENING: { mix: 0.42, tint: [0.92, 0.92, 0.97], lift: [0.003, 0.003, 0.005], saturation: 0.85, contrast: 1.12 },
                WANTING:   { mix: 0.58, tint: [0.78, 0.85, 1.04], lift: [0.0, 0.002, 0.01],    saturation: 0.7,  contrast: 1.3 },
                RELEASE:   { mix: 0.36, tint: [1.0, 0.96, 0.93],  lift: [0.004, 0.003, 0.002], saturation: 0.95, contrast: 1.05 },
                ERASURE:   { mix: 0.62, tint: [0.86, 0.87, 0.9],  lift: [0.0, 0.0, 0.0],       saturation: 0.45, contrast: 1.18 }
            },
            plate: {
                strength: 0.12,
                idleStrength: 0.0,
                revealSeconds: 10,
                erasureBoost: 0.72
            }
        },
        lighting: {
            keyBase: 1.42,
            keyPressureGain: 0.48,
            keyAudioDrop: 0.092,
            rimBase: 1.18,
            rimPressureGain: 0.34,
            rimAccentGain: 0.253,
            backBase: 1.15,
            backPressureGain: 0.34,
            backCoolColor: '#8ea3d4',
            fillBase: 0.012,
            fillPressureGain: 0.012
        },
        variant: {
            key: 'track5-cinema',
            label: 'Track 5 cinema chamber',
            shellOpacityBase: 0.05,
            shellOpacityGain: 0.14,
            shellOpacityMax: 0.28,
            floorOpacityMin: 0.14,
            floorOpacityMax: 0.38,
            dustIdlePresence: 0.2,
            dustStartedPresence: 0.36,
            dustOpacityMax: 0.1,
            hazeSpriteBaseOpacity: 0.06,
            hazeSpriteIdleOpacity: 0.03,
            hazeSpriteOpacityMax: 0.12,
            frontHazeMax: 0.18,
            frontHazeIdleOpacity: 0.036,
            frontHazeAirGain: 0.052,
            frontHazeAccentGain: 0.021,
            vignetteDarkBase: 0.76,
            vignetteDarkPressureGain: 0.26,
            vignetteOffsetOpen: 1.0,
            vignetteOffsetTight: 0.72,
            vignetteSoftnessBase: 0.34
        }
    },
    timeline: TRACK5_CHAMBER_FILM_TIMELINE
});

// Gate 1 doctrine probes — blind A/B variants reached via ?probe=A-D (see
// resolveProbeVariant). Each deepMerges track5-cinema and moves exactly one
// doctrinal lever; values deliberately overshoot for live judgment.
CHAMBER_VARIANTS['track5-probe-bleach'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'probe',
    timeline: {
        stage3: {
            // The authored POST_CRUSH sits on the same second; without removing it
            // the owner judges a composite envelope instead of the strike.
            suppressEventIds: ['track5_serrated_peak'],
            extraEventBeats: [
                {
                    id: 'probe_bleach_317',
                    type: EVENT_TYPE.BLEACH,
                    atSeconds: 317,
                    durationSeconds: 2.4,
                    attackSeconds: 0.18,
                    releaseSeconds: 1.6,
                    intensity: 1.0,
                    punctuationBoost: 0.345,
                    room: {
                        backLightDelta: 0.5,
                        fillDelta: 0.04
                    },
                    post: {
                        exposureDelta: 0.85,
                        bloomDelta: 0.22,
                        vignetteDarknessDelta: -0.3,
                        grainDelta: 0.01
                    }
                }
            ]
        }
    }
});

CHAMBER_VARIANTS['track5-probe-relic'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'probe',
    chamber: {
        heroLaw: {
            damageScale: 2.2,
            erasureScale: 1.2,
            afterimageScale: 1.7,
            forensicScale: 1.9
        }
    }
});

CHAMBER_VARIANTS['track5-probe-eno'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'probe',
    chamber: {
        living: {
            cycles: {
                key: { period: 103, amp: 0.105 }
            },
            phaseAmplitude: {
                VOID: 0.5,
                AWAKENING: 0.6,
                WANTING: 0.45,
                RELEASE: 1.7,
                ERASURE: 0
            }
        }
    }
});

// ── RELEASE2 A/B: two philosophies for the dead 197s (337–534s) ──────────────
// Both inherit track5-cinema and share an IDENTICAL 0–337 timeline (incl. the new
// VOID opening cue @24 that kills the 35s static open). They diverge ONLY in the
// RELEASE2 window, so the owner judges the treatment, not incidental drift.
// Neither touches a frozen value (grain floor / plate erasureBoost / gradePhases
// palette) — only camera, lighting weights, beats, commit density, living amp,
// and grade TIMING move. Reached via ?variant=track5-cinema-fill / -hush.

// FILL — Grok's engagement read: break the hold into three chapters with new
// compositions, a back-lit silhouette beat, a re-admission of light, denser
// committed reactions (both RELEASE windows), and a snappier grade so each
// boundary reads as an event.
CHAMBER_VARIANTS['track5-cinema-fill'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'RELEASE2 — engagement (fill)',
    chamber: {
        post: { gradeSettleSeconds: 1.8 },
        living: { phaseAmplitude: { RELEASE: 1.15 } },
        commitReactions: {
            minIntervalSeconds: 16,
            activeWindows: [{ start: 135, end: 198 }, { start: 337, end: 534 }]
        }
    },
    timeline: {
        camera: {
            director: {
                enabled: false
            },
            score: [
                { atSeconds: 0, position: [-3.65, 2.54, 12.2], target: [0.94, 2.04, -0.34], driftScale: 0.035, fov: 45 },
                { atSeconds: 24, transitionSeconds: 12, position: [-3.42, 2.5, 11.62], target: [0.97, 2.05, -0.3], driftScale: 0.033, fov: 44 },
                { atSeconds: 42, transitionSeconds: 7, position: [-3.68, 2.56, 12.08], target: [0.92, 2.05, -0.36], driftScale: 0.028, fov: 46 },
                { atSeconds: 64, transitionSeconds: 9, position: [-3.0, 2.42, 10.4], target: [1.0, 2.08, -0.18], driftScale: 0.05, fov: 41 },
                { atSeconds: 135, transitionSeconds: 10, position: [-3.72, 2.58, 11.76], target: [0.9, 2.06, -0.38], driftScale: 0.03, fov: 47 },
                { atSeconds: 198, transitionSeconds: 9, position: [-2.62, 2.36, 10.28], target: [1.04, 2.06, -0.08], driftScale: 0.035, fov: 41 },
                { atSeconds: 246, transitionSeconds: 8, position: [-2.26, 2.28, 10.02], target: [1.02, 2.04, 0.02], driftScale: 0.02, fov: 39 },
                { atSeconds: 317, transitionSeconds: 4, position: [-2.04, 2.24, 9.72], target: [1.04, 2.0, 0.04], driftScale: 0.01, fov: 38 },
                { atSeconds: 337, transitionSeconds: 9, position: [-2.88, 2.42, 10.94], target: [0.94, 2.04, -0.22], driftScale: 0.018, fov: 43 },
                { atSeconds: 385, transitionSeconds: 30, position: [-1.5, 2.28, 9.9], target: [1.02, 2.04, -0.06], driftScale: 0.028, fov: 40 },
                { atSeconds: 432, transitionSeconds: 26, position: [-0.35, 2.02, 9.36], target: [1.02, 1.99, 0.02], driftScale: 0.018, fov: 37 },
                { atSeconds: 470, transitionSeconds: 20, position: [2.16, 2.42, 10.64], target: [0.94, 2.1, -0.24], driftScale: 0.018, fov: 42 },
                { atSeconds: 510, transitionSeconds: 12, position: [-3.58, 2.52, 12.0], target: [0.9, 2.04, -0.34], driftScale: 0.022, fov: 45 },
                { atSeconds: 534, transitionSeconds: 10, position: [0.32, 2.62, 12.68], target: [0.78, 2.0, -0.56], driftScale: 0.01, fov: 50 },
                { atSeconds: 558, transitionSeconds: 7, position: [-2.18, 2.78, 16.2], target: [0.6, 1.92, -0.96], driftScale: 0.0, fov: 64 }
            ]
        },
        lighting: {
            score: [
                { atSeconds: 0, keyWeight: 0.62, rimWeight: 0.88, fillWeight: 0.2, backWeight: 0.92 },
                { atSeconds: 42, transitionSeconds: 6, keyWeight: 0.68, rimWeight: 1.04, fillWeight: 0.14, backWeight: 0.98 },
                { atSeconds: 64, transitionSeconds: 6, keyWeight: 0.92, rimWeight: 0.9, fillWeight: 0.16, backWeight: 0.82 },
                { atSeconds: 135, transitionSeconds: 8, keyWeight: 0.58, rimWeight: 0.92, fillWeight: 0.1, backWeight: 0.78 },
                { atSeconds: 198, transitionSeconds: 6, keyWeight: 1.08, rimWeight: 1.18, fillWeight: 0.12, backWeight: 0.9 },
                { atSeconds: 246, transitionSeconds: 6, keyWeight: 1.22, rimWeight: 1.36, fillWeight: 0.08, backWeight: 0.86 },
                { atSeconds: 317, transitionSeconds: 3, keyWeight: 1.38, rimWeight: 1.58, fillWeight: 0.04, backWeight: 1.02 },
                { atSeconds: 337, transitionSeconds: 8, keyWeight: 0.66, rimWeight: 0.96, fillWeight: 0.08, backWeight: 0.76 },
                { atSeconds: 385, transitionSeconds: 22, keyWeight: 0.52, rimWeight: 0.86, fillWeight: 0.06, backWeight: 0.96 },
                { atSeconds: 432, transitionSeconds: 18, keyWeight: 0.72, rimWeight: 1.04, fillWeight: 0.06, backWeight: 0.7 },
                { atSeconds: 470, transitionSeconds: 10, keyWeight: 0.74, rimWeight: 0.78, fillWeight: 0.06, backWeight: 0.58 },
                { atSeconds: 510, transitionSeconds: 10, keyWeight: 0.58, rimWeight: 0.9, fillWeight: 0.1, backWeight: 0.86 },
                { atSeconds: 534, transitionSeconds: 8, keyWeight: 0.34, rimWeight: 0.36, fillWeight: 0.02, backWeight: 0.34 },
                { atSeconds: 564, transitionSeconds: 4, keyWeight: 0.18, rimWeight: 0.14, fillWeight: 0.0, backWeight: 0.18 }
            ]
        },
        stage3: {
            extraEventBeats: [
                {
                    id: 'fill_release2_breath',
                    type: EVENT_TYPE.ROOM_TIGHTEN,
                    atSeconds: 390,
                    durationSeconds: 12,
                    room: { roomPressureDelta: 0.08, shellOpacityDelta: -0.03 },
                    post: { vignetteDarknessDelta: 0.06, vignetteOffsetDelta: -0.04 }
                },
                {
                    id: 'fill_release2_admit',
                    type: EVENT_TYPE.ROOM_OPEN,
                    atSeconds: 432,
                    durationSeconds: 14,
                    room: { backLightDelta: 0.1, supportDelta: 0.05, shellOpacityDelta: 0.03 },
                    post: { bloomDelta: 0.02, vignetteDarknessDelta: -0.05, vignetteOffsetDelta: 0.05 }
                }
            ]
        }
    }
});

// HUSH — the authored-absence read (the track is "to not want anything"): sculpt
// the void instead of filling it. ONE continuous ~168s recession (the relic slowly
// receding, FOV widening — letting go), light monotonically draining to a bare
// silhouette rim, a single 42s exhale event, quieter living layer, near-silent
// committed reactions, and a slower grade so nothing snaps. Emptiness as gesture.
CHAMBER_VARIANTS['track5-cinema-hush'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'RELEASE2 — authored absence (hush)',
    chamber: {
        post: { gradeSettleSeconds: 4.2 },
        living: { phaseAmplitude: { RELEASE: 0.55 } },
        commitReactions: {
            minIntervalSeconds: 40,
            activeWindows: [{ start: 337, end: 400 }]
        }
    },
    timeline: {
        camera: {
            director: {
                enabled: false
            },
            score: [
                { atSeconds: 0, position: [-3.65, 2.54, 12.2], target: [0.94, 2.04, -0.34], driftScale: 0.035, fov: 45 },
                { atSeconds: 24, transitionSeconds: 12, position: [-3.42, 2.5, 11.62], target: [0.97, 2.05, -0.3], driftScale: 0.033, fov: 44 },
                { atSeconds: 42, transitionSeconds: 7, position: [-3.68, 2.56, 12.08], target: [0.92, 2.05, -0.36], driftScale: 0.028, fov: 46 },
                { atSeconds: 64, transitionSeconds: 9, position: [-3.0, 2.42, 10.4], target: [1.0, 2.08, -0.18], driftScale: 0.05, fov: 41 },
                { atSeconds: 135, transitionSeconds: 10, position: [-3.72, 2.58, 11.76], target: [0.9, 2.06, -0.38], driftScale: 0.03, fov: 47 },
                { atSeconds: 198, transitionSeconds: 9, position: [-2.62, 2.36, 10.28], target: [1.04, 2.06, -0.08], driftScale: 0.035, fov: 41 },
                { atSeconds: 246, transitionSeconds: 8, position: [-2.26, 2.28, 10.02], target: [1.02, 2.04, 0.02], driftScale: 0.02, fov: 39 },
                { atSeconds: 317, transitionSeconds: 4, position: [-2.04, 2.24, 9.72], target: [1.04, 2.0, 0.04], driftScale: 0.01, fov: 38 },
                { atSeconds: 337, transitionSeconds: 9, position: [-2.88, 2.42, 10.94], target: [0.94, 2.04, -0.22], driftScale: 0.018, fov: 43 },
                { atSeconds: 510, transitionSeconds: 168, position: [-4.0, 2.78, 13.7], target: [0.84, 2.02, -0.46], driftScale: 0.01, fov: 48 },
                { atSeconds: 534, transitionSeconds: 12, position: [0.32, 2.62, 12.68], target: [0.78, 2.0, -0.56], driftScale: 0.01, fov: 50 },
                { atSeconds: 558, transitionSeconds: 7, position: [-2.18, 2.78, 16.2], target: [0.6, 1.92, -0.96], driftScale: 0.0, fov: 64 }
            ]
        },
        lighting: {
            score: [
                { atSeconds: 0, keyWeight: 0.62, rimWeight: 0.88, fillWeight: 0.2, backWeight: 0.92 },
                { atSeconds: 42, transitionSeconds: 6, keyWeight: 0.68, rimWeight: 1.04, fillWeight: 0.14, backWeight: 0.98 },
                { atSeconds: 64, transitionSeconds: 6, keyWeight: 0.92, rimWeight: 0.9, fillWeight: 0.16, backWeight: 0.82 },
                { atSeconds: 135, transitionSeconds: 8, keyWeight: 0.58, rimWeight: 0.92, fillWeight: 0.1, backWeight: 0.78 },
                { atSeconds: 198, transitionSeconds: 6, keyWeight: 1.08, rimWeight: 1.18, fillWeight: 0.12, backWeight: 0.9 },
                { atSeconds: 246, transitionSeconds: 6, keyWeight: 1.22, rimWeight: 1.36, fillWeight: 0.08, backWeight: 0.86 },
                { atSeconds: 317, transitionSeconds: 3, keyWeight: 1.38, rimWeight: 1.58, fillWeight: 0.04, backWeight: 1.02 },
                { atSeconds: 337, transitionSeconds: 8, keyWeight: 0.6, rimWeight: 0.9, fillWeight: 0.06, backWeight: 0.8 },
                { atSeconds: 430, transitionSeconds: 80, keyWeight: 0.4, rimWeight: 0.66, fillWeight: 0.04, backWeight: 0.62 },
                { atSeconds: 510, transitionSeconds: 66, keyWeight: 0.32, rimWeight: 0.5, fillWeight: 0.03, backWeight: 0.5 },
                { atSeconds: 534, transitionSeconds: 8, keyWeight: 0.34, rimWeight: 0.36, fillWeight: 0.02, backWeight: 0.34 },
                { atSeconds: 564, transitionSeconds: 4, keyWeight: 0.18, rimWeight: 0.14, fillWeight: 0.0, backWeight: 0.18 }
            ]
        },
        stage3: {
            extraEventBeats: [
                {
                    id: 'hush_release2_exhale',
                    type: EVENT_TYPE.ROOM_TIGHTEN,
                    atSeconds: 415,
                    durationSeconds: 42,
                    attackSeconds: 13,
                    releaseSeconds: 16,
                    room: { supportDelta: -0.06, roomPressureDelta: -0.04, shellOpacityDelta: -0.04 },
                    post: { exposureDelta: -0.05, vignetteDarknessDelta: 0.08, vignetteOffsetDelta: -0.05 }
                }
            ]
        }
    }
});

// Track 1 "Sonoite" v1 — CONSECRATE chamber (Prompt #205). Reuses the Track 5
// cinema dress; identity comes from its own light-led timeline + grade phases.
// Reach: ?prototype=1&track=sonoite&variant=sonoite-cinema. The old default
// runtime Track 1 is untouched (proposal G-gates, docs/qa/TRACK1_CHAMBER_PROPOSAL).
CHAMBER_VARIANTS['sonoite-cinema'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'Track 1 consecrate chamber (v3.4b)',
    displayLabel: 'Sonoite',
    timelineTrackSlugs: ['sonoite'],
    hero: {
        roughness: 0.30,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        sheen: 0.20,
        sheenRoughness: 0.42,
        envMapIntensity: 0.08
    },
    chamber: {
        fogColor: '#0a0806',
        fogDensity: 0.016,
        environmentIntensity: 0.012,
        air: {
            dustCount: 44,
            dustSize: 0.0175
        },
        lighting: {
            keyBase: 0.82,
            rimBase: 0.42,
            backBase: 0.28,
            fillBase: 0.008
        },
        living: {
            bokeh: { count: 0, opacityMax: 0 },
            cameraBreath: { amp: [0.11, 0.07, 0.04], period: 12 },
            phaseAmplitude: {
                ASCEND: 0.25,
                FRACTURE: 0.95,
                HUSH: 0.3,
                ECLIPSE: 1,
                MEMORY: 0.25
            }
        },
        variant: {
            dustPattern: 'tight',
            dustMotion: 'brownian',
            hazeSpriteIdleOpacity: 0,
            frontHazeIdleOpacity: 0,
            dustStartedPresence: 0.08,
            dustOpacityMax: 0.05,
            dustColor: '#c4b8a8',
            dustLatticeSpacing: 0.38,
            dustLatticeJitter: 0.15,
            dustLatticeOrigin: [0.96, 1.4, -1.2],
            dustPercussiveGain: 0.5,
            hazePercussiveGain: 0.10,
            percussivePreIgnitionCap: 0.6,
            percussiveHazeSprite: {
                position: [0.96, 2.0, -1.0],
                scale: [8, 6],
                color: '#c9a06a'
            },
            boundaryWings: [],
            shellOpacityBase: 0.025,
            shellOpacityGain: 0.22,
            shellOpacityMin: 0.02,
            shellOpacityMax: 0.52,
            floorOpacityMin: 0.02,
            floorOpacityMax: 0.48,
            environmentRevealGain: 0.18,
            hazeSpriteBaseOpacity: 0.05,
            hazeSpriteOpacityMax: 0.1,
            hazeSprites: [
                { position: [3.8, 2.02, -5.6], scale: [18.2, 20.4], color: '#c4a888', texture: 'haze' }
            ]
        },
        post: {
            baseExposure: 0.72,
            // v3.4b: stronger bloom catches glow seeds at distance; haze stays below threshold.
            bloomStrength: 0.16,
            bloomThreshold: 0.78,
            // Warmth law (album plan): frost-dark -> one ignition arc of warmth
            // -> fully-lit neutral at the climax -> dying-ember cool-out.
            gradePhases: {
                ASCEND:   { mix: 0.52, tint: [0.8, 0.86, 1.0],   lift: [0.003, 0.004, 0.008], saturation: 0.5,  contrast: 1.22 },
                FRACTURE: { mix: 0.44, tint: [0.97, 0.92, 0.86], lift: [0.004, 0.003, 0.004], saturation: 0.82, contrast: 1.14 },
                HUSH:     { mix: 0.40, tint: [0.92, 0.84, 0.74],  lift: [0.0, 0.0, 0.004],     saturation: 0.35, contrast: 1.3 },
                ECLIPSE:  { mix: 0.34, tint: [1.02, 0.97, 0.9],  lift: [0.005, 0.004, 0.003], saturation: 0.98, contrast: 1.06 },
                MEMORY:   { mix: 0.6,  tint: [1.0, 0.84, 0.72],  lift: [0.002, 0.001, 0.0],   saturation: 0.55, contrast: 1.16 }
            },
            // The film plate is Track 5's late-track residue vocabulary — off here.
            plate: { strength: 0.0, idleStrength: 0.0, erasureBoost: 0.0 }
        }
    },
    timeline: SONOITE_CHAMBER_FILM_TIMELINE
});

// Track 4 "Horas Mortas" v2 — THE DARK IS TOO BIG FOR THE LAMP (2026-08-14).
// Reach: ?prototype=1&track=horas-mortas&variant=horas-mortas-cinema
CHAMBER_VARIANTS['horas-mortas-cinema'] = deepMerge(CHAMBER_VARIANTS['track5-cinema'], {
    label: 'Track 4 persist chamber (v2)',
    displayLabel: 'Horas mortas',
    timelineTrackSlugs: ['horas-mortas'],
    hero: {
        roughness: 0.62,
        clearcoat: 0.12,
        clearcoatRoughness: 0.8,
        sheen: 0,
        sheenRoughness: 1,
        envMapIntensity: 0.14
    },
    chamber: {
        // Owner 2026-08-15 11:48: "haze almost fog" — thick lit atmosphere; blackout
        // gating still zeroes all of it when the lamp is off.
        fogColor: '#0f0a06',
        fogDensity: 0.029,
        environmentIntensity: 0.05,
        camera: {
            xDrift: 0,
            yDrift: 0
        },
        air: {
            dustCount: 150,
            dustSize: 0.034
        },
        lighting: {
            keyBase: 0,
            rimBase: 0,
            backBase: 0,
            fillBase: 0
        },
        living: {
            enabled: false,
            bokeh: { count: 0, opacityMax: 0 },
            cameraBreath: { amp: [0, 0, 0], period: 12 },
            flicker: { depth: 0 },
            cycles: {
                key: { period: 103, amp: 0 },
                haze: { period: 67, amp: 0 },
                rimHue: { period: 149, amp: 0 },
                dust: { period: 41, amp: 0 }
            },
            gobo: { enabled: false },
            phaseAmplitude: {
                DEAD_HOURS: 0,
                WAKING: 0,
                BURN: 0,
                FADE: 0,
                AFTER: 0,
                TERMINAL: 0
            }
        },
        variant: {
            dustPattern: 'cone',
            dustMotion: 'fall',
            dustFallSpeedMin: 0.02,
            dustFallSpeedMax: 0.05,
            hazeSpriteIdleOpacity: 0,
            frontHazeIdleOpacity: 0,
            dustStartedPresence: 0.42,
            dustOpacityMax: 0.34,
            dustColor: '#c39a5e',
            boundaryWings: [],
            shellOpacityBase: 0,
            shellOpacityGain: 0,
            shellOpacityMin: 0,
            shellOpacityMax: 0,
            floorOpacityMin: 0.12,
            floorOpacityMax: 0.34,
            environmentRevealGain: 0,
            hazeSpriteBaseOpacity: 0.22,
            hazeSpriteOpacityMax: 0.30,
            hazeSprites: [
                { position: [0.94, 3.6, -0.32], scale: [5.8, 9.6], color: '#a87840', texture: 'haze' },
                { position: [0.96, 2.2, -0.1], scale: [4.4, 5.2], color: '#8a6636', texture: 'haze' }
            ]
        },
        post: {
            baseExposure: 0.98,
            bloomStrength: 0.20,
            bloomRadius: 0.49,
            bloomThreshold: 0.20,
            grainIntensity: 0.016,
            gradeLiftAfterContrast: true,
            bloomPhases: {
                DEAD_HOURS: 0.22,
                WAKING: 0.26,
                BURN: 0.34,
                FADE: 0.26,
                AFTER: 0.22,
                TERMINAL: 0.16
            },
            grainPhases: {
                DEAD_HOURS: 0.016,
                WAKING: 0.016,
                BURN: 0.018,
                FADE: 0.016,
                AFTER: 0.016,
                TERMINAL: 0.016
            },
            gradePhases: {
                DEAD_HOURS: { mix: 0.52, tint: [1.02, 0.95, 0.86], lift: [0.0040, 0.0024, 0.0010], saturation: 0.88, contrast: 1.26, contrastPivot: 0.10 },
                WAKING:     { mix: 0.50, tint: [1.02, 0.95, 0.86], lift: [0.0040, 0.0024, 0.0010], saturation: 0.92, contrast: 1.20, contrastPivot: 0.12 },
                BURN:       { mix: 0.22, tint: [1.02, 0.95, 0.86], lift: [0, 0, 0], saturation: 0.88, contrast: 1.08, contrastPivot: 0.22 },
                FADE:       { mix: 0.40, tint: [1.02, 0.95, 0.86], lift: [0.0040, 0.0024, 0.0010], saturation: 0.84, contrast: 1.24, contrastPivot: 0.12 },
                AFTER:      { mix: 0.42, tint: [1.02, 0.95, 0.86], lift: [0.0040, 0.0024, 0.0010], saturation: 0.82, contrast: 1.28, contrastPivot: 0.10 },
                TERMINAL:   { mix: 0.72, tint: [1.02, 0.95, 0.86], lift: [0, 0, 0], saturation: 0.62, contrast: 1.32, contrastPivot: 0.06 }
            },
            plate: { strength: 0.0, idleStrength: 0.0, erasureBoost: 0.0 }
        }
    },
    timeline: HORAS_MORTAS_CHAMBER_FILM_TIMELINE
});

const DEFAULT_PHASE_WINDOWS = [
    { name: 'VOID', start: 0, end: 96 },
    { name: 'AWAKENING', start: 96, end: 216 },
    { name: 'WANTING', start: 216, end: 281 },
    { name: 'RELEASE', start: 281, end: 432 },
    { name: 'ERASURE', start: 432, end: 564 }
];

const DEFAULT_EVENT_BEAT_PRESETS = Object.freeze({
    [EVENT_TYPE.CAMERA_PUSH]: {
        durationSeconds: 18,
        attackSeconds: 2.8,
        releaseSeconds: 4.8,
        intensity: 1.0,
        punctuationBoost: 0.138
    },
    [EVENT_TYPE.CAMERA_RESET]: {
        durationSeconds: 9,
        attackSeconds: 0.7,
        releaseSeconds: 3.2,
        intensity: 1.0,
        punctuationBoost: 0.207
    },
    [EVENT_TYPE.POST_CRUSH]: {
        durationSeconds: 0.52,
        attackSeconds: 0.08,
        releaseSeconds: 0.28,
        intensity: 1.0,
        punctuationBoost: 1.058,
        post: {
            bloomDelta: -0.05,
            grainDelta: 0.012,
            vignetteDarknessDelta: 0.18,
            vignetteOffsetDelta: -0.14,
            vignetteSoftnessDelta: -0.08,
            exposureDelta: -0.18
        }
    },
    [EVENT_TYPE.FLASH]: {
        durationSeconds: 0.85,
        attackSeconds: 0.04,
        releaseSeconds: 0.55,
        intensity: 1.0,
        punctuationBoost: 0.161
    },
    [EVENT_TYPE.ROOM_OPEN]: {
        durationSeconds: 12,
        attackSeconds: 1.1,
        releaseSeconds: 4.2,
        intensity: 1.0,
        punctuationBoost: 0.253,
        room: {
            fillDelta: 0.03,
            backLightDelta: 0.08,
            shellOpacityDelta: 0.06,
            floorOpacityDelta: 0.04,
            thresholdDelta: 0.06,
            supportDelta: 0.1,
            roomPressureDelta: -0.05
        },
        post: {
            bloomDelta: 0.02,
            vignetteDarknessDelta: -0.07,
            vignetteOffsetDelta: 0.09,
            vignetteSoftnessDelta: 0.05
        }
    },
    [EVENT_TYPE.ROOM_TIGHTEN]: {
        durationSeconds: 11,
        attackSeconds: 0.9,
        releaseSeconds: 3.8,
        intensity: 1.0,
        punctuationBoost: 0.437,
        room: {
            fillDelta: -0.014,
            backLightDelta: -0.05,
            shellOpacityDelta: -0.03,
            floorOpacityDelta: -0.028,
            thresholdDelta: -0.03,
            supportDelta: -0.05,
            roomPressureDelta: 0.1
        },
        post: {
            bloomDelta: -0.02,
            vignetteDarknessDelta: 0.12,
            vignetteOffsetDelta: -0.08,
            vignetteSoftnessDelta: -0.04
        }
    },
    [EVENT_TYPE.MATERIAL_REVEAL]: {
        durationSeconds: 10,
        attackSeconds: 1.4,
        releaseSeconds: 3.0,
        intensity: 1.0,
        punctuationBoost: 0.184,
        material: {
            roughnessDelta: -0.26,
            clearcoatDelta: 0.2,
            clearcoatRoughnessDelta: -0.32,
            sheenDelta: 0.08,
            envMapIntensityDelta: 0.18
        },
        post: {
            bloomDelta: 0.02,
            grainDelta: 0.008,
            vignetteOffsetDelta: -0.02
        }
    },
    [EVENT_TYPE.BLACK_GAP]: {
        durationSeconds: 0.34,
        attackSeconds: 0.06,
        releaseSeconds: 0.24,
        intensity: 1.0,
        punctuationBoost: 1.15,
        blackout: {
            opacity: 0.98
        },
        post: {
            bloomDelta: -0.12,
            grainDelta: -0.02,
            vignetteDarknessDelta: 0.24,
            vignetteOffsetDelta: -0.2,
            vignetteSoftnessDelta: -0.12,
            exposureDelta: -0.4
        }
    },
    [EVENT_TYPE.FIX]: {
        durationSeconds: 18,
        attackSeconds: 1.2,
        releaseSeconds: 6.0,
        intensity: 1.0,
        punctuationBoost: 0.207,
        room: {
            fillDelta: 0.014,
            backLightDelta: 0.045,
            shellOpacityDelta: 0.06,
            floorOpacityDelta: 0.045,
            thresholdDelta: 0.04,
            supportDelta: 0.06,
            roomPressureDelta: -0.02
        },
        post: {
            bloomDelta: -0.01,
            vignetteDarknessDelta: -0.05,
            vignetteOffsetDelta: 0.05,
            vignetteSoftnessDelta: 0.04
        },
        material: {
            roughnessDelta: -0.04,
            clearcoatDelta: 0.06,
            clearcoatRoughnessDelta: -0.08,
            envMapIntensityDelta: 0.05
        }
    },
    [EVENT_TYPE.BLEACH]: {
        durationSeconds: 20,
        attackSeconds: 0.8,
        releaseSeconds: 8.0,
        intensity: 1.0,
        punctuationBoost: 0.299,
        room: {
            fillDelta: -0.018,
            backLightDelta: -0.02,
            shellOpacityDelta: -0.1,
            floorOpacityDelta: -0.08,
            thresholdDelta: -0.06,
            supportDelta: -0.08,
            roomPressureDelta: -0.08
        },
        post: {
            bloomDelta: -0.05,
            grainDelta: 0.008,
            vignetteDarknessDelta: 0.08,
            vignetteOffsetDelta: -0.05,
            vignetteSoftnessDelta: -0.02,
            exposureDelta: -0.06
        },
        material: {
            roughnessDelta: 0.08,
            clearcoatDelta: -0.08,
            clearcoatRoughnessDelta: 0.1,
            sheenDelta: -0.05,
            envMapIntensityDelta: -0.08
        }
    }
});

const ChamberGrainShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        intensity: { value: 0.025 },
        terminatorGrainBoost: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float intensity;
        uniform float terminatorGrainBoost;
        varying vec2 vUv;

        float random(vec2 seed) {
            return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            float luminance = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
            float grainWeight = mix(0.4, 1.0, smoothstep(0.045, 0.28, luminance));
            float term = smoothstep(0.02, 0.055, luminance) * (1.0 - smoothstep(0.10, 0.16, luminance));
            grainWeight += term * terminatorGrainBoost;
            float noise = (random(gl_FragCoord.xy + vec2(time, time * 1.618)) - 0.5) * intensity * grainWeight;
            texel.rgb += vec3(noise);
            gl_FragColor = texel;
        }
    `
};

const ChamberVignetteShader = {
    uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 0.76 },
        offset: { value: 0.9 },
        softness: { value: 0.42 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        uniform float softness;
        varying vec2 vUv;

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec2 centeredUv = (vUv - 0.5) * vec2(1.0, 1.15);
            float distanceFromCenter = length(centeredUv);
            float vignette = 1.0 - smoothstep(offset, offset + softness, distanceFromCenter);
            float edgeWeight = mix(1.0, pow(max(vignette, 0.0), max(darkness, 0.001)), darkness);
            texel.rgb *= edgeWeight;
            gl_FragColor = texel;
        }
    `
};

const ChamberBlackoutShader = {
    uniforms: {
        tDiffuse: { value: null },
        opacity: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float opacity;
        varying vec2 vUv;

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            texel.rgb *= clamp(1.0 - opacity, 0.0, 1.0);
            gl_FragColor = texel;
        }
    `
};

const ChamberGradeShader = {
    uniforms: {
        tDiffuse: { value: null },
        mixAmount: { value: 0.0 },
        tint: { value: new THREE.Vector3(1, 1, 1) },
        lift: { value: new THREE.Vector3(0, 0, 0) },
        saturation: { value: 1.0 },
        contrast: { value: 1.0 },
        contrastPivot: { value: 0.5 },
        liftAfterContrast: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float mixAmount;
        uniform vec3 tint;
        uniform vec3 lift;
        uniform float saturation;
        uniform float contrast;
        uniform float contrastPivot;
        uniform float liftAfterContrast;
        varying vec2 vUv;

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 graded = texel.rgb * tint;
            float luma = dot(graded, vec3(0.2126, 0.7152, 0.0722));
            graded = mix(vec3(luma), graded, saturation);
            if (liftAfterContrast > 0.5) {
                graded = (graded - contrastPivot) * contrast + contrastPivot;
                graded += lift;
            } else {
                graded += lift;
                graded = (graded - contrastPivot) * contrast + contrastPivot;
            }
            graded = max(graded, vec3(0.0));
            texel.rgb = mix(texel.rgb, graded, clamp(mixAmount, 0.0, 1.0));
            gl_FragColor = texel;
        }
    `
};

function createDeterministicValueNoiseNormalMap(size = 128) {
    const data = new Uint8Array(size * size * 4);
    const smoothstep01 = (t) => t * t * (3 - 2 * t);
    const hash = (ix, iy) => {
        const n = Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453;
        return n - Math.floor(n);
    };
    const valueAt = (x, y) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        const v00 = hash(xi, yi);
        const v10 = hash(xi + 1, yi);
        const v01 = hash(xi, yi + 1);
        const v11 = hash(xi + 1, yi + 1);
        const vx0 = v00 + (v10 - v00) * smoothstep01(xf);
        const vx1 = v01 + (v11 - v01) * smoothstep01(xf);
        return vx0 + (vx1 - vx0) * smoothstep01(yf);
    };
    const sampleStep = 4 / size;
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const nx = x / size * 4;
            const ny = y / size * 4;
            const hL = valueAt(nx - sampleStep, ny);
            const hR = valueAt(nx + sampleStep, ny);
            const hD = valueAt(nx, ny - sampleStep);
            const hU = valueAt(nx, ny + sampleStep);
            const dx = hR - hL;
            const dy = hU - hD;
            const index = (y * size + x) * 4;
            /* eslint-disable security/detect-object-injection -- fixed canvas raster */
            data[index] = Math.round((dx * 0.5 + 0.5) * 255);
            data[index + 1] = Math.round((dy * 0.5 + 0.5) * 255);
            data[index + 2] = 255;
            data[index + 3] = 255;
            /* eslint-enable security/detect-object-injection */
        }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

// 64x64 blue-noise mask (raw bytes, base64). Applied post-OutputPass in sRGB
// space at 1 LSB amplitude — melts gradient banding in the near-black chamber
// without reading as grain. Regenerate via FFT high-pass + rank ordering.
const BLUE_NOISE_64_B64 = 'g654Ff8i+wGVYvqzWPGv+4KnjCLNusxKzdp/PIATFdgNC8OWBMRd1VOqD1ndGr2jJfehsMoDhsZszYCirZ9R7IFyglISC344u6bTb4fHARXGwAGQRzyAXbxGR464TTqNr7x0luxXkElbY6WPi3ZCQCgn2MAK0JVWGvsPLnQFGtxP9KM62J2yVEasdNM2YypoQ0PTp4vunp1BCc+EEzfpImyMGLFGme3nhdaGH0V9/PgEqU7MH9KGWGeUIN2uwdVlfPYGSvx4lxCqUTIRF/Xo60tqmeFE3JK/uNFvujqum9Bm65tS6McDPolhIpLfwwTatzazTYG732xibYPNNlbQX1XlaMgc6rx2ROR7yKBpvzy//ANBKlRiSS+btQO55Sqhh2QeQA5e2tJzkllY7jQ7x1s71TExXzes1j+u8Gn/BCRyqFWrBrCIy1KWzIswmHCCkxN7VEHdsrtwwCD0FjK35IThpXBr7qircVw9uD5wc8ag523jv7QH8SufGt0MmKV5Slwobus588aeM13QaFm1iTRr7cSiyNeWjzfAGeb+NlKRRVpsixlGwxYU/QHinHWIRSeGpqeCLY9oT4TdVDOIFNG73jNwvpeIA4YPShdXzwnIsRoOKzpWXdBqq5I2Hr5MpbyJ7DTuIvgm0Kg9Y7brEZsG7IUGTvYH6FOKKtx+kS4geNcSEsEmXySOzvObuzf6dRP3TUjbK2GrBj/ehaJQdAPo3AJIOFa/Eizg2DxXmnXGxI1nf8kcYKKZbd5y7XatLGon4D55p/MO/W8hd3YKNLrWGWb/5oeNLoOkMNouTv9OFgUN/bqDxv0THou39g8roEmBmF8hsMaaOEkWD4e66M/tiEQT/H8lHjSQrKct5b2D6jop6ikJ1qjJgK1TxJ+LCs1p/Djmb5RA2u2HGgqsV3rZ0SGjTP7GE/gIzH2+bgf2GWZ9amn2WgrohvTklUM535h6+XCxLUsMH8tsJrY+ze4NrdwSGdSBLIKNHu9nYpD7vElTi/Q+fxQ48wpQ5Dz2ZhJ4yshXKLZmjuDNDBzC7iFbdVwwDeP6R3WdZ3tPo1yQ/QGg1x3yhi6vqqQjrVwSaBCyP9YgV1/p/LsNviNI76H2mOpeCVr+jm4A1bNehVgMN5WsKLlu8TGunIWTy9+yA/0A8sNcbBEy/CQpxusnMOVeBvxwJ42UImFch4mrRUlVercC0nS1+YAFzFPTJkH6GO0jiJhbC6otyZh8wEoUvPNdLb+oLzi7Le3xn4ki2xdy7T5I5owupP+clkZF5GiUjRFfG8xRbAMgLP5t18QkrV0fMbPJh6FhxI1PtJEYhCsPtHOtSy5I/kwviGFPO4SPftS7Euof3hKYRhX1I/jdsipqdw54nMet27xBE9pNuGX9+248tFX7DmP1VhGv4WzKWPVAbyXFHkNRnTbRr+jbBebpoGB+IR2m7cdiaV0rQeLvB+FvWkjbR7LaGakFtxumBB393Ahxl0CmZNQZO32MXbFENLXQL6fyZwPiR2t+G/TGUjIT7MV8wiSdTNmIVIoENU6K/7h1yNl1lh7zSVrekT1PSFByaBNfXFuwJb4/7NdRlw6J9vO7qOuFzCjdCHIc8jRQf0o0gnAIjVgr2fPPZ33JZSEv1BYulhv3IiqfrjJr9Qzl2vMF2YPjjaTuzBJIIqbSRwipIZ2+OwYgwuRGigOC8BfjtdfSltWHYXYKwc4Hy4PsAd25QmIc8DeI38LNZy+3ANT6vJU5jLF/OaWC1ij8CTFLQSTSyZJ88pr7CePU4XH4GwxyuS8yV6tlVqbHVsoL4kQNPxf09hbOvV4mccjBVOklAFobrs+lEp+znZ0FjO9w1O8xlJFonpwEbZtYVV50mdvFC0Z32ucpoPJFBRT/QtPYx7nxeqwN2z4Fp4DkUlry+rf4qRpVuh0Lr2Pn55BywUNLiN/eTqSeAnziZnAbAbFb1W7a2DhszawBS/I21OmuEJHmNEw3ZVPDvDiMeBDrdB9IWg3xRbdWVCvDJhGzmn6aY4Jtd4ww0UqoQbzdZ6+BQXEwaze2fX2v1q+UhhJnSMzLO8B9Non6fED/F1IC4WKNOGv0gUCQiPV2ILy5X9Fk0EZpUTzvD9SyRtKfkeu7H45/e3y02wRViJPsyMczeESlG8UHkq/2PlxLmul+d0ufy4RfIEL85iG9j64sHn/wngjBxBMsD11qvdgdUVSo1T6aU4w9ixXMwlVOW7sD41ZZedMX6MupaoOlRR+phdTXDjSU4dMuPM2OST1rznSYgSh+U8+s5ZayRWwA/uloZ4kWFO9TUe8xnjmHa4vVTJGkXEAQtRdrBHdsyzJpaRQmicu3BIJrEGfcl+WxEp5ZnE0zb3lvJ5rdFWlVyEcuH4Ci9ZutGuqyHvwOLNEMkIuykZxUnu3rTMTE33lEbt51gB2dqsPr2GFJEcLN9AtIb3rw34Q1JjiZ5v7jROyC3MGRVBHb6846Cu86/SiKm7O7v5KOrpydnR2aI6kyFfC9hsD8iPZmI/whky8IFPrXGPsokzHuTj+3ExBDm/k30+prGbwUoeA4b01hj7JJXKLyCcQn9DEmwnmFPw3VvbZOVYuppgBmWthja4j5nCoBJ7++iiPZc97oc72a2GBSUwNiIK3ojFUnYVuG19y0M2I/REI1hSwHBf6Wq70r7yZkL78HmltgdRkJ0c4CqW/Iu+jNCe0BqiFtrqu1YDaUKf5QGLUcD9OflIFRQGVaYX8M98Zo2zg9t2PTgOo1B/C1j4H/aMpe8F22yY9jlc6gFWdWxxfAbdYcK51KcftbFsUFZc/J35K202Mo2e+u4iHCgzqzQbWT5zpWqAJ3c+qXI7Ax5xmET6Q2L45QeEO/1FrQMSXoNe2TxFDOfm11cwah2vY2xXQDx5clqQwpsKCfNdGiMBLI+SvetHveqKmUHw7BHq4O5b8XiV4u/5Z7c4vfpFHhJeAZ4tpTokt/mYAJSyWCZKgHmXdv2IncOSPByi2qX/dOqh8pnckFlu1I9yxk/gJQehz6KLGPpmeSFs4tNfhcV6PLA78o0ndQ15z3wDa6Z8c5/62jVzDAK7TXJVCQmX547lDindBHxEwUjCCSyoG8wS/VX4jCcEyOI4+5NW4BICfFr8UAyyoVivRBo/ZCx4FhbS/aPXZy6g6lttqDQJkBwncigVpS+QYt3yow4c4QsXj3fXFiW4k+fVHnqjKshPnvYUBzHKc7grLkDCGVGLiGRyr43XkZ4NItSKMPzgBV90HFzUsKn+1mFtXhpkS5ACCwmGh5nKW2G+sLfIVlh9mXyG6KV/zcsSeuGxRP1lmzlVoPPVXUg08Jdd7gRvCrNbBszs5Dh0C5GLBzGLZG+cPlKU+qMVlDxORllaMdZZ201nr4eiJ8Yggg5m7hDD3F1pOtwpoA0maQYeoLFKygrGq2jgeO4hMxworm3qlbkE1feUsu3wYrva+3elI0zY1HORFKvET4jWWZ8MmLK/VCdsweV3XDVNv6COWTy87nok0/GFuD8Z73u2/7Ca4Vn6UzvmzckOnmypnJoUQbtNuX4KQgAB0JVPkGK6vyoX9ReUyTo7BmQaDWGSnKp5MUOjSS7CLYLKtk11JPP6j3g76Kqx5iFd27nxxeIvcaxoe4atJ0jNewhrefp9AVMpet2KdAQvClDrnbfio7XksO7n9OxBnwd7RjGQLUxl0CN8/nFaQ8JsUq02UC41YTmFm7wB2+OnWcfb2fhv8oTKKbKkr0j/p5BiT9EQrklVbxJTPpNqV6dOBYXDDGQ4aKZCxJSVG0cqVCtCRUOTvKXuu5CkiI4prhGTSeERsXae12RGI0DXF5nv1m4t6NFqfoQ2WHyjxSJ8M3ps2cFzzzQ6ovw2uu1J7+KnH/yx6hh3jkTMbjds5jTfpGYskPaeKrPMqbJInAm84cJhCY2ZWYh5P9JLropz175FPjynZpfnBkZYCmsuANZmo+CfuguPSYeCB+ZgW6EwRZXMN8MErewRIPkZPFflBZXh/TKdwkXgi4PjtzHbbDB3gFVcLympALv29rqKkziXq4DJuzOHYIXUJQeyPmKqS1vJd9WKQvo7K9WPGzRTNjnCaFIVocsfOZNWq6sh3z6ehqei1kSk7jx4dAQuNNMfo+zMDCKTDsU4Tg3eOpG6jroeRxoR7m71Y23h1uH/PIOfJx5JXD2SngxRjzI55uJHks7WnyO45nNaz+0FoAxwecjFmOFejsH//BGg5Qvj9zWyUR99JG9Bwm7OGgPQunGmeeClvbe2waPM90cDNN9GCkeWCClW+qem0kKTrsumO+NT2TaWgMQZWJow95luHYO8faj1q+b6IjyciwGE9ZpjP47ErqMc8C42L3CfGhZAI5kBCstjJEfDJylJlFtXy182bgwRH1JZJETPQqtij4IXWgQhPgEOUFL6JKXO+SYOK4ND2WF5Oh5neFYLBS8brxbXofvBdgxfio03C9lO4dLLMz5rS6S3SKj0QLyhj+NeOZjauF1qF//xJZlIRDYLF7Ht060tlfhbkc11NgLoSFr7VY+i/UXMyBs24+KcIPvaciEDd2okgcc+wcvwDwPwBmR2rYNkVKBuDMGm0ROPvxSTLV+BCV0nIN/QpCbbTwGldqwHxzuerRDCzlNWHJR+6jknLP8a+hM55SsYR864SjCHEhs73SXplj0MQO9BDWAKZM71ZFl30MCl3ne5sIYleDirg5pXA5CJCpoQOJnju+FIZUgAtg0cB9/XWOmOLVl/yq2aIxq5xyIvYL4zltN+Cs7k8JnXcy3OpRB/jh8T6gaCU8UT9HUL7LjF0loxbn5eQkI4W2Rbkt0GhZcFQaNwSTERCBe1VkN9ebgEM2cRfuKF0C+xf1l8+iGJk5Qk7yG6ZM55ZOAo2OuGFui/VoQAiMlfVFtTx4sTMktsmKG4vK5rcUrcenX25bhoLyksx4s/tPutQPkSbWwfUuf0bDfkBVslPu+oRYTk98ULXfZaXqyK3TTcQ9d4Czcd6gMIE/8GC40bBM3xGPFiDVQzPFLEnROiT9DX1/WXJrTVjQ96qCe6tCLdi3+tZkYL/hBB7lDCuYFDrPQk+OB5p23dd4a6DRLmqQ903nUuW+EJG0FfamOE1ee3HwsEf1qmHkBKpfHU084nbBNSK6LsNpVoHP+3P2hEav6T7TywLirxbCrKlZdXRBcVhYzWQVpLnRsXw1ou89SpE7ezSUUZetDd2wV5L1kZ8N0aS4BfUl+Sk/B3ZBAPN5em13yd/ALXswlz0yVJvPBoPZgOdLjYyPQzAnltwtbmyU1X0GIxonHUe3CxbxISN03JEKDvg3KaxJioD+LQPpJwT5ZOcKMNAL1elSH+WjOP4BixhlS7kbDeo/0l7FBsv9fxi9zFjpY6jb+bEoAXTPiv5TOftICP9dv36DpI86V2xqxgI76Xf5RQGUmttJJ9r56XP5YE7uJt/KuizyFsFpyDvZX7hkV+t6GPwE2fky2UdyAQ==';

function createBlueNoiseTexture() {
    const raw = window.atob(BLUE_NOISE_64_B64);
    const data = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    const texture = new THREE.DataTexture(data, 64, 64, THREE.RedFormat, THREE.UnsignedByteType);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

const ChamberDitherShader = {
    uniforms: {
        tDiffuse: { value: null },
        tBlueNoise: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBlueNoise;
        varying vec2 vUv;

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec2 noiseUv = fract(gl_FragCoord.xy / 64.0);
            float noise = texture2D(tBlueNoise, noiseUv).r;
            texel.rgb += vec3((noise - 0.5) / 255.0);
            gl_FragColor = texel;
        }
    `
};

const Track5PlateShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        strength: { value: 0.0 },
        damage: { value: 0.0 },
        forensic: { value: 0.0 },
        pressure: { value: 0.0 },
        airDensity: { value: 0.0 },
        afterimage: { value: 0.0 },
        erasure: { value: 0.0 },
        // Stage 2b forensic trace. Driven only by the recut visual score; 0 on the
        // default film, where every expression below reduces to its shipped form.
        traceCool: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        uniform float strength;
        uniform float damage;
        uniform float forensic;
        uniform float pressure;
        uniform float airDensity;
        uniform float afterimage;
        uniform float erasure;
        uniform float traceCool;
        varying vec2 vUv;

        // Single restrained blue-grey, pre-divided by its own Rec.709 luma
        // (vec3(0.72, 0.78, 0.88) / 0.774464) so tinting is luma-preserving: the
        // trace changes the colour of lit material without brightening it, and
        // there is exactly one hue in the effect — no channel split, no cycling.
        const vec3 TRACE_TINT = vec3(0.929675, 1.007148, 1.136273);

        float random(vec2 seed) {
            return fract(sin(dot(seed, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 seed) {
            vec2 i = floor(seed);
            vec2 f = fract(seed);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
            float plateStrength = clamp(strength, 0.0, 1.0);
            float damageAmount = clamp(damage, 0.0, 1.0);
            float forensicAmount = clamp(forensic, 0.0, 1.0);
            float pressureAmount = clamp(pressure, 0.0, 1.0);
            float erasureAmount = clamp(erasure, 0.0, 1.0);
            float afterimageAmount = clamp(afterimage, 0.0, 1.0);

            vec2 centeredUv = vUv - 0.5;
            vec2 pixel = 1.0 / max(resolution, vec2(1.0));
            float lowNoise = noise(vUv * vec2(5.4, 3.2) + vec2(time * 0.025, -time * 0.018));
            float highNoise = random(gl_FragCoord.xy + vec2(time * 19.0, time * 7.0));
            vec2 warp = centeredUv
                * (0.0018 + damageAmount * 0.0042 + forensicAmount * 0.002)
                * vec2(sin(time * 0.21 + lowNoise * 4.0), cos(time * 0.16 + lowNoise * 3.0));

            vec4 texel = texture2D(tDiffuse, vUv + warp);
            vec3 source = texel.rgb;
            float luma = dot(source, vec3(0.2126, 0.7152, 0.0722));
            float lumaLeft = dot(texture2D(tDiffuse, vUv - vec2(pixel.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
            float lumaRight = dot(texture2D(tDiffuse, vUv + vec2(pixel.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
            float lumaUp = dot(texture2D(tDiffuse, vUv + vec2(0.0, pixel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
            float lumaDown = dot(texture2D(tDiffuse, vUv - vec2(0.0, pixel.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
            float edge = clamp(abs(lumaLeft - lumaRight) + abs(lumaUp - lumaDown), 0.0, 1.0);

            // --- Stage 2b forensic trace ------------------------------------
            // Neutral defaults keep the default film and any inactive recut frame
            // bit-exact: artifactMask stays 1.0 and the tint/grain terms vanish.
            // The mask/grain work only runs when the score drives traceCool > 0.
            float traceAmount = clamp(traceCool, 0.0, 1.0);
            float artifactMask = 1.0;
            float traceMask = 0.0;
            float traceGrain = 0.0;
            if (traceAmount > 0.0) {
                // Strict mask. The luma gate is a FACTOR, not a term, so an unlit
                // pixel can never enter the trace on a high edge alone — that is what
                // keeps the effect off the void, the floor and the frame corners
                // instead of veiling them. Lit flat material still carries a floor of
                // the trace (0.34) so the effect reads as material, not as an outline;
                // the edge gate only weights it upward, and both gates are smoothstep
                // so nothing anywhere is binary.
                float traceLumaGate = smoothstep(0.035, 0.22, luma);
                float traceEdgeGate = smoothstep(0.015, 0.12, edge);
                traceMask = traceLumaGate * (0.34 + 0.66 * traceEdgeGate);

                // Temporally correlated grain. Coarse 3px cells on a lattice that
                // drifts slowly across the frame, resampled at ~4.5Hz with a
                // smoothstep blend between two seeds. Consecutive frames therefore
                // share most of their value while a third of a second apart do not:
                // the texture crawls and settles like emulsion instead of the
                // frame-random highNoise snow the full-frame artifacts use.
                vec2 traceCell = floor(gl_FragCoord.xy / 3.0 + vec2(time * 0.21, time * -0.13));
                float traceSeed = time * 4.5;
                float traceSeedFloor = floor(traceSeed);
                float traceSeedMix = smoothstep(0.0, 1.0, traceSeed - traceSeedFloor);
                traceGrain = mix(
                    random(traceCell + vec2(traceSeedFloor * 3.73, traceSeedFloor * 1.31)),
                    random(traceCell + vec2((traceSeedFloor + 1.0) * 3.73, (traceSeedFloor + 1.0) * 1.31)),
                    traceSeedMix
                ) - 0.5;

                // When the trace is live, the full-frame TV artifacts stop being
                // full-frame: salt, ash and the horizontal scan are pulled toward the
                // same mask, so they stipple the relic rather than veil the room.
                artifactMask = mix(1.0, traceMask, traceAmount);
            }

            float contrast = 1.12 + pressureAmount * 0.24 + damageAmount * 0.22 + forensicAmount * 0.34;
            float crushed = (luma - 0.5) * contrast + 0.5;
            crushed = pow(max(crushed, 0.0), mix(0.92, 0.56, clamp(forensicAmount + damageAmount * 0.38, 0.0, 1.0)));
            crushed = smoothstep(0.025 + erasureAmount * 0.06, 0.94 - forensicAmount * 0.08, crushed);
            float posterLevels = mix(24.0, 7.0, clamp(damageAmount + forensicAmount * 0.45, 0.0, 1.0));
            float poster = floor(crushed * posterLevels) / posterLevels;
            float evidenceLuma = mix(crushed, poster, 0.24 + damageAmount * 0.36);
            float objectMask = smoothstep(0.018, 0.16, luma + edge * 0.72);

            vec3 coldTint = vec3(0.78, 0.84, 0.96);
            vec3 ashTint = vec3(0.7, 0.66, 0.61);
            vec3 plate = mix(vec3(evidenceLuma) * ashTint, vec3(evidenceLuma) * coldTint, 0.56 + forensicAmount * 0.24);
            plate += objectMask * vec3(0.018, 0.022, 0.03) * (1.0 + forensicAmount * 5.2 + damageAmount * 1.8);

            float scan = sin((vUv.y * resolution.y) * 0.78 + time * 0.8) * 0.5 + 0.5;
            plate *= 1.0 - scan * (0.014 + airDensity * 0.018 + erasureAmount * 0.018) * artifactMask;
            plate += edge * (0.16 + forensicAmount * 0.46) * vec3(0.82, 0.88, 1.0);
            plate -= edge * damageAmount * vec3(0.08, 0.075, 0.065);

            vec3 ghost = texture2D(tDiffuse, vUv + vec2(0.008 + afterimageAmount * 0.02, -0.004)).rgb;
            float ghostLuma = dot(ghost, vec3(0.2126, 0.7152, 0.0722));
            plate += vec3(ghostLuma) * vec3(0.08, 0.095, 0.12) * afterimageAmount;

            float salt = step(0.992 - forensicAmount * 0.018 - damageAmount * 0.012, highNoise);
            float ash = step(0.986 - damageAmount * 0.022 - erasureAmount * 0.018, random(gl_FragCoord.yx - time * 11.0));
            plate += salt * vec3(0.42, 0.45, 0.5) * (0.14 + forensicAmount * 0.18) * artifactMask;
            plate -= ash * vec3(0.08, 0.075, 0.07) * (0.22 + damageAmount * 0.25) * artifactMask;

            // Paint the trace: cool the masked material toward the single
            // blue-grey (luma-preserving, so plate contrast and object colour stay
            // readable), then lay the correlated grain along that same axis. Both
            // are masked, so the void keeps its exact plate value and there is no
            // room wash and no floor speckle.
            if (traceAmount > 0.0) {
                plate *= mix(vec3(1.0), TRACE_TINT, traceMask * traceAmount);
                plate += TRACE_TINT * (traceGrain * traceMask * traceAmount * 0.55);
            }

            float outerFalloff = smoothstep(0.18, 0.92, length(centeredUv * vec2(1.02, 0.78)));
            float lowerPressure = smoothstep(0.54, 0.02, vUv.y) * pressureAmount;
            plate *= 1.0 - outerFalloff * (0.08 + pressureAmount * 0.16 + erasureAmount * 0.1);
            plate *= 1.0 - lowerPressure * 0.12;
            plate *= mix(0.86, 1.0, objectMask);

            float subtraction = smoothstep(0.28, 1.0, erasureAmount)
                * smoothstep(0.38, 0.98, lowNoise + outerFalloff * 0.34);
            plate = mix(plate, plate * vec3(0.12, 0.13, 0.15), subtraction * (0.34 + erasureAmount * 0.46));
            plate *= 1.0 - erasureAmount * 0.16;

            vec3 finalColor = mix(source, clamp(plate, 0.0, 1.0), plateStrength);
            gl_FragColor = vec4(finalColor, texel.a);
        }
    `
};

const FloorMemoryShader = {
    uniforms: {
        uMap: { value: null },
        uTime: { value: 0 },
        uOpacity: { value: 0.18 },
        uTint: { value: new THREE.Color('#a5988a') },
        uPressure: { value: 0.0 },
        uBreath: { value: 0.0 },
        uAccent: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uTint;
        uniform float uPressure;
        uniform float uBreath;
        uniform float uAccent;

        varying vec2 vUv;

        void main() {
            vec2 centered = (vUv - 0.5) * vec2(1.0, 1.18);
            float radial = 1.0 - smoothstep(0.08, 0.96, length(centered));
            float warpAmount = 0.002 + uPressure * 0.01 + uAccent * 0.008 + abs(uBreath) * 0.006;
            vec2 warpUv = vUv + vec2(
                sin(vUv.y * 17.0 + vUv.x * 4.2 + uTime * 0.042) * warpAmount,
                cos(vUv.x * 23.0 - vUv.y * 3.4 - uTime * 0.034) * warpAmount * 0.74
            );
            vec4 pool = texture2D(uMap, warpUv);
            float poolMask = clamp(pool.a * radial, 0.0, 1.0);
            float ridge = exp(-pow((length(centered * vec2(0.94, 0.72)) - (0.34 + uPressure * 0.06)) / 0.2, 2.0));
            vec3 color = uTint * (0.22 + poolMask * 0.42 + ridge * 0.16);
            float alpha = clamp(poolMask * uOpacity * 0.86 + ridge * poolMask * 0.12, 0.0, 1.0);
            gl_FragColor = vec4(color, alpha);
        }
    `
};

const ChamberShellShader = {
    uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.18 },
        uWarmth: { value: 0.0 },
        uPressure: { value: 0.0 },
        uClarity: { value: 0.8 },
        uBreath: { value: 0.0 },
        uUnfurl: { value: 0.0 },
        uThreshold: { value: 0.0 },
        uCenterVoid: { value: 0.0 },
        uAsymmetry: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uWarmth;
        uniform float uPressure;
        uniform float uClarity;
        uniform float uBreath;
        uniform float uUnfurl;
        uniform float uThreshold;
        uniform float uCenterVoid;
        uniform float uAsymmetry;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
            vec2 uv = vUv;
            float edgeFade = smoothstep(0.02, 0.18, uv.x) * (1.0 - smoothstep(0.82, 0.98, uv.x));
            float verticalFade = smoothstep(0.03, 0.20, uv.y) * (1.0 - smoothstep(0.76, 0.98, uv.y));
            float centerOffset = uv.x - (0.5 + uAsymmetry * 0.06);
            float centerDistance = abs(centerOffset);
            float centerSuppression = smoothstep(0.06, 0.24, centerDistance);
            float jambBand = exp(-pow((centerDistance - 0.22) / 0.075, 2.0));
            float lintelBand = smoothstep(0.68, 0.82, uv.y) * (1.0 - smoothstep(0.88, 0.98, uv.y));
            float foldsA = 0.5 + 0.5 * sin(uv.x * 15.0 + uv.y * 1.4 + uTime * 0.04 + uBreath * 2.2);
            float foldsB = 0.5 + 0.5 * sin(uv.x * 26.0 - uv.y * 1.9 + uTime * 0.025 - uBreath * 1.6);
            float folds = smoothstep(0.34, 0.88, mix(foldsA, foldsB, 0.32));
            float slitWidth = mix(0.03, 0.07, clamp(uUnfurl * 0.84 + uBreath * 0.18, 0.0, 1.0));
            float slit = exp(-pow((uv.x - 0.5) / max(slitWidth, 0.001), 2.0));
            float verticalWindow = smoothstep(0.06, 0.18, uv.y) * (1.0 - smoothstep(0.78, 0.96, uv.y));
            float altarGlow = slit * verticalWindow * (0.22 + uUnfurl * 0.48 + uBreath * 0.16);
            float upperWindow = smoothstep(0.08, 0.24, uv.y) * (1.0 - smoothstep(0.82, 0.98, uv.y));
            float edgeFolds = folds * centerSuppression * (0.56 + uBreath * 0.18);
            float portalPresence = jambBand * 0.72 + lintelBand * 0.28;
            float shellTexture = mix(edgeFolds + portalPresence, altarGlow, 0.22 + uClarity * 0.08 + uUnfurl * 0.06);
            float alpha = uOpacity * edgeFade * verticalFade * upperWindow * (0.14 + edgeFolds * 0.54 + altarGlow * 0.32 + portalPresence * 0.52);

            vec3 darkBase = vec3(0.022, 0.022, 0.026);
            vec3 warmLift = vec3(0.22, 0.20, 0.18);
            vec3 coldLift = vec3(0.12, 0.14, 0.18);
            vec3 lifted = mix(coldLift, warmLift, clamp(uWarmth * 1.6 + 0.18, 0.0, 1.0));
            float luminance = edgeFolds * (0.11 + uPressure * 0.07) + altarGlow * (0.10 + uClarity * 0.12) + portalPresence * (0.12 + uPressure * 0.05);
            vec3 color = mix(darkBase, lifted, clamp(luminance, 0.0, 0.42));

            float thresholdProfile = clamp(uThreshold, 0.0, 1.0);
            float buttressBand = exp(-pow((centerDistance - mix(0.22, 0.29, thresholdProfile)) / mix(0.08, 0.12, thresholdProfile), 2.0));
            float crownBand = smoothstep(0.64, 0.82, uv.y) * (1.0 - smoothstep(0.90, 0.99, uv.y));
            float thresholdBand = smoothstep(0.08, 0.22, uv.y) * (1.0 - smoothstep(0.78, 0.96, uv.y));
            float planesA = 0.5 + 0.5 * sin((uv.x + uAsymmetry * 0.02) * 12.0 + uv.y * 2.4 + uTime * 0.018);
            float planesB = 0.5 + 0.5 * sin((uv.x - uAsymmetry * 0.03) * 19.0 - uv.y * 1.8 + uTime * 0.012);
            float planes = smoothstep(0.34, 0.88, mix(planesA, planesB, 0.42));
            float supportPlanes = planes * buttressBand * (0.44 + uBreath * 0.12);
            float centralVoid = (1.0 - smoothstep(0.04, mix(0.15, 0.28, clamp(uCenterVoid, 0.0, 1.0)), centerDistance)) * thresholdBand;
            float veilBand = exp(-pow(centerOffset / mix(0.16, 0.24, thresholdProfile), 2.0))
                * smoothstep(0.18, 0.36, uv.y)
                * (1.0 - smoothstep(0.74, 0.94, uv.y));
            float thresholdPresence = buttressBand * 0.84 + crownBand * 0.32 + supportPlanes * 0.46;
            float thresholdAlpha = uOpacity
                * edgeFade
                * verticalFade
                * upperWindow
                * (0.18 + thresholdPresence * 0.76 + veilBand * 0.24)
                * (1.0 - centralVoid * 0.7);
            vec3 thresholdLift = mix(coldLift * 1.08, warmLift * 0.88, clamp(uWarmth * 1.2 + 0.16, 0.0, 1.0));
            float thresholdLuminance = thresholdPresence * (0.17 + uPressure * 0.1)
                + veilBand * (0.08 + uClarity * 0.12);
            vec3 thresholdColor = mix(darkBase * 0.88, thresholdLift, clamp(thresholdLuminance, 0.0, 0.54));
            thresholdColor += vec3(0.01, 0.012, 0.018) * veilBand * (0.4 + uClarity * 0.4);
            thresholdColor *= 1.0 - centralVoid * 0.24;

            alpha = mix(alpha, thresholdAlpha, thresholdProfile);
            color = mix(color, thresholdColor, thresholdProfile);

            float grain = (hash(vWorldPosition.xz * 0.6 + uTime * 0.002) - 0.5) * 0.02;
            color += grain;

            gl_FragColor = vec4(color, alpha);
        }
    `
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function sampleAnticipationBreath(elapsed, config) {
    if (!config || !Number.isFinite(elapsed)) {
        return { key: 0, haze: 0 };
    }
    const start = config.startSeconds ?? 103;
    const end = config.endSeconds ?? 119;
    if (elapsed < start || elapsed > end) {
        return { key: 0, haze: 0 };
    }
    const fade = smoothstep(start, start + 1.1, elapsed)
        * (1 - smoothstep(end - 1.1, end, elapsed));
    const pulse = 0.5 + 0.5 * Math.sin((elapsed - start) * Math.PI * 2 * (config.pulseHz ?? 0.31));
    return {
        key: (config.keyAmp ?? 0.04) * pulse * fade,
        haze: (config.hazeAmp ?? 0.06) * pulse * fade
    };
}

function createLinearTexture(stops, width = 256, height = 1024, horizontal = false) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const gradient = horizontal
        ? context.createLinearGradient(0, 0, width, 0)
        : context.createLinearGradient(0, 0, 0, height);

    stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createPointSpriteTexture({
    width = 192,
    height = 192,
    colorStops = [
        [0.0, 'rgba(255, 255, 255, 1)'],
        [0.16, 'rgba(255, 255, 255, 0.9)'],
        [0.44, 'rgba(255, 255, 255, 0.22)'],
        [1.0, 'rgba(0, 0, 0, 0)']
    ],
    stretchY = 1.0,
    softness = 1.0
} = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    context.scale(1, stretchY);
    const radius = (Math.min(width, height) / 2) / Math.max(stretchY, 1);
    const gradient = context.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius * softness);
    colorStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function deepMerge(base, override = {}) {
    const output = Array.isArray(base) ? [...base] : { ...base };

    Object.entries(override || {}).forEach(([key, value]) => {
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            base &&
            typeof base[key] === 'object' &&
            !Array.isArray(base[key])
        ) {
            output[key] = deepMerge(base[key], value);
            return;
        }

        output[key] = value;
    });

    return output;
}

function parsePhaseWindows(metaPhases = {}) {
    return DEFAULT_PHASE_WINDOWS.map((fallback) => {
        const raw = metaPhases?.[fallback.name];

        if (typeof raw !== 'string') {
            return { ...fallback };
        }

        const secondsMatch = raw.match(/\(([\d.]+)-([\d.]+)s\)/);
        if (secondsMatch) {
            return {
                name: fallback.name,
                start: Number(secondsMatch[1]),
                end: Number(secondsMatch[2])
            };
        }

        const timeMatch = raw.match(/(\d+):(\d+)-(\d+):(\d+)/);
        if (timeMatch) {
            const start = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
            const end = Number(timeMatch[3]) * 60 + Number(timeMatch[4]);
            return { name: fallback.name, start, end };
        }

        return { ...fallback };
    });
}

function normalizePhaseWindows(windows = []) {
    if (!Array.isArray(windows)) {
        return [];
    }

    return windows
        .map((window) => ({
            name: typeof window?.name === 'string' ? window.name : '',
            start: Number(window?.start),
            end: Number(window?.end)
        }))
        .filter((window) =>
            window.name
            && Number.isFinite(window.start)
            && Number.isFinite(window.end)
            && window.end > window.start
        )
        .sort((a, b) => a.start - b.start);
}

function parseTimecodeToSeconds(value) {
    if (Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    const match = trimmed.match(/^(?:(\d+):)?(\d+)(?:\.(\d+))?$/);
    if (!match) {
        return null;
    }

    const minutes = Number(match[1] || 0);
    const seconds = Number(match[2] || 0);
    const fractional = match[3] ? Number(`0.${match[3]}`) : 0;
    return minutes * 60 + seconds + fractional;
}

function resolveAnchoredSeconds(entry = {}, anchorsById = new Map()) {
    const anchorId = typeof entry.anchorId === 'string' ? entry.anchorId.trim() : '';
    const anchorSeconds = anchorId && anchorsById.has(anchorId)
        ? anchorsById.get(anchorId).atSeconds
        : null;
    const parsedTimecode = parseTimecodeToSeconds(entry.at);
    const fallbackSeconds = Number.isFinite(entry.atSeconds)
        ? entry.atSeconds
        : (Number.isFinite(parsedTimecode) ? parsedTimecode : 0);
    const offsetSeconds = Number.isFinite(entry.offsetSeconds) ? entry.offsetSeconds : 0;
    return (Number.isFinite(anchorSeconds) ? anchorSeconds : fallbackSeconds) + offsetSeconds;
}

function normalizeMusicalAnchors(anchors = []) {
    if (!Array.isArray(anchors)) {
        return [];
    }

    return anchors
        .map((anchor) => ({
            ...anchor,
            atSeconds: resolveAnchoredSeconds(anchor, new Map())
        }))
        .filter((anchor) => typeof anchor.id === 'string' && anchor.id.trim() && Number.isFinite(anchor.atSeconds))
        .sort((a, b) => a.atSeconds - b.atSeconds);
}

function normalizeEventBeats(beats = [], anchors = []) {
    if (!Array.isArray(beats) || !beats.length) {
        return [];
    }

    const anchorsById = new Map(normalizeMusicalAnchors(anchors).map((anchor) => [anchor.id, anchor]));

    return beats
        .map((beat) => {
            const preset = DEFAULT_EVENT_BEAT_PRESETS[beat?.type] || {};
            const merged = deepMerge(preset, beat || {});
            return {
                ...merged,
                atSeconds: resolveAnchoredSeconds(merged, anchorsById)
            };
        })
        .filter((beat) => Number.isFinite(beat.atSeconds))
        .sort((a, b) => a.atSeconds - b.atSeconds);
}

function sampleEventEnvelope(beat, elapsed) {
    if (!beat || !Number.isFinite(beat.atSeconds)) {
        return 0;
    }

    if (beat.type === EVENT_TYPE.BLACK_GAP) {
        return sampleBlackGapEnvelope(
            elapsed,
            beat.atSeconds,
            Number.isFinite(beat.durationSeconds) ? beat.durationSeconds : 0.34,
            beat.reopenSeconds
        );
    }

    return samplePlateauEnvelope(
        elapsed,
        beat.atSeconds,
        Number.isFinite(beat.durationSeconds) ? beat.durationSeconds : 0.001,
        Number.isFinite(beat.attackSeconds) ? beat.attackSeconds : Math.min((beat.durationSeconds || 0.001) * 0.22, 1.4),
        Number.isFinite(beat.releaseSeconds) ? beat.releaseSeconds : Math.min((beat.durationSeconds || 0.001) * 0.38, 2.2)
    );
}

function parseAuthoredTime(at, trackDuration = 0) {
    if (typeof at === 'string') {
        const parts = at.split(':');
        if (parts.length === 2) {
            return Number(parts[0]) * 60 + Number.parseFloat(parts[1]);
        }

        const seconds = Number.parseFloat(at);
        return Number.isFinite(seconds) ? seconds : 0;
    }

    if (at && typeof at === 'object' && Number.isFinite(at.percent)) {
        return trackDuration * at.percent;
    }

    return 0;
}

function createEventState() {
    return {
        punctuation: 0,
        roomOpen: 0,
        roomTighten: 0,
        materialReveal: 0,
        postCrush: 0,
        blackGap: 0,
        supportDelta: 0,
        thresholdDelta: 0,
        pressureDelta: 0,
        releaseDelta: 0,
        temperatureDelta: 0,
        shellDelta: 0,
        fillDelta: 0,
        backDelta: 0,
        floorDelta: 0,
        vignetteDarknessDelta: 0,
        vignetteOffsetDelta: 0,
        vignetteSoftnessDelta: 0,
        grainDelta: 0,
        bloomDelta: 0,
        materialRoughnessDelta: 0,
        materialClearcoatDelta: 0,
        materialClearcoatRoughnessDelta: 0,
        materialEnvMapIntensityDelta: 0,
        materialSheenDelta: 0,
        cameraWeight: 0,
        cameraPosition: new THREE.Vector3(),
        cameraTarget: new THREE.Vector3(),
        cameraDriftScale: null
    };
}

function resetEventState(state) {
    state.punctuation = 0;
    state.roomOpen = 0;
    state.roomTighten = 0;
    state.materialReveal = 0;
    state.postCrush = 0;
    state.blackGap = 0;
    state.supportDelta = 0;
    state.thresholdDelta = 0;
    state.pressureDelta = 0;
    state.releaseDelta = 0;
    state.temperatureDelta = 0;
    state.shellDelta = 0;
    state.fillDelta = 0;
    state.backDelta = 0;
    state.floorDelta = 0;
    state.vignetteDarknessDelta = 0;
    state.vignetteOffsetDelta = 0;
    state.vignetteSoftnessDelta = 0;
    state.grainDelta = 0;
    state.bloomDelta = 0;
    state.materialRoughnessDelta = 0;
    state.materialClearcoatDelta = 0;
    state.materialClearcoatRoughnessDelta = 0;
    state.materialEnvMapIntensityDelta = 0;
    state.materialSheenDelta = 0;
    state.cameraWeight = 0;
    state.cameraPosition.set(0, 0, 0);
    state.cameraTarget.set(0, 0, 0);
    state.cameraDriftScale = null;
}

function samplePlateauEnvelope(elapsed, start, duration, attackSeconds, releaseSeconds) {
    const safeDuration = Math.max(duration, 0.001);
    const end = start + safeDuration;

    if (elapsed < start || elapsed > end) {
        return 0;
    }

    const attack = Number.isFinite(attackSeconds)
        ? clamp(attackSeconds, 0.04, safeDuration)
        : clamp(Math.min(safeDuration * 0.24, 1.4), 0.04, Math.min(1.8, safeDuration));
    const release = Number.isFinite(releaseSeconds)
        ? clamp(releaseSeconds, 0.04, safeDuration)
        : clamp(Math.min(safeDuration * 0.28, 1.8), 0.04, Math.min(2.4, safeDuration));
    const releaseStart = Math.max(start + attack, end - release);

    if (elapsed <= start + attack) {
        return smoothstep(start, start + attack, elapsed);
    }

    if (elapsed >= releaseStart) {
        return 1 - smoothstep(releaseStart, end, elapsed);
    }

    return 1;
}

function sampleBlackGapEnvelope(elapsed, start, duration, reopenSeconds) {
    const gapDuration = Math.max(duration, 0.001);
    const reopen = Math.max(reopenSeconds ?? 0.52, 0.001);
    const attack = Math.min(0.06, gapDuration * 0.5);
    const gapEnd = start + gapDuration;
    const reopenEnd = gapEnd + reopen;

    if (elapsed < start || elapsed > reopenEnd) {
        return 0;
    }

    if (elapsed < start + attack) {
        return smoothstep(start, start + attack, elapsed);
    }

    if (elapsed <= gapEnd) {
        return 1;
    }

    return 1 - smoothstep(gapEnd, reopenEnd, elapsed);
}

function createRadialTexture(stops) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    stops.forEach(([offset, color]) => {
        gradient.addColorStop(offset, color);
    });

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createPortalTexture(width = 768, height = 1536) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, width, height);

    const verticalGradient = context.createLinearGradient(0, 0, 0, height);
    verticalGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    verticalGradient.addColorStop(0.1, 'rgba(245, 238, 228, 0.16)');
    verticalGradient.addColorStop(0.3, 'rgba(255, 248, 240, 0.62)');
    verticalGradient.addColorStop(0.55, 'rgba(255, 248, 240, 0.9)');
    verticalGradient.addColorStop(0.78, 'rgba(236, 230, 223, 0.4)');
    verticalGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    context.fillStyle = verticalGradient;
    context.fillRect(0, 0, width, height);

    const horizontalGradient = context.createLinearGradient(0, 0, width, 0);
    horizontalGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    horizontalGradient.addColorStop(0.28, 'rgba(0, 0, 0, 0.08)');
    horizontalGradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.55)');
    horizontalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    horizontalGradient.addColorStop(0.58, 'rgba(255, 255, 255, 0.55)');
    horizontalGradient.addColorStop(0.72, 'rgba(0, 0, 0, 0.08)');
    horizontalGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = horizontalGradient;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'source-over';

    const edgeGradient = context.createRadialGradient(width / 2, height * 0.42, width * 0.06, width / 2, height * 0.42, width * 0.62);
    edgeGradient.addColorStop(0.0, 'rgba(255, 248, 240, 0)');
    edgeGradient.addColorStop(0.55, 'rgba(255, 248, 240, 0)');
    edgeGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.7)');
    context.fillStyle = edgeGradient;
    context.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createBackWallTexture(width = 1024, height = 1536) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, width, height);

    const base = context.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0.0, 'rgba(10, 10, 12, 1)');
    base.addColorStop(0.18, 'rgba(7, 7, 9, 1)');
    base.addColorStop(0.5, 'rgba(2, 2, 3, 1)');
    base.addColorStop(0.82, 'rgba(5, 5, 7, 1)');
    base.addColorStop(1.0, 'rgba(12, 12, 14, 1)');
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    const centerLift = context.createRadialGradient(width * 0.52, height * 0.42, width * 0.04, width * 0.52, height * 0.42, width * 0.34);
    centerLift.addColorStop(0.0, 'rgba(26, 24, 22, 0.08)');
    centerLift.addColorStop(0.3, 'rgba(12, 12, 13, 0.03)');
    centerLift.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    context.fillStyle = centerLift;
    context.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createApertureTexture(width = 768, height = 1536) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, width, height);

    const centerGlow = context.createRadialGradient(
        width * 0.5,
        height * 0.48,
        width * 0.08,
        width * 0.5,
        height * 0.48,
        width * 0.52
    );
    centerGlow.addColorStop(0.0, 'rgba(222, 214, 204, 0.28)');
    centerGlow.addColorStop(0.2, 'rgba(198, 190, 182, 0.16)');
    centerGlow.addColorStop(0.46, 'rgba(110, 106, 102, 0.05)');
    centerGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    context.fillStyle = centerGlow;
    context.fillRect(0, 0, width, height);

    const feather = context.createLinearGradient(0, 0, 0, height);
    feather.addColorStop(0.0, 'rgba(0, 0, 0, 0.76)');
    feather.addColorStop(0.16, 'rgba(0, 0, 0, 0.18)');
    feather.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
    feather.addColorStop(0.84, 'rgba(0, 0, 0, 0.18)');
    feather.addColorStop(1.0, 'rgba(0, 0, 0, 0.76)');
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = feather;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function sampleTimedCurve(points = [], elapsed, field = 'value') {
    if (!Array.isArray(points) || !points.length) {
        return 0;
    }

    const sortedPoints = [...points].sort((a, b) => (a.atSeconds ?? 0) - (b.atSeconds ?? 0));

    if (elapsed <= (sortedPoints[0].atSeconds ?? 0)) {
        return sortedPoints[0][field] ?? 0;
    }

    for (let index = 0; index < sortedPoints.length - 1; index += 1) {
        const current = sortedPoints[index];
        const next = sortedPoints[index + 1];
        const start = current.atSeconds ?? 0;
        const end = next.atSeconds ?? start;

        if (elapsed >= start && elapsed <= end) {
            const t = smoothstep(start, end, elapsed);
            return lerp(current[field] ?? 0, next[field] ?? 0, t);
        }
    }

    return sortedPoints[sortedPoints.length - 1][field] ?? 0;
}

function getTimedCurveValue(points = [], elapsed, field, fallback = 0) {
    if (!Array.isArray(points) || !points.length) {
        return fallback;
    }

    return sampleTimedCurve(points, elapsed, field);
}

function sampleHeldTimedCurve(points = [], elapsed, field = 'value') {
    if (!Array.isArray(points) || !points.length) {
        return {
            value: 0,
            transition: 0
        };
    }

    const sortedPoints = [...points].sort((a, b) => (a.atSeconds ?? 0) - (b.atSeconds ?? 0));

    if (elapsed <= (sortedPoints[0].atSeconds ?? 0)) {
        return {
            value: sortedPoints[0][field] ?? 0,
            transition: 0
        };
    }

    for (let index = 0; index < sortedPoints.length - 1; index += 1) {
        const current = sortedPoints[index];
        const next = sortedPoints[index + 1];
        const start = current.atSeconds ?? 0;
        const end = next.atSeconds ?? start;
        const span = Math.max(end - start, 0.001);

        if (elapsed >= start && elapsed <= end) {
            const holdRatio = span <= 4 ? 0.55 : 0.72;
            const requestedTransition = Number.isFinite(next.transitionSeconds) ? next.transitionSeconds : null;
            const transitionDuration = requestedTransition !== null
                ? clamp(requestedTransition, 0.6, span)
                : clamp(span * (1 - holdRatio), 1.8, 6.0);
            const transitionStart = Math.max(start, end - transitionDuration);

            if (elapsed < transitionStart) {
                return {
                    value: current[field] ?? 0,
                    transition: 0
                };
            }

            const t = smoothstep(transitionStart, end, elapsed);
            return {
                value: lerp(current[field] ?? 0, next[field] ?? 0, t),
                transition: Math.sin(t * Math.PI)
            };
        }
    }

    return {
        value: sortedPoints[sortedPoints.length - 1][field] ?? 0,
        transition: 0
    };
}

export class ReliquaryPrototypeExperience {
    constructor(root) {
        this.root = root;
        this.urlParams = new URLSearchParams(window.location.search);
        this.autoAdvanceEnabled = this.urlParams.get('autonext') !== '0';
        this.autoAdvanceStarted = false;
        const requestedSeed = Number(this.urlParams.get('seed'));
        this.livingSeed = Number.isFinite(requestedSeed) && requestedSeed > 0
            ? Math.floor(requestedSeed)
            : Date.now() % 4294967296;
        this.track = null;
        this.journey = null;
        this.palette = { ...DEFAULT_PALETTE };
        this.audio = null;
        this.audioLoaded = false;
        this.audioState = {
            averageLevel: 0,
            bassLevel: 0,
            midLevel: 0,
            trebleLevel: 0
        };
        this.audioAccentDetector = createAudioAccentDetector();
        this.track1StageResponse = createTrack1StageResponse();
        this.pendingAudioAccent = false;
        this.analysisState = {
            smoothedAverage: 0,
            smoothedBass: 0,
            smoothedMid: 0,
            accentPulse: 0,
            accentRise: false,
            surfaceResponse: 0,
            previousBreathing: 0,
            midSustain: 0
        };
        this.state = {
            currentTime: 0,
            duration: DEFAULT_PROOF_DURATION_SECONDS,
            started: false,
            playing: false,
            muted: false,
            ready: false,
            proofComplete: false,
            hasUserStarted: false
        };
        this.animationFrame = null;
        this.clock = new THREE.Clock();
        this.pointerMoveHandler = this.handlePointerMove.bind(this);
        this.resizeHandler = this.handleResize.bind(this);
        this.pendingAudioLoad = null;
        this.isPlaybackBooting = false;
        this.qualityMode = this.resolveQualityMode();
        this.artifactMode = this.resolveArtifactMode();
        this.chamberVariantKey = this.resolveChamberVariant();
        this.chamberVariant = CHAMBER_VARIANTS[this.chamberVariantKey] || CHAMBER_VARIANTS['hard-light'];
        this.poolColor = new THREE.Color();
        this.floorCoolColor = new THREE.Color();
        this.poolWarmColor = new THREE.Color();
        this.dynamicCameraTarget = new THREE.Vector3();
        this.heroBasePosition = new THREE.Vector3();
        this.heroLightTarget = new THREE.Vector3();
        this.heroMaterialStates = [];
        this.boundaryWings = [];
        this.gazeField = null;
        this.counterGazeField = null;
        this.aisleField = null;
        this.hazePlume = null;
        this.floorMist = null;
        this.musicalAnchors = [];
        this.eventBeats = [];
        this.breathChannels = {
            shell: 0,
            beam: 0,
            pool: 0,
            frame: 0,
            echo: 0,
            unfurl: 0
        };
        this.roomClockScale = 0.35;
        this.transportStartSeconds = 0;
        this.pendingTransportElapsed = 0;
        this.requestedStartElapsed = null;
        this.audioPlaybackStarted = false;
        this.isDestroyed = false;
        this.isVisible = !document.hidden;
        this.visibilityChangeHandler = this.handleVisibilityChange.bind(this);
        this.pageHideHandler = this.handlePageHide.bind(this);
        this.disposableTextures = new Set();
        this.shadowDirty = true;
        this.lastShadowUpdateAt = -Infinity;
        this.frameTimer = null;
        this.lastFrameAt = 0;
        this.frameRate = this.resolveFrameRateConfig();
        this.dprCap = this.resolveDprCap();
        this.track5PlateEnabled = this.isTrack5CinemaVariant()
            && !this.isHorasMortasCinemaVariant()
            && this.urlParams.get('plate') !== '0'
            && this.urlParams.get('compositor') !== '0';
        this.sodiumEnabled = resolveSodiumEnabled(readSodiumParam(this.urlParams));
        this.baseToneMappingExposure = 0.84;
        this.shadowProbe = {
            intensity: 0,
            positionX: -Infinity,
            positionY: -Infinity,
            positionZ: -Infinity,
            angle: 0,
            penumbra: 0,
            targetX: 0,
            targetY: 0,
            targetZ: 0,
            heroY: 0,
            heroRotY: 0,
            heroRotZ: 0
        };
        this.lastUiUpdateAt = 0;
        this.reducedMotion = this.resolveReducedMotion();
        this.reducedMotionScale = this.reducedMotion ? 0 : 1;
        this.shotDirector = null;
        this.shotsQueryMode = null;
        this.shotDirectorConfigEnabled = false;
        // Safe default before track resolution; set by applyFilmTrackGuard (Track5 only).
        this.recutEnabled = false;
        this.lehrEnabled = false;
        this.listenEnabled = false;
        this.vigilEnabled = false;
        // Owner A/B (audit 2026-08-13): '?rimmode=commit' swaps the P6 plateau rim
        // from continuous EMA follow to the committed/hysteretic stepper. Recut-only.
        this.rimModeCommit = false;
        this.plateauRimCommit = null;
        this.shotDirectorResolved = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: {
                position: [0, 0, 0],
                target: [0, 0, 0],
                fov: 45
            }
        };
        this.shotDirectorLocalRight = new THREE.Vector3();
        this.shotDirectorLocalUp = new THREE.Vector3();
        this.shotDirectorLocalForward = new THREE.Vector3();
        this.activeShotFraming = null;
        const filmFlags = resolveFilmFlags(this.urlParams);
        this.lightArcEnabled = filmFlags.lightArc;
        this.godRayEnabled = filmFlags.godRay;
        this.godRayGroup = null;
        this.godRayMaterial = null;
        this.godRayGeometry = null;
        this.godRayIntensity = 0;
        this.mutationEnabled = filmFlags.mutation;
        this.texturedParam = filmFlags.texturedParam;
        this.texturedModelEnabled = filmFlags.textured;
        this.applyVigilFlag();
        this.relicMutation = null;
        this.lightRigResolver = null;
        this.activeLightRigId = '';
        this.activeLightSetupId = '';
        this.lightRigState = null;
        this.defaultLightSnapshot = null;
        // Step 6 recut light score (blackout + climax rim pulses + plateau EMA +
        // false dawn). Built in bootstrapShotDirector only on the ?recut=1 path;
        // null everywhere else so the default film behaves identically.
        this.recutLightScore = null;
        // Stage 2b recut visual score (forensic trace across the plateau, bars
        // 128–151). Built in bootstrapShotDirector only on the ?recut=1 path;
        // null everywhere else so the plate pass keeps its shipped uniforms.
        this.recutVisualScore = null;
        // Stage 2a recut atmosphere (distance-dependent fog/dust/background lift).
        // Built in bootstrapShotDirector only on the ?recut=1 path; null elsewhere.
        this.recutAtmosphere = null;
        this.recutAtmosphereLiftColor = null;
        this.recutLehr = null;
        this.recutListen = null;
        this.chamberPracticals = null;
        this.chamberSodium = null;
        // Stage 1B phrase-light score (middle bars 25–195). Built in
        // bootstrapShotDirector only on ?recut=1 + lightarc; null elsewhere.
        // bootstrapShotDirector only on ?recut=1 + lightarc; null elsewhere.
        this.recutPhraseLight = null;
        this.recutPhraseLightResolved = {};
        this.recutPhraseLightFrame = {};
        this.phraseCameraScratch = {
            barIndex: 0,
            setupId: '',
            setup: null,
            pose: {
                position: [0, 0, 0],
                target: [0, 0, 0],
                fov: 45
            }
        };
        this.activeLightPhraseId = '';
        this.shotDirectorBeatGrid = null;
    }

    async init() {
        this.shell = new ReliquaryShell(this.root, {
            onPrimaryAction: () => this.togglePlayback(),
            onSeek: (ratio) => this.seek(ratio),
            onRetry: () => this.retryPlayback(),
            onVolume: (value) => this.setListeningVolume(value)
        });
        this.listeningVolume = 1;
        try {
            const saved = window.localStorage.getItem('sonoite-listening-volume');
            if (saved !== null && Number.isFinite(Number(saved))) {
                this.listeningVolume = clamp(Number(saved), 0, 1);
            }
        } catch { /* Storage can be unavailable; retain the normal listening level. */ }
        this.shell.setListeningVolume(this.listeningVolume);

        await this.resolveTrack();
        await this.resolveJourney();
        this.applyVigilFlag();

        // Step 5 recut cleanup (build spec §2.1/§2.10): under canonical Track5
        // recut the centered bar-0 title card is removed; the permanent left
        // `prototype-title` stays. Flags are already resolved (applyFilmTrackGuard
        // ran in resolveTrack), so pass the suppression before setTrack mounts it.
        this.shell.setTitleCardSuppressed(this.recutEnabled === true && this.isTrack5Film());
        this.shell.setTrack(
            this.track,
            this.journey,
            this.probeLetter
                ? { label: `probe ${this.probeLetter}` }
                : { ...this.chamberVariant, key: this.chamberVariantKey }
        );
        this.shell.configureIndex({
            tracks: this.getBuiltTracks(),
            currentSlug: this.track?.slug,
            onNavigate: (slug) => this.navigateToTrack(slug)
        });
        this.shell.setPhases?.(this.phaseWindows, this.getPlaybackEndTime());
        this.shell.setStatus('loading object');
        this.shell.updateTime(0, this.proofDuration);
        this.shell.setReady(false);

        this.setupRenderer();
        this.setupScene();
        this.setupChamberPracticals();
        this.setupChamberSodium();
        this.setupPostProcessing();
        this.createAtmosphere();
        if (this.chamberConfig.living
            && this.chamberConfig.living.enabled !== false
            && !this.isHorasMortasCinemaVariant()) {
            this.livingChamber = new LivingChamber({
                seed: this.livingSeed,
                config: this.resolveLivingConfig(this.chamberConfig.living)
            });
            this.livingChamber.attach(this.scene, this.camera, this.keyLight);
            console.info('[Prototype] living seed', this.livingSeed);
        }
        await this.loadHero();
        if (this.usesTrack1Reliquary()) {
            await this.loadStageDrape();
        }
        if (this.isDestroyed) {
            return;
        }
        this.setupAudio();
        this.bindEvents();

        this.state.ready = true;
        this.shell.setStatus('ready');
        this.shell.setReady(true);
        this.warnIfProofTruncatesEvents();
        if (this.urlParams.get('fillmeter') === '1') {
            this.fillMeter = createFillMeter({ renderer: this.renderer, root: this.root });
        }
        this.setupTweakPanel();
        this.render();
        this.preloadAudioInBackground();
        this.tryAutoContinue();
    }

    // Vestibular safety: Prompt #141 introduced camera translation, drifting
    // bokeh and light flicker with no opt-out. Under reduced motion the three
    // motion channels are zeroed at the CONFIG seam so living-chamber.js stays
    // free of media queries. The slow light LFOs survive — they are not
    // vestibular, and killing them would leave a dead room rather than a calm one.
    resolveReducedMotion() {
        const requested = (this.urlParams.get('motion') || '').trim().toLowerCase();
        if (requested === 'reduce' || requested === 'off' || requested === 'none') {
            return true;
        }
        if (requested === 'full') {
            return false;
        }
        return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    }

    resolveLivingConfig(living) {
        this.reducedMotion = this.resolveReducedMotion();
        this.reducedMotionScale = this.reducedMotion ? 0 : 1;
        let resolved = living;
        if (this.reducedMotion) {
            console.info('[Prototype] reduced motion: ambient camera drift, breath, FOV pulse, hero float, bokeh and flicker disabled');
            resolved = {
                ...resolved,
                flicker: { ...(resolved.flicker || {}), depth: 0 },
                cameraBreath: { ...(resolved.cameraBreath || {}), amp: [0, 0, 0] },
                bokeh: { ...(resolved.bokeh || {}), count: 0, opacityMax: 0 }
            };
        }
        // Step 5 recut cleanup (build spec §2.10): the audio-led recut removes the
        // soft glowing bokeh orbs entirely. Zeroing count/opacityMax at the CONFIG
        // seam means LivingChamber never builds the sprite group (living-chamber.js
        // gates creation on count > 0), so nothing is added to the scene and
        // disposal on that layer stays a no-op. Default and reduced-motion paths
        // are unaffected outside the recut and physical-scene comparisons.
        if (this.recutEnabled === true || this.usesPhysicalScene()) {
            resolved = {
                ...resolved,
                bokeh: { ...(resolved.bokeh || {}), count: 0, opacityMax: 0 }
            };
        }
        if (this.usesPhysicalScene()) {
            resolved = { ...resolved, gobo: { ...resolved.gobo, enabled: false } };
        }
        return resolved;
    }

    // Proof mode compresses the MACRO timeline only: events, camera score,
    // lighting score and the living layer still run on transport time, which is
    // clamped to proofDuration. Anything authored past that second cannot fire,
    // so a compressed run is a preview — never valid evidence for event or
    // probe judgment. Warn loudly rather than silently showing a partial piece.
    warnIfProofTruncatesEvents() {
        const cutoff = this.proofDuration;
        const dropped = (this.eventBeats || []).filter((beat) => beat.atSeconds > cutoff);
        if (!dropped.length) {
            return;
        }
        console.warn(
            `[Prototype] ?proof=${Math.round(cutoff)}s truncates transport time: `
            + `${dropped.length} of ${this.eventBeats.length} authored event beats cannot fire `
            + `(first missed: ${dropped[0].id} @ ${dropped[0].atSeconds}s). `
            + 'Phases still sweep the full arc, so this run is a preview only — '
            + 'judge events, probes and the ending on an uncompressed playthrough.'
        );
    }

    setupTweakPanel() {
        if (this.urlParams.get('tweak') !== '1' || !this.shell?.buildTweakPanel) {
            return;
        }
        const lighting = this.chamberConfig.lighting || {};
        const post = this.chamberConfig.post;
        const defs = [
            {
                id: 'keyBase',
                label: 'key',
                min: 0,
                max: 3.4,
                step: 0.01,
                get: () => lighting.keyBase ?? 1,
                set: (value) => {
                    lighting.keyBase = value;
                }
            },
            {
                id: 'rimBase',
                label: 'rim',
                min: 0,
                max: 3,
                step: 0.01,
                get: () => lighting.rimBase ?? 1,
                set: (value) => {
                    lighting.rimBase = value;
                }
            },
            {
                id: 'backBase',
                label: 'back',
                min: 0,
                max: 3,
                step: 0.01,
                get: () => lighting.backBase ?? 1,
                set: (value) => {
                    lighting.backBase = value;
                }
            },
            {
                id: 'fillBase',
                label: 'fill',
                min: 0,
                max: 0.4,
                step: 0.002,
                get: () => lighting.fillBase ?? 0.03,
                set: (value) => {
                    lighting.fillBase = value;
                }
            },
            {
                id: 'grainIntensity',
                label: 'grain',
                min: 0,
                max: 0.2,
                step: 0.001,
                get: () => post.grainIntensity ?? 0,
                set: (value) => {
                    post.grainIntensity = value;
                }
            },
            {
                id: 'bloomStrength',
                label: 'bloom',
                min: 0,
                max: 1.2,
                step: 0.005,
                get: () => post.bloomStrength ?? 0,
                set: (value) => {
                    post.bloomStrength = value;
                }
            }
        ];
        this.shell.buildTweakPanel(defs);
    }

    async resolveTrack() {
        const tracks = window.sonoiteData?.tracks || [];
        const requestedSlug = resolveEntryTrackSlug(this.urlParams);
        this.track = tracks.find((track) => String(track.slug || '').toLowerCase() === requestedSlug)
            || tracks.find((track) => String(track.slug || '').toLowerCase() === DEFAULT_ENTRY_TRACK_SLUG)
            || tracks.find((track) => String(track.slug || '').toLowerCase() === DEFAULT_TRACK_SLUG)
            || tracks[0]
            || null;

        if (!this.track) {
            throw new Error('Prototype track metadata not found in sonoiteData.tracks');
        }
        this.applyFilmTrackGuard();
    }

    getBuiltTracks() {
        const tracks = window.sonoiteData?.tracks || [];
        return BUILT_TRACK_CYCLE
            .map((slug) => tracks.find((track) => String(track.slug || '').toLowerCase() === slug))
            .filter(Boolean);
    }

    getNextBuiltTrackSlug() {
        const current = String(this.track?.slug || '').toLowerCase();
        const index = BUILT_TRACK_CYCLE.indexOf(current);
        if (index === -1) {
            return BUILT_TRACK_CYCLE[0];
        }
        return BUILT_TRACK_CYCLE[(index + 1) % BUILT_TRACK_CYCLE.length];
    }

    getTrackNavigationUrl(slug) {
        const url = new URL(window.location.href);
        const currentParams = new URLSearchParams(url.search);
        url.search = '';
        url.hash = '';
        // An album transition starts a new film. Experiments (including future
        // flags) stay on their explicit deep links, never on the next track.
        for (const key of ['seed', 'quality', 'dpr', 'fps', 'motion', 'autonext']) {
            if (currentParams.has(key)) {
                url.searchParams.set(key, currentParams.get(key));
            }
        }
        url.searchParams.set('track', slug);
        return url.href;
    }

    navigateToTrack(slug, { fadeMs = 1200, autoContinue = false } = {}) {
        const nextSlug = String(slug || '').trim().toLowerCase();
        if (!nextSlug || nextSlug === String(this.track?.slug || '').toLowerCase()) {
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            const start = performance.now();
            const step = (now) => {
                const progress = Math.min(1, (now - start) / fadeMs);
                this.shell?.setFrameMaskOpacity(progress);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                    return;
                }

                if (autoContinue) {
                    try {
                        window.sessionStorage.setItem('sonoite-autonext-continue', JSON.stringify({ slug: nextSlug, at: Date.now() }));
                    } catch { /* Continue normally when storage is unavailable. */ }
                }
                window.location.assign(this.getTrackNavigationUrl(nextSlug));
                resolve(true);
            };
            window.requestAnimationFrame(step);
        });
    }

    async tryAutoContinue() {
        let entry;
        try {
            const raw = window.sessionStorage.getItem('sonoite-autonext-continue');
            if (!raw) {
                return;
            }
            window.sessionStorage.removeItem('sonoite-autonext-continue');
            entry = JSON.parse(raw);
        } catch {
            return;
        }
        const age = Date.now() - entry?.at;
        if (entry?.slug !== this.track?.slug || !Number.isFinite(age) || age < 0 || age >= 30000) {
            return;
        }
        try {
            await this.ensureTrackLoaded();
            this.shell.hideIntro();
            this.autoContinuing = true;
            const started = await this.togglePlayback({ silent: true });
            if (!started) {
                this.shell.restoreThreshold();
            }
        } catch {
            this.shell.restoreThreshold();
        } finally {
            this.autoContinuing = false;
        }
    }

    completePlayback() {
        if (this.playbackCompleted) {
            return;
        }
        this.playbackCompleted = true;
        this.state.proofComplete = true;
        this.state.currentTime = this.getPlaybackEndTime();
        if (this.audio?.isPlaying) {
            this.audio.pause();
        }
        this.state.playing = false;
        this.audioPlaybackStarted = false;
        this.shell.setPlaying(false);
        this.shell.showChrome();
        this.shell.updateTime(this.state.currentTime, this.getPlaybackEndTime());
        this.shell.setStatus('track end');
        this.handleTrackEnd();
    }

    handleTrackEnd() {
        if (!this.autoAdvanceEnabled || this.autoAdvanceStarted) {
            return;
        }
        this.autoAdvanceStarted = true;
        const nextSlug = this.getNextBuiltTrackSlug();
        this.navigateToTrack(nextSlug, { autoContinue: true }).catch((error) => {
            console.warn('[Prototype] Auto-advance failed', error);
            this.autoAdvanceStarted = false;
        });
    }

    isTrack5Film() {
        return String(this.track?.slug || '').toLowerCase() === DEFAULT_TRACK_SLUG;
    }

    applyVigilFlag() {
        this.vigilEnabled = this.isSonoiteCinemaVariant()
            && resolveVigilEnabled(readVigilParam(this.urlParams));
    }

    resolveFilmFlagContext() {
        return {
            trackSlug: String(this.track?.slug || '').toLowerCase(),
            variantKey: this.chamberVariantKey || ''
        };
    }

    applyFilmTrackGuard() {
        if (!this.isTrack5Film()) {
            this.lightArcEnabled = false;
            this.godRayEnabled = false;
            this.mutationEnabled = false;
            this.recutEnabled = false;
            this.lehrEnabled = false;
            this.listenEnabled = false;
            this.rimModeCommit = false;
            return;
        }
        const filmFlags = resolveFilmFlags(this.urlParams, this.resolveFilmFlagContext());
        this.lightArcEnabled = filmFlags.lightArc;
        this.godRayEnabled = filmFlags.godRay;
        this.mutationEnabled = filmFlags.mutation;
        this.recutEnabled = filmFlags.recut;
        this.lehrEnabled = filmFlags.lehr;
        this.listenEnabled = filmFlags.listen;
        this.rimModeCommit = filmFlags.rimMode === 'commit';
        // Step 5 recut cleanup (build spec §2.1/§2.10): the audio-led recut
        // removes the volumetric god ray entirely, overriding the film-flag
        // aggregate and any explicit ?godray=1 request. Forcing the flag false
        // here prevents createGodRay() construction and keeps updateGodRay() a
        // no-op; the default film path keeps its god ray untouched.
        if (this.recutEnabled) {
            this.godRayEnabled = false;
        }
    }

    ensureRelicMutation() {
        if (!this.mutationEnabled || !this.isTrack5Film() || this.relicMutation) {
            return;
        }
        // The Track 5 ledger needs the tar to read as black, wet mass (not a grey
        // or white sheen): near-black diffuse, sparse connected highlights.
        let mutationOptions = {};
        if (this.usesTrack5Ledger()) {
            mutationOptions = { tarDarken: 0.06, tarRoughness: 0.2, coatRoughness: 0.18, frontierOvershoot: 0.12 };
        } else if (this.getCinematicProposal()) {
            mutationOptions = { tarRoughness: 0.23, coatRoughness: 0.18 };
        }
        this.relicMutation = createRelicMutation(mutationOptions);
    }

    async resolveJourney() {
        try {
            this.journey = await loadJourneyByTrackId(this.track.id);
            this.palette = {
                ...DEFAULT_PALETTE,
                ...(this.journey?.palette || {})
            };
        } catch (error) {
            console.warn('[Prototype] Journey load failed, using defaults', error);
        }

        this.phaseWindows = parsePhaseWindows(this.journey?.meta?._phases || {});
        this.fullPhaseDuration = this.phaseWindows?.[this.phaseWindows.length - 1]?.end || DEFAULT_PROOF_DURATION_SECONDS;
        this.heroConfig = this.getHeroConfig();
        this.heroConfig = deepMerge(this.heroConfig, this.chamberVariant?.hero || {});
        this.heroConfig = this.applyPrototypeHeroOverrides(this.heroConfig);
        this.chamberConfig = this.buildChamberConfig();
        this.applyRescoreCameraBeats();
        this.applySacristyPreset();
        this.applyFillstackPreset();
        this.applyEnoArcsPreset();
        this.applyWithholdPreset();
        this.applyCommitPreset();
        const proposal = this.getCinematicProposal();
        if (proposal) {
            // The Track 4 ledger keeps the film's own camera so the comparison
            // with the default film isolates the light.
            if (!this.isTrack5Film() && !this.getTrack4LedgerArm()) {
                this.chamberConfig.camera = createProposalCamera(this.chamberConfig.camera, this.track.slug, proposal,
                    this.urlParams.get('stagehold') === '1');
            }
            let baseExposure = 0.95;
            if (this.isHorasMortasCinemaVariant()) {
                baseExposure = 0.9;
            } else if (this.usesTrack1Reliquary()) {
                baseExposure = 0.65;
            }
            this.chamberConfig.post.baseExposure = baseExposure;
            this.chamberConfig.post.grainAccentGain = 0;
            this.chamberConfig.post.bloomAccentGain = 0;
            this.chamberConfig.heroLaw = { ...this.chamberConfig.heroLaw, erasureScale: 0 };
        }
        if (this.usesTrack4Edit()) {
            this.chamberConfig.camera = applyTrack4Edit(this.chamberConfig.camera);
        }
        const authoredPhaseWindows = normalizePhaseWindows(this.chamberConfig?.phaseWindows || []);
        if (authoredPhaseWindows.length) {
            this.phaseWindows = authoredPhaseWindows;
            this.fullPhaseDuration = authoredPhaseWindows[authoredPhaseWindows.length - 1].end;
        }
        if (Number.isFinite(this.chamberConfig?.post?.baseExposure)) {
            this.baseToneMappingExposure = this.chamberConfig.post.baseExposure;
        }
        this.musicalAnchors = normalizeMusicalAnchors(this.chamberConfig?.stage3?.musicalAnchors || []);
        // suppressEventIds lets a probe variant remove an authored beat without
        // copying the whole array (deepMerge replaces arrays wholesale), so a
        // probe can be judged unconfounded by a beat at the same second.
        const suppressed = new Set(this.chamberConfig?.stage3?.suppressEventIds || []);
        this.eventBeats = normalizeEventBeats(
            [
                ...(this.chamberConfig?.stage3?.eventBeats || []),
                ...(this.chamberConfig?.stage3?.extraEventBeats || [])
            ].filter((beat) => !suppressed.has(beat?.id)),
            this.musicalAnchors
        );
        this.proofDuration = this.resolveProofDuration();
        this.floorCoolColor.set(this.chamberConfig.colors.floorCool);
        this.poolWarmColor.set(this.chamberConfig.colors.floorWarm);
        await this.bootstrapShotDirector();
    }

    resolveShotsQueryMode() {
        return resolveFilmFlags(this.urlParams, this.resolveFilmFlagContext()).shotsMode;
    }

    /**
     * Read-only shot director probe for external diagnostics.
     *
     * @param {number} timeSeconds
     * @return {{
     *   available: boolean,
     *   active: boolean,
     *   timeSeconds: number,
     *   setupId: string|null,
     *   barIndex: number|null,
     *   framing: *|null,
     *   lightRig: string|null,
     *   pose: *|null
     * }} Snapshot of shot director state at the given time.
     */
    getShotState(timeSeconds) {
        const base = {
            available: false,
            active: false,
            timeSeconds,
            setupId: null,
            barIndex: null,
            framing: null,
            lightRig: null,
            pose: null
        };
        const director = this.shotDirector;
        if (!director) {
            return base;
        }
        const resolved = director.resolve(timeSeconds, this.shotDirectorResolved);
        const active = typeof director.isActive === 'function'
            ? director.isActive()
            : Boolean(director.isActive);
        if (!resolved) {
            return {
                ...base,
                available: true,
                active
            };
        }
        const pose = resolved.pose;
        let poseSnapshot = null;
        if (pose) {
            poseSnapshot = {
                position: [pose.position[0], pose.position[1], pose.position[2]],
                target: [pose.target[0], pose.target[1], pose.target[2]],
                fov: pose.fov
            };
        }
        const framingRaw = resolved.setup?.framing ?? null;
        let framingSnapshot = null;
        if (typeof framingRaw === 'string') {
            framingSnapshot = framingRaw;
        } else if (framingRaw) {
            framingSnapshot = { ...framingRaw };
        }
        return {
            available: true,
            active,
            timeSeconds,
            setupId: resolved.setupId ?? null,
            barIndex: resolved.barIndex ?? null,
            framing: framingSnapshot,
            lightRig: resolved.setup?.lightRig ?? null,
            pose: poseSnapshot
        };
    }

    /**
     * Read-only lighting probe for external diagnostics.
     *
     * @param {number} timeSeconds
     * @return {{
     *   enabled: boolean,
     *   rigId: string|null,
     *   exposure: number|null,
     *   godRay: { enabled: boolean, intensity: number },
     *   bokeh: { visibility: number }
     * }} Snapshot of lighting and god-ray state at the given time.
     */
    getLightState(timeSeconds) {
        const shotLightRig = this.getShotState(timeSeconds).lightRig;
        const rigId = this.activeLightRigId || shotLightRig || null;
        let exposure = null;
        if (rigId && this.lightRigResolver && typeof this.lightRigResolver.exposureAt === 'function') {
            exposure = this.lightRigResolver.exposureAt(rigId, timeSeconds);
        }
        return {
            enabled: this.lightArcEnabled,
            rigId,
            exposure,
            godRay: {
                enabled: this.godRayEnabled,
                intensity: this.godRayEnabled ? godRayIntensityAt(timeSeconds) : 0
            },
            bokeh: {
                visibility: bokehArrivalAt(timeSeconds)
            }
        };
    }

    /**
     * Read-only relic mutation probe for external diagnostics.
     *
     * @param {number} timeSeconds
     * @return {{
     *   enabled: boolean,
     *   installed: boolean,
     *   amount: number,
     *   minY: number|null,
     *   maxY: number|null,
     *   upgradedCount: number|null
     * }} Snapshot of relic mutation state at the given time.
     */
    getMutationState(timeSeconds) {
        const mutationState = this.relicMutation?.getState?.();
        return {
            enabled: this.mutationEnabled,
            installed: mutationState?.installed ?? false,
            amount: mutationAmountAt(timeSeconds),
            minY: mutationState?.minY ?? null,
            maxY: mutationState?.maxY ?? null,
            upgradedCount: mutationState?.upgradedCount ?? null
        };
    }

    resolveShotDirectorBeatGridUrl(trackSlug) {
        const relativePath = `public/assets/journeys/analysis/${trackSlug}/beats.json`;
        if (typeof window.sonoiteData !== 'undefined' && window.sonoiteData.themeUrl) {
            return `${window.sonoiteData.themeUrl}/${relativePath}`;
        }
        return `./${relativePath}`;
    }

    async fetchShotDirectorBeatGrid(trackSlug) {
        const primaryUrl = this.resolveShotDirectorBeatGridUrl(trackSlug);
        const fallbackPaths = [
            primaryUrl,
            `/homem/wp-content/themes/sonoite-theme/public/assets/journeys/analysis/${trackSlug}/beats.json`,
            `/wp-content/themes/sonoite-theme/public/assets/journeys/analysis/${trackSlug}/beats.json`
        ];
        for (const url of fallbackPaths) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    continue;
                }
                return await response.json();
            } catch (error) {
                if (window.SONOITE_DEBUG) {
                    console.warn('[Prototype] ShotDirector beat grid fetch failed', url, error);
                }
            }
        }
        return null;
    }

    async bootstrapShotDirector() {
        const shotsMode = this.resolveShotsQueryMode();
        this.shotsQueryMode = shotsMode;
        this.shotDirectorConfigEnabled = false;
        this.recutPhraseLight = null;
        this.recutLightScore = null;
        this.recutVisualScore = null;
        this.recutAtmosphere = null;
        this.recutAtmosphereLiftColor = null;
        this.recutLehr = null;
        this.recutListen = null;
        this.plateauRimCommit = null;
        this.activeLightPhraseId = '';
        this.shotDirectorBeatGrid = null;
        this.recutPhraseLightResolved.id = '';
        this.recutPhraseLightResolved.lightRig = '';
        this.recutPhraseLightResolved.anchorPosition = null;
        this.recutPhraseLightResolved.anchorTarget = null;
        this.recutPhraseLightFrame.phraseId = '';
        this.recutPhraseLightFrame.rigId = '';
        this.recutPhraseLightFrame.anchorPosition = null;
        this.recutPhraseLightFrame.anchorTarget = null;
        this.recutPhraseLightFrame.anchorFov = 0;
        this.recutPhraseLightFrame.rekey = false;
        if (!this.isTrack5Film()) {
            this.shotDirector = null;
            return;
        }
        if (!shotsMode && !this.lightArcEnabled && !this.recutEnabled) {
            this.shotDirector = null;
            return;
        }

        const trackSlug = String(this.track?.slug || DEFAULT_TRACK_SLUG).toLowerCase();
        const beatGrid = await this.fetchShotDirectorBeatGrid(trackSlug);
        if (!beatGrid) {
            this.shotDirector = null;
            if (shotsMode === 'debug') {
                // eslint-disable-next-line no-console -- ?shots=debug validation surface
                console.info('[Prototype] ShotDirector inactive: beat grid fetch failed (legacy camera)');
            }
            return;
        }
        this.shotDirectorBeatGrid = beatGrid;

        // Canonical Track5 `?recut=1` composes default head/tail seams around the
        // authored 25-cut recut middle via createTrack5RecutCameraConfig; every other
        // path uses the existing chamber camera config exactly.
        const chamberCameraConfig = this.chamberConfig?.camera || {};
        const recutActive = this.recutEnabled === true && this.isTrack5Film();
        let cameraConfig = recutActive
            ? createTrack5RecutCameraConfig({
                defaultCamera: TRACK5_FILM_DIRECTOR_CAMERA,
                recutCamera: TRACK5_RECUT_DIRECTOR_CAMERA
            })
            : chamberCameraConfig;
        if (!recutActive && this.usesTarPassageCut()) {
            cameraConfig = createTrack5TarPassageCamera(cameraConfig);
        }
        // The Track 5 ledger owns its camera plan (no setups behind the wall).
        cameraConfig = this.usesTrack5Ledger()
            ? applyTrack5LedgerCamera(cameraConfig)
            : createProposalCamera(cameraConfig, trackSlug, this.getCinematicProposal());
        const directorConfig = cameraConfig.director || {};
        this.shotDirectorConfigEnabled = directorConfig.enabled === true;
        const defaultTargetPoint = Array.isArray(cameraConfig.target)
            ? cameraConfig.target
            : DEFAULT_CHAMBER_CONFIG.camera.target;

        const directorEnabledForResolve = shotsMode === 'debug'
            || this.shotDirectorConfigEnabled
            || this.lightArcEnabled
            || recutActive;

        this.shotDirector = createShotDirector({
            enabled: directorEnabledForResolve,
            setups: cameraConfig.setups || {},
            cutTimeline: cameraConfig.cutTimeline || {},
            accentCuts: cameraConfig.accentCuts || [],
            beatGrid,
            defaultTargetPoint,
            heightYByClass: directorConfig.heightYByClass,
            enforceOrbitBudget: directorConfig.enforceOrbitBudget === true
        });

        const validation = this.shotDirector.validate();
        if (shotsMode === 'debug') {
            // eslint-disable-next-line no-console -- ?shots=debug validation surface
            console.info('[Prototype] ShotDirector validation', validation);
            window.SonoiteShotDirector = this.shotDirector;
            window.SonoiteShotDirectorDebugState = (timeSeconds = 0) => (
                this.shotDirector.getDebugState(timeSeconds)
            );
        }

        if (!this.shotDirector.isActive()) {
            if (window.SONOITE_DEBUG) {
                console.info('[Prototype] ShotDirector inactive — legacy camera path');
            }
        }

        // Step 6: the recut light score reuses the SAME loaded beat grid to
        // precompute its blackout / climax-pulse / false-dawn schedule once. Only
        // built on the recut path; the default film keeps a null score.
        this.recutLightScore = recutActive ? createRecutLightScore({ beatGrid }) : null;
        // Owner A/B: the committed plateau rim replaces the continuous EMA follow
        // only when explicitly requested; null keeps variant A byte-identical.
        this.plateauRimCommit = recutActive && this.rimModeCommit === true
            ? createPlateauRimCommit()
            : null;
        if (this.plateauRimCommit) {
            // eslint-disable-next-line no-console -- owner A/B surface
            console.info('[Prototype] RIMMODE commit on — P6 plateau rim steps between held levels (A/B vs default follow)');
        }

        // Stage 2a: distance-dependent atmosphere for the recut middle. Pure and
        // seek-safe; its window envelope is 0 outside 64–504s so the accepted
        // opening and ending are untouched. Off the recut path it stays null and
        // every consuming expression takes its original branch unchanged.
        this.recutAtmosphere = recutActive ? createRecutAtmosphere() : null;
        this.recutAtmosphereLiftColor = this.recutAtmosphere
            ? new THREE.Color(this.recutAtmosphere.getConfig().backgroundLiftColor)
            : null;
        this.recutLehr = recutActive && this.lehrEnabled === true ? createRecutLehr() : null;
        if (this.recutLehr) {
            // eslint-disable-next-line no-console -- owner A/B surface
            console.info('[Prototype] LEHR lookdev test on — window 64–504s, recut path only');
        }
        this.recutListen = recutActive && this.listenEnabled === true ? createRecutListen() : null;
        if (this.recutListen) {
            this.commitReactions = createCommitReactions({
                seed: this.livingSeed,
                config: RECUT_LISTEN_COMMIT_CONFIG
            });
            // eslint-disable-next-line no-console -- owner A/B surface
            console.info('[Prototype] LISTEN test on — commits + rotating rim/floor/bloom, window 64–504s');
        }

        // Stage 2b: the forensic trace score reuses the SAME loaded beat grid to
        // freeze its four plateau downbeats once. Recut-only, and dropped entirely
        // if the grid cannot supply those bars — a half-authored trace could hand
        // the false dawn a non-zero value, so it fails to the neutral path.
        this.recutVisualScore = null;
        if (recutActive) {
            const visualCandidate = createRecutVisualScore({ beatGrid });
            const visualValidation = visualCandidate.validate();
            if (visualValidation.ok) {
                this.recutVisualScore = visualCandidate;
            } else {
                // eslint-disable-next-line no-console -- an unusable beat grid must surface in all builds
                console.warn('[Prototype] Recut visual score invalid', visualValidation.errors);
            }
        }

        // Stage 1B: phrase-light score freezes rig orientation/aim to each phrase
        // start anchor on the recut middle. Invalid tables warn unconditionally and
        // leave null so the existing setup-based fallback remains byte-identical.
        if (
            recutActive
            && this.lightArcEnabled
            && this.shotDirector?.isActive?.()
        ) {
            const lightRigIds = createLightRigResolver().listIds();
            // Phrase-start anchors intentionally use the canonical full-motion pose
            // (no reducedMotion flag) so direct seek and platform output stay deterministic.
            const resolveCameraAt = (timeSeconds) => (
                this.shotDirector?.resolve
                    ? this.shotDirector.resolve(timeSeconds, this.phraseCameraScratch)
                    : null
            );
            const phraseCandidate = createRecutPhraseLight({
                beatGrid: this.shotDirectorBeatGrid,
                phraseTable: TRACK5_RECUT_FILM_TIMELINE.lightPhrases,
                resolveCameraAt,
                lightRigIds
            });
            const phraseValidation = phraseCandidate.validate();
            if (phraseValidation.ok) {
                this.recutPhraseLight = phraseCandidate;
            } else {
                // eslint-disable-next-line no-console -- invalid authored phrase table must surface in all builds
                console.warn('[Prototype] Recut phrase-light score invalid', phraseValidation.errors);
            }
        }

        this.ensureLightRigResolver();
    }

    isRecutActive() {
        return this.recutEnabled === true && this.isTrack5Film();
    }

    ensureLightRigResolver() {
        if (!this.isTrack5Film() || !this.lightArcEnabled || this.lightRigResolver || !this.keyLight) {
            return;
        }

        const cameraConfig = this.chamberConfig?.camera || {};
        const target = Array.isArray(cameraConfig.target)
            ? cameraConfig.target
            : DEFAULT_CHAMBER_CONFIG.camera.target;

        this.lightRigResolver = createLightRigResolver({ subjectPoint: target });
        this.lightRigState = this.lightRigResolver.createState();
        this.defaultLightSnapshot = {
            keyPosition: this.keyLight.position.toArray(),
            keyAngle: this.keyLight.angle,
            keyPenumbra: this.keyLight.penumbra,
            rimPosition: this.rimLight.position.toArray(),
            backPosition: this.backLight.position.toArray()
        };
    }

    restoreDefaultLightRigPositions() {
        if (!this.defaultLightSnapshot || !this.keyLight) {
            return;
        }

        const snap = this.defaultLightSnapshot;
        this.keyLight.position.fromArray(snap.keyPosition);
        this.keyLight.angle = snap.keyAngle;
        this.keyLight.penumbra = snap.keyPenumbra;
        this.rimLight.position.fromArray(snap.rimPosition);
        this.backLight.position.fromArray(snap.backPosition);
    }

    shouldApplyLightRig() {
        return this.lightArcEnabled && this.isTrack5Film();
    }

    resolveShotDirectorForLighting(trackTimeSeconds) {
        if (!this.shotDirector?.resolve) {
            return;
        }
        const reducedMotion = this.isSurfaceShotLocked(trackTimeSeconds)
            || this.reducedMotion === true || (this.reducedMotionScale ?? 1) <= 0;
        this.shotDirector.resolve(this.getSurfaceStudyShotTime(trackTimeSeconds), this.shotDirectorResolved, { reducedMotion });
    }

    applyLightRigPositions(rigState, keyAimTarget) {
        const subjectDefault = this.chamberConfig?.camera?.target ?? DEFAULT_CHAMBER_CONFIG.camera.target;
        const [sx, sy, sz] = subjectDefault;
        const [kx, ky, kz] = rigState.key.position;
        this.keyLight.position.set(kx, ky, kz);

        const applyDirectional = (light, direction) => {
            if (!direction) {
                return;
            }
            light.position.set(
                sx + direction[0] * 10,
                sy + direction[1] * 10,
                sz + direction[2] * 10
            );
        };

        applyDirectional(this.rimLight, rigState.rim.direction);
        applyDirectional(this.backLight, rigState.back.direction);

        if (Array.isArray(keyAimTarget) && keyAimTarget.length >= 3) {
            this.keyLight.target.position.set(keyAimTarget[0], keyAimTarget[1], keyAimTarget[2]);
            this.keyLight.target.updateMatrixWorld();
        }
    }

    applyShotDirectorCamera(trackTimeSeconds) {
        const shotTime = this.getSurfaceStudyShotTime(trackTimeSeconds);
        const reducedMotion = this.isSurfaceShotLocked(trackTimeSeconds)
            || this.reducedMotion === true || (this.reducedMotionScale ?? 1) <= 0;
        const resolved = this.shotDirector.resolve(
            shotTime,
            this.shotDirectorResolved,
            { reducedMotion }
        );
        if (!resolved?.pose) {
            return false;
        }

        const ambientMotion = this.reducedMotionScale ?? 1;
        const [posX, posY, posZ] = resolved.pose.position;
        const [targetX, targetY, targetZ] = resolved.pose.target;

        this.camera.position.set(posX, posY, posZ);
        this.dynamicCameraTarget.set(targetX, targetY, targetZ);
        if (Math.abs(this.camera.fov - resolved.pose.fov) > 0.001) {
            this.camera.fov = resolved.pose.fov;
            this.camera.updateProjectionMatrix();
        }

        this.activeShotFraming = resolved.setup?.framing ?? null;

        const lehrSettle = this.recutLehr && reducedMotion !== true
            ? this.recutLehr.cutSettleAt(
                trackTimeSeconds,
                Number.isFinite(resolved.cutTimeSeconds)
                    ? trackTimeSeconds - resolved.cutTimeSeconds
                    : 999
            )
            : 0;
        if (lehrSettle > 0) {
            this.shotDirectorLocalForward.set(
                targetX - posX,
                targetY - posY,
                targetZ - posZ
            ).normalize();
            this.camera.position.addScaledVector(this.shotDirectorLocalForward, -lehrSettle);
        }

        const localMotion = this.isSurfaceShotLocked(trackTimeSeconds) ? 0 : (resolved.setup?.localMotion ?? 0);
        const livingCam = this.livingChamber?.outputs.camOffset;
        if (localMotion > 0 && livingCam) {
            this.shotDirectorLocalForward.set(
                targetX - posX,
                targetY - posY,
                targetZ - posZ
            ).normalize();
            this.shotDirectorLocalUp.set(0, 1, 0);
            this.shotDirectorLocalRight.crossVectors(
                this.shotDirectorLocalUp,
                this.shotDirectorLocalForward
            ).normalize();
            this.shotDirectorLocalUp.crossVectors(
                this.shotDirectorLocalForward,
                this.shotDirectorLocalRight
            );
            const offsetScale = localMotion * ambientMotion;
            this.camera.position.addScaledVector(this.shotDirectorLocalRight, (livingCam.x ?? 0) * offsetScale);
            this.camera.position.addScaledVector(this.shotDirectorLocalUp, (livingCam.y ?? 0) * offsetScale);
            this.camera.position.addScaledVector(this.shotDirectorLocalForward, (livingCam.z ?? 0) * offsetScale);
        }

        this.camera.lookAt(this.dynamicCameraTarget);

        return true;
    }

    getHeroConfig() {
        const structureElements = this.journey?.structureElements || this.journey?.structure?.elements || [];
        const heroConfig = structureElements.find((element) =>
            ['artifact_model', 'reliquary_hero', 'track5_hero_model'].includes(element.type)
        );
        return deepMerge(DEFAULT_HERO_CONFIG, heroConfig?.params || {});
    }

    // Placement only — NOT the title-card/plate/decoration gates. sonoite-cinema
    // reuses the Track 5 relic as its placeholder hero (owner 2026-08-13), and
    // its camera targets were measured against the cinema placement (H=7.42),
    // so it must share the plinth numbers without inheriting Track 5 chrome.
    usesCinemaHeroPlacement() {
        return this.isTrack5CinemaVariant()
            || this.chamberVariantKey === 'sonoite-cinema'
            || this.chamberVariantKey === 'horas-mortas-cinema';
    }

    applyPrototypeHeroOverrides(config) {
        const output = { ...config };
        const explicitHeight = Number(this.urlParams.get('targetHeight') || this.urlParams.get('scale'));
        const hasExplicitHeight = Number.isFinite(explicitHeight) && explicitHeight > 0;
        const wasShrunkForMainShell = (output.targetHeight || 0) < 5;

        // ?artifact= selects the MATERIAL treatment, not the mesh: journey-authored
        // modelUrl/fallbackModelUrl survive so the Blender relic stays reachable
        // (PARITY.md's parity URL depends on this). ?relic=meshy (or static default)
        // forces the code-side Meshy defaults; ?relic=blender keeps journey primary first.
        const relicChoice = this.resolveRelicChoice();
        if (relicChoice === 'meshy') {
            output.modelUrl = DEFAULT_HERO_CONFIG.modelUrl;
            output.fallbackModelUrl = DEFAULT_HERO_CONFIG.fallbackModelUrl;
        }

        if (this.urlParams.get('artifact')) {
            if (!output.modelUrl) {
                output.modelUrl = DEFAULT_HERO_CONFIG.modelUrl;
            }
            if (!output.fallbackModelUrl) {
                output.fallbackModelUrl = DEFAULT_HERO_CONFIG.fallbackModelUrl;
            }
            output.preserveTextures = this.artifactMode === 'textured';
        }

        if (this.texturedParam === '0') {
            output.preserveTextures = false;
        }

        if (wasShrunkForMainShell) {
            output.centerY = 1.78;
            output.offsetX = 1.08;
            output.offsetY = 0.24;
            output.offsetZ = 0;
        }

        if (this.usesCinemaHeroPlacement()) {
            output.centerY = 1.72;
            output.offsetX = 0.96;
            output.offsetY = 0.18;
            output.offsetZ = -0.04;
        }

        if (hasExplicitHeight) {
            output.targetHeight = clamp(explicitHeight, 1.2, 9);
        } else if (this.usesCinemaHeroPlacement()) {
            output.targetHeight = 7.42;
        } else if (wasShrunkForMainShell) {
            output.targetHeight = 5.86;
        }

        return output;
    }

    buildChamberConfig() {
        const fogColor = new THREE.Color(this.palette.fog || DEFAULT_PALETTE.fog);
        const accentColor = new THREE.Color(this.palette.accent || DEFAULT_PALETTE.accent);
        const structureElements = this.journey?.structureElements || this.journey?.structure?.elements || [];
        const chamberOverride = structureElements.find((element) =>
            ['prototype_chamber', 'reliquary_chamber'].includes(element.type)
        );
        const trackTimingOverrides = {};
        const chamberParams = chamberOverride?.params || {};
        const chamber = deepMerge(DEFAULT_CHAMBER_CONFIG, {
            colors: {
                floor: this.heroConfig.baseColor || '#ece6df',
                hazePrimary: `#${fogColor.clone().lerp(accentColor, 0.22).getHexString()}`,
                hazeSecondary: `#${fogColor.clone().lerp(accentColor, 0.12).getHexString()}`,
                accent: `#${new THREE.Color(this.heroConfig.baseColor || '#ece6df').lerp(accentColor, 0.14).getHexString()}`,
                floorCool: `#${new THREE.Color(this.palette.secondary || DEFAULT_PALETTE.secondary).lerp(new THREE.Color(this.heroConfig.baseColor || '#ece6df'), 0.18).getHexString()}`,
                floorWarm: `#${new THREE.Color(this.heroConfig.baseColor || '#ece6df').clone().offsetHSL(-0.016, 0.026, 0.018).getHexString()}`
            }
        });

        if (Number.isFinite(chamberParams.proofDurationSeconds)) {
            trackTimingOverrides.proofDurationSeconds = chamberParams.proofDurationSeconds;
        }

        if (Array.isArray(chamberParams.camera?.score) && chamberParams.camera.score.length) {
            trackTimingOverrides.camera = {
                ...(trackTimingOverrides.camera || {}),
                score: chamberParams.camera.score
            };
        }

        if (Array.isArray(chamberParams.stage3?.roomPressureBeats) && chamberParams.stage3.roomPressureBeats.length) {
            trackTimingOverrides.stage3 = {
                ...(trackTimingOverrides.stage3 || {}),
                roomPressureBeats: chamberParams.stage3.roomPressureBeats
            };
        }

        if (Array.isArray(chamberParams.stage3?.musicalAnchors) && chamberParams.stage3.musicalAnchors.length) {
            trackTimingOverrides.stage3 = {
                ...(trackTimingOverrides.stage3 || {}),
                musicalAnchors: chamberParams.stage3.musicalAnchors
            };
        }

        if (Array.isArray(chamberParams.stage3?.eventBeats) && chamberParams.stage3.eventBeats.length) {
            trackTimingOverrides.stage3 = {
                ...(trackTimingOverrides.stage3 || {}),
                eventBeats: chamberParams.stage3.eventBeats
            };
        }

        const variantTimelineApplies = Array.isArray(this.chamberVariant?.timelineTrackSlugs)
            ? this.chamberVariant.timelineTrackSlugs.includes(String(this.track?.slug || '').toLowerCase())
            : true;
        this.variantTimelineApplies = variantTimelineApplies;

        if (!variantTimelineApplies && this.chamberVariant?.timeline) {
            // eslint-disable-next-line no-console -- silent wrong-track fallback must surface
            console.warn('[Prototype] Variant timeline ignored — track slug not in timelineTrackSlugs', this.track?.slug);
        }

        return deepMerge(
            deepMerge(
                deepMerge(chamber, chamberOverride?.params || {}),
                this.chamberVariant?.chamber || {}
            ),
            deepMerge(
                trackTimingOverrides,
                variantTimelineApplies ? (this.chamberVariant?.timeline || {}) : {}
            )
        );
    }

    // E1 bloom taste A/B for Gate 1 (docs/qa/AESTHETIC_UX_SYNTHESIS_2026-07-20.md, E1/C4).
    //
    // Runtime-verified 2026-07-20: keyLight.angle/penumbra are rewritten per frame by
    // updateLighting from variant lerp endpoints plus pressure/accent/breath terms, so a
    // config-level cone trim would be inert — none is applied. That negative result is
    // the durable finding here.
    //
    // Corrected 2026-07-20b: this preset originally described 0.14 as restoring a
    // "documented baseline" that 0.08 had drifted from. That was backwards. 0.14 comes
    // from MUSIC_INTERACTION_MATRIX.md:158 — a row in the PRE-RESET void-runtime table
    // (its neighbours name void_sphere, void_halo, Track5VoidDirector, EggOrb), not Path
    // B canon. 0.08 is the deliberate authored override in CHAMBER_VARIANTS
    // ['track5-cinema']. The flag survives ONLY as a taste comparison with no canonical
    // claim: the owner may well prefer 0.14, but he is choosing it, not restoring it.
    applyRescoreCameraBeats() {
        if (this.urlParams.get('rescore') !== '1' || this.chamberVariantKey !== 'track5-cinema') {
            return;
        }
        const baseScore = this.chamberConfig.camera?.score;
        if (!Array.isArray(baseScore) || !baseScore.length) {
            return;
        }
        // Transitions ARRIVE at atSeconds (updateCamera:5104-5105 clamps transitionStart to the
        // segment start), so atSeconds marks when the move COMPLETES: A drifts 73-110, B pushes
        // 260-285, C pushes 370-450 (0.049 m/s, at Grok's nausea cap).
        const extraBeats = [
            { atSeconds: 110, transitionSeconds: 37, position: [-2.8, 2.37, 10.12], target: [1.03, 2.09, -0.1], driftScale: 0.045, fov: 40 },
            { atSeconds: 285, transitionSeconds: 25, position: [-2.14, 2.27, 9.64], target: [1.03, 2.03, 0.03], driftScale: 0.015, fov: 38.5 },
            { atSeconds: 450, transitionSeconds: 80, position: [-1.62, 2.3, 7.26], target: [1.0, 2.35, -0.1], driftScale: 0.012, fov: 40 }
        ];
        const score = [...baseScore, ...extraBeats].sort((left, right) => left.atSeconds - right.atSeconds);
        this.chamberConfig.camera = {
            ...(this.chamberConfig.camera || {}),
            score
        };
    }

    applySacristyPreset() {
        if (this.urlParams.get('sacristy') !== '1') {
            return;
        }
        this.chamberConfig.post = this.chamberConfig.post || {};
        this.chamberConfig.post.bloomStrength = 0.14;
        console.info('[Prototype] bloom taste A/B: 0.08 (authored Path B) -> 0.14 (not canon — pre-reset void value, offered for comparison only)');
    }

    // E4 fill-stack committed-or-absent batch for Gate 1 owner A/B (docs/qa/AESTHETIC_UX_SYNTHESIS_2026-07-20.md, E4/C5).
    applyFillstackPreset() {
        if (this.urlParams.get('fillstack') !== '1') {
            return;
        }
        this.chamberConfig.variant = this.chamberConfig.variant || {};
        this.chamberConfig.variant.frontHazeIdleOpacity = 0.108;
        this.chamberConfig.variant.shellOpacityBase = 0.15;
        this.chamberConfig.living = this.chamberConfig.living || {};
        this.chamberConfig.living.bokeh = Object.assign({}, this.chamberConfig.living.bokeh, { opacityMax: 0.225 });
        console.info('[Prototype] fillstack preset: frontHazeIdle 0.108, shellBase 0.15, bokehMax 0.225');
    }

    // E5 Eno temperature arcs for the RELEASE-owner probe design (docs/qa/AESTHETIC_UX_SYNTHESIS_2026-07-20.md, E5).
    // Autonomous slow arcs on the warmth axis (25% breathing budget; temperature is a lighting driver, not Layer-0 palette).
    applyEnoArcsPreset() {
        if (this.urlParams.get('enoarcs') !== '1') {
            return;
        }
        this.chamberConfig.living = this.chamberConfig.living || {};
        this.chamberConfig.living.enoTempDepth = 0.15;
        console.info('[Prototype] eno-arcs preset: tempShift depth 0.15 (periods 37s/59s)');
    }

    // E3 withheld-reveal opening for Gate 1 owner A/B (docs/qa/AESTHETIC_UX_SYNTHESIS_2026-07-20.md, E3).
    // Attentional pacing, NOT Turrell physiology: hold reveal at 0.10 until t=15s, dawn to 1.0 by t=40s.
    applyWithholdPreset() {
        if (this.urlParams.get('withhold') !== '1') {
            return;
        }
        this.withholdEnabled = true;
        console.info('[Prototype] withhold preset: reveal floor 0.10 until 15s, dawn to 1.0 by 40s');
    }

    // RELEASE-owner candidate 3: music picks WHICH authored state the room holds,
    // instead of the clock being the only thing that decides. Deliberately crosses
    // the Layer-0 line on the light law (never on camera or relic transform) —
    // that crossing IS the experiment. See commit-reactions.js for the argument.
    applyCommitPreset() {
        if (this.urlParams.get('commit') !== '1') {
            return;
        }
        this.commitReactions = createCommitReactions({
            seed: this.livingSeed,
            config: this.chamberConfig.commitReactions || {}
        });
        console.info('[Prototype] commit-reactions: music-triggered held states, RELEASE window 337-534s');
    }

    getWithholdMix(elapsed) {
        if (!this.withholdEnabled) {
            return 1;
        }
        const floor = 0.10;
        const holdSeconds = 15;
        const dawnSeconds = 25;
        return floor + (1 - floor) * smoothstep(holdSeconds, holdSeconds + dawnSeconds, elapsed);
    }

    resolveProofDuration() {
        const explicit = Number(this.urlParams.get('proof') || this.urlParams.get('duration'));
        if (Number.isFinite(explicit) && explicit > 15) {
            return Math.min(explicit, this.fullPhaseDuration || explicit);
        }

        return this.fullPhaseDuration
            || this.chamberConfig?.proofDurationSeconds
            || this.phaseWindows?.find((phase) => phase.name === 'VOID')?.end
            || DEFAULT_PROOF_DURATION_SECONDS;
    }

    getTimelineElapsed(displayElapsed) {
        const proofDuration = Math.max(this.proofDuration, 0.001);
        const phaseDuration = Math.max(this.fullPhaseDuration || proofDuration, proofDuration);

        if (proofDuration >= phaseDuration - 0.001) {
            return displayElapsed;
        }

        const displayProgress = clamp(displayElapsed / proofDuration, 0, 1);
        const easedProgress = Math.pow(displayProgress, 1.24);
        return clamp(easedProgress * phaseDuration, 0, phaseDuration);
    }

    getPlaybackEndTime() {
        const proof = Math.max(Number.isFinite(this.proofDuration) ? this.proofDuration : DEFAULT_PROOF_DURATION_SECONDS, 0.001);
        const audioDuration = Number.isFinite(this.audio?.duration) && this.audio.duration > 0
            ? this.audio.duration
            : proof;
        return Math.min(proof, audioDuration);
    }

    resolveQualityMode() {
        const requested = (this.urlParams.get('quality') || (this.urlParams.get('cinema') === '1' ? QUALITY_MODE.CINEMA : QUALITY_MODE.BALANCED)).toLowerCase();
        return Object.values(QUALITY_MODE).includes(requested) ? requested : QUALITY_MODE.BALANCED;
    }

    isCinemaQuality() {
        return this.qualityMode === QUALITY_MODE.CINEMA || this.qualityMode === QUALITY_MODE.HIGH;
    }

    resolveArtifactMode() {
        const requested = (this.urlParams.get('artifact') || '').toLowerCase();
        if (['untextured', 'grey', 'gray'].includes(requested)) {
            return 'untextured';
        }
        if (requested === 'textured') {
            return 'textured';
        }
        if ((this.urlParams.get('textured') || '') === '1') {
            return 'textured';
        }

        const requestedVariant = (
            this.urlParams.get('variant') || resolveDefaultChamberVariant(this.urlParams)
        ).trim().toLowerCase();
        if (requestedVariant === 'sonoite-cinema' || requestedVariant === 'horas-mortas-cinema') {
            return 'untextured';
        }
        return this.isCinemaQuality() || this.isTrack5CinemaVariant(requestedVariant) ? 'textured' : 'untextured';
    }

    // Static export seeds sonoiteData.relic; ?relic= overrides. WP payloads omit the field — null keeps legacy textured/fallback swap.
    resolveRelicChoice() {
        const param = (this.urlParams.get('relic') || '').trim().toLowerCase();
        if (param === 'meshy' || param === 'blender' || param === 'materials') {
            return param;
        }
        const fromPayload = (window.sonoiteData?.relic || '').trim().toLowerCase();
        if (fromPayload === 'meshy' || fromPayload === 'blender') {
            return fromPayload;
        }
        return null;
    }

    getCinematicProposal() {
        // The Track 4 state ledger is built on the Stage room (physical wall,
        // grounded fixture, single shadow-casting key at the tube).
        if (this.getTrack4LedgerArm() || this.usesTrack5Ledger()) {
            return 'stage';
        }
        return resolveCinematicProposal(this.urlParams,
            this.track?.slug || this.urlParams.get('track'), this.chamberVariantKey);
    }

    usesPhysicalScene() {
        const slug = this.track?.slug || this.urlParams.get('track');
        if (this.getCinematicProposal()) {
            return true;
        }
        return slug === 'nao-querer-nada' && this.chamberVariantKey === 'track5-cinema'
            && this.urlParams.get('scene') === 'physical';
    }

    usesTarPassageCut() {
        return this.usesPhysicalScene() && (this.track?.slug || this.urlParams.get('track')) === 'nao-querer-nada' && !this.recutEnabled
            && this.urlParams.get('passage') !== 'hold';
    }

    usesRoomRevealStudy() {
        return !this.getCinematicProposal() && this.usesPhysicalScene() && !this.recutEnabled
            && this.urlParams.get('room') === 'readable';
    }

    usesClothRoomStudy() {
        return !this.getCinematicProposal() && this.usesPhysicalScene() && !this.recutEnabled
            && this.urlParams.get('room') === 'cloth';
    }

    usesShadowDrape() {
        return this.getCinematicProposal() === 'stage'
            && (this.track?.slug || this.urlParams.get('track')) === 'sonoite'
            && this.urlParams.get('drape') !== '0';
    }

    usesTrack1Reliquary() {
        return this.getCinematicProposal() === 'stage'
            && (this.track?.slug || this.urlParams.get('track')) === 'sonoite'
            && this.urlParams.get('setting') === 'reliquary';
    }

    getTrack4LedgerArm() {
        const arm = (this.urlParams.get('ledger') || '').trim().toLowerCase();
        const slug = String(this.track?.slug || this.urlParams.get('track') || '').toLowerCase();
        if (!TRACK4_LEDGER_ARMS.includes(arm) || slug !== 'horas-mortas'
            || this.chamberVariantKey !== 'horas-mortas-cinema'
            || this.urlParams.get('recut') === '1' || this.urlParams.has('proof') || this.urlParams.has('duration')) {
            return null;
        }
        return arm;
    }

    usesTrack5Ledger() {
        const slug = String(this.track?.slug || this.urlParams.get('track') || '').toLowerCase();
        return this.urlParams.get('ledger') === '1' && slug === 'nao-querer-nada'
            && this.chamberVariantKey === 'track5-cinema'
            && this.urlParams.get('recut') !== '1' && !this.urlParams.has('proof') && !this.urlParams.has('duration');
    }

    usesTrack4Edit() {
        const slug = String(this.track?.slug || this.urlParams.get('track') || '').toLowerCase();
        return this.urlParams.get('edit') === '1' && slug === 'horas-mortas'
            && this.chamberVariantKey === 'horas-mortas-cinema'
            && this.urlParams.get('recut') !== '1' && !this.urlParams.has('proof') && !this.urlParams.has('duration');
    }

    usesTrack1LightSequence() {
        return this.getCinematicProposal() === 'stage'
            && (this.track?.slug || this.urlParams.get('track')) === 'sonoite'
            && this.urlParams.get('light') === 'sequence';
    }

    usesQuietScene() {
        return this.chamberVariantKey === 'sonoite-cinema'
            && String(this.track?.slug || this.urlParams.get('track') || DEFAULT_ENTRY_TRACK_SLUG).toLowerCase() === 'sonoite'
            && this.urlParams.get('scene') !== 'original';
    }

    resolveChamberVariant() {
        const probeLetter = (this.urlParams.get('probe') || '').trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(probeLetter)) {
            const mapped = this.resolveProbeVariant(probeLetter);
            if (mapped) {
                return mapped;
            }
        }
        const explicitVariant = this.urlParams.get('variant');
        if (explicitVariant !== null && explicitVariant.trim() !== '') {
            const requested = explicitVariant.trim().toLowerCase();
            return Object.prototype.hasOwnProperty.call(CHAMBER_VARIANTS, requested)
                ? requested
                : resolveDefaultChamberVariant(this.urlParams);
        }
        return resolveDefaultChamberVariant(this.urlParams);
    }

    // The track5-cinema FAMILY: the canonical cinema variant plus its RELEASE2 A/B
    // siblings (track5-cinema-fill / -hush), which deepMerge from it and MUST share
    // its film plate, hero placement/scale, textured-artifact path, and relic
    // decoration — otherwise the Blender relic renders raw/pale on those variants
    // and the camera scores frame a differently-placed relic. Probe variants
    // (track5-probe-*) are intentionally excluded.
    isTrack5CinemaVariant(key = this.chamberVariantKey) {
        return key === 'track5-cinema' || key.startsWith('track5-cinema-');
    }

    isSonoiteCinemaVariant(key = this.chamberVariantKey) {
        return key === 'sonoite-cinema';
    }

    isHorasMortasCinemaVariant(key = this.chamberVariantKey) {
        return key === 'horas-mortas-cinema';
    }

    // Blind probe protocol: ?probe=A-D maps letters onto a per-session shuffle
    // of [control + three probes]. The mapping is hidden until reveal so the
    // owner judges without knowing which session is doctrine-pure.
    resolveProbeVariant(letter) {
        const pool = ['track5-cinema', 'track5-probe-bleach', 'track5-probe-relic', 'track5-probe-eno'];
        const storageKey = 'sonoite-probe-map';
        let order = null;
        try {
            const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
            if (Array.isArray(stored) && stored.length === pool.length && stored.every((key) => pool.includes(key))) {
                order = stored;
            }
        } catch (error) {
            order = null;
        }
        if (!order) {
            // Seeded shuffle: the permutation is reproducible from ?seed=, so a
            // fresh tab can rejoin the same blind session instead of reshuffling.
            let shuffleState = (this.livingSeed % 4294967296) + 0x9E3779B9;
            const nextRandom = () => {
                shuffleState = (shuffleState * 1664525 + 1013904223) % 4294967296;
                return shuffleState / 4294967296;
            };
            order = [...pool];
            for (let i = order.length - 1; i > 0; i -= 1) {
                const j = Math.floor(nextRandom() * (i + 1));
                const held = order.at(i);
                order.splice(i, 1, order.at(j));
                order.splice(j, 1, held);
            }
            try {
                window.sessionStorage.setItem(storageKey, JSON.stringify(order));
            } catch (error) {
                // Session storage unavailable; keep the in-memory order.
            }
        }
        this.probeLetter = letter;
        this.probeOrder = order;
        window.__revealProbe = () => {
            console.table(['A', 'B', 'C', 'D'].map((probe, index) => ({ probe, variant: order.at(index) })));
        };
        return order.at(letter.charCodeAt(0) - 65);
    }

    resolveFrameRateConfig() {
        const requested = Number(this.urlParams.get('fps'));
        const playing = Number.isFinite(requested) && requested > 0
            ? clamp(requested, 12, 60)
            : 30;
        const settled = this.isCinemaQuality() ? 20 : 24;
        const idle = this.isCinemaQuality() ? 10 : 12;

        return {
            playing,
            settled: Math.min(playing, settled),
            idle: Math.min(playing, idle)
        };
    }

    resolveDprCap() {
        const requested = Number(this.urlParams.get('dpr'));
        if (Number.isFinite(requested) && requested > 0) {
            return clamp(requested, 0.75, 1.5);
        }

        if (this.qualityMode === QUALITY_MODE.HIGH) {
            return 1.5;
        }
        if (this.qualityMode === QUALITY_MODE.CINEMA) {
            return 1.35;
        }
        if (this.qualityMode === QUALITY_MODE.SAFE) {
            return 0.85;
        }

        return 1.0;
    }

    getMsaaSamples() {
        if (!this.renderer?.capabilities?.isWebGL2) {
            return 0;
        }
        const requested = Number(this.urlParams.get('msaa'));
        if (Number.isFinite(requested) && requested >= 0) {
            return clamp(Math.round(requested), 0, 8);
        }
        if (this.qualityMode === QUALITY_MODE.HIGH) {
            return 4;
        }
        if (this.qualityMode === QUALITY_MODE.SAFE) {
            return 0;
        }
        return 2;
    }

    getRendererPixelRatio() {
        return Math.min(window.devicePixelRatio || 1, this.dprCap);
    }

    getFrameIntervalMs() {
        const fps = this.state.playing
            ? this.frameRate.playing
            : this.state.started
                ? this.frameRate.settled
                : this.frameRate.idle;

        return 1000 / Math.max(fps, 1);
    }

    scheduleNextFrame() {
        if (this.isDestroyed || !this.isVisible || this.animationFrame || this.frameTimer) {
            return;
        }

        const elapsed = performance.now() - this.lastFrameAt;
        const delay = Math.max(0, this.getFrameIntervalMs() - elapsed);
        this.frameTimer = window.setTimeout(() => {
            this.frameTimer = null;
            if (this.isDestroyed || !this.isVisible || this.animationFrame) {
                return;
            }
            this.animationFrame = window.requestAnimationFrame(this.render);
        }, delay);
    }

    shouldPreserveHeroMaterials() {
        return shouldPreserveHeroModelMaterials({
            texturedParam: this.texturedParam,
            loadedHeroModelUrl: this.loadedHeroModelUrl,
            heroConfig: this.heroConfig,
            defaultConfig: DEFAULT_HERO_CONFIG,
            artifactMode: this.artifactMode,
            hasArtifactParam: Boolean(this.urlParams.get('artifact')),
            preserveTexturesParam: this.urlParams.get('preserveTextures') === '1',
            themeUrl: window.sonoiteData?.themeUrl || ''
        });
    }

    setupRenderer() {
        this.canvas = this.shell.canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.isCinemaQuality(),
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.AgXToneMapping || THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.baseToneMappingExposure;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(this.getRendererPixelRatio());
        this.renderer.setSize(this.root.clientWidth, this.root.clientHeight, false);

        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.backgroundCoolColor = new THREE.Color('#05070c');
        this.backgroundWarmColor = new THREE.Color('#17100d');
        this.scene.background = this.backgroundCoolColor.clone();
        const fogDensity = Number.isFinite(this.chamberConfig.fogDensity) ? this.chamberConfig.fogDensity : null;
        const fogColor = this.chamberConfig.fogColor || this.palette.fog || '#10131d';
        this.scene.fog = Number.isFinite(fogDensity) && fogDensity > 0
            ? new THREE.FogExp2(fogColor, fogDensity)
            : (
                this.chamberConfig.darknessMode === DARKNESS_MODE.SACRISTY
                    ? null
                    : new THREE.FogExp2(this.palette.fog || '#10131d', this.chamberConfig.fogDensity || 0.011)
            );
        const roomEnvironment = new RoomEnvironment();
        const environmentIntensity = this.chamberConfig.environmentIntensity
            ?? (this.chamberConfig.darknessMode === DARKNESS_MODE.SACRISTY ? 0.004 : 0.025);
        if (this.isHorasMortasCinemaVariant()) {
            const pmremScene = new THREE.Scene();
            pmremScene.background = new THREE.Color(0x020201);
            const stripMaterial = new THREE.MeshStandardMaterial({
                color: SODIUM_COLOR_RUN,
                emissive: new THREE.Color(SODIUM_COLOR_RUN),
                emissiveIntensity: 3.5
            });
            const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.04), stripMaterial);
            strip.position.set(0.92, 5.6, -0.6);
            pmremScene.add(strip);
            this.environmentTarget = this.pmremGenerator.fromScene(
                pmremScene,
                environmentIntensity
            );
            strip.geometry.dispose();
            stripMaterial.dispose();
        } else {
            this.environmentTarget = this.pmremGenerator.fromScene(roomEnvironment, environmentIntensity);
        }
        this.scene.environment = this.environmentTarget.texture;
        roomEnvironment.dispose();

        const baseFov = this.chamberConfig.camera.baseFov ?? 40;
        this.camera = new THREE.PerspectiveCamera(baseFov, this.root.clientWidth / this.root.clientHeight, 0.1, 80);
        const cameraBase = this.chamberConfig.camera.basePosition || DEFAULT_CHAMBER_CONFIG.camera.basePosition;
        const cameraTarget = this.chamberConfig.camera.target || DEFAULT_CHAMBER_CONFIG.camera.target;
        this.baseCameraPosition = new THREE.Vector3(cameraBase[0], cameraBase[1], cameraBase[2]);
        this.camera.position.copy(this.baseCameraPosition);
        this.cameraTarget = new THREE.Vector3(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        this.camera.lookAt(this.cameraTarget);

        this.heroGroup = new THREE.Group();
        this.scene.add(this.heroGroup);

        const keyColor = new THREE.Color('#e0e4eb');
        const rimColor = new THREE.Color('#8d95b2');
        this.keyCoolColor = new THREE.Color('#dde1e9');
        this.keyWarmColor = new THREE.Color('#f0dcc1');
        this.sonoiteWrapKeyColor = new THREE.Color('#e8b070');
        this.rimCoolColor = new THREE.Color('#7d89aa');
        this.rimWarmColor = new THREE.Color('#b39a83');
        if (this.isSonoiteCinemaVariant()) {
            // D3: relic key/rim warm toward 2700–3000K — no grey highlights above ~35% luma.
            this.keyWarmColor.set(authoredAmberHexForKelvin(2900));
            this.rimWarmColor.set(authoredAmberHexForKelvin(2800));
            this.sonoiteWrapKeyColor.set(authoredAmberHexForKelvin(2850));
            this.sonoiteKeyIgnitionWarm = new THREE.Color(authoredAmberHexForKelvin(2950));
            this.sonoiteRimIgnitionWarm = new THREE.Color(authoredAmberHexForKelvin(2750));
        }
        this.backCoolColor = new THREE.Color(this.chamberConfig?.lighting?.backCoolColor ?? '#ced5df');
        this.backWarmColor = new THREE.Color('#d6c0a8');
        this.rigKeyColor = new THREE.Color();
        this.rigRimColor = new THREE.Color();
        this.rigBackColor = new THREE.Color();

        this.keyLight = new THREE.SpotLight(keyColor, 2.7, 30, 0.38, 0.58, 1.0);
        this.keyLight.position.set(-2.7, 6.8, 5.4);
        this.keyLight.castShadow = true;
        const shadowMapSize = this.isCinemaQuality()
            ? 1536
            : (this.qualityMode === QUALITY_MODE.SAFE ? 768 : 1024);
        this.keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        this.keyLight.shadow.bias = -0.0002;
        this.keyLight.shadow.normalBias = 0.012;
        this.keyLight.target.position.copy(this.cameraTarget);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);

        this.rimLight = new THREE.DirectionalLight(rimColor, 1.55);
        this.rimLight.position.set(3.4, 2.9, -4.2);
        this.scene.add(this.rimLight);

        this.fillLight = new THREE.AmbientLight('#2d3038', 0.03);
        this.scene.add(this.fillLight);

        this.backLight = new THREE.DirectionalLight('#f1eef0', 0.42);
        this.backLight.position.set(0.8, 2.8, -5.4);
        this.scene.add(this.backLight);
        if (this.usesQuietScene()) {
            this.defaultLightSnapshot = {
                keyPosition: this.keyLight.position.toArray(),
                keyAngle: this.keyLight.angle,
                keyPenumbra: this.keyLight.penumbra,
                rimPosition: this.rimLight.position.toArray(),
                backPosition: this.backLight.position.toArray()
            };
        }

        this.setupChamberSurfaces();

        this.roomBase = {
            lightTarget: new THREE.Vector3(this.cameraTarget.x + 0.02, this.cameraTarget.y + 0.22, this.cameraTarget.z - 0.18)
        };
    }

    setupChamberSurfaces() {
        if (this.usesPhysicalScene()) {
            const aftermath = this.getCinematicProposal() === 'stage' && this.isTrack5Film();
            this.physicalChamber = createPhysicalChamber({ aftermath, surfaceDetail: !this.usesTrack1Reliquary() });
            if (aftermath) {
                RectAreaLightUniformsLib.init();
                this.stageSoftbox = new THREE.RectAreaLight('#d2d6dc', 0, 5, 0.8);
                this.stageSoftbox.name = 'stageSoftbox';
                this.stageSoftbox.position.set(6, 2, -6);
                this.stageSoftbox.lookAt(0.96, -1.82, -0.04);
                this.scene.add(this.stageSoftbox);
            }
            if (this.usesClothRoomStudy()) {
                this.physicalDrape = createPhysicalDrape();
                this.physicalChamber.add(this.physicalDrape);
            } else if (this.getCinematicProposal() === 'stage'
                && (this.track?.slug || this.urlParams.get('track')) === 'sonoite') {
                // Keep the comparison receiver available while hidden so the owner
                // can switch surfaces without reloading or restarting the music.
                if (!this.usesTrack1Reliquary()) {
                    this.physicalDrape = createShadowDrape();
                    this.physicalChamber.add(this.physicalDrape);
                }
                this.track1LightOccluder = createTrack1LightOccluder();
                this.scene.add(this.track1LightOccluder);
            }
            this.physicalWallWash = new THREE.SpotLight('#d5d7da', 0, 40, 0.95, 1, 2);
            this.physicalWallWash.name = 'physicalWallWash';
            this.physicalWallWash.position.set(-8, 5, -3);
            this.physicalWallWash.target.position.set(-3, 3, -9);
            if (this.physicalDrape?.name === 'shadowDrape' || this.usesTrack1Reliquary()) {
                // Spread the cloth's fill from above. The old close emitter made
                // a bright circular patch compete with the relic's cast shadow.
                this.physicalWallWash.position.set(-7.5, 8.5, 0.5);
                this.physicalWallWash.target.position.set(-3.5, 2.5, -7);
                this.physicalWallWash.angle = 1.05;
            }
            this.scene.add(this.physicalChamber, this.physicalWallWash, this.physicalWallWash.target);
            return;
        }
        this.shadowCatcher = new THREE.Mesh(
            new THREE.PlaneGeometry(this.usesQuietScene() ? 100 : 18, this.usesQuietScene() ? 100 : 14),
            this.usesQuietScene() ? new THREE.MeshStandardMaterial({
                color: '#0b0c0d', roughness: 0.95, metalness: 0, envMapIntensity: 0
            }) : new THREE.ShadowMaterial({
                color: '#000000',
                opacity: 0.32
            })
        );
        this.shadowCatcher.rotation.x = -Math.PI / 2;
        this.shadowCatcher.position.set(1.1, -2.4, -0.45);
        this.shadowCatcher.receiveShadow = true;
        this.scene.add(this.shadowCatcher);

        const floorTexture = createRadialTexture(
            this.chamberConfig.variant?.floorTextureStops || [
                [0, 'rgba(214, 205, 194, 0.58)'],
                [0.16, 'rgba(166, 156, 146, 0.24)'],
                [0.42, 'rgba(52, 54, 63, 0.06)'],
                [1, 'rgba(0, 0, 0, 0)']
            ]
        );
        this.disposableTextures.add(floorTexture);
        const floorMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(FloorMemoryShader.uniforms),
            vertexShader: FloorMemoryShader.vertexShader,
            fragmentShader: FloorMemoryShader.fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide
        });
        floorMaterial.uniforms.uMap.value = floorTexture;
        floorMaterial.uniforms.uTint.value = new THREE.Color(this.chamberConfig.colors.floor);
        this.floorGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(this.chamberConfig.ground.width, this.chamberConfig.ground.height),
            floorMaterial
        );
        this.floorGlow.rotation.x = -Math.PI / 2;
        this.floorGlow.position.set(1.12, -2.14, -0.54);
        this.scene.add(this.floorGlow);

        if (this.isSonoiteCinemaVariant()) {
            const mistTexture = createRadialTexture([
                [0, 'rgba(255, 216, 176, 0.38)'],
                [0.18, 'rgba(255, 196, 150, 0.1)'],
                [0.42, 'rgba(200, 160, 120, 0.03)'],
                [1, 'rgba(0, 0, 0, 0)']
            ]);
            this.disposableTextures.add(mistTexture);
            this.floorMist = new THREE.Mesh(
                new THREE.PlaneGeometry(5.4, 4.8),
                new THREE.MeshBasicMaterial({
                    map: mistTexture,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    color: '#e8c8a0'
                })
            );
            this.floorMist.rotation.x = -Math.PI / 2;
            this.floorMist.position.set(1.0, -2.11, -0.08);
            this.scene.add(this.floorMist);
        }

        this.chamberShell = new THREE.Mesh(
            new THREE.PlaneGeometry(8.8, 12.8, 64, 32),
            new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone(ChamberShellShader.uniforms),
                vertexShader: ChamberShellShader.vertexShader,
                fragmentShader: ChamberShellShader.fragmentShader,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        const shellPosition = this.chamberConfig.variant?.shellPosition || DEFAULT_CHAMBER_CONFIG.variant.shellPosition;
        const shellScale = this.chamberConfig.variant?.shellScale || DEFAULT_CHAMBER_CONFIG.variant.shellScale;
        this.chamberShell.position.set(shellPosition[0], shellPosition[1], shellPosition[2]);
        this.chamberShell.scale.set(shellScale[0], shellScale[1], 1);
        this.scene.add(this.chamberShell);
        this.boundaryWings = [];

        const boundaryWingConfig = this.chamberConfig.variant?.boundaryWings || [];
        if (boundaryWingConfig.length) {
            const inwardRightTexture = createLinearTexture([
                [0, 'rgba(0, 0, 0, 0)'],
                [0.14, 'rgba(8, 12, 18, 0.03)'],
                [0.34, 'rgba(42, 52, 72, 0.18)'],
                [0.58, 'rgba(94, 110, 146, 0.34)'],
                [0.82, 'rgba(42, 52, 72, 0.14)'],
                [1, 'rgba(0, 0, 0, 0)']
            ], 512, 1024, true);
            const inwardLeftTexture = createLinearTexture([
                [0, 'rgba(0, 0, 0, 0)'],
                [0.18, 'rgba(42, 52, 72, 0.14)'],
                [0.42, 'rgba(94, 110, 146, 0.34)'],
                [0.66, 'rgba(42, 52, 72, 0.18)'],
                [1, 'rgba(0, 0, 0, 0)']
            ], 512, 1024, true);
            this.disposableTextures.add(inwardRightTexture);
            this.disposableTextures.add(inwardLeftTexture);

            boundaryWingConfig.forEach((config, index) => {
                const texture = config.flipTexture ? inwardLeftTexture : inwardRightTexture;
                const wing = new THREE.Mesh(
                    new THREE.PlaneGeometry(config.scale[0], config.scale[1], 1, 1),
                    new THREE.MeshBasicMaterial({
                        map: texture,
                        color: config.color || this.chamberConfig.colors.hazeSecondary,
                        opacity: 0,
                        transparent: true,
                        depthWrite: false,
                        blending: THREE.NormalBlending,
                        side: THREE.DoubleSide
                    })
                );
                wing.position.set(config.position[0], config.position[1], config.position[2]);
                wing.rotation.y = config.rotationY || 0;
                wing.userData.basePosition = wing.position.clone();
                wing.userData.baseOpacity = config.baseOpacity ?? 0.04;
                wing.userData.opacityGain = config.opacityGain ?? 0.14;
                wing.userData.opacityMax = config.opacityMax ?? 0.22;
                wing.userData.driftX = config.driftX ?? 0.06;
                wing.userData.driftY = config.driftY ?? 0.04;
                wing.userData.phaseOffset = config.phaseOffset ?? index * 0.8;
                this.boundaryWings.push(wing);
                this.scene.add(wing);
            });
        }
    }

    setupChamberPracticals() {
        this.chamberPracticals?.dispose?.();
        this.chamberPracticals = null;

        const variantTimelineApplies = this.variantTimelineApplies !== false
            ? (Array.isArray(this.chamberVariant?.timelineTrackSlugs)
                ? this.chamberVariant.timelineTrackSlugs.includes(String(this.track?.slug || '').toLowerCase())
                : true)
            : false;

        const practicalsParam = (this.urlParams.get('practicals') || '').toLowerCase();
        if (
            this.chamberVariantKey !== 'sonoite-cinema'
            || !variantTimelineApplies
            || this.usesQuietScene()
            || this.getCinematicProposal()
            || ['0', 'false', 'off'].includes(practicalsParam)
        ) {
            return;
        }

        this.chamberPracticals = createChamberPracticals({
            scene: this.scene,
            THREE,
            quality: this.qualityMode,
            poolsStudy: practicalsParam === 'pools' && this.track?.slug === 'sonoite',
            vigilEnabled: this.vigilEnabled === true
        });
        if (this.vigilEnabled === true) {
            // eslint-disable-next-line no-console -- owner vigil A/B surface
            console.info('[Prototype] VIGIL on — candle aging + extinction smoke (evaluation)');
        } else {
            // eslint-disable-next-line no-console -- owner consecrate surface
            console.info('[Prototype] PRACTICALS on — 7-source consecration (v3)');
        }
    }

    setupChamberSodium() {
        this.chamberSodium?.dispose?.();
        this.chamberSodium = null;

        let variantTimelineApplies = false;
        if (this.variantTimelineApplies !== false) {
            if (Array.isArray(this.chamberVariant?.timelineTrackSlugs)) {
                variantTimelineApplies = this.chamberVariant.timelineTrackSlugs
                    .includes(String(this.track?.slug || '').toLowerCase());
            } else {
                variantTimelineApplies = true;
            }
        }

        if (!this.isHorasMortasCinemaVariant() || !variantTimelineApplies) {
            return;
        }

        this.chamberSodium = createChamberSodium({
            scene: this.scene,
            THREE,
            quality: this.qualityMode,
            sodiumKill: this.sodiumEnabled !== true,
            physicalRoom: Boolean(this.getCinematicProposal()),
            stageRoom: this.getCinematicProposal() === 'stage'
        });
        if (this.sodiumEnabled !== true) {
            // eslint-disable-next-line no-console -- owner persist kill-switch surface
            console.info('[Prototype] SODIUM kill — steady dim run (?sodium=0)');
        } else {
            // eslint-disable-next-line no-console -- owner persist surface
            console.info('[Prototype] SODIUM on — single fixture (Track 4 PERSIST v1)');
        }
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(
            this.root.clientWidth,
            this.root.clientHeight,
            {
                type: THREE.HalfFloatType,
                depthBuffer: true,
                stencilBuffer: false,
                samples: this.getMsaaSamples()
            }
        ));
        this.composer.setPixelRatio?.(this.getRendererPixelRatio());
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        if (window.SONOITE_POST === false) {
            return;
        }

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.root.clientWidth, this.root.clientHeight),
            this.chamberConfig.post.bloomStrength,
            this.chamberConfig.post.bloomRadius,
            this.chamberConfig.post.bloomThreshold
        );
        this.composer.addPass(this.bloomPass);

        this.grainPass = new ShaderPass(ChamberGrainShader);
        this.grainPass.uniforms.intensity.value = this.chamberConfig.post.grainIntensity;
        this.grainPass.uniforms.terminatorGrainBoost.value = this.chamberConfig.post?.gradeLiftAfterContrast
            ? 1.6
            : 0.0;
        this.composer.addPass(this.grainPass);

        this.vignettePass = new ShaderPass(ChamberVignetteShader);
        this.composer.addPass(this.vignettePass);

        this.gradePass = new ShaderPass(ChamberGradeShader);
        this.gradePass.uniforms.mixAmount.value = this.chamberConfig.post.gradeMix ?? 0;
        this.gradePass.uniforms.tint.value.set(...(this.chamberConfig.post.gradeTint ?? [1, 1, 1]));
        this.gradePass.uniforms.lift.value.set(...(this.chamberConfig.post.gradeLift ?? [0, 0, 0]));
        this.gradePass.uniforms.saturation.value = this.chamberConfig.post.gradeSaturation ?? 1.0;
        this.gradePass.uniforms.contrast.value = this.chamberConfig.post.gradeContrast ?? 1.0;
        this.gradePass.uniforms.liftAfterContrast.value = this.chamberConfig.post?.gradeLiftAfterContrast
            ? 1.0
            : 0.0;
        this.gradePass.enabled = (this.chamberConfig.post.gradeMix ?? 0) > 0.001;
        this.composer.addPass(this.gradePass);

        this.track5PlatePass = new ShaderPass(Track5PlateShader);
        this.track5PlatePass.enabled = this.track5PlateEnabled;
        this.track5PlatePass.uniforms.resolution.value.set(
            this.root.clientWidth * this.getRendererPixelRatio(),
            this.root.clientHeight * this.getRendererPixelRatio()
        );
        this.composer.addPass(this.track5PlatePass);

        this.blackoutPass = new ShaderPass(ChamberBlackoutShader);
        this.blackoutPass.uniforms.opacity.value = 0.0;
        this.composer.addPass(this.blackoutPass);

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        if (this.getMsaaSamples() === 0) {
            this.fxaaPass = new ShaderPass(FXAAShader);
            this.setFxaaResolution();
            this.composer.addPass(this.fxaaPass);
        }

        this.blueNoiseTexture = createBlueNoiseTexture();
        this.ditherPass = new ShaderPass(ChamberDitherShader);
        this.ditherPass.uniforms.tBlueNoise.value = this.blueNoiseTexture;
        this.ditherPass.enabled = this.urlParams.get('dither') !== '0';
        this.composer.addPass(this.ditherPass);
    }

    setFxaaResolution() {
        if (!this.fxaaPass) {
            return;
        }
        const pixelRatio = this.getRendererPixelRatio();
        this.fxaaPass.material.uniforms.resolution.value.set(
            1 / Math.max(1, this.root.clientWidth * pixelRatio),
            1 / Math.max(1, this.root.clientHeight * pixelRatio)
        );
    }

    polishHeroTexture(texture) {
        if (!texture) {
            return;
        }

        const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
        texture.anisotropy = this.isCinemaQuality()
            ? Math.min(maxAnisotropy, 8)
            : Math.min(maxAnisotropy, 4);
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
    }

    decorateTrack5CinemaMaterial(material) {
        if (
            !material
            || !(
                (this.artifactMode === 'textured' && this.isTrack5CinemaVariant())
                || this.chamberVariantKey === 'sonoite-cinema'
                || this.chamberVariantKey === 'horas-mortas-cinema'
            )
            || material.userData?.track5CinemaDecorated
        ) {
            return;
        }

        const isSonoiteCinema = this.chamberVariantKey === 'sonoite-cinema';
        const isHorasMortasCinema = this.chamberVariantKey === 'horas-mortas-cinema';
        const authoredRole = ['glove', 'petals', 'egg', 'metal'].includes(material.userData?.sonoiteMaterialRole)
            ? material.userData.sonoiteMaterialRole : null;
        const authoredFinish = authoredRole ? {
            color: material.color.clone(),
            roughness: material.roughness,
            metalness: material.metalness,
            ...Object.fromEntries(['clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness']
                // eslint-disable-next-line security/detect-object-injection -- keys come from the fixed list above.
                .filter((key) => key in material).map((key) => [key, material[key]]))
        } : null;

        if (shouldSkipTrack5CinemaMaterialDecoration(material, {
            texturedParam: this.texturedParam,
            loadedHeroModelUrl: this.loadedHeroModelUrl,
            heroConfig: this.heroConfig,
            defaultConfig: DEFAULT_HERO_CONFIG,
            themeUrl: window.sonoiteData?.themeUrl || ''
        })) {
            return;
        }

        material.color?.set?.('#ffffff');
        if ('roughness' in material) {
            if (isHorasMortasCinema) {
                material.roughness = 0.85;
            } else if (isSonoiteCinema) {
                material.roughness = 0.30;
            } else {
                material.roughness = 0.76;
            }
        }
        if ('metalness' in material) {
            material.metalness = 0.03;
        }
        if ('envMapIntensity' in material) {
            if (isHorasMortasCinema) {
                material.envMapIntensity = this.heroConfig?.envMapIntensity ?? 0.14;
            } else if (isSonoiteCinema) {
                material.envMapIntensity = 0.08;
            } else {
                material.envMapIntensity = 0.1;
            }
        }
        if ('clearcoat' in material) {
            if (isHorasMortasCinema) {
                material.clearcoat = 0;
            } else if (isSonoiteCinema) {
                material.clearcoat = 0.5;
            } else {
                material.clearcoat = 0.08;
            }
        }
        if ('clearcoatRoughness' in material) {
            if (isHorasMortasCinema) {
                material.clearcoatRoughness = 1;
            } else if (isSonoiteCinema) {
                material.clearcoatRoughness = 0.2;
            } else {
                material.clearcoatRoughness = 0.58;
            }
        }
        if ('sheen' in material) {
            if (isHorasMortasCinema) {
                material.sheen = 0;
            } else if (isSonoiteCinema) {
                material.sheen = 0.20;
            } else {
                material.sheen = 0;
            }
        }
        if (material.sheenColor?.set) {
            if (isSonoiteCinema) {
                material.sheenColor.setRGB(0.86, 0.72, 0.52);
            } else {
                material.sheenColor.set('#1b1f2a');
            }
        }
        if ('sheenRoughness' in material) {
            material.sheenRoughness = isSonoiteCinema ? 0.42 : material.sheenRoughness;
        }
        // The Blender relic (MAT_Relic_Pale) ships KHR_materials_sheen (white sheen,
        // strength 1) and doubleSided, which the decorator never cleared — a bright
        // fabric scatter that washes the mood flat. Meshy has no sheen lobe at all,
        // so `'sheen' in material` is false there and this leaves it untouched. Match
        // Meshy's treatment so the two relics differ by SHAPE, not varnish.
        if ('sheen' in material && !isSonoiteCinema) {
            material.sheen = 0;
        }
        if (material.sheenColor?.set && !isSonoiteCinema) {
            material.sheenColor.set('#1b1f2a');
        }
        material.side = THREE.FrontSide;
        if (authoredFinish) {
            Object.assign(material, authoredFinish);
        }

        let relicEmissiveFragment = '#include <emissivemap_fragment>\ntotalEmissiveRadiance += sonoiteBone * sonoiteBoneMask * (0.026 + uSonoiteForensic * 0.028) + vec3(0.08, 0.09, 0.1) * uSonoiteAfterimage * 0.045;';
        if (isSonoiteCinema) {
            relicEmissiveFragment = '#include <emissivemap_fragment>\ntotalEmissiveRadiance += sonoiteBone * sonoiteBoneMask * (0.026 + uSonoiteForensic * 0.028) + vec3(0.08, 0.09, 0.1) * uSonoiteAfterimage * 0.045 + vec3(0.94, 0.83, 0.66) * sonoiteEgg * uSonoiteEggGlow * 0.65;';
        } else if (isHorasMortasCinema) {
            relicEmissiveFragment = '#include <emissivemap_fragment>\ntotalEmissiveRadiance += (sonoiteBone * sonoiteBoneMask * (0.026 + uSonoiteForensic * 0.028) + vec3(0.08, 0.09, 0.1) * uSonoiteAfterimage * 0.045) * uSonoiteSodiumLevel;';
        }

        material.onBeforeCompile = (shader) => {
            const maskBounds = material.userData.sonoiteMaskBounds
                || { center: [0, 0, 0], halfSize: [1, 1, 1] };
            shader.uniforms.uMaskCenter = { value: new THREE.Vector3().fromArray(maskBounds.center) };
            shader.uniforms.uMaskHalfSize = { value: new THREE.Vector3().fromArray(maskBounds.halfSize) };
            shader.uniforms.uSonoiteDamage = { value: 0 };
            shader.uniforms.uSonoiteErasure = { value: 0 };
            shader.uniforms.uSonoiteAfterimage = { value: 0 };
            shader.uniforms.uSonoiteForensic = { value: 0 };
            shader.uniforms.uSonoiteEggGlow = { value: 0 };
            if (isHorasMortasCinema) {
                shader.uniforms.uSonoiteSodiumLevel = { value: 1 };
            }
            material.userData.track5CinemaShader = shader;
            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    '#include <common>\nvarying vec3 vSonoiteObjectPosition;'
                )
                .replace(
                    '#include <begin_vertex>',
                    '#include <begin_vertex>\nvSonoiteObjectPosition = position;'
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    [
                        '#include <common>',
                        'uniform float uSonoiteDamage;',
                        'uniform float uSonoiteErasure;',
                        'uniform float uSonoiteAfterimage;',
                        'uniform float uSonoiteForensic;',
                        'uniform float uSonoiteEggGlow;',
                        isHorasMortasCinema ? 'uniform float uSonoiteSodiumLevel;' : '',
                        'uniform vec3 uMaskCenter;',
                        'uniform vec3 uMaskHalfSize;',
                        'varying vec3 vSonoiteObjectPosition;'
                    ].join('\n')
                )
                .replace(
                    'vec4 diffuseColor = vec4( diffuse, opacity );',
                    [
                        'vec3 sonoiteLeather = vec3(0.006, 0.006, 0.007);',
                        'vec3 sonoiteAsh = vec3(0.22, 0.21, 0.20);',
                        'vec3 sonoiteBone = vec3(0.84, 0.82, 0.76);',
                        // The mask thresholds below were hand-tuned against the Meshy relic's
                        // object frame (halfSize ~[0.484, 1.0, 0.444], centered at origin). Remap
                        // any relic into THAT frame: divide out this mesh's own bounds, rescale by
                        // Meshy's. Meshy resolves to exact identity (its liked look is untouched);
                        // the Blender relic (Y up to ~5) gets its full extent mapped onto the same
                        // authored anatomy instead of collapsing into the bright top 85%.
                        'vec3 sonoiteMaskRef = vec3(0.4838099, 1.0, 0.4441359);',
                        'vec3 sonoiteMaskPos = (vSonoiteObjectPosition - uMaskCenter) / uMaskHalfSize * sonoiteMaskRef;',
                        authoredRole
                            ? `float sonoiteFlower = ${authoredRole === 'petals' ? '1.0' : '0.0'};`
                            : 'float sonoiteFlower = smoothstep(0.18, 0.62, sonoiteMaskPos.y);',
                        'vec3 sonoiteEggProbe = (sonoiteMaskPos - vec3(0.22, -0.37, 0.18)) * vec3(1.02, 1.24, 0.88);',
                        authoredRole
                            ? `float sonoiteEgg = ${authoredRole === 'egg' ? '1.0' : '0.0'};`
                            : 'float sonoiteEgg = 1.0 - smoothstep(0.0, 0.54, length(sonoiteEggProbe));',
                        'float sonoiteBoneMask = clamp(sonoiteFlower + sonoiteEgg * 0.92, 0.0, 1.0);',
                        isSonoiteCinema
                            ? 'vec3 sonoiteEggAlbedo = sonoiteBone * 0.32;'
                            : '',
                        isHorasMortasCinema
                            ? 'vec3 sonoiteDustTint = vec3(0.34, 0.31, 0.27);'
                            : '',
                        'float sonoiteWear = smoothstep(-0.72, -0.08, sonoiteMaskPos.y) * (1.0 - sonoiteBoneMask);',
                        isHorasMortasCinema
                            ? 'vec3 sonoiteRelicColor = mix(sonoiteLeather, sonoiteAsh * 0.72, sonoiteBoneMask * 0.55);'
                            : '',
                        isSonoiteCinema
                            ? 'vec3 sonoiteRelicColor = mix(sonoiteLeather, sonoiteEggAlbedo, sonoiteEgg);'
                            : '',
                        (!isHorasMortasCinema && !isSonoiteCinema)
                            ? 'vec3 sonoiteRelicColor = mix(sonoiteLeather, sonoiteBone, sonoiteBoneMask);'
                            : '',
                        isSonoiteCinema
                            ? [
                                'float sonoiteCrown = smoothstep(0.42, 0.72, sonoiteMaskPos.y) * (1.0 - sonoiteEgg * 0.85);',
                                'vec3 sonoiteCrownAlbedo = mix(sonoiteBone * 0.52, sonoiteAsh * 0.82, 0.28);'
                            ].join('\n')
                            : '',
                        isHorasMortasCinema
                            ? [
                                'float sonoiteDustCrown = smoothstep(0.38, 0.74, sonoiteMaskPos.y);',
                                'vec3 sonoiteDustCrownAlbedo = mix(sonoiteAsh * 0.62, sonoiteDustTint, 0.72);'
                            ].join('\n')
                            : '',
                        isSonoiteCinema
                            ? 'sonoiteRelicColor = mix(sonoiteRelicColor, sonoiteCrownAlbedo, sonoiteCrown * 0.88);'
                            : '',
                        isHorasMortasCinema
                            ? 'sonoiteRelicColor = mix(sonoiteRelicColor, sonoiteDustCrownAlbedo, sonoiteDustCrown * 0.42 * uSonoiteSodiumLevel);'
                            : '',
                        'sonoiteRelicColor = mix(sonoiteRelicColor, sonoiteAsh, 0.16 * sonoiteWear + 0.08 * sonoiteFlower);',
                        authoredRole ? 'sonoiteRelicColor = diffuse;' : '',
                        'sonoiteRelicColor = mix(sonoiteRelicColor, vec3(0.015, 0.014, 0.014), uSonoiteDamage * (1.0 - sonoiteBoneMask) * 0.42);',
                        isHorasMortasCinema
                            ? [
                                'sonoiteRelicColor = mix(sonoiteRelicColor, sonoiteBone * 1.16, uSonoiteForensic * sonoiteBoneMask * 0.28 * uSonoiteSodiumLevel);',
                                'sonoiteRelicColor += vec3(0.08, 0.09, 0.1) * uSonoiteAfterimage * (sonoiteBoneMask * 0.62 + 0.08) * uSonoiteSodiumLevel;'
                            ].join('\n')
                            : [
                                'sonoiteRelicColor = mix(sonoiteRelicColor, sonoiteBone * 1.16, uSonoiteForensic * sonoiteBoneMask * 0.28);',
                                'sonoiteRelicColor += vec3(0.08, 0.09, 0.1) * uSonoiteAfterimage * (sonoiteBoneMask * 0.62 + 0.08);'
                            ].join('\n'),
                        'sonoiteRelicColor = mix(sonoiteRelicColor, vec3(0.018, 0.02, 0.024), uSonoiteErasure * 0.72);',
                        'vec4 diffuseColor = vec4(sonoiteRelicColor, opacity * (1.0 - uSonoiteErasure * 0.48));'
                    ].join('\n')
                )
                .replace(
                    '#include <emissivemap_fragment>',
                    relicEmissiveFragment
                );
        };
        material.customProgramCacheKey = () => {
            const authoredKey = authoredRole ? `-authored-${authoredRole}-v1` : '';
            if (isHorasMortasCinema) {
                return `horas-mortas-cinema-relic-v3${authoredKey}`;
            }
            if (isSonoiteCinema) {
                return `sonoite-cinema-relic-v33${authoredKey}`;
            }
            return `sonoite-track5-cinema-relic-v3${authoredKey}`;
        };
        if (isHorasMortasCinema) {
            if (!this.horasHeroNormalMap) {
                this.horasHeroNormalMap = createDeterministicValueNoiseNormalMap(128);
                this.disposableTextures.add(this.horasHeroNormalMap);
            }
            material.normalMap = this.horasHeroNormalMap;
            material.normalScale.set(0.12, 0.12);
            applySodiumDiffuseWrap(material);
        }
        material.userData.track5CinemaDecorated = true;
        material.needsUpdate = true;
    }

    polishHeroMaterial(material) {
        if (!material) {
            return;
        }

        [
            'map',
            'normalMap',
            'roughnessMap',
            'metalnessMap',
            'emissiveMap',
            'aoMap',
            'alphaMap'
        ].forEach((key) => this.polishHeroTexture(material[key]));

        this.decorateTrack5CinemaMaterial(material);
        material.needsUpdate = true;
    }

    createAtmosphere() {
        if (this.usesPhysicalScene()) {
            return;
        }
        // Stage 2a deliberately does NOT branch this. The particle count is fixed at
        // construction, so it cannot be windowed: raising it to 384 measurably
        // changed the owner-accepted opening (0.0217 mean abs luma at 40.0s against
        // a 0.0061 same-build noise floor) even though every time-varying lever is
        // exactly zero there. The dust is brought into visibility through the
        // windowed opacity additive instead. See recut-atmosphere.js.
        const dustCount = this.chamberConfig.air.dustCount;
        const positions = new Float32Array(dustCount * 3);
        const alphas = new Float32Array(dustCount);
        const isSacristy = this.chamberConfig.darknessMode === DARKNESS_MODE.SACRISTY;
        const dustPattern = this.chamberConfig.variant?.dustPattern || DUST_PATTERN.TIGHT;
        const variantConfig = this.chamberConfig.variant || DEFAULT_CHAMBER_CONFIG.variant;

        for (let index = 0; index < dustCount; index += 1) {
            const i3 = index * 3;

            if (dustPattern === DUST_PATTERN.VOLUME) {
                const y = -1.4 + Math.random() * 8.6;
                const depthBias = Math.pow(Math.random(), 0.76);
                let x = this.heroConfig.offsetX + (Math.random() - 0.5) * 11.2;
                const centerGap = 0.9 - depthBias * 0.24;
                if (Math.abs(x - this.heroConfig.offsetX) < centerGap) {
                    x += x < this.heroConfig.offsetX ? -(centerGap + Math.random() * 0.9) : (centerGap + Math.random() * 0.9);
                }
                positions[i3 + 0] = x;
                positions[i3 + 1] = y;
                positions[i3 + 2] = -1.2 - depthBias * 8.6 + (Math.random() - 0.5) * 2.2;
                alphas[index] = 0.1 + Math.random() * 0.42;
                continue;
            }

            if (dustPattern === DUST_PATTERN.CONE) {
                // Keep the matter inside the beam so it reads as air catching light, not as room clutter.
                const beamDepth = 0.2 + Math.random();
                const y = -0.7 + Math.random() * 7.6;
                const width = 0.16 + beamDepth * 0.34 + y * 0.012;
                const theta = (Math.random() - 0.5) * Math.PI * 0.42;
                positions[i3 + 0] = this.heroConfig.offsetX + Math.sin(theta) * width;
                positions[i3 + 1] = y;
                positions[i3 + 2] = -0.8 - beamDepth * 4.1 + Math.cos(theta) * width * 0.22;
                alphas[index] = 0.24 + Math.random() * 0.7;
                continue;
            }

            if (dustPattern === DUST_PATTERN.CURTAIN) {
                const curtainLanes = variantConfig.curtainLanes || 3;
                const curtainSpread = variantConfig.curtainSpread || 0.9;
                const lane = (index % curtainLanes) - ((curtainLanes - 1) / 2);
                const y = -1.6 + Math.random() * 8.8;
                positions[i3 + 0] = this.heroConfig.offsetX + lane * (curtainSpread + Math.random() * 0.38) + (Math.random() - 0.5) * 0.3;
                positions[i3 + 1] = y;
                positions[i3 + 2] = -1.6 - Math.random() * 5.4 + lane * 0.28;
                alphas[index] = 0.22 + Math.random() * 0.68;
                continue;
            }

            if (dustPattern === DUST_PATTERN.RESIDUE) {
                const y = -1.1 + Math.random() * 6.4;
                const arc = Math.random() * Math.PI * 0.9 + Math.PI * 0.18;
                const radius = 0.46 + Math.random() * 1.6;
                positions[i3 + 0] = this.heroConfig.offsetX + Math.cos(arc) * radius * 0.8 - 0.46;
                positions[i3 + 1] = y;
                positions[i3 + 2] = -1.2 - Math.random() * 3.9 + Math.sin(arc) * radius * 0.52;
                alphas[index] = 0.2 + Math.random() * 0.72;
                continue;
            }

            if (isSacristy) {
                const y = -0.4 + Math.random() * 7.8;
                const radius = 0.16 + Math.random() * 1.05 + y * 0.03;
                const theta = Math.random() * Math.PI * 2;
                positions[i3 + 0] = this.heroConfig.offsetX + Math.cos(theta) * radius * 0.32;
                positions[i3 + 1] = y;
                positions[i3 + 2] = -0.9 - Math.random() * 3.8 + Math.sin(theta) * radius * 0.42;
                alphas[index] = 0.26 + Math.random() * 0.74;
                continue;
            }

            if (dustPattern === DUST_PATTERN.TIGHT && variantConfig.dustLatticeSpacing) {
                continue;
            }

            const radius = 2.6 + Math.random() * 4.8;
            const theta = Math.random() * Math.PI * 2;
            positions[i3 + 0] = Math.cos(theta) * radius * 0.74 + 0.9;
            positions[i3 + 1] = (Math.random() - 0.5) * 6.8 + 0.8;
            positions[i3 + 2] = (Math.random() - 0.5) * 6.2 - 1.3;
            alphas[index] = Math.random();
        }

        if (dustPattern === DUST_PATTERN.TIGHT && variantConfig.dustLatticeSpacing) {
            fillDustLatticePositions(positions, alphas, dustCount, {
                spacing: variantConfig.dustLatticeSpacing,
                jitter: variantConfig.dustLatticeJitter,
                origin: variantConfig.dustLatticeOrigin
            }, this.heroConfig.offsetX);
        }

        const dustGeometry = new THREE.BufferGeometry();
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        const dustTexture = createPointSpriteTexture({
            stretchY: 1.0,
            softness: 0.92,
            colorStops: [
                [0.0, 'rgba(255, 255, 255, 1.0)'],
                [0.18, 'rgba(255, 255, 255, 0.82)'],
                [0.52, 'rgba(255, 255, 255, 0.16)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]
        });
        this.disposableTextures.add(dustTexture);

        const dustMaterial = new THREE.PointsMaterial({
            map: dustTexture,
            color: variantConfig.dustColor || '#e5dfd8',
            size: this.chamberConfig.air.dustSize,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            blending: isSacristy ? THREE.NormalBlending : THREE.AdditiveBlending,
            alphaTest: 0.01
        });

        this.dust = new THREE.Points(dustGeometry, dustMaterial);
        this.dustBasePositions = new Float32Array(positions);
        this.dustBaseColor = new THREE.Color(variantConfig.dustColor || '#e5dfd8');
        this.dustBrownianPhases = new Float32Array(dustCount);
        for (let phaseIndex = 0; phaseIndex < dustCount; phaseIndex += 1) {
            this.dustBrownianPhases[phaseIndex] = (phaseIndex * 0.6180339887) % 1 * Math.PI * 2;
        }
        this.scene.add(this.dust);

        this.gazeField = null;
        this.counterGazeField = null;
        this.aisleField = null;
        this.hazePlume = null;
        this.hazeSprites = [];
        this.percussiveHazeSprite = null;
        this.frontHaze = null;

        const gazeWallConfig = variantConfig.gazeWall;
        const voidWitnessConfig = variantConfig.voidWitnesses;
        const aisleFieldConfig = variantConfig.aisleField;
        const hazePlumeConfig = variantConfig.hazePlume;

        // Step 5 recut cleanup (build spec §2.1/§2.10): the audio-led recut deletes
        // the cool blue point-field vocabulary the owner rejected — the additive
        // gazeWall field (#8ba0cf, left of subject), its tightly-coupled left cool
        // haze plume (#adc0ea, xCenter -3.0, same left-back region), and the blue
        // dotted aisleField (#9fb7df) whose rows read as radiating cool floor lines
        // ('risquinhos'). The right-side void witnesses, the radial FloorMemoryShader
        // pool, the floor mesh, haze sprites, fog, dust and the chamber shell stay
        // untouched as neutral room structure. Default film builds all four fields.
        const suppressRecutCoolFields = this.recutEnabled === true;

        if (gazeWallConfig || voidWitnessConfig || aisleFieldConfig || hazePlumeConfig) {
            const witnessTexture = createPointSpriteTexture({
                stretchY: 1.44,
                softness: 0.96,
                colorStops: [
                    [0.0, 'rgba(255, 255, 255, 0.96)'],
                    [0.14, 'rgba(255, 255, 255, 0.84)'],
                    [0.34, 'rgba(255, 255, 255, 0.28)'],
                    [1.0, 'rgba(0, 0, 0, 0)']
                ]
            });
            const sentinelTexture = createPointSpriteTexture({
                stretchY: 1.26,
                softness: 0.9,
                colorStops: [
                    [0.0, 'rgba(255, 255, 255, 1.0)'],
                    [0.18, 'rgba(255, 255, 255, 0.96)'],
                    [0.42, 'rgba(255, 255, 255, 0.18)'],
                    [1.0, 'rgba(0, 0, 0, 0)']
                ]
            });
            const aisleTexture = createPointSpriteTexture({
                stretchY: 0.86,
                softness: 0.88,
                colorStops: [
                    [0.0, 'rgba(255, 255, 255, 0.92)'],
                    [0.22, 'rgba(255, 255, 255, 0.68)'],
                    [0.5, 'rgba(255, 255, 255, 0.14)'],
                    [1.0, 'rgba(0, 0, 0, 0)']
                ]
            });
            const plumeTexture = createPointSpriteTexture({
                stretchY: 1.9,
                softness: 1.02,
                colorStops: [
                    [0.0, 'rgba(255, 255, 255, 0.94)'],
                    [0.18, 'rgba(255, 255, 255, 0.56)'],
                    [0.54, 'rgba(255, 255, 255, 0.08)'],
                    [1.0, 'rgba(0, 0, 0, 0)']
                ]
            });
            this.disposableTextures.add(witnessTexture);
            this.disposableTextures.add(sentinelTexture);
            this.disposableTextures.add(aisleTexture);
            this.disposableTextures.add(plumeTexture);

            if (gazeWallConfig && !suppressRecutCoolFields) {
                const gazePositions = [];
                for (let filament = 0; filament < (gazeWallConfig.filaments || 0); filament += 1) {
                    const filamentT = filament / Math.max((gazeWallConfig.filaments || 1) - 1, 1);
                    const zBase = lerp(gazeWallConfig.zNear, gazeWallConfig.zFar, filamentT);
                    const xBase = this.heroConfig.offsetX + lerp(gazeWallConfig.xNear, gazeWallConfig.xFar, smoothstep(0, 1, filamentT));
                    const samples = gazeWallConfig.samplesPerFilament || 0;
                    for (let sample = 0; sample < samples; sample += 1) {
                        const sampleT = sample / Math.max(samples - 1, 1);
                        gazePositions.push(
                            xBase + Math.sin(sampleT * 6.2 + filamentT * 5.4) * 0.12 + (Math.random() - 0.5) * 0.04,
                            lerp(gazeWallConfig.yMin, gazeWallConfig.yMax, sampleT) + (Math.random() - 0.5) * 0.09,
                            zBase + Math.cos(sampleT * 3.6 + filamentT * 4.8) * 0.16 + (Math.random() - 0.5) * 0.06
                        );
                    }
                }
                this.gazeField = this.createPointField(gazePositions, {
                    texture: witnessTexture,
                    color: gazeWallConfig.color || this.chamberConfig.colors.hazeSecondary,
                    size: gazeWallConfig.size || 0.05
                });
                this.gazeField.userData.basePosition = this.gazeField.position.clone();
                this.gazeField.userData.baseOpacity = gazeWallConfig.baseOpacity ?? 0.04;
                this.gazeField.userData.opacityGain = gazeWallConfig.opacityGain ?? 0.18;
            }

            if (voidWitnessConfig) {
                const counterPositions = [];
                for (let filament = 0; filament < (voidWitnessConfig.filaments || 0); filament += 1) {
                    const filamentT = filament / Math.max((voidWitnessConfig.filaments || 1) - 1, 1);
                    const zBase = lerp(voidWitnessConfig.zNear, voidWitnessConfig.zFar, filamentT);
                    const xBase = this.heroConfig.offsetX + lerp(voidWitnessConfig.xNear, voidWitnessConfig.xFar, filamentT);
                    const samples = voidWitnessConfig.samplesPerFilament || 0;
                    for (let sample = 0; sample < samples; sample += 1) {
                        const sampleT = sample / Math.max(samples - 1, 1);
                        counterPositions.push(
                            xBase + Math.sin(sampleT * 4.1 + filamentT * 3.7) * 0.08 + (Math.random() - 0.5) * 0.05,
                            lerp(voidWitnessConfig.yMin, voidWitnessConfig.yMax, sampleT) + (Math.random() - 0.5) * 0.1,
                            zBase + Math.cos(sampleT * 3.1 + filamentT * 2.6) * 0.12 + (Math.random() - 0.5) * 0.06
                        );
                    }
                }
                this.counterGazeField = this.createPointField(counterPositions, {
                    texture: sentinelTexture,
                    color: voidWitnessConfig.color || '#c8d7f7',
                    size: voidWitnessConfig.size || 0.07
                });
                this.counterGazeField.userData.basePosition = this.counterGazeField.position.clone();
                this.counterGazeField.userData.baseOpacity = voidWitnessConfig.baseOpacity ?? 0.016;
                this.counterGazeField.userData.opacityGain = voidWitnessConfig.opacityGain ?? 0.08;
            }

            if (aisleFieldConfig && !suppressRecutCoolFields) {
                const aislePositions = [];
                for (let row = 0; row < (aisleFieldConfig.rows || 0); row += 1) {
                    const rowT = row / Math.max((aisleFieldConfig.rows || 1) - 1, 1);
                    const zBase = lerp(aisleFieldConfig.zNear, aisleFieldConfig.zFar, rowT);
                    const width = lerp(aisleFieldConfig.widthNear, aisleFieldConfig.widthFar, Math.pow(rowT, 0.82));
                    const columns = aisleFieldConfig.columns || 0;
                    for (let column = 0; column < columns; column += 1) {
                        const columnT = column / Math.max(columns - 1, 1);
                        const lane = lerp(-0.5, 0.5, columnT);
                        aislePositions.push(
                            this.heroConfig.offsetX + lane * width + (Math.random() - 0.5) * 0.08,
                            (aisleFieldConfig.y ?? -2.12) + (Math.random() - 0.5) * 0.015,
                            zBase + (Math.random() - 0.5) * 0.08
                        );
                    }
                }
                this.aisleField = this.createPointField(aislePositions, {
                    texture: aisleTexture,
                    color: aisleFieldConfig.color || '#9fb7df',
                    size: aisleFieldConfig.size || 0.04
                });
                this.aisleField.userData.basePosition = this.aisleField.position.clone();
                this.aisleField.userData.baseOpacity = aisleFieldConfig.baseOpacity ?? 0.03;
                this.aisleField.userData.opacityGain = aisleFieldConfig.opacityGain ?? 0.16;
            }

            if (hazePlumeConfig && !suppressRecutCoolFields) {
                const plumePositions = [];
                for (let index = 0; index < (hazePlumeConfig.count || 0); index += 1) {
                    const t = Math.random();
                    const angle = lerp(Math.PI * 0.1, Math.PI * 0.92, Math.random());
                    const radius = 1.2 + Math.random() * 4.8;
                    plumePositions.push(
                        this.heroConfig.offsetX + (hazePlumeConfig.xCenter ?? -1.6) + Math.cos(angle) * radius * 0.84 + (Math.random() - 0.5) * 0.22,
                        (hazePlumeConfig.yCenter ?? 4.9) + Math.sin(angle) * radius * 0.52 + Math.pow(t, 0.42) * 1.6,
                        (hazePlumeConfig.zCenter ?? -6.2) - Math.random() * 4.8 + (Math.random() - 0.5) * 0.32
                    );
                }
                this.hazePlume = this.createPointField(plumePositions, {
                    texture: plumeTexture,
                    color: hazePlumeConfig.color || '#adc0ea',
                    size: hazePlumeConfig.size || 0.056
                });
                this.hazePlume.userData.basePosition = this.hazePlume.position.clone();
                this.hazePlume.userData.baseOpacity = hazePlumeConfig.baseOpacity ?? 0.0;
                this.hazePlume.userData.opacityGain = hazePlumeConfig.opacityGain ?? 0.14;
            }
        }

        if (isSacristy && !variantConfig.allowSacristyHaze) {
            return;
        }

        const frontTextureType = variantConfig.frontHazeTexture || 'portal';
        const frontDepthTexture = frontTextureType === 'aperture'
            ? createApertureTexture(900, 1400)
            : createPortalTexture(640, 1400);
        this.disposableTextures.add(frontDepthTexture);

        const hazeTexture = createRadialTexture([
            [0, 'rgba(102, 109, 136, 0.34)'],
            [0.26, 'rgba(52, 57, 80, 0.14)'],
            [1, 'rgba(0, 0, 0, 0)']
        ]);
        const accentTexture = createRadialTexture([
            [0, 'rgba(236, 230, 223, 0.18)'],
            [0.18, 'rgba(136, 148, 176, 0.1)'],
            [1, 'rgba(0, 0, 0, 0)']
        ]);
        this.disposableTextures.add(hazeTexture);
        this.disposableTextures.add(accentTexture);

        const hazeSpriteConfig = variantConfig.hazeSprites || [
            { position: [-2.4, 1.5, -4.5], scale: [12.6, 18.8], color: 'hazePrimary', texture: 'haze' },
            { position: [3.4, 2.15, -6.4], scale: [15.6, 20.4], color: 'hazeSecondary', texture: 'haze' },
            { position: [1.3, 0.75, -2.7], scale: [8.2, 14.2], color: 'accent', texture: 'accent' }
        ];
        this.hazeSprites = hazeSpriteConfig.map((config) => {
            const texture = config.texture === 'accent' ? accentTexture : hazeTexture;
            const color = this.chamberConfig.colors[config.color] || config.color || this.chamberConfig.colors.hazePrimary;
            return this.createHazeSprite(
                texture,
                new THREE.Vector3(config.position[0], config.position[1], config.position[2]),
                new THREE.Vector2(config.scale[0], config.scale[1]),
                0.0,
                color
            );
        });

        const percussiveHazeConfig = variantConfig.percussiveHazeSprite;
        const hazePercussiveGain = variantConfig.hazePercussiveGain ?? 0;
        if (hazePercussiveGain > 0 && percussiveHazeConfig) {
            this.percussiveHazeSprite = this.createHazeSprite(
                hazeTexture,
                new THREE.Vector3(
                    percussiveHazeConfig.position[0],
                    percussiveHazeConfig.position[1],
                    percussiveHazeConfig.position[2]
                ),
                new THREE.Vector2(percussiveHazeConfig.scale[0], percussiveHazeConfig.scale[1]),
                0.0,
                percussiveHazeConfig.color || '#c9a06a'
            );
        }

        const frontHazePosition = variantConfig.frontHazePosition || DEFAULT_CHAMBER_CONFIG.variant.frontHazePosition;
        const frontHazeScale = variantConfig.frontHazeScale || DEFAULT_CHAMBER_CONFIG.variant.frontHazeScale;
        this.frontHaze = this.createHazeSprite(
            frontDepthTexture,
            new THREE.Vector3(frontHazePosition[0], frontHazePosition[1], frontHazePosition[2]),
            new THREE.Vector2(frontHazeScale[0], frontHazeScale[1]),
            0.0,
            variantConfig.frontHazeColor || this.chamberConfig.colors.hazePrimary
        );
        this.frontHaze.material.blending = THREE.NormalBlending;

        if (this.godRayEnabled) {
            this.createGodRay();
        }
    }

    createGodRay() {
        const [subjectX, subjectY, subjectZ] = TRACK5_FILM_TARGET;
        const sourceX = subjectX - 5.5;
        const sourceY = 13.5;
        const sourceZ = subjectZ - 6.5;

        this.godRayGeometry = new THREE.PlaneGeometry(4.5, 19);
        this.godRayMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uIntensity: { value: 0 },
                uAlphaScale: { value: 0.45 },
                uColor: { value: new THREE.Color('#aebadd') },
                uSeed: { value: this.livingSeed }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uIntensity;
                uniform float uAlphaScale;
                uniform vec3 uColor;
                uniform float uSeed;
                varying vec2 vUv;

                void main() {
                    float vertical = smoothstep(0.0, 0.35, vUv.y)
                        * (1.0 - smoothstep(0.35, 1.0, vUv.y));
                    float horizontal = smoothstep(0.0, 0.38, vUv.x)
                        * smoothstep(0.0, 0.38, 1.0 - vUv.x);
                    float alpha = vertical * horizontal * uIntensity * uAlphaScale;
                    gl_FragColor = vec4(uColor * alpha, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        this.godRayGroup = new THREE.Group();
        this.godRayGroup.position.set(sourceX, sourceY, sourceZ);
        const beamDirection = new THREE.Vector3(subjectX, subjectY, subjectZ)
            .sub(this.godRayGroup.position)
            .normalize();
        this.godRayGroup.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            beamDirection
        );
        this.godRayGroup.visible = false;

        for (let index = 0; index < 6; index += 1) {
            const mesh = new THREE.Mesh(this.godRayGeometry, this.godRayMaterial);
            mesh.rotation.y = index * 30 * (Math.PI / 180);
            mesh.renderOrder = 12;
            this.godRayGroup.add(mesh);
        }

        this.scene.add(this.godRayGroup);
    }

    updateGodRay(elapsed) {
        if (!this.godRayEnabled || !this.godRayMaterial) {
            this.godRayIntensity = 0;
            return;
        }
        this.godRayIntensity = godRayIntensityAt(elapsed);
        this.godRayMaterial.uniforms.uIntensity.value = this.godRayIntensity;
        if (this.godRayGroup) {
            this.godRayGroup.visible = this.godRayIntensity > 0.001;
        }
    }

    createHazeSprite(texture, position, scale, opacity, color) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            color,
            opacity,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(scale.x, scale.y, 1);
        sprite.userData.basePosition = position.clone();
        sprite.userData.baseScale = scale.clone();
        this.scene.add(sprite);
        return sprite;
    }

    createPointField(positions, {
        texture,
        color,
        size,
        opacity = 0,
        blending = THREE.AdditiveBlending
    }) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            map: texture,
            color,
            size,
            sizeAttenuation: true,
            transparent: true,
            opacity,
            depthWrite: false,
            blending,
            alphaTest: 0.01
        });
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        return points;
    }

    async loadStageDrape() {
        const themeUrl = (window.sonoiteData?.themeUrl || '').replace(/\/+$/, '');
        const asset = await new GLTFLoader().loadAsync(`${themeUrl}/public/assets/models/track1-stage/weighted-drape.glb`);
        if (this.isDestroyed) {
            dispose3D(asset.scene);
            return;
        }
        try {
            this.physicalDrape = prepareWeightedDrape(asset.scene);
            this.physicalChamber.add(this.physicalDrape);
            let materials;
            try {
                materials = await loadTrack1StageMaterials(themeUrl, this.renderer);
            } catch (error) {
                // A missing detail map should retain the matte stage and let
                // the track start. The material loader disposes partial results.
                if (!this.isDestroyed) {
                    console.warn('[Prototype] Stage detail maps unavailable; using matte materials', error);
                }
                return;
            }
            if (this.isDestroyed) {
                materials.dispose();
                return;
            }
            this.track1StageMaterials = materials;
            materials.apply(this.physicalDrape, this.physicalChamber);
            this.shadowDirty = true;
        } finally {
            dispose3D(asset.scene);
        }
    }

    async loadHero() {
        const loader = new GLTFLoader();
        // The Blender hero export is Draco-compressed; without this the loader
        // throws and the candidate loop silently degrades to the uncompressed
        // Meshy mesh (which is what shipped from June 2026 until this fix).
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath(
            `${window.sonoiteData.themeUrl.replace(/\/+$/, '')}/public/vendor/draco/`
        );
        loader.setDRACOLoader(this.dracoLoader);
        const modelCandidates = this.resolveModelUrls();
        let gltf = null;
        let lastError = null;

        for (const modelUrl of modelCandidates) {
            try {
                gltf = await loader.loadAsync(modelUrl);
                this.loadedHeroModelUrl = modelUrl;
                break;
            } catch (error) {
                lastError = error;
                // Never fail silently: a swallowed error here degrades the hero
                // to a fallback mesh that looks plausible, which hid the missing
                // Draco decoder for six weeks.
                console.warn(`[Prototype] hero candidate failed, trying next: ${modelUrl}`, error);
            }
        }

        if (!gltf) {
            throw lastError || new Error('Failed to load prototype hero model');
        }

        this.hero = gltf.scene;
        const preserveHeroMaterials = this.shouldPreserveHeroMaterials();
        const material = new THREE.MeshPhysicalMaterial({
            color: this.heroConfig.baseColor,
            roughness: this.heroConfig.roughness,
            metalness: this.heroConfig.metalness,
            clearcoat: this.heroConfig.clearcoat,
            clearcoatRoughness: this.heroConfig.clearcoatRoughness,
            sheen: this.heroConfig.sheen ?? 0,
            sheenRoughness: this.heroConfig.sheenRoughness ?? 0.55,
            sheenColor: this.heroConfig.sheenColor ?? '#1b1f2a',
            iridescence: this.heroConfig.iridescence ?? 0,
            iridescenceIOR: this.heroConfig.iridescenceIOR ?? 1.16,
            emissive: '#000000',
            envMapIntensity: this.heroConfig.envMapIntensity,
            transparent: true
        });
        this.heroMaterial = material;
        this.heroMaterialStates = [];

        this.hero.traverse((child) => {
            if (child.isMesh) {
                this.repairFlatNormals(child);
                if (!child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
                // The relic-shading mask keys off object-space height, but the two
                // relics live in wildly different coordinate ranges (Meshy ~[-1,1],
                // Blender Y up to ~5). Stash each mesh's bounding box so the shader
                // can normalize height to [-1,1] and the mask lands the same on any
                // mesh (fixes the Blender relic reading uniform pale "bone").
                child.geometry.computeBoundingBox();
                const box = child.geometry.boundingBox;
                if (box) {
                    const center = box.getCenter(new THREE.Vector3());
                    const halfSize = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
                    const bounds = {
                        center: [center.x, center.y, center.z],
                        halfSize: [
                            Math.max(halfSize.x, 1e-4),
                            Math.max(halfSize.y, 1e-4),
                            Math.max(halfSize.z, 1e-4)
                        ]
                    };
                    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
                    meshMaterials.filter(Boolean).forEach((meshMaterial) => {
                        meshMaterial.userData.sonoiteMaskBounds = bounds;
                    });
                    material.userData.sonoiteMaskBounds = bounds;
                }
                if (!preserveHeroMaterials) {
                    child.material = material;
                    this.polishHeroMaterial(material);
                    if (!this.heroMaterialStates.some((entry) => entry.material === material)) {
                        this.heroMaterialStates.push({
                            material,
                            baseOpacity: material.opacity,
                            baseEnvMapIntensity: Number.isFinite(material.envMapIntensity) ? material.envMapIntensity : 0,
                            baseRoughness: Number.isFinite(material.roughness) ? material.roughness : null,
                            baseClearcoat: Number.isFinite(material.clearcoat) ? material.clearcoat : null,
                            baseClearcoatRoughness: Number.isFinite(material.clearcoatRoughness) ? material.clearcoatRoughness : null,
                            baseSheen: Number.isFinite(material.sheen) ? material.sheen : null,
                            baseIridescence: Number.isFinite(material.iridescence) ? material.iridescence : null,
                            baseIridescenceIOR: Number.isFinite(material.iridescenceIOR) ? material.iridescenceIOR : null
                        });
                    }
                } else {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.filter(Boolean).forEach((meshMaterial) => {
                        this.polishHeroMaterial(meshMaterial);
                        meshMaterial.transparent = true;
                        meshMaterial.depthWrite = true;
                        if (!this.heroMaterialStates.some((entry) => entry.material === meshMaterial)) {
                            this.heroMaterialStates.push({
                                material: meshMaterial,
                                baseOpacity: Number.isFinite(meshMaterial.opacity) ? meshMaterial.opacity : 1,
                                baseEnvMapIntensity: Number.isFinite(meshMaterial.envMapIntensity) ? meshMaterial.envMapIntensity : 0,
                                baseRoughness: Number.isFinite(meshMaterial.roughness) ? meshMaterial.roughness : null,
                                baseClearcoat: Number.isFinite(meshMaterial.clearcoat) ? meshMaterial.clearcoat : null,
                                baseClearcoatRoughness: Number.isFinite(meshMaterial.clearcoatRoughness) ? meshMaterial.clearcoatRoughness : null,
                                baseSheen: Number.isFinite(meshMaterial.sheen) ? meshMaterial.sheen : null,
                                baseIridescence: Number.isFinite(meshMaterial.iridescence) ? meshMaterial.iridescence : null,
                                baseIridescenceIOR: Number.isFinite(meshMaterial.iridescenceIOR) ? meshMaterial.iridescenceIOR : null
                            });
                        }
                    });
                }
                child.castShadow = true;
                child.receiveShadow = this.resolveRelicChoice() === 'materials'
                    || this.usesQuietScene() || this.usesPhysicalScene();
                child.frustumCulled = false;
            }
        });

        const box = new THREE.Box3().setFromObject(this.hero);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const targetHeight = this.heroConfig.targetHeight;
        const scale = targetHeight / Math.max(size.y, 0.001);
        this.hero.scale.setScalar(scale);
        this.hero.position.set(
            -center.x * scale + this.heroConfig.offsetX,
            -center.y * scale + this.heroConfig.centerY + (this.heroConfig.offsetY || 0),
            -center.z * scale + this.heroConfig.offsetZ
        );
        this.hero.rotation.y = this.heroConfig.rotationY;
        this.heroBasePosition.copy(this.hero.position);
        if (this.usesQuietScene() && !this.physicalChamber) {
            this.shadowCatcher.position.y = new THREE.Box3().setFromObject(this.hero).min.y - 0.01;
        }
        if (this.physicalChamber) {
            this.physicalChamber.position.y = new THREE.Box3().setFromObject(this.hero).min.y - 0.01;
            this.chamberSodium?.setFloorHeight?.(this.physicalChamber.position.y);
        }
        this.keyLight.target.position.set(
            this.hero.position.x * 0.92,
            this.hero.position.y + 0.55,
            this.hero.position.z
        );
        this.keyLight.target.updateMatrixWorld();
        this.shadowDirty = true;

        this.heroGroup.add(this.hero);

        this.ensureRelicMutation();
        if (this.relicMutation) {
            this.relicMutation.install(this.hero, this.heroMaterialStates);
        }
    }

    // The Blender hero exports with per-face (flat) normals and vertices split
    // per triangle — measured 100% flat-shaded across a 3000-triangle sample,
    // 194,932 verts for 64,982 tris. That faceting, not the triangle budget, is
    // why the 65k mesh looked cheaper than the 372k one: an external taste review
    // preferred the heavy mesh purely to escape it, then reversed once smoothed.
    // Welding coincident vertices and recomputing normals removes it entirely.
    //
    // This is a STOPGAP so the relic can be judged honestly at the gate without
    // waiting on a Blender session. The proper fix is re-exporting with weighted
    // normals, which costs nothing at runtime; this costs one load-time pass.
    // Skipped when normals are already smooth, so a fixed export self-disables it.
    repairFlatNormals(mesh) {
        const geometry = mesh.geometry;
        const normal = geometry?.attributes?.normal;
        const position = geometry?.attributes?.position;
        if (!normal || !position || !geometry.index) {
            return;
        }

        // Fingerprint: on a flat-shaded mesh every triangle's three normals match.
        const sampleTris = Math.min(600, geometry.index.count / 3);
        let flat = 0;
        for (let t = 0; t < sampleTris; t += 1) {
            const a = geometry.index.getX(t * 3);
            const b = geometry.index.getX(t * 3 + 1);
            if (Math.abs(normal.getX(a) - normal.getX(b)) < 1e-5
                && Math.abs(normal.getY(a) - normal.getY(b)) < 1e-5
                && Math.abs(normal.getZ(a) - normal.getZ(b)) < 1e-5) {
                flat += 1;
            }
        }
        if (flat / sampleTris < 0.9) {
            return;
        }

        const started = performance.now();
        const buckets = new Map();
        const keyAt = (i) => `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
        for (let i = 0; i < position.count; i += 1) {
            const key = keyAt(i);
            const acc = buckets.get(key) || [0, 0, 0];
            acc[0] += normal.getX(i);
            acc[1] += normal.getY(i);
            acc[2] += normal.getZ(i);
            buckets.set(key, acc);
        }
        for (let i = 0; i < position.count; i += 1) {
            const acc = buckets.get(keyAt(i));
            const length = Math.hypot(acc[0], acc[1], acc[2]) || 1;
            normal.setXYZ(i, acc[0] / length, acc[1] / length, acc[2] / length);
        }
        normal.needsUpdate = true;
        console.info(
            `[Prototype] smoothed flat hero normals (${position.count} verts, `
            + `${Math.round(performance.now() - started)}ms) — re-export with weighted normals to retire this`
        );
    }

    resolveModelUrls() {
        return resolveHeroModelCandidates({
            heroConfig: this.heroConfig,
            defaultConfig: DEFAULT_HERO_CONFIG,
            relicChoice: this.resolveRelicChoice(),
            artifactMode: this.artifactMode,
            texturedModelEnabled: this.texturedModelEnabled,
            themeUrl: window.sonoiteData?.themeUrl || ''
        });
    }

    resetAudioAccents() {
        this.audioAccentDetector.reset();
        this.track1StageResponse.reset();
        this.analysisState.surfaceResponse = 0;
        this.pendingAudioAccent = false;
        this.analysisState.accentRise = false;
        this.analysisState.accentPulse = 0;
    }

    receiveAudioAnalysis(analysis) {
        this.audioState.averageLevel = analysis.averageLevel || 0;
        this.audioState.bassLevel = analysis.bassLevel || 0;
        this.audioState.midLevel = analysis.midLevel || 0;
        this.audioState.trebleLevel = analysis.trebleLevel || 0;
        if (!this.state.playing || !this.isVisible || this.reducedMotion) {
            this.resetAudioAccents();
            return;
        }
        const rise = this.audioAccentDetector.update(
            analysis.frequency,
            analysis.timestamp / 1000,
            this.audio.audioContext?.sampleRate,
            this.audio.analyser?.fftSize
        );
        // The audio and render loops have different cadences. Keep a hit until
        // one render consumes it, even if another audio sample arrives first.
        this.pendingAudioAccent ||= rise;
    }

    setListeningVolume(value) {
        if (!Number.isFinite(value)) {
            return;
        }
        this.listeningVolume = clamp(value, 0, 1);
        if (this.listeningGain) {
            const now = this.audio.audioContext.currentTime;
            this.listeningGain.gain.cancelScheduledValues(now);
            this.listeningGain.gain.setTargetAtTime(this.listeningVolume, now, 0.025);
        }
        this.shell?.setListeningVolume(this.listeningVolume);
        try {
            window.localStorage.setItem('sonoite-listening-volume', String(this.listeningVolume));
        } catch { /* The control still works without preference storage. */ }
    }

    setupAudio() {
        this.audio = new AudioManager({
            ...(window.sonoiteData?.audioConfig || {}),
            analysisTargetFps: 24,
            enableAdvancedAnalysis: false,
            analysisIncludeFloatFrequencyData: false,
            analysisIncludeTimeDomainData: false
        });
        // Listening level comes after analysis so recording spoken reactions
        // at low volume does not reduce the visual response to the track.
        if (this.audio.audioContext && this.audio.analyser) {
            this.listeningGain = this.audio.audioContext.createGain();
            this.listeningGain.gain.value = this.listeningVolume ?? 1;
            this.audio.setOutputNode(this.listeningGain);
            this.listeningGain.connect(this.audio.audioContext.destination);
        }
        this.bindAudioContextState();
        this.audio.currentTime = 0;
        this.audio.startTime = 0;
        this.audio.isPaused = false;
        this.audio.on('onTimeUpdate', () => {});
        this.audio.on('onTrackEnd', () => this.completePlayback());
        this.audio.on('onPlay', () => {
            this.resetAudioAccents();
            const playbackEnd = this.getPlaybackEndTime();
            this.requestedStartElapsed = null;
            this.audioPlaybackStarted = true;
            this.shell.updateTime(this.state.currentTime, playbackEnd);
        });
        this.audio.on('onPause', () => {
            this.resetAudioAccents();
            this.audioPlaybackStarted = false;
            this.state.playing = false;
            const playbackEnd = this.getPlaybackEndTime();
            this.state.currentTime = clamp(this.audio.getCurrentTime(), 0, playbackEnd);
            this.pendingTransportElapsed = this.state.currentTime;
            this.shell.setPlaying(false);
            this.shell.setReady(true);
            this.shell.showChrome();
            this.shell.updateTime(this.state.currentTime, playbackEnd);
        });
        this.audio.on('onStop', () => {
            this.resetAudioAccents();
            this.audioPlaybackStarted = false;
            this.state.playing = false;
            const playbackEnd = this.getPlaybackEndTime();
            this.state.currentTime = clamp(this.audio.getCurrentTime(), 0, playbackEnd);
            this.pendingTransportElapsed = this.state.currentTime;
            this.shell.setPlaying(false);
            this.shell.setReady(true);
            this.shell.showChrome();
            this.shell.updateTime(this.state.currentTime, playbackEnd);
        });
        this.audio.on('onError', (message) => {
            this.isPlaybackBooting = false;
            this.shell.setInteractiveDisabled(false);
            this.shell.setStatus(message || 'audio error');
            if (!this.autoContinuing) {
                this.shell.showPlaybackError();
            }
        });
        this.audio.onFrequencyUpdate((analysis) => this.receiveAudioAnalysis(analysis));
    }

    bindAudioContextState() {
        const context = this.audio.audioContext;
        this.audioContextStateHandler = () => {
            if (this.state.playing && context.state === 'running') {
                this.transportStartSeconds = performance.now() / 1000 - this.audio.getCurrentTime();
            }
        };
        context?.addEventListener('statechange', this.audioContextStateHandler);
    }

    updateTransport() {
        if (!this.state.playing || !this.audioPlaybackStarted || !this.audio?.isPlaying
            || (this.audio.audioContext && this.audio.audioContext.state !== 'running')) {
            return;
        }
        const playbackEnd = this.getPlaybackEndTime();
        this.state.currentTime = clamp(performance.now() / 1000 - this.transportStartSeconds, 0, playbackEnd);
        this.shell.updateTime(this.state.currentTime, playbackEnd);
        if (this.state.currentTime >= playbackEnd && !this.state.proofComplete) {
            this.completePlayback();
            if (this.probeLetter) {
                console.info('[Probe] session complete — run __revealProbe() to unmask');
            }
        }
    }

    bindEvents() {
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        window.addEventListener('pagehide', this.pageHideHandler);
    }

    handleVisibilityChange() {
        if (this.isDestroyed) {
            return;
        }

        this.isVisible = !document.hidden;

        if (!this.isVisible) {
            if (this.animationFrame) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            if (this.frameTimer) {
                window.clearTimeout(this.frameTimer);
                this.frameTimer = null;
            }
            return;
        }

        // Reset the clock delta after backgrounding to avoid a giant simulation step.
        this.clock.getDelta();

        if (!this.animationFrame && !this.frameTimer) {
            this.render();
        }
    }

    handlePageHide() {
        this.destroy();
    }

    handlePointerMove() {
        const now = performance.now();
        if (now - this.lastUiUpdateAt < 120) {
            return;
        }
        this.lastUiUpdateAt = now;
        this.shell.showChrome();
    }

    async ensureTrackLoaded({ background = false } = {}) {
        if (this.audioLoaded) {
            return;
        }

        if (this.pendingAudioLoad) {
            return this.pendingAudioLoad;
        }

        this.pendingAudioLoad = (async () => {
            if (!background) {
                this.shell.setStatus('loading audio');
            }
            const loaded = await this.audio.loadTrack(this.track.audio_url);

            if (!loaded) {
                throw new Error('Failed to load Track 5 audio');
            }

            this.audioLoaded = true;
            this.state.duration = this.proofDuration;
            this.shell.updateTime(this.state.currentTime, this.getPlaybackEndTime());
        })();

        try {
            await this.pendingAudioLoad;
        } finally {
            this.pendingAudioLoad = null;
        }
    }

    preloadAudioInBackground() {
        this.ensureTrackLoaded({ background: true }).catch((error) => {
            console.warn('[Prototype] Background audio preload failed', error);
            this.shell.showPlaybackError();
        });
    }

    retryPlayback() {
        this.audioLoaded = false;
        this.pendingRetry = this.togglePlayback();
        return this.pendingRetry;
    }

    async togglePlayback({ silent = false } = {}) {
        if (!this.state.ready || this.isPlaybackBooting) {
            return;
        }

        this.isPlaybackBooting = true;
        this.shell.setBusy(true, this.audioLoaded ? 'starting audio' : 'loading audio');

        try {
            const contextReady = await this.audio.ensureAudioContextRunning();
            if (!contextReady) {
                throw new Error('Audio context unavailable');
            }

            if (!this.audioLoaded) {
                await this.ensureTrackLoaded();
            }

            if (this.audio.isPlaying) {
                this.audio.pause();
                return;
            }

            const playbackEnd = this.getPlaybackEndTime();
            const shouldRestartAtBeginning = !this.state.started
                || this.state.proofComplete
                || this.state.currentTime <= 0.05
                || this.state.currentTime >= playbackEnd - 0.05;
            let desiredStartElapsed = this.state.currentTime;

            if (shouldRestartAtBeginning) {
                const seeked = await this.audio.seekTo(0);
                if (!seeked) {
                    throw new Error('Playback reset seek failed');
                }
                desiredStartElapsed = 0;
                this.state.proofComplete = false;
                this.playbackCompleted = false;
                this.autoAdvanceStarted = false;
                this.shell.resetThresholdForReprise();
            } else {
                desiredStartElapsed = this.state.currentTime;
            }

            desiredStartElapsed = clamp(desiredStartElapsed, 0, playbackEnd);
            this.state.started = true;
            this.state.hasUserStarted = true;
            this.state.currentTime = desiredStartElapsed;
            this.pendingTransportElapsed = desiredStartElapsed;
            this.requestedStartElapsed = desiredStartElapsed;
            this.shell.updateTime(desiredStartElapsed, playbackEnd);

            const started = await this.audio.play();

            if (!started) {
                throw new Error('Playback start rejected');
            }

            const audioNow = this.audio.audioContext?.currentTime ?? 0;
            this.audio.currentTime = desiredStartElapsed;
            this.audio.startTime = audioNow - desiredStartElapsed;
            // Anchor transport after audio.play() resolves so a slow resume cannot
            // advance state.currentTime by the full async wait (pause/resume QA).
            this.transportStartSeconds = performance.now() / 1000 - desiredStartElapsed;

            this.state.playing = true;
            this.audioPlaybackStarted = true;
            this.shell.setPlaying(true);
            this.shell.hideIntro();
            this.shell.hidePlaybackError?.();
            this.shell.showChrome();
            return true;
        } catch (error) {
            if (!silent) {
                console.error('[Prototype] Playback toggle failed', error);
            }
            this.state.playing = false;
            this.shell.setPlaying(false);
            if (!silent) {
                this.shell.setStatus('playback failed');
                this.shell.showPlaybackError();
            }
            return false;
        } finally {
            this.isPlaybackBooting = false;
            this.shell.setInteractiveDisabled(false);
        }
    }

    async seek(ratio) {
        if (!this.audioLoaded) {
            return;
        }

        const clampedRatio = clamp(ratio, 0, 1);
        const playbackEnd = this.getPlaybackEndTime();
        const targetTime = clampedRatio * playbackEnd;
        this.resetAudioAccents();
        try {
            const seeked = await this.audio.seekTo(targetTime);
            this.resetAudioAccents();
            if (!seeked) {
                return;
            }
            this.state.currentTime = clamp(targetTime, 0, playbackEnd);
            this.pendingTransportElapsed = this.state.currentTime;
            this.transportStartSeconds = performance.now() / 1000 - this.state.currentTime;
            this.state.proofComplete = this.state.currentTime >= playbackEnd - 0.001;
            if (!this.state.proofComplete) {
                this.playbackCompleted = false;
                this.autoAdvanceStarted = false;
            }
            const audioNow = this.audio.audioContext?.currentTime ?? 0;
            this.audio.currentTime = this.state.currentTime;
            this.audio.startTime = audioNow - this.state.currentTime;
            this.shell.updateTime(this.state.currentTime, playbackEnd);
            // ShotDirector resolve() is stateless in absolute seconds — seek needs no director reset.
        } catch (error) {
            console.warn('[Prototype] Seek failed', error);
        }
    }

    handleResize() {
        if (!this.renderer || !this.camera) {
            return;
        }

        const width = this.root.clientWidth;
        const height = this.root.clientHeight;
        this.camera.aspect = width / Math.max(height, 1);
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(this.getRendererPixelRatio());
        this.renderer.setSize(width, height, false);
        this.composer?.setPixelRatio?.(this.getRendererPixelRatio());
        this.composer?.setSize(width, height);
        this.bloomPass?.setSize(width, height);
        this.track5PlatePass?.uniforms?.resolution?.value?.set(
            width * this.getRendererPixelRatio(),
            height * this.getRendererPixelRatio()
        );
        this.setFxaaResolution();
        this.shadowDirty = true;
    }

    getEventState(elapsed) {
        const emptyState = {
            punctuation: 0,
            postCrush: 0,
            blackGap: 0,
            roomOpen: 0,
            roomTighten: 0,
            materialReveal: 0,
            camera: null,
            room: {
                fillDelta: 0,
                backLightDelta: 0,
                shellOpacityDelta: 0,
                floorOpacityDelta: 0,
                thresholdDelta: 0,
                supportDelta: 0,
                roomPressureDelta: 0
            },
            post: {
                bloomDelta: 0,
                grainDelta: 0,
                vignetteDarknessDelta: 0,
                vignetteOffsetDelta: 0,
                vignetteSoftnessDelta: 0,
                exposureDelta: 0
            },
            material: {
                roughnessDelta: 0,
                clearcoatDelta: 0,
                clearcoatRoughnessDelta: 0,
                sheenDelta: 0,
                envMapIntensityDelta: 0
            }
        };

        if (!this.state.started || !this.eventBeats.length) {
            return emptyState;
        }

        this.eventBeats.forEach((beat) => {
            const envelope = sampleEventEnvelope(beat, elapsed);
            if (envelope <= 0) {
                return;
            }

            const weight = envelope * (Number.isFinite(beat.intensity) ? beat.intensity : 1);
            emptyState.punctuation = clamp(
                emptyState.punctuation + weight * (Number.isFinite(beat.punctuationBoost) ? beat.punctuationBoost : 0),
                0,
                1
            );

            if (beat.type === EVENT_TYPE.POST_CRUSH) {
                emptyState.postCrush = Math.max(emptyState.postCrush, weight);
            }
            if (beat.type === EVENT_TYPE.BLACK_GAP) {
                const blackoutOpacity = beat.blackout?.opacity ?? 1;
                emptyState.blackGap = Math.max(emptyState.blackGap, weight * blackoutOpacity);
            }
            if (beat.type === EVENT_TYPE.ROOM_OPEN) {
                emptyState.roomOpen = Math.max(emptyState.roomOpen, weight);
            }
            if (beat.type === EVENT_TYPE.ROOM_TIGHTEN) {
                emptyState.roomTighten = Math.max(emptyState.roomTighten, weight);
            }
            if (beat.type === EVENT_TYPE.MATERIAL_REVEAL) {
                emptyState.materialReveal = Math.max(emptyState.materialReveal, weight);
            }

            if (beat.camera?.position && beat.camera?.target) {
                if (!emptyState.camera || weight > emptyState.camera.weight) {
                    emptyState.camera = {
                        ...beat.camera,
                        weight
                    };
                }
            }

            Object.entries(beat.room || {}).forEach(([key, value]) => {
                if (Object.prototype.hasOwnProperty.call(emptyState.room, key) && Number.isFinite(value)) {
                    emptyState.room[key] += value * weight;
                }
            });

            Object.entries(beat.post || {}).forEach(([key, value]) => {
                if (Object.prototype.hasOwnProperty.call(emptyState.post, key) && Number.isFinite(value)) {
                    emptyState.post[key] += value * weight;
                }
            });

            Object.entries(beat.material || {}).forEach(([key, value]) => {
                if (Object.prototype.hasOwnProperty.call(emptyState.material, key) && Number.isFinite(value)) {
                    emptyState.material[key] += value * weight;
                }
            });
        });

        return emptyState;
    }

    updateCamera(elapsed, absoluteTime, macroState, dynamicState, eventState) {
        const trackTimeSeconds = elapsed;
        if (
            shouldTakeCamera({
                mode: this.shotsQueryMode,
                configEnabled: this.shotDirectorConfigEnabled,
                active: this.shotDirector?.isActive() === true
            })
            && this.applyShotDirectorCamera(trackTimeSeconds)
        ) {
            return;
        }

        const ambientMotion = this.reducedMotionScale ?? 1;
        const settle = this.state.started ? smoothstep(0.0, 3.0, elapsed) : 0;
        const breath = dynamicState.breathing * 0.06 * ambientMotion;
        const phaseProfile = dynamicState.phaseProfile || {};
        const driftPresence = this.state.started ? lerp(0.35, 1.0, settle) : 0.22;
        const score = this.chamberConfig.camera.score || DEFAULT_CHAMBER_CONFIG.camera.score;
        const baseFov = this.chamberConfig.camera.baseFov ?? DEFAULT_CHAMBER_CONFIG.camera.baseFov ?? 40;
        let cameraX = this.baseCameraPosition.x;
        let cameraY = this.baseCameraPosition.y;
        let cameraZ = this.baseCameraPosition.z;
        let targetX = this.cameraTarget.x;
        let targetY = this.cameraTarget.y;
        let targetZ = this.cameraTarget.z;
        let driftScale = 0.3;
        let cameraFov = baseFov;
        let cameraRollDeg = 0;
        let scoreTransition = 0;

        if (this.state.started && score.length) {
            if (elapsed <= score[0].atSeconds) {
                [cameraX, cameraY, cameraZ] = score[0].position;
                [targetX, targetY, targetZ] = score[0].target;
                driftScale = score[0].driftScale ?? driftScale;
                cameraFov = score[0].fov ?? cameraFov;
                cameraRollDeg = score[0].rollDeg ?? cameraRollDeg;
            } else {
                const lastBeat = score[score.length - 1];
                [cameraX, cameraY, cameraZ] = lastBeat.position;
                [targetX, targetY, targetZ] = lastBeat.target;
                driftScale = lastBeat.driftScale ?? driftScale;
                cameraFov = lastBeat.fov ?? cameraFov;
                cameraRollDeg = lastBeat.rollDeg ?? cameraRollDeg;

                for (let index = 0; index < score.length - 1; index += 1) {
                    const currentBeat = score[index];
                    const nextBeat = score[index + 1];
                    const transitionSeconds = nextBeat.transitionSeconds ?? 6;
                    const transitionStart = Math.max(currentBeat.atSeconds, nextBeat.atSeconds - transitionSeconds);

                    if (elapsed >= currentBeat.atSeconds && elapsed < transitionStart) {
                        [cameraX, cameraY, cameraZ] = currentBeat.position;
                        [targetX, targetY, targetZ] = currentBeat.target;
                        driftScale = currentBeat.driftScale ?? driftScale;
                        cameraFov = currentBeat.fov ?? cameraFov;
                        cameraRollDeg = currentBeat.rollDeg ?? cameraRollDeg;
                        break;
                    }

                    if (elapsed >= transitionStart && elapsed < nextBeat.atSeconds) {
                        scoreTransition = smoothstep(transitionStart, nextBeat.atSeconds, elapsed);
                        cameraX = lerp(currentBeat.position[0], nextBeat.position[0], scoreTransition);
                        cameraY = lerp(currentBeat.position[1], nextBeat.position[1], scoreTransition);
                        cameraZ = lerp(currentBeat.position[2], nextBeat.position[2], scoreTransition);
                        targetX = lerp(currentBeat.target[0], nextBeat.target[0], scoreTransition);
                        targetY = lerp(currentBeat.target[1], nextBeat.target[1], scoreTransition);
                        targetZ = lerp(currentBeat.target[2], nextBeat.target[2], scoreTransition);
                        driftScale = lerp(currentBeat.driftScale ?? driftScale, nextBeat.driftScale ?? driftScale, scoreTransition);
                        cameraFov = lerp(currentBeat.fov ?? cameraFov, nextBeat.fov ?? cameraFov, scoreTransition);
                        cameraRollDeg = lerp(currentBeat.rollDeg ?? 0, nextBeat.rollDeg ?? 0, scoreTransition);
                        break;
                    }
                }
            }
        }

        if (!this.getCinematicProposal() && eventState?.camera?.position && eventState?.camera?.target) {
            const cameraMix = clamp(eventState.camera.weight, 0, 1);
            cameraX = lerp(cameraX, eventState.camera.position[0], cameraMix);
            cameraY = lerp(cameraY, eventState.camera.position[1], cameraMix);
            cameraZ = lerp(cameraZ, eventState.camera.position[2], cameraMix);
            targetX = lerp(targetX, eventState.camera.target[0], cameraMix);
            targetY = lerp(targetY, eventState.camera.target[1], cameraMix);
            targetZ = lerp(targetZ, eventState.camera.target[2], cameraMix);
            driftScale = lerp(driftScale, eventState.camera.driftScale ?? driftScale, cameraMix);
            cameraFov = lerp(cameraFov, eventState.camera.fov ?? cameraFov, cameraMix);
        }

        driftScale *= phaseProfile.cameraDriftScale ?? 1;
        const isHorasMortasCinema = this.isHorasMortasCinemaVariant();
        if (isHorasMortasCinema || this.getCinematicProposal()) {
            for (let rampIndex = 0; rampIndex < score.length; rampIndex += 1) {
                /* eslint-disable-next-line security/detect-object-injection -- fixed camera score */
                const beat = score[rampIndex];
                const ramp = beat.fovRamp;
                if (!ramp) {
                    continue;
                }
                const rampEnd = ramp.startAtSeconds + ramp.durationSeconds;
                const nextBeat = score[rampIndex + 1];
                const holdEnd = nextBeat?.atSeconds ?? Infinity;
                if (elapsed < ramp.startAtSeconds || elapsed >= holdEnd) {
                    continue;
                }
                if (elapsed < rampEnd) {
                    const mixT = smoothstep(ramp.startAtSeconds, rampEnd, elapsed);
                    cameraFov = lerp(ramp.from, ramp.to, mixT);
                } else {
                    cameraFov = ramp.to;
                }
                break;
            }
            driftScale = 0;
            this.camera.position.set(cameraX, cameraY, cameraZ);
            this.dynamicCameraTarget.set(targetX, targetY, targetZ);
            if (Math.abs(this.camera.fov - cameraFov) > 0.001) {
                this.camera.fov = cameraFov;
                this.camera.updateProjectionMatrix();
            }
            this.camera.lookAt(this.dynamicCameraTarget);
            if (Math.abs(cameraRollDeg) > 0.001) {
                this.camera.rotateZ(THREE.MathUtils.degToRad(cameraRollDeg));
            }
            return;
        }
        const lateralDrift = Math.sin(absoluteTime * ((Math.PI * 2) / 36)) * this.chamberConfig.camera.xDrift * driftScale * driftPresence * ambientMotion;
        const verticalDrift = Math.cos(absoluteTime * ((Math.PI * 2) / 32)) * this.chamberConfig.camera.yDrift * driftScale * driftPresence * ambientMotion;
        const depthDrift = Math.sin(absoluteTime * ((Math.PI * 2) / 42)) * 0.12 * driftScale * driftPresence * ambientMotion;
        const targetXDrift = Math.sin(absoluteTime * ((Math.PI * 2) / 36) + 0.8) * 0.04 * driftScale * driftPresence * ambientMotion;
        const fovBreathAmplitude = (cameraFov >= 60 ? 1.2 : (cameraFov <= 42 ? 0.6 : 0.85)) * (phaseProfile.fovBreathScale ?? 1);
        const fovBreath = Math.sin(absoluteTime * ((Math.PI * 2) / 28)) * fovBreathAmplitude * driftPresence * ambientMotion;

        const livingCam = this.livingChamber?.outputs.camOffset;
        this.camera.position.x = cameraX
            + lateralDrift
            + (livingCam?.x ?? 0) * driftScale * driftPresence * ambientMotion;
        this.camera.position.y = cameraY
            + settle * 0.03
            + breath * 0.42
            + verticalDrift
            + (livingCam?.y ?? 0) * driftScale * driftPresence * ambientMotion;
        this.camera.position.z = cameraZ
            - scoreTransition * 0.06
            + depthDrift
            + (livingCam?.z ?? 0) * driftScale * driftPresence * ambientMotion;

        this.dynamicCameraTarget.set(targetX + targetXDrift, targetY, targetZ);
        this.dynamicCameraTarget.y += macroState.clarity * 0.05 + settle * 0.05 + breath * 0.32;
        this.dynamicCameraTarget.z -= scoreTransition * 0.08;
        if (Math.abs(this.camera.fov - (cameraFov + fovBreath)) > 0.001) {
            this.camera.fov = cameraFov + fovBreath;
            this.camera.updateProjectionMatrix();
        }
        this.camera.lookAt(this.dynamicCameraTarget);
        if (Math.abs(cameraRollDeg) > 0.001) {
            this.camera.rotateZ(THREE.MathUtils.degToRad(cameraRollDeg));
        }
    }

    updateHero(elapsed, deltaTime, absoluteTime, macroState, dynamicState, roomState) {
        if (!this.hero) {
            return;
        }

        const surfaceResponse = dynamicState.surfaceResponse ?? 0;
        const loadIntro = smoothstep(0, 2.5, absoluteTime);
        const revealProgress = this.state.started ? smoothstep(0, 5.5, elapsed) : 0;
        const opacity = this.state.started ? lerp(0.86, 1.0, revealProgress) : 0.88 + loadIntro * 0.08;
        const chamberWake = this.state.started ? smoothstep(0.4, 6.5, elapsed) : 0;
        const spinGateStart = this.chamberConfig.variant?.spinGateStart ?? 34.0;
        const spinGateEnd = this.chamberConfig.variant?.spinGateEnd ?? 68.0;
        const spinGate = this.state.playing ? smoothstep(spinGateStart, spinGateEnd, elapsed) * roomState.reactivityReveal : 0;
        const spinAmount = this.state.playing
            ? elapsed * (0.0016 + roomState.roomPressure * 0.0008) * spinGate
            : 0;
        const ambientMotion = this.getCinematicProposal() ? 0 : this.reducedMotionScale ?? 1;
        this.hero.rotation.y = this.heroConfig.rotationY + (this.getCinematicProposal() ? 0 : spinAmount);
        this.hero.rotation.z = Math.sin(absoluteTime * 0.04) * 0.003 * ambientMotion
            + dynamicState.breathing * 0.006 * ambientMotion;
        this.hero.position.y = this.heroBasePosition.y
            + dynamicState.breathing * 0.014 * ambientMotion
            + chamberWake * 0.016;
        this.heroMaterialStates.forEach((state) => {
            const {
                material,
                baseOpacity,
                baseRoughness,
                baseClearcoat,
                baseClearcoatRoughness,
                baseSheen,
                baseIridescence,
                baseIridescenceIOR
            } = state;
            const materialResponse = this.chamberConfig.stage3.materialResponse || DEFAULT_CHAMBER_CONFIG.stage3.materialResponse;
            const chamberLaw = roomState.chamberLaw || {};
            const iridescenceAmount = (materialResponse.iridescenceMax ?? 0) * dynamicState.midSustain * roomState.reactivityReveal;
            material.opacity = clamp(opacity * baseOpacity * (1 - (chamberLaw.erasure || 0) * 0.32), 0, 1);
            if (material.userData?.track5CinemaShader?.uniforms) {
                const uniforms = material.userData.track5CinemaShader.uniforms;
                const heroLaw = this.chamberConfig.heroLaw || {};
                const sodiumLevel = this.isHorasMortasCinemaVariant()
                    ? sampleSodiumLightLevel(elapsed)
                    : 1;
                uniforms.uSonoiteDamage.value = clamp(((chamberLaw.damage || 0) + roomState.punctuation * 0.18) * (heroLaw.damageScale ?? 1), 0, 1);
                uniforms.uSonoiteErasure.value = clamp((chamberLaw.erasure || 0) * (heroLaw.erasureScale ?? 1), 0, 1);
                uniforms.uSonoiteAfterimage.value = clamp(
                    ((chamberLaw.afterimage || 0) + roomState.blackGap * 0.24) * (heroLaw.afterimageScale ?? 1) * sodiumLevel,
                    0,
                    1
                );
                uniforms.uSonoiteForensic.value = clamp(
                    ((chamberLaw.forensic || 0) + roomState.materialReveal * 0.28) * (heroLaw.forensicScale ?? 1) * sodiumLevel,
                    0,
                    1
                );
                if (uniforms.uSonoiteSodiumLevel) {
                    uniforms.uSonoiteSodiumLevel.value = sodiumLevel;
                }
                if (uniforms.uSonoiteEggGlow) {
                    uniforms.uSonoiteEggGlow.value = clamp(roomState.materialReveal * 0.95, 0, 1);
                }
            }
            if (Number.isFinite(baseRoughness) && 'roughness' in material) {
                // The accepted gesture was judged on the pale head. Newly
                // separated metal/egg surfaces must not turn it into a flash.
                const surfaceRole = material.userData?.sonoiteMaterialRole;
                const surfaceStrength = !surfaceRole || surfaceRole === 'petals' ? 0.36 : 0;
                let proposalRoughness = 0;
                if (this.getCinematicProposal() && this.isSonoiteCinemaVariant() && elapsed >= 125 && elapsed < 488.5) {
                    proposalRoughness = this.usesTrack1Reliquary()
                        ? this.track1StageResponse.values.surface * 0.045
                        : dynamicState.midSustain * 0.06;
                }
                material.roughness = clamp(
                    baseRoughness
                    + roomState.materialEffects.roughnessDelta
                    - surfaceResponse * surfaceStrength
                    - proposalRoughness
                    + (this.recutLehr?.roughnessHintAt(elapsed) ?? 0),
                    0.04,
                    1.0
                );
            }
            if (Number.isFinite(baseClearcoat) && 'clearcoat' in material) {
                material.clearcoat = clamp(baseClearcoat + roomState.materialEffects.clearcoatDelta, 0.0, 1.0);
            }
            if (Number.isFinite(baseClearcoatRoughness) && 'clearcoatRoughness' in material) {
                material.clearcoatRoughness = clamp(baseClearcoatRoughness + roomState.materialEffects.clearcoatRoughnessDelta, 0.02, 1.0);
            }
            if (Number.isFinite(baseSheen) && 'sheen' in material) {
                material.sheen = clamp(
                    baseSheen
                    + roomState.materialEffects.sheenDelta
                    + (this.recutLehr?.sheenAddAt(elapsed) ?? 0),
                    0.0,
                    1.0
                );
            }
            if (Number.isFinite(baseIridescence) && 'iridescence' in material) {
                material.iridescence = clamp(baseIridescence + iridescenceAmount, 0.0, 1.0);
            }
            if (Number.isFinite(baseIridescenceIOR) && 'iridescenceIOR' in material) {
                material.iridescenceIOR = lerp(
                    materialResponse.iridescenceIORMin ?? baseIridescenceIOR,
                    materialResponse.iridescenceIORMax ?? baseIridescenceIOR,
                    dynamicState.midSustain
                );
            }
        });
        if (this.relicMutation) {
            this.relicMutation.update(elapsed);
        }
    }

    updateGradePass(macroState, deltaTime, elapsed = 0) {
        if (!this.gradePass) {
            return;
        }
        const phases = this.chamberConfig.post?.gradePhases;
        if (!phases) {
            return;
        }
        let target = phases[macroState.phase] || phases.VOID;
        if (!target) {
            return;
        }

        const isHorasMortas = this.isHorasMortasCinemaVariant();
        if (isHorasMortas) {
            const wakingGrade = phases.WAKING;
            const sodiumState = sampleSodiumState(elapsed);
            const inRestrike = sodiumState.mode === 'restrike' || sodiumState.mode === 'warmup';
            if (this._restrikeGradeBlend === undefined || this._restrikeGradeBlend === null) {
                this._restrikeGradeBlend = 1;
            }
            if (inRestrike && wakingGrade) {
                target = wakingGrade;
                this._restrikeGradeBlend = 0;
            } else {
                const dt = clamp(deltaTime || 0.016, 0, 0.25);
                this._restrikeGradeBlend = Math.min(1, this._restrikeGradeBlend + dt / 1.2);
                if (wakingGrade && this._restrikeGradeBlend < 1) {
                    const phaseGrade = phases[macroState.phase] || wakingGrade;
                    const blendT = this._restrikeGradeBlend;
                    target = {
                        mix: lerp(wakingGrade.mix, phaseGrade.mix, blendT),
                        tint: wakingGrade.tint.map((value, index) => lerp(
                            value,
                            /* eslint-disable-next-line security/detect-object-injection -- fixed tint axis */
                            phaseGrade.tint[index],
                            blendT
                        )),
                        lift: (wakingGrade.lift || [0, 0, 0]).map((value, index) => lerp(
                            value,
                            /* eslint-disable-next-line security/detect-object-injection -- fixed lift axis */
                            (phaseGrade.lift || [0, 0, 0])[index],
                            blendT
                        )),
                        saturation: lerp(wakingGrade.saturation, phaseGrade.saturation, blendT),
                        contrast: lerp(wakingGrade.contrast, phaseGrade.contrast, blendT),
                        contrastPivot: lerp(
                            wakingGrade.contrastPivot ?? 0.5,
                            phaseGrade.contrastPivot ?? 0.5,
                            blendT
                        )
                    };
                }
            }
        }

        if (!this._gradeState) {
            this._gradeState = {
                mix: target.mix,
                tint: new THREE.Vector3(...target.tint),
                lift: new THREE.Vector3(...(target.lift || [0, 0, 0])),
                saturation: target.saturation,
                contrast: target.contrast,
                contrastPivot: target.contrastPivot ?? 0.5
            };
            this._gradeTargetVec = new THREE.Vector3();
        }
        // Settle time = cinematic crossfade across phase boundaries; dt clamp keeps
        // seeks and tab-suspend resumes from snapping the grade. Default 3.5s (the
        // frozen Gate-1 feel); variants can shorten it so boundaries read as events
        // or lengthen it so they melt — gradePhases VALUES stay frozen either way.
        const dt = clamp(deltaTime || 0.016, 0, 0.25);
        const settleSeconds = Math.max(0.2, this.chamberConfig.post?.gradeSettleSeconds ?? 3.5);
        const k = 1 - Math.exp(-dt / settleSeconds);
        const s = this._gradeState;
        s.mix += (target.mix - s.mix) * k;
        s.tint.lerp(this._gradeTargetVec.set(...target.tint), k);
        s.lift.lerp(this._gradeTargetVec.set(...(target.lift || [0, 0, 0])), k);
        s.saturation += (target.saturation - s.saturation) * k;
        s.contrast += (target.contrast - s.contrast) * k;
        const targetPivot = target.contrastPivot ?? 0.5;
        s.contrastPivot += (targetPivot - s.contrastPivot) * k;

        this.gradePass.uniforms.mixAmount.value = s.mix;
        this.gradePass.uniforms.tint.value.copy(s.tint);
        this.gradePass.uniforms.lift.value.copy(s.lift);
        this.gradePass.uniforms.saturation.value = s.saturation;
        this.gradePass.uniforms.contrast.value = s.contrast;
        this.gradePass.uniforms.contrastPivot.value = s.contrastPivot;
        this.gradePass.enabled = s.mix > 0.001;
    }

    getMacroState(elapsed) {
        const windows = this.phaseWindows?.length ? this.phaseWindows : DEFAULT_PHASE_WINDOWS;
        const currentWindow = windows.find((window) => elapsed >= window.start && elapsed <= window.end)
            || windows[windows.length - 1];
        const curves = this.chamberConfig.stage3.phaseCurves?.[currentWindow.name]
            || this.chamberConfig.stage3.phaseCurves?.VOID
            || [];
        const phaseDuration = Math.max(currentWindow.end - currentWindow.start, 1);
        const phaseProgress = clamp((elapsed - currentWindow.start) / phaseDuration, 0, 1);

        if (!curves.length) {
            return {
                phase: currentWindow.name,
                phaseProgress,
                air: 0,
                pressure: 0,
                warmth: 0,
                finish: 0,
                veil: 0,
                clarity: 0.5
            };
        }

        if (phaseProgress <= curves[0].at) {
            return {
                phase: currentWindow.name,
                phaseProgress,
                ...curves[0]
            };
        }

        for (let index = 0; index < curves.length - 1; index += 1) {
            const current = curves[index];
            const next = curves[index + 1];

            if (phaseProgress >= current.at && phaseProgress <= next.at) {
                const t = smoothstep(current.at, next.at, phaseProgress);
                return {
                    phase: currentWindow.name,
                    phaseProgress,
                    air: lerp(current.air, next.air, t),
                    pressure: lerp(current.pressure, next.pressure, t),
                    warmth: lerp(current.warmth, next.warmth, t),
                    finish: lerp(current.finish, next.finish, t),
                    veil: lerp(current.veil, next.veil, t),
                    clarity: lerp(current.clarity, next.clarity, t)
                };
            }
        }

        const last = curves[curves.length - 1];
        return {
            phase: currentWindow.name,
            phaseProgress,
            ...last
        };
    }

    isSurfaceReactionStudy() {
        return ['surface', 'surface-three', 'surface-two', 'surface-none'].includes(this.urlParams.get('reaction'))
            && this.track?.slug === 'nao-querer-nada'
            && this.chamberVariantKey === 'track5-cinema'
            && this.artifactMode === 'textured' && this.texturedParam !== '1'
            && !this.recutEnabled;
    }

    isSurfaceShotLocked(elapsed) {
        return this.isSurfaceReactionStudy()
            && this.urlParams.get('reaction') !== 'surface'
            && elapsed >= 225 && elapsed < 255;
    }

    getSurfaceStudyShotTime(elapsed) {
        // Reuse the canonical medium shot and its cold-side rig, with motion suppressed.
        return this.isSurfaceShotLocked(elapsed) ? 240 : elapsed;
    }

    getAudioReactionPreviewGain() {
        if (this.isSurfaceReactionStudy()) {
            return 1;
        }
        // URL-only owner diagnostic; never stored or carried to the next track.
        const requested = this.urlParams.get('reactivity');
        let gain = 1;
        if (requested === '5') {
            gain = 5;
        } else if (requested === '2') {
            gain = 2;
        }
        return this.track?.slug === 'nao-querer-nada'
            && this.state.playing && !this.reducedMotion ? gain : 1;
    }

    updateAnalysisState(deltaTime, elapsed, macroState) {
        this.track1StageResponse.update(this.audioState, deltaTime,
            this.usesTrack1Reliquary() && this.urlParams.get('response') !== '0'
            && this.state.playing && this.isVisible && !this.reducedMotion);
        const reactionGain = this.getAudioReactionPreviewGain();
        const stage3Config = this.chamberConfig.stage3 || DEFAULT_CHAMBER_CONFIG.stage3;
        const breathingConfig = stage3Config.reliquaryBreathing || DEFAULT_CHAMBER_CONFIG.stage3.reliquaryBreathing;
        const phaseResponse = stage3Config.phaseResponse || DEFAULT_CHAMBER_CONFIG.stage3.phaseResponse;
        const phaseProfile = stage3Config.phaseProfiles?.[macroState.phase] || {};
        const materialResponse = stage3Config.materialResponse || DEFAULT_CHAMBER_CONFIG.stage3.materialResponse;
        const revealStart = stage3Config.reactivityRevealStartSeconds ?? DEFAULT_CHAMBER_CONFIG.stage3.reactivityRevealStartSeconds;
        const revealEnd = stage3Config.reactivityRevealEndSeconds ?? DEFAULT_CHAMBER_CONFIG.stage3.reactivityRevealEndSeconds;
        const phaseDrive = clamp(
            (macroState.air ?? 0) * 0.42
            + (macroState.pressure ?? 0) * 0.34
            + (1 - (macroState.veil ?? 0)) * 0.24,
            0,
            1
        );
        const audioDrive = lerp(
            phaseResponse.audioDriveMin ?? 0.42,
            phaseResponse.audioDriveMax ?? 1.18,
            phaseDrive
        ) * (phaseProfile.audioDriveScale ?? 1);
        const supportDrive = lerp(
            phaseResponse.supportDriveMin ?? 0.46,
            phaseResponse.supportDriveMax ?? 1.24,
            clamp(
                (macroState.clarity ?? 0.5) * 0.52
                + (1 - (macroState.veil ?? 0)) * 0.28
                + (macroState.finish ?? 0) * 0.2,
                0,
                1
            )
        ) * (phaseProfile.supportDriveScale ?? 1);
        const smoothingScale = phaseProfile.smoothingScale ?? 1;
        const attack = Math.min(1, deltaTime * lerp(phaseResponse.smoothingSlow ?? 1.1, phaseResponse.smoothingFast ?? 3.4, phaseDrive) * smoothingScale);
        const bassAttack = Math.min(1, deltaTime * lerp((phaseResponse.smoothingSlow ?? 1.1) + 0.5, (phaseResponse.smoothingFast ?? 3.4) + 0.9, phaseDrive) * smoothingScale);
        const midAttack = Math.min(1, deltaTime * lerp((phaseResponse.smoothingSlow ?? 1.1) + 0.2, (phaseResponse.smoothingFast ?? 3.4) + 0.4, phaseDrive) * smoothingScale);

        this.analysisState.smoothedAverage = lerp(
            this.analysisState.smoothedAverage,
            this.audioState.averageLevel,
            attack
        );
        this.analysisState.smoothedBass = lerp(
            this.analysisState.smoothedBass,
            this.audioState.bassLevel,
            bassAttack
        );
        this.analysisState.smoothedMid = lerp(
            this.analysisState.smoothedMid,
            this.audioState.midLevel,
            midAttack
        );

        const canAccent = this.state.playing && this.isVisible && !this.reducedMotion;
        const accentRise = canAccent && this.pendingAudioAccent;
        this.pendingAudioAccent = false;
        if (!canAccent) {
            this.resetAudioAccents();
        }
        this.analysisState.accentRise = accentRise;
        // The ledger keeps the clean surface matte before the collapse (no gloss gesture).
        const proposalSurface = this.getCinematicProposal() && this.isTrack5Film() && !this.usesTrack5Ledger();
        this.analysisState.surfaceResponse = canAccent && (proposalSurface || this.isSurfaceReactionStudy())
            ? sampleTrack5SurfaceResponse(elapsed, proposalSurface ? 'two' : this.urlParams.get('reaction').replace('surface-', '')) : 0;
        if (accentRise) {
            const accentAmount = this.chamberConfig.stage3.accentIntensity * (phaseProfile.accentScale ?? 1);
            this.analysisState.accentPulse = Math.max(this.analysisState.accentPulse, accentAmount);
        }

        const decaySeconds = this.chamberConfig.stage3.accentDecaySeconds;
        this.analysisState.accentPulse *= Math.exp(-deltaTime / Math.max(decaySeconds * lerp(1.24, 0.72, phaseDrive), 0.001));

        const reactivityReveal = this.state.started ? smoothstep(revealStart, revealEnd, elapsed) : 0;
        const midThreshold = materialResponse.midThreshold ?? DEFAULT_CHAMBER_CONFIG.stage3.materialResponse.midThreshold;
        const midEnergy = clamp(
            (this.analysisState.smoothedMid - midThreshold) / Math.max(1 - midThreshold, 0.001),
            0,
            1
        );
        const sustainAttack = clamp(
            deltaTime / Math.max((materialResponse.midAttackSeconds ?? 2.0) * lerp(1.45, 0.72, phaseDrive), 0.001),
            0,
            1
        );
        const sustainRelease = clamp(
            deltaTime / Math.max((materialResponse.midReleaseSeconds ?? 4.0) * lerp(1.28, 0.78, phaseDrive), 0.001),
            0,
            1
        );
        const sustainLerp = midEnergy >= this.analysisState.midSustain ? sustainAttack : sustainRelease;
        this.analysisState.midSustain = lerp(this.analysisState.midSustain, midEnergy, sustainLerp);
        const autonomousWeight = this.state.started ? lerp(1.0, 0.78, reactivityReveal) : 1.0;
        const autonomousClock = this.clock.elapsedTime * breathingConfig.autonomousRate;
        const autonomousPrimary = Math.sin(autonomousClock) * 0.74;
        const autonomousSecondary = Math.sin(autonomousClock * 0.42 + 1.3) * 0.26;
        const autonomous = (autonomousPrimary + autonomousSecondary) * breathingConfig.autonomous * autonomousWeight;
        const audioBreathing = (this.analysisState.smoothedAverage - 0.11)
            * this.chamberConfig.stage3.breathingAmount
            * audioDrive
            * (phaseProfile.breathScale ?? 1) * reactionGain;
        const breathing = autonomous + audioBreathing * reactivityReveal;
        return {
            breathing: clamp(breathing, -0.14, 0.36),
            autonomousBreathing: autonomous,
            audioBreathing,
            audioAverage: this.analysisState.smoothedAverage * reactionGain,
            audioDrive,
            supportDrive,
            phaseDrive,
            phaseProfile,
            reactivityReveal,
            accent: clamp(this.analysisState.accentPulse, 0, 0.85) * reactionGain,
            midSustain: clamp(this.analysisState.midSustain * reactivityReveal, 0, 1) * reactionGain,
            surfaceResponse: this.analysisState.surfaceResponse,
            macro: macroState
        };
    }

    getChamberLaw(elapsed) {
        const lawCurve = this.chamberConfig.stage3?.chamberLaw || [];
        const emptyLaw = {
            gravity: 0,
            contact: 0,
            airDensity: 0,
            damage: 0,
            forensic: 0,
            afterimage: 0,
            erasure: 0,
            uiSuppression: 0
        };

        if (!this.state.started || !lawCurve.length) {
            return emptyLaw;
        }

        return Object.fromEntries(
            Object.keys(emptyLaw).map((field) => [
                field,
                clamp(sampleTimedCurve(lawCurve, elapsed, field), 0, 1)
            ])
        );
    }

    getRoomState(elapsed, macroState, dynamicState, eventState) {
        const stage3Config = this.chamberConfig.stage3 || DEFAULT_CHAMBER_CONFIG.stage3;
        const pressureBeats = stage3Config.roomPressureBeats || DEFAULT_CHAMBER_CONFIG.stage3.roomPressureBeats;
        const phaseProfile = dynamicState.phaseProfile || {};
        const chamberLaw = this.getChamberLaw(elapsed);
        const { value: roomPressureBase, transition: pressureTransition } = sampleHeldTimedCurve(pressureBeats, elapsed, 'value');
        const eventRoom = eventState?.room || {};
        const eventPost = eventState?.post || {};
        const eventMaterial = eventState?.material || {};
        const legacyPunctuation = (!this.eventBeats.length && this.state.started)
            ? clamp(smoothstep(29.0, 32.5, elapsed) - smoothstep(36.0, 40.5, elapsed), 0, 1)
            : 0;
        const punctuation = this.state.started
            ? clamp(legacyPunctuation + (eventState?.punctuation || 0), 0, 1)
            : 0;
        const temperatureArc = this.state.started ? smoothstep(6.0, 72.0, elapsed) : 0.12;
        const preplayPresence = 0.12 + Math.abs(dynamicState.autonomousBreathing) * 1.1;
        const thresholdPresence = this.state.started
            ? clamp(0.18 + roomPressureBase * 0.62 + pressureTransition * 0.26 + dynamicState.supportDrive * 0.08 + (phaseProfile.thresholdDelta || 0) + (eventRoom.thresholdDelta || 0), 0, 1)
            : clamp(preplayPresence, 0.1, 0.28);
        const supportPresence = this.state.started
            ? clamp(0.12 + roomPressureBase * 0.5 + pressureTransition * 0.18 + dynamicState.reactivityReveal * 0.16 + dynamicState.supportDrive * 0.14 + dynamicState.accent * 0.06 + (phaseProfile.supportDelta || 0) + (eventRoom.supportDelta || 0), 0, 1)
            : clamp(0.08 + Math.abs(dynamicState.autonomousBreathing) * 0.9, 0.08, 0.2);
        const listeningAccent = dynamicState.accent * (0.12 + dynamicState.reactivityReveal * 0.88) * dynamicState.audioDrive;
        const roomPressure = clamp(roomPressureBase + chamberLaw.gravity * 0.12 + pressureTransition * 0.06 + punctuation * 0.06 + listeningAccent * 0.08 + dynamicState.breathing * 0.05 * dynamicState.audioDrive + (phaseProfile.roomPressureDelta || 0) + (eventRoom.roomPressureDelta || 0), 0, 1);
        const temperature = clamp(macroState.warmth * 0.94 + temperatureArc * 0.22 + chamberLaw.forensic * 0.08 - chamberLaw.erasure * 0.16 + pressureTransition * 0.12 + punctuation * 0.24, 0, 1);
        const postEffects = {
            ...eventPost,
            exposureDelta: (eventPost.exposureDelta || 0) - chamberLaw.airDensity * 0.018 - chamberLaw.erasure * 0.16 + chamberLaw.forensic * 0.04,
            bloomDelta: (eventPost.bloomDelta || 0) + chamberLaw.afterimage * 0.08 + chamberLaw.forensic * 0.028 - chamberLaw.erasure * 0.045,
            grainDelta: (eventPost.grainDelta || 0) + chamberLaw.damage * 0.012 + chamberLaw.erasure * 0.018,
            vignetteDarknessDelta: (eventPost.vignetteDarknessDelta || 0) + chamberLaw.airDensity * 0.06 + chamberLaw.uiSuppression * 0.04 + chamberLaw.erasure * 0.14,
            vignetteOffsetDelta: (eventPost.vignetteOffsetDelta || 0) - chamberLaw.gravity * 0.03 - chamberLaw.erasure * 0.08,
            vignetteSoftnessDelta: (eventPost.vignetteSoftnessDelta || 0) - chamberLaw.damage * 0.02 + chamberLaw.afterimage * 0.03
        };
        const materialEffects = {
            ...eventMaterial,
            roughnessDelta: (eventMaterial.roughnessDelta || 0) + chamberLaw.damage * 0.08 + chamberLaw.erasure * 0.16 - chamberLaw.forensic * 0.05,
            clearcoatDelta: (eventMaterial.clearcoatDelta || 0) + chamberLaw.forensic * 0.08 - chamberLaw.damage * 0.04,
            clearcoatRoughnessDelta: (eventMaterial.clearcoatRoughnessDelta || 0) + chamberLaw.damage * 0.08,
            sheenDelta: (eventMaterial.sheenDelta || 0) + chamberLaw.afterimage * 0.08,
            envMapIntensityDelta: (eventMaterial.envMapIntensityDelta || 0) + chamberLaw.forensic * 0.05 - chamberLaw.erasure * 0.08
        };

        return {
            roomPressure,
            roomPressureBase,
            pressureTransition,
            punctuation,
            thresholdPresence,
            supportPresence,
            phaseProfile,
            supportDrive: dynamicState.supportDrive,
            audioDrive: dynamicState.audioDrive,
            reactivityReveal: dynamicState.reactivityReveal,
            listeningAccent,
            release: 1 - roomPressure,
            chamberLaw,
            warmthBias: lerp(0.0, macroState.warmth, 0.35 + roomPressure * 0.45) + temperatureArc * 0.08,
            temperature,
            postEffects,
            roomEffects: eventRoom,
            materialEffects,
            postCrush: eventState?.postCrush || 0,
            blackGap: Math.max(eventState?.blackGap || 0, chamberLaw.erasure * 0.18),
            roomOpen: eventState?.roomOpen || 0,
            roomTighten: eventState?.roomTighten || 0,
            materialReveal: eventState?.materialReveal || 0
        };
    }

    updateBreathingChannels(deltaTime, elapsed, dynamicState) {
        const breathingConfig = this.chamberConfig.stage3.reliquaryBreathing || DEFAULT_CHAMBER_CONFIG.stage3.reliquaryBreathing;
        const shellLead = clamp(deltaTime * (1.35 + breathingConfig.shellLead), 0, 1);
        const beamFollow = clamp(deltaTime * (0.28 + breathingConfig.beamFollow), 0, 1);
        const poolLag = clamp(deltaTime * (0.12 + breathingConfig.poolLag), 0, 1);
        const frameLag = clamp(deltaTime * (0.06 + breathingConfig.frameLag), 0, 1);
        const target = dynamicState.breathing;

        this.breathChannels.shell = lerp(this.breathChannels.shell, target, shellLead);
        this.breathChannels.beam = lerp(this.breathChannels.beam, target * 0.82 + this.breathChannels.shell * 0.18, beamFollow);
        this.breathChannels.pool = lerp(this.breathChannels.pool, target * 0.58 + this.breathChannels.shell * 0.24, poolLag);
        this.breathChannels.frame = lerp(this.breathChannels.frame, target * 0.36 + this.breathChannels.pool * 0.26, frameLag);
        this.breathChannels.unfurl = this.state.started
            ? clamp(smoothstep(0, breathingConfig.unfurlDuration, elapsed), 0, 1)
            : 0;

        if (this.analysisState.previousBreathing > this.breathChannels.shell + 0.004) {
            this.breathChannels.echo = Math.max(
                this.breathChannels.echo,
                this.analysisState.previousBreathing * breathingConfig.memoryEcho
            );
        }

        this.breathChannels.echo = lerp(
            this.breathChannels.echo,
            0,
            clamp(deltaTime * (0.4 + breathingConfig.echoDecay), 0, 1)
        );
        this.analysisState.previousBreathing = this.breathChannels.shell;
    }

    updateChamberFog(elapsed, macroState, roomState) {
        if (!this.scene?.fog || !('density' in this.scene.fog)) {
            return;
        }
        const phaseProfile = roomState.phaseProfile || {};
        const chamberLaw = roomState.chamberLaw || {};
        const roomPressure = roomState.roomPressure;
        const effectiveAccent = roomState.listeningAccent;
        const airState = clamp(macroState.air * (0.24 + roomState.reactivityReveal * 0.76)
            + this.breathChannels.shell * 0.32, 0, 1.0);
        const fogDrive = (this.chamberConfig.fogDensity || 0.018)
            + (phaseProfile.fogDelta || 0)
            + airState * 0.003
            + roomPressure * 0.004
            + (chamberLaw.airDensity || 0) * 0.006
            - (chamberLaw.erasure || 0) * 0.004
            + effectiveAccent * 0.002
            + this.godRayIntensity * 0.005;
        if (this.recutAtmosphere && this.isRecutActive()) {
            // Stage 2a: currently a measured no-op — the tuned additive is 0 and
            // the tuned ceiling is the shipped 0.04, so this evaluates to the
            // same density as the branch below (verified live: fog density is
            // bit-identical with and without Stage 2a at every checkpoint).
            // Both fog probes measured as information LOSS in the wides: density
            // 0.038 -> 0.075 took bar 102 from 32/40 to 36/40 empty tiles, and
            // repainting the fog colour moved it only 3 tiles, because the void
            // there is `scene.background`, not fogged geometry. The seam stays
            // because fog is the right place for a future warm fog colour to
            // hang off. See recut-atmosphere.js.
            this.scene.fog.density = clamp(
                fogDrive + this.recutAtmosphere.fogDensityAddAt(elapsed),
                0.008,
                this.recutAtmosphere.fogDensityMaxAt(elapsed)
            );
        } else {
            this.scene.fog.density = clamp(fogDrive, 0.008, 0.04);
        }
    }

    updateAtmosphere(elapsed, absoluteTime, macroState, dynamicState, roomState) {
        if (this.usesPhysicalScene()) {
            this.updateChamberFog(elapsed, macroState, roomState);
            this.physicalWallWash.angle = 0.95;
            this.physicalWallWash.target.position.set(-3, 3, -9);
            this.physicalChamber.material.userData.floorAlbedo.value = 0.16;
            // An authored wall wash, aimed behind the relic. No onset input.
            this.physicalWallWash.intensity = this.state.started
                ? 300 * smoothstep(36, 100, elapsed) * (1 - smoothstep(488, 534, elapsed))
                : 0;
            return;
        }
        const isSacristy = this.chamberConfig.darknessMode === DARKNESS_MODE.SACRISTY;
        const isSonoiteCinema = this.isSonoiteCinemaVariant();
        const isHorasMortasCinema = this.isHorasMortasCinemaVariant();
        const variantConfig = this.chamberConfig.variant || DEFAULT_CHAMBER_CONFIG.variant;
        let consecrationHazeArc = 0;
        let sodiumHazeArc = 0;
        let sodiumBlackout = false;
        let practicalRoster = null;
        if (isSonoiteCinema) {
            practicalRoster = this.chamberPracticals?.entries?.map((entry) => entry.practical)
                ?? filterPracticalsForQuality(this.qualityMode);
            consecrationHazeArc = sampleConsecrationHazeArc(elapsed, practicalRoster);
        }
        if (isHorasMortasCinema) {
            sodiumBlackout = isSodiumAtmosphereBlackout(elapsed);
            sodiumHazeArc = sodiumBlackout ? 0 : sampleSodiumHazeArc(elapsed);
        }
        const phaseProfile = roomState.phaseProfile || {};
        const roomEffects = roomState.roomEffects || {};
        const shellBreath = this.breathChannels.shell;
        const poolBreath = this.breathChannels.pool;
        const breathEcho = this.breathChannels.echo;
        const effectiveBreathing = shellBreath;
        const effectiveAccent = roomState.listeningAccent;
        const airState = clamp(macroState.air * (0.24 + roomState.reactivityReveal * 0.76) + effectiveBreathing * 0.32, 0, 1.0);
        const pressureState = roomState.roomPressure;
        const average = dynamicState.audioAverage;
        const establish = this.state.started ? smoothstep(0.0, 3.5, elapsed) : 0;
        const claim = this.state.started ? smoothstep(12.0, 38.0, elapsed) : 0;
        const introMix = this.state.started ? lerp(0.66, 1.0, establish) : 0.74;
        const roomPulse = clamp(pressureState * 0.75 + effectiveBreathing * 0.28 + effectiveAccent * 0.42, 0, 1);
        const roomPressure = roomState.roomPressure;
        const pressureTransition = roomState.pressureTransition;
        const punctuation = roomState.punctuation;
        const chamberLaw = roomState.chamberLaw || {};
        const accent = dynamicState.accent ?? 0;
        const dustPercussiveGain = variantConfig.dustPercussiveGain ?? 0;
        const hazePercussiveGain = variantConfig.hazePercussiveGain ?? 0;
        const preIgnitionCap = variantConfig.percussivePreIgnitionCap ?? 0.6;
        let percussiveLitMul = 0;
        if (dustPercussiveGain > 0 || hazePercussiveGain > 0) {
            if (isSonoiteCinema && practicalRoster) {
                percussiveLitMul = countLitPracticals(elapsed, practicalRoster) > 0
                    ? consecrationHazeArc
                    : preIgnitionCap;
            } else {
                percussiveLitMul = consecrationHazeArc > 0 ? consecrationHazeArc : preIgnitionCap;
            }
        }
        const dustPercussiveHit = accent * dustPercussiveGain * percussiveLitMul;
        const hazePercussiveHit = accent * hazePercussiveGain * percussiveLitMul;
        const dustPresence = isSacristy
            ? (this.state.started ? (variantConfig.dustStartedPresence ?? 0.08) : (variantConfig.dustIdlePresence ?? 0.04))
            : 1.0;
        const dustIntro = this.state.started ? smoothstep(18.0, 54.0, elapsed) : (variantConfig.dustIdleMix ?? 0.06);
        const dustDrive = (
            this.chamberConfig.air.dustBase
            + airState * this.chamberConfig.air.dustAirGain
            + pressureState * this.chamberConfig.air.dustPressureGain
            + average * this.chamberConfig.air.dustAudioGain * roomState.audioDrive
            + (phaseProfile.dustDelta || 0)
            + pressureTransition * 0.02
            + punctuation * 0.05
            + (chamberLaw.airDensity || 0) * 0.018
            + (chamberLaw.afterimage || 0) * 0.012
        );
        if (this.recutAtmosphere && this.isRecutActive()) {
            // Stage 2a: the additive opacity joins the SAME drive sum so it inherits
            // the existing presence / intro / `dustMul` breath wiring rather than
            // becoming a second, independent dust system; only the ceiling is raised.
            this.dust.material.opacity = clamp(
                (dustDrive + this.recutAtmosphere.dustOpacityAddAt(elapsed))
                * dustPresence * introMix * dustIntro * (this.livingChamber?.outputs.dustMul ?? 1)
                * (isSonoiteCinema ? consecrationHazeArc : 1),
                0,
                this.recutAtmosphere.dustOpacityMaxAt(elapsed)
            );
        } else if (isHorasMortasCinema && sodiumBlackout) {
            this.dust.material.opacity = 0;
            this.dust.visible = false;
        } else {
            this.dust.visible = true;
            // Operand order below is the shipped expression verbatim: float
            // multiplication is not associative, so the default path must not be
            // re-grouped even though the algebra is the same.
            this.dust.material.opacity = clamp(
                dustDrive * dustPresence * introMix * dustIntro * (this.livingChamber?.outputs.dustMul ?? 1)
                * (isSonoiteCinema ? consecrationHazeArc : 1)
                * (isHorasMortasCinema ? sodiumHazeArc : 1),
                0,
                variantConfig.dustOpacityMax ?? 0.16
            );
        }
        if (dustPercussiveGain > 0) {
            const dustOpacityMax = variantConfig.dustOpacityMax ?? 0.16;
            this.dust.material.opacity = clamp(
                this.dust.material.opacity + dustPercussiveHit,
                0,
                dustOpacityMax + dustPercussiveGain
            );
            if (this.dustBaseColor) {
                this.dust.material.color.copy(this.dustBaseColor).multiplyScalar(1 + dustPercussiveHit);
            }
        } else if (this.dustBaseColor) {
            this.dust.material.color.copy(this.dustBaseColor);
        }
        this.dust.material.size = this.chamberConfig.air.dustSize;
        if (isSacristy || isHorasMortasCinema) {
            if (variantConfig.dustMotion === DUST_MOTION.CONE) {
                this.dust.rotation.y = Math.sin(absoluteTime * 0.0046) * 0.045 + roomState.release * 0.04;
                this.dust.rotation.x = Math.sin(absoluteTime * 0.0018 + 1.2) * 0.02;
                this.dust.position.x = Math.sin(absoluteTime * 0.0032) * 0.08 + claim * 0.04;
                this.dust.position.y = Math.sin(absoluteTime * 0.006 + 0.8) * 0.04 + roomState.supportPresence * 0.045;
            } else if (variantConfig.dustMotion === DUST_MOTION.DRIFT) {
                const dustDrift = 1 + (this.recutLehr?.dustDriftAddAt(elapsed) ?? 0);
                this.dust.rotation.y = Math.sin(absoluteTime * 0.016) * 0.06 * dustDrift;
                this.dust.rotation.x = Math.sin(absoluteTime * 0.022) * 0.02 * dustDrift;
                this.dust.position.x = Math.sin(absoluteTime * 0.024) * 0.06 * dustDrift - 0.08;
                this.dust.position.y = Math.sin(absoluteTime * 0.05) * 0.024 * dustDrift + roomState.supportPresence * 0.02;
            } else if (variantConfig.dustMotion === DUST_MOTION.BROWNIAN) {
                this.dust.rotation.y = 0;
                this.dust.rotation.x = 0;
                this.dust.position.x = 0;
                this.dust.position.y = 0;
                const base = this.dustBasePositions;
                const attr = this.dust.geometry.attributes.position;
                if (base && attr) {
                    for (let particleIndex = 0; particleIndex < attr.count; particleIndex += 1) {
                        const phase = this.dustBrownianPhases[particleIndex] || 0;
                        const t = absoluteTime * 0.0007 + phase;
                        const jitter = 0.008;
                        const i3 = particleIndex * 3;
                        attr.setXYZ(
                            particleIndex,
                            base[i3] + Math.sin(t * 1.13 + phase) * jitter,
                            base[i3 + 1] + Math.sin(t * 0.91 + phase * 1.7) * jitter,
                            base[i3 + 2] + Math.sin(t * 1.07 + phase * 2.3) * jitter
                        );
                    }
                    attr.needsUpdate = true;
                }
            } else if (variantConfig.dustMotion === DUST_MOTION.FALL) {
                this.dust.rotation.y = 0;
                this.dust.rotation.x = 0;
                this.dust.position.x = 0;
                this.dust.position.y = 0;
                const base = this.dustBasePositions;
                const attr = this.dust.geometry.attributes.position;
                const fallMin = variantConfig.dustFallSpeedMin ?? 0.02;
                const fallMax = variantConfig.dustFallSpeedMax ?? 0.05;
                if (base && attr) {
                    for (let particleIndex = 0; particleIndex < attr.count; particleIndex += 1) {
                        const phase = this.dustBrownianPhases[particleIndex] || 0;
                        const fallRate = fallMin + ((phase / (Math.PI * 2)) % 1) * (fallMax - fallMin);
                        const settleDrift = Math.sin(absoluteTime * 0.0012 + phase) * 0.004;
                        const i3 = particleIndex * 3;
                        const cycleHeight = 8.4;
                        const y = base[i3 + 1] - ((absoluteTime * fallRate + phase * 0.12) % cycleHeight);
                        attr.setXYZ(
                            particleIndex,
                            base[i3] + settleDrift,
                            y,
                            base[i3 + 2] + Math.sin(absoluteTime * 0.0008 + phase) * 0.006
                        );
                    }
                    attr.needsUpdate = true;
                }
            } else {
                this.dust.rotation.y = 0;
                this.dust.rotation.x = 0;
                this.dust.position.x = Math.sin(absoluteTime * 0.018) * 0.03 + claim * 0.02;
                this.dust.position.y = Math.sin(absoluteTime * 0.03) * 0.016 + roomState.supportPresence * 0.03;
            }
        } else {
            this.dust.rotation.y += (0.00008 + pressureState * 0.00006 + average * 0.00005);
            this.dust.rotation.x = Math.sin(absoluteTime * 0.03) * 0.002;
            this.dust.position.y = Math.sin(absoluteTime * 0.04) * 0.026;
        }

        const groundBase = this.chamberConfig.ground.opacity;
        const lehrFraming = this.activeShotFraming;
        const lehrFloorAdd = this.recutLehr?.floorOpacityAddAt(elapsed, lehrFraming) ?? 0;
        const lehrFloorMaxAdd = this.recutLehr?.floorOpacityMaxAddAt(elapsed, lehrFraming) ?? 0;
        const listenFloorAdd = this.recutListen?.outputs.floorAdd ?? 0;
        const listenFloorMaxAdd = this.recutListen?.outputs.floorMaxAdd ?? 0;
        const floorOpacity = clamp(
            groundBase * 0.42 + groundBase * roomState.supportPresence * 0.38
            + roomState.supportDrive * 0.028
            + roomState.release * 0.09
            + (phaseProfile.floorDelta || 0)
            + pressureTransition * 0.04
            + punctuation * 0.028
            + (chamberLaw.contact || 0) * 0.035
            + (chamberLaw.afterimage || 0) * 0.026
            - (chamberLaw.erasure || 0) * 0.08
            + (roomEffects.floorOpacityDelta || 0)
            + poolBreath * 0.035
            + breathEcho * 0.02
            + effectiveAccent * 0.02
            + lehrFloorAdd
            + listenFloorAdd
            + (this.isSonoiteCinemaVariant() ? roomState.roomOpen * 0.16 : 0),
            variantConfig.floorOpacityMin ?? 0.05,
            (variantConfig.floorOpacityMax ?? 0.28) + lehrFloorMaxAdd + listenFloorMaxAdd
        );
        const floorPresence = floorOpacity * (this.state.started ? lerp(0.84, 1.0, establish) : (variantConfig.floorIdleMix ?? 0.82));
        this.poolColor
            .copy(this.floorCoolColor)
            .lerp(this.poolWarmColor, clamp(roomState.warmthBias * 0.95 + roomState.release * 0.16, 0, 1));
        const baseFloorScale = lerp(
            variantConfig.floorOpenScale ?? 1.08,
            variantConfig.floorTightScale ?? 0.92,
            pressureState
        );
        this.floorGlow.scale.set(
            baseFloorScale + roomState.supportPresence * 0.05 + pressureTransition * 0.05 + poolBreath * 0.09 + breathEcho * 0.04,
            baseFloorScale * 0.92 + pressureTransition * 0.035 + poolBreath * 0.05 + breathEcho * 0.025,
            1
        );
        if (this.floorGlow?.material?.uniforms) {
            this.floorGlow.material.uniforms.uTime.value = absoluteTime;
            this.floorGlow.material.uniforms.uOpacity.value = (isHorasMortasCinema && sodiumBlackout)
                ? 0
                : floorPresence;
            this.floorGlow.material.uniforms.uTint.value.copy(this.poolColor);
            this.floorGlow.material.uniforms.uPressure.value = pressureState;
            this.floorGlow.material.uniforms.uBreath.value = poolBreath + breathEcho * 0.34;
            this.floorGlow.material.uniforms.uAccent.value = clamp(
                effectiveAccent + (this.recutListen?.outputs.floorAccent ?? 0),
                0,
                1
            );
        }
        if (this.shadowCatcher?.material) {
            this.shadowCatcher.material.opacity = clamp(
                0.24
                + roomState.supportPresence * 0.06
                + roomState.supportDrive * 0.024
                + roomPressure * 0.05
                + pressureTransition * 0.03
                + punctuation * 0.024
                + (chamberLaw.contact || 0) * 0.1
                - (chamberLaw.erasure || 0) * 0.16
                + poolBreath * 0.035
                + effectiveAccent * 0.03,
                0.18,
                0.38
            );
        }

        const gazePresence = clamp(
            0.04
            + roomState.thresholdPresence * 0.46
            + roomState.supportPresence * 0.24
            + roomPressure * 0.12
            + pressureTransition * 0.06
            + punctuation * 0.05
            + (phaseProfile.gazeDelta || 0),
            0,
            1
        );
        const aislePresence = clamp(
            0.06
            + roomState.supportPresence * 0.52
            + roomState.release * 0.14
            + pressureTransition * 0.08
            + punctuation * 0.04
            + (phaseProfile.aisleDelta || 0),
            0,
            1
        );
        const hazePresence = clamp(
            0.02
            + airState * 0.24
            + roomState.release * 0.1
            + punctuation * 0.14
            + (phaseProfile.hazeDelta || 0),
            0,
            1
        );

        if (this.gazeField?.material) {
            this.gazeField.material.opacity = clamp(
                (this.gazeField.userData.baseOpacity || 0)
                + gazePresence * (this.gazeField.userData.opacityGain || 0.18),
                0,
                0.34
            );
            this.gazeField.position.x = this.gazeField.userData.basePosition.x + Math.sin(absoluteTime * 0.018) * 0.08;
            this.gazeField.position.y = this.gazeField.userData.basePosition.y + Math.cos(absoluteTime * 0.014) * 0.05;
        }

        if (this.counterGazeField?.material) {
            this.counterGazeField.material.opacity = clamp(
                (this.counterGazeField.userData.baseOpacity || 0)
                + (gazePresence * 0.18 + roomState.release * 0.04) * (this.counterGazeField.userData.opacityGain || 0.08),
                0,
                0.08
            );
            this.counterGazeField.position.x = this.counterGazeField.userData.basePosition.x + Math.sin(absoluteTime * 0.013 + 0.8) * 0.05;
            this.counterGazeField.position.y = this.counterGazeField.userData.basePosition.y + Math.cos(absoluteTime * 0.011 + 0.4) * 0.03;
        }

        if (this.aisleField?.material) {
            this.aisleField.material.opacity = clamp(
                (this.aisleField.userData.baseOpacity || 0)
                + aislePresence * (this.aisleField.userData.opacityGain || 0.16),
                0,
                0.28
            );
            this.aisleField.position.x = this.aisleField.userData.basePosition.x + Math.sin(absoluteTime * 0.01) * 0.03;
        }

        if (this.hazePlume?.material) {
            this.hazePlume.material.opacity = clamp(
                (this.hazePlume.userData.baseOpacity || 0)
                + hazePresence * (this.hazePlume.userData.opacityGain || 0.14),
                0,
                0.22
            );
            this.hazePlume.position.x = this.hazePlume.userData.basePosition.x + Math.sin(absoluteTime * 0.012 + 0.6) * 0.12;
            this.hazePlume.position.y = this.hazePlume.userData.basePosition.y + Math.cos(absoluteTime * 0.009) * 0.08;
        }

        if (this.scene?.fog && 'density' in this.scene.fog) {
            if (isSonoiteCinema) {
                const baseFogMax = this.chamberConfig.fogDensity ?? 0.016;
                this.scene.fog.density = clamp(baseFogMax * consecrationHazeArc, 0, 0.022);
                this.scene.fog.color.set(this.chamberConfig.fogColor || '#0a0806');
            } else if (isHorasMortasCinema) {
                const baseFogMax = this.chamberConfig.fogDensity ?? 0.012;
                this.scene.fog.density = sodiumBlackout
                    ? 0
                    : clamp(baseFogMax * sodiumHazeArc, 0, 0.018);
                this.scene.fog.color.set(this.chamberConfig.fogColor || '#050403');
            } else {
                this.updateChamberFog(elapsed, macroState, roomState);
            }
        }

        if (this.floorMist?.material && isSonoiteCinema && practicalRoster) {
            const warmWrap = samplePracticalWarmWrap(elapsed, practicalRoster);
            this.floorMist.material.opacity = clamp(
                warmWrap * consecrationHazeArc * (0.85 + poolBreath * 0.3) * 0.05,
                0,
                0.05
            );
        }

        if (this.chamberShell?.material?.uniforms) {
            this.chamberShell.material.uniforms.uTime.value = absoluteTime;
            const shellOpacityMin = variantConfig.shellOpacityMin ?? 0.08;
            const shellOpacityMax = (variantConfig.shellOpacityMax ?? 0.38)
                + (this.recutLehr?.shellOpacityMaxAddAt(elapsed, this.activeShotFraming) ?? 0);
            let shellOpacity = 0;
            if (!(isHorasMortasCinema && sodiumBlackout)) {
                shellOpacity = clamp(this.state.started
                    ? (variantConfig.shellOpacityBase ?? 0.08)
                        + roomState.thresholdPresence * (variantConfig.shellOpacityGain ?? 0.2)
                        + roomState.supportDrive * 0.04
                        + (phaseProfile.shellDelta || 0)
                        + roomPressure * 0.08
                        + pressureTransition * 0.05
                        + punctuation * 0.04
                        + (roomEffects.shellOpacityDelta || 0)
                        + shellBreath * (variantConfig.shellBreathGain ?? 0.02)
                        + effectiveAccent * (variantConfig.shellAccentGain ?? 0.08)
                        + breathEcho * 0.012
                        + (this.recutLehr?.shellOpacityAddAt(elapsed, this.activeShotFraming) ?? 0)
                        + (this.isSonoiteCinemaVariant() ? roomState.roomOpen * 0.18 : 0)
                    : (variantConfig.shellOpacityBase ?? 0.08) + shellBreath * (variantConfig.shellBreathGain ?? 0.02) * 0.6,
                shellOpacityMin,
                shellOpacityMax);
            }
            this.chamberShell.material.uniforms.uOpacity.value = shellOpacity;
            this.chamberShell.material.uniforms.uWarmth.value = roomState.warmthBias
                + (this.isSonoiteCinemaVariant() ? roomState.roomOpen * 0.42 : 0);
            this.chamberShell.material.uniforms.uPressure.value = clamp(roomPressure * 0.92 + pressureTransition * 0.08 + punctuation * 0.05 + effectiveAccent * 0.08, 0, 1.0);
            this.chamberShell.material.uniforms.uClarity.value = macroState.clarity ?? 0.8;
            this.chamberShell.material.uniforms.uBreath.value = clamp(shellBreath * 1.28 + breathEcho * 0.34, -0.28, 0.52);
            this.chamberShell.material.uniforms.uUnfurl.value = this.breathChannels.unfurl;
            this.chamberShell.material.uniforms.uThreshold.value = variantConfig.shellThreshold ?? 0.0;
            this.chamberShell.material.uniforms.uCenterVoid.value = variantConfig.shellCenterVoid ?? 0.0;
            this.chamberShell.material.uniforms.uAsymmetry.value = variantConfig.shellAsymmetry ?? 0.0;
        }

        if (this.boundaryWings?.length) {
            const boundaryPresence = clamp(
                roomState.thresholdPresence * 0.7
                + (phaseProfile.wingDelta || 0)
                + roomState.supportDrive * 0.18
                + roomState.supportPresence * 0.22
                + roomPressure * 0.14
                + pressureTransition * 0.1
                + punctuation * 0.08
                + shellBreath * 0.12,
                0,
                1
            );
            this.boundaryWings.forEach((wing) => {
                const phase = absoluteTime * 0.02 + (wing.userData.phaseOffset || 0);
                wing.material.opacity = clamp(
                    (wing.userData.baseOpacity || 0)
                    + boundaryPresence * (wing.userData.opacityGain || 0.14),
                    0,
                    wing.userData.opacityMax || 0.22
                );
                wing.position.x = wing.userData.basePosition.x + Math.sin(phase) * (wing.userData.driftX || 0.0);
                wing.position.y = wing.userData.basePosition.y + Math.cos(phase * 0.8) * (wing.userData.driftY || 0.0);
            });
        }

        if (this.hazeSprites?.length) {
            const lehrHaze = this.recutLehr?.hazeAddAt(elapsed, this.activeShotFraming) ?? 0;
            const anticipation = this.isSonoiteCinemaVariant()
                ? sampleAnticipationBreath(elapsed, this.chamberConfig.stage3?.anticipationBreath)
                : { haze: 0 };
            const hazeSpriteOpacity = clamp(
                (this.state.started ? (variantConfig.hazeSpriteBaseOpacity ?? 0) : (variantConfig.hazeSpriteIdleOpacity ?? 0))
                    + airState * (variantConfig.hazeSpriteAirGain ?? 0)
                    + pressureState * (variantConfig.hazeSpritePressureGain ?? 0)
                    + lehrHaze
                    + anticipation.haze,
                0,
                (variantConfig.hazeSpriteOpacityMax ?? 0.22) + lehrHaze
            ) * (isHorasMortasCinema ? sodiumHazeArc : 1);
            this.hazeSprites.forEach((sprite, index) => {
                const basePosition = sprite.userData.basePosition;
                const baseScale = sprite.userData.baseScale;
                const phase = absoluteTime * 0.05 + index * 1.3;
                const opacityFactor = [1.0, 0.72, 0.48][index] || 0.4;
                sprite.material.opacity = hazeSpriteOpacity * opacityFactor;
                sprite.position.x = basePosition.x + Math.sin(phase) * 0.18;
                sprite.position.y = basePosition.y + Math.cos(phase * 0.7) * 0.12;
                sprite.scale.set(
                    baseScale.x * (1 + Math.sin(phase * 0.6) * 0.02),
                    baseScale.y * (1 + Math.cos(phase * 0.4) * 0.03),
                    1
                );
            });
        }

        if (this.percussiveHazeSprite?.material && hazePercussiveGain > 0) {
            this.percussiveHazeSprite.material.opacity = hazePercussiveHit;
        }

        if (this.frontHaze?.material) {
            const lehrHaze = this.recutLehr?.hazeAddAt(elapsed, this.activeShotFraming) ?? 0;
            const frontOpacity = (isSacristy && !variantConfig.allowSacristyHaze)
                ? 0.0
                : clamp(
                    (this.state.started ? this.chamberConfig.air.hazeBase : (variantConfig.frontHazeIdleOpacity ?? 0.0))
                        + airState * (variantConfig.frontHazeAirGain ?? 0.028)
                        + dynamicState.accent * (variantConfig.frontHazeAccentGain ?? 0.014)
                        + lehrHaze,
                    0,
                    (variantConfig.frontHazeMax ?? 0.08) + lehrHaze
                );
            this.frontHaze.material.opacity = frontOpacity * (this.livingChamber?.outputs.hazeMul ?? 1);
            if (this.frontHaze.userData.basePosition) {
                this.frontHaze.position.x = this.frontHaze.userData.basePosition.x + Math.sin(absoluteTime * 0.032) * (variantConfig.frontHazeDriftX ?? 0.08);
                this.frontHaze.position.y = this.frontHaze.userData.basePosition.y + Math.cos(absoluteTime * 0.026) * (variantConfig.frontHazeDriftY ?? 0.06);
            }
        }
    }

    updateLighting(elapsed, macroState, dynamicState, roomState) {
        if (!this.hero) {
            return;
        }

        if (this.getCinematicProposal()) {
            this.updateProposalLighting(elapsed);
            return;
        }
        elapsed = this.getSurfaceStudyShotTime(elapsed);

        const quietIntro = this.usesQuietScene() && elapsed < 125;
        if (this.quietIntroActive && !quietIntro) {
            // Re-resolve authored positions after a seek or the opening cut.
            this.restoreDefaultLightRigPositions();
            this.activeLightRigId = '';
            this.activeLightSetupId = '';
        }
        this.quietIntroActive = quietIntro;

        this.ensureLightRigResolver();

        let keyBase = null;
        let rimBase = null;
        let fillBase = null;
        let backBase = null;
        let rigKeyAngle = null;
        let rigKeyPenumbra = null;

        const rigGate = this.shouldApplyLightRig();
        if (rigGate) {
            this.resolveShotDirectorForLighting(elapsed);
            const setup = this.shotDirectorResolved.setup;
            const setupId = this.shotDirectorResolved.setupId || '';
            const phraseFrame = this.recutPhraseLight
                && this.isRecutActive()
                && resolveRecutPhraseLightFrame(
                    this.recutPhraseLight,
                    elapsed,
                    this.recutPhraseLightResolved,
                    this.activeLightPhraseId,
                    this.activeLightRigId,
                    this.recutPhraseLightFrame
                );

            if (phraseFrame) {
                const {
                    rigId,
                    phraseId,
                    anchorPosition,
                    anchorTarget,
                    rekey
                } = phraseFrame;
                if (rigId && this.lightRigResolver?.has(rigId)) {
                    if (rekey) {
                        this.lightRigResolver.resolve(
                            rigId,
                            anchorPosition,
                            elapsed,
                            this.lightRigState
                        );
                        this.applyLightRigPositions(this.lightRigState, anchorTarget);
                        this.activeLightRigId = rigId;
                        this.activeLightPhraseId = phraseId;
                        this.activeLightSetupId = '';
                    } else {
                        this.lightRigState.exposure = this.lightRigResolver.exposureAt(rigId, elapsed);
                    }
                    keyBase = this.lightRigState.key.intensity;
                    rimBase = this.lightRigState.rim.intensity;
                    fillBase = this.lightRigState.fill.intensity;
                    backBase = this.lightRigState.back.intensity;
                    rigKeyAngle = this.lightRigState.key.angle;
                    rigKeyPenumbra = this.lightRigState.key.penumbra;
                } else if (this.activeLightRigId !== '') {
                    this.restoreDefaultLightRigPositions();
                    this.activeLightRigId = '';
                    this.activeLightSetupId = '';
                    this.activeLightPhraseId = '';
                }
            } else {
                if (this.activeLightPhraseId !== '') {
                    this.activeLightPhraseId = '';
                }
                const rigId = setup?.lightRig;
                const keyAimTarget = this.shotDirectorResolved.pose?.target;
                if (rigId && this.lightRigResolver?.has(rigId)) {
                    if (rigId !== this.activeLightRigId || setupId !== this.activeLightSetupId) {
                        this.lightRigResolver.resolve(
                            rigId,
                            this.camera.position,
                            elapsed,
                            this.lightRigState
                        );
                        this.applyLightRigPositions(this.lightRigState, keyAimTarget);
                        this.activeLightRigId = rigId;
                        this.activeLightSetupId = setupId;
                    } else {
                        this.lightRigState.exposure = this.lightRigResolver.exposureAt(rigId, elapsed);
                    }
                    keyBase = this.lightRigState.key.intensity;
                    rimBase = this.lightRigState.rim.intensity;
                    fillBase = this.lightRigState.fill.intensity;
                    backBase = this.lightRigState.back.intensity;
                    rigKeyAngle = this.lightRigState.key.angle;
                    rigKeyPenumbra = this.lightRigState.key.penumbra;
                } else if (this.activeLightRigId !== '') {
                    this.restoreDefaultLightRigPositions();
                    this.activeLightRigId = '';
                    this.activeLightSetupId = '';
                }
            }
        } else if (this.activeLightRigId !== '') {
            this.restoreDefaultLightRigPositions();
            this.activeLightRigId = '';
            this.activeLightSetupId = '';
            this.activeLightPhraseId = '';
        }

        const variantConfig = this.chamberConfig.variant || DEFAULT_CHAMBER_CONFIG.variant;
        const lightingConfig = this.chamberConfig.lighting || DEFAULT_CHAMBER_CONFIG.lighting;
        const roomEffects = roomState.roomEffects || {};
        const beamBreath = this.breathChannels.beam;
        const breathEcho = this.breathChannels.echo;
        const establish = this.state.started ? smoothstep(0.0, 3.5, elapsed) : 0;
        const claim = this.state.started ? smoothstep(12.0, 38.0, elapsed) : 0;
        const thresholdPresence = roomState.thresholdPresence;
        const introMix = this.state.started ? lerp(0.82, 1.0, thresholdPresence) : 0.92;
        const pressureState = roomState.roomPressure;
        const average = dynamicState.audioAverage;
        const accent = roomState.listeningAccent;
        const warmth = roomState.warmthBias;
        const temperature = clamp(
            roomState.temperature
            + (this.livingChamber?.outputs.tempShift ?? 0)
            + (this.commitReactions?.outputs.tempShift ?? 0),
            0,
            1
        );
        const clarity = macroState.clarity ?? 0.7;
        const roomPulse = clamp(pressureState * 0.82 + beamBreath * 0.22 + accent * 0.4, 0, 1);
        const pressureTransition = roomState.pressureTransition;
        const punctuation = roomState.punctuation;
        const lightingScore = lightingConfig.score || DEFAULT_CHAMBER_CONFIG.lighting.score;
        const hasLightingScore = Array.isArray(lightingScore) && lightingScore.length > 0;
        const keyWeight = hasLightingScore ? sampleHeldTimedCurve(lightingScore, elapsed, 'keyWeight').value : 1;
        const rimWeight = hasLightingScore ? sampleHeldTimedCurve(lightingScore, elapsed, 'rimWeight').value : 1;
        const fillWeight = hasLightingScore ? sampleHeldTimedCurve(lightingScore, elapsed, 'fillWeight').value : 1;
        const backWeight = hasLightingScore ? sampleHeldTimedCurve(lightingScore, elapsed, 'backWeight').value : 1;
        const heroTarget = this.heroLightTarget.set(
            this.hero.position.x * 0.94,
            this.hero.position.y + lerp(0.18, 0.92, claim),
            this.hero.position.z
        );
        if (!rigGate) {
            this.keyLight.target.position.set(
                heroTarget.x,
                heroTarget.y,
                heroTarget.z
            );
            this.keyLight.target.updateMatrixWorld();
        } else if (this.activeLightRigId === 'wet_specular' && elapsed >= 465 && elapsed <= 520) {
            this.keyLight.target.position.set(
                TRACK5_FILM_FLOWER_HEAD[0],
                TRACK5_FILM_FLOWER_HEAD[1],
                TRACK5_FILM_FLOWER_HEAD[2]
            );
            this.keyLight.target.updateMatrixWorld();
        }

        const angleOpen = variantConfig.keyAngleOpen ?? 0.46;
        const angleTight = variantConfig.keyAngleTight ?? 0.31;
        const penumbraOpen = variantConfig.keyPenumbraOpen ?? 0.42;
        const penumbraTight = variantConfig.keyPenumbraTight ?? 0.18;

        const resolvedKeyBase = keyBase ?? lightingConfig.keyBase;
        let resolvedRimBase = rimBase ?? lightingConfig.rimBase;
        const resolvedFillBase = fillBase ?? lightingConfig.fillBase;
        const resolvedBackBase = backBase ?? (lightingConfig.backBase ?? lightingConfig.rimBase * 0.42);

        // Step 6 recut light-score modifiers (single documented integration point).
        // These compose ON TOP of rig*score before the room/living/commit terms:
        // climax beat pulses lift rim+back (bars 75–125), the plateau maps the
        // already-smoothed mid-band to an absolute rim target on plateau_rim_pulse
        // phrases, and the false dawn lifts pressure_top key+rim (bars 151–160).
        // Every multiplier is 1.0 (and the base override is skipped) off the recut
        // path, so the default film math is untouched.
        let recutKeyMul = 1;
        let recutRimMul = 1;
        let recutBackMul = 1;
        if (this.recutLightScore && this.isRecutActive()) {
            // Climax beat pulses lift rim+back on every climax bar (bars 75–125),
            // independent of the active rig.
            const climaxMul = this.recutLightScore.climaxRimMultiplierAt(elapsed);
            recutRimMul = climaxMul;
            recutBackMul = climaxMul;
            // False dawn lifts key+rim only while pressure_top is the active rig
            // (spec §6.1 phrase 21). Bars 151–160 already resolve to pressure_top,
            // so this is behaviorally identical to the window gate but makes the
            // rig requirement explicit and keeps every off-rig value neutral.
            if (this.activeLightRigId === 'pressure_top') {
                recutKeyMul = this.recutLightScore.falseDawnKeyMultiplierAt(elapsed);
                recutRimMul *= this.recutLightScore.falseDawnRimMultiplierAt(elapsed);
            }
            if (this.activeLightRigId === 'plateau_rim_pulse') {
                // Owner A/B (?rimmode=commit): stepped committed rim vs the
                // default continuous EMA follow. Same [1.2, 2.0] band either way.
                resolvedRimBase = this.plateauRimCommit
                    ? this.plateauRimCommit.update(elapsed, this.analysisState.smoothedMid)
                    : this.recutLightScore.plateauRimTarget(this.analysisState.smoothedMid);
            }
        }

        const keyRoomAdditions = (
            thresholdPresence * lightingConfig.keyPressureGain
            + roomState.supportDrive * 0.16
            + roomPulse * 0.18
            + pressureTransition * 0.16
            + punctuation * 0.3
            - average * lightingConfig.keyAudioDrop * roomState.audioDrive
            + beamBreath * 0.3
            + breathEcho * 0.08
        );
        const keyLivingCommit = introMix
            * (this.livingChamber?.outputs.keyMul ?? 1)
            * (this.commitReactions?.outputs.keyMul ?? 1);
        if (keyBase !== null) {
            let rigKeyBase = resolvedKeyBase;
            if (this.activeLightRigId === 'wet_specular' && elapsed >= 465 && elapsed <= 520) {
                rigKeyBase *= 1.52;
            }
            this.keyLight.intensity = (rigKeyBase * keyWeight + keyRoomAdditions)
                * keyLivingCommit
                * recutKeyMul;
        } else {
            this.keyLight.intensity = (resolvedKeyBase + keyRoomAdditions)
                * keyLivingCommit
                * keyWeight
                * recutKeyMul;
        }
        if (rigKeyAngle !== null) {
            this.keyLight.angle = rigKeyAngle;
        } else {
            this.keyLight.angle = lerp(angleOpen, angleTight, pressureState) - accent * 0.004 - beamBreath * 0.008 - pressureTransition * 0.016 - punctuation * 0.032;
        }
        if (rigKeyPenumbra !== null) {
            this.keyLight.penumbra = rigKeyPenumbra;
        } else {
            this.keyLight.penumbra = lerp(penumbraOpen, penumbraTight, pressureState) + macroState.finish * 0.02 + beamBreath * 0.012 - accent * 0.01 - breathEcho * 0.014 - pressureTransition * 0.022 - punctuation * 0.032;
        }
        this.rimLight.intensity = (
            resolvedRimBase
            + pressureState * lightingConfig.rimPressureGain
            + accent * lightingConfig.rimAccentGain
            + punctuation * 0.1
            + clarity * 0.14
        ) * lerp(0.58, 1.0, establish) * rimWeight * (this.commitReactions?.outputs.rimMul ?? 1) * recutRimMul
            * (this.recutListen?.outputs.rimMul ?? 1);
        this.fillLight.intensity = clamp(
            (
                lerp(0.01, resolvedFillBase, establish)
                + pressureState * lightingConfig.fillPressureGain
                + roomState.supportDrive * 0.022
                + (roomEffects.fillDelta || 0)
            ) * fillWeight,
            0.0,
            0.28
        );
        this.backLight.intensity = clamp(
            (
                resolvedBackBase
                + pressureState * (lightingConfig.backPressureGain ?? 0.12)
                + thresholdPresence * 0.18
                + roomState.supportDrive * 0.04
                + clarity * 0.06
                + accent * 0.04
                + (roomEffects.backLightDelta || 0)
            ) * backWeight * (this.commitReactions?.outputs.backMul ?? 1) * recutBackMul,
            0.08,
            2.0
        );

        if (this.isHorasMortasCinemaVariant()) {
            this.keyLight.intensity = 0;
            this.rimLight.intensity = 0;
            this.fillLight.intensity = 0;
            this.backLight.intensity = 0;
            const sodiumLevel = sampleSodiumLightLevel(elapsed);
            const sodiumBlackout = sodiumLevel <= 0.001;
            if (this.scene) {
                this.scene.environment = sodiumBlackout ? null : this.environmentTarget?.texture ?? null;
            }
            this.heroMaterialStates.forEach(({ material, baseEnvMapIntensity }) => {
                if ('envMapIntensity' in material) {
                    let envIntensity = 0;
                    if (!sodiumBlackout && this.scene.environment) {
                        envIntensity = clamp(
                            (baseEnvMapIntensity
                            + clarity * 0.05
                            + roomState.supportDrive * 0.05
                            + temperature * 0.025
                            + punctuation * 0.02
                            + roomState.materialEffects.envMapIntensityDelta) * sodiumLevel,
                            0,
                            0.04
                        );
                    }
                    material.envMapIntensity = envIntensity;
                }
            });
            return;
        }

        const rigKeyColor = keyBase !== null ? this.lightRigState?.key?.color : null;
        const rigRimColor = keyBase !== null ? this.lightRigState?.rim?.color : null;
        const rigBackColor = keyBase !== null ? this.lightRigState?.back?.color : null;
        if (rigKeyColor) {
            this.keyLight.color.copy(this.rigKeyColor.set(rigKeyColor));
        } else {
            this.keyLight.color.copy(this.keyCoolColor).lerp(this.keyWarmColor, temperature);
        }
        if (rigRimColor) {
            this.rimLight.color.copy(this.rigRimColor.set(rigRimColor));
        } else {
            this.rimLight.color.copy(this.rimCoolColor).lerp(this.rimWarmColor, clamp(temperature * 0.82 + punctuation * 0.12, 0, 1));
        }
        if (this.livingChamber) {
            this.rimLight.color.offsetHSL(this.livingChamber.outputs.rimHueShift, 0, 0);
        }
        if (rigBackColor) {
            this.backLight.color.copy(this.rigBackColor.set(rigBackColor));
        } else {
            this.backLight.color.copy(this.backCoolColor).lerp(this.backWarmColor, clamp(temperature * 0.68 + pressureTransition * 0.12, 0, 1));
        }

        if (this.isSonoiteCinemaVariant()) {
            const anticipation = sampleAnticipationBreath(
                elapsed,
                this.chamberConfig.stage3?.anticipationBreath
            );
            this.keyLight.intensity *= 1 + anticipation.key;

            if (!this.usesQuietScene() && elapsed >= 35.4 && elapsed < 440) {
                const practicalRoster = this.chamberPracticals?.entries?.map((entry) => entry.practical)
                    ?? filterPracticalsForQuality(this.qualityMode);
                const warmWrap = samplePracticalWarmWrap(elapsed, practicalRoster);
                const litCount = countLitPracticals(elapsed, practicalRoster);
                const ignitionWarm = clamp(litCount / Math.max(practicalRoster.length, 1), 0, 1);
                const practicalFlicker = sampleFlameFlicker('p1_votive_first', elapsed).intensityMul;
                // sonoite-cinema doctrine: authored key stays the shaping whisper; practicals carry.
                const keyScale = clamp(1 - warmWrap * 0.252, 0.28, 1);
                this.keyLight.intensity *= keyScale;
                this.keyLight.color.lerp(this.sonoiteKeyIgnitionWarm ?? this.sonoiteWrapKeyColor, ignitionWarm * 0.68);
                this.keyLight.color.lerp(this.sonoiteWrapKeyColor, warmWrap * 0.18);
                this.rimLight.intensity *= 1 + (practicalFlicker - 1) * warmWrap * 0.28;
                this.rimLight.color.lerp(this.sonoiteRimIgnitionWarm ?? this.rimWarmColor, ignitionWarm * 0.62);
                this.rimLight.color.lerp(this.rimWarmColor, warmWrap * 0.35);
                this.backLight.intensity *= clamp(0.72 + warmWrap * 0.18, 0.55, 0.95);
                this.backLight.color.lerp(this.backWarmColor, warmWrap * 0.48);
            }

            if (elapsed >= 503.59 && elapsed <= 530) {
                const dieDown = 1 - smoothstep(503.59, 530, elapsed);
                this.keyLight.intensity *= clamp(0.42 + dieDown * 0.24, 0.38, 0.66);
                this.rimLight.intensity *= clamp(0.38 + dieDown * 0.18, 0.34, 0.56);
                this.backLight.intensity *= clamp(0.34 + dieDown * 0.16, 0.3, 0.5);
            }
        }

        this.heroMaterialStates.forEach(({ material, baseEnvMapIntensity }) => {
            if ('envMapIntensity' in material) {
                material.envMapIntensity = this.scene.environment
                    ? clamp(
                        baseEnvMapIntensity
                        + clarity * 0.05
                        + roomState.supportDrive * 0.05
                        + temperature * 0.025
                        + punctuation * 0.02
                        + roomState.materialEffects.envMapIntensityDelta
                        + (this.recutLehr?.envMapAddAt(elapsed) ?? 0)
                        + (this.isSonoiteCinemaVariant()
                            ? roomState.roomOpen * (this.chamberConfig.variant?.environmentRevealGain ?? 0.085)
                            : 0),
                        0,
                        1.2
                    )
                    : 0;
            }
        });

    }

    updateProposalLighting(elapsed) {
        const base = sampleProposalLight(this.getCinematicProposal(), this.track.slug, elapsed, this.state.started);
        let light = this.usesTrack1LightSequence()
            ? sampleTrack1LightSequence(base, elapsed, this.reducedMotion) : base;
        if (this.usesTrack5Ledger()) {
            light = applyTrack5Ledger(light, elapsed, this.state.started);
            this.track5LedgerState = light.state;
        }
        const ledgerArm = this.getTrack4LedgerArm();
        if (ledgerArm) {
            if (!this.track4LedgerPanel && this.scene) {
                this.track4LedgerPanel = createTrack4LedgerPanel(THREE);
                this.scene.add(this.track4LedgerPanel);
                this.shadowDirty = true;
            }
            light = applyTrack4Ledger(light, elapsed, ledgerArm, sampleSodiumLightLevel(elapsed), this.state.started);
            this.track4LedgerState = light.state;
        }
        if (this.usesTrack1Reliquary()) {
            light = sampleTrack1ReliquaryLight(light, elapsed, this.track1StageResponse.values,
                { reducedMotion: this.reducedMotion, climax: this.urlParams.get('climax') !== '0' });
            this.track1Diffusion = this.urlParams.get('diffusion') === '0' ? 0 : light.diffusion;
            this.physicalWallWash.target.position.set(-2, 1.8, -6.5);
            this.physicalWallWash.target.updateMatrixWorld();
            this.physicalWallWash.angle = 0.65;
        }
        if (this.track1LightOccluder) {
            const visible = this.state.started && light.occluder === true;
            if (visible !== this.track1LightOccluder.visible) {
                this.shadowDirty = true;
            }
            this.track1LightOccluder.visible = visible;
        }
        this.stageLightPhase = light.lightPhase || 'sweep';
        this.keyLight.position.fromArray(light.keyPosition);
        this.keyLight.target.position.fromArray(light.keyTarget);
        this.keyLight.target.updateMatrixWorld();
        this.keyLight.intensity = light.key;
        this.keyLight.color.set(light.color);
        this.keyLight.map = null;
        this.keyLight.angle = light.angle;
        this.keyLight.penumbra = light.penumbra;
        this.rimLight.position.fromArray(light.rimPosition ?? [3, 5, -4]);
        this.rimLight.color.set(light.color);
        this.rimLight.intensity = light.rim;
        this.backLight.intensity = light.back;
        this.keyLight.distance = light.distance ?? 30;
        this.keyLight.decay = light.decay ?? 1;
        this.fillLight.intensity = light.fill ?? 0;
        this.fillLight.color.set(light.fillColor ?? '#2d3038');
        this.physicalWallWash.color.set(light.wallColor ?? light.color);
        this.physicalWallWash.intensity = light.wall;
        this.physicalChamber.material.userData.floorAlbedo.value = light.floor;
        this.physicalChamber.material.userData.residue.value = light.residue || 0;
        if (this.stageSoftbox) {
            this.stageSoftbox.intensity = light.softbox;
            if (light.softboxPose) {
                this.stageSoftbox.position.fromArray(light.softboxPose.position);
                this.stageSoftbox.width = light.softboxPose.width;
                this.stageSoftbox.height = light.softboxPose.height;
                this.stageSoftbox.lookAt(...light.softboxPose.target);
            }
        }
        if (this.physicalDrape?.name === 'shadowDrape') {
            this.physicalDrape.visible = this.usesShadowDrape() && this.state.started && elapsed >= 125;
            const settle = sampleShadowDrapeSettle(elapsed, this.reducedMotion);
            if (this.physicalDrape.morphTargetInfluences[0] !== settle) {
                this.physicalDrape.morphTargetInfluences[0] = settle;
                this.shadowDirty = true;
            }
        }
        if (this.physicalDrape?.name === 'weightedDrape') {
            this.physicalDrape.visible = this.usesShadowDrape() && this.state.started && elapsed >= 125;
            const settleIndex = this.physicalDrape.morphTargetDictionary.settle;
            /* eslint-disable security/detect-object-injection -- settleIndex is a checked integer morph index. */
            if (Number.isInteger(settleIndex) && this.physicalDrape.morphTargetInfluences[settleIndex] !== light.settle) {
                this.physicalDrape.morphTargetInfluences[settleIndex] = light.settle;
                this.shadowDirty = true;
            }
            /* eslint-enable security/detect-object-injection */
            const pressure = this.track1StageResponse.values.cloth
                * (1 - THREE.MathUtils.smoothstep(elapsed, 488.5, 510));
            if (this.physicalDrape.morphTargetInfluences[0] !== pressure) {
                this.physicalDrape.morphTargetInfluences[0] = pressure;
                this.shadowDirty = true;
            }
        }
        this.scene.fog.density = light.fog;
        this.scene.fog.color.set('#08090b');
    }

    updateRoomRevealStudy(elapsed) {
        const shot = this.shotDirectorResolved;
        const cloth = this.usesClothRoomStudy();
        const isRevealShot = shot.setupId === 'ws_room_reveal';
        if (this.physicalDrape) {
            this.physicalDrape.visible = cloth && isRevealShot;
        }
        if ((!this.usesRoomRevealStudy() && !cloth) || !isRevealShot) {
            return;
        }
        // Prove the static cloth composition before introducing a timed reveal.
        const mix = cloth ? 1 : smoothstep(shot.cutTimeSeconds, shot.cutTimeSeconds + 8, elapsed);
        const keyPosition = this.lightRigState.key.position;
        const target = shot.pose.target;
        // Start from the resolved rig, never the previous rendered position: seeking
        // backward within this hold must reverse the reveal without accumulated drift.
        this.keyLight.position.set(
            lerp(keyPosition[0], -7, mix), lerp(keyPosition[1], 4, mix), lerp(keyPosition[2], 5, mix)
        );
        this.keyLight.target.position.set(
            lerp(target[0], 1, mix), lerp(target[1], -0.7, mix), lerp(target[2], 0, mix)
        );
        this.keyLight.intensity = lerp(this.keyLight.intensity, 85, mix);
        this.keyLight.angle = lerp(this.keyLight.angle, 0.62, mix);
        this.keyLight.penumbra = lerp(this.keyLight.penumbra, 1, mix);
        this.keyLight.color.lerp(this.physicalWallWash.color, mix);
        this.rimLight.intensity = lerp(this.rimLight.intensity, 0.7, mix);
        this.backLight.intensity = lerp(this.backLight.intensity, 0.3, mix);
        this.physicalWallWash.angle = lerp(0.95, 1.2, mix);
        this.physicalWallWash.target.position.set(lerp(-3, -6, mix), lerp(3, 2, mix), -9);
        this.physicalChamber.material.userData.floorAlbedo.value = cloth ? 0.16 : lerp(0.16, 0.32, mix);
        this.scene.fog.density = lerp(this.scene.fog.density, cloth ? 0.022 : 0.021, mix);
        if (cloth) {
            this.physicalWallWash.intensity = 0;
            this.keyLight.position.set(-9, 6, -1);
            this.keyLight.target.position.set(0, 1, -3);
            this.keyLight.intensity = 180;
            this.keyLight.angle = 0.9;
        }
    }

    updateQuietScene(elapsed) {
        // These independent overlays made the surrounding room read as rows
        // of dots and glowing pools. The physical floor remains the receiver.
        [this.floorGlow, this.floorMist, this.dust, this.gazeField,
            this.counterGazeField, this.aisleField, this.hazePlume,
            this.frontHaze, this.percussiveHazeSprite,
            ...(this.hazeSprites || []), this.livingChamber?.bokehGroup
        ].filter(Boolean).forEach((object) => {
            object.visible = false;
        });

        this.keyLight.color.set('#e3e5e7');
        this.keyLight.map = null;
        this.rimLight.color.set('#cbd2d9');
        this.backLight.color.set('#d9dce0');
        if (this.scene.fog?.color) {
            this.scene.fog.color.set('#08090a');
        }

        if (elapsed < 125) {
            const emergence = this.state.started ? smoothstep(36, 80, elapsed) : 0;
            const focus = smoothstep(80, 125, elapsed);
            this.keyLight.position.set(-3.8, 4.2, 4.0);
            this.keyLight.target.position.set(0.96, 2.5, 0);
            this.keyLight.target.updateMatrixWorld();
            this.keyLight.intensity = emergence * (7.5 + focus * 1.5);
            this.keyLight.angle = 0.66 - focus * 0.1;
            this.keyLight.penumbra = 0.9 - focus * 0.12;
            this.rimLight.intensity = 0;
            this.fillLight.intensity = 0;
            this.backLight.intensity = 0;
        }
    }

    markShadowDirtyIfNeeded() {
        if (!this.keyLight) {
            return;
        }

        const hero = this.hero;
        const probe = this.shadowProbe;
        const intensity = this.keyLight.intensity;
        const positionX = this.keyLight.position.x;
        const positionY = this.keyLight.position.y;
        const positionZ = this.keyLight.position.z;
        const angle = this.keyLight.angle;
        const penumbra = this.keyLight.penumbra;
        const targetX = this.keyLight.target.position.x;
        const targetY = this.keyLight.target.position.y;
        const targetZ = this.keyLight.target.position.z;
        const heroY = hero ? hero.position.y : 0;
        const heroRotY = hero ? hero.rotation.y : 0;
        const heroRotZ = hero ? hero.rotation.z : 0;

        const changed = Math.abs(probe.positionX - positionX) > 0.005
            || Math.abs(probe.positionY - positionY) > 0.005
            || Math.abs(probe.positionZ - positionZ) > 0.005
            || Math.abs(probe.intensity - intensity) > 0.02
            || Math.abs(probe.angle - angle) > 0.003
            || Math.abs(probe.penumbra - penumbra) > 0.003
            || Math.abs(probe.targetX - targetX) > 0.02
            || Math.abs(probe.targetY - targetY) > 0.02
            || Math.abs(probe.targetZ - targetZ) > 0.02
            || Math.abs(probe.heroY - heroY) > 0.02
            || Math.abs(probe.heroRotY - heroRotY) > 0.02
            || Math.abs(probe.heroRotZ - heroRotZ) > 0.003;

        if (changed) {
            this.shadowDirty = true;
            probe.intensity = intensity;
            probe.positionX = positionX;
            probe.positionY = positionY;
            probe.positionZ = positionZ;
            probe.angle = angle;
            probe.penumbra = penumbra;
            probe.targetX = targetX;
            probe.targetY = targetY;
            probe.targetZ = targetZ;
            probe.heroY = heroY;
            probe.heroRotY = heroRotY;
            probe.heroRotZ = heroRotZ;
        }
    }

    updateShadowCadence(absoluteTime, dynamicState) {
        const practicalShadows = this.isSonoiteCinemaVariant()
            && this.chamberPracticals?.hasShadowCasters?.();
        const sodiumShadows = this.isHorasMortasCinemaVariant()
            && this.chamberSodium?.hasShadowCasters?.();
        if (
            !this.renderer?.shadowMap?.enabled
            || (!this.keyLight?.castShadow && !practicalShadows && !sodiumShadows)
        ) {
            return;
        }

        const motionStrength = Math.abs(dynamicState?.breathing || 0) + Math.abs(dynamicState?.accent || 0);
        const interval = this.state.playing
            ? (motionStrength > 0.08 ? 0.22 : 0.38)
            : (this.state.started ? 0.5 : 0.8);

        if (this.shadowDirty || (absoluteTime - this.lastShadowUpdateAt) >= interval) {
            this.renderer.shadowMap.needsUpdate = true;
            this.shadowDirty = false;
            this.lastShadowUpdateAt = absoluteTime;
        }
    }

    render = () => {
        this.animationFrame = null;

        if (this.isDestroyed) {
            return;
        }

        if (!this.isVisible) {
            return;
        }

        this.lastFrameAt = performance.now();
        const deltaTime = this.clock.getDelta();
        const idleTime = this.clock.elapsedTime * this.roomClockScale;
        this.updateTransport();

        const elapsed = clamp(this.state.currentTime, 0, this.proofDuration);
        const timelineElapsed = this.getTimelineElapsed(elapsed);
        const macroState = this.getMacroState(timelineElapsed);
        if (macroState.phase !== this.lastShellPhase) {
            this.lastShellPhase = macroState.phase;
            this.shell?.setPhaseLabel?.(macroState.phase);
        }
        const dynamicState = this.updateAnalysisState(deltaTime, elapsed, macroState);
        const motionTime = this.state.started ? elapsed : idleTime;
        const eventState = this.getEventState(elapsed);
        this.updateBreathingChannels(deltaTime, elapsed, dynamicState);
        const roomState = this.getRoomState(elapsed, macroState, dynamicState, eventState);
        const bokehMul = this.shouldApplyLightRig() ? bokehArrivalAt(elapsed) : 1;
        this.livingChamber?.update(motionTime, deltaTime, {
            phase: macroState.phase,
            bokehMul,
            goboOffsetMul: this.recutLehr ? this.recutLehr.goboOffsetMulAt(elapsed) : 1
        });
        this.commitReactions?.update(elapsed, deltaTime, {
            accent: dynamicState.accent ?? 0,
            phase: macroState.phase
        });

        this.updateCamera(elapsed, motionTime, macroState, dynamicState, eventState);
        this.livingChamber?.syncAttachedCamera?.();
        this.recutListen?.update(elapsed, deltaTime, {
            accentRise: this.reducedMotion !== true && this.analysisState.accentRise === true,
            framing: this.activeShotFraming
        });
        this.updateHero(elapsed, deltaTime, motionTime, macroState, dynamicState, roomState);
        this.updateGodRay(elapsed);
        this.updateAtmosphere(elapsed, motionTime, macroState, dynamicState, roomState);
        this.updateLighting(elapsed, macroState, dynamicState, roomState);
        if (!this.getCinematicProposal()) {
            this.updateRoomRevealStudy(elapsed);
        }
        if (this.usesQuietScene() && !this.getCinematicProposal()) {
            this.updateQuietScene(elapsed);
        }
        this.chamberPracticals?.update(elapsed);
        this.chamberSodium?.update(elapsed, { cameraPosition: this.camera?.position });
        if (this.isSonoiteCinemaVariant() && this.chamberPracticals?.hasShadowCasters?.()) {
            this.shadowDirty = true;
        }
        if (this.isHorasMortasCinemaVariant() && this.chamberSodium?.hasShadowCasters?.()) {
            this.shadowDirty = true;
        }
        this.markShadowDirtyIfNeeded();
        this.updateShadowCadence(motionTime, dynamicState);
        let toneMappingExposureBase = this.baseToneMappingExposure;
        if (
            this.activeLightRigId
            && this.lightRigResolver
            && this.shouldApplyLightRig()
        ) {
            toneMappingExposureBase = this.lightRigResolver.exposureAt(this.activeLightRigId, elapsed);
            if (this.activeLightRigId === 'wet_specular' && elapsed >= 465 && elapsed <= 520) {
                toneMappingExposureBase += 0.12;
            } else if (this.activeLightRigId === 'wet_specular' && this.activeLightSetupId === 'ecu_tar_reward') {
                toneMappingExposureBase += 0.08;
            }
        }
        // Step 6 false dawn (bars 151–160): the only major post-climax exposure
        // rise. Additive delta on the recut path while pressure_top is the active
        // rig (spec §6.1 phrase 21); 0 on any other rig or outside the island.
        if (
            this.recutLightScore
            && this.isRecutActive()
            && this.activeLightRigId === 'pressure_top'
        ) {
            toneMappingExposureBase += this.recutLightScore.falseDawnExposureDeltaAt(elapsed);
        }
        this.renderer.toneMappingExposure = clamp(
            (toneMappingExposureBase
                + roomState.postEffects.exposureDelta
                + (this.isHorasMortasCinemaVariant() ? sampleIrisExposureOvershoot(elapsed) : 0))
                * this.getWithholdMix(elapsed),
            0.02,
            1.1
        );
        if (this.grainPass) {
            this.grainPass.uniforms.time.value = motionTime;
            const finishState = macroState.finish;
            const postConfig = this.chamberConfig.post || DEFAULT_CHAMBER_CONFIG.post;
            const introReveal = this.state.started ? smoothstep(0, 10, elapsed) : 0;
            const longArc = this.state.started ? smoothstep(0, 90, elapsed) : 0;
            const horasGrainPhases = this.isHorasMortasCinemaVariant()
                ? postConfig.grainPhases?.[macroState.phase]
                : null;
            const grainBase = Number.isFinite(horasGrainPhases)
                ? horasGrainPhases
                : this.chamberConfig.post.grainIntensity;
            let grainIntensity = (grainBase
                + finishState * (postConfig.grainFinishGain ?? DEFAULT_CHAMBER_CONFIG.post.grainFinishGain)
                + roomState.temperature * (postConfig.grainTemperatureGain ?? DEFAULT_CHAMBER_CONFIG.post.grainTemperatureGain)
                + roomState.punctuation * (postConfig.grainPunctuationGain ?? DEFAULT_CHAMBER_CONFIG.post.grainPunctuationGain)
                + longArc * (postConfig.grainLongArcGain ?? DEFAULT_CHAMBER_CONFIG.post.grainLongArcGain)
                + dynamicState.accent * (postConfig.grainAccentGain ?? DEFAULT_CHAMBER_CONFIG.post.grainAccentGain)
                + roomState.postEffects.grainDelta)
                * (this.state.started ? lerp(0.38, 1.0, introReveal) : 0.26);
            if (this.isHorasMortasCinemaVariant()) {
                const sodiumLevel = sampleSodiumLightLevel(elapsed);
                if (sodiumLevel < SODIUM_V3_GRAIN_BLACKOUT_LEVEL) {
                    grainIntensity = Math.min(grainIntensity, SODIUM_V3_GRAIN_BLACKOUT_MAX);
                } else {
                    const restrikeMix = smoothstep(SODIUM_V3_GRAIN_BLACKOUT_LEVEL, 0.12, sodiumLevel);
                    grainIntensity *= restrikeMix;
                }
            }
            if (this.usesTrack1Reliquary()) {
                grainIntensity *= 0.65;
            }
            this.grainPass.uniforms.intensity.value = grainIntensity;
        }
        this.updateGradePass(macroState, deltaTime, elapsed);
        if (this.bloomPass) {
            const finishState = macroState.finish;
            const postConfig = this.chamberConfig.post || DEFAULT_CHAMBER_CONFIG.post;
            const introReveal = this.state.started ? smoothstep(0, 10, elapsed) : 0;
            const longArc = this.state.started ? smoothstep(0, 90, elapsed) : 0;
            const horasBloomPhases = this.isHorasMortasCinemaVariant()
                ? postConfig.bloomPhases
                : null;
            let bloomStrength = (this.chamberConfig.post.bloomStrength
                + finishState * (postConfig.bloomFinishGain ?? DEFAULT_CHAMBER_CONFIG.post.bloomFinishGain)
                + roomState.temperature * (postConfig.bloomTemperatureGain ?? DEFAULT_CHAMBER_CONFIG.post.bloomTemperatureGain)
                + roomState.punctuation * (postConfig.bloomPunctuationGain ?? DEFAULT_CHAMBER_CONFIG.post.bloomPunctuationGain)
                + longArc * (postConfig.bloomLongArcGain ?? DEFAULT_CHAMBER_CONFIG.post.bloomLongArcGain)
                + dynamicState.accent * (postConfig.bloomAccentGain ?? DEFAULT_CHAMBER_CONFIG.post.bloomAccentGain)
                + roomState.postEffects.bloomDelta
                + (this.recutListen?.outputs.bloomAdd ?? 0))
                * (this.state.started ? lerp(0.34, 1.0, introReveal) : 0.34);
            if (horasBloomPhases) {
                const sodiumLevel = sampleSodiumLightLevel(elapsed);
                if (sodiumLevel < SODIUM_V3_GRAIN_BLACKOUT_LEVEL) {
                    bloomStrength = 0;
                } else {
                    const phaseBloom = horasBloomPhases[macroState.phase];
                    if (Number.isFinite(phaseBloom)) {
                        bloomStrength = phaseBloom * (this.state.started ? lerp(0.34, 1.0, introReveal) : 0.34);
                    }
                }
            }
            if (this.usesTrack1Reliquary()) {
                bloomStrength = this.track1Diffusion || 0;
                this.bloomPass.threshold = 0.045;
                this.bloomPass.radius = 0.8;
            }
            this.bloomPass.strength = bloomStrength;
        }
        if (this.vignettePass) {
            const variantConfig = this.chamberConfig.variant || DEFAULT_CHAMBER_CONFIG.variant;
            const phaseProfile = roomState.phaseProfile || {};
            const clarity = macroState.clarity ?? 0.7;
            const finishState = macroState.finish ?? 0;
            const introReveal = this.state.started ? smoothstep(0, 10, elapsed) : 0;
            const pressureTransition = roomState.pressureTransition;
            const punctuation = roomState.punctuation;
            const framePressure = this.state.started ? roomState.roomPressure : roomState.roomPressure * 0.34;
            const supportOpen = roomState.supportDrive * 0.05;
            const vignetteDarkBase = variantConfig.vignetteDarkBase ?? 0.74;
            const vignetteDarkPressureGain = variantConfig.vignetteDarkPressureGain ?? 0.18;
            const vignetteDarkClarityGain = variantConfig.vignetteDarkClarityGain ?? 0.1;
            const vignetteDarkFinishGain = variantConfig.vignetteDarkFinishGain ?? 0.03;
            const vignetteOffsetOpen = variantConfig.vignetteOffsetOpen ?? 0.92;
            const vignetteOffsetTight = variantConfig.vignetteOffsetTight ?? 0.82;
            const vignetteSoftnessBase = variantConfig.vignetteSoftnessBase ?? 0.42;
            const vignetteSoftnessFinishGain = variantConfig.vignetteSoftnessFinishGain ?? 0.05;
            const vignetteSoftnessPressureGain = variantConfig.vignetteSoftnessPressureGain ?? 0.03;

            this.vignettePass.uniforms.darkness.value = clamp(
                vignetteDarkBase
                + framePressure * vignetteDarkPressureGain
                + (phaseProfile.vignetteDarknessDelta || 0)
                + pressureTransition * 0.08
                + punctuation * 0.09
                + roomState.postEffects.vignetteDarknessDelta
                + (this.commitReactions?.outputs.vignetteShift ?? 0)
                + (1 - clarity) * vignetteDarkClarityGain
                + finishState * vignetteDarkFinishGain
                - supportOpen * 0.24
                - (this.state.started ? lerp(0.08, 0.0, introReveal) : 0.12),
                0.42,
                1.02
            );
            this.vignettePass.uniforms.offset.value = lerp(vignetteOffsetOpen, vignetteOffsetTight, framePressure)
                + supportOpen
                + (phaseProfile.vignetteOffsetDelta || 0)
                + this.breathChannels.frame * 0.03
                + this.breathChannels.echo * 0.012
                - roomState.listeningAccent * 0.004
                - pressureTransition * 0.018
                - punctuation * 0.02
                + roomState.postEffects.vignetteOffsetDelta
                + (this.state.started ? lerp(0.032, 0.0, introReveal) : 0.065);
            this.vignettePass.uniforms.softness.value = clamp(
                vignetteSoftnessBase
                + (phaseProfile.vignetteSoftnessDelta || 0)
                + finishState * vignetteSoftnessFinishGain
                - framePressure * vignetteSoftnessPressureGain
                + roomState.postEffects.vignetteSoftnessDelta
                + (this.state.started ? lerp(0.08, 0.0, introReveal) : 0.14),
                0.16,
                0.62
            );
        }
        if (this.track5PlatePass?.enabled) {
            const plateConfig = this.chamberConfig.post?.plate || {};
            const chamberLaw = roomState.chamberLaw || {};
            const revealSeconds = plateConfig.revealSeconds ?? 10;
            const introReveal = this.state.started ? smoothstep(0, revealSeconds, elapsed) : 0;
            const baseStrength = plateConfig.strength ?? 0.78;
            const idleStrength = plateConfig.idleStrength ?? 0.28;

            this.track5PlatePass.uniforms.time.value = motionTime;
            const erasureBoost = plateConfig.erasureBoost ?? 0.28;
            // Stage 2b: both values are exactly 0 off the recut path and outside
            // bars 128–151, so the shipped strength expression and the shipped
            // shader behaviour are recovered term-for-term everywhere else.
            const recutTraceActive = Boolean(this.recutVisualScore) && this.isRecutActive();
            const recutPlateStrengthAdd = recutTraceActive
                ? this.recutVisualScore.plateStrengthAddAt(elapsed)
                : 0;
            this.track5PlatePass.uniforms.traceCool.value = recutTraceActive
                ? this.recutVisualScore.traceCoolAt(elapsed)
                : 0;
            this.track5PlatePass.uniforms.strength.value = clamp(
                (this.state.started ? lerp(idleStrength, baseStrength, introReveal) : idleStrength)
                + (chamberLaw.erasure || 0) * erasureBoost
                + recutPlateStrengthAdd,
                0,
                1
            );
            this.track5PlatePass.uniforms.damage.value = clamp(
                (chamberLaw.damage || 0)
                + roomState.punctuation * 0.18
                + dynamicState.midSustain * 0.16,
                0,
                1
            );
            this.track5PlatePass.uniforms.forensic.value = clamp(
                ((chamberLaw.forensic || 0)
                + roomState.punctuation * 0.24
                + dynamicState.accent * 0.12)
                * (this.isHorasMortasCinemaVariant() ? sampleSodiumLightLevel(elapsed) : 1),
                0,
                1
            );
            this.track5PlatePass.uniforms.pressure.value = clamp(
                (chamberLaw.gravity || 0) * 0.48
                + roomState.roomPressure * 0.42
                + (chamberLaw.contact || 0) * 0.1,
                0,
                1
            );
            this.track5PlatePass.uniforms.airDensity.value = clamp(
                (chamberLaw.airDensity || 0) * 0.74
                + macroState.air * 0.18
                + this.analysisState.smoothedAverage * 0.08,
                0,
                1
            );
            this.track5PlatePass.uniforms.afterimage.value = clamp(
                ((chamberLaw.afterimage || 0)
                + roomState.blackGap * 0.32)
                * (this.isHorasMortasCinemaVariant() ? sampleSodiumLightLevel(elapsed) : 1),
                0,
                1
            );
            this.track5PlatePass.uniforms.erasure.value = clamp(chamberLaw.erasure || 0, 0, 1);
        }
        if (this.blackoutPass?.uniforms?.opacity) {
            // Step 6 (P9): fold the single recut 0.4s blackout ending on the bar
            // 121 downbeat into the existing full-frame blackout pass. Off the
            // recut path (or outside the window) this is a no-op; the 0.995 cap
            // still lets faint UI read through.
            let blackGap = roomState.blackGap;
            if (this.recutLightScore && this.isRecutActive()) {
                blackGap = Math.max(blackGap, this.recutLightScore.blackoutOpacityAt(elapsed));
            }
            this.blackoutPass.uniforms.opacity.value = clamp(blackGap, 0, 0.995);
        }
        if (this.shell?.setSuppression) {
            this.shell.setSuppression(roomState.chamberLaw?.uiSuppression || 0);
        }
        if (this.shell?.setFrameMaskOpacity) {
            this.shell.setFrameMaskOpacity(clamp((roomState.chamberLaw?.erasure || 0) * 0.1, 0, 0.16));
        }
        if (this.scene?.background && this.backgroundCoolColor && this.backgroundWarmColor) {
            this.scene.background.copy(this.backgroundCoolColor).lerp(
                this.backgroundWarmColor,
                clamp(roomState.temperature * 0.78 + macroState.finish * 0.14 + roomState.punctuation * 0.2, 0, 1)
            );
            // Stage 2a: lift the void off the crush floor on the recut middle only.
            // The blend is applied to the ALREADY-composed cool->warm background so
            // the film's own temperature arc survives and only the floor moves; the
            // window envelope is 0 before 64s and after 504s, so the accepted
            // opening and ending are byte-identical to the default expression above.
            if (this.recutAtmosphere && this.recutAtmosphereLiftColor && this.isRecutActive()) {
                this.scene.background.lerp(
                    this.recutAtmosphereLiftColor,
                    this.recutAtmosphere.backgroundLiftAt(elapsed)
                );
            }
        }
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        // Must read the backbuffer in the same frame as the draw, before swap.
        this.fillMeter?.update(elapsed);
        this.scheduleNextFrame();
    };

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        window.cancelAnimationFrame(this.animationFrame);
        window.clearTimeout(this.frameTimer);
        this.animationFrame = null;
        this.frameTimer = null;
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('pointermove', this.pointerMoveHandler);
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        window.removeEventListener('pagehide', this.pageHideHandler);
        this.listeningGain?.disconnect();
        this.listeningGain = null;
        this.audio?.dispose?.();
        this.audio?.audioContext?.removeEventListener('statechange', this.audioContextStateHandler);
        this.shell?.destroy();
        this.blueNoiseTexture?.dispose?.();
        this.fillMeter?.dispose();
        this.fillMeter = null;
        this.dracoLoader?.dispose?.();
        this.dracoLoader = null;
        this.livingChamber?.dispose();
        this.livingChamber = null;
        dispose3D(this.hero);
        this.heroMaterialStates = [];
        this.floorGlow?.geometry?.dispose?.();
        this.floorGlow?.material?.dispose?.();
        this.floorMist?.geometry?.dispose?.();
        this.floorMist?.material?.dispose?.();
        this.track1StageMaterials?.dispose();
        this.track1StageMaterials = null;
        this.physicalDrape?.geometry.dispose();
        this.physicalDrape?.material.dispose();
        this.physicalDrape = null;
        if (this.track1LightOccluder) {
            this.scene.remove(this.track1LightOccluder);
            this.track1LightOccluder.geometry.dispose();
            this.track1LightOccluder.material.dispose();
            this.track1LightOccluder = null;
        }
        this.physicalChamber?.geometry.dispose();
        this.physicalChamber?.material.dispose();
        this.physicalChamber = null;
        if (this.stageSoftbox) {
            this.scene.remove(this.stageSoftbox);
            this.stageSoftbox.dispose();
            this.stageSoftbox = null;
        }
        if (this.track4LedgerPanel) {
            this.scene.remove(this.track4LedgerPanel);
            this.track4LedgerPanel.geometry.dispose();
            this.track4LedgerPanel.material.dispose();
            this.track4LedgerPanel = null;
        }
        this.physicalWallWash?.dispose();
        this.physicalWallWash = null;
        this.shadowCatcher?.geometry?.dispose?.();
        this.shadowCatcher?.material?.dispose?.();
        this.chamberShell?.geometry?.dispose?.();
        this.chamberShell?.material?.dispose?.();
        this.boundaryWings?.forEach((wing) => {
            wing.geometry?.dispose?.();
            wing.material?.dispose?.();
        });
        this.dust?.geometry?.dispose?.();
        this.dust?.material?.dispose?.();
        this.gazeField?.geometry?.dispose?.();
        this.gazeField?.material?.dispose?.();
        this.counterGazeField?.geometry?.dispose?.();
        this.counterGazeField?.material?.dispose?.();
        this.aisleField?.geometry?.dispose?.();
        this.aisleField?.material?.dispose?.();
        this.hazePlume?.geometry?.dispose?.();
        this.hazePlume?.material?.dispose?.();
        this.hazeSprites?.forEach((sprite) => sprite.material?.dispose?.());
        this.percussiveHazeSprite?.material?.dispose?.();
        this.frontHaze?.material?.dispose?.();
        this.godRayGeometry?.dispose?.();
        this.godRayMaterial?.dispose?.();
        this.relicMutation?.dispose();
        this.relicMutation = null;
        this.recutPhraseLight = null;
        this.recutLightScore = null;
        this.recutVisualScore = null;
        this.recutAtmosphere = null;
        this.recutAtmosphereLiftColor = null;
        this.recutLehr = null;
        this.recutListen = null;
        this.chamberPracticals?.dispose();
        this.chamberPracticals = null;
        this.chamberSodium?.dispose();
        this.chamberSodium = null;
        this.plateauRimCommit = null;
        this.activeLightPhraseId = '';
        this.shotDirectorBeatGrid = null;
        this.recutPhraseLightResolved.id = '';
        this.recutPhraseLightResolved.lightRig = '';
        this.recutPhraseLightResolved.anchorPosition = null;
        this.recutPhraseLightResolved.anchorTarget = null;
        this.recutPhraseLightFrame.phraseId = '';
        this.recutPhraseLightFrame.rigId = '';
        this.recutPhraseLightFrame.anchorPosition = null;
        this.recutPhraseLightFrame.anchorTarget = null;
        this.recutPhraseLightFrame.anchorFov = 0;
        this.recutPhraseLightFrame.rekey = false;
        this.godRayGroup = null;
        this.godRayGeometry = null;
        this.godRayMaterial = null;
        this.environmentTarget?.dispose?.();
        this.pmremGenerator?.dispose?.();
        disposeComposer(this.composer);
        this.disposableTextures.forEach((texture) => texture?.dispose?.());
        this.disposableTextures.clear();
        this.renderer?.renderLists?.dispose?.();
        this.renderer?.dispose();
        if (window.SonoitePrototype === this) {
            window.SonoitePrototype = null;
        }
        if (this.shotDirector && window.SonoiteShotDirector === this.shotDirector) {
            window.SonoiteShotDirector = undefined;
            window.SonoiteShotDirectorDebugState = undefined;
        }
        this.root.innerHTML = '';
    }
}

export {
    BUILT_TRACK_CYCLE,
    CHAMBER_VARIANTS,
    DEFAULT_ENTRY_TRACK_SLUG,
    DEFAULT_TRACK_SLUG,
    TRACK_DEFAULT_VARIANT,
    resolveEntryTrackSlug,
    resolveDefaultChamberVariant
};
