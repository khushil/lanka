import React, { useState } from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Circle,
  MoreVert,
  Delete,
  MarkEmailRead,
  OpenInNew,
  Schedule,
  Warning,
  Info,
  Security,
  Code,
  Architecture,
  Group,
  Notifications,
  Build
} from '@mui/icons-material';
import { Notification, NotificationType, NotificationPriority } from '../../types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onRemove: () => void;
  compact?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onRemove,
  compact = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    onMarkAsRead();
    handleMenuClose();
  };

  const handleRemove = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    onRemove();
    handleMenuClose();
  };

  const handleActionClick = () => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    if (!notification.isRead) {
      onMarkAsRead();
    }
  };

  const getNotificationIcon = () => {
    const iconProps = {
      sx: { fontSize: 20 }
    };

    switch (notification.type) {
      case NotificationType.SYSTEM:
        return <Info color="info" {...iconProps} />;
      case NotificationType.REQUIREMENTS:
        return <Circle color="primary" {...iconProps} />;
      case NotificationType.ARCHITECTURE:
        return <Architecture color="secondary" {...iconProps} />;
      case NotificationType.DEVELOPMENT:
        return <Code color="success" {...iconProps} />;
      case NotificationType.COLLABORATION:
        return <Group color="info" {...iconProps} />;
      case NotificationType.SECURITY:
        return <Security color="warning" {...iconProps} />;
      case NotificationType.DEPLOYMENT:
        return <Build color="primary" {...iconProps} />;
      case NotificationType.ALERT:
        return <Warning color="error" {...iconProps} />;
      default:
        return <Notifications color="action" {...iconProps} />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case NotificationPriority.CRITICAL:
        return 'error';
      case NotificationPriority.HIGH:
        return 'warning';
      case NotificationPriority.MEDIUM:
        return 'info';
      case NotificationPriority.LOW:
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = () => {
    return notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1);
  };

  const getTypeLabel = () => {
    return notification.type.charAt(0).toUpperCase() + notification.type.slice(1).replace('_', ' ');
  };

  const getTimeAgo = () => {
    const now = new Date().getTime();
    const notificationTime = new Date(notification.timestamp).getTime();
    const diffMs = now - notificationTime;
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const isExpired = notification.expiresAt && new Date() > new Date(notification.expiresAt);

  return (
    <ListItem
      button={!!notification.actionUrl}
      onClick={notification.actionUrl ? handleActionClick : undefined}
      sx={{
        bgcolor: notification.isRead ? 'transparent' : alpha('#1976d2', 0.04),
        borderLeft: notification.isRead ? 'none' : '3px solid',
        borderLeftColor: notification.isRead ? 'transparent' : 'primary.main',
        py: compact ? 1 : 1.5,
        px: 2,
        '&:hover': {
          bgcolor: alpha('#1976d2', 0.08)
        },
        opacity: isExpired ? 0.6 : 1
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {notification.isRead ? (
          <Box sx={{ position: 'relative' }}>
            {getNotificationIcon()}
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            {getNotificationIcon()}
            <Circle
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                fontSize: 8,
                color: 'primary.main'
              }}
            />
          </Box>
        )}
      </ListItemIcon>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: notification.isRead ? 'normal' : 'medium',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {notification.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                size="small"
                label={getPriorityLabel()}
                color={getPriorityColor() as any}
                variant="outlined"
                sx={{ height: 20, fontSize: 10 }}
              />
              <Chip
                size="small"
                label={getTypeLabel()}
                variant="outlined"
                sx={{ height: 20, fontSize: 10 }}
              />
            </Box>
          </Box>
        }
        secondary={
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 0.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {notification.message}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule sx={{ fontSize: 12 }} />
              <Typography variant="caption" color="text.secondary">
                {getTimeAgo()}
              </Typography>
              {isExpired && (
                <Chip
                  size="small"
                  label="Expired"
                  color="warning"
                  variant="filled"
                  sx={{ height: 16, fontSize: 9 }}
                />
              )}
            </Box>
            {notification.actionLabel && notification.actionUrl && (
              <Button
                size="small"
                variant="text"
                startIcon={<OpenInNew />}
                onClick={handleActionClick}
                sx={{ mt: 1, p: 0, fontSize: 11 }}
              >
                {notification.actionLabel}
              </Button>
            )}
          </Box>
        }
      />

      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          size="small"
          onClick={handleMenuClick}
          aria-label="notification actions"
        >
          <MoreVert />
        </IconButton>
      </ListItemSecondaryAction>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        {!notification.isRead && (
          <MenuItem onClick={handleMarkAsRead}>
            <MarkEmailRead sx={{ mr: 1, fontSize: 18 }} />
            Mark as read
          </MenuItem>
        )}
        {notification.actionUrl && (
          <MenuItem onClick={handleActionClick}>
            <OpenInNew sx={{ mr: 1, fontSize: 18 }} />
            Open
          </MenuItem>
        )}
        <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          Remove
        </MenuItem>
      </Menu>
    </ListItem>
  );
};