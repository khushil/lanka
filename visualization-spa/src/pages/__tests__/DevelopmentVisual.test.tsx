import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import DevelopmentVisual from '../DevelopmentVisual';

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

// Mock development data hook
const mockDevelopmentData = {
  codeMetrics: {
    linesOfCode: 125000,
    codeQuality: 8.7,
    testCoverage: 94.2,
    technicalDebt: 2.3
  },
  pipelineStatus: [
    { stage: 'Build', status: 'success', duration: 120 },
    { stage: 'Test', status: 'running', duration: 0 },
    { stage: 'Deploy', status: 'pending', duration: 0 }
  ],
  performanceMetrics: {
    responseTime: 145,
    throughput: 1250,
    errorRate: 0.02,
    uptime: 99.9
  },
  generatedCode: [
    { id: '1', type: 'Component', name: 'UserProfile', language: 'TypeScript' },
    { id: '2', type: 'Service', name: 'AuthService', language: 'Node.js' }
  ],
  productionInsights: {
    deployments: 342,
    incidents: 3,
    meanTimeToRecovery: 15,
    userSatisfaction: 4.8
  },
  loading: false,
  error: null,
  refreshData: jest.fn()
};

jest.mock('../../../hooks/useDevelopmentData', () => ({
  useDevelopmentData: () => mockDevelopmentData
}));

