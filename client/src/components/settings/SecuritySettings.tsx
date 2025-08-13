import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  Typography,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Paper,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Security,
  Lock,
  Smartphone,
  Key,
  Delete,
  Add,
  Visibility,
  VisibilityOff,
  DeviceUnknown,
  Computer,
  PhoneIphone,
  Warning,
  CheckCircle,
  History
} from '@mui/icons-material';
import { SecuritySettings as SecuritySettingsType, UserSession, LoginAttempt, ApiKey } from '../../types/settings';
import { ChangePasswordData } from '../../types';

interface SecuritySettingsProps {
  onSave?: (settings: SecuritySettingsType) => void;
}

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ChangePasswordData) => void;
}

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, permissions: string[]) => void;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, newPassword: password }));
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 25) return 'error';
    if (passwordStrength < 50) return 'warning';
    if (passwordStrength < 75) return 'info';
    return 'success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Current Password"
            type={showPasswords ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
          />
          
          <TextField
            fullWidth
            label="New Password"
            type={showPasswords ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => handlePasswordChange(e.target.value)}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
          />
          
          {formData.newPassword && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Password Strength: {getStrengthLabel()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getStrengthColor() as any}
                sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPasswords ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
            }
            label="Show passwords"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Change Password
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  const availablePermissions = [
    'read:requirements',
    'write:requirements',
    'read:architecture',
    'write:architecture',
    'read:development',
    'write:development',
    'admin:system'
  ];

  const handleSave = () => {
    if (name.trim() && permissions.length > 0) {
      onSave(name.trim(), permissions);
      setName('');
      setPermissions([]);
      onClose();
    }
  };

  const togglePermission = (permission: string) => {
    setPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create API Key</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Key Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Integration"
          />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Permissions
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availablePermissions.map(permission => (
                <Chip
                  key={permission}
                  label={permission}
                  onClick={() => togglePermission(permission)}
                  color={permissions.includes(permission) ? 'primary' : 'default'}
                  variant={permissions.includes(permission) ? 'filled' : 'outlined'}
                  clickable
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!name.trim() || permissions.length === 0}
        >
          Create API Key
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onSave }) => {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Mock data - in real app, this would come from API
  const [sessions] = useState<UserSession[]>([
    {
      id: '1',
      deviceInfo: 'Chrome on Windows',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      isActive: true,
      lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    },
    {
      id: '2',
      deviceInfo: 'Safari on iPhone',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.101',
      isActive: false,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) // 2 days ago
    }
  ]);

  const [loginHistory] = useState<LoginAttempt[]>([
    {
      id: '1',
      ipAddress: '192.168.1.100',
      location: 'San Francisco, CA',
      deviceInfo: 'Chrome on Windows',
      success: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
    },
    {
      id: '2',
      ipAddress: '192.168.1.200',
      location: 'Unknown',
      deviceInfo: 'Unknown Browser',
      success: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      failureReason: 'Invalid password'
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Development API',
      key: 'sk_test_••••••••••••••••••••••••••••••••1234',
      permissions: ['read:requirements', 'write:requirements'],
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days
      lastUsed: new Date(Date.now() - 1000 * 60 * 60),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    }
  ]);

  const handleChangePassword = (data: ChangePasswordData) => {
    // In a real app, this would call an API
    setSuccessMessage('Password changed successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreateApiKey = (name: string, permissions: string[]) => {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      key: `sk_live_••••••••••••••••••••••••••••••••${Math.random().toString(36).substr(2, 4)}`,
      permissions,
      isActive: true,
      createdAt: new Date(),
      lastUsed: undefined,
      expiresAt: undefined
    };
    setApiKeys(prev => [...prev, newKey]);
    setSuccessMessage('API key created successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteApiKey = (keyId: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== keyId));
  };

  const handleRevokeSession = (sessionId: string) => {
    // In a real app, this would call an API to revoke the session
    setSuccessMessage('Session revoked successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.toLowerCase().includes('iphone') || deviceInfo.toLowerCase().includes('android')) {
      return <PhoneIphone />;
    }
    if (deviceInfo.toLowerCase().includes('chrome') || deviceInfo.toLowerCase().includes('safari') || deviceInfo.toLowerCase().includes('firefox')) {
      return <Computer />;
    }
    return <DeviceUnknown />;
  };

  return (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Password Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Password & Authentication"
          subheader="Manage your password and authentication methods"
          avatar={<Lock color="primary" />}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Password
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Last changed: 30 days ago
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<Key />}
                onClick={() => setPasswordDialogOpen(true)}
              >
                Change Password
              </Button>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Two-Factor Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Add an extra layer of security to your account
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  />
                }
                label={twoFactorEnabled ? 'Enabled' : 'Disabled'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Active Sessions"
          subheader="Manage your active login sessions"
          avatar={<Computer color="primary" />}
        />
        <CardContent>
          <List>
            {sessions.map((session, index) => (
              <React.Fragment key={session.id}>
                <ListItem>
                  <Box sx={{ mr: 2 }}>
                    {getDeviceIcon(session.deviceInfo)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {session.deviceInfo}
                        {session.isActive && (
                          <Chip size="small" label="Active" color="success" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {session.location} • {session.ipAddress}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last activity: {session.lastActivity.toLocaleDateString()} {session.lastActivity.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!session.isActive && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sessions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Login History"
          subheader="Recent login attempts to your account"
          avatar={<History color="primary" />}
        />
        <CardContent>
          <List>
            {loginHistory.map((attempt, index) => (
              <React.Fragment key={attempt.id}>
                <ListItem>
                  <Box sx={{ mr: 2 }}>
                    {attempt.success ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Warning color="error" />
                    )}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Login {attempt.success ? 'Successful' : 'Failed'}
                        <Chip
                          size="small"
                          label={attempt.success ? 'Success' : 'Failed'}
                          color={attempt.success ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {attempt.deviceInfo} from {attempt.location} ({attempt.ipAddress})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {attempt.timestamp.toLocaleDateString()} {attempt.timestamp.toLocaleTimeString()}
                        </Typography>
                        {attempt.failureReason && (
                          <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                            Reason: {attempt.failureReason}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < loginHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader
          title="API Keys"
          subheader="Manage API keys for integrations"
          avatar={<Key color="primary" />}
          action={
            <Button
              startIcon={<Add />}
              variant="outlined"
              onClick={() => setApiKeyDialogOpen(true)}
            >
              Create API Key
            </Button>
          }
        />
        <CardContent>
          {apiKeys.length > 0 ? (
            <List>
              {apiKeys.map((key, index) => (
                <React.Fragment key={key.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {key.name}
                          <Chip
                            size="small"
                            label={key.isActive ? 'Active' : 'Inactive'}
                            color={key.isActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                            {key.key}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {key.createdAt.toLocaleDateString()}
                            {key.lastUsed && ` • Last used: ${key.lastUsed.toLocaleDateString()}`}
                            {key.expiresAt && ` • Expires: ${key.expiresAt.toLocaleDateString()}`}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {key.permissions.map(permission => (
                              <Chip
                                key={permission}
                                size="small"
                                label={permission}
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleDeleteApiKey(key.id)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < apiKeys.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Key sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No API Keys
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create an API key to integrate with external services
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSave={handleChangePassword}
      />
      
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
        onSave={handleCreateApiKey}
      />
    </Box>
  );
};