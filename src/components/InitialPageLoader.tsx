'use client'

import { useState, useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export function InitialPageLoader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show loading animation for at least 1.7 seconds on initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1700)

    return () => clearTimeout(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-64 h-64">
          <DotLottieReact
            src="/Jumping shapes.lottie"
            loop
            autoplay
          />
        </div>
        <p className="mt-4 text-gray-600 text-lg font-medium">Loading...</p>
      </div>
    </div>
  )
}
