import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { requirementsTypeDefs } from '../../modules/requirements/graphql/requirements.schema';
import { requirementsResolvers } from '../../modules/requirements/graphql/requirements.resolvers';
import { architectureTypeDefs } from '../../modules/architecture/graphql/architecture.schema';
import { architectureResolvers } from '../../modules/architecture/graphql/architecture.resolvers';

const baseTypeDefs = `
  type Query {
    health: String!
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }

  scalar Date
  scalar JSON
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

  const resolvers = [
    baseResolvers,
    requirementsResolvers,
    architectureResolvers,
    // developmentResolvers,
  ];

  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}