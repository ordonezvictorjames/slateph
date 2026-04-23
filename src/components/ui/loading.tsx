'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ size = 'md', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div style={{ width: 150, height: 150 }}>
        <DotLottieReact
          src="/Sandy Loading.lottie"
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
        src="/Sandy Loading.lottie"
        loop
        autoplay
      />
    </div>
  )
}
