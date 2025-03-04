/**
 * Main theme configuration for the Refunds Service application
 * 
 * This file exports a unified theme object by combining breakpoints, colors, shadows,
 * and typography settings, ensuring consistent styling across both Pike (merchant) 
 * and Barracuda (admin) interfaces.
 * 
 * The theming system is designed to:
 * - Maintain consistent styling across both interfaces
 * - Support responsive design for various device sizes
 * - Comply with WCAG 2.1 AA accessibility standards
 * - Establish clear visual hierarchy and information architecture
 * 
 * @version 1.0.0
 */

import breakpoints from './breakpoints';
import colors from './colors';
import shadows from './shadows';
import typography from './typography';

/**
 * Creates a themed configuration object for a specific interface (Pike or Barracuda)
 * 
 * @param options - Theme customization options
 * @returns Complete theme configuration
 */
export const createTheme = (options: Record<string, any> = {}) => {
  // Base theme structure
  const baseTheme = {
    breakpoints,
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      gray: colors.gray,
      semantic: colors.semantic,
      refundStatus: colors.refundStatus,
      background: {
        default: colors.common.white,
        paper: colors.gray[100],
        highlight: colors.primary[50],
      },
      text: colors.common.text,
    },
    shadows: shadows.shadows,
    componentShadows: shadows.componentShadows,
    interactionShadows: shadows.interactionShadows,
    statusShadows: shadows.statusShadows,
    typography: typography.textStyles,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight,
    fontSize: typography.fontSize,
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
  };

  // Merge options with base theme
  return {
    ...baseTheme,
    ...options,
    colors: {
      ...baseTheme.colors,
      ...(options.colors || {}),
    },
  };
};

/**
 * Pike theme configuration (merchant-facing interface)
 * Designed for merchant users with a lighter blue color scheme
 */
export const pikeTheme = createTheme({
  colors: {
    primary: colors.pike.primary,
    secondary: colors.pike.secondary,
    background: colors.pike.background,
    text: colors.pike.text,
  },
});

/**
 * Barracuda theme configuration (admin-facing interface)
 * Designed for administrative users with a deeper indigo/purple color scheme
 */
export const barracudaTheme = createTheme({
  colors: {
    primary: colors.barracuda.primary,
    secondary: colors.barracuda.secondary,
    background: colors.barracuda.background,
    text: colors.barracuda.text,
  },
});

/**
 * Default export providing complete theming system
 * Includes base theme elements, specific theme configurations, and theme creation utility
 */
export default {
  // Base theme elements
  breakpoints,
  colors,
  shadows,
  typography,
  
  // Theme configurations
  pikeTheme,
  barracudaTheme,
  
  // Theme creation utility
  createTheme,
};