'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'

interface AccountExpirationBadgeProps {
  userId: string
  expiresAt: string | null
  durationDays: number | null
  role: string
  onExtended?: () => void
  showExtendButton?: boolean
}

export function AccountExpirationBadge({
  userId,
  expiresAt,
  durationDays,
  role,
  onExtended,
  showExtendButton = false
}: AccountExpirationBadgeProps) {
  const [extending, setExtending] = useState(false)
  const { showSuccess, showError } = useToast()
  const supabase = createClient()

  if (!expiresAt) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Permanent
      </span>
    )
  }

  const expirationDate = new Date(expiresAt)
  const now = new Date()
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  const isExpired = daysUntilExpiration < 0
  const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration >= 0

  const handleExtend = async (days: number) => {
    setExtending(true)
    try {
      const { data, error } = await supabase.rpc('extend_account_duration', {
        p_user_id: userId,
        p_additional_days: days
      })

      if (error) {
        showError('Error', 'Failed to extend account duration')
        return
      }

      if (data && data.success) {
        showSuccess('Success', `Account extended by ${days} days`)
        onExtended?.()
      } else {
        showError('Error', data?.message || 'Failed to extend account')
      }
    } catch (error) {
      console.error('Error extending account:', error)
      showError('Error', 'Failed to extend account duration')
    } finally {
      setExtending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isExpired ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      ) : isExpiringSoon ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {daysUntilExpiration} days left
        </span>
      )}

      {showExtendButton && (
        <div className="relative group">
          <button
            disabled={extending}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            Extend ▼
          </button>
          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => handleExtend(30)}
              disabled={extending}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg disabled:opacity-50"
            >
              +30 days
            </button>
            <button
              onClick={() => handleExtend(90)}
              disabled={extending}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              +90 days
            </button>
            <button
              onClick={() => handleExtend(365)}
              disabled={extending}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg disabled:opacity-50"
            >
              +1 year
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
