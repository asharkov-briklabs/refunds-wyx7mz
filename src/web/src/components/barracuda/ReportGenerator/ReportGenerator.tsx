# src/web/src/components/barracuda/ReportGenerator/ReportGenerator.tsx
```typescript
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // react version ^18.2.0
import useReport from '../../../hooks/useReport';
import {
  ReportType,
  ParameterType,
  OutputFormat,
  ParameterDefinition,
  ReportDefinition,
  ReportResult,
  ReportSchedule,
  ScheduleFrequency,
} from '../../../types/report.types';
import { DateRange } from '../../../types/common.types';
import {
  Card,
  Button,
  Select,
  TextField,
  DatePicker,
  Checkbox,
  Tabs,
  RadioGroup,
  Spinner,
  Modal,
} from '../../../components/common';
import DateRangeSelector from '../../../components/shared/DateRangeSelector';
import { BarChart, LineChart, PieChart, MetricCard } from '../../../components/charts';

/**
 * Props interface for the ReportGenerator component
 */
export interface ReportGeneratorProps {
  /**
   * The ID of the merchant for whom the report is being generated
   */
  merchantId: string;
  /**
   * The initial report type to be selected
   */
  initialReportType?: ReportType;
  /**
   * Callback function to be called when a report is generated
   */
  onReportGenerated?: (reportResult: ReportResult) => void;
  /**
   * Callback function to be called when the component is closed
   */
  onClose?: () => void;
}

/**
 * Formats parameter values for display based on their type
 * @param value The parameter value
 * @param type The parameter type
 * @returns Formatted parameter value
 */
const formatParameterValue = (value: any, type: ParameterType): string => {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case ParameterType.DATE:
      return new Date(value).toLocaleDateString();
    case ParameterType.DATERANGE:
      const dateRange = value as DateRange;
      return `${dateRange.startDate} - ${dateRange.endDate}`;
    case ParameterType.BOOLEAN:
      return value ? 'Yes' : 'No';
    case ParameterType.MULTISELECT:
      return (value as string[]).join(', ');
    default:
      return String(value);
  }
};

/**
 * Custom hook to manage parameter state for report generation
 * @param parameterDefinitions Array of parameter definitions
 * @returns Parameter state management object with values and update functions
 */
const useParameterState = (parameterDefinitions: ParameterDefinition[]) => {
  // Initialize state for parameter values using default values from definitions
  const [parameterValues, setParameterValues] = useState<Record<string, any>>(() => {
    const initialValues: Record<string, any> = {};
    parameterDefinitions.forEach(param => {
      initialValues[param.name] = param.defaultValue || '';
    });
    return initialValues;
  });

  /**
   * Update function for setting individual parameter values
   * @param name Parameter name
   * @param value Parameter value
   */
  const updateParameterValue = useCallback((name: string, value: any) => {
    setParameterValues(prevValues => ({
      ...prevValues,
      [name]: value,
    }));
  }, []);

  /**
   * Reset function to restore default values
   */
  const resetParameterValues = useCallback(() => {
    const initialValues: Record<string, any> = {};
    parameterDefinitions.forEach(param => {
      initialValues[param.name] = param.defaultValue || '';
    });
    setParameterValues(initialValues);
  }, [parameterDefinitions]);

  /**
   * Validation function to check if required parameters are filled
   */
  const validateParameters = useCallback(() => {
    return parameterDefinitions.every(param => {
      if (param.required) {
        const value = parameterValues[param.name];
        return value !== null && value !== undefined && value !== '';
      }
      return true;
    });
  }, [parameterDefinitions, parameterValues]);

  return {
    parameterValues,
    updateParameterValue,
    resetParameterValues,
    validateParameters,
  };
};

/**
 * Component for generating, viewing, and exporting refund reports
 */
const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  merchantId,
  initialReportType,
  onReportGenerated,
  onClose,
}) => {
  // Initialize report-related state using useReport hook
  const {
    reports,
    currentReport,
    reportExecution,
    reportResult,
    scheduledReports,
    loading,
    error,
    fetchReports,
    generateReport,
    exportReport,
    scheduleReport: scheduleReportAction,
  } = useReport();

  // Initialize local component state for UI controls
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(initialReportType || null);
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormat>(OutputFormat.CSV);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>(ScheduleFrequency.DAILY);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);

  // Fetch available report definitions on component mount
  useEffect(() => {
    fetchReports({ pagination: { page: 1, pageSize: 100 } });
  }, [fetchReports]);

  /**
   * Handle report type selection changes
   * @param event Change event from the report type select
   */
  const handleReportTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const reportType = event.target.value as ReportType;
    setSelectedReportType(reportType);
  };

  // Manage report parameter inputs with useParameterState hook
  const {
    parameterValues,
    updateParameterValue,
    resetParameterValues,
    validateParameters,
  } = useParameterState(currentReport?.parameters || []);

  /**
   * Implement report generation function that validates and submits parameters
   */
  const handleGenerateReport = useCallback(() => {
    if (selectedReportType && validateParameters()) {
      generateReport(selectedReportType, parameterValues);
    } else {
      // Handle validation errors
      console.error('Validation failed. Please check required parameters.');
    }
  }, [selectedReportType, parameterValues, validateParameters, generateReport]);

  /**
   * Implement report export function for different formats
   */
  const handleExportReport = useCallback(() => {
    if (currentReport) {
      exportReport(currentReport.id, selectedOutputFormat);
    } else {
      console.error('No report selected for export.');
    }
  }, [currentReport, selectedOutputFormat, exportReport]);

  /**
   * Implement report scheduling function with recurrence options
   */
  const handleScheduleReport = useCallback(() => {
    if (selectedReportType && validateParameters()) {
      // Prepare schedule parameters
      const scheduleParams = {
        reportDefinitionId: currentReport?.id || '',
        parameters: parameterValues,
        schedule: {
          frequency: scheduleFrequency,
          expression: '', // Add logic for custom expressions
          startDate: new Date().toISOString(),
          outputFormat: selectedOutputFormat,
          recipients: [], // Add logic for recipients
        },
      };

      // Call scheduleReport action
      scheduleReportAction(scheduleParams);
      setIsSchedulingModalOpen(false);
    } else {
      console.error('Validation failed. Please check required parameters.');
    }
  }, [selectedReportType, validateParameters, parameterValues, scheduleFrequency, selectedOutputFormat, scheduleReportAction, currentReport]);

  // Render tabs for 'Generate Report', 'View Results', and 'Schedule Report'
  return (
    <div>
      <h2>Report Generator</h2>
      {/* Report Type Selection */}
      <Select
        label="Report Type"
        value={selectedReportType || ''}
        onChange={handleReportTypeChange}
        options={reports.map(report => ({
          value: report.type,
          label: report.name,
        }))}
      />

      {/* Parameter Input Form */}
      {currentReport && (
        <div>
          <h3>Report Parameters</h3>
          {currentReport.parameters.map(param => (
            <div key={param.name}>
              <label>{param.label}</label>
              <TextField
                value={parameterValues[param.name] || ''}
                onChange={(e) => updateParameterValue(param.name, e.target.value)}
              />
            </div>
          ))}
          <Button onClick={handleGenerateReport}>Generate Report</Button>
        </div>
      )}

      {/* Report Results */}
      {reportResult && (
        <div>
          <h3>Report Results</h3>
          {/* Render report results with visualizations */}
        </div>
      )}

      {/* Export Options */}
      {reportResult && (
        <div>
          <h3>Export Report</h3>
          <Select
            label="Output Format"
            value={selectedOutputFormat}
            onChange={(e) => setSelectedOutputFormat(e.target.value as OutputFormat)}
            options={[
              { value: OutputFormat.CSV, label: 'CSV' },
              { value: OutputFormat.EXCEL, label: 'Excel' },
              { value: OutputFormat.PDF, label: 'PDF' },
              { value: OutputFormat.JSON, label: 'JSON' },
            ]}
          />
          <Button onClick={handleExportReport}>Export</Button>
        </div>
      )}

      {/* Scheduling Options */}
      <Button onClick={() => setIsSchedulingModalOpen(true)}>Schedule Report</Button>
      <Modal isOpen={isSchedulingModalOpen} onClose={() => setIsSchedulingModalOpen(false)}>
        <h3>Schedule Report</h3>
        <RadioGroup
          label="Frequency"
          name="scheduleFrequency"
          value={scheduleFrequency}
          onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
          options={[
            { value: ScheduleFrequency.DAILY, label: 'Daily' },
            { value: ScheduleFrequency.WEEKLY, label: 'Weekly' },
            { value: ScheduleFrequency.MONTHLY, label: 'Monthly' },
          ]}
        />
        <Button onClick={handleScheduleReport}>Schedule</Button>
      </Modal>
    </div>
  );
};

export default ReportGenerator;