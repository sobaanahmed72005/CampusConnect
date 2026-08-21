import React, { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('CampusConnect ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            color: 'var(--text-primary)',
            padding: 'var(--space-6)'
          }}
        >
          <div
            className="card p-8 text-center animate-fade"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p className="text-body-sm text-muted mb-6" style={{ lineHeight: 1.6 }}>
              CampusConnect encountered an unexpected error. Please try again or return to your dashboard.
            </p>

            <div className="flex gap-3 justify-center">
              <button className="btn btn-outline" onClick={this.handleRetry}>
                <RefreshCw size={15} /> Try Again
              </button>
              <button className="btn btn-primary" onClick={this.handleGoDashboard}>
                <Home size={15} /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
