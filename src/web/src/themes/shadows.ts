/**
 * shadows.ts
 * 
 * This file defines shadow styles with various elevation levels for creating depth
 * and visual hierarchy in UI components across both Pike (merchant) and Barracuda (admin)
 * interfaces of the Refunds Service application.
 */

/**
 * Base shadow values with increasing elevation levels
 */
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

/**
 * Specific shadow styles for common UI components
 */
export const componentShadows = {
  card: shadows.sm,
  dropdown: '0 2px 5px 0 rgba(0, 0, 0, 0.1), 0 1px 1px 0 rgba(0, 0, 0, 0.07)',
  modal: '0 16px 32px -1px rgba(0, 0, 0, 0.2), 0 8px 16px -2px rgba(0, 0, 0, 0.1)',
  popover: '0 6px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  tooltip: '0 3px 14px 0 rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.12)',
  notification: '0 4px 12px 0 rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

/**
 * Shadow styles for interactive element states
 */
export const interactionShadows = {
  hover: '0 6px 10px -2px rgba(0, 0, 0, 0.1), 0 3px 5px -1px rgba(0, 0, 0, 0.06)',
  active: '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
  focus: '0 0 0 3px rgba(66, 153, 225, 0.5)',
};

/**
 * Shadow styles with subtle coloring for status-specific UI elements
 */
export const statusShadows = {
  success: '0 4px 10px -1px rgba(72, 187, 120, 0.2), 0 2px 4px -1px rgba(72, 187, 120, 0.1)',
  warning: '0 4px 10px -1px rgba(237, 137, 54, 0.2), 0 2px 4px -1px rgba(237, 137, 54, 0.1)',
  error: '0 4px 10px -1px rgba(245, 101, 101, 0.2), 0 2px 4px -1px rgba(245, 101, 101, 0.1)',
  info: '0 4px 10px -1px rgba(66, 153, 225, 0.2), 0 2px 4px -1px rgba(66, 153, 225, 0.1)',
};

/**
 * Helper function to create custom shadow styles with specific parameters
 * 
 * @param x - Horizontal offset in pixels
 * @param y - Vertical offset in pixels
 * @param blur - Blur radius in pixels
 * @param spread - Spread radius in pixels
 * @param color - Shadow color in rgba or hex format
 * @param inset - Whether the shadow is inset
 * @returns CSS shadow string
 */
export const createCustomShadow = (
  x: number,
  y: number,
  blur: number,
  spread: number,
  color: string,
  inset: boolean = false
): string => {
  return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${color}`;
};

/**
 * Default export of the complete shadow system
 */
export default {
  shadows,
  componentShadows,
  interactionShadows,
  statusShadows,
  createCustomShadow,
};