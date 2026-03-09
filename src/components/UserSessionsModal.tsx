'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

interface UserSession {
  id: string
  ip_address: string
  device_type: string
  browser: string
  os: string
  device_name: string
  last_active: string
  created_at: string
  is_active: boolean
}

interface UserSessionsModalProps {
  userId: string
  userName: string
  onClose: () => void
}

export default function UserSessionsModal({ userId, userName, onClose }: UserSessionsModalProps) {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSessions()
  }, [userId])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_user_sessions', {
        p_user_id: userId,
        p_active_only: false
      })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const endSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return

    try {
      setActionLoading(sessionId)
      const { error } = await supabase.rpc('end_user_session', {
        p_session_id: sessionId,
        p_user_id: userId
      })

      if (error) throw error
      
      // Update local state
      setSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, is_active: false } : s)
      )
    } catch (error) {
      console.error('Error ending session:', error)
      alert('Failed to end session')
    } finally {
      setActionLoading(null)
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'tablet':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const activeSessions = sessions.filter(s => s.is_active)
  const inactiveSessions = sessions.filter(s => !s.is_active)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Sessions</h2>
            <p className="text-sm text-gray-600 mt-1">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No sessions found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Sessions */}
              {activeSessions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Active Sessions ({activeSessions.length})
                  </h3>
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-green-50 border border-green-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-green-600 mt-1">
                              {getDeviceIcon(session.device_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{session.device_name}</p>
                              <div className="mt-2 space-y-1 text-sm text-gray-600">
                                <p>IP: {session.ip_address}</p>
                                <p>Last active: {formatTimeAgo(session.last_active)}</p>
                                <p className="text-xs text-gray-500">
                                  First seen: {new Date(session.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => endSession(session.id)}
                            disabled={actionLoading === session.id}
                            className="ml-4 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === session.id ? 'Ending...' : 'End Session'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Sessions */}
              {inactiveSessions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Inactive Sessions ({inactiveSessions.length})
                  </h3>
                  <div className="space-y-3">
                    {inactiveSessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-60"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-gray-400 mt-1">
                            {getDeviceIcon(session.device_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700">{session.device_name}</p>
                            <div className="mt-2 space-y-1 text-sm text-gray-500">
                              <p>IP: {session.ip_address}</p>
                              <p>Last active: {formatTimeAgo(session.last_active)}</p>
                              <p className="text-xs">
                                First seen: {new Date(session.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
