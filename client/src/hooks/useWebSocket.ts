import { useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '../services/websocket';

export function useWebSocket() {
  const isConnectedRef = useRef(false);

  const connect = useCallback((url?: string) => {
    if (!isConnectedRef.current) {
      webSocketService.connect(url);
      isConnectedRef.current = true;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (isConnectedRef.current) {
      webSocketService.disconnect();
      isConnectedRef.current = false;
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    webSocketService.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    webSocketService.on(event, callback);
    
    // Return cleanup function
    return () => {
      webSocketService.off(event, callback);
    };
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    webSocketService.off(event, callback);
  }, []);

  const isConnected = useCallback(() => {
    return webSocketService.isConnected();
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected,
  };
}