import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, Search, Bell, ChevronDown, User, LogOut, CheckCheck, ShoppingBag, Calendar, Building2, Search as SearchIcon, Loader2, Shield, MessageSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useDebounce } from '../../hooks/useDebounce'
import CommandPalette from '../ui/CommandPalette'
import MessagingDrawer from '../messaging/MessagingDrawer'
import './Header.css'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [messagingOpen, setMessagingOpen] = useState(false)

  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])


  const searchRef = useRef(null)
  const inputRef = useRef(null)

  // Desktop Keyboard Shortcuts: Ctrl+K / Cmd+K to open Command Palette, ESC to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setCmdPaletteOpen(false)
        setUserDropdownOpen(false)
        setNotifDropdownOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debouncedSearch && debouncedSearch.trim().length > 1) {
      performSearch(debouncedSearch.trim())
    } else {
      setSearchResults(null)
      setSearchOpen(false)
    }
  }, [debouncedSearch])

  const performSearch = async (query) => {
    setSearching(true)
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`)
      setSearchResults(res.data.results)
      setSearchOpen(true)
    } catch {
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(Array.isArray(res.data?.notifications) ? res.data.notifications : [])
    } catch (e) {
      setNotifications([])
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(search.trim())}`)
      setSearchOpen(false)
    }
  }

  const handleResultClick = (to) => {
    setSearchOpen(false)
    setSearch('')
    navigate(to)
  }

  const markRead = async (e, id) => {
    e.stopPropagation()
    const prevNotifs = notifications
    // Optimistically update UI immediately
    setNotifications(n => (Array.isArray(n) ? n : []).map(x => x.id === id ? { ...x, is_read: true } : x))

    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      // Rollback on API failure
      setNotifications(prevNotifs)
    }
  }

  const markAllRead = async (e) => {
    e.stopPropagation()
    const prevNotifs = notifications
    // Optimistically update UI immediately
    setNotifications(n => (Array.isArray(n) ? n : []).map(x => ({ ...x, is_read: true })))
    toast.success('All marked as read')

    try {
      await api.patch('/notifications/read-all')
    } catch {
      // Rollback on API failure
      setNotifications(prevNotifs)
      toast.error('Failed to mark notifications read')
    }
  }

  const handleLogout = () => { logout(); navigate('/') }

  const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : 'U'
  const safeNotifs = Array.isArray(notifications) ? notifications : []
  const unreadCount = safeNotifs.filter(n => n && !n.is_read).length
  const recentNotifs = safeNotifs.slice(0, 5)

  const hasResults = searchResults && (
    searchResults.marketplace?.length > 0 ||
    searchResults.events?.length > 0 ||
    searchResults.accommodation?.length > 0 ||
    searchResults.lostFound?.length > 0
  )

  return (
    <header className="page-header">
      <button className="btn btn-ghost btn-icon" onClick={onMenuClick} aria-label="Toggle menu">
        <Menu size={20} />
      </button>

      {/* Global Search Bar & Live Results Dropdown */}
      <div className="header-search-container" ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: '440px' }}>
        <form onSubmit={handleSearchSubmit} className="header-search">
          {searching ? <Loader2 size={16} className="search-icon animate-spin text-primary" /> : <Search size={16} className="search-icon" />}
          <input
            ref={inputRef}
            type="text"
            className="form-input search-input text-xs"
            placeholder="Global search events, marketplace, hostels, lost items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => { if (hasResults) setSearchOpen(true) }}
            aria-label="Global search input"
            style={{ paddingRight: 60 }}
          />
          <kbd className="hidden-mobile" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, pointerEvents: 'none' }}>
            Ctrl K
          </kbd>
        </form>

        {/* Global Search Live Results Dropdown */}
        {searchOpen && (
          <div
            className="card p-3 shadow-lg animate-fade"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              maxHeight: '420px',
              overflowY: 'auto'
            }}
          >
            {!hasResults && !searching && (
              <div className="text-center p-4 text-xs text-muted">
                No matching results found for "{search}"
              </div>
            )}

            {/* Marketplace Results */}
            {searchResults?.marketplace?.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted flex items-center gap-1 mb-1 px-2 uppercase" style={{ fontSize: '0.68rem' }}>
                  <ShoppingBag size={12} className="text-accent" /> Marketplace
                </div>
                {searchResults.marketplace.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleResultClick(`/marketplace/${item.id}`)}
                    className="p-2 flex items-center justify-between rounded hover:bg-surface cursor-pointer text-xs transition-colors"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="font-semibold text-primary truncate">{item.title}</span>
                    <span className="badge badge-accent text-xs">₹{Number(item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Events Results */}
            {searchResults?.events?.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted flex items-center gap-1 mb-1 px-2 uppercase" style={{ fontSize: '0.68rem' }}>
                  <Calendar size={12} className="text-primary" /> Campus Events
                </div>
                {searchResults.events.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => handleResultClick(`/events/${ev.id}`)}
                    className="p-2 flex items-center justify-between rounded hover:bg-surface cursor-pointer text-xs transition-colors"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="font-semibold text-primary truncate">{ev.title}</span>
                    <span className="text-muted text-xs">{ev.location}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Accommodation Results */}
            {searchResults?.accommodation?.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted flex items-center gap-1 mb-1 px-2 uppercase" style={{ fontSize: '0.68rem' }}>
                  <Building2 size={12} className="text-warning" /> Accommodation
                </div>
                {searchResults.accommodation.map(acc => (
                  <div
                    key={acc.id}
                    onClick={() => handleResultClick(`/accommodation/${acc.id}`)}
                    className="p-2 flex items-center justify-between rounded hover:bg-surface cursor-pointer text-xs transition-colors"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="font-semibold text-primary truncate">{acc.title}</span>
                    <span className="badge badge-warning text-xs">₹{Number(acc.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lost & Found Results */}
            {searchResults?.lostFound?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted flex items-center gap-1 mb-1 px-2 uppercase" style={{ fontSize: '0.68rem' }}>
                  <SearchIcon size={12} className="text-danger" /> Lost & Found
                </div>
                {searchResults.lostFound.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleResultClick('/lost-found')}
                    className="p-2 flex items-center justify-between rounded hover:bg-surface cursor-pointer text-xs transition-colors"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="font-semibold text-primary truncate">{item.title}</span>
                    <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-primary'} text-xs`}>{item.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* Mobile Search Button */}
        <button
          className="btn btn-ghost btn-icon header-mobile-search-btn"
          onClick={() => setCmdPaletteOpen(true)}
          aria-label="Search"
          title="Search"
        >
          <Search size={18} />
        </button>

        {/* Real-Time Marketplace Messages Trigger */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => { setMessagingOpen(true); setNotifDropdownOpen(false); setUserDropdownOpen(false) }}
          aria-label="Marketplace Messages"
          title="Marketplace Messages"
        >
          <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
        </button>

        {/* Notification Bell Dropdown */}
        <div className="header-dropdown-wrapper">

          <button
            className="btn btn-ghost btn-icon header-notif-btn"
            onClick={() => { setNotifDropdownOpen(o => !o); setUserDropdownOpen(false) }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {notifDropdownOpen && (
            <div className="header-dropdown notif-dropdown card shadow-lg animate-fade">
              <div className="dropdown-header">
                <span className="dropdown-title">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button className="btn-text text-xs text-primary" onClick={markAllRead}>
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>
              <div className="dropdown-body">
                {safeNotifs.length === 0 ? (
                  <div className="text-center p-4 text-xs text-muted">You're all caught up! 🎉</div>
                ) : (
                  recentNotifs.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={e => markRead(e, n.id)}
                      style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 12px' }}
                    >
                      <span style={{ fontSize: '1rem' }}>{getNotifIcon(n.type)}</span>
                      <div style={{ flex: 1 }}>
                        <div className="notif-item-title" style={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title}</div>
                        <div className="notif-item-msg">{n.message}</div>
                        <div className="notif-item-time">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="dropdown-footer">
                <Link to="/notifications" onClick={() => setNotifDropdownOpen(false)} className="text-xs text-primary font-semibold">
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="header-dropdown-wrapper">
          <button
            className="header-user-btn"
            onClick={() => { setUserDropdownOpen(o => !o); setNotifDropdownOpen(false) }}
            aria-label="User profile menu"
          >
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,var(--primary),var(--accent))' }}>
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
            </div>
            <span className="header-user-name truncate">{user?.first_name}</span>
            <ChevronDown size={14} className="text-muted" />
          </button>

          {userDropdownOpen && (
            <div className="header-dropdown user-dropdown card shadow-lg animate-fade">
              <div className="dropdown-header border-b pb-2 mb-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  {user?.first_name} {user?.last_name}
                  {user?.role === 'admin' && <span className="badge badge-accent text-xs">Admin</span>}
                </div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
              {user?.role === 'admin' && (
                <Link to="/admin" className="dropdown-item font-semibold" style={{ color: 'var(--accent)' }} onClick={() => setUserDropdownOpen(false)}>
                  <Shield size={14} style={{ color: 'var(--accent)' }} /> Admin Control Center
                </Link>
              )}
              <Link to="/profile" className="dropdown-item" onClick={() => setUserDropdownOpen(false)}>
                <User size={14} /> My Profile
              </Link>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
      />

      <MessagingDrawer
        isOpen={messagingOpen}
        onClose={() => setMessagingOpen(false)}
      />
    </header>
  )
}


function getNotifIcon(type) {
  switch (type) {
    case 'event': return '🔔'
    case 'marketplace': return '💬'
    case 'accommodation': return '🏠'
    case 'lost_found': return '🔍'
    default: return '📣'
  }
}
