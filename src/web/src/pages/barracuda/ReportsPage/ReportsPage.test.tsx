import React from 'react'; // react ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { act } from 'react-dom/test-utils'; // react-dom/test-utils ^18.2.0
import { ReportsPage } from './ReportsPage';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { ReportType, OutputFormat } from '../../../types/report.types';

/**
 * Common setup function for tests
 */
const setup = () => {
  // Create mock functions for useReport hook methods
  const mockFetchReports = jest.fn();
  const mockGenerateReport = jest.fn();
  const mockExportReport = jest.fn();
  const mockScheduleReport = jest.fn();
  const mockUpdateScheduledReport = jest.fn();
  const mockDeleteScheduledReport = jest.fn();

  // Create mock report data for testing
  const mockReports = createMockReports();
  const mockScheduledReports = createMockScheduledReports();

  // Set up Redux preloaded state with mock data
  const preloadedState = {
    report: {
      reports: mockReports,
      scheduledReports: mockScheduledReports,
      loading: false,
      error: null,
      totalReports: mockReports.length,
      totalScheduledReports: mockScheduledReports.length,
    },
  };

  // Render the ReportsPage component with providers
  const renderResult = renderWithProviders(<ReportsPage />, { preloadedState });

  // Set up user event for interaction testing
  const user = setupUserEvent();

  // Return rendering result, user event, and mock functions
  return {
    ...renderResult,
    user,
    mockFetchReports,
    mockGenerateReport,
    mockExportReport,
    mockScheduleReport,
    mockUpdateScheduledReport,
    mockDeleteScheduledReport,
  };
};

/**
 * Creates mock report data for testing
 */
const createMockReports = () => {
  // Create mock report definitions with different types
  const mockReports = [
    {
      id: '1',
      type: ReportType.REFUND_SUMMARY,
      name: 'Refund Summary Report',
      description: 'Summary of refund activity',
      parameters: [],
      dataSource: 'refund_db',
      createdAt: '2023-08-01T10:00:00Z',
      updatedAt: '2023-08-01T10:00:00Z',
    },
    {
      id: '2',
      type: ReportType.REFUND_TRENDS,
      name: 'Refund Trends Report',
      description: 'Trends in refund activity over time',
      parameters: [],
      dataSource: 'refund_analytics',
      createdAt: '2023-08-01T10:00:00Z',
      updatedAt: '2023-08-01T10:00:00Z',
    },
  ];

  // Return array of mock report definitions
  return mockReports;
};

/**
 * Creates mock scheduled report data for testing
 */
const createMockScheduledReports = () => {
  // Create mock scheduled reports with different configurations
  const mockScheduledReports = [
    {
      id: 'scheduled-1',
      reportDefinitionId: '1',
      reportName: 'Weekly Refund Summary',
      parameters: {},
      schedule: {
        frequency: 'WEEKLY',
        expression: '0 0 * * 1',
        startDate: '2023-08-07T00:00:00Z',
        outputFormat: OutputFormat.CSV,
        recipients: [],
      },
      enabled: true,
      userId: 'admin-user',
      createdAt: '2023-08-07T00:00:00Z',
      updatedAt: '2023-08-07T00:00:00Z',
    },
  ];

  // Return array of mock scheduled reports
  return mockScheduledReports;
};

