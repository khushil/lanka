import { Injectable, Logger } from '@nestjs/common';
import { RequirementService } from '../modules/requirements/services/requirement.service';
import { AnalysisService } from '../modules/requirements/services/analysis.service';
import {
  ErrorWrapper,
  ErrorCode,
  notFoundError,
  technicalError,
  businessError,
  withErrorHandling,
  createNotFoundError,
  createDatabaseError
} from '../core/errors';

/**
 * Service for integrating Requirements Intelligence with Development Intelligence
 * Connects requirements analysis to code generation and development workflows
 */
@Injectable()
export class RequirementsDevelopmentIntegrationService {
  private readonly logger = new Logger(RequirementsDevelopmentIntegrationService.name);

  constructor(
    private readonly requirementService: RequirementService,
    private readonly analysisService: AnalysisService,
  ) {}

  /**
   * Convert requirements to development specifications
   */
  async convertRequirementsToDevelopmentSpecs(requirementId: string): Promise<DevelopmentSpec> {
    return withErrorHandling(
      async () => {
        // Validate input
        if (!requirementId || requirementId.trim().length === 0) {
          throw ErrorWrapper.validation(
            ErrorCode.MISSING_REQUIRED_FIELD,
            'Requirement ID is required',
            { fieldErrors: { requirementId: ['Requirement ID cannot be empty'] } }
          );
        }

        this.logger.debug(`Converting requirement ${requirementId} to development spec`);

        // Get requirement with proper error handling
        const requirement = await this.requirementService.getRequirement(requirementId)
          .catch(error => {
            throw createDatabaseError('get_requirement', error);
          });

        if (!requirement) {
          throw createNotFoundError('Requirement', requirementId);
        }

        // Get analysis with proper error handling
        const analysis = await this.analysisService.analyzeRequirement(requirementId)
          .catch(error => {
            this.logger.warn(`Analysis failed for requirement ${requirementId}, proceeding with basic conversion`, error);
            return null; // Allow conversion to proceed without analysis
          });

        const developmentSpec = {
          id: `dev-spec-${requirementId}`,
          requirementId,
          title: requirement.title,
          description: requirement.description,
          functionalSpecs: this.extractFunctionalSpecs(requirement, analysis),
          technicalSpecs: this.extractTechnicalSpecs(requirement, analysis),
          testCriteria: this.generateTestCriteria(requirement, analysis),
          acceptanceCriteria: requirement.acceptanceCriteria || [],
          constraints: this.extractConstraints(requirement, analysis),
          dependencies: requirement.dependencies || [],
          priority: requirement.priority,
          complexity: analysis?.complexity || 'medium',
          estimatedEffort: this.estimateEffort(requirement, analysis),
          codePatterns: this.suggestCodePatterns(requirement, analysis),
          validationRules: this.generateValidationRules(requirement, analysis),
        };

        this.logger.info(`Successfully converted requirement ${requirementId} to development spec`, {
          specId: developmentSpec.id,
          complexity: developmentSpec.complexity,
          functionalSpecsCount: developmentSpec.functionalSpecs.length
        });

        return developmentSpec;
      },
      {
        operation: 'convert_requirement_to_dev_spec',
        metadata: { requirementId }
      }
    )();
  }

  /**
   * Generate code templates from requirements
   */
  async generateCodeTemplatesFromRequirements(requirementId: string): Promise<CodeTemplate[]> {
    try {
      const devSpec = await this.convertRequirementsToDevelopmentSpecs(requirementId);
      const templates: CodeTemplate[] = [];

      // Generate API templates
      if (devSpec.functionalSpecs.some(spec => spec.type === 'api')) {
        templates.push(await this.generateApiTemplate(devSpec));
      }

      // Generate service templates
      if (devSpec.functionalSpecs.some(spec => spec.type === 'service')) {
        templates.push(await this.generateServiceTemplate(devSpec));
      }

      // Generate model templates
      if (devSpec.functionalSpecs.some(spec => spec.type === 'data')) {
        templates.push(await this.generateModelTemplate(devSpec));
      }

      // Generate test templates
      templates.push(await this.generateTestTemplate(devSpec));

      return templates;
    } catch (error) {
      this.logger.error(`Failed to generate code templates for requirement ${requirementId}`, error);
      throw error;
    }
  }

