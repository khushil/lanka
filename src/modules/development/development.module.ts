import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

// Services
import { DevOpsHubService } from './services/devops-hub.service';
import { CICDOptimizationService } from './services/cicd-optimization.service';
import { DeploymentAutomationService } from './services/deployment-automation.service';
import { InfrastructureAsCodeService } from './services/infrastructure-as-code.service';
import { MonitoringConfigurationService } from './services/monitoring-configuration.service';
import { IncidentResponseService } from './services/incident-response.service';
import { ProductionFeedbackService } from './services/production-feedback.service';

// GraphQL
import { DevOpsResolvers } from './graphql/devops.resolvers';

@Module({
  imports: [],
  providers: [
    // Core DevOps Services
    DevOpsHubService,
    CICDOptimizationService,
    DeploymentAutomationService,
    InfrastructureAsCodeService,
    MonitoringConfigurationService,
    IncidentResponseService,
    ProductionFeedbackService,
    
    // GraphQL Resolvers
    DevOpsResolvers
  ],
  exports: [
    // Export services for use in other modules
    DevOpsHubService,
    CICDOptimizationService,
    DeploymentAutomationService,
    InfrastructureAsCodeService,
    MonitoringConfigurationService,
    IncidentResponseService,
    ProductionFeedbackService
  ]
})
export class DevelopmentModule {}