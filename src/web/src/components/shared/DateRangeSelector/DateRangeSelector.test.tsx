import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import DateRangeSelector from './DateRangeSelector';
import { TimeFrame, DateRange } from '../../../types/common.types';
import { getDateRangeFromTimeFrame } from '../../../utils/date.utils';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('DateRangeSelector', () => {
  // LD1: Set up the user event for simulating user interactions
  const user = setupUserEvent();

  // Initialize mock handlers and common props for the tests
  const mockOnChange = jest.fn();
  const commonProps = {
    onChange: mockOnChange,
  };

  it('renders with default timeframe', async () => {
    // LD1: Render the DateRangeSelector with basic required props
    renderWithProviders(<DateRangeSelector {...commonProps} />);

    // LD2: Check that the timeframe dropdown shows 'Last 30 Days' by default
    expect(screen.getByRole('combobox')).toHaveValue(TimeFrame.LAST_30_DAYS);

    // LD3: Verify the onChange handler was called with the correct default date range
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const expectedDateRange = getDateRangeFromTimeFrame(TimeFrame.LAST_30_DAYS);
      expect(mockOnChange).toHaveBeenCalledWith(expectedDateRange, TimeFrame.LAST_30_DAYS);
    });
  });

  it('renders with custom timeframe', async () => {
    // LD1: Render the DateRangeSelector with a specific timeframe (TODAY)
    renderWithProviders(<DateRangeSelector {...commonProps} defaultTimeFrame={TimeFrame.TODAY} />);

    // LD2: Check that the timeframe dropdown shows 'Today'
    expect(screen.getByRole('combobox')).toHaveValue(TimeFrame.TODAY);

    // LD3: Verify the onChange handler was called with the correct date range for TODAY
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const expectedDateRange = getDateRangeFromTimeFrame(TimeFrame.TODAY);
      expect(mockOnChange).toHaveBeenCalledWith(expectedDateRange, TimeFrame.TODAY);
    });
  });

  it('handles timeframe change', async () => {
    // LD1: Render the DateRangeSelector with default props
    renderWithProviders(<DateRangeSelector {...commonProps} />);

    // LD2: Simulate user selecting a different timeframe from dropdown
    await act(async () => {
      await user.selectOptions(screen.getByRole('combobox'), TimeFrame.THIS_WEEK);
    });

    // LD3: Verify the onChange handler was called with the correct date range for the new timeframe
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(2);
      const expectedDateRange = getDateRangeFromTimeFrame(TimeFrame.THIS_WEEK);
      expect(mockOnChange).toHaveBeenCalledWith(expectedDateRange, TimeFrame.THIS_WEEK);
    });

    // LD4: Check that the dropdown display updates to reflect the new selection
    expect(screen.getByRole('combobox')).toHaveValue(TimeFrame.THIS_WEEK);
  });

  it('shows date pickers for CUSTOM timeframe', async () => {
    // LD1: Render the DateRangeSelector with CUSTOM timeframe
    renderWithProviders(<DateRangeSelector {...commonProps} defaultTimeFrame={TimeFrame.CUSTOM} />);

    // LD2: Verify that both start date and end date pickers are visible
    expect(screen.getByLabelText('Start Date')).toBeVisible();
    expect(screen.getByLabelText('End Date')).toBeVisible();

    // LD3: Verify the onChange handler was called with the provided custom date range
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const expectedDateRange = getDateRangeFromTimeFrame(TimeFrame.CUSTOM);
      expect(mockOnChange).toHaveBeenCalledWith(expectedDateRange, TimeFrame.CUSTOM);
    });
  });

  it('handles custom date range changes', async () => {
    // LD1: Render the DateRangeSelector with CUSTOM timeframe
    renderWithProviders(<DateRangeSelector {...commonProps} defaultTimeFrame={TimeFrame.CUSTOM} />);

    // LD2: Simulate user selecting new start date in the date picker
    const startDatePicker = screen.getByLabelText('Start Date');
    await act(async () => {
      await user.click(startDatePicker);
      await user.click(screen.getByText('15')); // Select day 15
    });

    // LD3: Simulate user selecting new end date in the date picker
    const endDatePicker = screen.getByLabelText('End Date');
    await act(async () => {
      await user.click(endDatePicker);
      await user.click(screen.getByText('20')); // Select day 20
    });

    // LD4: Verify the onChange handler was called with the updated date range values
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      const startDateValue = (startDatePicker as HTMLInputElement).value;
      const endDateValue = (endDatePicker as HTMLInputElement).value;

      const expectedDateRange: DateRange = {
        startDate: startDateValue,
        endDate: endDateValue,
      };
      expect(mockOnChange).toHaveBeenCalledWith(expectedDateRange, TimeFrame.CUSTOM);
    });

    // LD5: Check that the date pickers display the new selected dates
    expect(screen.getByLabelText('Start Date')).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText('End Date')).not.toBeEmptyDOMElement();
  });

  it('respects disabled prop', async () => {
    // LD1: Render the DateRangeSelector with disabled=true
    renderWithProviders(<DateRangeSelector {...commonProps} disabled={true} />);

    // LD2: Verify that the timeframe dropdown is disabled
    expect(screen.getByRole('combobox')).toBeDisabled();

    // LD3: If CUSTOM timeframe, verify that date pickers are also disabled
    renderWithProviders(<DateRangeSelector {...commonProps} disabled={true} defaultTimeFrame={TimeFrame.CUSTOM} />);
    expect(screen.getByLabelText('Start Date')).toBeDisabled();
    expect(screen.getByLabelText('End Date')).toBeDisabled();
  });

  it('applies custom className', () => {
    // LD1: Render the DateRangeSelector with a custom className
    renderWithProviders(<DateRangeSelector {...commonProps} className="custom-class" />);

    // LD2: Verify that the root element has the custom className applied
    expect(screen.getByRole('combobox').closest('div')).toHaveClass('custom-class');
  });

  it('respects allowedTimeFrames prop', async () => {
    // LD1: Render the DateRangeSelector with a limited set of allowedTimeFrames
    renderWithProviders(<DateRangeSelector {...commonProps} allowedTimeFrames={[TimeFrame.TODAY, TimeFrame.YESTERDAY]} />);

    // LD2: Open the timeframe dropdown
    await act(async () => {
      await user.click(screen.getByRole('combobox'));
    });

    // LD3: Verify only the allowed timeframes are present in the dropdown options
    const options = screen.getAllRole('option');
    expect(options).toHaveLength(2); // Today and Yesterday
    expect(options[0]).toHaveValue(TimeFrame.TODAY);
    expect(options[1]).toHaveValue(TimeFrame.YESTERDAY);
  });

  it('enforces maxDateRange in custom mode', async () => {
    // LD1: Render the DateRangeSelector with CUSTOM timeframe and maxDateRange
    const maxDateRange = 7;
    renderWithProviders(<DateRangeSelector {...commonProps} defaultTimeFrame={TimeFrame.CUSTOM} maxDateRange={maxDateRange} />);

    // LD2: Attempt to select dates that exceed the maximum range
    const startDatePicker = screen.getByLabelText('Start Date');
    await act(async () => {
      await user.click(startDatePicker);
      await user.click(screen.getByText('1')); // Select day 1
    });

    const endDatePicker = screen.getByLabelText('End Date');
    await act(async () => {
      await user.click(endDatePicker);
      await user.click(screen.getByText('10')); // Select day 10 (exceeds maxDateRange)
    });

    // LD3: Verify that the component prevents selection of invalid date ranges
    // LD4: Verify the onChange handler is not called with invalid ranges
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });
});