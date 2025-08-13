import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  Divider,
  Slider,
  Stack,
  Chip
} from '@mui/material';
import {
  Palette,
  Language,
  AccessTime,
  Dashboard,
  Save,
  Refresh,
  Visibility,
  Animation,
  Speed,
  Compress
} from '@mui/icons-material';
import { ApplicationPreferences } from '../../types/settings';
import { useTheme } from '../../context/ThemeContext';

interface PreferencesPanelProps {
  onSave?: (preferences: ApplicationPreferences) => void;
}

const themes = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'auto', label: 'Auto', icon: '🌓' }
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' }
];

const dateFormats = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)', example: '12/31/2023' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (EU)', example: '31/12/2023' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)', example: '2023-12-31' },
  { value: 'dd MMM yyyy', label: 'DD MMM YYYY', example: '31 Dec 2023' },
  { value: 'MMM dd, yyyy', label: 'MMM DD, YYYY', example: 'Dec 31, 2023' }
];

const timeFormats = [
  { value: '12', label: '12-hour (AM/PM)', example: '2:30 PM' },
  { value: '24', label: '24-hour', example: '14:30' }
];

const defaultViews = [
  { value: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
  { value: 'requirements', label: 'Requirements', icon: <Visibility /> },
  { value: 'architecture', label: 'Architecture', icon: <Palette /> },
  { value: 'development', label: 'Development', icon: <Speed /> }
];

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({ onSave }) => {
  const { theme: currentTheme } = useTheme();
  
  const [preferences, setPreferences] = useState<ApplicationPreferences>({
    theme: currentTheme || 'light',
    language: 'en',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultView: 'dashboard',
    sidebarCollapsed: false,
    autoSave: true,
    autoSaveInterval: 5,
    showTooltips: true,
    enableAnimations: true,
    compactMode: false
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState<ApplicationPreferences>(preferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('applicationPreferences');
    if (saved) {
      try {
        const parsedPrefs = JSON.parse(saved);
        setPreferences(parsedPrefs);
        setOriginalPreferences(parsedPrefs);
      } catch (error) {
        console.error('Failed to parse saved preferences:', error);
      }
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(preferences) !== JSON.stringify(originalPreferences));
  }, [preferences, originalPreferences]);

  const handleChange = (field: keyof ApplicationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('applicationPreferences', JSON.stringify(preferences));
      setOriginalPreferences(preferences);
      
      if (onSave) {
        await onSave(preferences);
      }
      
      setSuccessMessage('Preferences saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = () => {
    setPreferences(originalPreferences);
  };

  const getTimezones = () => {
    return Intl.supportedValuesOf('timeZone').slice(0, 50); // Limit for performance
  };

  return (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Application Preferences"
          subheader="Customize your LANKA experience"
          action={
            <Stack direction="row" spacing={1}>
              {hasChanges && (
                <Button startIcon={<Refresh />} onClick={handleReset}>
                  Reset
                </Button>
              )}
              <Button 
                startIcon={<Save />} 
                variant="contained" 
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Preferences
              </Button>
            </Stack>
          }
        />
        
        <CardContent>
          <Grid container spacing={4}>
            {/* Appearance Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Palette color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={preferences.theme}
                  label="Theme"
                  onChange={(e) => handleChange('theme', e.target.value)}
                >
                  {themes.map(theme => (
                    <MenuItem key={theme.value} value={theme.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{theme.icon}</span>
                        {theme.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Default View</InputLabel>
                <Select
                  value={preferences.defaultView}
                  label="Default View"
                  onChange={(e) => handleChange('defaultView', e.target.value)}
                >
                  {defaultViews.map(view => (
                    <MenuItem key={view.value} value={view.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {view.icon}
                        {view.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Interface Options
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.sidebarCollapsed}
                        onChange={(e) => handleChange('sidebarCollapsed', e.target.checked)}
                      />
                    }
                    label="Collapse sidebar by default"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.compactMode}
                        onChange={(e) => handleChange('compactMode', e.target.checked)}
                      />
                    }
                    label="Compact mode"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.enableAnimations}
                        onChange={(e) => handleChange('enableAnimations', e.target.checked)}
                      />
                    }
                    label="Enable animations"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.showTooltips}
                        onChange={(e) => handleChange('showTooltips', e.target.checked)}
                      />
                    }
                    label="Show tooltips"
                  />
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Localization Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Language color="primary" />
                <Typography variant="h6">Localization</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={preferences.language}
                  label="Language"
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  {languages.map(lang => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={preferences.dateFormat}
                  label="Date Format"
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                >
                  {dateFormats.map(format => (
                    <MenuItem key={format.value} value={format.value}>
                      <Box>
                        <Typography variant="body2">{format.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.example}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={preferences.timeFormat}
                  label="Time Format"
                  onChange={(e) => handleChange('timeFormat', e.target.value)}
                >
                  {timeFormats.map(format => (
                    <MenuItem key={format.value} value={format.value}>
                      <Box>
                        <Typography variant="body2">{format.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format.example}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={preferences.timezone}
                  label="Timezone"
                  onChange={(e) => handleChange('timezone', e.target.value)}
                >
                  {getTimezones().map(tz => (
                    <MenuItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Auto-Save Settings */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Save color="primary" />
                <Typography variant="h6">Auto-Save Settings</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.autoSave}
                    onChange={(e) => handleChange('autoSave', e.target.checked)}
                  />
                }
                label="Enable auto-save"
              />
              <Typography variant="body2" color="text.secondary">
                Automatically save your work periodically
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Auto-save interval: {preferences.autoSaveInterval} minutes
                </Typography>
                <Slider
                  value={preferences.autoSaveInterval}
                  onChange={(_, value) => handleChange('autoSaveInterval', value)}
                  min={1}
                  max={30}
                  step={1}
                  marks={[
                    { value: 1, label: '1m' },
                    { value: 5, label: '5m' },
                    { value: 10, label: '10m' },
                    { value: 30, label: '30m' }
                  ]}
                  disabled={!preferences.autoSave}
                />
              </Box>
            </Grid>

            {/* Preview Section */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip
                    label={`Theme: ${themes.find(t => t.value === preferences.theme)?.label}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Language: ${languages.find(l => l.value === preferences.language)?.label}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Date: ${new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    })}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Time: ${new Date().toLocaleTimeString('en-US', { 
                      hour12: preferences.timeFormat === '12' 
                    })}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Auto-save: ${preferences.autoSave ? `Every ${preferences.autoSaveInterval}m` : 'Disabled'}`}
                    variant="outlined"
                  />
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};