import { useAuthContext } from '../context/AuthContext';
import { UserRole } from '../types';

export const useAuth = () => {
  const context = useAuthContext();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!context.user) return false;
    
    // Define role hierarchy (higher index means higher privilege)
    const roleHierarchy = [
      UserRole.VIEWER,
      UserRole.ANALYST,
      UserRole.DEVELOPER,
      UserRole.ADMIN
    ];
    
    const userRoleIndex = roleHierarchy.indexOf(context.user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isOwner = (resourceUserId: string): boolean => {
    return context.user?.id === resourceUserId;
  };

  const canAccessResource = (resourceUserId?: string, requiredRole?: UserRole): boolean => {
    if (!context.isAuthenticated) return false;
    
    // Admins can access everything
    if (context.user?.role === UserRole.ADMIN) return true;
    
    // If resource has an owner, check if user is the owner
    if (resourceUserId && isOwner(resourceUserId)) return true;
    
    // If a role is required, check if user has that role
    if (requiredRole && hasRole(requiredRole)) return true;
    
    return false;
  };

  const getUserDisplayName = (): string => {
    if (!context.user) return 'Guest';
    return context.user.name || context.user.email;
  };

  const getUserInitials = (): string => {
    if (!context.user?.name) return '?';
    
    return context.user.name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isEmailVerified = (): boolean => {
    return context.user?.isEmailVerified ?? false;
  };

  const getLastLogin = (): Date | null => {
    return context.user?.lastLogin || null;
  };

  const getUserPreferences = () => {
    return context.user?.preferences || null;
  };

  return {
    // Auth state
    ...context,
    
    // Role checking
    hasRole,
    hasAnyRole,
    isOwner,
    canAccessResource,
    
    // User utilities
    getUserDisplayName,
    getUserInitials,
    isEmailVerified,
    getLastLogin,
    getUserPreferences,
    
    // Computed properties
    isAdmin: context.user?.role === UserRole.ADMIN,
    isDeveloper: hasAnyRole([UserRole.DEVELOPER, UserRole.ADMIN]),
    isAnalyst: hasAnyRole([UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN]),
  };
};