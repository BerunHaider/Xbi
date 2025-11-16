import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import supabase from '../supabase'

export default function Auth({ onUser }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) await upsertProfile(user)
      onUser && onUser(user)
      // If user is present and we have a stored redirect, navigate
      if (user) {
        const dest = location?.state?.from?.pathname || '/feed'
        navigate(dest, { replace: true })
      }
    }
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      onUser && onUser(u)
      // When auth state changes (login), navigate back if there is a saved 'from'
      if (u) {
        const dest = location?.state?.from?.pathname || '/feed'
        navigate(dest, { replace: true })
      }
    })

    return () => listener?.subscription?.unsubscribe?.()
  }, [])

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } catch (err) {
      console.error('Google auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    onUser && onUser(null)
  }

  const upsertProfile = async (user) => {
    // Create a simple profile when user signs in
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: user.user_metadata?.name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    if (error) console.error('Could not upsert profile:', error.message)
  }

  const signInMagicLink = async (ev) => {
    ev.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      alert('✓ Revisa tu correo para el enlace de inicio de sesión')
      setEmail('')
    }
  }

  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-twitter-50 to-gray-100 dark:from-twitter-900 dark:to-black px-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-white dark:bg-twitter-800 rounded-2xl shadow-xl p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold text-twitter-600 mb-2">𝕏</div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">¡Bienvenido!</h1>
              <p className="text-gray-600 dark:text-gray-400">Únete a nuestra comunidad</p>
            </div>

            {/* Email Magic Link Form */}
            <form onSubmit={signInMagicLink} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-twitter-700
                           bg-white dark:bg-twitter-900 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-600
                           focus:border-twitter-600 focus:outline-none focus:ring-2 focus:ring-twitter-600 focus:ring-opacity-10
                           transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-lg font-bold disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-pulse-subtle">⏳</div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>✉️</span>
                    <span>Enviar enlace mágico</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-twitter-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-twitter-800 text-gray-500 dark:text-gray-400">o</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full btn-secondary border-2 border-twitter-200 dark:border-twitter-700 flex items-center justify-center gap-3 py-3 text-lg font-bold disabled:opacity-50 hover:bg-twitter-50 dark:hover:bg-twitter-700"
            >
              <span className="text-2xl">🔵</span>
              <span>Entrar con Google</span>
            </button>

            {/* Footer */}
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Al acceder, aceptas nuestros términos de servicio
            </p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="flex items-center gap-4 animate-fade-in">
      <div className="hidden sm:flex flex-col">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.email}</p>
        <p className="text-xs text-gray-500">Conectado</p>
      </div>
      <button
        onClick={signOut}
        className="px-4 py-2 rounded-full font-bold text-twitter-600 dark:text-twitter-400
                 hover:bg-twitter-50 dark:hover:bg-twitter-800
                 transition-all duration-200 active:scale-95"
      >
        Salir
      </button>
    </div>
  )

}

