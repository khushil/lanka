/**
 * Basic Usage Examples for LANKA Memory Version Control
 * 
 * This file demonstrates common patterns and workflows for using the
 * version control system with cognitive memories.
 */

import { VersionControlService } from '../services/version-control.service';
import { MergeRequestService } from '../services/merge-request.service';
import { MergeStrategy } from '../types';

export class VersionControlExamples {
  constructor(
    private readonly versionControl: VersionControlService,
    private readonly mergeRequestService: MergeRequestService,
  ) {}

  /**
   * Example 1: Basic Memory Evolution
   * Shows how to track changes to a memory over time
   */
  async basicMemoryEvolution() {
    const memoryId = 'error-handling-patterns';
    const userId = 'developer-1';

    // Initial memory creation
    const initialCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      userId,
      'Add error handling patterns',
      {
        type: 'create',
        after: {
          title: 'JavaScript Error Handling Patterns',
          content: 'Use try-catch blocks for error handling',
          examples: [
            'try { riskyOperation(); } catch (error) { console.error(error); }'
          ],
          tags: ['javascript', 'error-handling', 'basic'],
          confidence: 0.7,
        }
      },
      'Initial documentation of basic error handling approach'
    );

    console.log('Created initial commit:', initialCommit.id);

    // Update memory with improved pattern
    const updatedCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      userId,
      'Improve error handling with async/await',
      {
        type: 'update',
        before: {
          title: 'JavaScript Error Handling Patterns',
          content: 'Use try-catch blocks for error handling',
          examples: [
            'try { riskyOperation(); } catch (error) { console.error(error); }'
          ],
          tags: ['javascript', 'error-handling', 'basic'],
          confidence: 0.7,
        },
        after: {
          title: 'Modern JavaScript Error Handling Patterns',
          content: 'Use try-catch blocks with async/await and proper error types',
          examples: [
            'try { await riskyAsyncOperation(); } catch (error) { if (error instanceof ValidationError) { handleValidation(error); } else { throw error; } }'
          ],
          tags: ['javascript', 'error-handling', 'async', 'modern'],
          confidence: 0.9,
        }
      },
      'Enhanced pattern based on modern async/await practices and typed errors'
    );

    console.log('Updated memory with improved pattern:', updatedCommit.id);
    return { initialCommit, updatedCommit };
  }

  /**
   * Example 2: Feature Branch Workflow
   * Shows how to experiment with new patterns using branches
   */
  async featureBranchWorkflow() {
    const memoryId = 'caching-strategies';
    const userId = 'developer-2';

    // Create initial memory on main branch
    const mainCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      userId,
      'Add basic caching strategy',
      {
        type: 'create',
        after: {
          title: 'Simple In-Memory Caching',
          content: 'Use Map for basic caching needs',
          pattern: 'const cache = new Map(); if (!cache.has(key)) { cache.set(key, expensiveOperation(key)); } return cache.get(key);',
          pros: ['Simple', 'Fast for small datasets'],
          cons: ['No TTL', 'Memory leaks possible'],
          confidence: 0.8,
        }
      },
      'Basic caching implementation suitable for small applications'
    );

    // Create experimental branch
    const experimentBranch = await this.versionControl.createBranch(
      'feature/redis-caching',
      mainCommit.id,
      userId,
      'Experiment with Redis-based caching for scalability'
    );

    // Add experimental pattern to feature branch
    const experimentCommit = await this.versionControl.createCommit(
      memoryId,
      'feature/redis-caching',
      userId,
      'Add Redis caching with TTL support',
      {
        type: 'update',
        before: {
          title: 'Simple In-Memory Caching',
          content: 'Use Map for basic caching needs',
          pattern: 'const cache = new Map(); if (!cache.has(key)) { cache.set(key, expensiveOperation(key)); } return cache.get(key);',
        },
        after: {
          title: 'Distributed Redis Caching',
          content: 'Use Redis for scalable caching with TTL and persistence',
          pattern: 'const cached = await redis.get(key); if (!cached) { const result = await expensiveOperation(key); await redis.setex(key, 3600, JSON.stringify(result)); return result; } return JSON.parse(cached);',
          pros: ['Scalable', 'TTL support', 'Persistent', 'Distributed'],
          cons: ['Network overhead', 'Additional dependency', 'Serialization cost'],
          confidence: 0.85,
        }
      },
      'Redis provides better scalability and TTL management for distributed systems'
    );

    console.log('Created experimental branch and commit:', {
      branch: experimentBranch.name,
      commit: experimentCommit.id,
    });

    return { mainCommit, experimentBranch, experimentCommit };
  }

  /**
   * Example 3: Merge Request with Reviews
   * Shows the complete review workflow
   */
  async mergeRequestWorkflow() {
    const { mainCommit, experimentCommit } = await this.featureBranchWorkflow();

    // Create merge request
    const mergeRequest = await this.mergeRequestService.createMergeRequest(
      'feature/redis-caching',
      'main',
      'Add Redis caching support',
      `## Summary
This MR introduces Redis-based caching to replace simple in-memory caching.

## Changes
- Replaced Map-based cache with Redis client
- Added TTL support (1 hour default)
- Included error handling for Redis connectivity
- Added serialization/deserialization logic

## Benefits
- Scales across multiple application instances
- Automatic cache expiration
- Persistence across application restarts
- Better memory management

## Testing
- Unit tests for cache hit/miss scenarios
- Integration tests with Redis container
- Performance benchmarks showing 2x improvement`,
      'developer-2',
      ['senior-dev-1', 'architect-1']
    );

    console.log('Created merge request:', mergeRequest.id);

    // First review - requests changes
    await this.mergeRequestService.addReview(
      mergeRequest.id,
      'senior-dev-1',
      'requested_changes',
      'Code looks good overall, but please add error handling for Redis connection failures and fallback to in-memory cache.'
    );

    // Address feedback by updating the branch
    await this.versionControl.createCommit(
      'caching-strategies',
      'feature/redis-caching',
      'developer-2',
      'Add fallback to in-memory cache on Redis failure',
      {
        type: 'update',
        before: experimentCommit.changes.after,
        after: {
          ...experimentCommit.changes.after,
          pattern: `try { 
            const cached = await redis.get(key); 
            if (!cached) { 
              const result = await expensiveOperation(key); 
              await redis.setex(key, 3600, JSON.stringify(result)); 
              return result; 
            } 
            return JSON.parse(cached); 
          } catch (redisError) { 
            console.warn('Redis unavailable, falling back to memory cache'); 
            return memoryCache.get(key) || memoryCache.set(key, await expensiveOperation(key)).get(key); 
          }`,
          resilience: 'Graceful degradation to in-memory cache when Redis is unavailable',
          confidence: 0.92,
        }
      },
      'Added resilient fallback mechanism as requested in code review'
    );

    // Second review - approval
    await this.mergeRequestService.addReview(
      mergeRequest.id,
      'senior-dev-1',
      'approved',
      'Great job adding the fallback mechanism. The resilience pattern looks solid.'
    );

    // Architect review - approval
    await this.mergeRequestService.addReview(
      mergeRequest.id,
      'architect-1',
      'approved',
      'Architecture is sound. The fallback pattern follows our resilience guidelines.'
    );

    // Merge the request
    const mergeResult = await this.mergeRequestService.mergeMergeRequest(
      mergeRequest.id,
      'senior-dev-1',
      MergeStrategy.AUTO
    );

    console.log('Merged successfully:', mergeResult);
    return mergeRequest;
  }

  /**
   * Example 4: Handling Merge Conflicts
   * Shows how conflicts are detected and resolved
   */
  async conflictResolutionExample() {
    const memoryId = 'authentication-patterns';
    const userId1 = 'frontend-dev';
    const userId2 = 'security-dev';

    // Create initial memory
    const baseCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      'architect-1',
      'Initial authentication pattern',
      {
        type: 'create',
        after: {
          title: 'Basic JWT Authentication',
          approach: 'Simple JWT with username/password',
          implementation: 'Store JWT in localStorage, check expiry on each request',
          security: 'Basic token validation',
          confidence: 0.6,
        }
      },
      'Starting point for authentication patterns'
    );

    // Frontend team creates their branch
    await this.versionControl.createBranch('feature/frontend-auth', baseCommit.id, userId1);
    
    const frontendCommit = await this.versionControl.createCommit(
      memoryId,
      'feature/frontend-auth',
      userId1,
      'Improve UX with refresh tokens',
      {
        type: 'update',
        before: baseCommit.changes.after,
        after: {
          title: 'JWT with Refresh Token Authentication',
          approach: 'JWT access token with refresh token for seamless UX',
          implementation: 'Store access token in memory, refresh token in httpOnly cookie, auto-refresh on expiry',
          security: 'Improved with httpOnly cookies and auto-refresh',
          ux: 'Seamless experience with automatic token refresh',
          confidence: 0.8,
        }
      },
      'Enhanced UX by eliminating login prompts through refresh tokens'
    );

    // Security team creates their branch
    await this.versionControl.createBranch('feature/security-hardening', baseCommit.id, userId2);
    
    const securityCommit = await this.versionControl.createCommit(
      memoryId,
      'feature/security-hardening',
      userId2,
      'Add security hardening',
      {
        type: 'update',
        before: baseCommit.changes.after,
        after: {
          title: 'Hardened JWT Authentication',
          approach: 'JWT with PKCE and additional security headers',
          implementation: 'Store JWT in secure storage with CSRF protection, validate issuer and audience',
          security: 'PKCE flow, CSRF tokens, secure storage, comprehensive validation',
          compliance: 'Meets OWASP recommendations for token security',
          confidence: 0.85,
        }
      },
      'Enhanced security following OWASP guidelines and PKCE standards'
    );

    // Try to merge both branches - this will create conflicts
    const frontendMergeRequest = await this.mergeRequestService.createMergeRequest(
      'feature/frontend-auth',
      'main',
      'Add refresh token support',
      'Improves user experience with automatic token refresh',
      userId1,
      ['architect-1']
    );

    // Merge frontend changes first
    await this.mergeRequestService.addReview(frontendMergeRequest.id, 'architect-1', 'approved', 'UX improvements look good');
    await this.mergeRequestService.mergeMergeRequest(frontendMergeRequest.id, 'architect-1');

    // Now try to merge security changes - this will conflict
    const securityMergeRequest = await this.mergeRequestService.createMergeRequest(
      'feature/security-hardening',
      'main',
      'Add security hardening',
      'Implements OWASP security recommendations',
      userId2,
      ['architect-1']
    );

    // Auto-resolve conflicts using LLM
    const resolvedMR = await this.mergeRequestService.autoResolveConflicts(securityMergeRequest.id);
    
    console.log('Conflicts auto-resolved:', resolvedMR.conflicts?.length || 0);

    // Review and merge
    await this.mergeRequestService.addReview(securityMergeRequest.id, 'architect-1', 'approved', 'Good synthesis of UX and security requirements');
    await this.mergeRequestService.mergeMergeRequest(securityMergeRequest.id, 'architect-1');

    return { frontendMergeRequest, securityMergeRequest };
  }

  /**
   * Example 5: Memory Rollback Scenario
   * Shows how to rollback problematic changes
   */
  async rollbackScenario() {
    const memoryId = 'database-connection';
    const userId = 'backend-dev';

    // Good initial implementation
    const goodCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      userId,
      'Add connection pooling',
      {
        type: 'create',
        after: {
          pattern: 'Connection pooling with proper cleanup',
          implementation: 'const pool = new Pool({ max: 10, idleTimeoutMillis: 30000 }); // proper cleanup logic',
          performance: 'Handles 100 concurrent connections efficiently',
          confidence: 0.9,
        }
      },
      'Stable connection pooling implementation tested in production'
    );

    // Problematic "optimization"
    const problematicCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      userId,
      'Optimize for higher throughput',
      {
        type: 'update',
        before: goodCommit.changes.after,
        after: {
          pattern: 'Aggressive connection pooling with minimal cleanup',
          implementation: 'const pool = new Pool({ max: 100, idleTimeoutMillis: 0 }); // skip cleanup for speed',
          performance: 'Claims to handle 500+ concurrent connections',
          confidence: 0.7,
          warning: 'Experimental optimization - needs more testing',
        }
      },
      'Experimental optimization to handle higher load - needs production validation'
    );

    // After problems in production, rollback
    const rollbackCommit = await this.versionControl.rollback(
      'main',
      goodCommit.id,
      userId
    );

    console.log('Rolled back to stable version:', {
      from: problematicCommit.id,
      to: goodCommit.id,
      rollbackCommit: rollbackCommit.id,
    });

    // Get history to see the rollback
    const history = await this.versionControl.getCommitHistory('main', 5);
    console.log('Recent history after rollback:', history.map(c => ({ id: c.id, message: c.message })));

    return { goodCommit, problematicCommit, rollbackCommit };
  }

  /**
   * Example 6: Collaborative Memory Development
   * Shows how multiple developers can work on the same memory
   */
  async collaborativeMemoryDevelopment() {
    const memoryId = 'api-design-patterns';
    const baseCommit = await this.versionControl.createCommit(
      memoryId,
      'main',
      'api-designer',
      'Initial REST API design pattern',
      {
        type: 'create',
        after: {
          title: 'RESTful API Design Patterns',
          principles: ['Resource-based URLs', 'HTTP methods for operations', 'Status codes for responses'],
          example: 'GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id',
          confidence: 0.8,
        }
      },
      'Foundation pattern for REST API design'
    );

    // Different team members add specialized knowledge
    const branches = [
      { name: 'feature/graphql-patterns', developer: 'graphql-expert', focus: 'GraphQL integration' },
      { name: 'feature/rate-limiting', developer: 'performance-engineer', focus: 'Rate limiting strategies' },
      { name: 'feature/versioning', developer: 'api-architect', focus: 'API versioning approaches' },
    ];

    const commits = [];
    for (const branch of branches) {
      await this.versionControl.createBranch(branch.name, baseCommit.id, branch.developer);
      
      const commit = await this.versionControl.createCommit(
        memoryId,
        branch.name,
        branch.developer,
        `Add ${branch.focus.toLowerCase()} patterns`,
        {
          type: 'update',
          before: baseCommit.changes.after,
          after: {
            ...baseCommit.changes.after,
            [branch.focus.toLowerCase().replace(' ', '_')]: `Specialized patterns for ${branch.focus}`,
            contributors: [branch.developer],
          }
        },
        `Enhanced API patterns with ${branch.focus} expertise`
      );
      commits.push(commit);
    }

    // Create merge requests for all branches
    const mergeRequests = [];
    for (let i = 0; i < branches.length; i++) {
      const mr = await this.mergeRequestService.createMergeRequest(
        branches[i].name,
        'main',
        `Add ${branches[i].focus} patterns`,
        `Contribution from ${branches[i].developer} adding ${branches[i].focus} expertise`,
        branches[i].developer,
        ['api-designer', 'senior-architect']
      );
      mergeRequests.push(mr);
    }

    // Review and merge all requests
    for (const mr of mergeRequests) {
      await this.mergeRequestService.addReview(mr.id, 'api-designer', 'approved', 'Great addition to our API patterns');
      await this.mergeRequestService.addReview(mr.id, 'senior-architect', 'approved', 'Aligns with our architecture guidelines');
      await this.mergeRequestService.mergeMergeRequest(mr.id, 'api-designer');
    }

    console.log('Collaborative development completed:', {
      baseCommit: baseCommit.id,
      branches: branches.map(b => b.name),
      commits: commits.map(c => c.id),
      mergeRequests: mergeRequests.map(mr => mr.id),
    });

    return { baseCommit, branches, commits, mergeRequests };
  }
}

