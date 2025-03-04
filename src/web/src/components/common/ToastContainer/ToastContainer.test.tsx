import React from 'react'; // react ^18.2.0
import { render, screen, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { jest } from '@jest/globals'; // @jest/globals ^29.5.0
import ToastContainer from './ToastContainer';
import useToast from '../../../hooks/useToast';
import { renderWithProviders, waitForComponentToPaint } from '../../../utils/test.utils';
import { NotificationIconType } from '../../../types/notification.types';

// Mock the useToast hook to control toast state
jest.mock('../../../hooks/useToast');

describe('ToastContainer', () => {
  // it should render without crashing
  it('should render without crashing', async () => {
    // Mock useToast to return an empty toasts array
    (useToast as jest.Mock).mockReturnValue({
      toasts: [],
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: jest.fn(),
      removeToast: jest.fn(),
    });

    // Render the ToastContainer using renderWithProviders
    const { getByTestId } = renderWithProviders(<ToastContainer />);

    // Verify the toast container element is in the document
    const toastContainer = getByTestId('toast-container');
    expect(toastContainer).toBeInTheDocument();

    // Check that no toast elements are rendered initially
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // it should apply the correct position class
  it('should apply the correct position class', async () => {
    const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

    for (const position of positions) {
      (useToast as jest.Mock).mockReturnValue({
        toasts: [],
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
        addToast: jest.fn(),
        removeToast: jest.fn(),
      });

      // Render the ToastContainer with the current position
      const { getByTestId } = renderWithProviders(<ToastContainer position={position as any} />);

      // Verify the container has the appropriate position-specific class
      const toastContainer = getByTestId('toast-container');
      expect(toastContainer).toHaveClass(`toast-container--${position}`);

      // Verify position-related styling is correctly applied
      const style = window.getComputedStyle(toastContainer);
      if (position.startsWith('top')) {
        expect(style.top).toBe('0px');
      } else if (position.startsWith('bottom')) {
        expect(style.bottom).toBe('0px');
      }

      if (position.endsWith('right')) {
        expect(style.right).toBe('0px');
      } else if (position.endsWith('left')) {
        expect(style.left).toBe('0px');
      } else if (position.endsWith('center')) {
        expect(style.left).toBe('50%');
        expect(style.transform).toBe('translateX(-50%)');
      }
    }
  });

  // it should limit the number of toasts based on maxToasts prop
  it('should limit the number of toasts based on maxToasts prop', async () => {
    // Mock useToast to return an array of 6 toast objects
    const mockToasts = Array.from({ length: 6 }, (_, i) => ({
      id: `toast-${i + 1}`,
      message: `Toast ${i + 1}`,
      type: NotificationIconType.INFO,
      duration: 5000,
      dismissible: true,
    }));

    (useToast as jest.Mock).mockReturnValue({
      toasts: mockToasts,
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: jest.fn(),
      removeToast: jest.fn(),
    });

    // Render the ToastContainer with maxToasts set to 3
    renderWithProviders(<ToastContainer maxToasts={3} />);

    // Verify only 3 toast elements are rendered
    const toastElements = screen.getAllByRole('alert');
    expect(toastElements.length).toBe(3);

    // Confirm the most recent 3 toasts are displayed
    expect(toastElements[0]).toHaveTextContent('Toast 4');
    expect(toastElements[1]).toHaveTextContent('Toast 5');
    expect(toastElements[2]).toHaveTextContent('Toast 6');
  });

  // it should apply custom container className
  it('should apply custom container className', async () => {
    (useToast as jest.Mock).mockReturnValue({
      toasts: [],
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: jest.fn(),
      removeToast: jest.fn(),
    });

    // Render the ToastContainer with a custom containerClassName
    const { getByTestId } = renderWithProviders(<ToastContainer containerClassName="custom-container" />);

    // Verify the container has the custom class applied
    const toastContainer = getByTestId('toast-container');
    expect(toastContainer).toHaveClass('custom-container');

    // Confirm the default classes are also still applied
    expect(toastContainer).toHaveClass('toast-container');
  });

  // it should render toast notifications correctly
  it('should render toast notifications correctly', async () => {
    // Mock useToast to return an array with toast objects of different types
    const mockToasts = [
      { id: 'toast-1', message: 'Success toast', type: NotificationIconType.SUCCESS, duration: 5000, dismissible: true },
      { id: 'toast-2', message: 'Error toast', type: NotificationIconType.ERROR, duration: 5000, dismissible: true },
      { id: 'toast-3', message: 'Warning toast', type: NotificationIconType.WARNING, duration: 5000, dismissible: true },
      { id: 'toast-4', message: 'Info toast', type: NotificationIconType.INFO, duration: 5000, dismissible: true },
    ];

    (useToast as jest.Mock).mockReturnValue({
      toasts: mockToasts,
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: jest.fn(),
      removeToast: jest.fn(),
    });

    // Render the ToastContainer
    renderWithProviders(<ToastContainer />);

    // Verify each toast is rendered with correct message and type
    mockToasts.forEach((toast) => {
      const toastElement = screen.getByTestId(`toast-${toast.id}`);
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveTextContent(toast.message);
      expect(toastElement).toHaveClass(`toast-${toast.type}`);
    });

    // Check that toast elements have proper accessibility attributes
    const alertElements = screen.getAllByRole('alert');
    alertElements.forEach((alert) => {
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  // it should handle toast removal correctly
  it('should handle toast removal correctly', async () => {
    // Create a mock implementation of removeToast function
    const mockRemoveToast = jest.fn();

    // Mock useToast to return toasts array and the mock removeToast function
    const mockToasts = [{ id: 'toast-1', message: 'Test toast', type: NotificationIconType.INFO, duration: 5000, dismissible: true }];
    (useToast as jest.Mock).mockReturnValue({
      toasts: mockToasts,
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: jest.fn(),
      removeToast: mockRemoveToast,
    });

    // Render the ToastContainer
    renderWithProviders(<ToastContainer />);

    // Simulate clicking the close button on a toast
    const closeButton = screen.getByRole('button', { name: 'Close notification' });
    await act(async () => {
      closeButton.click();
    });

    // Verify removeToast was called with the correct toast ID
    expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
  });

  // it should animate toasts during entry and exit
  it('should animate toasts during entry and exit', async () => {
    // Create mock implementation to add and remove toasts
    const mockAddToast = jest.fn((options) => {
      setToasts((prev) => [...prev, { id: 'new-toast', ...options }]);
      return 'new-toast';
    });
    const mockRemoveToast = jest.fn((id) => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    });

    // Mock useToast to return toasts array and the mock functions
    const mockToasts: any = [];
    const useToastMock = {
      toasts: mockToasts,
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
    };
    (useToast as jest.Mock).mockReturnValue(useToastMock);

    // Create state variable to manage toasts
    let setToasts: any;
    (useToast as jest.Mock).mockImplementation(() => {
      const [toasts, setToastsFn] = React.useState(mockToasts);
      setToasts = setToastsFn;
      return {
        ...useToastMock,
        toasts,
      };
    });

    // Render the ToastContainer
    const { rerender } = renderWithProviders(<ToastContainer />);

    // Add a new toast and verify it has the entry animation class
    await act(async () => {
      mockAddToast({ message: 'New toast', type: NotificationIconType.INFO, duration: 5000, dismissible: true });
      rerender(<ToastContainer />);
    });

    const newToast = screen.getByTestId('toast-new-toast');
    expect(newToast).toHaveClass('toast-animation-enter');

    // Wait for animation to complete
    await waitForComponentToPaint({ rerender });

    // Remove the toast and verify it has the exit animation class
    await act(async () => {
      mockRemoveToast('new-toast');
      rerender(<ToastContainer />);
    });

    expect(newToast).toHaveClass('toast-animation-exit');

    // Wait for animation to complete and verify toast is no longer in document
    await waitForComponentToPaint({ rerender });
    await waitFor(() => {
      expect(screen.queryByTestId('toast-new-toast')).not.toBeInTheDocument();
    });
  });
});