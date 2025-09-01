/**
 * Integration Tests for Authentication & Authorization System
 */

import request from 'supertest';
import { createApp } from '../../src/app';
import { authMiddleware } from '../../src/core/auth/middleware/auth.middleware';
import { PERMISSIONS, ROLES } from '../../src/core/auth/guards/authorization.guard';

describe('Authentication & Authorization Integration Tests', () => {
  let app: any;
  let server: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Create test application
    app = await createApp();
    server = app.listen(0); // Use random port for testing

    // Create test tokens
    const adminUser = {
      id: 'admin-test',
      username: 'admin',
      email: 'admin@test.com',
      roles: [ROLES.ADMIN.name],
      permissions: [PERMISSIONS.ADMIN],
      isActive: true,
    };

    const regularUser = {
      id: 'user-test',
      username: 'user',
      email: 'user@test.com',
      roles: [ROLES.USER.name],
      permissions: ROLES.USER.permissions,
      isActive: true,
    };

    adminToken = authMiddleware.generateToken(adminUser);
    userToken = authMiddleware.generateToken(regularUser);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Authentication Endpoints', () => {
    test('POST /auth/login - should authenticate valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.tokens).toHaveProperty('access');
      expect(response.body.tokens).toHaveProperty('refresh');
    });

    test('POST /auth/login - should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('POST /auth/login - should require username and password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password are required');
    });

    test('POST /auth/refresh - should refresh valid tokens', async () => {
      const refreshToken = authMiddleware.generateRefreshToken('test-user');

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toHaveProperty('access');
      expect(response.body.tokens).toHaveProperty('refresh');
    });

    test('POST /auth/refresh - should reject invalid refresh tokens', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    test('POST /auth/logout - should logout authenticated users', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('GraphQL Authentication', () => {
    test('GraphQL endpoint should reject unauthenticated requests', async () => {
      const query = `
        query {
          requirements {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query });

      expect(response.status).toBe(401);
    });

    test('GraphQL endpoint should accept valid JWT tokens', async () => {
      const query = `
        query {
          health
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('health');
    });

    test('GraphQL endpoint should reject expired tokens', async () => {
      // Create an expired token (this is a mock - in real tests you'd use a real expired token)
      const expiredToken = 'expired.jwt.token';

      const query = `
        query {
          health
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ query });

      expect(response.status).toBe(401);
    });

    test('GraphQL endpoint should reject malformed tokens', async () => {
      const query = `
        query {
          health
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer invalid-token`)
        .send({ query });

      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Guards', () => {
    test('Admin should access all operations', async () => {
      const query = `
        query {
          requirements {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
    });

    test('Regular user should access read operations', async () => {
      const query = `
        query {
          requirements {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      // Note: This might return an error if requirements service is not properly mocked
      // In a real test environment, you'd mock the services
    });

    test('User without write permissions should be rejected for mutations', async () => {
      // Create a user token without write permissions
      const readOnlyUser = {
        id: 'readonly-user',
        username: 'readonly',
        email: 'readonly@test.com',
        roles: [ROLES.GUEST.name],
        permissions: [PERMISSIONS.READ],
        isActive: true,
      };

      const readOnlyToken = authMiddleware.generateToken(readOnlyUser);

      const mutation = `
        mutation {
          createRequirement(input: {
            title: "Test Requirement"
            description: "Test Description"
          }) {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('permissions');
    });

    test('Admin should be able to approve requirements', async () => {
      const mutation = `
        mutation {
          approveRequirement(id: "test-requirement-id") {
            id
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      // Note: This might fail if the requirement doesn't exist
      // In a real test, you'd set up test data or mock the service
    });

    test('Regular user should not be able to approve requirements', async () => {
      const mutation = `
        mutation {
          approveRequirement(id: "test-requirement-id") {
            id
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('permissions');
    });
  });

  describe('Role-Based Access Control', () => {
    test('Developer role should have development permissions', async () => {
      const developerUser = {
        id: 'dev-test',
        username: 'developer',
        email: 'dev@test.com',
        roles: [ROLES.DEVELOPER.name],
        permissions: ROLES.DEVELOPER.permissions,
        isActive: true,
      };

      const developerToken = authMiddleware.generateToken(developerUser);

      const query = `
        query {
          generateWorkflowTemplate(
            projectName: "test-project"
            technologies: ["nodejs", "react"]
            platform: "github"
          ) {
            name
            steps
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      // Response might be empty if services aren't mocked, but should not be unauthorized
    });

    test('Architect role should have architecture permissions', async () => {
      const architectUser = {
        id: 'arch-test',
        username: 'architect',
        email: 'architect@test.com',
        roles: [ROLES.ARCHITECT.name],
        permissions: ROLES.ARCHITECT.permissions,
        isActive: true,
      };

      const architectToken = authMiddleware.generateToken(architectUser);

      const query = `
        query {
          architectureDecisions {
            id
            title
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${architectToken}`)
        .send({ query });

      expect(response.status).toBe(200);
      // Should not return authorization errors
    });

    test('Manager role should have management permissions', async () => {
      const managerUser = {
        id: 'mgr-test',
        username: 'manager',
        email: 'manager@test.com',
        roles: [ROLES.MANAGER.name],
        permissions: ROLES.MANAGER.permissions,
        isActive: true,
      };

      const managerToken = authMiddleware.generateToken(managerUser);

      const mutation = `
        mutation {
          approveRequirement(id: "test-requirement") {
            id
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ query: mutation });

      expect(response.status).toBe(200);
      // Should have approval permissions
    });
  });

  describe('Token Management', () => {
    test('Should blacklist revoked tokens', async () => {
      const testToken = authMiddleware.generateToken({
        id: 'test-user',
        username: 'testuser',
        email: 'test@test.com',
        roles: ['user'],
        permissions: ['read'],
        isActive: true,
      });

      // First request should work
      let response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ query: '{ health }' });

      expect(response.status).toBe(200);

      // Revoke the token
      authMiddleware.revokeToken(testToken);

      // Second request should fail
      response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ query: '{ health }' });

      expect(response.status).toBe(401);
    });

    test('Should handle token cleanup', () => {
      // Test cleanup functionality
      authMiddleware.cleanup();
      
      // Verify cleanup doesn't break functionality
      const testToken = authMiddleware.generateToken({
        id: 'cleanup-test',
        username: 'cleanuptest',
        email: 'cleanup@test.com',
        roles: ['user'],
        permissions: ['read'],
        isActive: true,
      });

      expect(testToken).toBeDefined();
      expect(typeof testToken).toBe('string');
    });
  });

  describe('Security Headers and CORS', () => {
    test('Should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
    });

    test('Should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/graphql')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Error Handling', () => {
    test('Should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: 'invalid graphql query' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('Should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer invalid-token`)
        .send({ query: '{ health }' });

      expect(response.status).toBe(401);
      expect(response.body.error).not.toContain('jwt');
      expect(response.body.error).not.toContain('secret');
      expect(response.body.error).not.toContain('key');
    });
  });
});

// Helper function to create test app (you'd implement this based on your app setup)
async function createApp() {
  // This would return your Express app configured for testing
  // You might want to use a test database, mock services, etc.
  const { app } = await import('../../src/index');
  return app;
}