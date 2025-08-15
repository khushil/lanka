import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import InteractiveGraph from '../../components/visualizations/InteractiveGraph';
import HeatmapChart from '../../components/visualizations/HeatmapChart';
import '../../styles/visualizations.css';

interface Requirement {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'review' | 'approved' | 'implemented';
  complexity: number;
  dependencies: string[];
  stakeholders: string[];
  description: string;
}

interface RequirementNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  complexity: number;
  group: number;
}

interface RequirementLink extends d3.SimulationLinkDatum<RequirementNode> {
  source: string | RequirementNode;
  target: string | RequirementNode;
  strength: number;
  type: 'dependency' | 'similarity' | 'stakeholder';
}

const RequirementsVisual: React.FC = () => {
  const [activeView, setActiveView] = useState<'graph' | 'heatmap' | 'patterns'>('graph');
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real app, this would come from API
  const requirements: Requirement[] = [
    {
      id: 'req-001',
      title: 'User Authentication System',
      category: 'Security',
      priority: 'critical',
      status: 'implemented',
      complexity: 8,
      dependencies: ['req-002', 'req-015'],
      stakeholders: ['Security Team', 'Frontend Team'],
      description: 'Implement secure user authentication with multi-factor support'
    },
    {
      id: 'req-002',
      title: 'Database Schema Design',
      category: 'Infrastructure',
      priority: 'high',
      status: 'approved',
      complexity: 7,
      dependencies: ['req-003'],
      stakeholders: ['Backend Team', 'DBA Team'],
      description: 'Design scalable database schema for user data and application state'
    },
    {
      id: 'req-003',
      title: 'API Rate Limiting',
      category: 'Security',
      priority: 'high',
      status: 'review',
      complexity: 5,
      dependencies: [],
      stakeholders: ['Backend Team', 'Security Team'],
      description: 'Implement API rate limiting to prevent abuse and ensure fair usage'
    },
    {
      id: 'req-004',
      title: 'Real-time Notifications',
      category: 'Features',
      priority: 'medium',
      status: 'draft',
      complexity: 6,
      dependencies: ['req-001', 'req-005'],
      stakeholders: ['Frontend Team', 'Product Team'],
      description: 'Enable real-time push notifications for user activities'
    },
    {
      id: 'req-005',
      title: 'WebSocket Connection Management',
      category: 'Infrastructure',
      priority: 'medium',
      status: 'draft',
      complexity: 7,
      dependencies: ['req-002'],
      stakeholders: ['Backend Team', 'DevOps Team'],
      description: 'Manage WebSocket connections for real-time features'
    },
    {
      id: 'req-006',
      title: 'Data Visualization Dashboard',
      category: 'Features',
      priority: 'high',
      status: 'review',
      complexity: 9,
      dependencies: ['req-001', 'req-002'],
      stakeholders: ['Frontend Team', 'Data Team'],
      description: 'Create interactive dashboard for data visualization and analytics'
    }
  ];

  const categories = ['all', ...Array.from(new Set(requirements.map(r => r.category)))];

  const filteredRequirements = requirements.filter(req => {
    const matchesCategory = filterCategory === 'all' || req.category === filterCategory;
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Transform requirements to graph data
  const graphData = React.useMemo(() => {
    const nodes: RequirementNode[] = filteredRequirements.map((req, index) => ({
      id: req.id,
      title: req.title,
      category: req.category,
      priority: req.priority,
      status: req.status,
      complexity: req.complexity,
      group: categories.indexOf(req.category)
    }));

    const links: RequirementLink[] = [];
    
    // Create dependency links
    filteredRequirements.forEach(req => {
      req.dependencies.forEach(depId => {
        if (filteredRequirements.find(r => r.id === depId)) {
          links.push({
            source: req.id,
            target: depId,
            strength: 0.8,
            type: 'dependency'
          });
        }
      });
    });

    // Create similarity links based on category and stakeholders
    for (let i = 0; i < filteredRequirements.length; i++) {
      for (let j = i + 1; j < filteredRequirements.length; j++) {
        const req1 = filteredRequirements[i];
        const req2 = filteredRequirements[j];
        
        const sharedStakeholders = req1.stakeholders.filter(s => req2.stakeholders.includes(s));
        const sameCategory = req1.category === req2.category;
        
        if (sharedStakeholders.length > 0 || sameCategory) {
          const strength = (sharedStakeholders.length * 0.3) + (sameCategory ? 0.4 : 0);
          if (strength > 0.3) {
            links.push({
              source: req1.id,
              target: req2.id,
              strength,
              type: sharedStakeholders.length > 0 ? 'stakeholder' : 'similarity'
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [filteredRequirements, categories]);

  // Generate similarity matrix for heatmap
  const similarityMatrix = React.useMemo(() => {
    const matrix: number[][] = [];
    const labels = filteredRequirements.map(r => r.title);

    for (let i = 0; i < filteredRequirements.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < filteredRequirements.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const req1 = filteredRequirements[i];
          const req2 = filteredRequirements[j];
          
          // Calculate similarity based on multiple factors
          let similarity = 0;
          
          // Category similarity
          if (req1.category === req2.category) similarity += 0.3;
          
          // Priority similarity
          const priorityValues = { low: 1, medium: 2, high: 3, critical: 4 };
          const priorityDiff = Math.abs(priorityValues[req1.priority] - priorityValues[req2.priority]);
          similarity += (1 - priorityDiff / 3) * 0.2;
          
          // Complexity similarity
          const complexityDiff = Math.abs(req1.complexity - req2.complexity);
          similarity += (1 - complexityDiff / 10) * 0.2;
          
          // Stakeholder overlap
          const sharedStakeholders = req1.stakeholders.filter(s => req2.stakeholders.includes(s));
          similarity += (sharedStakeholders.length / Math.max(req1.stakeholders.length, req2.stakeholders.length)) * 0.3;
          
          matrix[i][j] = Math.max(0, Math.min(1, similarity));
        }
      }
    }

    return { matrix, labels };
  }, [filteredRequirements]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleNodeClick = (nodeId: string) => {
    const requirement = requirements.find(r => r.id === nodeId);
    setSelectedRequirement(requirement || null);
  };

  const viewVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="requirements-visual">
      <motion.div
        className="visual-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <h1 className="page-title">
            <span className="icon">🔍</span>
            Requirements Analysis
          </h1>
          <p className="page-subtitle">
            Interactive visualization of requirement relationships, dependencies, and patterns
          </p>
        </div>

        <div className="controls-panel">
          <div className="view-switcher">
            {['graph', 'heatmap', 'patterns'].map(view => (
              <motion.button
                key={view}
                className={`view-btn ${activeView === view ? 'active' : ''}`}
                onClick={() => setActiveView(view as any)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {view === 'graph' && '🕸️'}
                {view === 'heatmap' && '🔥'}
                {view === 'patterns' && '🎯'}
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </motion.button>
            ))}
          </div>

          <div className="filters">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </motion.div>

      <div className="visual-content">
        <AnimatePresence mode="wait">
          {activeView === 'graph' && (
            <motion.div
              key="graph"
              className="visualization-panel"
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.4 }}
            >
              <InteractiveGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                selectedNode={selectedRequirement?.id || null}
                width={800}
                height={600}
              />
            </motion.div>
          )}

          {activeView === 'heatmap' && (
            <motion.div
              key="heatmap"
              className="visualization-panel"
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.4 }}
            >
              <HeatmapChart
                data={similarityMatrix.matrix}
                labels={similarityMatrix.labels}
                title="Requirements Similarity Matrix"
                colorScheme="blues"
              />
            </motion.div>
          )}

          {activeView === 'patterns' && (
            <motion.div
              key="patterns"
              className="visualization-panel patterns-view"
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.4 }}
            >
              <div className="patterns-grid">
                <div className="pattern-card">
                  <h3>Category Distribution</h3>
                  <div className="category-stats">
                    {categories.slice(1).map(cat => {
                      const count = requirements.filter(r => r.category === cat).length;
                      const percentage = (count / requirements.length * 100).toFixed(1);
                      return (
                        <div key={cat} className="stat-item">
                          <span className="stat-label">{cat}</span>
                          <div className="stat-bar">
                            <div 
                              className="stat-fill" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="stat-value">{count} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pattern-card">
                  <h3>Priority Analysis</h3>
                  <div className="priority-stats">
                    {['critical', 'high', 'medium', 'low'].map(priority => {
                      const count = requirements.filter(r => r.priority === priority).length;
                      return (
                        <div key={priority} className={`priority-item ${priority}`}>
                          <span className="priority-indicator"></span>
                          <span className="priority-label">{priority.toUpperCase()}</span>
                          <span className="priority-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pattern-card">
                  <h3>Complexity Distribution</h3>
                  <div className="complexity-chart">
                    {requirements.map(req => (
                      <div 
                        key={req.id}
                        className="complexity-bar"
                        style={{ height: `${req.complexity * 10}%` }}
                        title={`${req.title}: ${req.complexity}/10`}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="pattern-card">
                  <h3>Status Overview</h3>
                  <div className="status-stats">
                    {['draft', 'review', 'approved', 'implemented'].map(status => {
                      const count = requirements.filter(r => r.status === status).length;
                      return (
                        <div key={status} className={`status-item ${status}`}>
                          <span className="status-indicator"></span>
                          <span className="status-label">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          <span className="status-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedRequirement && (
          <motion.div
            className="requirement-details"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
          >
            <div className="details-header">
              <h3>{selectedRequirement.title}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedRequirement(null)}
              >
                ×
              </button>
            </div>

            <div className="details-content">
              <div className="detail-item">
                <label>Category:</label>
                <span className={`category-tag ${selectedRequirement.category.toLowerCase()}`}>
                  {selectedRequirement.category}
                </span>
              </div>

              <div className="detail-item">
                <label>Priority:</label>
                <span className={`priority-tag ${selectedRequirement.priority}`}>
                  {selectedRequirement.priority.toUpperCase()}
                </span>
              </div>

              <div className="detail-item">
                <label>Status:</label>
                <span className={`status-tag ${selectedRequirement.status}`}>
                  {selectedRequirement.status.charAt(0).toUpperCase() + selectedRequirement.status.slice(1)}
                </span>
              </div>

              <div className="detail-item">
                <label>Complexity:</label>
                <div className="complexity-meter">
                  <div 
                    className="complexity-fill"
                    style={{ width: `${selectedRequirement.complexity * 10}%` }}
                  ></div>
                  <span>{selectedRequirement.complexity}/10</span>
                </div>
              </div>

              <div className="detail-item">
                <label>Description:</label>
                <p>{selectedRequirement.description}</p>
              </div>

              <div className="detail-item">
                <label>Stakeholders:</label>
                <div className="stakeholder-list">
                  {selectedRequirement.stakeholders.map(stakeholder => (
                    <span key={stakeholder} className="stakeholder-tag">
                      {stakeholder}
                    </span>
                  ))}
                </div>
              </div>

              {selectedRequirement.dependencies.length > 0 && (
                <div className="detail-item">
                  <label>Dependencies:</label>
                  <div className="dependency-list">
                    {selectedRequirement.dependencies.map(depId => {
                      const dep = requirements.find(r => r.id === depId);
                      return dep ? (
                        <span key={depId} className="dependency-tag">
                          {dep.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <p>Loading requirements visualization...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsVisual;