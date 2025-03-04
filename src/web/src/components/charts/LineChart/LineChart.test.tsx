import React from 'react'; // ^18.2.0
import { render, screen, waitFor } from '@testing-library/react'; // ^14.0.0
import LineChart from './LineChart'; // Component under test
import { renderWithProviders } from '../../../utils/test.utils'; // Utility for rendering components with required providers in tests
import { mockTimeSeriesData, mockSeriesConfig } from './LineChart.test.data'; // Mock data for testing
import jest from 'jest'; // Testing framework for running tests and mocking dependencies

// Mock data for testing
const mockTimeSeriesData = [
  { date: '2023-04-18', refundVolume: 45000, processingTime: 2.3, successRate: 92 },
  { date: '2023-04-25', refundVolume: 52000, processingTime: 2.1, successRate: 95 },
  { date: '2023-05-02', refundVolume: 48000, processingTime: 2.5, successRate: 90 },
  { date: '2023-05-09', refundVolume: 60000, processingTime: 1.9, successRate: 97 },
];

const mockSeriesConfig = [
  { dataKey: 'refundVolume', name: 'Refund Volume', color: '#4f46e5', format: 'currency' },
  { dataKey: 'processingTime', name: 'Processing Time (days)', color: '#059669', format: 'number' },
  { dataKey: 'successRate', name: 'Success Rate', color: '#f59e0b', format: 'percentage' },
];

describe('LineChart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the line chart with provided data and series configuration', async () => {
    renderWithProviders(<LineChart data={mockTimeSeriesData} series={mockSeriesConfig} title="Refund Trends" />);

    // Verify title is rendered
    expect(screen.getByText('Refund Trends')).toBeInTheDocument();

    // Verify chart elements are present (axes, lines, etc.)
    expect(screen.getByText('Refund Volume')).toBeInTheDocument();
    expect(screen.getByText('Processing Time (days)')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();

    // Wait for the chart to fully render
    await waitFor(() => {
      expect(screen.queryAllByRole('img')).toHaveLength(0); // Ensure no loading spinner
    });
  });

  it('displays a loading spinner when the loading prop is true', () => {
    renderWithProviders(<LineChart data={mockTimeSeriesData} series={mockSeriesConfig} loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument(); // Check for loading spinner
  });

  it('displays an empty state message when the data prop is empty', () => {
    renderWithProviders(<LineChart data={[]} series={mockSeriesConfig} emptyStateMessage="No refund data available" />);
    expect(screen.getByText('No refund data available')).toBeInTheDocument(); // Check for empty state message
  });

  it('renders with custom height and width', () => {
    renderWithProviders(<LineChart data={mockTimeSeriesData} series={mockSeriesConfig} height={400} width={600} />);
    const chartContainer = screen.getByTestId('line-chart-container');
    expect(chartContainer).toHaveStyle('height: 400px');
    expect(chartContainer).toHaveStyle('width: 600px');
  });

  it('renders with a custom class name', () => {
    renderWithProviders(<LineChart data={mockTimeSeriesData} series={mockSeriesConfig} className="custom-chart" />);
    const chartContainer = screen.getByTestId('line-chart-container');
    expect(chartContainer).toHaveClass('custom-chart');
  });

  it('renders with custom tooltip content', async () => {
    renderWithProviders(<LineChart data={mockTimeSeriesData} series={mockSeriesConfig} />);

    // Simulate hover over a data point (implementation detail, may need adjustment)
    // This is a placeholder, actual hover simulation depends on Recharts implementation
    // For example, you might need to dispatch a mouse event on a specific chart element

    await waitFor(() => {
      // After hover, check for tooltip elements
      expect(screen.getByText('$45,000')).toBeInTheDocument(); // Check for formatted currency value
      expect(screen.getByText('2.3')).toBeInTheDocument(); // Check for number value
      expect(screen.getByText('92.00%')).toBeInTheDocument(); // Check for percentage value
    });
  });
});