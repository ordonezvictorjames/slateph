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
      try {
        // Fetch current session from API
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          if (data.session?.id && mounted) {
            // Fetch full user profile from database using the session id
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.id)
              .single()

            if (!error && profile) {
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
        console.log('No active session found')
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
          login_method: 'email_password'
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
