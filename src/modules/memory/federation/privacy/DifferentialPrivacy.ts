import { Logger } from '../../../utils/logger';

export interface NoiseParameters {
  mechanism: 'gaussian' | 'laplace';
  sensitivity: number;
  epsilon: number;
  delta?: number;
  scale?: number;
}

export interface PrivacyAccountant {
  totalEpsilon: number;
  totalDelta: number;
  operations: Array<{
    timestamp: Date;
    epsilon: number;
    delta: number;
    mechanism: string;
  }>;
}

/**
 * Differential Privacy Implementation
 * 
 * Provides noise mechanisms for achieving differential privacy guarantees
 * in federated learning. Supports both Gaussian and Laplace mechanisms
 * with proper privacy accounting.
 */
export class DifferentialPrivacy {
  private logger: Logger;
  private privacyLevel: any;
  private accountant: PrivacyAccountant;

  constructor(privacyLevel: any) {
    this.logger = new Logger('DifferentialPrivacy');
    this.privacyLevel = privacyLevel;
    this.accountant = {
      totalEpsilon: 0,
      totalDelta: 0,
      operations: []
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Differential Privacy', {
      epsilon: this.privacyLevel.epsilon,
      delta: this.privacyLevel.delta
    });
  }

  /**
   * Add calibrated noise to weights for differential privacy
   */
  async addNoise(
    weights: Float32Array[],
    sensitivity: number,
    epsilon: number,
    delta: number = 1e-5
  ): Promise<Float32Array[]> {
    const mechanism = delta > 0 ? 'gaussian' : 'laplace';
    
    this.logger.debug('Adding differential privacy noise', {
      mechanism,
      sensitivity,
      epsilon,
      delta,
      weightsShape: weights.map(w => w.length)
    });

    const noiseParams: NoiseParameters = {
      mechanism,
      sensitivity,
      epsilon,
      delta,
      scale: this.calculateNoiseScale(sensitivity, epsilon, delta, mechanism)
    };

    const noisyWeights = weights.map(layer => {
      const noisyLayer = new Float32Array(layer.length);
      
      for (let i = 0; i < layer.length; i++) {
        const noise = this.generateNoise(noiseParams);
        noisyLayer[i] = layer[i] + noise;
      }
      
      return noisyLayer;
    });

    // Update privacy accountant
    this.updateAccountant(epsilon, delta, mechanism);

    return noisyWeights;
  }

  /**
   * Generate noise sample based on mechanism
   */
  private generateNoise(params: NoiseParameters): number {
    switch (params.mechanism) {
      case 'gaussian':
        return this.gaussianNoise(0, params.scale!);
      case 'laplace':
        return this.laplaceNoise(0, params.scale!);
      default:
        throw new Error(`Unknown noise mechanism: ${params.mechanism}`);
    }
  }

  /**
   * Calculate noise scale for given privacy parameters
   */
  private calculateNoiseScale(
    sensitivity: number,
    epsilon: number,
    delta: number,
    mechanism: string
  ): number {
    switch (mechanism) {
      case 'gaussian':
        // Gaussian mechanism scale: σ = sqrt(2 ln(1.25/δ)) * Δf / ε
        const c = Math.sqrt(2 * Math.log(1.25 / delta));
        return (c * sensitivity) / epsilon;
      
      case 'laplace':
        // Laplace mechanism scale: b = Δf / ε
        return sensitivity / epsilon;
      
      default:
        throw new Error(`Unknown noise mechanism: ${mechanism}`);
    }
  }

  /**
   * Generate Gaussian noise using Box-Muller transform
   */
  private gaussianNoise(mean: number, stddev: number): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stddev + mean;
  }

  /**
   * Generate Laplace noise
   */
  private laplaceNoise(location: number, scale: number): number {
    const u = Math.random() - 0.5;
    return location - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Update privacy accountant with new operation
   */
  private updateAccountant(epsilon: number, delta: number, mechanism: string): void {
    this.accountant.totalEpsilon += epsilon;
    this.accountant.totalDelta += delta;
    
    this.accountant.operations.push({
      timestamp: new Date(),
      epsilon,
      delta,
      mechanism
    });

    this.logger.debug('Privacy accountant updated', {
      totalEpsilon: this.accountant.totalEpsilon,
      totalDelta: this.accountant.totalDelta,
      operationCount: this.accountant.operations.length
    });
  }

  /**
   * Get current privacy spending
   */
  getPrivacySpending(): PrivacyAccountant {
    return {
      ...this.accountant,
      operations: [...this.accountant.operations]
    };
  }

  /**
   * Reset privacy accountant
   */
  resetAccountant(): void {
    this.logger.info('Resetting privacy accountant');
    this.accountant = {
      totalEpsilon: 0,
      totalDelta: 0,
      operations: []
    };
  }

  /**
   * Update privacy level configuration
   */
  async updateLevel(newLevel: any): Promise<void> {
    this.logger.info('Updating privacy level', {
      oldLevel: this.privacyLevel,
      newLevel
    });
    
    this.privacyLevel = newLevel;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Differential Privacy', {
      finalSpending: this.accountant
    });
  }
}