/**
 * Jest configuration for the Refunds Service backend.
 * 
 * This configuration file sets up the testing environment for unit and 
 * integration tests, including coverage thresholds, path mappings,
 * and global setup/teardown hooks.
 * 
 * @version 1.0.0
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set node as the test environment
  testEnvironment: 'node',
  
  // Define the root directory for tests
  rootDir: '.',
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Path aliases for cleaner imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Patterns to match test files
  testMatch: [
    '**/*.test.ts',
    '**/integration/**/*.test.ts'
  ],
  
  // Define transformers for different file types
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 'tsconfig': 'tsconfig.json' }]
  },
  
  // Files to run after the test environment is set up
  setupFilesAfterEnv: ['./tests/setup.ts'],
  
  // Global setup script
  globalSetup: './tests/setup.ts',
  
  // Global teardown script
  globalTeardown: './tests/teardown.ts',
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/bin/**',
    '!src/types/**',
    '!src/config/**'
  ],
  
  // Coverage thresholds to enforce
  coverageThreshold: {
    // Global thresholds
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Higher thresholds for critical service logic
    'src/services/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Higher thresholds for utility functions
    'src/common/utils/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Patterns to ignore for testing
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Patterns to ignore when watching for changes
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  
  // Enable verbose output
  verbose: true
};