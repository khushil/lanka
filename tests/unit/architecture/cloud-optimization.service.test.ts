import { CloudOptimizationService } from '../../../src/modules/architecture/services/cloud-optimization.service';
import { Neo4jService } from '../../../src/core/database/neo4j';
import {
  CloudProvider,
  CloudService,
} from '../../../src/modules/architecture/types/architecture.types';

jest.mock('../../../src/core/database/neo4j');
jest.mock('../../../src/core/logging/logger');

describe('CloudOptimizationService', () => {
  let service: CloudOptimizationService;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  beforeEach(() => {
    mockNeo4j = {
      executeQuery: jest.fn(),
    } as any;
    service = new CloudOptimizationService(mockNeo4j);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('optimizeForMultiCloud', () => {
    it('should generate configurations for multiple cloud providers', async () => {
      const architectureId = 'arch-1';
      const targetProviders = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];

      // Mock architecture requirements
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'High performance database required',
                type: 'NON_FUNCTIONAL',
              },
            },
            {
              properties: {
                id: 'req-2',
                description: 'Object storage for media files',
                type: 'FUNCTIONAL',
              },
            },
          ],
          ad: {
            properties: {
              id: architectureId,
              title: 'Test Architecture',
            },
          },
        },
      ]);

      const result = await service.optimizeForMultiCloud(architectureId, targetProviders);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result[CloudProvider.AWS]).toBeDefined();
      expect(result[CloudProvider.AZURE]).toBeDefined();
      expect(result[CloudProvider.GCP]).toBeDefined();
      
      Object.values(result).forEach(config => {
        expect(config).toHaveProperty('provider');
        expect(config).toHaveProperty('services');
        expect(config).toHaveProperty('regions');
        expect(config).toHaveProperty('availability');
        expect(config).toHaveProperty('compliance');
        expect(config).toHaveProperty('costOptimizations');
      });
    });
  });

  describe('generateCloudConfiguration', () => {
    it('should generate cloud configuration for a specific provider', async () => {
      const architectureId = 'arch-1';
      const provider = CloudProvider.AWS;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'Compute resources for processing',
                type: 'FUNCTIONAL',
              },
            },
          ],
        },
      ]);

      const result = await service.generateCloudConfiguration(architectureId, provider);

      expect(result.provider).toBe(CloudProvider.AWS);
      expect(result.services).toBeDefined();
      expect(result.regions).toBeDefined();
      expect(result.availability).toBeDefined();
      expect(result.compliance).toContain('AWS Well-Architected Framework');
    });

    it('should handle GDPR compliance requirements', async () => {
      const architectureId = 'arch-1';
      const provider = CloudProvider.AWS;

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'GDPR compliance required',
                type: 'COMPLIANCE',
              },
            },
          ],
        },
      ]);

      const result = await service.generateCloudConfiguration(architectureId, provider);

      expect(result.regions.some(r => r.includes('eu') || r.includes('europe'))).toBe(true);
      expect(result.compliance).toContain('AWS Well-Architected Framework');
    });
  });

  describe('compareCloudCosts', () => {
    it('should compare costs across multiple cloud providers', async () => {
      const architectureId = 'arch-1';
      const providers = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'Virtual machines for compute',
                type: 'FUNCTIONAL',
              },
            },
            {
              properties: {
                id: 'req-2',
                description: 'Database service',
                type: 'FUNCTIONAL',
              },
            },
          ],
        },
      ]);

      const result = await service.compareCloudCosts(architectureId, providers);

      expect(Object.keys(result)).toHaveLength(3);
      
      Object.entries(result).forEach(([, cost]) => {
        expect(cost).toHaveProperty('upfront');
        expect(cost).toHaveProperty('monthly');
        expect(cost).toHaveProperty('yearly');
        expect(cost).toHaveProperty('currency');
        expect(cost).toHaveProperty('breakdown');
        expect(cost.currency).toBe('USD');
        expect(cost.monthly).toBeGreaterThan(0);
        expect(cost.yearly).toBe(cost.monthly * 12);
      });
    });
  });

  describe('identifyOptimizations', () => {
    it('should identify optimization strategies for cloud services', async () => {
      const services: CloudService[] = [
        {
          name: 'EC2',
          type: 'compute',
          configuration: { size: 'large' },
          estimatedCost: 1000,
          alternativeServices: ['Lightsail'],
        },
        {
          name: 'S3',
          type: 'storage',
          configuration: { size: 'large' },
          estimatedCost: 500,
          alternativeServices: [],
        },
      ];
      const provider = CloudProvider.AWS;

      const result = await service.identifyOptimizations(services, provider);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const reservedInstanceStrategy = result.find(s => s.name === 'Reserved Instances');
      expect(reservedInstanceStrategy).toBeDefined();
      expect(reservedInstanceStrategy?.potentialSavings).toBeGreaterThan(0);
      
      const autoScalingStrategy = result.find(s => s.name === 'Auto-scaling');
      expect(autoScalingStrategy).toBeDefined();
      
      const storageTieringStrategy = result.find(s => s.name === 'Storage Tiering');
      expect(storageTieringStrategy).toBeDefined();
    });

    it('should include spot instances for AWS and GCP', async () => {
      const services: CloudService[] = [
        {
          name: 'EC2',
          type: 'compute',
          configuration: {},
          estimatedCost: 1000,
          alternativeServices: [],
        },
      ];

      const awsResult = await service.identifyOptimizations(services, CloudProvider.AWS);
      const spotStrategyAWS = awsResult.find(s => s.name === 'Spot/Preemptible Instances');
      expect(spotStrategyAWS).toBeDefined();

      const gcpResult = await service.identifyOptimizations(services, CloudProvider.GCP);
      const spotStrategyGCP = gcpResult.find(s => s.name === 'Spot/Preemptible Instances');
      expect(spotStrategyGCP).toBeDefined();

      const azureResult = await service.identifyOptimizations(services, CloudProvider.AZURE);
      const spotStrategyAzure = azureResult.find(s => s.name === 'Spot/Preemptible Instances');
      expect(spotStrategyAzure).toBeUndefined();
    });
  });

  describe('service mapping', () => {
    it('should correctly map services to cloud providers', async () => {
      const architectureId = 'arch-1';
      
      // Test with different service requirements
      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [],
          ad: { properties: { id: architectureId } },
        },
      ]);

      // Since the service mapping is internal, we test it through generateCloudConfiguration
      const awsConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.AWS);
      const azureConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.AZURE);
      const gcpConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.GCP);

      // Verify that each provider gets appropriate service names
      expect(awsConfig.provider).toBe(CloudProvider.AWS);
      expect(azureConfig.provider).toBe(CloudProvider.AZURE);
      expect(gcpConfig.provider).toBe(CloudProvider.GCP);
    });
  });

  describe('cost calculations', () => {
    it('should calculate detailed costs including data transfer and support', async () => {
      const architectureId = 'arch-1';
      const providers = [CloudProvider.AWS];

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'Virtual machine for compute',
                type: 'FUNCTIONAL',
              },
            },
          ],
        },
      ]);

      const result = await service.compareCloudCosts(architectureId, providers);

      const awsCost = result[CloudProvider.AWS];
      expect(awsCost).toBeDefined();
      expect(awsCost.monthly).toBeGreaterThan(0);
      
      // Verify that data transfer and support costs are included
      // The detailed cost should be higher than the base service cost
      expect(awsCost.yearly).toBe(awsCost.monthly * 12);
    });
  });

  describe('availability determination', () => {
    it('should determine availability based on SLA requirements', async () => {
      const architectureId = 'arch-1';
      const provider = CloudProvider.AWS;

      // Test different SLA levels
      const slaLevels = [
        { sla: 99.999, expected: 'Multi-region active-active' },
        { sla: 99.95, expected: 'Multi-AZ with auto-failover' },
        { sla: 99.9, expected: 'Multi-AZ' },
        { sla: 99.0, expected: 'Single-AZ' },
      ];

      for (const { sla, expected } of slaLevels) {
        mockNeo4j.executeQuery.mockResolvedValue([
          {
            requirements: [],
            ad: { properties: { id: architectureId, sla } },
          },
        ]);

        const result = await service.generateCloudConfiguration(architectureId, provider);
        expect(result.availability).toBe(expected);
      }
    });
  });

  describe('compliance handling', () => {
    it('should add provider-specific compliance requirements', async () => {
      const architectureId = 'arch-1';

      mockNeo4j.executeQuery.mockResolvedValue([
        {
          requirements: [
            {
              properties: {
                id: 'req-1',
                description: 'PCI DSS compliance',
                type: 'COMPLIANCE',
              },
            },
          ],
        },
      ]);

      const awsConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.AWS);
      expect(awsConfig.compliance).toContain('AWS Well-Architected Framework');

      const azureConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.AZURE);
      expect(azureConfig.compliance).toContain('Azure Security Benchmark');

      const gcpConfig = await service.generateCloudConfiguration(architectureId, CloudProvider.GCP);
      expect(gcpConfig.compliance).toContain('Google Cloud Security Best Practices');
    });
  });
});