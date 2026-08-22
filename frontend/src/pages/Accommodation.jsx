import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import {
  Building2, MapPin, Wifi, Wind, Utensils, Shield, Tv, Search, Layers, Car, Zap, ArrowRight,
  Heart, Check, X, SlidersHorizontal, Scale, Phone, PhoneCall
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import OptimizedImage from '../components/ui/OptimizedImage'
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

const TYPES = ['All', 'Single Room', 'Shared Room', 'Studio', 'Dorm', 'Apartment']
const GENDERS = ['All', 'Co-ed', 'Girls Only', 'Boys Only']
const SORTS = [
  { id: 'default', label: 'Default Sorting' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
]

export default function Accommodation() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roomType, setRoomType] = useState('All')
  const [gender, setGender] = useState('All')
  const [sort, setSort] = useState('default')
  const [savedHousing, setSavedHousing] = useState(new Set())
  const [compareItems, setCompareItems] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)

  useEffect(() => {
    fetchListings()
    loadSaved()
  }, [search, roomType, gender, sort])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (roomType !== 'All') params.set('type', roomType.toLowerCase().replace(' ', '_'))
      if (gender !== 'All') params.set('gender', gender)
      const res = await api.get(`/accommodation?${params}`)
      let items = res.data.listings || []

      if (sort === 'price_asc') {
        items = [...items].sort((a, b) => Number(a.price) - Number(b.price))
      } else if (sort === 'price_desc') {
        items = [...items].sort((a, b) => Number(b.price) - Number(a.price))
      }

      setListings(items)
    } catch { setListings([]) } finally { setLoading(false) }
  }

  const loadSaved = () => {
    try {
      const saved = localStorage.getItem('cc_saved_housing')
      if (saved) setSavedHousing(new Set(JSON.parse(saved)))
    } catch {}
  }

  const toggleSave = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    const next = new Set(savedHousing)
    if (next.has(id)) {
      next.delete(id)
      toast.success('Removed from saved housing')
    } else {
      next.add(id)
      toast.success('Saved to your housing wishlist! ❤️')
    }
    setSavedHousing(next)
    localStorage.setItem('cc_saved_housing', JSON.stringify([...next]))
  }

  const toggleCompare = (housing, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (compareItems.some(x => x.id === housing.id)) {
      setCompareItems(prev => prev.filter(x => x.id !== housing.id))
      toast.success('Removed from comparison')
    } else {
      if (compareItems.length >= 3) {
        toast.error('You can compare up to 3 housing listings at a time')
        return
      }
      setCompareItems(prev => [...prev, housing])
      toast.success('Added to side-by-side comparison ⚖️')
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Building2}
        title="Campus Accommodation 2.0"
        subtitle="Explore verified student dorms, hostels, private rooms, and apartments near university campus"
        iconColor="#3b82f6"
        action={
          compareItems.length > 0 && (
            <button className="btn btn-accent btn-sm" onClick={() => setShowCompareModal(true)}>
              <Scale size={14} /> Compare Selected ({compareItems.length})
            </button>
          )
        }
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

            {/* Price Sorting Filter */}
            <select className="form-input form-select" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto' }}>
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        }
      />

      {loading ? (
        <LoadingGrid count={6} height="360px" gridClass="grid-3" label="Loading student housing directory..." />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No housing listings found"
          description="Try adjusting your search query, gender preference, or room type filters."
        />
      ) : (
        <div className="grid-3 hostels-grid">
          {listings.map(h => {
            const isSaved = savedHousing.has(h.id)
            const isComparing = compareItems.some(x => x.id === h.id)
            return (
              <div key={h.id} className="hostel-card card card-hover glass-card" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                <Link to={`/accommodation/${h.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="hostel-img" style={{ position: 'relative' }}>
                    {h.image_url
                      ? <OptimizedImage src={h.image_url} alt={h.title} height="180px" />
                      : <div className="flex items-center justify-center h-full text-muted"><Building2 size={36} /></div>
                    }

                    {/* Bookmark Heart Action */}
                    <button
                      className={`btn btn-icon btn-xs ${isSaved ? 'btn-danger' : 'btn-ghost'}`}
                      style={{ position: 'absolute', top: 10, right: 10, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none' }}
                      onClick={(e) => toggleSave(h.id, e)}
                      title={isSaved ? 'Saved to wishlist' : 'Save housing'}
                    >
                      <Heart size={14} style={{ fill: isSaved ? 'var(--danger)' : 'none', color: isSaved ? 'var(--danger)' : '#fff' }} />
                    </button>

                    <span className={`badge hostel-availability ${h.rooms_available > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {h.rooms_available > 0 ? `${h.rooms_available} Available` : 'Full'}
                    </span>
                    <span className={`badge ${h.gender_preference === 'Girls Only' ? 'badge-danger' : h.gender_preference === 'Boys Only' ? 'badge-primary' : 'badge-accent'}`} style={{ position: 'absolute', top: 10, left: 10 }}>
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
                    <div className="p-3 my-3 rounded-lg flex flex-col gap-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <div className="price font-extrabold text-primary" style={{ fontSize: '1.1rem' }}>
                          PKR {Number(h.price || 0).toLocaleString()} <span className="text-muted text-xs font-normal">/{h.price_period || 'month'}</span>
                        </div>
                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: h.rooms_available > 0 ? 'var(--primary)' : 'var(--danger)' }}>
                          🛏 {h.rooms_available > 0 ? `${h.rooms_available} rooms` : 'Full'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium pt-1.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-accent flex items-center gap-1">
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
                  </div>
                </Link>

                <div className="p-4 pt-0 flex items-center justify-between">
                  <button
                    className={`btn btn-xs ${isComparing ? 'btn-accent' : 'btn-outline'}`}
                    onClick={(e) => toggleCompare(h, e)}
                  >
                    <Scale size={12} /> {isComparing ? 'Comparing' : 'Compare'}
                  </button>

                  <Link to={`/accommodation/${h.id}`} className="text-xs font-semibold text-primary flex items-center gap-1">
                    Details <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Side-by-Side Housing Comparison Modal */}
      {showCompareModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowCompareModal(false)}>
          <div className="modal glass-card modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px', padding: 'var(--space-6)' }}>
            <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="font-bold text-base flex items-center gap-2">
                <Scale size={18} className="text-accent" /> Side-by-Side Housing Comparison
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCompareModal(false)}><X size={18} /></button>
            </div>

            <div className="grid-3 gap-4">
              {compareItems.map(item => (
                <div key={item.id} className="card p-4 flex flex-col justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h4 className="font-bold text-sm mb-1 truncate">{item.title}</h4>
                    <div className="text-primary font-extrabold text-base mb-2">PKR {Number(item.price || 0).toLocaleString()} / mo</div>
                    
                    <div className="text-xs flex flex-col gap-1.5 mb-3">
                      <div>📍 Distance: <strong>{item.distance_to_campus || '1.2 km'}</strong></div>
                      <div>🚻 Gender: <strong>{item.gender_preference || 'Co-ed'}</strong></div>
                      <div>🛏 Type: <strong>{TYPE_LABELS[item.type] || item.type}</strong></div>
                      <div>Status: <strong>{item.rooms_available > 0 ? `${item.rooms_available} Available` : 'Full'}</strong></div>
                    </div>
                  </div>

                  <Link to={`/accommodation/${item.id}`} className="btn btn-primary btn-xs text-center w-full" onClick={() => setShowCompareModal(false)}>
                    View Residence
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
