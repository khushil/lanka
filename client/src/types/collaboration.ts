// Collaboration Types
export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  cursor?: CursorPosition;
  color: string; // Assigned color for this user
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp: Date;
}

export interface LiveComment {
  id: string;
  userId: string;
  user: CollaborationUser;
  content: string;
  position: {
    x: number;
    y: number;
    elementId?: string;
  };
  timestamp: Date;
  isResolved: boolean;
  replies?: LiveCommentReply[];
}

export interface LiveCommentReply {
  id: string;
  userId: string;
  user: CollaborationUser;
  content: string;
  timestamp: Date;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  users: CollaborationUser[];
  activeUsers: string[]; // User IDs currently active
  lastActivity: Date;
  isLocked: boolean;
  lockedBy?: string; // User ID who locked the document
}

export interface EditOperation {
  id: string;
  userId: string;
  type: 'insert' | 'delete' | 'replace' | 'move';
  position: number;
  content?: string;
  length?: number;
  timestamp: Date;
  elementId?: string;
}

export interface ConflictResolution {
  operationId: string;
  resolution: 'accept' | 'reject' | 'merge';
  mergedContent?: string;
  resolvedBy: string;
  timestamp: Date;
}

export interface PresenceIndicator {
  userId: string;
  position: CursorPosition;
  selection?: {
    start: number;
    end: number;
    elementId?: string;
  };
  isTyping: boolean;
  timestamp: Date;
}