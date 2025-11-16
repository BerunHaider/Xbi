import { useState, useEffect } from 'react'
import useProfile from '../hooks/useProfile'
import useAuth from '../hooks/useAuth'
import { X, Upload, Loader, AlertCircle } from 'lucide-react'
import { storageAPI } from '../api'

export default function EditProfile({ onClose, onUpdate }) {
  const { user } = useAuth()
  const { profile, updateProfile, loading: profileLoading } = useProfile(user?.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    location: '',
    website: '',
    avatar_url: '',
    cover_url: '',
    date_of_birth: '',
    country: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
        cover_url: profile.cover_url || '',
        date_of_birth: profile.date_of_birth || '',
        country: profile.country || ''
      })
    }
  }, [profile])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('El nombre de usuario es requerido')
      return false
    }
    if (formData.username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return false
    }
    if (formData.bio && formData.bio.length > 160) {
      setError('La biografía no puede exceder 160 caracteres')
      return false
    }
    if (formData.website && !isValidUrl(formData.website)) {
      setError('La URL del sitio web no es válida')
      return false
    }
    return true
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!validateForm()) return

    setLoading(true)

    try {
      let avatarUrl = formData.avatar_url
      let coverUrl = formData.cover_url

      // Upload avatar if changed
      if (avatarFile) {
        const url = await storageAPI.uploadImage(avatarFile, 'avatars', user.id)
        if (url) {
          avatarUrl = url
        } else {
          throw new Error('Error al subir la foto de perfil')
        }
      }

      // Upload cover if changed
      if (coverFile) {
        const url = await storageAPI.uploadImage(coverFile, 'covers', user.id)
        if (url) {
          coverUrl = url
        } else {
          throw new Error('Error al subir la imagen de portada')
        }
      }

      const success = await updateProfile({
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        date_of_birth: formData.date_of_birth || null,
        country: formData.country || null
      })

      if (success) {
        setSuccess(true)
        onUpdate?.()
        setTimeout(() => onClose(), 1500)
      } else {
        setError('Error al actualizar el perfil')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="animate-spin">
          <span className="text-4xl">🔄</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-twitter-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-twitter-800 bg-white dark:bg-twitter-900 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Perfil</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
            ✓ Perfil actualizado exitosamente
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Imagen de Portada
            </label>
            <div className="relative bg-gray-100 dark:bg-twitter-800 rounded-lg h-32 overflow-hidden group">
              <img
                src={coverPreview || formData.cover_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all cursor-pointer">
                <Upload className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Avatar Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-twitter-800 group border-4 border-gray-200 dark:border-twitter-800">
                <img
                  src={avatarPreview || formData.avatar_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%231DA1F2%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all cursor-pointer">
                  <Upload className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recomendado: 400x400px
              </p>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              maxLength={30}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.username.length}/30</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Biografía
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 resize-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.bio?.length || 0}/160</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              maxLength={30}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              País
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              maxLength={50}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Sitio Web
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-twitter-700 bg-white dark:bg-twitter-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-twitter-500 transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-twitter-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-full font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-twitter-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full font-bold bg-twitter-600 hover:bg-twitter-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading && <Loader size={18} className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
