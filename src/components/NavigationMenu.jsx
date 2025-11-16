import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  X,
  Home,
  Search,
  Bell,
  Bookmark,
  Heart,
  User,
  Settings,
  LogOut,
  MoreHorizontal,
  Share2,
  Flag,
  MessageSquare,
  Zap,
  HelpCircle,
  Moon,
  Sun
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NavigationMenu({ 
  user,
  setPage,
  onLogout,
  unreadNotifications = 0
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const mainMenuItems = [
    { 
      icon: Home, 
      label: 'Inicio', 
      action: () => { setPage('feed'); navigate('/feed'); setOpen(false) } 
    },
    { 
      icon: Search, 
      label: 'Explorar', 
      action: () => { setPage('search'); navigate('/search'); setOpen(false) } 
    },
    { 
      icon: Bell, 
      label: 'Notificaciones', 
      badge: unreadNotifications > 0 ? unreadNotifications : null,
      action: () => { setPage('notifications'); navigate('/notifications'); setOpen(false) } 
    },
    { 
      icon: MessageSquare, 
      label: 'Mensajes', 
      action: () => { setPage('messages'); navigate('/messages'); setOpen(false) } 
    },
    { 
      icon: Bookmark, 
      label: 'Guardados', 
      action: () => { if (!user) { navigate('/signup'); return } setPage('bookmarks'); navigate('/bookmarks'); setOpen(false) } 
    },
    { 
      icon: Heart, 
      label: 'Me gusta', 
      action: () => { if (!user) { navigate('/signup'); return } setPage('likes'); navigate('/likes'); setOpen(false) } 
    },
  ]

  const userMenuItems = [
    { 
      icon: User, 
      label: 'Mi Perfil', 
      action: () => { if (!user) { navigate('/signup'); return } setPage('profile'); navigate(`/@${user.user_metadata?.username || user.email?.split('@')[0]}`); setOpen(false) } 
    },
    { 
      icon: Settings, 
      label: 'Configuración', 
      action: () => { setPage('settings'); navigate('/settings'); setOpen(false) } 
    },
    { 
      icon: HelpCircle, 
      label: 'Ayuda', 
      action: () => { alert('Centro de ayuda: próximamente'); setOpen(false) } 
    },
  ]

  return (
    <div className={`relative ${user ? 'z-40' : 'z-30'}`} ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-twitter-800 transition-all duration-300 text-gray-600 dark:text-gray-300 hover:text-twitter-600 dark:hover:text-twitter-400 focus:outline-none focus:ring-2 focus:ring-twitter-500"
        aria-label="Abrir menú"
        aria-expanded={open}
        title="Menú"
      >
        {open ? <X size={20} className="animate-spin-90" /> : <Menu size={20} />}
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-20 transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute left-0 top-12 z-50 w-72 bg-white dark:bg-twitter-900 border border-gray-200 dark:border-twitter-800 rounded-xl shadow-2xl py-2 animate-scale-in">
            {/* Main Navigation */}
            <div className="border-b border-gray-200 dark:border-twitter-800 py-2">
              <div className="px-4 py-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Navegación</p>
              </div>
              {mainMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-twitter-800 group relative"
                  title={item.label}
                >
                  <item.icon size={18} className="group-hover:text-twitter-600 dark:group-hover:text-twitter-400 transition-colors" />
                  <span className="flex-1 font-medium text-sm group-hover:text-twitter-600 dark:group-hover:text-twitter-400 transition-colors">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* User Menu */}
            {user && (
              <div className="border-b border-gray-200 dark:border-twitter-800 py-2">
                <div className="px-4 py-2 mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cuenta</p>
                </div>
                {userMenuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-twitter-800 group"
                    title={item.label}
                  >
                    <item.icon size={18} className="group-hover:text-twitter-600 dark:group-hover:text-twitter-400 transition-colors" />
                    <span className="flex-1 font-medium text-sm group-hover:text-twitter-600 dark:group-hover:text-twitter-400 transition-colors">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Logout or Sign In */}
            <div className="py-2 border-t border-gray-200 dark:border-twitter-800">
              {user ? (
                <button
                  onClick={() => { onLogout?.(); setOpen(false) }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 group font-medium"
                  title="Cerrar sesión"
                >
                  <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm">Cerrar sesión</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { navigate('/signup'); setOpen(false) }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 text-twitter-600 dark:text-twitter-400 hover:bg-twitter-50 dark:hover:bg-twitter-800/30 group font-medium"
                    title="Crear cuenta"
                  >
                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Crear cuenta</span>
                  </button>
                  <button
                    onClick={() => { navigate('/'); setOpen(false) }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-twitter-800 group font-medium"
                    title="Inicio"
                  >
                    <Home size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Inicio</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
