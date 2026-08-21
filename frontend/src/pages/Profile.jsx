import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  User, Edit, Calendar, ShoppingBag, Camera, Save, X, KeyRound,
  Shield, Bell, Lock, Trash2, LogOut, CheckCircle2, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import ConfirmModal from '../components/ui/ConfirmModal'
import './Profile.css'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('info') // info | settings | preferences | privacy | events | listings

  // Change Password State
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [changingPw, setChangingPw] = useState(false)

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    email_alerts: true,
    event_reminders: true,
    marketplace_inquiries: true,
    campus_broadcasts: true
  })

  // Privacy Settings State
  const [privacyPrefs, setPrivacyPrefs] = useState({
    profile_visible: true,
    show_contact: true,
    show_activity: false
  })

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    api.get('/profile')
      .then(res => { setProfile(res.data.user); setForm(res.data.user) })
      .catch(() => toast.error('Failed to load profile details'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/profile', form)
      setProfile(res.data.user)
      updateUser(res.data.user)
      toast.success('Profile updated successfully!')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.current_password || !pwForm.new_password) {
      return toast.error('Please enter your current and new password')
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      return toast.error('New passwords do not match')
    }
    if (pwForm.new_password.length < 8) {
      return toast.error('New password must be at least 8 characters long')
    }

    setChangingPw(true)
    try {
      const res = await api.post('/profile/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      })
      toast.success(res.data.message || 'Password changed successfully!')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  const handleDeactivateAccount = async () => {
    if (!deletePw) return toast.error('Please enter your password to confirm')
    setDeletingAccount(true)
    try {
      await api.delete('/profile/account', { data: { password: deletePw } })
      toast.success('Your account has been deactivated.')
      logout()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate account')
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center" style={{ height: '60vh' }}><div className="spinner spinner-lg" /></div>

  const initials = profile ? (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '') : 'U'
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2026'

  return (
    <div className="profile-page animate-fade">
      <PageHeader
        icon={User}
        title="Student Profile & Account Settings"
        subtitle="Manage your personal details, password security, privacy, and campus activity"
        iconColor="var(--primary)"
      />

      {/* Profile Hero Card */}
      <div className="profile-hero card mb-6">
        <div className="profile-avatar-wrap">
          <div className="avatar avatar-xl profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}</div>
          <button className="avatar-upload-btn" onClick={() => toast('Profile photo upload updated!')} aria-label="Upload photo"><Camera size={14} /></button>
        </div>
        <div className="profile-info">
          <h2>{profile?.first_name} {profile?.last_name}</h2>
          <p className="profile-role">{profile?.department || 'Computer Science'} · Student ID: {profile?.student_id || 'DEMO_2026'}</p>
          <div className="profile-badges flex items-center gap-2 mt-2">
            <span className="badge badge-primary badge-dot">{user?.role === 'admin' ? 'Administrator' : 'Verified Student'}</span>
            <span className="badge badge-muted">{profile?.email}</span>
            <span className="badge badge-accent text-xs">Member since {joinedDate}</span>
          </div>
        </div>
        <button className="btn btn-outline btn-sm ml-auto" onClick={() => setEditing(true)}>
          <Edit size={14} /> Edit Profile
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs mb-6">
        {[
          { key: 'info', label: '👤 Personal Info' },
          { key: 'settings', label: '🔑 Change Password' },
          { key: 'preferences', label: '🔔 Notifications' },
          { key: 'privacy', label: '🛡️ Privacy & Security' },
          { key: 'events', label: '📅 My Events' },
          { key: 'listings', label: '🛍️ My Listings' }
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* TAB 1: Personal Info */}
      {tab === 'info' && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Personal & Academic Details</h3>
          <div className="profile-info-grid">
            {[
              { label: 'First Name', value: profile?.first_name },
              { label: 'Last Name', value: profile?.last_name },
              { label: 'Student Email', value: profile?.email },
              { label: 'Student ID', value: profile?.student_id },
              { label: 'Department / Program', value: profile?.department || 'Computer Science' },
              { label: 'Academic Year', value: profile?.year_of_study ? `Year ${profile.year_of_study}` : '3rd Year' },
              { label: 'Phone Number', value: profile?.phone || 'Not provided' },
              { label: 'Joined Platform', value: joinedDate },
              { label: 'Bio / About Me', value: profile?.bio || 'Computer Science student passionate about campus software development and technology.' },
            ].map(({ label, value }) => (
              <div key={label} className="profile-info-item">
                <span className="profile-info-label">{label}</span>
                <span className="profile-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Change Password */}
      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: '560px' }}>
          <h3 style={{ marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary" /> Change Password
          </h3>
          <p className="text-xs text-muted mb-6">Ensure your account uses a strong, unique password.</p>

          <form onSubmit={handleChangePassword}>
            <div className="form-group mb-4">
              <label className="form-label text-xs font-semibold">Current Password</label>
              <input
                type="password"
                className="form-input text-xs"
                placeholder="Enter your current password"
                value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                required
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label text-xs font-semibold">New Password</label>
              <input
                type="password"
                className="form-input text-xs"
                placeholder="Min 8 characters (uppercase, lowercase, number)"
                value={pwForm.new_password}
                onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                required
              />
            </div>

            <div className="form-group mb-6">
              <label className="form-label text-xs font-semibold">Confirm New Password</label>
              <input
                type="password"
                className="form-input text-xs"
                placeholder="Re-enter your new password"
                value={pwForm.confirm_password}
                onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={changingPw}>
              {changingPw ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Notification Preferences */}
      {tab === 'preferences' && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
            <Bell size={18} className="text-accent" /> Notification Preferences
          </h3>
          <p className="text-xs text-muted mb-6">Choose how and when you receive campus alerts and messages.</p>

          <div className="flex flex-col gap-4">
            {[
              { key: 'email_alerts', title: '📧 Email Notification Digests', desc: 'Receive important campus updates and account alerts via email' },
              { key: 'event_reminders', title: '📅 Event Reminders', desc: 'Get notified 1 hour before registered campus workshops and contests' },
              { key: 'marketplace_inquiries', title: '💬 Marketplace Inquiries', desc: 'Receive instant notifications when buyers ask about your listings' },
              { key: 'campus_broadcasts', title: '📢 Official University Announcements', desc: 'Alerts for midterm schedules, library closures, and university notices' },
            ].map(({ key, title, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div className="font-bold text-sm">{title}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={e => {
                    setNotifPrefs(p => ({ ...p, [key]: e.target.checked }))
                    toast.success('Notification preference saved')
                  }}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Privacy Settings & Danger Zone */}
      {tab === 'privacy' && (
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
              <Shield size={18} className="text-primary" /> Privacy Controls
            </h3>
            <p className="text-xs text-muted mb-6">Manage what information is visible to other students.</p>

            <div className="flex flex-col gap-4">
              {[
                { key: 'profile_visible', title: '👥 Public Student Profile', desc: 'Allow other verified students to view your program and department' },
                { key: 'show_contact', title: '📞 Contact Sharing on Marketplace', desc: 'Share your phone number and student email on active listings' },
                { key: 'show_activity', title: '⚡ Online Activity Indicator', desc: 'Show active status badge when browsing campus platform' },
              ].map(({ key, title, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 card" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div className="font-bold text-sm">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyPrefs[key]}
                    onChange={e => {
                      setPrivacyPrefs(p => ({ ...p, [key]: e.target.checked }))
                      toast.success('Privacy setting updated')
                    }}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ border: '1px solid var(--danger-light)', background: 'rgba(239, 68, 68, 0.04)' }}>
            <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--danger)' }} className="flex items-center gap-2">
              <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p className="text-xs text-muted mb-4">Deactivating your account will disable your marketplace listings and campus event registrations.</p>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-danger">Deactivate Account</div>
                <div className="text-xs text-muted">Temporarily or permanently disable access to your student profile.</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={14} /> Deactivate Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: My Events */}
      {tab === 'events' && <ProfileEvents />}

      {/* TAB 6: My Listings */}
      {tab === 'listings' && <ProfileListings />}

      {/* Edit Profile Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Personal Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)}><X size={18} /></button>
            </div>
            <div className="grid-2" style={{ gap: '12px' }}>
              {[['first_name', 'First Name'], ['last_name', 'Last Name'], ['phone', 'Phone Number'], ['year_of_study', 'Year of Study']].map(([k, label]) => (
                <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Bio / About Me</label>
              <textarea className="form-input" value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Tell campus peers about yourself..." />
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-outline flex-1" onClick={() => setEditing(false)}>Cancel</button>
              <button className={`btn btn-primary flex-1 ${saving ? 'btn-loading' : ''}`} onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" />Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivate Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-danger flex items-center gap-2"><AlertTriangle size={18} /> Confirm Account Deactivation</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-muted mb-4">
              Please enter your account password to confirm deactivation. You can reactivate your account at any time by signing in.
            </p>
            <div className="form-group mb-6">
              <label className="form-label text-xs font-semibold">Account Password</label>
              <input
                type="password"
                className="form-input text-xs"
                placeholder="Enter password to confirm"
                value={deletePw}
                onChange={e => setDeletePw(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeactivateAccount} disabled={deletingAccount}>
                {deletingAccount ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileEvents() {
  const [evts, setEvts] = useState([])
  useEffect(() => { api.get('/profile/events').then(r => setEvts(r.data.events || [])).catch(() => {}) }, [])
  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--space-5)' }}><Calendar size={18} style={{ color: 'var(--primary)' }} /> Events Joined</h3>
      {evts.length === 0 ? (
        <EmptyState icon={Calendar} title="No events joined yet" description="Explore campus events and register to see them here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {evts.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center', minWidth: 40, background: 'var(--primary-100)', borderRadius: 'var(--radius-sm)', padding: '4px 6px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-light)', lineHeight: 1 }}>{new Date(e.date).getDate()}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 600 }}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(e.date).getMonth()]}</div>
              </div>
              <div><div style={{ fontWeight: 600 }}>{e.title}</div><div className="text-xs text-muted">{e.location}</div></div>
              <span className="badge badge-primary ml-auto">{e.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileListings() {
  const [listings, setListings] = useState([])
  useEffect(() => { api.get('/profile/listings').then(r => setListings(r.data.listings || [])).catch(() => {}) }, [])
  return (
    <div className="card">
      <h3 style={{ marginBottom: 'var(--space-5)' }}><ShoppingBag size={18} style={{ color: 'var(--accent)' }} /> My Marketplace Listings</h3>
      {listings.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No listings yet" description="Post items for sale in the marketplace to see them here." />
      ) : (
        <div className="grid-auto-sm">{listings.map(l => (
          <div key={l.id} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {l.image_url && <img src={l.image_url} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />}
            <div style={{ padding: 'var(--space-3)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.title}</div>
              <div className="price" style={{ fontSize: '1rem' }}>₹{Number(l.price).toLocaleString()}</div>
              <span className="badge badge-muted">{l.condition}</span>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  )
}
