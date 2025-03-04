import React from 'react'; // react ^18.2.0
import { screen, render, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import MetricCard from './MetricCard';
import { renderWithProviders } from '../../../utils/test.utils';
import { jest } from '@testing-library/jest-dom'; // jest ^29.5.0

/**
 * Helper function for testing metric value formatting in isolated environment
 * @param value - The numeric value to format
 * @param format - The format type to apply
 * @returns Expected formatted value
 */
const formatValue = (value: number, format: string): string => {
  // LD1: Format the provided value according to specified format type
  // LD2: Return the expected formatted string for assertion
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  } else if (format === 'percentage') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  } else {
    return value.toString();
  }
};

describe('MetricCard', () => {
  it('should render the label and value', () => {
    // LD1: Render the MetricCard component with a label and value
    renderWithProviders(<MetricCard label="Test Metric" value={1234} />);

    // LD2: Assert that the label and value are present in the document
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should format the value as currency when format is currency', () => {
    // LD1: Define a test value and format
    const value = 1234.56;
    const format = 'currency';

    // LD2: Render the MetricCard component with the test value and format
    renderWithProviders(<MetricCard label="Test Metric" value={value} format={format} />);

    // LD3: Assert that the formatted value is present in the document
    expect(screen.getByText(formatValue(value, format))).toBeInTheDocument();
  });

  it('should format the value as percentage when format is percentage', () => {
    // LD1: Define a test value and format
    const value = 0.75;
    const format = 'percentage';

    // LD2: Render the MetricCard component with the test value and format
    renderWithProviders(<MetricCard label="Test Metric" value={value} format={format} />);

    // LD3: Assert that the formatted value is present in the document
    expect(screen.getByText(formatValue(value, format))).toBeInTheDocument();
  });

  it('should display a trend indicator when previousValue is provided', () => {
    // LD1: Render the MetricCard component with a previousValue
    renderWithProviders(<MetricCard label="Test Metric" value={150} previousValue={100} />);

    // LD2: Assert that the trend indicator is present in the document
    expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('should display a down trend indicator when previousValue is higher than value', () => {
    // LD1: Render the MetricCard component with a previousValue higher than value
    renderWithProviders(<MetricCard label="Test Metric" value={50} previousValue={100} />);

    // LD2: Assert that the down trend indicator is present in the document
    expect(screen.getByTestId('arrow-down')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('should not display a trend indicator when previousValue is not provided', () => {
    // LD1: Render the MetricCard component without a previousValue
    renderWithProviders(<MetricCard label="Test Metric" value={100} />);

    // LD2: Assert that the trend indicator is not present in the document
    expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arrow-down')).not.toBeInTheDocument();
  });

  it('should apply the correct CSS classes based on the size prop', () => {
    // LD1: Render the MetricCard component with a size prop
    const { container } = renderWithProviders(<MetricCard label="Test Metric" value={100} size="small" />);

    // LD2: Assert that the correct CSS class is applied to the container
    expect(container.firstChild).toHaveClass('metric-card-small');
  });

  it('should apply the correct CSS classes based on the colorScheme prop', () => {
    // LD1: Render the MetricCard component with a colorScheme prop
    const { container } = renderWithProviders(<MetricCard label="Test Metric" value={100} colorScheme="primary" />);

    // LD2: Assert that the correct CSS class is applied to the container
    expect(container.firstChild).toHaveClass('metric-card-primary');
  });

  it('should apply additional CSS classes when className is provided', () => {
    // LD1: Render the MetricCard component with a className prop
    const { container } = renderWithProviders(<MetricCard label="Test Metric" value={100} className="custom-class" />);

    // LD2: Assert that the custom CSS class is applied to the container
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display the trend label when provided', () => {
    // LD1: Render the MetricCard component with a trendLabel prop
    renderWithProviders(<MetricCard label="Test Metric" value={150} previousValue={100} trendLabel="vs. Last Month" />);

    // LD2: Assert that the trend label is present in the document
    expect(screen.getByText('vs. Last Month')).toBeInTheDocument();
  });

  it('should not display the trend indicator when showTrend is false', () => {
    // LD1: Render the MetricCard component with showTrend set to false
    renderWithProviders(<MetricCard label="Test Metric" value={150} previousValue={100} showTrend={false} />);

    // LD2: Assert that the trend indicator is not present in the document
    expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument();
    expect(screen.queryByText('50.0%')).not.toBeInTheDocument();
  });

  it('should invert the trend colors when invertTrendColors is true', () => {
    // LD1: Render the MetricCard component with invertTrendColors set to true
    const { container } = renderWithProviders(<MetricCard label="Test Metric" value={50} previousValue={100} invertTrendColors={true} />);

    // LD2: Assert that the trend-inverted class is applied to the trend indicator
    expect(container.querySelector('.metric-card-trend')).toHaveClass('trend-inverted');
  });
});