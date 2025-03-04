/**
 * Parameter Model
 * 
 * This module defines the Mongoose schema and model for configuration parameters
 * in the Refunds Service. The model supports a hierarchical configuration system where
 * parameters can be defined at different levels (program, bank, organization, merchant)
 * with inheritance, versioning, and effective dates.
 * 
 * Parameters are used throughout the Refunds Service to control behavior such as
 * refund limits, approval thresholds, and processing rules.
 */

import mongoose, { Schema, model, Document, Model } from 'mongoose'; // mongoose@^6.0.0
import { debug } from '../../common/utils/logger';

/**
 * Enum representing the different levels at which parameters can be defined
 */
export enum ParameterEntityType {
  MERCHANT = 'MERCHANT',      // Merchant-specific parameters
  ORGANIZATION = 'ORGANIZATION', // Organization-level parameters
  PROGRAM = 'PROGRAM',        // Program-level parameters
  BANK = 'BANK',              // Bank-level parameters
  SYSTEM = 'SYSTEM'           // System-wide default parameters
}

/**
 * Interface for parameter documents stored in the database
 */
export interface IParameter {
  parameterName: string;       // Unique identifier for the parameter
  entityType: ParameterEntityType; // Level at which parameter is defined
  entityId: string;            // ID of the entity (merchant, org, etc.)
  value: any;                  // Parameter value (can be any JSON-serializable type)
  version: number;             // Version number for tracking changes
  effectiveDate: Date;         // When this parameter value becomes active
  expirationDate: Date | null; // When this parameter value expires (null = never)
  overridable: boolean;        // Whether lower levels can override this parameter
  createdBy: string;           // User ID of creator
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last update timestamp
  description: string | null;  // Optional description
}

/**
 * Mongoose schema for parameter documents
 */
export const parameterSchema = new Schema<IParameter>({
  parameterName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: Object.values(ParameterEntityType),
    index: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  version: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    default: null
  },
  overridable: {
    type: Boolean,
    required: true,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create compound index for efficient parameter resolution
parameterSchema.index({ 
  parameterName: 1, 
  entityType: 1, 
  entityId: 1, 
  version: -1 
});

// Create index for effective date querying
parameterSchema.index({ 
  effectiveDate: 1, 
  expirationDate: 1 
});

// Create index for active parameter lookup
parameterSchema.index({
  parameterName: 1,
  entityType: 1,
  entityId: 1,
  effectiveDate: 1,
  expirationDate: 1
});

// Log when parameter schema is initialized
debug('Parameter schema initialized with indexes');

/**
 * Mongoose model for parameter documents
 */
const Parameter = model<IParameter>('Parameter', parameterSchema);

export default Parameter;