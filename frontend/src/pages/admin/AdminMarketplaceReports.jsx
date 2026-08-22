import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { AlertTriangle, CheckCircle, XCircle, Trash2, Search, Filter, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function AdminMarketplaceReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending') // 'all' | 'pending' | 'dismissed' | 'resolved'
  const [search, setSearch] = useState('')
  const [targetAction, setTargetAction] = useState(null) // { report, type: 'takedown' | 'dismiss' }
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [statusFilter])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/marketplace-reports?status=${statusFilter}`)
      setReports(res.data.reports || [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!targetAction) return
    setSubmitting(true)
    const { report, type } = targetAction
    try {
      if (type === 'takedown') {
        await api.patch(`/admin/marketplace-reports/${report.id}`, { status: 'resolved', action: 'takedown' })
        toast.success('Listing taken down and report resolved')
      } else {
        await api.patch(`/admin/marketplace-reports/${report.id}`, { status: 'dismissed' })
        toast.success('Report dismissed')
      }
      fetchReports()
    } catch {
      toast.error('Failed to update report status')
    } finally {
      setSubmitting(false)
      setTargetAction(null)
    }
  }

  const filtered = reports.filter(r =>
    !search ||
    r.listing_title?.toLowerCase().includes(search.toLowerCase()) ||
    r.reporter_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade">
      <PageHeader
        icon={ShieldAlert}
        title="Marketplace Abuse Reports"
        subtitle="Review, audit, and moderate student marketplace listings reported for violations"
        iconColor="#ef4444"
        action={
          <div className="flex items-center gap-3">
            <div className="search-bar" style={{ maxWidth: '240px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="search"
                placeholder="Search reports..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-input form-select text-xs"
              style={{ width: 'auto', padding: '6px 28px 6px 10px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="pending">Pending Reports</option>
              <option value="dismissed">Dismissed Reports</option>
              <option value="resolved">Resolved / Taken Down</option>
              <option value="all">All Reports</option>
            </select>
          </div>
        }
      />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Listing Title</th>
              <th>Report Reason</th>
              <th>Reporter</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Moderation Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No reports match the filter criteria.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.listing_title || 'Listing Deleted'}</div>
                    {r.details && <div className="text-xs text-muted mt-1" style={{ maxWidth: '220px', whiteSpace: 'normal' }}>"{r.details}"</div>}
                  </div>
                </td>
                <td><span className="badge badge-danger text-xs">{r.reason}</span></td>
                <td>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.reporter_name}</div>
                    <div className="text-xs text-muted">{r.reporter_email}</div>
                  </div>
                </td>
                <td>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.seller_name || 'N/A'}</div>
                    <div className="text-xs text-muted">{r.seller_email}</div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${r.status === 'pending' ? 'badge-warning' : r.status === 'resolved' ? 'badge-success' : 'badge-muted'} text-xs`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="text-muted text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setTargetAction({ report: r, type: 'takedown' })}
                          title="Takedown listing and resolve report"
                        >
                          <Trash2 size={12} /> Takedown
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setTargetAction({ report: r, type: 'dismiss' })}
                          title="Dismiss report as invalid"
                        >
                          <XCircle size={12} /> Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {targetAction && (
        <ConfirmModal
          isOpen={!!targetAction}
          onClose={() => setTargetAction(null)}
          onConfirm={handleAction}
          loading={submitting}
          title={targetAction.type === 'takedown' ? 'Takedown Reported Listing?' : 'Dismiss Abuse Report?'}
          message={
            targetAction.type === 'takedown'
              ? `Are you sure you want to permanently delete listing "${targetAction.report.listing_title}"? This action will resolve report #${targetAction.report.id.slice(0, 8)} and log an administrative audit action.`
              : `Are you sure you want to dismiss report #${targetAction.report.id.slice(0, 8)} for "${targetAction.report.listing_title}"?`
          }
          confirmText={targetAction.type === 'takedown' ? 'Takedown Listing' : 'Dismiss Report'}
          confirmClass={targetAction.type === 'takedown' ? 'btn-danger' : 'btn-outline'}
        />
      )}
    </div>
  )
}
