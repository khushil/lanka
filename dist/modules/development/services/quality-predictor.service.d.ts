/**
 * Quality Predictor Service
 * AI-powered quality prediction and risk assessment for tests
 */
import { Neo4jService } from '../../../core/database/neo4j';
import { QualityPrediction, RiskFactor, PredictedIssue, HistoricalQuality } from '../types/development.types';
export declare class QualityPredictorService {
    private neo4j;
    constructor(neo4j: Neo4jService);
    predictTestQuality(testId: string): Promise<QualityPrediction>;
    predictSuiteQuality(testSuiteId: string): Promise<{
        overallQualityScore: number;
        riskDistribution: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
        problematicTests: string[];
        recommendations: string[];
        testCount: any;
        averageComplexity: number;
    }>;
    analyzeRiskFactors(testMetrics: any, historicalData: HistoricalQuality[]): Promise<RiskFactor[]>;
    predictIssues(testData: any): Promise<PredictedIssue[]>;
    generateQualityInsights(qualityData: any): Promise<{
        primaryConcerns: string[];
        quickWins: string[];
        longTermActions: string[];
        prioritizedRecommendations: string[];
        overallAssessment: string;
    }>;
    compareTestQuality(qualityPredictions: QualityPrediction[]): Promise<{
        bestTest: string;
        worstTest: string;
        qualityGap: number;
        averageQuality: number;
        qualityDistribution: {
            excellent: number;
            good: number;
            fair: number;
            poor: number;
        };
        recommendations: string[];
    }>;
    trainQualityModel(trainingData: any[]): Promise<{
        modelAccuracy: number;
        featureImportance: Record<string, number>;
        validationScore: number;
        trainingSize: number;
        features: string[];
    }>;
    updateQualityPrediction(testId: string, executionResults: any): Promise<{
        updatedPrediction: {
            qualityScore: number;
            confidence: number;
            historicalData: HistoricalQuality[];
            testId: string;
            riskFactors: RiskFactor[];
            recommendations: string[];
            predictedIssues: PredictedIssue[];
        };
        confidence: number;
        adjustment: number;
    }>;
    processCIFeedback(ciData: any): Promise<{
        updatedPredictions: any[];
        overallTrend: string;
        insights: {
            buildQuality: number;
            riskTests: number;
            recommendations: string[];
        };
        buildQuality: number;
    }>;
    private extractTestMetrics;
    private estimateLinesOfCode;
    private countAssertions;
    private countMockUsage;
    private estimateSetupComplexity;
    private calculateQualityScore;
    private calculateConfidence;
    private generateQualityRecommendations;
    private convertToHistoricalQuality;
    private calculateFlakinessScore;
    private calculateQualityTrend;
    private calculateOverallQuality;
    private analyzeRiskDistribution;
    private identifyProblematicTests;
    private generateSuiteRecommendations;
    private calculatePerformanceRisk;
    private calculateMaintenanceRisk;
    private identifyPrimaryConcerns;
    private identifyQuickWins;
    private identifyLongTermActions;
    private prioritizeRecommendations;
    private generateOverallAssessment;
    private analyzeQualityDistribution;
    private generateComparisonRecommendations;
    private extractFeatures;
    private simulateModelTraining;
    private calculateFeatureImportance;
    private validateModel;
    private calculateAdjustmentFactor;
    private createHistoricalDataPoint;
    private calculateOverallTrend;
    private generateCIInsights;
    private calculateBuildQuality;
}
//# sourceMappingURL=quality-predictor.service.d.ts.map