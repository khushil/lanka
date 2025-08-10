import { ApolloServer } from '@apollo/server';
import { createGraphQLSchema } from '../../src/api/graphql/schema';
import { Services } from '../../src/services';

describe('GraphQL API Integration Tests', () => {
  let server: ApolloServer;
  let mockServices: Partial<Services>;

  beforeEach(async () => {
    // Create mock services
    mockServices = {
      requirements: {
        createRequirement: jest.fn(),
        getRequirementById: jest.fn(),
        findSimilarRequirements: jest.fn(),
        detectConflicts: jest.fn(),
        extractPatterns: jest.fn(),
        updateRequirementStatus: jest.fn(),
      } as any,
      neo4j: {
        executeQuery: jest.fn(),
      } as any,
    };

    const schema = await createGraphQLSchema();
    server = new ApolloServer({
      schema,
    });
  });

  describe('Queries', () => {
    it('should query health check', async () => {
      const query = `
        query {
          health
        }
      `;

      const response = await server.executeOperation({
        query,
        variables: {},
      });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.health).toBe('LANKA GraphQL API is healthy');
      }
    });

    it('should query requirement by ID', async () => {
      const mockRequirement = {
        id: 'req-123',
        title: 'Test Requirement',
        description: 'Test description',
        type: 'FUNCTIONAL',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      };

      (mockServices.requirements!.getRequirementById as jest.Mock).mockResolvedValue(mockRequirement);

      const query = `
        query GetRequirement($id: ID!) {
          requirement(id: $id) {
            id
            title
            description
            type
            status
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query,
          variables: { id: 'req-123' },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.requirement).toEqual(mockRequirement);
      }
    });

    it('should analyze requirement text', async () => {
      const query = `
        query AnalyzeRequirement($description: String!) {
          analyzeRequirement(description: $description) {
            requirement {
              title
              type
              priority
            }
            completenessScore
            qualityScore
            suggestions
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query,
          variables: {
            description: 'As a user, I want to login with OAuth2 so that I can access my account securely',
          },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const result = response.body.singleResult.data?.analyzeRequirement;
        expect(result).toBeDefined();
        expect(result.requirement.type).toBe('USER_STORY');
        expect(result.completenessScore).toBeGreaterThan(0);
        expect(result.qualityScore).toBeGreaterThan(0);
      }
    });
  });

  describe('Mutations', () => {
    it('should create a new requirement', async () => {
      const mockCreatedRequirement = {
        id: 'req-456',
        title: 'New Requirement',
        description: 'New requirement description',
        type: 'FUNCTIONAL',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      };

      (mockServices.requirements!.createRequirement as jest.Mock).mockResolvedValue(mockCreatedRequirement);

      const mutation = `
        mutation CreateRequirement($input: CreateRequirementInput!) {
          createRequirement(input: $input) {
            id
            title
            description
            type
            status
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation,
          variables: {
            input: {
              description: 'New requirement description',
              projectId: 'proj-123',
              stakeholderId: 'stake-456',
            },
          },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createRequirement).toEqual(mockCreatedRequirement);
      }
    });

    it('should approve a requirement', async () => {
      const mockApprovedRequirement = {
        id: 'req-789',
        status: 'APPROVED',
      };

      (mockServices.requirements!.updateRequirementStatus as jest.Mock).mockResolvedValue(
        mockApprovedRequirement
      );

      const mutation = `
        mutation ApproveRequirement($id: ID!) {
          approveRequirement(id: $id) {
            id
            status
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation,
          variables: { id: 'req-789' },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.approveRequirement).toEqual(mockApprovedRequirement);
      }
    });

    it('should link two requirements', async () => {
      (mockServices.neo4j!.executeQuery as jest.Mock).mockResolvedValue([{ r1: {}, r2: {} }]);

      const mutation = `
        mutation LinkRequirements($requirement1Id: ID!, $requirement2Id: ID!, $relationship: String!) {
          linkRequirements(
            requirement1Id: $requirement1Id
            requirement2Id: $requirement2Id
            relationship: $relationship
          )
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation,
          variables: {
            requirement1Id: 'req-001',
            requirement2Id: 'req-002',
            relationship: 'DEPENDS_ON',
          },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.linkRequirements).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle requirement not found', async () => {
      (mockServices.requirements!.getRequirementById as jest.Mock).mockResolvedValue(null);

      const query = `
        query GetRequirement($id: ID!) {
          requirement(id: $id) {
            id
            title
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query,
          variables: { id: 'non-existent' },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.data?.requirement).toBeNull();
      }
    });

    it('should validate required fields', async () => {
      const mutation = `
        mutation CreateRequirement($input: CreateRequirementInput!) {
          createRequirement(input: $input) {
            id
          }
        }
      `;

      const response = await server.executeOperation(
        {
          query: mutation,
          variables: {
            input: {
              // Missing required fields
              description: '',
            },
          },
        },
        {
          contextValue: { services: mockServices },
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
      }
    });
  });
});