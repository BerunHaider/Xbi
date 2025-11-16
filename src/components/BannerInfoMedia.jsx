import React from 'react'

export default function BannerInfoMedia({ title, subtitle, image, ctaText, onCTAClick }) {
  return (
    <div className="w-full bg-gradient-to-r from-sky-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden shadow-sm mb-4">
      <div className="flex flex-col md:flex-row items-center gap-4 p-4">
        {image && (
          <div className="flex-shrink-0 w-full md:w-40">
            <img src={image} alt="banner" className="w-full h-24 object-cover rounded-md" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-none">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-[rgb(var(--muted))]">{subtitle}</p>}
        </div>
        {ctaText && (
          <div className="mt-3 md:mt-0">
            <button onClick={onCTAClick} className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-500">
              {ctaText}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
