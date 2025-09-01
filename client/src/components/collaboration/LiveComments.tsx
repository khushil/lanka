import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Zoom,
  Fade,
  Stack
} from '@mui/material';
import {
  Add,
  Close,
  Check,
  MoreVert,
  Reply,
  Delete,
  Edit
} from '@mui/icons-material';
import { useCollaboration } from '../../context/CollaborationContext';
import { useAuth } from '../../hooks/useAuth';
import { LiveComment, LiveCommentReply } from '../../types/collaboration';

interface LiveCommentsProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface CommentIndicatorProps {
  comment: LiveComment;
  onClick: () => void;
}

interface CommentDialogProps {
  comment: LiveComment;
  onClose: () => void;
  onResolve: () => void;
  onReply: (content: string) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
}

const CommentIndicator: React.FC<CommentIndicatorProps> = ({ comment, onClick }) => {
  return (
    <Tooltip title={`Comment by ${comment.user.name}`} placement="top">
      <Paper
        elevation={4}
        onClick={onClick}
        sx={{
          position: 'absolute',
          left: comment.position.x,
          top: comment.position.y,
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: comment.isResolved ? 'success.main' : 'warning.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          transform: 'translate(-50%, -50%)',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          '&:hover': {
            transform: 'translate(-50%, -50%) scale(1.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          },
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 'bold' }}>
          {comment.replies?.length ? comment.replies.length + 1 : 1}
        </Typography>
      </Paper>
    </Tooltip>
  );
};

