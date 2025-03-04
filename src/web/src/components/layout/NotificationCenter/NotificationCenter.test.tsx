import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react ^13.4.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { vi } from 'vitest'; // vitest ^0.34.0
import NotificationCenter from './NotificationCenter';
import useNotification from '../../../hooks/useNotification';
import { Notification, NotificationType, NotificationPriority, NotificationChannel } from '../../../types/notification.types';

/**
 * Creates an array of mock notifications for testing
 * @returns {Notification[]} Array of mock notification objects for testing
 */
const mockNotifications = (): Notification[] => {
  // LD1: Create mock notification objects with different types, dates, and read statuses
  const now = new Date();
  const mockData: Notification[] = [
    {
      id: '1',
      type: NotificationType.REFUND_COMPLETED,
      userId: 'user1',
      title: 'Refund Completed',
      body: 'Your refund for $50.00 has been completed.',
      channel: NotificationChannel.EMAIL,
      status: 'success',
      priority: NotificationPriority.MEDIUM,
      createdAt: now.toISOString(),
      readAt: now.toISOString(),
      referenceId: 'refund123',
      referenceType: 'refund',
      data: {}
    },
    {
      id: '2',
      type: NotificationType.APPROVAL_REQUESTED,
      userId: 'user1',
      title: 'Approval Requested',
      body: 'A refund for $100.00 requires your approval.',
      channel: NotificationChannel.IN_APP,
      status: 'pending',
      priority: NotificationPriority.HIGH,
      createdAt: new Date(now.setDate(now.getDate() - 1)).toISOString(),
      readAt: null,
      referenceId: 'approval456',
      referenceType: 'approval',
      data: {}
    },
    {
      id: '3',
      type: NotificationType.REFUND_FAILED,
      userId: 'user1',
      title: 'Refund Failed',
      body: 'Your refund for $25.00 has failed.',
      channel: NotificationChannel.SMS,
      status: 'error',
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date(now.setDate(now.getDate() - 2)).toISOString(),
      readAt: null,
      referenceId: 'refund789',
      referenceType: 'refund',
      data: {}
    },
  ];

  // LD1: Return an array of these notification objects
  return mockData;
};

/**
 * Creates a mock implementation of the useNotification hook
 * @param mockData { notifications?: Notification[], unreadCount?: number, isLoading?: boolean }
 * @returns {object} Mocked useNotification hook return value
 */
const mockUseNotification = (mockData: { notifications?: Notification[], unreadCount?: number, isLoading?: boolean }) => {
  // LD1: Create mock functions for all hook methods (fetchNotifications, markAsRead, etc.)
  const fetchNotifications = vi.fn();
  const markAsRead = vi.fn();
  const markAllAsRead = vi.fn();
  const dismissAll = vi.fn();
  const updatePreferences = vi.fn();
  const fetchPreferences = vi.fn();

  // LD1: Return object with mock data and functions
  return {
    notifications: mockData.notifications || [],
    unreadCount: mockData.unreadCount || 0,
    isLoading: mockData.isLoading || false,
    error: null,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissAll,
    updatePreferences,
    preferences: [],
    fetchPreferences
  };
};

vi.mock('../../../hooks/useNotification', () => ({
  default: (mockData: any) => mockUseNotification(mockData),
}));

describe('NotificationCenter', () => {
  it('renders the notification bell icon with the correct unread count', () => {
    // LD1: Mock the useNotification hook with a specific unread count
    const mockData = { unreadCount: 2 };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Assert that the bell icon is present
    const bellIcon = screen.getByLabelText('View notifications');
    expect(bellIcon).toBeInTheDocument();

    // LD1: Assert that the badge with the unread count is present
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('renders the dropdown panel when the bell icon is clicked', async () => {
    // LD1: Mock the useNotification hook with some notifications
    const mockData = { notifications: mockNotifications() };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Get the bell icon and click it
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);

    // LD1: Wait for the dropdown panel to appear
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('closes the dropdown panel when clicking outside', async () => {
    // LD1: Mock the useNotification hook with some notifications
    const mockData = { notifications: mockNotifications() };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // LD1: Click outside the dropdown panel
    fireEvent.mouseDown(document);

    // LD1: Assert that the dropdown panel is no longer present
    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('marks all notifications as read when the "Mark all as read" button is clicked', async () => {
    // LD1: Mock the useNotification hook with some notifications and a mock markAllAsRead function
    const mockData = { notifications: mockNotifications(), markAllAsRead: vi.fn() };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // LD1: Click the "Mark all as read" button
    const markAllAsReadButton = screen.getByText('Mark all as read');
    fireEvent.click(markAllAsReadButton);

    // LD1: Assert that the markAllAsRead function was called
    expect(mockData.markAllAsRead).toHaveBeenCalled();
  });

  it('applies the correct filter when a filter option is selected', async () => {
    // LD1: Mock the useNotification hook with some notifications
    const mockData = { notifications: mockNotifications() };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // LD1: Select the "Unread" filter option
    const filterSelect = screen.getByLabelText('Filter:');
    fireEvent.change(filterSelect, { target: { value: 'unread' } });

    // LD1: Assert that only unread notifications are displayed
    await waitFor(() => {
      expect(screen.getAllByText('Approval Requested')).toHaveLength(1);
      expect(screen.queryByText('Refund Completed')).not.toBeInTheDocument();
    });

    // LD1: Select the "All" filter option
    fireEvent.change(filterSelect, { target: { value: 'all' } });

    // LD1: Assert that all notifications are displayed
    await waitFor(() => {
      expect(screen.getAllByText('Approval Requested')).toHaveLength(1);
      expect(screen.getByText('Refund Completed')).toBeInTheDocument();
    });
  });

  it('displays a loading state when notifications are loading', () => {
    // LD1: Mock the useNotification hook with isLoading set to true
    const mockData = { isLoading: true };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);

    // LD1: Assert that the loading message is displayed
    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('displays a message when no notifications are found', async () => {
    // LD1: Mock the useNotification hook with an empty notifications array
    const mockData = { notifications: [] };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);

    // LD1: Assert that the "No notifications found" message is displayed
    await waitFor(() => {
      expect(screen.getByText('No notifications found.')).toBeInTheDocument();
    });
  });

  it('calls the markAsRead function when a notification is clicked', async () => {
    // LD1: Mock the useNotification hook with some notifications and a mock markAsRead function
    const mockData = { notifications: mockNotifications(), markAsRead: vi.fn() };
    vi.mocked(useNotification).mockImplementation(() => mockUseNotification(mockData) as any);

    // LD1: Render the NotificationCenter component
    render(<NotificationCenter />);

    // LD1: Open the dropdown panel
    const bellIcon = screen.getByLabelText('View notifications');
    fireEvent.click(bellIcon);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // LD1: Click on a notification
    const notificationButton = screen.getByText('Refund Completed').closest('button');
    fireEvent.click(notificationButton!);

    // LD1: Assert that the markAsRead function was called with the correct notification ID
    expect(mockData.markAsRead).toHaveBeenCalledWith('1');
  });
});