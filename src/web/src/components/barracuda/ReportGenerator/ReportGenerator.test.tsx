import React from 'react'; // react version ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'; // @jest/globals ^29.5.0
import { ReportGenerator } from './ReportGenerator';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { ReportType, ParameterType, OutputFormat } from '../../../types/report.types';

// Mock report definitions for testing
const mockReportDefinitions = () => {
  return [
    {
      id: '1',
      type: ReportType.REFUND_SUMMARY,
      name: 'Refund Summary Report',
      description: 'Provides a summary of refund activity',
      parameters: [
        { name: 'dateRange', type: ParameterType.DATERANGE, label: 'Date Range', required: true },
        { name: 'merchantId', type: ParameterType.STRING, label: 'Merchant ID', required: false },
      ],
      dataSource: 'refund_db',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      type: ReportType.PAYMENT_METHOD_ANALYSIS,
      name: 'Payment Method Analysis',
      description: 'Analyzes refund distribution by payment method',
      parameters: [
        { name: 'startDate', type: ParameterType.DATE, label: 'Start Date', required: true },
        { name: 'endDate', type: ParameterType.DATE, label: 'End Date', required: true },
        { name: 'paymentMethod', type: ParameterType.MULTISELECT, label: 'Payment Methods', required: false },
      ],
      dataSource: 'payment_db',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
  ];
};

// Mock report result for testing
const mockReportResult = () => {
  return {
    executionId: 'exec-123',
    reportName: 'Refund Summary Report',
    parameters: { dateRange: '2023-01-01 - 2023-01-31', merchantId: 'all' },
    generatedAt: '2023-05-02T10:00:00.000Z',
    data: [{ merchant: 'Test Merchant', totalRefunds: 150, totalAmount: 7500 }],
    headers: ['Merchant', 'Total Refunds', 'Total Amount'],
    rows: [['Test Merchant', 150, 7500]],
    visualizations: [{ type: 'table', title: 'Refund Summary', data: {} }],
  };
};

// Helper function to set up the component for testing
const setup = (props: any = {}) => {
  const user = setupUserEvent();
  const mockProps = {
    merchantId: 'test-merchant',
    ...props,
  };

  const { ...utils } = renderWithProviders(<ReportGenerator {...mockProps} />);
  return {
    user,
    ...utils,
  };
};

describe('ReportGenerator', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
  });

  it('should render the component', () => {
    const { container } = setup();
    expect(container).toBeInTheDocument();
  });

  it('should display report types in the select dropdown', async () => {
    const { store } = setup();
    store.dispatch({ type: 'report/setReports', payload: mockReportDefinitions() });
    await waitFor(() => {
      expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    });
    mockReportDefinitions().forEach(report => {
      expect(screen.getByText(report.name)).toBeInTheDocument();
    });
  });

  it('should display report parameters when a report type is selected', async () => {
    const { store, user } = setup();
    store.dispatch({ type: 'report/setReports', payload: mockReportDefinitions() });
    await waitFor(() => {
      expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Report Type'), 'Refund Summary Report');
    await waitFor(() => {
      expect(screen.getByText('Report Parameters')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
    });
  });

  it('should call generateReport when the Generate Report button is clicked', async () => {
    const { store, user } = setup();
    store.dispatch({ type: 'report/setReports', payload: mockReportDefinitions() });
    const generateReportMock = jest.fn();
    store.dispatch = generateReportMock;

    await waitFor(() => {
      expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Report Type'), 'Refund Summary Report');
    await waitFor(() => {
      expect(screen.getByText('Report Parameters')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Generate Report'));
    expect(generateReportMock).toHaveBeenCalled();
  });

  it('should display report results when a report is generated', async () => {
    const { store, user } = setup();
    store.dispatch({ type: 'report/setReports', payload: mockReportDefinitions() });
    store.dispatch({ type: 'report/setReportResult', payload: mockReportResult() });

    await waitFor(() => {
      expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Report Type'), 'Refund Summary Report');
    await waitFor(() => {
      expect(screen.getByText('Report Parameters')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Generate Report'));
    await waitFor(() => {
      expect(screen.getByText('Report Results')).toBeInTheDocument();
    });
  });

  it('should call exportReport when the Export button is clicked', async () => {
    const { store, user } = setup();
    store.dispatch({ type: 'report/setReports', payload: mockReportDefinitions() });
    store.dispatch({ type: 'report/setReportResult', payload: mockReportResult() });
    const exportReportMock = jest.fn();
    store.dispatch = exportReportMock;

    await waitFor(() => {
      expect(screen.getByLabelText('Report Type')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Report Type'), 'Refund Summary Report');
    await waitFor(() => {
      expect(screen.getByText('Report Parameters')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Generate Report'));
    await waitFor(() => {
      expect(screen.getByText('Report Results')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Export'));
    expect(exportReportMock).toHaveBeenCalled();
  });

  it('should open the scheduling modal when the Schedule Report button is clicked', async () => {
    const { user } = setup();
    const scheduleReportButton = screen.getByText('Schedule Report');
    await user.click(scheduleReportButton);
    const modalTitle = await screen.findByText('Schedule Report');
    expect(modalTitle).toBeVisible();
  });
});