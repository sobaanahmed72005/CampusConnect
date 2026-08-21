import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import NetworkBanner from '../ui/NetworkBanner'
import './AppLayout.css'

export default function AppLayout({ isAdmin = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpen])

  return (
    <div className="page-container">
      {/* Render Backdrop ONLY on Mobile when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} isAdmin={isAdmin} />

      <div className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <NetworkBanner />
        <Header onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="page-body animate-fade">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
