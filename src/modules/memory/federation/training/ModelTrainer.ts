import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';

export interface ModelConfig {
  architecture: string;
  inputDimensions: number;
  hiddenLayers: number[];
  outputDimensions: number;
  learningRate: number;
  epochs: number;
  batchSize?: number;
  optimizer: 'sgd' | 'adam' | 'adagrad';
  lossFunction: 'mse' | 'crossentropy' | 'hinge';
}

export interface TrainingData {
  features: Float32Array[];
  labels: Float32Array[];
  metadata?: {
    memoryType: string;
    workspaceId: string;
    timestamp: Date;
    quality: number;
  };
}

export interface LocalModel {
  weights: Float32Array[];
  biases: Float32Array[];
  accuracy: number;
  loss: number;
  epochs: number;
  sampleCount: number;
  metadata: {
    trainingTime: number;
    convergenceRate: number;
    validationAccuracy?: number;
  };
}

export interface MemoryPattern {
  id: string;
  type: 'system1' | 'system2' | 'workspace';
  content: string;
  embeddings: Float32Array;
  relationships: string[];
  usage_count: number;
  success_rate: number;
  workspace_id?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Model Trainer - Local model training for federated learning
 * 
 * Trains neural models on local memory patterns to learn coding patterns,
 * best practices, and domain-specific knowledge while preserving privacy.
 * Supports incremental learning and transfer learning capabilities.
 */
export class ModelTrainer extends EventEmitter {
  private logger: Logger;
  private config: ModelConfig;
  private currentModel: LocalModel | null = null;
  private isInitialized: boolean = false;
  
  // Neural network components
  private weights: Float32Array[] = [];
  private biases: Float32Array[] = [];
  private activations: Float32Array[] = [];
  private gradients: Float32Array[] = [];

  constructor(config: ModelConfig) {
    super();
    this.config = config;
    this.logger = new Logger('ModelTrainer');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Model Trainer', this.config);
    
    // Initialize neural network architecture
    this.initializeNetwork();
    
    this.isInitialized = true;
    this.logger.info('Model Trainer initialized');
  }

  /**
   * Train local model on memory patterns
   */
  async trainLocal(memoryPatterns: MemoryPattern[]): Promise<LocalModel> {
    if (!this.isInitialized) {
      throw new Error('Model trainer not initialized');
    }

    this.logger.info('Starting local training', {
      patterns: memoryPatterns.length,
      epochs: this.config.epochs
    });

    const startTime = Date.now();
    
    // Prepare training data
    const trainingData = await this.prepareTrainingData(memoryPatterns);
    
    // Perform training
    const trainingResult = await this.performTraining(trainingData);
    
    const trainingTime = Date.now() - startTime;
    
    // Create local model
    this.currentModel = {
      weights: this.weights.map(w => new Float32Array(w)),
      biases: this.biases.map(b => new Float32Array(b)),
      accuracy: trainingResult.accuracy,
      loss: trainingResult.loss,
      epochs: this.config.epochs,
      sampleCount: memoryPatterns.length,
      metadata: {
        trainingTime,
        convergenceRate: trainingResult.convergenceRate,
        validationAccuracy: trainingResult.validationAccuracy
      }
    };
    
    this.logger.info('Local training completed', {
      accuracy: this.currentModel.accuracy,
      loss: this.currentModel.loss,
      trainingTime
    });
    
    this.emit('trainingCompleted', this.currentModel);
    
    return this.currentModel;
  }

  /**
   * Update model with global weights from federated aggregation
   */
  async updateGlobalModel(globalModel: {
    weights: Float32Array[];
    accuracy: number;
    round: number;
  }): Promise<void> {
    this.logger.info('Updating with global model', {
      round: globalModel.round,
      globalAccuracy: globalModel.accuracy
    });
    
    // Update local weights with global model
    for (let i = 0; i < this.weights.length && i < globalModel.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length && j < globalModel.weights[i].length; j++) {
        this.weights[i][j] = globalModel.weights[i][j];
      }
    }
    
