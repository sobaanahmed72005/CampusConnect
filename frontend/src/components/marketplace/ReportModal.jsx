import React, { useState, useEffect } from 'react'
import { Flag, X } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ReportModal({ productId, onClose }) {
  const [reason, setReason] = useState('Inappropriate content')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/marketplace/${productId}/report`, { reason, details })
      toast.success('Listing reported. Thanks for keeping our campus marketplace safe!')
      onClose()
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3 id="report-modal-title" className="flex items-center gap-2">
            <Flag size={18} style={{ color: 'var(--danger)' }} /> Report Marketplace Listing
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close report dialog">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="report-reason-select">Reason for reporting</label>
            <select id="report-reason-select" className="form-input form-select" value={reason} onChange={e => setReason(e.target.value)}>
              <option value="Inappropriate content">Inappropriate / Offending Content</option>
              <option value="Prohibited campus item">Prohibited / Illegal Campus Item</option>
              <option value="Misleading price or photo">Misleading Price or Fake Photo</option>
              <option value="Spam or duplicated listing">Spam or Duplicate Listing</option>
              <option value="Non-student seller suspicion">Suspected Non-Student Seller</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="report-details-textarea">Additional Details (optional)</label>
            <textarea
              id="report-details-textarea"
              className="form-input"
              rows={3}
              placeholder="Describe the issue to campus moderators..."
              value={details}
              onChange={e => setDetails(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn btn-danger flex-1 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {loading ? <div className="spinner" /> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
