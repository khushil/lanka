/**
 * LANKA Memory System - Main Memory Module
 * NestJS module that configures and exports all memory system components
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Neo4jModule } from 'nest-neo4j/dist';
import { MemoryController } from './controllers/memory.controller';

// Services
import { MemoryOrchestratorService } from './services/memory-orchestrator.service';
import { MemoryArbitrationService } from './services/memory-arbitration.service';
import { GraphVectorStorageService } from './services/graph-vector-storage.service';
import { QualityGateService } from './services/quality-gate.service';
import { EmbeddingService } from './services/embedding.service';
import { EvolutionEngineService } from './services/evolution-engine.service';
import { AuditService } from './services/audit.service';

// Configuration
import { MemorySystemConfig } from './types/memory.types';

// Memory system configuration factory
const memoryConfigFactory = {
  provide: 'MEMORY_CONFIG',
  useFactory: (configService: ConfigService): MemorySystemConfig => ({
    storage: {
      neo4j: {
        uri: configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687',
        database: configService.get<string>('NEO4J_DATABASE') || 'lanka_memory',
        username: configService.get<string>('NEO4J_USERNAME') || 'neo4j',
        password: configService.get<string>('NEO4J_PASSWORD') || 'password',
      },
      vector: {
        provider: configService.get<'qdrant' | 'milvus' | 'pinecone'>('VECTOR_PROVIDER') || 'qdrant',
        endpoint: configService.get<string>('VECTOR_ENDPOINT') || 'http://localhost:6333',
        apiKey: configService.get<string>('VECTOR_API_KEY'),
        collections: [
          {
            collection: 'memories_system1',
            dimension: 768,
            metric: 'cosine',
            indexType: 'hnsw',
            parameters: {
              m: 16,
              efConstruction: 200,
            },
          },
          {
            collection: 'memories_system2',
            dimension: 768,
            metric: 'cosine',
            indexType: 'hnsw',
            parameters: {
              m: 16,
              efConstruction: 200,
            },
          },
          {
            collection: 'memories_workspace',
            dimension: 768,
            metric: 'cosine',
            indexType: 'hnsw',
            parameters: {
              m: 16,
              efConstruction: 200,
            },
          },
        ],
      },
      postgres: {
        host: configService.get<string>('POSTGRES_HOST') || 'localhost',
        port: configService.get<number>('POSTGRES_PORT') || 5432,
        database: configService.get<string>('POSTGRES_DATABASE') || 'lanka_audit',
        username: configService.get<string>('POSTGRES_USERNAME') || 'postgres',
        password: configService.get<string>('POSTGRES_PASSWORD') || 'password',
      },
      redis: {
        host: configService.get<string>('REDIS_HOST') || 'localhost',
        port: configService.get<number>('REDIS_PORT') || 6379,
        password: configService.get<string>('REDIS_PASSWORD'),
        keyPrefix: 'lanka:memory:',
      },
    },
    arbitration: {
      llm: {
        provider: configService.get<'openai' | 'anthropic' | 'local'>('LLM_PROVIDER') || 'openai',
        model: configService.get<string>('LLM_MODEL') || 'gpt-4',
        temperature: configService.get<number>('LLM_TEMPERATURE') || 0.7,
        maxTokens: configService.get<number>('LLM_MAX_TOKENS') || 2048,
      },
      similarity: {
        semanticThreshold: configService.get<number>('SEMANTIC_THRESHOLD') || 0.8,
        structuralThreshold: configService.get<number>('STRUCTURAL_THRESHOLD') || 0.7,
        contextualThreshold: configService.get<number>('CONTEXTUAL_THRESHOLD') || 0.6,
      },
      quality: {
        minimumScore: configService.get<number>('MIN_QUALITY_SCORE') || 0.6,
        requiredGates: configService.get<string>('REQUIRED_GATES')?.split(',') || ['novelty', 'accuracy'],
        reviewThreshold: configService.get<number>('REVIEW_THRESHOLD') || 0.8,
      },
    },
    qualityGates: [
      {
        name: 'novelty',
        threshold: 0.4,
        weight: 0.25,
        required: true,
        validator: {
          type: 'rule_based',
          config: {
            minLength: 10,
            maxLength: 5000,
            requiresEvidence: false,
          },
          implementation: 'noveltyValidator',
        },
      },
      {
        name: 'accuracy',
        threshold: 0.5,
        weight: 0.30,
        required: true,
        validator: {
          type: 'llm_assessment',
          config: {
            prompt: 'accuracy_assessment',
            temperature: 0.3,
          },
          implementation: 'accuracyValidator',
        },
      },
      {
        name: 'utility',
        threshold: 0.4,
        weight: 0.25,
        required: true,
        validator: {
          type: 'rule_based',
          config: {
            requiresExample: true,
            contextualRelevance: true,
          },
          implementation: 'utilityValidator',
        },
      },
      {
        name: 'clarity',
        threshold: 0.3,
        weight: 0.10,
        required: false,
        validator: {
          type: 'rule_based',
          config: {
            structureBonus: true,
            readabilityCheck: true,
          },
          implementation: 'clarityValidator',
        },
      },
      {
        name: 'validation',
        threshold: 0.2,
        weight: 0.10,
        required: false,
        validator: {
          type: 'rule_based',
          config: {
            evidenceMarkers: ['tested', 'verified', 'confirmed'],
            sourceReliability: true,
          },
          implementation: 'validationValidator',
        },
      },
    ],
    embedding: {
      model: configService.get<string>('EMBEDDING_MODEL') || 'code-bert',
      dimension: configService.get<number>('EMBEDDING_DIMENSION') || 768,
      batchSize: configService.get<number>('EMBEDDING_BATCH_SIZE') || 32,
      cacheEnabled: configService.get<boolean>('EMBEDDING_CACHE_ENABLED') !== false,
      reembeddingStrategy: configService.get<'lazy' | 'eager' | 'scheduled'>('REEMBEDDING_STRATEGY') || 'lazy',
    },
    evolution: {
      analysisInterval: configService.get<number>('EVOLUTION_INTERVAL_HOURS') || 24,
      usageWeightDecay: configService.get<number>('USAGE_WEIGHT_DECAY') || 0.1,
      contradictionResolution: configService.get<'automatic' | 'manual' | 'consensus'>('CONTRADICTION_RESOLUTION') || 'automatic',
      deprecationThreshold: configService.get<number>('DEPRECATION_THRESHOLD_DAYS') || 90,
      mergeSimilarityThreshold: configService.get<number>('MERGE_SIMILARITY_THRESHOLD') || 0.85,
    },
  }),
  inject: [ConfigService],
};

// Vector database client factory
const vectorClientFactory = {
  provide: 'VECTOR_CLIENT',
  useFactory: async (configService: ConfigService) => {
    const provider = configService.get<string>('VECTOR_PROVIDER') || 'qdrant';
    
    switch (provider) {
      case 'qdrant':
        const { QdrantVectorStore } = await import('langchain/vectorstores/qdrant');
        return new QdrantVectorStore(/* configuration */);
      
      case 'milvus':
        const { Milvus } = await import('@zilliz/milvus2-sdk-node');
        return new Milvus({
          address: configService.get<string>('VECTOR_ENDPOINT'),
        });
      
      case 'pinecone':
        const { PineconeStore } = await import('langchain/vectorstores/pinecone');
        return new PineconeStore(/* configuration */);
      
      default:
        throw new Error(`Unsupported vector provider: ${provider}`);
    }
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [
    ConfigModule,
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        scheme: 'bolt',
        host: configService.get<string>('NEO4J_HOST') || 'localhost',
        port: configService.get<number>('NEO4J_PORT') || 7687,
        username: configService.get<string>('NEO4J_USERNAME') || 'neo4j',
        password: configService.get<string>('NEO4J_PASSWORD') || 'password',
        database: configService.get<string>('NEO4J_DATABASE') || 'lanka_memory',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MemoryController],
  providers: [
    memoryConfigFactory,
    vectorClientFactory,
    
    // Core Services
    MemoryOrchestratorService,
    MemoryArbitrationService,
    GraphVectorStorageService,
    QualityGateService,
    EmbeddingService,
    EvolutionEngineService,
    AuditService,
  ],
  exports: [
    MemoryOrchestratorService,
    MemoryArbitrationService,
    GraphVectorStorageService,
    QualityGateService,
    EmbeddingService,
    EvolutionEngineService,
    AuditService,
    'MEMORY_CONFIG',
    'VECTOR_CLIENT',
  ],
})
export class MemoryModule {
  constructor() {
    console.log('🧠 LANKA Memory System Module initialized');
    console.log('📊 Graph-Vector hybrid storage ready');
    console.log('🤖 LLM-powered arbitration enabled');
    console.log('🔄 Evolution engine active');
    console.log('📋 Audit trails configured');
  }
}