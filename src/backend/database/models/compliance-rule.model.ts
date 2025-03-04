import mongoose, { Document, Model, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // uuid v9.0.0

/**
 * Enumeration of possible compliance rule types that determine
 * how a rule is evaluated against refund requests
 */
export enum RuleType {
  TIMEFRAME = 'TIMEFRAME',       // Time-related constraints (e.g., refund window)
  AMOUNT = 'AMOUNT',             // Amount-related constraints (e.g., max refund amount)
  METHOD = 'METHOD',             // Refund method restrictions
  DOCUMENTATION = 'DOCUMENTATION', // Documentation requirements
  FREQUENCY = 'FREQUENCY'        // Frequency limitations (e.g., max refunds per period)
}

/**
 * Enumeration of entity types that compliance rules can be associated with
 */
export enum EntityType {
  CARD_NETWORK = 'CARD_NETWORK', // Card network-specific rules (e.g., Visa, Mastercard)
  MERCHANT = 'MERCHANT',         // Merchant-specific rules
  ORGANIZATION = 'ORGANIZATION', // Organization-level rules
  PROGRAM = 'PROGRAM',           // Program-level rules
  BANK = 'BANK',                 // Bank-level rules
  REGULATORY = 'REGULATORY'      // Regulatory requirements
}

/**
 * Enumeration of provider types for compliance rules
 */
export enum ProviderType {
  CARD_NETWORK = 'CARD_NETWORK', // Rules provided by card networks
  REGULATORY = 'REGULATORY',     // Rules provided by regulatory bodies
  MERCHANT = 'MERCHANT'          // Rules provided by merchants
}

/**
 * Interface defining the structure of a compliance rule
 */
export interface IComplianceRule {
  rule_id: string;               // Unique identifier for the compliance rule
  rule_type: RuleType;           // Type of rule that determines validation logic
  rule_name: string;             // Descriptive name for the rule
  description?: string;          // Detailed description of the rule's purpose
  provider_type: ProviderType;   // Type of provider that manages this rule
  entity_type: EntityType;       // Type of entity this rule applies to
  entity_id: string;             // Identifier of the specific entity (e.g., Visa, merchant ID)
  evaluation: object;            // Rule evaluation logic and parameters
  violation_code: string;        // Machine-readable code for rule violation
  violation_message: string;     // Human-readable message for rule violation
  severity: 'ERROR' | 'WARNING' | 'INFO'; // Severity level of rule violation
  remediation?: string;          // Suggested remediation steps for the violation
  effective_date: Date;          // Date when this rule becomes effective
  expiration_date?: Date | null; // Date when this rule expires (null for no expiration)
  active: boolean;               // Whether this rule is currently active
  created_at: Date;              // Timestamp when the rule was created
  updated_at: Date;              // Timestamp when the rule was last updated
  version: number;               // Version number of the rule, incremented on updates
}

/**
 * MongoDB document interface that extends both Document and IComplianceRule
 */
export interface IComplianceRuleDocument extends Document, IComplianceRule {
  /**
   * Checks if the rule is active and within effective date range
   * @returns True if rule is active and within date range
   */
  isActive(): boolean;
}

/**
 * Mongoose schema definition for compliance rules
 */
export const ComplianceRuleSchema = new Schema<IComplianceRuleDocument>({
  rule_id: {
    type: String,
    required: true,
    unique: true,
    description: 'Unique identifier for the compliance rule'
  },
  rule_type: {
    type: String,
    required: true,
    enum: Object.values(RuleType),
    description: 'Type of compliance rule that determines validation logic'
  },
  rule_name: {
    type: String,
    required: true,
    description: 'Descriptive name for the compliance rule'
  },
  description: {
    type: String,
    required: false,
    description: "Detailed description of the rule's purpose"
  },
  provider_type: {
    type: String,
    required: true,
    enum: Object.values(ProviderType),
    description: 'Type of provider that manages this rule'
  },
  entity_type: {
    type: String,
    required: true,
    enum: Object.values(EntityType),
    description: 'Type of entity this rule applies to'
  },
  entity_id: {
    type: String,
    required: true,
    description: 'Identifier of the specific entity (e.g., Visa, merchant ID)'
  },
  evaluation: {
    type: Object,
    required: true,
    description: 'Rule evaluation logic and parameters'
  },
  violation_code: {
    type: String,
    required: true,
    description: 'Machine-readable code for rule violation'
  },
  violation_message: {
    type: String,
    required: true,
    description: 'Human-readable message for rule violation'
  },
  severity: {
    type: String,
    required: true,
    enum: ['ERROR', 'WARNING', 'INFO'],
    default: 'ERROR',
    description: 'Severity level of rule violation'
  },
  remediation: {
    type: String,
    required: false,
    description: 'Suggested remediation steps for the violation'
  },
  effective_date: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'Date when this rule becomes effective'
  },
  expiration_date: {
    type: Date,
    required: false,
    description: 'Date when this rule expires (null for no expiration)'
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    description: 'Whether this rule is currently active'
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'Timestamp when the rule was created'
  },
  updated_at: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'Timestamp when the rule was last updated'
  },
  version: {
    type: Number,
    required: true,
    default: 1,
    description: 'Version number of the rule, incremented on updates'
  }
});

/**
 * Checks if the rule is active and within effective date range
 * @returns True if rule is active, current date is after effective_date, and current date is before expiration_date (if set)
 */
ComplianceRuleSchema.methods.isActive = function(this: IComplianceRuleDocument): boolean {
  const now = new Date();
  return (
    this.active &&
    now >= this.effective_date &&
    (!this.expiration_date || now <= this.expiration_date)
  );
};

/**
 * Mongoose pre-save hook that generates a rule_id if not provided
 * and manages the timestamps
 */
ComplianceRuleSchema.pre('save', function(this: IComplianceRuleDocument) {
  // Generate a UUID for new documents without a rule_id
  if (this.isNew && !this.rule_id) {
    this.rule_id = uuidv4();
  }
  
  // Set created_at to current date if not already set
  if (!this.created_at) {
    this.created_at = new Date();
  }
  
  // Always update updated_at to current date
  this.updated_at = new Date();
});

// Create indexes for efficient querying
ComplianceRuleSchema.index({ rule_id: 1 }, { unique: true });
ComplianceRuleSchema.index({ rule_type: 1, active: 1 });
ComplianceRuleSchema.index({ entity_type: 1, entity_id: 1, active: 1 });
ComplianceRuleSchema.index({ provider_type: 1, active: 1 });

/**
 * Mongoose model for database operations on compliance rules
 */
export const ComplianceRuleModel: Model<IComplianceRuleDocument> = mongoose.model<IComplianceRuleDocument>(
  'ComplianceRule',
  ComplianceRuleSchema
);