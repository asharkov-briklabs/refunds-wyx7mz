import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import RadioGroup, { RadioGroupSize } from './RadioGroup';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('RadioGroup Component', () => {
  it('renders with default props correctly', async () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    const onChange = vi.fn();

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={onChange} />);

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();

    options.forEach((option) => {
      const radio = screen.getByLabelText(option.label);
      expect(radio).toBeInTheDocument();
      expect(radio).toHaveAttribute('name', 'test-radio');
      expect(radio).toHaveAttribute('id', expect.stringContaining(`test-radio-group-option-${option.value}`));
      expect(radio).toHaveAttribute('value', option.value);
    });
  });

  it('renders with label correctly', async () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={() => {}} label="Test Label" />);

    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('id', 'test-radio-group-label');
  });

  it('renders with different sizes correctly', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} size={RadioGroupSize.SM} />);
    expect(screen.getByLabelText('Option 1')).toHaveClass('w-4');
    expect(screen.getByLabelText('Option 1')).toHaveClass('h-4');

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} size={RadioGroupSize.MD} />);
    expect(screen.getByLabelText('Option 1')).toHaveClass('w-5');
    expect(screen.getByLabelText('Option 1')).toHaveClass('h-5');

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} size={RadioGroupSize.LG} />);
    expect(screen.getByLabelText('Option 1')).toHaveClass('w-6');
    expect(screen.getByLabelText('Option 1')).toHaveClass('h-6');
  });

  it('renders with horizontal orientation correctly', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }]} onChange={() => {}} orientation="horizontal" />);

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('flex-row');
    expect(radioGroup).toHaveClass('flex-wrap');

    const option1 = screen.getByLabelText('Option 1').closest('label');
    expect(option1).toHaveClass('mr-4');
  });

  it('renders in disabled state correctly', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} disabled={true} />);

    const radio = screen.getByLabelText('Option 1');
    expect(radio).toBeDisabled();
    expect(radio.closest('label')).toHaveClass('cursor-not-allowed');
  });

  it('renders with error state correctly', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} error="Test Error" />);

    const error = screen.getByText('Test Error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-red-600');
    expect(screen.getByLabelText('Option 1')).toHaveClass('border-red-500');
  });

  it('renders with helper text correctly', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} helperText="Test Helper" />);

    const helperText = screen.getByText('Test Helper');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-gray-500');
  });

  it('selects the correct option based on value prop', async () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={() => {}} value="option2" />);

    const option1 = screen.getByLabelText('Option 1');
    const option2 = screen.getByLabelText('Option 2');

    expect(option1).not.toBeChecked();
    expect(option2).toBeChecked();
  });

  it('calls onChange handler when an option is selected', async () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    const onChange = vi.fn();

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={onChange} />);

    const userEvent = setupUserEvent();
    await userEvent.click(screen.getByLabelText('Option 1'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: expect.any(Object) }));
  });

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={onChange} disabled={true} />);

    const userEvent = setupUserEvent();
    await userEvent.click(screen.getByLabelText('Option 1'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles individual disabled options correctly', async () => {
    const options = [
      { value: 'option1', label: 'Option 1', disabled: true },
      { value: 'option2', label: 'Option 2' },
    ];

    const onChange = vi.fn();

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={onChange} />);

    const userEvent = setupUserEvent();
    await userEvent.click(screen.getByLabelText('Option 1'));
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText('Option 2'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation', async () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    const onChange = vi.fn();

    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={options} onChange={onChange} />);

    const option1 = screen.getByLabelText('Option 1');
    const option2 = screen.getByLabelText('Option 2');
    const option3 = screen.getByLabelText('Option 3');

    option1.focus();
    expect(option1).toHaveFocus();

    const userEvent = setupUserEvent();
    await userEvent.keyboard('{ArrowRight}');
    expect(option2).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(option3).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(option2).toHaveFocus();

    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: expect.any(Object) }));
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(<RadioGroup id="test-radio-group" name="test-radio" options={[{ value: 'option1', label: 'Option 1' }]} onChange={() => {}} className="custom-class" />);

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('custom-class');
  });
});