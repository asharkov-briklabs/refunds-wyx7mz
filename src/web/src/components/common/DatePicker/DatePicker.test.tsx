import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import dayjs from 'dayjs'; // dayjs ^1.11.7

import DatePicker from './DatePicker';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { DATE_PICKER_FORMATS } from '../../../constants/date-formats.constants';
import { isValidDate, formatDateToMedium } from '../../../utils/date.utils';

describe('DatePicker Component', () => {
  it('renders with default props correctly', async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={null} />);

    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('placeholder', `Select date (${DATE_PICKER_FORMATS.INPUT_FORMAT})`);
    expect(inputElement.closest('.date-picker-container')).toBeInTheDocument();
  });

  it('renders with a selected date', async () => {
    const testDate = new Date('2023-05-20');
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={testDate} />);

    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveValue(dayjs(testDate).format(DATE_PICKER_FORMATS.INPUT_FORMAT));
    expect(inputElement.closest('.date-picker-container')).toBeInTheDocument();
  });

  it('handles date selection correctly', async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={null} />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    await user.click(inputElement);
    await user.click(screen.getByText('15'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(inputElement).toHaveValue(formatDateToMedium(onChange.mock.calls[0][0]));
  });

  it('handles manual date input correctly', async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={null} />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    await user.clear(inputElement);
    await user.type(inputElement, '05/22/2023');
    await user.tab(inputElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(formatDateToMedium(onChange.mock.calls[0][0])).toBe('May 22, 2023');

    onChange.mockClear();
    await user.clear(inputElement);
    await user.type(inputElement, 'invalid date');
    await user.tab(inputElement);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects min and max date restrictions', async () => {
    const minDate = new Date('2023-05-10');
    const maxDate = new Date('2023-05-20');
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={null} minDate={minDate} maxDate={maxDate} />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    await user.click(inputElement);

    expect(screen.getByText('9')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('21')).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByText('15'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows error state correctly', async () => {
    renderWithProviders(<DatePicker onChange={() => {}} value={null} error="Test Error" />);

    const inputElement = screen.getByRole('textbox');
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(inputElement.closest('.date-picker-container')).toHaveClass('date-picker-container');
  });

  it('handles disabled state correctly', async () => {
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={null} disabled={true} />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    expect(inputElement).toBeDisabled();
    expect(inputElement.closest('.date-picker-container')).toHaveClass('date-picker-container');

    await user.click(inputElement);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies custom className when provided', async () => {
    renderWithProviders(<DatePicker onChange={() => {}} value={null} className="custom-class" />);

    const container = screen.getByRole('textbox').closest('.date-picker-container');
    expect(container).toHaveClass('custom-class');
  });

  it('supports different date formats', async () => {
    const testDate = new Date('2023-05-20');
    const onChange = vi.fn();
    renderWithProviders(<DatePicker onChange={onChange} value={testDate} dateFormat="YYYY-MM-DD" />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    expect(inputElement).toHaveValue(dayjs(testDate).format('YYYY-MM-DD'));

    await user.clear(inputElement);
    await user.type(inputElement, '2023-05-22');
    await user.tab(inputElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(formatDateToMedium(onChange.mock.calls[0][0])).toBe('May 22, 2023');
  });

  it('provides proper keyboard navigation', async () => {
    renderWithProviders(<DatePicker onChange={() => {}} value={null} />);

    const user = setupUserEvent();
    const inputElement = screen.getByRole('textbox');

    await user.click(inputElement);
    await user.keyboard('[Enter]');

    expect(screen.queryByRole('dialog')).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', async () => {
    renderWithProviders(<DatePicker onChange={() => {}} value={null} label="Test Label" required />);

    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveAttribute('aria-label', 'Test Label');
    expect(inputElement).toHaveAttribute('aria-required', 'true');
  });

  it('handles ref forwarding correctly', async () => {
    const ref = React.createRef<HTMLInputElement>();
    renderWithProviders(<DatePicker onChange={() => {}} value={null} ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('textbox'));

    ref.current?.focus();
    expect(document.activeElement).toBe(ref.current);
  });
});