/**
 * Index file that exports all model interfaces and MongoDB models
 * for the Reporting & Analytics Engine
 */

// Import debug logger
import { debug } from '../../../common/utils/logger';

// Import modules as namespaces
import * as ReportDefinition from './report-definition.model';
import * as ScheduledReport from './scheduled-report.model';

// Export report definition interfaces and models
export {
  IReportDefinition,
  IReportDefinitionDocument,
  IParameterDefinition,
  IVisualization,
  IPermissionRule,
  ReportDefinitionModel,
  ParameterTypes,
  VisualizationTypes,
  AccessTypes
} from './report-definition.model';

// Export scheduled report interfaces and models
export {
  IScheduledReport,
  IScheduledReportDocument,
  IRecipient,
  OutputFormat,
  RecipientType,
  ScheduledReportModel
} from './scheduled-report.model';

debug('Reporting & Analytics models loaded');