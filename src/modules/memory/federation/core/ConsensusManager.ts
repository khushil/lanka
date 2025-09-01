import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';

export interface ConsensusProposal {
  id: string;
  type: 'model_update' | 'parameter_change' | 'participant_admission' | 'protocol_upgrade';
  proposer: string;
  content: any;
  requiredVotes: number;
  timestamp: Date;
  deadline: Date;
}

export interface Vote {
  proposalId: string;
  voter: string;
  decision: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  timestamp: Date;
  signature?: string;
}

export interface ConsensusResult {
  proposalId: string;
  decision: 'approved' | 'rejected' | 'expired';
  votes: {
    approve: number;
    reject: number;
    abstain: number;
  };
  participation: number;
  confidence: number;
}

export interface ParticipantInfo {
  instanceId: string;
  weight: number;
  reputation: number;
  lastActive: Date;
  isEligible: boolean;
}

/**
 * Consensus Manager - Byzantine Fault Tolerant consensus for federated learning
 * 
 * Manages consensus decisions for global model updates, parameter changes,
 * and protocol upgrades. Implements PBFT-like consensus with reputation-based
 * weighting and Byzantine fault tolerance.
 */
export class ConsensusManager extends EventEmitter {
  private logger: Logger;
  private instanceId: string;
  private participants: Map<string, ParticipantInfo> = new Map();
  private activeProposals: Map<string, ConsensusProposal> = new Map();
  private votes: Map<string, Vote[]> = new Map(); // proposalId -> votes
  private consensusHistory: ConsensusResult[] = [];
  
  private readonly CONSENSUS_TIMEOUT = 300000; // 5 minutes
  private readonly MIN_PARTICIPATION = 0.67; // 2/3 participation required
  private readonly APPROVAL_THRESHOLD = 0.67; // 2/3 approval required
  private readonly MAX_BYZANTINE_NODES = 0.33; // Up to 1/3 Byzantine nodes

  constructor(instanceId: string) {
    super();
    this.instanceId = instanceId;
    this.logger = new Logger('ConsensusManager');
  }

  /**
   * Initialize consensus manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Consensus Manager', {
      instanceId: this.instanceId
    });
    
    // Start proposal cleanup timer
    setInterval(() => this.cleanupExpiredProposals(), 60000);
    
    this.logger.info('Consensus Manager initialized');
  }

  /**
   * Register a participant in the consensus
   */
  async registerParticipant(
    instanceId: string,
    weight: number = 1.0,
    reputation: number = 1.0
  ): Promise<void> {
    const participant: ParticipantInfo = {
      instanceId,
      weight,
      reputation,
      lastActive: new Date(),
      isEligible: true
    };
    
    this.participants.set(instanceId, participant);
    
    this.logger.info('Participant registered', {
      instanceId,
      weight,
      reputation,
      totalParticipants: this.participants.size
    });
    
    this.emit('participantRegistered', participant);
  }

  /**
   * Propose a global model update
   */
  async proposeModelUpdate(
    globalWeights: Float32Array[],
    accuracy: number,
    round: number,
    participantCount: number
  ): Promise<string> {
    const proposalId = this.generateProposalId();
    
    const proposal: ConsensusProposal = {
      id: proposalId,
      type: 'model_update',
      proposer: this.instanceId,
      content: {
        weights: globalWeights,
        accuracy,
        round,
        participantCount,
        checksum: this.calculateWeightChecksum(globalWeights)
      },
      requiredVotes: Math.ceil(this.participants.size * this.MIN_PARTICIPATION),
      timestamp: new Date(),
      deadline: new Date(Date.now() + this.CONSENSUS_TIMEOUT)
    };
    
    this.activeProposals.set(proposalId, proposal);
    this.votes.set(proposalId, []);
    
    this.logger.info('Model update proposed', {
      proposalId,
      round,
      accuracy,
      requiredVotes: proposal.requiredVotes
    });
    
    // Start timeout timer
    setTimeout(() => {
      this.handleProposalTimeout(proposalId);
    }, this.CONSENSUS_TIMEOUT);
    
    this.emit('proposalCreated', proposal);
    
    return proposalId;
  }

