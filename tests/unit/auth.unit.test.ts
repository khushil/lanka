/**
 * Unit Tests for Authentication Middleware and Authorization Guards
 */

import { AuthMiddleware, User } from '../../src/core/auth/middleware/auth.middleware';
import { AuthorizationGuard, PERMISSIONS, ROLES } from '../../src/core/auth/guards/authorization.guard';
import jwt from 'jsonwebtoken';

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let testUser: User;

  beforeEach(() => {
    authMiddleware = new AuthMiddleware();
    testUser = {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read', 'write'],
      isActive: true,
    };
  });

  describe('Token Generation', () => {
    test('should generate valid JWT tokens', () => {
      const token = authMiddleware.generateToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate tokens with correct payload', () => {
      const token = authMiddleware.generateToken(testUser);
      const secret = process.env.JWT_SECRET || 'lanka-platform-secret-key';
      
      const payload = jwt.verify(token, secret) as any;

      expect(payload.sub).toBe(testUser.id);
      expect(payload.username).toBe(testUser.username);
      expect(payload.email).toBe(testUser.email);
      expect(payload.roles).toEqual(testUser.roles);
      expect(payload.permissions).toEqual(testUser.permissions);
    });

    test('should generate refresh tokens', () => {
      const refreshToken = authMiddleware.generateRefreshToken(testUser.id);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });
  });

  describe('Token Verification', () => {
    test('should verify valid tokens', async () => {
      const token = authMiddleware.generateToken(testUser);
      
      // Create mock request
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
        ip: '127.0.0.1',
      } as any;

      const authContext = await authMiddleware.authenticateGraphQLContext(req);

      expect(authContext.isAuthenticated).toBe(true);
      expect(authContext.user).toBeTruthy();
      expect(authContext.user?.id).toBe(testUser.id);
      expect(authContext.user?.username).toBe(testUser.username);
    });

    test('should reject invalid tokens', async () => {
      const req = {
        headers: {
          authorization: `Bearer invalid-token`,
        },
        ip: '127.0.0.1',
      } as any;

      const authContext = await authMiddleware.authenticateGraphQLContext(req);

      expect(authContext.isAuthenticated).toBe(false);
      expect(authContext.user).toBeNull();
    });

    test('should handle missing tokens', async () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as any;

      const authContext = await authMiddleware.authenticateGraphQLContext(req);

      expect(authContext.isAuthenticated).toBe(false);
      expect(authContext.user).toBeNull();
    });

    test('should reject blacklisted tokens', async () => {
      const token = authMiddleware.generateToken(testUser);
      
      // Blacklist the token
      authMiddleware.revokeToken(token);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
        ip: '127.0.0.1',
      } as any;

      const authContext = await authMiddleware.authenticateGraphQLContext(req);

      expect(authContext.isAuthenticated).toBe(false);
    });
  });

  describe('Password Handling', () => {
    test('should hash passwords', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authMiddleware.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    test('should verify passwords against hashes', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authMiddleware.hashPassword(password);

      const isValid = await authMiddleware.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await authMiddleware.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    test('should refresh valid tokens', async () => {
      const refreshToken = authMiddleware.generateRefreshToken(testUser.id);
      
      const refreshResult = await authMiddleware.refreshToken(refreshToken);

      expect(refreshResult).toBeTruthy();
      expect(refreshResult?.accessToken).toBeDefined();
      expect(refreshResult?.newRefreshToken).toBeDefined();
      expect(refreshResult?.newRefreshToken).not.toBe(refreshToken);
    });

    test('should reject invalid refresh tokens', async () => {
      const refreshResult = await authMiddleware.refreshToken('invalid-refresh-token');

      expect(refreshResult).toBeNull();
    });

    test('should reject expired refresh tokens', async () => {
      // This would require mocking Date or waiting for expiration
      // For now, we'll test with a token we manually expire
      const expiredToken = jwt.sign(
        { sub: testUser.id, type: 'refresh', exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        process.env.JWT_SECRET || 'lanka-platform-secret-key'
      );

      const refreshResult = await authMiddleware.refreshToken(expiredToken);

      expect(refreshResult).toBeNull();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup expired tokens and refresh tokens', () => {
      // Add some test data
      authMiddleware.revokeToken('test-token-1');
      authMiddleware.generateRefreshToken('test-user-1');

      expect(() => authMiddleware.cleanup()).not.toThrow();
    });
  });
});

describe('AuthorizationGuard', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'test-user',
          username: 'testuser',
          roles: ['user'],
          permissions: ['read', 'write'],
        },
        roles: ['user'],
        permissions: ['read', 'write'],
      },
      req: { ip: '127.0.0.1' },
    };
  });

  describe('Permission Checking', () => {
    test('should allow users with required permissions', () => {
      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['read'],
      });

      expect(hasPermission).toBe(true);
    });

    test('should deny users without required permissions', () => {
      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['admin'],
      });

      expect(hasPermission).toBe(false);
    });

    test('should allow admin users for any permission', () => {
      mockContext.auth.permissions = ['admin'];
      mockContext.auth.roles = ['admin'];

      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['any-permission'],
      });

      expect(hasPermission).toBe(true);
    });

    test('should check role permissions', () => {
      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        roles: ['user'],
      });

      expect(hasPermission).toBe(true);
    });

    test('should require all permissions when requireAll is true', () => {
      mockContext.auth.permissions = ['read'];

      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['read', 'write'],
        requireAll: true,
      });

      expect(hasPermission).toBe(false);

      mockContext.auth.permissions = ['read', 'write'];

      const hasPermissionWithAll = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['read', 'write'],
        requireAll: true,
      });

      expect(hasPermissionWithAll).toBe(true);
    });

    test('should allow any permission when requireAll is false', () => {
      mockContext.auth.permissions = ['read'];

      const hasPermission = AuthorizationGuard.hasPermission(mockContext, {
        permissions: ['read', 'admin'],
        requireAll: false,
      });

      expect(hasPermission).toBe(true);
    });
  });

  describe('Authorization Enforcement', () => {
    test('should throw AuthenticationError for unauthenticated users', () => {
      mockContext.auth.isAuthenticated = false;

      expect(() => {
        AuthorizationGuard.authorize(mockContext, { permissions: ['read'] });
      }).toThrow('Authentication required');
    });

    test('should throw ForbiddenError for insufficient permissions', () => {
      expect(() => {
        AuthorizationGuard.authorize(mockContext, { permissions: ['admin'] });
      }).toThrow('Insufficient permissions');
    });

    test('should not throw for sufficient permissions', () => {
      expect(() => {
        AuthorizationGuard.authorize(mockContext, { permissions: ['read'] });
      }).not.toThrow();
    });
  });

  describe('Effective Permissions', () => {
    test('should combine role and explicit permissions', () => {
      const userRoles = ['user', 'developer'];
      const userPermissions = ['custom-permission'];

      const effectivePermissions = AuthorizationGuard.getEffectivePermissions(
        userRoles,
        userPermissions
      );

      expect(effectivePermissions).toContain('custom-permission');
      expect(effectivePermissions).toContain('read'); // From user role
      expect(effectivePermissions).toContain('development:write'); // From developer role
      
      // Should not have duplicates
      const uniquePermissions = [...new Set(effectivePermissions)];
      expect(effectivePermissions.length).toBe(uniquePermissions.length);
    });

    test('should handle unknown roles gracefully', () => {
      const userRoles = ['unknown-role'];
      const userPermissions = ['read'];

      const effectivePermissions = AuthorizationGuard.getEffectivePermissions(
        userRoles,
        userPermissions
      );

      expect(effectivePermissions).toEqual(['read']);
    });
  });
});

