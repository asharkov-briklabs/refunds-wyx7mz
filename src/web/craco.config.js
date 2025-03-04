const path = require('path');
const { CracoAliasPlugin } = require('craco-alias'); // v3.0.1
const tailwindcss = require('tailwindcss'); // v3.3.0
const postcssImport = require('postcss-import'); // v15.1.0
const autoprefixer = require('autoprefixer'); // v10.4.0

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Enable tree shaking and minification
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          usedExports: true,
          minimize: true,
          splitChunks: {
            chunks: 'all',
            name: false,
            cacheGroups: {
              vendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true,
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
            },
          },
        };
      }

      // Add support for additional file types if needed
      webpackConfig.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      });

      return webpackConfig;
    },
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@common': path.resolve(__dirname, 'src/components/common'),
      '@pike': path.resolve(__dirname, 'src/components/pike'),
      '@barracuda': path.resolve(__dirname, 'src/components/barracuda'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  style: {
    postcss: {
      plugins: [
        postcssImport(),
        tailwindcss('./tailwind.config.js'),
        autoprefixer({
          browsers: ['>0.2%', 'not dead', 'not op_mini all'],
        }),
      ],
    },
  },
  babel: {
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
    ],
  },
  plugins: [
    {
      plugin: CracoAliasPlugin,
      options: {
        source: 'tsconfig',
        baseUrl: './src',
        tsConfigPath: './tsconfig.json',
      },
    },
  ],
  jest: {
    configure: {
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
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/node_modules/babel-jest',
      },
    },
  },
};