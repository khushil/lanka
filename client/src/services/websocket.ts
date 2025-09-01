import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isDestroyed = false;

  connect(url?: string): void {
    const wsUrl = url || process.env.REACT_APP_WS_ENDPOINT || 'http://localhost:4000';
    
    this.socket = io(wsUrl, {
      autoConnect: true,
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('authToken'),
      },
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      // Attempt reconnection if not intentionally disconnected
      if (!this.isDestroyed && reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      
      // Clear connection timeout on error
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    });

    // Handle incoming messages
    this.socket.onAny((eventName, data) => {
      if (this.isDestroyed) return;
      
      const listeners = this.listeners.get(eventName);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`Error in listener for event ${eventName}:`, error);
          }
        });
      }
    });
    
    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.warn('Connection timeout, disconnecting...');
        this.disconnect();
      }
    }, 30000); // 30 second timeout
  }

  disconnect(): void {
    this.isDestroyed = true;
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Clear all subscriptions
    this.subscriptions.forEach((sub, key) => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions.clear();
    
    // Clear all listeners
    this.listeners.clear();
    
    if (this.socket) {
      // Remove all event listeners to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.reconnectAttempts = 0;
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (this.isDestroyed) {
      return () => {};
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event)!;
    if (callback) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.listeners.set(event, []);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
  
  private attemptReconnect(): void {
    if (this.isDestroyed) return;
    
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.isDestroyed && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }
  
  public subscribe(event: string, callback: (data: any) => void): { unsubscribe: () => void } {
    const unsubscribe = this.on(event, callback);
    const subscriptionId = `${event}_${Date.now()}_${Math.random()}`;
    
    const subscription = {
      unsubscribe: () => {
        unsubscribe();
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }
  
  public getConnectionStats(): { 
    connected: boolean;
    reconnectAttempts: number;
    activeListeners: number;
    activeSubscriptions: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      activeListeners: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
      activeSubscriptions: this.subscriptions.size
    };
  }
}

export const webSocketService = new WebSocketService();