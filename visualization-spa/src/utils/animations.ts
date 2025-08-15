import { Variants, Transition } from 'framer-motion';

// Page transition animations
export const pageTransitions = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  slideInFromRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: { duration: 0.5, ease: "easeInOut" }
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

// Stagger container animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Hover effects
export const hoverEffects = {
  lift: {
    whileHover: {
      scale: 1.05,
      y: -5,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.2 }
    },
    whileTap: { scale: 0.95 }
  },

  glow: {
    whileHover: {
      scale: 1.02,
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.4)',
        '0 0 0 10px rgba(59, 130, 246, 0)',
      ],
      transition: { duration: 0.3 }
    }
  },

  rotate: {
    whileHover: {
      rotate: 5,
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  },

  bounce: {
    whileHover: {
      y: [-2, -8, -2],
      transition: {
        duration: 0.4,
        ease: "easeInOut"
      }
    }
  }
};

// Loading animations
export const loadingAnimations = {
  spinner: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  },

  pulse: {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  wave: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  dots: {
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.5, 1]
      }
    }
  }
};

// Data visualization animations
export const dataAnimations = {
  countUp: (targetValue: number, duration: number = 2) => ({
    initial: { value: 0 },
    animate: { value: targetValue },
    transition: {
      duration,
      ease: "easeOut"
    }
  }),

  chartEntry: {
    initial: { scaleY: 0, opacity: 0 },
    animate: { scaleY: 1, opacity: 1 },
    transition: { duration: 0.6, ease: "easeOut" }
  },

  nodeEntry: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },

  pathDraw: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 1.5, ease: "easeInOut" }
  }
};

// Notification animations
export const notificationAnimations = {
  slideInFromTop: {
    initial: { opacity: 0, y: -100, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -100, scale: 0.9 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  slideInFromRight: {
    initial: { opacity: 0, x: 300 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 300 },
    transition: { duration: 0.4, ease: "easeInOut" }
  },

  fadeAndScale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.2 }
  }
};

// Modal animations
export const modalAnimations = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },

  modal: {
    initial: { opacity: 0, scale: 0.8, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: 50 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  drawer: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

// Form animations
export const formAnimations = {
  fieldFocus: {
    whileFocus: {
      scale: 1.02,
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
      transition: { duration: 0.2 }
    }
  },

  errorShake: {
    animate: {
      x: [-10, 10, -10, 10, 0],
      transition: { duration: 0.5 }
    }
  },

  successPulse: {
    animate: {
      scale: [1, 1.05, 1],
      borderColor: ["#10b981", "#34d399", "#10b981"],
      transition: { duration: 0.6 }
    }
  }
};

// Navigation animations
export const navigationAnimations = {
  mobileMenu: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.3, ease: "easeInOut" }
  },

  breadcrumb: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 }
  },

  tabSwitch: {
    whileHover: { y: -2 },
    whileTap: { y: 0 },
    transition: { duration: 0.1 }
  }
};

// Utility functions for custom animations
export const createStaggerAnimation = (
  children: number,
  staggerDelay: number = 0.1,
  childAnimation?: Variants
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.2,
      ...(childAnimation && { when: "beforeChildren" })
    }
  }
});

export const createSpringAnimation = (
  stiffness: number = 300,
  damping: number = 20,
  mass: number = 1
): Transition => ({
  type: "spring",
  stiffness,
  damping,
  mass
});

export const createTimingAnimation = (
  duration: number = 0.3,
  ease: string | number[] = "easeOut",
  delay: number = 0
): Transition => ({
  duration,
  ease,
  delay
});

// Animation presets for common UI patterns
export const animationPresets = {
  // Quick and snappy for buttons and small interactions
  quick: { duration: 0.15, ease: "easeOut" },
  
  // Standard for most UI elements
  standard: { duration: 0.3, ease: "easeInOut" },
  
  // Smooth for page transitions and large movements
  smooth: { duration: 0.5, ease: "easeInOut" },
  
  // Bouncy for playful interactions
  bouncy: { type: "spring", stiffness: 400, damping: 15 },
  
  // Gentle for subtle state changes
  gentle: { duration: 0.6, ease: "easeOut" }
};

// Theme-based animation variants
export const themeAnimations = {
  dark: {
    glow: {
      boxShadow: [
        '0 0 0 0 rgba(147, 197, 253, 0.4)',
        '0 0 0 15px rgba(147, 197, 253, 0)',
      ]
    }
  },
  
  light: {
    glow: {
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.4)',
        '0 0 0 15px rgba(59, 130, 246, 0)',
      ]
    }
  }
};

// Performance optimization utilities
export const reducedMotionVariants = (normalVariants: Variants): Variants => {
  const reduced: Variants = {};
  
  Object.keys(normalVariants).forEach(key => {
    const variant = normalVariants[key];
    if (typeof variant === 'object' && variant.transition) {
      reduced[key] = {
        ...variant,
        transition: { duration: 0.01 }
      };
    } else {
      reduced[key] = variant;
    }
  });
  
  return reduced;
};

export const shouldReduceMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};