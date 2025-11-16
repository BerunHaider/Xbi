import { useState, useEffect } from 'react'
import { Heart, Bookmark, Loader } from 'lucide-react'
import useBookmark from '../hooks/useBookmark'
import useAuth from '../hooks/useAuth'
import Avatar from '../components/Avatar'

export default function BookmarksPage() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(false)
  const { getBookmarks, removeBookmark } = useBookmark()

  useEffect(() => {
    if (user?.id) fetchBookmarks()
  }, [user?.id])

  const fetchBookmarks = async () => {
    setLoading(true)
    try {
      const data = await getBookmarks(user.id)
      setBookmarks(data || [])
    } catch (err) {
      console.error('Error loading bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBookmark = async (postId) => {
    try {
      await removeBookmark(user.id, postId)
      setBookmarks(bookmarks.filter(b => b.post_id !== postId))
    } catch (err) {
      console.error('Error removing bookmark:', err)
    }
  }

  if (!user) {
    return (
      <div className="w-full h-full bg-white dark:bg-twitter-900 flex items-center justify-center">
        <div className="text-center">
          <Bookmark size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Inicia sesión para ver tus bookmarks</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white dark:bg-twitter-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 border-b border-gray-200 dark:border-twitter-800 p-4 bg-white dark:bg-twitter-900 z-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bookmark size={24} />
          Bookmarks
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-twitter-500" size={32} />
          </div>
        )}

        {!loading && bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Bookmark size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-1">Sin bookmarks aún</p>
            <p className="text-sm">Los posts que guardes aparecerán aquí</p>
          </div>
        )}

        {!loading && bookmarks.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-twitter-800">
            {bookmarks.map(bookmark => {
              const post = bookmark.posts
              if (!post) return null
              return (
                <div
                  key={bookmark.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-twitter-800 transition-colors border-b border-gray-100 dark:border-twitter-800"
                >
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <Avatar
                      src={post.profiles?.avatar_url}
                      alt={post.profiles?.username}
                      size={48}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {post.profiles?.username}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            @{post.profiles?.username}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveBookmark(post.id)}
                          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500 transition-colors"
                          title="Remover bookmark"
                        >
                          <Bookmark size={18} fill="currentColor" />
                        </button>
                      </div>

                      {/* Post content */}
                      <p className="text-gray-900 dark:text-white mb-3 break-words">
                        {post.content}
                      </p>

                      {/* Media preview (if exists) */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                          {post.media_urls.slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="post media"
                              className="w-full h-auto object-cover max-h-48"
                            />
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <p className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
