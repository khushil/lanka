import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MergeRequest, MergeConflict, MergeStrategy } from '../types';
import { VersionControlService } from './version-control.service';
import { ConflictResolutionService } from './conflict-resolution.service';

@Entity('merge_requests')
export class MergeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sourceBranch!: string;

  @Column()
  targetBranch!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column()
  authorId!: string;

  @Column({
    type: 'enum',
    enum: ['open', 'merged', 'closed', 'draft'],
    default: 'open',
  })
  status!: 'open' | 'merged' | 'closed' | 'draft';

  @Column('jsonb', { default: [] })
  conflicts!: MergeConflict[];

  @Column('simple-array')
  reviewers!: string[];

  @Column('jsonb', { default: [] })
  approvals!: Array<{
    reviewerId: string;
    status: 'approved' | 'rejected' | 'requested_changes';
    comment?: string;
    timestamp: Date;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('uuid', { nullable: true })
  mergedCommitId?: string;

  @Column({ nullable: true })
  mergedBy?: string;

  @Column({ nullable: true })
  mergedAt?: Date;

  toDomain(): MergeRequest {
    return {
      id: this.id,
      sourceBranch: this.sourceBranch,
      targetBranch: this.targetBranch,
      title: this.title,
      description: this.description,
      authorId: this.authorId,
      status: this.status,
      conflicts: this.conflicts,
      reviewers: this.reviewers,
      approvals: this.approvals,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(mr: Partial<MergeRequest>): MergeRequestEntity {
    const entity = new MergeRequestEntity();
    Object.assign(entity, mr);
    return entity;
  }
}

@Injectable()
export class MergeRequestService {
  private readonly logger = new Logger(MergeRequestService.name);

  constructor(
    @InjectRepository(MergeRequestEntity)
    private readonly mergeRequestRepository: Repository<MergeRequestEntity>,
    private readonly dataSource: DataSource,
    private readonly versionControl: VersionControlService,
    private readonly conflictResolution: ConflictResolutionService,
  ) {}

  /**
   * Create a new merge request
   */
  async createMergeRequest(
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string,
    authorId: string,
    reviewers: string[] = [],
  ): Promise<MergeRequest> {
    // Validate branches exist
    const source = await this.versionControl.getBranch(sourceBranch);
    const target = await this.versionControl.getBranch(targetBranch);

    if (!source) {
      throw new Error(`Source branch ${sourceBranch} not found`);
    }
    if (!target) {
      throw new Error(`Target branch ${targetBranch} not found`);
    }

    // Check for existing open MR between same branches
    const existingMR = await this.mergeRequestRepository.findOne({
      where: {
        sourceBranch,
        targetBranch,
        status: 'open',
      },
    });

    if (existingMR) {
      throw new Error(`Merge request already exists between ${sourceBranch} and ${targetBranch}`);
    }

    // Detect potential conflicts
    const conflicts = await this.detectMergeConflicts(source.headCommitId, target.headCommitId);

    const mrEntity = MergeRequestEntity.fromDomain({
      sourceBranch,
      targetBranch,
      title,
      description,
      authorId,
      reviewers,
      conflicts,
      status: conflicts.length > 0 ? 'draft' : 'open',
    });

    const saved = await this.mergeRequestRepository.save(mrEntity);
    this.logger.log(`Created merge request ${saved.id}: ${title}`);

    return saved.toDomain();
  }

  /**
   * Get merge request by ID
   */
  async getMergeRequest(id: string): Promise<MergeRequest | null> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id } });
    return mr ? mr.toDomain() : null;
  }

  /**
   * List merge requests with filters
   */
  async listMergeRequests(filters: {
    status?: 'open' | 'merged' | 'closed' | 'draft';
    authorId?: string;
    reviewerId?: string;
    targetBranch?: string;
  } = {}): Promise<MergeRequest[]> {
    const queryBuilder = this.mergeRequestRepository.createQueryBuilder('mr');

    if (filters.status) {
      queryBuilder.where('mr.status = :status', { status: filters.status });
    }

    if (filters.authorId) {
      queryBuilder.andWhere('mr.authorId = :authorId', { authorId: filters.authorId });
    }

    if (filters.reviewerId) {
      queryBuilder.andWhere(':reviewerId = ANY(mr.reviewers)', { reviewerId: filters.reviewerId });
    }

    if (filters.targetBranch) {
      queryBuilder.andWhere('mr.targetBranch = :targetBranch', { targetBranch: filters.targetBranch });
    }

    queryBuilder.orderBy('mr.updatedAt', 'DESC');

    const results = await queryBuilder.getMany();
    return results.map(mr => mr.toDomain());
  }

  /**
   * Add review to merge request
   */
  async addReview(
    mrId: string,
    reviewerId: string,
    status: 'approved' | 'rejected' | 'requested_changes',
    comment?: string,
  ): Promise<MergeRequest> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id: mrId } });
    if (!mr) {
      throw new Error(`Merge request ${mrId} not found`);
    }

    // Check if reviewer is authorized
    if (!mr.reviewers.includes(reviewerId)) {
      throw new Error(`User ${reviewerId} is not a reviewer for this merge request`);
    }

    // Remove existing review from this reviewer
    mr.approvals = mr.approvals.filter(approval => approval.reviewerId !== reviewerId);

    // Add new review
    mr.approvals.push({
      reviewerId,
      status,
      comment,
      timestamp: new Date(),
    });

    // Update MR status based on reviews
    await this.updateMergeRequestStatus(mr);

    const saved = await this.mergeRequestRepository.save(mr);
    this.logger.log(`Added review from ${reviewerId} to MR ${mrId}: ${status}`);

    return saved.toDomain();
  }

  /**
   * Merge the merge request
   */
  async mergeMergeRequest(
    mrId: string,
    mergerId: string,
    strategy: MergeStrategy = MergeStrategy.AUTO,
  ): Promise<{ success: boolean; commitId?: string; conflicts?: MergeConflict[] }> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id: mrId } });
    if (!mr) {
      throw new Error(`Merge request ${mrId} not found`);
    }

    if (mr.status !== 'open') {
      throw new Error(`Cannot merge merge request with status: ${mr.status}`);
    }

    // Check if all required approvals are present
    const hasRequiredApprovals = this.checkRequiredApprovals(mr);
    if (!hasRequiredApprovals) {
      throw new Error('Merge request does not have required approvals');
    }

    // Perform the merge
    const mergeResult = await this.versionControl.mergeBranches(
      mr.sourceBranch,
      mr.targetBranch,
      strategy,
      mergerId,
      `Merge pull request #${mr.id}: ${mr.title}`,
    );

    if (mergeResult.success) {
      // Update merge request status
      mr.status = 'merged';
      mr.mergedBy = mergerId;
      mr.mergedAt = new Date();
      mr.mergedCommitId = mergeResult.commitId;

      await this.mergeRequestRepository.save(mr);
      this.logger.log(`Successfully merged MR ${mrId}`);

      return { success: true, commitId: mergeResult.commitId };
    } else {
      // Update conflicts if any
      if (mergeResult.conflicts) {
        mr.conflicts = mergeResult.conflicts;
        mr.status = 'draft';
        await this.mergeRequestRepository.save(mr);
      }

      return { success: false, conflicts: mergeResult.conflicts };
    }
  }

  /**
   * Close merge request
   */
  async closeMergeRequest(mrId: string, userId: string): Promise<MergeRequest> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id: mrId } });
    if (!mr) {
      throw new Error(`Merge request ${mrId} not found`);
    }

    if (mr.status === 'merged') {
      throw new Error('Cannot close already merged merge request');
    }

    mr.status = 'closed';
    const saved = await this.mergeRequestRepository.save(mr);
    this.logger.log(`Closed merge request ${mrId} by user ${userId}`);

    return saved.toDomain();
  }

  /**
   * Resolve conflicts in merge request
   */
  async resolveConflicts(
    mrId: string,
    resolutions: Array<{ conflictIndex: number; resolvedValue: any; rationale: string }>,
  ): Promise<MergeRequest> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id: mrId } });
    if (!mr) {
      throw new Error(`Merge request ${mrId} not found`);
    }

    // Apply resolutions
    for (const resolution of resolutions) {
      if (resolution.conflictIndex < mr.conflicts.length) {
        mr.conflicts[resolution.conflictIndex].resolution = {
          strategy: 'manual',
          resolvedValue: resolution.resolvedValue,
          rationale: resolution.rationale,
          confidence: 1.0,
        };
      }
    }

    // Check if all conflicts are resolved
    const unresolvedConflicts = mr.conflicts.filter(c => !c.resolution);
    if (unresolvedConflicts.length === 0) {
      mr.status = 'open'; // Ready for merge
    }

    const saved = await this.mergeRequestRepository.save(mr);
    this.logger.log(`Resolved ${resolutions.length} conflicts in MR ${mrId}`);

    return saved.toDomain();
  }

  /**
   * Auto-resolve conflicts using LLM
   */
  async autoResolveConflicts(mrId: string): Promise<MergeRequest> {
    const mr = await this.mergeRequestRepository.findOne({ where: { id: mrId } });
    if (!mr) {
      throw new Error(`Merge request ${mrId} not found`);
    }

    const resolvedConflicts: MergeConflict[] = [];
    
    for (const conflict of mr.conflicts) {
      if (!conflict.resolution) {
        const resolved = await this.conflictResolution.resolveConflict(conflict, MergeStrategy.LLM_ASSISTED);
        resolvedConflicts.push(resolved);
      } else {
        resolvedConflicts.push(conflict);
      }
    }

    mr.conflicts = resolvedConflicts;
    
    // Update status if all conflicts resolved
    const unresolvedConflicts = resolvedConflicts.filter(c => !c.resolution);
    if (unresolvedConflicts.length === 0) {
      mr.status = 'open';
    }

    const saved = await this.mergeRequestRepository.save(mr);
    this.logger.log(`Auto-resolved conflicts in MR ${mrId}`);

    return saved.toDomain();
  }

  /**
   * Detect merge conflicts between two commits
   */
  private async detectMergeConflicts(sourceCommitId: string, targetCommitId: string): Promise<MergeConflict[]> {
    // This would integrate with the version control service
    // For now, return empty array
    return [];
  }

  /**
   * Update merge request status based on reviews
   */
  private async updateMergeRequestStatus(mr: MergeRequestEntity): Promise<void> {
    const approvals = mr.approvals.filter(a => a.status === 'approved');
    const rejections = mr.approvals.filter(a => a.status === 'rejected');
    const changeRequests = mr.approvals.filter(a => a.status === 'requested_changes');

    // If any rejections or change requests, keep as open
    if (rejections.length > 0 || changeRequests.length > 0) {
      mr.status = 'open';
      return;
    }

    // Check if minimum approvals met (simplified logic)
    const requiredApprovals = Math.max(1, Math.ceil(mr.reviewers.length / 2));
    if (approvals.length >= requiredApprovals) {
      mr.status = 'open'; // Ready for merge
    }
  }

  /**
   * Check if merge request has required approvals
   */
  private checkRequiredApprovals(mr: MergeRequestEntity): boolean {
    const approvals = mr.approvals.filter(a => a.status === 'approved');
    const rejections = mr.approvals.filter(a => a.status === 'rejected');
    const changeRequests = mr.approvals.filter(a => a.status === 'requested_changes');

    // No rejections or change requests
    if (rejections.length > 0 || changeRequests.length > 0) {
      return false;
    }

    // Has minimum approvals
    const requiredApprovals = Math.max(1, Math.ceil(mr.reviewers.length / 2));
    return approvals.length >= requiredApprovals;
  }

  /**
   * Get merge request statistics
   */
  async getMergeRequestStats(): Promise<{
    total: number;
    open: number;
    merged: number;
    closed: number;
    draft: number;
    averageTimeToMerge: number;
    conflictRate: number;
  }> {
    const [total, open, merged, closed, draft] = await Promise.all([
      this.mergeRequestRepository.count(),
      this.mergeRequestRepository.count({ where: { status: 'open' } }),
      this.mergeRequestRepository.count({ where: { status: 'merged' } }),
      this.mergeRequestRepository.count({ where: { status: 'closed' } }),
      this.mergeRequestRepository.count({ where: { status: 'draft' } }),
    ]);

    // Calculate average time to merge
    const mergedRequests = await this.mergeRequestRepository.find({
      where: { status: 'merged' },
      select: ['createdAt', 'mergedAt'],
    });

    let averageTimeToMerge = 0;
    if (mergedRequests.length > 0) {
      const totalTime = mergedRequests.reduce((sum, mr) => {
        if (mr.mergedAt) {
          return sum + (mr.mergedAt.getTime() - mr.createdAt.getTime());
        }
        return sum;
      }, 0);
      averageTimeToMerge = totalTime / mergedRequests.length / (1000 * 60 * 60); // hours
    }

    // Calculate conflict rate
    const requestsWithConflicts = await this.mergeRequestRepository.count({
      where: `jsonb_array_length(conflicts) > 0`,
    });
    const conflictRate = total > 0 ? requestsWithConflicts / total : 0;

    return {
      total,
      open,
      merged,
      closed,
      draft,
      averageTimeToMerge,
      conflictRate,
    };
  }
}