// Event Bus Implementation
// Central event system for plugin communication and coordination

import { EventEmitter } from 'events';
import {
  IEventBus,
  EventSubscription,
  EventHandler,
  EventFilter,
  SystemEvent,
  PluginEvent
} from '../types';

export class EventBus extends EventEmitter implements IEventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Map<string, any[]> = new Map();
  private maxHistorySize = 1000;
  private pluginEventBuses: Map<string, PluginEventBus> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many plugin subscriptions
  }

  async initialize(): Promise<void> {
    console.log('Initializing event bus...');
    
    // Set up system event handlers
    this.setupSystemEventHandlers();
    
    console.log('Event bus initialized');
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down event bus...');
    
    // Clean up all subscriptions
    for (const [eventType, subscriptions] of this.subscriptions) {
      for (const subscription of subscriptions) {
        this.removeListener(eventType, subscription.handler);
      }
    }
    
    this.subscriptions.clear();
    this.eventHistory.clear();
    this.pluginEventBuses.clear();
    this.removeAllListeners();
    
    console.log('Event bus shutdown complete');
  }

  subscribe(subscription: EventSubscription): void {
    const { eventType, pluginId, handler, priority = 0, filter } = subscription;

    // Validate subscription
    this.validateSubscription(subscription);

    // Create wrapped handler with filtering and error handling
    const wrappedHandler = this.createWrappedHandler(pluginId, handler, filter);

    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    const subscriptions = this.subscriptions.get(eventType)!;
    subscriptions.push({ ...subscription, handler: wrappedHandler });
    
    // Sort by priority (higher priority first)
    subscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Register with EventEmitter
    this.on(eventType, wrappedHandler);

    console.log(`Plugin ${pluginId} subscribed to event ${eventType}`);
  }

  unsubscribe(eventType: string, pluginId: string): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) return;

    // Find and remove subscriptions for this plugin
    const updatedSubscriptions = subscriptions.filter(sub => {
      if (sub.pluginId === pluginId) {
        this.removeListener(eventType, sub.handler);
        return false;
      }
      return true;
    });

    if (updatedSubscriptions.length === 0) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.set(eventType, updatedSubscriptions);
    }

    console.log(`Plugin ${pluginId} unsubscribed from event ${eventType}`);
  }

  async emit(eventType: string, payload: any): Promise<void> {
    // Add to event history
    this.addToEventHistory(eventType, payload);

    // Emit the event
    const eventData = {
      eventType,
      payload,
      timestamp: new Date(),
      id: this.generateEventId()
    };

    console.log(`Emitting event ${eventType}:`, payload);
    
    // Use EventEmitter's emit (synchronous)
    super.emit(eventType, eventData);

    // Also emit to catch-all listeners
    super.emit('*', eventData);
  }

  listSubscriptions(eventType?: string): EventSubscription[] {
    if (eventType) {
      return this.subscriptions.get(eventType) || [];
    }
    
    const allSubscriptions: EventSubscription[] = [];
    for (const subscriptions of this.subscriptions.values()) {
      allSubscriptions.push(...subscriptions);
    }
    
    return allSubscriptions;
  }

  getEventHistory(eventType: string, limit = 100): any[] {
    const history = this.eventHistory.get(eventType) || [];
    return history.slice(-limit);
  }

  clearEventHistory(eventType?: string): void {
    if (eventType) {
      this.eventHistory.delete(eventType);
    } else {
      this.eventHistory.clear();
    }
  }

  // Plugin-specific event bus creation
  createPluginEventBus(pluginId: string): PluginEventBus {
    if (this.pluginEventBuses.has(pluginId)) {
      return this.pluginEventBuses.get(pluginId)!;
    }

    const pluginEventBus = new PluginEventBus(pluginId, this);
    this.pluginEventBuses.set(pluginId, pluginEventBus);
    
    return pluginEventBus;
  }

  // System event management
  emitSystemEvent(event: SystemEvent, payload: any): void {
    this.emit(event, payload);
  }

  emitPluginEvent(event: PluginEvent, payload: any): void {
    this.emit(event, payload);
  }

  // Event metrics and monitoring
  getEventMetrics(): EventMetrics {
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);
    
    const totalHistoryEvents = Array.from(this.eventHistory.values())
      .reduce((total, events) => total + events.length, 0);

    const eventTypes = Array.from(this.subscriptions.keys());
    const pluginCount = new Set(
      Array.from(this.subscriptions.values())
        .flat()
        .map(sub => sub.pluginId)
    ).size;

    return {
      totalSubscriptions,
      totalHistoryEvents,
      eventTypes: eventTypes.length,
      activePlugins: pluginCount,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Private methods

  private validateSubscription(subscription: EventSubscription): void {
    if (!subscription.eventType || typeof subscription.eventType !== 'string') {
      throw new Error('Event type must be a non-empty string');
    }

    if (!subscription.pluginId || typeof subscription.pluginId !== 'string') {
      throw new Error('Plugin ID must be a non-empty string');
    }

    if (typeof subscription.handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    if (subscription.priority !== undefined && 
        (typeof subscription.priority !== 'number' || subscription.priority < 0)) {
      throw new Error('Priority must be a non-negative number');
    }
  }

  private createWrappedHandler(
    pluginId: string, 
    handler: EventHandler, 
    filter?: EventFilter
  ): EventHandler {
    return async (event: any) => {
      try {
        // Apply filter if provided
        if (filter && !filter(event)) {
          return;
        }

        // Execute handler with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Event handler timeout')), 5000);
        });

        const handlerPromise = Promise.resolve(handler(event));
        await Promise.race([handlerPromise, timeoutPromise]);
        
      } catch (error) {
        console.error(`Event handler error in plugin ${pluginId}:`, error);
        
        // Emit error event
        this.emit(SystemEvent.PLUGIN_ERROR, {
          pluginId,
          error,
          context: 'event-handler',
          eventType: event.eventType
        });
      }
    };
  }

  private setupSystemEventHandlers(): void {
    // Monitor plugin lifecycle events
    this.on(SystemEvent.PLUGIN_LOADED, (event) => {
      console.log(`Plugin loaded: ${event.payload.pluginId}`);
    });

    this.on(SystemEvent.PLUGIN_UNLOADED, (event) => {
      console.log(`Plugin unloaded: ${event.payload.pluginId}`);
      
      // Clean up subscriptions for unloaded plugin
      for (const [eventType, subscriptions] of this.subscriptions) {
        this.unsubscribe(eventType, event.payload.pluginId);
      }
    });

    this.on(SystemEvent.PLUGIN_ERROR, (event) => {
      console.error(`Plugin error: ${event.payload.pluginId}`, event.payload.error);
    });
  }

  private addToEventHistory(eventType: string, payload: any): void {
    if (!this.eventHistory.has(eventType)) {
      this.eventHistory.set(eventType, []);
    }

    const history = this.eventHistory.get(eventType)!;
    history.push({
      payload,
      timestamp: new Date()
    });

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage
    const subscriptionSize = JSON.stringify(Array.from(this.subscriptions.entries())).length;
    const historySize = JSON.stringify(Array.from(this.eventHistory.entries())).length;
    return subscriptionSize + historySize;
  }
}

