import { useState, useEffect, useCallback } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import {
  GET_ARCHITECTURE_PATTERNS,
  GET_TECHNOLOGY_STACKS,
  GET_CLOUD_RECOMMENDATIONS,
  GET_ARCHITECTURE_DECISIONS,
  ArchitecturePattern,
  TechnologyStack,
  CloudRecommendation,
  ArchitectureDecision
} from '../graphql/architecture';

interface UseArchitectureDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  category?: string;
}

interface ArchitectureDataState {
  patterns: ArchitecturePattern[];
  stacks: TechnologyStack[];
  cloudRecommendations: CloudRecommendation[];
  decisions: ArchitectureDecision[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useArchitectureData = (options: UseArchitectureDataOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    category
  } = options;

  const [state, setState] = useState<ArchitectureDataState>({
    patterns: [],
    stacks: [],
    cloudRecommendations: [],
    decisions: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  // GraphQL queries
  const {
    data: patternsData,
    loading: patternsLoading,
    error: patternsError,
    refetch: refetchPatterns
  } = useQuery(GET_ARCHITECTURE_PATTERNS, {
    variables: { category },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true
  });

  const {
    data: stacksData,
    loading: stacksLoading,
    error: stacksError,
    refetch: refetchStacks
  } = useQuery(GET_TECHNOLOGY_STACKS, {
    variables: {
      requirements: {
        type: 'web',
        scalability: 'high',
        budget: 'medium'
      }
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true
  });

  const {
    data: decisionsData,
    loading: decisionsLoading,
    error: decisionsError,
    refetch: refetchDecisions
  } = useQuery(GET_ARCHITECTURE_DECISIONS, {
    variables: { projectId: '1' }, // This would come from context
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true
  });

  const [
    getCloudRecommendations,
    {
      data: cloudData,
      loading: cloudLoading,
      error: cloudError
    }
  ] = useLazyQuery(GET_CLOUD_RECOMMENDATIONS, {
    errorPolicy: 'all'
  });

  // Fetch cloud recommendations when we have architecture patterns
  useEffect(() => {
    if (patternsData?.architecturePatterns?.length) {
      const firstPattern = patternsData.architecturePatterns[0];
      getCloudRecommendations({
        variables: {
          architecture: {
            patterns: [firstPattern.id],
            requirements: {
              scalability: 'high',
              availability: 'high',
              security: 'medium'
            }
          },
          requirements: {
            budget: 'medium',
            region: 'us-east-1',
            compliance: []
          }
        }
      });
    }
  }, [patternsData, getCloudRecommendations]);

  // Update state when data changes
  useEffect(() => {
    const isLoading = patternsLoading || stacksLoading || decisionsLoading || cloudLoading;
    const hasError = patternsError || stacksError || decisionsError || cloudError;
    
    setState(prev => ({
      patterns: patternsData?.architecturePatterns || prev.patterns,
      stacks: stacksData?.technologyStacks || prev.stacks,
      cloudRecommendations: cloudData?.cloudRecommendations || prev.cloudRecommendations,
      decisions: decisionsData?.architectureDecisions || prev.decisions,
      loading: isLoading,
      error: hasError ? getErrorMessage(hasError) : null,
      lastUpdated: !isLoading && !hasError ? new Date() : prev.lastUpdated
    }));
  }, [
    patternsData,
    stacksData,
    cloudData,
    decisionsData,
    patternsLoading,
    stacksLoading,
    cloudLoading,
    decisionsLoading,
    patternsError,
    stacksError,
    cloudError,
    decisionsError
  ]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        refetchPatterns(),
        refetchStacks(),
        refetchDecisions()
      ]);
      
      // Refetch cloud recommendations if patterns exist
      if (state.patterns.length > 0) {
        const firstPattern = state.patterns[0];
        await getCloudRecommendations({
          variables: {
            architecture: {
              patterns: [firstPattern.id],
              requirements: {
                scalability: 'high',
                availability: 'high',
                security: 'medium'
              }
            },
            requirements: {
              budget: 'medium',
              region: 'us-east-1',
              compliance: []
            }
          }
        });
      }
    } catch (error) {
      console.error('Error refreshing architecture data:', error);
    }
  }, [refetchPatterns, refetchStacks, refetchDecisions, getCloudRecommendations, state.patterns]);

  // Get patterns by category
  const getPatternsByCategory = useCallback((cat: string) => {
    return state.patterns.filter(pattern => pattern.category === cat);
  }, [state.patterns]);

