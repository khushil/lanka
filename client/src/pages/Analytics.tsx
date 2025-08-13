import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container
} from '@mui/material';
import { MetricsOverview } from '../components/analytics/MetricsOverview';
import { RequirementsAnalytics } from '../components/analytics/RequirementsAnalytics';
import { DevelopmentMetrics } from '../components/analytics/DevelopmentMetrics';
import { SystemHealth } from '../components/analytics/SystemHealth';
import { MetricCategory } from '../types/analytics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`,
  };
}

export const Analytics: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analytics & Insights
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Comprehensive analytics and performance insights across all system components
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="analytics tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Requirements" {...a11yProps(1)} />
          <Tab label="Development" {...a11yProps(2)} />
          <Tab label="System Health" {...a11yProps(3)} />
        </Tabs>

        <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 280px)' }}>
          <TabPanel value={value} index={0}>
            <MetricsOverview
              refreshInterval={60000}
              categories={[
                MetricCategory.REQUIREMENTS,
                MetricCategory.DEVELOPMENT,
                MetricCategory.PERFORMANCE,
                MetricCategory.QUALITY,
                MetricCategory.SECURITY
              ]}
            />
          </TabPanel>

          <TabPanel value={value} index={1}>
            <RequirementsAnalytics refreshInterval={300000} />
          </TabPanel>

          <TabPanel value={value} index={2}>
            <DevelopmentMetrics refreshInterval={300000} />
          </TabPanel>

          <TabPanel value={value} index={3}>
            <SystemHealth refreshInterval={30000} />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};