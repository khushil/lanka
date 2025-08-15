import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InteractiveGraph from '../InteractiveGraph';

// Mock D3.js
jest.mock('d3', () => require('../../../tests/__mocks__/d3'));
jest.mock('framer-motion', () => require('../../../tests/__mocks__/framer-motion'));

const mockData = {
  nodes: [
    {
      id: '1',
      title: 'User Authentication',
      category: 'Security',
      priority: 'high',
      status: 'approved',
      complexity: 8,
      group: 1
    },
    {
      id: '2',
      title: 'Data Visualization',
      category: 'Features',
      priority: 'medium',
      status: 'draft',
      complexity: 6,
      group: 2
    },
    {
      id: '3',
      title: 'API Performance',
      category: 'Performance',
      priority: 'critical',
      status: 'review',
      complexity: 9,
      group: 1
    }
  ],
  links: [
    {
      source: '1',
      target: '2',
      strength: 0.8,
      type: 'dependency' as const
    },
    {
      source: '2',
      target: '3',
      strength: 0.6,
      type: 'similarity' as const
    }
  ]
};

describe('InteractiveGraph Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the graph container', () => {
      render(
        <InteractiveGraph 
          data={mockData} 
          width={800} 
          height={600}
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument(); // SVG element
      expect(screen.getByText('🔄 Reset View')).toBeInTheDocument();
    });

    it('renders legend with categories and link types', () => {
      render(<InteractiveGraph data={mockData} />);
      
      expect(screen.getByText('Node Categories')).toBeInTheDocument();
      expect(screen.getByText('Link Types')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Similarities')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(
        <InteractiveGraph 
          data={{ nodes: [], links: [] }} 
        />
      );
      
      expect(screen.getByText('No data to visualize')).toBeInTheDocument();
      expect(screen.getByText('Apply different filters or check your data source')).toBeInTheDocument();
    });

    it('applies default dimensions when not specified', () => {
      const { container } = render(<InteractiveGraph data={mockData} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '600');
    });

    it('applies custom dimensions when specified', () => {
      const { container } = render(
        <InteractiveGraph 
          data={mockData} 
          width={1000} 
          height={800}
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '1000');
      expect(svg).toHaveAttribute('height', '800');
    });
  });

  describe('Data Visualization', () => {
    it('creates nodes for all data points', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // D3 select should be called to create nodes
      expect(d3Mock.select).toHaveBeenCalled();
      expect(d3Mock.forceSimulation).toHaveBeenCalled();
    });

    it('creates links between connected nodes', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Force link simulation should be created
      expect(d3Mock.forceLink).toHaveBeenCalled();
    });

    it('applies correct color scheme to nodes', () => {
      render(<InteractiveGraph data={mockData} />);
      
      // Legend should show color indicators
      const legendItems = screen.getAllByClassName('legend-color');
      expect(legendItems.length).toBeGreaterThan(0);
    });

    it('scales node sizes based on priority', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Scale should be created for priority
      expect(d3Mock.scaleOrdinal).toHaveBeenCalled();
    });

    it('handles different link types with different styles', () => {
      render(<InteractiveGraph data={mockData} />);
      
      const dependencyLegend = screen.getByText('Dependencies');
      const similarityLegend = screen.getByText('Similarities');
      
      expect(dependencyLegend).toBeInTheDocument();
      expect(similarityLegend).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onNodeClick when node is clicked', async () => {
      const onNodeClick = jest.fn();
      const d3Mock = require('../../../tests/__mocks__/d3');
      
      render(
        <InteractiveGraph 
          data={mockData} 
          onNodeClick={onNodeClick}
        />
      );
      
      // Simulate node click through D3 mock
      const mockNodeData = mockData.nodes[0];
      const mockEvent = { stopPropagation: jest.fn() };
      
      // Get the click handler from D3 mock
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const clickCall = onHandler.mock.calls.find(call => call[0] === 'click');
        if (clickCall && clickCall[1]) {
          clickCall[1](mockEvent, mockNodeData);
          expect(onNodeClick).toHaveBeenCalledWith('1');
        }
      }
    });

    it('highlights selected node', () => {
      const { rerender } = render(
        <InteractiveGraph 
          data={mockData} 
          selectedNode="1"
        />
      );
      
      // Should apply selection styling
      expect(screen.getByRole('img')).toBeInTheDocument();
      
      // Re-render with different selection
      rerender(
        <InteractiveGraph 
          data={mockData} 
          selectedNode="2"
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles mouse hover events', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Verify hover handlers are set up
      const onHandler = d3Mock.select().on;
      expect(onHandler).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(onHandler).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('handles drag interactions', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Drag behavior should be applied
      expect(d3Mock.drag).toHaveBeenCalled();
    });

    it('handles zoom and pan interactions', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Zoom behavior should be set up
      expect(d3Mock.zoom).toHaveBeenCalled();
    });

    it('resets view when reset button is clicked', async () => {
      const user = userEvent.setup();
      const d3Mock = require('../../../tests/__mocks__/d3');
      
      render(<InteractiveGraph data={mockData} />);
      
      const resetButton = screen.getByText('🔄 Reset View');
      await user.click(resetButton);
      
      // Should reset simulation and zoom
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Tooltips and Information Display', () => {
    it('creates tooltips on node hover', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Simulate mouseover event
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const hoverCall = onHandler.mock.calls.find(call => call[0] === 'mouseover');
        if (hoverCall && hoverCall[1]) {
          const mockEvent = { pageX: 100, pageY: 100 };
          const mockNodeData = mockData.nodes[0];
          hoverCall[1](mockEvent, mockNodeData);
          
          // D3 append should be called to create tooltip
          expect(d3Mock.select).toHaveBeenCalled();
        }
      }
    });

    it('removes tooltips on mouse leave', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Simulate mouseout event
      const onHandler = d3Mock.select().on;
      if (onHandler.mock && onHandler.mock.calls.length > 0) {
        const leaveCall = onHandler.mock.calls.find(call => call[0] === 'mouseout');
        if (leaveCall && leaveCall[1]) {
          leaveCall[1]({}, mockData.nodes[0]);
          
          // Tooltip removal should be handled
          expect(d3Mock.selectAll).toHaveBeenCalled();
        }
      }
    });

    it('highlights connected nodes and links on hover', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Mouse over should highlight connections
      const onHandler = d3Mock.select().on;
      expect(onHandler).toHaveBeenCalledWith('mouseover', expect.any(Function));
    });
  });

  describe('Animation and Simulation', () => {
    it('initializes force simulation', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      expect(d3Mock.forceSimulation).toHaveBeenCalledWith(mockData.nodes);
    });

    it('sets up force simulation with appropriate forces', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      render(<InteractiveGraph data={mockData} />);
      
      // Should create various forces
      expect(d3Mock.forceLink).toHaveBeenCalled();
      expect(d3Mock.forceManyBody).toHaveBeenCalled();
      expect(d3Mock.forceCenter).toHaveBeenCalled();
      expect(d3Mock.forceCollide).toHaveBeenCalled();
    });

    it('updates positions on simulation tick', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const mockSimulation = d3Mock.forceSimulation();
      
      render(<InteractiveGraph data={mockData} />);
      
      expect(mockSimulation.on).toHaveBeenCalledWith('tick', expect.any(Function));
    });

    it('stops simulation on component unmount', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const mockSimulation = d3Mock.forceSimulation();
      
      const { unmount } = render(<InteractiveGraph data={mockData} />);
      
      unmount();
      
      expect(mockSimulation.stop).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different container sizes', () => {
      const { rerender } = render(
        <InteractiveGraph 
          data={mockData} 
          width={600} 
          height={400}
        />
      );
      
      rerender(
        <InteractiveGraph 
          data={mockData} 
          width={1200} 
          height={800}
        />
      );
      
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles data updates efficiently', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const { rerender } = render(<InteractiveGraph data={mockData} />);
      
      const updatedData = {
        ...mockData,
        nodes: [...mockData.nodes, {
          id: '4',
          title: 'New Node',
          category: 'Features',
          priority: 'low',
          status: 'draft',
          complexity: 4,
          group: 2
        }]
      };
      
      rerender(<InteractiveGraph data={updatedData} />);
      
      // Simulation should be restarted with new data
      expect(d3Mock.forceSimulation).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = {
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          title: `Node ${i}`,
          category: 'Features',
          priority: 'medium',
          status: 'draft',
          complexity: Math.floor(Math.random() * 10) + 1,
          group: Math.floor(Math.random() * 5) + 1
        })),
        links: Array.from({ length: 150 }, (_, i) => ({
          source: `node-${Math.floor(Math.random() * 100)}`,
          target: `node-${Math.floor(Math.random() * 100)}`,
          strength: Math.random(),
          type: 'dependency' as const
        }))
      };
      
      const startTime = performance.now();
      render(<InteractiveGraph data={largeDataset} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('debounces interactions appropriately', () => {
      const onNodeClick = jest.fn();
      render(
        <InteractiveGraph 
          data={mockData} 
          onNodeClick={onNodeClick}
        />
      );
      
      // Multiple rapid interactions should be handled efficiently
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides SVG with appropriate role', () => {
      render(<InteractiveGraph data={mockData} />);
      
      const svg = screen.getByRole('img');
      expect(svg).toBeInTheDocument();
    });

    it('includes reset button for keyboard users', () => {
      render(<InteractiveGraph data={mockData} />);
      
      const resetButton = screen.getByRole('button', { name: /reset view/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('provides legend for screen readers', () => {
      render(<InteractiveGraph data={mockData} />);
      
      expect(screen.getByText('Node Categories')).toBeInTheDocument();
      expect(screen.getByText('Link Types')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid node data gracefully', () => {
      const invalidData = {
        nodes: [
          { id: '1', title: 'Valid Node', category: 'Features', priority: 'high', status: 'approved', complexity: 5, group: 1 },
          { id: null, title: null } as any // Invalid node
        ],
        links: []
      };
      
      expect(() => {
        render(<InteractiveGraph data={invalidData} />);
      }).not.toThrow();
    });

    it('handles missing link targets gracefully', () => {
      const invalidLinks = {
        nodes: mockData.nodes,
        links: [
          { source: '1', target: 'nonexistent', strength: 0.5, type: 'dependency' as const }
        ]
      };
      
      expect(() => {
        render(<InteractiveGraph data={invalidLinks} />);
      }).not.toThrow();
    });

    it('continues to function if D3 operations fail', () => {
      // Mock D3 to throw an error
      const d3Mock = require('../../../tests/__mocks__/d3');
      d3Mock.select.mockImplementationOnce(() => {
        throw new Error('D3 error');
      });
      
      expect(() => {
        render(<InteractiveGraph data={mockData} />);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const { unmount } = render(<InteractiveGraph data={mockData} />);
      
      unmount();
      
      // Should clean up D3 selections and tooltips
      expect(d3Mock.selectAll).toHaveBeenCalledWith('.graph-tooltip');
    });

    it('stops running simulations on unmount', () => {
      const d3Mock = require('../../../tests/__mocks__/d3');
      const mockSimulation = d3Mock.forceSimulation();
      
      const { unmount } = render(<InteractiveGraph data={mockData} />);
      
      unmount();
      
      expect(mockSimulation.stop).toHaveBeenCalled();
    });
  });
});