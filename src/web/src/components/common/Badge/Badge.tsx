import React from 'react';
import clsx from 'clsx'; // version: ^1.2.1
import { semantic } from '../../../themes/colors';

/**
 * Props interface for the Badge component
 */
export interface BadgeProps {
  /** Content to be displayed inside the badge */
  children: React.ReactNode;
  /** Optional custom CSS class */
  className?: string;
  /** Status variant */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether badge should have rounded corners */
  rounded?: boolean;
  /** Whether badge should have an outlined style */
  outlined?: boolean;
}

/**
 * A flexible badge component for displaying status, labels, or counts with various styling options.
 * Supports different variants for status types, sizes, and visual styles including rounded and outlined options.
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  rounded = false,
  outlined = false,
}) => {
  // Base variant classes
  const variantClasses = {
    success: 'bg-semantic-success-100 text-semantic-success-700',
    warning: 'bg-semantic-warning-100 text-semantic-warning-700',
    error: 'bg-semantic-error-100 text-semantic-error-700',
    info: 'bg-semantic-info-100 text-semantic-info-700',
    default: 'bg-gray-100 text-gray-700',
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  // Base classes
  const baseClasses = 'inline-flex items-center font-medium';

  // Outlined variant classes (only applied if outlined is true)
  const outlinedClasses = {
    success: 'bg-transparent border border-semantic-success-500 text-semantic-success-700',
    warning: 'bg-transparent border border-semantic-warning-500 text-semantic-warning-700',
    error: 'bg-transparent border border-semantic-error-500 text-semantic-error-700',
    info: 'bg-transparent border border-semantic-info-500 text-semantic-info-700',
    default: 'bg-transparent border border-gray-500 text-gray-700',
  };

  // Combine all classes
  const badgeClasses = clsx(
    baseClasses,
    !outlined ? variantClasses[variant] : outlinedClasses[variant],
    sizeClasses[size],
    rounded && 'rounded-full',
    className
  );

  return <span className={badgeClasses}>{children}</span>;
};

export default Badge;