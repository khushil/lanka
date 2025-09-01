-- LANKA Memory Version Control Initial Schema Migration
-- Version: 001
-- Description: Create initial tables for memory version control system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Memory Commits Table
CREATE TABLE memory_commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_ids UUID[] NOT NULL DEFAULT '{}',
    memory_id UUID NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT NOT NULL,
    rationale TEXT,
    changes JSONB NOT NULL,
    metadata JSONB,
    signature VARCHAR(64), -- SHA-256 hash for integrity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory Branches Table
CREATE TABLE memory_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    head_commit_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    is_protected BOOLEAN DEFAULT FALSE,
    description TEXT,
    metadata JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory Tags Table
CREATE TABLE memory_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    commit_id UUID NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    metadata JSONB
);

-- Merge Conflicts Table
CREATE TABLE merge_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL,
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('semantic', 'structural', 'temporal')),
    source_commit_id UUID NOT NULL,
    target_commit_id UUID NOT NULL,
    conflict_details JSONB NOT NULL,
    resolution JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Merge Requests Table
CREATE TABLE merge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed', 'draft')),
    conflicts JSONB DEFAULT '[]',
    reviewers TEXT[] DEFAULT '{}',
    approvals JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    merged_commit_id UUID,
    merged_by VARCHAR(255),
    merged_at TIMESTAMP WITH TIME ZONE
);

-- Create Indexes for Performance
-- Commit indexes
CREATE INDEX idx_memory_commits_branch_timestamp ON memory_commits(branch_name, timestamp DESC);
CREATE INDEX idx_memory_commits_memory_id ON memory_commits(memory_id);
CREATE INDEX idx_memory_commits_author ON memory_commits(author_id);
CREATE INDEX idx_memory_commits_timestamp ON memory_commits(timestamp DESC);
CREATE INDEX idx_memory_commits_parent_ids ON memory_commits USING GIN(parent_ids);

-- Branch indexes
CREATE INDEX idx_memory_branches_name ON memory_branches(name);
CREATE INDEX idx_memory_branches_head_commit ON memory_branches(head_commit_id);
CREATE INDEX idx_memory_branches_created_at ON memory_branches(created_at DESC);

-- Tag indexes
CREATE INDEX idx_memory_tags_name ON memory_tags(name);
CREATE INDEX idx_memory_tags_commit_id ON memory_tags(commit_id);

-- Conflict indexes
CREATE INDEX idx_merge_conflicts_memory_id ON merge_conflicts(memory_id);
CREATE INDEX idx_merge_conflicts_branches ON merge_conflicts(source_branch, target_branch);
CREATE INDEX idx_merge_conflicts_resolved ON merge_conflicts(resolved);
CREATE INDEX idx_merge_conflicts_created_at ON merge_conflicts(created_at DESC);

-- Merge request indexes
CREATE INDEX idx_merge_requests_source_branch ON merge_requests(source_branch);
CREATE INDEX idx_merge_requests_target_branch ON merge_requests(target_branch);
CREATE INDEX idx_merge_requests_status ON merge_requests(status);
CREATE INDEX idx_merge_requests_author ON merge_requests(author_id);
CREATE INDEX idx_merge_requests_reviewers ON merge_requests USING GIN(reviewers);
CREATE INDEX idx_merge_requests_created_at ON merge_requests(created_at DESC);

-- Foreign Key Constraints
ALTER TABLE memory_branches 
    ADD CONSTRAINT fk_memory_branches_head_commit 
    FOREIGN KEY (head_commit_id) REFERENCES memory_commits(id);

ALTER TABLE memory_tags 
    ADD CONSTRAINT fk_memory_tags_commit 
    FOREIGN KEY (commit_id) REFERENCES memory_commits(id);

ALTER TABLE merge_conflicts 
    ADD CONSTRAINT fk_merge_conflicts_source_commit 
    FOREIGN KEY (source_commit_id) REFERENCES memory_commits(id);

ALTER TABLE merge_conflicts 
    ADD CONSTRAINT fk_merge_conflicts_target_commit 
    FOREIGN KEY (target_commit_id) REFERENCES memory_commits(id);

