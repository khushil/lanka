/**
 * GraphQL Error Middleware for Lanka Platform
 * Handles GraphQL errors with consistent formatting
 */

import {
  GraphQLError,
  GraphQLFormattedError,
  ValidationContext,
  FieldNode,
  FragmentDefinitionNode
} from 'graphql';
import {
  LankaError,
  ErrorWrapper,
  ErrorResponseFormatter,
  globalErrorHandler,
  errorMetricsCollector,
  ErrorCode,
  ErrorSeverity
} from '../errors';

export interface GraphQLErrorMiddlewareOptions {
  includeStack?: boolean;
  includeContext?: boolean;
  enableMetrics?: boolean;
  enableDepthLimiting?: boolean;
  maxDepth?: number;
  enableComplexityAnalysis?: boolean;
  maxComplexity?: number;
  enableQueryTimeout?: boolean;
  queryTimeoutMs?: number;
}

/**
 * GraphQL error formatter
 */
export const formatGraphQLError = (options: GraphQLErrorMiddlewareOptions = {}) => {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    includeContext = process.env.NODE_ENV === 'development',
    enableMetrics = true
  } = options;

  return (error: GraphQLError, request?: any): GraphQLFormattedError => {
    // Wrap original error if it's not already a LankaError
    const lankaError = error.originalError instanceof LankaError
      ? error.originalError
      : ErrorWrapper.wrap(error.originalError || error, {
          operation: 'graphql_operation',
          userId: request?.user?.id,
          sessionId: request?.sessionId,
          requestId: request?.headers?.['x-request-id'],
          metadata: {
            query: request?.query,
            variables: request?.variables,
            operationName: request?.operationName,
            path: error.path,
            locations: error.locations
          }
        });

    // Record metrics
    if (enableMetrics) {
      errorMetricsCollector.recordError(lankaError);
    }

    // Handle through global error handler
    globalErrorHandler.handleError(lankaError);

    // Create formatted error response
    return ErrorResponseFormatter.createGraphQLErrorResponse(
      lankaError,
      error.path,
      {
        includeStack,
        includeContext,
        includeTimestamp: true,
        includeSuggestions: true
      }
    );
  };
};

/**
 * GraphQL query depth limiter
 */
export const createDepthLimitRule = (maxDepth: number = 10) => {
  return (context: ValidationContext) => {
    const depths: Record<string, number> = {};
    
    return {
      Field: {
        enter(node: FieldNode, key: any, parent: any, path: any) {
          const fieldName = node.name.value;
          const currentDepth = path.length / 2; // GraphQL AST path includes both fields and selections
          
          if (currentDepth > maxDepth) {
            throw ErrorWrapper.validation(
              ErrorCode.INVALID_INPUT,
              `Query depth limit exceeded. Maximum depth: ${maxDepth}, current: ${currentDepth}`,
              {
                fieldErrors: {
                  [fieldName]: [`Exceeds maximum query depth of ${maxDepth}`]
                },
                metadata: {
                  maxDepth,
                  currentDepth,
                  fieldName,
                  path: path.map((p: any) => p.name?.value || p).join('.')
                }
              }
            );
          }
        }
      }
    };
  };
};

/**
 * GraphQL query complexity analyzer
 */
