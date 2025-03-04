import { logger } from './logger';
import { metrics } from './metrics';

/**
 * EventBus provides a pub-sub implementation for handling asynchronous events
 * across the Refunds Service. It enables loosely coupled communication between
 * different components of the system.
 */
class EventBus {
  private subscribers: Map<string, Set<Function>>;
  private debugMode: boolean;

  /**
   * Creates a new EventBus instance
   * 
   * @param debugMode - Enables additional debug logging when true
   */
  constructor(debugMode = false) {
    this.subscribers = new Map<string, Set<Function>>();
    this.debugMode = debugMode;
  }

  /**
   * Subscribes a handler function to a specific event type
   * 
   * @param eventType - The type of event to subscribe to
   * @param handler - Function to be called when event is emitted
   * @returns Function that unsubscribes this specific handler
   */
  on(eventType: string, handler: Function): Function {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('Event type must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set<Function>());
    }

    const handlers = this.subscribers.get(eventType)!;
    handlers.add(handler);

    if (this.debugMode) {
      logger.debug(`EventBus: Subscribed to event: ${eventType}`, { 
        handlerCount: handlers.size 
      });
    }

    // Return an unsubscribe function that removes this specific handler
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (this.debugMode) {
          logger.debug(`EventBus: Unsubscribed from event: ${eventType}`, { 
            handlerCount: handlers.size 
          });
        }
      }
    };
  }

  /**
   * Unsubscribes all handlers for a specific event type
   * 
   * @param eventType - The event type to unsubscribe from
   */
  off(eventType: string): void {
    if (this.subscribers.has(eventType)) {
      this.subscribers.delete(eventType);
      
      if (this.debugMode) {
        logger.debug(`EventBus: Unsubscribed all handlers from event: ${eventType}`);
      }
    }
  }

  /**
   * Emits an event with payload to all subscribed handlers
   * 
   * @param eventType - The type of event to emit
   * @param payload - Data to pass to event handlers
   * @returns Promise that resolves when all handlers have been executed
   */
  async emit(eventType: string, payload?: any): Promise<void> {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('Event type must be a non-empty string');
    }

    if (this.debugMode) {
      logger.debug(`EventBus: Emitting event: ${eventType}`, { 
        hasPayload: payload !== undefined,
        subscribers: this.listenerCount(eventType)
      });
    }

    // Track event emission metrics
    metrics.incrementCounter('event_bus.emission', 1, { eventType });

    const handlers = this.subscribers.get(eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = [];
    
    for (const handler of handlers) {
      promises.push(
        (async () => {
          try {
            const startTime = Date.now();
            
            // Execute handler
            await Promise.resolve(handler(payload));
            
            // Record execution time
            const duration = Date.now() - startTime;
            metrics.recordHistogram('event_bus.handler_execution_time', duration, { eventType });
            
          } catch (err) {
            logger.error(`EventBus: Error in handler for event: ${eventType}`, {
              error: err,
              eventType
            });
          }
        })()
      );
    }

    await Promise.all(promises);
  }

  /**
   * Returns the number of listeners for a specific event type
   * 
   * @param eventType - The event type to check
   * @returns Number of subscribers for the event type
   */
  listenerCount(eventType: string): number {
    const handlers = this.subscribers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Checks if there are any listeners for a specific event type
   * 
   * @param eventType - The event type to check
   * @returns True if there are subscribers for the event type
   */
  hasListeners(eventType: string): boolean {
    return this.listenerCount(eventType) > 0;
  }
}

// Create a singleton instance of EventBus for application-wide use
const eventBus = new EventBus(process.env.NODE_ENV !== 'production');

// Export both the class and singleton instance
export { EventBus, eventBus };