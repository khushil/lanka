import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Notification, NotificationState, NotificationPreferences, NotificationType } from '../types/notifications';
import { webSocketService } from '../services/websocket';

interface NotificationContextType {
  state: NotificationState;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  updatePreferences: (preferences: NotificationPreferences) => void;
}

type NotificationAction =
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_PREFERENCES'; payload: NotificationPreferences };

const initialPreferences: NotificationPreferences = {
  email: true,
  push: true,
  desktop: true,
  inApp: true,
  types: {
    [NotificationType.SYSTEM]: { enabled: true, email: true, push: true },
    [NotificationType.REQUIREMENTS]: { enabled: true, email: true, push: false },
    [NotificationType.ARCHITECTURE]: { enabled: true, email: true, push: false },
    [NotificationType.DEVELOPMENT]: { enabled: true, email: false, push: true },
    [NotificationType.COLLABORATION]: { enabled: true, email: false, push: true },
    [NotificationType.SECURITY]: { enabled: true, email: true, push: true },
    [NotificationType.DEPLOYMENT]: { enabled: true, email: true, push: true },
    [NotificationType.ALERT]: { enabled: true, email: true, push: true }
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: initialPreferences
};

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      const unreadCount = action.payload.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: action.payload,
        unreadCount,
        isLoading: false
      };

    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.isRead).length
      };

    case 'MARK_AS_READ':
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, isRead: true } : n
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length
      };

    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0
      };

    case 'REMOVE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.isRead).length
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: action.payload
      };

    default:
      return state;
  }
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Show desktop notification if enabled
    if (state.preferences.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
    }
  }, [state.preferences.desktop]);

  const markAsRead = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: notificationId });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const updatePreferences = useCallback((preferences: NotificationPreferences) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, []);

  // Initialize preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }

    // Request desktop notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set up WebSocket listeners for real-time notifications
  useEffect(() => {
    const handleNotification = (data: any) => {
      addNotification(data);
    };

    webSocketService.on('notification', handleNotification);

    return () => {
      webSocketService.off('notification', handleNotification);
    };
  }, [addNotification]);

  const contextValue: NotificationContextType = {
    state,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};