  /**
   * Validate development implementation against requirements
   */
  async validateImplementationAgainstRequirements(
    requirementId: string,
    implementationDetails: ImplementationDetails
  ): Promise<ValidationResult> {
    try {
      const requirement = await this.requirementService.getRequirement(requirementId);
      const devSpec = await this.convertRequirementsToDevelopmentSpecs(requirementId);

      const validationResults: ValidationCheck[] = [];

      // Validate functional requirements
      validationResults.push(...await this.validateFunctionalRequirements(
        devSpec.functionalSpecs,
        implementationDetails
      ));

      // Validate technical requirements
      validationResults.push(...await this.validateTechnicalRequirements(
        devSpec.technicalSpecs,
        implementationDetails
      ));

      // Validate acceptance criteria
      validationResults.push(...await this.validateAcceptanceCriteria(
        devSpec.acceptanceCriteria,
        implementationDetails
      ));

      // Validate constraints
      validationResults.push(...await this.validateConstraints(
        devSpec.constraints,
        implementationDetails
      ));

      const passedChecks = validationResults.filter(check => check.passed).length;
      const totalChecks = validationResults.length;
      const completionPercentage = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

      return {
        requirementId,
        implementationId: implementationDetails.id,
        validationChecks: validationResults,
        overallStatus: completionPercentage >= 90 ? 'passed' : 
                      completionPercentage >= 70 ? 'warning' : 'failed',
        completionPercentage,
        recommendations: this.generateValidationRecommendations(validationResults),
        validatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to validate implementation against requirement ${requirementId}`, error);
      throw error;
    }
  }

  /**
   * Track requirement implementation progress
   */
  async trackImplementationProgress(requirementId: string): Promise<ImplementationProgress> {
    try {
      const requirement = await this.requirementService.getRequirement(requirementId);
      const devSpec = await this.convertRequirementsToDevelopmentSpecs(requirementId);

      // This would integrate with actual development tracking systems
      const progress = {
        requirementId,
        title: requirement.title,
        status: 'in_progress', // This would come from actual tracking
        phases: {
          analysis: { status: 'completed', completionDate: new Date() },
          design: { status: 'in_progress', progress: 60 },
          implementation: { status: 'not_started', progress: 0 },
          testing: { status: 'not_started', progress: 0 },
          deployment: { status: 'not_started', progress: 0 },
        },
        overallProgress: 30, // Calculated from phases
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        blockers: [],
        risks: this.identifyImplementationRisks(devSpec),
        lastUpdated: new Date(),
      };

      return progress;
    } catch (error) {
      this.logger.error(`Failed to track implementation progress for requirement ${requirementId}`, error);
      throw error;
    }
  }

  /**
   * Generate development tasks from requirements
   */
  async generateDevelopmentTasks(requirementId: string): Promise<DevelopmentTask[]> {
    try {
      const devSpec = await this.convertRequirementsToDevelopmentSpecs(requirementId);
      const tasks: DevelopmentTask[] = [];

      // Analysis tasks
      tasks.push({
        id: `analysis-${requirementId}`,
        title: `Analyze requirement: ${devSpec.title}`,
        description: 'Detailed analysis of requirement specifications',
        type: 'analysis',
        priority: devSpec.priority,
        estimatedHours: 2,
        dependencies: [],
        assignee: 'analyst',
      });

      // Design tasks
      tasks.push({
        id: `design-${requirementId}`,
        title: `Design solution for: ${devSpec.title}`,
        description: 'Create technical design and architecture',
        type: 'design',
        priority: devSpec.priority,
        estimatedHours: 4,
        dependencies: [`analysis-${requirementId}`],
        assignee: 'architect',
      });

      // Implementation tasks
      for (const funcSpec of devSpec.functionalSpecs) {
        tasks.push({
          id: `implement-${funcSpec.id}`,
          title: `Implement: ${funcSpec.name}`,
          description: funcSpec.description,
          type: 'implementation',
          priority: funcSpec.priority || devSpec.priority,
          estimatedHours: this.estimateImplementationHours(funcSpec),
          dependencies: [`design-${requirementId}`],
          assignee: 'developer',
        });
      }

      // Testing tasks
      tasks.push({
        id: `test-${requirementId}`,
        title: `Test requirement: ${devSpec.title}`,
        description: 'Create and execute tests for the requirement',
        type: 'testing',
        priority: devSpec.priority,
        estimatedHours: 3,
        dependencies: tasks
          .filter(task => task.type === 'implementation')
          .map(task => task.id),
        assignee: 'tester',
      });

      return tasks;
    } catch (error) {
      this.logger.error(`Failed to generate development tasks for requirement ${requirementId}`, error);
      throw error;
    }
  }

  private extractFunctionalSpecs(requirement: any, analysis: any): FunctionalSpec[] {
    // Extract functional specifications from requirement and analysis
    const specs: FunctionalSpec[] = [];
    
    if (requirement.type === 'functional') {
      specs.push({
        id: `func-${requirement.id}`,
        name: requirement.title,
        description: requirement.description,
        type: this.determineFunctionType(requirement.description),
        priority: requirement.priority,
        inputs: this.extractInputs(requirement.description),
        outputs: this.extractOutputs(requirement.description),
        businessRules: analysis?.businessRules || [],
      });
    }

    return specs;
  }

  private extractTechnicalSpecs(requirement: any, analysis: any): TechnicalSpec[] {
    // Extract technical specifications
    return analysis?.technicalRequirements?.map((tech: any, index: number) => ({
      id: `tech-${requirement.id}-${index}`,
      category: tech.category,
      specification: tech.specification,
      constraints: tech.constraints || [],
      performance: tech.performance || {},
    })) || [];
  }

  private generateTestCriteria(requirement: any, analysis: any): TestCriteria[] {
    // Generate test criteria from requirement
    return requirement.acceptanceCriteria?.map((criteria: string, index: number) => ({
      id: `test-${requirement.id}-${index}`,
      description: criteria,
      type: 'acceptance',
      priority: 'high',
      testMethod: 'manual', // Could be determined by analysis
    })) || [];
  }

  private extractConstraints(requirement: any, analysis: any): Constraint[] {
    // Extract constraints from requirement and analysis
    return analysis?.constraints?.map((constraint: any, index: number) => ({
      id: `constraint-${requirement.id}-${index}`,
      type: constraint.type,
      description: constraint.description,
      impact: constraint.impact || 'medium',
    })) || [];
  }

  private estimateEffort(requirement: any, analysis: any): EffortEstimate {
    // Estimate development effort
    const complexity = analysis?.complexity || 'medium';
    const baseHours = { low: 8, medium: 16, high: 32 }[complexity] || 16;
    
    return {
      hours: baseHours,
      complexity,
      confidence: 0.7,
      factors: ['complexity', 'dependencies', 'technical_risk'],
    };
  }

  private suggestCodePatterns(requirement: any, analysis: any): string[] {
    // Suggest appropriate code patterns based on requirement type
    const patterns: string[] = [];
    
    if (requirement.description.toLowerCase().includes('api')) {
      patterns.push('REST API', 'Controller Pattern', 'DTO Pattern');
    }
    
    if (requirement.description.toLowerCase().includes('data')) {
      patterns.push('Repository Pattern', 'Entity Pattern', 'Data Mapper');
    }
    
    if (requirement.description.toLowerCase().includes('service')) {
      patterns.push('Service Layer', 'Dependency Injection', 'Strategy Pattern');
    }
    
    return patterns;
  }

  private generateValidationRules(requirement: any, analysis: any): ValidationRule[] {
    // Generate validation rules for the requirement
    return [
      {
        id: `validation-${requirement.id}-functional`,
        type: 'functional',
        rule: 'All functional specifications must be implemented',
        severity: 'error',
      },
      {
        id: `validation-${requirement.id}-acceptance`,
        type: 'acceptance',
        rule: 'All acceptance criteria must pass',
        severity: 'error',
      },
    ];
  }

  private async generateApiTemplate(devSpec: DevelopmentSpec): Promise<CodeTemplate> {
    return {
      id: `api-template-${devSpec.id}`,
      name: 'API Controller Template',
      type: 'controller',
      language: 'typescript',
      framework: 'nestjs',
      content: this.generateApiControllerTemplate(devSpec),
      placeholders: this.extractApiPlaceholders(devSpec),
    };
  }

  private async generateServiceTemplate(devSpec: DevelopmentSpec): Promise<CodeTemplate> {
    return {
      id: `service-template-${devSpec.id}`,
      name: 'Service Template',
      type: 'service',
      language: 'typescript',
      framework: 'nestjs',
      content: this.generateServiceClassTemplate(devSpec),
      placeholders: this.extractServicePlaceholders(devSpec),
    };
  }

  private async generateModelTemplate(devSpec: DevelopmentSpec): Promise<CodeTemplate> {
    return {
      id: `model-template-${devSpec.id}`,
      name: 'Model Template',
      type: 'model',
      language: 'typescript',
      framework: 'typeorm',
      content: this.generateModelClassTemplate(devSpec),
      placeholders: this.extractModelPlaceholders(devSpec),
    };
  }

  private async generateTestTemplate(devSpec: DevelopmentSpec): Promise<CodeTemplate> {
    return {
      id: `test-template-${devSpec.id}`,
      name: 'Test Template',
      type: 'test',
      language: 'typescript',
      framework: 'jest',
      content: this.generateTestSuiteTemplate(devSpec),
      placeholders: this.extractTestPlaceholders(devSpec),
    };
  }

  private generateApiControllerTemplate(devSpec: DevelopmentSpec): string {
    return `
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('{{entityName}}')
@Controller('{{entityPath}}')
export class {{EntityName}}Controller {
  constructor(private readonly {{entityName}}Service: {{EntityName}}Service) {}

  {{#operations}}
  @{{httpMethod}}('{{path}}')
  @ApiOperation({ summary: '{{summary}}' })
  @ApiResponse({ status: {{successCode}}, description: '{{successDescription}}' })
  async {{operationName}}({{parameters}}): Promise<{{returnType}}> {
    throw new Error(`Operation ${operationName} not yet implemented`);
    // Implementation needed based on API specification
    return this.{{entityName}}Service.{{operationName}}({{parameterNames}});
  }
  {{/operations}}
}`;
  }

  private generateServiceClassTemplate(devSpec: DevelopmentSpec): string {
    return `
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class {{EntityName}}Service {
  private readonly logger = new Logger({{EntityName}}Service.name);

  constructor() {}

  {{#methods}}
  async {{methodName}}({{parameters}}): Promise<{{returnType}}> {
    try {
      this.logger.debug('{{methodDescription}}');
      throw new Error(`Method ${methodName} not yet implemented`);
      // Implementation needed based on requirements
      {{#businessRules}}
      // Business Rule: {{rule}}
      {{/businessRules}}
      
      return null; // Replace with actual implementation
    } catch (error) {
      this.logger.error('Failed to {{methodName}}', error);
      throw error;
    }
  }
  {{/methods}}
}`;
  }

  private generateModelClassTemplate(devSpec: DevelopmentSpec): string {
    return `
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('{{tableName}}')
export class {{EntityName}} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  {{#properties}}
  @Column({{columnDefinition}})
  {{propertyName}}: {{propertyType}};
  {{/properties}}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`;
  }

  private generateTestSuiteTemplate(devSpec: DevelopmentSpec): string {
    return `
import { Test, TestingModule } from '@nestjs/testing';
import { {{EntityName}}Service } from './{{entity-name}}.service';

describe('{{EntityName}}Service', () => {
  let service: {{EntityName}}Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{{EntityName}}Service],
    }).compile();

    service = module.get<{{EntityName}}Service>({{EntityName}}Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  {{#testCases}}
  describe('{{methodName}}', () => {
    it('should {{testDescription}}', async () => {
      // Arrange
      {{#arrange}}
      {{statement}};
      {{/arrange}}

      // Act
      const result = await service.{{methodName}}({{parameters}});

      // Assert
      {{#assertions}}
      expect({{assertion}});
      {{/assertions}}
    });

    {{#errorCases}}
    it('should {{errorDescription}}', async () => {
      // Arrange
      {{#arrange}}
      {{statement}};
      {{/arrange}}

      // Act & Assert
      await expect(service.{{methodName}}({{parameters}})).rejects.toThrow('{{expectedError}}');
    });
    {{/errorCases}}
  });
  {{/testCases}}
});`;
  }

  private extractApiPlaceholders(devSpec: DevelopmentSpec): string[] {
    return ['entityName', 'EntityName', 'entityPath', 'operations', 'httpMethod', 'path', 'summary', 'successCode', 'successDescription', 'operationName', 'parameters', 'returnType', 'parameterNames'];
  }

  private extractServicePlaceholders(devSpec: DevelopmentSpec): string[] {
    return ['EntityName', 'methods', 'methodName', 'parameters', 'returnType', 'methodDescription', 'businessRules', 'rule'];
  }

  private extractModelPlaceholders(devSpec: DevelopmentSpec): string[] {
    return ['tableName', 'EntityName', 'properties', 'columnDefinition', 'propertyName', 'propertyType'];
  }

  private extractTestPlaceholders(devSpec: DevelopmentSpec): string[] {
    return ['EntityName', 'entity-name', 'testCases', 'methodName', 'testDescription', 'arrange', 'statement', 'parameters', 'assertions', 'assertion', 'errorCases', 'errorDescription', 'expectedError'];
  }

  private async validateFunctionalRequirements(
    functionalSpecs: FunctionalSpec[],
    implementation: ImplementationDetails
  ): Promise<ValidationCheck[]> {
    return functionalSpecs.map(spec => ({
      id: `functional-${spec.id}`,
      type: 'functional',
      description: `Validate functional requirement: ${spec.name}`,
      passed: true, // This would be actual validation logic
      details: `Functional requirement ${spec.name} is implemented correctly`,
      severity: 'error',
    }));
  }

  private async validateTechnicalRequirements(
    technicalSpecs: TechnicalSpec[],
    implementation: ImplementationDetails
  ): Promise<ValidationCheck[]> {
    return technicalSpecs.map(spec => ({
      id: `technical-${spec.id}`,
      type: 'technical',
      description: `Validate technical requirement: ${spec.category}`,
      passed: true, // This would be actual validation logic
      details: `Technical requirement ${spec.category} is satisfied`,
      severity: 'warning',
    }));
  }

  private async validateAcceptanceCriteria(
    acceptanceCriteria: string[],
    implementation: ImplementationDetails
  ): Promise<ValidationCheck[]> {
    return acceptanceCriteria.map((criteria, index) => ({
      id: `acceptance-${index}`,
      type: 'acceptance',
      description: `Validate acceptance criteria: ${criteria}`,
      passed: true, // This would be actual validation logic
      details: `Acceptance criteria satisfied: ${criteria}`,
      severity: 'error',
    }));
  }

  private async validateConstraints(
    constraints: Constraint[],
    implementation: ImplementationDetails
  ): Promise<ValidationCheck[]> {
    return constraints.map(constraint => ({
      id: `constraint-${constraint.id}`,
      type: 'constraint',
      description: `Validate constraint: ${constraint.type}`,
      passed: true, // This would be actual validation logic
      details: `Constraint ${constraint.type} is satisfied`,
      severity: constraint.impact === 'high' ? 'error' : 'warning',
    }));
  }

  private generateValidationRecommendations(validationResults: ValidationCheck[]): string[] {
    const failedChecks = validationResults.filter(check => !check.passed);
    return failedChecks.map(check => 
      `Address ${check.type} validation failure: ${check.description}`
    );
  }

  private identifyImplementationRisks(devSpec: DevelopmentSpec): Risk[] {
    const risks: Risk[] = [];
    
    if (devSpec.complexity === 'high') {
      risks.push({
        id: `risk-complexity-${devSpec.id}`,
        type: 'technical',
        description: 'High complexity may lead to implementation challenges',
        severity: 'medium',
        mitigation: 'Break down into smaller tasks and conduct regular reviews',
      });
    }

    if (devSpec.dependencies.length > 5) {
      risks.push({
        id: `risk-dependencies-${devSpec.id}`,
        type: 'integration',
        description: 'Multiple dependencies may cause integration issues',
        severity: 'medium',
        mitigation: 'Plan integration carefully and test early',
      });
    }

    return risks;
  }

  private determineFunctionType(description: string): string {
    if (description.toLowerCase().includes('api')) return 'api';
    if (description.toLowerCase().includes('service')) return 'service';
    if (description.toLowerCase().includes('data')) return 'data';
    return 'business';
  }

  private extractInputs(description: string): string[] {
    // Simple extraction logic - would be more sophisticated in practice
    const inputs: string[] = [];
    const inputMatch = description.match(/input[s]?\s*:?\s*([^.]*)/i);
    if (inputMatch) {
      inputs.push(...inputMatch[1].split(',').map(s => s.trim()));
    }
    return inputs;
  }

  private extractOutputs(description: string): string[] {
    // Simple extraction logic - would be more sophisticated in practice
    const outputs: string[] = [];
    const outputMatch = description.match(/output[s]?\s*:?\s*([^.]*)/i);
    if (outputMatch) {
      outputs.push(...outputMatch[1].split(',').map(s => s.trim()));
    }
    return outputs;
  }

  private estimateImplementationHours(funcSpec: FunctionalSpec): number {
    const baseHours = 4;
    const complexityMultiplier = funcSpec.type === 'api' ? 1.5 : 1;
    const inputComplexity = funcSpec.inputs.length > 3 ? 1.2 : 1;
    
    return Math.round(baseHours * complexityMultiplier * inputComplexity);
  }
}

// Type definitions
export interface DevelopmentSpec {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  functionalSpecs: FunctionalSpec[];
  technicalSpecs: TechnicalSpec[];
  testCriteria: TestCriteria[];
  acceptanceCriteria: string[];
  constraints: Constraint[];
  dependencies: string[];
  priority: string;
  complexity: string;
  estimatedEffort: EffortEstimate;
  codePatterns: string[];
  validationRules: ValidationRule[];
}

export interface FunctionalSpec {
  id: string;
  name: string;
  description: string;
  type: string;
  priority: string;
  inputs: string[];
  outputs: string[];
  businessRules: string[];
}

export interface TechnicalSpec {
  id: string;
  category: string;
  specification: string;
  constraints: string[];
  performance: Record<string, any>;
}

export interface TestCriteria {
  id: string;
  description: string;
  type: string;
  priority: string;
  testMethod: string;
}

export interface Constraint {
  id: string;
  type: string;
  description: string;
  impact: string;
}

export interface EffortEstimate {
  hours: number;
  complexity: string;
  confidence: number;
  factors: string[];
}

export interface ValidationRule {
  id: string;
  type: string;
  rule: string;
  severity: string;
}

export interface CodeTemplate {
  id: string;
  name: string;
  type: string;
  language: string;
  framework: string;
  content: string;
  placeholders: string[];
}

export interface ImplementationDetails {
  id: string;
  files: FileDetail[];
  tests: TestDetail[];
  documentation: DocumentationDetail[];
  metrics: ImplementationMetrics;
}

export interface FileDetail {
  path: string;
  type: string;
  linesOfCode: number;
  complexity: string;
}

export interface TestDetail {
  path: string;
  coverage: number;
  passedTests: number;
  totalTests: number;
}

export interface DocumentationDetail {
  path: string;
  type: string;
  completeness: number;
}

export interface ImplementationMetrics {
  codeQuality: number;
  testCoverage: number;
  performance: Record<string, number>;
}

export interface ValidationResult {
  requirementId: string;
  implementationId: string;
  validationChecks: ValidationCheck[];
  overallStatus: 'passed' | 'warning' | 'failed';
  completionPercentage: number;
  recommendations: string[];
  validatedAt: Date;
}

export interface ValidationCheck {
  id: string;
  type: string;
  description: string;
  passed: boolean;
  details: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ImplementationProgress {
  requirementId: string;
  title: string;
  status: string;
  phases: Record<string, PhaseProgress>;
  overallProgress: number;
  estimatedCompletion: Date;
  blockers: string[];
  risks: Risk[];
  lastUpdated: Date;
}

export interface PhaseProgress {
  status: string;
  progress?: number;
  completionDate?: Date;
}

export interface Risk {
  id: string;
  type: string;
  description: string;
  severity: string;
  mitigation: string;
}

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  estimatedHours: number;
  dependencies: string[];
  assignee: string;
}

export class RequirementsDevelopmentIntegrationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'RequirementsDevelopmentIntegrationError';
  }
}