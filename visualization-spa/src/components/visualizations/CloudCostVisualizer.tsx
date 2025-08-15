import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  ButtonGroup,
  Button,
  Tooltip,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  CloudQueue,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  CompareArrows,
  Refresh,
  Download,
  FilterList,
  Insights
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualizationTheme } from '../../types/visualizations';

// Mock type definition
interface CloudRecommendation {
  provider: string;
  services: any[];
  totalCost: {
    monthly: number;
    yearly: number;
    breakdown: any;
  };
  deployment: any;
  optimization: {
    suggestions: string[];
    potentialSavings: number;
    performanceImpact: string;
  };
}

interface CloudCostVisualizerProps {
  recommendations: CloudRecommendation[];
  theme: VisualizationTheme;
  viewMode: 'overview' | 'detailed';
  onProviderSelect: (provider: string) => void;
}

const CLOUD_COLORS = {
  'AWS': '#FF9900',
  'Azure': '#0078D4',
  'GCP': '#4285F4',
  'Oracle': '#F80000',
  'IBM': '#1261FE',
  'Alibaba': '#FF6A00'
};

const CloudCostVisualizer: React.FC<CloudCostVisualizerProps> = ({
  recommendations,
  theme,
  viewMode,
  onProviderSelect
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | 'radar'>('bar');
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [costCategory, setCostCategory] = useState<'total' | 'compute' | 'storage' | 'network'>('total');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Process cost data for visualizations
  const costData = useMemo(() => {
    if (!recommendations) return [];
    
    return recommendations.map(rec => ({
      provider: rec.provider,
      monthly: rec.totalCost.monthly,
      yearly: rec.totalCost.yearly,
      compute: rec.totalCost.breakdown.compute,
      storage: rec.totalCost.breakdown.storage,
      network: rec.totalCost.breakdown.network,
      services: rec.totalCost.breakdown.services,
      color: CLOUD_COLORS[rec.provider as keyof typeof CLOUD_COLORS] || '#757575'
    }));
  }, [recommendations]);

  // Cost comparison data
  const comparisonData = useMemo(() => {
    if (!costData.length) return [];
    
    const categories = ['compute', 'storage', 'network', 'services'];
    return categories.map(category => {
      const categoryData: any = { category };
      costData.forEach(provider => {
        categoryData[provider.provider] = provider[category as keyof typeof provider];
      });
      return categoryData;
    });
  }, [costData]);

  // Savings opportunities data
  const savingsData = useMemo(() => {
    if (!recommendations) return [];
    
    return recommendations.map(rec => ({
      provider: rec.provider,
      currentCost: rec.totalCost[timeframe],
      optimizedCost: rec.totalCost[timeframe] - (rec.optimization?.potentialSavings || 0),
      savings: rec.optimization?.potentialSavings || 0,
      savingsPercent: rec.optimization?.potentialSavings 
        ? Math.round((rec.optimization.potentialSavings / rec.totalCost[timeframe]) * 100)
        : 0
    }));
  }, [recommendations, timeframe]);

  // Performance vs Cost data for radar chart
  const performanceData = useMemo(() => {
    if (!recommendations) return [];
    
    return recommendations.map(rec => {
      const services = rec.services || [];
      const avgPerformance = services.reduce((acc, service) => {
        const perfScore = (
          parseInt(service.performance?.cpu || '0') +
          parseInt(service.performance?.memory || '0') +
          parseInt(service.performance?.storage || '0')
        ) / 3;
        return acc + perfScore;
      }, 0) / services.length || 0;
      
      return {
        provider: rec.provider,
        cost: rec.totalCost[timeframe],
        performance: avgPerformance,
        reliability: 85 + Math.random() * 15, // Simulated data
        scalability: 80 + Math.random() * 20,
        security: 90 + Math.random() * 10,
        support: 75 + Math.random() * 25
      };
    });
  }, [recommendations, timeframe]);

  const handleChartTypeChange = useCallback((type: 'bar' | 'pie' | 'line' | 'radar') => {
    setChartType(type);
  }, []);

  const handleTimeframeChange = useCallback((event: SelectChangeEvent) => {
    setTimeframe(event.target.value as 'monthly' | 'yearly');
  }, []);

  const handleCategoryChange = useCallback((event: SelectChangeEvent) => {
    setCostCategory(event.target.value as 'total' | 'compute' | 'storage' | 'network');
  }, []);

  const renderChart = () => {
    const data = costCategory === 'total' ? costData : comparisonData;
    
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis 
                dataKey={costCategory === 'total' ? 'provider' : 'category'} 
                stroke={theme.text}
              />
              <YAxis stroke={theme.text} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cost']}
              />
              <Legend />
              {costCategory === 'total' ? (
                <Bar
                  dataKey={timeframe}
                  fill={theme.primary}
                  name={`${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Cost`}
                />
              ) : (
                costData.map(provider => (
                  <Bar
                    key={provider.provider}
                    dataKey={provider.provider}
                    fill={provider.color}
                    name={provider.provider}
                  />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={costData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey={timeframe}
                nameKey="provider"
                label={(entry) => `${entry.provider}: $${entry[timeframe].toLocaleString()}`}
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cost']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={savingsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="provider" stroke={theme.text} />
              <YAxis stroke={theme.text} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="currentCost"
                stroke={theme.primary}
                strokeWidth={2}
                name="Current Cost"
              />
              <Line
                type="monotone"
                dataKey="optimizedCost"
                stroke={theme.accent}
                strokeWidth={2}
                name="Optimized Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={performanceData}>
              <PolarGrid stroke={theme.border} />
              <PolarAngleAxis dataKey="provider" tick={{ fontSize: 12, fill: theme.text }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: theme.textSecondary }}
              />
              <Radar
                name="Performance"
                dataKey="performance"
                stroke={theme.primary}
                fill={theme.primary}
                fillOpacity={0.3}
              />
              <Radar
                name="Reliability"
                dataKey="reliability"
                stroke={theme.secondary}
                fill={theme.secondary}
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={chartType === 'bar' ? 'contained' : 'outlined'}
                onClick={() => handleChartTypeChange('bar')}
                startIcon={<TrendingUp />}
              >
                Bar Chart
              </Button>
              <Button
                variant={chartType === 'pie' ? 'contained' : 'outlined'}
                onClick={() => handleChartTypeChange('pie')}
              >
                Pie Chart
              </Button>
              <Button
                variant={chartType === 'line' ? 'contained' : 'outlined'}
                onClick={() => handleChartTypeChange('line')}
              >
                Trend
              </Button>
              <Button
                variant={chartType === 'radar' ? 'contained' : 'outlined'}
                onClick={() => handleChartTypeChange('radar')}
              >
                Radar
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={timeframe}
                  label="Timeframe"
                  onChange={handleTimeframeChange}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={costCategory}
                  label="Category"
                  onChange={handleCategoryChange}
                >
                  <MenuItem value="total">Total</MenuItem>
                  <MenuItem value="compute">Compute</MenuItem>
                  <MenuItem value="storage">Storage</MenuItem>
                  <MenuItem value="network">Network</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Chart */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Cloud Cost Analysis - {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Typography>
              <Box>
                <Tooltip title="Refresh Data">
                  <IconButton size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Chart">
                  <IconButton size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            {renderChart()}
          </Paper>
        </Grid>

        {/* Summary Cards */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* Cost Summary */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cost Summary
                  </Typography>
                  {costData.map((provider, index) => (
                    <Box key={provider.provider} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: provider.color,
                              mr: 1
                            }}
                          />
                          <Typography variant="body2">{provider.provider}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          ${provider[timeframe].toLocaleString()}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(provider[timeframe] / Math.max(...costData.map(p => p[timeframe]))) * 100}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Savings Opportunities */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Optimization Opportunities
                  </Typography>
                  {savingsData.map((data, index) => (
                    <Box key={data.provider} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {data.provider}
                        </Typography>
                        <Chip
                          label={`${data.savingsPercent}% savings`}
                          size="small"
                          color={data.savingsPercent > 15 ? 'success' : data.savingsPercent > 5 ? 'warning' : 'default'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Save ${data.savings.toLocaleString()} {timeframe}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      startIcon={<CompareArrows />}
                      variant="outlined"
                      size="small"
                      fullWidth
                    >
                      Compare All Providers
                    </Button>
                    <Button
                      startIcon={<Insights />}
                      variant="outlined"
                      size="small"
                      fullWidth
                    >
                      Generate Report
                    </Button>
                    <Button
                      startIcon={<CloudQueue />}
                      variant="outlined"
                      size="small"
                      fullWidth
                    >
                      Migration Planner
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Detailed Breakdown Table */}
        {viewMode === 'detailed' && (
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Detailed Cost Breakdown
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell align="right">Compute</TableCell>
                        <TableCell align="right">Storage</TableCell>
                        <TableCell align="right">Network</TableCell>
                        <TableCell align="right">Services</TableCell>
                        <TableCell align="right">Total ({timeframe})</TableCell>
                        <TableCell align="right">Potential Savings</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costData.map((provider) => {
                        const savings = savingsData.find(s => s.provider === provider.provider);
                        return (
                          <TableRow key={provider.provider} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: provider.color,
                                    mr: 1
                                  }}
                                />
                                {provider.provider}
                              </Box>
                            </TableCell>
                            <TableCell align="right">${provider.compute.toLocaleString()}</TableCell>
                            <TableCell align="right">${provider.storage.toLocaleString()}</TableCell>
                            <TableCell align="right">${provider.network.toLocaleString()}</TableCell>
                            <TableCell align="right">${provider.services.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                ${provider[timeframe].toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {savings && (
                                <Chip
                                  label={`$${savings.savings.toLocaleString()}`}
                                  size="small"
                                  color={savings.savingsPercent > 15 ? 'success' : 'default'}
                                  icon={savings.savingsPercent > 0 ? <TrendingDown /> : undefined}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </motion.div>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default CloudCostVisualizer;