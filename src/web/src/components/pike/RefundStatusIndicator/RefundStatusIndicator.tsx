import React from 'react';
import clsx from 'clsx'; // ^1.2.1
import { RefundStatus } from '../../../types/refund.types';
import ProgressBar from '../../common/ProgressBar';
import Badge from '../../common/Badge';
import Tooltip from '../../common/Tooltip';
import {
  getRefundStatusLabel,
  getRefundStatusDescription,
  getRefundStatusProgress,
  getRefundStatusIcon,
  getRefundStatusColor,
} from '../../../constants/refund-status.constants';
import {
  CheckCircleIcon,
  TimesCircleIcon,
  WarningIcon,
  ClockIcon,
  SpinnerIcon,
  BanIcon,
  DraftIcon,
} from '../../../assets/icons/status-icons';

/**
 * Props for the RefundStatusIndicator component
 */
export interface RefundStatusIndicatorProps {
  /** The current status of the refund */
  status: RefundStatus;
  /** Whether to show the progress bar */
  showProgress?: boolean;
  /** Whether to show the status label */
  showLabel?: boolean;
  /** Whether to show the status icon */
  showIcon?: boolean;
  /** Size variant of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class name */
  className?: string;
}

/**
 * Returns the appropriate icon component based on the refund status
 */
const getStatusIcon = (status: RefundStatus): React.ReactElement => {
  switch (status) {
    case RefundStatus.COMPLETED:
      return <CheckCircleIcon />;
    case RefundStatus.FAILED:
    case RefundStatus.REJECTED:
      return <TimesCircleIcon />;
    case RefundStatus.VALIDATION_FAILED:
    case RefundStatus.GATEWAY_ERROR:
      return <WarningIcon />;
    case RefundStatus.PENDING_APPROVAL:
      return <ClockIcon />;
    case RefundStatus.PROCESSING:
    case RefundStatus.GATEWAY_PENDING:
      return <SpinnerIcon />;
    case RefundStatus.CANCELED:
      return <BanIcon />;
    case RefundStatus.DRAFT:
      return <DraftIcon />;
    default:
      return <SpinnerIcon />;
  }
};

/**
 * Maps refund status to appropriate Badge component variant
 */
const getBadgeVariant = (status: RefundStatus): string => {
  if (status === RefundStatus.COMPLETED) {
    return 'success';
  } else if (
    status === RefundStatus.FAILED || 
    status === RefundStatus.REJECTED || 
    status === RefundStatus.VALIDATION_FAILED
  ) {
    return 'error';
  } else if (status === RefundStatus.GATEWAY_ERROR) {
    return 'warning';
  } else if (
    status === RefundStatus.PROCESSING || 
    status === RefundStatus.GATEWAY_PENDING || 
    status === RefundStatus.PENDING_APPROVAL
  ) {
    return 'info';
  } else {
    return 'default'; // For DRAFT, SUBMITTED, CANCELED, etc.
  }
};

/**
 * Maps refund status to appropriate ProgressBar component variant
 */
const getProgressVariant = (status: RefundStatus): string => {
  if (status === RefundStatus.COMPLETED) {
    return 'success';
  } else if (
    status === RefundStatus.FAILED || 
    status === RefundStatus.REJECTED || 
    status === RefundStatus.VALIDATION_FAILED
  ) {
    return 'error';
  } else if (
    status === RefundStatus.GATEWAY_ERROR || 
    status === RefundStatus.CANCELED
  ) {
    return 'warning';
  } else {
    return 'info'; // For processing states
  }
};

/**
 * Component that visually displays the status of a refund using icons, badges, and progress bars
 */
const RefundStatusIndicator: React.FC<RefundStatusIndicatorProps> = ({
  status,
  showProgress = true,
  showLabel = true,
  showIcon = true,
  size = 'md',
  className,
}) => {
  const statusLabel = getRefundStatusLabel(status);
  const statusDescription = getRefundStatusDescription(status);
  const progress = getRefundStatusProgress(status);
  const icon = getStatusIcon(status);
  const badgeVariant = getBadgeVariant(status);
  const progressVariant = getProgressVariant(status);

  // Size-based classes
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      icon: 'w-4 h-4',
      progress: '4px',
    },
    md: {
      container: 'text-sm',
      icon: 'w-5 h-5',
      progress: '6px',
    },
    lg: {
      container: 'text-base',
      icon: 'w-6 h-6',
      progress: '8px',
    },
  };

  // Icon color classes matching Badge component color system
  const iconColorClasses = {
    success: 'text-semantic-success-700',
    warning: 'text-semantic-warning-700',
    error: 'text-semantic-error-700',
    info: 'text-semantic-info-700',
    default: 'text-gray-700',
  };

  return (
    <div
      className={clsx(
        'flex flex-col',
        sizeClasses[size].container,
        className
      )}
      aria-label={`Refund status: ${statusLabel}`}
    >
      <div className="flex items-center gap-2">
        {showIcon && (
          <div className="flex-shrink-0">
            {React.cloneElement(icon, { 
              className: clsx(
                icon.props.className, 
                sizeClasses[size].icon,
                iconColorClasses[badgeVariant]
              ),
              'aria-hidden': true 
            })}
          </div>
        )}
        
        {showLabel && (
          <Tooltip content={statusDescription}>
            <Badge variant={badgeVariant} size={size}>
              {statusLabel}
            </Badge>
          </Tooltip>
        )}
      </div>
      
      {showProgress && (
        <div className="mt-1">
          <ProgressBar
            progress={progress}
            variant={progressVariant}
            height={sizeClasses[size].progress}
            animated={
              status === RefundStatus.PROCESSING ||
              status === RefundStatus.GATEWAY_PENDING ||
              status === RefundStatus.PENDING_APPROVAL
            }
            aria-label={`Refund progress: ${progress}%`}
          />
        </div>
      )}
    </div>
  );
};

export default RefundStatusIndicator;