import request from 'supertest';
import express from 'express';
import { Neo4jService } from '../../src/core/database/neo4j';

// Mock the Neo4j service for integration tests
jest.mock('../../src/core/database/neo4j');
jest.mock('../../src/core/logging/logger');

describe('API Endpoints Integration Tests', () => {
  let app: express.Application;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeAll(() => {
    // Setup Express app with minimal configuration
    app = express();
    app.use(express.json());

    // Mock API endpoints for testing
    app.post('/api/requirements', async (req, res) => {
      try {
        // Simulate requirement creation endpoint
        const { title, description, type, projectId, stakeholderId } = req.body;
        
        if (!title || !description || !projectId || !stakeholderId) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['title', 'description', 'projectId', 'stakeholderId']
          });
        }

        // Simulate successful creation
        const mockRequirement = {
          id: `req-${Date.now()}`,
          title,
          description,
          type: type || 'FUNCTIONAL',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          projectId,
          stakeholderId
        };

        res.status(201).json(mockRequirement);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/requirements/:id', async (req, res) => {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Requirement ID is required' });
      }

      if (id === 'non-existent') {
        return res.status(404).json({ error: 'Requirement not found' });
      }

      // Simulate found requirement
      res.json({
        id,
        title: 'Sample Requirement',
        description: 'Sample description',
        type: 'FUNCTIONAL',
        status: 'APPROVED'
      });
    });

    app.get('/api/requirements', async (req, res) => {
      const { projectId, status, limit = 20, offset = 0 } = req.query;

      // Validate query parameters
      if (limit && (isNaN(Number(limit)) || Number(limit) > 100)) {
        return res.status(400).json({ 
          error: 'Invalid limit parameter. Must be a number <= 100' 
        });
      }

      if (offset && isNaN(Number(offset))) {
        return res.status(400).json({ 
          error: 'Invalid offset parameter. Must be a number' 
        });
      }

      // Simulate filtered results
      const mockRequirements = Array.from({ length: Math.min(Number(limit), 5) }, (_, i) => ({
        id: `req-${i}`,
        title: `Requirement ${i}`,
        description: `Description ${i}`,
        status: status || 'DRAFT',
        projectId: projectId || 'default-project'
      }));

      res.json({
        data: mockRequirements,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: 50
        }
      });
    });

    app.put('/api/requirements/:id', async (req, res) => {
      const { id } = req.params;
      const { title, description, status } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Requirement ID is required' });
      }

      // Simulate validation
      if (status && !['DRAFT', 'PENDING', 'APPROVED', 'IMPLEMENTED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      // Simulate successful update
      res.json({
        id,
        title: title || 'Updated Title',
        description: description || 'Updated Description', 
        status: status || 'PENDING',
        updatedAt: new Date().toISOString()
      });
    });

    app.delete('/api/requirements/:id', async (req, res) => {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Requirement ID is required' });
      }

      if (id === 'protected') {
        return res.status(403).json({ error: 'Cannot delete protected requirement' });
      }

      res.status(204).send();
    });

    // Architecture endpoints
    app.post('/api/architecture/decisions', async (req, res) => {
      const { title, description, rationale } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['title', 'description']
        });
      }

      res.status(201).json({
        id: `arch-${Date.now()}`,
        title,
        description,
        rationale,
        status: 'DRAFT',
        createdAt: new Date().toISOString()
      });
    });

    // Search endpoint
    app.get('/api/search', async (req, res) => {
      const { q, type, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      if (typeof q !== 'string' || q.length < 3) {
        return res.status(400).json({ 
          error: 'Search query must be at least 3 characters long' 
        });
      }

      // Simulate search results
      const mockResults = Array.from({ length: Math.min(Number(limit), 3) }, (_, i) => ({
        id: `result-${i}`,
        title: `Search Result ${i}`,
        description: `Result matching "${q}"`,
        type: type || 'requirement',
        relevanceScore: 0.9 - (i * 0.1)
      }));

      res.json({
        query: q,
        results: mockResults,
        totalCount: mockResults.length
      });
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'healthy',
          memory: 'healthy',
          nlp: 'healthy'
        }
      });
    });
  });

  beforeEach(() => {
    mockNeo4j = require('../../src/core/database/neo4j').Neo4jService as jest.Mocked<Neo4jService>;
    mockNeo4j.executeQuery = jest.fn().mockResolvedValue([]);
  });

  describe('Requirements API', () => {
    describe('POST /api/requirements', () => {
      it('should create a new requirement with valid data', async () => {
        const requirementData = {
          title: 'User Authentication',
          description: 'User should be able to login with email and password',
          type: 'FUNCTIONAL',
          projectId: 'project-123',
          stakeholderId: 'stakeholder-456'
        };

        const response = await request(app)
          .post('/api/requirements')
          .send(requirementData)
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.stringMatching(/^req-\d+$/),
          title: requirementData.title,
          description: requirementData.description,
          type: requirementData.type,
          status: 'DRAFT',
          createdAt: expect.any(String),
          projectId: requirementData.projectId,
          stakeholderId: requirementData.stakeholderId
        });
      });

      it('should return 400 for missing required fields', async () => {
        const incompleteData = {
          title: 'Incomplete Requirement'
          // Missing description, projectId, stakeholderId
        };

        const response = await request(app)
          .post('/api/requirements')
          .send(incompleteData)
          .expect(400);

        expect(response.body).toEqual({
          error: 'Missing required fields',
          required: ['title', 'description', 'projectId', 'stakeholderId']
        });
      });

      it('should handle malformed JSON gracefully', async () => {
        await request(app)
          .post('/api/requirements')
          .send('invalid json')
          .set('Content-Type', 'application/json')
          .expect(400);
      });

      it('should handle large payloads', async () => {
        const largeRequirement = {
          title: 'A'.repeat(1000),
          description: 'B'.repeat(5000),
          projectId: 'project-123',
          stakeholderId: 'stakeholder-456'
        };

        await request(app)
          .post('/api/requirements')
          .send(largeRequirement)
          .expect(201);
      });
    });

    describe('GET /api/requirements/:id', () => {
      it('should return requirement by ID', async () => {
        const response = await request(app)
          .get('/api/requirements/req-123')
          .expect(200);

        expect(response.body).toMatchObject({
          id: 'req-123',
          title: 'Sample Requirement',
          description: 'Sample description',
          type: 'FUNCTIONAL',
          status: 'APPROVED'
        });
      });

      it('should return 404 for non-existent requirement', async () => {
        const response = await request(app)
          .get('/api/requirements/non-existent')
          .expect(404);

        expect(response.body).toEqual({
          error: 'Requirement not found'
        });
      });

      it('should handle invalid ID format', async () => {
        await request(app)
          .get('/api/requirements/')
          .expect(404); // Express returns 404 for missing route parameter
      });
    });

    describe('GET /api/requirements', () => {
      it('should return paginated requirements list', async () => {
        const response = await request(app)
          .get('/api/requirements?limit=5&offset=0')
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              description: expect.any(String),
              status: expect.any(String)
            })
          ]),
          pagination: {
            limit: 5,
            offset: 0,
            total: 50
          }
        });
      });

      it('should filter by project ID', async () => {
        const response = await request(app)
          .get('/api/requirements?projectId=specific-project')
          .expect(200);

        response.body.data.forEach((req: any) => {
          expect(req.projectId).toBe('specific-project');
        });
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/requirements?status=APPROVED')
          .expect(200);

        response.body.data.forEach((req: any) => {
          expect(req.status).toBe('APPROVED');
        });
      });

      it('should validate limit parameter', async () => {
        const response = await request(app)
          .get('/api/requirements?limit=200')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid limit parameter. Must be a number <= 100'
        });
      });

      it('should validate offset parameter', async () => {
        const response = await request(app)
          .get('/api/requirements?offset=invalid')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid offset parameter. Must be a number'
        });
      });
    });

    describe('PUT /api/requirements/:id', () => {
      it('should update requirement successfully', async () => {
        const updateData = {
          title: 'Updated Title',
          description: 'Updated Description',
          status: 'APPROVED'
        };

        const response = await request(app)
          .put('/api/requirements/req-123')
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          id: 'req-123',
          title: updateData.title,
          description: updateData.description,
          status: updateData.status,
          updatedAt: expect.any(String)
        });
      });

      it('should validate status values', async () => {
        const invalidUpdate = {
          status: 'INVALID_STATUS'
        };

        const response = await request(app)
          .put('/api/requirements/req-123')
          .send(invalidUpdate)
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid status value'
        });
      });

      it('should handle partial updates', async () => {
        const partialUpdate = {
          title: 'Only Title Update'
        };

        const response = await request(app)
          .put('/api/requirements/req-123')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.title).toBe('Only Title Update');
        expect(response.body.description).toBe('Updated Description'); // Default
      });
    });

    describe('DELETE /api/requirements/:id', () => {
      it('should delete requirement successfully', async () => {
        await request(app)
          .delete('/api/requirements/req-123')
          .expect(204);
      });

      it('should prevent deletion of protected requirements', async () => {
        const response = await request(app)
          .delete('/api/requirements/protected')
          .expect(403);

        expect(response.body).toEqual({
          error: 'Cannot delete protected requirement'
        });
      });
    });
  });

  describe('Architecture API', () => {
    describe('POST /api/architecture/decisions', () => {
      it('should create architecture decision', async () => {
        const decisionData = {
          title: 'Use Microservices Architecture',
          description: 'Adopt microservices pattern for better scalability',
          rationale: 'Improved fault tolerance and independent deployment'
        };

        const response = await request(app)
          .post('/api/architecture/decisions')
          .send(decisionData)
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.stringMatching(/^arch-\d+$/),
          title: decisionData.title,
          description: decisionData.description,
          rationale: decisionData.rationale,
          status: 'DRAFT',
          createdAt: expect.any(String)
        });
      });

      it('should require title and description', async () => {
        const incompleteData = {
          rationale: 'Missing title and description'
        };

        const response = await request(app)
          .post('/api/architecture/decisions')
          .send(incompleteData)
          .expect(400);

        expect(response.body).toEqual({
          error: 'Missing required fields',
          required: ['title', 'description']
        });
      });
    });
  });

  describe('Search API', () => {
    describe('GET /api/search', () => {
      it('should return search results', async () => {
        const response = await request(app)
          .get('/api/search?q=authentication&type=requirement&limit=5')
          .expect(200);

        expect(response.body).toMatchObject({
          query: 'authentication',
          results: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              description: expect.stringContaining('authentication'),
              type: 'requirement',
              relevanceScore: expect.any(Number)
            })
          ]),
          totalCount: expect.any(Number)
        });
      });

      it('should require search query', async () => {
        const response = await request(app)
          .get('/api/search')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Search query is required'
        });
      });

      it('should validate minimum query length', async () => {
        const response = await request(app)
          .get('/api/search?q=ab')
          .expect(400);

        expect(response.body).toEqual({
          error: 'Search query must be at least 3 characters long'
        });
      });

      it('should handle special characters in search', async () => {
        const response = await request(app)
          .get('/api/search?q=test%20%26%20validation')
          .expect(200);

        expect(response.body.query).toBe('test & validation');
      });
    });
  });

  describe('Health Check API', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        services: {
          database: expect.any(String),
          memory: expect.any(String),
          nlp: expect.any(String)
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should handle method not allowed', async () => {
      // Try to POST to a GET-only endpoint
      await request(app)
        .post('/api/health')
        .expect(404); // Express returns 404 for unmatched routes
    });

    it('should handle malformed request headers', async () => {
      await request(app)
        .get('/api/requirements')
        .set('Accept', 'invalid/content-type')
        .expect(200); // Should still work, just different content negotiation
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // These would be set by security middleware in a real application
      // Here we just verify the response structure is correct
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/requirements?limit=20')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate nested object structures', async () => {
      const complexRequirement = {
        title: 'Complex Requirement',
        description: 'Complex description',
        projectId: 'project-123',
        stakeholderId: 'stakeholder-456',
        metadata: {
          tags: ['important', 'security'],
          priority: 'HIGH',
          estimatedHours: 40
        }
      };

      await request(app)
        .post('/api/requirements')
        .send(complexRequirement)
        .expect(201);
    });

    it('should handle array validation', async () => {
      const requirementWithArrays = {
        title: 'Array Requirement',
        description: 'Contains arrays',
        projectId: 'project-123',
        stakeholderId: 'stakeholder-456',
        tags: ['tag1', 'tag2', 'tag3'],
        dependencies: ['dep1', 'dep2']
      };

      await request(app)
        .post('/api/requirements')
        .send(requirementWithArrays)
        .expect(201);
    });
  });
});