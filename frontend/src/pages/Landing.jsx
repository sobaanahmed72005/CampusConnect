import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, ShoppingBag, Search, Building2, ArrowRight, Users, Star, Zap, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Landing.css'

const features = [
  { icon: Calendar, label: 'Events', desc: 'Discover and register for campus events, workshops & sports', color: '#10b981', to: '/events' },
  { icon: ShoppingBag, label: 'Marketplace', desc: 'Buy & sell books, electronics, furniture and notes', color: '#6366f1', to: '/marketplace' },
  { icon: Search, label: 'Lost & Found', desc: 'Post lost items and help reunite students with belongings', color: '#f59e0b', to: '/lost-found' },
  { icon: Building2, label: 'Accommodation', desc: 'Browse hostel rooms with prices, facilities and availability', color: '#3b82f6', to: '/accommodation' },
]

const stats = [
  { value: '12,000+', label: 'Students', icon: Users },
  { value: '340+', label: 'Events This Semester', icon: Calendar },
  { value: '1,800+', label: 'Marketplace Listings', icon: ShoppingBag },
  { value: '4.9★', label: 'Student Rating', icon: Star },
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
              <img src="/logo.png" alt="University Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <span>CampusConnect</span>
          </Link>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#stats">About</a>
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
          <div className="hero-badge"><Zap size={12} /> All-in-one student platform</div>
          <h1 className="hero-title">
            Your Campus Life,<br />
            <span className="hero-gradient">Simplified</span>
          </h1>
          <p className="hero-desc">
            Manage events, buy & sell on the marketplace, track lost items, find accommodation — everything from one beautiful dashboard.
          </p>
          <div className="hero-actions">
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Open Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
              </>
            )}
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
