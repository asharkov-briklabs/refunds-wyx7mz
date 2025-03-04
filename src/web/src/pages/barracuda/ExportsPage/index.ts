// react v18.2.0
import ExportsPage from './ExportsPage';

/**
 * @file index.ts
 * @description Barrel file that exports the ExportsPage component for the Barracuda admin interface, making it available for import by other modules in the application.
 * @requirements_addressed
 * - Refund Activity Reporting: Technical Specifications/2.2 DETAILED FEATURE DESCRIPTIONS/F-301
 *   Exposes the exports functionality of the admin reporting interface
 * - Data Export: Technical Specifications/6.8 REPORTING & ANALYTICS ENGINE/Data Export
 *   Makes available the component that handles exporting reports in various formats
 */

/**
 * @exports ExportsPage
 * @type {React.FC}
 * @description Export the ExportsPage component as the default export to make it accessible to routing configuration and other parts of the application
 */
export default ExportsPage;