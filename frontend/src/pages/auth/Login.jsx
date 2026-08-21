import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{marginBottom:'8px'}}>Welcome back</h2>
      <p style={{fontSize:'0.875rem', marginBottom:'28px'}}>Sign in to your CampusConnect account</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" placeholder="student@university.edu"
            value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-1">
            <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>
          <div style={{position:'relative'}}>
            <input className={`form-input ${errors.password ? 'error' : ''}`}
              type={showPw ? 'text' : 'password'} placeholder="Your password"
              value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              style={{paddingRight: '42px'}} />
            <button type="button" onClick={() => setShowPw(v=>!v)}
              style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <button type="submit" className={`btn btn-primary btn-full mt-4 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
          {loading ? <><div className="spinner"/>Signing in...</> : <><LogIn size={16}/>Sign In</>}
        </button>
      </form>

      <div className="divider-text mt-6">or</div>

      {/* Demo credentials */}
      <div style={{background:'var(--bg-input)',borderRadius:'var(--radius-md)',padding:'12px',marginTop:'16px',fontSize:'0.78rem',color:'var(--text-muted)'}}>
        <strong style={{color:'var(--primary)'}}>Demo credentials:</strong><br/>
        Student: student@campus.edu / password123<br/>
        Admin: admin@campus.edu / admin123
      </div>

      <p className="text-center mt-4" style={{fontSize:'0.875rem',color:'var(--text-muted)'}}>
        Don't have an account? <Link to="/register" style={{color:'var(--primary)',fontWeight:600}}>Create one</Link>
      </p>
    </div>
  )
}
