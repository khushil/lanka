# LANKA API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with the LANKA Architecture Intelligence API. Learn how to effectively use the Requirements and Architecture modules together to build intelligent, requirements-driven development workflows.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication Setup](#authentication-setup)
- [Core Integration Patterns](#core-integration-patterns)
- [Requirements Workflow](#requirements-workflow)
- [Architecture Intelligence](#architecture-intelligence)
- [Cross-Module Integration](#cross-module-integration)
- [Real-time Updates](#real-time-updates)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [SDK Examples](#sdk-examples)

---

## Quick Start

### 1. API Credentials

```bash
# Register for API access
curl -X POST https://api.lanka.ai/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@company.com",
    "organization": "Your Company",
    "useCase": "Requirements Management Integration"
  }'
```

### 2. Obtain Access Token

```bash
# Login to get JWT token
curl -X POST https://api.lanka.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@company.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-here",
  "expiresIn": 86400,
  "tokenType": "Bearer"
}
```

### 3. First API Call

```javascript
const token = 'your-jwt-token';

// Test API connection
const response = await fetch('https://api.lanka.ai/v2/health', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const health = await response.json();
console.log('API Status:', health.status); // "healthy"
```

---

## Authentication Setup

### JWT Token Management

```javascript
class LankaAPIClient {
  constructor(baseURL = 'https://api.lanka.ai/v2') {
    this.baseURL = baseURL;
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  async authenticate(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const auth = await response.json();
    this.token = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    this.tokenExpiry = Date.now() + (auth.expiresIn * 1000);
    
    return auth;
  }

  async ensureValidToken() {
    if (!this.token || Date.now() >= this.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const auth = await response.json();
    this.token = auth.accessToken;
    this.tokenExpiry = Date.now() + (auth.expiresIn * 1000);
  }

  async apiCall(endpoint, options = {}) {
    await this.ensureValidToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    return response.json();
  }
}
```

### Environment-Based Configuration

```javascript
// config.js
const config = {
  development: {
    apiURL: 'http://localhost:4000',
    timeout: 10000,
    retries: 3
  },
  staging: {
    apiURL: 'https://staging-api.lanka.ai/v2',
    timeout: 15000,
    retries: 2
  },
  production: {
    apiURL: 'https://api.lanka.ai/v2',
    timeout: 30000,
    retries: 1
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

---

## Core Integration Patterns

### 1. Requirements-First Workflow

This pattern starts with requirements and generates architecture recommendations:

```javascript
class RequirementsFirstIntegration {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async createRequirementWithArchitecture(requirementData) {
    // Step 1: Create requirement
    const requirement = await this.api.apiCall('/requirements', {
      method: 'POST',
      body: JSON.stringify(requirementData)
    });

    console.log('Created requirement:', requirement.requirement.id);

    // Step 2: Generate architecture recommendations
    const recommendations = await this.api.apiCall(
      `/integration/recommendations/${requirement.requirement.id}`
    );

    console.log('Generated recommendations:', {
      confidence: recommendations.confidence,
      patterns: recommendations.recommendedPatterns.length,
      technologies: recommendations.recommendedTechnologies.length
    });

    // Step 3: Create architecture decisions based on top recommendations
    const architectureDecisions = [];
    
    for (const patternRec of recommendations.recommendedPatterns.slice(0, 2)) {
      const decision = await this.createArchitectureDecision({
        title: `Apply ${patternRec.pattern.name} Pattern`,
        description: `Implement ${patternRec.pattern.name} pattern for requirement: ${requirement.requirement.title}`,
        rationale: patternRec.benefits.join('. ') + '.',
        requirementIds: [requirement.requirement.id],
        patternIds: [patternRec.pattern.id]
      });
      
      architectureDecisions.push(decision);
    }

    // Step 4: Create mappings between requirements and architecture
    const mappings = [];
    
    for (const decision of architectureDecisions) {
      const mapping = await this.api.apiCall('/integration/mappings', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: requirement.requirement.id,
          architectureDecisionId: decision.id,
          mappingType: 'DIRECT',
          confidence: 0.85,
          rationale: `Generated from AI recommendations with high confidence`
        })
      });
      
      mappings.push(mapping);
    }

    return {
      requirement: requirement.requirement,
      recommendations,
      architectureDecisions,
      mappings
    };
  }

  async createArchitectureDecision(decisionData) {
    return this.api.apiCall('/architecture/decisions', {
      method: 'POST',
      body: JSON.stringify(decisionData)
    });
  }
}
```

### 2. Architecture-First Workflow

This pattern starts with architecture decisions and identifies supporting requirements:

```javascript
class ArchitectureFirstIntegration {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async createArchitectureWithRequirements(architectureData) {
    // Step 1: Create architecture decision
    const decision = await this.api.apiCall('/architecture/decisions', {
      method: 'POST',
      body: JSON.stringify(architectureData)
    });

    // Step 2: Find related requirements
    const relatedRequirements = await this.api.apiCall(
      `/search/requirements-by-architecture?architectureDecisionId=${decision.id}`
    );

    // Step 3: Validate alignment for each requirement
    const alignments = [];
    
    for (const requirement of relatedRequirements) {
      const alignment = await this.api.apiCall('/integration/validation', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: requirement.id,
          architectureDecisionId: decision.id
        })
      });
      
      alignments.push(alignment);
    }

    // Step 4: Create mappings for well-aligned requirements
    const mappings = [];
    
    for (const alignment of alignments) {
      if (alignment.alignmentScore > 0.7) {
        const mapping = await this.api.apiCall('/integration/mappings', {
          method: 'POST',
          body: JSON.stringify({
            requirementId: alignment.requirementId,
            architectureDecisionId: alignment.architectureDecisionId,
            mappingType: 'INFLUENCED',
            confidence: alignment.alignmentScore,
            rationale: `High alignment score: ${alignment.alignmentScore.toFixed(2)}`
          })
        });
        
        mappings.push(mapping);
      }
    }

    return {
      architectureDecision: decision,
      relatedRequirements,
      alignments,
      mappings
    };
  }
}
```

### 3. Bidirectional Sync Pattern

Keep requirements and architecture in sync with automated triggers:

```javascript
class BidirectionalSyncIntegration {
  constructor(apiClient) {
    this.api = apiClient;
    this.eventHandlers = new Map();
  }

