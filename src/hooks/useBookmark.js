import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export default function useBookmark(postId) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    try {
      const user = supabase.auth.user()
      if (!user) {
        setSaved(false)
        return
      }
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setSaved(!!data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const toggle = useCallback(async () => {
    setLoading(true)
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('Not authenticated')
      if (saved) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        if (error) throw error
        setSaved(false)
        return { saved: false }
      } else {
        const { error } = await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id })
        if (error) throw error
        setSaved(true)
        return { saved: true }
      }
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [postId, saved])

  return { saved, loading, error, toggle, refresh: fetch }
}
