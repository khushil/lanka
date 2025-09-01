// Plugin Security Types
// Security-related interfaces and types for plugin sandboxing

export interface SecurityContext {
  pluginId: string;
  permissions: Set<string>;
  resourceQuota: ResourceQuota;
  trustedLevel: TrustLevel;
  sandboxConfig: SandboxConfiguration;
}

export enum TrustLevel {
  UNTRUSTED = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  SYSTEM = 4
}

export interface ResourceQuota {
  maxMemoryBytes: number;
  maxCpuTimeMs: number;
  maxFileHandles: number;
  maxNetworkConnections: number;
  maxDatabaseQueries: number;
  maxApiCalls: number;
}

export interface SandboxConfiguration {
  isolatedEnvironment: boolean;
  allowedGlobals: string[];
  blockedGlobals: string[];
  allowedModules: string[];
  blockedModules: string[];
  fileSystemAccess: FileSystemAccess;
  networkAccess: NetworkAccess;
  processAccess: ProcessAccess;
}

export interface FileSystemAccess {
  allowed: boolean;
  readOnlyPaths: string[];
  readWritePaths: string[];
  blockedPaths: string[];
}

export interface NetworkAccess {
  allowed: boolean;
  allowedHosts: string[];
  blockedHosts: string[];
  allowedPorts: number[];
  blockedPorts: number[];
}

export interface ProcessAccess {
  allowSpawn: boolean;
  allowExec: boolean;
  allowedCommands: string[];
  blockedCommands: string[];
}

// Security violation types
export enum SecurityViolationType {
  PERMISSION_DENIED = 'permission-denied',
  RESOURCE_EXCEEDED = 'resource-exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized-access',
  MALICIOUS_BEHAVIOR = 'malicious-behavior',
  SANDBOX_ESCAPE = 'sandbox-escape'
}

export interface SecurityViolation {
  type: SecurityViolationType;
  pluginId: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: any;
  stackTrace?: string;
}

// Audit log entry
export interface PluginAuditEntry {
  pluginId: string;
  action: string;
  resource: string;
  result: 'allowed' | 'denied';
  timestamp: Date;
  metadata: Record<string, any>;
}

// Permission validator
export interface IPermissionValidator {
  validatePermission(pluginId: string, permission: string, context: any): boolean;
  checkResourceUsage(pluginId: string, resource: string, amount: number): boolean;
  logAccess(entry: PluginAuditEntry): void;
  getViolations(pluginId?: string): SecurityViolation[];
}
