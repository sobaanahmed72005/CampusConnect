import './AuthLayout.css'
import { Link } from 'react-router-dom'

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb1" />
        <div className="auth-bg-orb orb2" />
        <div className="auth-bg-orb orb3" />
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <Link to="/" className="auth-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="National University Emblem"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#ffffff',
                objectFit: 'cover',
                boxShadow: '0 0 16px rgba(16,185,129,0.3)',
                padding: '2px'
              }}
            />
            <span className="auth-logo-text">CampusConnect</span>
          </Link>
          <p className="auth-tagline">Official Student Portal • National University of Computer & Emerging Sciences</p>
        </div>
        <div className="auth-card">
          {children}
        </div>
      </div>
    </div>
  )
}
