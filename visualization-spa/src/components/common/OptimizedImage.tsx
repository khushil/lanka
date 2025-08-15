/**
 * Optimized Image Component
 * Advanced image loading with lazy loading, WebP support, and responsive sizing
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Box, Skeleton, IconButton, Tooltip } from '@mui/material';
import { BrokenImage, Refresh } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLazyLoad } from '../../utils/performanceOptimization';

// ============================================================================
// IMAGE OPTIMIZATION TYPES
// ============================================================================

interface ImageSource {
  src: string;
  format: 'webp' | 'jpeg' | 'png' | 'svg';
  size: 'small' | 'medium' | 'large' | 'xl';
  density?: '1x' | '2x' | '3x';
}

interface ResponsiveBreakpoints {
  xs?: ImageSource;
  sm?: ImageSource;
  md?: ImageSource;
  lg?: ImageSource;
  xl?: ImageSource;
}

interface OptimizedImageProps {
  // Basic props
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  
  // Responsive sources
  sources?: ResponsiveBreakpoints;
  
  // Optimization options
  lazy?: boolean;
  priority?: 'low' | 'high';
  quality?: number; // 1-100
  format?: 'auto' | 'webp' | 'jpeg' | 'png';
  
  // Loading behavior
  placeholder?: 'blur' | 'skeleton' | 'empty' | React.ReactNode;
  blurDataURL?: string;
  fadeInDuration?: number;
  retryAttempts?: number;
  
  // Styling
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  borderRadius?: number | string;
  
  // Callbacks
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onRetry?: () => void;
  
  // Accessibility
  loading?: 'lazy' | 'eager';
  decoding?: 'auto' | 'sync' | 'async';
  
  // Additional props
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// WEBP SUPPORT DETECTION
// ============================================================================

const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const dataURL = canvas.toDataURL('image/webp');
    resolve(dataURL.indexOf('data:image/webp') === 0);
  });
};

// Cached WebP support result
let webpSupported: boolean | null = null;
const getWebPSupport = async (): Promise<boolean> => {
  if (webpSupported === null) {
    webpSupported = await checkWebPSupport();
  }
  return webpSupported;
};

// ============================================================================
// IMAGE URL OPTIMIZATION
// ============================================================================

const optimizeImageUrl = (
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    density?: string;
  } = {}
): string => {
  const { width, height, quality = 80, format, density = '1x' } = options;
  
  // Check if it's a data URL or external URL
  if (src.startsWith('data:') || src.startsWith('http')) {
    return src;
  }
  
  // Build optimization parameters
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (format && format !== 'auto') params.set('f', format);
  if (density !== '1x') params.set('dpr', density.replace('x', ''));
  
  // Add optimization parameters to URL
  const separator = src.includes('?') ? '&' : '?';
  const optimizedSrc = params.toString() ? `${src}${separator}${params.toString()}` : src;
  
  return optimizedSrc;
};

// ============================================================================
// RESPONSIVE SOURCE GENERATION
// ============================================================================

const generateResponsiveSources = (
  baseSrc: string,
  sources?: ResponsiveBreakpoints,
  supportsWebP: boolean = false
): string => {
  if (!sources) return baseSrc;
  
  const breakpoints = [
    { key: 'xl', minWidth: 1536 },
    { key: 'lg', minWidth: 1200 },
    { key: 'md', minWidth: 900 },
    { key: 'sm', minWidth: 600 },
    { key: 'xs', minWidth: 0 }
  ] as const;
  
  let srcSet = '';
  
  breakpoints.forEach(({ key, minWidth }) => {
    const source = sources[key as keyof ResponsiveBreakpoints];
    if (source) {
      const format = supportsWebP && source.format !== 'svg' ? 'webp' : source.format;
      const optimizedSrc = optimizeImageUrl(source.src, { format });
      
      if (srcSet) srcSet += ', ';
      srcSet += `${optimizedSrc} ${minWidth}w`;
    }
  });
  
  return srcSet || baseSrc;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sources,
  lazy = true,
  priority = 'low',
  quality = 80,
  format = 'auto',
  placeholder = 'skeleton',
  blurDataURL,
  fadeInDuration = 300,
  retryAttempts = 3,
  objectFit = 'cover',
  objectPosition = 'center',
  borderRadius = 0,
  onLoad,
  onError,
  onRetry,
  loading = 'lazy',
  decoding = 'async',
  className,
  style,
  ...props
}) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [actualSrc, setActualSrc] = useState<string>('');
  
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Lazy loading setup
  const { ref: lazyRef, isInView } = useLazyLoad({
    rootMargin: priority === 'high' ? '200px' : '50px',
    threshold: 0.1
  });
  
  // Check WebP support on mount
  React.useEffect(() => {
    getWebPSupport().then(setSupportsWebP);
  }, []);
  
  // Generate optimized source URL
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    const targetFormat = format === 'auto' 
      ? (supportsWebP && !src.endsWith('.svg') ? 'webp' : undefined)
      : format;
    
    return optimizeImageUrl(src, {
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      quality,
      format: targetFormat
    });
  }, [src, width, height, quality, format, supportsWebP]);
  
  // Generate responsive sources
  const responsiveSrcSet = useMemo(() => {
    if (!sources) return '';
    return generateResponsiveSources(src, sources, supportsWebP);
  }, [src, sources, supportsWebP]);
  
  // Update actual source when optimized source changes
  React.useEffect(() => {
    if (optimizedSrc) {
      setActualSrc(optimizedSrc);
    }
  }, [optimizedSrc]);
  
  // Handle image load
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadingState('loaded');
    onLoad?.(event);
  }, [onLoad]);
  
  // Handle image error with retry logic
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    if (retryCount < retryAttempts) {
      setRetryCount(prev => prev + 1);
      // Try fallback to original format if WebP failed
      if (supportsWebP && format === 'auto') {
        const fallbackSrc = optimizeImageUrl(src, {
          width: typeof width === 'number' ? width : undefined,
          height: typeof height === 'number' ? height : undefined,
          quality,
          format: 'jpeg'
        });
        setActualSrc(fallbackSrc);
        return;
      }
    } else {
      setLoadingState('error');
    }
    onError?.(event);
  }, [retryCount, retryAttempts, supportsWebP, format, src, width, height, quality, onError]);
  
  // Handle manual retry
  const handleRetry = useCallback(() => {
    setLoadingState('loading');
    setRetryCount(0);
    setActualSrc(optimizedSrc);
    onRetry?.();
  }, [optimizedSrc, onRetry]);
  
  // Determine if image should load
  const shouldLoad = !lazy || isInView || priority === 'high';
  
  // Loading placeholder component
  const renderPlaceholder = () => {
    if (React.isValidElement(placeholder)) {
      return placeholder;
    }
    
    switch (placeholder) {
      case 'blur':
        return blurDataURL ? (
          <img
            src={blurDataURL}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit,
              objectPosition,
              filter: 'blur(4px)',
              opacity: 0.6
            }}
          />
        ) : (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        );
      
      case 'skeleton':
        return <Skeleton variant="rectangular" width="100%" height="100%" />;
      
      case 'empty':
        return null;
      
      default:
        return <Skeleton variant="rectangular" width="100%" height="100%" />;
    }
  };
  
  // Error state component
  const renderError = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        bgcolor: 'grey.100',
        color: 'grey.500',
        borderRadius: borderRadius
      }}
    >
      <BrokenImage sx={{ fontSize: 32, mb: 1 }} />
      <Box sx={{ fontSize: 12, mb: 1 }}>Failed to load</Box>
      {retryAttempts > 0 && (
        <Tooltip title="Retry loading image">
          <IconButton size="small" onClick={handleRetry}>
            <Refresh />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
  
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius,
    width: width || '100%',
    height: height || 'auto',
    ...style
  };
  
  return (
    <Box ref={lazyRef} className={className} style={containerStyle} {...props}>
      <AnimatePresence mode="wait">
        {loadingState === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%' }}
          >
            {renderError()}
          </motion.div>
        ) : (
          <>
            {/* Loading placeholder */}
            {loadingState === 'loading' && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fadeInDuration / 1000 }}
                style={{ width: '100%', height: '100%' }}
              >
                {renderPlaceholder()}
              </motion.div>
            )}
            
            {/* Actual image */}
            {shouldLoad && (
              <motion.img
                ref={imgRef}
                src={actualSrc}
                srcSet={responsiveSrcSet}
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                alt={alt}
                loading={loading}
                decoding={decoding}
                onLoad={handleLoad}
                onError={handleError}
                initial={{ opacity: 0 }}
                animate={{ opacity: loadingState === 'loaded' ? 1 : 0 }}
                transition={{ duration: fadeInDuration / 1000 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit,
                  objectPosition,
                  borderRadius
                }}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default React.memo(OptimizedImage);

// ============================================================================
// UTILITY FUNCTIONS FOR EXTERNAL USE
// ============================================================================

export { optimizeImageUrl, generateResponsiveSources, checkWebPSupport };

// Example usage:
export const createResponsiveImageSources = (
  basePath: string,
  options: {
    formats?: ('webp' | 'jpeg' | 'png')[];
    sizes?: number[];
    quality?: number;
  } = {}
): ResponsiveBreakpoints => {
  const { formats = ['webp', 'jpeg'], sizes = [400, 800, 1200, 1600, 2000], quality = 80 } = options;
  
  return {
    xs: { src: `${basePath}?w=${sizes[0]}&q=${quality}`, format: 'webp', size: 'small' },
    sm: { src: `${basePath}?w=${sizes[1]}&q=${quality}`, format: 'webp', size: 'medium' },
    md: { src: `${basePath}?w=${sizes[2]}&q=${quality}`, format: 'webp', size: 'large' },
    lg: { src: `${basePath}?w=${sizes[3]}&q=${quality}`, format: 'webp', size: 'xl' },
    xl: { src: `${basePath}?w=${sizes[4]}&q=${quality}`, format: 'webp', size: 'xl' }
  };
};