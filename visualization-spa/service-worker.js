/**
 * Service Worker for Lanka Visual SPA
 * Provides advanced caching strategies for performance optimization
 */

const CACHE_NAME = 'lanka-spa-v1.2.0';
const STATIC_CACHE = 'lanka-static-v1.2.0';
const DYNAMIC_CACHE = 'lanka-dynamic-v1.2.0';
const IMAGE_CACHE = 'lanka-images-v1.2.0';
const API_CACHE = 'lanka-api-v1.2.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Cache strategies by request type
const CACHE_STRATEGIES = {
  // Static assets: Cache first
  static: ['js', 'css', 'woff', 'woff2', 'ttf', 'eot'],
  
  // Images: Cache first with fallback
  images: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'],
  
  // API calls: Network first with cache fallback
  api: ['/api/', '/graphql'],
  
  // Pages: Network first
  pages: ['/', '/dashboard', '/requirements', '/architecture', '/development']
};

// Cache size limits
const CACHE_LIMITS = {
  [STATIC_CACHE]: 50,
  [DYNAMIC_CACHE]: 100,
  [IMAGE_CACHE]: 200,
  [API_CACHE]: 50
};

// ============================================================================
// INSTALLATION
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// ============================================================================
// ACTIVATION
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// ============================================================================
// FETCH HANDLING
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const extension = getFileExtension(pathname);
  
  try {
    // Determine cache strategy based on request type
    if (CACHE_STRATEGIES.static.includes(extension)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    if (CACHE_STRATEGIES.images.includes(extension)) {
      return await cacheFirst(request, IMAGE_CACHE);
    }
    
    if (CACHE_STRATEGIES.api.some(pattern => pathname.includes(pattern))) {
      return await networkFirst(request, API_CACHE);
    }
    
    if (isPageRequest(request)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }
    
    // Default: Network first for everything else
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Fetch error:', error);
    return handleFallback(request);
  }
}

// Cache first strategy (for static assets)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    // Optionally update cache in background for next time
    updateCacheInBackground(request, cacheName);
    return cachedResponse;
  }
  
  // Not in cache, fetch and cache
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const responseClone = networkResponse.clone();
    await cache.put(request, responseClone);
    await limitCacheSize(cacheName, CACHE_LIMITS[cacheName]);
  }
  
  return networkResponse;
}

// Network first strategy (for dynamic content)
async function networkFirst(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update cache with fresh response
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await limitCacheSize(cacheName, CACHE_LIMITS[cacheName]);
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Both network and cache failed
    throw error;
  }
}

// Background cache update (for cache-first strategy)
async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      await limitCacheSize(cacheName, CACHE_LIMITS[cacheName]);
    }
  } catch (error) {
    // Silently fail background updates
    console.warn('Background cache update failed:', error);
  }
}

// Fallback handling for failed requests
async function handleFallback(request) {
  const url = new URL(request.url);
  
  // Fallback for images
  if (CACHE_STRATEGIES.images.includes(getFileExtension(url.pathname))) {
    const fallbackImageCache = await caches.open(IMAGE_CACHE);
    return fallbackImageCache.match('/favicon.ico');
  }
  
  // Fallback for pages
  if (isPageRequest(request)) {
    const fallbackPageCache = await caches.open(DYNAMIC_CACHE);
    return fallbackPageCache.match('/') || 
           fallbackPageCache.match('/dashboard') ||
           new Response('Offline', { status: 503 });
  }
  
  // Generic fallback
  return new Response('Service Unavailable', { 
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getFileExtension(pathname) {
  const lastDot = pathname.lastIndexOf('.');
  return lastDot > 0 ? pathname.substr(lastDot + 1).toLowerCase() : '';
}

function isPageRequest(request) {
  const url = new URL(request.url);
  const extension = getFileExtension(url.pathname);
  
  return request.headers.get('accept')?.includes('text/html') ||
         (!extension && url.pathname.endsWith('/')) ||
         CACHE_STRATEGIES.pages.some(page => url.pathname === page);
}

// Clean up old cache versions
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];
  
  await Promise.all(
    cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      })
  );
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Remove oldest entries (FIFO)
    const itemsToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(itemsToDelete.map(key => cache.delete(key)));
    
    console.log(`Trimmed ${itemsToDelete.length} items from ${cacheName}`);
  }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
        break;
        
      case 'CACHE_SIZE':
        getCacheInfo().then((info) => {
          event.ports[0]?.postMessage(info);
        });
        break;
        
      case 'PRELOAD_ROUTES':
        preloadRoutes(event.data.routes).then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
        break;
        
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('All caches cleared');
}

// Get cache information
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    info[name] = {
      size: keys.length,
      entries: keys.map(key => ({
        url: key.url,
        method: key.method
      }))
    };
  }
  
  return info;
}

// Preload specific routes
async function preloadRoutes(routes) {
  if (!routes || !Array.isArray(routes)) return;
  
  const cache = await caches.open(DYNAMIC_CACHE);
  
  await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
        }
      } catch (error) {
        console.warn(`Failed to preload route ${route}:`, error);
      }
    })
  );
  
  console.log(`Preloaded ${routes.length} routes`);
}

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Batch cache operations for better performance
const batchOperations = {
  queue: [],
  timeout: null,
  
  add(operation) {
    this.queue.push(operation);
    
    if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.flush();
      }, 100); // Batch operations for 100ms
    }
  },
  
  async flush() {
    const operations = this.queue.splice(0);
    this.timeout = null;
    
    if (operations.length > 0) {
      try {
        await Promise.all(operations.map(op => op()));
      } catch (error) {
        console.error('Batch operations failed:', error);
      }
    }
  }
};

// Intelligent prefetching based on user behavior
let navigationHistory = [];
const MAX_HISTORY = 10;

self.addEventListener('fetch', (event) => {
  if (isPageRequest(event.request)) {
    const url = new URL(event.request.url).pathname;
    
    // Track navigation patterns
    navigationHistory.push({
      url,
      timestamp: Date.now()
    });
    
    // Keep history manageable
    if (navigationHistory.length > MAX_HISTORY) {
      navigationHistory = navigationHistory.slice(-MAX_HISTORY);
    }
    
    // Predict and preload next likely pages
    predictAndPreload();
  }
});

function predictAndPreload() {
  // Simple prediction: if user visited A then B multiple times, 
  // preload B when they visit A
  if (navigationHistory.length < 2) return;
  
  const current = navigationHistory[navigationHistory.length - 1];
  const previous = navigationHistory[navigationHistory.length - 2];
  
  // Find patterns in history
  const patterns = findNavigationPatterns();
  const predictions = patterns[current.url] || [];
  
  // Preload predicted pages (limit to 2 to avoid overwhelming)
  predictions.slice(0, 2).forEach((prediction) => {
    batchOperations.add(async () => {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(prediction);
        
        if (!cached) {
          const response = await fetch(prediction);
          if (response.ok) {
            await cache.put(prediction, response);
          }
        }
      } catch (error) {
        // Silently fail prefetch attempts
      }
    });
  });
}

function findNavigationPatterns() {
  const patterns = {};
  
  for (let i = 0; i < navigationHistory.length - 1; i++) {
    const from = navigationHistory[i].url;
    const to = navigationHistory[i + 1].url;
    
    if (!patterns[from]) {
      patterns[from] = [];
    }
    
    if (!patterns[from].includes(to)) {
      patterns[from].push(to);
    }
  }
  
  return patterns;
}

console.log('Lanka SPA Service Worker loaded successfully');