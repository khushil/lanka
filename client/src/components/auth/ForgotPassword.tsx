import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Email,
  Send,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { ResetPasswordData } from '../../types';

interface ForgotPasswordProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBack,
  onSuccess,
}) => {
  const { forgotPassword } = useAuth();
  
  const [formData, setFormData] = useState<ResetPasswordData>({
    email: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await forgotPassword(formData);
      setIsSuccess(true);
      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    
    setFormData({ email: value });
    
    // Clear validation error when user starts typing
    if (validationErrors.email) {
      setValidationErrors({});
    }
    
    // Clear global error when user modifies form
    if (error) {
      setError(null);
    }
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setFormData({ email: '' });
    setError(null);
    setValidationErrors({});
  };

  if (isSuccess) {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 500,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Card sx={{ width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CheckCircle
              sx={{
                fontSize: 64,
                color: 'success.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              Check Your Email
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We've sent password reset instructions to:
            </Typography>
            
            <Typography variant="h6" color="text.primary" sx={{ mb: 3 }}>
              {formData.email}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              If you don't see the email in your inbox, please check your spam folder.
              The link will expire in 24 hours.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleTryAgain}
                startIcon={<Send />}
              >
                Send Again
              </Button>
              
              <Button
                variant="contained"
                onClick={onBack}
                startIcon={<ArrowBack />}
              >
                Back to Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: 400,
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
        sx={{ mb: 1 }}
      >
        Forgot Password
      </Typography>
      
      <Typography
        variant="body2"
        textAlign="center"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Enter your email address and we'll send you a link to reset your password.
      </Typography>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        id="email"
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        error={!!validationErrors.email}
        helperText={validationErrors.email || 'We\'ll send reset instructions to this email'}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
        autoComplete="email"
        autoFocus
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
        sx={{
          mt: 2,
          py: 1.5,
          fontSize: '1.1rem',
        }}
      >
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={onBack}
          disabled={isLoading}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 'auto' }}
        >
          <ArrowBack fontSize="small" />
          Back to Login
        </Link>
      </Box>
    </Box>
  );
};