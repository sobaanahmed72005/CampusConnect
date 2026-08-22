import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Megaphone, Plus, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2,
  Trash2, X, Send, Sparkles, AlertCircle, Info, Flag, User, Clock, Filter,
  Search, Pin, Calendar, MapPin, ExternalLink, Image as ImageIcon
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
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // New Post Modal State
  const [showPostModal, setShowPostModal] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('💬 Community Notice')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Expanded Comment Thread State
  const [expandedThreadId, setExpandedThreadId] = useState(null)
  const [commentsMap, setCommentsMap] = useState({})
  const [newCommentText, setNewCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    document.title = 'Announcements & Discussions | CampusConnect'
    fetchAnnouncements()
  }, [selectedCategory, sortBy])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'All') params.append('category', selectedCategory)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (sortBy) params.append('sort', sortBy)

      const res = await api.get(`/announcements?${params.toString()}`)
      setAnnouncements(res.data.announcements || [])
    } catch {
      toast.error('Failed to load announcements feed')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchAnnouncements()
  }

  const isEventCategory = category === '🎉 Event Announcement' || category === '📅 Event Update'
  const canPin = user?.role === 'admin' && (category === '🚨 Urgent Alert' || category === '📢 Official Announcement')

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)

    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        category,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        event_date: isEventCategory && eventDate ? eventDate : null,
        event_location: isEventCategory && eventLocation.trim() ? eventLocation.trim() : null,
        is_pinned: canPin ? isPinned : false
      }

      const res = await api.post('/announcements', payload)
      toast.success('Post published successfully!')
      setAnnouncements(prev => [res.data.announcement, ...prev])
      setShowPostModal(false)

      // Reset form
      setTitle('')
      setMessage('')
      setImageUrl('')
      setLinkUrl('')
      setEventDate('')
      setEventLocation('')
      setIsPinned(false)
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
    if (newCommentText.trim().length > 500) {
      return toast.error('Comment cannot exceed 500 characters')
    }
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

  const handleDeleteComment = async (announcementId, commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await api.delete(`/announcements/${announcementId}/comments/${commentId}`)
      setCommentsMap(prev => ({
        ...prev,
        [announcementId]: prev[announcementId].filter(c => c.id !== commentId)
      }))
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleReportComment = async (announcementId, commentId) => {
    try {
      await api.post(`/announcements/${announcementId}/comments/${commentId}/report`)
      toast.success('Comment reported to moderators for review')
    } catch {
      toast.error('Failed to report comment')
    }
  }

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this discussion post?')) return
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
        subtitle="Campus announcements, society updates, event notifications, and interactive student community discussion threads"
        iconColor="var(--primary)"
        action={
          <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => setShowPostModal(true)}>
            <Plus size={16} /> New Discussion Post
          </button>
        }
      />

      {/* SEARCH AND SORT BAR */}
      <div className="card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'var(--bg-surface)' }}>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1" style={{ minWidth: 260 }}>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              className="form-input pl-9 text-xs"
              placeholder="Search announcements or discussions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-outline btn-sm text-xs">Search</button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-bold">Sort:</span>
          <select className="form-input text-xs" style={{ width: 130 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

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
          title="No posts match your filter"
          description={`No discussions found under category "${selectedCategory}"${searchQuery ? ` matching "${searchQuery}"` : ''}. Be the first to start a conversation!`}
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
                {/* Pinned Badge Indicator */}
                {item.is_pinned && (
                  <div className="flex items-center gap-1 text-xs font-bold text-primary mb-2">
                    <Pin size={13} /> Pinned Announcement
                  </div>
                )}

                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base">{item.title}</span>

                    {/* Category Badge */}
                    <span className={`badge ${isUrgent ? 'badge-danger' : isOfficial ? 'badge-accent' : 'badge-primary'} text-xs font-semibold`}>
                      {item.category || '🔔 General Update'}
                    </span>

                    {/* Explicit Rumour Warning Badge */}
                    {isRumour && (
                      <span className="badge badge-warning text-xs font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> 🗣️ Rumours — Unverified / Student Rumour
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-muted flex items-center gap-1">
                    <Clock size={12} /> {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Event Details (Visible only for Event Announcement / Event Update) */}
                {(item.category === '🎉 Event Announcement' || item.category === '📅 Event Update') && (item.event_date || item.event_location) && (
                  <div className="p-3 mb-3 flex items-center gap-4 flex-wrap rounded-md" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                    {item.event_date && (
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        <Calendar size={13} /> Date: {new Date(item.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {item.event_location && (
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        <MapPin size={13} /> Location: {item.event_location}
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <p className="text-sm text-secondary mb-4" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {item.message}
                </p>

                {/* Optional Image or External Link */}
                {item.image_url && (
                  <div className="mb-4">
                    <img src={item.image_url} alt="Attachment" className="rounded-md max-h-64 object-cover" style={{ border: '1px solid var(--border)' }} />
                  </div>
                )}
                {item.link_url && (
                  <div className="mb-4">
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:underline">
                      <ExternalLink size={13} /> {item.link_url}
                    </a>
                  </div>
                )}

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

                  {(user?.role === 'admin' || user?.id === item.author_id) && (
                    <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeletePost(item.id)} title="Delete post">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* EXPANDED DISCUSSION COMMENT THREAD */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Student Community Comments ({comments.length})
                    </h4>

                    {/* Comments List */}
                    <div className="flex flex-col gap-2.5 mb-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {comments.length === 0 ? (
                        <div className="text-xs text-muted p-3 text-center" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                          No comments yet. Start the conversation!
                        </div>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} className="p-3 rounded-md flex items-start justify-between gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-primary">{c.author_name}</span>
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-secondary">{c.message}</p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                className="btn btn-ghost btn-icon btn-sm text-muted"
                                onClick={() => handleReportComment(item.id, c.id)}
                                title="Report comment"
                              >
                                <Flag size={12} />
                              </button>
                              {(user?.role === 'admin' || user?.id === c.author_id) && (
                                <button
                                  className="btn btn-ghost btn-icon btn-sm text-danger"
                                  onClick={() => handleDeleteComment(item.id, c.id)}
                                  title="Delete comment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input with Character Counter */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="form-input text-xs flex-1"
                          placeholder="Write a reply or join the discussion... (max 500 chars)"
                          maxLength={500}
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handlePostComment(item.id)}
                        />
                        <button
                          className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
                          onClick={() => handlePostComment(item.id)}
                          disabled={postingComment || !newCommentText.trim()}
                        >
                          <Send size={13} /> Reply
                        </button>
                      </div>
                      <div className="text-right text-muted" style={{ fontSize: '0.68rem' }}>
                        {newCommentText.length} / 500 characters
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE STUDENT / ADMIN POST MODAL */}
      {showPostModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowPostModal(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: 'var(--space-6)' }}>
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
                  placeholder="e.g. ACM Hackathon Team Formation or Campus Workshop Update"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label text-xs">Message Content</label>
                <textarea
                  className="form-input text-xs"
                  rows={4}
                  placeholder="Share details, questions, or updates with fellow campus students..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
              </div>

              {/* Conditional Event Fields (Visible ONLY for Event Announcement & Event Update) */}
              {isEventCategory && (
                <div className="p-3 grid-2 gap-3" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div>
                    <label className="form-label text-xs">Event Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      className="form-input text-xs"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">Event Location (Optional)</label>
                    <input
                      type="text"
                      className="form-input text-xs"
                      placeholder="e.g. Student Center Auditorium"
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Optional Attachment Link / Image */}
              <div className="grid-2 gap-3">
                <div>
                  <label className="form-label text-xs">Optional Image URL</label>
                  <input
                    type="url"
                    className="form-input text-xs"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Optional Resource Link URL</label>
                  <input
                    type="url"
                    className="form-input text-xs"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Pinned Checkbox for Admins */}
              {canPin && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pin-post-checkbox"
                    checked={isPinned}
                    onChange={e => setIsPinned(e.target.checked)}
                  />
                  <label htmlFor="pin-post-checkbox" className="text-xs font-bold text-primary flex items-center gap-1 cursor-pointer">
                    <Pin size={13} /> Pin post to the top of the feed
                  </label>
                </div>
              )}

              {category === '🗣️ Rumours' && (
                <div className="p-3" style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div className="text-xs font-bold text-warning flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> Unverified Rumour Warning
                  </div>
                  <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
                    Posts under 🗣️ Rumours are automatically tagged with an explicit <strong>🗣️ Rumours — Unverified / Student Rumour</strong> badge for transparency.
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
