import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { formatCurrency } from '../../../utils/currency.utils';
import { formatNumber } from '../../../utils/formatting.utils';
import Card from '../../common/Card/Card';

/**
 * Props for the MetricCard component
 */
export interface MetricCardProps {
  /** The label or title for the metric */
  label: string;
  /** The current value of the metric */
  value: number;
  /** Previous value for trend calculation (optional) */
  previousValue?: number;
  /** Format type for the value */
  format?: 'currency' | 'percentage' | 'number';
  /** Size variant of the card */
  size?: 'small' | 'medium' | 'large';
  /** Additional CSS classes to apply */
  className?: string;
  /** Label for the trend indicator (e.g., 'vs. Last Month') */
  trendLabel?: string;
  /** Color scheme for the card */
  colorScheme?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Whether to show the trend indicator */
  showTrend?: boolean;
  /** Whether to invert the trend colors (e.g., for metrics where down is good) */
  invertTrendColors?: boolean;
}

/**
 * Formats the metric value based on the specified format type
 *
 * @param value - The numeric value to format
 * @param format - The format type to apply
 * @returns Formatted value string
 */
const formatMetricValue = (value: number, format: 'currency' | 'percentage' | 'number' = 'number'): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '—';
  }

  try {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(value);
      case 'number':
      default:
        try {
          return formatNumber(value);
        } catch (e) {
          // Fallback to browser's native formatting if formatNumber fails
          return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2
          }).format(value);
        }
    }
  } catch (error) {
    console.error('Error formatting metric value:', error);
    return value.toString();
  }
};

/**
 * Calculates the percentage change between current and previous values
 *
 * @param currentValue - The current value
 * @param previousValue - The previous value for comparison
 * @returns Trend information with percentage and direction
 */
const calculateTrend = (currentValue: number, previousValue: number) => {
  if (
    currentValue === undefined || 
    currentValue === null || 
    previousValue === undefined || 
    previousValue === null ||
    previousValue === 0 ||
    isNaN(currentValue) ||
    isNaN(previousValue)
  ) {
    return null;
  }

  const change = currentValue - previousValue;
  const percentChange = (change / Math.abs(previousValue)) * 100;
  
  return {
    percentage: Math.abs(percentChange),
    direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral'
  };
};

/**
 * Component that displays a single metric value in a card with optional trend indicator
 */
const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  previousValue,
  format = 'number',
  size = 'medium',
  className,
  trendLabel,
  colorScheme = 'default',
  showTrend = true,
  invertTrendColors = false,
}) => {
  const formattedValue = formatMetricValue(value, format);
  const trend = previousValue !== undefined ? calculateTrend(value, previousValue) : null;
  
  const showTrendIndicator = showTrend && trend !== null;

  const trendClasses = classNames('metric-card-trend', {
    'trend-up': trend?.direction === 'up',
    'trend-down': trend?.direction === 'down',
    'trend-neutral': trend?.direction === 'neutral',
    'trend-inverted': invertTrendColors,
  });

  const cardClasses = classNames(
    'metric-card',
    `metric-card-${size}`,
    `metric-card-${colorScheme}`,
    className
  );

  return (
    <Card className={cardClasses}>
      <div className="metric-card-content">
        <div className="metric-card-label">{label}</div>
        <div className="metric-card-value">{formattedValue}</div>
        
        {showTrendIndicator && (
          <div className={trendClasses}>
            {trend.direction === 'up' && <ArrowUpIcon className="trend-icon" width={16} height={16} />}
            {trend.direction === 'down' && <ArrowDownIcon className="trend-icon" width={16} height={16} />}
            <span className="trend-percentage">
              {new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              }).format(trend.percentage / 100)}
            </span>
            {trendLabel && <span className="trend-label">{trendLabel}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default MetricCard;
export { MetricCardProps };