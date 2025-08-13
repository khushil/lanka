// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: NotificationPriority;
  timestamp: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export enum NotificationType {
  SYSTEM = 'system',
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  DEVELOPMENT = 'development',
  COLLABORATION = 'collaboration',
  SECURITY = 'security',
  DEPLOYMENT = 'deployment',
  ALERT = 'alert'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  inApp: boolean;
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      email: boolean;
      push: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // Time format: "HH:mm"
    end: string;
  };
}

export interface NotificationSettings {
  preferences: NotificationPreferences;
  channels: NotificationChannel[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'teams' | 'webhook';
  name: string;
  isEnabled: boolean;
  configuration: Record<string, any>;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences;
}