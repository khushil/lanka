// Plugin Validator Implementation
// Validates plugin manifests and instances for security and compliance

import { PluginManifest, IPlugin, PluginPermission } from '../types';

export class PluginValidator {
  private manifestSchema: ManifestSchema;
  private securityRules: SecurityRule[];

  constructor() {
    this.manifestSchema = this.createManifestSchema();
    this.securityRules = this.createSecurityRules();
  }

  async initialize(): Promise<void> {
    console.log('Initializing plugin validator...');
    // Load any additional validation rules or schemas
    console.log('Plugin validator initialized');
  }

  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    const structureResult = this.validateManifestStructure(manifest);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);

    // Security validation
    const securityResult = this.validateManifestSecurity(manifest);
    errors.push(...securityResult.errors);
    warnings.push(...securityResult.warnings);

    // Dependency validation
    const dependencyResult = this.validateDependencies(manifest);
    errors.push(...dependencyResult.errors);
    warnings.push(...dependencyResult.warnings);

    // Permission validation
    const permissionResult = this.validatePermissions(manifest);
    errors.push(...permissionResult.errors);
    warnings.push(...permissionResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateInstance(instance: IPlugin, manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required methods
    const methodResult = this.validateRequiredMethods(instance, manifest);
    errors.push(...methodResult.errors);
    warnings.push(...methodResult.warnings);

    // Check capability methods
    const capabilityResult = this.validateCapabilityMethods(instance, manifest);
    errors.push(...capabilityResult.errors);
    warnings.push(...capabilityResult.warnings);

    // Check hook methods
    const hookResult = this.validateHookMethods(instance, manifest);
    errors.push(...hookResult.errors);
    warnings.push(...hookResult.warnings);

    // Security scan of instance
    const securityResult = this.validateInstanceSecurity(instance);
    errors.push(...securityResult.errors);
    warnings.push(...securityResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Manifest structure validation
  private validateManifestStructure(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    } else if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      errors.push('Plugin name must contain only lowercase letters, numbers, and hyphens');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    } else if (!/^\d+\.\d+\.\d+([+-][\w.-]+)?$/.test(manifest.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    if (!Array.isArray(manifest.capabilities)) {
      errors.push('Plugin capabilities must be an array');
    } else if (manifest.capabilities.length === 0) {
      warnings.push('Plugin has no capabilities defined');
    }

    if (!Array.isArray(manifest.hooks)) {
      errors.push('Plugin hooks must be an array');
    }

    if (!Array.isArray(manifest.dependencies)) {
      errors.push('Plugin dependencies must be an array');
    }

    // Optional fields validation
    if (manifest.description && typeof manifest.description !== 'string') {
      warnings.push('Plugin description should be a string');
    }

    if (manifest.author && typeof manifest.author !== 'string') {
      warnings.push('Plugin author should be a string');
    }

    if (manifest.license && typeof manifest.license !== 'string') {
      warnings.push('Plugin license should be a string');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Security validation
  private validateManifestSecurity(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for suspicious capabilities
    const suspiciousCapabilities = [
      'execute-system-commands',
      'access-filesystem-root',
      'network-unrestricted',
      'modify-system-config'
    ];

    for (const capability of manifest.capabilities) {
      if (suspiciousCapabilities.includes(capability)) {
        warnings.push(`Suspicious capability detected: ${capability}`);
      }
    }

    // Validate permissions
    if (manifest.requiredPermissions) {
      for (const permission of manifest.requiredPermissions) {
        if (!Object.values(PluginPermission).includes(permission)) {
          errors.push(`Invalid permission: ${permission}`);
        }
        
        // High-risk permissions
        const highRiskPermissions = [
          PluginPermission.DELETE_MEMORY,
          PluginPermission.MODIFY_GRAPH,
          PluginPermission.SYSTEM_EVENTS
        ];
        
        if (highRiskPermissions.includes(permission)) {
          warnings.push(`High-risk permission requested: ${permission}`);
        }
      }
    }

    // Check resource limits
    if (manifest.resourceLimits) {
      if (manifest.resourceLimits.maxMemoryMB && manifest.resourceLimits.maxMemoryMB > 500) {
        warnings.push('High memory limit requested (>500MB)');
      }
      
      if (manifest.resourceLimits.maxExecutionTimeMs && manifest.resourceLimits.maxExecutionTimeMs > 60000) {
        warnings.push('Long execution time limit requested (>60s)');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Dependencies validation
  private validateDependencies(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const dep of manifest.dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name || dep;
      
      if (typeof depName !== 'string' || !depName) {
        errors.push('Invalid dependency format');
        continue;
      }

      // Check for dangerous dependencies
      const dangerousDeps = [
        'child_process',
        'fs',
        'os',
        'path',
        'cluster',
        'worker_threads'
      ];
      
      if (dangerousDeps.includes(depName)) {
        warnings.push(`Potentially dangerous dependency: ${depName}`);
      }

      // Check for known vulnerable packages (simplified)
      const vulnerablePackages = ['event-stream', 'flatmap-stream'];
      if (vulnerablePackages.includes(depName)) {
        errors.push(`Known vulnerable dependency: ${depName}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Permissions validation
  private validatePermissions(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.requiredPermissions) {
      warnings.push('No permissions specified - plugin may not function correctly');
      return { valid: true, errors, warnings };
    }

    // Check permission combinations
    const hasDeleteMemory = manifest.requiredPermissions.includes(PluginPermission.DELETE_MEMORY);
    const hasWriteMemory = manifest.requiredPermissions.includes(PluginPermission.WRITE_MEMORY);
    
    if (hasDeleteMemory && !hasWriteMemory) {
      warnings.push('Delete permission without write permission - unusual combination');
    }

    // Check for over-permissioned plugins
    if (manifest.requiredPermissions.length > 5) {
      warnings.push('Plugin requests many permissions - consider if all are necessary');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Instance method validation
  private validateRequiredMethods(instance: IPlugin, manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required methods
    const requiredMethods = ['getMetadata', 'initialize', 'shutdown'];
    
    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        errors.push(`Missing required method: ${method}`);
      }
    }

    // Check getMetadata returns valid manifest
    try {
      const metadata = instance.getMetadata();
      if (!metadata || metadata.name !== manifest.name) {
        warnings.push('getMetadata() returns inconsistent data');
      }
    } catch (error) {
      errors.push('getMetadata() method throws error');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Capability method validation
  private validateCapabilityMethods(instance: IPlugin, manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const capability of manifest.capabilities) {
      if (typeof instance[capability] !== 'function') {
        errors.push(`Missing capability method: ${capability}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Hook method validation
  private validateHookMethods(instance: IPlugin, manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hookMethodMap = {
      'memory-ingestion': 'onMemoryIngestion',
      'memory-arbitration': 'onMemoryArbitration',
      'memory-stored': 'onMemoryStored',
      'memory-retrieved': 'onMemoryRetrieved',
      'pre-search': 'onPreSearch',
      'post-search': 'onPostSearch',
      'node-created': 'onNodeCreated',
      'relationship-created': 'onRelationshipCreated',
      'system-startup': 'onSystemStartup',
      'system-shutdown': 'onSystemShutdown'
    };

    for (const hook of manifest.hooks) {
      const methodName = hookMethodMap[hook as keyof typeof hookMethodMap];
      if (methodName && typeof instance[methodName] !== 'function') {
        errors.push(`Missing hook method: ${methodName} for hook ${hook}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Instance security validation
  private validateInstanceSecurity(instance: IPlugin): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for suspicious methods or properties
    const suspiciousProperties = [
      'eval', 'Function', 'constructor',
      '__proto__', 'prototype', '__defineGetter__'
    ];

    for (const prop of suspiciousProperties) {
      if (prop in instance) {
        warnings.push(`Suspicious property detected: ${prop}`);
      }
    }

    // Check if instance attempts to access global objects
    const instanceString = instance.toString();
    const globalAccessPatterns = [
      /global\./,
      /process\./,
      /require\s*\(/,
      /__dirname/,
      /__filename/
    ];

    for (const pattern of globalAccessPatterns) {
      if (pattern.test(instanceString)) {
        warnings.push('Plugin may attempt to access global objects');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private createManifestSchema(): ManifestSchema {
    return {
      name: { type: 'string', required: true },
      version: { type: 'string', required: true },
      description: { type: 'string', required: false },
      author: { type: 'string', required: false },
      license: { type: 'string', required: false },
      capabilities: { type: 'array', required: true },
      hooks: { type: 'array', required: true },
      dependencies: { type: 'array', required: true },
      requiredPermissions: { type: 'array', required: false },
      resourceLimits: { type: 'object', required: false }
    };
  }

  private createSecurityRules(): SecurityRule[] {
    return [
      {
        name: 'no-eval',
        description: 'Plugin should not use eval() or similar dynamic code execution',
        check: (instance: any) => !/\beval\s*\(/.test(instance.toString())
      },
      {
        name: 'no-global-access',
        description: 'Plugin should not access global variables directly',
        check: (instance: any) => !/\bglobal\b/.test(instance.toString())
      },
      {
        name: 'no-process-access',
        description: 'Plugin should not access process object',
        check: (instance: any) => !/\bprocess\b/.test(instance.toString())
      }
    ];
  }
}

// Types
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ManifestSchema {
  [key: string]: {
    type: string;
    required: boolean;
  };
}

interface SecurityRule {
  name: string;
  description: string;
  check: (instance: any) => boolean;
}
