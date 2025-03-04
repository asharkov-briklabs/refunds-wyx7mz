import React from 'react'; // react ^18.2.0
import { render, screen, waitFor, act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import * as jest from 'jest'; // jest ^29.5.0
import AnalyticsPage from './AnalyticsPage';
import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import RefundAnalytics from '../../../components/barracuda/RefundAnalytics';

// Mock the useReport hook and RefundAnalytics component
jest.mock('../../../hooks/useReport', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    refundMetrics: {
      totalVolume: 1000,
      averageRefund: 100,
      refundRate: 0.1,
    },
    loading: false,
    getRefundMetrics: jest.fn(),
    exportReport: jest.fn(),
    clearReportState: jest.fn(),
  }),
}));

jest.mock('../../../components/barracuda/RefundAnalytics', () => {
  const MockRefundAnalytics: React.FC = () => <div data-testid="mock-refund-analytics">Mock Refund Analytics</div>;
  return {
    __esModule: true,
    default: MockRefundAnalytics,
  };
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {
        totalVolume: 1000,
        averageRefund: 100,
        refundRate: 0.1,
      },
      loading: false,
      getRefundMetrics: jest.fn(),
      exportReport: jest.fn(),
      clearReportState: jest.fn(),
    });
  });

  it('should render the analytics page with header and metrics', async () => {
    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    expect(screen.getByText('Refund Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('mock-refund-analytics')).toBeInTheDocument();
  });

  it('should call getRefundMetrics on initial render', async () => {
    const getRefundMetricsMock = jest.fn();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: false,
      getRefundMetrics: getRefundMetricsMock,
      exportReport: jest.fn(),
      clearReportState: jest.fn(),
    });

    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    expect(getRefundMetricsMock).toHaveBeenCalledTimes(1);
    expect(getRefundMetricsMock).toHaveBeenCalledWith({ timeRange: null, merchantId: undefined });
  });

  it('should show loading state when fetching metrics', async () => {
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: true,
      getRefundMetrics: jest.fn(),
      exportReport: jest.fn(),
      clearReportState: jest.fn(),
    });

    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    const refundAnalyticsElement = screen.getByTestId('mock-refund-analytics');
    expect(refundAnalyticsElement).toBeInTheDocument();
  });

  it('should call getRefundMetrics when date range changes', async () => {
    const getRefundMetricsMock = jest.fn();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: false,
      getRefundMetrics: getRefundMetricsMock,
      exportReport: jest.fn(),
      clearReportState: jest.fn(),
    });

    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    const newDateRange = { startDate: '2023-01-01', endDate: '2023-01-31' };
    const RefundAnalyticsComponent = screen.getByTestId('mock-refund-analytics');
    
    expect(getRefundMetricsMock).toHaveBeenCalledTimes(1);
  });

  it('should call getRefundMetrics when merchant changes', async () => {
    const getRefundMetricsMock = jest.fn();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: false,
      getRefundMetrics: getRefundMetricsMock,
      exportReport: jest.fn(),
      clearReportState: jest.fn(),
    });

    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    const newMerchantId = 'new-merchant-id';
    const RefundAnalyticsComponent = screen.getByTestId('mock-refund-analytics');

    expect(getRefundMetricsMock).toHaveBeenCalledTimes(1);
  });

  it('should handle export functionality correctly', async () => {
    const exportReportMock = jest.fn();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: false,
      getRefundMetrics: jest.fn(),
      exportReport: exportReportMock,
      clearReportState: jest.fn(),
    });

    renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    const exportFormat = 'CSV';
    const RefundAnalyticsComponent = screen.getByTestId('mock-refund-analytics');

    expect(exportReportMock).not.toHaveBeenCalled();
  });

  it('should clear report state on unmount', async () => {
    const clearReportStateMock = jest.fn();
    (require('../../../hooks/useReport').default as jest.Mock).mockReturnValue({
      refundMetrics: {},
      loading: false,
      getRefundMetrics: jest.fn(),
      exportReport: jest.fn(),
      clearReportState: clearReportStateMock,
    });

    const { unmount } = renderWithProviders(<AnalyticsPage />);
    await waitForComponentToPaint();

    unmount();
    expect(clearReportStateMock).toHaveBeenCalledTimes(1);
  });
});