import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import VisualOverview from './pages/VisualOverview';
import RequirementsVisual from './pages/RequirementsVisual';
import ArchitectureVisual from './pages/ArchitectureVisual';
import DevelopmentVisual from './pages/DevelopmentVisual';
import IntegrationVisual from './pages/IntegrationVisual';
import VisualNavigation from './components/navigation/VisualNavigation';

// Create dark theme for visual impact
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <VisualNavigation />
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<VisualOverview />} />
          <Route path="/requirements" element={<RequirementsVisual />} />
          <Route path="/architecture" element={<ArchitectureVisual />} />
          <Route path="/development" element={<DevelopmentVisual />} />
          <Route path="/integration" element={<IntegrationVisual />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;