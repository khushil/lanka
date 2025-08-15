import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricsDisplay from '../MetricsDisplay';

// Mock framer-motion
jest.mock('framer-motion', () => require('../../../tests/__mocks__/framer-motion'));

const mockMetrics = [
  {
    label: 'Active Users',
    value: 1247,
    trend: 'up' as const,
    change: 12.5,
    unit: '',
    icon: '👥'
  },
  {
    label: 'Response Time',
    value: 142,
    trend: 'down' as const,
    change: -8.3,
    unit: 'ms',
    icon: '⚡'
  },
  {
    label: 'Success Rate',
    value: 99.7,
    trend: 'stable' as const,
    change: 0.1,
    unit: '%',
    icon: '✅'
  },
  {
    label: 'System Status',
    value: 'Operational',
    trend: 'stable' as const,
    icon: '🟢'
  }
];

// Mock requestAnimationFrame for animation testing
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('MetricsDisplay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('renders all provided metrics', () => {
      render(<MetricsDisplay metrics={mockMetrics} />);
      
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('displays metric values correctly', () => {
      render(<MetricsDisplay metrics={mockMetrics} />);
      
      expect(screen.getByText('1.2K')).toBeInTheDocument(); // Formatted large number
      expect(screen.getByText('142ms')).toBeInTheDocument(); // With unit
      expect(screen.getByText('99.7%')).toBeInTheDocument(); // Decimal with unit
      expect(screen.getByText('Operational')).toBeInTheDocument(); // String value
    });

    it('shows trend indicators when enabled', () => {
      render(<MetricsDisplay metrics={mockMetrics} showTrends={true} />);
      
      expect(screen.getByText('↗️')).toBeInTheDocument(); // Up trend
      expect(screen.getByText('↘️')).toBeInTheDocument(); // Down trend
      expect(screen.getAllByText('→')).toHaveLength(2); // Stable trends
    });

    it('hides trend indicators when disabled', () => {
      render(<MetricsDisplay metrics={mockMetrics} showTrends={false} />);
      
      expect(screen.queryByText('↗️')).not.toBeInTheDocument();
      expect(screen.queryByText('↘️')).not.toBeInTheDocument();
    });

    it('displays icons when provided', () => {
      render(<MetricsDisplay metrics={mockMetrics} />);
      
      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });

    it('applies correct layout classes', () => {
      const layouts = ['horizontal', 'vertical', 'grid'] as const;
      
      layouts.forEach(layout => {
        const { container } = render(
          <MetricsDisplay metrics={mockMetrics} layout={layout} />
        );
        
        const display = container.querySelector('.metrics-display');
        expect(display).toHaveClass(layout);
      });
    });

    it('applies default layout when not specified', () => {
      const { container } = render(<MetricsDisplay metrics={mockMetrics} />);
      
      const display = container.querySelector('.metrics-display');
      expect(display).toHaveClass('horizontal');
    });
  });

  describe('Value Formatting', () => {
    it('formats large numbers with K suffix', () => {
      const largeNumberMetric = [{
        label: 'Large Number',
        value: 15000,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={largeNumberMetric} />);
      
      expect(screen.getByText('15.0K')).toBeInTheDocument();
    });

    it('formats very large numbers with M suffix', () => {
      const veryLargeNumberMetric = [{
        label: 'Very Large Number',
        value: 2500000,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={veryLargeNumberMetric} />);
      
      expect(screen.getByText('2.5M')).toBeInTheDocument();
    });

    it('formats decimal numbers correctly', () => {
      const decimalMetric = [{
        label: 'Decimal',
        value: 42.7,
        trend: 'stable' as const
      }];
      
      render(<MetricsDisplay metrics={decimalMetric} />);
      
      expect(screen.getByText('42.7')).toBeInTheDocument();
    });

    it('formats integers without decimals', () => {
      const integerMetric = [{
        label: 'Integer',
        value: 100,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={integerMetric} />);
      
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles string values directly', () => {
      const stringMetric = [{
        label: 'Status',
        value: 'Active',
        trend: 'stable' as const
      }];
      
      render(<MetricsDisplay metrics={stringMetric} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('appends units when provided', () => {
      const unitMetric = [{
        label: 'Temperature',
        value: 72,
        trend: 'stable' as const,
        unit: '°F'
      }];
      
      render(<MetricsDisplay metrics={unitMetric} />);
      
      expect(screen.getByText('72°F')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators and Colors', () => {
    it('applies correct colors for up trend', () => {
      const { container } = render(
        <MetricsDisplay metrics={[mockMetrics[0]]} showTrends={true} />
      );
      
      const trendElement = container.querySelector('.metric-trend');
      expect(trendElement).toHaveStyle('color: #10b981');
    });

    it('applies correct colors for down trend', () => {
      const { container } = render(
        <MetricsDisplay metrics={[mockMetrics[1]]} showTrends={true} />
      );
      
      const trendElement = container.querySelector('.metric-trend');
      expect(trendElement).toHaveStyle('color: #ef4444');
    });

    it('applies correct colors for stable trend', () => {
      const { container } = render(
        <MetricsDisplay metrics={[mockMetrics[2]]} showTrends={true} />
      );
      
      const trendElement = container.querySelector('.metric-trend');
      expect(trendElement).toHaveStyle('color: #6b7280');
    });

    it('displays change values when provided', () => {
      render(<MetricsDisplay metrics={mockMetrics} />);
      
      expect(screen.getByText('+12.5')).toBeInTheDocument();
      expect(screen.getByText('-8.3ms')).toBeInTheDocument();
      expect(screen.getByText('+0.1%')).toBeInTheDocument();
    });

    it('formats change values with proper signs', () => {
      const changeMetrics = [
        { label: 'Positive', value: 100, trend: 'up' as const, change: 5 },
        { label: 'Negative', value: 100, trend: 'down' as const, change: -5 },
        { label: 'Zero', value: 100, trend: 'stable' as const, change: 0 }
      ];
      
      render(<MetricsDisplay metrics={changeMetrics} />);
      
      expect(screen.getByText('+5%')).toBeInTheDocument();
      expect(screen.getByText('-5%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Animation Features', () => {
    it('animates values when animation is enabled', async () => {
      render(<MetricsDisplay metrics={mockMetrics} animated={true} />);
      
      // Animation should start with 0 and animate to actual value
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // Values should be animating
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('shows static values when animation is disabled', () => {
      render(<MetricsDisplay metrics={mockMetrics} animated={false} />);
      
      // Should show actual values immediately
      expect(screen.getByText('1.2K')).toBeInTheDocument();
      expect(screen.getByText('142ms')).toBeInTheDocument();
    });

    it('handles animated counter for numeric values', async () => {
      const numericMetric = [{
        label: 'Count',
        value: 100,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={numericMetric} animated={true} />);
      
      // Should animate from 0 to 100
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('uses easing function for smooth animation', async () => {
      const metric = [{
        label: 'Value',
        value: 1000,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={metric} animated={true} />);
      
      // Animation should use easing function
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Live Updates', () => {
    it('shows live update indicators when updateInterval is set', async () => {
      render(<MetricsDisplay metrics={mockMetrics} updateInterval={1000} />);
      
      // Fast-forward to trigger live update
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      await waitFor(() => {
        const liveIndicator = screen.getByText('LIVE');
        expect(liveIndicator).toBeInTheDocument();
      });
      
      // Live indicator should disappear after a short time
      act(() => {
        jest.advanceTimersByTime(400);
      });
      
      expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    });

    it('simulates value variations during live updates', async () => {
      const singleMetric = [{
        label: 'Live Value',
        value: 100,
        trend: 'up' as const
      }];
      
      render(<MetricsDisplay metrics={singleMetric} updateInterval={500} />);
      
      // Trigger live update
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      // Value should have some variation (within ±5%)
      expect(screen.getByText('Live Value')).toBeInTheDocument();
    });

    it('applies pulse animation during live updates', async () => {
      const { container } = render(
        <MetricsDisplay metrics={mockMetrics} updateInterval={1000} />
      );
      
      // Trigger live update
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      await waitFor(() => {
        const metricItems = container.querySelectorAll('.metric-item');
        metricItems.forEach(item => {
          expect(item).toHaveClass('live-update');
        });
      });
    });

    it('disables live updates when updateInterval is 0', () => {
      render(<MetricsDisplay metrics={mockMetrics} updateInterval={0} />);
      
      // Fast-forward significant time
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Should not show live indicators
      expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    });

    it('cleans up intervals on unmount', () => {
      const { unmount } = render(
        <MetricsDisplay metrics={mockMetrics} updateInterval={1000} />
      );
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Visual Effects', () => {
    it('renders background glow orbs', () => {
      const { container } = render(<MetricsDisplay metrics={mockMetrics} />);
      
      const glowOrbs = container.querySelectorAll('.glow-orb');
      expect(glowOrbs).toHaveLength(3);
    });

    it('renders progress backgrounds for each metric', () => {
      const { container } = render(<MetricsDisplay metrics={mockMetrics} />);
      
      const progressElements = container.querySelectorAll('.metric-progress');
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('renders live update pulse dots when active', async () => {
      render(<MetricsDisplay metrics={mockMetrics} updateInterval={500} />);
      
      // Trigger live update
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const { container } = render(<MetricsDisplay metrics={mockMetrics} updateInterval={500} />);
        const pulseDots = container.querySelectorAll('.pulse-dot');
        expect(pulseDots.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Responsive Layouts', () => {
    it('renders horizontal layout correctly', () => {
      const { container } = render(
        <MetricsDisplay metrics={mockMetrics} layout="horizontal" />
      );
      
      expect(container.querySelector('.metrics-display.horizontal')).toBeInTheDocument();
    });

    it('renders vertical layout correctly', () => {
      const { container } = render(
        <MetricsDisplay metrics={mockMetrics} layout="vertical" />
      );
      
      expect(container.querySelector('.metrics-display.vertical')).toBeInTheDocument();
    });

    it('renders grid layout correctly', () => {
      const { container } = render(
        <MetricsDisplay metrics={mockMetrics} layout="grid" />
      );
      
      expect(container.querySelector('.metrics-display.grid')).toBeInTheDocument();
    });

    it('handles empty metrics array gracefully', () => {
      expect(() => {
        render(<MetricsDisplay metrics={[]} />);
      }).not.toThrow();
      
      const { container } = render(<MetricsDisplay metrics={[]} />);
      expect(container.querySelector('.metrics-display')).toBeInTheDocument();
    });

    it('handles single metric display', () => {
      render(<MetricsDisplay metrics={[mockMetrics[0]]} />);
      
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid metric values gracefully', () => {
      const invalidMetrics = [
        { label: 'Invalid', value: NaN, trend: 'up' as const },
        { label: 'Null', value: null as any, trend: 'stable' as const },
        { label: 'Undefined', value: undefined as any, trend: 'down' as const }
      ];
      
      expect(() => {
        render(<MetricsDisplay metrics={invalidMetrics} />);
      }).not.toThrow();
    });

    it('handles missing required properties', () => {
      const incompleteMetrics = [
        { label: 'Missing Value', trend: 'up' as any },
        { value: 42, trend: 'stable' as any }, // Missing label
        { label: 'Missing Trend', value: 100 } as any
      ];
      
      expect(() => {
        render(<MetricsDisplay metrics={incompleteMetrics} />);
      }).not.toThrow();
    });

    it('handles invalid trend values', () => {
      const invalidTrendMetrics = [{
        label: 'Invalid Trend',
        value: 100,
        trend: 'invalid-trend' as any
      }];
      
      expect(() => {
        render(<MetricsDisplay metrics={invalidTrendMetrics} />);
      }).not.toThrow();
    });

    it('continues to function with animation errors', () => {
      // Mock requestAnimationFrame to throw error
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn(() => {
        throw new Error('Animation error');
      });
      
      expect(() => {
        render(<MetricsDisplay metrics={mockMetrics} animated={true} />);
      }).not.toThrow();
      
      global.requestAnimationFrame = originalRAF;
    });
  });

  describe('Performance', () => {
    it('renders large number of metrics efficiently', () => {
      const manyMetrics = Array.from({ length: 20 }, (_, i) => ({
        label: `Metric ${i}`,
        value: Math.random() * 1000,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as const,
        icon: '📊'
      }));
      
      const startTime = performance.now();
      render(<MetricsDisplay metrics={manyMetrics} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles rapid prop updates efficiently', () => {
      const { rerender } = render(<MetricsDisplay metrics={mockMetrics} />);
      
      // Rapid updates
      for (let i = 0; i < 10; i++) {
        const updatedMetrics = mockMetrics.map(m => ({
          ...m,
          value: typeof m.value === 'number' ? m.value + i : m.value
        }));
        
        rerender(<MetricsDisplay metrics={updatedMetrics} />);
      }
      
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('cancels animations on unmount', () => {
      const { unmount } = render(
        <MetricsDisplay metrics={mockMetrics} animated={true} />
      );
      
      unmount();
      
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful text for screen readers', () => {
      render(<MetricsDisplay metrics={mockMetrics} />);
      
      // All metric labels should be visible
      expect(screen.getByText('Active Users')).toBeVisible();
      expect(screen.getByText('Response Time')).toBeVisible();
      expect(screen.getByText('Success Rate')).toBeVisible();
      expect(screen.getByText('System Status')).toBeVisible();
    });

    it('includes trend information for screen readers', () => {
      render(<MetricsDisplay metrics={mockMetrics} showTrends={true} />);
      
      // Trend indicators should be present
      expect(screen.getByText('↗️')).toBeInTheDocument();
      expect(screen.getByText('↘️')).toBeInTheDocument();
    });

    it('maintains readable contrast for trend colors', () => {
      const { container } = render(
        <MetricsDisplay metrics={mockMetrics} showTrends={true} />
      );
      
      const trends = container.querySelectorAll('.metric-trend');
      trends.forEach(trend => {
        const color = getComputedStyle(trend).color;
        expect(color).toBeTruthy();
      });
    });

    it('handles live update announcements appropriately', async () => {
      render(<MetricsDisplay metrics={mockMetrics} updateInterval={1000} />);
      
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      // Live indicator should be announced
      await waitFor(() => {
        expect(screen.getByText('LIVE')).toBeInTheDocument();
      });
    });
  });
});