/**
 * Webpack Optimization Configuration for Lanka Visual SPA
 * Advanced bundle splitting and optimization strategies
 */

const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  // Bundle splitting optimization
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },

        // React ecosystem
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true
        },

        // Material-UI
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true
        },

        // D3.js ecosystem
        d3: {
          test: /[\\/]node_modules[\\/](d3|d3-.*|react-force-graph.*)[\\/]/,
          name: 'visualization-d3',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },

        // Three.js ecosystem
        three: {
          test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
          name: 'visualization-3d',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },

        // Animation libraries
        animation: {
          test: /[\\/]node_modules[\\/](framer-motion|lottie-.*|gsap)[\\/]/,
          name: 'animation',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },

        // GraphQL and Apollo
        graphql: {
          test: /[\\/]node_modules[\\/](@apollo|graphql|@graphql-tools)[\\/]/,
          name: 'graphql',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },

        // Utility libraries
        utils: {
          test: /[\\/]node_modules[\\/](lodash|date-fns|uuid|axios)[\\/]/,
          name: 'utils',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },

        // Common components
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        },

        // Visualization components (lazy loaded)
        visualizations: {
          test: /[\\/]src[\\/]components[\\/]visualizations[\\/]/,
          name: 'visualizations',
          chunks: 'async',
          priority: 20,
          reuseExistingChunk: true,
          enforce: true
        },

        // Page components (lazy loaded)
        pages: {
          test: /[\\/]src[\\/]pages[\\/]/,
          name: (module, chunks) => {
            // Extract page name for chunk naming
            const pageMatch = module.resource.match(/[\\/]pages[\\/]([^[\\/]]+)/);
            return pageMatch ? `page-${pageMatch[1].toLowerCase()}` : 'pages';
          },
          chunks: 'async',
          priority: 15,
          reuseExistingChunk: true,
          minSize: 0
        }
      }
    },

    // Runtime chunk optimization
    runtimeChunk: {
      name: 'runtime'
    },

    // Tree shaking optimization
    usedExports: true,
    sideEffects: false,

    // Module concatenation (scope hoisting)
    concatenateModules: true,

    // Minimize configuration
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      // Already handled by Create React App
    ]
  },

  // Module resolution optimizations
  resolve: {
    // Reduce resolve time
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    
    // Alias for better tree shaking
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@types': path.resolve(__dirname, 'src/types'),
      
      // Tree-shakable imports
      'lodash': 'lodash-es',
      
      // Smaller bundles
      'date-fns': 'date-fns/esm',
      
      // Optimize MUI imports
      '@mui/material': '@mui/material/esm',
      '@mui/icons-material': '@mui/icons-material/esm'
    },

    // Prefer ES modules for better tree shaking
    mainFields: ['browser', 'module', 'main'],
    
    // Reduce filesystem calls
    symlinks: false
  },

  // Performance hints
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 500000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    assetFilter: function(assetFilename) {
      // Only check JS and CSS files
      return /\.(js|css)$/.test(assetFilename);
    }
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    devtool: 'eval-cheap-module-source-map',
    
    optimization: {
      ...module.exports.optimization,
      minimize: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false
    }
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    plugins: [
      // Bundle analyzer (optional, enable when needed)
      ...(process.env.ANALYZE_BUNDLE ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html'
        })
      ] : []),

      // Gzip compression
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 10240,
        minRatio: 0.8
      }),

      // Brotli compression (better than gzip)
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: { level: 11 },
        threshold: 10240,
        minRatio: 0.8
      })
    ]
  }),

  // Module rules for optimization
  module: {
    rules: [
      // Optimize images
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192 // 8kb
          }
        },
        generator: {
          filename: 'assets/images/[name].[hash:8][ext]'
        }
      },

      // Optimize fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]'
        }
      },

      // Optimize CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: false
            }
          },
          'postcss-loader'
        ]
      }
    ]
  },

  // Cache optimization
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
    buildDependencies: {
      config: [__filename]
    }
  },

  // Webpack stats for better debugging
  stats: {
    // Add chunk information
    chunks: true,
    chunkModules: true,
    chunkOrigins: true,
    
    // Add timing information
    timings: true,
    
    // Add performance hints
    performance: true,
    
    // Reduce noise in development
    ...(process.env.NODE_ENV === 'development' && {
      assets: false,
      children: false,
      chunks: false,
      hash: false,
      modules: false,
      publicPath: false,
      timings: false,
      version: false,
      warnings: true,
      colors: true
    })
  }
};

// Helper function to get chunk size info
function getChunkSizeInfo() {
  return {
    'React Ecosystem': '~150KB',
    'Material-UI': '~300KB',
    'D3.js Visualizations': '~200KB',
    'Three.js 3D': '~400KB',
    'Animation Libraries': '~100KB',
    'GraphQL/Apollo': '~150KB',
    'Utility Libraries': '~80KB',
    'Application Code': '~200KB'
  };
}

// Export optimization metrics
module.exports.getOptimizationMetrics = () => ({
  bundleSplitting: 'Advanced chunk splitting by library and feature',
  compression: 'Gzip + Brotli compression enabled',
  treeShaking: 'Full ES6 tree shaking with sideEffects: false',
  caching: 'Filesystem caching with build dependencies',
  assetOptimization: 'Optimized images, fonts, and CSS',
  lazyLoading: 'Route-based and component-based code splitting',
  chunkSizes: getChunkSizeInfo()
});