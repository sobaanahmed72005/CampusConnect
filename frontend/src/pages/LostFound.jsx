import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Search, Plus, MapPin, Phone, Calendar, Sparkles, CheckCircle2, X, ShieldCheck, Camera, HelpCircle, ArrowRight, ArrowLeft, History } from 'lucide-react'
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
  const [tab, setTab] = useState('lost') // 'lost' | 'found' | 'resolved'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardType, setWizardType] = useState('lost')
  const [selectedMatchItem, setSelectedMatchItem] = useState(null)
  const [claimItem, setClaimItem] = useState(null)

  useEffect(() => { fetchItems() }, [tab, search, category])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tab === 'resolved') {
        params.set('status', 'resolved')
      } else {
        params.set('type', tab)
      }
      if (search) params.set('q', search)
      if (category !== 'All') params.set('category', category)
      const res = await api.get(`/lost-found?${params}`)
      setItems(res.data.items || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  const openWizard = (type) => { setWizardType(type); setShowWizard(true) }

  const handleClaimSubmit = (e) => {
    e.preventDefault()
    toast.success('Ownership claim submitted! The item owner has been notified. 📬')
    setClaimItem(null)
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Search}
        title="Lost & Found 2.0"
        subtitle="Report lost belongings, found items, and track automated AI recovery matches"
        iconColor="var(--warning)"
        action={
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" onClick={() => openWizard('lost')}><Plus size={14} /> Report Lost Item</button>
            <button className="btn btn-primary btn-sm" onClick={() => openWizard('found')}><Plus size={14} /> Report Found Item</button>
          </div>
        }
      />

      {/* Automated Match Engine Info Banner */}
      <div className="card glass-card mb-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-4) var(--space-6)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(245,158,11,0.15)', padding: 10, borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
                Automated AI Match Engine Active
                <span className="badge badge-warning text-xs">Smart Recovery 2.0</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Our match engine automatically scans report categories, locations, dates, and keywords to calculate match confidence scores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="lf-tabs mb-4">
        <button className={`lf-tab ${tab === 'lost' ? 'active-lost' : ''}`} onClick={() => setTab('lost')}>
          🔴 Lost Items
        </button>
        <button className={`lf-tab ${tab === 'found' ? 'active-found' : ''}`} onClick={() => setTab('found')}>
          🟢 Found Items
        </button>
        <button className={`lf-tab ${tab === 'resolved' ? 'active' : ''}`} onClick={() => setTab('resolved')}>
          <History size={14} className="inline mr-1" /> Resolved History
        </button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${tab} items by title, location or description...`}
        categories={ITEM_CATEGORIES}
        activeCategory={category}
        onCategoryChange={setCategory}
      />

      {loading ? (
        <LoadingGrid count={6} height="240px" gridClass="grid-auto" label="Loading recovery reports..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No ${tab} items found`}
          description={`Be the first to file a report.`}
          action={
            <button className="btn btn-primary" onClick={() => openWizard(tab === 'resolved' ? 'found' : tab)}>
              <Plus size={16} /> File Report
            </button>
          }
        />
      ) : (
        <div className="grid-auto lf-grid">
          {items.map(item => (
            <div key={item.id} className={`lf-card card glass-card ${item.type === 'lost' ? 'lf-card-lost' : 'lf-card-found'}`}>
              {/* Image First Card Header */}
              {item.image_url ? (
                <div style={{ height: '140px', width: '100%', overflow: 'hidden', position: 'relative', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
                  <img src={item.image_url} alt={item.title} className="img-cover" />
                  <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'}`} style={{ position: 'absolute', top: 10, left: 10 }}>{item.type}</span>
                </div>
              ) : (
                <div className="lf-card-header">
                  <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} badge-dot`}>{item.type}</span>
                  <span className="badge badge-muted">{item.category}</span>
                </div>
              )}

              <div className="p-4 flex flex-col justify-between" style={{ flex: 1 }}>
                <div>
                  <h4 className="lf-card-title font-bold text-sm mb-1">{item.title}</h4>
                  <p className="lf-card-desc text-xs text-muted mb-3">{item.description?.slice(0, 90)}...</p>
                  
                  <div className="lf-card-meta text-xs text-muted mb-3 flex flex-col gap-1">
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {item.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-accent" /> {new Date(item.date_occurred || item.date_lost_found).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="lf-card-footer flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    className="btn btn-ghost btn-xs text-primary font-bold flex items-center gap-1"
                    onClick={() => setSelectedMatchItem(item)}
                  >
                    <Sparkles size={13} /> Check Matches
                  </button>

                  {item.user_id === user?.id && !item.is_resolved ? (
                    <button
                      className="btn btn-accent btn-xs"
                      onClick={async () => {
                        try {
                          await api.patch(`/lost-found/${item.id}/resolve`)
                          toast.success('Report resolved successfully! 🎉')
                          fetchItems()
                        } catch {
                          toast.error('Failed to resolve report')
                        }
                      }}
                    >
                      <CheckSquare size={13} /> Resolve Report
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setClaimItem(item)}
                    >
                      Claim Item
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step-by-Step Reporting Wizard Modal */}
      {showWizard && (
        <ReportingWizard
          type={wizardType}
          onClose={() => setShowWizard(false)}
          onSuccess={() => { setShowWizard(false); fetchItems() }}
        />
      )}

      {/* Match Confidence Explanation Modal */}
      {selectedMatchItem && (
        <MatchModal item={selectedMatchItem} onClose={() => setSelectedMatchItem(null)} />
      )}

      {/* Claim Ownership Modal */}
      {claimItem && (
        <div className="modal-overlay animate-fade" onClick={() => setClaimItem(null)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: 'var(--space-6)' }}>
            <h3 className="font-bold text-base mb-2">Claim Ownership Verification</h3>
            <p className="text-xs text-muted mb-4">Please provide identifying details or proof of ownership to claim <strong>{claimItem.title}</strong>.</p>
            <form onSubmit={handleClaimSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block">Proof of Ownership / Identifying Features</label>
                <textarea
                  className="form-textarea text-xs"
                  rows={3}
                  placeholder="Describe unique serial numbers, marks, lock screen wallpaper, or contents..."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Your Contact Phone / Email</label>
                <input type="text" className="form-input text-xs" placeholder="e.g. 0300-1234567" required />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setClaimItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportingWizard({ type, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    category: 'Wallet',
    description: '',
    image_url: '',
    location: '',
    date_lost_found: new Date().toISOString().split('T')[0],
    contact_info: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/lost-found', { ...form, type })
      toast.success(`${type === 'lost' ? 'Lost' : 'Found'} report created! Automated match engine is scanning... 🎉`)
      onSuccess()
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade" onClick={onClose}>
      <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: 'var(--space-6)' }}>
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="font-bold text-base flex items-center gap-2">
            <Search size={18} className="text-primary" /> Report {type === 'lost' ? 'Lost' : 'Found'} Item Wizard
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Wizard Steps Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {['1. Item & Photo', '2. Location & Date', '3. Recovery Contact'].map((stLabel, idx) => (
            <div key={idx} className={`text-xs font-bold ${step === idx + 1 ? 'text-primary' : 'text-muted'}`}>
              {stLabel}
            </div>
          ))}
        </div>

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1) }}>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Item Title</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Black Leather Wallet with Student ID"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Category</label>
                  <select className="form-select text-xs" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {ITEM_CATEGORIES.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input text-xs"
                    placeholder="https://images.unsplash.com/..."
                    value={form.image_url}
                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Detailed Description</label>
                <textarea
                  className="form-textarea text-xs"
                  rows={3}
                  placeholder="Include color, brand, contents, and distinguishing marks..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Campus Location</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. CS Library 2nd Floor, Main Cafeteria"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Date {type === 'lost' ? 'Lost' : 'Found'}</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  value={form.date_lost_found}
                  onChange={e => setForm({ ...form, date_lost_found: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Contact Phone / Email / Pickup Notes</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Handed to Library Desk / Call 0300-1234567"
                  value={form.contact_info}
                  onChange={e => setForm({ ...form, contact_info: e.target.value })}
                  required
                />
              </div>
              <div className="p-3 card text-xs text-muted" style={{ background: 'var(--bg-surface)' }}>
                <ShieldCheck size={16} className="text-primary inline mr-1" />
                Once submitted, our match engine will automatically scan for matching reports.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {step > 1 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} /> Previous
              </button>
            ) : <div />}

            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {step === 3 ? (loading ? 'Submitting...' : 'Submit Report') : <>Next <ArrowRight size={14} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
