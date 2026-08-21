import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export default function OptimizedImage({
  src,
  alt = 'CampusConnect Image',
  width,
  height,
  className = '',
  style = {},
  aspectRatio,
  objectFit = 'cover',
  fallbackSrc,
  priority = false
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setLoaded(true)
  }

  const handleError = () => {
    setError(true)
    setLoaded(true)
  }

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    width: width || '100%',
    height: height || '100%',
    aspectRatio: aspectRatio || 'auto',
    background: 'var(--bg-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  }

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    display: error ? 'none' : 'block'
  }

  return (
    <div className={`optimized-image-wrap ${className}`} style={containerStyle}>
      {!loaded && !error && (
        <div
          className="skeleton-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-card) 50%, var(--bg-surface) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      )}

      {error ? (
        fallbackSrc ? (
          <img
            src={fallbackSrc}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted p-2" style={{ fontSize: '0.75rem' }}>
            <ImageOff size={20} className="mb-1 opacity-50" />
            <span>Image Unavailable</span>
          </div>
        )
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyle}
        />
      )}
    </div>
  )
}
