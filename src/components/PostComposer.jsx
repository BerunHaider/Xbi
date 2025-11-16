import React, { useState } from 'react'
import supabase from '../supabase'
import { Image, Smile, Send } from 'lucide-react'

export default function PostComposer({ user, onPosted, compact = false }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const maxLength = 280
  const charCount = content.length
  const isValid = charCount > 0 && charCount <= maxLength

  const publish = async () => {
    if (!user) return alert('Necesitas iniciar sesión para publicar')
    if (!content.trim()) return

    setLoading(true)
    try {
      // Ensure profile exists before posting
      const { data: profileExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profileExists) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase.from('profiles').insert([
          { id: user.id, username: user.email?.split('@')[0] || 'user' },
        ])
        if (profileError && !profileError.message.includes('duplicate')) {
          throw profileError
        }
      }

      // Now insert the post
      const { error } = await supabase.from('posts').insert([
        { content: content.trim(), author_id: user.id },
      ])
      if (error) throw error

      setContent('')
      onPosted && onPosted()
    } catch (err) {
      console.error('Error publishing post:', err)
      alert(err.message || 'Error al publicar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tweet-card border-b border-gray-200 dark:border-twitter-800 rounded-none p-4 space-y-4 animate-fade-in transition-all duration-300">
      {/* User Info + Textarea */}
      <div className="flex gap-4">
        {/* Avatar placeholder */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-twitter-400 to-twitter-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform hover:scale-105">
          {user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Compose area */}
        <form onSubmit={(e) => { e.preventDefault(); publish(); }} className="flex-1 space-y-4">
          {/* Textarea */}
            <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
              placeholder="¿Qué está pasando!"
              rows="3"
              className="w-full bg-transparent text-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600
                       resize-none outline-none focus:ring-0 border-0 p-0 leading-6
                       transition-all duration-200 focus:text-twitter-600 dark:focus:text-twitter-400"
            />

            {/* Character counter */}
            <div className={`absolute bottom-0 right-0 text-sm font-semibold transition-all duration-200 ${
              charCount > maxLength * 0.9 ? 'text-red-500 animate-pulse' : 'text-twitter-600'
            }`}>
              {charCount}/{maxLength}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-twitter-800 my-2 transition-colors duration-300"></div>

            {/* Action bar */}
          <div className="flex items-center justify-between">
            {/* Icons (placeholder for future features) */}
            <div className="flex gap-2 text-twitter-600 dark:text-twitter-500">
              {/* Image icon */}
              <button
                type="button"
                className="hover:bg-twitter-50 dark:hover:bg-twitter-900 rounded-full p-2 transition-all duration-200 hover:scale-110 disabled:opacity-50"
                disabled
                title="Coming soon"
              >
                <Image size={18} />
              </button>
              {/* Emoji icon */}
              <button
                type="button"
                className="hover:bg-twitter-50 dark:hover:bg-twitter-900 rounded-full p-2 transition-all duration-200 hover:scale-110 disabled:opacity-50"
                disabled
                title="Coming soon"
              >
                <Smile size={18} />
              </button>
            </div>

            {/* Publish button */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="btn-primary px-6 py-2 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            >
                  {loading ? (
                <>
                      <div className="inline-block animate-spin">⏳</div>
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                      <Send size={16} className="transition-transform group-hover:rotate-45" />
                  <span>Publicar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

