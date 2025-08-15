import { ArchitecturePattern, TechnologyStack, CloudRecommendation } from '../graphql/architecture';

// Pattern matching utilities
export const calculatePatternSimilarity = (
  pattern1: ArchitecturePattern, 
  pattern2: ArchitecturePattern
): number => {
  if (!pattern1 || !pattern2) return 0;
  
  // Calculate similarity based on multiple factors
  const tagSimilarity = calculateTagSimilarity(pattern1.tags, pattern2.tags);
  const categorySimilarity = pattern1.category === pattern2.category ? 0.3 : 0;
  const complexitySimilarity = 1 - Math.abs(pattern1.complexity - pattern2.complexity) / 10;
  const metricsSimilarity = calculateMetricsSimilarity(pattern1.metrics, pattern2.metrics);
  
  // Weighted average
  return (
    tagSimilarity * 0.4 +
    categorySimilarity * 0.2 +
    complexitySimilarity * 0.2 +
    metricsSimilarity * 0.2
  );
};

export const calculateTagSimilarity = (tags1: string[], tags2: string[]): number => {
  if (!tags1?.length || !tags2?.length) return 0;
  
  const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
  const set2 = new Set(tags2.map(tag => tag.toLowerCase()));
  
  const intersection = new Set([...set1].filter(tag => set2.has(tag)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

export const calculateMetricsSimilarity = (
  metrics1: { performance: number; scalability: number; maintainability: number; security: number },
  metrics2: { performance: number; scalability: number; maintainability: number; security: number }
): number => {
  if (!metrics1 || !metrics2) return 0;
  
  const performanceSim = 1 - Math.abs(metrics1.performance - metrics2.performance) / 100;
  const scalabilitySim = 1 - Math.abs(metrics1.scalability - metrics2.scalability) / 100;
  const maintainabilitySim = 1 - Math.abs(metrics1.maintainability - metrics2.maintainability) / 100;
  const securitySim = 1 - Math.abs(metrics1.security - metrics2.security) / 100;
  
  return (performanceSim + scalabilitySim + maintainabilitySim + securitySim) / 4;
};

// Cost calculation utilities
export const calculateTotalCostOfOwnership = (
  recommendation: CloudRecommendation,
  timeframe: 'monthly' | 'yearly' | '3years' = 'yearly'
): number => {
  if (!recommendation) return 0;
  
  const baseCost = recommendation.totalCost[timeframe === '3years' ? 'yearly' : timeframe];
  
  if (timeframe === '3years') {
    // Calculate 3-year TCO with growth assumptions
    const year1 = baseCost;
    const year2 = baseCost * 1.2; // 20% growth
    const year3 = baseCost * 1.4; // 40% growth from baseline
    return year1 + year2 + year3;
  }
  
  return baseCost;
};

export const calculateCostPerService = (recommendation: CloudRecommendation): Array<{
  service: string;
  cost: number;
  percentage: number;
}> => {
  if (!recommendation?.services) return [];
  
  const total = recommendation.totalCost.monthly;
  
  return recommendation.services.map(service => ({
    service: service.service,
    cost: service.cost.monthly,
    percentage: (service.cost.monthly / total) * 100
  })).sort((a, b) => b.cost - a.cost);
};

export const calculateOptimizationPotential = (
  recommendations: CloudRecommendation[]
): {
  provider: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
}[] => {
  if (!recommendations) return [];
  
  return recommendations.map(rec => {
    const currentCost = rec.totalCost.monthly;
    const savings = rec.optimization?.potentialSavings || 0;
    const optimizedCost = currentCost - savings;
    const savingsPercentage = currentCost > 0 ? (savings / currentCost) * 100 : 0;
    
    return {
      provider: rec.provider,
      currentCost,
      optimizedCost,
      savings,
      savingsPercentage
    };
  }).sort((a, b) => b.savingsPercentage - a.savingsPercentage);
};

// Technology stack analysis
export const analyzeTechnologyCompatibility = (
  stack1: TechnologyStack,
  stack2: TechnologyStack
): {
  compatibilityScore: number;
  commonTechnologies: string[];
  conflicts: string[];
  recommendations: string[];
} => {
  if (!stack1 || !stack2) {
    return {
      compatibilityScore: 0,
      commonTechnologies: [],
      conflicts: [],
      recommendations: []
    };
  }
  
  const tech1Names = stack1.technologies?.map(t => t.name.toLowerCase()) || [];
  const tech2Names = stack2.technologies?.map(t => t.name.toLowerCase()) || [];
  
  const commonTechnologies = tech1Names.filter(tech => tech2Names.includes(tech));
  const compatibilityScore = commonTechnologies.length / Math.max(tech1Names.length, tech2Names.length);
  
  // Simple conflict detection (this would be more sophisticated in practice)
  const conflicts: string[] = [];
  const incompatiblePairs = [
    ['react', 'angular'],
    ['vue', 'react'],
    ['mysql', 'postgresql'], // Not really conflicts, but choices
    ['mongodb', 'postgresql']
  ];
  
  incompatiblePairs.forEach(([tech1, tech2]) => {
    if (tech1Names.includes(tech1) && tech2Names.includes(tech2)) {
      conflicts.push(`${tech1} and ${tech2} may have integration challenges`);
    }
  });
  
  const recommendations: string[] = [];
  if (compatibilityScore < 0.3) {
    recommendations.push('Consider standardizing on common technologies');
  }
  if (conflicts.length > 0) {
    recommendations.push('Evaluate technology conflicts and integration complexity');
  }
  if (compatibilityScore > 0.7) {
    recommendations.push('High compatibility - good for team collaboration');
  }
  
  return {
    compatibilityScore,
    commonTechnologies,
    conflicts,
    recommendations
  };
};

export const calculateTechnologyTrend = (
  technology: { popularity: number; communitySupport: number; maintenance: number }
): 'rising' | 'stable' | 'declining' => {
  const trendScore = (
    technology.popularity * 0.5 +
    technology.communitySupport * 0.3 +
    technology.maintenance * 0.2
  );
  
  if (trendScore > 75) return 'rising';
  if (trendScore < 40) return 'declining';
  return 'stable';
};

// Pattern recommendation engine
export const recommendPatterns = (
  requirements: {
    scalability: number;
    performance: number;
    security: number;
    complexity: number;
    teamSize: number;
    timeline: number;
  },
  availablePatterns: ArchitecturePattern[]
): ArchitecturePattern[] => {
  if (!availablePatterns?.length) return [];
  
  // Score each pattern based on requirements
  const scoredPatterns = availablePatterns.map(pattern => {
    let score = 0;
    
    // Scalability match
    const scalabilityDiff = Math.abs(pattern.metrics.scalability - requirements.scalability);
    score += (100 - scalabilityDiff) * 0.25;
    
    // Performance match
    const performanceDiff = Math.abs(pattern.metrics.performance - requirements.performance);
    score += (100 - performanceDiff) * 0.25;
    
    // Security match
    const securityDiff = Math.abs(pattern.metrics.security - requirements.security);
    score += (100 - securityDiff) * 0.2;
    
    // Complexity consideration (lower complexity preferred for smaller teams/shorter timelines)
    const complexityScore = requirements.teamSize < 5 || requirements.timeline < 6
      ? Math.max(0, 100 - pattern.complexity * 10)
      : pattern.complexity * 5; // Larger teams can handle more complexity
    score += complexityScore * 0.15;
    
    // Success rate bonus
    score += pattern.successRate * 0.15;
    
    return { pattern, score };
  });
  
  // Sort by score and return top patterns
  return scoredPatterns
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.pattern);
};

// Cost optimization suggestions
export const generateCostOptimizationSuggestions = (
  recommendations: CloudRecommendation[]
): Array<{
  type: 'compute' | 'storage' | 'network' | 'general';
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}> => {
  if (!recommendations?.length) return [];
  
  const suggestions: Array<{
    type: 'compute' | 'storage' | 'network' | 'general';
    title: string;
    description: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }> = [];
  
  recommendations.forEach(rec => {
    const breakdown = rec.totalCost.breakdown;
    const total = rec.totalCost.monthly;
    
    // Compute optimization
    if (breakdown.compute / total > 0.6) {
      suggestions.push({
        type: 'compute',
        title: 'Right-size compute instances',
        description: 'High compute costs detected. Consider using reserved instances or spot instances.',
        potentialSavings: breakdown.compute * 0.3,
        effort: 'medium',
        impact: 'high'
      });
    }
    
    // Storage optimization
    if (breakdown.storage / total > 0.3) {
      suggestions.push({
        type: 'storage',
        title: 'Optimize storage tiers',
        description: 'Move infrequently accessed data to cheaper storage tiers.',
        potentialSavings: breakdown.storage * 0.4,
        effort: 'low',
        impact: 'medium'
      });
    }
    
    // Network optimization
    if (breakdown.network / total > 0.2) {
      suggestions.push({
        type: 'network',
        title: 'Reduce data transfer costs',
        description: 'Implement CDN and optimize data transfer patterns.',
        potentialSavings: breakdown.network * 0.25,
        effort: 'high',
        impact: 'medium'
      });
    }
  });
  
  // General suggestions
  suggestions.push({
    type: 'general',
    title: 'Implement auto-scaling',
    description: 'Scale resources based on demand to avoid over-provisioning.',
    potentialSavings: recommendations.reduce((sum, rec) => sum + rec.totalCost.monthly, 0) * 0.15,
    effort: 'medium',
    impact: 'high'
  });
  
  return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
};

// Architecture complexity analysis
export const analyzeArchitectureComplexity = (
  patterns: ArchitecturePattern[]
): {
  averageComplexity: number;
  complexityDistribution: { [key: string]: number };
  recommendations: string[];
} => {
  if (!patterns?.length) {
    return {
      averageComplexity: 0,
      complexityDistribution: {},
      recommendations: []
    };
  }
  
  const complexities = patterns.map(p => p.complexity);
  const averageComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  
  const complexityDistribution: { [key: string]: number } = {
    'Low (1-3)': complexities.filter(c => c <= 3).length,
    'Medium (4-6)': complexities.filter(c => c > 3 && c <= 6).length,
    'High (7-10)': complexities.filter(c => c > 6).length
  };
  
  const recommendations: string[] = [];
  
  if (averageComplexity > 7) {
    recommendations.push('Consider simplifying architecture to reduce maintenance overhead');
  }
  if (averageComplexity < 3) {
    recommendations.push('Architecture may be too simple for complex requirements');
  }
  if (complexityDistribution['High (7-10)'] > patterns.length * 0.5) {
    recommendations.push('High concentration of complex patterns may indicate over-engineering');
  }
  
  return {
    averageComplexity,
    complexityDistribution,
    recommendations
  };
};

// Pattern usage analytics
export const analyzePatternUsage = (
  patterns: ArchitecturePattern[]
): {
  mostPopular: ArchitecturePattern[];
  highestSuccess: ArchitecturePattern[];
  trending: ArchitecturePattern[];
  categoryDistribution: { [key: string]: number };
} => {
  if (!patterns?.length) {
    return {
      mostPopular: [],
      highestSuccess: [],
      trending: [],
      categoryDistribution: {}
    };
  }
  
  const sortedByUsage = [...patterns].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  const sortedBySuccess = [...patterns].sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
  
  // Simple trending calculation (would use time-series data in practice)
  const trending = patterns.filter(p => 
    (p.usageCount || 0) > 50 && (p.successRate || 0) > 75
  ).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  
  const categoryDistribution: { [key: string]: number } = {};
  patterns.forEach(pattern => {
    categoryDistribution[pattern.category] = (categoryDistribution[pattern.category] || 0) + 1;
  });
  
  return {
    mostPopular: sortedByUsage.slice(0, 5),
    highestSuccess: sortedBySuccess.slice(0, 5),
    trending: trending.slice(0, 5),
    categoryDistribution
  };
};

// Utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const generateColorScale = (count: number): string[] => {
  const baseColors = [
    '#1976d2', '#dc004e', '#00bcd4', '#4caf50', 
    '#ff9800', '#9c27b0', '#607d8b', '#795548'
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360; // Golden angle approximation
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  
  return colors;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};