  // Get recommended patterns based on criteria
  const getRecommendedPatterns = useCallback((criteria: {
    scalability?: number;
    performance?: number;
    complexity?: number;
  }) => {
    return state.patterns
      .filter(pattern => {
        if (criteria.scalability && pattern.metrics.scalability < criteria.scalability) return false;
        if (criteria.performance && pattern.metrics.performance < criteria.performance) return false;
        if (criteria.complexity && pattern.complexity > criteria.complexity) return false;
        return true;
      })
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, 5);
  }, [state.patterns]);

  // Get cost analysis
  const getCostAnalysis = useCallback(() => {
    if (!state.cloudRecommendations.length) return null;

    const providers = state.cloudRecommendations.map(rec => ({
      name: rec.provider,
      monthlyCost: rec.totalCost.monthly,
      yearlyCost: rec.totalCost.yearly,
      savings: rec.optimization?.potentialSavings || 0
    }));

    const cheapest = providers.reduce((min, provider) => 
      provider.monthlyCost < min.monthlyCost ? provider : min
    );

    const totalSavings = providers.reduce((sum, provider) => sum + provider.savings, 0);

    return {
      providers,
      cheapest,
      totalSavings,
      averageMonthlyCost: providers.reduce((sum, p) => sum + p.monthlyCost, 0) / providers.length
    };
  }, [state.cloudRecommendations]);

  // Get decisions by status
  const getDecisionsByStatus = useCallback((status: string) => {
    return state.decisions.filter(decision => decision.status === status);
  }, [state.decisions]);

  // Get architecture metrics
  const getArchitectureMetrics = useCallback(() => {
    if (!state.patterns.length) return null;

    const totalPatterns = state.patterns.length;
    const avgComplexity = state.patterns.reduce((sum, p) => sum + p.complexity, 0) / totalPatterns;
    const avgSuccessRate = state.patterns.reduce((sum, p) => sum + (p.successRate || 0), 0) / totalPatterns;
    
    const categoryDistribution = state.patterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const performanceMetrics = {
      avgPerformance: state.patterns.reduce((sum, p) => sum + p.metrics.performance, 0) / totalPatterns,
      avgScalability: state.patterns.reduce((sum, p) => sum + p.metrics.scalability, 0) / totalPatterns,
      avgMaintainability: state.patterns.reduce((sum, p) => sum + p.metrics.maintainability, 0) / totalPatterns,
      avgSecurity: state.patterns.reduce((sum, p) => sum + p.metrics.security, 0) / totalPatterns
    };

    return {
      totalPatterns,
      avgComplexity,
      avgSuccessRate,
      categoryDistribution,
      performanceMetrics
    };
  }, [state.patterns]);

  // Search functionality
  const searchPatterns = useCallback((query: string) => {
    if (!query.trim()) return state.patterns;
    
    const lowercaseQuery = query.toLowerCase();
    return state.patterns.filter(pattern => 
      pattern.name.toLowerCase().includes(lowercaseQuery) ||
      pattern.description.toLowerCase().includes(lowercaseQuery) ||
      pattern.category.toLowerCase().includes(lowercaseQuery) ||
      pattern.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [state.patterns]);

  return {
    // Data
    ...state,
    
    // Actions
    refreshData,
    
    // Computed data
    getPatternsByCategory,
    getRecommendedPatterns,
    getCostAnalysis,
    getDecisionsByStatus,
    getArchitectureMetrics,
    searchPatterns,
    
    // Status
    hasData: state.patterns.length > 0 || state.stacks.length > 0,
    isEmpty: state.patterns.length === 0 && state.stacks.length === 0 && !state.loading
  };
};

// Helper function to extract error messages
function getErrorMessage(error: any): string {
  if (!error) return '';
  
  if (error.message) return error.message;
  if (error.networkError?.message) return error.networkError.message;
  if (error.graphQLErrors?.length > 0) return error.graphQLErrors[0].message;
  
  return 'An unknown error occurred';
}

// Mock data for development/fallback
export const mockArchitectureData = {
  patterns: [
    {
      id: '1',
      name: 'Microservices Architecture',
      description: 'Decompose application into small, independent services',
      category: 'microservices',
      tags: ['scalable', 'distributed', 'cloud-native'],
      complexity: 7,
      usageCount: 150,
      successRate: 85,
      metrics: {
        performance: 80,
        scalability: 95,
        maintainability: 70,
        security: 75
      },
      components: [],
      connections: [],
      benefits: [
        'Independent deployment',
        'Technology diversity',
        'Fault isolation'
      ],
      tradeoffs: [
        'Increased complexity',
        'Network overhead',
        'Data consistency challenges'
      ],
      examples: [
        {
          company: 'Netflix',
          useCase: 'Video streaming platform',
          outcome: '99.99% uptime achieved'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Event-Driven Architecture',
      description: 'Architecture based on event production and consumption',
      category: 'event-driven',
      tags: ['reactive', 'asynchronous', 'loosely-coupled'],
      complexity: 6,
      usageCount: 120,
      successRate: 78,
      metrics: {
        performance: 85,
        scalability: 90,
        maintainability: 65,
        security: 70
      },
      components: [],
      connections: [],
      benefits: [
        'Loose coupling',
        'High scalability',
        'Real-time processing'
      ],
      tradeoffs: [
        'Event ordering complexity',
        'Debugging challenges',
        'Eventual consistency'
      ],
      examples: [
        {
          company: 'Uber',
          useCase: 'Real-time ride matching',
          outcome: 'Reduced latency by 40%'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ] as ArchitecturePattern[],
  
  stacks: [
    {
      id: '1',
      name: 'Modern Web Stack',
      description: 'React, Node.js, PostgreSQL, Redis',
      category: 'web',
      technologies: [
        {
          name: 'React',
          version: '18.0',
          type: 'framework',
          popularity: 95,
          learningCurve: 60,
          communitySupport: 90,
          maintenance: 85,
          license: 'MIT'
        },
        {
          name: 'Node.js',
          version: '18.0',
          type: 'runtime',
          popularity: 90,
          learningCurve: 50,
          communitySupport: 95,
          maintenance: 90,
          license: 'MIT'
        }
      ],
      compatibility: 90,
      totalCost: {
        development: 50000,
        hosting: 1000,
        maintenance: 2000,
        licensing: 0
      },
      performance: {
        throughput: 85,
        latency: 90,
        scalability: 80,
        reliability: 85
      },
      pros: ['Fast development', 'Great ecosystem', 'Strong community'],
      cons: ['Complexity can grow', 'JavaScript fatigue'],
      useCases: ['Web applications', 'APIs', 'Real-time apps'],
      companies: ['Facebook', 'Netflix', 'Airbnb'],
      marketShare: 25,
      trend: 'stable',
      recommendation: {
        score: 85,
        reasoning: 'Excellent choice for modern web development'
      }
    }
  ] as TechnologyStack[],
  
  cloudRecommendations: [
    {
      provider: 'AWS',
      services: [
        {
          component: 'compute',
          service: 'EC2',
          tier: 't3.medium',
          configuration: {},
          cost: {
            monthly: 500,
            yearly: 5400,
            payAsYouGo: 600
          },
          performance: {
            cpu: '2 vCPU',
            memory: '4 GB',
            storage: '100 GB',
            bandwidth: '1 Gbps'
          },
          alternatives: []
        }
      ],
      totalCost: {
        monthly: 1200,
        yearly: 13000,
        breakdown: {
          compute: 500,
          storage: 200,
          network: 300,
          services: 200
        }
      },
      deployment: {
        regions: ['us-east-1'],
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        networking: {},
        security: {}
      },
      optimization: {
        suggestions: ['Use reserved instances', 'Implement auto-scaling'],
        potentialSavings: 300,
        performanceImpact: 'minimal'
      }
    }
  ] as CloudRecommendation[],
  
  decisions: [
    {
      id: '1',
      title: 'Choose Database Technology',
      status: 'APPROVED' as any,
      context: 'Need to select primary database for the application',
      decision: 'Use PostgreSQL as primary database',
      consequences: 'Strong ACID compliance, good performance',
      alternatives: [
        {
          option: 'MongoDB',
          pros: ['Flexible schema', 'Good for rapid development'],
          cons: ['Eventual consistency', 'Learning curve'],
          impact: 'medium'
        }
      ],
      stakeholders: [
        {
          name: 'John Doe',
          role: 'Tech Lead',
          approval: true,
          comments: 'Good choice for our use case'
        }
      ],
      tags: ['database', 'infrastructure'],
      priority: 'HIGH' as any,
      impact: {
        technical: 4,
        business: 3,
        timeline: 2,
        cost: 3
      },
      createdBy: {
        id: '1',
        name: 'John Doe'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ] as ArchitectureDecision[]
};

export default useArchitectureData;