# LANKA UI - Requirements Intelligence Platform

A comprehensive React-based user interface for the LANKA (Learning and Knowledge Network Architecture) platform, providing intelligent requirements management, architecture visualization, and development analytics.

## 🚀 Features

### Core Functionality
- **Requirements Management**: Intelligent requirement capture, analysis, and tracking
- **Architecture Visualization**: Interactive system architecture design and visualization
- **Development Intelligence**: Code generation, analysis, and testing tools
- **Real-time Collaboration**: Multi-user collaborative editing and commenting
- **Analytics Dashboard**: Comprehensive metrics and performance insights
- **Graph Explorer**: Advanced relationship visualization and analysis

### Technology Stack
- **Frontend**: React 19.1.1 with TypeScript
- **UI Framework**: Material-UI (MUI) 7.3.1
- **State Management**: Apollo Client with GraphQL
- **Visualization**: ReactFlow, D3.js, Three.js
- **Real-time**: Socket.IO client
- **Authentication**: JWT-based with role-based access control
- **Testing**: Jest, React Testing Library

## 📋 Prerequisites

- Node.js 18+ 
- npm 8+ or yarn 1.22+
- Docker (for containerized deployment)
- Modern browser with ES2020 support

## 🛠️ Installation

### Local Development

1. **Clone and navigate to the client directory**
   ```bash
   git clone <repository-url>
   cd lanka/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

### Docker Development

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up --build
   ```

2. **Manual Docker Build**
   ```bash
   npm run docker:build
   npm run docker:run
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── analytics/      # Analytics and metrics components
│   ├── architecture/   # Architecture design components
│   ├── auth/          # Authentication components
│   ├── collaboration/ # Real-time collaboration features
│   ├── development/   # Development tools components
│   ├── graph/         # Graph visualization components
│   ├── layout/        # Layout and navigation components
│   ├── notifications/ # Notification system
│   ├── requirements/  # Requirements management components
│   └── settings/      # User and system settings
├── context/           # React context providers
├── hooks/             # Custom React hooks
├── pages/             # Main application pages
├── services/          # API and external service integrations
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and helpers
└── styles/            # Global styles and themes
```

## 🔧 Configuration

### Environment Variables

#### Development (.env.local)
```bash
REACT_APP_API_URL=http://localhost:4000
REACT_APP_GRAPHQL_URL=http://localhost:4000/graphql
REACT_APP_WEBSOCKET_URL=ws://localhost:4000
REACT_APP_ENVIRONMENT=development
REACT_APP_ENABLE_DEBUG_MODE=true
```

#### Production (.env.production)
```bash
REACT_APP_API_URL=https://api.lanka.com
REACT_APP_GRAPHQL_URL=https://api.lanka.com/graphql
REACT_APP_WEBSOCKET_URL=wss://api.lanka.com
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_DEBUG_MODE=false
```

### Feature Flags
- `REACT_APP_ENABLE_ANALYTICS`: Enable analytics features
- `REACT_APP_ENABLE_COLLABORATION`: Enable real-time collaboration
- `REACT_APP_ENABLE_DEVELOPMENT_TOOLS`: Enable development tools
- `REACT_APP_ENABLE_3D_GRAPH`: Enable 3D graph visualization

## 🧪 Testing

### Running Tests
```bash
# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Structure
- Unit tests: `*.test.tsx` files alongside components
- Integration tests: `src/__tests__/` directory
- E2E tests: `cypress/` directory (if configured)

## 🚀 Deployment

### Staging Deployment
```bash
npm run deploy:staging
```

### Production Deployment
```bash
npm run deploy:production
```

### Manual Deployment Steps
1. Build the application: `npm run build:production`
2. Build Docker image: `npm run docker:build`
3. Deploy using your preferred method (Docker, Kubernetes, etc.)

## 🏛️ Architecture

### Component Architecture
```
App
├── Providers (Theme, Auth, Notifications, Collaboration)
├── Router (Authentication & Route Guards)
├── Layout (Navigation, Sidebar, Header)
└── Pages
    ├── Dashboard
    ├── Requirements Management
    ├── Architecture Designer
    ├── Development Tools
    ├── Analytics
    └── Settings
```

### State Management
- **Apollo Client**: GraphQL queries and mutations
- **React Context**: User authentication, theme, notifications
- **Local State**: Component-specific state with useState/useReducer

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Route guards for protected resources
- Session management with automatic refresh

## 🔗 API Integration

### GraphQL Endpoints
- `/graphql` - Main GraphQL API
- Queries: Requirements, Architecture, Analytics data
- Mutations: CRUD operations, real-time updates
- Subscriptions: Live updates, collaboration events

### REST Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/upload/*` - File upload endpoints
- `/api/export/*` - Data export endpoints

### WebSocket Events
- Real-time collaboration
- Notification delivery
- System status updates
- Live analytics data

## 🎨 UI/UX Guidelines

### Design System
- Material Design 3.0 principles
- Consistent color palette and typography
- Responsive breakpoints: mobile (360px), tablet (768px), desktop (1024px+)
- Accessibility compliance (WCAG 2.1 AA)

### Component Standards
- Reusable components with proper prop interfaces
- Consistent naming conventions
- Comprehensive error boundaries
- Loading states and skeleton screens

## 📊 Performance

### Optimization Strategies
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Bundle analysis and tree shaking
- Service worker for caching (production)
- Memoization for expensive operations

### Performance Monitoring
- Web Vitals tracking
- Error boundary reporting
- Performance metrics collection
- Bundle size monitoring

## 🛡️ Security

### Security Measures
- Content Security Policy (CSP)
- XSS protection headers
- CSRF protection
- Secure authentication tokens
- Input validation and sanitization

### Best Practices
- No sensitive data in client code
- Secure API communication (HTTPS)
- Regular dependency updates
- Security audits with npm audit

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Port Conflicts**
   ```bash
   # Use different port
   PORT=3001 npm start
   ```

3. **Docker Issues**
   ```bash
   # Rebuild without cache
   docker-compose build --no-cache
   ```

### Debug Mode
Enable debug mode in development:
```bash
REACT_APP_ENABLE_DEBUG_MODE=true npm start
```

## 📚 Additional Resources

- [Component Documentation](./UI_COMPONENTS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](../docs/api/)
- [Architecture Guide](../docs/architecture.md)

## 🤝 Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation
4. Submit pull requests with clear descriptions

## 📄 License

This project is part of the LANKA platform - see the main project license for details.