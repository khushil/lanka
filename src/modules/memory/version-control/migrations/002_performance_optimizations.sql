-- LANKA Memory Version Control Performance Optimization Migration
-- Version: 002
-- Description: Add performance optimizations and additional indexes

-- Create composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commits_memory_branch_time 
    ON memory_commits(memory_id, branch_name, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commits_author_time 
    ON memory_commits(author_id, timestamp DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merge_requests_open 
    ON merge_requests(target_branch, created_at DESC) 
    WHERE status IN ('open', 'draft');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conflicts_unresolved 
    ON merge_conflicts(memory_id, created_at DESC) 
    WHERE resolved = FALSE;

-- Expression indexes for JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commits_change_type 
    ON memory_commits USING BTREE ((changes->>'type'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commits_memory_confidence 
    ON memory_commits USING BTREE (memory_id, ((changes->'after'->>'confidence')::numeric));

-- Covering indexes to avoid table lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commits_branch_covering 
    ON memory_commits(branch_name, timestamp DESC) 
    INCLUDE (id, memory_id, author_id, message);

-- Hash indexes for exact matches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branches_name_hash 
    ON memory_branches USING HASH (name);

-- Create materialized view for commit statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS commit_statistics AS
SELECT 
    DATE(timestamp) as commit_date,
    branch_name,
    author_id,
    changes->>'type' as change_type,
    COUNT(*) as commit_count,
    COUNT(DISTINCT memory_id) as unique_memories,
    AVG(((changes->'after'->>'confidence')::numeric)) as avg_confidence
FROM memory_commits 
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_commit_stats_unique 
    ON commit_statistics(commit_date, branch_name, author_id, change_type);

-- Create materialized view for merge request analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS merge_request_analytics AS
SELECT 
    DATE(created_at) as mr_date,
    target_branch,
    status,
    author_id,
    COUNT(*) as mr_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(merged_at, updated_at) - created_at))/3600) as avg_hours_to_resolve,
    AVG(jsonb_array_length(conflicts)) as avg_conflicts,
    AVG(array_length(reviewers, 1)) as avg_reviewers
FROM merge_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4;

-- Create unique index on MR analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_mr_analytics_unique 
    ON merge_request_analytics(mr_date, target_branch, status, author_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_version_control_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY commit_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY merge_request_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedures for common operations
CREATE OR REPLACE FUNCTION get_commit_history(
    p_branch_name VARCHAR(255),
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    memory_id UUID,
    author_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE,
    message TEXT,
    change_type TEXT,
    parent_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.memory_id,
        c.author_id,
        c.timestamp,
        c.message,
        c.changes->>'type' as change_type,
        array_length(c.parent_ids, 1) as parent_count
    FROM memory_commits c
    WHERE c.branch_name = p_branch_name
    ORDER BY c.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to find common ancestor
CREATE OR REPLACE FUNCTION find_common_ancestor(
    p_commit1_id UUID,
    p_commit2_id UUID
)
RETURNS UUID AS $$
DECLARE
    visited_commits UUID[];
    current_commits UUID[];
    next_commits UUID[];
    commit_id UUID;
    parent_id UUID;
BEGIN
    -- Start with both commits
    current_commits := ARRAY[p_commit1_id, p_commit2_id];
    visited_commits := current_commits;
    
    -- Traverse up the commit graph
    WHILE array_length(current_commits, 1) > 0 LOOP
        next_commits := '{}';
        
        -- Get all parents of current commits
        FOR commit_id IN SELECT UNNEST(current_commits) LOOP
            FOR parent_id IN 
                SELECT UNNEST(parent_ids) 
                FROM memory_commits 
                WHERE id = commit_id
            LOOP
                -- Check if we've seen this parent before
                IF parent_id = ANY(visited_commits) THEN
                    RETURN parent_id; -- Found common ancestor
                END IF;
                
                -- Add to next level and visited set
                next_commits := array_append(next_commits, parent_id);
                visited_commits := array_append(visited_commits, parent_id);
            END LOOP;
        END LOOP;
        
        current_commits := next_commits;
    END LOOP;
    
    RETURN NULL; -- No common ancestor found
END;
$$ LANGUAGE plpgsql;

-- Function to calculate branch divergence
CREATE OR REPLACE FUNCTION calculate_branch_divergence(
    p_source_branch VARCHAR(255),
    p_target_branch VARCHAR(255)
)
RETURNS TABLE(
    ahead_count INTEGER,
    behind_count INTEGER,
    common_ancestor_id UUID
) AS $$
DECLARE
    source_head UUID;
    target_head UUID;
    ancestor_id UUID;
BEGIN
    -- Get branch heads
    SELECT head_commit_id INTO source_head 
    FROM memory_branches WHERE name = p_source_branch;
    
    SELECT head_commit_id INTO target_head 
    FROM memory_branches WHERE name = p_target_branch;
    
    -- Find common ancestor
    SELECT find_common_ancestor(source_head, target_head) INTO ancestor_id;
    
    -- Count commits ahead/behind
    RETURN QUERY
    WITH RECURSIVE
    source_commits AS (
        SELECT id FROM memory_commits WHERE id = source_head
        UNION ALL
        SELECT c.id
        FROM memory_commits c
        JOIN source_commits sc ON c.id = ANY(
            SELECT UNNEST(parent_ids) FROM memory_commits WHERE id = sc.id
        )
        WHERE c.id != ancestor_id
    ),
    target_commits AS (
        SELECT id FROM memory_commits WHERE id = target_head
        UNION ALL
        SELECT c.id
        FROM memory_commits c
        JOIN target_commits tc ON c.id = ANY(
            SELECT UNNEST(parent_ids) FROM memory_commits WHERE id = tc.id
        )
        WHERE c.id != ancestor_id
    )
    SELECT 
        (SELECT COUNT(*) FROM source_commits WHERE id != source_head)::INTEGER as ahead_count,
        (SELECT COUNT(*) FROM target_commits WHERE id != target_head)::INTEGER as behind_count,
        ancestor_id as common_ancestor_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for cleanup of old data
CREATE OR REPLACE FUNCTION cleanup_old_version_data(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;
    
    -- Delete old resolved conflicts
    DELETE FROM merge_conflicts 
    WHERE resolved = TRUE 
    AND created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old closed merge requests (keep merged ones for audit)
    DELETE FROM merge_requests 
    WHERE status = 'closed' 
    AND updated_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Archive old commits (implementation would move to archive table)
    -- For now, just count what would be archived
    -- DELETE FROM memory_commits 
    -- WHERE timestamp < cutoff_date 
    -- AND NOT EXISTS (
    --     SELECT 1 FROM memory_branches 
    --     WHERE head_commit_id = memory_commits.id
    -- );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add table for storing performance metrics
CREATE TABLE IF NOT EXISTS version_control_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    dimension_1 VARCHAR(255), -- e.g., branch_name
    dimension_2 VARCHAR(255), -- e.g., author_id
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes on metrics table
CREATE INDEX IF NOT EXISTS idx_vc_metrics_name_time 
    ON version_control_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vc_metrics_dimensions 
    ON version_control_metrics(dimension_1, dimension_2);

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_version_control_metric(
    p_metric_name VARCHAR(100),
    p_metric_value NUMERIC,
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_dimension_1 VARCHAR(255) DEFAULT NULL,
    p_dimension_2 VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO version_control_metrics (
        metric_name, metric_value, metric_unit, 
        dimension_1, dimension_2, metadata
    ) VALUES (
        p_metric_name, p_metric_value, p_metric_unit,
        p_dimension_1, p_dimension_2, p_metadata
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Create partitioning for large tables (if needed)
-- This would be enabled for high-volume environments

-- Add constraints for data integrity
ALTER TABLE memory_commits 
ADD CONSTRAINT check_commit_has_message 
CHECK (char_length(trim(message)) > 0);

ALTER TABLE merge_requests 
ADD CONSTRAINT check_mr_has_title 
CHECK (char_length(trim(title)) > 0);

ALTER TABLE merge_requests 
ADD CONSTRAINT check_mr_different_branches 
CHECK (source_branch != target_branch);

-- Update schema version
INSERT INTO schema_versions (version, description, applied_at) 
VALUES ('002', 'Performance optimizations and analytics', NOW())
ON CONFLICT (version) DO NOTHING;