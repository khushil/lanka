/**
 * Authorization Guards and Decorators for Lanka Platform
 * Provides role-based access control for GraphQL resolvers
 */

import { AuthenticationError, ForbiddenError } from '@graphql-tools/utils';
import { logger } from '../../logging/logger';
import { AuthContext } from '../middleware/auth.middleware';

export interface PermissionCheck {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles. If false, user needs ANY
  resource?: string;
  action?: string;
}

export interface AuthorizationContext {
  auth: AuthContext;
  req: any;
  res: any;
}

/**
 * Permission definitions for the Lanka platform
 */
export const PERMISSIONS = {
  // General permissions
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',

  // Requirements module permissions
  REQUIREMENTS_READ: 'requirements:read',
  REQUIREMENTS_WRITE: 'requirements:write',
  REQUIREMENTS_DELETE: 'requirements:delete',
  REQUIREMENTS_APPROVE: 'requirements:approve',
  REQUIREMENTS_ADMIN: 'requirements:admin',

  // Architecture module permissions
  ARCHITECTURE_READ: 'architecture:read',
  ARCHITECTURE_WRITE: 'architecture:write',
  ARCHITECTURE_DELETE: 'architecture:delete',
  ARCHITECTURE_APPROVE: 'architecture:approve',
  ARCHITECTURE_ADMIN: 'architecture:admin',

  // Development module permissions
  DEVELOPMENT_READ: 'development:read',
  DEVELOPMENT_WRITE: 'development:write',
  DEVELOPMENT_DELETE: 'development:delete',
  DEVELOPMENT_DEPLOY: 'development:deploy',
  DEVELOPMENT_ADMIN: 'development:admin',

  // Memory module permissions
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  MEMORY_DELETE: 'memory:delete',
  MEMORY_ADMIN: 'memory:admin',

  // System permissions
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_ADMIN: 'system:admin',

  // User management permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_ADMIN: 'user:admin',
} as const;

/**
 * Role definitions with associated permissions
 */
export const ROLES = {
  GUEST: {
    name: 'guest',
    permissions: [PERMISSIONS.READ],
  },
  USER: {
    name: 'user',
    permissions: [
      PERMISSIONS.READ,
      PERMISSIONS.WRITE,
      PERMISSIONS.REQUIREMENTS_READ,
      PERMISSIONS.REQUIREMENTS_WRITE,
      PERMISSIONS.ARCHITECTURE_READ,
      PERMISSIONS.DEVELOPMENT_READ,
      PERMISSIONS.MEMORY_READ,
      PERMISSIONS.MEMORY_WRITE,
    ],
  },
  DEVELOPER: {
    name: 'developer',
    permissions: [
      PERMISSIONS.READ,
      PERMISSIONS.WRITE,
      PERMISSIONS.REQUIREMENTS_READ,
      PERMISSIONS.REQUIREMENTS_WRITE,
      PERMISSIONS.ARCHITECTURE_READ,
      PERMISSIONS.ARCHITECTURE_WRITE,
      PERMISSIONS.DEVELOPMENT_READ,
      PERMISSIONS.DEVELOPMENT_WRITE,
      PERMISSIONS.DEVELOPMENT_DEPLOY,
      PERMISSIONS.MEMORY_READ,
      PERMISSIONS.MEMORY_WRITE,
    ],
  },
  ARCHITECT: {
    name: 'architect',
    permissions: [
      PERMISSIONS.READ,
      PERMISSIONS.WRITE,
      PERMISSIONS.REQUIREMENTS_READ,
      PERMISSIONS.REQUIREMENTS_WRITE,
      PERMISSIONS.REQUIREMENTS_APPROVE,
      PERMISSIONS.ARCHITECTURE_READ,
      PERMISSIONS.ARCHITECTURE_WRITE,
      PERMISSIONS.ARCHITECTURE_APPROVE,
      PERMISSIONS.DEVELOPMENT_READ,
      PERMISSIONS.MEMORY_READ,
      PERMISSIONS.MEMORY_WRITE,
    ],
  },
  MANAGER: {
    name: 'manager',
    permissions: [
      PERMISSIONS.READ,
      PERMISSIONS.WRITE,
      PERMISSIONS.REQUIREMENTS_READ,
      PERMISSIONS.REQUIREMENTS_WRITE,
      PERMISSIONS.REQUIREMENTS_APPROVE,
      PERMISSIONS.ARCHITECTURE_READ,
      PERMISSIONS.ARCHITECTURE_WRITE,
      PERMISSIONS.DEVELOPMENT_READ,
      PERMISSIONS.DEVELOPMENT_WRITE,
      PERMISSIONS.MEMORY_READ,
      PERMISSIONS.MEMORY_WRITE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.SYSTEM_MONITOR,
    ],
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      PERMISSIONS.ADMIN,
      PERMISSIONS.REQUIREMENTS_ADMIN,
      PERMISSIONS.ARCHITECTURE_ADMIN,
      PERMISSIONS.DEVELOPMENT_ADMIN,
      PERMISSIONS.MEMORY_ADMIN,
      PERMISSIONS.USER_ADMIN,
      PERMISSIONS.SYSTEM_ADMIN,
    ],
  },
} as const;