  async setupWebhooks(webhookURL) {
    // Register webhook for requirement changes
    await this.api.apiCall('/webhooks/register', {
      method: 'POST',
      body: JSON.stringify({
        url: webhookURL,
        events: [
          'requirement.created',
          'requirement.updated',
          'architecture.decision.created',
          'architecture.decision.updated'
        ]
      })
    });
  }

  registerEventHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  async handleWebhookEvent(event) {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      await handler(event);
    }
  }

  // Event handlers
  async onRequirementUpdated(event) {
    console.log('Requirement updated:', event.data.id);
    
    // Analyze impact on existing architecture
    const impact = await this.api.apiCall(
      `/requirements/${event.data.id}/impact`
    );

    // If high impact, generate new recommendations
    if (impact.changeComplexity === 'HIGH') {
      const recommendations = await this.api.apiCall(
        `/integration/recommendations/${event.data.id}`
      );
      
      // Notify architects about significant changes
      await this.notifyArchitects(event.data, impact, recommendations);
    }

    // Update affected mappings
    await this.updateAffectedMappings(event.data.id, impact);
  }

  async onArchitectureDecisionUpdated(event) {
    console.log('Architecture decision updated:', event.data.id);
    
    // Find all requirements mapped to this decision
    const mappings = await this.api.apiCall(
      `/integration/mappings?architectureDecisionId=${event.data.id}`
    );

    // Re-validate alignments
    for (const mapping of mappings) {
      const alignment = await this.api.apiCall('/integration/validation', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: mapping.requirementId,
          architectureDecisionId: event.data.id
        })
      });

      // Update mapping confidence if alignment changed significantly
      if (Math.abs(mapping.confidence - alignment.alignmentScore) > 0.2) {
        await this.api.apiCall(`/integration/mappings/${mapping.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            confidence: alignment.alignmentScore,
            rationale: `Updated based on architecture change: ${alignment.alignmentType}`
          })
        });
      }
    }
  }

  async updateAffectedMappings(requirementId, impact) {
    // Implementation for updating mappings based on impact analysis
    for (const change of impact.cascadingChanges) {
      if (change.changeType === 'UPDATE' && change.targetType === 'ARCHITECTURE_DECISION') {
        // Update the mapping
        console.log(`Updating mapping for architecture decision: ${change.targetId}`);
      }
    }
  }

  async notifyArchitects(requirement, impact, recommendations) {
    // Implementation for notifying architects
    console.log('Notifying architects of high-impact requirement change:', {
      requirementId: requirement.id,
      impact: impact.changeComplexity,
      recommendations: recommendations.recommendedPatterns.length
    });
  }
}
```

---

## Requirements Workflow

### Creating and Analyzing Requirements

```javascript
class RequirementsWorkflow {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async createRequirement(requirementData) {
    // Create requirement with AI analysis
    const result = await this.api.apiCall('/requirements', {
      method: 'POST',
      body: JSON.stringify(requirementData)
    });

    const { requirement, analysis } = result;
    
    console.log('Requirement created:', {
      id: requirement.id,
      completenessScore: analysis.completenessScore,
      qualityScore: analysis.qualityScore,
      suggestions: analysis.suggestions.length,
      similarRequirements: analysis.similarRequirements.length
    });

    // Process improvement suggestions
    if (analysis.completenessScore < 0.8) {
      console.warn('Requirement may be incomplete. Suggestions:', analysis.suggestions);
    }

    // Handle similar requirements
    if (analysis.similarRequirements.length > 0) {
      await this.handleSimilarRequirements(requirement.id, analysis.similarRequirements);
    }

    return { requirement, analysis };
  }

  async handleSimilarRequirements(requirementId, similarRequirements) {
    for (const similar of similarRequirements) {
      if (similar.similarity > 0.9) {
        console.log('Found highly similar requirement:', {
          id: similar.requirementId,
          similarity: similar.similarity,
          project: similar.projectName
        });

        // Create similarity relationship
        await this.api.apiCall('/requirements/link', {
          method: 'POST',
          body: JSON.stringify({
            requirement1Id: requirementId,
            requirement2Id: similar.requirementId,
            relationship: 'SIMILAR',
            metadata: {
              similarity: similar.similarity,
              adaptationGuidelines: similar.adaptationGuidelines
            }
          })
        });
      }
    }
  }

  async detectConflicts(requirementId) {
    const conflicts = await this.api.apiCall(`/requirements/${requirementId}/conflicts`);
    
    for (const conflict of conflicts) {
      console.warn('Requirement conflict detected:', {
        conflictType: conflict.conflictType,
        severity: conflict.severity,
        conflictingWith: conflict.requirement2.title,
        suggestions: conflict.resolutionSuggestions
      });

      // Auto-resolve low-severity conflicts if suggestions are available
      if (conflict.severity === 'LOW' && conflict.resolutionSuggestions.length > 0) {
        await this.resolveConflict(conflict.id, conflict.resolutionSuggestions[0]);
      }
    }

    return conflicts;
  }

  async resolveConflict(conflictId, resolution) {
    return this.api.apiCall('/requirements/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({
        conflictId,
        resolution,
        resolvedBy: 'system-auto-resolve'
      })
    });
  }

  async trackRequirementProgress(requirementId) {
    // Get current requirement state
    const requirement = await this.api.apiCall(`/requirements/${requirementId}?include=mappings,conflicts,similar`);
    
    // Get impact analysis
    const impact = await this.api.apiCall(`/requirements/${requirementId}/impact`);
    
    // Calculate progress metrics
    const progress = {
      requirement: requirement.requirement,
      mappingCount: requirement.mappings?.length || 0,
      conflictCount: requirement.conflicts?.length || 0,
      similarCount: requirement.similarRequirements?.length || 0,
      impactComplexity: impact.changeComplexity,
      estimatedEffort: impact.estimatedEffort,
      completeness: requirement.requirement.completenessScore,
      quality: requirement.requirement.qualityScore
    };

    return progress;
  }
}
```

---

## Architecture Intelligence

### Pattern Recommendations and Decision Support

```javascript
class ArchitectureIntelligence {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async generateRecommendations(requirementId, constraints = []) {
    // Get AI-powered recommendations
    const recommendations = await this.api.apiCall(
      `/integration/recommendations/${requirementId}`
    );

    // Filter by constraints if provided
    if (constraints.length > 0) {
      recommendations.recommendedPatterns = recommendations.recommendedPatterns.filter(
        pattern => this.matchesConstraints(pattern, constraints)
      );
    }

    // Rank recommendations by applicability and confidence
    const rankedPatterns = this.rankPatternRecommendations(
      recommendations.recommendedPatterns,
      recommendations.confidence
    );

    const rankedTechnologies = this.rankTechnologyRecommendations(
      recommendations.recommendedTechnologies,
      recommendations.confidence
    );

    return {
      ...recommendations,
      rankedPatterns,
      rankedTechnologies,
      implementationStrategy: this.optimizeImplementationStrategy(
        recommendations.implementationStrategy,
        rankedPatterns,
        rankedTechnologies
      )
    };
  }

  matchesConstraints(pattern, constraints) {
    return constraints.every(constraint => {
      switch (constraint.type) {
        case 'PERFORMANCE':
          return pattern.pattern.qualityAttributes.some(
            qa => qa.name === 'PERFORMANCE' && qa.impact === 'POSITIVE'
          );
        case 'SCALABILITY':
          return pattern.pattern.qualityAttributes.some(
            qa => qa.name === 'SCALABILITY' && qa.impact === 'POSITIVE'
          );
        case 'COMPLEXITY':
          return pattern.implementationComplexity !== 'VERY_HIGH';
        default:
          return true;
      }
    });
  }

  rankPatternRecommendations(patterns, overallConfidence) {
    return patterns
      .map(pattern => ({
        ...pattern,
        compositeScore: this.calculatePatternScore(pattern, overallConfidence)
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  calculatePatternScore(pattern, overallConfidence) {
    const weights = {
      applicabilityScore: 0.4,
      successRate: 0.3,
      overallConfidence: 0.2,
      complexity: 0.1
    };

    const complexityScore = {
      'LOW': 1.0,
      'MEDIUM': 0.8,
      'HIGH': 0.6,
      'VERY_HIGH': 0.4
    }[pattern.implementationComplexity];

    return (
      pattern.applicabilityScore * weights.applicabilityScore +
      pattern.pattern.successRate * weights.successRate +
      overallConfidence * weights.overallConfidence +
      complexityScore * weights.complexity
    );
  }

  rankTechnologyRecommendations(technologies, overallConfidence) {
    return technologies
      .map(tech => ({
        ...tech,
        compositeScore: this.calculateTechnologyScore(tech, overallConfidence)
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  calculateTechnologyScore(technology, overallConfidence) {
    const weights = {
      suitabilityScore: 0.35,
      teamExpertise: 0.25,
      overallConfidence: 0.2,
      learningCurve: 0.1,
      riskFactors: 0.1
    };

    const learningCurveScore = {
      'MINIMAL': 1.0,
      'MODERATE': 0.8,
      'SIGNIFICANT': 0.6,
      'MAJOR': 0.4
    }[technology.learningCurveImpact];

    const riskScore = Math.max(0, 1.0 - (technology.riskFactors.length * 0.1));

    return (
      technology.suitabilityScore * weights.suitabilityScore +
      (technology.technologyStack.teamExpertise || 0.5) * weights.teamExpertise +
      overallConfidence * weights.overallConfidence +
      learningCurveScore * weights.learningCurve +
      riskScore * weights.riskFactors
    );
  }

  optimizeImplementationStrategy(strategy, patterns, technologies) {
    // Adjust strategy based on complexity of selected patterns and technologies
    const avgComplexity = patterns.reduce((sum, p) => {
      const complexity = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'VERY_HIGH': 4 }[p.implementationComplexity];
      return sum + complexity;
    }, 0) / patterns.length;

    const avgLearningCurve = technologies.reduce((sum, t) => {
      const curve = { 'MINIMAL': 1, 'MODERATE': 2, 'SIGNIFICANT': 3, 'MAJOR': 4 }[t.learningCurveImpact];
      return sum + curve;
    }, 0) / technologies.length;

    // Recommend phased approach for complex implementations
    if (avgComplexity > 2.5 || avgLearningCurve > 2.5) {
      return {
        ...strategy,
        approach: 'PHASED',
        reasoning: 'Phased approach recommended due to high complexity or learning curve requirements'
      };
    }

    return strategy;
  }

  async createArchitectureDecision(recommendedPattern, requirements) {
    const decisionData = {
      title: `Implement ${recommendedPattern.pattern.name} Pattern`,
      description: `Apply ${recommendedPattern.pattern.name} architecture pattern based on AI recommendations`,
      rationale: `Selected based on ${recommendedPattern.applicabilityScore.toFixed(2)} applicability score. Key benefits: ${recommendedPattern.benefits.slice(0, 3).join(', ')}.`,
      requirementIds: requirements.map(r => r.id),
      patternIds: [recommendedPattern.pattern.id],
      alternatives: recommendedPattern.alternatives || [],
      consequences: [
        ...recommendedPattern.benefits.map(b => `Positive: ${b}`),
        ...recommendedPattern.risks.map(r => `Risk: ${r}`)
      ]
    };

    return this.api.apiCall('/architecture/decisions', {
      method: 'POST',
      body: JSON.stringify(decisionData)
    });
  }
}
```

---

## Cross-Module Integration

### Advanced Integration Scenarios

```javascript
class CrossModuleIntegration {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async performFullIntegrationAnalysis(projectId) {
    // Get project overview
    const project = await this.api.apiCall(`/projects/${projectId}`);
    
    // Get all requirements for the project
    const requirements = await this.api.apiCall(`/requirements?projectId=${projectId}&limit=1000`);
    
    // Get all architecture decisions for the project
    const architectureDecisions = await this.api.apiCall(
      `/architecture/decisions?projectId=${projectId}&limit=1000`
    );

    // Get integration metrics
    const metrics = await this.api.apiCall(`/integration/metrics?projectId=${projectId}`);
    
    // Perform health check
    const healthCheck = await this.api.apiCall('/integration/health');

    // Analyze gaps
    const gaps = await this.analyzeIntegrationGaps(requirements.data, architectureDecisions.data);

    // Generate improvement recommendations
    const improvements = await this.generateImprovementRecommendations(metrics, gaps);

    return {
      project,
      overview: {
        requirementCount: requirements.data.length,
        architectureDecisionCount: architectureDecisions.data.length,
        mappingCoverage: (metrics.mappedRequirements / metrics.totalRequirements * 100).toFixed(1),
        averageConfidence: (metrics.averageConfidence * 100).toFixed(1),
        healthStatus: healthCheck.status
      },
      metrics,
      gaps,
      improvements,
      healthCheck
    };
  }

  async analyzeIntegrationGaps(requirements, architectureDecisions) {
    const gaps = {
      unmappedRequirements: [],
      orphanedDecisions: [],
      lowConfidenceMappings: [],
      misalignedPairs: []
    };

    // Find unmapped requirements
    for (const req of requirements) {
      const mappings = await this.api.apiCall(`/integration/mappings?requirementId=${req.id}`);
      if (mappings.length === 0 && req.status !== 'DRAFT') {
        gaps.unmappedRequirements.push(req);
      }
    }

    // Find orphaned architecture decisions
    for (const decision of architectureDecisions) {
      const mappings = await this.api.apiCall(`/integration/mappings?architectureDecisionId=${decision.id}`);
      if (mappings.length === 0 && decision.status !== 'DRAFT') {
        gaps.orphanedDecisions.push(decision);
      }
    }

    return gaps;
  }

  async generateImprovementRecommendations(metrics, gaps) {
    const recommendations = [];

    // Mapping coverage recommendations
    if (metrics.mappedRequirements / metrics.totalRequirements < 0.8) {
      recommendations.push({
        type: 'MAPPING_COVERAGE',
        priority: 'HIGH',
        title: 'Improve Requirement-Architecture Mapping Coverage',
        description: `Only ${(metrics.mappedRequirements / metrics.totalRequirements * 100).toFixed(1)}% of requirements are mapped to architecture decisions.`,
        actions: [
          `Map ${gaps.unmappedRequirements.length} unmapped requirements`,
          'Review orphaned architecture decisions for potential mappings',
          'Use AI recommendations to suggest appropriate mappings'
        ],
        impact: 'Better traceability and impact analysis capabilities'
      });
    }

    // Confidence improvement recommendations
    if (metrics.averageConfidence < 0.7) {
      recommendations.push({
        type: 'CONFIDENCE_IMPROVEMENT',
        priority: 'MEDIUM',
        title: 'Improve Mapping Confidence Scores',
        description: `Average mapping confidence is ${(metrics.averageConfidence * 100).toFixed(1)}%, below the recommended 70% threshold.`,
        actions: [
          'Review and validate existing mappings',
          'Add detailed rationales for low-confidence mappings',
          'Use architectural analysis to strengthen mapping justifications'
        ],
        impact: 'More reliable impact analysis and better decision support'
      });
    }

    // Validation coverage recommendations
    if (metrics.validationCoverage < 0.8) {
      recommendations.push({
        type: 'VALIDATION_COVERAGE',
        priority: 'MEDIUM',
        title: 'Increase Mapping Validation Coverage',
        description: `Only ${(metrics.validationCoverage * 100).toFixed(1)}% of mappings have been validated.`,
        actions: [
          'Implement validation workflows',
          'Assign validation responsibilities to architects',
          'Set up automated validation reminders'
        ],
        impact: 'Higher quality mappings and reduced risk of misalignment'
      });
    }

    return recommendations;
  }

  async executeBatchMapping(mappingRequests) {
    // Validate all mappings first
    const validationResults = [];
    
    for (const request of mappingRequests) {
      const validation = await this.api.apiCall('/integration/validation', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: request.requirementId,
          architectureDecisionId: request.architectureDecisionId
        })
      });
      
      validationResults.push({
        ...request,
        alignment: validation,
        shouldCreate: validation.alignmentScore > 0.6
      });
    }

    // Create mappings for well-aligned pairs
    const mappingsToCreate = validationResults.filter(v => v.shouldCreate);
    
    if (mappingsToCreate.length > 0) {
      const mappings = await this.api.apiCall('/integration/mappings/batch', {
        method: 'POST',
        body: JSON.stringify({
          mappings: mappingsToCreate.map(m => ({
            requirementId: m.requirementId,
            architectureDecisionId: m.architectureDecisionId,
            mappingType: m.mappingType || 'DIRECT',
            confidence: m.alignment.alignmentScore,
            rationale: `Batch created with alignment score: ${m.alignment.alignmentScore.toFixed(2)}`
          }))
        })
      });

      return {
        created: mappings,
        skipped: validationResults.filter(v => !v.shouldCreate),
        summary: {
          total: mappingRequests.length,
          created: mappings.length,
          skipped: validationResults.length - mappings.length
        }
      };
    }

    return {
      created: [],
      skipped: validationResults,
      summary: {
        total: mappingRequests.length,
        created: 0,
        skipped: mappingRequests.length
      }
    };
  }
}
```

---

## Real-time Updates

### WebSocket Integration

```javascript
class RealTimeIntegration {
  constructor(apiClient) {
    this.api = apiClient;
    this.ws = null;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    const token = await this.api.ensureValidToken();
    
    this.ws = new WebSocket(`wss://api.lanka.ai/v2/ws?token=${this.api.token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to relevant events
      this.subscribe([
        'requirement.created',
        'requirement.updated',
        'architecture.decision.created',
        'architecture.decision.updated',
        'mapping.created',
        'mapping.validated',
        'recommendation.generated'
      ]);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(eventTypes) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        events: eventTypes
      }));
    }
  }

  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleMessage(message) {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage example
const realTime = new RealTimeIntegration(apiClient);

// Handle requirement updates
realTime.on('requirement.updated', (requirement) => {
  console.log('Requirement updated:', requirement.id);
  
  // Update UI or trigger other actions
  updateRequirementInUI(requirement);
  
  // Check for impact on related architecture
  checkArchitectureImpact(requirement.id);
});

// Handle new mappings
realTime.on('mapping.created', (mapping) => {
  console.log('New mapping created:', {
    requirement: mapping.requirementId,
    architecture: mapping.architectureDecisionId,
    confidence: mapping.confidence
  });
  
  updateMappingVisualization(mapping);
});

// Handle recommendations
realTime.on('recommendation.generated', (recommendation) => {
  console.log('New recommendations available for requirement:', recommendation.requirementId);
  
  showRecommendationNotification(recommendation);
});

await realTime.connect();
```

---

## Error Handling

### Comprehensive Error Handling Strategy

```javascript
class APIErrorHandler {
  static handle(error, context = {}) {
    if (error.response) {
      // HTTP error response
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return this.handleValidationError(data.error, context);
        case 401:
          return this.handleAuthenticationError(data.error, context);
        case 403:
          return this.handleAuthorizationError(data.error, context);
        case 404:
          return this.handleNotFoundError(data.error, context);
        case 409:
          return this.handleConflictError(data.error, context);
        case 429:
          return this.handleRateLimitError(data.error, context);
        case 500:
        case 502:
        case 503:
          return this.handleServerError(data.error, context);
        default:
          return this.handleGenericError(error, context);
      }
    } else if (error.request) {
      // Network error
      return this.handleNetworkError(error, context);
    } else {
      // Other error
      return this.handleGenericError(error, context);
    }
  }

  static handleValidationError(error, context) {
    return {
      type: 'VALIDATION_ERROR',
      message: error.message,
      details: error.details,
      userMessage: 'Please check your input and try again.',
      recoverable: true,
      retryable: false,
      context
    };
  }

  static handleAuthenticationError(error, context) {
    return {
      type: 'AUTHENTICATION_ERROR',
      message: error.message,
      userMessage: 'Please log in again.',
      recoverable: true,
      retryable: false,
      action: 'REFRESH_TOKEN',
      context
    };
  }

  static handleAuthorizationError(error, context) {
    return {
      type: 'AUTHORIZATION_ERROR',
      message: error.message,
      userMessage: 'You do not have permission to perform this action.',
      recoverable: false,
      retryable: false,
      context
    };
  }

  static handleNotFoundError(error, context) {
    return {
      type: 'NOT_FOUND_ERROR',
      message: error.message,
      userMessage: 'The requested resource was not found.',
      recoverable: false,
      retryable: false,
      context
    };
  }

  static handleConflictError(error, context) {
    return {
      type: 'CONFLICT_ERROR',
      message: error.message,
      details: error.details,
      userMessage: 'This operation conflicts with the current state. Please refresh and try again.',
      recoverable: true,
      retryable: true,
      context
    };
  }

  static handleRateLimitError(error, context) {
    const resetTime = error.details?.reset_at ? new Date(error.details.reset_at) : new Date(Date.now() + 60000);
    
    return {
      type: 'RATE_LIMIT_ERROR',
      message: error.message,
      userMessage: `Too many requests. Please wait until ${resetTime.toLocaleTimeString()} before trying again.`,
      recoverable: true,
      retryable: true,
      retryAfter: resetTime,
      context
    };
  }

  static handleServerError(error, context) {
    return {
      type: 'SERVER_ERROR',
      message: error.message,
      userMessage: 'A server error occurred. Please try again later.',
      recoverable: true,
      retryable: true,
      retryDelay: 5000,
      context
    };
  }

  static handleNetworkError(error, context) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network connection failed',
      userMessage: 'Please check your internet connection and try again.',
      recoverable: true,
      retryable: true,
      retryDelay: 2000,
      context
    };
  }

  static handleGenericError(error, context) {
    return {
      type: 'GENERIC_ERROR',
      message: error.message || 'An unexpected error occurred',
      userMessage: 'An unexpected error occurred. Please try again.',
      recoverable: true,
      retryable: true,
      context
    };
  }
}

