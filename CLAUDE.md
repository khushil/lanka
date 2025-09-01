# Claude Code Configuration - SPARC Development Environment
# CLAUDE.md - LANKA Memory System Technical Specification

## System Overview

You are implementing a cognitive memory system that enhances LANKA's knowledge graph with intelligent memory capabilities. The system enables AI coding assistants to learn from every interaction, building a living knowledge base that evolves with the development team.

The architecture combines Neo4j's graph relationships with vector embeddings for semantic search, creating a dual representation that understands both meaning and structure. This isn't just storage - it's an intelligent system that reasons about what to remember, how memories relate, and when knowledge becomes outdated.

## Core Concepts and Architecture

### Memory Types

The system implements three distinct memory types based on cognitive science principles:

**System-1 Memories** capture immediate pattern recognition - the coding equivalent of muscle memory. These are things developers know instantly: "use async/await not callbacks", "check for null before dereferencing", "validate input at boundaries". They're optimized for fast retrieval through vector similarity search.

**System-2 Memories** preserve deliberate reasoning processes. When developers debug complex issues or design architectures, their step-by-step thinking creates valuable learning. These memories only store high-quality reasoning that demonstrates clear problem-solving value.

**Workspace Memories** represent shared team knowledge scoped by project boundaries. They capture agreed-upon patterns, architectural decisions, and evolved conventions that emerge from collaboration.

### The Graph-Vector Hybrid

Every memory exists in two complementary representations:

The **vector representation** enables semantic search - finding memories that mean similar things even if worded differently. When a developer asks about "handling errors in async functions", the system finds relevant patterns regardless of exact phrasing.

The **graph representation** captures relationships and evolution. It shows how patterns depend on each other, which ones evolved from earlier approaches, and what contradictions exist. This structural understanding enables questions like "what patterns would break if we change this?" or "how did our error handling evolve?"

### Memory Arbitration Intelligence

When new information arrives, the system must decide: is this a new insight, an update to existing knowledge, or outdated information to remove? This decision process, called memory arbitration, uses LLM analysis combined with similarity matching.

The arbitration considers semantic similarity (how close in meaning), structural context (graph relationships), confidence scoring (quality assessment), and temporal factors (recency and evolution). The LLM provides reasoning for each decision, creating an audit trail of why memories were added, updated, or removed.

### Quality Gates and Evolution

Not all information deserves to become memory. The system implements quality gates that ensure only valuable knowledge enters the system:

- Novelty threshold: Information must be sufficiently different from existing memories
- Confidence requirement: The system must be confident in the information's accuracy
- Value assessment: The information must provide learning or reference value
- Validation potential: The memory should be verifiable through usage

Memories aren't static - they evolve through usage patterns, contradiction resolution, and collective refinement. Frequently accessed memories strengthen their connections. Contradictions trigger resolution workflows. New insights can cause existing memories to update or deprecate.

## System Components and Behavior

### Memory Orchestrator

The Memory Orchestrator serves as the central nervous system, coordinating all memory operations through three main pipelines:

The **Ingestion Pipeline** monitors development activities through the MCP protocol, extracting potential memories from code changes, conversations, debugging sessions, and tool usage. Each candidate undergoes similarity analysis against existing memories, followed by LLM arbitration that decides whether to add, update, or skip the information.

The **Reasoning Pipeline** specifically watches for complex problem-solving. It detects reasoning patterns through linguistic markers and interaction patterns, evaluates the quality of reasoning across multiple dimensions, and only preserves traces that demonstrate genuine insight and teaching value.

The **Evolution Engine** continuously improves the knowledge base by analyzing usage patterns to identify valuable memories, detecting and resolving contradictions between memories, merging similar insights to prevent fragmentation, and adjusting memory strength based on validation through successful application.

### Storage Architecture

The system uses specialized storage for different aspects of memories:

**Neo4j** stores the knowledge graph, capturing memories as nodes with rich relationships like IMPLEMENTS, EVOLVED_FROM, CONTRADICTS, and DEPENDS_ON. This enables complex queries about how knowledge connects and evolves.

**Vector Database** (Qdrant or Milvus) stores high-dimensional embeddings of each memory, enabling rapid semantic similarity search. Separate collections for different memory types allow optimized indexing strategies.

**PostgreSQL** provides ACID guarantees for critical system data including conversation histories, configuration, audit logs, and event streams. Write-ahead logging ensures every operation is recoverable.

**Redis** accelerates frequent operations by caching hot memories, precomputed traversal results, and active session state.

### MCP Server Design

The system exposes its capabilities through the Model Context Protocol in two modes:

**Default Mode** provides a single, unified interface that understands natural language requests. The AI assistant can say "remember this pattern" or "what do we know about error handling" without specifying technical details. The system interprets intent and routes to appropriate subsystems.

