import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Building2, Trash2, MapPin, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function AdminAccommodation() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetDelete, setTargetDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchListings() }, [])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/accommodation')
      setListings(res.data.listings || [])
    } catch { setListings([]) } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!targetDelete) return
    setDeleting(true)
    try {
      await api.delete(`/admin/accommodation/${targetDelete.id}`)
      setListings(list => list.filter(x => x.id !== targetDelete.id))
      toast.success('Housing listing removed by moderator')
    } catch { toast.error('Failed to remove listing') } finally { setDeleting(false); setTargetDelete(null) }
  }

  const filtered = listings.filter(h =>
    !search ||
    h.title?.toLowerCase().includes(search.toLowerCase()) ||
    h.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    h.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Building2}
        title="Moderate Accommodation Listings"
        subtitle="Review, audit, and moderate student housing and hostel listings across campus"
        iconColor="#3b82f6"
        action={
          <div className="search-bar" style={{ maxWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search housing or owner..."
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
              <th>Housing Title</th>
              <th>Type</th>
              <th>Price</th>
              <th>Location</th>
              <th>Owner / Warden</th>
              <th>Available Rooms</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No housing listings found.</td></tr>
            ) : filtered.map(h => (
              <tr key={h.id}>
                <td style={{ fontWeight: 600 }}>{h.title}</td>
                <td><span className="badge badge-accent text-xs">{h.type}</span></td>
                <td className="price" style={{ fontSize: '0.875rem', color: '#3b82f6' }}>${Number(h.price).toLocaleString()} / {h.price_period}</td>
                <td className="text-muted text-xs"><MapPin size={11} /> {h.location}</td>
                <td className="text-muted">{h.owner_name || 'System Admin'}</td>
                <td>
                  <span className={`badge ${h.rooms_available > 0 ? 'badge-success' : 'badge-danger'} text-xs`}>
                    {h.rooms_available} / {h.total_rooms}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setTargetDelete(h)}>
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
          title="Remove Housing Listing?"
          message={`Are you sure you want to remove "${targetDelete.title}"? This moderation action will be recorded in the audit trail.`}
          confirmText="Remove Listing"
          danger={true}
          loading={deleting}
        />
      )}
    </div>
  )
}
