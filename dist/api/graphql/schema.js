"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLSchema = createGraphQLSchema;
const schema_1 = require("@graphql-tools/schema");
const requirements_schema_1 = require("../../modules/requirements/graphql/requirements.schema");
const requirements_resolvers_1 = require("../../modules/requirements/graphql/requirements.resolvers");
const architecture_schema_1 = require("../../modules/architecture/graphql/architecture.schema");
const architecture_resolvers_1 = require("../../modules/architecture/graphql/architecture.resolvers");
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
    const resolvers = [
        baseResolvers,
        requirements_resolvers_1.requirementsResolvers,
        architecture_resolvers_1.architectureResolvers,
        // developmentResolvers,
    ];
    return (0, schema_1.makeExecutableSchema)({
        typeDefs,
        resolvers,
    });
}
//# sourceMappingURL=schema.js.map