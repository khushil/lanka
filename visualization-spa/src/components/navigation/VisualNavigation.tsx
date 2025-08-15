import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  TextField,
  Chip,
  Tooltip,
  Breadcrumbs,
  Link,
  Badge,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  AccountTree,
  Timeline,
  DeviceHub,
  Dashboard,
  Memory,
  Home,
  Settings,
  Help,
  Bookmark,
  History,
  Explore,
  TrendingUp,
  ViewInAr,
  ThreeDRotation,
  FilterList,
  Refresh,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface VisualNavigationProps {
  currentTab: number;
  onTabChange: (tabIndex: number) => void;
  fullscreen: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  description?: string;
  category: 'main' | 'tools' | 'settings';
  keywords: string[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color?: string;
}

const VisualNavigation: React.FC<VisualNavigationProps> = ({
  currentTab,
  onTabChange,
  fullscreen
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>(['System Flow', 'Dependencies']);
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>(['Data Flow', 'Health Monitor']);

  const navigationItems: NavigationItem[] = [
    {
      id: 'system-flow',
      label: 'System Flow',
      icon: <AccountTree />,
      description: '3D visualization of system architecture',
      category: 'main',
      keywords: ['system', 'architecture', '3d', 'modules', 'flow']
    },
    {
      id: 'data-flow',
      label: 'Data Flow',
      icon: <Timeline />,
      description: 'Animated data flow between modules',
      category: 'main',
      keywords: ['data', 'animation', 'flow', 'throughput', 'metrics']
    },
    {
      id: 'dependencies',
      label: 'Dependencies',
      icon: <DeviceHub />,
      description: 'Interactive dependency graph',
      category: 'main',
      keywords: ['dependencies', 'graph', 'relationships', 'circular']
    },
    {
      id: 'health-monitor',
      label: 'Health Monitor',
      icon: <Dashboard />,
      badge: 3,
      description: 'Real-time system health dashboard',
      category: 'main',
      keywords: ['health', 'monitoring', 'alerts', 'real-time', 'metrics']
    },
    {
      id: 'knowledge-graph',
      label: 'Knowledge Graph',
      icon: <Memory />,
      description: 'Neo4j-style knowledge exploration',
      category: 'main',
      keywords: ['knowledge', 'graph', 'concepts', 'insights', 'exploration']
    }
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: <Refresh />,
      action: () => window.location.reload(),
      color: theme.palette.primary.main
    },
    {
      id: 'fullscreen',
      label: fullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      icon: fullscreen ? <FullscreenExit /> : <Fullscreen />,
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      },
      color: theme.palette.secondary.main
    },
    {
      id: 'home',
      label: 'Dashboard',
      icon: <Home />,
      action: () => navigate('/'),
      color: theme.palette.success.main
    }
  ];

  const filteredItems = navigationItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.keywords.some(keyword => keyword.includes(query))
    );
  });

  const handleItemClick = (item: NavigationItem, index: number) => {
    onTabChange(index);
    
    // Add to recent items
    setRecentItems(prev => {
      const updated = [item.label, ...prev.filter(i => i !== item.label)];
      return updated.slice(0, 5);
    });
    
    setDrawerOpen(false);
  };

  const toggleBookmark = (itemLabel: string) => {
    setBookmarkedItems(prev => {
      if (prev.includes(itemLabel)) {
        return prev.filter(i => i !== itemLabel);
      } else {
        return [...prev, itemLabel];
      }
    });
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      ...pathSegments.map((segment, index) => ({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        path: '/' + pathSegments.slice(0, index + 1).join('/')
      }))
    ];
    
    if (currentTab >= 0 && currentTab < navigationItems.length) {
      breadcrumbs.push({
        label: navigationItems[currentTab].label,
        path: location.pathname
      });
    }
    
    return breadcrumbs;
  };

  return (
    <Box>
      {/* Navigation Toggle Button */}
      {!fullscreen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              position: 'fixed',
              top: 20,
              left: 20,
              zIndex: 1300,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            {/* Main Menu Button */}
            <Tooltip title="Navigation Menu" placement="right">
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.9),
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
            
            {/* Quick Actions */}
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Tooltip title={action.label} placement="right">
                  <IconButton
                    onClick={action.action}
                    sx={{
                      bgcolor: alpha(action.color || theme.palette.grey[600], 0.9),
                      color: 'white',
                      '&:hover': {
                        bgcolor: action.color || theme.palette.grey[700],
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}

      {/* Breadcrumb Navigation */}
      {!fullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            px: 2,
            py: 1
          }}
        >
          <Breadcrumbs
            aria-label="navigation breadcrumb"
            sx={{
              '& .MuiBreadcrumbs-separator': {
                color: theme.palette.primary.main
              }
            }}
          >
            {getBreadcrumbs().map((crumb, index) => (
              <Link
                key={crumb.path}
                color={index === getBreadcrumbs().length - 1 ? 'primary' : 'inherit'}
                href={crumb.path}
                underline="hover"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: index === getBreadcrumbs().length - 1 ? 'bold' : 'normal'
                }}
              >
                {index === 0 && <Home sx={{ mr: 0.5, fontSize: '1rem' }} />}
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>
      )}

      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 360,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{ height: '100%' }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Visual Navigation
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Search */}
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search visualizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: alpha(theme.palette.background.default, 0.7)
                }
              }}
            />
          </Box>

          {/* Quick Access - Recent */}
          {recentItems.length > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <History fontSize="small" color="primary" />
                <Typography variant="caption" fontWeight="bold" color="primary">
                  Recently Accessed
                </Typography>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {recentItems.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    size="small"
                    onClick={() => {
                      const index = navigationItems.findIndex(nav => nav.label === item);
                      if (index !== -1) onTabChange(index);
                      setDrawerOpen(false);
                    }}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Quick Access - Bookmarks */}
          {bookmarkedItems.length > 0 && (
            <Box sx={{ px: 2, pb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Bookmark fontSize="small" color="secondary" />
                <Typography variant="caption" fontWeight="bold" color="secondary">
                  Bookmarked
                </Typography>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {bookmarkedItems.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    size="small"
                    onClick={() => {
                      const index = navigationItems.findIndex(nav => nav.label === item);
                      if (index !== -1) onTabChange(index);
                      setDrawerOpen(false);
                    }}
                    sx={{
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.2) }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider />

          {/* Main Navigation Items */}
          <List sx={{ flex: 1, py: 1 }}>
            {filteredItems.map((item, index) => {
              const actualIndex = navigationItems.findIndex(nav => nav.id === item.id);
              const isActive = currentTab === actualIndex;
              const isBookmarked = bookmarkedItems.includes(item.label);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <ListItem disablePadding sx={{ px: 1 }}>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleItemClick(item, actualIndex)}
                      sx={{
                        borderRadius: 2,
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.25)
                          }
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.action.hover, 0.5),
                          transform: 'translateX(4px)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isActive ? 'primary.main' : 'text.secondary',
                          minWidth: 40
                        }}
                      >
                        {item.badge ? (
                          <Badge badgeContent={item.badge} color="error">
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography
                              variant="body2"
                              fontWeight={isActive ? 'bold' : 'medium'}
                              color={isActive ? 'primary.main' : 'text.primary'}
                            >
                              {item.label}
                            </Typography>
                            
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(item.label);
                              }}
                              sx={{
                                opacity: isBookmarked ? 1 : 0.5,
                                '&:hover': { opacity: 1 }
                              }}
                            >
                              <Bookmark
                                fontSize="small"
                                color={isBookmarked ? 'secondary' : 'disabled'}
                              />
                            </IconButton>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {item.description}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              );
            })}
          </List>

          {/* Footer Actions */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}
          >
            <List dense>
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={() => {
                    navigate('/settings');
                    setDrawerOpen(false);
                  }}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>
              
              <ListItem disablePadding>
                <ListItemButton sx={{ borderRadius: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Help fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Help & Documentation" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </motion.div>
      </Drawer>

      {/* Floating Quick Navigation (Fullscreen Mode) */}
      {fullscreen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            display: 'flex',
            gap: 1,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            p: 1,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          {navigationItems.map((item, index) => (
            <Tooltip key={item.id} title={item.label} placement="top">
              <IconButton
                onClick={() => onTabChange(index)}
                sx={{
                  bgcolor: currentTab === index ? alpha(theme.palette.primary.main, 0.2) : 'transparent',
                  color: currentTab === index ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  );
};

export { VisualNavigation };