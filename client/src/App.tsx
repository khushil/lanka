import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { CustomThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CollaborationProvider } from './context/CollaborationContext';
import { apolloClient } from './services/apollo';
import { Layout } from './components/layout/Layout';
import { AuthGuard } from './components/auth/AuthGuard';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { UserRole } from './types';

// Lazy load pages for better performance
const Requirements = React.lazy(() => import('./pages/Requirements').then(module => ({ default: module.Requirements })));
const Architecture = React.lazy(() => import('./pages/Architecture').then(module => ({ default: module.Architecture })));
const Development = React.lazy(() => import('./pages/Development').then(module => ({ default: module.Development })));
const Integration = React.lazy(() => import('./pages/Integration').then(module => ({ default: module.Integration })));
const Analytics = React.lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const GraphExplorer = React.lazy(() => import('./pages/GraphExplorer'));

const App: React.FC = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <CustomThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <CollaborationProvider>
              <Router>
            <React.Suspense fallback={<div>Loading...</div>}>
              <Routes>
                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                {/* Protected Routes */}
                <Route
                  path="/*"
                  element={
                    <AuthGuard>
                      <Layout>
                        <Routes>
                          {/* Main Dashboard */}
                          <Route path="/" element={<Dashboard />} />
                          
                          {/* Requirements - All authenticated users */}
                          <Route 
                            path="/requirements/*" 
                            element={
                              <AuthGuard requireRoles={[UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <Requirements />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Architecture - All authenticated users */}
                          <Route 
                            path="/architecture/*" 
                            element={
                              <AuthGuard requireRoles={[UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <Architecture />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Development - Developer and Admin only */}
                          <Route 
                            path="/development/*" 
                            element={
                              <AuthGuard requireRoles={[UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <Development />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Integration - Developer and Admin only */}
                          <Route 
                            path="/integration" 
                            element={
                              <AuthGuard requireRoles={[UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <Integration />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Analytics - Analyst, Developer, and Admin */}
                          <Route 
                            path="/analytics" 
                            element={
                              <AuthGuard requireRoles={[UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <Analytics />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Graph Explorer - All authenticated users */}
                          <Route 
                            path="/graph" 
                            element={
                              <AuthGuard requireRoles={[UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN]}>
                                <GraphExplorer />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* Settings - Admin only */}
                          <Route 
                            path="/settings" 
                            element={
                              <AuthGuard requireRoles={[UserRole.ADMIN]}>
                                <Settings />
                              </AuthGuard>
                            } 
                          />
                          
                          {/* 404 Route */}
                          <Route path="*" element={<div>Page Not Found</div>} />
                        </Routes>
                      </Layout>
                    </AuthGuard>
                  }
                />
              </Routes>
            </React.Suspense>
              </Router>
            </CollaborationProvider>
          </NotificationProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </ApolloProvider>
  );
};

export default App;
