import mongoose, { Document, Model, Schema } from 'mongoose';
import { debug } from '../../../common/utils/logger';
import { IReportDefinition } from './report-definition.model';

/**
 * Interface defining recipient information for report delivery
 */
export interface IRecipient {
  /** Type of recipient for delivery method */
  type: string;
  /** Delivery address (email, slack channel, etc.) */
  address: string;
  /** Display name of recipient */
  name?: string;
}

/**
 * Supported output formats for scheduled reports
 */
export enum OutputFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  JSON = 'JSON'
}

/**
 * Supported recipient types for report delivery
 */
export enum RecipientType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  DASHBOARD = 'DASHBOARD'
}

/**
 * Interface defining the structure of scheduled reports
 */
export interface IScheduledReport {
  /** Unique identifier for the scheduled report */
  scheduleId: string;
  /** Reference to the report definition to execute */
  reportId: string;
  /** ID of the user who created the scheduled report */
  userId: string;
  /** Parameters to apply when executing the report */
  parameters: Record<string, any>;
  /** Cron expression defining the execution schedule */
  scheduleExpression: string;
  /** Format for exporting report results */
  outputFormat: string;
  /** List of recipients to notify when report is generated */
  recipients?: IRecipient[];
  /** Whether the scheduled report is active */
  enabled: boolean;
  /** Timestamp of last successful execution */
  lastRunTime?: Date;
  /** Timestamp when report should next execute */
  nextRunTime: Date;
  /** Timestamp when the scheduled report was created */
  createdAt: Date;
  /** Timestamp when the scheduled report was last updated */
  updatedAt: Date;
}

/**
 * Interface extending Document with IScheduledReport for MongoDB operations
 */
export interface IScheduledReportDocument extends IScheduledReport, Document {}

// Define schema for recipients
const RecipientSchema = new Schema({
  // Type of recipient for delivery method
  type: {
    type: String,
    required: true,
    enum: Object.values(RecipientType),
    description: 'Type of recipient for delivery method'
  },
  // Delivery address (email, slack channel, etc.)
  address: {
    type: String,
    required: true,
    description: 'Delivery address (email, slack channel, etc.)'
  },
  // Display name of recipient
  name: {
    type: String,
    description: 'Display name of recipient'
  }
}, { _id: false });

// Define the main scheduled report schema
const ScheduledReportSchema = new Schema({
  // Unique identifier for the scheduled report
  scheduleId: {
    type: String,
    required: true,
    unique: true,
    description: 'Unique identifier for the scheduled report'
  },
  // Reference to the report definition to execute
  reportId: {
    type: String,
    required: true,
    ref: 'ReportDefinition',
    description: 'Reference to the report definition to execute'
  },
  // ID of the user who created the scheduled report
  userId: {
    type: String,
    required: true,
    description: 'ID of the user who created the scheduled report'
  },
  // Parameters to apply when executing the report
  parameters: {
    type: Schema.Types.Mixed,
    required: true,
    description: 'Parameters to apply when executing the report'
  },
  // Cron expression defining the execution schedule
  scheduleExpression: {
    type: String,
    required: true,
    description: 'Cron expression defining the execution schedule'
  },
  // Format for exporting report results
  outputFormat: {
    type: String,
    required: true,
    enum: Object.values(OutputFormat),
    description: 'Format for exporting report results'
  },
  // List of recipients to notify when report is generated
  recipients: {
    type: [RecipientSchema],
    default: [],
    description: 'List of recipients to notify when report is generated'
  },
  // Whether the scheduled report is active
  enabled: {
    type: Boolean,
    required: true,
    default: true,
    description: 'Whether the scheduled report is active'
  },
  // Timestamp of last successful execution
  lastRunTime: {
    type: Date,
    description: 'Timestamp of last successful execution'
  },
  // Timestamp when report should next execute
  nextRunTime: {
    type: Date,
    required: true,
    description: 'Timestamp when report should next execute'
  }
}, {
  timestamps: true // This automatically handles createdAt and updatedAt
});

// Add indexes for efficient queries
ScheduledReportSchema.index({ scheduleId: 1 }, { unique: true });
ScheduledReportSchema.index({ userId: 1 });
ScheduledReportSchema.index({ reportId: 1 });
ScheduledReportSchema.index({ nextRunTime: 1, enabled: 1 });

debug('Scheduled Report model initialized');

// Create and export the Mongoose model
export const ScheduledReportModel: Model<IScheduledReportDocument> = mongoose.model<IScheduledReportDocument>(
  'ScheduledReport',
  ScheduledReportSchema
);