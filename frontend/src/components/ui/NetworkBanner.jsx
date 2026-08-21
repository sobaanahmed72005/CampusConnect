import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'

export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [reconnected, setReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setReconnected(true)
      const timer = setTimeout(() => setReconnected(false), 3500)
      return () => clearTimeout(timer)
    }
    const handleOffline = () => {
      setIsOffline(true)
      setReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline && !reconnected) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
        padding: '8px 16px',
        background: isOffline ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #10b981, #059669)',
        color: '#ffffff',
        fontSize: '0.825rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease'
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} />
          <span>Unable to connect to CampusConnect. Check your internet connection.</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '2px 8px',
              cursor: 'pointer',
              marginLeft: '8px',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={11} /> Retry
          </button>
        </>
      ) : (
        <>
          <Wifi size={16} />
          <span>Reconnected to CampusConnect!</span>
        </>
      )}
    </div>
  )
}
