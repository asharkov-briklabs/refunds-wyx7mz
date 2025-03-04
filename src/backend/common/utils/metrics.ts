/**
 * Metrics Utility Module
 * 
 * Provides standardized metrics collection and reporting capabilities
 * for the Refunds Service, supporting multiple monitoring systems.
 * This module implements common patterns for tracking counters, histograms,
 * gauges, and timing metrics across service components.
 */

import { StatsD } from 'hot-shots'; // hot-shots ^9.2.0
import { CloudWatch } from 'aws-sdk'; // aws-sdk ^2.1340.0
import { logger, info, error, debug } from './logger';
import config from '../../config';

// Types for metric tags
type Tags = Record<string, string | number | boolean>;

// Types for metric providers
type MetricsProvider = 'datadog' | 'cloudwatch';

// CloudWatch specific unit types
type CloudWatchUnit = 
  'Seconds' | 
  'Microseconds' | 
  'Milliseconds' | 
  'Bytes' | 
  'Kilobytes' | 
  'Megabytes' | 
  'Gigabytes' | 
  'Terabytes' | 
  'Bits' | 
  'Kilobits' | 
  'Megabits' | 
  'Gigabits' | 
  'Terabits' | 
  'Percent' | 
  'Count' | 
  'Bytes/Second' | 
  'Kilobytes/Second' | 
  'Megabytes/Second' | 
  'Gigabytes/Second' | 
  'Terabytes/Second' | 
  'Bits/Second' | 
  'Kilobits/Second' | 
  'Megabits/Second' | 
  'Gigabits/Second' | 
  'Terabits/Second' | 
  'Count/Second' | 
  'None';

/**
 * Configuration options for the metrics system
 */
interface MetricsConfig {
  /** Whether metrics collection is enabled */
  enabled: boolean;
  /** Metrics provider to use (datadog or cloudwatch) */
  provider: MetricsProvider;
  /** Prefix to apply to all metric names */
  prefix: string;
  /** Interval for flushing metrics in milliseconds */
  flushIntervalMs: number;
  /** Sample rate for metrics (0.0-1.0) */
  sampleRate: number;
  /** DataDog agent host (when using datadog provider) */
  datadogHost?: string;
  /** DataDog agent port (when using datadog provider) */
  datadogPort?: number;
  /** CloudWatch namespace (when using cloudwatch provider) */
  cloudWatchNamespace?: string;
}

// Singleton metrics client
let metricsInstance: any = null;

/**
 * Default metrics configuration
 */
let metricsConfig: MetricsConfig = {
  enabled: process.env.METRICS_ENABLED === 'true',
  provider: process.env.METRICS_PROVIDER as MetricsProvider || 'datadog',
  prefix: 'refund_service',
  flushIntervalMs: 10000,
  sampleRate: 1.0,
  datadogHost: process.env.DD_AGENT_HOST,
  datadogPort: process.env.DD_AGENT_PORT ? parseInt(process.env.DD_AGENT_PORT, 10) : 8125,
  cloudWatchNamespace: 'RefundService'
};

/**
 * Configures the metrics system with the specified options
 * 
 * @param options - Configuration options to override defaults
 */
export function configureMetrics(options: Partial<MetricsConfig>): void {
  // Merge provided options with current config
  metricsConfig = { ...metricsConfig, ...options };
  
  // If metrics are disabled, log and return
  if (!metricsConfig.enabled) {
    info('Metrics collection is disabled');
    return;
  }
  
  // Initialize the appropriate metrics client based on provider
  if (metricsConfig.provider === 'datadog') {
    try {
      metricsInstance = new StatsD({
        host: metricsConfig.datadogHost,
        port: metricsConfig.datadogPort,
        prefix: `${metricsConfig.prefix}.`,
        globalTags: { 
          env: config.environment,
          service: metricsConfig.prefix
        },
        errorHandler: (err) => {
          error('DataDog metrics error', { error: err.message });
        },
        bufferFlushInterval: metricsConfig.flushIntervalMs,
        sampleRate: metricsConfig.sampleRate
      });
      info('DataDog metrics initialized', { 
        host: metricsConfig.datadogHost,
        port: metricsConfig.datadogPort
      });
    } catch (err) {
      error('Failed to initialize DataDog metrics', { error: err });
      metricsInstance = null;
    }
  } else if (metricsConfig.provider === 'cloudwatch') {
    try {
      metricsInstance = new CloudWatch({ 
        apiVersion: '2010-08-01',
        region: process.env.AWS_REGION || 'us-east-1'
      });
      info('CloudWatch metrics initialized', { namespace: metricsConfig.cloudWatchNamespace });
    } catch (err) {
      error('Failed to initialize CloudWatch metrics', { error: err });
      metricsInstance = null;
    }
  } else {
    error('Unsupported metrics provider', { provider: metricsConfig.provider });
    metricsInstance = null;
  }
}

/**
 * Increments a counter metric by the specified value
 * 
 * @param name - Metric name
 * @param value - Value to increment by (default: 1)
 * @param tags - Optional tags to associate with the metric
 */
