import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react'
import { useParams as useReactParams, useNavigate as useReactNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
  Building2, MapPin, Wifi, Wind, Utensils, Shield, Tv, Star, Search, X, Phone, Mail,
  Calendar, Users, ArrowLeft, CheckCircle2, Home, Coffee, Zap, Layers, Car, Sparkles, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import './Accommodation.css'

const FACILITY_ICONS = {
  WiFi: Wifi,
  AC: Wind,
  Cafeteria: Utensils,
  Security: Shield,
  TV: Tv,
  Laundry: Layers,
  Gym: Sparkles,
  Parking: Car,
  'Power Backup': Zap,
  'Coffee Bar': Coffee,
  'Study Lounge': Home,
  Garden: Home
}

const TYPE_LABELS = {
  studio: 'Studio Residency',
  shared_room: 'Shared Student Room',
  dorm: 'Dormitory Quad',
  apartment: 'Private Apartment',
  single_room: 'Single Room',
  double_room: 'Double Room',
  triple_room: 'Triple Room',
}

export default function AccommodationDetail() {
  const { id } = useReactParams()
  const navigate = useReactNavigate()

  const [listing, setListing] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(null)
  const [showInquiry, setShowInquiry] = useState(false)

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/accommodation/${id}`)
      const l = res.data.listing
      setListing(l)
      setSimilar(res.data.similarListings || [])
      setActiveImage(l.image_url || l.images?.[0] || null)
    } catch {
      setListing(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (!listing) return (
    <div className="empty-state" style={{ height: '60vh' }}>
      <Building2 size={48} />
      <h3>Housing listing not found</h3>
      <p>This accommodation listing may have been removed or filled.</p>
      <button onClick={() => navigate('/accommodation')} className="btn btn-primary mt-4">
        <ArrowLeft size={16} /> Back to Accommodation
      </button>
    </div>
  )

  const images = listing.images && listing.images.length > 0 ? listing.images : (listing.image_url ? [listing.image_url] : [])

  return (
    <div className="animate-fade">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignItems: 'center' }}>
        <button onClick={() => navigate('/accommodation')} className="btn btn-ghost btn-sm flex gap-1" style={{ padding: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Accommodation
        </button>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)' }}>{listing.title}</span>
      </div>

      {/* Hero Header Row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-accent">{TYPE_LABELS[listing.type] || listing.type}</span>
            <span className={`badge ${listing.gender_preference === 'Girls Only' ? 'badge-danger' : listing.gender_preference === 'Boys Only' ? 'badge-primary' : 'badge-success'}`}>
              👥 {listing.gender_preference || 'Co-ed'}
            </span>
            <span className="badge badge-muted">🛋️ {listing.furnishing_status || 'Fully Furnished'}</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{listing.title}</h1>
          <div className="flex items-center gap-4 text-muted text-sm mt-2 flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={14} style={{ color: 'var(--primary)' }} /> {listing.location}</span>
            <span>📍 {listing.distance_to_campus || '5 mins from campus'}</span>
            <span>📅 Available from {listing.available_from ? new Date(listing.available_from).toLocaleDateString() : 'Immediate'}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="price" style={{ fontSize: '2.2rem', color: '#3b82f6' }}>
            ${Number(listing.price).toLocaleString()}
          </div>
          <div className="text-xs text-muted">per {listing.price_period || 'month'}</div>
        </div>
      </div>

      {/* Main Grid: Gallery & Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }} className="accommodation-detail-grid">

        {/* Left Column: Image Gallery */}
        <div>
          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            height: '380px',
            position: 'relative',
            border: '1px solid var(--border)'
          }}>
            {activeImage ? (
              <img src={activeImage} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', height: '100%', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
                <Building2 size={64} />
                <span>No photos provided</span>
              </div>
            )}
            <span className={`badge ${listing.rooms_available > 0 ? 'badge-success' : 'badge-danger'}`} style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.8rem', padding: '6px 12px' }}>
              {listing.rooms_available > 0 ? `${listing.rooms_available} Rooms Available` : 'Full'}
            </span>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 mt-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={{
                    width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    border: activeImage === img ? '2px solid #3b82f6' : '1px solid var(--border)',
                    padding: 0, background: 'none', cursor: 'pointer'
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Specs & Inquiry Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Key Specs Card */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Residence Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Room Type', value: TYPE_LABELS[listing.type] || listing.type },
                { label: 'Gender Preference', value: listing.gender_preference || 'Co-ed' },
                { label: 'Furnishing', value: listing.furnishing_status || 'Fully Furnished' },
                { label: 'Total Capacity', value: `${listing.rooms_available || 0} of ${listing.total_rooms || 0} rooms available` },
                { label: 'Available Date', value: listing.available_from ? new Date(listing.available_from).toLocaleDateString() : 'Immediate' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted text-sm">{label}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Location & Proximity Card */}
          <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.08))', border: '1px solid var(--border-strong)' }}>
            <div className="text-xs text-muted font-semibold uppercase mb-2">CAMPUS PROXIMITY & LOCATION</div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} style={{ color: '#3b82f6' }} />
              <span className="font-bold text-sm">{listing.location || 'H-11, Islamabad'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div className="font-bold text-primary" style={{ color: '#3b82f6' }}>📍 {listing.distance_to_campus || '1.2 km from FAST'}</div>
                <div className="text-muted mt-1">🚶 Approx. 15 min walk / 🚲 5 min bike from campus</div>
              </div>
            </div>
          </div>

          {/* Landlord Box */}
          <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)' }}>
            <div className="text-xs text-muted font-semibold uppercase mb-2">CAMPUS HOUSING MANAGER</div>
            <div className="flex items-center gap-3">
              <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                {listing.owner_name?.[0] || 'H'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{listing.owner_name || 'University Housing Office'}</div>
                <div className="text-xs text-muted">{listing.contact_info || listing.owner_email || 'Contact manager'}</div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <button
            className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)' }}
            onClick={() => setShowInquiry(true)}
            disabled={listing.rooms_available === 0}
          >
            <Send size={18} /> {listing.rooms_available === 0 ? 'No Rooms Available' : 'Submit Housing Inquiry'}
          </button>
        </div>
      </div>

      {/* Middle Row: Facilities & Description */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {/* Facilities */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: '#3b82f6' }} /> Amenities & Facilities Included
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
            {(listing.facilities || ['WiFi', 'AC', 'Security', 'Laundry']).map(f => {
              const Icon = FACILITY_ICONS[f] || CheckCircle2
              return (
                <div key={f} className="flex items-center gap-2 p-3" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <Icon size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{f}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Home size={18} style={{ color: 'var(--accent)' }} /> Property Description
          </h3>
          <p style={{ lineHeight: 1.8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {listing.description}
          </p>
        </div>
      </div>

      {/* Bottom Section: Similar Housing */}
      {similar.length > 0 && (
        <div className="mt-8">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            🏠 Nearby Accommodation Recommendations
          </h3>
          <div className="grid-3">
            {similar.map(h => (
              <a key={h.id} href={`/accommodation/${h.id}`} className="hostel-card card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="hostel-img">
                  {h.image_url ? <img src={h.image_url} alt={h.title} className="img-cover" /> : <Building2 size={36} className="text-muted" />}
                  <span className="badge badge-success hostel-availability">{h.rooms_available} Available</span>
                </div>
                <div className="hostel-body">
                  <h4>{h.title}</h4>
                  <div className="text-xs text-muted mt-1"><MapPin size={12} /> {h.location}</div>
                  <div className="price mt-2" style={{ color: '#3b82f6', fontSize: '1rem' }}>${Number(h.price).toLocaleString()} / {h.price_period}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Housing Inquiry Modal Drawer */}
      {showInquiry && (
        <InquiryModal listing={listing} onClose={() => setShowInquiry(false)} />
      )}
    </div>
  )
}

function InquiryModal({ listing, onClose }) {
  const [form, setForm] = useState({ move_in_date: new Date().toISOString().split('T')[0], message: '', preferred_contact: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/accommodation/inquiry', { listing_id: listing.id, ...form })
      toast.success('Housing inquiry submitted! The residence warden will contact you.')
      onClose()
    } catch {
      toast.error('Failed to submit inquiry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Submit Housing Inquiry</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Selected Property</label>
            <input className="form-input" value={listing.title} disabled style={{ opacity: 0.8 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Preferred Move-in Date</label>
            <input className="form-input" type="date" value={form.move_in_date} onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Your Phone / Preferred Contact</label>
            <input className="form-input" placeholder="Phone number or WhatsApp" value={form.preferred_contact} onChange={e => setForm(f => ({ ...f, preferred_contact: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Message for Housing Manager (optional)</label>
            <textarea className="form-input" rows={3} placeholder="Ask about room preferences, lease duration..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`} style={{ background: '#3b82f6' }} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Send Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
