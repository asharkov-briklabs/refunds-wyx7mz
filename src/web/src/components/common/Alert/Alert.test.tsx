import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Alert, { AlertProps } from './Alert';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Alert Component', () => {
  /**
   * Test suite for the Alert component
   */

  it('renders with success type correctly', async () => {
    /**
     * Tests that the Alert component renders correctly with success type
     */
    // Render Alert component with type='success' props
    renderWithProviders(
      <Alert type="success" title="Success Title" message="Success message content" />
    );

    // Verify success icon is displayed
    const successIcon = screen.getByTitle('Success');
    expect(successIcon).toBeInTheDocument();

    // Check title and message are correctly rendered
    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success message content')).toBeInTheDocument();

    // Verify success styling is applied
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('bg-green-50');
  });

  it('renders with error type correctly', async () => {
    /**
     * Tests that the Alert component renders correctly with error type
     */
    // Render Alert component with type='error' props
    renderWithProviders(
      <Alert type="error" title="Error Title" message="Error message content" />
    );

    // Verify error icon is displayed
    const errorIcon = screen.getByTitle('Error');
    expect(errorIcon).toBeInTheDocument();

    // Check title and message are correctly rendered
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message content')).toBeInTheDocument();

    // Verify error styling is applied
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('bg-red-50');
  });

  it('renders with warning type correctly', async () => {
    /**
     * Tests that the Alert component renders correctly with warning type
     */
    // Render Alert component with type='warning' props
    renderWithProviders(
      <Alert type="warning" title="Warning Title" message="Warning message content" />
    );

    // Verify warning icon is displayed
    const warningIcon = screen.getByTitle('Warning');
    expect(warningIcon).toBeInTheDocument();

    // Check title and message are correctly rendered
    expect(screen.getByText('Warning Title')).toBeInTheDocument();
    expect(screen.getByText('Warning message content')).toBeInTheDocument();

    // Verify warning styling is applied
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('bg-yellow-50');
  });

  it('renders with info type correctly', async () => {
    /**
     * Tests that the Alert component renders correctly with info type
     */
    // Render Alert component with type='info' props
    renderWithProviders(
      <Alert type="info" title="Info Title" message="Info message content" />
    );

    // Verify info icon is displayed
    const infoIcon = screen.getByTitle('Information');
    expect(infoIcon).toBeInTheDocument();

    // Check title and message are correctly rendered
    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Info message content')).toBeInTheDocument();

    // Verify info styling is applied
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('bg-blue-50');
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    /**
     * Tests that the onDismiss callback is called when the dismiss button is clicked
     */
    // Create a mock function for onDismiss
    const onDismissMock = vi.fn();

    // Render Alert component with dismissible=true and the mock onDismiss function
    renderWithProviders(
      <Alert
        type="info"
        message="Info message content"
        dismissible
        onDismiss={onDismissMock}
      />
    );

    // Find the dismiss button in the rendered component
    const dismissButton = screen.getByRole('button', { name: 'Dismiss alert' });

    // Simulate a click on the dismiss button
    const user = setupUserEvent();
    await user.click(dismissButton);

    // Verify that the onDismiss mock function was called exactly once
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it('calls onAction when action button is clicked', async () => {
    /**
     * Tests that the onAction callback is called when the action button is clicked
     */
    // Create a mock function for onAction
    const onActionMock = vi.fn();

    // Render Alert component with actionLabel='Test Action' and the mock onAction function
    renderWithProviders(
      <Alert
        type="info"
        message="Info message content"
        actionLabel="Test Action"
        onAction={onActionMock}
      />
    );

    // Find the action button in the rendered component
    const actionButton = screen.getByRole('button', { name: 'Test Action' });

    // Simulate a click on the action button
    const user = setupUserEvent();
    await user.click(actionButton);

    // Verify that the onAction mock function was called exactly once
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when dismissible is false', async () => {
    /**
     * Tests that the dismiss button is not rendered when dismissible prop is false
     */
    // Render Alert component with dismissible=false
    renderWithProviders(
      <Alert type="info" message="Info message content" dismissible={false} />
    );

    // Verify that no dismiss button is present in the rendered component
    const dismissButton = screen.queryByRole('button', { name: 'Dismiss alert' });
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('does not render action button when actionLabel is not provided', async () => {
    /**
     * Tests that the action button is not rendered when actionLabel prop is not provided
     */
    // Render Alert component without actionLabel prop
    renderWithProviders(
      <Alert type="info" message="Info message content" />
    );

    // Verify that no action button is present in the rendered component
    const actionButton = screen.queryByRole('button', { name: 'Test Action' });
    expect(actionButton).not.toBeInTheDocument();
  });

  it('applies custom className when provided', async () => {
    /**
     * Tests that custom className prop is correctly applied to the component
     */
    // Render Alert component with a custom className
    renderWithProviders(
      <Alert type="info" message="Info message content" className="custom-alert-class" />
    );

    // Verify that the rendered component includes the custom class
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toHaveClass('custom-alert-class');
  });
});