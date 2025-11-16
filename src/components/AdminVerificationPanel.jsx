import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Check, X, FileText } from 'lucide-react'

export default function AdminVerificationPanel() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('verifications').select('*, user: user_id(id, username, avatar_url)').eq('status', 'pending')
      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error('Error loading verification requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests() }, [])

  const review = async (id, approve) => {
    try {
      const status = approve ? 'approved' : 'rejected'
      const metadata = approve ? JSON.stringify({ reviewed_by: 'admin' }) : null
      const { error } = await supabase.rpc('admin_review_verification', { p_verification_id: id, p_status: status, p_admin_id: supabase.auth.user()?.id || null, p_metadata: metadata })
      if (error) throw error
      await loadRequests()
    } catch (err) {
      console.error('Error reviewing:', err)
    }
  }

  if (loading) return <div>Cargando solicitudes...</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Solicitudes de verificación</h2>
      {requests.length === 0 ? (
        <div>No hay solicitudes pendientes</div>
      ) : (
        requests.map(r => (
          <div key={r.id} className="p-3 border-b flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img src={r.user.avatar_url || 'https://via.placeholder.com/48'} className="w-12 h-12 rounded-full" />
              <div>
                <div className="font-bold">{r.user.username}</div>
                <div className="text-sm text-gray-600">{r.reason}</div>
                <div className="text-xs text-gray-500 mt-1">Docs: {(r.documents || []).length} items</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => review(r.id, true)} className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2"><Check /> Aprobar</button>
              <button onClick={() => review(r.id, false)} className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2"><X /> Rechazar</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
