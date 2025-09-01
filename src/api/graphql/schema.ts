import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { requirementsTypeDefs } from '../../modules/requirements/graphql/requirements.schema';
import { requirementsResolvers } from '../../modules/requirements/graphql/requirements.resolvers.secured';
import { optimizedRequirementsResolvers } from '../../modules/requirements/graphql/requirements.resolvers.optimized';
import { architectureTypeDefs } from '../../modules/architecture/graphql/architecture.schema';
import { architectureResolvers } from '../../modules/architecture/graphql/architecture.resolvers.secured';
import { optimizedArchitectureResolvers } from '../../modules/architecture/graphql/architecture.resolvers.optimized';
import { devOpsResolvers } from '../../modules/development/graphql/devops.resolvers.secured';

const baseTypeDefs = `
  type Query {
    health: String!
    dataLoaderMetrics: DataLoaderMetrics
  }

  type Mutation {
    _empty: String
    clearDataLoaderCaches(pattern: String): CacheOperationResult
  }

  type Subscription {
    _empty: String
  }

  scalar Date
  scalar JSON

  type DataLoaderMetrics {
    metrics: JSON!
    report: JSON!
    timestamp: String!
  }

  type CacheOperationResult {
    success: Boolean!
    message: String!
    timestamp: String!
  }
`;

const baseResolvers = {
  Query: {
    health: () => 'LANKA GraphQL API is healthy',
  },
  // Custom scalar resolvers
  Date: {
    serialize: (value: any) => value instanceof Date ? value.toISOString() : value,
    parseValue: (value: any) => typeof value === 'string' ? new Date(value) : value,
    parseLiteral: (ast: any) => ast.kind === 'StringValue' ? new Date(ast.value) : null,
  },
  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
      try {
        return JSON.parse(ast.value);
      } catch {
        return null;
      }
    },
  },
};

export async function createGraphQLSchema(): Promise<GraphQLSchema> {
  const typeDefs = [
    baseTypeDefs,
    requirementsTypeDefs,
    architectureTypeDefs,
    // developmentTypeDefs,
  ];

  // Use optimized resolvers when DataLoaders are available
  const useOptimizedResolvers = process.env.USE_OPTIMIZED_RESOLVERS !== 'false';
  
  const resolvers = [
    baseResolvers,
    useOptimizedResolvers ? optimizedRequirementsResolvers : requirementsResolvers,
    useOptimizedResolvers ? optimizedArchitectureResolvers : architectureResolvers,
    devOpsResolvers,
  ];

  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}