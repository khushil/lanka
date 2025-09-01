import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { MemoryCommitEntity, MemoryBranchEntity, MergeConflictEntity } from '../models/commit.model';
import { MemoryCommit, MemoryBranch, MergeConflict, MergeStrategy, VersionControlConfig } from '../types';
import { ConflictResolutionService } from './conflict-resolution.service';
import { DiffService } from './diff.service';
import { LLMService } from '../../llm/llm.service';

@Injectable()
export class VersionControlService {
  private readonly logger = new Logger(VersionControlService.name);

  constructor(
    @InjectRepository(MemoryCommitEntity)
    private readonly commitRepository: Repository<MemoryCommitEntity>,
    @InjectRepository(MemoryBranchEntity)
    private readonly branchRepository: Repository<MemoryBranchEntity>,
    @InjectRepository(MergeConflictEntity)
    private readonly conflictRepository: Repository<MergeConflictEntity>,
    private readonly dataSource: DataSource,
    private readonly conflictResolution: ConflictResolutionService,
    private readonly diffService: DiffService,
    private readonly llmService: LLMService,
  ) {}

  /**
   * Create a new commit for a memory
   */
  async createCommit(
    memoryId: string,
    branchName: string,
    authorId: string,
    message: string,
    changes: any,
    rationale?: string,
  ): Promise<MemoryCommit> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get current branch head
      const branch = await this.getBranch(branchName);
      const parentIds = branch ? [branch.headCommitId] : [];

      // Create commit entity
      const commitEntity = new MemoryCommitEntity();
      commitEntity.parentIds = parentIds;
      commitEntity.memoryId = memoryId;
      commitEntity.branchName = branchName;
      commitEntity.authorId = authorId;
      commitEntity.message = message;
      commitEntity.rationale = rationale;
      commitEntity.changes = changes;
      commitEntity.signature = commitEntity.calculateHash();

      const savedCommit = await queryRunner.manager.save(MemoryCommitEntity, commitEntity);

      // Update or create branch
      if (branch) {
        await queryRunner.manager.update(
          MemoryBranchEntity,
          { name: branchName },
          { headCommitId: savedCommit.id, updatedAt: new Date() }
        );
      } else {
        const newBranch = MemoryBranchEntity.fromDomain({
          name: branchName,
          headCommitId: savedCommit.id,
          createdBy: authorId,
          isProtected: branchName === 'main',
        });
        await queryRunner.manager.save(MemoryBranchEntity, newBranch);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Created commit ${savedCommit.id} for memory ${memoryId} on branch ${branchName}`);
      
      return savedCommit.toDomain();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create commit: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a new branch from an existing commit
   */
  async createBranch(
    name: string,
    fromCommitId: string,
    createdBy: string,
    description?: string,
  ): Promise<MemoryBranch> {
    // Verify commit exists
    const commit = await this.commitRepository.findOne({ where: { id: fromCommitId } });
    if (!commit) {
      throw new Error(`Commit ${fromCommitId} not found`);
    }

    // Check if branch already exists
    const existingBranch = await this.branchRepository.findOne({ where: { name } });
    if (existingBranch) {
      throw new Error(`Branch ${name} already exists`);
    }

    const branchEntity = MemoryBranchEntity.fromDomain({
      name,
      headCommitId: fromCommitId,
      createdBy,
      description,
      isProtected: false,
    });

    const savedBranch = await this.branchRepository.save(branchEntity);
    this.logger.log(`Created branch ${name} from commit ${fromCommitId}`);
    
    return savedBranch.toDomain();
  }

  /**
   * Merge one branch into another
   */
  async mergeBranches(
    sourceBranch: string,
    targetBranch: string,
    strategy: MergeStrategy = MergeStrategy.AUTO,
    authorId: string,
    message?: string,
  ): Promise<{ success: boolean; conflicts?: MergeConflict[]; commitId?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get branch heads
      const source = await this.getBranch(sourceBranch);
      const target = await this.getBranch(targetBranch);

      if (!source || !target) {
        throw new Error('Source or target branch not found');
      }

      // Check for conflicts
      const conflicts = await this.detectConflicts(source.headCommitId, target.headCommitId);
      
      if (conflicts.length > 0 && strategy === MergeStrategy.AUTO) {
        // Try to resolve conflicts automatically
        const resolvedConflicts = await this.resolveConflicts(conflicts, strategy);
        const unresolvedConflicts = resolvedConflicts.filter(c => !c.resolution);
        
        if (unresolvedConflicts.length > 0) {
          await queryRunner.rollbackTransaction();
          return { success: false, conflicts: unresolvedConflicts };
        }
      }

      // Create merge commit
      const mergeMessage = message || `Merge ${sourceBranch} into ${targetBranch}`;
      const mergeCommit = await this.createMergeCommit(
        source.headCommitId,
        target.headCommitId,
        targetBranch,
        authorId,
        mergeMessage,
        queryRunner,
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully merged ${sourceBranch} into ${targetBranch}`);
      
