import React, { useEffect, useState } from 'react'
import { profileAPI } from '../api'
import useProfile from '../hooks/useProfile'
import useFollow from '../hooks/useFollow'
import useAuth from '../hooks/useAuth'
import Avatar from './Avatar'
import { MapPin, Link as LinkIcon, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfilePreview({ userId, shortProfile, onFollowToggle }) {
  const { user: currentUser } = useAuth()
  const { profile, loading } = useProfile(userId)
  const { isFollowing, toggle: toggleFollow } = useFollow(currentUser?.id, userId)
  const [displayProfile, setDisplayProfile] = useState(shortProfile)

  useEffect(() => {
    if (profile) {
      setDisplayProfile(profile)
    }
  }, [profile])

  if (!displayProfile || loading) return null

  const isOwnProfile = currentUser?.id === userId
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-twitter-900 border border-gray-200 dark:border-twitter-800 rounded-lg shadow-lg w-80 overflow-hidden z-50 animate-fade-in">
      {/* Cover Image */}
      <div className="h-24 bg-gradient-to-r from-twitter-600 to-twitter-500 relative">
        {displayProfile.cover_url && (
          <img
            src={displayProfile.cover_url}
            alt="cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Content */}
      <div className="p-4 -mt-12 relative z-10">
        {/* Avatar and Follow Button */}
        <div className="flex items-start justify-between mb-3">
          <Avatar
            src={displayProfile.avatar_url}
            alt={displayProfile.username}
            size={64}
            className="border-4 border-white dark:border-twitter-900"
          />
          {!isOwnProfile && currentUser && (
            <button
              onClick={toggleFollow}
              className={`px-6 py-2 rounded-full font-bold transition-all duration-200 text-sm ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-twitter-800 text-gray-900 dark:text-white hover:bg-red-100 dark:hover:bg-red-900'
                  : 'bg-twitter-600 text-white hover:bg-twitter-700'
              }`}
            >
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
        </div>

        {/* Name and Handle */}
        <div className="mb-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            {displayProfile.username}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{displayProfile.username?.toLowerCase()}
          </p>
        </div>

        {/* Bio */}
        {displayProfile.bio && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-normal">
            {displayProfile.bio}
          </p>
        )}

        {/* Meta Information */}
        <div className="space-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
          {displayProfile.location && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>{displayProfile.location}</span>
            </div>
          )}
          {displayProfile.website && (
            <a
              href={displayProfile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-twitter-600 dark:text-twitter-400 hover:underline"
            >
              <LinkIcon size={14} />
              <span>{new URL(displayProfile.website).hostname}</span>
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-3 border-t border-gray-200 dark:border-twitter-800 pt-3">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {displayProfile.followers_count || 0}
            </span>
            <span className="text-xs text-gray-500">Seguidores</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {displayProfile.following_count || 0}
            </span>
            <span className="text-xs text-gray-500">Siguiendo</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {displayProfile.posts_count || 0}
            </span>
            <span className="text-xs text-gray-500">Posts</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 bg-twitter-600 hover:bg-twitter-700 text-white font-bold py-2 px-3 rounded-full text-sm transition-colors" onClick={() => navigate(`/@${displayProfile.username}`)}>
            Ver perfil
          </button>
          {displayProfile.email && (
            <button className="px-3 py-2 rounded-full border-2 border-twitter-600 text-twitter-600 dark:text-twitter-400 dark:border-twitter-400 hover:bg-twitter-50 dark:hover:bg-twitter-800 transition-colors"
              title="Enviar mensaje"
            >
              <Mail size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
