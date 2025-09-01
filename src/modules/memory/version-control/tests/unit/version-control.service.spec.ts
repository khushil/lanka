import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { VersionControlService } from '../../services/version-control.service';
import { MemoryCommitEntity, MemoryBranchEntity, MergeConflictEntity } from '../../models/commit.model';
import { ConflictResolutionService } from '../../services/conflict-resolution.service';
import { DiffService } from '../../services/diff.service';
import { LLMService } from '../../../llm/llm.service';
import { MergeStrategy } from '../../types';

describe('VersionControlService', () => {
  let service: VersionControlService;
  let commitRepository: jest.Mocked<Repository<MemoryCommitEntity>>;
  let branchRepository: jest.Mocked<Repository<MemoryBranchEntity>>;
  let conflictRepository: jest.Mocked<Repository<MergeConflictEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let conflictResolution: jest.Mocked<ConflictResolutionService>;
  let diffService: jest.Mocked<DiffService>;
  let llmService: jest.Mocked<LLMService>;

  beforeEach(async () => {
    // Mock QueryRunner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(),
      } as any,
    } as jest.Mocked<QueryRunner>;

    // Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as jest.Mocked<DataSource>;

    // Mock repositories
    commitRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    branchRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as any;

    conflictRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    // Mock services
    conflictResolution = {
      resolveConflict: jest.fn(),
    } as jest.Mocked<ConflictResolutionService>;

    diffService = {
      generateDiff: jest.fn(),
      getDiffStats: jest.fn(),
    } as jest.Mocked<DiffService>;

    llmService = {
      analyze: jest.fn(),
    } as jest.Mocked<LLMService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionControlService,
        {
          provide: getRepositoryToken(MemoryCommitEntity),
          useValue: commitRepository,
        },
        {
          provide: getRepositoryToken(MemoryBranchEntity),
          useValue: branchRepository,
        },
        {
          provide: getRepositoryToken(MergeConflictEntity),
          useValue: conflictRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ConflictResolutionService,
          useValue: conflictResolution,
        },
        {
          provide: DiffService,
          useValue: diffService,
        },
        {
          provide: LLMService,
          useValue: llmService,
        },
      ],
    }).compile();

    service = module.get<VersionControlService>(VersionControlService);
  });

  describe('createCommit', () => {
    it('should create a new commit successfully', async () => {
      const mockBranch = {
        name: 'main',
        headCommitId: 'parent-commit-id',
        toDomain: () => ({
          name: 'main',
          headCommitId: 'parent-commit-id',
          createdAt: new Date(),
          createdBy: 'user1',
          isProtected: false,
        }),
      };

      const mockCommit = {
        id: 'new-commit-id',
        memoryId: 'memory-1',
        branchName: 'main',
        authorId: 'user1',
        message: 'Test commit',
        changes: { type: 'create', after: { content: 'test' } },
        toDomain: () => ({
          id: 'new-commit-id',
          parentIds: ['parent-commit-id'],
          memoryId: 'memory-1',
          branchName: 'main',
          authorId: 'user1',
          timestamp: new Date(),
          message: 'Test commit',
          changes: { type: 'create', after: { content: 'test' } },
        }),
      };

      branchRepository.findOne.mockResolvedValue(mockBranch as any);
      queryRunner.manager.save.mockResolvedValue(mockCommit);

      const result = await service.createCommit(
        'memory-1',
        'main',
        'user1',
        'Test commit',
        { type: 'create', after: { content: 'test' } },
        'Test rationale'
      );

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result.message).toBe('Test commit');
    });

    it('should rollback on error', async () => {
      branchRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createCommit('memory-1', 'main', 'user1', 'Test commit', {})
      ).rejects.toThrow('Database error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('createBranch', () => {
    it('should create a new branch from existing commit', async () => {
      const mockCommit = {
        id: 'commit-id',
        branchName: 'main',
      };

      const mockBranch = {
        name: 'feature-branch',
        headCommitId: 'commit-id',
        toDomain: () => ({
          name: 'feature-branch',
          headCommitId: 'commit-id',
          createdAt: new Date(),
          createdBy: 'user1',
          isProtected: false,
        }),
      };

      commitRepository.findOne.mockResolvedValue(mockCommit as any);
      branchRepository.findOne.mockResolvedValue(null); // Branch doesn't exist
      branchRepository.save.mockResolvedValue(mockBranch as any);

      const result = await service.createBranch('feature-branch', 'commit-id', 'user1');

      expect(commitRepository.findOne).toHaveBeenCalledWith({ where: { id: 'commit-id' } });
      expect(branchRepository.findOne).toHaveBeenCalledWith({ where: { name: 'feature-branch' } });
      expect(result.name).toBe('feature-branch');
    });

    it('should throw error if commit does not exist', async () => {
      commitRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createBranch('feature-branch', 'nonexistent-commit', 'user1')
      ).rejects.toThrow('Commit nonexistent-commit not found');
    });

    it('should throw error if branch already exists', async () => {
      const mockCommit = { id: 'commit-id' };
      const mockExistingBranch = { name: 'feature-branch' };

      commitRepository.findOne.mockResolvedValue(mockCommit as any);
      branchRepository.findOne.mockResolvedValue(mockExistingBranch as any);

      await expect(
        service.createBranch('feature-branch', 'commit-id', 'user1')
      ).rejects.toThrow('Branch feature-branch already exists');
    });
  });

  describe('mergeBranches', () => {
    it('should merge branches without conflicts', async () => {
      const mockSourceBranch = {
        name: 'feature',
        headCommitId: 'source-commit-id',
        toDomain: () => ({
          name: 'feature',
          headCommitId: 'source-commit-id',
          createdAt: new Date(),
          createdBy: 'user1',
          isProtected: false,
        }),
      };

      const mockTargetBranch = {
        name: 'main',
        headCommitId: 'target-commit-id',
        toDomain: () => ({
          name: 'main',
          headCommitId: 'target-commit-id',
          createdAt: new Date(),
          createdBy: 'user1',
          isProtected: false,
        }),
      };

      const mockMergeCommit = {
        id: 'merge-commit-id',
      };

      branchRepository.findOne
        .mockResolvedValueOnce(mockSourceBranch as any)
        .mockResolvedValueOnce(mockTargetBranch as any);

      // Mock no conflicts
      jest.spyOn(service as any, 'detectConflicts').mockResolvedValue([]);
      jest.spyOn(service as any, 'createMergeCommit').mockResolvedValue(mockMergeCommit);

      const result = await service.mergeBranches('feature', 'main', MergeStrategy.AUTO, 'user1');

      expect(result.success).toBe(true);
      expect(result.commitId).toBe('merge-commit-id');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return conflicts when auto-merge fails', async () => {
      const mockSourceBranch = { name: 'feature', headCommitId: 'source-commit-id' };
      const mockTargetBranch = { name: 'main', headCommitId: 'target-commit-id' };
      const mockConflicts = [{
        memoryId: 'memory-1',
        sourceBranch: 'feature',
        targetBranch: 'main',
        conflictType: 'semantic' as const,
        sourceCommitId: 'source-commit-id',
        targetCommitId: 'target-commit-id',
        conflictDetails: {
          field: 'content',
          sourceValue: 'source value',
          targetValue: 'target value',
        },
      }];

      branchRepository.findOne
        .mockResolvedValueOnce(mockSourceBranch as any)
        .mockResolvedValueOnce(mockTargetBranch as any);

      jest.spyOn(service as any, 'detectConflicts').mockResolvedValue(mockConflicts);
      conflictResolution.resolveConflict.mockResolvedValue(mockConflicts[0]); // Unresolved

      const result = await service.mergeBranches('feature', 'main', MergeStrategy.AUTO, 'user1');

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('rollback', () => {
    it('should create rollback commit', async () => {
      const mockCommit = {
        id: 'rollback-commit-id',
        memoryId: 'memory-1',
        branchName: 'main',
        changes: { after: { content: 'previous state' } },
        toDomain: () => ({
          id: 'rollback-commit-id',
          memoryId: 'memory-1',
          branchName: 'main',
          message: 'Rollback to commit commit-id',
          changes: { type: 'update', after: { content: 'previous state' } },
        }),
      };

      commitRepository.findOne.mockResolvedValue(mockCommit as any);
      jest.spyOn(service, 'createCommit').mockResolvedValue(mockCommit.toDomain() as any);

      const result = await service.rollback('main', 'commit-id', 'user1');

      expect(commitRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'commit-id', branchName: 'main' }
      });
      expect(result.message).toBe('Rollback to commit commit-id');
    });

    it('should throw error if commit not found', async () => {
      commitRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rollback('main', 'nonexistent-commit', 'user1')
      ).rejects.toThrow('Commit nonexistent-commit not found on branch main');
    });
  });

  describe('deleteBranch', () => {
    it('should delete non-protected branch', async () => {
      const mockBranch = {
        name: 'feature-branch',
        isProtected: false,
      };

      branchRepository.findOne.mockResolvedValue(mockBranch as any);
      branchRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteBranch('feature-branch', 'user1');

      expect(branchRepository.delete).toHaveBeenCalledWith({ name: 'feature-branch' });
    });

    it('should not delete protected branch', async () => {
      const mockBranch = {
        name: 'main',
        isProtected: true,
      };

      branchRepository.findOne.mockResolvedValue(mockBranch as any);

      await expect(
        service.deleteBranch('main', 'user1')
      ).rejects.toThrow('Cannot delete protected branch main');
    });

    it('should not delete main branch', async () => {
      await expect(
        service.deleteBranch('main', 'user1')
      ).rejects.toThrow('Cannot delete main branch');
    });
  });

  describe('getDiff', () => {
    it('should generate diff between commits', async () => {
      const mockFromCommit = {
        id: 'from-commit',
        changes: { before: null, after: { content: 'old content' } },
      };

      const mockToCommit = {
        id: 'to-commit',
        changes: { before: { content: 'old content' }, after: { content: 'new content' } },
      };

      const mockDiff = [{
        type: 'modified' as const,
        path: 'content',
        oldValue: 'old content',
        newValue: 'new content',
        similarity: 0.8,
      }];

      commitRepository.findOne
        .mockResolvedValueOnce(mockFromCommit as any)
        .mockResolvedValueOnce(mockToCommit as any);

      diffService.generateDiff.mockReturnValue(mockDiff);

      const result = await service.getDiff('from-commit', 'to-commit');

      expect(diffService.generateDiff).toHaveBeenCalledWith(
        mockFromCommit.changes,
        mockToCommit.changes
      );
      expect(result).toEqual(mockDiff);
    });

    it('should throw error if commits not found', async () => {
      commitRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDiff('nonexistent-commit', 'another-commit')
      ).rejects.toThrow('One or both commits not found');
    });
  });

  describe('getCommitHistory', () => {
    it('should return commit history for branch', async () => {
      const mockBranch = {
        name: 'main',
        headCommitId: 'head-commit',
        toDomain: () => ({ name: 'main', headCommitId: 'head-commit' }),
      };

      const mockCommits = [
        {
          id: 'commit-1',
          toDomain: () => ({
            id: 'commit-1',
            message: 'First commit',
            timestamp: new Date(),
          }),
        },
        {
          id: 'commit-2',
          toDomain: () => ({
            id: 'commit-2',
            message: 'Second commit',
            timestamp: new Date(),
          }),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockCommits),
      };

      branchRepository.findOne.mockResolvedValue(mockBranch as any);
      commitRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCommitHistory('main', 10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('commit-1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'commit.branchName = :branchName',
        { branchName: 'main' }
      );
    });

    it('should throw error if branch not found', async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getCommitHistory('nonexistent-branch')
      ).rejects.toThrow('Branch nonexistent-branch not found');
    });
  });

  describe('getAllBranches', () => {
    it('should return all branches', async () => {
      const mockBranches = [
        {
          name: 'main',
          toDomain: () => ({ name: 'main', isProtected: true }),
        },
        {
          name: 'feature',
          toDomain: () => ({ name: 'feature', isProtected: false }),
        },
      ];

      branchRepository.find.mockResolvedValue(mockBranches as any);

      const result = await service.getAllBranches();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('main');
      expect(result[1].name).toBe('feature');
      expect(branchRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' }
      });
    });
  });
});