import { Db, Collection } from 'mongodb'; // mongodb ^6.0.0
import { getDb } from '../../../database/connection';
import { logger } from '../../../common/utils/logger';

/**
 * Adds optimized indices to the refund_requests collection
 * 
 * @param db - MongoDB database instance
 */
async function addRefundRequestIndices(db: Db): Promise<void> {
  logger.info('Adding indices to refund_requests collection');
  const collection = db.collection('refund_requests');
  
  // Create compound index on status, createdAt, and merchantId for efficient filtering
  await collection.createIndex(
    { status: 1, createdAt: -1, merchantId: 1 },
    { name: 'status_createdAt_merchantId' }
  );
  
  // Create compound index on customerId and createdAt for customer history
  await collection.createIndex(
    { customerId: 1, createdAt: -1 },
    { name: 'customerId_createdAt' }
  );
  
  // Create compound index on createdAt and refundMethod for analytics queries
  await collection.createIndex(
    { createdAt: -1, refundMethod: 1 },
    { name: 'createdAt_refundMethod' }
  );
  
  // Create compound index on status and amount for amount-based filtering
  await collection.createIndex(
    { status: 1, amount: 1 },
    { name: 'status_amount' }
  );
  
  // Create text index on reason field for full-text search capabilities
  await collection.createIndex(
    { reason: 'text' },
    { name: 'reason_text' }
  );
  
  logger.info('Successfully added indices to refund_requests collection');
}

/**
 * Adds optimized indices to the refunds collection
 * 
 * @param db - MongoDB database instance
 */
async function addRefundIndices(db: Db): Promise<void> {
  logger.info('Adding indices to refunds collection');
  const collection = db.collection('refunds');
  
  // Create compound index on merchantId and completedAt for merchant reporting
  await collection.createIndex(
    { merchantId: 1, completedAt: -1 },
    { name: 'merchantId_completedAt' }
  );
  
  // Create compound index on completedAt and amount for financial reporting
  await collection.createIndex(
    { completedAt: -1, amount: 1 },
    { name: 'completedAt_amount' }
  );
  
  // Create compound index on gatewayReference and refundMethod for reconciliation
  await collection.createIndex(
    { gatewayReference: 1, refundMethod: 1 },
    { name: 'gatewayReference_refundMethod' }
  );
  
  logger.info('Successfully added indices to refunds collection');
}

/**
 * Adds optimized indices to the approval_requests collection
 * 
 * @param db - MongoDB database instance
 */
async function addApprovalRequestIndices(db: Db): Promise<void> {
  logger.info('Adding indices to approval_requests collection');
  const collection = db.collection('approval_requests');
  
  // Create compound index on status and escalationLevel for approval workflow
  await collection.createIndex(
    { status: 1, escalationLevel: 1 },
    { name: 'status_escalationLevel' }
  );
  
  // Create compound index on escalationDue and status for escalation scheduling
  await collection.createIndex(
    { escalationDue: 1, status: 1 },
    { name: 'escalationDue_status' }
  );
  
  // Create index on approvers for approver-based queries
  await collection.createIndex(
    { 'approvers.approver_id': 1 },
    { name: 'approvers_id' }
  );
  
  logger.info('Successfully added indices to approval_requests collection');
}

/**
 * Adds optimized indices to the bank_accounts collection
 * 
 * @param db - MongoDB database instance
 */
async function addBankAccountIndices(db: Db): Promise<void> {
  logger.info('Adding indices to bank_accounts collection');
  const collection = db.collection('bank_accounts');
  
  // Create compound index on merchantId and status for active account filtering
  await collection.createIndex(
    { merchantId: 1, status: 1 },
    { name: 'merchantId_status' }
  );
  
  // Create compound index on verificationStatus and merchantId for verification queries
  await collection.createIndex(
    { verificationStatus: 1, merchantId: 1 },
    { name: 'verificationStatus_merchantId' }
  );
  
  logger.info('Successfully added indices to bank_accounts collection');
}

/**
 * Applies the migration by adding optimized indices to refund-related collections
 */
async function up(): Promise<void> {
  logger.info('Starting migration: adding indices to refund-related collections');
  const db = await getDb();
  
  try {
    // Add indices to all collections
    await addRefundRequestIndices(db);
    await addRefundIndices(db);
    await addApprovalRequestIndices(db);
    await addBankAccountIndices(db);
    
    logger.info('Migration completed successfully: added indices to refund-related collections');
  } catch (error) {
    logger.error('Migration failed: error adding indices to refund-related collections', { error });
    throw error;
  }
}

/**
 * Rolls back the migration by dropping the added indices
 */
async function down(): Promise<void> {
  logger.info('Starting rollback: removing indices from refund-related collections');
  const db = await getDb();
  
  try {
    // Drop indices from refund_requests collection
    const refundRequestsCollection = db.collection('refund_requests');
    await refundRequestsCollection.dropIndex('status_createdAt_merchantId');
    await refundRequestsCollection.dropIndex('customerId_createdAt');
    await refundRequestsCollection.dropIndex('createdAt_refundMethod');
    await refundRequestsCollection.dropIndex('status_amount');
    await refundRequestsCollection.dropIndex('reason_text');
    
    // Drop indices from refunds collection
    const refundsCollection = db.collection('refunds');
    await refundsCollection.dropIndex('merchantId_completedAt');
    await refundsCollection.dropIndex('completedAt_amount');
    await refundsCollection.dropIndex('gatewayReference_refundMethod');
    
    // Drop indices from approval_requests collection
    const approvalRequestsCollection = db.collection('approval_requests');
    await approvalRequestsCollection.dropIndex('status_escalationLevel');
    await approvalRequestsCollection.dropIndex('escalationDue_status');
    await approvalRequestsCollection.dropIndex('approvers_id');
    
    // Drop indices from bank_accounts collection
    const bankAccountsCollection = db.collection('bank_accounts');
    await bankAccountsCollection.dropIndex('merchantId_status');
    await bankAccountsCollection.dropIndex('verificationStatus_merchantId');
    
    logger.info('Rollback completed successfully: removed indices from refund-related collections');
  } catch (error) {
    logger.error('Rollback failed: error removing indices from refund-related collections', { error });
    throw error;
  }
}

// Export migration functions as named exports and default export
export { up, down };
export default { up, down };