// Core Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  preferences?: UserPreferences;
}

export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  system: boolean;
}

// Module Types
export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  status: ModuleStatus;
  description?: string;
  version: string;
  lastUpdated: Date;
  dependencies: string[];
  metadata?: Record<string, any>;
}

export enum ModuleType {
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  DEVELOPMENT = 'development',
  INTEGRATION = 'integration'
}

export enum ModuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error'
}

// Graph Types
export interface GraphNode {
  id: string;
  type: string;
  data: {
    label: string;
    description?: string;
    status?: string;
    [key: string]: any;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    label?: string;
    weight?: number;
    [key: string]: any;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chart Types
export interface ChartData {
  name: string;
  value: number;
  category?: string;
  timestamp?: Date;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metric: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  roles?: UserRole[];
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  preferences?: UserPreferences;
  isEmailVerified: boolean;
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: UserRole;
  acceptTerms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface ResetPasswordData {
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ADMIN = 'admin'
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
}

// Re-export types from other modules
export * from './collaboration';
export * from './notifications';
export * from './analytics';
export * from './settings';