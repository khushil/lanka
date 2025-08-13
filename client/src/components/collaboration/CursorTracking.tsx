import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import { useCollaboration } from '../../context/CollaborationContext';
import { CursorPosition } from '../../types/collaboration';

interface CursorTrackingProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface CursorIndicatorProps {
  position: CursorPosition;
  userName: string;
  userColor: string;
  avatar?: string;
}

const CursorIndicator: React.FC<CursorIndicatorProps> = ({
  position,
  userName,
  userColor,
  avatar
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${position.x}px`;
      cursorRef.current.style.top = `${position.y}px`;
    }
  }, [position.x, position.y]);

  return (
    <Box
      ref={cursorRef}
      sx={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-2px, -2px)',
        transition: 'all 0.1s ease-out'
      }}
    >
      {/* Cursor */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M2 2L18 8L8 10L6 18L2 2Z"
          fill={userColor}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User label */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute',
          top: 20,
          left: 0,
          px: 1,
          py: 0.5,
          bgcolor: userColor,
          color: 'white',
          borderRadius: 1,
          minWidth: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: 12,
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease-in-out'
        }}
      >
        <Avatar
          src={avatar}
          sx={{
            width: 16,
            height: 16,
            fontSize: 10,
            bgcolor: 'white',
            color: userColor
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="caption" sx={{ color: 'inherit', fontSize: 11 }}>
          {userName}
        </Typography>
      </Paper>
    </Box>
  );
};

export const CursorTracking: React.FC<CursorTrackingProps> = ({
  containerRef,
  enabled = true
}) => {
  const { cursors, activeUsers, updateCursor } = useCollaboration();
  const lastMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const throttleRef = useRef<NodeJS.Timeout>();

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Throttle cursor updates to avoid overwhelming the socket
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      const position: CursorPosition = {
        x,
        y,
        elementId: (event.target as Element)?.id || undefined,
        timestamp: new Date()
      };

      lastMousePosition.current = { x, y };
      updateCursor(position);
    }, 50); // Update every 50ms
  }, [enabled, containerRef, updateCursor]);

  const handleMouseLeave = useCallback(() => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }
  }, []);

  // Set up mouse tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [handleMouseMove, handleMouseLeave, enabled, containerRef]);

  // Render cursors
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        '& @keyframes fadeIn': {
          from: { opacity: 0, transform: 'scale(0.8)' },
          to: { opacity: 1, transform: 'scale(1)' }
        }
      }}
    >
      {Array.from(cursors.entries()).map(([userId, position]) => {
        const user = activeUsers.find(u => u.id === userId);
        if (!user) return null;

        // Filter out old cursor positions (older than 5 seconds)
        const positionAge = Date.now() - new Date(position.timestamp).getTime();
        if (positionAge > 5000) return null;

        return (
          <CursorIndicator
            key={userId}
            position={position}
            userName={user.name}
            userColor={user.color}
            avatar={user.avatar}
          />
        );
      })}
    </Box>
  );
};