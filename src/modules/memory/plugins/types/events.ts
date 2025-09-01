// Plugin Event System Types
// Event definitions and interfaces for plugin communication

import { MemoryNode, PluginMessage, PluginMetrics } from './index';

// System-wide events
export enum SystemEvent {
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_UNLOADED = 'plugin:unloaded',
  PLUGIN_ERROR = 'plugin:error',
  PLUGIN_MESSAGE = 'plugin:message',
  MEMORY_SYSTEM_READY = 'memory:system:ready',
  MEMORY_SYSTEM_SHUTDOWN = 'memory:system:shutdown',
  WORKSPACE_SWITCHED = 'workspace:switched'
}

// Plugin-specific events
export enum PluginEvent {
  SECURITY_ANALYSIS = 'plugin:security-analysis',
  PERFORMANCE_ANALYSIS = 'plugin:performance-analysis',
  PATTERN_DETECTED = 'plugin:pattern-detected',
  DOCUMENTATION_GENERATED = 'plugin:documentation-generated',
  RECOMMENDATION_AVAILABLE = 'plugin:recommendation-available',
  INSIGHT_DISCOVERED = 'plugin:insight-discovered'
}

// Event payload interfaces
export interface PluginLoadedEvent {
  pluginId: string;
  manifest: any;
  timestamp: Date;
}

export interface PluginUnloadedEvent {
  pluginId: string;
  reason: string;
  timestamp: Date;
}

export interface PluginErrorEvent {
  pluginId: string;
  error: Error;
  context: any;
  timestamp: Date;
}

export interface PluginMessageEvent {
  message: PluginMessage;
  timestamp: Date;
}

export interface SecurityAnalysisEvent {
  pluginId: string;
  memoryId: string;
  analysis: SecurityAnalysis;
  timestamp: Date;
}

export interface PerformanceAnalysisEvent {
  pluginId: string;
  target: string;
  analysis: PerformanceAnalysis;
  timestamp: Date;
}

export interface PatternDetectedEvent {
  pluginId: string;
  pattern: DetectedPattern;
  confidence: number;
  timestamp: Date;
}

export interface DocumentationGeneratedEvent {
  pluginId: string;
  documentation: GeneratedDocumentation;
  timestamp: Date;
}

export interface RecommendationEvent {
  pluginId: string;
  recommendation: Recommendation;
  priority: number;
  timestamp: Date;
}

export interface InsightDiscoveredEvent {
  pluginId: string;
  insight: DiscoveredInsight;
  confidence: number;
  timestamp: Date;
}

// Analysis result types
export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  riskScore: number;
  scanTime: Date;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  cwe?: string;
  remediation?: string;
}

export interface SecurityRecommendation {
  type: string;
  description: string;
  priority: number;
  implementation?: string;
}

export interface PerformanceAnalysis {
  metrics: PerformanceMetric[];
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceRecommendation[];
  score: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface PerformanceBottleneck {
  type: string;
  description: string;
  impact: number;
  location?: string;
  suggestion?: string;
}

export interface PerformanceRecommendation {
  type: string;
  description: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
}

export interface DetectedPattern {
  type: string;
  name: string;
  description: string;
  occurrences: PatternOccurrence[];
  category: string;
  tags: string[];
}

export interface PatternOccurrence {
  location: string;
  context: any;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface GeneratedDocumentation {
  type: 'api' | 'guide' | 'tutorial' | 'reference';
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'json';
  metadata: Record<string, any>;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  actionable: boolean;
  implementation?: string;
  benefits?: string[];
  risks?: string[];
}

export interface DiscoveredInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  relatedMemories: string[];
  implications: string[];
  confidence: number;
  metadata: Record<string, any>;
}

// Event subscription interface
export interface EventSubscription {
  eventType: string;
  pluginId: string;
  handler: EventHandler;
  priority?: number;
  filter?: EventFilter;
}

export type EventHandler = (event: any) => Promise<void> | void;
export type EventFilter = (event: any) => boolean;

// Event bus interface
export interface IEventBus {
  subscribe(subscription: EventSubscription): void;
  unsubscribe(eventType: string, pluginId: string): void;
  emit(eventType: string, payload: any): Promise<void>;
  listSubscriptions(eventType?: string): EventSubscription[];
  getEventHistory(eventType: string, limit?: number): any[];
  clearEventHistory(eventType?: string): void;
}
