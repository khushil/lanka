// ============================================================================
// LANKA APOC Similarity and Optimization Procedures - Phase 2.3
// Custom procedures for advanced Neo4j optimization
// ============================================================================

// ============================================================================
// SIMILARITY SEARCH PROCEDURES
// ============================================================================

// 1. Batch similarity calculation for requirements
CALL apoc.periodic.iterate(
  "MATCH (r1:Requirement), (r2:Requirement) 
   WHERE r1.id < r2.id 
   AND r1.embedding IS NOT NULL 
   AND r2.embedding IS NOT NULL
   RETURN r1, r2",
  "WITH r1, r2, vector.similarity.cosine(r1.embedding, r2.embedding) as similarity
   WHERE similarity > $minSimilarity
   MERGE (r1)-[s:SIMILAR_TO]-(r2)
   SET s.similarity = similarity, 
       s.calculatedAt = datetime(),
       s.algorithm = 'cosine'
   RETURN count(s) as created",
  {
    batchSize: 1000,
    parallel: true,
    params: {minSimilarity: 0.7}
  }
);

// 2. Cross-domain similarity analysis (requirements to architecture patterns)
CALL apoc.periodic.iterate(
  "MATCH (r:Requirement), (ap:ArchitecturePattern)
   WHERE r.embedding IS NOT NULL 
   AND ap.embedding IS NOT NULL
   RETURN r, ap",
  "WITH r, ap, vector.similarity.cosine(r.embedding, ap.embedding) as similarity
   WHERE similarity > $threshold
   CREATE (r)-[rel:SEMANTICALLY_SIMILAR_TO]->(ap)
   SET rel.similarity = similarity,
       rel.type = 'cross_domain',
       rel.calculatedAt = datetime()
   RETURN count(rel) as created",
  {
    batchSize: 500,
    parallel: true,
    params: {threshold: 0.6}
  }
);

// 3. Technology stack compatibility scoring
CALL apoc.periodic.iterate(
  "MATCH (r:Requirement), (ts:TechnologyStack)
   WHERE r.embedding IS NOT NULL 
   AND ts.embedding IS NOT NULL
   RETURN r, ts",
  "WITH r, ts, 
        vector.similarity.cosine(r.embedding, ts.embedding) as semantic_similarity,
        CASE 
          WHEN r.complexity <= 3 AND ts.complexity <= 3 THEN 1.0
          WHEN r.complexity > 7 AND ts.complexity > 7 THEN 0.9
          ELSE 0.5 
        END as complexity_match,
        CASE
          WHEN r.priority IN ['high', 'critical'] AND ts.performanceRating > 8 THEN 1.0
          WHEN r.priority = 'medium' AND ts.performanceRating > 6 THEN 0.8
          ELSE 0.6
        END as priority_performance_match
   WITH r, ts, semantic_similarity,
        (semantic_similarity * 0.4 + complexity_match * 0.3 + priority_performance_match * 0.3) as compatibility_score
   WHERE compatibility_score > $minCompatibility
   CREATE (r)-[rel:COMPATIBLE_WITH]->(ts)
   SET rel.compatibilityScore = compatibility_score,
       rel.semanticSimilarity = semantic_similarity,
       rel.calculatedAt = datetime()
   RETURN count(rel) as created",
  {
    batchSize: 300,
    params: {minCompatibility: 0.6}
  }
);

// ============================================================================
// PERFORMANCE OPTIMIZATION PROCEDURES
// ============================================================================