// Plugin-specific event bus proxy
export class PluginEventBus extends EventEmitter {
  private pluginId: string;
  private mainEventBus: EventBus;
  private subscribedEvents: Set<string> = new Set();

  constructor(pluginId: string, mainEventBus: EventBus) {
    super();
    this.pluginId = pluginId;
    this.mainEventBus = mainEventBus;
  }

  subscribe(eventType: string, handler: EventHandler, options?: {
    priority?: number;
    filter?: EventFilter;
  }): void {
    const subscription: EventSubscription = {
      eventType,
      pluginId: this.pluginId,
      handler,
      priority: options?.priority,
      filter: options?.filter
    };

    this.mainEventBus.subscribe(subscription);
    this.subscribedEvents.add(eventType);
  }

  unsubscribe(eventType: string): void {
    this.mainEventBus.unsubscribe(eventType, this.pluginId);
    this.subscribedEvents.delete(eventType);
  }

  emit(eventType: string, payload: any): void {
    // Add plugin context to payload
    const enrichedPayload = {
      ...payload,
      source: this.pluginId,
      timestamp: new Date()
    };

    this.mainEventBus.emit(eventType, enrichedPayload);
  }

  getSubscribedEvents(): string[] {
    return Array.from(this.subscribedEvents);
  }

  cleanup(): void {
    // Unsubscribe from all events
    for (const eventType of this.subscribedEvents) {
      this.unsubscribe(eventType);
    }
    
    this.removeAllListeners();
    this.subscribedEvents.clear();
  }
}

// Event metrics interface
interface EventMetrics {
  totalSubscriptions: number;
  totalHistoryEvents: number;
  eventTypes: number;
  activePlugins: number;
  memoryUsage: number;
}
