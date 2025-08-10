"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const code_generation_types_1 = require("../types/code-generation.types");
const ai_service_1 = require("./ai.service");
const template_engine_service_1 = require("./template-engine.service");
const code_validator_service_1 = require("./code-validator.service");
class CodeGenerationService {
    neo4j;
    aiService;
    templateEngine;
    codeValidator;
    aiModelConfig;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.aiService = new ai_service_1.AIService();
        this.templateEngine = new template_engine_service_1.TemplateEngineService();
        this.codeValidator = new code_validator_service_1.CodeValidatorService();
    }
    /**
     * Generate code from requirements and architecture decisions
     */
    async generateCode(request) {
        try {
            logger_1.logger.info('Starting code generation', {
                requestId: request.id,
                language: request.language,
                strategy: request.strategy
            });
            const startTime = Date.now();
            const resultId = (0, uuid_1.v4)();
            // Retrieve requirements and architecture data
            const [requirements, architecture] = await Promise.all([
                this.getRequirements(request.requirementIds),
                this.getArchitectureDecisions(request.architectureIds),
            ]);
            // Generate code based on strategy
            let generatedFiles = [];
            let metadata = {};
            switch (request.strategy) {
                case code_generation_types_1.GenerationStrategy.TEMPLATE_BASED:
                    ({ files: generatedFiles, metadata } = await this.generateFromTemplate(request, requirements, architecture));
                    break;
                case code_generation_types_1.GenerationStrategy.AI_ASSISTED:
                    ({ files: generatedFiles, metadata } = await this.generateWithAI(request, requirements, architecture));
                    break;
                case code_generation_types_1.GenerationStrategy.HYBRID:
                    ({ files: generatedFiles, metadata } = await this.generateHybrid(request, requirements, architecture));
                    break;
                case code_generation_types_1.GenerationStrategy.PATTERN_MATCHING:
                    ({ files: generatedFiles, metadata } = await this.generateFromPatterns(request, requirements, architecture));
                    break;
                default:
                    throw new Error(`Unsupported generation strategy: ${request.strategy}`);
            }
            // Validate generated code
            const validation = await this.validateGeneratedCode(generatedFiles, request.validationLevel);
            // Create suggestions
            const suggestions = await this.generateSuggestions(generatedFiles, validation);
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            const result = {
                id: resultId,
                requestId: request.id,
                generatedFiles,
                metadata: {
                    ...metadata,
                    processingTime,
                    strategy: request.strategy,
                    version: '1.0.0',
                    parameters: {
                        language: request.language,
                        templateType: request.templateType,
                        validationLevel: request.validationLevel,
                    },
                },
                validation,
                suggestions,
                status: validation.isValid ? code_generation_types_1.GenerationStatus.COMPLETED : code_generation_types_1.GenerationStatus.FAILED,
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
            };
            // Store result in database
            await this.storeGenerationResult(result);
            // Log generation history
            await this.logGenerationHistory({
                requestId: request.id,
                resultId,
                timestamp: new Date().toISOString(),
                user: request.requestedBy,
                success: validation.isValid,
                duration: processingTime,
                metrics: {
                    filesGenerated: generatedFiles.length,
                    linesGenerated: this.countLinesOfCode(generatedFiles),
                    tokensUsed: metadata.tokenUsage?.totalTokens || 0,
                    cost: metadata.tokenUsage?.cost || 0,
                    qualityScore: validation.score,
                    validationScore: validation.score,
                },
            });
            logger_1.logger.info('Code generation completed', {
                resultId,
                status: result.status,
                filesGenerated: generatedFiles.length,
                processingTime
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Code generation failed', { requestId: request.id, error });
            throw error;
        }
    }
    /**
     * Validate code syntax, quality, security, and performance
     */
    async validateCode(code, language, level) {
        try {
            logger_1.logger.info('Validating code', { language, level });
            const validations = [];
            // Always validate syntax first
            const syntaxValidation = await this.codeValidator.validateSyntax(code, language);
            validations.push(syntaxValidation);
            // Return early if syntax is invalid
            if (!syntaxValidation.isValid) {
                return syntaxValidation;
            }
            // Perform additional validations based on level
            switch (level) {
                case code_generation_types_1.ValidationLevel.FULL:
                    const [qualityValidation, securityValidation, performanceValidation] = await Promise.all([
                        this.codeValidator.validateQuality(code, language),
                        this.codeValidator.validateSecurity(code, language),
                        this.codeValidator.validatePerformance(code, language),
                    ]);
                    validations.push(qualityValidation, securityValidation, performanceValidation);
                    break;
                case code_generation_types_1.ValidationLevel.QUALITY:
                    const qualityResult = await this.codeValidator.validateQuality(code, language);
                    validations.push(qualityResult);
                    break;
                case code_generation_types_1.ValidationLevel.SECURITY:
                    const securityResult = await this.codeValidator.validateSecurity(code, language);
                    validations.push(securityResult);
                    break;
                case code_generation_types_1.ValidationLevel.PERFORMANCE:
                    const performanceResult = await this.codeValidator.validatePerformance(code, language);
                    validations.push(performanceResult);
                    break;
                case code_generation_types_1.ValidationLevel.SEMANTIC:
                    // For semantic validation, we use quality validation as it includes semantic checks
                    const semanticResult = await this.codeValidator.validateQuality(code, language);
                    validations.push(semanticResult);
                    break;
            }
            // Combine validation results
            return this.combineValidationResults(validations, level);
        }
        catch (error) {
            logger_1.logger.error('Code validation failed', { error });
            throw error;
        }
    }
    /**
     * Analyze existing codebase to understand patterns and structure
     */
    async analyzeCodebase(projectId) {
        try {
            logger_1.logger.info('Analyzing codebase', { projectId });
            const query = `
        MATCH (p:Project {id: $projectId})
        OPTIONAL MATCH (p)-[:CONTAINS_CODE]->(cf:CodeFile)
        OPTIONAL MATCH (p)-[:USES_DEPENDENCY]->(d:Dependency)
        OPTIONAL MATCH (p)-[:IMPLEMENTS_PATTERN]->(pattern:Pattern)
        RETURN 
          collect(DISTINCT {
            path: cf.path,
            language: cf.language,
            size: cf.size,
            type: cf.type,
            lastModified: cf.lastModified
          }) as files,
          collect(DISTINCT {
            name: d.name,
            version: d.version,
            type: d.type,
            source: d.source
          }) as dependencies,
          collect(DISTINCT {
            name: pattern.name,
            type: pattern.type,
            confidence: pattern.confidence
          }) as patterns
      `;
            const results = await this.neo4j.executeQuery(query, { projectId });
            if (results.length === 0) {
                return this.createEmptyCodebaseInfo();
            }
            const data = results[0];
            return {
                structure: this.buildDirectoryStructure(data.files || []),
                dependencies: data.dependencies || [],
                patterns: (data.patterns || []).map((p) => ({
                    name: p.name,
                    type: p.type,
                    confidence: p.confidence,
                    locations: [], // TODO: Extract from files
                    examples: [], // TODO: Extract examples
                })),
                metrics: this.calculateCodebaseMetrics(data.files || []),
            };
        }
        catch (error) {
            logger_1.logger.error('Codebase analysis failed', { projectId, error });
            throw error;
        }
    }
    /**
     * Generate tests for existing or generated code
     */
    async generateTests(codeContent, language, framework) {
        try {
            logger_1.logger.info('Generating tests', { language, framework });
            const aiResponse = await this.aiService.generateCode({
                type: 'test-generation',
                sourceCode: codeContent,
                language,
                testFramework: framework,
                includeSetup: true,
                includeTeardown: true,
                generateMocks: true,
            });
            return {
                content: aiResponse.code || '',
                framework,
                coverage: aiResponse.metadata?.estimatedCoverage || 0.8,
            };
        }
        catch (error) {
            logger_1.logger.error('Test generation failed', { error });
            throw error;
        }
    }
    /**
     * Configure AI model settings
     */
    async configurateAIModel(config) {
        try {
            logger_1.logger.info('Configuring AI model', {
                provider: config.provider,
                model: config.model
            });
            this.aiModelConfig = config;
            await this.aiService.configure(config);
            logger_1.logger.info('AI model configured successfully');
        }
        catch (error) {
            logger_1.logger.error('AI model configuration failed', { error });
            throw error;
        }
    }
    /**
     * Get current AI model configuration
     */
    getAIModelConfig() {
        return this.aiModelConfig;
    }
    /**
     * Get generation history for a project
     */
    async getGenerationHistory(projectId, limit = 50) {
        try {
            const query = `
        MATCH (p:Project {id: $projectId})-[:HAS_GENERATION]->(gh:GenerationHistory)
        RETURN gh
        ORDER BY gh.timestamp DESC
        LIMIT $limit
      `;
            const results = await this.neo4j.executeQuery(query, { projectId, limit });
            return results.map((record) => ({
                requestId: record.gh.properties.requestId,
                resultId: record.gh.properties.resultId,
                timestamp: record.gh.properties.timestamp,
                user: record.gh.properties.user,
                success: record.gh.properties.success,
                duration: record.gh.properties.duration,
                metrics: {
                    filesGenerated: record.gh.properties.filesGenerated,
                    linesGenerated: record.gh.properties.linesGenerated,
                    tokensUsed: record.gh.properties.tokensUsed,
                    cost: record.gh.properties.cost,
                    qualityScore: record.gh.properties.qualityScore,
                    validationScore: record.gh.properties.validationScore,
                },
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve generation history', { projectId, error });
            throw error;
        }
    }
    /**
     * Process batch generation requests
     */
    async generateBatch(batchRequest) {
        try {
            logger_1.logger.info('Starting batch code generation', {
                batchId: batchRequest.id,
                requestCount: batchRequest.requests.length
            });
            const startTime = Date.now();
            const results = [];
            let successful = 0;
            let failed = 0;
            let cancelled = 0;
            if (batchRequest.batchOptions.parallel && batchRequest.batchOptions.maxConcurrency > 1) {
                // Parallel processing with concurrency control
                const semaphore = new Array(batchRequest.batchOptions.maxConcurrency).fill(0);
                const promises = batchRequest.requests.map(async (request, index) => {
                    await this.waitForSlot(semaphore, index % batchRequest.batchOptions.maxConcurrency);
                    try {
                        const result = await this.generateCode(request);
                        results[index] = result;
                        if (result.status === code_generation_types_1.GenerationStatus.COMPLETED)
                            successful++;
                        else
                            failed++;
                    }
                    catch (error) {
                        if (batchRequest.batchOptions.continueOnError) {
                            failed++;
                            results[index] = this.createFailedResult(request, error);
                        }
                        else {
                            throw error;
                        }
                    }
                    finally {
                        semaphore[index % batchRequest.batchOptions.maxConcurrency] = 0;
                    }
                });
                await Promise.allSettled(promises);
            }
            else {
                // Sequential processing
                for (const request of batchRequest.requests) {
                    try {
                        const result = await this.generateCode(request);
                        results.push(result);
                        if (result.status === code_generation_types_1.GenerationStatus.COMPLETED)
                            successful++;
                        else
                            failed++;
                    }
                    catch (error) {
                        if (batchRequest.batchOptions.continueOnError) {
                            failed++;
                            results.push(this.createFailedResult(request, error));
                        }
                        else {
                            throw error;
                        }
                    }
                }
            }
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const totalCost = results.reduce((sum, r) => sum + (r.metadata.tokenUsage?.cost || 0), 0);
            const averageQualityScore = results
                .filter(r => r.status === code_generation_types_1.GenerationStatus.COMPLETED)
                .reduce((sum, r) => sum + r.validation.score, 0) / successful || 0;
            return {
                batchId: batchRequest.id,
                results,
                summary: {
                    totalRequests: batchRequest.requests.length,
                    successful,
                    failed,
                    cancelled,
                    totalDuration,
                    totalCost,
                    averageQualityScore,
                },
                status: failed === 0 ? code_generation_types_1.GenerationStatus.COMPLETED : code_generation_types_1.GenerationStatus.FAILED,
                completedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Batch code generation failed', { batchId: batchRequest.id, error });
            throw error;
        }
    }
    // Private methods
    async getRequirements(requirementIds) {
        const query = `
      MATCH (r:Requirement)
      WHERE r.id IN $requirementIds
      RETURN r
    `;
        return this.neo4j.executeQuery(query, { requirementIds });
    }
    async getArchitectureDecisions(architectureIds) {
        const query = `
      MATCH (ad:ArchitectureDecision)
      WHERE ad.id IN $architectureIds
      RETURN ad
    `;
        return this.neo4j.executeQuery(query, { architectureIds });
    }
    async generateFromTemplate(request, requirements, _architecture) {
        logger_1.logger.info('Generating code from template', { templateType: request.templateType });
        const template = await this.templateEngine.loadTemplate({
            type: request.templateType,
            language: request.language,
            framework: request.context.framework,
        });
        const templateData = this.prepareTemplateData(request, requirements, _architecture);
        const renderedCode = await this.templateEngine.renderTemplate(template, templateData);
        const generatedFile = {
            path: this.generateFilePath(request),
            content: renderedCode,
            language: request.language,
            type: request.templateType,
            size: renderedCode.length,
            checksum: this.calculateChecksum(renderedCode),
            dependencies: this.extractDependencies(renderedCode),
            imports: this.extractImports(renderedCode, request.language),
            exports: this.extractExports(renderedCode, request.language),
            functions: this.extractFunctions(renderedCode, request.language),
            classes: this.extractClasses(renderedCode, request.language),
            interfaces: this.extractInterfaces(renderedCode, request.language),
        };
        return {
            files: [generatedFile],
            metadata: {
                template: template.name,
                templateVersion: template.metadata.version,
            },
        };
    }
    async generateWithAI(request, requirements, architecture) {
        logger_1.logger.info('Generating code with AI assistance');
        const aiResponse = await this.aiService.generateCode({
            requirements,
            architecture,
            language: request.language,
            templateType: request.templateType,
            context: request.context,
            customPrompts: request.customPrompts,
        });
        const files = this.processAIResponse(aiResponse, request);
        return {
            files,
            metadata: {
                aiModel: aiResponse.metadata?.aiModel,
                confidence: aiResponse.confidence,
                tokenUsage: aiResponse.metadata?.tokenUsage,
            },
        };
    }
    async generateHybrid(request, requirements, architecture) {
        logger_1.logger.info('Generating code with hybrid strategy');
        // First, generate base code from template
        const templateResult = await this.generateFromTemplate(request, requirements, architecture);
        // Then, enhance with AI
        const enhancedResponse = await this.aiService.generateCode({
            baseCode: templateResult.files[0].content,
            requirements,
            architecture,
            language: request.language,
            enhancementType: 'refine',
            context: request.context,
        });
        const enhancedFiles = this.processAIResponse(enhancedResponse, request);
        return {
            files: enhancedFiles,
            metadata: {
                ...templateResult.metadata,
                aiModel: enhancedResponse.metadata?.aiModel,
                confidence: enhancedResponse.confidence,
                tokenUsage: enhancedResponse.metadata?.tokenUsage,
                hybridStrategy: true,
            },
        };
    }
    async generateFromPatterns(request, requirements, _architecture) {
        logger_1.logger.info('Generating code from patterns');
        // Find matching patterns from codebase
        const codebaseInfo = await this.analyzeCodebase(request.context.projectId);
        const matchingPatterns = this.findMatchingPatterns(codebaseInfo.patterns, requirements);
        // Generate code based on patterns
        const patternBasedCode = await this.generateFromDetectedPatterns(matchingPatterns, request);
        return {
            files: patternBasedCode,
            metadata: {
                matchingPatterns: matchingPatterns.map(p => p.name),
                patternConfidence: matchingPatterns.reduce((avg, p) => avg + p.confidence, 0) / matchingPatterns.length,
            },
        };
    }
    async validateGeneratedCode(files, level) {
        const allValidations = [];
        for (const file of files) {
            const validation = await this.validateCode(file.content, file.language, level);
            allValidations.push(validation);
        }
        return this.combineValidationResults(allValidations, level);
    }
    combineValidationResults(validations, level) {
        const allIssues = validations.flatMap(v => v.issues);
        const isValid = validations.every(v => v.isValid);
        const averageScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
        const combinedMetrics = {
            complexity: this.average(validations.map(v => v.metrics.complexity)),
            maintainability: this.average(validations.map(v => v.metrics.maintainability)),
            reliability: this.average(validations.map(v => v.metrics.reliability)),
            security: this.average(validations.map(v => v.metrics.security)),
            performance: this.average(validations.map(v => v.metrics.performance)),
            testability: this.average(validations.map(v => v.metrics.testability)),
            readability: this.average(validations.map(v => v.metrics.readability)),
            reusability: this.average(validations.map(v => v.metrics.reusability)),
            overall: averageScore,
        };
        return {
            level,
            isValid,
            score: averageScore,
            issues: allIssues,
            metrics: combinedMetrics,
            suggestions: [...new Set(validations.flatMap(v => v.suggestions))],
            validatedAt: new Date().toISOString(),
        };
    }
    async generateSuggestions(files, validation) {
        const suggestions = [];
        // Generate suggestions based on validation issues
        for (const issue of validation.issues) {
            if (issue.suggestion) {
                suggestions.push({
                    id: (0, uuid_1.v4)(),
                    type: this.mapIssueTypeToSuggestionType(issue.type),
                    title: `Fix ${issue.type.toLowerCase()} issue`,
                    description: issue.suggestion,
                    impact: this.mapSeverityToImpact(issue.severity),
                    effort: issue.fixable ? 'LOW' : 'MEDIUM',
                    benefits: [issue.message],
                });
            }
        }
        // Generate improvement suggestions using AI
        for (const file of files) {
            try {
                const aiSuggestions = await this.aiService.suggestImprovements(file.content, file.language);
                suggestions.push(...aiSuggestions);
            }
            catch (error) {
                logger_1.logger.warn('Failed to generate AI suggestions', { file: file.path, error });
            }
        }
        return suggestions;
    }
    async storeGenerationResult(result) {
        const query = `
      CREATE (gr:GenerationResult {
        id: $id,
        requestId: $requestId,
        status: $status,
        filesGenerated: $filesGenerated,
        validationScore: $validationScore,
        createdAt: $createdAt,
        completedAt: $completedAt,
        metadata: $metadata
      })
      WITH gr
      UNWIND $files as fileData
      CREATE (gf:GeneratedFile {
        path: fileData.path,
        language: fileData.language,
        type: fileData.type,
        size: fileData.size,
        checksum: fileData.checksum
      })
      CREATE (gr)-[:GENERATED]->(gf)
    `;
        await this.neo4j.executeQuery(query, {
            id: result.id,
            requestId: result.requestId,
            status: result.status,
            filesGenerated: result.generatedFiles.length,
            validationScore: result.validation.score,
            createdAt: result.createdAt,
            completedAt: result.completedAt,
            metadata: JSON.stringify(result.metadata),
            files: result.generatedFiles.map(f => ({
                path: f.path,
                language: f.language,
                type: f.type,
                size: f.size,
                checksum: f.checksum,
            })),
        });
    }
    async logGenerationHistory(history) {
        const query = `
      CREATE (gh:GenerationHistory {
        requestId: $requestId,
        resultId: $resultId,
        timestamp: $timestamp,
        user: $user,
        success: $success,
        duration: $duration,
        filesGenerated: $filesGenerated,
        linesGenerated: $linesGenerated,
        tokensUsed: $tokensUsed,
        cost: $cost,
        qualityScore: $qualityScore,
        validationScore: $validationScore
      })
    `;
        await this.neo4j.executeQuery(query, {
            requestId: history.requestId,
            resultId: history.resultId,
            timestamp: history.timestamp,
            user: history.user,
            success: history.success,
            duration: history.duration,
            filesGenerated: history.metrics.filesGenerated,
            linesGenerated: history.metrics.linesGenerated,
            tokensUsed: history.metrics.tokensUsed,
            cost: history.metrics.cost,
            qualityScore: history.metrics.qualityScore,
            validationScore: history.metrics.validationScore,
        });
    }
    // Helper methods
    countLinesOfCode(files) {
        return files.reduce((total, file) => total + file.content.split('\n').length, 0);
    }
    average(values) {
        const validValues = values.filter((v) => v !== undefined);
        return validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0;
    }
    mapIssueTypeToSuggestionType(issueType) {
        switch (issueType.toUpperCase()) {
            case 'SECURITY': return 'SECURITY';
            case 'PERFORMANCE': return 'PERFORMANCE';
            case 'QUALITY': return 'BEST_PRACTICE';
            default: return 'OPTIMIZATION';
        }
    }
    mapSeverityToImpact(severity) {
        switch (severity.toUpperCase()) {
            case 'ERROR': return 'HIGH';
            case 'WARNING': return 'MEDIUM';
            case 'INFO': return 'LOW';
            default: return 'MEDIUM';
        }
    }
    createEmptyCodebaseInfo() {
        return {
            structure: { path: '/', type: 'DIRECTORY', children: [] },
            dependencies: [],
            patterns: [],
            metrics: {
                linesOfCode: 0,
                fileCount: 0,
                complexity: 0,
                testCoverage: 0,
                duplication: 0,
                maintainability: 0,
            },
        };
    }
    buildDirectoryStructure(files) {
        // Simplified implementation - build directory tree from file paths
        return {
            path: '/',
            type: 'DIRECTORY',
            children: files.map(f => ({
                path: f.path,
                type: 'FILE',
                language: f.language,
                purpose: f.type,
            })),
        };
    }
    calculateCodebaseMetrics(files) {
        return {
            linesOfCode: files.reduce((sum, f) => sum + (f.size || 0), 0),
            fileCount: files.length,
            complexity: this.average(files.map(f => f.complexity)),
            testCoverage: this.average(files.map(f => f.testCoverage)),
            duplication: this.average(files.map(f => f.duplication)),
            maintainability: this.average(files.map(f => f.maintainability)),
        };
    }
    prepareTemplateData(request, requirements, architecture) {
        return {
            requirements,
            architecture,
            context: request.context,
            language: request.language,
            templateType: request.templateType,
        };
    }
    generateFilePath(request) {
        const extension = this.getFileExtension(request.language);
        const baseName = this.getBaseFileName(request.templateType);
        return `${request.outputPath || 'src'}/${baseName}.${extension}`;
    }
    getFileExtension(language) {
        switch (language) {
            case code_generation_types_1.ProgrammingLanguage.TYPESCRIPT: return 'ts';
            case code_generation_types_1.ProgrammingLanguage.JAVASCRIPT: return 'js';
            case code_generation_types_1.ProgrammingLanguage.PYTHON: return 'py';
            case code_generation_types_1.ProgrammingLanguage.JAVA: return 'java';
            case code_generation_types_1.ProgrammingLanguage.GO: return 'go';
            case code_generation_types_1.ProgrammingLanguage.RUST: return 'rs';
            case code_generation_types_1.ProgrammingLanguage.CSHARP: return 'cs';
            case code_generation_types_1.ProgrammingLanguage.PHP: return 'php';
            case code_generation_types_1.ProgrammingLanguage.RUBY: return 'rb';
            case code_generation_types_1.ProgrammingLanguage.KOTLIN: return 'kt';
            case code_generation_types_1.ProgrammingLanguage.SWIFT: return 'swift';
            default: return 'txt';
        }
    }
    getBaseFileName(templateType) {
        switch (templateType) {
            case code_generation_types_1.CodeTemplateType.SERVICE: return 'service';
            case code_generation_types_1.CodeTemplateType.CONTROLLER: return 'controller';
            case code_generation_types_1.CodeTemplateType.MODEL: return 'model';
            case code_generation_types_1.CodeTemplateType.COMPONENT: return 'component';
            case code_generation_types_1.CodeTemplateType.TEST: return 'test';
            case code_generation_types_1.CodeTemplateType.CONFIG: return 'config';
            case code_generation_types_1.CodeTemplateType.MIDDLEWARE: return 'middleware';
            case code_generation_types_1.CodeTemplateType.UTILITY: return 'util';
            case code_generation_types_1.CodeTemplateType.API_ENDPOINT: return 'api';
            case code_generation_types_1.CodeTemplateType.DATABASE_MIGRATION: return 'migration';
            default: return 'generated';
        }
    }
    calculateChecksum(content) {
        // Simple hash implementation
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    extractDependencies(code) {
        // Extract dependencies from import statements
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        const dependencies = [];
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            dependencies.push(match[1]);
        }
        return [...new Set(dependencies)];
    }
    extractImports(code, language) {
        // Language-specific import extraction
        const importRegex = language === code_generation_types_1.ProgrammingLanguage.PYTHON
            ? /import\s+([^\s\n]+)|from\s+([^\s\n]+)\s+import/g
            : /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]|import\s+['"`]([^'"`]+)['"`]/g;
        const imports = [];
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            imports.push(match[1] || match[2]);
        }
        return [...new Set(imports)];
    }
    extractExports(code, _language) {
        // Language-specific export extraction
        const exportRegex = /export\s+(?:default\s+)?(?:class|interface|function|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
        const exports = [];
        let match;
        while ((match = exportRegex.exec(code)) !== null) {
            exports.push(match[1]);
        }
        return exports;
    }
    extractFunctions(code, _language) {
        // Simplified function extraction
        const functionRegex = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
        const functions = [];
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            functions.push({
                name: match[1],
                parameters: [],
                returnType: 'any',
                visibility: 'PUBLIC',
                isAsync: false,
                complexity: 1,
            });
        }
        return functions;
    }
    extractClasses(code, _language) {
        // Simplified class extraction
        const classRegex = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
        const classes = [];
        let match;
        while ((match = classRegex.exec(code)) !== null) {
            classes.push({
                name: match[1],
                extends: undefined,
                implements: [],
                properties: [],
                methods: [],
                visibility: 'PUBLIC',
                isAbstract: false,
            });
        }
        return classes;
    }
    extractInterfaces(code, _language) {
        // Simplified interface extraction
        const interfaceRegex = /interface\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
        const interfaces = [];
        let match;
        while ((match = interfaceRegex.exec(code)) !== null) {
            interfaces.push({
                name: match[1],
                extends: [],
                properties: [],
                methods: [],
            });
        }
        return interfaces;
    }
    processAIResponse(aiResponse, request) {
        if (aiResponse.files) {
            return aiResponse.files.map((file) => ({
                path: file.path || this.generateFilePath(request),
                content: file.content,
                language: request.language,
                type: file.type || request.templateType,
                size: file.content.length,
                checksum: this.calculateChecksum(file.content),
                dependencies: this.extractDependencies(file.content),
                imports: this.extractImports(file.content, request.language),
                exports: this.extractExports(file.content, request.language),
                functions: this.extractFunctions(file.content, request.language),
                classes: this.extractClasses(file.content, request.language),
                interfaces: this.extractInterfaces(file.content, request.language),
            }));
        }
        else {
            return [{
                    path: this.generateFilePath(request),
                    content: aiResponse.code,
                    language: request.language,
                    type: request.templateType,
                    size: aiResponse.code.length,
                    checksum: this.calculateChecksum(aiResponse.code),
                    dependencies: this.extractDependencies(aiResponse.code),
                    imports: this.extractImports(aiResponse.code, request.language),
                    exports: this.extractExports(aiResponse.code, request.language),
                    functions: this.extractFunctions(aiResponse.code, request.language),
                    classes: this.extractClasses(aiResponse.code, request.language),
                    interfaces: this.extractInterfaces(aiResponse.code, request.language),
                }];
        }
    }
    findMatchingPatterns(patterns, _requirements) {
        // Simplified pattern matching logic
        return patterns.filter(pattern => pattern.confidence > 0.7);
    }
    async generateFromDetectedPatterns(patterns, request) {
        // Simplified pattern-based generation
        const code = `// Generated from patterns: ${patterns.map(p => p.name).join(', ')}`;
        return [{
                path: this.generateFilePath(request),
                content: code,
                language: request.language,
                type: request.templateType,
                size: code.length,
                checksum: this.calculateChecksum(code),
                dependencies: [],
                imports: [],
                exports: [],
                functions: [],
                classes: [],
                interfaces: [],
            }];
    }
    async waitForSlot(semaphore, index) {
        while (semaphore[index] === 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        semaphore[index] = 1;
    }
    createFailedResult(request, error) {
        return {
            id: (0, uuid_1.v4)(),
            requestId: request.id,
            generatedFiles: [],
            metadata: {
                processingTime: 0,
                confidence: 0,
                strategy: request.strategy,
                version: '1.0.0',
                parameters: {
                    error: error.message,
                },
            },
            validation: {
                level: request.validationLevel,
                isValid: false,
                score: 0,
                issues: [{
                        id: (0, uuid_1.v4)(),
                        type: 'SYNTAX',
                        severity: 'ERROR',
                        message: error.message,
                        location: { file: '', line: 0, column: 0 },
                        fixable: false,
                    }],
                metrics: {
                    complexity: 0,
                    maintainability: 0,
                    reliability: 0,
                    security: 0,
                    performance: 0,
                    testability: 0,
                    readability: 0,
                    reusability: 0,
                    overall: 0,
                },
                suggestions: [],
                validatedAt: new Date().toISOString(),
            },
            suggestions: [],
            status: code_generation_types_1.GenerationStatus.FAILED,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
        };
    }
}
exports.CodeGenerationService = CodeGenerationService;
//# sourceMappingURL=code-generation.service.js.map