export function incrementCounter(name: string, value: number = 1, tags?: Tags): void {
  if (!isEnabled()) {
    return;
  }
  
  try {
    const metricName = getFullMetricName(name);
    const formattedTags = formatTags(tags);
    
    if (metricsConfig.provider === 'datadog') {
      metricsInstance.increment(metricName, value, metricsConfig.sampleRate, formattedTags);
      debug('Incremented counter metric', { 
        metric: metricName, 
        value, 
        tags 
      });
    } else if (metricsConfig.provider === 'cloudwatch') {
      putCloudWatchMetric(metricName, value, 'Count', formattedTags);
    }
  } catch (err) {
    error('Error incrementing counter metric', { 
      metric: name, 
      error: err 
    });
  }
}

/**
 * Decrements a counter metric by the specified value
 * 
 * @param name - Metric name
 * @param value - Value to decrement by (default: 1)
 * @param tags - Optional tags to associate with the metric
 */
export function decrementCounter(name: string, value: number = 1, tags?: Tags): void {
  if (!isEnabled()) {
    return;
  }
  
  try {
    const metricName = getFullMetricName(name);
    const formattedTags = formatTags(tags);
    
    if (metricsConfig.provider === 'datadog') {
      metricsInstance.decrement(metricName, value, metricsConfig.sampleRate, formattedTags);
      debug('Decremented counter metric', { 
        metric: metricName, 
        value, 
        tags 
      });
    } else if (metricsConfig.provider === 'cloudwatch') {
      // CloudWatch doesn't have a direct decrement concept, so we use a negative value
      putCloudWatchMetric(metricName, -value, 'Count', formattedTags);
    }
  } catch (err) {
    error('Error decrementing counter metric', { 
      metric: name, 
      error: err 
    });
  }
}

/**
 * Records a gauge metric with the specified value
 * 
 * @param name - Metric name
 * @param value - Gauge value to record
 * @param tags - Optional tags to associate with the metric
 */
export function recordGauge(name: string, value: number, tags?: Tags): void {
  if (!isEnabled()) {
    return;
  }
  
  try {
    const metricName = getFullMetricName(name);
    const formattedTags = formatTags(tags);
    
    if (metricsConfig.provider === 'datadog') {
      metricsInstance.gauge(metricName, value, metricsConfig.sampleRate, formattedTags);
      debug('Recorded gauge metric', { 
        metric: metricName, 
        value, 
        tags 
      });
    } else if (metricsConfig.provider === 'cloudwatch') {
      putCloudWatchMetric(metricName, value, 'None', formattedTags);
    }
  } catch (err) {
    error('Error recording gauge metric', { 
      metric: name, 
      error: err 
    });
  }
}

/**
 * Records a histogram metric with the specified value
 * 
 * @param name - Metric name
 * @param value - Value to record
 * @param tags - Optional tags to associate with the metric
 */
export function recordHistogram(name: string, value: number, tags?: Tags): void {
  if (!isEnabled()) {
    return;
  }
  
  try {
    const metricName = getFullMetricName(name);
    const formattedTags = formatTags(tags);
    
    if (metricsConfig.provider === 'datadog') {
      metricsInstance.histogram(metricName, value, metricsConfig.sampleRate, formattedTags);
      debug('Recorded histogram metric', { 
        metric: metricName, 
        value, 
        tags 
      });
    } else if (metricsConfig.provider === 'cloudwatch') {
      // CloudWatch doesn't have histograms directly, so we use a custom metric
      putCloudWatchMetric(metricName, value, 'Milliseconds', formattedTags);
    }
  } catch (err) {
    error('Error recording histogram metric', { 
      metric: name, 
      error: err 
    });
  }
}

/**
 * Starts a timer for measuring the duration of an operation
 * 
 * @param name - Metric name
 * @param tags - Optional tags to associate with the metric
 * @returns Function that stops the timer and records the duration
 */
export function startTimer(name: string, tags?: Tags): (additionalTags?: Tags) => void {
  if (!isEnabled()) {
    return () => {}; // No-op if metrics are disabled
  }
  
  const startTime = Date.now();
  
  return (additionalTags?: Tags) => {
    const duration = Date.now() - startTime;
    const combinedTags = { ...tags, ...additionalTags };
    
    recordHistogram(`${name}.duration_ms`, duration, combinedTags);
  };
}

/**
 * Higher-order function that times the execution of the provided function
 * 
 * @param name - Metric name
 * @param fn - Function to time
 * @param tags - Optional tags to associate with the metric
 * @returns Wrapped function that records timing metrics when executed
 */
export function timeExecution<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  tags?: Tags
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    if (!isEnabled()) {
      return fn(...args);
    }
    
    const stopTimer = startTimer(name, tags);
    
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result
          .then((value) => {
            stopTimer({ status: 'success' });
            return value;
          })
          .catch((err) => {
            stopTimer({ 
              status: 'error', 
              error_type: err.name,
              error_message: err.message
            });
            throw err;
          }) as ReturnType<T>;
      }
      
      // Handle synchronous functions
      stopTimer({ status: 'success' });
      return result;
    } catch (err) {
      stopTimer({ 
        status: 'error', 
        error_type: err.name,
        error_message: err.message
      });
      throw err;
    }
  };
}

