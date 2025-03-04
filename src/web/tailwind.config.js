const colors = require('./src/themes/colors');
const typography = require('./src/themes/typography');
const breakpoints = require('./src/themes/breakpoints');
const shadows = require('./src/themes/shadows');

/**
 * Tailwind CSS configuration for the Refunds Service application
 * Customizes the framework to ensure consistent styling across both
 * Pike (merchant) and Barracuda (admin) interfaces
 * 
 * @version 1.0.0
 */
module.exports = {
  // Files where Tailwind classes should be processed
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './public/index.html'
  ],

  // Theme customization with imported design tokens
  theme: {
    // Color configuration
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      // Primary color palette
      primary: colors.primary,
      // Secondary color palette
      secondary: colors.secondary,
      // Neutral colors
      gray: colors.gray,
      // White/black common colors
      white: colors.common.white,
      black: colors.common.black,
      // Semantic colors
      success: colors.semantic.success,
      warning: colors.semantic.warning,
      error: colors.semantic.error,
      info: colors.semantic.info,
      // Refund status colors
      refundStatus: colors.refundStatus,
      // Interface-specific colors
      pike: colors.pike,
      barracuda: colors.barracuda,
    },

    // Font families
    fontFamily: {
      sans: [typography.fontFamily.primary],
      mono: [typography.fontFamily.mono],
    },

    // Font sizes
    fontSize: typography.fontSize,

    // Font weights
    fontWeight: typography.fontWeight,

    // Line heights
    lineHeight: typography.lineHeight,

    // Letter spacing
    letterSpacing: typography.letterSpacing,

    // Responsive breakpoints from imported definitions
    screens: {
      mobile: `${breakpoints.mobile}px`,
      tablet: `${breakpoints.tablet}px`,
      desktop: `${breakpoints.desktop}px`,
      largeDesktop: `${breakpoints.largeDesktop}px`,
    },

    // Box shadows
    boxShadow: {
      // Base shadow levels
      ...shadows.shadows,
      // Component-specific shadows
      card: shadows.componentShadows.card,
      dropdown: shadows.componentShadows.dropdown,
      modal: shadows.componentShadows.modal,
      popover: shadows.componentShadows.popover,
      tooltip: shadows.componentShadows.tooltip,
      notification: shadows.componentShadows.notification,
      // Interactive shadows
      hover: shadows.interactionShadows.hover,
      active: shadows.interactionShadows.active,
      focus: shadows.interactionShadows.focus,
      // Status shadows
      successShadow: shadows.statusShadows.success,
      warningShadow: shadows.statusShadows.warning,
      errorShadow: shadows.statusShadows.error,
      infoShadow: shadows.statusShadows.info,
    },

    // Extended theme with additional customizations
    extend: {
      // Z-index values for proper layering
      zIndex: {
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modal: 1040,
        popover: 1050,
        tooltip: 1060,
        toast: 1070,
      },
      // Animation durations
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      // Border radius
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      // Spacing scale for layouts
      spacing: {
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
        '128': '32rem',
      },
      // Custom opacity values
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '85': '0.85',
      },
      // Custom max-width values
      maxWidth: {
        'modal-sm': '28rem',
        'modal-md': '36rem',
        'modal-lg': '48rem',
        'modal-xl': '64rem',
      },
    },
  },

  // Plugins for additional functionality
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Use class strategy for more control
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],

  // Safelist ensures these classes are always included in the generated CSS
  safelist: [
    // Refund status classes
    'bg-refundStatus-completed',
    'bg-refundStatus-processing',
    'bg-refundStatus-pendingApproval',
    'bg-refundStatus-failed',
    'bg-refundStatus-draft',
    'bg-refundStatus-canceled',
    // Status colors
    'text-success-main',
    'text-warning-main',
    'text-error-main',
    'text-info-main',
    // Responsive visibility classes
    'hidden',
    'mobile:block',
    'tablet:block',
    'desktop:block',
    // Animation classes
    'animate-spin',
    'animate-pulse',
    'animate-bounce',
  ],

  // Use CSS variables for design tokens that need to be customizable at runtime
  corePlugins: {
    preflight: true,
  },

  // No prefix for class names
  prefix: '',

  // Use media queries for dark mode
  darkMode: 'class',
};