**Aggregator Mode** acts as an intelligent proxy for other MCP servers while adding memory capabilities. Every operation through proxied tools gets analyzed for learning opportunities. File operations, git commits, API calls - all become sources of potential memories.

### Plugin Architecture

Plugins extend system intelligence without modifying core code. They operate as first-class citizens that can:

- Subscribe to system events and contribute specialized analysis
- Create new node and relationship types in the graph
- Introduce domain-specific memory categories
- Build on other plugins' contributions through graph discovery

The plugin ecosystem encourages emergent behaviors. A security analyzer might identify vulnerable patterns. A performance analyzer could notice these patterns also impact speed. Together, they create multi-dimensional understanding no single plugin could achieve.

Plugins communicate indirectly through the graph, leaving nodes and edges that others can discover. This creates a marketplace of ideas where valuable insights naturally propagate while poor-quality contributions remain isolated.

## Intelligence Patterns and Algorithms

### Graph Traversal Intelligence

The system implements sophisticated traversal algorithms that reveal hidden connections:

**Temporal Evolution Analysis** follows EVOLVED_FROM relationships to understand how patterns developed over time. This reveals which approaches succeeded, why others failed, and how teams adapt to new technologies.

**Dependency Impact Assessment** traverses DEPENDS_ON relationships before changes, identifying all memories that rely on patterns targeted for modification. This prevents breaking changes and suggests migration strategies.

**Cross-Domain Pattern Bridging** discovers analogies between different domains through structural similarity. The system might notice that microservice communication patterns mirror frontend component patterns, enabling insight transfer.

**Wisdom Path Discovery** analyzes successful developers' memory contributions over time, identifying optimal learning sequences. This reveals which foundational concepts enable advanced understanding and what experiences accelerate growth.

### Memory Retrieval Strategies

When retrieving memories, the system combines multiple strategies:

**Semantic Search** finds memories with similar meaning using vector similarity. This handles variations in terminology and phrasing.

**Structural Search** traverses graph relationships to find connected knowledge. This reveals dependencies, evolution, and context.

**Hybrid Ranking** combines semantic and structural signals with temporal relevance, quality scores, and workspace-specific weights to rank results optimally.

**Context Composition** assembles retrieved memories intelligently within token limits, using hierarchical summarization and priority-based inclusion to maximize information value.

### Contradiction Resolution

When memories conflict, the system initiates intelligent resolution:

1. Trace historical context of each conflicting approach
2. Analyze usage patterns to understand when each succeeds
3. Identify synthesis opportunities where both have merit
4. Use LLM mediation to suggest unified patterns
5. Create new memories explaining contextual application

## Integration Specifications

### LANKA Integration

The memory system enhances LANKA's existing intelligence:

- Extend LANKA's Neo4j schema with Memory nodes and relationships
- When LANKA generates architecture, query relevant memory patterns
- Feed successful LANKA outputs back as high-quality memories
- Subscribe to LANKA events to capture learning opportunities
- Preserve all existing LANKA functionality while adding memory layer

### Vector Embedding Strategy

Generate embeddings using code-aware models (like CodeBERT) that understand programming syntax and semantics. System-1 memories use embeddings that capture code patterns and similarities. System-2 memories use embeddings that preserve logical structure and reasoning flow.

Maintain embedding version tracking to handle model updates. Implement re-embedding pipelines for critical memories when models improve.

### Event-Driven Coordination

All components communicate through events to maintain consistency:

- Memory operations emit events before and after execution
- Storage systems subscribe to relevant events for updates  
- Plugins receive filtered event streams based on capabilities
- Failed operations trigger compensating transactions
- Event replay enables system recovery and debugging

## Version Control and Federation

### Memory Version Control

The system implements git-like semantics for memory evolution:

Every memory operation creates an immutable commit with parent references, change descriptions, and LLM-generated rationales. Teams can branch to experiment with new patterns, merge to incorporate validated knowledge, and rollback when needed.

Merging handles semantic conflicts through LLM arbitration, not just textual differences. The system understands when seemingly different memories express the same concept.

### Federated Learning

Teams share insights without exposing proprietary code:

Each team's instance trains local models on their memory patterns. Only model weights (with differential privacy noise) are shared - never raw memories or code. The aggregated global model identifies universally valuable patterns that transcend team boundaries.

Privacy budgets limit information leakage over time. Teams control participation and can opt out while still benefiting from global insights.

## Performance and Scaling Considerations

### Scaling Strategies

Design for horizontal scaling from the start:

- Partition by workspace for natural isolation boundaries
- Distribute vector indices across nodes based on access patterns  
- Implement read replicas for search-heavy workloads
- Use event streaming for loose coupling between components

