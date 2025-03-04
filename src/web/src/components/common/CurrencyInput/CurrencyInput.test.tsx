import React from 'react'; // version ^18.2.0
import { screen, fireEvent, waitFor } from '@testing-library/react'; // version ^14.0.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import CurrencyInput from './CurrencyInput';
import { formatCurrencyInput, parseCurrencyInput, getCurrencySymbol } from '../../../utils/currency.utils';
import jest from 'jest'; // version ^29.5.0

describe('CurrencyInput', () => {
  // Setup tests for the CurrencyInput component
  // Group related tests together

  it('renders correctly with default props', () => {
    // Tests that the component renders correctly with default properties
    // Render CurrencyInput with basic required props
    renderWithProviders(<CurrencyInput value={0} onChange={() => {}} />);

    // Verify the input field is present
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();

    // Check that currency symbol is correctly displayed
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('handles value changes correctly', async () => {
    // Tests that value changes are handled correctly
    // Create a mock change handler
    const onChange = jest.fn();
    const userEvent = setupUserEvent();

    // Render CurrencyInput with the mock handler
    renderWithProviders(<CurrencyInput value={0} onChange={onChange} />);

    // Simulate a user typing in the input field
    const inputElement = screen.getByRole('textbox');
    await userEvent.type(inputElement, '123.45');

    // Verify the onChange handler is called with correct value
    expect(onChange).toHaveBeenCalledWith(123.45);
  });

  it('handles focus and blur correctly', async () => {
    // Tests focus and blur behavior of the input
    // Render CurrencyInput component
    renderWithProviders(<CurrencyInput value={1234.56} onChange={() => {}} />);

    // Simulate input focus
    const inputElement = screen.getByRole('textbox');
    fireEvent.focus(inputElement);

    // Verify focus behavior (selection)
    expect(inputElement).toHaveFocus();

    // Simulate input blur
    fireEvent.blur(inputElement);

    // Verify blur behavior (proper formatting)
    await waitFor(() => {
      expect(inputElement).toHaveValue('$1,234.56');
    });
  });

  it('displays error state correctly', () => {
    // Tests that error states are properly displayed
    // Render CurrencyInput with an error message
    renderWithProviders(<CurrencyInput value={0} onChange={() => {}} error="Invalid amount" />);

    // Verify error message is displayed
    expect(screen.getByText('Invalid amount')).toBeInTheDocument();

    // Check that input has error styling
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveClass('currency-input-error');
  });

  it('respects min and max value constraints', async () => {
    // Tests minimum and maximum value constraints
    // Render CurrencyInput with min and max props
    const onChange = jest.fn();
    const userEvent = setupUserEvent();
    renderWithProviders(<CurrencyInput value={50} onChange={onChange} min={10} max={100} />);

    // Attempt to input values above max
    const inputElement = screen.getByRole('textbox');
    await userEvent.type(inputElement, '999');

    // Verify values are capped at maximum
    expect(onChange).toHaveBeenCalledWith(100);

    // Attempt to input values below min
    fireEvent.change(inputElement, { target: { value: '1' } });

    // Verify values are limited to minimum
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('applies different size classes correctly', () => {
    // Tests size variant styling
    // Render CurrencyInput with different size props
    const { rerender } = renderWithProviders(<CurrencyInput value={0} onChange={() => {}} size="small" />);

    // Verify correct size classes are applied
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveClass('currency-input-small');

    // Rerender with medium size
    rerenderWithProviders(<CurrencyInput value={0} onChange={() => {}} size="medium" />);
    expect(inputElement).toHaveClass('currency-input-medium');

    // Rerender with large size
    rerenderWithProviders(<CurrencyInput value={0} onChange={() => {}} size="large" />);
    expect(inputElement).toHaveClass('currency-input-large');

    function rerenderWithProviders(ui: React.ReactElement) {
      renderWithProviders(ui);
    }
  });

  it('handles custom currency codes', async () => {
    // Tests proper formatting with different currency codes
    // Render CurrencyInput with different currency codes
    renderWithProviders(<CurrencyInput value={1234.56} onChange={() => {}} currencyCode="EUR" />);

    // Verify currency symbol changes appropriately
    expect(screen.getByText('€')).toBeInTheDocument();

    // Check that formatting follows the currency's standard
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveValue('€1,234.56');
  });

  it('supports accessibility features', () => {
    // Tests accessibility attributes and behavior
    // Render CurrencyInput with label and required props
    renderWithProviders(<CurrencyInput value={0} onChange={() => {}} label="Amount" required id="test-amount" />);

    // Verify aria-required attribute is set
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveAttribute('aria-required', 'true');

    // Check for label-input association via htmlFor/id
    const labelElement = screen.getByText('Amount');
    expect(labelElement).toHaveAttribute('for', 'test-amount');

    // Verify appropriate aria-invalid attributes when errors present
    renderWithProviders(<CurrencyInput value={0} onChange={() => {}} label="Amount" required id="test-amount" error="Amount is required" />);
    expect(inputElement).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles negative values correctly', async () => {
    // Tests negative value handling based on allowNegative prop
    // Render CurrencyInput with allowNegative=true
    const onChangeAllowNegative = jest.fn();
    const userEvent = setupUserEvent();
    renderWithProviders(<CurrencyInput value={0} onChange={onChangeAllowNegative} allowNegative />);

    // Input a negative value
    const inputElementAllowNegative = screen.getByRole('textbox');
    await userEvent.type(inputElementAllowNegative, '-123.45');

    // Verify negative value is accepted
    expect(onChangeAllowNegative).toHaveBeenCalledWith(-123.45);

    // Render with allowNegative=false
    const onChangeNoNegative = jest.fn();
    renderWithProviders(<CurrencyInput value={0} onChange={onChangeNoNegative} allowNegative={false} />);

    // Attempt to input a negative value
    const inputElementNoNegative = screen.getByRole('textbox');
    await userEvent.type(inputElementNoNegative, '-123.45');

    // Verify negative value is prevented
    expect(onChangeNoNegative).toHaveBeenCalledWith(0);
  });
});