// Security Analyzer Plugin
// Advanced security analysis for LANKA Memory System

import {
  IPlugin,
  PluginManifest,
  PluginContext,
  MemoryNode,
  HookExecutionResult,
  MemorySearchQuery,
  SecurityAnalysis,
  SecurityVulnerability,
  SecurityRecommendation
} from '../../types';

export default function createSecurityAnalyzerPlugin(): IPlugin {
  return new SecurityAnalyzerPlugin();
}

class SecurityAnalyzerPlugin implements IPlugin {
  private context!: PluginContext;
  private securityPatterns: SecurityPattern[];
  private vulnerabilityDatabase: VulnerabilityDatabase;
  private analysisCache: Map<string, SecurityAnalysis> = new Map();

  constructor() {
    this.securityPatterns = this.loadSecurityPatterns();
    this.vulnerabilityDatabase = new VulnerabilityDatabase();
  }

  getMetadata(): PluginManifest {
    return {
      name: 'security-analyzer',
      version: '1.0.0',
      description: 'Advanced security analysis plugin for LANKA Memory System',
      author: 'LANKA Security Team',
      license: 'MIT',
      capabilities: ['analyze', 'scan', 'suggest', 'validate'],
      hooks: ['memory-ingestion', 'memory-stored', 'pre-search', 'post-search'],
      dependencies: [],
      requiredPermissions: [
        'read-memory',
        'write-memory', 
        'create-relationships',
        'plugin-communication'
      ],
      resourceLimits: {
        maxMemoryMB: 200,
        maxExecutionTimeMs: 10000,
        maxConcurrentOperations: 5
      }
    };
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    this.context.logger.info('Initializing Security Analyzer Plugin');
    
    // Load security patterns and rules
    await this.loadSecurityRules();
    
    // Initialize vulnerability database
    await this.vulnerabilityDatabase.initialize();
    
    // Set up real-time monitoring if enabled
    if (context.config.enableRealtimeScanning) {
      await this.setupRealtimeMonitoring();
    }
    
    // Subscribe to security events from other plugins
    context.eventBus.subscribe('plugin:security-analysis', this.handleSecurityEvent.bind(this));
    
    this.context.logger.info('Security Analyzer Plugin initialized successfully');
  }

  async shutdown(): Promise<void> {
    this.context.logger.info('Shutting down Security Analyzer Plugin');
    
    // Clear caches
    this.analysisCache.clear();
    
    // Cleanup event subscriptions
    this.context.eventBus.removeAllListeners();
    
    this.context.logger.info('Security Analyzer Plugin shutdown complete');
  }

  // Hook implementations

  async onMemoryIngestion(memory: MemoryNode): Promise<HookExecutionResult> {
    try {
      this.context.logger.debug(`Analyzing memory for security issues: ${memory.id}`);
      
      // Perform security analysis on incoming memory
      const analysis = await this.analyze(memory);
      
      // Check if memory should be blocked based on security findings
      const shouldBlock = this.shouldBlockMemory(analysis);
      
      if (shouldBlock) {
        this.context.logger.warn(`Blocking memory ${memory.id} due to security concerns`);
        
        return {
          proceed: false,
          error: 'Memory blocked due to security violations',
          metadata: {
            securityAnalysis: analysis,
            blockedBy: 'security-analyzer'
          }
        };
      }
      
      // Add security metadata to memory
      const modifications = {
        metadata: {
          ...memory.metadata,
          securityScanned: true,
          securityScore: analysis.riskScore,
          securityFindings: analysis.vulnerabilities.length,
          scanTimestamp: new Date().toISOString()
        }
      };
      
      // Create security relationship if vulnerabilities found
      if (analysis.vulnerabilities.length > 0) {
        await this.createSecurityRelationships(memory.id, analysis);
      }
      
      return {
        proceed: true,
        modifications,
        metadata: {
          securityAnalysis: analysis
        }
      };
      
    } catch (error) {
      this.context.logger.error('Error during memory ingestion security analysis', error);
      
      return {
        proceed: true, // Don't block on analysis errors
        error: `Security analysis failed: ${error}`,
        metadata: {
          securityAnalysisError: true
        }
      };
    }
  }

