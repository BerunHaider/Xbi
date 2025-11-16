import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import supabase from '../supabase'
import useAuth from '../hooks/useAuth'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="py-8 text-center">Cargando...</div>
  if (!user) return <Navigate to="/signup" state={{ from: location }} replace />
  return children
}
