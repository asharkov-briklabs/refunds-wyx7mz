import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { vi } from 'vitest'; // vitest ^0.34.6
import Toast from './Toast';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { NotificationIconType } from '../../../types/notification.types';

describe('Toast component', () => {
  it('renders with default props', async () => {
    const message = 'Test message';
    renderWithProviders(<Toast id="test-toast" message={message} />);

    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
    expect(screen.getByRole('button', { name: 'Close notification' })).toBeVisible();
  });

  it('renders different types of toasts with correct styling', async () => {
    renderWithProviders(<Toast id="success-toast" message="Success!" type={NotificationIconType.SUCCESS} />);
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
    expect(screen.getByTitle('Success')).toBeVisible();

    renderWithProviders(<Toast id="error-toast" message="Error!" type={NotificationIconType.ERROR} />);
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
    expect(screen.getByTitle('Error')).toBeVisible();

    renderWithProviders(<Toast id="warning-toast" message="Warning!" type={NotificationIconType.WARNING} />);
    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
    expect(screen.getByTitle('Warning')).toBeVisible();

    renderWithProviders(<Toast id="info-toast" message="Info!" type={NotificationIconType.INFO} />);
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
    expect(screen.getByTitle('Information')).toBeVisible();
  });

  it('shows title when provided', async () => {
    const title = 'Test Title';
    const message = 'Test Message';
    renderWithProviders(<Toast id="test-toast" title={title} message={message} />);

    expect(screen.getByText(title)).toBeVisible();
    expect(screen.getByText(message)).toBeVisible();
  });

  it('auto-dismisses after duration', async () => {
    vi.useFakeTimers();
    renderWithProviders(<Toast id="test-toast" message="Test" duration={1000} />);

    expect(screen.getByRole('alert')).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('can be manually closed', async () => {
    const onClose = vi.fn();
    const user = setupUserEvent();
    renderWithProviders(<Toast id="test-toast" message="Test" onClose={onClose} />);

    expect(screen.getByRole('alert')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Close notification' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show close button when dismissible is false', async () => {
    renderWithProviders(<Toast id="test-toast" message="Test" dismissible={false} />);

    expect(screen.queryByRole('button', { name: 'Close notification' })).not.toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction are provided', async () => {
    const onAction = vi.fn();
    const user = setupUserEvent();
    renderWithProviders(<Toast id="test-toast" message="Test" actionLabel="Retry" onAction={onAction} />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', async () => {
    renderWithProviders(<Toast id="test-toast" message="Test" />);

    expect(screen.getByRole('alert')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: 'Close notification' })).toHaveAttribute('aria-label', 'Close notification');

    renderWithProviders(<Toast id="test-toast" message="Test" actionLabel="Retry" onAction={() => { }} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveAttribute('aria-label', 'Retry');
  });
});