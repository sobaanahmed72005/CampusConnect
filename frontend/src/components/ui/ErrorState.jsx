import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({
  title = "We couldn't load this content",
  message = "Unable to fetch data from CampusConnect. Please check your connection and try again.",
  onRetry
}) {
  return (
    <div
      className="card p-8 text-center animate-fade"
      style={{
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '520px',
        margin: 'var(--space-6) auto'
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)'
        }}
      >
        <AlertTriangle size={26} />
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
      <p className="text-xs text-muted mb-6" style={{ lineHeight: 1.6 }}>
        {message}
      </p>

      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--text-primary)' }}>
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  )
}
