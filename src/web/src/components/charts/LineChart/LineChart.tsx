import React, { useRef, useState, useEffect } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'; // ^2.5.0
import classNames from 'classnames'; // ^2.3.2

import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import { formatCurrency, formatPercentage } from '../../../utils/currency.utils';
import { formatDateToMedium } from '../../../utils/date.utils';
import useResponsive from '../../../hooks/useResponsive';
import colors from '../../../themes/colors';

/**
 * Configuration for a data series in the line chart
 */
export interface DataSeries {
  /** Data key to use from the data objects */
  dataKey: string;
  /** Display name for the series */
  name: string;
  /** Color for the line (defaults to primary color) */
  color?: string;
  /** Format to display values (currency, percentage, etc.) */
  format?: 'currency' | 'percentage' | 'number' | 'date';
  /** Width of the line stroke */
  strokeWidth?: number;
  /** Optional dash pattern for the line (e.g., "5 5") */
  strokeDasharray?: string;
}

/**
 * Configuration for a reference line in the chart
 */
export interface ReferenceLineProps {
  /** Value where the reference line should be drawn */
  value: number;
  /** Optional label for the reference line */
  label?: string;
  /** Color for the reference line */
  color?: string;
  /** Optional dash pattern for the line */
  strokeDasharray?: string;
}

/**
 * Props for the LineChart component
 */
export interface LineChartProps {
  /** Array of data objects to display in the chart */
  data: Array<Record<string, any>>;
  /** Array of series configurations */
  series: DataSeries[];
  /** Height of the chart (default: 300) */
  height?: number | string;
  /** Width of the chart (default: '100%') */
  width?: number | string;
  /** Optional title for the chart */
  title?: string;
  /** Key to use for X-axis values (default: 'date') */
  xAxisDataKey?: string;
  /** Format for X-axis values (default: 'date') */
  xAxisFormat?: 'date' | 'number' | 'text';
  /** Whether to show grid lines (default: true) */
  showGrid?: boolean;
  /** Whether to show legend (default: true) */
  showLegend?: boolean;
  /** Whether the chart is in loading state */
  loading?: boolean;
  /** Message to display when there's no data */
  emptyStateMessage?: string;
  /** Optional reference lines to display */
  referenceLines?: ReferenceLineProps[];
  /** Additional CSS class name */
  className?: string;
}

/**
 * Formats a value based on the specified format type
 */
const formatTooltipValue = (value: any, format?: string): string => {
  if (value === undefined || value === null) return '';
  
  if (format === 'currency') {
    return formatCurrency(value);
  } else if (format === 'percentage') {
    return formatPercentage(value);
  } else if (format === 'date') {
    return formatDateToMedium(value);
  } else if (format === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
};

/**
 * Custom tooltip component for the line chart
 */
const CustomTooltip = (props: any) => {
  if (!props.active || !props.payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{formatDateToMedium(props.label)}</p>
      <div className="tooltip-items">
        {props.payload.map((entry: any, index: number) => (
          <div key={`tooltip-item-${index}`} className="tooltip-item">
            <span
              className="tooltip-marker"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-name">{entry.name}: </span>
            <span className="tooltip-value">
              {formatTooltipValue(entry.value, entry.payload?.format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Calculates appropriate Y-axis domain based on data values
 */
const getAxisDomain = (
  data: Array<Record<string, any>>,
  dataKeys: Array<string>,
  padding: number = 0.1
): [number, number] => {
  let maxValue = 0;
  
  // Find the maximum value across all data series
  for (const item of data) {
    for (const key of dataKeys) {
      const value = Number(item[key]);
      if (!isNaN(value) && value > maxValue) {
        maxValue = value;
      }
    }
  }
  
  // Add padding to the maximum value (e.g., 10% extra space)
  const paddedMax = maxValue * (1 + padding);
  
  return [0, paddedMax];
};

/**
 * A responsive line chart component that visualizes time-series data
 * with customizable styling and tooltips.
 */
const LineChart: React.FC<LineChartProps> = ({
  data = [],
  series = [],
  height = 300,
  width = '100%',
  title,
  xAxisDataKey = 'date',
  xAxisFormat = 'date',
  showGrid = true,
  showLegend = true,
  loading = false,
  emptyStateMessage = 'No data available',
  referenceLines = [],
  className
}) => {
  // Use responsive hook for adjusting chart based on screen size
  const { isMobile, isTablet } = useResponsive();
  
  // Calculate chart height based on device
  const chartHeight = isMobile ? 250 : isTablet ? 275 : height;
  
  // Show loading spinner if data is being fetched
  if (loading) {
    return (
      <Card className={classNames('line-chart-container', className)}>
        <div className="chart-loading-container">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }
  
  // Show empty state message if no data
  if (!data || data.length === 0) {
    return (
      <Card className={classNames('line-chart-container', className)}>
        <div className="chart-empty-container">
          <p>{emptyStateMessage}</p>
        </div>
      </Card>
    );
  }
  
  // Extract data keys for all series
  const dataKeys = series.map(s => s.dataKey);
  
  // Calculate Y-axis domain based on data
  const yAxisDomain = getAxisDomain(data, dataKeys);
  
  // Configure chart colors
  const chartColors = {
    grid: colors.gray[200],
    axis: colors.gray[600],
    tooltip: {
      background: colors.common.white,
      border: colors.gray[300],
      text: colors.gray[900]
    }
  };
  
  // Create a format map for series to enable proper tooltip formatting
  const seriesFormatMap = series.reduce((acc, s) => {
    acc[s.dataKey] = s.format;
    return acc;
  }, {} as Record<string, string | undefined>);
  
  return (
    <Card className={classNames('line-chart-container', className)} title={title}>
      <div className="chart-wrapper">
        <ResponsiveContainer width={width} height={chartHeight}>
          <RechartsLineChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            {showGrid && (
              <CartesianGrid
                stroke={chartColors.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
            )}
            
            <XAxis
              dataKey={xAxisDataKey}
              tickLine={true}
              axisLine={true}
              stroke={chartColors.axis}
              tickFormatter={
                xAxisFormat === 'date'
                  ? (value) => formatDateToMedium(value)
                  : undefined
              }
              padding={{ left: 10, right: 10 }}
            />
            
            <YAxis
              domain={yAxisDomain}
              tickLine={true}
              axisLine={true}
              stroke={chartColors.axis}
              tickFormatter={(value) => {
                // Format based on the first series format type
                const format = series[0]?.format;
                if (format === 'currency') {
                  return formatCurrency(value);
                } else if (format === 'percentage') {
                  return formatPercentage(value);
                }
                return value.toLocaleString();
              }}
            />
            
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value, name, props) => {
                const format = seriesFormatMap[props.dataKey];
                return [formatTooltipValue(value, format), name];
              }}
            />
            
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />
            )}
            
            {/* Render reference lines if provided */}
            {referenceLines.map((line, index) => (
              <ReferenceLine
                key={`ref-line-${index}`}
                y={line.value}
                label={line.label}
                stroke={line.color || colors.gray[500]}
                strokeDasharray={line.strokeDasharray || '3 3'}
              />
            ))}
            
            {/* Render a line for each data series */}
            {series.map((s, index) => (
              <Line
                key={`line-${index}`}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color || colors.primary[500]}
                strokeWidth={s.strokeWidth || 2}
                strokeDasharray={s.strokeDasharray}
                dot={{ r: 3, fill: s.color || colors.primary[500] }}
                activeDot={{ r: 5, fill: s.color || colors.primary[500] }}
                isAnimationActive={true}
                animationDuration={750}
                animationEasing="ease-in-out"
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default LineChart;