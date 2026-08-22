import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import LoadingGrid from './components/ui/LoadingGrid'

// Layouts
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/layout/AuthLayout'

// Lazy-loaded Pages (Code-split for instant route transitions with Suspense skeleton fallbacks)
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Events = lazy(() => import('./pages/Events'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const MarketplaceDetail = lazy(() => import('./pages/MarketplaceDetail'))
const LostFound = lazy(() => import('./pages/LostFound'))
const Accommodation = lazy(() => import('./pages/Accommodation'))
const AccommodationDetail = lazy(() => import('./pages/AccommodationDetail'))
const AcademicsHub = lazy(() => import('./pages/AcademicsHub'))
const Timetable = lazy(() => import('./pages/Timetable'))
const Assignments = lazy(() => import('./pages/Assignments'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'))
const AdminMarketplace = lazy(() => import('./pages/admin/AdminMarketplace'))
const AdminMarketplaceReports = lazy(() => import('./pages/admin/AdminMarketplaceReports'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'))
const AdminLostFound = lazy(() => import('./pages/admin/AdminLostFound'))
const AdminAccommodation = lazy(() => import('./pages/admin/AdminAccommodation'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'))
const AdminTelemetryDashboard = lazy(() => import('./pages/admin/AdminTelemetryDashboard'))
const AdminBackups = lazy(() => import('./pages/admin/AdminBackups'))
const AdminDataExports = lazy(() => import('./pages/admin/AdminDataExports'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))



const NotFound = lazy(() => import('./pages/NotFound'))
const Forbidden = lazy(() => import('./pages/Forbidden'))

// Route guards
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'admin' ? children : <Navigate to="/403" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center" style={{ height: '100vh' }}><div className="spinner spinner-lg" /></div>
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#162035', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.15)' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              duration: 4000,
            }}
          />
          <Suspense fallback={
            <div className="p-6">
              <LoadingGrid count={6} />
            </div>
          }>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<PublicRoute><AuthLayout><Login /></AuthLayout></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><AuthLayout><Register /></AuthLayout></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

              {/* Protected App Routes */}
              <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:id" element={<EventDetail />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="marketplace/:id" element={<MarketplaceDetail />} />
                <Route path="lost-found" element={<LostFound />} />
                <Route path="accommodation" element={<Accommodation />} />
                <Route path="accommodation/:id" element={<AccommodationDetail />} />
                <Route path="academics" element={<AcademicsHub />} />
                <Route path="timetable" element={<Timetable />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><AppLayout isAdmin /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="marketplace" element={<AdminMarketplace />} />
                <Route path="marketplace-reports" element={<AdminMarketplaceReports />} />
                <Route path="telemetry" element={<AdminTelemetryDashboard />} />
                <Route path="backups" element={<AdminBackups />} />
                <Route path="exports" element={<AdminDataExports />} />
                <Route path="lost-found" element={<AdminLostFound />} />


                <Route path="accommodation" element={<AdminAccommodation />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="/403" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
