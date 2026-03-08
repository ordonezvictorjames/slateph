'use client'

import { useState, useEffect } from 'react'

interface InactiveDeletionCountdownProps {
  inactiveSince: string
  isDeveloper?: boolean
}

export default function InactiveDeletionCountdown({ inactiveSince, isDeveloper }: InactiveDeletionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [colorClass, setColorClass] = useState<string>('')

  useEffect(() => {
    // Don't show countdown for developers
    if (isDeveloper) return

    const calculateTimeLeft = () => {
      const inactiveDate = new Date(inactiveSince)
      const deletionDate = new Date(inactiveDate.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
      const now = new Date()
      const diff = deletionDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('⚠️ Pending Deletion')
        setColorClass('bg-red-100 text-red-800')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`Deletes in ${days}d ${hours}h`)
        setColorClass('bg-yellow-100 text-yellow-800')
      } else if (hours > 0) {
        setTimeLeft(`⏰ Deletes in ${hours}h ${minutes}m`)
        setColorClass('bg-orange-100 text-orange-800')
      } else {
        setTimeLeft(`⏰ Deletes in ${minutes}m ${seconds}s`)
        setColorClass('bg-red-100 text-red-800 animate-pulse')
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [inactiveSince, isDeveloper])

  if (isDeveloper || !timeLeft) return null

  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {timeLeft}
    </span>
  )
}
