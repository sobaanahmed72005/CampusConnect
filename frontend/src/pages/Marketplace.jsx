import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { ShoppingBag, Plus, Eye, ShieldCheck, MapPin, ArrowUpDown, Filter, Edit, Trash2, CheckCircle, RefreshCw, Package } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import LoadingGrid, { TableSkeleton } from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import ConfirmModal from '../components/ui/ConfirmModal'
import MarketplaceForm from '../components/marketplace/MarketplaceForm'
import ProductModal from '../components/marketplace/ProductModal'
import OptimizedImage from '../components/ui/OptimizedImage'
import Pagination from '../components/ui/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import './Marketplace.css'

const CATEGORIES = ['All', 'Electronics', 'Books & Stationery', 'Fashion & Accessories', 'Furniture', 'Notes', 'Sports & Outdoors', 'Other']
const CONDITIONS = ['All', 'New', 'Like New', 'Good', 'Fair']
const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' }
]
const STATUS_OPTIONS = [
  { label: 'Available Only', value: 'available' },
  { label: 'All Items (Inc. Sold)', value: 'all' },
  { label: 'Sold Items', value: 'sold' }
]

export default function Marketplace() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [myListings, setMyListings] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'my_listings'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [category, setCategory] = useState('All')
  const [condition, setCondition] = useState('All')
  const [sort, setSort] = useState('newest')
  const [status, setStatus] = useState('available')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 })
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, condition, sort, status])

  useEffect(() => {
    if (activeTab === 'all') {
      fetchProducts()
    } else {
      fetchMyListings()
    }
  }, [debouncedSearch, category, condition, sort, status, activeTab, page])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (category !== 'All') params.set('category', category)
      if (condition !== 'All') params.set('condition', condition)
      if (sort) params.set('sort', sort)
      if (status) params.set('status', status)
      params.set('page', page)
      params.set('limit', 12)

      const res = await api.get(`/marketplace?${params}`)
      setProducts(res.data.products || [])
      if (res.data.pagination) {
        setPagination(res.data.pagination)
      }
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't load marketplace listings. Try again.")
      setProducts([])
    } finally { setLoading(false) }
  }

  const fetchMyListings = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/marketplace?seller_id=${user.id}&status=all`)
      setMyListings(res.data.products || [])
    } catch (err) {
      setError("Failed to load your listings.")
      setMyListings([])
    } finally { setLoading(false) }
  }

  const handleToggleSold = async (id) => {
    // Optimistically update local UI state immediately for zero perceived latency
    const updateList = (list) =>
      list.map((item) => (item.id === id ? { ...item, is_sold: !item.is_sold } : item))

    const prevMyListings = myListings
    const prevProducts = products

    setMyListings(updateList)
    setProducts(updateList)
    toast.success('Status updated!')

    try {
      await api.patch(`/marketplace/${id}/sold`)
    } catch (err) {
      // Rollback state if background request fails
      setMyListings(prevMyListings)
      setProducts(prevProducts)
      toast.error('Failed to update status — changes reverted.')
    }
  }

  const handleDeleteListing = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/marketplace/${deleteId}`)
      toast.success('Listing deleted permanently')
      setDeleteId(null)
      if (activeTab === 'my_listings') fetchMyListings()
      else fetchProducts()
    } catch (err) {
      toast.error('Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={ShoppingBag}
        title="Campus Marketplace"
        subtitle="Buy and sell textbooks, gadgets, furniture, and notes directly with verified students"
        iconColor="var(--accent)"
        action={
          <button className="btn btn-accent" onClick={() => { setEditingProduct(null); setShowForm(true) }}>
            <Plus size={16} /> List an Item
          </button>
        }
      />

      {/* View Toggle Tabs */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <ShoppingBag size={15} /> All Marketplace Listings
        </button>
        <button
          className={`tab ${activeTab === 'my_listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_listings')}
        >
          <Package size={15} /> My Listings ({myListings.length})
        </button>
      </div>

      {/* Trust & Safety Banner */}
      {activeTab === 'all' && (
        <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-4) var(--space-6)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div style={{ background: 'var(--accent-50)', padding: 10, borderRadius: 'var(--radius-md)', color: 'var(--accent)' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
                  100% Student-to-Student Campus Trading
                  <span className="badge badge-accent text-xs">Verified Campus ID</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Meet safely at campus hotspots (Library, Canteen, Student Union). No shipping fees!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar for All Listings */}
      {activeTab === 'all' && (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search textbooks, electronics, notes..."
          categories={CATEGORIES}
          activeCategory={category}
          onCategoryChange={setCategory}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted" />
              <select className="form-input form-select text-xs" style={{ width: 'auto', padding: '6px 28px 6px 10px' }} value={condition} onChange={e => setCondition(e.target.value)}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-muted" />
              <select className="form-input form-select text-xs" style={{ width: 'auto', padding: '6px 28px 6px 10px' }} value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <select className="form-input form-select text-xs" style={{ width: 'auto', padding: '6px 28px 6px 10px' }} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
            </select>
          </div>
        </FilterBar>
      )}

      {/* ALL LISTINGS TAB */}
      {activeTab === 'all' ? (
        loading ? (
          <LoadingGrid count={8} height="320px" gridClass="grid-auto" label="Loading marketplace listings..." />
        ) : error ? (
          <ErrorState
            title="We couldn't load marketplace listings"
            message={error}
            onRetry={fetchProducts}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No products found"
            description="Try adjusting your search criteria or be the first to list an item for sale!"
            action={
              <button className="btn btn-accent" onClick={() => { setEditingProduct(null); setShowForm(true) }}>
                <Plus size={16} /> Sell an Item
              </button>
            }
          />
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid-auto marketplace-grid">
              {products.map(product => (
                <div key={product.id} className={`product-card card card-hover ${product.is_sold ? 'product-sold' : ''}`}>
                  <div className="product-card-img">
                    {product.image_url
                      ? <OptimizedImage src={product.image_url} alt={product.title} height="180px" />
                      : <div className="product-card-img-placeholder"><ShoppingBag size={32} /></div>
                    }
                    <span className="badge badge-accent product-card-badge">{product.category}</span>
                    {product.is_sold && <span className="product-sold-overlay">SOLD</span>}
                    <span className="product-condition-badge">{product.condition}</span>
                  </div>
                  <div className="product-card-body">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="product-card-title truncate">{product.title}</h4>
                      <span className="price">₹{Number(product.price).toLocaleString()}</span>
                    </div>
                    <p className="product-card-desc clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-auto text-xs text-muted">
                      <span>Seller: {product.seller_name}</span>
                      <span>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <button className="btn btn-outline btn-sm flex-1" onClick={() => setSelectedProduct(product)}>
                        <Eye size={14} /> View Item
                      </button>
                      {user && user.id === product.seller_id && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleToggleSold(product.id)}
                          title={product.is_sold ? 'Mark Available' : 'Mark Sold'}
                        >
                          {product.is_sold ? <RefreshCw size={14} className="text-success" /> : <CheckCircle size={14} className="text-warning" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setPage}
            />
          </>
        )
      ) : (
        /* MY LISTINGS MANAGEMENT TAB */
        loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState title="Failed to load your listings" message={error} onRetry={fetchMyListings} />
        ) : myListings.length === 0 ? (
          <EmptyState
            icon={Package}
            title="You haven't listed any items yet"
            description="Post textbooks, gadgets, or notes to start earning directly on campus!"
            action={
              <button className="btn btn-accent" onClick={() => { setEditingProduct(null); setShowForm(true) }}>
                <Plus size={16} /> List Your First Item
              </button>
            }
          />
        ) : (
          <div className="table-wrapper animate-fade">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myListings.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)', flexShrink: 0 }}>
                          {item.image_url ? <img src={item.image_url} alt="" className="img-cover" /> : <ShoppingBag size={18} className="m-auto text-muted" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                          <div className="text-xs text-muted"><MapPin size={10} /> {item.location || 'Campus'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-accent text-xs">{item.category}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{Number(item.price).toLocaleString()}</td>
                    <td><span className="text-xs text-muted">{item.condition}</span></td>
                    <td>
                      <span className={`badge ${item.is_sold ? 'badge-danger' : 'badge-success'} text-xs`}>
                        {item.is_sold ? 'Sold' : 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/marketplace/${item.id}`} className="btn btn-ghost btn-icon btn-sm" title="View Listing">
                          <Eye size={14} />
                        </Link>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleToggleSold(item.id)}
                          title={item.is_sold ? 'Mark Available' : 'Mark as Sold'}
                        >
                          {item.is_sold ? <RefreshCw size={14} className="text-success" /> : <CheckCircle size={14} className="text-warning" />}
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => { setEditingProduct(item); setShowForm(true) }}
                          title="Edit Listing"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm text-danger"
                          onClick={() => setDeleteId(item.id)}
                          title="Delete Listing"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showForm && (
        <MarketplaceForm
          initial={editingProduct}
          onClose={() => { setShowForm(false); setEditingProduct(null) }}
          onSuccess={() => {
            setShowForm(false)
            setEditingProduct(null)
            if (activeTab === 'my_listings') fetchMyListings()
            else fetchProducts()
          }}
        />
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={() => {
            if (activeTab === 'my_listings') fetchMyListings()
            else fetchProducts()
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteListing}
        title="Delete Marketplace Listing"
        message="Are you sure you want to permanently delete this listing? This action cannot be undone and image files will be removed."
        confirmText="Delete Listing"
        danger={true}
        loading={deleting}
      />
    </div>
  )
}
