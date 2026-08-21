import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import AuthLayout from '../components/layout/AuthLayout'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1: Request Token, 2: Reset Password
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoHint, setDemoHint] = useState('')
  const navigate = useNavigate()

  const handleRequestToken = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email address')

    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      toast.success(res.data.message || 'Reset link generated')
      if (res.data.resetToken) {
        setToken(res.data.resetToken)
        setDemoHint(res.data.demoHint)
      }
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!token || !newPassword) return toast.error('Token and new password are required')

    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        new_password: newPassword
      })
      toast.success(res.data.message || 'Password updated!')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card card shadow-lg animate-fade">
        <div className="text-center mb-6">
          <div className="auth-icon-badge m-auto mb-3" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyRound size={24} />
          </div>
          <h2>{step === 1 ? 'Forgot Password?' : 'Reset Your Password'}</h2>
          <p className="text-xs text-muted mt-1">
            {step === 1
              ? 'Enter your registered university email to receive a password reset token.'
              : 'Enter your reset token and choose a strong new password.'
            }
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="auth-form">
            <div className="form-group mb-4">
              <label className="form-label text-xs font-semibold">Student Email Address</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Mail size={16} className="input-icon" style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input text-xs"
                  style={{ paddingLeft: 38 }}
                  placeholder="e.g. f240564@cfd.nu.edu.pk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Generating Reset Token...' : 'Send Reset Instructions'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            {demoHint && (
              <div className="p-3 mb-4 card text-xs" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <CheckCircle2 size={14} className="inline mr-1" /> {demoHint}
              </div>
            )}

            <div className="form-group mb-4">
              <label className="form-label text-xs font-semibold">Reset Token</label>
              <input
                type="text"
                className="form-input text-xs"
                placeholder="Paste your 64-character reset token"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
              />
            </div>

            <div className="form-group mb-6">
              <label className="form-label text-xs font-semibold">New Password</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input text-xs"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-accent w-full btn-lg" disabled={loading}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link to="/login" className="text-xs text-muted hover:text-primary flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