  async onMemoryStored(memory: MemoryNode): Promise<HookExecutionResult> {
    try {
      // Log security events for stored memories
      const securityData = memory.metadata.securityAnalysis;
      
      if (securityData && securityData.vulnerabilities.length > 0) {
        this.context.eventBus.emit('plugin:security-analysis', {
          pluginId: this.context.pluginId,
          memoryId: memory.id,
          analysis: securityData,
          timestamp: new Date()
        });
      }
      
      return { proceed: true };
      
    } catch (error) {
      this.context.logger.error('Error in onMemoryStored hook', error);
      return { proceed: true };
    }
  }

  async onPreSearch(query: MemorySearchQuery): Promise<HookExecutionResult> {
    try {
      // Analyze search query for potential security issues
      const queryAnalysis = await this.analyzeSearchQuery(query);
      
      if (queryAnalysis.suspicious) {
        this.context.logger.warn('Suspicious search query detected', { query });
        
        // Don't block but log for monitoring
        await this.logSecurityEvent('suspicious-query', {
          query,
          analysis: queryAnalysis
        });
      }
      
      return { proceed: true };
      
    } catch (error) {
      this.context.logger.error('Error in onPreSearch hook', error);
      return { proceed: true };
    }
  }

  async onPostSearch(results: MemoryNode[], query: MemorySearchQuery): Promise<HookExecutionResult> {
    try {
      // Filter out memories with high security risks from search results
      const filteredResults = results.filter(memory => {
        const securityScore = memory.metadata.securityScore || 0;
        return securityScore < 0.8; // Filter high-risk memories
      });
      
      if (filteredResults.length < results.length) {
        this.context.logger.info(
          `Filtered ${results.length - filteredResults.length} high-risk memories from search results`
        );
      }
      
      return {
        proceed: true,
        modifications: filteredResults
      };
      
    } catch (error) {
      this.context.logger.error('Error in onPostSearch hook', error);
      return { proceed: true };
    }
  }

  // Capability implementations

  async analyze(target: MemoryNode | string): Promise<SecurityAnalysis> {
    const startTime = Date.now();
    
    try {
      let memory: MemoryNode;
      
      if (typeof target === 'string') {
        const retrieved = await this.context.memory.retrieve(target);
        if (!retrieved) {
          throw new Error(`Memory not found: ${target}`);
        }
        memory = retrieved;
      } else {
        memory = target;
      }
      
      // Check cache first
      const cacheKey = this.getCacheKey(memory);
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey)!;
      }
      