### Query Optimization

Optimize for common access patterns:

- Most queries combine semantic and structural elements
- Recent memories are accessed more frequently
- Workspace-scoped queries dominate cross-workspace
- Traversal depth rarely exceeds 3-4 hops

Build indices and caching strategies around these patterns. Pre-compute common traversals. Maintain hot paths in cache.

### Batch Processing

Handle large-scale operations efficiently:

- Bulk memory ingestion from historical codebases
- Periodic re-embedding for model updates
- Graph structure optimization and cleanup
- Cross-workspace pattern analysis

Design these as offline operations that don't impact real-time performance.

## Security and Privacy

### Threat Model

Consider these security concerns:

**Memory Injection**: Malicious actors might inject false memories to influence AI behavior
**Graph Traversal Exploits**: Crafted queries could cause resource exhaustion
**Embedding Inversion**: Statistical attacks might reveal code from embeddings
**Cross-Workspace Leakage**: Memories might leak between security boundaries

### Mitigation Strategies

Implement defense in depth:

- Validate all memory content against schemas and security rules
- Limit graph traversal depth and complexity
- Add noise to embeddings for differential privacy
- Enforce workspace boundaries at every layer
- Audit all operations for compliance tracking

### Plugin Security

Plugins operate in constrained environments:

- Declare capabilities upfront, enforced at runtime
- Resource quotas prevent runaway consumption
- Graph modifications are scoped and validated
- No direct access to other plugins' data
- Regular security audits of popular plugins

## Operational Patterns

### Health Monitoring

Track system health through memory-specific metrics:

- Memory creation rate and quality distribution
- Graph connectivity and complexity growth
- Query performance by type and pattern
- Plugin ecosystem health and diversity
- Storage utilization and growth trends

### Backup and Recovery

Implement comprehensive data protection:

- Continuous replication of graph changes
- Point-in-time recovery for any commit
- Cross-region backup for disaster recovery
- Event replay for state reconstruction
- Regular recovery drills

### Gradual Rollout

Deploy with confidence through phased approaches:

- Start with read-only memory queries
- Enable memory creation for pilot teams
- Gradually increase plugin ecosystem access
- Monitor metrics at each expansion phase
- Maintain rollback capabilities

## Success Indicators

The system succeeds when:

- Developers naturally phrase questions to their AI assistants expecting memory-enhanced answers
- Time to resolve similar issues decreases measurably
- Code patterns spread organically through memory suggestions
- New team members onboard faster using memory-guided learning
- The graph reveals non-obvious connections that lead to insights
- Plugin ecosystem grows without central coordination
- Teams request federation participation to share learnings

## Design Principles

Throughout implementation, maintain these principles:

**Invisible Intelligence**: The system should enhance capabilities without adding cognitive load. Developers shouldn't need to think about memory operations - they should just experience smarter assistance.

**Trust Through Transparency**: Every memory decision should be explainable. Developers must understand why memories were created, updated, or removed.

**Evolution Over Revolution**: Start simple and let usage patterns guide complexity. The system will teach you what it needs through developer behavior.

**Privacy By Design**: Workspace boundaries are sacred. Federation is opt-in. Developers control their data.

**Quality Over Quantity**: Better to have 100 excellent memories than 10,000 mediocre ones. Quality gates matter more than capture rate.

Remember: you're not just building a storage system. You're creating an intelligent layer that transforms every line of code into organizational learning, every debugging session into future wisdom, and every architectural decision into evolved understanding. The memories you capture today become the intelligence that guides tomorrow's development.

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL:
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY:
- Coordination and planning
- Memory management
- Neural features
- Performance tracking
- Swarm orchestration
- GitHub integration

**KEY**: MCP coordinates, Claude Code executes.

## 🚀 Quick Setup

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

## 📋 Agent Coordination Protocol

### Every Agent MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT (Single Message):
```javascript
[BatchTool]:
  // Initialize swarm
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  
  // Spawn agents with Task tool
  Task("Research agent: Analyze requirements...")
  Task("Coder agent: Implement features...")
  Task("Tester agent: Create test suite...")
  
  // Batch todos
  TodoWrite { todos: [
    {id: "1", content: "Research", status: "in_progress", priority: "high"},
    {id: "2", content: "Design", status: "pending", priority: "high"},
    {id: "3", content: "Implement", status: "pending", priority: "high"},
    {id: "4", content: "Test", status: "pending", priority: "medium"},
    {id: "5", content: "Document", status: "pending", priority: "low"}
  ]}
  
  // File operations
  Bash "mkdir -p app/{src,tests,docs}"
  Write "app/src/index.js"
  Write "app/tests/index.test.js"
  Write "app/docs/README.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