// Usage demonstration
export async function demonstrateVersionControl(
  versionControl: VersionControlService,
  mergeRequestService: MergeRequestService,
) {
  const examples = new VersionControlExamples(versionControl, mergeRequestService);

  console.log('=== LANKA Memory Version Control Examples ===\n');

  // Example 1: Basic Evolution
  console.log('1. Basic Memory Evolution');
  await examples.basicMemoryEvolution();
  console.log('✓ Demonstrated memory evolution through commits\n');

  // Example 2: Feature Branch
  console.log('2. Feature Branch Workflow');
  await examples.featureBranchWorkflow();
  console.log('✓ Demonstrated branching for experimental patterns\n');

  // Example 3: Merge Request
  console.log('3. Merge Request with Reviews');
  await examples.mergeRequestWorkflow();
  console.log('✓ Demonstrated complete review workflow\n');

  // Example 4: Conflict Resolution
  console.log('4. Conflict Resolution');
  await examples.conflictResolutionExample();
  console.log('✓ Demonstrated automatic conflict resolution\n');

  // Example 5: Rollback
  console.log('5. Rollback Scenario');
  await examples.rollbackScenario();
  console.log('✓ Demonstrated rollback to stable version\n');

  // Example 6: Collaboration
  console.log('6. Collaborative Development');
  await examples.collaborativeMemoryDevelopment();
  console.log('✓ Demonstrated multi-developer collaboration\n');

  console.log('All examples completed successfully! 🎉');
}