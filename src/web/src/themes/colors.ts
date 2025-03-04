/**
 * Color system for the Refunds Service application
 * 
 * This file defines the color palette and themes for both Pike (merchant) and Barracuda (admin) interfaces.
 * All colors are designed to meet WCAG 2.1 AA accessibility standards with sufficient contrast ratios.
 * 
 * @version 1.0.0
 */

// Primary color palette (blue-based)
export const primary = {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3', // Main primary color
  600: '#1e88e5',
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
};

// Secondary color palette (teal-based)
export const secondary = {
  50: '#e0f2f1',
  100: '#b2dfdb',
  200: '#80cbc4',
  300: '#4db6ac',
  400: '#26a69a',
  500: '#009688', // Main secondary color
  600: '#00897b',
  700: '#00796b',
  800: '#00695c',
  900: '#004d40',
};

// Neutral gray palette
export const gray = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0',
  400: '#bdbdbd',
  500: '#9e9e9e', // Main gray color
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
};

// Semantic colors for feedback and status indicators
export const semantic = {
  success: {
    light: '#e8f5e9',
    main: '#4caf50',
    dark: '#2e7d32',
    text: '#1b5e20',
  },
  warning: {
    light: '#fff8e1',
    main: '#ffc107',
    dark: '#ff8f00',
    text: '#e65100',
  },
  error: {
    light: '#ffebee',
    main: '#f44336',
    dark: '#c62828',
    text: '#b71c1c',
  },
  info: {
    light: '#e3f2fd',
    main: '#2196f3',
    dark: '#1565c0',
    text: '#0d47a1',
  },
};

// Refund status specific colors
export const refundStatus = {
  completed: semantic.success.main,
  processing: '#2196f3', // Primary blue
  pendingApproval: '#ff9800', // Orange
  failed: semantic.error.main,
  draft: gray[500],
  canceled: gray[700],
};

// Pike (merchant-facing) interface colors
export const pike = {
  primary: '#0288d1', // Lighter blue
  secondary: '#00acc1', // Cyan
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
    highlight: '#e1f5fe',
  },
  text: {
    primary: gray[900],
    secondary: gray[700],
    disabled: gray[500],
    hint: gray[400],
  },
};

// Barracuda (admin-facing) interface colors
export const barracuda = {
  primary: '#303f9f', // Indigo
  secondary: '#7b1fa2', // Purple
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
    highlight: '#e8eaf6',
  },
  text: {
    primary: gray[900],
    secondary: gray[700],
    disabled: gray[500],
    hint: gray[400],
  },
};

// Common colors used across both interfaces
export const common = {
  white: '#ffffff',
  black: '#000000',
  border: gray[300],
  background: {
    light: gray[100],
    main: gray[200],
    dark: gray[300],
  },
  text: {
    primary: gray[900],
    secondary: gray[700],
    disabled: gray[500],
  },
};

// Default export with all colors
const colors = {
  primary,
  secondary,
  gray,
  semantic,
  refundStatus,
  pike,
  barracuda,
  common,
};

export default colors;