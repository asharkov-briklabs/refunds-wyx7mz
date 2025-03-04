/**
 * Report Redux Slice
 * 
 * This slice manages state for reporting functionality in the Refunds Service,
 * including fetching reports, generating new reports, scheduling reports, and
 * exporting report data in various formats.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  Report, 
  ReportType, 
  ReportParameters, 
  ScheduledReport, 
  ReportExportFormat 
} from '../../types/report.types';
import { 
  ApiErrorResponse, 
  PaginatedResponse, 
  PaginationParams 
} from '../../types/api.types';
import reportApi from '../../services/api/report.api';

/**
 * Interface defining the state structure for the report slice
 */
interface ReportState {
  // List of reports
  reports: Report[];
  // Currently selected/active report
  currentReport: Report | null;
  // List of scheduled reports for recurring generation
  scheduledReports: ScheduledReport[];
  // Pagination information for report lists
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  // Loading states for various operations
  loading: {
    reports: boolean;
    currentReport: boolean;
    generateReport: boolean;
    scheduleReport: boolean;
    scheduledReports: boolean;
    cancelScheduledReport: boolean;
    exportReport: boolean;
  };
  // Error information from failed operations
  error: ApiErrorResponse | null;
}

/**
 * Initial state for the report slice
 */
const initialState: ReportState = {
  reports: [],
  currentReport: null,
  scheduledReports: [],
  pagination: {
    totalItems: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },
  loading: {
    reports: false,
    currentReport: false,
    generateReport: false,
    scheduleReport: false,
    scheduledReports: false,
    cancelScheduledReport: false,
    exportReport: false,
  },
  error: null,
};

/**
 * Async thunk for fetching reports with optional filters and pagination
 */
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (params: { filters?: any; pagination?: PaginationParams }, { rejectWithValue }) => {
    try {
      const response = await reportApi.getReportDefinitions(params);
      return {
        reports: response.data.items,
        pagination: {
          totalItems: response.data.totalItems,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        }
      };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for fetching a specific report by ID
 */
export const fetchReportById = createAsyncThunk(
  'reports/fetchReportById',
  async (reportId: string, { rejectWithValue }) => {
    try {
      const response = await reportApi.getReportDefinitionById(reportId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for generating a new report
 */
export const generateReport = createAsyncThunk(
  'reports/generateReport',
  async (
    { reportType, parameters }: { reportType: ReportType; parameters: ReportParameters },
    { rejectWithValue }
  ) => {
    try {
      const response = await reportApi.generateReport({ reportType, parameters });
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for scheduling a report for recurring generation
 */
export const scheduleReport = createAsyncThunk(
  'reports/scheduleReport',
  async (
    {
      reportType,
      parameters,
      schedule,
      recipients,
    }: {
      reportType: ReportType;
      parameters: ReportParameters;
      schedule: string;
      recipients?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await reportApi.scheduleReport({
        reportType,
        parameters,
        schedule,
        recipients,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for fetching all scheduled reports
 */
export const fetchScheduledReports = createAsyncThunk(
  'reports/fetchScheduledReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportApi.getScheduledReports();
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for canceling a scheduled report
 */
export const cancelScheduledReport = createAsyncThunk(
  'reports/cancelScheduledReport',
  async (scheduleId: string, { rejectWithValue }) => {
    try {
      const response = await reportApi.deleteScheduledReport(scheduleId);
      return { success: response.success, scheduleId };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for exporting a report in the specified format
 */
export const exportReport = createAsyncThunk(
  'reports/exportReport',
  async (
    { reportId, format }: { reportId: string; format: ReportExportFormat },
    { rejectWithValue }
  ) => {
    try {
      const blob = await reportApi.exportReport(reportId, format);
      return blob;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Create the report slice with reducers and extra reducers for async actions
 */
const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    // Set the current active report
    setCurrentReport: (state, action: PayloadAction<Report>) => {
      state.currentReport = action.payload;
    },
    
    // Clear the current report selection
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    
    // Clear any error state
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchReports reducers
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading.reports = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading.reports = false;
        state.reports = action.payload.reports;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading.reports = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // fetchReportById reducers
    builder
      .addCase(fetchReportById.pending, (state) => {
        state.loading.currentReport = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.loading.currentReport = false;
        state.currentReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading.currentReport = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // generateReport reducers
    builder
      .addCase(generateReport.pending, (state) => {
        state.loading.generateReport = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.loading.generateReport = false;
        state.currentReport = action.payload;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading.generateReport = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // scheduleReport reducers
    builder
      .addCase(scheduleReport.pending, (state) => {
        state.loading.scheduleReport = true;
        state.error = null;
      })
      .addCase(scheduleReport.fulfilled, (state, action) => {
        state.loading.scheduleReport = false;
        state.scheduledReports.push(action.payload);
      })
      .addCase(scheduleReport.rejected, (state, action) => {
        state.loading.scheduleReport = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // fetchScheduledReports reducers
    builder
      .addCase(fetchScheduledReports.pending, (state) => {
        state.loading.scheduledReports = true;
        state.error = null;
      })
      .addCase(fetchScheduledReports.fulfilled, (state, action) => {
        state.loading.scheduledReports = false;
        state.scheduledReports = action.payload;
      })
      .addCase(fetchScheduledReports.rejected, (state, action) => {
        state.loading.scheduledReports = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // cancelScheduledReport reducers
    builder
      .addCase(cancelScheduledReport.pending, (state) => {
        state.loading.cancelScheduledReport = true;
        state.error = null;
      })
      .addCase(cancelScheduledReport.fulfilled, (state, action) => {
        state.loading.cancelScheduledReport = false;
        if (action.payload.success) {
          state.scheduledReports = state.scheduledReports.filter(
            (report) => report.id !== action.payload.scheduleId
          );
        }
      })
      .addCase(cancelScheduledReport.rejected, (state, action) => {
        state.loading.cancelScheduledReport = false;
        state.error = action.payload as ApiErrorResponse;
      });

    // exportReport reducers
    builder
      .addCase(exportReport.pending, (state) => {
        state.loading.exportReport = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.loading.exportReport = false;
        // No state changes needed for successful export as it results in a file download
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.loading.exportReport = false;
        state.error = action.payload as ApiErrorResponse;
      });
  },
});

// Export all actions from the slice
export const reportActions = {
  ...reportSlice.actions,
  fetchReports,
  fetchReportById,
  generateReport,
  scheduleReport,
  fetchScheduledReports,
  cancelScheduledReport,
  exportReport
};

// Export individual actions for direct use
export const { setCurrentReport, clearCurrentReport, clearError } = reportSlice.actions;

// Export the reducer as default
export default reportSlice.reducer;