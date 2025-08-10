"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngineService = void 0;
const logger_1 = require("../../../core/logging/logger");
const code_generation_types_1 = require("../types/code-generation.types");
/**
 * Template Engine Service for code generation
 * Handles template loading, rendering, and variable substitution
 */
class TemplateEngineService {
    templates = new Map();
    constructor() {
        this.initializeDefaultTemplates();
    }
    async loadTemplate(criteria) {
        const templateKey = this.generateTemplateKey(criteria);
        let template = this.templates.get(templateKey);
        if (!template) {
            // Try to find a generic template for the language and type
            const genericKey = `${criteria.language}_${criteria.type}`;
            template = this.templates.get(genericKey);
        }
        if (!template) {
            throw new Error(`Template not found for ${templateKey}`);
        }
        logger_1.logger.info('Template loaded', { templateKey, templateName: template.name });
        return template;
    }
    async renderTemplate(template, data) {
        try {
            logger_1.logger.info('Rendering template', { templateName: template.name });
            let renderedContent = template.template;
            // Process template variables
            for (const variable of template.variables) {
                const value = this.getVariableValue(variable, data);
                const placeholder = `{{${variable.name}}}`;
                renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), value);
            }
            // Process conditional blocks
            for (const condition of template.conditions) {
                renderedContent = this.processCondition(renderedContent, condition, data);
            }
            // Process template fragments
            for (const fragment of template.fragments) {
                const fragmentPlaceholder = `{{>${fragment.name}}}`;
                renderedContent = renderedContent.replace(fragmentPlaceholder, fragment.content);
            }
            // Process loops/iterations
            renderedContent = this.processIterations(renderedContent, data);
            return this.formatCode(renderedContent, template.language);
        }
        catch (error) {
            logger_1.logger.error('Template rendering failed', { templateName: template.name, error });
            throw error;
        }
    }
    async validateTemplate(template) {
        const errors = [];
        const warnings = [];
        // Check for required variables
        const variableNames = template.variables.map(v => v.name);
        const usedVariables = this.extractUsedVariables(template.template);
        for (const usedVar of usedVariables) {
            if (!variableNames.includes(usedVar)) {
                errors.push(`Undefined variable: ${usedVar}`);
            }
        }
        // Check for unused variables
        for (const variable of template.variables) {
            if (!usedVariables.includes(variable.name)) {
                warnings.push(`Unused variable: ${variable.name}`);
            }
        }
        // Validate condition expressions
        for (const condition of template.conditions) {
            if (!this.isValidCondition(condition.expression)) {
                errors.push(`Invalid condition: ${condition.expression}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    createTemplate(template) {
        const newTemplate = {
            ...template,
            id: this.generateTemplateId(),
            createdAt: new Date().toISOString(),
        };
        const key = this.generateTemplateKey({
            type: template.type,
            language: template.language,
        });
        this.templates.set(key, newTemplate);
        logger_1.logger.info('Template created', { templateId: newTemplate.id, templateName: newTemplate.name });
        return newTemplate;
    }
    listTemplates(criteria) {
        let templates = Array.from(this.templates.values());
        if (criteria) {
            if (criteria.language) {
                templates = templates.filter(t => t.language === criteria.language);
            }
            if (criteria.type) {
                templates = templates.filter(t => t.type === criteria.type);
            }
        }
        return templates.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
    }
    // Private methods
    initializeDefaultTemplates() {
        // TypeScript Service Template
        this.templates.set('TYPESCRIPT_SERVICE', {
            id: 'ts-service-1',
            name: 'TypeScript Service Template',
            description: 'NestJS service template with dependency injection',
            type: code_generation_types_1.CodeTemplateType.SERVICE,
            language: code_generation_types_1.ProgrammingLanguage.TYPESCRIPT,
            template: `import { Injectable } from '@nestjs/common';
{{#if useTypeORM}}
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { {{entityName}} } from './{{entityName.toLowerCase}}.entity';
{{/if}}

@Injectable()
export class {{serviceName}} {
{{#if useTypeORM}}
  constructor(
    @InjectRepository({{entityName}})
    private {{entityName.toLowerCase}}Repository: Repository<{{entityName}}>,
  ) {}
{{else}}
  constructor() {}
{{/if}}

{{#each methods}}
  {{#if async}}async {{/if}}{{name}}({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}): {{#if async}}Promise<{{returnType}}>{{else}}{{returnType}}{{/if}} {
    {{#if async}}
    try {
      // TODO: Implement {{name}}
      {{#if returnType}}return null as any;{{/if}}
    } catch (error) {
      throw new Error(\`{{name}} failed: \${error.message}\`);
    }
    {{else}}
    // TODO: Implement {{name}}
    {{#if returnType}}return null as any;{{/if}}
    {{/if}}
  }

{{/each}}
}`,
            variables: [
                {
                    name: 'serviceName',
                    type: 'STRING',
                    description: 'Name of the service class',
                    required: true,
                    examples: ['UserService', 'OrderService'],
                },
                {
                    name: 'entityName',
                    type: 'STRING',
                    description: 'Name of the entity (if using TypeORM)',
                    required: false,
                    examples: ['User', 'Order'],
                },
                {
                    name: 'useTypeORM',
                    type: 'BOOLEAN',
                    description: 'Whether to include TypeORM repository injection',
                    required: false,
                    defaultValue: true,
                    examples: [true, false],
                },
                {
                    name: 'methods',
                    type: 'ARRAY',
                    description: 'Array of methods to generate',
                    required: true,
                    examples: [[
                            {
                                name: 'findById',
                                async: true,
                                returnType: 'User | null',
                                parameters: [{ name: 'id', type: 'string' }],
                            },
                        ]],
                },
            ],
            conditions: [
                {
                    expression: 'useTypeORM',
                    description: 'Include TypeORM imports and repository injection',
                },
            ],
            fragments: [],
            metadata: {
                version: '1.0.0',
                author: 'LANKA System',
                tags: ['typescript', 'nestjs', 'service'],
                category: 'Backend',
                usageCount: 0,
                rating: 0,
            },
            createdAt: new Date().toISOString(),
        });
        // Python FastAPI Service Template
        this.templates.set('PYTHON_SERVICE', {
            id: 'py-service-1',
            name: 'Python FastAPI Service Template',
            description: 'FastAPI service template with dependency injection',
            type: code_generation_types_1.CodeTemplateType.SERVICE,
            language: code_generation_types_1.ProgrammingLanguage.PYTHON,
            template: `from typing import Optional, List
from fastapi import Depends, HTTPException
{{#if useDatabase}}
from sqlalchemy.orm import Session
from .database import get_db
from .models import {{modelName}}
{{/if}}

class {{serviceName}}:
{{#if useDatabase}}
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
{{else}}
    def __init__(self):
        pass
{{/if}}

{{#each methods}}
    {{#if async}}async {{/if}}def {{name}}(self{{#each parameters}}, {{name}}: {{type}}{{/each}}){{#if async}} -> {{returnType}}{{/if}}:
        """{{description}}"""
        {{#if async}}
        try:
            # TODO: Implement {{name}}
            {{#if returnType}}return None{{/if}}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{{name}} failed: {str(e)}")
        {{else}}
        # TODO: Implement {{name}}
        {{#if returnType}}return None{{/if}}
        {{/if}}

{{/each}}`,
            variables: [
                {
                    name: 'serviceName',
                    type: 'STRING',
                    description: 'Name of the service class',
                    required: true,
                    examples: ['UserService', 'OrderService'],
                },
                {
                    name: 'modelName',
                    type: 'STRING',
                    description: 'Name of the database model',
                    required: false,
                    examples: ['User', 'Order'],
                },
                {
                    name: 'useDatabase',
                    type: 'BOOLEAN',
                    description: 'Whether to include database dependencies',
                    required: false,
                    defaultValue: true,
                    examples: [true, false],
                },
                {
                    name: 'methods',
                    type: 'ARRAY',
                    description: 'Array of methods to generate',
                    required: true,
                    examples: [[
                            {
                                name: 'get_by_id',
                                async: true,
                                returnType: 'Optional[User]',
                                parameters: [{ name: 'user_id', type: 'int' }],
                                description: 'Get user by ID',
                            },
                        ]],
                },
            ],
            conditions: [
                {
                    expression: 'useDatabase',
                    description: 'Include database imports and session management',
                },
            ],
            fragments: [],
            metadata: {
                version: '1.0.0',
                author: 'LANKA System',
                tags: ['python', 'fastapi', 'service'],
                category: 'Backend',
                usageCount: 0,
                rating: 0,
            },
            createdAt: new Date().toISOString(),
        });
        // Add more default templates...
        this.addJavaServiceTemplate();
        this.addGoServiceTemplate();
        this.addTestTemplates();
    }
    addJavaServiceTemplate() {
        this.templates.set('JAVA_SERVICE', {
            id: 'java-service-1',
            name: 'Java Spring Service Template',
            description: 'Spring Boot service template with JPA',
            type: code_generation_types_1.CodeTemplateType.SERVICE,
            language: code_generation_types_1.ProgrammingLanguage.JAVA,
            template: `package {{packageName}}.service;

import org.springframework.stereotype.Service;
{{#if useJPA}}
import org.springframework.beans.factory.annotation.Autowired;
import {{packageName}}.repository.{{entityName}}Repository;
import {{packageName}}.model.{{entityName}};
{{/if}}
import java.util.Optional;
import java.util.List;

@Service
public class {{serviceName}} {

{{#if useJPA}}
    @Autowired
    private {{entityName}}Repository {{entityName.toLowerCase}}Repository;
{{/if}}

{{#each methods}}
    public {{returnType}} {{name}}({{#each parameters}}{{type}} {{name}}{{#unless @last}}, {{/unless}}{{/each}}) {
        // TODO: Implement {{name}}
        {{#if returnType}}return null;{{/if}}
    }

{{/each}}
}`,
            variables: [
                {
                    name: 'packageName',
                    type: 'STRING',
                    description: 'Java package name',
                    required: true,
                    examples: ['com.example.myapp'],
                },
                {
                    name: 'serviceName',
                    type: 'STRING',
                    description: 'Name of the service class',
                    required: true,
                    examples: ['UserService', 'OrderService'],
                },
                {
                    name: 'entityName',
                    type: 'STRING',
                    description: 'Name of the JPA entity',
                    required: false,
                    examples: ['User', 'Order'],
                },
                {
                    name: 'useJPA',
                    type: 'BOOLEAN',
                    description: 'Whether to include JPA repository injection',
                    required: false,
                    defaultValue: true,
                    examples: [true, false],
                },
                {
                    name: 'methods',
                    type: 'ARRAY',
                    description: 'Array of methods to generate',
                    required: true,
                    examples: [[
                            {
                                name: 'findById',
                                returnType: 'Optional<User>',
                                parameters: [{ name: 'id', type: 'Long' }],
                            },
                        ]],
                },
            ],
            conditions: [
                {
                    expression: 'useJPA',
                    description: 'Include JPA imports and repository injection',
                },
            ],
            fragments: [],
            metadata: {
                version: '1.0.0',
                author: 'LANKA System',
                tags: ['java', 'spring-boot', 'service'],
                category: 'Backend',
                usageCount: 0,
                rating: 0,
            },
            createdAt: new Date().toISOString(),
        });
    }
    addGoServiceTemplate() {
        this.templates.set('GO_SERVICE', {
            id: 'go-service-1',
            name: 'Go Service Template',
            description: 'Go service template with interfaces',
            type: code_generation_types_1.CodeTemplateType.SERVICE,
            language: code_generation_types_1.ProgrammingLanguage.GO,
            template: `package {{packageName}}

import (
    "context"
{{#if useDatabase}}
    "database/sql"
{{/if}}
    "fmt"
)

{{#if useInterface}}
type {{serviceName}}Interface interface {
{{#each methods}}
    {{name}}({{#each parameters}}{{name}} {{type}}{{#unless @last}}, {{/unless}}{{/each}}) ({{returnType}}, error)
{{/each}}
}
{{/if}}

type {{serviceName}} struct {
{{#if useDatabase}}
    db *sql.DB
{{/if}}
}

func New{{serviceName}}({{#if useDatabase}}db *sql.DB{{/if}}) {{#if useInterface}}{{serviceName}}Interface{{else}}*{{serviceName}}{{/if}} {
    return &{{serviceName}}{
{{#if useDatabase}}
        db: db,
{{/if}}
    }
}

{{#each methods}}
func (s *{{../serviceName}}) {{name}}({{#each parameters}}{{name}} {{type}}{{#unless @last}}, {{/unless}}{{/each}}) ({{returnType}}, error) {
    // TODO: Implement {{name}}
    return {{defaultReturn}}, nil
}

{{/each}}`,
            variables: [
                {
                    name: 'packageName',
                    type: 'STRING',
                    description: 'Go package name',
                    required: true,
                    examples: ['service', 'user'],
                },
                {
                    name: 'serviceName',
                    type: 'STRING',
                    description: 'Name of the service struct',
                    required: true,
                    examples: ['UserService', 'OrderService'],
                },
                {
                    name: 'useInterface',
                    type: 'BOOLEAN',
                    description: 'Whether to generate an interface',
                    required: false,
                    defaultValue: true,
                    examples: [true, false],
                },
                {
                    name: 'useDatabase',
                    type: 'BOOLEAN',
                    description: 'Whether to include database connection',
                    required: false,
                    defaultValue: false,
                    examples: [true, false],
                },
                {
                    name: 'methods',
                    type: 'ARRAY',
                    description: 'Array of methods to generate',
                    required: true,
                    examples: [[
                            {
                                name: 'GetByID',
                                returnType: '*User',
                                defaultReturn: 'nil',
                                parameters: [
                                    { name: 'ctx', type: 'context.Context' },
                                    { name: 'id', type: 'int64' },
                                ],
                            },
                        ]],
                },
            ],
            conditions: [
                {
                    expression: 'useInterface',
                    description: 'Generate interface definition',
                },
                {
                    expression: 'useDatabase',
                    description: 'Include database connection in struct',
                },
            ],
            fragments: [],
            metadata: {
                version: '1.0.0',
                author: 'LANKA System',
                tags: ['go', 'service', 'interface'],
                category: 'Backend',
                usageCount: 0,
                rating: 0,
            },
            createdAt: new Date().toISOString(),
        });
    }
    addTestTemplates() {
        // TypeScript Jest Test Template
        this.templates.set('TYPESCRIPT_TEST', {
            id: 'ts-test-1',
            name: 'TypeScript Jest Test Template',
            description: 'Jest test template for TypeScript services',
            type: code_generation_types_1.CodeTemplateType.TEST,
            language: code_generation_types_1.ProgrammingLanguage.TYPESCRIPT,
            template: `import { Test, TestingModule } from '@nestjs/testing';
{{#if useTypeORM}}
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
{{/if}}
import { {{serviceName}} } from './{{serviceName.toLowerCase}}.service';
{{#if entityName}}
import { {{entityName}} } from './{{entityName.toLowerCase}}.entity';
{{/if}}

describe('{{serviceName}}', () => {
  let service: {{serviceName}};
{{#if useTypeORM}}
  let repository: jest.Mocked<Repository<{{entityName}}>>;
{{/if}}

  beforeEach(async () => {
{{#if useTypeORM}}
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
{{/if}}

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {{serviceName}},
{{#if useTypeORM}}
        {
          provide: getRepositoryToken({{entityName}}),
          useValue: mockRepository,
        },
{{/if}}
      ],
    }).compile();

    service = module.get<{{serviceName}}>({{serviceName}});
{{#if useTypeORM}}
    repository = module.get(getRepositoryToken({{entityName}}));
{{/if}}
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

{{#each testCases}}
  describe('{{methodName}}', () => {
    it('{{description}}', async () => {
      // Arrange
      {{#each mocks}}
      {{mockCall}};
      {{/each}}

      // Act
      {{#if async}}const result = await {{else}}const result = {{/if}}service.{{methodName}}({{#each parameters}}{{value}}{{#unless @last}}, {{/unless}}{{/each}});

      // Assert
      {{#each assertions}}
      {{assertion}};
      {{/each}}
    });
  });

{{/each}}
});`,
            variables: [
                {
                    name: 'serviceName',
                    type: 'STRING',
                    description: 'Name of the service being tested',
                    required: true,
                    examples: ['UserService'],
                },
                {
                    name: 'entityName',
                    type: 'STRING',
                    description: 'Name of the entity (if using TypeORM)',
                    required: false,
                    examples: ['User'],
                },
                {
                    name: 'useTypeORM',
                    type: 'BOOLEAN',
                    description: 'Whether the service uses TypeORM',
                    required: false,
                    defaultValue: true,
                    examples: [true, false],
                },
                {
                    name: 'testCases',
                    type: 'ARRAY',
                    description: 'Array of test cases to generate',
                    required: true,
                    examples: [[
                            {
                                methodName: 'findUser',
                                description: 'should return user when found',
                                async: true,
                                parameters: [{ value: "'1'" }],
                                mocks: [{ mockCall: "repository.findOne.mockResolvedValue(mockUser)" }],
                                assertions: [
                                    { assertion: 'expect(result).toEqual(mockUser)' },
                                    { assertion: 'expect(repository.findOne).toHaveBeenCalledWith({ where: { id: "1" } })' },
                                ],
                            },
                        ]],
                },
            ],
            conditions: [
                {
                    expression: 'useTypeORM',
                    description: 'Include TypeORM repository mocking',
                },
            ],
            fragments: [],
            metadata: {
                version: '1.0.0',
                author: 'LANKA System',
                tags: ['typescript', 'jest', 'testing'],
                category: 'Testing',
                usageCount: 0,
                rating: 0,
            },
            createdAt: new Date().toISOString(),
        });
    }
    generateTemplateKey(criteria) {
        const parts = [criteria.language, criteria.type];
        if (criteria.framework) {
            parts.push(criteria.framework.toUpperCase());
        }
        return parts.join('_');
    }
    generateTemplateId() {
        return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getVariableValue(variable, data) {
        const value = data[variable.name] || variable.defaultValue;
        if (value === undefined && variable.required) {
            throw new Error(`Required template variable '${variable.name}' not provided`);
        }
        if (variable.type === 'ARRAY' && Array.isArray(value)) {
            return JSON.stringify(value);
        }
        return String(value || '');
    }
    processCondition(content, condition, data) {
        const conditionRegex = new RegExp(`{{#if ${condition.expression}}}([\\s\\S]*?){{/if}}`, 'g');
        return content.replace(conditionRegex, (match, block) => {
            const conditionResult = this.evaluateCondition(condition.expression, data);
            return conditionResult ? block : '';
        });
    }
    processIterations(content, data) {
        const iterationRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
        return content.replace(iterationRegex, (match, arrayName, block) => {
            const array = data[arrayName];
            if (!Array.isArray(array)) {
                return '';
            }
            return array.map((item, index) => {
                let itemBlock = block;
                // Replace item properties
                if (typeof item === 'object') {
                    Object.keys(item).forEach(key => {
                        const placeholder = new RegExp(`{{${key}}}`, 'g');
                        itemBlock = itemBlock.replace(placeholder, String(item[key]));
                    });
                }
                // Replace index and @last, @first helpers
                itemBlock = itemBlock.replace(/{{@index}}/g, String(index));
                itemBlock = itemBlock.replace(/{{#unless @last}}/g, index < array.length - 1 ? '' : '<!--');
                itemBlock = itemBlock.replace(/{{\/unless}}/g, index < array.length - 1 ? '' : '-->');
                itemBlock = itemBlock.replace(/{{#if @first}}/g, index === 0 ? '' : '<!--');
                itemBlock = itemBlock.replace(/{{#if @last}}/g, index === array.length - 1 ? '' : '<!--');
                return itemBlock;
            }).join('');
        });
    }
    evaluateCondition(expression, data) {
        // Simple condition evaluation
        // In a production system, use a proper expression parser
        const value = data[expression];
        return Boolean(value);
    }
    extractUsedVariables(template) {
        const variableRegex = /{{(\w+)}}/g;
        const variables = [];
        let match;
        while ((match = variableRegex.exec(template)) !== null) {
            const varName = match[1];
            if (!varName.startsWith('#') && !varName.startsWith('/') && !varName.startsWith('@')) {
                variables.push(varName);
            }
        }
        return [...new Set(variables)];
    }
    isValidCondition(expression) {
        // Basic validation - in production, use proper expression validation
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expression);
    }
    formatCode(code, language) {
        // Basic code formatting - remove extra whitespace, normalize line endings
        return code
            .split('\n')
            .map(line => line.trimRight())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n'); // Remove excessive blank lines
    }
}
exports.TemplateEngineService = TemplateEngineService;
//# sourceMappingURL=template-engine.service.js.map