# LANKA Memory System - Version Control Module

The Version Control module provides Git-like semantics for memory evolution in the LANKA Memory System. It enables tracking changes, branching, merging, and conflict resolution for cognitive memories with full audit trails and LLM-powered conflict resolution.

## Features

### 🌳 Git-like Semantics
- **Immutable Commits**: Every memory change creates an immutable commit with parent references
- **Branch Management**: Create, merge, and delete branches with protection rules
- **Merge Strategies**: Multiple strategies including auto-merge, LLM-assisted, and manual resolution
- **Rollback Support**: Revert to any previous commit state

### 🧠 Intelligent Conflict Resolution
- **Semantic Conflict Detection**: LLM-powered analysis of semantic differences
- **Three-way Merging**: Smart merge using common ancestor analysis
- **Automatic Resolution**: Heuristic-based resolution for common conflict patterns
- **Manual Override**: Human-in-the-loop resolution for complex conflicts

### 📊 Memory Evolution Tracking
- **Diff Generation**: Detailed diffs with similarity scoring
- **Change Visualization**: Timeline and graph views of memory evolution
- **Analytics**: Performance metrics and evolution patterns
- **Audit Trail**: Complete history of all changes with rationales

### 🔄 Pull Request Workflow
- **Merge Requests**: GitHub-style review process for memory changes
- **Code Review**: Multi-reviewer approval workflow
- **Conflict Visualization**: Visual diff and conflict resolution tools
- **Auto-merge**: Intelligent merging with quality gates

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Controllers    │    │    Services     │    │     Models      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ VersionControl  │ -> │ VersionControl  │ -> │ MemoryCommit    │
│ MergeRequest    │    │ ConflictRes.    │    │ MemoryBranch    │
│ Visualization   │    │ DiffService     │    │ MergeConflict   │
└─────────────────┘    │ MergeRequest    │    │ MergeRequest    │
                       │ Visualization   │    └─────────────────┘
                       └─────────────────┘
```

### Core Components

1. **VersionControlService**: Main service for commit and branch operations
2. **ConflictResolutionService**: LLM-powered conflict resolution
3. **DiffService**: Generates detailed diffs between memory states
4. **MergeRequestService**: Pull request workflow management
5. **VisualizationService**: Memory evolution visualization

## Usage

### Basic Operations

```typescript
// Create a new commit
const commit = await versionControl.createCommit(
  'memory-uuid',
  'main',
  'user-id',
  'Update memory pattern',
  {
    type: 'update',
    before: { content: 'old pattern' },
    after: { content: 'new improved pattern' }
  },
  'Improved pattern based on recent usage'
);

// Create a feature branch
const branch = await versionControl.createBranch(
  'feature/new-algorithm',
  commit.id,
  'developer-id',
  'Experimenting with new algorithm approach'
);

// Merge branches
const result = await versionControl.mergeBranches(
  'feature/new-algorithm',
  'main',
  MergeStrategy.AUTO,
  'maintainer-id'
);
```

### Merge Request Workflow

```typescript
// Create merge request
const mr = await mergeRequestService.createMergeRequest(
  'feature/optimization',
  'main',
  'Performance optimization for memory retrieval',
  'This MR implements caching and indexing improvements',
  'developer-id',
  ['reviewer-1', 'reviewer-2']
);

// Add review
await mergeRequestService.addReview(
  mr.id,
  'reviewer-1',
  'approved',
  'Performance improvements look solid'
);

// Auto-resolve conflicts if any
await mergeRequestService.autoResolveConflicts(mr.id);

// Merge the request
await mergeRequestService.mergeMergeRequest(mr.id, 'maintainer-id');
```

### Conflict Resolution

```typescript
// Resolve conflicts manually
await mergeRequestService.resolveConflicts(mr.id, [
  {
    conflictIndex: 0,
    resolvedValue: { 
      content: 'Merged approach combining both patterns' 
    },
    rationale: 'Combined the benefits of both approaches'
  }
]);

// Or use LLM auto-resolution
await mergeRequestService.autoResolveConflicts(mr.id);
```

### Visualization

```typescript
// Get commit graph
const graph = await visualization.generateCommitGraph(['main', 'develop']);

// Memory evolution timeline
const timeline = await visualization.generateMemoryTimeline('memory-uuid');

