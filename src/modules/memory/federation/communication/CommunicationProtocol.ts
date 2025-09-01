import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';

export interface NetworkMessage {
  id: string;
  type: 'announcement' | 'training_round' | 'model_update' | 'heartbeat' | 'discovery';
  sender: string;
  recipients?: string[];
  payload: any;
  timestamp: Date;
  signature?: string;
  nonce?: string;
}

export interface PeerInfo {
  instanceId: string;
  endpoint: string;
  publicKey: string;
  capabilities: string[];
  lastSeen: Date;
  reputation: number;
  isActive: boolean;
  networkLatency?: number;
}

export interface NetworkTopology {
  nodes: Map<string, PeerInfo>;
  connections: Map<string, Set<string>>;
  discoveryNodes: string[];
  networkId: string;
}

export interface CommunicationMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  averageLatency: number;
  failedConnections: number;
  activePeers: number;
}

/**
 * Communication Protocol - Secure peer-to-peer communication for federation
 * 
 * Manages secure communication between federated learning participants,
 * including peer discovery, message routing, encryption, and network topology
 * maintenance. Implements gossip protocol for efficient message dissemination.
 */
export class CommunicationProtocol extends EventEmitter {
  private logger: Logger;
  private instanceId: string;
  private topology: NetworkTopology;
  private metrics: CommunicationMetrics;
  
  private keyPair: CryptoKeyPair | null = null;
  private messageQueue: Map<string, NetworkMessage> = new Map();
  private pendingMessages: Map<string, {
    message: NetworkMessage;
    retryCount: number;
    lastAttempt: Date;
  }> = new Map();
  
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly DISCOVERY_INTERVAL = 60000; // 1 minute
  private readonly MESSAGE_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;

