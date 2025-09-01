// Plugin Sandbox Implementation
// Secure execution environment for plugins

import { Worker } from 'worker_threads';
import { SandboxConfig, SecurityContext, SecurityViolation, SecurityViolationType } from '../types';

export class PluginSandbox {
  private config: SandboxConfig;
  private activeExecutions: Map<string, SandboxExecution> = new Map();
  private securityContexts: Map<string, SecurityContext> = new Map();
  private violations: SecurityViolation[] = [];

  constructor(config: SandboxConfig) {
    this.config = {
      timeout: 30000,
      memoryLimit: '100MB',
      allowedModules: ['lodash', 'moment'],
      blockedModules: ['fs', 'child_process', 'cluster'],
      allowNetworking: false,
      allowFileSystem: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log('Initializing plugin sandbox...');
    
    // Create base security context
    this.setupBaseSandbox();
    
    console.log('Plugin sandbox initialized');
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down plugin sandbox...');
    
    // Terminate all active executions
    for (const [pluginId, execution] of this.activeExecutions) {
      try {
        await this.terminateExecution(pluginId);
      } catch (error) {
        console.error(`Error terminating execution for plugin ${pluginId}:`, error);
      }
    }
    
    this.activeExecutions.clear();
    this.securityContexts.clear();
    
    console.log('Plugin sandbox shutdown complete');
  }

  async execute<T>(pluginId: string, operation: () => Promise<T> | T): Promise<T> {
    const context = this.securityContexts.get(pluginId);
    if (!context) {
      throw new Error(`No security context found for plugin ${pluginId}`);
    }

    const execution: SandboxExecution = {
      pluginId,
      startTime: Date.now(),
      operation,
      context,
      status: 'running'
    };

    this.activeExecutions.set(pluginId, execution);

    try {
      // Execute with security checks and timeouts
      const result = await this.executeInSandbox(execution);
      
      execution.status = 'completed';
      execution.endTime = Date.now();
      
      return result;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error;
      execution.endTime = Date.now();
      
      // Log security violation if applicable
      if (this.isSecurityViolation(error)) {
        this.logSecurityViolation(pluginId, error);
      }
      
      throw error;
    } finally {
      this.activeExecutions.delete(pluginId);
    }
  }

  createSecurityContext(pluginId: string, config: any): SecurityContext {
    const context: SecurityContext = {
      pluginId,
      permissions: new Set(config.permissions || []),
      resourceQuota: {
        maxMemoryBytes: this.parseMemoryLimit(config.memoryLimit || this.config.memoryLimit),
        maxCpuTimeMs: config.timeout || this.config.timeout,
        maxFileHandles: 10,
        maxNetworkConnections: config.allowNetworking ? 5 : 0,
        maxDatabaseQueries: 100,
        maxApiCalls: 1000
      },
      trustedLevel: this.determineTrustLevel(pluginId, config),
      sandboxConfig: {
        isolatedEnvironment: true,
        allowedGlobals: ['console', 'Date', 'Math', 'JSON'],
        blockedGlobals: ['process', 'require', 'module', '__dirname', '__filename'],
        allowedModules: config.allowedModules || this.config.allowedModules,
        blockedModules: config.blockedModules || this.config.blockedModules,
        fileSystemAccess: {
          allowed: config.allowFileSystem || this.config.allowFileSystem || false,
          readOnlyPaths: [],
          readWritePaths: [],
          blockedPaths: ['/etc', '/sys', '/proc']
        },
        networkAccess: {
          allowed: config.allowNetworking || this.config.allowNetworking || false,
          allowedHosts: [],
          blockedHosts: ['localhost', '127.0.0.1'],
          allowedPorts: [80, 443],
          blockedPorts: [22, 23, 21]
        },
        processAccess: {
          allowSpawn: false,
          allowExec: false,
          allowedCommands: [],
          blockedCommands: ['rm', 'rm -rf', 'sudo', 'su']
        }
      }
    };

    this.securityContexts.set(pluginId, context);
    return context;
  }

  async terminateExecution(pluginId: string): Promise<void> {
    const execution = this.activeExecutions.get(pluginId);
    if (execution) {
      execution.status = 'terminated';
      execution.endTime = Date.now();
      
      if (execution.worker) {
        await execution.worker.terminate();
      }
      
      this.activeExecutions.delete(pluginId);
    }
  }

  getActiveExecutions(): SandboxExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  getSecurityViolations(pluginId?: string): SecurityViolation[] {
    if (pluginId) {
      return this.violations.filter(v => v.pluginId === pluginId);
    }
    return [...this.violations];
  }

  // Private methods

  private async executeInSandbox<T>(execution: SandboxExecution): Promise<T> {
    const { pluginId, operation, context } = execution;

    // Check resource quotas before execution
    this.checkResourceQuotas(pluginId, context);

    // Set up execution timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${context.resourceQuota.maxCpuTimeMs}ms`));
      }, context.resourceQuota.maxCpuTimeMs);
    });

    // Execute operation in isolated context
    const operationPromise = this.executeWithIsolation(operation, context);

    // Race between operation and timeout
    return Promise.race([operationPromise, timeoutPromise]);
  }

  private async executeWithIsolation<T>(
    operation: () => Promise<T> | T,
    context: SecurityContext
  ): Promise<T> {
    // For now, execute directly with monitoring
    // In a production system, this would use Worker threads or V8 isolates
    
    const originalRequire = global.require;
    const originalProcess = global.process;
    
    try {
      // Monkey-patch dangerous globals
      this.patchGlobals(context);
      
      // Execute the operation
      const result = await operation();
      
      return result;
    } finally {
      // Restore original globals
      global.require = originalRequire;
      global.process = originalProcess;
    }
  }

  private patchGlobals(context: SecurityContext): void {
    // Override require to check allowed modules
    const originalRequire = global.require;
    (global as any).require = (module: string) => {
      if (context.sandboxConfig.blockedModules.includes(module)) {
        throw new Error(`Module '${module}' is not allowed in sandbox`);
      }
      
      if (context.sandboxConfig.allowedModules && 
          !context.sandboxConfig.allowedModules.includes(module)) {
        throw new Error(`Module '${module}' is not in allowed modules list`);
      }
      
      return originalRequire(module);
    };

    // Remove dangerous process methods
    if (global.process) {
      const sandboxProcess = {
        env: {},
        argv: [],
        version: process.version,
        platform: process.platform
      };
      
      (global as any).process = sandboxProcess;
    }
  }

  private checkResourceQuotas(pluginId: string, context: SecurityContext): void {
    // Check memory usage (simplified check)
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > context.resourceQuota.maxMemoryBytes) {
      throw new Error(`Memory limit exceeded: ${memoryUsage.heapUsed} > ${context.resourceQuota.maxMemoryBytes}`);
    }

    // Check concurrent executions
    const activeCount = Array.from(this.activeExecutions.values())
      .filter(e => e.pluginId === pluginId && e.status === 'running').length;
    
    if (activeCount > 5) { // Max 5 concurrent executions per plugin
      throw new Error(`Too many concurrent executions for plugin ${pluginId}`);
    }
  }

  private setupBaseSandbox(): void {
    // Set up global sandbox restrictions
    // This would be more comprehensive in a production system
  }

  private determineTrustLevel(pluginId: string, config: any): number {
    // Determine trust level based on plugin source and configuration
    if (config.trusted) {
      return 4; // System level trust
    }
    
    if (config.signed) {
      return 3; // High trust
    }
    
    if (config.verified) {
      return 2; // Medium trust
    }
    
    return 1; // Low trust (default)
  }

  private parseMemoryLimit(limit: string): number {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    
    const match = limit.match(/(\d+)([A-Z]+)?/);
    if (!match) {
      return 100 * 1024 * 1024; // Default 100MB
    }
    
    const value = parseInt(match[1]);
    const unit = match[2] || 'B';
    
    return value * (units[unit as keyof typeof units] || 1);
  }

  private isSecurityViolation(error: any): boolean {
    if (!error || typeof error.message !== 'string') {
      return false;
    }
    
    const violationPatterns = [
      /not allowed in sandbox/i,
      /permission denied/i,
      /security violation/i,
      /memory limit exceeded/i,
      /execution timeout/i
    ];
    
    return violationPatterns.some(pattern => pattern.test(error.message));
  }

  private logSecurityViolation(pluginId: string, error: any): void {
    const violation: SecurityViolation = {
      type: this.categorizeViolation(error.message),
      pluginId,
      description: error.message,
      timestamp: new Date(),
      severity: this.assessSeverity(error.message),
      context: {
        stackTrace: error.stack,
        operation: 'plugin-execution'
      },
      stackTrace: error.stack
    };
    
    this.violations.push(violation);
    
    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }
    
    console.error(`Security violation in plugin ${pluginId}:`, violation);
  }

  private categorizeViolation(message: string): SecurityViolationType {
    if (message.includes('not allowed') || message.includes('permission')) {
      return SecurityViolationType.PERMISSION_DENIED;
    }
    
    if (message.includes('limit exceeded') || message.includes('timeout')) {
      return SecurityViolationType.RESOURCE_EXCEEDED;
    }
    
    if (message.includes('unauthorized') || message.includes('access')) {
      return SecurityViolationType.UNAUTHORIZED_ACCESS;
    }
    
    return SecurityViolationType.MALICIOUS_BEHAVIOR;
  }

  private assessSeverity(message: string): 'low' | 'medium' | 'high' | 'critical' {
    if (message.includes('critical') || message.includes('sandbox escape')) {
      return 'critical';
    }
    
    if (message.includes('unauthorized') || message.includes('malicious')) {
      return 'high';
    }
    
    if (message.includes('limit exceeded') || message.includes('timeout')) {
      return 'medium';
    }
    
    return 'low';
  }
}

interface SandboxExecution {
  pluginId: string;
  startTime: number;
  endTime?: number;
  operation: () => any;
  context: SecurityContext;
  status: 'running' | 'completed' | 'failed' | 'terminated';
  error?: any;
  worker?: Worker;
}
