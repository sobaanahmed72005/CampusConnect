import { useState } from 'react'
import api from '../../lib/api'
import { X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Electronics','Books & Stationery','Fashion & Accessories','Furniture','Notes','Sports & Outdoors','Other']
const CONDITIONS = ['New','Like New','Good','Fair']

export default function MarketplaceForm({ onClose, onSuccess, initial }) {
  const [form, setForm] = useState(initial || { title:'', description:'', price:'', original_price:'', category:'', condition:'', contact_info:'' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || null)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Valid price is required'
    if (!form.category) e.category = 'Category is required'
    if (!form.condition) e.condition = 'Condition is required'
    if (!form.description.trim()) e.description = 'Description is required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (file) { setImageFile(file); setPreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => v && fd.append(k, v))
      if (imageFile) fd.append('image', imageFile)
      if (initial) await api.put(`/marketplace/${initial.id}`, fd, {headers:{'Content-Type':'multipart/form-data'}})
      else await api.post('/marketplace', fd, {headers:{'Content-Type':'multipart/form-data'}})
      toast.success(initial ? 'Listing updated!' : 'Item posted successfully!')
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save listing') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initial ? 'Edit Listing' : 'Post New Item'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Image Upload */}
          <div className="form-group">
            <label className="form-label">Product Image</label>
            <label className="upload-zone" style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'8px',border:'2px dashed var(--border)',borderRadius:'var(--radius-lg)',padding:'32px',cursor:'pointer',background:preview?'transparent':'var(--bg-input)',overflow:'hidden',position:'relative',minHeight:'140px'}}>
              {preview ? <img src={preview} alt="" style={{width:'100%',height:'140px',objectFit:'cover',borderRadius:'var(--radius-md)'}} /> : <><Upload size={24} style={{color:'var(--text-muted)'}}/><span className="text-sm text-muted">Click to upload image</span></>}
              <input type="file" accept="image/*" onChange={handleImage} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}} />
            </label>
          </div>

          <div className="grid-2" style={{gap:'12px'}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Title *</label>
              <input className={`form-input ${errors.title?'error':''}`} placeholder="e.g. Engineering Maths Textbook" value={form.title} onChange={e=>set('title',e.target.value)} />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Category *</label>
              <select className={`form-input form-select ${errors.category?'error':''}`} value={form.category} onChange={e=>set('category',e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>
          </div>

          <div className="grid-2" style={{gap:'12px', marginTop:'12px'}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Price (₹) *</label>
              <input className={`form-input ${errors.price?'error':''}`} type="number" placeholder="0" value={form.price} onChange={e=>set('price',e.target.value)} />
              {errors.price && <span className="form-error">{errors.price}</span>}
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Original Price (₹)</label>
              <input className="form-input" type="number" placeholder="Optional" value={form.original_price} onChange={e=>set('original_price',e.target.value)} />
            </div>
          </div>

          <div className="form-group mt-2">
            <label className="form-label">Condition *</label>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {CONDITIONS.map(c => (
                <button key={c} type="button"
                  className={`chip ${form.condition===c?'active':''}`}
                  onClick={()=>set('condition',c)}>{c}</button>
              ))}
            </div>
            {errors.condition && <span className="form-error">{errors.condition}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className={`form-input ${errors.description?'error':''}`} placeholder="Describe your item, including any defects or special features..." value={form.description} onChange={e=>set('description',e.target.value)} rows={3} />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Contact Info</label>
            <input className="form-input" placeholder="Phone number or preferred contact method" value={form.contact_info} onChange={e=>set('contact_info',e.target.value)} />
          </div>

          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-primary flex-1 ${loading?'btn-loading':''}`} disabled={loading}>
              {loading ? <><div className="spinner"/>{initial?'Updating...':'Posting...'}</> : initial ? '✓ Update Listing' : '🚀 Post Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
