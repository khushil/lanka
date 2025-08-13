import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  PersonAdd,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { RegisterData, UserRole } from '../../types';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onLogin,
}) => {
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.VIEWER,
    acceptTerms: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.acceptTerms) {
      errors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    
    if (!validateForm()) return;
    
    try {
      await register(formData);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleInputChange = (field: keyof RegisterData) => (
    event: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    const value = field === 'acceptTerms' 
      ? event.target.checked 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
    
    // Clear global error when user modifies form
    if (error) {
      clearError();
    }
  };

  const passwordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;
    
    const levels = [
      { label: 'Very Weak', color: '#f44336' },
      { label: 'Weak', color: '#ff9800' },
      { label: 'Fair', color: '#ffeb3b' },
      { label: 'Good', color: '#8bc34a' },
      { label: 'Strong', color: '#4caf50' },
    ];
    
    return { score, ...levels[score] };
  };

  const strength = passwordStrength(formData.password);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: 500,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        textAlign="center"
        color="primary"
        sx={{ mb: 3 }}
      >
        Create Account
      </Typography>

      {error && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        id="name"
        label="Full Name"
        value={formData.name}
        onChange={handleInputChange('name')}
        error={!!validationErrors.name}
        helperText={validationErrors.name}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person color="action" />
            </InputAdornment>
          ),
        }}
        autoComplete="name"
        autoFocus
      />

      <TextField
        fullWidth
        id="email"
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        error={!!validationErrors.email}
        helperText={validationErrors.email}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
        autoComplete="email"
      />

      <FormControl fullWidth>
        <InputLabel id="role-label">Role</InputLabel>
        <Select
          labelId="role-label"
          id="role"
          value={formData.role}
          onChange={handleInputChange('role')}
          label="Role"
          disabled={isLoading}
        >
          <MenuItem value={UserRole.VIEWER}>Viewer - View only access</MenuItem>
          <MenuItem value={UserRole.ANALYST}>Analyst - Analysis and reporting</MenuItem>
          <MenuItem value={UserRole.DEVELOPER}>Developer - Full development access</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!validationErrors.password}
        helperText={validationErrors.password}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                disabled={isLoading}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        autoComplete="new-password"
      />

      {formData.password && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: -1 }}>
          <Box
            sx={{
              height: 4,
              flex: 1,
              bgcolor: 'grey.300',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(strength.score / 5) * 100}%`,
                bgcolor: strength.color,
                transition: 'all 0.3s ease',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: strength.color, minWidth: 60 }}>
            {strength.label}
          </Typography>
        </Box>
      )}

      <TextField
        fullWidth
        id="confirmPassword"
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        error={!!validationErrors.confirmPassword}
        helperText={validationErrors.confirmPassword}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                disabled={isLoading}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        autoComplete="new-password"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={formData.acceptTerms}
            onChange={handleInputChange('acceptTerms')}
            disabled={isLoading}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            I accept the{' '}
            <Link href="/terms" target="_blank" rel="noopener">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" rel="noopener">
              Privacy Policy
            </Link>
          </Typography>
        }
        sx={{ alignSelf: 'flex-start' }}
      />

      {validationErrors.acceptTerms && (
        <Typography color="error" variant="caption">
          {validationErrors.acceptTerms}
        </Typography>
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : <PersonAdd />}
        sx={{
          mt: 2,
          py: 1.5,
          fontSize: '1.1rem',
        }}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={onLogin}
          disabled={isLoading}
        >
          Already have an account? Sign in
        </Link>
      </Box>
    </Box>
  );
};