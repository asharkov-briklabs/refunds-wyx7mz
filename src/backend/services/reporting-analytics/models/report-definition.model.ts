import mongoose, { Document, Model, Schema } from 'mongoose';
import { debug } from '../../../common/utils/logger';

/**
 * Interface defining a parameter definition for reports
 */
export interface IParameterDefinition {
  /** Parameter name (used as identifier) */
  name: string;
  /** Parameter data type (string, number, date, etc.) */
  type: string;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value for the parameter */
  default?: any;
  /** Data source for parameter options (for select/multiselect types) */
  dataSource?: string;
  /** User-friendly label for the parameter */
  label: string;
}

/**
 * Interface defining visualization configuration for reports
 */
export interface IVisualization {
  /** Visualization type (bar_chart, line_chart, etc.) */
  type: string;
  /** Title of the visualization */
  title: string;
  /** Metrics to display in the visualization */
  metrics: Record<string, any>[];
}

/**
 * Interface defining permission rules for report access
 */
export interface IPermissionRule {
  /** Role that this permission applies to */
  role: string;
  /** Access level for this role */
  access: string;
}

/**
 * Interface defining the structure of report definitions
 */
export interface IReportDefinition {
  /** Unique identifier for the report definition */
  reportId: string;
  /** User-friendly name of the report */
  name: string;
  /** Detailed description of the report purpose and contents */
  description?: string;
  /** Definitions of parameters that can be provided when executing the report */
  parameterDefinitions: IParameterDefinition[];
  /** Identifier for the data source to query */
  dataSource: string;
  /** Query specification with collection name and pipeline/filter details */
  query: Record<string, any>;
  /** Visualization configurations for presenting the report data */
  visualizations?: IVisualization[];
  /** Permission rules defining which roles can access the report */
  permissions: IPermissionRule[];
  /** Timestamp when the report definition was created */
  createdAt: Date;
  /** Timestamp when the report definition was last updated */
  updatedAt: Date;
}

/**
 * Interface extending Document with IReportDefinition for MongoDB operations
 */
export interface IReportDefinitionDocument extends IReportDefinition, Document {}

/**
 * Supported parameter types for report definitions
 */
export const ParameterTypes = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATERANGE: 'daterange',
  SELECT: 'select',
  MULTISELECT: 'multiselect'
} as const;

/**
 * Supported visualization types for report definitions
 */
export const VisualizationTypes = {
  SUMMARY_METRICS: 'summary_metrics',
  TABLE: 'table',
  BAR_CHART: 'bar_chart',
  LINE_CHART: 'line_chart',
  PIE_CHART: 'pie_chart'
} as const;

/**
 * Supported access scope types for permission rules
 */
export const AccessTypes = {
  ALL_MERCHANTS: 'ALL_MERCHANTS',
  ORGANIZATION_MERCHANTS: 'ORGANIZATION_MERCHANTS',
  BANK_MERCHANTS: 'BANK_MERCHANTS',
  OWN_MERCHANT: 'OWN_MERCHANT'
} as const;

// Define the schema for parameter definitions
const ParameterDefinitionSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(ParameterTypes)
  },
  required: {
    type: Boolean,
    default: false
  },
  default: {
    type: Schema.Types.Mixed
  },
  dataSource: {
    type: String
  },
  label: {
    type: String,
    required: true
  }
}, { _id: false });

// Define the schema for visualizations
const VisualizationSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: Object.values(VisualizationTypes)
  },
  title: {
    type: String,
    required: true
  },
  metrics: {
    type: [Schema.Types.Mixed],
    required: true
  }
}, { _id: false });

// Define the schema for permission rules
const PermissionRuleSchema = new Schema({
  role: {
    type: String,
    required: true
  },
  access: {
    type: String,
    required: true,
    enum: Object.values(AccessTypes)
  }
}, { _id: false });

// Define the main report definition schema
const ReportDefinitionSchema = new Schema({
  // Unique identifier for the report definition
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  // User-friendly name of the report
  name: {
    type: String,
    required: true
  },
  // Detailed description of the report purpose and contents
  description: {
    type: String
  },
  // Definitions of parameters that can be provided when executing the report
  parameterDefinitions: {
    type: [ParameterDefinitionSchema],
    required: true,
    default: []
  },
  // Identifier for the data source to query
  dataSource: {
    type: String,
    required: true
  },
  // Query specification with collection name and pipeline/filter details
  query: {
    type: Schema.Types.Mixed,
    required: true
  },
  // Visualization configurations for presenting the report data
  visualizations: {
    type: [VisualizationSchema],
    default: []
  },
  // Permission rules defining which roles can access the report
  permissions: {
    type: [PermissionRuleSchema],
    required: true,
    default: []
  }
}, {
  timestamps: true
});

// Add indexes for efficient queries
ReportDefinitionSchema.index({ reportId: 1 }, { unique: true });
ReportDefinitionSchema.index({ name: 1 });
ReportDefinitionSchema.index({ dataSource: 1 });

debug('Report Definition model initialized');

// Create and export the Mongoose model
export const ReportDefinitionModel: Model<IReportDefinitionDocument> = mongoose.model<IReportDefinitionDocument>(
  'ReportDefinition',
  ReportDefinitionSchema
);