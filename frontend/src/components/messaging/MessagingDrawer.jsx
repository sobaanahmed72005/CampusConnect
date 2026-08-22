import { useEffect, useState, useRef } from 'react'
import api from '../../lib/api'
import { getSocket, connectSocket } from '../../lib/socket'
import { useAuth } from '../../contexts/AuthContext'
import { X, Send, MessageSquare, ArrowLeft, ShieldCheck, ShoppingBag, Search, Circle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import './MessagingDrawer.css'

export default function MessagingDrawer({ isOpen, onClose, activeConversationId = null, onSelectConversation }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [convSearch, setConvSearch] = useState('')
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !user) return

    fetchConversations()
    const socket = connectSocket()
    socketRef.current = socket

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      scrollToBottom()
    }

    const handleTyping = (data) => {
      if (data.user_id !== user.id) setIsTyping(true)
    }

    const handleStopTyping = (data) => {
      if (data.user_id !== user.id) setIsTyping(false)
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('typing', handleTyping)
    socket.on('stop_typing', handleStopTyping)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('typing', handleTyping)
      socket.off('stop_typing', handleStopTyping)
    }
  }, [isOpen, user])

  useEffect(() => {
    if (activeConversationId && conversations.length > 0) {
      const match = conversations.find(c => c.id === activeConversationId)
      if (match) openConversation(match)
    }
  }, [activeConversationId, conversations])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const fetchConversations = async () => {
    setLoadingConv(true)
    try {
      const res = await api.get('/messages/conversations')
      setConversations(res.data.conversations || [])
    } catch {
      setConversations([])
    } finally {
      setLoadingConv(false)
    }
  }

  const openConversation = async (conv) => {
    setSelectedConv(conv)
    setLoadingMsg(true)
    try {
      const res = await api.get(`/messages/conversations/${conv.id}/messages`)
      setMessages(res.data.messages || [])
      await api.put(`/messages/conversations/${conv.id}/read`)

      if (socketRef.current) {
        socketRef.current.emit('join_conversation', { conversation_id: conv.id })
      }
    } catch (err) {
      toast.error('Failed to load messages')
      setMessages([])
    } finally {
      setLoadingMsg(false)
      scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedConv) return

    const text = inputMessage.trim()
    setInputMessage('')

    // Socket emit first
    let socketSent = false
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', {
        conversation_id: selectedConv.id,
        content: text
      })
      socketSent = true
    }

    // REST fallback if socket disconnected
    if (!socketSent) {
      try {
        const res = await api.post(`/messages/conversations/${selectedConv.id}/messages`, { content: text })
        setMessages(prev => [...prev, res.data.message])
        scrollToBottom()
      } catch {
        toast.error('Failed to send message')
      }
    }
  }

  if (!isOpen) return null

  const filteredConversations = conversations.filter(conv => {
    if (!convSearch.trim()) return true
    const q = convSearch.toLowerCase()
    const otherName = (conv.buyer_id === user?.id ? conv.seller_name : conv.buyer_name) || ''
    const itemTitle = conv.listing_title || ''
    return otherName.toLowerCase().includes(q) || itemTitle.toLowerCase().includes(q)
  })

  const otherParticipantName = selectedConv
    ? (selectedConv.buyer_id === user?.id ? selectedConv.seller_name : selectedConv.buyer_name)
    : ''

  return (
    <div className="messaging-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="messaging-drawer-title">
      <div className="messaging-drawer glass-card" onClick={(e) => e.stopPropagation()}>
        {selectedConv ? (
          /* CHAT THREAD VIEW */
          <div className="chat-view">
            <div className="chat-header">
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }} className="flex items-center gap-1.5">
                    <span className="badge-pulse">{otherParticipantName}</span>
                    <ShieldCheck size={13} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="text-xs text-muted truncate" style={{ maxWidth: '220px' }}>
                    Item: {selectedConv.listing_title} (PKR {Number(selectedConv.listing_price || 0).toLocaleString()})
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close messages">
                <X size={18} />
              </button>
            </div>

            {/* Marketplace Listing Banner Preview inside Chat */}
            <div className="p-2.5 px-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 truncate">
                <ShoppingBag size={14} className="text-accent flex-shrink-0" />
                <span className="text-xs font-bold truncate">{selectedConv.listing_title}</span>
              </div>
              <span className="text-xs font-bold text-primary flex-shrink-0">PKR {Number(selectedConv.listing_price || 0).toLocaleString()}</span>
            </div>

            <div className="chat-messages">
              {loadingMsg ? (
                <div style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : messages.length === 0 ? (
                <div className="text-xs text-muted text-center p-6">
                  No messages yet. Ask about availability, campus pickup location, or item condition!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
                      <div>{msg.content}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.75, marginTop: 4, textAlign: isMine ? 'right' : 'left' }} className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })
              )}
              {isTyping && <div className="text-xs text-muted italic p-2 flex items-center gap-1">Participant is typing...</div>}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                type="text"
                className="form-input text-xs"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-icon btn-sm" disabled={!inputMessage.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        ) : (
          /* CONVERSATION LIST VIEW */
          <>
            <div className="messaging-drawer-header">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
                <h3 id="messaging-drawer-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Marketplace Messages 2.0</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close messages">
                <X size={18} />
              </button>
            </div>

            {/* Conversation Search Bar */}
            <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2 card p-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="Search buyer/seller or item..."
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' }}
                />
              </div>
            </div>

            <div className="messaging-conversations-list">
              {loadingConv ? (
                <div style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center p-8">
                  <ShoppingBag size={32} className="m-auto text-muted mb-2" />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No conversations found</div>
                  <p className="text-xs text-muted mt-1">
                    Click "Message Seller" on any marketplace listing to start a real-time buyer-seller chat!
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const otherName = conv.buyer_id === user?.id ? conv.seller_name : conv.buyer_name
                  const unreadCount = parseInt(conv.unread_count || 0)
                  return (
                    <div key={conv.id} className="conversation-item" onClick={() => openConversation(conv)}>
                      <div className="avatar avatar-md" style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                        {otherName?.[0] || 'U'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontWeight: 700, fontSize: '0.875rem' }} className="truncate">{otherName}</span>
                          {unreadCount > 0 && <span className="badge badge-accent text-xs">{unreadCount} new</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }} className="truncate">
                          {conv.listing_title}
                        </div>
                        <div className="text-xs text-muted truncate mt-1">
                          {conv.last_message || 'Start conversation...'}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
