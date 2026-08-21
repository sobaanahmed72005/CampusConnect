import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { ShoppingBag, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function AdminMarketplace() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetDelete, setTargetDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/marketplace?all=true')
      setProducts(res.data.products || [])
    } catch { setProducts([]) } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!targetDelete) return
    setDeleting(true)
    try {
      await api.delete(`/marketplace/${targetDelete.id}`)
      setProducts(p => p.filter(x => x.id !== targetDelete.id))
      toast.success('Listing removed by moderator')
    } catch { toast.error('Failed to remove listing') } finally { setDeleting(false); setTargetDelete(null) }
  }

  const filtered = products.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade">
      <PageHeader
        icon={ShoppingBag}
        title="Moderate Campus Marketplace"
        subtitle="Review, audit, and moderate active student marketplace listings"
        iconColor="var(--accent)"
        action={
          <div className="search-bar" style={{ maxWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search listings or seller..."
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
              <th>Item Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No marketplace listings found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.title}</td>
                <td><span className="badge badge-muted">{p.category}</span></td>
                <td className="price" style={{ fontSize: '0.875rem' }}>₹{Number(p.price).toLocaleString()}</td>
                <td className="text-muted">{p.seller_name}</td>
                <td>{p.condition}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setTargetDelete(p)}>
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
          title="Remove Marketplace Listing?"
          message={`Are you sure you want to remove the listing "${targetDelete.title}" by ${targetDelete.seller_name}? This moderation action will be recorded in the audit trail.`}
          confirmText="Remove Listing"
          danger={true}
          loading={deleting}
        />
      )}
    </div>
  )
}
