import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cc_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Re-verify user session via HttpOnly cookie
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user)
        localStorage.setItem('cc_user', JSON.stringify(res.data.user))
      })
      .catch(() => {
        localStorage.removeItem('cc_user')
        localStorage.removeItem('cc_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    // HttpOnly cookie is automatically set by response header
    if (res.data.token) {
      localStorage.setItem('cc_token', res.data.token)
    }
    localStorage.setItem('cc_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    // HttpOnly cookie is automatically set by response header
    if (res.data.token) {
      localStorage.setItem('cc_token', res.data.token)
    }
    localStorage.setItem('cc_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {}
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    setUser(updated)
    localStorage.setItem('cc_user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
