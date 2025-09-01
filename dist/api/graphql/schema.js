"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLSchema = createGraphQLSchema;
const schema_1 = require("@graphql-tools/schema");
const requirements_schema_1 = require("../../modules/requirements/graphql/requirements.schema");
const requirements_resolvers_secured_1 = require("../../modules/requirements/graphql/requirements.resolvers.secured");
const requirements_resolvers_optimized_1 = require("../../modules/requirements/graphql/requirements.resolvers.optimized");
const architecture_schema_1 = require("../../modules/architecture/graphql/architecture.schema");
const architecture_resolvers_secured_1 = require("../../modules/architecture/graphql/architecture.resolvers.secured");
const architecture_resolvers_optimized_1 = require("../../modules/architecture/graphql/architecture.resolvers.optimized");
const devops_resolvers_secured_1 = require("../../modules/development/graphql/devops.resolvers.secured");
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
        serialize: (value) => value instanceof Date ? value.toISOString() : value,
        parseValue: (value) => typeof value === 'string' ? new Date(value) : value,
        parseLiteral: (ast) => ast.kind === 'StringValue' ? new Date(ast.value) : null,
    },
    JSON: {
        serialize: (value) => value,
        parseValue: (value) => value,
        parseLiteral: (ast) => {
            try {
                return JSON.parse(ast.value);
            }
            catch {
                return null;
            }
        },
    },
};
async function createGraphQLSchema() {
    const typeDefs = [
        baseTypeDefs,
        requirements_schema_1.requirementsTypeDefs,
        architecture_schema_1.architectureTypeDefs,
        // developmentTypeDefs,
    ];
    // Use optimized resolvers when DataLoaders are available
    const useOptimizedResolvers = process.env.USE_OPTIMIZED_RESOLVERS !== 'false';
    const resolvers = [
        baseResolvers,
        useOptimizedResolvers ? requirements_resolvers_optimized_1.optimizedRequirementsResolvers : requirements_resolvers_secured_1.requirementsResolvers,
        useOptimizedResolvers ? architecture_resolvers_optimized_1.optimizedArchitectureResolvers : architecture_resolvers_secured_1.architectureResolvers,
        devops_resolvers_secured_1.devOpsResolvers,
    ];
    return (0, schema_1.makeExecutableSchema)({
        typeDefs,
        resolvers,
    });
}
//# sourceMappingURL=schema.js.map