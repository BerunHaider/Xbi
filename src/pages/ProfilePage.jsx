import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import useAuth from '../hooks/useAuth'
import { Heart, MessageSquare, Share, MoreHorizontal, Edit, MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import EditProfile from '../components/EditProfile'
import VerificationBadge from '../components/VerificationBadge'

export default function ProfilePage() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [likedPosts, setLikedPosts] = useState(new Set())

  useEffect(() => {
    if (!username) {
      setError('Usuario no especificado')
      setLoading(false)
      return
    }
    fetchProfile()
  }, [username, currentUser])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      // Normalizar el parámetro (puede venir con @ o ser un id)
      const raw = decodeURIComponent(username || '')
      let lookup = raw.startsWith('@') ? raw.slice(1) : raw

      const isUUID = (s) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s)

      let data = null
      let error = null

      if (isUUID(lookup)) {
        const res = await supabase.from('profiles').select('*').eq('id', lookup).single()
        data = res.data; error = res.error
      } else {
        // intentar búsqueda exacta case-insensitive
        const res = await supabase.from('profiles').select('*').ilike('username', lookup).single()
        data = res.data; error = res.error
      }

      if (error) {
        console.error('Profile fetch error:', error)
        setError(`Usuario @${username} no encontrado`)
        setProfile(null)
        return
      }

      if (!data) {
        setError(`Usuario @${lookup} no encontrado`)
        setProfile(null)
        return
      }

      setProfile(data)
      fetchPosts(data.id)
      if (currentUser) fetchFollowStatus(data.id)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPosts(data || [])

      // Get likes
      if (currentUser) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', (data || []).map(p => p.id))

        setLikedPosts(new Set(likeData?.map(l => l.post_id) || []))
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const fetchFollowers = async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id, follower: follower_id(id, username, avatar_url)')
        .eq('following_id', profileId)

      if (error) throw error
      setFollowers((data || []).map(r => r.follower))
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  const fetchFollowing = async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, following: following_id(id, username, avatar_url)')
        .eq('follower_id', profileId)

      if (error) throw error
      setFollowing((data || []).map(r => r.following))
    } catch (error) {
      console.error('Error fetching following:', error)
    }
  }

  const fetchFollowStatus = async () => {
    try {
      if (!profile || !currentUser) return
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
        .single()

      setIsFollowing(!!data)
    } catch (error) {
      setIsFollowing(false)
    }
  }

  const toggleFollow = async () => {
    if (!currentUser || !profile || profile.id === currentUser.id) return

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id
          })
      }

      setIsFollowing(!isFollowing)
      fetchProfile() // Refresh counts
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const toggleFollowUser = async (targetUserId) => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return
    try {
      // check if following
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single()

      if (data) {
        await supabase.from('follows').delete().eq('id', data.id)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId })
      }

      // refresh lists
      if (profile) {
        fetchFollowers(profile.id)
        fetchFollowing(profile.id)
        fetchProfile()
      }
    } catch (err) {
      console.error('Error toggling follow user:', err)
    }
  }

  const toggleLike = async (postId) => {
    if (!currentUser) return

    try {
      if (likedPosts.has(postId)) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id)

        setLikedPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          })

        setLikedPosts(prev => new Set(prev).add(postId))
      }

      fetchPosts()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-white dark:bg-twitter-900 flex items-center justify-center">
        <div className="text-twitter-500">Cargando...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="w-full h-full bg-white dark:bg-twitter-900 flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-xl font-bold text-gray-900 dark:text-white">⚠️ {error || 'Perfil no encontrado'}</div>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          El usuario <span className="font-semibold">@{username}</span> no existe o ha sido eliminado.
        </p>
        <a href="/feed" className="text-twitter-600 hover:underline font-medium">
          ← Volver al inicio
        </a>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile?.id

  return (
    <div className="w-full h-full bg-white dark:bg-twitter-900 flex flex-col overflow-hidden">
      {/* Profile Header */}
      <div className="border-b border-gray-200 dark:border-twitter-800">
        {/* Cover Image */}
        <div className="h-40 bg-gradient-to-r from-twitter-500 to-twitter-600 relative">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-twitter-900 bg-gradient-to-br from-twitter-500 to-twitter-600 overflow-hidden">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              )}
            </div>

            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="mt-4 px-6 py-2 rounded-full border-2 border-twitter-500 text-twitter-500 dark:text-twitter-400 font-bold hover:bg-twitter-50 dark:hover:bg-twitter-900 transition-colors flex items-center gap-2"
              >
                <Edit size={18} />
                Editar perfil
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                className={`mt-4 px-6 py-2 rounded-full font-bold transition-colors ${
                  isFollowing
                    ? 'bg-white dark:bg-twitter-800 text-gray-900 dark:text-white border border-gray-300 dark:border-twitter-700 hover:bg-gray-100 dark:hover:bg-twitter-700'
                    : 'bg-twitter-500 text-white hover:bg-twitter-600'
                }`}
              >
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>

          {/* Profile Details */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.username}</h1>
              {profile.is_verified && (
                <VerificationBadge />
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">@{profile.username}</p>

            {profile.bio && (
              <p className="mt-3 text-gray-900 dark:text-white">{profile.bio}</p>
            )}

            {/* Location & Website */}
            <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  {profile.location}
                </div>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-twitter-500 hover:underline"
                >
                  <LinkIcon size={16} />
                  Sitio web
                </a>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                Se unió {new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{profile.following_count || 0}</span>
                <span className="text-gray-600 dark:text-gray-400"> Siguiendo</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{profile.followers_count || 0}</span>
                <span className="text-gray-600 dark:text-gray-400"> Seguidores</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{profile.posts_count || 0}</span>
                <span className="text-gray-600 dark:text-gray-400"> Posts</span>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="mt-4">
            <div className="flex gap-4">
              <button onClick={() => { setActiveTab('posts') }} className={`px-3 py-1 rounded-full ${activeTab === 'posts' ? 'bg-twitter-100 dark:bg-twitter-800' : ''}`}>Posts</button>
              <button onClick={() => { setActiveTab('followers'); fetchFollowers(profile.id) }} className={`px-3 py-1 rounded-full ${activeTab === 'followers' ? 'bg-twitter-100 dark:bg-twitter-800' : ''}`}>Seguidores</button>
              <button onClick={() => { setActiveTab('following'); fetchFollowing(profile.id) }} className={`px-3 py-1 rounded-full ${activeTab === 'following' ? 'bg-twitter-100 dark:bg-twitter-800' : ''}`}>Siguiendo</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-twitter-800">
        {activeTab === 'posts' && (
          (posts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-semibold">Sin posts</p>
              <p className="text-sm">{profile.username} aún no ha publicado nada</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="p-4 hover:bg-gray-50 dark:hover:bg-twitter-800 transition-colors cursor-pointer">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-twitter-500 to-twitter-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white">{profile.username}</p>
                        <p className="text-gray-600 dark:text-gray-400">@{profile.username}</p>
                        <p className="text-gray-600 dark:text-gray-400">•</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {new Date(post.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <MoreHorizontal size={16} className="text-gray-500" />
                    </div>

                    <p className="mt-3 text-gray-900 dark:text-white">{post.content}</p>

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="mt-3 rounded-xl max-h-96 w-full object-cover"
                      />
                    )}

                    <div className="flex justify-between mt-3 max-w-xs text-gray-600 dark:text-gray-400 text-sm">
                      <button className="flex items-center gap-2 hover:text-twitter-500 group">
                        <div className="group-hover:bg-twitter-500 group-hover:bg-opacity-20 p-2 rounded-full transition-colors">
                          <MessageSquare size={16} />
                        </div>
                      </button>

                      <button className="flex items-center gap-2 hover:text-green-500 group">
                        <div className="group-hover:bg-green-500 group-hover:bg-opacity-20 p-2 rounded-full transition-colors">
                          <Share size={16} />
                        </div>
                      </button>

                      <button
                        onClick={() => toggleLike(post.id)}
                        className="flex items-center gap-2 hover:text-red-500 group"
                      >
                        <div className="group-hover:bg-red-500 group-hover:bg-opacity-20 p-2 rounded-full transition-colors">
                          <Heart
                            size={16}
                            fill={likedPosts.has(post.id) ? 'currentColor' : 'none'}
                            className={likedPosts.has(post.id) ? 'text-red-500' : ''}
                          />
                        </div>
                        <span className={likedPosts.has(post.id) ? 'text-red-500' : ''}>
                          {post.likes_count || 0}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'followers' && (
          <div className="p-4">
            {followers.length === 0 ? (
              <div className="text-center text-gray-500">No tiene seguidores aún</div>
            ) : (
              followers.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-twitter-800">
                  <div className="flex items-center gap-3">
                    <img src={f.avatar_url || 'https://via.placeholder.com/40'} alt={f.username} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold">{f.username}</div>
                    </div>
                  </div>
                  <div>
                    <button onClick={() => toggleFollowUser(f.id)} className="px-3 py-1 rounded-full bg-twitter-500 text-white">Seguir/Dejar de seguir</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="p-4">
            {following.length === 0 ? (
              <div className="text-center text-gray-500">No sigue a nadie aún</div>
            ) : (
              following.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-twitter-800">
                  <div className="flex items-center gap-3">
                    <img src={f.avatar_url || 'https://via.placeholder.com/40'} alt={f.username} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold">{f.username}</div>
                    </div>
                  </div>
                  <div>
                    <button onClick={() => toggleFollowUser(f.id)} className="px-3 py-1 rounded-full bg-white dark:bg-twitter-800 border border-gray-300">Seguir/Dejar de seguir</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfile
          user={currentUser}
          onClose={() => setShowEditModal(false)}
          onUpdate={fetchProfile}
        />
      )}
    </div>
  )
}