      const analysis = await this.performSecurityAnalysis(memory);
      
      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      
      return analysis;
      
    } finally {
      const duration = Date.now() - startTime;
      this.context.logger.debug(`Security analysis completed in ${duration}ms`);
    }
  }

  async scan(options: SecurityScanOptions): Promise<SecurityScanResult> {
    this.context.logger.info('Starting comprehensive security scan');
    
    const results: SecurityScanResult = {
      scanId: `scan_${Date.now()}`,
      startTime: new Date(),
      endTime: new Date(),
      memoriesScanned: 0,
      vulnerabilitiesFound: 0,
      findings: [],
      recommendations: []
    };
    
    try {
      // Get memories to scan
      const memories = await this.getMemoriesForScan(options);
      results.memoriesScanned = memories.length;
      
      // Analyze each memory
      for (const memory of memories) {
        const analysis = await this.analyze(memory);
        
        if (analysis.vulnerabilities.length > 0) {
          results.vulnerabilitiesFound += analysis.vulnerabilities.length;
          results.findings.push({
            memoryId: memory.id,
            analysis
          });
        }
      }
      
      // Generate recommendations
      results.recommendations = this.generateScanRecommendations(results);
      results.endTime = new Date();
      
      this.context.logger.info(
        `Security scan completed: ${results.memoriesScanned} memories scanned, ${results.vulnerabilitiesFound} vulnerabilities found`
      );
      
      return results;
      
    } catch (error) {
      this.context.logger.error('Error during security scan', error);
      throw error;
    }
  }

  async suggest(context: any): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];
    
    // Analyze context and generate suggestions
    if (context.vulnerabilities) {
      for (const vuln of context.vulnerabilities) {
        const recommendation = this.generateRecommendation(vuln);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }
    
    return recommendations;
  }

  async validate(data: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      violations: [],
      warnings: []
    };
    
    // Validate data against security rules
    for (const pattern of this.securityPatterns) {
      const violation = pattern.validate(data);
      if (violation) {
        if (violation.severity === 'critical' || violation.severity === 'high') {
          result.valid = false;
          result.violations.push(violation);
        } else {
          result.warnings.push(violation);
        }
      }
    }
    
    return result;
  }

  // Private methods

  private async performSecurityAnalysis(memory: MemoryNode): Promise<SecurityAnalysis> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: SecurityRecommendation[] = [];
    
    // Content analysis
    const contentVulns = await this.analyzeContent(memory.content);
    vulnerabilities.push(...contentVulns);
    
    // Metadata analysis
    const metadataVulns = await this.analyzeMetadata(memory.metadata);
    vulnerabilities.push(...metadataVulns);
    
    // Pattern matching
    const patternVulns = await this.analyzePatterns(memory);
    vulnerabilities.push(...patternVulns);
    
    // Risk scoring
    const riskScore = this.calculateRiskScore(vulnerabilities);
    
    // Generate recommendations
    const recs = await this.generateRecommendations(vulnerabilities);
    recommendations.push(...recs);
    
    return {
      vulnerabilities,
      recommendations,
      riskScore,
      scanTime: new Date()
    };
  }

  private async analyzeContent(content: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for sensitive data patterns
    const sensitivePatterns = [
      { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, type: 'credit-card', severity: 'high' as const },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'ssn', severity: 'critical' as const },
      { pattern: /password\s*[:=]\s*["']?([^"'\s]+)/i, type: 'password', severity: 'high' as const },
      { pattern: /api[_-]?key\s*[:=]\s*["']?([^"'\s]+)/i, type: 'api-key', severity: 'high' as const }
    ];
    
    for (const { pattern, type, severity } of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        vulnerabilities.push({
          type,
          severity,
          description: `Potential ${type.replace('-', ' ')} detected in content`,
          location: 'content',
          remediation: `Remove or encrypt ${type.replace('-', ' ')} data`
        });
      }
    }
    
    return vulnerabilities;
  }

  private async analyzeMetadata(metadata: Record<string, any>): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for sensitive metadata
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
    
    for (const key of Object.keys(metadata)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        vulnerabilities.push({
          type: 'sensitive-metadata',
          severity: 'medium',
          description: `Potentially sensitive metadata key: ${key}`,
          location: `metadata.${key}`,
          remediation: 'Remove sensitive metadata or encrypt values'
        });
      }
    }
    
    return vulnerabilities;
  }

  private async analyzePatterns(memory: MemoryNode): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    for (const pattern of this.securityPatterns) {
      const matches = pattern.analyze(memory);
      vulnerabilities.push(...matches);
    }
    
    return vulnerabilities;
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 0;
    
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score += 0.4; break;
        case 'high': score += 0.3; break;
        case 'medium': score += 0.2; break;
        case 'low': score += 0.1; break;
      }
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  private async generateRecommendations(
    vulnerabilities: SecurityVulnerability[]
  ): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];
    const vulnTypes = new Set(vulnerabilities.map(v => v.type));
    
    for (const type of vulnTypes) {
      const recommendation = this.generateRecommendation({ type } as any);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  private generateRecommendation(vulnerability: any): SecurityRecommendation | null {
    const recommendationMap: Record<string, SecurityRecommendation> = {
      'credit-card': {
        type: 'data-protection',
        description: 'Implement PCI DSS compliance for credit card data',
        priority: 9,
        implementation: 'Use tokenization or encryption for credit card numbers'
      },
      'ssn': {
        type: 'pii-protection', 
        description: 'Secure handling of Social Security Numbers required',
        priority: 10,
        implementation: 'Encrypt SSNs and implement access controls'
      },
      'password': {
        type: 'credential-security',
        description: 'Remove plain text passwords from memory content',
        priority: 8,
        implementation: 'Hash passwords and store only hashes'
      }
    };
    
    return recommendationMap[vulnerability.type] || null;
  }

  private shouldBlockMemory(analysis: SecurityAnalysis): boolean {
    // Block if critical vulnerabilities found
    return analysis.vulnerabilities.some(v => v.severity === 'critical');
  }

  private async createSecurityRelationships(
    memoryId: string,
    analysis: SecurityAnalysis
  ): Promise<void> {
    try {
      // Create security analysis node
      const analysisNodeId = await this.context.graph.createNode(
        'security-analysis',
        {
          memoryId,
          riskScore: analysis.riskScore,
          vulnerabilityCount: analysis.vulnerabilities.length,
          scanTime: analysis.scanTime,
          findings: analysis.vulnerabilities.map(v => ({
            type: v.type,
            severity: v.severity,
            description: v.description
          }))
        }
      );
      
      // Link to original memory
      await this.context.graph.createRelationship(
        memoryId,
        analysisNodeId,
        'HAS_SECURITY_ANALYSIS'
      );
      
    } catch (error) {
      this.context.logger.error('Error creating security relationships', error);
    }
  }

  private loadSecurityPatterns(): SecurityPattern[] {
    return [
      new SQLInjectionPattern(),
      new XSSPattern(),
      new CommandInjectionPattern(),
      new DataLeakagePattern()
    ];
  }

  private async loadSecurityRules(): Promise<void> {
    // Load security rules from configuration or external source
    this.context.logger.debug('Loading security rules');
  }

  private async setupRealtimeMonitoring(): Promise<void> {
    this.context.logger.info('Setting up real-time security monitoring');
    // Set up monitoring hooks and event listeners
  }

  private async handleSecurityEvent(event: any): Promise<void> {
    this.context.logger.debug('Handling security event', event);
    // Process security events from other plugins
  }

  private async analyzeSearchQuery(query: MemorySearchQuery): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    
    // Check for suspicious patterns in search query
    if (query.text) {
      if (query.text.includes('DROP TABLE') || query.text.includes('DELETE FROM')) {
        reasons.push('SQL injection patterns detected');
      }
      
      if (query.text.includes('<script>') || query.text.includes('javascript:')) {
        reasons.push('XSS patterns detected');
      }
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  private async logSecurityEvent(type: string, data: any): Promise<void> {
    await this.context.storage.set(`security-event-${Date.now()}`, {
      type,
      data,
      timestamp: new Date()
    }, 86400000); // 24 hour TTL
  }

  private getCacheKey(memory: MemoryNode): string {
    return `${memory.id}-${memory.timestamp?.getTime() || 0}`;
  }

  private async getMemoriesForScan(options: SecurityScanOptions): Promise<MemoryNode[]> {
    // Get memories based on scan options
    return await this.context.memory.search({
      limit: options.limit || 1000,
      workspace: options.workspace
    });
  }

  private generateScanRecommendations(results: SecurityScanResult): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];
    
    if (results.vulnerabilitiesFound > 0) {
      recommendations.push({
        type: 'security-review',
        description: `Review and remediate ${results.vulnerabilitiesFound} security vulnerabilities`,
        priority: 8,
        implementation: 'Prioritize critical and high severity vulnerabilities'
      });
    }
    
    return recommendations;
  }
}

