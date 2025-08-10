"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationEngineService = void 0;
const logger_1 = require("../core/logging/logger");
const requirement_types_1 = require("../modules/requirements/types/requirement.types");
const architecture_types_1 = require("../modules/architecture/types/architecture.types");
const integration_types_1 = require("../types/integration.types");
class RecommendationEngineService {
    neo4j;
    patternWeights;
    qualityAttributeMap;
    constraintExtractors;
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.initializePatternWeights();
        this.initializeQualityAttributeMap();
        this.initializeConstraintExtractors();
    }
    /**
     * Generate comprehensive architecture recommendations based on requirements
     */
    async generateRecommendations(requirements, projectContext) {
        try {
            logger_1.logger.info(`Generating recommendations for ${requirements.length} requirements`);
            // Extract architectural characteristics from requirements
            const characteristics = await this.extractArchitecturalCharacteristics(requirements);
            // Find suitable patterns
            const patternRecommendations = await this.recommendPatterns(requirements, characteristics);
            // Find suitable technologies based on patterns and requirements
            const technologyRecommendations = await this.recommendTechnologies(requirements, patternRecommendations, characteristics);
            // Extract constraints from requirements
            const constraints = this.extractConstraints(requirements);
            // Map quality attributes
            const qualityAttributes = this.mapQualityAttributes(requirements);
            // Generate implementation strategy
            const implementationStrategy = this.generateImplementationStrategy(requirements, patternRecommendations, technologyRecommendations);
            // Generate alternative approaches
            const alternatives = this.generateAlternativeApproaches(requirements, patternRecommendations, technologyRecommendations);
            return {
                patterns: patternRecommendations,
                technologies: technologyRecommendations,
                constraints,
                qualityAttributes,
                implementationStrategy,
                alternatives,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to generate architecture recommendations', error);
            throw error;
        }
    }
    /**
     * Recommend architecture patterns based on requirements
     */
    async recommendPatterns(requirements, characteristics) {
        try {
            // Get all available patterns
            const availablePatterns = await this.getAvailablePatterns();
            const recommendations = [];
            for (const pattern of availablePatterns) {
                const score = this.calculatePatternScore(pattern, requirements, characteristics);
                if (score > 0.5) { // Minimum threshold
                    const recommendation = {
                        pattern,
                        applicabilityScore: score,
                        benefits: this.calculatePatternBenefits(pattern, requirements),
                        risks: this.calculatePatternRisks(pattern, requirements),
                        implementationComplexity: this.assessImplementationComplexity(pattern, requirements),
                        prerequisites: this.identifyPrerequisites(pattern, requirements),
                    };
                    recommendations.push(recommendation);
                }
            }
            // Sort by applicability score
            recommendations.sort((a, b) => b.applicabilityScore - a.applicabilityScore);
            return recommendations.slice(0, 5); // Return top 5
        }
        catch (error) {
            logger_1.logger.error('Failed to recommend patterns', error);
            throw error;
        }
    }
    /**
     * Recommend technology stacks based on patterns and requirements
     */
    async recommendTechnologies(requirements, patternRecommendations, characteristics) {
        try {
            // Get available technology stacks
            const availableStacks = await this.getAvailableTechnologyStacks();
            const recommendations = [];
            for (const stack of availableStacks) {
                const suitabilityScore = this.calculateTechnologySuitability(stack, requirements, patternRecommendations, characteristics);
                if (suitabilityScore > 0.4) { // Minimum threshold
                    const recommendation = {
                        technologyStack: stack,
                        suitabilityScore,
                        alignmentReason: this.generateAlignmentReason(stack, requirements, patternRecommendations),
                        implementationEffort: this.estimateImplementationEffort(stack, requirements),
                        learningCurveImpact: this.assessLearningCurveImpact(stack),
                        riskFactors: this.identifyTechnologyRisks(stack, requirements),
                    };
                    recommendations.push(recommendation);
                }
            }
            // Sort by suitability score
            recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
            return recommendations.slice(0, 3); // Return top 3
        }
        catch (error) {
            logger_1.logger.error('Failed to recommend technologies', error);
            throw error;
        }
    }
    /**
     * Extract architectural constraints from requirements
     */
    extractConstraints(requirements) {
        const constraints = [];
        for (const requirement of requirements) {
            const extractor = this.constraintExtractors.get(requirement.type);
            if (extractor) {
                constraints.push(...extractor(requirement));
            }
            // Common constraint extraction based on keywords
            constraints.push(...this.extractKeywordBasedConstraints(requirement));
        }
        // Remove duplicates and merge similar constraints
        return this.deduplicateConstraints(constraints);
    }
    /**
     * Map requirements to quality attributes
     */
    mapQualityAttributes(requirements) {
        const mappings = [];
        for (const requirement of requirements) {
            const qualityAttributes = this.identifyQualityAttributes(requirement);
            for (const attribute of qualityAttributes) {
                mappings.push({
                    requirement,
                    qualityAttribute: attribute,
                    targetValue: this.extractTargetValue(requirement, attribute),
                    measurementCriteria: this.defineMeasurementCriteria(attribute),
                    architecturalImplication: this.deriveArchitecturalImplication(attribute, requirement),
                    verificationMethod: this.defineVerificationMethod(attribute, requirement),
                });
            }
        }
        return mappings;
    }
    /**
     * Generate implementation strategy
     */
    generateImplementationStrategy(requirements, patterns, technologies) {
        const complexity = this.assessOverallComplexity(requirements, patterns, technologies);
        const dependencies = this.identifyDependencies(requirements);
        let approach;
        if (requirements.length <= 5 && complexity === 'LOW') {
            approach = 'BIG_BANG';
        }
        else if (complexity === 'HIGH' || requirements.length > 15) {
            approach = 'PHASED';
        }
        else if (dependencies.length === 0) {
            approach = 'PARALLEL';
        }
        else {
            approach = 'INCREMENTAL';
        }
        return {
            approach,
            phases: approach === 'PHASED' ? this.generatePhases(requirements, patterns) : undefined,
            dependencies,
            riskMitigations: this.generateRiskMitigations(requirements, patterns, technologies),
            estimatedEffort: this.estimateOverallEffort(requirements, patterns, technologies),
            timeline: this.generateTimeline(approach, requirements.length, complexity),
        };
    }
    /**
     * Generate alternative approaches
     */
    generateAlternativeApproaches(requirements, primaryPatterns, primaryTechnologies) {
        const alternatives = [];
        // Cloud-native alternative
        if (!this.hasCloudNativePattern(primaryPatterns)) {
            alternatives.push({
                name: 'Cloud-Native Architecture',
                description: 'Leverage cloud services and serverless patterns for scalability and cost optimization',
                patterns: ['SERVERLESS', 'EVENT_DRIVEN', 'MICROSERVICES'],
                technologies: ['AWS Lambda', 'Azure Functions', 'Google Cloud Run'],
                pros: [
                    'Reduced operational overhead',
                    'Auto-scaling capabilities',
                    'Pay-per-use cost model',
                    'High availability',
                ],
                cons: [
                    'Vendor lock-in risks',
                    'Cold start latency',
                    'Complexity in debugging',
                    'Learning curve for team',
                ],
                suitabilityConditions: [
                    'Variable workload patterns',
                    'Cost optimization priority',
                    'Team comfortable with cloud services',
                    'Stateless application design',
                ],
            });
        }
        // Monolithic alternative for simpler cases
        if (requirements.length <= 10 && !this.hasHighScalabilityRequirements(requirements)) {
            alternatives.push({
                name: 'Modular Monolith',
                description: 'Single deployable unit with clear module boundaries for simpler operations',
                patterns: ['LAYERED', 'HEXAGONAL'],
                technologies: ['Spring Boot', 'Django', 'Express.js'],
                pros: [
                    'Simpler deployment and testing',
                    'Better performance for small scale',
                    'Easier debugging and monitoring',
                    'Lower operational complexity',
                ],
                cons: [
                    'Scaling limitations',
                    'Technology stack lock-in',
                    'Potential for tight coupling',
                    'Single point of failure',
                ],
                suitabilityConditions: [
                    'Small to medium team size',
                    'Predictable load patterns',
                    'Rapid development requirements',
                    'Limited operational expertise',
                ],
            });
        }
        return alternatives;
    }
    // Private helper methods
    initializePatternWeights() {
        this.patternWeights = new Map([
            [requirement_types_1.RequirementType.NON_FUNCTIONAL, new Map([
                    [architecture_types_1.ArchitecturePatternType.MICROSERVICES, 0.9],
                    [architecture_types_1.ArchitecturePatternType.EVENT_DRIVEN, 0.8],
                    [architecture_types_1.ArchitecturePatternType.SERVERLESS, 0.7],
                    [architecture_types_1.ArchitecturePatternType.CQRS, 0.6],
                    [architecture_types_1.ArchitecturePatternType.LAYERED, 0.4],
                    [architecture_types_1.ArchitecturePatternType.MONOLITHIC, 0.3],
                ])],
            [requirement_types_1.RequirementType.FUNCTIONAL, new Map([
                    [architecture_types_1.ArchitecturePatternType.LAYERED, 0.8],
                    [architecture_types_1.ArchitecturePatternType.HEXAGONAL, 0.7],
                    [architecture_types_1.ArchitecturePatternType.MICROSERVICES, 0.6],
                    [architecture_types_1.ArchitecturePatternType.MONOLITHIC, 0.7],
                    [architecture_types_1.ArchitecturePatternType.EVENT_DRIVEN, 0.5],
                ])],
            [requirement_types_1.RequirementType.BUSINESS, new Map([
                    [architecture_types_1.ArchitecturePatternType.LAYERED, 0.8],
                    [architecture_types_1.ArchitecturePatternType.HEXAGONAL, 0.7],
                    [architecture_types_1.ArchitecturePatternType.MICROSERVICES, 0.6],
                    [architecture_types_1.ArchitecturePatternType.SAGA, 0.5],
                ])],
        ]);
    }
    initializeQualityAttributeMap() {
        this.qualityAttributeMap = new Map([
            ['performance', ['scalability', 'throughput', 'latency', 'response time']],
            ['security', ['authentication', 'authorization', 'encryption', 'compliance']],
            ['reliability', ['availability', 'fault tolerance', 'disaster recovery']],
            ['maintainability', ['modularity', 'testability', 'documentation']],
            ['usability', ['user experience', 'accessibility', 'internationalization']],
        ]);
    }
    initializeConstraintExtractors() {
        this.constraintExtractors = new Map([
            [requirement_types_1.RequirementType.NON_FUNCTIONAL, (req) => this.extractNonFunctionalConstraints(req)],
            [requirement_types_1.RequirementType.COMPLIANCE, (req) => this.extractComplianceConstraints(req)],
            [requirement_types_1.RequirementType.BUSINESS_RULE, (req) => this.extractBusinessRuleConstraints(req)],
        ]);
    }
    async extractArchitecturalCharacteristics(requirements) {
        const characteristics = {
            scalabilityNeeds: 'MEDIUM',
            performanceRequirements: [],
            securityRequirements: [],
            complianceRequirements: [],
            integrationComplexity: 'MEDIUM',
            dataConsistencyNeeds: 'EVENTUAL',
            teamExpertise: await this.assessTeamExpertise(),
        };
        for (const requirement of requirements) {
            // Extract scalability needs
            if (this.hasScalabilityKeywords(requirement.description)) {
                characteristics.scalabilityNeeds = 'HIGH';
            }
            // Extract performance requirements
            const perfReqs = this.extractPerformanceRequirements(requirement);
            characteristics.performanceRequirements.push(...perfReqs);
            // Extract security requirements
            if (this.hasSecurityKeywords(requirement.description)) {
                characteristics.securityRequirements.push(requirement.id);
            }
            // Extract compliance requirements
            if (requirement.type === requirement_types_1.RequirementType.COMPLIANCE) {
                characteristics.complianceRequirements.push(requirement.id);
            }
        }
        return characteristics;
    }
    async getAvailablePatterns() {
        const query = `
      MATCH (p:ArchitecturePattern)
      RETURN p
      ORDER BY p.successRate DESC, p.adoptionCount DESC
    `;
        const results = await this.neo4j.executeQuery(query);
        return results.map(result => this.mapNodeToArchitecturePattern(result.p));
    }
    async getAvailableTechnologyStacks() {
        const query = `
      MATCH (ts:TechnologyStack)
      RETURN ts
      ORDER BY ts.successRate DESC, ts.teamExpertise DESC
    `;
        const results = await this.neo4j.executeQuery(query);
        return results.map(result => this.mapNodeToTechnologyStack(result.ts));
    }
    calculatePatternScore(pattern, requirements, characteristics) {
        let score = 0;
        let totalWeight = 0;
        for (const requirement of requirements) {
            const weight = this.patternWeights.get(requirement.type)?.get(pattern.type) || 0.1;
            score += weight * this.calculateRequirementPatternAlignment(requirement, pattern);
            totalWeight += weight;
        }
        // Normalize score
        const baseScore = totalWeight > 0 ? score / totalWeight : 0;
        // Apply characteristic bonuses
        let characteristicBonus = 0;
        if (characteristics) {
            characteristicBonus = this.calculateCharacteristicBonus(pattern, characteristics);
        }
        // Apply pattern success rate
        const successRateBonus = pattern.successRate * 0.1;
        return Math.min(1.0, baseScore + characteristicBonus + successRateBonus);
    }
    calculateRequirementPatternAlignment(requirement, pattern) {
        let alignment = 0.5; // Base alignment
        // Check applicability conditions
        for (const condition of pattern.applicabilityConditions) {
            if (requirement.description.toLowerCase().includes(condition.toLowerCase())) {
                alignment += 0.1;
            }
        }
        // Check quality attributes alignment
        for (const qa of pattern.qualityAttributes) {
            if (this.requirementMatchesQualityAttribute(requirement, qa.name)) {
                alignment += qa.impact === 'POSITIVE' ? 0.15 : -0.1;
            }
        }
        return Math.min(1.0, Math.max(0.0, alignment));
    }
    calculateTechnologySuitability(stack, requirements, patterns, characteristics) {
        let score = 0;
        // Base score from team expertise
        score += (stack.teamExpertise || 0.5) * 0.3;
        // Score from success rate
        score += (stack.successRate || 0.5) * 0.2;
        // Score from pattern compatibility
        const patternCompatibility = this.calculatePatternCompatibility(stack, patterns);
        score += patternCompatibility * 0.3;
        // Score from requirement alignment
        const requirementAlignment = this.calculateTechnologyRequirementAlignment(stack, requirements);
        score += requirementAlignment * 0.2;
        return Math.min(1.0, score);
    }
    calculatePatternBenefits(pattern, requirements) {
        const benefits = [];
        // Add quality attribute benefits
        for (const qa of pattern.qualityAttributes) {
            if (qa.impact === 'POSITIVE') {
                benefits.push(`Improves ${qa.name}: ${qa.description}`);
            }
        }
        // Add pattern-specific benefits based on requirements
        if (pattern.type === architecture_types_1.ArchitecturePatternType.MICROSERVICES) {
            if (this.hasScalabilityRequirements(requirements)) {
                benefits.push('Enables independent scaling of services');
                benefits.push('Supports technology diversity');
            }
        }
        return benefits;
    }
    calculatePatternRisks(pattern, requirements) {
        const risks = [];
        // Add quality attribute risks
        for (const qa of pattern.qualityAttributes) {
            if (qa.impact === 'NEGATIVE') {
                risks.push(`May negatively impact ${qa.name}: ${qa.description}`);
            }
        }
        // Add pattern-specific risks
        if (pattern.type === architecture_types_1.ArchitecturePatternType.MICROSERVICES) {
            risks.push('Increased operational complexity');
            risks.push('Network latency and reliability concerns');
            risks.push('Distributed system debugging challenges');
        }
        return risks;
    }
    extractKeywordBasedConstraints(requirement) {
        const constraints = [];
        const description = requirement.description.toLowerCase();
        // Performance constraints
        if (description.includes('performance') || description.includes('latency') || description.includes('throughput')) {
            constraints.push({
                type: integration_types_1.ConstraintType.PERFORMANCE,
                description: 'Performance requirements must be met',
                impact: 'HIGH',
                mandatory: true,
                validationCriteria: ['Load testing', 'Performance benchmarking'],
            });
        }
        // Security constraints
        if (description.includes('security') || description.includes('authentication') || description.includes('authorization')) {
            constraints.push({
                type: integration_types_1.ConstraintType.SECURITY,
                description: 'Security requirements must be implemented',
                impact: 'HIGH',
                mandatory: true,
                validationCriteria: ['Security audit', 'Penetration testing'],
            });
        }
        return constraints;
    }
    extractNonFunctionalConstraints(requirement) {
        // Implementation for extracting non-functional constraints
        return [];
    }
    extractComplianceConstraints(requirement) {
        // Implementation for extracting compliance constraints
        return [];
    }
    extractBusinessRuleConstraints(requirement) {
        // Implementation for extracting business rule constraints
        return [];
    }
    deduplicateConstraints(constraints) {
        const seen = new Set();
        return constraints.filter(constraint => {
            const key = `${constraint.type}-${constraint.description}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    identifyQualityAttributes(requirement) {
        const attributes = [];
        const description = requirement.description.toLowerCase();
        for (const [attribute, keywords] of this.qualityAttributeMap.entries()) {
            if (keywords.some(keyword => description.includes(keyword))) {
                attributes.push(attribute);
            }
        }
        return attributes;
    }
    mapNodeToArchitecturePattern(node) {
        return {
            id: node.properties.id,
            name: node.properties.name,
            type: node.properties.type,
            description: node.properties.description,
            applicabilityConditions: node.properties.applicabilityConditions || [],
            components: node.properties.components || [],
            qualityAttributes: node.properties.qualityAttributes || [],
            knownUses: node.properties.knownUses || [],
            successRate: node.properties.successRate || 0.5,
            adoptionCount: node.properties.adoptionCount || 0,
            createdAt: node.properties.createdAt,
            updatedAt: node.properties.updatedAt,
        };
    }
    mapNodeToTechnologyStack(node) {
        return {
            id: node.properties.id,
            name: node.properties.name,
            description: node.properties.description,
            layers: node.properties.layers || [],
            compatibility: node.properties.compatibility || { compatible: [], incompatible: [], requires: {} },
            performanceMetrics: node.properties.performanceMetrics || {},
            costEstimate: node.properties.costEstimate || { upfront: 0, monthly: 0, yearly: 0, currency: 'USD', breakdown: [] },
            teamExpertise: node.properties.teamExpertise,
            successRate: node.properties.successRate,
            createdAt: node.properties.createdAt,
            updatedAt: node.properties.updatedAt,
        };
    }
    // Additional helper methods would be implemented here
    hasScalabilityKeywords(description) {
        const keywords = ['scalable', 'scale', 'concurrent', 'users', 'load', 'traffic'];
        return keywords.some(keyword => description.toLowerCase().includes(keyword));
    }
    hasSecurityKeywords(description) {
        const keywords = ['secure', 'security', 'authentication', 'authorization', 'encrypt', 'compliance'];
        return keywords.some(keyword => description.toLowerCase().includes(keyword));
    }
    extractPerformanceRequirements(requirement) {
        // Extract specific performance requirements
        return [];
    }
    async assessTeamExpertise() {
        // Assess team expertise based on project history
        return 0.7;
    }
    calculateCharacteristicBonus(pattern, characteristics) {
        // Calculate bonus based on architectural characteristics
        return 0.1;
    }
    requirementMatchesQualityAttribute(requirement, attributeName) {
        return requirement.description.toLowerCase().includes(attributeName.toLowerCase());
    }
    calculatePatternCompatibility(stack, patterns) {
        // Calculate how well the technology stack supports the recommended patterns
        return 0.7;
    }
    calculateTechnologyRequirementAlignment(stack, requirements) {
        // Calculate how well the technology stack aligns with requirements
        return 0.6;
    }
    hasScalabilityRequirements(requirements) {
        return requirements.some(req => this.hasScalabilityKeywords(req.description));
    }
    hasCloudNativePattern(patterns) {
        return patterns.some(p => p.pattern.type === architecture_types_1.ArchitecturePatternType.SERVERLESS ||
            p.pattern.type === architecture_types_1.ArchitecturePatternType.EVENT_DRIVEN);
    }
    hasHighScalabilityRequirements(requirements) {
        return requirements.some(req => req.description.toLowerCase().includes('concurrent') ||
            req.description.toLowerCase().includes('scale') ||
            req.description.toLowerCase().includes('load'));
    }
    // Additional helper methods would continue here...
    assessImplementationComplexity(pattern, requirements) {
        return 'MEDIUM';
    }
    identifyPrerequisites(pattern, requirements) {
        return [];
    }
    generateAlignmentReason(stack, requirements, patterns) {
        return 'Technology stack aligns well with requirements and recommended patterns';
    }
    estimateImplementationEffort(stack, requirements) {
        return 40;
    }
    assessLearningCurveImpact(stack) {
        return 'MODERATE';
    }
    identifyTechnologyRisks(stack, requirements) {
        return [];
    }
    assessOverallComplexity(requirements, patterns, technologies) {
        return 'MEDIUM';
    }
    identifyDependencies(requirements) {
        return [];
    }
    generatePhases(requirements, patterns) {
        return [];
    }
    generateRiskMitigations(requirements, patterns, technologies) {
        return [];
    }
    estimateOverallEffort(requirements, patterns, technologies) {
        return 120;
    }
    generateTimeline(approach, requirementCount, complexity) {
        return '3-6 months';
    }
    extractTargetValue(requirement, attribute) {
        return undefined;
    }
    defineMeasurementCriteria(attribute) {
        return `Measurement criteria for ${attribute}`;
    }
    deriveArchitecturalImplication(attribute, requirement) {
        return `Architectural implication for ${attribute}`;
    }
    defineVerificationMethod(attribute, requirement) {
        return `Verification method for ${attribute}`;
    }
}
exports.RecommendationEngineService = RecommendationEngineService;
//# sourceMappingURL=recommendation-engine.service.js.map