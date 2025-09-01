/**
 * Federation Module - Federated Learning for LANKA Memory System
 * 
 * This module implements federated learning capabilities for the LANKA Memory System,
 * enabling privacy-preserving collaborative learning across multiple instances.
 * 
 * Key Features:
 * - Differential privacy with configurable privacy budgets
 * - Secure multi-party computation for model aggregation
 * - Byzantine fault-tolerant consensus mechanisms
 * - Comprehensive privacy compliance monitoring
 * - Cross-instance communication protocols
 * 
 * @example
 * ```typescript
 * import { FederationService, FederationConfig } from './federation';
 * 
 * const config: FederationConfig = {
 *   instanceId: 'my-instance',
 *   federationEnabled: true,
 *   privacyLevel: 'moderate',
 *   maxParticipants: 10,
 *   roundTimeout: 300000,
 *   minimumParticipants: 3,
 *   aggregationStrategy: 'fedavg',
 *   privacyBudget: {
 *     epsilon: 3.0,
 *     delta: 1e-4,
 *     total: 100.0,
 *     consumed: 0.0
 *   },
 *   modelConfig: {
 *     architecture: 'neural_network',
 *     inputDimensions: 128,
 *     hiddenLayers: [64, 32],
 *     outputDimensions: 16,
 *     learningRate: 0.001,
 *     epochs: 10
 *   }
 * };
 * 
 * const federationService = new FederationService(config);
 * await federationService.initialize();
 * 
 * // Join federation network
 * await federationService.joinFederation('network-id', ['node1.com', 'node2.com']);
 * 
 * // Train on local memory patterns
 * const patterns = await getMemoryPatterns();
 * await federationService.startTrainingRound(patterns);
 * ```
 */

// Core components
export { FederationService } from './core/FederationService';
export { FederatedCoordinator } from './core/FederatedCoordinator';
export { ConsensusManager } from './core/ConsensusManager';

// Privacy components
export { PrivacyManager } from './privacy/PrivacyManager';
export { DifferentialPrivacy } from './privacy/DifferentialPrivacy';
export { SecureAggregation } from './privacy/SecureAggregation';

// Training components
export { ModelTrainer } from './training/ModelTrainer';

// Communication components
export { CommunicationProtocol } from './communication/CommunicationProtocol';

// Analytics components
export { FederationAnalytics } from './analytics/FederationAnalytics';

// Type exports
export type {
  FederationConfig,
  FederationMetrics,
  InstanceInfo
} from './core/FederationService';

export type {
  LocalUpdate,
  AggregationResult,
  RoundConfiguration
} from './core/FederatedCoordinator';

export type {
  ConsensusProposal,
  Vote,
  ConsensusResult,
  ParticipantInfo
} from './core/ConsensusManager';

export type {
  PrivacyBudget,
  PrivacyLevel,
  PrivacyAudit
} from './privacy/PrivacyManager';

export type {
  NoiseParameters,
  PrivacyAccountant
} from './privacy/DifferentialPrivacy';

export type {
  SecureShare,
  AggregationState
} from './privacy/SecureAggregation';

export type {
  ModelConfig,
  TrainingData,
  LocalModel,
  MemoryPattern
} from './training/ModelTrainer';

export type {
  NetworkMessage,
  PeerInfo,
  NetworkTopology,
  CommunicationMetrics
} from './communication/CommunicationProtocol';

export type {
  FederationMetrics as AnalyticsMetrics,
  LearningTrend,
  ParticipantAnalysis,
  GlobalPatternInsight
} from './analytics/FederationAnalytics';

/**
 * Default federation configuration
 */
export const DEFAULT_FEDERATION_CONFIG: Partial<FederationConfig> = {
  federationEnabled: false,
  privacyLevel: 'moderate',
  maxParticipants: 10,
  roundTimeout: 300000, // 5 minutes
  minimumParticipants: 3,
  aggregationStrategy: 'fedavg',
  privacyBudget: {
    epsilon: 3.0,
    delta: 1e-4,
    total: 100.0,
    consumed: 0.0
  }
};

/**
 * Privacy level configurations
 */
