/**
 * REST API Contract Validation Tests
 * Tests OpenAPI specification compliance and endpoint contracts
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

describe('REST API Contract Tests', () => {
  let app: express.Application;
  let openAPISpec: OpenAPIV3.Document;
  let ajv: Ajv;

  beforeAll(async () => {
    // Load OpenAPI specification
    const specPath = path.join(__dirname, '../../../docs/api/openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    openAPISpec = yaml.load(specContent) as OpenAPIV3.Document;

    // Validate OpenAPI spec itself
    await SwaggerParser.validate(openAPISpec);

    // Set up JSON Schema validator
    ajv = new Ajv({ allErrors: true, validateFormats: true });
    addFormats(ajv);

    // Set up test Express app (mock server)
    app = express();
    app.use(express.json());
    setupMockRoutes(app);
  });

  describe('OpenAPI Specification Validation', () => {
    test('should have valid OpenAPI 3.0 specification', async () => {
      expect(openAPISpec.openapi).toMatch(/^3\.0\.\d+$/);
      expect(openAPISpec.info).toBeDefined();
      expect(openAPISpec.info.title).toBe('LANKA Architecture Intelligence API');
      expect(openAPISpec.info.version).toBeDefined();
    });

    test('should have proper server configuration', () => {
      expect(openAPISpec.servers).toBeDefined();
      expect(openAPISpec.servers!.length).toBeGreaterThan(0);
      
      const servers = openAPISpec.servers!;
      expect(servers.some(server => server.url.includes('localhost'))).toBe(true);
    });

    test('should define required security schemes', () => {
      expect(openAPISpec.components?.securitySchemes).toBeDefined();
      expect(openAPISpec.components?.securitySchemes?.BearerAuth).toBeDefined();
      
      const bearerAuth = openAPISpec.components?.securitySchemes?.BearerAuth as OpenAPIV3.SecuritySchemeObject;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
    });
  });

  describe('Endpoint Contract Validation', () => {
    test('should validate health endpoint contract', async () => {
      const healthPath = openAPISpec.paths?.['/health'];
      expect(healthPath).toBeDefined();
      
      const getOperation = (healthPath as OpenAPIV3.PathItemObject)?.get;
      expect(getOperation).toBeDefined();
      expect(getOperation?.operationId).toBe('getHealth');
      
      // Test actual endpoint
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Validate response against schema
      const responseSchema = getResponseSchema(openAPISpec, '/health', 'get', '200');
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        expect(validate(response.body)).toBe(true);
      }
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('should validate requirements endpoint contracts', async () => {
      // Test GET /requirements
      const requirementsPath = openAPISpec.paths?.['/requirements'];
      expect(requirementsPath).toBeDefined();
      
      const getOperation = (requirementsPath as OpenAPIV3.PathItemObject)?.get;
      expect(getOperation).toBeDefined();
      
      // Test with query parameters
      const response = await request(app)
        .get('/requirements?limit=10&offset=0')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Validate response schema
      const responseSchema = getResponseSchema(openAPISpec, '/requirements', 'get', '200');
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        const isValid = validate(response.body);
        if (!isValid) {
          console.error('Schema validation errors:', validate.errors);
        }
        expect(isValid).toBe(true);
      }
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should validate requirement creation contract', async () => {
      const createRequirementInput = {
        title: 'Test Requirement',
        description: 'A test requirement for contract validation',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: 'test-project-123',
        stakeholderId: 'test-stakeholder-123',
        acceptanceCriteria: ['Should be testable', 'Should be measurable']
      };

      const response = await request(app)
        .post('/requirements')
        .set('Authorization', 'Bearer test-token')
        .send(createRequirementInput)
        .expect(201);

      // Validate input against schema
      const inputSchema = getRequestBodySchema(openAPISpec, '/requirements', 'post');
      if (inputSchema) {
        const validate = ajv.compile(inputSchema);
        expect(validate(createRequirementInput)).toBe(true);
      }

      // Validate response against schema
      const responseSchema = getResponseSchema(openAPISpec, '/requirements', 'post', '201');
      if (responseSchema) {
        const validate = ajv.compile(responseSchema);
        expect(validate(response.body)).toBe(true);
      }
    });
  });

  describe('Error Response Contract Validation', () => {
    test('should return proper 400 error format', async () => {
      const response = await request(app)
        .post('/requirements')
        .set('Authorization', 'Bearer test-token')
        .send({}) // Invalid input
        .expect(400);

      const errorSchema = getResponseSchema(openAPISpec, '/requirements', 'post', '400');
      if (errorSchema) {
        const validate = ajv.compile(errorSchema);
        expect(validate(response.body)).toBe(true);
      }

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    test('should return proper 401 error format', async () => {
      const response = await request(app)
        .get('/requirements')
        .expect(401); // No authorization header

      const errorSchema = getResponseSchema(openAPISpec, '/requirements', 'get', '401');
      if (errorSchema) {
        const validate = ajv.compile(errorSchema);
        expect(validate(response.body)).toBe(true);
      }
    });

    test('should return proper 404 error format', async () => {
      const response = await request(app)
        .get('/requirements/non-existent-id')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Parameter Validation Contracts', () => {
    test('should validate path parameters', async () => {
      const requirementPath = openAPISpec.paths?.['/requirements/{id}'];
      const pathParameters = (requirementPath as OpenAPIV3.PathItemObject)?.get?.parameters;
      
      expect(pathParameters).toBeDefined();
      expect(Array.isArray(pathParameters)).toBe(true);
      
      const idParam = (pathParameters as OpenAPIV3.ParameterObject[])?.find(p => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam?.in).toBe('path');
      expect(idParam?.required).toBe(true);
    });

    test('should validate query parameters', async () => {
      // Test with valid parameters
      await request(app)
        .get('/requirements?limit=20&offset=0&type=FUNCTIONAL')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Test with invalid limit (should be capped or return error)
      const response = await request(app)
        .get('/requirements?limit=1000') // Exceeds maximum
        .set('Authorization', 'Bearer test-token');
      
      // Should either be capped at 100 or return 400
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Content-Type Contract Validation', () => {
    test('should accept and return proper content types', async () => {
      const response = await request(app)
        .post('/requirements')
        .set('Authorization', 'Bearer test-token')
        .set('Content-Type', 'application/json')
        .send({
          description: 'Test requirement',
          projectId: 'test-project',
          stakeholderId: 'test-stakeholder'
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should reject unsupported content types', async () => {
      await request(app)
        .post('/requirements')
        .set('Authorization', 'Bearer test-token')
        .set('Content-Type', 'text/plain')
        .send('invalid content')
        .expect(415); // Unsupported Media Type
    });
  });

  describe('API Versioning Contracts', () => {
    test('should maintain version compatibility', () => {
      const apiVersion = openAPISpec.info.version;
      expect(apiVersion).toMatch(/^\d+\.\d+\.\d+$/);
      
      // Check if version is backward compatible (major version check)
      const majorVersion = parseInt(apiVersion.split('.')[0]);
      expect(majorVersion).toBeGreaterThanOrEqual(1);
    });

    test('should handle version headers appropriately', async () => {
      const response = await request(app)
        .get('/health')
        .set('API-Version', '2.0');

      // Should either accept version or return version info
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Rate Limiting Contract Validation', () => {
    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for rate limiting headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
});

// Helper function to set up mock routes for testing
function setupMockRoutes(app: express.Application) {
  app.get('/health', (req, res) => {
    res.set('X-RateLimit-Limit', '1000');
    res.set('X-RateLimit-Remaining', '999');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      services: {
        neo4j: 'connected',
        graphql: 'available'
      }
    });
  });

  app.get('/requirements', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required',
          timestamp: new Date().toISOString(),
          requestId: 'req-test-123'
        }
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    res.json({
      data: Array.from({ length: Math.min(5, limit) }, (_, i) => ({
        id: `req-${i + offset + 1}`,
        title: `Test Requirement ${i + offset + 1}`,
        description: 'A test requirement',
        type: 'FUNCTIONAL',
        status: 'DRAFT',
        priority: 'MEDIUM',
        createdAt: new Date().toISOString(),
        projectId: 'test-project',
        stakeholderId: 'test-stakeholder',
        completenessScore: 0.8,
        qualityScore: 0.85
      })),
      pagination: {
        limit,
        offset,
        total: 100,
        hasNext: offset + limit < 100,
        hasPrevious: offset > 0
      }
    });
  });

  app.post('/requirements', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required'
        }
      });
    }

    if (!req.body.description || !req.body.projectId || !req.body.stakeholderId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: {
            field: 'description',
            issue: 'Description is required and cannot be empty'
          },
          timestamp: new Date().toISOString(),
          requestId: 'req-test-456'
        }
      });
    }

    res.status(201).json({
      requirement: {
        id: 'req-new-123',
        title: req.body.title || 'Generated Title',
        description: req.body.description,
        type: req.body.type || 'FUNCTIONAL',
        status: 'DRAFT',
        priority: req.body.priority || 'MEDIUM',
        createdAt: new Date().toISOString(),
        projectId: req.body.projectId,
        stakeholderId: req.body.stakeholderId,
        completenessScore: 0.75,
        qualityScore: 0.8,
        acceptanceCriteria: req.body.acceptanceCriteria || []
      },
      analysis: {
        completenessScore: 0.75,
        qualityScore: 0.8,
        suggestions: ['Consider adding more specific acceptance criteria'],
        similarRequirements: []
      }
    });
  });

  app.get('/requirements/:id', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required'
        }
      });
    }

    if (req.params.id === 'non-existent-id') {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Requirement not found',
          details: {
            resource_type: 'Requirement',
            resource_id: req.params.id
          },
          timestamp: new Date().toISOString(),
          requestId: 'req-test-789'
        }
      });
    }

    res.json({
      requirement: {
        id: req.params.id,
        title: 'Test Requirement',
        description: 'A detailed test requirement',
        type: 'FUNCTIONAL',
        status: 'APPROVED',
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
        projectId: 'test-project',
        stakeholderId: 'test-stakeholder',
        completenessScore: 0.9,
        qualityScore: 0.85
      }
    });
  });

  // Handle unsupported content types
  app.use((req, res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) {
      return res.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json'
        }
      });
    }
    next();
  });
}

// Helper functions for schema extraction
function getResponseSchema(spec: OpenAPIV3.Document, path: string, method: string, statusCode: string): any {
  const operation = (spec.paths?.[path] as any)?.[method];
  const response = operation?.responses?.[statusCode];
  return response?.content?.['application/json']?.schema;
}

function getRequestBodySchema(spec: OpenAPIV3.Document, path: string, method: string): any {
  const operation = (spec.paths?.[path] as any)?.[method];
  return operation?.requestBody?.content?.['application/json']?.schema;
}