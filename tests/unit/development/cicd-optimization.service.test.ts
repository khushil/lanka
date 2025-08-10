import { CICDOptimizationService } from '../../../src/modules/development/services/cicd-optimization.service';
import { ArchitectureContext, CICDConfiguration, WorkflowTemplate, PipelineOptimization } from '../../../src/types';

describe('CICDOptimizationService', () => {
  let service: CICDOptimizationService;
  
  beforeEach(() => {
    service = new CICDOptimizationService();
  });

  describe('analyzePipeline', () => {
    it('should analyze existing CI/CD pipeline and identify bottlenecks', async () => {
      const config: CICDConfiguration = {
        platform: 'github-actions',
        currentWorkflow: {
          name: 'CI/CD Pipeline',
          steps: [
            { name: 'checkout', uses: 'actions/checkout@v4' },
            { name: 'setup-node', uses: 'actions/setup-node@v3' },
            { name: 'install', run: 'npm install' },
            { name: 'test', run: 'npm test' },
            { name: 'build', run: 'npm run build' },
            { name: 'deploy', run: 'npm run deploy' }
          ],
          triggers: ['push', 'pull_request']
        },
        metrics: {
          averageBuildTime: 450, // seconds
          successRate: 0.85,
          failureReasons: ['test failures', 'timeout', 'dependency issues']
        }
      };

      const analysis = await service.analyzePipeline(config);

      expect(analysis).toEqual({
        bottlenecks: expect.arrayContaining([
          expect.objectContaining({
            step: 'install',
            issue: 'dependency resolution time',
            impact: 'high',
            suggestedFix: expect.stringContaining('cache')
          })
        ]),
        optimizationOpportunities: expect.arrayContaining([
          expect.objectContaining({
            type: 'parallelization',
            description: expect.stringContaining('parallel')
          })
        ]),
        estimatedImprovement: expect.objectContaining({
          timeReduction: expect.any(Number),
          reliabilityIncrease: expect.any(Number)
        })
      });
    });

    it('should handle different CI/CD platforms', async () => {
      const platforms = ['github-actions', 'jenkins', 'gitlab-ci', 'circleci'];
      
      for (const platform of platforms) {
        const config: CICDConfiguration = {
          platform: platform as any,
          currentWorkflow: { name: 'test', steps: [], triggers: [] },
          metrics: { averageBuildTime: 300, successRate: 0.9, failureReasons: [] }
        };

        const analysis = await service.analyzePipeline(config);
        expect(analysis.platform).toBe(platform);
      }
    });
  });

  describe('generateOptimizedWorkflow', () => {
    it('should generate GitHub Actions workflow with optimizations', async () => {
      const context: ArchitectureContext = {
        project: {
          name: 'lanka-project',
          type: 'web-application',
          technologies: ['typescript', 'react', 'node.js'],
          architecture: 'microservices'
        },
        requirements: {
          performance: { buildTime: '<5min', testCoverage: '>80%' },
          deployment: { strategy: 'blue-green', environments: ['dev', 'staging', 'prod'] },
          monitoring: { enabled: true, alerting: true }
        }
      };

      const workflow = await service.generateOptimizedWorkflow(context, 'github-actions');

      expect(workflow).toEqual({
        platform: 'github-actions',
        name: 'Optimized CI/CD Pipeline',
        content: expect.stringContaining('name: Optimized CI/CD Pipeline'),
        features: expect.arrayContaining([
          'dependency-caching',
          'parallel-jobs',
          'matrix-strategy',
          'conditional-deployment'
        ]),
        estimatedBuildTime: expect.any(Number),
        securityFeatures: expect.arrayContaining([
          'secret-scanning',
          'dependency-check'
        ])
      });

      // Verify YAML structure
      expect(workflow.content).toMatch(/on:\s*\n\s*push:/);
      expect(workflow.content).toMatch(/jobs:\s*\n\s*test:/);
      expect(workflow.content).toMatch(/- name: Cache dependencies/);
    });

    it('should generate Jenkins pipeline with Groovy syntax', async () => {
      const context: ArchitectureContext = {
        project: {
          name: 'java-microservice',
          type: 'backend-service',
          technologies: ['java', 'spring-boot', 'maven'],
          architecture: 'microservices'
        },
        requirements: {
          performance: { buildTime: '<10min' },
          deployment: { strategy: 'rolling', environments: ['staging', 'prod'] }
        }
      };

      const workflow = await service.generateOptimizedWorkflow(context, 'jenkins');

      expect(workflow.platform).toBe('jenkins');
      expect(workflow.content).toMatch(/pipeline\s*\{/);
      expect(workflow.content).toMatch(/agent\s+any/);
      expect(workflow.content).toMatch(/stage\('Build'\)/);
      expect(workflow.content).toMatch(/maven/);
    });
  });

  describe('optimizePipeline', () => {
    it('should provide comprehensive pipeline optimization', async () => {
      const currentConfig: CICDConfiguration = {
        platform: 'github-actions',
        currentWorkflow: {
          name: 'Basic CI',
          steps: [{ name: 'test', run: 'npm test' }],
          triggers: ['push']
        },
        metrics: { averageBuildTime: 600, successRate: 0.7, failureReasons: ['timeout'] }
      };

      const optimization = await service.optimizePipeline(currentConfig);

      expect(optimization).toEqual({
        originalMetrics: currentConfig.metrics,
        optimizedWorkflow: expect.objectContaining({
          platform: 'github-actions',
          content: expect.stringContaining('timeout-minutes')
        }),
        improvements: expect.arrayContaining([
          expect.objectContaining({
            category: 'performance',
            description: expect.any(String),
            impact: expect.stringMatching(/high|medium|low/)
          })
        ]),
        projectedMetrics: expect.objectContaining({
          averageBuildTime: expect.any(Number),
          successRate: expect.any(Number)
        }),
        implementation: expect.objectContaining({
          steps: expect.any(Array),
          risks: expect.any(Array),
          rollbackPlan: expect.any(String)
        })
      });

      expect(optimization.projectedMetrics.averageBuildTime).toBeLessThan(currentConfig.metrics.averageBuildTime);
      expect(optimization.projectedMetrics.successRate).toBeGreaterThan(currentConfig.metrics.successRate);
    });
  });

  describe('generateSecurityChecks', () => {
    it('should generate comprehensive security checks for CI/CD pipeline', async () => {
      const securityConfig = {
        scanTypes: ['dependency-vulnerabilities', 'code-quality', 'container-security'],
        compliance: ['SOC2', 'GDPR'],
        secretManagement: true
      };

      const checks = await service.generateSecurityChecks(securityConfig);

      expect(checks).toEqual({
        dependencyScanning: expect.objectContaining({
          tool: expect.stringMatching(/snyk|dependabot|audit/),
          configuration: expect.any(Object)
        }),
        codeQuality: expect.objectContaining({
          staticAnalysis: expect.any(Object),
          linting: expect.any(Object)
        }),
        containerSecurity: expect.objectContaining({
          imageScan: expect.any(Object),
          runtimeSecurity: expect.any(Object)
        }),
        secretScanning: expect.objectContaining({
          preCommit: expect.any(Boolean),
          cicdIntegration: expect.any(Boolean)
        }),
        complianceChecks: expect.arrayContaining([
          expect.objectContaining({
            standard: expect.stringMatching(/SOC2|GDPR/),
            checks: expect.any(Array)
          })
        ])
      });
    });
  });
});