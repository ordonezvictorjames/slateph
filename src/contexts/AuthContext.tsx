'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activityLogger'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Check for active session from server
    const checkSession = async () => {
      // Skip during SSR/build time
      if (typeof window === 'undefined') {
        if (mounted) setLoading(false)
        return
      }

      try {
        // Add timeout to prevent infinite loading
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
        
        // Fetch current session from API
        const response = await fetch('/api/auth/session', {
          signal: controller.signal,
          cache: 'no-store'
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          if (data.session?.id && mounted) {
            // Fetch full user profile from database using the session id
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.id)
              .single()

            if (!error && profile && mounted) {
              const userData: AuthUser = {
                id: profile.id,
                email: profile.email,
                role: profile.role,
                profile: {
                  id: profile.id,
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  role: profile.role,
                  email: profile.email,
                  avatar_url: profile.avatar_url,
                  banner_url: profile.banner_url,
                  spotify_url: profile.spotify_url,
                  created_at: profile.created_at,
                  updated_at: profile.updated_at
                }
              }
              setUser(userData)
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Session check timed out - continuing without session')
        } else {
          console.log('No active session found')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [])

  // Session heartbeat - update last_active every 5 minutes
  useEffect(() => {
    if (!user?.id) return

    const updateSessionHeartbeat = async () => {
      try {
        const deviceInfo = getDeviceInfo()
        await supabase.rpc('record_user_session', {
          p_user_id: user.id,
          p_ip_address: deviceInfo.ip_address,
          p_device_type: deviceInfo.device_type,
          p_browser: deviceInfo.browser,
          p_os: deviceInfo.os,
          p_user_agent: deviceInfo.user_agent
        })
      } catch (error) {
        console.error('Failed to update session heartbeat:', error)
      }
    }

    // Update session immediately, then every 5 minutes
    updateSessionHeartbeat()
    const interval = setInterval(updateSessionHeartbeat, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [user?.id])

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true)
    
    try {
      // Use custom authentication function
      const { data, error } = await supabase.rpc('authenticate_user', {
        user_email: email,
        user_password: password
      }) as { data: any, error: any }

      if (error) {
        console.error('RPC Error:', error)
        setLoading(false)
        throw new Error(error.message || 'Authentication failed')
      }

      if (!data || !data.success) {
        setLoading(false)
        throw new Error(data?.message || 'Invalid email or password')
      }

      // Create user object from authentication result
      const userData: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        profile: {
          id: data.user.id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          role: data.user.role,
          email: data.user.email,
          avatar_url: data.user.avatar_url,
          banner_url: data.user.banner_url,
          spotify_url: data.user.spotify_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      // Get device and browser information
      const deviceInfo = getDeviceInfo()

      // Record user session
      try {
        await supabase.rpc('record_user_session', {
          p_user_id: userData.id,
          p_ip_address: deviceInfo.ip_address,
          p_device_type: deviceInfo.device_type,
          p_browser: deviceInfo.browser,
          p_os: deviceInfo.os,
          p_user_agent: deviceInfo.user_agent
        })
      } catch (sessionError) {
        console.error('Failed to record session:', sessionError)
        // Continue anyway - login is successful
      }

      // Store minimal session data in HTTP-only cookie via API
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userData.id,
            role: userData.role,
            email: userData.email
          })
        })
        
        if (!sessionResponse.ok) {
          console.error('Failed to store session:', await sessionResponse.text())
          // Continue anyway - user is authenticated, just session storage failed
        }
      } catch (error) {
        console.error('Error calling session API:', error)
        // Continue anyway - user data is in state
      }
      
      setUser(userData)
      
      // Update last login timestamp
      try {
        await supabase.rpc('update_last_login', { p_user_id: userData.id })
      } catch (error) {
        console.error('Failed to update last login:', error)
        // Continue anyway - login is successful
      }
      
      // Log the login activity
      await logActivity({
        userId: userData.id,
        activityType: 'login',
        description: `User logged in: ${userData.profile.first_name} ${userData.profile.last_name} (${userData.email})`,
        metadata: {
          email: userData.email,
          role: userData.role,
          first_name: userData.profile.first_name,
          last_name: userData.profile.last_name,
          login_method: 'email_password',
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        }
      })
      
      setLoading(false)
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    // Log the logout activity before removing the session
    if (user?.id) {
      await logActivity({
        userId: user.id,
        activityType: 'logout',
        description: `User logged out: ${user.profile.first_name} ${user.profile.last_name} (${user.email})`,
        metadata: {
          email: user.email,
          role: user.role,
          first_name: user.profile.first_name,
          last_name: user.profile.last_name,
          logout_method: 'manual'
        }
      })
    }
    
    // Remove session cookie via API
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Failed to clear session:', error)
      // Continue anyway - we'll clear the user state
    }
    
    setUser(null)
  }

  const refreshUser = async (): Promise<void> => {
    if (!user?.id) return

    try {
      // Fetch updated profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error refreshing user:', error)
        return
      }

      if (profile) {
        // Update user object with fresh data
        const updatedUser: AuthUser = {
          ...user,
          profile: {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            email: profile.email,
            avatar_url: profile.avatar_url,
            banner_url: profile.banner_url,
            spotify_url: profile.spotify_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          }
        }

        // Update session cookie via API (minimal data only)
        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: updatedUser.id,
              role: updatedUser.role,
              email: updatedUser.email
            })
          })
        } catch (error) {
          console.error('Failed to update session:', error)
          // Continue anyway - we'll update the state
        }
        
        setUser(updatedUser)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to get device information
function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      ip_address: 'unknown',
      device_type: 'unknown',
      browser: 'unknown',
      os: 'unknown',
      user_agent: 'unknown'
    }
  }

  const userAgent = navigator.userAgent
  
  // Detect device type
  let deviceType = 'desktop'
  if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    if (/iPad|Android(?=.*Mobile)/i.test(userAgent)) {
      deviceType = 'tablet'
    } else {
      deviceType = 'mobile'
    }
  }

  // Detect browser
  let browser = 'unknown'
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome'
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge'
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera'
  }

  // Detect OS
  let os = 'unknown'
  if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
  }

  return {
    ip_address: 'client-side', // Will be determined server-side
    device_type: deviceType,
    browser: browser,
    os: os,
    user_agent: userAgent
  }
}