      return { success: true, commitId: mergeCommit.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Merge failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Detect conflicts between two commits
   */
  private async detectConflicts(sourceCommitId: string, targetCommitId: string): Promise<MergeConflict[]> {
    // Get commits
    const sourceCommit = await this.commitRepository.findOne({ where: { id: sourceCommitId } });
    const targetCommit = await this.commitRepository.findOne({ where: { id: targetCommitId } });

    if (!sourceCommit || !targetCommit) {
      throw new Error('Source or target commit not found');
    }

    // Find common ancestor
    const commonAncestor = await this.findCommonAncestor(sourceCommitId, targetCommitId);
    
    // Compare changes and detect conflicts
    const conflicts: MergeConflict[] = [];
    
    // Semantic conflict detection
    if (sourceCommit.memoryId === targetCommit.memoryId) {
      const semanticConflict = await this.detectSemanticConflict(sourceCommit, targetCommit, commonAncestor);
      if (semanticConflict) {
        conflicts.push(semanticConflict);
      }
    }

    return conflicts;
  }

  /**
   * Detect semantic conflicts between commits
   */
  private async detectSemanticConflict(
    sourceCommit: MemoryCommitEntity,
    targetCommit: MemoryCommitEntity,
    baseCommit?: MemoryCommitEntity,
  ): Promise<MergeConflict | null> {
    // Use LLM to analyze semantic differences
    const prompt = `
      Analyze these two memory changes for semantic conflicts:
      
      Source change: ${JSON.stringify(sourceCommit.changes, null, 2)}
      Target change: ${JSON.stringify(targetCommit.changes, null, 2)}
      Base change: ${baseCommit ? JSON.stringify(baseCommit.changes, null, 2) : 'None'}
      
      Are these changes semantically conflicting? Consider:
      1. Do they contradict each other in meaning?
      2. Do they represent incompatible approaches?
      3. Would applying both changes result in confusion?
      
      Response format:
      {
        "hasConflict": boolean,
        "conflictType": "semantic" | "none",
        "reasoning": "explanation",
        "suggestedResolution": "how to resolve if conflict exists"
      }
    `;

    const analysis = await this.llmService.analyze(prompt);
    
    if (analysis.hasConflict) {
      return {
        memoryId: sourceCommit.memoryId,
        sourceBranch: sourceCommit.branchName,
        targetBranch: targetCommit.branchName,
        conflictType: 'semantic',
        sourceCommitId: sourceCommit.id,
        targetCommitId: targetCommit.id,
        conflictDetails: {
          field: 'content',
          sourceValue: sourceCommit.changes,
          targetValue: targetCommit.changes,
          baseValue: baseCommit?.changes,
        },
      };
    }

    return null;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  private async resolveConflicts(
    conflicts: MergeConflict[],
    strategy: MergeStrategy,
  ): Promise<MergeConflict[]> {
    const resolvedConflicts: MergeConflict[] = [];

    for (const conflict of conflicts) {
      const resolvedConflict = await this.conflictResolution.resolveConflict(conflict, strategy);
      resolvedConflicts.push(resolvedConflict);
    }

    return resolvedConflicts;
  }

  /**
   * Create a merge commit
   */
  private async createMergeCommit(
    sourceCommitId: string,
    targetCommitId: string,
    branchName: string,
    authorId: string,
    message: string,
    queryRunner: QueryRunner,
  ): Promise<MemoryCommitEntity> {
    const mergeCommit = new MemoryCommitEntity();
    mergeCommit.parentIds = [sourceCommitId, targetCommitId];
    mergeCommit.memoryId = ''; // This is a merge commit, not tied to specific memory
    mergeCommit.branchName = branchName;
    mergeCommit.authorId = authorId;
    mergeCommit.message = message;
    mergeCommit.changes = {
      type: 'merge',
      before: null,
      after: null,
    };
    mergeCommit.signature = mergeCommit.calculateHash();

    const saved = await queryRunner.manager.save(MemoryCommitEntity, mergeCommit);
    
    // Update target branch head
    await queryRunner.manager.update(
      MemoryBranchEntity,
      { name: branchName },
      { headCommitId: saved.id, updatedAt: new Date() }
    );

    return saved;
  }

  /**
   * Find common ancestor of two commits
   */
  private async findCommonAncestor(commitId1: string, commitId2: string): Promise<MemoryCommitEntity | null> {
    // Implement graph traversal to find common ancestor
    const visited1 = new Set<string>();
    const visited2 = new Set<string>();
    
    const queue1 = [commitId1];
    const queue2 = [commitId2];

    while (queue1.length > 0 || queue2.length > 0) {
      // Process queue1
      if (queue1.length > 0) {
        const currentId = queue1.shift()!;
        if (visited2.has(currentId)) {
          return await this.commitRepository.findOne({ where: { id: currentId } });
        }
        visited1.add(currentId);
        
        const commit = await this.commitRepository.findOne({ where: { id: currentId } });
        if (commit) {
          queue1.push(...commit.parentIds);
        }
      }

      // Process queue2
      if (queue2.length > 0) {
        const currentId = queue2.shift()!;
        if (visited1.has(currentId)) {
          return await this.commitRepository.findOne({ where: { id: currentId } });
        }
        visited2.add(currentId);
        
        const commit = await this.commitRepository.findOne({ where: { id: currentId } });
        if (commit) {
          queue2.push(...commit.parentIds);
        }
      }
    }

    return null;
  }

  /**
   * Get branch by name
   */
  async getBranch(name: string): Promise<MemoryBranch | null> {
    const branch = await this.branchRepository.findOne({ where: { name } });
    return branch ? branch.toDomain() : null;
  }

  /**
   * Get commit history for a branch
   */
  async getCommitHistory(branchName: string, limit: number = 100): Promise<MemoryCommit[]> {
    const branch = await this.getBranch(branchName);
    if (!branch) {
      throw new Error(`Branch ${branchName} not found`);
    }

    const commits = await this.commitRepository
      .createQueryBuilder('commit')
      .where('commit.branchName = :branchName', { branchName })
      .orderBy('commit.timestamp', 'DESC')
      .limit(limit)
      .getMany();

    return commits.map(c => c.toDomain());
  }

  /**
   * Rollback to a specific commit
   */
  async rollback(branchName: string, commitId: string, authorId: string): Promise<MemoryCommit> {
    // Verify commit exists and is on the branch
    const commit = await this.commitRepository.findOne({ 
      where: { id: commitId, branchName } 
    });
    
    if (!commit) {
      throw new Error(`Commit ${commitId} not found on branch ${branchName}`);
    }

    // Create rollback commit
    const rollbackMessage = `Rollback to commit ${commitId}`;
    const rollbackChanges = {
      type: 'update' as const,
      before: null,
      after: commit.changes.after,
      diff: `Rolled back to commit ${commitId}`,
    };

    return await this.createCommit(
      commit.memoryId,
      branchName,
      authorId,
      rollbackMessage,
      rollbackChanges,
      `Rolled back to previous state from commit ${commitId}`,
    );
  }

  /**
   * Get diff between two commits
   */
  async getDiff(fromCommitId: string, toCommitId: string) {
    const fromCommit = await this.commitRepository.findOne({ where: { id: fromCommitId } });
    const toCommit = await this.commitRepository.findOne({ where: { id: toCommitId } });

    if (!fromCommit || !toCommit) {
      throw new Error('One or both commits not found');
    }

    return this.diffService.generateDiff(fromCommit.changes, toCommit.changes);
  }

  /**
   * Get all branches
   */
  async getAllBranches(): Promise<MemoryBranch[]> {
    const branches = await this.branchRepository.find({
      order: { createdAt: 'DESC' }
    });
    return branches.map(b => b.toDomain());
  }

  /**
   * Delete a branch
   */
  async deleteBranch(name: string, authorId: string): Promise<void> {
    const branch = await this.branchRepository.findOne({ where: { name } });
    if (!branch) {
      throw new Error(`Branch ${name} not found`);
    }

    if (branch.isProtected) {
      throw new Error(`Cannot delete protected branch ${name}`);
    }

    if (name === 'main') {
      throw new Error('Cannot delete main branch');
    }

    await this.branchRepository.delete({ name });
    this.logger.log(`Deleted branch ${name} by user ${authorId}`);
  }
}