/**
 * Records a success metric for a specific operation type
 * 
 * @param operation - Operation name
 * @param tags - Optional tags to associate with the metric
 */
export function recordSuccess(operation: string, tags?: Tags): void {
  incrementCounter(`${operation}.success`, 1, tags);
}

/**
 * Records an error metric for a specific operation type
 * 
 * @param operation - Operation name
 * @param errorType - Type of error
 * @param tags - Optional tags to associate with the metric
 */
export function recordError(operation: string, errorType: string, tags?: Tags): void {
  incrementCounter(`${operation}.error`, 1, { ...tags, error_type: errorType });
}

/**
 * Formats tags object into the format expected by the metrics provider
 * 
 * @param tags - Tags object to format
 * @returns Array of formatted tag strings or object based on provider
 */
export function formatTags(tags?: Tags): string[] | Record<string, string> {
  if (!tags) {
    return [];
  }
  
  if (metricsConfig.provider === 'datadog') {
    // Convert to array of 'key:value' strings for DataDog
    return Object.entries(tags)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}:${value}`);
  } else if (metricsConfig.provider === 'cloudwatch') {
    // Convert to object with string values for CloudWatch
    const formattedTags: Record<string, string> = {};
    
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formattedTags[key] = String(value);
      }
    });
    
    return formattedTags;
  }
  
  return [];
}

/**
 * Creates a new metrics instance with default tags applied to all metrics
 * 
 * @param defaultTags - Default tags to apply to all metrics
 * @returns Metrics object with the specified default tags
 */
export function withTags(defaultTags: Tags): Record<string, any> {
  return {
    incrementCounter: (name: string, value: number = 1, tags?: Tags) =>
      incrementCounter(name, value, { ...defaultTags, ...tags }),
    
    decrementCounter: (name: string, value: number = 1, tags?: Tags) =>
      decrementCounter(name, value, { ...defaultTags, ...tags }),
    
    recordGauge: (name: string, value: number, tags?: Tags) =>
      recordGauge(name, value, { ...defaultTags, ...tags }),
    
    recordHistogram: (name: string, value: number, tags?: Tags) =>
      recordHistogram(name, value, { ...defaultTags, ...tags }),
    
    startTimer: (name: string, tags?: Tags) =>
      startTimer(name, { ...defaultTags, ...tags }),
    
    timeExecution: <T extends (...args: any[]) => any>(name: string, fn: T, tags?: Tags) =>
      timeExecution(name, fn, { ...defaultTags, ...tags }),
    
    recordSuccess: (operation: string, tags?: Tags) =>
      recordSuccess(operation, { ...defaultTags, ...tags }),
    
    recordError: (operation: string, errorType: string, tags?: Tags) =>
      recordError(operation, errorType, { ...defaultTags, ...tags })
  };
}

/**
 * Checks if metrics collection is enabled
 * 
 * @returns True if metrics collection is enabled
 */
export function isEnabled(): boolean {
  return metricsConfig.enabled && metricsInstance !== null;
}

/**
 * Gets the configured metrics instance or initializes with default settings
 * 
 * @returns Configured metrics instance
 */
export function getMetricsInstance(): any {
  if (!metricsInstance) {
    configureMetrics({});
  }
  
  return metricsInstance;
}

/**
 * Helper function to get full metric name with prefix
 * 
 * @param name - Base metric name
 * @returns Fully qualified metric name with prefix
 */
function getFullMetricName(name: string): string {
  // If name already starts with prefix, don't add it again
  if (name.startsWith(`${metricsConfig.prefix}.`)) {
    return name;
  }
  return `${metricsConfig.prefix}.${name}`;
}

/**
 * Helper function to put metrics to CloudWatch
 * 
 * @param name - Metric name
 * @param value - Metric value
 * @param unit - CloudWatch metric unit
 * @param dimensions - CloudWatch dimensions (tags)
 */
function putCloudWatchMetric(
  name: string,
  value: number,
  unit: CloudWatchUnit,
  dimensions: Record<string, string>
): void {
  if (!metricsInstance || metricsConfig.provider !== 'cloudwatch') {
    return;
  }
  
  try {
    const params = {
      MetricData: [
        {
          MetricName: name,
          Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
          Value: value,
          Unit: unit,
          Timestamp: new Date()
        }
      ],
      Namespace: metricsConfig.cloudWatchNamespace
    };
    
    metricsInstance.putMetricData(params).send();
    
    debug('Sent metric to CloudWatch', { 
      metric: name, 
      value, 
      unit,
      dimensions 
    });
  } catch (err) {
    error('Error sending metric to CloudWatch', { 
      metric: name, 
      error: err 
    });
  }
}

// Initialize metrics with default configuration
getMetricsInstance();