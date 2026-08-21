import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Calendar, ShoppingBag, Search, Building2,
  User, Bell, LogOut, ChevronLeft, Shield,
  Users, Home, CheckSquare, BarChart3, ShieldAlert, Megaphone, Settings
} from 'lucide-react'
import './Sidebar.css'

const studentNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { to: '/lost-found', icon: Search, label: 'Lost & Found' },
  { to: '/accommodation', icon: Building2, label: 'Accommodation' },
  { to: '/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/assignments', icon: CheckSquare, label: 'Assignments' },
  { to: '/attendance', icon: BarChart3, label: 'Attendance' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'My Profile' },
]

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard', end: true },
  { to: '/admin/audit-logs', icon: ShieldAlert, label: 'Audit Trail' },
  { to: '/admin/users', icon: Users, label: 'Manage Users' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/admin/events', icon: Calendar, label: 'Manage Events' },
  { to: '/admin/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { to: '/admin/lost-found', icon: Search, label: 'Lost & Found' },
  { to: '/admin/accommodation', icon: Building2, label: 'Accommodation' },
  { to: '/admin/settings', icon: Settings, label: 'Admin Settings' },
  { to: '/dashboard', icon: Home, label: 'Student View' },
]

export default function Sidebar({ open, onToggle, isAdmin }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  let nav = isAdmin ? adminNav : studentNav
  if (!isAdmin && user?.role === 'admin') {
    nav = [{ to: '/admin', icon: Shield, label: 'Admin Panel' }, ...studentNav]
  }

  const handleLogout = () => { logout(); navigate('/') }

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && open) {
      onToggle()
    }
  }

  const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : 'U'

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/logo.png" alt="CampusConnect Logo" className="sidebar-logo-img" />
        </div>
        {open && <span className="sidebar-logo-text">CampusConnect</span>}
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <ChevronLeft size={16} className={open ? '' : 'rotated'} />
        </button>
      </div>

      {/* Admin badge */}
      {isAdmin && open && (
        <div className="sidebar-admin-badge">
          <Shield size={12} /> Admin Panel
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="sidebar-link-icon" />
            {open && <span className="sidebar-link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="sidebar-footer">
        <div className={`sidebar-user ${open ? '' : 'sidebar-user-compact'}`}>
          <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#10b981,#6366f1)' }}>
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
          </div>
          {open && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.first_name} {user?.last_name}</span>
              <span className="sidebar-user-role">{user?.role === 'admin' ? 'Administrator' : `${user?.department || 'Student'}`}</span>
            </div>
          )}
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
          {open && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
