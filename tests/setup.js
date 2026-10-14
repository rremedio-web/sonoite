/**
 * Jest Setup File for Sonoite Theme Testing
 * Configures test environment for production optimization validation
 */

// Mock DOM APIs that may not be available in jsdom
global.matchMedia = global.matchMedia || function (query) {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    };
};

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
    createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        smoothingTimeConstant: 0.8,
        getByteFrequencyData: jest.fn(),
        getFloatFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createGain: jest.fn().mockReturnValue({
        gain: {
            value: 1,
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            cancelScheduledValues: jest.fn()
        },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        start: jest.fn(),
        stop: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        addEventListener: jest.fn()
    }),
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2
    }),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    addEventListener: jest.fn()
}));

global.webkitAudioContext = global.AudioContext;

// Mock Performance APIs
global.performance = global.performance || {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    memory: {
        usedJSHeapSize: 1024 * 1024 * 10, // 10MB
        totalJSHeapSize: 1024 * 1024 * 50, // 50MB
        jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    }
};

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => [])
}));

// Mock Navigator APIs
Object.defineProperty(global.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    configurable: true
});

Object.defineProperty(global.navigator, 'connection', {
    value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    },
    configurable: true
});

// Mock Battery API
global.navigator.getBattery = jest.fn().mockResolvedValue({
    level: 0.8,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 3600,
    addEventListener: jest.fn()
});

// Mock Crypto API
global.crypto = global.crypto || {
    subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    },
    getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    })
};

// Mock Fetch API
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    headers: {
        get: jest.fn((header) => {
            const headers = {
                'content-type': 'application/json',
                'content-length': '1024'
            };
            return headers[header.toLowerCase()];
        })
    }
});

// Mock Three.js
global.THREE = {
    Scene: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        background: null,
        fog: null
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        lookAt: jest.fn(),
        aspect: 1,
        updateProjectionMatrix: jest.fn()
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn(),
        forceContextLoss: jest.fn(),
        domElement: document.createElement('canvas'),
        shadowMap: {
            enabled: false,
            type: null
        }
    })),
    Clock: jest.fn().mockImplementation(() => ({
        getElapsedTime: jest.fn(() => 1.0),
        getDelta: jest.fn(() => 0.016)
    })),
    Group: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { setScalar: jest.fn() }
    })),
    Color: jest.fn().mockImplementation((r, g, b) => ({
        r: r || 0,
        g: g || 0,
        b: b || 0,
        setHSL: jest.fn(),
        setHex: jest.fn(),
        lerpColors: jest.fn()
    })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({
        x: x || 0,
        y: y || 0,
        z: z || 0,
        set: jest.fn(),
        copy: jest.fn(),
        normalize: jest.fn()
    })),
    Mesh: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { setScalar: jest.fn() },
        geometry: null,
        material: null
    })),
    PlaneGeometry: jest.fn(),
    SphereGeometry: jest.fn(),
    BoxGeometry: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    MeshBasicMaterial: jest.fn(),
    ShaderMaterial: jest.fn(),
    PointsMaterial: jest.fn(),
    Points: jest.fn(),
    BufferGeometry: jest.fn().mockImplementation(() => ({
        setAttribute: jest.fn(),
        dispose: jest.fn(),
        attributes: {
            position: { needsUpdate: false, array: new Float32Array(100) },
            color: { needsUpdate: false, array: new Float32Array(100) }
        },
        computeVertexNormals: jest.fn()
    })),
    BufferAttribute: jest.fn(),
    TextureLoader: jest.fn().mockImplementation(() => ({
        load: jest.fn((url, onLoad, onProgress, onError) => {
            if (onLoad) {
                setTimeout(() => onLoad({}), 0);
            }
        })
    })),
    DataTexture: jest.fn(),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn(),
    PointLight: jest.fn(),
    Fog: jest.fn(),
    AdditiveBlending: 'AdditiveBlending',
    DoubleSide: 'DoubleSide',
    ClampToEdgeWrapping: 'ClampToEdgeWrapping',
    LinearFilter: 'LinearFilter',
    RGBAFormat: 'RGBAFormat',
    SRGBColorSpace: 'SRGBColorSpace',
    ACESFilmicToneMapping: 'ACESFilmicToneMapping',
    PCFSoftShadowMap: 'PCFSoftShadowMap',
    MathUtils: {
        lerp: jest.fn((a, b, t) => a + (b - a) * t),
        clamp: jest.fn((value, min, max) => Math.min(Math.max(value, min), max))
    }
};

