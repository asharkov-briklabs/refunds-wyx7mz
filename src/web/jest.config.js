/**
 * Jest configuration for the web frontend application
 * Used to define test environment settings, coverage thresholds, and module mocking
 * 
 * @version 1.0.0
 */

module.exports = {
  // The root directory that Jest should scan for tests and modules
  roots: ['<rootDir>/src'],
  
  // Files to include in coverage reporting and exclusions
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/react-app-env.d.ts',
    '!src/setupTests.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/mocks/**/*',
  ],
  
  // A list of paths to modules that run some code to configure the testing framework
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // The test environment that will be used for testing (jsdom for React components)
  testEnvironment: 'jsdom',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  
  // Transform files with these extensions using specified transformers
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/node_modules/babel-jest',
    '^.+\\.css$': '<rootDir>/node_modules/react-scripts/config/jest/cssTransform.js',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '<rootDir>/node_modules/react-scripts/config/jest/fileTransform.js',
  },
  
  // Files to skip transformation
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  
  // Additional paths to look for modules
  modulePaths: ['<rootDir>/src'],
  
  // Module name mapping for import aliases
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@common/(.*)$': '<rootDir>/src/components/common/$1',
    '^@pike/(.*)$': '<rootDir>/src/components/pike/$1',
    '^@barracuda/(.*)$': '<rootDir>/src/components/barracuda/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  
  // File extensions Jest will look for
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // Plugins to enhance watch mode
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Automatically reset mock state between every test
  resetMocks: true,
  
  // Minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/common/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Timeout for individual test cases
  testTimeout: 10000,
  
  // Global variables available in all test environments
  globals: {
    NODE_ENV: 'test',
  },
  
  // Display individual test results with detailed logging
  verbose: true,
};