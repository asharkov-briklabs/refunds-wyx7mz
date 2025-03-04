import { useState, useEffect, useCallback } from 'react'; // React 18.2+
import { breakpoints } from '../themes'; // Import predefined breakpoint values for responsive design

// Define types for breakpoints
type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

/**
 * Interface for responsive helpers returned by the useResponsive hook
 */
interface ResponsiveHelpers {
  /** Current viewport width in pixels */
  width: number;
  
  /** Current viewport height in pixels */
  height: number;
  
  /** Check if viewport width is greater than or equal to the given breakpoint */
  up: (breakpoint: Breakpoint) => boolean;
  
  /** Check if viewport width is less than the given breakpoint */
  down: (breakpoint: Breakpoint) => boolean;
  
  /** Check if viewport width is between two breakpoints (inclusive of start, exclusive of end) */
  between: (start: Breakpoint, end: Breakpoint) => boolean;
  
  /** Check if viewport width falls exactly within the given breakpoint range */
  only: (breakpoint: Breakpoint) => boolean;
  
  /** Current active breakpoint based on viewport width */
  currentBreakpoint: Breakpoint;
  
  /** Whether the current viewport is in mobile size range (less than tablet breakpoint) */
  isMobile: boolean;
  
  /** Whether the current viewport is in tablet size range (between tablet and desktop breakpoints) */
  isTablet: boolean;
  
  /** Whether the current viewport is in desktop size range (desktop breakpoint or larger) */
  isDesktop: boolean;
}

/**
 * A custom hook that provides responsive design utilities.
 * Monitors viewport size and provides methods to check against breakpoints
 * for implementing responsive behavior in components.
 * 
 * @returns An object containing responsive helper methods and properties
 */
const useResponsive = (): ResponsiveHelpers => {
  // Check if window is defined to handle server-side rendering
  const isBrowser = typeof window !== 'undefined';
  
  // Initialize state with default values
  // Using desktop breakpoint as default for SSR to ensure a good initial experience
  const [dimensions, setDimensions] = useState({
    width: isBrowser ? window.innerWidth : breakpoints.desktop,
    height: isBrowser ? window.innerHeight : 800,
  });

  // Create resize handler with debouncing for better performance
  const handleResize = useCallback(() => {
    if (!isBrowser) return;
    
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [isBrowser]);

  // Set up event listener for window resize
  useEffect(() => {
    if (!isBrowser) return;

    // Set initial dimensions
    handleResize();

    // Create debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedResizeHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 200); // 200ms debounce
    };

    // Add event listener
    window.addEventListener('resize', debouncedResizeHandler);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', debouncedResizeHandler);
      clearTimeout(timeoutId);
    };
  }, [handleResize, isBrowser]);

  // Destructure dimensions for easier access
  const { width, height } = dimensions;

  /**
   * Check if current width is greater than or equal to the specified breakpoint
   */
  const up = (breakpoint: Breakpoint): boolean => width >= breakpoints[breakpoint];

  /**
   * Check if current width is less than the specified breakpoint
   */
  const down = (breakpoint: Breakpoint): boolean => width < breakpoints[breakpoint];

  /**
   * Check if current width is between the start and end breakpoints
   * (inclusive of start, exclusive of end)
   */
  const between = (start: Breakpoint, end: Breakpoint): boolean => 
    width >= breakpoints[start] && width < breakpoints[end];

  /**
   * Check if current width falls exactly within the range defined for a breakpoint
   */
  const only = (breakpoint: Breakpoint): boolean => {
    switch (breakpoint) {
      case 'mobile':
        return width < breakpoints.tablet;
      case 'tablet':
        return width >= breakpoints.tablet && width < breakpoints.desktop;
      case 'desktop':
        return width >= breakpoints.desktop && width < breakpoints.largeDesktop;
      case 'largeDesktop':
        return width >= breakpoints.largeDesktop;
      default:
        return false;
    }
  };

  /**
   * Determine the current active breakpoint based on viewport width
   */
  const getCurrentBreakpoint = (): Breakpoint => {
    if (width >= breakpoints.largeDesktop) return 'largeDesktop';
    if (width >= breakpoints.desktop) return 'desktop';
    if (width >= breakpoints.tablet) return 'tablet';
    return 'mobile';
  };

  // Calculate current breakpoint
  const currentBreakpoint = getCurrentBreakpoint();

  // Convenience boolean flags for device categories
  const isMobile = width < breakpoints.tablet;
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;

  // Return all responsive helpers
  return {
    width,
    height,
    up,
    down,
    between,
    only,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
  };
};

export default useResponsive;