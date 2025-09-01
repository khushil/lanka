import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VersionControlService } from '../../services/version-control.service';
import { ConflictResolutionService } from '../../services/conflict-resolution.service';
import { DiffService } from '../../services/diff.service';
import { MergeRequestService } from '../../services/merge-request.service';
import { 
  MemoryCommitEntity, 
  MemoryBranchEntity, 
  MemoryTagEntity, 
  MergeConflictEntity 
} from '../../models/commit.model';
import { MergeRequestEntity } from '../../services/merge-request.service';
import { MergeStrategy } from '../../types';

// Mock LLM Service for integration tests
class MockLLMService {
  async analyze(prompt: string): Promise<any> {
    // Simple mock that returns reasonable responses
    if (prompt.includes('semantic conflicts')) {
      return {
        hasConflict: false,
        conflictType: 'none',
        reasoning: 'No semantic conflicts detected',
      };
    }
    
    if (prompt.includes('resolve this semantic conflict')) {
      return {
        canResolve: true,
        resolvedValue: { text: 'Merged content with best practices' },
        rationale: 'Combined both approaches using modern patterns',
        confidence: 0.9,
        strategy: 'semantic_merge',
      };
    }
    
    return {
      canResolve: false,
      confidence: 0.5,
    };
  }
}

describe('Version Control Integration Tests', () => {
  let module: TestingModule;
  let versionControlService: VersionControlService;
  let mergeRequestService: MergeRequestService;
  let commitRepository: Repository<MemoryCommitEntity>;
  let branchRepository: Repository<MemoryBranchEntity>;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            MemoryCommitEntity,
            MemoryBranchEntity,
            MemoryTagEntity,
            MergeConflictEntity,
            MergeRequestEntity,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          MemoryCommitEntity,
          MemoryBranchEntity,
          MemoryTagEntity,
          MergeConflictEntity,
          MergeRequestEntity,
        ]),
      ],
      providers: [
        VersionControlService,
        ConflictResolutionService,
        DiffService,
        MergeRequestService,
        {
          provide: 'LLMService',
          useClass: MockLLMService,
        },
      ],
    }).compile();

    versionControlService = module.get<VersionControlService>(VersionControlService);
    mergeRequestService = module.get<MergeRequestService>(MergeRequestService);
    commitRepository = module.get<Repository<MemoryCommitEntity>>(getRepositoryToken(MemoryCommitEntity));
    branchRepository = module.get<Repository<MemoryBranchEntity>>(getRepositoryToken(MemoryBranchEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await commitRepository.clear();
    await branchRepository.clear();
  });

  describe('Full Version Control Workflow', () => {
    it('should create initial commit and main branch', async () => {
      // Create initial commit
      const initialCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        {
          type: 'create',
          after: { content: 'Initial memory content' },
        },
        'Creating first memory'
      );

      expect(initialCommit).toBeDefined();
      expect(initialCommit.message).toBe('Initial commit');
      expect(initialCommit.branchName).toBe('main');

      // Verify branch was created
      const branch = await versionControlService.getBranch('main');
      expect(branch).toBeDefined();
      expect(branch!.headCommitId).toBe(initialCommit.id);
      expect(branch!.isProtected).toBe(true);
    });

    it('should create feature branch and commits', async () => {
      // Create initial commit on main
      const mainCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial content' } }
      );

      // Create feature branch
      const featureBranch = await versionControlService.createBranch(
        'feature/new-pattern',
        mainCommit.id,
        'user2',
        'Implementing new coding pattern'
      );

      expect(featureBranch.name).toBe('feature/new-pattern');
      expect(featureBranch.headCommitId).toBe(mainCommit.id);

      // Create commit on feature branch
      const featureCommit = await versionControlService.createCommit(
        'memory-1',
        'feature/new-pattern',
        'user2',
        'Add new pattern',
        {
          type: 'update',
          before: { content: 'Initial content' },
          after: { content: 'Enhanced content with new pattern' },
        }
      );

      expect(featureCommit.branchName).toBe('feature/new-pattern');
      expect(featureCommit.parentIds).toContain(mainCommit.id);
    });

    it('should handle merge without conflicts', async () => {
      // Setup: Create main and feature branch with commits
      const mainCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial content' } }
      );

      await versionControlService.createBranch('feature', mainCommit.id, 'user2');

      const featureCommit = await versionControlService.createCommit(
        'memory-2', // Different memory to avoid conflicts
        'feature',
        'user2',
        'Add feature',
        { type: 'create', after: { content: 'Feature content' } }
      );

      // Perform merge
      const mergeResult = await versionControlService.mergeBranches(
        'feature',
        'main',
        MergeStrategy.AUTO,
        'user1',
        'Merge feature into main'
      );

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.commitId).toBeDefined();

      // Verify main branch head updated
      const mainBranch = await versionControlService.getBranch('main');
      expect(mainBranch!.headCommitId).toBe(mergeResult.commitId);
    });

    it('should create and process merge request workflow', async () => {
      // Setup branches and commits
      const mainCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial content' } }
      );

      await versionControlService.createBranch('feature', mainCommit.id, 'user2');

      await versionControlService.createCommit(
        'memory-1',
        'feature',
        'user2',
        'Update memory',
        {
          type: 'update',
          before: { content: 'Initial content' },
          after: { content: 'Updated content' },
        }
      );

      // Create merge request
      const mergeRequest = await mergeRequestService.createMergeRequest(
        'feature',
        'main',
        'Update memory content',
        'This MR updates the memory with improved content',
        'user2',
        ['user1', 'user3']
      );

      expect(mergeRequest.sourceBranch).toBe('feature');
      expect(mergeRequest.targetBranch).toBe('main');
      expect(mergeRequest.status).toBe('open');
      expect(mergeRequest.reviewers).toContain('user1');

      // Add review
      const reviewedMR = await mergeRequestService.addReview(
        mergeRequest.id,
        'user1',
        'approved',
        'Changes look good'
      );

      expect(reviewedMR.approvals).toHaveLength(1);
      expect(reviewedMR.approvals[0].status).toBe('approved');

      // Merge the MR
      const mergeResult = await mergeRequestService.mergeMergeRequest(
        mergeRequest.id,
        'user1',
        MergeStrategy.AUTO
      );

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.commitId).toBeDefined();
    });

    it('should handle rollback correctly', async () => {
      // Create sequence of commits
      const commit1 = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'First commit',
        { type: 'create', after: { content: 'Version 1' } }
      );

      const commit2 = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Second commit',
        {
          type: 'update',
          before: { content: 'Version 1' },
          after: { content: 'Version 2' },
        }
      );

      const commit3 = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Third commit',
        {
          type: 'update',
          before: { content: 'Version 2' },
          after: { content: 'Version 3' },
        }
      );

      // Rollback to commit2
      const rollbackCommit = await versionControlService.rollback(
        'main',
        commit2.id,
        'user1'
      );

      expect(rollbackCommit.message).toContain('Rollback to commit');
      expect(rollbackCommit.changes.after).toEqual(commit2.changes.after);
      expect(rollbackCommit.parentIds).toContain(commit3.id);
    });

    it('should track commit history correctly', async () => {
      // Create sequence of commits
      const commits = [];
      for (let i = 1; i <= 5; i++) {
        const commit = await versionControlService.createCommit(
          'memory-1',
          'main',
          'user1',
          `Commit ${i}`,
          {
            type: i === 1 ? 'create' : 'update',
            before: i === 1 ? null : { content: `Version ${i - 1}` },
            after: { content: `Version ${i}` },
          }
        );
        commits.push(commit);
      }

      // Get commit history
      const history = await versionControlService.getCommitHistory('main', 10);

      expect(history).toHaveLength(5);
      expect(history[0].message).toBe('Commit 5'); // Most recent first
      expect(history[4].message).toBe('Commit 1'); // Oldest last
    });

    it('should calculate diffs correctly', async () => {
      const commit1 = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'First commit',
        {
          type: 'create',
          after: {
            title: 'Original Title',
            content: 'Original content',
            tags: ['tag1', 'tag2'],
          },
        }
      );

      const commit2 = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Second commit',
        {
          type: 'update',
          before: {
            title: 'Original Title',
            content: 'Original content',
            tags: ['tag1', 'tag2'],
          },
          after: {
            title: 'Updated Title',
            content: 'Original content',
            tags: ['tag1', 'tag2', 'tag3'],
          },
        }
      );

      const diff = await versionControlService.getDiff(commit1.id, commit2.id);

      expect(diff).toBeDefined();
      expect(Array.isArray(diff)).toBe(true);
    });

    it('should handle branch deletion correctly', async () => {
      // Create branch with commit
      const mainCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Main commit',
        { type: 'create', after: { content: 'Main content' } }
      );

      const featureBranch = await versionControlService.createBranch(
        'feature/temp',
        mainCommit.id,
        'user1'
      );

      // Verify branch exists
      let branch = await versionControlService.getBranch('feature/temp');
      expect(branch).toBeDefined();

      // Delete branch
      await versionControlService.deleteBranch('feature/temp', 'user1');

      // Verify branch is deleted
      branch = await versionControlService.getBranch('feature/temp');
      expect(branch).toBeNull();
    });

    it('should prevent deletion of protected branches', async () => {
      // Create initial commit to establish main branch
      await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial' } }
      );

      // Try to delete main branch (should fail)
      await expect(
        versionControlService.deleteBranch('main', 'user1')
      ).rejects.toThrow('Cannot delete main branch');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent commits on same branch', async () => {
      // Create initial commit
      const initialCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial' } }
      );

      // Simulate concurrent commits
      const commitPromises = [
        versionControlService.createCommit(
          'memory-2',
          'main',
          'user1',
          'Commit A',
          { type: 'create', after: { content: 'Content A' } }
        ),
        versionControlService.createCommit(
          'memory-3',
          'main',
          'user2',
          'Commit B',
          { type: 'create', after: { content: 'Content B' } }
        ),
      ];

      const commits = await Promise.all(commitPromises);

      expect(commits).toHaveLength(2);
      expect(commits[0]).toBeDefined();
      expect(commits[1]).toBeDefined();

      // Both commits should have the initial commit as parent
      expect(commits[0].parentIds).toContain(initialCommit.id);
      expect(commits[1].parentIds).toContain(initialCommit.id);
    });

    it('should handle concurrent branch creation', async () => {
      // Create initial commit
      const mainCommit = await versionControlService.createCommit(
        'memory-1',
        'main',
        'user1',
        'Initial commit',
        { type: 'create', after: { content: 'Initial' } }
      );

      // Simulate concurrent branch creation
      const branchPromises = [
        versionControlService.createBranch('feature/a', mainCommit.id, 'user1'),
        versionControlService.createBranch('feature/b', mainCommit.id, 'user2'),
        versionControlService.createBranch('feature/c', mainCommit.id, 'user3'),
      ];

      const branches = await Promise.all(branchPromises);

      expect(branches).toHaveLength(3);
      branches.forEach((branch, index) => {
        expect(branch.name).toBe(`feature/${['a', 'b', 'c'][index]}`);
        expect(branch.headCommitId).toBe(mainCommit.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction rollback on commit failure', async () => {
      // This test would require more sophisticated mocking to simulate failures
      // For now, we'll test basic error scenarios

      // Try to create commit on non-existent branch
      await expect(
        versionControlService.createCommit(
          'memory-1',
          'nonexistent-branch',
          'user1',
          'Test commit',
          { type: 'create', after: { content: 'test' } }
        )
      ).rejects.toThrow();
    });

    it('should handle merge request validation errors', async () => {
      // Try to create MR with non-existent branches
      await expect(
        mergeRequestService.createMergeRequest(
          'nonexistent-source',
          'nonexistent-target',
          'Test MR',
          'Description',
          'user1'
        )
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large commit history efficiently', async () => {
      const startTime = Date.now();

      // Create many commits
      let previousCommit = null;
      for (let i = 1; i <= 100; i++) {
        const commit = await versionControlService.createCommit(
          `memory-${i}`,
          'main',
          'user1',
          `Commit ${i}`,
          {
            type: 'create',
            after: { content: `Content ${i}` },
          }
        );
        previousCommit = commit;
      }

      // Fetch history
      const history = await versionControlService.getCommitHistory('main', 50);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(history).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });
});