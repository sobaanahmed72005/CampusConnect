import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import {
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2, User, Building2, Bell,
  Calendar, ShoppingBag, Search, BookOpen, MessageSquare, ShieldCheck, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import './StudentOnboardingWizard.css'

const CAMPUSES = [
  { code: 'CFD', name: 'Chiniot-Faisalabad' },
  { code: 'LHR', name: 'Lahore Campus' },
  { code: 'ISB', name: 'Islamabad Campus' },
  { code: 'KHI', name: 'Karachi Campus' },
  { code: 'PWR', name: 'Peshawar Campus' },
]

const DEPARTMENTS = [
  'Computer Science', 'Software Engineering', 'Artificial Intelligence',
  'Data Science', 'Cyber Security', 'Electrical Engineering',
  'Business Administration', 'Accounting & Finance'
]

const INTEREST_OPTIONS = [
  'Web Development', 'AI / Machine Learning', 'Competitive Programming',
  'Cyber Security', 'ACM Society', 'IEEE Student Branch', 'Gaming & eSports',
  'Photography', 'Dramatics & Arts', 'Sports & Football'
]

export default function StudentOnboardingWizard({ onClose }) {
  const { user, updateUser } = useAuth()
  const [step, setStep] = useState(1)

  // Step 2 State
  const [campus, setCampus] = useState('CFD')
  const [department, setDepartment] = useState(user?.department || 'Computer Science')
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study || 'Semester 1')
  const [phone, setPhone] = useState(user?.phone || '')

  // Step 3 State
  const [selectedInterests, setSelectedInterests] = useState(['Web Development', 'AI / Machine Learning'])

  // Step 4 State
  const [notifPrefs, setNotifPrefs] = useState({
    events: true,
    marketplace: true,
    lostFound: true,
    academics: true,
    housing: true
  })

  const [saving, setSaving] = useState(false)

  const toggleInterest = (item) => {
    setSelectedInterests(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    )
  }

  const handleNext = () => {
    if (step < 6) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      // 1. Update Profile API
      const profileData = {
        department,
        year_of_study: yearOfStudy,
        phone,
        bio: `FAST NUCES (${campus} Campus) student interested in ${selectedInterests.slice(0, 3).join(', ')}.`
      }
      const res = await api.put('/profile', profileData)
      updateUser(res.data.user)

      // 2. Persist local storage preferences
      localStorage.setItem(`cc_skills_${user?.id}`, JSON.stringify(selectedInterests))
      localStorage.setItem(`cc_notif_prefs_${user?.id}`, JSON.stringify(notifPrefs))
      localStorage.setItem('cc_onboarded', 'true')

      toast.success('Welcome aboard! Your FASTian profile is ready 🎉')
      onClose()
    } catch {
      toast.error('Failed to save profile setup. Continuing to dashboard...')
      localStorage.setItem('cc_onboarded', 'true')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const progressPct = ((step - 1) / 5) * 100

  return (
    <div className="onboarding-wizard-overlay animate-fade" role="dialog" aria-modal="true">
      <div className="onboarding-wizard-card animate-scale-in">
        {/* Top Progress Line */}
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Wizard Header */}
        <div className="onboarding-header">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary flex items-center gap-1">
              <Sparkles size={13} /> Step {step} of 6
            </span>
            <span className="text-xs text-muted font-bold">FAST NUCES Setup</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleFinish} aria-label="Skip onboarding">
            <X size={18} />
          </button>
        </div>

        {/* Wizard Body Steps */}
        <div className="onboarding-body">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div className="animate-fade text-center py-4">
              <div className="avatar avatar-xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                🎓
              </div>
              <h2 className="text-h2 font-extrabold mb-2">Welcome to CampusConnect 👋</h2>
              <p className="text-body-sm text-muted mb-6" style={{ maxWidth: '420px', margin: '0 auto 24px' }}>
                Hey <strong>{user?.first_name || 'FASTian'}</strong>! We've crafted this platform to make your FAST NUCES student life effortless across academics, campus trading, housing, and events.
              </p>
              <div className="card glass-card p-4 text-left border mb-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={24} className="text-primary" />
                  <div>
                    <div className="font-bold text-sm">Verified @nu.edu.pk Ecosystem</div>
                    <div className="text-xs text-muted">Exclusively for FAST NUCES students with official institutional verification.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Profile Setup */}
          {step === 2 && (
            <div className="animate-fade">
              <div className="flex items-center gap-2 mb-4">
                <User size={20} className="text-primary" />
                <h3 className="text-h3 font-bold">Complete Your Student Profile</h3>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">FAST NUCES Campus</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CAMPUSES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      className={`btn btn-xs ${campus === c.code ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setCampus(c.code)}
                    >
                      {c.code} — {c.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Department / Degree Program</label>
                <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Current Semester</label>
                  <input className="form-input" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} placeholder="e.g. Semester 3" />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Contact Number</label>
                  <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Choose Interests */}
          {step === 3 && (
            <div className="animate-fade">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-accent" />
                <h3 className="text-h3 font-bold">Select Your Interests & Societies</h3>
              </div>
              <p className="text-xs text-muted mb-4">Choose topics you love to personalize your campus event feed and marketplace recommendations.</p>
              
              <div className="chip-grid">
                {INTEREST_OPTIONS.map(opt => {
                  const active = selectedInterests.includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`chip-btn ${active ? 'active' : ''}`}
                      onClick={() => toggleInterest(opt)}
                    >
                      {active ? '✓ ' : '+ '}{opt}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Notification Preferences */}
          {step === 4 && (
            <div className="animate-fade">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={20} className="text-warning" />
                <h3 className="text-h3 font-bold">Set Notification Preferences</h3>
              </div>
              <p className="text-xs text-muted mb-4">Stay updated on essential campus activities without spam.</p>

              <div className="flex flex-col gap-3">
                {[
                  { key: 'events', label: 'Society Workshops & Event Alerts', desc: 'Get notified when ACM, IEEE or campus events are published.' },
                  { key: 'marketplace', label: 'Marketplace Buyer & Seller Messages', desc: 'Instant alerts when someone inquires about your item.' },
                  { key: 'lostFound', label: 'Lost & Found Fuzzy Match Radar', desc: 'Instant match score alert if your lost item is found.' },
                  { key: 'academics', label: 'Academic & Class Deadlines', desc: 'Reminders for assignment submissions & class schedule.' },
                ].map(item => (
                  <div key={item.key} className="p-3 card flex items-center justify-between" style={{ background: 'var(--bg-surface)' }}>
                    <div>
                      <div className="font-bold text-sm">{item.label}</div>
                      <div className="text-xs text-muted">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs[item.key]}
                      onChange={e => setNotifPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Feature Discovery Tour */}
          {step === 5 && (
            <div className="animate-fade">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={20} className="text-primary" />
                <h3 className="text-h3 font-bold">Discover 6 Campus Hubs</h3>
              </div>
              <p className="text-xs text-muted mb-4">Everything you need is accessible from your top header and sidebar:</p>

              <div className="flex flex-col gap-2">
                <div className="feature-hub-card">
                  <Calendar size={18} className="text-primary" />
                  <div>
                    <div className="font-bold text-xs">1. Events & Societies</div>
                    <div className="text-xs text-muted">Hackathons, sports, ACM ProCom & society workshops.</div>
                  </div>
                </div>
                <div className="feature-hub-card">
                  <ShoppingBag size={18} className="text-accent" />
                  <div>
                    <div className="font-bold text-xs">2. Student Marketplace</div>
                    <div className="text-xs text-muted">Trade textbooks, lab tools, notes & tech with verified peers.</div>
                  </div>
                </div>
                <div className="feature-hub-card">
                  <BookOpen size={18} className="text-warning" />
                  <div>
                    <div className="font-bold text-xs">3. Academics & Timetable</div>
                    <div className="text-xs text-muted">Track class schedule, room numbers & assignment deadlines.</div>
                  </div>
                </div>
                <div className="feature-hub-card">
                  <Search size={18} className="text-danger" />
                  <div>
                    <div className="font-bold text-xs">4. Lost & Found Radar</div>
                    <div className="text-xs text-muted">Automated match scoring engine for lost items on campus.</div>
                  </div>
                </div>
                <div className="feature-hub-card">
                  <Building2 size={18} style={{ color: '#3b82f6' }} />
                  <div>
                    <div className="font-bold text-xs">5. Hostel & Housing Search</div>
                    <div className="text-xs text-muted">Verified student housing near campus with walking distance maps.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Celebration & Finish */}
          {step === 6 && (
            <div className="animate-fade text-center py-6">
              <div className="avatar avatar-xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                🎉
              </div>
              <h2 className="text-h2 font-extrabold mb-2">You're All Set, {user?.first_name}!</h2>
              <p className="text-body-sm text-muted mb-6" style={{ maxWidth: '440px', margin: '0 auto 24px' }}>
                Your personalized FAST NUCES student dashboard is ready. Explore society events, check your timetable, or browse student listings right away!
              </p>
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Setting Up Dashboard...' : 'Enter My Dashboard 🚀'}
              </button>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        {step < 6 && (
          <div className="onboarding-footer">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleNext}
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
