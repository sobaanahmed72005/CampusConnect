import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Users, Shield, Trash2, Search, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [targetAction, setTargetAction] = useState(null) // { type: 'delete'|'suspend'|'restore', user }
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data.users || [])
    } catch { setUsers([]) } finally { setLoading(false) }
  }

  const toggleAdminRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'student' : 'admin'
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: nextRole })
      setUsers(u => u.map(x => x.id === userId ? { ...x, role: nextRole } : x))
      toast.success(`User role updated to ${nextRole}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role')
    }
  }

  const handleConfirmAction = async () => {
    if (!targetAction) return
    setActionLoading(true)
    const { type, user } = targetAction
    try {
      if (type === 'delete') {
        await api.delete(`/admin/users/${user.id}`)
        setUsers(u => u.filter(x => x.id !== user.id))
        toast.success('User account deleted')
      } else if (type === 'suspend') {
        await api.patch(`/admin/users/${user.id}/status`, { is_active: false })
        setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: false } : x))
        toast.success('User account suspended')
      } else if (type === 'restore') {
        await api.patch(`/admin/users/${user.id}/status`, { is_active: true })
        setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: true } : x))
        toast.success('User account restored')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
      setTargetAction(null)
    }
  }

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_id?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (roleFilter === 'student') return u.role === 'student' && u.is_active !== false
    if (roleFilter === 'admin') return u.role === 'admin'
    if (roleFilter === 'suspended') return u.is_active === false
    return true
  })

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Users}
        title="Manage Users & Security Accounts"
        subtitle="Manage student and administrator accounts, roles, suspensions, and access security"
        iconColor="var(--accent)"
        action={
          <div className="search-bar" style={{ maxWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="search"
              placeholder="Search user, email, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
      />

      {/* Role Filter Tabs */}
      <div className="tabs mb-6">
        {[
          { id: 'all', label: `All Users (${users.length})` },
          { id: 'student', label: 'Students' },
          { id: 'admin', label: 'Administrators' },
          { id: 'suspended', label: `Suspended (${users.filter(u => u.is_active === false).length})` }
        ].map(t => (
          <button
            key={t.id}
            className={`tab ${roleFilter === t.id ? 'active' : ''}`}
            onClick={() => setRoleFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active === false ? 0.6 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="avatar avatar-sm">{u.first_name?.[0]}</div>
                    <span style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</span>
                  </div>
                </td>
                <td className="text-muted">{u.email}</td>
                <td className="text-xs font-mono">{u.student_id || 'N/A'}</td>
                <td>{u.department || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-accent' : 'badge-muted'}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`badge ${u.is_active !== false ? 'badge-success' : 'badge-danger'} text-xs`}>
                    {u.is_active !== false ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleAdminRole(u.id, u.role)}
                      title={u.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                    >
                      <Shield size={12} /> {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>

                    {u.is_active !== false ? (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.3)' }}
                        onClick={() => setTargetAction({ type: 'suspend', user: u })}
                        title="Suspend account"
                      >
                        <UserX size={12} /> Suspend
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--primary)', borderColor: 'rgba(16,185,129,0.3)' }}
                        onClick={() => setTargetAction({ type: 'restore', user: u })}
                        title="Restore account"
                      >
                        <UserCheck size={12} /> Restore
                      </button>
                    )}

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setTargetAction({ type: 'delete', user: u })}
                      title="Delete account"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {targetAction && (
        <ConfirmModal
          isOpen={!!targetAction}
          onClose={() => setTargetAction(null)}
          onConfirm={handleConfirmAction}
          title={
            targetAction.type === 'delete'
              ? 'Delete User Account?'
              : targetAction.type === 'suspend'
              ? 'Suspend User Account?'
              : 'Restore User Account?'
          }
          message={
            targetAction.type === 'delete'
              ? `Are you sure you want to permanently delete ${targetAction.user.first_name} ${targetAction.user.last_name} (${targetAction.user.email})? This action cannot be undone.`
              : targetAction.type === 'suspend'
              ? `Are you sure you want to suspend ${targetAction.user.first_name} ${targetAction.user.last_name}? Suspended users will be blocked from logging into the platform.`
              : `Restore account access for ${targetAction.user.first_name} ${targetAction.user.last_name}?`
          }
          confirmText={
            targetAction.type === 'delete'
              ? 'Delete Account'
              : targetAction.type === 'suspend'
              ? 'Suspend Account'
              : 'Restore Account'
          }
          danger={targetAction.type !== 'restore'}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
