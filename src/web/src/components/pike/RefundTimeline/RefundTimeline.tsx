import React from 'react';
import classNames from 'classnames'; // ^2.3.2
import ProgressBar from '../../../components/common/ProgressBar';
import RefundStatusBadge from '../../../components/shared/RefundStatusBadge';
import { Refund, RefundStatus, RefundStatusHistoryItem } from '../../../types/refund.types';
import { formatDateTime } from '../../../utils/date.utils';
import { 
  getRefundStatusDescription, 
  getRefundStatusProgress, 
  getRefundStatusIcon 
} from '../../../constants/refund-status.constants';

/**
 * Props for the RefundTimeline component
 */
export interface RefundTimelineProps {
  /** The refund object containing status history and details */
  refund: Refund;
  /** Additional CSS class names */
  className?: string;
  /** Whether to display in compact mode with less detail */
  compact?: boolean;
  /** Whether to show the progress bar at the top */
  showProgress?: boolean;
}

/**
 * Internal interface for timeline events
 */
interface TimelineEvent {
  /** The refund status for this event */
  status: RefundStatus;
  /** The timestamp when this event occurred */
  timestamp: string;
  /** The user or system that triggered this event */
  actor?: string;
  /** Descriptive text about the event */
  description: string;
  /** Icon name for visual representation */
  icon: string;
}

/**
 * Maps a refund status to a ProgressBar variant
 * 
 * @param status - The refund status
 * @returns ProgressBar variant (success, warning, error, info)
 */
const getStatusVariant = (status: RefundStatus): string => {
  switch (status) {
    case RefundStatus.COMPLETED:
      return 'success';
    case RefundStatus.FAILED:
    case RefundStatus.REJECTED:
      return 'error';
    case RefundStatus.PENDING_APPROVAL:
    case RefundStatus.GATEWAY_ERROR:
      return 'warning';
    default:
      return 'info';
  }
};

/**
 * Generates timeline events from refund data and status history
 * 
 * @param refund - The refund object containing status history
 * @returns Chronologically ordered timeline events
 */
const getTimelineEvents = (refund: Refund): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  
  // Add status history events
  if (refund.statusHistory && refund.statusHistory.length > 0) {
    refund.statusHistory.forEach(historyItem => {
      events.push({
        status: historyItem.status,
        timestamp: historyItem.timestamp,
        actor: historyItem.changedBy,
        description: getRefundStatusDescription(historyItem.status),
        icon: getRefundStatusIcon(historyItem.status)
      });
    });
  } else {
    // If no history, add at least the current status
    events.push({
      status: refund.status,
      timestamp: refund.createdAt,
      actor: 'System',
      description: getRefundStatusDescription(refund.status),
      icon: getRefundStatusIcon(refund.status)
    });
  }
  
  // Ensure we have the creation event if not already included
  const hasCreationEvent = events.some(event => 
    event.status === RefundStatus.DRAFT || 
    event.status === RefundStatus.SUBMITTED
  );
  
  if (!hasCreationEvent) {
    events.push({
      status: RefundStatus.SUBMITTED,
      timestamp: refund.createdAt,
      actor: 'System',
      description: 'Refund request created',
      icon: getRefundStatusIcon(RefundStatus.SUBMITTED)
    });
  }
  
  // Ensure we have completion event if the refund is completed
  const isCompleted = [
    RefundStatus.COMPLETED, 
    RefundStatus.FAILED, 
    RefundStatus.REJECTED, 
    RefundStatus.CANCELED
  ].includes(refund.status);
  
  const hasCompletionEvent = events.some(event => 
    [RefundStatus.COMPLETED, RefundStatus.FAILED, RefundStatus.REJECTED, RefundStatus.CANCELED].includes(event.status)
  );
  
  if (isCompleted && !hasCompletionEvent && refund.completedAt) {
    events.push({
      status: refund.status,
      timestamp: refund.completedAt,
      actor: 'System',
      description: getRefundStatusDescription(refund.status),
      icon: getRefundStatusIcon(refund.status)
    });
  }
  
  // Sort events chronologically
  return events.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateA - dateB;
  });
};

/**
 * Component that displays a timeline of refund status changes
 * 
 * This component visualizes the progression of a refund through various status changes,
 * showing timestamps, status badges, and contextual information for each step.
 */
const RefundTimeline: React.FC<RefundTimelineProps> = ({
  refund,
  className,
  compact = false,
  showProgress = true
}) => {
  // Calculate progress percentage based on current status
  const progress = getRefundStatusProgress(refund.status);
  
  // Determine appropriate variant for progress bar based on status
  const variant = getStatusVariant(refund.status);
  
  // Generate timeline events
  const timelineEvents = getTimelineEvents(refund);
  
  // Find index of current status for styling purposes
  const currentStatusIndex = timelineEvents.findIndex(event => event.status === refund.status);
  
  return (
    <div className={classNames('refund-timeline', className)}>
      {/* Progress bar (optional) */}
      {showProgress && (
        <div className="mb-4">
          <ProgressBar 
            progress={progress} 
            variant={variant} 
            height={8}
            className="w-full"
          />
        </div>
      )}
      
      {/* Timeline events */}
      <div className={classNames('timeline', { 'timeline-compact': compact })}>
        {timelineEvents.map((event, index) => {
          const isLast = index === timelineEvents.length - 1;
          const isCurrent = index === currentStatusIndex;
          const isPast = index < currentStatusIndex;
          const isFuture = index > currentStatusIndex;
          
          return (
            <div 
              key={`${event.status}-${event.timestamp}`}
              className={classNames(
                'timeline-event relative',
                compact ? 'pb-3' : 'pb-6',
                {
                  'timeline-event-past': isPast,
                  'timeline-event-current': isCurrent,
                  'timeline-event-future': isFuture
                }
              )}
            >
              {/* Timeline connector line */}
              {!isLast && (
                <div className={classNames(
                  'timeline-connector absolute left-3 top-6 bottom-0 w-0.5',
                  isPast ? 'bg-blue-500' : 'bg-gray-200'
                )} />
              )}
              
              <div className="flex items-start">
                {/* Status marker/badge */}
                <div className="timeline-marker mr-4 relative z-10">
                  <RefundStatusBadge 
                    status={event.status}
                    size={compact ? 'sm' : 'md'}
                    rounded
                  />
                </div>
                
                {/* Event details */}
                <div className="timeline-content flex-1">
                  {/* Timestamp */}
                  <div className={classNames(
                    'timeline-time text-gray-500',
                    compact ? 'text-xs' : 'text-sm'
                  )}>
                    {formatDateTime(event.timestamp)}
                  </div>
                  
                  {/* Event description */}
                  <div className={classNames(
                    'timeline-description font-medium',
                    compact ? 'text-sm' : 'text-base',
                    {
                      'text-gray-900': isPast || isCurrent,
                      'text-gray-400': isFuture
                    }
                  )}>
                    {event.description}
                  </div>
                  
                  {/* Actor information (if available) */}
                  {event.actor && (
                    <div className={classNames(
                      'timeline-actor',
                      compact ? 'text-xs' : 'text-sm',
                      {
                        'text-gray-600': isPast || isCurrent,
                        'text-gray-400': isFuture
                      }
                    )}>
                      By: {event.actor}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RefundTimeline;