export const PRIVACY_LEVELS = {
  strict: {
    name: 'strict',
    epsilon: 1.0,
    delta: 1e-5,
    noiseMultiplier: 1.5,
    clippingThreshold: 1.0
  },
  moderate: {
    name: 'moderate',
    epsilon: 3.0,
    delta: 1e-4,
    noiseMultiplier: 1.0,
    clippingThreshold: 2.0
  },
  relaxed: {
    name: 'relaxed',
    epsilon: 6.0,
    delta: 1e-3,
    noiseMultiplier: 0.5,
    clippingThreshold: 4.0
  }
} as const;

/**
 * Aggregation strategies
 */
export const AGGREGATION_STRATEGIES = {
  FEDERATED_AVERAGING: 'fedavg',
  SECURE_AGGREGATION: 'secure_agg',
  DIFFERENTIAL_PRIVATE: 'differential_private'
} as const;

/**
 * Federation factory function
 */
export function createFederationService(config: FederationConfig): FederationService {
  return new FederationService(config);
}

/**
 * Utility function to validate federation configuration
 */
export function validateFederationConfig(config: Partial<FederationConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.instanceId) {
    errors.push('instanceId is required');
  }

  if (config.maxParticipants && config.maxParticipants < 2) {
    errors.push('maxParticipants must be at least 2');
  }

  if (config.minimumParticipants && config.minimumParticipants < 1) {
    errors.push('minimumParticipants must be at least 1');
  }

  if (config.maxParticipants && config.minimumParticipants && 
      config.maxParticipants < config.minimumParticipants) {
    errors.push('maxParticipants must be >= minimumParticipants');
  }

  if (config.privacyBudget) {
    const budget = config.privacyBudget;
    if (budget.epsilon <= 0) {
      errors.push('privacy budget epsilon must be positive');
    }
    if (budget.delta <= 0 || budget.delta >= 1) {
      errors.push('privacy budget delta must be between 0 and 1');
    }
    if (budget.total <= 0) {
      errors.push('privacy budget total must be positive');
    }
    if (budget.consumed < 0) {
      errors.push('privacy budget consumed cannot be negative');
    }
    if (budget.consumed > budget.total) {
      errors.push('privacy budget consumed cannot exceed total');
    }
  }

  if (config.modelConfig) {
    const model = config.modelConfig;
    if (model.inputDimensions <= 0) {
      errors.push('model inputDimensions must be positive');
    }
    if (model.outputDimensions <= 0) {
      errors.push('model outputDimensions must be positive');
    }
    if (model.learningRate <= 0 || model.learningRate > 1) {
      errors.push('model learningRate must be between 0 and 1');
    }
    if (model.epochs <= 0) {
      errors.push('model epochs must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Utility function to estimate privacy budget consumption
 */
export function estimatePrivacyBudgetUsage(
  operationCount: number,
  dataSize: number,
  sensitivity: number = 1.0,
  privacyLevel: keyof typeof PRIVACY_LEVELS = 'moderate'
): number {
  const level = PRIVACY_LEVELS[privacyLevel];
  const baseEpsilon = level.epsilon / 20; // Conservative base cost
  const sizeFactor = Math.log(dataSize + 1) / 10;
  const sensitivityFactor = sensitivity;
  
  return operationCount * baseEpsilon * (1 + sizeFactor) * sensitivityFactor;
}

/**
 * Utility function to check federation readiness
 */
export function checkFederationReadiness(config: FederationConfig): {
  ready: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check privacy budget
  const budgetUtilization = config.privacyBudget.consumed / config.privacyBudget.total;
  if (budgetUtilization > 0.8) {
    warnings.push('Privacy budget is 80% consumed');
    recommendations.push('Consider increasing privacy budget or reducing operations');
  }

  // Check participant counts
  if (config.minimumParticipants < 3) {
    warnings.push('Minimum participants is less than 3, which may affect Byzantine fault tolerance');
    recommendations.push('Consider setting minimumParticipants to at least 3 for better fault tolerance');
  }

  // Check timeout settings
  if (config.roundTimeout < 60000) {
    warnings.push('Round timeout is less than 1 minute, which may be too aggressive');
    recommendations.push('Consider increasing roundTimeout for better stability');
  }

  // Check privacy level vs aggregation strategy
  if (config.privacyLevel === 'strict' && config.aggregationStrategy === 'fedavg') {
    recommendations.push('Consider using "differential_private" aggregation strategy with strict privacy level');
  }

  return {
    ready: warnings.length === 0,
    warnings,
    recommendations
  };
}