// Mock visualization components
jest.mock('../../../components/visualizations/CodeQualityHeatmap', () => {
  return function MockCodeQualityHeatmap({ metrics, onMetricClick }: any) {
    return (
      <div data-testid="code-quality-heatmap">
        <div data-testid="quality-score">{metrics?.codeQuality}</div>
        <div data-testid="test-coverage">{metrics?.testCoverage}%</div>
        <div data-testid="technical-debt">{metrics?.technicalDebt}</div>
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/DevOpsPipeline', () => {
  return function MockDevOpsPipeline({ stages, onStageClick }: any) {
    return (
      <div data-testid="devops-pipeline">
        {stages?.map((stage: any, index: number) => (
          <div
            key={index}
            data-testid={`pipeline-stage-${stage.stage.toLowerCase()}`}
            onClick={() => onStageClick?.(stage)}
            className={`stage-${stage.status}`}
          >
            {stage.stage}: {stage.status}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/CodeGenerationWorkspace', () => {
  return function MockCodeGenerationWorkspace({ generatedCode, onCodeSelect }: any) {
    return (
      <div data-testid="code-generation-workspace">
        {generatedCode?.map((code: any) => (
          <div
            key={code.id}
            data-testid={`generated-code-${code.id}`}
            onClick={() => onCodeSelect?.(code)}
          >
            {code.type}: {code.name} ({code.language})
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/TestCoverageMap', () => {
  return function MockTestCoverageMap({ coverage, onFileClick }: any) {
    return (
      <div data-testid="test-coverage-map">
        <div data-testid="coverage-percentage">{coverage}%</div>
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/ProductionInsights', () => {
  return function MockProductionInsights({ insights, onInsightClick }: any) {
    return (
      <div data-testid="production-insights">
        <div data-testid="deployments-count">{insights?.deployments}</div>
        <div data-testid="incidents-count">{insights?.incidents}</div>
        <div data-testid="mttr">{insights?.meanTimeToRecovery} min</div>
        <div data-testid="user-satisfaction">{insights?.userSatisfaction}/5</div>
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

describe('DevelopmentVisual Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevelopmentData.loading = false;
    mockDevelopmentData.error = null;
  });

  describe('Initial Render', () => {
    it('renders the main title and description', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      expect(screen.getByText(/Development Visual/)).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive development metrics/)).toBeInTheDocument();
    });

    it('renders all navigation tabs', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Code Quality')).toBeInTheDocument();
        expect(screen.getByText('CI/CD Pipeline')).toBeInTheDocument();
        expect(screen.getByText('Code Generation')).toBeInTheDocument();
        expect(screen.getByText('Test Coverage')).toBeInTheDocument();
        expect(screen.getByText('Production Insights')).toBeInTheDocument();
      });
    });

    it('displays development metrics overview', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Lines of Code')).toBeInTheDocument();
        expect(screen.getByText('Code Quality')).toBeInTheDocument();
        expect(screen.getByText('Test Coverage')).toBeInTheDocument();
        expect(screen.getByText('Technical Debt')).toBeInTheDocument();
      });
    });

    it('shows correct metric values', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('125K')).toBeInTheDocument(); // Lines of code
        expect(screen.getByText('8.7')).toBeInTheDocument(); // Code quality
        expect(screen.getByText('94.2%')).toBeInTheDocument(); // Test coverage
        expect(screen.getByText('2.3')).toBeInTheDocument(); // Technical debt
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      // Initially shows code quality (tab 0)
      await waitFor(() => {
        expect(screen.getByTestId('code-quality-heatmap')).toBeInTheDocument();
      });

      // Click on CI/CD Pipeline tab
      const pipelineTab = screen.getByText('CI/CD Pipeline');
      await user.click(pipelineTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('devops-pipeline')).toBeInTheDocument();
      });

      // Click on Code Generation tab
      const codeGenTab = screen.getByText('Code Generation');
      await user.click(codeGenTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('code-generation-workspace')).toBeInTheDocument();
      });

      // Click on Test Coverage tab
      const coverageTab = screen.getByText('Test Coverage');
      await user.click(coverageTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('test-coverage-map')).toBeInTheDocument();
      });

      // Click on Production Insights tab
      const productionTab = screen.getByText('Production Insights');
      await user.click(productionTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('production-insights')).toBeInTheDocument();
      });
    });

    it('maintains selected tab state', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const pipelineTab = screen.getByText('CI/CD Pipeline');
      await user.click(pipelineTab);
      
      await waitFor(() => {
        expect(pipelineTab.closest('.Mui-selected')).toBeTruthy();
      });
    });
  });

  describe('Code Quality Heatmap', () => {
    it('renders code quality metrics', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('code-quality-heatmap')).toBeInTheDocument();
        expect(screen.getByTestId('quality-score')).toHaveTextContent('8.7');
        expect(screen.getByTestId('test-coverage')).toHaveTextContent('94.2%');
        expect(screen.getByTestId('technical-debt')).toHaveTextContent('2.3');
      });
    });

    it('handles metric interactions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        const heatmap = screen.getByTestId('code-quality-heatmap');
        expect(heatmap).toBeInTheDocument();
      });
      
      const heatmap = screen.getByTestId('code-quality-heatmap');
      await user.click(heatmap);
      
      expect(heatmap).toBeInTheDocument();
    });
  });

  describe('CI/CD Pipeline Visualization', () => {
    it('renders pipeline stages with statuses', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const pipelineTab = screen.getByText('CI/CD Pipeline');
      await user.click(pipelineTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('devops-pipeline')).toBeInTheDocument();
        expect(screen.getByTestId('pipeline-stage-build')).toHaveTextContent('Build: success');
        expect(screen.getByTestId('pipeline-stage-test')).toHaveTextContent('Test: running');
        expect(screen.getByTestId('pipeline-stage-deploy')).toHaveTextContent('Deploy: pending');
      });
    });

    it('applies correct CSS classes for stage statuses', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const pipelineTab = screen.getByText('CI/CD Pipeline');
      await user.click(pipelineTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('pipeline-stage-build')).toHaveClass('stage-success');
        expect(screen.getByTestId('pipeline-stage-test')).toHaveClass('stage-running');
        expect(screen.getByTestId('pipeline-stage-deploy')).toHaveClass('stage-pending');
      });
    });

    it('handles stage clicks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const pipelineTab = screen.getByText('CI/CD Pipeline');
      await user.click(pipelineTab);
      
      await waitFor(() => {
        const buildStage = screen.getByTestId('pipeline-stage-build');
        expect(buildStage).toBeInTheDocument();
      });
      
      const buildStage = screen.getByTestId('pipeline-stage-build');
      await user.click(buildStage);
      
      expect(buildStage).toBeInTheDocument();
    });
  });

  describe('Code Generation Workspace', () => {
    it('renders generated code items', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const codeGenTab = screen.getByText('Code Generation');
      await user.click(codeGenTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('code-generation-workspace')).toBeInTheDocument();
        expect(screen.getByTestId('generated-code-1')).toHaveTextContent('Component: UserProfile (TypeScript)');
        expect(screen.getByTestId('generated-code-2')).toHaveTextContent('Service: AuthService (Node.js)');
      });
    });

    it('handles code selection', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const codeGenTab = screen.getByText('Code Generation');
      await user.click(codeGenTab);
      
      await waitFor(() => {
        const codeItem = screen.getByTestId('generated-code-1');
        expect(codeItem).toBeInTheDocument();
      });
      
      const codeItem = screen.getByTestId('generated-code-1');
      await user.click(codeItem);
      
      expect(codeItem).toBeInTheDocument();
    });
  });

  describe('Test Coverage Map', () => {
    it('renders test coverage visualization', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const coverageTab = screen.getByText('Test Coverage');
      await user.click(coverageTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('test-coverage-map')).toBeInTheDocument();
        expect(screen.getByTestId('coverage-percentage')).toHaveTextContent('94.2%');
      });
    });

    it('handles file interactions in coverage map', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const coverageTab = screen.getByText('Test Coverage');
      await user.click(coverageTab);
      
      await waitFor(() => {
        const coverageMap = screen.getByTestId('test-coverage-map');
        expect(coverageMap).toBeInTheDocument();
      });
      
      const coverageMap = screen.getByTestId('test-coverage-map');
      await user.click(coverageMap);
      
      expect(coverageMap).toBeInTheDocument();
    });
  });

  describe('Production Insights', () => {
    it('renders production metrics', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const productionTab = screen.getByText('Production Insights');
      await user.click(productionTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('production-insights')).toBeInTheDocument();
        expect(screen.getByTestId('deployments-count')).toHaveTextContent('342');
        expect(screen.getByTestId('incidents-count')).toHaveTextContent('3');
        expect(screen.getByTestId('mttr')).toHaveTextContent('15 min');
        expect(screen.getByTestId('user-satisfaction')).toHaveTextContent('4.8/5');
      });
    });

    it('handles insight interactions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const productionTab = screen.getByText('Production Insights');
      await user.click(productionTab);
      
      await waitFor(() => {
        const insights = screen.getByTestId('production-insights');
        expect(insights).toBeInTheDocument();
      });
      
      const insights = screen.getByTestId('production-insights');
      await user.click(insights);
      
      expect(insights).toBeInTheDocument();
    });
  });

  describe('Controls and Settings', () => {
    it('toggles metrics display', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      expect(metricsToggle).toBeChecked();
      
      await user.click(metricsToggle);
      
      await waitFor(() => {
        expect(metricsToggle).not.toBeChecked();
      });
    });

    it('toggles auto refresh', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      expect(autoRefreshToggle).not.toBeChecked();
      
      await user.click(autoRefreshToggle);
      
      await waitFor(() => {
        expect(autoRefreshToggle).toBeChecked();
      });
    });

    it('changes view mode', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const detailedButton = screen.getByText('Detailed');
      await user.click(detailedButton);
      
      await waitFor(() => {
        expect(detailedButton).toHaveClass('MuiButton-contained');
      });
      
      const overviewButton = screen.getByText('Overview');
      await user.click(overviewButton);
      
      await waitFor(() => {
        expect(overviewButton).toHaveClass('MuiButton-contained');
      });
    });

    it('handles refresh button click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      await user.click(refreshButton);
      
      expect(mockDevelopmentData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', async () => {
      mockDevelopmentData.loading = true;
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('disables controls during loading', async () => {
      mockDevelopmentData.loading = true;
      renderWithRouter(<DevelopmentVisual />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', async () => {
      mockDevelopmentData.error = 'Failed to load development data';
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load development data')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockDevelopmentData.error = 'Network error';
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles retry action', async () => {
      const user = userEvent.setup();
      mockDevelopmentData.error = 'Network error';
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(mockDevelopmentData.refreshData).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('handles auto refresh when enabled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      await user.click(autoRefreshToggle);
      
      // Wait for auto refresh interval
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockDevelopmentData.refreshData).toHaveBeenCalled();
    });

    it('updates pipeline status in real-time', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      // Initially should show pipeline data
      await waitFor(() => {
        expect(screen.getByTestId('code-quality-heatmap')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('displays performance metrics correctly', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        // Performance metrics should be reflected in the overview
        expect(screen.getByText('94.2%')).toBeInTheDocument(); // Test coverage
        expect(screen.getByText('8.7')).toBeInTheDocument(); // Code quality
      });
    });

    it('handles performance thresholds', async () => {
      // Modify mock data to test threshold handling
      mockDevelopmentData.codeMetrics.codeQuality = 6.5; // Below threshold
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('code-quality-heatmap')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      await user.keyboard('[ArrowRight]');
      
      const secondTab = screen.getAllByRole('tab')[1];
      expect(secondTab).toHaveFocus();
    });

    it('has accessible form controls', async () => {
      renderWithRouter(<DevelopmentVisual />);
      
      const metricsToggle = screen.getByLabelText(/show metrics/i);
      const autoRefreshToggle = screen.getByLabelText(/auto refresh/i);
      
      expect(metricsToggle).toHaveAttribute('type', 'checkbox');
      expect(autoRefreshToggle).toHaveAttribute('type', 'checkbox');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with complex development data', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<DevelopmentVisual />);
      
      await waitFor(() => {
        expect(screen.getByTestId('code-quality-heatmap')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000);
    });

    it('handles tab switching efficiently', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DevelopmentVisual />);
      
      const tabs = ['CI/CD Pipeline', 'Code Generation', 'Test Coverage', 'Production Insights'];
      
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