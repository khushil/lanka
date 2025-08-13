import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { AuthGuard } from '../../components/auth/AuthGuard';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Get the intended destination from navigation state
  const from = (location.state as any)?.from || '/';

  const handleRegistrationSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleLogin = () => {
    navigate('/login', { state: { from } });
  };

  return (
    <AuthGuard requireAuth={false}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'grey.50',
          backgroundImage: `linear-gradient(135deg, ${theme.palette.secondary.light}10 0%, ${theme.palette.primary.light}10 100%)`,
          py: 4,
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
                    Join LANKA UI
                  </Typography>
                  
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'text.secondary',
                      mb: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    Start building smarter applications today
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      Choose Your Role:
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        👁️ Viewer
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Perfect for stakeholders and observers. View dashboards, analytics, and reports.
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        📊 Analyst
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Ideal for data analysts and researchers. Create reports and analyze system metrics.
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        💻 Developer
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Full access for developers. Manage requirements, architecture, and development workflows.
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Get started in minutes with our intuitive interface and powerful features.
                  </Typography>
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
                  minHeight: { xs: 'auto', md: 600 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <RegisterForm
                  onSuccess={handleRegistrationSuccess}
                  onLogin={handleLogin}
                />
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
              By creating an account, you agree to our
              {' '}
              <Link href="/terms" color="primary">
                Terms of Service
              </Link>
              {' and '}
              <Link href="/privacy" color="primary">
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Container>
      </Box>
    </AuthGuard>
  );
};