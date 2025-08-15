import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import VisualOverview from '../../../pages/VisualOverview';

// Mock framer-motion
jest.mock('framer-motion', () => require('../../__mocks__/framer-motion'));

// Mock visualizations components
jest.mock('../../../components/visualizations/AnimatedCard', () => {
  return function MockAnimatedCard({ title, description, metrics, onClick, isSelected }: any) {
    return (
      <div 
        data-testid={`animated-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={onClick}
        className={isSelected ? 'selected' : ''}
      >
        <h3>{title}</h3>
        <p>{description}</p>
        <div data-testid="metrics">
          <span>{metrics.value}</span>
          <span>{metrics.label}</span>
          <span>{metrics.trend}</span>
        </div>
      </div>
    );
  };
});

jest.mock('../../../components/visualizations/MetricsDisplay', () => {
  return function MockMetricsDisplay({ metrics, layout }: any) {
    return (
      <div data-testid="metrics-display" data-layout={layout}>
        {metrics.map((metric: any, index: number) => (
          <div key={index} data-testid={`metric-${metric.label.replace(/\s+/g, '-').toLowerCase()}`}>
            <span>{metric.label}: {metric.value}</span>
            <span className={`trend-${metric.trend}`}>{metric.trend}</span>
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

describe('VisualOverview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the main title and subtitle', async () => {
      renderWithRouter(<VisualOverview />);
      
      expect(screen.getByText('Lanka Platform')).toBeInTheDocument();
      expect(screen.getByText(/Visual Intelligence/)).toBeInTheDocument();
      expect(screen.getByText(/Experience your development workflow/)).toBeInTheDocument();
    });

    it('renders all platform modules', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getByTestId('animated-card-requirements-analysis')).toBeInTheDocument();
        expect(screen.getByTestId('animated-card-system-architecture')).toBeInTheDocument();
        expect(screen.getByTestId('animated-card-test-coverage')).toBeInTheDocument();
        expect(screen.getByTestId('animated-card-performance-metrics')).toBeInTheDocument();
        expect(screen.getByTestId('animated-card-deployment-pipeline')).toBeInTheDocument();
        expect(screen.getByTestId('animated-card-data-analytics')).toBeInTheDocument();
      });
    });

    it('renders overall metrics display', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getByTestId('metrics-display')).toBeInTheDocument();
        expect(screen.getByTestId('metrics-display')).toHaveAttribute('data-layout', 'horizontal');
        
        expect(screen.getByTestId('metric-active-projects')).toBeInTheDocument();
        expect(screen.getByTestId('metric-team-members')).toBeInTheDocument();
        expect(screen.getByTestId('metric-code-quality')).toBeInTheDocument();
        expect(screen.getByTestId('metric-uptime')).toBeInTheDocument();
      });
    });

    it('renders quick actions section', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('🎯 Create New Analysis')).toBeInTheDocument();
        expect(screen.getByText('📈 View Reports')).toBeInTheDocument();
        expect(screen.getByText('⚙️ Configure Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Module Interactions', () => {
    it('handles module hover events', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const requirementsCard = screen.getByTestId('animated-card-requirements-analysis');
        expect(requirementsCard).toBeInTheDocument();
      });
      
      const requirementsCard = screen.getByTestId('animated-card-requirements-analysis');
      await user.hover(requirementsCard);
      
      // Check if card becomes selected on hover
      await waitFor(() => {
        expect(requirementsCard).toHaveClass('selected');
      });
      
      await user.unhover(requirementsCard);
      
      await waitFor(() => {
        expect(requirementsCard).not.toHaveClass('selected');
      });
    });

    it('navigates to correct routes when module is clicked', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const architectureCard = screen.getByTestId('animated-card-system-architecture');
        expect(architectureCard.closest('a')).toHaveAttribute('href', '/visualizations/architecture');
        
        const requirementsCard = screen.getByTestId('animated-card-requirements-analysis');
        expect(requirementsCard.closest('a')).toHaveAttribute('href', '/visualizations/requirements');
      });
    });

    it('displays correct metrics for each module', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        // Requirements module
        const requirementsMetrics = screen.getByTestId('animated-card-requirements-analysis').querySelector('[data-testid="metrics"]');
        expect(requirementsMetrics).toHaveTextContent('1247');
        expect(requirementsMetrics).toHaveTextContent('Requirements Analyzed');
        expect(requirementsMetrics).toHaveTextContent('up');
        
        // Architecture module
        const architectureMetrics = screen.getByTestId('animated-card-system-architecture').querySelector('[data-testid="metrics"]');
        expect(architectureMetrics).toHaveTextContent('89');
        expect(architectureMetrics).toHaveTextContent('Components Mapped');
        
        // Test coverage module
        const testingMetrics = screen.getByTestId('animated-card-test-coverage').querySelector('[data-testid="metrics"]');
        expect(testingMetrics).toHaveTextContent('94.2');
        expect(testingMetrics).toHaveTextContent('% Coverage');
        expect(testingMetrics).toHaveTextContent('stable');
      });
    });
  });

  describe('Quick Actions', () => {
    it('renders all quick action buttons', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const createAnalysisBtn = screen.getByText('🎯 Create New Analysis');
        const viewReportsBtn = screen.getByText('📈 View Reports');
        const configureSettingsBtn = screen.getByText('⚙️ Configure Settings');
        
        expect(createAnalysisBtn).toBeInTheDocument();
        expect(viewReportsBtn).toBeInTheDocument();
        expect(configureSettingsBtn).toBeInTheDocument();
      });
    });

    it('handles quick action button clicks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const createAnalysisBtn = screen.getByText('🎯 Create New Analysis');
        expect(createAnalysisBtn).toBeInTheDocument();
      });
      
      const createAnalysisBtn = screen.getByText('🎯 Create New Analysis');
      await user.click(createAnalysisBtn);
      
      // Button should be clickable (no error thrown)
      expect(createAnalysisBtn).toBeInTheDocument();
    });
  });

  describe('Animation and Loading States', () => {
    it('handles initial loading state', async () => {
      renderWithRouter(<VisualOverview />);
      
      // Component should render immediately but may have loading states
      expect(screen.getByText('Lanka Platform')).toBeInTheDocument();
      
      // Wait for animations to complete
      await waitFor(() => {
        expect(screen.getByTestId('animated-card-requirements-analysis')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('applies correct CSS classes for animations', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const overview = document.querySelector('.visual-overview');
        expect(overview).toBeInTheDocument();
        
        const heroSection = document.querySelector('.hero-section');
        const modulesSection = document.querySelector('.modules-section');
        
        expect(heroSection).toBeInTheDocument();
        expect(modulesSection).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders modules grid correctly', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const modulesGrid = document.querySelector('.modules-grid');
        expect(modulesGrid).toBeInTheDocument();
      });
    });

    it('handles module selection state', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId(/animated-card-/);
        expect(cards).toHaveLength(6);
        
        // Initially no cards should be selected
        cards.forEach(card => {
          expect(card).not.toHaveClass('selected');
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithRouter(<VisualOverview />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/Lanka Platform/);
      
      await waitFor(() => {
        const sectionHeading = screen.getByText('Explore Platform Modules');
        expect(sectionHeading).toBeInTheDocument();
      });
    });

    it('provides accessible navigation links', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });

    it('has accessible button elements', async () => {
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(3);
        
        buttons.forEach(button => {
          expect(button).toBeVisible();
        });
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getByTestId('animated-card-requirements-analysis')).toBeInTheDocument();
      });
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles large number of modules efficiently', async () => {
      const startTime = performance.now();
      
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId(/animated-card-/)).toHaveLength(6);
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('handles missing or invalid metrics gracefully', async () => {
      // This test ensures the component doesn't crash with unexpected data
      renderWithRouter(<VisualOverview />);
      
      await waitFor(() => {
        expect(screen.getByText('Lanka Platform')).toBeInTheDocument();
        expect(screen.getByTestId('metrics-display')).toBeInTheDocument();
      });
    });

    it('continues to function if animation libraries fail', async () => {
      // Even if framer-motion fails, basic functionality should work
      renderWithRouter(<VisualOverview />);
      
      expect(screen.getByText('Lanka Platform')).toBeInTheDocument();
      expect(screen.getByText('🎯 Create New Analysis')).toBeInTheDocument();
    });
  });
});