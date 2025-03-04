module.exports = {
  root: true, // Indicates this is the root ESLint configuration
  env: {
    node: true, // Enable Node.js global variables
    es2022: true, // Enable ES2022 globals and syntax
    jest: true, // Enable Jest testing globals
  },
  parser: '@typescript-eslint/parser', // eslint-plugin-import v^5.59.0
  parserOptions: {
    ecmaVersion: 2022, // Use ECMAScript 2022 syntax
    sourceType: 'module', // Use ECMAScript modules
    project: './tsconfig.json', // Path to TypeScript configuration
    tsconfigRootDir: __dirname, // Root directory for relative tsconfig paths
  },
  extends: [
    'eslint:recommended', // ESLint recommended rules
    'plugin:@typescript-eslint/recommended', // TypeScript recommended rules
    'plugin:@typescript-eslint/recommended-requiring-type-checking', // TypeScript rules requiring type information
    'plugin:import/recommended', // Import plugin recommended rules
    'plugin:import/typescript', // Import plugin TypeScript rules
    'prettier', // Disable ESLint rules that conflict with Prettier
  ],
  plugins: [
    '@typescript-eslint', // @typescript-eslint/eslint-plugin v^5.59.0
    'import', // eslint-plugin-import v^2.27.5
  ],
  rules: {
    // General rules
    'no-console': 'warn', // Warn about console statements (shouldn't be in production)
    'no-debugger': 'error', // Error for debugger statements
    'no-duplicate-imports': 'error', // Error for duplicate imports
    'no-unused-vars': 'off', // Disable JS unused vars (use TS version)
    'prefer-const': 'error', // Prefer const over let when possible
    
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error', // Require return types on functions
    '@typescript-eslint/explicit-module-boundary-types': 'error', // Require return types on exported functions
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about any type
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }], // Error for unused vars, ignore args starting with _
    '@typescript-eslint/no-floating-promises': 'error', // Require handling of promises
    '@typescript-eslint/no-misused-promises': 'error', // Prevent misused promises
    '@typescript-eslint/require-await': 'error', // Require await in async functions
    '@typescript-eslint/no-unnecessary-condition': 'error', // Prevent unnecessary conditions
    
    // Import rules
    'import/no-unresolved': 'error', // Error for unresolved imports
    'import/named': 'error', // Ensure named imports exist
    'import/default': 'error', // Ensure default imports exist
    'import/namespace': 'error', // Ensure namespace imports exist
    'import/order': [ // Enforce import order
      'error',
      {
        'groups': [
          'builtin', // Node.js built-in modules
          'external', // npm modules
          'internal', // Internal modules
          ['parent', 'sibling'], // Parent and sibling imports
          'index', // Index imports
          'object', // Object imports
          'type', // Type imports
        ],
        'newlines-between': 'always', // New line between import groups
        'alphabetize': { 
          'order': 'asc', // Sort in ascending order
          'caseInsensitive': true // Ignore case
        }
      }
    ],
    'import/no-extraneous-dependencies': [ // Prevent importing dev dependencies in production code
      'error',
      {
        'devDependencies': ['**/*.test.ts', '**/*.spec.ts', 'src/test/**/*']
      }
    ],
  },
  overrides: [
    // Override rules for test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'src/test/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
        '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions in tests
      }
    },
    // Override rules for migration files
    {
      files: ['src/database/migrations/**/*'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off', // No need for explicit return types in migrations
      }
    }
  ],
  ignorePatterns: [
    'node_modules/', // Ignore node_modules
    'dist/', // Ignore compiled output
    'coverage/', // Ignore test coverage reports
    'build/', // Ignore build outputs
    '**/*.d.ts', // Ignore TypeScript declaration files
  ],
};