/**
 * Authorization Guard Class
 */
export class AuthorizationGuard {
  /**
   * Check if user has required permissions
   */
  public static hasPermission(context: AuthorizationContext, check: PermissionCheck): boolean {
    const { auth } = context;

    if (!auth.isAuthenticated || !auth.user) {
      return false;
    }

    // Admin users have all permissions
    if (auth.permissions.includes(PERMISSIONS.ADMIN) || auth.roles.includes(ROLES.ADMIN.name)) {
      return true;
    }

    // Check role-based permissions
    if (check.roles && check.roles.length > 0) {
      const hasRole = check.requireAll 
        ? check.roles.every(role => auth.roles.includes(role))
        : check.roles.some(role => auth.roles.includes(role));

      if (!hasRole) {
        return false;
      }
    }

    // Check explicit permissions
    if (check.permissions && check.permissions.length > 0) {
      const hasPermission = check.requireAll
        ? check.permissions.every(permission => auth.permissions.includes(permission))
        : check.permissions.some(permission => auth.permissions.includes(permission));

      if (!hasPermission) {
        return false;
      }
    }

    // Resource-specific checks
    if (check.resource && check.action) {
      const resourcePermission = `${check.resource}:${check.action}`;
      if (!auth.permissions.includes(resourcePermission)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Enforce authorization and throw error if unauthorized
   */
  public static authorize(context: AuthorizationContext, check: PermissionCheck): void {
    if (!context.auth.isAuthenticated) {
      logger.warn('Unauthenticated access attempt', {
        operation: check.resource || 'unknown',
        ip: context.req?.ip,
      });
      throw new AuthenticationError('Authentication required');
    }

    if (!this.hasPermission(context, check)) {
      logger.warn('Unauthorized access attempt', {
        userId: context.auth.user?.id,
        username: context.auth.user?.username,
        requiredPermissions: check.permissions,
        requiredRoles: check.roles,
        userPermissions: context.auth.permissions,
        userRoles: context.auth.roles,
        resource: check.resource,
        action: check.action,
        ip: context.req?.ip,
      });
      throw new ForbiddenError('Insufficient permissions');
    }
  }

  /**
   * Get effective permissions for a user (combines role permissions and explicit permissions)
   */
  public static getEffectivePermissions(userRoles: string[], userPermissions: string[]): string[] {
    const effectivePermissions = new Set(userPermissions);

    // Add permissions from roles
    for (const roleName of userRoles) {
      const role = Object.values(ROLES).find(r => r.name === roleName);
      if (role) {
        role.permissions.forEach(permission => effectivePermissions.add(permission));
      }
    }

    return Array.from(effectivePermissions);
  }
}

/**
 * GraphQL Resolver Decorator for Authorization
 */
export function RequireAuth(check: PermissionCheck = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args[2] as AuthorizationContext; // GraphQL context is the 3rd argument
      
      try {
        AuthorizationGuard.authorize(context, check);
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error('Authorization error in resolver', {
          resolver: `${target.constructor.name}.${propertyKey}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: context.auth.user?.id,
          check,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Method decorator to require authentication only
 */
export function RequireAuthentication() {
  return RequireAuth({});
}

/**
 * Method decorator to require specific permissions
 */
export function RequirePermissions(permissions: string[], requireAll: boolean = false) {
  return RequireAuth({ permissions, requireAll });
}

/**
 * Method decorator to require specific roles
 */
export function RequireRoles(roles: string[], requireAll: boolean = false) {
  return RequireAuth({ roles, requireAll });
}

/**
 * Method decorator to require admin privileges
 */
export function RequireAdmin() {
  return RequireAuth({ roles: [ROLES.ADMIN.name] });
}

/**
 * Higher-order function to wrap resolver functions with authorization
 */
export function withAuthorization<T extends (...args: any[]) => any>(
  resolver: T,
  check: PermissionCheck
): T {
  return (async (...args: Parameters<T>) => {
    const context = args[2] as AuthorizationContext;
    
    try {
      AuthorizationGuard.authorize(context, check);
      return await resolver(...args);
    } catch (error) {
      logger.error('Authorization error in wrapped resolver', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: context.auth.user?.id,
        check,
      });
      throw error;
    }
  }) as T;
}

/**
 * Permission matrix for different resources and actions
 */
export const PERMISSION_MATRIX = {
  requirements: {
    read: [PERMISSIONS.REQUIREMENTS_READ, PERMISSIONS.READ],
    write: [PERMISSIONS.REQUIREMENTS_WRITE, PERMISSIONS.WRITE],
    delete: [PERMISSIONS.REQUIREMENTS_DELETE, PERMISSIONS.DELETE],
    approve: [PERMISSIONS.REQUIREMENTS_APPROVE],
    admin: [PERMISSIONS.REQUIREMENTS_ADMIN, PERMISSIONS.ADMIN],
  },
  architecture: {
    read: [PERMISSIONS.ARCHITECTURE_READ, PERMISSIONS.READ],
    write: [PERMISSIONS.ARCHITECTURE_WRITE, PERMISSIONS.WRITE],
    delete: [PERMISSIONS.ARCHITECTURE_DELETE, PERMISSIONS.DELETE],
    approve: [PERMISSIONS.ARCHITECTURE_APPROVE],
    admin: [PERMISSIONS.ARCHITECTURE_ADMIN, PERMISSIONS.ADMIN],
  },
  development: {
    read: [PERMISSIONS.DEVELOPMENT_READ, PERMISSIONS.READ],
    write: [PERMISSIONS.DEVELOPMENT_WRITE, PERMISSIONS.WRITE],
    delete: [PERMISSIONS.DEVELOPMENT_DELETE, PERMISSIONS.DELETE],
    deploy: [PERMISSIONS.DEVELOPMENT_DEPLOY],
    admin: [PERMISSIONS.DEVELOPMENT_ADMIN, PERMISSIONS.ADMIN],
  },
  memory: {
    read: [PERMISSIONS.MEMORY_READ, PERMISSIONS.READ],
    write: [PERMISSIONS.MEMORY_WRITE, PERMISSIONS.WRITE],
    delete: [PERMISSIONS.MEMORY_DELETE, PERMISSIONS.DELETE],
    admin: [PERMISSIONS.MEMORY_ADMIN, PERMISSIONS.ADMIN],
  },
  user: {
    read: [PERMISSIONS.USER_READ, PERMISSIONS.READ],
    write: [PERMISSIONS.USER_WRITE, PERMISSIONS.WRITE],
    delete: [PERMISSIONS.USER_DELETE, PERMISSIONS.DELETE],
    admin: [PERMISSIONS.USER_ADMIN, PERMISSIONS.ADMIN],
  },
  system: {
    config: [PERMISSIONS.SYSTEM_CONFIG, PERMISSIONS.ADMIN],
    monitor: [PERMISSIONS.SYSTEM_MONITOR, PERMISSIONS.READ],
    admin: [PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.ADMIN],
  },
} as const;