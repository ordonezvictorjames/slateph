'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { getRecentActivities } from '@/lib/activityLogger'
import { Loading } from '@/components/ui/loading'
import type { PageType } from '@/components/Dashboard'
import OnlineUsers from '@/components/OnlineUsers'

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
  thumbnail_url?: string
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
  onNavigate: (page: PageType, courseId?: string) => void
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

// Infrastructure usage cards -- developer only
function InfraUsageCards() {
  const [usage, setUsage] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [wsChannels, setWsChannels] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const supabaseWs = createClient()

  useEffect(() => {
    fetch('/api/developer/supabase-usage')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object' && !d.error) setUsage(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Count active WebSocket channels from this client + estimate total
  useEffect(() => {
    const countChannels = () => {
      const channels = (supabaseWs as any).getChannels?.() || []
      setWsChannels(channels.length)
    }
    countChannels()
    const interval = setInterval(countChannels, 5000)
    return () => clearInterval(interval)
  }, [])

  // Count online users from user_presence table
  useEffect(() => {
    const fetchOnline = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count } = await supabaseWs.from('user_presence').select('*', { count: 'exact', head: true }).gte('last_seen', fiveMinAgo)
      setOnlineUsers(count || 0)
    }
    fetchOnline()
    const interval = setInterval(fetchOnline, 15000)
    return () => clearInterval(interval)
  }, [])

  const GB = 1073741824  // 1024^3
  const MB = 1048576     // 1024^2

  const fmt = (b: any) => {
    const n = Number(b)
    if (!b && b !== 0) return '--'
    if (n >= GB) return (n / GB).toFixed(2) + ' GB'
    if (n >= MB) return (n / MB).toFixed(1) + ' MB'
    if (n >= 1024) return (n / 1024).toFixed(1) + ' KB'
    return n + ' B'
  }

  const pct = (used: any, limit: number) => {
    const n = Number(used)
    if (!used && used !== 0) return 0
    return Math.min(100, (n / limit) * 100)
  }

  const bar = (p: number) => p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-400' : 'bg-green-400'

  const eg = usage.egress || {}
  const st = usage.storage || {}
  const db = usage.db || {}

  const egressPct = pct(eg.bytes, eg.limitBytes || 5 * GB)
  const storagePct = pct(st.bytes, st.limitBytes || GB)
  const dbPct = pct(db.bytes, db.limitBytes || 500 * MB)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="h-8 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* Egress */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Egress</p>
            <p className="text-xs text-gray-400">Bandwidth out / month</p>
          </div>
        </div>
        <div className="flex items-end justify-between mb-1">
          <span className="text-sm font-bold text-gray-900">{fmt(eg.bytes)}</span>
          <span className="text-xs text-gray-400">/ 5 GB mo</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
          <div className={`${bar(egressPct)} h-1.5 rounded-full`} style={{ width: `${egressPct}%` }} />
        </div>
        <p className="text-xs text-gray-400">
          Not available via API --{' '}
          <a href="https://supabase.com/dashboard/project/wrzsvckzohhmdvyjjczb/reports/database" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">view in dashboard</a>
        </p>
      </div>

      {/* File Storage - flip card */}
      {(() => {
        const isFlipped = expanded === 'storage'
        return (
          <div className="cursor-pointer" style={{ perspective: '1000px', height: '160px' }} onClick={() => setExpanded(isFlipped ? null : 'storage')}>
            <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.5s ease', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">File Storage</p>
                    <p className="text-xs text-gray-400">Uploaded files &amp; media</p>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">{fmt(st.bytes)}</span>
                  <span className="text-xs text-gray-400">/ 1 GB</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                  <div className={`${bar(storagePct)} h-1.5 rounded-full`} style={{ width: `${storagePct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{storagePct.toFixed(1)}% used - tap to see buckets</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm absolute inset-0 overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className="text-xs font-semibold text-purple-800 mb-2">Buckets</p>
                {st.buckets && st.buckets.length > 0 ? (
                  <div className="space-y-1.5">
                    {st.buckets.map((b: any) => (
                      <div key={b.name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1">{b.name}</span>
                        <span className="text-gray-500 ml-2 shrink-0">{fmt(b.bytes)} ({b.files} files)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No bucket data</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Database - flip card */}
      {(() => {
        const isFlipped = expanded === 'db'
        return (
          <div className="cursor-pointer" style={{ perspective: '1000px', height: '160px' }} onClick={() => setExpanded(isFlipped ? null : 'db')}>
            <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.5s ease', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Database</p>
                    <p className="text-xs text-gray-400">Postgres storage</p>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">{fmt(db.bytes)}</span>
                  <span className="text-xs text-gray-400">/ 500 MB</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                  <div className={`${bar(dbPct)} h-1.5 rounded-full`} style={{ width: `${dbPct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{dbPct.toFixed(1)}% used - tap to see tables</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm absolute inset-0 overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <p className="text-xs font-semibold text-green-800 mb-2">Tables</p>
                {db.tables && db.tables.length > 0 ? (
                  <div className="space-y-1.5">
                    {db.tables.map((t: any) => (
                      <div key={t.name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate flex-1">{t.name}</span>
                        <span className="text-gray-500 ml-2 shrink-0">{fmt(t.bytes)} ({t.rows.toLocaleString()} rows)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No table data</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* WebSocket Connections */}
      {(() => {
        const CHANNELS_PER_USER = 7
        const FREE_LIMIT = 200
        const estimatedTotal = onlineUsers * CHANNELS_PER_USER
        const wsPct = Math.min(100, (estimatedTotal / FREE_LIMIT) * 100)
        const wsBar = wsPct >= 90 ? 'bg-red-500' : wsPct >= 70 ? 'bg-amber-400' : 'bg-green-400'
        const statusColor = wsPct >= 90 ? 'text-red-600' : wsPct >= 70 ? 'text-amber-600' : 'text-green-600'
        const statusLabel = wsPct >= 90 ? 'Critical' : wsPct >= 70 ? 'Warning' : 'Healthy'
        return (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-50">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">WebSocket Channels</p>
                <p className="text-xs text-gray-400">Supabase Realtime</p>
              </div>
            </div>
            <div className="flex items-end justify-between mb-1">
              <span className="text-sm font-bold text-gray-900">~{estimatedTotal}</span>
              <span className="text-xs text-gray-400">/ {FREE_LIMIT} limit</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div className={`${wsBar} h-1.5 rounded-full transition-all`} style={{ width: `${wsPct}%` }} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Online users</span>
                <span className="font-medium text-gray-700">{onlineUsers}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Channels/user</span>
                <span className="font-medium text-gray-700">{CHANNELS_PER_USER}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">This client</span>
                <span className="font-medium text-gray-700">{wsChannels} open</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold ${statusColor}`}>{statusLabel} ({wsPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Component for upcoming schedule list
function UpcomingScheduleList() {
  const [schedules, setSchedules] = useState<CourseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    fetchUpcomingSchedules()

    // Set up real-time subscription for course schedules
    const schedulesSubscription = supabase
      .channel('schedules-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'course_schedules' },
        () => {
          fetchUpcomingSchedules()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(schedulesSubscription)
    }
  }, [user])

  const fetchUpcomingSchedules = async () => {
    try {
      setLoading(true)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const role = user?.profile?.role
      const isAdminOrDev = role === 'admin' || role === 'developer'

      if (!isAdminOrDev && user?.id) {
        const { data: enrollments, error: enrollError } = await supabase
          .from('schedule_enrollments')
          .select('schedule_id')
          .eq('user_id', user.id)

        if (enrollError) {
          setSchedules([])
          setLoading(false)
          return
        }

        const scheduleIds: string[] = (enrollments || []).map((e: { schedule_id: string }) => e.schedule_id)

        if (scheduleIds.length === 0) {
          setSchedules([])
          setLoading(false)
          return
        }

        const { data: schedulesData, error: schedulesError } = await supabase
          .from('course_schedules')
          .select('*, course:courses(title, course_type)')
          .in('id', scheduleIds)
          .gte('start_date', tomorrowStr)
          .in('status', ['scheduled', 'active'])
          .order('start_date', { ascending: true })
          .limit(2)

        if (schedulesError) {
          console.error('Error fetching schedules:', schedulesError)
        } else {
          setSchedules(schedulesData || [])
        }
      } else {
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
      }

      // course_colors are passed as a prop -- no need to fetch here

    } catch (error) {
      console.error('Error fetching upcoming schedules:', error)
    } finally {
      setLoading(false)
    }
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
          <div key={i} className="animate-pulse p-3 bg-white rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
            <div className="w-2 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-white rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {schedules.map((schedule) => {
        const courseColor = null as CourseColor | null
        return (
          <div key={schedule.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-[#DCFCE7] transition-all">
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
                  <h4 className="text-sm font-bold text-black truncate">
                    {schedule.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {schedule.course?.title} ? Batch {schedule.batch_number}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
                    </span>
                    <span className="text-xs text-gray-400">?</span>
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
function RecentActivityList({ role }: { role: string }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const isAdminOrDev = role === 'admin' || role === 'developer'

  useEffect(() => {
    if (isAdminOrDev) {
      fetchRecentActivities()
    } else {
      setLoading(false)
    }
  }, [isAdminOrDev])

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id, user_id, activity_type, description, created_at,
          profiles!activity_logs_user_id_fkey (
            first_name, last_name, role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        console.error('Error fetching recent activities:', error.message, error.code, error.details)
      } else {
        const transformedData = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          activity_type: item.activity_type,
          description: item.description,
          created_at: item.created_at,
          user: item.profiles ? {
            first_name: item.profiles.first_name,
            last_name: item.profiles.last_name,
            role: item.profiles.role,
          } : null
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
              <span className="text-xs text-gray-400">?</span>
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
  const [allCourses, setAllCourses] = useState<Course[]>([])
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

  // Format role for display  preserves acronyms like JHS, SHS
  const formatRole = (role: string) => {
    const labels: Record<string, string> = {
      jhs_student: 'JHS Student',
      shs_student: 'SHS Student',
      college_student: 'College Student',
      scholar: 'TESDA Scholar',
      instructor: 'Instructor',
      admin: 'Admin',
      developer: 'Developer',
      guest: 'Guest',
    }
    return labels[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  
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
    const totalCells = 14 // 2 rows ? 7 days
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
    if (!user?.id) return
    
    fetchDashboardData()

    // Single consolidated channel for all dashboard data
    const dashboardSubscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_schedules' }, () => fetchDashboardData())
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(dashboardSubscription)
    }
  }, [user?.id])

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
            // trainee has no enrolled courses - set empty array but continue to fetch allCourses
            setCourses([])
            coursesQuery = coursesQuery.in('id', ['00000000-0000-0000-0000-000000000000']) // no-match sentinel
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

      // Fetch ALL courses (unfiltered) for the All Courses card
      {
        const { data: allCoursesData, error: allCoursesError } = await supabase
          .from('courses')
          .select('*, subjects(*, modules(*))')
          .order('created_at', { ascending: false })

        if (!allCoursesError && allCoursesData) {
          // Fetch enrollment counts for all courses in one query
          const { data: enrollmentCounts } = await supabase
            .from('course_enrollments')
            .select('course_id')
            .eq('status', 'active')

          const countMap: Record<string, number> = {}
          for (const e of (enrollmentCounts || [])) {
            countMap[e.course_id] = (countMap[e.course_id] || 0) + 1
          }

          // For students, mark enrollment status on each course
          const isStudent = userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student' || userRole === 'scholar'
          if (isStudent && user?.id) {
            const { data: enrollments } = await supabase
              .from('course_enrollments')
              .select('course_id')
              .eq('trainee_id', user.id)
              .eq('status', 'active')
            const enrolledIds = new Set((enrollments || []).map((e: { course_id: string }) => e.course_id))
            setAllCourses(allCoursesData.map((c: Course) => ({
              ...c,
              is_user_enrolled: enrolledIds.has(c.id),
              total_enrollments: countMap[c.id] || 0
            })))
          } else if (userRole === 'instructor' && user?.id) {
            // Mark courses where the instructor is assigned to at least one subject
            setAllCourses(allCoursesData.map((c: Course) => ({
              ...c,
              is_user_enrolled: (c.subjects || []).some((s: any) => s.instructor_id === user.id),
              total_enrollments: countMap[c.id] || 0
            })))
          } else {
            setAllCourses(allCoursesData.map((c: Course) => ({
              ...c,
              total_enrollments: countMap[c.id] || 0
            })))
          }
        }
      }

      // Fetch course colors (table may not exist yet -- fail silently)
      const { data: colorsData, error: colorsError } = await supabase
        .from('course_colors')
        .select('*')

      if (colorsError) {
        if (colorsError.code !== 'PGRST205') { // PGRST205 = table not in schema cache
          console.error('Error fetching course colors:', colorsError.message, colorsError.code)
        }
      } else {
        setCourseColors(colorsData || [])
      }

      // Fetch course schedules for calendar (filtered by enrollment for students/instructors)
      const isAdminOrDev = userRole === 'admin' || userRole === 'developer'

      if (isAdminOrDev) {
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
      } else {
        const { data: enrollments, error: enrollError } = await supabase
          .from('schedule_enrollments')
          .select('schedule_id')
          .eq('user_id', user?.id)

        if (enrollError) {
          setCourseSchedules([])
        } else {
          const ids = (enrollments || []).map((e: { schedule_id: string }) => e.schedule_id)
          if (ids.length === 0) {
            setCourseSchedules([])
          } else {
            const { data: schedulesData, error: schedulesError } = await supabase
              .from('course_schedules')
              .select('*, course:courses(title, course_type)')
              .in('id', ids)
              .in('status', ['scheduled', 'active'])
              .order('start_date', { ascending: true })

            if (schedulesError) {
              console.error('Error fetching course schedules:', schedulesError)
            } else {
              setCourseSchedules(schedulesData || [])
            }
          }
        }
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
        // Get students not enrolled in any course (JHS, SHS, College, Scholar, Trainee)
        const { data: alltrainees } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['shs_student', 'jhs_student', 'college_student', 'tesda_scholar'])

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
    <div className="min-h-screen" style={{ backgroundColor: '#f3f4f6', paddingTop: '24px', paddingBottom: '48px' }} >
      <div className="px-4 xl:pl-[50px] xl:pr-[25px]">


        {/* Profile Card (mobile) */}
        <div className="xl:hidden mb-4 flex items-center justify-end">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-[17px] h-[17px] text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-[17px] h-[17px] text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0"
            >
              {(user?.profile as any)?.avatar_url ? (
                (user?.profile as any).avatar_url.startsWith('data:') ? (
                  <img src={(user?.profile as any).avatar_url} alt="Profile" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                ) : (user?.profile as any).avatar_url.length <= 2 ? (
                  <span className="text-base">{(user?.profile as any).avatar_url}</span>
                ) : (
                  <img src={(user?.profile as any).avatar_url} alt="Profile" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                )
              ) : (
                <span className="text-xs font-bold text-gray-600">
                  {(user?.profile?.first_name?.[0] || '') + (user?.profile?.last_name?.[0] || '')}
                </span>
              )}
            </button>
          </div>

        <div className="grid grid-cols-1 xl:grid-cols-7 gap-4 md:gap-6">
          
          {/* Profile Card - Shows on desktop only (mobile version is above) */}
          <div className="order-last xl:col-span-2 xl:order-2 space-y-4 md:space-y-6 flex flex-col">
            {/* Avatar / Profile Card - Desktop only */}
            <div className="hidden xl:block relative" ref={dropdownRef}>
              <div className="flex items-center gap-3 justify-end">
                {/* Message icon */}
                <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
                  <svg className="w-[17px] h-[17px] text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                {/* Notification icon */}
                <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
                  <svg className="w-[17px] h-[17px] text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                {/* Avatar + name + chevron -- clickable */}
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {/* Avatar circle */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {(user?.profile as any)?.avatar_url ? (
                      (user?.profile as any).avatar_url.startsWith('data:') ? (
                        <img src={(user?.profile as any).avatar_url} alt="Profile" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                      ) : (user?.profile as any).avatar_url.length <= 2 ? (
                        <span className="text-xl">{(user?.profile as any).avatar_url}</span>
                      ) : (
                        <img src={(user?.profile as any).avatar_url} alt="Profile" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                      )
                    ) : (
                      <span className="text-gray-600 font-medium text-sm">
                        {user?.profile?.first_name && user?.profile?.last_name
                          ? `${user.profile.first_name.charAt(0).toUpperCase()}${user.profile.last_name.charAt(0).toUpperCase()}`
                          : displayUser?.email ? displayUser.email.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  {/* Hello + name */}
                  <div className="text-left">
                    <p className="text-[11px] text-gray-400 leading-tight">Hello,</p>
                    <p className="font-bold text-sm text-gray-900 leading-tight whitespace-nowrap">
                      {user?.profile?.first_name && user?.profile?.last_name
                        ? `${user.profile.first_name} ${user.profile.last_name}`
                        : 'User'}
                    </p>
                  </div>
                  {/* Chevron */}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute mt-2 w-56 bg-white rounded-xl py-2 z-50" style={{ top: '100%', right: 0 }}>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.profile?.first_name && user?.profile?.last_name
                        ? `${user.profile.first_name} ${user.profile.last_name}`
                        : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{user?.email || displayUser?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { onNavigate('profile'); setShowProfileDropdown(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => { onNavigate('settings'); setShowProfileDropdown(false) }}
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
                      onClick={() => { signOut(); setShowProfileDropdown(false) }}
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
            {/* Today's Events + Upcoming Schedule - equal height */}
            {/* Desktop: full cards */}
            <div className="hidden xl:block space-y-4">
            {/* Today's Events Card - Sidebar */}
            <div className="bg-white rounded-xl p-4" style={{ minHeight: '160px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e6f4f7' }}>
                    <svg className="w-4 h-4" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-900">Today's Events</span>
                </div>
                <button onClick={() => onNavigate('schedule')} className="text-xs font-medium hover:opacity-80" style={{ color: '#0f4c5c' }}>See All</button>
              </div>
              {getTodaysEvents().length === 0 ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                      <div className="w-2 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-2 bg-white rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {getTodaysEvents().slice(0, 2).map((schedule) => {
                    const color = getCourseColor(schedule.course_id)
                    return (
                      <div key={schedule.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color?.color_hex || '#0f4c5c' }} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{schedule.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{schedule.course?.title}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Schedule Card - Sidebar */}
            <div className="bg-white rounded-xl p-4" style={{ minHeight: '160px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e6f4f7' }}>
                    <svg className="w-4 h-4" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-900">Upcoming Schedule</span>
                </div>
                <button onClick={() => onNavigate('schedule')} className="text-xs font-medium hover:opacity-80" style={{ color: '#0f4c5c' }}>See All</button>
              </div>
              <UpcomingScheduleList />
            </div>
            </div>{/* end hidden xl:block */}

            {/* All Users Card - Desktop only, all roles */}
            <div className="hidden xl:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-y-auto scrollbar-autohide" style={{ maxHeight: '380px' }}>
                <OnlineUsers />
              </div>
            </div>

            {/* Recent Activity - Desktop only, all roles */}
            <div className="hidden xl:block bg-white rounded-lg p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Recent Activity</h3>
                <button 
                  onClick={() => onNavigate('system-tracker')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto scrollbar-autohide" style={{ maxHeight: '320px' }}>
                <RecentActivityList role={userRole} />
              </div>
            </div>
          </div>

          {/* Left Section - Main Content - Shows second on mobile, first on desktop */}
          <div className="order-first xl:col-span-5 xl:order-1 space-y-6 md:space-y-8">

            {/* Welcome Card */}
            <div className="relative rounded-2xl overflow-hidden flex items-center px-6 py-6 gap-5 bg-white shadow-sm" style={{ minHeight: '160px' }}>
              {/* Text content */}
              <div className="flex-1 min-w-0 z-10">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  Welcome, {user?.profile?.first_name || 'there'}
                </h2>
                <button
                  onClick={() => onNavigate('profile')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors hover:opacity-90"
                  style={{ background: '#0f4c5c' }}
                >
                  Complete Profile
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* book.png decorative image */}
              <img
                src="/book.png"
                alt=""
                aria-hidden="true"
                className="absolute right-4 bottom-0 h-36 object-contain pointer-events-none select-none"
              />
            </div>

            {/* Learning Progress Cards - hidden for admin/developer */}
            {!(userRole === 'admin' || userRole === 'developer') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{courses.filter(c => c.is_user_enrolled).length || stats.totalCourses}</p>
                  <p className="text-xs text-gray-500 font-medium">Enrolled Courses</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.completedLessons}</p>
                  <p className="text-xs text-gray-500 font-medium">Completed Lessons</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.completedAssignments}</p>
                  <p className="text-xs text-gray-500 font-medium">Completed Modules</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.totalActivities}</p>
                  <p className="text-xs text-gray-500 font-medium">Activities</p>
                </div>
              </div>
            </div>
            )}

            {/* All Courses -- split for students/instructors, full list for others */}
            {(() => {
              const isStudentOrInstructor = userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student' || userRole === 'scholar' || userRole === 'instructor'
              const myCourses = isStudentOrInstructor ? allCourses.filter(c => c.is_user_enrolled) : []
              const otherCourses = isStudentOrInstructor ? allCourses.filter(c => !c.is_user_enrolled) : allCourses
              const myLabel = userRole === 'instructor' ? 'My Assigned Courses' : 'My Enrolled Courses'

              const renderCarousel = (list: typeof allCourses, emptyMsg: string) => (
                <div className="xl:hidden -mx-4 px-4">
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-autohide">
                    {list.map((course) => {
                      const courseColor = getCourseColor(course.id)
                      const isStudent = userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student' || userRole === 'scholar'
                      const isLocked = isStudent && !course.is_user_enrolled
                      const handleClick = () => { if (isLocked) return; if (userRole === 'admin' || userRole === 'developer') onNavigate('course-management', course.id); else onNavigate('my-courses', course.id) }
                      const subjectCount = course.subjects?.length ?? 0
                      const moduleCount = course.subjects?.reduce((acc: number, s: Subject) => acc + (s.modules?.length ?? 0), 0) ?? 0
                      const activityCount = course.subjects?.reduce((acc: number, s: Subject) => acc + (s.modules?.filter((m: Module) => m.content_type === 'activity').length ?? 0), 0) ?? 0
                      return (
                        <div key={course.id} onClick={handleClick} style={{ minWidth: '220px', maxWidth: '220px' }}
                          className={`snap-start bg-white rounded-2xl overflow-hidden flex flex-col shadow-md flex-shrink-0 transition-all duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}`}>
                          <div className="relative h-28 flex-shrink-0 rounded-xl overflow-hidden m-2">
                            {course.thumbnail_url ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} /> : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: courseColor?.color_hex ? `linear-gradient(135deg, ${courseColor.color_hex} 0%, ${courseColor.color_hex}99 100%)` : 'linear-gradient(135deg, #0f4c5c 0%, #1f7a8c 100%)' }}>
                                <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              </div>
                            )}
                            {isLocked && <div className="absolute top-2 left-2 bg-gray-900/75 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg><span className="text-[10px] font-semibold">Locked</span></div>}
                            {isStudent && course.is_user_enrolled && <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-semibold">Enrolled</span></div>}
                            {userRole === 'instructor' && course.is_user_enrolled && <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-semibold">Assigned</span></div>}
                            <div className="absolute top-2 right-2"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/90 text-gray-700">{course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}</span></div>
                          </div>
                          <div className="px-3 pb-3 flex flex-col flex-1">
                            <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{course.title}</p>
                            <p className="text-[11px] text-gray-400 mb-2">{course.total_enrollments ?? 0} enrolled</p>
                            <div className="border-t border-gray-100 my-1.5" />
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col items-center gap-0.5"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fff3e0' }}><svg className="w-3.5 h-3.5" fill="none" stroke="#f97316" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><span className="text-[9px] text-gray-500">{subjectCount}</span></div>
                              <div className="flex flex-col items-center gap-0.5"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e0f2fe' }}><svg className="w-3.5 h-3.5" fill="none" stroke="#0ea5e9" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div><span className="text-[9px] text-gray-500">{moduleCount}</span></div>
                              <div className="flex flex-col items-center gap-0.5"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe' }}><svg className="w-3.5 h-3.5" fill="none" stroke="#8b5cf6" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><span className="text-[9px] text-gray-500">{activityCount}</span></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {list.length === 0 && <p className="text-sm text-gray-400 py-6">{emptyMsg}</p>}
                  </div>
                </div>
              )

              const renderGrid = (list: typeof allCourses, emptyMsg: string) => (
                <div className="hidden xl:grid xl:grid-cols-4 gap-4">
                  {list.map((course) => {
                    const courseColor = getCourseColor(course.id)
                    const isStudent = userRole === 'shs_student' || userRole === 'jhs_student' || userRole === 'college_student' || userRole === 'scholar'
                    const isLocked = isStudent && !course.is_user_enrolled
                    const handleClick = () => { if (isLocked) return; if (userRole === 'admin' || userRole === 'developer') onNavigate('course-management'); else onNavigate('my-courses') }
                    const subjectCount = course.subjects?.length ?? 0
                    const moduleCount = course.subjects?.reduce((acc: number, s: Subject) => acc + (s.modules?.length ?? 0), 0) ?? 0
                    const activityCount = course.subjects?.reduce((acc: number, s: Subject) => acc + (s.modules?.filter((m: Module) => m.content_type === 'activity').length ?? 0), 0) ?? 0
                    return (
                      <div key={course.id} onClick={handleClick}
                        className={`bg-white rounded-2xl overflow-hidden flex flex-col shadow-md transition-all duration-200 ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}`}>
                        <div className="relative h-36 flex-shrink-0 rounded-xl overflow-hidden m-2">
                          {course.thumbnail_url ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} /> : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: courseColor?.color_hex ? `linear-gradient(135deg, ${courseColor.color_hex} 0%, ${courseColor.color_hex}99 100%)` : 'linear-gradient(135deg, #0f4c5c 0%, #1f7a8c 100%)' }}>
                              <svg className="w-12 h-12 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                          )}
                          {isLocked && <div className="absolute top-2 left-2 bg-gray-900/75 text-white px-2 py-1 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg><span className="text-[10px] font-semibold">Locked</span></div>}
                          {isStudent && course.is_user_enrolled && <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-semibold">Enrolled</span></div>}
                          {userRole === 'instructor' && course.is_user_enrolled && <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-1 rounded-full flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-semibold">Assigned</span></div>}
                          <div className="absolute top-2 right-2"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/90 text-gray-700">{course.course_type === 'academic' ? 'Academic' : course.course_type === 'tesda' ? 'TESDA' : 'UpSkill'}</span></div>
                        </div>
                        <div className="px-3 pb-3 flex flex-col flex-1">
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{course.title}</p>
                          <p className="text-[11px] text-gray-400 mb-2">{course.total_enrollments ?? 0} enrolled student{(course.total_enrollments ?? 0) !== 1 ? 's' : ''}</p>
                          <div className="border-t border-gray-100 my-2" />
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col items-center gap-1"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fff3e0' }}><svg className="w-4 h-4" fill="none" stroke="#f97316" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><span className="text-[10px] text-gray-500 font-medium">{subjectCount} Subjects</span></div>
                            <div className="flex flex-col items-center gap-1"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e0f2fe' }}><svg className="w-4 h-4" fill="none" stroke="#0ea5e9" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div><span className="text-[10px] text-gray-500 font-medium">{moduleCount} Modules</span></div>
                            <div className="flex flex-col items-center gap-1"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe' }}><svg className="w-4 h-4" fill="none" stroke="#8b5cf6" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><span className="text-[10px] text-gray-500 font-medium">{activityCount} Activities</span></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {list.length === 0 && <div className="col-span-4 py-10 text-center text-gray-400 text-sm">{emptyMsg}</div>}
                </div>
              )

              return (
                <>
                  {isStudentOrInstructor && myCourses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3">{myLabel}</h3>
                      {renderCarousel(myCourses, '')}
                      {renderGrid(myCourses, '')}
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-4">
                    {isStudentOrInstructor && <h3 className="text-sm font-bold text-gray-900 mb-3">Available Courses</h3>}
                    {renderCarousel(otherCourses, 'No courses available.')}
                    {renderGrid(otherCourses, 'No courses available.')}
                  </div>
                </>
              )
            })()}

            {/* Mobile: schedule summary cards -- all roles */}
            {/* Admin/Developer: 2x2 grid with Recent Activity, Today's Events, Tasks, Upcoming */}
            {(userRole === 'admin' || userRole === 'developer') && (
              <div className="sm:hidden grid grid-cols-2 gap-3">
                    {/* Recent Activity */}
                    <button
                      className="bg-white rounded-xl p-3 text-left shadow-sm"
                      onClick={() => onNavigate('system-tracker')}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                          <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-bold text-gray-900">Recent Activity</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Tap to view logs</p>
                    </button>
                    {/* Today's Events */}
                    <button onClick={() => onNavigate('schedule')} className="bg-white rounded-xl p-3 text-left shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                          <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-bold text-gray-900">Today's Events</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{getTodaysEvents().length}</p>
                      <p className="text-[10px] text-gray-400">events</p>
                    </button>
                    {/* Tasks */}
                    <div
                      className="bg-white rounded-xl p-3 flex flex-col justify-between cursor-pointer shadow-sm"
                      onClick={() => onNavigate('tasks')}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-gray-900 mb-1">Pending Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pendingTasks.pendingFeatureRequests + pendingTasks.ongoingFeatureRequests + pendingTasks.unenrolledtrainees + pendingTasks.bugReports + pendingTasks.passwordResets + pendingTasks.unassignedtrainees + pendingTasks.guestUsers}
                        </p>
                        <p className="text-[10px] text-gray-400">total items</p>
                      </div>
                    </div>
                    {/* Upcoming Schedule */}
                    <button onClick={() => onNavigate('schedule')} className="bg-white rounded-xl p-3 text-left shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                          <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-bold text-gray-900">Upcoming</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{courseSchedules.length}</p>
                      <p className="text-[10px] text-gray-400">scheduled</p>
                    </button>
              </div>
            )}

            {/* Mobile: Today's Events + Upcoming -- for non-admin/developer roles */}
            {!(userRole === 'admin' || userRole === 'developer') && (
              <div className="sm:hidden grid grid-cols-2 gap-3">
                <button onClick={() => onNavigate('schedule')} className="bg-white rounded-xl p-3 text-left shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                      <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">Today's Events</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{getTodaysEvents().length}</p>
                  <p className="text-[10px] text-gray-400">events</p>
                </button>
                <button onClick={() => onNavigate('schedule')} className="bg-white rounded-xl p-3 text-left shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                      <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">Upcoming</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{courseSchedules.length}</p>
                  <p className="text-[10px] text-gray-400">scheduled</p>
                </button>
              </div>
            )}

            {/* System Overview - Only for Admin/Developer */}
            {(userRole === 'admin' || userRole === 'developer') && (
            <>
              {/* Infrastructure Usage -- Developer only */}
              {userRole === 'developer' && (
                <InfraUsageCards />
              )}
              {/* Mobile: compact totals */}
              <div className="sm:hidden grid grid-cols-2 gap-3">
                <button
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
                  onClick={() => onNavigate('course-management')}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Courses</p>
                  </div>
                </button>
                <button
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
                  onClick={() => onNavigate('user-management')}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0f4c5c' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Users</p>
                  </div>
                </button>
                {/* All Users compact card */}
                <button
                  className="bg-white rounded-xl shadow-sm p-3 text-left"
                  onClick={() => onNavigate('user-management')}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                      <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">All Users</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      {userStats.totalStudents} students
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      {userStats.totalInstructors} instructors
                    </span>
                  </div>
                </button>
                {/* Recent Activity compact card */}
                <button
                  className="bg-white rounded-xl shadow-sm p-3 text-left"
                  onClick={() => onNavigate('system-tracker')}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#e6f4f7' }}>
                      <svg className="w-3 h-3" fill="none" stroke="#0f4c5c" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">Recent Activity</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Tap to view activity logs</p>
                </button>
              </div>
              {/* Desktop: full cards - 3 column grid */}
              <div className="hidden sm:grid grid-cols-3 gap-4">
                {/* Tasks Card - col 1 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Tasks</p>
                        <p className="text-xs text-gray-400">Pending items</p>
                      </div>
                    </div>
                    <button onClick={() => onNavigate('tasks')} className="text-gray-400 hover:text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {[
                      ...(userRole === 'developer' && pendingTasks.pendingFeatureRequests > 0 ? [{ label: `${pendingTasks.pendingFeatureRequests} Pending Request${pendingTasks.pendingFeatureRequests > 1 ? 's' : ''}`, sub: 'Feature requests', count: pendingTasks.pendingFeatureRequests, color: 'text-purple-600 bg-purple-100', border: 'border-purple-200' }] : []),
                      ...(userRole === 'developer' && pendingTasks.ongoingFeatureRequests > 0 ? [{ label: `${pendingTasks.ongoingFeatureRequests} Ongoing Task${pendingTasks.ongoingFeatureRequests > 1 ? 's' : ''}`, sub: 'In progress', count: pendingTasks.ongoingFeatureRequests, color: 'text-green-600 bg-green-100', border: 'border-green-200' }] : []),
                      ...(pendingTasks.unenrolledtrainees > 0 ? [{ label: `${pendingTasks.unenrolledtrainees} Unenrolled`, sub: 'Students', count: pendingTasks.unenrolledtrainees, color: 'text-orange-600 bg-orange-100', border: 'border-orange-200' }] : [{ label: 'Unenrolled Students', sub: 'All enrolled', count: 0, color: 'text-gray-400 bg-white', border: 'border-dashed border-gray-200' }]),
                      ...(pendingTasks.bugReports > 0 ? [{ label: `${pendingTasks.bugReports} Bug Report${pendingTasks.bugReports > 1 ? 's' : ''}`, sub: 'To fix', count: pendingTasks.bugReports, color: 'text-yellow-600 bg-yellow-100', border: 'border-yellow-200' }] : []),
                      ...(pendingTasks.passwordResets > 0 ? [{ label: `${pendingTasks.passwordResets} Password Reset${pendingTasks.passwordResets > 1 ? 's' : ''}`, sub: 'Pending', count: pendingTasks.passwordResets, color: 'text-red-600 bg-red-100', border: 'border-red-200' }] : [{ label: 'Password Resets', sub: 'None pending', count: 0, color: 'text-gray-400 bg-white', border: 'border-dashed border-gray-200' }]),
                      ...(pendingTasks.unassignedtrainees > 0 ? [{ label: `${pendingTasks.unassignedtrainees} Unassigned`, sub: 'Instructors', count: pendingTasks.unassignedtrainees, color: 'text-blue-600 bg-blue-100', border: 'border-blue-200' }] : [{ label: 'Unassigned Instructors', sub: 'All assigned', count: 0, color: 'text-gray-400 bg-white', border: 'border-dashed border-gray-200' }]),
                      ...(pendingTasks.guestUsers > 0 ? [{ label: `${pendingTasks.guestUsers} Guest User${pendingTasks.guestUsers > 1 ? 's' : ''}`, sub: 'Need role', count: pendingTasks.guestUsers, color: 'text-indigo-600 bg-indigo-100', border: 'border-indigo-200' }] : [{ label: 'Guest Users', sub: 'None awaiting', count: 0, color: 'text-gray-400 bg-white', border: 'border-dashed border-gray-200' }]),
                    ].map((t, i) => (
                      <div key={i} onClick={() => t.count > 0 && onNavigate('tasks')}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${t.border} ${t.count > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">{t.label}</div>
                          <div className="text-[10px] text-gray-500">{t.sub}</div>
                        </div>
                        <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full flex-shrink-0 ${t.color}`}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courses Card - col 2 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Courses</p>
                        <p className="text-xs text-gray-400">{stats.totalModules} total content</p>
                      </div>
                    </div>
                    <button onClick={() => onNavigate('course-management')} className="text-gray-400 hover:text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Total Courses */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalCourses}</div>
                        <div className="text-xs font-medium text-gray-600">Courses</div>
                      </div>
                    </div>

                    {/* Total Subjects */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalSubjects}</div>
                        <div className="text-xs font-medium text-gray-600">Subjects</div>
                      </div>
                    </div>

                    {/* Total Modules */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalModules}</div>
                        <div className="text-xs font-medium text-gray-600">Modules</div>
                      </div>
                    </div>

                    {/* Quizzes */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalQuizzes}</div>
                        <div className="text-xs font-medium text-gray-600">Quizzes</div>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalActivities}</div>
                        <div className="text-xs font-medium text-gray-600">Activities</div>
                      </div>
                    </div>

                    {/* Exams */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-7 h-7 bg-gray-200 rounded-md flex items-center justify-center mb-1">
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold mb-0" style={{ color: '#1f7a8c' }}>{stats.totalExams}</div>
                        <div className="text-xs font-medium text-gray-600">Exams</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Users Card - Redesigned */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">Users</h3>
                        <p className="text-sm font-semibold" style={{ color: '#1f7a8c' }}>{stats.totalUsers} total</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('user-management')}
                      className="text-gray-400 hover:text-gray-700"
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
                              <span className="text-xs text-gray-700">{label}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400">{displayPct}%</span>
                              <span className="text-xs font-bold w-6 text-right" style={{ color: '#1f7a8c' }}>{value}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%`, backgroundColor: '#1f7a8c' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>


                </div>
              </div>
            </>
            )}
            {userRole === 'instructor' && (
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-sm font-bold text-black">My Teaching Overview</h2>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {/* My Courses */}
                <div className="bg-white rounded-xl transition-all duration-300 flex flex-col shadow-sm">
                  <div className="p-2.5 md:p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wide">Courses</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1f7a8c20' }}>
                        <svg className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color: '#1f7a8c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl md:text-4xl font-bold text-gray-900">{stats.totalCourses}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:mt-1">My Courses</div>
                    </div>
                  </div>
                </div>

                {/* Total Students */}
                <div className="bg-white rounded-xl transition-all duration-300 flex flex-col shadow-sm">
                  <div className="p-2.5 md:p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wide">Students</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50">
                        <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl md:text-4xl font-bold text-gray-900">{userStats.totalStudents}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:mt-1">Total Students</div>
                    </div>
                  </div>
                </div>

                {/* Active Subjects */}
                <div className="bg-white rounded-xl transition-all duration-300 flex flex-col shadow-sm">
                  <div className="p-2.5 md:p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wide">Subjects</span>
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-50">
                        <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-2xl md:text-4xl font-bold text-gray-900">{stats.totalSubjects}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:mt-1">Active Subjects</div>
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


