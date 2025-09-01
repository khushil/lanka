import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';
import { DifferentialPrivacy } from './DifferentialPrivacy';
import { SecureAggregation } from './SecureAggregation';

export interface PrivacyBudget {
  epsilon: number;  // Privacy loss parameter
  delta: number;    // Failure probability
  total: number;    // Total budget allocated
  consumed: number; // Amount consumed
  reserved: number; // Amount reserved for future use
}

export interface PrivacyLevel {
  name: 'strict' | 'moderate' | 'relaxed';
  epsilon: number;
  delta: number;
  noiseMultiplier: number;
  clippingThreshold: number;
}

export interface PrivacyAudit {
  operation: string;
  timestamp: Date;
  epsilonSpent: number;
  deltaSpent: number;
  remainingBudget: PrivacyBudget;
  justification: string;
}

/**
 * Privacy Manager - Central privacy-preserving mechanism controller
 * 
 * Manages differential privacy budgets, applies noise to model weights,
 * tracks privacy expenditure, and ensures information leakage prevention.
 * Implements multiple privacy levels with configurable guarantees.
 */
export class PrivacyManager extends EventEmitter {
  private logger: Logger;
  private differentialPrivacy: DifferentialPrivacy;
  private secureAggregation: SecureAggregation;
  
  private currentLevel: PrivacyLevel;
  private budget: PrivacyBudget;
  private auditLog: PrivacyAudit[] = [];
  
  private readonly privacyLevels: Record<string, PrivacyLevel> = {
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
  };

