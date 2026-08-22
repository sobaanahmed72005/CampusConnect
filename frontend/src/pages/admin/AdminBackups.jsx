import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Database, ShieldCheck, Download, Trash2, CheckCircle2, AlertTriangle, RefreshCw, HardDrive } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

export default function AdminBackups() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [verifying, setVerifying] = useState(null)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/backups')
      setBackups(res.data.backups || [])
    } catch {
      toast.error('Failed to fetch backup list')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await api.post('/admin/backups')
      toast.success(res.data.message || 'Database backup created!')
      fetchBackups()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleVerifyBackup = async (filename) => {
    setVerifying(filename)
    try {
      const res = await api.post('/admin/backups/verify', { filename })
      if (res.data.verified) {
        toast.success(`Backup "${filename}" verified! (${res.data.totalTables} tables, ${res.data.totalRecords} records)`)
      } else {
        toast.error(`Verification Failed: ${res.data.reason}`)
      }
    } catch {
      toast.error('Failed to verify backup')
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete backup file "${filename}"?`)) return
    try {
      await api.delete(`/admin/backups/${encodeURIComponent(filename)}`)
      toast.success('Backup file deleted')
      fetchBackups()
    } catch {
      toast.error('Failed to delete backup file')
    }
  }

  return (
    <div className="admin-backups p-6 flex flex-col gap-6" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Database Backups & Retention"
        subtitle="Automated schema & records backup, integrity verification, and retention policy"
        badge="System Administration"
      />

      {/* Action Banner */}
      <div className="card p-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
            <HardDrive size={18} className="text-primary" /> Automated Database Backup Manager
          </div>
          <div className="text-xs text-muted mt-1">
            Backups are created in JSON schema format containing all active database tables and indexes.
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCreateBackup} disabled={creating}>
          {creating ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
          {creating ? 'Creating Backup...' : 'Create Backup Now'}
        </button>
      </div>

      {/* Disaster Recovery Notice */}
      <div className="p-4" style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center gap-2 font-bold text-xs text-primary mb-1">
          <ShieldCheck size={14} /> Disaster Recovery CLI Procedure
        </div>
        <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
          To execute a full database restoration in disaster recovery mode, run the CLI utility from terminal: <br />
          <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
            node backend/scripts/restoreBackup.js &lt;backup_filename&gt; --confirm
          </code>
        </div>
      </div>

      {/* Backup File Table */}
      <div className="card p-4" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" /> Available Backup Archives ({backups.length})
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchBackups}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : backups.length === 0 ? (
          <div className="text-center p-8 text-xs text-muted">
            No database backups created yet. Click "Create Backup Now" above to generate a snapshot!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table w-full text-xs">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Created Timestamp</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td className="font-mono font-semibold text-primary">{b.filename}</td>
                    <td>{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-success text-xs">Available</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => handleVerifyBackup(b.filename)}
                          disabled={verifying === b.filename}
                        >
                          <ShieldCheck size={12} /> {verifying === b.filename ? 'Verifying...' : 'Verify Integrity'}
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => handleDeleteBackup(b.filename)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
