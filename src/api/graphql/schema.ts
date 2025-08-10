import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { requirementsTypeDefs } from '../../modules/requirements/graphql/requirements.schema';
import { requirementsResolvers } from '../../modules/requirements/graphql/requirements.resolvers';

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
};

export async function createGraphQLSchema(): Promise<GraphQLSchema> {
  const typeDefs = [
    baseTypeDefs,
    requirementsTypeDefs,
    // architectureTypeDefs,
    // developmentTypeDefs,
  ];

  const resolvers = [
    baseResolvers,
    requirementsResolvers,
    // architectureResolvers,
    // developmentResolvers,
  ];

  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}