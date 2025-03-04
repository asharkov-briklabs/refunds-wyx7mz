import { Db, Collection } from 'mongodb'; // mongodb ^6.0.0
import { getConnection } from '../../../database/connection';
import { logger } from '../../../common/utils/logger';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { RefundMethod } from '../../../common/enums/refund-method.enum';

/**
 * Gets the MongoDB Db instance from the mongoose connection
 */
async function getDb(): Promise<Db> {
  const connection = await getConnection();
  return connection.db;
}

/**
 * Applies the migration by creating all required collections, schemas, and indexes
 */
export async function up(): Promise<void> {
  logger.info('Starting database migration: 20230501_initial');
  
  try {
    const db = await getDb();
    
    logger.info('Creating collections and schemas...');
    
    // Create all collections with schemas and indexes
    await createRefundRequestsCollection(db);
    await createRefundsCollection(db);
    await createApprovalRequestsCollection(db);
    await createBankAccountsCollection(db);
    await createParametersCollections(db);
    await createComplianceRulesCollection(db);
    await createAuditLogsCollection(db);
    await createNotificationCollections(db);
    
    logger.info('Database migration completed successfully: 20230501_initial');
  } catch (error) {
    logger.error('Database migration failed', { error });
    throw error;
  }
}

/**
 * Rolls back the migration by dropping all created collections
 */
export async function down(): Promise<void> {
  logger.info('Starting rollback of database migration: 20230501_initial');
  
  try {
    const db = await getDb();
    
    // Drop all collections in reverse order
    await safeDropCollection(db, 'notifications');
    await safeDropCollection(db, 'notification_templates');
    await safeDropCollection(db, 'audit_logs');
    await safeDropCollection(db, 'compliance_rules');
    await safeDropCollection(db, 'parameter_definitions');
    await safeDropCollection(db, 'refund_parameters');
    await safeDropCollection(db, 'bank_accounts');
    await safeDropCollection(db, 'approval_requests');
    await safeDropCollection(db, 'refunds');
    await safeDropCollection(db, 'refund_requests');
    
    logger.info('Database migration rollback completed successfully: 20230501_initial');
  } catch (error) {
    logger.error('Database migration rollback failed', { error });
    throw error;
  }
}

/**
 * Safely drops a collection if it exists
 */
async function safeDropCollection(db: Db, collectionName: string): Promise<void> {
  try {
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      await db.collection(collectionName).drop();
      logger.info(`Dropped collection: ${collectionName}`);
    } else {
      logger.info(`Collection does not exist, skipping drop: ${collectionName}`);
    }
  } catch (error) {
    logger.warn(`Error dropping collection ${collectionName}`, { error });
  }
}

/**
 * Creates the refund_requests collection with schema validation and indexes
 */
