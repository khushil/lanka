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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TestTube2,
  FileCode,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Layers,
  PieChart,
  BarChart3,
} from 'lucide-react';

interface TestCoverageMapProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface CoverageData {
  name: string;
  path: string;
  coverage: number;
  lines: {
    total: number;
    covered: number;
    uncovered: number;
  };
  functions: {
    total: number;
    covered: number;
    uncovered: number;
  };
  branches: {
    total: number;
    covered: number;
    uncovered: number;
  };
  size: number;
  children?: CoverageData[];
  type: 'file' | 'directory';
}

interface CoverageMetrics {
  overall: number;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  trend: 'up' | 'down' | 'stable';
  history: Array<{
    date: string;
    coverage: number;
  }>;
}

const TestCoverageMap: React.FC<TestCoverageMapProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [visualizationType, setVisualizationType] = useState<'treemap' | 'sunburst'>('treemap');
  const [selectedFile, setSelectedFile] = useState<CoverageData | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [coverageMetrics, setCoverageMetrics] = useState<CoverageMetrics | null>(null);
  const [filterThreshold, setFilterThreshold] = useState<number>(0);
  const [hoveredNode, setHoveredNode] = useState<CoverageData | null>(null);
  
  const treemapRef = useRef<SVGSVGElement>(null);
  const sunburstRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Mock data generation
  const generateMockCoverageData = useCallback((): CoverageData => {
    const mockFiles = [
      { name: 'components', type: 'directory' as const, files: [
        'Button.tsx', 'Card.tsx', 'Modal.tsx', 'Form.tsx', 'Table.tsx'
      ]},
      { name: 'hooks', type: 'directory' as const, files: [
        'useAuth.ts', 'useApi.ts', 'useLocalStorage.ts', 'useDebounce.ts'
      ]},
      { name: 'utils', type: 'directory' as const, files: [
        'formatters.ts', 'validators.ts', 'helpers.ts', 'constants.ts'
      ]},
      { name: 'services', type: 'directory' as const, files: [
        'api.ts', 'auth.ts', 'analytics.ts', 'websocket.ts'
      ]},
      { name: 'pages', type: 'directory' as const, files: [
        'Dashboard.tsx', 'Settings.tsx', 'Profile.tsx', 'Reports.tsx'
      ]}
    ];

    const createFileData = (name: string): CoverageData => {
      const lines = Math.floor(Math.random() * 500) + 50;
      const functions = Math.floor(Math.random() * 30) + 5;
      const branches = Math.floor(Math.random() * 40) + 10;
      
      const lineCoverage = Math.random() * 100;
      const functionCoverage = Math.random() * 100;
      const branchCoverage = Math.random() * 100;
      
      return {
        name,
        path: `src/${name}`,
        coverage: (lineCoverage + functionCoverage + branchCoverage) / 3,
        lines: {
          total: lines,
          covered: Math.floor(lines * lineCoverage / 100),
          uncovered: lines - Math.floor(lines * lineCoverage / 100)
        },
        functions: {
          total: functions,
          covered: Math.floor(functions * functionCoverage / 100),
          uncovered: functions - Math.floor(functions * functionCoverage / 100)
        },
        branches: {
          total: branches,
          covered: Math.floor(branches * branchCoverage / 100),
          uncovered: branches - Math.floor(branches * branchCoverage / 100)
        },
        size: lines,
        type: 'file'
      };
    };

    const children = mockFiles.map(dir => ({
      name: dir.name,
      path: `src/${dir.name}`,
      coverage: 0,
      lines: { total: 0, covered: 0, uncovered: 0 },
      functions: { total: 0, covered: 0, uncovered: 0 },
      branches: { total: 0, covered: 0, uncovered: 0 },
      size: 0,
      type: 'directory' as const,
      children: dir.files.map(file => createFileData(file))
    }));

    // Calculate aggregated data for directories
    children.forEach(dir => {
      if (dir.children) {
        dir.lines.total = dir.children.reduce((sum, child) => sum + child.lines.total, 0);
        dir.lines.covered = dir.children.reduce((sum, child) => sum + child.lines.covered, 0);
        dir.lines.uncovered = dir.lines.total - dir.lines.covered;
        
        dir.functions.total = dir.children.reduce((sum, child) => sum + child.functions.total, 0);
        dir.functions.covered = dir.children.reduce((sum, child) => sum + child.functions.covered, 0);
        dir.functions.uncovered = dir.functions.total - dir.functions.covered;
        
        dir.branches.total = dir.children.reduce((sum, child) => sum + child.branches.total, 0);
        dir.branches.covered = dir.children.reduce((sum, child) => sum + child.branches.covered, 0);
        dir.branches.uncovered = dir.branches.total - dir.branches.covered;
        
        dir.size = dir.children.reduce((sum, child) => sum + child.size, 0);
        dir.coverage = dir.lines.total > 0 ? (dir.lines.covered / dir.lines.total) * 100 : 0;
      }
    });

    const root: CoverageData = {
      name: 'src',
      path: 'src',
      coverage: 0,
      lines: { total: 0, covered: 0, uncovered: 0 },
      functions: { total: 0, covered: 0, uncovered: 0 },
      branches: { total: 0, covered: 0, uncovered: 0 },
      size: 0,
      type: 'directory',
      children
    };

    // Calculate root aggregated data
    root.lines.total = children.reduce((sum, child) => sum + child.lines.total, 0);
    root.lines.covered = children.reduce((sum, child) => sum + child.lines.covered, 0);
    root.lines.uncovered = root.lines.total - root.lines.covered;
    
    root.functions.total = children.reduce((sum, child) => sum + child.functions.total, 0);
    root.functions.covered = children.reduce((sum, child) => sum + child.functions.covered, 0);
    root.functions.uncovered = root.functions.total - root.functions.covered;
    
    root.branches.total = children.reduce((sum, child) => sum + child.branches.total, 0);
    root.branches.covered = children.reduce((sum, child) => sum + child.branches.covered, 0);
    root.branches.uncovered = root.branches.total - root.branches.covered;
    
    root.size = children.reduce((sum, child) => sum + child.size, 0);
    root.coverage = root.lines.total > 0 ? (root.lines.covered / root.lines.total) * 100 : 0;

    return root;
  }, []);

  const generateMockMetrics = useCallback((): CoverageMetrics => {
    const overall = Math.floor(Math.random() * 30) + 70;
    return {
      overall,
      lines: overall + Math.floor(Math.random() * 10) - 5,
      functions: overall + Math.floor(Math.random() * 10) - 5,
      branches: overall - Math.floor(Math.random() * 10),
      statements: overall + Math.floor(Math.random() * 5) - 2,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
      history: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        coverage: overall + Math.sin(i / 5) * 10 + Math.random() * 5 - 2.5
      }))
    };
  }, []);

  useEffect(() => {
    setCoverageData(generateMockCoverageData());
    setCoverageMetrics(generateMockMetrics());
  }, [generateMockCoverageData, generateMockMetrics]);

  const renderTreemap = useCallback(() => {
    if (!coverageData || !treemapRef.current) return;

    const svg = d3.select(treemapRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    svg.attr('width', width).attr('height', height);

    const root = d3.hierarchy(coverageData)
      .sum(d => d.size)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3.treemap<CoverageData>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .padding(2)
      .round(true);

    treemap(root);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([0, 100]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const leaves = g.selectAll('.leaf')
      .data(root.leaves().filter(d => d.data.coverage >= filterThreshold))
      .join('g')
      .attr('class', 'leaf')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    leaves.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => colorScale(d.data.coverage))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        setHoveredNode(d.data);
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#333');
      })
      .on('mouseout', function(event, d) {
        setHoveredNode(null);
        d3.select(this).attr('stroke-width', 1).attr('stroke', '#fff');
      })
      .on('click', (event, d) => {
        setSelectedFile(d.data);
      });

    leaves.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('font-size', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.min(12, Math.min(width / 8, height / 2));
      })
      .attr('fill', d => d.data.coverage > 50 ? '#000' : '#fff')
      .text(d => {
        const width = d.x1 - d.x0;
        return width > 80 ? d.data.name : '';
      });

    leaves.append('text')
      .attr('x', 4)
      .attr('y', 28)
      .attr('font-size', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.min(10, Math.min(width / 10, height / 3));
      })
      .attr('fill', d => d.data.coverage > 50 ? '#333' : '#ccc')
      .text(d => {
        const width = d.x1 - d.x0;
        return width > 100 ? `${d.data.coverage.toFixed(1)}%` : '';
      });
  }, [coverageData, filterThreshold]);

  const renderSunburst = useCallback(() => {
    if (!coverageData || !sunburstRef.current) return;

    const svg = d3.select(sunburstRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const root = d3.hierarchy(coverageData)
      .sum(d => d.size)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<CoverageData>()
      .size([2 * Math.PI, radius]);

    partition(root);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain([0, 100]);

    const arc = d3.arc<d3.HierarchyRectangularNode<CoverageData>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1)
      .cornerRadius(2);

    g.selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.coverage))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        setHoveredNode(d.data);
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#333');
      })
      .on('mouseout', function(event, d) {
        setHoveredNode(null);
        d3.select(this).attr('stroke-width', 1).attr('stroke', '#fff');
      })
      .on('click', (event, d) => {
        setSelectedFile(d.data);
      });

    // Add labels for larger segments
    g.selectAll('text')
      .data(root.descendants().filter(d => {
        const angle = d.x1 - d.x0;
        const radius = d.y1 - d.y0;
        return d.depth > 0 && angle > 0.1 && radius > 20;
      }))
      .join('text')
      .attr('transform', d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${angle * 180 / Math.PI - 90}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 + d.x1) / 2 > Math.PI ? 'end' : 'start')
      .attr('font-size', 10)
      .attr('fill', d => d.data.coverage > 50 ? '#000' : '#fff')
      .text(d => d.data.name);
  }, [coverageData]);

  useEffect(() => {
    if (visualizationType === 'treemap') {
      renderTreemap();
    } else {
      renderSunburst();
    }
  }, [visualizationType, renderTreemap, renderSunburst]);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'text-green-600 dark:text-green-400';
    if (coverage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCoverageIcon = (coverage: number) => {
    if (coverage >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (coverage >= 60) return <Target className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Coverage Overview Metrics */}
      {coverageMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Overall', value: coverageMetrics.overall, icon: <PieChart className="h-5 w-5" /> },
            { label: 'Lines', value: coverageMetrics.lines, icon: <FileCode className="h-5 w-5" /> },
            { label: 'Functions', value: coverageMetrics.functions, icon: <Layers className="h-5 w-5" /> },
            { label: 'Branches', value: coverageMetrics.branches, icon: <BarChart3 className="h-5 w-5" /> },
            { label: 'Statements', value: coverageMetrics.statements, icon: <TestTube2 className="h-5 w-5" /> }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      {metric.icon}
                    </div>
                    {getTrendIcon(coverageMetrics.trend)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                      {getCoverageIcon(metric.value)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getCoverageColor(metric.value)}`}>
                        {metric.value.toFixed(1)}%
                      </span>
                    </div>
                    
                    <Progress value={metric.value} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Visualization Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5" />
              Test Coverage Visualization
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
                <Select 
                  value={filterThreshold.toString()} 
                  onValueChange={(value) => setFilterThreshold(Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Files</SelectItem>
                    <SelectItem value="50">50%+ Coverage</SelectItem>
                    <SelectItem value="70">70%+ Coverage</SelectItem>
                    <SelectItem value="80">80%+ Coverage</SelectItem>
                    <SelectItem value="90">90%+ Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={visualizationType === 'treemap' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizationType('treemap')}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Treemap
                </Button>
                <Button
                  variant={visualizationType === 'sunburst' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizationType('sunburst')}
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  Sunburst
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Visualization */}
            <div className="lg:col-span-3">
              <div className="relative bg-white dark:bg-gray-900 rounded-lg border p-4">
                {visualizationType === 'treemap' ? (
                  <svg ref={treemapRef} className="w-full h-auto" />
                ) : (
                  <svg ref={sunburstRef} className="w-full h-auto" />
                )}
                
                {/* Legend */}
                <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                  <h4 className="text-sm font-medium mb-2">Coverage Scale</h4>
                  <div className="space-y-2">
                    {[
                      { range: '90-100%', color: '#22c55e', label: 'Excellent' },
                      { range: '70-89%', color: '#84cc16', label: 'Good' },
                      { range: '50-69%', color: '#eab308', label: 'Fair' },
                      { range: '0-49%', color: '#ef4444', label: 'Poor' }
                    ].map((item) => (
                      <div key={item.range} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.range}</span>
                        <span className="text-gray-500">({item.label})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Hover Tooltip */}
              {hoveredNode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="h-4 w-4" />
                    <span className="font-medium">{hoveredNode.name}</span>
                    <Badge variant={hoveredNode.coverage >= 80 ? 'default' : hoveredNode.coverage >= 60 ? 'secondary' : 'destructive'}>
                      {hoveredNode.coverage.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Lines:</span>
                      <div className="font-medium">
                        {hoveredNode.lines.covered}/{hoveredNode.lines.total}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Functions:</span>
                      <div className="font-medium">
                        {hoveredNode.functions.covered}/{hoveredNode.functions.total}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Branches:</span>
                      <div className="font-medium">
                        {hoveredNode.branches.covered}/{hoveredNode.branches.total}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* File Details Panel */}
            <div className="space-y-4">
              {selectedFile ? (
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
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Coverage</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getCoverageColor(selectedFile.coverage)}`}>
                            {selectedFile.coverage.toFixed(1)}%
                          </span>
                          {getCoverageIcon(selectedFile.coverage)}
                        </div>
                      </div>
                      
                      <Progress value={selectedFile.coverage} className="h-2" />
                      
                      <div className="space-y-2">
                        {[
                          { label: 'Lines', data: selectedFile.lines },
                          { label: 'Functions', data: selectedFile.functions },
                          { label: 'Branches', data: selectedFile.branches }
                        ].map((metric) => {
                          const percentage = metric.data.total > 0 ? (metric.data.covered / metric.data.total) * 100 : 0;
                          return (
                            <div key={metric.label} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{metric.label}</span>
                                <span className="font-medium">
                                  {metric.data.covered}/{metric.data.total}
                                </span>
                              </div>
                              <Progress value={percentage} className="h-1" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <Button size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Source
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <FileCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click on a file or directory to view detailed coverage information
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Coverage History */}
              {coverageMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Coverage Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {coverageMetrics.history.slice(-7).map((point, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="font-medium">
                            {point.coverage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
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

export default TestCoverageMap;
