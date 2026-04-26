'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

export default function DeletionWarningBanner() {
  const { user, refreshUser } = useAuth()
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user?.id) return

    const fetchDeletionStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('deletion_scheduled_at')
        .eq('id', user.id)
        .single()

      setDeletionScheduledAt(data?.deletion_scheduled_at ?? null)
    }

    fetchDeletionStatus()

    // Re-check every 5 minutes
    const interval = setInterval(fetchDeletionStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  const handleCancel = async () => {
    if (!user?.id) return
    setCancelling(true)
    try {
      await supabase.rpc('cancel_account_deletion', { p_user_id: user.id })
      setDeletionScheduledAt(null)
      await refreshUser()
    } catch (err) {
      console.error('Failed to cancel deletion:', err)
    } finally {
      setCancelling(false)
    }
  }

  if (!deletionScheduledAt || dismissed) return null

  const deletionDate = new Date(deletionScheduledAt)
  const now = new Date()
  const msLeft = deletionDate.getTime() - now.getTime()

  // Already past — will be cleaned up by cron, just show expired state
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)))
  const daysLeft = Math.floor(hoursLeft / 24)

  const timeLabel =
    hoursLeft <= 0
      ? 'very soon'
      : hoursLeft < 24
      ? `in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`
      : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`

  const isUrgent = hoursLeft <= 24

  return (
    <div
      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium z-50
        ${isUrgent ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">{isUrgent ? '🚨' : '⚠️'}</span>
        <span className="truncate">
          Your account is scheduled for deletion <strong>{timeLabel}</strong> due to inactivity.
          Log in or click below to keep your account.
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            ${isUrgent
              ? 'bg-white text-red-600 hover:bg-red-50'
              : 'bg-white text-amber-600 hover:bg-amber-50'
            } disabled:opacity-60`}
        >
          {cancelling ? 'Cancelling…' : 'Keep my account'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
