# src/web/src/components/shared/index.ts
```typescript
/**
 * Barrel file that exports all shared components from a single entry point.
 * This simplifies imports by allowing developers to import any shared component from '@components/shared' rather than individual file paths.
 */

import ConfirmationDialog from './ConfirmationDialog'; // Import the ConfirmationDialog component for re-export
import DateRangeSelector from './DateRangeSelector'; // Import the DateRangeSelector component for re-export
import { DateRangeSelectorProps } from './DateRangeSelector'; // Import the DateRangeSelectorProps interface for re-export
import ErrorMessage from './ErrorMessage'; // Import the ErrorMessage component for re-export
import { ErrorMessageProps } from './ErrorMessage'; // Import the ErrorMessageProps interface for re-export
import NotificationAlert from './NotificationAlert'; // Import the NotificationAlert component for re-export
import { NotificationAlertProps } from './NotificationAlert'; // Import the NotificationAlertProps interface for re-export
import RefundStatusBadge from './RefundStatusBadge'; // Import the RefundStatusBadge component for re-export
import { RefundStatusBadgeProps } from './RefundStatusBadge';

export { ConfirmationDialog }; // Export the ConfirmationDialog component
export { DateRangeSelector }; // Export the DateRangeSelector component
export type { DateRangeSelectorProps }; // Export the props interface for DateRangeSelector component
export { ErrorMessage }; // Export the ErrorMessage component
export type { ErrorMessageProps }; // Export the props interface for ErrorMessage component
export { NotificationAlert }; // Export the NotificationAlert component
export type { NotificationAlertProps }; // Export the props interface for NotificationAlert component
export { RefundStatusBadge };
export type { RefundStatusBadgeProps };