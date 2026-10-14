/**
 * Jest configuration: two jsdom projects, both using tests/setup/jest.setup.js.
 * - Unit Tests (tests/unit): mostly Path B modules (src/js/prototype) plus shared utils and
 *   build scripts; babel-jest for .js/.mjs, `three` mapped to its ES-module build.
 * - Security Tests (tests/security): SecurityManager and AudioManager validation, on Jest's
 *   default transform.
 * With `projects` set, Jest reads environment/transform/mapper options only from each project,
 * so the top level holds global options only. Coverage is opt-in: `npm run test:coverage`.
 */

module.exports = {
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,

  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'html', 'lcov'],

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
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    }
  ],

  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
