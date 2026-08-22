import { useState, useEffect } from 'react'
import { Megaphone, X, Send } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { label: '🚨 Urgent Alert', value: '🚨 Urgent Alert' },
  { label: '📢 Official Announcement', value: '📢 Official Announcement' },
  { label: '🎓 Society Announcement', value: '🎓 Society Announcement' },
  { label: '🎉 Event Announcement', value: '🎉 Event Announcement' },
  { label: '📅 Event Update', value: '📅 Event Update' },
  { label: '🔔 General Update', value: '🔔 General Update' },
  { label: '💬 Community Notice', value: '💬 Community Notice' },
  { label: '🗣️ Rumours', value: '🗣️ Rumours' }
]

export default function AnnouncementModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('🔔 General Update')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      return toast.error('Please enter a title and message')
    }

    setLoading(true)
    try {
      const res = await api.post('/announcements', { title, message, category })
      toast.success(res.data.message || 'Campus announcement broadcasted successfully!')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title">
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-primary" />
            <h3>Broadcast Official Campus Announcement</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="form-label">Announcement Category</label>
            <select
              className="form-input form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Announcement Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Midterm Examination Schedule Released"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Announcement Message</label>
            <textarea
              className="form-input form-textarea"
              rows={4}
              placeholder="Enter announcement details for students..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={16} /> {loading ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
