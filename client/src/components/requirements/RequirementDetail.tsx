import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Alert,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Link as LinkIcon,
  Comment as CommentIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  PersonAdd as PersonAddIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  Requirement, 
  RequirementComment, 
  RequirementSimilarity, 
  RequirementRelationship,
  RelationshipType,
  RequirementStatus,
  Priority,
  ImplementationStatus
} from '../../types/requirements';

interface RequirementDetailProps {
  requirement: Requirement;
  similarRequirements: RequirementSimilarity[];
  relationships: RequirementRelationship[];
  comments: RequirementComment[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusUpdate: (status: RequirementStatus) => void;
  onAddComment: (content: string, parentId?: string) => void;
  onReactToComment: (commentId: string, type: 'like' | 'dislike') => void;
  loading?: boolean;
}

const RequirementDetail: React.FC<RequirementDetailProps> = ({
  requirement,
  similarRequirements,
  relationships,
  comments,
  onEdit,
  onDelete,
  onStatusUpdate,
  onAddComment,
  onReactToComment,
  loading = false
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const getStatusColor = (status: RequirementStatus) => {
    switch (status) {
      case RequirementStatus.DRAFT: return 'default';
      case RequirementStatus.REVIEW: return 'warning';
      case RequirementStatus.APPROVED: return 'info';
      case RequirementStatus.IMPLEMENTED: return 'success';
      case RequirementStatus.REJECTED: return 'error';
      case RequirementStatus.DEPRECATED: return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'error';
      case Priority.HIGH: return 'warning';
      case Priority.MEDIUM: return 'info';
      case Priority.LOW: return 'success';
      default: return 'default';
    }
  };

  const getImplementationProgress = () => {
    if (!requirement.implementationStatus) return 0;
    switch (requirement.implementationStatus) {
      case ImplementationStatus.NOT_STARTED: return 0;
      case ImplementationStatus.IN_PROGRESS: return 50;
      case ImplementationStatus.TESTING: return 80;
      case ImplementationStatus.COMPLETED: return 100;
      case ImplementationStatus.BLOCKED: return 25;
      default: return 0;
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment, replyingTo);
      setNewComment('');
      setReplyingTo(null);
    }
  };

  const formatRelationshipType = (type: RelationshipType) => {
    return type.replace('_', ' ').toLowerCase();
  };

  const renderComment = (comment: RequirementComment, isReply = false) => (
    <ListItem
      key={comment.id}
      alignItems="flex-start"
      sx={{ pl: isReply ? 4 : 0, bgcolor: isReply ? 'grey.50' : 'transparent' }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {comment.userName.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">
              {comment.userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {comment.content}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {comment.reactions.map((reaction) => (
                <Badge key={reaction.id} badgeContent={1} color="primary">
                  <IconButton 
                    size="small"
                    onClick={() => onReactToComment(comment.id, reaction.type as any)}
                  >
                    {reaction.type === 'like' ? <ThumbUpIcon /> : <ThumbDownIcon />}
                  </IconButton>
                </Badge>
              ))}
              <Button 
                size="small" 
                onClick={() => setReplyingTo(comment.id)}
              >
                Reply
              </Button>
            </Box>
          </Box>
        }
      />
    </ListItem>
  );

  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesMap = comments.reduce((acc, comment) => {
    if (comment.parentId) {
      if (!acc[comment.parentId]) acc[comment.parentId] = [];
      acc[comment.parentId].push(comment);
    }
    return acc;
  }, {} as Record<string, RequirementComment[]>);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" gutterBottom>
              {requirement.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip 
                label={requirement.status.replace('_', ' ')} 
                color={getStatusColor(requirement.status)}
              />
              <Chip 
                label={requirement.priority.toUpperCase()} 
                color={getPriorityColor(requirement.priority)}
              />
              <Chip 
                label={requirement.category.replace('_', ' ')} 
                variant="outlined"
              />
              {requirement.businessValue && (
                <Chip 
                  label={`Value: ${requirement.businessValue.replace('_', ' ')}`} 
                  variant="outlined"
                />
              )}
              {requirement.effort && (
                <Chip 
                  label={`Effort: ${requirement.effort.toUpperCase()}`} 
                  variant="outlined"
                />
              )}
              {requirement.risk && (
                <Chip 
                  label={`Risk: ${requirement.risk.replace('_', ' ')}`} 
                  variant="outlined"
                  color={requirement.risk === 'high' || requirement.risk === 'very_high' ? 'warning' : 'default'}
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit Requirement">
              <IconButton onClick={onEdit}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share">
              <IconButton>
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View History">
              <IconButton>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Implementation Progress */}
        {requirement.implementationStatus && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Implementation Progress: {requirement.implementationStatus.replace('_', ' ')}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={getImplementationProgress()} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
          {requirement.description}
        </Typography>

        {/* Tags */}
        {requirement.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {requirement.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        {/* Stakeholders */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Stakeholders:
          </Typography>
          {requirement.stakeholders.map((stakeholder) => (
            <Chip 
              key={stakeholder} 
              label={stakeholder} 
              size="small" 
              avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>{stakeholder.charAt(0)}</Avatar>}
            />
          ))}
          <IconButton size="small">
            <PersonAddIcon />
          </IconButton>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Similar Requirements */}
          {similarRequirements.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Similar Requirements ({similarRequirements.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {similarRequirements.map((similarity) => (
                    <ListItem key={similarity.id}>
                      <ListItemText
                        primary={similarity.similarRequirement.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {similarity.projectName} • {similarity.similarityScore.toFixed(2)}% match
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {similarity.matchingFields.map((field) => (
                                <Chip 
                                  key={field} 
                                  label={field} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <LinkIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Relationships */}
          {relationships.length > 0 && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Related Requirements ({relationships.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {relationships.map((relationship) => (
                    <ListItem key={relationship.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'info.main' }}>
                          <LinkIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={formatRelationshipType(relationship.relationshipType)}
                        secondary={relationship.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Comments */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comments ({comments.length})
            </Typography>
            
            {/* Add Comment */}
            <Box sx={{ mb: 3 }}>
              <TextField
                multiline
                rows={3}
                fullWidth
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                {replyingTo && (
                  <Button onClick={() => setReplyingTo(null)}>
                    Cancel Reply
                  </Button>
                )}
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  {replyingTo ? 'Reply' : 'Comment'}
                </Button>
              </Box>
            </Box>

            {/* Comments List */}
            <List>
              {topLevelComments.map((comment) => (
                <Box key={comment.id}>
                  {renderComment(comment)}
                  {repliesMap[comment.id] && repliesMap[comment.id].map(reply => 
                    renderComment(reply, true)
                  )}
                  <Divider variant="inset" component="li" />
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Change Status
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TimelineIcon />}
                >
                  View Timeline
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<LinkIcon />}
                >
                  Link Requirements
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(requirement.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(requirement.updatedAt), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created By
                  </Typography>
                  <Typography variant="body2">
                    {requirement.createdBy}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Project ID
                  </Typography>
                  <Typography variant="body2">
                    {requirement.projectId}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Requirement</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. Are you sure you want to delete this requirement?
          </Alert>
          <Typography>
            <strong>{requirement.title}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              onDelete();
              setDeleteDialogOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Change Status</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Select the new status for this requirement:
          </Typography>
          <List>
            {Object.values(RequirementStatus).map((status) => (
              <ListItem 
                key={status}
                button
                onClick={() => {
                  onStatusUpdate(status);
                  setStatusDialogOpen(false);
                }}
                selected={status === requirement.status}
              >
                <ListItemText 
                  primary={status.replace('_', ' ').toUpperCase()}
                />
                {status === requirement.status && (
                  <ListItemSecondaryAction>
                    <CheckCircleIcon color="primary" />
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequirementDetail;