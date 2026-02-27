'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { Loading } from '@/components/ui/loading'

interface ActivityLog {
  id: string
  user_id: string
  activity_type: string
  description: string
  metadata: any
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
    avatar_url?: string
  }
}

export default function SystemTrackerPage() {
  const { showError } = useToast()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      // Use the activity_logs_with_users view (unrestricted)
      const { data, error } = await supabase
        .from('activity_logs_with_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching activities:', error)
        showError('Error loading activities', error.message)
      } else {
        // Transform the data to match our ActivityLog interface
        const transformedData = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          activity_type: item.activity_type,
          description: item.description,
          metadata: item.metadata,
          ip_address: item.ip_address,
          user_agent: item.user_agent,
          created_at: item.created_at,
          user: {
            first_name: item.user_first_name,
            last_name: item.user_last_name,
            email: item.user_email,
            role: item.user_role,
            avatar_url: item.user_avatar_url
          }
        }))
        setActivities(transformedData)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      showError('Error loading activities', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchQuery === '' || 
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${activity.user?.first_name} ${activity.user?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = activityTypeFilter === 'all' || activity.activity_type === activityTypeFilter
    
    const matchesUserType = userTypeFilter === 'all' || activity.user?.role === userTypeFilter
    
    let matchesDate = true
    if (dateFilter !== 'all') {
      const activityDate = new Date(activity.created_at)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          matchesDate = activityDate.toDateString() === now.toDateString()
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = activityDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = activityDate >= monthAgo
          break
      }
    }
    
    return matchesSearch && matchesType && matchesUserType && matchesDate
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      case 'logout':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      case 'user_created':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      case 'user_updated':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      case 'user_deleted':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
      case 'course_created':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      case 'course_updated':
      case 'course_deleted':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      case 'enrollment_created':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'logout':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'user_created':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'user_updated':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'user_deleted':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'course_created':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'course_updated':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      case 'course_deleted':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'enrollment_created':
        return 'bg-teal-100 text-teal-700 border-teal-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatActivityType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Predefined activity types for the filter
  const activityTypes = [
    { value: 'login', label: 'Log in' },
    { value: 'logout', label: 'Log out' },
    { value: 'user_created', label: 'Create User' },
    { value: 'user_updated', label: 'Edit User' },
    { value: 'user_deleted', label: 'Delete User' },
    { value: 'course_created', label: 'Create Course' },
    { value: 'course_updated', label: 'Edit Course' },
    { value: 'course_deleted', label: 'Delete Course' },
    { value: 'subject_created', label: 'Create Subject' },
    { value: 'subject_updated', label: 'Edit Subject' },
    { value: 'subject_deleted', label: 'Delete Subject' },
    { value: 'module_created', label: 'Create Module' },
    { value: 'module_updated', label: 'Edit Module' },
    { value: 'module_deleted', label: 'Delete Module' },
  ]

  // Predefined user types for the filter
  const userTypes = [
    { value: 'admin', label: 'Admin' },
    { value: 'trainee', label: 'Trainee' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">System Tracker</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Activity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <select
              value={activityTypeFilter}
              onChange={(e) => setActivityTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Activities</option>
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* User Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Users</option>
              {userTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No activities found</p>
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {activity.user?.avatar_url ? (
                            activity.user.avatar_url.startsWith('data:') ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={activity.user.avatar_url} alt="" />
                            ) : activity.user.avatar_url.length <= 2 ? (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                                {activity.user.avatar_url}
                              </div>
                            ) : (
                              <img className="h-10 w-10 rounded-full object-cover" src={activity.user.avatar_url} alt="" />
                            )
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                              {activity.user?.first_name?.charAt(0)}{activity.user?.last_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.user?.first_name} {activity.user?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{activity.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {getActivityIcon(activity.activity_type)}
                          </svg>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {formatActivityType(activity.activity_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {activity.description}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(activity.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loading size="md" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">No activities found</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {activity.user?.avatar_url ? (
                        activity.user.avatar_url.startsWith('data:') ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={activity.user.avatar_url} alt="" />
                        ) : activity.user.avatar_url.length <= 2 ? (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                            {activity.user.avatar_url}
                          </div>
                        ) : (
                          <img className="h-10 w-10 rounded-full object-cover" src={activity.user.avatar_url} alt="" />
                        )
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {activity.user?.first_name?.charAt(0)}{activity.user?.last_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.user?.first_name} {activity.user?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{activity.user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start mb-2">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)} mr-3 flex-shrink-0`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {getActivityIcon(activity.activity_type)}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {formatActivityType(activity.activity_type)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                    {formatDate(activity.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table Footer with Count */}
        {!loading && filteredActivities.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredActivities.length}</span> of <span className="font-medium">{activities.length}</span> activities
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
