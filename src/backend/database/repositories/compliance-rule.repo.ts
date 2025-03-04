import mongoose from 'mongoose'; // mongoose ^6.0.0
import {
  ComplianceRuleModel,
  IComplianceRuleDocument,
  IComplianceRule,
  RuleType,
  EntityType,
  ProviderType
} from '../models/compliance-rule.model';
import { getConnection } from '../connection';
import { logger } from '../../common/utils/logger';

/**
 * Repository class that provides methods for managing compliance rule records in the database
 */
class ComplianceRuleRepository {
  private model: mongoose.Model<IComplianceRuleDocument>;

  /**
   * Initializes the repository with the ComplianceRuleModel
   */
  constructor() {
    this.model = ComplianceRuleModel;
  }

  /**
   * Creates a new compliance rule in the database
   * 
   * @param complianceRule - The compliance rule to create
   * @returns The created compliance rule document
   */
  async create(complianceRule: IComplianceRule): Promise<IComplianceRuleDocument> {
    logger.info(`Creating compliance rule: ${complianceRule.rule_name}, type: ${complianceRule.rule_type}`);
    const createdRule = await this.model.create(complianceRule);
    logger.info(`Created compliance rule with ID: ${createdRule.rule_id}`);
    return createdRule;
  }

  /**
   * Finds a compliance rule by its ID
   * 
   * @param ruleId - The ID of the rule to find
   * @returns The compliance rule document or null if not found
   */
  async findById(ruleId: string): Promise<IComplianceRuleDocument | null> {
    return await this.model.findOne({ rule_id: ruleId });
  }

  /**
   * Finds compliance rules by rule type
   * 
   * @param ruleType - The type of rules to find
   * @param activeOnly - If true, only returns active rules
   * @returns Array of compliance rule documents
   */
  async findByType(ruleType: RuleType, activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const query: any = { rule_type: ruleType };
    if (activeOnly) {
      query.active = true;
    }
    return await this.model.find(query);
  }

  /**
   * Finds compliance rules by entity type and ID
   * 
   * @param entityType - The entity type to filter by
   * @param entityId - The entity ID to filter by
   * @param activeOnly - If true, only returns active rules
   * @returns Array of compliance rule documents
   */
  async findByEntityTypeAndId(entityType: EntityType, entityId: string, activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const query: any = { entity_type: entityType, entity_id: entityId };
    if (activeOnly) {
      query.active = true;
    }
    return await this.model.find(query);
  }

  /**
   * Finds compliance rules by provider type
   * 
   * @param providerType - The provider type to filter by
   * @param activeOnly - If true, only returns active rules
   * @returns Array of compliance rule documents
   */
  async findByProviderType(providerType: ProviderType, activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const query: any = { provider_type: providerType };
    if (activeOnly) {
      query.active = true;
    }
    return await this.model.find(query);
  }

  /**
   * Finds card network specific compliance rules
   * 
   * @param cardNetwork - The card network identifier (e.g., "VISA", "MASTERCARD")
   * @param activeOnly - If true, only returns active rules
   * @returns Array of card network rule documents
   */
  async findCardNetworkRules(cardNetwork: string, activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const now = new Date();
    const query: any = { 
      entity_type: EntityType.CARD_NETWORK, 
      entity_id: cardNetwork,
      effective_date: { $lte: now }
    };
    
    // Only include rules that are not expired or have no expiration date
    query.$or = [
      { expiration_date: { $gt: now } },
      { expiration_date: null }
    ];
    
    if (activeOnly) {
      query.active = true;
    }
    
    return await this.model.find(query);
  }

  /**
   * Finds merchant-specific compliance rules
   * 
   * @param merchantId - The merchant ID to find rules for
   * @param activeOnly - If true, only returns active rules
   * @returns Array of merchant rule documents
   */
  async findMerchantRules(merchantId: string, activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const now = new Date();
    const query: any = { 
      entity_type: EntityType.MERCHANT, 
      entity_id: merchantId,
      effective_date: { $lte: now }
    };
    
    // Only include rules that are not expired or have no expiration date
    query.$or = [
      { expiration_date: { $gt: now } },
      { expiration_date: null }
    ];
    
    if (activeOnly) {
      query.active = true;
    }
    
    return await this.model.find(query);
  }

  /**
   * Finds regulatory compliance rules
   * 
   * @param activeOnly - If true, only returns active rules
   * @returns Array of regulatory rule documents
   */
  async findRegulatoryRules(activeOnly: boolean = true): Promise<IComplianceRuleDocument[]> {
    const now = new Date();
    const query: any = { 
      entity_type: EntityType.REGULATORY,
      effective_date: { $lte: now }
    };
    
    // Only include rules that are not expired or have no expiration date
    query.$or = [
      { expiration_date: { $gt: now } },
      { expiration_date: null }
    ];
    
    if (activeOnly) {
      query.active = true;
    }
    
    return await this.model.find(query);
  }

