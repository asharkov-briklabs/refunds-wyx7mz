// This file configures the Jest testing environment with DOM testing library extensions
// and mocks for browser APIs not available in the testing environment
import '@testing-library/jest-dom';

// Mock window.matchMedia since it's not implemented in JSDOM
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Mock window.scrollTo to prevent errors when components call it
window.scrollTo = jest.fn();

// Mock ResizeObserver which is not implemented in JSDOM
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock localStorage to test components that use it
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
});