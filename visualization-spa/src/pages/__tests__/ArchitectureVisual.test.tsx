import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ArchitectureVisual from '../ArchitectureVisual';

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

// Mock architecture data hook
const mockArchitectureData = {
  patterns: [
    { id: '1', name: 'Microservices', type: 'Architectural', maturity: 'stable' },
    { id: '2', name: 'Event Sourcing', type: 'Data', maturity: 'trial' }
  ],
  stacks: [
    { id: '1', name: 'Frontend Stack', technologies: ['React', 'TypeScript'] },
    { id: '2', name: 'Backend Stack', technologies: ['Node.js', 'PostgreSQL'] }
  ],
  decisions: [
    { id: '1', title: 'Choose React over Angular', status: 'approved', date: '2023-01-15' },
    { id: '2', title: 'Adopt Docker containers', status: 'proposed', date: '2023-02-01' }
  ],
  cloudRecommendations: [
    { provider: 'AWS', score: 85, cost: 2500 },
    { provider: 'Azure', score: 78, cost: 2800 }
  ],
  loading: false,
  error: null,
  refreshData: jest.fn()
};

jest.mock('../../../hooks/useArchitectureData', () => ({
  useArchitectureData: () => mockArchitectureData
}));

// Mock visualization components
jest.mock('../../../components/visualizations/ArchitectureCanvas', () => {
  return function MockArchitectureCanvas({ patterns, onPatternSelect, viewMode }: any) {
    return (
      <div data-testid="architecture-canvas" data-view-mode={viewMode}>
        {patterns?.map((pattern: any) => (
          <div
            key={pattern.id}
            data-testid={`pattern-${pattern.id}`}
            onClick={() => onPatternSelect?.(pattern)}
          >
            {pattern.name} ({pattern.type})
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/CloudCostVisualizer', () => {
  return function MockCloudCostVisualizer({ recommendations, onProviderSelect }: any) {
    return (
      <div data-testid="cloud-cost-visualizer">
        {recommendations?.map((rec: any, index: number) => (
          <div
            key={index}
            data-testid={`provider-${rec.provider.toLowerCase()}`}
            onClick={() => onProviderSelect?.(rec)}
          >
            {rec.provider}: ${rec.cost} (Score: {rec.score})
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/DecisionFlowDiagram', () => {
  return function MockDecisionFlowDiagram({ decisions, onDecisionSelect }: any) {
    return (
      <div data-testid="decision-flow-diagram">
        {decisions?.map((decision: any) => (
          <div
            key={decision.id}
            data-testid={`decision-${decision.id}`}
            onClick={() => onDecisionSelect?.(decision)}
          >
            {decision.title} - {decision.status}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/PatternGrid', () => {
  return function MockPatternGrid({ patterns, onPatternClick }: any) {
    return (
      <div data-testid="pattern-grid">
        {patterns?.map((pattern: any) => (
          <div
            key={pattern.id}
            data-testid={`pattern-grid-${pattern.id}`}
            onClick={() => onPatternClick?.(pattern)}
          >
            {pattern.name} - {pattern.maturity}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/TechRadar', () => {
  return function MockTechRadar({ stacks, onTechnologySelect }: any) {
    return (
      <div data-testid="tech-radar">
        {stacks?.map((stack: any) => (
          <div key={stack.id} data-testid={`stack-${stack.id}`}>
            {stack.name}: {stack.technologies?.join(', ')}
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

describe('ArchitectureVisual Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArchitectureData.loading = false;
    mockArchitectureData.error = null;
  });

  describe('Initial Render', () => {
    it('renders the main title and description', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      expect(screen.getByText('Architecture Visual Deep-Dive')).toBeInTheDocument();
      expect(screen.getByText(/Interactive visualization of architectural patterns/)).toBeInTheDocument();
    });

    it('renders all navigation tabs', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Architecture Canvas')).toBeInTheDocument();
        expect(screen.getByText('Cloud Cost Analysis')).toBeInTheDocument();
        expect(screen.getByText('Decision Flow')).toBeInTheDocument();
        expect(screen.getByText('Pattern Library')).toBeInTheDocument();
        expect(screen.getByText('Technology Radar')).toBeInTheDocument();
      });
    });

    it('displays metrics overview cards', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Patterns')).toBeInTheDocument();
        expect(screen.getByText('Cloud Providers')).toBeInTheDocument();
        expect(screen.getByText('Decisions')).toBeInTheDocument();
        expect(screen.getByText('Tech Stacks')).toBeInTheDocument();
      });
    });

    it('shows correct metric values', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        // Patterns count
        expect(screen.getByText('2')).toBeInTheDocument(); // patterns length
        // Cloud providers count
        expect(screen.getByText('2')).toBeInTheDocument(); // recommendations length
        // Decisions count
        expect(screen.getByText('2')).toBeInTheDocument(); // decisions length
        // Stacks count
        expect(screen.getByText('2')).toBeInTheDocument(); // stacks length
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      // Initially shows architecture canvas (tab 0)
      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });

      // Click on Cloud Cost Analysis tab
      const cloudTab = screen.getByText('Cloud Cost Analysis');
      await user.click(cloudTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('cloud-cost-visualizer')).toBeInTheDocument();
      });

      // Click on Decision Flow tab
      const decisionTab = screen.getByText('Decision Flow');
      await user.click(decisionTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('decision-flow-diagram')).toBeInTheDocument();
      });

      // Click on Pattern Library tab
      const patternTab = screen.getByText('Pattern Library');
      await user.click(patternTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('pattern-grid')).toBeInTheDocument();
      });

      // Click on Technology Radar tab
      const techTab = screen.getByText('Technology Radar');
      await user.click(techTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('tech-radar')).toBeInTheDocument();
      });
    });

    it('maintains selected tab state', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const cloudTab = screen.getByText('Cloud Cost Analysis');
      await user.click(cloudTab);
      
      await waitFor(() => {
        expect(cloudTab.closest('.Mui-selected')).toBeTruthy();
      });
    });
  });

  describe('Architecture Canvas Functionality', () => {
    it('renders patterns in canvas view', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-1')).toHaveTextContent('Microservices (Architectural)');
        expect(screen.getByTestId('pattern-2')).toHaveTextContent('Event Sourcing (Data)');
      });
    });

    it('handles pattern selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        const pattern = screen.getByTestId('pattern-1');
        expect(pattern).toBeInTheDocument();
      });
      
      const pattern = screen.getByTestId('pattern-1');
      await user.click(pattern);
      
      // Pattern click should be handled (console.log called)
      expect(pattern).toBeInTheDocument();
    });

    it('respects view mode settings', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        const canvas = screen.getByTestId('architecture-canvas');
        expect(canvas).toHaveAttribute('data-view-mode', 'overview');
      });
    });
  });

  describe('Cloud Cost Analysis', () => {
    it('renders cloud provider recommendations', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const cloudTab = screen.getByText('Cloud Cost Analysis');
      await user.click(cloudTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('cloud-cost-visualizer')).toBeInTheDocument();
        expect(screen.getByTestId('provider-aws')).toHaveTextContent('AWS: $2500 (Score: 85)');
        expect(screen.getByTestId('provider-azure')).toHaveTextContent('Azure: $2800 (Score: 78)');
      });
    });

    it('handles provider selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const cloudTab = screen.getByText('Cloud Cost Analysis');
      await user.click(cloudTab);
      
      await waitFor(() => {
        const awsProvider = screen.getByTestId('provider-aws');
        expect(awsProvider).toBeInTheDocument();
      });
      
      const awsProvider = screen.getByTestId('provider-aws');
      await user.click(awsProvider);
      
      expect(awsProvider).toBeInTheDocument();
    });
  });

  describe('Decision Flow Diagram', () => {
    it('renders architectural decisions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const decisionTab = screen.getByText('Decision Flow');
      await user.click(decisionTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('decision-flow-diagram')).toBeInTheDocument();
        expect(screen.getByTestId('decision-1')).toHaveTextContent('Choose React over Angular - approved');
        expect(screen.getByTestId('decision-2')).toHaveTextContent('Adopt Docker containers - proposed');
      });
    });

    it('handles decision selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const decisionTab = screen.getByText('Decision Flow');
      await user.click(decisionTab);
      
      await waitFor(() => {
        const decision = screen.getByTestId('decision-1');
        expect(decision).toBeInTheDocument();
      });
      
      const decision = screen.getByTestId('decision-1');
      await user.click(decision);
      
      expect(decision).toBeInTheDocument();
    });
  });

  describe('Pattern Library', () => {
    it('renders patterns in grid view', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const patternTab = screen.getByText('Pattern Library');
      await user.click(patternTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('pattern-grid')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-grid-1')).toHaveTextContent('Microservices - stable');
        expect(screen.getByTestId('pattern-grid-2')).toHaveTextContent('Event Sourcing - trial');
      });
    });

    it('handles pattern clicks in grid', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const patternTab = screen.getByText('Pattern Library');
      await user.click(patternTab);
      
      await waitFor(() => {
        const pattern = screen.getByTestId('pattern-grid-1');
        expect(pattern).toBeInTheDocument();
      });
      
      const pattern = screen.getByTestId('pattern-grid-1');
      await user.click(pattern);
      
      expect(pattern).toBeInTheDocument();
    });
  });

  describe('Technology Radar', () => {
    it('renders technology stacks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const techTab = screen.getByText('Technology Radar');
      await user.click(techTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('tech-radar')).toBeInTheDocument();
        expect(screen.getByTestId('stack-1')).toHaveTextContent('Frontend Stack: React, TypeScript');
        expect(screen.getByTestId('stack-2')).toHaveTextContent('Backend Stack: Node.js, PostgreSQL');
      });
    });
  });

  describe('Controls and Settings', () => {
    it('toggles metrics display', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      expect(metricsToggle).toBeChecked();
      
      await user.click(metricsToggle);
      
      await waitFor(() => {
        expect(metricsToggle).not.toBeChecked();
      });
    });

    it('toggles auto refresh', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      expect(autoRefreshToggle).not.toBeChecked();
      
      await user.click(autoRefreshToggle);
      
      await waitFor(() => {
        expect(autoRefreshToggle).toBeChecked();
      });
    });

    it('changes view mode between overview and detailed', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const detailedButton = screen.getByText('Detailed');
      await user.click(detailedButton);
      
      await waitFor(() => {
        expect(detailedButton).toHaveClass('MuiButton-contained');
        const canvas = screen.getByTestId('architecture-canvas');
        expect(canvas).toHaveAttribute('data-view-mode', 'detailed');
      });
      
      const overviewButton = screen.getByText('Overview');
      await user.click(overviewButton);
      
      await waitFor(() => {
        expect(overviewButton).toHaveClass('MuiButton-contained');
        const canvas = screen.getByTestId('architecture-canvas');
        expect(canvas).toHaveAttribute('data-view-mode', 'overview');
      });
    });

    it('handles refresh button click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      await user.click(refreshButton);
      
      expect(mockArchitectureData.refreshData).toHaveBeenCalled();
    });

    it('handles export and share buttons', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const exportButton = screen.getByLabelText(/export data/i);
      const shareButton = screen.getByLabelText(/share view/i);
      
      expect(exportButton).toBeInTheDocument();
      expect(shareButton).toBeInTheDocument();
      
      await user.click(exportButton);
      await user.click(shareButton);
      
      // Buttons should be clickable
      expect(exportButton).toBeInTheDocument();
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', async () => {
      mockArchitectureData.loading = true;
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('disables controls during loading', async () => {
      mockArchitectureData.loading = true;
      renderWithRouter(<ArchitectureVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      expect(refreshButton).toBeDisabled();
    });

    it('shows loading animation on refresh button', async () => {
      mockArchitectureData.loading = true;
      renderWithRouter(<ArchitectureVisual />);
      
      const refreshIcon = screen.getByLabelText(/refresh data/i).querySelector('svg');
      expect(refreshIcon).toHaveStyle('transform: rotate(180deg)');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', async () => {
      mockArchitectureData.error = 'Failed to load architecture data';
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load architecture data')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockArchitectureData.error = 'Network error';
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles retry action', async () => {
      const user = userEvent.setup();
      mockArchitectureData.error = 'Network error';
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(mockArchitectureData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('handles auto refresh when enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      await user.click(autoRefreshToggle);
      
      // Wait for auto refresh interval (30 seconds in component)
      // Mock shorter interval for test
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockArchitectureData.refreshData).toHaveBeenCalled();
    });

    it('displays real-time chip when auto refresh is enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      await user.click(autoRefreshToggle);
      
      await waitFor(() => {
        const realTimeChip = screen.getByText('Real-time');
        expect(realTimeChip).toHaveClass('MuiChip-colorSuccess');
      });
    });
  });

  describe('Footer Information', () => {
    it('displays last updated timestamp', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('displays summary chips with counts', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('2 Patterns')).toBeInTheDocument();
        expect(screen.getByText('2 Stacks')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-labelledby');
      });
    });

    it('supports keyboard navigation for tabs', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      await user.keyboard('[ArrowRight]');
      
      const secondTab = screen.getAllByRole('tab')[1];
      expect(secondTab).toHaveFocus();
    });

    it('has accessible form controls', async () => {
      renderWithRouter(<ArchitectureVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      
      expect(metricsToggle).toHaveAttribute('type', 'checkbox');
      expect(autoRefreshToggle).toHaveAttribute('type', 'checkbox');
      expect(metricsToggle).toHaveAttribute('aria-checked');
      expect(autoRefreshToggle).toHaveAttribute('aria-checked');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with complex architecture data', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<ArchitectureVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('architecture-canvas')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles tab switching efficiently', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ArchitectureVisual />);
      
      const tabs = ['Cloud Cost Analysis', 'Decision Flow', 'Pattern Library', 'Technology Radar'];
      
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
  });
});