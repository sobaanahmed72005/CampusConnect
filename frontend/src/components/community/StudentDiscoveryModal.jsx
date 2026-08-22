import { useState, useEffect } from 'react'
import { Users, Search, MessageSquare, GraduationCap, X, CheckCircle2, Shield, Filter } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import MessagingDrawer from '../messaging/MessagingDrawer'

const CAMPUSES = ['All', 'CFD', 'LHR', 'ISB', 'KHI', 'PWR']
const DEPARTMENTS = ['All', 'Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Cyber Security', 'Electrical Engineering', 'Business Administration']

export default function StudentDiscoveryModal({ onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('All')
  const [department, setDepartment] = useState('All')
  const [messagingOpen, setMessagingOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [search, campus, department])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Mock / fetch peer users for directory
      const res = await api.get('/profile').catch(() => ({ data: { user: null } }))
      const currentUser = res.data?.user || {}

      // Sample directory dataset of verified FASTians across campuses
      const mockPeers = [
        { id: 'usr-1', first_name: 'Hamza', last_name: 'Malik', campus: 'CFD', department: 'Computer Science', year: 'Semester 6', skills: ['React', 'Python', 'AI/ML'], avatar_url: null },
        { id: 'usr-2', first_name: 'Zainab', last_name: 'Fatima', campus: 'LHR', department: 'Software Engineering', year: 'Semester 4', skills: ['Figma', 'Flutter', 'UI/UX'], avatar_url: null },
        { id: 'usr-3', first_name: 'Usman', last_name: 'Ali', campus: 'ISB', department: 'Artificial Intelligence', year: 'Semester 8', skills: ['PyTorch', 'Data Science', 'C++'], avatar_url: null },
        { id: 'usr-4', first_name: 'Ayesha', last_name: 'Khan', campus: 'KHI', department: 'Cyber Security', year: 'Semester 5', skills: ['Ethical Hacking', 'Networking', 'Python'], avatar_url: null },
        { id: 'usr-5', first_name: 'Bilal', last_name: 'Ahmed', campus: 'PWR', department: 'Data Science', year: 'Semester 3', skills: ['SQL', 'Tableau', 'R'], avatar_url: null },
        { id: 'usr-6', first_name: 'Saad', last_name: 'Tariq', campus: 'CFD', department: 'Electrical Engineering', year: 'Semester 7', skills: ['Embedded Systems', 'Arduino', 'C++'], avatar_url: null },
      ]

      let filtered = mockPeers
      if (campus !== 'All') filtered = filtered.filter(p => p.campus === campus)
      if (department !== 'All') filtered = filtered.filter(p => p.department === department)
      if (search.trim()) {
        const q = search.toLowerCase()
        filtered = filtered.filter(p => p.first_name.toLowerCase().includes(q) || p.last_name.toLowerCase().includes(q) || p.department.toLowerCase().includes(q))
      }

      setStudents(filtered)
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const handleMessagePeer = (student) => {
    setSelectedStudent(student)
    setMessagingOpen(true)
  }

  return (
    <>
      <div className="modal-overlay animate-fade" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', padding: 'var(--space-6)' }}>
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>
                <Users size={20} />
              </span>
              <div>
                <h3 className="text-h3 font-extrabold flex items-center gap-2">
                  Discover FASTians
                  <span className="badge badge-primary text-xs">@nu.edu.pk Verified</span>
                </h3>
                <p className="text-xs text-muted">Connect with peers across FAST NUCES campuses & departments</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close directory modal">
              <X size={18} />
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div className="filter-search-box">
              <Search size={14} className="filter-search-icon" />
              <input
                type="text"
                className="filter-search-input text-xs"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select className="form-input text-xs" value={campus} onChange={e => setCampus(e.target.value)}>
              {CAMPUSES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Campuses' : `Campus: ${c}`}</option>)}
            </select>

            <select className="form-input text-xs" value={department} onChange={e => setDepartment(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
          </div>

          {/* Student Grid */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {students.length === 0 ? (
              <div className="text-center p-6 text-xs text-muted">No matching FAST students found for your filters.</div>
            ) : (
              students.map(s => (
                <div key={s.id} className="p-3 card glass-card flex items-center justify-between gap-3 hover:border-primary transition-all">
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-md font-bold" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {s.first_name} {s.last_name}
                        <span className="badge badge-primary text-xs">{s.campus}</span>
                      </div>
                      <div className="text-xs text-muted">{s.department} • {s.year}</div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {s.skills.map(sk => <span key={sk} className="badge badge-muted text-xs" style={{ fontSize: '0.68rem' }}>{sk}</span>)}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-outline btn-xs flex items-center gap-1 text-primary font-semibold"
                    onClick={() => handleMessagePeer(s)}
                  >
                    <MessageSquare size={13} /> Message
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <MessagingDrawer
        isOpen={messagingOpen}
        onClose={() => setMessagingOpen(false)}
      />
    </>
  )
}