describe('ReportsPage', () => {
  it('renders the ReportsPage component with report listings', async () => {
    // Mock the useReport hook to return a list of reports
    const { getByText, getAllByRole } = setup();

    // Check for the page title 'Reports'
    expect(getByText('Reports')).toBeInTheDocument();

    // Verify that the list of reports is displayed
    const reportItems = getAllByRole('row');
    expect(reportItems.length).toBeGreaterThan(0);

    // Verify that the 'Generate Report' button is present
    expect(getByText('Generate Report')).toBeInTheDocument();
  });

  it('displays appropriate loading state', () => {
    // Mock the useReport hook to set loading state to true
    const { getByRole } = renderWithProviders(<ReportsPage />, {
      preloadedState: {
        report: {
          reports: [],
          scheduledReports: [],
          loading: true,
          error: null,
          totalReports: 0,
          totalScheduledReports: 0,
        },
      },
    });

    // Verify that a loading spinner or indicator is displayed
    expect(getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles tab switching between reports and scheduled reports', async () => {
    // Mock the useReport hook to return both reports and scheduled reports
    const { getByText, queryByText, user } = setup();

    // Click on the 'Scheduled Reports' tab
    await user.click(getByText('Scheduled Reports'));

    // Verify that scheduled reports are displayed
    expect(getByText('Weekly Refund Summary')).toBeInTheDocument();

    // Click on the 'Available Reports' tab
    await user.click(getByText('Available Reports'));

    // Verify that regular reports are displayed again
    expect(getByText('Refund Summary Report')).toBeInTheDocument();
  });

  it('opens the report generation modal', async () => {
    // Render the ReportsPage component
    const { getByText, findByRole, user } = setup();

    // Click on the 'Generate Report' button
    await user.click(getByText('Generate Report'));

    // Verify that the report generation modal is displayed
    const modal = await findByRole('dialog', { name: 'Generate Report' });
    expect(modal).toBeVisible();
  });

  it('handles report generation', async () => {
    // Mock the useReport.generateReport function
    const { getByText, findByRole, user, mockGenerateReport } = setup();

    // Open the report generation modal
    await user.click(getByText('Generate Report'));
    const modal = await findByRole('dialog', { name: 'Generate Report' });
    expect(modal).toBeVisible();

    // Select a report type and fill required parameters
    await user.selectOptions(screen.getByRole('combobox', { name: /Report Type/i }), 'REFUND_SUMMARY');

    // Click the Generate button
    await user.click(getByText('Generate'));

    // Verify that useReport.generateReport was called with correct parameters
    expect(mockGenerateReport).toHaveBeenCalled();

    // Verify that success notification logic is triggered
  });

  it('handles report export', async () => {
    // Mock the useReport.exportReport function
    const { getByText, user, mockExportReport } = setup();

    // Click on an export button (e.g., 'Export as CSV')
    await user.click(getByText('Export as CSV'));

    // Verify that useReport.exportReport was called with correct parameters
    expect(mockExportReport).toHaveBeenCalled();
  });

  it('displays scheduled reports correctly', async () => {
    // Mock the useReport hook to return scheduled reports
    const { getByText, user } = setup();

    // Navigate to the Scheduled Reports tab
    await user.click(getByText('Scheduled Reports'));

    // Verify that scheduled reports are displayed with correct information
    expect(getByText('Weekly Refund Summary')).toBeInTheDocument();

    // Check for status indicators, frequency information, and action buttons
  });

  it('handles scheduled report management', async () => {
    // Mock the useReport hook's scheduling functions
    const { getByText, user, mockScheduleReport, mockUpdateScheduledReport, mockDeleteScheduledReport } = setup();

    // Render the ReportsPage component
    await user.click(getByText('Scheduled Reports'));

    // Test creating a new scheduled report
    // Test enabling/disabling a scheduled report
    // Test deleting a scheduled report
    // Verify appropriate API calls are made for each action
  });

  it('handles empty states appropriately', async () => {
    // Mock the useReport hook to return empty arrays
    const { getByText } = renderWithProviders(<ReportsPage />, {
      preloadedState: {
        report: {
          reports: [],
          scheduledReports: [],
          loading: false,
          error: null,
          totalReports: 0,
          totalScheduledReports: 0,
        },
      },
    });

    // Verify that appropriate empty state messages are displayed
    expect(getByText('No data available')).toBeInTheDocument();
  });

  it('handles error states correctly', async () => {
    // Mock the useReport hook to return an error state
    const { getByText } = renderWithProviders(<ReportsPage />, {
      preloadedState: {
        report: {
          reports: [],
          scheduledReports: [],
          loading: false,
          error: 'Failed to fetch reports',
          totalReports: 0,
          totalScheduledReports: 0,
        },
      },
    });

    // Verify that error messages are displayed appropriately
    expect(getByText('Failed to fetch reports')).toBeInTheDocument();
  });
});