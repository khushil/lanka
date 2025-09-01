// Dependency Resolver Implementation
// Manages plugin dependencies and load/unload ordering

import { PluginDependency } from '../types';

export interface DependencyGraph {
  [pluginId: string]: {
    dependencies: PluginDependency[];
    dependents: string[];
  };
}

export interface DependencyCheckResult {
  satisfied: boolean;
  missing: string[];
  circular: string[];
}

export class DependencyResolver {
  private graph: DependencyGraph = {};
  private loadOrder: string[] = [];

  /**
   * Add a plugin to the dependency graph
   */
  addPlugin(pluginId: string, dependencies: PluginDependency[]): void {
    if (!this.graph[pluginId]) {
      this.graph[pluginId] = {
        dependencies,
        dependents: []
      };
    }

    // Update dependents for each dependency
    for (const dep of dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name;
      if (this.graph[depName]) {
        if (!this.graph[depName].dependents.includes(pluginId)) {
          this.graph[depName].dependents.push(pluginId);
        }
      }
    }

    this.updateLoadOrder();
  }

  /**
   * Remove a plugin from the dependency graph
   */
  removePlugin(pluginId: string): void {
    const node = this.graph[pluginId];
    if (!node) return;

    // Remove from dependents lists
    for (const dep of node.dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name;
      if (this.graph[depName]) {
        const index = this.graph[depName].dependents.indexOf(pluginId);
        if (index >= 0) {
          this.graph[depName].dependents.splice(index, 1);
        }
      }
    }

    // Remove from dependencies lists of dependents
    for (const dependent of node.dependents) {
      if (this.graph[dependent]) {
        this.graph[dependent].dependencies = this.graph[dependent].dependencies.filter(
          dep => {
            const depName = typeof dep === 'string' ? dep : dep.name;
            return depName !== pluginId;
          }
        );
      }
    }

    delete this.graph[pluginId];
    this.updateLoadOrder();
  }

  /**
   * Check if dependencies are satisfied
   */
  async checkDependencies(dependencies: (string | PluginDependency)[]): Promise<DependencyCheckResult> {
    const missing: string[] = [];
    const circular: string[] = [];

    for (const dep of dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name;
      const isOptional = typeof dep === 'object' && dep.optional;

      // Check if dependency exists
      if (!this.graph[depName] && !isOptional) {
        missing.push(depName);
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(depName, new Set())) {
        circular.push(depName);
      }
    }

    return {
      satisfied: missing.length === 0 && circular.length === 0,
      missing,
      circular
    };
  }

  /**
   * Get the correct load order for plugins
   */
  getLoadOrder(pluginIds?: string[]): string[] {
    if (pluginIds) {
      return this.topologicalSort(pluginIds);
    }
    return [...this.loadOrder];
  }

  /**
   * Get the correct unload order (reverse of load order)
   */
  getUnloadOrder(pluginIds?: string[]): string[] {
    const loadOrder = this.getLoadOrder(pluginIds);
    return loadOrder.reverse();
  }

  /**
   * Get plugins that depend on the given plugin
   */
  getDependents(pluginId: string): string[] {
    return this.graph[pluginId]?.dependents || [];
  }

  /**
   * Get dependencies for a plugin
   */
  getDependencies(pluginId: string): PluginDependency[] {
    return this.graph[pluginId]?.dependencies || [];
  }

  /**
   * Check if there's a circular dependency
   */
  private hasCircularDependency(pluginId: string, visited: Set<string>): boolean {
    if (visited.has(pluginId)) {
      return true;
    }

    visited.add(pluginId);
    const node = this.graph[pluginId];
    if (!node) return false;

    for (const dep of node.dependencies) {
      const depName = typeof dep === 'string' ? dep : dep.name;
      if (this.hasCircularDependency(depName, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update the load order using topological sort
   */
  private updateLoadOrder(): void {
    this.loadOrder = this.topologicalSort(Object.keys(this.graph));
  }

  /**
   * Perform topological sort to determine load order
   */
  private topologicalSort(pluginIds: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (pluginId: string): boolean => {
      if (visiting.has(pluginId)) {
        // Circular dependency detected
        return false;
      }

      if (visited.has(pluginId)) {
        return true;
      }

      visiting.add(pluginId);
      const node = this.graph[pluginId];

      if (node) {
        for (const dep of node.dependencies) {
          const depName = typeof dep === 'string' ? dep : dep.name;
          if (pluginIds.includes(depName) && !visit(depName)) {
            return false;
          }
        }
      }

      visiting.delete(pluginId);
      visited.add(pluginId);
      result.push(pluginId);
      return true;
    };

    for (const pluginId of pluginIds) {
      if (!visited.has(pluginId)) {
        if (!visit(pluginId)) {
          throw new Error(`Circular dependency detected involving plugin: ${pluginId}`);
        }
      }
    }

    return result;
  }

  /**
   * Get dependency tree for a plugin
   */
  getDependencyTree(pluginId: string, depth = 0): any {
    const node = this.graph[pluginId];
    if (!node || depth > 10) { // Prevent infinite recursion
      return { name: pluginId, dependencies: [] };
    }

    return {
      name: pluginId,
      dependencies: node.dependencies.map(dep => {
        const depName = typeof dep === 'string' ? dep : dep.name;
        return this.getDependencyTree(depName, depth + 1);
      })
    };
  }

  /**
   * Get impact analysis for plugin changes
   */
  getImpactAnalysis(pluginId: string): {
    directDependents: string[];
    indirectDependents: string[];
    totalImpact: number;
  } {
    const directDependents = this.getDependents(pluginId);
    const indirectDependents = new Set<string>();

    const collectIndirectDependents = (id: string) => {
      const deps = this.getDependents(id);
      for (const dep of deps) {
        if (!directDependents.includes(dep) && !indirectDependents.has(dep)) {
          indirectDependents.add(dep);
          collectIndirectDependents(dep);
        }
      }
    };

    for (const dependent of directDependents) {
      collectIndirectDependents(dependent);
    }

    return {
      directDependents,
      indirectDependents: Array.from(indirectDependents),
      totalImpact: directDependents.length + indirectDependents.size
    };
  }

  /**
   * Validate the entire dependency graph
   */
  validateGraph(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    for (const pluginId of Object.keys(this.graph)) {
      try {
        this.topologicalSort([pluginId]);
      } catch (error) {
        errors.push(`Circular dependency detected: ${pluginId}`);
      }
    }

    // Check for missing dependencies
    for (const [pluginId, node] of Object.entries(this.graph)) {
      for (const dep of node.dependencies) {
        const depName = typeof dep === 'string' ? dep : dep.name;
        const isOptional = typeof dep === 'object' && dep.optional;
        
        if (!this.graph[depName] && !isOptional) {
          errors.push(`Plugin ${pluginId} has missing dependency: ${depName}`);
        } else if (!this.graph[depName] && isOptional) {
          warnings.push(`Plugin ${pluginId} has missing optional dependency: ${depName}`);
        }
      }
    }

    // Check for orphaned plugins
    for (const [pluginId, node] of Object.entries(this.graph)) {
      if (node.dependencies.length === 0 && node.dependents.length === 0) {
        warnings.push(`Plugin ${pluginId} has no dependencies or dependents`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
