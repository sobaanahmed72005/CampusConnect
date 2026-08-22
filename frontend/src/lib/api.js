import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true,
})

// Helper to read cookie value by name
function getCookie(name) {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

// 1. Request Interceptor: Attach Anti-CSRF Token & Bearer Fallback Token
api.interceptors.request.use((config) => {
  // Attach Authorization token fallback if stored locally
  const token = localStorage.getItem('cc_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Double-Submit Cookie Pattern: Attach X-CSRF-Token header on state-changing requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    const xsrfToken = getCookie('XSRF-TOKEN')
    if (xsrfToken) {
      config.headers['X-CSRF-Token'] = xsrfToken
    }
  }

  return config
})

// Initialize CSRF Token Cookie on App Launch
export async function initCsrf() {
  try {
    if (!getCookie('XSRF-TOKEN')) {
      await api.get('/auth/csrf-token')
    }
  } catch (e) {
    // Fail silently in offline mode
  }
}
initCsrf()

// 2. Global Response & Network Error Interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auth failure redirect
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      localStorage.removeItem('cc_user')
      localStorage.removeItem('cc_token')
      window.location.href = '/login'
    }

    // CSRF verification failure warning
    if (err.response?.status === 430 || (err.response?.status === 403 && err.response?.data?.message?.includes('CSRF'))) {
      toast.error('Security token mismatch. Refreshing session...')
      initCsrf()
    }

    // Network connection or server timeout failure
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
      toast.error('Unable to connect to CampusConnect. Please check your network.')
    } else if (err.response?.status >= 500) {
      const serverMsg = err.response?.data?.message
      toast.error(serverMsg || 'CampusConnect server error. Please try again in a moment.')
    }

    return Promise.reject(err)
  }
)

export default api
