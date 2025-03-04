import React from 'react';
import Badge from '../../common/Badge';
import { RefundStatus } from '../../../types/refund.types';
import { getRefundStatusLabel, getRefundStatusColor } from '../../../constants/refund-status.constants';

/**
 * Props interface for the RefundStatusBadge component
 */
export interface RefundStatusBadgeProps {
  /** The refund status to display */
  status: RefundStatus;
  /** Additional CSS classes to apply to the badge */
  className?: string;
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the status text label inside the badge */
  showLabel?: boolean;
  /** Whether to use rounded styling */
  rounded?: boolean;
  /** Whether to use outlined styling instead of filled */
  outlined?: boolean;
}

/**
 * Component that displays a refund status in a badge with appropriate styling based on the status
 */
const RefundStatusBadge: React.FC<RefundStatusBadgeProps> = ({
  status,
  className,
  size = 'md',
  showLabel = true,
  rounded = true,
  outlined = false,
}) => {
  // Get the color for the status
  const statusColor = getRefundStatusColor(status);
  
  // Map color to Badge variant (success, warning, error, info, default)
  const colorToVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    green: 'success',
    red: 'error',
    yellow: 'warning',
    orange: 'warning',
    blue: 'info',
    gray: 'default'
  };
  
  const variant = colorToVariantMap[statusColor] || 'default';
  
  // Get human-readable label using getRefundStatusLabel if showLabel is true
  const label = showLabel ? getRefundStatusLabel(status) : '';
  
  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
      rounded={rounded}
      outlined={outlined}
    >
      {label}
    </Badge>
  );
};

export default RefundStatusBadge;