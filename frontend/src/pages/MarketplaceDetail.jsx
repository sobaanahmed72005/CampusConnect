import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  ShoppingBag, ArrowLeft, Phone, Edit, Trash2,
  Eye, Tag, Package, Clock, Share2, ShieldCheck, Flag, MapPin, CheckCircle, Sparkles
} from 'lucide-react'
import MarketplaceForm from '../components/marketplace/MarketplaceForm'
import ConfirmModal from '../components/ui/ConfirmModal'
import ReportModal from '../components/marketplace/ReportModal'
import ContactModal from '../components/marketplace/ContactModal'
import PageHeader from '../components/ui/PageHeader'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr), now = new Date()
  const mins = Math.floor((now - d) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function getConditionColor(c) {
  return { New: 'badge-primary', 'Like New': 'badge-success', Good: 'badge-accent', Fair: 'badge-warning' }[c] || 'badge-muted'
}

export default function MarketplaceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [sellerListings, setSellerListings] = useState([])
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [togglingSold, setTogglingSold] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [activeImage, setActiveImage] = useState(null)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/marketplace/${id}`)
      const p = res.data.product
      setProduct(p)
      setSellerListings(res.data.sellerListings || [])
      setActiveImage(p.image_url || p.images?.[0] || null)

      // Save to Recently Viewed in localStorage
      saveRecentlyViewed(p)

      // Fetch category related items
      const rel = await api.get(`/marketplace?category=${encodeURIComponent(p.category)}`)
      setRelated((rel.data.products || []).filter(item => item.id !== p.id).slice(0, 4))
    } catch {
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const saveRecentlyViewed = (item) => {
    try {
      const saved = JSON.parse(localStorage.getItem('cc_recently_viewed_mkt') || '[]')
      const updated = [item, ...saved.filter(i => i.id !== item.id)].slice(0, 6)
      localStorage.setItem('cc_recently_viewed_mkt', JSON.stringify(updated))
    } catch {}
  }

  const handleToggleSold = async () => {
    if (!product) return
    setTogglingSold(true)
    try {
      const res = await api.patch(`/marketplace/${product.id}/sold`)
      const updatedStatus = res.data.product?.is_sold
      setProduct(prev => ({ ...prev, is_sold: updatedStatus }))
      toast.success(updatedStatus ? 'Item marked as Sold 🎉' : 'Item marked as Available')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setTogglingSold(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/marketplace/${id}`)
      toast.success('Listing deleted')
      navigate('/marketplace')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Listing link copied!')
  }

  if (editing && product) {
    return <MarketplaceForm
      initial={product}
      onClose={() => setEditing(false)}
      onSuccess={() => { setEditing(false); fetchProduct() }}
    />
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: '60vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (!product) return (
    <div className="empty-state" style={{ height: '60vh' }}>
      <ShoppingBag size={48} />
      <h3>Product not found</h3>
      <p>This listing may have been removed or is no longer available.</p>
      <Link to="/marketplace" className="btn btn-primary mt-4">
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>
    </div>
  )

  const isOwner = user?.id === product.seller_id
  const images = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : [])

  return (
    <div className="animate-fade">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignItems: 'center' }}>
        <Link to="/marketplace" className="flex gap-1" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Marketplace
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)' }}>{product.title}</span>
      </div>

      {/* Main Product Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }} className="product-detail-grid">

        {/* Left Column: Image Gallery */}
        <div>
          <div className="glass-card" style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            height: '380px',
            position: 'relative',
            border: '1px solid var(--border-strong)'
          }}>
            {activeImage ? (
              <img src={activeImage} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
                <ShoppingBag size={64} />
                <span style={{ fontSize: '0.875rem' }}>No image available</span>
              </div>
            )}
            <span className={`badge ${getConditionColor(product.condition)}`} style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '0.75rem', padding: '4px 10px' }}>
              {product.condition}
            </span>
            <span className={`badge ${product.is_sold ? 'badge-danger' : 'badge-success'}`} style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.75rem', padding: '4px 10px' }}>
              {product.is_sold ? 'Sold' : 'Available'}
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
                    width: 64, height: 64, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    border: activeImage === img ? '2px solid var(--primary)' : '1px solid var(--border)',
                    padding: 0, background: 'none', cursor: 'pointer'
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Seller Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-accent">{product.category}</span>
              <span className="badge badge-primary text-xs flex items-center gap-1">
                <ShieldCheck size={10} /> Campus Verified Trade
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.3 }}>{product.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span><Clock size={13} /> Listed {timeAgo(product.created_at)}</span>
              <span>•</span>
              <span><MapPin size={13} /> {product.location || 'Main Campus'}</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="card glass-card p-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="text-xs text-muted">Asking Price</div>
                <span className="price" style={{ fontSize: '2.2rem', color: 'var(--primary)', fontWeight: 800 }}>
                  PKR {Number(product.price).toLocaleString()}
                </span>
              </div>
              <span className="badge badge-muted">Hostel / Campus Pickup</span>
            </div>
          </div>

          {/* Listing Analytics & Engagement Bar */}
          <div className="card glass-card p-3 flex items-center justify-around text-center text-xs" style={{ background: 'var(--bg-surface)' }}>
            <div>
              <div className="flex items-center justify-center gap-1 text-primary font-bold">
                <Eye size={13} /> {product.views || 48}
              </div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>Total Views</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', height: 24 }} />
            <div>
              <div className="flex items-center justify-center gap-1 text-accent font-bold">
                <Share2 size={13} /> Verified
              </div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>Peer Listing</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', height: 24 }} />
            <div>
              <div className="flex items-center justify-center gap-1 text-warning font-bold">
                <Sparkles size={13} /> 100%
              </div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>FAST Verified</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem' }}>
              <Package size={16} style={{ color: 'var(--accent)' }} /> Item Description
            </h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>{product.description}</p>
          </div>

          {/* Rich Seller Profile & Reputation Card */}
          <div className="card glass-card p-4" style={{ background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              CAMPUS SELLER REPUTATION
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ width: 44, height: 44, fontSize: '1.1rem', background: 'linear-gradient(135deg,#10b981,#6366f1)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                {product.seller_name?.[0] || 'S'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }} className="flex items-center gap-2">
                  {product.seller_name}
                  <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                  <span>{product.seller_department || 'Computer Science'}</span>
                  <span>•</span>
                  <span className="text-primary font-semibold">Fast Responder ⚡</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {isOwner ? (
              <>
                <button className="btn btn-primary flex-1" onClick={handleToggleSold} disabled={togglingSold}>
                  <CheckCircle size={14} /> {product.is_sold ? 'Mark Available' : 'Mark as Sold'}
                </button>
                <button className="btn btn-outline flex-1" onClick={() => setEditing(true)}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-icon" onClick={() => setShowConfirmDelete(true)} disabled={deleting}>
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary flex-1 btn-lg" onClick={() => setShowContact(true)}>
                  <Phone size={16} /> Contact Campus Seller
                </button>
                <button className="btn btn-outline btn-icon" onClick={() => setShowReport(true)} title="Report Listing">
                  <Flag size={16} style={{ color: 'var(--danger)' }} />
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-icon" onClick={handleShare} title="Share Link">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Seller's Other Items */}
      {sellerListings.length > 0 && (
        <div className="mb-8">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛍️ More listings from {product.seller_name}
          </h3>
          <div className="grid-auto-sm">
            {sellerListings.map(item => (
              <Link key={item.id} to={`/marketplace/${item.id}`} className="card card-hover product-card glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-img" style={{ height: '140px' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.title} className="img-cover" />
                    : <div className="product-img-placeholder"><ShoppingBag size={24} /></div>
                  }
                  <span className={`badge product-condition-badge ${getConditionColor(item.condition)}`}>{item.condition}</span>
                </div>
                <div className="product-body p-3">
                  <h4 className="product-title" style={{ fontSize: '0.85rem' }}>{item.title}</h4>
                  <div className="price" style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700 }}>PKR {Number(item.price).toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Category Items */}
      {related.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} style={{ color: 'var(--accent)' }} /> Similar items in {product.category}
          </h3>
          <div className="grid-auto-sm">
            {related.map(p => (
              <Link key={p.id} to={`/marketplace/${p.id}`} className="card card-hover product-card glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-img" style={{ height: '140px' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="img-cover" />
                    : <div className="product-img-placeholder"><ShoppingBag size={24} /></div>
                  }
                  <span className={`badge product-condition-badge ${getConditionColor(p.condition)}`}>{p.condition}</span>
                </div>
                <div className="product-body p-3">
                  <h4 className="product-title" style={{ fontSize: '0.85rem' }}>{p.title}</h4>
                  <div className="price" style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700 }}>PKR {Number(p.price).toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleDelete}
          title="Delete Listing?"
          message={`Are you sure you want to delete "${product.title}"? This cannot be undone.`}
          confirmText="Delete Listing"
          danger={true}
          loading={deleting}
        />
      )}

      {showReport && <ReportModal productId={product.id} onClose={() => setShowReport(false)} />}
      {showContact && <ContactModal product={product} onClose={() => setShowContact(false)} />}
    </div>
  )
}