export const createComplexityLimitRule = (maxComplexity: number = 1000) => {
  return (context: ValidationContext) => {
    let complexity = 0;
    const scalarCost = 1;
    const objectCost = 2;
    const listMultiplier = 10;

    return {
      Field: {
        enter(node: FieldNode) {
          const fieldName = node.name.value;
          
          // Basic complexity calculation
          complexity += scalarCost;
          
          // Increase complexity for selections (nested fields)
          if (node.selectionSet) {
            complexity += objectCost;
            
            // Additional cost for list fields (heuristic based on field name)
            if (fieldName.endsWith('s') || fieldName.includes('list')) {
              complexity += listMultiplier;
            }
          }
          
          if (complexity > maxComplexity) {
            throw ErrorWrapper.validation(
              ErrorCode.INVALID_INPUT,
              `Query complexity limit exceeded. Maximum: ${maxComplexity}, current: ${complexity}`,
              {
                fieldErrors: {
                  [fieldName]: [`Query too complex. Current: ${complexity}, max: ${maxComplexity}`]
                },
                metadata: {
                  maxComplexity,
                  currentComplexity: complexity,
                  fieldName
                }
              }
            );
          }
        }
      },
      
      // Reset complexity for fragments
      FragmentDefinition: {
        enter(node: FragmentDefinitionNode) {
          complexity = 0; // Reset for fragment analysis
        }
      }
    };
  };
};

/**
 * GraphQL operation timeout middleware
 */
export const createTimeoutRule = (timeoutMs: number = 30000) => {
  return (context: ValidationContext) => {
    const startTime = Date.now();
    
    return {
      Document: {
        leave() {
          const elapsed = Date.now() - startTime;
          if (elapsed > timeoutMs) {
            throw ErrorWrapper.technical(
              ErrorCode.TIMEOUT_ERROR,
              `GraphQL operation timeout after ${elapsed}ms`,
              {
                operation: 'graphql_validation',
                retryable: false,
                severity: ErrorSeverity.MEDIUM,
                metadata: {
                  timeoutMs,
                  elapsed
                }
              }
            );
          }
        }
      }
    };
  };
};

/**
 * GraphQL authentication middleware
 */
export const createAuthenticationDirective = () => {
  return {
    typeDefs: `
      directive @auth(requires: [String]) on FIELD_DEFINITION
      directive @rateLimit(max: Int = 100, window: Int = 900) on FIELD_DEFINITION
    `,
    
    schemaTransforms: (schema: any) => {
      // This would implement schema transformation for auth directives
      // For now, it's a placeholder for the concept
      return schema;
    }
  };
};

/**
 * Field-level error handler
 */
export const createFieldErrorHandler = (fieldName: string) => {
  return async (resolve: any, root: any, args: any, context: any, info: any) => {
    try {
      const result = await resolve(root, args, context, info);
      return result;
    } catch (error) {
      const lankaError = ErrorWrapper.wrap(error, {
        operation: `graphql_field_${fieldName}`,
        userId: context.user?.id,
        metadata: {
          fieldName,
          args,
          parentType: info.parentType.name,
          path: info.path
        }
      });
      
      throw new GraphQLError(
        lankaError.userMessage || lankaError.message,
        {
          originalError: lankaError,
          path: info.path,
          locations: info.fieldNodes?.[0]?.loc ? [info.fieldNodes[0].loc] : undefined,
          extensions: {
            code: lankaError.code,
            category: lankaError.category,
            severity: lankaError.severity
          }
        }
      );
    }
  };
};

/**
 * GraphQL request logging middleware
 */
export const createRequestLoggerPlugin = () => {
  return {
    requestDidStart() {
      return {
        didResolveOperation(requestContext: any) {
          console.log(`GraphQL Operation: ${requestContext.request.operationName || 'Anonymous'}`);
        },
        
        didEncounterErrors(requestContext: any) {
          console.error('GraphQL Errors:', requestContext.errors);
        },
        
        willSendResponse(requestContext: any) {
          const duration = Date.now() - requestContext.request.startTime;
          console.log(`GraphQL Response sent (${duration}ms)`);
        }
      };
    }
  };
};

/**
 * GraphQL rate limiting plugin
 */
