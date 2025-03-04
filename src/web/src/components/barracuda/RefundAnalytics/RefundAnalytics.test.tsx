import React from 'react'; // react ^18.2.0
import { screen, waitFor, within, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { vi } from 'vitest'; // vitest ^0.34.3

import RefundAnalytics from './RefundAnalytics';
import { renderWithProviders, waitForComponentToPaint } from '../../../utils/test.utils';
import { TimeFrame, DateRange } from '../../../types/common.types';

/**
 * Sets up mock data for testing the RefundAnalytics component
 * @returns {object} Mock data for refund metrics and charts
 */
const setupMockData = () => {
  // Create mock metrics data with volume, amount, success rate, and processing time
  const mockMetrics = {
    metrics: {
      totalVolume: { value: 150, previousValue: 120 },
      totalAmount: { value: 7500, previousValue: 6000 },
      successRate: { value: 0.95, previousValue: 0.92 },
      averageProcessingTime: { value: 2.5, previousValue: 2.8 },
    },
    trends: {
      refundVolume: [
        { date: '2023-01-01', amount: 100 },
        { date: '2023-01-08', amount: 120 },
        { date: '2023-01-15', amount: 150 },
      ],
    },
    distributions: {
      refundMethod: [
        { method: 'Credit Card', percentage: 0.7 },
        { method: 'Balance', percentage: 0.2 },
        { method: 'Other', percentage: 0.1 },
      ],
      refundStatus: [
        { status: 'Completed', percentage: 0.8 },
        { status: 'Processing', percentage: 0.15 },
        { status: 'Failed', percentage: 0.05 },
      ],
    },
  };

  // Create mock time series data for trend charts
  const mockTimeSeriesData = [
    { date: '2023-01-01', value: 100 },
    { date: '2023-01-08', value: 120 },
    { date: '2023-01-15', value: 150 },
  ];

  // Create mock distribution data for method and status charts
  const mockDistributionData = [
    { category: 'A', value: 50 },
    { category: 'B', value: 30 },
    { category: 'C', value: 20 },
  ];

  // Return a comprehensive mock data object for testing
  return {
    metrics: mockMetrics,
    timeSeriesData: mockTimeSeriesData,
    distributionData: mockDistributionData,
  };
};

/**
 * Sets up a mock implementation for the useReport hook
 * @param {object} mockData
 * @returns {void} No return value
 */
const setupUseReportMock = (mockData: any) => {
  // Mock the useReport hook to return controlled test data
  jest.mock('../../../hooks/useReport', () => ({
    __esModule: true,
    default: () => ({
      refundMetrics: mockData.metrics,
      loading: false,
      error: null,
      getRefundMetrics: vi.fn(),
    }),
  }));
};

describe('RefundAnalytics component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component with providers
    const { container } = renderWithProviders(<RefundAnalytics />);

    // Wait for the component to render without errors
    await waitForComponentToPaint({ container });

    // Component should be in the document
    expect(container).toBeInTheDocument();
  });

  it('displays loading spinner when data is loading', () => {
    // Mock the useReport hook with loading state true
    jest.mock('../../../hooks/useReport', () => ({
      __esModule: true,
      default: () => ({
        refundMetrics: null,
        loading: true,
        error: null,
        getRefundMetrics: vi.fn(),
      }),
    }));

    // Render the RefundAnalytics component
    renderWithProviders(<RefundAnalytics />);

    // Check for the presence of a loading spinner
    expect(screen.getByRole('status')).toBeVisible();
  });

  it('displays error message when there is an error', () => {
    // Mock the useReport hook with an error state
    jest.mock('../../../hooks/useReport', () => ({
      __esModule: true,
      default: () => ({
        refundMetrics: null,
        loading: false,
        error: 'Failed to fetch data',
        getRefundMetrics: vi.fn(),
      }),
    }));

    // Render the RefundAnalytics component
    renderWithProviders(<RefundAnalytics />);

    // Check for the presence of an error message
    expect(screen.getByText('Failed to fetch data')).toBeVisible();
  });

  it('renders metric cards with correct data', async () => {
    // Set up mock data with specific metric values
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component
    renderWithProviders(<RefundAnalytics />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics />));

    // Check that metric cards display the correct values
    expect(screen.getByText('$7,500.00')).toBeVisible();
    expect(screen.getByText('150')).toBeVisible();
    expect(screen.getByText('95.0%')).toBeVisible();
    expect(screen.getByText('2.5')).toBeVisible();
  });

  it('renders chart components when data is available', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component
    renderWithProviders(<RefundAnalytics />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics />));

    // Check for the presence of chart components
    expect(screen.getByText('Refund Trends')).toBeVisible();
  });

  it('changes tab content when tab is clicked', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component
    const { container } = renderWithProviders(<RefundAnalytics />);

    // Wait for the component to render
    await waitForComponentToPaint({ container });

    // Overview tab should be active by default
    expect(screen.getByText('Refund Trends')).toBeVisible();

    // Simulate click on Trends tab
    fireEvent.click(screen.getByRole('tab', { name: 'Trends' }));

    // After clicking Trends tab, trends content should be visible
    expect(screen.getByText('Refund Trends Over Time')).toBeVisible();

    // Simulate click on Methods tab
    fireEvent.click(screen.getByRole('tab', { name: 'Methods' }));

    // After clicking Methods tab, methods content should be visible
    expect(screen.getByText('Refund Distribution by Payment Method')).toBeVisible();

    // Simulate click on Status tab
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));

    // After clicking Status tab, status content should be visible
    expect(screen.getByText('Charts showing distribution by refund status')).toBeVisible();
  });

  it('calls getRefundMetrics when date range changes', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Create a mock getRefundMetrics function
    const getRefundMetricsMock = vi.fn();

    // Mock the useReport hook with the mock function
    jest.mock('../../../hooks/useReport', () => ({
      __esModule: true,
      default: () => ({
        refundMetrics: mockData.metrics,
        loading: false,
        error: null,
        getRefundMetrics: getRefundMetricsMock,
      }),
    }));

    // Render the RefundAnalytics component
    renderWithProviders(<RefundAnalytics />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics />));

    // getRefundMetrics should be called exactly once on initial render
    expect(getRefundMetricsMock).toHaveBeenCalledTimes(1);

    // Simulate date range change
    fireEvent.click(screen.getByLabelText('Open datepicker'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('7'));

    // getRefundMetrics should be called with new date range after change
    expect(getRefundMetricsMock).toHaveBeenCalledTimes(2);
  });

  it('calls getRefundMetrics when merchant selection changes', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Create a mock getRefundMetrics function
    const getRefundMetricsMock = vi.fn();

    // Mock the useReport hook with the mock function
    jest.mock('../../../hooks/useReport', () => ({
      __esModule: true,
      default: () => ({
        refundMetrics: mockData.metrics,
        loading: false,
        error: null,
        getRefundMetrics: getRefundMetricsMock,
      }),
    }));

    // Render the RefundAnalytics component with merchantSelector enabled
    renderWithProviders(<RefundAnalytics showMerchantSelector />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics showMerchantSelector />));

    // Simulate merchant selection change
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'new-merchant-id' } });

    // getRefundMetrics should be called with new merchant ID after change
    expect(getRefundMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'new-merchant-id',
      })
    );
  });

  it('respects allowedTabs prop to display only specified tabs', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component with allowedTabs=['overview', 'trends']
    renderWithProviders(<RefundAnalytics allowedTabs={['overview', 'trends']} />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics allowedTabs={['overview', 'trends']} />));

    // Check for presence of specified tabs and absence of others
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Trends' })).toBeVisible();
    expect(screen.queryByRole('tab', { name: 'Methods' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Status' })).toBeNull();
  });

  it('respects showMerchantSelector prop to hide merchant selector', () => {
    // Set up mock data
    const mockData = setupMockData();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component with showMerchantSelector={false}
    renderWithProviders(<RefundAnalytics showMerchantSelector={false} />);

    // Check that merchant selector is not rendered
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('calls onDateRangeChange callback when date range changes', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Create a mock onDateRangeChange callback
    const onDateRangeChangeMock = vi.fn();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component with the callback
    renderWithProviders(<RefundAnalytics onDateRangeChange={onDateRangeChangeMock} />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics onDateRangeChange={onDateRangeChangeMock} />));

    // Simulate date range change
    fireEvent.click(screen.getByLabelText('Open datepicker'));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('7'));

    // onDateRangeChange should be called with the new date range
    expect(onDateRangeChangeMock).toHaveBeenCalled();
  });

  it('calls onMerchantChange callback when merchant selection changes', async () => {
    // Set up mock data
    const mockData = setupMockData();

    // Create a mock onMerchantChange callback
    const onMerchantChangeMock = vi.fn();

    // Mock the useReport hook
    setupUseReportMock(mockData);

    // Render the RefundAnalytics component with the callback
    renderWithProviders(<RefundAnalytics showMerchantSelector onMerchantChange={onMerchantChangeMock} />);

    // Wait for the component to render
    await waitForComponentToPaint(renderWithProviders(<RefundAnalytics showMerchantSelector onMerchantChange={onMerchantChangeMock} />));

    // Simulate merchant selection change
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'new-merchant-id' } });

    // onMerchantChange should be called with the new merchant ID
    expect(onMerchantChangeMock).toHaveBeenCalledWith('new-merchant-id');
  });
});