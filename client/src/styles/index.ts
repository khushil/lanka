// Global styles and theme configuration
export const globalStyles = {
  // Global CSS variables
  ':root': {
    '--primary-color': '#1976d2',
    '--secondary-color': '#dc004e',
    '--success-color': '#2e7d32',
    '--warning-color': '#ed6c02',
    '--error-color': '#d32f2f',
    '--info-color': '#0288d1',
    '--border-radius': '8px',
    '--box-shadow': '0 2px 8px rgba(0,0,0,0.1)',
    '--transition': 'all 0.2s ease-in-out',
  },
  
  // Global styles
  '*': {
    boxSizing: 'border-box',
  },
  
  'html, body': {
    margin: 0,
    padding: 0,
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  
  '#root': {
    minHeight: '100vh',
  },
  
  // Scrollbar styling
  '::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  
  '::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  
  '::-webkit-scrollbar-thumb': {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '3px',
  },
  
  '::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(0,0,0,0.3)',
  },
};

// Animation keyframes
export const animations = {
  fadeIn: {
    '@keyframes fadeIn': {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },
  
  slideInFromRight: {
    '@keyframes slideInFromRight': {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
    },
  },
  
  slideInFromLeft: {
    '@keyframes slideInFromLeft': {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    },
  },
  
  bounce: {
    '@keyframes bounce': {
      '0%, 20%, 53%, 80%, 100%': {
        animationTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        transform: 'translate3d(0, 0, 0)',
      },
      '40%, 43%': {
        animationTimingFunction: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
        transform: 'translate3d(0, -30px, 0)',
      },
      '70%': {
        animationTimingFunction: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
        transform: 'translate3d(0, -15px, 0)',
      },
      '90%': {
        transform: 'translate3d(0, -4px, 0)',
      },
    },
  },
};

// Common component styles
export const commonStyles = {
  card: {
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    },
  },
  
  button: {
    borderRadius: '8px',
    textTransform: 'none',
    fontWeight: 500,
    padding: '8px 16px',
    transition: 'all 0.2s ease-in-out',
  },
  
  input: {
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
    },
  },
  
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
  },
  
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  textEllipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};