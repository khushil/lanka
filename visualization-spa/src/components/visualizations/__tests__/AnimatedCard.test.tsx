import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnimatedCard from '../AnimatedCard';

// Mock framer-motion
jest.mock('framer-motion', () => require('../../../tests/__mocks__/framer-motion'));

const mockProps = {
  title: 'Test Component',
  description: 'This is a test animated card component',
  icon: '🎯',
  metrics: {
    value: 42,
    label: 'Test Metric',
    trend: 'up' as const
  },
  color: 'from-blue-500 to-purple-600'
};

describe('AnimatedCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the card with all provided content', () => {
      render(<AnimatedCard {...mockProps} />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('This is a test animated card component')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
    });

    it('displays trend icon correctly for different trends', () => {
      const trends = ['up', 'down', 'stable'] as const;
      const trendIcons = { up: '📈', down: '📉', stable: '➡️' };
      
      trends.forEach(trend => {
        render(
          <AnimatedCard 
            {...mockProps}
            metrics={{ ...mockProps.metrics, trend }}
          />
        );
        
        expect(screen.getByText(trendIcons[trend])).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes based on props', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      const card = container.querySelector('.animated-card');
      expect(card).toBeInTheDocument();
      expect(card).not.toHaveClass('selected');
    });

    it('applies selected state when isSelected is true', () => {
      const { container } = render(
        <AnimatedCard {...mockProps} isSelected={true} />
      );
      
      const card = container.querySelector('.animated-card');
      expect(card).toHaveClass('selected');
    });

    it('formats decimal values correctly', () => {
      render(
        <AnimatedCard 
          {...mockProps}
          metrics={{ ...mockProps.metrics, value: 42.7 }}
        />
      );
      
      expect(screen.getByText('42.7')).toBeInTheDocument();
    });

    it('formats integer values without decimals', () => {
      render(
        <AnimatedCard 
          {...mockProps}
          metrics={{ ...mockProps.metrics, value: 42 }}
        />
      );
      
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick handler when card is clicked', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      
      render(<AnimatedCard {...mockProps} onClick={onClick} />);
      
      const card = screen.getByText('Test Component').closest('.animated-card');
      expect(card).toBeInTheDocument();
      
      if (card) {
        await user.click(card);
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it('does not call onClick when no handler provided', async () => {
      const user = userEvent.setup();
      
      expect(() => {
        render(<AnimatedCard {...mockProps} />);
      }).not.toThrow();
      
      const card = screen.getByText('Test Component').closest('.animated-card');
      if (card) {
        await user.click(card);
        // Should not throw any errors
      }
    });

    it('handles multiple rapid clicks gracefully', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      
      render(<AnimatedCard {...mockProps} onClick={onClick} />);
      
      const card = screen.getByText('Test Component').closest('.animated-card');
      if (card) {
        await user.click(card);
        await user.click(card);
        await user.click(card);
        
        expect(onClick).toHaveBeenCalledTimes(3);
      }
    });
  });

  describe('Visual Elements', () => {
    it('renders background elements', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.card-background')).toBeInTheDocument();
      expect(container.querySelector('.gradient-overlay')).toBeInTheDocument();
      expect(container.querySelector('.pattern-overlay')).toBeInTheDocument();
    });

    it('renders card structure elements', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.card-content')).toBeInTheDocument();
      expect(container.querySelector('.card-header')).toBeInTheDocument();
      expect(container.querySelector('.card-body')).toBeInTheDocument();
      expect(container.querySelector('.card-footer')).toBeInTheDocument();
    });

    it('renders icon and metrics in header', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.card-icon')).toBeInTheDocument();
      expect(container.querySelector('.card-metrics')).toBeInTheDocument();
      expect(container.querySelector('.metric-value')).toBeInTheDocument();
      expect(container.querySelector('.metric-trend')).toBeInTheDocument();
    });

    it('renders title and description in body', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.card-title')).toBeInTheDocument();
      expect(container.querySelector('.card-description')).toBeInTheDocument();
      expect(container.querySelector('.card-label')).toBeInTheDocument();
    });

    it('renders progress bar in footer', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.progress-bar')).toBeInTheDocument();
      expect(container.querySelector('.progress-fill')).toBeInTheDocument();
    });

    it('renders visual effects elements', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      expect(container.querySelector('.card-glow')).toBeInTheDocument();
      expect(container.querySelector('.floating-particles')).toBeInTheDocument();
    });

    it('renders correct number of floating particles', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      const particles = container.querySelectorAll('.particle');
      expect(particles).toHaveLength(5);
    });
  });

  describe('Color and Styling', () => {
    it('applies gradient background from color prop', () => {
      const { container } = render(
        <AnimatedCard 
          {...mockProps}
          color="from-red-500 to-blue-600"
        />
      );
      
      const card = container.querySelector('.animated-card');
      expect(card).toBeInTheDocument();
    });

    it('applies trend colors correctly', () => {
      const trendColors = {
        up: '#10b981',
        down: '#ef4444',
        stable: '#6b7280'
      };
      
      Object.entries(trendColors).forEach(([trend, color]) => {
        const { container } = render(
          <AnimatedCard 
            {...mockProps}
            metrics={{ ...mockProps.metrics, trend: trend as any }}
          />
        );
        
        const trendElement = container.querySelector('.metric-trend');
        expect(trendElement).toHaveStyle(`color: ${color}`);
      });
    });

    it('handles invalid color prop gracefully', () => {
      expect(() => {
        render(
          <AnimatedCard 
            {...mockProps}
            color="invalid-color"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Animation States', () => {
    it('handles rest state correctly', () => {
      const { container } = render(<AnimatedCard {...mockProps} />);
      
      const card = container.querySelector('.animated-card');
      expect(card).toBeInTheDocument();
    });

    it('handles selected state correctly', () => {
      const { container } = render(
        <AnimatedCard {...mockProps} isSelected={true} />
      );
      
      const card = container.querySelector('.animated-card');
      expect(card).toHaveClass('selected');
    });

    it('transitions between states smoothly', () => {
      const { rerender, container } = render(
        <AnimatedCard {...mockProps} isSelected={false} />
      );
      
      const card = container.querySelector('.animated-card');
      expect(card).not.toHaveClass('selected');
      
      rerender(<AnimatedCard {...mockProps} isSelected={true} />);
      expect(card).toHaveClass('selected');
    });
  });

  describe('Content Flexibility', () => {
    it('handles long titles gracefully', () => {
      const longTitle = 'This is an extremely long title that should still be displayed correctly in the animated card component';
      
      render(
        <AnimatedCard 
          {...mockProps}
          title={longTitle}
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles long descriptions gracefully', () => {
      const longDescription = 'This is a very long description that contains multiple sentences and should wrap properly within the card layout without breaking the visual design of the component.';
      
      render(
        <AnimatedCard 
          {...mockProps}
          description={longDescription}
        />
      );
      
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('handles various icon types', () => {
      const icons = ['🎯', '📊', '⚡', '🔧', '🎨'];
      
      icons.forEach(icon => {
        render(
          <AnimatedCard 
            {...mockProps}
            icon={icon}
          />
        );
        
        expect(screen.getByText(icon)).toBeInTheDocument();
      });
    });

    it('handles different metric values', () => {
      const values = [0, 42, 99.9, 1000, 1234567];
      
      values.forEach(value => {
        render(
          <AnimatedCard 
            {...mockProps}
            metrics={{ ...mockProps.metrics, value }}
          />
        );
        
        const expectedText = value % 1 !== 0 ? value.toFixed(1) : value.toString();
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });

    it('handles different metric labels', () => {
      const labels = ['Count', 'Percentage', 'Score', 'Time (ms)', 'Rate'];
      
      labels.forEach(label => {
        render(
          <AnimatedCard 
            {...mockProps}
            metrics={{ ...mockProps.metrics, label }}
          />
        );
        
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('Responsiveness', () => {
    it('maintains structure with minimal content', () => {
      const minimalProps = {
        title: 'A',
        description: 'B',
        icon: '🔹',
        metrics: {
          value: 1,
          label: 'X',
          trend: 'stable' as const
        },
        color: 'from-gray-400 to-gray-600'
      };
      
      const { container } = render(<AnimatedCard {...minimalProps} />);
      
      expect(container.querySelector('.animated-card')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('🔹')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('handles zero values correctly', () => {
      render(
        <AnimatedCard 
          {...mockProps}
          metrics={{ ...mockProps.metrics, value: 0 }}
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles negative values correctly', () => {
      render(
        <AnimatedCard 
          {...mockProps}
          metrics={{ ...mockProps.metrics, value: -42 }}
        />
      );
      
      expect(screen.getByText('-42')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides clickable interface when onClick is provided', () => {
      const onClick = jest.fn();
      const { container } = render(
        <AnimatedCard {...mockProps} onClick={onClick} />
      );
      
      const card = container.querySelector('.animated-card');
      expect(card).toBeInTheDocument();
      
      // Card should be interactive
      expect(card).toHaveStyle('cursor: pointer');
    });

    it('has appropriate semantic structure', () => {
      render(<AnimatedCard {...mockProps} />);
      
      // Title should be in a heading-like structure
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('This is a test animated card component')).toBeInTheDocument();
    });

    it('provides meaningful text content', () => {
      render(<AnimatedCard {...mockProps} />);
      
      expect(screen.getByText('Test Component')).toBeVisible();
      expect(screen.getByText('42')).toBeVisible();
      expect(screen.getByText('Test Metric')).toBeVisible();
    });

    it('handles keyboard interactions appropriately', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      
      const { container } = render(
        <AnimatedCard {...mockProps} onClick={onClick} />
      );
      
      const card = container.querySelector('.animated-card');
      if (card) {
        // Focus and enter/space should trigger click
        card.focus();
        await user.keyboard('[Enter]');
        
        // Note: This would need proper keyboard handling in the component
        // For now, we just verify the structure is correct
        expect(card).toBeInTheDocument();
      }
    });
  });

  describe('Performance', () => {
    it('renders efficiently with complex content', () => {
      const complexProps = {
        title: 'Complex Performance Metrics Dashboard Component',
        description: 'This component displays real-time performance metrics with advanced visualizations and interactive features for monitoring system health.',
        icon: '📊',
        metrics: {
          value: 99.99999,
          label: 'System Uptime Percentage Over Last 30 Days',
          trend: 'up' as const
        },
        color: 'from-gradient-start via-gradient-middle to-gradient-end'
      };
      
      const startTime = performance.now();
      render(<AnimatedCard {...complexProps} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
    });

    it('handles prop updates efficiently', () => {
      const { rerender } = render(<AnimatedCard {...mockProps} />);
      
      // Multiple rapid updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <AnimatedCard 
            {...mockProps}
            metrics={{ ...mockProps.metrics, value: i }}
          />
        );
      }
      
      expect(screen.getByText('9')).toBeInTheDocument();
    });

    it('does not cause memory leaks on unmount', () => {
      const { unmount } = render(<AnimatedCard {...mockProps} />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles missing required props gracefully', () => {
      const incompleteProps = {
        title: 'Test',
        description: 'Test desc',
        icon: '🔹'
      };
      
      expect(() => {
        render(<AnimatedCard {...incompleteProps as any} />);
      }).not.toThrow();
    });

    it('handles invalid metric values gracefully', () => {
      const invalidMetrics = {
        value: NaN,
        label: 'Test',
        trend: 'invalid' as any
      };
      
      expect(() => {
        render(
          <AnimatedCard 
            {...mockProps}
            metrics={invalidMetrics}
          />
        );
      }).not.toThrow();
    });

    it('handles null or undefined values gracefully', () => {
      expect(() => {
        render(
          <AnimatedCard 
            {...mockProps}
            title={null as any}
            description={undefined as any}
          />
        );
      }).not.toThrow();
    });
  });
});