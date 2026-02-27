'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import type { PageType } from '@/components/Dashboard'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

interface MenuItem {
  id: PageType
  icon: JSX.Element
  label: string
  roles: string[]
  disabled?: boolean
}

interface MenuGroup {
  title: string
  roles: string[]
  items: MenuItem[]
}


export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { user, signOut } = useAuth()
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  // Toggle group collapsed state (no persistence)
  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  // Helper function to get button styles
  const getButtonStyle = (isActive: boolean, isDisabled: boolean = false) => {
    if (isDisabled) {
      return {
        color: '#9ca3af',
        backgroundColor: 'transparent'
      }
    }
    if (isActive) {
      return {
        color: '#000000',
        backgroundColor: '#e5e7eb'
      }
    }
    return {
      color: '#000000',
      backgroundColor: 'transparent'
    }
  }

  // Load enabled sections from Supabase
  useEffect(() => {
    const loadSectionStates = async () => {
      try {
        const { data, error } = await supabase
          .from('section_settings')
          .select('section_id, is_enabled')

        if (error) {
          console.error('Failed to load section states:', error)
          // If there's an error, keep all sections enabled (default behavior)
          return
        }

        if (data && data.length > 0) {
          const sectionStates = data.reduce((acc: Record<string, boolean>, item: any) => {
            acc[item.section_id] = item.is_enabled
            return acc
          }, {} as Record<string, boolean>)
          setEnabledSections(sectionStates)
        }
      } catch (error) {
        console.error('Failed to load section states:', error)
        // Keep all sections enabled on error
      }
    }

    loadSectionStates()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('section_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'section_settings'
        },
        (payload: any) => {
          // Reload section states when changes occur
          loadSectionStates()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Helper function to check if a section is enabled
  const isSectionEnabled = (sectionId: string) => {
    // If no saved state, default to enabled
    if (Object.keys(enabledSections).length === 0) return true
    return enabledSections[sectionId] !== false
  }

  // Provide fallback data if user is not fully loaded yet
  const displayUser = user || {
    profile: {
      first_name: 'U',
      last_name: 'ser',
      role: 'user'
    },
    email: 'Loading...'
  }

  const menuGroups: MenuGroup[] = [
    // ADMIN & DEVELOPER - Full System Access
    {
      title: 'Overview',
      roles: ['admin', 'developer'],
      items: [
        { 
          id: 'dashboard' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
          label: 'Dashboard', 
          roles: ['admin', 'developer'] 
        },
      ]
    },
    {
      title: 'Learning',
      roles: ['admin', 'developer'],
      items: [
        { 
          id: 'courses' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
          label: 'Courses', 
          roles: ['admin', 'developer'] 
        },
        { 
          id: 'schedule' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
          label: 'Schedule', 
          roles: ['admin', 'developer'] 
        },
      ]
    },
    {
      title: 'Management',
      roles: ['admin', 'developer'],
      items: [
        { 
          id: 'user-management' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
          label: 'User Management', 
          roles: ['admin', 'developer'] 
        },
        { 
          id: 'course-management' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, 
          label: 'Course Management', 
          roles: ['admin', 'developer'] 
        },
      ]
    },
    {
      title: 'System',
      roles: ['admin', 'developer'],
      items: [
        { 
          id: 'system-tracker' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, 
          label: 'System Tracker', 
          roles: ['admin', 'developer'] 
        },
        { 
          id: 'code-generator' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>, 
          label: 'Code Generator', 
          roles: ['developer'] 
        },
      ]
    },
    {
      title: 'Feedback',
      roles: ['admin', 'developer'],
      items: [
        { 
          id: 'tasks' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, 
          label: 'Tasks', 
          roles: ['admin', 'developer'] 
        },
        { 
          id: 'feature-requests' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
          label: 'Bugs and Request', 
          roles: ['admin', 'developer'] 
        },
      ]
    },

    // trainee - Teaching & trainee Management
    {
      title: 'Overview',
      roles: ['trainee'],
      items: [
        { 
          id: 'dashboard' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
          label: 'Dashboard', 
          roles: ['trainee'] 
        },
      ]
    },
    {
      title: 'Teaching',
      roles: ['trainee'],
      items: [
        { 
          id: 'courses' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
          label: 'Courses', 
          roles: ['trainee'] 
        },
        { 
          id: 'my-courses' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>, 
          label: 'My Courses', 
          roles: ['trainee'] 
        },
        { 
          id: 'schedule' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
          label: 'Schedule', 
          roles: ['trainee'] 
        },
      ]
    },
    {
      title: 'Management',
      roles: ['trainee'],
      items: [
        { 
          id: 'user-management' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
          label: 'My trainees', 
          roles: ['trainee'] 
        },
      ]
    },
    {
      title: 'Feedback',
      roles: ['trainee'],
      items: [
        { 
          id: 'feature-requests' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
          label: 'Bugs and Request', 
          roles: ['trainee'] 
        },
      ]
    },

    // trainee - Learning Experience
    {
      title: 'Overview',
      roles: ['trainee'],
      items: [
        { 
          id: 'dashboard' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
          label: 'Dashboard', 
          roles: ['trainee'] 
        },
      ]
    },
    {
      title: 'Learning',
      roles: ['trainee'],
      items: [
        { 
          id: 'courses' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
          label: 'Courses', 
          roles: ['trainee'] 
        },
        { 
          id: 'my-courses' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>, 
          label: 'My Courses', 
          roles: ['trainee'] 
        },
        { 
          id: 'schedule' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
          label: 'Schedule', 
          roles: ['trainee'] 
        },
      ]
    },
    {
      title: 'Feedback',
      roles: ['trainee'],
      items: [
        { 
          id: 'feature-requests' as PageType, 
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
          label: 'Bugs and Request', 
          roles: ['trainee'] 
        },
      ]
    }
  ]

  const userRole = user?.profile?.role || displayUser?.profile?.role || 'user'
  
  // Filter menu groups to show only groups and items the user has access to
  const visibleMenuGroups = menuGroups
    .filter(group => group.roles.includes(userRole))
    .map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.roles.includes(userRole) && isSectionEnabled(item.id)
      )
    }))
    .filter(group => group.items.length > 0)

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
        style={{ 
          backgroundColor: '#3b82f6',
          color: '#FFFFFF'
        }}
        aria-label="Toggle sidebar"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isHovered || isMobileOpen ? 'w-64' : 'w-16'} 
          h-screen flex flex-col transition-all duration-300 ease-in-out border-r shadow-sm fixed left-0 top-0 z-50
          lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderColor: '#e5e7eb',
          color: '#000000'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Slate Logo" className="w-full h-full object-contain" />
          </div>
          {isHovered && (
            <div className="ml-3 overflow-hidden">
              <h1 
                className="text-base font-semibold whitespace-nowrap"
                style={{ color: '#000000' }}
              >
                Slate
              </h1>
            </div>
          )}
          {isMobileOpen && !isHovered && (
            <div className="ml-3 overflow-hidden lg:hidden">
              <h1 
                className="text-base font-semibold whitespace-nowrap"
                style={{ color: '#000000' }}
              >
                Slate
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-1">
          {visibleMenuGroups.map((group, groupIndex) => {
            const isCollapsed = collapsedGroups[group.title] || false
            
            return (
              <div key={group.title}>
                {/* Group Header - clickable to collapse/expand */}
                {(isHovered || isMobileOpen) && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full px-3 py-1 mb-0.5 flex items-center justify-between hover:bg-gray-100 rounded transition-colors"
                  >
                    <h3 className="text-[10px] font-semibold text-black uppercase tracking-wider">
                      {group.title}
                    </h3>
                    <svg 
                      className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Group Items - hidden when collapsed */}
                {!isCollapsed && (
                  <ul className={(isHovered || isMobileOpen) ? 'space-y-0.5' : 'space-y-2'}>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button 
                          onClick={() => {
                            if (!item.disabled) {
                              onPageChange(item.id)
                              setIsMobileOpen(false)
                            }
                          }}
                          disabled={item.disabled}
                          className={`w-full flex items-center ${(isHovered || isMobileOpen) ? 'px-3 py-1.5' : 'justify-center px-3 py-2'} ${
                            item.disabled
                              ? 'cursor-not-allowed opacity-60'
                              : 'hover:opacity-80'
                          } rounded-lg transition-all duration-200 group`}
                          style={getButtonStyle(currentPage === item.id, item.disabled)}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          {(isHovered || isMobileOpen) && (
                            <span className="ml-3 text-xs whitespace-nowrap overflow-hidden flex items-center gap-2">
                              {item.label}
                              {item.disabled && (
                                <span className="text-[10px] text-red-600 font-semibold">soon</span>
                              )}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                
                {/* Group Separator - only show between groups when hovered */}
                {(isHovered || isMobileOpen) && groupIndex < visibleMenuGroups.length - 1 && (
                  <div className="my-1.5 border-t border-gray-200"></div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Profile Section */}
      <div className="px-2 pb-1 border-t border-gray-200 pt-1.5">
        {isSectionEnabled('profile') && (
          <>
            {(isHovered || isMobileOpen) && (
              <button
                onClick={() => toggleGroup('Profile')}
                className="w-full px-3 py-1 mb-0.5 flex items-center justify-between hover:bg-gray-100 rounded transition-colors"
              >
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Profile
                </h3>
                <svg 
                  className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${collapsedGroups['Profile'] ? '-rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            
            {!collapsedGroups['Profile'] && (
              <ul className={(isHovered || isMobileOpen) ? 'space-y-0.5' : 'space-y-2'}>
              <li>
                <button 
                  onClick={() => {
                    onPageChange('profile')
                    setIsMobileOpen(false)
                  }}
                  className={`w-full flex items-center ${(isHovered || isMobileOpen) ? 'px-3 py-1.5' : 'justify-center px-3 py-2'} hover:opacity-80 rounded-lg transition-all duration-200 group`}
                  style={getButtonStyle(currentPage === 'profile')}
                >
                  <span className="flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  {(isHovered || isMobileOpen) && (
                    <span className="ml-3 text-xs whitespace-nowrap overflow-hidden">
                      My Profile
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onPageChange('settings')
                    setIsMobileOpen(false)
                  }}
                  className={`w-full flex items-center ${(isHovered || isMobileOpen) ? 'px-3 py-1.5' : 'justify-center px-3 py-2'} hover:opacity-80 rounded-lg transition-all duration-200 group`}
                  style={getButtonStyle(currentPage === 'settings')}
                >
                  <span className="flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  {(isHovered || isMobileOpen) && (
                    <span className="ml-3 text-xs whitespace-nowrap overflow-hidden">
                      Settings
                    </span>
                  )}
                </button>
              </li>
            </ul>
            )}
          </>
        )}
      </div>

      {/* Promotional Card */}
      {(isHovered || isMobileOpen) && (
        <div className="px-2 pb-3">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
            <div className="flex justify-center mb-4">
              <img 
                src="/book.png" 
                alt="Feedback" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <button 
              onClick={() => onPageChange('feature-requests')}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Feedback
            </button>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="px-2 pb-3 pt-1">
        <button 
          onClick={async () => {
            try {
              await signOut()
            } catch (error) {
              console.error('Logout error:', error)
            }
          }}
          className={`w-full flex items-center ${(isHovered || isMobileOpen) ? 'px-3 py-1.5' : 'justify-center px-3 py-2'} text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group`}
        >
          <span className="flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          {(isHovered || isMobileOpen) && (
            <span className="ml-3 text-xs whitespace-nowrap overflow-hidden">
              Log out
            </span>
          )}
        </button>
      </div>
      </div>
    </>
  )
}
