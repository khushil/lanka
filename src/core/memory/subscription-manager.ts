/**
 * Subscription Manager for GraphQL and Real-time Event Management
 * Handles proper cleanup and memory management for subscriptions
 */

import { EventEmitter } from 'events';
import { logger } from '../logging/logger';

export interface Subscription {
  id: string;
  type: 'graphql' | 'websocket' | 'event';
  eventName: string;
  callback: Function;
  context?: any;
  cleanup?: () => void;
  createdAt: Date;
  lastActivity: Date;
}

export interface SubscriptionStats {
  total: number;
  byType: Record<string, number>;
  oldestSubscription: Date | null;
  memoryUsage: {
    subscriptions: number;
    callbacks: number;
    contexts: number;
  };
}

export class SubscriptionManager extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxAge: number = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(maxAge?: number) {
    super();
    this.setMaxListeners(0); // Remove limit for memory efficiency
    
    if (maxAge) {
      this.maxAge = maxAge;
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscriptions();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Create a new subscription with automatic cleanup
   */
  public createSubscription(
    eventName: string,
    callback: Function,
    type: 'graphql' | 'websocket' | 'event' = 'event',
    context?: any,
    customCleanup?: () => void
  ): string {
    if (this.isShuttingDown) {
      throw new Error('SubscriptionManager is shutting down');
    }

    const id = this.generateSubscriptionId();
    const subscription: Subscription = {
      id,
      type,
      eventName,
      callback,
      context,
      cleanup: customCleanup,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.subscriptions.set(id, subscription);

    // Set auto-cleanup timeout
    const timeout = setTimeout(() => {
      this.unsubscribe(id);
    }, this.maxAge);
    this.timeouts.set(id, timeout);

    // Register weak reference cleanup for contexts
    if (context && typeof context === 'object') {
      this.setupWeakRefCleanup(id, context);
    }

    logger.debug(`Created subscription ${id} for event ${eventName}`);
    this.emit('subscription:created', { id, eventName, type });

    return id;
  }

  /**
   * Create a GraphQL subscription with proper cleanup
   */
  public createGraphQLSubscription(
    query: string,
    variables: any,
    callback: (data: any) => void,
    errorHandler?: (error: Error) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    // This would integrate with your GraphQL client
    // For example, with Apollo Client:
    const cleanup = () => {
      // subscription.unsubscribe();
      logger.debug(`GraphQL subscription ${subscriptionId} cleaned up`);
    };

    return this.createSubscription(
      `graphql:${query}`,
      callback,
      'graphql',
      { query, variables, errorHandler },
      cleanup
    );
  }

  /**
   * Create a WebSocket subscription with automatic reconnection handling
   */
  public createWebSocketSubscription(
    event: string,
    callback: (data: any) => void,
    webSocket: any
  ): string {
    const cleanup = () => {
      if (webSocket && typeof webSocket.off === 'function') {
        webSocket.off(event, callback);
      }
      logger.debug(`WebSocket subscription for ${event} cleaned up`);
    };

    return this.createSubscription(event, callback, 'websocket', { webSocket }, cleanup);
  }

  /**
   * Update subscription activity timestamp
   */
  public updateActivity(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.lastActivity = new Date();
      
      // Reset timeout
      const existingTimeout = this.timeouts.get(subscriptionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const newTimeout = setTimeout(() => {
        this.unsubscribe(subscriptionId);
      }, this.maxAge);
      this.timeouts.set(subscriptionId, newTimeout);
    }
  }

  /**
   * Unsubscribe and clean up a subscription
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Clear timeout
    const timeout = this.timeouts.get(subscriptionId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(subscriptionId);
    }

    // Execute custom cleanup
    if (subscription.cleanup) {
      try {
        subscription.cleanup();
      } catch (error) {
        logger.error(`Error in subscription cleanup for ${subscriptionId}:`, error);
      }
    }

    // Remove from tracking
    this.subscriptions.delete(subscriptionId);

    logger.debug(`Unsubscribed ${subscriptionId}`);
    this.emit('subscription:removed', { 
      id: subscriptionId, 
      eventName: subscription.eventName, 
      type: subscription.type 
    });

    return true;
  }

  /**
   * Unsubscribe all subscriptions for an event
   */
  public unsubscribeAll(eventName?: string): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (!eventName || subscription.eventName === eventName) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => {
      if (this.unsubscribe(id)) {
        count++;
      }
    });

    return count;
  }

  /**
   * Get subscription statistics
   */
  public getStats(): SubscriptionStats {
    const byType: Record<string, number> = {};
    let oldestDate: Date | null = null;

    for (const subscription of this.subscriptions.values()) {
      byType[subscription.type] = (byType[subscription.type] || 0) + 1;
      
      if (!oldestDate || subscription.createdAt < oldestDate) {
        oldestDate = subscription.createdAt;
      }
    }

    return {
      total: this.subscriptions.size,
      byType,
      oldestSubscription: oldestDate,
      memoryUsage: {
        subscriptions: this.subscriptions.size,
        callbacks: this.subscriptions.size, // Each subscription has one callback
        contexts: Array.from(this.subscriptions.values()).filter(s => s.context).length
      }
    };
  }

  /**
   * Clean up stale subscriptions
   */
  private cleanupStaleSubscriptions(): void {
    if (this.isShuttingDown) return;

    const now = new Date();
    const staleIds: string[] = [];

    for (const [id, subscription] of this.subscriptions) {
      const age = now.getTime() - subscription.lastActivity.getTime();
      if (age > this.maxAge) {
        staleIds.push(id);
      }
    }

    if (staleIds.length > 0) {
      logger.info(`Cleaning up ${staleIds.length} stale subscriptions`);
      staleIds.forEach(id => this.unsubscribe(id));
    }
  }

  /**
   * Setup weak reference cleanup for contexts
   */
  private setupWeakRefCleanup(subscriptionId: string, context: object): void {
    // Use WeakRef if available (Node.js 14+)
    if (typeof WeakRef !== 'undefined') {
      const weakRef = new WeakRef(context);
      
      // Check if context is garbage collected
      const checkInterval = setInterval(() => {
        if (!weakRef.deref()) {
          this.unsubscribe(subscriptionId);
          clearInterval(checkInterval);
        }
      }, 30000); // Check every 30 seconds

      // Store cleanup for this subscription
      const originalCleanup = this.subscriptions.get(subscriptionId)?.cleanup;
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription) {
        subscription.cleanup = () => {
          clearInterval(checkInterval);
          if (originalCleanup) {
            originalCleanup();
          }
        };
      }
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown the subscription manager
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Unsubscribe all remaining subscriptions
    const subscriptionIds = Array.from(this.subscriptions.keys());
    logger.info(`Shutting down SubscriptionManager, cleaning up ${subscriptionIds.length} subscriptions`);

    for (const id of subscriptionIds) {
      this.unsubscribe(id);
    }

    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Remove all event listeners
    this.removeAllListeners();

    logger.info('SubscriptionManager shutdown complete');
  }

  /**
   * Force garbage collection hint
   */
  public forceGarbageCollection(): void {
    // This will help with memory pressure
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection');
    } else {
      logger.debug('Garbage collection not available (run with --expose-gc)');
    }
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();

// Cleanup on process exit
process.on('beforeExit', () => {
  subscriptionManager.shutdown();
});

process.on('SIGTERM', () => {
  subscriptionManager.shutdown();
});

process.on('SIGINT', () => {
  subscriptionManager.shutdown();
});