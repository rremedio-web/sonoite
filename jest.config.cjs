/**
 * Security-focused Jest configuration for Sonoite Theme
 * Comprehensive testing setup for security validation and functionality
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  testTimeout: 30000,
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/*.{test,spec}.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/__tests__/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Coverage thresholds for security-critical files
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/js/security-manager.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/js/audio-manager.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
    '^three/addons/(.*)$': '<rootDir>/node_modules/three/examples/jsm/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }],
    '^.+\\.mjs$': ['babel-jest', { configFile: './babel.config.cjs' }],
    '^.+\\.glsl$': '<rootDir>/tests/transformers/glsl-transformer.js'
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(three)/)'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'mjs',
    'json',
    'glsl'
  ],
  
  // Global variables for tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'THREE': {},
    'window': {},
    'document': {},
    'navigator': {},
    'crypto': {},
    'fetch': {},
    'performance': {},
    'AudioContext': {},
    'webkitAudioContext': {}
  },
  
  // Security-focused test configuration
  maxWorkers: '50%', // Use half of available cores
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Sonoite Security Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Test categories
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^three$': '<rootDir>/node_modules/three/build/three.module.js',
        '^three/addons/(.*)$': '<rootDir>/node_modules/three/examples/jsm/$1',
        '^three/examples/jsm/(.*)$': '<rootDir>/node_modules/three/examples/jsm/$1'
      },
      transform: {
        '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }],
        '^.+\\.mjs$': ['babel-jest', { configFile: './babel.config.cjs' }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(three)/)'
      ],
      moduleFileExtensions: ['js', 'mjs', 'json']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    },
    {
      displayName: 'Consciousness System Tests',
      testMatch: ['<rootDir>/tests/consciousness/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    }
  ],
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  
  // Security test utilities
  testPathIgnorePatterns: [
    '/node_modules/',
    '/vendor/',
    '/dist/',
    '/coverage/'
  ],
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom matchers and utilities
  // testResultsProcessor: '<rootDir>/tests/processors/security-results-processor.js' // Temporarily disabled
};
