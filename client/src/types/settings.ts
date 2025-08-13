// Settings Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  department?: string;
  location?: string;
  timezone: string;
  phoneNumber?: string;
  bio?: string;
  socialLinks?: SocialLink[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastPasswordChange: Date;
}

export interface SocialLink {
  platform: string;
  url: string;
  isPublic: boolean;
}

export interface ApplicationPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: string;
  timeFormat: '12' | '24';
  timezone: string;
  defaultView: 'dashboard' | 'requirements' | 'architecture' | 'development';
  sidebarCollapsed: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in minutes
  showTooltips: boolean;
  enableAnimations: boolean;
  compactMode: boolean;
}

export interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays?: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    method: 'sms' | 'email' | 'authenticator';
    backupCodes: string[];
    lastVerified?: Date;
  };
  sessions: UserSession[];
  loginHistory: LoginAttempt[];
  apiKeys: ApiKey[];
}

export interface UserSession {
  id: string;
  deviceInfo: string;
  location: string;
  ipAddress: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface LoginAttempt {
  id: string;
  ipAddress: string;
  location: string;
  deviceInfo: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // Masked version
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'team' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  dataRetention: {
    keepHistory: boolean;
    retentionPeriod: number; // in days
  };
  analytics: {
    allowUsageTracking: boolean;
    allowPerformanceTracking: boolean;
    allowErrorReporting: boolean;
  };
}

export interface IntegrationSettings {
  connectedAccounts: ConnectedAccount[];
  webhooks: WebhookConfiguration[];
  apiAccess: {
    allowExternalAccess: boolean;
    rateLimits: {
      requests: number;
      windowMinutes: number;
    };
  };
}

export interface ConnectedAccount {
  id: string;
  provider: string;
  accountId: string;
  displayName: string;
  isActive: boolean;
  permissions: string[];
  connectedAt: Date;
  lastSync?: Date;
}

export interface WebhookConfiguration {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
  lastTriggered?: Date;
}

export interface UserSettings {
  profile: UserProfile;
  preferences: ApplicationPreferences;
  security: SecuritySettings;
  privacy: PrivacySettings;
  notifications: NotificationPreferences;
  integrations: IntegrationSettings;
}