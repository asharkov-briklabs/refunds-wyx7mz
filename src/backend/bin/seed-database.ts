// src/backend/bin/seed-database.ts
import mongoose from 'mongoose'; // mongoose ^6.0.0
import { connect, disconnect } from '../database/connection';
import { logger } from '../common/utils/logger';
import Parameter, { ParameterEntityType } from '../database/models/parameter.model';
import { BankAccountModel } from '../database/models/bank-account.model';
import { BankAccountType, BankAccountStatus, BankAccountVerificationStatus } from '../common/interfaces/bank-account.interface';
import { ComplianceRuleModel, RuleType, EntityType, ProviderType } from '../database/models/compliance-rule.model';
import { RefundRequestModel } from '../database/models/refund-request.model';
import { RefundStatus } from '../common/enums/refund-status.enum';
import { RefundMethod } from '../common/enums/refund-method.enum';
import { hashData } from '../common/utils/encryption-utils';
import yargs from 'yargs'; // yargs ^17.0.0
import { faker } from '@faker-js/faker'; // @faker-js/faker ^8.0.0

/**
 * Main function that orchestrates the database seeding process
 */
async function main(): Promise<void> {
  // Parse command line arguments using yargs
  const argv = yargs(process.argv.slice(2))
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Force re-seeding of the database (cleanup existing data)'
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  // Establish database connection
  await connect();

  // Log start of seeding process
  logger.info('Starting database seeding process...');

  // Call seedParameters()
  await seedParameters();

  // Call seedComplianceRules()
  await seedComplianceRules();

  // Call seedBankAccounts()
  await seedBankAccounts();

  // Call seedRefundRequests()
  await seedRefundRequests();

  // Log successful completion
  logger.info('Database seeding completed successfully.');

  // Disconnect from database
  await disconnect();

  // Exit process with success code
  process.exit(0);
}

/**
 * Populates the parameters collection with default configuration values
 */
async function seedParameters(): Promise<void> {
  // Log start of parameter seeding
  logger.info('Seeding parameters collection...');

  // Clean up existing parameter data if --force flag is used
  if (argv.force) {
    await cleanupCollection(Parameter, 'parameters');
  }

  // Create system-level default parameters (maxRefundAmount, refundTimeLimit, etc.)
  await createDefaultParameters(ParameterEntityType.SYSTEM, 'system');

  // Create bank-level parameters for 'First National Bank'
  await createDefaultParameters(ParameterEntityType.BANK, 'bank_first_national');

  // Create program-level parameters for 'Enterprise Retail Program'
  await createDefaultParameters(ParameterEntityType.PROGRAM, 'program_enterprise_retail');

  // Create organization-level parameters for 'TechCorp'
  await createDefaultParameters(ParameterEntityType.ORGANIZATION, 'org_techcorp');

  // Generate test merchant IDs and names
  const testMerchants = generateTestMerchants();

  // Create merchant-level parameters for multiple test merchants
  for (const merchant of testMerchants) {
    await createDefaultParameters(ParameterEntityType.MERCHANT, merchant.id);
  }

  // Log completion of parameter seeding
  logger.info('Parameters collection seeded successfully.');
}

/**
 * Populates the compliance rules collection with card network and regulatory rules
 */
