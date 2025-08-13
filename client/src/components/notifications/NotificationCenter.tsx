import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Paper,
  Typography,
  List,
  ListItem,
  Divider,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  MarkEmailRead,
  Clear,
  Settings as SettingsIcon,
  FilterList
} from '@mui/icons-material';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { NotificationType, NotificationPriority } from '../../types/notifications';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const {
    state: { notifications, unreadCount, isLoading },
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const open = Boolean(anchorEl);

  // Filter notifications based on tab and filters
  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Filter by tab (unread/all)
    if (activeTab === 0) {
      filtered = filtered.filter(n => !n.isRead);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === filterPriority);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const filteredNotifications = getFilteredNotifications();

  const getNotificationIcon = () => {
    if (unreadCount === 0) {
      return <NotificationsNone />;
    }
    return <Notifications />;
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.CRITICAL: return 'error';
      case NotificationPriority.HIGH: return 'warning';
      case NotificationPriority.MEDIUM: return 'info';
      case NotificationPriority.LOW: return 'default';
      default: return 'default';
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ALERT: return 'error';
      case NotificationType.SECURITY: return 'warning';
      case NotificationType.SYSTEM: return 'info';
      case NotificationType.COLLABORATION: return 'success';
      default: return 'default';
    }
  };

  return (
    <Box className={className}>
      <IconButton
        ref={buttonRef}
        onClick={handleClick}
        color="inherit"
        aria-label="notifications"
        aria-describedby="notification-popover"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          variant={unreadCount > 0 ? 'standard' : 'dot'}
          invisible={unreadCount === 0}
        >
          {getNotificationIcon()}
        </Badge>
      </IconButton>

      <Popover
        id="notification-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <Paper>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1
              }}
            >
              <Typography variant="h6">
                Notifications
              </Typography>
              <Stack direction="row" spacing={1}>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<MarkEmailRead />}
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
                <IconButton size="small" onClick={clearAll}>
                  <Clear />
                </IconButton>
                <IconButton size="small">
                  <SettingsIcon />
                </IconButton>
              </Stack>
            </Box>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              size="small"
              sx={{ minHeight: 'auto' }}
            >
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Unread
                    {unreadCount > 0 && (
                      <Chip
                        size="small"
                        label={unreadCount}
                        color="error"
                        sx={{ height: 16, minWidth: 16 }}
                      />
                    )}
                  </Box>
                }
              />
              <Tab
                label={`All (${notifications.length})`}
              />
            </Tabs>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 12
                }}
              >
                <option value="all">All Types</option>
                {Object.values(NotificationType).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as NotificationPriority | 'all')}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 12
                }}
              >
                <option value="all">All Priorities</option>
                {Object.values(NotificationPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!isLoading && filteredNotifications.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <NotificationsNone sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {activeTab === 0 ? 'No unread notifications' : 'No notifications'}
                </Typography>
              </Box>
            )}

            {!isLoading && filteredNotifications.length > 0 && (
              <List disablePadding>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onMarkAsRead={() => markAsRead(notification.id)}
                      onRemove={() => removeNotification(notification.id)}
                    />
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
                textAlign: 'center'
              }}
            >
              <Button size="small" variant="text">
                View All Notifications
              </Button>
            </Box>
          )}
        </Paper>
      </Popover>
    </Box>
  );
};