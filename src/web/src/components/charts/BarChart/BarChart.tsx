import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from 'recharts'; // ^2.5.0
import Card from '../../common/Card/Card';
import Spinner from '../../common/Spinner/Spinner';
import { formatCurrency } from '../../../utils/currency.utils';
import useResponsive from '../../../hooks/useResponsive';

/**
 * Props interface for the BarChart component
 */
export interface BarChartProps {
  /** Chart title */
  title: string;
  
  /** Optional subtitle */
  subtitle?: string | null;
  
  /** Data array to visualize */
  data: Array<Record<string, any>>;
  
  /** Data key for x-axis categories */
  xAxisDataKey: string;
  
  /** Configuration for bar series */
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
    stackId?: string;
  }>;
  
  /** Whether data is currently loading */
  loading?: boolean;
  
  /** Whether to show the legend */
  showLegend?: boolean;
  
  /** Whether to show grid lines */
  showGrid?: boolean;
  
  /** X-axis label */
  xAxisLabel?: string;
  
  /** Y-axis label */
  yAxisLabel?: string;
  
  /** Function to format tooltip labels */
  tooltipLabelFormatter?: (label: any) => string;
  
  /** Function to format tooltip values */
  tooltipValueFormatter?: (value: any) => string;
  
  /** Reference lines to display on the chart */
  referenceLines?: Array<{
    y: number;
    label: string;
    color: string;
  }>;
  
  /** Whether bars should be stacked */
  stacked?: boolean;
  
  /** Additional chart configuration */
  chartConfig?: Record<string, any>;
  
  /** Message to display when data is empty */
  emptyMessage?: string;
  
  /** Optional CSS class name */
  className?: string;
}

/**
 * Calculates appropriate Y-axis domain based on data values
 * 
 * @param data Chart data array
 * @param dataKeys Keys of data series to consider
 * @param padding Percentage padding to add above maximum value (default: 10%)
 * @returns Domain array with [min, max] values
 */
const getAxisDomain = (
  data: Array<Record<string, any>>, 
  dataKeys: Array<string>,
  padding: number = 10
): Array<number> => {
  if (!data || !data.length || !dataKeys.length) {
    return [0, 10]; // Default domain if no data
  }

  // Find minimum and maximum values across all data points and data keys
  let minValue = 0;
  let maxValue = 0;
  
  data.forEach(item => {
    dataKeys.forEach(key => {
      const value = Number(item[key]);
      if (!isNaN(value)) {
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
    });
  });
  
  // Ensure we have a positive domain even with negative values
  if (minValue >= 0) minValue = 0;
  
  // Apply padding to maximum value
  const paddedMax = maxValue + (maxValue * (padding / 100));
  
  // Apply padding to minimum value if negative
  const paddedMin = minValue < 0 ? minValue - (Math.abs(minValue) * (padding / 100)) : minValue;
  
  return [paddedMin, paddedMax];
};

/**
 * Custom tooltip renderer for the bar chart
 */
const renderCustomTooltip = (props: any) => {
  const { active, payload, label, formatter } = props;
  
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{formatter?.label ? formatter.label(label) : label}</p>
        <div className="chart-tooltip-items">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="chart-tooltip-item">
              <span className="chart-tooltip-marker" style={{ backgroundColor: entry.color }}></span>
              <span className="chart-tooltip-name">{entry.name}: </span>
              <span className="chart-tooltip-value">
                {formatter?.value ? formatter.value(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

/**
 * A customizable bar chart component that visualizes data as vertical bars
 */
const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle = null,
  data = [],
  xAxisDataKey,
  bars = [],
  loading = false,
  showLegend = true,
  showGrid = true,
  xAxisLabel,
  yAxisLabel,
  tooltipLabelFormatter,
  tooltipValueFormatter = formatCurrency,
  referenceLines = [],
  stacked = false,
  chartConfig = {},
  emptyMessage = "No data available",
  className,
}) => {
  // Get responsive values for chart sizing
  const responsive = useResponsive();
  
  // Adjust chart dimensions based on screen size
  let chartHeight = 400;
  let chartMargin = { top: 10, right: 30, left: 20, bottom: 40 };
  
  if (responsive.isMobile) {
    chartHeight = 300;
    chartMargin = { top: 10, right: 10, left: 0, bottom: 30 };
  } else if (responsive.isTablet) {
    chartHeight = 350;
  }
  
  // If loading, show spinner
  if (loading) {
    return (
      <Card
        title={title}
        className={classNames('bar-chart-card', className)}
        contentClassName="flex items-center justify-center"
      >
        <div className="h-64 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }
  
  // If no data, show empty message
  if (!data || data.length === 0 || bars.length === 0) {
    return (
      <Card
        title={title}
        className={classNames('bar-chart-card', className)}
        contentClassName="flex items-center justify-center"
      >
        <div className="h-64 flex items-center justify-center text-gray-500">
          {emptyMessage}
        </div>
      </Card>
    );
  }
  
  // Calculate appropriate y-axis domain
  const dataKeys = bars.map(bar => bar.dataKey);
  const domain = getAxisDomain(data, dataKeys);
  
  // Setup tooltip formatter functions
  const tooltipFormatters = {
    label: tooltipLabelFormatter,
    value: tooltipValueFormatter,
  };
  
  return (
    <Card 
      title={title}
      className={classNames('bar-chart-card', className)}
    >
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      
      <div className="chart-container" data-testid="bar-chart-container">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RechartsBarChart
            data={data}
            margin={chartMargin}
            {...chartConfig}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            
            <XAxis 
              dataKey={xAxisDataKey} 
              label={xAxisLabel && !responsive.isMobile ? { value: xAxisLabel, position: 'bottom', offset: 0 } : undefined}
              tick={{ fontSize: responsive.isMobile ? 10 : 12 }}
            />
            
            <YAxis 
              label={yAxisLabel && !responsive.isMobile ? { value: yAxisLabel, angle: -90, position: 'left', offset: 0 } : undefined}
              domain={domain}
              tick={{ fontSize: responsive.isMobile ? 10 : 12 }}
              tickFormatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
            />
            
            <Tooltip 
              content={(props) => renderCustomTooltip({ ...props, formatter: tooltipFormatters })}
            />
            
            {showLegend && bars.length > 1 && (
              <Legend 
                verticalAlign="bottom" 
                align="center"
                wrapperStyle={{ paddingTop: responsive.isMobile ? 10 : 20 }}
                iconSize={responsive.isMobile ? 8 : 10}
                fontSize={responsive.isMobile ? 10 : 12}
              />
            )}
            
            {/* Render each bar series */}
            {bars.map((bar, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                stackId={stacked ? 'stack' : bar.stackId}
                radius={[4, 4, 0, 0]}
              />
            ))}
            
            {/* Render reference lines if provided */}
            {referenceLines.map((line, index) => (
              <ReferenceLine
                key={`ref-line-${index}`}
                y={line.y}
                stroke={line.color}
                strokeDasharray="3 3"
                label={{
                  value: line.label,
                  fill: line.color,
                  fontSize: responsive.isMobile ? 10 : 12,
                  position: 'right',
                }}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default BarChart;