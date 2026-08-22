import { useEffect } from 'react'
import { Calendar, ShoppingBag, Search, Building2, Sparkles, ArrowRight, X } from 'lucide-react'

export default function OnboardingModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleComplete()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleComplete = () => {
    localStorage.setItem('cc_onboarded', 'true')
    onClose()
  }

  return (
    <div
      className="modal-overlay animate-fade"
      onClick={handleComplete}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="modal modal-md"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          maxWidth: '520px'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary flex items-center gap-1">
              <Sparkles size={12} /> Welcome Guide
            </span>
            <span className="text-xs text-muted font-semibold">FAST NUCES Student Ecosystem</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleComplete} aria-label="Close welcome guide">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6">
          <h2 id="onboarding-title" style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px' }}>
            Welcome to CampusConnect 🎓
          </h2>
          <p className="text-body-sm text-muted">
            The official digital hub for FAST NUCES students (CFD, LHR, ISB, KHI, PWR). Here is your 10-second quick guide to campus life:
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="p-3 card flex items-start gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-md" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">1. Campus Events</div>
              <div className="text-xs text-muted mt-0.5">Find workshops, hackathons, sports tournaments, and register with one click.</div>
            </div>
          </div>

          <div className="p-3 card flex items-start gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-md" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">2. Student Marketplace</div>
              <div className="text-xs text-muted mt-0.5">Buy and sell textbooks, electronics, and lab gear securely with verified peers.</div>
            </div>
          </div>

          <div className="p-3 card flex items-start gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-md" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Search size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">3. Lost & Found Radar</div>
              <div className="text-xs text-muted mt-0.5">Report lost items and get automated match scoring (Category, Location, Date).</div>
            </div>
          </div>

          <div className="p-3 card flex items-start gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="p-2 rounded-md" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Building2 size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">4. Campus Housing Accommodation</div>
              <div className="text-xs text-muted mt-0.5">Find verified student hostels with walking distance estimates and price filters.</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs text-muted">Press ESC or click outside to dismiss</span>
          <button className="btn btn-primary" onClick={handleComplete} style={{ fontWeight: 700 }}>
            Get Started <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
