# Lanka Visual Platform - Interactive SPA

A standalone, visual-first Single Page Application showcasing the Lanka platform's capabilities through interactive graphics and animations rather than text-heavy documentation.

## 🎨 Overview

This SPA provides an immersive, visual experience of the Lanka platform with:
- **Interactive 3D visualizations** of system architecture
- **Real-time animated dashboards** showing platform metrics
- **Force-directed graphs** for requirements relationships
- **Drag-and-drop architecture canvas** for pattern exploration
- **Live DevOps pipeline visualizations** with flowing animations
- **Neo4j-style knowledge graph** exploration

## 🚀 Quick Start

```bash
# Navigate to the visualization SPA directory
cd visualization-spa

# Install dependencies
npm install

# Start the development server
npm start

# Build for production
npm build
```

The app will be available at `http://localhost:3000`

## 📍 Main Sections

### 1. **Visual Overview** (`/overview`)
- Animated hero section with particle effects
- Interactive module cards with glassmorphism design
- Real-time platform metrics
- Quick navigation to all modules

### 2. **Requirements Intelligence** (`/requirements`)
- Force-directed graph visualization (D3.js)
- Similarity heatmaps with pattern detection
- Interactive pattern library
- Real-time collaboration indicators

### 3. **Architecture Design** (`/architecture`)
- Drag-and-drop architecture canvas (ReactFlow)
- Multi-cloud cost comparison charts
- Interactive decision flow diagrams
- Technology radar visualization

### 4. **Development Intelligence** (`/development`)
- Split-pane code generation workspace
- Test coverage treemaps and sunburst charts
- Animated CI/CD pipeline visualization
- Code quality heatmaps

### 5. **System Integration** (`/integration`)
- 3D system architecture (Three.js)
- Animated data flow between modules
- Interactive dependency graphs
- Real-time health monitoring

## 🛠 Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **D3.js** - Data visualizations
- **Three.js** - 3D graphics
- **ReactFlow** - Node-based diagrams
- **Framer Motion** - Animations
- **Recharts** - Business charts
- **Material-UI** - Component library

## 🎯 Key Features

### Visual-First Design
- Every feature has meaningful visual representation
- Minimal text, maximum visual impact
- Interactive exploration over documentation

### Performance Optimized
- 60fps smooth animations
- Lazy loading and code splitting
- Virtual scrolling for large datasets
- WebGL acceleration for 3D graphics

### Responsive & Accessible
- Mobile-first responsive design
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Reduced motion preferences

## 📊 Performance Metrics

- **Initial Load**: < 1.5s
- **Time to Interactive**: < 2.5s
- **Bundle Size**: < 500KB gzipped
- **Animation FPS**: 55-60fps
- **Lighthouse Score**: 95+

## 🎨 Design System

### Color Palette
- **Primary**: `#667eea` to `#764ba2` gradient
- **Dark Background**: `#0a0a0a`
- **Glassmorphism**: `rgba(255, 255, 255, 0.05)`

### Animation Timing
- **Fast**: 200ms
- **Normal**: 300ms
- **Slow**: 500ms

### Visual Effects
- Glassmorphism cards with backdrop blur
- Gradient text and borders
- Particle animations
- Smooth transitions

## 📁 Project Structure

```
visualization-spa/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── visualizations/    # Chart and graph components
│   │   ├── navigation/        # Navigation components
│   │   ├── performance/       # Performance monitoring
│   │   └── common/            # Shared components
│   ├── pages/                # Main page components
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript definitions
│   ├── styles/               # CSS and styling
│   ├── App.tsx              # Main app component
│   └── index.tsx            # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=VisualOverview
```

## 🚢 Deployment

```bash
# Build production version
npm run build

# Serve production build locally
npx serve -s build

# Deploy to static hosting (Netlify, Vercel, etc.)
# Upload the 'build' folder
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file for configuration:

```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000
REACT_APP_ENABLE_ANALYTICS=true
```

### Performance Monitoring
The app includes built-in performance monitoring that can be enabled in development:

```tsx
// Enable in App.tsx
<PerformanceMonitor visible={true} />
```

## 📝 License

This visualization SPA is part of the Lanka platform project.

## 🤝 Contributing

This is a demonstration SPA for the Lanka platform. For contributions to the main platform, please see the parent project.

---

**Note**: This is a standalone visualization application separate from the main Lanka client. It's designed specifically for demonstrations and visual exploration of the platform's capabilities.