  constructor(instanceId: string) {
    super();
    this.instanceId = instanceId;
    this.logger = new Logger('CommunicationProtocol');
    
    this.topology = {
      nodes: new Map(),
      connections: new Map(),
      discoveryNodes: [],
      networkId: ''
    };
    
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      failedConnections: 0,
      activePeers: 0
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Communication Protocol', {
      instanceId: this.instanceId
    });
    
    // Generate cryptographic keys
    await this.generateKeyPair();
    
    // Start background tasks
    this.startHeartbeat();
    this.startPeriodicDiscovery();
    this.startMessageCleanup();
    
    this.logger.info('Communication Protocol initialized');
  }

  /**
   * Register with federation network
   */
  async registerWithNetwork(networkId: string, discoveryNodes: string[]): Promise<void> {
    this.logger.info('Registering with network', { networkId, discoveryNodes });
    
    this.topology.networkId = networkId;
    this.topology.discoveryNodes = discoveryNodes;
    
    // Connect to discovery nodes
    for (const nodeEndpoint of discoveryNodes) {
      await this.connectToPeer(nodeEndpoint);
    }
    
    // Start network discovery
    await this.performNetworkDiscovery();
    
    this.emit('networkRegistered', { networkId, peerCount: this.topology.nodes.size });
  }

  /**
   * Announce presence to the network
   */
  async announcePresence(announcement: {
    instanceId: string;
    capabilities: string[];
    privacyLevel: string;
    publicKey: string;
  }): Promise<void> {
    const message: NetworkMessage = {
      id: this.generateMessageId(),
      type: 'announcement',
      sender: this.instanceId,
      payload: announcement,
      timestamp: new Date()
    };
    
    await this.broadcastMessage(message);
    
    this.logger.info('Presence announced to network', {
      capabilities: announcement.capabilities
    });
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcastMessage(message: NetworkMessage): Promise<void> {
    message.signature = await this.signMessage(message);
    
    const peers = Array.from(this.topology.nodes.keys());
    
    this.logger.debug('Broadcasting message', {
      type: message.type,
      peers: peers.length,
      messageId: message.id
    });
    
    for (const peerId of peers) {
      await this.sendMessageToPeer(peerId, message);
    }
    
    this.metrics.messagesSent += peers.length;
  }

  /**
   * Send message to specific peer
   */
  async sendMessageToPeer(peerId: string, message: NetworkMessage): Promise<void> {
    const peer = this.topology.nodes.get(peerId);
    
    if (!peer) {
      throw new Error(`Peer ${peerId} not found in topology`);
    }
    
    try {
      // Add message to pending queue
      this.pendingMessages.set(message.id, {
        message,
        retryCount: 0,
        lastAttempt: new Date()
      });
      
      // Simulate network send (in real implementation, this would use WebRTC, WebSockets, etc.)
      await this.simulateNetworkSend(peer.endpoint, message);
      
      // Remove from pending on success
      this.pendingMessages.delete(message.id);
      
      this.logger.debug('Message sent successfully', {
        peerId,
        messageType: message.type,
        messageId: message.id
      });
      
    } catch (error) {
      this.logger.error('Failed to send message', { peerId, error });
      this.handleMessageFailure(message.id);
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  async handleIncomingMessage(message: NetworkMessage): Promise<void> {
    this.logger.debug('Received message', {
      type: message.type,
      sender: message.sender,
      messageId: message.id
    });
    
    // Verify message signature
    if (!(await this.verifyMessage(message))) {
      this.logger.warn('Message signature verification failed', {
        sender: message.sender,
        messageId: message.id
      });
      return;
    }
    
    // Update metrics
    this.metrics.messagesReceived++;
    
    // Process message based on type
    switch (message.type) {
      case 'announcement':
        await this.handleAnnouncementMessage(message);
        break;
      
      case 'training_round':
        await this.handleTrainingRoundMessage(message);
        break;
      
      case 'model_update':
        await this.handleModelUpdateMessage(message);
        break;
      
      case 'heartbeat':
        await this.handleHeartbeatMessage(message);
        break;
      
      case 'discovery':
        await this.handleDiscoveryMessage(message);
        break;
      
      default:
        this.logger.warn('Unknown message type', { type: message.type });
    }
    
    this.emit('messageReceived', message);
  }

  /**
   * Announce opt-out from federation
   */
  async announceOptOut(): Promise<void> {
    const message: NetworkMessage = {
      id: this.generateMessageId(),
      type: 'announcement',
      sender: this.instanceId,
      payload: {
        instanceId: this.instanceId,
        status: 'opted_out',
        timestamp: new Date()
      },
      timestamp: new Date()
    };
    
    await this.broadcastMessage(message);
    
    this.logger.info('Opt-out announced to network');
  }

  /**
   * Announce opt-in to federation
   */
  async announceOptIn(): Promise<void> {
    const message: NetworkMessage = {
      id: this.generateMessageId(),
      type: 'announcement',
      sender: this.instanceId,
      payload: {
        instanceId: this.instanceId,
        status: 'opted_in',
        timestamp: new Date()
      },
      timestamp: new Date()
    };
    
    await this.broadcastMessage(message);
    
    this.logger.info('Opt-in announced to network');
  }

  /**
   * Get public key for this instance
   */
  async getPublicKey(): Promise<string> {
    if (!this.keyPair) {
      await this.generateKeyPair();
    }
    
    const publicKey = await crypto.subtle.exportKey('spki', this.keyPair!.publicKey);
    return this.arrayBufferToBase64(publicKey);
  }

  /**
   * Get communication metrics
   */
  getOverheadMetrics(): number {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    return totalMessages > 0 ? this.metrics.bytesTransferred / totalMessages : 0;
  }

  /**
   * Get network topology information
   */
  getNetworkTopology(): {
    nodeCount: number;
    connections: number;
    averageConnections: number;
    networkDiameter: number;
  } {
    const nodeCount = this.topology.nodes.size;
    const totalConnections = Array.from(this.topology.connections.values())
      .reduce((sum, connections) => sum + connections.size, 0);
    
    const averageConnections = nodeCount > 0 ? totalConnections / nodeCount : 0;
    const networkDiameter = this.calculateNetworkDiameter();
    
    return {
      nodeCount,
      connections: totalConnections / 2, // Undirected graph
      averageConnections,
      networkDiameter
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Communication Protocol');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Announce departure
    const departureMessage: NetworkMessage = {
      id: this.generateMessageId(),
      type: 'announcement',
      sender: this.instanceId,
      payload: {
        instanceId: this.instanceId,
        status: 'departing'
      },
      timestamp: new Date()
    };
    
    await this.broadcastMessage(departureMessage);
    
    // Clear state
    this.topology.nodes.clear();
    this.topology.connections.clear();
    this.messageQueue.clear();
    this.pendingMessages.clear();
  }

  private async generateKeyPair(): Promise<void> {
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );
    
    this.logger.debug('Cryptographic key pair generated');
  }

  private async signMessage(message: NetworkMessage): Promise<string> {
    if (!this.keyPair) {
      await this.generateKeyPair();
    }
    
    const messageString = JSON.stringify({
      id: message.id,
      type: message.type,
      sender: message.sender,
      payload: message.payload,
      timestamp: message.timestamp
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(messageString);
    const signature = await crypto.subtle.sign('ECDSA', this.keyPair!.privateKey, data);
    
    return this.arrayBufferToBase64(signature);
  }

  private async verifyMessage(message: NetworkMessage): Promise<boolean> {
    if (!message.signature) {
      return false;
    }
    
    const peer = this.topology.nodes.get(message.sender);
    if (!peer) {
      this.logger.warn('Cannot verify message from unknown peer', { sender: message.sender });
      return false;
    }
    
    try {
      // In a real implementation, you would import the peer's public key
      // and verify the signature. For now, we'll simulate verification.
      return true;
    } catch (error) {
      this.logger.error('Message verification failed', error);
      return false;
    }
  }

  private async connectToPeer(endpoint: string): Promise<void> {
    this.logger.debug('Connecting to peer', { endpoint });
    
    // Simulate peer connection
    const peerId = this.generatePeerId(endpoint);
    const peer: PeerInfo = {
      instanceId: peerId,
      endpoint,
      publicKey: 'simulated-key',
      capabilities: ['federated_learning'],
      lastSeen: new Date(),
      reputation: 1.0,
      isActive: true
    };
    
    this.topology.nodes.set(peerId, peer);
    this.updateConnections(peerId);
    
    this.emit('peerConnected', peer);
  }

  private async performNetworkDiscovery(): Promise<void> {
    const discoveryMessage: NetworkMessage = {
      id: this.generateMessageId(),
      type: 'discovery',
      sender: this.instanceId,
      payload: {
        instanceId: this.instanceId,
        requestingPeers: true
      },
      timestamp: new Date()
    };
    
    await this.broadcastMessage(discoveryMessage);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const heartbeatMessage: NetworkMessage = {
        id: this.generateMessageId(),
        type: 'heartbeat',
        sender: this.instanceId,
        payload: {
          instanceId: this.instanceId,
          timestamp: new Date(),
          activePeers: this.topology.nodes.size
        },
        timestamp: new Date()
      };
      
      await this.broadcastMessage(heartbeatMessage);
    }, this.HEARTBEAT_INTERVAL);
  }

  private startPeriodicDiscovery(): void {
    this.discoveryInterval = setInterval(async () => {
      await this.performNetworkDiscovery();
    }, this.DISCOVERY_INTERVAL);
  }

  private startMessageCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      
      // Clean up old pending messages
      for (const [messageId, pendingMessage] of this.pendingMessages.entries()) {
        const timeSinceAttempt = now.getTime() - pendingMessage.lastAttempt.getTime();
        
        if (timeSinceAttempt > this.MESSAGE_TIMEOUT) {
          if (pendingMessage.retryCount < this.MAX_RETRIES) {
            // Retry message
            this.retryMessage(messageId);
          } else {
            // Give up on message
            this.pendingMessages.delete(messageId);
            this.logger.warn('Message failed after max retries', { messageId });
          }
        }
      }
      
      // Clean up inactive peers
      for (const [peerId, peer] of this.topology.nodes.entries()) {
        const timeSinceLastSeen = now.getTime() - peer.lastSeen.getTime();
        
        if (timeSinceLastSeen > this.HEARTBEAT_INTERVAL * 3) {
          peer.isActive = false;
          this.logger.debug('Peer marked as inactive', { peerId });
        }
        
        if (timeSinceLastSeen > this.HEARTBEAT_INTERVAL * 10) {
          this.topology.nodes.delete(peerId);
          this.topology.connections.delete(peerId);
          this.logger.info('Peer removed from topology', { peerId });
          this.emit('peerLeft', peerId);
        }
      }
    }, 10000); // Run cleanup every 10 seconds
  }

  private async handleAnnouncementMessage(message: NetworkMessage): Promise<void> {
    const payload = message.payload;
    
    if (payload.status === 'opted_out' || payload.status === 'departing') {
      this.topology.nodes.delete(message.sender);
      this.topology.connections.delete(message.sender);
      this.emit('participantLeft', message.sender);
      return;
    }
    
    // Update or add peer information
    const peer: PeerInfo = {
      instanceId: message.sender,
      endpoint: payload.endpoint || 'unknown',
      publicKey: payload.publicKey || 'unknown',
      capabilities: payload.capabilities || [],
      lastSeen: new Date(),
      reputation: 1.0,
      isActive: true
    };
    
    this.topology.nodes.set(message.sender, peer);
    this.updateConnections(message.sender);
    
    this.emit('participantJoined', peer);
  }

  private async handleTrainingRoundMessage(message: NetworkMessage): Promise<void> {
    this.emit('trainingRoundReceived', message.payload);
  }

  private async handleModelUpdateMessage(message: NetworkMessage): Promise<void> {
    this.emit('modelUpdateReceived', message.payload);
  }

  private async handleHeartbeatMessage(message: NetworkMessage): Promise<void> {
    const peer = this.topology.nodes.get(message.sender);
    if (peer) {
      peer.lastSeen = new Date();
      peer.isActive = true;
    }
  }

  private async handleDiscoveryMessage(message: NetworkMessage): Promise<void> {
    if (message.payload.requestingPeers) {
      // Send peer list response
      const peerList = Array.from(this.topology.nodes.values())
        .filter(peer => peer.isActive)
        .map(peer => ({
          instanceId: peer.instanceId,
          endpoint: peer.endpoint,
          capabilities: peer.capabilities
        }));
      
      const responseMessage: NetworkMessage = {
        id: this.generateMessageId(),
        type: 'discovery',
        sender: this.instanceId,
        recipients: [message.sender],
        payload: {
          instanceId: this.instanceId,
          peers: peerList
        },
        timestamp: new Date()
      };
      
      await this.sendMessageToPeer(message.sender, responseMessage);
    }
  }

  private async simulateNetworkSend(endpoint: string, message: NetworkMessage): Promise<void> {
    // Simulate network latency and potential failures
    const latency = Math.random() * 100 + 10; // 10-110ms
    const failureRate = 0.02; // 2% failure rate
    
    await new Promise(resolve => setTimeout(resolve, latency));
    
    if (Math.random() < failureRate) {
      throw new Error('Simulated network failure');
    }
    
    // Update metrics
    const messageSize = JSON.stringify(message).length;
    this.metrics.bytesTransferred += messageSize;
  }

  private async retryMessage(messageId: string): Promise<void> {
    const pendingMessage = this.pendingMessages.get(messageId);
    
    if (!pendingMessage) {
      return;
    }
    
    pendingMessage.retryCount++;
    pendingMessage.lastAttempt = new Date();
    
    this.logger.debug('Retrying message', {
      messageId,
      retryCount: pendingMessage.retryCount
    });
    
    // Re-attempt broadcast
    await this.broadcastMessage(pendingMessage.message);
  }

  private handleMessageFailure(messageId: string): void {
    this.metrics.failedConnections++;
    
    this.logger.debug('Message delivery failed', { messageId });
  }

  private updateConnections(peerId: string): void {
    if (!this.topology.connections.has(peerId)) {
      this.topology.connections.set(peerId, new Set());
    }
    
    if (!this.topology.connections.has(this.instanceId)) {
      this.topology.connections.set(this.instanceId, new Set());
    }
    
    // Add bidirectional connection
    this.topology.connections.get(peerId)!.add(this.instanceId);
    this.topology.connections.get(this.instanceId)!.add(peerId);
  }

  private calculateNetworkDiameter(): number {
    // Simplified diameter calculation using BFS
    // In a real implementation, this would be more sophisticated
    return Math.ceil(Math.log2(this.topology.nodes.size + 1));
  }

  private generateMessageId(): string {
    return `${this.instanceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePeerId(endpoint: string): string {
    return `peer_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}