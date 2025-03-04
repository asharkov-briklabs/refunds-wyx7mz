import React from 'react'; // react ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import DashboardsPage from './DashboardsPage';
import { DashboardData } from '../../../types/report.types';
import { TimeFrame } from '../../../types/common.types';

// Mock the useReport hook to control its behavior in tests
jest.mock('../../../hooks/useReport', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Creating a DashboardData object with refund metrics, volume data, method distribution, and other required testing data
const mockDashboardData: DashboardData = {
  timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
  summary: {
    totalRefunds: { name: 'Total Refunds', value: 100, format: 'number' },
    totalAmount: { name: 'Total Amount', value: 5000, format: 'currency' },
  },
  widgets: [],
};

describe('DashboardsPage component', () => {
  let renderResult: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (renderResult) {
      renderResult.unmount();
    }
  });

  it('should render the dashboard page with loading state', async () => {
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: true,
      getDashboardData: jest.fn(),
    });

    renderResult = renderWithProviders(<DashboardsPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Dashboards')).toBeInTheDocument();
  });

  it('should render the overview dashboard when data is loaded', async () => {
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: false,
      dashboardData: mockDashboardData,
      getDashboardData: jest.fn(),
    });

    renderResult = renderWithProviders(<DashboardsPage />);
    await waitForComponentToPaint(renderResult);

    expect(screen.getByText('RefundDashboard')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch between dashboard tabs', async () => {
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: false,
      dashboardData: mockDashboardData,
      getDashboardData: jest.fn(),
    });

    renderResult = renderWithProviders(<DashboardsPage />);
    const user = setupUserEvent();
    await waitForComponentToPaint(renderResult);

    await user.click(screen.getByRole('tab', { name: 'Analytics' }));
    expect(screen.getByText('RefundAnalytics')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByText('RefundDashboard')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('should update date range and refetch data', async () => {
    const getDashboardDataMock = jest.fn();
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: false,
      dashboardData: mockDashboardData,
      getDashboardData: getDashboardDataMock,
    });

    renderResult = renderWithProviders(<DashboardsPage />);
    const user = setupUserEvent();
    await waitForComponentToPaint(renderResult);

    const dateRangeSelector = screen.getByLabelText('Time Period');
    await act(async () => {
      await user.selectOptions(dateRangeSelector, 'Last 90 Days');
    });

    expect(getDashboardDataMock).toHaveBeenCalledTimes(1);
    expect(getDashboardDataMock).toHaveBeenCalledWith(expect.objectContaining({
      timeRange: expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String)
      })
    }));
  });

  it('should update merchant selection and refetch data', async () => {
    const getDashboardDataMock = jest.fn();
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: false,
      dashboardData: mockDashboardData,
      getDashboardData: getDashboardDataMock,
    });

    renderResult = renderWithProviders(<DashboardsPage />);
    const user = setupUserEvent();
    await waitForComponentToPaint(renderResult);

    const merchantSelector = screen.getByLabelText('Select a merchant');
    await act(async () => {
      await user.selectOptions(merchantSelector, 'Test Merchant');
    });

    expect(getDashboardDataMock).toHaveBeenCalledTimes(1);
    expect(getDashboardDataMock).toHaveBeenCalledWith(expect.objectContaining({
      merchantId: 'test-merchant-id'
    }));
  });

  it('should toggle comparison with previous period', async () => {
    const getDashboardDataMock = jest.fn();
    require('../../../hooks/useReport').default.mockReturnValue({
      loading: false,
      dashboardData: mockDashboardData,
      getDashboardData: getDashboardDataMock,
    });

    renderResult = renderWithProviders(<DashboardsPage />);
    const user = setupUserEvent();
    await waitForComponentToPaint(renderResult);

    const toggleButton = screen.getByRole('button', { name: /Compare with Previous Period/i });
    await act(async () => {
      await user.click(toggleButton);
    });

    expect(getDashboardDataMock).toHaveBeenCalledTimes(1);
    expect(getDashboardDataMock).toHaveBeenCalledWith(expect.objectContaining({
      compareWithPrevious: true
    }));
  });
});