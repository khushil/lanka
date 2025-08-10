import { DeploymentAutomationService } from '../../../src/modules/development/services/deployment-automation.service';
import { DeploymentStrategy, Environment, DeploymentConfiguration } from '../../../src/types';

describe('DeploymentAutomationService', () => {
  let service: DeploymentAutomationService;
  
  beforeEach(() => {
    service = new DeploymentAutomationService();
  });

  describe('generateDeploymentStrategy', () => {
    it('should generate blue-green deployment strategy', async () => {
      const config: DeploymentConfiguration = {
        application: {
          name: 'lanka-api',
          type: 'web-service',
          runtime: 'node.js',
          dependencies: ['redis', 'postgresql']
        },
        target: {
          platform: 'kubernetes',
          provider: 'aws',
          region: 'us-east-1'
        },
        requirements: {
          zeroDowntime: true,
          rollbackCapability: true,
          trafficSplitting: false
        }
      };

      const strategy = await service.generateDeploymentStrategy(config, 'blue-green');

      expect(strategy).toEqual({
        type: 'blue-green',
        configuration: expect.objectContaining({
          blueEnvironment: expect.objectContaining({
            namespace: expect.stringContaining('blue'),
            services: expect.any(Array),
            ingress: expect.any(Object)
          }),
          greenEnvironment: expect.objectContaining({
            namespace: expect.stringContaining('green'),
            services: expect.any(Array),
            ingress: expect.any(Object)
          }),
          switchStrategy: expect.objectContaining({
            healthCheck: expect.any(Object),
            validationTests: expect.any(Array),
            switchCommand: expect.any(String)
          })
        }),
        automationSteps: expect.arrayContaining([
          expect.objectContaining({
            step: 'deploy-to-green',
            command: expect.any(String),
            validation: expect.any(Object)
          })
        ]),
        rollbackProcedure: expect.objectContaining({
          trigger: expect.any(String),
          steps: expect.any(Array),
          timeLimit: expect.any(Number)
        })
      });
    });

    it('should generate canary deployment strategy', async () => {
      const config: DeploymentConfiguration = {
        application: {
          name: 'user-service',
          type: 'microservice',
          runtime: 'java',
          dependencies: ['kafka', 'mongodb']
        },
        target: {
          platform: 'kubernetes',
          provider: 'gcp',
          region: 'us-central1'
        },
        requirements: {
          zeroDowntime: true,
          rollbackCapability: true,
          trafficSplitting: true,
          gradualRollout: true
        }
      };

      const strategy = await service.generateDeploymentStrategy(config, 'canary');

      expect(strategy).toEqual({
        type: 'canary',
        configuration: expect.objectContaining({
          canaryWeight: 5, // Start with 5% traffic
          stages: expect.arrayContaining([
            expect.objectContaining({
              weight: 5,
              duration: expect.any(String),
              criteria: expect.any(Object)
            }),
            expect.objectContaining({
              weight: 25,
              duration: expect.any(String),
              criteria: expect.any(Object)
            })
          ]),
          metrics: expect.objectContaining({
            errorRate: expect.any(Number),
            responseTime: expect.any(Number),
            successCriteria: expect.any(Object)
          })
        }),
        automationSteps: expect.arrayContaining([
          expect.objectContaining({
            step: 'deploy-canary',
            trafficWeight: 5
          })
        ]),
        monitoring: expect.objectContaining({
          alerts: expect.any(Array),
          dashboards: expect.any(Array),
          autoRollback: expect.any(Object)
        })
      });
    });

    it('should generate rolling deployment strategy', async () => {
      const config: DeploymentConfiguration = {
        application: {
          name: 'static-website',
          type: 'static-site',
          runtime: 'nginx',
          dependencies: []
        },
        target: {
          platform: 'docker-swarm',
          provider: 'digital-ocean',
          region: 'nyc1'
        },
        requirements: {
          zeroDowntime: false,
          rollbackCapability: true,
          trafficSplitting: false
        }
      };

      const strategy = await service.generateDeploymentStrategy(config, 'rolling');

      expect(strategy.type).toBe('rolling');
      expect(strategy.configuration).toHaveProperty('maxUnavailable');
      expect(strategy.configuration).toHaveProperty('maxSurge');
      expect(strategy.automationSteps).toContainEqual(
        expect.objectContaining({
          step: 'rolling-update'
        })
      );
    });
  });

  describe('generateEnvironmentConfig', () => {
    it('should generate development environment configuration', async () => {
      const environment: Environment = {
        name: 'development',
        type: 'dev',
        requirements: {
          performance: 'basic',
          security: 'basic',
          monitoring: 'basic',
          backup: false
        }
      };

      const config = await service.generateEnvironmentConfig(environment);

      expect(config).toEqual({
        environment: 'development',
        infrastructure: expect.objectContaining({
          compute: expect.objectContaining({
            instances: expect.any(Number),
            size: expect.stringMatching(/small|micro/),
            autoscaling: false
          }),
          database: expect.objectContaining({
            type: expect.stringMatching(/sqlite|postgres/),
            size: expect.stringMatching(/small/),
            backup: false
          }),
          cache: expect.objectContaining({
            enabled: expect.any(Boolean),
            type: expect.any(String)
          })
        }),
        configuration: expect.objectContaining({
          logLevel: 'debug',
          debugging: true,
          hotReload: true,
          ssl: false
        }),
        secrets: expect.objectContaining({
          management: expect.stringMatching(/env-file|local/),
          rotation: false
        })
      });
    });

    it('should generate production environment configuration', async () => {
      const environment: Environment = {
        name: 'production',
        type: 'prod',
        requirements: {
          performance: 'high',
          security: 'high',
          monitoring: 'comprehensive',
          backup: true,
          compliance: ['SOC2', 'GDPR']
        }
      };

      const config = await service.generateEnvironmentConfig(environment);

      expect(config).toEqual({
        environment: 'production',
        infrastructure: expect.objectContaining({
          compute: expect.objectContaining({
            instances: expect.any(Number),
            size: expect.stringMatching(/large|xlarge/),
            autoscaling: true,
            multiAZ: true
          }),
          database: expect.objectContaining({
            type: expect.any(String),
            size: expect.stringMatching(/large|xlarge/),
            backup: true,
            replication: true,
            encryption: true
          }),
          loadBalancer: expect.objectContaining({
            type: 'application',
            ssl: true,
            waf: true
          })
        }),
        configuration: expect.objectContaining({
          logLevel: 'info',
          debugging: false,
          ssl: true,
          hsts: true
        }),
        security: expect.objectContaining({
          networkPolicies: expect.any(Array),
          rbac: expect.any(Object),
          secretScanning: true
        }),
        monitoring: expect.objectContaining({
          metrics: expect.any(Array),
          alerts: expect.any(Array),
          dashboards: expect.any(Array),
          sla: expect.any(Object)
        })
      });
    });
  });

  describe('orchestrateMultiEnvironmentDeployment', () => {
    it('should orchestrate deployment across multiple environments', async () => {
      const environments = ['dev', 'staging', 'production'];
      const deploymentConfig = {
        application: {
          name: 'multi-tier-app',
          version: '2.1.0'
        },
        strategy: 'sequential',
        approvals: {
          staging: 'automatic',
          production: 'manual'
        }
      };

      const orchestration = await service.orchestrateMultiEnvironmentDeployment(
        environments, 
        deploymentConfig
      );

      expect(orchestration).toEqual({
        pipeline: expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              environment: 'dev',
              approval: 'automatic',
              dependencies: [],
              timeout: expect.any(Number)
            }),
            expect.objectContaining({
              environment: 'staging',
              approval: 'automatic',
              dependencies: ['dev'],
              healthChecks: expect.any(Array)
            }),
            expect.objectContaining({
              environment: 'production',
              approval: 'manual',
              dependencies: ['staging'],
              rollbackStrategy: expect.any(Object)
            })
          ])
        }),
        automation: expect.objectContaining({
          triggers: expect.any(Array),
          notifications: expect.any(Array),
          rollbackTriggers: expect.any(Array)
        }),
        validation: expect.objectContaining({
          preDeployment: expect.any(Array),
          postDeployment: expect.any(Array),
          smokeTests: expect.any(Array)
        })
      });
    });
  });

  describe('generateRollbackPlan', () => {
    it('should generate comprehensive rollback plan', async () => {
      const deployment = {
        version: 'v2.1.0',
        previousVersion: 'v2.0.3',
        environment: 'production',
        strategy: 'blue-green'
      };

      const rollbackPlan = await service.generateRollbackPlan(deployment);

      expect(rollbackPlan).toEqual({
        trigger: expect.objectContaining({
          automatic: expect.objectContaining({
            errorThreshold: expect.any(Number),
            timeWindow: expect.any(String)
          }),
          manual: expect.objectContaining({
            command: expect.any(String),
            confirmation: true
          })
        }),
        steps: expect.arrayContaining([
          expect.objectContaining({
            step: 'traffic-redirect',
            description: expect.any(String),
            command: expect.any(String),
            validation: expect.any(String)
          }),
          expect.objectContaining({
            step: 'cleanup',
            description: expect.any(String)
          })
        ]),
        validation: expect.objectContaining({
          healthChecks: expect.any(Array),
          dataConsistency: expect.any(Array),
          performanceChecks: expect.any(Array)
        }),
        communication: expect.objectContaining({
          stakeholders: expect.any(Array),
          templates: expect.any(Object)
        })
      });
    });
  });
});