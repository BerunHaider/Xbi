import { useState, useEffect, useRef } from 'react'
import useSearch from '../hooks/useSearch'
import useAuth from '../hooks/useAuth'
import Avatar from '../components/Avatar'
import { Search as SearchIcon, Loader, Trash2, Clock, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SearchPage({ onProfile, onPostClick }) {
  const { user } = useAuth()
  const { search, searchUsers, searchPosts, results, loading, query: searchQuery, clearResults } = useSearch()
  const [localQuery, setLocalQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [searchHistory, setSearchHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)
  const [liveSearching, setLiveSearching] = useState(false)
  const debounceTimer = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('searchHistory')
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch (e) {
        console.error('Error loading search history:', e)
      }
    }
  }, [])

  // Debounced live search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (!localQuery.trim()) {
      clearResults()
      setShowHistory(true)
      setLiveSearching(false)
      return
    }

    setLiveSearching(true)
    debounceTimer.current = setTimeout(async () => {
      setShowHistory(false)
      switch (activeTab) {
        case 'people':
          await searchUsers(localQuery)
          break
        case 'posts':
          await searchPosts(localQuery)
          break
        default:
          await search(localQuery)
      }
      setLiveSearching(false)
    }, 400) // 400ms debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [localQuery, activeTab])

  const handleHistoryClick = (historyQuery) => {
    setLocalQuery(historyQuery)
    saveToHistoryEntry(historyQuery)
    setShowHistory(false)
  }

  const saveToHistoryEntry = (query) => {
    if (!query.trim()) return
    const updated = [
      { id: Date.now(), query: query.trim(), timestamp: new Date().toISOString() },
      ...searchHistory.filter(h => h.query !== query.trim())
    ].slice(0, 15)
    setSearchHistory(updated)
    localStorage.setItem('searchHistory', JSON.stringify(updated))
  }

  const deleteSearchHistory = (id) => {
    const updated = searchHistory.filter(h => h.id !== id)
    setSearchHistory(updated)
    localStorage.setItem('searchHistory', JSON.stringify(updated))
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('searchHistory')
  }

  const hasResults = results.users?.length > 0 || results.posts?.length > 0

  return (
    <div className="w-full h-full bg-white dark:bg-twitter-900 flex flex-col">
      {/* Search Header */}
      <div className="sticky top-0 border-b border-gray-200 dark:border-twitter-800 p-4 bg-white dark:bg-twitter-900 z-10 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-3 text-gray-500" size={20} />
            <input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onFocus={() => !localQuery && setShowHistory(true)}
              placeholder="Busca usuarios, posts, hashtags..."
              className="w-full pl-12 pr-12 py-3 rounded-full bg-gray-100 dark:bg-twitter-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
            {(localQuery || liveSearching) && (
              <button
                onClick={() => {
                  setLocalQuery('')
                  clearResults()
                  setShowHistory(true)
                }}
                className="absolute right-4 top-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {liveSearching ? <Loader size={20} className="animate-spin" /> : <X size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Tabs - only show if we have results or are searching */}
        {(hasResults || (localQuery.trim() && liveSearching)) && (
          <div className="flex gap-6 border-b border-gray-200 dark:border-twitter-800 -mx-4 px-4 overflow-x-auto">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'people', label: 'Personas' },
              { id: 'posts', label: 'Posts' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-twitter-600 text-twitter-600 dark:text-twitter-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {(loading || liveSearching) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader className="animate-spin text-twitter-600 mx-auto mb-4" size={32} />
              <p className="text-gray-500 dark:text-gray-400">Buscando...</p>
            </div>
          </div>
        )}

        {!loading && showHistory && !localQuery && searchHistory.length > 0 && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={20} />
                Búsquedas recientes
              </h3>
              <button
                onClick={clearSearchHistory}
                className="text-sm text-twitter-600 dark:text-twitter-400 hover:text-twitter-700 dark:hover:text-twitter-300 font-medium"
              >
                Limpiar
              </button>
            </div>
            <div className="space-y-2">
              {searchHistory.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-twitter-800 group cursor-pointer transition-colors"
                >
                  <button
                    onClick={() => handleHistoryClick(item.query)}
                    className="flex-1 text-left flex items-center gap-3 min-w-0"
                  >
                    <Clock className="text-gray-400 flex-shrink-0" size={18} />
                    <span className="text-gray-900 dark:text-white truncate">{item.query}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSearchHistory(item.id)
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Trash2 className="text-gray-400 hover:text-red-500" size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !localQuery && !showHistory && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 px-4">
            <Sparkles size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-semibold">¿En qué estás pensando?</p>
            <p className="text-sm mt-2">Busca usuarios, posts o hashtags</p>
          </div>
        )}

        {!loading && !liveSearching && localQuery && !hasResults && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 px-4">
            <SearchIcon size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-semibold">Sin resultados</p>
            <p className="text-sm mt-2">No encontramos nada para "{localQuery}"</p>
          </div>
        )}

        {/* People Section */}
        {!loading && !liveSearching && (activeTab === 'all' || activeTab === 'people') && results.users?.length > 0 && (
          <div className="border-b border-gray-200 dark:border-twitter-800">
            {activeTab === 'all' && (
              <div className="sticky top-0 px-4 py-3 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-twitter-800 border-b border-gray-200 dark:border-twitter-800">
                Personas
              </div>
            )}
            <div className="divide-y divide-gray-200 dark:divide-twitter-800">
                {results.users.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => {
                    if (onProfile) onProfile(profile.username)
                    else navigate(`/@${profile.username}`)
                  }}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-twitter-800 transition-colors flex items-start gap-3"
                >
                  <Avatar
                    src={profile.avatar_url}
                    alt={profile.username}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{profile.username}</p>
                      {profile.is_verified && (
                        <span className="text-twitter-600 text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username?.toLowerCase()}</p>
                    {profile.bio && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mt-1">
                        {profile.bio}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {profile.followers_count || 0} seguidores
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        {!loading && !liveSearching && (activeTab === 'all' || activeTab === 'posts') && results.posts?.length > 0 && (
          <div>
            {activeTab === 'all' && (
              <div className="sticky top-0 px-4 py-3 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-twitter-800 border-b border-gray-200 dark:border-twitter-800">
                Posts
              </div>
            )}
            <div className="divide-y divide-gray-200 dark:divide-twitter-800">
              {results.posts.map(post => (
                <button
                  key={post.id}
                  onClick={() => onPostClick?.(post.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-twitter-800 transition-colors"
                >
                  <div className="flex gap-3">
                    <Avatar
                      src={post.author?.avatar_url || post.profiles?.avatar_url}
                      alt={post.author?.username || post.profiles?.username}
                      size={48}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {post.author?.username || post.profiles?.username}
                        </p>
                        <span className="text-gray-500">·</span>
                        <p className="text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mt-2 line-clamp-3">
                        {post.content}
                      </p>
                      <div className="flex gap-4 text-gray-500 text-sm mt-2">
                        <span>{post.likes_count || 0} me gusta</span>
                        <span>{post.comments_count || 0} comentarios</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
