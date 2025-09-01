import { registerAs } from '@nestjs/config';
import { VersionControlConfig } from '../types';

export default registerAs('versionControl', (): VersionControlConfig => ({
  defaultBranch: process.env.VC_DEFAULT_BRANCH || 'main',
  autoMergeThreshold: parseFloat(process.env.VC_AUTO_MERGE_THRESHOLD || '0.8'),
  requireReview: process.env.VC_REQUIRE_REVIEW !== 'false',
  maxCommitHistory: parseInt(process.env.VC_MAX_COMMIT_HISTORY || '10000', 10),
  conflictResolutionTimeout: parseInt(process.env.VC_CONFLICT_TIMEOUT || '300000', 10), // 5 minutes
  enableSemanticMerge: process.env.VC_ENABLE_SEMANTIC_MERGE !== 'false',
}));

// Development configuration
export const developmentConfig: Partial<VersionControlConfig> = {
  autoMergeThreshold: 0.7,
  requireReview: false,
  maxCommitHistory: 1000,
  conflictResolutionTimeout: 60000, // 1 minute for faster development
};

// Production configuration
export const productionConfig: Partial<VersionControlConfig> = {
  autoMergeThreshold: 0.9,
  requireReview: true,
  maxCommitHistory: 50000,
  conflictResolutionTimeout: 600000, // 10 minutes for complex conflicts
  enableSemanticMerge: true,
};

// Test configuration
export const testConfig: Partial<VersionControlConfig> = {
  autoMergeThreshold: 0.5,
  requireReview: false,
  maxCommitHistory: 100,
  conflictResolutionTimeout: 5000, // 5 seconds for fast tests
  enableSemanticMerge: false, // Disable to avoid LLM calls in tests
};