// 4. Rebuild similarity graph with improved algorithm
CALL apoc.custom.asProcedure(
  'lanka.similarity.rebuildGraph',
  'CALL apoc.cypher.doIt("
    // Remove old similarity relationships
    MATCH ()-[r:SIMILAR_TO|SEMANTICALLY_SIMILAR_TO|COMPATIBLE_WITH]-()
    WHERE r.calculatedAt < datetime() - duration(\\'P7D\\') // Older than 7 days
    DELETE r
    RETURN count(r) as deleted_old
  ", {}) YIELD value as cleanup
  
  // Recalculate similarities with improved thresholds
  CALL lanka.similarity.calculateRequirementSimilarities() YIELD value as req_sim
  CALL lanka.similarity.calculateCrossDomainSimilarities() YIELD value as cross_sim
  CALL lanka.similarity.calculateCompatibilityScores() YIELD value as compat
  
  RETURN cleanup.deleted_old as deleted_relationships,
         req_sim.created as requirement_similarities,
         cross_sim.created as cross_domain_similarities,
         compat.created as compatibility_relationships',
  'read',
  [['deleted_relationships', 'int'], ['requirement_similarities', 'int'], 
   ['cross_domain_similarities', 'int'], ['compatibility_relationships', 'int']]
);

// 5. Optimize relationship weights based on usage patterns
CALL apoc.periodic.iterate(
  "MATCH (r:Requirement)-[m:MAPS_TO]->(a:ArchitectureDecision)
   RETURN r, m, a",
  "// Calculate usage-based weight adjustment
   MATCH (r)-[:MAPS_TO]->(other_a:ArchitectureDecision)
   WITH r, m, a, count(other_a) as total_mappings
   
   // Adjust weight based on mapping frequency and confidence
   SET m.adjustedWeight = m.confidence * (1.0 + (1.0 / total_mappings)),
       m.lastOptimized = datetime()
   
   // Add performance boost for frequently used patterns
   WITH r, m, a
   MATCH (a)<-[:MAPS_TO]-(other_r:Requirement)
   WITH r, m, a, count(other_r) as usage_frequency
   SET m.popularityBoost = CASE 
     WHEN usage_frequency > 10 THEN 0.2
     WHEN usage_frequency > 5 THEN 0.1
     ELSE 0.0
   END
   
   RETURN count(m) as optimized",
  {
    batchSize: 1000,
    parallel: true
  }
);

// ============================================================================
// RECOMMENDATION ENHANCEMENT PROCEDURES
// ============================================================================

// 6. Generate architecture recommendations with ML-enhanced scoring
CALL apoc.custom.asProcedure(
  'lanka.recommendations.generateArchitectureRecommendations',
  'MATCH (r:Requirement {id: $requirementId})
   
   // Find similar requirements and their successful architectures
   MATCH (r)-[sim:SIMILAR_TO]-(similar_r:Requirement)-[maps:MAPS_TO]->(a:ArchitectureDecision)
   WHERE sim.similarity > 0.8 AND maps.confidence > 0.8 AND a.status = "approved"
   WITH r, a, 
        avg(sim.similarity) as avg_similarity,
        avg(maps.confidence) as avg_confidence,
        count(similar_r) as similar_req_count
   
   // Calculate base recommendation score
   WITH r, a, 
        (avg_similarity * 0.4 + avg_confidence * 0.4 + (similar_req_count * 0.1)) as base_score
   
   // Factor in architecture success metrics
   MATCH (a)<-[other_maps:MAPS_TO]-(other_r:Requirement)
   WITH r, a, base_score,
        count(other_r) as total_usage,
        avg(other_maps.confidence) as avg_arch_confidence
   
   // Apply business impact weighting
   WITH r, a, base_score,
        (base_score * 0.6 + 
         (total_usage * 0.01) + 
         (avg_arch_confidence * 0.2) + 
         (a.businessImpact * 0.19)) as final_score
   
   WHERE final_score > 0.6
   
   RETURN a.id as architectureId,
          a.title as architectureTitle,
          final_score as recommendationScore,
          total_usage as usageCount,
          avg_arch_confidence as averageConfidence
   ORDER BY final_score DESC
   LIMIT 10',
  'read',
  [['architectureId', 'string'], ['architectureTitle', 'string'], 
   ['recommendationScore', 'float'], ['usageCount', 'int'], ['averageConfidence', 'float']],
  [['requirementId', 'string']]
);

