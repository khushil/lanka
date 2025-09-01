import { z } from 'zod';

// Core version control types
export const MemoryCommitSchema = z.object({
  id: z.string().uuid(),
  parentIds: z.array(z.string().uuid()),
  memoryId: z.string().uuid(),
  branchName: z.string(),
  authorId: z.string(),
  timestamp: z.date(),
  message: z.string(),
  rationale: z.string().optional(),
  changes: z.object({
    type: z.enum(['create', 'update', 'delete', 'merge']),
    before: z.any().optional(),
    after: z.any().optional(),
    diff: z.string().optional(),
  }),
  metadata: z.record(z.any()).optional(),
});

export const MemoryBranchSchema = z.object({
  name: z.string(),
  headCommitId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string(),
  isProtected: z.boolean().default(false),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const MergeConflictSchema = z.object({
  memoryId: z.string().uuid(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  conflictType: z.enum(['semantic', 'structural', 'temporal']),
  sourceCommitId: z.string().uuid(),
  targetCommitId: z.string().uuid(),
  conflictDetails: z.object({
    field: z.string(),
    sourceValue: z.any(),
    targetValue: z.any(),
    baseValue: z.any().optional(),
  }),
  resolution: z.object({
    strategy: z.enum(['manual', 'llm', 'automatic']),
    resolvedValue: z.any(),
    rationale: z.string(),
    confidence: z.number().min(0).max(1),
  }).optional(),
});

export const MergeRequestSchema = z.object({
  id: z.string().uuid(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  title: z.string(),
  description: z.string(),
  authorId: z.string(),
  status: z.enum(['open', 'merged', 'closed', 'draft']),
  conflicts: z.array(MergeConflictSchema),
  reviewers: z.array(z.string()),
  approvals: z.array(z.object({
    reviewerId: z.string(),
    status: z.enum(['approved', 'rejected', 'requested_changes']),
    comment: z.string().optional(),
    timestamp: z.date(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VersionControlConfigSchema = z.object({
  defaultBranch: z.string().default('main'),
  autoMergeThreshold: z.number().min(0).max(1).default(0.8),
  requireReview: z.boolean().default(true),
  maxCommitHistory: z.number().default(10000),
  conflictResolutionTimeout: z.number().default(300000), // 5 minutes
  enableSemanticMerge: z.boolean().default(true),
});

// Type exports
export type MemoryCommit = z.infer<typeof MemoryCommitSchema>;
export type MemoryBranch = z.infer<typeof MemoryBranchSchema>;
export type MergeConflict = z.infer<typeof MergeConflictSchema>;
export type MergeRequest = z.infer<typeof MergeRequestSchema>;
export type VersionControlConfig = z.infer<typeof VersionControlConfigSchema>;

// Enums
export enum MergeStrategy {
  AUTO = 'auto',
  MANUAL = 'manual',
  LLM_ASSISTED = 'llm_assisted',
  THREE_WAY = 'three_way',
  OURS = 'ours',
  THEIRS = 'theirs'
}

export enum ConflictResolutionStrategy {
  SEMANTIC_MERGE = 'semantic_merge',
  TEMPORAL_PRECEDENCE = 'temporal_precedence',
  CONFIDENCE_BASED = 'confidence_based',
  HUMAN_REVIEW = 'human_review'
}

// Utility types
export interface CommitGraph {
  commits: Map<string, MemoryCommit>;
  branches: Map<string, MemoryBranch>;
  tags: Map<string, string>; // tag name -> commit id
}

export interface MemoryDiff {
  type: 'added' | 'removed' | 'modified';
  path: string;
  oldValue?: any;
  newValue?: any;
  similarity?: number;
}

export interface VersionControlMetrics {
  totalCommits: number;
  activeBranches: number;
  mergeConflictRate: number;
  averageResolutionTime: number;
  memoryEvolutionVelocity: number;
}