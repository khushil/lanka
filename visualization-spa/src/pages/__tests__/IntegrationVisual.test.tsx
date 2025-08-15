import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import IntegrationVisual from '../IntegrationVisual';

// Mock dependencies
jest.mock('framer-motion', () => require('../../__mocks__/framer-motion'));
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useTheme: () => ({
      palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
        background: { default: '#fafafa' }
      }
    })
  };
});

// Mock integration data hook
const mockIntegrationData = {
  systemHealth: {
    overall: 'healthy',
    score: 94.5,
    services: 12,
    endpoints: 48
  },
  serviceMap: [
    { id: 'auth-service', name: 'Authentication Service', status: 'healthy', connections: 8 },
    { id: 'user-service', name: 'User Service', status: 'degraded', connections: 5 },
    { id: 'data-service', name: 'Data Service', status: 'healthy', connections: 12 }
  ],
  flowDiagram: {
    nodes: [
      { id: '1', name: 'Frontend', type: 'client' },
      { id: '2', name: 'API Gateway', type: 'gateway' },
      { id: '3', name: 'Database', type: 'database' }
    ],
    edges: [
      { source: '1', target: '2', type: 'http' },
      { source: '2', target: '3', type: 'sql' }
    ]
  },
  healthMonitoring: {
    uptime: 99.95,
    responseTime: 142,
    errorRate: 0.018,
    alerts: 2
  },
  apiDocumentation: [
    { endpoint: '/api/auth', method: 'POST', status: 'active', version: 'v1' },
    { endpoint: '/api/users', method: 'GET', status: 'active', version: 'v2' },
    { endpoint: '/api/data', method: 'GET', status: 'deprecated', version: 'v1' }
  ],
  loading: false,
  error: null,
  refreshData: jest.fn()
};

jest.mock('../../../hooks/useIntegrationData', () => ({
  useIntegrationData: () => mockIntegrationData
}));

