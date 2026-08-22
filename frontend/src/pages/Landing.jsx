import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, ShoppingBag, Search, Building2, ArrowRight, Users, Star, Zap, ChevronRight, ShieldCheck, CheckCircle2, Award, GraduationCap, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Landing.css'

const features = [
  { icon: Calendar, label: 'Campus Events & Workshops', desc: 'Discover society workshops, hackathons, ACM ProCom & sports tournaments across FAST campuses', color: '#10b981', to: '/events' },
  { icon: ShoppingBag, label: 'Verified Student Marketplace', desc: 'Buy & sell textbooks, laptops, lab gear and notes securely with verified @nu.edu.pk peers', color: '#6366f1', to: '/marketplace' },
  { icon: Search, label: 'Lost & Found Radar', desc: 'Post lost items on campus and get AI-powered fuzzy match notifications automatically', color: '#f59e0b', to: '/lost-found' },
  { icon: Building2, label: 'Student Housing & Hostels', desc: 'Browse verified student hostels near campus with walking distance maps, rent filters and amenities', color: '#3b82f6', to: '/accommodation' },
]

const campuses = [
  { code: 'CFD', name: 'Chiniot-Faisalabad', count: '3,200+ Students' },
  { code: 'LHR', name: 'Lahore Campus', count: '4,500+ Students' },
  { code: 'ISB', name: 'Islamabad Campus', count: '3,800+ Students' },
  { code: 'KHI', name: 'Karachi Campus', count: '2,900+ Students' },
  { code: 'PWR', name: 'Peshawar Campus', count: '1,800+ Students' },
]

const stats = [
  { value: '16,000+', label: 'FASTians Connected', icon: Users },
  { value: '340+', label: 'Events This Semester', icon: Calendar },
  { value: '2,400+', label: 'Marketplace Trades', icon: ShoppingBag },
  { value: '4.9★', label: 'FAST Student Rating', icon: Star },
]

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <div className="landing-logo-icon" style={{ background: '#fff', padding: '2px', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="FAST NUCES Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1 }}>CampusConnect</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em' }}>FAST NUCES</span>
            </div>
          </Link>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#campuses">Campuses</a>
            <a href="#trust">Trust & Safety</a>
            <a href="#about">About</a>
          </div>
          <div className="landing-nav-actions">
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-bg">
          <div className="hero-orb orb1" /><div className="hero-orb orb2" /><div className="hero-orb orb3" />
        </div>
        <div className="hero-content animate-slide-up">
          <div className="hero-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--primary)', border: '1px solid var(--border-primary)' }}>
            <GraduationCap size={14} /> Official FAST NUCES Student Ecosystem
          </div>
          <h1 className="hero-title">
            Empowering FASTians<br />
            <span className="hero-gradient">Across All Campuses</span>
          </h1>
          <p className="hero-desc">
            The unified digital platform for FAST NUCES students (CFD, LHR, ISB, KHI, PWR). Trade textbooks, find hostels near campus, track lost items, check class schedules, and join society workshops with verified <strong>@nu.edu.pk</strong> access.
          </p>
          <div className="hero-actions">
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Open Student Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Join FAST Community <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
              </>
            )}
          </div>

          {/* Institutional Trust Indicators */}
          <div className="flex items-center justify-center gap-6 flex-wrap mt-8 pt-6 border-t" style={{ borderColor: 'rgba(148, 163, 184, 0.15)' }}>
            <span className="flex items-center gap-1.5 text-xs text-muted font-semibold">
              <Lock size={13} className="text-primary" /> @nu.edu.pk Email Verified
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted font-semibold">
              <ShieldCheck size={13} className="text-accent" /> 100% Student-to-Student Trading
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted font-semibold">
              <Award size={13} className="text-warning" /> ACM & IEEE Society Events
            </span>
          </div>
        </div>
      </section>

      {/* Campuses Section */}
      <section className="py-12 border-y" id="campuses" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="landing-container">
          <div className="text-center mb-8">
            <span className="badge badge-accent mb-2">5 Campuses United</span>
            <h2 className="text-h2 font-extrabold">Connecting FASTians Nationwide</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {campuses.map(c => (
              <div key={c.code} className="card p-4 text-center hover:border-primary transition-all cursor-default" style={{ background: 'var(--bg-card)' }}>
                <span className="badge badge-primary font-bold text-xs mb-2">{c.code}</span>
                <div className="font-bold text-sm text-primary">{c.name}</div>
                <div className="text-xs text-muted mt-1">{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats" id="stats">
        <div className="landing-container">
          <div className="stats-grid">
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="landing-stat-card">
                <Icon size={24} className="stat-card-icon" />
                <div className="landing-stat-value">{value}</div>
                <div className="landing-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <div className="text-center mb-8">
            <h2>Everything you need for campus life</h2>
            <p className="mt-2">One platform to connect every aspect of your university experience</p>
          </div>
          <div className="features-grid">
            {features.map(({ icon: Icon, label, desc, color, to }) => (
              <Link to={user ? to : '/login'} key={label} className="feature-card card card-hover">
                <div className="feature-icon" style={{ background: `${color}20`, color }}>
                  <Icon size={24} />
                </div>
                <h3>{label}</h3>
                <p>{desc}</p>
                <div className="feature-cta" style={{ color }}>
                  Explore <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="cta-card">
            <h2>Ready to simplify your campus life?</h2>
            <p>Join thousands of students already using CampusConnect</p>
            {!user && (
              <Link to="/register" className="btn btn-primary btn-lg mt-4">
                Create Free Account <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="flex items-center gap-2">
            <div className="landing-logo-icon"><BookOpen size={16} /></div>
            <span style={{fontWeight:700}}>CampusConnect</span>
          </div>
          <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>© 2026 CampusConnect. Built for students.</p>
        </div>
      </footer>
    </div>
  )
}
