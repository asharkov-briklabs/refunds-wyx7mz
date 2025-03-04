import React from 'react'; // ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // ^0.32.0
import ConfirmationDialog from './ConfirmationDialog';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('ConfirmationDialog Component', () => {
  it('renders with required props correctly', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeVisible();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  it('does not render when isOpen is false', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={false}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    expect(screen.queryByText('Are you sure you want to proceed?')).not.toBeInTheDocument();
  });

  it('renders custom button labels when provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        confirmLabel="Proceed Anyway"
        cancelLabel="Nevermind"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Proceed Anyway' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeVisible();
  });

  it('renders warning message when provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        warningMessage="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('This action cannot be undone.')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('renders reason input field when reasonInputLabel is provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        reasonInputLabel="Reason for action"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Reason for action')).toBeVisible();
  });

  it('uses custom placeholder for reason input when provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        reasonInputLabel="Reason for action"
        reasonInputPlaceholder="Enter explanation here"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const inputElement = screen.getByPlaceholderText('Enter explanation here');
    expect(inputElement).toBeVisible();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('passes reason value to onConfirm when reason input is used', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        reasonInputLabel="Reason for action"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const user = setupUserEvent();
    const reasonText = 'Test reason';
    await user.type(screen.getByLabelText('Reason for action'), reasonText);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledWith(reasonText);
  });

  it('validates required reason input when reasonRequired is true', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        reasonInputLabel="Reason for action"
        reasonRequired={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const user = setupUserEvent();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Please provide a reason')).toBeVisible();
    expect(onConfirm).not.toHaveBeenCalled();

    const reasonText = 'Test reason';
    await user.type(screen.getByLabelText('Reason for action'), reasonText);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledWith(reasonText);
  });

  it('displays loading state on confirm button when isConfirmLoading is true', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        isConfirmLoading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    expect(confirmButton).toBeDisabled();
  });

  it('disables confirm button when isConfirmDisabled is true', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        isConfirmDisabled={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();
  });

  it('applies custom variant to confirm button when confirmVariant is provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        className="custom-dialog-class"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialogElement = screen.getByRole('dialog');
    expect(dialogElement).toHaveClass('custom-dialog-class');
  });
});