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
  Paper,
  Tooltip
} from '@mui/material';
import {
  Assessment,
  Code,
  BugReport,
  Security,
  Speed,
  Visibility,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';

interface CodeQualityHeatmapProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface QualityMetric {
  name: string;
  path: string;
  complexity: number;
  maintainability: number;
  reliability: number;
  security: number;
  testCoverage: number;
  technicalDebt: number; // hours
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  duplicatedLines: number;
}

interface QualityOverview {
  overallScore: number;
  totalFiles: number;
  highQuality: number;
  lowQuality: number;
  technicalDebt: number;
  trend: 'up' | 'down' | 'stable';
}

const CodeQualityHeatmap: React.FC<CodeQualityHeatmapProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [qualityData, setQualityData] = useState<QualityMetric[]>([]);
  const [qualityOverview, setQualityOverview] = useState<QualityOverview | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'complexity' | 'maintainability' | 'security' | 'reliability'>('complexity');
  const [selectedFile, setSelectedFile] = useState<QualityMetric | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const heatmapRef = useRef<SVGSVGElement>(null);

  // Mock data generation
  useEffect(() => {
    const generateMockData = (): QualityMetric[] => {
      const files = [
        'src/components/Button.tsx',
        'src/components/Modal.tsx',
        'src/components/Table.tsx',
        'src/utils/helpers.ts',
        'src/utils/validation.ts',
        'src/services/api.ts',
        'src/services/auth.ts',
        'src/hooks/useData.ts',
        'src/hooks/useAuth.ts',
        'src/pages/Dashboard.tsx',
        'src/pages/Settings.tsx',
        'src/pages/Profile.tsx'
      ];

      return files.map(path => ({
        name: path.split('/').pop() || '',
        path,
        complexity: Math.floor(Math.random() * 20) + 1,
        maintainability: Math.floor(Math.random() * 40) + 60,
        reliability: Math.floor(Math.random() * 30) + 70,
        security: Math.floor(Math.random() * 25) + 75,
        testCoverage: Math.floor(Math.random() * 50) + 50,
        technicalDebt: Math.floor(Math.random() * 8) + 1,
        bugs: Math.floor(Math.random() * 5),
        vulnerabilities: Math.floor(Math.random() * 3),
        codeSmells: Math.floor(Math.random() * 10) + 1,
        duplicatedLines: Math.floor(Math.random() * 50)
      }));
    };

    const data = generateMockData();
    setQualityData(data);

    // Calculate overview
    const overview: QualityOverview = {
      overallScore: Math.floor(data.reduce((sum, item) => sum + item.maintainability, 0) / data.length),
      totalFiles: data.length,
      highQuality: data.filter(item => item.maintainability >= 80).length,
      lowQuality: data.filter(item => item.maintainability < 60).length,
      technicalDebt: data.reduce((sum, item) => sum + item.technicalDebt, 0),
      trend: 'up'
    };
    setQualityOverview(overview);
  }, []);

  const getQualityColor = (value: number, metric: string) => {
    if (metric === 'complexity') {
      if (value <= 5) return '#22c55e'; // green
      if (value <= 10) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    } else {
      if (value >= 80) return '#22c55e'; // green
      if (value >= 60) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    }
  };

  const getQualityIcon = (value: number, metric: string) => {
    const isGood = metric === 'complexity' ? value <= 5 : value >= 80;
    const isMedium = metric === 'complexity' ? value <= 10 : value >= 60;
    
    if (isGood) return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
    if (isMedium) return <Warning sx={{ fontSize: 16, color: 'warning.main' }} />;
    return <Error sx={{ fontSize: 16, color: 'error.main' }} />;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <Assessment sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
  };

  // Heatmap visualization
  const renderHeatmap = useCallback(() => {
    if (!heatmapRef.current || !qualityData.length) return;

    const svg = d3.select(heatmapRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 100, bottom: 60, left: 150 };

    const filteredData = qualityData.filter(item => {
      if (filterLevel === 'all') return true;
      const score = item.maintainability;
      if (filterLevel === 'high') return score >= 80;
      if (filterLevel === 'medium') return score >= 60 && score < 80;
      return score < 60;
    });

    const cellWidth = (width - margin.left - margin.right) / 4; // 4 metrics
    const cellHeight = (height - margin.top - margin.bottom) / filteredData.length;

    const metrics = ['complexity', 'maintainability', 'reliability', 'security'];
    const metricLabels = ['Complexity', 'Maintainability', 'Reliability', 'Security'];

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create cells
    filteredData.forEach((file, fileIndex) => {
      metrics.forEach((metric, metricIndex) => {
        const value = file[metric as keyof QualityMetric] as number;
        const x = metricIndex * cellWidth;
        const y = fileIndex * cellHeight;

        g.append("rect")
          .attr("x", x)
          .attr("y", y)
          .attr("width", cellWidth - 1)
          .attr("height", cellHeight - 1)
          .attr("fill", getQualityColor(value, metric))
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .style("cursor", "pointer")
          .on("click", () => {
            setSelectedFile(file);
          })
          .append("title")
          .text(`${file.name} - ${metric}: ${value}`);

        // Add text if cell is large enough
        if (cellWidth > 60 && cellHeight > 20) {
          g.append("text")
            .attr("x", x + cellWidth / 2)
            .attr("y", y + cellHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("fill", "white")
            .text(value);
        }
      });
    });

    // Add file labels
    g.selectAll(".file-label")
      .data(filteredData)
      .enter().append("text")
      .attr("class", "file-label")
      .attr("x", -10)
      .attr("y", (d, i) => i * cellHeight + cellHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12px")
      .text(d => d.name);

    // Add metric labels
    g.selectAll(".metric-label")
      .data(metricLabels)
      .enter().append("text")
      .attr("class", "metric-label")
      .attr("x", (d, i) => i * cellWidth + cellWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(d => d);

  }, [qualityData, filterLevel]);

  useEffect(() => {
    renderHeatmap();
  }, [renderHeatmap]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Quality Overview Metrics */}
      {qualityOverview && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
          {[
            { label: 'Overall Score', value: qualityOverview.overallScore, icon: <Assessment sx={{ fontSize: 20 }} /> },
            { label: 'Total Files', value: qualityOverview.totalFiles, icon: <Code sx={{ fontSize: 20 }} /> },
            { label: 'High Quality', value: qualityOverview.highQuality, icon: <CheckCircle sx={{ fontSize: 20 }} /> },
            { label: 'Low Quality', value: qualityOverview.lowQuality, icon: <Warning sx={{ fontSize: 20 }} /> },
            { label: 'Tech Debt', value: `${qualityOverview.technicalDebt}h`, icon: <BugReport sx={{ fontSize: 20 }} /> }
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
                    {getTrendIcon(qualityOverview.trend)}
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {metric.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Heatmap Controls */}
      <Card>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ fontSize: 20 }} />
              Code Quality Heatmap
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  label="Filter"
                >
                  <MenuItem value="all">All Files</MenuItem>
                  <MenuItem value="high">High Quality</MenuItem>
                  <MenuItem value="medium">Medium Quality</MenuItem>
                  <MenuItem value="low">Low Quality</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as any)}
                  label="Metric"
                >
                  <MenuItem value="complexity">Complexity</MenuItem>
                  <MenuItem value="maintainability">Maintainability</MenuItem>
                  <MenuItem value="reliability">Reliability</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardHeader>

        <CardContent>
          <Paper sx={{ p: 2, backgroundColor: 'grey.50', overflow: 'auto' }}>
            <svg ref={heatmapRef} width="100%" height="400" />
          </Paper>
          
          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#22c55e' }} />
              <Typography variant="body2">Good</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#f59e0b' }} />
              <Typography variant="body2">Medium</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#ef4444' }} />
              <Typography variant="body2">Poor</Typography>
            </Box>
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
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Complexity</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: getQualityColor(selectedFile.complexity, 'complexity') }}>
                    {selectedFile.complexity}
                  </Typography>
                  {getQualityIcon(selectedFile.complexity, 'complexity')}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Maintainability</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: getQualityColor(selectedFile.maintainability, 'maintainability') }}>
                    {selectedFile.maintainability}%
                  </Typography>
                  {getQualityIcon(selectedFile.maintainability, 'maintainability')}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Reliability</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: getQualityColor(selectedFile.reliability, 'reliability') }}>
                    {selectedFile.reliability}%
                  </Typography>
                  {getQualityIcon(selectedFile.reliability, 'reliability')}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Security</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: getQualityColor(selectedFile.security, 'security') }}>
                    {selectedFile.security}%
                  </Typography>
                  {getQualityIcon(selectedFile.security, 'security')}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Technical Debt</Typography>
                <Typography variant="h5" color="warning.main">
                  {selectedFile.technicalDebt}h
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Issues</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2">Bugs: {selectedFile.bugs}</Typography>
                  <Typography variant="body2">Vulnerabilities: {selectedFile.vulnerabilities}</Typography>
                  <Typography variant="body2">Code Smells: {selectedFile.codeSmells}</Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CodeQualityHeatmap;