"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudOptimizationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const architecture_types_1 = require("../types/architecture.types");
class CloudOptimizationService {
    neo4j;
    cloudServiceMappings = {
        // Compute services
        'virtual-machine': {
            [architecture_types_1.CloudProvider.AWS]: 'EC2',
            [architecture_types_1.CloudProvider.AZURE]: 'Virtual Machines',
            [architecture_types_1.CloudProvider.GCP]: 'Compute Engine',
        },
        'container-service': {
            [architecture_types_1.CloudProvider.AWS]: 'ECS/EKS',
            [architecture_types_1.CloudProvider.AZURE]: 'AKS',
            [architecture_types_1.CloudProvider.GCP]: 'GKE',
        },
        'serverless-function': {
            [architecture_types_1.CloudProvider.AWS]: 'Lambda',
            [architecture_types_1.CloudProvider.AZURE]: 'Functions',
            [architecture_types_1.CloudProvider.GCP]: 'Cloud Functions',
        },
        // Storage services
        'object-storage': {
            [architecture_types_1.CloudProvider.AWS]: 'S3',
            [architecture_types_1.CloudProvider.AZURE]: 'Blob Storage',
            [architecture_types_1.CloudProvider.GCP]: 'Cloud Storage',
        },
        'block-storage': {
            [architecture_types_1.CloudProvider.AWS]: 'EBS',
            [architecture_types_1.CloudProvider.AZURE]: 'Managed Disks',
            [architecture_types_1.CloudProvider.GCP]: 'Persistent Disk',
        },
        // Database services
        'relational-db': {
            [architecture_types_1.CloudProvider.AWS]: 'RDS',
            [architecture_types_1.CloudProvider.AZURE]: 'SQL Database',
            [architecture_types_1.CloudProvider.GCP]: 'Cloud SQL',
        },
        'nosql-db': {
            [architecture_types_1.CloudProvider.AWS]: 'DynamoDB',
            [architecture_types_1.CloudProvider.AZURE]: 'Cosmos DB',
            [architecture_types_1.CloudProvider.GCP]: 'Firestore',
        },
        // Networking
        'load-balancer': {
            [architecture_types_1.CloudProvider.AWS]: 'ELB/ALB',
            [architecture_types_1.CloudProvider.AZURE]: 'Load Balancer',
            [architecture_types_1.CloudProvider.GCP]: 'Cloud Load Balancing',
        },
        'cdn': {
            [architecture_types_1.CloudProvider.AWS]: 'CloudFront',
            [architecture_types_1.CloudProvider.AZURE]: 'CDN',
            [architecture_types_1.CloudProvider.GCP]: 'Cloud CDN',
        },
    };
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async optimizeForMultiCloud(architectureId, targetProviders) {
        const configurations = {};
        for (const provider of targetProviders) {
            configurations[provider] = await this.generateCloudConfiguration(architectureId, provider);
        }
        // Store configurations in Neo4j
        await this.storeCloudConfigurations(architectureId, configurations);
        return configurations;
    }
    async generateCloudConfiguration(architectureId, provider) {
        // Get architecture requirements
        const requirements = await this.getArchitectureRequirements(architectureId);
        // Map services to cloud-specific implementations
        const services = this.mapServicesToProvider(requirements, provider);
        // Calculate costs
        await this.calculateCosts(services, provider);
        // Identify optimization strategies
        const optimizations = await this.identifyOptimizations(services, provider);
        // Determine compliance requirements
        const compliance = await this.getComplianceRequirements(provider, requirements);
        const configuration = {
            provider,
            services,
            regions: this.selectOptimalRegions(provider, requirements),
            availability: this.determineAvailability(requirements),
            compliance,
            costOptimizations: optimizations,
        };
        logger_1.logger.info(`Generated ${provider} configuration for architecture ${architectureId}`);
        return configuration;
    }
    async compareCloudCosts(architectureId, providers) {
        const costComparison = {};
        for (const provider of providers) {
            const configuration = await this.generateCloudConfiguration(architectureId, provider);
            costComparison[provider] = await this.calculateDetailedCosts(configuration.services, provider);
        }
        // Store cost comparison for future reference
        await this.storeCostComparison(architectureId, costComparison);
        return costComparison;
    }
    async identifyOptimizations(services, provider) {
        const strategies = [];
        // Reserved instances optimization
        const computeServices = services.filter(s => s.type === 'compute');
        if (computeServices.length > 0) {
            const totalComputeCost = computeServices.reduce((sum, s) => sum + s.estimatedCost, 0);
            strategies.push({
                name: 'Reserved Instances',
                description: `Convert on-demand instances to reserved for predictable workloads`,
                potentialSavings: totalComputeCost * 0.3, // Typical 30% savings
                implementation: `Purchase 1-year or 3-year reserved instances for ${computeServices.length} compute resources`,
                tradeOffs: ['Reduced flexibility', 'Upfront commitment required'],
            });
        }
        // Auto-scaling optimization
        strategies.push({
            name: 'Auto-scaling',
            description: 'Implement auto-scaling to match capacity with demand',
            potentialSavings: services.reduce((sum, s) => sum + s.estimatedCost * 0.2, 0),
            implementation: 'Configure auto-scaling groups with appropriate metrics and thresholds',
            tradeOffs: ['Potential cold start latency', 'Complexity in configuration'],
        });
        // Storage tier optimization
        const storageServices = services.filter(s => s.type === 'storage');
        if (storageServices.length > 0) {
            strategies.push({
                name: 'Storage Tiering',
                description: 'Move infrequently accessed data to cheaper storage tiers',
                potentialSavings: storageServices.reduce((sum, s) => sum + s.estimatedCost * 0.4, 0),
                implementation: 'Implement lifecycle policies to transition data between storage classes',
                tradeOffs: ['Increased retrieval latency for archived data'],
            });
        }
        // Spot instances for batch workloads
        if (provider === architecture_types_1.CloudProvider.AWS || provider === architecture_types_1.CloudProvider.GCP) {
            strategies.push({
                name: 'Spot/Preemptible Instances',
                description: 'Use spot instances for fault-tolerant batch workloads',
                potentialSavings: computeServices.reduce((sum, s) => sum + s.estimatedCost * 0.7, 0),
                implementation: 'Configure spot fleet with diversified instance types',
                tradeOffs: ['Instances can be terminated with short notice', 'Not suitable for stateful applications'],
            });
        }
        return strategies;
    }
    mapServicesToProvider(requirements, provider) {
        const services = [];
        // Map generic service types to provider-specific services
        Object.entries(requirements.services || {}).forEach(([serviceType, config]) => {
            const providerService = this.cloudServiceMappings[serviceType]?.[provider];
            if (providerService) {
                services.push({
                    name: providerService,
                    type: serviceType,
                    configuration: config,
                    estimatedCost: this.estimateServiceCost(serviceType, config, provider),
                    alternativeServices: this.getAlternativeServices(serviceType, provider),
                });
            }
        });
        return services;
    }
    async calculateCosts(services, _provider) {
        const monthlyTotal = services.reduce((sum, s) => sum + s.estimatedCost, 0);
        return {
            upfront: 0, // No upfront for on-demand
            monthly: monthlyTotal,
            yearly: monthlyTotal * 12,
            currency: 'USD',
            breakdown: services.map(s => ({
                category: s.type,
                service: s.name,
                quantity: 1,
                unitCost: s.estimatedCost,
                totalCost: s.estimatedCost,
            })),
        };
    }
    async calculateDetailedCosts(services, provider) {
        // In production, this would call actual cloud pricing APIs
        // For now, using simplified estimates
        const baseCosts = await this.calculateCosts(services, provider);
        // Add data transfer costs
        const dataTransferCost = baseCosts.monthly * 0.1; // Assume 10% for data transfer
        // Add support costs
        const supportCost = baseCosts.monthly * 0.05; // Assume 5% for support
        return {
            ...baseCosts,
            monthly: baseCosts.monthly + dataTransferCost + supportCost,
            yearly: (baseCosts.monthly + dataTransferCost + supportCost) * 12,
        };
    }
    estimateServiceCost(serviceType, config, provider) {
        // Simplified cost estimation based on service type and provider
        const baseCosts = {
            'virtual-machine': {
                [architecture_types_1.CloudProvider.AWS]: 100,
                [architecture_types_1.CloudProvider.AZURE]: 95,
                [architecture_types_1.CloudProvider.GCP]: 90,
            },
            'container-service': {
                [architecture_types_1.CloudProvider.AWS]: 150,
                [architecture_types_1.CloudProvider.AZURE]: 140,
                [architecture_types_1.CloudProvider.GCP]: 135,
            },
            'serverless-function': {
                [architecture_types_1.CloudProvider.AWS]: 20,
                [architecture_types_1.CloudProvider.AZURE]: 22,
                [architecture_types_1.CloudProvider.GCP]: 18,
            },
            'object-storage': {
                [architecture_types_1.CloudProvider.AWS]: 25,
                [architecture_types_1.CloudProvider.AZURE]: 23,
                [architecture_types_1.CloudProvider.GCP]: 20,
            },
            'relational-db': {
                [architecture_types_1.CloudProvider.AWS]: 200,
                [architecture_types_1.CloudProvider.AZURE]: 190,
                [architecture_types_1.CloudProvider.GCP]: 185,
            },
        };
        const baseCost = baseCosts[serviceType]?.[provider] || 50;
        // Adjust based on configuration (size, performance tier, etc.)
        const sizeFactor = config.size === 'large' ? 2 : config.size === 'medium' ? 1.5 : 1;
        const performanceFactor = config.performance === 'high' ? 1.5 : 1;
        return baseCost * sizeFactor * performanceFactor;
    }
    selectOptimalRegions(provider, requirements) {
        const regionMap = {
            [architecture_types_1.CloudProvider.AWS]: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
            [architecture_types_1.CloudProvider.AZURE]: ['eastus', 'westeurope', 'southeastasia'],
            [architecture_types_1.CloudProvider.GCP]: ['us-central1', 'europe-west1', 'asia-southeast1'],
            [architecture_types_1.CloudProvider.ONPREMISES]: ['datacenter-1'],
            [architecture_types_1.CloudProvider.HYBRID]: ['on-prem', 'cloud-primary'],
        };
        // Select regions based on requirements (latency, compliance, etc.)
        const regions = regionMap[provider] || [];
        // Filter based on compliance requirements
        if (requirements.compliance?.includes('GDPR')) {
            return regions.filter(r => r.includes('eu') || r.includes('europe'));
        }
        return regions.slice(0, 2); // Default to 2 regions for redundancy
    }
    determineAvailability(requirements) {
        const sla = requirements.sla || 99.9;
        if (sla >= 99.99)
            return 'Multi-region active-active';
        if (sla >= 99.95)
            return 'Multi-AZ with auto-failover';
        if (sla >= 99.9)
            return 'Multi-AZ';
        return 'Single-AZ';
    }
    async getComplianceRequirements(provider, requirements) {
        const compliance = requirements.compliance || [];
        // Add provider-specific compliance
        if (provider === architecture_types_1.CloudProvider.AWS) {
            compliance.push('AWS Well-Architected Framework');
        }
        else if (provider === architecture_types_1.CloudProvider.AZURE) {
            compliance.push('Azure Security Benchmark');
        }
        else if (provider === architecture_types_1.CloudProvider.GCP) {
            compliance.push('Google Cloud Security Best Practices');
        }
        return [...new Set(compliance)];
    }
    getAlternativeServices(serviceType, provider) {
        // Provide alternative services within the same provider
        const alternatives = {
            'virtual-machine': {
                [architecture_types_1.CloudProvider.AWS]: ['Lightsail', 'Batch'],
                [architecture_types_1.CloudProvider.AZURE]: ['Container Instances', 'Batch'],
                [architecture_types_1.CloudProvider.GCP]: ['Cloud Run', 'Batch'],
            },
            'relational-db': {
                [architecture_types_1.CloudProvider.AWS]: ['Aurora', 'Redshift'],
                [architecture_types_1.CloudProvider.AZURE]: ['PostgreSQL', 'Synapse'],
                [architecture_types_1.CloudProvider.GCP]: ['Spanner', 'BigQuery'],
            },
        };
        return alternatives[serviceType]?.[provider] || [];
    }
    async getArchitectureRequirements(architectureId) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $architectureId})
      MATCH (ad)-[:ADDRESSES]->(r:Requirement)
      RETURN collect(r) as requirements, ad
    `;
        const results = await this.neo4j.executeQuery(query, { architectureId });
        // Extract requirements and determine service needs
        const requirements = results[0]?.requirements || [];
        const ad = results[0]?.ad;
        const services = {};
        requirements.forEach((req) => {
            const props = req.properties;
            // Analyze requirements to determine needed services
            if (props.description?.includes('database')) {
                services['relational-db'] = { size: 'medium', performance: 'standard' };
            }
            if (props.description?.includes('storage')) {
                services['object-storage'] = { size: 'large', redundancy: 'high' };
            }
            if (props.description?.includes('compute') || props.description?.includes('processing')) {
                services['virtual-machine'] = { size: 'large', performance: 'high' };
            }
        });
        return {
            services,
            compliance: requirements.filter((r) => r.properties.type === 'COMPLIANCE')
                .map((r) => r.properties.description),
            sla: ad?.properties?.sla || 99.95, // Use SLA from AD or default
        };
    }
    async storeCloudConfigurations(architectureId, configurations) {
        for (const [provider, config] of Object.entries(configurations)) {
            const query = `
        MATCH (ad:ArchitectureDecision {id: $architectureId})
        CREATE (cc:CloudConfiguration {
          id: $id,
          provider: $provider,
          services: $services,
          regions: $regions,
          availability: $availability,
          compliance: $compliance,
          costOptimizations: $costOptimizations,
          createdAt: $createdAt
        })
        CREATE (ad)-[:HAS_CLOUD_CONFIG]->(cc)
      `;
            await this.neo4j.executeQuery(query, {
                architectureId,
                id: (0, uuid_1.v4)(),
                provider,
                services: JSON.stringify(config.services),
                regions: config.regions,
                availability: config.availability,
                compliance: config.compliance,
                costOptimizations: JSON.stringify(config.costOptimizations),
                createdAt: new Date().toISOString(),
            });
        }
        logger_1.logger.info(`Stored cloud configurations for architecture ${architectureId}`);
    }
    async storeCostComparison(architectureId, costComparison) {
        const query = `
      MATCH (ad:ArchitectureDecision {id: $architectureId})
      CREATE (cc:CostComparison {
        id: $id,
        comparison: $comparison,
        createdAt: $createdAt
      })
      CREATE (ad)-[:HAS_COST_COMPARISON]->(cc)
    `;
        await this.neo4j.executeQuery(query, {
            architectureId,
            id: (0, uuid_1.v4)(),
            comparison: JSON.stringify(costComparison),
            createdAt: new Date().toISOString(),
        });
        logger_1.logger.info(`Stored cost comparison for architecture ${architectureId}`);
    }
}
exports.CloudOptimizationService = CloudOptimizationService;
//# sourceMappingURL=cloud-optimization.service.js.map