import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Calendar, Plus, Edit, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

const CATEGORIES = ['Society', 'Workshop', 'Sports', 'Seminar', 'Cultural']

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [targetDelete, setTargetDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = () => {
    api.get('/events?all=true')
      .then(r => setEvents(r.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleDelete = async () => {
    if (!targetDelete) return
    setDeleting(true)
    try {
      await api.delete(`/events/${targetDelete.id}`)
      fetchEvents()
      toast.success('Event deleted')
    } catch { toast.error('Failed to delete event') } finally { setDeleting(false); setTargetDelete(null) }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Calendar}
        title="Manage Events"
        subtitle="Create, edit, and organize campus events"
        iconColor="var(--primary)"
        action={
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={16} /> Create Event
          </button>
        }
      />
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Location</th><th>Capacity</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> : events.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td><span className="badge badge-primary">{e.category}</span></td>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td className="text-muted">{e.location}</td>
                <td>{e.registered_count || 0}/{e.capacity}</td>
                <td><div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditing(e); setShowForm(true) }}><Edit size={12} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setTargetDelete(e)}><Trash2 size={12} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <EventForm initial={editing} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchEvents() }} />}
      {targetDelete && (
        <ConfirmModal
          isOpen={!!targetDelete}
          onClose={() => setTargetDelete(null)}
          onConfirm={handleDelete}
          title="Delete Campus Event?"
          message={`Are you sure you want to delete "${targetDelete.title}"? Registrations for this event will also be removed.`}
          confirmText="Delete Event"
          danger={true}
          loading={deleting}
        />
      )}
    </div>
  )
}

function EventForm({ initial, onClose, onSuccess }) {
  const [form, setForm] = useState(initial || { title: '', description: '', category: '', date: '', time: '', location: '', capacity: 100, organizer: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (initial) await api.put(`/events/${initial.id}`, form)
      else await api.post('/events', form)
      toast.success(initial ? 'Event updated!' : 'Event created!')
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{initial ? 'Edit Event' : 'Create Event'}</h3><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category</label><select className="form-input form-select" value={form.category} onChange={e => set('category', e.target.value)}><option value="">Select</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Capacity</label><input className="form-input" type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></div>
          </div>
          <div className="grid-2" style={{ gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date</label><input className="form-input" type="date" value={form.date?.split('T')[0] || ''} onChange={e => set('date', e.target.value)} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Time</label><input className="form-input" type="time" value={form.time || ''} onChange={e => set('time', e.target.value)} /></div>
          </div>
          <div className="form-group mt-2"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Organizer</label><input className="form-input" value={form.organizer} onChange={e => set('organizer', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>{loading ? <><div className="spinner" />{initial ? 'Updating...' : 'Creating...'}</> : initial ? 'Update Event' : 'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
