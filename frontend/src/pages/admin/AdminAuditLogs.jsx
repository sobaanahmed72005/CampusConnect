import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { ShieldAlert, Search, Filter, ShieldCheck, UserX, FileText, ShoppingBag, Calendar, MapPin, Building2, User } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import LoadingGrid from '../../components/ui/LoadingGrid'
import EmptyState from '../../components/ui/EmptyState'

const LOG_TYPES = ['all', 'user', 'marketplace', 'event', 'lost_found', 'accommodation']

function getActionBadge(action) {
  if (action.includes('SUSPEND') || action.includes('DELETE')) return 'badge-danger'
  if (action.includes('ROLE') || action.includes('RESTORE')) return 'badge-accent'
  if (action.includes('CREATE') || action.includes('RESOLVE')) return 'badge-success'
  return 'badge-primary'
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchLogs() }, [typeFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/audit-logs?type=${typeFilter}`)
      setLogs(res.data.logs || [])
    } catch { setLogs([]) } finally { setLoading(false) }
  }

  const filtered = logs.filter(l =>
    !search ||
    l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade">
      <PageHeader
        icon={ShieldAlert}
        title="Admin Audit Trail & Activity Logs"
        subtitle="Immutable security log recording all administrative role changes, content moderation, and account suspensions"
        iconColor="var(--accent)"
        action={
          <div className="search-bar" style={{ maxWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search audit trail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="tabs mb-6">
        {LOG_TYPES.map(t => (
          <button
            key={t}
            className={`tab ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? 'All Activity' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingGrid count={6} height="70px" gridClass="flex flex-col gap-3" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description="Administrative actions and moderation events will be recorded here automatically."
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem', background: 'var(--accent-50)', color: 'var(--accent)' }}>
                        <User size={12} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.admin_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadge(l.action)} text-xs`}>{l.action}</span>
                  </td>
                  <td>
                    <span className="badge badge-muted text-xs">{l.target_type}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{l.details}</td>
                  <td className="text-xs text-muted font-mono">{l.ip_address || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
