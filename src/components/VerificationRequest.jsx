import React, { useState } from 'react'
import useAuth from '../hooks/useAuth'
import { supabase } from '../supabase'
import { Upload, FileText } from 'lucide-react'

export default function VerificationRequest({ onRequested }) {
  const { user } = useAuth()
  const [docs, setDocs] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      // docs: comma-separated URLs (simple approach) or upload handling
      const docsArray = docs.split(',').map(s => s.trim()).filter(Boolean)

      const { error } = await supabase.rpc('request_verification', {
        p_user_id: user.id,
        p_documents: docsArray,
        p_reason: reason || null
      })

      if (error) throw error
      onRequested?.()
    } catch (err) {
      console.error('Error requesting verification:', err)
      setError(err.message || 'Error al solicitar verificación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">Adjunta pruebas (URLs a documentos oficiales, imágenes) separadas por comas.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Documentos</label>
        <input value={docs} onChange={(e) => setDocs(e.target.value)} placeholder="https://... , https://..." className="w-full px-3 py-2 rounded border" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo / descripción</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded border" rows={3} />
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-twitter-600 text-white">
          {loading ? 'Enviando...' : 'Solicitar verificación'}
        </button>
      </div>
    </form>
  )
}
