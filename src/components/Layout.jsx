import React from 'react'
import Navbar from './Navbar'
// Sidebar moved to DropdownMenu in Navbar; keep Sidebar file for reference
import MobileNav from './MobileNav'
import Footer from './Footer'
import { useLocation } from 'react-router-dom'

export default function Layout({ children, page, setPage, user, onLogout }) {
  const location = useLocation()
  const authPaths = ['/', '/signup', '/login']
  const isLanding = authPaths.includes(location?.pathname)
  return (
    <div className="min-h-screen flex bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      {/* Dropdown menu replaces persistent sidebar */}
      {/* Sidebar removed per UX request; to keep menu accessible we use DropdownMenu in Navbar */}

      <div className="flex-1">
        {!isLanding && <Navbar user={user} setPage={setPage} />}
        <main className={`${isLanding ? 'pt-6 md:pt-8' : 'pt-16 md:pt-20'}`}>
          <div className="w-full px-4 md:container-center">
            {children}
          </div>
        </main>
        {/* Only show footer on landing page */}
        {isLanding && <Footer />}
      </div>

      {/* Mobile nav (hide on landing) */}
      {!isLanding && <MobileNav page={page} setPage={setPage} user={user} onLogout={onLogout} />}
    </div>
  )
}
