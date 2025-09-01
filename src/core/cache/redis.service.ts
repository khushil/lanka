/**
 * Redis Connection Service
 * High-performance Redis client with cluster support, failover, and connection pooling
 */

import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';
import { logger } from '../logging/logger';
import { loadEnvironmentConfig } from '../config/environment';

export interface RedisConfig extends RedisOptions {
  cluster?: {
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
    lazyConnect: boolean;
  };
}

export class RedisService {
  private client: Redis | Cluster;
  private subscriber: Redis | Cluster;
  private static instance: RedisService;
  private readonly config: RedisConfig;
  private connectionRetries = 0;
  private readonly maxRetries = 5;

  private constructor() {
    const envConfig = loadEnvironmentConfig();
    
    this.config = {
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      cluster: {
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        lazyConnect: true
      }
    };

    this.initializeConnections(envConfig.redis);
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private async initializeConnections(redisConfig: { url: string; password?: string }): Promise<void> {
    try {
      // Parse Redis URL to determine if cluster mode
      const url = new URL(redisConfig.url);
      const isCluster = url.searchParams.get('cluster') === 'true';

      if (isCluster) {
        await this.initializeCluster(redisConfig);
      } else {
        await this.initializeSingle(redisConfig);
      }

      // Initialize subscriber connection
      await this.initializeSubscriber(redisConfig);

      // Setup event handlers
      this.setupEventHandlers();

      logger.info('Redis service initialized successfully', {
        mode: isCluster ? 'cluster' : 'single',
        url: redisConfig.url.replace(/\/\/.*@/, '//***@') // Hide credentials
      });

    } catch (error) {
      logger.error('Failed to initialize Redis service', error);
      await this.handleConnectionFailure();
    }
  }

  private async initializeSingle(redisConfig: { url: string; password?: string }): Promise<void> {
    this.client = new Redis(redisConfig.url, {
      ...this.config,
      password: redisConfig.password,
      db: 0,
      keyPrefix: 'lanka:',
      enableAutoPipelining: true,
      family: 4,
      keepAlive: 30000
    });

    await this.client.connect();
  }

  private async initializeCluster(redisConfig: { url: string; password?: string }): Promise<void> {
    const url = new URL(redisConfig.url);
    const hosts = url.searchParams.get('hosts')?.split(',') || [url.host];
    
    const clusterNodes = hosts.map(host => {
      const [hostname, port] = host.split(':');
      return {
        host: hostname,
        port: parseInt(port) || 6379
      };
    });

    const clusterOptions: ClusterOptions = {
      ...this.config.cluster!,
      redisOptions: {
        password: redisConfig.password,
        db: 0,
        keyPrefix: 'lanka:',
        family: 4,
        keepAlive: 30000
      }
    };

    this.client = new Redis.Cluster(clusterNodes, clusterOptions);
    await this.client.connect();
  }

  private async initializeSubscriber(redisConfig: { url: string; password?: string }): Promise<void> {
    // Create separate connection for pub/sub operations
    const isCluster = this.client instanceof Cluster;
    
    if (isCluster) {
      const clusterNodes = (this.client as Cluster).nodes('master');
      this.subscriber = new Redis.Cluster(clusterNodes, {
        ...this.config.cluster!,
        redisOptions: {
          password: redisConfig.password,
          db: 0,
          family: 4
        }
      });
    } else {
      this.subscriber = new Redis(redisConfig.url, {
        ...this.config,
        password: redisConfig.password,
        db: 0,
        family: 4
      });
    }

    await this.subscriber.connect();
  }

  private setupEventHandlers(): void {
    // Main client events
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connectionRetries = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', error);
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', (delay) => {
      logger.info(`Redis client reconnecting in ${delay}ms`);
    });

