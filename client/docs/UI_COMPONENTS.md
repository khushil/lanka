# LANKA UI - Component Documentation

Comprehensive documentation for all UI components in the LANKA platform, including usage examples, props, and best practices.

## 📚 Table of Contents

1. [Authentication Components](#authentication-components)
2. [Layout Components](#layout-components)
3. [Requirements Components](#requirements-components)
4. [Architecture Components](#architecture-components)
5. [Development Components](#development-components)
6. [Graph Visualization Components](#graph-visualization-components)
7. [Analytics Components](#analytics-components)
8. [Collaboration Components](#collaboration-components)
9. [Notification Components](#notification-components)
10. [Settings Components](#settings-components)

## 🔐 Authentication Components

### LoginForm
User authentication form with validation and error handling.

**Location**: `src/components/auth/LoginForm.tsx`

**Props**:
```typescript
interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}
```

**Usage**:
```tsx
<LoginForm 
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => setError(error)}
  redirectTo="/dashboard"
/>
```

**Features**:
- Form validation with Formik and Yup
- Password visibility toggle
- Remember me functionality
- Social login integration
- Loading states and error handling

### RegisterForm
User registration form with comprehensive validation.

**Location**: `src/components/auth/RegisterForm.tsx`

**Props**:
```typescript
interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  requiredFields?: string[];
}
```

**Usage**:
```tsx
<RegisterForm 
  onSuccess={(user) => console.log('User registered:', user)}
  requiredFields={['email', 'password', 'firstName', 'lastName']}
/>
```

### AuthGuard
Route protection component with role-based access control.

**Location**: `src/components/auth/AuthGuard.tsx`

**Props**:
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  requireRoles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}
```

**Usage**:
```tsx
<AuthGuard requireRoles={[UserRole.ADMIN]} redirectTo="/login">
  <AdminPanel />
</AuthGuard>
```

### ForgotPassword
Password recovery form component.

**Location**: `src/components/auth/ForgotPassword.tsx`

**Features**:
- Email validation
- Success/error messaging
- Resend functionality
- Rate limiting

## 🏗️ Layout Components

### Layout
Main application layout wrapper with navigation and sidebar.

**Location**: `src/components/layout/Layout.tsx`

**Props**:
```typescript
interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarVariant?: 'permanent' | 'persistent' | 'temporary';
}
```

**Usage**:
```tsx
<Layout showSidebar={true} sidebarVariant="persistent">
  <Dashboard />
</Layout>
```

**Features**:
- Responsive design
- Collapsible sidebar
- Breadcrumb navigation
- Theme switching
- User menu

### Navigation
Primary navigation component with role-based menu items.

**Location**: `src/components/layout/Navigation.tsx`

**Props**:
```typescript
interface NavigationProps {
  collapsed?: boolean;
  onToggle?: () => void;
  items?: NavigationItem[];
}
```

**Features**:
- Dynamic menu generation based on user roles
- Active route highlighting
- Nested menu support
- Icon integration
- Search functionality

## 📋 Requirements Components

### RequirementsList
Paginated list of requirements with filtering and sorting.

**Location**: `src/components/requirements/RequirementsList.tsx`

**Props**:
```typescript
interface RequirementsListProps {
  requirements: Requirement[];
  loading?: boolean;
  onSelect?: (requirement: Requirement) => void;
  onEdit?: (requirement: Requirement) => void;
  onDelete?: (id: string) => void;
  filters?: RequirementFilters;
  sortBy?: RequirementSortField;
  sortOrder?: 'asc' | 'desc';
}
```

**Usage**:
```tsx
<RequirementsList
  requirements={requirements}
  loading={loading}
  onSelect={handleSelect}
  onEdit={handleEdit}
  filters={{ status: 'active', priority: 'high' }}
  sortBy="createdAt"
  sortOrder="desc"
/>
```

**Features**:
- Virtual scrolling for performance
- Bulk operations
- Drag and drop reordering
- Export functionality
- Advanced filtering

### RequirementForm
Form for creating and editing requirements.

**Location**: `src/components/requirements/RequirementForm.tsx`

**Props**:
```typescript
interface RequirementFormProps {
  requirement?: Requirement;
  onSave: (requirement: Requirement) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
  template?: RequirementTemplate;
}
```

**Features**:
- Rich text editor with markdown support
- Template selection
- Attachment upload
- Auto-save functionality
- Validation with real-time feedback

### RequirementDetail
Detailed view of a single requirement with editing capabilities.

**Location**: `src/components/requirements/RequirementDetail.tsx`

**Features**:
- Full requirement information display
- Inline editing
- Comment system
- Version history
- Related requirements
- Export options

### RequirementsSimilarity
AI-powered similarity detection for requirements.

**Location**: `src/components/requirements/RequirementsSimilarity.tsx`

**Props**:
```typescript
interface RequirementsSimilarityProps {
  requirement: Requirement;
  similarityThreshold?: number;
  onSimilarityFound?: (similar: Requirement[]) => void;
}
```

**Features**:
- ML-based similarity detection
- Confidence scoring
- Batch processing
- Visual similarity indicators

### RequirementsGraph
Graph visualization of requirement relationships.

**Location**: `src/components/requirements/RequirementsGraph.tsx`

**Features**:
- Interactive node-link diagrams
- Relationship type visualization
- Zoom and pan controls
- Node clustering
- Export as image/SVG

## 🏛️ Architecture Components

### ArchitectureCanvas
Interactive canvas for system architecture design.

**Location**: `src/components/architecture/ArchitectureCanvas.tsx`

**Props**:
```typescript
interface ArchitectureCanvasProps {
  architecture: ArchitectureModel;
  onSave: (architecture: ArchitectureModel) => void;
  readOnly?: boolean;
  templates?: ArchitectureTemplate[];
}
```

**Features**:
- Drag and drop component placement
- Connection line drawing
- Component library
- Layer management
- Grid snapping
- Undo/redo functionality

### PatternLibrary
Reusable architecture pattern catalog.

**Location**: `src/components/architecture/PatternLibrary.tsx`

**Features**:
- Pattern categorization
- Search and filtering
- Pattern preview
- Usage examples
- Custom pattern creation

### TechnologyStack
Technology selection and visualization component.

**Location**: `src/components/architecture/TechnologyStack.tsx`

**Props**:
```typescript
interface TechnologyStackProps {
  stack: TechnologyStack;
  onUpdate: (stack: TechnologyStack) => void;
  recommendations?: Technology[];
}
```

**Features**:
- Technology recommendation engine
- Compatibility checking
- Cost analysis
- Performance impact assessment

### CloudOptimizer
Cloud deployment optimization recommendations.

**Location**: `src/components/architecture/CloudOptimizer.tsx`

**Features**:
- Multi-cloud support (AWS, Azure, GCP)
- Cost optimization suggestions
- Performance analysis
- Security recommendations
- Migration planning

### DecisionRecords
Architectural decision record (ADR) management.

**Location**: `src/components/architecture/DecisionRecords.tsx`

**Features**:
- ADR template creation
- Decision timeline
- Impact tracking
- Stakeholder approval workflow

## 🔧 Development Components

### CodeGenerator
AI-powered code generation interface.

**Location**: `src/components/development/CodeGenerator.tsx`

**Props**:
```typescript
interface CodeGeneratorProps {
  requirements: Requirement[];
  architecture: ArchitectureModel;
  onGenerate: (code: GeneratedCode) => void;
  targetLanguage?: string;
  framework?: string;
}
```

**Features**:
- Multi-language support
- Framework-specific templates
- Code preview and editing
- Quality analysis
- Export options

### TestGenerator
Automated test generation from requirements.

**Location**: `src/components/development/TestGenerator.tsx`

**Features**:
- Unit test generation
- Integration test templates
- Coverage analysis
- Test data generation
- Mock creation

### CodeAnalyzer
Static code analysis and quality metrics.

**Location**: `src/components/development/CodeAnalyzer.tsx`

**Props**:
```typescript
interface CodeAnalyzerProps {
  code: string;
  language: string;
  onAnalysis: (analysis: CodeAnalysis) => void;
  rules?: AnalysisRule[];
}
```

**Features**:
- Syntax validation
- Code complexity metrics
- Security vulnerability detection
- Performance recommendations
- Code formatting

### DevOpsPanel
DevOps pipeline configuration and monitoring.

**Location**: `src/components/development/DevOpsPanel.tsx`

**Features**:
- Pipeline visualization
- Deployment history
- Environment management
- Resource monitoring
- Automated scaling configuration

### ProductionFeedback
Production environment feedback and monitoring.

**Location**: `src/components/development/ProductionFeedback.tsx`

**Features**:
- Real-time error monitoring
- Performance metrics
- User feedback collection
- A/B testing results
- Feature flag management

## 📊 Graph Visualization Components

### GraphVisualization
Main graph rendering component with multiple layout options.

**Location**: `src/components/graph/GraphVisualization.tsx`

**Props**:
```typescript
interface GraphVisualizationProps {
  data: GraphData;
  layout?: GraphLayout;
  interactionMode?: InteractionMode;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  filters?: GraphFilters;
  dimensions?: '2d' | '3d';
}
```

**Features**:
- Multiple layout algorithms (force-directed, hierarchical, circular)
- 2D and 3D visualization modes
- Interactive node/edge manipulation
- Real-time data updates
- Export capabilities
- Performance optimization for large graphs

### GraphControls
Control panel for graph visualization settings.

**Location**: `src/components/graph/GraphControls.tsx`

**Features**:
- Layout selection
- Visual property controls
- Filter configuration
- Animation controls
- View presets

### GraphLegend
Visual legend for graph elements.

**Location**: `src/components/graph/GraphLegend.tsx`

**Features**:
- Node type indicators
- Edge type indicators
- Color coding explanation
- Size scaling information
- Interactive legend items

### GraphSearch
Search and filter functionality for graph elements.

**Location**: `src/components/graph/GraphSearch.tsx`

**Props**:
```typescript
interface GraphSearchProps {
  onSearch: (query: string) => void;
  onFilter: (filters: GraphFilters) => void;
  suggestions?: SearchSuggestion[];
}
```

**Features**:
- Full-text search
- Fuzzy matching
- Advanced filters
- Search history
- Saved searches

### GraphDetails
Detailed information panel for selected graph elements.

**Location**: `src/components/graph/GraphDetails.tsx`

**Features**:
- Node/edge properties display
- Relationship exploration
- Data editing capabilities
- Related elements
- Action buttons

## 📈 Analytics Components

### MetricsOverview
High-level metrics dashboard.

**Location**: `src/components/analytics/MetricsOverview.tsx`

**Props**:
```typescript
interface MetricsOverviewProps {
  metrics: Metric[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  refreshInterval?: number;
}
```

**Features**:
- Real-time data updates
- Multiple visualization types (charts, gauges, KPI cards)
- Comparative analysis
- Drill-down capabilities
- Export functionality

### RequirementsAnalytics
Analytics specific to requirements management.

**Location**: `src/components/analytics/RequirementsAnalytics.tsx`

**Features**:
- Requirements velocity tracking
- Completion rates
- Quality metrics
- Change impact analysis
- Trend visualization

### DevelopmentMetrics
Development process analytics and insights.

**Location**: `src/components/analytics/DevelopmentMetrics.tsx`

**Features**:
- Code quality trends
- Development velocity
- Bug tracking
- Technical debt metrics
- Team performance

### SystemHealth
System health monitoring and alerts.

**Location**: `src/components/analytics/SystemHealth.tsx`

**Features**:
- Real-time health status
- Performance monitoring
- Alert management
- Resource utilization
- Predictive analytics

## 🤝 Collaboration Components

### CollaborationPanel
Main collaboration interface with user presence.

**Location**: `src/components/collaboration/CollaborationPanel.tsx`

**Props**:
```typescript
interface CollaborationPanelProps {
  documentId: string;
  users: CollaborationUser[];
  permissions: CollaborationPermissions;
  onUserJoin?: (user: CollaborationUser) => void;
  onUserLeave?: (userId: string) => void;
}
```

**Features**:
- Real-time user presence
- Permission management
- Activity history
- Chat integration
- Screen sharing

### CollaborativeEditor
Multi-user text editor with operational transforms.

**Location**: `src/components/collaboration/CollaborativeEditor.tsx`

**Features**:
- Real-time collaborative editing
- Conflict resolution
- User cursor tracking
- Change history
- Comment threading
- Syntax highlighting

### CursorTracking
Real-time cursor position tracking for collaborators.

**Location**: `src/components/collaboration/CursorTracking.tsx`

**Features**:
- User cursor visualization
- Color coding per user
- Smooth cursor animations
- Click indicators
- Selection highlighting

### LiveComments
Real-time commenting system with threading.

**Location**: `src/components/collaboration/LiveComments.tsx`

**Props**:
```typescript
interface LiveCommentsProps {
  documentId: string;
  comments: Comment[];
  onCommentAdd: (comment: NewComment) => void;
  onCommentReply: (commentId: string, reply: string) => void;
  onCommentResolve: (commentId: string) => void;
}
```

**Features**:
- Threaded discussions
- Mention system (@username)
- Rich text comments
- Comment resolution
- Notification integration

## 🔔 Notification Components

### NotificationCenter
Centralized notification management interface.

**Location**: `src/components/notifications/NotificationCenter.tsx`

**Props**:
```typescript
interface NotificationCenterProps {
  notifications: Notification[];
  onRead: (notificationId: string) => void;
  onReadAll: () => void;
  onDelete: (notificationId: string) => void;
  maxVisible?: number;
}
```

**Features**:
- Notification categorization
- Read/unread status
- Bulk actions
- Search and filtering
- Real-time updates

### NotificationItem
Individual notification display component.

**Location**: `src/components/notifications/NotificationItem.tsx`

**Props**:
```typescript
interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}
```

**Features**:
- Rich notification content
- Action buttons
- Timestamp display
- Priority indicators
- Custom styling

### NotificationSettings
User notification preferences configuration.

**Location**: `src/components/notifications/NotificationSettings.tsx`

**Features**:
- Channel preferences (email, push, in-app)
- Category subscriptions
- Quiet hours configuration
- Delivery frequency settings
- Test notification functionality

## ⚙️ Settings Components

### ProfileSettings
User profile management interface.

**Location**: `src/components/settings/ProfileSettings.tsx`

**Props**:
```typescript
interface ProfileSettingsProps {
  user: User;
  onUpdate: (updates: Partial<User>) => Promise<void>;
  onAvatarChange: (file: File) => Promise<string>;
}
```

**Features**:
- Profile information editing
- Avatar upload and cropping
- Password change
- Account linking (social accounts)
- Data export

### PreferencesPanel
Application preferences and customization.

**Location**: `src/components/settings/PreferencesPanel.tsx`

**Features**:
- Theme selection
- Language preferences
- Display settings
- Keyboard shortcuts
- Default values configuration

### SecuritySettings
Security and privacy settings management.

**Location**: `src/components/settings/SecuritySettings.tsx`

**Features**:
- Two-factor authentication setup
- Active sessions management
- API key management
- Privacy controls
- Security audit log

## 🎯 Component Usage Patterns

### Common Props Pattern
Most components follow these common patterns:

```typescript
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  disabled?: boolean;
  error?: string | Error;
  onError?: (error: Error) => void;
}
```

### Theme Integration
All components support theme customization:

```tsx
// Theme-aware component
const StyledComponent = styled(Component)(({ theme }) => ({
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.background.paper,
}));
```

### Accessibility Support
Components include accessibility features:

```tsx
// ARIA attributes
<Component
  role="button"
  aria-label="Close notification"
  aria-describedby="help-text"
  tabIndex={0}
  onKeyDown={handleKeyDown}
/>
```

### Error Boundaries
Critical components are wrapped with error boundaries:

```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <CriticalComponent />
</ErrorBoundary>
```

## 🧪 Testing Components

### Unit Testing Example
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  test('validates required fields', () => {
    render(<LoginForm />);
    
    fireEvent.click(screen.getByText('Sign In'));
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });
});
```

### Integration Testing
```tsx
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { RequirementsList } from '../RequirementsList';

const mocks = [
  {
    request: {
      query: GET_REQUIREMENTS,
    },
    result: {
      data: {
        requirements: mockRequirements,
      },
    },
  },
];

test('loads and displays requirements', async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <RequirementsList />
    </MockedProvider>
  );

  expect(await screen.findByText('Requirement 1')).toBeInTheDocument();
});
```

## 📱 Responsive Design

All components are designed to be responsive and work across device sizes:

```tsx
// Responsive breakpoints
const useResponsive = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  return { isMobile, isTablet, isDesktop };
};
```

## 🚀 Performance Optimization

### Lazy Loading
```tsx
// Component lazy loading
const LazyComponent = React.lazy(() => import('./ExpensiveComponent'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</Suspense>
```

### Memoization
```tsx
// Expensive computations
const expensiveValue = useMemo(() => 
  computeExpensiveValue(data), [data]
);

// Component memoization
const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => 
  prevProps.id === nextProps.id
);
```

### Virtual Scrolling
```tsx
// Large list handling
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={60}
  itemData={items}
>
  {Row}
</FixedSizeList>
```

This component documentation provides comprehensive information for using, customizing, and extending the LANKA UI components. Each component is designed to be reusable, accessible, and performant while maintaining consistency across the application.