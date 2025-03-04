import CardNetworkRules from './CardNetworkRules'; // Import the CardNetworkRules component for export
import { CardNetworkType, CardNetworkRulesProps } from './CardNetworkRules'; // Import the CardNetworkType enum for export

/**
 * Default export of the CardNetworkRules component
 */
export default CardNetworkRules;

/**
 * Export enum of supported card network types
 * @example
 * ```typescript
 * import { CardNetworkType } from './CardNetworkRules';
 * 
 * const network = CardNetworkType.VISA;
 * ```
 */
export { CardNetworkType };

/**
 * Export props interface for the CardNetworkRules component
 * @example
 * ```typescript
 * import { CardNetworkRulesProps } from './CardNetworkRules';
 * 
 * const MyComponent: React.FC<CardNetworkRulesProps> = ({ entityId, initialNetwork, className }) => {
 *   // ...
 * };
 * ```
 */
export type { CardNetworkRulesProps };