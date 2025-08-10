import { Injectable, Logger } from '@nestjs/common';
import { DecisionService } from '../modules/architecture/services/decision.service';
import { PatternService } from '../modules/architecture/services/pattern.service';
import { TechnologyStackService } from '../modules/architecture/services/technology-stack.service';

/**
 * Service for integrating Architecture Intelligence with Development Intelligence
 * Uses architecture decisions and patterns to guide code generation and development practices
 */
@Injectable()
export class ArchitectureDevelopmentIntegrationService {
  private readonly logger = new Logger(ArchitectureDevelopmentIntegrationService.name);

  constructor(
    private readonly decisionService: DecisionService,
    private readonly patternService: PatternService,
    private readonly technologyStackService: TechnologyStackService,
  ) {}

  /**
   * Apply architectural decisions to development specifications
   */
  async applyArchitecturalDecisionsToDevelopment(
    projectId: string,
    developmentSpec: DevelopmentSpec
  ): Promise<ArchitecturallyGuidedSpec> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(
        developmentSpec.functionalSpecs.map(spec => spec.type)
      );
      const techStack = await this.technologyStackService.getTechnologyStack(projectId);

      return {
        ...developmentSpec,
        architecturalGuidance: {
          applicableDecisions: this.filterRelevantDecisions(decisions, developmentSpec),
          recommendedPatterns: patterns,
          technologyConstraints: this.extractTechnologyConstraints(techStack),
          structuralGuidelines: this.generateStructuralGuidelines(decisions, patterns),
          qualityAttributes: this.identifyQualityAttributes(decisions),
          integrationPoints: this.identifyIntegrationPoints(decisions, developmentSpec),
        },
        enhancedCodePatterns: this.enhanceCodePatternsWithArchitecture(
          developmentSpec.codePatterns,
          patterns
        ),
        architecturalConstraints: this.generateArchitecturalConstraints(decisions),
        implementationGuidelines: this.generateImplementationGuidelines(decisions, patterns, techStack),
      };
    } catch (error) {
      this.logger.error('Failed to apply architectural decisions to development spec', error);
      throw new ArchitectureDevelopmentIntegrationError(
        `Failed to apply architectural guidance: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate code structure based on architectural patterns
   */
  async generateCodeStructureFromArchitecture(
    projectId: string,
    developmentSpec: DevelopmentSpec
  ): Promise<CodeStructure> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(['layered', 'hexagonal', 'microservices']);
      const techStack = await this.technologyStackService.getTechnologyStack(projectId);

      const primaryPattern = this.selectPrimaryArchitecturalPattern(decisions, patterns);
      
      return {
        id: `structure-${developmentSpec.id}`,
        projectId,
        pattern: primaryPattern,
        layers: this.generateLayers(primaryPattern, developmentSpec),
        modules: this.generateModules(developmentSpec, primaryPattern),
        components: this.generateComponents(developmentSpec, patterns),
        interfaces: this.generateInterfaces(developmentSpec, decisions),
        directories: this.generateDirectoryStructure(primaryPattern, developmentSpec),
        dependencies: this.generateDependencyStructure(decisions, techStack),
        conventions: this.generateNamingConventions(decisions, techStack),
      };
    } catch (error) {
      this.logger.error('Failed to generate code structure from architecture', error);
      throw error;
    }
  }

  /**
   * Validate development implementation against architectural decisions
   */
  async validateImplementationAgainstArchitecture(
    projectId: string,
    implementationDetails: ImplementationDetails
  ): Promise<ArchitecturalValidationResult> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(['all']);
      const techStack = await this.technologyStackService.getTechnologyStack(projectId);

      const validationChecks: ArchitecturalValidationCheck[] = [];

      // Validate architectural decisions compliance
      validationChecks.push(...await this.validateDecisionCompliance(decisions, implementationDetails));

      // Validate pattern implementation
      validationChecks.push(...await this.validatePatternImplementation(patterns, implementationDetails));

      // Validate technology stack usage
      validationChecks.push(...await this.validateTechnologyStackUsage(techStack, implementationDetails));

      // Validate layering and boundaries
      validationChecks.push(...await this.validateArchitecturalBoundaries(decisions, implementationDetails));

      // Validate quality attributes
      validationChecks.push(...await this.validateQualityAttributes(decisions, implementationDetails));

      const passedChecks = validationChecks.filter(check => check.passed).length;
      const totalChecks = validationChecks.length;
      const compliancePercentage = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

      return {
        projectId,
        implementationId: implementationDetails.id,
        validationChecks,
        overallCompliance: compliancePercentage >= 90 ? 'compliant' : 
                          compliancePercentage >= 70 ? 'partially_compliant' : 'non_compliant',
        compliancePercentage,
        architecturalDebt: this.calculateArchitecturalDebt(validationChecks),
        recommendations: this.generateArchitecturalRecommendations(validationChecks, decisions),
        validatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to validate implementation against architecture', error);
      throw error;
    }
  }

  /**
   * Generate development guidelines from architectural decisions
   */
  async generateDevelopmentGuidelines(projectId: string): Promise<DevelopmentGuidelines> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(['all']);
      const techStack = await this.technologyStackService.getTechnologyStack(projectId);

      return {
        projectId,
        codingStandards: this.generateCodingStandards(decisions, techStack),
        architecturalPrinciples: this.extractArchitecturalPrinciples(decisions),
        designPatterns: this.mapPatternsToGuidelines(patterns),
        technologyGuidelines: this.generateTechnologyGuidelines(techStack),
        qualityGates: this.generateQualityGates(decisions),
        reviewChecklist: this.generateReviewChecklist(decisions, patterns),
        bestPractices: this.generateBestPractices(decisions, patterns, techStack),
        antiPatterns: this.identifyAntiPatterns(patterns),
        performanceGuidelines: this.generatePerformanceGuidelines(decisions),
        securityGuidelines: this.generateSecurityGuidelines(decisions),
      };
    } catch (error) {
      this.logger.error('Failed to generate development guidelines', error);
      throw error;
    }
  }

  /**
   * Suggest architectural improvements for development
   */
  async suggestArchitecturalImprovements(
    projectId: string,
    implementationMetrics: ImplementationMetrics
  ): Promise<ArchitecturalImprovement[]> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(['all']);
      const improvements: ArchitecturalImprovement[] = [];

      // Analyze code quality metrics
      if (implementationMetrics.codeQuality < 70) {
        improvements.push({
          id: `improvement-quality-${projectId}`,
          type: 'code_quality',
          priority: 'high',
          description: 'Improve code quality by applying SOLID principles and design patterns',
          impact: 'Reduces technical debt and improves maintainability',
          effort: 'medium',
          relatedDecisions: decisions.filter(d => d.category === 'design').map(d => d.id),
          recommendedPatterns: ['Factory', 'Strategy', 'Observer'],
          implementationSteps: [
            'Refactor large classes into smaller, focused ones',
            'Apply dependency injection pattern',
            'Implement proper error handling',
            'Add comprehensive unit tests',
          ],
        });
      }

      // Analyze performance metrics
      if (implementationMetrics.performance?.responseTime > 500) {
        improvements.push({
          id: `improvement-performance-${projectId}`,
          type: 'performance',
          priority: 'medium',
          description: 'Optimize performance through caching and async patterns',
          impact: 'Improves user experience and system scalability',
          effort: 'medium',
          relatedDecisions: decisions.filter(d => d.category === 'performance').map(d => d.id),
          recommendedPatterns: ['Cache-Aside', 'Circuit Breaker', 'Bulkhead'],
          implementationSteps: [
            'Implement caching strategy',
            'Optimize database queries',
            'Add async processing for heavy operations',
            'Implement connection pooling',
          ],
        });
      }

      // Analyze test coverage
      if (implementationMetrics.testCoverage < 80) {
        improvements.push({
          id: `improvement-testing-${projectId}`,
          type: 'testing',
          priority: 'high',
          description: 'Improve test coverage and testing architecture',
          impact: 'Increases confidence in deployments and reduces bugs',
          effort: 'high',
          relatedDecisions: decisions.filter(d => d.category === 'testing').map(d => d.id),
          recommendedPatterns: ['Test Double', 'Page Object', 'Builder'],
          implementationSteps: [
            'Add unit tests for all service methods',
            'Implement integration tests',
            'Add end-to-end test scenarios',
            'Set up test data builders',
          ],
        });
      }

      return improvements;
    } catch (error) {
      this.logger.error('Failed to suggest architectural improvements', error);
      throw error;
    }
  }

  /**
   * Create architecture-driven development tasks
   */
  async createArchitectureDrivenTasks(
    projectId: string,
    developmentSpec: DevelopmentSpec
  ): Promise<ArchitecturalTask[]> {
    try {
      const decisions = await this.decisionService.getDecisionsForProject(projectId);
      const patterns = await this.patternService.getRecommendedPatterns(['all']);
      const tasks: ArchitecturalTask[] = [];

      // Architecture review task
      tasks.push({
        id: `arch-review-${developmentSpec.id}`,
        title: 'Architecture Review and Alignment',
        description: 'Review development spec against architectural decisions',
        type: 'architecture_review',
        priority: 'high',
        estimatedHours: 2,
        dependencies: [],
        requiredSkills: ['solution_architect'],
        relatedDecisions: decisions.map(d => d.id),
        deliverables: [
          'Architecture compliance assessment',
          'Pattern application recommendations',
          'Technology alignment verification',
        ],
      });

      // Pattern implementation tasks
      for (const pattern of patterns) {
        if (this.isPatternApplicable(pattern, developmentSpec)) {
          tasks.push({
            id: `pattern-impl-${pattern.id}`,
            title: `Implement ${pattern.name} Pattern`,
            description: `Apply ${pattern.name} pattern to the development specification`,
            type: 'pattern_implementation',
            priority: 'medium',
            estimatedHours: this.estimatePatternImplementationHours(pattern),
            dependencies: [`arch-review-${developmentSpec.id}`],
            requiredSkills: ['senior_developer', 'architect'],
            relatedDecisions: decisions.filter(d => d.alternatives.some(alt => 
              alt.description.toLowerCase().includes(pattern.name.toLowerCase())
            )).map(d => d.id),
            deliverables: [
              `${pattern.name} pattern implementation`,
              'Code examples and templates',
              'Documentation updates',
            ],
          });
        }
      }

      // Quality attribute implementation tasks
      const qualityAttributes = this.identifyQualityAttributes(decisions);
      for (const qa of qualityAttributes) {
        tasks.push({
          id: `qa-impl-${qa.name}`,
          title: `Implement ${qa.name} Quality Attribute`,
          description: `Ensure ${qa.name} requirements are met in implementation`,
          type: 'quality_attribute',
          priority: qa.priority,
          estimatedHours: this.estimateQualityAttributeHours(qa),
          dependencies: [`arch-review-${developmentSpec.id}`],
          requiredSkills: ['senior_developer', qa.requiredSkill],
          relatedDecisions: qa.relatedDecisions,
          deliverables: [
            `${qa.name} implementation`,
            'Performance/quality metrics',
            'Validation tests',
          ],
        });
      }

      return tasks;
    } catch (error) {
      this.logger.error('Failed to create architecture-driven tasks', error);
      throw error;
    }
  }

  private filterRelevantDecisions(decisions: any[], developmentSpec: DevelopmentSpec): any[] {
    return decisions.filter(decision => {
      const specText = `${developmentSpec.title} ${developmentSpec.description}`.toLowerCase();
      return decision.context.toLowerCase().includes(specText.substring(0, 50)) ||
             decision.alternatives.some((alt: any) => 
               specText.includes(alt.name.toLowerCase())
             );
    });
  }

  private extractTechnologyConstraints(techStack: any): TechnologyConstraint[] {
    return techStack?.technologies?.map((tech: any) => ({
      technology: tech.name,
      version: tech.version,
      constraints: tech.constraints || [],
      rationale: tech.rationale,
    })) || [];
  }

  private generateStructuralGuidelines(decisions: any[], patterns: any[]): StructuralGuideline[] {
    const guidelines: StructuralGuideline[] = [];

    // Extract guidelines from decisions
    decisions.forEach(decision => {
      if (decision.category === 'structural') {
        guidelines.push({
          id: `guideline-${decision.id}`,
          category: 'layering',
          rule: decision.decision,
          rationale: decision.rationale,
          examples: decision.alternatives.map((alt: any) => alt.description),
        });
      }
    });

    // Extract guidelines from patterns
    patterns.forEach((pattern: any) => {
      guidelines.push({
        id: `guideline-pattern-${pattern.id}`,
        category: 'pattern',
        rule: `Apply ${pattern.name} pattern when ${pattern.applicability}`,
        rationale: pattern.benefits.join(', '),
        examples: pattern.examples || [],
      });
    });

    return guidelines;
  }

  private identifyQualityAttributes(decisions: any[]): QualityAttribute[] {
    const qaMap = new Map<string, QualityAttribute>();

    decisions.forEach(decision => {
      if (decision.consequences) {
        const qaKeywords = ['performance', 'scalability', 'security', 'maintainability', 'reliability', 'availability'];
        qaKeywords.forEach(qa => {
          if (decision.consequences.toLowerCase().includes(qa)) {
            qaMap.set(qa, {
              name: qa,
              priority: 'medium',
              metrics: this.getDefaultMetrics(qa),
              requiredSkill: this.getRequiredSkillForQA(qa),
              relatedDecisions: [decision.id],
            });
          }
        });
      }
    });

    return Array.from(qaMap.values());
  }

  private identifyIntegrationPoints(decisions: any[], developmentSpec: DevelopmentSpec): IntegrationPoint[] {
    const integrationPoints: IntegrationPoint[] = [];

    decisions.forEach(decision => {
      if (decision.category === 'integration' || decision.context.includes('integration')) {
        integrationPoints.push({
          id: `integration-${decision.id}`,
          type: this.determineIntegrationType(decision),
          description: decision.context,
          requirements: decision.alternatives.map((alt: any) => alt.name),
          constraints: this.extractIntegrationConstraints(decision),
        });
      }
    });

    return integrationPoints;
  }

  private enhanceCodePatternsWithArchitecture(
    existingPatterns: string[],
    architecturalPatterns: any[]
  ): string[] {
    const enhancedPatterns = [...existingPatterns];
    
    architecturalPatterns.forEach(pattern => {
      if (!enhancedPatterns.includes(pattern.name)) {
        enhancedPatterns.push(pattern.name);
      }
    });

    return enhancedPatterns;
  }

  private generateArchitecturalConstraints(decisions: any[]): ArchitecturalConstraint[] {
    return decisions
      .filter(decision => decision.constraints && decision.constraints.length > 0)
      .map(decision => ({
        id: `constraint-${decision.id}`,
        type: decision.category,
        constraint: decision.constraints.join('; '),
        rationale: decision.rationale,
        impact: 'medium',
        enforcement: 'automated',
      }));
  }

  private generateImplementationGuidelines(
    decisions: any[],
    patterns: any[],
    techStack: any
  ): ImplementationGuideline[] {
    const guidelines: ImplementationGuideline[] = [];

    // Guidelines from decisions
    decisions.forEach(decision => {
      guidelines.push({
        id: `impl-guideline-${decision.id}`,
        category: decision.category,
        guideline: `Implement ${decision.decision} as decided`,
        rationale: decision.rationale,
        codeExamples: [], // Would be populated with actual examples
        checkpoints: [`Verify ${decision.decision} is correctly implemented`],
      });
    });

    // Guidelines from patterns
    patterns.forEach((pattern: any) => {
      guidelines.push({
        id: `impl-guideline-pattern-${pattern.id}`,
        category: 'pattern',
        guideline: `Follow ${pattern.name} pattern structure`,
        rationale: pattern.benefits.join(', '),
        codeExamples: pattern.examples || [],
        checkpoints: [`Pattern structure is correctly implemented`, `Pattern benefits are achieved`],
      });
    });

    return guidelines;
  }

  private selectPrimaryArchitecturalPattern(decisions: any[], patterns: any[]): string {
    // Simple selection logic - would be more sophisticated in practice
    const patternMentions = new Map<string, number>();

    decisions.forEach(decision => {
      patterns.forEach((pattern: any) => {
        if (decision.decision.toLowerCase().includes(pattern.name.toLowerCase())) {
          patternMentions.set(pattern.name, (patternMentions.get(pattern.name) || 0) + 1);
        }
      });
    });

    if (patternMentions.size === 0) {
      return 'layered'; // Default pattern
    }

    return Array.from(patternMentions.entries())
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private generateLayers(pattern: string, developmentSpec: DevelopmentSpec): Layer[] {
    const layerTemplates = {
      layered: ['Presentation', 'Business', 'Data', 'Infrastructure'],
      hexagonal: ['Application', 'Domain', 'Infrastructure'],
      microservices: ['API Gateway', 'Service', 'Data'],
      default: ['Controller', 'Service', 'Repository'],
    };

    const layerNames = layerTemplates[pattern as keyof typeof layerTemplates] || layerTemplates.default;
    
    return layerNames.map((name, index) => ({
      id: `layer-${name.toLowerCase()}`,
      name,
      order: index,
      responsibilities: this.getLayerResponsibilities(name),
      dependencies: index < layerNames.length - 1 ? [`layer-${layerNames[index + 1].toLowerCase()}`] : [],
    }));
  }

  private generateModules(developmentSpec: DevelopmentSpec, pattern: string): Module[] {
    return developmentSpec.functionalSpecs.map(spec => ({
      id: `module-${spec.id}`,
      name: spec.name,
      responsibilities: [spec.description],
      interfaces: [`I${spec.name}Service`],
      dependencies: spec.type === 'api' ? ['module-service', 'module-data'] : [],
    }));
  }

  private generateComponents(developmentSpec: DevelopmentSpec, patterns: any[]): Component[] {
    const components: Component[] = [];

    developmentSpec.functionalSpecs.forEach(spec => {
      components.push({
        id: `component-${spec.id}`,
        name: `${spec.name}Component`,
        type: spec.type,
        responsibilities: [spec.description],
        interfaces: [`I${spec.name}`],
        patterns: patterns.filter(p => this.isPatternApplicableToSpec(p, spec)).map(p => p.name),
      });
    });

    return components;
  }

  private generateInterfaces(developmentSpec: DevelopmentSpec, decisions: any[]): Interface[] {
    return developmentSpec.functionalSpecs.map(spec => ({
      id: `interface-${spec.id}`,
      name: `I${spec.name}`,
      methods: spec.inputs.concat(spec.outputs).map(io => ({
        name: `handle${io}`,
        parameters: [io],
        returnType: 'Promise<void>',
      })),
      contracts: [`Must handle ${spec.description}`],
    }));
  }

  private generateDirectoryStructure(pattern: string, developmentSpec: DevelopmentSpec): Directory[] {
    const structures = {
      layered: [
        { path: 'src/presentation', purpose: 'Controllers and DTOs' },
        { path: 'src/business', purpose: 'Business logic and services' },
        { path: 'src/data', purpose: 'Data access and repositories' },
        { path: 'src/infrastructure', purpose: 'External concerns' },
      ],
      hexagonal: [
        { path: 'src/application', purpose: 'Application services and use cases' },
        { path: 'src/domain', purpose: 'Domain entities and business rules' },
        { path: 'src/infrastructure', purpose: 'Adapters and external integrations' },
      ],
      default: [
        { path: 'src/controllers', purpose: 'HTTP controllers' },
        { path: 'src/services', purpose: 'Business services' },
        { path: 'src/repositories', purpose: 'Data repositories' },
        { path: 'src/models', purpose: 'Data models' },
      ],
    };

    return structures[pattern as keyof typeof structures] || structures.default;
  }

  private generateDependencyStructure(decisions: any[], techStack: any): DependencyRule[] {
    const rules: DependencyRule[] = [
      {
        id: 'no-circular-dependencies',
        rule: 'Circular dependencies are not allowed',
        enforcement: 'build-time',
      },
      {
        id: 'layer-dependencies',
        rule: 'Dependencies should flow in one direction through layers',
        enforcement: 'static-analysis',
      },
    ];

    // Add technology-specific rules
    if (techStack?.technologies) {
      techStack.technologies.forEach((tech: any) => {
        if (tech.constraints) {
          rules.push({
            id: `tech-constraint-${tech.name}`,
            rule: `${tech.name}: ${tech.constraints.join(', ')}`,
            enforcement: 'runtime',
          });
        }
      });
    }

    return rules;
  }

  private generateNamingConventions(decisions: any[], techStack: any): NamingConvention[] {
    return [
      {
        id: 'class-naming',
        pattern: 'PascalCase',
        applies_to: 'classes',
        example: 'UserService',
      },
      {
        id: 'method-naming',
        pattern: 'camelCase',
        applies_to: 'methods',
        example: 'getUserById',
      },
      {
        id: 'interface-naming',
        pattern: 'PascalCase with I prefix',
        applies_to: 'interfaces',
        example: 'IUserService',
      },
    ];
  }

  private async validateDecisionCompliance(
    decisions: any[],
    implementation: ImplementationDetails
  ): Promise<ArchitecturalValidationCheck[]> {
    return decisions.map(decision => ({
      id: `decision-compliance-${decision.id}`,
      type: 'architectural_decision',
      description: `Validate compliance with decision: ${decision.decision}`,
      passed: true, // Would be actual validation logic
      details: `Decision ${decision.decision} is properly implemented`,
      severity: 'error',
      relatedDecision: decision.id,
    }));
  }

  private async validatePatternImplementation(
    patterns: any[],
    implementation: ImplementationDetails
  ): Promise<ArchitecturalValidationCheck[]> {
    return patterns.map(pattern => ({
      id: `pattern-validation-${pattern.id}`,
      type: 'design_pattern',
      description: `Validate ${pattern.name} pattern implementation`,
      passed: true, // Would be actual validation logic
      details: `${pattern.name} pattern is correctly implemented`,
      severity: 'warning',
      relatedPattern: pattern.id,
    }));
  }

  private async validateTechnologyStackUsage(
    techStack: any,
    implementation: ImplementationDetails
  ): Promise<ArchitecturalValidationCheck[]> {
    if (!techStack?.technologies) return [];

    return techStack.technologies.map((tech: any, index: number) => ({
      id: `tech-validation-${index}`,
      type: 'technology_usage',
      description: `Validate ${tech.name} usage`,
      passed: true, // Would be actual validation logic
      details: `${tech.name} is used according to constraints`,
      severity: 'error',
      relatedTechnology: tech.name,
    }));
  }

  private async validateArchitecturalBoundaries(
    decisions: any[],
    implementation: ImplementationDetails
  ): Promise<ArchitecturalValidationCheck[]> {
    return [{
      id: 'boundary-validation',
      type: 'architectural_boundary',
      description: 'Validate architectural boundaries are maintained',
      passed: true, // Would be actual validation logic
      details: 'Architectural boundaries are properly maintained',
      severity: 'error',
    }];
  }

  private async validateQualityAttributes(
    decisions: any[],
    implementation: ImplementationDetails
  ): Promise<ArchitecturalValidationCheck[]> {
    const qualityAttributes = this.identifyQualityAttributes(decisions);
    
    return qualityAttributes.map(qa => ({
      id: `qa-validation-${qa.name}`,
      type: 'quality_attribute',
      description: `Validate ${qa.name} quality attribute`,
      passed: implementation.metrics[qa.name] >= (qa.metrics.threshold || 70),
      details: `${qa.name} metric: ${implementation.metrics[qa.name] || 'not measured'}`,
      severity: qa.priority === 'high' ? 'error' : 'warning',
    }));
  }

  private calculateArchitecturalDebt(validationChecks: ArchitecturalValidationCheck[]): ArchitecturalDebt {
    const failedChecks = validationChecks.filter(check => !check.passed);
    const errorCount = failedChecks.filter(check => check.severity === 'error').length;
    const warningCount = failedChecks.filter(check => check.severity === 'warning').length;

    const debtScore = (errorCount * 3) + (warningCount * 1);
    
    return {
      score: debtScore,
      level: debtScore === 0 ? 'low' : debtScore < 5 ? 'medium' : 'high',
      categories: {
        decisions: failedChecks.filter(c => c.type === 'architectural_decision').length,
        patterns: failedChecks.filter(c => c.type === 'design_pattern').length,
        quality: failedChecks.filter(c => c.type === 'quality_attribute').length,
        boundaries: failedChecks.filter(c => c.type === 'architectural_boundary').length,
      },
      priorityActions: this.identifyPriorityDebtActions(failedChecks),
    };
  }

  private generateArchitecturalRecommendations(
    validationChecks: ArchitecturalValidationCheck[],
    decisions: any[]
  ): string[] {
    const failedChecks = validationChecks.filter(check => !check.passed);
    return failedChecks.map(check => 
      `Address ${check.type} issue: ${check.description}`
    );
  }

  private generateCodingStandards(decisions: any[], techStack: any): CodingStandard[] {
    return [
      {
        id: 'naming-conventions',
        category: 'naming',
        standard: 'Use meaningful and descriptive names',
        enforcement: 'linter',
        examples: ['getUserById() not getUser()', 'UserService not US'],
      },
      {
        id: 'error-handling',
        category: 'error_handling',
        standard: 'All errors must be properly handled and logged',
        enforcement: 'code_review',
        examples: ['try-catch blocks', 'proper error types', 'error logging'],
      },
    ];
  }

  private extractArchitecturalPrinciples(decisions: any[]): string[] {
    const principles = new Set<string>();
    
    decisions.forEach(decision => {
      if (decision.principles) {
        decision.principles.forEach((principle: string) => principles.add(principle));
      }
    });

    // Add common architectural principles
    principles.add('Single Responsibility Principle');
    principles.add('Separation of Concerns');
    principles.add('Dependency Inversion');
    principles.add('Interface Segregation');

    return Array.from(principles);
  }

  private mapPatternsToGuidelines(patterns: any[]): PatternGuideline[] {
    return patterns.map(pattern => ({
      patternName: pattern.name,
      whenToUse: pattern.applicability,
      implementation: pattern.structure || 'Follow standard implementation',
      benefits: pattern.benefits,
      drawbacks: pattern.drawbacks || [],
      examples: pattern.examples || [],
    }));
  }

  private generateTechnologyGuidelines(techStack: any): TechnologyGuideline[] {
    if (!techStack?.technologies) return [];

    return techStack.technologies.map((tech: any) => ({
      technology: tech.name,
      version: tech.version,
      guidelines: tech.guidelines || [],
      bestPractices: tech.bestPractices || [],
      commonPitfalls: tech.commonPitfalls || [],
    }));
  }

  private generateQualityGates(decisions: any[]): QualityGate[] {
    return [
      {
        id: 'code-quality-gate',
        name: 'Code Quality',
        criteria: [
          { metric: 'code_coverage', threshold: 80, operator: '>=' },
          { metric: 'cyclomatic_complexity', threshold: 10, operator: '<=' },
          { metric: 'code_duplication', threshold: 3, operator: '<=' },
        ],
        enforcement: 'build',
      },
      {
        id: 'architecture-compliance-gate',
        name: 'Architecture Compliance',
        criteria: [
          { metric: 'architectural_violations', threshold: 0, operator: '=' },
          { metric: 'pattern_compliance', threshold: 90, operator: '>=' },
        ],
        enforcement: 'pre_merge',
      },
    ];
  }

  private generateReviewChecklist(decisions: any[], patterns: any[]): ReviewChecklistItem[] {
    const checklist: ReviewChecklistItem[] = [
      {
        id: 'architectural-alignment',
        category: 'architecture',
        item: 'Implementation aligns with architectural decisions',
        description: 'Verify that the implementation follows approved architectural decisions',
        mandatory: true,
      },
      {
        id: 'pattern-usage',
        category: 'patterns',
        item: 'Design patterns are correctly applied',
        description: 'Check that design patterns are used appropriately and implemented correctly',
        mandatory: false,
      },
    ];

    // Add specific checks for each decision
    decisions.forEach(decision => {
      checklist.push({
        id: `decision-check-${decision.id}`,
        category: 'decision',
        item: `Implementation follows decision: ${decision.decision}`,
        description: decision.rationale,
        mandatory: true,
      });
    });

    return checklist;
  }

  private generateBestPractices(decisions: any[], patterns: any[], techStack: any): BestPractice[] {
    return [
      {
        id: 'separation-of-concerns',
        category: 'design',
        practice: 'Maintain clear separation of concerns',
        rationale: 'Improves maintainability and testability',
        examples: ['Controllers handle HTTP concerns only', 'Services contain business logic'],
      },
      {
        id: 'dependency-injection',
        category: 'design',
        practice: 'Use dependency injection for loose coupling',
        rationale: 'Enables easier testing and flexibility',
        examples: ['Constructor injection', 'Interface-based dependencies'],
      },
    ];
  }

  private identifyAntiPatterns(patterns: any[]): AntiPattern[] {
    return [
      {
        id: 'god-class',
        name: 'God Class',
        description: 'Classes that do too many things',
        problems: ['Hard to maintain', 'Violates SRP', 'Difficult to test'],
        solution: 'Break down into smaller, focused classes',
      },
      {
        id: 'anemic-domain-model',
        name: 'Anemic Domain Model',
        description: 'Domain objects with no behavior, only data',
        problems: ['Business logic scattered', 'Poor encapsulation'],
        solution: 'Move behavior into domain objects',
      },
    ];
  }

  private generatePerformanceGuidelines(decisions: any[]): PerformanceGuideline[] {
    return [
      {
        id: 'database-optimization',
        category: 'database',
        guideline: 'Optimize database queries and use appropriate indexing',
        metrics: ['Query execution time < 100ms', 'Database CPU < 70%'],
        tools: ['Database profiler', 'Query analyzer'],
      },
      {
        id: 'caching-strategy',
        category: 'caching',
        guideline: 'Implement caching for frequently accessed data',
        metrics: ['Cache hit rate > 80%', 'Response time improvement > 50%'],
        tools: ['Redis', 'Application cache'],
      },
    ];
  }

  private generateSecurityGuidelines(decisions: any[]): SecurityGuideline[] {
    return [
      {
        id: 'input-validation',
        category: 'validation',
        guideline: 'Validate and sanitize all inputs',
        threats: ['SQL injection', 'XSS', 'Command injection'],
        controls: ['Parameter validation', 'Input sanitization', 'Type checking'],
      },
      {
        id: 'authentication',
        category: 'authentication',
        guideline: 'Implement proper authentication and authorization',
        threats: ['Unauthorized access', 'Privilege escalation'],
        controls: ['JWT tokens', 'Role-based access', 'Session management'],
      },
    ];
  }

  // Helper methods
  private getDefaultMetrics(qa: string): Record<string, number> {
    const defaults = {
      performance: { threshold: 80, target: 95 },
      scalability: { threshold: 70, target: 90 },
      security: { threshold: 95, target: 99 },
      maintainability: { threshold: 70, target: 85 },
      reliability: { threshold: 99, target: 99.9 },
      availability: { threshold: 99, target: 99.9 },
    };
    return defaults[qa as keyof typeof defaults] || { threshold: 70, target: 90 };
  }

  private getRequiredSkillForQA(qa: string): string {
    const skills = {
      performance: 'performance_engineer',
      scalability: 'system_architect',
      security: 'security_engineer',
      maintainability: 'senior_developer',
      reliability: 'site_reliability_engineer',
      availability: 'devops_engineer',
    };
    return skills[qa as keyof typeof skills] || 'senior_developer';
  }

  private determineIntegrationType(decision: any): string {
    if (decision.context.toLowerCase().includes('api')) return 'api';
    if (decision.context.toLowerCase().includes('database')) return 'database';
    if (decision.context.toLowerCase().includes('service')) return 'service';
    return 'system';
  }

  private extractIntegrationConstraints(decision: any): string[] {
    return decision.constraints || [];
  }

  private getLayerResponsibilities(layerName: string): string[] {
    const responsibilities = {
      'Presentation': ['Handle HTTP requests', 'Data validation', 'Response formatting'],
      'Business': ['Business logic', 'Use cases', 'Domain rules'],
      'Data': ['Data access', 'Persistence', 'Queries'],
      'Infrastructure': ['External integrations', 'Cross-cutting concerns'],
      'Application': ['Application services', 'Use case orchestration'],
      'Domain': ['Business entities', 'Domain logic', 'Business rules'],
      'API Gateway': ['Request routing', 'Authentication', 'Rate limiting'],
      'Service': ['Business operations', 'Data processing'],
      'Controller': ['Request handling', 'Response formatting'],
      'Repository': ['Data access', 'Query implementation'],
    };
    return responsibilities[layerName as keyof typeof responsibilities] || ['General responsibilities'];
  }

  private isPatternApplicableToSpec(pattern: any, spec: any): boolean {
    return pattern.applicability.toLowerCase().includes(spec.type.toLowerCase());
  }

  private isPatternApplicable(pattern: any, developmentSpec: DevelopmentSpec): boolean {
    return developmentSpec.functionalSpecs.some(spec => 
      this.isPatternApplicableToSpec(pattern, spec)
    );
  }

  private estimatePatternImplementationHours(pattern: any): number {
    const complexityHours = {
      'Creational': 4,
      'Structural': 6,
      'Behavioral': 8,
      'Architectural': 12,
    };
    return complexityHours[pattern.category as keyof typeof complexityHours] || 6;
  }

  private estimateQualityAttributeHours(qa: QualityAttribute): number {
    const qaHours = {
      'performance': 8,
      'scalability': 12,
      'security': 10,
      'maintainability': 6,
      'reliability': 10,
      'availability': 8,
    };
    return qaHours[qa.name as keyof typeof qaHours] || 8;
  }

  private identifyPriorityDebtActions(failedChecks: ArchitecturalValidationCheck[]): string[] {
    const errorChecks = failedChecks.filter(check => check.severity === 'error');
    return errorChecks.slice(0, 3).map(check => 
      `High priority: Fix ${check.type} - ${check.description}`
    );
  }
}

// Additional type definitions for architecture integration
export interface ArchitecturallyGuidedSpec extends DevelopmentSpec {
  architecturalGuidance: ArchitecturalGuidance;
  enhancedCodePatterns: string[];
  architecturalConstraints: ArchitecturalConstraint[];
  implementationGuidelines: ImplementationGuideline[];
}

export interface ArchitecturalGuidance {
  applicableDecisions: any[];
  recommendedPatterns: any[];
  technologyConstraints: TechnologyConstraint[];
  structuralGuidelines: StructuralGuideline[];
  qualityAttributes: QualityAttribute[];
  integrationPoints: IntegrationPoint[];
}

export interface TechnologyConstraint {
  technology: string;
  version: string;
  constraints: string[];
  rationale: string;
}

export interface StructuralGuideline {
  id: string;
  category: string;
  rule: string;
  rationale: string;
  examples: string[];
}

export interface QualityAttribute {
  name: string;
  priority: string;
  metrics: Record<string, number>;
  requiredSkill: string;
  relatedDecisions: string[];
}

export interface IntegrationPoint {
  id: string;
  type: string;
  description: string;
  requirements: string[];
  constraints: string[];
}

export interface ArchitecturalConstraint {
  id: string;
  type: string;
  constraint: string;
  rationale: string;
  impact: string;
  enforcement: string;
}

export interface ImplementationGuideline {
  id: string;
  category: string;
  guideline: string;
  rationale: string;
  codeExamples: string[];
  checkpoints: string[];
}

export interface CodeStructure {
  id: string;
  projectId: string;
  pattern: string;
  layers: Layer[];
  modules: Module[];
  components: Component[];
  interfaces: Interface[];
  directories: Directory[];
  dependencies: DependencyRule[];
  conventions: NamingConvention[];
}

export interface Layer {
  id: string;
  name: string;
  order: number;
  responsibilities: string[];
  dependencies: string[];
}

export interface Module {
  id: string;
  name: string;
  responsibilities: string[];
  interfaces: string[];
  dependencies: string[];
}

export interface Component {
  id: string;
  name: string;
  type: string;
  responsibilities: string[];
  interfaces: string[];
  patterns: string[];
}

export interface Interface {
  id: string;
  name: string;
  methods: Method[];
  contracts: string[];
}

export interface Method {
  name: string;
  parameters: string[];
  returnType: string;
}

export interface Directory {
  path: string;
  purpose: string;
}

export interface DependencyRule {
  id: string;
  rule: string;
  enforcement: string;
}

export interface NamingConvention {
  id: string;
  pattern: string;
  applies_to: string;
  example: string;
}

export interface ArchitecturalValidationResult {
  projectId: string;
  implementationId: string;
  validationChecks: ArchitecturalValidationCheck[];
  overallCompliance: 'compliant' | 'partially_compliant' | 'non_compliant';
  compliancePercentage: number;
  architecturalDebt: ArchitecturalDebt;
  recommendations: string[];
  validatedAt: Date;
}

export interface ArchitecturalValidationCheck {
  id: string;
  type: string;
  description: string;
  passed: boolean;
  details: string;
  severity: 'error' | 'warning' | 'info';
  relatedDecision?: string;
  relatedPattern?: string;
  relatedTechnology?: string;
}

export interface ArchitecturalDebt {
  score: number;
  level: 'low' | 'medium' | 'high';
  categories: {
    decisions: number;
    patterns: number;
    quality: number;
    boundaries: number;
  };
  priorityActions: string[];
}

export interface DevelopmentGuidelines {
  projectId: string;
  codingStandards: CodingStandard[];
  architecturalPrinciples: string[];
  designPatterns: PatternGuideline[];
  technologyGuidelines: TechnologyGuideline[];
  qualityGates: QualityGate[];
  reviewChecklist: ReviewChecklistItem[];
  bestPractices: BestPractice[];
  antiPatterns: AntiPattern[];
  performanceGuidelines: PerformanceGuideline[];
  securityGuidelines: SecurityGuideline[];
}

export interface CodingStandard {
  id: string;
  category: string;
  standard: string;
  enforcement: string;
  examples: string[];
}

export interface PatternGuideline {
  patternName: string;
  whenToUse: string;
  implementation: string;
  benefits: string[];
  drawbacks: string[];
  examples: string[];
}

export interface TechnologyGuideline {
  technology: string;
  version: string;
  guidelines: string[];
  bestPractices: string[];
  commonPitfalls: string[];
}

export interface QualityGate {
  id: string;
  name: string;
  criteria: QualityCriterion[];
  enforcement: string;
}

export interface QualityCriterion {
  metric: string;
  threshold: number;
  operator: string;
}

export interface ReviewChecklistItem {
  id: string;
  category: string;
  item: string;
  description: string;
  mandatory: boolean;
}

export interface BestPractice {
  id: string;
  category: string;
  practice: string;
  rationale: string;
  examples: string[];
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  problems: string[];
  solution: string;
}

export interface PerformanceGuideline {
  id: string;
  category: string;
  guideline: string;
  metrics: string[];
  tools: string[];
}

export interface SecurityGuideline {
  id: string;
  category: string;
  guideline: string;
  threats: string[];
  controls: string[];
}

export interface ArchitecturalImprovement {
  id: string;
  type: string;
  priority: string;
  description: string;
  impact: string;
  effort: string;
  relatedDecisions: string[];
  recommendedPatterns: string[];
  implementationSteps: string[];
}

export interface ArchitecturalTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  estimatedHours: number;
  dependencies: string[];
  requiredSkills: string[];
  relatedDecisions: string[];
  deliverables: string[];
}

export class ArchitectureDevelopmentIntegrationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ArchitectureDevelopmentIntegrationError';
  }
}

// Import shared types from requirements integration
export interface DevelopmentSpec {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  functionalSpecs: any[];
  technicalSpecs: any[];
  testCriteria: any[];
  acceptanceCriteria: string[];
  constraints: any[];
  dependencies: string[];
  priority: string;
  complexity: string;
  estimatedEffort: any;
  codePatterns: string[];
  validationRules: any[];
}

export interface ImplementationDetails {
  id: string;
  files: any[];
  tests: any[];
  documentation: any[];
  metrics: any;
}

export interface ImplementationMetrics {
  codeQuality: number;
  testCoverage: number;
  performance: Record<string, any>;
}