  constructor(privacyLevel: string, initialBudget: PrivacyBudget) {
    super();
    this.logger = new Logger('PrivacyManager');
    
    this.currentLevel = this.privacyLevels[privacyLevel] || this.privacyLevels.moderate;
    this.budget = { ...initialBudget };
    
    this.differentialPrivacy = new DifferentialPrivacy(this.currentLevel);
    this.secureAggregation = new SecureAggregation();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Privacy Manager', {
      level: this.currentLevel.name,
      budget: this.budget
    });
    
    await Promise.all([
      this.differentialPrivacy.initialize(),
      this.secureAggregation.initialize()
    ]);
    
    this.logger.info('Privacy Manager initialized');
  }

  /**
   * Apply differential privacy to model weights
   */
  async privatizeWeights(
    weights: Float32Array[],
    sensitivity: number = 1.0,
    operation: string = 'model_update'
  ): Promise<Float32Array[]> {
    // Check if we have sufficient budget
    const requiredEpsilon = this.currentLevel.epsilon / 10; // Conservative spending
    
    if (!this.canSpendBudget(requiredEpsilon, this.currentLevel.delta)) {
      throw new Error('Insufficient privacy budget for operation');
    }
    
    this.logger.info('Applying differential privacy', {
      operation,
      epsilon: requiredEpsilon,
      sensitivity,
      weightsShape: weights.map(w => w.length)
    });
    
    // Apply gradient clipping first
    const clippedWeights = this.clipGradients(weights, this.currentLevel.clippingThreshold);
    
    // Add calibrated noise
    const privatizedWeights = await this.differentialPrivacy.addNoise(
      clippedWeights,
      sensitivity,
      requiredEpsilon,
      this.currentLevel.delta
    );
    
    // Update budget
    this.spendBudget(requiredEpsilon, this.currentLevel.delta, operation);
    
    return privatizedWeights;
  }

  /**
   * Check if enough privacy budget remains
   */
  canParticipate(): boolean {
    const minRequired = this.currentLevel.epsilon / 20; // Very conservative
    return this.canSpendBudget(minRequired, this.currentLevel.delta);
  }

  /**
   * Get remaining privacy budget
   */
  getBudgetRemaining(): number {
    return Math.max(0, this.budget.total - this.budget.consumed);
  }

  /**
   * Get current privacy level
   */
  getCurrentLevel(): PrivacyLevel {
    return { ...this.currentLevel };
  }

  /**
   * Update privacy configuration
   */
  async updateConfig(
    newLevel?: string,
    newBudget?: Partial<PrivacyBudget>
  ): Promise<void> {
    if (newLevel && this.privacyLevels[newLevel]) {
      this.currentLevel = this.privacyLevels[newLevel];
      await this.differentialPrivacy.updateLevel(this.currentLevel);
      
      this.logger.info('Privacy level updated', { newLevel });
    }
    
    if (newBudget) {
      this.budget = { ...this.budget, ...newBudget };
      this.logger.info('Privacy budget updated', { newBudget: this.budget });
    }
    
    this.emit('configUpdated', {
      level: this.currentLevel,
      budget: this.budget
    });
  }

  /**
   * Get privacy audit trail
   */
  getAuditTrail(): PrivacyAudit[] {
    return [...this.auditLog];
  }

  /**
   * Analyze privacy guarantees for a proposed operation
   */
  analyzePrivacyImpact(
    operation: string,
    dataSize: number,
    sensitivity: number = 1.0
  ): {
    feasible: boolean;
    epsilonCost: number;
    deltaCost: number;
    recommendation: string;
  } {
    const epsilonCost = this.estimateEpsilonCost(dataSize, sensitivity);
    const deltaCost = this.currentLevel.delta;
    const feasible = this.canSpendBudget(epsilonCost, deltaCost);
    
    let recommendation = '';
    if (!feasible) {
      recommendation = 'Operation not feasible with current budget. Consider reducing data size or sensitivity.';
    } else if (epsilonCost > this.getBudgetRemaining() * 0.5) {
      recommendation = 'Operation will consume significant budget. Consider if necessary.';
    } else {
      recommendation = 'Operation has acceptable privacy impact.';
    }
    
    return {
      feasible,
      epsilonCost,
      deltaCost,
      recommendation
    };
  }

  /**
   * Generate privacy report
   */
  generatePrivacyReport(): {
    currentLevel: PrivacyLevel;
    budget: PrivacyBudget;
    auditCount: number;
    totalOperations: number;
    averageEpsilonPerOperation: number;
    recommendations: string[];
  } {
    const totalOperations = this.auditLog.length;
    const totalEpsilonSpent = this.auditLog.reduce((sum, audit) => sum + audit.epsilonSpent, 0);
    const averageEpsilonPerOperation = totalOperations > 0 ? totalEpsilonSpent / totalOperations : 0;
    
    const recommendations: string[] = [];
    
    // Budget utilization analysis
    const budgetUtilization = this.budget.consumed / this.budget.total;
    if (budgetUtilization > 0.8) {
      recommendations.push('Privacy budget utilization is high. Consider increasing budget or reducing operations.');
    }
    
    // Operation frequency analysis
    if (averageEpsilonPerOperation > this.currentLevel.epsilon / 10) {
      recommendations.push('Average epsilon cost per operation is high. Consider optimizing privacy parameters.');
    }
    
    // Level appropriateness
    if (this.currentLevel.name === 'relaxed' && budgetUtilization < 0.3) {
      recommendations.push('Consider using a stricter privacy level for better privacy guarantees.');
    }
    
    return {
      currentLevel: this.currentLevel,
      budget: this.budget,
      auditCount: this.auditLog.length,
      totalOperations,
      averageEpsilonPerOperation,
      recommendations
    };
  }

  /**
   * Reset privacy budget (careful operation)
   */
  async resetBudget(newTotal: number, justification: string): Promise<void> {
    this.logger.warn('Resetting privacy budget', {
      oldTotal: this.budget.total,
      newTotal,
      justification
    });
    
    // Audit the reset
    this.auditLog.push({
      operation: 'budget_reset',
      timestamp: new Date(),
      epsilonSpent: 0,
      deltaSpent: 0,
      remainingBudget: { ...this.budget, total: newTotal, consumed: 0 },
      justification
    });
    
    this.budget = {
      epsilon: this.currentLevel.epsilon,
      delta: this.currentLevel.delta,
      total: newTotal,
      consumed: 0,
      reserved: 0
    };
    
    this.emit('budgetReset', { newTotal, justification });
  }

  private canSpendBudget(epsilon: number, delta: number): boolean {
    const remainingEpsilon = this.budget.total - this.budget.consumed;
    const remainingDelta = this.currentLevel.delta; // Delta doesn't accumulate in the same way
    
    return remainingEpsilon >= epsilon && remainingDelta >= delta;
  }

  private spendBudget(epsilon: number, delta: number, operation: string): void {
    this.budget.consumed += epsilon;
    
    // Create audit record
    const audit: PrivacyAudit = {
      operation,
      timestamp: new Date(),
      epsilonSpent: epsilon,
      deltaSpent: delta,
      remainingBudget: { ...this.budget },
      justification: `Federated learning operation: ${operation}`
    };
    
    this.auditLog.push(audit);
    
    // Check if budget is running low
    const remaining = this.getBudgetRemaining();
    const utilizationRate = this.budget.consumed / this.budget.total;
    
    if (utilizationRate > 0.9) {
      this.emit('budgetLow', { remaining, utilizationRate });
    }
    
    if (remaining <= 0) {
      this.emit('budgetExhausted', { audit });
    }
    
    this.logger.debug('Privacy budget spent', {
      operation,
      epsilon,
      remaining,
      utilizationRate: utilizationRate.toFixed(3)
    });
  }

  private estimateEpsilonCost(dataSize: number, sensitivity: number): number {
    // Simple estimation based on data size and sensitivity
    // In practice, this would be more sophisticated
    const baseCost = this.currentLevel.epsilon / 20;
    const sizeFactor = Math.log(dataSize + 1) / 10;
    const sensitivityFactor = sensitivity;
    
    return baseCost * (1 + sizeFactor) * sensitivityFactor;
  }

  private clipGradients(
    weights: Float32Array[],
    threshold: number
  ): Float32Array[] {
    return weights.map(layer => {
      const norm = this.calculateL2Norm(layer);
      
      if (norm > threshold) {
        const scale = threshold / norm;
        return layer.map(w => w * scale);
      }
      
      return new Float32Array(layer);
    });
  }

  private calculateL2Norm(weights: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i] * weights[i];
    }
    return Math.sqrt(sum);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Privacy Manager');
    
    // Generate final privacy report
    const finalReport = this.generatePrivacyReport();
    this.logger.info('Final privacy report', finalReport);
    
    await Promise.all([
      this.differentialPrivacy.shutdown(),
      this.secureAggregation.shutdown()
    ]);
  }
}