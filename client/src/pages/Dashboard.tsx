import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Code,
  Architecture,
  Hub as Integration,
} from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'primary' 
}) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {trend !== undefined && (
            <Box display="flex" alignItems="center" mt={1}>
              <TrendingUp 
                sx={{ 
                  fontSize: 16, 
                  mr: 0.5, 
                  color: trend > 0 ? 'success.main' : 'error.main' 
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ color: trend > 0 ? 'success.main' : 'error.main' }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box 
          sx={{ 
            color: `${color}.main`,
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to LANKA UI - Your comprehensive development intelligence platform
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Active Requirements"
            value={24}
            icon={<Architecture />}
            trend={12}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Code Quality Score"
            value="94%"
            icon={<Code />}
            trend={3}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Integration Tests"
            value={156}
            icon={<Integration />}
            trend={-2}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Deployment Success"
            value="98.7%"
            icon={<TrendingUp />}
            trend={5}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Quick Access Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Requirements
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {[
                  { title: 'User Authentication System', status: 'In Progress', priority: 'High' },
                  { title: 'Data Visualization Dashboard', status: 'Review', priority: 'Medium' },
                  { title: 'API Rate Limiting', status: 'Completed', priority: 'Low' },
                ].map((req, index) => (
                  <Box key={index} display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">{req.title}</Typography>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={req.status} 
                        size="small" 
                        color={req.status === 'Completed' ? 'success' : 'default'}
                      />
                      <Chip 
                        label={req.priority} 
                        size="small" 
                        color={
                          req.priority === 'High' ? 'error' : 
                          req.priority === 'Medium' ? 'warning' : 'default'
                        }
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {[
                  { service: 'Requirements Module', status: 'Online', uptime: '99.9%' },
                  { service: 'Architecture Module', status: 'Online', uptime: '99.7%' },
                  { service: 'Development Module', status: 'Online', uptime: '99.8%' },
                  { service: 'Integration Module', status: 'Maintenance', uptime: '98.5%' },
                ].map((service, index) => (
                  <Box key={index} display="flex" alignItems="center" justifyContent="between">
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {service.service}
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      <Typography variant="body2" color="textSecondary">
                        {service.uptime}
                      </Typography>
                      <Chip 
                        label={service.status} 
                        size="small" 
                        color={
                          service.status === 'Online' ? 'success' : 
                          service.status === 'Maintenance' ? 'warning' : 'error'
                        }
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};