describe('Role Definitions', () => {
  test('should have correct role hierarchy', () => {
    // Guest should have minimal permissions
    expect(ROLES.GUEST.permissions).toContain(PERMISSIONS.READ);
    expect(ROLES.GUEST.permissions.length).toBe(1);

    // User should have more permissions than guest
    expect(ROLES.USER.permissions.length).toBeGreaterThan(ROLES.GUEST.permissions.length);
    expect(ROLES.USER.permissions).toContain(PERMISSIONS.READ);
    expect(ROLES.USER.permissions).toContain(PERMISSIONS.WRITE);

    // Developer should have development permissions
    expect(ROLES.DEVELOPER.permissions).toContain(PERMISSIONS.DEVELOPMENT_WRITE);
    expect(ROLES.DEVELOPER.permissions).toContain(PERMISSIONS.DEVELOPMENT_DEPLOY);

    // Architect should have architecture permissions
    expect(ROLES.ARCHITECT.permissions).toContain(PERMISSIONS.ARCHITECTURE_APPROVE);

    // Manager should have approval permissions
    expect(ROLES.MANAGER.permissions).toContain(PERMISSIONS.REQUIREMENTS_APPROVE);

    // Admin should have admin permissions
    expect(ROLES.ADMIN.permissions).toContain(PERMISSIONS.ADMIN);
  });

  test('should have unique permission names', () => {
    const allPermissions = Object.values(PERMISSIONS);
    const uniquePermissions = [...new Set(allPermissions)];

    expect(allPermissions.length).toBe(uniquePermissions.length);
  });
});

describe('Permission Matrix', () => {
  test('should have consistent permission mappings', () => {
    const { PERMISSION_MATRIX } = require('../../src/core/auth/guards/authorization.guard');

    // Each resource should have basic CRUD operations
    expect(PERMISSION_MATRIX.requirements).toHaveProperty('read');
    expect(PERMISSION_MATRIX.requirements).toHaveProperty('write');
    expect(PERMISSION_MATRIX.requirements).toHaveProperty('delete');

    expect(PERMISSION_MATRIX.architecture).toHaveProperty('read');
    expect(PERMISSION_MATRIX.architecture).toHaveProperty('write');
    expect(PERMISSION_MATRIX.architecture).toHaveProperty('delete');

    expect(PERMISSION_MATRIX.development).toHaveProperty('read');
    expect(PERMISSION_MATRIX.development).toHaveProperty('write');
    expect(PERMISSION_MATRIX.development).toHaveProperty('delete');
  });

  test('should have admin permissions for all resources', () => {
    const { PERMISSION_MATRIX } = require('../../src/core/auth/guards/authorization.guard');

    Object.keys(PERMISSION_MATRIX).forEach(resource => {
      expect(PERMISSION_MATRIX[resource]).toHaveProperty('admin');
      expect(PERMISSION_MATRIX[resource].admin).toContain(PERMISSIONS.ADMIN);
    });
  });
});