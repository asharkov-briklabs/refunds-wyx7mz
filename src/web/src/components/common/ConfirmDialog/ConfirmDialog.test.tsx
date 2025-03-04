import React from 'react'; // ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // ^0.32.0
import ConfirmDialog from './ConfirmDialog';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('ConfirmDialog Component', () => {
  it('renders with required props correctly', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  it('renders custom button labels when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
        confirmLabel="Proceed Anyway"
        cancelLabel="Nevermind"
      />
    );

    expect(screen.getByRole('button', { name: 'Proceed Anyway' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nevermind' })).toBeVisible();
  });

  it('renders with message when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="This action cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('This action cannot be undone.')).toBeVisible();
  });

  it('renders warning message when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        warningMessage="This is a destructive action!"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('This is a destructive action!')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('renders reason input field when showReasonField is true', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        showReasonField={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByLabelText('Reason')).toBeVisible();
  });

  it('applies custom reason label and placeholder when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        showReasonField={true}
        reasonLabel="Justification"
        reasonPlaceholder="Explain why you are doing this"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByLabelText('Justification')).toBeVisible();
    const reasonInput = screen.getByLabelText('Justification');
    expect(reasonInput).toHaveAttribute('placeholder', 'Explain why you are doing this');
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = setupUserEvent();

    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = setupUserEvent();

    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirmWithReason with reason value when showReasonField is true', async () => {
    const onConfirmWithReason = vi.fn();
    const user = setupUserEvent();

    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        showReasonField={true}
        onConfirmWithReason={onConfirmWithReason}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    const reasonInput = screen.getByLabelText('Reason');
    await user.type(reasonInput, 'Test reason');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirmWithReason).toHaveBeenCalledWith('Test reason');
  });

  it('displays loading state when isConfirmLoading is true', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
        isConfirmLoading={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toContainHTML('svg');
    expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables confirm button when isConfirmDisabled is true', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
        isConfirmDisabled={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
        className="custom-dialog-class"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-dialog-class');
  });

  it('applies confirmVariant to the confirm button when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
        confirmVariant="danger"
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('renders children when provided', async () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
        onConfirm={() => {}}
        onCancel={() => {}}
      >
        <p>Additional content</p>
      </ConfirmDialog>
    );

    expect(screen.getByText('Additional content')).toBeVisible();
  });
});