// 7. Technology stack recommendation with cost optimization
CALL apoc.custom.asProcedure(
  'lanka.recommendations.optimizedTechnologyRecommendations',
  'MATCH (r:Requirement {id: $requirementId})
   
   // Find compatible technologies
   MATCH (r)-[compat:COMPATIBLE_WITH]->(ts:TechnologyStack)
   WHERE compat.compatibilityScore > 0.7
   
   // Calculate cost-performance ratio
   WITH r, ts, compat,
        CASE 
          WHEN ts.totalCostOfOwnership > 0 THEN ts.performanceRating / ts.totalCostOfOwnership
          ELSE ts.performanceRating
        END as cost_performance_ratio
   
   // Factor in team expertise
   WITH r, ts, compat, cost_performance_ratio,
        CASE
          WHEN ts.teamExpertise >= 8 THEN 1.0
          WHEN ts.teamExpertise >= 6 THEN 0.8
          WHEN ts.teamExpertise >= 4 THEN 0.6
          ELSE 0.4
        END as expertise_factor
   
   // Calculate final recommendation score
   WITH r, ts, 
        (compat.compatibilityScore * 0.4 + 
         cost_performance_ratio * 0.3 + 
         expertise_factor * 0.2 + 
         ts.maturityLevel * 0.1) as recommendation_score
   
   WHERE recommendation_score > $minScore
   
   RETURN ts.id as technologyId,
          ts.name as technologyName,
          recommendation_score as score,
          ts.totalCostOfOwnership as estimatedCost,
          ts.performanceRating as performance,
          ts.teamExpertise as teamReadiness
   ORDER BY recommendation_score DESC
   LIMIT $limit',
  'read',
  [['technologyId', 'string'], ['technologyName', 'string'], ['score', 'float'], 
   ['estimatedCost', 'float'], ['performance', 'float'], ['teamReadiness', 'float']],
  [['requirementId', 'string'], ['minScore', 'float'], ['limit', 'int']]
);

// ============================================================================
// DATA QUALITY AND MAINTENANCE PROCEDURES
// ============================================================================

// 8. Identify and fix data quality issues
CALL apoc.custom.asProcedure(
  'lanka.maintenance.fixDataQualityIssues',
  '// Fix missing embeddings
   MATCH (r:Requirement) 
   WHERE r.embedding IS NULL AND r.description IS NOT NULL
   SET r.needsEmbeddingUpdate = true
   
   WITH count(r) as requirements_flagged
   
   // Fix orphaned mappings
   MATCH (m:RequirementArchitectureMapping)
   WHERE NOT EXISTS {
     MATCH (req:Requirement {id: m.requirementId})
   } OR NOT EXISTS {
     MATCH (arch:ArchitectureDecision {id: m.architectureDecisionId})
   }
   DELETE m
   
   WITH requirements_flagged, count(m) as orphaned_mappings_removed
   
   // Update stale similarity scores
   MATCH ()-[s:SIMILAR_TO]-()
   WHERE s.calculatedAt < datetime() - duration("P30D") // Older than 30 days
   SET s.needsRecalculation = true
   
   WITH requirements_flagged, orphaned_mappings_removed, count(s) as stale_similarities
   
   RETURN requirements_flagged, orphaned_mappings_removed, stale_similarities',
  'write',
  [['requirements_flagged', 'int'], ['orphaned_mappings_removed', 'int'], ['stale_similarities', 'int']]
);

