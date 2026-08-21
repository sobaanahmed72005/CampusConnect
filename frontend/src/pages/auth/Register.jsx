import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

const departments = ['Computer Science','Electrical Engineering','Mechanical Engineering','Business Administration','Medicine','Law','Architecture','Arts & Design','Mathematics','Physics']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', password:'', confirm_password:'', department:'', student_id:'' })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.last_name.trim()) e.last_name = 'Last name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.student_id.trim()) e.student_id = 'Student ID is required'
    if (!form.department) e.department = 'Department is required'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to CampusConnect!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{marginBottom:'8px'}}>Create your account</h2>
      <p style={{fontSize:'0.875rem', marginBottom:'24px'}}>Join CampusConnect and manage your university life</p>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{gap:'12px'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">First Name</label>
            <input className={`form-input ${errors.first_name?'error':''}`} placeholder="John" value={form.first_name} onChange={e=>set('first_name',e.target.value)} />
            {errors.first_name && <span className="form-error">{errors.first_name}</span>}
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Last Name</label>
            <input className={`form-input ${errors.last_name?'error':''}`} placeholder="Doe" value={form.last_name} onChange={e=>set('last_name',e.target.value)} />
            {errors.last_name && <span className="form-error">{errors.last_name}</span>}
          </div>
        </div>

        <div className="form-group mt-2">
          <label className="form-label">University Email</label>
          <input className={`form-input ${errors.email?'error':''}`} type="email" placeholder="student@university.edu" value={form.email} onChange={e=>set('email',e.target.value)} />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="grid-2" style={{gap:'12px'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Student ID</label>
            <input className={`form-input ${errors.student_id?'error':''}`} placeholder="2021CS001" value={form.student_id} onChange={e=>set('student_id',e.target.value)} />
            {errors.student_id && <span className="form-error">{errors.student_id}</span>}
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Department</label>
            <select className={`form-input form-select ${errors.department?'error':''}`} value={form.department} onChange={e=>set('department',e.target.value)}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <span className="form-error">{errors.department}</span>}
          </div>
        </div>

        <div className="form-group mt-2">
          <label className="form-label">Password</label>
          <div style={{position:'relative'}}>
            <input className={`form-input ${errors.password?'error':''}`} type={showPw?'text':'password'} placeholder="Min. 6 characters" value={form.password} onChange={e=>set('password',e.target.value)} style={{paddingRight:'42px'}} />
            <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>
              {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input className={`form-input ${errors.confirm_password?'error':''}`} type="password" placeholder="Repeat your password" value={form.confirm_password} onChange={e=>set('confirm_password',e.target.value)} />
          {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
        </div>

        <button type="submit" className={`btn btn-primary btn-full mt-2 ${loading?'btn-loading':''}`} disabled={loading}>
          {loading ? <><div className="spinner"/>Creating account...</> : <><UserPlus size={16}/>Create Account</>}
        </button>
      </form>

      <p className="text-center mt-4" style={{fontSize:'0.875rem',color:'var(--text-muted)'}}>
        Already have an account? <Link to="/login" style={{color:'var(--primary)',fontWeight:600}}>Sign in</Link>
      </p>
    </div>
  )
}