// Enhanced API client with retry logic
class ResilientAPIClient extends LankaAPIClient {
  async apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.apiCall(endpoint, options);
      } catch (error) {
        lastError = error;
        
        const errorInfo = APIErrorHandler.handle(error, {
          endpoint,
          attempt: attempt + 1,
          maxRetries
        });

        // Don't retry if error is not retryable
        if (!errorInfo.retryable || attempt === maxRetries) {
          throw errorInfo;
        }

        // Handle authentication errors by refreshing token
        if (errorInfo.type === 'AUTHENTICATION_ERROR') {
          try {
            await this.refreshAccessToken();
          } catch (refreshError) {
            throw APIErrorHandler.handle(refreshError);
          }
        }

        // Wait before retry
        const delay = errorInfo.retryDelay || Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw APIErrorHandler.handle(lastError);
  }
}
```

---

## Best Practices

### 1. Performance Optimization

```javascript
class PerformanceOptimizations {
  constructor(apiClient) {
    this.api = apiClient;
    this.cache = new Map();
    this.requestQueue = new Map();
  }

  // Request deduplication
  async deduplicatedRequest(key, requestFn) {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = requestFn();
    this.requestQueue.set(key, promise);

    try {
      const result = await promise;
      this.requestQueue.delete(key);
      return result;
    } catch (error) {
      this.requestQueue.delete(key);
      throw error;
    }
  }

