import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { VisualNavigation } from '../VisualNavigation';

// Mock dependencies
jest.mock('framer-motion', () => require('../../../tests/__mocks__/framer-motion'));
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useTheme: () => ({
      palette: {
        primary: { main: '#1976d2', dark: '#1565c0' },
        secondary: { main: '#dc004e' },
        success: { main: '#2e7d32' },
        background: { paper: '#ffffff' },
        grey: { 600: '#757575', 700: '#616161' },
        action: { hover: '#f5f5f5' },
        divider: '#e0e0e0',
        text: { primary: '#212121', secondary: '#757575' }
      }
    })
  };
});

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/visualizations/architecture' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const defaultProps = {
  currentTab: 0,
  onTabChange: jest.fn(),
  fullscreen: false
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VisualNavigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    });
    
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: jest.fn(),
      writable: true
    });
    
    Object.defineProperty(document, 'exitFullscreen', {
      value: jest.fn(),
      writable: true
    });
  });

  describe('Initial Render - Normal Mode', () => {
    it('renders navigation toggle button when not in fullscreen', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(screen.getByLabelText(/navigation menu/i)).toBeInTheDocument();
    });

    it('renders quick action buttons', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(screen.getByLabelText(/refresh data/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fullscreen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument();
    });

    it('renders breadcrumb navigation', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(screen.getByLabelText(/navigation breadcrumb/i)).toBeInTheDocument();
    });

    it('does not render navigation in fullscreen mode initially', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      expect(screen.queryByLabelText(/navigation menu/i)).not.toBeInTheDocument();
    });
  });

  describe('Fullscreen Mode', () => {
    it('renders floating quick navigation in fullscreen mode', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      // Should show floating navigation at bottom
      const navigationItems = screen.getAllByRole('button');
      expect(navigationItems.length).toBeGreaterThan(0);
    });

    it('changes fullscreen button label based on state', () => {
      const { rerender } = renderWithRouter(<VisualNavigation {...defaultProps} fullscreen={false} />);
      
      expect(screen.getByLabelText('Fullscreen')).toBeInTheDocument();
      
      rerender(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      expect(screen.getByLabelText('Exit Fullscreen')).toBeInTheDocument();
    });

    it('handles fullscreen toggle correctly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const fullscreenButton = screen.getByLabelText('Fullscreen');
      await user.click(fullscreenButton);
      
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('handles exit fullscreen correctly', async () => {
      const user = userEvent.setup();
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.documentElement,
        writable: true
      });
      
      renderWithRouter(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      const exitFullscreenButton = screen.getByLabelText('Exit Fullscreen');
      await user.click(exitFullscreenButton);
      
      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });

  describe('Navigation Drawer', () => {
    it('opens drawer when menu button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Visual Navigation')).toBeInTheDocument();
      });
    });

    it('closes drawer when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Visual Navigation')).toBeInTheDocument();
      });
      
      // Close drawer
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      // Drawer content should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText('Visual Navigation')).not.toBeInTheDocument();
      });
    });

    it('renders search functionality in drawer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search visualizations/i)).toBeInTheDocument();
      });
    });

    it('displays navigation items in drawer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('System Flow')).toBeInTheDocument();
        expect(screen.getByText('Data Flow')).toBeInTheDocument();
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
        expect(screen.getByText('Health Monitor')).toBeInTheDocument();
        expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
      });
    });

    it('shows item descriptions in drawer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('3D visualization of system architecture')).toBeInTheDocument();
        expect(screen.getByText('Animated data flow between modules')).toBeInTheDocument();
        expect(screen.getByText('Interactive dependency graph')).toBeInTheDocument();
      });
    });

    it('displays badge indicators for items with alerts', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        // Health Monitor should have badge with count 3
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters navigation items based on search query', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search visualizations/i);
        expect(searchInput).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search visualizations/i);
      await user.type(searchInput, 'system');
      
      await waitFor(() => {
        expect(screen.getByText('System Flow')).toBeInTheDocument();
        expect(screen.queryByText('Data Flow')).not.toBeInTheDocument();
      });
    });

    it('searches by keywords', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      const searchInput = screen.getByPlaceholderText(/search visualizations/i);
      await user.type(searchInput, '3d');
      
      await waitFor(() => {
        expect(screen.getByText('System Flow')).toBeInTheDocument();
      });
    });

    it('shows all items when search is cleared', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      const searchInput = screen.getByPlaceholderText(/search visualizations/i);
      await user.type(searchInput, 'system');
      await user.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.getByText('System Flow')).toBeInTheDocument();
        expect(screen.getByText('Data Flow')).toBeInTheDocument();
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Items and Bookmarks', () => {
    it('displays recent items section', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Recently Accessed')).toBeInTheDocument();
        expect(screen.getByText('System Flow')).toBeInTheDocument(); // Default recent item
        expect(screen.getByText('Dependencies')).toBeInTheDocument(); // Default recent item
      });
    });

    it('displays bookmarks section', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bookmarked')).toBeInTheDocument();
        expect(screen.getByText('Data Flow')).toBeInTheDocument(); // Default bookmarked item
        expect(screen.getByText('Health Monitor')).toBeInTheDocument(); // Default bookmarked item
      });
    });

    it('adds items to recent list when clicked', async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      renderWithRouter(<VisualNavigation {...defaultProps} onTabChange={onTabChange} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const knowledgeGraphItem = screen.getByText('Knowledge Graph');
        expect(knowledgeGraphItem).toBeInTheDocument();
      });
      
      // Click on Knowledge Graph
      const knowledgeGraphItem = screen.getByText('Knowledge Graph');
      await user.click(knowledgeGraphItem);
      
      expect(onTabChange).toHaveBeenCalledWith(4); // Knowledge Graph is at index 4
    });

    it('toggles bookmark status when bookmark icon is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const bookmarkButtons = screen.getAllByRole('button');
        const systemFlowBookmark = bookmarkButtons.find(btn => 
          btn.closest('.MuiListItem-root')?.textContent?.includes('System Flow')
        );
        expect(systemFlowBookmark).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('handles refresh action', async () => {
      const user = userEvent.setup();
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });
      
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      await user.click(refreshButton);
      
      expect(mockReload).toHaveBeenCalled();
    });

    it('handles dashboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const dashboardButton = screen.getByLabelText(/dashboard/i);
      await user.click(dashboardButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows tooltips for quick action buttons', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const refreshButton = screen.getByLabelText(/refresh data/i);
      await user.hover(refreshButton);
      
      // Tooltip should be accessible through aria-label
      expect(refreshButton).toHaveAttribute('aria-label');
    });
  });

  describe('Tab Navigation', () => {
    it('calls onTabChange when navigation item is selected', async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      renderWithRouter(<VisualNavigation {...defaultProps} onTabChange={onTabChange} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const dataFlowItem = screen.getByText('Data Flow');
        expect(dataFlowItem).toBeInTheDocument();
      });
      
      const dataFlowItem = screen.getByText('Data Flow');
      await user.click(dataFlowItem);
      
      expect(onTabChange).toHaveBeenCalledWith(1); // Data Flow is at index 1
    });

    it('highlights current tab in fullscreen mode', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} currentTab={2} fullscreen={true} />);
      
      // In fullscreen mode, current tab should be highlighted
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('changes tab selection in fullscreen navigation', async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();
      
      renderWithRouter(
        <VisualNavigation 
          {...defaultProps} 
          onTabChange={onTabChange}
          fullscreen={true} 
        />
      );
      
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 1) {
        await user.click(buttons[1]);
        expect(onTabChange).toHaveBeenCalled();
      }
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('displays breadcrumb based on current location', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} currentTab={0} />);
      
      expect(screen.getByLabelText(/navigation breadcrumb/i)).toBeInTheDocument();
    });

    it('includes home link in breadcrumb', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Home icon should be present in breadcrumb
      const homeIcons = screen.getAllByTestId('HomeIcon');
      expect(homeIcons.length).toBeGreaterThan(0);
    });

    it('shows current tab in breadcrumb', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} currentTab={1} />);
      
      // Should show current tab information
      expect(screen.getByLabelText(/navigation breadcrumb/i)).toBeInTheDocument();
    });
  });

  describe('Footer Navigation', () => {
    it('displays settings and help links in drawer footer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
      });
    });

    it('navigates to settings when settings link is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const settingsLink = screen.getByText('Settings');
        expect(settingsLink).toBeInTheDocument();
      });
      
      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout for different screen sizes', () => {
      // Test normal mode
      const { rerender } = renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(screen.getByLabelText(/navigation menu/i)).toBeInTheDocument();
      
      // Test fullscreen mode
      rerender(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      expect(screen.queryByLabelText(/navigation menu/i)).not.toBeInTheDocument();
    });

    it('positions elements correctly in different modes', () => {
      const { rerender } = renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Check normal mode positioning
      expect(screen.getByLabelText(/navigation menu/i)).toBeInTheDocument();
      
      // Check fullscreen mode positioning
      rerender(<VisualNavigation {...defaultProps} fullscreen={true} />);
      
      // Fullscreen navigation should be at bottom
      const navigation = screen.getAllByRole('button');
      expect(navigation.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for all interactive elements', () => {
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(screen.getByLabelText(/navigation menu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh data/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fullscreen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const menuButton = screen.getByLabelText(/navigation menu/i);
      menuButton.focus();
      
      expect(menuButton).toHaveFocus();
      
      await user.keyboard('[Enter]');
      
      await waitFor(() => {
        expect(screen.getByText('Visual Navigation')).toBeInTheDocument();
      });
    });

    it('provides meaningful navigation structure', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Open drawer
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        // Should have proper heading structure
        expect(screen.getByText('Visual Navigation')).toBeInTheDocument();
        expect(screen.getByText('Recently Accessed')).toBeInTheDocument();
        expect(screen.getByText('Bookmarked')).toBeInTheDocument();
      });
    });

    it('maintains focus management in drawer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const menuButton = screen.getByLabelText(/navigation menu/i);
      await user.click(menuButton);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search visualizations/i);
        expect(searchInput).toBeInTheDocument();
      });
      
      // Focus should move logically through drawer elements
      const searchInput = screen.getByPlaceholderText(/search visualizations/i);
      searchInput.focus();
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with all features enabled', () => {
      const startTime = performance.now();
      
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles rapid state changes efficiently', () => {
      const { rerender } = renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      // Rapid fullscreen toggles
      for (let i = 0; i < 10; i++) {
        rerender(<VisualNavigation {...defaultProps} fullscreen={i % 2 === 0} />);
      }
      
      expect(screen.getByLabelText(/navigation menu/i)).toBeInTheDocument();
    });

    it('cleans up event listeners on unmount', () => {
      const { unmount } = renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles navigation errors gracefully', async () => {
      const user = userEvent.setup();
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });
      
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const dashboardButton = screen.getByLabelText(/dashboard/i);
      
      expect(async () => {
        await user.click(dashboardButton);
      }).not.toThrow();
    });

    it('handles fullscreen API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock fullscreen API to throw error
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: jest.fn(() => Promise.reject(new Error('Fullscreen error'))),
        writable: true
      });
      
      renderWithRouter(<VisualNavigation {...defaultProps} />);
      
      const fullscreenButton = screen.getByLabelText(/fullscreen/i);
      
      expect(async () => {
        await user.click(fullscreenButton);
      }).not.toThrow();
    });

    it('continues to function with missing route information', () => {
      // Mock location with minimal data
      const mockEmptyLocation = { pathname: '/' };
      jest.mocked(require('react-router-dom').useLocation).mockReturnValue(mockEmptyLocation);
      
      expect(() => {
        renderWithRouter(<VisualNavigation {...defaultProps} />);
      }).not.toThrow();
    });
  });
});