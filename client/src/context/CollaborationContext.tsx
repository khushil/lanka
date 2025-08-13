import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { CollaborationUser, CollaborationSession, LiveComment, CursorPosition, EditOperation } from '../types/collaboration';
import { webSocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';

interface CollaborationContextType {
  session: CollaborationSession | null;
  activeUsers: CollaborationUser[];
  comments: LiveComment[];
  cursors: Map<string, CursorPosition>;
  isConnected: boolean;
  joinSession: (documentId: string) => void;
  leaveSession: () => void;
  updateCursor: (position: CursorPosition) => void;
  addComment: (comment: Omit<LiveComment, 'id' | 'timestamp'>) => void;
  resolveComment: (commentId: string) => void;
  sendEdit: (operation: EditOperation) => void;
}

interface CollaborationState {
  session: CollaborationSession | null;
  activeUsers: CollaborationUser[];
  comments: LiveComment[];
  cursors: Map<string, CursorPosition>;
  isConnected: boolean;
}

type CollaborationAction =
  | { type: 'SET_SESSION'; payload: CollaborationSession }
  | { type: 'CLEAR_SESSION' }
  | { type: 'UPDATE_ACTIVE_USERS'; payload: CollaborationUser[] }
  | { type: 'ADD_COMMENT'; payload: LiveComment }
  | { type: 'UPDATE_COMMENT'; payload: LiveComment }
  | { type: 'REMOVE_COMMENT'; payload: string }
  | { type: 'UPDATE_CURSOR'; payload: { userId: string; position: CursorPosition } }
  | { type: 'REMOVE_CURSOR'; payload: string }
  | { type: 'SET_CONNECTED'; payload: boolean };

const initialState: CollaborationState = {
  session: null,
  activeUsers: [],
  comments: [],
  cursors: new Map(),
  isConnected: false
};

// Generate user colors for collaboration
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
];

const collaborationReducer = (state: CollaborationState, action: CollaborationAction): CollaborationState => {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload
      };

    case 'CLEAR_SESSION':
      return {
        ...state,
        session: null,
        activeUsers: [],
        comments: [],
        cursors: new Map()
      };

    case 'UPDATE_ACTIVE_USERS':
      // Assign colors to users
      const usersWithColors = action.payload.map((user, index) => ({
        ...user,
        color: userColors[index % userColors.length]
      }));
      
      return {
        ...state,
        activeUsers: usersWithColors
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload]
      };

    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.payload.id ? action.payload : comment
        )
      };

    case 'REMOVE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter(comment => comment.id !== action.payload)
      };

    case 'UPDATE_CURSOR':
      const newCursors = new Map(state.cursors);
      newCursors.set(action.payload.userId, action.payload.position);
      return {
        ...state,
        cursors: newCursors
      };

    case 'REMOVE_CURSOR':
      const updatedCursors = new Map(state.cursors);
      updatedCursors.delete(action.payload);
      return {
        ...state,
        cursors: updatedCursors
      };

    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload
      };

    default:
      return state;
  }
};

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);
  const { user } = useAuth();

  const joinSession = useCallback((documentId: string) => {
    if (!user) return;

    webSocketService.emit('join-collaboration', {
      documentId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  }, [user]);

  const leaveSession = useCallback(() => {
    if (state.session) {
      webSocketService.emit('leave-collaboration', {
        sessionId: state.session.id,
        userId: user?.id
      });
      dispatch({ type: 'CLEAR_SESSION' });
    }
  }, [state.session, user]);

  const updateCursor = useCallback((position: CursorPosition) => {
    if (state.session && user) {
      webSocketService.emit('cursor-update', {
        sessionId: state.session.id,
        userId: user.id,
        position
      });
    }
  }, [state.session, user]);

  const addComment = useCallback((comment: Omit<LiveComment, 'id' | 'timestamp'>) => {
    if (state.session && user) {
      const newComment: LiveComment = {
        ...comment,
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isOnline: true,
          lastSeen: new Date(),
          color: userColors[0] // Will be assigned properly by the server
        }
      };

      webSocketService.emit('add-comment', {
        sessionId: state.session.id,
        comment: newComment
      });
    }
  }, [state.session, user]);

  const resolveComment = useCallback((commentId: string) => {
    if (state.session) {
      webSocketService.emit('resolve-comment', {
        sessionId: state.session.id,
        commentId
      });
    }
  }, [state.session]);

  const sendEdit = useCallback((operation: EditOperation) => {
    if (state.session) {
      webSocketService.emit('edit-operation', {
        sessionId: state.session.id,
        operation
      });
    }
  }, [state.session]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleSessionJoined = (session: CollaborationSession) => {
      dispatch({ type: 'SET_SESSION', payload: session });
      dispatch({ type: 'SET_CONNECTED', payload: true });
    };

    const handleSessionLeft = () => {
      dispatch({ type: 'CLEAR_SESSION' });
      dispatch({ type: 'SET_CONNECTED', payload: false });
    };

    const handleUsersUpdate = (users: CollaborationUser[]) => {
      dispatch({ type: 'UPDATE_ACTIVE_USERS', payload: users });
    };

    const handleCursorUpdate = (data: { userId: string; position: CursorPosition }) => {
      if (data.userId !== user?.id) {
        dispatch({ type: 'UPDATE_CURSOR', payload: data });
      }
    };

    const handleUserLeft = (userId: string) => {
      dispatch({ type: 'REMOVE_CURSOR', payload: userId });
    };

    const handleCommentAdded = (comment: LiveComment) => {
      dispatch({ type: 'ADD_COMMENT', payload: comment });
    };

    const handleCommentUpdated = (comment: LiveComment) => {
      dispatch({ type: 'UPDATE_COMMENT', payload: comment });
    };

    const handleCommentRemoved = (commentId: string) => {
      dispatch({ type: 'REMOVE_COMMENT', payload: commentId });
    };

    const handleConnectionChange = (connected: boolean) => {
      dispatch({ type: 'SET_CONNECTED', payload: connected });
    };

    // Register event listeners
    webSocketService.on('session-joined', handleSessionJoined);
    webSocketService.on('session-left', handleSessionLeft);
    webSocketService.on('users-updated', handleUsersUpdate);
    webSocketService.on('cursor-updated', handleCursorUpdate);
    webSocketService.on('user-left', handleUserLeft);
    webSocketService.on('comment-added', handleCommentAdded);
    webSocketService.on('comment-updated', handleCommentUpdated);
    webSocketService.on('comment-removed', handleCommentRemoved);
    webSocketService.on('connect', () => handleConnectionChange(true));
    webSocketService.on('disconnect', () => handleConnectionChange(false));

    return () => {
      // Clean up event listeners
      webSocketService.off('session-joined', handleSessionJoined);
      webSocketService.off('session-left', handleSessionLeft);
      webSocketService.off('users-updated', handleUsersUpdate);
      webSocketService.off('cursor-updated', handleCursorUpdate);
      webSocketService.off('user-left', handleUserLeft);
      webSocketService.off('comment-added', handleCommentAdded);
      webSocketService.off('comment-updated', handleCommentUpdated);
      webSocketService.off('comment-removed', handleCommentRemoved);
      webSocketService.off('connect', () => handleConnectionChange(true));
      webSocketService.off('disconnect', () => handleConnectionChange(false));
    };
  }, [user]);

  const contextValue: CollaborationContextType = {
    session: state.session,
    activeUsers: state.activeUsers,
    comments: state.comments,
    cursors: state.cursors,
    isConnected: state.isConnected,
    joinSession,
    leaveSession,
    updateCursor,
    addComment,
    resolveComment,
    sendEdit
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};