import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Metric {
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  change?: number;
  unit?: string;
  icon?: string;
}

interface MetricsDisplayProps {
  metrics: Metric[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  animated?: boolean;
  showTrends?: boolean;
  updateInterval?: number;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  metrics,
  layout = 'horizontal',
  animated = true,
  showTrends = true,
  updateInterval = 5000
}) => {
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Initialize animated values
    const initialValues: { [key: string]: number } = {};
    metrics.forEach(metric => {
      if (typeof metric.value === 'number') {
        initialValues[metric.label] = 0;
      }
    });
    setAnimatedValues(initialValues);

    // Animate to actual values
    const timer = setTimeout(() => {
      const targetValues: { [key: string]: number } = {};
      metrics.forEach(metric => {
        if (typeof metric.value === 'number') {
          targetValues[metric.label] = metric.value;
        }
      });
      setAnimatedValues(targetValues);
    }, 500);

    return () => clearTimeout(timer);
  }, [metrics]);

  useEffect(() => {
    if (updateInterval > 0) {
      const interval = setInterval(() => {
        setIsLive(true);
        // Simulate live updates with small variations
        setAnimatedValues(prev => {
          const updated = { ...prev };
          metrics.forEach(metric => {
            if (typeof metric.value === 'number') {
              const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
              updated[metric.label] = Math.max(0, metric.value * (1 + variation));
            }
          });
          return updated;
        });
        
        setTimeout(() => setIsLive(false), 300);
      }, updateInterval);

      return () => clearInterval(interval);
    }
  }, [updateInterval, metrics]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.4)',
        '0 0 0 10px rgba(59, 130, 246, 0)',
        '0 0 0 0 rgba(59, 130, 246, 0)'
      ],
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'stable': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'string') return value;
    
    let formattedValue: string;
    
    if (value >= 1000000) {
      formattedValue = (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      formattedValue = (value / 1000).toFixed(1) + 'K';
    } else if (value % 1 !== 0) {
      formattedValue = value.toFixed(1);
    } else {
      formattedValue = value.toString();
    }
    
    return unit ? `${formattedValue}${unit}` : formattedValue;
  };

  const AnimatedCounter: React.FC<{ 
    value: number; 
    duration?: number;
    unit?: string;
  }> = ({ value, duration = 1, unit }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let startTime: number;
      let animationFrame: number;

      const updateCount = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        
        const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
        const currentValue = value * easeOutQuart(progress);
        
        setCount(currentValue);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(updateCount);
        }
      };

      animationFrame = requestAnimationFrame(updateCount);

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, [value, duration]);

    return <span>{formatValue(count, unit)}</span>;
  };

  return (
    <motion.div
      className={`metrics-display ${layout}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          className={`metric-item ${isLive ? 'live-update' : ''}`}
          variants={itemVariants}
          animate={isLive ? "pulse" : "visible"}
          {...(isLive ? pulseVariants : {})}
        >
          <div className="metric-header">
            {metric.icon && (
              <span className="metric-icon">{metric.icon}</span>
            )}
            <span className="metric-label">{metric.label}</span>
            {showTrends && (
              <motion.span
                className="metric-trend"
                style={{ color: getTrendColor(metric.trend) }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                {getTrendIcon(metric.trend)}
              </motion.span>
            )}
          </div>

          <div className="metric-value">
            {animated && typeof metric.value === 'number' ? (
              <AnimatedCounter 
                value={animatedValues[metric.label] || metric.value} 
                unit={metric.unit}
              />
            ) : (
              formatValue(metric.value, metric.unit)
            )}
          </div>

          {metric.change !== undefined && (
            <motion.div
              className="metric-change"
              style={{ color: getTrendColor(metric.trend) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              {metric.change > 0 ? '+' : ''}{metric.change}
              {metric.unit || '%'}
            </motion.div>
          )}

          <div className="metric-background">
            <motion.div
              className="metric-progress"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ 
                delay: 0.3 + index * 0.1, 
                duration: 1,
                ease: "easeOut"
              }}
            />
          </div>

          {isLive && (
            <motion.div
              className="live-indicator"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <div className="pulse-dot"></div>
              <span>LIVE</span>
            </motion.div>
          )}
        </motion.div>
      ))}

      <div className="metrics-glow">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="glow-orb"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default MetricsDisplay;