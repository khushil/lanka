"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerationService = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../../core/logging/logger");
const code_generation_types_1 = require("../types/code-generation.types");
const template_service_1 = require("./code-generation/template.service");
const validation_service_1 = require("./code-generation/validation.service");
const ai_integration_service_1 = require("./code-generation/ai-integration.service");
/**
 * Refactored CodeGenerationService - Core orchestration logic only
 * Template, validation, and AI integration logic extracted to separate services
 * Now maintains single responsibility principle with < 300 lines
 */
class CodeGenerationService {
    neo4j;
    templateService;
    validationService;
    aiIntegrationService;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.templateService = new template_service_1.TemplateService();
        this.validationService = new validation_service_1.ValidationService();
        this.aiIntegrationService = new ai_integration_service_1.AIIntegrationService();
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
                    ({ files: generatedFiles, metadata } = await this.templateService.generateFromTemplate(request, requirements, architecture));
                    break;
                case code_generation_types_1.GenerationStrategy.AI_ASSISTED:
                    ({ files: generatedFiles, metadata } = await this.aiIntegrationService.generateWithAI(request, requirements, architecture));
                    break;
                case code_generation_types_1.GenerationStrategy.HYBRID:
                    const templateResult = await this.templateService.generateFromTemplate(request, requirements, architecture);
                    ({ files: generatedFiles, metadata } = await this.aiIntegrationService.generateHybrid(request, requirements, architecture, templateResult.files[0].content));
                    break;
                case code_generation_types_1.GenerationStrategy.PATTERN_MATCHING:
                    ({ files: generatedFiles, metadata } = await this.generateFromPatterns(request, requirements, architecture));
                    break;
                default:
                    throw new Error(`Unsupported generation strategy: ${request.strategy}`);
            }
            // Validate generated code
            const validation = await this.validationService.validateGeneratedFiles(generatedFiles, request.validationLevel);
            // Create suggestions
            const suggestions = await this.aiIntegrationService.generateSuggestions(generatedFiles);
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
        return this.validationService.validateCode(code, language, level);
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
        return this.aiIntegrationService.generateTests(codeContent, language, framework);
    }
    /**
     * Configure AI model settings
     */
    async configurateAIModel(config) {
        await this.aiIntegrationService.configure(config);
    }
    /**
     * Get current AI model configuration
     */
    getAIModelConfig() {
        return this.aiIntegrationService.getConfig();
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
    async generateFromPatterns(request, requirements, _architecture) {
        logger_1.logger.info('Generating code from patterns');
        // Find matching patterns from codebase
        const codebaseInfo = await this.analyzeCodebase(request.context.projectId);
        const matchingPatterns = this.findMatchingPatterns(codebaseInfo.patterns, requirements);
        // Generate code based on patterns using AI integration
        const patternBasedCode = await this.aiIntegrationService.generateFromPatterns(matchingPatterns, request);
        return {
            files: patternBasedCode,
            metadata: {
                matchingPatterns: matchingPatterns.map(p => p.name),
                patternConfidence: matchingPatterns.reduce((avg, p) => avg + p.confidence, 0) / matchingPatterns.length,
            },
        };
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
    findMatchingPatterns(patterns, _requirements) {
        // Simplified pattern matching logic
        return patterns.filter(pattern => pattern.confidence > 0.7);
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
    average(values) {
        const validValues = values.filter((v) => v !== undefined);
        return validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0;
    }
}
exports.CodeGenerationService = CodeGenerationService;
//# sourceMappingURL=code-generation.service.js.map