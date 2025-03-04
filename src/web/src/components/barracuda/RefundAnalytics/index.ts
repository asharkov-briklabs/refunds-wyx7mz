import RefundAnalytics from './RefundAnalytics'; // Import the main RefundAnalytics component for re-export
import { RefundAnalyticsProps } from './RefundAnalytics'; // Import the RefundAnalytics props interface for re-export

/**
 * @file Barrel file that exports the RefundAnalytics component for use throughout the application.
 * @requirements_addressed
 *  - name: Refund Activity Reporting
 *    location: Technical Specifications/2.2 DETAILED FEATURE DESCRIPTIONS/F-301: Refund Activity Reporting
 *    description: Exports the analytics component that provides comprehensive reporting on refund activities
 *  - name: Refund Analytics Dashboard
 *    location: Technical Specifications/7.3 BARRACUDA INTERFACE/7.3.5 Refund Reports and Analytics
 *    description: Makes the refund analytics visualization component available to the admin interface
 */

// Re-export the RefundAnalytics component as the default export
export default RefundAnalytics;

// Export the TypeScript interface for type checking when implementing the RefundAnalytics component
export type { RefundAnalyticsProps };