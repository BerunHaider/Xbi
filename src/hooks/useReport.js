import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

export default function useReport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = useCallback(async ({ post_id = null, reporter_id = null, reason = '', details = '' }) => {
    setLoading(true)
    try {
      const user = supabase.auth.user()
      const reporter = reporter_id || (user && user.id) || null
      if (!reporter) throw new Error('Not authenticated')

      const payload = {
        post_id,
        reporter_id: reporter,
        reason,
        details
      }

      const { error } = await supabase.from('reports').insert(payload)
      if (error) throw error
      return { ok: true }
    } catch (err) {
      setError(err)
      return { ok: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return { submit, loading, error }
}
