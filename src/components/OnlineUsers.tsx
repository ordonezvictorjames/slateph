'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'
import { getRoleColor, getRoleLabel } from '@/utils/roleUtils'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
  status: string
  last_seen: string | null
}

interface OnlineUsersProps {
  onNavigateToProfile?: (userId?: string) => void
}

export default function OnlineUsers({ onNavigateToProfile }: OnlineUsersProps = {}) {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [offlineUsers, setOfflineUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Update own presence
  const updatePresence = async () => {
    if (!user?.id) return
    
    try {
      await supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_status: 'online'
      })
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  // Fetch all users with their presence status
  const fetchAllUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .order('first_name', { ascending: true })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return
      }

      // Fetch all presence data
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen')

      if (presenceError) {
        console.error('Error fetching presence:', presenceError)
      }

      // Create a map of presence data
      const presenceMap = new Map()
      if (presenceData) {
        presenceData.forEach((p: any) => {
          presenceMap.set(p.user_id, {
            status: p.status,
            last_seen: p.last_seen
          })
        })
      }

      // Combine profiles with presence data
      const allUsers: User[] = (profiles || []).map((profile: any) => {
        const presence = presenceMap.get(profile.id)
        const lastSeen = presence?.last_seen
        const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000
        
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          role: profile.role,
          avatar_url: profile.avatar_url,
          status: (presence?.status === 'online' && isRecent) ? 'online' : 'offline',
          last_seen: lastSeen || null
        }
      })

      // Separate online and offline users
      const online = allUsers.filter(u => u.status === 'online')
      const offline = allUsers.filter(u => u.status === 'offline')

      // Sort offline users by most recent activity (last_seen) - most recent first
      offline.sort((a, b) => {
        if (!a.last_seen && !b.last_seen) return 0
        if (!a.last_seen) return 1 // Users with no last_seen go to the end
        if (!b.last_seen) return -1
        return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
      })

      setOnlineUsers(online)
      setOfflineUsers(offline)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initialize presence tracking
  useEffect(() => {
    if (!user?.id) return

    // Update presence immediately
    updatePresence()

    // Fetch all users
    fetchAllUsers()

    // Update presence every 2 minutes
    const presenceInterval = setInterval(updatePresence, 120000)

    // Subscribe to presence changes (replaces polling)
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          fetchAllUsers()
        }
      )
      .subscribe()

    // Mark as offline when leaving
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        '/api/update-presence',
        JSON.stringify({ user_id: user.id, status: 'offline' })
      )
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(presenceInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      supabase.removeChannel(channel)
      
      // Mark as offline
      supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_status: 'offline'
      })
    }
  }, [user?.id])

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never'
    
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return lastSeenDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: lastSeenDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const renderUser = (u: User, isOnline: boolean) => (
    <button
      key={u.id}
      onClick={() => {
        if (onNavigateToProfile) {
          onNavigateToProfile(u.id === user?.id ? undefined : u.id)
        }
      }}
      className="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex items-center space-x-2">
        <div className="relative flex-shrink-0">
          {u.avatar_url ? (
            u.avatar_url.length <= 2 ? (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                {u.avatar_url}
              </div>
            ) : (
              <img
                src={u.avatar_url}
                alt={`${u.first_name} ${u.last_name}`}
                className="w-7 h-7 rounded-full object-cover"
              />
            )
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
              {u.first_name.charAt(0)}{u.last_name.charAt(0)}
            </div>
          )}
          <div className={`absolute bottom-0 right-0 w-2 h-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'} border border-white rounded-full`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: '#0f4c5c' }}>
            {u.first_name} {u.last_name}
            {u.id === user?.id && (
              <span className="ml-1 text-[10px] text-gray-500">(You)</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center text-[10px] font-medium text-gray-500">
              {getRoleLabel(u.role)}
            </span>
            {u.last_seen && (
              <span className="text-[10px] text-gray-500 ml-2">
                {formatLastSeen(u.last_seen)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loading size="sm" />
      </div>
    )
  }

  const totalUsers = onlineUsers.length + offlineUsers.length

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-700">All Users</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
            {totalUsers}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Online: {onlineUsers.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Offline: {offlineUsers.length}</span>
          </div>
        </div>
      </div>

      {/* Flat scrollable list: online first, then offline */}
      <div className="flex-1 overflow-y-auto scrollbar-autohide">
        {totalUsers === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...onlineUsers, ...offlineUsers].map((u) =>
              renderUser(u, u.status === 'online')
            )}
          </div>
        )}
      </div>
    </div>
  )
}