async function seedComplianceRules(): Promise<void> {
  // Log start of compliance rule seeding
  logger.info('Seeding compliance rules collection...');

  // Clean up existing rule data if --force flag is used
  if (argv.force) {
    await cleanupCollection(ComplianceRuleModel, 'compliance_rules');
  }

  // Create VISA card network rules (timeframes, amounts, methods)
  await createCardNetworkRules('VISA', {
    timeLimitDays: 120,
    amountRestriction: 'original_transaction',
    allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE'],
    documentationRequired: true
  });

  // Create Mastercard card network rules
  await createCardNetworkRules('MASTERCARD', {
    timeLimitDays: 180,
    amountRestriction: 'original_transaction',
    allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE'],
    documentationRequired: false
  });

  // Create American Express card network rules
  await createCardNetworkRules('AMERICAN_EXPRESS', {
    timeLimitDays: 90,
    amountRestriction: 'original_transaction',
    allowedMethods: ['ORIGINAL_PAYMENT'],
    documentationRequired: true
  });

  // Create Discover card network rules
  await createCardNetworkRules('DISCOVER', {
    timeLimitDays: 150,
    amountRestriction: 'original_transaction',
    allowedMethods: ['ORIGINAL_PAYMENT', 'BALANCE', 'OTHER'],
    documentationRequired: false
  });

  // Create regulatory compliance rules
  // Example: KYC/AML checks for refunds over $10,000
  const regulatoryRule = new ComplianceRuleModel({
    rule_id: 'regulatory_001',
    rule_type: RuleType.AMOUNT,
    rule_name: 'KYC/AML Check',
    description: 'KYC/AML checks required for refunds over $10,000',
    provider_type: ProviderType.REGULATORY,
    entity_type: EntityType.REGULATORY,
    entity_id: 'global',
    evaluation: {
      amountThreshold: 10000,
      currency: 'USD'
    },
    violation_code: 'KYC_AML_REQUIRED',
    violation_message: 'KYC/AML checks are required for refunds over $10,000',
    severity: 'ERROR',
    remediation: 'Perform KYC/AML checks before processing the refund',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await regulatoryRule.save();

  // Create merchant-specific compliance rules
  // Example: Require manager approval for refunds over $500 for a specific merchant
  const merchantRule = new ComplianceRuleModel({
    rule_id: 'merchant_001',
    rule_type: RuleType.AMOUNT,
    rule_name: 'Manager Approval Required',
    description: 'Manager approval required for refunds over $500',
    provider_type: ProviderType.MERCHANT,
    entity_type: EntityType.MERCHANT,
    entity_id: 'mer_abcdef',
    evaluation: {
      amountThreshold: 500,
      currency: 'USD'
    },
    violation_code: 'MANAGER_APPROVAL_REQUIRED',
    violation_message: 'Manager approval is required for refunds over $500',
    severity: 'WARNING',
    remediation: 'Obtain manager approval before processing the refund',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await merchantRule.save();

  // Log completion of compliance rule seeding
  logger.info('Compliance rules collection seeded successfully.');
}

/**
 * Populates the bank accounts collection with test accounts for merchants
 */
async function seedBankAccounts(): Promise<void> {
  // Log start of bank account seeding
  logger.info('Seeding bank accounts collection...');

  // Clean up existing bank account data if --force flag is used
  if (argv.force) {
    await cleanupCollection(BankAccountModel, 'bank_accounts');
  }

  // Generate test merchant IDs and names
  const testMerchants = generateTestMerchants();

  // Create bank accounts for test merchants with various statuses
  for (const merchant of testMerchants) {
    // Generate test account data using faker
    const accountHolderName = faker.person.fullName();
    const routingNumber = faker.finance.routingNumber();
    const accountNumber = faker.finance.accountNumber();

    // Encrypt sensitive account data using hashData utility
    const accountNumberHash = await hashData(accountNumber);
    const accountNumberEncrypted = 'ENCRYPTED_ACCOUNT_NUMBER'; // Placeholder for actual encryption

    // Create bank accounts for test merchants with various statuses
    const bankAccount1 = new BankAccountModel({
      accountId: `acct_${faker.string.uuid().replace(/-/g, '')}`,
      merchantId: merchant.id,
      accountHolderName: accountHolderName,
      accountType: BankAccountType.CHECKING,
      routingNumber: routingNumber,
      accountNumberHash: accountNumberHash,
      accountNumberEncrypted: accountNumberEncrypted,
      accountNumberLast4: accountNumber.slice(-4),
      encryptionKeyId: 'kms_key_id',
      status: BankAccountStatus.ACTIVE,
      verificationStatus: BankAccountVerificationStatus.VERIFIED,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await bankAccount1.save();

    const bankAccount2 = new BankAccountModel({
      accountId: `acct_${faker.string.uuid().replace(/-/g, '')}`,
      merchantId: merchant.id,
      accountHolderName: accountHolderName,
      accountType: BankAccountType.SAVINGS,
      routingNumber: routingNumber,
      accountNumberHash: accountNumberHash,
      accountNumberEncrypted: accountNumberEncrypted,
      accountNumberLast4: accountNumber.slice(-4),
      encryptionKeyId: 'kms_key_id',
      status: BankAccountStatus.ACTIVE,
      verificationStatus: BankAccountVerificationStatus.PENDING,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await bankAccount2.save();
  }

  // Log completion of bank account seeding
  logger.info('Bank accounts collection seeded successfully.');
}

/**
 * Populates the refund requests collection with test refunds in various statuses
 */
async function seedRefundRequests(): Promise<void> {
  // Log start of refund request seeding
  logger.info('Seeding refund requests collection...');

  // Clean up existing refund request data if --force flag is used
  if (argv.force) {
    await cleanupCollection(RefundRequestModel, 'refund_requests');
  }

  // Generate test transaction IDs and customer data
  const testTransactionIds = Array.from({ length: 20 }, () => `txn_${faker.string.alphanumeric(16)}`);
  const testCustomerIds = Array.from({ length: 10 }, () => `cus_${faker.string.alphanumeric(16)}`);

  // Generate test merchant IDs and names
  const testMerchants = generateTestMerchants();

  // Create refund requests in various statuses (DRAFT, SUBMITTED, PROCESSING, etc.)
  for (let i = 0; i < 50; i++) {
    const refundStatus = faker.helpers.enumValue(RefundStatus);
    const refundMethod = faker.helpers.enumValue(RefundMethod);
    const merchant = faker.helpers.arrayElement(testMerchants);

    const refundRequest = new RefundRequestModel({
      refundRequestId: `req_${faker.string.uuid().replace(/-/g, '')}`,
      transactionId: faker.helpers.arrayElement(testTransactionIds),
      merchantId: merchant.id,
      customerId: faker.helpers.arrayElement(testCustomerIds),
      amount: faker.number.float({ min: 1, max: 1000, precision: 2 }),
      currency: 'USD',
      refundMethod: refundMethod,
      reasonCode: 'CUSTOMER_REQUEST',
      reason: faker.lorem.sentence(),
      status: refundStatus,
      createdBy: 'system',
      createdAt: faker.date.past(),
      updatedAt: new Date(),
      statusHistory: [],
      supportingDocuments: [],
      metadata: {}
    });

    // Add status history entries to track state transitions
    if (refundStatus !== RefundStatus.DRAFT) {
      refundRequest.addStatusHistoryEntry(RefundStatus.DRAFT, 'system');
      refundRequest.addStatusHistoryEntry(refundStatus, 'system');
    }

    // Set appropriate timestamps based on status
    if (refundStatus === RefundStatus.SUBMITTED) {
      refundRequest.submitedAt = new Date();
    } else if (refundStatus === RefundStatus.PROCESSING) {
      refundRequest.submitedAt = new Date();
      refundRequest.processedAt = new Date();
    } else if (refundStatus === RefundStatus.COMPLETED) {
      refundRequest.submitedAt = new Date();
      refundRequest.processedAt = new Date();
      refundRequest.completedAt = new Date();
    }

    await refundRequest.save();
  }

  // Log completion of refund request seeding
  logger.info('Refund requests collection seeded successfully.');
}

/**
 * Helper function to create a set of default parameters
 * @param entityType 
 * @param entityId 
 */
async function createDefaultParameters(entityType: ParameterEntityType, entityId: string): Promise<void> {
  // Create maxRefundAmount parameter
  const maxRefundAmount = new Parameter({
    parameterName: 'maxRefundAmount',
    entityType: entityType,
    entityId: entityId,
    value: 1000,
    version: 1,
    effectiveDate: new Date(),
    expirationDate: null,
    overridable: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Maximum refund amount allowed'
  });
  await maxRefundAmount.save();

  // Create refundTimeLimit parameter
  const refundTimeLimit = new Parameter({
    parameterName: 'refundTimeLimit',
    entityType: entityType,
    entityId: entityId,
    value: 90,
    version: 1,
    effectiveDate: new Date(),
    expirationDate: null,
    overridable: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Maximum time (in days) after transaction to allow refunds'
  });
  await refundTimeLimit.save();

  // Create approvalThreshold parameter
  const approvalThreshold = new Parameter({
    parameterName: 'approvalThreshold',
    entityType: entityType,
    entityId: entityId,
    value: 500,
    version: 1,
    effectiveDate: new Date(),
    expirationDate: null,
    overridable: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Amount above which refunds require approval'
  });
  await approvalThreshold.save();

  // Create allowedMethods parameter
  const allowedMethods = new Parameter({
    parameterName: 'allowedMethods',
    entityType: entityType,
    entityId: entityId,
    value: ['ORIGINAL_PAYMENT', 'BALANCE'],
    version: 1,
    effectiveDate: new Date(),
    expirationDate: null,
    overridable: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Allowed refund methods'
  });
  await allowedMethods.save();

  // Create requireDocumentation parameter
  const requireDocumentation = new Parameter({
    parameterName: 'requireDocumentation',
    entityType: entityType,
    entityId: entityId,
    value: true,
    version: 1,
    effectiveDate: new Date(),
    expirationDate: null,
    overridable: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Whether documentation is required for refunds'
  });
  await requireDocumentation.save();
}

/**
 * Helper function to create rules for a specific card network
 * @param networkName 
 * @param ruleConfig 
 */
async function createCardNetworkRules(networkName: string, ruleConfig: any): Promise<void> {
  // Create time limit rule for the card network
  const timeLimitRule = new ComplianceRuleModel({
    rule_id: `time_limit_${networkName}`,
    rule_type: RuleType.TIMEFRAME,
    rule_name: `${networkName} Time Limit`,
    description: `Maximum time after transaction for refund processing for ${networkName}`,
    provider_type: ProviderType.CARD_NETWORK,
    entity_type: EntityType.CARD_NETWORK,
    entity_id: networkName,
    evaluation: {
      timeLimitDays: ruleConfig.timeLimitDays
    },
    violation_code: 'REFUND_TIME_LIMIT_EXCEEDED',
    violation_message: `Refund time limit exceeded for ${networkName}`,
    severity: 'ERROR',
    remediation: 'Use alternative refund method',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await timeLimitRule.save();

  // Create amount restriction rule for the card network
  const amountRestrictionRule = new ComplianceRuleModel({
    rule_id: `amount_restriction_${networkName}`,
    rule_type: RuleType.AMOUNT,
    rule_name: `${networkName} Amount Restriction`,
    description: `Amount restriction for refunds for ${networkName}`,
    provider_type: ProviderType.CARD_NETWORK,
    entity_type: EntityType.CARD_NETWORK,
    entity_id: networkName,
    evaluation: {
      amountRestriction: ruleConfig.amountRestriction
    },
    violation_code: 'REFUND_AMOUNT_INVALID',
    violation_message: `Refund amount is invalid for ${networkName}`,
    severity: 'ERROR',
    remediation: 'Adjust refund amount',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await amountRestrictionRule.save();

  // Create method restriction rule for the card network
  const methodRestrictionRule = new ComplianceRuleModel({
    rule_id: `method_restriction_${networkName}`,
    rule_type: RuleType.METHOD,
    rule_name: `${networkName} Method Restriction`,
    description: `Method restriction for refunds for ${networkName}`,
    provider_type: ProviderType.CARD_NETWORK,
    entity_type: EntityType.CARD_NETWORK,
    entity_id: networkName,
    evaluation: {
      allowedMethods: ruleConfig.allowedMethods
    },
    violation_code: 'REFUND_METHOD_INVALID',
    violation_message: `Refund method is invalid for ${networkName}`,
    severity: 'ERROR',
    remediation: 'Use allowed refund method',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await methodRestrictionRule.save();

  // Create documentation requirement rule for the card network
  const documentationRequirementRule = new ComplianceRuleModel({
    rule_id: `documentation_requirement_${networkName}`,
    rule_type: RuleType.DOCUMENTATION,
    rule_name: `${networkName} Documentation Requirement`,
    description: `Documentation requirement for refunds for ${networkName}`,
    provider_type: ProviderType.CARD_NETWORK,
    entity_type: EntityType.CARD_NETWORK,
    entity_id: networkName,
    evaluation: {
      documentationRequired: ruleConfig.documentationRequired
    },
    violation_code: 'REFUND_DOCUMENTATION_REQUIRED',
    violation_message: `Documentation is required for refunds for ${networkName}`,
    severity: 'WARNING',
    remediation: 'Provide required documentation',
    effective_date: new Date(),
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  });
  await documentationRequirementRule.save();
}

/**
 * Helper function to generate test merchant IDs and names
 */
function generateTestMerchants(): { id: string; name: string }[] {
  // Generate array of 5-10 test merchants
  const numMerchants = faker.number.int({ min: 5, max: 10 });
  const merchants = Array.from({ length: numMerchants }, (_, i) => {
    // Assign consistent merchant IDs with 'mer_' prefix
    const merchantId = `mer_${faker.string.alphanumeric(8)}`;

    // Assign realistic merchant names using faker
    const merchantName = faker.company.name();

    return { id: merchantId, name: merchantName };
  });

  return merchants;
}

/**
 * Helper function to clean up a collection before seeding
 * @param model 
 * @param collectionName 
 */
async function cleanupCollection(model: mongoose.Model<any>, collectionName: string): Promise<void> {
  // Log cleanup attempt for collection
  logger.info(`Cleaning up collection: ${collectionName}`);

  // Delete all documents in the collection
  await model.deleteMany({});

  // Log successful cleanup
  logger.info(`Collection ${collectionName} cleaned successfully.`);
}

// Execute the main function
main().catch((error) => {
  logger.error('Error occurred during database seeding:', error);
  process.exit(1);
});