import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Megaphone, Plus, Trash2, Calendar, User, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import LoadingGrid, { TableSkeleton } from '../../components/ui/LoadingGrid'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'
import AnnouncementModal from '../../components/announcements/AnnouncementModal'

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await api.get('/announcements')
      setAnnouncements(res.data.announcements || [])
    } catch {
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/announcements/${deleteId}`)
      toast.success('Campus announcement deleted')
      setDeleteId(null)
      fetchAnnouncements()
    } catch {
      toast.error('Failed to delete announcement')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        icon={Megaphone}
        title="Admin Announcement Management"
        subtitle="Broadcast official university notices and manage student alerts platform-wide"
        iconColor="var(--accent)"
        action={
          <button className="btn btn-accent" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Broadcast Notice
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campus announcements broadcasted"
          description="Broadcast official university schedule updates, career fair notices, or emergency alerts to all students."
          action={
            <button className="btn btn-accent" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Broadcast First Announcement
            </button>
          }
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Notice Details</th>
                <th>Category</th>
                <th>Author</th>
                <th>Broadcast Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(item => (
                <tr key={item.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="flex items-center gap-2">
                        <Megaphone size={14} className="text-accent" />
                        {item.title}
                      </div>
                      <div className="text-xs text-muted mt-1" style={{ maxWidth: '540px', lineHeight: 1.4 }}>
                        {item.message}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-accent text-xs" style={{ textTransform: 'uppercase' }}>
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck size={13} className="text-primary" />
                      <span className="font-semibold">{item.author_name || 'Admin'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs text-muted flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end">
                      <button
                        className="btn btn-ghost btn-icon btn-sm text-danger"
                        onClick={() => setDeleteId(item.id)}
                        title="Delete Announcement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AnnouncementModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchAnnouncements}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Campus Announcement"
        message="Are you sure you want to delete this broadcast notice? Students will no longer see it on their dashboard."
        confirmText="Delete Announcement"
        danger={true}
        loading={deleting}
      />
    </div>
  )
}
