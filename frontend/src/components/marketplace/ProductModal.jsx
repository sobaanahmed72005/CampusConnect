import { useState } from 'react'
import api from '../../lib/api'
import { X, Phone, Edit, Trash2, ShoppingBag, ShieldCheck, Flag, MapPin, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import MarketplaceForm from './MarketplaceForm'
import ConfirmModal from '../ui/ConfirmModal'
import ReportModal from './ReportModal'
import ContactModal from './ContactModal'

export default function ProductModal({ product, onClose, onUpdate }) {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [activeImage, setActiveImage] = useState(product.image_url || product.images?.[0] || null)

  const isOwner = user?.id === product.seller_id

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/marketplace/${product.id}`)
      toast.success('Listing deleted')
      onClose(); onUpdate()
    } catch { toast.error('Failed to delete') } finally { setDeleting(false); setShowConfirmDelete(false) }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleToggleSold = async () => {
    try {
      const res = await api.patch(`/marketplace/${product.id}/sold`)
      toast.success(res.data.message || 'Status updated!')
      onClose(); onUpdate()
    } catch {
      toast.error('Failed to update status')
    }
  }

  if (editing) return <MarketplaceForm initial={product} onClose={() => setEditing(false)} onSuccess={() => { setEditing(false); onClose(); onUpdate() }} />

  const images = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : [])

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <h3 id="product-modal-title">{product.title}</h3>
              <span className={`badge ${product.is_sold ? 'badge-danger' : 'badge-success'}`}>
                {product.is_sold ? 'SOLD' : 'Available'}
              </span>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close product details">
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            {/* Image Gallery */}
            <div>
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-surface)', height: '240px', border: '1px solid var(--border)' }}>
                {activeImage ? (
                  <img src={activeImage} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <ShoppingBag size={48} />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-2" style={{ overflowX: 'auto' }}>
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      style={{
                        width: 50, height: 50, borderRadius: 'var(--radius-sm)', overflow: 'hidden',
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

            {/* Product Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="flex items-center justify-between">
                <span className="badge badge-accent">{product.category}</span>
                <span className="badge badge-muted flex items-center gap-1"><Eye size={11} /> {product.views || 12} views</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="price">₹{Number(product.price).toLocaleString()}</span>
                <span className={`badge ${product.condition === 'New' ? 'badge-primary' : 'badge-muted'}`}>{product.condition}</span>
              </div>

              <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{product.description}</p>

              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>CAMPUS SELLER</div>
                <div className="flex items-center gap-2">
                  <div className="avatar avatar-sm">{product.seller_name?.[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }} className="flex items-center gap-1">
                      {product.seller_name} <ShieldCheck size={12} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="text-xs text-muted"><MapPin size={10} /> {product.location || 'Campus Main Library'}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', flexWrap: 'wrap' }}>
                {isOwner ? (
                  <>
                    <button
                      className={`btn btn-sm flex-1 ${product.is_sold ? 'btn-primary' : 'btn-outline'}`}
                      onClick={handleToggleSold}
                    >
                      {product.is_sold ? 'Mark Available' : 'Mark as Sold'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}><Edit size={14} /> Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowConfirmDelete(true)} disabled={deleting}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary flex-1" onClick={() => setShowContact(true)}>
                      <Phone size={14} /> Contact Seller
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => setShowReport(true)} title="Report Listing">
                      <Flag size={14} style={{ color: 'var(--danger)' }} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleDelete}
          title="Delete Marketplace Listing?"
          message={`Are you sure you want to delete "${product.title}"? This action cannot be undone.`}
          confirmText="Delete Listing"
          danger={true}
          loading={deleting}
        />
      )}

      {showReport && (
        <ReportModal productId={product.id} onClose={() => setShowReport(false)} />
      )}

      {showContact && (
        <ContactModal product={product} onClose={() => setShowContact(false)} />
      )}
    </>
  )
}
