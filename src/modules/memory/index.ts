/**
 * LANKA Memory System - Module Exports
 * Main entry point for the memory system
 */

// Main Module
export { MemoryModule } from './memory.module';

// Controllers
export { MemoryController } from './controllers/memory.controller';

// Core Services
export { MemoryOrchestratorService } from './services/memory-orchestrator.service';
export { MemoryArbitrationService } from './services/memory-arbitration.service';
export { GraphVectorStorageService } from './services/graph-vector-storage.service';
export { QualityGateService } from './services/quality-gate.service';
export { EmbeddingService } from './services/embedding.service';
export { EvolutionEngineService } from './services/evolution-engine.service';
export { AuditService } from './services/audit.service';

// Types and Interfaces
export * from './types/memory.types';

// Re-export for convenience
export type {
  Memory,
  System1Memory,
  System2Memory,
  WorkspaceMemory,
  MemoryQuery,
  MemorySearchResult,
  MemoryArbitrationResult,
  QualityScore,
  QualityGate,
  MemorySystemConfig,
} from './types/memory.types';