async function createRefundRequestsCollection(db: Db): Promise<Collection> {
  logger.info('Creating refund_requests collection...');
  
  // Define JSON schema for refund requests
  const refundRequestSchema = {
    bsonType: 'object',
    required: ['refundRequestId', 'transactionId', 'merchantId', 'amount', 'currency', 'refundMethod', 'status', 'createdAt', 'updatedAt'],
    properties: {
      refundRequestId: {
        bsonType: 'string',
        description: 'Unique identifier for the refund request'
      },
      transactionId: {
        bsonType: 'string',
        description: 'Reference to the original transaction being refunded'
      },
      merchantId: {
        bsonType: 'string',
        description: 'Identifier for the merchant issuing the refund'
      },
      customerId: {
        bsonType: ['string', 'null'],
        description: 'Optional identifier for the customer receiving the refund'
      },
      amount: {
        bsonType: 'double',
        description: 'Amount to be refunded'
      },
      currency: {
        bsonType: 'string',
        description: 'Currency of the refund'
      },
      refundMethod: {
        enum: Object.values(RefundMethod),
        description: 'Method used for the refund (ORIGINAL_PAYMENT, BALANCE, OTHER)'
      },
      reasonCode: {
        bsonType: 'string',
        description: 'Standardized reason code for the refund'
      },
      reason: {
        bsonType: 'string',
        description: 'Detailed reason for the refund'
      },
      bankAccountId: {
        bsonType: ['string', 'null'],
        description: 'Bank account identifier if refundMethod is OTHER'
      },
      status: {
        enum: Object.values(RefundStatus),
        description: 'Current status of the refund request'
      },
      createdBy: {
        bsonType: 'string',
        description: 'User who created the refund request'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when the refund request was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when the refund request was last updated'
      },
      processedAt: {
        bsonType: ['date', 'null'],
        description: 'Timestamp when the refund was processed'
      },
      gatewayReference: {
        bsonType: ['string', 'null'],
        description: 'Reference ID from the payment gateway'
      },
      approvalId: {
        bsonType: ['string', 'null'],
        description: 'Reference to the approval workflow, if applicable'
      },
      metadata: {
        bsonType: ['object', 'null'],
        description: 'Additional metadata for the refund request'
      },
      supportingDocuments: {
        bsonType: ['array', 'null'],
        description: 'Array of supporting documents for the refund',
        items: {
          bsonType: 'object',
          required: ['documentId', 'documentType', 'uploadedAt', 'url'],
          properties: {
            documentId: {
              bsonType: 'string',
              description: 'Unique identifier for the document'
            },
            documentType: {
              bsonType: 'string',
              description: 'Type of document'
            },
            uploadedAt: {
              bsonType: 'date',
              description: 'Timestamp when the document was uploaded'
            },
            url: {
              bsonType: 'string',
              description: 'URL to access the document'
            }
          }
        }
      },
      statusHistory: {
        bsonType: 'array',
        description: 'History of status changes',
        items: {
          bsonType: 'object',
          required: ['status', 'timestamp', 'changedBy'],
          properties: {
            status: {
              enum: Object.values(RefundStatus),
              description: 'Status value'
            },
            timestamp: {
              bsonType: 'date',
              description: 'Timestamp when the status changed'
            },
            changedBy: {
              bsonType: 'string',
              description: 'User or system that changed the status'
            },
            reason: {
              bsonType: ['string', 'null'],
              description: 'Reason for status change, if applicable'
            }
          }
        }
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('refund_requests', {
    validator: {
      $jsonSchema: refundRequestSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('refund_requests');
  
  // Create indexes
  await collection.createIndex({ refundRequestId: 1 }, { unique: true });
  await collection.createIndex({ merchantId: 1, createdAt: -1 });
  await collection.createIndex({ status: 1, createdAt: -1 });
  await collection.createIndex({ transactionId: 1 });
  await collection.createIndex({ approvalId: 1 });
  
  logger.info('Successfully created refund_requests collection with indexes');
  
  return collection;
}

/**
 * Creates the refunds collection with schema validation and indexes
 */
async function createRefundsCollection(db: Db): Promise<Collection> {
  logger.info('Creating refunds collection...');
  
  // Define JSON schema for completed refunds
  const refundSchema = {
    bsonType: 'object',
    required: ['refundId', 'refundRequestId', 'merchantId', 'amount', 'currency', 'processedAt', 'gatewayReference'],
    properties: {
      refundId: {
        bsonType: 'string',
        description: 'Unique identifier for the completed refund'
      },
      refundRequestId: {
        bsonType: 'string',
        description: 'Reference to the original refund request'
      },
      merchantId: {
        bsonType: 'string',
        description: 'Identifier for the merchant'
      },
      transactionId: {
        bsonType: 'string',
        description: 'Reference to the original transaction'
      },
      amount: {
        bsonType: 'double',
        description: 'Final refunded amount'
      },
      currency: {
        bsonType: 'string',
        description: 'Currency of the refund'
      },
      refundMethod: {
        enum: Object.values(RefundMethod),
        description: 'Method used for the refund'
      },
      processedAt: {
        bsonType: 'date',
        description: 'Timestamp when the refund was processed'
      },
      settledAt: {
        bsonType: ['date', 'null'],
        description: 'Timestamp when the refund was settled'
      },
      gatewayReference: {
        bsonType: 'string',
        description: 'Reference ID from the payment gateway'
      },
      gatewayResponse: {
        bsonType: ['object', 'null'],
        description: 'Raw response data from the payment gateway'
      },
      fees: {
        bsonType: ['double', 'null'],
        description: 'Any fees associated with the refund'
      },
      metadata: {
        bsonType: ['object', 'null'],
        description: 'Additional metadata for the refund'
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('refunds', {
    validator: {
      $jsonSchema: refundSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('refunds');
  
  // Create indexes
  await collection.createIndex({ refundId: 1 }, { unique: true });
  await collection.createIndex({ refundRequestId: 1 }, { unique: true });
  await collection.createIndex({ merchantId: 1, processedAt: -1 });
  await collection.createIndex({ gatewayReference: 1 });
  await collection.createIndex({ transactionId: 1 });
  
  logger.info('Successfully created refunds collection with indexes');
  
  return collection;
}

/**
 * Creates the approval_requests collection with schema validation and indexes
 */
async function createApprovalRequestsCollection(db: Db): Promise<Collection> {
  logger.info('Creating approval_requests collection...');
  
  // Define JSON schema for approval requests
  const approvalRequestSchema = {
    bsonType: 'object',
    required: ['approvalId', 'refundRequestId', 'status', 'createdAt', 'updatedAt'],
    properties: {
      approvalId: {
        bsonType: 'string',
        description: 'Unique identifier for the approval request'
      },
      refundRequestId: {
        bsonType: 'string',
        description: 'Reference to the refund request requiring approval'
      },
      status: {
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'],
        description: 'Current status of the approval request'
      },
      escalationLevel: {
        bsonType: 'int',
        description: 'Current escalation level of the approval workflow'
      },
      escalationDue: {
        bsonType: ['date', 'null'],
        description: 'Timestamp when the current level will be escalated if no action is taken'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when the approval request was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when the approval request was last updated'
      },
      approvers: {
        bsonType: 'array',
        description: 'List of users who can approve this request',
        items: {
          bsonType: 'object',
          required: ['approverRole', 'escalationLevel', 'assignedAt'],
          properties: {
            approverRole: {
              bsonType: 'string',
              description: 'Role of the approver'
            },
            approverId: {
              bsonType: ['string', 'null'],
              description: 'Specific user ID of the approver, if known'
            },
            escalationLevel: {
              bsonType: 'int',
              description: 'Escalation level at which this approver can act'
            },
            assignedAt: {
              bsonType: 'date',
              description: 'Timestamp when the approver was assigned'
            },
            notifiedAt: {
              bsonType: ['date', 'null'],
              description: 'Timestamp when the approver was notified'
            }
          }
        }
      },
      decisions: {
        bsonType: 'array',
        description: 'Approval decisions made',
        items: {
          bsonType: 'object',
          required: ['approverId', 'decision', 'decidedAt'],
          properties: {
            approverId: {
              bsonType: 'string',
              description: 'ID of the user who made the decision'
            },
            decision: {
              enum: ['APPROVED', 'REJECTED'],
              description: 'Decision made'
            },
            decisionNotes: {
              bsonType: ['string', 'null'],
              description: 'Notes provided with the decision'
            },
            decidedAt: {
              bsonType: 'date',
              description: 'Timestamp when the decision was made'
            }
          }
        }
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('approval_requests', {
    validator: {
      $jsonSchema: approvalRequestSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('approval_requests');
  
  // Create indexes
  await collection.createIndex({ approvalId: 1 }, { unique: true });
  await collection.createIndex({ refundRequestId: 1 }, { unique: true });
  await collection.createIndex({ status: 1 });
  await collection.createIndex({ escalationLevel: 1 });
  await collection.createIndex({ escalationDue: 1 }, { sparse: true });
  await collection.createIndex({ 'approvers.approverId': 1 });
  
  logger.info('Successfully created approval_requests collection with indexes');
  
  return collection;
}

/**
 * Creates the bank_accounts collection with schema validation and indexes
 */
async function createBankAccountsCollection(db: Db): Promise<Collection> {
  logger.info('Creating bank_accounts collection...');
  
  // Define JSON schema for bank accounts
  const bankAccountSchema = {
    bsonType: 'object',
    required: ['bankAccountId', 'merchantId', 'accountHolderName', 'accountType', 'accountNumberHash', 'accountNumberEncrypted', 'accountNumberLast4', 'status', 'createdAt'],
    properties: {
      bankAccountId: {
        bsonType: 'string',
        description: 'Unique identifier for the bank account'
      },
      merchantId: {
        bsonType: 'string',
        description: 'Merchant who owns this bank account'
      },
      accountHolderName: {
        bsonType: 'string',
        description: 'Name of the account holder'
      },
      accountType: {
        enum: ['CHECKING', 'SAVINGS'],
        description: 'Type of bank account'
      },
      routingNumber: {
        bsonType: 'string',
        description: 'Routing number of the bank'
      },
      accountNumberHash: {
        bsonType: 'string',
        description: 'Hashed account number for lookups'
      },
      accountNumberEncrypted: {
        bsonType: 'string',
        description: 'Encrypted account number'
      },
      accountNumberLast4: {
        bsonType: 'string',
        description: 'Last 4 digits of account number'
      },
      encryptionKeyId: {
        bsonType: 'string',
        description: 'ID of the key used for encryption'
      },
      status: {
        enum: ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'],
        description: 'Current status of the bank account'
      },
      verificationStatus: {
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
        description: 'Verification status of the bank account'
      },
      verificationMethod: {
        enum: ['MICRO_DEPOSIT', 'INSTANT_VERIFICATION', 'MANUAL', null],
        description: 'Method used for verification'
      },
      isDefault: {
        bsonType: 'bool',
        description: 'Indicates if this is the default bank account for the merchant'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when the bank account was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when the bank account was last updated'
      },
      metadata: {
        bsonType: ['object', 'null'],
        description: 'Additional metadata for the bank account'
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('bank_accounts', {
    validator: {
      $jsonSchema: bankAccountSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('bank_accounts');
  
  // Create indexes
  await collection.createIndex({ bankAccountId: 1 }, { unique: true });
  await collection.createIndex({ merchantId: 1 });
  await collection.createIndex({ merchantId: 1, isDefault: 1 });
  await collection.createIndex({ accountNumberHash: 1 });
  
  logger.info('Successfully created bank_accounts collection with indexes');
  
  return collection;
}

/**
 * Creates the parameter-related collections with schema validation and indexes
 */
async function createParametersCollections(db: Db): Promise<void> {
  logger.info('Creating refund_parameters and parameter_definitions collections...');
  
  // Define JSON schema for refund parameters
  const refundParameterSchema = {
    bsonType: 'object',
    required: ['parameterId', 'entityType', 'entityId', 'parameterName', 'parameterValue', 'effectiveDate', 'createdBy'],
    properties: {
      parameterId: {
        bsonType: 'string',
        description: 'Unique identifier for the parameter value'
      },
      entityType: {
        enum: ['MERCHANT', 'ORGANIZATION', 'PROGRAM', 'BANK'],
        description: 'Type of entity this parameter applies to'
      },
      entityId: {
        bsonType: 'string',
        description: 'ID of the entity this parameter applies to'
      },
      parameterName: {
        bsonType: 'string',
        description: 'Name of the parameter'
      },
      parameterValue: {
        bsonType: ['string', 'int', 'double', 'bool', 'array', 'object'],
        description: 'Value of the parameter'
      },
      effectiveDate: {
        bsonType: 'date',
        description: 'Date when this parameter value becomes effective'
      },
      expirationDate: {
        bsonType: ['date', 'null'],
        description: 'Date when this parameter value expires'
      },
      version: {
        bsonType: 'int',
        description: 'Version number of this parameter value'
      },
      createdBy: {
        bsonType: 'string',
        description: 'User who created this parameter value'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when this parameter value was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when this parameter value was last updated'
      }
    }
  };
  
  // Define JSON schema for parameter definitions
  const parameterDefinitionSchema = {
    bsonType: 'object',
    required: ['parameterName', 'description', 'dataType', 'createdAt'],
    properties: {
      parameterName: {
        bsonType: 'string',
        description: 'Unique name of the parameter'
      },
      description: {
        bsonType: 'string',
        description: 'Description of the parameter'
      },
      dataType: {
        enum: ['string', 'integer', 'decimal', 'boolean', 'json', 'array'],
        description: 'Data type of the parameter'
      },
      defaultValue: {
        bsonType: ['string', 'int', 'double', 'bool', 'array', 'object', 'null'],
        description: 'Default value of the parameter'
      },
      validationRules: {
        bsonType: ['array', 'null'],
        description: 'Rules for validating parameter values',
        items: {
          bsonType: 'object',
          properties: {
            type: {
              enum: ['range', 'pattern', 'enum', 'length', 'custom'],
              description: 'Type of validation rule'
            }
          }
        }
      },
      overridable: {
        bsonType: 'bool',
        description: 'Whether this parameter can be overridden at lower levels'
      },
      category: {
        bsonType: ['string', 'null'],
        description: 'Category the parameter belongs to'
      },
      sensitivity: {
        enum: ['public', 'internal', 'sensitive', 'restricted'],
        description: 'Sensitivity level of the parameter'
      },
      auditRequired: {
        bsonType: 'bool',
        description: 'Whether changes to this parameter require audit logging'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when this parameter definition was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when this parameter definition was last updated'
      }
    }
  };
  
  // Create refund_parameters collection with schema validation
  await db.createCollection('refund_parameters', {
    validator: {
      $jsonSchema: refundParameterSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  // Create parameter_definitions collection with schema validation
  await db.createCollection('parameter_definitions', {
    validator: {
      $jsonSchema: parameterDefinitionSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  // Create indexes for refund_parameters
  const refundParametersCollection = db.collection('refund_parameters');
  await refundParametersCollection.createIndex({ parameterId: 1 }, { unique: true });
  await refundParametersCollection.createIndex({ entityType: 1, entityId: 1, parameterName: 1, version: 1 }, { unique: true });
  await refundParametersCollection.createIndex({ parameterName: 1 });
  await refundParametersCollection.createIndex({ effectiveDate: 1 });
  await refundParametersCollection.createIndex({ expirationDate: 1 }, { sparse: true });
  
  // Create indexes for parameter_definitions
  const parameterDefinitionsCollection = db.collection('parameter_definitions');
  await parameterDefinitionsCollection.createIndex({ parameterName: 1 }, { unique: true });
  await parameterDefinitionsCollection.createIndex({ category: 1 }, { sparse: true });
  
  logger.info('Successfully created parameter collections with indexes');
}

/**
 * Creates the compliance_rules collection with schema validation and indexes
 */
async function createComplianceRulesCollection(db: Db): Promise<Collection> {
  logger.info('Creating compliance_rules collection...');
  
  // Define JSON schema for compliance rules
  const complianceRuleSchema = {
    bsonType: 'object',
    required: ['ruleId', 'ruleType', 'description', 'evaluation', 'active', 'createdAt'],
    properties: {
      ruleId: {
        bsonType: 'string',
        description: 'Unique identifier for the compliance rule'
      },
      providerType: {
        bsonType: 'string',
        description: 'Type of rule provider (e.g., CARD_NETWORK, REGULATORY, MERCHANT)'
      },
      ruleType: {
        bsonType: 'string',
        description: 'Type of compliance rule'
      },
      entityType: {
        bsonType: ['string', 'null'],
        description: 'Type of entity this rule applies to'
      },
      entityId: {
        bsonType: ['string', 'null'],
        description: 'ID of the entity this rule applies to'
      },
      ruleName: {
        bsonType: 'string',
        description: 'Name of the rule'
      },
      description: {
        bsonType: 'string',
        description: 'Description of the rule'
      },
      evaluation: {
        bsonType: 'object',
        description: 'Rule evaluation logic',
        required: ['type'],
        properties: {
          type: {
            enum: ['timeframe', 'comparison', 'regex', 'logical', 'custom'],
            description: 'Type of evaluation logic'
          }
        }
      },
      violationCode: {
        bsonType: 'string',
        description: 'Code to be returned when rule is violated'
      },
      violationMessage: {
        bsonType: 'string',
        description: 'Message to be displayed when rule is violated'
      },
      severity: {
        enum: ['INFO', 'WARNING', 'ERROR'],
        description: 'Severity of the rule violation'
      },
      remediation: {
        bsonType: ['string', 'null'],
        description: 'Suggested remediation for rule violation'
      },
      active: {
        bsonType: 'bool',
        description: 'Whether this rule is currently active'
      },
      effectiveDate: {
        bsonType: ['date', 'null'],
        description: 'Date when this rule becomes effective'
      },
      expirationDate: {
        bsonType: ['date', 'null'],
        description: 'Date when this rule expires'
      },
      cardNetwork: {
        bsonType: ['string', 'null'],
        description: 'Card network this rule applies to, if applicable'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when this rule was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when this rule was last updated'
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('compliance_rules', {
    validator: {
      $jsonSchema: complianceRuleSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('compliance_rules');
  
  // Create indexes
  await collection.createIndex({ ruleId: 1 }, { unique: true });
  await collection.createIndex({ ruleType: 1, entityType: 1, entityId: 1 });
  await collection.createIndex({ cardNetwork: 1 }, { sparse: true });
  await collection.createIndex({ active: 1 });
  await collection.createIndex({ effectiveDate: 1 }, { sparse: true });
  await collection.createIndex({ expirationDate: 1 }, { sparse: true });
  
  logger.info('Successfully created compliance_rules collection with indexes');
  
  return collection;
}

/**
 * Creates the audit_logs collection with schema validation and indexes
 */
async function createAuditLogsCollection(db: Db): Promise<Collection> {
  logger.info('Creating audit_logs collection...');
  
  // Define JSON schema for audit logs
  const auditLogSchema = {
    bsonType: 'object',
    required: ['auditId', 'entityType', 'entityId', 'action', 'performedBy', 'timestamp'],
    properties: {
      auditId: {
        bsonType: 'string',
        description: 'Unique identifier for the audit log entry'
      },
      entityType: {
        bsonType: 'string',
        description: 'Type of entity being audited'
      },
      entityId: {
        bsonType: 'string',
        description: 'ID of the entity being audited'
      },
      action: {
        bsonType: 'string',
        description: 'Action performed on the entity'
      },
      performedBy: {
        bsonType: 'string',
        description: 'User who performed the action'
      },
      timestamp: {
        bsonType: 'date',
        description: 'Timestamp when the action was performed'
      },
      previousState: {
        bsonType: ['object', 'null'],
        description: 'State of the entity before the action'
      },
      newState: {
        bsonType: ['object', 'null'],
        description: 'State of the entity after the action'
      },
      changeReason: {
        bsonType: ['string', 'null'],
        description: 'Reason for the change'
      },
      metadata: {
        bsonType: ['object', 'null'],
        description: 'Additional metadata for the audit log entry'
      },
      ipAddress: {
        bsonType: ['string', 'null'],
        description: 'IP address of the user who performed the action'
      },
      userAgent: {
        bsonType: ['string', 'null'],
        description: 'User agent of the user who performed the action'
      }
    }
  };
  
  // Create collection with schema validation
  await db.createCollection('audit_logs', {
    validator: {
      $jsonSchema: auditLogSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  const collection = db.collection('audit_logs');
  
  // Create indexes
  await collection.createIndex({ auditId: 1 }, { unique: true });
  await collection.createIndex({ entityType: 1, entityId: 1 });
  await collection.createIndex({ performedBy: 1 });
  await collection.createIndex({ timestamp: 1 });
  await collection.createIndex({ entityType: 1, action: 1 });
  
  // Create TTL index for automatic archiving of older audit logs
  // 7 years retention = 2556 days
  await collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 220838400 });
  
  logger.info('Successfully created audit_logs collection with indexes');
  
  return collection;
}

/**
 * Creates the notification-related collections with schema validation and indexes
 */
async function createNotificationCollections(db: Db): Promise<void> {
  logger.info('Creating notification_templates and notifications collections...');
  
  // Define JSON schema for notification templates
  const notificationTemplateSchema = {
    bsonType: 'object',
    required: ['templateId', 'name', 'notificationType', 'channels', 'bodyTemplate', 'createdAt'],
    properties: {
      templateId: {
        bsonType: 'string',
        description: 'Unique identifier for the notification template'
      },
      name: {
        bsonType: 'string',
        description: 'Name of the template'
      },
      notificationType: {
        bsonType: 'string',
        description: 'Type of notification this template is for'
      },
      channels: {
        bsonType: 'array',
        description: 'Channels this template can be used for',
        items: {
          enum: ['EMAIL', 'SMS', 'IN_APP']
        }
      },
      subjectTemplate: {
        bsonType: ['string', 'null'],
        description: 'Template for notification subject'
      },
      bodyTemplate: {
        bsonType: 'string',
        description: 'Template for notification body'
      },
      htmlTemplate: {
        bsonType: ['string', 'null'],
        description: 'HTML template for email notifications'
      },
      variables: {
        bsonType: ['array', 'null'],
        description: 'Variables used in the template',
        items: {
          bsonType: 'string'
        }
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when this template was created'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Timestamp when this template was last updated'
      }
    }
  };
  
  // Define JSON schema for notifications
  const notificationSchema = {
    bsonType: 'object',
    required: ['notificationId', 'userId', 'notificationType', 'channel', 'status', 'body', 'createdAt'],
    properties: {
      notificationId: {
        bsonType: 'string',
        description: 'Unique identifier for the notification'
      },
      userId: {
        bsonType: 'string',
        description: 'User who will receive the notification'
      },
      notificationType: {
        bsonType: 'string',
        description: 'Type of notification'
      },
      channel: {
        enum: ['EMAIL', 'SMS', 'IN_APP'],
        description: 'Channel used for the notification'
      },
      status: {
        enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
        description: 'Current status of the notification'
      },
      subject: {
        bsonType: ['string', 'null'],
        description: 'Subject of the notification'
      },
      body: {
        bsonType: 'string',
        description: 'Body of the notification'
      },
      scheduledTime: {
        bsonType: ['date', 'null'],
        description: 'Time when the notification is scheduled to be sent'
      },
      sentTime: {
        bsonType: ['date', 'null'],
        description: 'Time when the notification was sent'
      },
      deliveryStatus: {
        bsonType: ['string', 'null'],
        description: 'Detailed status from the delivery provider'
      },
      deliveryDetails: {
        bsonType: ['object', 'null'],
        description: 'Detailed information about the delivery'
      },
      context: {
        bsonType: ['object', 'null'],
        description: 'Context data used to generate the notification'
      },
      readAt: {
        bsonType: ['date', 'null'],
        description: 'Time when the notification was read'
      },
      referenceId: {
        bsonType: ['string', 'null'],
        description: 'ID of the entity this notification refers to'
      },
      referenceType: {
        bsonType: ['string', 'null'],
        description: 'Type of entity this notification refers to'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Timestamp when this notification was created'
      }
    }
  };
  
  // Create notification_templates collection with schema validation
  await db.createCollection('notification_templates', {
    validator: {
      $jsonSchema: notificationTemplateSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  // Create notifications collection with schema validation
  await db.createCollection('notifications', {
    validator: {
      $jsonSchema: notificationSchema
    },
    validationLevel: 'strict',
    validationAction: 'error'
  });
  
  // Create indexes for notification_templates
  const notificationTemplatesCollection = db.collection('notification_templates');
  await notificationTemplatesCollection.createIndex({ templateId: 1 }, { unique: true });
  await notificationTemplatesCollection.createIndex({ notificationType: 1, channels: 1 });
  
  // Create indexes for notifications
  const notificationsCollection = db.collection('notifications');
  await notificationsCollection.createIndex({ notificationId: 1 }, { unique: true });
  await notificationsCollection.createIndex({ userId: 1, createdAt: -1 });
  await notificationsCollection.createIndex({ userId: 1, status: 1 });
  await notificationsCollection.createIndex({ notificationType: 1 });
  await notificationsCollection.createIndex({ referenceId: 1, referenceType: 1 });
  await notificationsCollection.createIndex({ scheduledTime: 1 }, { sparse: true });
  
  // Create TTL index for old notifications
  // 90 days retention
  await notificationsCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
  
  logger.info('Successfully created notification collections with indexes');
}