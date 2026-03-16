'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { getRecentActivities } from '@/lib/activityLogger'
import { Loading } from '@/components/ui/loading'
import NotificationBell from '@/components/NotificationBell'
import type { PageType } from '@/components/Dashboard'

interface Course {
  id: string
  title: string
  description: string
  course_group?: string
  course_type: 'academic' | 'tesda' | 'upskill'
  status: 'active' | 'inactive' | 'draft'
  enrollment_type: 'trainee' | 'tesda_scholar' | 'both'
  subjects?: Subject[]
  created_at: string
  total_enrollments?: number
  is_user_enrolled?: boolean
}

interface CourseColor {
  id: string
  course_id: string
  color_name: string
  color_hex: string
  bg_class: string
  text_class: string
  border_class: string
}

interface Subject {
  id: string
  title: string
  trainee_id?: string
  modules?: Module[]
}

interface Module {
  id: string
  title: string
  content_type: string
}

interface DashboardStats {
  totalCourses: number
  totalSubjects: number
  totalModules: number
  totalUsers: number
  completedLessons: number
  totalLessons: number
  completedAssignments: number
  totalAssignments: number
  completedTests: number
  totalTests: number
  totalQuizzes: number
  totalActivities: number
  totalExams: number
}

interface UserStats {
  totalStudents: number
  totalSHSStudents: number
  totalJHSStudents: number
  totalCollegeStudents: number
  totalInstructors: number
  totalDevelopers: number
  totalAdmins: number
  totalGuests: number
  totalScholars: number
  totalTrainees: number
}

interface DashboardHomeProps {
  onNavigate: (page: PageType) => void
}

interface CourseSchedule {
  id: string
  course_id: string
  batch_number: number
  start_date: string
  end_date: string
  title: string
  description: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  course_title?: string
  course_type?: string
  course?: {
    title: string
    description: string
  }
}