// Security Pattern Classes
class SecurityPattern {
  abstract analyze(memory: MemoryNode): SecurityVulnerability[];
  abstract validate(data: any): SecurityVulnerability | null;
}

class SQLInjectionPattern extends SecurityPattern {
  analyze(memory: MemoryNode): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\|)|(\*)|(%))/,
      /(union|select|insert|delete|update|drop|create|alter)\s/i
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(memory.content)) {
        vulnerabilities.push({
          type: 'sql-injection',
          severity: 'high',
          description: 'Potential SQL injection pattern detected',
          location: 'content',
          remediation: 'Sanitize input and use parameterized queries'
        });
        break;
      }
    }
    
    return vulnerabilities;
  }
  
  validate(data: any): SecurityVulnerability | null {
    if (typeof data === 'string' && /(union|select|insert|delete)/i.test(data)) {
      return {
        type: 'sql-injection',
        severity: 'high',
        description: 'SQL injection pattern in data',
        remediation: 'Sanitize input data'
      };
    }
    return null;
  }
}

class XSSPattern extends SecurityPattern {
  analyze(memory: MemoryNode): SecurityVulnerability[] {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(memory.content)) {
        return [{
          type: 'xss',
          severity: 'medium',
          description: 'Potential XSS pattern detected',
          location: 'content',
          remediation: 'HTML encode output and validate input'
        }];
      }
    }
    
    return [];
  }
  
  validate(data: any): SecurityVulnerability | null {
    if (typeof data === 'string' && /<script/i.test(data)) {
      return {
        type: 'xss',
        severity: 'medium',
        description: 'XSS pattern in data',
        remediation: 'HTML encode the data'
      };
    }
    return null;
  }
}

class CommandInjectionPattern extends SecurityPattern {
  analyze(memory: MemoryNode): SecurityVulnerability[] {
    const cmdPatterns = [
      /[;&|`$(){}]/,
      /(rm|del|format|shutdown)\s/i
    ];
    
    for (const pattern of cmdPatterns) {
      if (pattern.test(memory.content)) {
        return [{
          type: 'command-injection',
          severity: 'high',
          description: 'Potential command injection pattern detected',
          location: 'content',
          remediation: 'Validate and sanitize command input'
        }];
      }
    }
    
    return [];
  }
  
  validate(data: any): SecurityVulnerability | null {
    if (typeof data === 'string' && /[;&|`]/.test(data)) {
      return {
        type: 'command-injection',
        severity: 'high',
        description: 'Command injection pattern in data',
        remediation: 'Sanitize command characters'
      };
    }
    return null;
  }
}

class DataLeakagePattern extends SecurityPattern {
  analyze(memory: MemoryNode): SecurityVulnerability[] {
    const sensitivePatterns = [
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, type: 'email' },
      { pattern: /\b\d{10,}\b/, type: 'phone' },
      { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, type: 'ip-address' }
    ];
    
    const vulnerabilities: SecurityVulnerability[] = [];
    
    for (const { pattern, type } of sensitivePatterns) {
      if (pattern.test(memory.content)) {
        vulnerabilities.push({
          type: 'data-leakage',
          severity: 'medium',
          description: `Potential ${type} exposure detected`,
          location: 'content',
          remediation: `Mask or encrypt ${type} data`
        });
      }
    }
    
    return vulnerabilities;
  }
  
  validate(data: any): SecurityVulnerability | null {
    if (typeof data === 'string') {
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      if (emailPattern.test(data)) {
        return {
          type: 'data-leakage',
          severity: 'medium',
          description: 'Email address in data',
          remediation: 'Mask email addresses'
        };
      }
    }
    return null;
  }
}

class VulnerabilityDatabase {
  private knownVulnerabilities: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    // Load known vulnerability patterns
    console.log('Initializing vulnerability database');
  }
  
  lookup(pattern: string): any {
    return this.knownVulnerabilities.get(pattern);
  }
}

// Supporting interfaces
interface SecurityScanOptions {
  workspace?: string;
  limit?: number;
  severityFilter?: string[];
}

interface SecurityScanResult {
  scanId: string;
  startTime: Date;
  endTime: Date;
  memoriesScanned: number;
  vulnerabilitiesFound: number;
  findings: Array<{
    memoryId: string;
    analysis: SecurityAnalysis;
  }>;
  recommendations: SecurityRecommendation[];
}

interface ValidationResult {
  valid: boolean;
  violations: SecurityVulnerability[];
  warnings: SecurityVulnerability[];
}
