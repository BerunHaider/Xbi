import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Search, Bell, Mail, User, Plus, Menu, X, LogOut, Settings, Heart, Bookmark } from 'lucide-react'
import { notificationsAPI } from '../api'
import ThemeToggle from './ThemeToggle'
import FocusLock from 'react-focus-lock'

export default function MobileNav({ page, setPage, user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  // close on Escape for accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const menuItems = [
    { icon: Home, label: 'Inicio', page: 'feed', path: '/feed', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    { icon: Search, label: 'Explorar', page: 'search', path: '/search', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
    { icon: Bell, label: 'Notificaciones', page: 'notifications', path: '/notifications', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
    { icon: Bookmark, label: 'Guardados', page: 'bookmarks', path: '/bookmarks', color: 'hover:bg-green-50 dark:hover:bg-green-900/20' },
    { icon: User, label: 'Perfil', page: 'profile', path: user ? `/@${user.user_metadata?.username || user.email?.split('@')[0]}` : '/signup', color: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
    { icon: Settings, label: 'Configuración', page: 'settings', path: '/settings', color: 'hover:bg-gray-50 dark:hover:bg-gray-800' },
  ]

  const navTo = useNavigate()
  const [unread, setUnread] = useState(0)

  const handleNavClick = (item) => {
    setPage(item.page)
    try { navTo(item.path) } catch (e) {}
    setIsOpen(false)
  }

  useEffect(() => {
    // block body scroll when menu open
    try {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    } catch (e) {}
    return () => { try { document.body.style.overflow = '' } catch (e) {} }
  }, [isOpen])

  useEffect(() => {
    let mounted = true
    async function getUnread() {
      try {
        if (!user?.id) {
          if (mounted) setUnread(0)
          return
        }
        const count = await notificationsAPI.getUnreadCount(user.id)
        if (mounted) setUnread(count)
      } catch (err) {
        console.error('Failed to fetch unread count', err)
      }
    }
    getUnread()
    const onVisibility = () => { if (!document.hidden) getUnread() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { mounted = false; document.removeEventListener('visibilitychange', onVisibility) }
  }, [user])

  return (
    <>
      {/* Hamburguesa + Botón crear (Móvil) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-twitter-900 border-b border-gray-200 dark:border-twitter-800">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburguesa */}
          <button
            onClick={toggleMenu}
            aria-label="Abrir menú"
            aria-expanded={isOpen}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-twitter-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-twitter-500"
            title="Menú"
          >
            <div className="relative w-6 h-5">
              <span className={`absolute w-full h-0.5 bg-current transition-all duration-300 ${isOpen ? 'top-2 rotate-45' : 'top-0'}`}></span>
              <span className={`absolute w-full h-0.5 bg-current top-2 transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`absolute w-full h-0.5 bg-current transition-all duration-300 ${isOpen ? 'top-2 -rotate-45' : 'top-4'}`}></span>
            </div>
          </button>

          {/* Logo/Título */}
          <h1 className="text-xl font-bold text-twitter-600">X</h1>

          {/* Botón Crear */}
          <button
            className="bg-gradient-to-r from-twitter-600 to-blue-600 hover:from-twitter-700 hover:to-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-twitter-500"
            onClick={() => { if (!user) { navTo('/signup'); return } setPage('compose'); navTo('/compose') }}
            aria-label="Crear post"
            title="Crear post"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Menú hamburguesa desplegable */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-twitter-900 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={isOpen}
      >
        {/* Header del menú */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-twitter-800">
          <h2 className="text-xl font-bold text-twitter-600">Menú</h2>
          <button
            onClick={toggleMenu}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-twitter-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Información del usuario */}
        {user && (
          <div className="p-4 border-b border-gray-200 dark:border-twitter-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-twitter-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.email?.split('@')[0] || 'user'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Items del menú */}
        <FocusLock disabled={!isOpen} returnFocus={true}>
        <nav className="py-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.page}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-gray-200 font-medium transition-all duration-200 ${item.color} ${
                page === item.page ? 'bg-twitter-50 dark:bg-twitter-800/30 border-l-4 border-twitter-600 text-twitter-600 dark:text-twitter-400' : ''
              }`}
                aria-label={item.label}
                tabIndex={0}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        </FocusLock>

        {/* Divisor */}
        <div className="border-t border-gray-200 dark:border-twitter-800 my-4"></div>

        {/* Theme Toggle */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tema</span>
          <ThemeToggle />
        </div>

        {/* Logout */}
        {user && (
          <button
            onClick={() => {
              onLogout?.()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 border-t border-gray-200 dark:border-twitter-800 mt-4"
          >
            <LogOut size={22} />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>

      {/* Overlay oscuro */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleMenu}
        ></div>
      )}

      {/* Bottom nav - always visible */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-twitter-900 border-t border-gray-200 dark:border-twitter-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-2">
          <button
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-all duration-200 ${
              page === 'feed'
                ? 'text-twitter-600 dark:text-twitter-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-twitter-600 dark:hover:text-twitter-400'
            }`}
            onClick={() => { setPage('feed'); navTo('/feed') }}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Inicio</span>
          </button>

            <button
            className={`flex-1 flex flex-col items-center justify-center p-2 transition-all duration-200 ${
              page === 'search'
                ? 'text-twitter-600 dark:text-twitter-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-twitter-600 dark:hover:text-twitter-400'
            }`}
            onClick={() => { setPage('search'); navTo('/search') }}
          >
            <Search size={20} />
            <span className="text-xs mt-1">Explorar</span>
          </button>
              {/* Compose central floating button */}
              <div className="flex-1 flex justify-center items-center -mt-10">
                <button onClick={() => { if (!user) { navTo('/signup'); return } setPage('compose'); navTo('/compose') }} className="compose-btn bg-gradient-to-r from-twitter-600 to-blue-600 text-white">
                  <Plus size={20} />
                </button>
              </div>

              <button
                className={`flex-1 flex flex-col items-center justify-center p-2 transition-all duration-200 ${
                  page === 'notifications'
                    ? 'text-twitter-600 dark:text-twitter-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-twitter-600 dark:hover:text-twitter-400'
                }`}
                onClick={() => { setPage('notifications'); navTo('/notifications') }}
              >
                <div className="relative">
                  <Bell size={20} />
                  {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
                </div>
                <span className="text-xs mt-1">Notifs</span>
              </button>

              <button
                className={`flex-1 flex flex-col items-center justify-center p-2 transition-all duration-200 ${
                  page === 'profile'
                    ? 'text-twitter-600 dark:text-twitter-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-twitter-600 dark:hover:text-twitter-400'
                }`}
                onClick={() => {
                  if (!user) {
                    navTo('/signup')
                    return
                  }
                  setPage('profile');
                  navTo(`/@${user?.user_metadata?.username || user?.email?.split('@')[0]}`)
                }}
              >
                <User size={20} />
                <span className="text-xs mt-1">Perfil</span>
              </button>

          <div className="absolute right-4 top-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  )
}
