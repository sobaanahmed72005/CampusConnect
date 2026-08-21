import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  danger = true,
  loading = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 id="confirm-modal-title" className="flex items-center gap-2" style={{ fontSize: '1.1rem' }}>
            <AlertTriangle size={20} style={{ color: danger ? 'var(--danger)' : 'var(--warning)' }} />
            {title || 'Confirm Action'}
          </h3>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div className="flex gap-3 mt-6">
          <button type="button" className="btn btn-outline flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'} flex-1 ${loading ? 'btn-loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <div className="spinner" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
