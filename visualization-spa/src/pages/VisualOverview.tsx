import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedCard from '../components/visualizations/AnimatedCard';
import MetricsDisplay from '../components/visualizations/MetricsDisplay';
import '../styles/visualizations.css';

interface PlatformModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  metrics: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'stable';
  };
  color: string;
}

const VisualOverview: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const modules: PlatformModule[] = [
    {
      id: 'requirements',
      title: 'Requirements Analysis',
      description: 'Interactive visualization of requirement relationships and patterns',
      icon: '🔍',
      route: '/visualizations/requirements',
      metrics: { value: 1247, label: 'Requirements Analyzed', trend: 'up' },
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'architecture',
      title: 'System Architecture',
      description: 'Visual representation of system components and dependencies',
      icon: '🏗️',
      route: '/visualizations/architecture',
      metrics: { value: 89, label: 'Components Mapped', trend: 'up' },
      color: 'from-green-500 to-teal-600'
    },
    {
      id: 'testing',
      title: 'Test Coverage',
      description: 'Real-time testing metrics and coverage visualization',
      icon: '🧪',
      route: '/visualizations/testing',
      metrics: { value: 94.2, label: '% Coverage', trend: 'stable' },
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      description: 'Live performance monitoring and optimization insights',
      icon: '⚡',
      route: '/visualizations/performance',
      metrics: { value: 2.3, label: 'Avg Response Time (s)', trend: 'down' },
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'deployment',
      title: 'Deployment Pipeline',
      description: 'Visual CI/CD pipeline status and deployment tracking',
      icon: '🚀',
      route: '/visualizations/deployment',
      metrics: { value: 342, label: 'Deployments', trend: 'up' },
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'analytics',
      title: 'Data Analytics',
      description: 'Business intelligence and data pattern visualization',
      icon: '📊',
      route: '/visualizations/analytics',
      metrics: { value: 15.7, label: 'Insights Generated', trend: 'up' },
      color: 'from-indigo-500 to-purple-600'
    }
  ];

  const overallMetrics = [
    { label: 'Active Projects', value: 24, trend: 'up' as const },
    { label: 'Team Members', value: 47, trend: 'stable' as const },
    { label: 'Code Quality', value: 96.8, trend: 'up' as const },
    { label: 'Uptime', value: 99.9, trend: 'stable' as const }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: "easeOut"
      }
    }
  };

  const gridVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="visual-overview">
      <motion.div
        className="hero-section"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        <motion.div className="hero-content" variants={heroVariants}>
          <div className="hero-background">
            <div className="animated-particles"></div>
            <div className="gradient-orb orb-1"></div>
            <div className="gradient-orb orb-2"></div>
            <div className="gradient-orb orb-3"></div>
          </div>
          
          <div className="hero-text">
            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Lanka Platform
              <span className="gradient-text"> Visual Intelligence</span>
            </motion.h1>
            
            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Experience your development workflow through interactive visualizations
              and real-time insights that transform data into actionable intelligence.
            </motion.p>
          </div>

          <motion.div
            className="metrics-overview"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <MetricsDisplay metrics={overallMetrics} layout="horizontal" />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="modules-section"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        <motion.h2
          className="section-title"
          variants={heroVariants}
        >
          Explore Platform Modules
        </motion.h2>

        <motion.div
          className="modules-grid"
          variants={gridVariants}
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
              onHoverStart={() => setSelectedModule(module.id)}
              onHoverEnd={() => setSelectedModule(null)}
            >
              <Link to={module.route} className="module-link">
                <AnimatedCard
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  metrics={module.metrics}
                  color={module.color}
                  isSelected={selectedModule === module.id}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="quick-actions"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <div className="quick-actions-content">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <motion.button
              className="action-btn primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🎯 Create New Analysis
            </motion.button>
            <motion.button
              className="action-btn secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📈 View Reports
            </motion.button>
            <motion.button
              className="action-btn tertiary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ⚙️ Configure Settings
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VisualOverview;