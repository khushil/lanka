import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Circle,
  AccessTime,
  Person,
  PersonAdd,
  Settings
} from '@mui/icons-material';
import { useCollaboration } from '../../context/CollaborationContext';
import { CollaborationUser } from '../../types/collaboration';

interface CollaborationPanelProps {
  className?: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ className }) => {
  const { session, activeUsers, isConnected } = useCollaboration();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (user: CollaborationUser) => {
    if (user.isOnline) return 'success';
    const timeDiff = Date.now() - new Date(user.lastSeen).getTime();
    const minutesAgo = timeDiff / (1000 * 60);
    
    if (minutesAgo < 5) return 'warning';
    return 'error';
  };

  const getLastSeenText = (user: CollaborationUser) => {
    if (user.isOnline) return 'Online';
    
    const timeDiff = Date.now() - new Date(user.lastSeen).getTime();
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    const hoursAgo = Math.floor(minutesAgo / 60);
    const daysAgo = Math.floor(hoursAgo / 24);
    
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${daysAgo}d ago`;
  };

  if (!session) {
    return (
      <Paper
        elevation={2}
        className={className}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Circle sx={{ color: 'error.main', fontSize: 8 }} />
        <Typography variant="body2" color="text.secondary">
          Not in collaboration session
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={2}
      className={className}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isConnected ? 'success.main' : 'error.main',
        borderRadius: 2
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            color={isConnected ? 'success' : 'error'}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                width: 8,
                height: 8,
                minWidth: 8
              }
            }}
          >
            <Person color="primary" />
          </Badge>
          <Typography variant="h6">
            Collaboration
          </Typography>
          <Chip
            size="small"
            label={`${activeUsers.length} users`}
            color={activeUsers.length > 0 ? 'primary' : 'default'}
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
            {activeUsers.map((user) => (
              <Tooltip key={user.id} title={`${user.name} - ${getLastSeenText(user)}`}>
                <Avatar
                  src={user.avatar}
                  sx={{
                    bgcolor: user.color,
                    border: `2px solid ${
                      user.isOnline ? 'success.main' : 'grey.300'
                    }`
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          
          <IconButton
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ ml: 1 }}
          >
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded User List */}
      <Collapse in={isExpanded}>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {activeUsers.map((user) => (
              <ListItem key={user.id}>
                <ListItemAvatar>
                  <Badge
                    color={getStatusColor(user) as any}
                    variant="dot"
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                  >
                    <Avatar
                      src={user.avatar}
                      sx={{
                        bgcolor: user.color,
                        width: 32,
                        height: 32,
                        fontSize: 14
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                
                <ListItemText
                  primary={user.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime sx={{ fontSize: 12 }} />
                      <Typography variant="caption" color="text.secondary">
                        {getLastSeenText(user)}
                      </Typography>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  {user.isOnline && (
                    <Chip
                      size="small"
                      label="Active"
                      color="success"
                      variant="filled"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            
            {activeUsers.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No active users"
                  secondary="Invite team members to collaborate"
                  sx={{ textAlign: 'center' }}
                />
              </ListItem>
            )}
          </List>
        </Box>
        
        {/* Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            justifyContent: 'space-between'
          }}
        >
          <Tooltip title="Invite users">
            <IconButton size="small" color="primary">
              <PersonAdd />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Collaboration settings">
            <IconButton size="small">
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Collapse>
    </Paper>
  );
};