    this.emit('globalModelUpdated', {
      round: globalModel.round,
      accuracy: globalModel.accuracy
    });
  }

  /**
   * Perform inference on new memory patterns
   */
  async predict(patterns: MemoryPattern[]): Promise<{
    predictions: Float32Array[];
    confidence: number[];
    classifications: string[];
  }> {
    if (!this.currentModel) {
      throw new Error('No trained model available for prediction');
    }

    const predictions: Float32Array[] = [];
    const confidence: number[] = [];
    const classifications: string[] = [];
    
    for (const pattern of patterns) {
      const input = this.preprocessPattern(pattern);
      const output = this.forwardPass(input);
      
      predictions.push(new Float32Array(output));
      confidence.push(Math.max(...Array.from(output)));
      classifications.push(this.classifyOutput(output, pattern.type));
    }
    
    this.logger.debug('Predictions generated', {
      patterns: patterns.length,
      avgConfidence: confidence.reduce((a, b) => a + b, 0) / confidence.length
    });
    
    return { predictions, confidence, classifications };
  }

  /**
   * Evaluate model performance
   */
  async evaluate(testPatterns: MemoryPattern[]): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: number[][];
  }> {
    if (!this.currentModel) {
      throw new Error('No trained model available for evaluation');
    }

    const predictions = await this.predict(testPatterns);
    const trueLabels = testPatterns.map(p => this.encodeLabelForType(p.type));
    
    // Calculate metrics
    let correct = 0;
    const confusionMatrix = this.initializeConfusionMatrix();
    
    for (let i = 0; i < predictions.classifications.length; i++) {
      const predicted = this.encodeLabelForType(predictions.classifications[i]);
      const actual = trueLabels[i];
      
      if (predicted === actual) {
        correct++;
      }
      
      confusionMatrix[actual][predicted]++;
    }
    
    const accuracy = correct / predictions.classifications.length;
    const { precision, recall, f1Score } = this.calculatePRF(confusionMatrix);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix
    };
  }

  /**
   * Update training configuration
   */
  async updateConfig(newConfig?: Partial<ModelConfig>): Promise<void> {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.logger.info('Model configuration updated', newConfig);
      
      // Re-initialize network if architecture changed
      if (newConfig.hiddenLayers || newConfig.inputDimensions || newConfig.outputDimensions) {
        this.initializeNetwork();
      }
    }
  }

  /**
   * Get current model state
   */
  getCurrentModel(): LocalModel | null {
    return this.currentModel ? {
      ...this.currentModel,
      weights: this.currentModel.weights.map(w => new Float32Array(w)),
      biases: this.currentModel.biases.map(b => new Float32Array(b))
    } : null;
  }

  private initializeNetwork(): void {
    const layers = [
      this.config.inputDimensions,
      ...this.config.hiddenLayers,
      this.config.outputDimensions
    ];
    
    this.weights = [];
    this.biases = [];
    this.activations = [];
    this.gradients = [];
    
    // Initialize weights and biases for each layer
    for (let i = 0; i < layers.length - 1; i++) {
      const inputSize = layers[i];
      const outputSize = layers[i + 1];
      
      // Xavier/Glorot initialization
      const limit = Math.sqrt(6 / (inputSize + outputSize));
      const layerWeights = new Float32Array(inputSize * outputSize);
      
      for (let j = 0; j < layerWeights.length; j++) {
        layerWeights[j] = (Math.random() * 2 - 1) * limit;
      }
      
      this.weights.push(layerWeights);
      this.biases.push(new Float32Array(outputSize));
      this.activations.push(new Float32Array(outputSize));
      this.gradients.push(new Float32Array(outputSize));
    }
    
    this.logger.info('Neural network initialized', {
      layers: layers,
      totalParameters: this.getTotalParameters()
    });
  }

  private async prepareTrainingData(patterns: MemoryPattern[]): Promise<TrainingData> {
    const features: Float32Array[] = [];
    const labels: Float32Array[] = [];
    
    for (const pattern of patterns) {
      // Convert pattern to feature vector
      const featureVector = this.preprocessPattern(pattern);
      features.push(featureVector);
      
      // Create label vector
      const labelVector = this.createLabelVector(pattern);
      labels.push(labelVector);
    }
    
    return {
      features,
      labels,
      metadata: {
        memoryType: 'mixed',
        workspaceId: 'federated',
        timestamp: new Date(),
        quality: this.calculateDataQuality(patterns)
      }
    };
  }

  private preprocessPattern(pattern: MemoryPattern): Float32Array {
    // Create feature vector from pattern
    const features = new Float32Array(this.config.inputDimensions);
    
    // Use embeddings if available
    if (pattern.embeddings && pattern.embeddings.length > 0) {
      const embeddingLength = Math.min(pattern.embeddings.length, features.length);
      for (let i = 0; i < embeddingLength; i++) {
        features[i] = pattern.embeddings[i];
      }
    } else {
      // Generate simple features from content
      this.generateContentFeatures(pattern.content, features);
    }
    
    // Add metadata features
    const metadataOffset = features.length - 10; // Reserve last 10 for metadata
    if (metadataOffset > 0) {
      features[metadataOffset] = pattern.usage_count / 100; // Normalized usage
      features[metadataOffset + 1] = pattern.success_rate;
      features[metadataOffset + 2] = pattern.relationships.length / 10; // Normalized relationships
      features[metadataOffset + 3] = this.encodeMemoryType(pattern.type);
      features[metadataOffset + 4] = (Date.now() - pattern.created_at.getTime()) / (1000 * 60 * 60 * 24); // Days old
    }
    
    return features;
  }

  private generateContentFeatures(content: string, features: Float32Array): void {
    // Simple content-based features
    const words = content.toLowerCase().split(/\s+/);
    const keywordFeatures = [
      'function', 'class', 'async', 'await', 'error', 'try', 'catch',
      'interface', 'type', 'import', 'export', 'const', 'let', 'var'
    ];
    
    for (let i = 0; i < keywordFeatures.length && i < features.length - 10; i++) {
      features[i] = words.filter(w => w.includes(keywordFeatures[i])).length / words.length;
    }
    
    // Add length and complexity features
    if (features.length > keywordFeatures.length) {
      features[keywordFeatures.length] = Math.min(1.0, content.length / 1000);
      features[keywordFeatures.length + 1] = (content.match(/[{}[\]()]/g) || []).length / content.length;
    }
  }

  private createLabelVector(pattern: MemoryPattern): Float32Array {
    const labels = new Float32Array(this.config.outputDimensions);
    
    // One-hot encoding for memory type
    const typeIndex = this.encodeLabelForType(pattern.type);
    if (typeIndex < labels.length) {
      labels[typeIndex] = 1.0;
    }
    
    // Add quality score if output dimensions allow
    if (labels.length > 3) {
      labels[3] = pattern.success_rate;
    }
    
    return labels;
  }

  private async performTraining(data: TrainingData): Promise<{
    accuracy: number;
    loss: number;
    convergenceRate: number;
    validationAccuracy?: number;
  }> {
    let totalLoss = 0;
    let correct = 0;
    const losses: number[] = [];
    
    // Training loop
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let epochLoss = 0;
      let epochCorrect = 0;
      
      // Shuffle training data
      const indices = this.shuffleIndices(data.features.length);
      
      for (const idx of indices) {
        // Forward pass
        const prediction = this.forwardPass(data.features[idx]);
        
        // Calculate loss
        const loss = this.calculateLoss(prediction, data.labels[idx]);
        epochLoss += loss;
        
        // Check accuracy
        if (this.isCorrectPrediction(prediction, data.labels[idx])) {
          epochCorrect++;
        }
        
        // Backward pass
        this.backwardPass(prediction, data.labels[idx], data.features[idx]);
      }
      
      const epochAccuracy = epochCorrect / data.features.length;
      epochLoss /= data.features.length;
      
      losses.push(epochLoss);
      
      if (epoch % 10 === 0 || epoch === this.config.epochs - 1) {
        this.logger.debug('Training progress', {
          epoch,
          loss: epochLoss.toFixed(4),
          accuracy: epochAccuracy.toFixed(4)
        });
      }
    }
    
    // Calculate final metrics
    const finalLoss = losses[losses.length - 1];
    const convergenceRate = this.calculateConvergenceRate(losses);
    
    // Final accuracy calculation
    let finalCorrect = 0;
    for (let i = 0; i < data.features.length; i++) {
      const prediction = this.forwardPass(data.features[i]);
      if (this.isCorrectPrediction(prediction, data.labels[i])) {
        finalCorrect++;
      }
    }
    
    const finalAccuracy = finalCorrect / data.features.length;
    
    return {
      accuracy: finalAccuracy,
      loss: finalLoss,
      convergenceRate
    };
  }

  private forwardPass(input: Float32Array): Float32Array {
    let currentInput = new Float32Array(input);
    
    // Forward through each layer
    for (let layer = 0; layer < this.weights.length; layer++) {
      const weights = this.weights[layer];
      const biases = this.biases[layer];
      const output = this.activations[layer];
      
      const inputSize = layer === 0 ? this.config.inputDimensions : this.config.hiddenLayers[layer - 1];
      const outputSize = layer === this.weights.length - 1 ? 
        this.config.outputDimensions : this.config.hiddenLayers[layer];
      
      // Matrix multiplication + bias
      for (let i = 0; i < outputSize; i++) {
        let sum = biases[i];
        for (let j = 0; j < inputSize; j++) {
          sum += currentInput[j] * weights[j * outputSize + i];
        }
        output[i] = this.activationFunction(sum, layer === this.weights.length - 1);
      }
      
      currentInput = new Float32Array(output);
    }
    
    return currentInput;
  }

  private backwardPass(
    prediction: Float32Array,
    target: Float32Array,
    input: Float32Array
  ): void {
    // Simplified backpropagation
    const outputError = new Float32Array(prediction.length);
    
    // Calculate output layer error
    for (let i = 0; i < prediction.length; i++) {
      outputError[i] = prediction[i] - target[i];
    }
    
    // Update weights using gradient descent
    const learningRate = this.config.learningRate;
    
    // For simplicity, only update the last layer
    const lastLayerIdx = this.weights.length - 1;
    const weights = this.weights[lastLayerIdx];
    const biases = this.biases[lastLayerIdx];
    
    const inputSize = lastLayerIdx === 0 ? this.config.inputDimensions : 
      this.config.hiddenLayers[lastLayerIdx - 1];
    const outputSize = this.config.outputDimensions;
    
    // Update weights and biases
    for (let i = 0; i < outputSize; i++) {
      biases[i] -= learningRate * outputError[i];
      
      for (let j = 0; j < inputSize; j++) {
        const inputVal = lastLayerIdx === 0 ? input[j] : this.activations[lastLayerIdx - 1][j];
        weights[j * outputSize + i] -= learningRate * outputError[i] * inputVal;
      }
    }
  }

  private activationFunction(x: number, isOutput: boolean): number {
    if (isOutput) {
      // Softmax approximation for output layer
      return 1 / (1 + Math.exp(-x));
    } else {
      // ReLU for hidden layers
      return Math.max(0, x);
    }
  }

  private calculateLoss(prediction: Float32Array, target: Float32Array): number {
    let loss = 0;
    
    switch (this.config.lossFunction) {
      case 'mse':
        for (let i = 0; i < prediction.length; i++) {
          const diff = prediction[i] - target[i];
          loss += diff * diff;
        }
        return loss / prediction.length;
      
      case 'crossentropy':
        for (let i = 0; i < prediction.length; i++) {
          const p = Math.max(1e-15, Math.min(1 - 1e-15, prediction[i]));
          loss -= target[i] * Math.log(p);
        }
        return loss;
      
      default:
        return this.calculateLoss(prediction, target); // Default to MSE
    }
  }

  private isCorrectPrediction(prediction: Float32Array, target: Float32Array): boolean {
    const predClass = this.argmax(prediction);
    const targetClass = this.argmax(target);
    return predClass === targetClass;
  }

  private argmax(array: Float32Array): number {
    let maxIdx = 0;
    for (let i = 1; i < array.length; i++) {
      if (array[i] > array[maxIdx]) {
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  private calculateConvergenceRate(losses: number[]): number {
    if (losses.length < 2) return 0;
    
    const firstLoss = losses[0];
    const lastLoss = losses[losses.length - 1];
    
    return Math.max(0, (firstLoss - lastLoss) / firstLoss);
  }

  private shuffleIndices(length: number): number[] {
    const indices = Array.from({ length }, (_, i) => i);
    
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    return indices;
  }

  private encodeMemoryType(type: string): number {
    switch (type) {
      case 'system1': return 0.0;
      case 'system2': return 0.5;
      case 'workspace': return 1.0;
      default: return 0.25;
    }
  }

  private encodeLabelForType(type: string): number {
    switch (type) {
      case 'system1': return 0;
      case 'system2': return 1;
      case 'workspace': return 2;
      default: return 0;
    }
  }

  private classifyOutput(output: Float32Array, originalType: string): string {
    const classIndex = this.argmax(output);
    const types = ['system1', 'system2', 'workspace'];
    return types[classIndex] || originalType;
  }

  private calculateDataQuality(patterns: MemoryPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgSuccess = patterns.reduce((sum, p) => sum + p.success_rate, 0) / patterns.length;
    const avgUsage = patterns.reduce((sum, p) => sum + p.usage_count, 0) / patterns.length;
    const hasEmbeddings = patterns.filter(p => p.embeddings && p.embeddings.length > 0).length / patterns.length;
    
    return (avgSuccess + Math.min(1.0, avgUsage / 10) + hasEmbeddings) / 3;
  }

  private initializeConfusionMatrix(): number[][] {
    const size = 3; // system1, system2, workspace
    return Array(size).fill(null).map(() => Array(size).fill(0));
  }

  private calculatePRF(confusionMatrix: number[][]): {
    precision: number;
    recall: number;
    f1Score: number;
  } {
    let totalPrecision = 0;
    let totalRecall = 0;
    let validClasses = 0;
    
    for (let i = 0; i < confusionMatrix.length; i++) {
      let tp = confusionMatrix[i][i];
      let fp = confusionMatrix.reduce((sum, row, j) => j !== i ? sum + row[i] : sum, 0);
      let fn = confusionMatrix[i].reduce((sum, val, j) => j !== i ? sum + val : sum, 0);
      
      if (tp + fp > 0 && tp + fn > 0) {
        const precision = tp / (tp + fp);
        const recall = tp / (tp + fn);
        
        totalPrecision += precision;
        totalRecall += recall;
        validClasses++;
      }
    }
    
    const avgPrecision = validClasses > 0 ? totalPrecision / validClasses : 0;
    const avgRecall = validClasses > 0 ? totalRecall / validClasses : 0;
    const f1Score = avgPrecision + avgRecall > 0 ? 
      (2 * avgPrecision * avgRecall) / (avgPrecision + avgRecall) : 0;
    
    return {
      precision: avgPrecision,
      recall: avgRecall,
      f1Score
    };
  }

  private getTotalParameters(): number {
    let total = 0;
    for (const layer of this.weights) {
      total += layer.length;
    }
    for (const layer of this.biases) {
      total += layer.length;
    }
    return total;
  }
}