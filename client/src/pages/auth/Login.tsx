import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Link,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LoginForm } from '../../components/auth/LoginForm';
import { ForgotPassword } from '../../components/auth/ForgotPassword';
import { AuthGuard } from '../../components/auth/AuthGuard';

type LoginView = 'login' | 'forgot-password';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentView, setCurrentView] = useState<LoginView>('login');
  
  // Get the intended destination from navigation state
  const from = (location.state as any)?.from || '/';

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleViewChange = (view: LoginView) => {
    setCurrentView(view);
  };

  const handleRegister = () => {
    navigate('/register', { state: { from } });
  };

  return (
    <AuthGuard requireAuth={false}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'grey.50',
          backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.secondary.light}10 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} justifyContent="center" alignItems="center">
            {!isMobile && (
              <Grid size={{ md: 6, lg: 7 }}>
                <Box sx={{ pr: 4 }}>
                  <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      mb: 3,
                    }}
                  >
                    LANKA UI
                  </Typography>
                  
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'text.secondary',
                      mb: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    Your intelligent development platform for modern applications
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      ✨ Requirements Intelligence
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      🏗️ Architecture Planning
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      💻 Development Tools
                    </Typography>
                    <Typography variant="body1">
                      📊 Analytics & Insights
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            
            <Grid size={{ xs: 12, md: 6, lg: 5 }}>
              <Paper
                elevation={isMobile ? 0 : 3}
                sx={{
                  p: { xs: 3, sm: 4, md: 5 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  minHeight: { xs: 'auto', md: 500 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Fade in={currentView === 'login'} timeout={300}>
                  <Box sx={{ display: currentView === 'login' ? 'block' : 'none' }}>
                    <LoginForm
                      onSuccess={handleLoginSuccess}
                      onForgotPassword={() => handleViewChange('forgot-password')}
                      onRegister={handleRegister}
                    />
                  </Box>
                </Fade>

                <Fade in={currentView === 'forgot-password'} timeout={300}>
                  <Box sx={{ display: currentView === 'forgot-password' ? 'block' : 'none' }}>
                    <ForgotPassword
                      onBack={() => handleViewChange('login')}
                      onSuccess={() => {
                        // Could show success message or redirect
                        setTimeout(() => handleViewChange('login'), 3000);
                      }}
                    />
                  </Box>
                </Fade>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Footer */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              © 2024 LANKA UI. All rights reserved.
              {' | '}
              <Link href="/privacy" color="primary">
                Privacy Policy
              </Link>
              {' | '}
              <Link href="/terms" color="primary">
                Terms of Service
              </Link>
            </Typography>
          </Box>
        </Container>
      </Box>
    </AuthGuard>
  );
};