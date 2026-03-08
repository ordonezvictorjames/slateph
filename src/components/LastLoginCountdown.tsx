'use client'

import { useState, useEffect } from 'react'

interface LastLoginCountdownProps {
  lastLoginAt: string
  isDeveloper?: boolean
}

export default function LastLoginCountdown({ lastLoginAt, isDeveloper }: LastLoginCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [colorClass, setColorClass] = useState<string>('')

  useEffect(() => {
    // Don't show countdown for developers
    if (isDeveloper) return

    const calculateTimeLeft = () => {
      const lastLogin = new Date(lastLoginAt)
      const deletionDate = new Date(lastLogin.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from last login
      const now = new Date()
      const diff = deletionDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('⚠️ Will be deleted')
        setColorClass('bg-red-100 text-red-800 animate-pulse')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m left`)
        setColorClass('bg-green-100 text-green-800')
      } else if (hours > 0) {
        setTimeLeft(`⏰ ${hours}h ${minutes}m ${seconds}s left`)
        setColorClass('bg-yellow-100 text-yellow-800')
      } else {
        setTimeLeft(`⏰ ${minutes}m ${seconds}s left`)
        setColorClass('bg-red-100 text-red-800 animate-pulse')
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [lastLoginAt, isDeveloper])

  if (isDeveloper || !timeLeft) return null

  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {timeLeft}
    </span>
  )
}
