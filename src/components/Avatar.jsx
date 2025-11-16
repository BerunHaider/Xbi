import React from 'react'

export default function Avatar({ 
  src, 
  alt, 
  size = 48,
  onClick,
  className = '',
  verified = false,
  loading = false
}) {
  const s = typeof size === 'number' ? `${size}px` : size
  const sizeNum = typeof size === 'number' ? size : 48

  return (
    <div className={`flex-shrink-0 relative ${onClick ? 'cursor-pointer group' : ''} ${className}`} onClick={onClick}>
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            style={{ width: s, height: s }}
            className="rounded-full object-cover shadow-sm hover:opacity-80 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          />
          {verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-twitter-600 rounded-full border-2 border-white dark:border-twitter-900 flex items-center justify-center text-white text-xs animate-pulse shadow-lg">
              ✓
            </div>
          )}
        </>
      ) : (
        <div
          className={`rounded-full bg-gradient-to-br from-twitter-400 to-twitter-600 text-white flex items-center justify-center font-bold shadow-sm hover:opacity-80 transition-all duration-300 ${
            onClick ? 'group-hover:scale-110 group-hover:shadow-lg' : ''
          } ${loading ? 'animate-pulse' : ''}`}
          style={{ width: s, height: s, fontSize: `${sizeNum / 2}px` }}
        >
          {loading ? '...' : alt?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}
    </div>
  )
}

