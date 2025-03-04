// react v18.2.0
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import ExportsPage from './ExportsPage';
import useReport from '../../../hooks/useReport';
import useToast from '../../../hooks/useToast';
import { OutputFormat } from '../../../types/report.types';
import * as jest from 'jest'; // jest ^29.5.0

/**
 * Test suite for the Barracuda ExportsPage component.
 * Tests functionality related to displaying, filtering, and downloading report exports,
 * and verifies user interactions for creating new exports.
 * @requirements_addressed
 * - Refund Activity Reporting: Technical Specifications/2.2 DETAILED FEATURE DESCRIPTIONS/F-301: Refund Activity Reporting
 *   Tests comprehensive reporting on refund activities with data export capabilities
 * - Data Export: Technical Specifications/6.8 REPORTING & ANALYTICS ENGINE/Data Export
 *   Validates functionality for exporting reports in various formats (CSV, Excel, PDF, JSON)
 * - Administrative Control Panel: Technical Specifications/2.1 FEATURE CATALOG/F-306
 *   Tests administrative tools to export and manage refund data
 */
describe('ExportsPage component', () => {
  // Mock the useReport hook
  const mockUseReport = {
    reportExecution: null,
    loading: false,
    error: null,
    exportReport: jest.fn(),
    getReportExecutions: jest.fn(),
  };

  // Mock the useToast hook
  const mockUseToast = {
    successToast: jest.fn(),
    errorToast: jest.fn(),
  };

  // Setup function run before each test
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Clear mock implementations
    jest.clearAllMocks();

    // Set up mocks for next test
    setupMocks();
  });

  // Helper function to set up all required mocks
  const setupMocks = () => {
    jest.spyOn(useReport, 'default').mockImplementation(() => mockUseReport);
    jest.spyOn(useToast, 'default').mockImplementation(() => mockUseToast);
  };

  // Helper function to create mock report execution data
  const createMockReportExecutions = (count: number) => {
    const mockReportExecutions = [];
    for (let i = 1; i <= count; i++) {
      mockReportExecutions.push({
        id: `report-${i}`,
        reportName: `Report ${i}`,
        format: i % 2 === 0 ? OutputFormat.CSV : OutputFormat.EXCEL,
        date: new Date().toISOString(),
        size: `${i * 10} KB`,
        status: i % 3 === 0 ? 'COMPLETED' : 'PENDING',
      });
    }
    return mockReportExecutions;
  };

  // renders component correctly
  it('renders component correctly', async () => {
    // Render ExportsPage with test providers
    renderWithProviders(<ExportsPage />);

    // Verify page title is displayed
    expect(screen.getByText('Exports')).toBeInTheDocument();

    // Verify filtering options are present
    expect(screen.getByText('Time Period')).toBeInTheDocument();

    // Verify export table is displayed
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  // displays loading state while fetching exports
  it('displays loading state while fetching exports', async () => {
    // Mock loading state to true
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      loading: true,
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Verify loading spinner is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // displays error message when API fails
  it('displays error message when API fails', async () => {
    // Mock API error response
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      error: 'Failed to fetch exports',
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Verify error message is displayed
    expect(screen.getByText('Error: Failed to fetch exports')).toBeInTheDocument();
  });

  // renders report executions in table
  it('renders report executions in table', async () => {
    // Create mock report executions
    const mockExecutions = createMockReportExecutions(3);

    // Mock API to return executions
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      exports: mockExecutions,
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Verify each execution is displayed with correct data
    mockExecutions.forEach((execution) => {
      expect(screen.getByText(execution.reportName)).toBeInTheDocument();
      expect(screen.getByText(execution.format)).toBeInTheDocument();
      expect(screen.getByText(execution.size)).toBeInTheDocument();
      expect(screen.getByText(execution.status)).toBeInTheDocument();
    });
  });

  // handles pagination correctly
  it('handles pagination correctly', async () => {
    // Create large set of mock executions
    createMockReportExecutions(25);

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Click next page button
    const user = setupUserEvent();
    const nextPageButton = screen.getByRole('button', { name: /Next page/i });
    await user.click(nextPageButton);

    // Verify getReportExecutions called with updated page number
    expect(mockUseReport.getReportExecutions).toHaveBeenCalledWith({
      pagination: { page: 2, pageSize: 10 },
    });
  });

  // applies filters correctly
  it('applies filters correctly', async () => {
    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Select date range filter
    const user = setupUserEvent();
    const dateRangeSelect = screen.getByLabelText(/Time Period/i);
    fireEvent.change(dateRangeSelect, { target: { value: 'Last 30 Days' } });
    await waitFor(() => {
      expect(mockUseReport.getReportExecutions).toHaveBeenCalled();
    });

    // Select format filter
    const formatSelect = screen.getByLabelText(/Format/i);
    fireEvent.change(formatSelect, { target: { value: 'CSV' } });
    await waitFor(() => {
      expect(mockUseReport.getReportExecutions).toHaveBeenCalled();
    });

    // Verify getReportExecutions called with correct filters
    expect(mockUseReport.getReportExecutions).toHaveBeenCalledTimes(3);
  });

  // handles download action correctly
  it('handles download action correctly', async () => {
    // Create mock execution with completed status
    const mockExecution = {
      id: 'report-1',
      reportName: 'Report 1',
      format: OutputFormat.CSV,
      date: new Date().toISOString(),
      size: '10 KB',
      status: 'COMPLETED',
    };

    // Mock API to return execution
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      exports: [mockExecution],
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Click download button for execution
    const user = setupUserEvent();
    const downloadButton = screen.getByRole('button', { name: /Download/i });
    await user.click(downloadButton);

    // Verify exportReport function called with correct parameters
    expect(mockUseReport.exportReport).toHaveBeenCalledWith(
      mockExecution.id,
      mockExecution.format
    );
  });

  // opens export creation modal
  it('opens export creation modal', async () => {
    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Click 'Create Export' button
    const user = setupUserEvent();
    const createExportButton = screen.getByRole('button', { name: /New Export/i });
    await user.click(createExportButton);

    // Verify modal is displayed with format options
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Excel/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/JSON/i)).toBeInTheDocument();
  });

  // handles export format selection
  it('handles export format selection', async () => {
    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Open export creation modal
    const user = setupUserEvent();
    const createExportButton = screen.getByRole('button', { name: /New Export/i });
    await user.click(createExportButton);

    // Select format option
    const formatOption = screen.getByRole('radio', { name: /CSV/i });
    await user.click(formatOption);

    // Verify format is selected
    expect(formatOption).toBeChecked();
  });

  // displays success toast on successful export
  it('displays success toast on successful export', async () => {
    // Mock successful export response
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      exportReport: jest.fn().mockResolvedValue(undefined),
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Trigger export action
    const user = setupUserEvent();
    const downloadButton = screen.getByRole('button', { name: /Download/i });
    await user.click(downloadButton);

    // Verify success toast is displayed
    expect(mockUseToast.successToast).toHaveBeenCalledWith('Report exported successfully');
  });

  // displays error toast on failed export
  it('displays error toast on failed export', async () => {
    // Mock failed export response
    jest.spyOn(useReport, 'default').mockImplementation(() => ({
      ...mockUseReport,
      exportReport: jest.fn().mockRejectedValue(new Error('Export failed')),
    }));

    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Trigger export action
    const user = setupUserEvent();
    const downloadButton = screen.getByRole('button', { name: /Download/i });
    await user.click(downloadButton);

    // Verify error toast is displayed
    expect(mockUseToast.errorToast).toHaveBeenCalledWith('Failed to export report: Export failed');
  });

  // refreshes export list after new export
  it('refreshes export list after new export', async () => {
    // Render ExportsPage component
    renderWithProviders(<ExportsPage />);

    // Create new export
    const user = setupUserEvent();
    const createExportButton = screen.getByRole('button', { name: /New Export/i });
    await user.click(createExportButton);

    // Verify getReportExecutions is called again
    expect(mockUseReport.getReportExecutions).toHaveBeenCalledTimes(2);
  });
});