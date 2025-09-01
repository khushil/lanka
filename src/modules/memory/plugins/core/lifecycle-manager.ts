// Plugin Lifecycle Manager
// Manages plugin installation, activation, deactivation, and removal

import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  PluginManifest,
  PluginState,
  PluginInstallResult,
  PluginOperationResult
} from '../types';

export class PluginLifecycleManager extends EventEmitter {
  private pluginDirectory: string;
  private installedPlugins: Map<string, PluginInstallationRecord> = new Map();
  private installationLocks: Set<string> = new Set();

  constructor(pluginDirectory: string) {
    super();
    this.pluginDirectory = pluginDirectory;
  }

  async initialize(): Promise<void> {
    console.log('Initializing plugin lifecycle manager...');
    
    // Ensure plugin directory exists
    await fs.mkdir(this.pluginDirectory, { recursive: true });
    
    // Load existing plugin installations
    await this.loadInstalledPlugins();
    
    console.log('Plugin lifecycle manager initialized');
  }

  /**
   * Install a plugin from various sources
   */
  async installPlugin(
    source: PluginInstallSource,
    options: InstallOptions = {}
  ): Promise<PluginInstallResult> {
    const pluginId = this.extractPluginId(source);
    
    // Check if installation is already in progress
    if (this.installationLocks.has(pluginId)) {
      return {
        success: false,
        error: `Installation of ${pluginId} is already in progress`
      };
    }

    // Check if plugin is already installed
    if (this.installedPlugins.has(pluginId) && !options.force) {
      return {
        success: false,
        error: `Plugin ${pluginId} is already installed (use force=true to reinstall)`
      };
    }

    this.installationLocks.add(pluginId);
    
    try {
      // Create installation record
      const installRecord: PluginInstallationRecord = {
        pluginId,
        source,
        installDate: new Date(),
        version: '',
        state: PluginState.LOADING,
        dependencies: [],
        installPath: path.join(this.pluginDirectory, pluginId)
      };

      this.emit('plugin:install:started', { pluginId, source });

      // Download/copy plugin files
      await this.downloadPlugin(source, installRecord.installPath);

      // Load and validate manifest
      const manifest = await this.loadPluginManifest(installRecord.installPath);
      if (!manifest) {
        throw new Error('Invalid or missing plugin manifest');
      }

      installRecord.version = manifest.version;
      installRecord.dependencies = manifest.dependencies.map(dep => 
        typeof dep === 'string' ? dep : dep.name || dep.toString()
      );

      // Install dependencies
      if (manifest.dependencies.length > 0 && !options.skipDependencies) {
        await this.installDependencies(manifest.dependencies, options);
      }

      // Run post-install hooks
      if (options.runPostInstallHooks) {
        await this.runPostInstallHooks(installRecord);
      }

      installRecord.state = PluginState.LOADED;
      this.installedPlugins.set(pluginId, installRecord);

      // Persist installation record
      await this.saveInstallationRecord(installRecord);

      this.emit('plugin:install:completed', { pluginId, manifest });

      return {
        success: true,
        pluginId,
        warnings: []
      };

    } catch (error) {
      this.emit('plugin:install:failed', { pluginId, error });
      
      // Clean up on failure
      await this.cleanupFailedInstallation(pluginId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      };
    } finally {
      this.installationLocks.delete(pluginId);
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    pluginId: string,
    options: UninstallOptions = {}
  ): Promise<PluginOperationResult> {
    const installRecord = this.installedPlugins.get(pluginId);
    if (!installRecord) {
      return {
        success: false,
        error: `Plugin ${pluginId} is not installed`
      };
    }

    try {
      this.emit('plugin:uninstall:started', { pluginId });

      // Check for dependents
      if (!options.force) {
        const dependents = await this.findDependentPlugins(pluginId);
        if (dependents.length > 0) {
          return {
            success: false,
            error: `Cannot uninstall ${pluginId}: required by ${dependents.join(', ')}`
          };
        }
      }

      // Run pre-uninstall hooks
      if (options.runPreUninstallHooks) {
        await this.runPreUninstallHooks(installRecord);
      }

      // Remove plugin files
      if (options.removeFiles !== false) {
        await this.removePluginFiles(installRecord.installPath);
      }

      // Remove installation record
      this.installedPlugins.delete(pluginId);
      await this.removeInstallationRecord(pluginId);

      this.emit('plugin:uninstall:completed', { pluginId });

      return { success: true };

    } catch (error) {
      this.emit('plugin:uninstall:failed', { pluginId, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uninstallation failed'
      };
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<PluginOperationResult> {
    const installRecord = this.installedPlugins.get(pluginId);
    if (!installRecord) {
      return {
        success: false,
        error: `Plugin ${pluginId} is not installed`
      };
    }

    if (installRecord.state === PluginState.ACTIVE) {
      return {
        success: false,
        error: `Plugin ${pluginId} is already enabled`
      };
    }

    try {
      installRecord.state = PluginState.ACTIVE;
      installRecord.enabledDate = new Date();
      
      await this.saveInstallationRecord(installRecord);
      this.emit('plugin:enabled', { pluginId });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enable failed'
      };
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<PluginOperationResult> {
    const installRecord = this.installedPlugins.get(pluginId);
    if (!installRecord) {
      return {
        success: false,
        error: `Plugin ${pluginId} is not installed`
      };
    }

    if (installRecord.state !== PluginState.ACTIVE) {
      return {
        success: false,
        error: `Plugin ${pluginId} is not enabled`
      };
    }

    try {
      installRecord.state = PluginState.DISABLED;
      installRecord.disabledDate = new Date();
      
      await this.saveInstallationRecord(installRecord);
      this.emit('plugin:disabled', { pluginId });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disable failed'
      };
    }
  }

  /**
   * Update a plugin to a new version
   */
  async updatePlugin(
    pluginId: string,
    newSource: PluginInstallSource,
    options: UpdateOptions = {}
  ): Promise<PluginOperationResult> {
    const installRecord = this.installedPlugins.get(pluginId);
    if (!installRecord) {
      return {
        success: false,
        error: `Plugin ${pluginId} is not installed`
      };
    }

    try {
      this.emit('plugin:update:started', { pluginId });

      // Create backup
      if (options.createBackup !== false) {
        await this.createPluginBackup(installRecord);
      }

      const wasEnabled = installRecord.state === PluginState.ACTIVE;
      
      // Disable plugin during update
      if (wasEnabled) {
        await this.disablePlugin(pluginId);
      }

      // Install new version
      const installResult = await this.installPlugin(newSource, {
        ...options,
        force: true
      });

      if (!installResult.success) {
        // Restore from backup on failure
        if (options.createBackup !== false) {
          await this.restorePluginBackup(pluginId);
        }
        return installResult;
      }

      // Re-enable if it was enabled before
      if (wasEnabled) {
        await this.enablePlugin(pluginId);
      }

      this.emit('plugin:update:completed', { pluginId });

      return { success: true };

    } catch (error) {
      this.emit('plugin:update:failed', { pluginId, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * List all installed plugins
   */
  listInstalledPlugins(): PluginInstallationSummary[] {
    return Array.from(this.installedPlugins.values()).map(record => ({
      pluginId: record.pluginId,
      version: record.version,
      state: record.state,
      installDate: record.installDate,
      enabledDate: record.enabledDate,
      source: record.source
    }));
  }

  /**
   * Get installation details for a specific plugin
   */
  getPluginInstallation(pluginId: string): PluginInstallationRecord | null {
    return this.installedPlugins.get(pluginId) || null;
  }

  // Private methods

  private async loadInstalledPlugins(): Promise<void> {
    try {
      const recordsPath = path.join(this.pluginDirectory, '.installed-plugins.json');
      const data = await fs.readFile(recordsPath, 'utf-8');
      const records: PluginInstallationRecord[] = JSON.parse(data);
      
      for (const record of records) {
        this.installedPlugins.set(record.pluginId, {
          ...record,
          installDate: new Date(record.installDate),
          enabledDate: record.enabledDate ? new Date(record.enabledDate) : undefined,
          disabledDate: record.disabledDate ? new Date(record.disabledDate) : undefined
        });
      }
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      console.log('No existing plugin installation records found');
    }
  }

  private async downloadPlugin(source: PluginInstallSource, targetPath: string): Promise<void> {
    // Ensure target directory exists
    await fs.mkdir(targetPath, { recursive: true });

    if (source.type === 'local') {
      // Copy from local path
      await this.copyDirectory(source.path, targetPath);
    } else if (source.type === 'npm') {
      // Install from NPM (simplified - would use actual npm commands)
      throw new Error('NPM installation not implemented yet');
    } else if (source.type === 'git') {
      // Clone from Git (simplified - would use actual git commands)
      throw new Error('Git installation not implemented yet');
    } else if (source.type === 'url') {
      // Download from URL (simplified - would implement actual download)
      throw new Error('URL installation not implemented yet');
    }
  }

  private async copyDirectory(source: string, target: string): Promise<void> {
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  private async loadPluginManifest(pluginPath: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const data = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async installDependencies(
    dependencies: (string | any)[],
    options: InstallOptions
  ): Promise<void> {
    for (const dep of dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name;
      const isOptional = typeof dep === 'object' && dep.optional;
      
      if (!this.installedPlugins.has(depName)) {
        if (isOptional && options.skipOptionalDependencies) {
          continue;
        }
        
        // For now, just log - in a real system, would auto-install dependencies
        console.log(`Dependency ${depName} needs to be installed`);
      }
    }
  }

  private async findDependentPlugins(pluginId: string): Promise<string[]> {
    const dependents: string[] = [];
    
    for (const [id, record] of this.installedPlugins) {
      if (record.dependencies.includes(pluginId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  private async saveInstallationRecord(record: PluginInstallationRecord): Promise<void> {
    const recordsPath = path.join(this.pluginDirectory, '.installed-plugins.json');
    const allRecords = Array.from(this.installedPlugins.values());
    await fs.writeFile(recordsPath, JSON.stringify(allRecords, null, 2));
  }

  private async removeInstallationRecord(pluginId: string): Promise<void> {
    await this.saveInstallationRecord({} as any); // Will save without the deleted record
  }

  private async removePluginFiles(pluginPath: string): Promise<void> {
    await fs.rm(pluginPath, { recursive: true, force: true });
  }

  private async cleanupFailedInstallation(pluginId: string): Promise<void> {
    const installPath = path.join(this.pluginDirectory, pluginId);
    await fs.rm(installPath, { recursive: true, force: true });
  }

  private extractPluginId(source: PluginInstallSource): string {
    if (source.type === 'local') {
      return path.basename(source.path);
    }
    return source.name || 'unknown';
  }

  private async runPostInstallHooks(record: PluginInstallationRecord): Promise<void> {
    // Run any post-installation scripts or hooks
    console.log(`Running post-install hooks for ${record.pluginId}`);
  }

  private async runPreUninstallHooks(record: PluginInstallationRecord): Promise<void> {
    // Run any pre-uninstallation cleanup
    console.log(`Running pre-uninstall hooks for ${record.pluginId}`);
  }

  private async createPluginBackup(record: PluginInstallationRecord): Promise<void> {
    const backupPath = `${record.installPath}.backup.${Date.now()}`;
    await this.copyDirectory(record.installPath, backupPath);
    console.log(`Created backup at ${backupPath}`);
  }

  private async restorePluginBackup(pluginId: string): Promise<void> {
    // Find and restore the most recent backup
    console.log(`Restoring backup for ${pluginId}`);
  }
}

// Types and interfaces
export interface PluginInstallSource {
  type: 'local' | 'npm' | 'git' | 'url';
  path?: string;
  name?: string;
  version?: string;
  url?: string;
  repository?: string;
}

export interface InstallOptions {
  force?: boolean;
  skipDependencies?: boolean;
  skipOptionalDependencies?: boolean;
  runPostInstallHooks?: boolean;
  createBackup?: boolean;
}

export interface UninstallOptions {
  force?: boolean;
  removeFiles?: boolean;
  runPreUninstallHooks?: boolean;
}

export interface UpdateOptions extends InstallOptions {
  createBackup?: boolean;
}

export interface PluginInstallationRecord {
  pluginId: string;
  source: PluginInstallSource;
  version: string;
  installDate: Date;
  enabledDate?: Date;
  disabledDate?: Date;
  state: PluginState;
  dependencies: string[];
  installPath: string;
}

export interface PluginInstallationSummary {
  pluginId: string;
  version: string;
  state: PluginState;
  installDate: Date;
  enabledDate?: Date;
  source: PluginInstallSource;
}
