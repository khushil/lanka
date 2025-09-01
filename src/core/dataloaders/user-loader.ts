import { BaseDataLoader } from './base-loader';
import { DataLoaderContext, LoaderOptions, User } from './types';
import { logger } from '../logging/logger';

/**
 * DataLoader for batching user queries
 * Handles user authentication and profile data loading
 */
export class UserDataLoader extends BaseDataLoader<string, User | null> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('user', context, async (ids: readonly string[]) => {
      return this.batchLoadUsers(ids);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 100,
      cache: {
        enabled: true,
        ttl: 900000, // 15 minutes (user data can be cached longer)
        ...options.cache
      }
    });
  }

  /**
   * Batch load users by IDs
   */
  private async batchLoadUsers(ids: readonly string[]): Promise<(User | null | Error)[]> {
    if (ids.length === 0) return [];

    try {
      const query = `
        MATCH (u:User)
        WHERE u.id IN $ids
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(p:Permission)
        OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
        RETURN u, 
               collect(DISTINCT r.name) as roles,
               collect(DISTINCT p.name) as permissions,
               collect(DISTINCT t) as teams
      `;

      const results = await this.context.neo4j.executeQuery(query, { ids: Array.from(ids) });
      
      // Create a map for efficient lookup
      const userMap = new Map<string, User>();
      
      results.forEach((record: any) => {
        const user = this.mapNodeToUser(record.u);
        if (user) {
          // Add roles and permissions
          user.roles = record.roles || [];
          user.permissions = record.permissions || [];
          
          // Add team information
          if (record.teams && record.teams.length > 0) {
            user.teams = record.teams.map((team: any) => team.properties);
          }
          
          userMap.set(user.id, user);
        }
      });

      // Return results in the same order as requested IDs
      return ids.map(id => userMap.get(id) || null);

    } catch (error) {
      logger.error('Failed to batch load users', {
        error: error.message,
        idCount: ids.length,
        sampleIds: ids.slice(0, 5)
      });
      
      return ids.map(() => error);
    }
  }

  /**
   * Map Neo4j node to User object
   */
  private mapNodeToUser(node: any): User | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      username: node.properties.username,
      email: node.properties.email,
      roles: [], // Will be populated by the query
      permissions: [], // Will be populated by the query
      isActive: node.properties.isActive !== false,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      firstName: node.properties.firstName,
      lastName: node.properties.lastName,
      avatar: node.properties.avatar,
      lastLoginAt: node.properties.lastLoginAt,
      ...node.properties
    };
  }

  /**
   * Load user by username (alternative to ID-based loading)
   */
  async loadByUsername(username: string): Promise<User | null> {
    try {
      const query = `
        MATCH (u:User {username: $username})
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(p:Permission)
        RETURN u, 
               collect(DISTINCT r.name) as roles,
               collect(DISTINCT p.name) as permissions
        LIMIT 1
      `;

      const results = await this.context.neo4j.executeQuery(query, { username });
      
      if (results.length === 0) return null;

      const record = results[0];
      const user = this.mapNodeToUser(record.u);
      
      if (user) {
        user.roles = record.roles || [];
        user.permissions = record.permissions || [];
        
        // Prime the cache with the user data
        this.prime(user.id, user);
      }
      
      return user;

    } catch (error) {
      logger.error('Failed to load user by username', {
        username,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Load user by email
   */
  async loadByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        MATCH (u:User {email: $email})
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(p:Permission)
        RETURN u, 
               collect(DISTINCT r.name) as roles,
               collect(DISTINCT p.name) as permissions
        LIMIT 1
      `;

      const results = await this.context.neo4j.executeQuery(query, { email });
      
      if (results.length === 0) return null;

      const record = results[0];
      const user = this.mapNodeToUser(record.u);
      
      if (user) {
        user.roles = record.roles || [];
        user.permissions = record.permissions || [];
        
        // Prime the cache with the user data
        this.prime(user.id, user);
      }
      
      return user;

    } catch (error) {
      logger.error('Failed to load user by email', {
        email,
        error: error.message
      });
      return null;
    }
  }
}

/**
 * DataLoader for loading users by role
 */
export class UsersByRoleDataLoader extends BaseDataLoader<string, User[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('usersByRole', context, async (roles: readonly string[]) => {
      return this.batchLoadUsersByRole(roles);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 20,
      cache: {
        enabled: true,
        ttl: 600000, // 10 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load users by role
   */
  private async batchLoadUsersByRole(roles: readonly string[]): Promise<(User[] | Error)[]> {
    if (roles.length === 0) return [];

    try {
      const query = `
        MATCH (r:Role)-[:GRANTED_TO]-(u:User)
        WHERE r.name IN $roles
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(allRoles:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(p:Permission)
        RETURN r.name as roleName, 
               collect(DISTINCT {
                 user: u,
                 roles: collect(DISTINCT allRoles.name),
                 permissions: collect(DISTINCT p.name)
               }) as users
      `;

      const results = await this.context.neo4j.executeQuery(query, { roles: Array.from(roles) });
      
      // Create a map for efficient lookup
      const roleUsersMap = new Map<string, User[]>();
      
      results.forEach((record: any) => {
        const users = record.users.map((userRecord: any) => {
          const user = this.mapNodeToUser(userRecord.user);
          if (user) {
            user.roles = userRecord.roles || [];
            user.permissions = userRecord.permissions || [];
          }
          return user;
        }).filter(Boolean) as User[];
        
        roleUsersMap.set(record.roleName, users);
      });

      // Return results in the same order as requested roles
      return roles.map(role => roleUsersMap.get(role) || []);

    } catch (error) {
      logger.error('Failed to batch load users by role', {
        error: error.message,
        roleCount: roles.length,
        sampleRoles: roles.slice(0, 5)
      });
      
      return roles.map(() => error);
    }
  }

  /**
   * Map Neo4j node to User object
   */
  private mapNodeToUser(node: any): User | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      username: node.properties.username,
      email: node.properties.email,
      roles: [],
      permissions: [],
      isActive: node.properties.isActive !== false,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      firstName: node.properties.firstName,
      lastName: node.properties.lastName,
      avatar: node.properties.avatar,
      lastLoginAt: node.properties.lastLoginAt,
      ...node.properties
    };
  }
}

/**
 * DataLoader for loading users by team
 */
export class UsersByTeamDataLoader extends BaseDataLoader<string, User[]> {
  constructor(context: DataLoaderContext, options: LoaderOptions = {}) {
    super('usersByTeam', context, async (teamIds: readonly string[]) => {
      return this.batchLoadUsersByTeam(teamIds);
    }, {
      ...options,
      maxBatchSize: options.maxBatchSize || 50,
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        ...options.cache
      }
    });
  }

  /**
   * Batch load users by team IDs
   */
  private async batchLoadUsersByTeam(teamIds: readonly string[]): Promise<(User[] | Error)[]> {
    if (teamIds.length === 0) return [];

    try {
      const query = `
        MATCH (t:Team)-[:HAS_MEMBER]->(u:User)
        WHERE t.id IN $teamIds
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(p:Permission)
        RETURN t.id as teamId, 
               collect(DISTINCT {
                 user: u,
                 roles: collect(DISTINCT r.name),
                 permissions: collect(DISTINCT p.name)
               }) as users
      `;

      const results = await this.context.neo4j.executeQuery(query, { teamIds: Array.from(teamIds) });
      
      // Create a map for efficient lookup
      const teamUsersMap = new Map<string, User[]>();
      
      results.forEach((record: any) => {
        const users = record.users.map((userRecord: any) => {
          const user = this.mapNodeToUser(userRecord.user);
          if (user) {
            user.roles = userRecord.roles || [];
            user.permissions = userRecord.permissions || [];
          }
          return user;
        }).filter(Boolean) as User[];
        
        teamUsersMap.set(record.teamId, users);
      });

      // Return results in the same order as requested team IDs
      return teamIds.map(teamId => teamUsersMap.get(teamId) || []);

    } catch (error) {
      logger.error('Failed to batch load users by team', {
        error: error.message,
        teamIdCount: teamIds.length,
        sampleTeamIds: teamIds.slice(0, 5)
      });
      
      return teamIds.map(() => error);
    }
  }

  /**
   * Map Neo4j node to User object
   */
  private mapNodeToUser(node: any): User | null {
    if (!node || !node.properties) return null;
    
    return {
      id: node.properties.id,
      username: node.properties.username,
      email: node.properties.email,
      roles: [],
      permissions: [],
      isActive: node.properties.isActive !== false,
      createdAt: node.properties.createdAt,
      updatedAt: node.properties.updatedAt,
      firstName: node.properties.firstName,
      lastName: node.properties.lastName,
      avatar: node.properties.avatar,
      lastLoginAt: node.properties.lastLoginAt,
      ...node.properties
    };
  }
}