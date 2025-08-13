import { useAuth } from './useAuth';
import { UserRole, Permission, PermissionAction } from '../types';

// Define default permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.VIEWER]: [
    { id: '1', name: 'View Dashboard', description: 'View dashboard', resource: 'dashboard', action: PermissionAction.READ },
    { id: '2', name: 'View Analytics', description: 'View analytics data', resource: 'analytics', action: PermissionAction.READ },
    { id: '3', name: 'View Requirements', description: 'View requirements', resource: 'requirements', action: PermissionAction.READ },
    { id: '4', name: 'View Architecture', description: 'View architecture diagrams', resource: 'architecture', action: PermissionAction.READ },
  ],
  
  [UserRole.ANALYST]: [
    // Inherits all viewer permissions plus:
    { id: '5', name: 'Create Reports', description: 'Create analysis reports', resource: 'reports', action: PermissionAction.CREATE },
    { id: '6', name: 'Update Analytics', description: 'Update analytics configurations', resource: 'analytics', action: PermissionAction.UPDATE },
    { id: '7', name: 'Export Data', description: 'Export data and reports', resource: 'data', action: PermissionAction.READ },
  ],
  
  [UserRole.DEVELOPER]: [
    // Inherits all analyst permissions plus:
    { id: '8', name: 'Manage Development', description: 'Manage development modules', resource: 'development', action: PermissionAction.CREATE },
    { id: '9', name: 'Update Requirements', description: 'Update requirements', resource: 'requirements', action: PermissionAction.UPDATE },
    { id: '10', name: 'Update Architecture', description: 'Update architecture', resource: 'architecture', action: PermissionAction.UPDATE },
    { id: '11', name: 'Manage Integration', description: 'Manage integrations', resource: 'integration', action: PermissionAction.CREATE },
  ],
  
  [UserRole.ADMIN]: [
    // Has all permissions
    { id: '12', name: 'Admin Access', description: 'Full administrative access', resource: '*', action: PermissionAction.ADMIN },
    { id: '13', name: 'User Management', description: 'Manage users and roles', resource: 'users', action: PermissionAction.ADMIN },
    { id: '14', name: 'System Settings', description: 'Manage system settings', resource: 'settings', action: PermissionAction.ADMIN },
  ],
};

export const usePermissions = () => {
  const { user, hasRole, isAuthenticated } = useAuth();

  const getUserPermissions = (): Permission[] => {
    if (!user || !isAuthenticated) return [];
    
    const permissions: Permission[] = [];
    
    // Add permissions based on role hierarchy
    if (hasRole(UserRole.VIEWER)) {
      permissions.push(...ROLE_PERMISSIONS[UserRole.VIEWER]);
    }
    
    if (hasRole(UserRole.ANALYST)) {
      permissions.push(...ROLE_PERMISSIONS[UserRole.ANALYST]);
    }
    
    if (hasRole(UserRole.DEVELOPER)) {
      permissions.push(...ROLE_PERMISSIONS[UserRole.DEVELOPER]);
    }
    
    if (hasRole(UserRole.ADMIN)) {
      permissions.push(...ROLE_PERMISSIONS[UserRole.ADMIN]);
    }
    
    return permissions;
  };

  const hasPermission = (resource: string, action: PermissionAction): boolean => {
    if (!isAuthenticated) return false;
    
    // Admins have all permissions
    if (user?.role === UserRole.ADMIN) return true;
    
    const userPermissions = getUserPermissions();
    
    return userPermissions.some(permission => 
      (permission.resource === resource || permission.resource === '*') &&
      (permission.action === action || permission.action === PermissionAction.ADMIN)
    );
  };

  const canRead = (resource: string): boolean => {
    return hasPermission(resource, PermissionAction.READ);
  };

  const canCreate = (resource: string): boolean => {
    return hasPermission(resource, PermissionAction.CREATE);
  };

  const canUpdate = (resource: string): boolean => {
    return hasPermission(resource, PermissionAction.UPDATE);
  };

  const canDelete = (resource: string): boolean => {
    return hasPermission(resource, PermissionAction.DELETE);
  };

  const canAdmin = (resource: string): boolean => {
    return hasPermission(resource, PermissionAction.ADMIN);
  };

  const getAccessibleRoutes = (): string[] => {
    const routes: string[] = [];
    
    if (canRead('dashboard')) routes.push('/');
    if (canRead('requirements')) routes.push('/requirements');
    if (canRead('architecture')) routes.push('/architecture');
    if (canRead('development')) routes.push('/development');
    if (canRead('integration')) routes.push('/integration');
    if (canRead('analytics')) routes.push('/analytics');
    if (canAdmin('settings')) routes.push('/settings');
    
    return routes;
  };

  const getRestrictedRoutes = (): string[] => {
    const allRoutes = ['/', '/requirements', '/architecture', '/development', '/integration', '/analytics', '/settings'];
    const accessibleRoutes = getAccessibleRoutes();
    
    return allRoutes.filter(route => !accessibleRoutes.includes(route));
  };

  const canAccessRoute = (path: string): boolean => {
    const accessibleRoutes = getAccessibleRoutes();
    return accessibleRoutes.some(route => path.startsWith(route));
  };

  const getPermissionsByResource = (resource: string): Permission[] => {
    const userPermissions = getUserPermissions();
    return userPermissions.filter(permission => 
      permission.resource === resource || permission.resource === '*'
    );
  };

  const getPermissionsByAction = (action: PermissionAction): Permission[] => {
    const userPermissions = getUserPermissions();
    return userPermissions.filter(permission => 
      permission.action === action || permission.action === PermissionAction.ADMIN
    );
  };

  return {
    // Permission checking
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canAdmin,
    
    // Route access
    canAccessRoute,
    getAccessibleRoutes,
    getRestrictedRoutes,
    
    // Permission queries
    getUserPermissions,
    getPermissionsByResource,
    getPermissionsByAction,
    
    // Computed permissions for common resources
    permissions: {
      dashboard: {
        read: canRead('dashboard'),
        create: canCreate('dashboard'),
        update: canUpdate('dashboard'),
        delete: canDelete('dashboard'),
      },
      requirements: {
        read: canRead('requirements'),
        create: canCreate('requirements'),
        update: canUpdate('requirements'),
        delete: canDelete('requirements'),
      },
      architecture: {
        read: canRead('architecture'),
        create: canCreate('architecture'),
        update: canUpdate('architecture'),
        delete: canDelete('architecture'),
      },
      development: {
        read: canRead('development'),
        create: canCreate('development'),
        update: canUpdate('development'),
        delete: canDelete('development'),
      },
      integration: {
        read: canRead('integration'),
        create: canCreate('integration'),
        update: canUpdate('integration'),
        delete: canDelete('integration'),
      },
      analytics: {
        read: canRead('analytics'),
        create: canCreate('analytics'),
        update: canUpdate('analytics'),
        delete: canDelete('analytics'),
      },
      settings: {
        read: canRead('settings'),
        create: canCreate('settings'),
        update: canUpdate('settings'),
        delete: canDelete('settings'),
        admin: canAdmin('settings'),
      },
      users: {
        read: canRead('users'),
        create: canCreate('users'),
        update: canUpdate('users'),
        delete: canDelete('users'),
        admin: canAdmin('users'),
      },
    },
  };
};