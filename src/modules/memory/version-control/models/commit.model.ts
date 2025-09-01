import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { MemoryCommit, MemoryDiff } from '../types';

@Entity('memory_commits')
@Index(['branchName', 'timestamp'])
@Index(['memoryId', 'timestamp'])
export class MemoryCommitEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { array: true, default: [] })
  parentIds!: string[];

  @Column('uuid')
  @Index()
  memoryId!: string;

  @Column()
  @Index()
  branchName!: string;

  @Column()
  authorId!: string;

  @CreateDateColumn()
  timestamp!: Date;

  @Column()
  message!: string;

  @Column('text', { nullable: true })
  rationale?: string;

  @Column('jsonb')
  changes!: {
    type: 'create' | 'update' | 'delete' | 'merge';
    before?: any;
    after?: any;
    diff?: string;
  };

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('text', { nullable: true })
  signature?: string; // Cryptographic signature for integrity

  @UpdateDateColumn()
  updatedAt!: Date;

  // Virtual properties for graph traversal
  @OneToMany(() => MemoryCommitEntity, commit => commit.parentCommit, { lazy: true })
  childCommits?: Promise<MemoryCommitEntity[]>;

  @ManyToOne(() => MemoryCommitEntity, { nullable: true, lazy: true })
  @JoinColumn({ name: 'parentId' })
  parentCommit?: Promise<MemoryCommitEntity>;

  // Convert to domain type
  toDomain(): MemoryCommit {
    return {
      id: this.id,
      parentIds: this.parentIds,
      memoryId: this.memoryId,
      branchName: this.branchName,
      authorId: this.authorId,
      timestamp: this.timestamp,
      message: this.message,
      rationale: this.rationale,
      changes: this.changes,
      metadata: this.metadata,
    };
  }

  // Create from domain type
  static fromDomain(commit: Partial<MemoryCommit>): MemoryCommitEntity {
    const entity = new MemoryCommitEntity();
    Object.assign(entity, commit);
    return entity;
  }

  // Calculate commit hash for integrity
  calculateHash(): string {
    const crypto = require('crypto');
    const content = JSON.stringify({
      parentIds: this.parentIds,
      memoryId: this.memoryId,
      timestamp: this.timestamp.toISOString(),
      message: this.message,
      changes: this.changes,
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Verify commit integrity
  verifyIntegrity(): boolean {
    if (!this.signature) return false;
    return this.signature === this.calculateHash();
  }
}

@Entity('memory_branches')
export class MemoryBranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  name!: string;

  @Column('uuid')
  headCommitId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  createdBy!: string;

  @Column({ default: false })
  isProtected!: boolean;

  @Column('text', { nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => MemoryCommitEntity, { lazy: true })
  @JoinColumn({ name: 'headCommitId' })
  headCommit?: Promise<MemoryCommitEntity>;

  toDomain() {
    return {
      name: this.name,
      headCommitId: this.headCommitId,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      isProtected: this.isProtected,
      description: this.description,
      metadata: this.metadata,
    };
  }

  static fromDomain(branch: Partial<MemoryBranch>): MemoryBranchEntity {
    const entity = new MemoryBranchEntity();
    Object.assign(entity, branch);
    return entity;
  }
}

@Entity('memory_tags')
export class MemoryTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  name!: string;

  @Column('uuid')
  commitId!: string;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column('text', { nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => MemoryCommitEntity, { lazy: true })
  @JoinColumn({ name: 'commitId' })
  commit?: Promise<MemoryCommitEntity>;
}

@Entity('merge_conflicts')
@Index(['sourceBranch', 'targetBranch', 'resolved'])
export class MergeConflictEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  memoryId!: string;

  @Column()
  sourceBranch!: string;

  @Column()
  targetBranch!: string;

  @Column({
    type: 'enum',
    enum: ['semantic', 'structural', 'temporal'],
  })
  conflictType!: 'semantic' | 'structural' | 'temporal';

  @Column('uuid')
  sourceCommitId!: string;

  @Column('uuid')
  targetCommitId!: string;

  @Column('jsonb')
  conflictDetails!: {
    field: string;
    sourceValue: any;
    targetValue: any;
    baseValue?: any;
  };

  @Column('jsonb', { nullable: true })
  resolution?: {
    strategy: 'manual' | 'llm' | 'automatic';
    resolvedValue: any;
    rationale: string;
    confidence: number;
  };

  @Column({ default: false })
  @Index()
  resolved!: boolean;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}