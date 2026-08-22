import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  User, Edit, Calendar, ShoppingBag, Camera, Save, X, KeyRound,
  Shield, Bell, Lock, Trash2, LogOut, CheckCircle2, AlertTriangle,
  Award, Sparkles, BookOpen, Tag, Plus, Check, MapPin, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import ConfirmModal from '../components/ui/ConfirmModal'
import './Profile.css'
import { subscribeUserToPush, unsubscribeUserFromPush } from '../lib/pushManager'

const DEPARTMENTS = [
  'Computer Science', 'Software Engineering', 'Artificial Intelligence',
  'Cyber Security', 'Data Science', 'Electrical Engineering',
  'Business Administration', 'Accounting & Finance'
]

const SEMESTERS = [
  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8',
  'Alumni / Postgraduate'
]

const POPULAR_SKILLS = ['React', 'Node.js', 'Python', 'Machine Learning', 'Figma', 'C++', 'Java', 'SQL', 'Flutter', 'TailwindCSS']
const POPULAR_INTERESTS = ['Competitive Programming', 'Web Development', 'AI/ML', 'Cybersecurity', 'Gaming', 'Football', 'Music', 'Photography']

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('info') // info | academic | activity | security

  // Skills & Interests State
  const [skills, setSkills] = useState([])
  const [interests, setInterests] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [newInterest, setNewInterest] = useState('')

  // Activity Stats State
  const [activityStats, setActivityStats] = useState({ listingsCount: 0, rsvpCount: 0, lostFoundCount: 0 })

  // Change Password State
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [changingPw, setChangingPw] = useState(false)

  // Privacy Settings State
  const [privacyPrefs, setPrivacyPrefs] = useState({
    profile_visibility: 'Students Only',
    show_email: true,
    show_phone: false
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/profile')
      const u = res.data.user || {}
      setProfile(u)
      setForm(u)

      // Load saved skills & interests or defaults
      try {
        const sk = localStorage.getItem(`cc_skills_${u.id}`)
        if (sk) setSkills(JSON.parse(sk))
        else setSkills(['React', 'Node.js', 'Python'])

        const it = localStorage.getItem(`cc_interests_${u.id}`)
        if (it) setInterests(JSON.parse(it))
        else setInterests(['Web Development', 'AI/ML', 'Gaming'])
      } catch {}

      // Fetch stats count
      try {
        const mktRes = await api.get('/marketplace?my=true').catch(() => ({ data: { listings: [] } }))
        const eventRes = await api.get('/events').catch(() => ({ data: { events: [] } }))
        const lfRes = await api.get('/lost-found').catch(() => ({ data: { items: [] } }))
        setActivityStats({
          listingsCount: mktRes.data.listings?.length || 0,
          rsvpCount: eventRes.data.events?.filter(e => e.user_rsvp).length || 0,
          lostFoundCount: lfRes.data.items?.length || 0
        })
      } catch {}

    } catch {
      toast.error('Failed to load profile details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/profile', form)
      setProfile(res.data.user)
      updateUser(res.data.user)

      // Persist skills & interests
      if (profile?.id) {
        localStorage.setItem(`cc_skills_${profile.id}`, JSON.stringify(skills))
        localStorage.setItem(`cc_interests_${profile.id}`, JSON.stringify(interests))
      }

      toast.success('Profile details updated successfully! 🎉')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = (skillToAdd) => {
    const val = skillToAdd || newSkill.trim()
    if (!val) return
    if (skills.includes(val)) return toast.error('Skill already added')
    const next = [...skills, val]
    setSkills(next)
    setNewSkill('')
    if (profile?.id) localStorage.setItem(`cc_skills_${profile.id}`, JSON.stringify(next))
  }

  const removeSkill = (skillToRemove) => {
    const next = skills.filter(s => s !== skillToRemove)
    setSkills(next)
    if (profile?.id) localStorage.setItem(`cc_skills_${profile.id}`, JSON.stringify(next))
  }

  const addInterest = (interestToAdd) => {
    const val = interestToAdd || newInterest.trim()
    if (!val) return
    if (interests.includes(val)) return toast.error('Interest already added')
    const next = [...interests, val]
    setInterests(next)
    setNewInterest('')
    if (profile?.id) localStorage.setItem(`cc_interests_${profile.id}`, JSON.stringify(next))
  }

  const removeInterest = (interestToRemove) => {
    const next = interests.filter(i => i !== interestToRemove)
    setInterests(next)
    if (profile?.id) localStorage.setItem(`cc_interests_${profile.id}`, JSON.stringify(next))
  }

  // Calculate Profile Completeness Percentage
  const calculateCompleteness = () => {
    let score = 30 // Base account registration
    if (profile?.avatar || profile?.image_url) score += 15
    if (profile?.phone || profile?.bio) score += 15
    if (form?.department || profile?.department) score += 15
    if (form?.semester || profile?.semester) score += 10
    if (skills.length > 0) score += 15
    return Math.min(100, score)
  }

  const completenessScore = calculateCompleteness()

  if (loading) return <div className="flex items-center justify-center p-12"><div className="spinner spinner-lg" /></div>

  const initials = profile ? (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '') : 'U'

  return (
    <div className="animate-fade">
      <PageHeader
        icon={User}
        title="Student Profile & Personalization 2.0"
        subtitle="Manage your academic portfolio, skills, campus activities, and account security"
        iconColor="var(--primary)"
        action={
          !editing ? (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
              <Edit size={14} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-success btn-sm" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        }
      />

      {/* Profile Header & Completeness Bar */}
      <div className="card glass-card mb-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="avatar avatar-lg shadow-lg" style={{ width: 64, height: 64, fontSize: '1.3rem', fontWeight: 800 }}>
              {initials}
            </div>
            <div>
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                {profile?.first_name} {profile?.last_name}
                <span className="badge badge-accent text-xs">Verified Student</span>
              </h2>
              <p className="text-xs text-muted mt-0.5">{profile?.email} • {form?.department || 'Computer Science'}</p>
            </div>
          </div>

          {/* Profile Completeness Gauge */}
          <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Profile Completeness</span>
              <span className="text-primary font-bold">{completenessScore}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${completenessScore}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="tabs mb-6">
        <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          👤 Personal & Contact Info
        </button>
        <button className={`tab ${tab === 'academic' ? 'active' : ''}`} onClick={() => setTab('academic')}>
          🎓 Academic Portfolio & Skills
        </button>
        <button className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
          📊 Campus Activity & Stats
        </button>
      </div>

      {/* TAB 1: Personal & Contact Info */}
      {tab === 'info' && (
        <div className="card glass-card p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <User size={18} className="text-primary" /> Personal Information
          </h3>

          <div className="grid-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">First Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={form.first_name || ''}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Last Name</label>
              <input
                type="text"
                className="form-input text-xs"
                value={form.last_name || ''}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">University Email</label>
              <input type="email" className="form-input text-xs" value={form.email || ''} disabled />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Phone Number</label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="e.g. 0300-1234567"
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="grid-full">
              <label className="text-xs font-semibold text-muted block mb-1">Student Bio</label>
              <textarea
                className="form-textarea text-xs"
                rows={3}
                placeholder="Share a short bio about your studies, passions, and student projects..."
                value={form.bio || ''}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic Portfolio & Skills */}
      {tab === 'academic' && (
        <div className="flex flex-col gap-6">
          <div className="card glass-card p-6">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-accent" /> Academic Program & Semester
            </h3>

            <div className="grid-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Department</label>
                <select
                  className="form-select text-xs"
                  value={form.department || 'Computer Science'}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  disabled={!editing}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Current Semester</label>
                <select
                  className="form-select text-xs"
                  value={form.semester || 'Semester 5'}
                  onChange={e => setForm({ ...form, semester: e.target.value })}
                  disabled={!editing}
                >
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Technical Skills & Interests Badges */}
          <div className="card glass-card p-6">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-warning" /> Technical Skills & Interests Portfolio
            </h3>

            {/* Skills Sub-section */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase text-muted block mb-2">Technical Skills ({skills.length})</label>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {skills.map(s => (
                  <span key={s} className="badge badge-primary flex items-center gap-1" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    {s}
                    {editing && <X size={12} className="cursor-pointer ml-1" onClick={() => removeSkill(s)} />}
                  </span>
                ))}
              </div>

              {editing && (
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="Add custom skill..."
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                  />
                  <button className="btn btn-outline btn-xs" onClick={() => addSkill()}>Add</button>
                </div>
              )}
            </div>

            {/* Interests Sub-section */}
            <div>
              <label className="text-xs font-bold uppercase text-muted block mb-2">Interests & Hobbies ({interests.length})</label>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {interests.map(i => (
                  <span key={i} className="badge badge-accent flex items-center gap-1" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    {i}
                    {editing && <X size={12} className="cursor-pointer ml-1" onClick={() => removeInterest(i)} />}
                  </span>
                ))}
              </div>

              {editing && (
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="Add custom interest..."
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                  />
                  <button className="btn btn-outline btn-xs" onClick={() => addInterest()}>Add</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Campus Activity & Stats */}
      {tab === 'activity' && (
        <div className="grid-3 gap-4">
          <div className="card glass-card p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-muted uppercase mb-1">Marketplace Listings</div>
              <div className="text-3xl font-extrabold text-primary mb-2">{activityStats.listingsCount}</div>
              <p className="text-xs text-muted">Active and completed products listed on Campus Marketplace.</p>
            </div>
          </div>

          <div className="card glass-card p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-muted uppercase mb-1">Campus Events Attended</div>
              <div className="text-3xl font-extrabold text-accent mb-2">{activityStats.rsvpCount}</div>
              <p className="text-xs text-muted">Confirmed RSVPs for campus life, workshops, and society events.</p>
            </div>
          </div>

          <div className="card glass-card p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-muted uppercase mb-1">Lost & Found Reports</div>
              <div className="text-3xl font-extrabold text-warning mb-2">{activityStats.lostFoundCount}</div>
              <p className="text-xs text-muted">Belongings reported for campus recovery match scanning.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
