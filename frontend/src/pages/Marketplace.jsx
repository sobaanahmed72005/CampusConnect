import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { ShoppingBag, Plus, Eye, ShieldCheck, MapPin, ArrowUpDown, Filter, Edit, Trash2, CheckCircle, RefreshCw, Package, Heart, History, Bookmark, Sparkles } from 'lucide-react'
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
import ContextualGuideBanner from '../components/ui/ContextualGuideBanner'
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
  const [savedProducts, setSavedProducts] = useState([])
  const [myListings, setMyListings] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [savedSearches, setSavedSearches] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'saved' | 'my_listings'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [category, setCategory] = useState('All')
  const [condition, setCondition] = useState('All')
  const [sort, setSort] = useState('newest')
  const [status, setStatus] = useState('available')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
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
    loadLocalState()
  }, [])

  const loadLocalState = () => {
    try {
      const rv = localStorage.getItem('cc_recently_viewed_mkt')
      if (rv) setRecentlyViewed(JSON.parse(rv))

      const ss = localStorage.getItem('cc_saved_searches_mkt')
      if (ss) setSavedSearches(JSON.parse(ss))
    } catch {}
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, condition, sort, status])

  useEffect(() => {
    if (activeTab === 'all') {
      fetchProducts()
    } else if (activeTab === 'saved') {
      fetchSavedProducts()
    } else {
      fetchMyListings()
    }
  }, [debouncedSearch, category, condition, sort, status, activeTab, page])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (category !== 'All') params.append('category', category)
      if (condition !== 'All') params.append('condition', condition)
      if (sort) params.append('sort', sort)
      if (status !== 'all') params.append('status', status)
      params.append('page', page)
      params.append('limit', 12)

      const res = await api.get(`/marketplace?${params.toString()}`)
      setProducts(res.data.products || [])
      setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/marketplace/favorites/my?page=${page}&limit=12`)
      setSavedProducts(res.data.favorites || [])
      setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load saved items')
      setSavedProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMyListings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/marketplace/my/listings')
      setMyListings(res.data.listings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your listings')
      setMyListings([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (product, e) => {
    if (e) e.stopPropagation()
    try {
      if (product.is_favorite) {
        await api.delete(`/marketplace/${product.id}/favorite`)
        toast.success('Removed from saved items')
      } else {
        await api.post(`/marketplace/${product.id}/favorite`)
        toast.success('Saved to your favorites')
      }

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_favorite: !p.is_favorite } : p))
      if (activeTab === 'saved') fetchSavedProducts()
    } catch (err) {
      toast.error('Failed to update favorite status')
    }
  }

  const handleToggleSold = async (productId) => {
    try {
      const res = await api.patch(`/marketplace/${productId}/sold`)
      const updatedStatus = res.data.product?.is_sold
      toast.success(updatedStatus ? 'Marked as Sold 🎉' : 'Marked as Available')
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_sold: updatedStatus } : p))
      setMyListings(prev => prev.map(p => p.id === productId ? { ...p, is_sold: updatedStatus } : p))
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleSaveSearch = () => {
    if (!search && category === 'All' && condition === 'All') {
      toast.error('Apply a search term or filter to save')
      return
    }
    const title = search ? `Search: ${search}` : `${category} (${condition})`
    const preset = { title, search, category, condition, sort }
    const updated = [preset, ...savedSearches.filter(s => s.title !== title)].slice(0, 5)
    setSavedSearches(updated)
    localStorage.setItem('cc_saved_searches_mkt', JSON.stringify(updated))
    toast.success('Search preset saved!')
  }

  const handleDeleteListing = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/marketplace/${deleteId}`)
      toast.success('Listing deleted permanently')
      setDeleteId(null)
      if (activeTab === 'my_listings') fetchMyListings()
      else if (activeTab === 'saved') fetchSavedProducts()
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
        title="Campus Marketplace 2.0"
        subtitle="Buy and sell textbooks, gadgets, furniture, and notes directly with verified campus students"
        iconColor="var(--accent)"
        action={
          <button className="btn btn-accent" onClick={() => { setEditingProduct(null); setShowForm(true) }}>
            <Plus size={16} /> List an Item
          </button>
        }
      />

      <ContextualGuideBanner
        id="marketplace"
        title="Marketplace Trading Pro-Tip"
        message="Meet in well-lit public campus spots (e.g. Student Center or Library Cafeteria). Verify @nu.edu.pk profiles before trading."
        icon={ShieldCheck}
        color="var(--accent)"
        bg="var(--accent-50)"
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
          className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <Heart size={15} /> Saved Items
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
        <div className="card glass-card mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))', border: '1px solid var(--border-strong)', padding: 'var(--space-4) var(--space-6)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div style={{ background: 'var(--accent-50)', padding: 10, borderRadius: 'var(--radius-md)', color: 'var(--accent)' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
                  100% Verified Student-to-Student Campus Trading
                  <span className="badge badge-accent text-xs">Verified Student ID</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Meet safely at campus hotspots (Library, Canteen, Student Union). Zero shipping fees!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar for All Listings */}
      {activeTab === 'all' && (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search textbooks, electronics, notes..."
            categories={CATEGORIES}
            activeCategory={category}
            onCategoryChange={setCategory}
          >
            <div className="flex items-center gap-2">
              <select className="form-input form-select text-xs" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              <button
                className={`btn btn-xs ${showMoreFilters || condition !== 'All' || status !== 'available' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowMoreFilters(v => !v)}
              >
                <Filter size={12} /> Filters
                {(condition !== 'All' || status !== 'available') && <span className="badge badge-accent text-xs ml-1" style={{ padding: '1px 5px' }}>•</span>}
              </button>

              <button className="btn btn-ghost btn-xs" onClick={handleSaveSearch} title="Save search preset">
                <Bookmark size={12} />
              </button>
            </div>
          </FilterBar>

          {/* Collapsible Advanced Filters Panel */}
          {showMoreFilters && (
            <div className="card glass-card p-3 mb-6 flex items-center justify-between gap-4 flex-wrap animate-fade" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Condition:</span>
                  <select className="form-input form-select text-xs" style={{ width: 'auto' }} value={condition} onChange={e => setCondition(e.target.value)}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Availability:</span>
                  <select className="form-input form-select text-xs" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                </div>
              </div>

              {(condition !== 'All' || status !== 'available') && (
                <button className="btn btn-ghost btn-xs text-danger font-semibold" onClick={() => { setCondition('All'); setStatus('available') }}>
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </>
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
                <div key={product.id} className={`product-card card card-hover glass-card ${product.is_sold ? 'product-sold' : ''}`}>
                  <div className="product-card-img">
                    {product.image_url
                      ? <OptimizedImage src={product.image_url} alt={product.title} height="180px" />
                      : <div className="product-card-img-placeholder"><ShoppingBag size={32} /></div>
                    }
                    <button
                      className={`favorite-btn ${product.is_favorite ? 'favorited' : ''}`}
                      onClick={(e) => handleToggleFavorite(product, e)}
                      aria-label={product.is_favorite ? 'Remove from favorites' : 'Save to favorites'}
                      title={product.is_favorite ? 'Remove from favorites' : 'Save to favorites'}
                    >
                      <Heart size={16} fill={product.is_favorite ? 'var(--accent)' : 'none'} stroke={product.is_favorite ? 'var(--accent)' : 'currentColor'} />
                    </button>
                    <span className="badge badge-accent product-card-badge">{product.category}</span>
                    {product.is_sold && <span className="product-sold-overlay">SOLD</span>}
                    <span className="product-condition-badge">{product.condition}</span>
                  </div>
                  <div className="product-card-body p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="product-card-title truncate font-bold text-sm">{product.title}</h4>
                      <span className="price font-bold text-sm" style={{ color: 'var(--primary)' }}>PKR {Number(product.price).toLocaleString()}</span>
                    </div>
                    <p className="product-card-desc clamp-2 text-xs text-muted mt-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted">
                      <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-primary" /> {product.seller_name}</span>
                      <span>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <Link to={`/marketplace/${product.id}`} className="btn btn-outline btn-sm flex-1 text-center" style={{ textDecoration: 'none' }}>
                        <Eye size={14} /> View Details
                      </Link>
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
      ) : activeTab === 'saved' ? (
        /* SAVED ITEMS TAB */
        loading ? (
          <LoadingGrid count={4} height="320px" gridClass="grid-auto" label="Loading saved items..." />
        ) : error ? (
          <ErrorState title="Couldn't load saved items" message={error} onRetry={fetchSavedProducts} />
        ) : savedProducts.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            description="Click the heart icon on any marketplace listing to save items for later reference!"
            action={
              <button className="btn btn-outline" onClick={() => setActiveTab('all')}>
                Browse Marketplace
              </button>
            }
          />
        ) : (
          <>
            <div className="grid-auto marketplace-grid">
              {savedProducts.map(product => (
                <div key={product.id} className={`product-card card card-hover glass-card ${product.is_sold ? 'product-sold' : ''}`}>
                  <div className="product-card-img">
                    {product.image_url
                      ? <OptimizedImage src={product.image_url} alt={product.title} height="180px" />
                      : <div className="product-card-img-placeholder"><ShoppingBag size={32} /></div>
                    }
                    <button
                      className="favorite-btn favorited"
                      onClick={(e) => handleToggleFavorite(product, e)}
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                    >
                      <Heart size={16} fill="var(--accent)" stroke="var(--accent)" />
                    </button>
                    <span className="badge badge-accent product-card-badge">{product.category}</span>
                    {product.is_sold && <span className="product-sold-overlay">SOLD</span>}
                    <span className="product-condition-badge">{product.condition}</span>
                  </div>
                  <div className="product-card-body p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="product-card-title truncate font-bold text-sm">{product.title}</h4>
                      <span className="price font-bold text-sm" style={{ color: 'var(--primary)' }}>PKR {Number(product.price).toLocaleString()}</span>
                    </div>
                    <p className="product-card-desc clamp-2 text-xs text-muted mt-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted">
                      <span>Seller: {product.seller_name}</span>
                      <span>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <Link to={`/marketplace/${product.id}`} className="btn btn-outline btn-sm flex-1 text-center" style={{ textDecoration: 'none' }}>
                        <Eye size={14} /> View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
          <div className="table-responsive glass-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Category</th>
                  <th>Asking Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myListings.map(item => (
                  <tr key={item.id}>
                    <td className="font-bold text-sm">{item.title}</td>
                    <td><span className="badge badge-accent text-xs">{item.category}</span></td>
                    <td className="font-bold" style={{ color: 'var(--primary)' }}>PKR {Number(item.price).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${item.is_sold ? 'badge-danger' : 'badge-success'} text-xs`}>
                        {item.is_sold ? 'Sold' : 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleToggleSold(item.id)} title="Toggle Sold Status">
                          <CheckCircle size={14} className={item.is_sold ? 'text-danger' : 'text-success'} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingProduct(item); setShowForm(true) }} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setDeleteId(item.id)} title="Delete">
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

      {/* RECENTLY VIEWED ITEMS ROW */}
      {activeTab === 'all' && recentlyViewed.length > 0 && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', items: 'center', gap: '8px', fontSize: '1rem' }}>
            <History size={16} className="text-primary" /> Recently Viewed Items
          </h3>
          <div className="grid-auto-sm">
            {recentlyViewed.map(item => (
              <Link key={item.id} to={`/marketplace/${item.id}`} className="card card-hover product-card glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-img" style={{ height: '120px' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.title} className="img-cover" />
                    : <div className="product-img-placeholder"><ShoppingBag size={20} /></div>
                  }
                  <span className="badge product-condition-badge text-xs">{item.condition}</span>
                </div>
                <div className="product-body p-2">
                  <h4 className="product-title truncate" style={{ fontSize: '0.8rem' }}>{item.title}</h4>
                  <div className="price font-bold" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>PKR {Number(item.price).toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={fetchProducts}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteListing}
          title="Delete Listing?"
          message="Are you sure you want to permanently delete this listing? This action cannot be undone."
          confirmText="Delete Permanently"
          danger={true}
          loading={deleting}
        />
      )}
    </div>
  )
}
