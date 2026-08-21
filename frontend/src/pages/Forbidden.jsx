import { Link } from 'react-router-dom'
import { ShieldAlert, LayoutDashboard, Home } from 'lucide-react'

export default function Forbidden() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        textAlign: 'center',
        padding: 'var(--space-6)',
        background: 'var(--bg-base)'
      }}
    >
      <div
        className="card p-8 animate-fade text-center"
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-3)'
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <div
          style={{
            fontSize: '4.5rem',
            fontWeight: 900,
            lineHeight: 1,
            marginBottom: 'var(--space-2)',
            background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          403
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Access Denied</h2>
        <p className="text-body-sm text-muted mb-6" style={{ lineHeight: 1.6 }}>
          You don't have administrative privileges to access this area of CampusConnect.
        </p>

        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" className="btn btn-primary flex-1">
            <LayoutDashboard size={15} /> Go to Dashboard
          </Link>
          <Link to="/" className="btn btn-outline flex-1">
            <Home size={15} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
