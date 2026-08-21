import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Building2, MapPin, Wifi, Wind, Utensils, Shield, Tv, Search, Layers, Car, Zap, ArrowRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import './Accommodation.css'

const FACILITY_ICONS = { WiFi: Wifi, AC: Wind, Cafeteria: Utensils, Security: Shield, TV: Tv, Laundry: Layers, Parking: Car, 'Power Backup': Zap }

const TYPE_LABELS = {
  studio: 'Studio',
  shared_room: 'Shared Room',
  dorm: 'Dormitory',
  apartment: 'Apartment',
  single_room: 'Single Room',
  double_room: 'Double Room',
  triple_room: 'Triple Room',
}

const TYPES = ['All', 'Studio', 'Shared Room', 'Dorm', 'Apartment']
const GENDERS = ['All', 'Co-ed', 'Girls Only', 'Boys Only']
const FURNISHING_OPTIONS = ['All', 'Fully Furnished', 'Semi-Furnished']

import OptimizedImage from '../components/ui/OptimizedImage'

export default function Accommodation() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roomType, setRoomType] = useState('All')
  const [gender, setGender] = useState('All')
  const [furnishing, setFurnishing] = useState('All')

  useEffect(() => { fetchListings() }, [search, roomType, gender, furnishing])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (roomType !== 'All') params.set('type', roomType.toLowerCase().replace(' ', '_'))
      if (gender !== 'All') params.set('gender', gender)
      if (furnishing !== 'All') params.set('furnishing', furnishing)
      const res = await api.get(`/accommodation?${params}`)
      setListings(res.data.listings || [])
    } catch { setListings([]) } finally { setLoading(false) }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Building2}
        title="Campus Accommodation & Housing"
        subtitle="Explore verified student dorms, hostels, private rooms and apartments near university campus"
        iconColor="#3b82f6"
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by location, residence name or campus distance..."
        categories={TYPES}
        activeCategory={roomType}
        onCategoryChange={setRoomType}
        extraFilters={
          <div className="flex gap-2 items-center flex-wrap">
            {/* Gender filter */}
            <select className="form-input form-select" value={gender} onChange={e => setGender(e.target.value)} style={{ width: 'auto' }}>
              {GENDERS.map(g => <option key={g} value={g}>{g === 'All' ? 'Gender: All' : g}</option>)}
            </select>

            {/* Furnishing filter */}
            <select className="form-input form-select" value={furnishing} onChange={e => setFurnishing(e.target.value)} style={{ width: 'auto' }}>
              {FURNISHING_OPTIONS.map(f => <option key={f} value={f}>{f === 'All' ? 'Furnishing: All' : f}</option>)}
            </select>
          </div>
        }
      />

      {loading ? (
        <LoadingGrid count={6} height="360px" gridClass="grid-3" />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No housing listings found"
          description="Try adjusting your search query, gender preference, or room type filters."
        />
      ) : (
        <div className="grid-3 hostels-grid">
          {listings.map(h => (
            <Link key={h.id} to={`/accommodation/${h.id}`} className="hostel-card card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="hostel-img">
                {h.image_url
                  ? <OptimizedImage src={h.image_url} alt={h.title} height="180px" />
                  : <div className="flex items-center justify-center h-full text-muted"><Building2 size={36} /></div>
                }
                <span className={`badge hostel-availability ${h.rooms_available > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {h.rooms_available > 0 ? `${h.rooms_available} Available` : 'Full'}
                </span>
                <span className={`badge ${h.gender_preference === 'Girls Only' ? 'badge-danger' : h.gender_preference === 'Boys Only' ? 'badge-primary' : 'badge-accent'}`} style={{ position: 'absolute', top: 12, left: 12 }}>
                  {h.gender_preference || 'Co-ed'}
                </span>
              </div>
              <div className="hostel-body">
                <div className="flex items-center justify-between">
                  <h4 className="truncate" style={{ fontWeight: 700, fontSize: '1rem' }}>{h.title}</h4>
                  <span className="badge badge-muted text-xs">{TYPE_LABELS[h.type] || h.type}</span>
                </div>
                <div className="flex items-center gap-1 text-muted text-xs mt-1"><MapPin size={12} style={{ color: '#3b82f6' }} /> {h.location}</div>

                {/* Prominent Key Metric Grid */}
                <div className="p-3 my-3 rounded-lg flex flex-col gap-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="price" style={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: 800 }}>
                      Rs. {Number(h.price).toLocaleString()} <span className="text-muted text-xs font-normal">/{h.price_period || 'month'}</span>
                    </div>
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: h.rooms_available > 0 ? 'var(--primary)' : 'var(--danger)' }}>
                      🛏 {h.rooms_available > 0 ? `${h.rooms_available} rooms available` : 'Fully Occupied'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-accent flex items-center gap-1" style={{ color: '#3b82f6' }}>
                      📍 {h.distance_to_campus || '1.2 km from FAST'}
                    </span>
                    <span className="text-muted flex items-center gap-1">
                      🚶 ~15 min walk
                    </span>
                  </div>
                </div>

                {h.facilities && h.facilities.length > 0 && (
                  <div className="hostel-facilities mb-3">
                    {h.facilities.slice(0, 4).map(f => {
                      const Icon = FACILITY_ICONS[f] || Shield
                      return <span key={f} className="facility-chip"><Icon size={11} /> {f}</span>
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs text-muted font-medium">{h.furnishing_status || 'Fully Furnished'}</span>
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#3b82f6' }}>
                    View Residence <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
