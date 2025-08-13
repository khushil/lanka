import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  TextField,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip,
  Stack
} from '@mui/material';
import {
  ExpandMore,
  Notifications,
  Email,
  PhoneIphone,
  Computer,
  Schedule,
  Add,
  Delete,
  Test
} from '@mui/icons-material';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationType, NotificationPreferences, NotificationChannel } from '../../types/notifications';

interface NotificationSettingsProps {
  onSave?: (preferences: NotificationPreferences) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSave }) => {
  const { state, updatePreferences } = useNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(state.preferences);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPreferences(state.preferences);
  }, [state.preferences]);

  const handleGlobalToggle = (field: keyof Pick<NotificationPreferences, 'email' | 'push' | 'desktop' | 'inApp'>) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleTypeToggle = (type: NotificationType, field: 'enabled' | 'email' | 'push') => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          [field]: !prev.types[type][field]
        }
      }
    }));
  };

  const handleQuietHoursToggle = () => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled
      }
    }));
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(value)) {
      setErrors(prev => ({ ...prev, [field]: 'Invalid time format (HH:mm)' }));
      return;
    }

    setErrors(prev => ({ ...prev, [field]: '' }));
    
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    // Validate preferences
    const validationErrors: Record<string, string> = {};
    
    if (preferences.quietHours.enabled) {
      const startTime = preferences.quietHours.start;
      const endTime = preferences.quietHours.end;
      
      if (!startTime || !endTime) {
        validationErrors.quietHours = 'Both start and end times are required';
      }
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      updatePreferences(preferences);
      if (onSave) {
        onSave(preferences);
      }
    }
  };

  const handleTestNotification = () => {
    // Simulate sending a test notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from LANKA',
        icon: '/favicon.ico'
      });
    }
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        handleTestNotification();
      }
    }
  };

  const getNotificationTypeIcon = (type: NotificationType) => {
    const iconProps = { sx: { fontSize: 20 } };
    switch (type) {
      case NotificationType.SYSTEM: return <Computer {...iconProps} />;
      case NotificationType.REQUIREMENTS: return <Notifications {...iconProps} />;
      case NotificationType.ARCHITECTURE: return <Notifications {...iconProps} />;
      case NotificationType.DEVELOPMENT: return <Notifications {...iconProps} />;
      case NotificationType.COLLABORATION: return <Notifications {...iconProps} />;
      case NotificationType.SECURITY: return <Notifications {...iconProps} />;
      case NotificationType.DEPLOYMENT: return <Notifications {...iconProps} />;
      case NotificationType.ALERT: return <Notifications {...iconProps} />;
      default: return <Notifications {...iconProps} />;
    }
  };

  const getNotificationTypeLabel = (type: NotificationType) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Preferences
        </Typography>

        {testNotificationSent && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Test notification sent successfully!
          </Alert>
        )}

        {/* Global Settings */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="Global Notification Settings"
            subheader="Enable or disable notification channels globally"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.inApp}
                      onChange={() => handleGlobalToggle('inApp')}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Notifications />
                      In-App Notifications
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email}
                      onChange={() => handleGlobalToggle('email')}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email />
                      Email Notifications
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.push}
                      onChange={() => handleGlobalToggle('push')}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIphone />
                      Push Notifications
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.desktop}
                      onChange={() => handleGlobalToggle('desktop')}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Computer />
                      Desktop Notifications
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Button
                startIcon={<Test />}
                onClick={
                  'Notification' in window && Notification.permission === 'granted'
                    ? handleTestNotification
                    : requestNotificationPermission
                }
                variant="outlined"
                size="small"
              >
                {Notification.permission === 'granted' ? 'Send Test Notification' : 'Enable Desktop Notifications'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Notification Types</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure which types of notifications you want to receive and through which channels.
            </Typography>

            <Grid container spacing={2}>
              {Object.entries(preferences.types).map(([type, settings]) => (
                <Grid item xs={12} key={type}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {getNotificationTypeIcon(type as NotificationType)}
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {getNotificationTypeLabel(type as NotificationType)}
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enabled}
                            onChange={() => handleTypeToggle(type as NotificationType, 'enabled')}
                          />
                        }
                        label="Enabled"
                      />
                    </Box>
                    
                    {settings.enabled && (
                      <Box sx={{ ml: 4, display: 'flex', gap: 3 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.email && preferences.email}
                              onChange={() => handleTypeToggle(type as NotificationType, 'email')}
                              disabled={!preferences.email}
                            />
                          }
                          label="Email"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.push && preferences.push}
                              onChange={() => handleTypeToggle(type as NotificationType, 'push')}
                              disabled={!preferences.push}
                            />
                          }
                          label="Push"
                        />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Quiet Hours */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule />
              <Typography variant="h6">Quiet Hours</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set a time period when you don't want to receive notifications (except critical alerts).
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.quietHours.enabled}
                  onChange={handleQuietHoursToggle}
                />
              }
              label="Enable Quiet Hours"
              sx={{ mb: 2 }}
            />

            {preferences.quietHours.enabled && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    error={!!errors.start}
                    helperText={errors.start}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="End Time"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    error={!!errors.end}
                    helperText={errors.end}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            )}

            {errors.quietHours && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.quietHours}
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Save Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setPreferences(state.preferences)}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={Object.keys(errors).some(key => errors[key])}
          >
            Save Preferences
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};