  /**
   * Updates an existing compliance rule
   * 
   * @param ruleId - The ID of the rule to update
   * @param updates - The updates to apply
   * @returns The updated compliance rule document or null if not found
   */
  async update(ruleId: string, updates: Partial<IComplianceRule>): Promise<IComplianceRuleDocument | null> {
    const rule = await this.model.findOne({ rule_id: ruleId });
    
    if (!rule) {
      return null;
    }
    
    // Increment version number
    rule.version += 1;
    
    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== 'rule_id' && key !== 'created_at') { // Don't update immutable fields
        // @ts-ignore: Dynamic property assignment
        rule[key] = updates[key as keyof IComplianceRule];
      }
    });
    
    // Update timestamp
    rule.updated_at = new Date();
    
    await rule.save();
    return rule;
  }

  /**
   * Sets the active status of a compliance rule
   * 
   * @param ruleId - The ID of the rule to update
   * @param active - The active status to set
   * @returns The updated compliance rule document or null if not found
   */
  async setActive(ruleId: string, active: boolean): Promise<IComplianceRuleDocument | null> {
    const rule = await this.model.findOne({ rule_id: ruleId });
    
    if (!rule) {
      return null;
    }
    
    rule.active = active;
    rule.version += 1;
    rule.updated_at = new Date();
    
    await rule.save();
    return rule;
  }

  /**
   * Searches for compliance rules based on multiple criteria
   * 
   * @param searchParams - Search parameters for filtering rules
   * @param options - Pagination and sorting options
   * @returns Paginated search results and total count
   */
  async search(
    searchParams: {
      rule_type?: RuleType;
      entity_type?: EntityType;
      entity_id?: string;
      provider_type?: ProviderType;
      active?: boolean;
      rule_name?: string;
      effective_from?: Date;
      effective_to?: Date;
    },
    options: {
      page?: number;
      limit?: number;
      sort?: { [key: string]: 1 | -1 };
    } = {}
  ): Promise<{ results: IComplianceRuleDocument[], total: number }> {
    const query: any = {};
    
    // Build query from search parameters
    if (searchParams.rule_type) {
      query.rule_type = searchParams.rule_type;
    }
    
    if (searchParams.entity_type) {
      query.entity_type = searchParams.entity_type;
    }
    
    if (searchParams.entity_id) {
      query.entity_id = searchParams.entity_id;
    }
    
    if (searchParams.provider_type) {
      query.provider_type = searchParams.provider_type;
    }
    
    if (typeof searchParams.active === 'boolean') {
      query.active = searchParams.active;
    }
    
    if (searchParams.rule_name) {
      // Use case-insensitive partial match
      query.rule_name = { $regex: searchParams.rule_name, $options: 'i' };
    }
    
    // Handle date range filters
    if (searchParams.effective_from || searchParams.effective_to) {
      query.effective_date = {};
      
      if (searchParams.effective_from) {
        query.effective_date.$gte = searchParams.effective_from;
      }
      
      if (searchParams.effective_to) {
        query.effective_date.$lte = searchParams.effective_to;
      }
    }
    
    // Extract pagination parameters
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await this.model.countDocuments(query);
    
    // Execute search query with pagination
    const results = await this.model.find(query)
      .sort(options.sort || { updated_at: -1 })
      .skip(skip)
      .limit(limit);
    
    return { results, total };
  }

  /**
   * Deletes a compliance rule (soft delete by marking inactive)
   * 
   * @param ruleId - The ID of the rule to delete
   * @returns True if rule was found and deleted, false otherwise
   */
  async delete(ruleId: string): Promise<boolean> {
    const rule = await this.model.findOne({ rule_id: ruleId });
    
    if (!rule) {
      return false;
    }
    
    rule.active = false;
    rule.updated_at = new Date();
    await rule.save();
    
    return true;
  }

  /**
   * Creates multiple compliance rules in a single operation
   * 
   * @param complianceRules - Array of compliance rules to create
   * @returns Array of created rule documents
   */
  async bulkCreate(complianceRules: IComplianceRule[]): Promise<IComplianceRuleDocument[]> {
    logger.info(`Bulk creating ${complianceRules.length} compliance rules`);
    const createdRules = await this.model.insertMany(complianceRules);
    logger.info(`Successfully created ${createdRules.length} compliance rules`);
    return createdRules;
  }

  /**
   * Finds all active rules applicable to a specific context (e.g., card network, merchant)
   * 
   * @param context - Object containing contextual information for rule lookup
   * @returns Array of applicable rule documents
   */
  async findActiveRulesWithContext(context: {
    cardNetwork?: string;
    merchantId?: string;
    organizationId?: string;
    programId?: string;
    bankId?: string;
  }): Promise<IComplianceRuleDocument[]> {
    const now = new Date();
    
    // Create base query for active rules
    const baseQuery = {
      active: true,
      effective_date: { $lte: now },
      $or: [
        { expiration_date: { $gt: now } },
        { expiration_date: null }
      ]
    };
    
    // Array to hold all queries
    const queries = [];
    
    // Add card network specific query if applicable
    if (context.cardNetwork) {
      queries.push({
        ...baseQuery,
        entity_type: EntityType.CARD_NETWORK,
        entity_id: context.cardNetwork
      });
    }
    
    // Add merchant specific query if applicable
    if (context.merchantId) {
      queries.push({
        ...baseQuery,
        entity_type: EntityType.MERCHANT,
        entity_id: context.merchantId
      });
    }
    
    // Add organization specific query if applicable
    if (context.organizationId) {
      queries.push({
        ...baseQuery,
        entity_type: EntityType.ORGANIZATION,
        entity_id: context.organizationId
      });
    }
    
    // Add program specific query if applicable
    if (context.programId) {
      queries.push({
        ...baseQuery,
        entity_type: EntityType.PROGRAM,
        entity_id: context.programId
      });
    }
    
    // Add bank specific query if applicable
    if (context.bankId) {
      queries.push({
        ...baseQuery,
        entity_type: EntityType.BANK,
        entity_id: context.bankId
      });
    }
    
    // Always include regulatory rules
    queries.push({
      ...baseQuery,
      entity_type: EntityType.REGULATORY
    });
    
    // Execute query to find all applicable rules
    return await this.model.find({ $or: queries });
  }
}

// Create a singleton instance
const complianceRuleRepository = new ComplianceRuleRepository();

// Export the singleton instance as default
export default complianceRuleRepository;

// Export the class for testing and extension
export { ComplianceRuleRepository };