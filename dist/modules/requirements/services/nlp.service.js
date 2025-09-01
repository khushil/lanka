"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPService = void 0;
const requirement_types_1 = require("../types/requirement.types");
const logger_1 = require("../../../core/logging/logger");
const errors_1 = require("../../../core/errors");
class NLPService {
    async analyzeRequirement(text) {
        return (0, errors_1.withErrorHandling)(async () => {
            // Validate input
            if (!text || text.trim().length === 0) {
                throw errors_1.ErrorWrapper.validation(errors_1.ErrorCode.MISSING_REQUIRED_FIELD, 'Text is required for NLP analysis', { fieldErrors: { text: ['Text cannot be empty'] } });
            }
            if (text.length > 50000) {
                throw errors_1.ErrorWrapper.validation(errors_1.ErrorCode.OUT_OF_RANGE, 'Text exceeds maximum length for analysis', { fieldErrors: { text: ['Text must be less than 50,000 characters'] } });
            }
            logger_1.logger.debug('Starting NLP analysis', { textLength: text.length });
            // Simplified NLP analysis for initial implementation
            // In production, this would use advanced NLP models
            const type = this.classifyRequirementType(text);
            const priority = this.determinePriority(text);
            const suggestedTitle = this.generateTitle(text);
            const entities = this.extractEntities(text);
            const keywords = this.extractKeywords(text);
            const embedding = this.generateEmbedding(text);
            const { completenessScore, qualityScore, suggestions } = this.assessQuality(text);
            logger_1.logger.debug('NLP analysis completed', {
                type,
                priority,
                completenessScore,
                qualityScore
            });
            return {
                type,
                priority,
                suggestedTitle,
                entities,
                keywords,
                embedding,
                completenessScore,
                qualityScore,
                suggestions,
            };
        }, {
            operation: 'nlp_analysis',
            metadata: { textLength: text?.length || 0 }
        })();
    }
    classifyRequirementType(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('as a') && lowerText.includes('i want')) {
            return requirement_types_1.RequirementType.USER_STORY;
        }
        if (lowerText.includes('compliance') || lowerText.includes('regulation')) {
            return requirement_types_1.RequirementType.COMPLIANCE;
        }
        if (lowerText.includes('performance') || lowerText.includes('security') ||
            lowerText.includes('scalability')) {
            return requirement_types_1.RequirementType.NON_FUNCTIONAL;
        }
        if (lowerText.includes('business rule') || lowerText.includes('policy')) {
            return requirement_types_1.RequirementType.BUSINESS_RULE;
        }
        if (lowerText.includes('given') && lowerText.includes('when') &&
            lowerText.includes('then')) {
            return requirement_types_1.RequirementType.ACCEPTANCE_CRITERIA;
        }
        return requirement_types_1.RequirementType.FUNCTIONAL;
    }
    determinePriority(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('critical') || lowerText.includes('must have') ||
            lowerText.includes('essential')) {
            return requirement_types_1.RequirementPriority.CRITICAL;
        }
        if (lowerText.includes('high priority') || lowerText.includes('important')) {
            return requirement_types_1.RequirementPriority.HIGH;
        }
        if (lowerText.includes('low priority') || lowerText.includes('nice to have')) {
            return requirement_types_1.RequirementPriority.LOW;
        }
        return requirement_types_1.RequirementPriority.MEDIUM;
    }
    generateTitle(text) {
        // Extract first meaningful sentence or phrase
        const sentences = text.split(/[.!?]/);
        const firstSentence = sentences[0]?.trim() || text;
        // Limit to reasonable title length
        if (firstSentence.length > 100) {
            return firstSentence.substring(0, 97) + '...';
        }
        return firstSentence;
    }
    extractEntities(text) {
        // Simplified entity extraction
        // In production, use NER models
        const entities = [];
        // Extract capitalized words (potential entities)
        const matches = text.match(/[A-Z][a-z]+/g);
        if (matches) {
            entities.push(...matches);
        }
        return [...new Set(entities)];
    }
    extractKeywords(text) {
        // Simplified keyword extraction
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
        ]);
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
        // Return unique words
        return [...new Set(words)].slice(0, 10);
    }
    generateEmbedding(text) {
        // Simplified embedding generation
        // In production, use sentence transformers or similar
        const embedding = new Array(768).fill(0);
        // Simple hash-based embedding for demo
        for (let i = 0; i < text.length; i++) {
            const idx = i % 768;
            embedding[idx] += text.charCodeAt(i) / 1000;
        }
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    assessQuality(text) {
        let completenessScore = 0;
        let qualityScore = 0;
        const suggestions = [];
        // Check for completeness indicators
        if (text.length > 50)
            completenessScore += 0.2;
        if (text.includes('should') || text.includes('must'))
            completenessScore += 0.2;
        if (text.includes('when') || text.includes('if'))
            completenessScore += 0.2;
        if (text.includes('user') || text.includes('system'))
            completenessScore += 0.2;
        if (text.match(/\d+/))
            completenessScore += 0.2; // Contains numbers/metrics
        // Check for quality indicators
        if (text.length > 30 && text.length < 500)
            qualityScore += 0.25;
        if (!text.includes('etc'))
            qualityScore += 0.25; // Specific, not vague
        if (text.split(/[.!?]/).length > 1)
            qualityScore += 0.25; // Multiple sentences
        if (text.match(/[A-Z]/))
            qualityScore += 0.25; // Proper capitalization
        // Generate suggestions
        if (completenessScore < 0.6) {
            suggestions.push('Consider adding more specific details about the requirement');
        }
        if (!text.includes('user') && !text.includes('system')) {
            suggestions.push('Specify who or what system component this requirement affects');
        }
        if (!text.match(/\d+/) && text.includes('performance')) {
            suggestions.push('Add specific metrics or thresholds for measurability');
        }
        return {
            completenessScore: Math.min(completenessScore, 1),
            qualityScore: Math.min(qualityScore, 1),
            suggestions,
        };
    }
}
exports.NLPService = NLPService;
//# sourceMappingURL=nlp.service.js.map