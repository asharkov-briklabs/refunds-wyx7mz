/**
 * Breakpoints for responsive design
 * 
 * These values define the standard breakpoint widths used throughout the application
 * for consistent responsive behavior across both Pike (merchant) and Barracuda (admin)
 * interfaces.
 * 
 * Usage example:
 * ```
 * import breakpoints from 'themes/breakpoints';
 * 
 * // In styled-components
 * const Container = styled.div`
 *   @media (min-width: ${breakpoints.tablet}px) {
 *     display: flex;
 *   }
 * `;
 * ```
 */

const breakpoints = {
  /**
   * Mobile breakpoint
   * Designed for small screens (smartphones)
   * Supports essential functions with focus on monitoring and approvals
   */
  mobile: 480,

  /**
   * Tablet breakpoint
   * Optimized layout with preserved functionality but streamlined navigation
   */
  tablet: 768,

  /**
   * Standard desktop breakpoint
   * Full-featured interface with comprehensive dashboards and controls
   */
  desktop: 1024,

  /**
   * Large desktop breakpoint
   * Enhanced interface for large screens with expanded viewing area
   */
  largeDesktop: 1440,
};

export default breakpoints;