// Mock Canvas and WebGL Context
global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
    if (type === '2d') {
        return {
            fillStyle: '',
            font: '',
            textAlign: 'left',
            fillText: jest.fn(),
            clearRect: jest.fn(),
            drawImage: jest.fn()
        };
    }
    if (type === 'webgl' || type === 'experimental-webgl') {
        return {
            getExtension: jest.fn(),
            getParameter: jest.fn(),
            createProgram: jest.fn(),
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            useProgram: jest.fn(),
            getUniformLocation: jest.fn(),
            uniform1f: jest.fn(),
            uniform1i: jest.fn(),
            uniform3fv: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            vertexAttribPointer: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            drawArrays: jest.fn(),
            drawElements: jest.fn(),
            viewport: jest.fn(),
            clear: jest.fn(),
            clearColor: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            depthFunc: jest.fn(),
            blendFunc: jest.fn()
        };
    }
    return null;
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
    return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock Speech Recognition API
global.SpeechRecognition = jest.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    onresult: null,
    onerror: null,
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn()
}));

global.webkitSpeechRecognition = global.SpeechRecognition;

// Mock localStorage and sessionStorage
const createStorage = () => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        length: 0,
        key: jest.fn()
    };
};

global.localStorage = createStorage();
global.sessionStorage = createStorage();

// Mock WordPress global variables
global.sonoiteData = {
    apiUrl: 'http://localhost/wp-json/sonoite/v1/',
    nonce: 'test-nonce-12345',
    ajaxUrl: 'http://localhost/wp-admin/admin-ajax.php',
    themeUrl: 'http://localhost/wp-content/themes/sonoite-theme',
    tracks: [],
    security: {
        maxFileSize: 50 * 1024 * 1024,
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
        enableAuditLog: true
    }
};

global.sonoiteSecurityConfig = {
    reportingEndpoint: 'http://localhost/wp-json/sonoite/v1/security-report',
    enableContentValidation: true,
    maxVolume: 1.0,
    rateLimitRequests: 10,
    rateLimitWindow: 60000
};

// Setup console spies for testing
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Custom Jest matchers for accessibility testing
expect.extend({
    toBeAccessible(received) {
        const pass = received && 
                    received.getAttribute &&
                    received.getAttribute('aria-label') !== null;
        
        if (pass) {
            return {
                message: () => `expected ${received} not to be accessible`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be accessible (have aria-label)`,
                pass: false
            };
        }
    },
    
    toHavePerformanceScore(received, expectedScore) {
        const pass = received >= expectedScore;
        
        if (pass) {
            return {
                message: () => `expected performance score ${received} not to be >= ${expectedScore}`,
                pass: true
            };
        } else {
            return {
                message: () => `expected performance score ${received} to be >= ${expectedScore}`,
                pass: false
            };
        }
    }
});

// Error boundary for tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: ReactDOM.render is no longer supported')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});

// Cleanup after each test
afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    
    // Reset global state
    if (global.sonoitePerformanceMonitor) {
        global.sonoitePerformanceMonitor.dispose();
        global.sonoitePerformanceMonitor = null;
    }
    
    if (global.sonoiteAccessibilityManager) {
        global.sonoiteAccessibilityManager.dispose();
        global.sonoiteAccessibilityManager = null;
    }
});

// Test utilities
global.testUtils = {
    createMockAudioBuffer: () => ({
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: jest.fn(() => new Float32Array(1024))
    }),
    
    createMockTrackData: (overrides = {}) => ({
        id: 1,
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
        url: 'http://example.com/track.mp3',
        consciousness: {
            type: 'abstract',
            color_palette: '#6666ff',
            intensity_level: 0.7
        },
        ...overrides
    }),
    
    waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
    
    mockPerformanceEntry: (name, entryType, startTime = 0, duration = 100) => ({
        name,
        entryType,
        startTime,
        duration,
        toJSON: () => ({ name, entryType, startTime, duration })
    })
};