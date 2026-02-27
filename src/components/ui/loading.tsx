'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ size = 'md', className = '' }: LoadingProps) {
  const sizeMap = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={sizeMap[size]}>
        <DotLottieReact
          src="/Jumping shapes.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  )
}

// Inline loading spinner for buttons
export function ButtonLoading() {
  return (
    <div className="w-5 h-5">
      <DotLottieReact
        src="/Jumping shapes.lottie"
        loop
        autoplay
      />
    </div>
  )
}
