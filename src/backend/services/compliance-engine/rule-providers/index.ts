import cardNetworkProvider from './card-network.provider'; // Import card network rule provider
import regulatoryProvider from './regulatory.provider'; // Import regulatory rule provider
import merchantProvider from './merchant.provider'; // Import merchant rule provider

/**
 * @interface RuleProvider
 * @description Interface defining the required methods for rule providers
 * @property {function(context: any): Promise<IComplianceRule[]>} getRules - Retrieves compliance rules based on the context
 * @property {function(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<boolean>} evaluate - Evaluates if a refund request meets all compliance rules
 * @property {function(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<any[]>} getViolations - Identifies all violations of compliance rules for a refund request
 */
interface RuleProvider {
  getRules(context: any): Promise<IComplianceRule[]>;
  evaluate(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<boolean>;
  getViolations(refundRequest: RefundRequest, rules: IComplianceRule[], context: any): Promise<any[]>;
}

/**
 * Exported object containing all rule providers for easy registration with compliance engine
 */
const ruleProviders = {
  CARD_NETWORK: cardNetworkProvider, // Card network rule provider
  REGULATORY: regulatoryProvider, // Regulatory rule provider
  MERCHANT: merchantProvider, // Merchant rule provider
};

// Export all rule providers for use in the Compliance Engine
export {
  cardNetworkProvider, // Export card network rule provider
  regulatoryProvider, // Export regulatory rule provider
  merchantProvider, // Export merchant rule provider
  ruleProviders // Export the object containing all rule providers
};