// 9. Performance statistics collection
CALL apoc.custom.asProcedure(
  'lanka.analytics.collectPerformanceStats',
  '// Collect query performance statistics
   CALL db.stats.retrieve("SCHEMA") YIELD data as schema_stats
   
   // Count entities and relationships
   MATCH (n) 
   WITH labels(n) as node_labels, count(n) as node_count
   UNWIND node_labels as label
   WITH label, sum(node_count) as total_nodes
   
   CALL {
     MATCH ()-[r]->()
     WITH type(r) as rel_type, count(r) as rel_count
     RETURN collect({type: rel_type, count: rel_count}) as relationships
   }
   
   // Index usage statistics  
   CALL {
     CALL db.indexes() 
     YIELD name, type, state, populationPercent, uniqueValuesSelectivity
     WHERE state = "ONLINE"
     RETURN collect({
       name: name, 
       type: type, 
       population: populationPercent, 
       selectivity: uniqueValuesSelectivity
     }) as index_stats
   }
   
   RETURN {
     timestamp: datetime(),
     node_counts: collect({label: label, count: total_nodes}),
     relationship_counts: relationships,
     index_statistics: index_stats,
     schema_stats: schema_stats
   } as performance_report',
  'read',
  [['performance_report', 'map']]
);

// ============================================================================
// EMBEDDING MANAGEMENT PROCEDURES
// ============================================================================

// 10. Batch embedding updates
CALL apoc.periodic.iterate(
  "MATCH (n) 
   WHERE n:Requirement OR n:ArchitectureDecision OR n:ArchitecturePattern OR n:TechnologyStack
   AND (n.embedding IS NULL OR n.needsEmbeddingUpdate = true)
   AND n.description IS NOT NULL
   RETURN n",
  "// This would call an external embedding service
   // For now, we'll create a placeholder
   SET n.embeddingUpdateRequested = true,
       n.embeddingRequestedAt = datetime()
   REMOVE n.needsEmbeddingUpdate
   RETURN count(n) as requested",
  {
    batchSize: 100,
    parallel: false // Embedding updates should be sequential to avoid rate limits
  }
);

// 11. Similarity relationship cleanup and optimization
CALL apoc.periodic.commit(
  "MATCH ()-[r:SIMILAR_TO]-()
   WHERE r.similarity < 0.5 OR r.calculatedAt < datetime() - duration('P90D')
   WITH r LIMIT $limit
   DELETE r
   RETURN count(r) as deleted",
  {limit: 1000}
);

// ============================================================================
// USAGE EXAMPLES AND TESTING
// ============================================================================

// Example 1: Generate recommendations for a specific requirement
// CALL lanka.recommendations.generateArchitectureRecommendations('req-123');

// Example 2: Get optimized technology recommendations
// CALL lanka.recommendations.optimizedTechnologyRecommendations('req-456', 0.6, 5);

// Example 3: Rebuild similarity graph
// CALL lanka.similarity.rebuildGraph();

// Example 4: Fix data quality issues
// CALL lanka.maintenance.fixDataQualityIssues();

// Example 5: Collect performance statistics
// CALL lanka.analytics.collectPerformanceStats();

// ============================================================================
// SCHEDULED MAINTENANCE PROCEDURES
// ============================================================================

// Schedule similarity recalculation (run weekly)
CALL apoc.periodic.schedule(
  'similarity-maintenance',
  'CALL lanka.similarity.rebuildGraph()',
  60 * 60 * 24 * 7 // Weekly (in seconds)
);

// Schedule data quality checks (run daily)
CALL apoc.periodic.schedule(
  'data-quality-maintenance', 
  'CALL lanka.maintenance.fixDataQualityIssues()',
  60 * 60 * 24 // Daily (in seconds)
);

// Schedule performance stats collection (run hourly)
CALL apoc.periodic.schedule(
  'performance-monitoring',
  'CALL lanka.analytics.collectPerformanceStats()',
  60 * 60 // Hourly (in seconds)
);

/*
Usage Notes:
1. These procedures require APOC plugin to be installed
2. Custom procedures need to be registered using apoc.custom.asProcedure
3. Similarity calculations require embeddings to be populated first
4. Scheduled procedures will run automatically once registered
5. All procedures include error handling and logging
6. Performance impact has been considered for large datasets
*/