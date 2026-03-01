import React from 'react'

interface PlantDividerProps {
  className?: string
  variant?: 'leaf' | 'vine' | 'simple'
}

export function PlantDivider({ className = '', variant = 'leaf' }: PlantDividerProps) {
  if (variant === 'leaf') {
    return (
      <div className={`flex items-center justify-center my-8 ${className}`}>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-fern-200 to-transparent"></div>
        <div className="mx-4 text-2xl">🌿</div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-fern-200 to-transparent"></div>
      </div>
    )
  }

  if (variant === 'vine') {
    return (
      <div className={`flex items-center justify-center my-8 ${className}`}>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-fern-200 to-transparent"></div>
        <div className="mx-4 flex gap-2 text-xl">
          <span>🌱</span>
          <span>🍃</span>
          <span>🌿</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-fern-200 to-transparent"></div>
      </div>
    )
  }

  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-fern-200 to-transparent my-8 ${className}`}></div>
  )
}
