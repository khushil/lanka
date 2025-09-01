// ============================================================================
// LANKA Neo4j Performance Optimization - Phase 2.3
// Missing Indexes Migration Script
// ============================================================================

// ============================================================================
// COMPOSITE INDEXES FOR HIGH-FREQUENCY QUERY PATTERNS
// ============================================================================

// Requirements query optimization
CREATE INDEX req_type_priority IF NOT EXISTS FOR (r:Requirement) ON (r.type, r.priority);
CREATE INDEX req_status_project IF NOT EXISTS FOR (r:Requirement) ON (r.status, r.projectId);
CREATE INDEX req_priority_created IF NOT EXISTS FOR (r:Requirement) ON (r.priority, r.createdAt);
CREATE INDEX req_type_status IF NOT EXISTS FOR (r:Requirement) ON (r.type, r.status);

// Architecture decision optimization
CREATE INDEX arch_pattern_status IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.pattern, a.status);
CREATE INDEX arch_status_project IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.status, a.projectId);
CREATE INDEX arch_type_impact IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.type, a.businessImpact);
CREATE INDEX arch_risk_priority IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.riskLevel, a.priority);

// Architecture pattern optimization
CREATE INDEX pattern_type_maturity IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.type, ap.maturityLevel);
CREATE INDEX pattern_complexity_performance IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.complexity, ap.performance);
CREATE INDEX pattern_category_suitability IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.category, ap.suitabilityScore);

// Technology stack optimization
CREATE INDEX tech_expertise_maturity IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.teamExpertise, ts.maturityLevel);
CREATE INDEX tech_cost_performance IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.totalCostOfOwnership, ts.performanceRating);
CREATE INDEX tech_category_type IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.category, ts.type);

// Code component optimization
CREATE INDEX code_language_complexity IF NOT EXISTS FOR (c:CodeComponent) ON (c.language, c.complexityScore);
CREATE INDEX code_quality_maintainability IF NOT EXISTS FOR (c:CodeComponent) ON (c.qualityScore, c.maintainabilityScore);
CREATE INDEX code_type_status IF NOT EXISTS FOR (c:CodeComponent) ON (c.type, c.status);

// Mapping and alignment optimization
CREATE INDEX mapping_confidence_type IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.confidence, m.mappingType);
CREATE INDEX mapping_req_arch_pattern IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.requirementId, m.architecturePatternId);
CREATE INDEX mapping_req_tech_stack IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.requirementId, m.technologyStackId);

CREATE INDEX alignment_score_status IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.alignmentScore, al.validationStatus);
CREATE INDEX alignment_req_arch_type IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.requirementId, al.architectureDecisionId, al.alignmentType);

// ============================================================================
// TEMPORAL INDEXES FOR TIME-BASED QUERIES
// ============================================================================

CREATE INDEX req_created_updated IF NOT EXISTS FOR (r:Requirement) ON (r.createdAt, r.updatedAt);
CREATE INDEX arch_created_decided IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.createdAt, a.decisionDate);
CREATE INDEX mapping_created_validated IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.createdAt, m.lastValidated);
CREATE INDEX alignment_assessed_validated IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.lastAssessed, al.lastValidated);

// ============================================================================
// RANGE INDEXES FOR NUMERICAL QUERIES
// ============================================================================

// Score-based range indexes
CREATE RANGE INDEX req_business_value_range IF NOT EXISTS FOR (r:Requirement) ON (r.businessValue);
CREATE RANGE INDEX req_effort_estimate_range IF NOT EXISTS FOR (r:Requirement) ON (r.effortEstimate);
CREATE RANGE INDEX arch_business_impact_range IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.businessImpact);
CREATE RANGE INDEX pattern_suitability_range IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.suitabilityScore);
CREATE RANGE INDEX tech_performance_range IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.performanceRating);
CREATE RANGE INDEX code_quality_range IF NOT EXISTS FOR (c:CodeComponent) ON (c.qualityScore);
CREATE RANGE INDEX mapping_confidence_range IF NOT EXISTS FOR (m:RequirementArchitectureMapping) ON (m.confidence);
CREATE RANGE INDEX alignment_score_range IF NOT EXISTS FOR (al:ArchitectureRequirementAlignment) ON (al.alignmentScore);

// Cost and complexity range indexes
CREATE RANGE INDEX req_complexity_range IF NOT EXISTS FOR (r:Requirement) ON (r.complexity);
CREATE RANGE INDEX arch_cost_range IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.estimatedCost);
CREATE RANGE INDEX pattern_complexity_range IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.complexity);
CREATE RANGE INDEX tech_cost_range IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.totalCostOfOwnership);
CREATE RANGE INDEX code_complexity_range IF NOT EXISTS FOR (c:CodeComponent) ON (c.complexityScore);

// ============================================================================
// RELATIONSHIP INDEXES FOR TRAVERSAL OPTIMIZATION
// ============================================================================

// Core relationship indexes
CREATE INDEX rel_contains_weight IF NOT EXISTS FOR ()-[r:CONTAINS]-() ON (r.weight);
CREATE INDEX rel_implements_confidence IF NOT EXISTS FOR ()-[r:IMPLEMENTS]-() ON (r.confidence);
CREATE INDEX rel_depends_on_type IF NOT EXISTS FOR ()-[r:DEPENDS_ON]-() ON (r.dependencyType);
CREATE INDEX rel_maps_to_strength IF NOT EXISTS FOR ()-[r:MAPS_TO]-() ON (r.mappingStrength);
CREATE INDEX rel_aligns_with_score IF NOT EXISTS FOR ()-[r:ALIGNS_WITH]-() ON (r.alignmentScore);
CREATE INDEX rel_influences_impact IF NOT EXISTS FOR ()-[r:INFLUENCES]-() ON (r.influenceLevel);
CREATE INDEX rel_supports_level IF NOT EXISTS FOR ()-[r:SUPPORTS]-() ON (r.supportLevel);

// ============================================================================
// VECTOR INDEXES FOR SIMILARITY SEARCH (Neo4j 5.11+)
// ============================================================================

// Create vector indexes for embedding-based similarity search
// Note: These require embeddings to be populated first
CREATE VECTOR INDEX req_embedding_index IF NOT EXISTS FOR (r:Requirement) ON (r.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};

CREATE VECTOR INDEX arch_embedding_index IF NOT EXISTS FOR (a:ArchitectureDecision) ON (a.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};

CREATE VECTOR INDEX pattern_embedding_index IF NOT EXISTS FOR (ap:ArchitecturePattern) ON (ap.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};

CREATE VECTOR INDEX tech_embedding_index IF NOT EXISTS FOR (ts:TechnologyStack) ON (ts.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};

// ============================================================================
// OPTIMIZATION VERIFICATION QUERIES
// ============================================================================

// Show all indexes
SHOW INDEXES;

// Show index usage statistics (to be run after application usage)
// CALL db.stats.retrieve('SCHEMA');

// ============================================================================
// PERFORMANCE NOTES
// ============================================================================

/*
These indexes are optimized for the following common query patterns:

1. Requirements filtering by type and priority
2. Architecture decisions by pattern and status
3. Time-based queries for reporting
4. Score-range queries for recommendations
5. Similarity searches using vector embeddings
6. Relationship traversals with weights/scores

Expected performance improvements:
- 70-90% reduction in query time for filtered searches
- 50-80% improvement in recommendation queries
- Near-instant similarity searches with vector indexes
- Optimized joins between requirements and architecture components
*/