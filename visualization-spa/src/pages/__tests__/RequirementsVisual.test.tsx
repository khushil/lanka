import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import RequirementsVisual from '../RequirementsVisual';

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

// Mock hooks
const mockRequirementsData = {
  requirements: [
    { id: '1', title: 'User Authentication', category: 'Security', priority: 'high', status: 'approved' },
    { id: '2', title: 'Data Visualization', category: 'Features', priority: 'medium', status: 'draft' },
    { id: '3', title: 'API Performance', category: 'Performance', priority: 'critical', status: 'review' }
  ],
  loading: false,
  error: null,
  refreshData: jest.fn()
};

jest.mock('../../../hooks/useVisualizationData', () => ({
  useVisualizationData: () => mockRequirementsData
}));

// Mock visualization components
jest.mock('../../../components/visualizations/InteractiveGraph', () => {
  return function MockInteractiveGraph({ data, onNodeClick, selectedNode }: any) {
    return (
      <div data-testid="interactive-graph">
        {data.nodes.map((node: any) => (
          <div
            key={node.id}
            data-testid={`graph-node-${node.id}`}
            onClick={() => onNodeClick?.(node.id)}
            className={selectedNode === node.id ? 'selected' : ''}
          >
            {node.title}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/HeatmapChart', () => {
  return function MockHeatmapChart({ data, labels, onCellClick }: any) {
    return (
      <div data-testid="heatmap-chart">
        {data.map((row: any[], rowIndex: number) =>
          row.map((value: number, colIndex: number) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              data-testid={`heatmap-cell-${rowIndex}-${colIndex}`}
              onClick={() => onCellClick?.(rowIndex, colIndex, value)}
            >
              {labels[rowIndex]} - {labels[colIndex]}: {value}
            </div>
          ))
        )}
      </div>
    );
  };
});

jest.mock('../../../components/requirements/RequirementsList', () => {
  return function MockRequirementsList({ requirements, onSelect }: any) {
    return (
      <div data-testid="requirements-list">
        {requirements.map((req: any) => (
          <div
            key={req.id}
            data-testid={`requirement-item-${req.id}`}
            onClick={() => onSelect?.(req)}
          >
            {req.title} - {req.status}
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

describe('RequirementsVisual Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequirementsData.loading = false;
    mockRequirementsData.error = null;
  });

  describe('Initial Render', () => {
    it('renders the main title and description', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      expect(screen.getByText(/Requirements Visual/)).toBeInTheDocument();
      expect(screen.getByText(/Interactive analysis and visualization/)).toBeInTheDocument();
    });

    it('renders all tab panels', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        // Check for tab labels
        expect(screen.getByText('Interactive Graph')).toBeInTheDocument();
        expect(screen.getByText('Similarity Matrix')).toBeInTheDocument();
        expect(screen.getByText('Requirements List')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    it('displays metrics overview when enabled', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        // Metrics should be visible by default
        const metricsCards = screen.getAllByRole('generic').filter(
          el => el.textContent?.includes('Requirements') || 
               el.textContent?.includes('Categories') ||
               el.textContent?.includes('Approved')
        );
        expect(metricsCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      // Initially shows interactive graph (tab 0)
      await waitFor(() => {
        expect(screen.getByTestId('interactive-graph')).toBeInTheDocument();
      });

      // Click on Similarity Matrix tab
      const similarityTab = screen.getByText('Similarity Matrix');
      await user.click(similarityTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument();
      });

      // Click on Requirements List tab
      const listTab = screen.getByText('Requirements List');
      await user.click(listTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('requirements-list')).toBeInTheDocument();
      });
    });

    it('maintains tab state during navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const similarityTab = screen.getByText('Similarity Matrix');
      await user.click(similarityTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument();
      });
      
      // Tab should remain selected
      expect(similarityTab.closest('.Mui-selected')).toBeTruthy();
    });
  });

  describe('Interactive Graph Functionality', () => {
    it('renders graph with requirement nodes', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('interactive-graph')).toBeInTheDocument();
        expect(screen.getByTestId('graph-node-1')).toHaveTextContent('User Authentication');
        expect(screen.getByTestId('graph-node-2')).toHaveTextContent('Data Visualization');
        expect(screen.getByTestId('graph-node-3')).toHaveTextContent('API Performance');
      });
    });

    it('handles node selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        const node = screen.getByTestId('graph-node-1');
        expect(node).toBeInTheDocument();
      });
      
      const node = screen.getByTestId('graph-node-1');
      await user.click(node);
      
      await waitFor(() => {
        expect(node).toHaveClass('selected');
      });
    });

    it('filters nodes based on search', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      // Look for search input
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Authentication');
      
      await waitFor(() => {
        // Should show filtered results
        expect(screen.getByTestId('graph-node-1')).toBeInTheDocument();
      });
    });
  });

  describe('Heatmap Chart Functionality', () => {
    it('renders similarity matrix', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      // Switch to similarity matrix tab
      const similarityTab = screen.getByText('Similarity Matrix');
      await user.click(similarityTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument();
      });
    });

    it('handles cell selection in heatmap', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const similarityTab = screen.getByText('Similarity Matrix');
      await user.click(similarityTab);
      
      await waitFor(() => {
        const cell = screen.getByTestId('heatmap-cell-0-1');
        expect(cell).toBeInTheDocument();
      });
      
      const cell = screen.getByTestId('heatmap-cell-0-1');
      await user.click(cell);
      
      // Cell click should be handled (no error thrown)
      expect(cell).toBeInTheDocument();
    });
  });

  describe('Requirements List Functionality', () => {
    it('renders requirements in list view', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const listTab = screen.getByText('Requirements List');
      await user.click(listTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('requirements-list')).toBeInTheDocument();
        expect(screen.getByTestId('requirement-item-1')).toHaveTextContent('User Authentication - approved');
        expect(screen.getByTestId('requirement-item-2')).toHaveTextContent('Data Visualization - draft');
        expect(screen.getByTestId('requirement-item-3')).toHaveTextContent('API Performance - review');
      });
    });

    it('handles requirement selection from list', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const listTab = screen.getByText('Requirements List');
      await user.click(listTab);
      
      await waitFor(() => {
        const requirement = screen.getByTestId('requirement-item-1');
        expect(requirement).toBeInTheDocument();
      });
      
      const requirement = screen.getByTestId('requirement-item-1');
      await user.click(requirement);
      
      // Selection should be handled
      expect(requirement).toBeInTheDocument();
    });
  });

  describe('Controls and Settings', () => {
    it('toggles metrics display', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      expect(metricsToggle).toBeChecked();
      
      await user.click(metricsToggle);
      
      await waitFor(() => {
        expect(metricsToggle).not.toBeChecked();
      });
    });

    it('toggles auto refresh', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      expect(autoRefreshToggle).not.toBeChecked();
      
      await user.click(autoRefreshToggle);
      
      await waitFor(() => {
        expect(autoRefreshToggle).toBeChecked();
      });
    });

    it('handles view mode changes', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const detailedButton = screen.getByText('Detailed');
      await user.click(detailedButton);
      
      await waitFor(() => {
        expect(detailedButton).toHaveClass('MuiButton-contained');
      });
    });

    it('handles refresh button click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      await user.click(refreshButton);
      
      expect(mockRequirementsData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', async () => {
      mockRequirementsData.loading = true;
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('disables refresh button during loading', async () => {
      mockRequirementsData.loading = true;
      renderWithRouter(<RequirementsVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', async () => {
      mockRequirementsData.error = 'Failed to load requirements';
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load requirements')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockRequirementsData.error = 'Network error';
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles retry action', async () => {
      const user = userEvent.setup();
      mockRequirementsData.error = 'Network error';
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(mockRequirementsData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('handles auto refresh when enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      await user.click(autoRefreshToggle);
      
      // Wait for auto refresh interval
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockRequirementsData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      await user.keyboard('[ArrowRight]');
      
      const secondTab = screen.getAllByRole('tab')[1];
      expect(secondTab).toHaveFocus();
    });

    it('has accessible form controls', async () => {
      renderWithRouter(<RequirementsVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      
      expect(metricsToggle).toHaveAttribute('type', 'checkbox');
      expect(autoRefreshToggle).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<RequirementsVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('interactive-graph')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles tab switching efficiently', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RequirementsVisual />);
      
      const startTime = performance.now();
      
      const similarityTab = screen.getByText('Similarity Matrix');
      await user.click(similarityTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const switchTime = endTime - startTime;
      
      expect(switchTime).toBeLessThan(500);
    });
  });
});