import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { UserRole } from '../../types';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRoles?: UserRole[];
  requirePermissions?: Array<{
    resource: string;
    action: string;
  }>;
  fallbackComponent?: ReactNode;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireRoles = [],
  requirePermissions = [],
  fallbackComponent,
  redirectTo,
}) => {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    user,
    hasAnyRole,
    refreshUser,
    isEmailVerified,
  } = useAuth();
  
  const { hasPermission, canAccessRoute } = usePermissions();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Handle unauthenticated users
  if (requireAuth && !isAuthenticated) {
    const redirectPath = redirectTo || '/login';
    return (
      <Navigate
        to={redirectPath}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Handle authenticated users trying to access auth pages
  if (!requireAuth && isAuthenticated) {
    const from = (location.state as any)?.from || '/';
    return <Navigate to={from} replace />;
  }

  // Skip further checks if authentication is not required
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Check email verification requirement
  if (user && !isEmailVerified()) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 3,
          p: 3,
        }}
      >
        <Alert severity="warning" sx={{ width: '100%', maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Email Verification Required
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please verify your email address to access this application.
            Check your inbox for a verification link.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              size="small"
              onClick={() => {
                // Resend verification email logic would go here
                console.log('Resending verification email...');
              }}
            >
              Resend Email
            </Button>
            <Button
              size="small"
              onClick={() => refreshUser()}
            >
              I've Verified
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Check role requirements
  if (requireRoles.length > 0 && !hasAnyRole(requireRoles)) {
    const unauthorizedContent = (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You don't have the required role to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required roles: {requireRoles.join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your role: {user?.role}
          </Typography>
        </Alert>
        
        <Button
          variant="outlined"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </Box>
    );

    return fallbackComponent ? <>{fallbackComponent}</> : unauthorizedContent;
  }

  // Check permission requirements
  if (requirePermissions.length > 0) {
    const hasAllPermissions = requirePermissions.every(({ resource, action }) =>
      hasPermission(resource, action as any)
    );

    if (!hasAllPermissions) {
      const unauthorizedContent = (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 2,
            p: 3,
          }}
        >
          <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Insufficient Permissions
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You don't have the required permissions to access this page.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Required permissions:
            </Typography>
            <ul>
              {requirePermissions.map(({ resource, action }, index) => (
                <li key={index}>
                  <Typography variant="body2" color="text.secondary">
                    {action} on {resource}
                  </Typography>
                </li>
              ))}
            </ul>
          </Alert>
          
          <Button
            variant="outlined"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </Box>
      );

      return fallbackComponent ? <>{fallbackComponent}</> : unauthorizedContent;
    }
  }

  // Check route-based access
  if (!canAccessRoute(location.pathname)) {
    const unauthorizedContent = (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body2">
            You don't have permission to access this route.
          </Typography>
        </Alert>
        
        <Button
          variant="contained"
          onClick={() => window.location.href = '/'}
        >
          Go to Dashboard
        </Button>
      </Box>
    );

    return fallbackComponent ? <>{fallbackComponent}</> : unauthorizedContent;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

// HOC version for easier usage
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<AuthGuardProps, 'children'>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <AuthGuard {...guardProps}>
      <Component {...props} />
    </AuthGuard>
  );

  WrappedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};