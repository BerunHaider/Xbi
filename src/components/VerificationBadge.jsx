import React from 'react'
import { ShieldCheck } from 'lucide-react'

export default function VerificationBadge({ size = 18, className = '', title = 'Cuenta verificada' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-twitter-500 ${className}`} title={title}>
      <ShieldCheck size={size} className="text-twitter-500" />
      <span className="sr-only">{title}</span>
    </span>
  )
}
