import React from 'react'; // react ^18.2.0
import { render, screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import PieChart from './PieChart';
import { renderWithProviders } from '../../../utils/test.utils';
import jest from 'jest'; // jest ^29.5.0

// Mock data for the PieChart component
const mockPieData = {
  labels: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER'],
  datasets: [
    {
      label: 'Refund Method Distribution',
      data: [75, 20, 5],
      backgroundColor: ['#4f46e5', '#059669', '#f59e0b'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 2,
      hoverOffset: 4,
    },
  ],
};

// Mock options for the PieChart component
const mockOptions = {
  plugins: {
    legend: {
      position: 'right',
      labels: {
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.formattedValue}%`,
      },
    },
  },
};

// Mock Chart.js if needed since it's a canvas-based library
beforeEach(() => {
  // Reset any mocks or test state between tests
  jest.clearAllMocks();
});

describe('PieChart Component', () => {
  test('renders the PieChart component with data and options', async () => {
    // Render PieChart with specific props
    renderWithProviders(<PieChart data={mockPieData} options={mockOptions} />);

    // Query rendered elements using screen
    const chartElement = screen.getByRole('img', { name: 'chart' });

    // Verify component renders correctly
    expect(chartElement).toBeInTheDocument();

    // Check for chart elements like legends
    const legendElement = screen.getByText('ORIGINAL_PAYMENT');
    expect(legendElement).toBeInTheDocument();
  });

  test('renders the PieChart component with custom height and width', async () => {
    // Render PieChart with specific props
    renderWithProviders(<PieChart data={mockPieData} options={mockOptions} height={400} width={600} />);

    // Query rendered elements using screen
    const chartContainer = screen.getByRole('img', { name: 'chart' }).closest('div');

    // Verify the chart container has appropriate dimensions when height/width props are provided
    expect(chartContainer).toHaveAttribute('style', 'height: 400px; width: 600px;');
  });

  test('renders the PieChart component with different color and styling options', async () => {
    // Mock data with custom colors
    const customPieData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        {
          label: 'Custom Data',
          data: [30, 40, 30],
          backgroundColor: ['red', 'green', 'blue'],
          borderColor: ['black', 'black', 'black'],
          borderWidth: 5,
          hoverOffset: 15,
        },
      ],
    };

    // Render PieChart with specific props
    renderWithProviders(<PieChart data={customPieData} />);

    // Query rendered elements using screen
    const chartElement = screen.getByRole('img', { name: 'chart' });

    // Verify component renders correctly
    expect(chartElement).toBeInTheDocument();
  });

  test('renders the PieChart component with empty data sets', async () => {
    // Mock data with empty datasets
    const emptyPieData = {
      labels: [],
      datasets: [
        {
          label: 'Empty Data',
          data: [],
          backgroundColor: [],
          borderColor: [],
        },
      ],
    };

    // Render PieChart with specific props
    renderWithProviders(<PieChart data={emptyPieData} />);

    // Query rendered elements using screen
    const chartElement = screen.queryByRole('img', { name: 'chart' });

    // Verify handling of empty data sets
    expect(chartElement).not.toBeInTheDocument();
  });
});