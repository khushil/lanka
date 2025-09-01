/**
 * LANKA Memory System - Version Control Module
 * 
 * Git-like version control for cognitive memory evolution with intelligent
 * conflict resolution and comprehensive audit trails.
 * 
 * @author LANKA Development Team
 * @version 1.0.0
 */

// Core services
export { VersionControlService } from './services/version-control.service';
export { ConflictResolutionService } from './services/conflict-resolution.service';
export { DiffService } from './services/diff.service';
export { MergeRequestService } from './services/merge-request.service';
export { VisualizationService } from './utils/visualization.service';

// Models and entities
export { 
  MemoryCommitEntity, 
  MemoryBranchEntity, 
  MemoryTagEntity, 
  MergeConflictEntity 
} from './models/commit.model';

// Types and interfaces
export * from './types';

// Module definition
export { VersionControlModule } from './version-control.module';

// Controller
export { VersionControlController } from './controllers/version-control.controller';

// Configuration
export { default as versionControlConfig } from './config/version-control.config';

// Examples (for development and documentation)
export { VersionControlExamples } from './examples/basic-usage.example';
export { AdvancedVersionControlPatterns } from './examples/advanced-patterns.example';

// Re-export commonly used types for convenience
export type {
  MemoryCommit,
  MemoryBranch,
  MergeConflict,
  MergeRequest,
  VersionControlConfig,
  MemoryDiff,
  CommitGraph,
  VersionControlMetrics
} from './types';

// Re-export enums
export { MergeStrategy, ConflictResolutionStrategy } from './types';

/**
 * Version Control Module Information
 */
export const VERSION_CONTROL_MODULE_INFO = {
  name: '@lanka/memory-version-control',
  version: '1.0.0',
  description: 'Git-like version control system for LANKA cognitive memories',
  features: [
    'Immutable commit history with parent references',
    'Branch management with protection rules',
    'LLM-powered semantic conflict resolution',
    'Three-way merge algorithms',
    'Pull request workflow with reviews',
    'Memory evolution visualization',
    'Diff generation with similarity scoring',
    'Rollback capabilities',
    'Comprehensive audit trails',
  ],
  compatibility: {
    nodejs: '>=18.0.0',
    typescript: '>=5.0.0',
    nestjs: '>=10.0.0',
  },
} as const;