  // Batch similar requests
  async batchRequirements(requirementIds) {
    const batchSize = 20;
    const batches = [];
    
    for (let i = 0; i < requirementIds.length; i += batchSize) {
      batches.push(requirementIds.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        this.api.apiCall('/requirements/batch', {
          method: 'POST',
          body: JSON.stringify({ ids: batch })
        })
      )
    );

    return results.flat();
  }

  // Cache frequently accessed data
  async getCachedData(key, fetchFn, ttl = 300000) { // 5 minutes TTL
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  // Pagination helper
  async getAllPages(endpoint, params = {}) {
    const allData = [];
    let offset = 0;
    const limit = 100; // Maximum allowed
    
    while (true) {
      const response = await this.api.apiCall(endpoint, {
        method: 'GET',
        params: { ...params, limit, offset }
      });

      allData.push(...response.data);
      
      if (!response.pagination.hasNext) {
        break;
      }
      
      offset += limit;
    }

    return allData;
  }
}
```

### 2. Data Synchronization

```javascript
class DataSynchronization {
  constructor(apiClient) {
    this.api = apiClient;
    this.localCache = new Map();
    this.syncQueue = [];
    this.conflictResolutionStrategy = 'server-wins';
  }

  async syncRequirement(requirementId) {
    const local = this.localCache.get(requirementId);
    const remote = await this.api.apiCall(`/requirements/${requirementId}`);

    if (!local) {
      // First time sync
      this.localCache.set(requirementId, remote.requirement);
      return { action: 'FETCHED', requirement: remote.requirement };
    }

    if (local.updatedAt === remote.requirement.updatedAt) {
      // No changes
      return { action: 'NO_CHANGE', requirement: local };
    }

    if (this.conflictResolutionStrategy === 'server-wins') {
      this.localCache.set(requirementId, remote.requirement);
      return { action: 'UPDATED_FROM_SERVER', requirement: remote.requirement };
    }

    // Handle conflicts based on strategy
    return this.resolveConflict(local, remote.requirement);
  }

