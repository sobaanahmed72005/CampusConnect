import React, { useState, useEffect } from 'react'
import { RefreshCw, LogOut, ExternalLink, CheckCircle2, ShieldCheck, BookOpen } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function GoogleClassroomWidget({ onSyncSuccess }) {
  const [status, setStatus] = useState({ isConnected: false, googleEmail: null, lastSyncedAt: null })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await api.get('/academic/gcr/status')
      setStatus(res.data)
    } catch {
      // Ignore initial status error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Check URL parameters for OAuth redirect notifications
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcr') === 'connected') {
      toast.success('Google Classroom connected & synchronized!')
      window.history.replaceState({}, document.title, window.location.pathname)
      fetchStatus()
      if (onSyncSuccess) onSyncSuccess()
    } else if (params.get('gcr_error')) {
      toast.error(`Google Classroom Error: ${params.get('gcr_error')}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleConnect = async () => {
    try {
      const res = await api.get('/academic/gcr/auth-url')
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl
      }
    } catch (err) {
      toast.error('Failed to initiate Google OAuth flow')
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/academic/gcr/sync')
      toast.success(`Synced ${res.data.syncedCoursesCount || 0} courses & ${res.data.syncedAssignmentsCount || 0} assignments!`)
      fetchStatus()
      if (onSyncSuccess) onSyncSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync Google Classroom data')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Classroom?')) return
    setDisconnecting(true)
    try {
      await api.post('/academic/gcr/disconnect')
      toast.success('Google Classroom disconnected')
      setStatus({ isConnected: false, googleEmail: null, lastSyncedAt: null })
      if (onSyncSuccess) onSyncSuccess()
    } catch {
      toast.error('Failed to disconnect Google Classroom')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
        <div className="flex items-center gap-3">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)' }} />
          <div className="flex flex-col gap-1">
            <div className="skeleton" style={{ width: 140, height: 16 }} />
            <div className="skeleton" style={{ width: 90, height: 12 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.06))', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)' }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left Side Info */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: status.isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            color: status.isConnected ? 'var(--primary)' : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Google Classroom Integration</h3>
              {status.isConnected ? (
                <span className="badge badge-success flex items-center gap-1 text-xs">
                  <CheckCircle2 size={12} /> Connected
                </span>
              ) : (
                <span className="badge badge-muted text-xs">Not Connected</span>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              {status.isConnected ? (
                <>Account: <strong style={{ color: 'var(--text-primary)' }}>{status.googleEmail}</strong> • Last synced: {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</>
              ) : (
                'Synchronize official Google Classroom courses, coursework, due dates, and announcements into CampusConnect.'
              )}
            </p>
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2">
          {status.isConnected ? (
            <>
              <button
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                onClick={handleSyncNow}
                disabled={syncing}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                className="btn btn-ghost btn-sm text-danger flex items-center gap-1.5"
                onClick={handleDisconnect}
                disabled={disconnecting}
                title="Disconnect Google Classroom"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm flex items-center gap-2"
              onClick={handleConnect}
            >
              <ShieldCheck size={16} />
              Connect Google Classroom
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
