import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  title: string;
  description: string;
  icon: string;
  metrics: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'stable';
  };
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  description,
  icon,
  metrics,
  color,
  isSelected = false,
  onClick
}) => {
  const cardVariants = {
    rest: {
      scale: 1,
      rotateY: 0,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      scale: 1.05,
      rotateY: 5,
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    selected: {
      scale: 1.02,
      boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
      borderColor: '#3b82f6'
    }
  };

  const iconVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.2,
      rotate: 15,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const contentVariants = {
    rest: { y: 0, opacity: 1 },
    hover: {
      y: -5,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️'
  };

  const trendColors = {
    up: '#10b981',
    down: '#ef4444',
    stable: '#6b7280'
  };

  return (
    <motion.div
      className={`animated-card ${isSelected ? 'selected' : ''}`}
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      animate={isSelected ? "selected" : "rest"}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${color.split(' ')[1]} 0%, ${color.split(' ')[3]} 100%)`,
      }}
    >
      <div className="card-background">
        <div className="gradient-overlay"></div>
        <div className="pattern-overlay"></div>
      </div>

      <motion.div className="card-content" variants={contentVariants}>
        <div className="card-header">
          <motion.div
            className="card-icon"
            variants={iconVariants}
          >
            {icon}
          </motion.div>
          
          <div className="card-metrics">
            <div className="metric-value">
              {typeof metrics.value === 'number' && metrics.value % 1 !== 0 
                ? metrics.value.toFixed(1) 
                : metrics.value
              }
            </div>
            <div 
              className="metric-trend"
              style={{ color: trendColors[metrics.trend] }}
            >
              {trendIcons[metrics.trend]}
            </div>
          </div>
        </div>

        <div className="card-body">
          <h3 className="card-title">{title}</h3>
          <p className="card-description">{description}</p>
          <div className="card-label">{metrics.label}</div>
        </div>

        <div className="card-footer">
          <motion.div
            className="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          >
            <div className="progress-fill"></div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="card-glow"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      ></motion.div>

      <div className="floating-particles">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{ 
              opacity: 0,
              scale: 0,
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: Math.random() * 400 - 200,
              y: Math.random() * 400 - 200
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default AnimatedCard;