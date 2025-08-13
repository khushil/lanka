import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { ForgotPassword as ForgotPasswordForm } from '../../components/auth/ForgotPassword';
import { AuthGuard } from '../../components/auth/AuthGuard';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleBack = () => {
    navigate('/login');
  };

  const handleSuccess = () => {
    // Optionally redirect after showing success message
    setTimeout(() => {
      navigate('/login');
    }, 5000);
  };

  return (
    <AuthGuard requireAuth={false}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.secondary.light}10 100%)`,
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
              }}
            >
              LANKA UI
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Reset your password
            </Typography>
          </Box>

          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <ForgotPasswordForm
              onBack={handleBack}
              onSuccess={handleSuccess}
            />
          </Paper>
        </Container>
      </Box>
    </AuthGuard>
  );
};