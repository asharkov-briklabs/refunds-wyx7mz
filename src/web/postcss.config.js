/**
 * PostCSS Configuration for Refunds Service
 * 
 * This file configures CSS processing for the Refunds Service web application,
 * implementing responsive design and optimizing for both Pike (merchant) and
 * Barracuda (admin) interfaces.
 * 
 * Plugins:
 * - postcss-import: Resolves @import rules in CSS
 * - tailwindcss: Processes Tailwind CSS framework directives
 * - postcss-nested: Allows nesting CSS selectors (like Sass)
 * - autoprefixer: Adds vendor prefixes for browser compatibility
 * - cssnano: Optimizes and minifies CSS for production
 */

// Import the Tailwind configuration
const tailwindConfig = require('./tailwind.config');

module.exports = {
  plugins: [
    // Process @import directives in CSS
    require('postcss-import'),
    
    // Process Tailwind CSS directives and utilities
    require('tailwindcss')({
      config: './tailwind.config.js'
    }),
    
    // Process nested CSS selectors for more readable stylesheets
    require('postcss-nested'),
    
    // Add vendor prefixes automatically for browser compatibility
    require('autoprefixer')({
      // Note: The browsers option is deprecated in newer versions
      // of autoprefixer in favor of browserslist config
      browsers: ['>0.2%', 'not dead', 'not op_mini all']
    }),
    
    // Production-only: Optimize and minify CSS
    ...(process.env.NODE_ENV === 'production'
      ? [
          require('cssnano')({
            preset: ['default', { discardComments: { removeAll: true } }]
          }),
        ]
      : []),
  ],
};