export const createRateLimitPlugin = (options: {
  defaultMax?: number;
  defaultWindow?: number;
} = {}) => {
  const { defaultMax = 100, defaultWindow = 900 } = options;
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return {
    requestDidStart() {
      return {
        didResolveOperation(requestContext: any) {
          const userId = requestContext.request.http?.body?.userId || 
                        requestContext.contextValue?.user?.id || 
                        'anonymous';
          
          const operationName = requestContext.request.operationName || 'anonymous';
          const key = `${userId}:${operationName}`;
          const now = Date.now();
          
          // Clean expired entries
          for (const [k, v] of requestCounts.entries()) {
            if (now > v.resetTime) {
              requestCounts.delete(k);
            }
          }
          
          // Check rate limit
          let record = requestCounts.get(key);
          if (!record) {
            record = { count: 0, resetTime: now + (defaultWindow * 1000) };
            requestCounts.set(key, record);
          }
          
          if (record.count >= defaultMax) {
            throw ErrorWrapper.rateLimit(
              ErrorCode.RATE_LIMIT_EXCEEDED,
              `Rate limit exceeded for operation ${operationName}`,
              {
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
                metadata: {
                  operationName,
                  userId,
                  limit: defaultMax,
                  window: defaultWindow
                }
              }
            );
          }
          
          record.count++;
        }
      };
    }
  };
};

/**
 * GraphQL caching plugin
 */
export const createCachePlugin = () => {
  const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  return {
    requestDidStart() {
      return {
        willSendResponse(requestContext: any) {
          // Simple caching logic for GET queries
          if (requestContext.request.http?.method === 'GET') {
            const cacheKey = JSON.stringify({
              query: requestContext.request.query,
              variables: requestContext.request.variables
            });
            
            if (!requestContext.errors || requestContext.errors.length === 0) {
              cache.set(cacheKey, {
                data: requestContext.response.data,
                timestamp: Date.now(),
                ttl: 300000 // 5 minutes
              });
            }
          }
        }
      };
    }
  };
};

/**
 * Comprehensive GraphQL middleware setup
 */
export const setupGraphQLMiddleware = (options: GraphQLErrorMiddlewareOptions = {}) => {
  const {
    enableDepthLimiting = true,
    maxDepth = 10,
    enableComplexityAnalysis = true,
    maxComplexity = 1000,
    enableQueryTimeout = true,
    queryTimeoutMs = 30000
  } = options;

  const validationRules: any[] = [];
  
  if (enableDepthLimiting) {
    validationRules.push(createDepthLimitRule(maxDepth));
  }
  
  if (enableComplexityAnalysis) {
    validationRules.push(createComplexityLimitRule(maxComplexity));
  }
  
  if (enableQueryTimeout) {
    validationRules.push(createTimeoutRule(queryTimeoutMs));
  }

  const plugins = [
    createRequestLoggerPlugin(),
    createRateLimitPlugin(),
    createCachePlugin()
  ];

  return {
    validationRules,
    plugins,
    formatError: formatGraphQLError(options),
    introspection: process.env.NODE_ENV === 'development',
    playground: process.env.NODE_ENV === 'development'
  };
};

/**
 * Schema stitching error handler
 */
export const createStitchingErrorHandler = () => {
  return (error: any) => {
    if (error.networkError) {
      return ErrorWrapper.externalService(
        ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        'GraphQL Service',
        error.networkError.message,
        {
          metadata: {
            service: error.source?.name || 'unknown',
            networkError: error.networkError
          }
        }
      );
    }
    
    return ErrorWrapper.wrap(error);
  };
};

// Export commonly used combinations
export const defaultGraphQLErrorSetup = setupGraphQLMiddleware({
  enableDepthLimiting: true,
  maxDepth: 15,
  enableComplexityAnalysis: true,
  maxComplexity: 2000,
  enableQueryTimeout: true,
  queryTimeoutMs: 45000,
  includeStack: process.env.NODE_ENV === 'development',
  enableMetrics: true
});

export const productionGraphQLErrorSetup = setupGraphQLMiddleware({
  enableDepthLimiting: true,
  maxDepth: 10,
  enableComplexityAnalysis: true,
  maxComplexity: 1000,
  enableQueryTimeout: true,
  queryTimeoutMs: 30000,
  includeStack: false,
  includeContext: false,
  enableMetrics: true
});