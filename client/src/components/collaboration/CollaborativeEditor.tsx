import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Stack
} from '@mui/material';
import {
  Lock,
  LockOpen,
  History,
  Sync,
  Warning,
  Info
} from '@mui/icons-material';
import { useCollaboration } from '../../context/CollaborationContext';
import { useAuth } from '../../hooks/useAuth';
import { EditOperation, ConflictResolution } from '../../types/collaboration';
import { CursorTracking } from './CursorTracking';
import { LiveComments } from './LiveComments';

interface CollaborativeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  showCollaborationFeatures?: boolean;
}

interface ConflictDialogProps {
  conflicts: EditOperation[];
  onResolve: (resolution: ConflictResolution) => void;
  onClose: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({ conflicts, onResolve, onClose }) => {
  const handleResolve = (operationId: string, resolution: 'accept' | 'reject' | 'merge') => {
    onResolve({
      operationId,
      resolution,
      resolvedBy: 'current-user', // This should come from auth context
      timestamp: new Date()
    });
  };

  return (
    <Dialog open maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Warning color="warning" />
          <Typography variant="h6">Resolve Conflicts</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Multiple users have made conflicting changes. Please review and resolve each conflict.
        </Alert>
        
        {conflicts.map((conflict, index) => (
          <Paper key={conflict.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Conflict #{index + 1}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Operation: {conflict.type} at position {conflict.position}
            </Typography>
            {conflict.content && (
              <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" fontFamily="monospace">
                  {conflict.content}
                </Typography>
              </Box>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => handleResolve(conflict.id, 'accept')}
              >
                Accept
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleResolve(conflict.id, 'reject')}
              >
                Reject
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleResolve(conflict.id, 'merge')}
              >
                Manual Merge
              </Button>
            </Stack>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  value,
  onChange,
  onSave,
  placeholder = 'Start typing...',
  minHeight = 200,
  maxHeight = 600,
  showCollaborationFeatures = true
}) => {
  const { session, activeUsers, isConnected, sendEdit } = useCollaboration();
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [conflicts, setConflicts] = useState<EditOperation[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const editorRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(value);
  const pendingOperationsRef = useRef<EditOperation[]>([]);

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const oldValue = lastValueRef.current;
    
    if (newValue === oldValue) return;

    // Create edit operation
    const operation: EditOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.id || 'anonymous',
      type: newValue.length > oldValue.length ? 'insert' : 
            newValue.length < oldValue.length ? 'delete' : 'replace',
      position: event.target.selectionStart || 0,
      content: newValue.length > oldValue.length ? 
               newValue.slice(oldValue.length) : undefined,
      length: newValue.length < oldValue.length ? 
              oldValue.length - newValue.length : undefined,
      timestamp: new Date()
    };

    // Add to pending operations
    pendingOperationsRef.current.push(operation);

    // Send operation to other users
    if (session && isConnected) {
      sendEdit(operation);
    }

    // Update local state
    lastValueRef.current = newValue;
    onChange(newValue);
  }, [session, isConnected, sendEdit, onChange, user]);

  // Undo/Redo state management
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousValue = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, value]);
      setUndoStack(prev => prev.slice(0, -1));
      onChange(previousValue);
    }
  }, [undoStack, value, onChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextValue = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, value]);
      setRedoStack(prev => prev.slice(0, -1));
      onChange(nextValue);
    }
  }, [redoStack, value, onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          if (onSave) {
            onSave();
          }
          break;
        case 'z':
          if (event.shiftKey) {
            // Redo functionality
            event.preventDefault();
            handleRedo();
          } else {
            // Undo functionality
            event.preventDefault();
            handleUndo();
          }
          break;
      }
    }
  }, [onSave]);

  const toggleLock = useCallback(() => {
    setIsLocked(!isLocked);
    // Send lock status to other users via collaboration service
    if (session && isConnected) {
      sendEdit({
        id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.id || 'anonymous',
        type: 'lock',
        position: 0,
        content: isLocked ? 'unlocked' : 'locked',
        timestamp: new Date()
      });
    }
  }, [isLocked]);

  const handleConflictResolution = useCallback((resolution: ConflictResolution) => {
    // Apply conflict resolution
    const operation = conflicts.find(c => c.id === resolution.operationId);
    if (operation && resolution.resolution === 'accept') {
      // Apply the operation
      // Apply the accepted operation to the current value
      switch (operation.type) {
        case 'insert':
          if (operation.content && operation.position !== undefined) {
            const newValue = value.slice(0, operation.position) + 
                           operation.content + 
                           value.slice(operation.position);
            onChange(newValue);
          }
          break;
        case 'delete':
          if (operation.position !== undefined && operation.length) {
            const newValue = value.slice(0, operation.position) + 
                           value.slice(operation.position + operation.length);
            onChange(newValue);
          }
          break;
        case 'replace':
          if (operation.content && operation.position !== undefined && operation.length) {
            const newValue = value.slice(0, operation.position) + 
                           operation.content + 
                           value.slice(operation.position + operation.length);
            onChange(newValue);
          }
          break;
      }
    }
    
    // Remove resolved conflict
    setConflicts(prev => prev.filter(c => c.id !== resolution.operationId));
    
    if (conflicts.length <= 1) {
      setShowConflicts(false);
    }
  }, [conflicts]);

  // Sync indicator
  const getSyncStatus = () => {
    if (!isConnected) return { color: 'error', label: 'Offline' };
    if (pendingOperationsRef.current.length > 0) return { color: 'warning', label: 'Syncing...' };
    return { color: 'success', label: 'Synced' };
  };

  const syncStatus = getSyncStatus();

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isConnected ? 'primary.main' : 'grey.300'
      }}
    >
      {/* Header */}
      {showCollaborationFeatures && (
        <Box
          sx={{
            p: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'grey.50'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Collaborative Editor
            </Typography>
            <Chip
              size="small"
              label={syncStatus.label}
              color={syncStatus.color as any}
              variant="outlined"
              icon={<Sync />}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {conflicts.length > 0 && (
              <Tooltip title={`${conflicts.length} conflicts need resolution`}>
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => setShowConflicts(true)}
                >
                  <Warning />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title={isLocked ? 'Unlock document' : 'Lock document'}>
              <IconButton
                size="small"
                color={isLocked ? 'error' : 'default'}
                onClick={toggleLock}
              >
                {isLocked ? <Lock /> : <LockOpen />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Version history">
              <IconButton size="small">
                <History />
              </IconButton>
            </Tooltip>
            
            <Typography variant="caption" color="text.secondary">
              {activeUsers.length} users active
            </Typography>
          </Box>
        </Box>
      )}

      {/* Editor Container */}
      <Box
        ref={editorRef}
        sx={{
          position: 'relative',
          minHeight,
          maxHeight,
          overflow: 'auto'
        }}
      >
        {/* Text Area */}
        <textarea
          ref={textAreaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLocked}
          style={{
            width: '100%',
            minHeight: minHeight,
            maxHeight: maxHeight,
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            backgroundColor: isLocked ? '#f5f5f5' : 'transparent',
            color: isLocked ? '#999' : 'inherit'
          }}
        />

        {/* Collaboration Overlays */}
        {showCollaborationFeatures && session && (
          <>
            <CursorTracking
              containerRef={editorRef}
              enabled={!isLocked}
            />
            <LiveComments
              containerRef={editorRef}
              enabled={!isLocked}
            />
          </>
        )}

        {/* Locked Overlay */}
        {isLocked && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock color="error" />
              <Typography>Document is locked</Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Footer */}
      {showCollaborationFeatures && (
        <Box
          sx={{
            p: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'grey.50'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="caption" color="text.secondary">
              Click to add comments • Ctrl+S to save
            </Typography>
          </Box>
        </Box>
      )}

      {/* Conflict Resolution Dialog */}
      {showConflicts && conflicts.length > 0 && (
        <ConflictDialog
          conflicts={conflicts}
          onResolve={handleConflictResolution}
          onClose={() => setShowConflicts(false)}
        />
      )}
    </Paper>
  );
};