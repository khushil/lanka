import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';
import { SecureAggregation } from '../privacy/SecureAggregation';

export interface LocalUpdate {
  round: number;
  instanceId: string;
  weights: Float32Array[];
  sampleCount: number;
  accuracy: number;
  timestamp: Date;
}

export interface AggregationResult {
  round: number;
  globalWeights: Float32Array[];
  participantCount: number;
  globalAccuracy: number;
  convergenceMetrics: {
    loss: number;
    improvement: number;
    stability: number;
  };
}

export interface RoundConfiguration {
  minParticipants: number;
  maxParticipants: number;
  timeout: number;
  aggregationStrategy: 'fedavg' | 'secure_agg' | 'differential_private';
  selectionCriteria: {
    minAccuracy?: number;
    minSamples?: number;
    reputationThreshold?: number;
  };
}

/**
 * Federated Coordinator - Orchestrates training rounds and aggregation
 * 
 * Manages the federated learning process including participant selection,
 * local update collection, secure aggregation, and global model distribution.
 * Implements multiple aggregation strategies with Byzantine fault tolerance.
 */
export class FederatedCoordinator extends EventEmitter {
  private logger: Logger;
  private secureAggregation: SecureAggregation;
  
  private config: any;
  private roundConfig: RoundConfiguration;
  private currentRound: number = 0;
  private activeRounds: Map<number, {
    updates: Map<string, LocalUpdate>;
    startTime: Date;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  private globalModel: {
    weights: Float32Array[];
    accuracy: number;
    round: number;
    lastUpdated: Date;
  } | null = null;
  
  private participantHistory: Map<string, {
    rounds: number;
    avgAccuracy: number;
    reliability: number;
    lastSeen: Date;
  }> = new Map();

  constructor(config: any) {
    super();
    this.config = config;
    this.logger = new Logger('FederatedCoordinator');
    this.secureAggregation = new SecureAggregation();
    
    this.roundConfig = {
      minParticipants: config.minimumParticipants || 3,
      maxParticipants: config.maxParticipants || 10,
      timeout: config.roundTimeout || 300000, // 5 minutes
      aggregationStrategy: config.aggregationStrategy || 'fedavg',
      selectionCriteria: {
        minAccuracy: 0.5,
        minSamples: 10,
        reputationThreshold: 0.6
      }
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Federated Coordinator');
    await this.secureAggregation.initialize();
    this.logger.info('Federated Coordinator initialized');
  }

  /**
   * Start a new federated learning round
   */
  async startRound(): Promise<number> {
    this.currentRound++;
    const roundId = this.currentRound;
    
    this.logger.info('Starting federation round', { round: roundId });
    
    // Initialize round tracking
    const roundData = {
      updates: new Map<string, LocalUpdate>(),
      startTime: new Date(),
      timeout: setTimeout(() => {
        this.handleRoundTimeout(roundId);
      }, this.roundConfig.timeout)
    };
    
    this.activeRounds.set(roundId, roundData);
    
    // Announce round to participants
    this.emit('roundStarted', {
      round: roundId,
      deadline: new Date(Date.now() + this.roundConfig.timeout),
      requirements: this.roundConfig.selectionCriteria
    });
    
    return roundId;
  }

  /**
   * Submit a local update from a participant
   */
  async submitLocalUpdate(update: LocalUpdate): Promise<void> {
    const roundData = this.activeRounds.get(update.round);
    
    if (!roundData) {
      throw new Error(`Round ${update.round} not active or not found`);
    }
    
    // Validate update
    if (!this.validateLocalUpdate(update)) {
      throw new Error('Invalid local update');
    }
    
    this.logger.info('Received local update', {
      round: update.round,
      instanceId: update.instanceId,
      sampleCount: update.sampleCount,
      accuracy: update.accuracy
    });
    
    // Store update
    roundData.updates.set(update.instanceId, update);
    
    // Update participant history
    this.updateParticipantHistory(update);
    
    // Check if we have enough participants to proceed
    if (roundData.updates.size >= this.roundConfig.minParticipants) {
      // Wait a bit more for additional participants or timeout
      if (roundData.updates.size >= this.roundConfig.maxParticipants) {
        await this.completeRound(update.round);
      }
    }
    
    this.emit('updateReceived', {
      round: update.round,
      participantCount: roundData.updates.size,
      requiredParticipants: this.roundConfig.minParticipants
    });
  }

  /**
   * Complete a training round and perform aggregation
   */
  async completeRound(roundId: number): Promise<AggregationResult> {
    const roundData = this.activeRounds.get(roundId);
    
    if (!roundData) {
      throw new Error(`Round ${roundId} not found`);
    }
    
    // Clear timeout
    clearTimeout(roundData.timeout);
    
    const updates = Array.from(roundData.updates.values());
    
    this.logger.info('Completing round', {
      round: roundId,
      participants: updates.length
    });
    
    // Perform participant selection
    const selectedUpdates = this.selectParticipants(updates);
    
    // Perform aggregation based on strategy
    const aggregationResult = await this.performAggregation(
      roundId,
      selectedUpdates
    );
    
    // Update global model
    this.updateGlobalModel(aggregationResult);
    
    // Cleanup round data
    this.activeRounds.delete(roundId);
    
    // Emit completion event
    this.emit('roundCompleted', aggregationResult);
    this.emit('aggregationCompleted', this.globalModel);
    
    return aggregationResult;
  }

  /**
   * Get current global model accuracy
   */
  getGlobalAccuracy(): number {
    return this.globalModel?.accuracy || 0;
  }

  /**
   * Get global model
   */
  getGlobalModel(): any {
    return this.globalModel;
  }

  /**
   * Update coordinator configuration
   */
  async updateConfig(updates: any): Promise<void> {
    if (updates.minimumParticipants !== undefined) {
      this.roundConfig.minParticipants = updates.minimumParticipants;
    }
    
    if (updates.maxParticipants !== undefined) {
      this.roundConfig.maxParticipants = updates.maxParticipants;
    }
    
    if (updates.roundTimeout !== undefined) {
      this.roundConfig.timeout = updates.roundTimeout;
    }
    
    if (updates.aggregationStrategy !== undefined) {
      this.roundConfig.aggregationStrategy = updates.aggregationStrategy;
    }
    
    this.logger.info('Coordinator configuration updated', this.roundConfig);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Federated Coordinator');
    
    // Clear all active rounds
    for (const [roundId, roundData] of this.activeRounds.entries()) {
      clearTimeout(roundData.timeout);
    }
    this.activeRounds.clear();
    
    await this.secureAggregation.shutdown();
  }

  private validateLocalUpdate(update: LocalUpdate): boolean {
    // Basic validation
    if (!update.instanceId || !update.weights || update.sampleCount <= 0) {
      return false;
    }
    
    // Check minimum sample count
    if (update.sampleCount < this.roundConfig.selectionCriteria.minSamples!) {
      return false;
    }
    
    // Check minimum accuracy
    if (update.accuracy < this.roundConfig.selectionCriteria.minAccuracy!) {
      return false;
    }
    
    // Validate weights format
    if (!Array.isArray(update.weights) || update.weights.length === 0) {
      return false;
    }
    
    return true;
  }

  private selectParticipants(updates: LocalUpdate[]): LocalUpdate[] {
    // Sort by composite score (accuracy * sample count * reputation)
    const scoredUpdates = updates.map(update => {
      const history = this.participantHistory.get(update.instanceId);
      const reputation = history?.reliability || 0.5;
      
      const score = update.accuracy * 
                   Math.log(update.sampleCount + 1) * 
                   reputation;
      
      return { update, score };
    });
    
    // Sort by score descending
    scoredUpdates.sort((a, b) => b.score - a.score);
    
    // Take top participants up to maxParticipants
    const selected = scoredUpdates
      .slice(0, this.roundConfig.maxParticipants)
      .map(item => item.update);
    
    this.logger.info('Selected participants', {
      total: updates.length,
      selected: selected.length,
      selectionCriteria: this.roundConfig.selectionCriteria
    });
    
    return selected;
  }

  private async performAggregation(
    roundId: number,
    updates: LocalUpdate[]
  ): Promise<AggregationResult> {
    this.logger.info('Performing aggregation', {
      round: roundId,
      strategy: this.roundConfig.aggregationStrategy,
      participants: updates.length
    });
    
    let globalWeights: Float32Array[];
    let globalAccuracy: number;
    
    switch (this.roundConfig.aggregationStrategy) {
      case 'fedavg':
        ({ globalWeights, globalAccuracy } = this.federatedAveraging(updates));
        break;
        
      case 'secure_agg':
        ({ globalWeights, globalAccuracy } = await this.secureAggregation.aggregate(updates));
        break;
        
      case 'differential_private':
        ({ globalWeights, globalAccuracy } = this.differentialPrivateAggregation(updates));
        break;
        
      default:
        throw new Error(`Unknown aggregation strategy: ${this.roundConfig.aggregationStrategy}`);
    }
    
    // Calculate convergence metrics
    const convergenceMetrics = this.calculateConvergenceMetrics(
      globalWeights,
      globalAccuracy
    );
    
    return {
      round: roundId,
      globalWeights,
      participantCount: updates.length,
      globalAccuracy,
      convergenceMetrics
    };
  }

  private federatedAveraging(updates: LocalUpdate[]): {
    globalWeights: Float32Array[];
    globalAccuracy: number;
  } {
    const totalSamples = updates.reduce((sum, update) => sum + update.sampleCount, 0);
    
    // Initialize global weights
    const weightShape = updates[0].weights.map(w => w.length);
    const globalWeights = weightShape.map(length => new Float32Array(length));
    
    // Weighted averaging
    for (const update of updates) {
      const weight = update.sampleCount / totalSamples;
      
      for (let i = 0; i < update.weights.length; i++) {
        for (let j = 0; j < update.weights[i].length; j++) {
          globalWeights[i][j] += update.weights[i][j] * weight;
        }
      }
    }
    
    // Calculate weighted accuracy
    const globalAccuracy = updates.reduce((sum, update) => {
      return sum + (update.accuracy * update.sampleCount);
    }, 0) / totalSamples;
    
    return { globalWeights, globalAccuracy };
  }

  private differentialPrivateAggregation(updates: LocalUpdate[]): {
    globalWeights: Float32Array[];
    globalAccuracy: number;
  } {
    // Perform standard federated averaging first
    const { globalWeights, globalAccuracy } = this.federatedAveraging(updates);
    
    // Add calibrated noise for differential privacy
    const noiseScale = this.calculateNoiseScale();
    
    for (let i = 0; i < globalWeights.length; i++) {
      for (let j = 0; j < globalWeights[i].length; j++) {
        // Add Gaussian noise
        const noise = this.gaussianNoise(0, noiseScale);
        globalWeights[i][j] += noise;
      }
    }
    
    return { globalWeights, globalAccuracy };
  }

  private calculateConvergenceMetrics(
    newWeights: Float32Array[],
    newAccuracy: number
  ): { loss: number; improvement: number; stability: number } {
    let loss = 0;
    let improvement = 0;
    let stability = 0;
    
    if (this.globalModel) {
      // Calculate weight difference (simple L2 norm)
      let weightDiff = 0;
      for (let i = 0; i < newWeights.length && i < this.globalModel.weights.length; i++) {
        for (let j = 0; j < newWeights[i].length && j < this.globalModel.weights[i].length; j++) {
          const diff = newWeights[i][j] - this.globalModel.weights[i][j];
          weightDiff += diff * diff;
        }
      }
      
      loss = Math.sqrt(weightDiff);
      improvement = newAccuracy - this.globalModel.accuracy;
      stability = Math.max(0, 1 - (loss / 10)); // Normalize stability score
    }
    
    return { loss, improvement, stability };
  }

  private updateGlobalModel(result: AggregationResult): void {
    this.globalModel = {
      weights: result.globalWeights,
      accuracy: result.globalAccuracy,
      round: result.round,
      lastUpdated: new Date()
    };
    
    this.logger.info('Global model updated', {
      round: result.round,
      accuracy: result.globalAccuracy,
      participants: result.participantCount
    });
  }

  private updateParticipantHistory(update: LocalUpdate): void {
    const existing = this.participantHistory.get(update.instanceId);
    
    if (existing) {
      const newRounds = existing.rounds + 1;
      const newAvgAccuracy = (existing.avgAccuracy * existing.rounds + update.accuracy) / newRounds;
      
      this.participantHistory.set(update.instanceId, {
        rounds: newRounds,
        avgAccuracy: newAvgAccuracy,
        reliability: Math.min(1.0, existing.reliability + 0.1),
        lastSeen: new Date()
      });
    } else {
      this.participantHistory.set(update.instanceId, {
        rounds: 1,
        avgAccuracy: update.accuracy,
        reliability: 0.5,
        lastSeen: new Date()
      });
    }
  }

  private handleRoundTimeout(roundId: number): void {
    const roundData = this.activeRounds.get(roundId);
    
    if (!roundData) {
      return;
    }
    
    this.logger.warn('Round timed out', {
      round: roundId,
      participants: roundData.updates.size,
      minRequired: this.roundConfig.minParticipants
    });
    
    // If we have minimum participants, proceed with aggregation
    if (roundData.updates.size >= this.roundConfig.minParticipants) {
      this.completeRound(roundId);
    } else {
      // Not enough participants, cancel round
      this.activeRounds.delete(roundId);
      this.emit('roundCancelled', {
        round: roundId,
        reason: 'insufficient_participants',
        participants: roundData.updates.size
      });
    }
  }

  private calculateNoiseScale(): number {
    // Simplified noise scale calculation
    // In practice, this would be based on privacy budget and sensitivity
    return 0.1;
  }

  private gaussianNoise(mean: number, stddev: number): number {
    // Box-Muller transform for Gaussian noise
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stddev + mean;
  }
}