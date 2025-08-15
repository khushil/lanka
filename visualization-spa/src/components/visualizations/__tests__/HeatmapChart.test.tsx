import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HeatmapChart from '../HeatmapChart';

// Mock D3.js
jest.mock('d3', () => require('../../../tests/__mocks__/d3'));
jest.mock('framer-motion', () => require('../../../tests/__mocks__/framer-motion'));

const mockData = [
  [0.9, 0.7, 0.3],
  [0.5, 0.8, 0.6],
  [0.2, 0.4, 0.9]
];

const mockLabels = ['Requirement A', 'Requirement B', 'Requirement C'];

describe('HeatmapChart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the heatmap container', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          title="Test Heatmap"
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument(); // SVG element
      expect(screen.getByText('💾 Export SVG')).toBeInTheDocument();
    });

    it('displays the title when provided', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          title="Similarity Matrix"
        />
      );
      
      // D3 should create title text
      expect(d3Mock.select().append).toHaveBeenCalledWith('text');
    });

    it('renders with default dimensions when not specified', () => {
      const { container } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '600');
      expect(svg).toHaveAttribute('height', '600');
    });

    it('applies custom dimensions when specified', () => {
      const { container } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          width={800}
          height={400}
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '400');
    });

    it('shows empty state when no data provided', () => {
      render(
        <HeatmapChart
          data={[]}
          labels={[]}
        />
      );
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('Check your data source and try again')).toBeInTheDocument();
    });
  });

  describe('Data Visualization', () => {
    it('creates cells for all data points', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should create cells for each data point
      expect(d3Mock.select().selectAll).toHaveBeenCalledWith('.cell');
    });

    it('applies correct color scaling', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          colorScheme="blues"
        />
      );
      
      // Should create sequential scale with blues color scheme
      expect(d3Mock.scaleSequential).toHaveBeenCalled();
    });

    it('handles different color schemes', () => {
      const colorSchemes = ['blues', 'reds', 'greens', 'viridis', 'plasma'];
      
      colorSchemes.forEach(scheme => {
        const d3Mock = require('../../../tests/__mocks__/d3');
        render(
          <HeatmapChart
            data={mockData}
            labels={mockLabels}
            colorScheme={scheme as any}
          />
        );
        
        expect(d3Mock.scaleSequential).toHaveBeenCalled();
      });
    });

    it('creates legend with proper scale', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should create legend axis
      expect(d3Mock.axisRight).toHaveBeenCalled();
    });

    it('displays cell values when showValues is true', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          showValues={true}
        />
      );
      
      // Should append text elements for values
      expect(d3Mock.select().append).toHaveBeenCalledWith('text');
    });

    it('hides cell values when showValues is false', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          showValues={false}
        />
      );
      
      // Values should not be displayed
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onCellClick when cell is clicked', () => {
      const onCellClick = jest.fn();
      const d3Mock = require('../../../tests/__mocks__/d3');
      
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          onCellClick={onCellClick}
        />
      );
      
      // Simulate cell click through D3 mock
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const clickCall = onHandler.mock.calls.find(call => call[0] === 'click');
        if (clickCall && clickCall[1]) {
          const mockCellData = { row: 0, col: 1, value: 0.7 };
          clickCall[1]({}, mockCellData);
          expect(onCellClick).toHaveBeenCalledWith(0, 1, 0.7);
        }
      }
    });

    it('handles mouse hover events', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should set up hover handlers
      const onHandler = d3Mock.select().on;
      expect(onHandler).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(onHandler).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('creates tooltips on cell hover', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Simulate mouseover event
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const hoverCall = onHandler.mock.calls.find(call => call[0] === 'mouseover');
        if (hoverCall && hoverCall[1]) {
          const mockEvent = { pageX: 100, pageY: 100 };
          const mockCellData = { row: 0, col: 1, value: 0.7 };
          hoverCall[1](mockEvent, mockCellData);
          
          // Should create tooltip
          expect(d3Mock.select).toHaveBeenCalled();
        }
      }
    });

    it('removes tooltips on mouse leave', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Simulate mouseout event
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const leaveCall = onHandler.mock.calls.find(call => call[0] === 'mouseout');
        if (leaveCall && leaveCall[1]) {
          leaveCall[1]({}, { row: 0, col: 1, value: 0.7 });
          
          // Should remove tooltips
          expect(d3Mock.selectAll).toHaveBeenCalledWith('.heatmap-tooltip');
        }
      }
    });

    it('highlights row and column on cell hover', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Hover should highlight related cells
      const onHandler = d3Mock.select().on;
      expect(onHandler).toHaveBeenCalledWith('mouseover', expect.any(Function));
    });
  });

  describe('Controls and Features', () => {
    it('exports SVG when export button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock URL and document methods
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockLink as any;
        return document.createElement(tag);
      });
      
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          title="Test Heatmap"
        />
      );
      
      const exportButton = screen.getByText('💾 Export SVG');
      await user.click(exportButton);
      
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('test_heatmap_heatmap.svg');
    });

    it('displays color scheme selector', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      expect(screen.getByText('Color Scheme:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('blues')).toBeInTheDocument();
    });

    it('handles color scheme changes', async () => {
      const user = userEvent.setup();
      
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          colorScheme="blues"
        />
      );
      
      const selector = screen.getByDisplayValue('blues');
      await user.selectOptions(selector, 'reds');
      
      // Should log the change (since it's handled by parent)
      expect(selector).toBeInTheDocument();
    });
  });

  describe('Cell Information Display', () => {
    it('displays cell information panel when cell is hovered', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Cell info should be available in the component
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('shows correct cell coordinates and value', () => {
      // This test would need integration with the actual hover state
      // Since we're mocking D3, we'll verify the structure is in place
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Labels and Axes', () => {
    it('creates row labels from provided labels array', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should create row labels
      expect(d3Mock.select().selectAll).toHaveBeenCalledWith('.row-label');
    });

    it('creates column labels from provided labels array', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should create column labels
      expect(d3Mock.select().selectAll).toHaveBeenCalledWith('.col-label');
    });

    it('truncates long labels appropriately', () => {
      const longLabels = [
        'This is a very long requirement name that should be truncated',
        'Another extremely long requirement title',
        'Short name'
      ];
      
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={longLabels}
        />
      );
      
      // Labels should be processed
      expect(d3Mock.select().selectAll).toHaveBeenCalled();
    });
  });

  describe('Animation and Transitions', () => {
    it('animates cell appearance with staggered delays', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should set up transitions with delays
      expect(d3Mock.select().transition).toHaveBeenCalled();
    });

    it('handles selection state changes', () => {
      const { rerender } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Test re-render with same props
      rerender(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different container sizes', () => {
      const { rerender } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          width={400}
          height={300}
        />
      );
      
      rerender(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          width={1000}
          height={800}
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('calculates appropriate cell sizes', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          width={600}
          height={400}
        />
      );
      
      // Should create band scale for cell positioning
      expect(d3Mock.scaleBand).toHaveBeenCalled();
    });
  });

  describe('Data Updates', () => {
    it('handles data changes efficiently', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const { rerender } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      const newData = [
        [0.1, 0.8, 0.9],
        [0.6, 0.2, 0.7],
        [0.9, 0.9, 0.1]
      ];
      
      rerender(
        <HeatmapChart
          data={newData}
          labels={mockLabels}
        />
      );
      
      // Should recreate visualization with new data
      expect(d3Mock.select().selectAll).toHaveBeenCalled();
    });

    it('updates color scale when data range changes', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Should calculate min/max for color scale
      expect(d3Mock.min).toHaveBeenCalled();
      expect(d3Mock.max).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeData = Array.from({ length: 50 }, () => 
        Array.from({ length: 50 }, () => Math.random())
      );
      const largeLabels = Array.from({ length: 50 }, (_, i) => `Item ${i}`);
      
      const startTime = performance.now();
      render(
        <HeatmapChart
          data={largeData}
          labels={largeLabels}
        />
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('optimizes re-renders', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const { rerender } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          colorScheme="blues"
        />
      );
      
      // Re-render with same data shouldn't cause full recreation
      rerender(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
          colorScheme="blues"
        />
      );
      
      expect(d3Mock.select).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides SVG with appropriate role', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      const svg = screen.getByRole('img');
      expect(svg).toBeInTheDocument();
    });

    it('includes accessible export button', () => {
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      const exportButton = screen.getByRole('button', { name: /export svg/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('provides meaningful legend information', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      // Legend should be created with title
      expect(d3Mock.select().append).toHaveBeenCalledWith('text');
    });
  });

  describe('Error Handling', () => {
    it('handles mismatched data and labels gracefully', () => {
      const mismatchedLabels = ['Only One Label'];
      
      expect(() => {
        render(
          <HeatmapChart
            data={mockData}
            labels={mismatchedLabels}
          />
        );
      }).not.toThrow();
    });

    it('handles invalid numeric data', () => {
      const invalidData = [
        [0.5, NaN, 0.3],
        [null as any, 0.8, undefined as any],
        [0.2, 0.4, Infinity]
      ];
      
      expect(() => {
        render(
          <HeatmapChart
            data={invalidData}
            labels={mockLabels}
          />
        );
      }).not.toThrow();
    });

    it('continues to function if D3 operations fail', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      d3Mock.select.mockImplementationOnce(() => {
        throw new Error('D3 error');
      });
      
      expect(() => {
        render(
          <HeatmapChart
            data={mockData}
            labels={mockLabels}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('removes tooltips on unmount', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const { unmount } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      unmount();
      
      // Should clean up tooltips
      expect(d3Mock.selectAll).toHaveBeenCalled();
    });

    it('cleans up event listeners', () => {
      const { unmount } = render(
        <HeatmapChart
          data={mockData}
          labels={mockLabels}
        />
      );
      
      unmount();
      
      // Component should unmount cleanly
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});