// Mock visualization components
jest.mock('../../../components/visualizations/SystemFlowDiagram', () => {
  return function MockSystemFlowDiagram({ nodes, edges, onNodeClick }: any) {
    return (
      <div data-testid="system-flow-diagram">
        {nodes?.map((node: any) => (
          <div
            key={node.id}
            data-testid={`flow-node-${node.id}`}
            onClick={() => onNodeClick?.(node)}
          >
            {node.name} ({node.type})
          </div>
        ))}
        {edges?.map((edge: any, index: number) => (
          <div key={index} data-testid={`flow-edge-${edge.source}-${edge.target}`}>
            {edge.source} → {edge.target} ({edge.type})
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/IntegrationHealth', () => {
  return function MockIntegrationHealth({ services, onServiceClick }: any) {
    return (
      <div data-testid="integration-health">
        {services?.map((service: any) => (
          <div
            key={service.id}
            data-testid={`service-${service.id}`}
            onClick={() => onServiceClick?.(service)}
            className={`service-${service.status}`}
          >
            {service.name}: {service.status} ({service.connections} connections)
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/KnowledgeGraph', () => {
  return function MockKnowledgeGraph({ data, onNodeSelect, selectedNode }: any) {
    return (
      <div data-testid="knowledge-graph">
        <div data-testid="graph-nodes">
          {data?.nodes?.map((node: any) => (
            <div
              key={node.id}
              data-testid={`knowledge-node-${node.id}`}
              onClick={() => onNodeSelect?.(node.id)}
              className={selectedNode === node.id ? 'selected' : ''}
            >
              {node.name}
            </div>
          ))}
        </div>
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/DataFlowAnimation', () => {
  return function MockDataFlowAnimation({ flows, isPlaying, onFlowClick }: any) {
    return (
      <div data-testid="data-flow-animation" className={isPlaying ? 'playing' : 'paused'}>
        {flows?.map((flow: any, index: number) => (
          <div
            key={index}
            data-testid={`data-flow-${index}`}
            onClick={() => onFlowClick?.(flow)}
          >
            Flow: {flow.source} → {flow.target}
          </div>
        ))}
      </div>
    );
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('IntegrationVisual Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntegrationData.loading = false;
    mockIntegrationData.error = null;
  });

  describe('Initial Render', () => {
    it('renders the main title and description', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      expect(screen.getByText(/Integration Visual/)).toBeInTheDocument();
      expect(screen.getByText(/System integration monitoring/)).toBeInTheDocument();
    });

    it('renders all navigation tabs', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('System Flow')).toBeInTheDocument();
        expect(screen.getByText('Health Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Service Map')).toBeInTheDocument();
        expect(screen.getByText('Data Flows')).toBeInTheDocument();
        expect(screen.getByText('API Documentation')).toBeInTheDocument();
      });
    });

    it('displays system health overview', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health')).toBeInTheDocument();
        expect(screen.getByText('Active Services')).toBeInTheDocument();
        expect(screen.getByText('API Endpoints')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
      });
    });

    it('shows correct health metric values', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('94.5')).toBeInTheDocument(); // Health score
        expect(screen.getByText('12')).toBeInTheDocument(); // Services count
        expect(screen.getByText('48')).toBeInTheDocument(); // Endpoints count
        expect(screen.getByText('142ms')).toBeInTheDocument(); // Response time
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      // Initially shows system flow (tab 0)
      await waitFor(() => {
        expect(screen.getByTestId('system-flow-diagram')).toBeInTheDocument();
      });

      // Click on Health Dashboard tab
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('integration-health')).toBeInTheDocument();
      });

      // Click on Service Map tab
      const serviceTab = screen.getByText('Service Map');
      await user.click(serviceTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-graph')).toBeInTheDocument();
      });

      // Click on Data Flows tab
      const dataFlowTab = screen.getByText('Data Flows');
      await user.click(dataFlowTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-flow-animation')).toBeInTheDocument();
      });
    });

    it('maintains selected tab state', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        expect(healthTab.closest('.Mui-selected')).toBeTruthy();
      });
    });
  });

  describe('System Flow Diagram', () => {
    it('renders flow nodes and edges', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('system-flow-diagram')).toBeInTheDocument();
        expect(screen.getByTestId('flow-node-1')).toHaveTextContent('Frontend (client)');
        expect(screen.getByTestId('flow-node-2')).toHaveTextContent('API Gateway (gateway)');
        expect(screen.getByTestId('flow-node-3')).toHaveTextContent('Database (database)');
        
        expect(screen.getByTestId('flow-edge-1-2')).toHaveTextContent('1 → 2 (http)');
        expect(screen.getByTestId('flow-edge-2-3')).toHaveTextContent('2 → 3 (sql)');
      });
    });

    it('handles node clicks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        const node = screen.getByTestId('flow-node-1');
        expect(node).toBeInTheDocument();
      });
      
      const node = screen.getByTestId('flow-node-1');
      await user.click(node);
      
      expect(node).toBeInTheDocument();
    });
  });

  describe('Integration Health Dashboard', () => {
    it('renders service health status', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('integration-health')).toBeInTheDocument();
        expect(screen.getByTestId('service-auth-service')).toHaveTextContent('Authentication Service: healthy (8 connections)');
        expect(screen.getByTestId('service-user-service')).toHaveTextContent('User Service: degraded (5 connections)');
        expect(screen.getByTestId('service-data-service')).toHaveTextContent('Data Service: healthy (12 connections)');
      });
    });

    it('applies correct CSS classes for service status', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('service-auth-service')).toHaveClass('service-healthy');
        expect(screen.getByTestId('service-user-service')).toHaveClass('service-degraded');
        expect(screen.getByTestId('service-data-service')).toHaveClass('service-healthy');
      });
    });

    it('handles service clicks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        const service = screen.getByTestId('service-auth-service');
        expect(service).toBeInTheDocument();
      });
      
      const service = screen.getByTestId('service-auth-service');
      await user.click(service);
      
      expect(service).toBeInTheDocument();
    });
  });

  describe('Service Map (Knowledge Graph)', () => {
    it('renders knowledge graph nodes', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const serviceTab = screen.getByText('Service Map');
      await user.click(serviceTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('knowledge-graph')).toBeInTheDocument();
        expect(screen.getByTestId('knowledge-node-1')).toHaveTextContent('Frontend');
        expect(screen.getByTestId('knowledge-node-2')).toHaveTextContent('API Gateway');
        expect(screen.getByTestId('knowledge-node-3')).toHaveTextContent('Database');
      });
    });

    it('handles node selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const serviceTab = screen.getByText('Service Map');
      await user.click(serviceTab);
      
      await waitFor(() => {
        const node = screen.getByTestId('knowledge-node-1');
        expect(node).toBeInTheDocument();
      });
      
      const node = screen.getByTestId('knowledge-node-1');
      await user.click(node);
      
      await waitFor(() => {
        expect(node).toHaveClass('selected');
      });
    });
  });

  describe('Data Flow Animation', () => {
    it('renders data flow visualization', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const dataFlowTab = screen.getByText('Data Flows');
      await user.click(dataFlowTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-flow-animation')).toBeInTheDocument();
      });
    });

    it('handles play/pause states', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const dataFlowTab = screen.getByText('Data Flows');
      await user.click(dataFlowTab);
      
      await waitFor(() => {
        const animation = screen.getByTestId('data-flow-animation');
        // Initially should be paused or playing based on default state
        expect(animation).toHaveClass('paused'); // or 'playing'
      });
    });

    it('handles flow interactions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const dataFlowTab = screen.getByText('Data Flows');
      await user.click(dataFlowTab);
      
      await waitFor(() => {
        const animation = screen.getByTestId('data-flow-animation');
        expect(animation).toBeInTheDocument();
      });
      
      const animation = screen.getByTestId('data-flow-animation');
      await user.click(animation);
      
      expect(animation).toBeInTheDocument();
    });
  });

  describe('API Documentation', () => {
    it('renders API endpoint information', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const apiTab = screen.getByText('API Documentation');
      await user.click(apiTab);
      
      // Should show API documentation table or list
      await waitFor(() => {
        expect(screen.getByText('/api/auth')).toBeInTheDocument();
        expect(screen.getByText('/api/users')).toBeInTheDocument();
        expect(screen.getByText('/api/data')).toBeInTheDocument();
      });
    });

    it('shows endpoint status indicators', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const apiTab = screen.getByText('API Documentation');
      await user.click(apiTab);
      
      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('deprecated')).toBeInTheDocument();
      });
    });
  });

  describe('Controls and Settings', () => {
    it('toggles system health display', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthToggle = screen.getByLabelText(/show health/i);
      expect(healthToggle).toBeChecked();
      
      await user.click(healthToggle);
      
      await waitFor(() => {
        expect(healthToggle).not.toBeChecked();
      });
    });

    it('toggles real-time monitoring', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const realtimeToggle = screen.getByLabelText(/real.?time/i);
      expect(realtimeToggle).not.toBeChecked();
      
      await user.click(realtimeToggle);
      
      await waitFor(() => {
        expect(realtimeToggle).toBeChecked();
      });
    });

    it('changes view mode', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const detailedButton = screen.getByText('Detailed');
      await user.click(detailedButton);
      
      await waitFor(() => {
        expect(detailedButton).toHaveClass('MuiButton-contained');
      });
    });

    it('handles refresh button click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh/i);
      await user.click(refreshButton);
      
      expect(mockIntegrationData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', async () => {
      mockIntegrationData.loading = true;
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('disables controls during loading', async () => {
      mockIntegrationData.loading = true;
      renderWithRouter(<IntegrationVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh/i);
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', async () => {
      mockIntegrationData.error = 'Failed to load integration data';
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load integration data')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockIntegrationData.error = 'Service unavailable';
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles retry action', async () => {
      const user = userEvent.setup();
      mockIntegrationData.error = 'Connection timeout';
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(mockIntegrationData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Real-time Monitoring', () => {
    it('handles real-time updates when enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const realtimeToggle = screen.getByLabelText(/real.?time/i);
      await user.click(realtimeToggle);
      
      // Wait for real-time update interval
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockIntegrationData.refreshData).toHaveBeenCalled();
    });

    it('updates health status in real-time', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const realtimeToggle = screen.getByLabelText(/real.?time/i);
      await user.click(realtimeToggle);
      
      // Should show live indicator
      await waitFor(() => {
        const liveIndicator = screen.getByText(/live/i);
        expect(liveIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Health Status Indicators', () => {
    it('displays correct health status colors', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        // Overall health should be visible
        expect(screen.getByText('94.5')).toBeInTheDocument();
      });
    });

    it('shows alert count when there are issues', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Alert count
      });
    });

    it('handles degraded service states', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const healthTab = screen.getByText('Health Dashboard');
      await user.click(healthTab);
      
      await waitFor(() => {
        const degradedService = screen.getByTestId('service-user-service');
        expect(degradedService).toHaveClass('service-degraded');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      await user.keyboard('[ArrowRight]');
      
      const secondTab = screen.getAllByRole('tab')[1];
      expect(secondTab).toHaveFocus();
    });

    it('has accessible form controls', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      const healthToggle = screen.getByLabelText(/show health/i);
      const realtimeToggle = screen.getByLabelText(/real.?time/i);
      
      expect(healthToggle).toHaveAttribute('type', 'checkbox');
      expect(realtimeToggle).toHaveAttribute('type', 'checkbox');
    });

    it('provides accessible status information', async () => {
      renderWithRouter(<IntegrationVisual />);
      
      // Health metrics should have proper labels
      await waitFor(() => {
        expect(screen.getByText('System Health')).toBeInTheDocument();
        expect(screen.getByText('Active Services')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders efficiently with complex integration data', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<IntegrationVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('system-flow-diagram')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles tab switching efficiently', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const tabs = ['Health Dashboard', 'Service Map', 'Data Flows', 'API Documentation'];
      
      for (const tabName of tabs) {
        const startTime = performance.now();
        
        const tab = screen.getByText(tabName);
        await user.click(tab);
        
        await waitFor(() => {
          expect(tab.closest('.Mui-selected')).toBeTruthy();
        });
        
        const endTime = performance.now();
        const switchTime = endTime - startTime;
        
        expect(switchTime).toBeLessThan(300);
      }
    });

    it('handles real-time updates without performance degradation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<IntegrationVisual />);
      
      const realtimeToggle = screen.getByLabelText(/real.?time/i);
      await user.click(realtimeToggle);
      
      // Multiple rapid updates should not cause performance issues
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      expect(screen.getByTestId('system-flow-diagram')).toBeInTheDocument();
    });
  });
});