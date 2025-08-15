import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileCode,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter,
  Download,
  RefreshCw,
  HeatMap,
  BarChart3,
  Settings,
  Clock,
  Shield,
  Zap,
  Target,
} from 'lucide-react';

interface CodeQualityHeatmapProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface QualityMetric {
  id: string;
  name: string;
  value: number;
  threshold: {
    good: number;
    warning: number;
    critical: number;
  };
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface FileQuality {
  path: string;
  name: string;
  size: number;
  quality: {
    overall: number;
    maintainability: number;
    complexity: number;
    duplication: number;
    coverage: number;
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
  };
  hotspots: Array<{
    line: number;
    type: 'bug' | 'vulnerability' | 'code_smell';
    severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
    message: string;
    effort: number; // minutes to fix
  }>;
  technicalDebt: number; // minutes
  lastModified: Date;
  author: string;
}

interface QualityTrend {
  date: string;
  overall: number;
  maintainability: number;
  reliability: number;
  security: number;
  coverage: number;
}

const CodeQualityHeatmap: React.FC<CodeQualityHeatmapProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('overall');
  const [selectedFile, setSelectedFile] = useState<FileQuality | null>(null);
  const [files, setFiles] = useState<FileQuality[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<{ file: FileQuality; metric: string } | null>(null);
  
  const heatmapRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Generate mock data
  const generateMockFiles = useCallback((): FileQuality[] => {
    const mockPaths = [
      'src/components/ui/Button.tsx',
      'src/components/ui/Card.tsx',
      'src/components/ui/Modal.tsx',
      'src/components/ui/Form.tsx',
      'src/components/ui/Table.tsx',
      'src/hooks/useAuth.ts',
      'src/hooks/useApi.ts',
      'src/hooks/useLocalStorage.ts',
      'src/utils/formatters.ts',
      'src/utils/validators.ts',
      'src/utils/helpers.ts',
      'src/services/api.ts',
      'src/services/auth.ts',
      'src/services/analytics.ts',
      'src/pages/Dashboard.tsx',
      'src/pages/Settings.tsx',
      'src/pages/Profile.tsx',
      'src/pages/Reports.tsx',
      'src/store/userSlice.ts',
      'src/store/appSlice.ts'
    ];

    const authors = ['alice@company.com', 'bob@company.com', 'charlie@company.com', 'diana@company.com'];
    const severities = ['info', 'minor', 'major', 'critical', 'blocker'] as const;
    const hotspotTypes = ['bug', 'vulnerability', 'code_smell'] as const;

    return mockPaths.map(path => {
      const name = path.split('/').pop() || 'unknown';
      const size = Math.floor(Math.random() * 500) + 50;
      
      // Generate quality scores with some correlation
      const baseQuality = Math.random() * 40 + 40; // 40-80 base
      const maintainability = Math.max(0, Math.min(100, baseQuality + (Math.random() - 0.5) * 20));
      const complexity = Math.max(0, Math.min(100, 100 - baseQuality + (Math.random() - 0.5) * 15));
      const duplication = Math.max(0, Math.min(100, Math.random() * 30));
      const coverage = Math.max(0, Math.min(100, baseQuality + Math.random() * 30));
      const bugs = Math.floor(Math.random() * 5);
      const vulnerabilities = Math.floor(Math.random() * 3);
      const codeSmells = Math.floor(Math.random() * 10) + 1;
      
      // Generate hotspots
      const hotspotCount = bugs + vulnerabilities + codeSmells;
      const hotspots = Array.from({ length: Math.min(hotspotCount, 15) }, (_, i) => {
        const type = hotspotTypes[Math.floor(Math.random() * hotspotTypes.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        return {
          line: Math.floor(Math.random() * size) + 1,
          type,
          severity,
          message: `${type.replace('_', ' ')} detected: ${getRandomIssueMessage(type)}`,
          effort: Math.floor(Math.random() * 60) + 5 // 5-65 minutes
        };
      });

      return {
        path,
        name,
        size,
        quality: {
          overall: (maintainability + (100 - complexity) + coverage) / 3,
          maintainability,
          complexity,
          duplication,
          coverage,
          bugs,
          vulnerabilities,
          codeSmells
        },
        hotspots,
        technicalDebt: hotspots.reduce((sum, h) => sum + h.effort, 0),
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        author: authors[Math.floor(Math.random() * authors.length)]
      };
    });
  }, []);

  const getRandomIssueMessage = (type: string): string => {
    const messages = {
      bug: [
        'Potential null pointer dereference',
        'Resource leak detected',
        'Infinite loop possibility',
        'Array index out of bounds',
        'Unhandled exception'
      ],
      vulnerability: [
        'SQL injection vulnerability',
        'Cross-site scripting (XSS)',
        'Insecure random number generation',
        'Weak cryptographic algorithm',
        'Path traversal vulnerability'
      ],
      code_smell: [
        'Long method detected',
        'High cyclomatic complexity',
        'Duplicated code block',
        'Large class with too many responsibilities',
        'Unused import statement'
      ]
    };
    
    const typeMessages = messages[type as keyof typeof messages] || ['Unknown issue'];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  const generateMockMetrics = useCallback((): QualityMetric[] => {
    return [
      {
        id: 'overall',
        name: 'Overall Quality',
        value: Math.random() * 30 + 65,
        threshold: { good: 80, warning: 60, critical: 40 },
        trend: Math.random() > 0.5 ? 'up' : 'down',
        description: 'Overall code quality score based on all metrics'
      },
      {
        id: 'maintainability',
        name: 'Maintainability',
        value: Math.random() * 25 + 70,
        threshold: { good: 85, warning: 65, critical: 45 },
        trend: Math.random() > 0.6 ? 'up' : 'stable',
        description: 'How easy it is to maintain and modify the code'
      },
      {
        id: 'reliability',
        name: 'Reliability',
        value: Math.random() * 20 + 75,
        threshold: { good: 90, warning: 70, critical: 50 },
        trend: Math.random() > 0.4 ? 'up' : 'down',
        description: 'Likelihood of software functioning without failure'
      },
      {
        id: 'security',
        name: 'Security',
        value: Math.random() * 15 + 80,
        threshold: { good: 95, warning: 80, critical: 60 },
        trend: 'up',
        description: 'Security posture and vulnerability management'
      },
      {
        id: 'coverage',
        name: 'Test Coverage',
        value: Math.random() * 25 + 70,
        threshold: { good: 90, warning: 75, critical: 50 },
        trend: Math.random() > 0.3 ? 'up' : 'stable',
        description: 'Percentage of code covered by automated tests'
      }
    ];
  }, []);

  const generateMockTrends = useCallback((): QualityTrend[] => {
    const baseValues = {
      overall: 75,
      maintainability: 80,
      reliability: 85,
      security: 90,
      coverage: 70
    };

    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      overall: baseValues.overall + Math.sin(i / 5) * 5 + (Math.random() - 0.5) * 3,
      maintainability: baseValues.maintainability + Math.sin(i / 7) * 4 + (Math.random() - 0.5) * 2,
      reliability: baseValues.reliability + Math.sin(i / 6) * 3 + (Math.random() - 0.5) * 2,
      security: baseValues.security + Math.sin(i / 8) * 2 + (Math.random() - 0.5) * 1,
      coverage: baseValues.coverage + Math.sin(i / 4) * 8 + (Math.random() - 0.5) * 4
    }));
  }, []);

  useEffect(() => {
    setFiles(generateMockFiles());
    setQualityMetrics(generateMockMetrics());
    setQualityTrends(generateMockTrends());
  }, [generateMockFiles, generateMockMetrics, generateMockTrends]);

  const renderHeatmap = useCallback(() => {
    if (!files.length || !heatmapRef.current) return;

    const svg = d3.select(heatmapRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 40, bottom: 100, left: 200 };
    const cellSize = 25;
    const width = files.length * cellSize + margin.left + margin.right;
    const height = 8 * cellSize + margin.top + margin.bottom; // 8 quality metrics

    svg.attr('width', width).attr('height', height);

    const metrics = ['overall', 'maintainability', 'complexity', 'duplication', 'coverage', 'bugs', 'vulnerabilities', 'codeSmells'];
    const metricLabels = {
      overall: 'Overall',
      maintainability: 'Maintainability',
      complexity: 'Complexity',
      duplication: 'Duplication',
      coverage: 'Coverage',
      bugs: 'Bugs',
      vulnerabilities: 'Vulnerabilities',
      codeSmells: 'Code Smells'
    };

    // Create color scales for different metrics
    const getColorScale = (metric: string) => {
      if (['bugs', 'vulnerabilities', 'codeSmells', 'complexity', 'duplication'].includes(metric)) {
        // Lower is better (red to green reversed)
        return d3.scaleSequential(d3.interpolateRdYlGn).domain([100, 0]);
      } else {
        // Higher is better (red to green)
        return d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 100]);
      }
    };

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Filter files based on severity if needed
    const filteredFiles = filterSeverity === 'all' ? files : 
      files.filter(file => {
        const hasSeverity = file.hotspots.some(h => h.severity === filterSeverity);
        return hasSeverity;
      });

    // Create heatmap cells
    metrics.forEach((metric, metricIndex) => {
      const colorScale = getColorScale(metric);
      
      const row = g.selectAll(`.metric-${metric}`)
        .data(filteredFiles)
        .join('g')
        .attr('class', `metric-${metric}`);

      row.append('rect')
        .attr('x', (d, i) => i * cellSize)
        .attr('y', metricIndex * cellSize)
        .attr('width', cellSize - 1)
        .attr('height', cellSize - 1)
        .attr('fill', d => {
          const value = metric === 'bugs' || metric === 'vulnerabilities' || metric === 'codeSmells' 
            ? d.quality[metric as keyof typeof d.quality] as number
            : d.quality[metric as keyof typeof d.quality] as number;
          return colorScale(value);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          setHoveredCell({ file: d, metric });
          d3.select(this).attr('stroke-width', 2).attr('stroke', '#333');
        })
        .on('mouseout', function() {
          setHoveredCell(null);
          d3.select(this).attr('stroke-width', 1).attr('stroke', 'white');
        })
        .on('click', (event, d) => {
          setSelectedFile(d);
        });
    });

    // Add metric labels (Y-axis)
    g.selectAll('.metric-label')
      .data(metrics)
      .join('text')
      .attr('class', 'metric-label')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .text(d => metricLabels[d as keyof typeof metricLabels]);

    // Add file labels (X-axis) - rotated
    g.selectAll('.file-label')
      .data(filteredFiles)
      .join('text')
      .attr('class', 'file-label')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', metrics.length * cellSize + 15)
      .attr('text-anchor', 'start')
      .attr('transform', (d, i) => `rotate(45, ${i * cellSize + cellSize / 2}, ${metrics.length * cellSize + 15})`)
      .attr('font-size', '10px')
      .attr('fill', 'currentColor')
      .text(d => d.name);

  }, [files, filterSeverity]);

  useEffect(() => {
    renderHeatmap();
  }, [renderHeatmap]);

  const getQualityColor = (value: number, metric: QualityMetric) => {
    if (value >= metric.threshold.good) return 'text-green-600 dark:text-green-400';
    if (value >= metric.threshold.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityIcon = (value: number, metric: QualityMetric) => {
    if (value >= metric.threshold.good) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (value >= metric.threshold.warning) return <Target className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'bg-red-600 text-white';
      case 'critical':
        return 'bg-red-500 text-white';
      case 'major':
        return 'bg-orange-500 text-white';
      case 'minor':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const formatTechnicalDebt = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Quality Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {qualityMetrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedMetric === metric.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {metric.id === 'overall' && <HeatMap className="h-4 w-4" />}
                    {metric.id === 'maintainability' && <Settings className="h-4 w-4" />}
                    {metric.id === 'reliability' && <CheckCircle className="h-4 w-4" />}
                    {metric.id === 'security' && <Shield className="h-4 w-4" />}
                    {metric.id === 'coverage' && <Target className="h-4 w-4" />}
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{metric.name}</span>
                    {getQualityIcon(metric.value, metric)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getQualityColor(metric.value, metric)}`}>
                      {metric.value.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">/100</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {metric.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Heatmap Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HeatMap className="h-5 w-5" />
              Code Quality Heatmap
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filter by severity:</span>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="blocker">Blocker</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Heatmap */}
            <div className="xl:col-span-3">
              <div className="relative bg-white dark:bg-gray-900 rounded-lg border p-4 overflow-x-auto">
                <svg ref={heatmapRef} className="min-w-full" />
                
                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Quality Score:</span>
                    <div className="flex items-center gap-1">
                      {['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850'].map((color, i) => (
                        <div key={i} className="w-4 h-4 border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">Low → High</span>
                  </div>
                </div>
              </div>
              
              {/* Hover Details */}
              {hoveredCell && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="h-4 w-4" />
                    <span className="font-medium">{hoveredCell.file.name}</span>
                    <Badge variant="outline">{hoveredCell.metric}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Value:</span>
                      <div className="font-medium">
                        {(hoveredCell.file.quality[hoveredCell.metric as keyof typeof hoveredCell.file.quality] as number).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Size:</span>
                      <div className="font-medium">{hoveredCell.file.size} lines</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tech Debt:</span>
                      <div className="font-medium">{formatTechnicalDebt(hoveredCell.file.technicalDebt)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Hotspots:</span>
                      <div className="font-medium">{hoveredCell.file.hotspots.length}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* File Details Panel */}
            <div className="space-y-4">
              {selectedFile ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        File Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-1">{selectedFile.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedFile.path}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Size:</span>
                          <div className="font-medium">{selectedFile.size} lines</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Tech Debt:</span>
                          <div className="font-medium">{formatTechnicalDebt(selectedFile.technicalDebt)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Author:</span>
                          <div className="font-medium text-xs">{selectedFile.author}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                          <div className="font-medium text-xs">
                            {selectedFile.lastModified.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Quality Breakdown</h5>
                        {Object.entries({
                          'Overall': selectedFile.quality.overall,
                          'Maintainability': selectedFile.quality.maintainability,
                          'Complexity': 100 - selectedFile.quality.complexity,
                          'Coverage': selectedFile.quality.coverage
                        }).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <span>{label}</span>
                            <span className="font-medium">{value.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2 border-t">
                        <Button size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Source
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Hotspots */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Hotspots ({selectedFile.hotspots.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {selectedFile.hotspots.slice(0, 10).map((hotspot, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className={`text-xs ${getSeverityColor(hotspot.severity)}`}>
                                {hotspot.severity}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {hotspot.effort}m
                              </div>
                            </div>
                            
                            <div className="text-sm mb-1">
                              <span className="font-medium">Line {hotspot.line}:</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {hotspot.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {hotspot.message}
                            </p>
                          </div>
                        ))}
                        
                        {selectedFile.hotspots.length > 10 && (
                          <div className="text-center text-sm text-gray-500">
                            +{selectedFile.hotspots.length - 10} more hotspots
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <HeatMap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click on a cell in the heatmap to view detailed information
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeQualityHeatmap;