  /**
   * Propose parameter change
   */
  async proposeParameterChange(
    parameterName: string,
    newValue: any,
    justification: string
  ): Promise<string> {
    const proposalId = this.generateProposalId();
    
    const proposal: ConsensusProposal = {
      id: proposalId,
      type: 'parameter_change',
      proposer: this.instanceId,
      content: {
        parameter: parameterName,
        newValue,
        justification
      },
      requiredVotes: Math.ceil(this.participants.size * this.MIN_PARTICIPATION),
      timestamp: new Date(),
      deadline: new Date(Date.now() + this.CONSENSUS_TIMEOUT)
    };
    
    this.activeProposals.set(proposalId, proposal);
    this.votes.set(proposalId, []);
    
    this.logger.info('Parameter change proposed', {
      proposalId,
      parameter: parameterName,
      newValue
    });
    
    setTimeout(() => {
      this.handleProposalTimeout(proposalId);
    }, this.CONSENSUS_TIMEOUT);
    
    this.emit('proposalCreated', proposal);
    
    return proposalId;
  }

  /**
   * Cast vote on a proposal
   */
  async castVote(
    proposalId: string,
    decision: 'approve' | 'reject' | 'abstain',
    reasoning?: string
  ): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found or expired`);
    }
    
    const participant = this.participants.get(this.instanceId);
    if (!participant || !participant.isEligible) {
      throw new Error('Instance not eligible to vote');
    }
    
    // Check if already voted
    const existingVotes = this.votes.get(proposalId) || [];
    const existingVote = existingVotes.find(v => v.voter === this.instanceId);
    
    if (existingVote) {
      throw new Error('Already voted on this proposal');
    }
    
    const vote: Vote = {
      proposalId,
      voter: this.instanceId,
      decision,
      reasoning,
      timestamp: new Date()
    };
    
    existingVotes.push(vote);
    this.votes.set(proposalId, existingVotes);
    
    this.logger.info('Vote cast', {
      proposalId,
      decision,
      voter: this.instanceId
    });
    
    // Update participant last active
    participant.lastActive = new Date();
    
    this.emit('voteCast', vote);
    
    // Check if consensus is reached
    await this.checkConsensus(proposalId);
  }

  /**
   * Get active proposals
   */
  getActiveProposals(): ConsensusProposal[] {
    return Array.from(this.activeProposals.values());
  }

  /**
   * Get consensus history
   */
  getConsensusHistory(): ConsensusResult[] {
    return [...this.consensusHistory];
  }

  /**
   * Get participant information
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Update participant reputation
   */
  async updateReputation(instanceId: string, delta: number): Promise<void> {
    const participant = this.participants.get(instanceId);
    if (!participant) {
      throw new Error(`Participant ${instanceId} not found`);
    }
    
    const oldReputation = participant.reputation;
    participant.reputation = Math.max(0, Math.min(2.0, participant.reputation + delta));
    
    this.logger.debug('Reputation updated', {
      instanceId,
      oldReputation,
      newReputation: participant.reputation,
      delta
    });
    
    // Update eligibility based on reputation
    participant.isEligible = participant.reputation >= 0.5;
    
    this.emit('reputationUpdated', {
      instanceId,
      oldReputation,
      newReputation: participant.reputation
    });
  }

  /**
   * Handle Byzantine behavior detection
   */
  async handleByzantineDetection(
    suspiciousInstanceId: string,
    evidence: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }
  ): Promise<void> {
    const participant = this.participants.get(suspiciousInstanceId);
    if (!participant) {
      return;
    }
    
    this.logger.warn('Byzantine behavior detected', {
      instanceId: suspiciousInstanceId,
      evidence
    });
    
    // Apply reputation penalty based on severity
    let penalty = 0;
    switch (evidence.severity) {
      case 'low':
        penalty = -0.1;
        break;
      case 'medium':
        penalty = -0.3;
        break;
      case 'high':
        penalty = -0.5;
        break;
    }
    
    await this.updateReputation(suspiciousInstanceId, penalty);
    
    // If reputation drops too low, propose exclusion
    if (participant.reputation < 0.2) {
      await this.proposeParticipantExclusion(suspiciousInstanceId, evidence);
    }
    
    this.emit('byzantineDetected', {
      instanceId: suspiciousInstanceId,
      evidence,
      penalty
    });
  }

  /**
   * Propose participant exclusion
   */
  async proposeParticipantExclusion(
    instanceId: string,
    evidence: any
  ): Promise<string> {
    const proposalId = this.generateProposalId();
    
    const proposal: ConsensusProposal = {
      id: proposalId,
      type: 'participant_admission',
      proposer: this.instanceId,
      content: {
        action: 'exclude',
        instanceId,
        evidence
      },
      requiredVotes: Math.ceil(this.participants.size * 0.75), // Higher threshold for exclusion
      timestamp: new Date(),
      deadline: new Date(Date.now() + this.CONSENSUS_TIMEOUT)
    };
    
    this.activeProposals.set(proposalId, proposal);
    this.votes.set(proposalId, []);
    
    this.logger.info('Participant exclusion proposed', {
      proposalId,
      targetInstanceId: instanceId
    });
    
    setTimeout(() => {
      this.handleProposalTimeout(proposalId);
    }, this.CONSENSUS_TIMEOUT);
    
    this.emit('proposalCreated', proposal);
    
    return proposalId;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Consensus Manager');
    
    // Complete any active proposals as expired
    for (const proposalId of this.activeProposals.keys()) {
      await this.finalizeProposal(proposalId, 'expired');
    }
    
    // Generate final consensus report
    const report = {
      totalProposals: this.consensusHistory.length,
      approvalRate: this.consensusHistory.filter(r => r.decision === 'approved').length / this.consensusHistory.length,
      averageParticipation: this.consensusHistory.reduce((sum, r) => sum + r.participation, 0) / this.consensusHistory.length,
      participantCount: this.participants.size
    };
    
    this.logger.info('Final consensus report', report);
  }

  private async checkConsensus(proposalId: string): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    const votes = this.votes.get(proposalId) || [];
    
    if (!proposal) {
      return;
    }
    
    const eligibleParticipants = Array.from(this.participants.values())
      .filter(p => p.isEligible);
    
    const totalWeight = eligibleParticipants.reduce((sum, p) => sum + p.weight * p.reputation, 0);
    
    // Calculate weighted votes
    let approveWeight = 0;
    let rejectWeight = 0;
    let abstainWeight = 0;
    
    for (const vote of votes) {
      const participant = this.participants.get(vote.voter);
      if (participant && participant.isEligible) {
        const weight = participant.weight * participant.reputation;
        
        switch (vote.decision) {
          case 'approve':
            approveWeight += weight;
            break;
          case 'reject':
            rejectWeight += weight;
            break;
          case 'abstain':
            abstainWeight += weight;
            break;
        }
      }
    }
    
    const votedWeight = approveWeight + rejectWeight + abstainWeight;
    const participation = votedWeight / totalWeight;
    
    // Check if minimum participation is reached
    if (participation < this.MIN_PARTICIPATION) {
      return; // Not enough participation yet
    }
    
    // Check if approval threshold is met
    const approvalRatio = approveWeight / votedWeight;
    let decision: 'approved' | 'rejected';
    
    if (approvalRatio >= this.APPROVAL_THRESHOLD) {
      decision = 'approved';
    } else {
      decision = 'rejected';
    }
    
    await this.finalizeProposal(proposalId, decision);
  }

  private async finalizeProposal(
    proposalId: string,
    decision: 'approved' | 'rejected' | 'expired'
  ): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    const votes = this.votes.get(proposalId) || [];
    
    if (!proposal) {
      return;
    }
    
    const voteCount = {
      approve: votes.filter(v => v.decision === 'approve').length,
      reject: votes.filter(v => v.decision === 'reject').length,
      abstain: votes.filter(v => v.decision === 'abstain').length
    };
    
    const totalVotes = voteCount.approve + voteCount.reject + voteCount.abstain;
    const participation = totalVotes / this.participants.size;
    
    // Calculate confidence based on participation and vote distribution
    const confidence = this.calculateConfidence(voteCount, participation);
    
    const result: ConsensusResult = {
      proposalId,
      decision,
      votes: voteCount,
      participation,
      confidence
    };
    
    this.consensusHistory.push(result);
    this.activeProposals.delete(proposalId);
    this.votes.delete(proposalId);
    
    this.logger.info('Consensus reached', {
      proposalId,
      decision,
      participation: participation.toFixed(2),
      confidence: confidence.toFixed(2)
    });
    
    // Update participant reputations based on outcome
    await this.updateParticipantReputations(proposal, votes, decision);
    
    this.emit('consensusReached', result);
    
    // Execute the decision if approved
    if (decision === 'approved') {
      await this.executeApprovedProposal(proposal);
    }
  }

  private async executeApprovedProposal(proposal: ConsensusProposal): Promise<void> {
    this.logger.info('Executing approved proposal', {
      proposalId: proposal.id,
      type: proposal.type
    });
    
    switch (proposal.type) {
      case 'model_update':
        this.emit('modelUpdateApproved', proposal.content);
        break;
      
      case 'parameter_change':
        this.emit('parameterChangeApproved', proposal.content);
        break;
      
      case 'participant_admission':
        await this.handleParticipantAdmission(proposal.content);
        break;
      
      case 'protocol_upgrade':
        this.emit('protocolUpgradeApproved', proposal.content);
        break;
    }
  }

  private async handleParticipantAdmission(content: any): Promise<void> {
    if (content.action === 'exclude') {
      const participant = this.participants.get(content.instanceId);
      if (participant) {
        participant.isEligible = false;
        this.logger.info('Participant excluded by consensus', {
          instanceId: content.instanceId
        });
        this.emit('participantExcluded', content.instanceId);
      }
    }
  }

  private async updateParticipantReputations(
    proposal: ConsensusProposal,
    votes: Vote[],
    decision: string
  ): Promise<void> {
    // Update reputations based on voting behavior and outcome
    for (const vote of votes) {
      const participant = this.participants.get(vote.voter);
      if (!participant) continue;
      
      let reputationDelta = 0;
      
      // Reward correct predictions
      if ((decision === 'approved' && vote.decision === 'approve') ||
          (decision === 'rejected' && vote.decision === 'reject')) {
        reputationDelta = 0.05;
      }
      // Small penalty for incorrect predictions
      else if (vote.decision !== 'abstain') {
        reputationDelta = -0.02;
      }
      
      // Small reward for participation
      reputationDelta += 0.01;
      
      await this.updateReputation(vote.voter, reputationDelta);
    }
    
    // Small penalty for non-participation
    const nonVoters = Array.from(this.participants.keys())
      .filter(id => !votes.some(v => v.voter === id));
    
    for (const nonVoter of nonVoters) {
      await this.updateReputation(nonVoter, -0.03);
    }
  }

  private calculateConfidence(
    voteCount: { approve: number; reject: number; abstain: number },
    participation: number
  ): number {
    const totalVotes = voteCount.approve + voteCount.reject + voteCount.abstain;
    
    if (totalVotes === 0) {
      return 0;
    }
    
    // Calculate vote concentration (how unanimous the decision was)
    const maxVotes = Math.max(voteCount.approve, voteCount.reject);
    const concentration = maxVotes / totalVotes;
    
    // Confidence is based on participation and concentration
    const baseConfidence = (participation + concentration) / 2;
    
    // Boost confidence for higher participation
    const participationBonus = Math.max(0, participation - this.MIN_PARTICIPATION) * 0.5;
    
    return Math.min(1.0, baseConfidence + participationBonus);
  }

  private handleProposalTimeout(proposalId: string): void {
    if (this.activeProposals.has(proposalId)) {
      this.finalizeProposal(proposalId, 'expired');
    }
  }

  private cleanupExpiredProposals(): void {
    const now = new Date();
    
    for (const [proposalId, proposal] of this.activeProposals.entries()) {
      if (now > proposal.deadline) {
        this.finalizeProposal(proposalId, 'expired');
      }
    }
  }

  private calculateWeightChecksum(weights: Float32Array[]): string {
    let sum = 0;
    for (const layer of weights) {
      for (let i = 0; i < layer.length; i++) {
        sum += layer[i];
      }
    }
    return sum.toString();
  }

  private generateProposalId(): string {
    return `proposal_${this.instanceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}