// Branch comparison
const comparison = await visualization.generateBranchComparison(
  'feature/a', 
  'feature/b'
);
```

## API Endpoints

### Branch Operations
- `POST /memory/version-control/branches` - Create branch
- `GET /memory/version-control/branches` - List branches
- `GET /memory/version-control/branches/:name` - Get branch details
- `DELETE /memory/version-control/branches/:name` - Delete branch

### Commit Operations
- `POST /memory/version-control/commits` - Create commit
- `GET /memory/version-control/commits` - Get commit history
- `GET /memory/version-control/commits/:id/diff/:targetId` - Get diff

### Merge Operations
- `POST /memory/version-control/merge` - Merge branches
- `POST /memory/version-control/rollback` - Rollback to commit

### Merge Requests
- `POST /memory/version-control/merge-requests` - Create MR
- `GET /memory/version-control/merge-requests` - List MRs
- `POST /memory/version-control/merge-requests/:id/review` - Add review
- `POST /memory/version-control/merge-requests/:id/merge` - Merge MR

### Visualization
- `GET /memory/version-control/visualize/commit-graph` - Commit graph
- `GET /memory/version-control/visualize/memory-timeline/:id` - Memory timeline
- `GET /memory/version-control/visualize/branch-comparison` - Branch comparison

## Database Schema

### Memory Commits
```sql
CREATE TABLE memory_commits (
  id UUID PRIMARY KEY,
  parent_ids UUID[],
  memory_id UUID NOT NULL,
  branch_name VARCHAR NOT NULL,
  author_id VARCHAR NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  message TEXT NOT NULL,
  rationale TEXT,
  changes JSONB NOT NULL,
  metadata JSONB,
  signature VARCHAR -- Cryptographic integrity
);
```

### Memory Branches
```sql
CREATE TABLE memory_branches (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  head_commit_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR NOT NULL,
  is_protected BOOLEAN DEFAULT FALSE,
  description TEXT,
  metadata JSONB
);
```

## Configuration

```typescript
const config: VersionControlConfig = {
  defaultBranch: 'main',
  autoMergeThreshold: 0.8,
  requireReview: true,
  maxCommitHistory: 10000,
  conflictResolutionTimeout: 300000, // 5 minutes
  enableSemanticMerge: true,
};
```

## Testing

### Unit Tests
```bash
npm test src/modules/memory/version-control/tests/unit/
```

### Integration Tests
```bash
npm test src/modules/memory/version-control/tests/integration/
```

### Test Coverage
- VersionControlService: 95%+
- ConflictResolutionService: 90%+
- DiffService: 98%+
- MergeRequestService: 88%+

## Performance Considerations

### Optimizations
- **Commit Graph Indexing**: Efficient parent-child relationship queries
- **Diff Caching**: Cache frequently accessed diffs
- **Bulk Operations**: Batch commit creation for large imports
- **Query Optimization**: Indexed queries for history traversal

### Scalability
- **Partitioning**: Partition by workspace for isolation
- **Archival**: Archive old commits based on retention policy
- **Compression**: Compress large diff objects
- **Streaming**: Stream large result sets

## Error Handling

### Common Errors
- `BRANCH_NOT_FOUND`: Branch does not exist
- `COMMIT_NOT_FOUND`: Commit does not exist
- `MERGE_CONFLICT`: Conflicts detected during merge
- `PROTECTION_VIOLATION`: Attempt to modify protected branch
- `DUPLICATE_BRANCH`: Branch name already exists

### Recovery Strategies
- **Transaction Rollback**: All operations are atomic
- **Conflict Resolution**: Multiple resolution strategies
- **Data Integrity**: Cryptographic signatures prevent corruption
- **Audit Trail**: Complete history for debugging

## Security

### Access Control
- **Branch Protection**: Prevent unauthorized changes to critical branches
- **Review Requirements**: Enforce review policies
- **Audit Logging**: Track all operations with user attribution
- **Integrity Checking**: Cryptographic verification of commits

### Data Protection
- **Encryption**: Encrypt sensitive memory content
- **Workspace Isolation**: Prevent cross-workspace access
- **Rate Limiting**: Prevent abuse of expensive operations
- **Sanitization**: Clean user inputs and outputs

## Monitoring

### Key Metrics
- Commit velocity (commits/day)
- Merge success rate
- Conflict resolution time
- Branch proliferation
- Memory evolution patterns

### Alerts
- High conflict rate
- Failed merges
- Long-running conflicts
- Storage usage thresholds

## Future Enhancements

### Planned Features
- **Federated Version Control**: Cross-instance synchronization
- **AI Merge Assistant**: Advanced LLM integration for complex conflicts
- **Visual Merge Tool**: Web-based conflict resolution interface
- **Automated Testing**: CI/CD integration for memory changes
- **Performance Analytics**: Detailed performance impact analysis

### Research Areas
- **Semantic Similarity**: Improved conflict detection algorithms
- **Learning from Conflicts**: System learns from resolution patterns
- **Predictive Merging**: Predict and prevent conflicts before they occur
- **Distributed Consensus**: Multi-node consistency protocols

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility
5. Add performance benchmarks for new operations

## License

This module is part of the LANKA Memory System and follows the project's licensing terms.