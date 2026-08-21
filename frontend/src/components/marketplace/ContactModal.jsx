import React from 'react'
import { Phone, Mail, ShieldCheck, MapPin, Copy, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactModal({ product, onClose }) {
  const seller = product.seller || {}
  const phone = product.seller_phone || product.contact_info || '9876543210'
  const email = product.seller_email || `${product.seller_name?.toLowerCase().replace(' ', '.')}@campusconnect.edu`
  const dept = product.seller_department || 'Student'

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Contact Campus Seller</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Seller Trust Profile Badge */}
        <div className="flex items-center gap-3 p-4 mb-4" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg,#10b981,#6366f1)' }}>
            {product.seller_name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{product.seller_name}</span>
              <span className="badge badge-primary text-xs flex items-center gap-1">
                <ShieldCheck size={10} /> Verified Student
              </span>
            </div>
            <div className="text-xs text-muted mt-1">{dept} • Student ID: {product.seller_student_id || '2026-CS'}</div>
          </div>
        </div>

        {/* Product preview banner */}
        <div className="flex items-center justify-between p-3 mb-4" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{product.title}</div>
            <div className="text-xs text-muted">Asking: ₹{Number(product.price).toLocaleString()}</div>
          </div>
          <span className="badge badge-accent text-xs">{product.condition}</span>
        </div>

        {/* Contact Options */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Phone */}
          <div className="flex items-center justify-between p-3" style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Phone size={16} style={{ color: 'var(--primary)' }} />
              <div>
                <div className="text-xs text-muted">Phone / WhatsApp</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{phone}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => copyText(phone, 'Phone number')}>
                <Copy size={12} /> Copy
              </button>
              <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                WhatsApp <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-3" style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Mail size={16} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="text-xs text-muted">Campus Student Email</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{email}</div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => copyText(email, 'Student email')}>
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>

        {/* Campus Safety Notice */}
        <div className="p-3" style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 text-warning font-semibold text-xs mb-1">
            <ShieldCheck size={14} /> Campus Safety Guidelines
          </div>
          <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
            Always arrange trade meetups in public campus locations (e.g. Student Cafeteria, Central Library, or Hostel Lobby). Verify item condition before paying.
          </p>
        </div>

        <div className="mt-4 text-right">
          <button className="btn btn-outline" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