ALTER TABLE merge_requests 
    ADD CONSTRAINT fk_merge_requests_merged_commit 
    FOREIGN KEY (merged_commit_id) REFERENCES memory_commits(id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_memory_commits_updated_at 
    BEFORE UPDATE ON memory_commits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_branches_updated_at 
    BEFORE UPDATE ON memory_branches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merge_conflicts_updated_at 
    BEFORE UPDATE ON merge_conflicts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merge_requests_updated_at 
    BEFORE UPDATE ON merge_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate commit integrity
CREATE OR REPLACE FUNCTION validate_commit_signature()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate expected signature (simplified for demo)
    NEW.signature = encode(
        digest(
            CONCAT(
                array_to_string(NEW.parent_ids, ','),
                NEW.memory_id,
                NEW.timestamp::text,
                NEW.message,
                NEW.changes::text
            ), 
            'sha256'
        ), 
        'hex'
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic signature generation
CREATE TRIGGER generate_commit_signature 
    BEFORE INSERT OR UPDATE ON memory_commits 
    FOR EACH ROW EXECUTE FUNCTION validate_commit_signature();

-- Create view for commit graph traversal
CREATE VIEW commit_graph AS
SELECT 
    c.id,
    c.memory_id,
    c.branch_name,
    c.author_id,
    c.timestamp,
    c.message,
    c.parent_ids,
    CASE 
        WHEN array_length(c.parent_ids, 1) > 1 THEN 'merge'
        WHEN array_length(c.parent_ids, 1) = 1 THEN 'commit'
        ELSE 'initial'
    END as commit_type,
    b.name as current_branch_name,
    b.is_protected as is_on_protected_branch
FROM memory_commits c
LEFT JOIN memory_branches b ON c.branch_name = b.name;

-- Create view for merge request summary
CREATE VIEW merge_request_summary AS
SELECT 
    mr.id,
    mr.title,
    mr.status,
    mr.author_id,
    mr.source_branch,
    mr.target_branch,
    mr.created_at,
    mr.updated_at,
    jsonb_array_length(mr.conflicts) as conflict_count,
    array_length(mr.reviewers, 1) as reviewer_count,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(mr.approvals) as approval
        WHERE approval->>'status' = 'approved'
    ) as approval_count,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(mr.approvals) as approval
        WHERE approval->>'status' = 'rejected'
    ) as rejection_count
FROM merge_requests mr;

-- Insert initial main branch (will be created by first commit)
-- This is handled by the application logic

-- Create indexes on JSONB fields for better query performance
CREATE INDEX idx_memory_commits_changes_type ON memory_commits USING GIN ((changes->>'type'));
CREATE INDEX idx_merge_conflicts_conflict_details ON merge_conflicts USING GIN (conflict_details);
CREATE INDEX idx_merge_requests_conflicts ON merge_requests USING GIN (conflicts);
CREATE INDEX idx_merge_requests_approvals ON merge_requests USING GIN (approvals);

-- Create extension for full-text search if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index for searching commit messages
CREATE INDEX idx_memory_commits_message_search ON memory_commits USING GIN (message gin_trgm_ops);
CREATE INDEX idx_merge_requests_title_search ON merge_requests USING GIN (title gin_trgm_ops);
CREATE INDEX idx_merge_requests_description_search ON merge_requests USING GIN (description gin_trgm_ops);

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lanka_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lanka_app_user;

-- Add comments for documentation
COMMENT ON TABLE memory_commits IS 'Immutable commits representing memory state changes';
COMMENT ON TABLE memory_branches IS 'Branch heads pointing to latest commits';
COMMENT ON TABLE memory_tags IS 'Named references to specific commits';
COMMENT ON TABLE merge_conflicts IS 'Detected conflicts during merge operations';
COMMENT ON TABLE merge_requests IS 'Pull request-like workflow for memory changes';

COMMENT ON COLUMN memory_commits.parent_ids IS 'Array of parent commit IDs for merge commits';
COMMENT ON COLUMN memory_commits.signature IS 'SHA-256 hash for commit integrity verification';
COMMENT ON COLUMN memory_commits.changes IS 'JSONB containing before/after state and change type';
COMMENT ON COLUMN memory_branches.is_protected IS 'Prevents unauthorized changes to critical branches';
COMMENT ON COLUMN merge_conflicts.conflict_type IS 'Type of conflict: semantic, structural, or temporal';
COMMENT ON COLUMN merge_requests.conflicts IS 'Array of unresolved conflicts blocking merge';

-- Version tracking
INSERT INTO schema_versions (version, description, applied_at) 
VALUES ('001', 'Initial memory version control schema', NOW())
ON CONFLICT (version) DO NOTHING;