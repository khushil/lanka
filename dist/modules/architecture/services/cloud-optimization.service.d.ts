import { Neo4jService } from '../../../core/database/neo4j';
import { CloudProvider, CloudConfiguration, CloudService, OptimizationStrategy, CostEstimate } from '../types/architecture.types';
export declare class CloudOptimizationService {
    private neo4j;
    private cloudServiceMappings;
    constructor(neo4j: Neo4jService);
    optimizeForMultiCloud(architectureId: string, targetProviders: CloudProvider[]): Promise<Record<CloudProvider, CloudConfiguration>>;
    generateCloudConfiguration(architectureId: string, provider: CloudProvider): Promise<CloudConfiguration>;
    compareCloudCosts(architectureId: string, providers: CloudProvider[]): Promise<Record<CloudProvider, CostEstimate>>;
    identifyOptimizations(services: CloudService[], provider: CloudProvider): Promise<OptimizationStrategy[]>;
    private mapServicesToProvider;
    private calculateCosts;
    private calculateDetailedCosts;
    private estimateServiceCost;
    private selectOptimalRegions;
    private determineAvailability;
    private getComplianceRequirements;
    private getAlternativeServices;
    private getArchitectureRequirements;
    private storeCloudConfigurations;
    private storeCostComparison;
}
//# sourceMappingURL=cloud-optimization.service.d.ts.map