    // Subscriber events
    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', error);
    });

    // Handle cluster events if applicable
    if (this.client instanceof Cluster) {
      this.client.on('node error', (error, node) => {
        logger.error(`Redis cluster node error on ${node.options.host}:${node.options.port}`, error);
      });

      this.client.on('+node', (node) => {
        logger.info(`Redis cluster node added: ${node.options.host}:${node.options.port}`);
      });

      this.client.on('-node', (node) => {
        logger.warn(`Redis cluster node removed: ${node.options.host}:${node.options.port}`);
      });
    }
  }

  private async handleConnectionFailure(): Promise<void> {
    this.connectionRetries++;
    
    if (this.connectionRetries >= this.maxRetries) {
      logger.error('Redis connection failed after maximum retries');
      throw new Error('Redis connection failed - maximum retries exceeded');
    }

    const retryDelay = Math.pow(2, this.connectionRetries) * 1000; // Exponential backoff
    logger.info(`Retrying Redis connection in ${retryDelay}ms (attempt ${this.connectionRetries}/${this.maxRetries})`);
    
    setTimeout(() => {
      this.initializeConnections(loadEnvironmentConfig().redis);
    }, retryDelay);
  }

  // Core Redis operations with error handling
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET failed for key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET failed for key: ${key}`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis DEL failed for key: ${key}`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS failed for key: ${key}`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXPIRE failed for key: ${key}`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL failed for key: ${key}`, error);
      return -2; // Key does not exist
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mget(...keys);
    } catch (error) {
      logger.error('Redis MGET failed', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValues: Record<string, string>, ttlSeconds?: number): Promise<boolean> {
    try {
      const pipeline = this.client.pipeline();
      
      Object.entries(keyValues).forEach(([key, value]) => {
        if (ttlSeconds) {
          pipeline.setex(key, ttlSeconds, value);
        } else {
          pipeline.set(key, value);
        }
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Redis MSET failed', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS failed for pattern: ${pattern}`, error);
      return [];
    }
  }

  async scan(cursor: string = '0', pattern?: string, count?: number): Promise<[string, string[]]> {
    try {
      const args: (string | number)[] = [cursor];
      if (pattern) {
        args.push('MATCH', pattern);
      }
      if (count) {
        args.push('COUNT', count);
      }
      return await this.client.scan(...args);
    } catch (error) {
      logger.error('Redis SCAN failed', error);
      return ['0', []];
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      logger.error(`Redis PUBLISH failed for channel: ${channel}`, error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (channel: string, message: string) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', callback);
    } catch (error) {
      logger.error(`Redis SUBSCRIBE failed for channel: ${channel}`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
    } catch (error) {
      logger.error(`Redis UNSUBSCRIBE failed for channel: ${channel}`, error);
    }
  }

  // Advanced operations
  async pipeline(): Promise<any> {
    return this.client.pipeline();
  }

  async multi(): Promise<any> {
    return this.client.multi();
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING failed', error);
      return false;
    }
  }

  async getInfo(): Promise<Record<string, string>> {
    try {
      const info = await this.client.info();
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};
      
      lines.forEach(line => {
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          result[key] = value;
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Redis INFO failed', error);
      return {};
    }
  }

  async getMemoryUsage(): Promise<{ used: number; peak: number; fragmentation: number }> {
    try {
      const info = await this.getInfo();
      return {
        used: parseInt(info.used_memory || '0'),
        peak: parseInt(info.used_memory_peak || '0'),
        fragmentation: parseFloat(info.mem_fragmentation_ratio || '1.0')
      };
    } catch (error) {
      logger.error('Redis memory usage check failed', error);
      return { used: 0, peak: 0, fragmentation: 1.0 };
    }
  }

  // Connection management
  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.disconnect(),
        this.subscriber.disconnect()
      ]);
      logger.info('Redis service disconnected');
    } catch (error) {
      logger.error('Redis disconnect failed', error);
    }
  }

  // Getters for advanced usage
  get rawClient(): Redis | Cluster {
    return this.client;
  }

  get rawSubscriber(): Redis | Cluster {
    return this.subscriber;
  }

  get isCluster(): boolean {
    return this.client instanceof Cluster;
  }
}