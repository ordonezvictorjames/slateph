'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export function PageLoading() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
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
