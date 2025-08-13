import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as RequirementsIcon,
  Architecture as ArchitectureIcon,
  Code as DevelopmentIcon,
  Hub as IntegrationIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  AccountCircle,
  Logout,
  Person,
} from '@mui/icons-material';
import { NavigationItem, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

interface NavigationProps {
  onNavigate?: () => void;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'dashboard',
    roles: [UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN],
  },
  {
    id: 'requirements',
    label: 'Requirements',
    path: '/requirements',
    icon: 'requirements',
    roles: [UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN],
    children: [
      { id: 'req-list', label: 'View Requirements', path: '/requirements/list', icon: 'list' },
      { id: 'req-create', label: 'Create Requirement', path: '/requirements/create', icon: 'add', roles: [UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN] },
      { id: 'req-analysis', label: 'Analysis', path: '/requirements/analysis', icon: 'analytics', roles: [UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN] },
    ],
  },
  {
    id: 'architecture',
    label: 'Architecture',
    path: '/architecture',
    icon: 'architecture',
    roles: [UserRole.VIEWER, UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN],
    children: [
      { id: 'arch-overview', label: 'Overview', path: '/architecture/overview', icon: 'overview' },
      { id: 'arch-patterns', label: 'Patterns', path: '/architecture/patterns', icon: 'pattern', roles: [UserRole.DEVELOPER, UserRole.ADMIN] },
      { id: 'arch-decisions', label: 'Decisions', path: '/architecture/decisions', icon: 'decision', roles: [UserRole.DEVELOPER, UserRole.ADMIN] },
    ],
  },
  {
    id: 'development',
    label: 'Development',
    path: '/development',
    icon: 'development',
    roles: [UserRole.DEVELOPER, UserRole.ADMIN],
    children: [
      { id: 'dev-projects', label: 'Projects', path: '/development/projects', icon: 'folder' },
      { id: 'dev-testing', label: 'Testing', path: '/development/testing', icon: 'test' },
      { id: 'dev-deployment', label: 'Deployment', path: '/development/deployment', icon: 'deploy' },
    ],
  },
  {
    id: 'integration',
    label: 'Integration',
    path: '/integration',
    icon: 'integration',
    roles: [UserRole.DEVELOPER, UserRole.ADMIN],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: 'analytics',
    roles: [UserRole.ANALYST, UserRole.DEVELOPER, UserRole.ADMIN],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'settings',
    roles: [UserRole.ADMIN],
  },
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'dashboard':
      return <DashboardIcon />;
    case 'requirements':
      return <RequirementsIcon />;
    case 'architecture':
      return <ArchitectureIcon />;
    case 'development':
      return <DevelopmentIcon />;
    case 'integration':
      return <IntegrationIcon />;
    case 'analytics':
      return <AnalyticsIcon />;
    case 'settings':
      return <SettingsIcon />;
    default:
      return <DashboardIcon />;
  }
};

export const Navigation: React.FC<NavigationProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUserDisplayName, getUserInitials } = useAuth();
  const { canAccessRoute } = usePermissions();
  const [openItems, setOpenItems] = React.useState<string[]>([]);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleItemClick = (item: NavigationItem) => {
    if (item.children) {
      const isOpen = openItems.includes(item.id);
      if (isOpen) {
        setOpenItems(openItems.filter(id => id !== item.id));
      } else {
        setOpenItems([...openItems, item.id]);
      }
    } else {
      navigate(item.path);
      onNavigate?.();
    }
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const canShowItem = (item: NavigationItem): boolean => {
    // If no roles specified, show to everyone
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    // Check if user has any of the required roles
    return item.roles.some(role => user?.role === role || canAccessRoute(item.path));
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.DEVELOPER:
        return 'success';
      case UserRole.ANALYST:
        return 'info';
      case UserRole.VIEWER:
      default:
        return 'default';
    }
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    // Don't render items the user can't access
    if (!canShowItem(item)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.id);
    const active = isActive(item.path);

    // Filter children based on permissions
    const accessibleChildren = hasChildren 
      ? item.children!.filter(child => canShowItem(child))
      : [];
    
    const hasAccessibleChildren = accessibleChildren.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={active && !hasAccessibleChildren}
            sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {getIcon(item.icon || 'dashboard')}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: active && !hasAccessibleChildren ? 600 : 400,
              }}
            />
            {hasAccessibleChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {hasAccessibleChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {accessibleChildren.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          LANKA UI
        </Typography>
      </Toolbar>
      
      {/* User Profile Section */}
      {user && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getUserDisplayName()}
              </Typography>
              <Chip 
                label={user.role} 
                size="small" 
                color={getRoleColor(user.role) as any}
                sx={{ mt: 0.5, fontSize: '0.75rem' }}
              />
            </Box>
            <IconButton
              size="small"
              onClick={handleUserMenuClick}
              aria-label="user menu"
            >
              <AccountCircle />
            </IconButton>
          </Box>
          
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleProfile}>
              <Person fontSize="small" sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      )}
      
      <Divider />
      <List sx={{ px: 1, py: 2, flex: 1, overflow: 'auto' }}>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>
    </>
  );
};