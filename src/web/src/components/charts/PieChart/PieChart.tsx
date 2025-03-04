import React from 'react';
import { Pie } from 'react-chartjs-2'; // version 5.2.0
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js'; // version 4.3.0

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      hoverOffset?: number;
    }>;
  };
  options?: ChartOptions<'pie'>;
  height?: number;
  width?: number;
  className?: string;
}

/**
 * A reusable pie chart component for visualizing proportional data distributions
 * such as refund methods, status breakdowns, and payment method analytics.
 */
const PieChart: React.FC<PieChartProps> = ({
  data,
  options,
  height,
  width,
  className = '',
}) => {
  // Enhance datasets with default visual properties if not specified
  const enhancedData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      hoverOffset: 10,
      borderWidth: 2,
      ...dataset,
    })),
  };

  // Default chart options if not provided
  const defaultOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw as number;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Merge provided options with defaults, ensuring nested properties are preserved
  const chartOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
      legend: {
        ...defaultOptions.plugins?.legend,
        ...options?.plugins?.legend,
      },
      tooltip: {
        ...defaultOptions.plugins?.tooltip,
        ...options?.plugins?.tooltip,
        callbacks: {
          ...defaultOptions.plugins?.tooltip?.callbacks,
          ...options?.plugins?.tooltip?.callbacks,
        }
      }
    }
  };

  return (
    <div className={className}>
      <Pie
        data={enhancedData}
        options={chartOptions}
        height={height}
        width={width}
      />
    </div>
  );
};

export default PieChart;