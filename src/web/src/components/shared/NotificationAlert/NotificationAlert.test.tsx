import React from 'react'; // react ^18.2.0
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'; // @testing-library/react ^13.4.0
import { jest } from '@jest/globals'; // @jest/globals ^29.5.0
import NotificationAlert from './NotificationAlert';
import Alert from '../../common/Alert';
import { NotificationType } from '../../../types/notification.types';

// Mock the useNotification hook and its markAsRead function
const mockMarkAsRead = jest.fn();
jest.mock('../../../hooks/useNotification', () => ({
  __esModule: true,
  default: () => ({ markAsRead: mockMarkAsRead })
}));

// Setup function that runs before each test
beforeEach(() => {
  // Reset all mocks
  mockMarkAsRead.mockReset();

  // Clear any previous mock calls
  jest.clearAllMocks();
});

// Cleanup function that runs after each test
afterEach(() => {
  // Clean up React Testing Library's DOM
  act(() => {
    // No specific cleanup needed for this test suite
  });
});

describe('NotificationAlert', () => {
  test('renders the notification with the correct content', () => {
    // Create a mock notification object with title and body
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Render the NotificationAlert component with the mock notification
    render(<NotificationAlert notification={notification} />);

    // Assert that the notification title is displayed
    expect(screen.getByText('Refund Completed')).toBeInTheDocument();

    // Assert that the notification body is displayed
    expect(screen.getByText('Your refund has been successfully processed.')).toBeInTheDocument();
  });

  test('maps notification types to correct alert types', () => {
    // Create test cases for different notification types
    const testCases = [
      { notificationType: NotificationType.REFUND_COMPLETED, expectedAlertType: 'success' },
      { notificationType: NotificationType.REFUND_FAILED, expectedAlertType: 'error' },
      { notificationType: NotificationType.APPROVAL_REQUESTED, expectedAlertType: 'warning' },
      { notificationType: NotificationType.APPROVAL_REMINDER, expectedAlertType: 'warning' },
      { notificationType: NotificationType.APPROVAL_ESCALATED, expectedAlertType: 'warning' },
    ];

    // For each test case, render NotificationAlert with the specified notification type
    testCases.forEach(({ notificationType, expectedAlertType }) => {
      const notification = {
        id: '123',
        type: notificationType,
        userId: 'user1',
        title: 'Test Notification',
        body: 'This is a test notification.',
        channel: 'EMAIL',
        status: 'SENT',
        priority: 'HIGH',
        createdAt: '2023-01-01T00:00:00.000Z',
        readAt: null,
        referenceId: 'refund123',
        referenceType: 'refund',
        data: {}
      };
      render(<NotificationAlert notification={notification} />);

      // Verify the rendered Alert has the expected type prop (success, error, warning, info)
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass(`bg-${expectedAlertType}-50`);
    });
  });

  test('calls onDismiss and markAsRead when dismiss button is clicked', async () => {
    // Create a mock notification
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Create a mock onDismiss callback function
    const onDismiss = jest.fn();

    // Render NotificationAlert with the mock notification and onDismiss prop
    render(<NotificationAlert notification={notification} onDismiss={onDismiss} />);

    // Find and click the dismiss button
    const dismissButton = screen.getByRole('button', { name: 'Dismiss alert' });
    fireEvent.click(dismissButton);

    // Assert that onDismiss was called once
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Assert that markAsRead was called with the notification id
    expect(mockMarkAsRead).toHaveBeenCalledWith('123');
  });

  test('calls onView when view button is clicked', () => {
    // Create a mock notification
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Create a mock onView callback function
    const onView = jest.fn();

    // Render NotificationAlert with the mock notification and onView prop
    render(<NotificationAlert notification={notification} onView={onView} />);

    // Find and click the view action button
    const viewButton = screen.getByRole('button', { name: 'View Details' });
    fireEvent.click(viewButton);

    // Assert that onView was called once with the notification
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(notification);
  });

  test('auto-closes after specified duration', async () => {
    // Mock timers
    jest.useFakeTimers();

    // Create a mock notification
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Create a mock onDismiss function
    const onDismiss = jest.fn();

    // Render NotificationAlert with autoClose=true and a specified duration
    render(<NotificationAlert notification={notification} autoClose={true} duration={3000} onDismiss={onDismiss} />);

    // Assert that the notification is initially visible
    expect(screen.getByText('Refund Completed')).toBeVisible();

    // Advance timers by the specified duration
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Wait for the component to update
    await waitFor(() => {
      // Assert that onDismiss was called
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // Restore timers
    jest.useRealTimers();
  });

  test('does not auto-close if autoClose is false', () => {
    // Mock timers
    jest.useFakeTimers();

    // Create a mock notification
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Create a mock onDismiss function
    const onDismiss = jest.fn();

    // Render NotificationAlert with autoClose=false
    render(<NotificationAlert notification={notification} autoClose={false} onDismiss={onDismiss} />);

    // Advance timers by a long duration
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Assert that onDismiss was not called
    expect(onDismiss).not.toHaveBeenCalled();

    // Restore timers
    jest.useRealTimers();
  });

  test('applies additional className when provided', () => {
    // Create a mock notification
    const notification = {
      id: '123',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund has been successfully processed.',
      channel: 'EMAIL',
      status: 'SENT',
      priority: 'HIGH',
      createdAt: '2023-01-01T00:00:00.000Z',
      readAt: null,
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    };

    // Render NotificationAlert with a custom className prop
    render(<NotificationAlert notification={notification} className="custom-class" />);

    // Assert that the rendered component includes the custom className
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('custom-class');
  });
});