// Component for upcoming schedule list
function UpcomingScheduleList() {
  const [schedules, setSchedules] = useState<CourseSchedule[]>([])
  const [courseColors, setCourseColors] = useState<CourseColor[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUpcomingSchedules()

    // Set up real-time subscription for course schedules
    const schedulesSubscription = supabase
      .channel('schedules-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'course_schedules' },
        () => {
          console.log('Schedules changed, refreshing...')
          fetchUpcomingSchedules()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(schedulesSubscription)
    }
  }, [])

  const fetchUpcomingSchedules = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      // Fetch upcoming schedules with course info (exclude today's events)
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('course_schedules')
        .select('*, course:courses(title, course_type)')
        .gte('start_date', tomorrowStr)
        .in('status', ['scheduled', 'active'])
        .order('start_date', { ascending: true })
        .limit(2)

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError)
      } else {
        setSchedules(schedulesData || [])
      }

      // Fetch course colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('course_colors')
        .select('*')

      if (colorsError) {
        console.error('Error fetching course colors:', colorsError)
      } else {
        setCourseColors(colorsData || [])
      }

    } catch (error) {
      console.error('Error fetching upcoming schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseColor = (courseId: string) => {
    return courseColors.find(color => color.course_id === courseId) || null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getDaysUntil = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `${diffDays} days`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`
    return `${Math.ceil(diffDays / 30)} months`
  }

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-black">No upcoming schedules</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {schedules.map((schedule) => {
        const courseColor = getCourseColor(schedule.course_id)
        return (
          <div key={schedule.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-[#DCFCE7] hover:shadow-sm transition-all">
            <div 
              className="w-8 h-8 rounded-lg mt-0.5 flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: courseColor?.color_hex ? `${courseColor.color_hex}20` : '#BBF7D0'
              }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full"
                style={{ 
                  backgroundColor: courseColor?.color_hex || '#22C55E' 
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-black truncate">
                    {schedule.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {schedule.course?.title} � Batch {schedule.batch_number}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
                    </span>
                    <span className="text-xs text-gray-400">�</span>
                    <span className="text-xs text-gray-500">
                      {formatTime(schedule.start_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <span 
                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full"
                    style={{
                      backgroundColor: courseColor?.color_hex ? `${courseColor.color_hex}20` : '#DCFCE7',
                      color: courseColor?.color_hex || '#22C55E'
                    }}
                  >
                    {getDaysUntil(schedule.start_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ActivityLog {
  id: string
  user_id: string
  activity_type: 'login' | 'logout' | 'course_created' | 'course_updated' | 'user_created' | 'enrollment_created'
  description: string
  metadata?: any
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
}

// Component for recent activity list
function RecentActivityList() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchRecentActivities()
  }, [])

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs_with_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10) // Show only 10 most recent activities

      if (error) {
        console.error('Error fetching recent activities:', error)
      } else {
        const transformedData = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          activity_type: item.activity_type,
          description: item.description,
          created_at: item.created_at,
          user: {
            first_name: item.user_first_name,
            last_name: item.user_last_name,
            role: item.user_role,
          }
        }))
        setActivities(transformedData)
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error)
    } finally {
      setLoading(false)
    }
  }

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
      case 'course_created':
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <Loading size="md" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-gray-400 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {getActivityIcon(activity.activity_type)}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 line-clamp-2">
              {activity.description}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">
                {activity.user?.first_name} {activity.user?.last_name}
              </span>
              <span className="text-xs text-gray-400">�</span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(activity.created_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}



export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { user, signOut } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [courseColors, setCourseColors] = useState<CourseColor[]>([])
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalSubjects: 0,
    totalModules: 0,
    totalUsers: 0,
    completedLessons: 0,
    totalLessons: 0,
    completedAssignments: 0,
    totalAssignments: 0,
    completedTests: 0,
    totalTests: 0,
    totalQuizzes: 0,
    totalActivities: 0,
    totalExams: 0
  })
  const [loading, setLoading] = useState(true)
  const hasFetchedRef = useRef(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({
    totalStudents: 0,
    totalSHSStudents: 0,
    totalJHSStudents: 0,
    totalCollegeStudents: 0,
    totalInstructors: 0,
    totalDevelopers: 0,
    totalAdmins: 0,
    totalGuests: 0,
    totalScholars: 0,
    totalTrainees: 0
  })
  const [pendingTasks, setPendingTasks] = useState<{
    unenrolledtrainees: number
    unassignedtrainees: number
    pendingFeatureRequests: number
    ongoingFeatureRequests: number
    passwordResets: number
    bugReports: number
    guestUsers: number
  }>({
    unenrolledtrainees: 0,
    unassignedtrainees: 0,
    pendingFeatureRequests: 0,
    ongoingFeatureRequests: 0,
    passwordResets: 0,
    bugReports: 0,
    guestUsers: 0
  })
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Helper function to get button background color
  const getButtonBg = () => '#1f7a8c' // Primary teal color
  
  // Helper function to get button hover color (slightly darker)
  const getButtonHoverBg = () => '#1a6b7a' // Darker teal color

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Provide fallback data if user is not fully loaded yet
  const displayUser = user || {
    profile: {
      first_name: 'User',
      last_name: '',
      role: 'user'
    },
    email: 'Loading...',
    id: 'loading'
  }

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  // Week navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      return newDate
    })
  }

  // Get current week range display
  const getWeekRange = () => {
    const weekData = getCurrentWeekData()
    if (weekData.length === 0) return ''
    
    const startDate = weekData[0].date
    const endDate = weekData[6].date
    
    const startMonth = startDate.toLocaleString('default', { month: 'short' })
    const endMonth = endDate.toLocaleString('default', { month: 'short' })
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`
    }
  }

  // Get calendar data
  const getCalendarData = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const today = new Date()
    
    // First day of the month and how many days in the month
    const firstDay = new Date(year, month, 1)
    const startingDayOfWeek = firstDay.getDay()
    
    // Calculate days to show (only 2 weeks = 14 days)
    const totalCells = 14 // 2 rows � 7 days
    const days = []
    
    // Previous month days (to fill the first week)
    const prevMonth = new Date(year, month - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i)
      const hasEvent = hasScheduleOnDate(date)
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        hasEvent
      })
    }
    
    // Current month days (only up to what fits in 2 weeks)
    const daysToShow = totalCells - days.length
    for (let day = 1; day <= daysToShow; day++) {
      const date = new Date(year, month, day)
      const isToday = today.getFullYear() === year && 
                     today.getMonth() === month && 
                     today.getDate() === day
      const hasEvent = hasScheduleOnDate(date)
      
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        hasEvent
      })
    }
    
    return days
  }

  // Check if a date has a schedule
  const hasScheduleOnDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return courseSchedules.some(schedule => {
      const startDate = new Date(schedule.start_date).toISOString().split('T')[0]
      const endDate = new Date(schedule.end_date).toISOString().split('T')[0]
      return dateString >= startDate && dateString <= endDate
    })
  }

  // Get current week data
  const getCurrentWeekData = () => {
    const referenceDate = new Date(currentDate)
    const currentDay = referenceDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(referenceDate)
    startOfWeek.setDate(referenceDate.getDate() - currentDay) // Go to Sunday of current week
    
    const today = new Date()
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      
      const isToday = date.toDateString() === today.toDateString()
      const hasEvent = hasScheduleOnDate(date)
      
      weekDays.push({
        day: date.getDate(),
        date: date,
        isCurrentMonth: date.getMonth() === referenceDate.getMonth(),
        isToday,
        hasEvent
      })
    }
    
    return weekDays
  }

  // Get month and year display
  const getMonthYear = () => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  // Get today's events from course schedules
  const getTodaysEvents = () => {
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    return courseSchedules.filter(schedule => {
      const startDate = new Date(schedule.start_date).toISOString().split('T')[0]
      const endDate = new Date(schedule.end_date).toISOString().split('T')[0]
      return todayString >= startDate && todayString <= endDate
    }).slice(0, 3) // Show max 3 events
  }

  const formatScheduleTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${startTime} - ${endTime}`
  }

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    fetchDashboardData()

    // Set up real-time subscriptions for courses
    const coursesSubscription = supabase
      .channel('courses-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses' },
        () => {
          console.log('Courses changed, refreshing...')
          fetchDashboardData()
        }
      )
      .subscribe()

    // Set up real-time subscriptions for subjects
    const subjectsSubscription = supabase
      .channel('subjects-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        () => {
          console.log('Subjects changed, refreshing...')
          fetchDashboardData()
        }
      )
      .subscribe()

    // Set up real-time subscriptions for profiles (for trainee count)
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profiles changed, refreshing...')
          fetchDashboardData()
        }
      )
      .subscribe()

    // Set up real-time subscriptions for course schedules
    const schedulesSubscription = supabase
      .channel('dashboard-schedules-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'course_schedules' },
        () => {
          console.log('Schedules changed, refreshing...')
          fetchDashboardData()
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(coursesSubscription)
      supabase.removeChannel(subjectsSubscription)
      supabase.removeChannel(profilesSubscription)
      supabase.removeChannel(schedulesSubscription)
    }
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const userRole = user?.profile?.role || 'trainee'
      
      // Fetch courses with subjects/modules
      let coursesQuery = supabase
        .from('courses')
        .select(`
          *,
          subjects(
            *,
            modules(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(6)

      // Filter courses for students - only show courses they're enrolled in
      if (userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student') {
        // First, get all course IDs where this trainee is enrolled
        const { data: traineeEnrollments, error: enrollmentsError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('trainee_id', user?.id)
          .eq('status', 'active')

        if (enrollmentsError) {
          console.error('Error fetching trainee enrollments:', enrollmentsError)
        } else {
          // Get unique course IDs
          const courseIds = traineeEnrollments?.map((e: { course_id: string }) => e.course_id) || []
          
          if (courseIds.length > 0) {
            // Filter courses by the trainee's enrolled course IDs
            coursesQuery = coursesQuery.in('id', courseIds)
          } else {
            // trainee has no enrolled courses - set empty array and skip query
            setCourses([])
            setLoading(false)
            return
          }
        }
      }

      const { data: coursesData, error: coursesError } = await coursesQuery

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
        console.error('Full error details:', JSON.stringify(coursesError, null, 2))
      } else {
        console.log('Courses fetched successfully:', coursesData?.length, 'courses')
        console.log('Course data:', coursesData)
        
        // Fetch enrollment counts and check user enrollment for each course
        const coursesWithEnrollments = await Promise.all(
          (coursesData || []).map(async (course: Course) => {
            // Get total enrollments for this course
            const { count: enrollmentCount } = await supabase
              .from('course_enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .eq('status', 'active')

            // Check if current user is enrolled in this course
            let isUserEnrolled = false
            if (user?.id && (user?.profile?.role === 'shs_student' || user?.profile?.role === 'jhs_student' || user?.profile?.role === 'college_student')) {
              try {
                const { data: userEnrollment, error: enrollmentError } = await supabase
                  .from('course_enrollments')
                  .select('id')
                  .eq('course_id', course.id)
                  .eq('trainee_id', user.id)
                  .eq('status', 'active')
                  .limit(1)
                
                // Silently handle errors - enrollment check is not critical
                if (!enrollmentError) {
                  isUserEnrolled = (userEnrollment && userEnrollment.length > 0) || false
                  
                  if (isUserEnrolled) {
                    console.log(`? User is enrolled in course: ${course.title}`)
                  }
                }
              } catch (err) {
                // Silently catch exceptions - enrollment check is not critical
              }
            }

            return {
              ...course,
              total_enrollments: enrollmentCount || 0,
              is_user_enrolled: isUserEnrolled
            }
          })
        )
        
        // Sort courses: enrolled courses first for students
        const sortedCourses = coursesWithEnrollments.sort((a, b) => {
          if ((user?.profile?.role === 'shs_student' || user?.profile?.role === 'jhs_student' || user?.profile?.role === 'college_student')) {
            // Enrolled courses come first
            if (a.is_user_enrolled && !b.is_user_enrolled) return -1
            if (!a.is_user_enrolled && b.is_user_enrolled) return 1
          }
          return 0
        })
        
        setCourses(sortedCourses)
      }

      // Fetch course colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('course_colors')
        .select('*')

      if (colorsError) {
        console.error('Error fetching course colors:', colorsError)
      } else {
        setCourseColors(colorsData || [])
      }

      // Fetch course schedules for calendar
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('course_schedules')
        .select('*, course:courses(title, course_type)')
        .in('status', ['scheduled', 'active'])
        .order('start_date', { ascending: true })

      if (schedulesError) {
        console.error('Error fetching course schedules:', schedulesError)
      } else {
        setCourseSchedules(schedulesData || [])
      }

      // Fetch dashboard statistics
      const [
        { count: totalCourses },
        { count: totalSubjects },
        { count: totalModules },
        { count: totalUsers }
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ])

      // Calculate lesson/assignment/test stats
      const { data: modulesData } = await supabase
        .from('modules')
        .select('content_type')

      interface ModuleData {
        content_type: string
      }

      const totalLessons = modulesData?.filter((m: ModuleData) => 
        ['text_lesson', 'video_lesson', 'canva_presentation'].includes(m.content_type)
      ).length || 0

      const totalAssignments = modulesData?.filter((m: ModuleData) => 
        m.content_type === 'assignment'
      ).length || 0

      const totalTests = modulesData?.filter((m: ModuleData) => 
        m.content_type === 'quiz'
      ).length || 0

      const totalQuizzes = modulesData?.filter((m: ModuleData) => 
        m.content_type === 'quiz'
      ).length || 0

      const totalActivities = modulesData?.filter((m: ModuleData) => 
        m.content_type === 'activity'
      ).length || 0

      const totalExams = modulesData?.filter((m: ModuleData) => 
        m.content_type === 'exam'
      ).length || 0

      setStats({
        totalCourses: totalCourses || 0,
        totalSubjects: totalSubjects || 0,
        totalModules: totalModules || 0,
        totalUsers: totalUsers || 0,
        completedLessons: Math.floor(totalLessons * 0.59),
        totalLessons,
        completedAssignments: Math.floor(totalAssignments * 0.59),
        totalAssignments,
        completedTests: Math.floor(totalTests * 0.59),
        totalTests,
        totalQuizzes,
        totalActivities,
        totalExams
      })

      // Fetch user statistics by role
      const [
        { count: totalStudents },
        { count: totalSHSStudents },
        { count: totalJHSStudents },
        { count: totalCollegeStudents },
        { count: totalInstructors },
        { count: totalDevelopers },
        { count: totalAdmins },
        { count: totalGuests },
        { count: totalScholars },
        { count: totalTrainees }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['shs_student', 'jhs_student', 'college_student']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shs_student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'jhs_student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'college_student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'developer'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'scholar'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'trainee')
      ])

      setUserStats({
        totalStudents: totalStudents || 0,
        totalSHSStudents: totalSHSStudents || 0,
        totalJHSStudents: totalJHSStudents || 0,
        totalCollegeStudents: totalCollegeStudents || 0,
        totalInstructors: totalInstructors || 0,
        totalDevelopers: totalDevelopers || 0,
        totalAdmins: totalAdmins || 0,
        totalGuests: totalGuests || 0,
        totalScholars: totalScholars || 0,
        totalTrainees: totalTrainees || 0
      })

      // Fetch pending tasks for admin and developer
      if (userRole === 'admin' || userRole === 'developer') {
        // Get trainees not enrolled in any course
        const { data: alltrainees } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['shs_student', 'jhs_student', 'college_student'])

        const { data: enrolledtrainees } = await supabase
          .from('course_enrollments')
          .select('trainee_id')
          .eq('status', 'active')

        const enrolledtraineeIds = new Set(enrolledtrainees?.map((e: { trainee_id: string }) => e.trainee_id) || [])
        const unenrolledCount = (alltrainees || []).filter((s: { id: string }) => !enrolledtraineeIds.has(s.id)).length

        // Get instructors not assigned to any subject
        const { data: allInstructors } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'instructor')

        const { data: assignedInstructors } = await supabase
          .from('subjects')
          .select('instructor_id')
          .not('instructor_id', 'is', null)

        const assignedInstructorIds = new Set(assignedInstructors?.map((s: { instructor_id: string }) => s.instructor_id) || [])
        const unassignedCount = (allInstructors || []).filter((i: { id: string }) => !assignedInstructorIds.has(i.id)).length

        // Get pending and ongoing feature requests (for developers only)
        let pendingRequests = 0
        let ongoingRequests = 0
        let passwordResetsCount = 0
        let bugReportsCount = 0
        
        if (userRole === 'developer' || userRole === 'admin') {
          // Feature requests (category = 'feature')
          const { count: pendingCount } = await supabase
            .from('feature_requests')
            .select('*', { count: 'exact', head: true })
            .eq('category', 'feature')
            .eq('status', 'pending')

          const { count: ongoingCount } = await supabase
            .from('feature_requests')
            .select('*', { count: 'exact', head: true })
            .eq('category', 'feature')
            .eq('status', 'ongoing')

          // Bug reports (category = 'bug')
          const { count: bugCount } = await supabase
            .from('feature_requests')
            .select('*', { count: 'exact', head: true })
            .eq('category', 'bug')
            .in('status', ['pending', 'ongoing'])

          // Password reset requests
          const { count: passwordCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'system_alert')
            .ilike('title', '%Password Reset%')
            .eq('is_read', false)

          pendingRequests = pendingCount || 0
          ongoingRequests = ongoingCount || 0
          bugReportsCount = bugCount || 0
          passwordResetsCount = passwordCount || 0
        }

        // Get guest users count
        const { count: guestCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'guest')

        setPendingTasks({
          unenrolledtrainees: unenrolledCount,
          unassignedtrainees: unassignedCount,
          pendingFeatureRequests: pendingRequests,
          ongoingFeatureRequests: ongoingRequests,
          passwordResets: passwordResetsCount,
          bugReports: bugReportsCount,
          guestUsers: guestCount || 0
        })
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'inactive': return 'bg-red-100 text-red-700'
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Helper function to get course color
  const getCourseColor = (courseId: string) => {
    const courseColor = courseColors.find(color => color.course_id === courseId)
    return courseColor || null
  }

  // Helper function to get enrollment type display
  const getEnrollmentTypeDisplay = (enrollmentType: string) => {
    switch (enrollmentType) {
      case 'both': return [{ text: 'All Students', color: 'bg-indigo-100 text-indigo-800' }]
      case 'tesda_scholar': return [{ text: 'TESDA Scholars', color: 'bg-purple-100 text-purple-800' }]
      case 'shs_student': return [{ text: 'SHS Students', color: 'bg-green-100 text-green-800' }]
      case 'jhs_student': return [{ text: 'JHS Students', color: 'bg-yellow-100 text-yellow-800' }]
      case 'college_student': return [{ text: 'College Students', color: 'bg-orange-100 text-orange-800' }]
      default: return [{ text: 'Trainees', color: 'bg-blue-100 text-blue-800' }]
    }
  }

  const userRole = user?.profile?.role || 'trainee'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f3f4f6', paddingLeft: '50px', paddingRight: '25px', paddingTop: '24px', paddingBottom: '48px' }}>
      <div>
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-4 md:gap-6">
          
          {/* Profile Card - Shows first on mobile, last on desktop */}
          <div className="xl:col-span-2 xl:order-2 space-y-4 md:space-y-6 flex flex-col">
            {/* Combined Notification and Avatar Card */}
            <div className="bg-white rounded-xl p-4 h-[70px] shadow-lg border border-gray-100">
              <div className="flex items-center justify-between h-full">
                {/* Left side: Notifications */}
                <div className="flex items-center space-x-2">
                  {/* Notification Bell */}
                  <NotificationBell />
                </div>

                {/* Right side: User Profile */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {(user?.profile as any)?.avatar_url ? (
                        // Check if it's a base64 image, emoji, or URL
                        (user?.profile as any).avatar_url.startsWith('data:') ? (
                          <img 
                            src={(user?.profile as any).avatar_url} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (user?.profile as any).avatar_url.length <= 2 ? (
                          <span className="text-2xl">
                            {(user?.profile as any).avatar_url}
                          </span>
                        ) : (
                          <img 
                            src={(user?.profile as any).avatar_url} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <span className="text-gray-600 font-medium text-sm">
                          {user?.profile?.first_name && user?.profile?.last_name
                            ? `${user.profile.first_name.charAt(0).toUpperCase()}${user.profile.last_name.charAt(0).toUpperCase()}`
                            : displayUser?.email
                              ? displayUser.email.charAt(0).toUpperCase()
                              : 'U'
                          }
                        </span>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.profile?.first_name && user?.profile?.last_name 
                            ? `${user.profile.first_name} ${user.profile.last_name}`
                            : 'User'
                          }
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email || displayUser?.email}</p>
                      </div>
                      
                      <div className="py-1">
                        <button 
                          onClick={() => {
                            onNavigate('profile')
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Profile</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            onNavigate('settings')
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-gray-100 py-1">
                        <button 
                          onClick={() => {
                            signOut()
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Welcome Card - Mobile only */}
            <div className="xl:hidden bg-white rounded-lg p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-visible relative min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="z-10 pr-4">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    Welcome back, {displayUser.profile?.first_name || displayUser?.email?.split('@')[0] || 'User'}!
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) 
                      ? 'Ready to continue your learning journey?'
                      : 'Manage your platform efficiently.'}
                  </p>
                </div>
                
                {/* Book Illustration - Smaller for sidebar */}
                <div className="hidden md:block absolute -top-8 w-[160px] h-[160px] z-0" style={{ right: '5px' }}>
                  <img 
                    src="/book.png" 
                    alt="Book illustration" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Digital Clock */}
            <div className="rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative" style={{ minHeight: '140px' }}>
              {/* Background illustration */}
              <div className="absolute inset-0">
                {(() => {
                  const h = currentTime.getHours()
                  if (h >= 18 && h < 21) return (
                    <svg viewBox="0 0 200 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                      <defs><linearGradient id="bgEve" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7043"/><stop offset="55%" stopColor="#ffb74d"/><stop offset="100%" stopColor="#ffe0b2"/></linearGradient></defs>
                      <rect width="200" height="140" fill="url(#bgEve)"/>
                      <circle cx="100" cy="118" r="28" fill="#ff6f00" opacity="0.85"/><circle cx="100" cy="118" r="20" fill="#ffca28"/>
                      <rect x="0" y="115" width="200" height="25" fill="#1a5c6e" opacity="0.7"/>
                      <rect x="78" y="115" width="44" height="25" fill="#ffca28" opacity="0.25"/>
                      <ellipse cx="38" cy="35" rx="28" ry="10" fill="#ff8a65" opacity="0.55"/>
                      <ellipse cx="56" cy="28" rx="18" ry="8" fill="#ffab91" opacity="0.45"/>
                      <ellipse cx="155" cy="45" rx="24" ry="9" fill="#ff8a65" opacity="0.45"/>
                      <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7"/>
                      <circle cx="172" cy="18" r="1.2" fill="white" opacity="0.6"/>
                    </svg>
                  )
                  if (h >= 21 || h < 5) return (
                    <svg viewBox="0 0 200 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                      <defs><linearGradient id="bgNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d1b2a"/><stop offset="100%" stopColor="#1f3a5f"/></linearGradient></defs>
                      <rect width="200" height="140" fill="url(#bgNight)"/>
                      <circle cx="160" cy="30" r="16" fill="#fff9c4"/><circle cx="167" cy="24" r="13" fill="#1f3a5f"/>
                      {[[20,12],[45,8],[70,18],[95,6],[120,14],[30,28],[80,5],[150,10],[10,22],[185,16],[55,25]].map(([x,y],i) => (
                        <circle key={i} cx={x} cy={y} r="1" fill="white" opacity={0.4 + (i % 4) * 0.15}/>
                      ))}
                      <rect x="0" y="112" width="200" height="28" fill="#0a2030" opacity="0.9"/>
                      <rect x="8" y="90" width="10" height="22" fill="#0a2030"/><rect x="22" y="80" width="13" height="32" fill="#0a2030"/>
                      <rect x="158" y="88" width="11" height="24" fill="#0a2030"/><rect x="173" y="76" width="14" height="36" fill="#0a2030"/>
                      <rect x="25" y="84" width="2" height="2" fill="#ffeb3b" opacity="0.8"/>
                      <rect x="175" y="80" width="2" height="2" fill="#ffeb3b" opacity="0.8"/>
                    </svg>
                  )
                  if (h >= 5 && h < 12) return (
                    <svg viewBox="0 0 200 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                      <defs><linearGradient id="bgMorn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b3e5fc"/><stop offset="60%" stopColor="#ffe0b2"/><stop offset="100%" stopColor="#ffcc80"/></linearGradient></defs>
                      <rect width="200" height="140" fill="url(#bgMorn)"/>
                      <circle cx="100" cy="130" r="30" fill="#ffb300" opacity="0.9"/><circle cx="100" cy="130" r="22" fill="#ffe57f"/>
                      <rect x="0" y="115" width="200" height="25" fill="#1f7a8c" opacity="0.45"/>
                      <ellipse cx="45" cy="40" rx="30" ry="11" fill="white" opacity="0.7"/>
                      <ellipse cx="148" cy="50" rx="26" ry="10" fill="white" opacity="0.6"/>
                    </svg>
                  )
                  return (
                    <svg viewBox="0 0 200 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                      <defs><linearGradient id="bgDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#29b6f6"/><stop offset="100%" stopColor="#b3e5fc"/></linearGradient></defs>
                      <rect width="200" height="140" fill="url(#bgDay)"/>
                      <circle cx="165" cy="28" r="20" fill="#fff176"/><circle cx="165" cy="28" r="14" fill="#ffee58"/>
                      <rect x="0" y="115" width="200" height="25" fill="#1f7a8c" opacity="0.35"/>
                      <ellipse cx="42" cy="42" rx="32" ry="12" fill="white" opacity="0.8"/>
                      <ellipse cx="62" cy="34" rx="22" ry="10" fill="white" opacity="0.7"/>
                      <ellipse cx="132" cy="52" rx="28" ry="11" fill="white" opacity="0.7"/>
                    </svg>
                  )
                })()}
              </div>

              {/* Time content on top */}
              <div className="relative z-10 p-4 flex flex-col items-center justify-center" style={{ minHeight: '140px' }}>

                {/* Time */}
                <div className="flex items-end space-x-2 mb-1">
                  <span className="font-bold tabular-nums leading-none" style={{ fontSize: '48px', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    {String(currentTime.getHours() % 12 || 12).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col space-y-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full bg-white opacity-90" />
                    <div className="w-2 h-2 rounded-full bg-white opacity-90" />
                  </div>
                  <span className="font-bold tabular-nums leading-none" style={{ fontSize: '48px', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    {String(currentTime.getMinutes()).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col items-center mb-2 ml-1">
                    <span className="text-sm font-bold" style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      {currentTime.getHours() >= 12 ? 'PM' : 'AM'}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      {String(currentTime.getSeconds()).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  {currentTime.toLocaleDateString('en-US', { month: 'short', weekday: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Upcoming Schedule */}
            <div className="rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-black">Upcoming Schedule</h3>
                    <p className="text-xs text-black/70">Next events</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('schedule')}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <UpcomingScheduleList />
            </div>

            {/* Today's Events - Student, Scholar, Instructor only (moved below calendar) */}
            {(((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) || userRole === 'scholar' || userRole === 'instructor') && (
              <div className="rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Today's Events</h3>
                      <p className="text-xs text-black/70">{getTodaysEvents().length} scheduled</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('schedule')}
                    className="text-gray-400 hover:text-black transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2">
                  {getTodaysEvents().length > 0 ? (
                    getTodaysEvents().slice(0, 2).map((schedule) => {
                      const courseColor = getCourseColor(schedule.course_id)
                      return (
                        <div key={schedule.id} className="flex items-start space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: courseColor?.color_hex ? `${courseColor.color_hex}20` : '#BBF7D0' }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: courseColor?.color_hex || '#22C55E' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-black line-clamp-1">{schedule.title}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{schedule.course?.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatScheduleTime(schedule.start_date, schedule.end_date)}</div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-black">No events today</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Activity - Admin and Developer only */}
            {(userRole === 'admin' || userRole === 'developer') && (
            <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col" style={{ height: '815px' }}>

              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
                <button 
                  onClick={() => onNavigate('system-tracker')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <RecentActivityList />
              </div>
            </div>
            )}
          </div>

          {/* Left Section - Main Content - Shows second on mobile, first on desktop */}
          <div className="xl:col-span-5 xl:order-1 space-y-6 md:space-y-8">
            
            {/* Welcome Card - Desktop only */}
            <div className="hidden xl:block bg-white rounded-lg p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-visible relative min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="z-10 pr-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome back, {displayUser.profile?.first_name || displayUser?.email?.split('@')[0] || 'User'}!
                  </h2>
                  <p className="text-gray-600">
                    {((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) 
                      ? 'Ready to continue your learning journey? Explore your courses and track your progress.'
                      : 'Manage your platform efficiently and keep track of all activities.'}
                  </p>
                </div>
                
                {/* Book Illustration - Full size for main content */}
                <div className="absolute -top-8 w-[160px] h-[160px] z-0" style={{ right: '20px' }}>
                  <img 
                    src="/book.png" 
                    alt="Book illustration" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Top Section - Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {/* Tasks Card - Only for Admin and Developer */}
              {(userRole === 'admin' || userRole === 'developer') && (
                <div className="rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 md:col-span-2" style={{ backgroundColor: '#FFFFFF' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-black">Tasks</h3>
                        <p className="text-xs text-black/70">Pending items</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('tasks')}
                      className="text-gray-400 hover:text-black transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <>
                        {/* Row 1, Col 1: Pending Requests */}
                        {userRole === 'developer' && pendingTasks.pendingFeatureRequests > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-purple-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.pendingFeatureRequests} Pending Request{pendingTasks.pendingFeatureRequests > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Feature requests to review</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-purple-600 bg-purple-100 rounded-full">
                                {pendingTasks.pendingFeatureRequests}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 1, Col 2: Ongoing Tasks */}
                        {userRole === 'developer' && pendingTasks.ongoingFeatureRequests > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-green-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.ongoingFeatureRequests} Ongoing Task{pendingTasks.ongoingFeatureRequests > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">In progress feature requests</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-green-600 bg-green-100 rounded-full">
                                {pendingTasks.ongoingFeatureRequests}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 1, Col 3 (wraps to new row on mobile): Unenrolled trainees */}
                        {pendingTasks.unenrolledtrainees > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-orange-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.unenrolledtrainees} Unenrolled trainee{pendingTasks.unenrolledtrainees > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Not enrolled in any course</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-orange-600 bg-orange-100 rounded-full">
                                {pendingTasks.unenrolledtrainees}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 2, Col 1: Bug Reports */}
                        {(userRole === 'admin' || userRole === 'developer') && pendingTasks.bugReports > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-yellow-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.bugReports} Bug Report{pendingTasks.bugReports > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Reported bugs to fix</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-yellow-600 bg-yellow-100 rounded-full">
                                {pendingTasks.bugReports}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 2, Col 2: Password Resets */}
                        {(userRole === 'admin' || userRole === 'developer') && pendingTasks.passwordResets > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-red-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.passwordResets} Password Reset{pendingTasks.passwordResets > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Pending password reset requests</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-red-600 bg-red-100 rounded-full">
                                {pendingTasks.passwordResets}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 2, Col 3 (wraps to new row on mobile): Unassigned Instructors */}
                        {pendingTasks.unassignedtrainees > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.unassignedtrainees} Unassigned Instructor{pendingTasks.unassignedtrainees > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Not assigned to any course</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-blue-600 bg-blue-100 rounded-full">
                                {pendingTasks.unassignedtrainees}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Guest Users */}
                        {(userRole === 'admin' || userRole === 'developer') && pendingTasks.guestUsers > 0 && (
                          <div 
                            onClick={() => onNavigate('tasks')}
                            className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-200">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-black">{pendingTasks.guestUsers} Guest User{pendingTasks.guestUsers > 1 ? 's' : ''}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Need role assignment</div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-indigo-600 bg-indigo-100 rounded-full">
                                {pendingTasks.guestUsers}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Placeholder items when all tasks are zero */}
                        {pendingTasks.unenrolledtrainees === 0 && (
                          <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 opacity-50">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-400">Unenrolled Trainees</div>
                              <div className="text-xs text-gray-400 mt-0.5">All trainees enrolled</div>
                            </div>
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-400 bg-gray-100 rounded-full">0</span>
                          </div>
                        )}

                        {pendingTasks.unassignedtrainees === 0 && (
                          <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 opacity-50">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-400">Unassigned Instructors</div>
                              <div className="text-xs text-gray-400 mt-0.5">All instructors assigned</div>
                            </div>
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-400 bg-gray-100 rounded-full">0</span>
                          </div>
                        )}

                        {(userRole === 'admin' || userRole === 'developer') && pendingTasks.passwordResets === 0 && (
                          <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 opacity-50">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-400">Password Resets</div>
                              <div className="text-xs text-gray-400 mt-0.5">No pending requests</div>
                            </div>
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-400 bg-gray-100 rounded-full">0</span>
                          </div>
                        )}

                        {(userRole === 'admin' || userRole === 'developer') && pendingTasks.guestUsers === 0 && (
                          <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 opacity-50">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-400">Guest Users</div>
                              <div className="text-xs text-gray-400 mt-0.5">No guests awaiting role</div>
                            </div>
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-400 bg-gray-100 rounded-full">0</span>
                          </div>
                        )}
                      </>
                  </div>
                </div>
              )}

              {/* Today's Events - Admin and Developer only (others see it in the right column) */}
              {(userRole === 'admin' || userRole === 'developer') && (
              <div className="rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Today's Events</h3>
                      <p className="text-xs text-black/70">{getTodaysEvents().length} scheduled</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('schedule')}
                    className="text-gray-400 hover:text-black transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2">
                  {getTodaysEvents().length > 0 ? (
                    getTodaysEvents().slice(0, 2).map((schedule) => {
                      const courseColor = getCourseColor(schedule.course_id)
                      return (
                        <div key={schedule.id} className="flex items-start space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ 
                              backgroundColor: courseColor?.color_hex ? `${courseColor.color_hex}20` : '#BBF7D0'
                            }}
                          >
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ 
                                backgroundColor: courseColor?.color_hex || '#22C55E' 
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-black line-clamp-1">{schedule.title}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{schedule.course?.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatScheduleTime(schedule.start_date, schedule.end_date)}</div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-black">No events today</p>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

        {/* Main Section - Courses */}
        <div>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-black">
              {((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) ? (
                <>
                  My Courses
                  {courses.filter(c => c.is_user_enrolled).length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({courses.filter(c => c.is_user_enrolled).length} enrolled)
                    </span>
                  )}
                </>
              ) : 'Available Courses'}
            </h2>
            {(userRole === 'admin' || userRole === 'developer') && (
              <button className="text-sm text-gray-500 hover:text-gray-700">See All</button>
            )}
          </div>
              
              <div className="flex flex-wrap" style={{ gap: '20px' }}>
                {courses.length > 0 ? (
                  <>
                    {courses.slice(0, 3).map((course) => {
                      const courseColor = getCourseColor(course.id)
                      const enrollmentTypeBadges = getEnrollmentTypeDisplay(course.enrollment_type)
                      
                      const isStudentOrStudent = ((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student'))
                      const isLocked = isStudentOrStudent && !course.is_user_enrolled
                      
                      return (
                        <div 
                          key={course.id} 
                          className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${isLocked ? 'opacity-60' : ''}`}
                          style={{ width: '300px' }}
                        >
                          {/* Locked Badge for trainees who are NOT enrolled */}
                          {isLocked && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-xs font-semibold">Locked</span>
                              </div>
                            </div>
                          )}

                          {/* Enrolled Badge for students who ARE enrolled */}
                          {isStudentOrStudent && course.is_user_enrolled && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold">Enrolled</span>
                              </div>
                            </div>
                          )}

                          {/* Decorative Top Strip */}
                          <div className="relative overflow-hidden" style={{ height: '100px' }}>
                            <div className="w-full h-full" style={{ 
                              background: courseColor?.color_hex ? `linear-gradient(135deg, ${courseColor.color_hex}20 0%, ${courseColor.color_hex}10 100%)` : 'linear-gradient(135deg, #1f7a8c20 0%, #1f7a8c10 100%)'
                            }} />
                            <div 
                              className="absolute left-0 top-0 w-1 h-full"
                              style={{ backgroundColor: courseColor?.color_hex || '#1f7a8c' }}
                            />
                          </div>

                          {/* Course Header */}
                          <div className="relative bg-white border-b border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-black line-clamp-2">
                              {course.title}
                            </h3>
                          </div>
                          
                          {/* Card Content */}
                          <div className="p-5 flex flex-col flex-1">
                            {/* Badges Row: Status, Course Type, Enrollment Type */}
                            {!(((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) || userRole === 'scholar') && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                                course.status === 'active' ? 'bg-green-100 text-green-800' :
                                course.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  course.status === 'active' ? 'bg-green-600' :
                                  course.status === 'inactive' ? 'bg-red-600' :
                                  'bg-yellow-600'
                                }`} />
                                {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}
                              </span>
                              {enrollmentTypeBadges.map((badge, index) => (
                                <span key={index} className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
                                  {badge.text}
                                </span>
                              ))}
                            </div>
                            )}
                            
                            {/* Action Button */}
                            <div className="mt-auto">
                              {isLocked ? (
                                <button 
                                  className="w-full px-4 py-3 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>Contact Admin</span>
                                </button>
                              ) : isStudentOrStudent && course.is_user_enrolled ? (
                                <button 
                                  onClick={() => onNavigate('my-courses')}
                                  className="w-full px-4 py-3 text-white rounded-xl font-semibold text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                                  style={{ backgroundColor: getButtonBg() }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                                >
                                  <span>View Course</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ) : ((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) ? (
                                <button 
                                  onClick={() => onNavigate('my-courses')}
                                  className="w-full px-4 py-3 text-white rounded-xl font-semibold text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                                  style={{ backgroundColor: getButtonBg() }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                                >
                                  <span>View Course</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ) : (userRole === 'admin' || userRole === 'developer') ? (
                                <button 
                                  onClick={() => onNavigate('course-management')}
                                  className="w-full px-4 py-3 text-white rounded-xl font-semibold text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                                  style={{ backgroundColor: getButtonBg() }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getButtonHoverBg()}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getButtonBg()}
                                >
                                  <span>Manage Course</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                
                {/* Placeholder Cards - Only for Admin/Developer */}
                {(userRole === 'admin' || userRole === 'developer') && Array.from({ length: Math.max(0, 3 - Math.min(courses.length, 3)) }).map((_, index) => (
                  <button
                    key={`placeholder-${index}`}
                    onClick={() => onNavigate('course-management')}
                    className="relative bg-white rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex flex-col hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
                    style={{ width: '300px' }}
                  >
                    {/* Decorative Top Strip */}
                    <div className="relative overflow-hidden" style={{ height: '100px' }}>
                      <div className="w-full h-full bg-gray-100" />
                      <div className="absolute left-0 top-0 w-1 h-full bg-gray-300" />
                    </div>

                    <div className="p-6 flex flex-col flex-1 items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-1">Add New Course</h3>
                      <p className="text-xs text-gray-400 text-center">Create a new course to expand your curriculum</p>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                {/* Show 3 placeholder cards when no courses exist - Only for Admin/Developer */}
                {(userRole === 'admin' || userRole === 'developer') && Array.from({ length: 3 }).map((_, index) => (
                  <button
                    key={`placeholder-${index}`}
                    onClick={() => onNavigate('course-management')}
                    className="relative bg-white rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex flex-col hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
                    style={{ width: '300px' }}
                  >
                    {/* Decorative Top Strip */}
                    <div className="relative overflow-hidden" style={{ height: '100px' }}>
                      <div className="w-full h-full bg-gray-100" />
                      <div className="absolute left-0 top-0 w-1 h-full bg-gray-300" />
                    </div>

                    <div className="p-6 flex flex-col flex-1 items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-1">Add New Course</h3>
                      <p className="text-xs text-gray-400 text-center">Create a new course to expand your curriculum</p>
                    </div>
                  </button>
                ))}
              </>
            )}
              </div>
            </div>

            {/* System Overview - Only for Admin/Developer */}
            {(userRole === 'admin' || userRole === 'developer') && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Data</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Courses Card - Redesigned */}
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Courses</h3>
                        <p className="text-sm font-semibold" style={{ color: '#1f7a8c' }}>{stats.totalModules} total content</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('course-management')}
                      className="w-10 h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-600 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Total Courses */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalCourses}</div>
                        <div className="text-xs font-medium text-gray-600">Courses</div>
                      </div>
                    </div>

                    {/* Total Subjects */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalSubjects}</div>
                        <div className="text-xs font-medium text-gray-600">Subjects</div>
                      </div>
                    </div>

                    {/* Total Modules */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalModules}</div>
                        <div className="text-xs font-medium text-gray-600">Modules</div>
                      </div>
                    </div>

                    {/* Quizzes */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalQuizzes}</div>
                        <div className="text-xs font-medium text-gray-600">Quizzes</div>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalActivities}</div>
                        <div className="text-xs font-medium text-gray-600">Activities</div>
                      </div>
                    </div>

                    {/* Exams */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-2xl font-bold mb-1" style={{ color: '#1f7a8c' }}>{stats.totalExams}</div>
                        <div className="text-xs font-medium text-gray-600">Exams</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Users Card - Redesigned */}
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Users</h3>
                        <p className="text-sm font-semibold" style={{ color: '#1f7a8c' }}>{stats.totalUsers} total</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('user-management')}
                      className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Role breakdown list */}
                  <div className="space-y-3">                    {[
                      { label: 'SHS Students',     value: userStats.totalSHSStudents,     color: 'bg-green-500' },
                      { label: 'JHS Students',     value: userStats.totalJHSStudents,     color: 'bg-yellow-500' },
                      { label: 'College Students', value: userStats.totalCollegeStudents, color: 'bg-orange-500' },
                      { label: 'Scholars',         value: userStats.totalScholars,        color: 'bg-purple-500' },
                      { label: 'Instructors',      value: userStats.totalInstructors,     color: 'bg-blue-500' },
                      { label: 'Admin',            value: userStats.totalAdmins,          color: 'bg-red-500' },
                      { label: 'Developer',        value: userStats.totalDevelopers,      color: 'bg-indigo-500' },
                      { label: 'Guests',           value: userStats.totalGuests,          color: 'bg-gray-400' },
                    ].map(({ label, value, color }) => {
                      const total = userStats.totalSHSStudents + userStats.totalJHSStudents + userStats.totalCollegeStudents + userStats.totalScholars + userStats.totalInstructors + userStats.totalAdmins + userStats.totalDevelopers + userStats.totalGuests
                      const rawPct = total > 0 ? (value / total) * 100 : 0
                      const pct = value > 0 && rawPct < 1 ? 1 : Math.round(rawPct)
                      const displayPct = total > 0 && value > 0 ? (rawPct < 1 ? '<1' : Math.round(rawPct).toString()) : '0'
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700">{label}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400">{displayPct}%</span>
                              <span className="text-sm font-bold w-8 text-right" style={{ color: '#1f7a8c' }}>{value}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%`, backgroundColor: '#1f7a8c' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>


                </div>
              </div>
            </div>
            )}

            {/* My Learning - For students and scholars */}
            {(((userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student')) || userRole === 'scholar') && (
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-black">My Learning Progress</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Enrolled Courses */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enrolled</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1f7a8c20' }}>
                        <svg className="w-5 h-5" style={{ color: '#1f7a8c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{stats.totalCourses}</div>
                      <div className="text-sm text-gray-500 mt-1">Courses</div>
                    </div>
                  </div>
                </div>

                {/* Completed Lessons */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{stats.completedLessons}</div>
                      <div className="text-sm text-gray-500 mt-1">of {stats.totalLessons} lessons</div>
                    </div>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-50">
                        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{getProgressPercentage(stats.completedLessons, stats.totalLessons)}%</div>
                      <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-violet-500 transition-all duration-500"
                          style={{ width: `${getProgressPercentage(stats.completedLessons, stats.totalLessons)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* My Teaching Overview - For Instructors */}
            {userRole === 'instructor' && (
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-black">My Teaching Overview</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* My Courses */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Courses</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1f7a8c20' }}>
                        <svg className="w-5 h-5" style={{ color: '#1f7a8c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{stats.totalCourses}</div>
                      <div className="text-sm text-gray-500 mt-1">My Courses</div>
                    </div>
                  </div>
                </div>

                {/* Total Students */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Students</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{userStats.totalStudents}</div>
                      <div className="text-sm text-gray-500 mt-1">Total Students</div>
                    </div>
                  </div>
                </div>

                {/* Active Subjects */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 min-h-[120px] flex flex-col">
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Subjects</span>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-50">
                        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-4xl font-bold text-gray-900">{stats.totalSubjects}</div>
                      <div className="text-sm text-gray-500 mt-1">Active Subjects</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
