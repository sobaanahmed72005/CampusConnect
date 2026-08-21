import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Search, Trash2, MapPin, Calendar, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function AdminLostFound() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetDelete, setTargetDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/lost-found')
      setItems(res.data.items || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!targetDelete) return
    setDeleting(true)
    try {
      await api.delete(`/admin/lost-found/${targetDelete.id}`)
      setItems(list => list.filter(x => x.id !== targetDelete.id))
      toast.success('Report removed by moderator')
    } catch { toast.error('Failed to remove report') } finally { setDeleting(false); setTargetDelete(null) }
  }

  const filtered = items.filter(i =>
    !search ||
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.reporter_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Search}
        title="Moderate Lost & Found Reports"
        subtitle="Review and moderate user-submitted lost and found reports across campus"
        iconColor="var(--warning)"
        action={
          <div className="search-bar" style={{ maxWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search reports or reporter..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Report Item</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th>Reporter</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No reports found.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td>
                  <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot`}>{item.type}</span>
                </td>
                <td><span className="badge badge-muted">{item.category}</span></td>
                <td className="text-muted text-xs"><MapPin size={11} /> {item.location}</td>
                <td className="text-muted">{item.reporter_name}</td>
                <td>
                  <span className={`badge ${item.is_resolved ? 'badge-success' : 'badge-warning'} text-xs`}>
                    {item.is_resolved ? 'Resolved' : 'Active'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setTargetDelete(item)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {targetDelete && (
        <ConfirmModal
          isOpen={!!targetDelete}
          onClose={() => setTargetDelete(null)}
          onConfirm={handleDelete}
          title="Remove Lost & Found Report?"
          message={`Are you sure you want to remove the report "${targetDelete.title}" by ${targetDelete.reporter_name}? This moderation action will be recorded in the audit trail.`}
          confirmText="Remove Report"
          danger={true}
          loading={deleting}
        />
      )}
    </div>
  )
}
