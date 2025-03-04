import { useEffect, useState } from 'react'; // React 18.2+
import breakpoints from '../themes/breakpoints';

/**
 * Enum representing possible device types for responsive design
 * Used throughout the application to conditionally render components
 * based on the current viewport size
 */
export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
}

/**
 * Interface representing viewport dimensions
 * Contains both width and height of the current viewport
 */
export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * Checks if the current viewport width corresponds to a desktop device
 * 
 * @param width - The viewport width to check
 * @returns True if the viewport width is desktop-sized, false otherwise
 */
export const isDesktop = (width: number): boolean => {
  return width >= breakpoints.desktop;
};

/**
 * Checks if the current viewport width corresponds to a tablet device
 * 
 * @param width - The viewport width to check
 * @returns True if the viewport width is tablet-sized, false otherwise
 */
export const isTablet = (width: number): boolean => {
  return width >= breakpoints.tablet && width < breakpoints.desktop;
};

/**
 * Checks if the current viewport width corresponds to a mobile device
 * 
 * @param width - The viewport width to check
 * @returns True if the viewport width is mobile-sized, false otherwise
 */
export const isMobile = (width: number): boolean => {
  return width < breakpoints.tablet;
};

/**
 * Determines the device type based on current viewport width
 * 
 * @param width - The viewport width to check
 * @returns The detected device type (MOBILE, TABLET, or DESKTOP)
 */
export const getDeviceType = (width: number): DeviceType => {
  if (isDesktop(width)) {
    return DeviceType.DESKTOP;
  } else if (isTablet(width)) {
    return DeviceType.TABLET;
  } else {
    return DeviceType.MOBILE;
  }
};

/**
 * Gets the current viewport dimensions
 * Handles server-side rendering by returning zero values when window is not available
 * 
 * @returns An object containing width and height of the viewport
 */
export const getViewportDimensions = (): ViewportDimensions => {
  if (typeof window === 'undefined') {
    // Handle server-side rendering case
    return {
      width: 0,
      height: 0,
    };
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

/**
 * Creates a media query string for the specified device type
 * Useful for dynamic style generation and media query matching
 * 
 * @param deviceType - The device type to create a media query for
 * @returns Media query string for the specified device type
 */
export const getMediaQueryString = (deviceType: DeviceType): string => {
  switch (deviceType) {
    case DeviceType.MOBILE:
      return `(max-width: ${breakpoints.tablet - 1}px)`;
    case DeviceType.TABLET:
      return `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`;
    case DeviceType.DESKTOP:
      return `(min-width: ${breakpoints.desktop}px)`;
    default:
      return '';
  }
};

/**
 * Helper function that sets up window event listeners with automatic cleanup
 * Particularly useful for handling resize events to update responsive UI components
 * 
 * @param eventType - The event type to listen for (e.g., 'resize', 'scroll')
 * @param handler - The event handler function
 * @param dependencies - Dependencies array for the useEffect hook
 */
export const useWindowListener = (
  eventType: string, 
  handler: EventListenerOrEventListenerObject, 
  dependencies: any[] = []
): void => {
  useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window !== 'undefined') {
      // Add event listener
      window.addEventListener(eventType, handler);
      
      // Cleanup function to remove the event listener
      return () => {
        window.removeEventListener(eventType, handler);
      };
    }
    return undefined;
  }, dependencies); // Re-run if dependencies change
};