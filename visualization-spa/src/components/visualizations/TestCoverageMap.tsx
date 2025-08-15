import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper
} from '@mui/material';
import {
  Science,
  Code,
  GpsFixed,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Visibility,
  FilterList,
  Download,
  Refresh,
  Layers,
  PieChart,
  BarChart,
  Description,
  Assessment,
  Functions,
  BugReport
} from '@mui/icons-material';

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
  statements: {
    total: number;
    covered: number;
    uncovered: number;
  };
  type: 'file' | 'directory';
  children?: CoverageData[];
}

interface CoverageMetrics {
  overall: number;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  trend: 'up' | 'down' | 'stable';
  totalFiles: number;
  lowCoverage: number;
  highCoverage: number;
}

const TestCoverageMap: React.FC<TestCoverageMapProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [coverageData, setCoverageData] = useState<CoverageData[]>([]);
  const [coverageMetrics, setCoverageMetrics] = useState<CoverageMetrics | null>(null);
  const [selectedFile, setSelectedFile] = useState<CoverageData | null>(null);
  const [visualizationType, setVisualizationType] = useState<'treemap' | 'heatmap'>('treemap');
  const [filterThreshold, setFilterThreshold] = useState(0);
  
  const treemapRef = useRef<SVGSVGElement>(null);
  const heatmapRef = useRef<SVGSVGElement>(null);

  // Mock data generation
  useEffect(() => {
    const generateMockData = (): CoverageData[] => {
      return [
        {
          name: 'src',
          path: 'src',
          coverage: 78.5,
          type: 'directory',
          lines: { total: 1500, covered: 1177, uncovered: 323 },
          functions: { total: 120, covered: 95, uncovered: 25 },
          branches: { total: 200, covered: 156, uncovered: 44 },
          statements: { total: 800, covered: 628, uncovered: 172 },
          children: [
            {
              name: 'components',
              path: 'src/components',
              coverage: 85.2,
              type: 'directory',
              lines: { total: 800, covered: 681, uncovered: 119 },
              functions: { total: 60, covered: 51, uncovered: 9 },
              branches: { total: 100, covered: 85, uncovered: 15 },
              statements: { total: 400, covered: 341, uncovered: 59 },
              children: [
                {
                  name: 'Button.tsx',
                  path: 'src/components/Button.tsx',
                  coverage: 92.5,
                  type: 'file',
                  lines: { total: 120, covered: 111, uncovered: 9 },
                  functions: { total: 8, covered: 7, uncovered: 1 },
                  branches: { total: 15, covered: 14, uncovered: 1 },
                  statements: { total: 60, covered: 55, uncovered: 5 }
                },
                {
                  name: 'Modal.tsx',
                  path: 'src/components/Modal.tsx',
                  coverage: 88.7,
                  type: 'file',
                  lines: { total: 150, covered: 133, uncovered: 17 },
                  functions: { total: 12, covered: 11, uncovered: 1 },
                  branches: { total: 20, covered: 18, uncovered: 2 },
                  statements: { total: 75, covered: 67, uncovered: 8 }
                }
              ]
            },
            {
              name: 'utils',
              path: 'src/utils',
              coverage: 65.4,
              type: 'directory',
              lines: { total: 300, covered: 196, uncovered: 104 },
              functions: { total: 25, covered: 16, uncovered: 9 },
              branches: { total: 40, covered: 26, uncovered: 14 },
              statements: { total: 150, covered: 98, uncovered: 52 },
              children: [
                {
                  name: 'helpers.ts',
                  path: 'src/utils/helpers.ts',
                  coverage: 58.3,
                  type: 'file',
                  lines: { total: 200, covered: 116, uncovered: 84 },
                  functions: { total: 15, covered: 9, uncovered: 6 },
                  branches: { total: 25, covered: 15, uncovered: 10 },
                  statements: { total: 100, covered: 58, uncovered: 42 }
                }
              ]
            }
          ]
        }
      ];
    };

    const data = generateMockData();
    setCoverageData(data);
    
    // Calculate metrics
    const calculateMetrics = (data: CoverageData[]): CoverageMetrics => {
      let totalLines = 0, coveredLines = 0;
      let totalFunctions = 0, coveredFunctions = 0;
      let totalBranches = 0, coveredBranches = 0;
      let totalStatements = 0, coveredStatements = 0;
      let fileCount = 0;
      let lowCoverageFiles = 0;
      let highCoverageFiles = 0;

      const traverse = (items: CoverageData[]) => {
        items.forEach(item => {
          if (item.type === 'file') {
            fileCount++;
            if (item.coverage < 70) lowCoverageFiles++;
            if (item.coverage >= 80) highCoverageFiles++;
          }
          
          totalLines += item.lines.total;
          coveredLines += item.lines.covered;
          totalFunctions += item.functions.total;
          coveredFunctions += item.functions.covered;
          totalBranches += item.branches.total;
          coveredBranches += item.branches.covered;
          totalStatements += item.statements.total;
          coveredStatements += item.statements.covered;
          
          if (item.children) traverse(item.children);
        });
      };

      traverse(data);

      return {
        overall: (coveredLines / totalLines) * 100,
        lines: (coveredLines / totalLines) * 100,
        functions: (coveredFunctions / totalFunctions) * 100,
        branches: (coveredBranches / totalBranches) * 100,
        statements: (coveredStatements / totalStatements) * 100,
        trend: 'up',
        totalFiles: fileCount,
        lowCoverage: lowCoverageFiles,
        highCoverage: highCoverageFiles
      };
    };

    setCoverageMetrics(calculateMetrics(data));
  }, []);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'success.main';
    if (coverage >= 60) return 'warning.main';
    return 'error.main';
  };

  const getCoverageIcon = (coverage: number) => {
    if (coverage >= 80) return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
    if (coverage >= 60) return <GpsFixed sx={{ fontSize: 16, color: 'warning.main' }} />;
    return <Warning sx={{ fontSize: 16, color: 'error.main' }} />;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <BarChart sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
  };

  // Treemap visualization
  const renderTreemap = useCallback(() => {
    if (!treemapRef.current || !coverageData.length) return;

    const svg = d3.select(treemapRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    // Flatten the data for treemap
    const flattenData = (items: CoverageData[]): CoverageData[] => {
      const result: CoverageData[] = [];
      items.forEach(item => {
        if (item.type === 'file' && item.coverage >= filterThreshold) {
          result.push(item);
        }
        if (item.children) {
          result.push(...flattenData(item.children));
        }
      });
      return result;
    };

    const flatData = flattenData(coverageData);
    
    const root = d3.hierarchy({ children: flatData } as any)
      .sum((d: any) => d.lines?.total || 0);

    const treemap = d3.treemap()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .padding(2);

    treemap(root);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const cells = g.selectAll(".cell")
      .data(root.leaves())
      .enter().append("g")
      .attr("class", "cell")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    cells.append("rect")
      .attr("width", (d: any) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d: any) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d: any) => {
        const coverage = d.data.coverage;
        if (coverage >= 80) return '#22c55e';
        if (coverage >= 60) return '#f59e0b';
        return '#ef4444';
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        setSelectedFile(d.data);
      });

    cells.append("text")
      .attr("x", 4)
      .attr("y", 16)
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text((d: any) => d.data.name);

    cells.append("text")
      .attr("x", 4)
      .attr("y", 30)
      .attr("font-size", "10px")
      .attr("fill", "white")
      .text((d: any) => `${d.data.coverage.toFixed(1)}%`);

  }, [coverageData, filterThreshold]);

  useEffect(() => {
    if (visualizationType === 'treemap') {
      renderTreemap();
    }
  }, [visualizationType, renderTreemap]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Coverage Overview Metrics */}
      {coverageMetrics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
          {[
            { label: 'Overall', value: coverageMetrics.overall, icon: <PieChart sx={{ fontSize: 20 }} /> },
            { label: 'Lines', value: coverageMetrics.lines, icon: <Description sx={{ fontSize: 20 }} /> },
            { label: 'Functions', value: coverageMetrics.functions, icon: <Functions sx={{ fontSize: 20 }} /> },
            { label: 'Branches', value: coverageMetrics.branches, icon: <BarChart sx={{ fontSize: 20 }} /> },
            { label: 'Statements', value: coverageMetrics.statements, icon: <Assessment sx={{ fontSize: 20 }} /> }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ p: 1, backgroundColor: 'primary.50', borderRadius: 1 }}>
                      {metric.icon}
                    </Box>
                    {getTrendIcon(coverageMetrics.trend)}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                      {getCoverageIcon(metric.value)}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: getCoverageColor(metric.value) }}>
                        {metric.value.toFixed(1)}%
                      </Typography>
                    </Box>
                    
                    <LinearProgress variant="determinate" value={metric.value} sx={{ height: 4 }} />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Visualization Controls */}
      <Card>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Science sx={{ fontSize: 20 }} />
              Test Coverage Visualization
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Filter:</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={filterThreshold.toString()}
                    onChange={(e) => setFilterThreshold(Number(e.target.value))}
                  >
                    <MenuItem value="0">All Files</MenuItem>
                    <MenuItem value="50">50%+ Coverage</MenuItem>
                    <MenuItem value="70">70%+ Coverage</MenuItem>
                    <MenuItem value="80">80%+ Coverage</MenuItem>
                    <MenuItem value="90">90%+ Coverage</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant={visualizationType === 'treemap' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setVisualizationType('treemap')}
                >
                  Treemap
                </Button>
                <Button
                  variant={visualizationType === 'heatmap' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setVisualizationType('heatmap')}
                >
                  Heatmap
                </Button>
              </Box>
            </Box>
          </Box>
        </CardHeader>

        <CardContent>
          <Box sx={{ position: 'relative', minHeight: 400 }}>
            {visualizationType === 'treemap' && (
              <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <svg ref={treemapRef} width="100%" height="400" />
              </Paper>
            )}
            
            {visualizationType === 'heatmap' && (
              <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <svg ref={heatmapRef} width="100%" height="400" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Heatmap visualization coming soon...
                </Typography>
              </Paper>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* File Details */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <Typography variant="h6">File Details: {selectedFile.name}</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Coverage</Typography>
                <Typography variant="h4" color={getCoverageColor(selectedFile.coverage)}>
                  {selectedFile.coverage.toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Path</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedFile.path}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Lines</Typography>
                <Typography variant="body2">
                  {selectedFile.lines.covered} / {selectedFile.lines.total}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Functions</Typography>
                <Typography variant="body2">
                  {selectedFile.functions.covered} / {selectedFile.functions.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TestCoverageMap;