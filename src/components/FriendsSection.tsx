'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { ButtonLoading } from '@/components/ui/loading'
import { getRoleColor, getRoleLabel } from '@/utils/roleUtils'

interface Friend {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
  status?: string
  created_at?: string
}

interface FriendsSectionProps {
  userId: string
  isOwnProfile: boolean
  onNavigateToProfile?: (userId: string) => void
}

export default function FriendsSection({ userId, isOwnProfile, onNavigateToProfile }: FriendsSectionProps) {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
  const [allUsers, setAllUsers] = useState<Friend[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>('none')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      loadFriends()
      if (isOwnProfile) {
        loadPendingRequests()
      } else {
        checkConnectionStatus()
      }
    }
  }, [userId, isOwnProfile])

  const loadFriends = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_user_friends', {
        p_user_id: userId
      })

      if (error) throw error
      setFriends(data || [])
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_requests', {
        p_user_id: user?.id
      })

      if (error) throw error
      setPendingRequests(data || [])
    } catch (error) {
      console.error('Error loading pending requests:', error)
    }
  }

  const checkConnectionStatus = async () => {
    if (!user?.id || !userId) return

    try {
      const { data, error } = await supabase.rpc('get_connection_status', {
        p_user_id: user.id,
        p_other_user_id: userId
      })

      if (error) throw error
      setConnectionStatus(data || 'none')
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .neq('id', user?.id)
        .order('first_name')

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const sendFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Request Sent', data.message)
        if (!isOwnProfile) {
          setConnectionStatus('pending')
        }
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const acceptFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Success', data.message)
        loadFriends()
        loadPendingRequests()
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const rejectFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('reject_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Success', data.message)
        loadPendingRequests()
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const removeFriend = async (friendId: string) => {
    if (!user?.id) return

    if (!confirm('Are you sure you want to remove this friend?')) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('remove_friend', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Success', data.message)
        loadFriends()
        if (!isOwnProfile) {
          setConnectionStatus('none')
        }
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getAvatarDisplay = (avatarUrl: string | null) => {
    if (!avatarUrl) return '👤'
    
    // Check if it's an emoji (animal avatar)
    const animalAvatars: { [key: string]: string } = {
      'cat': '🐱', 'dog': '🐶', 'rabbit': '🐰', 'fox': '🦊',
      'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
      'lion': '🦁', 'monkey': '🐵', 'pig': '🐷', 'frog': '🐸'
    }
    
    return animalAvatars[avatarUrl] || avatarUrl
  }

  const filteredUsers = allUsers.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Connection Button for Other Profiles */}
      {!isOwnProfile && user?.id && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {connectionStatus === 'none' && (
            <button
              onClick={() => sendFriendRequest(userId)}
              disabled={actionLoading === userId}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading === userId ? <ButtonLoading /> : null}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Friend
            </button>
          )}
          {connectionStatus === 'pending' && (
            <div className="text-center text-gray-600 py-3">
              <svg className="w-6 h-6 mx-auto mb-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Friend Request Pending
            </div>
          )}
          {connectionStatus === 'accepted' && (
            <button
              onClick={() => removeFriend(userId)}
              disabled={actionLoading === userId}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading === userId ? <ButtonLoading /> : null}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Friends
            </button>
          )}
        </div>
      )}

      {/* Pending Friend Requests (Own Profile Only) */}
      {isOwnProfile && pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Friend Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getAvatarDisplay(request.avatar_url)}</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.first_name} {request.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{getRoleLabel(request.role)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    disabled={actionLoading === request.id}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading === request.id ? <ButtonLoading /> : 'Accept'}
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    disabled={actionLoading === request.id}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Friends ({friends.length})
          </h3>
          {isOwnProfile && (
            <button
              onClick={() => {
                setShowAddFriendModal(true)
                loadAllUsers()
              }}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Friend
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No friends yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onNavigateToProfile?.(friend.id)}
              >
                <div className="text-3xl">{getAvatarDisplay(friend.avatar_url)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {friend.first_name} {friend.last_name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{getRoleLabel(friend.role)}</p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFriend(friend.id)
                    }}
                    disabled={actionLoading === friend.id}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Remove friend"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add Friends</h2>
                <button
                  onClick={() => setShowAddFriendModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getAvatarDisplay(u.avatar_url)}</div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{getRoleLabel(u.role)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(u.id)}
                      disabled={actionLoading === u.id}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {actionLoading === u.id ? <ButtonLoading /> : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
