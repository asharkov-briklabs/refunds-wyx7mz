import React from 'react'; // react ^18.2.0
import { render, screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { Select, SelectProps, SelectSize } from './Select';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { SelectOption } from '../../../types/common.types';

describe('Select component test suite', () => {
  // Define common test data
  const options: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ];

  const defaultProps: Omit<SelectProps, 'name' | 'options' | 'value' | 'onChange'> = {
    label: 'Test Select',
    id: 'test-select',
    helperText: 'This is a helper text',
  };

  test('renders correctly with basic props', () => {
    // Render Select with minimal props
    const { container } = renderWithProviders(
      <Select
        name="testSelect"
        options={options}
        value=""
        onChange={() => {}}
      />
    );

    // Verify component renders without errors
    expect(container).toBeInTheDocument();

    // Check that all options are in the document
    options.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });

    // Verify default styling is applied
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveClass('border-gray-300');
  });

  test('renders with correct sizes', () => {
    // Test small size rendering
    const { container: smContainer } = renderWithProviders(
      <Select
        name="testSelectSm"
        options={options}
        value=""
        onChange={() => {}}
        size={SelectSize.SM}
        {...defaultProps}
      />
    );
    expect(smContainer).toBeInTheDocument();
    const smSelectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(smSelectElement).toHaveClass('py-1');

    // Test medium size rendering (default)
    const { container: mdContainer } = renderWithProviders(
      <Select
        name="testSelectMd"
        options={options}
        value=""
        onChange={() => {}}
        size={SelectSize.MD}
        {...defaultProps}
      />
    );
    expect(mdContainer).toBeInTheDocument();
    const mdSelectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(mdSelectElement).toHaveClass('py-2');

    // Test large size rendering
    const { container: lgContainer } = renderWithProviders(
      <Select
        name="testSelectLg"
        options={options}
        value=""
        onChange={() => {}}
        size={SelectSize.LG}
        {...defaultProps}
      />
    );
    expect(lgContainer).toBeInTheDocument();
    const lgSelectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(lgSelectElement).toHaveClass('py-3');
  });

  test('shows error state correctly', () => {
    // Render Select with error prop
    renderWithProviders(
      <Select
        name="testSelectError"
        options={options}
        value=""
        onChange={() => {}}
        error="This is an error message"
        {...defaultProps}
      />
    );

    // Verify error message is displayed
    expect(screen.getByText('This is an error message')).toBeInTheDocument();

    // Check that error styling is applied to the select element
    const selectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(selectElement).toHaveClass('border-red-500');

    // Verify aria-invalid attribute is set to true
    expect(selectElement).toHaveAttribute('aria-invalid', 'true');
  });

  test('handles disabled state', () => {
    // Render Select with disabled prop set to true
    renderWithProviders(
      <Select
        name="testSelectDisabled"
        options={options}
        value=""
        onChange={() => {}}
        disabled={true}
        {...defaultProps}
      />
    );

    // Verify select element has disabled attribute
    const selectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(selectElement).toBeDisabled();

    // Check that disabled styling is applied
    expect(selectElement).toHaveClass('bg-gray-100');

    // Attempt to interact with the select and verify it's not possible
    userEvent.click(selectElement);
    expect(selectElement).not.toHaveFocus();
  });

  test('displays placeholder when provided', () => {
    // Render Select with placeholder prop
    renderWithProviders(
      <Select
        name="testSelectPlaceholder"
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Select an option"
        {...defaultProps}
      />
    );

    // Verify placeholder option is the first option
    const placeholderOption = screen.getByText('Select an option');
    expect(placeholderOption).toBeInTheDocument();

    // Check that placeholder has empty value
    expect(placeholderOption).toHaveValue('');

    // Verify placeholder is displayed when no value is selected
    const selectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(selectElement).toHaveTextContent('Select an option');
  });

  test('applies fullWidth styling', () => {
    // Render Select with fullWidth prop set to true
    const { container } = renderWithProviders(
      <Select
        name="testSelectFullWidth"
        options={options}
        value=""
        onChange={() => {}}
        fullWidth={true}
        {...defaultProps}
      />
    );

    // Verify fullWidth CSS class is applied
    const selectElement = screen.getByRole('combobox', { name: 'Test Select' });
    expect(selectElement).toHaveClass('w-full');

    // Check that the select takes up the full width of its container
    const selectContainer = container.querySelector('.w-full');
    expect(selectContainer).toBeInTheDocument();
  });

  test('calls onChange when selection changes', async () => {
    // Create a mock onChange function
    const onChange = jest.fn();

    // Render Select with the mock function
    renderWithProviders(
      <Select
        name="testSelectOnChange"
        options={options}
        value=""
        onChange={onChange}
        {...defaultProps}
      />
    );

    // Simulate user selecting a different option
    const selectElement = screen.getByRole('combobox', { name: 'Test Select' });
    const user = setupUserEvent();
    await user.selectOptions(selectElement, 'option2');

    // Verify onChange was called with correct event
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.any(Object),
    }));

    // Check that the selection was updated
    expect(selectElement).toHaveValue('option2');
  });

  test('has proper accessibility attributes', () => {
    // Render Select with label and required props
    renderWithProviders(
      <Select
        name="testSelectAccessibility"
        options={options}
        value=""
        onChange={() => {}}
        label="Accessible Select"
        required={true}
        error="Error message"
        id="accessible-select"
      />
    );

    // Verify label is properly associated with select using htmlFor
    const labelElement = screen.getByText('Accessible Select');
    expect(labelElement).toHaveAttribute('for', 'accessible-select');

    // Check for aria-required attribute when required
    const selectElement = screen.getByRole('combobox', { name: 'Accessible Select' });
    expect(selectElement).toHaveAttribute('aria-required', 'true');

    // Verify aria-invalid is present when in error state
    expect(selectElement).toHaveAttribute('aria-invalid', 'true');

    // Test keyboard navigation works correctly
    selectElement.focus();
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('Option 1')).toBeVisible();
  });
});