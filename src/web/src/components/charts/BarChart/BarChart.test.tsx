import React from 'react'; // ^18.2.0
import { render, screen, waitFor } from '@testing-library/react'; // ^14.0.0
import BarChart from './BarChart';
import { renderWithProviders } from '../../../utils/test.utils';
import jest from 'jest'; // ^29.5.0

// Mock data for testing
const mockBarData = [
  { category: 'Apr 18', refunds: 45, amount: 4500, approvalRate: 92 },
  { category: 'Apr 25', refunds: 52, amount: 6200, approvalRate: 95 },
  { category: 'May 02', refunds: 48, amount: 5100, approvalRate: 90 },
  { category: 'May 09', refunds: 60, amount: 7500, approvalRate: 97 },
];

// Mock configuration for testing
const mockBarConfig = {
  bars: [
    { dataKey: 'refunds', name: 'Refund Count', color: '#4f46e5' },
    { dataKey: 'amount', name: 'Refund Amount', color: '#059669' },
    { dataKey: 'approvalRate', name: 'Approval Rate (%)', color: '#f59e0b' },
  ],
};

describe('BarChart Component', () => {
  beforeEach(() => {
    // Reset any mocks or test state between tests
    jest.clearAllMocks();
  });

  it('renders correctly with data and configuration', () => {
    // Render BarChart with specific props
    renderWithProviders(
      <BarChart
        title="Refund Analysis"
        data={mockBarData}
        xAxisDataKey="category"
        bars={mockBarConfig.bars}
      />
    );

    // Query rendered elements using screen
    const titleElement = screen.getByText('Refund Analysis');
    const chartContainer = screen.getByTestId('bar-chart-container');

    // Verify component renders correctly
    expect(titleElement).toBeInTheDocument();
    expect(chartContainer).toBeInTheDocument();

    // Check for chart elements like title, axes, bars
    expect(screen.getByText('Apr 18')).toBeInTheDocument();
    expect(screen.getByText('Refund Count')).toBeInTheDocument();
  });

  it('displays loading spinner when loading prop is true', () => {
    // Render BarChart with loading prop set to true
    renderWithProviders(
      <BarChart
        title="Refund Analysis"
        data={mockBarData}
        xAxisDataKey="category"
        bars={mockBarConfig.bars}
        loading={true}
      />
    );

    // Verify loading spinner displays when loading prop is true
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
  });

  it('displays empty message when data is empty', () => {
    // Render BarChart with empty data array
    renderWithProviders(
      <BarChart
        title="Refund Analysis"
        data={[]}
        xAxisDataKey="category"
        bars={mockBarConfig.bars}
        emptyMessage="No refunds data available"
      />
    );

    // Verify empty message displays when data is empty
    const emptyMessageElement = screen.getByText('No refunds data available');
    expect(emptyMessageElement).toBeInTheDocument();
  });
});