const CommentDialog: React.FC<CommentDialogProps> = ({
  comment,
  onClose,
  onResolve,
  onReply,
  onEdit,
  onDelete
}) => {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(replyText.trim());
      setReplyText('');
      setIsReplying(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        left: comment.position.x + 30,
        top: comment.position.y,
        minWidth: 300,
        maxWidth: 400,
        maxHeight: 500,
        overflow: 'auto',
        zIndex: 1001,
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={comment.user.avatar}
            sx={{ width: 32, height: 32, bgcolor: comment.user.color }}
          >
            {comment.user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" noWrap>
              {comment.user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(comment.timestamp)}
            </Typography>
          </Box>
        </Box>
        
        <Stack direction="row" spacing={1}>
          {comment.isResolved ? (
            <Chip
              size="small"
              label="Resolved"
              color="success"
              variant="filled"
            />
          ) : (
            <Chip
              size="small"
              label="Open"
              color="warning"
              variant="filled"
            />
          )}
          
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVert />
          </IconButton>
          
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </Box>

      {/* Comment Content */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {comment.content}
        </Typography>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {comment.replies.map((reply) => (
              <Paper
                key={reply.id}
                variant="outlined"
                sx={{ p: 1.5, mb: 1, ml: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar
                    src={reply.user.avatar}
                    sx={{ width: 20, height: 20, bgcolor: reply.user.color }}
                  >
                    {reply.user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {reply.user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(reply.timestamp)}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {reply.content}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}

        {/* Reply Input */}
        {isReplying ? (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              size="small"
              sx={{ mb: 1 }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <IconButton
                size="small"
                onClick={() => setIsReplying(false)}
              >
                <Close />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleReply}
                color="primary"
                disabled={!replyText.trim()}
              >
                <Check />
              </IconButton>
            </Stack>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <IconButton
              size="small"
              onClick={() => setIsReplying(true)}
              startIcon={<Reply />}
            >
              <Reply />
            </IconButton>
            
            {!comment.isResolved && (
              <IconButton
                size="small"
                onClick={onResolve}
                color="success"
              >
                <Check />
              </IconButton>
            )}
          </Stack>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {user?.id === comment.userId && (
          <MenuItem onClick={() => { 
            setAnchorEl(null);
            const newContent = prompt('Edit comment:', comment.content);
            if (newContent && newContent.trim() !== comment.content) {
              onEdit(newContent.trim());
            }
          }}>
            <Edit sx={{ mr: 1 }} /> Edit
          </MenuItem>
        )}
        {!comment.isResolved && (
          <MenuItem onClick={() => { setAnchorEl(null); onResolve(); }}>
            <Check sx={{ mr: 1 }} /> Resolve
          </MenuItem>
        )}
        {user?.id === comment.userId && (
          <MenuItem onClick={() => { setAnchorEl(null); onDelete(); }}>
            <Delete sx={{ mr: 1 }} /> Delete
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export const LiveComments: React.FC<LiveCommentsProps> = ({
  containerRef,
  enabled = true
}) => {
  const { comments, addComment, resolveComment } = useCollaboration();
  const { user } = useAuth();
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedComment, setSelectedComment] = useState<LiveComment | null>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = useCallback((event: React.MouseEvent) => {
    if (!enabled || !containerRef.current || !user) return;

    // Check if click is on a comment indicator
    const target = event.target as Element;
    if (target.closest('[role="comment-indicator"]')) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setNewCommentPosition({ x, y });
    setIsAddingComment(true);
    setSelectedComment(null);

    // Focus the text field after state updates
    setTimeout(() => {
      if (textFieldRef.current) {
        textFieldRef.current.focus();
      }
    }, 100);
  }, [enabled, containerRef, user]);

  const handleAddComment = () => {
    if (!newCommentText.trim() || !newCommentPosition || !user) return;

    addComment({
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isOnline: true,
        lastSeen: new Date(),
        color: '#1976d2' // Will be assigned by server
      },
      content: newCommentText.trim(),
      position: newCommentPosition,
      isResolved: false
    });

    setNewCommentText('');
    setIsAddingComment(false);
    setNewCommentPosition(null);
  };

  const handleCancelComment = () => {
    setNewCommentText('');
    setIsAddingComment(false);
    setNewCommentPosition(null);
  };

  const handleCommentClick = (comment: LiveComment) => {
    setSelectedComment(comment);
    setIsAddingComment(false);
  };

  const handleResolveComment = (commentId: string) => {
    resolveComment(commentId);
    setSelectedComment(null);
  };

  return (
    <Box
      onClick={handleContainerClick}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: enabled ? 'auto' : 'none',
        cursor: enabled ? 'crosshair' : 'default'
      }}
    >
      {/* Comment Indicators */}
      {comments.map((comment) => (
        <CommentIndicator
          key={comment.id}
          comment={comment}
          onClick={() => handleCommentClick(comment)}
        />
      ))}

      {/* New Comment Input */}
      {isAddingComment && newCommentPosition && (
        <Zoom in timeout={200}>
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              left: newCommentPosition.x + 20,
              top: newCommentPosition.y,
              minWidth: 280,
              maxWidth: 400,
              p: 2,
              zIndex: 1001
            }}
          >
            <TextField
              ref={textFieldRef}
              fullWidth
              multiline
              rows={3}
              placeholder="Add a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <IconButton size="small" onClick={handleCancelComment}>
                <Close />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleAddComment}
                color="primary"
                disabled={!newCommentText.trim()}
              >
                <Check />
              </IconButton>
            </Stack>
          </Paper>
        </Zoom>
      )}

      {/* Comment Dialog */}
      {selectedComment && (
        <Fade in timeout={200}>
          <div>
            <CommentDialog
              comment={selectedComment}
              onClose={() => setSelectedComment(null)}
              onResolve={() => handleResolveComment(selectedComment.id)}
              onReply={(content) => {
                if (!user || !content.trim()) return;
                
                const reply = {
                  id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  userId: user.id,
                  user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    isOnline: true,
                    lastSeen: new Date(),
                    color: '#1976d2'
                  },
                  content: content.trim(),
                  timestamp: new Date()
                };

                // Add reply to the comment
                const updatedComment = {
                  ...selectedComment,
                  replies: [...(selectedComment.replies || []), reply]
                };
                
                // Update comment in collaboration context
                // This would typically be handled by the collaboration service
                console.log('Adding reply:', reply);
                setSelectedComment(updatedComment);
              }}
              onEdit={(content) => {
                if (!user || !content.trim() || user.id !== selectedComment.userId) {
                  console.warn('Edit not allowed: user mismatch or empty content');
                  return;
                }
                
                const updatedComment = {
                  ...selectedComment,
                  content: content.trim(),
                  editedAt: new Date()
                };
                
                // Update comment in collaboration context
                console.log('Editing comment:', updatedComment);
                setSelectedComment(updatedComment);
                
                // This would typically call a collaboration service method
                // like updateComment(selectedComment.id, content)
              }}
              onDelete={() => {
                if (!user || user.id !== selectedComment.userId) {
                  console.warn('Delete not allowed: user mismatch');
                  return;
                }
                
                // Confirm deletion
                if (window.confirm('Are you sure you want to delete this comment?')) {
                  console.log('Deleting comment:', selectedComment.id);
                  
                  // Remove comment from collaboration context
                  // This would typically call deleteComment(selectedComment.id)
                  
                  setSelectedComment(null);
                }
              }}
            />
          </div>
        </Fade>
      )}

      {/* Add Comment Hint */}
      {enabled && !isAddingComment && !selectedComment && comments.length === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: 0.5
          }}
        >
          <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Click anywhere to add a comment
          </Typography>
        </Box>
      )}
    </Box>
  );
};