  async batchSync(requirementIds) {
    const syncPromises = requirementIds.map(id => 
      this.syncRequirement(id).catch(error => ({ 
        requirementId: id, 
        error 
      }))
    );

    const results = await Promise.all(syncPromises);
    
    return {
      successful: results.filter(r => !r.error),
      failed: results.filter(r => r.error)
    };
  }

  async resolveConflict(local, remote) {
    // Implement conflict resolution logic
    console.warn('Sync conflict detected for requirement:', local.id);
    
    // Simple merge strategy - combine changes
    const merged = {
      ...remote,
      // Keep local changes to specific fields if they're more recent
      description: local.updatedAt > remote.updatedAt ? local.description : remote.description
    };

    // Save merged version
    const updated = await this.api.apiCall(`/requirements/${local.id}`, {
      method: 'PUT',
      body: JSON.stringify(merged)
    });

    this.localCache.set(local.id, updated.requirement);
    return { action: 'MERGED', requirement: updated.requirement };
  }
}
```

---

## SDK Examples

### JavaScript/Node.js SDK

```javascript
// lanka-sdk.js
class LankaSDK {
  constructor(options = {}) {
    this.apiClient = new ResilientAPIClient(options.baseURL);
    this.requirements = new RequirementsWorkflow(this.apiClient);
    this.architecture = new ArchitectureIntelligence(this.apiClient);
    this.integration = new CrossModuleIntegration(this.apiClient);
    this.realTime = new RealTimeIntegration(this.apiClient);
  }

  async authenticate(credentials) {
    return this.apiClient.authenticate(credentials.email, credentials.password);
  }

  async createProjectWorkflow(projectData) {
    // Complete workflow for creating a project with requirements and architecture
    const project = await this.apiClient.apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });

    return {
      project,
      addRequirement: (reqData) => this.requirements.createRequirement({
        ...reqData,
        projectId: project.id
      }),
      generateArchitecture: (requirementIds) => 
        this.architecture.generateRecommendations(requirementIds[0]),
      analyzeIntegration: () => 
        this.integration.performFullIntegrationAnalysis(project.id)
    };
  }
}

// Usage
const lanka = new LankaSDK({
  baseURL: 'https://api.lanka.ai/v2'
});

await lanka.authenticate({
  email: 'developer@company.com',
  password: 'password'
});

const workflow = await lanka.createProjectWorkflow({
  name: 'E-commerce Platform',
  description: 'Modern e-commerce solution with AI capabilities'
});
```

### Python SDK Example

```python
# lanka_sdk.py
import requests
import asyncio
import aiohttp
from typing import Dict, List, Optional

class LankaSDK:
    def __init__(self, base_url: str = "https://api.lanka.ai/v2"):
        self.base_url = base_url
        self.session = None
        self.token = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def authenticate(self, email: str, password: str) -> Dict:
        async with self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        ) as response:
            auth_data = await response.json()
            self.token = auth_data["accessToken"]
            return auth_data
    
    async def create_requirement(self, requirement_data: Dict) -> Dict:
        headers = {"Authorization": f"Bearer {self.token}"}
        async with self.session.post(
            f"{self.base_url}/requirements",
            json=requirement_data,
            headers=headers
        ) as response:
            return await response.json()
    
    async def generate_recommendations(self, requirement_id: str) -> Dict:
        headers = {"Authorization": f"Bearer {self.token}"}
        async with self.session.get(
            f"{self.base_url}/integration/recommendations/{requirement_id}",
            headers=headers
        ) as response:
            return await response.json()

# Usage
async def main():
    async with LankaSDK() as lanka:
        await lanka.authenticate("developer@company.com", "password")
        
        requirement = await lanka.create_requirement({
            "title": "User Authentication",
            "description": "Implement secure user authentication system",
            "type": "FUNCTIONAL",
            "projectId": "project-123",
            "stakeholderId": "stakeholder-456"
        })
        
        recommendations = await lanka.generate_recommendations(requirement["requirement"]["id"])
        print(f"Generated {len(recommendations['recommendedPatterns'])} pattern recommendations")

asyncio.run(main())
```

This comprehensive integration guide provides developers with everything they need to successfully integrate with the LANKA Architecture Intelligence API, from basic authentication to advanced cross-module workflows and real-time synchronization.