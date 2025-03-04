import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Checkbox, { CheckboxProps } from './Checkbox';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Checkbox Component', () => {
  it('renders with default props correctly', async () => {
    const labelText = 'Remember me';
    renderWithProviders(<Checkbox id="remember-me" name="remember" checked={false} onChange={() => {}} label={labelText} />);

    const checkboxInput = screen.getByRole('checkbox');
    expect(checkboxInput).toBeInTheDocument();

    const labelElement = screen.getByText(labelText);
    expect(labelElement).toBeInTheDocument();

    expect((checkboxInput as HTMLInputElement).checked).toBe(false);
  });

  it('renders in checked state correctly', async () => {
    renderWithProviders(<Checkbox id="agree" name="agreement" checked={true} onChange={() => {}} label="I agree" />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkboxInput.checked).toBe(true);

    const checkboxContainer = screen.getByRole('checkbox').closest('.checkbox');
    expect(checkboxContainer).toHaveClass('checkbox--checked');
  });

  it('renders in disabled state correctly', async () => {
    renderWithProviders(<Checkbox id="terms" name="terms" checked={false} onChange={() => {}} label="Accept terms" disabled />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkboxInput).toHaveAttribute('disabled');
    expect(checkboxInput).toHaveAttribute('aria-disabled', 'true');

    const checkboxContainer = screen.getByRole('checkbox').closest('.checkbox-container');
    expect(checkboxContainer).toHaveClass('checkbox-container--disabled');
  });

  it('renders with error state correctly', async () => {
    renderWithProviders(<Checkbox id="subscribe" name="subscribe" checked={false} onChange={() => {}} label="Subscribe" error="Error message" />);

    const errorMessage = screen.getByText('Error message');
    expect(errorMessage).toBeInTheDocument();

    const checkboxContainer = screen.getByRole('checkbox').closest('.checkbox-container');
    expect(checkboxContainer).toHaveClass('checkbox-container--error');
  });

  it('renders with helper text correctly', async () => {
    renderWithProviders(<Checkbox id="updates" name="updates" checked={false} onChange={() => {}} label="Receive updates" helperText="Get notified about new features" />);

    const helperText = screen.getByText('Get notified about new features');
    expect(helperText).toBeInTheDocument();

    const helperTextContainer = screen.getByText('Get notified about new features');
    expect(helperTextContainer).toHaveClass('checkbox-helper-text');
  });

  it('renders in indeterminate state correctly', async () => {
    renderWithProviders(<Checkbox id="select-all" name="selectAll" checked={false} onChange={() => {}} label="Select All" indeterminate />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    await waitFor(() => {
      expect(checkboxInput.indeterminate).toBe(true);
    });

    const checkboxElement = screen.getByRole('checkbox').closest('.checkbox');
    expect(checkboxElement).toHaveClass('checkbox--indeterminate');
  });

  it('calls onChange handler when clicked', async () => {
    const onChangeMock = vi.fn();
    renderWithProviders(<Checkbox id="option1" name="option1" checked={false} onChange={onChangeMock} label="Option 1" />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    const user = setupUserEvent();
    await user.click(checkboxInput);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock.mock.calls[0][0].target.checked).toBe(true);
  });

  it('does not call onChange when disabled', async () => {
    const onChangeMock = vi.fn();
    renderWithProviders(<Checkbox id="option2" name="option2" checked={false} onChange={onChangeMock} label="Option 2" disabled />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    const user = setupUserEvent();
    await user.click(checkboxInput);

    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(<Checkbox id="custom" name="custom" checked={false} onChange={() => {}} label="Custom" className="custom-class" />);

    const checkboxContainer = screen.getByRole('checkbox').closest('.checkbox-container');
    expect(checkboxContainer).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', async () => {
    renderWithProviders(<Checkbox id="test-checkbox" name="test" checked={false} onChange={() => {}} label="Test Checkbox" required />);

    const checkboxInput = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkboxInput).toHaveAttribute('aria-required', 'true');

    const labelElement = screen.getByText('Test Checkbox');
    expect(labelElement).toHaveAttribute('for', 'test-checkbox');

    const checkboxWrapper = screen.getByRole('checkbox').closest('.checkbox-wrapper');
    expect(checkboxWrapper).toHaveAttribute('role');
  });
});