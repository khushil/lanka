import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryCommitEntity, MemoryBranchEntity, MemoryTagEntity, MergeConflictEntity } from './models/commit.model';
import { MergeRequestEntity } from './services/merge-request.service';
import { VersionControlService } from './services/version-control.service';
import { ConflictResolutionService } from './services/conflict-resolution.service';
import { DiffService } from './services/diff.service';
import { MergeRequestService } from './services/merge-request.service';
import { VisualizationService } from './utils/visualization.service';
import { VersionControlController } from './controllers/version-control.controller';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemoryCommitEntity,
      MemoryBranchEntity,
      MemoryTagEntity,
      MergeConflictEntity,
      MergeRequestEntity,
    ]),
    LLMModule,
  ],
  providers: [
    VersionControlService,
    ConflictResolutionService,
    DiffService,
    MergeRequestService,
    VisualizationService,
  ],
  controllers: [VersionControlController],
  exports: [
    VersionControlService,
    ConflictResolutionService,
    DiffService,
    MergeRequestService,
    VisualizationService,
  ],
})
export class VersionControlModule {}