import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Search, Plus, MapPin, Phone, Calendar, Sparkles, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import MatchModal from '../components/lostfound/MatchModal'
import './LostFound.css'

const ITEM_CATEGORIES = ['All', 'Wallet', 'Phone', 'Keys', 'Bag', 'Laptop', 'Clothing', 'ID Card', 'Books', 'Jewelry', 'Other']

export default function LostFound() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lost') // lost | found
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('lost')
  const [selectedMatchItem, setSelectedMatchItem] = useState(null)

  useEffect(() => { fetchItems() }, [tab, search, category])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: tab })
      if (search) params.set('q', search)
      if (category !== 'All') params.set('category', category)
      const res = await api.get(`/lost-found?${params}`)
      setItems(res.data.items || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  const openForm = (type) => { setFormType(type); setShowForm(true) }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Search}
        title="Lost & Found Recovery System"
        subtitle="Report lost belongings or found items across campus with automated AI match detection"
        iconColor="var(--warning)"
        action={
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" onClick={() => openForm('lost')}><Plus size={14} /> Report Lost</button>
            <button className="btn btn-primary btn-sm" onClick={() => openForm('found')}><Plus size={14} /> Report Found</button>
          </div>
        }
      />

      {/* Match Engine Info Banner */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-4) var(--space-6)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(245,158,11,0.15)', padding: 10, borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
                Automated Match Engine Active
                <span className="badge badge-warning text-xs">Smart Recovery</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Our match engine automatically scans report categories, locations, dates, and keywords to connect lost items with found reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="lf-tabs mb-4">
        <button className={`lf-tab ${tab === 'lost' ? 'active-lost' : ''}`} onClick={() => setTab('lost')}>
          🔴 Lost Items ({items.filter?.(i => i.type === 'lost')?.length || 0})
        </button>
        <button className={`lf-tab ${tab === 'found' ? 'active-found' : ''}`} onClick={() => setTab('found')}>
          🟢 Found Items ({items.filter?.(i => i.type === 'found')?.length || 0})
        </button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${tab} items by title, description or location...`}
        categories={ITEM_CATEGORIES}
        activeCategory={category}
        onCategoryChange={setCategory}
      />

      {loading ? (
        <LoadingGrid count={6} height="220px" gridClass="grid-auto" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No ${tab} items found`}
          description={`Be the first to report a ${tab} item.`}
          action={
            <button className="btn btn-primary" onClick={() => openForm(tab)}>
              <Plus size={16} /> Report {tab} Item
            </button>
          }
        />
      ) : (
        <div className="grid-auto lf-grid">
          {items.map(item => (
            <div key={item.id} className={`lf-card card ${item.type === 'lost' ? 'lf-card-lost' : 'lf-card-found'}`}>
              <div className="lf-card-header">
                <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot`}>{item.type}</span>
                <span className="badge badge-muted">{item.category}</span>
              </div>
              <h4 className="lf-card-title">{item.title}</h4>
              <p className="lf-card-desc">{item.description?.slice(0, 100)}...</p>
              <div className="lf-card-meta">
                <span><MapPin size={12} /> {item.location}</span>
                <span><Calendar size={12} /> {new Date(item.date_occurred || item.date_lost_found).toLocaleDateString()}</span>
              </div>
              <div className="lf-card-footer flex items-center justify-between gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-ghost btn-sm text-xs flex items-center gap-1"
                  style={{ color: 'var(--primary)', padding: '4px 8px' }}
                  onClick={() => setSelectedMatchItem(item)}
                >
                  <Sparkles size={13} /> Check Matches
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => toast.success(`Contact: ${item.contact_info || item.reporter_name}`)}
                >
                  <Phone size={12} /> Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <LostFoundForm type={formType} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchItems() }} />}
      {selectedMatchItem && <MatchModal item={selectedMatchItem} onClose={() => setSelectedMatchItem(null)} />}
    </div>
  )
}

function LostFoundForm({ type, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', location: '', date_lost_found: new Date().toISOString().split('T')[0], contact_info: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.location.trim()) e.location = 'Location is required'
    if (!form.category) e.category = 'Category is required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/lost-found', { ...form, type })
      toast.success(`${type} item reported! Match engine is scanning...`)
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === 'lost' ? '🔴 Report Lost Item' : '🟢 Report Found Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className={`form-input ${errors.title ? 'error' : ''}`} placeholder="e.g. Black Samsung Phone" value={form.title} onChange={e => set('title', e.target.value)} />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className={`form-input form-select ${errors.category ? 'error' : ''}`} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select category</option>
              {ITEM_CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <span className="form-error">{errors.category}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Describe the item (color, brand, distinguishing marks)..." value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Location *</label>
              <input className={`form-input ${errors.location ? 'error' : ''}`} placeholder="Where it was lost/found" value={form.location} onChange={e => set('location', e.target.value)} />
              {errors.location && <span className="form-error">{errors.location}</span>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date_lost_found} onChange={e => set('date_lost_found', e.target.value)} />
            </div>
          </div>
          <div className="form-group mt-2">
            <label className="form-label">Contact Info</label>
            <input className="form-input" placeholder="Phone or email" value={form.contact_info} onChange={e => set('contact_info', e.target.value)} />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {loading ? <><div className="spinner" />Submitting...</> : `Submit ${type} Report`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
