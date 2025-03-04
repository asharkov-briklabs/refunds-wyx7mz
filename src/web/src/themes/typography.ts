/**
 * Typography configuration for the Refunds Service web interface
 * Provides consistent text styling across Pike (merchant) and Barracuda (admin) interfaces
 */

// Font family definitions
export const fontFamily = {
  primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace",
};

// Font weight definitions
export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Font size definitions (in rem for better accessibility)
export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  md: '1rem',       // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
};

// Line height definitions
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Letter spacing definitions
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

/**
 * Generates responsive font sizes based on screen size
 * @param options Object containing base font size and optional small and large screen sizes
 * @returns Responsive font style object with media queries
 */
export const responsiveText = (options: {
  base: string;
  sm?: string;
  lg?: string;
}) => {
  return {
    fontSize: options.base,
    '@media (max-width: 768px)': {
      fontSize: options.sm || options.base,
    },
    '@media (min-width: 1280px)': {
      fontSize: options.lg || options.base,
    },
  };
};

// Text truncation utilities
export const truncate = {
  singleLine: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  multiLine: (lines: number) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
  }),
};

// Component-specific text styles
export const textStyles = {
  // Headings
  h1: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  // Body text
  body1: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  body2: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  // UI elements
  button: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  overline: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
  // Form elements
  label: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  // Special text styles
  monospace: {
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  currencyValue: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.tight,
  },
  // Table styles
  tableHeader: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  tableCell: {
    fontFamily: fontFamily.primary,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
};

// Default export with all typography elements
export default {
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  textStyles,
  truncate,
  responsiveText,
};