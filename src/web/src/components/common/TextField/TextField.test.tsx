import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import TextField from './TextField';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('TextField Component', () => {
  it('renders with default props correctly', async () => {
    const { container } = renderWithProviders(<TextField label="Test Label" id="test-id" />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();

    const inputWrapper = container.querySelector('.relative.flex.items-center.w-full');
    expect(inputWrapper).toHaveClass('border');
    expect(inputWrapper).toHaveClass('border-gray-300');
    expect(inputWrapper).toHaveClass('rounded-md');
    expect(inputWrapper).not.toHaveClass('py-1');
    expect(inputWrapper).toHaveClass('py-2');
    expect(inputWrapper).not.toHaveClass('py-3');
  });

  it('renders with different variants correctly', async () => {
    const { rerender } = renderWithProviders(<TextField label="Test Label" id="test-id" variant="outlined" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('border');

    rerenderWithProviders(<TextField label="Test Label" id="test-id" variant="filled" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('bg-gray-100');

    rerenderWithProviders(<TextField label="Test Label" id="test-id" variant="standard" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('border-b-2');
  });

  it('renders with different sizes correctly', async () => {
    const { rerender } = renderWithProviders(<TextField label="Test Label" id="test-id" size="small" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('py-1');

    rerenderWithProviders(<TextField label="Test Label" id="test-id" size="medium" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('py-2');

    rerenderWithProviders(<TextField label="Test Label" id="test-id" size="large" />);
    expect(screen.getByRole('textbox').closest('.relative.flex.items-center.w-full')).toHaveClass('py-3');
  });

  it('renders in disabled state correctly', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input.closest('.relative.flex.items-center.w-full')).toHaveClass('cursor-not-allowed');
  });

  it('renders with error state correctly', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" error="Error message" />);
    const input = screen.getByRole('textbox');
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(input.closest('.relative.flex.items-center.w-full')).toHaveClass('border-red-500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-error'));
  });

  it('renders with helper text correctly', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" helperText="Helper text" />);
    const input = screen.getByRole('textbox');
    expect(screen.getByText('Helper text')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-helper'));
  });

  it('renders with placeholder correctly', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" placeholder="Enter text" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
  });

  it('renders with start adornment correctly', async () => {
    const StartAdornment = () => <span>Start</span>;
    renderWithProviders(<TextField label="Test Label" id="test-id" startAdornment={<StartAdornment />} />);
    expect(screen.getByText('Start').closest('.flex.items-center.mr-2.text-gray-500')).toBeInTheDocument();
    expect(screen.getByText('Start').compareDocumentPosition(screen.getByRole('textbox'))).toBe(4);
  });

  it('renders with end adornment correctly', async () => {
    const EndAdornment = () => <span>End</span>;
    renderWithProviders(<TextField label="Test Label" id="test-id" endAdornment={<EndAdornment />} />);
    expect(screen.getByText('End').closest('.flex.items-center.ml-2.text-gray-500')).toBeInTheDocument();
    expect(screen.getByRole('textbox').compareDocumentPosition(screen.getByText('End'))).toBe(4);
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" className="custom-container" />);
    expect(screen.getByLabelText('Test Label').closest('.custom-container')).toBeInTheDocument();

    renderWithProviders(<TextField label="Test Label" id="test-id" inputClassName="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');

    renderWithProviders(<TextField label="Test Label" id="test-id" labelClassName="custom-label" />);
    expect(screen.getByText('Test Label')).toHaveClass('custom-label');
  });

  it('handles input changes correctly', async () => {
    const onChange = vi.fn();
    renderWithProviders(<TextField label="Test Label" id="test-id" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    const user = setupUserEvent();
    await user.type(input, 'test');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('handles focus and blur events correctly', async () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    renderWithProviders(<TextField label="Test Label" id="test-id" onFocus={onFocus} onBlur={onBlur} />);
    const input = screen.getByRole('textbox');
    const user = setupUserEvent();
    await user.focus(input);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(input.closest('.relative.flex.items-center.w-full')).toHaveClass('border-blue-500');
    await user.blur(input);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(input.closest('.relative.flex.items-center.w-full')).not.toHaveClass('border-blue-500');
  });

  it('handles keyboard events correctly', async () => {
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    renderWithProviders(<TextField label="Test Label" id="test-id" onKeyDown={onKeyDown} onKeyUp={onKeyUp} />);
    const input = screen.getByRole('textbox');
    const user = setupUserEvent();
    await user.focus(input);
    await user.keyboard('a');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyUp).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to the input element correctly', async () => {
    const ref = React.createRef<HTMLInputElement>();
    renderWithProviders(<TextField label="Test Label" id="test-id" ref={ref} />);
    const input = screen.getByRole('textbox');
    await waitFor(() => {
      expect(ref.current).toBe(input);
    });
    ref.current?.focus();
    expect(document.activeElement).toBe(input);
  });

  it('respects readOnly attribute', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    const user = setupUserEvent();
    await user.type(input, 'test');
    expect(input).toHaveValue('');
  });

  it('respects required attribute', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" required />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('required');
    expect(screen.getByText('Test Label')).toContainHTML('<span class="text-red-500 ml-1" aria-hidden="true">*</span>');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('respects maxLength and minLength attributes', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" maxLength={10} minLength={5} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '10');
    expect(input).toHaveAttribute('minlength', '5');
  });

  it('applies autoFocus correctly', async () => {
    renderWithProviders(<TextField label="Test Label" id="test-id" autoFocus />);
    const input = screen.getByRole('textbox');
    expect(document.activeElement).toBe(input);
  });
});

// Helper function to rerender the component with providers
function rerenderWithProviders(ui: React.ReactElement) {
  renderWithProviders(ui);
}