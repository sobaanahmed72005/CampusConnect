import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import {
  Megaphone, Plus, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2,
  Trash2, X, Send, Sparkles, AlertCircle, Info, Flag, User, Clock, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import LoadingGrid from '../components/ui/LoadingGrid'
import EmptyState from '../components/ui/EmptyState'

const CATEGORIES = [
  'All',
  '🚨 Urgent Alert',
  '📢 Official Announcement',
  '🎓 Society Announcement',
  '🎉 Event Announcement',
  '📅 Event Update',
  '🔔 General Update',
  '💬 Community Notice',
  '🗣️ Rumours'
]

export default function Notifications() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')

  // New Post Modal State
  const [showPostModal, setShowPostModal] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('💬 Community Notice')
  const [submitting, setSubmitting] = useState(false)

  // Expanded Comment Thread State
  const [expandedThreadId, setExpandedThreadId] = useState(null)
  const [commentsMap, setCommentsMap] = useState({})
  const [newCommentText, setNewCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [selectedCategory])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const url = selectedCategory === 'All'
        ? '/announcements?limit=50'
        : `/announcements?category=${encodeURIComponent(selectedCategory)}&limit=50`
      const res = await api.get(url)
      setAnnouncements(res.data.announcements || [])
    } catch {
      toast.error('Failed to load announcements feed')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)

    try {
      const res = await api.post('/announcements', { title, message, category })
      toast.success('Post published successfully!')
      setAnnouncements(prev => [res.data.announcement, ...prev])
      setShowPostModal(false)
      setTitle('')
      setMessage('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish post')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleThread = async (announcementId) => {
    if (expandedThreadId === announcementId) {
      setExpandedThreadId(null)
      return
    }

    setExpandedThreadId(announcementId)
    if (!commentsMap[announcementId]) {
      try {
        const res = await api.get(`/announcements/${announcementId}/comments`)
        setCommentsMap(prev => ({ ...prev, [announcementId]: res.data.comments || [] }))
      } catch {
        // Ignore comment fetch error
      }
    }
  }

  const handlePostComment = async (announcementId) => {
    if (!newCommentText.trim()) return
    setPostingComment(true)

    try {
      const res = await api.post(`/announcements/${announcementId}/comments`, {
        message: newCommentText.trim()
      })
      setCommentsMap(prev => ({
        ...prev,
        [announcementId]: [...(prev[announcementId] || []), res.data.comment]
      }))
      setNewCommentText('')
      toast.success('Reply added!')
    } catch (err) {
      toast.error('Failed to post reply')
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.delete(`/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Post deleted')
    } catch {
      toast.error('Failed to delete post')
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Megaphone}
        title="Announcements & Discussions"
        subtitle="Official campus alerts, society updates, event notifications, and interactive student community discussion threads"
        iconColor="var(--primary)"
        action={
          <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => setShowPostModal(true)}>
            <Plus size={16} /> New Discussion Post
          </button>
        }
      />

      {/* CATEGORY FILTER BAR */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
            style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ANNOUNCEMENTS & DISCUSSIONS FEED */}
      {loading ? (
        <LoadingGrid count={4} />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No posts found"
          description={`No active posts listed under category "${selectedCategory}". Be the first to start a conversation!`}
          action={
            <button className="btn btn-primary" onClick={() => setShowPostModal(true)}>
              <Plus size={16} /> Create Discussion Post
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map(item => {
            const isRumour = item.category === '🗣️ Rumours'
            const isUrgent = item.category === '🚨 Urgent Alert'
            const isOfficial = item.category === '📢 Official Announcement'
            const comments = commentsMap[item.id] || []
            const isExpanded = expandedThreadId === item.id

            return (
              <div
                key={item.id}
                className="card glass-card p-5"
                style={{
                  background: isRumour ? 'rgba(245, 158, 11, 0.04)' : isUrgent ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)',
                  border: isRumour ? '1px solid rgba(245, 158, 11, 0.3)' : isUrgent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base">{item.title}</span>

                    {/* Category Badge */}
                    <span className={`badge ${isUrgent ? 'badge-danger' : isOfficial ? 'badge-accent' : 'badge-primary'} text-xs font-semibold`}>
                      {item.category || '🔔 General Update'}
                    </span>

                    {/* Explicit Unverified Warning for Rumours */}
                    {isRumour && (
                      <span className="badge badge-warning text-xs font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Unverified / Student Rumour
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-muted flex items-center gap-1">
                    <Clock size={12} /> {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Body */}
                <p className="text-sm text-secondary mb-4" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {item.message}
                </p>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-medium flex items-center gap-1">
                      <User size={13} className="text-primary" /> Posted by: <strong style={{ color: 'var(--text-primary)' }}>{item.author_name || 'Campus Student'}</strong>
                    </span>

                    <button
                      className="btn btn-ghost btn-sm text-xs flex items-center gap-1.5"
                      onClick={() => toggleThread(item.id)}
                      style={{ color: 'var(--accent-light)' }}
                    >
                      <MessageSquare size={14} />
                      {isExpanded ? 'Hide Discussion' : `Discussion Thread (${comments.length})`}
                    </button>
                  </div>

                  <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeletePost(item.id)} title="Delete post">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* EXPANDED DISCUSSION COMMENT THREAD */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Student Community Comments ({comments.length})
                    </h4>

                    {/* Comments List */}
                    <div className="flex flex-col gap-2.5 mb-3" style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {comments.length === 0 ? (
                        <div className="text-xs text-muted p-3 text-center" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                          No comments yet. Start the conversation!
                        </div>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} className="p-3 rounded-md" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-primary">{c.author_name}</span>
                              <span className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-secondary">{c.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="form-input text-xs"
                        placeholder="Write a reply or join the discussion..."
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePostComment(item.id)}
                      />
                      <button
                        className="btn btn-primary btn-sm flex items-center gap-1"
                        onClick={() => handlePostComment(item.id)}
                        disabled={postingComment}
                      >
                        <Send size={13} /> Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE STUDENT POST MODAL */}
      {showPostModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowPostModal(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: 'var(--space-6)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Plus size={18} className="text-primary" /> Create Discussion or Announcement Post
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPostModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <div>
                <label className="form-label text-xs">Post Category</label>
                <select className="form-input text-xs" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs">Title / Subject</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. ACM Hackathon Team Formation or Library Timings Notice"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label text-xs">Message Details</label>
                <textarea
                  className="form-input text-xs"
                  rows={4}
                  placeholder="Share details, questions, or updates with fellow campus students..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
              </div>

              {category === '🗣️ Rumours' && (
                <div className="p-3" style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div className="text-xs font-bold text-warning flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> Unverified Rumour Warning
                  </div>
                  <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
                    Posts under 🗣️ Rumours are automatically tagged with an explicit <strong>Unverified / Student Rumour</strong> badge for transparency.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setShowPostModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-xs" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
