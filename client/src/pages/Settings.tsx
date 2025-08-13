import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container
} from '@mui/material';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { PreferencesPanel } from '../components/settings/PreferencesPanel';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { NotificationSettings } from '../components/notifications/NotificationSettings';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export const Settings: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Configure your account, preferences, and security settings
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Tab label="Profile" {...a11yProps(0)} />
          <Tab label="Preferences" {...a11yProps(1)} />
          <Tab label="Security" {...a11yProps(2)} />
          <Tab label="Notifications" {...a11yProps(3)} />
        </Tabs>

        <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 280px)' }}>
          <TabPanel value={value} index={0}>
            <ProfileSettings />
          </TabPanel>

          <TabPanel value={value} index={1}>
            <PreferencesPanel />
          </TabPanel>

          <TabPanel value={value} index={2}>
            <SecuritySettings />
          </TabPanel>

          <TabPanel value={value} index={3}>
            <NotificationSettings />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};